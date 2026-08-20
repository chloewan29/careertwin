NON-CANONICAL
PLANNING / ADMISSION ONLY
NO PRODUCTION SEMANTIC AUTHORITY

# CAREERTWIN SOURCE ENRICHMENT — WAVE 1 ADMISSION

## Exact 18-Role Matrix
- sales-account-manager: 4 gaps
- hr-business-partner: 4 gaps
- gtm-partnerships-manager: 3 gaps
- people-operations-lead: 3 gaps
- general-business-manager: 3 gaps
- fpa-manager: 2 gaps
- education-program-lead: 2 gaps
- operations-manager: 2 gaps
- program-manager: 2 gaps
- transformation-manager: 2 gaps
- marketing-strategy-manager: 1 gap
- commercial-finance-manager: 1 gap
- legal-operations-manager: 1 gap
- engineering-manager: 1 gap
- clinical-operations-manager: 1 gap
- strategy-operations-manager: 1 gap
- customer-success-manager: 0 gaps
- product-operations-manager: 0 gaps

## 18 -> 16 Discrepancy Reconciliation
- **Omitted Roles**: customer-success-manager, product-operations-manager
- **Why absent**: Both roles cover 0 TRUE_SOURCE_GAP capabilities.
- **Omission correct**: Yes, it was correct to exclude them from the leverage ranking.

## product-operations-manager Reconciliation
- **Exact gaps covered**: 0
- **Relevance**: NOT_RELEVANT_TO_CURRENT_GAPS
- **Scenario B Inclusion**: Unjustified, as it contributes nothing to resolving the 33 source gaps.

## Corrected Coverage Math & Gap Disjointness
- **Gap Distribution**: All 33 gaps are SINGLE_ROLE_SOURCE_GAP.
- **Coverage Disjointness**: Because every gap maps to exactly one seeded role, the gap sets across roles are entirely disjoint.
- **Marginal Coverage**: Therefore, marginal coverage is always exactly equal to raw coverage regardless of greedy ordering.

## Coverage vs Sufficiency Distinction
- **SOURCE_COVERAGE_LEVERAGE**: The absolute number of gaps a role touches (e.g. 4 for sales-account-manager).
- **AUTO_ELIGIBILITY_LEVERAGE**: The number of gaps that also possess sufficient structural constraints (mapping clues, signals) to plausibly become AUTO_GENERATION_CANDIDATE after enrichment.
- **Distinction**: Adding one piece of expectedEvidence to a capability gives it NEW_MEANINGFUL_SOURCE (moving from INSUFFICIENT to LIKELY_WEAK or LIKELY_MODERATE), but does not automatically grant AUTO_GENERATION_CANDIDATE status unless other constraints are met.

## Enrichment Authorability
| Role | Authorability Gate |
|---|---|
| sales-account-manager | STRUCTURED_LLM_SYNTHESIS_REQUIRES_REVIEW |
| hr-business-partner | STRUCTURED_LLM_SYNTHESIS_REQUIRES_REVIEW |
| gtm-partnerships-manager | STRUCTURED_LLM_SYNTHESIS_REQUIRES_REVIEW |
| operations-manager | STRUCTURED_LLM_SYNTHESIS_REQUIRES_REVIEW |

## Three Candidate First Waves

### OPTION A — MAXIMUM COVERAGE
- **Roles**: sales-account-manager, hr-business-partner, gtm-partnerships-manager
- **Exact gaps covered**: account-growth, commercial-negotiation, consultative-selling, pipeline-management, employee-relations, organisation-design, talent-planning, workforce-advisory, commercial-partnerships, ecosystem-operations, partner-strategy
- **Exact gap count**: 11
- **Families touched**: Commercial, People & Organisation, Operations & Delivery, Strategy & Transformation
- **Private IDs additionally informed**: None
- **Likely sufficiency movement**: 11 gaps move from INSUFFICIENT to LIKELY_MODERATE/POTENTIALLY_STRONG
- **Authoring input required**: STRUCTURED_LLM_SYNTHESIS_REQUIRES_REVIEW
- **Main risk**: Commercial and GTM are semantically adjacent; might lack operational diversity.

### OPTION B — MAXIMUM SEMANTIC QUALITY
- **Roles**: sales-account-manager, hr-business-partner, general-business-manager
- **Exact gaps covered**: account-growth, commercial-negotiation, consultative-selling, pipeline-management, employee-relations, organisation-design, talent-planning, workforce-advisory, business-ownership, commercial-leadership, operating-strategy
- **Exact gap count**: 11
- **Families touched**: Commercial, People & Organisation, Leadership, Strategy & Transformation
- **Private IDs additionally informed**: None
- **Likely sufficiency movement**: 11 gaps move from INSUFFICIENT to LIKELY_MODERATE/POTENTIALLY_STRONG
- **Authoring input required**: STRUCTURED_LLM_SYNTHESIS_REQUIRES_REVIEW
- **Main risk**: General Business Manager is highly abstracted and may be harder to ground with concrete evidence.

### OPTION C — BALANCED VALIDATION
- **Roles**: sales-account-manager, hr-business-partner, operations-manager
- **Exact gaps covered**: account-growth, commercial-negotiation, consultative-selling, pipeline-management, employee-relations, organisation-design, talent-planning, workforce-advisory, operating-control, service-performance
- **Exact gap count**: 10
- **Families touched**: Commercial, People & Organisation, Governance & Risk, Operations & Delivery
- **Private IDs additionally informed**: None
- **Likely sufficiency movement**: 10 gaps move from INSUFFICIENT to LIKELY_MODERATE/POTENTIALLY_STRONG
- **Authoring input required**: STRUCTURED_LLM_SYNTHESIS_REQUIRES_REVIEW
- **Main risk**: Slightly lower absolute gap count (10 instead of 11).

## Recommended Wave 1
- **Option Chosen**: Option C — Balanced Validation
- **Roles**: sales-account-manager, hr-business-partner, operations-manager
- **Why**: It yields excellent absolute coverage (10 gaps) while hitting three highly distinct corporate domains (Sales, People, Operations), providing the most rigorous stress-test of the enrichment architecture across functionally distinct language.

## Pre-Defined Success Metrics
- **A. ROLE_SEMANTIC_QUALITY**: No boilerplate expectedEvidence remains in enriched roles.
- **B. SOURCE_PACKET_MOVEMENT**: All 10 targeted capabilities move from INSUFFICIENT to WEAK/MODERATE/STRONG.
- **C. GENERATION_ROUTE_MOVEMENT**: Gaps move to TARGETED_REVIEW_CANDIDATE or AUTO_GENERATION_CANDIDATE.
- **D. NO_REGRESSION**: The existing 18 AUTO candidates maintain their grounding and do not develop drift.
- **E. PRIVATE_ID_INFORMATION_GAIN**: Any private IDs discovered to overlap become more interpretable.
- **F. ZERO_CAPABILITY_SPECIFIC_PATCHES**: No canonical definition is manually patched.
