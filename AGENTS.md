# CareerTwin Execution Constitution

Document role: **authoritative current execution policy** for this repo.
For verification policy details, use `docs/control/verification/verify-strategy.md`.
For mechanics/inventory/history context, see `docs/control/verification/verification-loop.md`, `docs/control/verification/current-verify-inventory.md`, and `docs/control/*`.

## A) Repo Identity And Execution Mode
- CareerTwin is a human-centric career operating system, not only a resume or job-search utility.
- Founder-safe mode is mandatory: optimize for correctness, deterministic verification, low-regret changes, and minimal founder debugging burden.
- Use the smallest viable implementation by default. No architecture rewrite or broad refactor unless explicitly requested.

## B) Mandatory Source Docs
Use these docs as authority before implementation decisions:
- `docs/system_map.md`
- `docs/schema_inventory.md`
- `docs/canonical_schema.md`
- `docs/founder_notes/job_copilot_product_principle.md`
- `supabase/SCHEMA_SOURCE_OF_TRUTH.md`
- `docs/control/verification/verify-strategy.md`
- `docs/layer1-validation.md`
- `docs/cleanup-policy.md`
- `docs/artifact-policy.md`
- `docs/script-policy.md`
- `docs/product/careertwin-product-principles.md`
- `docs/product/careertwin-sidepanel-product-principles.md`
- `docs/product/why-you-buying-case-checklist.md`
- `docs/product/careertwin-ux-principles.md`
- `docs/control/lines/cv/job-copilot-cvline-architecture.md`
- `docs/control/job-copilot-proof-chain-audit.md`
- `docs/control/lines/cv/job-copilot-cvline-decision-template.md`

Stage-specific backlog lives in:
- `docs/backlog/job-copilot-current-backlog.md`

## C) Layer-First Diagnosis Rule
Job Copilot layers:
Layer 1 = LLM-led Role Reading + Thin Guard Contract Control
Layer 2 = Authoritative Contract Transport
Layer 3 = Proof and Output Grounding
Layer 4 = Consumer Rendering and Presentation

Diagnose by layer before code changes. Do not patch downstream symptoms when an upstream layer is the failure.

For every Job Copilot task, state before coding:
1. failing layer
2. reason for diagnosis
3. out-of-scope layers
4. allowed files
5. replay validation cases

## D) Verification Defaults
- `npm run verify:daily` is the default Level 1 daily verify entry for normal iterative work.
- `npm run verify` is Level 3 full baseline verify.
- Do not default to `npm run verify`, 20-case baselines, or 3-run repro loops for routine iteration.
- Escalate to heavier verification only with explicit justification and scope/risk reason. See `docs/control/verification/verify-strategy.md`.

## E) Layer 1 Validation Rule
For Layer 1 fixes, validate the drift chain explicitly:
- raw output
- parsed contract
- consumed / authoritative contract

Identify the first drift point before assigning root cause.
Do not label a case as a model problem unless raw output is already wrong.
Use 1-3 representative cases by default (include SCAR4 when relevant).
Details: `docs/layer1-validation.md`.

## F) Cleanup And Hygiene Rule
- Verification and cleanup are separate activities.
- Validate the fix first.
- Only then run a narrow post-fix hygiene pass adjacent to the accepted fix.
- Do not turn narrow fixes into broad cleanup refactors.

## G) Scope Discipline
- Keep fixes narrow and inside the diagnosed failing layer.
- Do not expand into renderer/downstream wording/CV unless required by the diagnosed failure.
- Do not change unrelated files while here.
- No silent schema changes, contract changes, or new canonical concepts.
- Respect canonical boundaries: no hidden matcher logic in UI/adapter layers.

## H) Founder-Readable Completion Output (Required)
Every substantial implementation response must end with:
1. Exact files changed
2. What was changed in plain language
3. Why this change was needed
4. Exact commands run
5. Verification result
6. Artifacts or outputs produced
7. Remaining blockers or risks
8. Any assumptions made

