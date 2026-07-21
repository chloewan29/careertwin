# Line Burn-Down Plan Template

Document role: reusable operating-plan template for a single CareerTwin product line.

This template should be copied when starting or formalizing a line such as:
- JD / Job Copilot
- CV / Resume
- Interview
- Career Memory
- future lines

This file is not a global policy file.
It is the operational source of truth for one line.

---

## 1. Line identity

### Line name
- example: JD / Job Copilot

### Line mission
State the narrow mission of this line.

Examples:
- improve Layer 1 role-reading fidelity
- stabilize CV positioning control
- reduce interview-question drift
- improve evidence-memory grounding

### Line scope
State what this line includes.

### Explicitly out of scope
State what this line does not currently include.

---

## 2. Current architecture reference

### Architecture document
- path: `docs/lines/<line>/line-architecture.md`

### Current architecture summary
Summarize the current local architecture briefly.

Examples:
- semantic source of truth
- fixed layers
- downstream consumer-only rules
- key ownership boundaries

### Current main risk surfaces
List the main local failure surfaces for this line.

Examples:
- Layer 1 raw judgment
- contract transport weakening
- downstream grounding drift
- wording fidelity collapse
- CV emphasis drift
- interview focus mismatch

---

## 3. Current validation reference

### Validation strategy document
- path: `docs/lines/<line>/line-verify-strategy.md`

### Default local validation
List the default local validation pack for this line.

Examples:
- `npm run verify:daily`
- owner case replay
- stable guard case
- near-neighbor case
- drift-chain trace
- output comparison pack

### Broader measurement cadence
Define when broader measurement is due.

Examples:
- after second countable narrow repair in the same cycle
- only at explicit admission checkpoint
- only when early-measure exception is proven

### Early-measure exceptions
List conditions that justify earlier broader measurement.

---

## 4. Current active baseline

### Active verified baseline
- artifact:
- date:
- role: current code truth for this line

### Active baseline metrics
Fill in whatever metrics matter for this line.

Examples:
- human_valid
- human_invalid
- raw_vs_human
- parsed_vs_raw
- consumed_vs_parsed
- output drift count
- CV fit score delta
- interview alignment score

### Interpretation
Briefly summarize what the current baseline means.

Examples:
- current dominant problem still sits in Layer 1
- downstream mismatch remains zero
- transport is stable, wording is still weak
- owner map is still mixed

---

## 5. Diagnostic-only artifacts

List recent rejected or diagnostic-only artifacts here.

These are evidence only.
They are not active baseline authority.

### Diagnostic-only artifact registry
- artifact:
  - role:
  - why diagnostic-only:
- artifact:
  - role:
  - why diagnostic-only:

Rule:
- diagnostic-only artifacts may inform regroup/reset
- they must not replace the active baseline

---

## 6. Current cycle state

### Current cycle baseline
- artifact:

### Current loop stage
Choose one:
- AUDIT
- REPAIR
- MEASURE
- HOLD

### Current task type
Examples:
- diagnosis
- repair gate
- narrow repair execution
- cadence correction
- regroup/reset
- boundary-contract design

### Current management judgment
- label:
- single main next action:

### Current implementation status
Examples:
- no admitted repair in progress
- one admitted repair in progress
- repair reverted, regroup required
- local validation complete, measurement due

---

## 7. Countable repair state

### Current countable narrow repair count
- count:

Only count repairs that are:
- formally admitted
- implemented
- locally validated
- interpretable enough to continue

Do not count:
- audit-only steps
- regroup/reset passes
- missing-runner infrastructure passes
- blocked or ambiguous repair attempts
- reverted attempts that failed before meaningful local validation

### Counted repairs in current cycle
Use this format:

1. repair name
   - owner:
   - admitted surface:
   - local result:
   - countable: yes/no
   - note:

2. repair name
   - owner:
   - admitted surface:
   - local result:
   - countable: yes/no
   - note:

### Is broader measurement due now?
- yes/no

### If yes, why?
Examples:
- second countable narrow repair completed
- explicit admission checkpoint reached
- early-measure exception proven

### If no, why not?
Examples:
- only one countable repair completed so far
- cadence says broader measurement not yet due
- local truth still mixed

---

## 8. Current residual or owner map

### Trust level of current residual map
Choose one:
- authoritative
- provisional
- contaminated by rejected patch
- requires regroup/reset

### Current residuals / owner candidates
Use a format like:

- case / issue:
  - family:
  - failing layer:
  - current owner status:
  - first drift point:
  - first writable fault:
  - current trust level:
  - note:

Examples of owner status:
- active owner
- candidate only
- previously rejected line
- blocked re-entry
- waiting for regroup/reset
- not trustworthy yet

### Owner-priority note
If more than one owner exists, note whether:
- priority is already auto-resolved
- or still requires regroup / founder checkpoint

---

## 9. Rejected-line registry

Track rejected patch lines here.

### Rejected line entry
- line / patch name:
- touched surface:
- status: rejected
- why rejected:
- policy going forward:

Examples of policy going forward:
- do not continue this line directly
- diagnostic-only evidence only
- re-entry allowed only with stricter containment
- treat as repeated-risk family

---

## 10. Boundary-contract or separation state

Use this section when the line has target-vs-guard separation issues.

### Separation currently required?
- yes/no

### If yes:
- target:
- guards:
- current contract hypothesis:
- current owning control point:
- separation proven: yes/no
- repeatability proven: yes/no

### Next separation step
Examples:
- design-only pass
- simulation-only pass
- re-entry still blocked
- separation proven, repair may be admitted

---

## 11. Current blockers and risks

List only the top current blockers.

Examples:
- first writable fault still unstable
- owner ranking contaminated by rejected patch
- re-entry near rejected line still unsafe
- guard pack still unstable across repeat sweep
- cadence due but measurement runner missing
- downstream risk not yet measured

Keep this focused.
Do not list every minor concern.

---

## 12. Per-loop update entry

Update this after every meaningful stage.

### Latest loop entry
- date:
- task type:
- MODE at entry:
- owner under review:
- failing layer:
- first drift point:
- first writable fault:
- admitted surface:
- allowed files:
- local validation used:
- broader measurement used:
- result:
- judgment:
- single main next action:

### Notes
Keep this operational, not narrative.

---

## 13. Line-specific operating reminders

List short reminders that are specific to this line.

Examples:
- downstream is consumer-only
- CV emphasis must not outrun evidence
- interview line should not invent missing proof
- do not reopen transport while wording remains the first drift point
- re-entry into rejected trigger family requires stricter containment

---

## 14. Completion target

State what “good enough” looks like for this line.

Examples:
- improve full 20-case baseline beyond current active baseline without adding downstream mismatch
- stabilize CV line so local packs stay clean across top representative role families
- interview alignment remains stable across main owner families with no hallucinated gaps

### Minimum acceptance condition
State the minimum condition for calling the line materially improved.

### Stretch target
Optional.

---

## 15. Template usage rules

When copying this template for a new line:

1. rename it into the line folder or line plan path
2. fill in architecture and validation references first
3. record the active baseline before running new loops
4. define countable repair cadence before entering MEASURE
5. start with a trustworthy residual or owner map
6. keep rejected-line registry current
7. update only the latest operationally useful state
8. do not turn the plan into a full diary

---

## 16. Final principle

A good line plan should make it possible for:
- EM/controller
- auditor
- worker
- verifier
- planner

to resume safely without reconstructing the whole history from memory.

The line plan should answer:
- where we are
- what is trusted
- what is not trusted
- what failed
- what is due next
- what must not be repeated blindly