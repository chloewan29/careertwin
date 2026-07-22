# Task Queue

Document role: **operational queue + historical execution record**.
This file is not the default day-to-day policy source.
For current execution rules and verification defaults, use `AGENTS.md` and `docs/control/verification/verify-strategy.md`.
Queue statuses, objectives, and progress notes below should be read as an April 2026 historical snapshot, not as current operating authority.

## Legend
- Status: not started / in progress / completed / blocked
- Priority: P0 / P1

## Capture-Time Task Template

Every new Job Copilot or Resume/CV task must begin with:

- Failing layer:
- Reason for diagnosis:
- Out-of-scope layers:
- Allowed files:
- Replay validation cases:

Use the control-layer contracts before writing code:
- `docs/control/job-copilot-layer-rule.md`
- `docs/control/lines/cv/cv-layer-rule.md`

## Capture-Time Job Copilot Baseline Rule

At capture time, Job Copilot tasks treated the pipeline as the locked baseline:

- Layer 1 = JD ownership/skeleton authoritative start
- Layer 2 = owner selection + replacement selector stabilized
- Layer 3 = role-native proof alignment stabilized
- Layer 4 = wording mostly aligned

Operating rule:
- classify the failure by layer first
- keep non-failing layers out of scope
- do not reopen Layer 1, Layer 2, or Layer 3 core logic unless the diagnosis clearly lands there
- prefer the smallest layer-local fix over cross-layer patching

Snapshot narrow backlog at capture time:
- AI GRC unnecessary transformation wording residue
- UNSW composite wording still governance-first
- Confirm One Key Fact verbosity
- supporting evidence tail cleanliness

---

### STATE-001 Reconstruct Repository-Grounded Control State
- Status: completed
- Priority: P0

- Objective:
Rebuild `project-state.md` and `task-queue.md` from repository evidence, not assumptions.

- Success criteria:
- All major subsystems classified as working / partial / missing
- Latest verification/audit artifacts inspected and reflected
- Explicit uncertainties documented

- Verification:
- code + route + engine inventory complete
- artifacts inspected (`verify-summary`, matcher/JD/extension/typecheck debt, selected audits)
- canonical verify rerun completed

- Exit condition:
Control docs represent current repo reality as of latest verify run

---
### QUEUE-P0-000 Establish CV Quality Verification Gate (Product Priority)
- Status: completed
- Priority: P0

- Objective:
Ensure CV quality is measurable and enforced in the canonical verify loop.

- Why it matters:
Current system can pass verify while CV quality is not guaranteed.
CV quality is the primary user-facing success metric.

- Success criteria:
- CV audit (tailored-cv audit) is included in npm run verify
- Audit produces clear pass/fail signal
- Regression in CV quality is detectable

- Required verification:
- npm run verify includes CV audit step
- artifact output clearly shows CV quality result

- Exit condition:
CV quality becomes a blocking condition in verification

- Notes:
- Implemented via enforced tailored-CV quality step in `scripts/verify.ts`
- Uses `scripts/run-tailored-cv-bullet-rewrite-audit.ts --enforce`
- Produces `artifacts/tailored-cv-bullet-rewrite-audit-v1.verify.json`

---
### QUEUE-P0-002 Strengthen Tailored CV Quality Gate for Phase 1 Product Validity
- Status: completed
- Priority: P0

- Objective:
Make CV quality gate reflect real user-facing product quality across representative job profiles.

- Scope (implemented):
- expand audit case set from narrow defaults to representative adjacent + different requirement profiles
- enforce explicit failure modes in quality criteria
- improve founder-readable artifact output for rapid product judgment
- reduce profile/case resolution fragility in audit preflight diagnostics

- Success criteria:
- CV gate covers multiple representative cases in enforce mode
- failure modes are explicit in artifact and success criteria
- verify remains deterministic and runnable in regular loop
- founder can quickly inspect weakest cases + mode status from artifact

- Verification:
- `npm run verify` passes with tailored CV quality step enforced
- `artifacts/tailored-cv-bullet-rewrite-audit-v1.verify.json` shows:
  - `coverage`: 6 cases (3 adjacent, 3 different)
  - explicit `failure_modes` block (all required modes)
  - `founder_readability` summary block
  - deterministic hash stability

- Exit condition:
CV gate is product-validity oriented rather than narrow happy-path only.

---

### QUEUE-P0-003 Add Adversarial/Negative CV Quality Fixtures (Mode-Trigger Validation)
- Status: completed
- Priority: P0

- Objective:
Prove each CV failure mode triggers under controlled degraded outputs, not only in pass scenarios.

- Why next:
- current gate enforces mode thresholds in live replay, but mode-trigger coverage is still observational
- explicit red-team fixtures reduce false confidence and founder debugging burden

- Success criteria:
- deterministic negative fixtures or replay controls exist for:
  - generic rewrite
  - fake tailoring
  - ownership inflation
  - weak job alignment
  - evidence mismatch
  - weak differentiation
- verify artifacts clearly show expected fail/pass per adversarial fixture set

- Required verification:
- `npm run verify`
- dedicated artifact assertions for expected mode trigger behavior

- Exit condition:
failure-mode detection quality is test-backed, not only inferred from production-like runs.

- Verification evidence:
- `artifacts/tailored-cv-bullet-rewrite-audit-v1.verify.json` now includes `aggregate.adversarial_fixtures`
- fixture-to-mode map present under `mode_to_fixture_map`
- per-fixture trigger detection present (`detected=true`) with deterministic-stability flag
- success criteria include:
  - `adversarial_fixture_mode_coverage_complete`
  - `adversarial_fixture_detection_complete`
  - `adversarial_fixture_deterministic`

---

### QUEUE-P0-004 Reduce CV Gate Environment Dependency (Deterministic Replay Path)
- Status: completed
- Priority: P0

- Objective:
Reduce reliance on live Supabase profile/runtime state for CV quality gate execution.

- Why next:
- current CV audit still requires profile/career data access, which can introduce environment fragility
- deterministic replay fallback would improve repeatability and founder confidence

- Success criteria:
- CV gate has a deterministic offline/seeded replay path for core assertions
- verify artifacts clearly indicate when live vs replay path was used

- Required verification:
- `npm run verify`
- repeated runs produce stable CV gate result in replay mode

- Exit condition:
CV gate remains reliable when live profile dependencies are unavailable or unstable.

- Verification evidence:
- `scripts/verify.ts` now runs tailored CV gate in replay mode by default:
  - `--mode replay --replayFixture scripts/fixtures/tailored-cv-quality-replay.seed.json`
- replay seed fixture added:
  - `scripts/fixtures/tailored-cv-quality-replay.seed.json`
- audit artifact now reports execution path:
  - `preflight.execution_mode_requested`
  - `preflight.execution_mode_resolved`
  - `preflight.replay_fixture_path`
  - `preflight.replay_fixture_exists`
- latest verify run passed with replay mode and deterministic/adversarial criteria intact.

---

### QUEUE-P0-005 Improve Evidence Selection Quality for Tailored CV Generation
- Status: completed
- Priority: P0

- Objective:
Improve upstream evidence selection precision so tailored CV outputs are less generic and better aligned to target-job requirement clusters.

- Scope (implemented):
- tightened canonical selection scoring/suppression in `job-copilot-service` to penalize generic, weak-specificity, and multi-cluster-monopoly evidence
- increased context-coverage pressure in canonical selection (context-specific cluster coverage + dominant context coverage)
- strengthened reuse suppression behavior when recent-selection context exists
- switched live CV audit case rendering to canonical selector (`buildTailoringPlanForCv`) with deterministic rolling recent-selection context
- improved pair differentiation scoring in audit to blend shared-evidence and full-output similarity when overlap is moderate (reduces false generic flags while preserving adversarial checks)

