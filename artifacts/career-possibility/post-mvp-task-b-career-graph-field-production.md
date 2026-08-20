# NON_CANONICAL — POST-MVP TASK B

## CAREER GRAPH FIELD PRODUCTION IMPLEMENTATION

This is a privacy-safe validation artifact. It is not a semantic, architecture, or control authority.

### Engine and dependency

- Selected engine: `react-force-graph-2d@1.29.1`
- Direct `d3-force` dependency: not added
- Package boundary: one exact top-level dependency plus its required lockfile transitives; no unrelated top-level movement

### Production architecture

`CareerMapGraphProjection` → presentation-only `CareerGraphVisualAdapter` → `CareerMapNeuralGraph` public owner → client-only `CareerMapForceGraph` engine boundary → CareerTwin DOM detail layer.

The semantic projection, canonical ontology, role ranking, provider/API, and materializer were not changed. The helper exists only because the selected engine accesses `window` and therefore must be isolated from Next.js prerendering.

### Adapter contract

- Deterministic node and link IDs
- Literal canonical capability identity preserved
- One visual evidence node per atomic evidence ID
- Shared evidence may connect to multiple personal capabilities
- Missing canonical requirements deduplicated as presentation-only role-only capability nodes
- Role-only nodes remain non-owned and have no personal evidence
- Upstream `proximityRank` preserved without reranking
- No confidence, score, or new semantic inference
- Raw evidence text omitted from Canvas labels and the engine model

### Exact-state replay

- Input SHA256: `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`
- Provider calls: 0
- CV uploads: 0
- Structured inference: 0

Production nodes: YOU 1; FAMILY 7; CAPABILITY 11; EVIDENCE 13; ROLE 4; ROLE_ONLY_CAPABILITY 9; total 45.

Production links: USER_FAMILY 7; FAMILY_CAPABILITY 11; CAPABILITY_EVIDENCE 23; ROLE_OWNED_CAPABILITY 14; ROLE_ONLY_CAPABILITY 12; total 67.

The production topology matches B0 exactly. Duplicate evidence visual nodes: 0.

### Force and visual model

- Stable identity-derived initial placement
- YOU fixed at the origin
- Families biased around YOU
- Capabilities biased around their authoritative family
- Evidence rendered as small satellites
- Roles biased toward the outer field while shared capabilities bridge inward
- Role-only capabilities rendered as hollow, dashed-edge gaps
- Native engine charge, link, cooldown, pan, zoom, drag, hover, click, and viewport transforms
- Sparse default labels; capability labels progressively disclosed; evidence labels absent
- Compact Canvas suppresses family labels to avoid clipping while the accessible navigator retains every family

### Interaction and detail

- Family, capability, role, and evidence selection: PASS
- Semantic neighborhood focus/dimming: PASS
- Pan, zoom, drag, reset/fit: PASS
- Capability evidence detail: PASS
- Role owned-versus-beyond detail: PASS
- Family detail: PASS
- DOM accessible navigator and DOM selection detail: PASS

### Screenshots

- `post-mvp-task-b-career-graph-field/after/desktop-1440x1000.png` — `6EF7BF099E0C25E2135661BDAA440C25B0438D8FEA0BC11B42DA6CCDE0A41AB1`
- `post-mvp-task-b-career-graph-field/after/desktop-1280x800.png` — `58AA07A48C1E81646FE492FEBE092A0BA6DF64DDCFC3C0F435B18DC7DCCCD398`
- `post-mvp-task-b-career-graph-field/after/mobile-390x844.png` — `31AA81AF079517CEAF7B202F74A0EB97203B7083D13D51C26F861C23913F730D`

### Product and visual judgment

- Founder five-second result: A — career universe / knowledge graph
- YOU centrality: STRONG
- Family clustering: ACCEPTABLE
- Capability-family affinity: ACCEPTABLE
- Evidence satellites: STRONG
- Role peripherality: ACCEPTABLE
- Shared capability bridging: ACCEPTABLE
- Role-only clustering: ACCEPTABLE
- Hairball classification: READABLE_GRAPH_FIELD
- 1440 × 1000: PASS
- 1280 × 800: PASS
- 390 × 844: PASS with tailored compact label policy
- Product judgment: CAREER_GRAPH_FIELD_PRODUCTION_READY

### Performance

- Exact graph first useful Canvas paint: 742–801 ms across required viewports
- Exact graph settle after Canvas availability: 883–1,224 ms
- Persistent uncontrolled jitter: no; simulation cools down and reports settled
- Anonymous 500-node engine smoke: PASS; 500 nodes / 522 links; first paint 8.4 ms; settled 1,535.4 ms; zoom remained responsive; no browser errors

### Verification

- Focused adapter and renderer tests: PASS
- Existing graph projection and ranked projection tests: PASS
- Existing role-alignment and role-comparison tests: PASS
- Existing unified-surface tests: PASS
- Existing evidence presentation tests: PASS
- TypeScript: PASS
- Targeted ESLint: PASS
- Impeccable detector: PASS with zero findings
- Production build: PASS
- Privacy logging audit: PASS
- `git diff --check`: PASS

### Deviations and remaining issues

- Direct `d3-force` was not added because native engine force hooks were sufficient.
- A small client-only presentation helper was required to prevent browser-only engine evaluation during server prerender.
- No material defects remain. Compact Canvas intentionally reduces family label density; all nodes and details remain reachable in the DOM navigator.
