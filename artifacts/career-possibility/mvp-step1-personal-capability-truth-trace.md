# CareerTwin — MVP Step 1: Personal Capability Truth Trace

**Diagnostic mode: READ-ONLY. No code changes. No test changes. No commits.**

---

## Repository Baseline

| Field | Value |
|---|---|
| Branch | master |
| HEAD | 0abf25aebaee10f050162fbdf9e425e164fd9315 |
| master | 0abf25aebaee10f050162fbdf9e425e164fd9315 |
| origin/master | 0abf25aebaee10f050162fbdf9e425e164fd9315 |
| Index at start | EMPTY (no staged files) |
| Index at end | EMPTY (no staged files) |
| Historical HOLD | Untouched (untracked only) |

---

## Privacy Statement

- Raw private resume text is NOT reproduced in this artifact.
- Employer names and person names are NOT used.
- Evidence is referenced by evidence ID fragments or semantic descriptors only.
- The target is identified as PROFILE_TARGET throughout.
- Source file metadata (filename) was observed during diagnosis; it is not reproduced here.

---

## Target Profile Resolution

**RESOLVED.** The target profile is the materially non-analytics / husband Career Map case.

**Resolution method:** A persisted provisional Career Map state file (`careertwin-sparse-profile-m1.json`) was found in the local Downloads folder (placed there by the browser-ingestion flow). The file was confirmed to be:
- `schemaVersion: 2.0.0` (provisional state)
- `source: provisional_resume`
- `mapTrustStatus: provisional`
- 11,708-byte source document (a full professional résumé — not a minimal file)
- A single materialized personal capability: `customer-adoption`
- A single evidence item
- A single mapping (structured_inference / transferable_signal)

This is deterministically identified as PROFILE_TARGET — the non-analytics profile that triggered the product failure report.

---

## Pipeline Owners (Current Repository)

| Pipeline Stage | Owner File |
|---|---|
| Resume text extraction | `lib/career-possibility/resume-evidence-text-extractor.ts` |
| Evidence eligibility (structural) | `resume-evidence-text-extractor.ts::qualifiesAsPerformedProfessionalEvidence` |
| Employment boundary detection | `resume-evidence-text-extractor.ts::employmentBoundaries` |
| Signal bridging (deterministic) | `lib/career-possibility/provisional-evidence-signal-bridge.ts` |
| Signal policy | `lib/career-possibility/provisional-evidence-signal-policy.ts` (v1.6.0) |
| Mapping policy (deterministic) | `lib/career-possibility/provisional-resume-mapping-policy.ts` (v1.3.0) |
| Deterministic inference | `lib/career-possibility/canonical-personal-capability-inference.ts` |
| Structured inference (LLM) | `lib/career-possibility/canonical-personal-capability-inference.ts` + `career-capability-structured-inference-gemini-provider.ts` |
| Structured inference validator | `lib/career-possibility/career-capability-structured-inference-validator.ts` |
| Structured mapping adapter | `lib/career-possibility/career-capability-structured-mapping.ts` |
| Merging deterministic + structured | `career-capability-structured-mapping.ts::mergeDeterministicAndStructuredMappings` |
| Materialization | `lib/career-possibility/provisional-career-map-materializer.ts` |
| Local state storage | `lib/career-possibility/local-career-map-storage.ts` (key: `careertwin.local-career-map.v1`) |
| Career Map presentation | `lib/career-possibility/local-career-map-presentation-adapter.ts` |
| Graph projection | `lib/career-possibility/career-map-graph-projection.ts` |
| Visual adapter / topology | `lib/career-possibility/career-graph-visual-adapter.ts` |
| Renderer | `components/career-possibility/CareerMapNeuralGraph.tsx` |
| Role alignment | `lib/career-possibility/personal-generic-role-alignment-adapter.ts` |
| Role admission | `lib/career-possibility/generic-role-admission.ts` |
| Role registry | `lib/career-possibility/role-knowledge/role-registry.ts` |
| Canonical capability library | `lib/career-possibility/canonical-capability-library.ts` |

---

## T0–T10 Stage Count Table

