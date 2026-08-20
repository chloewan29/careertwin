# CareerTwin Post-MVP — Task N0
# Role Recommendation Admission + Role Universe Coverage Audit

**NON_CANONICAL**
**POST-MVP TASK N0**
**READ-ONLY ROLE RECOMMENDATION AUDIT**

Audit date: 2026-08-19
Branch: master
HEAD: f178e64521ac7a393ece44a167a3f7bda1ef60ab
origin/master: f178e64521ac7a393ece44a167a3f7bda1ef60ab

---

## 1. Founder Problem Statement

A sparse real profile (1 atomic evidence, 1 personal canonical capability, 1 capability family) causes CareerTwin to surface roles such as Customer Insights Lead and Data Product Manager as "Future role · path 1 / path 2." The displayed panel reports approximately 1 strength, 6 gaps, 1 transferable — yet the product presents these roles as credible future directions. The core question: **why are these roles being recommended at all?**

---

## 2. Target State

- File: `C:\Users\chloe\Downloads\careertwin-sparse-profile-m1.json`
- Expected SHA256: `78FC3DF2327CB9B0740C0C1226A47DA2AF724C50A528896A91BEB89A704FB1AD`
- Verified SHA256: `78FC3DF2327CB9B0740C0C1226A47DA2AF724C50A528896A91BEB89A704FB1AD`
- SHA_MATCH: YES

### Sparse profile structural counts (privacy-safe)

| Field                  | Count |
|------------------------|-------|
| evidence               | 1     |
| mappings               | 1     |
| capabilities           | 1     |
| unresolvedEvidence     | 0     |
| schemaVersion          | 2.0.0 (provisional) |
| source                 | provisional_resume |
| mapTrustStatus         | provisional |

**Single capability:** `customer-adoption`
**Relationship:** `transferable_signal` (NOT direct)
**Method:** `structured_inference`

---

## 3. Contrast Profile

- File: `C:\Users\chloe\Downloads\careertwin-real-state-a1.json`
- Expected SHA256: `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`
- Verified SHA256: `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`
- SHA_MATCH: YES
- Source classification: **REAL_LOCAL_STATE**

---

## 4. Role Knowledge Owner

**Authoritative file:** `lib/career-possibility/generic-role-archetype.ts`

- GENERIC_ROLE_ARCHETYPE_SCHEMA_VERSION: `1.0.0`
- GENERIC_ROLE_ARCHETYPE_CONTENT_VERSION: `1.0.0`
- Role set type: **FIXED** (hardcoded array `representativeGenericRoleArchetypes`)
- Role profiles derived via `projectGenericRoleArchetypeToProfile()` → exported as `representativeGenericRoleProfiles`
- No external configuration or dynamic loading

---

## 5. Role Universe Inventory

Total known generic roles: **4**

| # | roleFamilyId              | canonicalTitle            | domain              | Identity caps (must) | Core enablers | Supporting | Differentiators | Total requirements |
|---|---------------------------|---------------------------|---------------------|----------------------|---------------|------------|-----------------|-------------------|
| 1 | analytics-manager         | Analytics Manager         | analytics           | 2                    | 2             | 1          | 1               | 6                 |
| 2 | customer-insights-lead    | Customer Insights Lead    | customer-insights   | 3                    | 2             | 1          | 1               | 7                 |
| 3 | marketing-analytics-lead  | Marketing Analytics Lead  | marketing-analytics | 2                    | 2             | 1          | 1               | 6                 |
| 4 | data-product-manager      | Data Product Manager      | data-product        | 3                    | 2             | 1          | 1               | 7                 |

### Capability-family distribution of requirements

All 4 roles draw from capabilities in the Analytics & Insight, Research & Insight, Product & Delivery, and Operations families of the canonical library. No role in the current library represents non-analytics, non-data, non-research/insights occupational domains.

No explicit role family/category metadata is carried on the archetype objects beyond `domain` (a free-form string field).

---

## 6. Role Universe Size

| Metric                                   | Value |
|------------------------------------------|-------|
| Total known generic roles                | 4     |
| Total candidates considered for Career Map | 4   |
| Total roles ranked                       | 4     |
| Total roles projected by default         | 4     |
| Total roles displayed                    | 4     |

**Architecture determination: A — CareerTwin literally knows only 4 current roles.**

