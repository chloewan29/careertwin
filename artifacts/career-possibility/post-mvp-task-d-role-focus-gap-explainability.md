# NON_CANONICAL — POST-MVP TASK D

## TOPOLOGY-AWARE ROLE FOCUS + VISUAL GAP EXPLAINABILITY

This privacy-safe artifact records implementation validation only. It is not semantic, architecture, or control authority. It contains no raw personal evidence.

## Founder problem statement

Task C placed the four future roles around the outer field largely by even index spacing. In the exact Founder state this left Customer Insights Lead on the left while the capabilities explaining it were concentrated through the right-side Customer & Market / related neighborhoods, creating a 903.5-unit cross-map bridge. Selecting Data Product Manager dimmed unrelated context but still made the role panel do the interpretive work; the graph did not label and structurally distinguish the complete owned-versus-gap requirement set in one click.

## Execution gate and ownership audit

- Task type / MODE / decision label during implementation: bounded Career Map presentation repair / `REPAIR`.
- Failing layer: presentation (Layer 4 equivalent). The semantic projection already supplied canonical role requirements, personal ownership state, role-only gaps, requirement state, and upstream rank correctly.
- First drift point: the renderer converted upstream role order into evenly spaced angular positions unrelated to connected capability topology.
- First writable fault: `seedCareerGraphNodes` in `components/career-possibility/CareerMapNeuralGraph.tsx`.
- First focus/explainability writable owner: `buildCareerGraphFocusSet` and the visual node/link contract in `lib/career-possibility/career-graph-visual-adapter.ts`.
- Out of scope: graph projection, ontology, role knowledge, role ranking, provider/API, inference, materializer, persistence, Job Copilot, route/workspace ownership, package changes, control docs.

Exact owners after repair:

| Responsibility | Owner |
| --- | --- |
| Role node visual generation | `buildCareerGraphVisualModel` in `career-graph-visual-adapter.ts` |
| Role radial target | `buildCareerGraphTopologySeeds`; `420 + proximityRank × 18 + stable presentation jitter` |
| Role angular target | `buildCareerGraphTopologySeeds`; weighted circular vector from connected capability positions, then bounded local crossing/collision adjustment |
| Role collision handling | `buildCareerGraphTopologySeeds` local angular nudge plus renderer semantic collision force |
| Role-capability edges | `buildCareerGraphVisualModel`; semantic projection edges are mapped, never hidden or re-inferred |
| Selected role state | `selectedId` + derived `selectedRoleFocus` in `CareerMapNeuralGraph` |
| Role detail panel | `SelectedNodeDetail` in `CareerMapNeuralGraph` |
| Family progressive disclosure | `buildCareerGraphFocusSet` + the existing `Browse map` disclosure |
| Capability visibility | complete visual model always enters `graphData`; focus changes emphasis, not membership |
| Evidence visibility | existing full model; evidence stays de-emphasized in Role Focus and appears on capability/evidence hover or DOM focus |
| Graph opacity/highlight | `focusSet`, Canvas `drawNode`, and link callbacks in `CareerMapNeuralGraph` |
| Node fill/outline | `drawNode` |
| Edge solid/dashed | ForceGraph `linkLineDash`, `linkColor`, and `linkWidth` callbacks |
| Role accessibility | accessible Canvas label, live Role Focus summary, and `Browse map` buttons with `data-role-focus-state` / descriptive `aria-label` |
| Force engine wrapper | `CareerMapForceGraph.tsx`, unchanged |

No required production responsibility fell outside the admitted presentation boundary.

## Exact implementation boundary

Production files modified:

- `components/career-possibility/CareerMapNeuralGraph.tsx`
- `lib/career-possibility/career-graph-visual-adapter.ts`

Focused tests modified:

- `tests/career-possibility/active-multi-role-career-map-renderer.test.ts`
- `tests/career-possibility/career-graph-visual-adapter.test.ts`
- `tests/career-possibility/career-map-neural-graph.test.ts`
- `tests/career-possibility/unified-career-map-surface.test.ts`

`CareerMapForceGraph.tsx`, projection, route/workspace, package files, control docs, and all semantic owners were unchanged.

## Real-state provenance

- Classification: exact existing Founder-exported Career Map state used for Tasks B/C.
- Input SHA-256: `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`.
- Validation: admissible schema `2.0.0`.
- Counts: 13 evidence records, 11 personal capabilities, 23 direct mappings, 0 transferable mappings, 0 duplicate pairs, 0 capabilities without evidence.
- Synthetic state used for final visual acceptance: no.
- Live provider calls: 0.
- CV uploads: 0.
- External browser requests during acceptance: 0.

