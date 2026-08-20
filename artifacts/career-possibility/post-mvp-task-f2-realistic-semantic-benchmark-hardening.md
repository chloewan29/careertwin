# Post-MVP Task F.2 — Realistic Semantic Coverage Benchmark Hardening

Status: `EVALUATION QUALITY COMPLETE / NO PRODUCTION CHANGE`

Decision: `POST_MVP_TASK_F2_GENERALIZED_COMPLETENESS_DEFECT_SUPPORTED`

Benchmark classification: `DISCRIMINATING`

## Why F.1 was insufficient

F.1 proved that the benchmark runner, validator integration, metrics, evidence-link checks and all-family fixture contract worked. It did not prove real-world discriminating power: the unchanged prompt scored essentially perfectly on 26 clean synthetic cases while the untouched Founder holdout still omitted a materially supported existing canonical dimension.

The F.1 leakage audit found:

- 26 fixtures, but no explicit difficulty model;
- 3 fixtures containing a full required canonical label;
- 13 fixtures containing a distinctive token from a required label;
- 7 multi-capability cases whose secondary dimensions were cleanly separated and unusually explicit;
- 4 zero-proposal cases that were conspicuously weak or metadata-shaped;
- most positive cases were intentionally written around one desired capability and lacked realistic competing signals.

Therefore F.1 infrastructure was proven, but its real-world discriminating power was not.

## Hardened benchmark design

The candidate fixture was rewritten before any F.2 provider run and then frozen.

- Benchmark version: `structured-inference-coverage-benchmark/2.0.0`
- Frozen fixture SHA256: `732E7D740297A3D96A42E2B357878D37EDE7C1EC0070ED1E1BB53653BE0F3E49`
- Total fixtures: 38
- Difficulty distribution: Level 1 explicit 9; Level 2 implicit-but-clear 17; Level 3 overshadowed 12
- Shape: 29 single-capability; 9 multi-capability
- Polarity: 31 positive; 7 zero-proposal
- Dominant-dimension-overshadowing cases: 9
- Adversarial keyword traps: 8
- Canonical families: 12/12 represented
- Full required canonical-label occurrences: 1/38, confined to Level 1
- Full required canonical-label occurrences in Levels 2–3: 0
- Distinctive required-label token occurrences: 7/38

Family fixture participation through required capabilities:

| Canonical family | Fixture count |
| --- | ---: |
| Analytics & Insight | 4 |
| Commercial | 4 |
| Communication & Collaboration | 1 |
| Customer & Market | 3 |
| Data & Technology | 3 |
| Governance & Risk | 4 |
| Leadership | 1 |
| Learning & Development | 2 |
| Operations & Delivery | 6 |
| People & Organisation | 3 |
| Product | 3 |
| Strategy & Transformation | 7 |

The hard cases span platform/tool rollout, governance/control programmes, analytics decision products, process redesign, customer/go-to-market work, migration/transition programmes, commercial partnerships, organisation change and product operating systems. They use compressed CV-style action/outcome language and do not reproduce, paraphrase or tokenize Founder evidence.

## Difficulty and expectation model

- `LEVEL_1_EXPLICIT`: the demonstrated dimension is reasonably obvious and acts as a clean-control layer.
- `LEVEL_2_IMPLICIT_CLEAR`: the dimension follows from professional action/outcome structure without requiring canonical wording.
- `LEVEL_3_OVERSHADOWED`: one or two obvious dimensions compete with another independently material dimension expressed through coordination, adoption, governance, influence, operating change or enablement.

Every Level 3 case includes a human-readable rationale for every required capability. Rationale keys must exactly equal required IDs, and the deterministic fixture test enforces this. Required labels were frozen before provider execution and were not relaxed after failures.

## Adversarial precision cases

The hardened set explicitly tests:

- tool use without tooling enablement;
- participation in change without change leadership;
- stakeholder attendance without influence or delivery;
- compliance with a control without control ownership;
- transformation as project context only;
- grammatical use of “led” without leadership scope;
- collaboration language without meaningful cross-functional delivery;
- title, education and skills metadata without performed evidence.

All seven zero-proposal cases stayed at zero in all three runs. The positive tool-use trap produced the required analytical capability without producing tooling enablement.

## Unchanged production-prompt measurement

Prompt: `career-capability-inference-prompt/1.0.0`

Model: `gemini-3.6-flash`

Run policy: three controlled runs, matching F.1. No resampling continued after the planned third run.

