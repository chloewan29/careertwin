# Post-MVP Task F.14 - Bounded Multi-Mechanism Architecture Review

## Decision

- Repository decision: `POST_MVP_TASK_F14_NO_BOUNDED_ARCHITECTURE_SUFFICIENT`.
- Primary architecture finding: `NO_BOUNDED_ARCHITECTURE_SUFFICIENT`.
- Recommended next repair: `FURTHER_MECHANISM_WORK_REQUIRED`.
- Management label: `MEASURE`.
- This review found useful evidence for fixed two-way evidence partitioning as a cross-evidence mitigation, but no tested bounded architecture addresses both cross-evidence context competition and full-canonical competition. No production implementation is admitted here.

## EM decision contract

- Current task type: bounded Layer 1 architecture review and measurement.
- Current MODE: `MEASURE / BOUNDED ARCHITECTURE REVIEW`.
- Failing layer: Layer 1, structured semantic inference selection.
- Why: the first observed drift is already present in raw provider selections; downstream validation and materialization preserve the received mappings, while F.13 isolated cross-evidence competition, full-canonical competition, and one pairwise-comprehension residual.
- First drift point: raw provider output omits materially supported secondary capability IDs.
- First writable fault: none admitted by F.14. P2 identifies a possible future batching correction surface, but the full-canonical mechanism has no sufficiently supported writable repair yet.
- In-scope correction area: temporary evidence partitioning and deterministic canonical-neighbour verification probes.
- Out of scope: canonical contracts, benchmark, prompt repair, behavior decomposition, validator, final schema, max-3, model, temperature, retry/voting, materializer, projections, UI, Founder holdout, control closure, and Task E.
- Allowed files: one untracked F.14 artifact plus isolated temporary harness/output files.
- Proportional verification: authority/hash preflight; static production-cardinality and distinction-graph audit; one P2 benchmark measurement; one P3 benchmark measurement; R2/R3 only if their specified gates pass; final repository safety audit.
- Single main next action: `FURTHER_MECHANISM_WORK_REQUIRED` - admit a separately bounded review of a deterministic candidate mechanism that can actually reach the two full-canonical-competition targets before any production implementation.

## Authority, isolation, and fixed inputs

- Committed base, primary HEAD, and `origin/master`: `d797941bf63f1ab43670be4a86fe0712564fdf5c`.
- Primary index at preflight: empty. The intentional 59-entry HOLD worktree was preserved.
- Frozen F.11 provider SHA256: `F50764218E50C3FACB31D4BE9854B83DEC2DBE9C6021340EEB7D2E5D0DFF5212`.
- Frozen F.11 provider-test SHA256: `45FAA40DBC20158232227444B1B12B4558C8297538481857D1DDD81382236F65`.
- Frozen F.11 integration-test SHA256: `B039F5821F0391FC36DFC0A94B245EF4ED44FA4011325DF0F73CD94A72D9328D`.
- Combined F.11 binary diff SHA256: `B50EDF7BA0523AEFAC5C2770E69F46C72DF3A0366C4C4ABEACE8C154CE900B2E`.
- Benchmark: `structured-inference-coverage-benchmark/2.1.0`, SHA256 `B4BC948CABB7D37C032CF3080056C804872B7F523315FB1B36A4EC76F083A55A`; REQUIRED 42, allowed optional 26, forbidden 89.
- F.13 artifact SHA256: `4352ADF82F71B000952AC94F8BA2033F8D5500ACAEDF4237E37AE8AAFF167005`.
- F.13.1 artifact SHA256: `9D1D6F53C5C65B114CDED660A23090B83AAE97DCE913886CCFA7BEEF52541F51`.
- Canonical authority: content version `1.3.0`, SHA256 `8CD78709F3EE95BE6DE8D62E1748B0E112AAE421C83385D0BC63F03CD9097422`; 51 capabilities, 12 families, 51/51 semantic contracts, 104 directed distinctions.
- Evaluation used a clean detached temporary worktree from the committed base with the exact frozen F.11 candidate copied byte-for-byte and re-hashed. Temporary harness changes never entered the primary worktree.
- Production model `gemini-3.6-flash`, temperature 0.1, timeout, canonical order, semantic contracts, prompt, final response schema, max-3, and validator semantics were held fixed. No retries and no Founder evidence were used.

