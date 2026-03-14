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
