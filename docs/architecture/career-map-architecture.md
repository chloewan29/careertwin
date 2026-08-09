# Career Map Architecture

## 1. Purpose and Product Boundary
Career Map answers:
- Career evidence
- Capabilities actually demonstrated by that evidence
- Personal capability structure
- Adjacent/future role archetypes
- Which role requirements are evidenced, transferable, or not yet evidenced

Career Map is NOT:
- A CV timeline
- A company/title graph
- Specific-JD fit
- Job Copilot
- A course recommendation engine
- A development-plan tracker

Personal capability truth remains evidence-grounded. Role knowledge NEVER creates personal capability.

## 2. Architectural Principles
- **Semantic Authority**: The semantic source of truth is always grounded in atomic career evidence evaluated against the canonical capability library.
- **Structured Inference, Not Truth Ownership**: The LLM is a structured inference producer. It proposes mappings between evidence and canonical capabilities. It does not own the truth or the state directly.
- **Fail Closed**: Any malformed, unsupported, or ungrounded proposal from the LLM must fail safely and be excluded from the Career Map state.
- **Deterministic Validation**: All LLM proposals must pass deterministic schema and cross-reference validation before entering personal state.

## 3. Evidence-First Truth Model
NO PERSONAL CAPABILITY WITHOUT SUPPORTING CAREER EVIDENCE.
Company, title, and seniority do not establish personal capability. They serve only as provenance for evidence.

## 4. Career Map vs Job Copilot Boundary
While they share low-level LLM infrastructure, their semantics are strictly separate.
- **Job Copilot**: JD → Job-specific structured understanding.
- **Career Map**: Atomic career evidence + canonical capability definitions → evidence-grounded canonical capability assessment.
Job Copilot's fitScore, ranking, and recommendation language must not leak into Career Map.

## 5. Atomic Evidence Contract
The LLM inference basis is the atomic evidence record. One atomic evidence item may support multiple capabilities. Multiple evidence items may support one capability.

## 6. Canonical Capability Authority
The existing canonical capability library (`lib/career-possibility/canonical-capability-library.ts`) remains authoritative. Semantic inference may select existing IDs or return no capability, but it may NEVER invent new IDs.

## 7. Career Capability Structured-LLM Architecture
CV → Atomic Evidence Extraction → Career Capability LLM (Structured Output) → Deterministic schema/ID validation → Canonical capability proposals → Existing materializer / provisional state → Career Map.

## 8. Structured Output Contract Boundary
The LLM output must be constrained. It must return JSON that associates specific `evidenceId`s with `capabilityId`s from the canonical library, accompanied by a `supportAssessment` and `groundingRationale`. It must never return uncalibrated numeric confidences.

## 9. Deterministic Signal/Mapping Role
The existing deterministic signal system is NOT the mandatory gateway for every capability. Its role is now:
- High-precision inference channel
- Explicit exclusion / policy guard
- QA and regression channel
- Debugging / explainability aid

NO DETERMINISTIC SIGNAL DOES NOT MEAN NO PERSONAL CAPABILITY.

## 10. Validation and Fail-Closed Rules
The validation boundary must verify:
- Output schema
- `evidenceId` exists in current extraction
- `capabilityId` exists in the canonical library
- Allowed relationship enum
- Duplicate behavior
- Unsupported IDs are rejected
- Malformed output fails closed

## 11. Direct vs Transferable Relationship Governance
The LLM will return a support assessment (e.g., how the evidence supports the capability). Deterministic Career Map governance will then evaluate this assessment to determine the final `direct_evidence` or `transferable_signal` relationship. Semantic similarity alone cannot produce `direct_evidence`.

## 12. Personal Capability vs Role Requirement Boundary
Unsupported role requirements remain role-only. They must never become user-owned capability nodes.

## 13. Trust / Provisional / Review Model
All semantic inference proposals begin with `mapTrustStatus: "provisional"` and `reviewStatus: "unreviewed"`. The founder review workflow converts them to reviewed truth.

## 14. Versioning / Rebuild Expectations
Semantic inference behavior must be versioned alongside extraction and mapping policies. Material changes to the prompt or LLM contract require a new version marker that will invalidate stale local state.

## 15. Career Map Graph / Presentation Architecture
Long-term visual semantics place "You" at the center, surrounded by personal capability structure and canonical sub-capabilities, supported by atomic evidence. Future role nodes represent stable archetypes, not specific JDs.

## 16. Canonical Family vs UX Capability Structure
The Canonical family remains the taxonomy authority, but it is NOT automatically the UX first-ring personal capability. Taxonomy structure does not dictate presentation grouping.

## 17. Prohibited Architectural Shortcuts
Explicitly prohibited:
- Title-driven capability inference
- Company-driven capability inference
- Role/JD-driven creation of personal capabilities
- LLM-generated capability IDs outside the canonical library
- Raw LLM output writing directly to Career Map state
- Mandatory deterministic signal hit before semantic capability assessment
- Reuse of Job Copilot JD semantic contract as Career Map contract
- Job Copilot fitScore / ranking semantics inside Career Map
- Automatic treatment of canonical family taxonomy as UX first ring
- Creation of a second canonical capability ontology
- Creation of a second personal Career Map state/materializer
- Specific-JD analysis inside Career Map
- Silent promotion of semantic similarity to `direct_evidence`

## 18. Current Known Limitations
- The deterministic mapping policy currently binds coverage tightly.
- Visual presentation issues (e.g., node overlap, clipping) are deferred until the inference coverage is fully implemented and tested.

## 19. Architecture Change Governance
Changes to this architecture must be explicitly approved via an architecture audit. Semantic ownership must remain bounded and validated before persisting into the Career Map materialization pipeline.
