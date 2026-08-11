# Current Active Brief

Status
- authority
- low-token startup brief
- read this first in every new window before substantial work

Default Read
- yes

When To Read
- every substantial continuation
- every new Codex / ChatGPT work window
- before audit / repair admission / bounded repair / verify / line judgment

Do Not Use For
- long historical replay
- full policy lookup
- full architecture explanation
- full verification mechanics

Purpose
This is the single startup entrypoint for current work.
It is not the full accepted system truth.
It is not the full runbook.
It tells the worker:
- what line is active
- what mode we are in
- what the one main next action is
- what must not be forgotten
- what to read next only if needed

---

## 1. Startup protocol

Default startup order:
1. `docs/control/current-active-brief.md`
2. `docs/control/current-system-memory.md`
3. targeted sections from `docs/control/em-operating-system.md` only if required by task type
4. targeted entries from `docs/control/policy-registry.md` only if required by task type or policy conflict
5. latest active line-plan entry only for the active line

Do not load the heavy control/history stack by default.

Expand to heavy mode only if one of these is true:
- mode transition to `REPAIR` or `MEASURE`
- founder-boundary / cross-line routing decision
- baseline / freeze / regroup / phase-close decision
- policy conflict
- unstable writable-fault diagnosis requiring broader context

Default do-not-read in light mode:
- full historical artifacts
- full policy registry
- full verification mechanics
- archived summaries
- non-active line plans

---

## 2. Current active line

Primary active product priority:
- `CAREER_MAP_MVP_VERTICAL_SLICE`

Current mode:
- `HOLD / STRUCTURAL_EVIDENCE_ELIGIBILITY_REPAIR_CLOSED / TASK_2D_REPLAY_NEXT`

Current task ledger:
- Task 1 - Atomic Evidence Extraction: `CLOSED`
  - authoritative implementation commit: `b2ba34d18574f49ec22c852c99e640a1d306fad6` (`fix(career): preserve work evidence across resume sections`)
  - later non-work sections terminate work extraction without becoming evidence
  - work evidence survives transitions into Education, Skills, and Qualifications
  - end-of-document flush remains correct
  - employer/title remain provenance only; technology and self-declared skill lists remain excluded
  - the architecture-correct `WORK EXPERIENCE -> one work bullet -> EDUCATION` result is one professional evidence record, not two
- Task 2A - Structured Inference Gap Audit: `CLOSED`
  - first writable fault: `STRUCTURED_CONTRACT_MISSING`
  - audit artifact: `artifacts/career-possibility/career-map-mvp-task2-structured-inference-gap-audit.md`
  - audit SHA256: `9313BA0966C1D9FD25A6ABD7E11481069FDC19F12B7FFD505F0907DCDD70D3ED`
- Task 2B - Provider-Neutral Structured Inference Foundation: `CLOSED`
  - authoritative implementation commit: `a52466061489a747e5dfb1cc834cbbf2244a5c2c` (`feat(career): add structured capability inference contract`)
  - provider-neutral contract and injectable producer boundary reuse existing canonical capability and atomic evidence identities
  - deterministic validation accepts zero to three assessments per evidence result; more than three rejects that entire evidence result without truncation
  - independently valid evidence results in the same batch survive another result's failure
  - unknown evidence/capability IDs, blank rationales, duplicate results/assessments, conflicting support, and malformed output fail closed at the appropriate boundary
  - support assessments are exactly `directly_supported` and `transferable_support`
  - validator does not require a deterministic signal and raw provider output cannot mutate personal state
- Task 2C-A - Production Integration Admission Audit: `CLOSED`
  - immutable audit artifact: `artifacts/career-possibility/career-map-mvp-task2c-production-integration-admission.md`
  - audit SHA256: `F55DBD9CD80CFD01FA6E60F87905ED7D205E78D4F3662B0740C8A2860EC40D5E`
- Task 2C Architecture Decision Lock: `CLOSED BY CONTROL COMMIT`
- Task 2C Persisted Mapping Provenance Decision Lock: `CLOSED BY CONTROL COMMIT`
- Task 2C-B - Production Structured Capability Inference Integration: `CLOSED`
  - authoritative implementation commit: `fb8ce5e4edcd4836bf87f1a59d697e482e69e7c9` (`feat(career): integrate structured capability inference`)
  - production structured inference, the no-signal path, truthful structured mappings, and deterministic/structured arbitration are connected through the existing materializer and state
- Task 2D prerequisite decorated-section privacy repair: `CLOSED`
  - authoritative implementation commit: `3f4e82ffb1e44c71524fae21f4d3d1fd14e75f69` (`fix(career): exclude decorated resume sections`)
  - privacy eligibility boundary: `RESTORED`
- Task 2D prerequisite employment-metadata privacy repair: `CLOSED`
  - authoritative implementation commit: `20d91d21920a66218421321786df671d06f0012f` (`fix(career): exclude employment metadata from evidence`)
  - employment metadata: `PROVENANCE_ONLY`; role-title-only and employer-only evidence: `PROHIBITED`
- Task 2D attempt #3 - Post-privacy-repair real-CV replay: `INVALID`
  - invalid category: `UNCLASSIFIED_STANDALONE_EMPLOYMENT_ROLE_DESCRIPTOR`
  - first drift point: `ATOMIC_EVIDENCE_ELIGIBILITY`
  - two standalone role descriptors entered eligible evidence through `segmentCandidates()` fallback after `employmentBoundaries()` did not classify them
  - provider calls: `0`; no validation artifact was created; no capability conclusions are admissible
- Task 2D structural evidence eligibility decision: `CLOSED`
- Task 2D structural evidence eligibility repair: `CLOSED`
  - authoritative implementation commit: `b2e7d483328f35aecb203d8a5d008b128be2c817` (`fix(career): require positive evidence admission`)
  - positive admission owner: `qualifiesAsPerformedProfessionalEvidence()`
  - one prior unguarded fallback admission path removed; employment-relevant unguarded fallback paths remaining: `0`
- Task 2D - Privacy-Safe / Founder-CV Capability Coverage Validation: `REPLAY NEXT / NOT COMPLETE`
- Task 3 - Neural-network personal + role graph: `LATER / NOT AUTHORISED`
- Task 4 - Real-CV end-to-end visual validation: `LATER / NOT AUTHORISED`

Governing Task 2 boundary:
- atomic evidence -> evidence eligibility boundary -> Career Capability LLM -> Career-Map-specific strict structured output -> deterministic schema/canonical-ID/evidence-link validation -> canonical capability proposals -> existing canonical personal capability inference/proposal boundary -> existing materializer and provisional personal state
- the LLM is a structured inference producer, not the truth owner
- accepted proposals use existing canonical capability IDs and exact atomic evidence IDs; zero proposals is valid
- raw model output cannot write directly to personal state
- deterministic signals remain a high-precision, guardrail, QA/debug, and corroboration channel, but are not the mandatory capability gateway
- company, title, role/JD semantics, and unsupported role requirements cannot create personal capability
- existing canonical inference, materializer, and state owners must be reused

Locked Task 2C Founder/EM decisions:
- production execution is authorised as `browser -> CareerTwin same-origin server route -> server-only external model provider -> Task 2B deterministic validator -> validated proposals`; provider credentials must remain server-side
- transmitted personal evidence is limited to `{ evidenceId, evidenceText }`; canonical context is limited to existing `{ id, label, family }` plus required contract/content versions
- raw CV files, complete extracted CVs, employer names, job titles, education, qualifications, skills-section content, contact information, and unrelated résumé metadata are forbidden semantic model input
- CareerTwin application code must not intentionally persist or log submitted evidence, constructed prompts containing evidence, or raw provider responses; ordinary evidence-free technical request metadata remains governed by existing infrastructure behavior
- user-facing browser-only/device-only claims must be minimally corrected when Task 2C becomes active; no unverified zero-retention claim may be made about the external provider
- cross-channel relationship identity is `evidenceId + canonicalCapabilityId`, with at most one admitted relationship per pair
- same-pair/same-support proposals deduplicate to one relationship; same-pair/different-support proposals retain the governed deterministic relationship and reject the conflicting structured proposal, with only optional ephemeral diagnostics
- deterministic inference is not a mandatory gateway: a valid structured proposal may be admitted when no deterministic proposal exists for that pair
- structured proposals must remain truthfully distinguishable from deterministic proposals; no fake deterministic signal, universal signal, or `mappingRuleId` may be invented, and only the smallest proposal/admission-boundary provenance extension is authorised if required
- the Task 2B provider-neutral contract, fan-out maximum of three assessments per evidence, no-truncation rule, validation boundary, and fail-closed semantics remain authoritative
- earlier browser-local-only V1/runtime statements are historical and superseded only for the authorised transmission of eligible minimized Task 2C evidence; all other privacy and persistence boundaries remain in force

