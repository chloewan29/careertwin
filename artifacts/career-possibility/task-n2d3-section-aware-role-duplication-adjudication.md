# POST-MVP TASK N2D.3
NON_CANONICAL
READ-ONLY SECTION-AWARE SEMANTIC ADJUDICATION

## 1. 12-Role Input Readback & Completeness
- Total Roles: 12 (4 existing MVP roles + 8 provisional N2D.1 roles).
- The pairs were mechanically calculated using full capability lists, including section placement.
- **EXPECTED_PAIR_COUNT**: 66
- **ACTUAL_PAIR_COUNT**: 66
- **PAIR_SET_UNIQUE**: YES
- Jaccard was used strictly as a diagnostic trigger, not a semantic classifier. Numeric-threshold semantic classifiers were expressly NOT used.

## 2. Qualifying Semantic-Review Pair Count
**QUALIFYING_PAIR_COUNT**: 14
(Condition: Jaccard >= 0.30 OR >= 1 shared IDENTITY capability)

Qualifying pairs list:
1. Analytics Manager vs Customer Insights Lead
2. Analytics Manager vs Data Product Manager
3. Analytics Manager vs Marketing Analytics Lead
4. Customer Insights Lead vs Data Product Manager
5. Customer Insights Lead vs Marketing Analytics Lead
6. Data Product Manager vs Marketing Analytics Lead
7. Analytics Manager vs Finance Business Partner
8. Customer Insights Lead vs Customer Experience Manager
9. Customer Insights Lead vs Finance Business Partner
10. Data Product Manager vs Finance Business Partner
11. Marketing Analytics Lead vs Customer Experience Manager
12. Product Operations Manager vs Customer Experience Manager
13. Account Manager vs Business Development Manager
14. Finance Business Partner vs FP&A Manager

---

## 3. Existing Four � Full Adjudication (Pairs 1-6)

### Analytics Manager vs Customer Insights Lead
- **Purpose**: General data leadership (Analytics) vs primary research/audience understanding (Insights).
- **Identity Signature**: `measurement-design`, `analytics-governance` vs `audience-insight`, `insight-synthesis`, `research-design`. The identities are totally distinct.
- **Removal Test**: If removed, neither role would retain its specific meaning.
- **Shared Meaning**: `insight-synthesis` and `measurement-design` are shared but serve the distinct goals of data vs research.
- **Classification**: **MATERIAL_OVERLAP_BUT_DISTINCT** (Not an alias; the research vs governance identities keep them apart despite high Jaccard).

### Analytics Manager vs Data Product Manager
- **Purpose**: General data leadership vs building data as a product.
- **Identity Signature**: `measurement-design`, `analytics-governance` vs `product-insights`, `roadmap-governance`, `measurement-design`. They share `measurement-design` in Identity.
- **Removal Test**: DPM relies heavily on `roadmap-governance` and `product-insights`.
- **Classification**: **MATERIAL_OVERLAP_BUT_DISTINCT** (DPM is a product role; Analytics Manager is a data capability role).

### Analytics Manager vs Marketing Analytics Lead
- **Purpose**: General data leadership vs domain-specific marketing data.
- **Identity Signature**: `measurement-design`, `analytics-governance` vs `marketing-effectiveness`, `measurement-design`. Both share `measurement-design` in Identity.
- **Removal Test**: Removing `marketing-effectiveness` makes it a generic Analytics Manager.
- **Classification**: **ALIAS_OR_VARIANT_CANDIDATE** (Marketing Analytics Lead acts as merely a domain-specialized alias of Analytics Manager).

### Customer Insights Lead vs Data Product Manager
- **Purpose**: Understanding the customer vs shipping data products.
- **Identity Signature**: `audience-insight` (Insights) vs `product-insights`, `roadmap-governance` (DPM).
- **Classification**: **MATERIAL_OVERLAP_BUT_DISTINCT**

### Customer Insights Lead vs Marketing Analytics Lead
- **Purpose**: Qualitative/primary research vs quantitative marketing ROI.
- **Identity Signature**: `audience-insight`, `research-design` vs `marketing-effectiveness`. 
- **Classification**: **MATERIAL_OVERLAP_BUT_DISTINCT**

