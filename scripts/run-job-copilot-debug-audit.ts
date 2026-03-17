import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import { buildKeyGaps, buildWhyYouMatch } from "@/lib/career-engine/job-copilot/backend/job-copilot-output-builder";
import {
    DOMAIN_FAMILY_REGISTRY,
    DOMAIN_SIGNAL_WEIGHTS,
    type SpecializationConfig,
} from "@/lib/career-engine/job-copilot/domain-family-config";
import {
    buildCareerInsightSelectionAudit,
    generateCareerInsightSections,
    type CareerInsightSelectionAuditCandidate,
} from "@/lib/career-engine/job-copilot/career-insight-generator";
import {
    buildApplyRecommendation,
    buildCalibrationQuestionSelectionAudit,
    buildCalibrationQuestions,
    type ExplanationConsistencyContext,
    type CalibrationQuestionSelectionAuditCandidate,
} from "@/lib/career-engine/job-copilot/fit-calibration-engine";
import type { JobCalibrationState } from "@/lib/career-engine/job-copilot/job-analysis";
import {
    debugDomainAnchorDetection,
    detectInterpretationLayerForText,
    getInterpretationLayerPriority,
} from "@/lib/career-engine/job-copilot/domain-family-detector";
import { buildDomainOntologySpecializationAudit } from "@/lib/career-engine/job-copilot/domain-ontology-audit";
import { buildJobFitScoreV1 } from "@/lib/career-engine/job-copilot/job-fit-score-v1";
import { detectRoleIdentity } from "@/lib/career-engine/job-copilot/role-identity-detector";
import { getCapabilityMatchV2 } from "@/lib/career-engine/matching/capability-match-v2";
import {
    loadEnvLocal,
    resolveFixtureJob,
    resolveProfileAndCareer,
    type Fixture,
    type FixtureJob,
    type FixtureJobSource,
} from "@/scripts/human-alignment-benchmark";

type InputExpected = {
    expectedDomainFamily?: string;
    expectedSpecializationHints?: string[];
    expectedPrimaryRoleType?: string;
};

type AuditInputFixtureCase = {
    id?: string;
    profileId?: string | null;
    careerId?: string | null;
    expected?: InputExpected;
    job: {
        title: string;
        company?: string | null;
        source?: FixtureJobSource;
        job_description?: string;
    };
};

type ScriptArgs = {
    profileId: string | null;
    careerId: string | null;
    fixturePath: string | null;
    caseId: string | null;
    analysisPayloadPath: string | null;
    jobTitle: string | null;
    company: string | null;
    jobDescription: string | null;
    jobDescriptionFile: string | null;
    expectedDomainFamily: string | null;
    expectedSpecializationHints: string[] | null;
    expectedPrimaryRoleType: string | null;
    outPath: string;
    markdownOutPath: string | null;
};

type ResolvedAuditCase = {
    caseId: string;
    source: string;
    profileId: string | null;
    careerId: string | null;
    jobTitle: string;
    company: string | null;
    jobDescription: string;
    expected: InputExpected;
};

type Stage1SignalRow = {
    family: string;
    specialization: string;
    category: "strong" | "method" | "tool" | "support";
    signal: string;
    hits: number;
    weight: number;
    weightedContribution: number;
};

type Stage2ClusterRow = {
    clusterId: string;
    displayName: string;
    importance: "critical" | "important" | "supporting";
    confidence: number;
    genericity: "broad" | "balanced" | "specific";
    interpretationLayer: string;
    interpretationLayerScore: number;
    finalClusterScore: number;
    sourceSignals: {
        matchedTerms: string[];
        methods: string[];
        domainModifiers: string[];
        evidence: string[];
    };
};

type FailureSummary = {
    likelyFailureStage: string;
    summary: string;
    details: string[];
};

