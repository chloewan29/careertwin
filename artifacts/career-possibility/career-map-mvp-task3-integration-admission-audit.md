# NON_CANONICAL

# CAREER MAP MVP TASK 3 INTEGRATION ADMISSION AUDIT

Status: READ-ONLY

Production write: NO

Audit date: 2026-08-12

Authoritative baseline: `master` at `689ea9cc9ad423511f4334089fe2ea008cf70888`

## Decision

`MVP_TASK3_INTEGRATION_BOUNDARY_IDENTIFIED`

Current task type: integration admission audit

Current MODE: `AUDIT / TASK_3A`

Failing layer: Career Map integration/orchestration between validated personal state and generic-role ordering

First drift point: the production route has real canonical personal capability state, but that state never enters the existing generic-role ordering kernel

First writable fault: `REAL_PERSONAL_STATE_TO_GENERIC_ROLE_ALIGNMENT_ADAPTER_MISSING`

In-scope correction area for the next task: a truthful, bounded input boundary between the personal presentation/state owner and the existing generic-role alignment owner

Out-of-scope areas: Task 2 inference, extraction, provider/model/prompt, canonical ontology, Role Knowledge enrichment, Job Copilot, graph or renderer implementation in this audit, Task 4, triangulation, control/architecture/package changes

Allowed file in this audit: this artifact only

Proportional verification: static production-call trace, focused read-only role-catalog diagnostic, `git diff --check`, and final Git boundary checks

Single main next action: implement Task 3B as the bounded real-personal-state-to-generic-role-alignment connection

## Architecture Decision Lock

### Architecture decisions

- `YOU` is the center of the Career Map.
- Personal capability truth comes only from admitted atomic evidence mapped to canonical capability IDs.
- The validated Task 2 materializer and local Career Map state remain authoritative.
- A personal capability and a role requirement with the same canonical ID share one semantic canonical capability identity.
- Unsupported role requirements remain role-only gaps and never create personal ownership.
- A role-only gap is a graph condition, not a separate ontology.
- Canonical capability families remain taxonomy authority. Any first-ring grouping is presentation-only and cannot become a second semantic ontology.
- Career Map compares generic role possibilities. Specific-JD fit remains in Job Copilot.
- Existing role, comparison, ranking, projection, state, evidence, and renderer owners must be reused before adding a new owner.

### Current task

Task 3A is a read-only integration admission audit. It identifies the smallest missing integration boundary. No Task 3 implementation is authorised in this turn.

### Next task

Task 3B should connect the validated personal capability substrate to the existing deterministic generic-role ordering kernel through a truthful, bounded contract.

### Later tasks

- Later Task 3 slices may extend graph projection and renderer cardinality after ordered roles exist.
- Task 4 remains real-CV end-to-end visual validation and bounded presentation/renderer repair.
- Triangulation remains deferred post-MVP quality work.

### Out of scope confirmation

Task 2 was not reopened. Inference, extraction, provider/model/prompt, canonical libraries, role knowledge, graph implementation, renderer implementation, Task 4, triangulation, tests, control docs, architecture docs, and packages were not modified.

## MVP Task Ledger

| Task | State |
|---|---|
| Task 1 | CLOSED |
| Task 2 | CLOSED |
| Task 2D | CLOSED |
| Personal capability substrate | MVP_SUFFICIENT |
| Task 3 | CURRENT |
| Task 3A | CURRENT — audit only |
| Task 3 implementation | NOT STARTED |
| Task 4 | LATER |
| Role Knowledge | MVP_SUFFICIENT |
| Triangulation | DEFERRED_POST_MVP_QUALITY_WORK |

## Active Production Route Trace

```text
app/page.tsx
→ RootCvUploadWorkspace
→ buildProvisionalCareerMapFromFile()
→ buildProvisionalCareerMapFromText()
→ materializeProvisionalCareerMap()
→ writeLocalCareerMapState()
→ /career-map
→ LocalCareerMapWorkspace
→ readLocalCareerMapState()
→ buildPersonalCareerMapPresentation()
→ buildPersonalTargetRoleComparison() for hard-coded analytics-manager
→ buildCareerMapGraphProjection() with zero or one role
→ CareerMapNeuralGraph
```