### Data Product Manager vs Marketing Analytics Lead
- **Purpose**: Product ownership vs marketing ROI.
- **Classification**: **MATERIAL_OVERLAP_BUT_DISTINCT**

---

## 4. Adjudication of New vs Existing (Pairs 7-11)

### Analytics Manager vs Finance Business Partner
- **Purpose**: Data leadership vs Commercial/financial advisory.
- **Classification**: **DISTINCT_ROLE_PROFILES**

### Customer Insights Lead vs Customer Experience Manager
- **Purpose**: Discovering the truth about the customer vs fixing the operational journey.
- **Identity Signature**: Both share `audience-insight` in Identity.
- **Removal Test**: CX relies on `process-improvement` (fixing things). Insights relies on `research-design` (finding things).
- **Classification**: **MATERIAL_OVERLAP_BUT_DISTINCT**

### Customer Insights Lead vs Finance Business Partner
- **Purpose**: Research vs Financial Advisory.
- **Classification**: **DISTINCT_ROLE_PROFILES**

### Data Product Manager vs Finance Business Partner
- **Purpose**: Product ownership vs Financial Advisory.
- **Classification**: **DISTINCT_ROLE_PROFILES**

### Marketing Analytics Lead vs Customer Experience Manager
- **Purpose**: Marketing ROI vs Customer Journey operations.
- **Classification**: **DISTINCT_ROLE_PROFILES**

---

## 5. Adjudication of New vs New (Pairs 12-14)

### Product Operations Manager vs Customer Experience Manager
- **Purpose**: Scaling product org delivery vs scaling customer journey delivery.
- **Identity Signature**: Both share `process-improvement` in Identity.
- **Removal Test**: Product Ops requires `product-cadence`. CX requires `audience-insight`. These are fundamentally different domains of operation.
- **Classification**: **DISTINCT_ROLE_PROFILES**

### Account Manager vs Business Development Manager
- **Purpose**: Retaining/growing existing accounts (Farming) vs acquiring net-new accounts (Hunting).
- **Identity Signature**: `account-growth`, `commercial-negotiation` vs `pipeline-management`, `market-strategy`.
- **Classification**: **EXPECTED_ADJACENT_ROLES**

### Finance Business Partner vs FP&A Manager
- **Purpose**: Business unit commercial advisory vs corporate financial modeling.
- **Identity Signature**: `variance-analysis`, `strategic-analysis` vs `forecasting`, `scenario-modelling`.
- **Classification**: **EXPECTED_ADJACENT_ROLES**

---

## 6. Pre-Existing Semantic Debt Result
- **Pre-existing semantic debt proven**: YES. The pair *Analytics Manager vs Marketing Analytics Lead* is an **ALIAS_OR_VARIANT_CANDIDATE**. Marketing Analytics Lead is merely a domain specialization of Analytics Manager, not a distinct occupational skeleton.
- **New-tranche duplication result**: Clean. No aliases or high-duplication risks exist within the new 8 roles or between the new 8 and the existing 4.

## 7. Targeted Canonical-Fit Sanity Review
- `product-operations-manager` -> `tooling-enablement`: **STRONG_CANONICAL_FIT**
- `account-manager` -> `benefits-realisation`: **ACCEPTABLE_CANONICAL_FIT** (Slightly borderline as it usually implies internal business case tracking, but applies acceptably to tracking client ROI).
- `service-delivery-manager` -> `operating-rhythm`: **STRONG_CANONICAL_FIT**
- `finance-business-partner` -> `benefits-realisation`: **STRONG_CANONICAL_FIT**
- `fpa-manager` -> `operating-rhythm`: **STRONG_CANONICAL_FIT**
- `engineering-manager` -> `business-ownership`: **ACCEPTABLE_CANONICAL_FIT** (EMs rarely own a true P&L, but advanced EMs do take commercial accountability for outcomes).

**Canonical-fit evidence complete**: YES.
**Role design change required**: NO.

## 8. Publication Decision
**ALL_8_PUBLICATION_READY**
The semantic adjudication validates that the 8 new roles represent distinct occupational paths. The only semantic debt identified belongs to the original MVP tranche and does not block the new tranche.

## 9. Recommended Next Task
POST-MVP TASK N2E: FIRST BROAD ROLE TRANCHE IMPLEMENTATION
