import { strict as assert } from "node:assert";
import { buildResumeSummary, buildGroundedResumeSummary } from "@/lib/career-engine/copilot/resume-copilot/resume-summary-builder";
import { rankResumeEvidence } from "@/lib/career-engine/copilot/resume-copilot/resume-evidence-ranker";
import type {
    RankedResumeEvidence,
    ResumeCopilotIntelligenceContext,
    ResumeCopilotJobSignals,
    ResumeEvidencePoolEntry,
} from "@/lib/career-engine/copilot/resume-copilot/resume-tailoring-evidence-foundation-types";
import type { Capability, CareerGraph, EvidencePiece, Experience } from "@/lib/career-engine/memory/career-graph-loader";

function makeEvidence(input: {
    id: string;
    company: string;
    role: string;
    dateRange: string;
    rawText: string;
    experienceId?: string;
}): EvidencePiece {
    return {
        id: input.id,
        career_id: "career-1",
        experience_id: input.experienceId ?? `exp-${input.id}`,
        company: input.company,
        role: input.role,
        date_range: input.dateRange,
        raw_text: input.rawText,
        source_type: "resume_bullet",
        sort_order: 0,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
    };
}

function makeRanked(input: {
    id: string;
    company: string;
    role: string;
    dateRange: string;
    rawText: string;
    score: number;
    matchedSignals: string[];
    matchedCapabilities: string[];
    experienceOrder?: number;
}): RankedResumeEvidence {
    return {
        evidence: makeEvidence({
            id: input.id,
            company: input.company,
            role: input.role,
            dateRange: input.dateRange,
            rawText: input.rawText,
        }),
        poolSources: ["role_fit.supportingEvidence"],
        matchedSignals: input.matchedSignals,
        experienceOrder: input.experienceOrder ?? 0,
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
            weak_jd_recency_boost: 0,
            weak_jd_seniority_boost: 0,
            weak_jd_impact_boost: 0,
            weak_jd_ownership_boost: 0,
            weak_jd_specificity_boost: 0,
            coverage_novelty_bonus: 0,
            total_score: input.score,
            matched_required_skills: [],
            matched_preferred_skills: [],
            matched_responsibilities: [],
            matched_keywords: [],
            matched_domains: [],
            matched_role_family_terms: [],
            matched_capabilities: input.matchedCapabilities,
        },
    };
}

const selectedEvidence = [
    makeRanked({
        id: "1",
        company: "Optus",
        role: "Head of Analytics",
        dateRange: "2023 - Present",
        rawText: "Led analytics automation and stakeholder advisory for revenue growth.",
        score: 95,
        matchedSignals: ["automation", "revenue", "stakeholder"],
        matchedCapabilities: ["Team Leadership", "Strategic Planning"],
    }),
    makeRanked({
        id: "2",
        company: "Amobee",
        role: "Analytics Product Lead",
        dateRange: "2021 - 2023",
        rawText: "Owned product roadmap for Power BI semantic layer and governance.",
        score: 90,
        matchedSignals: ["roadmap", "power bi", "governance"],
        matchedCapabilities: ["Product Ownership"],
    }),
    makeRanked({
        id: "3",
        company: "Microsoft",
        role: "Office Manager / Junior Data Analyst",
        dateRange: "2013 - 2016",
        rawText: "Prepared weekly reports and admin support.",
        score: 10,
        matchedSignals: ["reporting"],
        matchedCapabilities: [],
    }),
    makeRanked({
        id: "4",
        company: "DNC",
        role: "Analyst",
        dateRange: "2016 - 2018",
        rawText: "Built dashboard updates and reporting packs.",
        score: 12,
        matchedSignals: ["dashboard", "reporting"],
        matchedCapabilities: [],
    }),
];

const selectedInput = selectedEvidence.map((item) => ({
    evidence_piece_id: item.evidence.id,
    company: item.evidence.company,
    role: item.evidence.role,
    date_range: item.evidence.date_range,
    rewritten_bullet: item.evidence.raw_text,
    original_bullet: item.evidence.raw_text,
    score: item.score.total_score,
    matched_signals: item.matchedSignals,
    matched_capabilities: item.score.matched_capabilities,
}));

const direct = buildResumeSummary({
    selectedEvidence: selectedInput,
    matchedCapabilities: ["Team Leadership", "Strategic Planning", "Product Ownership"],
    targetTitle: "Analytics and Program Leader",
    roleFamily: "analytics",
});

assert.ok(/Analytics leader|Commercial analytics leader|Analytics and product leader/i.test(direct.summary ?? ""));
assert.ok(direct.summary?.includes("Optus") || direct.summary?.includes("Amobee"));
assert.ok(!direct.summary?.includes("Microsoft"));
assert.ok(!/Office Manager|Junior Data Analyst/i.test(direct.summary ?? ""));
assert.ok(!/Matched capabilities include|Selected evidence themes/i.test(direct.summary ?? ""));
assert.ok(!/results-driven|proven track record|dynamic professional/i.test(direct.summary ?? ""));
assert.ok((direct.summary?.split(".").filter((part) => part.trim().length > 0).length ?? 0) <= 2);
assert.deepEqual(direct.summary_debug.source_companies, ["Optus", "Amobee"]);
assert.equal(direct.summary_debug.target_title_used, "Analytics and Program Leader");
assert.equal(direct.summary_debug.role_family_used, "analytics");
assert.ok(direct.summary_debug.ranked_experience_order.length >= 2);
assert.equal(direct.summary_debug.ranked_experience_order[0].company, "Optus");
assert.equal(direct.summary_debug.ranked_experience_order[1].company, "Amobee");

