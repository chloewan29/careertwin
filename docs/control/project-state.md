# Project State

## Transactional Career Memory publication (2026-08-27)

- The local executable chain is B0 -> R0 -> atomic -> transactional publication.
- `public.publish_atomic_career_memory(jsonb)` is a `SECURITY INVOKER` RPC whose
  direct execution is limited to `service_role` plus function-owner semantics;
  `PUBLIC`, `anon`, and `authenticated` are explicitly revoked.
- The RPC validates deterministic identities, ownership, cardinality, graph
  relationships and derived aggregates before career-wide replacement. It uses
  a database-enforced per-user creation lock and career-row lock, then completes
  and promotes the candidate only inside the same transaction.
- Exact response-loss retries return `COMPLETE_REPLAY`; incomplete review state,
  stale writers, identity conflicts and active-state drift fail closed.
- The canonical loader uses a bounded before/after publication-token guard so
  independent REST reads cannot be accepted across a publication boundary.
- Disposable fault injection covers rollback at twelve durable phases, exact
  retry/replay, same-career concurrency, conflicting revisions, and independent
  publication for different careers.
- Application-owned public functions: 2. Direct function ACL rows: 7. Table and
  postgres/public default ACL rows remain 640 and 48.
- Canonical function verification keeps signatures, ownership, attributes,
  configuration and ACLs exact. Only the tightly guarded, literal-free body of
  `public.set_updated_at()` admits whitespace and unquoted-token case-only
  differences; literals, quoted identifiers, comments or nested dollar-quoted
  content fail closed. The transactional publication body remains case-sensitive,
  including its string literals, JSON keys, statuses, fates and error codes.
  Missing, additional, duplicate and semantically changed functions remain rejected.
- This guarded rule reconciles exact migration construction with historical
  production formatting without making production formatting repository authority.
- Production Stage 4 is applied and verified. It must not be retried; subsequent
  contract and PostgREST discovery work is read-only and separately authorized.

## Canonical database baseline update (2026-08-25)

- Step 3C architecture decision: `BASELINE_DECISION_READY`.
- Local implementation chain:
  - B0 canonical pre-atomic application baseline
  - R0 forward-only runtime-schema reconciliation
  - atomic-evidence ingestion migration
- The first 13 historical migrations are retained unchanged as non-executable provenance.
- Local verification covers both empty construction and preserved public-data compatibility.
- Founder admission correction records one application-owned public function,
  `public.set_updated_at()`, and eight dependent triggers. The earlier count of
  ten was line-counting of one multiline function definition, not ten functions.
- Canonical graph loading now excludes unsupported legacy/future evidence-piece
  columns and fails closed instead of silently using legacy selects by default.
- Database-backed verification found and corrected missing B0 API-role grants;
  the canonical contract now compares exact normalized direct table/function
  ACLs and postgres-owned public-schema defaults as well as structural catalog
  semantics. Owner-implicit and role-membership-derived access and
  Supabase-managed global privilege posture remain separate boundaries.
- Canonical constraint and index verification is semantic-name normalized:
  constraint identifiers and constraint-owned index identifiers may differ when
  their complete structure and multiplicity are identical, while standalone
  index identifiers remain exact contract surface.
- Current database-contract lifecycle risk: `MAINTAIN` is intentionally expected
  because it exists in the supported PostgreSQL/Supabase catalog captured by the
  verified baseline, but it is privilege-model/version-sensitive. An engine or
  intentional privilege-model change requires an explicit contract update,
  regenerated catalog expectations, local drift probes, review, and production-
  equivalence verification; expected ACL rows must not be changed silently.
- Production migration history remains empty and untouched.
- No production migration, metadata registration, deployment, commit, or push is authorized by this state update.

Document role: **operational snapshot + historical context**.
This file is not the authoritative default policy source for daily execution.
For current execution rules and verification defaults, use `AGENTS.md` and `docs/control/verification/verify-strategy.md`.
All focus, status, blocker, and next-task statements below should be read as a late-March 2026 historical snapshot, not as current operating authority.

## Snapshot Recorded
2026-03-27 (repo local time)

## Snapshot Focus At Capture Time
Hold the Job Copilot baseline steady. Treat the current Layer 1, Layer 2, and Layer 3 core logic as stabilized, and limit new work to clearly diagnosed narrow residual cleanup.

## Snapshot Status At Capture Time
- Phase: Phase 1 - Job Copilot
- Active task: Baseline lock-in and narrow residual cleanup only
- Status: in progress
- Confidence: fully verified (for the control-doc update scope)

## Job Copilot Stabilized Baseline

- Layer 1 authoritative start is now the JD ownership/skeleton pass.
- Layer 2 core owner path is now stabilized through owner selection plus replacement selector.
- Layer 3 core proof path is now stabilized through role-native proof alignment.
- Layer 4 wording is mostly aligned and should be treated as cleanup territory, not a reason to reopen upstream logic.

## Layer Freeze State

### Job Copilot

- Layer 1 (JD Role Reading): frozen except clear Layer 1 failures
- Layer 2 (Owner Selection): frozen except clear owner-selection failures
- Layer 3 (Role-Native Proof Selection): frozen except clear Layer 3 failures
- Layer 4 (Rendering): light cleanup only, unless a real Layer 4-only inconsistency is proven

## Remaining Narrow Job Copilot Backlog

