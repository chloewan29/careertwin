# Verification Loop

Document role: **detailed mechanics/reference** for the full baseline verify pipeline.
This is not the default day-to-day operating policy.
For current defaults and escalation rules, use `AGENTS.md` and `docs/verify-strategy.md`.

Level 3 entrypoint (when escalation/full baseline verify is required):

```bash
npm run verify
```

## What `npm run verify` does

`npm run verify` runs a founder-safe first-failure loop and writes machine-readable artifacts under `artifacts/`.

Current ordered steps:
1. compile/typecheck check for verification entrypoint (`tsconfig.verify.json`)
2. full-repo TypeScript debt audit (`scripts/verify-typecheck-debt.ts`)
3. deterministic fixture test (`tests/test-matching-fixtures.ts`)
4. JD extraction verification (`scripts/verify-jd-extraction.ts`)
5. matcher verification + regression diff (`scripts/verify-matcher.ts`)
6. tailored CV quality verification (`scripts/run-tailored-cv-bullet-rewrite-audit.ts --mode replay --replayFixture scripts/fixtures/tailored-cv-quality-replay.seed.json --enforce`)
7. extension lifecycle verification (`scripts/verify-extension-lifecycle.ts`)

If a step fails, the run stops on that first failing step.

## Current coverage

- JD extraction:
  - deterministic fixture replay
  - assertions for title/company/responsibilities/requirements/critical requirements
  - structural non-empty guardrails
  - explicit weak-field checks and per-case quality score/status for founder review
- matcher:
  - deterministic benchmark replay
  - numeric score and bounds checks
  - top-match presence, output-shape, and bucket guardrail checks
  - top-1 stability and top-3 expected-top-match coverage checks against immutable baseline
  - explicit high-fit suppression / low-fit inflation case flags
  - regression-style margin checks
  - founder-readable regression diff fields for severity/highlighted risks/worst score drops
- tailored CV quality:
  - canonical verify runs in replay mode by default for deterministic/offline-friendly execution:
    - `--mode replay --replayFixture scripts/fixtures/tailored-cv-quality-replay.seed.json`
  - deterministic multi-case replay over representative requirement profiles (adjacent + different roles)
  - enforced quality gate for average quality score and case-mix coverage
  - explicit failure-mode enforcement for:
    - generic rewrite
    - fake tailoring
    - ownership inflation
    - weak job alignment
    - evidence mismatch (hallucination + meaning drift)
    - weak differentiation on adjacent-role pairs
  - deterministic adversarial fixtures that explicitly trigger each enforced failure mode and assert detection
  - fixture-to-mode mapping and per-fixture detection results are emitted in artifact output
  - enforce criteria include adversarial coverage, detection-completeness, and deterministic fixture evaluation
  - artifact preflight includes resolved execution mode and replay fixture metadata for founder clarity
  - founder-readable artifact section with weakest-case reasons and recommended actions
  - deterministic hash-stability guard
  - live mode (`--mode live`) now builds selection inputs through canonical selector path (`buildTailoringPlanForCv`)
  - live mode applies deterministic rolling recent-selection context across representative cases to exercise reuse suppression
  - pair differentiation scoring in live mode blends shared-evidence similarity with full-output similarity when overlap is moderate, reducing avoidable false generic/fake-tailoring flags
  - mixed-pair differentiation scoring now avoids over-penalizing cross-role pairs that still show meaningful rewrite delta, reducing non-actionable telemetry noise
- extension lifecycle:
  - bounded terminal timeout checks for analysis and resume download
  - stale-response and in-flight guard checks
  - preview-not-ready terminalization and bounded retry-schedule checks
  - edge-case fixtures for missing payloads, late responses after timeout, and transient requesting states
  - state transition traces and broken-path context for failure triage
- TypeScript debt audit:
  - full `tsc --noEmit` run output captured
  - errors categorized into core vs legacy/debt buckets
  - smallest-safe cleanup order recommendations emitted

## Not yet covered

- Full-repo TypeScript compile gate (`npx tsc --noEmit`) is not the current verify compile step.
- Live Supabase CV-generation replay is no longer part of default verify; run CV audit in `--mode live` when live-path sanity is needed.
  - recommended command:
    - `npx tsx scripts/run-tailored-cv-bullet-rewrite-audit.ts --mode live --out artifacts/tailored-cv-bullet-rewrite-audit-v1.live.json`
- End-to-end browser automation for extension UI is not yet included.

## Fixtures

- JD extraction fixture:
  - `scripts/fixtures/verify-jd-extraction.fixture.json`
- matcher benchmark fixture:
  - `scripts/fixtures/human-alignment-benchmark.seed.json`
- tailored CV replay fixture:
  - `scripts/fixtures/tailored-cv-quality-replay.seed.json`

## Artifacts

Primary artifact:
- `artifacts/verify-summary.json`

Step artifacts include:
- `artifacts/compile-summary.json`
- `artifacts/typescript-debt-summary.json`
- `artifacts/typescript-debt-details.json`
- `artifacts/typescript-debt-delta.json` (before/after/delta for core and legacy/debt TS counts)
- `artifacts/typescript-debt-step.json`
- `artifacts/tests-step.json`
- `artifacts/jd-extraction-summary.json`
- `artifacts/jd-extraction-details.json`
- `artifacts/matcher-summary.json`
- `artifacts/matcher-details.json`
- `artifacts/matcher-regression-diff.json`
- `artifacts/tailored-cv-bullet-rewrite-audit-v1.verify.json`
- `artifacts/tailored-cv-quality-step.json`
- `artifacts/extension-lifecycle-summary.json`
- `artifacts/extension-lifecycle-details.json`

Top-level verify summary fields now include:
- `overall_verification_state`
- `first_failing_step`
- `core_path_ts_debt_count`
- `matcher_regression_status`
- `tailored_cv_quality_status`
- `extension_lifecycle_regression_status`
- `recommended_next_action`

## Agent usage during Level 3 repair work

When Level 3 escalation is justified per `docs/verify-strategy.md`:

1. Make the smallest viable change.
2. Run `npm run verify`.
3. Inspect only the first failing step.
4. Fix that step.
5. Rerun `npm run verify`.
6. Repeat until all steps pass or a hard blocker is explicitly reported.
