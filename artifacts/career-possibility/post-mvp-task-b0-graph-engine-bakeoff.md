# CareerTwin Post-MVP Task B0 — Graph Presentation Engine Bake-Off

**NON_CANONICAL**  
**POST-MVP TASK B0**  
**GRAPH PRESENTATION ENGINE BAKE-OFF**

## Decision

`REACT_FORCE_GRAPH_SELECTED`

`react-force-graph-2d` fits CareerTwin better because it produced the stronger organic, You-centred career-universe experience while exposing the semantic force, label, Canvas drawing, and interaction controls CareerTwin needs with materially less integration machinery.

This is a spike decision only. It does not admit or implement production Task B.

## Founder visual goal and current presentation problem

The target first impression is “This is my career capability universe”: an organic, multi-scale graph field with clear hubs, restrained labels, evidence texture, role bridges, zoom, pan, hover, selection, and drag. The accepted current renderer preserves the correct meaning but presents that meaning through large cards, manually controlled radial geometry, and diagram-like connections.

Observed in this bake-off:

- Prototype A reads as an organic knowledge graph with You as the unmistakable anchor, family clusters close to the centre, evidence as texture, and roles occupying outer territory.
- Prototype B is a real graph renderer and is materially faster at layout, but the constrained ForceAtlas2 result retains long straight role spans, weaker centre hierarchy, and more mobile label congestion. Its five-second impression remains a diagram.

## Architecture and privacy boundary

CareerTwin remained the sole semantic owner. The engines owned only rendering, physics/layout, camera movement, drag, hover, selection, emphasis, and label visibility.

- Production state, projection, renderer, route, tests, packages, control docs, and architecture docs changed: **0**.
- Input classification: `RAW_PERSONAL_CAREER_MAP_STATE`.
- Input SHA-256: `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`.
- Existing validator result: `STATE_ADMISSIBLE`, schema `2.0.0`.
- Privacy-safe state aggregates: 13 evidence records, 11 personal capabilities, 23 mappings, 23 direct, 0 transferable, 0 duplicate mapping pairs, 0 capabilities without evidence.
- Raw evidence text in neutral model, logs, markdown, or labels: **NO**.
- Provider calls: **0**. CV uploads: **0**.

## Neutral spike graph model

The two prototypes consumed byte-identical copies of one temporary presentation model derived through the accepted validation → personal presentation → generic-role alignment → graph projection chain.

- Classification: `NON_CANONICAL_SPIKE_ONLY_PRESENTATION_DATA`.
- Neutral-model SHA-256: `44256BA08C3C425CF1A2790605D9B03A48DAF513256B6F1B074939459FF3D660`.
- Evidence identities were replaced by deterministic anonymous IDs; evidence text was omitted.
- Shared personal/role requirements link to the one owned canonical capability node.
- A role-only canonical capability is represented once as non-owned and may be required by more than one role.

| Node type | Count |
|---|---:|
| YOU | 1 |
| FAMILY | 7 |
| CAPABILITY | 11 |
| EVIDENCE | 13 |
| ROLE | 4 |
| ROLE_ONLY_CAPABILITY | 9 |
| **Total** | **45** |

| Edge type | Count |
|---|---:|
| user_has_family | 7 |
| family_contains_capability | 11 |
| capability_supported_by_evidence | 23 |
| role_requires_owned_capability | 14 |
| role_requires_role_only_capability | 12 |
| **Total** | **67** |

The four roles contributed 26 requirement relationships. Nine role-only capability nodes serve 12 role-only relationships without being promoted to personal ownership.

## Prototype A — react-force-graph-2d

### Approach

- React-owned `ForceGraph2D` Canvas surface.
- D3 charge/link/x/y forces with You fixed at the origin, semantic seed positions, family/capability attraction, tight evidence link distance, and roles biased outward.
- Custom Canvas circles, hollow role-only nodes, sparse zoom-aware labels, and per-frame neighborhood dimming.
- Pan, zoom, hover, click/select, node drag/fix, semantic neighborhood expansion, and reset/fit-to-view.
- Family expands through owned capabilities to evidence; capability expands through family to You and required roles; role expands through shared owned capabilities and role-only requirements back toward the personal path.

### Exact dependency versions

- `react-force-graph-2d` 1.29.1
- `d3-force` 3.0.0
- `react` / `react-dom` 19.2.8
- Vite 8.2.1 (external spike tooling)