There is no candidate retrieval step that narrows from a broader universe. `personal-generic-role-alignment-adapter.ts` passes `representativeGenericRoleArchetypes` (all 4) directly into `buildGenericCareerPathAlignment`. All 4 roles are always aligned, ranked, and projected.

---

## 7. Role Universe Coverage Judgment

**Classification: VERY_NARROW_PROOF_OF_CONCEPT_ROLE_UNIVERSE**

All 4 roles are analytics, data, customer-insights, or data-product oriented. The universe has no roles from:
- Leadership / general management
- Operations / program delivery
- Commercial / partnerships
- Finance / strategy
- Technology / engineering
- People / HR
- Legal / risk / compliance
- Any non-analytics domain

A user with evidence that does not map to analytics-oriented canonical capabilities has no meaningful alternatives in the current role candidate set.

---

## 8. Role Alignment Owner

| Pipeline Stage              | Owner File                                           |
|-----------------------------|------------------------------------------------------|
| Candidate retrieval          | `personal-generic-role-alignment-adapter.ts` — passes all 4 archetypes |
| Alignment / ownership match  | `generic-career-path-alignment.ts` → `buildCanonicalOwnershipAlignment()` |
| Weighted overlap             | None — ownership alignment uses binary matched/missing counts, not weighted scores |
| Ranking / ordering           | `generic-career-path-alignment.ts` — `.sort()` on `orderingBasis` array |
| Top-K truncation             | **None present** — all ranked roles pass through |
| Projection                  | `career-map-graph-projection.ts` — `rankedRoleAlignment.roles.entries()` iterates all roles |
| Renderer consumption        | `CareerMapNeuralGraph.tsx` — receives the projection and displays all ROLE nodes |

---

## 9. Ranking vs Admission Audit

**ROLE_ADMISSION_GATE: ABSENT**

There is no admission gate anywhere in the pipeline. The alignment function:
1. Aligns all 4 roles against personal ownership
2. Sorts them by `orderingBasis` (identity-first, then core, then supporting, then differentiator evidenced counts)
3. Returns all 4 roles regardless of absolute score
4. All 4 are projected and displayed

**CURRENT SYSTEM RANKS CANDIDATES WITHOUT ABSOLUTE RECOMMENDATION ADMISSION — CONFIRMED**

No threshold check exists. No minimum evidence floor. No minimum identity-defining capability coverage gate. No "insufficient signal" state exists anywhere in the pipeline.

---

## 10. Top-K Behavior

**Top-K behavior: ALWAYS ATTEMPTS TO RETURN K=4 ROLES**

- K is not explicitly configured as a number; the effective K is implicitly `representativeGenericRoleArchetypes.length` = 4
- No truncation logic exists at alignment, projection, or visual adapter layer
- The projection iterates `rankedRoleAlignment.roles.entries()` unconditionally
- Zero roles is **structurally impossible** through normal product logic given at least 1 capability in personal state (because `customer-adoption` appears as a differentiator in 2 of the 4 roles, causing them to sort higher)

**ZERO ROLE SEMANTIC RESULT SUPPORTED: NO**
**ZERO ROLE PRODUCT RESULT REACHABLE: NO** (given current architecture — even a profile with zero canonical capabilities would project all 4 roles with all zeroes in orderingBasis, sorted alphabetically)

---

## 11. Absolute Quality Signal

The `buildCanonicalOwnershipAlignment()` function computes for each role:

| Signal Name                      | Type      | Exists? |
|----------------------------------|-----------|---------|
| identityDefining.evidencedCapabilities | Absolute count | YES |
| identityDefining.totalCapabilities | Absolute count | YES |
| coreEnablers.evidencedCapabilities | Absolute count | YES |
| supporting.evidencedCapabilities | Absolute count | YES |
| differentiators.evidencedCapabilities | Absolute count | YES |
| orderingBasis (array of above)   | Relative ordering | YES |
| weighted overlap                 | None — all requirements treated equally | ABSENT |
| must-have coverage               | Partial — identity_defining maps to "must" | DERIVABLE |
| fitScore                         | ABSENT | NO |
| proximityRank                    | Presentation-only ordinal after sorting | RELATIVE ONLY |

