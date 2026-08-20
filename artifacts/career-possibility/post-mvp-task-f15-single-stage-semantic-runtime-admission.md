# Post-MVP Task F.15 - Single-Stage Semantic Runtime Final Production Admission

## Decision

- Admission decision: `POST_MVP_TASK_F15_SINGLE_STAGE_SEMANTIC_RUNTIME_ADMITTED`.
- Product/truth judgment: `TASK_F15_SINGLE_STAGE_SEMANTIC_RUNTIME_READY_WITH_DOCUMENTED_RESIDUAL`.
- MODE: `ADMISSION / COMMIT`.
- Founder/EM explicitly selected the frozen F.11 single-stage semantic-contract runtime for production.
- The previously proposed retrieval/verification F.15 is cancelled. No retrieval, semantic-neighbour verification, evidence partitioning, binary verification, decomposition, retry, voting, or other multi-call architecture is admitted.

## Scope and authority

- Historical failing layer: Layer 1 structured semantic inference selection.
- Historical first drift: raw provider output omitted supported capabilities before validator or materialization.
- Admitted correction: replace identity-only canonical prompt context with the existing authoritative canonical semantic-contract serialization.
- Out of scope and unchanged: canonical content, benchmark, model, temperature, prompt strategy, output schema, max-3, eligibility, validator, materializer, projection, UI, Founder holdout, control docs, and Task E.
- Starting branch: `master`.
- Starting HEAD and `origin/master`: `d797941bf63f1ab43670be4a86fe0712564fdf5c`.
- Starting index: empty; starting primary worktree count: 59 entries. Intentional unrelated HOLD dirt was preserved.

## Frozen candidate identity

- Provider SHA256: `F50764218E50C3FACB31D4BE9854B83DEC2DBE9C6021340EEB7D2E5D0DFF5212`.
- Provider-test SHA256: `45FAA40DBC20158232227444B1B12B4558C8297538481857D1DDD81382236F65`.
- Production-integration-test SHA256: `B039F5821F0391FC36DFC0A94B245EF4ED44FA4011325DF0F73CD94A72D9328D`.
- Combined binary diff SHA256 against starting HEAD: `B50EDF7BA0523AEFAC5C2770E69F46C72DF3A0366C4C4ABEACE8C154CE900B2E`.
- All four identities matched the Founder/EM lock. The candidate was not reconstructed or redesigned.

## Canonical and benchmark authority

- Canonical capability authority remains content version `1.3.0`, SHA256 `8CD78709F3EE95BE6DE8D62E1748B0E112AAE421C83385D0BC63F03CD9097422`.
- Inventory: 51 capabilities, 12 families, semantic contracts 51/51, 104 directed distinctions.
- The provider obtains semantic content directly from `serializeCanonicalCapabilitySemanticContext(canonicalCapabilityLibrary)`; it contains no provider-local semantic dictionary.
- Benchmark remains `structured-inference-coverage-benchmark/2.1.0`, SHA256 `B4BC948CABB7D37C032CF3080056C804872B7F523315FB1B36A4EC76F083A55A`.
- Neither authority was modified.

## Accumulated evidence accepted by Founder/EM

- F.10 isolated canonical semantic context as the independent variable and found material generalized inference improvement without decomposition, partitioning, retry, routing, prompt completeness repair, or schema changes.
- F.11 implemented the exact production candidate and confirmed its deterministic architecture and authority transport. Its three stochastic runs were not used as a new F.15 gate.
- F.12 characterized this exact candidate over nine fresh temperature-0.1 runs: Level-3 recall 65/65/60/65/70/70/65/65/60%, median 65%, minimum 60%, severe under-mapping tails 0/9, median multi-capability completeness 33.33%, median overshadowed-secondary recall 54.55%, zero-proposal precision 100% every run, forbidden FP 0% every run, evidence linkage 100%, and zero unknown IDs, duplicates, or validator rejections. Temperature 0.0 did not materially improve reliability.
- F.13 isolated four cross-evidence context-competition targets, two full-canonical-competition targets, and one genuine pairwise-comprehension residual.
- F.13.1 ratified `partner-strategy` as REQUIRED and preserved its semantic contract, role usage, benchmark meaning, and canonical identity.
- F.14 found fixed P2 partitioning useful but incomplete and found one-hop semantic-neighbour verification structurally unable to reach the two full-canonical misses. Founder/EM subsequently chose not to pursue that complexity.
- F.15 made no live model or Founder holdout calls. Admission rests on the accumulated evidence and explicit product decision.

