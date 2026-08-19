# Current System Memory

### Post-MVP Task O / O.1 / O.2: First Governed Role Expansion Tranche Closed (`POST_MVP_TASK_O2V_VERIFIED_READY_FOR_CLOSURE`)

- Task O (Coverage Audit), Task O.1 (Admission Audit), and Task O.2 (Implementation) are `CLOSED`.
- Implementation commit: `d5774663940967d29ebb956d3e9ad6b98c27d7e9`.
- Current governed canonical role count: 17.
- Five new roles admitted through O.1 governance process: `program-manager`, `hr-business-partner`, `risk-manager`, `strategy-manager`, `sales-director`.
- Transformation Lead NOT admitted (rejected as near-duplicate / insufficient semantic distinction).
- Head of Sales NOT admitted as canonical role (classified as title alias towards Sales Director).
- Alias infrastructure: NOT IMPLEMENTED.
- No new canonical capabilities added. Canonical library remains semantic authority. Role expansion must not silently create capability ontology.
- Role library size is separate from Career Map recommendation count. Top-4 recommendation architecture remains unchanged (broad library -> alignment -> admission -> relevance rank -> up to 4 roles).
- Ranking engine, recommendation engine, and renderer remain unchanged.
- Governance Policy established: New canonical role requires materially distinct professional mandate, ownership, capability composition, and differentiators. Market title, seniority words, or industry wording alone do NOT establish a new canonical role. Coverage gap is a prioritisation signal, not sufficient reason for admission. Future expansion must happen in small governed tranches.
- Verification: 17-role semantic validation PASS. Direct reconciliation test PASS. No regressions caused by O.2.
- Broad-suite residuals: One actual assertion failure remains in `post-upload-career-map-simplification.test.ts` (caused by earlier commit `a3922476b58aae680fbee6cf62c100aa83681911`, not O.2). Multiple parse/missing-suite Vitest errors remain unresolved. These are NOT closed by Task O.
- Reconciliation truth: `roleCapabilityProfiles` dynamically combines canonical governed role profiles with legacy seed profiles. The 30 profiles observed dynamically represent the authoritative 17-role registry mapped against the legacy un-governed seeds. The Engineering Manager label-warning expectation was pre-existing stale test debt (from `a6376a6`), not caused by O.2.
- HOLD Truth: Pre-existing HOLD paths from `N2E.R2F-RESUME` are preserved exactly.
- Next tranche: NOT AUTOMATICALLY AUTHORISED.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task N2C: Cross-Domain Canonical Capability Coverage Audit Closed (`POST_MVP_TASK_N2C_CANONICAL_ONTOLOGY_PARTIALLY_SUFFICIENT`)

- Task N2C is `CLOSED / COVERAGE AUDIT COMPLETE`.
- Canonical inventory: 51 capabilities, 12 families.
- Audit scope: 72 concepts across 6 domains and 12 roles.
- Domain readiness:
  - Commercial, Finance: `READY_FOR_ROLE_AUTHORING`
  - Product, Customer, Operations: `READY_WITH_LIMITED_GAPS`
  - Technology: `ONTOLOGY_WORK_REQUIRED` for deep software-engineering IC roles.
- Role readiness:
  - `AUTHORABLE_WITH_CURRENT_ONTOLOGY`: Product Operations Manager, Customer Experience Manager, Account Manager, Business Development Manager, Service Delivery Manager, Finance Business Partner, FP&A Manager, Engineering Manager.
  - `AUTHORABLE_WITH_MINOR_MAPPING_REVIEW`: Product Manager, Operations Manager.
  - `BLOCKED_BY_PROVEN_CANONICAL_GAPS`: Customer Success Manager, Software Engineer.
- Ontology status: `PARTIALLY SUFFICIENT`. Global expansion is NOT required first.
- Analytics bias: `ANALYTICS_WEIGHTED_BUT_CROSS_DOMAIN_USABLE`.
- Eight audit gap concepts remain `NON_CANONICAL` and require atomicity/design review before admission.
- No new capability family proven yet (unresolved).
- Role-library vs ontology-gap distinction is locked.
- First tranche can proceed in selected domains.
- Eight-role semantic design candidate set: Product Ops, CX Manager, Account Manager, BD Manager, Service Delivery Manager, Finance BP, FP&A Manager, Engineering Manager.
- Excluded roles (blocked or mapping review required): Product Manager, CSM, Operations Manager, Software Engineer.

### Post-MVP Task N2B: Role Knowledge Registry Foundation Closed (`POST_MVP_TASK_N2B_ROLE_KNOWLEDGE_REGISTRY_IMPLEMENTED`)

- Task N2B is `CLOSED / IMPLEMENTED / PUSHED / VERIFIED`.
- Implementation commit: `a6376a6a71c7905c63c4aa006dc1f14a1666fc4e` (`refactor(career): establish role knowledge registry`).
- Role registry owner: `lib/career-possibility/role-knowledge/role-registry.ts`.
- Role profile contract owner: `lib/career-possibility/role-knowledge/role-profile.ts`.
- Registry version: Schema 1.0.0, Content 1.0.0.
- Current 4-role set: `analytics-manager`, `customer-insights-lead`, `marketing-analytics-lead`, `data-product-manager`.
- Structural migration: Exact mapping, zero semantic drift. New roles: 0. Deleted roles: 0.
- Semantic fingerprint equality: Pre-migration SHA256 `0E4E2B5447AAB263B9A9C9592C27172DA405E2D74A18027ADAF302F0CA3B7C1C` == Post-migration SHA256 `0E4E2B5447AAB263B9A9C9592C27172DA405E2D74A18027ADAF302F0CA3B7C1C`.
- Legacy representative array compatibility disposition: Export preserved in `generic-role-archetype.ts` but derives from new registry.
- Duplicate data authority removed: NONE remains.
- Production consumer migrated to registry: `personal-generic-role-alignment-adapter.ts` updated.
- N1 unchanged: Admission policy remains unchanged.
- Ranking unchanged: Relative ordering is preserved.
- Projection unchanged: Semantic mapping and renderer remain unchanged.
- Renderer unchanged: Visual graph and layout remain unchanged.
- Sparse regression: 4 candidates -> 0 admitted roles preserved.
- Analytics-rich ordering: `analytics-manager`, `marketing-analytics-lead`, `customer-insights-lead`, `data-product-manager` preserved.
- External taxonomy: Still absent/deferred.
- Role-universe coverage: Remains MATERIALLY NARROW.
- Broad-domain canonical capability sufficiency: Remains UNRESOLVED.
- N2C is next candidate, not automatically active.
- `memory_sync_required: no`
- `memory_sync_targets: []`
### Post-MVP Task N2A: Role Universe Architecture + Coverage Design Closed (`POST_MVP_TASK_N2A_ROLE_UNIVERSE_ARCHITECTURE_READY`)

- Task N2A is `CLOSED / ARCHITECTURE DESIGN COMPLETE`.
- Artifact: `artifacts/career-possibility/task-n2a-role-universe-architecture-coverage-design.md`.
- Role registry required: CareerTwin requires a scalable, versioned generic ROLE KNOWLEDGE REGISTRY before major role-universe expansion.
- Hybrid strategy locked: Standardized occupational catalog/taxonomy provides stable hierarchy/metadata, but CareerTwin remains the sole authority for canonical capability mappings, importance semantics, and recommendation-ready profile publication.
- External taxonomy deferred: Do NOT select or integrate O*NET/ESCO in N2B. The registry must be SOURCE-AGNOSTIC.
- Runtime LLM prohibition locked: Runtime LLMs must NOT invent new generic roles, role requirements, or role semantic truth based on a user's CV.
- Separation of concerns locked: Role family != canonical capability family. Single canonical capability authority. Retrieval, admission, and ranking remain separate discrete stages.
- N1 preserved: N1 role admission remains unchanged and authoritative.
- 0–4 Career Map contract locked: Role universe size != candidate set size != admitted role count != displayed role count. Career Map continues to display 0–4 admitted generic roles.
- Role granularity direction: Recognizable cross-company generic career directions.
- Aliases direction: Title aliases are metadata pointing to one semantic generic role.
- Deferred: Seniority representation, regionality, exact external taxonomy.
- Offline reviewed authoring: Role requirements are offline authored, human-reviewed, mapped to canonical IDs, validated, versioned, and published deterministically.
- Role quality-gate direction: Every ID exists, no duplicates, valid sections, no differentiator-only roles, stable ID, domain/family metadata, minimum semantic coverage.
- Canonical capability status: Currently 51 capabilities, 12 families.
- Capability coverage risk: `MATERIAL_CANONICAL_CAPABILITY_COVERAGE_GAPS` is a CREDIBLE RISK but NOT yet proven blocker. Automatic ontology expansion is REJECTED until a dedicated coverage audit is performed.
- Revised sequencing: N2B (Role Knowledge Registry Foundation - structural only, 4 roles) -> N2C (Cross-Domain Capability Coverage Audit). First tranche size (10-20 roles) remains a hypothesis dependent on N2C.
- `memory_sync_required: no`
- `memory_sync_targets: []`


### Post-MVP Task N1: Role Recommendation Admission Gate Closed (`POST_MVP_TASK_N1_ROLE_ADMISSION_GATE_IMPLEMENTED`)

- Task N1 is `CLOSED / IMPLEMENTED / PUSHED / VERIFIED`. N0 trust defect (forced ranking of weak candidates) is resolved.
- Implementation commit: `4fe86d81623df462f34227b6b2ba4661995fa70d` (`fix(career): gate weak role recommendations`).
- Validation artifact: `artifacts/career-possibility/task-n1-role-recommendation-admission-gate.md`, SHA256 `b41d649137e9bab0b151ff4825198744767dfeba577259118da112e2a553a12a` (unstaged).
- N1 admission policy: A role requires >= 2 substantive matches (from identity_defining, core_enabler, or supporting sections), AND at least 1 match from identity_defining or core_enabler. Differentiator-only support is never admissible.
- Explicit owners: Admission policy owned by `lib/career-possibility/generic-role-admission.ts`. Integration owned by `lib/career-possibility/personal-generic-role-alignment-adapter.ts`.
- Zero-role support: 0 recommended roles is now a valid and supported product state.
- Sparse real result: 4 candidate roles → 0 admitted roles.
- Analytics-rich result: 4 credible roles remain admitted, proving the gate does not destroy in-domain recommendations.
- Role ranking unchanged: Relative survivor order is preserved. Downstream rank is contiguous. No second ranker was introduced.
- Architectural boundaries preserved: Role archetypes unchanged. Role requirements unchanged. Projection unchanged. Renderer unchanged. M.2 default-gap visibility is preserved.
- Process deviation closed: Stash/restore operations during invalid-commit recovery were noted and closed.
- Role-universe coverage: Remains unresolved. The current 4-role POC is still insufficient.
- N2 (Role Universe Coverage Expansion): NOT ACTIVE. Does not automatically start.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task M.2: Default Role-Gap Visual Dominance Repair Closed (`POST_MVP_TASK_M2_DEFAULT_GAP_VISIBILITY_REPAIRED`)

- Task M.2 is `CLOSED / IMPLEMENTED / PUSHED / VERIFIED`. Implementation decision: `POST_MVP_TASK_M2_DEFAULT_GAP_VISIBILITY_REPAIRED`.
- Implementation commit: `f178e64521ac7a393ece44a167a3f7bda1ef60ab` (`fix(career): reduce default role-gap dominance`).
- Durable result: DEFAULT sparse-profile role-gap presentation no longer dominates personal identity. Role-only semantic truth is preserved. Role focus still escalates role gaps intentionally when a role is selected.
- Task M.2 is the HEAD commit at `f178e64521ac7a393ece44a167a3f7bda1ef60ab`. It precedes Task N0 (read-only diagnosis; no commit).
- Note: Task M.2 repaired DEFAULT gap visual dominance (presentation). Task N0 diagnosed the separate upstream issue of WHY roles are being recommended. These are distinct defects. M.2 is not a substitute for N1.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task J: Evidence Layer Progressive Disclosure Closed (`POST_MVP_TASK_J_FINAL_CONTROL_CLOSED`)

- Career Map MVP is `CLOSED / VALIDATED`; Post-MVP Tasks A-D are `CLOSED`; Task F is `CLOSED`; Task E is `CLOSED`; Task G is `CLOSED`; Task H is `CLOSED`; Task I is `CLOSED`; Task J is `CLOSED / IMPLEMENTED / PUSHED / VERIFIED`. No post-MVP task is active. The next post-MVP task is `NONE` until explicit Founder / EM admission.
- Task J implementation commit: `d6ad677ef175055bd7fa00d2a65e6bfafa681cab` (`feat(career): reveal evidence on capability interaction`). Product judgment: `TASK_J_EVIDENCE_PROGRESSIVE_DISCLOSURE_READY`.
- Original defect: Atomic evidence nodes/links were previously drawn at passive base visibility in the default Career Map. In dense capability areas, this created particle-like visual noise before the user had asked for evidence. The problem was presentation timing and information hierarchy, not evidence ownership, grounding, projection, or semantic relationships.
- Final evidence hierarchy: DEFAULT: Evidence is visually silent. The user should first understand YOU, personal capability network, future role possibilities. CAPABILITY HOVER: Evidence directly supporting the hovered personal capability is revealed as a lightweight proof preview. Unrelated evidence remains suppressed. CAPABILITY SELECTED: Evidence directly supporting the selected capability is clearly visible and inspectable. ROLE SELECTED: Role selection alone does NOT automatically reveal all personal evidence for role-relevant capabilities. Role focus remains what I already have and what I still need.
- Default evidence node state: Passive evidence nodes are not visibly drawn in the default state (presentation suppression only). They remain present in authoritative graph/state semantics.
- Default evidence edge state: Passive capability→evidence presentation edges are visually suppressed in the default state. They regain visibility only when the related capability evidence is being inspected. Semantic evidence relationships remain unchanged.
- Default evidence label state: Passive evidence labels are not rendered in the default map. Evidence labels/detail remain interaction-driven.
- Capability hover state: Hovering a personal capability reveals only its directly supporting evidence (evidence node visibility and supporting evidence-link visibility) without unrelated evidence flood.
- Capability selected state: Selecting a capability exposes its relevant supporting evidence more strongly than hover. Evidence remains subordinate to the capability itself.
- Unrelated evidence: Evidence unrelated to the currently interacted capability remains suppressed. Task J does not expose evidence globally merely because one capability is active.
- Role-focus non-explosion rule: SELECTING A FUTURE ROLE DOES NOT AUTO-EXPAND PERSONAL EVIDENCE. This is durable product behavior. Evidence remains capability-level proof.
- Gap capability rule: Unowned role-only gap capabilities have no fabricated personal evidence. Gap remains ROLE → X with no false personal evidence ownership.
- Shared capability rule: If canonical capability X is owned by YOU and required by a ROLE, there remains one canonical X. Personal evidence supporting X remains attached to that same canonical identity. No evidence duplication was introduced.
- No topology change: Task J changed presentation visibility only. It did NOT modify evidence coordinates, force topology, buildCareerGraphTopologySeeds, or graph semantic edges. Evidence suppression does not trigger graph re-layout.
- Task E hierarchy preservation: Task E remains `CLOSED`. Default hierarchy remains PRIMARY: YOU + personal capability network; SECONDARY: future roles; TERTIARY: atomic evidence. Task J strengthens this hierarchy.
- Task G lifecycle preservation: Task G remains `CLOSED`. Task J introduced no unsafe React state write from ForceGraph callbacks. Browser validation found no React lifecycle warning, no render loop, no evidence reveal flicker.
- Task H topology preservation: Task H remains `CLOSED`. Outward role-gap spatial grammar remains intact. Task J did not alter this.
- Task I label preservation: Task I remains `CLOSED`. Adaptive label decluttering remains intact. Task J did not redesign label collision management.
- Future-role label issue: Task J did NOT modify the separate observation that a passive future-role label may occasionally be suppressed by adaptive collision handling. No future-role label task is active.
- Long role edges: Task J did NOT modify long passive role edges. No role-edge cleanup task is active.
- Validation state: Default desktop `PASS`; Dense capability cluster `PASS`; Capability hover `PASS`; Capability selected `PASS`; Selected role `PASS`; Selected role + capability interaction `PASS`; Narrow layout `PASS`; Mobile `PASS`; Zoom/pan `PASS`; Evidence flicker `SAFE`; React console warnings `SAFE`; No graph re-layout `CONFIRMED`.
- Verification state: Relevant evidence tests `PASS`; Renderer regressions `PASS`; Role-focus tests `PASS`; TypeScript `PASS`; Exact-file ESLint `PASS`; Build `PASS`; Package files `UNCHANGED`.
- Task F preservation: Task F `CLOSED`. No semantic inference work occurred.
- Unrelated HOLD: Preserved exactly. The stale untracked provenance test remains non-authoritative.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task I: Adaptive Capability Label Decluttering Closed (`POST_MVP_TASK_I_FINAL_CONTROL_CLOSED`)

- Career Map MVP is `CLOSED / VALIDATED`; Post-MVP Tasks A-D are `CLOSED`; Task F is `CLOSED`; Task E is `CLOSED`; Task G is `CLOSED`; Task H is `CLOSED`; Task I is `CLOSED / IMPLEMENTED / PUSHED / VERIFIED`. No post-MVP task is active. The next post-MVP task is `NONE` until explicit Founder / EM admission.
- Task I implementation commit: `a0509939950bd51fd6045b267f2c2e683375b427` (`feat(career): declutter capability labels`). Product judgment: `TASK_I_ADAPTIVE_LABEL_DECLUTTERING_READY`.
- Original defect: Dense personal-capability clusters could render multiple independent labels simultaneously with no shared spatial awareness. This caused overlapping / unreadable label regions even though the underlying graph nodes and topology were acceptable. The defect was LABEL PRESENTATION DENSITY, not capability topology, node ownership, or semantic graph structure.
- Root cause: `CareerMapNeuralGraph` previously rendered labels through independent per-node drawing calls. Those calls had no unified screen-space awareness of labels already accepted for the current frame. Dense capability regions could therefore draw overlapping labels.
- Final presentation owner: Label presentation owner is `components/career-possibility/CareerMapNeuralGraph.tsx`. No topology owner or semantic/data owner was modified.
- Final decluttering behavior (presentation truth): Visible labels are gathered and evaluated in a deterministic priority order. Screen-space text bounds are measured. A passive lower-priority label may be suppressed when its bounds materially collide with a previously retained higher-priority label. The graph node itself remains visible, interactive, and semantically unchanged. Label suppression does NOT remove the capability from the graph.
- Label priority policy: Highest priority is YOU. Then interaction-driven labels (hovered node, selected node, selected role, selected-role relevant owned/gap capability). Then passive presentation labels (family, personal capability, future role, gap, evidence). This is PRESENTATION priority only and does not redefine semantic importance.
- YOU label rule: YOU label is never suppressed by passive collision management. YOU remains the strongest identity anchor.
- Interaction restoration: Hovered labels regain visibility. Selected labels regain visibility. Selected-role explanation outranks passive default decluttering. Decluttering affects passive density, not active comprehension.
- Selected-role preservation: Task D / Task H selected-role experience remains authoritative. When a role is selected, the selected role label remains available, relevant owned/shared capability labels remain available, gap labels remain available. Build-next interpretation remains intact. Task H outward gap topology remains intact.
- Determinism: Given the same graph state, zoom, viewport, and interaction state, label visibility is deterministic. Stable ordering uses presentation priority plus stable node identity tie-breaking. Force-engine timing does not determine which passive label wins.
- Zoom behavior: Decluttering operates in rendered / screen-space terms. At smaller effective screen separation, more passive labels may be suppressed. At larger zoom / greater screen-space separation, more labels may naturally become visible. This is adaptive presentation behavior.
- Task G lifecycle preservation: Task G remains `CLOSED`. Task I did NOT reintroduce unsafe React zoom-state writes. The lifecycle-safe zoom ownership remains intact. Browser validation found no React lifecycle warning, no render loop, no material label flicker.
- Task H topology preservation: Task H remains `CLOSED`. Task I did NOT modify `buildCareerGraphTopologySeeds`, role placement, gap placement, outward gap vectors, multi-gap fan behavior, or shared-gap geometry. The accepted spatial grammar remains: `YOU -> owned/shared capability -> future role -> gap capability`.
- Task E hierarchy preservation: Task E remains `CLOSED`. Default hierarchy remains PRIMARY (YOU + personal capability network), SECONDARY (future roles), TERTIARY (atomic evidence / contextual gap detail). Decluttering improves readability without changing this hierarchy.
- Evidence dots: Evidence-dot presentation was NOT changed by Task I. Purple evidence-dot visibility remains a separate Founder-review observation, not active work. No evidence-dot task is active.
- Role edges: Default role-edge presentation was NOT changed. No role-edge cleanup task is active.
- Over-decluttering state: Default network remains meaningfully labelled. Task I did not make the map empty. Suppressed passive labels remain discoverable through interaction. Product judgment: NO MATERIAL OVER-DECLUTTERING REGRESSION.
- Validation state: Dense capability cluster `PASS`; Default desktop `PASS`; Hover interaction `PASS`; Selected capability `PASS`; Selected role `PASS`; Narrow layout `PASS`; Mobile `PASS`; Over-decluttering `PASS`; Label flicker `SAFE`; Console warning state `SAFE`.
- Verification state: Relevant renderer tests `PASS`; Role-focus regressions `PASS`; Task H topology regression `PASS`; TypeScript `PASS`; Exact-file ESLint `PASS`; Build `PASS`; Package files `UNCHANGED`.
- Task F preservation: Task F `CLOSED`. No semantic inference work occurred.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task H: Role-Gap Outward Spatial Semantics Closed (`POST_MVP_TASK_H_FINAL_CONTROL_CLOSED`)

