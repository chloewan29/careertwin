# CareerTwin — Career Map MVP Vertical Slice Gap Audit

> **NON_CANONICAL**  
> **CAREER MAP MVP VERTICAL SLICE GAP AUDIT**  
> **NO PRODUCTION WRITE**

## Decision

`CAREER_MAP_MVP_INFERENCE_BLOCKED`

EM decision label: `AUDIT`.

The committed architecture and most downstream runtime owners are sufficient to support a bounded MVP implementation. The personal graph is not yet end-to-end ready because the production upload path remains gated by deterministic evidence signals, while the approved structured-LLM inference path is disconnected. A pre-existing extractor HOLD regression must also be closed before that inference work can be validated against a real CV.

## Audit boundary

- Task type: architecture and runtime gap audit.
- Mode: `CAREER_MAP_MVP / END_TO_END_VERTICAL_SLICE / ARCHITECTURE_AND_RUNTIME_GAP_AUDIT`.
- Failing layer: Career Map personal evidence-to-capability inference, preceded by a HOLD-blocked atomic-extraction boundary.
- First drift point: `buildProvisionalCareerMapFromText()` sends only `bridgeEvidenceToProvisionalSignals()` results with status `structured` into `mapProvisionalResumeEvidencePlural()`. Evidence without an authored deterministic signal never reaches canonical capability assessment.
- First writable fault: none authorized in this audit. For a future repair turn, the first execution precondition is the extractor HOLD boundary; the primary architectural writable boundary is the structured evidence-to-canonical proposal adapter/validator.
- Allowed file for this turn: this audit artifact only.
- Out of scope: production source, tests, packages, control and architecture documents, Role Knowledge, ontology, semantic policies, source triangulation, commit and push.

## Founder product model confirmed

The intended MVP is one evidence-grounded neural capability graph:

```text
CV
→ atomic professional evidence
→ existing canonical capability identity
→ presentation-level personal grouping
→ supporting canonical capabilities
→ clickable exact evidence

YOU ──owns──► capability X ◄──requires── ROLE
ROLE ──requires──► capability Y  (role-only when YOU does not own Y)
```

The same canonical capability must not become separate user and role semantic identities. A role-only requirement is the gap; no new gap ontology is required. Approximately three to five relevant generic roles should be selected and positioned by internal overlap ordering without visible percentages or High/Adjacent/Stretch labels.

## Current production runtime path

The root product path actually called at runtime is:

```text
app/page.tsx
→ RootCvUploadWorkspace
→ buildProvisionalCareerMapFromFile
→ extractLocalResumeFile (browser-local PDF/DOCX text)
→ buildProvisionalCareerMapFromText
→ extractResumeEvidenceFromText
→ ResumeEvidenceRecord + ResumeSourceSpan
→ bridgeEvidenceToProvisionalSignals + provisionalEvidenceSignalPolicy
→ mapProvisionalResumeEvidencePlural + provisionalResumeMappingPolicy
→ inferCanonicalPersonalCapabilities
→ materializeProvisionalCareerMap
→ ProvisionalLocalCareerMapState 2.0.0
→ writeLocalCareerMapState (one browser-local write)
→ /career-map
→ LocalCareerMapWorkspace / readLocalCareerMapState
→ buildPersonalCareerMapPresentation
→ PersonalCapabilityExplorer → buildPersonalCareerMapExplorerViewModel → CapabilityExplorer
  OR
→ buildPersonalTargetRoleComparison (currently analytics-manager only for graph)
→ buildCareerMapGraphProjection
→ CareerMapNeuralGraph
→ capability selection → exact evidence reveal
```

The separate text/review/shared-ingestion route exists, but it is not the root PDF/DOCX product path above.

## Active and disconnected owners

### Active in the root-to-/career-map path

