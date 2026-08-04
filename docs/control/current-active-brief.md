# Current Active Brief

Status
- authority
- low-token startup brief
- read this first in every new window before substantial work

Default Read
- yes

When To Read
- every substantial continuation
- every new Codex / ChatGPT work window
- before audit / repair admission / bounded repair / verify / line judgment

Do Not Use For
- long historical replay
- full policy lookup
- full architecture explanation
- full verification mechanics

Purpose
This is the single startup entrypoint for current work.
It is not the full accepted system truth.
It is not the full runbook.
It tells the worker:
- what line is active
- what mode we are in
- what the one main next action is
- what must not be forgotten
- what to read next only if needed

---

## 1. Startup protocol

Default startup order:
1. `docs/control/current-active-brief.md`
2. `docs/control/current-system-memory.md`
3. targeted sections from `docs/control/em-operating-system.md` only if required by task type
4. targeted entries from `docs/control/policy-registry.md` only if required by task type or policy conflict
5. latest active line-plan entry only for the active line

Do not load the heavy control/history stack by default.

Expand to heavy mode only if one of these is true:
- mode transition to `REPAIR` or `MEASURE`
- founder-boundary / cross-line routing decision
- baseline / freeze / regroup / phase-close decision
- policy conflict
- unstable writable-fault diagnosis requiring broader context

Default do-not-read in light mode:
- full historical artifacts
- full policy registry
- full verification mechanics
- archived summaries
- non-active line plans

---

## 2. Current active line

Primary active line:
- `CAREER-MAP-V1-RELEASE`

Current mode:
- `HOLD`

Current task type:
- real-CV ingestion diagnostic closure / repair admission

Current active question:
- Can one bounded signal-policy coverage expansion improve realistic résumé classification without widening mapping or capability truth?