Production bundle measurement: 398.40 kB JavaScript / 125.17 kB gzip. External prototype runtime tree: 44 package paths including the prototype root.

### Interaction result

PASS. Canvas runtime showed no page/console errors and made no non-local browser requests. You, family, capability, and role targets were exercised; neighborhood state updated in approximately 8.4 ms on the recorded real-state run. Wheel zoom changed scale from 1.056 to 1.716. Pan and reset were visibly smooth; drag is supported and pins the moved node.

### Directional performance

| Input | Nodes / edges | First paint | Layout stabilization | JS heap observed | Result |
|---|---:|---:|---:|---:|---|
| Real | 45 / 67 | 14.2 ms | 1,513.3 ms | 7.32 MB | Smooth; strongest final composition |
| Synthetic | 100 / 122 | 7.7 ms | 1,506.1 ms | 7.39 MB | Smooth |
| Synthetic | 500 / 522 | 10.3 ms | 1,515.8 ms | 11.99 MB | Responsive; active simulation CPU becomes visible |
| Synthetic | 1,000 / 1,022 | 20.4 ms | 993.8 ms | 36.40 MB | Usable after settle; clearest headroom warning |

The 1,000-node run used a smaller tick budget, so its shorter stabilization time is not a claim of better convergence. The directional concern is per-frame Canvas/simulation CPU and growing heap while physics is active, not the settled interaction state.

### Founder visual result

**A — “This feels like a career universe / knowledge graph.”** It does not degrade into a hairball at the real graph size.

### Major risks

- Canvas and continuous simulation require explicit cooldown and performance budgets as the graph grows.
- Library-owned mutable node/link objects need isolation behind a visual adapter.
- Deterministic screenshot tests need a seeded start and an explicit “settled” gate.
- Canvas nodes need a deliberate accessibility/detail-layer companion because the graph itself is not semantic DOM.
- Repository is active and unarchived but has a comparatively large open-issue backlog.

## Prototype B — Sigma.js + Graphology + ForceAtlas2

### Approach

- React-owned lifecycle around a Graphology graph and Sigma WebGL renderer.
- Synchronous Graphology ForceAtlas2 pass followed by semantic position bias: You fixed to centre, families pulled inward, roles biased outward, evidence retained as satellites.
- Sigma node/edge reducers for neighborhood dimming and sparse labels.
- Pan, zoom, hover, click/select, node drag, semantic neighborhood expansion, and reset camera.
- The current `@react-sigma/core` compatibility package was installed and inspected; the prototype used direct Sigma instance ownership to expose the layout and renderer lifecycle under test.

### Exact dependency versions

- `sigma` 3.0.3
- `graphology` 0.26.0
- `graphology-layout-forceatlas2` 0.10.1
- `@react-sigma/core` 5.0.6
- `react` / `react-dom` 19.2.8
- Vite 8.2.1 (external spike tooling)

Production bundle measurement: 377.43 kB JavaScript / 104.09 kB gzip. External prototype runtime tree: 11 package paths including the prototype root.

### Interaction result

PASS. WebGL runtime showed no page/console errors and made no non-local browser requests. You, family, capability, and role neighborhood paths were exercised; recorded selection response was approximately 2.6 ms. Wheel zoom changed camera ratio from 0.232 to 0.124. Pan/zoom remained smooth through 1,000 nodes; drag is supported by translating pointer coordinates through the Sigma camera.

One development-only lifecycle issue was observed and resolved: React Strict Mode's double effect setup/cleanup invalidated Sigma's first renderer programs. Removing Strict Mode from the disposable Vite surface produced a clean runtime. Production adoption would need an idempotent wrapper/lifecycle test rather than relying on that spike simplification.

### Directional performance

| Input | Nodes / edges | First paint | ForceAtlas2 pass | JS heap observed | Result |
|---|---:|---:|---:|---:|---|
| Real | 45 / 67 | 52.0 ms | 9.2 ms | 10.19 MB | Fast and smooth; weaker composition |
| Synthetic | 100 / 122 | 44.7 ms | 12.0 ms | 6.86 MB | Smooth |
| Synthetic | 500 / 522 | 198.0 ms | 161.3 ms | 7.37 MB | Smooth after a visible synchronous layout block |
| Synthetic | 1,000 / 1,022 | 168.0 ms | 126.4 ms | 8.02 MB | Strong rendering headroom; synchronous layout block remains |