- Career Map MVP is `CLOSED / VALIDATED`; Post-MVP Tasks A-D are `CLOSED`; Task F is `CLOSED`; Task E is `CLOSED`; Task G is `CLOSED`; Task H is `CLOSED / IMPLEMENTED / PUSHED / VERIFIED`. No post-MVP task is active. The next post-MVP task is `NONE` until explicit Founder / EM admission.
- Task H implementation commit: `a2f28988021a8066d58bed7d9a74355e78300778` (`feat(career): place role gaps beyond future roles`). Product judgment: `TASK_H_ROLE_GAP_OUTWARD_TOPOLOGY_READY`.
- Original defect: Unowned role-required canonical capabilities could previously be seeded inside the future role relative to YOU. This caused gap capabilities to visually mix into the user's personal capability field and weakened the distinction between "what I already have" and "what I still need".
- Root cause: The presentation topology owner was `lib/career-possibility/career-graph-visual-adapter.ts` (specifically `buildCareerGraphTopologySeeds`). `ROLE_ONLY_CAPABILITY` nodes were previously seeded independently from their roles at an inner static radius of approximately 238px. Future roles were seeded farther outward at approximately 420px+. The force simulation therefore pulled gap nodes toward inner seeds, placing them visually between YOU and their future role.
- Final spatial grammar (presentation topology): `YOU -> OWNED / SHARED PERSONAL CAPABILITY -> FUTURE ROLE -> UNOWNED / GAP CAPABILITY`. Meaning: USER-SIDE / INNER DOMAIN = "what I already have"; ROLE DOMAIN = "where I could go"; OUTWARD ROLE DOMAIN = "what I still need". This does NOT determine semantic ownership.
- Single-role gap invariant: For a single-role gap capability G connected to future role R and user center U, the settled presentation target is outward of the role. Durable conceptual invariant: `distance(U, R) < distance(U, G)` and the role-to-gap direction is outward relative to YOU. The graph remains organic.
- Multi-gap presentation: Multiple gap capabilities for one role use deterministic sibling angular offsets. They form an outward-facing fan / spread rather than occupying identical coordinates or collapsing into a single radial line.
- Multi-role shared gap: One unowned canonical capability may be connected to multiple future roles. It remains ONE canonical semantic node. No role-specific duplicate semantic capability nodes are introduced. Presentation target is deterministically derived from connected role topology, using the combined / averaged normalized role directions and an outward radius beyond the connected roles.
- Critical semantic boundary: TOPOLOGY CONSUMES OWNERSHIP SEMANTICS. TOPOLOGY DOES NOT CREATE OWNERSHIP SEMANTICS. Node position must never be used to infer whether a capability is owned or a gap. Authoritative ownership/gap classification remains upstream semantic state.
- Owned/shared state: Owned/shared canonical capabilities remain within the personal capability network / YOU↔ROLE domain. Task H did NOT push owned capabilities outward merely for visual symmetry. Existing conceptual semantic identity remains `YOU -> X <- ROLE`.
- Gap state: Unowned role-required canonical capability remains `ROLE -> X` with no false YOU ownership edge. Task H changed only X's presentation target. Gap remains a visual/ownership state over one canonical capability identity, not a separate ontology.
- Task D preservation: Task D role-focus semantics remain authoritative. Selected role still exposes owned/shared capabilities, gap capabilities, unrelated dimmed context without evidence auto-expansion. Task H strengthens spatial explainability but does not replace Task D visual states.
- Task E preservation: Task E remains `CLOSED`. Default hierarchy remains PRIMARY: YOU + personal capability network; SECONDARY: future role possibilities; TERTIARY: atomic evidence. Externalized gaps do not become the default visual subject.
- Task G preservation: Task G remains `CLOSED`. ForceGraph zoom lifecycle repair remains intact. Browser validation found original React lifecycle warning absent, no new React warnings, zoom/pan preserved, no render loop, no topology-induced lifecycle regression.
- Organic layout principle: Career Map remains an organic / constellation-style graph. Task H does NOT establish fixed concentric rings, mechanical radial spokes, a tree layout, or rigid wheel geometry. The durable requirement is OUTWARD SEMANTIC ORDER, not geometric uniformity.
- Screen / collision state: Desktop `PASS`; Selected-role `PASS`; Other-role `PASS`; Narrow layout `PASS`; Mobile `PASS`; Screen-boundary safety `PASS`; Collision safety `PASS`. No rigid-ring/spoke regression confirmed.
- Implementation owner: Presentation topology owner is `lib/career-possibility/career-graph-visual-adapter.ts`. Focused regression owner is `tests/career-possibility/career-graph-visual-adapter.test.ts`. No renderer, semantic, inference, or role-ranking owner was changed.
- Verification state: Topology geometry tests `PASS`; Role-focus tests `PASS`; Shared canonical identity tests `PASS`; TypeScript `PASS`; Exact-file ESLint `PASS`; Build `PASS`; Browser validation `PASS`; React console warnings `NONE OBSERVED`; Package files `UNCHANGED`.
- Task F preservation: Task F `CLOSED`. No inference or canonical semantic changes occurred.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task G: Force-Graph Zoom State Lifecycle Repair Closed (`POST_MVP_TASK_G_FINAL_CONTROL_CLOSED`)

- Career Map MVP is `CLOSED / VALIDATED`; Post-MVP Tasks A-D are `CLOSED`; Task F is `CLOSED`; Task E is `CLOSED`; Task G is `CLOSED / IMPLEMENTED / PUSHED / VERIFIED`. No post-MVP task is active. The next post-MVP task is `NONE` until explicit Founder / EM admission.
- Task G implementation commit: `ecb6fb79a0f395dd429c27d6466ad6b7850a37b2` (`fix(career): make force graph zoom updates lifecycle safe`). Implementation decision: `POST_MVP_TASK_G_FORCE_GRAPH_LIFECYCLE_REPAIR_IMPLEMENTED`. Product judgment: `TASK_G_FORCE_GRAPH_LIFECYCLE_READY`.
- Original defect: React emitted "Cannot update a component (`CareerMapNeuralGraph`) while rendering a different component (`ForceGraph2D`)." The problematic behavior was associated with the `ForceGraph2D` zoom callback synchronously updating `CareerMapNeuralGraph` React state (`onZoom={({ k }) => setZoom(k)}`).
- Root cause: `ForceGraph2D` invokes the zoom callback from its own internal render / animation lifecycle. `CareerMapNeuralGraph` previously used that callback to synchronously update React state. That parent-state write was not lifecycle-safe in that callback path.
- Final zoom-state ownership: Previous zoom owner was React `useState` in `CareerMapNeuralGraph`. Final zoom-dependent label owner is React `useRef` (`zoomLabelRef`). React state is no longer required for this zoom-label update path. The zoom callback now performs the required local presentation update without triggering synchronous parent React reconciliation.
- Implementation boundary: Exact production owner modified is `components/career-possibility/CareerMapNeuralGraph.tsx`. Task G modified no other production owner. No separate semantic or topology state system was introduced.
- Behavior preserved: zoom interaction `PASS`; pan interaction `PASS`; zoom-dependent label behavior `PASS`; engine settle behavior `PASS`; selected-role framing `PASS`; Task D role-focus behavior `PASS`; Task E capability-first hierarchy `PASS`. No new render loop and no graph jitter introduced.
- Runtime error state: Original React console error `RESOLVED`. New React warnings `NONE OBSERVED`. Browser validation `PASS`.
- Semantic/Data preservation: Topology `UNCHANGED`; role positioning `UNCHANGED`; gap positioning `UNCHANGED`. Semantic/data behavior unchanged. No change to canonical semantic authority, provider semantics, validator, benchmark, materialization, or projection semantics. Task E hierarchy and Task F architecture remain preserved.
- Deterministic verification: Relevant graph tests `PASS`; TypeScript `PASS`; exact-file ESLint `PASS`; build `PASS`; browser validation `PASS`; package files changed `NO`. No new dedicated Task G test file was introduced.
- Planned role-gap issue: Founder product observation notes that unowned role-required capability nodes can currently appear spatially between YOU and the future role, implying false ownership. Desired conceptual spatial grammar for future review: `YOU -> OWNED / SHARED CAPABILITY -> FUTURE ROLE -> GAP CAPABILITY`. This is `PLANNED / NOT ACTIVE`. It is NOT yet admitted architecture. Do NOT encode a hard geometric rule as durable architecture during this closure.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task E: Capability-First Visual Hierarchy Rebalance Closed (`POST_MVP_TASK_E_FINAL_CONTROL_CLOSED`)

- Career Map MVP is `CLOSED / VALIDATED`; Post-MVP Tasks A-D are `CLOSED`; Task F is `CLOSED`; Task E is `CLOSED / IMPLEMENTED / PUSHED / VERIFIED`. No post-MVP task is active. The next post-MVP task is `NONE` until explicit Founder / EM admission.
- Task E implementation commit: `3cc6bd0b0b8e6519fa556cfe275b1161a632eedd` (`feat(career): prioritize capability network in career map`). Implementation decision: `POST_MVP_TASK_E_CAPABILITY_FIRST_HIERARCHY_IMPLEMENTED`. Product judgment: `TASK_E_CAPABILITY_FIRST_HIERARCHY_READY_WITH_MINOR_VISUAL_RESIDUAL`.
- Durable default visual hierarchy: primary `YOU + PERSONAL CAPABILITY NETWORK`; secondary `FUTURE ROLE POSSIBILITIES`; tertiary / interaction-driven `ATOMIC EVIDENCE`. Required first-read interpretation: “This is my capability map, and those outer nodes are possible future roles.” Career Map must not default to reading as a role recommendation map with the user in the middle.
- YOU is the strongest default identity anchor. Personal capability nodes and structural connections dominate through presentation-only size, ring/stroke, label, edge-strength, and local-contrast treatment. No capability ownership meaning changed.
- Future roles remain visible, legible, reachable outer-domain possibilities but are secondary when unselected through smaller/softer nodes, lighter labels, and lower default role-edge emphasis. Role ranking, fit, requirements, and topology semantics are unchanged.
- Task D role-focus semantics remain authoritative. Roles are secondary by default but strong when intentionally hovered or selected: the selected role escalates; all relevant canonical capabilities remain exposed; owned/shared capabilities remain strong; gaps remain distinct; unrelated context remains present but dimmed; evidence does not auto-expand.
- Owned/shared meaning remains `YOU -> X <- ROLE`, where X is one shared canonical capability identity. Gap meaning remains `ROLE -> X` with no false YOU ownership edge. Gap is a visual state over canonical capability semantics, not a separate ontology.
- Canonical capability families remain taxonomy/presentation context, not independent personal capability identities. Task E strengthened their presentation relationship within the personal network without creating an ontology.
- Atomic evidence remains tertiary and discoverable through capability interaction. Task E did not increase its default prominence or introduce auto-expansion.
- Admitted Layer 4 visual owner: `components/career-possibility/CareerMapNeuralGraph.tsx`. Focused regression owner: `tests/career-possibility/career-map-neural-graph.test.ts`. No semantic/data owner was modified.
- Concise presentation change record: YOU strengthened; personal capability nodes and edges enlarged/emphasized; default future-role nodes, labels, and edges softened; selected/hovered role escalation preserved; Task D owned/shared and gap states preserved; responsive hierarchy preserved.
- Validation: default desktop `PASS`; selected-role desktop `PASS`; narrow desktop/laptop `PASS`; mobile default `PASS`; mobile selected-role `PASS`; three-second interpretation `PASS`; Task D role-focus regression `PASS`; evidence interaction `PASS`; horizontal overflow absent; ghost-center edges absent; no major off-screen nodes; no semantic edge changes confirmed.
- Deterministic verification: relevant Career Map renderer, projection, reconciliation, and role-focus tests `PASS`; TypeScript `PASS`; exact-file ESLint `PASS`; build and post-push build `PASS`. Repository-wide lint retains unrelated pre-existing failures and was not a Task E scope blocker.
- Known minor visual residual: compact selected-role layouts and some dense desktop clusters may retain local label proximity/density. This is `KNOWN / VISIBLE / MINOR / NON-BLOCKING`; Task E is closed and no automatic E.1 exists. Future density work requires a new Founder / EM product decision.
- Task F remains `CLOSED`; its final single-stage semantic inference architecture and canonical semantic authority are untouched. Task E changed no provider, inference, validator, benchmark, materialization, or projection semantics.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task F: Capability Inference / Semantic Quality Workstream Closed (`POST_MVP_TASK_F_FINAL_CONTROL_CLOSED`)

- Historical Task F closure state: Career Map MVP and Post-MVP Tasks A-D were `CLOSED`; Task F and F.15 were `CLOSED / IMPLEMENTED / PUSHED / VERIFIED`; Task E was then not active. Task E was subsequently admitted and closed by the authoritative section above. The next post-MVP task remains `NONE` until explicit Founder / EM admission.
- Task F began when real-Founder evidence demonstrated a supported transformation/change dimension that structured capability inference omitted. The first drift was a `STRUCTURED_INFERENCE_GAP`, not evidence eligibility, validator, materialization, or graph projection failure.
- F.2 froze a generalized semantic benchmark and established that dominant-dimension/secondary-dimension under-mapping occurs beyond Founder evidence, especially in difficult multi-dimensional cases. F.3 prompt-only completeness hardening produced partial gains but was insufficient and was not admitted. F.4 isolated single-pass selection limitations, canonical-order sensitivity, and under-specified canonical semantic boundaries. F.5-F.7 explored two-stage decomposition and bounded Stage-2 partitioning; their partial gains did not satisfy generalized quality and precision requirements consistently, so none was admitted.
- F.8 found the structural semantic-authority defect: 0/51 capabilities had a complete explicit decision contract and all 51 lacked sufficient explicit boundaries. F.8.1 ratified those boundaries and corrected exactly three benchmark optional expectations. The durable benchmark became `structured-inference-coverage-benchmark/2.1.0`, SHA256 `B4BC948CABB7D37C032CF3080056C804872B7F523315FB1B36A4EC76F083A55A`, status `BENCHMARK_SEMANTICALLY_RATIFIED`, with REQUIRED 42, ALLOWED_OPTIONAL 26, and FORBIDDEN 89.
- F.9 hardened the existing canonical authority at commit `dc36e0982e1d21fa2d1d08c8a4bbd9408d016594` (`feat(career): define canonical capability semantics`). Content version advanced from `1.2.0` to `1.3.0`; all 51 canonical IDs, labels, ordering, and memberships across 12 families were preserved. Every capability now has `definition`, `positiveEvidence`, `notSufficient`, and `distinctions`; coverage is 51/51 and there are 104 directed neighbour distinctions.
- F.10 controlled A/B evidence established canonical semantic contracts as the primary generalized repair: semantic-contract context materially improved Level-3, multi-capability, and secondary-dimension recall over identity-only context while preserving precision. The Founder holdout naturally recovered `change-leadership` while preserving `analytics-governance` and `tooling-enablement`.
- F.11-F.14 found no severe whole-run reliability collapse, while confirming persistent secondary-dimension misses in some difficult cases. Lower temperature did not materially solve them. Mechanism isolation identified cross-evidence context competition, full-canonical competition, and one isolated genuine pairwise model-comprehension residual; it did not support sparse selection as the primary cause or max-3 as a physical bottleneck. Evidence partitioning offered partial gains with additional calls/latency, while deterministic one-hop neighbour verification could not reach enough relevant misses. No bounded multi-stage alternative earned enough incremental value to replace the simpler architecture.
- F.13.1 confirmed that `l3-logistics-partner-renewal -> partner-strategy` remains semantically REQUIRED. No benchmark or canonical correction was justified.
- Founder/EM cancelled the proposed retrieval/verification F.15, stopped further inference-architecture research, and admitted the frozen F.11 single-stage candidate in F.15. Implementation commit: `1d77a47488771bea6251125149e52d4d8faa3752` (`fix(career): ground capability inference in canonical semantics`).
- Final production architecture: `eligible atomic professional evidence -> one full-batch provider call -> full canonical capability authority with semantic contracts -> existing structured output -> existing validator -> existing materialization -> existing Career Map projection`. Semantic provider calls per inference batch are 1; retry is 0. Behavior decomposition, evidence partitioning, candidate retrieval, verification passes, voting, and per-evidence/per-capability semantic call loops are absent.
- Canonical semantic authority remains the existing canonical capability library at content version `1.3.0`: 51 capabilities, 12 families, 51/51 contracts, shape `definition + positiveEvidence + notSufficient + distinctions`. The provider consumes this authority directly and owns no duplicate semantic dictionary.
- Durable semantic principle: a personal canonical capability must be grounded in performed professional behavior and/or observable professional responsibility or outcome. It must not be inferred merely from job title, employer, education, qualification, generic project context, target role, an adjacent capability, or likely responsibility. Shorthand: `EVIDENCE OF PERFORMANCE, NOT LIKELIHOOD FROM CONTEXT`.
- The benchmark is durable semantic-quality regression and diagnostic infrastructure. It is a quality gate, but production admission does not require perfect benchmark recall.
- Known accepted model-quality residual: complex multi-dimensional Level-3 evidence may sometimes omit an independently supported secondary canonical capability. This is `KNOWN / MEASURED / NOT HIDDEN / NOT CURRENTLY PRODUCTION-BLOCKING`. Precision remains the stronger product constraint; current inference must not be described as perfect or exhaustive.
- More complex alternatives were rejected because their partial improvements did not earn the additional provider calls, latency, token cost, merge complexity, failure modes, and maintenance burden. The admitted architecture intentionally favors simplicity, semantic grounding, precision, explainability, and maintainability.
- Maximum final assessments per atomic evidence remains 3, `PRESERVED`. No demonstrated physical capacity bottleneck justifies changing it.
- Runtime semantic context is 45,294 characters, approximately 11k conceptual tokens in the full representation; F.10/F.11 measured approximately 9.6k provider prompt tokens per benchmark run. Classification: `SINGLE_CALL_SEMANTIC_COST_ACCEPTABLE`; no material context-pressure failure was observed.
- F.15 verification: focused provider, production integration, canonical semantic, deterministic benchmark, validator/linkage, materialization/graph, TypeScript, targeted ESLint, build, and post-push build all `PASS`. Admission ran no new live benchmark and no new Founder holdout because it used accumulated F.10-F.14 evidence rather than reopening a stochastic sampling gate.
- Superseded architecture record: F.3 prompt completeness, F.5 two-stage decomposition, and F.7 bounded Stage-2 partitioning are `SUPERSEDED / NOT ADMITTED`; F.14 evidence partition/neighbour verification is `NOT ADMITTED`; the previous retrieval/verification F.15 is `CANCELLED / NOT ADMITTED`. These are historical evidence, not active architecture.
- Historical planned Task E direction was `CAPABILITY-FIRST VISUAL HIERARCHY REBALANCE`: primary YOU + personal capability network; secondary future role possibilities; tertiary/on-demand evidence; preserve Task D role-focus semantics. It was subsequently admitted, implemented, and closed by the authoritative section above.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task F.9: Canonical Capability Semantic Contract Hardening Closed (`POST_MVP_TASK_F9_CONTROL_CLOSED`)

- Historical F.9 state: Career Map MVP and Post-MVP Tasks A-D were `CLOSED`; Task F was then the active semantic-quality workstream. Task F.8 completed the semantic-contract audit; Task F.8.1 ratified semantic conflicts and benchmark meaning; Task F.9 is `CLOSED / IMPLEMENTED / PUSHED / VERIFIED`. The later Task F closure above supersedes this historical active-state wording.
- Task F.9 implementation commit: `dc36e0982e1d21fa2d1d08c8a4bbd9408d016594` (`feat(career): define canonical capability semantics`).
- Canonical authority remains `lib/career-possibility/canonical-capability-library.ts`. It contains exactly 51 capabilities across 12 families. IDs, labels, ordering, and family memberships did not change. Content version advanced from `1.2.0` to `1.3.0` because canonical meaning was materially enriched without changing identity or the external inference schema.
- Every canonical capability now has a compact machine-usable contract containing `definition`, `positiveEvidence`, `notSufficient`, and `distinctions`. Coverage is 51/51 definitions, 51/51 positive-evidence criteria, 51/51 not-sufficient boundaries, and 51/51 capabilities with neighbour distinctions. There are 104 directed distinctions, 0 invalid neighbour references, 0 self references, and 0 duplicate neighbour references within a contract.
- Durable semantic principle: a personal canonical capability must be established by performed professional behavior and/or observable professional responsibility or outcome. It must not be inferred merely from job title, employer, education, qualification, generic project context, target role, an adjacent capability, or likelihood that the capability was required. Shorthand: `EVIDENCE OF PERFORMANCE, NOT LIKELIHOOD FROM CONTEXT`.
- Representative ratified boundaries: Analytics Governance requires standards, controls, definitions, quality/access/decision mechanisms, or equivalent governance evidence; analyst tooling/workspace enablement alone is insufficient. Commercial Partnerships requires material commercial purpose or value exchange; collaboration, joint programmes, or institutional partnerships alone are insufficient. Service Performance requires service-delivery responsibility, measurement, or outcome improvement; transformation, process, or programme activity alone is insufficient.
- The three F.8 potential duplicate-semantic groups and all 12 cross-family ambiguity groups are resolved by explicit semantic boundaries. No material semantic ambiguity remains identified. No canonical merge, rename, new ID, or family move was required.
- Durable benchmark authority is `structured-inference-coverage-benchmark/2.1.0`, SHA256 `B4BC948CABB7D37C032CF3080056C804872B7F523315FB1B36A4EC76F083A55A`, status `BENCHMARK_SEMANTICALLY_RATIFIED`. Static consistency is REQUIRED 42/42, ALLOWED_OPTIONAL 26/26, and FORBIDDEN 89/89, with 0 semantic conflicts.
- The final maximum remains 3 capability assessments per atomic evidence item, `PRESERVED FOR NOW`, because every currently required benchmark mapping fits within it. F.9 admitted no output-schema change.
- F.9 changed canonical semantic authority only. It did not modify the provider, inference/output validator, final structured output schema, eligibility, materializer, graph projection, or role semantic identity. Provider calls and Founder holdout calls were both 0.
- Compact semantic-contract context measures 45,294 characters, approximately 11,324 tokens and 10.16x the prior canonical provider context. Classification: `FEASIBLE_WITH_MATERIAL_CONTEXT_INCREASE`. This is not an F.9 blocker and is a required measurement dimension for any future inference evaluation.
- F.9 verification: focused semantic-contract tests, deterministic benchmark contract, role/canonical regressions, shared-identity regressions, TypeScript, targeted ESLint, build, and post-push build all `PASS`.
- Historical next step after F.9 was F.10 single-stage semantic-contract evaluation. F.10 was subsequently admitted and completed; the final Task F closure above is authoritative.
- Task E remains `NOT ACTIVE`. Next post-MVP task is `NONE` until explicit Founder / EM admission.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task D: Topology-Aware Role Focus + Visual Gap Explainability Closed (`POST_MVP_TASK_D_CLOSED`)

