# Post-MVP Task F.11 — Single-Stage Semantic-Contract Runtime

## Decision

- Final decision: `POST_MVP_TASK_F11_SEMANTIC_REPRODUCTION_INSUFFICIENT`.
- Product/truth judgment: `TASK_F11_SEMANTIC_REPRODUCTION_INSUFFICIENT`.
- The production candidate is locally correct and preserves the admitted simple architecture, but it is not eligible for staging because one ordinary benchmark run missed the explicit minimum Level-3 floor and variance regressed versus F.10.
- No Founder holdout, staging, commit, push, production admission, control closure, or Task E work was performed.

## Baseline and superseded experiment normalization

- Starting repository: `master` at `d797941bf63f1ab43670be4a86fe0712564fdf5c`, aligned with `origin/master`; index empty.
- Starting worktree entries: 58, including intentional experimental/HOLD dirt.
- The dirty provider SHA256 was `8F2B04BB388FF9602E1F95E4665E5ED9B12AA7438F5E3D1420754F5FDB321549`.
- The dirty provider-test SHA256 was `25B6CE6ED6F8246BF3FFBE5820ECDE69719EB659FAACF9EE3B0410CED6FA1E9F`.
- Their diffs contained only the known superseded F.5 two-call behavior-decomposition candidate plus F.3-style completeness instructions. Both exact paths were restored to committed HEAD under the explicit normalization authorization.
- Worktree entries after normalization: 56. No unrelated entry was changed.

## Immutable authority

- Canonical authority: `lib/career-possibility/canonical-capability-library.ts`, content version `1.3.0`.
- Canonical inventory: 51 capabilities, 12 families, 51/51 semantic contracts, 104 neighbour distinctions.
- Benchmark: `structured-inference-coverage-benchmark/2.1.0`.
- Benchmark SHA256: `B4BC948CABB7D37C032CF3080056C804872B7F523315FB1B36A4EC76F083A55A`.
- F.10 artifact SHA256: `7C91B96A4CC66C7D1ADA0DE64FB80FD16BFC76C0BB2E754A283D5A77190F14F4`.
- Canonical authority and benchmark were not modified.

## Production candidate

- Production owner: `lib/career-possibility/career-capability-structured-inference-gemini-provider.ts`.
- Focused test owners: `tests/career-possibility/career-capability-structured-inference-gemini-provider.test.ts` and the necessary authority-flow assertion in `tests/career-possibility/career-capability-structured-production-integration.test.ts`.
- Before: canonical context contained `id`, `label`, and `family`.
- Candidate: the same provider reads the existing deterministic serializer directly from canonical authority, supplying `id`, `label`, `family`, `definition`, `positiveEvidence`, `notSufficient`, and `distinctions` for all 51 capabilities in authoritative order.
- Canonical semantic context: 45,294 characters, approximately 11,324 conceptual tokens.
- No capability definition, exclusion, or neighbour map is duplicated in the provider.
- Model remains `gemini-3.6-flash`; temperature remains 0.1; timeout remains 90 seconds.
- One full evidence batch, one full canonical set, and exactly one provider call remain authoritative. Retry count is 0.
- Final structured output schema, max-3, validator, eligibility, materializer, graph projection, role alignment, and privacy boundary remain unchanged.
- F.3 completeness prompting, F.5 decomposition/two-stage inference, and F.7 partitioning/P2/P3 are absent.

## Deterministic verification

Passed:

- focused provider semantic-context test
- all 51 semantic fields and deterministic canonical ordering
- direct canonical-authority serialization and no provider-local semantic dictionary
- Analytics Governance, Commercial Partnerships, and Service Performance authority-flow boundaries
- one-call/no-retry architecture and unchanged response schema/max-3
- atomic evidence presence and forbidden résumé metadata absence
- canonical semantic-contract integrity
- benchmark 2.1.0 deterministic contract
- structured validator and canonical-ID/evidence-link validation
- production structured integration and mapping
- provisional materialization/state
- evidence-grounded and ranked graph projections
- role/canonical reconciliation
- TypeScript
- targeted ESLint over the exact candidate files
- production build

