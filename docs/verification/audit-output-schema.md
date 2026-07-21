# Audit Output Schema

## Document role
This document standardizes founder-readable audit, measurement, and admission-review outputs across active line work.
It does not replace loop control rules or line-specific control documents.

## Required output shape
Every substantial audit/measurement/admission-review output should include:
- Current task type
- Current MODE
- Active baseline
- Failing layer
- Owner case
- Primary blocker case
- Blocker class
- Main next question
- Why this question now
- Why not the nearest wrong branch
- Outcome class
- Default audit template
- Default next-step route
- Repair-block posture
- First drift point
- First writable fault
- What is already proven
- What is still unproven
- Artifact classification
- Judgment label
- Main next action
- Explicit blocked actions

For substantial LLM boundary audits (provider/parse/capture attribution), also include:
- First visible difference stage
- First differing field
- Earliest supported boundary owner
- Cluster identity
- Cluster count (when more than one meaningful cluster appears)
- Are later differences inherited or newly introduced?

## Field guidance
- `Current task type`: one clear mode-aligned description (audit, repair admission review, measure, etc.).
- `Current MODE`: one of `AUDIT`, `REPAIR`, `MEASURE`, `HOLD`.
- `Active baseline`: current verified baseline artifact used as authority.
- `Failing layer`: first owning layer for the mismatch.
- `Owner case`: currently selected owner under review.
- `Primary blocker case`: line currently controlling safe progress.
- `Blocker class`: one compact blocker taxonomy value (line-local value set allowed).
- `Main next question`: exactly one highest-information audit question for the next pass.
- `Why this question now`: one short evidence-based reason this question has the highest information gain now.
- `Why not the nearest wrong branch`: one short rejection note for the most tempting wrong move.
- `Outcome class`: one compact summary of current audit truth quality/state.
- `Default audit template`: one default audit pass type for the blocker/outcome state.
- `Default next-step route`: one default next-step type derived from outcome class.
- `Repair-block posture`: explicit `blocked` or `not_blocked` with one-line reason.
- `First drift point`: earliest observed drift location in the semantic chain.
- `First writable fault`: earliest safe control point to change, or explicit blocked status.
- `First visible difference stage`: earliest stage where run-to-run difference is directly observed in the chosen audit chain.
- `First differing field`: first concrete field/key that differs at that stage.
- `Earliest supported boundary owner`: strongest evidence-backed owner of first divergence (for example `raw_provider_response` or `authoritative_parsing`).
- `Cluster identity`: compact cluster label for the run or compared run family.
- `Cluster count`: number of meaningful clusters found in this pass.
- `Are later differences inherited or newly introduced?`: compact judgment of whether downstream differences preserve earlier split vs introduce net new split.
- `What is already proven`: observed evidence that is stable/repeatable.
- `What is still unproven`: unresolved claims that block admission.
- `Artifact classification`: classify each cited artifact as active-baseline authority or diagnostic-only.
- `Judgment label`: exactly one label (`HOLD`, `AUDIT`, `REPAIR`, `MEASURE`, `KEEP`, `REVERT`, `REGROUP`).
- `Main next action`: exactly one executable next step.
- `Explicit blocked actions`: concrete do-not-do list for current state.

Boundary distinction rule:
- `First visible difference stage` describes where difference is first seen.
- `Earliest supported boundary owner` describes where evidence supports causal ownership.
- These may differ; do not collapse them without evidence.

## Blocker class refinement (LLM boundary)
For boundary-heavy Layer 1 audit lines, prefer these blocker classes when evidence is sufficient:
- `provider_generation_variance`
- `authoritative_parsing_variance`
- `projection_retention_gap`
- `trigger_interpretation_variance`

If evidence is still mixed, keep a mixed class (for example `runner_instability`) until narrowed.

## Cluster-aware reporting guidance
Use cluster language, not generic "it drifted":
- stable cluster
- trigger-not-fired cluster
- winner-still-shorthand cluster
- wording variant within stable family
- warmed-run lock to cold-selected cluster

Also report:
- whether split is cluster-shaped vs random
- whether split starts upstream or downstream
- whether cluster differences are trigger-relevant

## Outcome-class default routing reference
Use one outcome class and one default next-step route.
Local lines may define additional classes, but should keep names compact.

