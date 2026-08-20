# CareerTwin Post-MVP Task F.6 — Batch-Scale / Cross-Evidence Competition Isolation

## Decision

`POST_MVP_TASK_F6_MULTIPLE_BATCH_MECHANISMS_ISOLATED`

Primary mechanism: `STAGE2_BATCH_CONTEXT_COMPETITION`.

Secondary mechanism: `EVIDENCE_NEIGHBOR_COMPETITION` / evidence-order sensitivity inside shared mapping calls.

Stage 1 did not show a safe material batch effect. Output truncation and the six-behavior bound were not supported as causes.

## Preserved state

- Branch: `master`.
- HEAD and `origin/master`: `ce8f8ffc85ea9ef8371e9cc4c410595607fac039`.
- F.5 decision: `POST_MVP_TASK_F5_GENERALIZED_REPAIR_INSUFFICIENT`.
- Frozen benchmark SHA256: `732E7D740297A3D96A42E2B357878D37EDE7C1EC0070ED1E1BB53653BE0F3E49`.
- F.5 combined provider/test/evaluator diff SHA256 before and after F.6: `320FCDC7FF021D587219F1A42134EC1AF43FC580864DF367690318819726DF46`.
- F.5 provider SHA256: `8F2B04BB388FF9602E1F95E4665E5ED9B12AA7438F5E3D1420754F5FDB321549`.
- F.5 provider-test SHA256: `25B6CE6ED6F8246BF3FFBE5820ECDE69719EB659FAACF9EE3B0410CED6FA1E9F`.
- F.5 coverage evaluator SHA256: `76BB27B8B2A43DB5634E2976B892E676C1688A84CD1A64EB5EBB942CA90613C4`.
- F.5 holdout evaluator SHA256: `856F67D0775FB20DD1741976A71C0046A0DE074039FDE2F467B3522DADF3D4B3`.

F.6 did not mutate the production candidate, tests, existing evaluators, benchmark, or any committed production truth. All partitioning logic lived in the untracked diagnostic harness `scripts/experiment-career-capability-batch-scale.ts`.

## F.5 failure summary

F.5 used one 38-item Stage-1 call and one 38-item Stage-2 call. Its three full-benchmark runs returned Level-3 recall 55/55/55%, multi-capability completeness 22.22/22.22/33.33%, and overshadowed-secondary recall 54.55/54.55/45.45%, despite strong precision. The earlier 12-case F.4 two-stage arm had returned 90% Level 3, 77.78% multi-completeness, and 81.82% secondary recall.

## Fixed partitions and hashes

Every partition was generated from the frozen benchmark order before its run. Stage-2 chunks always received all 51 canonical capabilities. No benchmark labels, expected answers, family routing, or reduced canonical sets affected partitioning.

| Experiment | Stage-1 partitions | Stage-2 partitions | Partition SHA256 |
| --- | --- | --- | --- |
| FF 38/38 | 38 | 38 | `29008C753EED983E48CBEA4E77EFB73DB914F751A1E97B57C2F50D650C357061` |
| CF size 13 | 13 / 13 / 12 | 38 | `CB33A45C4AF10D5729D40571E81BFB0B45B202A54EF00621BB628E59EFD265B8` |
| FC size 13 | 38 | 13 / 13 / 12 | `B8F5DBC987929E0C5780E3C7309045F553154016C4F7345CA5B44A82D65F8840` |
| CC size 13 | 13 / 13 / 12 | 13 / 13 / 12 | `0492A83436461314783911C8F625A149A3C6600DA028788BB57CB87154528D78` |
| FC size 19 | 38 | 19 / 19 | `2DC6BA35F34C237FC76D1DCF1DCA80E4BF7315A21C19D9087151E889F2804BA2` |
| FC size 8 | 38 | 8 / 8 / 8 / 8 / 6 | `84DDE076F6F6555A571F2D62A9160F55E6DF6EB244C56AF96AA881738E86DC17` |
| FC size 4 | 38 | 4 × 9 / 2 | `33F8AC93DB074E3E6CBD99D8084C580CA6E9BC3B66AD6B632DA4838A1BCAE88B` |
| FF reversed | reversed 38 | reversed 38 | `12FC8399542EB62FAA6236FF956F634C178F1704990204683AA2CF2CC3C84DE1` |
| Neighbor grouped | grouped 12 | grouped 12 | `3D24FA967DC370750AA06F80A388B585B98BE546CCCDC0CEF99C2EB57ECC5815` |
| Neighbor interleaved | interleaved 12 | interleaved 12 | `87F1C54765F5CC86ADBA2AEB1AAF602B2F005EBD34494E0D1DCC8293BA429A1F` |

