# CareerTwin Execution Constitution

Mandatory source docs for implementation decisions:
- `docs/system_map.md`
- `docs/schema_inventory.md`
- `docs/canonical_schema.md`
- `docs/founder_notes/job_copilot_product_principle.md`
- `supabase/SCHEMA_SOURCE_OF_TRUTH.md`

## Project identity
- CareerTwin is a human-centric career operating system.
- It is not just a resume tool.
- It is not just a job search utility.
- Job search is one career moment, not the whole product.

## Product principle
- Career memory is the source of truth.
- Resume, interview, and positioning are projections of deeper career memory.
- Job Copilot should feel like an ambient companion during real job browsing.
- UX order: strengths first, then role capability context, then gaps and risks.
- Avoid generic AI job-tool drift.

## Canonical system layers
- Career Memory Engine
- Capability Engine
- Job Intelligence Engine
- Matching Engine
- Copilot Layer

Implementation must respect these layer boundaries. Do not move matcher logic into UI/adapter layers.

## Canonical core concepts
Canonical concepts (see `docs/canonical_schema.md`):
- EvidencePiece
- Capability
- CapabilityEvidenceLink
- JobRequirement
- JobSignal
- MatchResult

Do not introduce new synonyms or parallel concepts without explicit approval.

## Schema source of truth
- canonical schema path: `supabase/migrations/*`
- legacy compatibility-only artifacts:
  - `supabase/migration.sql`
  - `supabase/migationcodex.sql`
- do not use legacy schema artifacts for new runtime paths.

## Canonical vs legacy decisions
- `capability_signal_links` = canonical runtime traceability path.
- `capability_evidence_links` = legacy compatibility-only path.
- `types/index.ts` = legacy compatibility-only; canonical contracts are in `lib/career-engine/*`.
- Legacy endpoints and legacy `job_matches` semantics are compatibility-only and must not be used for new development.

## Change control rules
For every non-trivial task, state before coding:
1. goal
2. files to change
3. files not to change
4. schema change: yes/no
5. contract change: yes/no
6. new concepts introduced: yes/no
7. smallest viable implementation

## Hard prohibitions
- No architecture rewrite unless explicitly requested.
- No broad refactor unless explicitly requested.
- No new schema/types/concepts without explicit approval.
- No parallel `v2`/`final`/`fixed` files.
- No hidden matcher logic in UI/adapter layers.
- No silent contract changes.
- No silent schema changes.

## Coding style / implementation preferences
- Prefer smallest viable change.
- Prefer editing existing modules over duplicating files.
- Preserve working runtime behavior.
- Prefer explicit short comments when marking canonical/legacy/compatibility-only paths.
- Do not over-comment.

## Founder-readable output requirement
At the end of every substantial task, return:
- what changed
- what did not change
- schema changed: yes/no
- contract changed: yes/no
- concept names changed: yes/no
- founder summary
- remaining risks

# Founder Safe Execution Mode

This repository must be developed in a founder-safe way.
The founder is product-led and should not be forced into manual debugging, deep code inspection, or repeated technical verification.

All agents working in this repo must optimize for:
1. minimal founder debugging burden
2. deterministic verification
3. canonical architecture consistency
4. low-regret changes
5. founder-readable outputs

---

## Core rule

Do not treat code generation as success.
A task is only complete when the change has been validated through the repository verification loop and the output quality checks pass.

Do not claim success based only on:
- code compilation
- lint passing
- partial manual reasoning
- "this should work"
- unverified assumptions

---

## Required operating mode

All work must follow this sequence:

1. Understand the requested task and identify the smallest viable implementation scope.
2. Prefer the smallest possible code change that could solve the problem.
3. Reuse existing canonical flows, services, and data models.
4. Make the change.
5. Run the canonical verification command: `npm run verify`
6. Inspect the first failing step only.
7. Repair that failure with the smallest viable change.
8. Rerun `npm run verify`
9. Repeat until:
   - all checks pass, or
   - a hard blocker is reached

Never stop after a partial pass if downstream verification still fails.

---

## Change-size discipline

Agents must avoid broad rewrites unless explicitly requested.

Default rule:
- prefer narrow fixes over refactors
- prefer local corrections over architectural changes
- prefer adapting existing code over introducing new abstractions
- prefer stable deterministic logic over clever but fragile logic

Do not introduce large-scale rewrites to "clean things up" unless the task explicitly requires it.

Do not change unrelated files "while here".

Do not silently rename, relocate, or redesign major codepaths without explicit justification.

---

## Canonical architecture protection

CareerTwin must remain aligned to the canonical system architecture.

Current canonical direction:
- Career Memory Engine first
- Capability inference on top
- Job intelligence on top
- Match / Resume / Copilot flows built from canonical data
- internal engine first, then UI
- no premature MCP or platform abstraction unless explicitly requested

Agents must not bypass canonical entrypoints when an existing canonical path already exists.

