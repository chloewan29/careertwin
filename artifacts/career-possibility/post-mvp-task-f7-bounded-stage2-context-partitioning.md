# CareerTwin Post-MVP Task F.7 — Bounded Stage-2 Context Partitioning

## Pre-registered state (written before live policy runs)

- Task mode: `REPAIR`, followed by the explicitly authorized `MEASURE` gate.
- F.6 mechanism: `STAGE2_BATCH_CONTEXT_COMPETITION`, with secondary `EVIDENCE_NEIGHBOR_COMPETITION` / evidence-order sensitivity.
- F.5 base disposition: `KEEP_F5_CANDIDATE_AS_BASE`.
- F.5 combined diff SHA256: `320FCDC7FF021D587219F1A42134EC1AF43FC580864DF367690318819726DF46`.
- F.5 provider SHA256: `8F2B04BB388FF9602E1F95E4665E5ED9B12AA7438F5E3D1420754F5FDB321549`.
- F.5 provider-test SHA256: `25B6CE6ED6F8246BF3FFBE5820ECDE69719EB659FAACF9EE3B0410CED6FA1E9F`.
- Frozen benchmark SHA256: `732E7D740297A3D96A42E2B357878D37EDE7C1EC0070ED1E1BB53653BE0F3E49`.
- F.6 artifact SHA256: `4DFC470A9202E5AB105D5C709899BB515C26F662854A6DFB980A41F4A1AE73A6`.

## Architecture and partition algorithm

Stage 1 remains exactly one full-batch, canonical-agnostic observed-behavior decomposition call. Stage 2 receives the original authorized evidence subset, the validated observed behaviors for exactly those evidence IDs, the unchanged full 51-capability canonical context, and existing contract/version context.

The small-batch no-split threshold is 13 eligible evidence items: batches of 0 through 13 are passed to one Stage-2 mapping call. This is the smallest boundary in the F.6 precision-safe useful region of approximately 13–19 items. Above that threshold, the selected policy's fixed maximum partition count is used. Partitioning is content-agnostic: preserve input order, compute balanced sizes whose difference is at most one, assign the larger partitions first, and slice contiguously. Every item occurs exactly once. There is no semantic, capability, family, employer, title, difficulty, expected-answer, or user-specific routing.

- P2: one Stage-1 call and at most two Stage-2 partitions; 38 items become `19 / 19`, for three total semantic calls.
- P3: one Stage-1 call and at most three Stage-2 partitions; 38 items become `13 / 13 / 12`, for four total semantic calls.

Successful Stage-2 results merge in partition order and then provider result order. The merger adds no semantic authority or deduplication. Any provider error, timeout, absent response, malformed JSON, or structurally absent results stops the operation without retry, fallback, or partial result. The existing final validator remains authoritative.

## Pre-registered selection rule

This rule is frozen before live results and will not be changed afterward.

1. Disqualify a policy if any ordinary run has zero-proposal precision below 100%, evidence-link validity below 100%, any unknown canonical ID, any duplicate mapping, any validator rejection, material systematic overmapping, or a forbidden false-positive rate materially above the historical 2.33% ceiling without Founder/EM review.
2. Require the semantic admission floor: Level 1 is 100% in every ordinary run; Level 2 has no material regression; median Level-3 recall is at least 75% and minimum is at least 70%; median multi-capability completeness is at least 50% and minimum is at least 44%; median overshadowed-secondary recall is at least 70%; zero-proposal precision is 100% in every run.
3. Among policies that survive, compare lexicographically: median Level-3 recall, median multi-capability completeness, median overshadowed-secondary recall, overall recall, per-family stability, then provider calls/latency/tokens.
4. P2 receives the fewer-call tiebreaker only if the policies are semantically close: Level-3 median differs by less than 5 percentage points, multi-capability median by less than 10 points, secondary median by less than 10 points, and there is no meaningful family-stability difference. Otherwise select the semantically superior policy.
5. Freeze exactly one production policy, remove the losing runtime evaluation branch, and run one fresh full-benchmark confirmation. A material contradiction stops as `POST_MVP_TASK_F7_POLICY_UNSTABLE`.
6. Only after that confirmation may the untouched Founder holdout run once. It does not select the policy.

## Deterministic pre-live verification

- Focused provider, partition, merge, failure-path, call-count, and privacy tests: PASS.
- Frozen benchmark contract: PASS.
- Existing validator, structured mapping, production integration, materialization, and graph-projection regressions: PASS.
- TypeScript: PASS.
- Targeted ESLint: PASS.
- Production build: PASS.

## Live policy-selection runs

All six runs used the full frozen 38-case benchmark. They ran in the predeclared P2-then-P3 order. No run was retried, omitted, or cherry-picked.

| Policy/run | Overall | L1 | L2 | L3 | Multi complete | Secondary | Forbidden FP | Zero precision | Link valid | Unknown IDs | Duplicates | Validator rejection | Proposals 0/1/2/3 | Calls | Latency | Total tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| P2-1 | 83.33% | 100% | 100% | 65% | 33.33% | 72.73% | 0% | 100% | 100% | 0 | 0 | 0% | 7/23/8/0 | 3 | 55.325s | 20,122 |
| P2-2 | 88.10% | 100% | 100% | 75% | 44.44% | 63.64% | 0% | 100% | 100% | 0 | 0 | 0% | 7/20/11/0 | 3 | 60.797s | 20,622 |
| P2-3 | 92.86% | 100% | 100% | 85% | 66.67% | 81.82% | 0% | 100% | 100% | 0 | 0 | 0% | 7/20/10/1 | 3 | 59.601s | 20,621 |
| P3-1 | 88.10% | 100% | 100% | 75% | 55.56% | 63.64% | 2.33% | 71.43% | 100% | 0 | 0 | 0% | 5/22/10/1 | 4 | 72.137s | 24,034 |
| P3-2 | 85.71% | 100% | 100% | 70% | 44.44% | 63.64% | 2.33% | 85.71% | 100% | 0 | 0 | 0% | 6/16/14/2 | 4 | 68.351s | 23,024 |
| P3-3 | 88.10% | 100% | 100% | 75% | 44.44% | 63.64% | 0% | 100% | 100% | 0 | 0 | 0% | 7/23/8/0 | 4 | 65.032s | 23,326 |