The 500/1,000-node passes used reduced iteration budgets. WebGL retained much better heap/rendering headroom than Canvas, but synchronous ForceAtlas2 becomes a main-thread concern; production would need a worker or controlled background layout.

### Founder visual result

**B — “This still feels like a diagram.”** Mobile approaches C because long role spans and labels clip or collide, but the graph remains structurally understandable.

### Major risks

- ForceAtlas2 clustering and CareerTwin's semantic radial tendencies pull in different directions; post-layout constraints readily produce long straight spans.
- Advanced node treatments such as hollow/bordered nodes require custom WebGL node programs rather than a simple Canvas callback.
- Label management is less flexible and mobile collisions were materially worse in this spike.
- Renderer, Graphology, layout, and React lifecycle are separate integration surfaces.
- Sigma 4 is in beta while the tested stable line is 3.0.3, creating likely future migration work.

## Comparative score matrix

Scores are 1–5, where 5 is best for CareerTwin. “Implementation complexity” scores simplicity, not amount of machinery.

| Criterion | react-force-graph-2d | Sigma / Graphology |
|---|---:|---:|
| Organic graph feel | 5 | 3 |
| Cluster readability | 4 | 3 |
| You as anchor | 5 | 3 |
| Family → capability readability | 4 | 3 |
| Evidence satellite readability | 4 | 3 |
| Role cluster readability | 4 | 3 |
| Shared capability bridging | 4 | 3 |
| Role-only gap readability | 4 | 3 |
| Pan / zoom experience | 5 | 5 |
| Hover / selection experience | 5 | 4 |
| Label management | 4 | 3 |
| Visual customisation | 5 | 3 |
| React integration | 5 | 3 |
| Semantic constraint control | 5 | 3 |
| Performance headroom | 4 | 5 |
| Implementation complexity | 4 | 2 |
| Maintainability | 4 | 3 |
| **Total / 85** | **75** | **55** |

Winner by dimension:

- React integration: `react-force-graph-2d`
- Graph visual quality: `react-force-graph-2d`
- Semantic constraint control: `react-force-graph-2d`
- Performance headroom: `Sigma / Graphology`
- Maintainability for the CareerTwin use case: `react-force-graph-2d`

## Engineering-cost matrix

| Area | react-force-graph-2d | Sigma / Graphology |
|---|---|---|
| Production integration | MEDIUM | HIGH |
| Custom force / layout work | MEDIUM | HIGH |
| Custom node drawing | LOW | HIGH |
| Interaction state | LOW | MEDIUM |
| Responsive behavior | MEDIUM | MEDIUM |
| Testing | MEDIUM | HIGH |
| Long-term maintenance | MEDIUM | HIGH |
| **Overall** | **MEDIUM** | **HIGH** |

## License and project health

Metadata was checked on 2026-08-16 against current npm metadata and official repositories.

