# CANONICAL CAPABILITY SEMANTIC AUTHORING POLICY DRAFT

> [!WARNING]
> **NON-AUTHORITATIVE POLICY DRAFT**
> NOT YET PRODUCTION GOVERNANCE
> REQUIRES FOUNDER/EM APPROVAL

This document defines the automated, scalable policy for authoring universal canonical capability semantics (definition, direct evidence standard, transferable evidence standard, and out-of-scope).

## 1. Semantic Source Packet & Sufficiency Gate
Before authoring a rubric, the process must compile a **SEMANTIC SOURCE PACKET** containing (where available):
A. Canonical ID / label / family
B. Every Generic Role usage
C. Role-specific `expectedEvidence`
D. Importance / `minimumProofLevel`
E. Mapping-policy semantic clues
F. Evidence/signal semantic clues
G. Relevant family context
H. Semantic sibling / neighbour evidence

**Source Sufficiency Classification:**
Before generation, source support must be classified as `STRONG`, `MODERATE`, `WEAK`, or `INSUFFICIENT`. `INSUFFICIENT` includes cases where the system effectively has only purely taxonomic/lexical information (e.g., ID, label, family).

**Generation Admission Gate:**
A capability may proceed to automatic semantic rubric generation ONLY if the source packet passes the minimum source-sufficiency threshold. If `INSUFFICIENT`, the system must ABSTAIN, return `SEMANTIC_SOURCE_INSUFFICIENT`, and route for ontology/product review. It must NOT manufacture fields from the label alone.

## 2. Required Source Trace
For every generated capability rubric, the output must include a source trace showing:
- `ROLE_USAGES_USED`
- `EXPECTED_EVIDENCE_USED`
- `MAPPING_CLUES_USED`
- `EVIDENCE_CLUES_USED`
- `FAMILY_CONTEXT_USED`
- `SIBLING_EVIDENCE_USED`
- `SOURCE_SUFFICIENCY_CLASSIFICATION`
A generation system cannot claim STRONG or MODERATE confidence without this corresponding source evidence.

## 3. Source Precedence Policy
When generating canonical semantics, evaluate source material using this explicit precedence hierarchy:
1. **Repeated Invariant Meaning:** The invariant core derived from multiple consistent canonical role usages (`expectedEvidence`) across different domains.
2. **Rich Archetype Semantics:** Highly structured `expectedEvidence` and `minimumProofLevel` from defined `GenericRoleArchetype` instances.
3. **Role/Mapping/Evidence Clues:** Consistent mapping rules or deterministic extraction semantics.
4. **Family Taxonomy:** Used strictly as a contextual boundary constraint, never as the core definition.
5. **Label-Only:** A weak fallback that flags the capability as `INSUFFICIENT` or `LOW` confidence requiring manual definition.

*Handling Exceptions:*
- **Private/Noncanonical IDs:** Exclude from canonical definitions; flag for potential mapping/collision, but never use to define canonical truth.
- **Multiple Conflicting Usages:** Triggers `POSSIBLE_DRIFT` or `MATERIAL_DRIFT`. Do not average conflicts; flag for human product review.

## 4. Universal Definition Generation Rule
The `definition` must express the **invariant semantic core** of the capability.
- **Ingredients:** The defining performed action + the semantic object/target + (optionally) the purpose/outcome if essential for distinguishing the capability.
- **Global Exclusions:** Definitions must actively exclude employer, title, seniority, specific role mandates, specific users, specific CV bullets, and unnecessary industry/tool context.
- Contextual nouns are permitted only when they are necessary to express the semantic object that defines the capability itself.

## 5. Direct / Transferable / None Model
Refine the classification of evidence into a strict three-state model:

**DIRECTLY_SUPPORTED**
The evidence demonstrates meaningful performance of the defining capability itself.

**TRANSFERABLE_SUPPORT**
The evidence demonstrates meaningful agentic performance of a real defining sub-component, but one or more material components required for the full capability are absent.
*(Note: NOT DIRECT does NOT imply TRANSFERABLE. See five-gate test below.)*

**NO_SUPPORT**
The evidence demonstrates only exposure, adjacency, participation, consumption, routine execution, compliance, or unrelated activity.

## 6. Direct Evidence Policy
The `directEvidenceStandard` must reflect the core principle: **Direct evidence demonstrates meaningful performance of the capability's defining action itself.**
- It distinguishes true performance from mere ownership, participation, exposure, consumption, or execution of someone else's design.
- It does NOT globally require formal leadership, people management, or sole accountability, ensuring applicability across individual-contributor and leadership capabilities alike.

