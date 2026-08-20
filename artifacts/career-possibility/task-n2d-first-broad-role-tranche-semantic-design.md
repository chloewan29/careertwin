# POST-MVP TASK N2D
NON_CANONICAL
READ-ONLY ROLE KNOWLEDGE SEMANTIC DESIGN

## 1. Current Role Semantic Baseline
Current Registry Role Count: 4
Canonical Capability Count: 51
Average requirements per role: 6.5 (Analytics Manager: 6, Customer Insights Lead: 7, Data Product Manager: 7, Marketing Analytics Lead: 6).
Current Structure: ~2-3 Identity-Defining, ~2 Core, ~1 Supporting, ~1 Differentiator.

## 2. Requirement Section Semantics Confirmed
- **IDENTITY_DEFINING**: without this capability, the role meaning materially changes.
- **CORE_ENABLER**: central to reliable performance of the role, but not sufficient to define the role alone.
- **SUPPORTING**: meaningfully useful and recurring, but not central to role identity.
- **DIFFERENTIATOR**: capability that distinguishes stronger/broader performance but should not be required to recognize the base role.

## 3. Eight Role Semantic Designs

### Product Operations Manager
- **Role ID**: `product-operations-manager`
- **Canonical Title**: Product Operations Manager
- **Domain**: product
- **IDENTITY_DEFINING**: `product-cadence`, `process-improvement`
- **CORE_ENABLER**: `tooling-enablement`, `cross-functional-delivery`
- **SUPPORTING**: `operating-rhythm`
- **DIFFERENTIATOR**: `operating-model`
- **Total Requirements**: 6
- **Signature Rationale**: Without product cadence and process improvement, this is just a generic project manager. This makes it distinctly "Product Operations".
- **Adjacent Distinction (Data Product Manager)**: DPM requires `product-insights` and `roadmap-governance`; Product Ops requires `product-cadence` and `process-improvement`.

### Customer Experience Manager
- **Role ID**: `customer-experience-manager`
- **Canonical Title**: Customer Experience Manager
- **Domain**: customer
- **IDENTITY_DEFINING**: `audience-insight`, `process-improvement`
- **CORE_ENABLER**: `measurement-design`, `cross-functional-delivery`
- **SUPPORTING**: `variance-analysis`
- **DIFFERENTIATOR**: `change-leadership`
- **Total Requirements**: 6
- **Signature Rationale**: CX requires understanding the customer (audience-insight) and rewiring the business to serve them better (process-improvement, change-leadership).
- **Adjacent Distinction (Customer Insights Lead)**: Customer Insights focuses on `insight-synthesis` and `research-design` (finding the truth). CX focuses on `process-improvement` (fixing the operation based on the truth).

### Account Manager
- **Role ID**: `account-manager`
- **Canonical Title**: Account Manager
- **Domain**: commercial
- **IDENTITY_DEFINING**: `account-growth`, `commercial-negotiation`
- **CORE_ENABLER**: `consultative-selling`, `pipeline-management`
- **SUPPORTING**: `variance-analysis`
- **DIFFERENTIATOR**: `benefits-realisation`
- **Total Requirements**: 6
- **Signature Rationale**: Retaining and expanding an existing book of business requires relationship expansion (`account-growth`) and defending value (`commercial-negotiation`).
- **Adjacent Distinction (Business Development Manager)**: AM anchors on `account-growth` (existing clients); BDM anchors on `market-strategy` (new prospects).

### Business Development Manager
- **Role ID**: `business-development-manager`
- **Canonical Title**: Business Development Manager
- **Domain**: commercial
- **IDENTITY_DEFINING**: `pipeline-management`, `market-strategy`
- **CORE_ENABLER**: `consultative-selling`, `commercial-negotiation`
- **SUPPORTING**: `forecasting`
- **DIFFERENTIATOR**: `commercial-partnerships`
- **Total Requirements**: 6
- **Signature Rationale**: Hunting new business requires building the funnel (`market-strategy`) and rigorously working it to close (`pipeline-management`).
- **Adjacent Distinction (Account Manager)**: BDM requires `market-strategy` and `commercial-partnerships` which are net-new acquisition oriented.

### Service Delivery Manager
- **Role ID**: `service-delivery-manager`
- **Canonical Title**: Service Delivery Manager
- **Domain**: operations
- **IDENTITY_DEFINING**: `service-performance`, `cross-functional-delivery`
- **CORE_ENABLER**: `operating-control`, `ecosystem-operations`
- **SUPPORTING**: `process-improvement`
- **DIFFERENTIATOR**: `operating-rhythm`
- **Total Requirements**: 6
- **Signature Rationale**: Ensuring a service meets SLA requires tracking outcomes (`service-performance`) across teams and vendors (`cross-functional-delivery`, `ecosystem-operations`).
- **Adjacent Distinction (Operations Manager)**: Ops Manager is general `process-improvement`; SDM is specifically `service-performance` and `ecosystem-operations`.

### Finance Business Partner
- **Role ID**: `finance-business-partner`
- **Canonical Title**: Finance Business Partner
- **Domain**: finance
- **IDENTITY_DEFINING**: `variance-analysis`, `strategic-analysis`
- **CORE_ENABLER**: `insight-synthesis`, `forecasting`
- **SUPPORTING**: `benefits-realisation`
- **DIFFERENTIATOR**: `commercial-leadership`
- **Total Requirements**: 6
- **Signature Rationale**: An FBP translates numbers (`variance-analysis`) into business direction (`strategic-analysis`, `commercial-leadership`).
- **Adjacent Distinction (FP&A Manager)**: FBP anchors on `strategic-analysis` and `insight-synthesis`; FP&A anchors on `scenario-modelling` and `investment-governance`.

### FP&A Manager
- **Role ID**: `fpa-manager`
- **Canonical Title**: FP&A Manager
- **Domain**: finance
- **IDENTITY_DEFINING**: `forecasting`, `scenario-modelling`
- **CORE_ENABLER**: `investment-governance`, `variance-analysis`
- **SUPPORTING**: `operating-rhythm`
- **DIFFERENTIATOR**: `strategic-analysis`
- **Total Requirements**: 6
- **Signature Rationale**: Running the financial model of the business requires looking forward (`forecasting`, `scenario-modelling`) and allocating capital (`investment-governance`).
- **Adjacent Distinction (Finance Business Partner)**: FP&A builds the structural financial plans; FBP advises the business units on executing them.

### Engineering Manager
- **Role ID**: `engineering-manager`
- **Canonical Title**: Engineering Manager
- **Domain**: engineering
- **IDENTITY_DEFINING**: `people-leadership`, `cross-functional-delivery`
- **CORE_ENABLER**: `architecture-governance`, `operating-control`
- **SUPPORTING**: `dependency-management`
- **DIFFERENTIATOR**: `business-ownership`
- **Total Requirements**: 6
- **Signature Rationale**: Leading technical teams requires guiding the people (`people-leadership`) and shipping the code (`cross-functional-delivery`).
- **Semantic Limitation**: This profile models the *leadership* of engineering using existing generic capabilities. It does NOT model deep software-engineering IC semantics (which remain blocked).

## 4. Requirement Justification Table