**Absolute quality signal: `identityDefining.evidencedCapabilities / identityDefining.totalCapabilities`**
This is computable from existing data. It is NOT currently evaluated as an admission threshold.

**Relative ordering signal: `orderingBasis` tuple**, used only for sort order. Does not gate admission.

---

## 12. Sparse Target — Full Role Candidate Table

Sparse profile: 1 capability (`customer-adoption`, `transferable_signal`, `structured_inference`)

| Rank (display) | roleFamilyId              | canonicalTitle            | Identity evidenced/total | Core evidenced/total | Supporting evidenced/total | Diff evidenced/total | orderingBasis      | Matched caps | Missing caps | Projected |
|----------------|---------------------------|---------------------------|--------------------------|----------------------|-----------------------------|----------------------|--------------------|--------------|--------------|-----------|
| 0 (Path 1)     | customer-insights-lead    | Customer Insights Lead    | 0/3                      | 0/2                  | 0/1                         | 1/1                  | [0, 0, 0, 1]       | 1            | 6            | YES       |
| 1 (Path 2)     | data-product-manager      | Data Product Manager      | 0/3                      | 0/2                  | 0/1                         | 1/1                  | [0, 0, 0, 1]       | 1            | 6            | YES       |
| 2 (Path 3)     | analytics-manager         | Analytics Manager         | 0/2                      | 0/2                  | 0/1                         | 0/1                  | [0, 0, 0, 0]       | 0            | 6            | YES       |
| 3 (Path 4)     | marketing-analytics-lead  | Marketing Analytics Lead  | 0/2                      | 0/2                  | 0/1                         | 0/1                  | [0, 0, 0, 0]       | 0            | 6            | YES       |

**Note:** Customer Insights Lead and Data Product Manager tie on orderingBasis. Tie broken by `a.title.localeCompare(b.title, "en")` → "Customer Insights Lead" < "Data Product Manager" alphabetically.

---

## 13. Sparse Target — Admission Sanity Test

| Role                      | Identity coverage | Absolute support classification           |
|---------------------------|-------------------|--------------------------------------------|
| Customer Insights Lead    | 0/3 (0%)          | **NEGLIGIBLE_SUPPORT**                     |
| Data Product Manager      | 0/3 (0%)          | **NEGLIGIBLE_SUPPORT**                     |
| Analytics Manager         | 0/2 (0%)          | **NEGLIGIBLE_SUPPORT**                     |
| Marketing Analytics Lead  | 0/2 (0%)          | **NEGLIGIBLE_SUPPORT**                     |

All 4 roles have **zero identity-defining canonical capability coverage**. Zero core-enabler coverage. Zero supporting coverage. Only 2 roles have 1 differentiator match (`customer-adoption`), which is the lowest-priority structural section.

---

## 14. Customer Insights Lead Case

### Inputs entering alignment
- Owned canonical capabilities: 1 (`customer-adoption`, `transferable_signal`)
- `customer-adoption` is a **differentiator** requirement for Customer Insights Lead

### Alignment results
| Metric                        | Value |
|-------------------------------|-------|
| Shared/owned capability count | 1     |
| Section                       | differentiator (lowest structural priority) |
| Transferable count            | 1     |
| Gap count                     | 6 (all identity + core + supporting requirements missing) |
| orderingBasis                 | [0, 0, 0, 1] |
| Rank among candidates         | 0 (Path 1) — tied with Data Product Manager, wins alphabetically |
| Weighted score                | None (system uses binary counts) |

### Why it became Path 1

**DID CUSTOMER INSIGHTS LEAD BECOME PATH 1 PRIMARILY BECAUSE IT IS THE BEST RELATIVE MATCH IN THE AVAILABLE CANDIDATE SET.**

Specifically: it tied with Data Product Manager (both have orderingBasis [0,0,0,1]) and won the tiebreak because "Customer Insights Lead" sorts before "Data Product Manager" alphabetically. It did NOT become Path 1 because it has strong absolute support. It has **zero identity-defining evidence**, which means the system's own explanation text states: *"Identity-defining canonical capability ownership is not represented in the current personal Career Map state."*

### Customer Insights Lead support classification
**NEGLIGIBLE_SUPPORT**

---

## 15. Data Product Manager Case

