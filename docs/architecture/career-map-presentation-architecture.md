# Career Map Presentation Architecture

**STATUS: LOCKED**
**AUTHORITY: FOUNDER ACCEPTED (MVP STEP 2Y)**

This document is the authoritative presentation contract for the Career Map.
Semantic systems must adapt INTO this presentation contract via adapters.
Do NOT redesign this architecture to accommodate semantic system changes without explicit Founder authorization.

## 1. Visual Topology & Language
The Career Map visual language is an **OBSIDIAN-LIKE ORGANIC KNOWLEDGE GRAPH**.
- **Mechanics:** It uses soft semantic force zones, organic force settlement, parent-child springs, local repulsion, collision, and subtle visual hierarchy.
- **Prohibited:** Rigid deterministic polar coordinate mapping, perfect symmetry, hard radial rings, fixed angle slots, fixed role constellation templates, and mechanical starbursts are completely prohibited.

## 2. Core Entities & Identity Rules
- **YOU Node:** The primary personal anchor. Must not be duplicated, reclassified, rendered as a gap/requirement, or read as "Beyond your current evidence".
- **Owned Skills (Capabilities):** Remain strictly PERSON-OWNED (`YOU -> SKILL`). Selecting a role must not semantically re-parent an owned skill to the role. Shared skills bridge visually but do not abandon their personal graph neighborhood.
- **Atomic Evidence:** First-class graph topology (`SKILL -> EVIDENCE`). Must resolve exactly one valid owning skill and remain visually local to it (small note/satellite clusters). Must never render as orphan floating points. Invalid-parent evidence must not render.
- **Future Roles:** Form the organic outer career neighborhood. They must remain visually outside the personal capability/evidence zone. The visual count is bounded to prevent overwhelming density.

## 3. Selected Role Behavior (Continuity Contract)
Selecting a Future Role is a **FOCUS/BLOOM OF THE EXISTING MAP**, not a teleport or scene replacement.
- The selected Role remains near its existing Browse Map world position. The camera reframes around it smoothly.
- **Shared Skills:** Retain `YOU -> SKILL <- ROLE` identity.
- **Build-Next Gaps:** Render as an **organic local Obsidian-like subgraph bloom** attached to the role. Gaps use soft parent attraction, local gap-gap repulsion, label-aware collision, and an outward semantic bias.
- **Prohibited:** Gaps must not form rigid fans, perfect circles, or label piles. `YOU -> GAP` relationships are strictly prohibited.

## 4. Default vs Selected State
- **Default:** Organic global Career Map centering the user.
- **Selected Role:** Same world graph, dimming unrelated context, highlighting the shared path, and triggering the organic local gap bloom. Selecting YOU or resetting clears focus state back to Default.

## 5. Detail Panel Responsibility
The graph communicates relationship, topology, and career path. The side detail pane is **secondary explanatory UI** (readable detail, lists, explanations). The panel must NEVER replace graph semantics, force semantic nodes to teleport, or classify YOU as a gap.

## 6. Semantic / Presentation Boundary & Change Control
Changes to the ESCO model, capabilities, evidence grounding, ranking, or ontology must NOT directly redesign `CareerMapNeuralGraph` layout, visual hierarchy, selection UX, or evidence grammar.
If semantic output does not fit this contract, **ADAPT IT AT THE PRESENTATION ADAPTER BOUNDARY**.

**CHANGE CONTROL POLICY:**
NO Career Map presentation behavior may be changed without explicit Founder/EM authorization (`PRESENTATION_ARCHITECTURE_CHANGE_AUTHORIZED`).
If a backend task requires changing this locked presentation: STOP. Do not silently modify presentation.

## 7. Authoritative Presentation Owners
- Renderer: `components/career-possibility/CareerMapNeuralGraph.tsx`
- Adapter: `lib/career-possibility/career-graph-visual-adapter.ts`
- Tests: `tests/career-possibility/career-map-neural-graph.test.ts`
