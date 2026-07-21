# Default Autonomous Loop Profile

Document role: default autonomous execution profile for substantial CareerTwin loops when founder supervision is intentionally reduced.

Use this profile when:
- founder wants Codex to continue running without frequent manual checkpoints
- the loop should keep moving until a true stop condition is reached
- the repo already contains:
  - `AGENTS.md`
  - `docs/control/current-active-brief.md`
  - `docs/control/current-system-memory.md`
  - `docs/control/em-operating-system.md`
  - `docs/control/policy-registry.md`
  - an active line plan
  - required agents and skills

This is not a product architecture document.
It is an execution profile for autonomous loop progression.

---

## 1. Goal

The goal of this profile is to let CareerTwin loops continue automatically when policy already resolves the next step.

The system should:
- continue safely
- stop only when policy truly requires it
- keep the active line plan current
- preserve founder-safe discipline
- reduce unnecessary founder interruption

The system should not:
- stop merely because the next step is non-trivial
- create founder checkpoints by habit
- keep asking for permission when policy already covers continuation
- continue into implementation when repair admission is not satisfied

---

## 2. Default role stack

The autonomous profile assumes these agents are active:

- `em` = loop controller
- `auditor` = diagnostic challenge
- `verifier` = cadence / gate / judgment checker
- `planner` = line-plan state maintainer
- `governor` = governance and continuation authority

These roles may be implemented as separate agents or equivalent configured roles,
but the responsibilities must remain distinct.

---

## 3. Required startup read set

At the start of an autonomous run, read:

- `AGENTS.md`
- `docs/control/current-active-brief.md`
- `docs/control/current-system-memory.md`
- `docs/control/em-operating-system.md`
- `docs/control/policy-registry.md`
- the active line plan
- line-specific architecture document if relevant
- line-specific verify strategy if relevant

The active line plan is the current operational source of truth unless it is explicitly stale or contradictory.

---

## 4. Autonomous continuation principle

If the current next action is executable now and no true stop condition remains active, the loop must continue automatically.

Do not stop after naming the next action if:
- current policy already covers the next step
- required artifacts exist or can be safely generated in current scope
- no founder-only checkpoint is required
- repair admission is satisfied if implementation is involved

This rule applies to:
- audit-only regroup/reset
- owner-isolation
- boundary-contract design
- boundary-contract simulation
- admitted narrow repair
- local validation
- due broader measurement
- revert and post-revert regroup

---

## 5. Governor continuation authority

Governor must explicitly determine:

- policy stack sufficient for continuation: yes/no
- founder review required by policy: yes/no

### Continue automatically when:
- policy stack sufficient for continuation = yes
- founder review required by policy = no
- no true stop condition remains active
- the next step is executable within current repo scope

### Do not continue automatically when:
- policy stack sufficient for continuation = no
- founder review required by policy = yes
- or a true stop condition remains active

Do not invent a founder checkpoint merely because a step is complex, costly, or important.
Complexity alone is not a stop condition.

---

## 6. Strict founder-checkpoint policy

Founder review is only justified when explicitly required by policy.

Allowed founder checkpoints:
- architecture-changing choice beyond current rules
- cadence-changing choice beyond current rules
- branch-strategy-changing choice beyond current rules
- true unresolved policy conflict
- explicit founder-only decision encoded in current policy

Not allowed:
- “this seems important”
- “there are two plausible owners”
- “the step is a full measurement”
- “the next audit is non-trivial”
- “the repair might be risky” if repair gate already defines the risk policy

If current policy resolves the situation, continue.

---

## 7. Standard autonomous loop

The system should keep running this loop:

### Stage A — AUDIT
- determine current task type
- determine current MODE
- determine failing layer
- determine first drift point
- determine first writable fault if possible
- determine whether owner ranking is trustworthy
- determine whether regroup/reset is needed

If the next audit step is executable now:
- execute it immediately
- update the plan
- continue

### Stage B — REPAIR
Enter only when repair admission is satisfied.

Then:
- constrain files
- constrain allowed change type
- execute one narrow repair
- run local validation with `npm run verify:daily` by default for bounded local loops
- update the plan
- continue

### Stage C — MEASURE
If broader measurement is due and executable:
- run it immediately
- compare against active baseline
- determine KEEP / REVERT / REGROUP
- update the plan
- continue

### Stage D — REVERT / REGROUP / HOLD
If revert is required:
- revert immediately
- restore active baseline
- update plan
- continue into regroup/reset if that next step is executable

If regroup is required:
- regroup immediately if executable
- update plan
- continue

If HOLD remains:
- continue only if the next step is still an executable audit-only or simulation-only step
- otherwise stop only if a true stop condition still remains active

---

## 8. True stop conditions

Autonomous execution may stop only if one of these is true:

1. required artifacts are missing and cannot be safely generated in current scope
2. repair admission is not satisfied and the next audit step is not executable
3. first drift point or first writable fault remains unstable and no executable audit step remains
4. repo state is inconsistent
5. approval is explicitly required
6. founder review is explicitly required by policy
7. a line-specific rule explicitly blocks further automatic progression

If none of these are true:
- do not stop

---

## 9. Audit-only continuation rule

If the system is in AUDIT or HOLD and the next admissible step is still audit-only, the system should continue automatically.

This includes:
- regroup/reset
- owner-isolation
- boundary-contract design
- simulation-only separation proof
- audit infrastructure creation when explicitly allowed
- owner-map refresh