function parseArgs(): ScriptArgs {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    const expectedHintsArg = readArg("--expectedSpecializationHints");
    return {
        profileId: readArg("--profileId"),
        careerId: readArg("--careerId"),
        fixturePath: readArg("--fixture"),
        caseId: readArg("--caseId"),
        analysisPayloadPath: readArg("--analysisPayload"),
        jobTitle: readArg("--jobTitle"),
        company: readArg("--company"),
        jobDescription: readArg("--jobDescription"),
        jobDescriptionFile: readArg("--jobDescriptionFile"),
        expectedDomainFamily: readArg("--expectedDomainFamily"),
        expectedSpecializationHints: expectedHintsArg
            ? expectedHintsArg.split(",").map((value) => value.trim()).filter(Boolean)
            : null,
        expectedPrimaryRoleType: readArg("--expectedPrimaryRoleType"),
        outPath: readArg("--out") ?? "artifacts/job-copilot-debug-audit.json",
        markdownOutPath: readArg("--markdownOut") ?? "artifacts/job-copilot-debug-audit.md",
    };
}

function readJsonFile<T>(filePath: string): T {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as T;
}

function writeJson(filePath: string, data: unknown): void {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeMarkdown(filePath: string, content: string): void {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content, "utf8");
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function countPhraseHits(corpus: string, phrase: string): number {
    const normalizedCorpus = normalizeText(corpus);
    const normalizedPhrase = normalizeText(phrase);
    if (!normalizedPhrase) return 0;
    const escaped = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const regex = new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, "g");
    let count = 0;
    while (regex.exec(normalizedCorpus)) {
        count += 1;
    }
    return count;
}

function parseFixtureCaseFromFixture(fixture: Fixture, caseId: string | null): AuditInputFixtureCase {
    const targetCase = caseId
        ? fixture.jobs.find((job) => job.id === caseId)
        : fixture.jobs[0];
    if (!targetCase) {
        throw new Error(`No fixture case found${caseId ? ` for caseId=${caseId}` : ""}.`);
    }
    const candidate = targetCase as FixtureJob & {
        profileId?: string;
        careerId?: string;
        expectedDomainFamily?: string;
        expectedSpecializationHints?: string[];
        expectedPrimaryRoleType?: string;
        expected?: InputExpected;
    };
    return {
        id: candidate.id,
        profileId: candidate.profileId ?? null,
        careerId: candidate.careerId ?? null,
        expected: candidate.expected ?? {
            expectedDomainFamily: candidate.expectedDomainFamily,
            expectedSpecializationHints: candidate.expectedSpecializationHints,
            expectedPrimaryRoleType: candidate.expectedPrimaryRoleType,
        },
        job: {
            title: candidate.title,
            company: candidate.company ?? null,
            source: candidate.source,
            job_description: candidate.job_description,
        },
    };
}

