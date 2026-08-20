# Post-MVP Task F.1 — Structured Inference Coverage Benchmark

Status: `MEASURED / PRODUCTION REPAIR NOT ADMITTED BY BENCHMARK`

Decision: `POST_MVP_TASK_F1_BENCHMARK_SHOWS_NO_GENERALIZED_DEFECT`

## Scope and architecture

Task F.1 evaluated whether strong multi-dimensional atomic evidence is systematically under-mapped by structured capability inference. The canonical capability library remained the only semantic authority. The validator, eligibility boundary, materializer, graph projection, renderer, role knowledge, persistence, and control documents were unchanged.

No Founder text or Founder-specific expectation was used to design the benchmark. No production prompt repair was made because the frozen baseline did not establish a generalized completeness failure.

## Durable benchmark

- Benchmark version: `structured-inference-coverage-benchmark/1.0.0`
- Fixture count: 26
- Canonical families represented: 12/12
- Single-capability, multi-capability, cross-family, technical-plus-change/adoption, zero-proposal, overmapping-temptation, adjacent-capability, metadata/title/education/skills-negative cases: represented
- Multi-capability cases: 7
- Zero-proposal cases: 4
- Benchmark fixture SHA256: `189211343B9C5D7BC9ACF566F10C1DCE5BD850C186EC2F013E34B40CB2D652C6`
- Deterministic benchmark contract/invariant test: `PASS`
- Semantic provider evaluation is an explicit script, separate from ordinary deterministic test execution.

## Unchanged-prompt baseline

Production prompt version: `career-capability-inference-prompt/1.0.0`

Model: `gemini-3.6-flash`

Three runs were used because provider semantics are probabilistic even at low temperature.

| Metric | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Required recall | 100% | 100% | 100% |
| Multi-capability completeness | 100% | 100% | 100% |
| Zero-proposal precision | 100% | 100% | 100% |
| Forbidden false-positive rate | 1.64% | 0% | 0% |
| Evidence-link validity | 100% | 100% | 100% |
| Unknown canonical IDs | 0 | 0 | 0 |
| Duplicate mappings | 0 | 0 | 0 |
| Validator rejection rate | 0% | 0% | 0% |
| Unexpected outputs | 1 | 0 | 0 |
| Average proposals per fixture | 1.231 | 1.192 | 1.192 |

Every canonical family achieved 100% required recall in every run. No family showed a coverage regression because no repair was applied.

The only precision miss occurred in run 1: the adjacent variance-analysis case also emitted `forecasting`, which was explicitly forbidden for that fixture. The same case did not overmap in runs 2 or 3. This is a bounded adjacent-capability variance, not systematic proposal inflation.

## Repair gate decision

The baseline already satisfies the requested generalized acceptance principles:

- multi-capability completeness is complete and stable;
- required recall is complete and stable;
- zero-proposal behavior is complete and stable;
- forbidden false positives are zero in two runs and 1.64% in one run;
- evidence linkage and canonical identity are exact;
- validator rejection and duplicate counts are zero;
- every family has complete required recall;
- average proposal counts remain bounded near 1.2 and show no systematic overmapping.

Therefore a before/after production prompt repair is not authorized by the evidence. Editing `buildPrompt()` solely to recover the known Founder case would be a case-specific patch and would create precision risk without a demonstrated generalized benchmark deficit.

Production owner result: `UNCHANGED`.

## Founder holdout

The previously accepted real-state evidence was used only after generalized benchmark measurement. No raw Founder text is retained here.

- Holdout: `TRANSFORMATION_PROJECT_EVIDENCE_CANDIDATE_01`
- Real-state SHA256: `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`
- Evidence-text SHA256: `B485AFA1D38CD30D598B1612BB0668FC2CEC6C14C7A843D194024ABAD046055A`
- Prompt version: `career-capability-inference-prompt/1.0.0`
- Evidence link: exact
- Validator response issues: 0
- Validator rejected results: 0
- Returned canonical IDs: `analytics-governance`, `tooling-enablement`
- `change-leadership` captured: `NO`
- Existing legitimate mappings preserved: `YES`

The holdout still fails, but a holdout failure alone is explicitly insufficient to admit a generalized repair. Task F's case-level semantic concern remains unresolved and should not be converted into a special-case prompt rule.

## Second real holdout

`SECOND_REAL_HOLDOUT_NOT_AVAILABLE`

The repository has synthetic fixtures and other Founder-derived sources, but no separately accepted privacy-safe non-Founder real-CV state suitable for this holdout. No other person's CV was created, uploaded, or used.

## Privacy-safe inference-health metrics audit

| Aggregate signal | Current measurability without storing evidence text |
| --- | --- |
| Eligible evidence count | available from the builder audit/state counts |
| Unmapped eligible evidence count | derivable from evidence IDs versus admitted mapping links/unresolved state |
| Proposal-count distribution | computable transiently from structured validation output; not retained as a durable health metric |
| Zero-proposal rate | computable transiently; not retained durably |
| Validator rejection rate | computable transiently from validation results; not retained durably |
| Canonical family coverage distribution | derivable from materialized capability IDs plus canonical family membership |

A later privacy-safe inference-health task would be useful. It should record aggregate counts/distributions only, never evidence text, and requires separate Founder/EM admission. No telemetry was implemented in Task F.1.

## Exact next action

Founder/EM reviews the stable benchmark result and the still-failing holdout. Do not repair or special-case the Founder evidence under Task F.1. Any further work requires a newly admitted task with broader representative evidence capable of proving a generalized defect or a separate product decision about probabilistic single-case reliability.
