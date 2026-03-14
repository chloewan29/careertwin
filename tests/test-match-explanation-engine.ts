import { strict as assert } from "node:assert";
import { buildMatchExplanation } from "../lib/career-engine/job-copilot/match-explanation-engine";

function wordCount(value: string): number {
    return value.trim().split(/\s+/).filter(Boolean).length;
}

{
    const explanation = buildMatchExplanation({
        matchScore: 78,
        fitLevel: "strong",
        topMatchedCapabilities: [
            "Experimentation & measurement",
            "Stakeholder insight translation",
            "Data-driven strategy",
            "Communication",
        ],
        keyGaps: [
            "Product analytics exposure",
        ],
        atsRisks: [
            {
                type: "title_mismatch",
                level: "medium",
                message: "Role title alignment is less explicit in current experience wording.",
                reasoning: "Role expects product analytics framing that is less visible in recent title signals.",
            },
        ],
        evidenceHighlights: [
            {
                evidencePieceId: "ev-1",
                label: "Led campaign experimentation and performance reporting for growth initiatives",
                score: 32,
            },
            {
                evidencePieceId: "ev-2",
                label: "Presented monthly analytics insights to cross-functional business stakeholders",
                score: 29,
            },
        ],
        jobProfileQuality: "usable",
        scoreConfidence: "high",
        interpretationNote: "Strong fit with high confidence from current extracted job signals.",
        jdTitle: "Senior Marketing Analytics Manager",
        jdRoleFamily: "Marketing Analytics",
        requiredSkills: ["Experimentation", "Performance measurement", "Stakeholder communication"],
        responsibilities: ["Translate insights into strategy and optimization plans"],
    });

    assert.equal(explanation.verdict_label, "Strong Match");
    assert.equal(explanation.score, 78);
    assert.ok(explanation.summary.length > 0);
    assert.ok(explanation.strengths.length <= 3);
    assert.ok(explanation.risks.length <= 2);
    assert.ok(explanation.strengths.some((item) => item.title === "Experimentation & measurement"));
    assert.ok(explanation.risks.some((item) => item.title === "Product analytics exposure"));
    assert.ok(explanation.strengths.every((item) => wordCount(item.explanation) <= 20), "Strength explanations must be concise.");
    assert.ok(
        new Set(explanation.strengths.map((item) => item.explanation)).size >= Math.min(2, explanation.strengths.length),
        "Strength explanations should not collapse into identical templates.",
    );
    assert.ok(
        explanation.strengths.some((item) => item.explanation.toLowerCase().includes("marketing measurement")),
        "Expected role-aware job theme phrase in at least one strength explanation.",
    );
}

{
    const explanation = buildMatchExplanation({
        matchScore: 44,
        fitLevel: "stretch",
        topMatchedCapabilities: ["Communication"],
        keyGaps: [],
        atsRisks: [],
        evidenceHighlights: [],
        jobProfileQuality: "sparse",
        scoreConfidence: "low",
        interpretationNote: "Limited-signal interpretation: job extraction is sparse and likely incomplete.",
        jdTitle: "Program Analyst",
        jdRoleFamily: null,
        requiredSkills: [],
        responsibilities: [],
    });

    assert.equal(explanation.verdict_label, "Stretch");
    assert.ok(explanation.summary.length > 0);
    assert.ok(explanation.strengths.length <= 3);
    assert.ok(explanation.risks.length <= 2);
    assert.ok(explanation.risks.some((item) => item.title === "Signal confidence"));
    assert.ok(explanation.strengths.every((item) => wordCount(item.explanation) <= 20));
}

console.log("match-explanation-engine.test passed");