Locked Task 2C persisted mapping provenance decision:
- the existing persisted mapping surface is authorised for the smallest additive discriminated extension supporting `method: "authored_deterministic"` and `method: "structured_inference"`
- authored deterministic mappings retain all existing behavior and continue to require their real `matchedRuleId`
- structured mappings represent only Task 2B-validated structured relationships and must omit `matchedRuleId`; null, blank, provider-specific, and synthetic rule IDs are prohibited
- a structured-only relationship may persist in the existing Career Map state with its exact evidence ID, canonical capability ID, and governed relationship state
- same-pair/same-support cross-channel output persists once, preferring the already-governed deterministic mapping; conflicting support also retains deterministic and rejects structured, with any conflict diagnostic remaining ephemeral
- provider/model identity, prompt, raw response, grounding rationale, validation envelopes, confidence, fake signals, fake mapping rules, and conflict diagnostics do not enter persisted state
- the existing Career Map state and materializer remain the only authoritative persistence/materialization owners; no second mapping ontology, state collection, or materializer is authorised
- the extension is additive and backward-compatible; existing deterministic mappings require no migration, and any schema version change must follow repository policy without broad migration or unrelated redesign

Task 2C-B durable production state:
- structured inference is `CONNECTED` through `/api/career-map/capability-inference`, owned by `app/api/career-map/capability-inference/route.ts`
- the server provider adapter is `lib/career-possibility/career-capability-structured-inference-gemini-provider.ts`; the current `GoogleGenAI` / `gemini-3.6-flash` selection is an implementation detail, not semantic authority
- the browser producer is `lib/career-possibility/career-capability-structured-inference-api-producer.ts` and sends only `{ evidenceId, evidenceText }` through the same-origin server path; provider credentials remain server-only
- `validateCareerCapabilityStructuredInferenceResponse()` remains authoritative before any structured assessment becomes a mapping; zero assessments remain valid and the fan-out maximum remains three without truncation
- `adaptValidatedStructuredCapabilityMappings()` creates only truthful `method: "structured_inference"` mappings without `matchedRuleId`; `method: "authored_deterministic"` remains active and requires its real `matchedRuleId`
- `mergeDeterministicAndStructuredMappings()` is the single cross-channel merge owner using `evidenceId + canonicalCapabilityId`; same-support output deduplicates to deterministic, and conflicts retain deterministic while rejecting structured
- eligible evidence with no deterministic signal may now receive a validated structured canonical mapping in production; `NO DETERMINISTIC SIGNAL != NO PERSONAL CAPABILITY` is active
- structured provider failure admits zero structured mappings while the deterministic channel and existing materialization may continue
- the existing materializer and Career Map state remain authoritative; no parallel state or materializer exists, and the additive schema remains `2.0.0`
- raw provider responses, provider/model identity, fake signals, and fake matched rule IDs are not persisted

Task 2D prerequisite privacy repair #1 durable state:
- first drift point: `ATOMIC_EVIDENCE_ELIGIBILITY`
- root cause: `DECORATIVE_PREFIX_NOT_NORMALIZED`; the observed headings were `◇ Education` and `◇ Skills`
- heading-only comparison normalization removes leading whitespace and non-semantic decorative glyphs before applying the existing exact known-heading semantics; stored evidence text is not rewritten and broad substring matching was not introduced
- decorated known non-employment headings now terminate employment evidence boundaries while preserving preceding valid work evidence; Education and Skills-section content are not eligible evidence and cannot enter the structured-inference provider payload
- the production privacy eligibility boundary is `RESTORED`; employer and title provenance also remain excluded from the provider payload
- the first Task 2D real-CV run is `INVALID_FOR_CAPABILITY_COVERAGE_ASSESSMENT` because its structured-inference input was contaminated by Education and Skills content before the repair
- no capability-count, coverage, over-inference, under-inference, or product-readiness conclusion may be derived from that run
- repair #1 remains `CLOSED`; decorated Education and Skills headings and their content remain excluded

Task 2D prerequisite privacy repair #2 durable state:
- authoritative implementation commit: `20d91d21920a66218421321786df671d06f0012f` (`fix(career): exclude employment metadata from evidence`)
- first drift point: `employmentBoundaries()`; root cause: `FALLBACK_EVIDENCE_ADMISSION_AFTER_METADATA_CLASSIFICATION`
- a multiline employer, role-title, and standalone-date header was not being assembled into an employment boundary, allowing fallback evidence handling to admit metadata as work evidence
- `employmentBoundaries()` now reuses the existing `dateRange` and `companySuffix` employment/provenance semantics to construct the multiline boundary; evidence begins after the header
- employment metadata is `PROVENANCE_ONLY`: role title may annotate evidence but role-title-only evidence is prohibited; employer may annotate evidence but employer-only evidence is prohibited
- valid work bullets and supported fallback/prose work evidence remain eligible; no title dictionary, fuzzy title heuristic, downstream value-equality filter, provider filter, or new role-title ontology was introduced
- structured-inference transport remains exactly `{ evidenceId, evidenceText }`; verified exclusions include role-title-only metadata, employer-only metadata, Education headings/content, and Skills headings/content
- the second Task 2D attempt is `INVALID_FOR_CAPABILITY_COVERAGE_ASSESSMENT`; it stopped before provider transmission when role-title metadata was found in eligible producer input
- no capability-count, inventory, coverage, over-inference, under-inference, or Task 3 readiness conclusion may be derived from either of the first two Task 2D attempts
- neither privacy repair changed inference, provider, validator, mapping, merge, materializer, state, ontology, Role Knowledge, graph, or rendering architecture

Task 2D structural evidence eligibility durable state:
- implementation commit: `b2e7d483328f35aecb203d8a5d008b128be2c817` (`fix(career): require positive evidence admission`)
- atomic evidence uses positive admission: `NOT CLASSIFIED AS METADATA != VALID PROFESSIONAL EVIDENCE`
- metadata and provenance classification is terminal for evidence eligibility; classified metadata cannot later fall through into evidence emission
- an unclassified candidate must still positively satisfy the existing performed-professional-activity semantics before it can become evidence
- ambiguous metadata-like standalone candidates fail closed to non-evidence; privacy and semantic truth take precedence over evidence count
- title dictionaries, capitalization guesses, fuzzy title heuristics, LLM title classification, provider-side filtering, value-equality filters, and one-off handling of the observed descriptors are not authorised
- valid work bullets and legitimate supported fallback/prose performed-work evidence must remain eligible; positive admission does not mean `non-bullet = reject`
- admitted evidence text remains unchanged under existing extractor conventions
- the structured producer remains downstream of and continues to trust upstream evidence eligibility; transport remains exactly `{ evidenceId, evidenceText }`
- `qualifiesAsPerformedProfessionalEvidence()` is the authoritative extractor-local admission gate; it guards the sole evidence-record emission path after `employmentBoundaries()` and `segmentCandidates()`
- one prior unguarded fallback admission path was removed; employment-relevant unguarded fallback admission paths remaining: `0`
- synthetic extractor and production-transport regressions verified that valid bullets and supported prose survive while employer/title/date metadata, decorated Education/Skills content, and an ambiguous standalone descriptor do not reach the structured producer
- Task 2D attempts #1, #2, and #3 are invalid; attempt #3 made `0` provider calls; no admissible Task 2D capability baseline exists yet
- the structural eligibility repair is `CLOSED`; field-specific privacy repair #3 was not used; Task 2D replay is next

MVP sequencing boundaries:
- the Founder neural-network Career Map model remains governing: You is central; personal evidence grounds personal capabilities; user and generic roles share canonical capability nodes; unsupported role requirements remain role-only gaps; role radius will express meaningful capability overlap
- Role Knowledge is `MVP_SUFFICIENT`; further Role Knowledge enrichment is not currently required for MVP
- second-source triangulation is `DEFERRED_POST_MVP_QUALITY_WORK`
- no Wave 3 Role Knowledge work is authorised
- no semantic or research lane supersedes this MVP vertical-slice path without explicit Founder/EM reprioritisation