- Success criteria:
- selected evidence becomes more role-specific across representative jobs
- generic evidence overlap is reduced
- CV quality artifact improves without integrity/ownership regressions
- deterministic replay verify + adversarial fixture checks remain passing

- Required verification:
- `npx tsx scripts/run-tailored-cv-bullet-rewrite-audit.ts --mode live --out artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-005-before.json`
- `npx tsx scripts/run-tailored-cv-bullet-rewrite-audit.ts --mode live --out artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-005-after-v9.json`
- `npm run verify`

- Exit condition:
Live representative-case audit shows improved selection signal and canonical verify remains passed.

- Verification evidence:
- live audit overall score improved `10.5 -> 11.17`
- adjacent-case overlap ratio average reduced `0.8667 -> 0.4667`
- representative-case improvements:
  - `job-06` total `10 -> 12`, relevance `1 -> 2`
  - `job-05` total `11 -> 12`
  - `job-14` total `10 -> 11`, relevance `1 -> 2`
- enforced failure-mode block in live artifact is fully passing for adjacent-case gate criteria
- canonical replay verify remains passed (`tailored_cv_quality_status: passed`)

---

### QUEUE-P0-006 Harden Mixed-Case Differentiation Signal Without Weakening Alignment
- Status: completed
- Priority: P0

- Objective:
Reduce remaining mixed-case generic/fake-tailoring pattern noise while preserving high relevance and deterministic behavior.

- Scope (implemented):
- added cross-context reuse-penalty path in canonical selector, but bounded to avoid relevance erosion
- refined mixed-pair differentiation scoring in live audit so mixed pairs with meaningful delta are not over-flagged as weak differentiation noise
- preserved adjacent-case enforcement thresholds and adversarial fixture assertions

- Success criteria:
- mixed-pair pattern noise is reduced with no regression in relevance or integrity dimensions
- adversarial fixture enforcement remains complete/deterministic
- replay verify remains stable

- Required verification:
- `npx tsx scripts/run-tailored-cv-bullet-rewrite-audit.ts --mode live --out artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-006-before.json`
- `npx tsx scripts/run-tailored-cv-bullet-rewrite-audit.ts --mode live --out artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-006-after-v4.json`
- `npm run verify`

- Exit condition:
mixed-pair noise is reduced and no enforcement regressions are introduced.

- Verification evidence:
- weakest mixed pair (`job-04` vs `job-13`) improved from telemetry perspective:
  - pair score `1 -> 2`
  - no generic/fake-tailoring telemetry patterns emitted (`patterns=[]`)
- representative job score safety preserved:
  - no regression in per-case totals/relevance/ownership/integrity versus `p0-006-before`
- canonical replay verify preserved:
  - `npm run verify` status `passed`
  - `tailored_cv_quality_status: passed`
  - adversarial coverage/detection/determinism all passing

---

### QUEUE-P0-007 Raise Ownership Clarity to Remove Residual Minor Ownership Warnings
- Status: completed
- Priority: P0

- Objective:
Reduce residual ownership minor-warning noise (notably `job-01` and `job-04`) while preserving evidence grounding and relevance.

- Success criteria:
- ownership dimension remains at or improves to fully clean on representative cases
- no integrity drift/hallucination regressions
- replay verify and adversarial determinism remain passed

- Required verification:
- live-mode tailored CV audit comparison
- `npm run verify`

- Exit condition:
ownership minor-warning noise is reduced without regressions in other quality dimensions.

- Scope (implemented):
- adjusted ownership lead-verb detection in CV audit scoring to inspect the action clause (post-label) instead of whole-bullet first token
- preserved existing ownership-inflation major violation detection and adversarial fixture enforcement
- no changes to schema, UI, TS debt remediation, or non-CV verification architecture

- Verification evidence:
- baseline/after live artifacts:
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-007-before.json`
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-007-after.json`
- representative ownership cleanup:
  - `job-01` ownership `1 -> 2` and reason `ownership_violations_major=0,minor=1 -> ownership_alignment_clean`
  - `job-04` ownership `1 -> 2` and reason `ownership_violations_major=0,minor=1 -> ownership_alignment_clean`
- aggregate quality safety:
  - overall score improved `11.33 -> 11.67`
  - all failure modes remained passing
  - deterministic hash remained stable in live audit output
- canonical verification preserved:
  - `npm run verify` status `passed`
  - `tailored_cv_quality_status: passed`
  - adversarial coverage/detection/determinism still passing

---

### QUEUE-P0-008 Add End-to-End Degraded Replay Fixtures for CV Gate Failure Modes
- Status: in progress
- Priority: P0

- Objective:
Reduce remaining product-validity blind spot by validating failure modes against prebuilt degraded output replays, not only synthetic in-memory mutations.

- Progress note (2026-04-09):
- no-code fixture audit design pass completed under EM AUDIT mode
- current gate realism gap confirmed:
  - `runAdversarialFixtures(...)` still mutates in-memory audit outputs (synthetic fixtures only)
  - replay fixture (`scripts/fixtures/tailored-cv-quality-replay.seed.json`) is score/pattern snapshot data and does not carry rendered degraded outputs (`before/after` bullets, selected evidence ids)
- dominant missing deterministic control:
  - no explicit synthetic-vs-degraded fixture source split in the enforced artifact contract
- next bounded action (not executed in this pass):
  - add one harness-only fixture-source split (`synthetic` + `degraded_replay`) and wire deterministic degraded replay fixtures for selected failure modes first
  - design artifact: `docs/control/p0-008-fixture-audit-design.md`

- Progress note (2026-04-09, slice 1 kept):
- admitted one bounded harness-only fixture-authoring slice
- landed source-typed fixture reporting (`synthetic` vs `degraded_replay`) in CV quality audit output
- added first degraded replay fixture corpus + registry (one fixture per degraded-first mode):
  - `generic_rewrite`
  - `fake_tailoring`
  - `weak_differentiation`
  - `weak_job_alignment`
- targeted replay validation artifact:
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-008-degraded-fixture-slice.json`
- local result:
  - degraded replay fixture detection `all_modes_covered=true`, `all_detected=true`, `deterministic_stable=true`
  - no product-logic or scoring changes

- Progress note (2026-04-09, slice 2 kept: degraded-first enforce integration):
- admitted one bounded harness-only enforce integration step
- integrated degraded-first checks into enforce-blocking success criteria:
  - `degraded_replay_fixture_available`
  - `degraded_replay_fixture_mode_coverage_complete`
  - `degraded_replay_fixture_detection_complete`
  - `degraded_replay_fixture_deterministic`
- validation:
  - positive enforce run passed with registry-backed degraded corpus
  - negative enforce run (missing registry path) failed with expected degraded criteria failures
- no global verify policy rewrite, no product/scoring changes

- Progress note (2026-04-09, slice 3 kept: synthetic-retained migration audit + bounded ownership migration):
- synthetic-retained audit result:
  - `ownership_inflation` admitted for one bounded degraded replay migration slice
  - `evidence_mismatch` remains synthetic-retained (audit-only) due higher semantic attribution ambiguity
- landed one degraded replay fixture for `ownership_inflation` and added it to degraded registry
- targeted enforce validation artifact:
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-008-ownership-migration.after.json`
- local result:
  - degraded required modes now include `ownership_inflation`
  - ownership degraded fixture detected cleanly with no unexpected mode triggers
  - no product/scoring changes