- File intake: `RootCvUploadWorkspace.tsx`, `build-provisional-career-map-from-file.ts`, `local-resume-file-extractor.ts`.
- Atomic extraction: `resume-evidence-text-extractor.ts`, `resume-evidence-contract.ts`, `resume-evidence-extraction-contract.ts`.
- Deterministic semantic channel: `provisional-evidence-signal-policy.ts`, `provisional-evidence-signal-bridge.ts`.
- Canonical inference: `provisional-resume-capability-mapper.ts` calling `canonical-personal-capability-inference.ts`.
- State: `provisional-career-map-materializer.ts`, `local-career-map-state.ts`, `local-career-map-storage.ts`.
- Personal presentation: `local-career-map-presentation-adapter.ts`, `career-map-explorer-view-model.ts`, `PersonalCapabilityExplorer.tsx`, `CapabilityExplorer.tsx`.
- Role comparison: `personal-target-role-comparison.ts`.
- Graph: `career-map-graph-projection.ts`, `CareerMapNeuralGraph.tsx`.
- Runtime generic role surface: four `representativeGenericRoleProfiles` from `generic-role-archetype.ts`.

### Implemented but disconnected from the root production path

- `scripts/run-career-map-llm-experiment.ts`: a standalone Gemini experiment with inline types and validation. It is not imported by production, has no persisted result, and does not feed the materializer.
- `buildGenericCareerPathAlignment()` and `buildPersonalGenericPathPresentation()`: real capability-overlap ordering owners, but they consume `CandidateBaseline` plus an explicit identity map and are not called by `/career-map`.
- `role-lens-map-adapter.ts` fit scores/ranks: used for mock/demo presentation; its rank-based synthetic scores and visible Closest/Adjacent/Stretch concepts are not suitable for the Founder MVP graph.
- The 18 seeded profiles in `fixtures/roleCapabilityProfiles.ts`: present in the aggregate library but not passed to the active `/career-map` route, which intentionally receives only the four representative generic roles.

## Stage A — CV intake / atomic evidence

**Status: `HOLD_BLOCKED`**

Owners: `RootCvUploadWorkspace`, `buildProvisionalCareerMapFromFile`, `extractLocalResumeFile`, `extractResumeEvidenceFromText`, `ResumeEvidenceBundle`.

What works:

- PDF/DOCX text extraction is browser-local and source preserving.
- Evidence records retain stable evidence IDs, employment references and exact source spans.
- Titles and employers are separate provenance fields and are not deterministic capability signals.
- Bullet continuation, evidence identity and extraction contracts are implemented.

Deficiency:

- The current working-tree extractor has a pre-existing HOLD change that introduces non-employment section boundaries without preserving the preceding work-section boundary. The focused test fails at the `section heading` case: expected 2 records, observed 0.
- Extraction is syntactic, not an eligibility classifier. Education and skill-section content can still become candidate evidence records; later signal/mapping guards often reject it, but Stage A itself does not cleanly separate performed work/decision/delivery/outcome evidence from all education or self-declared skill content.

MVP blocking: **YES** for the current workspace runtime. Smallest future boundary: reconcile the narrow extractor boundary and prove employment evidence survives section transitions while headings, titles, employers and skill declarations cannot independently become capability evidence.

## Stage B — Evidence to canonical personal capability inference

**Status: `PARTIAL` — primary architectural MVP blocker**

Owners: `provisional-evidence-signal-bridge.ts`, `provisional-resume-capability-mapper.ts`, `canonical-personal-capability-inference.ts`, `provisional-career-map-materializer.ts`.

Observed production behavior:

- Production is still dependent on deterministic signal admission. Only bridge status `structured` reaches canonical inference.
- No-deterministic-signal evidence becomes inactive unsupported/unresolved evidence and cannot propose a capability.
- `scripts/run-career-map-llm-experiment.ts` is disconnected; the structured-LLM architecture is not productionized.
- The canonical inference owner validates against existing capability IDs and retains evidence ID/source grounding.
- Direct and transferable relationships exist and remain distinct.
- Raw external model output cannot currently write state because no production model path exists. The intended validator/materializer boundary is not implemented for LLM output.
- Zero assessments are conceptually allowed by the experiment, but zero admitted mappings for an entire CV causes the production builder/materializer to fail closed instead of producing an empty personal graph.
- Title/employer provenance is not sent into canonical inference and cannot establish a capability through the current deterministic policy.

