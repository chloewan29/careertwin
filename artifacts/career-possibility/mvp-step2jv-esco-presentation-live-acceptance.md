# MVP STEP 2J.V — ESCO PRESENTATION LIVE ACCEPTANCE

## 1. False-Edge Repair
The legacy legacy `family_contains_capability` edge from `YOU` has been removed. A truthful semantic edge `user_owns_capability` was added to `CareerMapGraphEdgeType` and mapped to a new `USER_CAPABILITY` layout link.

## 2. Final Layout Mechanism
Instead of grouping by dummy families, ESCO skills are linked directly to the central `YOU` node via `USER_CAPABILITY` edges. The force graph distance for `USER_CAPABILITY` is tuned to 135px, placing owned skills in a tight, peer-level inner ring radially around the user.

## 3. Evidence Disclosure Proof
- **Evidence Count**: Added dynamically to the visual label in `CareerMapNeuralGraph.tsx` as `· X evidence` (e.g., `Javascript · 3 evidence`). This avoids corrupting the semantic label while keeping the canvas affordance.
- **Evidence Provenance**: The adapter now emits explicit `capability_supported_by_evidence` edges. Clicking an owned skill correctly expands the focus set to include these connected evidence nodes, retaining exact provenance and opening the detail panel identically to CT51.

## 4. Default Graph Active Counts
- **Default active nodes**: 18
- **Default active edges**: 17

## 5. Selected-Role Graph Active Counts
- **Selected-role active nodes**: 30 (18 default + 12 gaps)
- **Selected-role active edges**: 31 (adds 12 `ROLE_ONLY_CAPABILITY` edges and 2 shared `ROLE_OWNED_CAPABILITY` edges)

## 6. Non-Selected Gaps Participating in Force Physics
- **0**. The React hook in `CareerMapNeuralGraph.tsx` now dynamically filters `graphData.nodes` and `graphData.links` to entirely exclude non-selected `ROLE_ONLY_CAPABILITY` nodes before passing them to the physics engine, perfectly preserving layout performance.

## 7. Actual Role Counts
- **Admitted Roles**: 6
- **Rendered Roles**: 6

## 8. Real-Profile Privacy-Safe Metrics (Synthetic Commercial)
- **Owned visible skill count**: 6
- **Evidence counts per visible skill**: 1, 1, 1, 1, 1, 1
- **Rendered roles**: business developer, wholesale merchant in perfume and cosmetics, wholesale merchant in household goods, commercial director, wholesale merchant in electronic and telecommunications equipment and parts, wholesale merchant in fish crustaceans and molluscs

## 9. Selected-Role Shared/Gap Metrics
**Role Tested**: Commercial Director
- **Shared ESCO skill count**: 2
- **Visible gap count**: 12

## 10. Live Browser Result
- `YOU` centre: YES
- Owned skills inner field: YES (via `USER_CAPABILITY`)
- Roles outer field: YES
- Selected gaps outward field: YES
- Gap hollow: YES
- Role→gap dashed: YES
- YOU→gap edge: ABSENT

## 11. Exact Tracked Files
- `lib/career-possibility/career-map-graph-projection.ts`
- `lib/career-possibility/career-graph-visual-adapter.ts`
- `lib/career-possibility/esco-career-map-presentation-adapter.ts`
- `components/career-possibility/CareerMapNeuralGraph.tsx`
- `tests/career-possibility/esco-career-map-presentation-adapter.test.ts` (added test)

## 12. Commit
See final terminal output.

## 13. Final Git State
See final terminal output.
