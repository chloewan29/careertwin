# Phase 2C Structured Capability Signal Coverage Audit Plan

## Scope
This audit checks structured signal readiness for blending attribute alignment into authoritative fit scoring later. It does not modify scoring behavior.

## Artifact
- SQL audit script: `scripts/audit-phase2c-coverage.sql`

## Required mapping before manual run
Replace placeholders in the SQL script with your actual schema objects.

### Source mappings
- `__EVIDENCE_TABLE__`: canonical evidence piece source for a profile
- `__CAPABILITY_SUMMARY_TABLE__`: generated capability-level aggregate source for a profile
- `__JOB_RUN_TABLE__`: job fit run metadata (must include profile, created timestamp, test/run marker)
- `__JOB_CAP_REQ_TABLE__`: capability-level job requirements tied to job run id

### Column mappings
- `__PROFILE_ID_COL__`: profile identifier in each table
- `__CAPABILITY_KEY_COL__`: capability identifier in job requirement rows
- `__CREATED_AT_COL__`: run timestamp in job run table
- `__IS_TEST_RUN_COL__`: boolean test marker in job run table
- `__JOB_RUN_ID_COL__`: run id shared between run table and job requirement table

### Legacy fallback mappings
Map these to raw legacy columns in evidence source:
- `__LEGACY_ORG_SCOPE_COL__`
- `__LEGACY_STAKEHOLDER_SCOPE_COL__`
- `__LEGACY_LEADERSHIP_SCOPE_COL__`
- `__LEGACY_DELIVERY_LEVEL_COL__`
- `__LEGACY_IMPACT_SCALE_COL__`
- `__LEGACY_IMPACT_TYPE_COL__`

If runtime resolver vocabulary differs, update the `legacy_mapping` CTE to mirror runtime behavior.

## Manual run inputs
- `:profile_id` as UUID
- `:lookback_days` as integer, suggested `30`

## Output contract
The query returns one JSON document with sections:
- `candidate_evidence_coverage`
- `capability_aggregate_coverage`
- `fallback_resolver_usage`
- `job_side_requirement_coverage`
- `readiness_assessment`

## Readiness scaffold
Classification logic in the script:
- `ready for limited preview blending`
- `partially ready`
- `not ready`

The script also outputs:
- numeric reasoning fields (`candidate_avg_pct`, `capability_avg_pct`, `job_avg_pct`, `unmapped_legacy_count`)
- `top_3_blockers` array

## Static-inspection caveat
This artifact is intentionally schema-agnostic until placeholders are mapped. Keep logic reuse aligned with runtime codepaths:
- Candidate evidence should be sourced from the same canonical store used by `loadCareerGraph(profileId)`.
- Capability summary should be sourced from the same aggregates used by comparator/diagnostics.
- Job capability requirements should be sourced from the same structures used during fit scoring diagnostics.
