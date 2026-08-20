# ROLE SEMANTIC ENRICHMENT AUTHORING CONTRACT — DRAFT

> [!WARNING]
> NON-CANONICAL
> NO PRODUCTION SEMANTIC AUTHORITY

This contract governs how richer role-capability expectedEvidence candidates are authored.
It does NOT define canonical capability meaning.

## Existing Validated General Rules

*   **ROLE_SPECIFIC_MANIFESTATION**: The candidate must express how the capability manifests in the specific role.
*   **OBSERVABLE_PERFORMED_ACTION**: The candidate must describe a concrete, observable action.
*   **SEMANTIC_OBJECT**: The candidate must identify the specific object acted upon.
*   **ROLE_DECISION_OR_OUTCOME_CONTEXT**: The candidate must include the context for why the action is performed.
*   **EXPECTED_EVIDENCE_CANDIDATE**: The candidate must represent realistic proof a candidate would have.
*   **MINIMUM_PROOF_LEVEL**: The candidate must respect the proof maturity expected of the role.
*   **SEMANTIC_INPUT_BASIS**: The sources and logic used to derive the candidate must be documented.
*   **NOVEL_SEMANTIC_CONTENT**: The degree of new semantic information must be classified.
*   **AUTHORING_CONFIDENCE**: The confidence in the generated semantic meaning must be stated.
*   **REVIEW_REQUIRED**: All candidates must indicate if they require human review.

## Preserved Prohibitions

*   No label restatement
*   No title-only semantics
*   No role-membership proxies
*   No generic competence prose
*   No tool-only semantics
*   No candidate-specific CV wording
*   No unjustified ownership requirements
*   No canonical-definition leakage

## New General Rules

### STRICT_PROOF_LEVEL_FIDELITY
The generated role semantic candidate MUST preserve the source relationship's minimumProofLevel.
The candidate may make the evidence more observable and specific.
It may NOT silently strengthen the proof requirement.

Examples of invalid behaviour conceptually include:
- signal → demonstrated
- demonstrated → owned_outcome
unless the underlying ROLE RELATIONSHIP itself is explicitly changed through a separate governed ontology/role-library decision.

Role semantic enrichment is not authorised to change proof maturity.

**Validator**: `SOURCE_MINIMUM_PROOF_LEVEL_PRESERVED` (If false: candidate fails)

### NO_UNSOURCED_SCALE_OR_SEGMENT_INJECTION
A role semantic candidate must not introduce restrictive qualifiers such as:
- enterprise
- global
- regional
- strategic account
- key account
- SMB
- mid-market
- large-scale
- complex organisation
or equivalent scale/segment assumptions unless those constraints are explicitly grounded in the stable role source.

The model must not infer scale from:
- role title
- seniority band
- common industry convention
- model prior

A generic role manifestation should remain applicable across the stable role archetype represented by the source.

**Validator**: `NO_UNSOURCED_SCALE_DOMAIN_QUALIFIER` (If false: candidate fails)
