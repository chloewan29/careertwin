# Artifact Hygiene Inventory

Document role: inventory + staged recommendation for artifact namespace cleanup.
This file does not execute cleanup; it identifies current state and a minimal safe next shape.

## 1. Current artifact categories

Current `artifacts/` contents are mixed across these categories:

1. Canonical verify outputs (current status candidates)
- top-level verify files from `npm run verify` (summary + per-step artifacts).
- examples currently present: `verify-summary.json`, `compile-summary.json`, `typescript-debt-*.json`, `tests-step.json`, `jd-extraction-*.json`, `matcher-*.json`, `extension-lifecycle-*.json`.

2. Benchmark/replay outputs
- human alignment, role-frame, domain, and match replay artifacts.
- examples: `human-*`, `domain-*`, `role-*`, `frame-*`, `cluster-*`, `confirmation-*`.

3. Layer-specific audit outputs
- mostly Layer 1 and Job Copilot diagnostic artifacts.
- examples: `layer1-*`, `founder-*`, `guiding-*`, `governance-*`.

4. Tmp/ad hoc outputs
- exploratory and helper outputs with `tmp-*` prefixes.
- in the current tree these mostly appear under `tmp-*` directories rather than as top-level `tmp-*` files.

5. Historical or ambiguous residue patterns
- historical cleanup notes describe script-like files (`.ts/.js/.cjs`) and environment/profile-style data directories appearing inside `artifacts/`.
- current repo truth should be re-checked before treating any specific residue example as still present.

Current observed snapshot:
- total files: `368`
- top-level files: `202`
- top-level dirs: `33`
- top-level `tmp-*` files: `0`
- dated filenames (`YYYY-MM-DD`): `147`

## 2. Biggest hygiene problems

1. Top-level mixing
- canonical verify outputs, historical audits, and tmp/ad hoc files are all mixed in top-level `artifacts/`.

2. Tmp sprawl
- `tmp-*` proliferation and helper-script outputs make it hard to identify authoritative artifacts quickly.

3. Latest vs history ambiguity
- many `.before` / `.after` / `.comparison` files and dated snapshots are mixed with current-run files.

4. Non-artifact residue in artifact namespace
- script-like helper files and browser-profile-style data live under `artifacts/`, increasing noise.

## 3. Canonical artifact candidates

These appear to be the primary current-status outputs for day-to-day verification state:

- `artifacts/verify-summary.json`
- `artifacts/compile-summary.json`
- `artifacts/typescript-debt-summary.json`
- `artifacts/typescript-debt-details.json`
- `artifacts/typescript-debt-delta.json`
- `artifacts/typescript-debt-step.json`
- `artifacts/tests-step.json`
- `artifacts/jd-extraction-summary.json`
- `artifacts/jd-extraction-details.json`
- `artifacts/jd-extraction-step.json`
- `artifacts/matcher-summary.json`
- `artifacts/matcher-details.json`
- `artifacts/matcher-regression-diff.json`
- `artifacts/matcher-step.json`
- `artifacts/extension-lifecycle-summary.json`
- `artifacts/extension-lifecycle-details.json`
- `artifacts/extension-lifecycle-step.json`

Note: these should be treated as canonical current verify outputs unless verification policy explicitly changes.
Historical caution: older cleanup notes may mention `artifacts/tailored-cv-bullet-rewrite-audit-v1.verify.json` and `artifacts/tailored-cv-quality-step.json`, but those files are not currently present and should not be treated as current canonical outputs.

## 4. Historical vs current ambiguity

Ambiguity patterns that can mislead future runs:

- Dated and scenario-specific files near canonical files:
  - examples: `layer1-*.2026-04-01.json`, `*-before.json`, `*-after.json`, `*-comparison.json`.
- High-volume prefixed groups that look important but are not canonical current status:
  - `layer1-*`, `founder-*`, `tailored-*`, `cluster-*`.
- Helper and temporary scripts inside `artifacts/` can be mistaken for runnable canonical tooling.

## 5. Minimal cleanup shape

Recommended staged shape (small and safe, no broad moves yet):

1. Define canonical current namespace (policy first)
- reserve top-level `artifacts/` for current canonical verify outputs only.
- canonical allowlist = verify summary + step artifacts listed above.

2. Define historical namespace
- place replay/audit/history outputs under a dedicated historical path (for example `artifacts/history/`), grouped by area/date.

3. Define tmp namespace
- place ad hoc/tmp outputs under a dedicated path (for example `artifacts/tmp/`) and treat as non-authoritative.

4. Define non-artifact boundary
- helper scripts and profile/db residue should not live in canonical artifact namespace long-term.

## 6. What should not be cleaned yet

To avoid churn/risk right now:

- do not mass-move existing artifact files yet.
- do not bulk-delete historical artifacts yet.
- do not bulk-rename old artifact names yet.
- do not change runtime verify behavior or artifact-writing logic in this pass.
- do not rewrite all audit scripts to new paths yet.

First decision needed before execution cleanup:
- retention policy (what historical artifacts must be preserved vs archiveable).
- canonical allowlist confirmation for "current status" outputs.

Current caution:
- do not treat missing example files as present-day canonical outputs without re-checking the tree.
- specifically, `artifacts/tailored-cv-bullet-rewrite-audit-v1.verify.json` and `artifacts/tailored-cv-quality-step.json` are not currently present and should not be used as current-state evidence.
