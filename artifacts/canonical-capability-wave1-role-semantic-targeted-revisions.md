# WAVE 1 TARGETED ROLE SEMANTIC REVISIONS

> [!WARNING]
> NON-CANONICAL
> UNADMITTED
> TARGETED REVISION ONLY

## 1. Governing Hashes
- **Role Source Packets**: 21973983D446BB91E3EE744FE627732237F8075D70511CC9394DA04F77A724C9
- **Original Candidates**: BCF99FB27819A59FD821EC48F32E02A2802BB73B854FC50610900BB116E2C567
- **Admission Review**: 7DAEA1FA4BC4E7B20015D5929746ABA9886ABAEA4545D193B7E98D5EEF42282B
- **Semantic Authoring Policy**: 0B938868E754D41AD22211FCE08C36C655893EDDB05EBF08AA343C25A85A4572
- **Role Enrichment Contract Draft**: C4064DA4DC24A689A677F5A13F1D6DF8363FC44E5978259471DE902CF895F80F

## 2. Original Review Failures
- `hr-business-partner` -> `employee-relations`: PROOF_LEVEL_MISMATCH (inflated from demonstrated to owned_outcome).
- `sales-account-manager` -> `account-growth`: MODEL_PRIOR_OVERREACH / UNSOURCED_SCALE_INJECTION (restricted to strategic enterprise account).

## 3. Revised Candidates (2)

### A. HR Business Partner: `employee-relations` (Employee Relations)
*   **ROLE_SPECIFIC_MANIFESTATION**: Managed complex employee relations cases, disciplinary procedures, and grievance resolutions.
*   **OBSERVABLE_PERFORMED_ACTION**: managed cases and procedures
*   **SEMANTIC_OBJECT**: employee relations, disciplinary procedures, grievances
*   **ROLE_DECISION_OR_OUTCOME_CONTEXT**: to resolve workforce disputes and mitigate legal risk
*   **EXPECTED_EVIDENCE_CANDIDATE**: Managed a complex employee relations case or grievance to a documented resolution.
*   **MINIMUM_PROOF_LEVEL**: demonstrated
*   **SEMANTIC_INPUT_BASIS**: EXISTING_REPO_ROLE_CONTEXT, TARGETED_REVISION
*   **NOVEL_SEMANTIC_CONTENT**: MEDIUM_NOVELTY
*   **AUTHORING_CONFIDENCE**: MODERATE
*   **REVIEW_REQUIRED**: YES
*   **ROUTE**: READY_FOR_SEMANTIC_REVIEW

#### Before/After Semantic Delta
- **Minimum Proof Level**: `owned_outcome` -> `demonstrated`
- **Validation**: STRICT_PROOF_LEVEL_FIDELITY rule is now satisfied. Candidate validation: PASSED.

### B. Sales / Account Manager: `account-growth` (Account Growth)
*   **ROLE_SPECIFIC_MANIFESTATION**: Drove revenue expansion and cross-selling within an existing account.
*   **OBSERVABLE_PERFORMED_ACTION**: drove revenue expansion
*   **SEMANTIC_OBJECT**: existing account
*   **ROLE_DECISION_OR_OUTCOME_CONTEXT**: to increase account value and share of wallet
*   **EXPECTED_EVIDENCE_CANDIDATE**: Expanded revenue or product adoption within an existing account to meet a defined commercial target.
*   **MINIMUM_PROOF_LEVEL**: owned_outcome
*   **SEMANTIC_INPUT_BASIS**: EXISTING_REPO_ROLE_CONTEXT, TARGETED_REVISION
*   **NOVEL_SEMANTIC_CONTENT**: MEDIUM_NOVELTY
*   **AUTHORING_CONFIDENCE**: MODERATE
*   **REVIEW_REQUIRED**: YES
*   **ROUTE**: READY_FOR_SEMANTIC_REVIEW

#### Before/After Semantic Delta
- **Scale Qualifier Removed**: "strategic enterprise account" -> "account"
- **Validation**: NO_UNSOURCED_SCALE_OR_SEGMENT_INJECTION rule is now satisfied. Candidate validation: PASSED.

## 4. Complete 10-Candidate Rule Recheck
All 10 candidates (the 8 frozen + 2 revised) have been rechecked against the new general authoring contract rules.

- **PROOF_LEVEL_FIDELITY**: PASS (10/10 candidates preserve source minimumProofLevel)
- **SCALE_DOMAIN_NEUTRALITY**: PASS (10/10 candidates avoid unsourced scale/segment qualifiers)

## 5. Private Clarification Status
- `resource-planning` status remains **PRIVATE_CLARIFICATION_USEFUL**. The new general rules did not expose a direct rule violation. It remains unmapped and unadmitted.

## 6. Final Revision Readiness
The two revised candidates are ready for independent re-review. The original eight remain frozen and successfully pass the new authoring contract validators.