## Topology metric basis

Metrics use deterministic presentation seed targets before force relaxation, in one normalized graph coordinate system. This makes before/after values reproducible while the runtime remains organic and force-responsive. `central crossing` means a role-capability segment comes within 95 graph units of YOU. Requirement importance is used only when already supplied by the projection; generic-role requirements in this real state use neutral weights. Radius continues to consume only upstream `proximityRank` plus stable presentation jitter. No role is sorted, reranked, scored, or assigned a fit label in the renderer.

## Before role topology

| Role | Rank | Role x/y / radius | Dominant → role sector | Δ | Average / longest edge | Central crossings | Classification |
| --- | ---: | --- | --- | ---: | --- | ---: | --- |
| Analytics Manager | 0 | 413.4, 114.4 / 428.9 | 38.4° → 15.5° | 23.0° | 315.8 / 568.3 | 0 | `ACCEPTABLE_LOCALITY` |
| Marketing Analytics Lead | 1 | -24.9, 448.4 / 449.1 | 56.9° → 93.2° | 36.2° | 424.1 / 704.3 | 1 | `MATERIAL_CROSS_GRAPH_BRIDGE` |
| Customer Insights Lead | 2 | -437.7, 140.3 / 459.7 | 115.6° → 162.2° | 46.6° | 408.3 / 903.5 | 0 | `MATERIALLY_DISPLACED` |
| Data Product Manager | 3 | -85.1, -478.3 / 485.8 | -105.9° → -100.1° | 5.8° | 322.1 / 759.2 | 0 | `ACCEPTABLE_LOCALITY`, but role-tethered gap positions masked topology |

Connected capability seed positions before:

- Analytics Manager: `measurement-design@(-150.6,184.0)`, `analytics-governance@(68.8,-249.7)`, `insight-synthesis@(-111.9,237.8)`, `cross-functional-delivery@(266.8,84.8)`, `strategic-analysis@(465.6,157.9)`, `benefits-realisation@(472.7,147.6)`.
- Marketing Analytics Lead: `marketing-effectiveness@(-91.6,240.7)`, `measurement-design@(-150.6,184.0)`, `audience-insight@(170.1,-215.1)`, `analytics-governance@(68.8,-249.7)`, `strategic-analysis@(465.6,157.9)`, `investment-governance@(-5.3,513.5)`.
- Customer Insights Lead: `insight-synthesis@(-111.9,237.8)`, `audience-insight@(170.1,-215.1)`, `cross-functional-delivery@(266.8,84.8)`, `research-design@(-502.8,160.2)`, `customer-segmentation@(-505.5,145.9)`, `strategic-analysis@(465.6,157.9)`, `customer-adoption@(-504.2,154.7)`.
- Data Product Manager: `cross-functional-delivery@(266.8,84.8)`, `tooling-enablement@(-193.5,-143.7)`, `analytics-governance@(68.8,-249.7)`, `product-insights@(-91.7,-546.0)`, `roadmap-governance@(-98.1,-545.1)`, `product-cadence@(-125.8,-532.8)`, `customer-adoption@(-504.2,154.7)`.

Customer Insights Lead baseline conclusion: `MATERIALLY_DISPLACED`. It occupied the left outer field due global distribution while owned Customer & Market / Operations and other explanatory capability paths extended across the map. Role-only gap nodes were also tethered to the role, artificially pulling its measured centroid left and concealing the underlying defect.

## After role topology

| Role | Rank | Role x/y / radius | Dominant → role sector | Δ | Average / longest edge | Central crossings | Classification |
| --- | ---: | --- | --- | ---: | --- | ---: | --- |
| Analytics Manager | 0 | 386.4, 186.2 / 428.9 | 25.7° → 25.7° | 0.0° | 367.4 / 539.3 | 0 | `ACCEPTABLE_LOCALITY` |
| Marketing Analytics Lead | 1 | 280.1, -351.0 / 449.1 | -51.4° → -51.4° | 0.0° | 401.4 / 698.8 | 2 | `ACCEPTABLE_LOCALITY` — requirements are genuinely distributed across opposing represented sectors |
| Customer Insights Lead | 2 | 458.6, -32.0 / 459.7 | -4.0° → -4.0° | 0.0° | 382.7 / 631.1 | 0 | `TOPOLOGY_LOCAL` |
| Data Product Manager | 3 | 95.6, -476.3 / 485.8 | -78.7° → -78.7° | 0.0° | 351.2 / 586.7 | 0 | `TOPOLOGY_LOCAL` |

