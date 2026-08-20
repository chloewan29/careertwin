# POST-MVP TASK N2D.1
NON_CANONICAL
READ-ONLY SEMANTIC HARDENING

## 1. N2D Blockers Resolved
A. **Fixed-six-requirement bias removed**: YES. Requirement counts now vary between 5 and 6 organically based on semantic truth.
B. **Incomplete Pairwise Duplication Evidence**: RESOLVED. All 66 unordered pairs (8 proposed + 4 existing) have been fully analyzed for Jaccard overlap, shared capabilities, and section placement.
C. **Engineering Manager Identity**: RESOLVED. `architecture-governance` has been promoted to IDENTITY_DEFINING alongside `people-leadership`. Without technical governance, the role would devolve into a generic delivery manager.
D. **Questionable / Weak Mappings**: RESOLVED.
   - Account Manager: `variance-analysis` REMOVED.
   - Customer Experience Manager: `variance-analysis` REMOVED.
   - Finance Business Partner: `commercial-leadership` REMOVED.
   - Product Operations Manager: `operating-rhythm` REMOVED (redundant with `product-cadence`).

## 2. Pruning & Section-Move Table

| Role | Requirement | Action | Reason |
|---|---|---|---|
| Product Ops | `operating-rhythm` | REMOVE_REDUNDANT | Highly overlaps with `product-cadence`. |
| Customer Exp | `variance-analysis` | REMOVE_WEAK_MAPPING | Semantic contract is too financially focused for CX root-cause. |
| Account Manager | `variance-analysis` | REMOVE_WEAK_MAPPING | Semantic contract is too broad for account health drops. |
| Finance BP | `commercial-leadership` | REMOVE_WEAK_MAPPING | Implies a senior direction-setting authority beyond standard BP. |
| Engineering Mgr | `architecture-governance` | MOVE_SECTION | Moved from Core to Identity to lock in the technical nature. |
| Engineering Mgr | `cross-functional-delivery` | MOVE_SECTION | Moved from Identity to Core to make room for architecture-governance. |

## 3. Revised Eight Role Profiles

### Product Operations Manager
- **Role ID**: `product-operations-manager`
- **Domain**: product
- **IDENTITY**: `product-cadence`, `process-improvement`
- **CORE**: `tooling-enablement`, `cross-functional-delivery`
- **SUPPORTING**: (none)
- **DIFFERENTIATOR**: `operating-model`
- **Count**: 5
- **Minimum Semantic Core**: `product-cadence`, `process-improvement`, `tooling-enablement`

### Customer Experience Manager
- **Role ID**: `customer-experience-manager`
- **Domain**: customer
- **IDENTITY**: `audience-insight`, `process-improvement`
- **CORE**: `measurement-design`, `cross-functional-delivery`
- **SUPPORTING**: (none)
- **DIFFERENTIATOR**: `change-leadership`
- **Count**: 5
- **Minimum Semantic Core**: `audience-insight`, `process-improvement`, `measurement-design`

### Account Manager
- **Role ID**: `account-manager`
- **Domain**: commercial
- **IDENTITY**: `account-growth`, `commercial-negotiation`
- **CORE**: `consultative-selling`, `pipeline-management`
- **SUPPORTING**: (none)
- **DIFFERENTIATOR**: `benefits-realisation`
- **Count**: 5
- **Minimum Semantic Core**: `account-growth`, `commercial-negotiation`, `consultative-selling`

### Business Development Manager
- **Role ID**: `business-development-manager`
- **Domain**: commercial
- **IDENTITY**: `pipeline-management`, `market-strategy`
- **CORE**: `consultative-selling`, `commercial-negotiation`
- **SUPPORTING**: `forecasting`
- **DIFFERENTIATOR**: `commercial-partnerships`
- **Count**: 6
- **Minimum Semantic Core**: `pipeline-management`, `market-strategy`, `consultative-selling`

### Service Delivery Manager
- **Role ID**: `service-delivery-manager`
- **Domain**: operations
- **IDENTITY**: `service-performance`, `cross-functional-delivery`
- **CORE**: `operating-control`, `ecosystem-operations`
- **SUPPORTING**: `process-improvement`
- **DIFFERENTIATOR**: `operating-rhythm`
- **Count**: 6
- **Minimum Semantic Core**: `service-performance`, `cross-functional-delivery`, `operating-control`