- AI GRC unnecessary transformation wording residue
- UNSW composite wording still governance-first
- Confirm One Key Fact verbosity
- supporting evidence tail cleanliness

### Resume / CV

- Layer 1 (target-role reading): change only for clear target-role misread failures
- Layer 2 (career asset selection): preserve current verified path unless a selection failure is demonstrated
- Layer 3 (role-aligned rewriting): active quality surface when target-role read and asset selection are already correct
- Layer 4 (CV rendering): only light cleanup unless a true renderer-only defect is proven

## Repo-Grounded Snapshot

### Working (implemented + currently verified)
- Canonical verification loop runs and passes:
  - `npm run verify` (latest run: 2026-03-23T23:29:57Z -> 2026-03-23T23:30:10Z)
  - `artifacts/verify-summary.json` status `passed`
- Compile gate for verification config passes:
  - `artifacts/compile-summary.json` exit_code `0`
- Matcher deterministic benchmark passes:
  - `artifacts/matcher-summary.json` pass_count `20/20`, pass_rate `1`
  - `artifacts/matcher-regression-diff.json` pass `true`
- Tailored CV quality gate passes in canonical verify:
  - step `tailored_cv_quality` is part of `npm run verify`
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.verify.json` generated each run
  - `artifacts/verify-summary.json` shows `tailored_cv_quality_status: passed`
  - canonical verify now runs CV gate in replay mode using:
    - `scripts/fixtures/tailored-cv-quality-replay.seed.json`
    - `--mode replay --replayFixture ... --enforce`
  - gate now enforces representative-case coverage:
    - 6 total cases / 3 adjacent / 3 different
    - requirement profiles include analytics, product analytics, marketing science, BI transformation, enterprise sales leadership, clinical research
  - gate now enforces explicit failure modes:
    - generic rewrite
    - fake tailoring
    - ownership inflation
    - weak job alignment
    - evidence mismatch (hallucination + meaning drift)
    - weak differentiation
  - gate now includes deterministic adversarial fixtures that explicitly validate detection for each enforced mode:
    - `adv-generic-rewrite-jam` -> `generic_rewrite`
    - `adv-fake-tailoring-jam` -> `fake_tailoring`
    - `adv-ownership-inflation-claim` -> `ownership_inflation`
    - `adv-weak-alignment-collapse` -> `weak_job_alignment`
    - `adv-evidence-mismatch-inject` -> `evidence_mismatch`
    - `adv-weak-differentiation-collapse` -> `weak_differentiation`
  - adversarial fixture results are deterministic and all detected in latest run
  - artifact preflight explicitly reports execution context:
    - requested/resolved mode
    - replay fixture path + existence
  - artifact now includes `aggregate.founder_readability` with:
    - gate status
    - case-by-case quality snapshot
    - weakest cases
    - failure-mode summary
    - adversarial fixture detection summary
    - recommended actions
- Upstream evidence-selection quality improvements are implemented in canonical selection path:
  - canonical selector scoring/suppression now penalizes low-specificity/generic and multi-cluster-monopoly evidence more strongly
  - context-coverage pressure increased (`context_specific_cluster` + dominant context coverage targets)
  - reuse suppression now has stronger score impact when recent selection context is present
  - canonical selector is shared to live CV audit via `buildTailoringPlanForCv`
- Live-mode CV quality artifact now better reflects selection quality outcomes:
  - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-005-before.json` vs `...after-v9.json`
  - overall score improved `10.5 -> 11.17`
  - adjacent overlap ratio average improved `0.8667 -> 0.4667`
  - adjacent enforced failure modes now pass in live artifact (`generic_rewrite`, `fake_tailoring`, `weak_differentiation`)
- Mixed-case telemetry hardening (P0-006) is implemented and verified:
  - baseline/after artifacts:
    - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-006-before.json`
    - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-006-after-v4.json`
  - weakest mixed pair (`job-04` vs `job-13`) improved from pair score `1 -> 2`
  - mixed pair count with `pair_score < 2` improved `1 -> 0`
  - representative-case totals/relevance/ownership/integrity remained stable (no regression)
- Ownership-warning noise reduction (P0-007) is implemented and verified:
  - baseline/after artifacts:
    - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-007-before.json`
    - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-007-after.json`
  - representative ownership warnings removed:
    - `job-01`: ownership `1 -> 2` and reason `ownership_violations_major=0,minor=1 -> ownership_alignment_clean`
    - `job-04`: ownership `1 -> 2` and reason `ownership_violations_major=0,minor=1 -> ownership_alignment_clean`
  - diagnosis-backed fix:
    - prior scoring looked at whole-bullet first token, so label prefixes (for example `Drove localized growth:`) were misread as ownership inflation
    - scoring now reads the action clause (post-label) for lead-verb ownership checks
  - no regressions observed in representative relevance/integrity dimensions
- JD extraction deterministic fixture passes:
  - `artifacts/jd-extraction-summary.json` pass_count `1/1`, pass_rate `1`
- Extension lifecycle terminal-state checks pass:
  - `artifacts/extension-lifecycle-summary.json` passed_tests `9/9`
  - stale-response guard + bounded retry checks present
