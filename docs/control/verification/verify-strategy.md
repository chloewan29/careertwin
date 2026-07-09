# Verify Strategy
This doc is the current source of truth for verification level selection, escalation, and default verification behavior across active development work.
## Goal
CareerTwin verification should not default to running the full 20-case baseline on every change.
Verification is split into 3 levels based on change scope and risk.

## Level 1: Local Verify
Used for small, local, single-layer changes.
Goal: confirm the local fix works.
Does not require full baseline.

## Level 2: Layer Verify
Used for core logic changes within one layer.
Goal: confirm that layer stability and adjacent-layer safety.
Does not default to full baseline.

## Level 3: Full Baseline Verify
Used before freeze, after cross-layer changes, or after architecture-sensitive changes.
Goal: confirm full-system baseline safety.
The current 20-case baseline belongs here.

## Default Rule
- Small changes -> Level 1
- Single-layer core changes -> Level 2
- Full 20-case baseline only at critical checkpoints

## Current Default Mapping

- `npm run verify` is treated as Level 3 / Full Baseline Verify.
- It should not be the default verification step for every small code change.
- Small or single-layer changes should not automatically use `npm run verify` unless the change is architecture-sensitive.

## Daily Default

For normal small or single-layer changes, the default verification should be a lighter daily verify path, not `npm run verify`.

This daily verify path is intended to:
- run faster than full baseline verify
- cover only the changed layer or local change scope
- be the normal default during iterative development

Exact command and implementation are not defined yet.

## First Daily Verify Candidate

The first version of daily verify should start by reusing an existing lightweight deterministic check, instead of introducing a new verification system immediately.

Current preferred starting point:
- `tests/test-matching-fixtures.ts`

Reason:
- already exists
- deterministic
- lightweight
- suitable as an initial Level 1 daily verify base

## Out of Scope for First Daily Verify

The first version of daily verify is not intended to replace full baseline verification.

It does not aim to cover:
- full-system regression checking
- Layer 1 fidelity / role-reading audits
- LLM reproducibility checks
- cross-layer architecture validation
- freeze / release-level verification

Those remain separate higher-level verification responsibilities.

## Current Operating Rule

For normal iterative development:
- do not default to `npm run verify`
- use a lightweight daily verify path first
- treat `npm run verify` as Level 3 only
- use full baseline verification only at critical checkpoints

At this stage, the first daily verify base is the existing deterministic fixture check, not a new verification system.
## Current Command Mapping

- `npm run verify:daily` = current Level 1 daily verify entry
- `npm run verify` = current Level 3 full baseline verify entry

`verify:daily` is only a lightweight deterministic daily check.
It does not replace full baseline verification.