HOLD does not mean “stop by default.”
HOLD only means “repair is blocked.”
If an audit-only next step is executable, continue.

---

## 10. Repair continuation rule

If:
- repair is admissible
- writable surface is stable
- allowed files are explicit
- allowed change type is explicit
- local validation plan is explicit

then:
- transition to REPAIR
- execute the repair if executable now
- run local validation with `npm run verify:daily` by default for bounded local loops
- update the plan
- continue

Do not remain in HOLD or AUDIT after repair admission has been granted unless:
- a different explicit stop condition still applies

---

## 11. Measurement continuation rule

If:
- current MODE = MEASURE
- broader measurement is due under cadence
- or an explicit early-measure exception is proven
- and the measurement runner is available

then:
- execute the broader measurement immediately
- do not stop after merely naming it

After measurement:
- choose exactly one of KEEP / REVERT / REGROUP
- update the plan
- continue if the next step is executable

For broader measurement, milestone, baseline-admission, or other Level-3/full-baseline needs:
- use `npm run verify` only when policy/cadence/explicit scope requires it

---

## 12. Post-revert continuation rule

If REVERT is the correct judgment and revert is executable:
- revert immediately
- restore active baseline
- run required post-revert sanity check if defined
- update the plan
- continue into regroup/reset if that next step is executable now

Do not stop merely because revert just happened.

---

## 13. Multi-agent output contract

Every substantial autonomous step must choose one return-contract mode:

- `short_light_loop` (default for branch-local bounded loops)
- `full_completion_record` (required for heavy/significant events)

### `short_light_loop` (default)

Default compact fields:
- decision label
- current task type / MODE
- current owner or failing layer
- first drift point
- first writable fault (or explicit unstable/blocked status)
- repair admission allowed: yes/no
- one main next action
- artifact path produced (or `none`)
- automation continuation: continue locally yes/no
- `memory_sync_required: yes|no`
- `memory_sync_targets: [ ... ]`

Short mode command/file detail rule:
- do not emit full command transcripts by default
- do not emit exhaustive changed-file detail unless governance-critical
- keep detailed commands/files in artifacts or provide on request

### `full_completion_record` required when any trigger is true

- repair patch landed
- control-doc or policy patch landed
- founder-boundary reached
- active line split, merge, park, reopen, or new active branch decision landed
- substantial baseline audit completed
- broad verification run completed
- memory sync required for major truth change
- user explicitly requests full record
- verifier or governor explicitly escalates to full trace output

Every `full_completion_record` substantial autonomous step must return explicit sections for:

- auditor conclusion
- verifier conclusion
- planner update summary
- governor diagnosis
- policy stack sufficient for continuation
- founder review required by policy
- em synthesis
- one judgment label
- one main next action

### Observability floor (all modes)

Short mode must still preserve:
- repair-gate clarity
- line/branch state clarity
- automation continuation clarity
- memory-sync accountability
- founder-boundary visibility

If implementation occurred, also include:
1. Exact files changed
2. What was changed in plain language
3. Why this change was needed
4. Exact commands run
5. Verification result
6. Artifacts or outputs produced
7. Remaining blockers or risks
8. Any assumptions made
9. Verification confidence status

---

## 14. Continuation consistency rule

If:
- policy stack sufficient for continuation = yes
- founder review required by policy = no
- the next step is executable now

then:
- final EM synthesis must authorize continuation
- the loop must not stop at founder review
- the final judgment / MODE must align with the executable next step

Examples:
- if repair is admissible, final state must not remain HOLD
- if due measurement is runnable, final state must not stop after naming it
- if regroup/reset is executable post-revert, the loop should continue into it

---

## 15. Plan maintenance rule

After every meaningful autonomous step:
- update the active line plan

At minimum keep current:
- current stage
- active baseline
- diagnostic-only artifacts
- rejected lines
- current cycle repair count
- latest judgment
- one main next action

The planner should keep the plan resumable without founder reconstruction.

---

## 16. Default autonomous launch prompt

Use this exact template when founder wants reduced supervision:

```text
Use the em agent as loop controller.
Use auditor to challenge first drift point, writable fault, owner trust, and boundary-contract quality.
Use verifier to check cadence, repair admission, validation completeness, and judgment correctness.
Use planner to keep the active line plan current.
Use governor to detect whether the latest loop exposed any new reusable policy gap and whether policy already authorizes continuation.

Read first:
- AGENTS.md
- docs/control/current-active-brief.md
- docs/control/current-system-memory.md
- docs/control/em-operating-system.md
- docs/control/policy-registry.md
- the active line plan

Resume from the current recorded stage.
Use only allowed mode labels: AUDIT / REPAIR / MEASURE / HOLD.
Give exactly one judgment label and one main next action at each meaningful stage.
If the next action is executable now, execute it now.
After execution, update the active line plan.
Continue until a true stop condition is reached.

Return explicit sections for:
- auditor conclusion
- verifier conclusion
- planner update summary
- governor diagnosis
- policy stack sufficient for continuation
- founder review required by policy
- em synthesis
- one judgment label
- one main next action

17. Final principle

The autonomous profile is working when:

the system continues through ordinary uncertainty
founder review happens only when policy explicitly requires it
repeated loop steps no longer need manual nudging
diagnostics, repair, measurement, revert, and regroup all continue naturally
the founder wakes up to a line that has moved forward or stopped only for a real reason

The goal is not endless action.

The goal is:

correct autonomous continuation
correct autonomous stopping
and fewer unnecessary founder interruptions.