| Arrow | Classification | Observation |
|---|---|---|
| Upload component → build adapters | CONNECTED | Production upload calls the file/text build path. |
| Build adapters → materialized state | CONNECTED | Validated mappings enter the existing materializer. |
| Materialized state → browser-local state | CONNECTED | Existing validated storage owner writes and reads the state. |
| Local state → personal presentation | CONNECTED | The active `/career-map` route calls the production presentation adapter. |
| Personal presentation/state → one-role comparison | CONNECTED | The route compares only the stable `analytics-manager` profile. |
| Personal state → generic-role ordering | DISCONNECTED | No production caller invokes `buildGenericCareerPathAlignment()`. |
| One-role comparison → graph projection | CONNECTED | The comparison is passed as optional singular `role`. |
| Graph projection → renderer | CONNECTED | The active Neural Graph tab receives the projection directly. |

The root landing page also renders `mockCareerPossibility`, explicitly labelled “Interactive example · not your data.” That example is outside the loaded personal `/career-map` route and is not personal-state contamination.

## Owner Matrix

| Area | Authoritative owner | Status | Current input | Current output | Missing boundary | Implementation needed? |
|---|---|---|---|---|---|---|
| Personal state | `lib/career-possibility/local-career-map-state.ts` (`ProvisionalLocalCareerMapState`) and `lib/career-possibility/provisional-career-map-materializer.ts` (`materializeProvisionalCareerMap`) | READY | Validated deterministic/structured mappings and atomic evidence | Canonical capability, evidence, relationship, and provenance state | None | NO |
| Personal presentation grouping | `buildPersonalCareerMapPresentation()` plus presentation-only `groupPersonalCapabilitiesByFamily()` in `career-map-graph-projection.ts` | PARTIAL | Real validated local state | Real personal capabilities/evidence, then canonical-family groups | No non-taxonomy first-ring grouping; current neural graph uses canonical families | NO for Task 3 start; refinement may wait for Task 4 |
| Role profiles | `representativeGenericRoleArchetypes` and projected `representativeGenericRoleProfiles` in `generic-role-archetype.ts` | MVP_READY | Four governed archetypes and canonical library | Four active `RoleCapabilityProfile` records with 26 canonical requirements | None for MVP | NO |
| Role ranking | `buildGenericCareerPathAlignment()` in `generic-career-path-alignment.ts` | LOGIC_READY_BUT_DISCONNECTED | Legacy `CandidateBaseline`, explicit candidate-to-canonical identity map, four archetypes | Deterministically sorted role alignments and `orderingBasis` | Does not accept validated Task 2 personal state or presentation | YES |
| Top-role selection | Ordered `GenericCareerPathAlignmentResult.roles`; presentation `directionOrder` in `personal-generic-path-presentation-adapter.ts` | SMALL_ADAPTER_REQUIRED | Deterministically ordered four roles | All four roles in stable order | No production connection/fixed top-N handoff; active catalog already has four roles | YES |
| Radius/proximity | Existing role order from `orderingBasis`, exposed as `directionOrder` | SMALL_ADAPTER_REQUIRED | Ordered role results | Ordinal deterministic rank | No presentation-only radius metadata or layout adapter | YES, after ranking connection |
| Graph projection | `buildCareerMapGraphProjection()` in `career-map-graph-projection.ts` | PARTIAL | Personal presentation, family library, optional singular role/comparison | YOU, family, capability, evidence, one role, role-requirement nodes and edges | Singular `role?`; no multi-role or radius metadata | YES, after ordered roles exist |
| Shared capability identity | `career-map-graph-projection.ts` | SHARED_ID_WITH_LAYOUT_PROXIES | Canonical personal IDs plus comparison requirement IDs | One personal canonical capability node; role-requirement layout proxies retain the same `capabilityId` | No semantic defect | NO |
| Role-only gaps | `buildPersonalTargetRoleComparison()` plus `buildCareerMapGraphProjection()` | READY | Missing canonical role requirement | Role-only `role_requirement` with `evidence_not_yet_shown`; no personal ownership edge | None | NO |
| Evidence disclosure | `buildPersonalCareerMapPresentation()`, graph evidence nodes, `CareerMapNeuralGraph`, and `CapabilityExplorer` | PRODUCTION_READY | Real evidence IDs, text, and relationships | Desktop/mobile progressive evidence disclosure | None for Task 3 start | NO |
| Renderer desktop | `components/career-possibility/CareerMapNeuralGraph.tsx` | PARTIAL | `CareerMapGraphProjection` | YOU, family, capability, evidence, one fixed-position role and requirements | Uses `roleNodes[0]`; fixed singular role geometry; no radius | YES, downstream slice |
| Renderer mobile | `components/career-possibility/CareerMapNeuralGraph.tsx` mobile fallback | PARTIAL | Same projection | Family/capability/evidence lists and one role/requirements list | Uses the same singular selected role model; no multi-role/radius | YES, downstream slice |
| Active route integration | `components/career-possibility/LocalCareerMapWorkspace.tsx` | PARTIAL | Real stored state and four active profiles | Personal map, one-role neural graph, manually selected Role Lens | Hard-coded `analytics-manager`; generic ordering is not called | YES |

