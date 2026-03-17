import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import { generateResumeCopilot } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-service";
import type { ResumeCopilotPublicOutput } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-types";
import { getCapabilityMatchV2 } from "@/lib/career-engine/matching/capability-match-v2";
import { loadCareerGraph } from "@/lib/career-engine/memory/career-graph-loader";
import {
    canonicalJobId,
    getVerdictFromScore,
} from "@/lib/career-engine/job-copilot/extension-contract";
import type {
    JobCopilotAnalyzeInput,
    JobCopilotAnalyzeOutput,
    JobCopilotCalibrationAnswerInput,
    JobCopilotDownloadInput,
    JobCopilotDownloadOutput,
    JobCopilotRecalibrateInput,
} from "./job-copilot-types";
import { buildJobSignalsFromRawJd } from "./job-signals-from-raw-jd";
import {
    buildJobCopilotAnalyzeOutput,
    buildKeyGaps,
    buildResumeTextFile,
    buildWhyYouMatch,
    extractTopEvidenceFromResumeDebug,
    toSafeFilename,
} from "./job-copilot-output-builder";
import {
    buildJobCopilotAnalysis,
    getTailoringDecisionFromMatchScore,
} from "@/lib/career-engine/job-copilot/job-copilot-ui-adapter";
import type { JobCalibrationAnswer } from "@/lib/career-engine/job-copilot/job-analysis";
import { normalizeTitle } from "@/lib/career-engine/parsing/title-normalizer";
import {
    buildCareerInsightSelectionAudit,
    generateCareerInsightSections,
} from "@/lib/career-engine/job-copilot/career-insight-generator";
import { detectRoleIdentity } from "@/lib/career-engine/job-copilot/role-identity-detector";
import {
    applyCalibrationAnswers,
    buildApplyRecommendation,
    buildCalibrationQuestions,
    type ExplanationConsistencyContext,
} from "@/lib/career-engine/job-copilot/fit-calibration-engine";
import { buildDomainOntologySpecializationAudit } from "@/lib/career-engine/job-copilot/domain-ontology-audit";
import { buildJobFitScoreV1 } from "@/lib/career-engine/job-copilot/job-fit-score-v1";
import { writeAppliedPipelineAction } from "./pipeline-write-integration";
import { markInteractionApplied, persistExtensionViewedJob } from "./extension-job-persistence";

async function ensureExtensionJob(params: {
    profileId: string;
    source: "linkedin" | "seek";
    jobTitle: string;
    company: string | null;
    location: string | null;
    jobUrl: string | null;
    jobDescription: string;
    matchScore: number;
    matchedCapabilities: string[];
    keyGaps: string[];
}) {
    const supabase = createServerSupabaseClient();
    const canonicalId = canonicalJobId(params.jobUrl, params.jobTitle, params.company);
    const externalSource = `extension_${params.source}`;
    const jobSignals = buildJobSignalsFromRawJd({
        rawJd: params.jobDescription,
        fallbackTitle: params.jobTitle,
    });

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("id", params.profileId)
        .single();

    if (profileError || !profile?.id) {
        throw new Error("Profile not found");
    }

    const { data: careers } = await supabase
        .from("careers")
        .select("id")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(1);
    const careerId = careers?.[0]?.id ?? null;

    const { data: jobRows, error: jobUpsertError } = await supabase
        .from("jobs")
        .upsert(
            {
                external_source: externalSource,
                external_id: canonicalId,
                title: params.jobTitle,
                company: params.company,
                location: params.location,
                description: params.jobDescription,
                job_url: params.jobUrl,
            },
            { onConflict: "external_source,external_id" },
        )
        .select("id")
        .limit(1);

    if (jobUpsertError || !jobRows?.[0]?.id) {
        throw new Error(`Failed to persist extension job: ${jobUpsertError?.message ?? "missing_job_id"}`);
    }
    const jobId = jobRows[0].id as string;

    const { error: signalUpsertError } = await supabase
        .from("job_signals")
        .upsert(
            {
                job_id: jobId,
                target_title: jobSignals.target_title,
                role_family: jobSignals.role_family,
                seniority: jobSignals.seniority,
                required_skills: jobSignals.required_skills,
                preferred_skills: jobSignals.preferred_skills,
                responsibilities: jobSignals.responsibilities,
                domains: jobSignals.domains,
                keywords: jobSignals.keywords,
            },
            { onConflict: "job_id" },
        );

    if (signalUpsertError) {
        throw new Error(`Failed to persist job signals: ${signalUpsertError.message}`);
    }

    if (careerId) {
        const { data: existingJobMatchRows } = await supabase
            .from("job_matches")
            .select("status")
            .eq("career_id", careerId)
            .eq("job_id", jobId)
            .limit(1);
        const existingStatus = existingJobMatchRows?.[0]?.status ?? null;
        const preservedStatus = existingStatus === "skipped" || existingStatus === "applied"
            ? existingStatus
            : "new";

        const { error: jobMatchError } = await supabase
            .from("job_matches")
            .upsert(
                {
                    career_id: careerId,
                    job_id: jobId,
                    match_score: params.matchScore,
                    gap_summary: {
                        key_gaps: params.keyGaps,
                    },
                    matched_capabilities: params.matchedCapabilities,
                    status: preservedStatus,
                },
                { onConflict: "career_id,job_id" },
            );

        if (jobMatchError) {
            throw new Error(`Failed to persist job match: ${jobMatchError.message}`);
        }
    }

    return {
        jobId,
        canonicalId,
        careerId,
    };
}

