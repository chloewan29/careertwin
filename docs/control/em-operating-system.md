# CareerTwin EM Operating System

Document role: global engineering-management operating system for CareerTwin development.

This document defines the reusable loop discipline that applies across CareerTwin product lines, including:
- JD / Job Copilot
- CV / Resume
- Interview
- Career Memory
- future lines

It is not the architecture document for any one line.
Each line must still define its own:
- architecture
- validation strategy
- active plan
- local residual map

This file defines the shared operating model used to manage work safely and consistently.

---

## 1. Core purpose

The EM operating system exists to make CareerTwin development:

- founder-safe
- diagnosable
- narrow in scope
- repeatable
- measurable
- recoverable after failed changes

Its role is not to maximize speed at any cost.
Its role is to produce one correct next decision at a time.

---

## 2. Shared loop states

All substantial line work should be managed through the same core loop:

1. AUDIT
2. REPAIR
3. MEASURE
4. KEEP / REVERT / REGROUP / HOLD

Do not skip stages casually.

These labels are operating states, not just descriptions.

### AUDIT
Used when:
- diagnosing the real problem
- rebuilding owner map
- locating first drift point
- locating first writable fault
- regrouping after a failed patch
- designing a boundary contract
- validating whether a safe repair is even admissible

AUDIT must not silently become implementation.

### REPAIR
Used when:
- failing layer is identified
- first drift point is identified
- first writable fault is stable enough
- writable surface is narrow enough
- allowed files are explicit
- a proportional validation plan exists

REPAIR is not broad redesign.

### MEASURE
Used when:
- a narrow repair has already landed
- local validation has completed
- the next question is broader safety or baseline admission

MEASURE is not the place to continue editing code.

### HOLD
Used when:
- evidence is still incomplete
- the writable fault is unstable
- owner ranking is not trustworthy
- a re-entry is too risky
- the next step is not safely admissible yet

HOLD is not failure.
It is a controlled pause.

### KEEP
Used when:
- the change survives the required broader gate
- a stronger baseline is legitimately earned

### REVERT
Used when:
- the broader gate fails
- regression outweighs the local gain
- the patch does not earn admission

### REGROUP
Used when:
- broader measurement does not justify a clean keep
- but the result also should not be treated as a simple revert-without-learning
- owner map or family understanding must be refreshed before the next repair

---

## 3. The canonical loop

Every substantial line should follow this shape:

### Stage A — owner or problem discovery
Determine:
- task type
- current loop state
- current active baseline
- diagnostic-only artifacts or failed branches
- failing layer
- what is already proven
- what is still unproven
- whether the next owner is trustworthy

### Stage B — writable fault discovery
Determine:
- first drift point
- first writable fault
- allowed writable surface
- whether repair is actually admissible

### Stage C — narrow repair
If admissible:
- execute one narrow repair
- stay inside admitted scope
- do not silently widen

### Stage D — local validation
Run the smallest proportional validation that can answer whether the repair helped.

### Stage E — broader measurement
Run broader measurement only when due under the current line’s validation cadence.

### Stage F — judgment
Choose exactly one:
- KEEP
- REVERT
- REGROUP
- HOLD

Then update the line plan and continue from the new current state.

---

## 4. Task-type discipline

Before meaningful action, classify the task as one of:

- diagnosis
- fix
- cleanup
- verification
- architecture review

If unclear, default to:
- diagnosis

Do not silently mix task types.

If work changes task type mid-loop:
- state the transition explicitly

Examples:
- owner-isolation trace = diagnosis
- admitted narrow code change = fix
- `verify:daily` or full baseline audit = verification
- dead-path removal after accepted fix = cleanup
- redefining line layers or ownership boundaries = architecture review

---

## 4A. Line-routing gate (JD-line vs proof-chain line)

Before diagnosis or repair, classify the active line as:
- JD-line task
- proof-chain task

This is a routing decision, not a new stage model.
Stages remain: AUDIT / REPAIR / MEASURE / HOLD.

### JD-line routing
Use JD-line semantics when the issue is primarily about:
- role reading drift
- verdict/contract fidelity drift
- recommendation mismatch rooted in contract divergence
- authoritative story mismatch rooted in JD-line logic

Primary references:
- `docs/control/job-copilot-layer-rule.md`
- JD-line architecture and contract-harness skill surfaces

