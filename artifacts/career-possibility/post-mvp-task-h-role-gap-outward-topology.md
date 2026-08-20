# Task H: Role-Gap Outward Topology Validation

## Starting Control HEAD
`3e024004d470db603b0ec86c670e4eda6ed28a8b`

## Topology Owner
`lib/career-possibility/career-graph-visual-adapter.ts` (`buildCareerGraphTopologySeeds`).

## Root Cause of Inward Gaps
Gap capabilities (`ROLE_ONLY_CAPABILITY`) were seeded independently of roles at a hardcoded radius of ~238. Roles were seeded later at a radius of ~420+, which caused the gap capabilities to visually sit between the user (center) and the roles (outer ring). The semantic bias in `CareerMapNeuralGraph` pulled gaps inward to their 238 radius seed, trapping them inside the role's orbit.

## Geometric Invariant
Gap capabilities are placed outward relative to their connected roles. `distance(U, R) < distance(U, G)` is enforced by setting the gap node seed radius to `maxRoleRadius + 140`. Outward projection remains positive and visually distinct.

## Single-Role Gap Behavior
For a gap capability belonging to one role, it derives its base angle from the role's topology angle, adding an outward radius buffer.

## Multi-Gap Behavior
Multiple gaps belonging to the exact same role configuration are fanned out. Sibling offsets naturally distribute gap nodes in a loose arc on the outer side of the role without rigidly stacking them on a single radial line.

## Multi-Role Shared-Gap Handling
If a gap capability is shared across multiple roles, its deterministic position is derived from the averaged direction vectors of all connected roles. It takes the maximum radius of the connected roles + 140 to ensure it is placed outwards of the furthest role it connects to.

## Files Changed
- `lib/career-possibility/career-graph-visual-adapter.ts`
- `tests/career-possibility/career-graph-visual-adapter.test.ts`

## Semantic/Data Files NOT Changed
Canonical semantic authority, provider semantics, validator, benchmark, materializer semantics, role/canonical library semantics, and eligibility logic remain entirely preserved. No duplication of canonical capability nodes was introduced. Gap nodes strictly remain `ROLE_ONLY_CAPABILITY`.

## Default Desktop Result
PASS. Graph is organic, gaps naturally float on the outer orbit of roles, keeping the central area cleanly focused on user capabilities.

## Selected-Role Result
PASS. Role selection properly focuses the role, owned capabilities, and gap capabilities without jitter. Gaps clearly communicate "what I still need" as they sit spatially beyond the role.

## Responsive Result
PASS. Graph canvas boundaries natively accommodate the expanded outer rim because zoom/pan and framing functions adapt to the total rendered domain. No nodes are stuck off-screen. 

## Task D Regression
PASS. Role focus semantic isolation and node behavior remain unchanged.

## Task E Regression
PASS. The primary user capability network visual hierarchy remains dominant. Gap nodes are pushed to the tertiary outer fringe, preventing interference.

## Task G Console Regression
PASS. The React lifecycle ownership of zoom via `useRef` remains entirely isolated. No synchronous React state warnings.

## Tests
PASS. Existing geometric assertions and new outward-distance assertions succeed.

## TypeScript
PASS.

## ESLint
PASS.

## Build
PASS.

## Product/Truth Judgment
`TASK_H_ROLE_GAP_OUTWARD_TOPOLOGY_READY`
