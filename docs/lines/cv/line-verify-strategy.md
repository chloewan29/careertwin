# CV Line Verify Strategy

Document role: validation and cadence strategy for the CareerTwin CV / Resume line.

This file defines:
- local validation expectations
- broader measurement cadence
- countable repair rules
- admission gates for CV-line changes

This is local to the CV line.
Global operating rules still come from:
- `docs/control/em-operating-system.md`
- `docs/control/policy-registry.md`

---

## 1. Validation goal

CV-line validation exists to answer:

- did the repair improve the intended CV issue
- did it preserve target-role alignment
- did it preserve evidence truth
- did it avoid inflation or downstream semantic drift
- did it avoid harming nearby role families

Validation should be proportional.
Do not default to the heaviest validation every time.

---

## 2. Default validation ladder

## Level A - Narrow local validation

Use when:
- one narrow CV repair was admitted
- the writable surface is local
- blast radius appears small

Typical pack:
- owner CV case
- one stable guard CV case
- one near-neighbor case if relevant
- compare:
  - target role direction
  - evidence selection
  - claim strength
  - headline / summary / bullets consistency

Typical questions:
- did the owner CV improve
- did the target role stay the same
- did evidence stay truthful
- did any guard case become inflated or drift generic

---

## Level B - Extended local validation

Use when:
- the path is shared across a role family
- one owner case is not enough
- there is moderate collateral risk

Typical pack:
- owner case
- stable guard case
- 1-3 nearby family cases
- side-by-side compare of:
  - positioning thesis
  - key evidence choices
  - claim language
  - gap handling

---

## Level C - Broader measurement

Use when:
- a countable repair reached a cadence checkpoint
- a shared control path changed
- the current question is baseline admission
- local validation is mixed
- founder explicitly requests broader confidence

Possible forms:
- representative benchmark CV set
- fixed evaluation pack across multiple role families
- broader before/after artifact comparison
- manual or semi-structured scoring on:
  - role alignment
  - evidence truth
  - specificity
  - inflation risk
  - guard-case containment

---

## 3. What counts as a successful local validation

A local validation should usually establish:

1. owner case improved
2. target role direction stayed coherent
3. evidence truth stayed intact
4. no obvious inflation was introduced
5. stable guard remained acceptable
6. result is interpretable enough to continue

If these are not true:
- do not call it locally keepable

---

## 4. Countable repair rule for CV line

Only count a CV repair toward cadence if all are true:
- repair was formally admitted
- implementation completed
- local validation completed
- result was interpretable enough to continue

Do not count:
- audit-only redesign passes
- prompt brainstorming without admitted change
- blocked repair attempts
- reverted attempts that failed before meaningful local validation
- formatting-only experiments that do not change CV semantic behavior

---

## 5. Default cadence

Default CV-line cadence:

- after the first countable narrow repair in a cycle:
  - run local validation only
  - do not run broader measurement yet by default

- after the second countable narrow repair in the same cycle:
  - broader measurement is due by default
  - unless a line-specific reason blocks it

A cycle means:
- work proceeding from the same active baseline
- without a new KEEP replacing that baseline
- and without REVERT resetting the cycle

---

## 6. Early-measure exceptions

Run broader measurement earlier only if one of these is true:
- the changed surface affects many CV outputs
- claim-strength policy changed globally
- a shared positioning-control path changed
- local validation is mixed and broader truth is needed
- founder explicitly requests immediate broader confidence

If no exception is proven:
- do not run broader measurement early

---

## 7. Broader measurement scoring dimensions

When broader CV measurement is run, evaluate at least:

1. role alignment
2. evidence truth
3. specificity of positioning
4. claim-strength discipline
5. gap honesty
6. guard-case containment
7. overall recruiter readability without semantic distortion

---

## 8. KEEP / REVERT / REGROUP logic

### KEEP
Use when:
- broader measurement supports the change
- owner improvement survives
- collateral harm is acceptable or absent

### REVERT
Use when:
- broader measurement regresses
- inflation risk increases materially
- guard-case damage outweighs owner gain
- role alignment weakens

### REGROUP
Use when:
- owner improved locally
- broader result is mixed
- current residual map or failure-family understanding needs refresh before more repairs

### HOLD
Use when:
- repair is not yet admissible
- separation or claim-control remains unproven
- first writable fault is unstable

---

## 9. Re-entry discipline for CV line

If a CV repair re-enters a recently rejected line:
- require explicit statement of what is different
- require stricter claim-control guard pack
- require narrower containment than the rejected attempt
- do not admit repair under normal fresh-repair assumptions

---

## 10. Suggested local validation pack fields

For owner and guard cases, inspect:

- target role statement
- role family / shape
- selected evidence themes
- headline
- summary
- top bullet emphasis
- claim strength
- gap handling
- misleading or inflated language
- generic wording collapse

---

## 11. Output requirement for CV verification

Every substantial CV validation result should state:

- current task type
- current MODE
- owner case result
- stable guard result
- nearby case result if used
- whether local keepable is justified
- whether broader measurement is due now
- one judgment label
- one main next action

---

## 12. Local reminder

A prettier CV is not automatically a better CV.

The CV line should prefer:
- role truth
- evidence truth
- controlled positioning
- honest strength

over:
- generic polish
- inflated confidence
- smooth but wrong positioning
