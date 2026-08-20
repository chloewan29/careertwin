# Post-MVP Task F — Transformation Project Capability Coverage Audit

Status: `AUDIT ONLY`

Authority: `NON-CANONICAL UNTIL FOUNDER / EM REVIEW`

No raw CV text, raw evidence text, provider output, or personal metadata is reproduced here.

## Audit decision

- Decision: `POST_MVP_TASK_F_TRANSFORMATION_COVERAGE_DEFECT_IDENTIFIED`
- First failure boundary: `STRUCTURED_INFERENCE_GAP`
- Smallest valid repair class: `STRUCTURED_INFERENCE_REPAIR`
- Architecture risk: `PRESERVE_CURRENT_ARCHITECTURE`
- New canonical capability required: `NO`
- Material semantic defect: `YES`

## Architecture and scope lock

The accepted chain remains:

`professional source → atomic professional evidence → eligibility → validated structured inference → canonical capability identity → personal capability state → Career Map projection → presentation`

Personal capability truth remains evidence-grounded. Titles, employers, education, skills lists, role requirements, and renderer behavior cannot create personal capability. Raw model output remains non-authoritative. Task F made no production, test, control, canonical-library, role-library, projection, renderer, inference, eligibility, materializer, persistence, provider, or API changes.

## Provenance inventory

| Provenance source | Availability | Privacy-safe identity / purpose |
| --- | --- | --- |
| Founder CV used by the accepted Task 4/real-state run | available locally | `Chloe_Wan_BI.docx`; SHA256 `D5F627CF6294A208354D587609F0B2A8104305ACE49E4D5A5DA53868B4EBAB6A` |
| Historical Task 2D Founder CV input | available locally | `Chloe_Wan_CV.docx`; SHA256 `E4121F8D0B3240C009620DC7511BED74C90879E3965D143BF5D071F1406E9C49`; different historical input, used only for provenance comparison |
| Accepted Founder Career Map state | available locally | `careertwin-real-state-a1.json`; SHA256 `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`; schema `2.0.0` |
| Task 2D validation history | available in repository | `career-map-mvp-task2d-real-cv-capability-validation.md` and measurement replay |
| Task 4 materialization/visual history | available in repository | `career-map-mvp-task4-real-cv-visual-validation-browser-retry.md` |
| Atomic evidence, admitted mappings, materialized capabilities | available | retained in the accepted real-state file |
| Raw structured-provider response and rejected-result diagnostics | unavailable by design | not persisted; no provider rerun was performed |

Source-chain classification: `SOURCE_CV_AVAILABLE`.

## Transformation-project candidate

- Privacy-safe reference: `TRANSFORMATION_PROJECT_EVIDENCE_CANDIDATE_01`
- Source section category: `PROFESSIONAL_EXPERIENCE`
- Approximate source location: extracted document paragraph 13; normalized offsets 1626–1865
- Privacy-safe project category: `ANALYTICS_OPERATING_TRANSFORMATION_AND_ENABLEMENT`
- Source occurrence: the accepted source contains one transformation-bearing professional paragraph, and its normalized text exactly matches the retained atomic evidence excerpt
- Evidence identifier: `evidence:bundle:career-source-revision:schema-1.0.0:normalisation-lf-bom-1.0.0:sha256:4c4167cd25057c715c29a7c4531459ac73cee90cfed3d23c34f00dd9aa02516d:2`
- Evidence excerpt SHA256: `B485AFA1D38CD30D598B1612BB0668FC2CEC6C14C7A843D194024ABAD046055A`
- Attributable atomic evidence count: `1`
- Concrete professional action/outcome truth: `YES`
- Evidence quality: `STRONG_ACTION_OUTCOME_EVIDENCE`
- Privacy-safe semantic features: leadership/championing, transformation, standardisation/governance, platform enablement, and adoption. No raw wording is retained in this artifact.

## End-to-end trace

| Boundary | Result | Evidence |
| --- | --- | --- |
| Source present | `YES` | exact normalized candidate match in the Task 4 source |
| Atomic evidence created | `YES` | candidate evidence ID above |
| Evidence eligibility | `YES` | professional-experience evidence admitted by `qualifiesAsPerformedProfessionalEvidence()`; it is neither heading, education, qualification, skills-list, nor metadata-only content |
| Reached structured inference | `YES` | final mappings for this evidence use `method: structured_inference` |
| Structured proposal produced | `YES` | two structured capability assessments survived into admitted mappings |
| Deterministic validation | `ACCEPTED` | both assessments became `auto_admitted`; the validator admits a result only when that evidence result has zero issues |
| Accepted canonical mapping 1 | `analytics-governance` — Analytics Governance — Governance & Risk | direct evidence; materialized; supporting evidence linked |
| Accepted canonical mapping 2 | `tooling-enablement` — Tooling Enablement — Data & Technology | direct evidence; materialized; supporting evidence linked |
| Accepted mapping quality | `PARTIALLY_REPRESENTATIVE` | governance and enablement are truthful, but the visible labels do not communicate the demonstrated transformation-leadership dimension |
| Canonical coverage | `A — ALREADY COVERED BY AN EXISTING CANONICAL CAPABILITY` | `change-leadership` — Change Leadership — Strategy & Transformation existed in canonical content version `1.2.0` supplied to the accepted run |
| Personal capability materialization | `YES` for both accepted mappings | both capability records exist and link the candidate evidence directly |
| Graph projection | `YES` for both accepted mappings | both canonical families exist and the projection emits admitted personal capabilities and their evidence links |
| Default presentation | accepted mappings visible/reachable; transformation meaning not recognizable | presentation faithfully displays the generic accepted canonical labels |
| Role Focus | accepted mappings visible when role-relevant and otherwise retained/dimmed | no hidden transformation capability exists for Role Focus to reveal |
| Evidence interaction | `AVAILABLE` | accepted Task C/D evidence hover/focus path retains the linked concrete evidence on demand |

## First failure analysis

The first failure is `STRUCTURED_INFERENCE_GAP`.

The project survives source extraction and eligibility. Structured inference returned valid assessments for Analytics Governance and Tooling Enablement, and deterministic validation accepted the entire evidence result. The same evidence materially demonstrates the already-canonical Change Leadership dimension, but no `change-leadership` mapping exists in the accepted result.

This is not a validator ambiguity. `validateCareerCapabilityStructuredInferenceResponse()` rejects an evidence result when any assessment in that result has an issue and only adds it to `validEvidenceResults` when the result has zero issues. Because two assessments from this evidence were accepted and materialized, there was no hidden rejected third assessment in the same result. The missing dimension was absent before validation.

It is also not a canonical-library gap: `change-leadership` already exists in the exact canonical content version used by the real-state run. It is not a materialization, graph-projection, or renderer defect: those layers faithfully carry the mappings they received.

## First writable owner

- File: `lib/career-possibility/career-capability-structured-inference-gemini-provider.ts`
- Boundary: `buildPrompt()` and its versioned structured-inference instruction/selection behavior
- Why first: this is the earliest existing writable owner that selects which already-canonical capability IDs are proposed for eligible evidence. Extraction and eligibility supplied the evidence correctly; validation and every downstream owner preserved what was proposed.

## Smallest valid repair recommendation

Recommend one bounded `STRUCTURED_INFERENCE_REPAIR`: strengthen and version the inference completeness instruction so one atomic evidence item can retain each independently grounded capability dimension up to the existing contract limit, then replay this one privacy-safe owner case through the existing validator/materializer chain under separate Founder/EM admission.

The repair must not keyword-map the word “transformation,” invent capability ownership, add a canonical capability, change evidence eligibility, weaken the validator, bypass canonical IDs, or patch presentation. The owner case should require grounded transformation leadership behavior, not the word alone.

Architecture classification: `PRESERVE_CURRENT_ARCHITECTURE`. The existing contract already supports up to three independently grounded assessments and the required canonical ID already exists. A provider replay is not part of this audit and would require explicit repair-task authorization.

## Next-task gate

Task F remains audit-only. No repair is implemented or admitted automatically. The single next action is Founder/EM review of this evidence and, if accepted, explicit admission of one bounded structured-inference repair and owner-case replay.
