# CareerTwin Post-MVP Task F.5 — Bounded Two-Stage Capability Inference Production

## Decision

`POST_MVP_TASK_F5_GENERALIZED_REPAIR_INSUFFICIENT`

Product/truth judgment: `TASK_F5_GENERALIZED_REPAIR_INSUFFICIENT`.

The bounded two-stage production implementation passed every deterministic, architectural, privacy, build, and structural-output gate. It did not pass the full-benchmark semantic completeness thresholds. No Founder holdout, staging, commit, or push was permitted.

## Authoritative inputs

- F.4 mechanism decision: `POST_MVP_TASK_F4_MULTIPLE_MECHANISMS_ISOLATED`.
- Primary isolated mechanism: `SINGLE_PASS_SELECTION_BOTTLENECK`.
- F.3 combined candidate diff before F.5: `842391C5473242AEF89819ED0725E04C82CECC72B886BB2BFFDD26E5BD658686`.
- F.3 provider candidate SHA256: `5DB9469ACF02E9342BE2795981156841AFEBECBE8F7A8D4A003A5DCAE22BBCAD`.
- F.3 provider-test candidate SHA256: `4016F2ECEC9A8111FB93603135CF67035CE29E51F3E85AA3DB1B8F4F8B5C1057`.
- Frozen benchmark SHA256 before and after: `732E7D740297A3D96A42E2B357878D37EDE7C1EC0070ED1E1BB53653BE0F3E49`.
- F.4 artifact SHA256: `ED5B583785950C93909EDD6ADF4B3B929E84D418AD38D74FDB387352C6BEE143`.

## Production ownership audit

The complete implementation fits inside the authorized owner:

- `lib/career-possibility/career-capability-structured-inference-gemini-provider.ts`

This file already owns provider construction, batching, prompts, schemas, response parsing, and the 90-second call timeout. No second production owner or boundary extension was required.

## Candidate two-stage architecture

### Stage 1 — observed professional behaviors

- Receives only `{ evidenceId, evidenceText }` for the existing eligible atomic evidence batch.
- Receives no canonical capability IDs, labels, families, or other resume metadata.
- Returns an internal `{ results: [{ evidenceId, observedBehaviors[] }] }` contract.
- Maximum observed behaviors per item: 6.
- Zero behaviors is valid.
- Each behavior must be a non-empty, trimmed string of at most 240 characters.
- Evidence IDs must exactly and uniquely cover the input batch.
- Case-insensitive duplicate behaviors invalidate Stage 1 and fail closed.
- The output is local, server-only, non-persistent, and never enters Career Map state.
- The prompt requests concise observations only and does not request chain-of-thought or private reasoning.
- Likely behavior, implied responsibility, role expectation, generic project/transformation assumptions, unsupported leadership, and unsupported influence are explicitly rejected.

### Stage 2 — canonical mapping

- Receives the original atomic evidence, validated Stage-1 observations, and the full deterministic canonical set.
- Preserves the F.3 full-set assessment, WHAT/HOW awareness, multi-capability pass, second completeness check, distinctness guard, zero guard, canonical-ID guard, exact evidence-link rule, metadata guard, and untrusted-input rule.
- Stage-1 output is only a discovery aid. The prompt requires every final mapping to be grounded independently in the original evidence and to ignore unsupported observation phrases.
- Final response schema remains unchanged.

### Calls, timeout, and failure behavior

- Before: one provider call per inference batch.
- Candidate: exactly two provider calls per inference batch.
- No per-evidence call loop, semantic retry, recovery call, majority vote, or third call.
- The existing 90-second timeout remains per call, so the bounded operation may consume up to two call timeouts sequentially.
- Stage-1 provider failure or invalid intermediate output stops before Stage 2.
- Stage-2 provider failure propagates without recovery.
- Invalid Stage-2 final output is rejected by the unchanged deterministic validator; it cannot materialize.

## Deterministic verification

Passed before live evaluation:

- Focused two-stage provider success and exactly-two-call test.
- Stage-1 evidence-only and canonical-agnostic prompt test.
- Stage-1 bounded schema, multiple behaviors, zero behaviors, exact IDs, duplicate rejection, and invalid-output tests.
- Stage-1 provider failure test.
- Stage-2 original-evidence, validated-observation, preserved-F.3, and grounding-authority tests.
- Stage-2 provider failure, malformed JSON, and invalid-final-contract tests.
- Privacy sentinel exclusion from both provider prompts.
- No third/recovery call on either failure path.
- Frozen benchmark deterministic contract test.
- Existing structured validator test.
- Canonical library and definition adapter tests.
- Structured mapping and production integration tests.
- Canonical multi-proposal inference test.
- Provisional state/materialization test.
- Evidence-grounded graph projection test.
- `npx tsc --noEmit`.
- Targeted ESLint over production, focused tests, and durable evaluation files.
- `npm run build`.

## Full frozen benchmark results

Exactly three controlled 38-case runs were performed. No fixture retry or prompt tuning occurred.

| Metric | Run 1 | Run 2 | Run 3 | Admission gate |
| --- | ---: | ---: | ---: | --- |
| Overall required recall | 78.57% | 78.57% | 78.57% | contextual |
| Level 1 recall | 100% | 100% | 100% | pass |
| Level 2 recall | 100% | 100% | 100% | pass |
| Level 3 recall | 55% | 55% | 55% | **fail: median ≥80%, minimum ≥75%** |
| Multi-capability completeness | 22.22% | 22.22% | 33.33% | **fail: median ≥65%, minimum ≥55%** |
| Dominant-dimension recall | 55% | 55% | 55% | fail materially improved requirement |
| Overshadowed-secondary recall | 54.55% | 54.55% | 45.45% | **fail: median ≥75%** |
| Forbidden false-positive rate | 2.33% | 0% | 0% | bounded |
| Zero-proposal precision | 100% | 100% | 100% | pass |
| Evidence-link validity | 100% | 100% | 100% | pass |
| Unknown canonical IDs | 0 | 0 | 0 | pass |
| Duplicate mappings | 0 | 0 | 0 | pass |
| Validator rejection rate | 0% | 0% | 0% | pass |
| Provider call count | 2 | 2 | 2 | pass |
| Provider latency | 53.183s | 46.040s | 48.215s | bounded |
| Prompt tokens | 6,324 | 6,299 | 6,395 | measured |
| Candidate tokens | 3,896 | 3,669 | 3,848 | measured |
| Total tokens | 18,325 | 16,564 | 17,306 | bounded two-stage cost |

Medians/minima:

- Median Level 3: 55%; minimum 55%.
- Median multi-capability completeness: 22.22%; minimum 22.22%.
- Median overshadowed-secondary recall: 54.55%.

## Before/after comparison

- F.2 Level 3: 65/55/55%; F.3: 70/60/70%; F.5: 55/55/55%.
- F.2 multi-completeness: 33.33/22.22/22.22%; F.3: 44.44/33.33/44.44%; F.5: 22.22/22.22/33.33%.
- The candidate therefore failed to reproduce the F.4 12-case challenge result at full 38-item batch scale and regressed from the F.3 prompt-only arm.

The likely new mechanism is batch-scale/context competition: Stage 1 and Stage 2 each process 38 evidence items in one call, producing substantially larger prompt/output contexts than the 12-case F.4 experiment. This is an inference from the measured scale difference, not yet a proven root cause. It must not be patched without a new isolation task.

## Per-family recall

Values are run 1 / run 2 / run 3.