- Career Map MVP remains `CLOSED / MVP VALIDATED`; Post-MVP Task A, Task A.1, Task B, and Task C remain `CLOSED`.
- Task D name: `POST-MVP TASK D — TOPOLOGY-AWARE ROLE FOCUS + VISUAL GAP EXPLAINABILITY`. Task D is `CLOSED`; implementation is verified; implementation decision is `POST_MVP_TASK_D_ROLE_FOCUS_IMPLEMENTED`; product judgment is `TASK_D_ROLE_FOCUS_READY_WITH_MINOR_ISSUES`; material blockers are `NONE`.
- Implementation commit: `7b0bc406f9331ff2d07ce6d6175437c993fd813b` (`feat(career): explain role fit in career graph`).
- Founder dogfood found that visually uniform outer-role positions could be topologically misleading. Future roles remain in the outermost career-possibility domain, but angular/sector position now derives from connected canonical capability and family direction vectors through a weighted topological centroid plus bounded local collision/crossing adjustment. Role radius remains presentation-only and informed by upstream `proximityRank`; global even spacing no longer overrides semantic locality.
- Customer Insights Lead improved from `MATERIALLY_DISPLACED` at 46.6° displacement, 408.3 average edge length, and 903.5 longest edge to `TOPOLOGY_LOCAL` at 0.0°, 382.7 average, 631.1 longest, 30.2% longest-edge reduction, and zero central crossings. Data Product Manager improved from `MILDLY_DISPLACED` to `TOPOLOGY_LOCAL` with 22.7% longest-edge reduction. Analytics Manager and Marketing Analytics Lead remain `ACCEPTABLE_LOCALITY`; all 4/4 roles are topology-local or acceptable, with no material cross-graph bridge caused by global uniformity.
- Browse mode continues to explain the broader capability universe. One click activates Role Focus inside the same Career Map, with no new route, Role Lens tab, or duplicate semantic system. It automatically exposes every role-relevant canonical capability, owned/shared capability, role-only gap, and relevant family context; manual family clicks are `0`; unrelated context remains present at approximately 20% presentation weight; evidence does not auto-expand.
- Real-state Data Product Manager focus exposes 7 relevant capabilities: 3 owned/shared, 4 role-only gaps, and 0 transferable. Readiness was 118 ms at 1440, 117 ms at 1280, and 103 ms at 390; Founder 3-second test was `A`.
- Owned/shared capability presentation is filled with a structural outer ring, strong family path, and strong solid role path. Role-only gaps are hollow with a thick dashed structural ring, dashed role-only relationship, and no YOU ownership path. The selected role is enlarged with a double halo, stronger outline, and label emphasis. These structural and accessible-state distinctions do not rely on color alone.
- Family and broader spatial context remain visible. Hover/focus evidence behavior is preserved and concrete existing evidence remains available for owned capabilities; real-state evidence probes passed and fabricated gap evidence is `0`. The role panel is a `SECONDARY_CONFIRMATION_LAYER`; the graph itself communicates what the user already has versus what is missing.
- All four roles remain projected, rendered, and reachable on desktop and mobile. Responsive results: 1440 default/focus `PASS`; 1280 default `PASS` and focus `PASS WITH MINOR LABEL PROXIMITY`; 390 default `PASS WITH EXISTING MINOR DENSITY` and focus `PASS WITH MINOR LABEL CROWDING`; destructive horizontal overflow is `NONE`.
- Semantic guarantees are preserved: canonical capability ontology and family authority are unchanged; shared canonical identity, role-only non-ownership, evidence semantics, and role knowledge are preserved; role ranking and `proximityRank` remain upstream; graph projection remains semantic authority; renderer reranking, renderer fit scores, visible fit percentages, and High/Adjacent/Stretch labels remain absent; provider/API, inference, materializer, persistence, and Job Copilot are unchanged.
- Final acceptance used the real Founder Career Map state, classified `STATE_ADMISSIBLE`, SHA256 `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`; synthetic acceptance state `NO`; live provider calls `0`; CV uploads `0`.
- Verification carried forward from the accepted implementation: focused Task D tests `PASS — 4/4`; critical semantic regressions `PASS — 5/5`; shared identity, role-only non-ownership, evidence semantics, and ranking/projection `PASS`; TypeScript, targeted ESLint, and fresh production build `PASS`.
- Validation artifact (read-only and unstaged): `artifacts/career-possibility/post-mvp-task-d-role-focus-gap-explainability.md`, SHA256 `1ECC852DE62CF6D3ADF16D7312335E4300D1C933EDA6AFCE8BFBB5FD85089F51`.
- Known non-blocking issue: 390px Role Focus central-label crowding is `DEFERRED / NON-BLOCKING`. It does not reopen Task D, block acceptance, or automatically create a polish task.
- Next post-MVP task: `NONE`. Any future work requires new Founder / EM product review and explicit admission; no Task E or other follow-on task is automatic.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task C: Hero Career Graph + Layered Cluster Field Closed (`POST_MVP_TASK_C_CLOSED`)

- Career Map MVP remains `CLOSED / MVP VALIDATED`; Post-MVP Task A, Task A.1, and Task B remain `CLOSED`.
- Task C name: `POST-MVP TASK C — HERO CAREER GRAPH + LAYERED CLUSTER FIELD`.
- Task C status: `CLOSED`. Implementation is verified; final implementation decision is `POST_MVP_TASK_C_HERO_CLUSTER_GRAPH_IMPLEMENTED`; product judgment is `TASK_C_HERO_CLUSTER_GRAPH_READY_WITH_MINOR_ISSUES`; material blockers are `NONE`.
- Implementation commit: `e30204ac91c6c649307352b21d14b3f76168bf6f` (`feat(career): refine layered career graph experience`).
- Founder dogfood identified excessive graph chrome, mixed presentation layers, abstract evidence interaction, roles too close to the personal core, and insufficient cluster constraint. The graph is now the primary page hero; the redundant heading stack is compressed; the persistent lower instruction block is removed; selected detail and controls are non-blocking overlays.
- The complete semantic DOM navigator is preserved behind the visible, keyboard-accessible `Browse map` disclosure. Canvas hover and DOM focus surface concise verbatim excerpts of existing concrete work/action evidence near the interaction; generic `Evidence Signal` is not the primary label and no evidence is fabricated.
- Active presentation hierarchy: YOU center/origin anchor → presentation-only family cluster anchors → semantic evidence-backed canonical capabilities → supporting concrete experience/evidence, with four future roles in the outermost career-possibility domain. This is presentation hierarchy only and creates no ontology or semantic ownership change.
- Represented family clusters are Analytics & Insight, Leadership, Data & Technology, Operations & Delivery, Customer & Market, Governance & Risk, and Learning & Development. Each is `ACCEPTABLE_CLUSTER`; overall graph classification is `ACCEPTABLE_CLUSTER`; no represented family is `BROKEN_CLUSTER`.
- Active graph engine remains authorised `react-force-graph-2d@1.29.1`. Presentation behavior is a constrained clustered force field: YOU anchoring, family attractors, capability-family affinity, evidence-parent affinity, outer-role targeting, collision pressure, cross-cluster separation, and deterministic asymmetry. No fixed radial-ring ontology and no direct `d3-force` dependency were introduced.
- Semantic guarantees remain preserved: canonical capability ontology and capability-family authority are unchanged; shared canonical identity and role-only non-ownership are preserved; personal evidence semantics and role knowledge are unchanged; role ranking stays upstream; renderer reranking is absent; graph projection remains semantic authority; provider/API, inference, materializer, persistence, and Job Copilot are unchanged.
- Real-Founder-state acceptance used SHA256 `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`, not synthetic state. Provider calls were `0`; CV uploads were `0`; Founder hierarchy test was `A`; all four projected roles were rendered and reachable on desktop and mobile.
- Responsive acceptance: 1440×1000 `PASS` with 864px graph field; 1280×800 `PASS` with 680px graph field; 390×844 `PASS WITH MINOR ISSUE` with 708px graph field; no destructive horizontal overflow; graph remains primary.
- Verification: focused Task C tests `PASS — 4/4`; critical Career Map semantic regressions `PASS — 5/5`; shared canonical identity, role-only non-ownership, evidence semantics, and ranking/projection `PASS`; TypeScript, targeted ESLint, and fresh production build `PASS`.
- Validation artifact: `artifacts/career-possibility/post-mvp-task-c-hero-layered-cluster-graph.md`, SHA256 `7AF5587B95149A580D78479D612C9C7D756B59872D34D02F93D70E6344088AE7`.
- Historical Task C non-blocking issues were mobile central-label density and naturally long outer-role bridge edges. Task D superseded the topology/role-focus presentation state without reopening Task C.
- Historical Task C next-task state was `NONE`; it was superseded by the explicitly admitted and now-closed Task D above.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task B: Career Graph Field Production Implementation Closed (`POST_MVP_TASK_B_CLOSED`)

- Career Map MVP remains `CLOSED / MVP VALIDATED`; Post-MVP Task A and Task A.1 remain `CLOSED`.
- Task B name: `POST-MVP TASK B — CAREER GRAPH FIELD PRODUCTION IMPLEMENTATION`.
- Task B status: `CLOSED`. Implementation is verified; ratification is canonical; final verification decision is `POST_MVP_TASK_B_POST_PUSH_VERIFIED`; product judgment is `TASK_B_FORCE_GRAPH_READY_WITH_MINOR_ISSUES`; material blockers are `NONE`.
- B0 selected `REACT_FORCE_GRAPH_SELECTED`, choosing `react-force-graph-2d` for the organic Career Graph field direction. Production implementation initially preceded formal admission; the retrospective audit ratified the exact production, test, and package boundary.
- Durable active rendering path: existing Career Map semantic projection → presentation-only visual adapter → `CareerMapNeuralGraph` renderer owner → client-only `CareerMapForceGraph` force engine → CareerTwin interaction/detail layer. `career-graph-visual-adapter.ts` is `PRESENTATION_ONLY_VISUAL_ADAPTER`; `CareerMapNeuralGraph.tsx` is `RENDERER_OWNER_WITH_FORCE_ENGINE`; `CareerMapForceGraph.tsx` is `PRESENTATION_ENGINE_ONLY`.
- Exact ratified production boundary: `components/career-possibility/CareerMapForceGraph.tsx`, `components/career-possibility/CareerMapNeuralGraph.tsx`, and `lib/career-possibility/career-graph-visual-adapter.ts`.
- Exact ratified test boundary: `tests/career-possibility/active-multi-role-career-map-renderer.test.ts`, `tests/career-possibility/career-graph-visual-adapter.test.ts`, `tests/career-possibility/career-map-neural-graph.test.ts`, and `tests/career-possibility/unified-career-map-surface.test.ts`. Test weakening found: `NO`.
- Active engine: authorised `react-force-graph-2d@1.29.1`. Exact Task-B-specific package boundary: `package.json` and `package-lock.json` for that one top-level production dependency plus only its required lockfile transitive graph. A direct top-level `d3-force` addition and unrelated package movement remain unauthorised. Package lock classification: `DEPENDENCY_LOCK_COHERENT`.
- Semantic guarantees remain upstream and preserved: canonical capability ontology and capability-family semantic authority are unchanged; family nodes remain presentation grouping only; shared canonical identity, role-only non-ownership, and personal evidence semantics are preserved; role knowledge is unchanged; role ranking remains upstream/unchanged; graph projection remains semantic authority; provider/API, inference, and materializer are unchanged; renderer-side semantic fit and role reranking are absent.
- Retrospectively ratified implementation commit: `7c55d5632bc95707f36fdd072b86adcbf8729f6f` (`feat(career): adopt force-directed career graph`).
- Retrospective audit artifact: `artifacts/career-possibility/post-mvp-task-b-retrospective-admission-audit.md`, SHA256 `D785D61AD91CDE9B60F1F457C8B1E9E67FA53FE6159EF402BD088AFB945E7A35`.
- Existing non-canonical implementation evidence: `artifacts/career-possibility/post-mvp-task-b-career-graph-field-production.md`, SHA256 `DFBC722F9EE586CC5BBDADA4A01EBAC8B413B13B9AEE5E7FED0B2A3BA0CB1B55`.
- Final visual acceptance used the real Founder-exported Career Map state, not synthetic final acceptance; provider inference calls were `0` and CV uploads were `0`. Verified evidence: 1440×1000 `6EF7BF099E0C25E2135661BDAA440C25B0438D8FEA0BC11B42DA6CCDE0A41AB1`; 1280×800 `58AA07A48C1E81646FE492FEBE092A0BA6DF64DDCFC3C0F435B18DC7DCCCD398`; 390×844 `31AA81AF079517CEAF7B202F74A0EB97203B7083D13D51C26F861C23913F730D`.
- Final product state: unified Career Map and force-directed Career Graph field `ACTIVE`; YOU anchor, family hierarchy, canonical capability layer, four future roles, graph field/Canvas, node collision, edge readability, and evidence interaction `PASS`; Founder product test `A`; 1440 and 1280 `PASS`; 390 `MINOR`; responsive acceptance `PASS WITH MINOR ISSUES`.
- Final verification: focused Task B tests `PASS — 4/4`; critical semantic carry-forward regressions `PASS — 5/5`; shared canonical identity, role-only non-ownership, evidence semantics, and ranking/graph projection `PASS`; TypeScript, targeted ESLint, and fresh production build `PASS`; Impeccable detector `ZERO FINDINGS`; visual audit `15/20 — GOOD`; P0/P1 `NONE`.
- Historical Task B non-blocking issues were mobile label crowding and local color-token drift; this Task B state is superseded by the Task C closure above.
- Historical Task B next-task state was `NONE`; it was superseded by the explicitly admitted and now-closed Task C above.
- `memory_sync_required: no`
- `memory_sync_targets: []`

### Post-MVP Task B0: Graph Engine Selection Closed (`POST_MVP_TASK_B0_CLOSED_ENGINE_SELECTED`)

- Career Map MVP remains `CLOSED / MVP VALIDATED`; Post-MVP Task A and Task A.1 remain `CLOSED`.
- B0 was an isolated product/technical bake-off prompted by the Founder direction to evolve the current card/radial architecture diagram toward an organic, multi-scale, interactive career knowledge graph whose first impression is “This is my career capability universe.”
- The two evaluated candidates were `react-force-graph-2d` and `Sigma.js + Graphology + ForceAtlas2`.
- Selected presentation engine: `react-force-graph-2d` 1.29.1 with direct force dependency `d3-force` 3.0.0; license `MIT`; Founder visual result `A — CAREER UNIVERSE / KNOWLEDGE GRAPH`; comparative score `75 / 85`.
- Runner-up: `Sigma.js + Graphology + ForceAtlas2`; Founder visual result `B — STILL FEELS LIKE A DIAGRAM`; comparative score `55 / 85`. Sigma demonstrated stronger raw large-graph performance headroom, but CareerTwin currently places greater weight on organic Founder visual fit, semantic force control, React integration, custom node rendering, interaction simplicity, and lower production integration complexity.
- Directional selected-engine evidence: the current real graph was supported; approximately 100 nodes were smooth; approximately 500 nodes remained responsive with visible simulation cost; approximately 1,000 nodes were usable after settling with about 36.4 MB observed heap. This is spike evidence, not a production SLO.
- Recommended production architecture: existing CareerTwin semantic state → existing graph projection → thin presentation-only `CareerGraphVisualAdapter` → `react-force-graph-2d` → CareerTwin interaction/detail layer.
- `CareerMapNeuralGraph.tsx` future disposition: `REPLACE_RENDERING_INTERNALS_KEEP_PUBLIC_OWNER`. Do not create a second production Career Map route or parallel semantic system.
- Semantic graph projection change required: `NO`. Production Task B must first adapt existing projection truth; any later missing presentation data must be reported as a boundary conflict before semantic projection changes.
- CareerTwin remains authoritative for evidence truth, canonical capability identity, capability families, personal ownership, role requirements, role-only non-ownership, shared canonical identity, role ranking/proximity, structured inference, and materialization. The graph engine may own physics, rendering, Canvas drawing, collision, viewport transforms, zoom, pan, drag, hover, and selection mechanics only.
- Presentation direction: You is the primary hub; families are medium cluster hubs; canonical capabilities are smaller semantic nodes; atomic evidence may appear as anonymous tiny satellites; future roles remain distinct outer hubs on the same Career Map; role-only capabilities remain muted/hollow and non-owned. Raw evidence text is not a permanent graph label; evidence detail stays CareerTwin-owned.
- Shared canonical capabilities may visually bridge personal and future-role clusters. No visible fit percentage and no High / Adjacent / Stretch classification are admitted; role ranking remains upstream CareerTwin authority.
- Historical B0 closure state (superseded by the Task B ratification above): engine selected `YES`; production dependency admitted `NOT YET`; production package install completed `NO`. `package.json` and `package-lock.json` remained unchanged by B0, and later Task B ratification explicitly authorised the exact package boundary.
- B0 used the exact Founder-exported real Career Map state, SHA256 `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`. Privacy-safe state aggregates: 13 evidence, 11 personal capabilities, 23 mappings, 23 direct, 0 transferable, 0 duplicates, and 0 capabilities without evidence; provider calls 0; CV uploads 0; raw evidence text exposed `NO`.
- Neutral spike-only topology: 45 nodes (You 1, family 7, capability 11, anonymous evidence 13, role 4, role-only capability 9) and 67 edges (user-family 7, family-capability 11, capability-evidence 23, role-owned-capability 14, role-only-capability 12). This is not a production ontology.
- Bake-off artifact: `artifacts/career-possibility/post-mvp-task-b0-graph-engine-bakeoff.md`, SHA256 `11BC71093A42AB392332689C30FFDE7F1C5D2AC00ABDB163D173CAB89F7FB4DD`; six screenshots remain untracked validation evidence.
- Post-MVP Task B0 is `CLOSED` with decision `REACT_FORCE_GRAPH_SELECTED`.
- Historical B0 next-task state (superseded by the Task B ratification above): Post-MVP Task B was `NOT YET IMPLEMENTED` and required explicit Founder / EM admission.
- `memory_sync_required: yes`
- `memory_sync_targets: [docs/control/current-active-brief.md, docs/control/current-system-memory.md]`

### Post-MVP Task A.1: Real-CV Unified Graph Layout Repair Closed (`POST_MVP_TASK_A1_REAL_CV_LAYOUT_REPAIRED`)

- Career Map MVP remains `CLOSED / MVP VALIDATED`; historical Post-MVP Task A remains `CLOSED`.
- Founder real-CV dogfooding exposed a renderer-only geometry defect in the unified Career Map. Task A.1 is `CLOSED` with product judgment `REAL_CV_UNIFIED_MAP_VISUALLY_READY`.
- The privacy-sensitive validation input was the Founder-exported exact browser Career Map state. SHA256: `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`; schema `2.0.0`; admission result `STATE_ADMISSIBLE`.
- Privacy-safe state aggregates: 13 evidence records, 11 canonical personal capabilities, 23 mappings, 23 direct, 0 transferable, 0 duplicate pairs, and 0 capabilities without evidence.
- Exact-state rehydration was confirmed. Structured-inference calls, live provider calls, and CV uploads were all 0. Temporary raw-state copies were removed; the original Founder Downloads copy is not repository-owned and was not committed.
- Primary presentation fault: `MIXED_COORDINATE_SYSTEMS`. Graph projection semantic defect: `NO`. Renderer presentation defect: `YES / CLOSED`. First writable owner: `components/career-possibility/CareerMapNeuralGraph.tsx`.
- Historical broken geometry: YOU `(449.00, 700.00)`; 7 families; 0 canonical capabilities initially visible and 11 reachable; 4 roles rendered; ghost-center delta `206.53px`; Analytics Manager overlapped Operations & Delivery; two roles were clipped; family/role balance left a large unused canvas region.
- Accepted geometry: YOU `(575.80, 670.00)` is the real visual anchor; 7 family nodes occupy the active first layer at `165.00–222.95px` from YOU; all 11 canonical capabilities are initially visible as the active second layer; capability collisions are 0.
- Four future roles remain on the same surface: 4 projected, 4 rendered, 4 in bounds, 4 unobstructed, and 4 mobile reachable. Real-state role distances are `533.08`, `608.93`, `653.88`, and `657.97px`; role-family overlaps are 0.
- Ghost-center delta is `0.00px`; ghost center is `ABSENT`. Canvas balance, node collision, label collision, and edge readability all pass. Two-layer classification is `CLEAR_TWO_LAYER`; Founder 10-second result is `A`.
- Responsive real-state validation passed at `1440×1000`, `1280×800`, and `390×844`.
- Shared canonical identity, role-only non-ownership, evidence semantics, upstream role ranking, canonical ontology, graph projection semantics, provider, and API remain preserved/unchanged. The repair remained presentation-only.
- Task A.1 supersedes historical Task 3D display-radius and progressive-visibility presentation details only; Task 3B role-order authority and Task 3C projection semantics remain authoritative and unchanged.
- Implementation commit: `6cfad0eba2003c264a0b11f54cf0f5944455c17e` (`fix(career): correct real-state career map layout`).
- Validation artifact: `artifacts/career-possibility/post-mvp-task-a1-real-cv-layout-repair.md`, SHA256 `C4D8DA584ED12A8A0CDE6DFCDF6FF7E8AEDFD093A39C69582334A4A9CEE79451`. Real-state before/after screenshots remain untracked validation evidence.
- Task A.1 is `CLOSED`. Historical A.1 closure routing was superseded by B0; B0's Task B admission requirement was subsequently satisfied by canonical Task B ratification and closure above.

### Post-MVP Task A: Unified Career Map Surface Closed (`POST_MVP_TASK_A_CLOSED`)

- Task A motivation: remove fragmented Career Map / Neural Graph / Role Lens modes
- one unified Career Map surface
- family → canonical capability two-layer presentation
- four future roles on same surface
- family nodes presentation-only
- canonical semantic identity unchanged
- role ranking unchanged
- evidence semantics unchanged
- responsive validation PASS
- final implementation commit: 81fd16cf7accb4e93e4cf5ce14f85fdeda8c2ffe
- final visual artifact/hash: 63CBA96B59B3398F899E50C8EDE2357B40279BA08F744FF3F8CD4730BAC704CA
- semantic regression carry-forward PASS
- Task A CLOSED
- historical Task A closure state: no automatic next post-MVP task (superseded by the B0 closure above)

### Career Map MVP Closed and Validated (`CAREERTWIN_MVP_CLOSED_VALIDATED`)

- Task 1 through Task 4: CLOSED.
- Final Task 4 decision: MVP_TASK4_REAL_CV_VISUAL_VALIDATED.
- Final product judgment: MVP_VISUALLY_READY.
- Current Task 4 CV hash: D5F627CF6294A208354D587609F0B2A8104305ACE49E4D5A5DA53868B4EBAB6A.
- Admitted browser-state hash: 2702B9E025E3D5069C8BCA04D6709DD8E016113132FDFAF85FD90115B68B22DD.
- Semantic aggregate result: 13 eligible evidence -> 9 unique canonical capabilities -> 20 direct relationships (1 deterministic, 19 structured).
- 4-role rendered validation: Active real-state Career Map connected, projecting Analytics Manager, Data Product Manager, Customer Insights Lead, and Marketing Analytics Lead.
- Monotonic proximity: PASS (rank 0 < rank 1 < rank 2 < rank 3 distances).
- Desktop/mobile evidence interaction: PASS.
- Overflow/collision/runtime errors: PASS (None).
- Validation artifact: artifacts/career-possibility/career-map-mvp-task4-real-cv-visual-validation-browser-retry.md (SHA256: 7D2711A285FAAE0951E0FA57E8ED0D683C1A86F22BB3AAC7C2C7221AA0102303).
- Screenshot hashes: 1440x1000 (FAACB480D31A83CE848C21411A689FB71448E27CD35E51DDDFA781CB48AF17B1), 1280x800 (690539F05BD1677B9F0E289040F4A0317C0B1BF9C5567D174C6F2D56966AF520), 390x844 (EEBDA98C8C6676A2D3B18D5585D38A5DDF8D79EABD1D1DB3F98D32460E8A449E).
- Raw state snapshot (`state.json`): DELETED.
- Provider timeout repair: Durable state ACTIVE (bounded await, no automatic retry).
- API registry-version repair: Durable state ALIGNED (strict fail-closed version validation preserved).
- Role Knowledge: MVP_SUFFICIENT.
- Triangulation: DEFERRED_POST_MVP_QUALITY_WORK.
- Next Career Map MVP task: NONE (no further MVP task; future work requires explicit post-MVP admission).