Completed Career Map milestone:
- `CAREERTWIN_REAL_CV_INGESTION_DIAGNOSTIC_COMPLETE`
- `CAREERTWIN_DIRECT_UPLOAD_BUILD_SLICE_3_COMPLETE`
- `CAREERTWIN_PROVISIONAL_BUILD_ORCHESTRATION_COMPLETE`
- `CAREERTWIN_EVIDENCE_SIGNAL_BRIDGE_COMPLETE`
- `CAREERTWIN_PROVISIONAL_STATE_SLICE_2B_COMPLETE`
- `CAREERTWIN_PROVISIONAL_MAPPING_SLICE_2A_COMPLETE`
- `CAREERTWIN_LOCAL_CV_EXTRACTION_SLICE_1_COMPLETE`
- `CAREER_MAP_V1_COMPLETE`
- `CAREER_MAP_V1_LANDING_STATE_HANDOFF_REPAIRED`
- `CAREERTWIN_V1_ROOT_INLINE_INTAKE_COMPLETE`
- `CAREERTWIN_V1_ENTRY_RESULT_ROUTES_CORRECTED`
- accepted architecture: Model A (`browser-local CV parse -> provisional map -> optional review later`); Slice 2 is split into 2A (provisional mapping authority) and 2B (LocalCareerMapState v2 plus materialization)
- Slice 2A is implemented at `6066027` (`feat(career): add provisional capability mapping contract`) with contract/policy version `1.0.0`, five authored rules covering four canonical capabilities, and deterministic IDs derived without timestamps or randomness
- Slice 2A auto-admits only one exact authored structured-signal match; it keeps `direct_evidence` distinct from `transferable_signal`, routes conflicts and invalid inputs to `unresolved`, and returns no-rule cases as `unsupported`
- the focused audit confirms direct, transferable, ambiguous, unsupported, deterministic-ID, title/tool-independence, malformed-policy, malformed-evidence, and forbidden-dependency behavior
- Slice 2B is implemented at `94d8aa1` (`feat(career): add provisional career map state`): schema `2.0.0` separates `source=provisional_resume` from `mapTrustStatus=provisional`, while validated schema `1.0.0` reviewed states remain readable without rewrite
- the authoritative storage key remains `careertwin.local-career-map.v1`; both schemas dispatch by payload version, validate fully before serialization, and use one atomic `setItem` without clearing the prior state
- the versioned provisional materializer admits only Slice 2A `auto_admitted` mappings, groups direct and transferable references separately, retains unresolved/unsupported evidence inactive, derives deterministic lineage identity, and fails closed with zero capabilities
- pure presentation and Role Lens contracts expose provisional trust, accurate reviewed/provisional/unresolved counts, and `Not evidenced in your current CV-derived map.` semantics; existing `find_existing_proof` uncertainty remains authoritative
- Slice 3 remains unopened: no root upload, loading state, route/UI presentation, review control, or supplementation work was introduced
- the first Slice 3 admission stopped correctly at `BOUNDARY_FAILURE`: source-preserving résumé evidence did not yet contain the authored structured tokens required by Slice 2A, and root orchestration was not allowed to hide semantic interpretation
- the deterministic evidence-signal bridge is implemented at `ec94772` (`feat(career): add deterministic evidence signal bridge`) with contract/policy `1.0.0`, nine bounded tokens, and ten authored lexical rules including a non-emitting participation guard
- the bridge preserves evidence identity, source locator, excerpt, and `unreviewed` status; it creates no capability or mapping IDs and performs no UI, state, storage, network, LLM, embedding, or fuzzy work
- direct, transferable, insight-synthesis, cross-functional-delivery, and process-improvement fixtures flow directly into Slice 2A; competing action/ownership signals remain unresolved and uncovered evidence remains unsupported
- Slice 3 remains unopened pending a bounded full-chain orchestration audit
- the pure text-to-provisional-state orchestrator is implemented at `0968e70` (`feat(career): compose provisional career map build`), composing the existing extractor, signal bridge, Slice 2A mapper, and Slice 2B materializer without new semantic rules
- its structural adapter retains bridge ambiguity as inactive unresolved evidence and uncovered evidence as inactive unsupported evidence; it creates no fallback mapping, capability, review promotion, storage access, network call, or UI dependency
- the nine-fixture audit passed direct, mixed, transferable, admitted-plus-unsupported, admitted-plus-ambiguous, all-unsupported, all-ambiguous, title-only, and tool-only paths with `unexpectedly lost evidence = 0`
- deterministic valid schema `2.0.0` provisional state is now proven from extracted text; Slice 3 is admitted but not started
- browser-local PDF and DOCX extraction is admitted through `pdf-parse@2.4.5` and `mammoth@1.11.0`; PDF uses a same-origin bundled PDF.js worker, scanned/image-only PDFs are unsupported, and no OCR is introduced
- raw binary and extracted full text remain page-memory only; the extractor performs no fetch, API, Supabase, persistence, telemetry, or logging
- deterministic failures cover unsupported/mismatched types, empty/oversized files, protected or no-text PDFs, malformed documents, unavailable parsers, and bounded unexpected failures
- persistent-Chrome real-browser validation passed valid PDF and DOCX extraction with localhost-only bundle/worker requests, no `/api/parse-resume` or Supabase traffic, unchanged localStorage, empty IndexedDB/Cache Storage, and no runtime errors
- implementation commit: `ca573a2` (`feat(career): add browser-local CV text extraction`)
- Slice 3 is implemented at `ed1ac57` (`feat(career): add direct CV to career map flow`): `/` now combines a contained interactive example with one immediate PDF/DOCX upload action; local extraction composes into validated provisional state, one atomic browser-local write, and direct `/career-map` navigation.
- Persistent-CDP acceptance passed valid synthetic PDF and DOCX, both visible loading states, v2 provisional rendering, failure preservation, replacement semantics, responsive layouts, localhost-only traffic, and absence of service workers or Cache Storage.
- Slice 4 optional review and missing-experience interactions remain unopened.
- next action: Admit one bounded `EVIDENCE_SIGNAL_COVERAGE_EXPANSION` for ordinary résumé action and founder-domain language; do not combine it with structure, mapping, capability-library, parser, or UI repair.
- release-readiness decision: `V1_RELEASE_READY_WITH_KNOWN_LIMITATIONS`
- final verified implementation baseline: `73a976bd67d1360814f893533e5f3812b84473c6`
- founder correction to the prior route misunderstanding: `/` owns product proposition plus résumé entry, while `/career-map` owns only the resulting personal Career Map or a compact no-map state
- root heading is `Your career, replicated.` beside the accepted plain-text intake; `Build my Career Map` submits into the existing extraction/review sequence without a navigation-only CTA
- fresh `/career-map` contains only `No personal Career Map has been created yet.` and one direct `Start with your résumé` action to `/`; it contains no landing hero, example map, capability network, example signals, or mock-ranked Future Paths
- active `/career-map` no longer imports or receives `CapabilityExplorer` or `mockCareerPossibility`; example fixtures remain available only outside the normal V1 journey
- applied `/career-map` remains personal-only with reviewed capabilities/evidence, calibrated Role Lens, comparison, Proof to build, Start here, and Next action
- persistent-CDP screenshots verified root entry, empty result, and applied personal result; the same persistent page passed edit/reject/restore, direct Apply, reload, replacement cancel/confirm, five viewport sizes, keyboard focus, zero overflow, zero console issues, and zero unexpected network requests
- entry/result correction commit: `73a976bd67d1360814f893533e5f3812b84473c6` (`fix(career): separate product entry from career map result`)
- focused route/state tests, all 28 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed
- V1 remains complete and mode returned to HOLD; no third landing/intake page or V2 work was introduced
- founder correction: V1 has two product states, not a passive landing plus separate intake plus Career Map; `/` is the product entry and `/career-map` is the applied personal state
- `/` preserves the side-by-side value proposition and directly embeds the accepted `ResumeTextIntakeWorkspace`; no navigation to another intake form is required before extraction
- the root flow reuses deterministic extraction, evidence inspection, `ResumeEvidenceReviewWorkspace`, shared-ingestion runtime preparation, replacement confirmation, and the authoritative atomic browser-local Career Map write
- successful root Apply now navigates directly to `/career-map`; failed extraction and cancelled replacement preserve the existing personal map
- the fake PDF/DOCX picker and `Frontend prototype`, `No backend connection yet`, and `mock only` copy were removed; V1 exposes only the genuinely supported plain-text path
- an existing personal map produces a direct return link and explicit replace-only disclosure on `/`; no append or supplementation behavior was introduced
- persistent-CDP Chrome validation passed fresh Apply, replacement cancel/confirm, extraction-failure preservation, final personal rendering, keyboard focus, and 1440×900, 1280×800, 768×1024, 390×844, and 375×667 layouts with no overflow, console issue, or unexpected network request
- root inline-intake implementation commit: `0b65bf6bee73acaefb39bdc4b7db15c37b4805af` (`fix(career): unify root intake with career map`)
- all 28 Career Possibility tests, exact-file ESLint, TypeScript, production build, and `git diff --check` passed
- V1 remains complete; the legacy intake route remains compatible but is not part of the authoritative root journey
- founder self-validation identified a missing landing proposition, an implementation-language primary CTA, and stale example presentation after Apply
- root cause: the no-state presentation led with its example panel, while the client workspace reconciled browser-local Career Map state only on initial mount and could retain an absent result when a cached page was reactivated
- the no-state view now leads with `Your career, replicated.`, concise evidence-grounded supporting copy, and `Uncover your career map` linking to the existing résumé intake
- example content remains explicitly disclosed and secondary; the applied personal view excludes the example title, no-evidence message, mock badge, example-signal labels, and mock-ranked Future Paths
- the applied view renders reviewed personal capabilities and evidence plus the calibrated Role Lens, uses explicit replace-only re-import copy, and reconciles state on mount, focus, pageshow, cross-document storage change, and visibility restoration
- corrective implementation commit: `6d64c81c22788bcd7db480c6941ca56d4984fdc5` (`fix(career): restore landing and personal state handoff`)
- focused coverage, all 27 Career Possibility tests, exact-file ESLint, TypeScript, production build, `git diff --check`, full Apply/replacement/recovery QA, and five-viewport browser QA passed
- V1 remains complete; incremental supplementation and all V2 scope remain unopened
- release blocker count after repair and re-audit: `0`
- V1 is frozen as a browser-local, single-source reviewed import with explicit replace-only re-import
- the full intake, extraction, review/edit/reject, mapping, Apply, Career Map, four-role Role Lens, proof guidance, evidence navigation, and return-path journey passed
- blocker repair `6cee2f67a07cd1a852081b8391aadd39f8bc2faf` (`fix(career): admit reviewed field edits at apply`) supplies deterministic opaque semantic payload revisions through the existing browser runtime transport
- all 27 Career Possibility tests, tracked Career Map ESLint, TypeScript, production build, `git diff --check`, replacement/recovery QA, and browser QA at 1440×900, 1280×800, 768×1024, 390×844, and 375×667 passed
- accepted V1 limitations: single source, replace-only re-import, browser-local map, page-memory intake/review, no incremental supplementation, no cross-device/server persistence, four calibrated roles, and no ranking, evidence-quality diagnosis, progress tracking, or generated coaching
- the Model A incremental-supplementation architecture sequence remains V2 planning input only and is not started
- audit decision: the first material dead end was the absence of a visible continuation from reviewed evidence back to the Role Lens
- first drift point: evidence inspection completed but visible task continuity ended
- first writable fault: the Personal Capability Explorer lacked a reciprocal native anchor and the existing Role Lens heading was not programmatically focusable
- implementation commit: `1aacb62697ec21c295bfd3c96ad20d0f4ca67652` (`feat(career): add return path to role lens`)
- implementation boundary: `PersonalCapabilityExplorer.tsx`, `TargetRoleCapabilityComparison.tsx`, and `proof-building-action.test.ts` only
- a standalone proof-building-action authority consumes only valid `nextProofToBuild` and admits only `find_existing_proof`; `no_action_available` remains the deterministic abstention result
- fixed platform copy version `1.0.0` asks the user to look through past work and explicitly says Career Map does not know whether that experience exists
- no strengthen/build/capture action, generated coaching, evidence-quality inference, or project, course, certification, networking, employer, or timeline advice was introduced
- the available proof-lookup action includes exactly one neutral in-page link, `Review evidence already in your Career Map`, targeting `#personal-explorer-heading` in the existing Personal Capability Explorer
- the unique semantic heading uses `tabIndex={-1}` without entering the positive tab order; native fragment navigation, Enter activation, focus placement, and browser Back behavior passed
- the reviewed-evidence surface now includes one neutral `Continue to Role Lens` native anchor targeting `#target-role-heading`; the existing Role Lens heading is uniquely focusable with `tabIndex={-1}`
- return navigation preserves the selected role, comparison, Start here result, and evidence disclosure state; Back/Forward and all four calibrated role switches passed
- unavailable actions render no link; no evidence relevance/matching claim, auto-selection, filtering, sorting, highlighting, or expansion was introduced
- proof-building semantic authority, `nextProofToBuild`, `Start here`, `Proof to build`, comparison behavior, requirement order, role mandate, and evidence disclosures remain unchanged
- all 27 Career Possibility tests, targeted ESLint, TypeScript, production build, and browser QA at 1440×900, 768×1024, and 390×844 passed
- TypeScript and production build verification ran sequentially to avoid the known `.next/types` race
- shared ingestion and runtime failure handling remain complete and closed

