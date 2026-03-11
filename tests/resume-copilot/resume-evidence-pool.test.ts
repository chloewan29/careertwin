import { strict as assert } from "node:assert";
import { buildResumeEvidencePool } from "@/lib/career-engine/copilot/resume-copilot/resume-evidence-pool";
import type { ResumeCopilotIntelligenceContext } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-types";
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

const experience = makeExperience("exp-1", 0);
const ev1 = makeEvidence("ev-1", experience.id, "Delivered program roadmap", 0);
const ev2 = makeEvidence("ev-2", experience.id, "Managed stakeholder governance", 1);
const cap1 = makeCapability("cap-1", "Program Leadership", "program leadership");

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
    experiences: [experience],
    evidencePieces: [ev1, ev2],
    capabilities: [cap1],
    capabilityEvidenceLinks: [],
    evidenceByExperience: { [experience.id]: [ev1, ev2] },
    capabilitiesByEvidence: { [ev1.id]: [cap1], [ev2.id]: [cap1] },
    evidenceByCapability: { [cap1.id]: [ev1, ev2] },
};

const intelligence: ResumeCopilotIntelligenceContext = {
    careerGraph,
    careerSignals: {
        topCapabilities: [],
        bestFitRoles: [],
        keyGaps: [],
        evidenceHighlights: [ev2],
    },
    roleFit: {
        targetRole: "Program Manager",
        fitScore: 80,
        matchedCapabilities: [cap1],
        missingCapabilities: [],
        supportingEvidence: [ev1],
        fitSummary: "Good fit",
    },
};

const result = buildResumeEvidencePool({ intelligence, topCapabilitiesLimit: 1 });

assert.equal(result.entries.length, 2, "Expected deduped evidence pool of size 2");
assert.equal(result.fallbackUsed, false, "Expected fallback to be unused when priority sources exist");

const byId = new Map(result.entries.map((entry) => [entry.evidence.id, entry]));
assert.deepEqual(
    new Set(byId.get("ev-1")?.poolSources),
    new Set(["role_fit.supportingEvidence", "top_capability:program leadership"]),
);
assert.deepEqual(
    new Set(byId.get("ev-2")?.poolSources),
    new Set(["career_signals.evidenceHighlights", "top_capability:program leadership"]),
);

assert.equal(result.poolSourceCounts["role_fit.supportingEvidence"], 1);
assert.equal(result.poolSourceCounts["career_signals.evidenceHighlights"], 1);
assert.equal(result.poolSourceCounts["top_capability:program leadership"], 2);

const emptySourceIntelligence: ResumeCopilotIntelligenceContext = {
    careerGraph: {
        ...careerGraph,
        capabilities: [],
        capabilitiesByEvidence: {},
        evidenceByCapability: {},
    },
    careerSignals: {
        topCapabilities: [],
        bestFitRoles: [],
        keyGaps: [],
        evidenceHighlights: [],
    },
    roleFit: null,
};

const fallbackResult = buildResumeEvidencePool({ intelligence: emptySourceIntelligence, topCapabilitiesLimit: 1 });
assert.equal(fallbackResult.fallbackUsed, true, "Expected fallback to be used when priority pool is empty");
assert.equal(fallbackResult.entries.length, careerGraph.evidencePieces.length);
assert.equal(fallbackResult.entries[0].evidence.id, "ev-1", "Expected deterministic order from careerGraph.evidencePieces");
assert.equal(fallbackResult.entries[1].evidence.id, "ev-2", "Expected deterministic order from careerGraph.evidencePieces");
assert.equal(fallbackResult.poolSourceCounts["fallback:careerGraph.evidencePieces"], 2);

console.log("resume-evidence-pool.test passed");
