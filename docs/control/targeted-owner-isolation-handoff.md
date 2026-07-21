Use the em agent as loop controller and continue execution if the next action is executable.

Read first:
- AGENTS.md
- docs/control/current-system-memory.md
- docs/control/em-operating-system.md

Current state:
- current MODE = AUDIT
- next judged action = targeted owner-isolation trace
- the required targeted audit runner is not currently present as an immediately executable canonical step
- no repair is admitted
- product logic is out of scope

Your task is:

1. confirm that this remains an AUDIT-only infrastructure-unblocking step
2. create the smallest safe targeted owner-isolation audit runner needed for the current case
3. do not edit product logic
4. do not touch repair surfaces
5. keep scope strictly limited to trace collection / artifact generation for the owner-isolation step
6. execute the runner immediately after creating it
7. produce the artifact
8. update the active residual burn-down tracking note only if a canonical plan surface is available
9. return to EM control and state:
   - current task type
   - current MODE
   - what is now proven vs unproven
   - whether first writable fault is now stable
   - whether REPAIR is now admissible
   - exactly one judgment label
   - exactly one main next action

Constraints:
- one narrow runner only
- no broad tooling program
- no architecture work
- no implementation of the actual product fix
- no hidden cleanup
- follow existing artifact naming conventions if visible in repo
- preserve founder-safe discipline
