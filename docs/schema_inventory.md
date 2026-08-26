# CareerTwin Schema Inventory

This inventory lists important persisted tables and core exported data types currently used by the product.

## A) Database tables

### Core runtime tables

| Name | Plain-English purpose | Key fields/columns | Owned layer | Status |
| --- | --- | --- | --- | --- |
| `profiles` | User-facing profile shell used across web app and APIs. | `id`, `user_id`, `display_name`, `current_title`, `years_experience`, `summary`, `capabilities`, `capability_evidence` | Career Memory Engine | core |
| `resumes` | Uploaded resume files plus extracted text and parsed payload. | `id`, `profile_id`, `file_name`, `file_url`, `raw_text`, `parsed_json`, `created_at` | Career Memory Engine | core |
| `careers` | Root container for canonical career memory graph. | `id`, `user_id`, `headline`, `summary`, `total_years_experience` | Career Memory Engine | core |
| `experiences` | Timeline entries under a career. | `id`, `career_id`, `company`, `title`, `date_range`, `sort_order` | Career Memory Engine | core |
| `evidence_pieces` | Atomic evidence units used for inference and matching. | `id`, `career_id`, `experience_id`, `raw_text`, `source_type`, `summary`, `action`, `impact`, `inferred_scale` | Career Memory Engine | core |
| `evidence_signals` | Structured signals extracted from evidence pieces. | `id`, `career_id`, `evidence_piece_id`, `domain`, `initiative_type`, `scope_level`, `ownership_level`, `confidence_score` | Capability Engine | derived |
| `capabilities` | Inferred capabilities for a career, with confidence/strength metadata. | `id`, `career_id`, `name`, `normalized_name`, `canonical_name`, `display_name`, `confidence_score`, `evidence_signal_count` | Capability Engine | core |
| `capability_signal_links` | Canonical traceability links from capability to evidence signal. | `id`, `capability_id`, `evidence_signal_id`, `contribution_weight`, `rationale` | Capability Engine | core |
| `jobs` | Normalized job entities persisted from extension/legacy ingestion. | `id`, `external_source`, `external_id`, `title`, `company`, `description`, `job_url` | Job Intelligence Engine | core |
| `job_signals` | Structured understanding of each persisted job. | `id`, `job_id`, `target_title`, `role_family`, `required_skills`, `responsibilities`, `domains`, `keywords` | Job Intelligence Engine | core |
| `job_matches` | Persisted fit result between a career and a job. | `id`, `career_id`, `job_id`, `match_score`, `gap_summary`, `matched_capabilities`, `status` | Matching Engine | core |
| `job_snapshots` | Raw extension job page snapshots and normalized JD text. | `job_snapshot_id`, `source_platform`, `job_url`, `job_description_raw`, `job_description_normalized`, `content_hash`, `job_signals_json` | Copilot Layer | core |
| `user_job_interactions` | Source-of-truth pipeline events from extension job views/applications. | `interaction_id`, `profile_id`, `job_snapshot_id`, `pipeline_status`, `match_score`, `verdict`, `selected_evidence_ids` | Copilot Layer | core |

### Supporting/compatibility tables

| Name | Plain-English purpose | Key fields/columns | Owned layer | Status |
| --- | --- | --- | --- | --- |
| `users` | Legacy user container used by early schema and foreign keys. | `id`, `email`, `name` | Foundation | core |
| `skills` | Canonical skill dictionary for profile skill links. | `id`, `name`, `category` | Career Memory Engine | derived |
| `user_skills` | Profile/user to skill link table. | `id`, `user_id`, `skill_id`, `proficiency` | Career Memory Engine | derived |
| `capability_evidence_links` | Legacy direct capability-to-evidence link table (parallel to signal links). | `capability_id`, `evidence_piece_id`, `link_strength` | Capability Engine | temporary / debug / experimental |
| `user_job_actions` | Legacy write-only action log (`saved/applied/dismissed`) retained for compatibility/audit. | `id`, `user_id`, `profile_id`, `job_title`, `action` | Copilot Layer | temporary / debug / experimental |

### Likely unused/legacy artifacts still present in SQL files

| Name | Plain-English purpose | Key fields/columns | Owned layer | Status |
| --- | --- | --- | --- | --- |
| `career_data` | Early all-in-one parsed resume payload table from MVP prototype. | `id`, `resume_id`, `skills`, `experience`, `education` | Legacy prototype | temporary / debug / experimental |
| `job_descriptions` | Early stored JD text table from MVP prototype. | `id`, `profile_id`, `raw_text`, `required_skills` | Legacy prototype | temporary / debug / experimental |
| `match_results` | Early match output table tied to `career_data` + `job_descriptions`. | `id`, `career_data_id`, `job_description_id`, `overall_score` | Legacy prototype | temporary / debug / experimental |
| `user_job_feed_memory` | Retired feed de-dup table preserved only in historical migration provenance; absent from the canonical chain. | `id`, `user_id`, `canonical_job_id`, `is_new`, `first_seen_at`, `last_seen_at` | Copilot Layer | retired / provenance-only |
| `resume_copilot_outcome_events` | Proposed outcome-telemetry table not created by B0, R0, or atomic; it is not part of the canonical runtime schema. | `event_id`, `profile_id`, `event_name` | Copilot Layer | absent / non-canonical |
| `tailored_resumes` | Planned canonical tailored resume persistence table. Not used by current runtime code paths. | `id`, `career_id`, `job_id`, `resume_document`, `evidence_piece_ids` | Copilot Layer | temporary / debug / experimental |

