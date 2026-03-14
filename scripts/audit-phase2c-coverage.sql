-- Phase 2C Structured Capability Signal Coverage Audit
-- Non-executing artifact: replace all __PLACEHOLDER__ identifiers before running.
--
-- Required inputs
-- 1) :profile_id UUID (candidate profile to audit)
-- 2) :lookback_days INT (job-side recency window, suggested 30)
--
-- Expected output
-- One JSON document with:
-- - candidate_evidence_coverage
-- - capability_aggregate_coverage
-- - fallback_resolver_usage
-- - job_side_requirement_coverage
-- - readiness_assessment
--
-- Assumptions to map
-- __EVIDENCE_TABLE__
-- __CAPABILITY_SUMMARY_TABLE__
-- __JOB_RUN_TABLE__
-- __JOB_CAP_REQ_TABLE__
--
-- __PROFILE_ID_COL__
-- __CAPABILITY_KEY_COL__
-- __CREATED_AT_COL__
-- __IS_TEST_RUN_COL__
-- __JOB_RUN_ID_COL__
--
-- __LEGACY_ORG_SCOPE_COL__
-- __LEGACY_STAKEHOLDER_SCOPE_COL__
-- __LEGACY_LEADERSHIP_SCOPE_COL__
-- __LEGACY_DELIVERY_LEVEL_COL__
-- __LEGACY_IMPACT_SCALE_COL__
-- __LEGACY_IMPACT_TYPE_COL__
--
-- Canonical columns expected on evidence:
-- org_scope, stakeholder_scope, leadership_scope, delivery_level, impact_scale, impact_type, confidence_level
-- Canonical columns expected on capability summary:
-- max_scope_seen, dominant_scope, dominant_delivery_level, stakeholder_span, leadership_span,
-- impact_scale_max, dominant_impact_type, aggregation_confidence
-- Canonical columns expected on job capability requirements:
-- org_scope, stakeholder_scope, leadership_scope, delivery_level, impact_scale, impact_type

WITH
params AS (
  SELECT
    CAST(:profile_id AS uuid) AS profile_id,
    CAST(:lookback_days AS int) AS lookback_days
),

-- Canonical legacy-to-structured mappings used only for audit attribution.
-- If your runtime resolver differs, update this CTE to mirror it exactly.
legacy_mapping AS (
  SELECT * FROM (
    VALUES
      -- dim, legacy_value, mapped_value
      ('org_scope', 'team', 'team'),
      ('org_scope', 'department', 'department'),
      ('org_scope', 'business_unit', 'business_unit'),
      ('org_scope', 'enterprise', 'enterprise'),
      ('org_scope', 'global', 'global'),

      ('stakeholder_scope', 'internal', 'internal'),
      ('stakeholder_scope', 'cross_functional', 'cross_functional'),
      ('stakeholder_scope', 'external_partner', 'external_partner'),
      ('stakeholder_scope', 'customer_facing', 'customer_facing'),
      ('stakeholder_scope', 'ecosystem', 'ecosystem'),

      ('leadership_scope', 'individual_contributor', 'individual_contributor'),
      ('leadership_scope', 'tech_lead', 'tech_lead'),
      ('leadership_scope', 'people_manager', 'people_manager'),
      ('leadership_scope', 'manager_of_managers', 'manager_of_managers'),
      ('leadership_scope', 'executive', 'executive'),

      ('delivery_level', 'task', 'task'),
      ('delivery_level', 'workstream', 'workstream'),
      ('delivery_level', 'project', 'project'),
      ('delivery_level', 'program', 'program'),
      ('delivery_level', 'portfolio', 'portfolio'),

      ('impact_scale', 'local', 'local'),
      ('impact_scale', 'regional', 'regional'),
      ('impact_scale', 'national', 'national'),
      ('impact_scale', 'global', 'global'),

      ('impact_type', 'cost', 'cost'),
      ('impact_type', 'revenue', 'revenue'),
      ('impact_type', 'growth', 'growth'),
      ('impact_type', 'risk', 'risk'),
      ('impact_type', 'quality', 'quality'),
      ('impact_type', 'speed', 'speed')
  ) AS t(dim, legacy_value, mapped_value)
),

