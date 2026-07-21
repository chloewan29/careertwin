# Default Codex Launch Prompt

Use this prompt when starting or resuming a substantial CareerTwin loop.

---

Use the em agent as loop controller.
Use auditor to challenge first drift point, first writable fault, owner trust, and boundary-contract quality.
Use verifier to check cadence, repair admission, validation completeness, and judgment correctness.
Use planner to keep the active line plan current.
Use governor to detect whether the latest loop exposed any new reusable policy gap.

Read first:
- AGENTS.md
- docs/control/current-active-brief.md
- docs/control/current-system-memory.md
- docs/control/em-operating-system.md
- docs/control/policy-registry.md
- the active line plan

Line-routing gate (before diagnosis/repair):
- first classify the task as JD-line or proof-chain
- JD-line tasks route to `docs/control/job-copilot-layer-rule.md` plus JD-line architecture/contract-harness skill surfaces
- proof-chain tasks route to:
  - `docs/control/lines/cv/job-copilot-cvline-architecture.md`
  - `docs/control/job-copilot-proof-chain-audit.md`
  - `docs/control/lines/cv/job-copilot-cvline-decision-template.md`
  - `docs/product/why-you-buying-case-checklist.md`
  - note: `cvline` filenames are current bootstrap shorthand for proof-chain routing, not a permanent CV-only boundary

Operating rules for this run:
- Use only allowed mode labels: AUDIT / REPAIR / MEASURE / HOLD.
- Give exactly one judgment label and one main next action at each meaningful stage.
- If the next action is executable now, execute it now.
- After execution, update the active line plan.
- Continue the loop until a true stop condition is reached.
- Do not stop after naming a next action if that action is immediately executable in the repo context.

Global discipline:
- Do not allow code changes before repair admission is satisfied.
- Do not confuse local keepable with global keep.
- Do not treat diagnostic-only artifacts as active baseline authority.
- Do not widen scope silently.
- Do not reopen architecture casually.
- Do not bypass cadence rules.
- Do not continue from a rejected patch state without restore/revert discipline.

Required multi-agent output sections:
- auditor conclusion
- verifier conclusion
- planner update summary
- governor diagnosis
- em synthesis
- one judgment label
- one main next action

If the current step includes implementation, also include:
1. Exact files changed
2. What was changed in plain language
3. Why this change was needed
4. Exact commands run
5. Verification result
6. Artifacts or outputs produced
7. Remaining blockers or risks
8. Any assumptions made
9. Verification confidence status

True stop conditions:
- required artifacts are missing and cannot be safely generated in current scope
- first drift point or first writable fault is still unstable
- repair admission is not satisfied
- repo state is inconsistent
- approval is required
- a founder checkpoint is explicitly justified by policy
- a line-specific rule explicitly blocks further automatic progression

Resume rule:
- resume from the current recorded stage in the active line plan
- do not reconstruct the full project history unless required
- treat the plan as the operational source of truth unless it is explicitly stale or contradictory
