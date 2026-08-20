# NON_CANONICAL

# CAREER MAP MVP TASK 2 STRUCTURED INFERENCE GAP AUDIT

Status: `NO PRODUCTION WRITE`

Decision: `MVP_TASK2_CONTRACT_DECISION_REQUIRED`

Audit baseline:

- Branch: `master`
- HEAD: `ab3b022e6213a7d5ad130035e4dee6310a84993c`
- origin/master: `ab3b022e6213a7d5ad130035e4dee6310a84993c`
- Index at start: empty
- Task 1 implementation: `b2ba34d18574f49ec22c852c99e640a1d306fad6`
- Task 1 control closure: `ab3b022e6213a7d5ad130035e4dee6310a84993c`

## Architecture Decision Lock

- Career Map personal truth starts with eligible atomic professional evidence.
- Employer, title, section heading, education, qualification, skill list, and technology list cannot independently establish personal capability.
- Task 1 owns evidence extraction and eligibility. It is closed and was not reopened.
- The Career Capability LLM is a structured inference producer, never a truth or state owner.
- Model output may reference only existing canonical capability IDs and exact supplied evidence IDs.
- An evidence record may validly receive zero supported capabilities.
- Raw provider output cannot write personal state, materialized state, graph state, or browser storage.
- Direct and transferable support may be proposed by the model, but final relationship admission remains governed.
- Deterministic signal/mapping machinery remains a high-precision inference, exclusion, corroboration, QA, and debugging channel. It is not the intended mandatory gateway for every capability.
- No synthetic `llm_matched` or equivalent universal signal may be introduced.
- Existing canonical inference, materializer, local state, storage, role, and graph authorities must be reused. No parallel semantic pipeline is admitted.
- Job Copilot provider/invocation patterns may be reused; JD-fit, matched/missing, confidence, scoring, ranking, and recommendation semantics may not be reused.
- Task 3, Task 4, Role Knowledge enrichment, and triangulation remain out of scope.

## MVP Task Ledger

- TASK 1: `CLOSED`
- TASK 2A: `CURRENT AUDIT`
- TASK 2B: `NEXT ONLY IF ADMITTED`
- TASK 2C: `LATER`
- TASK 2D: `LATER`
- TASK 3: `NOT AUTHORISED`
- TASK 4: `NOT AUTHORISED`
- TRIANGULATION: `DEFERRED`
- ROLE KNOWLEDGE: `MVP_SUFFICIENT`

## Current Production Runtime Call Chain

The active root PDF/DOCX path is:

```text
RootCvUploadWorkspace.selected()
-> buildProvisionalCareerMapFromFile()
-> extractLocalResumeFile()
-> buildCareerSourceRevision()
-> buildProvisionalCareerMapFromText()
-> extractResumeEvidenceFromText()
-> for each ResumeEvidenceRecord:
     bridgeEvidenceToProvisionalSignals()
     -> only status="structured": mapProvisionalResumeEvidencePlural()
        -> inferCanonicalPersonalCapabilities()
        -> projectPluralCanonicalInferenceToProvisionalMappingResults()
     -> unsupported/unresolved bridge result: inactive ProvisionalMappingResult
-> materializeProvisionalCareerMap()
-> validateProvisionalLocalCareerMapState()
-> RootCvUploadWorkspace.writeLocalCareerMapState()
-> /career-map consumer
```

| Stage | Owner | Input -> output | Runtime active | Deterministic | Can admit capability | Requires signal | Evidence ID retained |
|---|---|---|---:|---:|---:|---:|---:|
| Local file entry | `RootCvUploadWorkspace.selected()` | `File` -> build request | yes | no timestamps are caller supplied; orchestration otherwise bounded | no | no | not yet |
| File build | `buildProvisionalCareerMapFromFile()` | PDF/DOCX -> normalized text/source revision | yes | yes after parser output | no | no | not yet |
| Atomic extraction | `extractResumeEvidenceFromText()` | normalized text -> `ResumeEvidenceBundle` | yes | yes | no | no | creates and retains ID |
| Signal bridge | `bridgeEvidenceToProvisionalSignals()` | evidence + spans -> structured/unresolved/unsupported signals | yes | yes | no | this is the signal producer | yes |
| Canonical inference compatibility path | `mapProvisionalResumeEvidencePlural()` -> `inferCanonicalPersonalCapabilities()` | structured signals -> canonical proposals/mapping results | yes | yes | yes | **yes** | yes |
| Materializer | `materializeProvisionalCareerMap()` | evidence + `ProvisionalMappingResult[]` -> schema 2 state | yes | yes | materializes admitted relationships only | no new inference | yes |
| State validator/storage | `validateProvisionalLocalCareerMapState()` -> `writeLocalCareerMapState()` | candidate state -> one atomic browser write | yes | yes | no | no | yes |

## Deterministic Mandatory Gateway

First concrete owner: `buildProvisionalCareerMapFromText()` in `lib/career-possibility/build-provisional-career-map-from-text.ts`.

Exact branch:

```text
bridgeEvidenceToProvisionalSignals(...)
-> if bridged.status === "structured"
     mapProvisionalResumeEvidencePlural(...)
-> otherwise
     inactiveMappingResult(... status unsupported/unresolved ...)
```

Evidence without an authored deterministic signal is classified `unsupported` before canonical inference. It cannot propose a capability. This is the first runtime point at which signal presence becomes mandatory.

The orchestrator is `TRACKED_HOLD`; it is not writable in Task 2B without separate admission. It is not needed for the recommended contract/validator slice.

## Existing Canonical Personal Inference Owner

Owner:

- Contract: `lib/career-possibility/canonical-personal-capability-inference-contract.ts`
- Implementation: `inferCanonicalPersonalCapabilities()` in `lib/career-possibility/canonical-personal-capability-inference.ts`
- Compatibility projection: `mapProvisionalResumeEvidencePlural()` and `projectPluralCanonicalInferenceToProvisionalMappingResults()` in `lib/career-possibility/provisional-resume-capability-mapper.ts`

Observed properties:

- Accepts one evidence record with exact `evidenceId`, source excerpt/locator/revision, semantic signals, authored policy, canonical definitions, and registry version.
- Validates authored policy capability IDs against the canonical library.
- Produces zero, one, or plural `CanonicalPluralCapabilityProposal` values for one evidence record.
- Preserves `evidenceId` on every proposal.
- Represents `direct_evidence` and `transferable_signal` distinctly.
- Coalesces same-capability/same-relationship rule matches.
- Fails one capability closed on conflicting relationships while allowing unrelated valid capabilities to survive.
- Is pure/deterministic apart from deterministic Web Crypto identity generation.
- Is runtime active only after the deterministic signal bridge succeeds.
- Multiple evidence records can support one capability downstream because the materializer groups mappings by capability and deduplicates direct/transferable evidence IDs.

Reuse boundary:

- `EXISTING_OWNER_REUSED`: canonical library, canonical relationship vocabulary, deterministic identity patterns, compatibility projection concepts, and downstream materializer/state.
- The current canonical inference **input** is signal/policy based. It cannot receive raw LLM assessments without inventing fake signals or authored rules.
- Its current proposal method is fixed to `authored_deterministic` and requires matched rule provenance. Raw LLM assessments must not masquerade as this type.

## Existing Proposal / Admission Boundary

The reusable downstream boundary is:

```text
governed ProvisionalMappingResult[]
-> materializeProvisionalCareerMap()
-> validateProvisionalLocalCareerMapState()
```

`projectPluralCanonicalInferenceToProvisionalMappingResults()` is reusable as a pattern but currently accepts only an already trusted `CanonicalPluralCapabilityInferenceResult` with authored-rule provenance.

There is no current owner that accepts a validated Career Map LLM assessment and governs it into the existing proposal/mapping boundary. That adapter belongs to Task 2C, after Task 2B establishes the provider-neutral response contract and validator.

Preferred integration boundary:

`PREFERRED_INTEGRATION_BOUNDARY = validated Career Map structured assessments -> governed relationship/proposal adapter -> ProvisionalMappingResult[] -> materializeProvisionalCareerMap()`.

## Existing Materializer and State Owners

- `materializeProvisionalCareerMap()` in `lib/career-possibility/provisional-career-map-materializer.ts`: consumes evidence and mapping results; only `auto_admitted` mappings become capabilities.
- `validateProvisionalLocalCareerMapState()` in `lib/career-possibility/local-career-map-state.ts`: validates canonical IDs, evidence cross-references, relationship values, versions, trust status, and state shape.
- `writeLocalCareerMapState()` in `lib/career-possibility/local-career-map-storage.ts`: validates before one atomic browser-local write.

These owners remain authoritative and must not be duplicated.

An entirely empty admitted mapping set currently fails closed with `no_unambiguous_mappings`; Task 2B only needs an empty result to be valid per evidence. Overall empty-map product behavior is a later production-orchestration concern, not permission to create state from zero proposals.

## Existing Career Map Structured LLM Work

File: `scripts/run-career-map-llm-experiment.ts`

Status: `UNTRACKED_HOLD / EXPERIMENT_ONLY / PARTIAL`

Observed implementation:

- Direct provider: `GoogleGenAI` from `@google/genai`.
- Model: hard-coded `gemini-3.6-flash`.
- Environment: `GEMINI_API_KEY`.
- Structured-output mechanism: `responseMimeType: "application/json"` plus provider `responseSchema`.
- Inline response shape: evidence ID plus `capabilityAssessments[]` with capability ID, `directly_supported|transferable_support`, and grounding rationale.
- Prompt prohibits employer/title/seniority/target-role inference and permits zero assessments.
- Checks canonical IDs, duplicate capability IDs within a known evidence result, nonblank rationale, and support enum.
- Uses `slice(0, 3)` for fan-out; excess is silently truncated rather than rejected under an admitted policy.
- Does not strictly validate the top-level schema after `JSON.parse`.
- Does not reject unknown extra evidence IDs or require exactly one result for every supplied evidence ID.
- Has no reusable contract version, provider-neutral producer interface, deterministic output identity, governed support-state adapter, test suite, or production import.
- Contains hard-coded historical founder evidence and no persisted reproducible result.

Conclusion: useful proof of technical feasibility, not an admissible production owner.

## Job Copilot Technical Pattern Audit

Reusable technical patterns:

- `lib/career-engine/matching/llm-evidence-mapper.ts`: `@google/genai`, low-temperature provider call, JSON MIME type, provider response schema, response-text check, JSON parse, and fail-closed empty return.
- `lib/career-engine/matching/llm-job-signal-extractor.ts`: environment/config normalization, timeout/abort, bounded response extraction, JSON-fence removal, runtime normalization, usability checks, and fail-closed result envelope.
- Existing `@google/genai` package dependency can be reused; no package change is required for a Gemini adapter.

Job Copilot semantics that must not be reused:

- JD target capability selection.
- Candidate matched/missing classification.
- Confidence labels or scores.
- Skill-gap mutation.
- Role family, seniority, fit, ranking, recommendation, or job-specific outcome semantics.
- Free-form capability labels as canonical personal IDs.

`JOB_COPILOT_SEMANTICS_REUSED = NO`.

## Provider Abstraction Audit

Classification: `PARTIAL_PROVIDER_BOUNDARY`.

Repository truth:

- Gemini is invoked directly in `llm-evidence-mapper.ts` and the untracked Career Map experiment.
- DeepSeek is invoked directly by `llm-job-signal-extractor.ts` with its own environment, request, timeout, parsing, and cache logic.
- No generic model client or provider-neutral structured-output adapter is shared across these owners.
- Task 2B should define a CareerTwin-owned producer interface and validated result envelope. A concrete provider adapter can implement it without owning Career Map semantics.

## Minimum Task 2 Structured Contract

The minimum provider-neutral contract should be versioned and contain:

```text
EligibleCareerCapabilityEvidence {
  evidenceId
  sourceText
}

CareerCapabilityStructuredInferenceResponse {
  contractVersion
  results: [
    {
      evidenceId
      capabilityAssessments: [
        {
          capabilityId
          supportAssessment: directly_supported | transferable_support
          groundingRationale
        }
      ]
    }
  ]
}
```

Contract rules:

- Provider input receives only Task-1-eligible evidence identity/text plus canonical definitions. Employer/title are not semantic input fields.
- Exactly one result is required for each supplied evidence ID; missing, duplicate, or unknown result IDs fail closed.
- `capabilityAssessments: []` is the explicit valid zero-capability result for an evidence record.
- Each assessment references one supplied evidence ID and one existing canonical capability ID.
- Grounding rationale is required and nonblank, but is explanatory provenance rather than truth.
- No numeric confidence, role/JD fields, fit, ranking, recommendation, title authority, employer authority, or course/action-plan fields are admitted.
- A provider-neutral `CareerCapabilityInferenceProducer` returns unknown/raw structured output; the deterministic validator alone returns a validated result.

## Deterministic Validator Boundary

Required checks:

1. Contract version and complete runtime schema.
2. Top-level result collection is present and bounded to supplied evidence.
3. Every result evidence ID exists in the supplied eligible evidence set.
4. Every supplied evidence ID appears exactly once.
5. Every capability ID exists in `canonicalCapabilityLibrary.capabilities` or the caller-supplied authoritative canonical definitions.
6. Support assessment is exactly `directly_supported` or `transferable_support`.
7. Grounding rationale is a nonblank string.
8. Duplicate evidence results are rejected.
9. Duplicate evidence/capability assessments are rejected rather than silently counted twice.
10. Conflicting support states for the same evidence/capability are rejected.
11. Unknown evidence and unknown capability IDs are rejected.
12. Malformed response fails closed with no validated proposals.
13. Empty assessments per supplied evidence are accepted.
14. Fan-out enforcement follows the explicit Founder/EM policy; no silent truncation.
15. Validator output is immutable/provider-neutral and has no storage, materializer, network, or UI dependency.

Canonical-ID validation for provider assessments: `MISSING` as a dedicated owner; the canonical library is available to the new validator.

Evidence-ID validation for provider assessments: `MISSING`; the new validator must cross-check the exact supplied eligible evidence set.

Raw provider output cannot currently write state because the experiment is disconnected and production storage accepts only validated state. Task 2B must preserve that separation.

## Bounded Fan-Out

Status: `BOUND_FANOUT_DECISION_REQUIRED`.

No canonical production policy limits assessments per evidence. The deterministic plural inference tests demonstrate three proposals but the implementation has no maximum. The experiment's `maximum 3` prompt and `slice(0, 3)` behavior are untracked and noncanonical.

Founder/EM must decide before Task 2B:

1. The maximum validated canonical capability assessments allowed per evidence record.
2. Whether exceeding the maximum rejects only that evidence result or rejects the whole model response.

Silent truncation is not admissible because it hides provider-contract failure and makes output order semantically significant.

## Direct / Transferable Ownership

Classification: `LLM_MAY_PROPOSE_EXISTING_GOVERNED_ADMISSION`.

- The model may propose `directly_supported` or `transferable_support`.
- The existing canonical relationship vocabulary remains `direct_evidence|transferable_signal`.
- Existing authored deterministic inference owns relationship admission for the deterministic channel.
- The architecture document explicitly requires deterministic Career Map governance before a model support assessment becomes a final relationship.
- No current adapter performs that governance for LLM assessments. Task 2B validates the proposed support state but does not auto-promote it to final personal truth; the governed adapter is Task 2C.

## Deterministic and LLM Coexistence

Intended topology:

```text
authored deterministic proposals --+
                                  +-> common governed mapping/admission adapter -> existing materializer/state
validated LLM assessments --------+
```

Existing deterministic dedupe:

- `inferCanonicalPersonalCapabilities()` coalesces duplicate authored rules for one capability/relationship.
- `materializeProvisionalCareerMap()` deduplicates evidence IDs inside direct/transferable capability arrays.

Missing common owner:

- There is no owner that merges deterministic mappings with validated LLM assessments, resolves same evidence/capability support-state conflicts, and emits one governed mapping relationship.
- This adapter belongs to Task 2C. Task 2B must not create a second mapper or materializer.

## Task-2-Relevant HOLD Map

| File | State | Relevance / writability |
|---|---|---|
| `lib/career-possibility/canonical-personal-capability-inference-contract.ts` | `CLEAN_COMMITTED` | reusable canonical types; do not alter in Task 2B unless separately justified |
| `lib/career-possibility/canonical-personal-capability-inference.ts` | `CLEAN_COMMITTED` | existing deterministic canonical inference owner; reused, not replaced |
| `lib/career-possibility/provisional-resume-capability-mapper.ts` | `CLEAN_COMMITTED` | compatibility projection pattern; no Task 2B edit required |
| `lib/career-possibility/provisional-evidence-signal-contract.ts` | `CLEAN_COMMITTED` | deterministic channel retained |
| `lib/career-possibility/provisional-evidence-signal-bridge.ts` | `CLEAN_COMMITTED` | deterministic mandatory-gateway producer; no Task 2B edit |
| `lib/career-possibility/provisional-evidence-signal-policy.ts` | `CLEAN_COMMITTED` | deterministic channel retained |
| `lib/career-possibility/provisional-career-map-materializer.ts` | `CLEAN_COMMITTED` | authoritative materializer; reused, not changed in Task 2B |
| `lib/career-possibility/local-career-map-storage.ts` | `CLEAN_COMMITTED` | authoritative storage; reused, not changed |
| `lib/career-possibility/build-provisional-career-map-from-text.ts` | `TRACKED_HOLD` | production gateway/orchestration plus provenance HOLD; Task 2C requires separate admission if edited |
| `lib/career-possibility/provisional-resume-mapping-contract.ts` | `TRACKED_HOLD` | provenance-only employer/title additions; Task 2C may require separate admission for method/provenance extension |
| `lib/career-possibility/local-career-map-state.ts` | `TRACKED_HOLD` | provenance validation changes; not writable in Task 2B |
| `lib/career-possibility/local-career-map-presentation-adapter.ts` | `TRACKED_HOLD` | downstream provenance presentation; out of Task 2B |
| `tests/career-possibility/build-provisional-career-map-from-text.test.ts` | `TRACKED_HOLD` | provenance coverage; not writable in Task 2B |
| `scripts/run-career-map-llm-experiment.ts` | `UNTRACKED_HOLD` | experiment-only; audit input, not production source |
| `tests/career-possibility/career-map-provenance-chain.test.ts` | `UNTRACKED_HOLD` | provenance test; includes stale education-evidence expectation and is not a Task 2B surface |

No existing tracked structured-inference contract or validator file is present.

## First Writable Fault

Classification: `STRUCTURED_CONTRACT_MISSING`.

Dependency order:

1. Provider-neutral response/request contract and producer boundary: missing.
2. Strict deterministic validator for schema/evidence/canonical IDs/support/rationale/duplicates/fan-out/zero: missing.
3. Concrete provider adapter: missing as a Career Map owner; technical patterns exist.
4. Governed support-state/proposal adapter: missing.
5. Production orchestration connection: disconnected and currently HOLD-entangled.

The first safe writable boundary is new files for items 1 and 2. Editing the HOLD production orchestrator before those exist would connect unvalidated output and violate dependency order.

## Exact Task 2B Implementation Slice

After Founder/EM admits the fan-out contract, implement exactly one slice:

**Provider-neutral Career Map structured-inference contract + injectable producer boundary + strict deterministic validator.**

Exact candidate files:

- `lib/career-possibility/career-capability-structured-inference-contract.ts` — `NEW_FILE_SAFE`
- `lib/career-possibility/career-capability-structured-inference-validator.ts` — `NEW_FILE_SAFE`
- `tests/career-possibility/career-capability-structured-inference-validator.test.ts` — `NEW_FILE_SAFE`

The slice must not:

- invoke a live provider in production;
- modify `buildProvisionalCareerMapFromText()`;
- output `ProvisionalMappingResult` or materialized state;
- invent a signal or canonical ID;
- decide final direct/transferable admission;
- modify HOLD files;
- create provider-specific semantic types.

## Task 2B Acceptance Conditions

UNIT_REQUIRED:

1. Valid eligible evidence + known canonical capability + valid support/rationale -> validated assessment retaining exact IDs.
2. Eligible evidence + empty assessments -> valid explicit zero result.
3. Unknown canonical capability -> fail closed.
4. Unknown evidence ID -> fail closed.
5. Missing supplied evidence result -> fail closed.
6. Duplicate evidence result -> fail closed.
7. Duplicate evidence/capability assessment -> fail closed.
8. Conflicting support assessment for one evidence/capability -> fail closed.
9. Invalid support enum -> fail closed.
10. Blank rationale -> fail closed.
11. Malformed/non-object/provider text -> fail closed.
12. Fan-out boundary and excess behavior -> exact admitted policy, no truncation.
13. Evidence with no deterministic signal still validates when provider assessment is otherwise valid.
14. Contract/validator source has no storage, materializer, UI, Job Copilot semantic, role/JD, confidence, fit, or provider-specific dependency.
15. Raw producer output has no type-compatible direct path to personal state.

INTEGRATION_LATER (Task 2C):

- Deterministic mappings + validated LLM assessments merge without double counting.
- Same evidence/capability relationship conflict fails closed under one governed owner.
- Validated proposal adapter feeds the existing `ProvisionalMappingResult[]` / materializer boundary.
- `buildProvisionalCareerMapFromText()` assesses eligible no-signal evidence without requiring a bridge hit.
- Overall zero proposals remains safe and does not mutate existing browser state.
- Existing deterministic fixtures remain unchanged.

REAL_CV_LATER (Task 2D):

- Privacy-safe/Founder-CV coverage comparison after production connection.
- No private CV content is required for Task 2B.

## Existing Owners Reused / No Parallel Pipeline

- Canonical ontology: `canonicalCapabilityLibrary` — `EXISTING_OWNER_REUSED`.
- Deterministic canonical inference: `inferCanonicalPersonalCapabilities()` — `EXISTING_OWNER_REUSED` as the deterministic channel and governance reference.
- Relationship vocabulary: canonical `direct_evidence|transferable_signal` — `EXISTING_OWNER_REUSED`.
- Materializer: `materializeProvisionalCareerMap()` — `EXISTING_OWNER_REUSED`.
- State validator: `validateProvisionalLocalCareerMapState()` — `EXISTING_OWNER_REUSED`.
- Storage: `writeLocalCareerMapState()` — `EXISTING_OWNER_REUSED`.
- Atomic evidence: Task 1 `ResumeEvidenceRecord` identity/source boundary — `EXISTING_OWNER_REUSED`.

Parallel semantic system required: `NO`.

The new Task 2B validator is a provider-output trust boundary, not a second capability mapper, canonical ontology, materializer, or state owner.

## Verification Performed

PASS:

- `npx tsx tests/career-possibility/canonical-personal-capability-inference.test.ts`
- `npx tsx tests/career-possibility/canonical-multi-proposal-inference.test.ts`
- `npx tsx tests/career-possibility/provisional-resume-capability-mapper.test.ts`
- `npx tsx tests/career-possibility/build-provisional-career-map-from-text.test.ts`
- `npx tsx tests/career-possibility/provisional-career-map-state.test.ts`
- `npm run build`

No failures were repaired. No production source, test, control, package, architecture, Role Knowledge, graph, ranking, presentation, or renderer file was modified.

## Explicit Out of Scope

- Task 2B implementation before fan-out admission.
- Live provider invocation or production LLM route.
- Task 2C orchestration, merge, support-governance, mapping-contract, materializer, state, storage, or HOLD admission.
- Task 2D private/real-CV validation.
- Task 1 extractor changes.
- Canonical ontology or definition changes.
- Deterministic signal/policy/mapping deletion or expansion.
- Role Knowledge, source sufficiency, scanners, triangulation, graph projection, role ranking/radius, presentation grouping, renderer, Task 3, and Task 4.

## Final Admission Judgment

Decision: `MVP_TASK2_CONTRACT_DECISION_REQUIRED`.

Task 2B is structurally ready as a clean new-file-only contract/validator slice, but it is not admissible until Founder/EM decides the production bounded-fan-out policy and excess-response behavior.

Single next action: Founder/EM selects the maximum validated capability assessments per evidence and whether an excess rejects that evidence result or the whole response. Then admit the exact three-file Task 2B slice above.