| Role | Section | Capability ID | Canonical Label | Justification |
|------|---------|---------------|-----------------|---------------|
| Product Ops | Identity | `product-cadence` | Product Operating Cadence | Core to establishing how the product team works. |
| Product Ops | Identity | `process-improvement` | Process Improvement | Driving efficiency in product delivery. |
| Product Ops | Core | `tooling-enablement` | Tooling Enablement | Managing product tools (Jira, Productboard, etc). |
| Product Ops | Core | `cross-functional-delivery` | Cross-functional Delivery | Coordinating launches. |
| Product Ops | Supporting | `operating-rhythm` | Operating Rhythm | Running rituals. |
| Product Ops | Differentiator | `operating-model` | Operating Model Design | Scaling the product org structure. |
| CX Manager | Identity | `audience-insight` | Audience Insight | Understanding the customer journey. |
| CX Manager | Identity | `process-improvement` | Process Improvement | Fixing broken customer journeys. |
| CX Manager | Core | `measurement-design` | Measurement Design | Designing NPS/CSAT tracking. |
| CX Manager | Core | `cross-functional-delivery` | Cross-functional Delivery | Working across silos to fix experience. |
| CX Manager | Supporting | `variance-analysis` | Variance Analysis | Root-cause analysis of complaints. |
| CX Manager | Differentiator | `change-leadership` | Change Leadership | Driving customer-centric culture. |
| Account Manager | Identity | `account-growth` | Account Growth | Expanding existing relationships. |
| Account Manager | Identity | `commercial-negotiation` | Commercial Negotiation | Defending renewals and pricing. |
| Account Manager | Core | `consultative-selling` | Consultative Selling | Uncovering client needs. |
| Account Manager | Core | `pipeline-management` | Pipeline Management | Tracking renewal/upsell pipeline. |
| Account Manager | Supporting | `variance-analysis` | Variance Analysis | Reviewing account usage/performance drops. |
| Account Manager | Differentiator | `benefits-realisation` | Benefits Realisation | Proving ROI to the client. |
| BD Manager | Identity | `pipeline-management` | Pipeline Management | Driving the sales funnel. |
| BD Manager | Identity | `market-strategy` | Market Strategy | Defining target prospects. |
| BD Manager | Core | `consultative-selling` | Consultative Selling | Pitching value prop. |
| BD Manager | Core | `commercial-negotiation` | Commercial Negotiation | Closing net-new deals. |
| BD Manager | Supporting | `forecasting` | Forecasting | Predicting sales volume. |
| BD Manager | Differentiator | `commercial-partnerships` | Commercial Partnerships | Building channel partners. |
| Service Delivery | Identity | `service-performance` | Service Performance | Owning the SLA. |
| Service Delivery | Identity | `cross-functional-delivery` | Cross-functional Delivery | Coordinating incident resolution. |
| Service Delivery | Core | `operating-control` | Operating Control | Ensuring quality controls. |
| Service Delivery | Core | `ecosystem-operations` | Ecosystem Operations | Managing external vendors/partners. |
| Service Delivery | Supporting | `process-improvement` | Process Improvement | Continuous service improvement. |
| Service Delivery | Differentiator | `operating-rhythm` | Operating Rhythm | Running service reviews. |
| Finance BP | Identity | `variance-analysis` | Variance Analysis | Explaining actuals vs budget. |
| Finance BP | Identity | `strategic-analysis` | Strategic Analysis | Providing commercial decision support. |
| Finance BP | Core | `insight-synthesis` | Insight Synthesis | Translating numbers into narratives. |
| Finance BP | Core | `forecasting` | Forecasting | Managing business unit forecasts. |
| Finance BP | Supporting | `benefits-realisation` | Benefits Realisation | Tracking business case ROI. |
| Finance BP | Differentiator | `commercial-leadership` | Commercial Leadership | Acting as a commercial co-pilot. |
| FP&A Manager | Identity | `forecasting` | Forecasting | Running the corporate forecast. |
| FP&A Manager | Identity | `scenario-modelling` | Scenario Modelling | Building financial models. |
| FP&A Manager | Core | `investment-governance` | Investment Governance | Managing resource allocation/budgeting. |
| FP&A Manager | Core | `variance-analysis` | Variance Analysis | Consolidating performance variance. |
| FP&A Manager | Supporting | `operating-rhythm` | Operating Rhythm | Running the financial calendar. |
| FP&A Manager | Differentiator | `strategic-analysis` | Strategic Analysis | Influencing corporate strategy. |
| Eng Manager | Identity | `people-leadership` | People Leadership | Managing engineers. |
| Eng Manager | Identity | `cross-functional-delivery` | Cross-functional Delivery | Delivering software across teams. |
| Eng Manager | Core | `architecture-governance` | Architecture Governance | Ensuring technical standards. |
| Eng Manager | Core | `operating-control` | Operating Control | Ensuring engineering quality/security. |
| Eng Manager | Supporting | `dependency-management` | Dependency Management | Handling cross-team blockers. |
| Eng Manager | Differentiator | `business-ownership` | Business Ownership | Connecting code to commercial outcomes. |