Also state one verification confidence status explicitly:
- fully verified
- partially verified
- compile-verified only
- blocked by environment
- blocked by missing fixture
- blocked by missing canonical verification

## I) Mandatory Skill Invocation Order

For substantial CareerTwin work, do not rely on ad hoc reasoning alone.
Use the repo skills in the following order when applicable.

### Global first
For any substantial CareerTwin task involving diagnosis, implementation planning, cleanup choice, refactor scope, verification scope, or architecture-boundary judgment:
- first apply `careertwin-founder-operating-rules`

This establishes:
- task type
- scope
- out-of-scope boundaries
- smallest safe next step
- proportional verification posture

### Job Copilot JD-line tasks
For Job Copilot work involving verdict drift, role-reading issues, contract meaning, proof alignment, recommendation mismatch, quick-check mismatch, or output inconsistency:
- apply `job-copilot-jdline-architecture`

This establishes:
- the fixed 4-layer ownership model
- which layer owns the problem
- which layers are explicitly out of scope

### Contract-fidelity / drift tasks
For any case where the main question is where meaning first drifted across the Job Copilot chain:
- apply `job-copilot-contract-harness`

This establishes:
- five-segment semantic trace
- broken invariants
- first drift point
- first writable fault when possible

### Audit-loop / decision-gate tasks
For any artifact review, loop-state judgment, narrow-fix gating, freeze-readiness question, rerun decision, or keep/revert/regroup decision:
- apply `job-copilot-audit-loop`

This establishes:
- artifact selection
- current mode
- whether a fix is allowed yet
- the main blocker
- the single safest next step

### Rule
Do not skip directly to implementation when the task is primarily diagnosis, drift review, artifact review, or repair gating.

## J) Execution Gates

These gates are mandatory.

### Gate 1 — No code change before first writable fault
Do not change code until all of the following are stated:
1. current task type
2. failing layer
3. why this layer is the failing layer
4. out-of-scope layers
5. first drift point
6. first writable fault
7. allowed files
8. replay validation cases or validation plan

If first writable fault is still unclear, remain in diagnosis or audit mode.

### Gate 2 — No broad verification before proportional local validation
Do not jump to full baseline verification by default.
Start with the narrowest proportional validation justified by:
- size of change
- blast radius
- whether shared paths were touched
- branch maturity
- residual pattern

### Gate 3 — No baseline admission from local evidence
A local replay win, targeted trace win, or owner-case improvement may justify:
- local keepable
but does not justify:
- global keep
- new active baseline
- freeze-ready language

Only a justified broader baseline measurement can grant baseline admission.

### Gate 4 — No cross-layer fix unless current layer is disproven
Do not patch a downstream layer while an upstream first-order failure still explains the issue.
Do not widen from one layer into multiple layers unless current evidence disproves the narrower layer diagnosis.

### Gate 5 — No mixed task mode unless explicitly requested
Do not silently combine:
- diagnosis
- implementation
- cleanup
- verification
- architecture work

If the task genuinely changes mode, state the new mode explicitly.

### Gate 6 — One main next action only
For substantial audit or repair-loop outputs, recommend exactly one main next step:
- hold for more diagnosis
- apply one narrow fix
- run narrow validation
- run broader remeasurement
- revert
- regroup

Do not recommend multiple competing programs at once unless explicitly requested.
## K) EM Decision Contract

For any substantial audit, repair loop, or architecture-boundary decision, the response must include:

### Required management fields
1. Current task type
2. Current MODE
3. Failing layer
4. First drift point
5. First writable fault
6. In-scope correction area
7. Out-of-scope areas
8. Allowed files
9. Proportional verification plan
10. Single main next action

### Required decision labels
Use one of:
- HOLD
- AUDIT
- REPAIR
- MEASURE
- KEEP
- REVERT
- REGROUP

Choose only the label that matches the current step.
Do not use freeze-ready or baseline-admission language without the required supporting evidence.

### Judgment language rule
Separate clearly:
- what is observed
- what is inferred
- what is still unproven
- what is being recommended
- why this is the smallest safe next step