## Personal State Owner

Authoritative state types:

- `ProvisionalLocalCareerMapState`
- `ProvisionalLocalCareerMapCapability`
- `ProvisionalLocalCareerMapEvidence`
- `ProvisionalAutoAdmittedMapping`

Authoritative functions:

- `materializeProvisionalCareerMap()`
- `validateProvisionalLocalCareerMapState()`
- `readLocalCareerMapState()` / `writeLocalCareerMapState()`

Status: `READY`.

- Canonical capability IDs survive intact in `mappings[].capabilityId` and `capabilities[].capabilityId`.
- Exact evidence IDs survive in mappings, capability evidence arrays, and evidence records.
- `direct_evidence` / `transferable_signal` survives in mappings and in the presentation adapter.
- Structured/deterministic provenance survives through the mapping discriminant without becoming graph semantic authority.

## Personal Presentation / First-Ring Owner

`buildPersonalCareerMapPresentation()` is production-connected and converts both supported state versions into real personal capability/evidence presentation. It preserves canonical IDs, evidence IDs, source text, source spans, and relationship state.

`groupPersonalCapabilitiesByFamily()` is the only explicit first-ring grouping used by the neural graph. It is presentation-only and production-connected, but it currently uses canonical family IDs/labels directly. Therefore its admission status is `PARTIAL`, not missing. `buildPersonalCareerMapExplorerViewModel()` presents canonical capabilities directly in the peer Career Map view; it is a separate renderer adapter, not a competing semantic grouping authority.

Canonical family currently used as neural-graph first ring: `YES`.

Task 3 can proceed with this current grouping while final first-ring UX refinement remains for Task 4: `YES`.

## Generic Role Profile Owner

Active product owner: `lib/career-possibility/generic-role-archetype.ts`.

- Active generic roles: exactly 4 — `analytics-manager`, `customer-insights-lead`, `marketing-analytics-lead`, and `data-product-manager`.
- Active requirements: 26.
- Noncanonical active requirement IDs: 0.
- Importance semantics: `must`, `should`, and `differentiator`.
- The broader `fixtures/roleCapabilityProfiles.ts` development collection contains 22 profiles, including 20 legacy seeds with two replaced by governed representatives. It is not the active product catalog.

Status: `MVP_READY`. Role Knowledge does not block Task 3.

## Role Alignment and Ranking Owner

Two existing owners have distinct responsibilities and do not conflict:

1. `buildPersonalTargetRoleComparison()` is the production-connected one-role requirement classifier. It consumes the real local state directly and emits direct, transferable, missing, deferred, or excluded requirement outcomes with evidence.
2. `buildGenericCareerPathAlignment()` is the deterministic generic-role ordering kernel. It weights role structure lexicographically through identity-defining, core-enabler, supporting, and differentiator sections; emits `orderingBasis`; and uses title then role ID as stable tie-breakers.

The ordering kernel does not consume `ProvisionalLocalCareerMapState` or `PersonalCareerMapPresentation`. It requires a legacy `CapabilityStrengthProfileItem[]` plus an explicit candidate-to-canonical identity map and supporting-signal fields. No production caller supplies those inputs. Creating fake numeric strengths, ownership, scope, impact, or signal provenance merely to satisfy that contract would violate founder-safe truthfulness.

Status: `LOGIC_READY_BUT_DISCONNECTED`.

Ranking consumes current canonical personal capability IDs directly: `PARTIAL` — it operates on canonical IDs after an explicit legacy identity map, but it does not accept the current canonical state contract directly.

Role importance weighting available: `YES` through the archetype structural sections and deterministic ordering basis.

No second ranking owner competes with this kernel. The one-role comparison is a classifier, not a ranker.

## Top 3–5 Role Selection

