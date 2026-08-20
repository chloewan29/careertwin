# Post-MVP Task F.13 — Secondary-Dimension Selection Mechanism Audit

## Decision

- Repository decision: `POST_MVP_TASK_F13_MULTIPLE_MECHANISMS_SUPPORTED`.
- System-level primary mechanism: `MULTIPLE_INTERACTING_MECHANISMS`.
- Mechanism counts: cross-evidence context 4, sparse selection 0, full-canonical competition 2, semantic-contract/expectation gap 1, target-level multiple/unclassified 0.
- Largest component: cross-evidence context competition.
- Secondary component: full-canonical competition.
- Recommended generalized repair class: `MULTI_MECHANISM_ARCHITECTURE_REVIEW`.
- This is an audit conclusion, not permission to introduce multi-call production architecture.

## Authority and isolation

- F.12 decision: `POST_MVP_TASK_F12_PERSISTENT_SEMANTIC_BLIND_SPOTS`.
- Committed base and primary `origin/master`: `d797941bf63f1ab43670be4a86fe0712564fdf5c`.
- Frozen F.11 provider SHA256: `F50764218E50C3FACB31D4BE9854B83DEC2DBE9C6021340EEB7D2E5D0DFF5212`.
- Frozen F.11 provider-test SHA256: `45FAA40DBC20158232227444B1B12B4558C8297538481857D1DDD81382236F65`.
- Frozen F.11 integration-test SHA256: `B039F5821F0391FC36DFC0A94B245EF4ED44FA4011325DF0F73CD94A72D9328D`.
- Combined F.11 diff SHA256: `B50EDF7BA0523AEFAC5C2770E69F46C72DF3A0366C4C4ABEACE8C154CE900B2E`.
- Benchmark: `structured-inference-coverage-benchmark/2.1.0`, SHA256 `B4BC948CABB7D37C032CF3080056C804872B7F523315FB1B36A4EC76F083A55A`.
- Canonical authority: content version `1.3.0`, 51 capabilities, 12 families, semantic contracts 51/51.
- Evaluation ran in a clean detached temporary Git worktree at the committed base with byte-identical frozen F.11 candidate files. No primary-worktree diagnostic calls were made.
- Production model, temperature 0.1, canonical ordering, semantic contracts, timeout, and privacy boundary were fixed. No Founder evidence was used.

## Frozen diagnostic corpus

The ordered corpus contains seven target records and 21 pairs. Controls come only from the same benchmark fixture: one F.12-reliable REQUIRED capability and one semantically plausible benchmark-FORBIDDEN capability.

Corpus SHA256: `C64EA37846F8FCFC6CA966833739EBC3B00E353F8939DCB828F9F874F0FF4866`.

| Target | SECONDARY_REQUIRED | RELIABLE_REQUIRED_CONTROL | FORBIDDEN_CONTROL | S0 full-batch hit rate |
|---|---|---|---|---:|
| `l3-channel-needs-offer` | `commercial-partnerships` | `audience-insight` | `commercial-negotiation` | 0/9 |
| `l3-case-platform-transition` | `education-delivery` | `dependency-management` | `change-leadership` | 0/9 |
| `l3-logistics-partner-renewal` | `partner-strategy` | `commercial-negotiation` | `account-growth` | 0/9 |
| `l3-mobile-product-decisions` | `cross-functional-delivery` | `roadmap-governance` | `change-leadership` | 0/9 |
| `l3-procurement-exception-regime` | `cross-functional-delivery` | `risk-controls` | `policy-governance` | 0/9 |
| `l3-field-service-rollout` | `tooling-enablement` | `change-leadership` | `customer-adoption` | 1/9 |
| `l3-case-platform-transition` | `tooling-enablement` | `dependency-management` | `customer-adoption` | 1/9 |

The duplicated `l3-case-platform-transition` evidence is intentional: it has two distinct secondary targets, and each target retained its own three-class diagnostic record and call allocation.

## S0 — authoritative full-batch reference

No new S0 calls were made. F.12's nine temperature-0.1 runs are the authority. Five targets were missed 9/9; both `tooling-enablement` targets were hit only 1/9. Precision across those full-batch runs remained clean.

## S1 — single-evidence current selection

Exactly 14 valid provider calls were made: two per frozen target record. Each call used the unchanged F.11 production provider semantics, full 51-capability semantic context, same canonical order, same final schema/max-3/validator, temperature 0.1, and one evidence item.