| Candidate | License | Maintenance signal | React path | Major footprint |
|---|---|---|---|---|
| react-force-graph-2d 1.29.1 | MIT | [Repository](https://github.com/vasturiano/react-force-graph) unarchived; 665 commits; last push 2026-02-04; repository activity updated 2026-08-14; current npm version 1.29.1 | First-party React binding over Canvas `force-graph` / D3 force | `force-graph`, `react-kapsule`, D3 force/render utilities; larger runtime tree |
| Sigma 3.0.3 + Graphology 0.26.0 | MIT throughout | [Sigma](https://github.com/jacomyal/sigma.js) pushed 2026-08-14 and published [4.0.0-beta.2](https://github.com/jacomyal/sigma.js/releases/tag/sigma%404.0.0-beta.2); [Graphology](https://github.com/graphology/graphology) pushed 2026-07-21; [`@react-sigma/core` 5.0.6](https://github.com/sim51/react-sigma/releases/tag/v5.0.6) published 2025-12-04 | Direct React lifecycle or `@react-sigma/core` 5.0.6, whose peer range supports React 18/19 and Sigma 3 | Sigma WebGL + Graphology + [ForceAtlas2](https://graphology.github.io/standard-library/layout-forceatlas2.html) + optional React wrapper; smaller runtime tree |

No material licensing risk was identified. Both paths are MIT. Sigma shows the strongest current core activity; react-force-graph shows adequate maintenance but a larger issue backlog. Project activity does not overturn the product-fit result.

## Screenshot index and hashes

| Engine | Viewport | Path | SHA-256 |
|---|---|---|---|
| Force graph | 1440×1000 | `artifacts/career-possibility/post-mvp-task-b0-graph-engine-bakeoff/force-graph/desktop-1440x1000.png` | `027662A7EA6ED0372FC28284E3B3D70CC830A9A4B8C8B38A30F71F10E1F05539` |
| Force graph | 1280×800 | `artifacts/career-possibility/post-mvp-task-b0-graph-engine-bakeoff/force-graph/desktop-1280x800.png` | `481018374115C65FFCFB5F4D3CB2C43F9B7C00D0A9EBBD414D6B1C9284629567` |
| Force graph | 390×844 | `artifacts/career-possibility/post-mvp-task-b0-graph-engine-bakeoff/force-graph/mobile-390x844.png` | `48463CB78AD60A95A94FF198F8F9F8B7C1B4FE27CF247DB00A07F74132978A8E` |
| Sigma | 1440×1000 | `artifacts/career-possibility/post-mvp-task-b0-graph-engine-bakeoff/sigma/desktop-1440x1000.png` | `21D3836E3A77C79CA7E021E1D486015D4EB4A0D2B4F4923CCB765772036AD43B` |
| Sigma | 1280×800 | `artifacts/career-possibility/post-mvp-task-b0-graph-engine-bakeoff/sigma/desktop-1280x800.png` | `F6E732729DED43810641A220A0EBD40440D88DF6D7844C67C18D54B22AE04E28` |
| Sigma | 390×844 | `artifacts/career-possibility/post-mvp-task-b0-graph-engine-bakeoff/sigma/mobile-390x844.png` | `3F4F9173737374CDC37881B7512853C9D93D9D9119002045DE9C7CA59ED75840` |

## Architecture integration recommendation

Choose option **B**: introduce a thin `CareerGraphVisualAdapter` between the existing projection and the third-party renderer.

```text
existing semantic state
→ existing graph projection
→ thin CareerGraphVisualAdapter
→ react-force-graph-2d
→ CareerTwin interaction/detail layer
```

The adapter should translate display types, anonymous evidence presentation, engine-safe node/link copies, force hints, default label rules, and semantic neighborhood sets. It must not infer capabilities, rank roles, change ownership, or create a second ontology.

- Semantic graph projection change required: **NO**.
- Architecture risk classification: **NONE from the selected path**; risk appears only if engine-friendly fields are allowed to become semantic owners.
- Current `CareerMapNeuralGraph.tsx` disposition: `REPLACE_RENDERING_INTERNALS_KEEP_PUBLIC_OWNER`.

## Recommendation and smallest future Task B boundary

Winner: `react-force-graph-2d`.  
Runner-up: `Sigma.js + Graphology + ForceAtlas2`.

If Founder/EM separately admits Task B, keep its first boundary to:

1. Add a presentation-only `CareerGraphVisualAdapter` beneath the existing accepted graph projection.
2. Replace `CareerMapNeuralGraph` rendering internals with `react-force-graph-2d` while keeping its public ownership boundary.
3. Port the proven node visual contract, semantic neighborhood behavior, camera/reset behavior, and anonymous evidence dots.
4. Add deterministic seeded-layout, settled-state, interaction, accessibility/detail-layer, and 390/1280/1440 viewport coverage.
5. Enforce real-state and 1,000-node performance budgets without changing semantic projection or personal state.

What remains unproven: production accessibility, SSR/dynamic-import behavior in the current Next.js route, durable layout persistence, test determinism across browsers, and performance above approximately 1,000 nodes. These belong to an admitted Task B, not this spike.

Exact next task recommendation: `POST-MVP TASK B — CAREER GRAPH FIELD IMPLEMENTATION ADMISSION`.

Exact next action: Founder/EM reviews this B0 artifact and screenshots and either admits or rejects the bounded Task B above; do not begin production implementation automatically.

## Verification notes

- Both external prototypes: production build PASS, lint PASS.
- Runtime: Chrome 151.0.7922.109, no page/console errors in final capture, no external browser requests.
- Impeccable deterministic detector: PASS, 0 findings across both external JSX/CSS implementations.
- Measurements: local, warm-browser, directional engineering evidence—not a laboratory benchmark.
- External measurement file: `C:\temp\careertwin-graph-bakeoff\performance-results.json`, SHA-256 `E8A2CFFEE1A990CD41D9973D8E9470A1F896898D6210398D09228DC6B1621A31`.