Missing boundary:

1. Versioned production structured-output contract for evidence-to-canonical proposals.
2. Deterministic validation of schema, evidence IDs, canonical IDs, relationship/support assessment, duplicates and grounding.
3. Deterministic governance from support assessment to `direct_evidence` or `transferable_signal`.
4. Projection of validated proposals into the existing canonical inference/materializer inputs without mandatory signal hits.

MVP blocking: **YES**. This is the primary personal-coverage blocker.

## Historical real-CV coverage baseline

No private founder CV was available for a fresh replay in the latest control cycle. The following is historical accepted privacy-safe replay evidence, not current live-runtime truth:

| Measure | Founder CV A historical baseline |
|---|---:|
| Atomic evidence | 33 |
| Admitted unique personal capabilities | 2 (`analytics-governance`, `insight-synthesis`) |
| Strict bridge-unresolved evidence | 1 |
| Bridge-unsupported evidence | 27 |
| Structured evidence | 5 |
| Direct admitted mappings | 2 |
| Transferable admitted mappings | 0 |

Three of the five structured items did not gain an admitted canonical mapping. Therefore 31 of 33 atomic evidence records had no admitted capability relationship in that historical map when unsupported/unmapped material is included. This sparse two-capability result is consistent with the deterministic coverage bottleneck. The standalone LLM experiment contains eight selected historical evidence records but no stored, reproducible execution result and is not a production baseline.

## Stage C — Personal high-level presentation hierarchy

**Status: `PRESENTATION_ADAPTER_MISSING`**

Owners today:

- `buildPersonalCareerMapExplorerViewModel()` presents canonical capabilities flat and emits `subCapabilities: []`.
- `groupPersonalCapabilitiesByFamily()` in the graph projection places canonical families on the first ring and canonical capabilities below them.

Deficiency:

The architecture explicitly says canonical family is taxonomy authority but is not automatically the correct first-ring UX concept. No presentation-only owner currently derives approximately six to ten user-facing high-level personal capability groups with supporting canonical sub-capabilities. The existing canonical IDs, labels, families and evidence can be reused; no ontology change is proven necessary.

MVP blocking: **YES** for the Founder-designed hierarchy. Smallest boundary: one presentation adapter over admitted personal capabilities, with no persisted IDs and no semantic-authority role.

## Stage D — Capability to evidence interaction

**Status: `PRODUCTION_READY`**

Owners: `PersonalCareerMapPresentation`, `buildPersonalCareerMapExplorerViewModel`, `CapabilityExplorer`, `CareerMapGraphProjection`, `CareerMapNeuralGraph`.

- Evidence IDs and exact text/source offsets survive materialization and presentation.
- `CapabilityExplorer` owns `selectedCapabilityId` and `selectedEvidenceId`, reveals exact evidence, relationship and source span, moves focus to details and restores trigger focus.
- `CareerMapNeuralGraph` reveals evidence after capability selection.
- Desktop and mobile have separate usable disclosure layouts.

MVP blocking: **NO**.

## Stage E — Generic role knowledge

**Status: `MVP_SUFFICIENT`**

- Active route surface: four representative generic profiles — `analytics-manager`, `customer-insights-lead`, `marketing-analytics-lead`, `data-product-manager`.
- Active generic relationships: 26, all canonical; each role contains six or seven requirements.
- Aggregate library: 22 profiles, 98 relationships, 73 canonical and 25 private.
- Contracts preserve `must`, `should`, `differentiator`, `importance`, `minimumProofLevel`, expected evidence and evidence requirements.