## 7. Transferable Support Policy: The Five-Gate Test
To prevent transferability inflation, **TRANSFERABLE_SUPPORT** must pass ALL FIVE of the following gates. Being subject to, a consumer of, a participant around, an operator of, compliant with, or exposed to the target capability is explicitly insufficient.

### Gate 0 — Semantic Source Grounding
Before proposing any transferable foundation, the authoring process must be able to explain: "Which governed semantic source supports treating this performed activity as a defining sub-component of the target capability?" Valid grounding may come from repeated cross-role semantic evidence, rich role expectedEvidence, consistent mapping/evidence semantics, or governed semantic sibling analysis. The generator itself cannot invent a component relationship without source grounding. If Gate 0 fails, NO transferable standard should be inferred (use NO_SUPPORT).

### Gate 1 — Agentic Performance
The evidence must show the person actively performed, created, shaped, adapted, established, coordinated, designed, improved, interpreted, or otherwise materially contributed to something. Passive presence or consumption fails.

### Gate 2 — Defining-Component Relevance
The performed action must correspond to a genuine semantic sub-component of the target capability's defining action. It is not enough for the work to occur near the capability, in the same domain, using the output of the capability, or inside a team performing the capability. The authoring process must be able to explain: "Which defining component of capability X did this performed action demonstrate?" If unanswerable, it is NO_SUPPORT.

### Gate 3 — Material Contribution
The performed sub-component must be meaningful enough to demonstrate a credible foundation. Reject: meeting attendance, passive participation, following instructions, routine operation, mere tool use, compliance with established standards, consuming an existing framework, being assigned to a relevant team, or observing others perform the capability. These are NO_SUPPORT unless additional evidence demonstrates an agentic, material contribution.

### Gate 4 — Explicit Missing Material Element
The system must be able to name the material defining element that is missing and therefore prevents DIRECTLY_SUPPORTED.
Conceptually: PERFORMED COMPONENT + TARGET SEMANTIC CONNECTION + MISSING MATERIAL COMPONENT.
If the missing component cannot be stated coherently, do not classify as transferable. Use NO_SUPPORT.

## 8. Capability Decomposition Consequence
Before generating a `transferableEvidenceStandard`, the semantic authoring process should conceptually identify the capability's defining components abstractly:
`CAPABILITY = defining action + semantic object + (material purpose/outcome where identity-relevant)`
Then ask: Which performed components could provide legitimate transferability? (This is semantic decomposition, not rigid syntax).

**Transferable Standard Generation Rule:**
A generated `transferableEvidenceStandard` should describe both:
A. the meaningful performed sub-component, AND
B. the missing material element preventing direct support.
*Preferred conceptual structure:* "Evidence of [performed defining sub-component], without demonstrating [material element required for direct capability]." Both elements must be present.

## 9. No-Support Policy
`NO_SUPPORT` is a first-class semantic outcome. Reusable global categories automatically injected into out-of-scope boundaries include:
- `EXPOSURE_ONLY`
- `PARTICIPATION_ONLY`
- `TOOL_USE_ONLY`
- `TITLE_ONLY` / `EMPLOYER_ONLY` / `KEYWORD_ONLY`
- `PASSIVE_CONSUMPTION`
- `OUTPUT_WITHOUT_DEFINING_ACTION`
- `SUBJECT_OF_CONTROL_ONLY`
- `COMPLIANCE_ONLY`
- `CONSUMER_OF_FRAMEWORK_ONLY`
- `OPERATOR_OF_EXISTING_METHOD_ONLY`
- `TEAM_MEMBERSHIP_ONLY`
- `COORDINATION_PROXIMITY_ONLY`
- `PASSIVE_EXECUTION_ONLY`

## 10. Out-of-Scope Generation Policy
`outOfScope` is deterministically constructed via:
**Global Exclusions (No-Support Cases)** + **Capability-Specific Defining-Action Failures** + **Semantic-Sibling Exclusions**.
- It captures what is missing when the defining action is absent and highlights the likely sibling confusions to actively prevent false positives.

## 11. Semantic Sibling Policy
The authoring process actively queries: *"What nearby canonical capability could incorrectly absorb this evidence?"*
Meaningful siblings are identified via: shared role usages, overlapping mapping tokens, frequent co-occurrence, and known historical confusions. Family proximity is a clue, but not a guarantee of sibling status.

## 12. Role-Library Triangulation Policy
Role-specific `expectedEvidence` is INPUT EVIDENCE, not canonical authority. The process must:
- Collect all usages → Compare wording → Identify the invariant core.
- Actively strip domain-specific residue, role-mandate residue, and seniority residue.
- Calculate coverage: `STRONG` (3+ contexts), `MODERATE` (2 contexts), `WEAK` (1 context), `NONE`.