### Career Map MVP Task 4 API contract repaired; materialization retry next (`CAREERTWIN_MVP_TASK4_API_CONTRACT_REPAIRED`)

- diagnostic classification: `STRUCTURED_INFERENCE_API_CONTRACT_DRIFT`
- implementation commit: `29cfe09a9cb7a879e2165b900f19faf332608842`
- client registry version authority: `buildCareerMapCapabilityDefinitionsFromCanonicalLibrary().definitionVersion`
- server registry version authority: same existing authoritative definitionVersion owner
- strict fail-closed validation preserved
- stale registry version rejected before provider
- no parallel version composer
- no semantic architecture changes
- browser/CDP validation environment available
- current Task 4 CV hash: `D5F627CF6294A208354D587609F0B2A8104305ACE49E4D5A5DA53868B4EBAB6A`
- Task 4 browser retry CLOSED

### Career Map MVP Task 4 provider runtime closed; materialization retry next (`CAREERTWIN_MVP_TASK4_PROVIDER_RUNTIME_CLOSED_RETRY_NEXT`)

- The Founder neural-network Career Map model is the governing MVP product model. You is central; personal capabilities must be grounded in personal evidence; users and generic roles share canonical capability identity; unsupported role requirements remain role-only gaps; role proximity/radius will express meaningful capability overlap.
- The active critical path is fixed unless Founder/EM explicitly reprioritises it:
  1. Task 1 - Atomic Evidence Extraction: `CLOSED`
  2. Task 2A - Structured Inference Gap Audit: `CLOSED`
  3. Task 2B - Provider-Neutral Structured Inference Foundation: `CLOSED`
  4. Task 2C-A - Production Integration Admission Audit: `CLOSED`
  5. Task 2C Architecture Decision Lock: `CLOSED BY CONTROL COMMIT`
  6. Task 2C Persisted Mapping Provenance Decision Lock: `CLOSED BY CONTROL COMMIT`
  7. Task 2C-B - Production Structured Capability Inference Integration: `CLOSED`
  8. Task 2D prerequisite decorated-section privacy repair: `CLOSED`
  9. Task 2D prerequisite employment-metadata privacy repair: `CLOSED`
  10. Task 2D attempt #3 - Post-privacy-repair real-CV replay: `INVALID`; `UNCLASSIFIED_STANDALONE_EMPLOYMENT_ROLE_DESCRIPTOR` entered eligible evidence; provider calls `0`
  11. Task 2D structural evidence eligibility decision: `CLOSED`
  12. Task 2D structural evidence eligibility repair: `CLOSED` at `b2e7d483328f35aecb203d8a5d008b128be2c817`
  13. Task 2D - Privacy-Safe / Founder-CV Capability Coverage Validation: `CLOSED`; decision `MVP_TASK2D_PERSONAL_CAPABILITY_COVERAGE_VALIDATED`
  14. Task 2: `CLOSED`; personal capability substrate `MVP_SUFFICIENT`
  15. Task 3A - Neural-network Career Map Integration Admission Audit: `CLOSED`; decision `MVP_TASK3_INTEGRATION_BOUNDARY_IDENTIFIED`
  16. Task 3B - Real Personal State to Generic Role Alignment: `CLOSED` at `854a980bbebf29cce0333e56a88ca7c6d0b1cd5b`
  17. Task 3C - Ranked Multi-role Graph Projection and Presentation-only Role Proximity: `CLOSED` at `3657449e433ab778be085db1365d4e063e77f3a4`
  18. Task 3D - Active Desktop/mobile Multi-role Renderer Connection: `CLOSED` at `0cfd2be4095d637c36f38c3a94fef826aac12b3c`
  19. Task 3: `CLOSED`
  20. Task 4 - Real-CV Materialization and End-to-end Visual Validation: `CLOSED`; provider runtime diagnostic and timeout repair `CLOSED`; materialization retry `CLOSED`
- Task 1 authoritative implementation commit: `b2ba34d18574f49ec22c852c99e640a1d306fad6` (`fix(career): preserve work evidence across resume sections`).
- The admitted Task 1 boundary includes `nonEmploymentSectionHeading`, associated non-work boundary handling in `employmentBoundaries()`, correct transition/reset ordering, pending-work emission before reset, and exclusion of non-work boundaries from evidence production.
- Verified Task 1 behavior: work evidence survives transitions into Education, Skills, and Qualifications; end-of-document work flush remains correct; employer/title remain provenance only; technology and self-declared skill lists remain excluded; no duplicate evidence is introduced. Focused extractor tests, three nearby regression tests, the six-case behavior matrix, and production build passed before admission; focused test and build passed again after push.
- Evidence eligibility interpretation: `WORK EXPERIENCE -> one work bullet -> EDUCATION` produces exactly one professional work evidence record. Education is a section boundary, not evidence. This strengthens rather than relaxes the evidence contract.
- Task 2A is closed. Its first writable fault was `STRUCTURED_CONTRACT_MISSING`; the immutable audit artifact is `artifacts/career-possibility/career-map-mvp-task2-structured-inference-gap-audit.md` with SHA256 `9313BA0966C1D9FD25A6ABD7E11481069FDC19F12B7FFD505F0907DCDD70D3ED`.
- Task 2B is closed at implementation commit `a52466061489a747e5dfb1cc834cbbf2244a5c2c` (`feat(career): add structured capability inference contract`). It created the provider-neutral contract, injectable producer boundary, strict deterministic validator, and focused validator tests without connecting production orchestration.
- Task 2B reuses `lib/career-possibility/canonical-capability-library.ts` as canonical ID authority and `ResumeEvidenceRecord` identity/content as atomic evidence authority. It creates no parallel ontology, inference authority, materializer, or state.
- The Task 2B support-assessment vocabulary is exactly `directly_supported | transferable_support`. Zero capability assessments is valid. Exact known evidence IDs and canonical capability IDs are required, and grounding rationale must be nonblank.
- The locked MVP fan-out guardrail is a maximum of three capability assessments per atomic evidence result. Counts 0, 1, 2, and 3 are valid. More than three rejects the entire affected evidence result: no truncation, ranking, first-three retention, or partial salvage is permitted. Independently valid evidence results in the same provider batch remain eligible.
- Unknown evidence/capability IDs, malformed results, duplicate evidence result objects, duplicate evidence/capability assessments, blank rationales, and conflicting direct/transferable assessments fail closed at the appropriate response or evidence-result boundary. Duplicate results do not merge, and conflicting support has no precedence heuristic.
- Task 2B validation is proposal-only: raw provider output cannot write to personal state, and validation does not require a deterministic signal token. Existing deterministic inference remains a high-precision, exclusion/guardrail, QA/debug, and corroboration channel.
- Task 2C-A is closed. Its immutable admission artifact is `artifacts/career-possibility/career-map-mvp-task2c-production-integration-admission.md` with SHA256 `F55DBD9CD80CFD01FA6E60F87905ED7D205E78D4F3662B0740C8A2860EC40D5E`.
- Intended Task 2 path: `CV -> Atomic Evidence Extraction -> Evidence Eligibility Boundary -> Career Capability LLM -> Career-Map-specific strict structured output -> deterministic schema/canonical-ID/evidence-link validation -> canonical capability proposals -> existing canonical personal capability inference or clean proposal boundary -> existing materializer/provisional personal state -> Career Map`.
- Task 2 invariants: the LLM is a structured inference producer, not the truth owner; it may select only existing canonical capability IDs; every accepted proposal retains exact atomic evidence IDs; zero proposals is valid; raw model output cannot write directly to state; direct/transferable support remains deterministically governed; title, company, role/JD semantics, and unsupported role requirements cannot create personal capability.
- Deterministic signals and mapping remain available as a high-precision channel, guardrail, QA/debug surface, and corroboration source, but are not the intended mandatory capability gateway. No deterministic signal does not mean no personal capability.
- Existing canonical inference, materializer, provisional personal-state, role-library, and graph-semantic owners remain authoritative. No parallel extractor, ontology, inference authority, personal-state authority, role system, or graph authority is admitted.
- Role Knowledge is `MVP_SUFFICIENT`; further Role Knowledge enrichment is not currently required for MVP. No Wave 3 Role Knowledge work is authorised.
- Second-source triangulation is `DEFERRED_POST_MVP_QUALITY_WORK`. Its audit history remains valid, but it is not on the active MVP critical path.
- All milestone-local `single next action` statements below are retained as historical context and are superseded for current routing by this section.
- Task 2D is closed by `MVP_TASK2D_PERSONAL_CAPABILITY_COVERAGE_VALIDATED`. The authoritative non-canonical measurement artifact is `artifacts/career-possibility/career-map-mvp-task2d-real-cv-capability-validation-measurement-replay.md`, SHA256 `3C5CC27611C5171F619C9AA1C58F9896374DB221353E570D2C46D3F586A4FB05`.
- The admissible real-CV privacy gate passed with 14 eligible performed-work evidence records and 0 metadata contamination. All 14 evidence records received at least one admitted capability relationship: 13 unique canonical capabilities and 25 unique evidence/capability relationships.
- Channel composition is 3 `authored_deterministic` and 22 `structured_inference`; relationship composition is 25 direct and 0 transferable. Six capabilities have at least two supporting evidence records, cross-channel duplicates are 0, capabilities with zero evidence are 0, provider runtime failures are 0, and the production route returned 200.
- Grounding is `PASS`, personal capability breadth is `SUFFICIENT`, and the result materially improves on the historical deterministic-only baseline. Minor capability spam and minor structured over-inference do not establish a bounded Task 2 defect. No further Task 2 repair is required.
- All 25 admitted relationships being direct is a non-blocking calibration/product observation only. It does not reopen Task 2 or authorise support-semantics tuning before Task 3. The observed 100% evidence coverage is not a permanent product threshold or future acceptance rule.
- Historical Task 2D attempts remain superseded evidence: attempt #1 had Education/Skills contamination; attempt #2 had role-title metadata contamination; attempt #3 used an unguarded fallback; the next privacy-valid run failed only in its temporary measurement harness after production success. The final measurement-harness-verified replay is the valid baseline.
- Task 3A is closed. Its decision is `MVP_TASK3_INTEGRATION_BOUNDARY_IDENTIFIED`; the frozen audit artifact is `artifacts/career-possibility/career-map-mvp-task3-integration-admission-audit.md`, SHA256 `75386F8DD60AA28C63C60A53692D18BCBCEC434985C82964AD68664AB89D0F2C`.
- Task 3B is closed at implementation commit `854a980bbebf29cce0333e56a88ca7c6d0b1cd5b` (`feat(career): connect personal state to role alignment`). Decision: `MVP_TASK3B_REAL_STATE_ROLE_ALIGNMENT_CONNECTED`.
- The personal semantic source for generic-role alignment is `ProvisionalLocalCareerMapState.mappings`. `buildPersonalGenericRoleAlignment()` in `lib/career-possibility/personal-generic-role-alignment-adapter.ts` validates that state, deduplicates ownership by canonical capability ID, preserves exact mapping/evidence identity plus direct/transferable and deterministic/structured support metadata, and invokes the existing role-alignment owner.
- `buildGenericCareerPathAlignment()` remains the authoritative generic-role ranker. Task 3B added only a truthful canonical-ownership input/output seam because current personal state cannot supply legacy numeric strength or signal provenance. The existing ranking algorithm and legacy branch remain preserved; no parallel ranker exists.
- No personal strength, confidence, evidence-count weight, direct/transferable numeric weight, or signal provenance is fabricated. Structured-only and authored-deterministic mappings both establish valid personal canonical ownership; deterministic signal presence is not a gateway.
- Multiple supporting evidence relationships remain provenance for one canonical semantic capability ownership. Role requirements cannot create personal capability, and unmatched canonical requirements remain role-only requirements for later projection.
- All four current `representativeGenericRoleArchetypes` are evaluated in one deterministic flow. Existing identity/core/supporting/differentiator priority, `orderingBasis`, role order, and stable title/role-ID tie-breaks remain the ordering authority and are retained for Task 3C proximity/radius derivation.
- `buildPersonalCareerMapPresentation()` and `groupPersonalCapabilitiesByFamily()` remain presentation-layer owners only. Presentation families do not create, remove, or rank canonical personal overlap. First-ring presentation remains partial but does not block Task 3.
- Task 3C is closed at implementation commit `3657449e433ab778be085db1365d4e063e77f3a4` (`feat(career): project ranked generic roles`). Decision: `MVP_TASK3C_MULTI_ROLE_PROJECTION_CONNECTED`.
- `buildCareerMapGraphProjection()` in `lib/career-possibility/career-map-graph-projection.ts` remains the authoritative ephemeral graph projection owner. Its existing singular `role` path is backward compatible, while optional `rankedRoleAlignment` accepts the authoritative ordered Task 3B `alignment.roles` result.
- Four-ranked-role graph projection is active. Task 3B remains role-order authority through `ProvisionalLocalCareerMapState.mappings -> buildPersonalGenericRoleAlignment() -> buildGenericCareerPathAlignment()`; Task 3C preserves the returned array order and performs no ranking recalculation. New ranking logic: none. New fit score: none.
- `RoleGraphNode.proximityRank` is presentation-only, rank-derived ordinal metadata: rank 0 is closest and rank 3 is furthest among the current four. It is not a percentage, confidence, probability, or semantic fit score.
- `canonicalCapabilityRegistry` inside `buildCareerMapGraphProjection()` keys semantic capability identity by canonical capability ID. Shared personally owned capabilities and shared role-only missing requirements preserve one canonical semantic identity. Role-requirement proxy IDs remain layout/context details and are not semantic authority.
- Role-only gap support is preserved: a role requirement cannot create personal ownership, evidence, or support. Personal evidence relationships remain grounding for personal capabilities and are not duplicated per role.
- Task 3D is closed at implementation commit `0cfd2be4095d637c36f38c3a94fef826aac12b3c` (`feat(career): connect multi-role career map renderer`). Decision: `MVP_TASK3D_MULTI_ROLE_RENDERER_CONNECTED`.
- `LocalCareerMapWorkspace` owns the active production route and `CareerMapNeuralGraph` owns rendering. The connected real-state chain is `local v2 Career Map state -> personal presentation -> buildPersonalGenericRoleAlignment() -> rankedRoleAlignment -> buildCareerMapGraphProjection() -> CareerMapNeuralGraph`.
- The prior hard-coded singular Analytics Manager active semantic dependency is removed. All four current generic roles are projected and actively iterated by the desktop and mobile renderer; both structural paths passed verification.
- `rolePosition()` owns deterministic display geometry and translates `RoleGraphNode.proximityRank` using radius `250 + proximityRank * 25`, currently producing radii 250, 275, 300, and 325. This is rank-derived presentation proximity only.
- Renderer-side role ranking: `NONE`. Renderer-side overlap inference: `NONE`. Renderer-side gap inference: `NONE`. Renderer-side canonical capability inference: `NONE`. New semantic fit score and High / Adjacent / Stretch labels: `NONE`.
- Shared canonical capability identity remains preserved. Role-requirement layout proxies remain non-semantic. Role-only gaps remain renderable without creating personal ownership.
- Personal evidence disclosure remains preserved and is not duplicated per role. Empty/no-valid-state behavior is preserved.
- First-ring presentation remains unchanged; `buildPersonalCareerMapPresentation()` and `groupPersonalCapabilitiesByFamily()` were not modified.
- Task 3 is `CLOSED`: personal canonical state now connects through generic role alignment and four-role graph projection to the active renderer.
- Task 4 is `CURRENT`: [HISTORICAL] retry real-CV materialization and authorise only bounded presentation or renderer repair demonstrated necessary by actual visual evidence. Role Knowledge remains `MVP_SUFFICIENT`; triangulation remains `DEFERRED_POST_MVP_QUALITY_WORK`.
- The Task 4 provider runtime diagnostic is `CLOSED`. Its decision was `MVP_TASK4_PROVIDER_TIMEOUT_BOUNDARY_REQUIRED`; the frozen non-canonical artifact is `artifacts/career-possibility/career-map-mvp-task4-provider-runtime-diagnostic.md`, SHA256 `689C11E8B7C63162B99A44EC5F9B35ED3A1691FF69868AB99BF063E3DE48D902`.
- The Task 4 provider runtime timeout repair is `CLOSED` at implementation commit `8684b0d9a02bef979254225859bb8c497bef1cf5` (`fix(career): bound capability provider runtime`), decision `MVP_TASK4_PROVIDER_TIMEOUT_BOUNDARY_REPAIRED`.
- The authoritative provider owner remains `geminiCareerCapabilityStructuredInferenceProducer` in `lib/career-possibility/career-capability-structured-inference-gemini-provider.ts`. With installed `@google/genai` `1.44.0`, `CAREER_CAPABILITY_PROVIDER_TIMEOUT_MS = 90_000` is applied through SDK-native `GenerateContentConfig.httpOptions.timeout`. The provider await is `BOUNDED`; normal success or timeout settles the provider promise and lets existing route/provider-failure handling complete the CareerTwin request.
- Provider timeout is a runtime completion guardrail only. Timeout remains a controlled ordinary provider failure and reuses existing Task 2C `FAIL_CLOSED_DETERMINISTIC_CHANNEL_SURVIVES` semantics; it does not create empty semantic success, fabricated inference, partial semantic success, reconstructed mappings, or retry. Task 2 remains `CLOSED` and inference semantics are unchanged.
- Automatic provider retry is `NONE`. Provider model, prompt, structured inference config, validator, mapping, merge, materializer, and local state schema are unchanged. Client `Request.signal` propagation, route timeout, client timeout, and an explicit provider-local `AbortSignal` were not added. SDK-native HTTP timeout owns bounded completion; remote Gemini service cancellation is not claimed, and browser-tab disconnect propagation remains outside this repair.
- The prior `MVP_TASK4_PROVIDER_RUNTIME_UNAVAILABLE` run is reclassified as `PROVIDER_TIMEOUT_BOUNDARY_MISSING`; that specific production runtime defect is `REPAIRED`.
- `STALE_HOLD_ONLY_TEST_EXPECTATION`: untracked `tests/career-possibility/career-map-provenance-chain.test.ts` expects Education evidence, but Education remains a section boundary rather than independent personal capability evidence. The test is not authoritative Task 3C baseline evidence and is not current cleanup work.
- Task 2C-B is closed at implementation commit `fb8ce5e4edcd4836bf87f1a59d697e482e69e7c9` (`feat(career): integrate structured capability inference`). Production now runs `atomic eligible evidence -> CareerTwin same-origin server -> server-only Career Map provider adapter -> Task 2B provider-neutral response -> Task 2B validator -> validated structured mappings -> cross-channel merge -> existing materializer -> existing Career Map state`.
- The production route is `/api/career-map/capability-inference`, owned by `app/api/career-map/capability-inference/route.ts`. The server adapter is `lib/career-possibility/career-capability-structured-inference-gemini-provider.ts`; the client producer is `lib/career-possibility/career-capability-structured-inference-api-producer.ts`.
- The current provider implementation uses `GoogleGenAI` with `gemini-3.6-flash`. Provider/model choice is an implementation detail, not Career Map semantic authority; the Task 2B contract remains provider-neutral.
- The authorised personal evidence payload is exactly the eligible `{ evidenceId, evidenceText }`. Authorised canonical context is limited to existing `{ id, label, family }` plus required contract/content versions.
- Raw CV files, complete extracted CVs, employer names, job titles, education, qualifications, skills-section content, contact information, and unrelated résumé metadata are forbidden semantic model input. Provenance metadata may remain inside CareerTwin but is not independent semantic capability evidence.
- CareerTwin application code must not intentionally persist submitted evidence payloads, constructed prompts containing evidence, or raw provider responses to a database, Career Map state, durable local diagnostics, or application logs. It must not log request bodies or raw provider responses. Ordinary technical request metadata containing no evidence remains under existing infrastructure behavior.
- External-provider zero retention must not be claimed unless the selected provider and configuration are separately verified. The active upload copy truthfully states that selected professional evidence passes through CareerTwin's server and an AI provider; do not restore a browser-only claim while this production architecture remains active. No privacy settings system or consent workflow is authorised.
- Cross-channel relationship identity is `evidenceId + canonicalCapabilityId`, and at most one personal relationship may be admitted for a pair. Deterministic and structured proposals with the same pair and support state deduplicate to one relationship.
- For the same pair with different support states, retain the already-governed deterministic relationship and reject the conflicting structured proposal. Do not upgrade, downgrade, average, score, randomly choose, or duplicate. A structured conflict may emit an ephemeral diagnostic but does not require persistent state.
- Deterministic inference is not a mandatory gateway. If no deterministic proposal exists for a pair, a valid structured proposal may still be admitted through the governed structured proposal path. `NO DETERMINISTIC SIGNAL != NO PERSONAL CAPABILITY` remains locked.
- The production persisted mapping contract truthfully supports `method: "authored_deterministic"` and `method: "structured_inference"`. This is provider-neutral semantic provenance, not a provider/model label.
- An authored deterministic mapping retains existing validation and must carry its real `matchedRuleId`. A structured inference mapping must originate from a Task 2B-validated relationship and must omit `matchedRuleId`; null, blank, provider-specific, or synthetic rule values are prohibited.
- A structured-only relationship may persist truthfully in the existing Career Map mapping collection with exact evidence ID, canonical capability ID, and governed relationship state. This no-signal path is active in production; no deterministic signal or mapping is required as a gateway.
- For same-pair/same-support cross-channel output, persist one relationship and prefer the already-governed deterministic mapping. For conflicting support, persist deterministic and reject structured; any conflict diagnostic remains ephemeral.
- Provider/model name, prompt, raw provider response, grounding rationale, validation issue envelope, model confidence, fake signal, fake mapping rule, and cross-channel conflict diagnostic are not required persisted state and must not be added for Task 2C.
- Existing Career Map state and the existing materializer remain the only authoritative persistence/materialization owners. The provenance extension is additive and backward-compatible; existing deterministic records require no migration or rewrite, and the schema version remains `2.0.0`.
- The Task 2B provider-neutral contract remains authoritative: maximum three assessments per atomic evidence result; more than three rejects the affected result without truncation; zero assessments is valid; unknown evidence/canonical IDs and duplicate/conflicting provider results fail closed; raw model output cannot mutate state.
- `adaptValidatedStructuredCapabilityMappings()` converts only Task 2B-validated assessments into truthful structured mappings. `mergeDeterministicAndStructuredMappings()` is the single merge owner using `evidenceId + canonicalCapabilityId`: same-support output deduplicates to deterministic, while conflicting support retains deterministic and rejects structured.
- Structured provider unavailability, timeout, route failure, or malformed response admits zero structured mappings while existing deterministic inference and Career Map materialization may continue. Classification: `FAIL_CLOSED_DETERMINISTIC_CHANNEL_SURVIVES`.
- Earlier browser-local-only Career Map V1/runtime statements remain historical implementation truth and are superseded only for authorised transmission of eligible minimized Task 2C evidence. All other privacy, local-state, and persistence boundaries remain in force.
- Focused Task 2C-B verification passed for structured-only/no-signal admission, deterministic preservation, same-support dedupe, both conflict directions, invalid rejection, zero output, provider failure, exact evidence grounding, state provenance, minimized transport, server-only secret handling, route validation, and raw-response isolation. Existing regressions, TypeScript, targeted ESLint, and the production build passed.
- The Task 2D prerequisite decorated-section privacy repair is closed at implementation commit `3f4e82ffb1e44c71524fae21f4d3d1fd14e75f69` (`fix(career): exclude decorated resume sections`). Its first drift point was `ATOMIC_EVIDENCE_ELIGIBILITY`, and its root cause was `DECORATIVE_PREFIX_NOT_NORMALIZED` for the observed `◇ Education` and `◇ Skills` headings.
- The repair performs heading-only comparison normalization: leading whitespace and non-semantic decorative glyphs are removed before the existing exact known-heading semantics are applied. Stored evidence text is unchanged, and no broad substring matching was introduced.
- Decorated known non-employment headings now terminate employment evidence boundaries while preserving preceding valid work evidence. Education and Skills-section content are not eligible evidence and cannot enter the structured-inference provider payload; employer/title provenance remains excluded. The production privacy eligibility boundary is `RESTORED`.
- The first Task 2D real-CV run is `INVALID_FOR_CAPABILITY_COVERAGE_ASSESSMENT` because Education and Skills content contaminated its structured-inference input before the repair. All capability-count, coverage, over-inference, under-inference, and product-readiness conclusions from that run are discarded.
- The repair restored the existing privacy architecture; it introduced no inference, provider, validator, merge, state, ontology, Role Knowledge, graph, or rendering architecture change.
- Task 2D privacy repair #2 is closed at implementation commit `20d91d21920a66218421321786df671d06f0012f` (`fix(career): exclude employment metadata from evidence`). Its first drift point was `employmentBoundaries()` and its root cause was `FALLBACK_EVIDENCE_ADMISSION_AFTER_METADATA_CLASSIFICATION`.
- The repaired owner reuses the existing `dateRange` and `companySuffix` semantics to assemble multiline employer, role-title, and standalone-date headers into provenance-bearing employment boundaries. Evidence starts after the header; valid work bullets and supported fallback/prose work evidence remain eligible.
- Employment metadata is `PROVENANCE_ONLY`: role title may annotate evidence but role-title-only evidence is prohibited, and employer may annotate evidence but employer-only evidence is prohibited. No title dictionary, fuzzy title heuristic, downstream value-equality filter, provider filter, or new role-title ontology was introduced.
- Structured-inference transport remains exactly `{ evidenceId, evidenceText }`. Synthetic production-path verification excluded role-title-only metadata, employer-only metadata, Education headings/content, and Skills headings/content while retaining performed-work evidence.
- Task 2D attempt #1 and attempt #2 are both `INVALID_FOR_CAPABILITY_COVERAGE_ASSESSMENT`. Attempt #1 contained Education/Skills content before repair #1; attempt #2 exposed role-title metadata in eligible producer input and stopped before provider transmission. Neither attempt supports capability-count, inventory, coverage, over-inference, under-inference, product-readiness, or Task 3 readiness conclusions.
- Both privacy repairs restored the existing evidence-eligibility architecture and changed no inference, provider, validator, mapping, merge, state, ontology, Role Knowledge, graph, or rendering architecture.
- Task 2D attempts #1, #2, and #3 are `INVALID_FOR_CAPABILITY_COVERAGE_ASSESSMENT`. Attempt #1 contained Education/Skills content; attempt #2 exposed role-title metadata; attempt #3 exposed `UNCLASSIFIED_STANDALONE_EMPLOYMENT_ROLE_DESCRIPTOR` through the former unguarded fallback and made `0` provider calls. These remain historical only and are superseded by the final admissible measurement-harness-verified replay recorded above.
- Structural evidence eligibility repair is closed at implementation commit `b2e7d483328f35aecb203d8a5d008b128be2c817` (`fix(career): require positive evidence admission`). The authoritative extractor-local owner is `qualifiesAsPerformedProfessionalEvidence()`, guarding the sole evidence-record emission path after `employmentBoundaries()` and `segmentCandidates()`.
- Positive admission is active: `NOT CLASSIFIED AS METADATA != VALID PROFESSIONAL EVIDENCE`. Metadata/provenance classification is terminal; unclassified candidates are not automatically admitted; ambiguous metadata-like candidates fail closed to non-evidence. One prior unguarded fallback path was removed, leaving `0` employment-relevant unguarded fallback admission paths.
- Valid work bullets and legitimate supported fallback/prose performed-work evidence remain eligible without evidence-text rewriting. No title dictionary, capitalization guess, fuzzy title heuristic, LLM classifier, provider-side filter, value-equality filter, word-count repair, or field-specific privacy repair #3 was introduced.
- Synthetic extractor and production-transport regressions verified that valid performed-work evidence reaches the structured producer while employer/title/date metadata, decorated Education/Skills content, and an ambiguous standalone descriptor do not. Transport remains exactly `{ evidenceId, evidenceText }`.
- Single next action: retry one production-equivalent Task 4 materialization using the exact Founder CV and pre-provider privacy gate; on an admissible success, continue immediately in the same runtime/browser session into real-CV visual validation. A timeout must settle as controlled failure. Do not pre-authorise visual repair. Role Knowledge remains `MVP_SUFFICIENT`; triangulation remains `DEFERRED_POST_MVP_QUALITY_WORK`.

