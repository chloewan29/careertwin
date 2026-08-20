# WAVE 2 TARGETED ROLE-SEMANTIC REVISIONS

> [!WARNING]
> NON_CANONICAL  
> WAVE 2 TARGETED ROLE-SEMANTIC REVISIONS  
> NOT YET ADMITTED  
> NO PRODUCTION SEMANTIC AUTHORITY

## Frozen inputs

- Source packet SHA256: `7E298B7F6FB3EB9680337887872A6395484EAFA7230271373F09FA7935688B2D`
- Candidate artifact SHA256: `CD1ED3A13184E1E52D2225F145697B24555D0C6D9328BA253E1483C723910C6F`
- Independent review SHA256: `88BCF25EF353E9298FDB8C8164F8BF04F03FC8519EABAD4603944B09A1F181D1`
- Revision mode: `CAREER_MAP_MVP / ROLE_KNOWLEDGE_ENRICHMENT / WAVE_2_TARGETED_ROLE_SEMANTIC_REVISIONS`
- Generated at: `2026-08-11T03:49:57.362Z`

## Frozen admission set — reference only

These records were not regenerated, revised, or reopened.

### `fpa-manager / forecasting`

- **status:** `FROZEN_ADMISSION_CANDIDATE`
- **expectedEvidence:** “Produced a forward-looking financial forecast from current performance and stated assumptions, and used forecast changes to make a documented planning decision.”

### `education-program-lead / education-partnerships`

- **status:** `FROZEN_ADMISSION_CANDIDATE`
- **expectedEvidence:** “Worked with an education partner to agree responsibilities, coordinate contributions, and enable delivery of a defined education activity or program.”

Frozen admission candidates regenerated: 0.

## Targeted revision 1 — FP&A Manager / Variance Analysis

- **roleFamilyId:** `fpa-manager`
- **capabilityId:** `variance-analysis`
- **relationship category:** `shouldHave`
- **importance:** `should`
- **minimumProofLevel:** `demonstrated`
- **original candidate expectedEvidence:** “Compared actual financial performance with plan, quantified material variances, and explained the main drivers for review.”
- **independent defect class:** `UNSOURCED_THRESHOLD_INJECTION`
- **revised candidate expectedEvidence:** “Compared actual financial performance with plan, quantified variances, and explained the main drivers for review.”
- **exact change made:** Removed only the word “material”.
- **why the revision resolves the defect:** The candidate no longer requires an ungrounded significance threshold while preserving actual-versus-plan comparison, variance quantification, and driver explanation.
- **proof-level fidelity assessment:** `PASS` — demonstrated analysis remains sufficient; no decision ownership or final outcome is required.
- **scale/domain neutrality assessment:** `PASS`.
- **action requirement assessment:** `PASS` — comparison, quantification, and explanation remain direct evidence of the target.
- **outcome requirement assessment:** `PASS` — no outcome is required.
- **private-boundary assessment:** `PASS` — it neither creates private `financial-planning` nor requires private `executive-reporting`.
- **remaining admission risk:** `LOW` — final independent review must confirm that “quantified variances” remains appropriate role-specific evidence without creating a new threshold.
- **revision status:** `REVISED_PENDING_FINAL_REVIEW`

## Targeted revision 2 — Program Manager / Dependency Management