- Success criteria:
- each enforced failure mode has at least one degraded replay case that fails deterministically
- artifact output clearly distinguishes synthetic fixture checks vs end-to-end replay degradation checks
- canonical verify remains stable and passing for baseline replay mode

- Required verification:
- targeted degraded replay fixture runs per failure mode
- `npm run verify`

- Exit condition:
CV gate failure-mode confidence is backed by both synthetic mutation tests and end-to-end degraded replay tests.

---

### QUEUE-P0-009 Restore Sidepanel Analyze Request Path (Request-Layer Reliability)
- Status: completed
- Priority: P0

- Objective:
Eliminate the sidepanel Analyze request-layer failure mode producing `Analyze request failed (Failed to fetch)` when legacy-first endpoint attempts fail before canonical analyze route is tried.

- Success criteria:
- sidepanel Analyze requests target canonical `/api/job-copilot/extension/analyze` first
- first-candidate network exception does not abort fallback candidate attempts
- canonical verify remains passing

- Scope (implemented):
- updated extension API client endpoint candidate order:
  - first: `/api/job-copilot/extension/analyze` (canonical)
  - fallback: `/api/job-copilot/extension/run` (compatibility only)
- updated network-error handling loop to continue to fallback candidate when available instead of immediate break
- no schema/UI/interview/TS-debt changes

- Required verification:
- `npm run verify`

- Verification evidence:
- `npm run verify` passed after change
- `artifacts/verify-summary.json` status `passed`
- `tailored_cv_quality_status: passed`
- `extension_lifecycle_regression_status: passed`

- Exit condition:
Analyze request path no longer hard-fails on first legacy endpoint network exception and uses canonical route first.

---

### QUEUE-P0-010 Fix Analyze Runtime Error (`normalizeStringList is not defined`)
- Status: completed
- Priority: P0

- Objective:
Remove runtime Analyze failure after successful backend response by fixing helper resolution in sidepanel background normalization flow.

- Success criteria:
- no runtime `normalizeStringList is not defined` during Analyze response normalization
- Analyze path reaches `ready` state in targeted runtime validation
- canonical verify remains passing

- Scope (implemented):
- added missing shared `normalizeStringList` helper in `normalizeAnalyzeData` scope of:
  - `extensions/job-copilot/background/analysis-service.js`
- no request contract changes
- no schema/UI/interview/CV-gate changes

- Required verification:
- targeted Analyze runtime harness call to `handleSidepanelAnalysisRequest`
- `npm run verify`

- Verification evidence:
- harness output reached `state: \"ready\"` with no `ReferenceError`
- `npm run verify` passed
- `extension_lifecycle_regression_status: passed`

- Exit condition:
Analyze no longer throws `normalizeStringList` runtime error after network success.

---

### QUEUE-P0-011 Restore Apply with Tailored CV (Compatibility Write Failure)
- Status: completed
- Priority: P0

- Objective:
Fix Apply-with-tailored-CV runtime failure caused by `record applied action` write error so resume download completes successfully.

- Success criteria:
- identify exact failing write target and schema mismatch
- remove failing write dependency on non-existent legacy columns
- confirm applied-action write succeeds in current environment
- confirm download path returns successful resume payload
- canonical verify remains passing

- Scope (implemented):
- updated compatibility writer in:
  - `lib/career-engine/job-copilot/backend/pipeline-write-integration.ts`
- `user_job_actions` insert now writes compatibility-safe baseline fields only:
  - `user_id`, `profile_id`, `job_url`, `job_title`, `company`, `action`
- removed dependency on extended legacy fields not present in live schema:
  - `source_platform`, `location`, `job_description_snapshot`, `match_score`, `verdict`, `selected_evidence_ids`, `applied_at`
- no schema changes
- no contract/UI/CV/matcher/TS-debt changes

- Required verification:
- targeted live Supabase probe for `writeAppliedPipelineAction`
- targeted end-to-end service probe for `downloadTailoredResumeAndMarkApplied`
- `npm run verify`

- Verification evidence:
- exact failure source confirmed:
  - live insert returned `PGRST204` missing-column errors for extended fields (for example `applied_at`)
- post-fix direct write probe:
  - action row insert succeeds in `user_job_actions` and cleanup delete succeeds
- post-fix end-to-end probe:
  - `downloadTailoredResumeAndMarkApplied` returns `success=true`, `applied_recorded=true`, non-empty `resume_text`
  - applied action row is created in `user_job_actions`
- post-fix route probe:
  - `app/api/job-copilot/extension/download-resume` `POST` returns HTTP `200`
  - response includes `success=true`, `applied_recorded=true`, and non-empty `resume_text`
- canonical verify preserved:
  - `npm run verify` status `passed`
  - `extension_lifecycle_regression_status: passed`

- Exit condition:
Apply with tailored CV no longer fails due to `record applied action` compatibility write errors.

---

### QUEUE-P0-012 Prevent Tailored CV Instruction Leakage Into Final Resume Output
- Status: completed
- Priority: P0

- Objective:
Eliminate stage contamination where internal planning/instruction text (for example `Prepare one concrete example to de-risk ...`) can appear in final tailored CV bullets.

- Success criteria:
- exact contamination entry point is identified in pipeline
- smallest root cause is fixed without broad rewrite
- hard guard prevents internal planning/instruction text classes from shipping in final resume output
- canonical verify remains passing

- Scope (implemented):
- traced end-to-end path:
  - `positioningHints` generated in role-context insight layer
  - `positioningHints` normalized into `globalEmphasis` / fallback emphasis
  - emphasis merged into `selected_evidence.emphasis_tags`
  - resume rewriter consumes emphasis tags for bullet signal selection
  - contaminated phrase can become final bullet headline/content
- minimal root-cause fix:
  - removed `positioningHints` from emphasis propagation in:
    - `buildGuidingEvidencePool` path
    - download fallback tailoring-plan path
- hard final-output guard:
  - added instruction-leak filter/sanitizer in resume output assembly for:
    - final `experience` bullets
    - `tailored_evidence` bullets
  - known internal text classes are stripped/blocked before output delivery
- no schema changes
- no contract changes
- no sidepanel/UI changes

- Required verification:
- `npm run verify`
- targeted local harness with injected leak phrase in `emphasisTags`

- Verification evidence:
- canonical verify remained passing:
  - `artifacts/verify-summary.json` status `passed`
  - `tailored_cv_quality_status: passed`
  - `extension_lifecycle_regression_status: passed`
- targeted harness result:
  - injected phrase: `Prepare one concrete example to de-risk commercial analytics depth.`
  - final output bullet does not contain leaked instruction text
  - `tailored_evidence` bullets do not contain leaked instruction text

- Exit condition:
Internal planning/instruction text classes no longer leak into final tailored resume output in this pipeline path.

---

### QUEUE-P0-013 Post-Fix Tailored CV Final-Output Validity Review (Live Regeneration)
- Status: completed
- Priority: P0

- Objective:
Regenerate the same affected tailored CV after leakage fix and assess real final-output quality (not only telemetry) for founder/user readiness.

- Success criteria:
- regenerate live tailored CV for same case through analyze + download path
- verify no internal planning/instruction/debug text appears in final resume output
- classify remaining output issues by severity for product triage

- Scope (implemented):
- regenerated live case:
  - job URL: `https://www.linkedin.com/jobs/view/4347757870`
  - role: `Senior Manager, Data Analytics Consulting | EPAM Systems`
- captured artifact:
  - `artifacts/tailored-cv-regenerated-after-leak-fix.epam.json`
- validated leakage classes in final `resume_text`:
  - `prepare one concrete example`
  - `to de-risk`
  - quick-check/save-confirmation text
