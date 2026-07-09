# Script Policy

Document role: short boundary rule for `scripts/` usage and temporary-script quarantine.

## 1) Canonical/Stable Scripts

Canonical/stable scripts are part of the ongoing repo operating surface, such as:
- canonical verify scripts
- stable reusable verification support scripts
- selected long-term replay/audit utilities that are explicitly promoted

## 2) Temporary Residue Scripts

Temporary scripts include:
- `tmp*` / `_tmp*` scripts
- one-off diagnose/inspect/capture helpers
- relocated quarantine scripts unless explicitly promoted

These are not default long-term operating scripts.

## 3) Holding Area Rule

Temporary or quarantine script holding areas admitted by a cleanup boundary may be used as holding areas.

- These areas are not canonical long-term script surfaces.
- Scripts there must eventually be either:
  - promoted to a stable area, or
  - archived/removed when obsolete.

## 4) Promotion Rule

Promote a temporary script only when both are true:
- repeated reuse value is demonstrated
- ongoing purpose is clear and documented

## 5) Non-Goal

This policy does not reorganize `scripts/` in this pass.

## 6) Replay Determinism Audit Mode

For determinism audits, replay drift audits, and repair-admission evidence generation:

- `reuseContextMode` must be set to `"replay_readonly"`.
- Frozen `selected_evidence_ids` from the consumed selection contract must be the replay source of truth.
- Artifacts must record whether frozen replay was loaded/applied and the selected-evidence hash used.

`"live_mutating"` is allowed only for exploratory, non-deterministic investigation and cannot be used to justify repair admission.
