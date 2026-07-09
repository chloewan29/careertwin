# Job Copilot Proof-chain Audit (CV / Why-you Bootstrap)

## Purpose

Define the audit method for CV / `Why you` proof-chain quality without copying JD-line contract harness semantics.

This method reuses the proven execution skeleton:
- artifact-first discovery
- explicit MODE (AUDIT / HOLD / REPAIR / MEASURE)
- first drift point before fixes
- first writable fault before admission
- one single main next action

## Key Definitions

### First Drift Point (Proof-chain)

The earliest layer where proof quality or buying-case integrity first becomes materially wrong for the user-facing output.

Practical test:
- If downstream fixes cannot correct the issue without rewriting upstream meaning, drift started upstream.

### First Writable Fault (Proof-chain)

The earliest safe control surface that can correct the observed drift with narrow scope and proportional verification.

Practical test:
- Prefer the smallest upstream surface that can fix the problem for the observed pattern without cross-line expansion.

## Failure-type Distinction

### Evidence-generation problem (Layer A)
- Evidence units are inherently generic, malformed, duplicated, or low-information.

### Family/compatibility problem (Layer B)
- Evidence family mapping allows weakly compatible proof to compete as lead proof.

### Proof-admission problem (Layer C)
- Incompatible or low-value proof is admitted into the `Why you`/CV proof set when better proof exists.

### Leading/ordering problem (Layer D)
- Admitted set is acceptable, but lead emphasis picks the wrong proof.

### Render-wording problem (Layer E)
- Proof selection is acceptable, but final wording is generic/taxonomy-heavy/low-conviction.

## Minimal Audit Flow

1. Choose a bounded sample
- use current accepted/active output sample and latest authoritative artifacts
- avoid broad reruns unless justified

2. Identify user-facing failure
- state what user sees (`Why you`, CV bullets, recommendation alignment context)

3. Trace to first proof-chain drift point
- evaluate A -> B -> C -> D -> E in order
- stop at earliest supported drift point

4. Identify first writable fault
- name the smallest safe control surface
- reject broader alternatives unless proven necessary

5. Define allowed files
- list explicit writable file scope for the next step

6. Define proportional validation
- specify narrow validation sample and pass/fail checks
- include regression checks for subject/frame/recommendation consistency when relevant

7. Recommend one single next action
- HOLD, AUDIT, REPAIR, MEASURE, KEEP, REVERT, or REGROUP

## Audit Output Contract

For each substantial proof-chain audit, include:
- artifact discovery (what was used and why)
- current MODE
- failing layer
- first drift point
- first writable fault
- proven vs unproven
- main blocker
- proportional validation plan
- single main next action

## Keep / Revert / Regroup Discipline

- KEEP: only when target metric/problem improves and no material drift appears.
- REVERT: when change fails target improvement or introduces material drift.
- REGROUP: when repeated narrow fixes stall and dominant failure mode is still unclear.

Do not continue patching after a failed keep gate without reclassifying dominant failure mode.
