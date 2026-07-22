# Script Hygiene Inventory

Document role: inventory + staged recommendation for `scripts/` hygiene.
This file captures late-March and April 2026 script-hygiene observations for safe cleanup planning.
It does not perform script refactors and should not be read as current operating authority.

## 1. Capture-Time Script Categories

At capture time, the `scripts/` area contained these practical categories:

1. Canonical verify scripts
- Core verify orchestrator: `scripts/verify.ts`
- Verify step scripts used by `verify.ts`: `verify-typecheck-debt.ts`, `verify-jd-extraction.ts`, `verify-matcher.ts`, `verify-extension-lifecycle.ts`, and `run-tailored-cv-bullet-rewrite-audit.ts` (verify step entry).
- Additional verify entry scripts exposed via npm: `verify-domain-ontology.ts`, `verify-role-frame-regression.ts`.

2. Reusable audit / benchmark / replay scripts
- Families such as `run-*.ts` and selected non-prefixed scripts (for example `human-alignment-benchmark.ts`, `replay-match-audit.ts`).
- These appear reusable but are mostly manual and not in canonical verify chain.

3. Temporary / founder-investigation scripts
- Top-level temporary one-offs: `_tmp_unsw_tailoring.ts`, `tmp-cluster-contribution-compare.js`, `tmp-role-context-selection-after.ts`, `tmp-semantic-validation-pack.ts`.
- Mixed-format helpers: `.sql`, `.mjs`, `.ps1` ad hoc utility scripts.

4. Artifact-residue holding scripts
- `scripts/artifact-residue/` currently holds relocated non-artifact residue from `artifacts/`.
- Predominantly `tmp-*` helper scripts (summarize/diagnose/inspect/capture/run) plus a checkpoint pair.

Inventory snapshot at capture time:
- total script files (recursive): `90`
- top-level script files: `44`
- `verify-*`: `8`
- `run-*`: `18`
- `debug-*`: `5`
- `tmp*`/`_tmp*`: `40`
- files under `scripts/artifact-residue/`: `38`

## 2. Biggest script hygiene problems

1. Flat structure for top-level scripts
- Canonical, reusable, and temporary scripts coexist in one root, reducing discoverability.

2. Canonical vs temporary mixing
- Verify-critical scripts and investigation one-offs sit side-by-side with similar visibility.

3. Runnable but undiscoverable scripts
- Many important scripts are not exposed via npm entrypoints.
- `package.json` references only `13` top-level script files out of `44`.

4. Long-term vs one-off ambiguity
- `run-*` naming includes both reusable audits and likely one-off investigations.
- `debug:*` npm names include heavier benchmark/replay workflows.

## 3. Canonical script candidates

Scripts/families that appear canonical or long-term central:

- `scripts/verify.ts`
- verify chain step scripts:
  - `scripts/verify-typecheck-debt.ts`
  - `scripts/verify-jd-extraction.ts`
  - `scripts/verify-matcher.ts`
  - `scripts/verify-extension-lifecycle.ts`
  - `scripts/run-tailored-cv-bullet-rewrite-audit.ts`
- verify entry/support scripts exposed via npm:
  - `scripts/verify-domain-ontology.ts`
  - `scripts/verify-role-frame-regression.ts`
- stable operational scripts likely to remain useful:
  - `scripts/rematerialize-evidence-pieces.ts`
  - `scripts/rematerialize-signal-capability-pipeline.ts`
  - `scripts/test-career-foundation.ts`

## 4. Temporary residue candidates

Likely temporary/investigatory or one-off candidates:

- top-level temporary scripts:
  - `_tmp_unsw_tailoring.ts`
  - `tmp-cluster-contribution-compare.js`
  - `tmp-role-context-selection-after.ts`
  - `tmp-semantic-validation-pack.ts`
- mixed ad hoc utility scripts likely not canonical verify path:
  - `audit-phase2c-coverage.sql`
  - `preview-signal-refinement.mjs`
  - `project_audit.ps1`
  - `dump-score-evidence.ts`
- all scripts currently under `scripts/artifact-residue/` should be treated as residue-holding unless promoted explicitly.

## 5. Newly relocated residue status

`scripts/artifact-residue/` is currently serving its intended purpose as a holding area:

- It cleanly removed script-like residue from `artifacts/`.
- It is clearly non-canonical by path naming.
- It still needs lifecycle policy (retain/archive/delete/promote) to avoid becoming a second long-term dumping ground.

## 6. Minimal future cleanup shape

Small staged shape (recommendation only):

1. Canonical verify area
- Keep `verify.ts` + verify-chain scripts as clearly designated canonical path.

2. Reusable audit/benchmark area
- Group reusable non-canonical but repeatable audits/benchmarks into an explicit area (still under `scripts/`).

3. Temporary residue holding area
- Keep `scripts/artifact-residue/` and top-level `tmp*` scripts as explicit temporary holding only.
- Require promotion decision (promote to reusable area or archive/remove) before adding new long-lived dependencies.

4. Discoverability pass later
- Add explicit npm entry aliases only for selected reusable scripts when needed; avoid exposing all one-offs.

## 7. What should not be cleaned yet

To avoid over-refactor now:

- Do not mass-move top-level `run-*` scripts yet.
- Do not bulk-rename script families yet.
- Do not change `verify.ts` behavior or verify architecture.
- Do not remove `scripts/artifact-residue/` contents without retention decisions.
- Do not convert all manual scripts into npm entrypoints in one pass.