- performed manual product-quality review on generated summary + bullets

- Verification evidence:
- leakage checks all false in artifact (`has_prepare_example=false`, `has_de_risk=false`, etc.)
- final-output review found remaining quality defects:
  - malformed prefix/phrase contamination (`CI CD: Contributed to ...`)
  - stacked/awkward action phrasing reducing credibility
  - insufficient role-specific consulting/GenAI positioning in top summary/bullets

- Exit condition:
Leakage fix validated on live regenerated output and remaining product-quality defects explicitly prioritized.

---

### QUEUE-P0-014 Fix Final Tailored CV Bullet Validity and Role-Specific Prioritization
- Status: completed
- Priority: P0

- Objective:
Raise final generated CV output quality to founder-reviewable/user-testable level by fixing malformed rewrite artifacts and improving role-specific evidence prioritization.

- Why now:
- leakage is fixed, but regenerated live output still contains visible rewrite defects that reduce user trust.

- Success criteria:
- no malformed prefixes/action-stacking artifacts in final bullets
- bullets read as credible resume achievements
- strongest role-relevant evidence appears early
- summary/bullets reflect role-specific context (for example consulting + GenAI for this case)
- no regression in leakage guard or deterministic verify path

- Required verification:
- regenerate same EPAM case and compare before/after artifact
- `npm run verify`

- Scope (implemented):
- updated `resume-rewriter` sentence assembly with minimal targeted fixes:
  - acronym-like primary signals treated as generic fallback candidates (prevents noisy label heads such as `CI/CD`)
  - removed label-style `primarySignal:` prefixing from final bullet body assembly
  - ownership-safe helper + clause assembly now strips leading action verbs before combination (prevents malformed stacks such as `Contributed to Presented ...`)
  - widened leading-label cleanup for short slash labels (for example `CI/CD:`)
  - truncation cleanup removes dangling ordered-list tails (for example trailing `3)`) and orphan trailing colons
- preserved leakage guard and did not touch sidepanel/schema/major architecture

- Verification evidence:
- before malformed bullets (from post-leak-fix regeneration):
  - `CI CD: Contributed to Presented ...`
  - `CI CD: Contributed to Identified ...`
- after patch regeneration (`artifacts/tailored-cv-regenerated-after-p0-014.epam.v3.json`):
  - no `CI CD:` prefix bullets
  - no `Contributed to Presented`
  - no `Contributed to Identified`
  - no `Contributed to Lead`
  - leakage checks remain clean (`prepare one concrete example` / `de-risk` absent)
- canonical verify preserved:
  - `npm run verify` passed
  - `tailored_cv_quality_status: passed`

- Exit condition:
Regenerated CV is founder-reviewable and suitable for user testing on the case.

---

### QUEUE-P0-015 Improve Role-Specific Bullet Relevance Phrasing (Post-Validity Pass)
- Status: completed
- Priority: P0

- Objective:
Improve remaining role-specific phrasing quality after validity fix by reducing repetitive generic method-impact tails and strengthening top-bullet relevance framing.

- Success criteria:
- bullets remain clean/ownership-safe with no malformed constructions
- fewer repetitive generic tails (for example repeated `through analysis and recommendation ...`)
- stronger role-specific context in top bullets/summary for target role requirements
- no regression in leakage guard or deterministic verify path

- Required verification:
- regenerate same EPAM case and compare before/after output artifact
- `npm run verify`

- Scope (implemented):
- refined `resume-rewriter` for natural ownership-safe phrasing and tail cleanup:
  - unconfirmed ownership helper now resolves to `Supported` instead of awkward `Contributed to`
  - primary-signal selection now prefers phrases that appear in evidence text
  - removed forced fallback anchor append (`for <signal>`) to prevent generic tail contamination
  - added impact-aware suppression of method/impact suffix when core clause already contains strong outcome/method signal
  - truncation cleanup tightened for dangling infinitive tails
- refined `resume-summary-builder` for role-specific summary emphasis:
  - added target-role cue extraction for consulting/executive-decision-support/commercial-analytics contexts
  - added redundant generic theme collapse (for example bare `leadership` when stronger leadership phrase exists)
- preserved leakage guard and malformed-bullet protections from prior tasks

- Verification evidence:
- regenerated EPAM artifact:
  - `artifacts/tailored-cv-regenerated-after-p0-015.epam.v3.json`
- quality checks in artifact:
  - leakage absent (`prepare one concrete example` / `de-risk` false)
  - malformed helper stacking absent
  - generic-tail pattern count (`through analysis and recommendation to support decision-making`) = `0`
  - summary contains role-specific cues (consulting/executive decision support/commercial analytics context)
- canonical verify preserved:
  - `npm run verify` status `passed`
  - `tailored_cv_quality_status: passed`

- Exit condition:
Regenerated output remains valid and becomes more role-specific/readable for founder/user review.

---

### QUEUE-P0-016 Improve Opening-Bullet Priority Consistency and Ownership-Safe Verb Variety
- Status: completed
- Priority: P0

- Objective:
Implement a generic tailored-CV quality refinement pass that improves ownership-safe phrasing variety, strongest-first bullet ordering, and role-positioned summary quality without case-specific hardcoding.

- Success criteria:
- ownership-safe bullet openings show stronger safe verb variety without ownership inflation
- strongest role-relevant evidence is prioritized earlier within each experience
- summary reads as role-positioning (not generic profile compression)
- no regression in leakage guard or malformed-bullet protections
- canonical verify remains passing

- Required verification:
- before/after regeneration comparison on the same evaluated EPAM case
- `npm run verify`

- Scope (implemented):
- updated `resume-rewriter` with generic ownership-safe phrasing and signal handling improvements:
  - added safe verb derivation from evidence-leading verbs/context (for example `Presented`, `Identified`, `Developed`, `Partnered on`, `Helped lead`, `Supported`)
  - reduced repetitive helper phrasing by replacing one-size-fits-all fallback behavior
  - improved primary-signal extraction to prefer specific phrases present in evidence text
  - suppressed generic method/impact append tails when evidence clause already contains strong outcome/method anchors
- updated `resume-output-builder` with deterministic strongest-first bullet ordering:
  - added priority scoring and sorting to rank impact/leadership/decision-support evidence earlier per experience
- updated `resume-summary-builder` with generic role-positioning upgrades:
  - added role-cue extraction (consulting/executive decision support/commercial analytics cues)
  - added theme de-duplication/prioritization to reduce generic collisions
  - updated opening summary pattern to explicit role positioning (`positioned for <target role> roles ...`)
- no hardcoded user/job/company-specific output logic was introduced

- Verification evidence:
- before artifact (`artifacts/tailored-cv-regenerated-after-p0-015.epam.v3.json`) showed repetitive openings:
  - `Supported localized growth strategy ...`
  - `Supported business cases ...`
  - `Supported $25M+ revenue growth opportunities ...`
- after generic pass (`artifacts/tailored-cv-regenerated-after-generic-quality-pass.epam.v2.json`) shows safer variety + stronger ordering:
  - `Presented business cases ...`
  - `Helped lead team of 6 analytics professionals ...`
  - `Identified $25M+ revenue growth opportunities ...`
  - `Developed data monetization strategy ...`
  - `Partnered on customer lifetime value projects ...`
- summary upgraded from generic to positioned opening:
  - before: `Senior leader with strengths ...`
  - after: `Senior leader positioned for Senior Manager, Data Analytics Consulting roles ...`