The current four-role generic surface already meets the requested approximate three-to-five role scope. Full world-role coverage and additional Role Knowledge enrichment are not MVP blockers.

MVP blocking: **NO**.

## Stage F — User ↔ role capability join

**Status: `PARTIAL`**

Owner: `buildPersonalTargetRoleComparison()`.

The comparison performs an exact canonical capability-ID join and returns:

- `directly_demonstrated` when a shared canonical ID has direct personal evidence;
- `transferable_signal` when the shared ID has only transferable evidence;
- `evidence_not_yet_shown` when a canonical role requirement is absent from the personal set;
- deferred/excluded governance states for private/non-admitted IDs.

This semantic join is usable. However, the active graph computes it for only one hard-coded `analytics-manager` role, while the Role Lens separately allows manual choice among four roles. There is no single selected top-role set shared by ranking, projection and rendering.

MVP blocking: **NO** at the comparison contract itself; the missing multi-role integration blocks Stages G/H.

## Stage G — Role ranking / radius

**Status: `PARTIAL`**

Existing reusable ordering owner: `buildGenericCareerPathAlignment()` in `lib/career-possibility/generic-career-path-alignment.ts`.

It orders generic archetypes deterministically using evidence-backed capability strength and role sections (`identity_defining`, `core_enabler`, `supporting`, `differentiator`). Tests prove the expected top role for four representative capability sets.

Deficiency:

- It is disconnected from `/career-map` and consumes `CandidateBaseline`, not `LocalCareerMapState` or `PersonalCareerMapPresentation`.
- The active role comparison has no aggregate score/rank.
- The graph hard-codes one role and a fixed right-side radius.
- `role-lens-map-adapter.ts` has mock rank/fit values based on input order and exposes prohibited labels; it must not become the production owner.

MVP blocking: **YES**. Smallest boundary: a presentation adapter from existing admitted personal capabilities/evidence into the existing generic alignment ordering, returning top three to five roles plus normalized order/radius input without exposing a percentage.

## Stage H — Graph projection

**Status: `PARTIAL`**

Owner: `buildCareerMapGraphProjection()`.

Supported today:

- central `user` node;
- canonical family, capability and deduplicated evidence nodes;
- exact evidence edges;
- one role and its requirement states;
- role-only unsupported requirements without fabricating personal capability ownership.

Exact gaps:

- one optional role input rather than three to five ranked roles;
- canonical family is used directly as first-ring UX grouping;
- no role order/radius data;
- each role requirement becomes a `role_requirement` proxy node, including requirements for capabilities the user owns;
- shared capability identity is retained only as `role_requirement.capabilityId`; the projection has no direct role-to-existing-capability edge;
- the graph input is hard-coded to `analytics-manager` by `LocalCareerMapWorkspace`.

MVP blocking: **YES**. Smallest boundary: extend the presentation-only projection to accept ranked roles, connect shared requirements to the existing canonical capability node, and create proxy nodes only where visually required without creating a second semantic capability identity.

## Stage I — Graph renderer

**Status: `PARTIAL`**

Owner: `CareerMapNeuralGraph`.

Already working:

- central YOU node;
- family/capability progressive disclosure;
- direct and transferable evidence states;
- evidence reveal;
- one role and role requirement disclosure;
- role-only gaps shown hollow/dashed;
- accessible button labels and a separate mobile stacked interaction.

Deficiency:

- only the first role node is consumed;
- role position is fixed (`ROLE_X`/`ROLE_Y`) rather than overlap-driven;
- no top-three-to-five layout;
- shared role/user capabilities still traverse requirement proxy nodes;
- the Neural Graph is a secondary tab; the default Career Map remains `CapabilityExplorer`;
- visual collision and real-data density have not been revalidated against sufficient personal capability coverage.

Renderer readiness is downstream of data/projection readiness. It is not the primary blocker and should receive only bounded presentation repair after real inputs exist.