| Target | Secondary | Reliable control | Forbidden control | Produced capability IDs by run |
|---|---:|---:|---:|---|
| channel / commercial partnerships | 1/2 | 2/2 | 0/2 | `audience-insight, market-strategy, customer-segmentation`; `audience-insight, customer-segmentation, commercial-partnerships` |
| case platform / education delivery | 0/2 | 2/2 | 0/2 | `dependency-management, tooling-enablement`; same |
| logistics / partner strategy | 0/2 | 2/2 | 0/2 | `commercial-negotiation, commercial-partnerships`; plus `service-performance` in run 2 |
| mobile / cross-functional delivery | 2/2 | 2/2 | 0/2 | `product-cadence, roadmap-governance, cross-functional-delivery`; same |
| procurement / cross-functional delivery | 2/2 | 2/2 | 0/2 | `operating-control, risk-controls, cross-functional-delivery`; same, reordered |
| field service / tooling enablement | 2/2 | 2/2 | 0/2 | `change-leadership, tooling-enablement`; same |
| case platform / tooling enablement | 2/2 | 2/2 | 0/2 | `dependency-management, tooling-enablement`; same |

- Secondary hits: 9/14 calls; consistent target recovery: 4/7; inconsistent recovery: 1/7.
- Reliable-control recall: 14/14.
- Selected forbidden-control specificity: 14/14.
- Validator rejections: 0.
- Calls/latency/tokens: 14 calls; 125.210s aggregate provider latency, 8.979s median; 113,792 prompt tokens; 135,082 total tokens.
- Cross-evidence effect: material and sufficient for 4/7 targets. The channel target's 1/2 recovery is not consistent enough for Case A.

## S2 — full-51 independent support matrix

Exactly seven valid semantic calls were made, one per target record. Each returned one ordered judgment for all 51 canonical capabilities. All seven matrices passed evidence-ID, count, uniqueness, canonical-order, canonical-ID, and status validation.

One earlier API request was rejected with `INVALID_ARGUMENT` before semantic output because the temporary schema used an unsupported large enum/minimum-array constraint combination. It is reported as a diagnostic-schema infrastructure failure and is excluded from the seven semantic calls. Exact-51 enforcement remained in the prompt and deterministic post-validation; the valid arm used the same conceptual schema.

| Target | Secondary | Reliable control | Forbidden control | Supported canonical IDs |
|---|---|---|---|---|
| channel / commercial partnerships | NOT_SUPPORTED | SUPPORTED | NOT_SUPPORTED | `insight-synthesis, audience-insight, market-strategy` |
| case platform / education delivery | NOT_SUPPORTED | SUPPORTED | NOT_SUPPORTED | `tooling-enablement, dependency-management` |
| logistics / partner strategy | NOT_SUPPORTED | SUPPORTED | NOT_SUPPORTED | `commercial-negotiation, commercial-partnerships` |
| mobile / cross-functional delivery | SUPPORTED | SUPPORTED | NOT_SUPPORTED | `cross-functional-delivery, dependency-management, operating-rhythm, product-cadence, roadmap-governance` |
| procurement / cross-functional delivery | SUPPORTED | SUPPORTED | NOT_SUPPORTED | `operating-control, risk-controls, cross-functional-delivery` |
| field service / tooling enablement | SUPPORTED | SUPPORTED | NOT_SUPPORTED | `tooling-enablement, change-leadership` |
| case platform / tooling enablement | SUPPORTED | SUPPORTED | NOT_SUPPORTED | `tooling-enablement, dependency-management` |

- Secondary-required recall: 4/7, 57.14%.
- Reliable-required-control recall: 7/7, 100%.
- Forbidden-control specificity: 7/7, 100%.
- Across benchmark-known labels for these target records: REQUIRED recall 13/17, 76.47%; explicit FORBIDDEN specificity 14/14, 100%. Unlabelled capabilities were not treated as benchmark negatives.
- Calls/latency/tokens: 7 valid calls; 198.252s aggregate provider latency, 27.167s median; 56,455 prompt tokens; 89,391 total tokens.
- Sparse-selection effect: not supported. S2 recovered no target beyond the four already recovered consistently by S1.

## S3 — pairwise binary semantic judgment

Exactly 21 calls were made: one evidence, one canonical semantic contract, and one `SUPPORTED`/`NOT_SUPPORTED` judgment for every frozen pair. No retries were made.

| Target | Secondary | Reliable control | Forbidden control |
|---|---|---|---|
| channel / commercial partnerships | SUPPORTED | SUPPORTED | NOT_SUPPORTED |
| case platform / education delivery | SUPPORTED | SUPPORTED | NOT_SUPPORTED |
| logistics / partner strategy | NOT_SUPPORTED | SUPPORTED | NOT_SUPPORTED |
| mobile / cross-functional delivery | SUPPORTED | SUPPORTED | NOT_SUPPORTED |
| procurement / cross-functional delivery | SUPPORTED | SUPPORTED | NOT_SUPPORTED |
| field service / tooling enablement | SUPPORTED | SUPPORTED | NOT_SUPPORTED |
| case platform / tooling enablement | SUPPORTED | SUPPORTED | NOT_SUPPORTED |

