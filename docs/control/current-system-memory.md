# Current System Memory

Status
- authority
- accepted current-system truth surface
- read after `docs/control/current-active-brief.md` for substantial work

Default Read
- yes

When To Read
- after the startup brief on substantial audit / repair / architecture / policy work
- before any major accepted-truth update is treated as closed

Do Not Use For
- current next-action routing
- long historical replay
- full line-plan replacement
- full runbook execution detail

Document role
This file is the authoritative accepted current-system memory/control snapshot.
It records the system truths future work should assume by default.
It does not replace:
- `docs/control/current-active-brief.md` for startup routing
- `docs/control/em-operating-system.md` for execution procedure
- `docs/control/policy-registry.md` for policy lookup and precedence
- active line plans for line-local operational detail
- verify strategy docs for verification-level selection

Use with:
- `AGENTS.md`
- `docs/control/em-operating-system.md`
- `docs/control/policy-registry.md`
- active line plan(s)

Last updated: 2026-07-31

---

## 1. Current architecture truth

### Truth layer
- Career Memory / Evidence is the truth layer.
- CV is a bootstrap evidence source, not the truth layer.

### Terminology boundary
- Keep three buckets distinct:
  1. truth layer
  2. tailored CV consumer path (evidence-to-tailored-CV output path)
  3. implementation surface
- `resume-*` naming is implementation-local only and must not redefine architecture.

### Job Copilot layer ownership (current control model)
- Layer 1: LLM-led role reading plus thin-guard contract control.
- Layer 2: authoritative contract transport.
- Layer 3: proof and output grounding.
- Layer 4: consumer rendering and presentation.

### Downstream-consumption boundary
- Downstream consumer surfaces must consume the authoritative contract.
- Do not hide matcher/selection logic in UI or adapter wording layers.

### Product framing
- Job Copilot should operate as a buy-side decision system, not a generic relevance-summary generator.

### Career Map / Job Copilot product boundary
- Career Map is candidate-first and generic. It owns the role-independent candidate capability profile, stable generic role archetypes, and general career-path guidance.
- Job Copilot is live-JD first and company-specific. It owns requirement-weighted Match V2 analysis and job-specific gaps, positioning, and recommendations.
- Match V2, live-JD parsing, and company-specific scoring must not move into Career Map.

### Career Map current closure (`CAREER_MAP_CALIBRATED_ROLE_LENS_CATALOG_COMPLETE`)

Current active line and mode:
- line: `CAREER-MAP-CALIBRATED-ROLE-LENS-CATALOG`
- mode: `HOLD`
- task type: post-repair closure / next-product-priority selection
- implementation commit: `9ae0480ca85098ad657afb203e6fe8a2d4643b8a`

Completed calibrated Role Lens catalog gate:
- The active Career Map route consumes `representativeGenericRoleProfiles` directly as its user-facing Role Lens catalog.
- Exactly four calibrated generic role lenses are exposed in deterministic order: Analytics Manager, Customer Insights Lead, Marketing Analytics Lead, and Data Product Manager.
- The combined 22-profile development collection and all 18 development seed profiles remain intact for development and test consumers; the active route no longer presents those seeds as equivalent product choices.
- No runtime filtering or `sourceNotes` parsing determines catalog admission.
- Selector copy describes the lenses as currently available directional generic archetypes and explicitly avoids exhaustive-coverage or external-certification claims.
- Target-role comparison outcomes, requirement order, `Proof to build`, and `Start here` behavior remain unchanged.
- No score, fit, suitability, readiness, recommendation, live-JD, or Match V2 concept was introduced.
- The focused archetype test, all 26 Career Possibility tests, targeted ESLint, TypeScript, production build, and `git diff --check` passed.
- Browser QA passed the full synthetic resume intake flow and all four retained-role selections at 1440x900, 768x1024, and 390x844 with no overflow, clipping, React/hydration/console warnings, or API, Supabase, authentication, telemetry, or persistence requests.
- No completed ingestion, identity, revision, adapter, runtime, persistence, server, generic-path, or Job Copilot architecture was reopened.

Single next action:
- Hold the calibrated Role Lens catalog and select the next user-facing Career Map product priority before further implementation.

