import { strict as assert } from "node:assert";
import {
    compactToBulletLength,
    cueTokenMatchCount,
    normalizeText,
    normalizeWhitespace,
    sanitizePotentialJdLeak,
    sentenceCase,
    toCueTokens,
} from "@/lib/career-engine/copilot/resume-copilot/resume-rewriter-helpers";

assert.equal(normalizeWhitespace("  Lead   cross-functional\tplanning \n across teams  "), "Lead cross-functional planning across teams");
assert.equal(normalizeText("  Senior Analytics Lead  "), "senior analytics lead");
assert.deepEqual(toCueTokens("Customer AI strategy and BI"), ["customer", "strategy", "and"]);
assert.equal(cueTokenMatchCount("Built measurement strategy for revenue growth", ["measurement", "growth", "ai"]), 2);
assert.equal(
    sanitizePotentialJdLeak("Built executive dashboards for finance leaders. About the job This should be removed"),
    "Built executive dashboards for finance leaders.",
);
assert.equal(sentenceCase("delivered forecasting improvements"), "Delivered forecasting improvements.");

const compacted = compactToBulletLength(
    "Delivered cross-functional forecasting and reporting improvements through",
    { maxChars: 80, maxWords: 6 },
);
assert.ok(!/\bthrough\.?$/i.test(compacted));

console.log("resume-rewriter-helpers.test passed");
