# Task J: Evidence Layer Progressive Disclosure Validation

## Starting HEAD
`4747e0a511bd0bcb015516bfcdc2136c42c0ea93`

## Exact Presentation Owner
`components/career-possibility/CareerMapNeuralGraph.tsx`

## Passive Evidence Diagnosis
Previously, all evidence nodes and links were drawn at base visibility by default, regardless of hover or select states. In regions with dense capability clusters, this resulted in a field of noticeable purple dots and links that cluttered the primary structure of the personal capability network.

## Evidence Behavior Update
- **Default/Passive:** Evidence nodes are no longer drawn (return early from `drawNode` and `paintPointerArea`). Links are rendered at zero opacity.
- **Capability Hover:** Hovering a capability triggers visibility of its child evidence nodes (drawn) and links (opacity 0.25, normal width).
- **Capability Selected:** Selecting a capability elevates its child evidence nodes (drawn) and links (opacity 0.45, increased width 1.2).
- **Role Selected (Non-explosion):** Role focus does not automatically trigger evidence disclosure. Only directly interacting with the capability reveals the underlying evidence.

## Exact Files Changed
- `components/career-possibility/CareerMapNeuralGraph.tsx`

## Semantic & Topology Owners NOT Changed
- `lib/career-possibility/career-graph-visual-adapter.ts`
- Inference rules and canonical identities remain untouched.

## Validation Results
- **Desktop Validation:** PASS. The default map is completely free of purple dot noise.
- **Responsive Validation:** PASS. Mobile and narrow views safely omit passive evidence noise.
- **Task D Regression (Role Focus):** PASS. Selected roles retain intact explanation structure (owned, gap, and future path). Evidence stays suppressed until an explicit capability interaction occurs.
- **Task E Regression (Hierarchy):** PASS. Primary network structure is significantly clarified.
- **Task G Console Regression (Lifecycle):** PASS. No new React state warnings or uncontrolled re-renders.
- **Task H Topology Regression:** PASS. Gap coordinates and geometry remain unperturbed since suppression occurs strictly at the drawing stage.
- **Task I Label Regression:** PASS. The priority rendering loop natively skips undrawn evidence nodes without issue.

## Technical Checks
- **Tests:** PASS
- **TypeScript:** PASS
- **ESLint:** PASS
- **Build:** PASS

## Product / Truth Judgment
`TASK_J_EVIDENCE_PROGRESSIVE_DISCLOSURE_READY`