Completed prioritised next-proof guidance:
- The personal target-role comparison owns an optional authoritative `nextProofToBuild` projection.
- Eligible candidates are limited to `evidence_not_yet_shown` requirements with nonblank authored `expectedEvidence`; direct, transferable, governance-deferred, and governance-excluded requirements cannot be selected.
- Selection priority is `must` -> `should` -> `differentiator`; existing requirement order is the only same-importance tie-breaker.
- The Career Map Role Lens renders at most one restrained `Start here` block above the unchanged complete requirement list.
- The block carries the canonical capability label, a bounded importance-based reason, and exact existing authored proof guidance.
- Blank or absent guidance is skipped; when no eligible candidate exists, no empty block or fabricated fallback appears.
- No score, fit, suitability, readiness, generated coaching, role ranking, or new inference was introduced.
- Requirement output, order, outcome classification, existing evidence disclosures, and per-card `Proof to build` guidance remain unchanged.
- All 26 Career Possibility tests, targeted ESLint, TypeScript, production build, and `git diff --check` passed.
- Browser QA passed the synthetic résumé intake -> extraction -> evidence review -> canonical mapping -> Apply to Career Map -> target-role selection flow.
- Browser QA passed at 1440×900, 768×1024, and 390×844, including role switching and no-eligible-candidate behavior, with no overflow, clipping, React/hydration/console warnings, or API, Supabase, authentication, or telemetry requests.
- No completed ingestion, identity, revision, adapter, runtime, persistence, server, generic-path, or Job Copilot architecture was reopened.

Completed Proof to build guidance:
- The personal target-role comparison now transports the generic role profile's exact authored `expectedEvidence` only when the outcome is `evidence_not_yet_shown` and the guidance is non-empty.
- The Career Map Role Lens renders that transported text as a bounded `Proof to build` block nested within the applicable requirement.
- No guidance is generated or inferred from capability labels; absent authored guidance produces no block.
- Directly demonstrated, transferable, governance-deferred, and governance-excluded results retain their prior classification and presentation behavior.
- Requirement ordering, role ranking, capability strength, and evidence classification are unchanged; no score, suitability verdict, live-JD input, or Match V2 dependency was introduced.
- All 26 Career Possibility tests, targeted ESLint, TypeScript, production build, and `git diff --check` passed.
- Browser QA passed the synthetic résumé intake → extraction → evidence review → Apply to Career Map → target-role selection flow.
- Browser QA also passed at 1440×900, 768×1024, and 390×844 with no horizontal overflow, clipping, React/hydration/console warnings, or API, Supabase, or authentication requests.
- No ingestion, identity, revision, adapter, runtime, persistence, server, or Job Copilot architecture was reopened.

Completed foundations:
- `CandidateBaseline` is the shared, role-independent candidate-side capability kernel.
- Generic Role Archetypes are stable generic target-role definitions; they do not import live-JD or Match V2 semantics.
- `GenericCareerPathAlignment` and `PersonalGenericPathPresentation` consume the shared candidate and generic-role foundations.
- The evidence-universe reconciliation contract and `SharedCareerIngestionBundle` authority boundary are implemented.
- Employment-linked résumé evidence extraction, source revision, source identity manifest, stable review decision/proposal/mapping identities, and history-aware review revision are implemented.
- `SharedCareerIngestionBundle` schema `1.1.0` review fidelity, the browser résumé shared-ingestion adapter, and browser shared-ingestion runtime wiring are implemented, admitted, committed, and pushed.

Authoritative ingestion chain:
```text
canonical résumé source
→ buildCareerSourceRevision()
→ résumé extraction
→ buildCareerSourceIdentityManifest()
→ buildCareerReviewDecisionIdentityContract()
→ buildCareerReviewRevision()
→ buildSharedCareerIngestionBundleFromResumeReview()
→ buildSharedCareerIngestionBundle()
→ SharedCareerIngestionBundle 1.1.0
```

Browser runtime chain:
```text
résumé paste
→ extraction
→ evidence review
→ applyToCareerMap()
→ buildBrowserResumeSharedIngestionRuntime()
→ buildSharedCareerIngestionBundleFromResumeReview()
→ admitted SharedCareerIngestionBundle 1.1.0
→ component-local ready / failed state
```

Identity and revision separation:
- Keep `sourceRevision`, `extractionRevision`, source identity manifest revision, `bundleId`, subject identity, review decision identities, `reviewRevision`, and `materializationRevision` distinct.
- Anonymous subject identity must not derive from résumé content.
- Bundle identity must not derive from review/intake session IDs.
- Local browser IDs must be translated before authoritative admission.

Privacy boundary:
- Raw résumé text, raw edits, and rationale do not enter the authoritative shared bundle.
- Browser shared-ingestion state remains component-local and memory-only.

Browser adapter and runtime admission:
- The browser adapter truthfully translates reviewed browser evidence into the authoritative shared-ingestion contract.
- Runtime wiring reaches the adapter from the existing review completion action and exposes bounded component-local ready/failed state.
- No API, Supabase, authentication, persistence, or server materialization surface was introduced.

