# Post-MVP Task F.12 — Semantic Runtime Reliability & Sampling Stability

## Decision

- Repository decision: `POST_MVP_TASK_F12_PERSISTENT_SEMANTIC_BLIND_SPOTS`.
- Phase A classification: `MATERIAL_STOCHASTIC_INSTABILITY`, triggered by repeated fixture/capability failures indicating persistent rather than rare variance. The fresh nine-run sample itself contained zero pre-registered severe tails.
- Temperature comparison: `LOWER_TEMPERATURE_SIMILAR`.
- Recommended production decision: `PERSISTENT_SEMANTIC_BLIND_SPOTS_REQUIRE_TARGETED_SYSTEM_AUDIT`.
- Sampling configuration is not the primary cause. Do not admit the F.11 candidate as-is and do not adopt temperature zero from this evidence.

## Frozen F.11 candidate

- Committed base: `d797941bf63f1ab43670be4a86fe0712564fdf5c`.
- Provider SHA256: `F50764218E50C3FACB31D4BE9854B83DEC2DBE9C6021340EEB7D2E5D0DFF5212`.
- Provider-test SHA256: `45FAA40DBC20158232227444B1B12B4558C8297538481857D1DDD81382236F65`.
- Integration-test SHA256: `B039F5821F0391FC36DFC0A94B245EF4ED44FA4011325DF0F73CD94A72D9328D`.
- Combined binary diff SHA256 against committed HEAD: `B50EDF7BA0523AEFAC5C2770E69F46C72DF3A0366C4C4ABEACE8C154CE900B2E`.
- Candidate attribution: exclusively the F.11 canonical semantic serialization and its two authority-flow tests. No F.3 completeness prompt, F.5 decomposition, or F.7 partitioning was present.

## Isolation and authority controls

- Evaluation used a clean detached temporary Git worktree at the committed base. The exact frozen F.11 patch was transferred into it, and all three resulting candidate file hashes were verified byte-for-byte against the primary worktree before live calls.
- Dependencies were exposed through a temporary junction to the primary ignored `node_modules`; credentials were loaded into the evaluation process without being written to the artifact.
- Benchmark: `structured-inference-coverage-benchmark/2.1.0`.
- Benchmark SHA256: `B4BC948CABB7D37C032CF3080056C804872B7F523315FB1B36A4EC76F083A55A`.
- Canonical semantic content version: `1.3.0`; 51 capabilities, 12 families, 51/51 semantic contracts.
- Architecture remained one call per run, one full 38-evidence batch, full 51-capability semantic context, 90-second timeout, no retry, unchanged model/prompt/schema/max-3/validator.
- The focused isolated provider test passed before live evaluation: 51 canonical capabilities and 45,294 semantic-context characters.
- Founder holdout was not run.

## Phase A — temperature 0.1

Exactly nine fresh calls were completed successfully. Historical F.10/F.11 calls were excluded.

| Run | Overall | L1 | L2 | L3 | Multi | Secondary | Zero precision | Forbidden FP | Link | Unknown / duplicate / rejected | Proposals 0/1/2 | Latency | Prompt / total tokens |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 83.33% | 100% | 100% | 65% | 33.33% | 54.55% | 100% | 0% | 100% | 0 / 0 / 0 | 7/26/5 | 35.581s | 9,628 / 17,473 |
| 2 | 83.33% | 100% | 100% | 65% | 33.33% | 54.55% | 100% | 0% | 100% | 0 / 0 / 0 | 7/25/6 | 37.586s | 9,628 / 18,237 |
| 3 | 80.95% | 100% | 100% | 60% | 33.33% | 54.55% | 100% | 0% | 100% | 0 / 0 / 0 | 7/27/4 | 38.011s | 9,628 / 17,875 |
| 4 | 83.33% | 100% | 100% | 65% | 33.33% | 54.55% | 100% | 0% | 100% | 0 / 0 / 0 | 7/25/6 | 31.281s | 9,628 / 16,993 |
| 5 | 85.71% | 100% | 100% | 70% | 33.33% | 54.55% | 100% | 0% | 100% | 0 / 0 / 0 | 7/25/6 | 45.897s | 9,628 / 20,504 |
| 6 | 85.71% | 100% | 100% | 70% | 44.44% | 54.55% | 100% | 0% | 100% | 0 / 0 / 0 | 7/25/6 | 36.509s | 9,628 / 17,905 |
| 7 | 83.33% | 100% | 100% | 65% | 33.33% | 54.55% | 100% | 0% | 100% | 0 / 0 / 0 | 7/26/5 | 41.982s | 9,628 / 19,407 |
| 8 | 83.33% | 100% | 100% | 65% | 33.33% | 54.55% | 100% | 0% | 100% | 0 / 0 / 0 | 7/26/5 | 34.468s | 9,628 / 17,616 |
| 9 | 80.95% | 100% | 100% | 60% | 22.22% | 45.45% | 100% | 0% | 100% | 0 / 0 / 0 | 7/27/4 | 38.556s | 9,628 / 18,653 |