### Historical / superseded active-line context

The following Wave 2 material is retained as accepted history. Its coverage-vs-triangulation question and milestone-local next actions do not govern the current MVP execution path.

Historical primary line:
- `CAREER_MAP_MVP / ROLE_KNOWLEDGE_ENRICHMENT`

Historical mode:
- `HOLD / WAVE_2_CLOSED`

Historical task type:
- Wave 2 Role Knowledge enrichment is closed; next semantic-phase choice is pending Founder/EM decision

Historical open question (superseded for MVP routing):
- Should the next authorized semantic phase expand source coverage across the remaining 17 ENRICHMENT capabilities, or triangulate the 16 WEAK/TARGETED capabilities with independent second-source evidence?

Current Wave 2 closure:
- Status: `CLOSED`
- Implementation commit: `ecb77b52dc537b9aa958f23d7194689568fdea34` (`feat(career): enrich wave 2 role evidence semantics`)
- Roles enriched: `fpa-manager`, `program-manager`, `education-program-lead`
- Canonical capabilities enriched: `forecasting`, `variance-analysis`, `dependency-management`, `risk-controls`, `education-delivery`, `education-partnerships`
- Measured movement: 6/6 `INSUFFICIENT -> WEAK` and 6/6 `ONTOLOGY_ENRICHMENT_REQUIRED -> TARGETED_REVIEW_CANDIDATE`
- Target non-boilerplate expectedEvidence: 0 -> 6
- Non-target source-state changes: 0
- Existing AUTO regressions: 0
- Pre-existing TARGETED regressions: 0
- Structural conflict signals among the six: 0
- Routing contradiction signals among the six: 0
- Topology: unchanged
- Canonical ontology, semantic policy, and compiler/scanner implementation: unchanged
- Outstanding Wave 2 repair: none
- The stale-current-state diagnostic test incident is closed. Historical fixture replay retains fixed history; current repository tests reconcile dynamically with current source, topology, classifier, and aggregate state.

Current authoritative source census:
- Sufficiency: `STRONG 8 / MODERATE 10 / WEAK 16 / INSUFFICIENT 17`
- Routing: `AUTO 18 / TARGETED 16 / ENRICHMENT 17 / CONFLICT 0`
- This supersedes the Wave 1 current-state census without rewriting the historical Wave 1 measurement.

Next-state lanes:
- Lane A - AUTO: 18 capabilities
- Lane B - TARGETED: 16 capabilities; partial support requiring triangulation or second-source evidence before stronger confidence
- Lane C - ENRICHMENT: 17 capabilities; still source-starved and eligible for governed Role Knowledge enrichment
- Lane D - CONFLICT: 0 capabilities

Decision boundary:
- Wave 3 is not authorized.
- Control closure does not choose between coverage expansion and triangulation.
- `WEAK` is not canonical semantic admission, `TARGETED` is not `AUTO`, and one role source does not establish strong confidence or a universal semantic definition.

Completed Career Map milestones:
- `CAREERTWIN_NEURAL_CAREER_MAP_RENDERER_SLICE_ESTABLISHED`
  - Implementation commit `815b10f` (`feat(career): add neural career map renderer slice`)
  - Three files: `CareerMapNeuralGraph.tsx` (CREATE), `LocalCareerMapWorkspace.tsx` (MODIFY — graph tab only), `career-map-neural-graph.test.ts` (CREATE)
  - Runtime injection: existing `personal.presentation` → `buildPersonalTargetRoleComparison()` (analytics-manager, stable `find()` by `roleFamilyId`) → `buildCareerMapGraphProjection()` → renderer. No second localStorage read.
  - Progressive disclosure: You + families + role visible by default; capabilities revealed on family select; evidence revealed on capability select; requirements revealed on role select
  - Unsupported role requirements appear as role-side `role_requirement` nodes only — never as personal capability nodes (tested in test B)
  - No employer/roleTitle provenance, fitScore, fitLabel, rank, Future Paths rail, or demo fixture imported
  - Renderer tests A–F passed; 44/44 career-possibility tests clean; 1 pre-existing HOLD failure unchanged
  - ESLint clean, TypeScript clean, production build clean, `git diff --check` clean on admitted files
  - No HOLD file touched; all 13 tracked HOLD-dirty and 21 untracked HOLD items preserved
- `CAREERTWIN_CAREER_MAP_GRAPH_PROJECTION_ESTABLISHED`
  - Implementation commit `157df6f` (`feat(career): add career map graph projection`)
  - Two new files only: `lib/career-possibility/career-map-graph-projection.ts` and `tests/career-possibility/career-map-graph-projection.test.ts`
  - Projection is presentation-only and ephemeral; it derives a typed graph model from existing committed owners
  - `groupPersonalCapabilitiesByFamily()` uses `canonicalCapabilityFamilyLibrary` as the authoritative family grouping; only families with ≥1 admitted personal capability are emitted
  - `buildCareerMapGraphProjection()` accepts `PersonalCareerMapPresentation` + optional `CareerMapRoleInput` (pre-computed `PersonalTargetRoleComparison`); produces typed nodes + edges for: user, capability_family, capability, evidence, role, role_requirement
  - Evidence nodes use committed fields only (`text`, `relationship`, `evidenceId`, `sourceStart`/`sourceEnd`); no `employer`/`roleTitle` (HOLD-only provenance) consumed
  - Role requirement states come from existing `buildPersonalTargetRoleComparison()` output: `directly_demonstrated`, `transferable_signal`, `evidence_not_yet_shown`; `governance_deferred`/`governance_excluded` filtered from graph
  - Unsupported-requirement invariant enforced: a role requirement for a capability absent from the user's personal set appears as a `role_requirement` node with `evidence_not_yet_shown`; it is NEVER added to personal `capability` or `capability_family` nodes
  - All 8 focused tests passed (A–H covering family grouping, evidence grounding, no fabricated capability, role states, unsupported invariant, no provenance dependency, role optional)
  - All 42 career-possibility tests passed (1 pre-existing HOLD failure in `resume-evidence-text-extractor.test.ts` is caused by HOLD-modified extractor breaking committed test; not caused by this slice)
  - ESLint clean, TypeScript clean, production build clean, `git diff --check` clean on new files
  - No HOLD file was touched; all HOLD dirt preserved exactly untouched and unstaged
  - No UI graph was implemented; no `app/career-map/page.tsx` was modified; no `CareerMapNeuralGraph.tsx` created
  - No Job Copilot, fitScore, fitLabel, rank, or JD semantics introduced
  - No employer/roleTitle provenance consumed
  - canonical family library remains family authority; `PersonalCareerMapPresentation` remains personal capability state authority; `buildPersonalTargetRoleComparison()` remains role-requirement-state authority