The alignment result already sorts roles deterministically. It has a stable tie-break and the active catalog contains exactly four roles, already inside the founder's 3–5 MVP range. No threshold is required. There is no production handoff or fixed top-N adapter, and the active graph hard-codes one role.

Status: `SMALL_ADAPTER_REQUIRED`.

## Role Radius / Proximity

Existing source: ordered `GenericRoleAlignment.roles`, derived from each role's `orderingBasis`, and exposed downstream as `PersonalGenericPathCard.directionOrder`.

No fit percentage or scalar overlap score is required. A presentation-only radius adapter can consume deterministic ordinal rank after the real-state ranking connection. It must not introduce a second ranking system.

Status: `SMALL_ADAPTER_REQUIRED`.

## Graph Projection State

Owner: `lib/career-possibility/career-map-graph-projection.ts`.

| Capability | State |
|---|---|
| YOU node | SUPPORTED |
| Personal canonical capability nodes | SUPPORTED |
| Evidence nodes and capability-evidence edges | SUPPORTED |
| One role | SUPPORTED |
| Multiple roles | MISSING |
| Role requirements | SUPPORTED |
| Shared canonical identity | SUPPORTED through canonical ID plus layout proxy |
| Role-only gaps | SUPPORTED |
| Role radius/position metadata | MISSING |
| Presentation grouping | SUPPORTED via canonical-family fallback; final UX grouping remains partial |

The contract accepts only `role?: CareerMapRoleInput`, so multi-role cardinality is absent at the projection contract and implementation levels.

## Shared Canonical Capability Identity

Classification: `SHARED_ID_WITH_LAYOUT_PROXIES`.

Personal canonical capability nodes use the literal canonical capability ID as node ID. Each role requirement is a separate layout/context proxy (`role_req:<roleId>:<capabilityId>`) that retains the same canonical `capabilityId`. The renderer joins a supported requirement back to the personal capability by that canonical ID. This is not a second semantic capability identity.

## Role-Only Gap State

Classification: `READY`.

When a role requires canonical capability X and the personal state lacks X, `buildPersonalTargetRoleComparison()` emits `evidence_not_yet_shown`. The projection emits a role-side requirement proxy and does not add X to personal capability or family nodes. No gap object or gap ontology exists or is needed.

## Evidence Disclosure State

Owner chain:

```text
ProvisionalLocalCareerMapState mappings/evidence
→ buildPersonalCareerMapPresentation()
→ CareerMapGraphProjection evidence nodes
→ CareerMapNeuralGraph desktop/mobile disclosure
```

The active personal Career Map also discloses the same real evidence through `buildPersonalCareerMapExplorerViewModel()` and `CapabilityExplorer`.

Status: `PRODUCTION_READY`.

## Renderer State

Owner: `components/career-possibility/CareerMapNeuralGraph.tsx`.

- YOU center: supported.
- Personal capabilities: supported.
- Canonical-family presentation groups: supported.
- Evidence reveal: supported on desktop and mobile.
- One role and its requirements: supported.
- Shared supported-capability bridges: supported by matching `capabilityId`.
- Role-only gap requirements: supported.
- Multiple roles: not supported; `roleNodes[0]` is selected and role geometry is fixed to one anchor.
- Role radius: not supported.

Desktop status: `PARTIAL`.

Mobile status: `PARTIAL`.

The renderer can consume richer personal capability/evidence data now, but cannot consume the required multi-role/radius result without a later bounded renderer change. It does not block the first implementation because ordered role data does not yet exist on the active route.

## Mock / Real-State Boundary

Remaining boundaries:

1. `app/page.tsx` intentionally shows `mockCareerPossibility` as a labelled landing-page example. It does not feed the personal `/career-map` route and does not block Task 3.
2. `LocalCareerMapWorkspace.tsx` hard-codes `analytics-manager` for the neural graph even though four active profiles are supplied.
3. The generic ordering kernel has no production caller and is exercised only by standalone tests.
4. `buildCareerMapGraphProjection()` receives hard-coded singular role input from the workspace.
5. Untracked HOLD files such as `CustomTargetRoleBuilder.tsx` and `custom-target-role-contract.ts` are not committed baseline owners and were not admitted into this audit.

## One-Role Limitation

First limiting classification: `RANKING_INPUT_LIMIT`.

The active route cannot supply ranked roles because validated personal state does not enter the generic ordering kernel. Downstream limitations also exist: singular projection input and singular renderer geometry. They are not the first writable fault.

