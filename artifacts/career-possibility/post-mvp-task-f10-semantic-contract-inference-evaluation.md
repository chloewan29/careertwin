# Post-MVP Task F.10 — Semantic-Contract Inference Evaluation

## Decision

- Evaluation decision: `POST_MVP_TASK_F10_SEMANTIC_CONTRACTS_MATERIALLY_IMPROVE_INFERENCE`.
- Improvement classification: `MATERIAL_GENERALIZED_IMPROVEMENT`.
- Context-cost classification: `SEMANTIC_CONTEXT_COST_MATERIAL_BUT_ACCEPTABLE`.
- Recommended next architecture: `ADMIT_SINGLE_STAGE_SEMANTIC_CONTRACT_RUNTIME`.
- This report does not admit or implement production integration. Founder / EM architecture review is required.

## Clean evaluation identity

- Primary baseline: `master` at `d797941bf63f1ab43670be4a86fe0712564fdf5c`, aligned with `origin/master`; index empty; 58 intentional HOLD/worktree entries preserved.
- Isolation: detached temporary Git worktree at `C:\Users\chloe\SandboxProjects\careertwin-f10-eval-d797941`, checked out from the exact baseline with checkout line-ending conversion disabled.
- Isolated HEAD: `d797941bf63f1ab43670be4a86fe0712564fdf5c`.
- The isolated checkout was clean before temporary evaluation-only edits.
- Benchmark: `structured-inference-coverage-benchmark/2.1.0`, SHA256 `B4BC948CABB7D37C032CF3080056C804872B7F523315FB1B36A4EC76F083A55A`.
- Benchmark expectations and fixtures were not changed.
- Canonical authority: content version `1.3.0`; 51 capabilities; 12 families; 51/51 semantic contracts.

## Controlled architecture

Committed provider truth:

- Provider: `lib/career-possibility/career-capability-structured-inference-gemini-provider.ts`.
- Model: `gemini-3.6-flash`.
- Temperature: `0.1`.
- Timeout: 90,000 ms.
- Retry behaviour: none.
- Batch architecture: one full batch containing all 38 evidence fixtures and the full ordered 51-capability set; one provider call per run.
- Final structured schema and deterministic validator: unchanged; maximum 3 assessments per evidence.
- Provider privacy boundary: atomic `{ evidenceId, evidenceText }` plus canonical context only.

Arm A0 used the committed single-stage prompt and `{ id, label, family }` canonical serialization. Arm A1 used the same prompt, provider, model, sampling, timeout, evidence order, canonical order, output schema, and validator, but deterministically serialized `{ id, label, family, definition, positiveEvidence, notSufficient, distinctions }` for every capability. The exact independent variable was canonical semantic context. No completeness instruction, WHAT/HOW pass, decomposition, second stage, partition, retry, family routing, recursive distinction expansion, benchmark-aware ordering, or fixture-specific logic was added.

## Three-run results

Percentages below are deterministic benchmark scores. `Secondary` is overshadowed-secondary recall. Every run made exactly one provider call.

| Arm/run | Overall | L1 | L2 | L3 | Multi complete | Dominant recall | Secondary | Forbidden FP | Zero precision | Link valid | Unknown IDs | Duplicates | Rejection | Avg proposals | Latency ms | Prompt chars | Prompt tokens | Candidate tokens | Total tokens |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A0-1 | 80.95% | 100% | 100% | 60% | 33.33% | 60% | 54.55% | 0% | 100% | 100% | 0 | 0 | 0% | 0.974 | 25,428 | 13,656 | 2,640 | 2,146 | 8,135 |
| A0-2 | 73.81% | 100% | 100% | 45% | 0% | 45% | 27.27% | 0% | 100% | 100% | 0 | 0 | 0% | 0.895 | 28,074 | 13,656 | 2,640 | 1,913 | 8,934 |
| A0-3 | 71.43% | 100% | 100% | 40% | 0% | 40% | 18.18% | 0% | 100% | 100% | 0 | 0 | 0% | 0.842 | 30,059 | 13,656 | 2,640 | 1,895 | 9,260 |
| A1-1 | 85.71% | 100% | 100% | 70% | 33.33% | 70% | 54.55% | 0% | 100% | 100% | 0 | 0 | 0% | 0.974 | 31,587 | 54,492 | 9,628 | 2,129 | 16,486 |
| A1-2 | 85.71% | 100% | 100% | 70% | 33.33% | 70% | 54.55% | 0% | 100% | 100% | 0 | 0 | 0% | 0.947 | 40,011 | 54,492 | 9,628 | 2,106 | 18,556 |
| A1-3 | 88.10% | 100% | 100% | 75% | 44.44% | 75% | 54.55% | 0% | 100% | 100% | 0 | 0 | 0% | 1.000 | 33,333 | 54,492 | 9,628 | 3,354 | 17,248 |

## Primary comparison

