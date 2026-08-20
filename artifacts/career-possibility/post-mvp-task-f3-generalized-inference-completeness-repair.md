# CareerTwin Post-MVP Task F.3 — Generalized Inference Completeness Repair

## Decision

`POST_MVP_TASK_F3_GENERALIZED_REPAIR_HOLDOUT_UNRESOLVED`

The generalized repair improved the frozen semantic benchmark systematically and did not create broad overmapping. The one permitted Founder holdout nevertheless retained the two prior accepted mappings and still omitted the independently supported `change-leadership` dimension. The task contract therefore blocks staging, commit, push, and implementation admission.

## F.2 defect and frozen evidence

- Generalized failure class: `DOMINANT-DIMENSION OVERSHADOWING`.
- Frozen benchmark: 38 privacy-safe cases, 12 canonical families, 9 Level 1, 17 Level 2, 12 Level 3, 9 multi-capability cases, 9 dominant-dimension cases, 8 adversarial traps, and 7 zero-proposal cases.
- Frozen benchmark SHA256 before and after repair: `732E7D740297A3D96A42E2B357878D37EDE7C1EC0070ED1E1BB53653BE0F3E49`.
- Task F.2 artifact SHA256: `B7AC8C4BC9F4B2DFD3C0D0276BC25E02F1EE78258EB32321DBC602F50513E04F`.
- The benchmark fixtures, expectations, difficulty labels, failure classes, and zero-proposal expectations were not changed.

## Prompt weakness and generalized repair

The `1.0.0` prompt limited output to three independently grounded assessments but did not require full-canonical-set consideration, WHAT/HOW decomposition, an explicit second completeness pass, reassessment after salient mappings, or a synonym/near-duplicate guard. That allowed the producer to stop after an obvious dimension.

The candidate `1.1.0` prompt adds a generalized two-pass contract:

1. Interpret the actual action/outcome and consider both WHAT was delivered and HOW it was delivered, only where evidenced.
2. Assess the item against the full supplied canonical set, include every materially distinct independently demonstrated dimension up to the unchanged three-item schema limit, and re-check remaining capabilities after obvious selections.

It also states that complete does not mean exhaustive/speculative, requires separate grounding for every proposal, rejects synonyms and near-duplicates, preserves zero proposals, and retains canonical-ID, evidence-only, privacy, and untrusted-input guards.

## Anti-overfit and architecture analysis

- No Founder wording or raw Founder evidence appears in production or deterministic tests.
- No benchmark fixture ID, expected answer, case branch, keyword-to-capability mapping, or capability-specific hint appears in production.
- Provider semantic input remains only `{ evidenceId, evidenceText }` plus supplied `{ id, label, family }` canonical context and existing metadata.
- Output schema, validator, canonical library, eligibility, materializer, evidence linking, and Career Map projection are unchanged.
- Prompt behavior is versioned from `career-capability-inference-prompt/1.0.0` to `career-capability-inference-prompt/1.1.0`.

## Candidate changed and durable files

Candidate production/test changes:

- `lib/career-possibility/career-capability-structured-inference-gemini-provider.ts`
- `tests/career-possibility/career-capability-structured-inference-gemini-provider.test.ts`

Authorized F.1/F.2 evaluation infrastructure retained without benchmark-content changes:

- `tests/career-possibility/fixtures/structured-inference-coverage-benchmark.ts`
- `tests/career-possibility/structured-inference-coverage-benchmark.test.ts`
- `scripts/evaluate-career-capability-structured-inference-coverage.ts`
- `scripts/evaluate-career-capability-structured-inference-holdout.ts`

Because the Founder holdout gate did not pass, none of these files was staged or admitted as durable repository infrastructure.

## Deterministic and build verification

Passed before live evaluation:

- Gemini provider focused test.
- Frozen benchmark contract test.
- Structured inference validator test.
- Canonical capability library and definition-adapter tests.
- Structured mapping and production integration tests.
- Canonical multi-proposal inference test.
- Provisional Career Map state/materialization test.
- Career Map graph projection/evidence-grounding test.
- `npx tsc --noEmit`.
- Targeted ESLint over the provider, benchmark/eval files, and focused tests.
- `npm run build`.

## Before and after metrics

| Metric | F.2 run 1 | F.2 run 2 | F.2 run 3 | F.3 run 1 | F.3 run 2 | F.3 run 3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Overall required recall | 83.33% | 78.57% | 78.57% | 85.71% | 80.95% | 85.71% |
| Level 1 recall | 100% | 100% | 100% | 100% | 100% | 100% |
| Level 2 recall | 100% | 100% | 100% | 100% | 100% | 100% |
| Level 3 recall | 65% | 55% | 55% | 70% | 60% | 70% |
| Dominant-dimension recall | 65% | 55% | 55% | 70% | 60% | 70% |
| Multi-capability completeness | 33.33% | 22.22% | 22.22% | 44.44% | 33.33% | 44.44% |
| Forbidden false-positive rate | 2.33% | 0% | 0% | 1.16% | 1.16% | 1.16% |
| Zero-proposal precision | 100% | 100% | 100% | 100% | 100% | 100% |
| Evidence-link validity | 100% | 100% | 100% | 100% | 100% | 100% |
| Unknown canonical IDs | 0 | 0 | 0 | 0 | 0 | 0 |
| Duplicate mappings | 0 | 0 | 0 | 0 | 0 | 0 |
| Validator rejection rate | 0% | 0% | 0% | 0% | 0% | 0% |

