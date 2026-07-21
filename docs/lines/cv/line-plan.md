# CV Line Plan

Document role: historical line-planning reference for the CareerTwin tailored CV consumer/output path (legacy `cvline` file naming retained for continuity).

This file preserves a prior planning snapshot and working notes for the CV line.
It is useful for historical context, terminology continuity, and line-planning reference.

This is the CV-line plan.
It should not be treated as current execution control.

Historical-reference note:
- dated loop states below are preserved as historical planning context
- artifact paths below are retained as historical breadcrumbs only
- some referenced artifacts may no longer exist in the current local repo
- use `docs/lines/cv/line-architecture.md` and `docs/lines/cv/line-verify-strategy.md` for the current committed CV line architecture and validation posture

---

## 0. Terminology guardrail

Legacy naming note:
- This file keeps historical `cvline` / `CV line` wording for continuity with prior artifacts and filenames.
- Treat those labels as legacy references, not architecture bucket definitions.

Hard boundary:
- Career Memory / Evidence is the truth layer.
- CV is a bootstrap evidence source, not the truth layer.
- Tailored resume behavior belongs to the tailored CV consumer path / evidence-to-tailored-CV output path / tailored output composition path.
- `resume-*` files are implementation surfaces only, not architectural layer names.
- Always separate:
  1. truth layer
  2. consumer/output path
  3. implementation surface
- Do not use `CV line`, `resume line`, or `resume rewrite layer` as current architecture terms except when explicitly marked as legacy context.

Diagnosis text classification rule:
- Before describing an issue in this area, classify it as exactly one of:
  - truth / memory layer issue
  - consumer / output-path issue
  - implementation-local issue
- Guard: implementation-local naming must not redefine the architectural bucket.

P0-027 application note:
- In the recorded April 2026 snapshot, `QUEUE-P0-027` was treated as a tailored CV consumer-path lead-emphasis / candidate-shape issue.
- This does not reclassify architecture as CV-centered truth.

---

## 1. Line identity

### Line name
- CV / Why-you proof-chain (bootstrap `cvline` naming)

### Line mission
- Improve user-facing proof quality for CV and `Why you` so role-subject-aligned buying proof leads over generic/shared transfer proof.

### In scope
- CV positioning direction
- evidence selection for CV
- summary / headline / bullet emphasis
- claim-strength control
- gap-handling control
- final rendering wording

### Out of scope for now
- JD line role reading itself
- Interview content generation
- Career Memory ingestion
- broad template design systems unrelated to semantic CV behavior

---

## 2. Architecture and validation references

### Architecture document
- `docs/lines/cv/line-architecture.md`

### Validation strategy
- `docs/lines/cv/line-verify-strategy.md`

---

## 3. Historical baseline snapshot

### Recorded verified baseline
- historical reference: `artifacts/job-copilot-final-output-audit.2026-04-09.layerc-frozen-pack.json`
- recorded date: 2026-04-09
- historical role: deterministic comparator input pack for proof-chain residual work (`Why you` generic/shared lead metric)

### Historical baseline interpretation
- in this snapshot, the line was described as running against a fixed 12-case frozen semantic pack for attributable patched-vs-unpatched comparison
- recorded residual metric: `shared_default_analytics_leading_first_headline`

---

## 4. Diagnostic-only artifacts

### Diagnostic-only artifact registry
- `artifacts/job-copilot-final-output-audit.2026-04-09.layerc-deterministic-compare.after-revert.json` (historical Layer-C family reference; recorded no-gain result)
- `artifacts/job-copilot-final-output-audit.2026-04-09.layerb-compat-after-pass.current.json` (historical local-validation reference)
- `artifacts/job-copilot-final-output-audit.2026-04-09.layerb-4468-pass.current.json` (historical bounded residual-repair validation reference)
- `artifacts/tailored-cv-behavior-audit-role-family.p0-027-gapmap.refresh.2026-04-09.json` (historical 12-case P0-027 gap-map reference for this line snapshot)
- `artifacts/tailored-cv-behavior-audit-role-family.p0-027-post-revert-decomposition.2026-04-09.json` (historical mixed/split decomposition reference after exhausted comparator tie-break family)
- `artifacts/tailored-cv-behavior-audit-role-family.p0-027-upstream-candidate-shape-mechanism.2026-04-09.json` (historical bounded upstream candidate-shape audit reference, job-10/job-18 focused)

Rule:
- as experiments begin, rejected or exploratory artifacts go here
- do not silently promote them to an active baseline

---

## 5. Historical cycle snapshot