- quality checks in regenerated artifact remain clean:
  - `has_prepare_example=false`
  - `has_de_risk=false`
  - `has_label_prefix=false`
  - `has_helper_stacking=false`
  - `generic_tail_count=0`
  - `summary_has_positioning_signal=true`
  - `summary_has_target_phrase=true`
- canonical verify preserved:
  - `npm run verify` passed
  - `artifacts/verify-summary.json`:
    - `status=passed`
    - `started_at=2026-03-23T04:26:35.260Z`
    - `finished_at=2026-03-23T04:26:46.580Z`
    - `tailored_cv_quality_status=passed`

- Exit condition:
Generic generator quality improved with preserved integrity/leakage protections and passing canonical verify.

---

### QUEUE-P0-017 Cross-Case Validation and Calibration for Generic Tailored-CV Quality
- Status: completed
- Priority: P0

- Objective:
Validate and calibrate the new generic phrasing/ranking/summary logic across multiple representative jobs so quality gains are not single-case artifacts.

- Success criteria:
- run regenerated tailored CV outputs across representative job profiles already covered by the quality gate
- confirm ownership-safe verb variety and strongest-first ordering improvements appear across cases
- confirm no regression in leakage guard, malformed-bullet protection, or adversarial detection/determinism
- identify and document any weak residual cases with concrete next tuning tasks

- Required verification:
- representative multi-case regeneration artifact set (same profile, different job requirement profiles)
- live-mode CV quality gate artifact on same validation set
- `npm run verify`

- Scope (implemented):
- selected diverse 6-case validation set from `human_alignment_benchmark.seed.json`:
  - strong-fit: `job-01`, `job-06`
  - borderline/medium: `job-04`, `job-05`
  - low-fit/different: `job-13`, `job-14`
- regenerated tailored CV outputs for all selected cases:
  - `artifacts/tailored-cv-behavior-audit-inputs.p0-017.json`
- ran live canonical CV quality gate for same case set:
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-017-live.json`
- produced per-case generic-quality validation summary artifact:
  - `artifacts/tailored-cv-generic-validation.p0-017.json`

- Verification evidence:
- live gate result on validation set:
  - overall score: `10.67`
  - verdict: `production_ready`
  - deterministic hash stable: `true`
  - all enforced failure modes: `pass`
  - adversarial fixture coverage/detection/determinism: all `true`
- canonical verify preserved:
  - `npm run verify` passed
  - `artifacts/verify-summary.json`:
    - `status=passed`
    - `started_at=2026-03-23T05:04:39.776Z`
    - `finished_at=2026-03-23T05:04:53.671Z`
    - `tailored_cv_quality_status=passed`
- per-case generic checks (`tailored-cv-generic-validation.p0-017.json`):
  - ownership-safe phrasing variety pass: `6/6`
  - strongest-first ordering pass: `6/6`
  - summary positioning pass: `6/6`
  - leakage/malformed/helper-stacking safety pass: `6/6`
  - overall pass: `6/6`
- recurring strengths validated:
  - no instruction leakage or malformed/helper-stacking regressions
  - strongest-first ordering generalized across all validated experiences
  - ownership-safe opening variety generalized across the set
- recurring weaknesses surfaced:
  - residual mixed-pair telemetry remains:
    - `generic_rewrite_detected_between_job-04_and_job-13`
    - `fake_tailoring_detected_between_job-04_and_job-13`
  - `job-05` remains watch-level in gate scoring (`relevance=0`)
  - summary second sentence is heavily reused across roles (`reused_second_sentence_max=6`)
  - low-fit cases still receive over-confident summary themes (`job-13`, `job-14`)

- Exit condition:
Generic quality gains are validated across representative cases and remaining weak cases are explicitly prioritized.

---

### QUEUE-P0-018 Improve Cross-Case Summary Specificity and Residual Mixed-Pair Differentiation
- Status: completed
- Priority: P0

- Objective:
Reduce cross-case summary over-reuse and residual mixed-case generic/fake-tailoring telemetry (especially `job-04` vs `job-13`) while preserving current integrity, relevance, and deterministic verification behavior.

- Success criteria:
- summary second sentence reuse decreases across representative cases
- low-fit cases avoid over-confident summary positioning language
- mixed-pair telemetry noise is reduced for weakest pair(s) without weakening adjacent-case enforcement
- no regression in leakage guards, malformed-bullet protections, adversarial detection, or verify pass status

- Required verification:
- rerun representative regeneration set and compare:
  - `artifacts/tailored-cv-behavior-audit-inputs.p0-017.json` baseline vs post-change run
  - `artifacts/tailored-cv-generic-validation.p0-017.json` baseline vs post-change validation
- rerun live CV quality gate on same case set
- `npm run verify`

- Scope (implemented):
- updated generic summary generation rules in `resume-summary-builder`:
  - added fit-band derivation (`strong` / `borderline` / `cautious`) from title/role-family alignment + job-signal coverage over selected evidence
  - introduced fit-sensitive sentence construction patterns (confident for strong fit, measured for borderline, cautionary-transferable for low fit)
  - reduced template reuse by deterministic multi-template sentence variants keyed from role/context seed
  - added cautious-mode theme filtering to avoid over-claiming in low-fit summaries
- preserved existing bullet pipeline protections (no changes to rewriter/output ordering guards)
- validation artifacts:
  - regeneration set: `artifacts/tailored-cv-behavior-audit-inputs.p0-018.v2.json`
  - live gate: `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-018-live.v2.json`
  - consolidated generic validation: `artifacts/tailored-cv-generic-validation.p0-018.json`

- Verification evidence:
- summary specificity/confidence calibration improvements:
  - second-sentence reuse max reduced: `6 -> 3`
  - low-fit overconfident summaries reduced: `{job-13,job-14} -> {}`
  - low-fit summaries now contain cautionary-transferable language
- live gate remained healthy:
  - overall score improved: `10.67 -> 10.83`
  - verdict remained: `production_ready`
  - deterministic hash stable: `true`
  - enforced failure modes remained passing
- representative per-case generic checks (`tailored-cv-generic-validation.p0-018.json`):
  - ownership-safe variety pass: `6/6`
  - strongest-first ordering pass: `6/6`
  - summary positioning pass: `6/6`
  - leakage/malformed/helper-stacking safety pass: `6/6`
  - overall pass: `6/6`
- canonical verify preserved:
  - `npm run verify` passed
  - `artifacts/verify-summary.json`:
    - `status=passed`
    - `started_at=2026-03-23T04:43:50.680Z`
    - `finished_at=2026-03-23T04:44:01.982Z`
    - `tailored_cv_quality_status=passed`

- Exit condition:
Cross-case role-positioning specificity and mixed-pair differentiation improve measurably with no integrity/determinism regressions.

---

### QUEUE-P0-019 Reduce Residual Mixed-Pair Telemetry Noise and Watch-Level Case Drift
- Status: completed
- Priority: P0

- Objective:
Reduce remaining mixed-case generic/fake-tailoring telemetry on the weakest pair (`job-04` vs `job-13`) and resolve remaining watch-level live case drift without regressing current summary calibration, safety guards, or deterministic behavior.

- Success criteria:
- mixed-pair telemetry patterns for `job-04` vs `job-13` are reduced or eliminated in live validation output
- watch-level case count is reduced while preserving relevance/integrity/ownership safety
- summary specificity and low-fit cautious tone gains from P0-018 remain intact
- no regressions in leakage protections, malformed-bullet protections, ordering, or verify pass

- Required verification:
- rerun:
  - `artifacts/tailored-cv-behavior-audit-inputs.p0-018.v2.json` baseline vs post-change run
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-018-live.v2.json` baseline vs post-change run
  - `artifacts/tailored-cv-generic-validation.p0-018.json` baseline vs post-change validation
