import { strict as assert } from "node:assert";
import { buildEvidencePieces } from "@/lib/career-engine/evidence/evidence-pieces";
import type { ParsedResume } from "@/lib/career-engine/parsing/resume-parser";

function makeParsedResume(overrides: Partial<ParsedResume>): ParsedResume {
    return {
        full_name: null,
        current_title: null,
        years_experience: null,
        industry: null,
        skills: [],
        capabilities: [],
        companies: [],
        education: [],
        summary: null,
        experience_entries: [],
        contact: {
            email: null,
            phone: null,
            linkedin: null,
            address: null,
        },
        parse_quality: "medium",
        missing_fields: [],
        ...overrides,
    };
}

{
    const parsed = makeParsedResume({
        experience_entries: [
            {
                title: "Program Manager",
                company: "Acme",
                date_range: "2023 - Present",
                description: "Ignored when highlights exist.",
                highlights: [
                    "Led cross-functional roadmap across 4 squads.",
                    "Reduced release cycle time by 25%.",
                ],
                confidence: { title: 1, company: 1, date: 1, overall: 1 },
            },
        ],
    });
    const pieces = buildEvidencePieces(parsed);
    assert.equal(pieces.length, 2);
    assert.equal(pieces[0].source, "highlight");
    assert.equal(pieces[1].source, "highlight");
    assert.equal(pieces[0].raw_text, "Led cross-functional roadmap across 4 squads.");
}

{
    const parsed = makeParsedResume({
        experience_entries: [
            {
                title: "Analytics Lead",
                company: "Acme",
                date_range: "2021 - 2023",
                description: [
                    "Strategic Market Insights: Led scaled insights projects across digital marketing investments.",
                    "Product Ownership & Roadmap: Owned end-to-end lifecycle for analytics products and set delivery milestones.",
                    "Award-Winning Innovation: Established experimentation playbooks to improve release confidence.",
                ].join(" "),
                highlights: [],
                confidence: { title: 1, company: 1, date: 1, overall: 1 },
            },
        ],
    });
    const pieces = buildEvidencePieces(parsed);
    assert.ok(pieces.length >= 3, "Expected long description to split into multiple evidence pieces");
    assert.ok(pieces.every((piece) => piece.source === "description_fallback"));
    assert.ok(
        pieces.every((piece) => !/^(accomplishments?|responsibilities|highlights?|strategic market insights|product ownership & roadmap|award-winning innovation)\s*:/i.test(piece.raw_text)),
    );
    assert.ok(pieces.every((piece) => piece.raw_text.length <= 280));
}

{
    const parsed = makeParsedResume({
        experience_entries: [
            {
                title: "Data Specialist",
                company: "Acme",
                date_range: "2019 - 2021",
                description: "Analytics & Reporting: Generated and analyzed data reports for weekly executive readouts Conducted pipeline analysis to identify conversion drop-offs Presented optimization plans to stakeholders.",
                highlights: [],
                confidence: { title: 1, company: 1, date: 1, overall: 1 },
            },
        ],
    });
    const pieces = buildEvidencePieces(parsed);
    assert.ok(pieces.length >= 3, "Expected action-verb transitions to split chained achievements");
    assert.ok(pieces.some((piece) => /^Generated/i.test(piece.raw_text)));
    assert.ok(pieces.some((piece) => /^Conducted/i.test(piece.raw_text)));
    assert.ok(pieces.some((piece) => /^Presented/i.test(piece.raw_text)));
}

{
    const parsed = makeParsedResume({
        experience_entries: [
            {
                title: "Coordinator",
                company: "Acme",
                date_range: "2020 - 2021",
                description: "Supported daily reporting.",
                highlights: [],
                confidence: { title: 1, company: 1, date: 1, overall: 1 },
            },
        ],
    });
    const pieces = buildEvidencePieces(parsed);
    assert.equal(pieces.length, 1);
    assert.equal(pieces[0].source, "description_fallback");
    assert.equal(pieces[0].raw_text, "Supported daily reporting.");
}

console.log("evidence-pieces.test passed");