function toCalibrationAnswers(answers: JobCopilotCalibrationAnswerInput[] | undefined): JobCalibrationAnswer[] {
    if (!answers || answers.length === 0) return [];
    const byQuestionId = new Map<string, "yes" | "no">();
    for (const item of answers) {
        const questionId = item?.questionId?.trim();
        if (!questionId) continue;
        if (item.answer !== "yes" && item.answer !== "no") continue;
        byQuestionId.set(questionId, item.answer);
    }
    return Array.from(byQuestionId.entries()).map(([question_id, answer]) => ({ question_id, answer }));
}

async function analyzeJobForCopilotInternal(params: {
    input: JobCopilotAnalyzeInput;
    calibrationAnswers: JobCalibrationAnswer[];
}): Promise<JobCopilotAnalyzeOutput> {
    const input = params.input;
    if (!input.profileId?.trim()) throw new Error("profileId is required");
    if (!input.jobTitle?.trim()) throw new Error("jobTitle is required");
    if (!input.jobDescription?.trim() || input.jobDescription.trim().length < 120) {
        throw new Error("jobDescription is too short");
    }

    const cleanedTitle = input.jobTitle.trim();
    const normalizedInputTitle = normalizeTitle(cleanedTitle);
    const normalizedDisplayTitle = normalizedInputTitle.normalized || cleanedTitle;
    const stableRoleFamily = normalizedInputTitle.function ?? null;
    const careerGraph = await loadCareerGraph(input.profileId.trim());
    const parsedSignals = buildJobSignalsFromRawJd({
        rawJd: input.jobDescription,
        fallbackTitle: cleanedTitle,
    });
    if (!careerGraph.career?.id) {
        throw new Error("No career memory found");
    }

    const capabilityMatch = await getCapabilityMatchV2({
        careerId: careerGraph.career.id,
        profileId: input.profileId.trim(),
        jobDescription: input.jobDescription,
        jobTitleHint: cleanedTitle,
        topSignalsLimit: 4,
    });

    const degradedExtraction = capabilityMatch.job_profile_quality === "sparse" || capabilityMatch.job_profile_quality === "empty";
    const reliableStrengths = capabilityMatch.matched_strengths
        .filter((item) => item.source_tier !== "title_prior")
        .map((item) => item.display_name);
    const reliableGaps = capabilityMatch.gaps
        .filter((item) => item.source_tier !== "title_prior")
        .filter((item) => item.importance === "critical" || item.importance === "important")
        .map((item) => item.display_name);

    const whyYouMatch = buildWhyYouMatch({
        matchStrengthCapabilities: degradedExtraction
            ? reliableStrengths.slice(0, 2)
            : capabilityMatch.matched_strengths.map((item) => item.display_name),
        profileTopCapabilities: capabilityMatch.candidate_capability_profile
            .slice(0, 3)
            .map((item) => item.display_name),
    });
    const keyGaps = buildKeyGaps({
        matchGapCapabilities: degradedExtraction
            ? reliableGaps.slice(0, 2)
            : capabilityMatch.gaps
                .filter((item) => item.importance === "critical" || item.importance === "important")
                .map((item) => item.display_name),
        profileKeyGaps: [],
    });
    const baseMatchScore = Number((capabilityMatch.overall_match_score * 100).toFixed(2));
    const roleIdentity = detectRoleIdentity({
        jobTitle: normalizedDisplayTitle,
        parsedSignals,
        matchResult: capabilityMatch,
    });
    const roleIdentityWithDomain = roleIdentity;
    const ontologySpecializationAudit = buildDomainOntologySpecializationAudit({
        jobTitle: normalizedDisplayTitle,
        parsedSignals,
        matchResult: capabilityMatch,
        detectorWinningFamily: roleIdentityWithDomain.domainAnchor.domainFamily,
    });
    const topSpecialization = ontologySpecializationAudit.top_specializations[0] ?? null;
    const topSpecializationVote = topSpecialization
        ? ontologySpecializationAudit.specialization_votes
            .find((item) => item.specialization === topSpecialization.specialization)
        : null;
    const specializationContext = {
        topSpecialization: topSpecialization?.specialization ?? null,
        matchedCanonicalSignals: Array.from(
            new Set((topSpecializationVote?.matched_canonical_signals ?? []).map((item) => item.signal)),
        ).slice(0, 3),
    };
    const jobFitScore = buildJobFitScoreV1({
        capabilityMatch,
        ontologyAudit: ontologySpecializationAudit,
    });
    const initialCalibrationQuestions = buildCalibrationQuestions({
        matchResult: capabilityMatch,
        existingAnswers: params.calibrationAnswers,
        roleIdentity: roleIdentityWithDomain,
        specializationContext,
        maxQuestions: 3,
    });
    const initialCalibrationResult = applyCalibrationAnswers({
        baseScore: baseMatchScore,
        questions: initialCalibrationQuestions.questions,
        answers: params.calibrationAnswers,
    });
    const consistencyAudit = buildCareerInsightSelectionAudit({
        matchResult: capabilityMatch,
        calibration: initialCalibrationResult.calibration,
        roleIdentity: roleIdentityWithDomain,
        maxStrengths: 3,
        maxRisks: 3,
    });
    const consistencyContext: ExplanationConsistencyContext = {
        excludedConsistencyKeys: Array.from(
            new Set([
                ...consistencyAudit.selectedWhyFitConsistencyKeys,
            ]),
        ),
        preferredUncertaintyKey: consistencyAudit.primaryUncertaintyThemeKey,
    };
    const calibrationQuestions = buildCalibrationQuestions({
        matchResult: capabilityMatch,
        existingAnswers: params.calibrationAnswers,
        roleIdentity: roleIdentityWithDomain,
        specializationContext,
        maxQuestions: 3,
        consistencyContext,
    });
    const calibrationResult = applyCalibrationAnswers({
        baseScore: baseMatchScore,
        questions: calibrationQuestions.questions,
        answers: params.calibrationAnswers,
    });
    const applyRecommendation = buildApplyRecommendation(calibrationResult.applyRecommendation.score);
    const matchScore = applyRecommendation.score;
    const careerInsight = generateCareerInsightSections({
        recommendation: applyRecommendation,
        topStrengths: whyYouMatch,
        topRisks: keyGaps,
        calibration: calibrationResult.calibration,
        jobTitle: normalizedDisplayTitle,
        matchResult: capabilityMatch,
        roleIdentity: roleIdentityWithDomain,
        specializationContext,
    });
    const weakJdMode = !parsedSignals.target_title
        && !parsedSignals.role_family
        && parsedSignals.required_skills.length === 0
        && parsedSignals.responsibilities.length === 0
        && capabilityMatch.job_capability_profile.length === 0;

    const persisted = await ensureExtensionJob({
        profileId: input.profileId,
        source: input.source,
        jobTitle: cleanedTitle,
        company: input.company,
        location: input.location,
        jobUrl: input.jobUrl,
        jobDescription: input.jobDescription,
        matchScore,
        matchedCapabilities: whyYouMatch,
        keyGaps,
    });

    let resumePreview: ResumeCopilotPublicOutput | null = null;
    let topEvidence: JobCopilotAnalyzeOutput["response"]["topEvidence"] = [];
    let evidenceRelevanceScore: number | null = null;
    let fallbackUsed = false;
    let totalEvidenceConsidered = 0;
    let selectedEvidenceIds: string[] = [];
    const tailoringDecision = getTailoringDecisionFromMatchScore(
        matchScore,
        capabilityMatch.audit.tailor_recommendation_reasoning,
    );

    if (tailoringDecision.allowed) {
        const resumeResult = await generateResumeCopilot({
            profileId: input.profileId,
            jobId: persisted.jobId,
            options: {
                includeDebug: true,
                calibrationContext: {
                    confirmed_strength_areas: calibrationResult.calibration.confirmed_strength_areas,
                    positioning_hints: careerInsight.positioningHints,
                },
            },
        });

        resumePreview = resumeResult.resume;
        topEvidence = extractTopEvidenceFromResumeDebug(
            resumeResult.debug,
            input.topEvidenceLimit,
        );
        selectedEvidenceIds = Array.from(
            new Set(
                (resumeResult.debug?.experiences ?? [])
                    .flatMap((experience) => experience.bullets.map((bullet) => bullet.evidence_piece_id)),
            ),
        );
        fallbackUsed = Boolean(resumeResult.debug?.metadata.evidence_pool_fallback_used);
        totalEvidenceConsidered = Number(resumeResult.debug?.metadata.total_evidence_ranked ?? 0);

        if (topEvidence.length > 0) {
            const avgTopEvidenceScore = topEvidence.reduce((sum, item) => sum + (item.score ?? 0), 0) / topEvidence.length;
            evidenceRelevanceScore = Math.max(0, Math.min(100, Math.round((avgTopEvidenceScore / 40) * 100)));
        }
    }

    const scoreConfidence: "high" | "medium" | "low" = capabilityMatch.score_confidence;
    const verdict = getVerdictFromScore(matchScore);
    const persistedViewed = await persistExtensionViewedJob({
        supabase: createServerSupabaseClient(),
        profileId: input.profileId,
        sourcePlatform: input.source,
        jobUrl: input.jobUrl,
        jobTitle: cleanedTitle,
        company: input.company,
        location: input.location,
        jobDescriptionRaw: input.jobDescription,
        jobSignalsJson: parsedSignals,
        matchScore,
        verdict,
        selectedEvidenceIds,
        resumeGenerated: Boolean(resumePreview),
    });
    const weakJobSignals = weakJdMode || degradedExtraction || persistedViewed.extractionQuality === "weak";
    const jobAnalysis = buildJobCopilotAnalysis({
        matchScore,
        scoreConfidence: scoreConfidence,
        jobProfileQuality: capabilityMatch.job_profile_quality,
        weakJobSignals,
        matchedCapabilities: whyYouMatch,
        keyGaps,
        evidenceHighlights: topEvidence,
        jdTitle: normalizedDisplayTitle,
        jdRoleFamily: stableRoleFamily ?? parsedSignals.role_family,
        candidateTitles: careerGraph.experiences.map((experience) => experience.title),
        atsRiskReasoning: capabilityMatch.audit.ats_risk_reasoning,
        bucketReasoning: capabilityMatch.audit.final_bucket_reasoning,
        tailoringReasoning: capabilityMatch.audit.tailor_recommendation_reasoning,
        evidenceAlignmentScore: capabilityMatch.score_breakdown.evidence_alignment_score,
        titlePriorPenalty: capabilityMatch.score_breakdown.title_prior_penalty,
        titlePriorReasoning: capabilityMatch.audit.title_prior_effect.reason,
        requiredSkills: parsedSignals.required_skills,
        responsibilities: parsedSignals.responsibilities,
    });
    jobAnalysis.apply_recommendation = applyRecommendation;
    jobAnalysis.career_insight = careerInsight.careerInsight;
    jobAnalysis.why_fit = careerInsight.whyFit;
    jobAnalysis.potential_risks = careerInsight.potentialRisks;
    jobAnalysis.positioning_hints = careerInsight.positioningHints;
    jobAnalysis.calibration = calibrationResult.calibration;

    return buildJobCopilotAnalyzeOutput({
        job: {
            jobId: persisted.jobId,
            canonicalJobId: persisted.canonicalId,
            jobSnapshotId: persistedViewed.jobSnapshotId,
            interactionId: persistedViewed.interactionId,
            sourcePlatform: input.source,
            jobUrl: input.jobUrl,
            jobTitle: cleanedTitle,
            company: input.company,
            location: input.location,
            jobDescriptionSnapshot: input.jobDescription,
            selectedEvidenceIds,
        },
        matchScore,
        applyRecommendation,
        careerInsight: careerInsight.careerInsight,
        whyFit: careerInsight.whyFit,
        risks: careerInsight.potentialRisks,
        positioningHints: careerInsight.positioningHints,
        calibrationQuestions: calibrationResult.calibration.questions.map((question) => ({
            id: question.id,
            question: question.question,
            targetArea: question.target_area,
            importance: question.importance,
            answer: question.answer ?? null,
        })),
        calibrationState: {
            required: calibrationResult.calibration.required,
            answeredCount: calibrationResult.calibration.answered_count,
            totalQuestions: calibrationResult.calibration.total_questions,
            recalibrated: calibrationResult.calibration.recalibrated,
            scoreDelta: calibrationResult.calibration.score_delta,
        },
        scoreExplainability: {
            model: capabilityMatch.model,
            capabilityFitScore: Number((capabilityMatch.overall_match_score * 100).toFixed(2)),
            matchedCapabilityCount: capabilityMatch.matched_strengths.length,
            missingCapabilityCount: capabilityMatch.gaps.filter((item) => item.match_status === "missing").length,
            supportingEvidenceCount: new Set(
                capabilityMatch.matched_strengths
                    .flatMap((item) => item.top_supporting_signals)
                    .map((signal) => signal.evidence_piece_id),
            ).size,
            weightedCoverageScore: capabilityMatch.score_breakdown.weighted_requirement_score,
            criticalGapPenalty: capabilityMatch.score_breakdown.blocking_gap_penalty,
            matchedCriticalCount: capabilityMatch.score_breakdown.matched_critical_count,
            missingCriticalCount: capabilityMatch.score_breakdown.missing_critical_count,
            totalJobCapabilityCount: capabilityMatch.score_breakdown.total_job_capability_count,
            evidenceRelevanceScore: evidenceRelevanceScore,
            weakJdMode: weakJdMode,
            scoreConfidence: scoreConfidence,
            jobProfileQuality: capabilityMatch.job_profile_quality,
            jobProfileQualityReasons: capabilityMatch.job_profile_diagnostics.reasons,
            titlePriorUsed: capabilityMatch.job_profile_diagnostics.used_title_prior,
            transferMatchScore: capabilityMatch.score_breakdown.transfer_match_score,
            evidenceAlignmentScore: capabilityMatch.score_breakdown.evidence_alignment_score,
            titlePriorPenalty: capabilityMatch.score_breakdown.title_prior_penalty,
            domainPriorPenalty: capabilityMatch.score_breakdown.domain_prior_penalty,
            bucketReasoning: capabilityMatch.audit.final_bucket_reasoning,
        },
        diagnostics: {
            weakJobSignals,
            fallbackUsed,
            totalEvidenceConsidered,
        },
        jobFitScore: jobFitScore.score,
        jobFitScoreDebug: jobFitScore.debug,
        jobAnalysis,
        whyYouMatch,
        keyGaps,
        topEvidence,
        resumePreview: resumePreview,
    });
}