Prefer existing canonical loaders, services, and graph-driven flows over one-off queries, duplicate logic, or UI-layer reimplementation.

Do not create parallel implementations of the same logic.

If a legacy path must remain for compatibility, mark it clearly as compatibility-only.

---

## Verification-first rule

Every meaningful code change must be validated through the repo verification loop.

Canonical validation entrypoint:
- `npm run verify`
- `npm run verify` must emit machine-readable artifacts under `artifacts/`.
- `artifacts/verify-summary.json` is the required top-level verification status artifact.

Required first-priority verification coverage:
- JD extraction quality checks.
- matcher quality checks.
- extension lifecycle terminal-state checks (no infinite loading/request states).

If `npm run verify` does not yet fully cover the changed area, the agent must:
1. say so explicitly
2. add the missing verification where reasonable
3. avoid claiming full confidence where no verification exists

The long-term repo standard is:
- compile
- tests
- replay cases
- output assertions
- machine-readable artifacts

---

## Output-quality rule

For this product, passing compilation is insufficient.

Verification must include output correctness, not only crash/build success.

Examples:
- JD extraction must be complete enough to be usable
- matcher output must be numerically valid and not obviously degraded
- extension requests must reach bounded terminal states
- resume tailoring must remain grounded in real evidence

Agents must not treat non-crashing garbage output as success.

---

## First-failure repair rule

When verification fails, always inspect and address the first failing step first.

Do not attempt to fix multiple speculative failures at once unless the root cause is clear and shared.

Do not stack many unrelated edits before rerunning verification.

Reason:
small repair loops are easier to validate, easier to trust, and less likely to create chaos.

---

## No speculative over-engineering

Do not introduce:
- MCP servers
- orchestration layers
- framework migrations
- generic plugin systems
- unnecessary abstractions
- broad type redesigns
- cross-repo style cleanups

unless explicitly requested by the founder.

This repo is currently optimizing for:
- working product behavior
- reliable verification
- canonical data flow
- founder speed and clarity

not abstract future extensibility.

---

## Anti-chaos rule

Agents must actively prevent the repo from drifting into a messy state.

Before changing code, check:
1. Is there already a canonical place this logic should live?
2. Is this change duplicating existing behavior?
3. Is this adding a second path where one should exist?
4. Is this change making future debugging harder?
5. Is this change larger than necessary?

If yes, reduce scope before proceeding.

---

## Self-debugging support rule

Agents should reduce future founder burden by improving machine-verifiable checks whenever practical.

Good examples:
- add replayable fixtures
- add output assertions
- add terminal-state checks
- emit machine-readable artifacts
- strengthen verify coverage
- document pass/fail criteria

Agents should prefer making the repo easier to self-validate over relying on founder inspection.

---

## Founder-readable completion output

Every implementation response must end with a founder-readable summary using this exact structure:

1. Exact files changed
2. What was changed in plain language
3. Why this change was needed
4. Exact commands run
5. Verification result
6. Artifacts or outputs produced
7. Remaining blockers or risks
8. Any assumptions made

Do not hide uncertainty.
Do not say "done" if verification is partial or failed.
Do not force the founder to inspect the raw diff just to understand what happened.

---

## Safe uncertainty rule

If confidence is incomplete, say exactly why.

Use one of these states explicitly:
- fully verified
- partially verified
- compile-verified only
- blocked by environment
- blocked by missing fixture
- blocked by missing canonical verification

Never present a guess as a confirmed result.

---

## UI / extension safety rule

For extension or async UI flows:
- loading states must be finite
- request lifecycle must end in explicit terminal states
- stale requests must be handled
- retries must be bounded
- infinite spinner states are considered failures

A UI flow is not fixed unless its terminal-state behavior is verified.

---

## Data grounding safety rule

For match, resume, and career intelligence flows:
- output must remain grounded in canonical evidence
- do not invent unsupported achievements
- do not mutate company/title/facts without evidence
- do not output placeholders, empty shells, or fake specificity

Plausible-looking but unsupported output is a failure.

---

## Documentation rule

If a new verification flow, fixture type, repair loop, or canonical development rule is added, update the relevant repo documentation in the same task when practical.

The repo should become easier to operate over time, not harder.

---

## Escalation rule

If a task cannot be safely completed without a larger architectural decision, stop and report:
- the blocker
- why it blocks safe completion
- the minimum decision needed

Do not bulldoze through uncertainty with a large speculative rewrite.

---

## Default priority order

When tradeoffs exist, optimize in this order:

1. correctness
2. verification
3. canonical consistency
4. minimal founder burden
5. minimal code churn
6. speed

Never optimize for speed by sacrificing trustworthiness.

---

## Repository mission in practice

This repo should evolve toward an agent-verifiable product development loop:
- make change
- run verify
- inspect failure
- repair
- rerun
- produce artifacts
- report clearly

The founder should increasingly act as product judge and direction setter,
not as manual debugger of every implementation attempt.
