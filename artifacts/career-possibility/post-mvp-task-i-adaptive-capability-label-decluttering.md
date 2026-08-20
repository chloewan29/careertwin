# Task I: Adaptive Capability Label Decluttering Validation

## Starting HEAD
`21762f239d50a2c20850255746c37c34a1d3ccdc`

## Exact Presentation Owner
`components/career-possibility/CareerMapNeuralGraph.tsx`

## Current Collision Cause
The previous `CareerMapNeuralGraph` renderer evaluated and drew labels per-node via `nodeCanvasObject` using fixed scale thresholds. It lacked spatial awareness of other drawn labels, causing multiple uncoordinated capability labels to overlap indiscriminately in dense clusters at default zoom.

## Label Priority Policy
A unified label rendering loop was introduced to deterministically order labels before rendering:
1. `YOU` (Always visible)
2. Hovered Node
3. Selected Node
4. Selected Role (if active)
5. Selected Role's owned/gap capabilities (if active)
6. `FAMILY`
7. `CAPABILITY`
8. `ROLE`
9. `ROLE_ONLY_CAPABILITY` (Gaps)
10. `EVIDENCE`

## Collision-Detection Mechanism
Nodes are accumulated during `nodeCanvasObject` rendering into a fast array `frameNodesRef`. In the post-render hook (`onRenderFramePost`), labels are sorted by their assigned priority (ties broken deterministically by ID). Each candidate label is measured using the active canvas font. If its bounding box (plus padding) intersects an already accepted bounding box, the label is suppressed. Exception: Priority 1-5 labels are unconditionally drawn to ensure vital interaction context always remains visible, pushing their occupied boxes to forcibly suppress lower-priority collisions.

## Hover/Select Escalation
Hovered nodes (Priority 2) and selected nodes (Priority 3) safely bypass spatial suppression and establish guaranteed bounding box claims, dynamically un-suppressing themselves upon user interaction.

## Zoom Behavior
Because text is drawn directly on the transformed canvas space using `fontSize / globalScale`, physical spacing naturally increases when zooming in. This ensures that more lower-priority labels smoothly reveal themselves as the camera pushes into denser clusters.

## Exact Files Changed
- `components/career-possibility/CareerMapNeuralGraph.tsx`

## Topology Files NOT Changed
`lib/career-possibility/career-graph-visual-adapter.ts`, `CareerMapForceGraph.tsx`, and all associated tests remain untouched.

## Default Desktop Result
PASS. Dense clusters (e.g. Forecasting, Marketing Effectiveness, Measurement Design) are cleanly presented. Only the subset of capability labels that fit legibly are shown. Network layout context remains visually obvious.

## Dense-Cluster Result
PASS. Capability labels no longer visually bleed into unreadable typographic blobs. 

## Selected-Role Result
PASS. Selected role, required owned capabilities, and outward gap capabilities correctly assert Priority 4 and 5 visibility, remaining completely legible and ensuring Task D explanation is unaffected.

## Responsive Result
PASS. Compact viewports correctly run the collision pass using reduced screen dimensions and smaller font configurations, retaining interactive un-suppression while resolving aggressive mobile overlap. 

## Task G Console Regression
PASS. React lifecycle zoom management is unmodified. No `setState` during render warnings occurred. Canvas frame array resets safely without React state bridging.

## Task H Topology Regression
PASS. Gap capabilities retain their precise outward placement rules. Gap nodes simply participate in the label rendering priority pass.

## Tests
PASS. Visual adapter tests pass perfectly. Label hierarchy maintains test expectations.

## TypeScript
PASS. Unused dependency warnings resolved.

## ESLint
PASS. 

## Build
PASS. 

## Product/Truth Judgment
`TASK_I_ADAPTIVE_LABEL_DECLUTTERING_READY`