async function resolveAuditCase(args: ScriptArgs): Promise<ResolvedAuditCase> {
    if (args.fixturePath) {
        const fixtureJson = readJsonFile<Fixture | AuditInputFixtureCase>(args.fixturePath);
        const fixtureCase = Array.isArray((fixtureJson as Fixture).jobs)
            ? parseFixtureCaseFromFixture(fixtureJson as Fixture, args.caseId)
            : (fixtureJson as AuditInputFixtureCase);
        const resolvedFixtureJob = await resolveFixtureJob({
            id: fixtureCase.id ?? "debug_case",
            title: fixtureCase.job.title,
            company: fixtureCase.job.company ?? null,
            human_label: "medium_fit",
            human_reasoning_short: "debug",
            source: fixtureCase.job.source ?? (fixtureCase.job.job_description
                ? { type: "inline", job_description: fixtureCase.job.job_description }
                : undefined),
            job_description: fixtureCase.job.job_description,
        } satisfies FixtureJob);
        return {
            caseId: fixtureCase.id ?? resolvedFixtureJob.id ?? "fixture_case",
            source: `fixture:${args.fixturePath}${args.caseId ? `#${args.caseId}` : ""}`,
            profileId: args.profileId ?? fixtureCase.profileId ?? null,
            careerId: args.careerId ?? fixtureCase.careerId ?? null,
            jobTitle: resolvedFixtureJob.resolved_title,
            company: resolvedFixtureJob.resolved_company,
            jobDescription: resolvedFixtureJob.job_description,
            expected: fixtureCase.expected ?? {},
        };
    }

    if (args.analysisPayloadPath) {
        const payload = readJsonFile<Record<string, unknown>>(args.analysisPayloadPath);
        const profileId = (payload.profileId as string | undefined) ?? null;
        const careerId = (payload.careerId as string | undefined) ?? null;
        const input = (payload.input && typeof payload.input === "object")
            ? (payload.input as Record<string, unknown>)
            : payload;
        const jobTitle = (input.jobTitle as string | undefined) ?? (input.title as string | undefined);
        const jobDescription = (input.jobDescription as string | undefined) ?? (input.description as string | undefined);
        if (!jobTitle || !jobDescription) {
            throw new Error("analysis payload is missing jobTitle/jobDescription.");
        }
        return {
            caseId: "analysis_payload_case",
            source: `analysisPayload:${args.analysisPayloadPath}`,
            profileId: args.profileId ?? profileId,
            careerId: args.careerId ?? careerId,
            jobTitle,
            company: (input.company as string | undefined) ?? null,
            jobDescription,
            expected: {
                expectedDomainFamily: (payload.expectedDomainFamily as string | undefined) ?? undefined,
                expectedSpecializationHints: Array.isArray(payload.expectedSpecializationHints)
                    ? (payload.expectedSpecializationHints as string[])
                    : undefined,
                expectedPrimaryRoleType: (payload.expectedPrimaryRoleType as string | undefined) ?? undefined,
            },
        };
    }

    const jobDescriptionFromFile = args.jobDescriptionFile
        ? fs.readFileSync(path.isAbsolute(args.jobDescriptionFile) ? args.jobDescriptionFile : path.join(process.cwd(), args.jobDescriptionFile), "utf8")
        : null;
    const jobTitle = args.jobTitle;
    const jobDescription = args.jobDescription ?? jobDescriptionFromFile;
    if (!jobTitle || !jobDescription) {
        throw new Error("Provide one of --fixture, --analysisPayload, or --jobTitle + (--jobDescription or --jobDescriptionFile).");
    }
    return {
        caseId: "direct_case",
        source: "direct_input",
        profileId: args.profileId,
        careerId: args.careerId,
        jobTitle,
        company: args.company,
        jobDescription,
        expected: {
            expectedDomainFamily: args.expectedDomainFamily ?? undefined,
            expectedSpecializationHints: args.expectedSpecializationHints ?? undefined,
            expectedPrimaryRoleType: args.expectedPrimaryRoleType ?? undefined,
        },
    };
}

function toEmptyCalibrationState(): JobCalibrationState {
    return {
        required: false,
        questions: [],
        answers: [],
        answered_count: 0,
        total_questions: 0,
        recalibrated: false,
        score_delta: 0,
        confirmed_strength_areas: [],
        confirmed_risk_areas: [],
    };
}

function findSpecializationConfigByKey(key: string): { family: string; config: SpecializationConfig } | null {
    for (const family of DOMAIN_FAMILY_REGISTRY) {
        for (const specialization of family.specializations) {
            if (specialization.key === key) {
                return { family: family.family, config: specialization };
            }
        }
    }
    return null;
}

function parseSignalEvidenceEntry(entry: string): { category: "strong" | "method" | "tool" | "support"; signal: string; hits: number } | null {
    const firstColon = entry.indexOf(":");
    const lastColon = entry.lastIndexOf(":");
    if (firstColon <= 0 || lastColon <= firstColon) return null;
    const category = entry.slice(0, firstColon).trim();
    const signal = entry.slice(firstColon + 1, lastColon).trim();
    const hitsRaw = entry.slice(lastColon + 1).trim();
    const hits = Number(hitsRaw);
    if (!["strong", "method", "tool", "support"].includes(category) || !signal || Number.isNaN(hits)) {
        return null;
    }
    return {
        category: category as "strong" | "method" | "tool" | "support",
        signal,
        hits,
    };
}

