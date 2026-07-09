Why-you Buying-case Checklist
Purpose

This document defines the product and audit checklist for `Why you`.
It is a practical quality gate for final user-facing output, not a schema or architecture spec.

Core definition

`Why you` is a buying-case section, not a relevance summary.
Its job is to explain why the candidate is buyable now for this role under current evidence.

Minimum success criteria

- Leads with role-relevant, buyable proof.
- Uses evidence-led statements instead of taxonomy-heavy category labels.
- States a concrete fit claim tied to the role context.
- Keeps shared/default analytics stems secondary when subject-aligned proof exists.
- Is concise, high-conviction, and readable.
- Remains consistent with recommendation and risk surfaces.

Fast failure signals

- Reads like a broad relevance summary instead of a buyability claim.
- Generic/shared analytics stem leads line 1 while stronger subject evidence exists.
- Heavy abstraction or taxonomy terms dominate over concrete proof.
- Repetitive filler language replaces role-specific substance.
- `Why you` conflicts with `Biggest risk` or `Apply recommendation`.
- User cannot tell what proof the claim is based on.

Target output contract

- Primary function: explain current buyability for this role.
- Primary input basis: selected, role-aligned evidence already in the authoritative story.
- Output style: short, specific, evidence-led, user-actionable.
- Consistency rule: no contradiction with recommendation state, primary frame, or primary axis.
- Consumer rule: do not re-select upstream ownership or rewrite selection semantics.

Failure mode classification

- Output wording/presentation issue:
  - The meaning is correct but phrasing is noisy, generic, or low-conviction.
- Output consistency/contract-consumption issue:
  - Surface meaning drifts from authoritative contract or adjacent panel surfaces.
- Likely upstream selection/contract issue:
  - `Why you` is weak because upstream selected weak/misaligned evidence.
- Needs further isolation:
  - Insufficient evidence to classify safely.

Repair direction selector

- If wording/presentation only:
  - Prefer strict Layer-4 phrasing or ordering micro-pass.
- If consistency/contract-consumption drift:
  - Audit contract-consumption boundary before patching copy.
- If upstream selection issue:
  - Hold Layer-4 wording churn and open bounded upstream audit.
- If unresolved:
  - Run one bounded isolation pass before implementation.

Task pre-check questions

- Is this a true `Why you` buying-case defect, or another surface defect?
- Is the first visible issue wording, consumption, or upstream selection?
- What is the smallest writable surface that can fix this without semantic drift?
- What stays explicitly out of scope for this pass?
- What bounded replay sample will verify no contract/recommendation drift?

User feeling test

After reading `Why you`, the user should feel:

- "I see why I am buyable for this role now."
- "This is based on real proof from my background."
- "This is specific enough to trust, not generic AI language."

If this feeling is not achieved, the section is not done.

One-line rule

If `Why you` does not read like a concise evidence-backed buying case, it is not ready.