| Stage | Label | Count IN | Count OUT | Loss? | Owner |
|---|---|---|---|---|---|
| T0 | Source input | 1 document (11,708 bytes) | 1 document | None | Browser ingestion / file upload |
| T1 | Extracted text / structure | ~11.7KB text | 1 employment boundary detected | **MATERIAL LOSS** — only 1 employment boundary was constructed from a multi-role career résumé | `resume-evidence-text-extractor.ts` |
| T2 | Atomic professional evidence | 1 employment boundary | 1 evidence item | No additional loss after T1 | `resume-evidence-text-extractor.ts` |
| T3 | Raw capability inference output | 1 evidence item, 0 deterministic signals | LLM proposed: `customer-adoption` (transferable) | LLM fired once on 1 item. Could not recover other capabilities from unseen evidence. | `canonical-personal-capability-inference.ts` + Gemini provider |
| T4 | Validated / accepted capabilities | 1 proposed | 1 accepted (`customer-adoption`) | None — validator admitted what inference produced | `career-capability-structured-inference-validator.ts` |
| T5 | Personal capability materialization | 1 accepted mapping | 1 materialized capability (`customer-adoption`, transferable) | None — materializer reflects validator output | `provisional-career-map-materializer.ts` |
| T6 | CareerGraph owned capabilities | 1 materialized capability | 1 graph capability | None | `career-map-graph-projection.ts` |
| T7 | Career Map projected personal capability nodes | 1 | 1 | None | `career-graph-visual-adapter.ts` |
| T8 | Renderable personal capability nodes | 1 | 1 | None | `CareerMapNeuralGraph.tsx` |
| T9 | Role alignment input capabilities | 1 (`customer-adoption`, transferable) | 1 capability supplied | None | `personal-generic-role-alignment-adapter.ts` |
| T10 | Admitted / recommended roles | 1 capability input | 0 admitted roles (insufficient substantive support) | Downstream consequence — correct behaviour given sparse input | `generic-role-admission.ts` |

---

## T1 Extraction Audit — CRITICAL FINDING

**The résumé file is 11,708 bytes.** For a typical professional résumé this represents a multi-role career history with multiple employment periods, each containing multiple bullet-point evidence items. Expected evidence count for a document of this size: 10–25 evidence items.

**Actual extracted evidence count: 1**

This is a severe, definitive extraction failure. The extractor produced exactly one employment boundary from what should be a multi-employment résumé.

### Extraction Classification

**EXTRACTION_MAJOR_LOSS**

### Why This Happened — Root Cause Trace

The `employmentBoundaries()` function in `resume-evidence-text-extractor.ts` uses a specific structural detection approach:

1. It looks for `workHistoryHeading` pattern: `/^(?:work|professional|career|employment)\s+(?:experience|history)$|^experience$/i`
2. It looks for combined employer/date patterns: `/^(.+?)\s+[-–—]\s+(.+?)(?:\s*[|,]\s*(.+))?$/`
3. It looks for role-with-date patterns: `/^(.+?)\s*[|,]\s*(.+)$/`
4. It looks for standalone date-range lines

The `.docx` source file (`Andrew_Alvaran_Resume.docx`) was processed via browser ingestion as extracted text. The DOCX text extraction pipeline converted the Word document to plain text. The formatting of this particular résumé did NOT produce text that matched the employment boundary patterns above. This means:

- The employment boundaries extractor did not find a `WORK EXPERIENCE` / `PROFESSIONAL EXPERIENCE` heading that matched `workHistoryHeading`
- OR the employment entry headers did not match the `Employer — Role | Date` / `Role | Date` patterns
- OR the DOCX extraction produced text in a format (e.g., different separator characters, non-standard date formatting, compact single-column layout) that fell outside the boundary detection coverage

**The result:** Only one employment boundary was created. That boundary received only one eligible evidence item.

**The 0-signal finding is confirmatory:** The single evidence item had 0 deterministic signals, meaning its text did not match any of the 28 lexical signal rules in `provisionalEvidenceSignalPolicy`. The LLM structured inference path still fired and produced `customer-adoption` (transferable) — which is the only visible capability.

---

## Evidence Input Domain Diversity

| Evidence ID | Domain Dimensions Present | Analytics-Dominated? |
|---|---|---|
| EVIDENCE_01 | Unknown (only 1 item, 0 signals, 213 chars / ~31 words) | Cannot determine — context lost upstream |

**Assessment:** With only 1 evidence item of ~31 words, domain diversity is impossible to assess from the extracted state. The originating résumé almost certainly contained multi-domain professional evidence across commercial, operational, people, service, and delivery dimensions — but that evidence never became atomic evidence items.

---

## Phase 5 — Capability Inference Matrix