Aggregate proposal distribution: zero 63, one 232, two 47, three 0.

### Phase A distribution

P20 uses nearest-rank estimation; standard deviation is population standard deviation in percentage points.

| Metric | Median | Minimum | Maximum | P20 | Mean | Std dev | Spread |
|---|---:|---:|---:|---:|---:|---:|---:|
| Overall recall | 83.33% | 80.95% | 85.71% | 80.95% | 83.33% | 1.59 | 4.76 |
| Level-3 recall | 65% | 60% | 70% | 60% | 65% | 3.33 | 10 |
| Multi-capability completeness | 33.33% | 22.22% | 44.44% | 33.33% | 33.33% | 5.24 | 22.22 |
| Overshadowed-secondary recall | 54.55% | 45.45% | 54.55% | 54.55% | 53.54% | 2.86 | 9.09 |

- Level-3 below 60%: 0/9; below 65%: 2/9.
- Multi-capability at or below 11.11%: 0/9.
- Secondary recall below 45.45%: 0/9.
- Pre-registered `SEVERE_UNDERMAPPING_TAIL`: 0/9.
- Median latency: 37.586s; range 31.281–45.897s.
- Prompt tokens: 9,628 every run. Median total tokens: 17,905; range 16,993–20,504.

### Phase A family reliability

Values are runs 1–9, followed by median.

- Analytics & Insight: `100/100/100/100/100/100/100/100/100`; median 100%.
- Commercial: `75/75/75/75/75/75/75/75/75`; median 75%.
- Communication & Collaboration: `100/100/100/100/100/100/100/100/100`; median 100%.
- Customer & Market: `100/100/100/100/100/100/100/100/100`; median 100%.
- Data & Technology: `33.33/33.33/33.33/33.33/66.67/66.67/33.33/33.33/33.33`; median 33.33%.
- Governance & Risk: `100/100/100/100/100/100/100/100/75`; median 100%.
- Leadership: `100/100/100/100/100/100/100/100/100`; median 100%.
- Learning & Development: `50/50/50/50/50/50/50/50/50`; median 50%.
- Operations & Delivery: `66.67/66.67/66.67/66.67/66.67/66.67/66.67/66.67/66.67`; median 66.67%.
- People & Organisation: `100/100/100/100/100/100/100/100/100`; median 100%.
- Product: `100/100/75/100/100/100/100/100/100`; median 100%.
- Strategy & Transformation: `85.71/85.71/85.71/85.71/85.71/85.71/85.71/85.71/85.71`; median 85.71%.

## Phase A REQUIRED-pair stability matrix

Classification thresholds were fixed for this analysis as: `ALWAYS_FOUND=9`, `USUALLY_FOUND=7–8`, `UNSTABLE=3–6`, `USUALLY_MISSED=1–2`, `ALWAYS_MISSED=0`.