- Sidepanel Analyze request path hardening (P0-009) is implemented and verified:
  - exact cause found in request-layer fallback behavior:
    - extension Analyze currently tried legacy `/api/job-copilot/extension/run` first
    - on first-candidate network exception (`Failed to fetch`), loop exited early and never attempted canonical `/api/job-copilot/extension/analyze`
  - minimal fix applied in extension API client:
    - canonical `/api/job-copilot/extension/analyze` is now first candidate
    - network failure on first candidate now continues to fallback candidate instead of immediate fail
  - verify status preserved (`npm run verify` passed)
- Sidepanel Analyze runtime error fix (P0-010) is implemented and verified:
  - exact root cause:
    - `normalizeSelectionDebug` in `analysis-service.js` called `normalizeStringList(...)` for guiding-pool and selection-summary normalization
    - no `normalizeStringList` existed in that function scope, causing runtime `ReferenceError`
  - minimal fix applied:
    - added a shared `normalizeStringList` helper in `normalizeAnalyzeData` scope
    - no contract/schema/UI/surface changes
  - runtime validation:
    - targeted Analyze harness now returns `state: ready` with no `normalizeStringList` exception
  - verify status preserved (`npm run verify` passed)
- Apply with tailored CV download failure fix (P0-011) is implemented and verified:
  - exact root cause:
    - `writeAppliedPipelineAction` wrote extended `user_job_actions` columns (`source_platform`, `location`, `job_description_snapshot`, `match_score`, `verdict`, `selected_evidence_ids`, `applied_at`)
    - live Supabase `user_job_actions` schema in this environment does not include those columns (returns `PGRST204` missing-column errors, for example missing `applied_at`)
  - minimal fix applied:
    - compatibility write now inserts only guaranteed legacy columns (`user_id`, `profile_id`, `job_url`, `job_title`, `company`, `action`)
    - no schema/contract/UI changes
  - runtime validation:
    - direct Supabase probe of `writeAppliedPipelineAction` now inserts successfully (and cleanup delete succeeds)
    - end-to-end service probe of `downloadTailoredResumeAndMarkApplied` now returns success with resume text and applied record
    - direct route probe of `app/api/job-copilot/extension/download-resume` `POST` now returns `200` with `success=true` and non-empty `resume_text`
  - verify status preserved (`npm run verify` passed)
- Tailored CV instruction-leakage guard (P0-012) is implemented and verified:
  - exact contamination source identified:
    - role-context `positioningHints` include planning text such as `Prepare one concrete example to de-risk ...`
    - those hints were normalized into `globalEmphasis` and merged into selected evidence `emphasis_tags`
    - resume rewrite used `emphasis_tags` for primary signal selection, allowing planning text to become final bullet text
  - minimal root-cause fix applied:
    - removed `positioningHints` from resume emphasis propagation in canonical and fallback tailoring-plan builders
  - hard final-output guard added:
    - final resume bullet assembly now strips/blocks known internal instruction text classes before delivery
    - guarded for both `experience` bullets and `tailored_evidence` bullets
  - targeted runtime proof:
    - injected leak phrase (`Prepare one concrete example to de-risk ...`) in test harness no longer appears in final bullet output
  - verify status preserved (`npm run verify` passed)
- Post-fix final-output validity review (P0-013) completed on regenerated live EPAM case:
  - regenerated via analyze -> download flow for:
    - job URL `https://www.linkedin.com/jobs/view/4347757870`
    - job title `Senior Manager, Data Analytics Consulting | EPAM Systems`
  - output artifact:
    - `artifacts/tailored-cv-regenerated-after-leak-fix.epam.json`
  - instruction leakage checks in final resume text all clear:
    - no `Prepare one concrete example ...`
    - no `to de-risk`
    - no quick-check/save-confirmation internal text
  - confirms leakage fix is effective in final output path for this live case
- Final bullet validity/ownership-safe assembly fix (P0-014) implemented and verified:
  - exact malformed-assembly source identified in `resume-rewriter`:
    - label-style primary-signal prefixing allowed noisy acronym signals (for example `CI/CD`) to render as bullet heads
    - ownership helper assembly could stack with verb-led evidence clauses (`Contributed to Presented ...`, `Contributed to Identified ...`)
    - truncation could leave dangling ordered-list tails (for example trailing `3)`)
  - minimal fix applied:
    - acronym-like primary signals now treated as generic fallback signals
    - bullet sentence assembly no longer prepends label-style `primarySignal:` text
    - ownership-safe helper assembly now strips leading action verbs before combining helper + clause (prevents stacked malformed phrases)
    - leading-label cleanup widened for short slash labels (for example `CI/CD:`)
    - truncation sanitizer removes dangling ordered-list tails and trailing orphan colons
  - live regenerated EPAM output checks now pass:
    - no `CI CD:` prefix bullets
    - no `Contributed to Presented`
    - no `Contributed to Identified`
    - no `Contributed to Lead`
    - leakage guard still clear (`prepare example` / `de-risk` absent)
  - verify status preserved (`npm run verify` passed)
