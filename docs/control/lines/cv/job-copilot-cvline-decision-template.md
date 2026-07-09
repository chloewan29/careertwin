Status
- secondary-authority
- cv-line decision contract template

Default Read
- targeted

When To Read
- when substantial CV / Why You / proof-chain decisions are being made
- when returning CV-line audit / repair / keep / regroup judgments

Do Not Use For
- architecture source of truth
- startup routing
- accepted system memory
# Job Copilot CV-line Decision Template

Use this template for substantial CV / `Why you` / proof-chain decisions.

## Required Management Fields

1. Current task type
2. Current MODE
3. Failing layer (A/B/C/D/E)
4. First drift point
5. First writable fault
6. In-scope correction area
7. Out-of-scope areas
8. Allowed files
9. Proportional verification plan
10. Single main next action
11. memory_sync_required
12. memory_sync_targets
13. recommended next step

## Required Decision Label

Choose exactly one:
- HOLD
- AUDIT
- REPAIR
- MEASURE
- KEEP
- REVERT
- REGROUP

## Judgment Discipline

Separate clearly:
- observed
- inferred
- unproven
- recommended
- why this is the smallest safe next step

## Loop Decision Rules

- Use exactly one judgment label.
- Use exactly one main next action.
- If a repair lands, follow with an explicit `KEEP`, `REVERT`, or `REGROUP` judgment.
- If repair is not admitted, remain in `AUDIT` or `HOLD`.
- If a repair is kept, route to the next highest-leverage residual owner by default instead of reopening the kept owner.

## CV-line Closure / Stop Rule

Close the current structural loop when:
- structural owner is fixed
- strongest proof is no longer buried
- claim strength no longer materially overreaches
- remaining issues are low-leverage polish
- do not polish indefinitely after structural owner problems are reduced

## Optional Compact Output Skeleton

- Artifact discovery:
- Current MODE:
- Failing layer:
- First drift point:
- First writable fault:
- Main blocker:
- Allowed files:
- Verification plan:
- Single next action:
- memory_sync_required:
- memory_sync_targets:
- recommended next step:
