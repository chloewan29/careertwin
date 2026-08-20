# NON_CANONICAL
# POST-MVP TASK N2A
# READ-ONLY PRODUCT / ARCHITECTURE DESIGN

## Current Architecture
- **Current role knowledge owner:** `lib/career-possibility/generic-role-archetype.ts`
- **Current role universe size:** 4 roles
- **Current role domain coverage:** Analytics, Insights, Data Product (Very narrow POC)

## Scalability Audit
- **Current role model scalability classification:** `CURRENT_MODEL_REQUIRES_NEW_ROLE_KNOWLEDGE_LAYER`
- A static array of roles scales poorly past 20 roles. Maintaining 50+ roles requires a versioned registry and modular file structure.

## Capability-Authority Boundary
- **Canonical capability authority:** `lib/career-possibility/canonical-capability-library.ts`
- **Parallel capability ontology required:** NO
- **Current canonical capability count:** 51
- **Current capability family count:** 12

## Coverage-Family Analysis
- **Recommended occupational/domain coverage model:** Broad functional families independent of the user's current role. Examples include Product, Technology/Engineering, Commercial/Sales, Customer Success/Service, Marketing/Growth, Operations/Service Delivery, Finance, People/HR, and Design/Research.
- **Role family vs capability family separated:** YES

## Strategy Comparison
- **Recommended role knowledge strategy:** OPTION D (Hybrid curated CareerTwin role knowledge built over a standardized occupational catalog/metadata layer). This ensures stable IDs and taxonomy while maintaining CareerTwin's unique canonical capability mapping.
- **Fully manual strategy judgment:** Does not scale globally, risks duplicating standard industry taxonomies, and is hard to maintain.
- **Direct external-taxonomy strategy judgment:** External taxonomies lack CareerTwin's nuanced capability importance semantics (e.g., must, should, differentiator). They cannot be used as a direct semantic requirement authority.
- **Runtime LLM role-generation judgment:** DO NOT DO. Violates determinism, provenance, and versioning. Creates hallucination and ontology drift risks.
- **Hybrid strategy judgment:** The most scalable and trustworthy approach. Use external taxonomy for hierarchical stability and aliases, but curate the exact capability requirements.

## External Taxonomy Architectural Assessment
- **Recommended external taxonomy usage boundary:** Use as occupational catalog, hierarchical metadata, and title aliases only. NOT as a capability requirement authority.

## Registry Assessment
- **Role knowledge registry required:** `NEEDED_BEFORE_MAJOR_EXPANSION`

## Candidate Retrieval Assessment
- **Candidate retrieval required:** `BEFORE_SCALE`
- **Recommended candidate retrieval signals:** Canonical capability overlap, capability-family overlap, and evidence-backed personal capability set. (Do not use job title alone or LLM intuition).
- **Admission remains separate:** YES
- **Ranking remains separate:** YES
- **Role universe size vs displayed role count separated:** YES

## Role Granularity
- **Recommended role granularity:** Recognizable, generic functional roles that span across companies (e.g., "Product Manager", "Customer Success Manager"). Avoid overly broad ("Business") or overly specific ("Senior SaaS PM at Telecom") roles.

## Seniority Strategy
- Treat seniority as metadata variants of a base role profile unless core capabilities change significantly (e.g., transitioning from Individual Contributor to People Manager). Do not cause role explosion for every seniority prefix.

## Aliases
- Store aliases (e.g., "Client Success Manager" for "Customer Success Manager") for search and discovery, but do not create duplicate role profiles.

## Regionality
- Keep role capability semantics globally generic. Store regional nuances as optional metadata. Defer specific regional tailoring.

## Requirement Authoring
- **Role requirement authoring model:** Offline, human-reviewed, structured mapping process. May be AI-assisted offline, but must be statically committed, validated against the canonical library, and versioned.

## Quality Gates
- **Role quality gates:** All requirement IDs must exist in the canonical library. No duplicate requirements. Valid importance sections. No role with *only* differentiators. Minimum semantic coverage met.

## Capability-Library Coverage Risk
- **Canonical capability coverage gap risk:** `MATERIAL_CANONICAL_CAPABILITY_COVERAGE_GAPS`
- **Capability ontology expansion required before broad role expansion:** YES
- **Recommended sequencing if ontology gaps exist:** First establish broad role families → Identify capability gaps → Separately govern and add canonical capabilities → Then publish affected role profiles.

## First Expansion Tranche
- **Recommended first expansion tranche size:** 10–20 role profiles.
- **Recommended first expansion domain count:** 2–3 new broad domains (e.g., Product, Customer Success, Engineering).
- **Recommended tranche composition:** Roles that frequently interface or represent common career pivots. This tests cross-domain alignment and boundary fidelity.

## Target Coverage Acceptance
- **Coverage acceptance criteria:** At least 3 distinct occupational domains represented with a minimum of 3 roles each. Proven ability for out-of-domain fixtures (e.g., pure sales or engineering) to avoid analytics-only candidate sets and return credible roles.

## Regression Fixtures
- **Regression persona/fixture matrix:** Analytics profile, customer/commercial profile, operations profile, product profile, technology profile, sparse profile, mixed/generalist profile.

## Governance/Versioning
- **Governance model:** Role requirement changes require PR review and regression checks. Canonical capability additions require separate ontology review. Deprecations must preserve stable IDs.
- **Versioning/provenance required now:** Schema version, content version.
- **Versioning/provenance deferred:** Full external catalog version synchronization, detailed source JD provenance link mapping for every capability.

## Target Module Architecture
- **Recommended target module/file architecture:**
  ```
  lib/career-possibility/role-knowledge/
    role-profile.ts
    role-registry.ts
    roles/
      product-manager.ts
      customer-success-manager.ts
  ```

## Target Pipeline
- **Recommended target pipeline:**
  VERSIONED ROLE KNOWLEDGE REGISTRY
  ↓
  BROAD DETERMINISTIC CANDIDATE RETRIEVAL
  ↓
  EXISTING ROLE ALIGNMENT
  ↓
  N1 ADMISSION
  ↓
  EXISTING RANKING
  ↓
  UP TO 4
  ↓
  CAREER MAP

## Implementation Sequence
- **Recommended next bounded task:** POST_MVP_TASK_N2B_ROLE_KNOWLEDGE_REGISTRY_FOUNDATION
- **Recommended implementation sequence:**
  1. N2B: Role Knowledge Registry Foundation
  2. N2C: Canonical Capability Ontology Expansion (to support new domains)
  3. N2D: First Broad Role Tranche Authoring
  4. N2E: Deterministic Candidate Retrieval (if required by tranche size)
  5. N2F: Role Coverage Validation

## Locks and Defers
- **N1 preserved:** YES
- **Career Map contract preserved:** YES
- **Job Copilot boundary preserved:** YES
- **Decisions to LOCK NOW:** One canonical capability authority. Admission, ranking, and retrieval remain separate distinct stages. No runtime LLM role invention.
- **Decisions to DEFER:** External taxonomy ingestion, regionality, explicit seniority explosion.
- **Decisions DO NOT DO:** Runtime LLM role generation, family-specific recommendation engines, tailoring the universe to one specific user.
