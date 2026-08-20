# POST-MVP TASK O — GENERIC ROLE LIBRARY GOVERNANCE & COVERAGE AUDIT

## 1. Current 12-Role Inventory

| Canonical Title | Role Family | Primary Mandate | Must-Have | Should-Have | Differentiator | Evidence Exp. |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Analytics Manager | analytics | Set analytics direction and ensure trusted analysis changes business decisions. | 2 | 2 | 1 | 3 |
| Customer Insights Lead | customer-insights | Own the customer-understanding agenda and turn customer evidence into strategic action. | 3 | 2 | 1 | 3 |
| Marketing Analytics Lead | marketing-analytics | Own marketing measurement and turn effectiveness evidence into growth and budget decisions. | 2 | 2 | 1 | 3 |
| Data Product Manager | data-product | Own reusable data-product outcomes from user discovery through roadmap, adoption, and lifecycle decisions. | 3 | 2 | 1 | 3 |
| Product Operations Manager | product | Set product operating rhythm and scale delivery tools/processes. | 2 | 2 | 1 | 2 |
| Customer Experience Manager | customer | Uncover customer needs and improve the end-to-end journey. | 2 | 2 | 1 | 2 |
| Account Manager | commercial | Grow and retain existing client relationships. | 2 | 2 | 1 | 2 |
| Business Development Manager | commercial | Acquire new business and drive market expansion. | 2 | 2 | 1 | 2 |
| Service Delivery Manager | operations | Ensure reliable delivery of services against agreed standards. | 2 | 2 | 1 | 2 |
| Finance Business Partner | finance | Provide commercial advice and financial analysis to business units. | 2 | 2 | 1 | 2 |
| FP&A Manager | finance | Govern the corporate financial model and investment process. | 2 | 2 | 1 | 2 |
| Engineering Manager | engineering | Lead engineering teams and govern technical delivery. | 2 | 2 | 1 | 2 |

## 2. Coverage Map & 12-Role Coverage
We classify professional-function coverage into:
- **Data / Analytics**: STRONG (Analytics Manager, Marketing Analytics Lead, Customer Insights Lead)
- **Product**: PARTIAL (Data Product Manager, Product Operations Manager)
- **Sales / Commercial**: PARTIAL (Account Manager, Business Development Manager)
- **Customer / CX**: PARTIAL (Customer Experience Manager, Customer Insights Lead)
- **Finance**: PARTIAL (Finance Business Partner, FP&A Manager)
- **Operations**: THIN (Service Delivery Manager)
- **Engineering / Technology**: THIN (Engineering Manager)
- **Strategy**: ABSENT
- **Transformation / Change**: ABSENT
- **Program / Project**: ABSENT
- **People / HR**: ABSENT
- **Risk / Governance**: ABSENT

## 3. Capability Coverage
The current ontology contains 51 canonical capabilities.
- **Heavily Represented**: cross-functional-delivery, process-improvement, strategic-analysis.
- **Under-Represented / Absent Areas**: Program / Project (dependency-management, operating-rhythm), HR / People (employee-relations, workforce-advisory, talent-planning), Risk / Compliance (risk-controls, regulatory-compliance, policy-governance), Strategy & Transformation (change-leadership, operating-strategy, market-strategy).
- **Conclusion**: We can heavily leverage the *existing* capability ontology to map new areas. Role library expansion should recombine these existing capabilities without adding new ones.

## 4. Pairwise Overlap Findings & Alias Risks
- **Highest Overlap**: `Account Manager` vs `Business Development Manager` share commercial capabilities (consultative-selling, commercial-negotiation, pipeline-management). `Analytics Manager` vs `Marketing Analytics Lead` share measurement and insights.
- **Lowest Overlap**: `Engineering Manager` vs `Customer Experience Manager` (entirely distinct families, mandates, and capabilities).
- **Duplicate/Alias Risk**: Low currently. However, external titles like "Senior Analytics Lead" or "Data Analytics Manager" map to the single canonical `Analytics Manager`.

## 5. Alias, Seniority, and Industry Policies

### Title-Alias Policy
**State: ABSENT.** Currently, the library treats titles 1:1. 
**Rule:** A new title should NOT automatically become a new canonical role. If the mandate, ownership, and capability composition are not materially different, it must be classified as a `TITLE_ALIAS`. 

### Seniority Policy
**State: ABSENT.** 
**Rule:** "Senior", "Lead", "Head of" do NOT create new canonical roles unless there is a material shift in mandate (e.g., individual contributor vs. organizational leader). A Senior Account Manager is an `Account Manager`.

### Industry Policy
**Rule:** Industry context (e.g., "Retail Analytics Manager") does NOT create a separate canonical identity unless the underlying capability structure fundamentally changes. 

## 6. Hard Admission Gates