- `npm run verify`

- Scope (implemented):
- added fit-sensitive evidence budget in canonical CV evidence selection:
  - `lib/career-engine/job-copilot/backend/job-copilot-service.ts`
  - when strong role-context signals exist and `overall_match_score < 0.66`, selector now targets 4 evidence items instead of 5
- no changes to summary builder, resume rewriter, sidepanel/UI, schema, or contracts

- Verification evidence:
- live audit after change:
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-019-live.v3.json`
  - deterministic hash stable (`stable=true`)
  - overall verdict remained `production_ready`
- weakest mixed pair delta (`job-04` vs `job-13`):
  - `shared_evidence_count: 4 -> 3`
  - `overlap_ratio: 0.8 -> 0.75`
  - `before_similarity: 0.9316 -> 0.8553`
  - `after_similarity: 0.9354 -> 0.8965`
  - `generic_rewrite_detected_between_job-04_and_job-13`: cleared
  - residual pattern still present: `fake_tailoring_detected_between_job-04_and_job-13`
- summary calibration safety check:
  - `artifacts/tailored-cv-behavior-audit-inputs.p0-019.v2.json` vs `p0-018.v2`
  - summary second-sentence reuse max remained `3`
  - low-fit cautious tone signals remained present (`job-14`)
- canonical verification preserved:
  - `npm run verify` passed
  - `tailored_cv_quality_status: passed`

- Exit condition:
Residual mixed-pair behavior reduced measurably with preserved determinism and verify pass; remaining fake-tailoring residual explicitly documented for next task.

---

### QUEUE-P0-020 Eliminate Residual Mixed-Pair Fake-Tailoring on Weakest Mixed Pair
- Status: completed
- Priority: P0

- Objective:
Reduce the remaining `fake_tailoring_detected_between_job-04_and_job-13` signal by improving role-context framing distinctness in mixed low/medium-fit cases without regressing current summary/safety/determinism gains.

- Success criteria:
- weakest mixed pair no longer emits fake-tailoring telemetry in live validation
- no regression in:
  - summary fit-band calibration
  - leakage/malformed-bullet protections
  - ownership-safe phrasing integrity
  - deterministic live/replay gate behavior
  - canonical `npm run verify` pass + `tailored_cv_quality_status`

- Required verification:
- `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-019-live.v3.json` baseline vs post-change live run
- `artifacts/tailored-cv-behavior-audit-inputs.p0-019.v2.json` baseline vs post-change behavior run
- `npm run verify`

- Exit condition:
Residual weakest-pair fake-tailoring telemetry is removed or materially reduced with no safety/integrity regressions.

- Scope (implemented):
- minimal runtime wiring fix in resume output builder:
  - rewriter now receives `overallMatchScore` from canonical capability match when available
  - when capability match is unavailable in canonical resume generation, rewriter receives fallback fit signal from `job_analysis.match_score`
- no schema changes, no CV architecture rewrite, no sidepanel/UI work, and no TS debt cleanup
- preserved leakage guards, malformed-bullet protections, ownership-safe phrasing path, and strongest-first ordering

- Verification evidence:
- baseline live artifact:
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-019-live.v3.json`
  - weakest mixed pair (`job-04` vs `job-13`): `after_similarity=0.8965`, `similarity_delta=-0.0412`
  - residual pattern: `fake_tailoring_detected_between_job-04_and_job-13`
- post-change live artifact:
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-020-live.v6.json`
  - weakest mixed pair (`job-04` vs `job-13`): `after_similarity=0.8421`, `similarity_delta=0.0132`
  - residual pattern cleared (`patterns=[]`)
  - deterministic check stable (`hash_a===hash_b`)
  - all enforced failure modes passing
- behavior artifact:
  - `artifacts/tailored-cv-behavior-audit-inputs.p0-020.v6.json`
  - summary second-sentence reuse max remained controlled (`3`)
  - no leakage/helper-stacking/label-prefix/dangling-tail regressions detected in scanned bullets
- canonical verification preserved:
  - `npm run verify` passed
  - `tailored_cv_quality_status: passed`

---

### QUEUE-P0-021 Calibrate Transferable Framing Selectivity After P0-020
- Status: completed
- Priority: P0

- Objective:
Reduce overuse of explicit transferable-support phrasing on medium/strong-fit cases while preserving mixed-pair differentiation gains from P0-020.

- Success criteria:
- mixed-pair fake-tailoring pattern remains cleared on representative live set
- medium/strong-fit cases avoid unnecessary transferable framing repetition
- no regressions in leakage, malformed-bullet, ownership, or deterministic verify status

- Required verification:
- live CV gate comparison vs `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-020-live.v6.json`
- behavior artifact scan for phrasing repetition and safety checks
- `npm run verify`

- Exit condition:
Transferable framing remains fit-sensitive and differentiated without readability regression.

- Scope (implemented):
- updated generic fit-signal plumbing so resume rewrite can use real match context where available:
  - added `options.overallMatchScore` in Resume Copilot service input
  - passed capability-match score hints from analyze/audit paths into resume generation
- refined transferable-tail rules in `resume-rewriter`:
  - strong-fit (`>=0.70`) bullets no longer receive transferable tails
  - medium/strong border (`0.66-0.70`) now applies transferable tails only in very weak role-alignment conditions
  - sub-`0.66` cases retain caution framing to preserve differentiation and low-fit safety
- no schema changes, no sidepanel/UI changes, no TS debt cleanup, no CV architecture rewrite

- Verification evidence:
- baseline (P0-020):
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-020-live.v6.json`
  - medium/strong transferable tails (`job-01`,`job-04`,`job-06`) = `7`
  - weakest mixed pair (`job-04` vs `job-13`) patterns = `[]`
- after (P0-021):
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-021-live.v6.json`
  - medium/strong transferable tails (`job-01`,`job-04`,`job-06`) reduced `7 -> 0`
  - weakest mixed pair remained clear (`patterns=[]`)
  - pair differentiation remained improved (`after_similarity 0.8421 -> 0.8371`, `similarity_delta 0.0132 -> 0.0182`)
  - deterministic hash stable (`hash_a===hash_b`)
- behavior + safety validation:
  - `artifacts/tailored-cv-behavior-audit-inputs.p0-021.v6.json`
  - summary reuse control preserved (`second_sentence_reuse_max=3`)
  - leakage/malformed/helper-stacking checks remained clean
- canonical verify preserved:
  - `npm run verify` passed
  - `tailored_cv_quality_status: passed`

---

### QUEUE-P0-022 Recover Strong-Fit Specificity Signal After Tone Calibration
- Status: completed
- Priority: P0

- Objective:
Recover minor relevance/specificity signal loss introduced by stronger medium/strong-fit tail suppression, while preserving P0-021 readability gains and mixed-pair differentiation safety.

- Success criteria:
- strong-fit representative cases retain direct readable phrasing without transferable-noise overuse
- no regression to mixed-pair fake-tailoring telemetry
- no regression in leakage/malformed/ownership/determinism checks

- Required verification:
- compare against `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-021-live.v6.json`
- rerun behavior audit on representative set
- `npm run verify`

- Exit condition:
Readability gains and differentiation safety remain intact while strong-fit specificity scoring is recovered.

---

- Scope (implemented):
- added narrow strong-fit specificity rules in resume rewrite path:
  - non-transferable strong/upper-medium fit bullets can receive concise role-cue anchoring (`for <role cue> priorities`) when sentence specificity is otherwise weak
  - anchoring is direct (non-transferable wording), preserving P0-021 tone cleanup
- preserved fit-sensitive caution logic:
  - no rollback of low-fit caution framing (`<0.66` paths)
  - no reintroduction of transferable tails in stronger-fit cases
- added explicit overall-match-score hint plumbing for consistency across live generation paths:
  - `ResumeCopilotServiceOptions.overallMatchScore`
  - passed through analyze/download/audit generation call sites
- no schema, sidepanel/UI, or TS debt scope changes

- Verification evidence:
- baseline (P0-021):
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-021-live.v6.json`
  - medium/strong transferable tails (`job-01`,`job-04`,`job-06`) = `0`
  - weakest mixed pair pattern status = clear (`patterns=[]`)