### Proof-chain routing
Use proof-chain semantics when the issue is primarily about:
- CV output proof quality
- `Why you` buying-proof quality
- proof genericity leakage
- evidence family compatibility
- proof admission
- lead emphasis / ordering
- render wording quality after proof selection
- source-confidence and proof-eligibility handling for non-CV inputs when relevant

Primary references:
- `docs/control/lines/cv/job-copilot-cvline-architecture.md`
- `docs/control/job-copilot-proof-chain-audit.md`
- `docs/control/lines/cv/job-copilot-cvline-decision-template.md`
- `docs/product/why-you-buying-case-checklist.md`

Naming clarification:
- current `cvline` filenames are bootstrap shorthand for the active proof-chain control surface
- do not treat `cvline` naming as a permanent CV-only boundary

Rule:
- do not default proof-chain tasks into JD-line contract semantics
- do not route JD-line contract drift into proof-chain render-only semantics

---

## 5. First drift point vs first writable fault

These are not the same thing.

### First drift point
The earliest point where meaning or behavior materially drifts.

### First writable fault
The earliest safe control point that should be changed now.

A line can have:
- first drift point upstream
- but first writable fault at a narrower later control surface

Do not jump from “earliest wrong thing” to “broadest possible fix.”

The system should prefer the smallest safe writable control point.

---

## 6. Repair admission rule

No code change before repair admission.

Repair is admissible only if all are true:

1. current task type is clear
2. current MODE is REPAIR
3. failing layer is identified
4. first drift point is identified
5. first writable fault is stable enough
6. writable surface is explicit
7. allowed files are explicit
8. proportional validation plan is explicit
9. broader alternatives are not yet proven necessary

If any of these are missing:
- do not repair
- remain in AUDIT or HOLD

---

## 7. Allowed-files rule

Before implementation:
- name allowed files explicitly

Prefer:
- one file
- or one tightly related pair

If file scope cannot be named clearly:
- repair is not admitted yet

Do not allow vague scope such as:
- “Layer 1 files”
- “whatever is needed”
- “renderer if necessary”

---

## 8. One-main-next-action rule

Every substantial decision must end with:
- exactly one judgment label
- exactly one main next action

Do not emit multiple competing next programs by default.

Examples of acceptable main next actions:
- run regroup/reset audit
- open one narrow repair admission
- run local validation
- run broader measurement
- revert the rejected patch
- remain in HOLD and run one design pass

---

## 9. Local vs global truth

This is one of the most important system rules.

### Local keepable
A change may be locally keepable when:
- owner case improved
- guard pack remained acceptable
- local validation is interpretable

### Global keep
A change may be globally kept only when:
- the broader gate succeeds
- active baseline is not worsened
- collateral regressions are acceptable or absent

Never confuse:
- local keepable
with
- global keep

---

## 10. Baseline authority rule

Separate clearly between:

### Active baseline
The current code truth.
Used for:
- owner selection
- comparison
- current plan state

### Diagnostic-only artifacts
Failed-run or rejected-patch evidence.
Used for:
- understanding
- regrouping
- narrowing future hypotheses

Diagnostic-only artifacts must not become active baseline authority merely because they are recent.

---

## 11. Revert rule

If a broader gate fails:
- revert to the last active verified baseline
- treat the failed patch line as rejected
- keep its artifacts as diagnostic-only
- update the plan
- return to AUDIT or REGROUP as appropriate

Do not emotionally protect rejected patches.

---

## 12. Measurement cadence rule

Do not default to the heaviest measurement after every repair.

Each line should define its own cadence, but the global principles are:

- broader measurement should be milestone-based
- first local win does not automatically trigger the heaviest gate
- cadence must be explicit in the line plan
- early broader measurement requires explicit justification

Typical examples:
- broader measurement after the second countable narrow repair in a cycle
- broader measurement earlier only if shared-path blast radius or mixed truth justifies it

---

## 13. Re-entry discipline

If a line re-enters an owner after a previously rejected patch in the same broad mechanism family, do not treat it like an ordinary fresh repair.

Require:
- explicit statement of what is different from the rejected line
- narrower writable surface or stronger blast containment
- stricter local guard-pack
- explicit explanation of why this is not simply repeating the failed line

If those are not satisfied:
- do not admit repair
- remain in AUDIT or HOLD

---

## 14. Boundary-contract-before-patch rule

When a line repeatedly fails because a case cannot be safely separated from guard cases, do not continue patch tuning blindly.

