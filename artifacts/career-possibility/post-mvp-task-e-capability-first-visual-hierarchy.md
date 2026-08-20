# NON_CANONICAL — POST-MVP TASK E

## Capability-first visual hierarchy rebalance

This privacy-safe artifact records implementation validation only. It is not semantic, architecture, or control authority and contains no raw Founder CV or evidence.

## Control and diagnosis

- Starting branch: `master`.
- Starting HEAD and `origin/master`: `34840cc43bbe50ce6339c8641b98a2d2a9721c2b`.
- Starting index: empty.
- Intentional unrelated HOLD: present and preserved.
- MODE / task type: `IMPLEMENT / VISUAL PRODUCT REFINEMENT`.
- Failing layer: Layer 4 consumer rendering/presentation.
- First drift point: unselected Canvas styling in `CareerMapNeuralGraph.tsx`.
- First writable fault: its node, label, halo, and link presentation constants/state branches.
- Out of scope: projection, inference, canonical libraries/contracts, validation, materialization, role ordering/ranking/fit, topology, persistence, APIs, backend, packages, and control docs.

## Owner audit and exact boundary

| Responsibility | Current owner | Task E action |
| --- | --- | --- |
| Node drawing, size, fill, opacity, border, halo, labels | `components/career-possibility/CareerMapNeuralGraph.tsx` | changed |
| Default/hover/selected link alpha and width | `CareerMapNeuralGraph.tsx` | changed |
| Selected-role and hover escalation | `CareerMapNeuralGraph.tsx` | presentation values changed; state ownership preserved |
| Force engine wrapper | `components/career-possibility/CareerMapForceGraph.tsx` | unchanged |
| Projection, visual-model identity, role focus, topology seeds | `lib/career-possibility/career-graph-visual-adapter.ts` and projection owners | unchanged |

Exact implementation/test files:

- `components/career-possibility/CareerMapNeuralGraph.tsx`
- `tests/career-possibility/career-map-neural-graph.test.ts`

No semantic, data, topology, ranking, API, storage, package, or control file was changed.

## Before diagnosis and visual properties changed

Before Task E, each default future role was larger than each personal capability (`10.5` versus `6.2`), permanently haloed, always strongly labelled, and connected by role paths at `1.15` width with `0.78`/`0.68` alpha. The personal network used `0.72` width and `0.22` alpha, while capability labels required zoom above `2.15`. The first read therefore favored four saturated orange roles and their spokes.

Task E changed presentation only:

- YOU radius moved `17 → 18`, gained a subtle persistent glow, and retained its strong outer identity ring.
- Personal capability radius moved `6.2 → 8.2`; each ordinary personal capability gained a structural ring so priority does not rely on color.
- Default desktop capability labels appear at the fitted graph scale; compact layouts retain the collision-safe `2.15` zoom threshold.
- USER→FAMILY links now use `1.45` width / `0.52` alpha and FAMILY→CAPABILITY links `1.08` / `0.38` in default state.
- Default role radius moved `10.5 → 7.4`, fill is softer, the permanent default halo was removed, default labels use smaller/lighter treatment, and role links use `0.58` width with `0.20`/`0.22` alpha.
- Role hover temporarily restores a larger role node, halo, stronger label, and `1.45`/`1.30` link widths.
- Role selection restores and strengthens intentional focus: selected radius boost `5.4`, shadow/double halo, and the authoritative Task D `2.25`/`1.85` role-edge widths with `0.78`/`0.68` alpha.
- Evidence radius and on-demand interaction were not promoted.

Semantic/data properties explicitly not changed: node membership, semantic IDs, capability ownership, role requirements, owned/transferable/gap classification, edge membership/type/direction, family taxonomy, evidence association, role rank/order/fit, topology seeds, force positions, projection, and focus-set membership.

## Real-state browser validation

The exact previously admitted Founder browser-local Career Map state was replayed in a disposable private Chrome profile. Task F subsequently bumped the canonical capability content version, so the temporary copy updated only equal-scope compatibility-version strings (`1.2.0 → 1.3.0`) before the current validators and projection rendered it. No raw state was printed, copied into the repository, or included here; no state entered the commit. This compatibility replay was used only for visual regression validation and did not change production code or graph semantics.

Browser route: `http://localhost:3000/career-map`. All five captures reached `data-graph-status="settled"`, rendered 45 nodes / 67 links / 4 reachable role navigator buttons, reported no horizontal overflow, and made no external validation request.