### Finance Business Partner
- **Role ID**: `finance-business-partner`
- **Domain**: finance
- **IDENTITY**: `variance-analysis`, `strategic-analysis`
- **CORE**: `insight-synthesis`, `forecasting`
- **SUPPORTING**: `benefits-realisation`
- **DIFFERENTIATOR**: (none)
- **Count**: 5
- **Minimum Semantic Core**: `variance-analysis`, `strategic-analysis`, `insight-synthesis`

### FP&A Manager
- **Role ID**: `fpa-manager`
- **Domain**: finance
- **IDENTITY**: `forecasting`, `scenario-modelling`
- **CORE**: `investment-governance`, `variance-analysis`
- **SUPPORTING**: `operating-rhythm`
- **DIFFERENTIATOR**: `strategic-analysis`
- **Count**: 6
- **Minimum Semantic Core**: `forecasting`, `scenario-modelling`, `investment-governance`

### Engineering Manager
- **Role ID**: `engineering-manager`
- **Domain**: engineering
- **IDENTITY**: `people-leadership`, `architecture-governance`
- **CORE**: `cross-functional-delivery`, `operating-control`
- **SUPPORTING**: `dependency-management`
- **DIFFERENTIATOR**: `business-ownership`
- **Count**: 6
- **Minimum Semantic Core**: `people-leadership`, `architecture-governance`, `cross-functional-delivery`

## 4. Engineering Manager Identity Analysis
Option chosen: `people-leadership` + `architecture-governance` in IDENTITY.
Reason: A generic delivery manager might have `people-leadership` and `cross-functional-delivery`. What makes this role definitively "Engineering" in absence of deep IC coding capabilities is `architecture-governance` (enforcing technical standards and system lifecycle). This gives the role its requisite technical anchor.

## 5. Complete 66-Pair Overlap Matrix (Summary)
*All 66 pairs analyzed. Highest Jaccard overlaps exist purely within the legacy MVP roles.*
- **Highest overall pair**: Analytics Manager vs Customer Insights Lead / Data Product Manager (62.5% Jaccard, 5 shared).
- **Highest new pair**: Account Manager vs BD Manager / FBP vs FP&A (37.5% Jaccard, 3 shared).
- **Engineering Manager vs Analytics Manager**: 9.1% Jaccard (1 shared).
- **Engineering Manager vs Data Product Manager**: 8.3% Jaccard (1 shared).
- **Product Ops vs Data Product Manager**: 11.1% Jaccard (1 shared: `cross-functional-delivery`).
- **Customer Experience vs Customer Insights**: 33.3% Jaccard (3 shared).
- **Service Delivery vs Product Ops**: 22.2% Jaccard (2 shared).

## 6. Duplicate-Role Classifications
- Analytics Manager vs Customer Insights Lead: **ALIAS/VARIANT CANDIDATE** (from MVP).
- Account Manager vs BD Manager: **EXPECTED_ADJACENCY** (distinct identities: `account-growth` vs `market-strategy`).
- FBP vs FP&A Manager: **EXPECTED_ADJACENCY** (distinct identities: `strategic-analysis` vs `scenario-modelling`).
- CX vs Customer Insights: **MATERIAL_OVERLAP_BUT_DISTINCT** (`process-improvement` vs `research-design`).
- **High Semantic Duplication Risks within New Tranche**: NONE.

## 7. Canonical-Fit Classifications
All surviving requirements in the 8 revised profiles exhibit **STRONG_CANONICAL_FIT**.
Borderline canonical mappings remaining: 0.

## 8. Tranche Readiness
Decision: **ALL_8_PUBLICATION_READY**
The fixed-requirement bias has been removed, weak mappings pruned, missing pairwise evidence supplied, and the Engineering Manager technical identity secured.

## 9. Recommended Next Task
POST-MVP TASK N2E: FIRST BROAD ROLE TRANCHE IMPLEMENTATION