### Recorded cycle baseline
- historical baseline reference: `artifacts/job-copilot-final-output-audit.2026-04-09.layerc-frozen-pack.json`

### Recorded loop stage
- AUDIT

### Recorded task type
- diagnosis (no-code bounded upstream candidate-shape mechanism audit for `QUEUE-P0-027`)

### Recorded management judgment
- label: AUDIT
- single main next action: continue Branch A1 audit-only isolation inside `selectEvidenceForScenario` suppression constraints, keep Branch A2 and Branch B parked/tracked, and do not open repair admission until A1 single-subrule ownership is stable.

### Output wording enforcement
- For future `QUEUE-P0-027` summaries and handoffs, do not use `CV line`, `resume line`, or `resume rewrite layer` as current architecture terms.
- Use Career Memory / Evidence for truth-layer references.
- Use tailored CV consumer path / evidence-to-tailored-CV output path for output-behavior references.
- Use implementation surface / writable surface for `resume-*` file references.
- For `QUEUE-P0-027`, describe the issue in this snapshot as a tailored CV consumer-path lead-emphasis / candidate-shape issue, not a CV-centered truth-layer issue.
- Any legacy wording kept for continuity must be explicitly marked as legacy.

### Recorded implementation status
- proof-chain line remains parked at local KEEP boundary with residual watch note only (`3113`, `4127`)
- `QUEUE-P1-004` remains parked at local KEEP boundary (explicit-gate-first posture retained; no backend expansion)
- `QUEUE-P0-008` remains parked at local KEEP boundary (coverage-breadth residual only; no correctness blocker)
- `QUEUE-P0-027` was the active line in this snapshot and was refreshed via:
  - `artifacts/tailored-cv-behavior-audit-role-family.p0-027-gapmap.refresh.2026-04-09.json`
  - `artifacts/tailored-cv-behavior-audit-role-family.p0-027-gapmap.refresh-summary.2026-04-09.json`
- `QUEUE-P0-027` latest bounded diagnosis artifact in this snapshot:
  - `artifacts/tailored-cv-behavior-audit-role-family.p0-027-upstream-candidate-shape-mechanism.2026-04-09.json`
- `QUEUE-P0-027` branch-structure judgment artifact in this snapshot:
  - `artifacts/tailored-cv-behavior-audit-role-family.p0-027-branch-structure-judgment.2026-04-10.json`
- `QUEUE-P0-027` Branch A1 suppression-subrule judgment artifact in this snapshot:
  - `artifacts/tailored-cv-behavior-audit-role-family.p0-027-branchA-A1-suppression-subrule-judgment.2026-04-10.json`
- recorded 12-case role-family emphasis result: `fail=3`, `weak=4`, `pass=5`; family-assignment stability was noted as `12/12` stable

---

## 6. Countable repair state

### Recorded countable narrow repair count
- count: 2

### Counted repairs in the recorded cycle
- `2026-04-09`: Layer-B compatibility alias normalization pass in `normalizeProofFamilyKey(...)`
- `2026-04-09`: bounded residual alias pass for `customer_analytics_transformation_leadership -> functional_leadership`

### Is broader measurement due now?
- no (line-local stop at recorded local KEEP boundary; broader remeasurement deferred until explicit reopen of this line)

### Why not?
- local repair objective for this residual family has been met with deterministic no-regression evidence
- remaining residuals (`3113`, `4127`) were classified in this snapshot as likely valid shared-lead outcomes, not active defect residuals

---

## 7. Historical residual / owner map

### Trust level
- established for this recorded line entry (deterministic comparator stable; no missing invariance fields)

### Recorded owner candidates
- branch structure decision: split approved (diagnosis-only)
- Branch A (active in this snapshot): stage1 lead-experience selection/composition family in tailored CV consumer path (`job-10`, `job-18`)
- Branch B (tracked contrast residual): stage4 comparator/order family (`job-03`)

### Historical CV-line setup need
The next narrowing pass recorded here was:
1. preserve deterministic comparator baseline for this family
2. reopen Layer-B only if new evidence reclassifies `3113` or `4127` as defect-like
3. avoid near-neighbor Layer-B churn without a new causal bucket

---

## 8. Rejected-line registry

### Rejected line entries
- exhausted repair family: non-strict Layer-C eligibility-floor micro-guard variants (`toAxisAlignedWhyFitItems(...)`) with deterministic no-gain result and safe revert

---

## 9. Boundary-contract / separation state

### Separation recorded as required in this snapshot
- yes (Layer-B compatibility vs Layer-C admission split remains explicit)

