import { strict as assert } from "node:assert";
import { extractEvidenceSignalsFromPiece } from "../lib/career-engine/evidence/evidence-signals";

{
    const signals = extractEvidenceSignalsFromPiece({
        id: "ev-1",
        career_id: "career-1",
        raw_text: "Led cross-functional analytics roadmap and presented business cases to executives, securing approval.",
    });
    assert.ok(signals.length >= 2, "Expected multi-signal extraction for mixed leadership/stakeholder text.");
    assert.ok(signals.some((s) => s.action === "led"), "Expected normalized action 'led'.");
    assert.ok(signals.some((s) => s.action === "presented" || s.action === "secured approval"), "Expected stakeholder action normalization.");
    assert.ok(signals.some((s) => s.ownership_level === "lead" || s.ownership_level === "driver" || s.ownership_level === "owner"));
}

{
    const signals = extractEvidenceSignalsFromPiece({
        id: "ev-2",
        career_id: "career-1",
        raw_text: "Built dashboards in SQL and Python for monthly performance reporting.",
    });
    const tools = Array.from(new Set(signals.flatMap((s) => s.tool_signals)));
    assert.ok(tools.includes("sql"));
    assert.ok(tools.includes("python"));
}

{
    const signals = extractEvidenceSignalsFromPiece({
        id: "ev-3",
        career_id: "career-1",
        raw_text: "Improved reporting rhythm for regional teams.",
    });
    const tools = Array.from(new Set(signals.flatMap((s) => s.tool_signals)));
    assert.ok(!tools.includes("r"), "Should not infer R tool from incidental letters.");
}

console.log("evidence-signals.test passed");
