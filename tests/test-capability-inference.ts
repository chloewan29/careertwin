import { strict as assert } from "node:assert";
import { inferCapabilities, type CapabilityInferenceInput } from "../lib/career-engine/capability/capability-inference";

type TestCase = {
    name: string;
    input: CapabilityInferenceInput;
    expectIncludes: string[];
    expectEmpty?: boolean;
};

const testCases: TestCase[] = [
    {
        name: "calibration_profile_transferable_capabilities",
        input: {
            current_title: "Head of Analytics",
            summary: null,
            experience_entries: [],
            resume_text: [
                "Led and develop high-performing team of 6 analytics professionals with oversight of 22 across business units, fostering commercial thinking and accountability for measurable business impact rather than just delivery",
                "Built analytics capability framework and standards covering insight quality, stakeholder storytelling, and commercial acumen-enabling team to progress from reactive reporting to proactive strategic partnership with senior leaders",
            ].join("\n"),
        },
        expectIncludes: [
            "People Leadership",
            "Commercial Analytics",
        ],
    },
    {
        name: "leadership_and_transformation",
        input: {
            current_title: "Head of Analytics Transformation",
            summary: "Led enterprise-wide transformation and stakeholder strategy across business units.",
            experience_entries: [
                {
                    title: "Analytics Director",
                    company: "Example Corp",
                    description: "Led and developed a high-performing team of 6 and drove cross-functional initiatives.",
                    highlights: [
                        "Built analytics capability framework and standards across BI and reporting.",
                        "Drove change rollout and executive alignment for the target operating model.",
                    ],
                },
            ],
            resume_text: [
                "Managed a team with oversight of 22 across business units.",
                "Built analytics capability framework and standards enabling strategic partnership with senior leaders.",
            ].join("\n"),
        },
        expectIncludes: [
            "People Leadership",
            "Enterprise Transformation",
        ],
    },
    {
        name: "commercial_analytics",
        input: {
            current_title: "Commercial Analytics Manager",
            summary: "Delivered revenue impact through pricing analytics and margin improvement.",
            experience_entries: [
                {
                    title: "Senior Analyst",
                    company: "Growth Co",
                    highlights: [
                        "Built commercial insights for pricing decisions and profitability analysis.",
                        "Defined strategy roadmap and quarterly planning framework.",
                    ],
                },
            ],
            resume_text: "Commercial analytics initiatives improved business impact in key segments.",
        },
        expectIncludes: [
            "Commercial Analytics",
            "Strategic Planning",
        ],
    },
    {
        name: "weak_profile_no_capability_signal",
        input: {
            current_title: "Software Engineer",
            summary: "Developed UI components and fixed defects.",
            experience_entries: [
                {
                    title: "Engineer",
                    company: "Small Startup",
                    highlights: [
                        "Implemented bug fixes in frontend codebase.",
                        "Maintained unit tests and deployment scripts.",
                    ],
                },
            ],
            resume_text: "Worked on tickets, code reviews, and routine maintenance.",
        },
        expectIncludes: [],
        expectEmpty: true,
    },
    {
        name: "structured_evidence_signals_path",
        input: {
            evidence_signals: [
                {
                    id: "sig-1",
                    evidence_piece_id: "ev-1",
                    career_id: "career-1",
                    action: "led",
                    domain: "analytics",
                    initiative_type: "transformation",
                    scope_level: "enterprise",
                    ownership_level: "owner",
                    stakeholder_scope: ["executive", "cross_functional"],
                    tool_signals: ["sql", "power bi"],
                    capability_hints: ["Program Leadership", "Stakeholder Strategy"],
                    team_signal: "team_of_6",
                    impact_signal: "strategic",
                    confidence_score: 0.9,
                },
            ],
        },
        expectIncludes: [
            "Program Leadership",
            "Stakeholder Strategy",
            "BI / Data Platform Transformation",
            "Enterprise Transformation",
        ],
    },
];

for (const testCase of testCases) {
    const result = inferCapabilities(testCase.input);
    console.log(`\n=== ${testCase.name} ===`);
    console.log(JSON.stringify(result, null, 2));

    for (const capability of testCase.expectIncludes) {
        assert.ok(
            result.capabilities.includes(capability),
            `Expected capability "${capability}" in test "${testCase.name}".`
        );
    }

    if (testCase.expectEmpty) {
        assert.equal(result.capabilities.length, 0, `Expected no capabilities for "${testCase.name}".`);
        assert.equal(result.evidence_map.length, 0, `Expected empty evidence_map for "${testCase.name}".`);
    }
}

console.log("\nCapability inference tests passed.");