### Alignment results
| Metric                        | Value |
|-------------------------------|-------|
| Shared/owned capability count | 1     |
| Section                       | differentiator |
| Transferable count            | 1     |
| Gap count                     | 6     |
| orderingBasis                 | [0, 0, 0, 1] |
| Rank                          | 1 (Path 2) — alphabetically after Customer Insights Lead |

### Why it remains in the future-role set

Data Product Manager requires `customer-adoption` as a differentiator. The sparse profile owns `customer-adoption` (transferable). This is the only match. Since the system has no admission gate, the role is projected despite having **zero identity-defining, core-enabler, and supporting coverage**.

### Data Product Manager support classification
**NEGLIGIBLE_SUPPORT**

---

## 16. Contrast Profile Test

Contrast profile: 11 capabilities (all `direct_evidence`), including `analytics-governance`, `audience-insight`, `cross-functional-delivery`, `insight-synthesis`, `marketing-effectiveness`, `measurement-design`, and others.

| Rank | canonicalTitle            | Identity evidenced/total | Core evidenced/total | orderingBasis        | Matched | Missing |
|------|---------------------------|--------------------------|----------------------|----------------------|---------|---------|
| 0    | Analytics Manager         | 2/2 (100%)               | 2/2 (100%)           | [2, 2, 0, 0]         | 4       | 2       |
| 1    | Marketing Analytics Lead  | 2/2 (100%)               | 1/2 (50%)            | [2, 1, 1, 0]         | 4       | 2       |
| 2    | Customer Insights Lead    | 1/3 (33%)                | 1/2 (50%)            | [1, 1, 1, 0]         | 3       | 4       |
| 3    | Data Product Manager      | 0/3 (0%)                 | 2/2 (100%)           | [0, 2, 1, 0]         | 3       | 4       |

### Contrast findings

- **Analytics Manager** and **Marketing Analytics Lead** show strong identity-defining coverage (100%) with rich analytics evidence — the ranking is **meaningfully differentiated** for an in-domain analytics profile
- **Customer Insights Lead** shows partial identity support (1/3) — the ranking meaningfully reflects genuine partial overlap
- **Data Product Manager** shows 0 identity-defining coverage despite core-enabler hits — this is a legitimate edge case even for the richer profile

**Conclusion:** For the analytics-rich contrast profile, ranking behavior is **meaningful and domain-appropriate**. For the sparse non-analytics profile, ranking is **forced relative ordering on a universally negligible signal base**.

---

## 17. Relative-Ranking Failure Test

**FORCED_RELATIVE_RANKING_CONFIRMED**

All 4 candidate roles have negligible absolute support for the sparse profile (zero identity-defining coverage across all roles). Despite this, CareerTwin produces:
- Path 1: Customer Insights Lead
- Path 2: Data Product Manager
- Path 3: Analytics Manager
- Path 4: Marketing Analytics Lead

The ordering is determined by a single differentiator match (`customer-adoption`) that appears in 2 roles, and alphabetical tiebreak for positions 3 and 4. No absolute quality floor gates any of these from display.

---

## 18. Candidate Universe Failure Test

**ROLE_UNIVERSE_COVERAGE_MATERIALLY_INSUFFICIENT**

The sparse profile is not meaningfully oriented toward analytics, data, or insights. Yet all 4 available roles are in the analytics/data/customer-insights/data-product space. There is no role in the library that a non-analytics professional could match more meaningfully. The current role universe cannot produce a credible non-analytics recommendation even with strong non-analytics evidence — because no non-analytics roles exist.

---

## 19. Counterfactual: Can CareerTwin Produce 0 Recommended Future Roles?

**NO.**

Even if all 4 current roles were poor matches, CareerTwin would still project all 4. The projection layer iterates `rankedRoleAlignment.roles.entries()` unconditionally. There is no gate between "aligned roles" and "projected roles." Roles are not admitted — they are simply sorted.

This is **strong evidence of an admission architecture defect.**

---

## 20. Role Recommendation Semantic Contract Audit

| Concept               | Current semantic owner / treatment |
|-----------------------|------------------------------------|
| ROLE POSSIBILITY       | Implicit in role library existence. All 4 roles are always considered possible. |
| ROLE RELEVANCE         | Not semantically defined. No relevance filter exists. |
| ROLE RANK              | `orderingBasis` sort in `generic-career-path-alignment.ts` |
| ROLE FIT               | Not computed. No fitScore exists in ownership alignment path. |
| ROLE RECOMMENDATION    | **Conflated with ROLE RANK.** Any ranked role is effectively a recommendation. |
| ROLE PROXIMITY         | `proximityRank` — presentation-only ordinal from sort position; carries no semantic meaning |

