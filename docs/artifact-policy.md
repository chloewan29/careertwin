# Artifact Policy

Document role: short boundary rule for `artifacts/` namespace usage.

## Top-Level Boundary

Top-level `artifacts/` is for **canonical/current artifact outputs** only.

It is the current-status surface for verification outputs, not a catch-all workspace.

## Categories

1. Canonical/current
- Current verification status artifacts (for example `verify-summary.json` and canonical step artifacts).
- These are the top-level outputs future work should treat as primary.

2. Historical/audit/replay
- Benchmark, replay, and historical audit outputs.
- These are useful evidence/history but are **not** top-level canonical status.

3. Tmp/ad hoc
- Temporary exploratory outputs (for example `tmp-*`).
- These should not live indefinitely in top-level `artifacts/`.

4. Non-artifact residue
- Helper scripts, profile directories, and environment residue.
- These do not belong in canonical artifact output space.

## Minimal Intended Direction (No Broad Move In This Pass)

- Canonical/current outputs remain top-level (or in canonical current paths).
- Historical/audit/replay outputs should be separated over time.
- Tmp/ad hoc outputs should be separated over time.
- Non-artifact residue should live outside artifact output space.

Current inventory or staged cleanup recommendations may live in separate hygiene/inventory docs when explicitly admitted, but they are not required for this policy to stand on its own.