The grouped and interleaved controls used the same six persistent Level-3 targets and the same six easy/adversarial fixtures. Only their evidence order and neighborhood changed.

## Principal architecture isolation

| Arm | S1 calls | S2 calls | Overall | L1 | L2 | L3 | Multi | Secondary | Forbidden FP | Zero precision | Avg proposals |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| FF 38/38 | 1 | 1 | 83.33% | 100% | 100% | 65% | 44.44% | 72.73% | 0% | 100% | 1.026 |
| CF size 13 | 3 | 1 | 78.57% | 100% | 100% | 55% | 33.33% | 63.64% | 0% | 100% | 0.921 |
| FC size 13 | 1 | 3 | 90.48% | 100% | 100% | 80% | 55.56% | 72.73% | 1.16% | 100% | 1.289 |
| CC size 13 | 3 | 3 | 95.24% | 100% | 100% | 90% | 77.78% | 81.82% | 1.16% | 85.71% | 1.316 |

### Stage 1 classification

`NO_STAGE1_BATCH_EFFECT` as a safe improvement mechanism.

Chunking Stage 1 from one call to three increased average behavior count from 1.84 to approximately 2.00–2.03, but CF final quality fell below FF. CC added recall only while also converting a zero case into a mapping. Therefore no safe material Stage-1 benefit is supported. Behavior count alone is not a semantic answer key.

### Stage 2 classification

`MATERIAL_STAGE2_BATCH_EFFECT`.

Holding Stage 1 full while chunking only Stage 2 raised Level-3 recall from 65% to 80%, multi-completeness from 44.44% to 55.56%, and overall recall from 83.33% to 90.48%. Zero precision, linkage, IDs, duplicates, and validator integrity remained intact. The 1.16% forbidden rate remained below the prior 2.33% ceiling.

## Stage-2 batch-size response curve

| Stage-2 size | L3 | Multi | Secondary | Forbidden FP | Zero precision | Latency | Calls | Total tokens |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 38 | 65% | 44.44% | 72.73% | 0% | 100% | 55.803s | 2 | 18,907 |
| 19 | 75% | 44.44% | 72.73% | 0% | 100% | 68.547s | 3 | 21,716 |
| 13 | 80% | 55.56% | 72.73% | 1.16% | 100% | 80.587s | 4 | 26,218 |
| 8 | 70% | 55.56% | 72.73% | 2.33% | 57.14% | 101.170s | 6 | 30,971 |
| 4 | 80% | 55.56% | 81.82% | 3.49% | 57.14% | 141.766s | 11 | 45,646 |

The curve is non-monotonic. Sizes 19 and 13 form the apparent bounded useful region. Size 13 gave the strongest precision-acceptable result in this one-run isolation, while sizes 8 and 4 materially damaged zero precision and increased cost. F.6 does not select a production chunk size; that choice and multi-run verification belong to the next admitted repair.

## Stage-1 direct diagnostics

No private or capability-derived Stage-1 answer key was created. Direct comparison is limited to structural/comparative behavior metrics and downstream controlled Stage-2 results.

- Full 38-item Stage 1: average behavior count 1.82–1.89 across measured runs; empty rate 5.26%; maximum-six bound hit rate 0%; duplicates 0; missing evidence IDs 0.
- Size-13 Stage 1: average behavior count 2.00–2.03; empty rate 5.26%; maximum-six bound hit rate 0%; duplicates 0; missing IDs 0.
- Twelve-item composition controls: averages 2.25–2.33; empty rate 0%; maximum-six bound hit rate 0%.
- No fixture reached six behaviors in any completed arm. The bound is not the current bottleneck.
- Chunked Stage 1 returned more three-behavior outputs, but this did not yield a precision-safe final improvement when Stage 2 stayed full.

## Position, order, and neighbor analysis

### Position

Classification: `NO_POSITION_EFFECT` as a simple early-versus-late mechanism.

Normal FF quartile recall was 100%, 100%, 68.42%, 75%, but benchmark difficulty is ordered with Level-3/adversarial fixtures in the latter half. After reversing evidence order, quartile recall became 100%, 58.82%, 100%, 100%: the low region moved with the hard evidence rather than remaining late. There is no stable later-item degradation.

### Reversed evidence order