MVP blocking: **NO** by itself.

## Shared canonical node identity rule

**Current support: `PARTIAL`**

The personal capability node uses the canonical capability ID exactly once. Role requirement proxies retain the same `capabilityId`, and the renderer can bridge a demonstrated/transferable proxy to the personal node. This avoids fabricating a second personal capability, but it does not yet implement the clean semantic graph edge `ROLE → existing canonical capability node`. The future projection should make the canonical node the shared semantic identity and treat any layout proxy as explicitly non-semantic.

## Role-only gap rule

**Current support: `YES`**

When a role requires a canonical capability absent from the personal state, `buildPersonalTargetRoleComparison()` emits `evidence_not_yet_shown`. The projection emits a role-side requirement node and never adds that capability to personal capability/family nodes or creates an owned edge from YOU. Focused projection and renderer tests pass this invariant.

## End-to-end stage matrix

| Stage | Owner(s) | Runtime status | Main deficiency | MVP blocking | Smallest repair boundary |
|---|---|---|---|---|---|
| A CV intake / atomic evidence | Root upload; file extractor; evidence text extractor | HOLD_BLOCKED | Section-boundary HOLD regression; eligibility remains syntactic | YES | Reconcile one extractor boundary and its focused cases |
| B evidence → canonical personal capability inference | Signal bridge; canonical inference; materializer | PARTIAL | Deterministic signal is mandatory; structured LLM disconnected | YES | Versioned proposal contract, validation and adapter into existing materializer |
| C personal high-level presentation hierarchy | Explorer view model; family grouping | PRESENTATION_ADAPTER_MISSING | Flat capabilities or taxonomy-family first ring | YES | Ephemeral UX grouping adapter over existing canonical/evidence data |
| D capability → evidence interaction | Presentation; CapabilityExplorer; neural renderer | PRODUCTION_READY | No critical functional gap | NO | Preserve existing evidence identity/disclosure |
| E generic role knowledge | Generic archetypes; role contracts | MVP_SUFFICIENT | Broader role universe incomplete but unnecessary | NO | Reuse current four profiles |
| F user ↔ role capability join | Personal target-role comparison | PARTIAL | Exact join exists but graph uses one hard-coded role | NO | Reuse comparison for ranked role set |
| G role ranking / radius | Generic career-path alignment | PARTIAL | Valid ordering owner is disconnected from personal local state | YES | Bounded personal-state-to-alignment adapter |
| H graph projection | Career Map graph projection | PARTIAL | One role, family first ring, requirement proxies, no radius | YES | Multi-role/shared-node presentation projection |
| I graph renderer | CareerMapNeuralGraph | PARTIAL | One fixed role and no real-data density validation | NO | Renderer-only validation after H |

## True MVP blockers

Primary architectural blocker: **Stage B structured evidence-to-canonical inference is not connected to production.** The deterministic signal channel is still a mandatory gateway, so valid implicit evidence cannot populate a sufficiently rich personal graph.

Execution precondition: **Stage A is HOLD-blocked.** A real CV containing a later section heading can currently lose the preceding work evidence in the working-tree extractor.

Secondary blockers:

- Stage C lacks the Founder-designed presentation grouping.
- Stage G lacks a runtime connection from personal state to the existing role alignment order.
- Stage H lacks three-to-five ranked roles, overlap radius and direct shared-node edges.

Not blockers:

- second-source triangulation;
- semantic strengthening of all 51 capabilities;
- complete world-role coverage;
- exact JD matching;
- courses, action plans or progress tracking;
- visible fit percentages;
- High/Adjacent/Stretch labels;
- new gap or role ontology;
- perfect first-ring taxonomy;
- further Role Knowledge enrichment before MVP.

All triangulation artifacts remain preserved and are classified `DEFERRED_POST_MVP_QUALITY_WORK`.

## Exact bounded critical path