- Role-specific phrasing quality pass (P0-015) implemented and verified:
  - ownership-safe phrasing improved:
    - unconfirmed bullets now use natural ownership-safe helper phrasing (`Supported ...`) instead of awkward `Contributed to ...`
  - repetitive method-impact tails reduced:
    - method/impact suffix is now suppressed when evidence clause already carries strong impact/method context
    - forced fallback anchor suffix (`for ...`) removed to avoid generic tail contamination
  - role-specific summary emphasis strengthened:
    - summary cue derivation now incorporates target-role context (consulting + executive decision support + commercial analytics signals)
    - redundant generic theme phrase collapse added (for example bare `leadership` when stronger leadership phrase already present)
  - live regenerated EPAM output artifact:
    - `artifacts/tailored-cv-regenerated-after-p0-015.epam.v3.json`
    - checks confirm: no leakage, no malformed helper stacking, zero generic-tail pattern occurrences
  - verify status preserved (`npm run verify` passed)
- Generic generator-quality refinement pass (P0-016) implemented and verified:
  - ownership-safe opening variety improved with evidence/context-derived safe verbs (not hardcoded case text)
  - within-experience bullet ordering now uses deterministic strongest-first prioritization
  - summary opening now uses role-positioning framing with role-cue de-duplication/prioritization
  - before/after EPAM artifacts:
    - before: `artifacts/tailored-cv-regenerated-after-p0-015.epam.v3.json`
    - after: `artifacts/tailored-cv-regenerated-after-generic-quality-pass.epam.v2.json`
  - after artifact checks remain clean:
    - `has_prepare_example=false`
    - `has_de_risk=false`
    - `has_label_prefix=false`
    - `has_helper_stacking=false`
    - `generic_tail_count=0`
    - `summary_has_positioning_signal=true`
    - `summary_has_target_phrase=true`
  - verify status preserved (`npm run verify` passed)
- Cross-case generic generator validation pass (P0-017) implemented and verified:
  - validation set (6 diverse cases):
    - strong-fit: `job-01`, `job-06`
    - borderline/medium: `job-04`, `job-05`
    - low-fit/different: `job-13`, `job-14`
  - regenerated outputs artifact:
    - `artifacts/tailored-cv-behavior-audit-inputs.p0-017.json`
  - live gate artifact on same set:
    - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-017-live.json`
    - `overall_score=10.67`, `verdict=production_ready`, deterministic hash stable
    - all enforced failure modes passing; adversarial coverage/detection/determinism passing
  - per-case validation artifact:
    - `artifacts/tailored-cv-generic-validation.p0-017.json`
    - ownership-safe phrasing variety pass `6/6`
    - strongest-first ordering pass `6/6`
    - summary positioning pass `6/6`
    - leakage/malformed/helper-stacking safety pass `6/6`
  - residual weaknesses surfaced:
    - mixed-pair telemetry still emits generic/fake-tailoring patterns for `job-04` vs `job-13`
    - `job-05` remains watch-level in gate scoring (`relevance=0`)
    - summary second sentence heavily reused across roles (`reused_second_sentence_max=6`)
    - low-fit cases still receive over-confident summary themes (`job-13`, `job-14`)
- Generic summary calibration pass (P0-018) implemented and verified:
  - summary generation now applies fit-sensitive confidence bands (`strong` / `borderline` / `cautious`) from generic alignment signals
  - summary sentence templates now vary deterministically by role/context to reduce cross-case reuse
  - low-fit summaries now use explicit transferable/cautious tone rather than over-confident framing
  - validation artifacts:
    - `artifacts/tailored-cv-behavior-audit-inputs.p0-018.v2.json`
    - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-018-live.v2.json`
    - `artifacts/tailored-cv-generic-validation.p0-018.json`
  - measured improvements vs P0-017 baseline:
    - summary second-sentence reuse max reduced `6 -> 3`
    - low-fit overconfident summaries reduced `{job-13,job-14} -> {}`
    - live gate overall score improved `10.67 -> 10.83`
  - safety and determinism preserved:
    - no leakage/helper-stacking/malformed regressions in validation set
    - live gate deterministic hash stable and enforced failure modes passing
- Canonical extension runtime APIs are implemented:
  - `/api/job-copilot/extension/analyze`
  - `/api/job-copilot/extension/recalibrate`
  - `/api/job-copilot/extension/download-resume`
  - `/api/job-copilot/extension/save-quick-check-memory`
- Canonical resume generation route is implemented:
  - `/api/resume/generate` backed by `lib/career-engine/copilot/resume-copilot/*`
- Resume upload/materialization path is implemented:
  - `/api/parse-resume` writes careers/experiences/evidence/capability + signal links
  - canonical + compatibility link writes are explicitly marked in code comments

### Partial (implemented but incomplete / constrained)
- Full-repo TypeScript health is not clean:
  - `artifacts/typescript-debt-summary.json` shows `total_error_count: 106`
  - core canonical-path debt remains `23` (all in `lib/career-engine/job-copilot/backend/job-copilot-service.ts`)
  - verify currently treats debt audit as informative, not failing gate
- Verification coverage is still narrow in critical areas:
  - verify test step only runs `tests/test-matching-fixtures.ts`
  - JD extraction verification currently uses one fixture case
  - live Supabase CV audit is still non-default (canonical verify remains replay mode)
  - no end-to-end browser automation for extension UI in verify loop
- CV adversarial coverage is implemented but still has blind spots:
  - adversarial fixtures are synthetic injections over computed audit outputs (not end-to-end generation sabotage fixtures)
  - replay seed must be refreshed intentionally when live canonical behavior changes
- Extension multi-platform support is partial:
  - content extraction supports LinkedIn/Seek/Greenhouse/Lever
  - backend source mapping currently collapses non-Seek platforms to LinkedIn contract