P2 summary: median Level-3 75%, minimum Level-3 65%; median multi-capability 44.44%, minimum 33.33%; median secondary 72.73%; median overall 88.10%. P2 preserved 100% zero precision, 100% linkage, zero unknown IDs, zero duplicates, zero validator rejections, and 0% forbidden FP in every run. Latencies were 55.325/60.797/59.601 seconds; total tokens were 20,122/20,622/20,621.

P3 summary: median Level-3 75%, minimum Level-3 70%; median multi-capability 44.44%, minimum 44.44%; median secondary 63.64%; median overall 88.10%. Zero precision was 71.43/85.71/100%, and forbidden FP was 2.33/2.33/0%. Linkage remained 100%, with zero unknown IDs, duplicates, or validator rejections. Latencies were 72.137/68.351/65.032 seconds; total tokens were 24,034/23,024/23,326.

### Per-family required recall

| Family | P2-1 | P2-2 | P2-3 | P3-1 | P3-2 | P3-3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Analytics & Insight | 100% | 100% | 100% | 100% | 100% | 100% |
| Commercial | 100% | 100% | 100% | 100% | 100% | 100% |
| Communication & Collaboration | 100% | 100% | 100% | 100% | 100% | 100% |
| Customer & Market | 66.67% | 100% | 100% | 100% | 100% | 100% |
| Data & Technology | 33.33% | 100% | 66.67% | 66.67% | 66.67% | 66.67% |
| Governance & Risk | 100% | 100% | 100% | 100% | 100% | 75% |
| Leadership | 100% | 100% | 100% | 100% | 100% | 100% |
| Learning & Development | 50% | 50% | 100% | 50% | 50% | 100% |
| Operations & Delivery | 66.67% | 66.67% | 66.67% | 66.67% | 66.67% | 83.33% |
| People & Organisation | 66.67% | 66.67% | 100% | 100% | 66.67% | 100% |
| Product | 100% | 100% | 100% | 100% | 100% | 75% |
| Strategy & Transformation | 100% | 85.71% | 100% | 85.71% | 85.71% | 85.71% |

P2 had material run-to-run instability in Data & Technology, Learning & Development, Customer & Market, and People & Organisation. P3 was more stable in Data & Technology but regressed precision and showed variability in Governance & Risk, Learning & Development, Operations & Delivery, People & Organisation, and Product.

## Policy decision

P3 is automatically disqualified by the pre-registered hard precision gate: two ordinary runs lost perfect zero-proposal precision, at 71.43% and 85.71%, and each produced the historical-ceiling 2.33% forbidden FP rate.

P2 survives every precision gate but fails the minimum semantic admission floor. Its 65% minimum Level-3 recall is below 70%; its 44.44% median multi-capability completeness is below 50%; and its 33.33% minimum multi-capability completeness is below 44%. The high variance also prevents treating the stronger third run as systematic improvement.

No policy is selected. The fewer-call tiebreaker is not reached. The temporary evaluation switch and bounded partition implementation were removed, restoring the exact F.5 provider, focused test, and coverage evaluator identities. No non-winning runtime branch remains in production.

## Final production confirmation and holdout

Not run. The pre-registered admission rule prohibited a production freeze, confirmation run, and Founder holdout after both candidate policies failed admission. Founder evidence played no role in policy evaluation. No materialization or graph readback was exercised by the holdout harness; the deterministic committed materialization and graph regressions passed before live evaluation.

## Infrastructure and product judgment

- Product/truth judgment: `TASK_F7_GENERALIZED_REPAIR_INSUFFICIENT`.
- Decision: `POST_MVP_TASK_F7_GENERALIZED_REPAIR_INSUFFICIENT`.
- Cost/latency: both candidates were structurally bounded, with P2 capped at three total semantic calls and P3 at four. Measured cost was not the blocker; classification `BOUNDED_ACCEPTABLE_COST` for the evaluated architectures, but no architecture was admitted.
- Frozen benchmark: remains `BENCHMARK_READY_FOR_DURABLE_ADMISSION`, but durable admission/staging is not performed because F.7 did not pass.
- Holdout evaluator re-audit: `GENERIC_DURABLE_HOLDOUT_HARNESS`; it is parameterized by state path and evidence ID and contains no Founder-specific path, identifier, or expected mapping. It is not staged because F.7 failed.
- F.4 and F.6 experimental harnesses remain untracked diagnostic-only work.
- Canonical decision-boundary overlap remains a `SEPARATE_FUTURE_SEMANTIC_QUALITY_CONCERN`; the canonical library was not modified.
- Remaining material semantic defect: bounded contiguous Stage-2 partitioning did not provide systematic completeness improvement while preserving the required precision. P2 under-mapped below the admission floor; P3 over-mapped zero-proposal cases.
- Privacy boundary, final schema, validator, canonical IDs/order/library, eligibility, materializer, graph projection, and personal-capability ownership remain unchanged.
- Founder holdout run count: 0.
- Staging, commit, and push: not permitted.
- Single next action: `REGROUP` for Founder/EM review of the failed bounded-partition repair before authorizing any different architecture or semantic-quality work.
