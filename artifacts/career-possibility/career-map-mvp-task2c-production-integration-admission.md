# NON_CANONICAL

# CAREER MAP MVP TASK 2C PRODUCTION INTEGRATION ADMISSION

Status: `NO PRODUCTION WRITE`

Decision: `MVP_TASK2C_SERVER_BOUNDARY_REQUIRED`

Audit baseline:

- Branch: `master`
- HEAD: `6b0bb8dc9b9665925d0a9ce67bda41d00eb85655`
- origin/master: `6b0bb8dc9b9665925d0a9ce67bda41d00eb85655`
- Index at start: empty
- Task 2B implementation: `a52466061489a747e5dfb1cc834cbbf2244a5c2c`
- Task 2B control closure: `6b0bb8dc9b9665925d0a9ce67bda41d00eb85655`

## Architecture Decision Lock

### ARCHITECTURE DECISIONS

- Career Map is an evidence-first personal capability graph with YOU at the center.
- Personal capability truth starts with eligible atomic professional evidence and existing canonical capability identity.
- Employer, role title, education, headings, qualifications, and self-declared skill lists cannot independently establish personal capability.
- Role/JD semantics cannot create personal capability.
- The Career Capability model is a structured inference producer, never a truth, relationship-governance, materializer, or state owner.
- Raw provider output must pass the Task 2B validator before it can affect personal state.
- Deterministic inference remains a high-precision, guardrail, QA/debug, and corroboration channel; it is not mandatory for structured inference.
- No fake `llm_matched`, `llm_supported`, or equivalent signal may be introduced.
- Existing canonical capability, deterministic inference, materializer, local-state, storage, role, and graph owners remain authoritative.
- No parallel extractor, ontology, inference authority, materializer, state, storage, role library, or graph authority is admitted.

### CURRENT TASK

- `TASK 2C-A`: production integration admission audit only.
- The only write is this noncanonical audit artifact.

### NEXT TASK

- `TASK 2C-B` only after Founder/EM resolves the server/privacy execution boundary and the implementation boundary is re-admitted.

### LATER

- `TASK 2D`: privacy-safe / Founder-CV coverage validation.
- `TASK 3`: neural-network presentation, shared role nodes, gaps, ranking, and radius.
- `TASK 4`: real-CV end-to-end visual validation.

### DEFERRED

- Second-source triangulation: `DEFERRED_POST_MVP_QUALITY_WORK`.
- Further Role Knowledge enrichment: not required before the MVP vertical slice.

### OUT OF SCOPE

- Production, test, control, package, ontology, Role Knowledge, graph, presentation, ranking, renderer, storage, or provider changes.
- Real model calls or Founder-CV transmission.
- Task 2D, Task 3, Task 4, and triangulation.

`NO TASK 3 WORK BEFORE TASK 2C + 2D COMPLETE` unless Founder/EM explicitly changes priority.

## MVP Task Ledger

- TASK 1: `CLOSED`
- TASK 2A: `CLOSED`
- TASK 2B: `CLOSED`
- TASK 2C-A: `CURRENT AUDIT`
- TASK 2C-B: `NEXT ONLY AFTER SERVER/PRIVACY DECISION AND ADMISSION`
- TASK 2D: `LATER / NOT AUTHORISED`
- TASK 3: `LATER / NOT AUTHORISED`
- TASK 4: `LATER / NOT AUTHORISED`
- TRIANGULATION: `DEFERRED`
- ROLE KNOWLEDGE: `MVP_SUFFICIENT`

## Observed, Inferred, Unproven, Recommended

Observed:

- The active PDF/DOCX upload orchestration starts in a client component and performs extraction and deterministic inference in the browser.
- The UI currently states: `Your CV is processed locally in this browser.`
- Accepted control history describes no external CV transmission and browser-local/page-memory processing.
- The repository has server-side Gemini and DeepSeek invocation patterns, but no generic provider abstraction and no Career Map inference API route.
- A provider secret cannot safely execute in the browser.
- Task 2B validates response shape and references but does not invoke a provider, convert support assessments to final personal relationships, merge channels, or mutate state.
- Current provisional mapping/state contracts admit only `method: "authored_deterministic"` and require one shared deterministic `mappingPolicyVersion`.

Inferred:

- A production provider call requires a same-origin server boundary or a separately approved client-safe/on-device provider architecture.
- Sending even bounded atomic evidence text to a server/provider changes the currently truthful local-processing claim and therefore requires explicit Founder/EM authorization.
- A structured proposal cannot be disguised as `authored_deterministic`; downstream provenance and version contracts need a truthful extension.

Still unproven:

- Whether Founder/EM authorizes transmission of eligible atomic evidence text to a CareerTwin server and external model provider.
- Which provider/model and retention/logging policy is approved for production Career Map inference.
- The cross-channel relationship policy when deterministic and structured channels disagree for one evidence/capability identity.
- Whether an all-zero build should remain the existing safe `no_unambiguous_mappings` failure or materialize an empty provisional state.

Recommended single next action:

- Founder/EM decides the server/privacy boundary before Task 2C-B implementation is admitted.

## Task 2B API Task 2C Must Consume

Contract owner: `lib/career-possibility/career-capability-structured-inference-contract.ts`.

Required exports:

- `CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION`
- `CAREER_CAPABILITY_STRUCTURED_INFERENCE_VALIDATOR_VERSION`
- `MAX_CAPABILITY_ASSESSMENTS_PER_EVIDENCE`
- `CareerCapabilityStructuredInferenceEvidence`
- `CareerCapabilityStructuredInferenceRequest`
- `CareerCapabilityStructuredInferenceResponse`
- `CareerCapabilityStructuredInferenceProducer`
- `CareerCapabilitySupportAssessment`
- `CareerCapabilityAssessment`
- `ValidatedCareerCapabilityEvidenceResult`
- `RejectedCareerCapabilityEvidenceResult`
- `CareerCapabilityStructuredInferenceValidationIssue`
- `CareerCapabilityStructuredInferenceValidationResult`
- `ValidateCareerCapabilityStructuredInferenceInput`

Producer signature:

```ts
produce(
  request: CareerCapabilityStructuredInferenceRequest,
): Promise<CareerCapabilityStructuredInferenceResponse>
```

Validator owner and signature:

```ts
validateCareerCapabilityStructuredInferenceResponse(
  input: ValidateCareerCapabilityStructuredInferenceInput,
): CareerCapabilityStructuredInferenceValidationResult
```

Validated envelope:

```text
contractVersion
validatorVersion
validEvidenceResults[]
rejectedEvidenceResults[] { resultIndex, evidenceId|null, issues[] }
responseIssues[]
```

Task 2C must consume only `validEvidenceResults` as structured proposal input. Rejected results and response issues are diagnostics, not admissible proposals.

## Active Production Runtime Path

```text
RootCvUploadWorkspace.selected(file)
-> await buildProvisionalCareerMapFromFile(input)
-> await extractLocalResumeFile(file)
-> await buildCareerSourceRevision(...)
-> await buildProvisionalCareerMapFromText(...)
-> extractResumeEvidenceFromText(...)
-> for each ResumeEvidenceRecord:
     await bridgeEvidenceToProvisionalSignals(...)
     -> bridged.status === "structured"
        -> await mapProvisionalResumeEvidencePlural(...)
        -> await inferCanonicalPersonalCapabilities(...)
        -> projectPluralCanonicalInferenceToProvisionalMappingResults(...)
     -> otherwise
        -> inactiveMappingResult(... unsupported/unresolved ...)
-> autoAdmittedCount === 0 => failure "no_unambiguous_mappings"
-> await materializeProvisionalCareerMap(...)
-> validateProvisionalLocalCareerMapState(...)
-> RootCvUploadWorkspace.writeLocalCareerMapState(...)
-> router.push("/career-map")
```

| Owner | Input | Output | Signal dependency | Failure behavior |
|---|---|---|---|---|
| `RootCvUploadWorkspace.selected()` | browser `File` | navigation or bounded UI failure | none itself | writes only a successful validated build; prior storage survives failure |
| `buildProvisionalCareerMapFromFile()` | PDF/DOCX and definition/version context | success state or bounded file/build code | downstream only | catches exceptions as `unexpected_failure` |
| `extractLocalResumeFile()` | browser file | extracted text and metadata | none | bounded extraction failure |
| `buildProvisionalCareerMapFromText()` | extracted text, identity, definitions, versions, timestamps | provisional state/audit or failure | currently mandatory for capability admission | catches as `unexpected_failure` |
| `bridgeEvidenceToProvisionalSignals()` | one atomic record + spans | structured/unresolved/unsupported | produces deterministic signals | fail closed |
| `mapProvisionalResumeEvidencePlural()` | signal-bearing evidence + policy + definitions | provisional mapping results | **requires signals** | unresolved/unsupported |
| `materializeProvisionalCareerMap()` | evidence + provisional mapping results | validated state candidate | no inference | rejects zero admitted mappings and invalid state |
| `validateProvisionalLocalCareerMapState()` | state candidate + definitions | validated state or issues | none | rejects malformed/cross-reference/conflict state |
| `writeLocalCareerMapState()` | validated state | one browser-local write | none | validates before one `setItem`; prior state survives failure |

## Mandatory Deterministic Gate and First Integration Seam

Exact mandatory condition in `buildProvisionalCareerMapFromText()`:

```ts
if (bridged.status === "structured") {
  mappingResults.push(...await mapProvisionalResumeEvidencePlural(...));
} else {
  mappingResults.push(inactiveMappingResult(...));
}
```

No-signal evidence does not disappear. It remains in `evidence` with exact identity, excerpt, locator, empty signals, unreviewed status, and an inactive unsupported/unresolved mapping result. It cannot currently propose a capability.

The first structured-inference seam is inside `buildProvisionalCareerMapFromText()` after successful `extractResumeEvidenceFromText()` and the nonempty evidence check, but before the per-record signal-bridge loop. At that point all eligible `ResumeEvidenceRecord` values exist independently of signal status. A batch producer can receive all eligible records, Task 2B can validate the returned batch, and only validated results can enter the later merge boundary.

The second existing gate is:

```ts
if (autoAdmittedCount === 0) return fail("no_unambiguous_mappings", ...);
```

It prevents an all-zero mapping set from reaching the materializer.

## Orchestration HOLD Analysis

| Path | Current state | Task 2C relevance | Existing HOLD classification |
|---|---|---|---|
| `lib/career-possibility/build-provisional-career-map-from-text.ts` | `TRACKED_HOLD` | `REQUIRED_DEPENDENCY` | one existing provenance hunk adds employer/title to retained evidence; `UNRELATED_HOLD` to Task 2C semantics |
| `lib/career-possibility/provisional-resume-mapping-contract.ts` | `TRACKED_HOLD` | `REQUIRED_DEPENDENCY` if mixed-channel mappings continue through current materializer | one existing provenance-only evidence-field hunk; `UNRELATED_HOLD` |
| `lib/career-possibility/local-career-map-state.ts` | `TRACKED_HOLD` | `REQUIRED_DEPENDENCY` because validator hard-codes `authored_deterministic` and one policy version | one existing employer/title validation hunk; `UNRELATED_HOLD` |
| `lib/career-possibility/local-career-map-presentation-adapter.ts` | `TRACKED_HOLD` | `NO_LONGER_RELEVANT` to Task 2C-A/B semantics | two provenance presentation hunks; `UNRELATED_HOLD` |
| `tests/career-possibility/build-provisional-career-map-from-text.test.ts` | `TRACKED_HOLD` | `REQUIRED_DEPENDENCY` for Task 2C behavioral proof | three existing provenance-oriented test hunks; `UNRELATED_HOLD` |
| `scripts/run-career-map-llm-experiment.ts` | `UNTRACKED_HOLD` | `PARTIALLY_RELEVANT` reference only | Career Map prompt/schema/provider experiment; contains noncanonical `slice(0, 3)` truncation and cannot be imported or admitted wholesale |
| `tests/career-possibility/career-map-provenance-chain.test.ts` | `UNTRACKED_HOLD` | `NO_LONGER_RELEVANT` | provenance chain coverage with stale historical assumptions; not a Task 2C owner |

Required HOLD admission after the server decision would be surgical, not whole-file: three unrelated production hunks and three unrelated test hunks must be preserved while Task 2C changes are isolated.

## Provider Implementation and Execution Boundary

Observed reusable patterns:

- `lib/career-engine/matching/llm-evidence-mapper.ts` is the closest structured Gemini call pattern and uses `GEMINI_API_KEY`, `@google/genai`, JSON response MIME, and a response schema. Its matched/missing/confidence/JD semantics are prohibited for Career Map; it has no timeout and returns empty results on provider failure.
- `lib/career-engine/matching/llm-job-signal-extractor.ts` has the clearest timeout/network/malformed/unavailable result handling using server environment variables and `AbortController`. Its DeepSeek/JD signal semantics and cache are prohibited for Career Map.
- `scripts/run-career-map-llm-experiment.ts` is the closest Career Map prompt/schema experiment. It is untracked/experiment-only and silently truncates with `slice(0, 3)`, contrary to Task 2B. It is reference evidence, not a production owner.
- `@google/genai` is already installed and `GEMINI_API_KEY` is an existing server environment convention.
- No generic provider abstraction or active Career Map inference API route exists.
- `/api/parse-resume` uploads and persists files through Supabase and belongs to a legacy/server resume path; it is incompatible with the current browser-local Career Map flow.
- `/api/match-job` owns job/JD matching semantics and is not a Career Map owner.

Classification: `SERVER_BOUNDARY_REQUIRED` and `NEW_ADAPTER_REQUIRED`.

Minimum safe execution location: a new same-origin server POST route backed by a Career-Map-specific server provider adapter. The browser may call the route only after explicit authorization of the data-transmission/privacy boundary. Provider credentials must remain server-only.

Client-secret risk: `YES` if provider invocation is attempted in `RootCvUploadWorkspace`, `buildProvisionalCareerMapFromFile()`, or `buildProvisionalCareerMapFromText()` directly with environment credentials.

Required Founder/EM decision:

> Authorize sending only eligible atomic evidence `{ evidenceId, evidenceText }` (plus canonical `{ id, label, family }` context/version) from the browser to a same-origin CareerTwin server route and onward to the approved model provider, with no raw file upload, no employer/title/education/skill-list semantic fields, no persistence, and no logging; or retain the current local-only promise and choose a client-safe/on-device inference architecture.

This is the single first-order decision. No server route or copy change is admitted until it is resolved.

## Provider Failure Semantics

The repository already demonstrates fail-closed optional-LLM behavior: missing credentials, timeout, network error, malformed JSON, and unusable payload return no LLM enrichment while deterministic processing remains available.

Task 2C can safely use:

```text
structured channel unavailable/malformed
-> no structured proposal admitted
-> deterministic channel continues
-> if deterministic mappings exist, materialization continues
-> otherwise existing no_unambiguous_mappings failure
-> no storage write on build failure
```

Classification: `FAIL_CLOSED_DETERMINISTIC_CHANNEL_SURVIVES`.

Provider failure diagnostics may remain ephemeral. They do not need to enter personal state for MVP.

## Sync/Async Impact

No sync-to-async conversion is required. All relevant active boundaries are already asynchronous:

- `RootCvUploadWorkspace.selected(file): Promise<void>` (inferred async function return)
- `buildProvisionalCareerMapFromFile(...): Promise<ProvisionalCareerMapFileBuildResult>`
- `buildProvisionalCareerMapFromText(...): Promise<ProvisionalCareerMapTextBuildResult>`
- `materializeProvisionalCareerMap(...): Promise<Result>`

Affected callers/signatures after admission would be input/dependency extensions, not return-type conversion:

- `RootCvUploadWorkspace.selected()` supplies an API-backed producer/dependency.
- `buildProvisionalCareerMapFromFile()` accepts/forwards that dependency.
- `buildProvisionalCareerMapFromText()` invokes it after extraction.
- `diagnoseResumeIngestion()` and tests either omit the optional channel or inject a deterministic fake; no real model is required.

Classification: `SYNC_TO_ASYNC_BOUNDARY_CHANGE = NO`.

## Structured Producer Input

Minimum semantic evidence input comes directly from each eligible `ResumeEvidenceRecord`:

```text
evidenceId = record.id
evidenceText = record.sourceText
```

Do not supply employer, role title, education, headings, qualifications, skill-list metadata, deterministic signal tokens, target roles, or JD data as semantic inputs.

Employment/title metadata may remain attached to the separate local evidence owner for provenance and display, but must not enter the structured semantic assessment request.

## Canonical Semantic Context

Owner: `lib/career-possibility/canonical-capability-library.ts`.

Available provider context fields:

```text
canonical capability id
canonical capability label
canonical capability family
canonical library contentVersion
```

These are exactly `CanonicalCapabilityDefinition.id`, `.label`, `.family`, and `canonicalCapabilityLibrary.contentVersion`. Role Knowledge is not required and must not become personal-capability truth. No second glossary or ontology is needed.