- `CAREERTWIN_MANAGED_REQUIREMENTS_EVIDENCE_STANDARD_REPAIRED`
- implementation `a9e7a06` (`fix(career): tighten managed requirements evidence`) tightens `signal/action/managed-requirements` from ruleVersion `1.3.0` to `1.4.0` and advances signal policy from `1.5.0` to `1.6.0` while retaining 48 rules
- `gathered` is removed from the performed-work alternatives; the rule now admits only `managed|defined|owned|prioritised|prioritized` requirements plus the owned product/platform/workflow/service requirements fallback
- new exclusion patterns reject delegated team/analyst/consultant/staff/vendor/engineer/developer/contractor/specialist gathering, documenting, collecting, defining, prioritising, or managing requirements, and reject process/workflow/programme-for-requirements-gathering/collection/management/definition phrasing
- gathering, collection, documentation, facilitation, interviewing, workshops, passive-defined, helped-define, supported, contributed, reviewed, received, worked-with, responsible, experience, and skills phrasing no longer emit `managed_requirements`
- valid management remains admitted: managed requirements, defined+owned product requirements, owned platform requirements, prioritised/prioritized requirements, and owned product/platform/workflow requirements with delivery-quality coordination
- the governance test now records `governed_delivery_quality` as `DEFER_COMPOSITE_EVIDENCE_STANDARD`, aligning the test with the already-accepted governance decision from `CAREERTWIN_DELIVERY_QUALITY_CANONICAL_MAPPING_GOVERNED`; no semantic behavior changed for that token
- no canonical capability, mapping rule, role profile, canonical inference, extractor, state/storage, materializer, UI, Job Copilot/server, API/Supabase/package, review, or supplementation behavior changed
- focused tests, all 42 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`
- next action: Hold after managed-requirements evidence repair. Govern whether `managed_requirements` can map to an existing canonical building block before adding infinitive `manage`.
- `CAREERTWIN_DELIVERY_QUALITY_CANONICAL_MAPPING_GOVERNED`

- final decision: `GOVERNED_NO_CHANGE`; final classification: `DEFER_COMPOSITE_EVIDENCE_STANDARD`; no mapping, ontology, signal, state, or UI change was made
- the atomic `governed_delivery_quality` token was governed against the existing canonical capability library; no mapping was admitted and no file changed
- the token alone does not safely prove any existing canonical capability: it is an atomic delivery-quality governance dimension that requires an additional independently emitted signal before it becomes capability evidence
- audited candidates (operating-control, risk-controls, analytics-governance, roadmap-governance, architecture-governance, policy-governance, regulatory-compliance, process-improvement, service-performance, cross-functional-delivery, business-ownership) each fail because the token lacks the required formal control, risk, metric, roadmap, architecture, policy, regulatory, implemented-change, service-outcome, multi-function, or P&L semantics
- the token remains `unsupported/no_canonical_rule`; the prior authoritative founder result remains two capabilities/two nodes (`analytics-governance`, `insight-synthesis`)
- the private real founder file was unavailable for a fresh replay in this cycle; the committed synthetic fixture is non-comparable to the private founder CV and must not be described as the real founder CV
- signal policy remains `1.5.0`/48 rules and mapping policy remains `1.3.0`/11 rules; no canonical capability, role profile, canonical inference, extractor, state/storage, materializer, UI, Job Copilot/server, API/Supabase/package, review, or supplementation behavior changed
- read-only governance verification and `git diff --check` passed; mode returned to `HOLD`
- next action: Audit and repair the over-broad `managed_requirements` evidence standard, especially the incorrect admission of `gathered requirements`, before adding infinitive `manage`.
- `CAREERTWIN_DELIVERY_QUALITY_MANAGEMENT_INFINITIVE_SIGNAL_REPAIRED`
- requirements and delivery-quality morphology were audited separately; requirements remains deferred because its current rule already over-admits `gathered requirements`
- implementation `9b5c80d` (`fix(career): admit infinitive delivery quality management`) adds only a narrow relation-bound `manage` branch to `signal/action/governed-delivery-quality` and advances signal policy from `1.4.0` to `1.5.0` while retaining 48 rules
- direct quality objects and bounded requirements/product-delivery coordination are admitted; delegated teams, ordinary QA execution, other morphologies, current finite forms, ownership fallback, distances, punctuation, exclusions, and composability remain governed as before
- privacy-safe CV A replay retains 33 evidence and changes `governed_delivery_quality` from zero to one; ownership remains one, requirements remains zero, and structured/unsupported/unresolved remain 5/27/1
- no canonical capability or mapping was added, so the founder Career Map remains `analytics-governance` and `insight-synthesis`; CV B remains unchanged
- no requirements, extractor, state/storage, materializer, UI, Job Copilot/server, API/Supabase/package, review, or supplementation behavior changed
- focused tests, founder replays, all 42 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`
- next action: Hold after delivery-quality infinitive repair. Govern whether `governed_delivery_quality` can map to an existing canonical capability before repairing requirements evidence standards.
- `CAREERTWIN_BUSINESS_FRAMING_INFINITIVE_SIGNAL_REPAIRED`
- wrapped-bullet extraction repair was already complete; the next proven false negative was infinitive business framing
- implementation `7162c92` (`fix(career): admit infinitive business framing`) adds only `translate` to the existing `framed_business_problem` action alternatives and advances signal policy from `1.3.0` to `1.4.0` while retaining 48 rules
- business-problem object, analytical-output, order, distance, punctuation, hypothetical/requirement, and conflict guards remain; no other morphology or broad token was admitted
- privacy-safe CV A replay retains 33 evidence and changes the framing token from zero to one; structured/unsupported/unresolved remain 5/27/1
- no canonical capability or mapping was added, so the founder Career Map remains `analytics-governance` and `insight-synthesis`
- adoption, requirements, delivery quality, anomaly, root cause, pattern, and standardisation issues remain separate; no extractor, state/storage, materializer, UI, Job Copilot/server, API/Supabase/package, review, or supplementation behavior changed
- focused tests, founder replay, all 42 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`
- next action: Hold after framing infinitive repair. Govern whether `framed_business_problem` can map to an existing canonical building block before repairing another founder signal.
- `CAREERTWIN_WRAPPED_RESUME_BULLET_EVIDENCE_PRESERVED`
- the coverage-loss diagnostic separated four correct broad-token removals from four true-positive losses and identified PDF wrapped-bullet fragmentation as the first upstream repair boundary
- implementation `4b0ae92` (`fix(career): preserve wrapped resume bullet evidence`) keeps structurally safe contiguous bullet continuations in one source-provenanced record while preserving independent bullets, blank boundaries, headings, employment/date transitions, and standalone prose
- composed evidence preserves raw text order, contiguous offsets, deterministic identity, and `unreviewed` trust; unchanged single-line evidence retains its prior identity form
- privacy-safe replay: CV A remains 33 evidence and the same two capabilities; CV B changes from 33 fragmented records to 20 composed records, with E03/E04, E13/E14, and E29/E30 each recomposed and the same three unique capabilities retained
- investigation morphology and other bounded-rule defects remain separate; no signal/mapping/ontology/state/UI behavior was changed
- focused tests, all 42 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`
- next action: Hold after wrapped-bullet evidence repair. Re-run the founder refined-signal trace and audit only the remaining morphology and bounded-predicate false negatives before changing any signal rule.
- `CAREERTWIN_REFINED_UNIVERSAL_TOKENS_MAPPED_TO_CANONICAL_CAPABILITIES`
- implementation `2cf9672` (`feat(career): map refined signals to canonical capabilities`) reuses the existing 51-ID ontology and plural inference, governing all 14 refined tokens under mapping policy `1.3.0` with 11 rules
- exactly `built_reusable_tooling -> tooling-enablement -> transferable_signal` is admitted; it does not claim adoption or a complete enablement outcome
- 13 tokens remain explicitly deferred: seven for signal-evidence standards, two for canonical definition, and four ontology gaps; no profile-local requirement was promoted and `owned_product_or_service` remains unmapped
- privacy-safe founder replay remains unchanged: CV A has 33 evidence and capabilities `analytics-governance`, `insight-synthesis`; CV B has 33 evidence and capabilities `insight-synthesis`, `people-leadership`, `strategic-analysis`
- signal policy remains `1.3.0`/48 rules; no ontology, role-profile, canonical-inference, parser, state/storage, materializer, UI, Job Copilot/server, API/Supabase/package, review, or supplementation change occurred
- all 42 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`
- next action: Hold after refined-token mapping. Audit the former broad-token founder evidence that no longer emits refined tokens before changing any signal threshold.
- `CAREERTWIN_DEFERRED_SIGNALS_DECOMPOSED_INTO_UNIVERSAL_TOKENS`
- implementation `e02e4c2` (`refactor(career): decompose broad evidence signals`) reuses the universal ontology and plural inference while replacing four domain-labelled parent signals with 14 narrower performed-work tokens under signal policy `1.3.0`
- admitted dimensions cover business-problem framing and explicit advice; product/service ownership, requirements, prioritisation and delivery-quality governance; anomaly, root-cause and meaningful-pattern investigation; reusable tooling, recurring automation, workflow standardisation, platform adoption and designed AI-assisted workflow
- all four broad parents are retired from active vocabulary and are not emitted alongside children; composable refined rules allow independently explicit tokens to coexist, while existing exclusive-rule ambiguity remains fail-closed
- every emitted semantic token receives its own deterministic identity in addition to the existing aggregate signal identity; evidence ID, locator and `unreviewed` status remain unchanged
- privacy-safe replay: CV A remained at 33 evidence and emitted one `owned_product_or_service` refined token; CV B remained at 33 evidence and emitted no refined token because its former investigation/workflow language did not meet the narrower thresholds; both broad-parent counts became zero and no capability was added
- no canonical capability, mapping rule, role profile, canonical inference, parser, state/storage, materializer, UI, Job Copilot, API/Supabase/package, review, or supplementation behavior changed
- cross-role fixtures and focused signal coverage, all 41 Career Possibility test files, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`
- next action: Hold after universal token decomposition. Govern mappings from the refined tokens into existing canonical capability building blocks using evidence-specific positive and negative fixtures.
- `CAREERTWIN_CANONICAL_MULTI_PROPOSAL_INFERENCE_ESTABLISHED`
- the existing 51-ID canonical ontology, 22 role profiles, plural materializer/state structures, and shared Career Map skeleton were reused; no ontology rebuild occurred
- implementation `f53e5c0` (`refactor(career): support plural canonical capability proposals`) adds versioned inference contract `2.0.0`, groups authored matches by canonical capability, coalesces same-capability/same-relationship rules, and scopes relationship conflicts per capability
- one evidence can now produce multiple independently justified proposals; unrelated valid proposals survive a conflicted capability, while proposal identity, evidence identity, source revision, deterministic ordering, and trust neutrality remain preserved
- the v1 singular inference and provisional mapper remain explicit compatibility surfaces; browser-local text orchestration consumes the plural mapping-result projection and reuses the unchanged materializer/state/Career Map path
- no canonical capability, role profile, signal token/rule, mapping rule, parser, state/storage schema, materializer implementation, UI, Role Lens, Job Copilot, API/Supabase/package, review, or supplementation behavior changed
- focused plural/compatibility/projection tests, all 40 Career Possibility test files, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`
- next action: Hold after plural canonical inference. Audit and refine the four broad deferred evidence signals into existing universal capability building blocks before admitting any new mapping.
- `CAREERTWIN_DEFERRED_FOUNDER_CAPABILITY_MAPPINGS_GOVERNED`
- founder validation confirmed the shared skeleton was correctly rendering real data; the remaining sparsity was traced to deferred semantic mappings, not presentation
- implementation `3bb9fd2` (`feat(career): govern deferred founder capability mappings`) admits exactly `designed_measurement_framework -> measurement-design -> direct_evidence` and advances the bounded mapping policy from `1.1.0` to `1.2.0` with ten rules
- `provided_analytics_business_advice`, `owned_analytics_product`, and `performed_investigative_analysis` remain deferred pending exact canonical capability expansion; `enabled_analytics_workflow` requires token refinement before mapping
- privacy-safe replay found no `designed_measurement_framework` token in the currently displayed founder CV, so its capabilities remain `analytics-governance` and `insight-synthesis`; no richer-map claim or browser node check was made
- no signal policy, canonical library, inference owner, parser, state/storage, materializer, UI, API/Supabase/package, Job Copilot, review, or supplementation behavior changed
- focused governance and mapping tests, all 38 Career Possibility test files, exact-file ESLint, TypeScript, production build, and `git diff --check` passed; mode returned to `HOLD`
- next action: Hold after deferred mapping governance. Founder re-uploads both CVs and validates the richer personal Career Map before any canonical capability expansion, unmapped-experience visibility, or review workflow is admitted.
- `CAREERTWIN_PERSONAL_STATE_CONNECTED_TO_CAREER_MAP_SKELETON`
- founder confirmed the original `CapabilityExplorer` skeleton is the intended result product; the flat personal card renderer was an integration detour
- implementation `e6bb584` (`feat(career): connect personal state to career map skeleton`) establishes a shared explorer view-model contract, keeps Hero mock data and personal real data separate, and routes the existing validated personal presentation through the shared skeleton
- personal canonical capability IDs, labels, families, evidence IDs, source spans, direct/transferable relationships, and reviewed/provisional status are preserved; no capability or evidence is invented
- personal mode hides absent Future Paths and Proof-to-build data rather than reusing demo content; deterministic sparse layouts cover 2/4/6/8+ nodes, with a compact mobile Experience Core interpretation
- Role Lens remains the existing governed comparison behind the peer tab; a same-map overlay remains unimplemented because no admitted comparison-to-map adapter currently owns it
- state, storage, inference, mapping, parser, root upload, API/Supabase/package, Job Copilot, review, and supplementation behavior are unchanged
- next action: Hold after personal-skeleton integration. Founder validates that uploaded CV capabilities and evidence now appear in the intended Career Map before any deferred mappings, unmapped-experience visibility, or review workflow is admitted.
- `CAREERTWIN_POST_UPLOAD_CAREER_MAP_SIMPLIFIED`
- implementation `2b94fa6` (`fix(career): simplify post-upload career map`) removes repeated management/trust framing from the loaded result, places capabilities directly below a compact Career Map / Role Lens view switch, and keeps evidence relationship/trust details available only through optional capability disclosure
- `/career-map` now has one `Your Career Map` heading and one short provenance line in the default personal state; Upload another CV and Clear Career Map are demoted into `Map options`, with the existing clear confirmation preserved and the permanent replacement warning removed
- the map remains personal-only and the Role Lens, proof guidance, empty/invalid states, storage, inference, mapping, ingestion, persistence, and Job Copilot authorities are unchanged
- persistent-Chrome checks passed the default view, optional detail open/close focus behavior, arrow-key tab selection/focus, Role Lens switch, six responsive viewports, and no horizontal overflow; focused tests, all 37 Career Possibility test files, exact-file ESLint, TypeScript, production build, and `git diff --check` passed
- next action: Hold after post-upload simplification. Founder validates the clean Career Map and optional capability-detail interaction before any deferred mapping or review workflow is admitted.
- `CAREERTWIN_FOUNDER_CV_CANONICAL_MAPPING_GROUP_A_ADMITTED`
- `CAREERTWIN_CANONICAL_PERSONAL_CAPABILITY_INFERENCE_OWNER_ESTABLISHED`
- `CAREERTWIN_FOUNDER_CV_SIGNAL_COVERAGE_REPAIRED`
- `CAREERTWIN_EVIDENCE_SIGNAL_COVERAGE_EXPANDED`
- `CAREERTWIN_REAL_CV_INGESTION_DIAGNOSTIC_COMPLETE`
- `CAREERTWIN_DIRECT_UPLOAD_BUILD_SLICE_3_COMPLETE`
- `CAREERTWIN_PROVISIONAL_BUILD_ORCHESTRATION_COMPLETE`
- `CAREERTWIN_EVIDENCE_SIGNAL_BRIDGE_COMPLETE`
- `CAREERTWIN_PROVISIONAL_STATE_SLICE_2B_COMPLETE`
- `CAREERTWIN_PROVISIONAL_MAPPING_SLICE_2A_COMPLETE`
- `CAREERTWIN_LOCAL_CV_EXTRACTION_SLICE_1_COMPLETE`
- `CAREER_MAP_V1_COMPLETE`
- `CAREER_MAP_V1_LANDING_STATE_HANDOFF_REPAIRED`
- `CAREERTWIN_V1_ROOT_INLINE_INTAKE_COMPLETE`
- `CAREERTWIN_V1_ENTRY_RESULT_ROUTES_CORRECTED`
- Group A is implemented at `f24daf34696fc9dd36cc0f4e114d7112402c9301` (`feat(career): admit founder cv canonical mapping group a`) with mapping policy `1.1.0` and exactly four new `direct_evidence` rules: `performed_strategic_analysis -> strategic-analysis`, `synthesised_executive_insight -> insight-synthesis`, `established_analytics_governance -> analytics-governance`, and `led_analytics_team -> people-leadership`
- the old/new Insight paths deterministically yield one `insight-synthesis/direct_evidence` relationship; different capability matches remain governed by the existing fail-closed singular-result contract
- privacy-safe real-file replay: CV A produced 33 evidence, 8 structured signals, 2 admitted mappings, 2 unique capabilities, 6 mapping-unsupported, 0 unresolved; CV B produced 33 evidence, 6 structured signals, 3 admitted mappings, 3 unique capabilities, 3 mapping-unsupported, 0 unresolved; both avoided `no_unambiguous_mappings`
- `designed_measurement_framework`, `provided_analytics_business_advice`, `owned_analytics_product`, `performed_investigative_analysis`, and `enabled_analytics_workflow` remain unmapped with `no_canonical_rule`
- no signal/capability/parser/state/storage/materializer/UI/Job Copilot/server-inference/API/Supabase/package expansion or migration occurred
- focused tests, privacy-safe replay, all 36 Career Possibility test files, exact-file ESLint, TypeScript, production build, and `git diff --check` passed
- next action: Hold after Group A mapping admission. Re-run the founder upload flow in the browser before governing the deferred measurement, business-advice, product-ownership, investigative-analysis, or workflow-enablement mappings.
- architecture reconciliation found two active role-independent inference authorities: the legacy server `inferCapabilities` owner and the direct-upload provisional mapper; Option C is accepted, with one canonical role-independent personal-capability inference owner and separate JD-conditioned Job Copilot retrieval/scoring
- implementation `402f352307775dbc3e25bbd4726bc67550177b6e` (`refactor(career): establish canonical personal capability inference owner`) extracts trust-neutral semantic inference into `canonical-personal-capability-inference.ts`; the provisional mapper is now a compatibility wrapper
- existing mapping identities, rule/provenance data, direct/transferable relationships, admitted/unresolved/unsupported behavior, and `unreviewed` wrapper output are preserved; trust/review remains outside canonical inference
- no mapping/signal/capability expansion, Job Copilot/server migration, state/storage/materializer, API/Supabase/package, parser, or UI change was introduced
- focused canonical and compatibility tests, the full Career Possibility suite, exact-file ESLint, TypeScript, production build, and `git diff --check` passed
- next action: Hold after canonical inference extraction. Admit only the obvious canonical mapping group after founder-signal-to-library governance is confirmed.
- accepted architecture: Model A (`browser-local CV parse -> provisional map -> optional review later`); Slice 2 is split into 2A (provisional mapping authority) and 2B (LocalCareerMapState v2 plus materialization)
- Slice 2A is implemented at `6066027` (`feat(career): add provisional capability mapping contract`) with contract/policy version `1.0.0`, five authored rules covering four canonical capabilities, and deterministic IDs derived without timestamps or randomness
- Slice 2A auto-admits only one exact authored structured-signal match; it keeps `direct_evidence` distinct from `transferable_signal`, routes conflicts and invalid inputs to `unresolved`, and returns no-rule cases as `unsupported`
- the focused audit confirms direct, transferable, ambiguous, unsupported, deterministic-ID, title/tool-independence, malformed-policy, malformed-evidence, and forbidden-dependency behavior
- Slice 2B is implemented at `94d8aa1` (`feat(career): add provisional career map state`): schema `2.0.0` separates `source=provisional_resume` from `mapTrustStatus=provisional`, while validated schema `1.0.0` reviewed states remain readable without rewrite
- the authoritative storage key remains `careertwin.local-career-map.v1`; both schemas dispatch by payload version, validate fully before serialization, and use one atomic `setItem` without clearing the prior state
- the versioned provisional materializer admits only Slice 2A `auto_admitted` mappings, groups direct and transferable references separately, retains unresolved/unsupported evidence inactive, derives deterministic lineage identity, and fails closed with zero capabilities
- pure presentation and Role Lens contracts expose provisional trust, accurate reviewed/provisional/unresolved counts, and `Not evidenced in your current CV-derived map.` semantics; existing `find_existing_proof` uncertainty remains authoritative
- Slice 3 remains unopened: no root upload, loading state, route/UI presentation, review control, or supplementation work was introduced
- the first Slice 3 admission stopped correctly at `BOUNDARY_FAILURE`: source-preserving résumé evidence did not yet contain the authored structured tokens required by Slice 2A, and root orchestration was not allowed to hide semantic interpretation
- the deterministic evidence-signal bridge is implemented at `ec94772` (`feat(career): add deterministic evidence signal bridge`) with contract/policy `1.0.0`, nine bounded tokens, and ten authored lexical rules including a non-emitting participation guard
- the bridge preserves evidence identity, source locator, excerpt, and `unreviewed` status; it creates no capability or mapping IDs and performs no UI, state, storage, network, LLM, embedding, or fuzzy work
- direct, transferable, insight-synthesis, cross-functional-delivery, and process-improvement fixtures flow directly into Slice 2A; competing action/ownership signals remain unresolved and uncovered evidence remains unsupported
- Slice 3 remains unopened pending a bounded full-chain orchestration audit
- the pure text-to-provisional-state orchestrator is implemented at `0968e70` (`feat(career): compose provisional career map build`), composing the existing extractor, signal bridge, Slice 2A mapper, and Slice 2B materializer without new semantic rules
- its structural adapter retains bridge ambiguity as inactive unresolved evidence and uncovered evidence as inactive unsupported evidence; it creates no fallback mapping, capability, review promotion, storage access, network call, or UI dependency
- the nine-fixture audit passed direct, mixed, transferable, admitted-plus-unsupported, admitted-plus-ambiguous, all-unsupported, all-ambiguous, title-only, and tool-only paths with `unexpectedly lost evidence = 0`
- deterministic valid schema `2.0.0` provisional state is now proven from extracted text; Slice 3 is admitted but not started
- browser-local PDF and DOCX extraction is admitted through `pdf-parse@2.4.5` and `mammoth@1.11.0`; PDF uses a same-origin bundled PDF.js worker, scanned/image-only PDFs are unsupported, and no OCR is introduced
- raw binary and extracted full text remain page-memory only; the extractor performs no fetch, API, Supabase, persistence, telemetry, or logging
- deterministic failures cover unsupported/mismatched types, empty/oversized files, protected or no-text PDFs, malformed documents, unavailable parsers, and bounded unexpected failures
- persistent-Chrome real-browser validation passed valid PDF and DOCX extraction with localhost-only bundle/worker requests, no `/api/parse-resume` or Supabase traffic, unchanged localStorage, empty IndexedDB/Cache Storage, and no runtime errors
- implementation commit: `ca573a2` (`feat(career): add browser-local CV text extraction`)
- Slice 3 is implemented at `ed1ac57` (`feat(career): add direct CV to career map flow`): `/` now combines a contained interactive example with one immediate PDF/DOCX upload action; local extraction composes into validated provisional state, one atomic browser-local write, and direct `/career-map` navigation.
- Persistent-CDP acceptance passed valid synthetic PDF and DOCX, both visible loading states, v2 provisional rendering, failure preservation, replacement semantics, responsive layouts, localhost-only traffic, and absence of service workers or Cache Storage.
- Slice 4 optional review and missing-experience interactions remain unopened.
- founder-CV signal coverage repair is implemented at `6de92f4` (`feat(career): expand founder cv signal coverage`) with policy `provisional-evidence-signal-policy/1.2.0`, 18 bounded tokens, and 45 authored rules
- privacy-safe real-CV replay improved Founder CV A from 2/33 to 8/33 structured evidence and Founder CV B from 0/33 in the accepted pre-trace to 6/31 in the current production-parser replay; no new signal was auto-admitted by the unchanged mapper
- nine new semantic tokens cover strategic analysis, executive insight synthesis, analytics governance, measurement-framework design, analytics business advice, analytics product ownership, people leadership, investigative analysis, and analytics workflow enablement
- all nine new tokens are intentionally unmapped pending mapping governance; they retain evidence identity, remain `unreviewed`, enter the unchanged mapper, and return bounded unsupported rather than creating capability claims
- parser/structure, mapping policy, canonical capability library, materializer, state/storage, UI, API, Supabase, packages, Slice 4, and supplementation remain unchanged
- next action: Hold after founder-CV signal repair. Audit structured signals against the existing canonical capability library before admitting mapping-policy expansion.
- release-readiness decision: `V1_RELEASE_READY_WITH_KNOWN_LIMITATIONS`
- final verified implementation baseline: `73a976bd67d1360814f893533e5f3812b84473c6`
- founder correction to the prior route misunderstanding: `/` owns product proposition plus résumé entry, while `/career-map` owns only the resulting personal Career Map or a compact no-map state
- root heading is `Your career, replicated.` beside the accepted plain-text intake; `Build my Career Map` submits into the existing extraction/review sequence without a navigation-only CTA
- fresh `/career-map` contains only `No personal Career Map has been created yet.` and one direct `Start with your résumé` action to `/`; it contains no landing hero, example map, capability network, example signals, or mock-ranked Future Paths
- active `/career-map` no longer imports or receives `CapabilityExplorer` or `mockCareerPossibility`; example fixtures remain available only outside the normal V1 journey
- applied `/career-map` remains personal-only with reviewed capabilities/evidence, calibrated Role Lens, comparison, Proof to build, Start here, and Next action
- persistent-CDP screenshots verified root entry, empty result, and applied personal result; the same persistent page passed edit/reject/restore, direct Apply, reload, replacement cancel/confirm, five viewport sizes, keyboard focus, zero overflow, zero console issues, and zero unexpected network requests
- entry/result correction commit: `73a976bd67d1360814f893533e5f3812b84473c6` (`fix(career): separate product entry from career map result`)
- focused route/state tests, all 28 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed
- V1 remains complete and mode returned to HOLD; no third landing/intake page or V2 work was introduced
- founder correction: V1 has two product states, not a passive landing plus separate intake plus Career Map; `/` is the product entry and `/career-map` is the applied personal state
- `/` preserves the side-by-side value proposition and directly embeds the accepted `ResumeTextIntakeWorkspace`; no navigation to another intake form is required before extraction
- the root flow reuses deterministic extraction, evidence inspection, `ResumeEvidenceReviewWorkspace`, shared-ingestion runtime preparation, replacement confirmation, and the authoritative atomic browser-local Career Map write
- successful root Apply now navigates directly to `/career-map`; failed extraction and cancelled replacement preserve the existing personal map
- the fake PDF/DOCX picker and `Frontend prototype`, `No backend connection yet`, and `mock only` copy were removed; V1 exposes only the genuinely supported plain-text path
- an existing personal map produces a direct return link and explicit replace-only disclosure on `/`; no append or supplementation behavior was introduced
- persistent-CDP Chrome validation passed fresh Apply, replacement cancel/confirm, extraction-failure preservation, final personal rendering, keyboard focus, and 1440×900, 1280×800, 768×1024, 390×844, and 375×667 layouts with no overflow, console issue, or unexpected network request
- root inline-intake implementation commit: `0b65bf6bee73acaefb39bdc4b7db15c37b4805af` (`fix(career): unify root intake with career map`)
- all 28 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed
- V1 remains complete; the legacy intake route remains compatible but is not part of the authoritative root journey
- founder self-validation identified a missing landing proposition, an implementation-language primary CTA, and stale example presentation after Apply
- root cause: the no-state presentation led with its example panel, while the client workspace reconciled browser-local Career Map state only on initial mount and could retain an absent result when a cached page was reactivated
- the no-state view now leads with `Your career, replicated.`, concise evidence-grounded supporting copy, and `Uncover your career map` linking to the existing résumé intake
- example content remains explicitly disclosed and secondary; the applied personal view excludes the example title, no-evidence message, mock badge, example-signal labels, and mock-ranked Future Paths
- the applied view renders reviewed personal capabilities and evidence plus the calibrated Role Lens, uses explicit replace-only re-import copy, and reconciles state on mount, focus, pageshow, cross-document storage change, and visibility restoration
- corrective implementation commit: `6d64c81c22788bcd7db480c6941ca56d4984fdc5` (`fix(career): restore landing and personal state handoff`)
- focused coverage, all 27 Career Possibility tests, exact-file ESLint, TypeScript, production build, `git diff --check`, full Apply/replacement/recovery QA, and five-viewport browser QA passed
- V1 remains complete; incremental supplementation and all V2 scope remain unopened
- release blocker count after repair and re-audit: `0`
- V1 is frozen as a browser-local, single-source reviewed import with explicit replace-only re-import
- the full intake, extraction, review/edit/reject, mapping, Apply, Career Map, four-role Role Lens, proof guidance, evidence navigation, and return-path journey passed
- blocker repair `6cee2f67a07cd1a852081b8391aadd39f8bc2faf` (`fix(career): admit reviewed field edits at apply`) supplies deterministic opaque semantic payload revisions through the existing browser runtime transport
- all 27 Career Possibility tests, tracked Career Map ESLint, TypeScript, production build, `git diff --check`, replacement/recovery QA, and browser QA at 1440×900, 1280×800, 768×1024, 390×844, and 375×667 passed
- accepted V1 limitations: single source, replace-only re-import, browser-local map, page-memory intake/review, no incremental supplementation, no cross-device/server persistence, four calibrated roles, and no ranking, evidence-quality diagnosis, progress tracking, or generated coaching
- the Model A incremental-supplementation architecture sequence remains V2 planning input only and is not started
- audit decision: the first material dead end was the absence of a visible continuation from reviewed evidence back to the Role Lens
- first drift point: evidence inspection completed but visible task continuity ended
- first writable fault: the Personal Capability Explorer lacked a reciprocal native anchor and the existing Role Lens heading was not programmatically focusable
- implementation commit: `1aacb62697ec21c295bfd3c96ad20d0f4ca67652` (`feat(career): add return path to role lens`)
- implementation boundary: `PersonalCapabilityExplorer.tsx`, `TargetRoleCapabilityComparison.tsx`, and `proof-building-action.test.ts` only
- a standalone proof-building-action authority consumes only valid `nextProofToBuild` and admits only `find_existing_proof`; `no_action_available` remains the deterministic abstention result
- fixed platform copy version `1.0.0` asks the user to look through past work and explicitly says Career Map does not know whether that experience exists
- no strengthen/build/capture action, generated coaching, evidence-quality inference, or project, course, certification, networking, employer, or timeline advice was introduced
- the available proof-lookup action includes exactly one neutral in-page link, `Review evidence already in your Career Map`, targeting `#personal-explorer-heading` in the existing Personal Capability Explorer
- the unique semantic heading uses `tabIndex={-1}` without entering the positive tab order; native fragment navigation, Enter activation, focus placement, and browser Back behavior passed
- the reviewed-evidence surface now includes one neutral `Continue to Role Lens` native anchor targeting `#target-role-heading`; the existing Role Lens heading is uniquely focusable with `tabIndex={-1}`
- return navigation preserves the selected role, comparison, Start here result, and evidence disclosure state; Back/Forward and all four calibrated role switches passed
- unavailable actions render no link; no evidence relevance/matching claim, auto-selection, filtering, sorting, highlighting, or expansion was introduced
- proof-building semantic authority, `nextProofToBuild`, `Start here`, `Proof to build`, comparison behavior, requirement order, role mandate, and evidence disclosures remain unchanged
- all 27 Career Possibility tests, targeted ESLint, TypeScript, production build, and browser QA at 1440×900, 768×1024, and 390×844 passed
- TypeScript and production build verification ran sequentially to avoid the known `.next/types` race
- shared ingestion and runtime failure handling remain complete and closed
- `CAREERTWIN_CAREER_MAP_STRUCTURED_LLM_ARCHITECTURE_ADOPTED`
- read-only architecture audit complete; no production implementation or file changes in this turn
- verified founder baseline: schema 2.0.0 local state regenerated, 32 atomic evidence records, 1 auto-admitted capability (`insight-synthesis`), 31 unresolved evidence records
- diagnosed root cause of coverage gap: mandatory deterministic signal requirement excludes valid implicit evidence
- architectural decision: Job Copilot's `@google/genai` structured-output infrastructure and schema-validated contract pattern are reusable for Career Map
- strict semantic separation enforced: Job Copilot JD ontologies, fitScore, ranking, and recommendation semantics MUST NOT be reused in Career Map
- capability proposal model: the LLM will generate validated canonical capability proposals; it is a structured inference producer, NOT the truth owner
- deterministic boundary: proposals must pass strict schema and canonical ID validation before being submitted to the existing `inferCanonicalPersonalCapabilities` logic
- durable architecture guide written to `docs/architecture/career-map-architecture.md`
- no HOLD dirt touched, unstaged files preserved exactly

