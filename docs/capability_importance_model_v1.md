# Capability Importance Model (v1)

## 1. Problem Statement

Capability-based matching systems often overweight broad capabilities because those capabilities appear in many job descriptions and many candidate profiles. When broad signals are treated similarly to role-specific signals, match contribution can become dominated by high-coverage capabilities rather than role-defining ones. This reduces differentiation between adjacent roles and weakens gap precision.

In CareerTwin, this appears when baseline capabilities (for example, general leadership or generic analytics framing) contribute strongly across many jobs, even when a specific role emphasizes transformation scope, domain context, delivery constraints, or required methods.

## 2. Design Goals

The v1 model must:

- Improve role differentiation by increasing contribution sensitivity to role-defining signals.
- Remain deterministic, auditable, and explainable at capability and requirement levels.
- Avoid overfitting to specific users, capability names, or narrow benchmark sets.
- Preserve current schema and core matcher architecture.
- Work across job families without role-specific hardcoded taxonomies.

## 3. Core Scoring Components

Capability contribution is determined by four components.

### JD Importance

- Source: deterministic JD capability extraction.
- Current levels: `critical`, `important`, `supporting`.
- Function: encodes explicit hiring priority from job-side evidence.

### Candidate Strength

- Source: deterministic capability inference and evidence aggregation.
- Signal basis: ownership, scope, impact, and capability signal confidence.
- Function: estimates how strongly the candidate demonstrates the capability.

### Evidence Density

- Source: count and spread of supporting evidence across career memory.
- Signal basis: number of supporting pieces/signals, cross-experience recurrence, consistency.
- Function: distinguishes durable capability patterns from one-off mentions.

### Role Differentiation Value

- Source: deterministic job-side emphasis signals (not fixed capability lists).
- Signal basis examples:
  - repeated capability emphasis across JD units/sections
  - proximity to ownership/scope/delivery statements
  - domain-context coupling (capability appears with domain/mission constraints)
  - proximity to must-have or required-language markers
- Function: raises contribution for capabilities that define this role, not just capabilities common to many roles.

## 4. Proposed v1 Formula

Conceptual structure:

`CapabilityContribution = JDImportanceWeight × CandidateStrength × EvidenceDensityFactor × RoleDifferentiationFactor`

Interpretation:

- `JDImportanceWeight`: fixed deterministic weight by extracted importance class.
- `CandidateStrength`: normalized candidate-side strength score from existing capability inference.
- `EvidenceDensityFactor`: bounded multiplier reflecting support consistency and recurrence.
- `RoleDifferentiationFactor`: bounded multiplier reflecting role-specific emphasis in the current JD.

Estimation guidance (v1):

- Use bounded factors to prevent unstable score swings.
- Keep factors monotonic: stronger evidence/emphasis should not decrease contribution.
- Keep all terms traceable to explicit deterministic signals for audit output.

## 5. Avoiding Overfitting

The model must not:

- Hardcode specific capability names as globally “high value” or “low value.”
- Encode user-specific preferences into general scoring logic.
- Depend on small benchmark sets as if they represent global role structure.

Overfitting protection in v1:

- Use structural signals (frequency, section priority, requirement language, scope linkage) rather than fixed capability identity.
- Use bounded multipliers and transparent diagnostics.
- Keep the same logic for all users and jobs.

## 6. Minimal v1 Implementation Guidance

A minimal v1 can be implemented with no schema changes and no matcher redesign by adding deterministic multipliers on top of existing requirement scoring.

Acceptable differentiation signals in v1:

- Frequency of capability expression in JD evidence units.
- Presence near responsibility/ownership/delivery statements.
- Presence in required/essential sections vs preferred/optional sections.
- Repetition across multiple JD sections rather than isolated mention.

Constraints for minimal v1:

- Reuse existing extraction and requirement cluster artifacts where possible.
- Do not change persisted data contracts.
- Do not require LLM parsing to compute core contribution.

## 7. Relationship to Future LLM Enhancements

Future LLM-based JD parsing can improve upstream signal quality by better identifying:

- role emphasis and nuance,
- domain context and transformation intent,
- capability-to-scope coupling.

However, the matcher core should remain deterministic. LLM outputs should provide structured inputs/signals that are consumed by deterministic contribution logic, not replace deterministic scoring itself.

## 8. Examples

### Example A: Generic Manager Role vs Transformation Role

- Two jobs both mention stakeholder leadership.
- Generic manager JD mentions it once in broad language.
- Transformation JD repeats it near delivery ownership, program accountability, and change rollout requirements.

Expected v1 behavior:

- Both jobs can treat stakeholder leadership as relevant.
- Transformation role receives higher `RoleDifferentiationFactor` for transformation-defining capabilities due to repeated, required, scope-linked emphasis.
- Broad baseline capabilities no longer dominate by default.

### Example B: Commercial Analytics vs Operational Analytics Role

- Both jobs mention analytics and reporting.
- Commercial analytics JD ties capability signals to pricing/revenue decisions and market-facing outcomes.
- Operational analytics JD ties capability signals to process efficiency, delivery reliability, and throughput constraints.

Expected v1 behavior:

- Shared baseline analytics capabilities remain relevant in both.
- Contribution rises for capabilities most tightly coupled to each role’s domain and required outcomes.
- Differentiation occurs through deterministic context/emphasis signals, not hardcoded capability lists.

## 9. Non-Goals

This model does not aim to:

- Predict hiring outcomes or recruiter decisions directly.
- Replace deterministic scoring with LLM-scored matching.
- Optimize specifically for benchmark leaderboard performance at the cost of generalization.
- Introduce schema redesign or architecture rewrite.

## Founder Summary

This model keeps the matcher deterministic but smarter about which capabilities actually define a job. It preserves existing architecture and data contracts, then adds a simple, general contribution logic: job priority, candidate strength, evidence consistency, and role-specific emphasis. The result is less dominance from broad baseline capabilities and better separation between similar roles without hardcoding user-specific or capability-specific rules.
