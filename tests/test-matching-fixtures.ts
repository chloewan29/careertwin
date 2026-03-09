import assert from "node:assert/strict";
import { parseJobDescription } from "../lib/career-engine/parsing/jd-parser";
import { matchRoles, type ProfileInput } from "../lib/career-engine/matching/role-matcher";
import { prioritizeGaps } from "../lib/career-engine/scoring/gap-prioritizer";
import { calculateCareerTwinScore } from "../lib/career-engine/scoring/career-twin-score";

type Scenario = {
    id: string;
    title: string;
    profile: ProfileInput;
    jobDescription: string;
    expected: {
        scoreRange: [number, number];
        minMatched: number;
        minPartial?: number;
        minEvidenceGaps?: number;
        minTrueGaps?: number;
        maxCriticalGaps?: number;
        hardFilter?: "pass" | "soft_fail" | "fail";
    };
};

const scenarios: Scenario[] = [
    {
        id: "scenario-1-strong-fit",
        title: "Strong direct fit: same role family with strong evidence",
        profile: {
            current_title: "Senior Product Manager",
            years_experience: 8,
            skills: ["SQL", "Leadership", "Communication", "Stakeholder Management", "Project Management"],
            resume_text: [
                "Managed a team of 6 product specialists and owned roadmap outcomes.",
                "Led delivery across cross-functional partnership with engineering and design.",
                "Stakeholder management and presentation cadence with executive leadership.",
                "Storytelling in workshops and team enablement for strategic priorities.",
            ].join("\n"),
        },
        jobDescription: [
            "Senior Product Manager",
            "Required Skills:",
            "- SQL",
            "- Leadership",
            "- Communication",
            "- Stakeholder Management",
            "- Project Management",
            "Minimum 7 years of experience",
        ].join("\n"),
        expected: {
            scoreRange: [80, 100],
            minMatched: 4,
            maxCriticalGaps: 0,
            hardFilter: "pass",
        },
    },
    {
        id: "scenario-2-transferable-evidence-gaps",
        title: "Transferable profile with evidence gaps",
        profile: {
            current_title: "Program Manager",
            years_experience: 5,
            skills: ["SQL"],
            resume_text: [
                "Provided communication updates across projects and teams weekly.",
                "Demonstrated leadership potential during coordination tasks.",
            ].join("\n"),
        },
        jobDescription: [
            "Product Manager",
            "Required Skills:",
            "- SQL",
            "- Leadership",
            "- Communication",
            "- Stakeholder Management",
            "Minimum 6 years of experience",
        ].join("\n"),
        expected: {
            scoreRange: [40, 75],
            minMatched: 1,
            minEvidenceGaps: 2,
            minTrueGaps: 1,
        },
    },
    {
        id: "scenario-3-clear-mismatch",
        title: "Role family mismatch with true capability gaps",
        profile: {
            current_title: "Software Engineer",
            years_experience: 2,
            skills: ["TypeScript", "React", "Node.js"],
            resume_text: "Built frontend features and API endpoints.",
        },
        jobDescription: [
            "Marketing Manager",
            "Required Skills:",
            "- Google Ads",
            "- SEO",
            "- Leadership",
            "- Communication",
            "Minimum 6 years of experience",
        ].join("\n"),
        expected: {
            scoreRange: [0, 45],
            minMatched: 0,
            minTrueGaps: 3,
            minEvidenceGaps: 0,
            hardFilter: "fail",
        },
    },
];

function runScenario(scenario: Scenario): void {
    const jd = parseJobDescription(scenario.jobDescription);
    const match = matchRoles(scenario.profile, jd);
    const gaps = prioritizeGaps(scenario.profile, jd, match);
    const score = calculateCareerTwinScore(scenario.profile, match, gaps);

    const classifications = match.gap_classification ?? [];
    const matched = classifications.filter(c => c.status === "matched");
    const partial = classifications.filter(c => c.status === "partial");
    const evidence = classifications.filter(c => c.status === "evidence_gap");
    const truth = classifications.filter(c => c.status === "true_gap");

    assert.ok(
        score.career_twin_score >= scenario.expected.scoreRange[0]
        && score.career_twin_score <= scenario.expected.scoreRange[1],
        `${scenario.id}: score ${score.career_twin_score} not in expected range ${scenario.expected.scoreRange.join("-")}`
    );

    assert.ok(
        matched.length >= scenario.expected.minMatched,
        `${scenario.id}: expected at least ${scenario.expected.minMatched} matched, got ${matched.length}`
    );

    if (typeof scenario.expected.minPartial === "number") {
        assert.ok(
            partial.length >= scenario.expected.minPartial,
            `${scenario.id}: expected at least ${scenario.expected.minPartial} partial, got ${partial.length}`
        );
    }

    if (typeof scenario.expected.minEvidenceGaps === "number") {
        assert.ok(
            evidence.length >= scenario.expected.minEvidenceGaps,
            `${scenario.id}: expected at least ${scenario.expected.minEvidenceGaps} evidence gaps, got ${evidence.length}`
        );
    }

    if (typeof scenario.expected.minTrueGaps === "number") {
        assert.ok(
            truth.length >= scenario.expected.minTrueGaps,
            `${scenario.id}: expected at least ${scenario.expected.minTrueGaps} true gaps, got ${truth.length}`
        );
    }

    if (typeof scenario.expected.maxCriticalGaps === "number") {
        assert.ok(
            gaps.critical_gaps.length <= scenario.expected.maxCriticalGaps,
            `${scenario.id}: expected <= ${scenario.expected.maxCriticalGaps} critical gaps, got ${gaps.critical_gaps.length}`
        );
    }

    if (scenario.expected.hardFilter) {
        assert.equal(
            match.hard_filter_result,
            scenario.expected.hardFilter,
            `${scenario.id}: expected hard_filter_result=${scenario.expected.hardFilter}, got ${match.hard_filter_result}`
        );
    }

    console.log(`\n[${scenario.id}] ${scenario.title}`);
    console.log("Input profile:", scenario.profile);
    console.log("Input JD text:", scenario.jobDescription);
    console.log("Expected gap pattern:", {
        minMatched: scenario.expected.minMatched,
        minPartial: scenario.expected.minPartial ?? 0,
        minEvidenceGaps: scenario.expected.minEvidenceGaps ?? 0,
        minTrueGaps: scenario.expected.minTrueGaps ?? 0,
        hardFilter: scenario.expected.hardFilter ?? "n/a",
    });
    console.log("Expected score range:", scenario.expected.scoreRange);
    console.log("Actual:", {
        score: score.career_twin_score,
        hard_filter_result: match.hard_filter_result,
        classifications: {
            matched: matched.map(x => x.skill),
            partial: partial.map(x => x.skill),
            evidence_gap: evidence.map(x => x.skill),
            true_gap: truth.map(x => x.skill),
        },
        gaps: {
            priority_gaps: gaps.priority_gaps.map(g => g.label),
            critical_gaps: gaps.critical_gaps.map(g => g.label),
            evidence_gaps: gaps.evidence_gaps.map(g => g.label),
        },
    });
}

for (const scenario of scenarios) {
    runScenario(scenario);
}

console.log("\nAll matching fixtures passed.");