evidence_base AS (
  SELECT e.*
  FROM __EVIDENCE_TABLE__ e
  JOIN params p
    ON e.__PROFILE_ID_COL__ = p.profile_id
),

candidate_evidence_coverage AS (
  SELECT
    COUNT(*)::int AS total_evidence_rows,
    jsonb_build_object(
      'org_scope', jsonb_build_object(
        'non_null_count', COUNT(org_scope) FILTER (WHERE org_scope IS NOT NULL),
        'non_null_pct', ROUND((COUNT(org_scope) FILTER (WHERE org_scope IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'stakeholder_scope', jsonb_build_object(
        'non_null_count', COUNT(stakeholder_scope) FILTER (WHERE stakeholder_scope IS NOT NULL),
        'non_null_pct', ROUND((COUNT(stakeholder_scope) FILTER (WHERE stakeholder_scope IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'leadership_scope', jsonb_build_object(
        'non_null_count', COUNT(leadership_scope) FILTER (WHERE leadership_scope IS NOT NULL),
        'non_null_pct', ROUND((COUNT(leadership_scope) FILTER (WHERE leadership_scope IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'delivery_level', jsonb_build_object(
        'non_null_count', COUNT(delivery_level) FILTER (WHERE delivery_level IS NOT NULL),
        'non_null_pct', ROUND((COUNT(delivery_level) FILTER (WHERE delivery_level IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'impact_scale', jsonb_build_object(
        'non_null_count', COUNT(impact_scale) FILTER (WHERE impact_scale IS NOT NULL),
        'non_null_pct', ROUND((COUNT(impact_scale) FILTER (WHERE impact_scale IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'impact_type', jsonb_build_object(
        'non_null_count', COUNT(impact_type) FILTER (WHERE impact_type IS NOT NULL),
        'non_null_pct', ROUND((COUNT(impact_type) FILTER (WHERE impact_type IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'confidence_level', jsonb_build_object(
        'non_null_count', COUNT(confidence_level) FILTER (WHERE confidence_level IS NOT NULL),
        'non_null_pct', ROUND((COUNT(confidence_level) FILTER (WHERE confidence_level IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      )
    ) AS field_coverage
  FROM evidence_base
),

candidate_sparsity_flags AS (
  SELECT jsonb_agg(flag_row) AS flags
  FROM (
    SELECT jsonb_build_object(
      'field', k,
      'non_null_pct', v->>'non_null_pct',
      'flag',
      CASE
        WHEN (v->>'non_null_pct')::numeric < 25 THEN 'critical_sparsity'
        WHEN (v->>'non_null_pct')::numeric < 50 THEN 'high_sparsity'
        WHEN (v->>'non_null_pct')::numeric < 75 THEN 'moderate_sparsity'
        ELSE 'ok'
      END
    ) AS flag_row
    FROM candidate_evidence_coverage c,
    LATERAL jsonb_each(c.field_coverage) AS x(k, v)
  ) s
),

capability_summary_base AS (
  SELECT c.*
  FROM __CAPABILITY_SUMMARY_TABLE__ c
  JOIN params p
    ON c.__PROFILE_ID_COL__ = p.profile_id
),

capability_aggregate_coverage AS (
  SELECT
    COUNT(*)::int AS total_capabilities,
    jsonb_build_object(
      'max_scope_seen', jsonb_build_object(
        'non_null_count', COUNT(max_scope_seen) FILTER (WHERE max_scope_seen IS NOT NULL),
        'non_null_pct', ROUND((COUNT(max_scope_seen) FILTER (WHERE max_scope_seen IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'dominant_scope', jsonb_build_object(
        'non_null_count', COUNT(dominant_scope) FILTER (WHERE dominant_scope IS NOT NULL),
        'non_null_pct', ROUND((COUNT(dominant_scope) FILTER (WHERE dominant_scope IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'dominant_delivery_level', jsonb_build_object(
        'non_null_count', COUNT(dominant_delivery_level) FILTER (WHERE dominant_delivery_level IS NOT NULL),
        'non_null_pct', ROUND((COUNT(dominant_delivery_level) FILTER (WHERE dominant_delivery_level IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'stakeholder_span', jsonb_build_object(
        'non_null_count', COUNT(stakeholder_span) FILTER (WHERE stakeholder_span IS NOT NULL),
        'non_null_pct', ROUND((COUNT(stakeholder_span) FILTER (WHERE stakeholder_span IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'leadership_span', jsonb_build_object(
        'non_null_count', COUNT(leadership_span) FILTER (WHERE leadership_span IS NOT NULL),
        'non_null_pct', ROUND((COUNT(leadership_span) FILTER (WHERE leadership_span IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'impact_scale_max', jsonb_build_object(
        'non_null_count', COUNT(impact_scale_max) FILTER (WHERE impact_scale_max IS NOT NULL),
        'non_null_pct', ROUND((COUNT(impact_scale_max) FILTER (WHERE impact_scale_max IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'dominant_impact_type', jsonb_build_object(
        'non_null_count', COUNT(dominant_impact_type) FILTER (WHERE dominant_impact_type IS NOT NULL),
        'non_null_pct', ROUND((COUNT(dominant_impact_type) FILTER (WHERE dominant_impact_type IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      ),
      'aggregation_confidence', jsonb_build_object(
        'non_null_count', COUNT(aggregation_confidence) FILTER (WHERE aggregation_confidence IS NOT NULL),
        'non_null_pct', ROUND((COUNT(aggregation_confidence) FILTER (WHERE aggregation_confidence IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2)
      )
    ) AS field_coverage
  FROM capability_summary_base
),

fallback_longform AS (
  SELECT
    dim,
    canonical_value,
    legacy_value
  FROM (
    SELECT 'org_scope'::text AS dim, org_scope::text AS canonical_value, __LEGACY_ORG_SCOPE_COL__::text AS legacy_value FROM evidence_base
    UNION ALL
    SELECT 'stakeholder_scope', stakeholder_scope::text, __LEGACY_STAKEHOLDER_SCOPE_COL__::text FROM evidence_base
    UNION ALL
    SELECT 'leadership_scope', leadership_scope::text, __LEGACY_LEADERSHIP_SCOPE_COL__::text FROM evidence_base
    UNION ALL
    SELECT 'delivery_level', delivery_level::text, __LEGACY_DELIVERY_LEVEL_COL__::text FROM evidence_base
    UNION ALL
    SELECT 'impact_scale', impact_scale::text, __LEGACY_IMPACT_SCALE_COL__::text FROM evidence_base
    UNION ALL
    SELECT 'impact_type', impact_type::text, __LEGACY_IMPACT_TYPE_COL__::text FROM evidence_base
  ) t
),

fallback_resolver_usage AS (
  SELECT jsonb_build_object(
    'canonical_used_direct_count', COUNT(*) FILTER (WHERE canonical_value IS NOT NULL),
    'fallback_mapping_used_count',
      COUNT(*) FILTER (
        WHERE canonical_value IS NULL
          AND legacy_value IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM legacy_mapping lm
            WHERE lm.dim = f.dim
              AND lm.legacy_value = f.legacy_value
          )
      ),
    'legacy_unmapped_count',
      COUNT(*) FILTER (
        WHERE canonical_value IS NULL
          AND legacy_value IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM legacy_mapping lm
            WHERE lm.dim = f.dim
              AND lm.legacy_value = f.legacy_value
          )
      ),
    'legacy_unmapped_values',
      COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('dim', u.dim, 'legacy_value', u.legacy_value, 'count', u.ct))
          FROM (
            SELECT dim, legacy_value, COUNT(*)::int AS ct
            FROM fallback_longform fl
            WHERE canonical_value IS NULL
              AND legacy_value IS NOT NULL
              AND NOT EXISTS (
                SELECT 1
                FROM legacy_mapping lm
                WHERE lm.dim = fl.dim
                  AND lm.legacy_value = fl.legacy_value
              )
            GROUP BY dim, legacy_value
            ORDER BY ct DESC, dim, legacy_value
          ) u
        ),
        '[]'::jsonb
      ),
    'legacy_vocab_by_dim',
      COALESCE(
        (
          SELECT jsonb_object_agg(dim, vocab_vals)
          FROM (
            SELECT dim, jsonb_agg(DISTINCT legacy_value) FILTER (WHERE legacy_value IS NOT NULL) AS vocab_vals
            FROM fallback_longform
            GROUP BY dim
          ) v
        ),
        '{}'::jsonb
      )
  ) AS metrics
  FROM fallback_longform f
),

recent_test_runs AS (
  SELECT r.__JOB_RUN_ID_COL__ AS job_run_id
  FROM __JOB_RUN_TABLE__ r
  CROSS JOIN params p
  WHERE r.__PROFILE_ID_COL__ = p.profile_id
    AND r.__IS_TEST_RUN_COL__ = TRUE
    AND r.__CREATED_AT_COL__ >= NOW() - make_interval(days => p.lookback_days)
),

job_cap_reqs AS (
  SELECT q.*
  FROM __JOB_CAP_REQ_TABLE__ q
  JOIN recent_test_runs rr
    ON q.__JOB_RUN_ID_COL__ = rr.job_run_id
),

job_side_requirement_coverage AS (
  SELECT
    COUNT(*)::int AS total_capability_requirements,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'capability_key', capability_key,
          'rows', rows_ct,
          'org_scope_pct', org_scope_pct,
          'stakeholder_scope_pct', stakeholder_scope_pct,
          'leadership_scope_pct', leadership_scope_pct,
          'delivery_level_pct', delivery_level_pct,
          'impact_scale_pct', impact_scale_pct,
          'impact_type_pct', impact_type_pct,
          'overall_structured_pct', overall_structured_pct
        )
      ),
      '[]'::jsonb
    ) AS per_capability
  FROM (
    SELECT
      __CAPABILITY_KEY_COL__ AS capability_key,
      COUNT(*)::int AS rows_ct,
      ROUND((COUNT(org_scope) FILTER (WHERE org_scope IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2) AS org_scope_pct,
      ROUND((COUNT(stakeholder_scope) FILTER (WHERE stakeholder_scope IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2) AS stakeholder_scope_pct,
      ROUND((COUNT(leadership_scope) FILTER (WHERE leadership_scope IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2) AS leadership_scope_pct,
      ROUND((COUNT(delivery_level) FILTER (WHERE delivery_level IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2) AS delivery_level_pct,
      ROUND((COUNT(impact_scale) FILTER (WHERE impact_scale IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2) AS impact_scale_pct,
      ROUND((COUNT(impact_type) FILTER (WHERE impact_type IS NOT NULL)) * 100.0 / NULLIF(COUNT(*), 0), 2) AS impact_type_pct,
      ROUND(
        (
          (
            (COUNT(org_scope) FILTER (WHERE org_scope IS NOT NULL)) +
            (COUNT(stakeholder_scope) FILTER (WHERE stakeholder_scope IS NOT NULL)) +
            (COUNT(leadership_scope) FILTER (WHERE leadership_scope IS NOT NULL)) +
            (COUNT(delivery_level) FILTER (WHERE delivery_level IS NOT NULL)) +
            (COUNT(impact_scale) FILTER (WHERE impact_scale IS NOT NULL)) +
            (COUNT(impact_type) FILTER (WHERE impact_type IS NOT NULL))
          ) * 100.0
        ) / NULLIF((COUNT(*) * 6), 0),
        2
      ) AS overall_structured_pct
    FROM job_cap_reqs
    GROUP BY __CAPABILITY_KEY_COL__
    ORDER BY overall_structured_pct ASC, rows_ct DESC
  ) t
),

scoring_inputs AS (
  SELECT
    -- Average % over candidate evidence fields
    (
      SELECT AVG((v->>'non_null_pct')::numeric)
      FROM candidate_evidence_coverage c,
      LATERAL jsonb_each(c.field_coverage) AS x(k, v)
    ) AS candidate_avg_pct,
    -- Average % over capability aggregate fields
    (
      SELECT AVG((v->>'non_null_pct')::numeric)
      FROM capability_aggregate_coverage c,
      LATERAL jsonb_each(c.field_coverage) AS x(k, v)
    ) AS capability_avg_pct,
    -- Unmapped fallback count
    (
      SELECT (metrics->>'legacy_unmapped_count')::numeric
      FROM fallback_resolver_usage
    ) AS unmapped_legacy_count,
    -- Average job-side structured coverage across capabilities
    (
      SELECT AVG((elem->>'overall_structured_pct')::numeric)
      FROM job_side_requirement_coverage j,
      LATERAL jsonb_array_elements(j.per_capability) elem
    ) AS job_avg_pct
),

readiness_assessment AS (
  SELECT jsonb_build_object(
    'classification',
      CASE
        WHEN candidate_avg_pct >= 80
         AND capability_avg_pct >= 80
         AND COALESCE(job_avg_pct, 0) >= 70
         AND COALESCE(unmapped_legacy_count, 0) = 0
          THEN 'ready for limited preview blending'
        WHEN candidate_avg_pct >= 50
         AND capability_avg_pct >= 50
         AND COALESCE(job_avg_pct, 0) >= 40
          THEN 'partially ready'
        ELSE 'not ready'
      END,
    'reasoning', jsonb_build_object(
      'candidate_avg_pct', ROUND(COALESCE(candidate_avg_pct, 0), 2),
      'capability_avg_pct', ROUND(COALESCE(capability_avg_pct, 0), 2),
      'job_avg_pct', ROUND(COALESCE(job_avg_pct, 0), 2),
      'unmapped_legacy_count', COALESCE(unmapped_legacy_count, 0)
    ),
    'top_3_blockers', (
      SELECT jsonb_agg(blocker) FROM (
        SELECT blocker
        FROM (
          SELECT
            CASE WHEN candidate_avg_pct < 50 THEN 'Candidate evidence structured coverage is below 50%.' END AS blocker, 1 AS ord
          UNION ALL
          SELECT
            CASE WHEN capability_avg_pct < 50 THEN 'Capability aggregate structured coverage is below 50%.' END AS blocker, 2 AS ord
          UNION ALL
          SELECT
            CASE WHEN COALESCE(job_avg_pct, 0) < 40 THEN 'Job-side structured requirement coverage is below 40%.' END AS blocker, 3 AS ord
          UNION ALL
          SELECT
            CASE WHEN COALESCE(unmapped_legacy_count, 0) > 0 THEN 'Legacy fallback contains unmapped enum values.' END AS blocker, 4 AS ord
        ) b
        WHERE blocker IS NOT NULL
        ORDER BY ord
        LIMIT 3
      ) z
    )
  ) AS readiness
  FROM scoring_inputs
)

SELECT jsonb_pretty(
  jsonb_build_object(
    'candidate_evidence_coverage', (
      SELECT jsonb_build_object(
        'total_evidence_rows', c.total_evidence_rows,
        'fields', c.field_coverage,
        'sparsity_flags', COALESCE(f.flags, '[]'::jsonb)
      )
      FROM candidate_evidence_coverage c
      CROSS JOIN candidate_sparsity_flags f
    ),
    'capability_aggregate_coverage', (
      SELECT jsonb_build_object(
        'total_capabilities', c.total_capabilities,
        'fields', c.field_coverage
      )
      FROM capability_aggregate_coverage c
    ),
    'fallback_resolver_usage', (
      SELECT metrics FROM fallback_resolver_usage
    ),
    'job_side_requirement_coverage', (
      SELECT jsonb_build_object(
        'total_capability_requirements', j.total_capability_requirements,
        'per_capability', j.per_capability
      )
      FROM job_side_requirement_coverage j
    ),
    'readiness_assessment', (
      SELECT readiness FROM readiness_assessment
    )
  )
) AS phase2c_audit_json;

