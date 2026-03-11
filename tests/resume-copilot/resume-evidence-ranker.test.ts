import { strict as assert } from "node:assert";
import { rankResumeEvidence } from "@/lib/career-engine/copilot/resume-copilot/resume-evidence-ranker";
import type {
    ResumeCopilotIntelligenceContext,
    ResumeCopilotJobSignals,
    ResumeEvidencePoolEntry,
} from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-types";
import type { Capability, CareerGraph, EvidencePiece, Experience } from "@/lib/career-engine/memory/career-graph-loader";

function makeExperience(id: string, sortOrder: number): Experience {
    return {
        id,
        career_id: "career-1",
        company: "Acme",
        title: "Program Manager",
        date_range: "2022 - Present",
        location: null,
        summary: null,
        source_type: "resume",
        sort_order: sortOrder,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
    };
}

function makeEvidence(id: string, experienceId: string, rawText: string, sortOrder: number): EvidencePiece {
    return {
        id,
        career_id: "career-1",
        experience_id: experienceId,
        company: "Acme",
        role: "Program Manager",
        date_range: "2022 - Present",
        raw_text: rawText,
        source_type: "resume_bullet",
        sort_order: sortOrder,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
    };
}

function makeCapability(id: string, name: string, normalized: string): Capability {
    return {
        id,
        career_id: "career-1",
        name,
        normalized_name: normalized,
        confidence: 1,
        strength: 1,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
    };
}

const exp1 = makeExperience("exp-1", 0);
const exp2 = makeExperience("exp-2", 1);
const ev1 = makeEvidence("ev-1", exp1.id, "Led program roadmap and stakeholder governance with SQL reporting", 0);
const ev2 = makeEvidence("ev-2", exp2.id, "Delivered team updates", 0);
const capProgram = makeCapability("cap-1", "Program Leadership", "program leadership");

const careerGraph: CareerGraph = {
    career: {
        id: "career-1",
        user_id: "user-1",
        headline: "Program Manager",
        summary: "Summary",
        total_years_experience: 10,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
    },
    experiences: [exp1, exp2],
    evidencePieces: [ev1, ev2],
    capabilities: [capProgram],
    capabilityEvidenceLinks: [],
    evidenceByExperience: { [exp1.id]: [ev1], [exp2.id]: [ev2] },
    capabilitiesByEvidence: { [ev1.id]: [capProgram] },
    evidenceByCapability: { [capProgram.id]: [ev1] },
};

const intelligence: ResumeCopilotIntelligenceContext = {
    careerGraph,
    careerSignals: {
        topCapabilities: [],
        bestFitRoles: [],
        keyGaps: [],
        evidenceHighlights: [ev1],
    },
    roleFit: {
        targetRole: "Program Manager",
        fitScore: 90,
        matchedCapabilities: [capProgram],
        missingCapabilities: [],
        supportingEvidence: [ev1],
        fitSummary: "High fit",
    },
};

const evidencePool: ResumeEvidencePoolEntry[] = [
    { evidence: ev1, poolSources: ["role_fit.supportingEvidence"] },
    { evidence: ev2, poolSources: ["career_signals.evidenceHighlights"] },
];

const jobSignals: ResumeCopilotJobSignals = {
    job_id: "job-1",
    target_title: "Program Manager",
    role_family: "program",
    required_skills: ["SQL", "stakeholder governance"],
    preferred_skills: ["roadmap"],
    responsibilities: ["program roadmap"],
    domains: ["governance"],
    keywords: ["program", "delivery", "sql"],
};

const ranked = rankResumeEvidence({
    intelligence,
    evidencePool,
    jobSignals,
});

assert.equal(ranked.length, 1, "Expected only one positively scored evidence entry");
assert.equal(ranked[0].evidence.id, "ev-1", "Expected strongest evidence to rank first");
assert.equal(ranked[0].poolSources[0], "role_fit.supportingEvidence");
assert.ok(ranked[0].score.total_score > 0);
assert.ok(ranked[0].matchedSignals.includes("program roadmap"));

console.log("resume-evidence-ranker.test passed");