### Historical: Wave 2 Role Knowledge enrichment closed (`CAREERTWIN_WAVE_2_ROLE_KNOWLEDGE_ENRICHMENT_CLOSED`)

- Wave 2 is closed. Authoritative implementation commit: `ecb77b52dc537b9aa958f23d7194689568fdea34` (`feat(career): enrich wave 2 role evidence semantics`).
- The three enriched roles are `fpa-manager`, `program-manager`, and `education-program-lead`.
- The six enriched canonical capabilities are `forecasting`, `variance-analysis`, `dependency-management`, `risk-controls`, `education-delivery`, and `education-partnerships`.
- All six moved from `INSUFFICIENT` to `WEAK` and from `ONTOLOGY_ENRICHMENT_REQUIRED` to `TARGETED_REVIEW_CANDIDATE` in the governed deterministic source census.
- Across the six targets, non-boilerplate relationship-specific expectedEvidence increased from 0 to 6.
- Non-target source-state changes: 0. Existing AUTO regressions: 0. Pre-existing TARGETED regressions: 0.
- Structural conflict signals among the six: 0. Routing contradiction signals among the six: 0. Role topology remained unchanged.
- No canonical ontology, semantic-policy, source-sufficiency policy, compiler/scanner implementation, or topology change was required.
- Current post-Wave2 census supersedes the Wave 1 current-state census: `STRONG 8 / MODERATE 10 / WEAK 16 / INSUFFICIENT 17`; `AUTO 18 / TARGETED 16 / ENRICHMENT 17 / CONFLICT 0`. Historical Wave 1 measurements remain unchanged.
- Wave 1 moved 10 previously source-starved canonical capabilities through governed role-specific expectedEvidence. Wave 2 replicated the same deterministic movement for 6 additional capabilities across Finance, Program, and Education. Cumulative replicated movement is 16 canonical capabilities across multiple role/domain areas.
- Durable architectural conclusion: `ROLE_KNOWLEDGE_ENRICHMENT_TO_SOURCE_SUFFICIENCY_MOVEMENT = CROSS_DOMAIN_REPLICATION_VALIDATED`.
- Interpretation boundary: governed non-boilerplate Role Knowledge can reproducibly move a source-starved capability into WEAK/TARGETED without ontology, policy, topology, or classifier-policy changes. `WEAK` is not canonical semantic admission; `TARGETED` is not `AUTO`; one rich Role Knowledge source is not strong semantic confidence; cross-domain source-enrichment replication is not proof that the canonical semantic compiler is fully validated.
- The initial Wave 2 post-write test failure was a stale-current-state contract defect: permanent tests treated the Wave 1 repository snapshot as immutable current truth. That repair is closed. Frozen historical fixture replay may retain fixed expectations; current repository tests now use dynamic source, topology, classifier, aggregate, and compiler/scanner reconciliation. No fixed Wave 2 totals were added to permanent tests.
- Historical post-Wave2 semantic lanes: AUTO 18; TARGETED 16; ENRICHMENT 17; CONFLICT 0. TARGETED was large enough to make second-source triangulation a viable future quality option.
- The post-Wave2 strategic decision is retained as historical audit context and no longer controls the active MVP path. Triangulation is deferred post-MVP, and further coverage expansion is not currently required for MVP.
  - Option A - coverage expansion: continue governed Role Knowledge enrichment across the remaining 17 ENRICHMENT/INSUFFICIENT capabilities.
  - Option B - triangulation/second-source validation: use the 16 WEAK/TARGETED capabilities to test whether independent semantic source evidence can move them toward stronger source sufficiency and/or AUTO eligibility.
- Wave 3 is not authorized. No Wave 3 role selection, planning, candidate synthesis, enrichment, or source write is approved.

### Career Map structured LLM architecture adopted (`CAREERTWIN_CAREER_MAP_STRUCTURED_LLM_ARCHITECTURE_ADOPTED`)

- The architecture reuse audit for Career Map structured LLM integration is complete. No production implementation or file modifications occurred during this cycle.
- Established fresh authoritative founder baseline: schema 2.0.0 local state regenerated, yielding 32 atomic evidence records, 1 auto-admitted capability (`insight-synthesis`), and 31 unresolved evidence records.
- Root cause diagnosis: The current pipeline's reliance on mandatory deterministic signals excludes valid implicit evidence, resulting in severe coverage gaps for the real founder Career Map.
- Architectural decision: Job Copilot's low-level LLM infrastructure (`@google/genai` structured-output pattern) will be reused. However, Job Copilot's specific JD ontologies, fitScore, ranking, and recommendation semantics MUST NOT be reused.
- Capability proposal model: The LLM will function as a structured inference producer generating validated canonical capability proposals. It is NOT the truth owner.
- Deterministic boundary: All LLM proposals must pass strict schema validation and canonical ID verification before being admitted into the existing `inferCanonicalPersonalCapabilities` logic (or an adapted format).
- Authored the durable architecture guide: `docs/architecture/career-map-architecture.md`.
- All HOLD-dirty files remain untouched and unstaged.
- Historical next action superseded: the reuse audit informed the accepted architecture; Task 2B later established the structured contract/validator foundation, and the live routing section above now assigns Task 2C as next.

### Neural Career Map renderer slice established (`CAREERTWIN_NEURAL_CAREER_MAP_RENDERER_SLICE_ESTABLISHED`)

- Implementation commit `815b10f` (`feat(career): add neural career map renderer slice`). Three files: `components/career-possibility/CareerMapNeuralGraph.tsx` (CREATE), `components/career-possibility/LocalCareerMapWorkspace.tsx` (MODIFY — graph tab only), `tests/career-possibility/career-map-neural-graph.test.ts` (CREATE).
- Runtime injection path: existing localStorage read → existing `result.state` → existing `buildPersonalCareerMapPresentation()` → existing `personal.presentation` → new `buildPersonalTargetRoleComparison()` call (stable `analytics-manager` profile only) → new `buildCareerMapGraphProjection()` call → `<CareerMapNeuralGraph projection={...} />`. No second localStorage read.
- Representative role: `analytics-manager` located by stable `roleFamilyId` via `roles.find()` — not by array position. The `roles` prop already contains `RoleCapabilityProfile[]`; no conversion needed. If comparison returns `ok: false`, the personal graph still renders and role context is omitted.
- `LocalCareerMapWorkspace` activeView widened from `"map" | "role-lens"` to `"map" | "graph" | "role-lens"`. A new "Neural Graph" tab and `career-map-graph-panel` tabpanel are inserted between the existing Career Map and Role Lens tabs. All existing tabs, panels, and the CapabilityExplorer remain intact.
- `CareerMapNeuralGraph` is a `"use client"` React component accepting `projection: CareerMapGraphProjection` as its sole semantic input. It owns all layout geometry locally using a constrained responsive radial layout. It imports no localStorage owner, no Job Copilot module, no fitScore, no career-map-explorer-view-model, and no CapabilityExplorer.
- Visual layout: You fixed at SVG center (CX=420, CY=340). Family nodes distributed on a first ring (radius 185, angle computed from count — no fixed-six assumption). Personal capability nodes expand locally from their owning family (hidden by default, revealed on family select or role-capability expand). Evidence nodes expand locally from the selected capability (hidden by default, revealed on capability select). Role node anchored at outer right (ROLE_X=840). Role requirement nodes distribute around the role on a local ring.
- Progressive disclosure enforced: default view shows only You + family nodes + role node. Family select reveals that family's capabilities. Capability select reveals its evidence. Role select reveals requirement nodes and capability bridges.
- Visible personal capabilities = selected-family capabilities UNION personal capabilities referenced by role requirements with non-unsupported state. This is presentation-only visibility logic; it does not alter semantic state.
- Role requirement states rendered with distinct visual treatment: `directly_demonstrated` = solid teal stroke/fill; `transferable_signal` = blue stroke/fill + dashed edge; `evidence_not_yet_shown` = grey stroke + transparent fill + dashed. Shape and label text supplement color for accessibility.
- Unsupported role requirements render as role-side `role_requirement` nodes only. They are never added to personal capability or family nodes. Critical invariant confirmed in test B.
- No employer / roleTitle provenance consumed. No fitScore, fitLabel, rank, Future Paths rail geometry, amber growth area, RAIL_START_X, pathPositions, fixed-six layout, or demo fixture imported.
- Mobile fallback list renders family buttons, capability list, evidence list, and role requirements using accessible button/div elements with `data-node-type` and `data-node-id` stable attributes.
- Renderer tests (A–F) pass: default graph structure, unsupported-requirement invariant, node-ID uniqueness, no-provenance-requirement, no-storage-import, no-Job-Copilot-import. Click-interaction tests are NOT supported by the current tooling (no jsdom/RTL); documented in test output.
- All 44 career-possibility tests pass; 1 pre-existing HOLD failure in `resume-evidence-text-extractor.test.ts` remains unchanged and reported separately.
- ESLint clean, TypeScript clean, production build clean (`/career-map` static), `git diff --check` clean on admitted files (LF→CRLF warnings only).
- No HOLD file touched. All 13 tracked HOLD-dirty files and all 21 untracked HOLD items preserved exactly untouched and unstaged.
- Single next action: Validate the neural graph visually with real founder Career Map data and audit the minimum changes needed to make the neural graph the primary post-upload Career Map experience before expanding role discovery.

### Career Map graph projection foundation established (`CAREERTWIN_CAREER_MAP_GRAPH_PROJECTION_ESTABLISHED`)

- Implementation commit `157df6f` (`feat(career): add career map graph projection`). Two new files only: `lib/career-possibility/career-map-graph-projection.ts` and `tests/career-possibility/career-map-graph-projection.test.ts`.
- The projection is presentation-only and ephemeral. It derives a typed graph model from existing committed semantic owners and does not persist state, modify inference, or introduce new semantic concepts.
- `groupPersonalCapabilitiesByFamily()` uses `canonicalCapabilityFamilyLibrary` as the authoritative family grouping. Only families with ≥1 admitted personal capability are emitted; families with zero personal evidence are silently absent.
- `buildCareerMapGraphProjection()` accepts `PersonalCareerMapPresentation` and an optional `CareerMapRoleInput` (containing a pre-computed `PersonalTargetRoleComparison`). It produces typed `CareerMapGraphProjection` with six node kinds (user, capability_family, capability, evidence, role, role_requirement) and four edge types (user_has_family, family_contains_capability, capability_supported_by_evidence, role_requires_capability).
- Evidence nodes use committed fields only: `text`, `relationship`, `evidenceId`, `sourceStart`, `sourceEnd`. No `employer` or `roleTitle` (HOLD-only provenance) is consumed or referenced.
- Role requirement states come from `PersonalTargetRoleComparison.requirements[].outcome`: `directly_demonstrated`, `transferable_signal`, `evidence_not_yet_shown`. Governance states (`governance_deferred`, `governance_excluded`) are filtered from the graph.
- Unsupported-requirement invariant: a role requirement for a capability absent from the user's personal set appears as a `role_requirement` node with `requirementState: "evidence_not_yet_shown"`. It is NEVER added to personal `capability` or `capability_family` nodes. Explicitly tested in test F.
- No fitScore, fitLabel, rank, confidence score, strength field, employer/roleTitle provenance, Job Copilot semantics, or JD-specific logic was introduced.
- All 8 focused tests (A–H) passed. All 42 career-possibility tests passed; 1 pre-existing failure in `resume-evidence-text-extractor.test.ts` is a pre-existing HOLD conflict (HOLD-modified extractor breaks committed test; not caused by this slice). ESLint clean, TypeScript clean, production build clean, `git diff --check` clean on new files.
- No HOLD file was touched. All HOLD dirt preserved exactly untouched and unstaged. No UI graph implemented; no `app/career-map/page.tsx` or `CareerMapNeuralGraph.tsx` created.
- canonical family library remains family authority. `PersonalCareerMapPresentation` remains personal capability state authority. `buildPersonalTargetRoleComparison()` remains role-requirement-state authority.
- Single next action: Audit the cleanest runtime injection boundary for rendering the new graph projection from the existing real personal Career Map state without creating a parallel localStorage/state path or modifying provenance HOLD dirt (Phase 2 of the neural graph vertical slice).

### Managed requirements evidence standard repaired (`CAREERTWIN_MANAGED_REQUIREMENTS_EVIDENCE_STANDARD_REPAIRED`)

- The over-broad `managed_requirements` evidence standard was audited and repaired. The prior rule incorrectly admitted `gathered requirements` as `managed_requirements`, over-claiming delegated requirements work.
- Implementation `a9e7a06` (`fix(career): tighten managed requirements evidence`) tightens `signal/action/managed-requirements` from ruleVersion `1.3.0` to `1.4.0`. Signal policy advances from `1.5.0` to `1.6.0` with the vocabulary and 48-rule inventory unchanged.
- `gathered` is removed from the performed-work alternatives; the rule now admits only `managed|defined|owned|prioritised|prioritized` requirements plus the owned product/platform/workflow/service requirements fallback.
- New exclusion patterns reject delegated team/analyst/consultant/staff/vendor/engineer/developer/contractor/specialist gathering, documenting, collecting, defining, prioritising, or managing requirements, and reject process/workflow/programme-for-requirements-gathering/collection/management/definition phrasing.
- Gathering, collection, documentation, facilitation, interviewing, workshops, passive-defined, helped-define, supported, contributed, reviewed, received, worked-with, responsible, experience, and skills phrasing no longer emit `managed_requirements`.
- Valid management remains admitted: managed requirements, defined+owned product requirements, owned platform requirements, prioritised/prioritized requirements, and owned product/platform/workflow requirements with delivery-quality coordination.
- The governance test now records `governed_delivery_quality` as `DEFER_COMPOSITE_EVIDENCE_STANDARD`, aligning the test with the already-accepted governance decision from `CAREERTWIN_DELIVERY_QUALITY_CANONICAL_MAPPING_GOVERNED`; no semantic behavior changed for that token.
- No canonical capability, mapping rule, role profile, canonical inference, extractor, state/storage, materializer, UI, Job Copilot/server, API/Supabase/package, review, or supplementation behavior changed. Focused tests, all 42 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`.
- Single next action: Hold after managed-requirements evidence repair. Govern whether `managed_requirements` can map to an existing canonical building block before adding infinitive `manage`.

### Delivery-quality management infinitive signal repaired (`CAREERTWIN_DELIVERY_QUALITY_MANAGEMENT_INFINITIVE_SIGNAL_REPAIRED`)


- Requirements and delivery-quality morphology were audited separately. Requirements repair remains deferred because its current rule already treats `gathered requirements` as `managed_requirements`; adding `manage` there would also over-claim delegated requirements work.
- Implementation `9b5c80d` (`fix(career): admit infinitive delivery quality management`) adds one narrow relation-bound infinitive `manage` branch only to `signal/action/governed-delivery-quality`. Signal policy advances from `1.4.0` to `1.5.0` with the vocabulary and 48-rule inventory unchanged.
- The branch admits direct delivery-quality, quality-control and QA-control objects, plus bounded coordinated requirements/product-delivery object lists. It rejects management of teams, analysts, staff, vendors, or processes performing quality work. Ordinary checks, testing, improvement, support, review, high-quality output, issue resolution, other morphologies, punctuation crossings, and non-performed language remain insufficient.
- Existing `governed|owned|managed|established` behavior, ownership fallback, 65/70/45 bounds, exclusions, composability, plural signals, deterministic identity, and the entire requirements rule remain unchanged.
- Privacy-safe CV A replay remains 33 evidence. `governed_delivery_quality` changes from zero to one, `owned_product_or_service` remains one, and `managed_requirements` remains zero. Structured/unsupported/unresolved remain 5/27/1; capabilities remain `analytics-governance` and `insight-synthesis` because delivery quality has no canonical mapping. CV B replay is unchanged.
- No mapping rule, canonical capability, role profile, canonical inference, extractor, state/storage, materializer, UI, Job Copilot/server, API/Supabase/package, broad token, review, or supplementation behavior changed. Focused tests, founder replays, all 42 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`.
- Single next action: Hold after delivery-quality infinitive repair. Govern whether `governed_delivery_quality` can map to an existing canonical capability before repairing requirements evidence standards.

### Business framing infinitive signal repaired (`CAREERTWIN_BUSINESS_FRAMING_INFINITIVE_SIGNAL_REPAIRED`)