- Repo contains active compatibility/legacy paths alongside canonical paths; separation is documented but still increases maintenance/debug surface.
- Live regenerated CV quality still has residual quality constraints:
  - role-family translation now applies in both summary and bullet rendering, but top-bullet evidence emphasis can still lean on shared analytics-heavy evidence in some cross-family cases
  - summary second-sentence reuse is reduced but remains non-zero across diverse cases

### Missing (not implemented as product capability)
- Interview Copilot is not implemented as an actual backend product flow:
  - sidepanel has "Prepare interview now" UI action, but no interview API/runtime module
  - current behavior is a continuation message only
- Promotion Copilot / Performance Review Copilot / Career Transition Copilot product flows are absent (out of current phase scope).
- Canonical migration chain under `supabase/migrations/*` does not clearly create all runtime memory tables (`careers`, `experiences`, `evidence_pieces`, `capabilities`, `jobs`, `job_signals`) from scratch; those table creates appear in legacy compatibility SQL (`supabase/migationcodex.sql`). This is a canonical reproducibility gap.

## Known Problems
- Core-path TS debt concentrated in `job-copilot-service.ts` increases change risk.
- Verify pass can coexist with full-repo typecheck failure.
- Canonical schema provenance is partially split between migration chain and legacy compatibility SQL.
- Legacy endpoints remain present and can cause path confusion if accidentally used for new development.
- Tailored CV artifact still records some telemetry pattern strings from mixed/adjacent pair comparisons; only severity-qualified adjacent conditions currently block the gate.
- Adversarial fixtures currently mutate in-memory audit structures rather than replaying prebuilt degraded resume outputs end-to-end.
- Replay-mode default reduces live dependency for verify, but still requires periodic live-mode audit sanity checks.
- Extension runtime still depends on configured/reachable `apiBaseUrl`; if it points to an unreachable host, Analyze will still fail at network layer.
- Compatibility table drift risk remains for non-canonical `user_job_actions`; this is now mitigated for Apply by writing only baseline columns.
- Resume output guard is currently pattern-based; newly introduced internal text classes may require explicit pattern extension.
- Summary-role specificity remains partially generic across cross-case outputs despite role-positioning format improvements.
- Role-family mode routing is now present in summary and bullets, but family-specific first-bullet evidence emphasis is not yet consistently dominant across all families.
- Environment/schema drift persists for `job_matches.action_plan` in this runtime (column unavailable); download flow currently depends on runtime fallback inputs instead of persisted tailoring plan in this environment.

## Latest Verification Summary
- Command: `npm run verify`
- Date: 2026-03-24 local (artifact timestamp UTC 2026-03-23T23:30Z)
- Result: passed
- First failing step: none
- Core-path TS debt count: 23
- Matcher regression status: passed
- Tailored CV quality status: passed
- Extension lifecycle regression status: passed
- Recommended action from verify artifact: reduce core-path TS debt and rerun verify (deferred by product-priority directive)

## Product Signal (CV Quality)