- Secondary-required recall: 6/7, 85.71%.
- Reliable-required-control recall: 7/7, 100%.
- Forbidden-control specificity: 7/7, 100%.
- Calls/latency/tokens: 21 calls; 73.903s aggregate provider latency, 3.022s median; 6,454 prompt tokens; 14,063 total tokens.
- Pairwise understanding: present for 6/7 secondary targets with perfect controls.

## Per-target mechanism decision

The pre-registered matrix treats S1 recovery as Case A only when recovery is consistent across both S1 runs.

| Target | S1 | S2 | S3 | Classification |
|---|---|---|---|---|
| channel / commercial partnerships | 1/2 | miss | recover | `FULL_CANONICAL_COMPETITION`, with stochastic S1 recovery noted |
| case platform / education delivery | 0/2 | miss | recover | `FULL_CANONICAL_COMPETITION` |
| logistics / partner strategy | 0/2 | miss | miss | `SEMANTIC_CONTRACT_OR_EXPECTATION_GAP` |
| mobile / cross-functional delivery | 2/2 | recover | recover | `CROSS_EVIDENCE_CONTEXT_COMPETITION` |
| procurement / cross-functional delivery | 2/2 | recover | recover | `CROSS_EVIDENCE_CONTEXT_COMPETITION` |
| field service / tooling enablement | 2/2 | recover | recover | `CROSS_EVIDENCE_CONTEXT_COMPETITION` |
| case platform / tooling enablement | 2/2 | recover | recover | `CROSS_EVIDENCE_CONTEXT_COMPETITION` |

Aggregate: cross-evidence 4; sparse selection 0; canonical competition 2; semantic-contract/expectation gap 1; target-level multiple/unclassified 0. Because different targets fall into different cases, the system-level conclusion is Case E, `MULTIPLE_INTERACTING_MECHANISMS`.

## Sparse-selection and max-3 audit

- Production does not say choose the strongest, return the most direct, prefer minimal assessments, omit secondary valid dimensions, rank capabilities, or stop after one match.
- `Select only capability IDs present in the supplied canonical capabilities` is an identity constraint, not a top-k instruction.
- `Return at most three independently grounded assessments` is a capacity limit. It does not explicitly request sparse ranking.
- The selected-assessment output shape may exert implicit sparsity pressure, but S2 removed that pressure and recovered no additional target beyond consistent S1 recovery. The diagnostic evidence therefore does not support `SPARSE_SELECTION_OBJECTIVE` as a target mechanism.
- Max-3 is not a physical bottleneck. F.12 observed no three-item saturation; S1 misses occurred with two or three proposals; and uncapped independent S2 still missed the unresolved three targets.

## Canonical-competition correlations

- Every target contract has exactly two distinctions versus a canonical-library mean of 2.04. High neighbour count does not correlate with failure.
- Contract sizes are comparable, 788–853 serialized characters; longer contracts do not explain the split.
- Both canonical-competition targets have two cross-family distinctions, but so do the semantic-gap target and both tooling targets recovered in S1. Cross-family boundaries alone are not sufficient.
- Six of seven target labels have no material label-token overlap with their synthetic evidence, including both recovered and missed targets. Lexical label weakness is common but not discriminative.
- The two S2-to-S3 recoveries prove that full-canonical comparison can suppress a capability the model understands pairwise, but no simple neighbour-count, contract-length, family, or lexical metric isolates why those two are affected.

## Cross-evidence findings

- Every S0 target had the same 37 neighbouring evidence items, so neighbour count cannot explain differences between targets.
- Other fixtures with REQUIRED capabilities in the target's family ranged from 1 to 6. Recovery did not vary monotonically: education delivery had 1 and missed; partner strategy had 6 and missed; cross-functional delivery had 5 and recovered; tooling enablement had 2 and recovered.
- S1 consistently recovered four targets that were hit at most 1/9 in S0, with perfect selected controls. That is strong causal evidence for cross-evidence context competition even though simple same-family-neighbour counts do not explain it.
- No evidence routing or batching repair is admitted by this audit.

## Product/truth judgment

- Mechanism evidence is sufficient for a generalized repair decision, but not for implementation.
- A single selection-objective rewrite would not address the observed split. A bounded-context change could address four targets but would leave two canonical-competition targets and one semantic-review target unresolved.
- No output-schema, validator, canonical-library, or provider-call-count change is yet justified. Those boundaries must be decided by a later explicitly admitted multi-mechanism architecture review seeking the smallest safe repair.
- Production files, canonical authority, benchmark, control docs, package files, and primary HOLD were not modified by F.13. Nothing was staged, committed, or pushed. Founder holdout was not run.