Connected capability seed positions after:

- Analytics Manager: `measurement-design@(-150.6,184.0)`, `analytics-governance@(68.8,-249.7)`, `insight-synthesis@(-111.9,237.8)`, `cross-functional-delivery@(266.8,84.8)`, `strategic-analysis@(216.1,-37.2)`, `benefits-realisation@(258.3,46.8)`.
- Marketing Analytics Lead: `marketing-effectiveness@(-91.6,240.7)`, `measurement-design@(-150.6,184.0)`, `audience-insight@(170.1,-215.1)`, `analytics-governance@(68.8,-249.7)`, `strategic-analysis@(216.1,-37.2)`, `investment-governance@(17.8,-220.3)`.
- Customer Insights Lead: `insight-synthesis@(-111.9,237.8)`, `audience-insight@(170.1,-215.1)`, `cross-functional-delivery@(266.8,84.8)`, `research-design@(-112.1,203.7)`, `customer-segmentation@(130.8,-177.8)`, `strategic-analysis@(216.1,-37.2)`, `customer-adoption@(219.1,-140.4)`.
- Data Product Manager: `cross-functional-delivery@(266.8,84.8)`, `tooling-enablement@(-193.5,-143.7)`, `analytics-governance@(68.8,-249.7)`, `product-insights@(-100.4,-200.0)`, `roadmap-governance@(-28.4,-250.9)`, `product-cadence@(56.3,-230.4)`, `customer-adoption@(219.1,-140.4)`.

The pathological longest bridges materially reduced for the two Founder-priority roles: Customer Insights Lead `903.5 → 631.1` (-30.2%) and Data Product Manager `759.2 → 586.7` (-22.7%). Customer Insights Lead average edge length also reduced `408.3 → 382.7`. Data Product Manager average length rose `322.1 → 351.2` because gap nodes stopped being incorrectly tethered beside the role and moved to their canonical family sectors; its longest explanatory bridge still fell materially. Marketing Analytics Lead retains two strict central crossings because its six requirements are genuinely distributed across Analytics, Customer, Governance, and Strategy neighborhoods; no opposite-sector or global-uniformity relocation is used to disguise them.

Material cross-graph bridges caused by even role distribution remaining: none. Four-role locality result: 4/4 topology-local or acceptable; 0 opposite-sector; 0 uniformity-caused material bridges.

## Role Focus and visual explainability

One role click now derives a presentation-only `CareerGraphRoleFocusState` from existing visual links:

- selected role, YOU, every connected owned capability, every connected role-only gap, and represented relevant family anchors remain fully prominent;
- unrelated nodes/edges remain in the graph at 20% / subordinate edge emphasis;
- evidence nodes are not added to the focus set and do not auto-expand;
- role framing fits the relevant subgraph while the role remains in its outer topology sector;
- selected role uses a larger node, double halo, stronger outline, and label;
- owned capability uses a filled node, structural outer ring, strong family/personal path, and strong solid role path;
- transferable capability, when upstream state exists, stays filled and adds a dashed structural ring/role path; none exist in this real state;
- gap capability uses a hollow, thick dashed ring and dashed role-only edge, with no YOU ownership path;
- an in-graph legend states `Filled — already yours` and `Hollow — build next`;
- accessible DOM state describes selected role, owned, transferable, gap, relevant family, career context, and unrelated context without relying on color/opacity.

Gap family context is consumed read-only from the existing canonical capability/family libraries in the presentation adapter. It does not invent a taxonomy, capability, ownership edge, or evidence. Family labels also appear in the secondary role panel.

## Real-state Role Focus acceptance

### Data Product Manager

- Requirements: 7.
- Owned/shared: 3 — Cross-functional Delivery, Tooling Enablement, Analytics Governance.
- Role-only gaps: 4 — Product Insights, Roadmap Governance, Product Operating Cadence, Customer Adoption.
- Transferable: 0.
- All seven relevant capability nodes auto-exposed: pass.
- Manual family/capability clicks required before measurement: 0.
- Unrelated context retained: 32 DOM nodes.
- Evidence auto-expanded: 0.
- Focus-ready latency: 118 ms at 1440, 117 ms at 1280, 103 ms at 390.
- Founder 3-second test: `A`.

### Customer Insights Lead