- Current CV quality: enforced by canonical verify
- Observed behavior:
  - Tailored CV quality audit is a required verify step (`--enforce`)
  - determinism and quality criteria are checked each verify run
  - representative case coverage and failure-mode checks are explicit and machine-readable
  - adversarial fixtures now explicitly prove each enforced failure mode is detected
  - replay-mode verify result remains stable/passed (`tailored_cv_quality_status: passed`)
  - live-mode evidence-selection audit improved after P0-005:
    - `overall_score=11.17`, `verdict=production_ready`, deterministic hash stable
    - representative case improvements include:
      - `job-06` total `10 -> 12`, relevance `1 -> 2`
      - `job-05` total `11 -> 12`
      - `job-14` total `10 -> 11`, relevance `1 -> 2`
  - live-mode mixed-case telemetry hardening after P0-006:
    - overall score preserved (`11.33 -> 11.33`)
    - no pattern regressions (`patterns=[]` in before/after)
    - weakest mixed pair `job-04/job-13` pair score improved `1 -> 2`
    - mixed weak-pair count (`pair_score < 2`) reduced `1 -> 0`
  - live-mode ownership-warning cleanup after P0-007:
    - overall score improved (`11.33 -> 11.67`)
    - `job-01` ownership reason moved to `ownership_alignment_clean`
    - `job-04` ownership reason moved to `ownership_alignment_clean`
    - all enforced failure modes remained passing
  - regenerated EPAM CV after P0-016 now shows:
    - varied safe openings (`Presented`, `Helped lead`, `Identified`, `Developed`, `Partnered on`) instead of repetitive `Supported`
    - role-positioning summary opening (`positioned for ... roles`) instead of generic profile-style opening
    - preserved leakage/malformed guards (all checks clean in artifact)
  - cross-case validation after P0-017 now confirms:
    - per-case safety/variety/ordering checks pass across the 6-case set
    - live gate still production-ready and deterministic
    - remaining weakness is not validity breakage but specificity calibration (summary reuse + weak mixed pair telemetry)
  - cross-case validation after P0-018 now confirms:
    - summary reuse reduced and low-fit tone calibrated to cautious/transferable language
    - no regression in safety/ordering checks (`6/6` pass on validation checks)
    - live gate remained production-ready and deterministic (`overall_score=10.83`)
    - remaining weakness narrowed to mixed-pair telemetry + one watch-level case drift
  - mixed-pair refinement after P0-019 now confirms:
    - fit-sensitive evidence budget is applied in canonical selection (`overall_match_score < 0.66` -> 4 selected evidence items)
    - weakest mixed pair (`job-04`/`job-13`) overlap reduced (`shared_evidence_count 4 -> 3`)
    - `generic_rewrite_detected_between_job-04_and_job-13` is cleared in latest live run
    - residual telemetry remains: `fake_tailoring_detected_between_job-04_and_job-13`
    - deterministic live gate remained stable and production-ready (`overall_score=10.83`, stable hash)
  - framing refinement after P0-020 now confirms:
    - resume bullet rewriter receives fit signal even in canonical resume-generation path (fallback to `job_analysis.match_score`)
    - weakest mixed pair (`job-04`/`job-13`) fake-tailoring telemetry cleared in live run:
      - baseline (`p0-019-live.v3`): `after_similarity=0.8965`, `similarity_delta=-0.0412`, pattern present
      - after (`p0-020-live.v6`): `after_similarity=0.8421`, `similarity_delta=0.0132`, pattern cleared
    - live gate remained deterministic and production-ready (`overall_score=11.17`, stable hash)
    - representative-case quality judgments in live run are all `strong` (no watch/failing case)
  - tone-calibration refinement after P0-021 now confirms:
    - medium/strong-fit transferable-tail overuse reduced on representative strong-fit set (`job-01`,`job-04`,`job-06`: `7 -> 0`)
    - lower-fit caution framing preserved (`job-13`,`job-14` retain transferable role-context framing where appropriate)
    - mixed-pair protection preserved (`patterns=[]`, `job-04/job-13 after_similarity 0.8421 -> 0.8371`)
    - safety/determinism preserved:
      - leakage/helper-stacking/malformed checks remained clean in behavior artifact scan
      - live gate deterministic hash stable
      - canonical `npm run verify` remained passed
  - specificity recovery refinement after P0-022 now confirms:
    - strong/upper-medium fit bullets gain direct role-cue specificity without reintroducing transferable wording in stronger-fit cases
    - representative strong-fit transferable tails remain `0` (`job-01`,`job-04`,`job-06`)
    - mixed-pair protection remains stable (`patterns=[]`) with additional improvement on weakest mixed pair (`after_similarity 0.8371 -> 0.8272`)
    - safety protections remain intact:
      - no instruction leakage/malformed/helper-stacking regressions in behavior audit scan
      - canonical verify remained passed (`tailored_cv_quality_status: passed`)
    - residual note: strong-fit differentiation score remained stable rather than fully recovering (`job-04` remained `11`, differentiation `1`)
  - differentiation recovery refinement after P0-023 now confirms:
    - top-position strong-fit role anchoring improved direct high-signal phrasing while keeping strong-fit transferable tails at `0`
    - mixed-pair protection remained clear (`patterns=[]`) with deterministic stability preserved
    - safety protections remained intact (no leakage/malformed/helper-stacking regressions; verify passed)
    - target numeric recovery completed (`job-04` differentiation `1 -> 2`, total `11 -> 12`)
  - role-family summary-mode routing refinement after P0-025 now confirms:
    - summary routing mode now recorded as `summary_debug.role_family_mode_used` and resolves across four families on evaluated set (`analytics_commercial`, `research_client`, `technical_builder`, `enterprise_governance`)
    - evaluated 12-case role-family run moved from unknown/no-mode output to explicit mode distribution:
      - before (`artifacts/tailored-cv-behavior-audit-role-family.v1.json`): `unknown=12`
      - after (`artifacts/tailored-cv-behavior-audit-role-family.v4.json`): `analytics_commercial=4`, `research_client=3`, `technical_builder=2`, `enterprise_governance=3`
    - summary narrative diversity improved on same set:
      - unique second-sentence variants `5 -> 9`
    - verify safety preserved:
      - `npm run verify` passed (`tailored_cv_quality_status: passed`)
  - role-family bullet language-mode refinement after P0-026 now confirms:
    - bullet renderer now records per-bullet mode in debug (`rewrite_input.role_family_mode`) and applies family-conditioned cue/framing phrases
    - evaluated 12-case role-family run (`artifacts/tailored-cv-behavior-audit-role-family.v6.json`) shows stable mode coverage:
      - summary modes: `analytics_commercial=4`, `research_client=3`, `technical_builder=2`, `enterprise_governance=3`
      - bullet modes: `analytics_commercial=20`, `research_client=16`, `technical_builder=11`, `enterprise_governance=16`
      - per-case bullet mode mismatch count: `0`
    - representative family-language shifts on evaluated cases:
      - `job-03` (`research_client`): `...for product analytics priorities` -> `...for research and reporting priorities`
      - `job-10` (`technical_builder`): `...as transferable support for transformation delivery` -> `...as transferable support for technical implementation`
      - `job-05` (`enterprise_governance`): `...as transferable support for transformation delivery` -> `...as transferable support for enterprise governance`
    - verify safety preserved:
      - `npm run verify` passed (`tailored_cv_quality_status: passed`)

- Risk:
  - canonical verify replay path depends on seed quality/freshness
  - live audit still depends on Supabase profile/career availability

- Required direction:
  - maintain clean ownership telemetry while improving adversarial realism beyond synthetic in-memory mutations