| Metric | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Overall required recall | 83.33% | 78.57% | 78.57% |
| Level 1 required recall | 100% | 100% | 100% |
| Level 2 required recall | 100% | 100% | 100% |
| Level 3 required recall | 65% | 55% | 55% |
| Dominant-dimension-overshadowing recall | 65% | 55% | 55% |
| Multi-capability completeness | 33.33% | 22.22% | 22.22% |
| Forbidden false-positive rate | 2.33% | 0% | 0% |
| Zero-proposal precision | 100% | 100% | 100% |
| Evidence-link validity | 100% | 100% | 100% |
| Unknown canonical IDs | 0 | 0 | 0 |
| Duplicate mappings | 0 | 0 | 0 |
| Validator rejection rate | 0% | 0% | 0% |
| Unexpected outputs | 3 | 0 | 0 |
| Average proposals per fixture | 1.105 | 0.921 | 0.947 |

Proposal-count distributions:

| Proposal count | Run 1 fixtures | Run 2 fixtures | Run 3 fixtures |
| ---: | ---: | ---: | ---: |
| 0 | 7 | 7 | 7 |
| 1 | 20 | 27 | 26 |
| 2 | 11 | 4 | 5 |
| 3 | 0 | 0 | 0 |

Per-family required recall:

| Family | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Analytics & Insight | 100% | 100% | 100% |
| Commercial | 75% | 75% | 100% |
| Communication & Collaboration | 100% | 100% | 100% |
| Customer & Market | 100% | 100% | 100% |
| Data & Technology | 33.33% | 33.33% | 33.33% |
| Governance & Risk | 75% | 50% | 50% |
| Leadership | 100% | 100% | 100% |
| Learning & Development | 50% | 50% | 50% |
| Operations & Delivery | 66.67% | 66.67% | 66.67% |
| People & Organisation | 100% | 100% | 100% |
| Product | 100% | 100% | 100% |
| Strategy & Transformation | 100% | 85.71% | 71.43% |

## Repeated completeness pattern

The misses are confined to Level 3 and recur across unrelated domains:

- field-service application rollout repeatedly retained the adoption/change dimension while omitting tooling enablement;
- procurement controls repeatedly omitted cross-functional operationalisation and sometimes the risk-control dimension;
- marketing investment evidence repeatedly retained marketing effectiveness while omitting investment governance;
- case-platform migration repeatedly retained dependency management while omitting tooling enablement and learning delivery;
- product decision cadence repeatedly retained product cadence/roadmap governance while omitting cross-functional delivery;
- commercial partnership strategy, channel partnership and organisation-change secondary dimensions varied by run.

This is the specified dominant-dimension-overshadowing failure class: the model usually returns one or two defensible obvious dimensions but stops before every independently material dimension is represented.

## Overmapping and expectation stability

There is no systematic overmapping. Two runs had zero forbidden hits and zero unexpected outputs. Run 1 had three local extras across 38 fixtures, while average proposal count remained close to one and no fixture received three proposals.

One transition case produced `change-leadership` once where the frozen expectation treated it as forbidden, and one channel case produced an adjacent partner-strategy interpretation. These are bounded expectation tensions, not broad instability: the generalized finding does not depend on either case. Multiple other hard cases have repeated missing required dimensions with exact evidence links and no validator issues. No expectation was changed after results were observed.

Benchmark classification: `DISCRIMINATING`, not `UNSTABLE_EXPECTATIONS`.

## Founder holdout

The exact existing Founder holdout was replayed once only after benchmark freeze and all three baseline runs. No raw Founder evidence is reproduced.

- State SHA256: `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`
- Evidence-text SHA256: `B485AFA1D38CD30D598B1612BB0668FC2CEC6C14C7A843D194024ABAD046055A`
- Evidence link exact: yes
- Validator response issues: 0
- Rejected evidence results: 0
- Returned capabilities: `analytics-governance`, `tooling-enablement`
- Previously missed supported dimension recovered: no

The untouched Founder holdout fails in the same way as the hard benchmark class: obvious dimensions survive, while another independently supported dimension is omitted.

## Interpretation matrix

Result: `CASE A`.

The hardened benchmark shows repeated weakness specifically in Level 3, overshadowed multi-dimensional evidence, and the Founder holdout fails similarly. Clean evidence, implicit single-dimension evidence, negatives, precision, linkage, canonical identity and validator behavior remain strong.

This supports a generalized structured-inference completeness defect. It does not support a Founder-specific keyword rule, ontology change, validator change or downstream patch.

## Recommendation

Recommend one separately admitted generalized production-inference repair using this frozen hardened benchmark as the admission gate. The future repair must improve Level 3 and multi-capability completeness without materially reducing zero-proposal precision, increasing forbidden outputs, weakening validation, or regressing any family. The Founder case remains a final untouched holdout and must not become the design target.

No production inference, validator, canonical library, eligibility, materializer, projection, renderer, provider/API, persistence, package or control file was modified in Task F.2.