**Current system conflates ROLE RANK with ROLE RECOMMENDATION.** No semantic distinction exists between "this role is ranked #1" and "this role is recommended as a future path." The rank is used directly to produce "Path 1," "Path 2," etc.

---

## 21. "Path 1" Product Language Audit

### Owner
`components/career-possibility/CareerMapNeuralGraph.tsx`, line 280:
```tsx
<p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">
  Future role · path {typeof role?.proximityRank === "number" ? role.proximityRank + 1 : ""}
</p>
```

`proximityRank` is assigned in `career-map-graph-projection.ts` line 393, where it equals the array index from the sorted role alignment result. It is a **display ordinal**, not a semantic recommendation confidence.

### Language assessment

The phrase **"Future role · path 1"** implies:
- This is a recommended direction (not just a display artifact)
- Ordering implies relative strength ("path 1" is better than "path 2")
- The role is a plausible future for this specific person

**PATH 1 LANGUAGE JUSTIFIED: NO**

For the sparse profile, "Path 1" is assigned to Customer Insights Lead not because it has any strong absolute support but because `customer-adoption` is its differentiator and it sorts alphabetically before Data Product Manager. The language implies meaningful recommendation confidence that the current evidence does not support.

---

## 22. Zero-Role Product Path Audit

| Layer                          | Variable-role-count support                                              |
|--------------------------------|--------------------------------------------------------------------------|
| `buildGenericCareerPathAlignment` | Returns all N roles — no truncation; cannot return 0 naturally          |
| `buildCareerMapGraphProjection` | Iterates `rankedRoleAlignment.roles.entries()` — supports any count including 0 if upstream returns 0 |
| `buildCareerGraphVisualModel`  | Builds ROLE nodes from projection — supports 0 ROLE nodes (no hard assumption) |
| `CareerMapNeuralGraph.tsx`     | `hasRole = visualModel.nodes.some(...)` — tolerates 0 roles (no crash). `hasRole` gates a screen-reader announcement only. |

**Projection: SUPPORTS_VARIABLE_ROLE_COUNT** (structurally — but upstream always provides 4)
**Visual adapter: SUPPORTS_VARIABLE_ROLE_COUNT**
**Renderer: SUPPORTS_VARIABLE_ROLE_COUNT** (no assumption of fixed 4)

The graph renderer would render correctly with 0, 1, 2, or 3 roles if the upstream alignment result provided fewer. The blocking layer is the alignment pipeline — which always returns all N archetypes.

---

## 23. Admission Architecture Options

The natural seam for future admission logic:

```
personal capability state
    ↓
candidate role universe (all 4 archetypes)
    ↓
[NEW: ROLE ADMISSION GATE] ← correct insertion point
    ↓
ranking of admitted roles
    ↓
up to 4 future roles
    ↓
Career Map
```

**Preferred seam:** Inside `buildGenericCareerPathAlignment()` after computing section summaries for each role, before sorting — or as a post-filter in `personal-generic-role-alignment-adapter.ts` between alignment and graph projection.

**Do NOT make renderer the gate** — the renderer (`CareerMapNeuralGraph.tsx`) should not be the semantic recommendation authority.

Options in order of architectural cleanliness:
1. **Post-alignment filter in `personal-generic-role-alignment-adapter.ts`** — thin wrapper that admits roles before passing to projection. Minimal blast radius. Does not change alignment semantics.
2. **Internal gate in `buildCanonicalOwnershipAlignment()`** — admission logic inside the alignment function itself. More coupled but co-located with signal computation.
3. **New thin admission owner** — separate `role-admission-gate.ts` called between alignment and graph projection. Most explicit and testable.

**Recommendation: Option 1 or Option 3.** Admission should occur upstream of projection, not inside it.

---

## 24. Admission Signal Feasibility