- **roleFamilyId:** `program-manager`
- **capabilityId:** `dependency-management`
- **relationship category:** `mustHave`
- **importance:** `must`
- **minimumProofLevel:** `demonstrated`
- **original candidate expectedEvidence:** “Identified dependencies between program workstreams, coordinated their sequence and handoffs, and resolved or escalated an issue affecting delivery.”
- **independent defect class:** `ACTION_INFLATION`
- **revised candidate expectedEvidence:** “Identified dependencies between program workstreams and coordinated their sequence and handoffs to support delivery.”
- **exact change made:** Removed the mandatory occurrence, resolution, or escalation of an issue; retained identification, coordination, sequencing, handoffs, and delivery relevance.
- **why the revision resolves the defect:** Proactive dependency management can now satisfy the evidence requirement without a reactive issue event or escalation outcome.
- **proof-level fidelity assessment:** `PASS` — demonstrated coordination is required, not ownership of final program delivery.
- **scale/domain neutrality assessment:** `PASS`.
- **action requirement assessment:** `PASS` — all remaining actions are intrinsic to dependency management in this role context.
- **outcome requirement assessment:** `PASS` — “to support delivery” supplies context rather than a mandatory delivery outcome.
- **private-boundary assessment:** `PASS` — the record coordinates specific dependencies and does not create the overall private `program-planning` artifact or require private `stakeholder-governance`.
- **remaining admission risk:** `LOW` — final review should confirm that sequencing and handoffs do not over-specify the general relationship.
- **revision status:** `REVISED_PENDING_FINAL_REVIEW`

## Targeted revision 3 — Program Manager / Risk and Controls

- **roleFamilyId:** `program-manager`
- **capabilityId:** `risk-controls`
- **relationship category:** `shouldHave`
- **importance:** `should`
- **minimumProofLevel:** `demonstrated`
- **original candidate expectedEvidence:** “Identified a defined program risk, implemented or operated a control, and documented how the control changed the risk exposure.”
- **independent defect class:** `PROOF_LEVEL_INFLATION; OUTCOME_REQUIREMENT_INFLATION`
- **revised candidate expectedEvidence:** “Identified a defined program risk, implemented or operated a control, and documented the control activity.”
- **exact change made:** Replaced the requirement to document changed risk exposure with documentation of the control activity itself.
- **why the revision resolves the defect:** The evidence still requires observable control implementation or operation but no longer requires proof of control effectiveness or changed exposure.
- **proof-level fidelity assessment:** `PASS` — the wording now matches `demonstrated` execution.
- **scale/domain neutrality assessment:** `PASS`.
- **action requirement assessment:** `PASS` — risk identification and concrete control action remain mandatory.
- **outcome requirement assessment:** `PASS` — no risk-reduction or exposure-change outcome is required.
- **private-boundary assessment:** `PASS` — the candidate does not absorb private `program-planning` or `stakeholder-governance` and remains distinct from dependency coordination.
- **remaining admission risk:** `LOW` — final review should confirm that documenting the control activity is sufficient observable evidence without becoming generic status reporting.
- **revision status:** `REVISED_PENDING_FINAL_REVIEW`

## Targeted revision 4 — Education Program Lead / Education Delivery

- **roleFamilyId:** `education-program-lead`
- **capabilityId:** `education-delivery`
- **relationship category:** `mustHave`
- **importance:** `must`
- **minimumProofLevel:** `demonstrated`
- **original candidate expectedEvidence:** “Delivered or facilitated an education session or program, adapting the delivery method in response to participant engagement or delivery conditions.”
- **independent defect class:** `ACTION_INFLATION; PRIVATE_BOUNDARY_PARTIAL_ABSORPTION`
- **revised candidate expectedEvidence:** “Delivered or facilitated an education session or program.”
- **exact change made:** Removed the mandatory adaptation of the delivery method and added no replacement behaviour.
- **why the revision resolves the defect:** Actual delivery or facilitation is sufficient demonstrated evidence; the candidate no longer imports method/design behaviour adjacent to private `learning-design`.
- **proof-level fidelity assessment:** `PASS` — demonstrated execution is required without an owned learner outcome.
- **scale/domain neutrality assessment:** `PASS`.
- **action requirement assessment:** `PASS` — only actual delivery or facilitation remains.
- **outcome requirement assessment:** `PASS` — no learner result or optimisation outcome is required.
- **private-boundary assessment:** `PASS` — private `learning-design` and `learner-outcomes` remain outside the evidence requirement.
- **remaining admission risk:** `LOW` — final review should confirm that the concise observable action is sufficiently specific and not merely label restatement.
- **revision status:** `REVISED_PENDING_FINAL_REVIEW`

## Defect-resolution matrix

