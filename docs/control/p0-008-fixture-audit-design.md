# P0-008 Fixture Audit Design (No-Code)

Document role: bounded audit-design artifact for `QUEUE-P0-008`.

Date: 2026-04-09
Mode: AUDIT
Task type: diagnosis

## 1) Current realism gap

Observed:
- CV gate replay path currently uses snapshot scores/patterns from `scripts/fixtures/tailored-cv-quality-replay.seed.json`.
- `runAdversarialFixtures(...)` in `scripts/run-tailored-cv-bullet-rewrite-audit.ts` applies synthetic in-memory mutations to `jobs`, `pairDiagnostics`, and `patternCollector`.
- Enforced output does not separate synthetic fixture detections from degraded replay detections.

Consequence:
- Failure-mode coverage is deterministic, but not yet realistic enough to prove end-to-end degraded-output detection behavior.

## 2) Smallest synthetic vs degraded split

### Degraded replay first (high value, deterministic from pair/score surfaces)
- `generic_rewrite`
- `fake_tailoring`
- `weak_differentiation`
- `weak_job_alignment`

Why:
- These modes are already thresholded from `pairDiagnostics` and per-case score fields and can be exercised with frozen degraded replay packs.

### Synthetic retained in first pass (pattern-trigger family)
- `ownership_inflation`
- `evidence_mismatch`

Why:
- These modes currently depend on pattern triggers (`ownership_violation_*`, `hallucination_*`, and pattern-detail markers) and are not yet backed by deterministic degraded replay corpora in this line.

## 3) First harness-level drift point

The first attribution break is at adversarial evaluation source mixing:
- one path evaluates replay snapshot data
- another path applies synthetic mutators
- artifact contract reports one aggregate adversarial result without explicit fixture-source separation.

## 4) First writable harness fault

Missing fixture-source contract in the CV gate harness:
- no explicit `fixture_source` typing (`synthetic` vs `degraded_replay`) in adversarial fixture results
- no deterministic degraded replay fixture registry wired into enforced mode coverage output.

## 5) Bounded next repair surface (for admission review)

Allowed files (hypothesis):
- `scripts/run-tailored-cv-bullet-rewrite-audit.ts`
- `scripts/fixtures/tailored-cv-quality-degraded-*.json` (new files)
- `scripts/verify.ts` only if required to enforce the new degraded replay checks in canonical verify.

Out of scope:
- product scoring or recommendation logic
- Layer 1/2/3/4 product behavior changes
- proof-chain repair reopening
- interview continuation work

## 6) Proportional validation plan after harness fix

1. Run replay audit with baseline fixture and new degraded fixture set.
2. Confirm output distinguishes `synthetic` vs `degraded_replay` detections.
3. Confirm degraded-first modes fail on degraded fixtures and pass on baseline fixture.
4. Confirm retained synthetic modes still detect deterministically.
5. Confirm canonical replay gate remains stable.

