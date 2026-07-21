# Artifact Residue Cleanup Log

## Scope
Minimal non-artifact residue cleanup only.
No broad historical artifact migration, no runtime behavior changes.

## Current truth boundary
This document should be read as a historical cleanup note and classification record, not as proof that the described move destinations still exist in the current tree.

Current repo evidence does not show these destinations:
- `scripts/artifact-residue/`
- `tmp/artifact-residue/tmp-extension-profile-test`
- `tmp/artifact-residue/tmp-extension-profile-test2`
- `artifacts/tmp-extension-profile-test`
- `artifacts/tmp-extension-profile-test2`

Because those paths are absent today, the sections below preserve prior cleanup intent and residue classification only.

## Historical cleanup intent noted in this pass

### 1) Script-like helper residue classification
- A prior cleanup note proposed moving `38` script-like files (`.ts`, `.js`, `.cjs`) out of `artifacts/`.
- The note referenced `scripts/artifact-residue/` and `scripts/artifact-residue/checkpoints/matcher-stable-2026-03-19/` as intended destinations.
- Current repo evidence does not show those destinations, so this should not be read as a verified current-state move completion record.

### 2) Profile/db-style residue classification
- A prior cleanup note also treated `artifacts/tmp-extension-profile-test` and `artifacts/tmp-extension-profile-test2` as non-canonical artifact residue.
- The note referenced `tmp/artifact-residue/tmp-extension-profile-test` and `tmp/artifact-residue/tmp-extension-profile-test2` as intended destinations.
- Current repo evidence does not show either the source directories or the destination directories, so this should not be read as a verified current-state move completion record.

## Why This Was Safe Now
- These items were classified as non-canonical artifact residue by policy (`docs/artifact-policy.md`).
- They were not intended to be part of canonical verify outputs written by `scripts/verify.ts`.
- The preserved point of this note is the cleanup rationale, not a present-tense claim that the move destinations remain in place today.

## Deferred In This Pass
- Historical JSON/MD audit/replay outputs under `artifacts/`.
- Dated `before/after/comparison` artifact families.
- Any broad namespace migration (`artifacts/history`, `artifacts/tmp`, etc.).
- Mass rename/delete operations.

## Why Broader Cleanup Is Deferred
- Needs retention policy and canonical allowlist enforcement decisions first.
- Broad movement risks churn across ongoing investigative workflows.
