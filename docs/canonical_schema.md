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

## Database construction chain

The executable public-schema source of truth is:

1. `20260825070000_canonical_application_baseline.sql`
2. `20260825080000_reconcile_runtime_schema.sql`
3. `20260825090000_add_atomic_evidence_ingestion.sql`
4. `20260827100000_add_transactional_career_memory_publication.sql`

The baseline owns the verified pre-atomic 19-table application schema. The
reconciliation migration adds the structured evidence and capability fields
required by the current runtime. The atomic migration adds revision-scoped
resume, source-unit, and atomic-evidence persistence. The publication migration
adds the service-role-only `publish_atomic_career_memory(jsonb)` RPC: it validates
the complete candidate graph, locks per career, replaces canonical and derived
state transactionally, reconciles exact identities and relationships, and sets
completion plus `active_resume_id` only at the final promotion boundary.

B0 also preserves the verified Supabase API-role grants and `postgres` public
default privileges so tables created later in the chain are reachable through
PostgREST under the same RLS boundary as the preserved application schema.

Files under `supabase/migration-provenance/` and the two root legacy SQL files
are audit references only. They are not executable schema sources.

Supabase Auth and Storage are separate platform-managed preservation and
lifecycle boundaries; neither is restored through the public-schema chain.

The application-owned public-function contract contains exactly two functions:
`public.set_updated_at()`, used by eight update triggers, and the transactional
publication RPC. An earlier preservation
summary reported ten functions because it counted the ten output lines of this
single multiline `pg_get_functiondef` result; it did not represent ten catalog
function objects.

The canonical career-graph loader reads only fields created by this chain and
fails closed on a canonical expanded-query error. Its legacy compatibility mode
is explicit opt-in and is not valid evidence for canonical-schema verification.
Because its graph is assembled through multiple REST reads, it also compares a
collision-safe active-resume publication token before and after assembly,
retries boundedly on a change, and fails closed after repeated instability.