Secondary line status:
- the former `JOB-COPILOT-SIDEPANEL-USER-READY-AUDIT` line is historical/non-active context; its user-exposure HOLD remains unchanged
- `JOB-COPILOT-NS-QUICK-CHECKS-LINKAGE` = parked, low-leverage residual
- do not reopen unless new evidence proves a stable writable owner

Avetta closure note (2026-05-12):
- Avetta Why You / overlay line is closed as `PASS / HOLD`.
- Root-cause chain fixed/guarded: Layer 1 overlay freeze/reuse, candidate replacement workflow, KEEP-gate quality threshold, KEEP-gate root-issue positive path, failure-feedback candidate generation, apply-KEEP candidate pinning, and Layer 3 omitted-requirement secondary-card claim guard.
- Current Avetta overlay hash: `81e74e92dafeaae200bb883d`.
- Current requirement order: reporting -> analytics strategy -> team leadership.
- Slot0 reporting remains omitted due no qualified proof and routed to Biggest Risk / Quick Checks / Role Adds.
- Secondary reporting overclaim is blocked; no new repair admission.
- Operating posture: normal monitoring only; do not reopen this line without repeated-pattern regression.

Tailored CV flow closure note (2026-05-15):
- Status: `PASS / HOLD` for `TAILORED_CV_FLOW_CLOSURE_AFTER_FINAL_DOWNLOAD_CONFIRMATION`.
- Final confirmation artifact: `artifacts/job-copilot-tailored-cv-download-final-browser-confirmation.2026-05-15T00-41-51-752Z.json`.
- Confirmed case: `job_snapshot_id=17097`, `interaction_id=856`, `job_id=bbd933e6-018e-4ca6-92eb-92ea22e67d58`, `job_match_id=null`.
- Closed lines:
  - Quick Check fallback no-op render
  - CTA low-priority/deprioritize misclassification
  - Quick Check save current-role proof confirmation
  - Tailored CV contract/hash transport
  - no-proof diagnostics transport
  - final `/download-resume` click path
