# CareerTwin Post-MVP Task F.4 — Structured Inference Failure Mechanism Isolation

## Decision

`POST_MVP_TASK_F4_MULTIPLE_MECHANISMS_ISOLATED`

Primary mechanism: `SINGLE_PASS_SELECTION_BOTTLENECK`.

Secondary mechanisms: `CANONICAL_ORDER_BIAS` and missing canonical semantic decision boundaries. Candidate-set size was not supported as the primary mechanism.

## Preserved starting state

- Branch: `master`.
- HEAD and `origin/master`: `ce8f8ffc85ea9ef8371e9cc4c410595607fac039`.
- F.3 decision: `POST_MVP_TASK_F3_GENERALIZED_REPAIR_HOLDOUT_UNRESOLVED`.
- F.3 candidate remains an unstaged experimental arm.
- Combined F.3 provider/test diff SHA256: `842391C5473242AEF89819ED0725E04C82CECC72B886BB2BFFDD26E5BD658686`.
- Candidate provider file SHA256: `5DB9469ACF02E9342BE2795981156841AFEBECBE8F7A8D4A003A5DCAE22BBCAD`.
- Candidate provider test SHA256: `4016F2ECEC9A8111FB93603135CF67035CE29E51F3E85AA3DB1B8F4F8B5C1057`.
- Frozen benchmark SHA256: `732E7D740297A3D96A42E2B357878D37EDE7C1EC0070ED1E1BB53653BE0F3E49`.
- No benchmark content or expectation changed.

## F.3 result carried into F.4

The F.3 prompt produced real generalized improvement but remained incomplete. Across its three full-benchmark runs, Level-3 recall was 70/60/70%, multi-capability completeness was 44.44/33.33/44.44%, zeros and structural guards remained intact, and the Founder holdout still omitted `change-leadership`.

## Privacy-safe persistent failure matrix

The matrix uses only the three existing F.2 and three existing F.3 synthetic outputs. An entry is persistent when a required fixture/capability pair was missed in at least two of those six controlled runs.

| Fixture | Repeatedly overshadowed required capability | Misses / 6 | Proposal count when missed | Dominant/replacement outputs observed |
| --- | --- | ---: | --- | --- |
| `l3-case-platform-transition` | `education-delivery` | 6 | 1–2 | `dependency-management`; sometimes forbidden `change-leadership` |
| `l3-case-platform-transition` | `tooling-enablement` | 6 | 1–2 | `dependency-management`; sometimes forbidden `change-leadership` |
| `l3-field-service-rollout` | `tooling-enablement` | 6 | 1 | `change-leadership` |
| `l3-mobile-product-decisions` | `cross-functional-delivery` | 6 | 2 | `product-cadence`, `roadmap-governance` |
| `l3-procurement-exception-regime` | `cross-functional-delivery` | 6 | 1–2 | `operating-control`; sometimes `risk-controls` |
| `l3-channel-needs-offer` | `commercial-partnerships` | 4 | 1–2 | `audience-insight`; sometimes `partner-strategy` |
| `l3-marketing-investment-loop` | `investment-governance` | 4 | 1 | `marketing-effectiveness` |
| `l3-procurement-exception-regime` | `risk-controls` | 3 | 1 | `operating-control` |
| `l3-logistics-partner-renewal` | `partner-strategy` | 2 | 2 | `commercial-negotiation`, `commercial-partnerships` |

There are nine persistent fixture/capability pairs covering seven unique capabilities. Persistent-pair family distribution is Data & Technology 2, Operations & Delivery 2, Governance & Risk 2, Learning & Development 1, Commercial 1, and Strategy & Transformation 1. The failures span families but are concentrated in Level-3 evidence with already-salient outputs; they are not explained by one weak family alone.

## Frozen challenge subset

The subset was fixed before any ablation outcome was observed. It contains all nine dominant-dimension cases plus three adversarial precision traps, two of which require zero proposals.

1. `l3-field-service-rollout`
2. `l3-procurement-exception-regime`
3. `l3-marketing-investment-loop`
4. `l3-claims-workflow-adoption`
5. `l3-channel-needs-offer`
6. `l3-case-platform-transition`
7. `l3-logistics-partner-renewal`
8. `l3-centralised-service-transition`
9. `l3-mobile-product-decisions`
10. `adv-tool-use-not-enablement`
11. `adv-change-participant`
12. `adv-control-compliance`