| Gate | Status |
| :--- | :--- |
| G1. Generic reusable archetype | ALREADY ENFORCED |
| G2. Distinct primary mandate | ALREADY ENFORCED |
| G3. Distinct ownership/accountability | ALREADY ENFORCED |
| G4. Uses canonical capability identities only | ALREADY ENFORCED (TS Compiler) |
| G5. Clear must-have capability set | ALREADY ENFORCED |
| G6. Clear should-have capability set | ALREADY ENFORCED |
| G7. Genuine differentiator | ALREADY ENFORCED |
| G8. Evidence expectations defined | ALREADY ENFORCED |
| G9. Semantic validator passes | ALREADY ENFORCED |
| G10. Nearest-role duplicate check | NOT ENFORCED |
| G11. No company/JD-specific wording | ALREADY ENFORCED (Validator rule) |
| G12. No title-only/seniority-only distinction | NOT ENFORCED |
| G13. No ontology expansion inside role expansion | PARTIALLY ENFORCED |
| G14. Regression tests pass | ALREADY ENFORCED |
| G15. Does not change recommendation limits | ALREADY ENFORCED (Layer 3) |

## 7. Candidate Decision Taxonomy
- **ADMIT_AS_CANONICAL_ROLE**
- **MAP_AS_TITLE_ALIAS**
- **DEFER_REQUIRES_CAPABILITY_WORK**
- **DEFER_REQUIRES_ARCHITECTURE_DECISION**
- **REJECT_NEAR_DUPLICATE**
- **REJECT_OVER_SPECIFIC**
- **REJECT_INSUFFICIENT_SEMANTIC_DISTINCTION**

## 8. Discovery Pool (15-25 Candidates)
1. Program Manager (Project/Program)
2. Risk Manager (Risk)
3. HR Business Partner (HR)
4. Transformation Lead (Change)
5. Strategy Manager (Strategy)
6. Chief Operating Officer (Operations)
7. Head of Sales (Commercial)
8. Compliance Manager (Governance)
9. Marketing Director (Marketing)
10. Scrum Master (Project)
11. Organization Design Consultant (HR)
12. Policy Lead (Governance)
13. Chief Financial Officer (Finance)
14. Delivery Director (Delivery)
15. Talent Acquisition Lead (HR)
16. IT Infrastructure Manager (Tech)
17. UX Research Lead (Customer)

## 9. 6-8 Proposed First-Tranche Roles
*(These maximize coverage gain across missing areas using existing canonical capabilities with low duplication risk)*

1. **Program Manager** (Coverage: Program)
2. **HR Business Partner** (Coverage: People/HR)
3. **Risk Manager** (Coverage: Risk/Governance)
4. **Strategy Manager** (Coverage: Strategy)
5. **Transformation Lead** (Coverage: Transformation/Change)
6. **Head of Sales** (Coverage: Sales/Commercial Leadership)

## 10. Rejected / Alias Examples
- **Data Analytics Manager**: TITLE_ALIAS -> Analytics Manager.
- **Senior FP&A Analyst**: SENIORITY_VARIANT -> FP&A Manager.
- **Retail Store Manager**: OVER_SPECIFIC -> DEFER.
- **Cloud Engineering Lead**: NEAR_DUPLICATE -> Engineering Manager.
- **Bank Compliance Officer**: INDUSTRY_VARIANT -> Compliance Manager.

## 11. Role Versioning / Deprecation Policy
- **Update**: For minor semantic corrections, update the existing role definition.
- **Deprecate/Replace**: Never delete an ID. If a role is fundamentally flawed, mark as `DEPRECATED` and create a new canonical role.
- **Merge/Split**: Requires mapping old IDs to new IDs. Not supported yet, defer complex topology changes.

## 12. Future Tranche Workflow
COVERAGE GAP -> CANDIDATE DISCOVERY -> NEAREST-ROLE COMPARISON -> HARD ADMISSION GATES -> SEMANTIC ROLE CARD -> VALIDATOR -> PAIRWISE DUPLICATION CHECK -> REGRESSION TESTS -> SMALL TRANCHE COMMIT -> ALIGNMENT / RANKING REGRESSION -> CAREER MAP RECOMMENDATION CHECK -> ADMIT / HOLD

## 13. Required Future Tests
- Registry semantic validation
- Unique role IDs, distinct mandates
- Canonical capability references
- No company/JD-specific wording
- Differentiator presence
- Registry-order independence
- Ranking determinism
- Recommendation cap (Top-4) preservation
- Graph projection node limits preservation

## 14. Scale Safety Assessment
- **At 20 roles**: NO CONCERN. (Recommendation cap limits downstream complexity).
- **At 30 roles**: NO CONCERN.
- **At 50 roles**: WATCH. Alignment array sizing and zero-match tie-breaker clusters will grow, but TS execution time is O(R * C) which is negligible. No presentation scale issues since Layer 3 bounds at Top 4.

## 15. Governance Readiness Judgment
**ROLE_LIBRARY_GOVERNANCE_READY_FOR_FIRST_TRANCHE**
