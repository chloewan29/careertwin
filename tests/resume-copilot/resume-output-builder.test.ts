import { strict as assert } from "node:assert";
import { buildResumeCopilotOutput } from "@/lib/career-engine/copilot/resume-copilot/resume-output-builder";
import type { RankedResumeEvidence, ResumeCopilotJobSignals } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-types";
import type { EvidencePiece } from "@/lib/career-engine/memory/career-graph-loader";

function makeEvidence(id: string, rawText: string): EvidencePiece {
    return {
        id,
        career_id: "career-1",
        experience_id: "exp-1",
        company: "Acme",
        role: "Program Manager",
        date_range: "2022 - Present",
        raw_text: rawText,
        source_type: "resume_bullet",
        sort_order: 0,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
    };
}

function makeRanked(id: string, rawText: string, totalScore: number): RankedResumeEvidence {
    return {
        evidence: makeEvidence(id, rawText),
        poolSources: ["role_fit.supportingEvidence"],
        matchedSignals: ["sql"],
        experienceOrder: 0,
        score: {
            keyword_overlap: 0,
            required_skill_overlap: 4,
            preferred_skill_overlap: 0,
            responsibility_overlap: 0,
            role_family_overlap: 0,
            domain_overlap: 0,
            capability_alignment_bonus: 2,
            role_fit_evidence_bonus: 2,
            career_signal_highlight_bonus: 1,
            coverage_novelty_bonus: 0,
            total_score: totalScore,
            matched_required_skills: ["sql"],
            matched_preferred_skills: [],
            matched_responsibilities: [],
            matched_keywords: [],
            matched_domains: [],
            matched_role_family_terms: [],
            matched_capabilities: ["Program Leadership"],
        },
    };
}

const selectedEvidence = [
    makeRanked("ev-1", "led sql roadmap delivery", 12),
    makeRanked("ev-2", "managed stakeholder governance", 10),
];

const jobSignals: ResumeCopilotJobSignals = {
    job_id: "job-1",
    target_title: "Program Manager",
    role_family: "program",
    required_skills: ["sql"],
    preferred_skills: [],
    responsibilities: [],
    domains: [],
    keywords: [],
};

const result = buildResumeCopilotOutput({
    profileId: "profile-1",
    careerId: "career-1",
    jobSignals,
    selectedEvidence,
    summary: "Grounded summary",
    matchedCapabilitiesInSummary: ["Program Leadership"],
    summaryDebug: {
        weak_jd_mode: false,
        source_evidence_ids: ["ev-1", "ev-2"],
        source_companies: ["Acme"],
        source_roles: ["Program Manager"],
        source_themes: ["analytics automation"],
        source_matched_capabilities: ["Program Leadership"],
        target_title_used: "Program Manager",
        role_family_used: "program",
        ranked_experience_order: [
            {
                company: "Acme",
                role: "Program Manager",
                score: 12,
                recency_rank: 1,
            },
        ],
    },
    totalEvidenceLoaded: 12,
    totalEvidenceInPool: 5,
    totalEvidenceRanked: 4,
    poolSourceCounts: { "role_fit.supportingEvidence": 2 },
    intelligenceContext: {
        careerGraph: {
            career: null,
            experiences: [],
            evidencePieces: [],
            capabilities: [],
            capabilityEvidenceLinks: [],
            evidenceByExperience: {},
            capabilitiesByEvidence: {},
            evidenceByCapability: {},
        },
    },
    canonicalOnlyMode: true,
    legacyFallbackEnabled: false,
    includeDebug: true,
});

assert.equal(result.resume.summary, "Grounded summary");
assert.equal(result.resume.experience.length, 1);
assert.equal(result.resume.experience[0].bullets.length, 2);
assert.ok(result.resume.experience[0].bullets[0].endsWith("."));

assert.ok(result.debug);
assert.equal(result.debug?.metadata.total_evidence_in_pool, 5);
assert.equal(result.debug?.metadata.dropped_for_length, 0);
assert.equal(result.debug?.metadata.dropped_for_validation, 0);
assert.equal(result.debug?.metadata.dropped_for_duplicate, 0);
assert.equal(result.debug?.experiences[0].bullets[0].evidence_piece_id, "ev-1");
assert.equal(result.debug?.experiences[0].bullets[0].rewritten_bullet.endsWith("."), true);
assert.equal(typeof result.debug?.experiences[0].bullets[0].original_length, "number");
assert.equal(typeof result.debug?.experiences[0].bullets[0].rewritten_length, "number");
assert.equal(typeof result.debug?.experiences[0].bullets[0].was_compacted, "boolean");
assert.equal(typeof result.debug?.experiences[0].bullets[0].source_was_paragraph_like, "boolean");
assert.deepEqual(result.debug?.experiences[0].bullets[0].pool_sources, ["role_fit.supportingEvidence"]);
assert.equal(typeof result.debug?.experiences[0].bullets[0].score_breakdown, "object");

console.log("resume-output-builder.test passed");
