import { strict as assert } from "node:assert";
import { selectCoverageAwareBullets } from "@/lib/career-engine/copilot/resume-copilot/resume-bullet-selector";
import type { RankedResumeEvidence, ResumeCopilotJobSignals } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-types";
import type { EvidencePiece } from "@/lib/career-engine/memory/career-graph-loader";

function makeEvidence(id: string, experienceId: string): EvidencePiece {
    return {
        id,
        career_id: "career-1",
        experience_id: experienceId,
        company: "Acme",
        role: "Program Manager",
        date_range: "2022 - Present",
        raw_text: `Bullet ${id}`,
        source_type: "resume_bullet",
        sort_order: 0,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
    };
}

function makeRanked(
    evidence: EvidencePiece,
    totalScore: number,
    matchedSignals: string[],
    experienceOrder: number,
): RankedResumeEvidence {
    return {
        evidence,
        poolSources: ["role_fit.supportingEvidence"],
        matchedSignals,
        experienceOrder,
        score: {
            keyword_overlap: 0,
            required_skill_overlap: 0,
            preferred_skill_overlap: 0,
            responsibility_overlap: 0,
            role_family_overlap: 0,
            domain_overlap: 0,
            capability_alignment_bonus: 0,
            role_fit_evidence_bonus: 0,
            career_signal_highlight_bonus: 0,
            coverage_novelty_bonus: 0,
            total_score: totalScore,
            matched_required_skills: [],
            matched_preferred_skills: [],
            matched_responsibilities: [],
            matched_keywords: [],
            matched_domains: [],
            matched_role_family_terms: [],
            matched_capabilities: [],
        },
    };
}

const a = makeRanked(makeEvidence("ev-1", "exp-1"), 10, ["signal-a"], 0);
const b = makeRanked(makeEvidence("ev-2", "exp-1"), 9, ["signal-b"], 0);
const c = makeRanked(makeEvidence("ev-3", "exp-2"), 8, ["signal-b"], 1);

const jobSignals: ResumeCopilotJobSignals = {
    job_id: "job-1",
    target_title: "Program Manager",
    role_family: "program",
    required_skills: ["signal-a", "signal-b"],
    preferred_skills: [],
    responsibilities: [],
    domains: [],
    keywords: [],
};

const selected = selectCoverageAwareBullets({
    rankedEvidence: [a, b, c],
    jobSignals,
    maxBulletsPerExperience: 1,
    minBulletsPerExperience: 1,
});

assert.equal(selected.length, 2, "Expected one bullet per experience due to max-per-exp constraint");
assert.equal(selected[0].evidence.id, "ev-1");
assert.equal(selected[1].evidence.id, "ev-3");
assert.ok(selected.every((item) => item.score.coverage_novelty_bonus >= 0));

console.log("resume-bullet-selector.test passed");