First writable multi-role owner: the boundary adjacent to `buildGenericCareerPathAlignment()`; proposed implementation owner `lib/career-possibility/personal-generic-role-alignment-adapter.ts`, with only the smallest compatible input extension in `lib/career-possibility/generic-career-path-alignment.ts` if required.

## First Missing Integration Boundary

Classification: `REAL_PERSONAL_STATE_TO_GENERIC_ROLE_ALIGNMENT_ADAPTER`.

Source owner:

- `ProvisionalLocalCareerMapState` in `local-career-map-state.ts`
- production-safe projection `PersonalCareerMapPresentation` from `buildPersonalCareerMapPresentation()`

Destination owner:

- `buildGenericCareerPathAlignment()` in `generic-career-path-alignment.ts`

Exact missing contract/data:

- A truthful current-state alignment input carrying canonical capability IDs, direct/transferable support, and supporting evidence identity.
- The existing destination currently requires legacy numeric capability strength and detailed signal provenance that Task 2 state does not own.
- The bridge must not fabricate strength, confidence, ownership, scope, impact, or signal records.
- The bridge must preserve the four active governed archetypes and the existing deterministic ordering/tie-break authority.

Smallest implementation surface:

- Create `lib/career-possibility/personal-generic-role-alignment-adapter.ts`.
- Add only the smallest truthful current-personal-input seam to `lib/career-possibility/generic-career-path-alignment.ts` if the existing input cannot be adapted without fabricated data.
- Add focused tests for canonical-ID preservation, direct/transferable handling, deterministic four-role order, stable ties, and absence of fabricated signal provenance.

Dependencies already ready:

- Task 2 personal state and materializer
- production personal presentation adapter
- four active generic role archetypes/profiles
- canonical capability library
- one-role comparison semantics
- deterministic generic-role ordering kernel
- graph projection and evidence semantics
- desktop/mobile graph renderer foundation

Downstream functionality unlocked:

- deterministic ordered four-role output from real personal state
- trivial top-four handoff without an invented threshold
- presentation-only role radius derived from the existing order
- multi-role graph projection input
- multi-role desktop/mobile rendering

## Task 3 Implementation Slicing

### Task 3B — Real personal state to generic-role ordering

Connect canonical personal capability/evidence support to the existing generic-role alignment owner through a truthful contract. Produce deterministically ordered results for the four active profiles. Do not fabricate legacy strength/signal fields and do not touch graph or renderer files.

### Task 3C — Ordered roles to multi-role graph projection

Extend the existing projection input from optional singular role to an ordered bounded role collection. Add presentation-only rank/radius metadata derived from the existing order. Preserve canonical capability identity, layout proxies, and role-only gaps.

### Task 3D — Multi-role renderer connection

Connect the ordered multi-role projection in `LocalCareerMapWorkspace` and render 3–5 role nodes on desktop/mobile with overlap-derived radius. Preserve progressive evidence disclosure and avoid visible fit percentages or High/Adjacent/Stretch labels.

## Explicit Gate Answers

- First-ring grouping blocks Task 3: `NO`.
- Role Knowledge blocks Task 3: `NO`.
- Current role library is sufficient for 3–5 roles: `YES` — exactly four active canonical archetypes.
- Renderer blocks the first implementation: `NO`.
- Existing renderer can consume richer upstream data after integration: `PARTIAL` — richer personal data yes; multi-role/radius needs Task 3D.
- Real personal state connected to role ranking: `NO`.
- Ready for bounded Task 3 implementation: `YES`.

## Exact Recommended Next Task

`TASK 3B — REAL PERSONAL STATE TO GENERIC ROLE ALIGNMENT CONNECTION`

Implement only the truthful current-state input seam into the existing deterministic generic-role alignment owner, with focused tests. Do not extend graph projection or renderer in the same slice.

## Audit Boundary Confirmation

- Architecture decisions preserved: YES
- MVP task ledger preserved: YES
- Task 2 reopened: NO
- Inference modified: NO
- Role Knowledge modified: NO
- Canonical ontology modified: NO
- Graph implementation modified: NO
- Renderer modified: NO
- Task 4 started: NO
- Triangulation resumed: NO
- Production files modified: 0
- Tests modified: 0
- Control docs modified: 0
- Architecture docs modified: 0
- Package files modified: 0
- Out-of-scope files modified: 0