## Validated Proposal Adapter

Classification: `HOLD_CHANGE_REQUIRED`.

No existing owner can accept Task 2B validated assessments directly:

- `inferCanonicalPersonalCapabilities()` consumes authored signals and policy rules, not already validated capability assessments.
- `CanonicalCapabilityProposal.method` is fixed to `authored_deterministic`.
- `ProvisionalAutoAdmittedMapping.method` is fixed to `authored_deterministic` and requires `matchedRuleId` plus a deterministic `mappingPolicyVersion`.
- `validateProvisionalLocalCareerMapState()` rejects any method other than `authored_deterministic` and requires every mapping's policy version to equal the state's single mapping-policy version.

A new small proposal/merge adapter is conceptually required, but it cannot truthfully project structured assessments into the current downstream contract without narrow changes to the HOLD mapping/state provenance model. It must not fabricate a matched rule or label model output deterministic.

Support assessment is not itself final state relationship authority. A governed conversion from `directly_supported | transferable_support` into `direct_evidence | transferable_signal` is required before creating an admitted mapping.

## Merge, Dedupe, and Relationship Conflict Ownership

Existing relationship identity is conceptually:

```text
evidenceId + canonical capabilityId
```

Relationship is the governed value for that identity, not an additional identity dimension. Evidence/capability identity is supported by the reviewed v1 state duplicate check and by v2's prohibition on placing one evidence ID in both direct and transferable arrays for one capability.

Classification: `MERGE_ADAPTER_MISSING`.

No active v2 owner deduplicates deterministic and structured mappings by evidence/capability before persistence:

- the materializer deduplicates capability evidence ID arrays but retains all admitted mapping objects;
- the v2 validator checks mapping-ID uniqueness but does not reject duplicate evidence/capability mapping objects;
- deterministic proposal IDs include relationship and policy version, so a second channel cannot rely on mapping-ID equality.

Within-channel conflict behavior exists:

- Task 2B rejects a provider evidence result containing duplicate/conflicting assessments for the same capability;
- canonical deterministic inference leaves a capability unresolved when authored rules produce conflicting relationships.

Cross-channel conflict behavior does not exist. Classification: `CONFLICT_POLICY_DECISION_REQUIRED`.

Exact missing policy:

> When deterministic and validated structured channels propose different relationships for the same `evidenceId + capabilityId`, decide whether the affected pair fails closed as unresolved or follows another explicitly governed rule. No direct-wins, deterministic-wins, or model-wins heuristic is currently authorized.

This remains a downstream contract decision, but the earlier server/privacy decision is the single next decision requested by this audit.

## All-Zero Behavior

Task 2B correctly accepts a provider evidence result with zero assessments and a response with no valid structured proposals.

Production behavior:

- structured proposals = 0 and deterministic proposals > 0: supported; deterministic materialization succeeds.
- structured proposals = 0 and deterministic proposals = 0: no capability is invented, but `buildProvisionalCareerMapFromText()` returns `no_unambiguous_mappings`; `materializeProvisionalCareerMap()` and schema 2 state also require at least one admitted mapping/capability.
- Root storage is not mutated on that failure, so existing state is preserved.

Classification: `BLOCKED` as a successful materialized empty state; safely fail-closed without fabrication today.

Whether MVP should materialize an empty personal state is not decided here and is not required to resolve the first server boundary.

## Required Runtime Cases

### No-signal evidence with one valid structured assessment

Desired chain using existing and admitted boundaries:

```text
extractResumeEvidenceFromText()
-> ResumeEvidenceRecord { id, sourceText }
-> API-backed CareerCapabilityStructuredInferenceProducer.produce()
-> server provider adapter
-> provider-neutral response
-> validateCareerCapabilityStructuredInferenceResponse()
-> validEvidenceResults
-> new governed structured-proposal adapter
-> new cross-channel merge owner
-> existing materializeProvisionalCareerMap()
-> existing validateProvisionalLocalCareerMapState()
-> existing writeLocalCareerMapState()
```

`bridgeEvidenceToProvisionalSignals()` may still return unsupported. That inactive deterministic result must not block the separately validated structured relationship.

### Deterministic and structured same capability

