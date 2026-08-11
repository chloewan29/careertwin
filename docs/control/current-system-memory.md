# Current System Memory

### Career Map MVP vertical slice active; Task 2C decisions locked; Task 2C-B next (`CAREERTWIN_MVP_TASK_2C_ARCHITECTURE_DECISIONS_LOCKED`)

- The Founder neural-network Career Map model is the governing MVP product model. You is central; personal capabilities must be grounded in personal evidence; users and generic roles share canonical capability identity; unsupported role requirements remain role-only gaps; role proximity/radius will express meaningful capability overlap.
- The active critical path is fixed unless Founder/EM explicitly reprioritises it:
  1. Task 1 - Atomic Evidence Extraction: `CLOSED`
  2. Task 2A - Structured Inference Gap Audit: `CLOSED`
  3. Task 2B - Provider-Neutral Structured Inference Foundation: `CLOSED`
  4. Task 2C-A - Production Integration Admission Audit: `CLOSED`
  5. Task 2C Architecture Decision Lock: `CLOSED BY CONTROL COMMIT`
  6. Task 2C-B - Bounded Production Integration Implementation: `NEXT IMPLEMENTATION TASK / NOT STARTED`
  7. Task 2D - Privacy-Safe / Founder-CV Capability Coverage Validation: `LATER / NOT AUTHORISED`
  8. Task 3 - Neural-network personal + role graph: `LATER / NOT AUTHORISED`
  9. Task 4 - Real-CV end-to-end visual validation: `LATER / NOT AUTHORISED`
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
- Task 2C is narrowly defined as connecting the Task 2B validated structured proposal boundary into the existing production personal-capability pipeline. It must reuse the existing extractor, canonical authority, deterministic inference, Task 2B validator, canonical personal inference/proposal boundary where feasible, materializer, and local state; it must not create parallel ownership.
- Task 2C production execution is authorised as `browser -> CareerTwin same-origin server route -> server-only external model provider -> Career Map structured response -> Task 2B deterministic validator -> validated proposals`. Provider credentials must remain server-side and must never reach browser/client code.
- The authorised personal evidence payload is exactly the eligible `{ evidenceId, evidenceText }`. Authorised canonical context is limited to existing `{ id, label, family }` plus required contract/content versions.
- Raw CV files, complete extracted CVs, employer names, job titles, education, qualifications, skills-section content, contact information, and unrelated résumé metadata are forbidden semantic model input. Provenance metadata may remain inside CareerTwin but is not independent semantic capability evidence.
- CareerTwin application code must not intentionally persist submitted evidence payloads, constructed prompts containing evidence, or raw provider responses to a database, Career Map state, durable local diagnostics, or application logs. It must not log request bodies or raw provider responses. Ordinary technical request metadata containing no evidence remains under existing infrastructure behavior.
- External-provider zero retention must not be claimed unless the selected provider and configuration are separately verified. Existing UI claims that CV/evidence stays entirely in the browser or never leaves the device must receive the minimum truthful correction when Task 2C becomes active; no privacy settings system or consent workflow is authorised.
- Cross-channel relationship identity is `evidenceId + canonicalCapabilityId`, and at most one personal relationship may be admitted for a pair. Deterministic and structured proposals with the same pair and support state deduplicate to one relationship.
- For the same pair with different support states, retain the already-governed deterministic relationship and reject the conflicting structured proposal. Do not upgrade, downgrade, average, score, randomly choose, or duplicate. A structured conflict may emit an ephemeral diagnostic but does not require persistent state.
- Deterministic inference is not a mandatory gateway. If no deterministic proposal exists for a pair, a valid structured proposal may still be admitted through the governed structured proposal path. `NO DETERMINISTIC SIGNAL != NO PERSONAL CAPABILITY` remains locked.
- Structured/model-derived proposals must remain truthfully distinguishable from deterministic proposals at the proposal/admission boundary. Do not create `llm_matched`, `llm_supported`, a synthetic universal signal, or a fake deterministic `mappingRuleId`. If the existing contract cannot express truthful provenance, Task 2C-B may make only the smallest extension required and must not create a second mapping ontology. Persistent Career Map state schema must remain unchanged unless implementation proves provenance persistence is genuinely required.
- The Task 2B provider-neutral contract remains authoritative: maximum three assessments per atomic evidence result; more than three rejects the affected result without truncation; zero assessments is valid; unknown evidence/canonical IDs and duplicate/conflicting provider results fail closed; raw model output cannot mutate state.
- Provider selection remains an adapter choice, not a new semantic dependency. Task 2C-B must reuse an already-configured server-safe provider/client pattern without a new package, client-side secret, or Job Copilot semantic reuse. If multiple configured providers are equally viable, prefer the pattern proven by the Career Map structured inference experiment. If none is usable, stop with `MVP_TASK2C_PROVIDER_CONFIGURATION_REQUIRED`.
- Earlier browser-local-only Career Map V1/runtime statements remain historical implementation truth and are superseded only for authorised transmission of eligible minimized Task 2C evidence. All other privacy, local-state, and persistence boundaries remain in force.
- Known Task 2C-B HOLD dependencies remain `build-provisional-career-map-from-text.ts`, `provisional-resume-mapping-contract.ts`, `local-career-map-state.ts`, and the focused build-from-text test. Six unrelated provenance HOLD hunks must be preserved through surgical admission; whole HOLD files must not be staged without independent authorisation for every hunk.
- Single next action: begin the bounded Task 2C-B production integration implementation. Do not begin Task 2D, Task 3, or Task 4, and do not resume triangulation.

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

Last updated: 2026-08-11

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