## 13. Semantic Drift Detection
When a canonical capability spans materially different meanings across profiles, it is classified:
- `CONSISTENT`
- `MINOR_CONTEXT_VARIATION` (safe to abstract)
- `POSSIBLE_DRIFT`
- `MATERIAL_DRIFT` (divergent meanings). Material drift must NOT be averaged; it automatically halts automated generation and routes for manual ontology review.

## 14. Proof Maturity Policy
Preserves the explicit boundary between **Capability Meaning** and **Role Required Proof Maturity**. Minimum proof levels (`signal`, `demonstrated`, `owned_outcome`) dictate role threshold requirements, but do NOT leak into the universal canonical definition unless the capability inherently necessitates ownership.

## 15. Quality Validator
A structured, provider-independent checklist to validate generated rubrics:
- **SOURCE TRACE:** `SOURCE_PACKET_PRESENT`, `SOURCE_SUFFICIENCY_ABOVE_THRESHOLD`, `ROLE_USAGE_TRACE_VALID`, `EXPECTED_EVIDENCE_TRACE_VALID`, `TRANSFERABLE_COMPONENT_SOURCE_GROUNDED`, `NO_LABEL_ONLY_AUTHORING`. (If required source evidence is absent, generation fails closed / abstains).
- **DEFINITION:** Is it role/user/tool independent? Is it non-circular? Does it distinguish from siblings?
- **DIRECT:** Does it require the performed defining action? Does it avoid title/seniority inference and accidental sole-ownership mandates?
- **TRANSFERABLE:** Must pass Gates 0-4 (`TRANSFERABLE_COMPONENT_SOURCE_GROUNDED`, `AGENTIC_ACTION_PRESENT`, `DEFINING_COMPONENT_IDENTIFIED`, `MATERIAL_CONTRIBUTION_PRESENT`, `MISSING_DIRECT_COMPONENT_IDENTIFIED`, `NO_PASSIVE_PROXY`).
- **OUT OF SCOPE:** Does it contain relevant NO_SUPPORT cases and address important sibling confusions without contradicting the direct standard?

## 16. Confidence / Review Routing
Humans review exceptions, not bulk normals.
- **HIGH:** Strong semantic triangulation, no material drift, clear sibling boundaries, passes validation. Suitable for automated candidate generation, validator execution, sampled human audit, and admission.
- **MEDIUM:** Usable semantic core but incorporates newly authored boundaries. Targeted human review.
- **LOW:** Label-only semantics, conflicting usages, or inadequate evidence. Explicit ontology/product decision required.

## 17. Scale Model
1. **10 Capabilities:** Human Calibration (Current state).
2. **51 Capabilities:** Policy Validation (Testing the generalized rules).
3. **Hundreds:** Automated authoring + Confidence routing + Sampling (Reviewing only exceptions/MEDIUMs).
4. **Thousands:** Semantic Compiler + Drift Detection + Exception Governance (Fully automated structural scaling).

## 18. Future Semantic Compiler Execution Protocol
The conceptual `Canonical Capability Semantic Compiler` acts as an automated pipeline strictly separated into two phases:

**PHASE A — SOURCE COMPILATION**
Collect and freeze the Semantic Source Packet. Do NOT let the semantic generation step decide ad hoc which repo sources it wants to inspect. Source compilation is a required upstream stage.

**PHASE B — RUBRIC GENERATION**
Only then generate semantic fields from that packet under the general policy.
- **INPUTS:** Aggregates frozen Semantic Source Packet.
- **NORMALISATION & TRIANGULATION:** Strips domain residue and finds the invariant core.
- **SIBLING ANALYSIS:** Identifies and resolves adjacent confusions.
- **RUBRIC GENERATION:** Formats the 4-field standard using an LLM as a structured synthesis engine (not an authority).
- **VALIDATION & ROUTING:** Applies the Quality Validator and routes via Confidence (High/Medium/Low).
- **VERSIONING & AUDITABILITY:** Tracks source traces for every admitted definition.

## 19. Validation History
**Clean-room validation V1:**
- Result: 7/10 semantically equivalent, 3/10 material differences.
- Shared failure: `TRANSFERABILITY_INFLATION`
- Root cause: Policy allowed subject/consumer/participant states to satisfy transferable support without requiring performed defining sub-components.
- Policy response: PERFORMED SUB-COMPONENT GATE (Four-Gate Test) added.

**Clean-room validation V2:**
- Result: Test execution invalid for policy quality conclusion.
- Shared failure: 9 material transferable differences.
- Root cause: `SOURCE_GROUNDING_INSUFFICIENT` (source-starvation identified). Generation used insufficient semantic source coverage (only ID, label, family).
- Policy response: Semantic Source Sufficiency Gate + Gate 0 (Semantic Source Grounding) added. Label-only authoring prohibited.