- Requirements: 7.
- Owned/shared: 3 — Insight Synthesis, Audience Insight, Cross-functional Delivery.
- Role-only gaps: 4 — Research Design, Customer Segmentation, Strategic Analysis, Customer Adoption.
- Transferable: 0.
- All seven relevant capability nodes auto-exposed: pass.
- Manual family/capability clicks required before measurement: 0.
- Unrelated context retained: 33 DOM nodes.
- Evidence auto-expanded: 0.
- Focus-ready latency: 52 ms at 1440, 54 ms at 1280, 39 ms at 390.
- Topological locality: `TOPOLOGY_LOCAL`; no uniformity-caused cross-central bridge.

## Evidence preservation

Focusing any owned capability now resolves the first existing projection evidence ID and shows the same concise concrete evidence excerpt used by evidence-node hover/focus. Gap nodes cannot resolve evidence and receive none. Three Data Product Manager owned-capability focus probes passed at all viewports. Privacy-safe excerpt hashes:

- `3326BDBCA3F76F2638285896FA075FB2021E33F6EB3777830AB82F829FD7F579`
- `A696B65475E7A783910867C423F6C323B5537B056788EEBE1C8BA638F3A2A4F4`
- `DB0C730424184A25ACE43CC95938A34E84B87EC0247C2D7D31CD8948362FC419`

Raw evidence is intentionally omitted. Evidence interaction: pass. Fabricated gap evidence: 0.

## Accessibility

- Filled/hollow node structure, dashed gap/transferable edges, and selected-role halo do not rely on color alone.
- The graph application label announces role-focus meaning.
- A live region announces exact owned/gap counts and that evidence remains on demand.
- Every navigator button has a descriptive `aria-label`, `aria-pressed`, node type/ID, requirement state where applicable, and `data-role-focus-state`.
- Keyboard focus preserves Role Focus while exposing concrete evidence for owned capabilities.
- Unrelated context is described as de-emphasized rather than removed.

Accessibility result: pass.

## Panel classification

The role panel now presents role name, exact strength/gap count, `You bring`, `Build next`, and canonical family labels. The graph itself supplies the primary filled/hollow, solid/dashed, selected-role, and dimmed-context explanation. Classification: `SECONDARY_CONFIRMATION_LAYER`.

No fit percentage, readiness score, renderer-side fit score, or High/Adjacent/Stretch label exists.

## Viewport results

| Viewport | Default map | Role Focus | Owned/gap distinction | Locality / edges | Collision / overflow / evidence |
| --- | --- | --- | --- | --- | --- |
| 1440×1000 | PASS; Task C hero, YOU center, seven family clusters, four outer roles preserved | PASS for both named roles | PASS without panel via filled/hollow nodes, solid/dashed edges, selected halo, legend | PASS; Customer Insights Lead moves to right-side topology sector | No material node collision; minor local label proximity only; no overflow; evidence focus PASS |
| 1280×800 | PASS; graph remains primary and all roles reachable | PASS WITH MINOR ISSUE | PASS; structural distinctions and labels remain readable | PASS; distributed Marketing edges remain truthful | Minor Operations/capability label proximity; no node collision or overflow; evidence focus PASS |
| 390×844 | PASS WITH EXISTING MINOR DENSITY; complete constellation and all roles reachable | PASS WITH MINOR ISSUE | PASS structurally and accessibly; panel confirms exact names/counts | PASS; selected role remains outer and topology-local | Compact focus labels crowd near the center; nodes remain distinct, navigator is complete, no horizontal overflow, evidence focus PASS |

Four-role counts: projected 4, rendered 4, desktop reachable 4, mobile reachable 4, topology-local/acceptable 4, renderer reranking 0.

Node collision: pass. Label collision: minor/non-blocking on compact Role Focus. Edge readability: pass with truthful long edges retained for genuinely distributed requirements. Default Task C behavior: preserved.

## Focused and semantic tests

Focused Task D presentation suites: 4/4 pass.

- `career-graph-visual-adapter.test.ts`: topology-derived angular targets, local collision behavior, radius-only rank input, complete role focus, owned/gap separation, role-only non-ownership, retained unrelated context, and no evidence expansion.
- `career-map-neural-graph.test.ts`: topology seed consumption, one-click role-focus state, accessible gap state, complete visual-model membership, and no semantic/storage/Job Copilot owner imports.
- `active-multi-role-career-map-renderer.test.ts`: upstream four-role order/rank preservation, no even role spacing, no renderer reranking.
- `unified-career-map-surface.test.ts`: single hero surface, concrete evidence interaction, shared identity/role-only gap, no fit/readiness/High/Adjacent/Stretch UX.

Critical semantic regressions: 5/5 pass.