First do a boundary-contract design pass.

A valid boundary-contract pass should answer:
- what makes the target eligible
- what keeps the guards excluded
- which control point should own the separation
- why the proposal narrows the boundary instead of widening the whole gate

If separation is still unproven:
- repair remains blocked

---

## 15. Owner-priority rule

When multiple owner candidates exist:
- do not stop for founder review by default

Use this default priority order:

1. mechanism purity
2. first writable fault stability
3. blast radius controllability
4. owner-isolation confidence
5. recent rejection proximity penalty
6. local validation cost and cleanliness

If one owner clearly wins:
- auto-select it
- continue the loop

Founder review is needed only when:
- candidates remain materially tied
- the choice would materially change architecture assumptions
- the choice would materially change cadence or branch strategy
- evidence remains too mixed for safe admission

---

## 16. Audit infrastructure continuation rule

If the next action is an audit-only step and the required runner or artifact-producing utility is missing, the system may create the smallest safe audit-only runner needed to unblock the loop.

Allowed only if:
- current MODE remains AUDIT
- no repair is admitted
- no product logic is changed
- the runner is narrowly scoped to trace collection / artifact generation / audit orchestration

After creating the runner:
1. execute the blocked audit step
2. produce the artifact
3. update the plan
4. return to EM control

---

## 17. Execution continuation rule

The loop controller must not stop after naming the next action if that action is immediately executable in the current repo context.

If the judged next action is executable now:
- execute it
- update the line plan
- return to loop control
- continue until a true stop condition is reached

This applies to:
- audit-only regroup/reset
- admitted narrow repair
- local validation
- broader justified measurement

---

## 18. True stop conditions

The loop may stop only when one of these is true:

- required artifacts are missing and cannot be safely generated within audit scope
- first drift point or first writable fault is still unstable
- repair admission is not satisfied
- repo state is inconsistent
- approval is required
- the current state is a legitimate founder checkpoint under explicit policy
- a line-specific rule explicitly blocks further execution

Do not stop merely because the next step feels uncertain.
Stop only when the uncertainty is policy-relevant and unresolved.

---

## 19. Plan-file rule

Every line must maintain a plan file.

The plan file is the operational source of truth for that line.

At minimum it should track:
- active baseline
- current stage
- countable repairs in current cycle
- current residual set
- rejected lines
- latest judgment
- single main next action

The loop controller must update the plan after every meaningful step.

---

## 20. Output contract

Every substantial loop step should return:

1. current task type
2. current MODE
3. failing layer
4. first drift point
5. first writable fault
6. what is proven
7. what is still unproven
8. whether repair is admissible
9. judgment label
10. single main next action

If implementation occurred, also include:
- exact files changed
- plain-language change summary
- why the change was needed
- exact commands run
- verification result
- artifacts produced
- remaining blockers or risks
- assumptions made
- verification confidence status

---

## 21. Subagent roles

The operating system assumes distinct roles may exist:

### EM / controller
Owns:
- stage
- judgment
- next action
- escalation
- keep / revert / regroup

### auditor
Owns:
- drift tracing
- owner-isolation
- first writable fault challenge
- boundary-contract challenge

### worker
Owns:
- admitted implementation only
- strict allowed-files execution
- no strategy changes

### verifier
Owns:
- cadence compliance
- local validation completeness
- broader gate compliance
- guard-pack correctness

### planner
Owns:
- plan-file updates
- cycle count maintenance
- baseline / rejected-line bookkeeping

These roles may be separate agents or combined, but the responsibilities should remain distinct.

Line-routing note:
- role responsibilities do not change by line
- only the line-specific reference surface changes (JD-line docs vs proof-chain docs currently stored under `cvline` filenames)

---

## 22. What this operating system is not

This document is not:
- the architecture of JD, CV, or Interview
- the full verification strategy for every line
- the residual inventory for a specific line
- a product roadmap
- a substitute for line-specific architecture docs

It is the shared loop discipline above those line-specific documents.

---

## 23. Final principle

The system is working when:
- each loop reduces ambiguity
- rejected lines become useful evidence
- owner selection becomes more trustworthy
- repairs become narrower
- broader gates are run only when due
- bad patches are reverted without drama
- the founder has to intervene less often over time

The goal is not to eliminate all failed repairs.

The goal is to ensure that each controlled repair attempt,
whether kept or reverted,
makes the next decision better.
