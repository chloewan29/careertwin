# Task G: Force-Graph Zoom Lifecycle Repair

## Setup
- Starting HEAD: 93944b789a4220078f11ab5e928f9584e5de17e5

## Reproduction & Root Cause
- **Reproduction**: When interacting with the Career Map (zoom/pan), the app logged a React console error: "Cannot update a component (`CareerMapNeuralGraph`) while rendering a different component (`ForceGraph2D`)."
- **Root Cause**: The `ForceGraph2D` component triggers its `onZoom` callback synchronously during its own render cycle or layout frame. In `CareerMapNeuralGraph`, `onZoom` was connected directly to `setZoom(k)`, triggering a React state update for `CareerMapNeuralGraph` while React was in the middle of rendering `ForceGraph2D` (or from within an unsafe lifecycle moment).
- **State Ownership Before**: React `useState` (`const [zoom, setZoom] = useState(1);`).
- **State Ownership After**: React `useRef` directly updating a DOM node (`const zoomLabelRef = useRef<HTMLSpanElement>(null);`).

## Fix Details
- **Exact files changed**: 
  - `components/career-possibility/CareerMapNeuralGraph.tsx`
- **Why fix is lifecycle-correct**: The zoom value is only used visually to render a percentage string in the bottom-right corner. It does not drive any structural React reconciliation. By using a ref and directly updating `zoomLabelRef.current.textContent`, we completely bypass the React render cycle during high-frequency ForceGraph events. This prevents the render loop error, eliminates jitter, and improves performance without losing the visual indicator.
- **Mechanism**: Ref direct DOM mutation. React state is no longer required for zoom.

## Validation Results
- **Runtime console validation**: The original React error no longer occurs. No new React warnings.
- **Graph interaction regression results**: Zoom and pan interactions are preserved. Selected-role framing, role-focus behavior, and Task E hierarchy remain fully intact. Label zoom-threshold behavior remains preserved (driven by canvas `globalScale`, not React state). Engine settle behavior is preserved. 
- **Tests**: Relevant tests pass.
- **TypeScript**: `npx tsc --noEmit` PASS
- **ESLint**: Targeted ESLint over `CareerMapNeuralGraph.tsx` PASS
- **Build**: `npm run build` PASS

## Product / Truth Judgment
- **Status**: TASK_G_FORCE_GRAPH_LIFECYCLE_READY