## Recently Completed
- Repository control-state reconstruction completed using code + scripts + artifacts.
- Control documents updated from bootstrap placeholders to evidence-backed operational state.
- CV quality verification gate added to canonical `npm run verify` and validated passing.
- CV quality gate expanded to 6 representative requirement-profile cases.
- Failure-mode enforcement and founder-readable artifact summary added to tailored CV audit output.
- Deterministic adversarial fixtures added for all six enforced CV failure modes, with explicit fixture-to-mode mapping and detection assertions in artifact output.
- Deterministic replay/offline-friendly CV gate path added and wired into canonical verify.
- QUEUE-P0-005 completed:
  - canonical evidence selector strengthened for role-specific precision and reduced generic reuse
  - live audit now uses canonical selector with deterministic rolling recent-selection context
  - differentiation scoring in live audit updated to blend shared-evidence and global-output similarity when overlap is moderate
- QUEUE-P0-006 completed:
  - mixed-pair differentiation telemetry hardened for realistic cross-role interpretation
  - weakest mixed pair (`job-04` vs `job-13`) moved from weak telemetry score to healthy score without relevance/integrity regression
  - canonical verify replay path and adversarial detection remained fully passing
- QUEUE-P0-007 completed:
  - ownership-warning false positives on `job-01` and `job-04` removed with action-clause lead-verb detection
  - representative ownership scores improved (`1 -> 2`) without relevance/integrity regression
  - canonical verify replay path and adversarial checks remained fully passing
- QUEUE-P0-009 completed:
  - sidepanel Analyze request path now prefers canonical `/api/job-copilot/extension/analyze`
  - request-layer fallback no longer aborts on first-candidate network error, reducing `Analyze request failed (Failed to fetch)` from legacy-first path failures
  - canonical verify remained passed after change
- QUEUE-P0-010 completed:
  - fixed Analyze runtime `ReferenceError` (`normalizeStringList is not defined`) in response normalization path
  - `normalizeStringList` now resolved from `normalizeAnalyzeData` helper scope for `normalizeSelectionDebug`
  - targeted Analyze harness confirms `state: ready` with no runtime exception
  - canonical verify remained passed after change
- QUEUE-P0-011 completed:
  - fixed Apply-with-tailored-CV crash caused by stale `user_job_actions` extended-column writes
  - `record applied action` now writes compatibility-safe baseline columns only
  - targeted live probes confirm both direct action-write success and end-to-end download success
  - canonical verify remained passed after change
- QUEUE-P0-012 completed:
  - traced and fixed instruction leakage path from role-context positioning hints into resume bullet emphasis tags
  - added final-output guard to prevent planning/quick-check instruction text classes from shipping in resume bullets
  - verified no regression in canonical verification loop (`npm run verify` passed)
- QUEUE-P0-013 completed:
  - regenerated live tailored CV for the previously affected EPAM case after leakage fix
  - validated that instruction/planning text no longer appears in final resume output
  - documented remaining output-quality defects and prioritized next product task accordingly
- QUEUE-P0-014 completed:
  - fixed malformed final bullet assembly in `resume-rewriter` (noisy label prefixing + helper/verb stacking + dangling list-tail truncation)
  - regenerated the same EPAM case and confirmed malformed constructions are removed while leakage guard remains effective
  - canonical verify remained passed after change
- QUEUE-P0-015 completed:
  - improved ownership-safe phrasing naturalness and removed repetitive generic method-impact tails
  - strengthened role-specific summary cues for consulting/executive-decision-support/commercial-analytics context
  - regenerated the same EPAM case and confirmed cleaner phrasing with preserved leakage and malformed-bullet protections
  - canonical verify remained passed after change
- QUEUE-P0-016 completed:
  - added generic ownership-safe verb variety logic in resume rewrite path
  - added deterministic strongest-first bullet ordering in final resume output assembly
  - upgraded summary opening to role-positioning format with role-cue prioritization and de-duplication
  - regenerated same EPAM case and confirmed cleaner varied bullet starts and stronger role-positioned summary without regressions
  - canonical verify remained passed after change
- QUEUE-P0-017 completed:
  - ran diverse live cross-case regeneration + validation (`job-01`,`job-06`,`job-04`,`job-05`,`job-13`,`job-14`)
  - confirmed generic improvements generalize on safety/variety/ordering checks across all validated cases
  - validated live gate remains production-ready/deterministic with all enforced failure modes passing
  - documented residual cross-case weaknesses and prioritized next generic task
- QUEUE-P0-018 completed:
  - implemented generic fit-sensitive summary calibration and deterministic template diversification in summary builder
  - reduced summary reuse and calibrated low-fit summaries to cautious/transferable framing
  - preserved leakage/malformed/ordering protections and deterministic live gate behavior
  - validated improvements and captured before/after deltas in `artifacts/tailored-cv-generic-validation.p0-018.json`
- QUEUE-P0-019 completed:
  - added generic fit-sensitive evidence budget in canonical selector (`overall_match_score < 0.66` -> 4 evidence selections)
  - live mixed pair (`job-04` vs `job-13`) overlap reduced (`shared_evidence_count 4 -> 3`, `overlap_ratio 0.8 -> 0.75`)
  - mixed `generic_rewrite` telemetry cleared for the weakest pair; residual `fake_tailoring` telemetry remains
  - deterministic live audit remained stable (`artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-019-live.v3.json`)
  - canonical verify remained passed (`npm run verify`)