| Family | F.3 | F.5 | Judgment |
| --- | --- | --- | --- |
| Analytics & Insight | 100 / 100 / 100% | 100 / 100 / 100% | intact |
| Commercial | 75 / 75 / 100% | 75 / 100 / 100% | intact/improved |
| Communication & Collaboration | 100 / 100 / 100% | 100 / 100 / 100% | intact |
| Customer & Market | 100 / 100 / 100% | 100 / 100 / 100% | intact |
| Data & Technology | 33.33 / 33.33 / 33.33% | 33.33 / 33.33 / 33.33% | persistent weakness |
| Governance & Risk | 100 / 50 / 100% | 75 / 50 / 50% | weaker |
| Leadership | 100 / 100 / 100% | 100 / 100 / 100% | intact |
| Learning & Development | 50 / 50 / 50% | 50 / 50 / 50% | persistent weakness |
| Operations & Delivery | 66.67 / 66.67 / 66.67% | 66.67 / 66.67 / 66.67% | persistent weakness |
| People & Organisation | 100 / 100 / 66.67% | 66.67 / 66.67 / 100% | variable/weaker median |
| Product | 100 / 100 / 100% | 75 / 100 / 75% | material recurring regression |
| Strategy & Transformation | 100 / 100 / 100% | 100 / 85.71 / 85.71% | weaker |

The recurring Product regression and broader Governance/Strategy weakness independently block automatic admission.

## False positives and proposal distribution

Run 1 repeated the known forbidden `regulatory-compliance` mapping on the regulated-release fixture and the forbidden `change-leadership` mapping on the case-platform fixture. Runs 2 and 3 had no forbidden mappings. The worst run equals, but does not exceed, the F.2 worst-case ceiling.

Proposal distribution:

| Distribution | F.3 run 1 | F.3 run 2 | F.3 run 3 | F.5 run 1 | F.5 run 2 | F.5 run 3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 proposals | 7 | 7 | 7 | 7 | 7 | 7 |
| 1 proposal | 22 | 24 | 22 | 21 | 25 | 26 |
| 2 proposals | 9 | 7 | 9 | 10 | 6 | 5 |
| 3 proposals | 0 | 0 | 0 | 0 | 0 | 0 |

Classification: `NO_OVERMAPPING_REGRESSION`. The failure is under-mapping, not proposal inflation.

## Latency and cost classification

- Latency classification: `ACCEPTABLE_BOUNDED_LATENCY_INCREASE` structurally; exactly two batched calls occurred in every run.
- Cost classification: `BOUNDED_APPROXIMATELY_TWO_STAGE_COST`.
- The total-token range was 16,564–18,325 for the full benchmark batch.
- No dollar cost is claimed because the repository contains no authoritative pricing basis.
- Latency/cost are not the blocking gate; semantic recall is.

## Founder holdout and downstream readback

- Founder holdout executed: no. The generalized benchmark gates failed first.
- Founder provider calls: 0.
- Materialization: `MATERIALIZATION_NOT_EXERCISED_BY_HOLDOUT_HARNESS`.
- Graph readback: not exercised against real state; committed deterministic materialization and graph evidence-grounding regressions passed.

## Infrastructure disposition

- Frozen benchmark: proven valuable and still `BENCHMARK_READY_FOR_DURABLE_ADMISSION`, but not staged because F.5 failed its staging gate.
- Coverage evaluator: generic/manual evaluation infrastructure, not ordinary CI.
- Holdout evaluator: `GENERIC_DURABLE_HOLDOUT_HARNESS`; it is parameterized and contains no Founder path, identifier, or expected mapping. It was not staged because F.5 failed.
- F.4 mechanism-isolation harness: diagnostic only and not staged.
- F.3/F.5 candidate production changes remain unstaged experimental work.

## Architecture and remaining concerns

The candidate preserved the final schema, deterministic validator, canonical authority, evidence eligibility, privacy input boundary, materializer, graph projection, renderer, persistence, and Job Copilot boundaries. Canonical missing decision boundaries remain a separate future semantic-quality concern and were not changed.

Remaining material defect: full-batch Level-3 and multi-capability under-mapping remains at or below the original baseline despite the successful small-subset two-stage experiment.

Single next action: `REGROUP` for Founder/EM admission of a narrow batch-scale mechanism-isolation task. Do not tune the Founder holdout, stage this candidate, or proceed to Task E.