Secondary line status:
- the former `JOB-COPILOT-SIDEPANEL-USER-READY-AUDIT` line is historical/non-active context; its user-exposure HOLD remains unchanged
- `JOB-COPILOT-NS-QUICK-CHECKS-LINKAGE` = parked, low-leverage residual
- do not reopen unless new evidence proves a stable writable owner

Avetta closure note (2026-05-12):
- Avetta Why You / overlay line is closed as `PASS / HOLD`.
- Root-cause chain fixed/guarded: Layer 1 overlay freeze/reuse, candidate replacement workflow, KEEP-gate quality threshold, KEEP-gate root-issue positive path, failure-feedback candidate generation, apply-KEEP candidate pinning, and Layer 3 omitted-requirement secondary-card claim guard.
- Current Avetta overlay hash: `81e74e92dafeaae200bb883d`.
- Current requirement order: reporting -> analytics strategy -> team leadership.
- Slot0 reporting remains omitted due no qualified proof and routed to Biggest Risk / Quick Checks / Role Adds.
- Secondary reporting overclaim is blocked; no new repair admission.
- Operating posture: normal monitoring only; do not reopen this line without repeated-pattern regression.

Tailored CV flow closure note (2026-05-15):
- Status: `PASS / HOLD` for `TAILORED_CV_FLOW_CLOSURE_AFTER_FINAL_DOWNLOAD_CONFIRMATION`.
- Final confirmation artifact: `artifacts/job-copilot-tailored-cv-download-final-browser-confirmation.2026-05-15T00-41-51-752Z.json`.
- Confirmed case: `job_snapshot_id=17097`, `interaction_id=856`, `job_id=bbd933e6-018e-4ca6-92eb-92ea22e67d58`, `job_match_id=null`.
- Closed lines:
  - Quick Check fallback no-op render
  - CTA low-priority/deprioritize misclassification
  - Quick Check save current-role proof confirmation
  - Tailored CV contract/hash transport
  - no-proof diagnostics transport
  - final `/download-resume` click path