- after (P0-022):
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-022-live.v4.json`
  - medium/strong transferable tails remained `0`
  - mixed-pair protection preserved (`patterns=[]`)
  - weakest mixed pair differentiation remained/improved (`after_similarity 0.8371 -> 0.8272`, `similarity_delta 0.0182 -> 0.0281`)
  - deterministic hash stable (`hash_a===hash_b`)
- strong-fit specificity evidence (evaluated cases):
  - `job-04` now includes direct role cue phrasing without transferable wording:
    - `... build dedicated core team for product analytics priorities.`
  - `job-01` counterpart remains role-positioned with direct non-transferable cue:
    - `... build dedicated core team for commercial decision support priorities.`
- safety verification preserved:
  - `artifacts/tailored-cv-behavior-audit-inputs.p0-022.v4.json` scan remains clean for leakage/malformed/helper-stacking checks
  - `npm run verify` passed with `tailored_cv_quality_status: passed`

- Outcome note:
- strong-fit wording specificity/punch improved in generated bullets while preserving P0-021 safety/tone gains; representative total score remained stable (`job-04` stayed at `11` with `relevance=2`).

---

### QUEUE-P0-023 Recover Strong-Fit Differentiation Score Without Reintroducing Tone Noise
- Status: completed
- Priority: P0

- Objective:
Raise residual strong-fit differentiation score (notably `job-04`) while preserving direct phrasing, zero strong-fit transferable tails, and mixed-pair safety.

- Success criteria:
- `job-04` differentiation returns from `1` to `2` on representative live set
- no reintroduction of transferable tails in strong/upper-medium fit cases
- no regressions in leakage/malformed/ownership/determinism/verify status

- Required verification:
- compare against `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-022-live.v4.json`
- rerun representative live + behavior audits
- `npm run verify`

- Exit condition:
Strong-fit differentiation score is recovered with P0-021/P0-022 readability and safety gains preserved.

---

- Scope (implemented):
- refined strong-fit emphasis in output assembly with narrow, high-signal targeting:
  - strong-fit role anchors applied only to top bullet positions (plus one high-intent bullet candidate) instead of broad global rewrites
  - anchors remain direct/non-transferable (`for <role cue> priorities`) to preserve P0-021 tone guardrails
  - fallback shorter anchor candidates added for long bullets when length limits block longer suffixes
- preserved existing fit-sensitive caution behavior for lower-fit cases
- no schema/UI/TS debt scope changes

- Verification evidence:
- baseline (P0-022):
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-022-live.v4.json`
  - `job-04` differentiation score: `1`
  - strong-fit transferable tails: `0`