| Fixture / required capability | Hits | Classification |
|---|---:|---|
| `l1-demand-forecast` / `forecasting` | 9/9 | ALWAYS_FOUND |
| `l1-supplier-negotiation` / `commercial-negotiation` | 9/9 | ALWAYS_FOUND |
| `l1-behavioural-segmentation` / `customer-segmentation` | 9/9 | ALWAYS_FOUND |
| `l1-release-risk-control` / `risk-controls` | 9/9 | ALWAYS_FOUND |
| `l1-team-leadership` / `people-leadership` | 9/9 | ALWAYS_FOUND |
| `l1-workshop-delivery` / `education-delivery` | 9/9 | ALWAYS_FOUND |
| `l1-workflow-improvement` / `process-improvement` | 9/9 | ALWAYS_FOUND |
| `l1-operating-model` / `operating-model` | 9/9 | ALWAYS_FOUND |
| `l2-decision-brief` / `insight-synthesis` | 9/9 | ALWAYS_FOUND |
| `l2-university-joint-programme` / `education-partnerships` | 9/9 | ALWAYS_FOUND |
| `l2-analyst-workspace` / `tooling-enablement` | 9/9 | ALWAYS_FOUND |
| `l2-metric-decision-rights` / `analytics-governance` | 9/9 | ALWAYS_FOUND |
| `l2-regulated-release` / `cross-functional-delivery` | 9/9 | ALWAYS_FOUND |
| `l2-service-accountabilities` / `organisation-design` | 9/9 | ALWAYS_FOUND |
| `l2-feature-behaviour` / `product-insights` | 9/9 | ALWAYS_FOUND |
| `l2-onboarding-activation` / `customer-adoption` | 9/9 | ALWAYS_FOUND |
| `l2-joint-market-offer` / `commercial-partnerships` | 9/9 | ALWAYS_FOUND |
| `l2-fortnightly-product-forum` / `product-cadence` | 9/9 | ALWAYS_FOUND |
| `l2-market-entry-options` / `strategic-analysis` | 9/9 | ALWAYS_FOUND |
| `l2-promotion-workflow` / `people-process` | 9/9 | ALWAYS_FOUND |
| `l2-realised-savings` / `benefits-realisation` | 9/9 | ALWAYS_FOUND |
| `l3-field-service-rollout` / `tooling-enablement` | 1/9 | USUALLY_MISSED |
| `l3-field-service-rollout` / `change-leadership` | 9/9 | ALWAYS_FOUND |
| `l3-procurement-exception-regime` / `risk-controls` | 9/9 | ALWAYS_FOUND |
| `l3-procurement-exception-regime` / `cross-functional-delivery` | 0/9 | ALWAYS_MISSED |
| `l3-marketing-investment-loop` / `marketing-effectiveness` | 9/9 | ALWAYS_FOUND |
| `l3-marketing-investment-loop` / `investment-governance` | 8/9 | USUALLY_FOUND |
| `l3-claims-workflow-adoption` / `process-improvement` | 9/9 | ALWAYS_FOUND |
| `l3-claims-workflow-adoption` / `change-leadership` | 9/9 | ALWAYS_FOUND |
| `l3-channel-needs-offer` / `audience-insight` | 9/9 | ALWAYS_FOUND |
| `l3-channel-needs-offer` / `commercial-partnerships` | 0/9 | ALWAYS_MISSED |
| `l3-case-platform-transition` / `tooling-enablement` | 1/9 | USUALLY_MISSED |
| `l3-case-platform-transition` / `dependency-management` | 9/9 | ALWAYS_FOUND |
| `l3-case-platform-transition` / `education-delivery` | 0/9 | ALWAYS_MISSED |
| `l3-logistics-partner-renewal` / `commercial-negotiation` | 9/9 | ALWAYS_FOUND |
| `l3-logistics-partner-renewal` / `partner-strategy` | 0/9 | ALWAYS_MISSED |
| `l3-centralised-service-transition` / `organisation-design` | 9/9 | ALWAYS_FOUND |
| `l3-centralised-service-transition` / `change-leadership` | 9/9 | ALWAYS_FOUND |
| `l3-mobile-product-decisions` / `product-cadence` | 8/9 | USUALLY_FOUND |
| `l3-mobile-product-decisions` / `roadmap-governance` | 9/9 | ALWAYS_FOUND |
| `l3-mobile-product-decisions` / `cross-functional-delivery` | 0/9 | ALWAYS_MISSED |
| `adv-tool-use-not-enablement` / `variance-analysis` | 9/9 | ALWAYS_FOUND |

Totals: ALWAYS_FOUND 33, USUALLY_FOUND 2, UNSTABLE 0, USUALLY_MISSED 2, ALWAYS_MISSED 5.

## Data & Technology diagnosis

This is classification A: one persistently difficult canonical mapping expressed in two Level-3 fixtures, not broad family weakness or random run collapse.

- `l2-analyst-workspace` / `tooling-enablement`: 9/9 at temperature 0.1 and 6/6 at temperature 0.0.
- `l3-field-service-rollout` / `tooling-enablement`: 1/9 and 1/6.
- `l3-case-platform-transition` / `tooling-enablement`: 1/9 and 2/6.

The family succeeds when tooling enablement is the clear primary behavior and usually misses it when it is a secondary dimension embedded in transition/change evidence.

## Phase B — temperature 0.0

The official Gemini API model/generation contract permits `0.0` inclusively. The installed SDK type accepted it, and all six calls completed. Only the isolated provider temperature literal changed; prompt, model, schema, order, evidence, timeout, and retry behavior remained fixed.

