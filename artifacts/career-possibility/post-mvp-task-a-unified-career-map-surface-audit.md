# POST-MVP TASK A: UNIFIED CAREER MAP SURFACE
**PRODUCT ADMISSION / IMPLEMENTATION BOUNDARY AUDIT**

*NON_CANONICAL*
*NO PRODUCTION WRITE*

## 1. Founder Product Requirement
The Career Map MVP delivered a fragmented user experience consisting of three tabs: Career Map (flat capabilities), Neural Graph (network visualization), and Role Lens (dropdown comparison). The Founder has directed a move to ONE unified Career Map surface that simultaneously answers "Who am I?" and "Where could I go?". It must feature a two-layer personal capability hierarchy (Family -> Canonical Capability -> Evidence) while visually integrating the top 4 generic future roles, their shared connections, and role-only gaps.

## 2. Current Surface Topology
- **Top-level Tab Owner**: `components/career-possibility/LocalCareerMapWorkspace.tsx`. This component manages the `"map" | "graph" | "role-lens"` state.
- **Current Personal Renderer**: `components/career-possibility/CapabilityExplorer.tsx`.
- **Current Neural Renderer**: `components/career-possibility/CareerMapNeuralGraph.tsx`.
- **Role Lens Owner**: `components/career-possibility/TargetRoleCapabilityComparison.tsx`.

## 3. Fragmentation Classification
`PRESENTATION_ONLY_FRAGMENTATION`. The underlying semantic state (the local map state and canonical library) is shared. The three tabs are merely alternate presentation views over the exact same semantic truth.

## 4. Current Personal Renderer Classification
`FLAT_CANONICAL_CAPABILITY_PRESENTATION`. `CapabilityExplorer` flattens canonical capabilities into a single ring around the user, displaying the capability family only as a text label.

## 5. Family Authority & Presentation Availability
- **Family Authority**: `lib/career-possibility/canonical-capability-library.ts` inherently defines the authoritative family for each canonical capability (e.g., `family: "Analytics & Insight"`). 
- **Presentation Availability**: The current presentation adapter (`buildPersonalCareerMapPresentation`) and the graph projection builder (`buildCareerMapGraphProjection`) already process and pass this family grouping correctly. 

## 6. Two-Layer Feasibility & Role Data Availability
- **Feasibility**: `TWO_LAYER_PRESENTATION_ALREADY_AVAILABLE_BUT_UNUSED` in the primary flat map. The `CareerMapNeuralGraph` actually already implements a version of the two-layer structure (Family Ring -> Capability Ring -> Evidence Ring).
- **Semantic Ontology**: No new semantic ontology is required. Family nodes can function purely as layout/presentation proxy nodes (as `CapabilityFamilyGraphNode` currently does).
- **Role Data**: Ranked role alignment is already computed natively on the route via `buildPersonalGenericRoleAlignment`. Four role nodes are already successfully injected into the `CareerMapGraphProjection`.
- **Identity Integrity**: Shared canonical identity is fully preserved. The projection does not duplicate canonical capabilities per role; it creates bridges (edges) to the canonical capabilities from the role requirements.

## 7. Role Lens Assessment
- **Role Description/Summary**: `OPTIONAL_DETAIL_PANEL`.
- **Top-gap Proof to Build**: `REQUIRED_IN_UNIFIED_MAP` (Can be retained as a detail drawer/sidebar triggered from clicking a role or requirement node).
- **Requirement List**: `REDUNDANT_WITH_GRAPH`.

## 8. Unified Target IA
A single unified `CareerMapNeuralGraph`-based experience.
- **Center**: "You" node.
- **Ring 1**: Family presentation nodes.
- **Ring 2**: Canonical sub-capabilities (revealed or positioned outward from their families).
- **Ring 3/Outer Bounds**: Evidence (revealed on interaction with capability).
- **Periphery/Orbit**: Top 4 Generic Roles. Edges connect roles to shared capabilities. Role-only gaps orbit the role node with a distinct "not yet shown" state.
- **Detail Panel**: Clicking a role or gap reveals the Role Lens detail (descriptions and proof-to-build) in an overlay or side-drawer, eliminating the need for a separate top-level tab.

## 9. Responsive Strategy
- **Desktop**: The interactive SVG network graph.
- **Mobile**: A stacked interactive list (which `CareerMapNeuralGraph` already implements as a fallback) where users tap a family to expand capabilities, tap a capability to expand evidence, and tap a role to see its requirements.

## 10. Copy Classification
- "Career Map" (Tab) -> **REMOVE** (Should just be the page title).
- "Neural Graph" (Tab) -> **REMOVE**.
- "Role Lens" (Tab) -> **REMOVE**.
- "Your experience core" -> **KEEP** (For the central "You" identity).

## 11. Minimum Writable Boundary
- **REQUIRED**:
  - `components/career-possibility/LocalCareerMapWorkspace.tsx` (Strip out tabs, render only the unified surface).
  - `components/career-possibility/CareerMapNeuralGraph.tsx` (Evolve into the primary unified renderer; add side-drawer details from Role Lens).
- **POSSIBLY_REQUIRED**:
  - `components/career-possibility/CapabilityExplorer.tsx` (Delete).
  - `components/career-possibility/TargetRoleCapabilityComparison.tsx` (Delete or extract detail sub-components).
- **DO_NOT_TOUCH**:
  - `lib/career-possibility/canonical-capability-library.ts`
  - `lib/career-possibility/reviewed-resume-evidence-map-adapter.ts`
  - `lib/career-possibility/career-map-graph-projection.ts` (Unless minor geometry tweaks are needed).
  - Any inference provider or API routes.

## 12. Required Regressions & Acceptance Contract
- **Reusable**: `buildCareerMapGraphProjection.test.ts`, `buildPersonalCareerMapPresentation.test.ts`.
- **Missing**: A DOM integration test confirming the absence of tab navigation and the simultaneous presence of family nodes, role nodes, and capability nodes on the unified `/career-map` route.

**Future Acceptance Contract**:
- **A. SINGLE SURFACE**: No visible top-level mode switching.
- **B. TWO-LAYER PERSONAL NETWORK**: Family nodes are visibly distinct presentation proxies.
- **C. FAMILY CORRECTNESS**: Capabilities appear under exactly one family without duplication.
- **D. EVIDENCE**: Remains attached strictly to canonical sub-capabilities.
- **E. FOUR FUTURE ROLES**: All four generic roles visible in the main map.
- **F. SHARED CANONICAL IDENTITY**: One semantic identity per shared capability.
- **G. ROLE-ONLY GAP**: Visible without implying personal ownership.
- **H. PROXIMITY**: Derived strictly from existing alignment, no renderer-side recalculation.
- **I. FORBIDDEN UX**: No visible fit percentage; no High/Adjacent/Stretch labels.
- **J. RESPONSIVE**: Desktop and mobile modes preserve reachability of all nodes without overflow.

## 13. Recommended Next Task
**POST_MVP_TASK_A_IMPLEMENTATION** (Pending Founder admission of this audit). 
Execute the removal of tabs in `LocalCareerMapWorkspace` and elevate `CareerMapNeuralGraph` as the sole unified rendering surface.