- Wrapped-bullet extraction repair was already complete. The next proven founder false negative was the performed infinitive `translate` in CV A's business-problem framing evidence.
- Implementation `7162c92` (`fix(career): admit infinitive business framing`) adds only `translate` to `signal/action/framed-business-problem`, preserving `translated|framed|defined`, all object/output/order/distance/punctuation/exclusion guards, and the 48-rule inventory. Signal policy advances from `1.3.0` to `1.4.0` so deterministic signal identity participates in the behavior change.
- `translating`, `frame`, `framing`, `define`, `defining`, and all `shape` variants remain excluded. Dashboard, documentation, language translation, generic support/analysis, hypothetical, requirement-style, title-only, and skills-list language remain insufficient. Existing exclusive-rule conflict behavior remains fail-closed.
- Privacy-safe founder replay: CV A remains 33 evidence. `framed_business_problem` changes from zero to one while structured/unsupported/unresolved remain 5/27/1. Mapping remains two admitted capabilities, `analytics-governance` and `insight-synthesis`, because framing still has no canonical mapping rule. The founder Career Map therefore remains unchanged.
- Adoption, requirements, delivery quality, anomaly, root-cause, pattern, and standardisation issues remain separate. No canonical capability, mapping rule, role profile, canonical inference, extractor, state/storage, materializer, UI, Job Copilot/server, API/Supabase/package, broad token, review, or supplementation behavior changed.
- Focused morphology/guard/determinism tests, founder CV A replay, all 42 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`.
- Single next action: Hold after framing infinitive repair. Govern whether `framed_business_problem` can map to an existing canonical building block before repairing another founder signal.

### Wrapped resume bullet evidence preserved (`CAREERTWIN_WRAPPED_RESUME_BULLET_EVIDENCE_PRESERVED`)

- The refined-signal coverage diagnostic reproduced eight historical founder broad-token emissions: four were expected false-positive removals and four were true-positive refined-signal losses. The first upstream fault was PDF-wrapped bullet fragmentation, not mapping, ontology, state, or UI.
- Implementation `4b0ae92` (`fix(career): preserve wrapped resume bullet evidence`) keeps a bullet and structurally safe contiguous continuation lines in one source-provenanced evidence record. New bullets, blank boundaries, headings, employment/date transitions, and identified standalone prose remain separate.
- Composed evidence preserves original text order and contiguous offsets. Its deterministic identity includes sequence, composed offsets, and a bounded source-text fingerprint; unchanged single-line evidence retains the existing identity form. No fragmented continuation record is duplicated.
- Privacy-safe replay: CV A remains 33 evidence, five structured signals, two admitted mappings, and capabilities `analytics-governance` and `insight-synthesis`. CV B changes from 33 fragmented records to 20 composed records; the diagnosed E03/E04, E13/E14, and E29/E30 pairs each become one record. CV B has four structured signals and four admitted mappings but retains the same unique capabilities: `insight-synthesis`, `people-leadership`, and `strategic-analysis`.
- The recomposed investigation evidence still emits no refined investigation token because gerund/finite-action morphology remains a separate defect. The other two composed pairs do not invent recurrence or reusability semantics. Signal policy `1.3.0`/48 rules and mapping policy `1.3.0`/11 rules are unchanged.
- No parser dependency, canonical capability, role profile, inference, state/storage, materializer, UI, Job Copilot/server, API/Supabase/package, review, or supplementation change occurred. Focused extractor/diagnostic/bridge tests, all 42 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`.
- Single next action: Hold after wrapped-bullet evidence repair. Re-run the founder refined-signal trace and audit only the remaining morphology and bounded-predicate false negatives before changing any signal rule.

### Refined universal tokens mapped to canonical capabilities (`CAREERTWIN_REFINED_UNIVERSAL_TOKENS_MAPPED_TO_CANONICAL_CAPABILITIES`)

- The existing 51-ID universal ontology and plural canonical inference were reused. Implementation `2cf9672` (`feat(career): map refined signals to canonical capabilities`) governs all 14 refined tokens and advances only the bounded mapping policy from `1.2.0`/10 rules to `1.3.0`/11 rules.
- Exactly one mapping is admitted: `built_reusable_tooling -> tooling-enablement -> transferable_signal`. Reusable-tool construction is transferable evidence, but does not claim user adoption or a complete enablement outcome.
- Deferred for signal-evidence standards: `framed_business_problem`, `advised_decision_maker`, `prioritised_delivery`, `investigated_anomaly`, `isolated_meaningful_pattern`, `enabled_platform_adoption`, and `designed_ai_assisted_workflow`. Deferred for canonical definition: `automated_recurring_workflow` and `standardised_workflow`. Deferred for composite evidence standard: `governed_delivery_quality`. Deferred for ontology gaps: `owned_product_or_service`, `managed_requirements`, and `diagnosed_root_cause`.
- Profile-local semantic gaps were not promoted: product/service ownership, requirements management, delivery-quality oversight, and root-cause diagnosis have no exact admitted canonical destination. In particular, `owned_product_or_service` is not Business Ownership, Roadmap Governance, Product Cadence, Cross-functional Delivery, or Tooling Enablement.
- Privacy-safe founder replay remained unchanged. CV A: 33 evidence, capabilities `analytics-governance` and `insight-synthesis`, 3 unsupported, 0 unresolved. CV B: 33 evidence, capabilities `insight-synthesis`, `people-leadership`, and `strategic-analysis`, 0 unsupported, 0 unresolved. Neither CV emits `built_reusable_tooling`, so no Career Map node or browser check was added.
- Signal policy remains `1.3.0`/48 rules. No canonical capability, role profile, canonical inference, parser, state/storage, materializer, UI, Job Copilot/server, API/Supabase/package, review, or supplementation behavior changed. All 42 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`.
- Single next action: Hold after refined-token mapping. Audit the former broad-token founder evidence that no longer emits refined tokens before changing any signal threshold.

### Deferred signals decomposed into universal tokens (`CAREERTWIN_DEFERRED_SIGNALS_DECOMPOSED_INTO_UNIVERSAL_TOKENS`)

- CareerTwin's existing universal capability architecture and plural canonical inference were reused. Implementation `e02e4c2` (`refactor(career): decompose broad evidence signals`) changes only the semantic signal layer and advances its policy from `1.2.0`/45 rules to `1.3.0`/48 rules.
- Four domain-labelled parents are retired from active vocabulary: `provided_analytics_business_advice`, `owned_analytics_product`, `performed_investigative_analysis`, and `enabled_analytics_workflow`. They are never emitted alongside refined children.
- Fourteen role-independent tokens are admitted: `framed_business_problem`, `advised_decision_maker`, `owned_product_or_service`, `managed_requirements`, `prioritised_delivery`, `governed_delivery_quality`, `investigated_anomaly`, `diagnosed_root_cause`, `isolated_meaningful_pattern`, `built_reusable_tooling`, `automated_recurring_workflow`, `standardised_workflow`, `enabled_platform_adoption`, and `designed_ai_assisted_workflow`.
- Refined rules are composable only when each meaning has independent lexical support. Existing exclusive action ambiguity remains fail-closed. Generic partnering, collaboration, analysis, issue resolution, product support, reporting improvement, platform support, tool names, and AI use remain insufficient.
- Each emitted token now has an ordered deterministic `signalId`; the existing aggregate `signalIdentity`, evidence ID, source locator, and `unreviewed` trust status remain. The signal contract does not independently transport source revision, so no revision value was fabricated.
- Privacy-safe real-file replay: CV A retained 33 evidence records; previous broad counts advice=1/product=1/workflow=3 became zero, with refined `owned_product_or_service=1`, 3 mapping-unsupported and 0 mapping-unresolved. CV B retained 33 evidence records; previous broad counts investigation=1/workflow=2 became zero, with no refined token, 0 mapping-unsupported and 0 mapping-unresolved. No additional capability was claimed.
- Cross-role fixtures passed for Business Delivery, Product, Operations, Finance, HR, Engineering, Marketing, and Analytics contexts. All refined tokens remain `unsupported/no_canonical_rule` pending separate governance.
- No canonical capability, mapping policy/rule, role profile, canonical inference, parser, state/storage, materializer, Career Map UI, Job Copilot/server, API/Supabase/package, review, or supplementation change occurred. Mode returned to `HOLD`.
- Focused signal/decomposition/diagnostic tests, all 41 Career Possibility test files, exact-file ESLint, TypeScript, production build, and `git diff --check` passed.
- Single next action: Hold after universal token decomposition. Govern mappings from the refined tokens into existing canonical capability building blocks using evidence-specific positive and negative fixtures.

### Canonical multi-proposal inference established (`CAREERTWIN_CANONICAL_MULTI_PROPOSAL_INFERENCE_ESTABLISHED`)

- The architecture reuse audit confirmed that CareerTwin already has one 51-ID canonical capability ontology, 22 role profiles, plural downstream capability/evidence structures, and the shared Career Map skeleton. No ontology rebuild was required.
- The active defect was singular whole-evidence arbitration: multiple independently authored capability matches were reduced to one global `multiple_candidates` result. Implementation `f53e5c0` (`refactor(career): support plural canonical capability proposals`) introduces versioned canonical plural inference contract `2.0.0` under the existing inference owner.
- Authored candidates are grouped by canonical capability ID and arbitrated independently. Same-capability/same-relationship rules coalesce deterministically; relationship conflicts remain fail-closed for that capability; unrelated valid capabilities remain admitted.
- Proposal identity retains evidence ID, capability ID, relationship, mapping-policy version, and registry version. Source revision, deterministic capability ordering, bounded matching-rule provenance, and trust neutrality are retained. Unsupported residue is represented only for the bounded no-rule case.
- The v1 singular inference and `mapProvisionalResumeEvidence` remain explicit compatibility surfaces. The browser-local text build now consumes a pure plural-to-existing-mapping-result projection; the unchanged materializer successfully produced three capability nodes sharing one evidence ID.
- No canonical capability, role profile, signal token/rule, mapping rule, parser, persisted state/storage schema, materializer implementation, UI, Role Lens, Job Copilot/server, API/Supabase/package, review, or supplementation change occurred. Mode returned to `HOLD`.
- Focused plural inference, compatibility, and downstream projection tests, all 40 Career Possibility test files, exact-file ESLint, TypeScript, production build, and `git diff --check` passed.
- Single next action: Hold after plural canonical inference. Audit and refine the four broad deferred evidence signals into existing universal capability building blocks before admitting any new mapping.

### Deferred founder capability mappings governed (`CAREERTWIN_DEFERRED_FOUNDER_CAPABILITY_MAPPINGS_GOVERNED`)

- The founder confirmed the shared Career Map skeleton is correctly connected to real CV data; its sparsity is caused by bounded semantic mappings rather than rendering.
- Implementation `3bb9fd2` (`feat(career): govern deferred founder capability mappings`) admits one exact Group B rule: `designed_measurement_framework -> measurement-design -> direct_evidence`. Mapping policy is now `provisional-resume-mapping-policy/1.2.0` with ten authored rules; signal policy remains `provisional-evidence-signal-policy/1.2.0` with 45 rules.
- Governance decisions are explicit: measurement-framework design is directly admitted; analytics business advice, analytics product ownership, and investigative analysis require future canonical capability expansion; broad analytics workflow enablement requires token refinement before any mapping.
- Unsafe adjacency remains prohibited: measurement is not Research Design; advice is not Insight Synthesis or Strategic Analysis; analytics-product ownership is not Product Insights or Business Ownership; investigation is not Strategic Analysis; broad workflow enablement is not Tooling Enablement or Process Improvement.
- Privacy-safe replay of the currently displayed founder CV remained at 33 evidence, 8 structured signals, 2 admitted mappings, and two capabilities (`analytics-governance`, `insight-synthesis`) because it contained no measurement-design token. Its advice/product/workflow signals remain unsupported with zero unresolved mappings. No richer-map claim or browser node check was made.
- The second accepted founder replay remains the prior aggregate baseline of 33 evidence, 6 structured signals, 3 admitted mappings, three capabilities (`insight-synthesis`, `people-leadership`, `strategic-analysis`), 3 unsupported, and 0 unresolved; its deferred investigation/workflow evidence is unaffected by this rule. The exact historical source fixture was not re-identified during closure, so this result remains accepted prior replay evidence rather than a fresh file replay.
- No canonical capability, signal token, signal rule, inference-owner, parser, state/storage, materializer, skeleton/UI, API/Supabase/package, Job Copilot/server, unmapped-evidence UI, review, or supplementation change occurred. Mode returned to `HOLD`.
- Focused governance/mapping coverage, all 38 Career Possibility test files, exact-file ESLint, TypeScript, production build, and `git diff --check` passed.
- Single next action: Hold after deferred mapping governance. Founder re-uploads both CVs and validates the richer personal Career Map before any canonical capability expansion, unmapped-experience visibility, or review workflow is admitted.

### Personal state connected to the Career Map skeleton (`CAREERTWIN_PERSONAL_STATE_CONNECTED_TO_CAREER_MAP_SKELETON`)

- The founder confirmed the original `CapabilityExplorer` skeleton is the intended personal result product. The later flat personal capability-card result was an integration detour rather than a second authoritative Career Map.
- Integration is complete at `e6bb584` (`feat(career): connect personal state to career map skeleton`). A shared `CareerMapExplorerViewModel` contract now supports separately sourced example and personal modes.
- The disclosed root Hero continues to supply `mockCareerPossibility`; the personal route supplies a deterministic derived view model from the existing validated `PersonalCareerMapPresentation`. Personal mode never imports or falls back to mock capability, evidence, growth, path, identity, strength, or fit data.
- Personal nodes preserve canonical capability identity, label, family, evidence identity, direct/transferable relationship, source span, and reviewed/provisional status. The adapter creates no capability, evidence, path, or growth item.
- The shared skeleton renders the personal Experience Core, deterministic connectors, capability nodes, supporting-example counts, and interaction-triggered evidence detail. Two-node layouts flank the core; 4/6/8+ layouts use deterministic radial placement; mobile retains a compact Experience Core and accessible disclosure interpretation.
- Missing Future Paths and Proof-to-build data collapse truthfully. Unmapped evidence remains absent because the current personal presentation does not expose it; no storage or schema expansion was made.
- Role Lens remains reachable as the existing governed peer-tab comparison. Same-map highlighting is not claimed: it requires a future admitted comparison-to-map adapter and is outside this slice.
- Persistent-Chrome validation passed the founder's real two-capability state and a restored-after-use privacy-safe four-capability state across the required desktop, tablet, and mobile sizes without overlap, overflow, mock leakage, console errors, or React warnings. The full Career Possibility suite, exact-file ESLint, TypeScript, production build, and `git diff --check` passed.
- No state, storage, inference, mapping, parser, root upload, API, Supabase, package, Job Copilot, server inference, deferred mapping, review, or supplementation behavior changed. Mode returned to `HOLD`.
- Single next action: Hold after personal-skeleton integration. Founder validates that uploaded CV capabilities and evidence now appear in the intended Career Map before any deferred mappings, unmapped-experience visibility, or review workflow is admitted.

### Post-upload Career Map simplification (`CAREERTWIN_POST_UPLOAD_CAREER_MAP_SIMPLIFIED`)

- The bounded presentation repair is complete at `2b94fa6` (`fix(career): simplify post-upload career map`). Mode returned to `HOLD`.
- The loaded personal result now leads with one `Your Career Map` heading, one concise reviewed/provisional provenance line, compact peer `Career Map` and `Role Lens` tabs, and immediately visible capability summaries.
- Capability cards initially expose only family, name, and supporting-example count. Optional disclosure preserves the existing evidence text, direct/transferable relationship, reviewed/provisional trust status, and source span; opening moves focus to the detail heading and closing returns focus to the originating card.
- Repeated management, explorer, and per-card trust framing is removed from the default scan. Upload another CV and Clear Career Map remain available under secondary `Map options`; the existing destructive confirmation is unchanged and the replacement warning is no longer permanently displayed.
- The existing Role Lens and downstream comparison/proof surfaces are unchanged and mount only when their peer view is selected. Empty, incompatible, invalid, and storage-unavailable states are unchanged.
- No ingestion, extraction, evidence, identity, revision, adapter, inference, mapping, materialization, storage, persistence, package, API, Supabase, Job Copilot, review, or supplementation authority changed.
- Persistent-Chrome validation passed capability disclosure/focus return, keyboard tab selection/focus, Role Lens switching, and layouts at 1440x900, 1280x800, 1024x768, 768x1024, 390x844, and 375x667 without horizontal overflow. Focused coverage, all 37 Career Possibility test files, exact-file ESLint, TypeScript, production build, and `git diff --check` passed.
- Single next action: Hold after post-upload simplification. Founder validates the clean Career Map and optional capability-detail interaction before any deferred mapping or review workflow is admitted.

Status
- authority
- accepted current-system truth surface
- read after `docs/control/current-active-brief.md` for substantial work

Default Read
- yes

When To Read
- after the startup brief on substantial audit / repair / architecture / policy work
- before any major accepted-truth update is treated as closed

Do Not Use For
- current next-action routing
- long historical replay
- full line-plan replacement
- full runbook execution detail

Document role
This file is the authoritative accepted current-system memory/control snapshot.
It records the system truths future work should assume by default.
It does not replace:
- `docs/control/current-active-brief.md` for startup routing
- `docs/control/em-operating-system.md` for execution procedure
- `docs/control/policy-registry.md` for policy lookup and precedence
- active line plans for line-local operational detail
- verify strategy docs for verification-level selection

Use with:
- `AGENTS.md`
- `docs/control/em-operating-system.md`
- `docs/control/policy-registry.md`
- active line plan(s)

Last updated: 2026-08-12

---

## 1. Current architecture truth

### Truth layer
- Career Memory / Evidence is the truth layer.
- CV is a bootstrap evidence source, not the truth layer.

### Terminology boundary
- Keep three buckets distinct:
  1. truth layer
  2. tailored CV consumer path (evidence-to-tailored-CV output path)
  3. implementation surface
- `resume-*` naming is implementation-local only and must not redefine architecture.

### Job Copilot layer ownership (current control model)
- Layer 1: LLM-led role reading plus thin-guard contract control.
- Layer 2: authoritative contract transport.
- Layer 3: proof and output grounding.
- Layer 4: consumer rendering and presentation.

### Downstream-consumption boundary
- Downstream consumer surfaces must consume the authoritative contract.
- Do not hide matcher/selection logic in UI or adapter wording layers.

### Product framing
- Job Copilot should operate as a buy-side decision system, not a generic relevance-summary generator.

### Career Map / Job Copilot product boundary
- Career Map is candidate-first and generic. It owns the role-independent candidate capability profile, stable generic role archetypes, and general career-path guidance.
- Job Copilot is live-JD first and company-specific. It owns requirement-weighted Match V2 analysis and job-specific gaps, positioning, and recommendations.
- Match V2, live-JD parsing, and company-specific scoring must not move into Career Map.

### Browser-local CV extraction (`CAREERTWIN_LOCAL_CV_EXTRACTION_SLICE_1_COMPLETE`)

- Model A is the accepted architecture: browser-local CV parsing may later feed a provisional map with optional review, but automatic output must never be represented as reviewed.
- Slice 1 is complete at `ca573a2` (`feat(career): add browser-local CV text extraction`). Slice 2 is admitted as two bounded stages: 2A provisional mapping authority, then 2B LocalCareerMapState v2 plus provisional materialization.
- Supported local formats are PDF and DOCX with a 5 MB maximum, extension/MIME/signature validation, bounded parser errors, and deterministic minimal text normalization.
- PDF uses `pdf-parse@2.4.5` with its browser export and a same-origin bundled PDF.js worker. DOCX uses the browser-compatible `mammoth@1.11.0` ArrayBuffer path. Scanned/image-only PDFs are unsupported; OCR is not admitted.
- Raw file bytes exist only during browser extraction. Extracted full text is returned to the caller but is not persisted, logged, transmitted, summarized, or interpreted by this module.
- The boundary has no API, Supabase, authentication, telemetry, localStorage, IndexedDB, Cache Storage, or external-network dependency.
- Persistent-Chrome validation passed real bundled PDF and DOCX extraction. Observed requests were localhost-only static chunks and the same-origin PDF worker; `/api/parse-resume` and Supabase were not called, existing localStorage was unchanged, IndexedDB and Cache Storage were empty, and no runtime error occurred.
- Failure taxonomy includes unsupported or mismatched type, empty file, oversized file, password-protected PDF, scanned/no-text PDF, malformed PDF/DOCX, empty extracted text, parser unavailable, and bounded unexpected failure.
- Active mode returned to `HOLD`.
- Single next action: Hold after Slice 2A. Admit LocalCareerMapState v2 and provisional materialization as Slice 2B before any direct-build UI work.

### Provisional capability mapping (`CAREERTWIN_PROVISIONAL_MAPPING_SLICE_2A_COMPLETE`)

- Slice 2A is complete at `6066027` (`feat(career): add provisional capability mapping contract`). It adds a standalone versioned contract, authored deterministic policy, mapper, validators, and focused audit coverage.
- Policy/contract version `1.0.0` contains five bounded, non-exhaustive rules spanning four existing canonical capabilities. No capability definition, ontology, schema, UI, state, storage, package, ingestion, identity, revision, adapter, runtime, persistence, or Job Copilot architecture changed.
- Auto-admission requires exactly one exact authored match from structured action/context/outcome/ownership/scope signals. Titles and tool names are non-authoritative and do not affect mapping.
- `direct_evidence` and `transferable_signal` remain explicit distinct relationships. Multiple capability candidates or relationship conflicts abstain as `unresolved`; no authored match returns `unsupported`; invalid policy/evidence and unexpected failures remain bounded.
- Stable mapping IDs derive deterministically from evidence ID, capability ID, relationship, policy version, and capability-definition version. The boundary uses no timestamps, randomness, confidence score, LLM, embedding, network, persistence, or storage.
- The audit passed direct, transferable, ambiguous, unsupported, deterministic-repeat, title/tool-independence, invalid-input, invalid-policy, and forbidden-dependency cases; Slice 2B subsequently consumed these outputs without modifying the Slice 2A contract.
- Active mode is `HOLD`.

### Provisional local Career Map state (`CAREERTWIN_PROVISIONAL_STATE_SLICE_2B_COMPLETE`)

- Slice 2B is complete at `94d8aa1` (`feat(career): add provisional career map state`). Schema `2.0.0` is a separate validated payload with `source=provisional_resume` and `mapTrustStatus=provisional`; source and trust are not conflated.
- Schema `1.0.0` reviewed states remain strictly validated, readable, and unchanged on read. Unknown and malformed versions fail closed.
- The authoritative key remains `careertwin.local-career-map.v1`. Writers validate and serialize fully in memory, then perform exactly one `setItem`; no clear or intermediate write occurs, so failures preserve the prior payload.
- The versioned provisional materializer uses deterministic identity from source revision, extraction/policy/definition/materializer versions, and admitted mapping IDs. Initial builds are revision 1 lineage roots; replacement remains replace-only rather than supplementation.
- Only `auto_admitted` mappings materialize capabilities. Direct and transferable evidence references remain separate; reviewed and provisional counts remain separate; unresolved and unsupported evidence remains addressable but inactive.
- Minimal file metadata and structured bounded evidence are persisted. Raw file bytes, full résumé text, parser internals, scores, proficiency, fit, and reviewed lineage are not persisted or invented.
- Pure presentation and Role Lens contracts normalize both schemas, expose provisional trust and unresolved counts, and define missing as `Not evidenced in your current CV-derived map.` The only proof action remains `find_existing_proof` with explicit uncertainty.
- Focused Slice 2B tests, all 31 Career Possibility tests, exact-file ESLint, TypeScript, production build, and diff checks passed. No UI, route, package, network, Supabase, extraction, mapping-policy, supplementation, or Job Copilot change was introduced.
- Slice 3 remains unopened and mode is `HOLD`.

### Deterministic evidence-signal bridge (`CAREERTWIN_EVIDENCE_SIGNAL_BRIDGE_COMPLETE`)

- The initial Slice 3 admission correctly stopped at `BOUNDARY_FAILURE`: the source-preserving text extractor emitted no Slice 2A semantic tokens, and adding interpretation inside root orchestration would have violated ownership boundaries.
- The bridge is complete at `ec94772` (`feat(career): add deterministic evidence signal bridge`). It owns only `source-preserving evidence -> deterministic semantic signals` and directly produces the existing Slice 2A input shape.
- Contract/policy version `1.0.0` contains nine bounded tokens and ten authored lexical rules. Coverage is explicitly non-exhaustive; it is not a general NLP, fuzzy, embedding, or capability-classification system.
- Evidence identity, structural locator, minimal excerpt, and `unreviewed` status are preserved. Deterministic signal identity uses evidence ID, locator, policy version, matched rule IDs, and emitted field/token pairs without timestamps.
- Explicit research design and research support remain distinct; insight synthesis requires explicit decision language for its outcome; cross-functional coordination preserves explicit ownership and scope; process redesign excludes hypothetical language.
- Competing per-field signals and ownership/participation conflicts return unresolved. No authored rule returns unsupported. Neither outcome creates capability or mapping truth.
- Focused integration proves direct Slice 2A admission for the five covered paths and downstream exclusion for ambiguous/unsupported fixtures. All 32 Career Possibility tests, exact-file ESLint, TypeScript, production build, and diff checks passed.
- No existing extractor, Slice 2A, Slice 2B, UI, route, state, storage, package, API, Supabase, Job Copilot, or supplementation file changed.
- Slice 3 remained unopened pending the pure full-chain orchestration audit.

### Provisional text-build orchestration (`CAREERTWIN_PROVISIONAL_BUILD_ORCHESTRATION_COMPLETE`)

- The pure orchestrator is complete at `0968e70` (`feat(career): compose provisional career map build`). It composes the existing text extractor, evidence-signal bridge, Slice 2A mapper, and Slice 2B materializer without adding lexical rules, tokens, matching rules, guessing, scoring, or review promotion.
- Input is extracted text, minimal source metadata, caller-supplied accepted source revision and opaque extraction identities, canonical version context, definitions, and caller-supplied non-semantic timestamps. It accepts no File and performs no PDF/DOCX parsing.
- Every extracted evidence item is classified exactly once. Structured evidence enters Slice 2A unchanged; bridge ambiguity becomes inactive unresolved evidence; bridge unsupported evidence becomes inactive `no_canonical_rule` evidence. No fallback mapping occurs.
- The nine-fixture audit passed direct, mixed, transferable, admitted-plus-unsupported, admitted-plus-ambiguous, all-unsupported, all-ambiguous, title-only, and tool-only paths. `unexpectedly lost evidence = 0`.
- Successful output is deterministic validated LocalCareerMapState schema `2.0.0` with `source=provisional_resume`, `mapTrustStatus=provisional`, unreviewed evidence/mappings, intact identities and cross-references, and no confidence or fit score.
- All 33 Career Possibility tests, exact-file ESLint, TypeScript, production build, and diff checks passed. Storage, UI, routes, packages, APIs, Supabase, Job Copilot, and supplementation remain untouched.
- This orchestration milestone supplied the admission basis later consumed by the completed Slice 3 implementation.

### Direct Upload CV build (`CAREERTWIN_DIRECT_UPLOAD_BUILD_SLICE_3_COMPLETE`)

- Slice 3 is complete at `ed1ac57` (`feat(career): add direct CV to career map flow`). The root is now the simplified product entry: concise positioning, a contained hero variant of the existing interactive example, and one immediate PDF/DOCX upload action.
- The file-to-state owner composes browser-local extraction, accepted source revision preparation, and the completed text-to-provisional-state owner. It adds no semantic rules and performs no storage, network, or UI work.
- The upload workspace exposes only `Reading your CV...` and `Building your Career Map...`, then performs one validated atomic write to `careertwin.local-career-map.v1` and navigates directly to `/career-map`.
- Valid v2 state renders as CV-derived and unreviewed while preserving personal capabilities/evidence, calibrated Role Lens comparison, and bounded Proof to build / Start here / Next action. Valid v1 reviewed state remains supported.
- Persistent-CDP acceptance passed valid synthetic PDF and DOCX, unsupported/malformed/no-mapping/storage failures with prior-state preservation, replacement without append semantics, responsive root/result layouts, no external CV transmission, and no service-worker or Cache Storage activity.
- Slice 4 review controls, missing-experience interactions, and supplementation remain unopened. Mode is `HOLD`.
- Single next action: Hold after Slice 3 and continue founder validation before admitting optional review or missing-experience interactions.

### Real CV ingestion diagnostic (`CAREERTWIN_REAL_CV_INGESTION_DIAGNOSTIC_COMPLETE`)

- Founder validation reported `no_unambiguous_mappings`; the privacy-safe diagnostic owner is complete at `dd2b973` (`test(career): add resume ingestion coverage diagnostics`). It returns aggregate counts and reason codes only—never full text, source excerpts, binary data, or personal identifiers.
- Synthetic PDF/DOCX extraction is distinguishable from downstream coverage failure. The dominant first drift is the bounded signal policy: all 33 audited common résumé verbs produced valid located evidence but remained unsupported outside exact authored phrases.
- Founder-domain coverage is similarly narrow: exact cross-functional delivery is admitted, while ordinary analytics strategy, commercial support, stakeholder influence, self-service analytics, governance, measurement, experimentation, marketing analytics, reporting governance, process transformation, adoption analysis, and customer-insight wording remains largely unsupported.
- Secondary structure limitations are measured but not admitted into the next repair: wrapped bullets split into an extra evidence record, two-column order is degraded but recoverable in the synthetic trace, and repeated page furniture can create one false evidence record.
- No production runtime behavior, UI, parser, signal/mapping policy, capability library, materializer, storage, API, Supabase, package, Slice 4, or supplementation surface changed. Mode is `HOLD`.
- Single next action: Admit one bounded `EVIDENCE_SIGNAL_COVERAGE_EXPANSION` for ordinary résumé action and founder-domain language; do not combine it with structure, mapping, capability-library, parser, or UI repair.

### Evidence signal coverage expansion (`CAREERTWIN_EVIDENCE_SIGNAL_COVERAGE_EXPANDED`)

- The bounded signal-policy expansion is complete at `3ad8e39` (`feat(career): expand resume evidence signal coverage`). Policy version is `provisional-evidence-signal-policy/1.1.0`; the rule set expands from 10 to 20 while retaining the same nine-token vocabulary and the same seven Slice 2A-consumable tokens.
- Context-rich research/measurement design, evidence-to-recommendation synthesis, commercial decision support, explicit cross-functional scope/coordination/ownership, and named reporting/measurement/governance/workflow/operating-model improvements now produce bounded existing signals.
- Precision guards remain active: dashboard/tool/title/skills fragments, generic analysis, generic revenue/growth claims, requirement language, and non-performed actions do not materialize mapped actions. Participation and coordination do not become ownership; ambiguity still abstains.
- The context-rich founder-domain replay improves from 1/6 structured/admitted statements to 6/6 across the four existing mapped capability areas. Generic `verb + analytics strategy` constructions intentionally remain unsupported.
- Mapping policy, capability library, materializer, state/storage, parser/structure, UI, API, Supabase, packages, Slice 4, and supplementation remain unchanged. Secondary wrapped-bullet, page-furniture, and two-column limitations remain unopened. Mode is `HOLD`.
- Single next action: Hold after signal coverage expansion. Re-run founder CV validation before admitting mapping coverage or résumé structure repair.

### Founder CV signal coverage repair (`CAREERTWIN_FOUNDER_CV_SIGNAL_COVERAGE_REPAIRED`)

- The privacy-safe two-file trace established the pre-repair boundary at evidence-to-signal: Founder CV A produced 2/33 structured evidence and Founder CV B produced 0/33, with zero admitted mappings and no unexpected evidence loss.
- The bounded repair is implemented at `6de92f4` (`feat(career): expand founder cv signal coverage`). Signal policy version is `provisional-evidence-signal-policy/1.2.0`; vocabulary expands from 9 to 18 tokens and the authored rule set from 20 to 45.
- New bounded semantic areas are strategic analysis, executive insight synthesis, analytics governance, measurement-framework design, analytics business advice, analytics product ownership, people leadership, investigative analysis, and analytics workflow enablement.
- Privacy-safe post-repair production replay produced 8/33 structured evidence for Founder CV A and 6/31 for Founder CV B. The current PDF replay yielded 31 evidence records rather than the earlier audit's 33; parser and structure owners were unchanged, so this denominator difference remains a measurement limitation rather than an admitted parser repair.
- Every new semantic token is intentionally unmapped pending mapping governance. The unchanged mapper admitted 0 founder-CV mappings, returned bounded unsupported for all 14 structured records, and created no capability claim; one incompatible Founder CV A signal combination remained unresolved rather than guessed.
- Evidence identity, source provenance, `unreviewed` status, deterministic signal identity, and inactive unsupported/unresolved retention remain authoritative. Duplicate rules emitting the same field/token are deterministically collapsed to one signal value while retaining authored rule provenance.
- Existing canonical concepts verified as potentially relevant include People Leadership, Analytics Governance, Insight Synthesis, Product Insights, Business Ownership, Strategic Analysis, Tooling Enablement, and Cross-functional Delivery. No mapping or canonical-library admission has yet been made.
- Parser/structure, mapping policy, capability library, materializer, state/storage, UI, API, Supabase, packages, Slice 4, and supplementation remain unchanged. Mode returned to `HOLD`.
- Single next action: Hold after founder-CV signal repair. Audit structured signals against the existing canonical capability library before admitting mapping-policy expansion.

### Canonical personal-capability inference owner (`CAREERTWIN_CANONICAL_PERSONAL_CAPABILITY_INFERENCE_OWNER_ESTABLISHED`)

- Architecture reconciliation confirmed two active role-independent personal-capability inference authorities: legacy server `inferCapabilities` and the direct-upload provisional mapper. Option C is accepted: one canonical role-independent inference owner supplies personal capability truth, while Job Copilot remains a separate JD-conditioned retrieval/scoring owner.
- The canonical trust-neutral owner is established at `402f352307775dbc3e25bbd4726bc67550177b6e` (`refactor(career): establish canonical personal capability inference owner`). `canonical-personal-capability-inference.ts` now exclusively owns structured semantic evidence -> canonical capability proposal behavior for the direct-upload path.
- The owner accepts evidence identity, source reference/locator, explicit nullable source revision, normalized semantic signals, the existing authored policy, canonical definitions, and registry version. It emits canonical slug IDs, `direct_evidence` or `transferable_signal`, deterministic proposal identity, authored rule provenance, and admitted/unresolved/unsupported disposition.
- Trust and review fields are absent from canonical input/output. `provisional-resume-capability-mapper.ts` is retained as the compatibility wrapper and alone restores `reviewStatus=unreviewed`, `admissionStatus=auto_admitted|unresolved`, and existing public field names.
- The identity formula and legacy prefix remain unchanged, as do all five authored mapping rules, four capability targets, rule IDs/versions, explanations, conflict handling, fail-closed behavior, ordering, and downstream materializer/orchestration behavior.
- The legacy server inference owner remains active but unchanged as a compatibility path. No server or Job Copilot migration, evidence-store reconciliation, API/Supabase work, mapping expansion, signal expansion, capability-library change, state/storage/materializer change, parser/UI/package change, Slice 4, or supplementation work started.
- Focused canonical inference and provisional-equivalence tests, the full Career Possibility suite, exact-file ESLint, TypeScript, production build, and `git diff --check` passed. Mode returned to `HOLD`.
- Single next action: Hold after canonical inference extraction. Admit only the obvious canonical mapping group after founder-signal-to-library governance is confirmed.

### Founder-CV canonical mapping Group A (`CAREERTWIN_FOUNDER_CV_CANONICAL_MAPPING_GROUP_A_ADMITTED`)

- Group A is complete at `f24daf34696fc9dd36cc0f4e114d7112402c9301` (`feat(career): admit founder cv canonical mapping group a`). Mapping policy advances from `provisional-resume-mapping-policy/1.0.0` to `1.1.0` and contains nine authored rules total.
- Exactly four canonical direct-evidence rules were added: `performed_strategic_analysis -> strategic-analysis`, `synthesised_executive_insight -> insight-synthesis`, `established_analytics_governance -> analytics-governance`, and `led_analytics_team -> people-leadership`. All destination slugs already existed in canonical registry `1.2.0`.
- The legacy Insight rule excludes the more specific executive-synthesis token, so evidence carrying both the old `synthesised_findings + informed_decision` path and the new executive token yields one deterministic `insight-synthesis/direct_evidence` relationship. Existing conflicting-capability and conflicting-relationship cases remain fail-closed.
- Privacy-safe local replay emitted aggregate diagnostics only. CV A produced 33 evidence records, 8 structured signals, 2 Group A tokens, 2 admitted mappings, 2 unique capabilities (`analytics-governance`, `insight-synthesis`), 6 mapping-unsupported, and 0 mapping-unresolved. CV B produced 33 evidence records, 6 structured signals, 3 Group A tokens, 3 admitted mappings, 3 unique capabilities (`insight-synthesis`, `people-leadership`, `strategic-analysis`), 3 mapping-unsupported, and 0 mapping-unresolved. Both materialized successfully and avoided `no_unambiguous_mappings`.
- Deferred tokens `designed_measurement_framework`, `provided_analytics_business_advice`, `owned_analytics_product`, `performed_investigative_analysis`, and `enabled_analytics_workflow` remain inactive as `unsupported/no_canonical_rule`; semantic-collapse guards prevent them from entering adjacent canonical concepts.
- Signal policy, canonical library, parser/structure, inference owner, provisional wrapper, materializer, state/storage, UI, Job Copilot, legacy server inference, API/Supabase, packages, Slice 4, and supplementation remain unchanged. Mode returned to `HOLD`.
- Focused canonical/wrapper/bridge/diagnostic tests, all 36 Career Possibility test files, exact-file ESLint, TypeScript, production build, and `git diff --check` passed.
- Single next action: Hold after Group A mapping admission. Re-run the founder upload flow in the browser before governing the deferred measurement, business-advice, product-ownership, investigative-analysis, or workflow-enablement mappings.

### Career Map V1 closure (`CAREER_MAP_V1_COMPLETE`, `CAREER_MAP_V1_LANDING_STATE_HANDOFF_REPAIRED`, `CAREERTWIN_V1_ROOT_INLINE_INTAKE_COMPLETE`, `CAREERTWIN_V1_ENTRY_RESULT_ROUTES_CORRECTED`)

Current active line and mode:
- line: `CAREER-MAP-V1-RELEASE`
- mode: `HOLD`
- task type: V1 release closure / scope freeze
- release-readiness decision: `V1_RELEASE_READY_WITH_KNOWN_LIMITATIONS`
- final verified implementation baseline: `73a976bd67d1360814f893533e5f3812b84473c6`
- corrected two-page contract after the prior route misunderstanding: `/` is the formal proposition + supported résumé-entry route; `/career-map` is the personal result route and never a marketing/example landing
- root fresh state displays `Your career, replicated.`, the real plain-text input, and `Build my Career Map`; extraction/review can continue in the workspace, but no Career Map result renders underneath the root form
- fresh `/career-map` displays a compact `No personal Career Map has been created yet.` state with one direct action back to `/`
- the active Career Map route no longer imports, supplies, or renders the example `CapabilityExplorer`, mock capability network, example signals, or mock-ranked Future Paths when personal state is absent
- loaded `/career-map` remains personal-only and preserves reviewed capabilities/evidence, Role Lens, requirement comparison, Proof to build, Start here, Next action, navigation, reload, and replace/clear behavior
- persistent-CDP acceptance captured and visually inspected three screenshots: root entry, empty Career Map, and applied personal Career Map; fresh Apply, edit/reject/restore, replacement cancel/confirm, responsive layouts, focus, console, and privacy checks passed
- entry/result correction commit: `73a976bd67d1360814f893533e5f3812b84473c6` (`fix(career): separate product entry from career map result`)
- verification: two focused tests, all 28 Career Possibility tests, exact-file ESLint, TypeScript, production build, `git diff --check`, and persistent-browser acceptance passed
- V1 remains complete and returns to HOLD; no ingestion, review, storage, persistence, CandidateBaseline, Job Copilot, package, or V2 architecture was reopened
- founder route-contract correction: CareerTwin V1 has a root inline-intake state and an applied personal Career Map state; it does not require a passive landing followed by a duplicate intake page
- authoritative root flow: `/` value proposition + supported plain-text résumé intake -> deterministic extraction -> evidence inspection -> accepted review/edit/accept/reject and mapping workspace -> authoritative Apply -> direct `/career-map` personal state
- the root entry reuses `ResumeTextIntakeWorkspace`, `ResumeEvidenceReviewWorkspace`, the accepted shared-ingestion runtime, replacement confirmation, and `careertwin.local-career-map.v1`; no duplicate extractor, review model, storage key, or Apply pipeline was added
- the obsolete root prototype link and fake PDF/DOCX picker were removed together with `Frontend prototype`, `No backend connection yet`, and `mock only`; V1 does not claim unsupported file upload
- when a personal Career Map exists, `/` retains the intake surface, exposes `View current Career Map`, and states that applying another reviewed résumé replaces current evidence
- direct navigation occurs only after the existing validated atomic storage write succeeds; cancellation, failed extraction, and failed review/Apply paths retain the prior map
- persistent-CDP founder-profile validation passed the fresh root journey, direct Apply handoff, replacement dismiss/confirm, failure preservation, keyboard focus, personal Career Map rendering, and five required viewport sizes with no overflow, console warnings/errors, API calls, Supabase, or authentication traffic
- implementation commit: `0b65bf6bee73acaefb39bdc4b7db15c37b4805af` (`fix(career): unify root intake with career map`)
- verification: focused root integration test, all 28 Career Possibility tests, exact-file ESLint, TypeScript, production build, `git diff --check`, and persistent-browser QA passed
- V1 remains complete; the existing `/career-map/resume-intake` compatibility route remains unchanged but is not an extra step in the authoritative product journey
- founder self-validation defects: the Career Map no-state view lacked the intended product proposition, used `Import résumé evidence` as its primary CTA, and could retain stale example presentation after reviewed evidence was applied
- landing/state repair root cause: the route's unconditional generic heading left the example panel as the effective landing, and `LocalCareerMapWorkspace` reconciled the authoritative browser-local state only on initial mount
- first drift point: the successful browser-local state mutation was not reconciled into an already cached or reactivated Career Map presentation
- first writable fault: the workspace's one-shot mount-only storage read
- repaired landing: `Your career, replicated.` plus concise evidence-grounded explanation and `Uncover your career map`, linked to the existing résumé intake
- explicit presentation states: no-state mode contains the secondary disclosed example; loaded mode renders reviewed personal capabilities and evidence with the calibrated Role Lens and contains no example title, no-evidence message, mock badge, example-signal label, or mock-ranked Future Paths
- personal Future Paths remain unavailable from résumé evidence alone; no ranking or personal path inference was added
- applied-state reconciliation now rereads the same authoritative state on mount, focus, pageshow, cross-document storage change, and visibility restoration; refresh, Back/Forward, clear-state restoration, malformed-state safety, and replace-only semantics passed
- corrective implementation commit: `6d64c81c22788bcd7db480c6941ca56d4984fdc5` (`fix(career): restore landing and personal state handoff`)
- verification: focused test, all 27 Career Possibility tests, exact-file ESLint, TypeScript, production build, `git diff --check`, full edited/rejected/replacement Apply flow, malformed recovery, and browser QA at 1440×900, 1280×800, 768×1024, 390×844, and 375×667 passed
- V1 remains complete after this corrective repair; no ingestion, identity, revision, adapter, runtime, persistence, CandidateBaseline, Job Copilot, or V2 scope was reopened
- release blocker count after repair and re-audit: `0`
- repaired blocker: valid reviewed field edits now receive deterministic opaque semantic payload revisions from the browser runtime and reach Apply successfully
- repair commit: `6cee2f67a07cd1a852081b8391aadd39f8bc2faf` (`fix(career): admit reviewed field edits at apply`)
- audit decision: the missing visible return path after evidence inspection was the highest-value bounded gap
- first drift point: evidence inspection completed but the lookup loop lost a visible continuation back to the Role Lens
- first writable fault: the Personal Capability Explorer had no reciprocal anchor and `#target-role-heading` was not focusable
- implementation commit: `1aacb62697ec21c295bfd3c96ad20d0f4ca67652` (`feat(career): add return path to role lens`)
- implementation boundary: `components/career-possibility/PersonalCapabilityExplorer.tsx`, `components/career-possibility/TargetRoleCapabilityComparison.tsx`, and `tests/career-possibility/proof-building-action.test.ts` only