## Prior decisions and mechanism accounting

- F.13: `POST_MVP_TASK_F13_MULTIPLE_MECHANISMS_SUPPORTED`.
- F.13 mechanism accounting: 7 persistent targets; cross-evidence context competition 4/7; full-canonical competition 2/7; genuine pairwise semantic-comprehension failure 1/7; sparse-selection objective 0/7; max-3 physical bottleneck `NO`.
- F.13.1: `POST_MVP_TASK_F131_PARTNER_STRATEGY_REQUIRED_CONFIRMED`.
- Founder/EM ratification: `KEEP_PARTNER_STRATEGY_REQUIRED`. The benchmark, role usage, canonical identity, and `partner-strategy` contract remained unchanged.

## Production evidence-cardinality audit

Observed repository truth:

- `resume-evidence-text-extractor.ts` appends every eligible segmented candidate to `evidenceRecords`; there is no evidence-record count ceiling.
- `build-provisional-career-map-from-text.ts` maps every extracted evidence record into `eligibleEvidence`; there is no slice or inference batch-size cap.
- The capability-inference API requires a non-empty array and validates each item, but imposes no maximum item count.
- Upstream source volume is indirectly bounded: plain text defaults to 200,000 characters and local files to 5 MiB. These are byte/character limits, not a small hard maximum on atomic evidence count.
- Privacy-safe Founder replays provide typical current-state observations of 31-33 evidence records, not a production maximum. Future users can exceed those counts within the source-size bounds.

Classification: `SOFT_BOUNDED_EVIDENCE_CARDINALITY`. Cardinality ownership spans extraction, build orchestration, and API transport; no owner defines a hard item-count maximum. One call per evidence is therefore `NOT_ACCEPTABLE_AS_BOUNDED_ARCHITECTURE`.

## R0 reference

R0 is the frozen F.11 architecture: one full 38-evidence batch, full 51-capability semantic context, one provider call, no partition or verification. No new R0 calls were made.

F.12 temperature-0.1 reference medians: overall required recall 83.33%; L1 100%; L2 100%; L3 65%; multi-capability completeness 33.33%; overshadowed-secondary recall 54.55%; zero-proposal precision 100%; forbidden FP 0%; evidence linkage 100%; unknown IDs 0; duplicates 0; validator rejections 0. Median per-family recall was Analytics 100%, Commercial 75%, Communication 100%, Customer 100%, Data & Technology 33.33%, Governance 100%, Leadership 100%, Learning & Development 50%, Operations 66.67%, People 100%, Product 100%, Strategy 85.71%.

R0 cost reference: 1 call; 9,628 prompt tokens; median 17,905 total tokens; median 37.586 seconds. Its provider-call ceiling is `TRUE_FIXED_BOUND`.

## Distinction adjacency and static coverage

The diagnostic graph is undirected: an edge exists when either canonical contract explicitly distinguishes the other. The 104 directed relationships collapse to 68 unique undirected edges. No relationship was invented.

Raw per-run F.12/S0 result bodies were not retained. The target audit therefore uses the F.12-authoritative modal S0 REQUIRED selections (the reliable selected controls, plus the modal required selections for mobile), not a fabricated raw run. Optional selections cannot be reconstructed. Across all 38 cases, candidate-size figures use a conservative modal-REQUIRED-only proxy and are explicitly lower-bound diagnostics.

| Diagnostic pair | Representative selected IDs | One hop | Two hop |
|---|---|---|---|
| channel / `commercial-partnerships` | `audience-insight` | `ONE_HOP_NOT_COVERED` | not covered |
| case platform / `education-delivery` | `dependency-management` | `ONE_HOP_NOT_COVERED` | not covered |
| logistics / `partner-strategy` | `commercial-negotiation` | `ONE_HOP_NOT_COVERED` | covered |
| mobile / `cross-functional-delivery` | `product-cadence`, `roadmap-governance` | `ONE_HOP_NOT_COVERED` | covered |
| procurement / `cross-functional-delivery` | `risk-controls` | `ONE_HOP_NOT_COVERED` | not covered |
| field service / `tooling-enablement` | `change-leadership` | `ONE_HOP_COVERED` | covered |
| case platform / `tooling-enablement` | `dependency-management` | `ONE_HOP_NOT_COVERED` | not covered |