- `parity_not_proven_runner_level` -> `audit_runner_parity_isolation_pass`
- `runner_parity_mixed` -> `audit_live_instability_isolation_pass`
- `missing_comparison_surface` -> `audit_capture_surface_strengthening_pass`
- `instability_isolated` -> `audit_repair_admission_review_pass`
- `instability_still_mixed` -> `audit_mixed_state_decomposition_pass`

## Job Copilot Buy-side North Star Rubric
Use this rubric when substantial Job Copilot audits/reviews touch decision-quality surfaces.
This rubric evaluates output quality only. It does not bypass EM/harness controls, repair gates, or founder boundaries.

### Scoring scale
Use one compact 3-point scale per surface:
- `2 = strong`: clearly aligned to the buy-side thesis with grounded evidence and calibrated confidence
- `1 = acceptable`: partially aligned; usable but with notable weakness or ambiguity
- `0 = weak`: generic/misaligned/over-claimed or not decision-useful

### Required surfaces and criteria

`Career Verdict`
- human-judge verdict alignment
- reflects what kind of person the hiring side is buying (not generic capability taxonomy framing)
- claim strength calibrated to evidence strength

`Why You`
- two evidence points are the most purchase-relevant grounded points
- phrasing is human-readable and buy-side oriented (not skill collage)
- evidence grounding remains clear

`Biggest Risk`
- expresses the most important buy-side hesitation
- risk is typed as exactly one: `missing` | `weakly_proven` | `weakly_surfaced`
- avoids generic weakness language

`Quick Checks`
- targets the most important unresolved buy-point
- specific rather than generic
- has decision utility (answer could materially change risk, confidence, verdict posture, or CTA direction)

`CTA`
- follows the same buy-side thesis
- is the highest-leverage next action
- not mechanically generic
- recommends tailored CV only when that is the best next action

`Cross-surface consistency`
- all surfaces derive from one shared buy-side thesis
- consistent primary buy-point and confidence posture
- no over-claiming in one surface that another surface undercuts
- CTA consistent with Verdict, Why You, Biggest Risk, and Quick Checks

### Rubric output shape
For each audited case, include:
- `north_star_rubric.career_verdict: { score, note }`
- `north_star_rubric.why_you: { score, note }`
- `north_star_rubric.biggest_risk: { score, risk_type, note }`
- `north_star_rubric.quick_checks: { score, note }`
- `north_star_rubric.cta: { score, note }`
- `north_star_rubric.cross_surface_consistency: { score, note }`
- `north_star_rubric.total_score` (0-12)
- `north_star_rubric.weakest_surface` (single value)
- `north_star_rubric.main_next_question` (one highest-information question tied to weakest surface)

### Priority rule
When scores are mixed, prioritize the lowest-scoring surface first.
Do not optimize one surface in isolation if it worsens cross-surface consistency.

## Judgment quality
Keep this section compact and operational.

- one `Main next question` only
- one `Why this question now` note only
- one `Why not the nearest wrong branch` note only
- one `Default audit template` only
- one `Main next action` only

## Consistency rules
- Do not mix multiple judgment labels in one output.
- Do not emit multiple competing next actions.
- Do not emit multiple competing next questions.
- Do not emit multiple wrong-branch rejection notes.
- Do not emit multiple default audit templates.
- `Main next action` must follow `Default next-step route` unless a short explicit override justification is provided.
- Do not claim baseline admission from local-only evidence.
- Do not treat diagnostic-only artifacts as active baseline truth.
- If outcome class indicates mixed or unproven parity, keep repair blocked.

## Minimal template
Use this minimal structure unless a line-specific doc requires more detail:

```md
Current task type: ...
Current MODE: ...
Active baseline: ...
Failing layer: ...
Owner case: ...
Primary blocker case: ...
Blocker class: ...
Main next question: ...
Why this question now: ...
Why not the nearest wrong branch: ...
Outcome class: ...
Default audit template: ...
Default next-step route: ...
Repair-block posture: blocked/not_blocked (...reason...)
First drift point: ...
First writable fault: ...
First visible difference stage (boundary audits): ...
First differing field (boundary audits): ...
Earliest supported boundary owner (boundary audits): ...
Cluster identity (boundary audits): ...
Cluster count (boundary audits): ...
Are later differences inherited or newly introduced? (boundary audits): ...
What is already proven: ...
What is still unproven: ...
Artifact classification: ...
Judgment label: ...
Main next action: ...
Next-step override justification (only if route overridden): ...
Explicit blocked actions: ...
```