| Signal                               | Availability     | Notes |
|--------------------------------------|------------------|-------|
| identityDefining.evidencedCapabilities / totalCapabilities | AVAILABLE_NOW | Already computed in ownership alignment |
| coreEnablers.evidencedCapabilities / totalCapabilities     | AVAILABLE_NOW | Already computed |
| must-have coverage (identity + core as proxy)              | AVAILABLE_NOW | identity_defining = must; core_enabler = must + should |
| total matched capabilities / total requirements            | DERIVABLE_WITHOUT_NEW_SEMANTICS | Simple arithmetic on existing counts |
| gap proportion (missingCapabilities.length / total)        | AVAILABLE_NOW | Already computed |
| minimum evidence signal (at least N evidence pieces)       | AVAILABLE_NOW | `state.evidence.length` |
| minimum personal capability count                          | AVAILABLE_NOW | `state.capabilities.length` |
| transferable-only match (no direct evidence matches)       | DERIVABLE_WITHOUT_NEW_SEMANTICS | From `supports[].relationship` |
| differentiator-only match (no identity/core match)         | AVAILABLE_NOW | From orderingBasis structure |

No new semantic concepts are required to implement an admission gate. All relevant signals are already computed.

---

## 25. Insufficient-Signal Recommendation State

**ABSENT**

CareerTwin has no product state, semantic concept, or UX path for:
- "Insufficient signal to recommend future paths"
- Showing 0 roles with an explanatory message
- Prompting the user to enrich career evidence before role recommendations appear

The `futurePaths` field in `PersonalCareerMapPresentation` has `available: false` — but this applies only to the old V1 local state path and refers to a different (now deprecated) future-paths feature. It is not connected to role admission quality.

---

## 26. Role Library Expansion

NOT implemented in N0. Noted: even with a correct admission gate, the current 4-role universe cannot produce credible recommendations for non-analytics profiles. Both defects require repair, sequenced appropriately.

---

## 27. Root-Cause Classification

**Primary classification: C — FORCED_TOP_K_AND_ROLE_UNIVERSE_COVERAGE_INSUFFICIENT**

Both problems are present and independently harmful:
1. **FORCED_TOP_K_WITHOUT_ROLE_ADMISSION**: The system always projects all 4 roles regardless of absolute quality. Even if the library were expanded, the admission defect would persist.
2. **ROLE_UNIVERSE_COVERAGE_INSUFFICIENT**: Even if an admission gate existed, a sparse non-analytics user would likely receive 0 admitted roles from the current 4-role universe, requiring role library expansion to be useful.

---

## 28. Product Risk Classification

**P0 TRUST DEFECT**

CareerTwin presents "Future role · path 1" (Customer Insights Lead) to a user whose only personal capability is a single transferable-signal match to a **differentiator** requirement — the lowest-priority structural section. The system's own explanation text says: *"Identity-defining canonical capability ownership is not represented in the current personal Career Map state."* This gap is not surfaced to the user. The product instead presents an orange badge reading "Future role · path 1" with "1 strength · 6 gaps · 1 transferable."

**Why P0:** This is not a quality degradation — it is a trust violation. The product confidently directs users toward a specific career direction without the evidence to support that direction. A user who trusts CareerTwin may take action (seek learning, target jobs, tell others) based on a recommendation that is purely an artifact of the role library structure, not their actual evidence.

---

## 29. Recommended Sequencing

Based on repository evidence:

**P0: N1 — ROLE RECOMMENDATION ADMISSION GATE**
- Implement minimum absolute admission criteria before ranking
- Must include: identity-defining capability coverage floor (e.g., ≥1 identity-defining capability owned)
- Must include: minimum personal capability count signal
- Must include: insufficient-signal product state with UX (N3 dependency)
- Can be implemented with currently available signals; no new semantics required
- Blast radius: alignment adapter, graph projection; renderer already tolerates 0 roles

**P1: N2 — ROLE UNIVERSE COVERAGE EXPANSION**
- Add roles beyond analytics/data/insights domain
- Requires role authoring work (canonical capability mapping, archetype authoring, validation)
- Must not precede N1 — expanding coverage without admission means more low-quality results

**P2: N3 — INSUFFICIENT-SIGNAL FUTURE-PATH UX**
- Product state and user-facing message when 0 roles admitted
- Prompt to review/enrich career evidence
- Can be developed in parallel with N1 design

---

## 30. Regression Fixture Recommendation