| Target | Admitted defect | Exact correction | Defect removed | New defect introduced |
|---|---|---|---|---|
| fpa-manager / variance-analysis | UNSOURCED_THRESHOLD_INJECTION | Removed “material” | YES | NONE |
| program-manager / dependency-management | ACTION_INFLATION | Removed mandatory issue occurrence/handling | YES | NONE |
| program-manager / risk-controls | PROOF_LEVEL_INFLATION; OUTCOME_REQUIREMENT_INFLATION | Replaced exposure-change outcome with control-activity documentation | YES | NONE |
| education-program-lead / education-delivery | ACTION_INFLATION; PRIVATE_BOUNDARY_PARTIAL_ABSORPTION | Removed adaptive-delivery condition | YES | NONE |

Defects remaining after targeted revision:

- `PROOF_LEVEL_INFLATION`: 0
- `OUTCOME_REQUIREMENT_INFLATION`: 0
- `ACTION_INFLATION`: 0
- `UNSOURCED_THRESHOLD_INJECTION`: 0
- `UNSOURCED_SCALE_OR_SEGMENT_INJECTION`: 0
- `PRIVATE_BOUNDARY_COLLAPSE`: 0
- `ROLE_DOMAIN_OVERCONSTRAINT`: 0
- `SIBLING_COLLAPSE`: 0
- New defect classes introduced: `NONE`

## Cross-pair recheck

- **Frozen Forecasting vs revised Variance Analysis:** `CLEARLY_DISTINCT` — Forecasting produces a forward-looking estimate used in a decision; Variance Analysis compares actual performance with an existing plan and explains drivers.
- **Revised Dependency Management vs revised Risk and Controls:** `CLEARLY_DISTINCT` — dependency sequence and handoffs remain distinct from a control implemented or operated against a defined risk.
- **Revised Education Delivery vs frozen Education Partnerships:** `CLEARLY_DISTINCT` — delivering/facilitating the learning experience remains distinct from coordinating an education partner’s contribution.

No frozen admission wording was reopened.

## Private-boundary recheck

| Revised target | Private context | Result |
|---|---|---|
| variance-analysis | financial-planning | CLEARLY_SEPARATE |
| variance-analysis | executive-reporting | CLEARLY_SEPARATE |
| dependency-management | program-planning | CLEARLY_SEPARATE |
| dependency-management | stakeholder-governance | CLEARLY_SEPARATE |
| risk-controls | program-planning | CLEARLY_SEPARATE |
| risk-controls | stakeholder-governance | CLEARLY_SEPARATE |
| education-delivery | learning-design | CLEARLY_SEPARATE |
| education-delivery | learner-outcomes | CLEARLY_SEPARATE |

Private IDs promoted, renamed, remapped, or reclassified: 0.

## Targeted revision validator

| Target | Relationship exists | Correct role/ID | Category | Importance | Proof | Defect removed | No new defect | Observable | Non-boilerplate | No private promotion | No scale | No threshold | No outcome inflation | No action inflation | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| fpa-manager / variance-analysis | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| program-manager / dependency-management | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| program-manager / risk-controls | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| education-program-lead / education-delivery | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

`REVISION_VALIDATOR_PASS_COUNT`: 4

## Final revision-review manifest

| State | Role | Capability | expectedEvidence source |
|---|---|---|---|
| FROZEN_ADMISSION_CANDIDATE | fpa-manager | forecasting | Frozen original candidate |
| REVISED_PENDING_FINAL_REVIEW | fpa-manager | variance-analysis | Targeted revision 1 |
| REVISED_PENDING_FINAL_REVIEW | program-manager | dependency-management | Targeted revision 2 |
| REVISED_PENDING_FINAL_REVIEW | program-manager | risk-controls | Targeted revision 3 |
| REVISED_PENDING_FINAL_REVIEW | education-program-lead | education-delivery | Targeted revision 4 |
| FROZEN_ADMISSION_CANDIDATE | education-program-lead | education-partnerships | Frozen original candidate |

Total candidate state: exactly 2 frozen admissions plus 4 revisions pending final independent review. No seventh candidate exists. No Role Knowledge source write is authorized by this artifact.