## Final production architecture

`eligible atomic professional evidence -> one full-batch provider call -> all 51 canonical capabilities with their authoritative semantic contracts -> existing structured output -> existing validator -> existing materialization -> existing Career Map projection`

- Provider calls per inference batch: 1.
- Retries: 0.
- Full eligible evidence batch: preserved.
- Full canonical set and authoritative order: preserved.
- Behavior decomposition: absent.
- Evidence partitioning: absent.
- Retrieval: absent.
- Verification pass: absent.
- F.3/F.5/F.7 experimental architectures: absent.
- Final public schema, validator, max-3, and privacy boundary: unchanged.

## Deterministic verification

Passed before staging:

- focused semantic-context provider test;
- production structured integration test;
- canonical semantic-contract and canonical-library integrity tests;
- benchmark 2.1.0 deterministic contract test;
- structured validator and mapping/linkage tests;
- provisional text/file build and state/materialization tests;
- evidence-grounded and ranked graph projection tests;
- reviewed-evidence adapter and local-state tests;
- role/canonical registry reconciliation test.

The focused provider test confirmed one call per batch, no retry, 51 canonical capabilities, 45,294 semantic-context characters, direct canonical serialization, unchanged temperature/model/schema/max-3, atomic-evidence-only privacy, and absence of F.3/F.5/F.7 logic.

One additional untracked HOLD test, `tests/career-possibility/career-map-provenance-chain.test.ts`, failed its unrelated education-evidence assertion. It is not tracked at the starting HEAD, is not part of the frozen F.11 candidate, and was neither edited nor staged. All tracked regressions required for the admitted semantic runtime passed.

## Type, lint, and build

- `npx tsc --noEmit`: PASS.
- Targeted ESLint over the exact provider and two test files: PASS.
- Fresh `npm run build`: PASS; Next.js production compilation, TypeScript phase, page-data collection, and 35/35 static-page generation completed.

## Exact commands

- Git preflight: `git branch --show-current`, `git rev-parse HEAD`, `git rev-parse origin/master`, `git diff --cached --name-only`, `git status --short`.
- Candidate audit: SHA256 over the provider, two tests, benchmark, canonical authority, and F.13-F.14 artifacts; `git diff --binary --output=<temporary patch>` over the exact candidate paths; `git diff --stat` and `git diff` over those paths.
- Deterministic tests: `npx tsx` over the focused provider, production integration, canonical semantic contract/library, benchmark contract, validator, mapping, provisional text/file build, provisional state, graph projection, ranked projection, reviewed-evidence adapter, local state, and role/canonical reconciliation tests.
- Static verification: `npx tsc --noEmit`; `npx eslint` over the exact three candidate paths; `npm run build`.

## Known residual and product judgment

Known limitation: complex multi-dimensional Level-3 evidence may still omit independently supported secondary capabilities. Founder/EM accepts this as a `KNOWN MODEL-QUALITY RESIDUAL`, not a production-blocking architecture defect. Precision remains the stronger product requirement; the product does not require perfect first-pass extraction of every supported secondary dimension.

The single-stage architecture is simple, explainable, fixed at one provider call, precision-preserving in the accumulated evidence, sourced directly from canonical authority, and compatible with the existing public schema and downstream boundaries. It is ready for production with the documented residual.

## Staging boundary

Only these production-candidate paths are authorized for staging and commit:

1. `lib/career-possibility/career-capability-structured-inference-gemini-provider.ts`
2. `tests/career-possibility/career-capability-structured-inference-gemini-provider.test.ts`
3. `tests/career-possibility/career-capability-structured-production-integration.test.ts`

This artifact remains untracked and unstaged. No HOLD, benchmark, canonical, control, package, or unrelated file is authorized for staging. After successful push, control memory still requires a separate Task F final control-closure task before Task E can be admitted.