```text
deterministic mapping + validated structured assessment
-> group by evidenceId + capabilityId
-> same governed relationship: emit one mapping with truthful combined/source provenance
-> conflicting relationship: apply explicit cross-channel conflict policy
```

Exact owner needed: missing new proposal/merge adapter. The materializer is too late because duplicate mapping objects and provenance have already been constructed.

### Mixed batch

Required behavior:

- Evidence A, deterministic + structured valid: one governed mapping after dedupe.
- Evidence B, no deterministic signal + structured valid: structured mapping survives.
- Evidence C, Task 2B-rejected structured result: no structured mapping; deterministic result, if any, remains independently eligible.
- Evidence D, zero structured assessments: no structured mapping; zero is valid.
- Provider/batch failure: no structured mapping; deterministic channel remains independently eligible.

The Task 2B envelope already provides evidence-result isolation. The missing merge adapter must preserve it.

## Materializer and State Boundary

- `materializeProvisionalCareerMap()` remains the correct materializer owner.
- `validateProvisionalLocalCareerMapState()` remains the correct provisional-state authority.
- `writeLocalCareerMapState()` remains the correct atomic browser storage owner.
- No second materializer/state/storage owner is required.

Narrow contract changes are nevertheless required before those owners can truthfully represent mixed-channel provenance:

- admit a non-deterministic validated structured mapping source without calling it `authored_deterministic`;
- retain structured contract/validator/provider or governed-adapter version provenance;
- make materialization identity include all admitted mapping provenance deterministically;
- enforce evidence/capability dedupe before state;
- preserve the existing relationship-conflict invariant.

Diagnostics may remain ephemeral; they do not justify state fields.

## Exact First Writable Fault

Classification: `SERVER_EXECUTION_BOUNDARY_MISSING`.

Reasoning by dependency order:

1. The provider-neutral contract and validator exist.
2. The active call site is client-side and explicitly promises local-only processing.
3. Existing provider credentials are server environment secrets.
4. No Career Map server inference route exists.
5. Creating that route and transmitting atomic evidence changes an accepted privacy/product boundary.
6. Therefore provider invocation cannot be admitted until Founder/EM chooses the server/privacy boundary.

The validated-proposal adapter, merge owner, provenance extension, and cross-channel conflict policy are real downstream gaps, but they are not the first writable dependency.

## Task 2C-B Implementation Boundary

Current admission result: `NOT READY` until the server/privacy decision is resolved. No whole-file write set is authorized by this artifact.

Candidate coherent slice after approval and re-admission:

| Candidate path | Writability | Purpose |
|---|---|---|
| `app/api/career-map/capability-inference/route.ts` | `NEW_FILE_SAFE` after server decision | same-origin server validation/invocation envelope |
| `lib/career-possibility/career-capability-structured-inference-provider.ts` | `NEW_FILE_SAFE` after provider decision | Career-Map-specific server producer using Task 2B response contract |
| `lib/career-possibility/career-capability-structured-inference-api-producer.ts` | `NEW_FILE_SAFE` after server decision | client-safe implementation of the Task 2B producer interface over the same-origin route |
| `lib/career-possibility/career-capability-structured-proposal-adapter.ts` | `NEW_FILE_SAFE`, but policy-blocked | validated assessment conversion plus cross-channel merge/dedupe |
| `components/career-possibility/RootCvUploadWorkspace.tsx` | `CLEAN_WRITABLE`, decision-dependent | inject API producer and make privacy copy truthful |
| `lib/career-possibility/build-provisional-career-map-from-file.ts` | `CLEAN_WRITABLE` | forward injected producer dependency |
| `lib/career-possibility/build-provisional-career-map-from-text.ts` | `HOLD_REQUIRES_ADMISSION` | batch invocation/validation before signal loop and merge before materialization; preserve unrelated provenance hunk |
| `lib/career-possibility/provisional-resume-mapping-contract.ts` | `HOLD_REQUIRES_ADMISSION` | truthful mixed-channel mapping provenance; preserve unrelated provenance hunk |
| `lib/career-possibility/local-career-map-state.ts` | `HOLD_REQUIRES_ADMISSION` | validate truthful structured mapping provenance/version; preserve unrelated provenance hunk |
| `lib/career-possibility/provisional-career-map-materializer.ts` | `CLEAN_WRITABLE` | consume governed merged mappings and include their provenance in identity |
| `tests/career-possibility/build-provisional-career-map-from-text.test.ts` | `HOLD_REQUIRES_ADMISSION` | central mixed/no-signal/failure cases; preserve unrelated provenance hunks |
| focused new provider/route/adapter tests | `NEW_FILE_SAFE` | server boundary, strict response, merge, conflict, and failure behavior |
| existing file/state/root tests | `CLEAN_WRITABLE` only where affected | input propagation, state provenance, no secret/client provider, atomic-write preservation |