## B) Exported core data types used in product code

| Type(s) | Where exported | Purpose | Owned layer | Status |
| --- | --- | --- | --- | --- |
| `Career`, `Experience`, `EvidencePiece`, `EvidenceSignal`, `Capability`, `CareerGraph` | `lib/career-engine/memory/career-graph-loader.ts` | Canonical in-memory graph used by matching and copilot. | Career Memory + Capability | core |
| `ExtractedJobCapability` | `lib/career-engine/matching/job-capability-extractor.ts` | Structured job requirement/capability extraction unit. | Job Intelligence | core |
| `CapabilityMatchV2Result` | `lib/career-engine/matching/capability-match-v2.ts` | Current differentiated match output contract. | Matching | core |
| `ResumeCopilotJobSignals`, `ResumeCopilotPublicOutput` | `lib/career-engine/copilot/resume-copilot/resume-copilot-types.ts` | Copilot-side input/output contracts for tailored resume generation. | Copilot | core |
| `JobCopilotAnalyzeOutput`, `JobCopilotDownloadOutput` | `lib/career-engine/job-copilot/backend/job-copilot-types.ts` | Extension API response contracts. | Copilot | core |
| `Profile`, `Resume`, `CareerData`, `JobDescription`, `MatchResult` (legacy) | `types/index.ts` | Old shared app types; partially disconnected from current canonical engine model. | Legacy prototype | temporary / debug / experimental |
| `JobSignals`, `TailoredResume` (legacy engine contract) | `lib/resumeCopilot/resume-copilot-engine.ts` | Earlier resume-copilot implementation kept for compatibility/tests. | Copilot | temporary / debug / experimental |

## C) ID reference guide

| ID name | Canonical source | Meaning |
| --- | --- | --- |
| `profile_id` | `profiles.id` | Frontend session/user profile anchor; used in `resumes`, `user_job_interactions`, `user_job_actions`. |
| `career_id` | `careers.id` | Root ID for canonical memory graph; used in `experiences`, `evidence_pieces`, `capabilities`, `job_matches`. |
| `experience_id` | `experiences.id` | Timeline entry ID; parent of `evidence_pieces`. |
| `evidence_piece_id` | `evidence_pieces.id` | Atomic evidence ID; linked by `evidence_signals` and (legacy) `capability_evidence_links`. |
| `capability_id` | `capabilities.id` | Inferred capability ID; linked by `capability_signal_links` and `capability_evidence_links`. |
| `job_requirement_id` | Runtime only (no DB table) | In matcher v2, requirement IDs exist as `requirement_id`/`cluster_id` in audit output; not persisted as a first-class table yet. |
| `job_signal_id` | `job_signals.id` (exists), but most APIs key by `job_id` | Structured job-signal row ID; current app logic mostly uses `job_id` and treats one signal row per job. |
| `match_id` | Ambiguous: `job_matches.id` vs `user_job_interactions.interaction_id` | `job_matches.id` is the career-job fit row; `interaction_id` is extension pipeline interaction history. |

## D) Duplicated concepts / unclear naming / drift risks

### Duplicated concepts

- Capability traceability exists in two parallel link models: `capability_signal_links` (new) and `capability_evidence_links` (legacy).
- Two job-history models coexist: `user_job_interactions` + `job_snapshots` (current) and `user_job_actions` (legacy compatibility).
- Matching outputs exist in multiple forms: modern `job_matches` relation, legacy `match_results`, and multiple TypeScript `MatchResult` contracts.
- Capability inference exists in both `lib/career-engine/capability/capability-inference.ts` (current) and `lib/career-engine/intelligence/capability-inference.ts` (legacy).

### Unclear naming

- `job_matches` means different shapes across SQL artifacts (legacy fields vs canonical `career_id/job_id` relational form).
- `evidence_pieces.confidence`, `evidence_signals.confidence_score`, and `capabilities.confidence_level` are distinct canonical fields; no `evidence_pieces.confidence_level` column exists.
- `source_type` and `evidence_source_type` coexist on evidence concepts.
- `profileId` is often used as a user fallback in older code paths, while canonical graph ownership is `user_id -> career_id`.

### Probable schema drift risks

- The executable chain is now bounded to the B0 -> R0 -> atomic migrations under `supabase/migrations/*`.
- The first 13 migrations are preserved unchanged under `supabase/migration-provenance/pre-canonical-baseline/` and are non-executable.
- `supabase/migration.sql` and `supabase/migationcodex.sql` remain legacy references and must not be used for new runtime paths.
- The canonical chain was locally verified both from empty construction and against the preserved public-data checkpoint.
- Production migration-history registration and live application remain unperformed and require a separate authorization and equivalence gate.
- The application-owned public function inventory is exactly one function, `public.set_updated_at()`, with eight dependent update triggers. The prior count of ten was a measurement error caused by counting lines of its multiline `pg_get_functiondef` result.
- Legacy APIs still query old `job_matches` columns (`user_id`, `matched_skills`, `missing_skills`, `gap_analysis`) while newer flows use relational `career_id/job_id`.

### Unused or experimental artifacts

- `career_data`, `job_descriptions`, `match_results` appear to be legacy MVP artifacts (not used in active runtime queries).
- `tailored_resumes` is defined in SQL design scripts but is not currently used by active app code.