One-hop target coverage is 1/7 overall and 1/6 architecture-related targets; critically, it is 0/2 for full-canonical competition. Two-hop target coverage is 3/7 overall and 2/6 architecture-related, while expanding the candidate set substantially and still missing both full-canonical targets.

The conservative 38-case modal-REQUIRED proxy, after removing already selected capabilities, has median/max one-hop counts 2/7 and median/max two-hop counts 6.5/18. Because optional S0 selections were not retained, these are lower bounds rather than raw-output statistics.

## R1 - bounded evidence partitioning

Both arms used order-preserving balanced partitions, full 51-capability semantic context in canonical order, the exact F.11 inference operation, the unchanged schema and validator, and deterministic concatenation by original evidence order.

| Metric | R0 F.12 median | R1-P2 (19/19) | R1-P3 (13/13/12) |
|---|---:|---:|---:|
| Calls | 1 | 2 | 3 |
| Overall required recall | 83.33% | 88.10% | 88.10% |
| L1 | 100% | 100% | 100% |
| L2 | 100% | 100% | 100% |
| L3 | 65% | 75% | 75% |
| Multi-capability completeness | 33.33% | 44.44% | 44.44% |
| Overshadowed-secondary recall | 54.55% | 75% | 75% |
| Zero-proposal precision | 100% | 100% | 100% |
| Forbidden FP | 0% | 0% | 0% |
| Evidence linkage | 100% | 100% | 100% |
| Unknown / duplicate / validator rejected | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| Proposal distribution 0/1/2/3 | F.12 aggregate not directly comparable | 7/23/8/0 | 7/25/5/1 |
| Prompt tokens | 9,628 | 17,705 | 25,782 |
| Total tokens | 17,905 median | 28,824 | 39,425 |
| Aggregate provider latency | 37.586s median | 64.710s | 83.698s |

P2 relative to R0 median: prompt +83.89%, total tokens +60.98%, latency +72.16%. P3: prompt +167.78%, total tokens +120.19%, latency +122.68%.

P2 per-family recall: Analytics 100%, Commercial 75%, Communication 100%, Customer 100%, Data & Technology 100%, Governance 75%, Leadership 100%, Learning & Development 50%, Operations 83.33%, People 100%, Product 100%, Strategy 85.71%. P3: Analytics 100%, Commercial 75%, Communication 100%, Customer 100%, Data & Technology 66.67%, Governance 100%, Leadership 100%, Learning & Development 50%, Operations 83.33%, People 100%, Product 100%, Strategy 85.71%.

Seven-target scorecard:

| Target | P2 | P3 | Mechanism |
|---|---|---|---|
| `commercial-partnerships` | miss | miss | full-canonical competition |
| `education-delivery` | miss | miss | full-canonical competition |
| `partner-strategy` | miss | miss | pairwise-comprehension residual |
| mobile `cross-functional-delivery` | miss | recovered | cross-evidence |
| procurement `cross-functional-delivery` | recovered | miss | cross-evidence |
| field `tooling-enablement` | recovered | miss | cross-evidence |
| case `tooling-enablement` | recovered | recovered | cross-evidence |

P2 recovered 3/7 overall, 3/6 architecture-related, and 3/4 cross-evidence targets. P3 recovered 2/7 overall, 2/6 architecture-related, and 2/4 cross-evidence targets. Neither recovered either full-canonical target. P2 also emitted one benchmark-unlabelled capability (`insight-synthesis` on the marketing investment fixture); it was neither benchmark-forbidden nor treated as a false positive, and systematic boundary regression remains unproven.

R1 effect classification: `MATERIAL_CROSS_EVIDENCE_IMPROVEMENT_BUT_INCOMPLETE_SINGLE_SAMPLE`. P2 is the better R1 arm. A fixed two-part balanced split has a defensible `TRUE_FIXED_BOUND` of two calls independent of user evidence count, although each partition's context can still grow because item count has no hard cap. The single architecture-selection run is sufficient to identify promise, not production reliability or admission.

## R2 - semantic-neighbour verification