function collectStage1MatchedSignals(params: {
    familyScoreBreakdown: Array<{
        family: string;
        specializationScores: Array<{ key: string; evidence: string[] }>;
    }>;
}): Stage1SignalRow[] {
    const rows: Stage1SignalRow[] = [];
    for (const family of params.familyScoreBreakdown) {
        for (const specialization of family.specializationScores) {
            for (const evidenceEntry of specialization.evidence) {
                const parsed = parseSignalEvidenceEntry(evidenceEntry);
                if (!parsed || parsed.hits <= 0) continue;
                const weight = DOMAIN_SIGNAL_WEIGHTS[parsed.category];
                rows.push({
                    family: family.family,
                    specialization: specialization.key,
                    category: parsed.category,
                    signal: parsed.signal,
                    hits: parsed.hits,
                    weight,
                    weightedContribution: Number((parsed.hits * weight).toFixed(4)),
                });
            }
        }
    }
    return rows
        .sort((left, right) => right.weightedContribution - left.weightedContribution)
        .slice(0, 80);
}

function collectStage1MissedTerms(params: {
    expected: InputExpected;
    jdText: string;
}): Array<{ specialization: string; category: string; term: string }> {
    const expectedHints = params.expected.expectedSpecializationHints ?? [];
    if (expectedHints.length === 0) return [];
    const missing: Array<{ specialization: string; category: string; term: string }> = [];
    for (const hint of expectedHints) {
        const specialization = findSpecializationConfigByKey(hint);
        if (!specialization) continue;
        const signalGroups: Array<{ category: string; values: string[] }> = [
            { category: "strong", values: specialization.config.strongSignals },
            { category: "method", values: specialization.config.methodSignals ?? [] },
            { category: "tool", values: specialization.config.toolSignals ?? [] },
            { category: "support", values: specialization.config.supportSignals ?? [] },
        ];
        for (const group of signalGroups) {
            for (const term of group.values) {
                if (countPhraseHits(params.jdText, term) > 0) continue;
                missing.push({
                    specialization: hint,
                    category: group.category,
                    term,
                });
            }
        }
    }
    return missing.slice(0, 50);
}

function summarizeSelectionLayer(candidates: Array<CareerInsightSelectionAuditCandidate | CalibrationQuestionSelectionAuditCandidate>): string | null {
    const selected = candidates.filter((item) => item.selected);
    if (selected.length === 0) return null;
    const ranked = selected.sort((left, right) => getInterpretationLayerPriority(right.interpretationLayer) - getInterpretationLayerPriority(left.interpretationLayer));
    return ranked[0].interpretationLayer;
}