- Final runtime result:
  - READY TO APPLY path reached
  - `SIDEPANEL_DOWNLOAD_RESUME` received
  - `/api/job-copilot/extension/download-resume` returned `200` with `ok=true`
  - CV file produced in Downloads (`state=complete`, `mime=text/plain`)
  - no `missing_no_proof_slot_diagnostics` fail-close
- Known non-blocking residual:
  - `/resume-outcome` telemetry `500` due missing `public.resume_copilot_outcome_events` table
- Next line recommendation:
  - `resume_outcome_telemetry_fail_open_repair` (or broader post-closure smoke if preferred)

---

## 3. One main next action

Main next action:
- Admit one bounded `EVIDENCE_SIGNAL_COVERAGE_EXPANSION` for ordinary résumé action and founder-domain language; do not combine it with structure, mapping, capability-library, parser, or UI repair.

Not the next action:
- do not treat the closed `stale_review_status` evidence-field defect as active
- do not reopen source revision, source identity, review identity/revision, `SharedCareerIngestionBundle`, browser adapter, or browser runtime architecture
- do not promote persistence, server materialization, multi-document ingestion, automatic semantic edit hashing, Supabase, authentication, or package changes into mandatory next work
- do not expose sidepanel to users now
- do not reopen parked Quick Checks DECISION-UPDATE residual without `fixed_guard_case`
- do not reopen kept repairs by default
- do not force a new active Job Copilot line without new evidence
- do not rerun another full Career Verdict 20-case pass immediately
- do not move sidepanel readiness to `borderline` from Career Verdict freshness alone
- do not re-run same-family ANSWER-LINKAGE stability trace by default
- do not reopen kept CTA precedence repair by default
- do not reopen ingestion as primary owner
- do not reopen kept post-confidence materialization repair by default
- do not reopen kept weak-band injection repair by default
- do not continue CTA-shift-only narrowing as primary path
- do not enter another REPAIR pass before closure judgment is complete
- do not call this loop locally KEEP until guard-only confidence movement is explained or cleared
- do not reopen the repaired risk-materialization micro-surfaces as the next owner by default
- do not treat the current score-path candidate as admitted before a stable owner-vs-guard split appears
- do not use legacy scorepath confidence-only predicate as the default selector for the next reselection pass
- do not move to REPAIR from a single v2 split replay without one repeatability confirmation pass
- do not move to REPAIR before admission review formalizes allowed file / change type / guardrails
- do not broaden into downstream redesign or cross-line scope
- do not enter admission review until v2 two-hit stability gate is satisfied
- do not rerun same v2 predicate + fixed guard `job-18` owner-stability audits without introducing a new variable
- do not switch to another Job Copilot line without new evidence showing higher leverage than the parked DECISION-UPDATE residual
- do not reopen closed Why You evidence-specificity owners (dominant-context comparator, authoritative `why_you_cards` contract path, renderer concept-derivation bypass) without a new regression artifact