Recommend the following fixtures for future role-recommendation admission tests:

**FIXTURE A — Sparse profile, weak support across all roles**
- Input: ≤1 personal capability, no identity-defining coverage in any role
- Expected: 0 admitted roles
- Purpose: validates admission gate blocks negligible-support recommendations

**FIXTURE B — Strong analytics profile**
- Input: ≥2 identity-defining capabilities for at least one analytics role (e.g., `measurement-design` + `analytics-governance` for Analytics Manager)
- Expected: ≥1 admitted role (Analytics Manager at minimum)
- Purpose: validates admission gate passes clearly supported recommendations

**FIXTURE C — Mixed profile, partial support**
- Input: identity-defining coverage in 1-2 roles but not others
- Expected: fewer than K=4 roles admitted
- Purpose: validates gate admits only sufficiently supported roles

Do not create these fixtures in N0.

---

## 31. Repository Boundary

- Product files modified: 0
- Tests modified: 0
- Control docs modified: 0
- Package files modified: 0
- Live provider calls: 0
- CV uploads: 0
- Raw personal state committed: NO
- Index (staged): EMPTY
- HEAD: f178e64521ac7a393ece44a167a3f7bda1ef60ab (unchanged)
- origin/master: f178e64521ac7a393ece44a167a3f7bda1ef60ab (unchanged)
- git diff --check: no whitespace errors
- HOLD: PRESERVED (existing worktree modifications from prior tasks untouched)
- Untracked audit scripts created: `tmp_n0_sparse_alignment.ts`, `tmp_n0_contrast_alignment.ts` (to be deleted)

---

## 32. Required Output Summary