R2 viability: `NO`. The mandated one-hop graph reaches only 1/6 architecture-related targets and 0/2 targets caused by the mechanism R2 is intended to repair. A live binary pass could not recover candidate pairs that deterministic generation never supplies. This fails the pre-call meaningful-coverage gate, so no R2 provider request was made.

- Provider calls: not run; conceptual ceiling would be 2 total (R0 pass plus one global verification call).
- Verification candidate count: not produced; static lower-bound candidate sizes are reported above.
- Full benchmark, seven-target, specificity, zero precision, overflow, token, and latency metrics: `NOT_MEASURED_STATIC_VIABILITY_GATE_FAILED`.
- Max-3 overflow count: not measured. Existing F.12 reference had no three-proposal saturation; P2 had none and P3 had one three-proposal result.
- Effect classification: `ONE_HOP_NEIGHBOUR_VERIFICATION_NOT_VIABLE`.
- Final public schema implication: none. Had it been viable, only an internal temporary verification schema would have been required, with the existing final validator retained.

## R3 - combined bounded repair

R3 was not triggered. R1 showed useful cross-evidence benefit, but R2 did not pass static viability and therefore could not demonstrate useful non-overlapping canonical-competition benefit with acceptable precision. Combining P2/P3 with a verification pass would add a third/fourth call without reaching either full-canonical target.

- Calls and benchmark/cost metrics: `NOT_RUN_GATE_NOT_MET`.
- Incremental benefit over the best simpler arm: not demonstrated.
- Effect classification: `COMBINED_REPAIR_NOT_JUSTIFIED`.
- Conceptual provider-call ceiling remains `TRUE_FIXED_BOUND` at at most four, but a fixed ceiling alone does not make an ineffective architecture sufficient.

## Precision, capacity, schemas, and residuals

- Both live R1 arms preserved zero-proposal precision 100%, forbidden FP 0%, evidence linkage 100%, unknown IDs 0, duplicates 0, and validator rejections 0.
- Max-3 is not a demonstrated physical bottleneck: P2 had zero three-proposal results and P3 had one; no verification merge was attempted and no overflow occurred.
- No final public schema change, validator change, or canonical-library change is required by R1. R2 would require only an internal verification schema, but R2 is not supported.
- `partner-strategy` was not naturally recovered. Under F.13.1 it remains semantically REQUIRED and is classified `ISOLATED_RESIDUAL` within the seven-pair mechanism audit: a known genuine pairwise model-comprehension residual, not a reason for a fixture special case.
- Product tolerance of that one isolated pair is not decided here. The current architecture cannot be admitted on that question because two additional full-canonical-competition misses also remain unresolved.

## Architecture comparison and judgment

Observed: P2 materially improves generalized Level-3, multi-capability, secondary recall, and three of four cross-evidence targets while preserving hard precision gates. P3 costs more and recovers fewer diagnosed cross-evidence targets in this run. One-hop canonical-neighbour generation cannot reach either full-canonical target.

Inferred: fixed P2 partitioning is a credible bounded component for a later architecture, but it is not sufficient alone. A neighbor verifier bound to the current one-hop distinction graph is structurally mismatched to the full-canonical misses.

Still unproven: P2 reliability across samples; whether its one unexpected but non-forbidden mapping is a semantic boundary issue; and what small deterministic candidate mechanism can reach `commercial-partnerships` and `education-delivery` without semantic routing leakage or unbounded calls.

Recommendation: do not implement R1, R2, or R3 from F.14. Admit only a further bounded mechanism review that first proves deterministic candidate reachability for the two full-canonical targets, then measures precision in one global verification call. This is the smallest safe next step and does not authorize model escalation.

## Safety and outputs

- Production files modified by F.14: none.
- Control files, package files, benchmark, canonical library, provider candidate, schema, and validator modified: none.
- Founder holdout: not executed.
- Staging, commit, and push: none.
- Durable output: this single untracked artifact. Temporary worktree, harness, result JSON, and candidate patch are removed after evidence capture.
- Verification confidence: `partially verified` - the static audit and one controlled P2/P3 run are complete and sufficient for architecture selection, but repeated reliability measurement was intentionally out of scope and no sufficient end-to-end repair was identified.