Subset identity is SHA256 over the ordered compact JSON fixture-ID array: `6F48B7061FA6B2EA25EAF99D2B600CA56AC7C983BCD118E8DF651E2C5D643243`.

## Schema and provider audit

- One production request batches all eligible evidence items.
- All 51 canonical capabilities are supplied for every item.
- Canonical order is stable by family, label, then ID.
- The output array has `maxItems: 3` and no `minItems`; zero assessments remain valid.
- Temperature is `0.1`; timeout is 90 seconds.
- No explicit top-p, top-k, maximum output token, or other sampling setting is configured.
- The schema constrains output count but did not bind any challenge case because no precision-safe arm needed more than three final assessments.
- The stable full-list order creates a plausible attention/salience path; measured order sensitivity supports that concern.

## Experimental arms and metrics

Every arm ran once on the same frozen challenge subset. No retry, preferred sampling, or Founder-guided selection occurred.

| Arm | Calls | Required recall | L3 recall | Multi complete | Secondary recall | Forbidden FP | Zero precision | Avg proposals | Latency | Total tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| O1 current order / C1 full set | 1 | 85.71% | 85% | 66.67% | 72.73% | 0% | 100% | 1.667 | 19.307s | 5,996 |
| O2 reversed order | 1 | 76.19% | 75% | 44.44% | 72.73% | 0% | 100% | 1.583 | 21.313s | 6,519 |
| O3 fixed-seed shuffled order | 1 | 80.95% | 80% | 55.56% | 72.73% | 0% | 100% | 1.583 | 21.816s | 6,791 |
| C2 relevant families only | 1 | 76.19% | 75% | 55.56% | 72.73% | 0% | 100% | 1.750 | 16.419s | 6,065 |
| C3 relevant plus distractors | 1 | 85.71% | 85% | 66.67% | 81.82% | 0% | 100% | 1.583 | 19.011s | 7,265 |
| B1 two-call behavior decomposition | 2 | **90.48%** | **90%** | **77.78%** | **81.82%** | **0%** | **100%** | **1.583** | 30.065s | 9,686 |
| D1 discovery then verification | 2 | 90.48% | 90% | 77.78% | 81.82% | 3.70% | 100% | 2.250 | 47.552s | 11,921 |
| S1 single-call explicit decomposition | 1 | 76.19% | 75% | 44.44% | 72.73% | 0% | 100% | 1.583 | 23.728s | 5,860 |

Every arm retained zero duplicate mappings, zero unknown IDs, 100% evidence-link validity, and zero validator rejection.

## Ablation judgments

### Canonical order

Classification: `MATERIAL_ORDER_BIAS`.

Changing only canonical order moved required recall across 76.19–85.71% and multi-capability completeness across 44.44–66.67%. It also changed which required secondary dimensions were selected. Because each arm intentionally ran once, some model variance cannot be separated, but the magnitude and case-level selection movement are material enough to treat stable order as a contributing mechanism.

### Candidate-set competition

Classification: `NO_CANDIDATE_SET_EFFECT` as a primary mechanism.

The label-informed relevant-family arm was worse than the full set. The broader reduced arm matched full-set required recall and modestly improved secondary recall. Reduction therefore did not produce a consistent material gain and does not justify production filtering.

### Behavior decomposition

Classification: `MATERIAL_DECOMPOSITION_BENEFIT` when decomposition is separated into its own call.

The two-call behavior arm was the best precision-safe architecture: 90.48% required recall, 90% Level 3, 77.78% multi-completeness, 81.82% secondary recall, zero forbidden mappings, and no proposal inflation.

### Discovery then verification

Classification: `OVERMAPPING_NOT_RECOVERED_BY_VERIFIER`.

Recall matched behavior decomposition, but the verifier retained a forbidden `policy-governance` mapping, raising forbidden FP to 3.70% and average proposals to 2.25. Separating discovery from verification can improve recall, but this tested verifier did not preserve precision adequately.

### Single-call decomposition

Classification: `NO_DECOMPOSITION_BENEFIT` in one call.

Explicitly requesting behavior identification, mapping, and completeness inside one call produced 76.19% required recall and 44.44% multi-completeness. This is materially below the two-call behavior arm, supporting an actual single-pass selection bottleneck rather than merely missing wording.

## Canonical distinguishability audit

The canonical library supplies only ID, label, and family. It contains no capability definitions or explicit decision boundaries.