Level 3 improved in all three comparisons by 5, 5, and 15 percentage points. Multi-capability completeness improved in all three comparisons by 11.11, 11.11, and 22.22 points. This is a clear systematic improvement, although substantial Level 3 omissions remain.

## Per-family comparison

Values are run 1 / run 2 / run 3.

| Canonical family | F.2 required recall | F.3 required recall | Judgment |
| --- | --- | --- | --- |
| Analytics & Insight | 100 / 100 / 100% | 100 / 100 / 100% | intact |
| Commercial | 75 / 75 / 100% | 75 / 75 / 100% | intact |
| Communication & Collaboration | 100 / 100 / 100% | 100 / 100 / 100% | intact |
| Customer & Market | 100 / 100 / 100% | 100 / 100 / 100% | intact |
| Data & Technology | 33.33 / 33.33 / 33.33% | 33.33 / 33.33 / 33.33% | unresolved, not regressed |
| Governance & Risk | 75 / 50 / 50% | 100 / 50 / 100% | improved with variance |
| Leadership | 100 / 100 / 100% | 100 / 100 / 100% | intact |
| Learning & Development | 50 / 50 / 50% | 50 / 50 / 50% | unresolved, not regressed |
| Operations & Delivery | 66.67 / 66.67 / 66.67% | 66.67 / 66.67 / 66.67% | unresolved, not regressed |
| People & Organisation | 100 / 100 / 100% | 100 / 100 / 66.67% | one-run variance; no systematic regression |
| Product | 100 / 100 / 100% | 100 / 100 / 100% | intact |
| Strategy & Transformation | 100 / 85.71 / 71.43% | 100 / 100 / 100% | improved |

No family shows a material systematic regression. Data & Technology, Learning & Development, and Operations & Delivery remain persistent weak families.

## Proposal distribution and overmapping

| Distribution | F.2 run 1 | F.2 run 2 | F.2 run 3 | F.3 run 1 | F.3 run 2 | F.3 run 3 |
| --- | --- | --- | --- | --- | --- | --- |
| 0 proposals | 7 | 7 | 7 | 7 | 7 | 7 |
| 1 proposal | 20 | 27 | 26 | 22 | 24 | 22 |
| 2 proposals | 11 | 4 | 5 | 9 | 7 | 9 |
| 3 proposals | 0 | 0 | 0 | 0 | 0 | 0 |
| Average | 1.1053 | 0.9211 | 0.9474 | 1.0526 | 1.0000 | 1.0526 |

Classification: `MINOR_ACCEPTABLE_VARIANCE`. There is no large proposal inflation, zero-case erosion, three-proposal spraying, or broad family spraying.

## False-positive analysis

Each repaired run contains one forbidden mapping: `change-leadership` on the same synthetic case-platform transition fixture. Runs 1 and 2 also contain the non-forbidden unexpected `partner-strategy` mapping on the channel-needs-offer fixture. The forbidden rate is 1.16% in every repaired run, compared with 2.33%, 0%, and 0% before. Precision remains strong in aggregate, but the repeated change/adoption-area false positive is a real minor regression risk and must not be hidden.

Classification: minor, localized precision variance; not material broad overmapping.

## Founder holdout

- Executed only after the generalized benchmark gate, exactly once.
- Before accepted mappings: `analytics-governance`, `tooling-enablement`.
- After proposed/accepted mappings: `analytics-governance`, `tooling-enablement`.
- `change-leadership` recovered: no.
- Validator: one valid evidence result, zero rejected results, zero response issues, exact evidence link.
- Prior legitimate mappings preserved: yes.
- Materialization: not exercised by the holdout harness; existing deterministic materialization regression passed separately.
- Second real holdout: not available; none was manufactured.

## Semantic architecture and future gate

The candidate repair preserves the producer/validator/truth-guard architecture and the evidence-first personal-capability boundary. The live evaluation remains an explicit manual script and is not part of ordinary unit tests, build, or CI.

If this benchmark infrastructure is admitted in a future passing repair, the same frozen benchmark should be reused for structured-capability prompt, provider-behavior, canonical-library-semantic, and inference-integration changes to detect under-mapping, overmapping, family regressions, and zero-proposal regressions. No production telemetry is added here; the privacy-safe aggregate health metrics recommended in F.2 remain future work.

## Product / truth judgment

`TASK_F3_GENERALIZED_REPAIR_HOLDOUT_UNRESOLVED`

Observed: the generalized prompt produces a repeatable completeness improvement with intact structural guards and no broad proposal inflation.

Still unproven: the repair does not recover the known independently supported dimension in the untouched real holdout, and persistent family-level omissions remain.

Required next action: `REGROUP` for Founder / EM review. Do not patch the Founder case, stage the candidate, commit, push, update control memory, close Task F.3, or begin Task E in this turn.