| # | Item                                              | Value |
|---|---------------------------------------------------|-------|
| 1  | Decision                                         | POST_MVP_TASK_N0_FORCED_TOP_K_AND_COVERAGE_DEFECT_CONFIRMED |
| 2  | MODE                                             | READ-ONLY PRODUCT / ARCHITECTURE DIAGNOSIS |
| 3  | Branch / HEAD / origin                           | master / f178e64521ac7a393ece44a167a3f7bda1ef60ab / f178e64521ac7a393ece44a167a3f7bda1ef60ab |
| 4  | HOLD preserved                                   | YES |
| 5  | Sparse target verified                           | YES |
| 6  | Sparse target SHA256                             | 78FC3DF2327CB9B0740C0C1226A47DA2AF724C50A528896A91BEB89A704FB1AD |
| 7  | Contrast profile source                          | REAL_LOCAL_STATE |
| 8  | Contrast profile SHA256                          | 0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D |
| 9  | Role knowledge owner                             | `lib/career-possibility/generic-role-archetype.ts` |
| 10 | Role alignment owner                             | `lib/career-possibility/generic-career-path-alignment.ts` |
| 11 | Ranking owner                                    | `buildCanonicalOwnershipAlignment()` — sort on `orderingBasis` |
| 12 | Projection owner                                 | `lib/career-possibility/career-map-graph-projection.ts` |
| 13 | Total generic roles known                        | 4 |
| 14 | Total candidate roles considered                 | 4 (all archetypes always passed) |
| 15 | Total roles projected by default                 | 4 |
| 16 | Total roles displayed                            | 4 |
| 17 | Role universe classification                     | VERY_NARROW_PROOF_OF_CONCEPT_ROLE_UNIVERSE |
| 18 | Complete role inventory                          | See Section 5 |
| 19 | Role admission gate present                      | NO |
| 20 | Top-K behavior                                   | ALWAYS ATTEMPTS TO RETURN K ROLES |
| 21 | Configured/effective K                           | 4 (implicit — equals archetype count) |
| 22 | Zero-role semantic result supported              | NO |
| 23 | Zero-role product result reachable               | NO |
| 24 | Absolute alignment signal(s)                     | identityDefining.evidencedCapabilities/totalCapabilities; coreEnablers.evidencedCapabilities/totalCapabilities; gap count |
| 25 | Relative ranking signal(s)                       | orderingBasis tuple sort; proximityRank (display ordinal only) |
| 26 | Sparse-target full candidate table               | See Section 12 |
| 27 | Customer Insights Lead shared count              | 1 (customer-adoption, differentiator section) |
| 28 | Customer Insights Lead transferable count        | 1 |
| 29 | Customer Insights Lead gap count                 | 6 |
| 30 | Customer Insights Lead score/rank                | orderingBasis [0,0,0,1]; rank 0 (Path 1) |
| 31 | Why Customer Insights Lead became Path 1         | Tied Data Product Manager on orderingBasis; won alphabetical tiebreak |
| 32 | Customer Insights Lead support classification    | NEGLIGIBLE_SUPPORT |
| 33 | Data Product Manager support classification      | NEGLIGIBLE_SUPPORT |
| 34 | Sparse target overall recommendation quality     | All 4 roles: NEGLIGIBLE_SUPPORT |
| 35 | Contrast profile candidate table                 | See Section 16 |
| 36 | Contrast profile recommendation quality          | Analytics Manager: STRONG_SUPPORT; Marketing Analytics Lead: MODERATE_SUPPORT; Customer Insights Lead: WEAK_SUPPORT; Data Product Manager: UNDETERMINABLE_WITH_CURRENT_SIGNAL (0 identity despite strong core) |
| 37 | Forced relative ranking                          | CONFIRMED |
| 38 | Candidate universe coverage                      | MATERIALLY INSUFFICIENT |
| 39 | Current system can return zero recommendations   | NO |
| 40 | "Path 1" owner                                   | `components/career-possibility/CareerMapNeuralGraph.tsx` line 280 |
| 41 | "Path 1" language justified                      | NO |
| 42 | Projection variable-role-count support           | SUPPORTS_VARIABLE_ROLE_COUNT |
| 43 | Visual adapter variable-role-count support       | SUPPORTS_VARIABLE_ROLE_COUNT |
| 44 | Renderer variable-role-count support             | SUPPORTS_VARIABLE_ROLE_COUNT |
| 45 | Insufficient-signal recommendation state exists  | NO |
| 46 | Available future admission signals               | identityDefining.evidencedCapabilities, coreEnablers.evidencedCapabilities, gap proportion, personal capability count, minimum evidence count — all AVAILABLE_NOW |
| 47 | Recommended admission seam                       | Post-alignment filter in `personal-generic-role-alignment-adapter.ts` or new thin `role-admission-gate.ts` |
| 48 | Semantic projection change required for admission | NO — projection already supports variable role count |
| 49 | Role library expansion required                  | LATER (after N1 admission gate) |
| 50 | Primary root-cause classification                | C — FORCED_TOP_K_AND_ROLE_UNIVERSE_COVERAGE_INSUFFICIENT |
| 51 | Product risk classification                      | P0 TRUST DEFECT |
| 52 | Recommended P0                                   | N1 — ROLE RECOMMENDATION ADMISSION GATE |
| 53 | Recommended P1                                   | N2 — ROLE UNIVERSE COVERAGE EXPANSION |
| 54 | Recommended P2                                   | N3 — INSUFFICIENT-SIGNAL FUTURE-PATH UX |
| 55 | Regression fixture recommendation                | FIXTURE A (sparse → 0 roles), FIXTURE B (strong analytics → ≥1 role), FIXTURE C (mixed → fewer than K) |
| 56 | Product files modified                           | 0 |
| 57 | Tests modified                                   | 0 |
| 58 | Control docs modified                            | 0 |
| 59 | Package files modified                           | 0 |
| 60 | Live provider calls                              | 0 |
| 61 | CV uploads                                       | 0 |
| 62 | Raw personal state committed                     | NO |
| 63 | Artifact path                                    | `artifacts/career-possibility/task-n0-role-recommendation-admission-role-universe-audit.md` |
| 64 | Artifact SHA256                                  | (computed below) |
| 65 | git diff --check                                 | CLEAN — no whitespace errors |
| 66 | Final index                                      | EMPTY |
| 67 | Final worktree/HOLD                              | HOLD PRESERVED — prior worktree modifications unchanged |
| 68 | Ready for bounded repair admission               | YES — N0 evidence is complete |
| 69 | Recommended next task                            | N1 — ROLE RECOMMENDATION ADMISSION GATE |
| 70 | Exact next action                                | Founder / EM review N0 artifact and admit N1 bounded repair scope |

---

## 33. Decision

**POST_MVP_TASK_N0_FORCED_TOP_K_AND_COVERAGE_DEFECT_CONFIRMED**
