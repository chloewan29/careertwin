# Repo Cleanup Inventory

Document role: inventory + staged recommendation for repo cleanup boundaries.
This inventory captures late-March and April 2026 repository evidence, not current operating authority.

## 1. Capture-Time Cleanup Hotspots
Counts and examples below reflect the repository state observed at capture time.
Priority order (inventory only; no cleanup executed):

1. **`artifacts/` sprawl (highest impact)**
   - `1136` files total; `585` are top-level files.
   - `99` files use `tmp-*` prefix (`79` at top level).
   - Formal verify artifacts exist, but are mixed with large ad hoc and exploratory output.
2. **`scripts/` mixed intent (canonical + ad hoc in one flat space)**
   - `52` files in `scripts/`; `17` `run-*`, `8` `verify-*`, `3` `tmp-*`.
   - Canonical verify scripts and one-off diagnostics sit side-by-side.
3. **Command entrypoint mismatch (official npm scripts vs many manual scripts)**
   - `20` npm scripts, but many important `scripts/*.ts` are not directly exposed as npm commands.
   - This makes "official vs ad hoc" hard to identify quickly.
4. **Rule-document overlap/residue in secondary docs**
   - Core rule docs are cleaner now, but older operational docs still emphasize full verify loop language.

## 2. Rules/Docs Structure Status

### Status: **mostly improved, not fully clean**
- **Good split now:**
  - `AGENTS.md` = concise durable execution constitution.
  - `docs/control/verification/verify-strategy.md` = level policy and escalation criteria.
  - `docs/layer1-validation.md` = raw -> parsed -> consumed drift validation playbook.
  - `docs/cleanup-policy.md` = cleanup separated from verification.
- **Remaining overlap/ambiguity:**
  - `docs/control/verification/verification-loop.md` still reads as canonical iterative process centered on `npm run verify` and includes "agent usage during repair work" phrasing that can conflict with daily-first policy.
  - `docs/control/verification/current-verify-inventory.md` and `docs/control/verification/verification-loop.md` both describe verify mechanics; boundaries between "strategy" vs "mechanics" vs "historical state" are not fully explicit.

## 3. Command Entrypoint Status

### Capture-time default commands
- `npm run verify:daily` (Level 1 default)
- `npm run verify` (Level 3 full baseline)

### Capture-time heavy/advanced commands (mixed naming at snapshot)
- `npm run verify` (full multi-step pipeline)
- `npm run debug:human-alignment-benchmark`
- `npm run debug:replay-match-audit`

### Observations
- `package.json` is short enough to scan, but naming semantics are mixed:
  - `debug:*` includes both true debug workflows and heavyweight benchmark/audit workflows.
  - Only some verify-related scripts are exposed (`verify`, `verify:daily`, `verify:domain-ontology`, `verify:role-frame-regression`).
  - Core verify sub-steps (`verify-jd-extraction.ts`, `verify-matcher.ts`, `verify-extension-lifecycle.ts`, `verify-typecheck-debt.ts`) are runnable but not directly surfaced as npm commands.
- `scripts/` contains many runnable audits not represented in npm scripts, increasing discoverability risk.

## 4. Artifact Hygiene Status

### Status: **messy (formal + ad hoc co-located)**
- Formal verify artifacts are present and healthy:
  - `verify-summary.json`, step summaries/details/diffs for compile, debt, tests, JD, matcher, tailored CV, extension lifecycle.
- Ad hoc accumulation is large:
  - `tmp-*` proliferation, dated outputs, before/after/comparison variants, one-off diagnosis dumps.
  - Marker counts: `.before` = `21`, `.after` = `59`, `.comparison` = `11`, dated names = `46`.
- "Latest" and historical artifacts are mixed in same top-level directory.
- Non-artifact residue exists under `artifacts/`:
  - script files (`.ts/.js/.cjs`) and browser-profile-style data directories (`tmp-extension-profile-test*`) are present.

### Obvious future cleanup candidates (not executed)
- quarantine `tmp-*` and one-off helper scripts out of top-level artifact namespace.
- separate "latest canonical verify outputs" from "historical/replay archives".

## 5. Script Hygiene Status

### Status: **mixed but salvageable**
- Canonical verify path is clear in code (`scripts/verify.ts` orchestrates core steps).
- Long-term reusable scripts appear to exist (`verify-*`, selected `run-*`).
- Ad hoc residue is present:
  - `tmp-*` scripts, `_tmp_*` scripts, and niche one-off audit/triage scripts.
- `scripts/` is mostly flat, so canonical and temporary scripts are visually hard to separate.

## 6. Old Rule Residue

Places still likely to imply outdated defaults:
1. `docs/control/verification/verification-loop.md`
   - "Canonical entrypoint: npm run verify" and repair-loop instructions emphasize repeated full verify runs.
   - This can be read as default iterative behavior, conflicting with daily-first strategy.
2. `docs/control/task-queue.md` and `docs/control/project-state.md`
   - contain many full-verify-first historical run records and phrasing.
   - likely intended as control history, but can still look normative if read as active guidance.
3. `docs/control/verification/current-verify-inventory.md`
   - largely consistent, but still centered on `npm run verify` mechanics; should be explicitly framed as inventory/mechanics, not default daily workflow.

## 7. Recommended Cleanup Order

Very small staged order (recommendation only):

1. **Stage 1: docs/rules clarity cleanup**
   - tighten boundaries between `verify-strategy` (policy), `verification-loop` (mechanics), and control-history docs.
   - add explicit labels where docs are historical vs normative.
2. **Stage 2: command entrypoint cleanup**
   - classify npm scripts by intent (`verify`, `audit`, `debug`, `maintenance`) and reduce naming ambiguity.
3. **Stage 3: artifact hygiene cleanup**
   - separate canonical latest verify outputs from historical/ad hoc/tmp outputs.
   - define where temporary browser/test profile data should live.
4. **Stage 4: script categorization cleanup**
   - classify/move ad hoc `tmp-*` and one-off audit scripts into an explicit non-canonical area.

## 8. What Should NOT Be Cleaned Yet

To avoid over-refactor risk, do **not** do these yet:
- do not rewrite verification architecture.
- do not rename or relocate large script sets in one pass.
- do not change runtime verify behavior.
- do not merge/archive historical artifacts without first deciding retention policy.
- do not modify layer logic, matcher logic, or rendering logic as part of cleanup.
- do not apply broad formatting/restructure changes across all docs in one sweep.