| Viewport/state | Result | Privacy-safe screenshot SHA-256 |
| --- | --- | --- |
| 1440×1000 default | PASS — YOU and the ringed mint/cyan capability network lead; four soft outer roles remain legible/reachable | `FC01D282F2CC22567651283EDF2D1AA73D49A2BD89D95E8FB199D172D0009DC3` |
| 1440×1000 Data Product Manager selected | PASS — selected role, strong relevant paths, 3 filled owned capabilities, 4 hollow gaps, dimmed retained context | `B11C1FF535B2DC38AEA9718DC07C2D70853A1DDC5DF9A4BD79CC1DEAE350310C` |
| 1280×800 default | PASS — capability-first hierarchy survives fitted scale; all roles remain visible | `32B4EFF05ECB96BA9D7C4B8E3D8D0A9B5E32DE1A86A38FB11C26E321CFC4C6E6` |
| 390×844 default | PASS WITH MINOR EXISTING DENSITY — YOU/core network lead; role labels remain secondary; no overflow | `1295779AD53EE03EBA67B658137FAAE511B4995C2C938FD5196AC9A3D7253840` |
| 390×844 Data Product Manager selected | PASS WITH MINOR EXISTING DENSITY — focus is structurally clear; secondary detail panel occupies much of lower viewport | `1C7197481108C33F0037CA513D5AAAF7B1C9E02737A8B8A53F10BA1DAEEC9BDA` |

Screenshots stayed in the disposable OS temporary directory and are not repository artifacts.

First-glance assessment: **The user and their capability network dominate first read; future roles are visible as outer possibilities.**

Three-second interpretation: **This is my capability map, and those outer nodes are possible future roles.**

Collision/overlap assessment: no node stack, ghost-center edge, off-screen major node, horizontal overflow, or severe unused-space imbalance. Dense lower-left desktop labels and compact selected-role labels have minor local proximity but remain readable enough and do not obscure node identity/structure. This is a minor visual residual, not a semantic or interaction blocker.

## Default visual scorecard

- YOU visual priority: PASS.
- Personal capability network priority: PASS.
- Future roles secondary: PASS.
- Evidence tertiary: PASS.
- Role labels non-dominant: PASS.
- Personal edges dominate: PASS.
- Roles remain visible: PASS.
- Graph remains organic: PASS.
- Collisions acceptable: PASS WITH MINOR VISUAL RESIDUAL.
- Three-second interpretation: PASS.

## Interaction regression scorecard

- Selected role escalates: PASS.
- Relevant canonical capabilities exposed: PASS (7/7 for Data Product Manager).
- Owned/shared clear: PASS (filled/ringed nodes plus solid paths).
- Gap clear: PASS (hollow nodes plus dashed role-only paths; no false YOU edge).
- Unrelated context retained: PASS (dimmed, not removed).
- Evidence not auto-expanded: PASS (0 auto-expanded).
- Task D semantics preserved: PASS.
- Capability/evidence focus ownership: PASS by unchanged implementation and focused contracts.

## Verification

PASS:

- `npx tsx tests/career-possibility/career-map-neural-graph.test.ts`
- `npx tsx tests/career-possibility/career-graph-visual-adapter.test.ts`
- `npx tsx tests/career-possibility/active-multi-role-career-map-renderer.test.ts`
- `npx tsx tests/career-possibility/unified-career-map-surface.test.ts`
- `npx tsx tests/career-possibility/career-map-graph-projection.test.ts`
- `npx tsx tests/career-possibility/ranked-career-map-graph-projection.test.ts`
- `npx tsx tests/career-possibility/role-capability-registry-reconciliation.test.ts`
- `npx tsx tests/career-possibility/local-career-map-presentation-adapter.test.ts`
- `npx tsc --noEmit`
- `npx eslint components/career-possibility/CareerMapNeuralGraph.tsx tests/career-possibility/career-map-neural-graph.test.ts`
- `npm run build` (35/35 static pages generated).
- Impeccable mechanical detector over the changed production UI: zero findings.

Repository-wide `npm run lint` remains blocked by 250 pre-existing errors in unrelated application, quarantine-artifact, extension, script, and compiled-test paths. The required targeted ESLint over the exact Task E files passes with zero findings; Task E introduced no lint error.

Package files changed: none.

## Product / truth judgment

`TASK_E_CAPABILITY_FIRST_HIERARCHY_READY_WITH_MINOR_VISUAL_RESIDUAL`

The implementation is locally keepable and satisfies the admitted product hierarchy. The remaining compact/cluster label density is minor and pre-existing in character; it does not reverse first read, hide roles, weaken Task D semantics, create overflow, or justify widening this task into topology/layout work.