Accepted browser QA:
- `/career-map/resume-intake` extracted one employment and two evidence records.
- The no-edit flow, explicit canonical mapping, and Apply to Career Map flow succeeded.
- `Career evidence bundle ready` appeared through `role="status"` with bounded employment/evidence counts.
- Desktop, tablet, and mobile layouts had no overflow or clipping.
- No React, hydration, or console errors occurred; no API, Supabase, auth, or materialization request was introduced.
- Start over and refresh behaved as expected.

Completed evidence-field transition repair:
- Commit `b9746c9d5ddecdc105cdc4cb6c37bba511ba4b29` (`fix(career): allow valid evidence field edits`) is accepted.
- Absent evidence fields have effective initial status `unreviewed`; valid populated-field and absent optional-field first edits are admitted.
- Confirm → edit passes; edit → edit passes only with latest prior-decision linkage.
- Reject → edit remains blocked until restore; reject → restore → edit passes.
- Stale, unknown, and cross-target prior protections remain intact, as do unsupported-field and parent-rejection protections.
- Browser edit/save no longer fails with active `stale_review_status`; Apply reaches the shared-ingestion runtime.
- A missing semantic edit revision surfaces as `missing_semantic_payload_revision`; failed state remains inline and retryable, and review state remains intact.
- The successful no-edit flow still produces `Career evidence bundle ready`.
- All 26 Career Possibility tests, targeted ESLint, TypeScript, and production build passed.
- Browser QA passed at 1440×900, 768×1024, and 390×844 with no console errors and no API, Supabase, or authentication requests.
- No adapter/runtime architecture, identity/revision contract, or shared-bundle contract changed.
- The prior evidence-field review replay/status-validation defect is closed; this line has no remaining active defect.

Single main next action:
- Hold the completed prioritised next-proof guidance and select the next user-facing Career Map product priority before further implementation.

Explicit non-reopen boundaries:
- Do not reopen the source revision producer, source identity manifest, review decision identity contract, review revision producer, `SharedCareerIngestionBundle` contract, browser shared-ingestion adapter, or browser shared-ingestion runtime architecture.
- Do not expand this line into `CandidateBaseline` materialization, persistence/local-storage redesign, server materialization, Supabase, authentication, multi-document support, anonymous-subject persistence, automatic semantic edit hashing, Job Copilot, Career Map visual redesign, Impeccable work, or package manifests.

Accepted non-blocking limitations:
- Bundle and anonymous subject identities remain memory-only across reload.
- Semantic edit payload revisions remain caller supplied.
- Multi-document ingestion is not supported.
- No persistence or server materialization exists.
- Anonymous-subject persistence is not implemented.
- These limitations are not mandatory next work.

---

## 2. EM / harness operating truth

- EM is the default governance path for substantial audit, repair admission, repair validation, and line judgment work.
- Covered scopes should use real subagent dispatch by default.
- Direct execution on covered scope requires explicit bypass reason (`out_of_scope`, `no_matching_subagent`, or `policy_permitted_direct`).
- HOLD is repair-block only; when the next step is executable audit work, continuation remains allowed.
- Post-block continuation rule: if repair is blocked, continue executable higher-order family-judgment/audit work by default instead of stopping.
- Use founder-boundary discipline:
  - local-loop autonomy for line-local policy-authorized continuation
  - explicit founder boundary for baseline admission, freeze-ready, and cross-line scope resets
- Root-cause-first discipline is mandatory:
  - identify first drift point
  - identify first writable fault
  - do not jump to implementation before writable-fault stability

---

## 3. Job Copilot North Star truth

The shared buy-side thesis must stay coherent across:
- Career Verdict
- Why You
- Biggest Risk
- Quick Checks
- CTA

Operating quality rules:
- confidence discipline: confidence posture must match evidence strength
- primary buy-point priority: primary buy-point stays first; secondary points stay secondary
- claim-strength calibration: no over-claim from weak or bridge evidence
- cross-surface consistency: one thesis chain across all surfaces
- fit honesty: do not over-claim fit

Locked synthesis invariant:
- user-facing section synthesis is case-local + family-safe
- no phrase may appear unless supported by current-case source signals
- applies to Career Verdict, For you, Why You thesis, Biggest Risk, Quick Checks, CTA, and What This Role Adds
- this does not hard-lock the full evidence pool by role family; evidence may remain broad
- if family-safety fails, drop the phrase or use a neutral case-local fallback

---