- QUEUE-P0-020 completed:
  - fixed fit-signal propagation gap in canonical resume output path by passing rewrite fallback `overallMatchScore` from `job_analysis.match_score` when capability-match context is unavailable
  - weakest mixed pair (`job-04` vs `job-13`) residual fake-tailoring telemetry cleared in live validation
  - before/after live evidence:
    - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-019-live.v3.json` (pattern present)
    - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-020-live.v6.json` (pattern cleared, deterministic stable)
  - behavior audit remained stable and summary reuse stayed controlled (`second_sentence_reuse_max=3`)
  - canonical verify remained passed (`npm run verify`)
- QUEUE-P0-021 completed:
  - added explicit match-score hint plumbing into resume generation (`options.overallMatchScore`) and passed capability-match score where available
  - tuned transferable-tail rules to keep stronger-fit bullets direct while preserving caution framing in lower-fit contexts
  - representative strong-fit readability improved (transferable tails reduced `7 -> 0` across `job-01`,`job-04`,`job-06`)
  - mixed-pair safety preserved (`job-04/job-13` pattern remained cleared; after-similarity further reduced `0.8421 -> 0.8371`)
  - leakage/malformed/helper-stacking checks remained clean and canonical verify remained passed
- QUEUE-P0-022 completed:
  - added narrow strong-fit/upper-medium role-cue anchoring in non-transferable rewrite path to recover direct role-specific signal
  - preserved P0-021 tone gains:
    - no strong-fit transferable-tail regression (`job-01`,`job-04`,`job-06` remained `0`)
    - no low-fit overconfidence rollback (`job-13`,`job-14` caution framing preserved)
  - mixed-pair protection remained clear and improved on weakest pair (`after_similarity 0.8371 -> 0.8272`)
  - leakage/malformed/helper-stacking checks remained clean (`artifacts/tailored-cv-behavior-audit-inputs.p0-022.v4.json`)
  - canonical verify remained passed (`npm run verify`)
- QUEUE-P0-023 completed:
  - added narrow top-position strong-fit emphasis tuning in output assembly (direct role-anchor emphasis on highest-signal bullets; no transferable wording)
  - preserved P0-021/P0-022 gains:
    - strong-fit transferable tails remained `0`
    - low-fit caution framing remained in place
    - mixed-pair protection remained clear (`patterns=[]`)
    - leakage/malformed/helper-stacking checks remained clean (`artifacts/tailored-cv-behavior-audit-inputs.p0-023.v5.json`)
  - canonical verify remained passed (`npm run verify`)
  - target numeric differentiation recovery completed:
    - `artifacts/tailored-cv-bullet-rewrite-audit-v1.p0-022-live.v4.json` -> `...p0-023-live.v5.json`
    - `job-04` differentiation `1 -> 2`, total `11 -> 12`
- QUEUE-P0-025 completed:
  - added generic role-family summary mode router in `resume-summary-builder` with four modes:
    - `analytics_commercial`
    - `research_client`
    - `technical_builder`
    - `enterprise_governance`
  - added family-specific summary theme seeding/prioritization and family-conditioned sentence-2 narrative templates
  - added founder-readable summary debug trace field:
    - `summary_debug.role_family_mode_used`
  - evaluated behavior evidence (12-case role-family set):
    - mode distribution moved from `unknown=12` -> explicit four-family routing
    - unique second-sentence variants improved `5 -> 9`
  - canonical verify remained passed (`npm run verify`)
- QUEUE-P0-026 completed:
  - added generic role-family bullet language-mode routing in `resume-rewriter` with family-conditioned:
    - role cue selection
    - transferable-tail framing
    - ownership-safe support verb fallback
    - method/impact phrase selection
  - threaded job target title/family into bullet rewrite context from `resume-output-builder`
  - added founder-readable bullet trace metadata:
    - `resume_debug.experiences[*].bullets[*].rewrite_input.role_family_mode`
  - validated on 12-case role-family set (`artifacts/tailored-cv-behavior-audit-role-family.v6.json`):
    - summary mode distribution preserved
    - bullet mode coverage explicit across four families
    - per-case bullet-mode mismatch count reduced to `0`
  - canonical verify remained passed (`npm run verify`)

## Snapshot Blockers At Capture Time
- No hard runtime blocker in canonical verify loop.
- Deferred engineering debt: unresolved core-path TS debt in canonical Job Copilot backend service.
- Architecture/process blocker: migration source-of-truth inconsistency for core runtime table creation.
- Verification realism gap: adversarial fixtures are still synthetic in-memory mutations rather than end-to-end degraded-output replay cases.
- Extension configuration dependency: unreachable/misconfigured `apiBaseUrl` can still produce network-layer Analyze failures.

## Next Recommended Task At Capture Time
- QUEUE-P0-027: strengthen role-family top-bullet evidence emphasis so first bullets consistently foreground family-defining evidence concepts instead of shared/default analytics framing.

## Notes
- This state is grounded in repository evidence gathered in late March 2026 local time.
- Classification uses:
  - working = implemented and currently verified by canonical loop/artifacts
  - partial = implemented but constrained/unverified in key dimensions
  - missing = capability not present in codepath
- Confidence remains partial where live data/runtime behavior is not covered by deterministic verify artifacts.