function buildFailureSummary(params: {
    expected: InputExpected;
    stage1: {
        missedExpectedTerms: Array<{ specialization: string; category: string; term: string }>;
        matchedSignals: Stage1SignalRow[];
    };
    stage2: {
        domainDefiningClusters: number;
    };
    stage3: {
        primaryRoleType: string;
    };
    stage4: {
        winningFamily: string | null;
    };
    stage5: {
        higherLayerAvailableButNotSelected: boolean;
    };
    stage6: {
        whyFitCandidates: CareerInsightSelectionAuditCandidate[];
        quickCheckCandidates: CalibrationQuestionSelectionAuditCandidate[];
    };
}): FailureSummary {
    const details: string[] = [];
    const expectedDomainFamily = params.expected.expectedDomainFamily ?? null;
    const expectedRoleType = params.expected.expectedPrimaryRoleType ?? null;
    const expectedHints = params.expected.expectedSpecializationHints ?? [];
    const matchedSignalCount = params.stage1.matchedSignals.length;

    if (matchedSignalCount === 0 || (expectedHints.length > 0 && params.stage1.missedExpectedTerms.length > 0 && matchedSignalCount < 4)) {
        details.push("Expected domain/specialization terms are mostly missing from extracted JD signals.");
        return {
            likelyFailureStage: "Stage 1 — JD Signal Audit",
            summary: "Domain terms appear under-extracted or weakly captured from raw JD input.",
            details,
        };
    }

    if (params.stage2.domainDefiningClusters === 0 && matchedSignalCount > 0) {
        details.push("Domain signal evidence exists, but no domain_defining requirement cluster survived.");
        return {
            likelyFailureStage: "Stage 2 — Requirement Cluster Audit",
            summary: "Domain-defining JD evidence did not survive requirement clustering.",
            details,
        };
    }

    if (expectedRoleType && params.stage3.primaryRoleType !== expectedRoleType) {
        details.push(`Expected primary role type '${expectedRoleType}', got '${params.stage3.primaryRoleType}'.`);
        return {
            likelyFailureStage: "Stage 3 — Role Identity Audit",
            summary: "Role identity classification likely drifted from expected role shape.",
            details,
        };
    }

    if (expectedDomainFamily && params.stage4.winningFamily !== expectedDomainFamily) {
        details.push(`Expected domain family '${expectedDomainFamily}', got '${String(params.stage4.winningFamily)}'.`);
        return {
            likelyFailureStage: "Stage 4 — Domain Anchor Audit",
            summary: "Domain family detection did not converge to expected family.",
            details,
        };
    }

    const whyFitTopLayer = summarizeSelectionLayer(params.stage6.whyFitCandidates);
    const quickCheckTopLayer = summarizeSelectionLayer(params.stage6.quickCheckCandidates);
    const domainCandidatesInWhyFit = params.stage6.whyFitCandidates.some((candidate) => candidate.interpretationLayer === "domain_defining");
    const domainCandidatesInQuickChecks = params.stage6.quickCheckCandidates.some((candidate) => candidate.interpretationLayer === "domain_defining");

    if (params.stage5.higherLayerAvailableButNotSelected) {
        details.push("Higher-layer candidates were available in explanation candidates but not selected.");
        return {
            likelyFailureStage: "Stage 5 — Interpretation Hierarchy Audit",
            summary: "Hierarchy enforcement likely failed in explanation prioritization.",
            details,
        };
    }

    if (domainCandidatesInWhyFit && whyFitTopLayer !== "domain_defining") {
        details.push("Domain-defining explanation candidates existed but top why-fit did not select them.");
        return {
            likelyFailureStage: "Stage 6 — Explanation Selection Audit",
            summary: "Final explanation selection is likely favoring lower-layer candidates over domain-defining signals.",
            details,
        };
    }

    if (domainCandidatesInQuickChecks && quickCheckTopLayer !== "domain_defining") {
        details.push("Domain-defining unresolved question candidates existed but were not prioritized.");
        return {
            likelyFailureStage: "Stage 6 — Quick-Check Selection Audit",
            summary: "Quick-check prioritization is likely favoring lower-layer questions.",
            details,
        };
    }

    return {
        likelyFailureStage: "No obvious single-stage failure",
        summary: "Audit trace appears internally consistent. If output is still poor, investigate threshold tuning and copy synthesis.",
        details,
    };
}

function toMarkdownReport(params: {
    output: Record<string, unknown>;
    failureSummary: FailureSummary;
}): string {
    const lines: string[] = [];
    lines.push("# Job Copilot Debug Audit");
    lines.push("");
    lines.push(`- Generated at: ${String(params.output.generated_at)}`);
    lines.push(`- Case: ${String((params.output.input as Record<string, unknown>).case_id ?? "unknown")}`);
    lines.push(`- Job Title: ${String((params.output.input as Record<string, unknown>).job_title ?? "unknown")}`);
    lines.push("");
    lines.push("## Failure Summary");
    lines.push(`- Likely stage: ${params.failureSummary.likelyFailureStage}`);
    lines.push(`- Summary: ${params.failureSummary.summary}`);
    if (params.failureSummary.details.length > 0) {
        lines.push("- Details:");
        for (const detail of params.failureSummary.details) {
            lines.push(`  - ${detail}`);
        }
    }
    lines.push("");
    lines.push("## Note");
    lines.push("- Full structured trace is in `artifacts/job-copilot-debug-audit.json`.");
    lines.push("");
    return `${lines.join("\n")}\n`;
}