- Final runtime result:
  - READY TO APPLY path reached
  - `SIDEPANEL_DOWNLOAD_RESUME` received
  - `/api/job-copilot/extension/download-resume` returned `200` with `ok=true`
  - CV file produced in Downloads (`state=complete`, `mime=text/plain`)
  - no `missing_no_proof_slot_diagnostics` fail-close
- Known non-blocking residual:
  - `/resume-outcome` telemetry `500` due missing `public.resume_copilot_outcome_events` table
- Next line recommendation:
  - `resume_outcome_telemetry_fail_open_repair` (or broader post-closure smoke if preferred)

---

## 3. One main next action

Main next action:
- Replay Task 2D once against the current production-equivalent pipeline to establish the first admissible real-CV capability baseline, keeping the provider, prompt, validator, mapping, merge, materializer, and state unchanged.

Task 2D validation boundary:
- perform the pre-provider privacy gate against the active positive-admission invariant; if it holds, proceed with one primary semantic run
- measure extracted evidence, supported evidence, admitted canonical capabilities, deterministic/structured relationships, unsupported evidence, direct/transferable relationships, exact evidence traceability, and obvious over-inference
- Task 2D is validation, not another inference architecture, prompt-optimization, ontology, Role Knowledge, graph, renderer, or presentation project
- do not tune inference merely because coverage is imperfect; measure and diagnose first
- do not use any of the first three invalid Task 2D attempts for capability-count, inventory, coverage, over-inference, under-inference, product-readiness, or Task 3 readiness conclusions

