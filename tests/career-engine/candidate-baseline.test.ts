import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCandidateCapabilityBaseline, CAPABILITY_STRENGTH_WEIGHTS, type CandidateCapabilityBaselineInput } from "../../lib/career-engine/capability/candidate-baseline";

const input: CandidateCapabilityBaselineInput = {
  careerId: "career-1", currentYear: 2026, topSignalsLimit: 3,
  capabilities: [
    { id: "cap-strong", career_id: "career-1", name: "Strong", canonical_name: "strong capability", display_name: "Strong Capability", confidence_score: 0.7, confidence: null },
    { id: "cap-missing", career_id: "career-1", name: "Missing", canonical_name: null, display_name: null, confidence_score: null, confidence: null },
    { id: "cap-orphan", career_id: "career-1", name: "Orphan", canonical_name: "orphan", display_name: "Orphan", confidence_score: null, confidence: null },
  ],
  capabilitySignalLinks: [
    { capability_id: "cap-strong", evidence_signal_id: "signal-owner", contribution_weight: 0.6 },
    { capability_id: "cap-strong", evidence_signal_id: "signal-missing", contribution_weight: null },
    { capability_id: "cap-orphan", evidence_signal_id: "does-not-exist", contribution_weight: 1 },
  ],
  evidenceSignals: [
    { id: "signal-owner", evidence_piece_id: "piece-owner", action: "owned", domain: "commercial", initiative_type: "delivery", scope_level: "enterprise", ownership_level: "owner", stakeholder_scope: ["executive"], tool_signals: [], impact_signal: "revenue", confidence_score: 0.8 },
    { id: "signal-missing", evidence_piece_id: "piece-without-experience", action: null, domain: null, initiative_type: null, scope_level: null, ownership_level: null, stakeholder_scope: [], tool_signals: [], impact_signal: null, confidence_score: null },
    { id: "unlinked", evidence_piece_id: "missing-piece", action: null, domain: null, initiative_type: null, scope_level: null, ownership_level: null, stakeholder_scope: [], tool_signals: [], impact_signal: null, confidence_score: null },
  ],
  evidencePieces: [
    { id: "piece-owner", experience_id: "experience-current", raw_text: "Owned enterprise revenue outcomes." },
    { id: "piece-without-experience", experience_id: "missing-experience", raw_text: "" },
  ],
  experiences: [{ id: "experience-current", date_range: "2024 - Present", sort_order: 0 }],
};

const before = JSON.stringify(input);
const first = buildCandidateCapabilityBaseline(input);
const second = buildCandidateCapabilityBaseline(input);
assert.deepEqual(second, first, "same caller-supplied input must be deterministic");
assert.equal(JSON.stringify(input), before, "caller input must not be mutated");
assert.deepEqual(first.map((item) => item.capability_id), ["cap-strong", "inferred:career-1:cross-functional stakeholder leadership", "cap-missing", "cap-orphan"]);

const strong = first[0];
const confidenceModifier = 0.9 + (((0.8 + 0.6 + 0.7) / 3) * 0.2);
const ownerRaw = 1.25 * 1.25 * 1.2 * 1 * confidenceModifier;
const missingRaw = CAPABILITY_STRENGTH_WEIGHTS.ownership.unknown * CAPABILITY_STRENGTH_WEIGHTS.scope.unknown * CAPABILITY_STRENGTH_WEIGHTS.impact.unknown * CAPABILITY_STRENGTH_WEIGHTS.recency.unknown * (0.9 + (0.7 * 0.2));
const weighted = ownerRaw + (missingRaw / 1.15);
const round = (value: number) => Math.round(value * 10000) / 10000;
assert.equal(strong.weighted_signal_score, round(weighted));
assert.equal(strong.strength_score, round(1 - Math.exp(-(weighted / 6))));
assert.equal(strong.signal_count, 2);
assert.equal(strong.top_supporting_signals[0].evidence_piece_id, "piece-owner");
assert.equal(strong.top_supporting_signals[0].raw_signal_strength, round(ownerRaw));
assert.equal(strong.top_supporting_signals[0].contribution_score, round(ownerRaw));
assert.equal(strong.top_supporting_signals[0].ownership_level, "owner");
assert.equal(strong.top_supporting_signals[0].scope_level, "enterprise");
assert.equal(strong.top_supporting_signals[0].impact_signal, "revenue");
assert.equal(strong.top_supporting_signals[0].confidence_score, 0.8);
assert.equal(strong.top_supporting_signals[0].link_contribution_weight, 0.6);
assert.equal(strong.top_supporting_signals[1].evidence_raw_text, "");
assert.equal(first[1].canonical_name, "cross-functional stakeholder leadership", "existing targeted latent calibration remains active");
assert.equal(first[2].canonical_name, "missing");
assert.equal(first[2].display_name, "Missing");
assert.equal(first[2].strength_score, 0);
assert.equal(first[3].signal_count, 0, "orphaned links remain ignored while the capability remains present");

assert.equal(Object.isFrozen(first), true);
for (const item of first) {
  assert.equal(Object.isFrozen(item), true);
  assert.equal(Object.isFrozen(item.top_supporting_signals), true);
  item.top_supporting_signals.forEach((signal) => assert.equal(Object.isFrozen(signal), true));
}
assert.deepEqual(JSON.parse(JSON.stringify(first)), first);

const tied = buildCandidateCapabilityBaseline({ ...input, capabilities: [input.capabilities[2], input.capabilities[1]], capabilitySignalLinks: [], evidenceSignals: [] });
assert.deepEqual(tied.map((item) => item.capability_id), ["cap-orphan", "cap-missing"], "complete ties preserve caller order through stable sorting");

const kernelSource = readFileSync("lib/career-engine/capability/candidate-baseline.ts", "utf8");
assert.equal(/supabase|createServerSupabaseClient|jobDescription|requirementCluster|roleProfile/.test(kernelSource), false);
const wrapperSource = readFileSync("lib/career-engine/capability/capability-strength.ts", "utf8");
assert.match(wrapperSource, /return buildCandidateCapabilityBaseline\(/);
assert.match(wrapperSource, /currentYear: new Date\(\)\.getUTCFullYear\(\)/);
console.log("candidate baseline kernel tests passed");