| Repeated miss | Nearby competition | Classification |
| --- | --- | --- |
| `tooling-enablement` | `change-leadership`, delivery/adoption interpretations | `MISSING_DECISION_BOUNDARY` |
| `education-delivery` | tooling enablement and dependency delivery | `MISSING_DECISION_BOUNDARY` |
| `cross-functional-delivery` | dependency management, operating control, risk controls | `MISSING_DECISION_BOUNDARY` |
| `commercial-partnerships` | partner strategy and commercial negotiation | `SOMEWHAT_OVERLAPPING` plus missing boundary |
| `investment-governance` | marketing effectiveness, measurement, operating control | `MISSING_DECISION_BOUNDARY` |
| `risk-controls` | operating control, policy governance, regulatory compliance | `SOMEWHAT_OVERLAPPING` plus missing boundary |
| `partner-strategy` | commercial partnerships and commercial negotiation | `SOMEWHAT_OVERLAPPING` plus missing boundary |

Missing definitions contribute to unstable label selection, but the strong two-call improvement without library changes shows that vocabulary ambiguity is secondary rather than the sole mechanism.

## Mechanism decision

Primary: `SINGLE_PASS_SELECTION_BOTTLENECK`.

Evidence: both genuinely two-stage approaches reached 90.48% required and 90% Level-3 recall; the single-call decomposition control fell to 76.19% and 75%. The best two-call arm recovered more secondary dimensions without adding false positives.

Secondary: `CANONICAL_ORDER_BIAS`, with `CANONICAL_DEFINITION_AMBIGUITY` as a further contributor.

Overall decision: multiple interacting mechanisms are sufficiently isolated. Candidate-set competition and schema maximum are not supported as primary causes.

## Cost and latency

Synthetic calls: 10. Founder validation calls: 2. Total provider calls: 12.

Against O1, B1 behavior decomposition used two calls, 30.065s versus 19.307s measured latency (1.56×), and 9,686 versus 5,996 total tokens (1.62×). The discovery/verifier arm was slower and larger at 47.552s and 11,921 tokens while also losing precision. The Founder B1 run used 4,357 tokens and 15.727s.

Operational risks of B1 are doubled request count per inference batch, additional timeout/failure exposure between stages, and higher token/latency cost. It remains bounded: one behavior call and one mapping call, with concise behavior output and no hidden chain-of-thought. No dollar cost is stated because the repository does not provide authoritative pricing.

## Founder final holdout

The Founder holdout was not used to choose the winning arm. After B1 was frozen from synthetic evidence, it was run exactly once through that architecture (two provider calls).

- Accepted mappings: `analytics-governance`, `change-leadership`, `tooling-enablement`.
- `change-leadership` recovered naturally: yes.
- Prior legitimate mappings preserved: yes.
- Evidence-link validity: 100%.
- Validator rejection rate: 0%.
- Interpretation: `GENERALIZED_MECHANISM_CONFIRMED_BY_HOLDOUT`.
- No raw Founder evidence or credentials are retained here.

## Recommendations

- F.3 disposition: `KEEP_F3_CANDIDATE_AS_BASE_FOR_NEXT_REPAIR`. B1's mapping stage builds on its generalized grounding/completeness contract.
- Benchmark durability: `BENCHMARK_READY_FOR_DURABLE_ADMISSION`. It repeatedly detected under-mapping, precision variance, order sensitivity, and architecture differences independently of the Founder holdout.
- Smallest next repair class: `OTHER_EXACT_REPAIR` — a bounded two-stage observed-behavior decomposition → canonical mapping provider architecture, preserving the existing final schema and validator.
- Expected production boundaries for the next admitted repair require a provider call-count change and an internal intermediate behavior contract. They do not presently require a final schema, validator, canonical-library, eligibility, materializer, graph, or renderer change.
- Canonical definition review should remain a separate follow-up, not be mixed into the first two-stage repair.

## Repository boundary

Task F.4 added only the untracked experimental harness `scripts/experiment-career-capability-inference-mechanisms.ts` and this untracked artifact. It modified no production, control, package, benchmark, validator, canonical-library, or downstream file. Nothing was staged, committed, or pushed. Task E remains blocked.

Single next action: admit a narrowly scoped generalized repair task for the bounded two-stage behavior-decomposition → canonical-mapping provider architecture, using the F.3 candidate as its base and the frozen benchmark as its gate.