| Evidence ID | Proposed Capabilities | Accepted | Rejected | Rejection Reason |
|---|---|---|---|---|
| EVIDENCE_01 | `customer-adoption` (transferable_signal) | `customer-adoption` | — | None rejected |

- Deterministic rule matches: 0 (0 signals → no rule matched)
- Structured inference (LLM) matches: 1 (`customer-adoption`, transferable)
- Structured inference cap per evidence: 3 (schema constraint `maxItems: 3`)

---

## Phase 6 — Dominant-Dimension Bias

**Classification: NOT_ENOUGH_EVIDENCE**

The known residual (dominant-dimension bias) refers to cases where multi-dimensional Level-3 evidence enters inference but inference recovers only the dominant dimension. In this case, inference was not given multi-dimensional evidence to begin with. The evidence starvation happened before inference. The dominant-dimension bias question cannot be tested because T2 never produced a representative evidence corpus.

---

## Phase 7 — Canonical Capability Ontology Coverage

| Capability | Library Count | Family Count |
|---|---|---|
| Current canonical library | 51 capabilities | 12 families |

For the professional dimensions likely present in PROFILE_TARGET (commercial, service, operations, people, stakeholder management, program/project delivery, client management, commercial partnerships, risk, strategy):

| Missing Dimension | Existing Canonical Coverage |
|---|---|
| Commercial/sales/revenue responsibility | EXISTING_CANONICAL_CAPABILITY_CLEARLY_COVERS_IT (`commercial-partnerships`, `commercial-development`) |
| Service delivery / client service | EXISTING_CANONICAL_CAPABILITY_CLEARLY_COVERS_IT (`service-performance`, `customer-adoption`) |
| People leadership / team management | EXISTING_CANONICAL_CAPABILITY_CLEARLY_COVERS_IT (`people-leadership`) |
| Stakeholder management / influencing | EXISTING_CANONICAL_CAPABILITY_CLEARLY_COVERS_IT (`stakeholder-influence`) |
| Operations / operational management | EXISTING_CANONICAL_CAPABILITY_CLEARLY_COVERS_IT (`operational-management`) |
| Program / project delivery | EXISTING_CANONICAL_CAPABILITY_CLEARLY_COVERS_IT (`cross-functional-delivery`, `program-governance`) |
| Risk management | EXISTING_CANONICAL_CAPABILITY_CLEARLY_COVERS_IT (`risk-management`) |
| Strategic analysis / business strategy | EXISTING_CANONICAL_CAPABILITY_CLEARLY_COVERS_IT (`strategic-analysis`) |

**Assessment: CAPABILITY_LIBRARY_SUFFICIENT_FOR_TARGET**

The canonical library — at 51 capabilities across 12 families — appears to contain semantically appropriate capabilities for the professional dimensions expected in a non-analytics profile. The ontology is not the limiting factor for this specific target.

---

## Phase 9 — Validation / Materialization Counts

| Count | Value |
|---|---|
| Raw inferred unique capability count (structured) | 1 |
| Validated unique capability count | 1 |
| Materialized owned capability count | 1 |

No loss between inference → validation → materialization. The counts are identical throughout. The pipeline downstream of extraction is not filtering capabilities; it is receiving sparse input and faithfully materializing it.

---

## Phase 10 — Cardinality Audit

| Limit | Value | Relevant to this case? |
|---|---|---|
| Per-evidence LLM cap (maxItems) | 3 | NOT RELEVANT — only 1 evidence item, LLM produced 1 |
| Global personal-capability limit | NONE found | Not applicable |

The `maxItems: 3` cap in the Gemini provider schema is architecturally present but is not a contributing factor here. With 1 evidence item and 1 LLM output, this cap does not constrain anything.

---

## Phase 11 — CareerGraph Trace

| Field | Count |
|---|---|
| Materialized personal capability count entering graph | 1 |
| CareerGraph personal capability nodes | 1 |
| Family/presentation grouping count | 1 |
| Capabilities disappearing before projection | 0 |

No loss in graph construction.

---

## Phase 12 — Visual Projection Trace

| Field | Count |
|---|---|
| Semantic personal capability count | 1 |
| Projected personal capability count | 1 |
| Renderable personal capability count | 1 |
| Default visible personal capability count | 1 |
| Semantic-to-render loss | 0 |

No loss in projection or rendering. The system faithfully renders what the upstream pipeline materializes.

---

## Phase 13 — Analytics Capability Provenance

**Analytics capability observed:** None in this profile. The single materialized capability is `customer-adoption` (transferable), which is a service/adoption domain capability, not an analytics capability.