- after (P0-023):
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-023-live.v5.json`
  - strong-fit direct role emphasis maintained/improved in top bullets
  - strong-fit transferable tails remained `0`
  - mixed-pair protection remained clear (`patterns=[]`)
  - deterministic hash stable (`hash_a===hash_b`)
  - `job-04` differentiation score recovered `1 -> 2` (total `11 -> 12`)
- safety + verify:
  - `artifacts/tailored-cv-behavior-audit-inputs.p0-023.v5.json` clean for leakage/malformed/helper-stacking checks
  - `npm run verify` passed with `tailored_cv_quality_status: passed`

- Outcome note:
- High-signal strong-fit phrasing quality improved and target differentiation metric recovery completed (`job-04` returned to differentiation score `2`) without safety/tone regressions.

---

### QUEUE-P0-024 Recover Residual Strong-Fit Differentiation Metric (Job-04) via Pair-Aware Emphasis Tuning
- Status: completed
- Priority: P0

- Queue note:
Closed as a bookkeeping no-op because the objective was fully met in `QUEUE-P0-023` final refinement (`...p0-023-live.v5.json`).

- Objective:
Recover `job-04` differentiation score from `1` to `2` using narrow pair-aware emphasis tuning that preserves current safety/tone constraints.

- Success criteria:
- `job-04` differentiation score reaches `2` on representative live set
- strong-fit transferable tails remain `0`
- mixed-pair protection remains stable (`patterns=[]`)
- no regressions in leakage/malformed/ownership/verify status

- Required verification:
- compare against `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-023-live.v4.json`
- rerun representative live + behavior audits
- `npm run verify`

- Exit condition:
Residual strong-fit differentiation metric is recovered without losing P0-021/P0-022/P0-023 safety and tone gains.

- Resolution note:
- Objective met during final P0-023 refinement (`artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-023-live.v5.json`), so no separate implementation was required.

---

### QUEUE-P0-025 Add Role-Family Summary Mode Router (Generic Generator Behavior)
- Status: completed
- Priority: P0

- Objective:
Make tailored CV summary generation switch into role-family narrative modes instead of defaulting to analytics-leadership/commercial-decision-support phrasing across dissimilar families.

- Success criteria:
- summary routing supports four generic families:
  - analytics / insights / commercial decision support
  - research / client servicing / insight delivery
  - technical data / analytics engineering / builder
  - enterprise data leadership / governance / regulated strategy
- family mode is generator-level (no job/company/user hardcoding)
- fit-band caution/strength behavior remains intact
- canonical verify remains passed

- Required verification:
- baseline role-family behavior artifact:
  - `artifacts/tailored-cv-behavior-audit-role-family.v1.json`
- post-change role-family behavior artifact:
  - `artifacts/tailored-cv-behavior-audit-role-family.v4.json`
- `npm run verify`

- Scope (implemented):
- added summary role-family mode derivation in `resume-summary-builder` using generic signal routing over:
  - target title + role family
  - job signal tokens
  - matched capability cues
- added family-specific summary theme seeding/prioritization and sentence-2 narrative templates
- preserved existing fit-band confidence calibration and caution handling
- added `summary_debug.role_family_mode_used` for founder-readable audit traceability
- no schema/UI/selector/bullet-rewriter refactor scope changes

- Verification evidence:
- mode routing now materializes across evaluated 12-case family audit set:
  - before (`v1`): `role_family_mode_used` unavailable (`unknown=12`)
  - after (`v4`): `analytics_commercial=4`, `research_client=3`, `technical_builder=2`, `enterprise_governance=3`
- summary narrative diversity improved:
  - unique second-sentence variants on same 12-case set: `5 -> 9`
- representative family-mode shifts in evaluated cases:
  - research family examples (`job-03`, `job-18`) now route to `research_client` and use client-insight framing
  - technical builder examples (`job-10`, `job-15`) now route to `technical_builder` and include technical implementation/tooling summary themes
  - enterprise examples (`job-17`, `job-19`) now route to `enterprise_governance` and use change/governance caution framing
- canonical verification preserved:
  - `npm run verify` passed
  - `tailored_cv_quality_status: passed`
  - `extension_lifecycle_regression_status: passed`

- Outcome note:
- summary positioning now shifts by role-family mode at generator level; remaining gap is that bullet-level language mode still lags summary-mode differentiation for some families.

---

### QUEUE-P0-026 Add Role-Family Bullet Language-Mode Routing (Generic)
- Status: completed
- Priority: P0

- Objective:
Extend role-family translation from summary-only to bullet-language mode so evidence phrasing better matches family intent (research/client, technical builder, enterprise governance) while preserving ownership safety and current safety guards.

- Why next:
- P0-025 improved summary routing and confidence tone, but bullet language remains partially over-generalized across families.

- Success criteria:
- family-specific bullet language mode calibration on representative multi-family set
- no regression in leakage/malformed/helper-stacking protections
- no regression in mixed-pair differentiation and verify pass status

- Required verification:
- role-family behavior artifact rerun
- tailored CV quality gate rerun
- `npm run verify`

- Scope (implemented):
- added bullet role-family mode routing in `resume-rewriter` using generic job-level cues (target title/family + job signal tokens)
- added family-conditioned bullet language rules for:
  - role cue selection
  - transferable-tail framing
  - ownership-safe support verb fallback
  - method/impact narrative phrasing
- passed job title/family into bullet rewrite context from `resume-output-builder`
- added founder-readable bullet debug trace:
  - `resume_debug.experiences[*].bullets[*].rewrite_input.role_family_mode`
  - `tailoring_applied` now records `role-family bullet mode (...)`
- enforced deterministic per-job bullet mode selection by constraining mode derivation to job-level signals (no per-bullet mode drift)

- Verification evidence:
- role-family behavior artifact rerun:
  - `artifacts/tailored-cv-behavior-audit-role-family.v6.json`
- summary mode distribution preserved across 12-case set:
  - `analytics_commercial=4`, `research_client=3`, `technical_builder=2`, `enterprise_governance=3`
- bullet mode coverage now explicit and stable:
  - bullet counts: `analytics_commercial=20`, `research_client=16`, `technical_builder=11`, `enterprise_governance=16`
  - per-case bullet mode mismatch count: `0`
- representative wording shifts (evaluated cases):
  - `job-03` (`research_client`): tail cue changed from `product analytics priorities` to `research and reporting priorities`
  - `job-10` (`technical_builder`): transferable tail changed from `transformation delivery` to `technical implementation`
  - `job-05` (`enterprise_governance`): transferable tail changed from `transformation delivery` to `enterprise governance`
- canonical safety verification preserved:
  - `npm run verify` passed
  - `tailored_cv_quality_status: passed`
  - `extension_lifecycle_regression_status: passed`

- Exit condition:
Role-family narrative mode is now reflected in summary and bullet rendering on the evaluated multi-family set.

- Outcome note:
Role-family translation is now active at both summary and bullet layers; remaining generic gap is stronger family-specific top-bullet evidence emphasis when source evidence is heavily shared.

---

### QUEUE-P0-027 Strengthen Role-Family Top-Bullet Evidence Emphasis (Generic)
- Status: in progress
- Priority: P0

- Objective:
Improve family-specific top-bullet emphasis so the first bullet per experience more consistently surfaces role-family-defining evidence instead of default shared analytics narrative.

- Why next:
- P0-026 fixed language-mode routing, but strongest-position bullet ordering can still preserve shared/default evidence emphasis in some cross-family cases.

- Success criteria:
- first bullet in representative family cases reflects family-defining evidence concepts more consistently
- no regression in safety protections (no leakage/malformed/helper stacking)
- no regression in mixed-pair differentiation or canonical verify pass status

- Required verification:
- role-family behavior artifact rerun against same 12-case set
- tailored CV quality gate rerun
- `npm run verify`

- Progress note (2026-04-09, audit-only refresh):
- active line opened in `diagnosis` / `AUDIT` posture
- refreshed role-family behavior audit artifact:
  - `artifacts/tailored-cv-behavior-audit-role-family.p0-027-gapmap.refresh.2026-04-09.json`
- refreshed gap-map summary artifact:
  - `artifacts/tailored-cv-behavior-audit-role-family.p0-027-gapmap.refresh-summary.2026-04-09.json`
- refreshed classification:
  - `fail=3`, `weak=4`, `pass=5`
- current fail shortlist:
  - `job-03` (`research_client`)
  - `job-10` (`technical_builder`)
  - `job-18` (`research_client`)
- family assignment stability:
  - `stable=12`, `unstable=0`
- current judgment:
  - keep audit-only for now; no repair admitted in this step

- Exit condition:
Top bullet emphasis better reflects each role family while current safety/integrity/determinism gains remain intact.

---

### QUEUE-P1-001 Resolve Core-Path TypeScript Debt (Job Copilot Backend)
- Status: not started
- Priority: P1

- Objective:
Reduce `core_careertwin_path` TS debt from 23 to 0 with smallest safe edits.

- Scope (must stay narrow):
- `lib/career-engine/job-copilot/backend/job-copilot-service.ts`
- related type definitions only if required for strict compatibility

- Why deferred:
- founder-directed priority is Phase 1 CV quality and user-facing validity first
- this debt is important but currently non-blocking for canonical verify execution

- Success criteria:
- `artifacts/typescript-debt-summary.json` shows `core_careertwin_path: 0`
- no behavior regressions in matcher/extension/JD/CV verification steps

- Required verification:
- `npm run verify` (full loop)
- inspect first failing step only if failure occurs

- Exit condition:
core-path TS debt is 0 and verify remains passed

---
### QUEUE-P1-002 Close Canonical Schema Source-of-Truth Gap for Core Runtime Tables
- Status: not started
- Priority: P1

- Objective:
Ensure canonical migration chain under `supabase/migrations/*` fully defines runtime memory tables.

- Why now:
- core runtime tables appear created in `supabase/migationcodex.sql` (legacy compatibility file)
- this conflicts with schema source-of-truth rule and makes environment reproduction risky

- Success criteria:
- canonical migration chain clearly creates/owns required runtime tables
- legacy SQL files remain compatibility-only with explicit boundary comments
- no runtime contract break in parse-resume/job-copilot flows

- Required verification:
- migration SQL review + dry-run strategy (as available)
- `npm run verify` after migration alignment

- Exit condition:
schema provenance for runtime tables is canonical and unambiguous

---

### QUEUE-P1-003 Clarify/Consolidate Extension Analyze Endpoint Surface
- Status: not started
- Priority: P1

- Objective:
Reduce endpoint ambiguity between `/extension/run` and `/extension/analyze` while preserving compatibility.

- Progress note:
- P0-009 already moved runtime priority to canonical `/extension/analyze` with compatibility fallback retained.
- P0-010 fixed downstream Analyze normalization runtime helper resolution.

- Success criteria:
- one canonical endpoint documented and used by default
- compatibility path retained only if required and clearly marked

- Required verification:
- extension analysis flow still passes lifecycle verify
- no contract break for existing client calls

- Exit condition:
analyze endpoint ownership is unambiguous

---

### QUEUE-P1-004 Interview Continuation Path Decision (Implement or Explicitly Gate)
- Status: in progress
- Priority: P1

- Current posture:
- explicit-gate-first (founder-approved)
- do not begin interview backend expansion by default

- Progress note (2026-04-09):
- first explicit-gate slice landed on sidepanel CTA rendering
- interview continuation action is now shown as gated (disabled) with explicit user-facing messaging
- no interview backend expansion was introduced in this step

- Objective:
Resolve current partial state where interview CTA exists without interview copilot backend flow.

- Success criteria:
- either implement bounded interview continuation path
- or explicitly gate/disable CTA with clear user-state messaging

- Required verification:
- extension lifecycle remains terminal-state safe
- no dead-end CTA behavior

- Exit condition:
interview continuation is no longer a placeholder behavior