- Shared canonical identity: pass.
- Role-only non-ownership: pass.
- Personal evidence semantics: pass.
- Ranked generic-role projection / no renderer reranking: pass.
- Canonical family membership and multi-role graph semantics: pass.

No semantic expectation was changed. The unified presentation assertion was narrowed from banning the ordinary word `strength` to banning strength/readiness score contracts because Task D explicitly requires a plain-language strength count; score/ranking semantics remain forbidden.

## Type, lint, build, and detector

- `npx tsc --noEmit`: PASS.
- Targeted ESLint over the two production files and four focused tests: PASS.
- `npm run build`: PASS; optimized Next.js build completed and all 35 static pages generated.
- Impeccable mechanical detector over changed production UI: PASS, zero findings.
- Browser page errors: 0.
- Browser external requests: 0.
- Package file changes: none.

## Screenshots

Before:

- `before/desktop-1440x1000-default.png` — `722751E6454F2F374E410E7D8F265C9FDE30A580C1E0DD28924A5D3BA1D999C3`
- `before/desktop-1440x1000-data-product-manager.png` — `040538BF5255756A51025F9E9747E793468C702428A35D912273808E7716761D`
- `before/desktop-1440x1000-customer-insights-lead.png` — `18C852603D35C3576703C09550A1D8652DAB33FA63BACF32F60EC46F1FC3C21F`
- `before/desktop-1280x800-default.png` — `90FFD9B5B20AF617F9DCF27F23094D8D52C749019A4855492E3E0237AA9EB454`
- `before/desktop-1280x800-data-product-manager.png` — `64DCE6B098CF5FB661E95480B954E7BD96405D43FE7E0C08FAB9385DFB24B18E`
- `before/desktop-1280x800-customer-insights-lead.png` — `7912D29FDC77D657261EA376E91B14981E7EA60C22D89137C5B7B9E966B38542`
- `before/mobile-390x844-default.png` — `692ED3A589CAE6032AC0C57828C3A2927264782DA422ACD286F6E88E05E864E8`
- `before/mobile-390x844-data-product-manager.png` — `3D032CAD2943122B50003EF16330C64BD1DE26FA36C7262BE7947DD82FAEB38E`
- `before/mobile-390x844-customer-insights-lead.png` — `C8C3399D139E568EAF4C15D9BDAD50B58B6FF1DE496CC2E086A73C40645DE8BB`

After:

- `after/desktop-1440x1000-default.png` — `1D43824446EB95D6BC498941128D1D08E8D11C1AEA25C0E83305FAE8D1361814`
- `after/desktop-1440x1000-data-product-manager.png` — `CF9ED0AA258808D7D78D4CFBAC8A6CD4F2D613020FE242F9380BF3E8DFC5ABC0`
- `after/desktop-1440x1000-customer-insights-lead.png` — `5136A266A4C9AEA5A66169B584FEAB404339E2AB845690372AD7D0AE2D269222`
- `after/desktop-1280x800-default.png` — `CA1E0D78EB768B583CD4C938B831825F1595C8C9BE057FA6435C74FE021295FF`
- `after/desktop-1280x800-data-product-manager.png` — `62EFE5262D3FE2B7C2A4339ACBB121BBE3789E4AD0B671114EF4BA91A25C47A4`
- `after/desktop-1280x800-customer-insights-lead.png` — `DB9413BE21C5D21660D6D27F473F147A9280C14BBFB72DDCDE0CAE9A36AF80BE`
- `after/mobile-390x844-default.png` — `BD3CE0A5E95134ABAA07CD5FBBE78ACB95C6FCBBCCB9D077281E5DA4396B9B8D`
- `after/mobile-390x844-data-product-manager.png` — `77ACA16159E119D519F35507E9390DE119E831910647DC97886D56AD74103D44`
- `after/mobile-390x844-customer-insights-lead.png` — `54CF844A4F525195C1097B208BEDB58AC93C1AF077218BE16B1F634706DB4C24`

Screenshot directory: `artifacts/career-possibility/post-mvp-task-d-role-focus-gap-explainability/`.

## Product judgment

`TASK_D_ROLE_FOCUS_READY_WITH_MINOR_ISSUES`

Founder 3-second test: `A`.

Remaining material defect: none.

Minor non-blocking issue: the 390×844 focused graph has compact label crowding where several relevant capabilities share a tight sector. Filled/hollow structure, edge structure, legend, accessible navigator, exact counts, evidence access, and role locality remain intact. This is not a semantic, ownership, topology, one-click, or accessibility blocker.