const empty = buildResumeSummary({
    selectedEvidence: [],
    matchedCapabilities: [],
    targetTitle: null,
    roleFamily: null,
});
assert.equal(empty.summary, null);

const noTarget = buildResumeSummary({
    selectedEvidence: selectedInput,
    matchedCapabilities: ["Team Leadership"],
    targetTitle: null,
    roleFamily: "analytics",
});
assert.ok(noTarget.summary !== null);
assert.ok(/Analytics|Head of Analytics/i.test(noTarget.summary ?? ""));

const weak = buildResumeSummary({
    selectedEvidence: selectedInput,
    matchedCapabilities: [],
    targetTitle: null,
    roleFamily: null,
});
assert.equal(weak.summary_debug.weak_jd_mode, true);
assert.equal(weak.summary_debug.source_companies.length, 2);
assert.deepEqual(weak.summary_debug.source_companies, ["Optus", "Amobee"]);
assert.ok(!weak.summary?.includes("Microsoft"));
assert.ok(!weak.summary?.includes("DNC"));

const signals: ResumeCopilotJobSignals = {
    job_id: "job-1",
    target_title: "Analytics and Program Leader",
    role_family: "analytics",
    required_skills: ["automation"],
    preferred_skills: [],
    responsibilities: ["stakeholder"],
    domains: [],
    keywords: [],
};

const wrapped = buildGroundedResumeSummary({
    selectedEvidence,
    jobSignals: signals,
});
assert.ok(wrapped.summary !== null);
assert.ok(wrapped.summary_debug.source_companies.includes("Optus"));

// weak-JD ranking regression: senior recent experiences outrank early generic experience
function makeExperience(id: string, sortOrder: number): Experience {
    return {
        id,
        career_id: "career-1",
        company: "Example",
        title: "Role",
        date_range: "2020 - Present",
        location: null,
        summary: null,
        source_type: "resume",
        sort_order: sortOrder,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
    };
}

function makeCapability(id: string, name: string): Capability {
    return {
        id,
        career_id: "career-1",
        name,
        normalized_name: name.toLowerCase(),
        confidence: 1,
        strength: 1,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
    };
}

const expOptus = makeExperience("exp-optus", 0);
const expAmobee = makeExperience("exp-amobee", 1);
const expMs = makeExperience("exp-ms", 2);

const evOptus = makeEvidence({
    id: "ev-optus",
    company: "Optus",
    role: "Head of Analytics",
    dateRange: "2023 - Present",
    rawText: "Led automation strategy and revenue growth transformation.",
    experienceId: expOptus.id,
});
const evAmobee = makeEvidence({
    id: "ev-amobee",
    company: "Amobee",
    role: "Analytics Product Lead",
    dateRange: "2021 - 2023",
    rawText: "Owned product roadmap and stakeholder governance using Power BI semantic layer.",
    experienceId: expAmobee.id,
});
const evMs = makeEvidence({
    id: "ev-ms",
    company: "Microsoft",
    role: "Office Manager / Junior Data Analyst",
    dateRange: "2013 - 2016",
    rawText: "Led data analysis and insights using campaign reporting.",
    experienceId: expMs.id,
});

const capability = makeCapability("cap-1", "Team Leadership");
const careerGraph: CareerGraph = {
    career: {
        id: "career-1",
        user_id: "user-1",
        headline: "Analytics",
        summary: null,
        total_years_experience: 10,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
    },
    experiences: [expOptus, expAmobee, expMs],
    evidencePieces: [evOptus, evAmobee, evMs],
    capabilities: [capability],
    capabilityEvidenceLinks: [],
    evidenceByExperience: {
        [expOptus.id]: [evOptus],
        [expAmobee.id]: [evAmobee],
        [expMs.id]: [evMs],
    },
    capabilitiesByEvidence: {
        [evOptus.id]: [capability],
        [evAmobee.id]: [capability],
        [evMs.id]: [],
    },
    evidenceByCapability: {
        [capability.id]: [evOptus, evAmobee],
    },
};

const intelligence: ResumeCopilotIntelligenceContext = {
    careerGraph,
    careerSignals: {
        topCapabilities: [],
        bestFitRoles: [],
        keyGaps: [],
        evidenceHighlights: [evOptus, evAmobee, evMs],
    },
    roleFit: null,
};

const weakSignalsForRank: ResumeCopilotJobSignals = {
    job_id: "job-weak",
    target_title: null,
    role_family: null,
    required_skills: [],
    preferred_skills: [],
    responsibilities: [],
    domains: [],
    keywords: ["data", "insights", "analysis", "using", "led", "campaign", "marketing"],
};

const pool: ResumeEvidencePoolEntry[] = [
    { evidence: evOptus, poolSources: ["fallback:careerGraph.evidencePieces"] },
    { evidence: evAmobee, poolSources: ["fallback:careerGraph.evidencePieces"] },
    { evidence: evMs, poolSources: ["fallback:careerGraph.evidencePieces"] },
];

const rankedWeak = rankResumeEvidence({
    intelligence,
    evidencePool: pool,
    jobSignals: weakSignalsForRank,
});

assert.ok(rankedWeak.length >= 2);
assert.equal(rankedWeak[0].evidence.company, "Optus");
assert.equal(rankedWeak[1].evidence.company, "Amobee");
assert.notEqual(rankedWeak[0].evidence.company, "Microsoft");

console.log("resume-summary-builder.test passed");
