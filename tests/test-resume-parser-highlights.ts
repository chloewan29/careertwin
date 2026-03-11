import { strict as assert } from "node:assert";
import { parseResumeText } from "@/lib/career-engine/parsing/resume-parser";

const rawText = `
PROFESSIONAL EXPERIENCE

Analytics Lead/Manager, Data & Analytics
Optus (Telecommunications & Streaming Media), Sydney | May 2022 - February 2026
Streaming & Media Revenue Analytics:
Identified $25M+ revenue growth opportunities across streaming portfolio
Led analytics team supporting strategic retail decisions
AI-Powered Analytics Innovation:
Pioneered AI-powered analytics automation for executive insights
Developed automated weekly narrative insights delivered to executives
Internal Consulting & Strategic Advisory:
Presented business cases to senior leadership and secured approval
Team Leadership & Capability Building:
Lead team of 6 analytics professionals and uplifted capability
Enterprise Data & Analytics Transformation:
Led enterprise-wide Power BI transformation and stakeholder interviews
Additional Achievements:
Generated measurable impact across revenue and operations
`;

const parsed = parseResumeText(rawText);
assert.equal(parsed.experience_entries.length, 1);

const entry = parsed.experience_entries[0];
assert.ok((entry.highlights ?? []).length >= 8, `Expected >=8 highlights, got ${(entry.highlights ?? []).length}`);
assert.ok(entry.highlights.some((h) => /^Identified/i.test(h)));
assert.ok(entry.highlights.some((h) => /^Led/i.test(h)));
assert.ok(entry.highlights.some((h) => /^Pioneered/i.test(h)));
assert.ok(entry.highlights.some((h) => /^Presented/i.test(h)));
assert.ok(entry.highlights.some((h) => /^Generated/i.test(h)));

console.log("test-resume-parser-highlights passed");