## 4. Job Copilot rubric status

- Buy-side Decision North Star policy is landed.
- Job Copilot Buy-side North Star Rubric is landed (audit output schema).
- For future substantial Job Copilot audits/reviews touching decision-quality surfaces, use this rubric by default under EM/harness constraints.
- Rubric usage does not bypass repair gates, stop conditions, or founder-boundary rules.

---

## 5. Current accepted line truths

### P0-027 accepted truth
Source of truth: `docs/lines/cv/line-plan.md` (latest loop entry and branch structure).

- `QUEUE-P0-027` is split into Branch A and Branch B.
- Branch B is tracked as contrast residual only.
- Branch A is active and upstream in stage1 selected-evidence suppression.
- Branch A moved into the Job Copilot selector path in `selectEvidenceForScenario`.
- Branch A is split into A1 and A2.
- A2 remains parked/tracked.
- A1 is split into:
  - A1a: selection-limit accounting path
  - A1b: manual quick-check alignment guard path
- Repair remains blocked pending stable single micro-fault owner.

### Quick Checks accepted regroup truth
Latest accepted Quick Checks regroup outcome:
- Unified Quick Checks contract line is closed as `split-defects`.
- Evidence at unified-line level remains split:
  - `4/8` unresolved buy-point / risk linkage no-prompt failures
  - `4/8` generic materialized prompt failures
  - `0/8` meaningful answer impact
- No single repair owner is admissible at unified Quick Checks contract-line level.

Current line structure:
- Unified line parked: yes
- Child lines opened:
  - `JOB-COPILOT-NS-QUICK-CHECKS-LINKAGE`
  - `JOB-COPILOT-NS-QUICK-CHECKS-GENERIC`

Current child-line state:
- `JOB-COPILOT-NS-QUICK-CHECKS-LINKAGE`
  - now parked after bounded line-value judgment
  - reason: stable suppression-family owner, but submode-level owner remains fragmented/unproven
  - repair remains blocked; no singleton has sufficient leverage to keep active
- `JOB-COPILOT-NS-QUICK-CHECKS-GENERIC`
  - admitted bounded repair for first writable fault `pair_call_contract_information_loss` is landed and accepted
  - bounded validation confirms payload carry-through improvement and removal of template-scaffold over-reuse as dominant owner family
  - no regressions detected; local daily verify passed
  - residual limitation remains: answers still do not materially update decision surfaces
  - `JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-ANSWER-LINKAGE` stability tracing is now classified as low-leverage for further narrowing
    - owner-case single-path stability sample (`job-03`) showed no stable downstream field changes (`score_delta_nonzero=0/5`, `band_changed=0/5`, `cta_changed=0/5`)
  - residual is promoted to downstream child line `JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE` as the active line (`AUDIT`)
  - current first drift for this downstream residual: `stage_downstream_decision_update_surface_unstable`
  - repair remains blocked pending first writable micro-surface isolation (current candidate surface `job-copilot-service.ts:4486-4847`)
- `QC-A`
  - parked as fragmented residuals with low expected repair leverage
- `QC-B`
  - closed locally as keep-with-known-limitation

Current operating interpretation:
- Do not reopen the unified Quick Checks contract line as if it were a single repair surface.
- Treat Quick Checks as split child lines unless later evidence proves a unified stable owner.
- When reopening Quick Checks work, prefer the explicit child-line framing over residual prompt-only framing.

### Why You evidence-card specificity closure truth (2026-04-20)
Accepted scope closure:
- Why You evidence specificity line is closed as `KEEP` for current scope.
- Remaining work is optional low-priority formatting polish only (headline compression/length), not structural owner reopening.

Kept repair stack:
1. Dominant-context guard comparison-space repair:
   - requirement/cluster bridge first, axis bridge second, raw token fallback
   - false-zero dominant coverage issue removed
2. Authoritative Why You card transport/consumption:
   - backend emits `diagnostics.selection_debug.authoritative_selection.why_you_cards[]`
   - renderer consumes authoritative cards when present, with legacy fallback only when absent
3. Authoritative card copy quality repair:
   - evidence-text-first headline/proof phrasing
   - taxonomy/debug token sanitization
   - semantic headline dedupe

Current guardrail truth:
- Why You cards are authoritative selected-evidence cards.
- Required path: `selected evidence -> authoritative why_you_cards -> renderer consumer-only`.
- Do not let renderer reselect, relabel, or concept-extract Why You cards when authoritative cards exist.
- Do not reopen dominant-context guard owner, contract architecture, or renderer derivation without a new regression artifact.