export async function analyzeJobForCopilot(input: JobCopilotAnalyzeInput): Promise<JobCopilotAnalyzeOutput> {
    return analyzeJobForCopilotInternal({
        input,
        calibrationAnswers: [],
    });
}

export async function recalculateFitAfterCalibration(input: JobCopilotRecalibrateInput): Promise<JobCopilotAnalyzeOutput> {
    return analyzeJobForCopilotInternal({
        input: input,
        calibrationAnswers: toCalibrationAnswers(input.calibrationAnswers),
    });
}

export async function downloadTailoredResumeAndMarkApplied(input: JobCopilotDownloadInput): Promise<JobCopilotDownloadOutput> {
    const profileId = input.profileId?.trim();
    const jobId = input.jobId?.trim();
    if (!profileId) throw new Error("profileId is required");
    if (!jobId) throw new Error("jobId is required");

    const supabase = createServerSupabaseClient();
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("id", profileId)
        .single();
    if (!profile?.id) throw new Error("Profile not found");

    const { data: careers } = await supabase
        .from("careers")
        .select("id")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(1);
    const careerId = careers?.[0]?.id ?? null;
    if (!careerId) throw new Error("No career memory found");

    const { data: jobMatchRows } = await supabase
        .from("job_matches")
        .select("match_score")
        .eq("career_id", careerId)
        .eq("job_id", jobId)
        .limit(1);
    const persistedMatchScore = jobMatchRows?.[0]?.match_score;
    const effectiveMatchScore = typeof input.matchScore === "number"
        ? input.matchScore
        : persistedMatchScore;
    if (typeof effectiveMatchScore !== "number") {
        throw new Error("Run analyze before downloading resume");
    }
    const tailoringDecision = getTailoringDecisionFromMatchScore(effectiveMatchScore);
    if (!tailoringDecision.allowed) {
        throw new Error(`Low fit role (${effectiveMatchScore}). ${tailoringDecision.message}`);
    }

    const { data: jobRows } = await supabase
        .from("jobs")
        .select("title, company, job_url")
        .eq("id", jobId)
        .limit(1);

    const jobTitle = input.jobTitle?.trim() || jobRows?.[0]?.title || "Untitled Role";
    const company = input.company?.trim() || jobRows?.[0]?.company || "Unknown Company";
    const jobUrl = input.jobUrl?.trim() || jobRows?.[0]?.job_url || null;

    const resumeResult = await generateResumeCopilot({
        profileId,
        jobId,
        options: {
            includeDebug: false,
            calibrationContext: {
                confirmed_strength_areas: input.confirmedStrengthAreas ?? [],
                positioning_hints: input.positioningHints ?? [],
            },
        },
    });
    const resumeText = buildResumeTextFile({
        roleTitle: jobTitle,
        company,
        resume: resumeResult.resume,
    });

    await writeAppliedPipelineAction({
        profileId,
        jobTitle,
        company,
        jobUrl,
        sourcePlatform: input.sourcePlatform ?? null,
        location: input.location ?? null,
        jobDescriptionSnapshot: input.jobDescriptionSnapshot ?? null,
        matchScore: effectiveMatchScore,
        verdict: input.verdict ?? null,
        selectedEvidenceIds: input.selectedEvidenceIds ?? [],
    });

    await markInteractionApplied({
        supabase,
        profileId,
        jobSnapshotId: input.jobSnapshotId ?? null,
        matchScore: effectiveMatchScore,
        verdict: input.verdict ?? null,
        selectedEvidenceIds: input.selectedEvidenceIds ?? [],
        resumeGenerated: true,
    });

    await supabase
        .from("job_matches")
        .update({ status: "applied", match_score: effectiveMatchScore })
        .eq("career_id", careerId)
        .eq("job_id", jobId);

    return {
        success: true,
        file_name: `${toSafeFilename(company)}-${toSafeFilename(jobTitle)}-tailored-resume.txt`,
        mime_type: "text/plain",
        resume_text: resumeText,
        applied_recorded: true,
        match_score: effectiveMatchScore,
    };
}