| Run | Overall | L1 | L2 | L3 | Multi | Secondary | Zero precision | Forbidden FP | Link | Unknown / duplicate / rejected | Proposals 0/1/2 | Latency | Prompt / total tokens |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 83.33% | 100% | 100% | 65% | 33.33% | 54.55% | 100% | 0% | 100% | 0 / 0 / 0 | 7/26/5 | 39.330s | 9,628 / 17,942 |
| 2 | 88.10% | 100% | 100% | 75% | 44.44% | 54.55% | 100% | 0% | 100% | 0 / 0 / 0 | 7/23/8 | 44.556s | 9,628 / 19,578 |
| 3 | 85.71% | 100% | 100% | 70% | 33.33% | 54.55% | 100% | 0% | 100% | 0 / 0 / 0 | 7/25/6 | 26.912s | 9,628 / 15,267 |
| 4 | 85.71% | 100% | 100% | 70% | 44.44% | 63.64% | 100% | 0% | 100% | 0 / 0 / 0 | 7/25/6 | 41.441s | 9,628 / 18,803 |
| 5 | 80.95% | 100% | 100% | 60% | 22.22% | 45.45% | 100% | 0% | 100% | 0 / 0 / 0 | 7/27/4 | 30.374s | 9,628 / 16,306 |
| 6 | 80.95% | 100% | 100% | 60% | 22.22% | 45.45% | 100% | 0% | 100% | 0 / 0 / 0 | 7/27/4 | 30.336s | 9,628 / 16,553 |

- Level-3 median/min/max/P20: 67.5% / 60% / 75% / 60%; population standard deviation 5.53 points; spread 15 points.
- Multi median/min/max/P20: 33.33% / 22.22% / 44.44% / 22.22%.
- Secondary median/min/max/P20: 54.55% / 45.45% / 63.64% / 45.45%.
- Severe tails: 0/6. Zero precision 100%, forbidden FP 0%, linkage 100%, unknown IDs 0, duplicates 0, rejections 0 in every run.
- Aggregate proposals: zero 42, one 153, two 33, three 0.
- Median latency: 34.852s; range 26.912–44.556s. Prompt tokens remained 9,628; median total tokens 17,247.5.
- Family sequences: Analytics 100×6; Commercial 75×6; Communication 100×6; Customer 100×6; Data & Technology `33.33/100/66.67/33.33/33.33/33.33`; Governance `100/100/100/100/75/75`; Leadership 100×6; Learning & Development 50×6; Operations `66.67/66.67/66.67/83.33/66.67/66.67`; People 100×6; Product 100×6; Strategy 85.71×6.

## Temperature comparison and persistent failure class

| Measure | Temperature 0.1 | Temperature 0.0 | Judgment |
|---|---:|---:|---|
| Median Level-3 | 65% | 67.5% | Small improvement |
| P20/minimum Level-3 | 60% / 60% | 60% / 60% | No lower-tail improvement |
| Level-3 standard deviation/spread | 3.33 / 10 points | 5.53 / 15 points | Less consistent at 0.0 |
| Median multi | 33.33% | 33.33% | Same |
| Median secondary | 54.55% | 54.55% | Same |
| Severe-tail frequency | 0/9 | 0/6 | Same clean result |
| Data & Technology median | 33.33% | 33.33% | Same |
| Zero precision / forbidden FP | 100% / 0% | 100% / 0% | Same |
| Median latency | 37.586s | 34.852s | 2.734s lower, not a semantic reliability reason |
| Prompt / median total tokens | 9,628 / 17,905 | 9,628 / 17,247.5 | Similar |

Persistent REQUIRED misses corroborated at both temperatures:

- `l3-channel-needs-offer` / `commercial-partnerships`: 0/9 and 0/6.
- `l3-case-platform-transition` / `education-delivery`: 0/9 and 0/6.
- `l3-logistics-partner-renewal` / `partner-strategy`: 0/9 and 0/6.
- `l3-mobile-product-decisions` / `cross-functional-delivery`: 0/9 and 0/6.
- `l3-procurement-exception-regime` / `cross-functional-delivery`: 0/9 and 1/6.
- `l3-field-service-rollout` / `tooling-enablement`: 1/9 and 1/6.
- `l3-case-platform-transition` / `tooling-enablement`: 1/9 and 2/6.

The generalized failure class is dominant-dimension selection suppressing supported secondary capabilities in multi-dimensional Level-3 evidence. It crosses Data & Technology, Operations & Delivery, Commercial, Learning & Development, and Strategy & Transformation. This is persistent rather than a random whole-run collapse, and lowering temperature does not resolve it.

## Product/truth judgment

- F.12 sufficiently characterizes the candidate: the F.11 55% run was not reproduced as a frequent severe tail in nine fresh temperature-0.1 runs, but the expanded matrix exposes stable semantic blind spots that remain at temperature zero.
- Precision, linkage, schema, validator, privacy, and context pressure remain sound.
- No further architecture complexity is admitted or proven necessary. The next investigation should audit the shared secondary-dimension selection failure class without patching individual fixtures or capability IDs.
- No production, canonical, benchmark, control, package, schema, or validator file was modified by F.12. Nothing was staged, committed, or pushed.
