# CAREERTWIN WAVE 1 — INDEPENDENT ROLE SEMANTIC ADMISSION REVIEW

> [!WARNING]
> INDEPENDENT WAVE 1 ROLE SEMANTIC REVIEW
> NON-CANONICAL
> NO PRODUCTION AUTHORITY

## 1. Decision
WAVE_1_PARTIAL_ADMISSION_READY

## 2. Input hashes verified
- `artifacts/canonical-capability-wave1-role-source-packets.json`: 21973983D446BB91E3EE744FE627732237F8075D70511CC9394DA04F77A724C9
- `artifacts/canonical-capability-wave1-role-semantic-candidates.md`: BCF99FB27819A59FD821EC48F32E02A2802BB73B854FC50610900BB116E2C567
- `artifacts/canonical-capability-source-enrichment-wave1-admission.md`: E3C3EC36F5A4744404D87D43FCA2C6A80B3A4A3D75DCFAA1D403640F4CFA1177
- `artifacts/canonical-capability-semantic-authoring-policy-draft.md`: 0B938868E754D41AD22211FCE08C36C655893EDDB05EBF08AA343C25A85A4572
- `artifacts/canonical-capability-51-source-census-v2.json`: 1F3FD2D4BA508B9B34668077D04C73E4EEE298BA9F8C17E2C7AD13970DB68944

## 3. Canonical candidates reviewed
10

## 4. Private clarification candidates reviewed
1

## 5. ADMISSION_CANDIDATE count
8

## 6. TARGETED_REVISION_REQUIRED count
2

## 7. HUMAN_SEMANTIC_REVIEW_REQUIRED count
0

## 8. REJECTED count
0

## 9. Candidate-by-candidate routing table

| role | capabilityId | role fit | observable action | semantic object | outcome context | capability distinctness | proof-level fidelity | role-specific-not-canonical | model-prior risk | final route | concise reason |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hr-business-partner | workforce-advisory | PASS | PASS | PASS | PASS | PASS | PASS | PASS | LOW | ADMISSION_CANDIDATE | Solid alignment with role expectations. |
| hr-business-partner | employee-relations | PASS | PASS | PASS | PASS | PASS | FAIL | PASS | LOW | TARGETED_REVISION_REQUIRED | Inflates proof level from demonstrated to owned_outcome. |
| hr-business-partner | organisation-design | PASS | PASS | PASS | PASS | PASS | PASS | PASS | LOW | ADMISSION_CANDIDATE | Clear and role-specific. |
| hr-business-partner | talent-planning | PASS | PASS | PASS | PASS | PASS | PASS | PASS | LOW | ADMISSION_CANDIDATE | Clear and actionable. |
| sales-account-manager | account-growth | PASS | PASS | MINOR_CONCERN | PASS | PASS | PASS | PASS | MEDIUM | TARGETED_REVISION_REQUIRED | Semantic overreach: restricts to "strategic enterprise account". |
| sales-account-manager | consultative-selling | PASS | PASS | PASS | PASS | PASS | PASS | PASS | LOW | ADMISSION_CANDIDATE | Excellent boundary vs standard sales. |
| sales-account-manager | pipeline-management | PASS | PASS | PASS | PASS | PASS | PASS | PASS | LOW | ADMISSION_CANDIDATE | Concrete and observable. |
| sales-account-manager | commercial-negotiation | PASS | PASS | PASS | PASS | PASS | PASS | PASS | LOW | ADMISSION_CANDIDATE | Well-defined action and object. |
| operations-manager | operating-control | PASS | PASS | PASS | PASS | PASS | PASS | PASS | LOW | ADMISSION_CANDIDATE | Clearly separated from service performance. |
| operations-manager | service-performance | PASS | PASS | PASS | PASS | PASS | PASS | PASS | LOW | ADMISSION_CANDIDATE | Appropriate performance tracking context. |

## 10. HR Business Partner boundary assessment
- **workforce-advisory vs employee-relations vs organisation-design vs talent-planning**: CLEAR. The candidates maintain distinct separation. Workforce advisory covers strategy/performance, employee relations covers cases/grievances, organisation design covers structures, and talent planning covers succession/reviews.

## 11. Sales / Account Manager boundary assessment
- **account-growth vs consultative-selling vs pipeline-management vs commercial-negotiation**: CLEAR. Good separation between expanding revenue, diagnosing problems, managing the pipeline process, and executing commercial terms.

## 12. Operations Manager boundary assessment
- **operating-control vs service-performance**: CLEAR. Clear distinction between establishing/monitoring controls (risk/compliance) and tracking/intervening on SLAs/KPIs.

## 13. Semantic overreach findings
- `account-growth` (Sales / Account Manager): The wording specifies "within an existing strategic enterprise account." This is an overreach that unnecessarily restricts the role to enterprise sales, ignoring mid-market or SMB account managers.

## 14. Semantic under-specification findings
- None found. Candidates successfully avoid generic filler.

## 15. Material collisions
- None found.

## 16. Repeated general failure patterns
- **Proof-Level Inflation**: The `employee-relations` candidate overwrote the original generic role's `demonstrated` proof level with `owned_outcome`, violating the rule to preserve minimum proof expectations.
- **Scale Injection**: The `account-growth` candidate injected "enterprise" scale assumptions not present in the base generic role.

## 17. Missing GENERAL authoring rules
- **Strict Proof-Level Preservation**: Candidates must inherit and preserve the `minimumProofLevel` specified in the generic role source without inflation.
- **Scale and Domain Neutrality**: Candidates must not inject restrictive scale or domain qualifiers (e.g., 'enterprise', 'global') unless explicitly dictated by the generic role title.

## 18. Private resource-planning clarification
USEFUL. Clearly delineates resource capacity management from general process improvement.

## 19. FOUNDER_SAMPLE_REVIEW_SET
1. `hr-business-partner` -> `workforce-advisory`: Review to ensure "performance management" and "organisational risk" are the correct boundaries for workforce advisory.
2. `sales-account-manager` -> `consultative-selling`: Verify that "diagnose business problems" appropriately bounds this capability against account growth.
3. `operations-manager` -> `operating-control`: Verify that "operational controls" provides sufficient distinction from standard service performance management.

## 20. Wave 1 admissible subset
- `hr-business-partner`: `workforce-advisory`, `organisation-design`, `talent-planning`
- `sales-account-manager`: `consultative-selling`, `pipeline-management`, `commercial-negotiation`
- `operations-manager`: `operating-control`, `service-performance`

## 21. Wave 1 revision subset
- `hr-business-partner`: `employee-relations`
- `sales-account-manager`: `account-growth`

## 22. Wave 1 human-review subset
- None.

## 23. Whether partial source admission is safe
YES. The admitted subset does not rely on the failing candidates and represents stable semantics.

## 24. Whether role-semantic authoring contract requires revision
YES. The authoring policy must be updated to enforce strict proof-level preservation and scale neutrality.

## 25. Whether canonical ontology changes are required
NO. The issues are contained within role-specific authoring boundaries.