Completed proof-lookup reviewed-evidence navigation:
- A standalone deterministic proof-building-action authority consumes only the existing selected comparison's `nextProofToBuild` projection.
- `find_existing_proof` is the only admitted available category; `no_action_available` is the explicit abstention result and renders no user-facing shell.
- Valid input preserves the originating capability ID, label, importance, exact expected evidence, fixed-copy source/version, and authority provenance.
- Fixed platform copy version `1.0.0` says: `Look through your past work for an example that demonstrates this proof.`
- The uncertainty boundary says: `Career Map does not know whether that experience exists.` No claim is made that experience exists or is absent.
- Available proof-lookup actions render exactly one neutral native anchor, `Review evidence already in your Career Map`, targeting the existing Personal Capability Explorer heading at `#personal-explorer-heading`; unavailable actions render no link.
- The target ID is unique and its semantic heading uses `tabIndex={-1}` for native fragment focus placement without entering the positive tab order.
- The reviewed-evidence surface provides exactly one neutral `Continue to Role Lens` anchor to `#target-role-heading`; the existing Role Lens heading is a unique `tabIndex={-1}` target.
- Reciprocal native navigation preserves selected-role state, comparison output, Start here, and evidence disclosure state without custom scrolling, state lifting, network requests, or persistence changes.
- Browser QA confirmed Enter activation, viewport movement, focus placement, browser Back with selected-role preservation, evidence disclosure operation, role switching, and the no-action state.
- No evidence relevance or matching claim, auto-selection, filtering, sorting, highlighting, or auto-expansion was introduced; navigation produces no API, persistence, storage, or telemetry behavior.
- No `strengthen_existing_proof`, `build_new_proof`, or `capture_future_proof` action, generated coaching, evidence-quality inference, or project, course, certification, networking, employer, or timeline advice was introduced.
- Proof-building semantic authority, `nextProofToBuild`, comparison classification, selected-role mandate, `Start here`, per-card `Proof to build`, requirement order, and evidence disclosures remain unchanged.
- The focused proof-building-action test, all 27 Career Possibility tests, targeted ESLint, TypeScript, production build, and `git diff --check` passed.
- TypeScript and the production build ran sequentially to avoid the known `.next/types` race.
- Browser QA passed the full synthetic resume flow, all four calibrated role switches, and the no-eligible-action abstention state at 1440x900, 768x1024, and 390x844, with no stale/duplicate action, overflow, clipping, React/hydration/console warnings, or API, Supabase, authentication, telemetry, or persistence requests.
- No CandidateBaseline, ingestion, identity, revision, adapter, runtime, persistence, server, generic-path, or Job Copilot architecture was reopened.

V1 frozen product boundary:
- one browser-local reviewed résumé/source import
- explicit replace-only re-import
- page-memory-only active intake and review session
- reviewed capability and evidence exploration
- four calibrated generic Role Lenses with mandate, deterministic comparison outcomes, authored Proof to build, prioritised Start here, bounded find-existing-proof guidance, and reciprocal evidence navigation
- no incremental supplementation, multiple sources, cross-device sync, server persistence, role ranking, evidence-quality diagnosis, progress tracking, or generated coaching