Normal and reversed FF both produced 83.33% overall and 65% Level-3 recall, but case-level misses changed, secondary recall moved from 72.73% to 63.64%, and the reversed run emitted one unknown ID that the validator rejected. This is material case-level order/context sensitivity without a monotonic position bias.

The first reversed attempt aborted at the provider timeout. One documented confirmation attempt completed; no further retry occurred.

### Neighbor composition

Classification: `MATERIAL_NEIGHBOR_EFFECT`.

For the same six target Level-3 fixtures inside the same 12-fixture composition:

- grouped target recall: 71.43%; target secondary recall: 62.5%.
- interleaved target recall: 78.57%; target secondary recall: 75%.
- both retained 0% forbidden FP and 100% zero precision.

The 12.5-point secondary-recall change supports evidence-neighbor/context competition as a secondary mechanism. It does not justify benchmark-aware production ordering.

## Output-pressure and schema audit

Classification: `NO_OUTPUT_PRESSURE_SIGNAL`.

- No completed Stage-1 or Stage-2 arm omitted evidence IDs structurally.
- No Stage-1 result approached the six-behavior bound.
- No duplicate results or structured-array truncation appeared.
- Output token counts increased with more calls, not because any single response approached a configured cap; no explicit output-token limit exists in the F.5 provider.
- One reversed full-batch attempt timed out, which is a latency/failure-exposure signal, not evidence of output truncation.

## Best precision-preserving synthetic architecture

`CHUNKED_STAGE2_ONLY`, represented by FC size 13 in this bounded isolation.

- Overall recall: 90.48%.
- Level 1: 100%.
- Level 2: 100%.
- Level 3: 80%.
- Multi-capability completeness: 55.56%.
- Overshadowed-secondary recall: 72.73%.
- Forbidden FP: 1.16%.
- Zero precision: 100%.
- Proposal distribution: `0:7, 1:15, 2:14, 3:2`.
- Calls: Stage 1 = 1, Stage 2 = 3, total = 4.
- Latency: 80.587s, 1.44× the fresh FF measurement.
- Total tokens: 26,218, 1.39× FF.

CC size 13 achieved higher recall but is disqualified as the winner because zero precision fell to 85.71%. FC sizes 8 and 4 are likewise disqualified for zero-proposal and false-positive regressions.

## Provider-call budget and cost model

Across F.6, 43 provider calls completed and one additional reversed-control call attempt timed out, for 44 attempted calls. No semantic arm was repeatedly sampled. The only repeated command was the documented reversal confirmation after a provider timeout.

Useful bounded FC architectures for 38 items:

- size 19: 1 Stage-1 + 2 Stage-2 calls = 3 total; 68.547s; 21,716 tokens.
- size 13: 1 + 3 = 4 total; 80.587s; 26,218 tokens.

Conceptually, an ordinary inference batch should use a small fixed maximum number of deterministic Stage-2 chunks, not two calls per evidence item. F.6 rejects per-evidence calls, capability-specific calls, retries-until-complete, and recursive processing.

## Recommendations

- Mechanism: `MULTIPLE_BATCH_SCALE_MECHANISMS`, led by `STAGE2_BATCH_CONTEXT_COMPETITION` with secondary `EVIDENCE_NEIGHBOR_COMPETITION`.
- Smallest generalized next repair: `FIXED_STAGE2_CHUNKING` with Stage 1 kept as one batch and a bounded deterministic Stage-2 partition/merge policy.
- Final schema change required: no.
- Validator change required: no.
- Canonical library change required: no.
- Bounded provider call-count increase required: yes.
- F.5 candidate disposition: `KEEP_F5_CANDIDATE_AS_BASE`.
- Benchmark durability: `BENCHMARK_READY_FOR_DURABLE_ADMISSION`.
- Founder holdout: not executed, as required.

The next repair must choose and verify a bounded partition policy without benchmark-aware ordering, randomization, per-evidence calls, or prompt changes. It must re-run the full frozen benchmark across controlled repetitions and reserve the untouched Founder holdout for final validation only.

## Repository boundary

F.6 added only the untracked experimental harness and this untracked artifact. It modified no production, F.5 candidate, benchmark, control, package, validator, canonical-library, or downstream file. Nothing was staged, committed, or pushed. Task E remains blocked.

Single next action: admit a bounded production-repair task for deterministic fixed Stage-2 chunking/merge on top of the preserved F.5 candidate, with chunk policy selection and full three-run benchmark validation inside that repair task.
