# CareerTwin Canonical Core Schema

This file intentionally defines only the canonical core concepts.
It does not try to list every table or every legacy artifact.

## 1) `EvidencePiece`

- Purpose: The smallest trusted unit of career memory (real work evidence).
- Owned layer: Career Memory Engine.
- Canonical meaning: A traceable statement of what the user did, in what context, with what impact.
- What it is NOT:
  - Not a generic skill tag.
  - Not a rewritten resume bullet invented by the model.
  - Not a job requirement.
- Important relationships:
  - Belongs to one `Experience` (`experience_id`).
  - Belongs to one `Career` (`career_id`).
  - Can produce many `EvidenceSignal` records.
  - Can support many `Capability` records through linking.

## 2) `Capability`

- Purpose: A normalized, inferred professional strength supported by evidence.
- Owned layer: Capability Engine.
- Canonical meaning: A capability only exists if there is supporting evidence traceability.
- What it is NOT:
  - Not just a keyword list.
  - Not only inferred from title priors without evidence support.
  - Not a job-side requirement.
- Important relationships:
  - Belongs to one `Career` (`career_id`).
  - Connected to supporting evidence via `CapabilityEvidenceLink` (and currently both signal-based and legacy direct links exist).
  - Used by matching to evaluate fit against job requirements.

## 3) `CapabilityEvidenceLink`

- Purpose: Explain why a capability exists by linking it to concrete evidence support.
- Owned layer: Capability Engine.
- Canonical meaning: A traceability edge, not a business object by itself.
- What it is NOT:
  - Not a capability score.
  - Not a standalone memory record.
  - Not a user action event.
- Important relationships:
  - Current canonical direction is capability -> evidence signal (`capability_signal_links`).
  - Legacy compatibility path still keeps capability -> evidence piece (`capability_evidence_links`).
  - Enables auditable capability inference and explainability.

## 4) `JobRequirement`

- Purpose: The normalized statement of what a target job needs.
- Owned layer: Job Intelligence Engine (consumed by Matching Engine).
- Canonical meaning: A requirement extracted from JD text (often represented as capability clusters/requirement IDs in matcher output).
- What it is NOT:
  - Not the raw job description text.
  - Not candidate evidence.
  - Not currently a first-class persisted table with stable `job_requirement_id`.
- Important relationships:
  - Derived from `JobSignal` + job understanding extraction.
  - Compared against candidate capabilities/evidence in matching.

## 5) `JobSignal`

- Purpose: Structured representation of a job description.
- Owned layer: Job Intelligence Engine.
- Canonical meaning: Parsed job intent fields (title/family/skills/responsibilities/domains/keywords) used downstream by matching and copilot.
- What it is NOT:
  - Not a candidate-side score.
  - Not a match decision.
  - Not a resume rewrite output.
- Important relationships:
  - Belongs to one `Job` (`job_id`) in `job_signals`.
  - Feeds `JobRequirement` extraction and matching.
  - Stored both as normalized row fields and (for snapshots) JSON payloads.

## 6) `MatchResult`

- Purpose: Final fit outcome between candidate career memory and a target job.
- Owned layer: Matching Engine.
- Canonical meaning: A scored and explainable fit decision, persisted primarily in `job_matches` and surfaced in copilot/match APIs.
- What it is NOT:
  - Not a raw parser output.
  - Not only a verdict label with no evidence.
  - Not the same thing as extension interaction history.
- Important relationships:
  - Depends on `Capability` (candidate side) and `JobRequirement`/`JobSignal` (job side).
  - Powers Copilot output (why-fit, key gaps, evidence highlights, resume tailoring decisions).
  - Extension pipeline state (`user_job_interactions`) is adjacent but distinct from canonical career-job match storage.

## Canonical chain

```
EvidencePiece -> Capability -> JobRequirement -> MatchResult -> Copilot output
```