Release verification:
- all 27 Career Possibility tests passed
- tracked Career Map ESLint, TypeScript, production build, and `git diff --check` passed sequentially
- full synthetic intake/review/edit/reject/replace/Apply flow and malformed-state recovery passed
- browser QA passed at 1440×900, 1280×800, 768×1024, 390×844, and 375×667 with no overflow, clipping, console, hydration, network, authentication, Supabase, telemetry, or unexpected persistence regression

V2 boundary retained:
- incremental supplementation remains a separately admitted Model A architecture sequence: lineage-ready import, independent new-source review, then atomic cumulative merge
- this sequence is not part of V1 and must not start without explicit founder scope reopening

Single next action:
- Hold after signal coverage expansion. Re-run founder CV validation before admitting mapping coverage or résumé structure repair.

Completed selected-role mandate orientation:
- Selecting a calibrated Role Lens displays one restrained orientation block before comparison output.
- The block consumes the selected profile's existing canonical title and exact authored description, which is projected from the admitted archetype mandate.
- Analytics Manager, Customer Insights Lead, Marketing Analytics Lead, and Data Product Manager were all verified; switching roles updates both title and mandate without stale or duplicate content.
- No generated role summary, day-to-day responsibility, ownership inference, certification, fit, readiness, suitability, or exhaustive-coverage claim was introduced.
- Outcome summary, requirement order, evidence disclosures, `Proof to build`, and `Start here` remain unchanged.
- The focused archetype test, all 26 Career Possibility tests, targeted ESLint, TypeScript, production build, and `git diff --check` passed.
- Browser QA passed the full synthetic resume intake flow at 1440x900, 768x1024, and 390x844, with correct orientation for all four roles, no overflow or clipping, no React/hydration/console warnings, and no API, Supabase, authentication, telemetry, or persistence requests.
- No role definition, profile projection, comparison contract, ingestion, identity, revision, adapter, runtime, persistence, server, generic-path, or Job Copilot architecture was reopened.

Completed calibrated Role Lens catalog gate:
- The active Career Map route consumes `representativeGenericRoleProfiles` directly as its user-facing Role Lens catalog.
- Exactly four calibrated generic role lenses are exposed in deterministic order: Analytics Manager, Customer Insights Lead, Marketing Analytics Lead, and Data Product Manager.
- The combined 22-profile development collection and all 18 development seed profiles remain intact for development and test consumers; the active route no longer presents those seeds as equivalent product choices.
- No runtime filtering or `sourceNotes` parsing determines catalog admission.
- Selector copy describes the lenses as currently available directional generic archetypes and explicitly avoids exhaustive-coverage or external-certification claims.
- Target-role comparison outcomes, requirement order, `Proof to build`, and `Start here` behavior remain unchanged.
- No score, fit, suitability, readiness, recommendation, live-JD, or Match V2 concept was introduced.
- The focused archetype test, all 26 Career Possibility tests, targeted ESLint, TypeScript, production build, and `git diff --check` passed.
- Browser QA passed the full synthetic resume intake flow and all four retained-role selections at 1440x900, 768x1024, and 390x844 with no overflow, clipping, React/hydration/console warnings, or API, Supabase, authentication, telemetry, or persistence requests.
- No completed ingestion, identity, revision, adapter, runtime, persistence, server, generic-path, or Job Copilot architecture was reopened.

Completed prioritised next-proof guidance:
- The personal target-role comparison owns an optional authoritative `nextProofToBuild` projection.
- Eligible candidates are limited to `evidence_not_yet_shown` requirements with nonblank authored `expectedEvidence`; direct, transferable, governance-deferred, and governance-excluded requirements cannot be selected.
- Selection priority is `must` -> `should` -> `differentiator`; existing requirement order is the only same-importance tie-breaker.
- The Career Map Role Lens renders at most one restrained `Start here` block above the unchanged complete requirement list.
- The block carries the canonical capability label, a bounded importance-based reason, and exact existing authored proof guidance.
- Blank or absent guidance is skipped; when no eligible candidate exists, no empty block or fabricated fallback appears.
- No score, fit, suitability, readiness, generated coaching, role ranking, or new inference was introduced.
- Requirement output, order, outcome classification, existing evidence disclosures, and per-card `Proof to build` guidance remain unchanged.
- All 26 Career Possibility tests, targeted ESLint, TypeScript, production build, and `git diff --check` passed.
- Browser QA passed the synthetic résumé intake -> extraction -> evidence review -> canonical mapping -> Apply to Career Map -> target-role selection flow.
- Browser QA passed at 1440×900, 768×1024, and 390×844, including role switching and no-eligible-candidate behavior, with no overflow, clipping, React/hydration/console warnings, or API, Supabase, authentication, or telemetry requests.
- No completed ingestion, identity, revision, adapter, runtime, persistence, server, generic-path, or Job Copilot architecture was reopened.

Completed Proof to build guidance:
- The personal target-role comparison now transports the generic role profile's exact authored `expectedEvidence` only when the outcome is `evidence_not_yet_shown` and the guidance is non-empty.
- The Career Map Role Lens renders that transported text as a bounded `Proof to build` block nested within the applicable requirement.
- No guidance is generated or inferred from capability labels; absent authored guidance produces no block.
- Directly demonstrated, transferable, governance-deferred, and governance-excluded results retain their prior classification and presentation behavior.
- Requirement ordering, role ranking, capability strength, and evidence classification are unchanged; no score, suitability verdict, live-JD input, or Match V2 dependency was introduced.
- All 26 Career Possibility tests, targeted ESLint, TypeScript, production build, and `git diff --check` passed.
- Browser QA passed the synthetic résumé intake → extraction → evidence review → Apply to Career Map → target-role selection flow.
- Browser QA also passed at 1440×900, 768×1024, and 390×844 with no horizontal overflow, clipping, React/hydration/console warnings, or API, Supabase, or authentication requests.
- No ingestion, identity, revision, adapter, runtime, persistence, server, or Job Copilot architecture was reopened.

Completed foundations:
- `CandidateBaseline` is the shared, role-independent candidate-side capability kernel.
- Generic Role Archetypes are stable generic target-role definitions; they do not import live-JD or Match V2 semantics.
- `GenericCareerPathAlignment` and `PersonalGenericPathPresentation` consume the shared candidate and generic-role foundations.
- The evidence-universe reconciliation contract and `SharedCareerIngestionBundle` authority boundary are implemented.
- Employment-linked résumé evidence extraction, source revision, source identity manifest, stable review decision/proposal/mapping identities, and history-aware review revision are implemented.
- `SharedCareerIngestionBundle` schema `1.1.0` review fidelity, the browser résumé shared-ingestion adapter, and browser shared-ingestion runtime wiring are implemented, admitted, committed, and pushed.

Authoritative ingestion chain:
```text
canonical résumé source
→ buildCareerSourceRevision()
→ résumé extraction
→ buildCareerSourceIdentityManifest()
→ buildCareerReviewDecisionIdentityContract()
→ buildCareerReviewRevision()
→ buildSharedCareerIngestionBundleFromResumeReview()
→ buildSharedCareerIngestionBundle()
→ SharedCareerIngestionBundle 1.1.0
```

Browser runtime chain:
```text
résumé paste
→ extraction
→ evidence review
→ applyToCareerMap()
→ buildBrowserResumeSharedIngestionRuntime()
→ buildSharedCareerIngestionBundleFromResumeReview()
→ admitted SharedCareerIngestionBundle 1.1.0
→ component-local ready / failed state
```

Identity and revision separation:
- Keep `sourceRevision`, `extractionRevision`, source identity manifest revision, `bundleId`, subject identity, review decision identities, `reviewRevision`, and `materializationRevision` distinct.
- Anonymous subject identity must not derive from résumé content.
- Bundle identity must not derive from review/intake session IDs.
- Local browser IDs must be translated before authoritative admission.

Privacy boundary:
- Raw résumé text, raw edits, and rationale do not enter the authoritative shared bundle.
- Browser shared-ingestion state remains component-local and memory-only.

Browser adapter and runtime admission:
- The browser adapter truthfully translates reviewed browser evidence into the authoritative shared-ingestion contract.
- Runtime wiring reaches the adapter from the existing review completion action and exposes bounded component-local ready/failed state.
- No API, Supabase, authentication, persistence, or server materialization surface was introduced.

Accepted browser QA:
- `/career-map/resume-intake` extracted one employment and two evidence records.
- The no-edit flow, explicit canonical mapping, and Apply to Career Map flow succeeded.
- `Career evidence bundle ready` appeared through `role="status"` with bounded employment/evidence counts.
- Desktop, tablet, and mobile layouts had no overflow or clipping.
- No React, hydration, or console errors occurred; no API, Supabase, auth, or materialization request was introduced.
- Start over and refresh behaved as expected.

Completed evidence-field transition repair:
- Commit `b9746c9d5ddecdc105cdc4cb6c37bba511ba4b29` (`fix(career): allow valid evidence field edits`) is accepted.
- Absent evidence fields have effective initial status `unreviewed`; valid populated-field and absent optional-field first edits are admitted.
- Confirm → edit passes; edit → edit passes only with latest prior-decision linkage.
- Reject → edit remains blocked until restore; reject → restore → edit passes.
- Stale, unknown, and cross-target prior protections remain intact, as do unsupported-field and parent-rejection protections.
- Browser edit/save no longer fails with active `stale_review_status`; Apply reaches the shared-ingestion runtime.
- A missing semantic edit revision surfaces as `missing_semantic_payload_revision`; failed state remains inline and retryable, and review state remains intact.
- The successful no-edit flow still produces `Career evidence bundle ready`.
- All 26 Career Possibility tests, targeted ESLint, TypeScript, and production build passed.
- Browser QA passed at 1440×900, 768×1024, and 390×844 with no console errors and no API, Supabase, or authentication requests.
- No adapter/runtime architecture, identity/revision contract, or shared-bundle contract changed.
- The prior evidence-field review replay/status-validation defect is closed; this line has no remaining active defect.

Single main next action:
- Hold after managed-requirements evidence repair. Govern whether `managed_requirements` can map to an existing canonical building block before adding infinitive `manage`.


Explicit non-reopen boundaries:
- Do not reopen the source revision producer, source identity manifest, review decision identity contract, review revision producer, `SharedCareerIngestionBundle` contract, browser shared-ingestion adapter, or browser shared-ingestion runtime architecture.
- Do not expand this line into `CandidateBaseline` materialization, persistence/local-storage redesign, server materialization, Supabase, authentication, multi-document support, anonymous-subject persistence, automatic semantic edit hashing, Job Copilot, Career Map visual redesign, Impeccable work, or package manifests.

Accepted non-blocking limitations:
- Bundle and anonymous subject identities remain memory-only across reload.
- Semantic edit payload revisions remain caller supplied.
- Multi-document ingestion is not supported.
- No persistence or server materialization exists.
- Anonymous-subject persistence is not implemented.
- These limitations are not mandatory next work.

---

## 2. EM / harness operating truth

- EM is the default governance path for substantial audit, repair admission, repair validation, and line judgment work.
- Covered scopes should use real subagent dispatch by default.
- Direct execution on covered scope requires explicit bypass reason (`out_of_scope`, `no_matching_subagent`, or `policy_permitted_direct`).
- HOLD is repair-block only; when the next step is executable audit work, continuation remains allowed.
- Post-block continuation rule: if repair is blocked, continue executable higher-order family-judgment/audit work by default instead of stopping.
- Use founder-boundary discipline:
  - local-loop autonomy for line-local policy-authorized continuation
  - explicit founder boundary for baseline admission, freeze-ready, and cross-line scope resets
- Root-cause-first discipline is mandatory:
  - identify first drift point
  - identify first writable fault
  - do not jump to implementation before writable-fault stability

---

## 3. Job Copilot North Star truth

The shared buy-side thesis must stay coherent across:
- Career Verdict
- Why You
- Biggest Risk
- Quick Checks
- CTA

Operating quality rules:
- confidence discipline: confidence posture must match evidence strength
- primary buy-point priority: primary buy-point stays first; secondary points stay secondary
- claim-strength calibration: no over-claim from weak or bridge evidence
- cross-surface consistency: one thesis chain across all surfaces
- fit honesty: do not over-claim fit

Locked synthesis invariant:
- user-facing section synthesis is case-local + family-safe
- no phrase may appear unless supported by current-case source signals
- applies to Career Verdict, For you, Why You thesis, Biggest Risk, Quick Checks, CTA, and What This Role Adds
- this does not hard-lock the full evidence pool by role family; evidence may remain broad
- if family-safety fails, drop the phrase or use a neutral case-local fallback

---

## 4. Job Copilot rubric status

- Buy-side Decision North Star policy is landed.
- Job Copilot Buy-side North Star Rubric is landed (audit output schema).
- For future substantial Job Copilot audits/reviews touching decision-quality surfaces, use this rubric by default under EM/harness constraints.
- Rubric usage does not bypass repair gates, stop conditions, or founder-boundary rules.

---

## 5. Current accepted line truths

### P0-027 accepted truth
Source of truth: `docs/lines/cv/line-plan.md` (latest loop entry and branch structure).

- `QUEUE-P0-027` is split into Branch A and Branch B.
- Branch B is tracked as contrast residual only.
- Branch A is active and upstream in stage1 selected-evidence suppression.
- Branch A moved into the Job Copilot selector path in `selectEvidenceForScenario`.
- Branch A is split into A1 and A2.
- A2 remains parked/tracked.
- A1 is split into:
  - A1a: selection-limit accounting path
  - A1b: manual quick-check alignment guard path
- Repair remains blocked pending stable single micro-fault owner.

### Quick Checks accepted regroup truth
Latest accepted Quick Checks regroup outcome:
- Unified Quick Checks contract line is closed as `split-defects`.
- Evidence at unified-line level remains split:
  - `4/8` unresolved buy-point / risk linkage no-prompt failures
  - `4/8` generic materialized prompt failures
  - `0/8` meaningful answer impact
- No single repair owner is admissible at unified Quick Checks contract-line level.

Current line structure:
- Unified line parked: yes
- Child lines opened:
  - `JOB-COPILOT-NS-QUICK-CHECKS-LINKAGE`
  - `JOB-COPILOT-NS-QUICK-CHECKS-GENERIC`

Current child-line state:
- `JOB-COPILOT-NS-QUICK-CHECKS-LINKAGE`
  - now parked after bounded line-value judgment
  - reason: stable suppression-family owner, but submode-level owner remains fragmented/unproven
  - repair remains blocked; no singleton has sufficient leverage to keep active
- `JOB-COPILOT-NS-QUICK-CHECKS-GENERIC`
  - admitted bounded repair for first writable fault `pair_call_contract_information_loss` is landed and accepted
  - bounded validation confirms payload carry-through improvement and removal of template-scaffold over-reuse as dominant owner family
  - no regressions detected; local daily verify passed
  - residual limitation remains: answers still do not materially update decision surfaces
  - `JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-ANSWER-LINKAGE` stability tracing is now classified as low-leverage for further narrowing
    - owner-case single-path stability sample (`job-03`) showed no stable downstream field changes (`score_delta_nonzero=0/5`, `band_changed=0/5`, `cta_changed=0/5`)
  - residual is promoted to downstream child line `JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE` as the active line (`AUDIT`)
  - current first drift for this downstream residual: `stage_downstream_decision_update_surface_unstable`
  - repair remains blocked pending first writable micro-surface isolation (current candidate surface `job-copilot-service.ts:4486-4847`)
- `QC-A`
  - parked as fragmented residuals with low expected repair leverage
- `QC-B`
  - closed locally as keep-with-known-limitation

Current operating interpretation:
- Do not reopen the unified Quick Checks contract line as if it were a single repair surface.
- Treat Quick Checks as split child lines unless later evidence proves a unified stable owner.
- When reopening Quick Checks work, prefer the explicit child-line framing over residual prompt-only framing.

### Why You evidence-card specificity closure truth (2026-04-20)
Accepted scope closure:
- Why You evidence specificity line is closed as `KEEP` for current scope.
- Remaining work is optional low-priority formatting polish only (headline compression/length), not structural owner reopening.

Kept repair stack:
1. Dominant-context guard comparison-space repair:
   - requirement/cluster bridge first, axis bridge second, raw token fallback
   - false-zero dominant coverage issue removed
2. Authoritative Why You card transport/consumption:
   - backend emits `diagnostics.selection_debug.authoritative_selection.why_you_cards[]`
   - renderer consumes authoritative cards when present, with legacy fallback only when absent
3. Authoritative card copy quality repair:
   - evidence-text-first headline/proof phrasing
   - taxonomy/debug token sanitization
   - semantic headline dedupe

Current guardrail truth:
- Why You cards are authoritative selected-evidence cards.
- Required path: `selected evidence -> authoritative why_you_cards -> renderer consumer-only`.
- Do not let renderer reselect, relabel, or concept-extract Why You cards when authoritative cards exist.
- Do not reopen dominant-context guard owner, contract architecture, or renderer derivation without a new regression artifact.

### Avetta Why You / overlay closure truth (2026-05-12)
- Avetta line is closed as `PASS / HOLD`; no new repair admission.
- Closure artifact: `artifacts/job-copilot-post-repair-avetta-slot-level-qa-confirmation.2026-05-12T15-06-43-628Z.json`.
- Current Avetta overlay hash: `81e74e92dafeaae200bb883d`.
- Current Avetta requirement order: reporting -> analytics strategy -> team leadership.
- Slot0 reporting target remains intentionally omitted for `no_qualified_proof_for_mapped_target` with no-proof routing to Biggest Risk / Quick Checks / Role Adds.
- Secondary-card omitted-requirement claim guard is active; reporting overclaim remains blocked.
- Root-cause chain fixed/guarded in order:
  1. Layer 1 overlay freeze/reuse
  2. candidate replacement workflow
  3. KEEP-gate quality threshold
  4. KEEP-gate root-issue positive path
  5. failure-feedback candidate generation
  6. apply-KEEP candidate pinning
  7. Layer 3 omitted-requirement secondary-card claim guard
- Non-goals preserved: no Avetta hardcode, no forced slot0 fill, no renderer masking, no CV patch, no candidate-evidence use in Layer 1 ordering/replacement decisions.
- Operating posture: monitor-only; reopen only on repeated broad-slot0 regression or omitted-requirement overclaim recurrence.

### Tailored CV flow closure truth (2026-05-15)
- Tailored CV + Quick Check proof-confirmation closure is accepted as `PASS / HOLD`.
- Closure artifact: `artifacts/job-copilot-tailored-cv-download-final-browser-confirmation.2026-05-15T00-41-51-752Z.json`.
- Confirmed role identifiers:
  - `job_snapshot_id=17097`
  - `interaction_id=856`
  - `job_id=bbd933e6-018e-4ca6-92eb-92ea22e67d58`
  - `job_match_id=null`
- Closed lines:
  1. Quick Check fallback no-op render
  2. CTA low-priority/deprioritize misclassification
  3. Quick Check save current-role proof confirmation
  4. Tailored CV contract/hash transport
  5. no-proof diagnostics transport
  6. final `/download-resume` click path
- Final runtime confirmation:
  - READY TO APPLY path reached
  - background received `SIDEPANEL_DOWNLOAD_RESUME`
  - download service executed
  - `/api/job-copilot/extension/download-resume` returned `200` (`ok=true`, `applied_recorded=true`)
  - CV file produced (`state=complete`, `mime=text/plain`)
  - no new fail-close reason
  - `missing_no_proof_slot_diagnostics` no longer present
- Remaining non-blocking issue (separate line):
  - `/resume-outcome` telemetry `500` due missing `public.resume_copilot_outcome_events` table
- Recommended follow-on line:
  - `resume_outcome_telemetry_fail_open_repair` (alternative: broader post-closure smoke)

---

### N2D Series Closure (First Broad Role Tranche)
- N2D series closure
- eight approved role IDs/titles/domains: `product-operations-manager` (product), `customer-experience-manager` (customer), `account-manager` (commercial), `business-development-manager` (commercial), `service-delivery-manager` (operations), `finance-business-partner` (finance), `fpa-manager` (finance), `engineering-manager` (engineering)
- exact section mappings: preserved in N2D.1 and N2D.2 artifacts
- 5/6-variable requirement counts: 5, 5, 5, 6, 6, 5, 6, 6 respectively
- removed weak mappings: `operating-rhythm` (Product Ops), `variance-analysis` (CX, AM), `commercial-leadership` (FBP)
- Engineering Manager technical identity correction: `architecture-governance` is IDENTITY, `cross-functional-delivery` is CORE
- 44/44 mapping evidence
- no new-tranche semantic duplication
- Jaccard diagnostic-only rule
- existing Analytics Manager ? Marketing Analytics Lead flagged only as deferred role-granularity review candidate
- no current-role modification
- N1 unchanged
- current registry count 12
- schema 1.0.0 unchanged
- contentVersion expected 1.1.0
- no ontology changes required.


### N2E Implementation Closure (First Broad Role Tranche Implementation)
- N2E is CLOSED / IMPLEMENTED
- 8 new generic roles added to registry (Product Operations Manager, Customer Experience Manager, Account Manager, Business Development Manager, Service Delivery Manager, Finance Business Partner, FP&A Manager, Engineering Manager)
- Registry count is now 12
- Schema version remains 1.0.0
- Content version updated to 1.1.0
- No ontology changes made

## 6. Stable working rules

- Do not jump to fixes before root cause is identified.
- Do not reopen parked lines casually.
- Do not let implementation naming redefine architecture.
- Use proportional verification.
- Prefer outcome-led, harness-constrained work.

---

## 7. Memory-sync enforcement rules

- This file is the default current-truth sync surface for major accepted design and operating-state updates.
- Major-change trigger (memory sync required): any accepted change to:
  - architecture truth
  - layer owner or authoritative-contract truth
  - active line structure (split / merge / park / reopen / new active branch)
  - North Star, rubric, or quality-direction truth
  - EM / harness / subagent / continuation policy
  - terminology boundary
  - freeze, baseline, or phase-close truth
  - any accepted new current truth future work should assume by default
- Pre-work gate: before substantial audit / repair / architecture / policy work, check whether this file is current; if stale, update it first or in the same patch.
- Loop-closure rule: if major system truth changed but this file was not updated, treat the loop as not fully closed.
- Accountability field rule for major judgments:
  - `memory_sync_required: yes|no`
  - `memory_sync_targets: [ ... ]`

---

## 8. Startup boundary reminder

Startup entrypoint:
- `docs/control/current-active-brief.md`

For substantial work, read this file after the startup brief to recover accepted system truth.

Recommended startup sequence:
1. `docs/control/current-active-brief.md`
2. `docs/control/current-system-memory.md`
3. targeted `docs/control/em-operating-system.md` sections only if required by task type
4. targeted `docs/control/policy-registry.md` entries only if required by task type or policy conflict
5. latest active line-plan entry only for the active line

Do not treat this file as the current next-action router.
Use it to recover accepted architecture, governance, North Star, and line-truth state.