| Measure | A0 median | A0 minimum | A0 spread | A1 median | A1 minimum | A1 spread | Median delta |
|---|---:|---:|---:|---:|---:|---:|---:|
| Overall required recall | 73.81% | 71.43% | 9.52 pp | 85.71% | 85.71% | 2.38 pp | +11.90 pp |
| Level-3 recall | 45% | 40% | 20 pp | 70% | 70% | 5 pp | +25 pp |
| Multi-capability completeness | 0% | 0% | 33.33 pp | 33.33% | 33.33% | 11.11 pp | +33.33 pp |
| Overshadowed-secondary recall | 27.27% | 18.18% | 36.36 pp | 54.55% | 54.55% | 0 pp | +27.27 pp |

A1 improved the median and the minimum across every primary recall measure. Level 1 and Level 2 remained 100% in all six runs. Precision was unchanged: zero-proposal precision remained 100%, forbidden false-positive rate remained 0%, evidence-link validity remained 100%, and unknown IDs, duplicates, validator rejections, and unexpected outputs remained 0. Classification: `VARIANCE_REDUCED`.

Proposal-count distributions across the three runs were A0: 21 zero, 83 single, and 10 double proposals; A1: 21 zero, 75 single, and 18 double proposals. A1 recovered additional independent dimensions without producing 3-item saturation or unsupported spraying.

## Per-family median required recall

| Family | A0 | A1 | Delta |
|---|---:|---:|---:|
| Analytics & Insight | 100% | 100% | 0 pp |
| Commercial | 75% | 75% | 0 pp |
| Communication & Collaboration | 100% | 100% | 0 pp |
| Customer & Market | 100% | 100% | 0 pp |
| Data & Technology | 33.33% | 66.67% | +33.33 pp |
| Governance & Risk | 50% | 100% | +50 pp |
| Leadership | 100% | 100% | 0 pp |
| Learning & Development | 50% | 50% | 0 pp |
| Operations & Delivery | 66.67% | 66.67% | 0 pp |
| People & Organisation | 100% | 100% | 0 pp |
| Product | 100% | 100% | 0 pp |
| Strategy & Transformation | 57.14% | 85.71% | +28.57 pp |

The improvement spans three historically weak/variable families rather than one fixture or one capability. Persistent gaps remain in Commercial, Learning & Development, Operations & Delivery, and some multi-capability combinations, but they do not negate the generalized shift.

## Canonical-boundary readback

The ratified negative and positive boundaries remained stable in all runs: analyst workspace enablement did not become Analytics Governance; metric ownership/control did; a university joint programme did not become Commercial Partnerships; a joint commercial offer did; transformation-status context produced zero capabilities, including no Service Performance or Change Leadership. A1 additionally improved tooling/change separation and Governance & Risk recall without creating forbidden boundary crossings.

## Context cost and pressure

- A0 prompt: 13,656 characters and 2,640 provider-counted prompt tokens per run.
- A1 prompt: 54,492 characters and 9,628 provider-counted prompt tokens per run.
- Increase: 40,836 characters; 6,988 prompt tokens; 3.99x prompt characters and 3.65x prompt tokens.
- Three-run total token usage: A0 26,329; A1 52,290; A1 was 1.99x (+98.6%).
- Median total tokens: A0 8,934; A1 17,248; A1 was 1.93x (+93.1%).
- Median latency: A0 28,074 ms; A1 33,333 ms; A1 was 1.19x (+18.7%).
- Aggregate latency: A0 83,561 ms; A1 104,931 ms; A1 was 1.26x (+25.6%).

There were no timeouts, provider failures, truncated canonical fields, missing positive evidence results, invalid evidence links, output/schema truncation, validator failures, or later-item collapse. Candidate output grew variably but remained valid. Context-pressure classification: `NO_MATERIAL_CONTEXT_PRESSURE_OBSERVED`. The semantic context cost is material but acceptable for this architecture.

## Max-3 observation

No result contained more than two proposals, all validator rejection rates were 0%, and no observed miss was attributable to the maximum of three. The schema remains unchanged.

## Founder holdout

The generalized gate permitted one untouched Founder A1 run. Founder evidence was not used to design serialization, prompts, metrics, or arm selection. Privacy-safe input identity matched the historical state SHA256 `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D` and evidence-text SHA256 `B485AFA1D38CD30D598B1612BB0668FC2CEC6C14C7A843D194024ABAD046055A`.

- Historical mappings: `analytics-governance`, `tooling-enablement`.
- A1 mappings: `analytics-governance`, `change-leadership`, `tooling-enablement`.
- Previously omitted `change-leadership`: recovered.
- Existing mappings: preserved.
- Evidence link: exact.
- Valid evidence results: 1; rejected results: 0; response issues: 0.
- Holdout calls: exactly 1.

This corroborates, but does not determine, the generalized result.

## Interpretation and recommendation

Explicit canonical semantics materially improved hard multi-dimensional inference across all three runs, reduced variance, preserved every hard precision gate, and recovered the historical Founder omission. The simplest architecture has therefore earned the next admission review. Recommendation: `ADMIT_SINGLE_STAGE_SEMANTIC_CONTRACT_RUNTIME`.

Semantic contracts are sufficient alone to justify considering that runtime architecture; this is not a claim of perfect completeness and is not production admission. F.3, F.5, and F.7 retests are not currently justified. No production file, benchmark, control file, package file, schema, or primary-worktree provider was modified, staged, committed, or pushed by F.10.