### Avetta Why You / overlay closure truth (2026-05-12)
- Avetta line is closed as `PASS / HOLD`; no new repair admission.
- Closure artifact: `artifacts/job-copilot-post-repair-avetta-slot-level-qa-confirmation.2026-05-12T15-06-43-628Z.json`.
- Current Avetta overlay hash: `81e74e92dafeaae200bb883d`.
- Current Avetta requirement order: reporting -> analytics strategy -> team leadership.
- Slot0 reporting target remains intentionally omitted for `no_qualified_proof_for_mapped_target` with no-proof routing to Biggest Risk / Quick Checks / Role Adds.
- Secondary-card omitted-requirement claim guard is active; reporting overclaim remains blocked.
- Root-cause chain fixed/guarded in order:
  1. Layer 1 overlay freeze/reuse
  2. candidate replacement workflow
  3. KEEP-gate quality threshold
  4. KEEP-gate root-issue positive path
  5. failure-feedback candidate generation
  6. apply-KEEP candidate pinning
  7. Layer 3 omitted-requirement secondary-card claim guard
- Non-goals preserved: no Avetta hardcode, no forced slot0 fill, no renderer masking, no CV patch, no candidate-evidence use in Layer 1 ordering/replacement decisions.
- Operating posture: monitor-only; reopen only on repeated broad-slot0 regression or omitted-requirement overclaim recurrence.

### Tailored CV flow closure truth (2026-05-15)
- Tailored CV + Quick Check proof-confirmation closure is accepted as `PASS / HOLD`.
- Closure artifact: `artifacts/job-copilot-tailored-cv-download-final-browser-confirmation.2026-05-15T00-41-51-752Z.json`.
- Confirmed role identifiers:
  - `job_snapshot_id=17097`
  - `interaction_id=856`
  - `job_id=bbd933e6-018e-4ca6-92eb-92ea22e67d58`
  - `job_match_id=null`
- Closed lines:
  1. Quick Check fallback no-op render
  2. CTA low-priority/deprioritize misclassification
  3. Quick Check save current-role proof confirmation
  4. Tailored CV contract/hash transport
  5. no-proof diagnostics transport
  6. final `/download-resume` click path
- Final runtime confirmation:
  - READY TO APPLY path reached
  - background received `SIDEPANEL_DOWNLOAD_RESUME`
  - download service executed
  - `/api/job-copilot/extension/download-resume` returned `200` (`ok=true`, `applied_recorded=true`)
  - CV file produced (`state=complete`, `mime=text/plain`)
  - no new fail-close reason
  - `missing_no_proof_slot_diagnostics` no longer present
- Remaining non-blocking issue (separate line):
  - `/resume-outcome` telemetry `500` due missing `public.resume_copilot_outcome_events` table
- Recommended follow-on line:
  - `resume_outcome_telemetry_fail_open_repair` (alternative: broader post-closure smoke)

---

## 6. Stable working rules

- Do not jump to fixes before root cause is identified.
- Do not reopen parked lines casually.
- Do not let implementation naming redefine architecture.
- Use proportional verification.
- Prefer outcome-led, harness-constrained work.

---

## 7. Memory-sync enforcement rules

- This file is the default current-truth sync surface for major accepted design and operating-state updates.
- Major-change trigger (memory sync required): any accepted change to:
  - architecture truth
  - layer owner or authoritative-contract truth
  - active line structure (split / merge / park / reopen / new active branch)
  - North Star, rubric, or quality-direction truth
  - EM / harness / subagent / continuation policy
  - terminology boundary
  - freeze, baseline, or phase-close truth
  - any accepted new current truth future work should assume by default
- Pre-work gate: before substantial audit / repair / architecture / policy work, check whether this file is current; if stale, update it first or in the same patch.
- Loop-closure rule: if major system truth changed but this file was not updated, treat the loop as not fully closed.
- Accountability field rule for major judgments:
  - `memory_sync_required: yes|no`
  - `memory_sync_targets: [ ... ]`

---

## 8. Startup boundary reminder

Startup entrypoint:
- `docs/control/current-active-brief.md`

For substantial work, read this file after the startup brief to recover accepted system truth.

Recommended startup sequence:
1. `docs/control/current-active-brief.md`
2. `docs/control/current-system-memory.md`
3. targeted `docs/control/em-operating-system.md` sections only if required by task type
4. targeted `docs/control/policy-registry.md` entries only if required by task type or policy conflict
5. latest active line-plan entry only for the active line

Do not treat this file as the current next-action router.
Use it to recover accepted architecture, governance, North Star, and line-truth state.