### Notes
- the recorded loop treated proof-family compatibility (Layer-B) and proof admission (Layer-C) as separate writable families
- do not resume exhausted Layer-C near-neighbor variants without a genuinely new causal bucket

---

## 10. Historical blockers and risks

Top blockers in this snapshot:
1. Branch A first writable fault is still unresolved inside stage1 lead-experience selection/composition surface
2. comparator tie-break family is exhausted/reverted with no attributable gain (`fail=3`, `weak=4`, `pass=5` unchanged)
3. Branch B remains unresolved but intentionally constrained as contrast residual; do not force mixed-owner repair search

---

## 11. Latest loop entry

### Latest recorded loop entry
- date: 2026-04-10
- task type: diagnosis (A1-only suppression-subrule owner judgment pass)
- MODE at entry: AUDIT
- owner under review: `QUEUE-P0-027` Branch A1 suppression path (`selection_limits_exceeded` / `manual_quick_check_*`)
- failing layer: tailored CV consumer-path stage1 selected-evidence suppression in `selectEvidenceForScenario`
- first drift point: non-shared lead anchors survive guiding-pool admission and are first dropped by A1 constraint resolution during selector suppression
- first writable fault: `selectEvidenceForScenario::resolveSelectionConstraintReason` function-level micro-surface is stable; single subrule owner remains split
- admitted surface: none (diagnosis-only pass)
- validation used:
  - selector-trace reference: `artifacts/tailored-cv-behavior-audit-role-family.p0-027-branchA-selector-cluster-internal-trace.2026-04-10.json`
  - prior microfault judgment reference: `artifacts/tailored-cv-behavior-audit-role-family.p0-027-branchA-selector-microfault-judgment.2026-04-10.json`
  - A1 judgment reference from this snapshot: `artifacts/tailored-cv-behavior-audit-role-family.p0-027-branchA-A1-suppression-subrule-judgment.2026-04-10.json`
- result:
  - A1 first owner is stable at function-level micro-surface (`resolveSelectionConstraintReason`)
  - A1 subrule ownership remains split between selection-limit accounting and manual quick-check alignment handling
  - A1 repair admission remains blocked
  - A2 and Branch B remain parked/tracked
  - policy stack sufficient for local continuation; founder review not required by policy
- judgment: AUDIT
- single main next action: run one bounded A1 subrule-isolation trace capturing first-hit branch state inside `resolveSelectionConstraintReason` for non-shared anchors before reopening A1 repair admission review.

---

## 12. CV-line operating reminders

- Do not confuse elegant writing with correct positioning.
- Do not let rendering override role direction.
- Do not let adjacent evidence become native claim language.
- Keep claim strength under control.
- Gap honesty matters.

---

## 13. Completion target

### Minimum acceptance condition
- CV line has:
  - one active baseline
  - one representative benchmark pack
  - stable owner / guard inventory
  - local validation workflow
  - broader measurement cadence
  - first burn-down loop started

### Stretch target
- CV line can run the same AUDIT / REPAIR / MEASURE / REVERT / REGROUP loop discipline as JD line, with evidence-grounded positioning behavior and controlled claim strength.

---

## 14. Immediate next build steps from this snapshot

1. keep proof-chain parked at local KEEP (`3113`, `4127` watch-only) and do not auto-open same-line repair
2. keep `QUEUE-P1-004` parked in explicit-gate-first posture (no interview backend expansion)
3. keep `QUEUE-P0-008` parked at local KEEP (coverage breadth residual only)
4. the active line in this historical snapshot was `QUEUE-P0-027` in `AUDIT` posture with refreshed role-family gap-map artifacts:
   - `artifacts/tailored-cv-behavior-audit-role-family.p0-027-gapmap.refresh.2026-04-09.json`
   - `artifacts/tailored-cv-behavior-audit-role-family.p0-027-gapmap.refresh-summary.2026-04-09.json`
5. do not admit repair yet; run one bounded pre-rewriter evidence-to-candidate composition audit on the fail shortlist from this snapshot (`job-03`, `job-10`, `job-18`) to confirm whether upstream shape loss happens before candidate variant generation
6. branch structure recorded here for `QUEUE-P0-027`:
   - Branch A active in this snapshot: stage1 lead-experience selection/composition (`job-10`, `job-18`)
   - Branch B tracked contrast residual: stage4 comparator/order (`job-03`)
7. keep the line in AUDIT in this snapshot and do not open repair admission until Branch A first writable fault is stable