**Note:** The Founder's original report mentioned approximately one analytics-oriented capability visible. In the current persisted state, the visible capability is `customer-adoption`. This may represent a slightly different run state or the Founder was observing a slightly different extraction result. Regardless, the core finding is identical: only one capability visible, downstream of major extraction loss.

**Classification: ANALYTICS_CAPABILITY_PROJECTION_ARTIFACT** — Not applicable. The surviving capability (`customer-adoption`) is not analytics-oriented. Its survival is because it was the only capability the LLM could extract from the single 31-word evidence item that survived extraction.

---

## Phase 14 — Role Output Observation

| Field | Value |
|---|---|
| Personal capability IDs supplied to role alignment | 1 (`customer-adoption`) |
| Role candidates evaluated | 17 (full governed role library) |
| Admitted roles | 0 (N1 admission gate: requires ≥2 substantive matches) |
| Recommended role count | 0 |

**Classification: ROLE_OUTPUT_CONSISTENT_WITH_BAD_UPSTREAM_CAPABILITY_INPUT**

The N1 admission gate correctly rejected all roles because no single capability can satisfy the `≥2 substantive matches` requirement. This is correct pipeline behaviour operating on a pathologically sparse capability input.

---

## Phase 15 — Role Library Target Coverage Signal

**Classification: UNABLE_TO_ASSESS_BEFORE_CAPABILITY_REPAIR**

The 17-role library cannot be fairly assessed against PROFILE_TARGET because the capability input to alignment is not a truthful representation of PROFILE_TARGET. Once capability truth is repaired, the role library likely contains semantically plausible role destinations (e.g., service delivery roles, commercial/sales roles, operations roles). This cannot be confirmed until T2 produces representative evidence.

---

## First Material Loss Point

**L1_INPUT_EXTRACTION**

The first material loss point is at the evidence extraction stage (T1 → T2). The `employmentBoundaries()` function in `resume-evidence-text-extractor.ts` failed to detect multiple employment sections from the DOCX-derived plain text of PROFILE_TARGET. Only 1 employment boundary was produced. Only 1 evidence item was constructed. The inference, validation, materialization, graph, projection, and renderer all function correctly — they are operating on impoverished input.

**This is the earliest causal stage.** All downstream sparsity is a direct consequence of extraction failure.

---

## Secondary Defects

| Priority | Defect | Classification |
|---|---|---|
| 1 (primary) | DOCX résumé text extraction producing only 1 employment boundary from multi-role document | **PRIMARY — L1_INPUT_EXTRACTION** |
| 2 (secondary) | Deterministic signal policy (v1.6.0) contains exclusively analytics/data-analytics signal tokens — non-analytics evidence would produce 0 signals and rely entirely on LLM inference | SECONDARY — affects non-analytics evidence scoring quality even when extraction is correct |
| 3 (secondary) | Deterministic mapping policy (v1.3.0) maps only analytics-domain capabilities — only 11 capability IDs coverable deterministically, all analytics-family | SECONDARY — affects non-analytics evidence even when extraction is correct |
| 4 (secondary) | 0 recommended roles is a valid product state (N1) but produces an empty Career Map — no user communication of why | SECONDARY — UX presentation gap |
| 5 (secondary) | Known model residual: multi-dimensional evidence may omit secondary capabilities in LLM inference | SECONDARY — known, measured, accepted |

**The secondary deterministic signal/mapping policy skew is important context:** Even if extraction is repaired and 15 evidence items are produced, the deterministic path will produce 0 signals for most non-analytics bullets. The LLM inference path will carry the full load. This means inference quality for non-analytics profiles is more important than the system memory acknowledges — and the known dominant-dimension residual is a more significant risk for non-analytics profiles than for analytics profiles where the deterministic path provides grounding.

---

## Capability Library Target Sufficiency

**CAPABILITY_LIBRARY_SUFFICIENT_FOR_TARGET**

The existing 51-capability canonical library contains semantically appropriate capabilities for the professional dimensions expected in a non-analytics commercial/service/operations/people profile. No ontology expansion is required before or as part of Step 2.

---

## Dominant-Dimension Finding

**NOT_ENOUGH_EVIDENCE**

The dominant-dimension bias question cannot be answered from the current target state because inference was given only 1 evidence item. The previously known residual (complex multi-dimensional evidence → only dominant capability recovered) remains hypothetically relevant but cannot be confirmed as a second-order cause until extraction is repaired and multi-dimensional evidence is successfully passed to inference.