## Live production-candidate benchmark

Exactly three full 38-case runs were made through the actual candidate. No retry, replacement, cherry-picking, prompt tuning, or benchmark mutation occurred.

| Run | Overall | L1 | L2 | L3 | Multi complete | Secondary recall | Forbidden FP | Zero precision | Link validity | Unknown IDs | Duplicates | Rejections | Calls | Prompt tokens | Total tokens | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 78.57% | 100% | 100% | 55% | 11.11% | 36.36% | 0% | 100% | 100% | 0 | 0 | 0% | 1 | 9,628 | 17,069 | 33.032s |
| 2 | 88.10% | 100% | 100% | 75% | 44.44% | 63.64% | 0% | 100% | 100% | 0 | 0 | 0% | 1 | 9,628 | 16,661 | 33.061s |
| 3 | 85.71% | 100% | 100% | 70% | 44.44% | 63.64% | 0% | 100% | 100% | 0 | 0 | 0% | 1 | 9,628 | 17,739 | 36.762s |

Primary aggregates:

- Median overall recall: 85.71%.
- Median Level-3 recall: 70% — admission median floor passed.
- Minimum Level-3 recall: 55% — admission minimum floor of 60% failed.
- Median multi-capability completeness: 44.44% — floor passed.
- Minimum multi-capability completeness: 11.11% — no complete collapse.
- Median overshadowed-secondary recall: 63.64% — floor passed.
- Zero-proposal precision: 100% in every run.
- Forbidden false-positive rate: 0% in every run.
- Evidence-link validity: 100%; unknown IDs 0; duplicates 0; validator rejections 0.
- Aggregate proposal distribution: 21 zero, 77 single, 16 double, 0 triple.

## Per-family median recall

| Family | F.11 median |
|---|---:|
| Analytics & Insight | 100% |
| Commercial | 75% |
| Communication & Collaboration | 100% |
| Customer & Market | 100% |
| Data & Technology | 33.33% |
| Governance & Risk | 100% |
| Leadership | 100% |
| Learning & Development | 50% |
| Operations & Delivery | 66.67% |
| People & Organisation | 100% |
| Product | 100% |
| Strategy & Transformation | 100% |

Governance & Risk and Strategy & Transformation preserved or exceeded the F.10 improvements. Data & Technology regressed from the F.10 A1 median of 66.67% to 33.33%, occurring in two of three F.11 runs. This reinforces the failed reproduction judgment.

## Variance, cost, and context pressure

- Variance: `VARIANCE_REGRESSED`. Level-3 spread widened from 5 percentage points in F.10 A1 to 20 points; multi-capability spread widened from 11.11 to 33.33 points; secondary-recall spread widened from 0 to 27.27 points.
- Prompt usage: 9,628 tokens per run, matching F.10 A1.
- Total tokens: 17,069 / 16,661 / 17,739; aggregate 51,469; median 17,069.
- Latency: 33.032 / 33.061 / 36.762 seconds; aggregate 102.855 seconds; median 33.061 seconds.
- Cost/latency: `SINGLE_CALL_SEMANTIC_COST_ACCEPTABLE` and essentially aligned with F.10 A1.
- Context pressure: `NO MATERIAL CONTEXT PRESSURE`. There were no timeouts, missing evidence IDs, schema truncation, rejected outputs, or late-batch collapse.
- Max-3 was not a bottleneck; no result reached three proposals.

## Founder gate and disposition

The generalized admission gate failed before the Founder holdout because minimum Level-3 recall was 55%, below the explicit 60% floor. The untouched Founder holdout was therefore not run. Historical Founder mappings remain reference-only: `analytics-governance` and `tooling-enablement`; F.10 A1 also recovered `change-leadership`. F.11 makes no Founder-result claim.

The candidate remains uncommitted and unstaged for Founder/EM review. The evidence does not justify reintroducing F.3, F.5, or F.7, but it also does not permit automatic single-stage runtime admission under the locked F.11 floors. The smallest safe next action is `REGROUP` for Founder/EM judgment; do not tune, rerun, stage, or begin Task E.