Not writable for Task 2C-B:

- `lib/career-engine/matching/llm-evidence-mapper.ts`
- `lib/career-engine/matching/llm-job-signal-extractor.ts`
- `scripts/run-career-map-llm-experiment.ts`
- `lib/career-possibility/local-career-map-presentation-adapter.ts`
- graph, Role Knowledge, canonical-library, ranking, renderer, package, control, and unrelated test owners

This candidate set is evidence of blast radius, not authorization. It must be narrowed after the server/privacy and cross-channel conflict decisions.

## Task 2C-B Acceptance Conditions

1. Only eligible atomic `{ evidenceId, evidenceText }` values enter structured semantic inference.
2. Provider credentials remain server-only and the UI truthfully describes processing/transmission.
3. Raw provider output passes Task 2B validation before adaptation.
4. No-signal evidence can produce one evidence-grounded personal capability.
5. Existing deterministic inference remains unchanged and independently usable.
6. Same evidence/capability/same relationship across channels yields one governed relationship.
7. Cross-channel relationship conflict follows an explicit Founder/EM policy; no heuristic is hidden.
8. Invalid/unknown/malformed/fan-out-rejected structured results do not enter state.
9. Provider timeout/network/unavailable/malformed response cannot corrupt state; deterministic results survive.
10. Zero structured support is valid and does not fabricate capability.
11. Mapping method/version provenance is truthful and participates in deterministic materialization identity.
12. Existing materializer, state validator, and atomic local-storage owner remain authoritative.
13. Existing HOLD hunks remain preserved and separately attributable.
14. No Job Copilot semantics, fake signals, parallel state, or parallel ontology is introduced.

## Proportional Task 2C-B Test Plan

- Focused proposal/merge adapter:
  - no-signal + one validated direct assessment;
  - no-signal + one validated transferable assessment;
  - deterministic-only unchanged;
  - identical pair/relationship from both channels deduped;
  - cross-channel conflict follows the approved policy;
  - exact evidence ID and rationale/provenance retained;
  - invalid structured results cannot be supplied as accepted proposals.
- Focused server/provider boundary:
  - only allowed evidence/canonical fields accepted;
  - missing credential, timeout, network error, empty response, malformed JSON, and provider error fail closed;
  - server output uses the Task 2B contract and never returns provider secrets;
  - no file bytes, title/employer/education/skills, persistence, or logging dependency.
- Text orchestration:
  - no-signal evidence reaches injected producer and materializes a capability;
  - deterministic mapping still works;
  - mixed A/B/C/D evidence batch behaves independently;
  - provider failure leaves deterministic channel usable;
  - zero structured support is valid;
  - exact evidence grounding survives through state.
- File/root boundary:
  - existing PDF/DOCX extraction failures remain bounded;
  - injected producer propagates without sync-to-async conversion;
  - failed build never writes or clears prior browser state;
  - client bundle contains no provider credential access.
- Existing regressions:
  - Task 2B validator;
  - canonical singular/plural inference;
  - provisional mapper;
  - materializer/state/storage;
  - production build.
- No graph/UI visual test and no real Founder CV/model call is required for Task 2C-B.

## MVP Non-Blockers

The following are not Task 2C blockers:

- Role Knowledge enrichment
- second-source triangulation
- personal presentation grouping
- role ranking
- radius
- shared role graph
- renderer
- visible fit scoring
- exact JD matching

## Audit Decision

The runtime integration seam is identifiable, Task 2B is consumable, async propagation is already available, deterministic failure isolation is viable, and existing materializer/state/storage owners remain the correct downstream authorities.

Task 2C-B is not currently admissible because production provider execution requires a server boundary that conflicts with the active local-processing claim and accepted no-external-transmission behavior. Founder/EM must first authorize the bounded atomic-evidence transmission model or select a client-safe/on-device alternative.

Decision: `MVP_TASK2C_SERVER_BOUNDARY_REQUIRED`.