### Task 1 — Stabilize atomic evidence extraction

- Goal: remove the current HOLD blocker without broadening semantics.
- Reuse: `extractResumeEvidenceFromText`, existing extraction contracts and focused fixtures.
- Exact missing boundary: correct section transition ownership so work evidence survives, while non-employment headings, titles, employers and skill declarations cannot independently establish capability evidence.
- Acceptance: focused extractor test passes; a representative CV with Experience followed by Education/Skills retains all work bullets; title/employer/skills-only inputs create no admitted capability; no extraction identity drift outside the repaired cases.
- Dependency: none.

### Task 2 — Productionize structured evidence-to-canonical inference

- Goal: allow every eligible atomic evidence item to receive validated canonical assessment even without a deterministic signal.
- Reuse: canonical capability library, canonical personal inference owner, direct/transferable contracts, provisional materializer/state and deterministic signal guards.
- Exact missing boundary: versioned structured-output contract plus fail-closed validator and adapter; the model proposes only existing canonical IDs and never writes state directly.
- Acceptance: grounded evidence can yield zero or more validated proposals; no-signal evidence can be assessed; unknown IDs, evidence IDs, malformed relationships, duplicates and ungrounded output are rejected; exact evidence grounding survives; title/employer cannot establish a capability; existing deterministic fixtures remain unchanged.
- Dependency: Task 1.

### Task 3 — Connect personal hierarchy, role ranking and shared-node projection

- Goal: produce the Founder graph data model from one personal state read.
- Reuse: personal presentation, canonical families as taxonomy metadata, generic role archetypes, `buildGenericCareerPathAlignment`, `buildPersonalTargetRoleComparison`, graph projection.
- Exact missing boundary: ephemeral high-level grouping adapter; personal-state-to-role-order adapter; top-three-to-five role projection; rank-to-radius mapping; role edges to the existing shared canonical node; role-only proxy gaps.
- Acceptance: approximately six to ten high-level personal groups when data supports them; canonical sub-capabilities/evidence retained; three to five roles ordered by meaningful capability overlap; closer rank means smaller radius; a shared canonical capability exists once; absent requirements have no YOU-owned edge; no visible percentage or prohibited labels.
- Dependency: Task 2.

### Task 4 — Real-CV end-to-end visual validation

- Goal: validate one real root-upload-to-neural-graph vertical slice and make presentation-only repairs.
- Reuse: root upload, local state, graph projection and `CareerMapNeuralGraph`.
- Exact missing boundary: real-data density, collision, progressive disclosure, responsive layout and default-view validation.
- Acceptance: one privacy-safe real CV reaches `/career-map`; evidence is clickable; three to five role positions reflect order; shared and role-only semantics are visually correct at desktop and mobile; no console, overflow, accessibility or privacy regression.
- Dependency: Task 3.

## Recommended first implementation task

Run **Task 1 only** as a bounded repair: reconcile the extractor HOLD section-boundary regression and validate its narrow replay set. Do not mix structured inference or graph changes into that repair. Once Stage A is stable, Task 2 is the primary MVP implementation.

## Verification performed

- PASS: `build-provisional-career-map-from-text.test.ts`
- PASS: `canonical-personal-capability-inference.test.ts`
- PASS: `canonical-multi-proposal-inference.test.ts`
- PASS: `local-career-map-presentation-adapter.test.ts`
- PASS: `personal-target-role-comparison.test.ts`
- PASS: `generic-career-path-alignment.test.ts`
- PASS: `career-map-graph-projection.test.ts`
- PASS: `career-map-neural-graph.test.ts`
- PASS: `generic-role-archetype.test.ts`
- PASS: `root-inline-intake.test.ts`
- FAIL, pre-existing HOLD conflict: `resume-evidence-text-extractor.test.ts`, `section heading`, expected 2 and observed 0.
- PASS: `npm run build`.

The build passing does not override the focused extractor failure. No production or test repair was attempted.