async function runAudit(args: ScriptArgs): Promise<Record<string, unknown>> {
    loadEnvLocal();
    const input = await resolveAuditCase(args);
    const resolvedIdentity = await resolveProfileAndCareer(
        args.profileId ?? input.profileId ?? null,
        args.careerId ?? input.careerId ?? null,
    );
    const parsedSignals = buildJobSignalsFromRawJd({
        rawJd: input.jobDescription,
        fallbackTitle: input.jobTitle,
    });
    const matchResult = await getCapabilityMatchV2({
        profileId: resolvedIdentity.profileId,
        careerId: resolvedIdentity.careerId,
        jobDescription: input.jobDescription,
        jobTitleHint: input.jobTitle,
        topSignalsLimit: 4,
    });
    const roleIdentity = detectRoleIdentity({
        jobTitle: input.jobTitle,
        parsedSignals,
        matchResult,
    });
    const domainAudit = debugDomainAnchorDetection({
        jobTitle: input.jobTitle,
        parsedSignals,
        matchResult,
    });
    const ontologySpecializationAudit = buildDomainOntologySpecializationAudit({
        jobTitle: input.jobTitle,
        parsedSignals,
        matchResult,
        detectorWinningFamily: roleIdentity.domainAnchor.domainFamily,
    });
    const jobFitScore = buildJobFitScoreV1({
        capabilityMatch: matchResult,
        ontologyAudit: ontologySpecializationAudit,
    });
    const baseScore = Number((matchResult.overall_match_score * 100).toFixed(2));
    const applyRecommendation = buildApplyRecommendation(baseScore);
    const topStrengths = buildWhyYouMatch({
        matchStrengthCapabilities: matchResult.matched_strengths.map((item) => item.display_name),
        profileTopCapabilities: matchResult.candidate_capability_profile.map((item) => item.display_name).slice(0, 3),
    });
    const topRisks = buildKeyGaps({
        matchGapCapabilities: matchResult.gaps
            .filter((item) => item.importance === "critical" || item.importance === "important")
            .map((item) => item.display_name),
        profileKeyGaps: [],
    });
    const calibrationState = toEmptyCalibrationState();
    const careerInsight = generateCareerInsightSections({
        recommendation: applyRecommendation,
        topStrengths,
        topRisks,
        calibration: calibrationState,
        jobTitle: input.jobTitle,
        matchResult,
        roleIdentity,
    });
    const insightAudit = buildCareerInsightSelectionAudit({
        matchResult,
        calibration: calibrationState,
        roleIdentity,
        maxStrengths: 3,
        maxRisks: 3,
    });
    const consistencyContext: ExplanationConsistencyContext = {
        excludedConsistencyKeys: Array.from(
            new Set([
                ...insightAudit.selectedWhyFitConsistencyKeys,
            ]),
        ),
        preferredUncertaintyKey: insightAudit.primaryUncertaintyThemeKey,
    };
    const calibrationSelectionAudit = buildCalibrationQuestionSelectionAudit({
        matchResult,
        roleIdentity,
        maxQuestions: 3,
        consistencyContext,
    });
    const calibrationQuestions = buildCalibrationQuestions({
        matchResult,
        roleIdentity,
        maxQuestions: 3,
        consistencyContext,
    });
    const questionById = new Map(calibrationQuestions.questions.map((question) => [question.id, question.question]));

    const matchedSignals = collectStage1MatchedSignals({
        familyScoreBreakdown: domainAudit.familyScoreBreakdown.map((family) => ({
            family: family.family,
            specializationScores: family.specializationScores.map((specialization) => ({
                key: specialization.key,
                evidence: specialization.evidence,
            })),
        })),
    });
    const missedExpectedTerms = collectStage1MissedTerms({
        expected: input.expected,
        jdText: input.jobDescription,
    });

    const breakdownByCluster = new Map(
        matchResult.audit.requirement_to_candidate_match_breakdown.map((item) => [item.cluster_id, item]),
    );
    const stage2Clusters: Stage2ClusterRow[] = matchResult.audit.requirement_clusters.map((cluster) => {
        const breakdown = breakdownByCluster.get(cluster.cluster_id);
        const interpretation = detectInterpretationLayerForText({
            text: `${cluster.display_name} ${cluster.methods.join(" ")} ${cluster.domain_modifiers.join(" ")}`,
            domainAnchor: roleIdentity.domainAnchor,
        });
        return {
            clusterId: cluster.cluster_id,
            displayName: cluster.display_name,
            importance: cluster.importance,
            confidence: Number(cluster.confidence.toFixed(4)),
            genericity: cluster.genericity,
            interpretationLayer: interpretation.layer,
            interpretationLayerScore: interpretation.score,
            finalClusterScore: Number((breakdown?.final_cluster_score ?? 0).toFixed(4)),
            sourceSignals: {
                matchedTerms: cluster.matched_terms,
                methods: cluster.methods,
                domainModifiers: cluster.domain_modifiers,
                evidence: cluster.evidence,
            },
        };
    });
    const stage2DomainDefiningClusters = stage2Clusters.filter((cluster) => cluster.interpretationLayer === "domain_defining").length;

    const stage6QuickCheckCandidates = calibrationSelectionAudit.candidates.map((candidate) => ({
        ...candidate,
        questionText: questionById.get(candidate.questionId) ?? null,
    }));

    const output = {
        generated_at: new Date().toISOString(),
        input: {
            case_id: input.caseId,
            source: input.source,
            profile_id: resolvedIdentity.profileId,
            career_id: resolvedIdentity.careerId,
            job_title: input.jobTitle,
            company: input.company,
            expected: input.expected,
        },
        stage_1_jd_signal_audit: {
            parsed_signal_categories: {
                required_skills: parsedSignals.required_skills,
                preferred_skills: parsedSignals.preferred_skills,
                responsibilities: parsedSignals.responsibilities,
                domains: parsedSignals.domains,
                keywords: parsedSignals.keywords,
            },
            signal_weights: DOMAIN_SIGNAL_WEIGHTS,
            matched_signals: matchedSignals,
            important_missed_terms_if_detectable: missedExpectedTerms,
        },
        stage_2_requirement_cluster_audit: {
            clusters: stage2Clusters,
            domain_defining_signals_survived_clustering: stage2DomainDefiningClusters > 0,
            domain_defining_cluster_count: stage2DomainDefiningClusters,
        },
        stage_3_role_identity_audit: {
            primaryRoleType: roleIdentity.primaryRoleType,
            secondaryRoleTypes: roleIdentity.secondaryRoleTypes,
            deliveryScope: roleIdentity.deliveryScope,
            confidence: roleIdentity.confidence,
            evidence: roleIdentity.signalSummary,
        },
        stage_4_domain_anchor_audit: {
            family_score_breakdown: domainAudit.familyScoreBreakdown,
            winning_family: roleIdentity.domainAnchor.domainFamily,
            winning_specialization_hints: roleIdentity.domainAnchor.specializationHints,
            tie_break_override_trace: domainAudit.tieBreakTrace,
            dominant_layers: roleIdentity.domainAnchor.dominantLayers,
            ontology_specialization_votes: ontologySpecializationAudit.specialization_votes,
            ontology_family_aggregation: ontologySpecializationAudit.family_aggregation,
            ontology_top_specializations: ontologySpecializationAudit.top_specializations,
            ontology_vertical_horizontal_watch: ontologySpecializationAudit.vertical_horizontal_watch,
        },
        stage_5_domain_winner_correction: {
            original_winner: domainAudit.domainWinnerCorrection.original_winner,
            corrected_winner: domainAudit.domainWinnerCorrection.corrected_winner_applied,
            correction_applied: domainAudit.domainWinnerCorrection.correction_applied,
            correction_reason: domainAudit.domainWinnerCorrection.correction_reason,
            top_specialization: domainAudit.domainWinnerCorrection.top_specialization,
            top_specialization_score: domainAudit.domainWinnerCorrection.top_specialization_score,
            vertical_family_score: domainAudit.domainWinnerCorrection.vertical_family_score,
            horizontal_family_score: domainAudit.domainWinnerCorrection.horizontal_family_score,
            corrected_winner_ontology_family: domainAudit.domainWinnerCorrection.corrected_winner,
            ontology_family_before_mapping: domainAudit.domainWinnerCorrection.ontology_family_before_mapping,
            mapped_legacy_family: domainAudit.domainWinnerCorrection.mapped_legacy_family,
            mapping_reason: domainAudit.domainWinnerCorrection.mapping_reason,
            mapping_confidence_basis: domainAudit.domainWinnerCorrection.mapping_confidence_basis,
            horizontal_specificity_refinement: {
                original_winner: domainAudit.horizontalSpecificityRefinement.original_winner,
                refined_winner: domainAudit.horizontalSpecificityRefinement.refined_winner_applied_legacy,
                refinement_applied: domainAudit.horizontalSpecificityRefinement.refinement_applied,
                refinement_reason: domainAudit.horizontalSpecificityRefinement.refinement_reason,
                top_specialization: domainAudit.horizontalSpecificityRefinement.top_specialization,
                top_specialization_score: domainAudit.horizontalSpecificityRefinement.top_specialization_score,
                target_family: domainAudit.horizontalSpecificityRefinement.target_family,
                target_family_score: domainAudit.horizontalSpecificityRefinement.target_family_score,
                data_family_score: domainAudit.horizontalSpecificityRefinement.data_family_score,
                refined_winner_ontology_family: domainAudit.horizontalSpecificityRefinement.refined_winner,
            },
        },
        stage_5_interpretation_hierarchy_audit: {
            dominant_signals_by_layer: domainAudit.dominantLayerScores,
            explanation_priority_trace: insightAudit.whyFitCandidates
                .sort((left, right) => right.score - left.score)
                .map((candidate) => ({
                    displayName: candidate.displayName,
                    interpretationLayer: candidate.interpretationLayer,
                    score: candidate.score,
                    selected: candidate.selected,
                    selectionReason: candidate.selectionReason,
                })),
            higher_layer_signals_available_but_not_selected: insightAudit.higherLayerAvailableButNotSelected,
        },
        stage_6_selection_audit: {
            final_outputs: {
                applyRecommendation: applyRecommendation,
                job_fit_score: jobFitScore.score,
                careerInsight: careerInsight.careerInsight,
                whyFit: careerInsight.whyFit,
                risks: careerInsight.potentialRisks,
                quickChecks: calibrationQuestions.questions,
            },
            consistency_context: {
                excluded_consistency_keys: consistencyContext.excludedConsistencyKeys ?? [],
                preferred_uncertainty_key: consistencyContext.preferredUncertaintyKey ?? null,
            },
            why_fit_candidates: insightAudit.whyFitCandidates,
            risk_candidates: insightAudit.riskCandidates,
            quick_check_candidates: stage6QuickCheckCandidates,
        },
        stage_7_job_fit_score_debug: {
            score: jobFitScore.score,
            debug_inputs: jobFitScore.debug,
        },
    };

    const failureSummary = buildFailureSummary({
        expected: input.expected,
        stage1: {
            missedExpectedTerms,
            matchedSignals,
        },
        stage2: {
            domainDefiningClusters: stage2DomainDefiningClusters,
        },
        stage3: {
            primaryRoleType: roleIdentity.primaryRoleType,
        },
        stage4: {
            winningFamily: roleIdentity.domainAnchor.domainFamily,
        },
        stage5: {
            higherLayerAvailableButNotSelected: insightAudit.higherLayerAvailableButNotSelected,
        },
        stage6: {
            whyFitCandidates: insightAudit.whyFitCandidates,
            quickCheckCandidates: calibrationSelectionAudit.candidates,
        },
    });

    return {
        ...output,
        failure_summary: failureSummary,
    };
}

async function main(): Promise<void> {
    const args = parseArgs();
    const output = await runAudit(args);
    writeJson(args.outPath, output);
    if (args.markdownOutPath) {
        writeMarkdown(args.markdownOutPath, toMarkdownReport({
            output,
            failureSummary: output.failure_summary as FailureSummary,
        }));
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
        status: "ok",
        out: args.outPath,
        markdownOut: args.markdownOutPath,
        likelyFailureStage: (output.failure_summary as FailureSummary).likelyFailureStage,
        summary: (output.failure_summary as FailureSummary).summary,
    }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    main().catch((error) => {
        // eslint-disable-next-line no-console
        console.error("[run-job-copilot-debug-audit] failed:", error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