Not the next action:
- do not reopen Task 1 extractor repair; Task 1 is closed at `b2ba34d18574f49ec22c852c99e640a1d306fad6`
- do not reopen Task 2A or Task 2B; both are closed
- do not reopen Task 2C-B; production structured inference is connected and Task 2C-B is closed
- do not bypass the Task 2B validator or create a second personal-capability pipeline
- do not treat Task 2D as already completed; it is the next bounded validation task
- do not begin Task 3 neural graph expansion or Task 4 real-CV visual validation
- do not resume second-source triangulation before the MVP vertical slice is complete
- do not treat further Role Knowledge enrichment as an MVP blocker
- do not reopen Wave 2 semantic synthesis, source writing, measurement, or diagnostic infrastructure repair
- do not treat `WEAK` as canonical semantic admission or `TARGETED` as `AUTO`
- do not claim one role source proves strong confidence or universal semantic definitions
- do not begin Wave 3; it is not authorised and further Role Knowledge enrichment is not currently required for MVP
- do not treat the closed `stale_review_status` evidence-field defect as active
- do not reopen source revision, source identity, review identity/revision, `SharedCareerIngestionBundle`, browser adapter, or browser runtime architecture
- do not promote persistence, server materialization, multi-document ingestion, automatic semantic edit hashing, Supabase, authentication, or package changes into mandatory next work
- do not expose sidepanel to users now
- do not reopen parked Quick Checks DECISION-UPDATE residual without `fixed_guard_case`
- do not reopen kept repairs by default
- do not force a new active Job Copilot line without new evidence
- do not rerun another full Career Verdict 20-case pass immediately
- do not move sidepanel readiness to `borderline` from Career Verdict freshness alone
- do not re-run same-family ANSWER-LINKAGE stability trace by default
- do not reopen kept CTA precedence repair by default
- do not reopen ingestion as primary owner
- do not reopen kept post-confidence materialization repair by default
- do not reopen kept weak-band injection repair by default
- do not continue CTA-shift-only narrowing as primary path
- do not enter another REPAIR pass before closure judgment is complete
- do not call this loop locally KEEP until guard-only confidence movement is explained or cleared
- do not reopen the repaired risk-materialization micro-surfaces as the next owner by default
- do not treat the current score-path candidate as admitted before a stable owner-vs-guard split appears
- do not use legacy scorepath confidence-only predicate as the default selector for the next reselection pass
- do not move to REPAIR from a single v2 split replay without one repeatability confirmation pass
- do not move to REPAIR before admission review formalizes allowed file / change type / guardrails
- do not broaden into downstream redesign or cross-line scope
- do not enter admission review until v2 two-hit stability gate is satisfied
- do not rerun same v2 predicate + fixed guard `job-18` owner-stability audits without introducing a new variable
- do not switch to another Job Copilot line without new evidence showing higher leverage than the parked DECISION-UPDATE residual
- do not reopen closed Why You evidence-specificity owners (dominant-context comparator, authoritative `why_you_cards` contract path, renderer concept-derivation bypass) without a new regression artifact