---

## 4. Current must-follow rules

- Use EM governance by default.
- Use root-cause-first discipline.
- Do not jump to fixes before first drift and first writable fault are isolated.
- Enforce section synthesis family-safety: user-facing section phrasing must be case-local and supported by current-case signals.
- Treat Quick Checks as split child lines, not one unified repair surface.
- Do not let implementation naming redefine architecture.
- Use proportional verification.
- If major accepted truth changes, memory sync is required.
- Treat Why You cards as authoritative consumer-only cards whenever `authoritative_selection.why_you_cards` is present.

---

## 5. Verification default

Default verify:
- `npm run verify:daily`

Do not use:
- `npm run verify` by default for branch-local iterative work

Upgrade verification only if:
- repair scope or policy explicitly requires higher level
- see `docs/control/verification/verify-strategy.md`

---

## 6. Required next reads by task type

For all substantial tasks after this brief:
- read `docs/control/current-system-memory.md`

Then:

If task = branch-local audit:
- read `docs/control/current-system-memory.md`
- read targeted sections from `docs/control/em-operating-system.md` covering:
  - shared loop states
  - canonical loop stages
  - true stop conditions
  - subagent roles / execution continuation as needed
- read targeted policy entries only if needed

If task = repair admission or bounded repair:
- read `docs/control/current-system-memory.md`
- read targeted sections from `docs/control/em-operating-system.md` covering:
  - repair admission
  - allowed-files rule
  - one-main-next-action rule
  - audit infrastructure continuation
  - true stop conditions
- read targeted policy entries if scope or precedence is unclear

If task = verify / measure:
- read `docs/control/current-system-memory.md`
- read targeted sections from `docs/control/em-operating-system.md` covering:
  - shared loop states
  - canonical loop stages
  - local vs global truth
  - baseline authority
  - measurement cadence
- read `docs/control/verification/verify-strategy.md`
- read `docs/control/verification/verification-loop.md` only if Level 3 / full baseline is actually required
---

## 7. Memory sync reminder

If major accepted truth changes, include:
- `memory_sync_required: yes`
- `memory_sync_targets: [...]`

Update in the same patch when required:
- `docs/control/current-system-memory.md` for accepted system truth changes
- `docs/control/current-active-brief.md` if active line / active mode / recommended next action changes
- backlog / line-plan surfaces if planning status changes

---

## 8. Authority boundary reminder

This file:
- tells you where to start
- tells you what is active now
- tells you what not to forget
- tells you what to read next

This file does not replace:
- `current-system-memory.md` for accepted system truth
- `docs/control/em-operating-system.md` for execution runbook
- `policy-registry.md` for policy precedence
- line plan for line-local operational detail