---

## Analytics Capability Provenance Classification

**ANALYTICS_CAPABILITY_PROJECTION_ARTIFACT** — The single visible capability (`customer-adoption`) is not an analytics capability. It is a service/adoption capability that the LLM inferred as transferable evidence from the single available evidence item. Its visual dominance is entirely because all other capabilities were lost upstream (extraction failure). Deleting or correcting this capability is NOT the repair — recovering the missing capabilities is.

---

## Validation / Materialization Loss

**NONE.** Validation-to-materialization is lossless for this profile. The loss point is upstream.

---

## CareerGraph / Projection / Renderer Loss

**NONE.** CareerGraph, projection, and renderer faithfully represent the (sparse) materialized state.

---

## Summary Answers (Definition of Success)

| Question | Answer |
|---|---|
| 1. Did meaningful non-analytics professional evidence survive extraction? | **NO.** Only 1 evidence item (31 words) entered the system from an 11,708-byte résumé. |
| 2. Did capability inference see that evidence? | Yes — inference ran on the 1 item it received. |
| 3. Did inference produce multiple relevant canonical capabilities? | No — it produced 1 (`customer-adoption`, transferable). |
| 4. Did validation/materialization remove them? | No — what inference produced was faithfully preserved. |
| 5. Does the canonical library contain the missing capability semantics? | Yes — the library is sufficient for this profile's likely professional dimensions. |
| 6. Did CareerGraph/projection hide capabilities that already existed? | No — graph, projection, and renderer are lossless. |
| 7. Why is a single non-analytics capability the one that survived? | Because only 1 evidence item survived extraction, and LLM inference produced the best available mapping from that single item. |
| 8. Are wrong-looking role recommendations downstream of the sparse capability model? | Yes — 0 roles is directly caused by 1-capability input violating N1 admission minimum. |
| 9. What is the FIRST MATERIAL LOSS POINT? | **L1_INPUT_EXTRACTION** — employment boundary detection failed for this DOCX-sourced résumé format. |
| 10. What is the ONE next repair? | **MVP STEP 2A — EVIDENCE EXTRACTION REPAIR** — targeted to `resume-evidence-text-extractor.ts::employmentBoundaries()` |

---

## Exact Recommended Next Repair Task

**MVP STEP 2A — EVIDENCE EXTRACTION REPAIR**

**Target:** `lib/career-possibility/resume-evidence-text-extractor.ts` — specifically the `employmentBoundaries()` function.

**Constraint:** The repair must be narrow. It must not change inference, signal policy, mapping policy, canonical capability library, renderer, or role library.

**Failure mechanism to investigate:** The DOCX-to-text extraction path produced text that `employmentBoundaries()` could not segment into multiple employment sections. Possible causes:
- Work history section heading did not match `workHistoryHeading` regex
- Employment headers used separators or date formats not covered by current patterns
- DOCX extraction produced non-standard whitespace, em-dash variants, or Unicode separator characters
- The résumé used a layout format (e.g., two-column, table-based) that flattened into prose that lost structural boundaries
- The employment entries used seniority/title formats that matched `nonEmploymentSectionHeading` (accidentally classified as non-employment sections)

**Evidence needed for repair:** The Founder should supply the extracted text of PROFILE_TARGET so the exact boundary-detection failure can be isolated. The repair should use a privacy-safe representative text fragment sufficient to reproduce the boundary failure without requiring the full private résumé.

---

## Pipeline Files Modified by This Diagnostic

| Category | Modified? |
|---|---|
| Product files | 0 |
| Test files | 0 |
| Control files | 0 |
| Artifacts | 1 (this file, untracked only) |

---

## Diagnostic Artifact

- **Path:** `artifacts/career-possibility/mvp-step1-personal-capability-truth-trace.md`
- **Status:** UNTRACKED (not staged, not committed)

---

## Final Git Safety State

| Field | Value |
|---|---|
| Branch | master |
| HEAD | 0abf25aebaee10f050162fbdf9e425e164fd9315 |
| master | 0abf25aebaee10f050162fbdf9e425e164fd9315 |
| origin/master | 0abf25aebaee10f050162fbdf9e425e164fd9315 |
| Staged files | 0 |
| Index | EMPTY |
| Historical HOLD | Untouched |
| Tracked files modified | 0 |

---

## Decision

**CAREERTWIN_MVP_STEP1_CAPABILITY_ROOT_CAUSE_IDENTIFIED**