## 5. Rejected Requirement Candidates
1. `software-delivery-collaboration` (Task): REJECTED -> TASK_NOT_CAPABILITY
2. `retention-management` (Capability): REJECTED -> COVERED_BY_INCLUDED_CAPABILITY (`commercial-negotiation` / `account-growth`)
3. `budgeting` (Task): REJECTED -> COVERED_BY_INCLUDED_CAPABILITY (`investment-governance`)

## 6. Pairwise Semantic Overlap Analysis
- FP&A vs FBP: 3 shared out of 9 unique (33% overlap). Distinct signatures. No HIGH_SEMANTIC_DUPLICATION risk.
- Account Manager vs BD Manager: 3 shared out of 9 unique (33% overlap). Distinct signatures. No HIGH_SEMANTIC_DUPLICATION risk.

## 7. Canonical Capability Reuse Summary
- Total Unique Canonical Capabilities across tranche: 23
- Already used by current 4 roles: 5 (measurement-design, cross-functional-delivery, audience-insight, process-improvement, strategic-analysis).
- Newly used by role knowledge: 18 (e.g., people-leadership, forecasting, pipeline-management).
- New canonical capabilities created: 0

## 8. Capability Underutilization Signal
Capabilities like `pipeline-management`, `forecasting`, `service-performance`, and `people-leadership` existed in the 51-capability canonical ontology but were unused by the 4 proof-of-concept roles. This proves the ontology breadth existed prior to role breadth.

## 9. Analytics-Bias Effect
The addition of these 8 roles materially reduces the analytics concentration. The registry shifts from 100% analytics/data roles to a balanced portfolio across Product, Customer, Commercial, Operations, Finance, and Engineering Management.

## 10. Tranche Acceptance & Readiness
- Product Operations Manager: READY_FOR_PUBLICATION_IMPLEMENTATION
- Customer Experience Manager: READY_FOR_PUBLICATION_IMPLEMENTATION
- Account Manager: READY_FOR_PUBLICATION_IMPLEMENTATION
- Business Development Manager: READY_FOR_PUBLICATION_IMPLEMENTATION
- Service Delivery Manager: READY_FOR_PUBLICATION_IMPLEMENTATION
- Finance Business Partner: READY_FOR_PUBLICATION_IMPLEMENTATION
- FP&A Manager: READY_FOR_PUBLICATION_IMPLEMENTATION
- Engineering Manager: READY_FOR_PUBLICATION_IMPLEMENTATION

**Acceptance**: ALL_8_READY_FOR_IMPLEMENTATION

## 11. Future Implementation File Plan
- `lib/career-possibility/role-knowledge/roles/product-operations-manager.ts`
- `lib/career-possibility/role-knowledge/roles/customer-experience-manager.ts`
- `lib/career-possibility/role-knowledge/roles/account-manager.ts`
- `lib/career-possibility/role-knowledge/roles/business-development-manager.ts`
- `lib/career-possibility/role-knowledge/roles/service-delivery-manager.ts`
- `lib/career-possibility/role-knowledge/roles/finance-business-partner.ts`
- `lib/career-possibility/role-knowledge/roles/fpa-manager.ts`
- `lib/career-possibility/role-knowledge/roles/engineering-manager.ts`
- Registry Export: Add 8 imports and elements to `role-registry.ts`.

## 12. Future Regression-Test Contract
N2E tests must assert:
1. `roleId` uniqueness across all 12 roles.
2. All capability references map to existing IDs in `canonical-capability-library.ts`.
3. No capability ID is duplicated within a single role's sections.
4. The N1 recommendation gate works for the new roles.
5. Zero-role behavior is preserved if a user meets none of the 12 roles.
6. The existing 4 roles' exact semantic profiles remain perfectly unchanged.

## 13. Version Recommendation
- `schemaVersion`: Unchanged (1.0.0 is sufficient)
- `contentVersion`: Increment (e.g. 1.0.0 -> 1.1.0) upon N2E implementation.

## 14. Recommended Next Task
POST-MVP TASK N2E: FIRST BROAD ROLE TRANCHE IMPLEMENTATION