---

## 4. Current must-follow rules

- Use EM governance by default.
- Use root-cause-first discipline.
- Do not jump to fixes before first drift and first writable fault are isolated.
- Enforce section synthesis family-safety: user-facing section phrasing must be case-local and supported by current-case signals.
- Treat Quick Checks as split child lines, not one unified repair surface.
- Do not let implementation naming redefine architecture.
- Use proportional verification.
- If major accepted truth changes, memory sync is required.
- Treat Why You cards as authoritative consumer-only cards whenever `authoritative_selection.why_you_cards` is present.

---

## 5. Verification default

Default verify:
- `npm run verify:daily`

Do not use:
- `npm run verify` by default for branch-local iterative work

Upgrade verification only if:
- repair scope or policy explicitly requires higher level
- see `docs/control/verification/verify-strategy.md`

---

## 6. Required next reads by task type

For all substantial tasks after this brief:
- read `docs/control/current-system-memory.md`

Then:

If task = branch-local audit:
- read `docs/control/current-system-memory.md`
- read targeted sections from `docs/control/em-operating-system.md` covering:
  - shared loop states
  - canonical loop stages
  - true stop conditions
  - subagent roles / execution continuation as needed
- read targeted policy entries only if needed

If task = repair admission or bounded repair:
- read `docs/control/current-system-memory.md`
- read targeted sections from `docs/control/em-operating-system.md` covering:
  - repair admission
  - allowed-files rule
  - one-main-next-action rule
  - audit infrastructure continuation
  - true stop conditions
- read targeted policy entries if scope or precedence is unclear

If task = verify / measure:
- read `docs/control/current-system-memory.md`
- read targeted sections from `docs/control/em-operating-system.md` covering:
  - shared loop states
  - canonical loop stages
  - local vs global truth
  - baseline authority
  - measurement cadence
- read `docs/control/verification/verify-strategy.md`
- read `docs/control/verification/verification-loop.md` only if Level 3 / full baseline is actually required
---

## 7. Memory sync reminder

If major accepted truth changes, include:
- `memory_sync_required: yes`
- `memory_sync_targets: [...]`

Update in the same patch when required:
- `docs/control/current-system-memory.md` for accepted system truth changes
- `docs/control/current-active-brief.md` if active line / active mode / recommended next action changes
- backlog / line-plan surfaces if planning status changes

---

## 8. Authority boundary reminder

This file:
- tells you where to start
- tells you what is active now
- tells you what not to forget
- tells you what to read next

This file does not replace:
- `current-system-memory.md` for accepted system truth
- `docs/control/em-operating-system.md` for execution runbook
- `policy-registry.md` for policy precedence
- line plan for line-local operational detail
