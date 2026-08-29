-- Fail-closed semantic contract for the application-owned public schema built by:
--   B0 -> R0 -> atomic evidence ingestion.
-- Fingerprints are calculated from normalized PostgreSQL catalog semantics, not
-- migration-file text. Platform/extension-owned objects are excluded explicitly.
-- Intentional schema changes must update these fingerprints with their migration.

BEGIN;

CREATE TEMP TABLE expected_application_tables (table_name TEXT PRIMARY KEY) ON COMMIT DROP;

INSERT INTO expected_application_tables (table_name) VALUES
    ('capabilities'), ('capability_evidence_links'), ('capability_signal_links'),
    ('career_source_units'), ('careers'), ('evidence_pieces'), ('evidence_signals'),
    ('experiences'), ('job_matches'), ('job_signals'), ('job_snapshots'), ('jobs'),
    ('profiles'), ('resumes'), ('skills'), ('tailored_resumes'), ('user_job_actions'),
    ('user_job_interactions'), ('user_skills'), ('users');

DO $$
DECLARE
    actual_count INTEGER;
    actual_fingerprint TEXT;
    drift TEXT;
BEGIN
    SELECT string_agg(table_name, ', ' ORDER BY table_name) INTO drift
    FROM (
        SELECT table_name FROM expected_application_tables
        EXCEPT
        SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    ) missing;
    IF drift IS NOT NULL THEN
        RAISE EXCEPTION 'canonical application table(s) missing: %', drift;
    END IF;

    SELECT string_agg(table_name, ', ' ORDER BY table_name) INTO drift
    FROM (
        SELECT c.relname AS table_name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        EXCEPT
        SELECT table_name FROM expected_application_tables
    ) unexpected;
    IF drift IS NOT NULL THEN
        RAISE EXCEPTION 'unexpected public application table(s): %', drift;
    END IF;

    -- ACL scope is deliberately narrower than effective privileges. These exact
    -- comparisons own direct application-object ACL entries and postgres-owned
    -- public-schema defaults only. Owner-implicit powers, privileges inherited
    -- through role membership, and Supabase-managed global memberships/defaults
    -- are separate platform semantics and are not expanded with has_*_privilege.
    WITH expected AS (
        SELECT 'public'::text AS schema_name,
            tables.table_name AS relation_name,
            'postgres'::text AS owner_name,
            roles.role_name AS grantee_name,
            privileges.privilege_name,
            false AS is_grantable,
            'postgres'::text AS grantor_name
        FROM expected_application_tables tables
        CROSS JOIN (VALUES ('postgres'), ('anon'), ('authenticated'), ('service_role')) roles(role_name)
        -- MAINTAIN is intentional in both exact table/default ACL sets because it
        -- exists in the currently supported PostgreSQL/Supabase catalog verified
        -- by this baseline. It is privilege-model/version-sensitive: an engine or
        -- intentional privilege-model change requires an explicit contract update,
        -- regenerated catalog expectations, local drift probes, review, and
        -- production-equivalence verification, never a silent ACL-row adjustment.
        CROSS JOIN (VALUES
            ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
            ('REFERENCES'), ('TRIGGER'), ('MAINTAIN')
        ) privileges(privilege_name)
    ), actual AS (
        SELECT n.nspname AS schema_name,
            c.relname AS relation_name,
            owner_role.rolname AS owner_name,
            CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee_role.rolname END AS grantee_name,
            acl.privilege_type AS privilege_name,
            acl.is_grantable,
            grantor_role.rolname AS grantor_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_roles owner_role ON owner_role.oid = c.relowner
        JOIN expected_application_tables tables ON tables.table_name = c.relname
        CROSS JOIN LATERAL aclexplode(c.relacl) acl
        LEFT JOIN pg_roles grantee_role ON grantee_role.oid = acl.grantee
        JOIN pg_roles grantor_role ON grantor_role.oid = acl.grantor
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    ), differences AS (
        SELECT 'missing'::text AS direction, missing.* FROM (
            SELECT * FROM expected
            EXCEPT ALL
            SELECT * FROM actual
        ) missing
        UNION ALL
        SELECT 'unexpected'::text AS direction, unexpected.* FROM (
            SELECT * FROM actual
            EXCEPT ALL
            SELECT * FROM expected
        ) unexpected
    )
    SELECT string_agg(
        format('%s:%s.%s:owner=%s:grantee=%s:privilege=%s:grantable=%s:grantor=%s',
            direction, schema_name, relation_name, owner_name, grantee_name,
            privilege_name, is_grantable, grantor_name),
        ', ' ORDER BY direction, schema_name, relation_name, grantee_name, privilege_name
    ) INTO drift
    FROM differences;
    IF drift IS NOT NULL THEN
        RAISE EXCEPTION 'canonical direct table ACL drift: %', drift;
    END IF;

    WITH expected AS (
        SELECT 'public'::text AS schema_name,
            'set_updated_at'::text AS function_name,
            ''::text AS identity_arguments,
            'postgres'::text AS owner_name,
            roles.role_name AS grantee_name,
            'EXECUTE'::text AS privilege_name,
            false AS is_grantable,
            'postgres'::text AS grantor_name
        FROM (VALUES ('PUBLIC'), ('postgres'), ('anon'), ('authenticated'), ('service_role')) roles(role_name)
        UNION ALL
        SELECT 'public'::text, 'publish_atomic_career_memory'::text, 'p_payload jsonb'::text,
            'postgres'::text, roles.role_name, 'EXECUTE'::text, false, 'postgres'::text
        FROM (VALUES ('postgres'), ('service_role')) roles(role_name)
    ), actual AS (
        SELECT n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS identity_arguments,
            owner_role.rolname AS owner_name,
            CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee_role.rolname END AS grantee_name,
            acl.privilege_type AS privilege_name,
            acl.is_grantable,
            grantor_role.rolname AS grantor_name
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_roles owner_role ON owner_role.oid = p.proowner
        CROSS JOIN LATERAL aclexplode(p.proacl) acl
        LEFT JOIN pg_roles grantee_role ON grantee_role.oid = acl.grantee
        JOIN pg_roles grantor_role ON grantor_role.oid = acl.grantor
        WHERE n.nspname = 'public'
          AND (
              (p.proname = 'set_updated_at' AND pg_get_function_identity_arguments(p.oid) = '')
              OR (p.proname = 'publish_atomic_career_memory'
                  AND pg_get_function_identity_arguments(p.oid) = 'p_payload jsonb')
          )
    ), differences AS (
        SELECT 'missing'::text AS direction, missing.* FROM (
            SELECT * FROM expected
            EXCEPT ALL
            SELECT * FROM actual
        ) missing
        UNION ALL
        SELECT 'unexpected'::text AS direction, unexpected.* FROM (
            SELECT * FROM actual
            EXCEPT ALL
            SELECT * FROM expected
        ) unexpected
    )
    SELECT string_agg(
        format('%s:%s.%s(%s):owner=%s:grantee=%s:privilege=%s:grantable=%s:grantor=%s',
            direction, schema_name, function_name, identity_arguments, owner_name,
            grantee_name, privilege_name, is_grantable, grantor_name),
        ', ' ORDER BY direction, schema_name, function_name, grantee_name, privilege_name
    ) INTO drift
    FROM differences;
    IF drift IS NOT NULL THEN
        RAISE EXCEPTION 'canonical direct function ACL drift: %', drift;
    END IF;

    WITH expected_privileges(object_type, privilege_name) AS (
        VALUES
            ('r', 'SELECT'), ('r', 'INSERT'), ('r', 'UPDATE'), ('r', 'DELETE'),
            ('r', 'TRUNCATE'), ('r', 'REFERENCES'), ('r', 'TRIGGER'), ('r', 'MAINTAIN'),
            ('S', 'SELECT'), ('S', 'UPDATE'), ('S', 'USAGE'),
            ('f', 'EXECUTE')
    ), expected AS (
        SELECT 'postgres'::text AS owner_name,
            'public'::text AS schema_name,
            privileges.object_type,
            roles.role_name AS grantee_name,
            privileges.privilege_name,
            false AS is_grantable,
            'postgres'::text AS grantor_name
        FROM (VALUES ('postgres'), ('anon'), ('authenticated'), ('service_role')) roles(role_name)
        CROSS JOIN expected_privileges privileges
    ), actual AS (
        SELECT owner_role.rolname AS owner_name,
            n.nspname AS schema_name,
            d.defaclobjtype::text AS object_type,
            CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee_role.rolname END AS grantee_name,
            acl.privilege_type AS privilege_name,
            acl.is_grantable,
            grantor_role.rolname AS grantor_name
        FROM pg_default_acl d
        JOIN pg_roles owner_role ON owner_role.oid = d.defaclrole
        JOIN pg_namespace n ON n.oid = d.defaclnamespace
        CROSS JOIN LATERAL aclexplode(d.defaclacl) acl
        LEFT JOIN pg_roles grantee_role ON grantee_role.oid = acl.grantee
        JOIN pg_roles grantor_role ON grantor_role.oid = acl.grantor
        WHERE owner_role.rolname = 'postgres'
          AND n.nspname = 'public'
    ), differences AS (
        SELECT 'missing'::text AS direction, missing.* FROM (
            SELECT * FROM expected
            EXCEPT ALL
            SELECT * FROM actual
        ) missing
        UNION ALL
        SELECT 'unexpected'::text AS direction, unexpected.* FROM (
            SELECT * FROM actual
            EXCEPT ALL
            SELECT * FROM expected
        ) unexpected
    )
    SELECT string_agg(
        format('%s:owner=%s:schema=%s:type=%s:grantee=%s:privilege=%s:grantable=%s:grantor=%s',
            direction, owner_name, schema_name, object_type, grantee_name,
            privilege_name, is_grantable, grantor_name),
        ', ' ORDER BY direction, owner_name, schema_name, object_type, grantee_name, privilege_name
    ) INTO drift
    FROM differences;
    IF drift IS NOT NULL THEN
        RAISE EXCEPTION 'canonical postgres public default ACL drift: %', drift;
    END IF;

    WITH rows AS (
        SELECT format('%s|%s|%s|%s|%s|%s|%s|%s', c.relname, a.attnum, a.attname,
            pg_catalog.format_type(a.atttypid, a.atttypmod), a.attnotnull,
            COALESCE(regexp_replace(pg_get_expr(d.adbin, d.adrelid), E'\\s+', ' ', 'g'), ''),
            a.attidentity, a.attgenerated) AS semantic_value
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN expected_application_tables t ON t.table_name = c.relname
        LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE n.nspname = 'public' AND a.attnum > 0 AND NOT a.attisdropped
    )
    SELECT count(*), md5(string_agg(semantic_value, E'\n' ORDER BY semantic_value))
    INTO actual_count, actual_fingerprint FROM rows;
    IF actual_count <> 261 OR actual_fingerprint <> '3dc3d6661195a2e7190a48672f4f50e3' THEN
        RAISE EXCEPTION 'canonical column semantics drifted: count %, fingerprint %', actual_count, actual_fingerprint;
    END IF;

    WITH rows AS (
        SELECT con.contype,
            concat_ws('|', n.nspname, c.relname, con.contype,
                con.condeferrable, con.condeferred, con.convalidated,
                COALESCE(con.conkey::text, ''),
                COALESCE(ref_n.nspname, ''), COALESCE(ref.relname, ''),
                COALESCE(con.confkey::text, ''), con.confupdtype, con.confdeltype,
                con.confmatchtype, COALESCE(exclusion_ops.operator_definitions, ''),
                regexp_replace(pg_get_constraintdef(con.oid, true), '[[:space:]]+', ' ', 'g')) AS semantic_value
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN expected_application_tables t ON t.table_name = c.relname
        LEFT JOIN pg_class ref ON ref.oid = con.confrelid
        LEFT JOIN pg_namespace ref_n ON ref_n.oid = ref.relnamespace
        LEFT JOIN LATERAL (
            SELECT string_agg(
                concat_ws(':', operators.ordinality, operator_n.nspname, op.oprname,
                    pg_catalog.format_type(op.oprleft, NULL),
                    pg_catalog.format_type(op.oprright, NULL)),
                ',' ORDER BY operators.ordinality) AS operator_definitions
            FROM unnest(con.conexclop) WITH ORDINALITY AS operators(operator_oid, ordinality)
            JOIN pg_operator op ON op.oid = operators.operator_oid
            JOIN pg_namespace operator_n ON operator_n.oid = op.oprnamespace
        ) exclusion_ops ON true
        WHERE n.nspname = 'public' AND con.contype IN ('p', 'u', 'c', 'f', 'x')
    ), counts AS (
        SELECT count(*) AS total,
            count(*) FILTER (WHERE contype = 'p') AS primary_keys,
            count(*) FILTER (WHERE contype = 'u') AS unique_constraints,
            count(*) FILTER (WHERE contype = 'c') AS check_constraints,
            count(*) FILTER (WHERE contype = 'f') AS foreign_keys,
            count(*) FILTER (WHERE contype = 'x') AS exclusion_constraints,
            md5(string_agg(semantic_value, E'\n' ORDER BY semantic_value)) AS fingerprint
        FROM rows
    )
    SELECT total, fingerprint,
        format('pk=%s unique=%s check=%s fk=%s exclusion=%s', primary_keys, unique_constraints,
            check_constraints, foreign_keys, exclusion_constraints)
    INTO actual_count, actual_fingerprint, drift
    FROM counts
    WHERE primary_keys = 20 AND unique_constraints = 6 AND check_constraints = 39
        AND foreign_keys = 24 AND exclusion_constraints = 0;
    IF actual_count IS NULL OR actual_count <> 89 OR actual_fingerprint <> '90c320990036bdca4466ce33c206dce4' THEN
        RAISE EXCEPTION 'canonical constraint semantics drifted: count %, fingerprint %, breakdown %',
            actual_count, actual_fingerprint, COALESCE(drift, 'mismatch');
    END IF;

    WITH rows AS (
        SELECT backing.oid IS NOT NULL AS constraint_backed,
            concat_ws('|', n.nspname, tbl.relname,
                CASE WHEN backing.oid IS NULL THEN 'standalone' ELSE 'constraint-backed' END,
                CASE WHEN backing.oid IS NULL THEN idx.relname ELSE '' END,
                i.indisunique, i.indnullsnotdistinct, i.indisprimary, i.indisexclusion,
                i.indimmediate, i.indisclustered, i.indisvalid, i.indcheckxmin,
                i.indisready, i.indislive, i.indisreplident, i.indnkeyatts, i.indnatts,
                i.indkey::text, am.amname, COALESCE(index_columns.column_definitions, ''),
                COALESCE(index_options.option_definitions, ''),
                COALESCE(regexp_replace(pg_get_expr(i.indexprs, i.indrelid, true), '[[:space:]]+', ' ', 'g'), ''),
                COALESCE(regexp_replace(pg_get_expr(i.indpred, i.indrelid, true), '[[:space:]]+', ' ', 'g'), ''),
                COALESCE(backing.contype::text, ''),
                COALESCE(regexp_replace(pg_get_constraintdef(backing.oid, true), '[[:space:]]+', ' ', 'g'), ''),
                CASE WHEN backing.oid IS NULL
                    THEN regexp_replace(pg_get_indexdef(idx.oid), '[[:space:]]+', ' ', 'g')
                    ELSE ''
                END) AS semantic_value
        FROM pg_index i
        JOIN pg_class idx ON idx.oid = i.indexrelid
        JOIN pg_class tbl ON tbl.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = tbl.relnamespace
        JOIN expected_application_tables t ON t.table_name = tbl.relname
        JOIN pg_am am ON am.oid = idx.relam
        LEFT JOIN pg_constraint backing
            ON backing.conindid = i.indexrelid AND backing.contype IN ('p', 'u', 'x')
        LEFT JOIN LATERAL (
            SELECT string_agg(
                format('%s:%s', position, pg_get_indexdef(i.indexrelid, position, true)),
                ',' ORDER BY position) AS column_definitions
            FROM generate_series(1, i.indnatts) AS position
        ) index_columns ON true
        LEFT JOIN LATERAL (
            SELECT string_agg(
                concat_ws(':', options.ordinality, opclass_n.nspname, opclass.opcname,
                    COALESCE(collation_n.nspname, ''), COALESCE(coll.collname, ''),
                    options.indoption), ',' ORDER BY options.ordinality) AS option_definitions
            FROM unnest(i.indclass::oid[], i.indcollation::oid[], i.indoption::int2[])
                WITH ORDINALITY AS options(opclass_oid, collation_oid, indoption, ordinality)
            JOIN pg_opclass opclass ON opclass.oid = options.opclass_oid
            JOIN pg_namespace opclass_n ON opclass_n.oid = opclass.opcnamespace
            LEFT JOIN pg_collation coll ON coll.oid = options.collation_oid
            LEFT JOIN pg_namespace collation_n ON collation_n.oid = coll.collnamespace
        ) index_options ON true
        WHERE n.nspname = 'public'
    ), counts AS (
        SELECT count(*) AS total,
            count(*) FILTER (WHERE constraint_backed) AS constraint_backed_indexes,
            count(*) FILTER (WHERE NOT constraint_backed) AS standalone_indexes,
            md5(string_agg(semantic_value, E'\n' ORDER BY semantic_value)) AS fingerprint
        FROM rows
    )
    SELECT total, fingerprint,
        format('constraint-backed=%s standalone=%s', constraint_backed_indexes, standalone_indexes)
    INTO actual_count, actual_fingerprint, drift
    FROM counts
    WHERE constraint_backed_indexes = 26 AND standalone_indexes = 51;
    IF actual_count IS NULL OR actual_count <> 77 OR actual_fingerprint <> 'd5667f9898ffdb630f43ed69e4b7c8b5' THEN
        RAISE EXCEPTION 'canonical index semantics drifted: count %, fingerprint %, breakdown %',
            actual_count, actual_fingerprint, COALESCE(drift, 'mismatch');
    END IF;

    WITH rows AS (
        SELECT format('%s|%s|%s', c.relname, c.relrowsecurity, c.relforcerowsecurity) AS semantic_value
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN expected_application_tables t ON t.table_name = c.relname
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    )
    SELECT count(*), md5(string_agg(semantic_value, E'\n' ORDER BY semantic_value))
    INTO actual_count, actual_fingerprint FROM rows;
    IF actual_count <> 20 OR actual_fingerprint <> 'e19a315bf6fce170390dea82aa407953' THEN
        RAISE EXCEPTION 'canonical RLS enable/force semantics drifted: count %, fingerprint %', actual_count, actual_fingerprint;
    END IF;

    WITH rows AS (
        SELECT format('%s|%s|%s|%s|%s|%s|%s', tablename, policyname, permissive,
            array_to_string(roles, ','), cmd,
            COALESCE(regexp_replace(qual, E'\\s+', ' ', 'g'), ''),
            COALESCE(regexp_replace(with_check, E'\\s+', ' ', 'g'), '')) AS semantic_value
        FROM pg_policies WHERE schemaname = 'public'
    )
    SELECT count(*), md5(string_agg(semantic_value, E'\n' ORDER BY semantic_value))
    INTO actual_count, actual_fingerprint FROM rows;
    IF actual_count <> 2 OR actual_fingerprint <> 'c1b4accc9237996448e198bdd6484b0d' THEN
        RAISE EXCEPTION 'canonical policy semantics drifted: count %, fingerprint %', actual_count, actual_fingerprint;
    END IF;

    SELECT string_agg(format('%s(%s)', p.proname, pg_get_function_identity_arguments(p.oid)), ', ')
    INTO drift
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'set_updated_at'
      AND pg_get_function_identity_arguments(p.oid) = ''
      AND (
          strpos(p.prosrc, chr(39)) > 0
          OR strpos(p.prosrc, chr(34)) > 0
          OR p.prosrc ~ '--|/\\*|\\*/|[$][$]|[$][A-Za-z_][A-Za-z_0-9]*[$]'
      );
    IF drift IS NOT NULL THEN
        RAISE EXCEPTION 'set_updated_at body is no longer safe for guarded case normalization: %', drift;
    END IF;

    WITH expected (
        schema_name, function_name, identity_arguments, result_type, function_kind,
        owner_name, language_name, volatility, is_strict, parallel_safety,
        is_leakproof, is_security_definer, configuration, semantic_fingerprint
    ) AS (
        VALUES
            ('public', 'set_updated_at', '', 'trigger', 'f', 'postgres', 'plpgsql',
                'v', false, 'u', false, false, '', '675cfa644a49924a7f0730cf6dd0ab27'),
            ('public', 'publish_atomic_career_memory', 'p_payload jsonb', 'jsonb', 'f',
                'postgres', 'plpgsql', 'v', false, 'u', false, false,
                'search_path=pg_catalog, public', '86a1e53b7cce468df22595f4ca6c3d7c')
    ), actual AS (
        SELECT n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS identity_arguments,
            pg_get_function_result(p.oid) AS result_type,
            p.prokind::text AS function_kind,
            owner_role.rolname AS owner_name,
            l.lanname AS language_name,
            p.provolatile::text AS volatility,
            p.proisstrict AS is_strict,
            p.proparallel::text AS parallel_safety,
            p.proleakproof AS is_leakproof,
            p.prosecdef AS is_security_definer,
            COALESCE(array_to_string(p.proconfig, ','), '') AS configuration,
            md5(format('%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s',
                n.nspname,
                p.proname,
                pg_get_function_identity_arguments(p.oid),
                pg_get_function_result(p.oid),
                p.prokind,
                owner_role.rolname,
                l.lanname,
                p.provolatile,
                p.proisstrict,
                p.proparallel,
                p.proleakproof,
                p.prosecdef,
                COALESCE(array_to_string(p.proconfig, ','), ''),
                CASE
                    WHEN p.proname = 'set_updated_at'
                      AND pg_get_function_identity_arguments(p.oid) = ''
                    THEN lower(btrim(regexp_replace(
                        regexp_replace(p.prosrc, E'\\s+', ' ', 'g'),
                        E'\\s*([().,;:=+*/<>-])\\s*', E'\\1', 'g'
                    )))
                    ELSE regexp_replace(p.prosrc, E'\\s+', ' ', 'g')
                END
            )) AS semantic_fingerprint
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_roles owner_role ON owner_role.oid = p.proowner
        JOIN pg_language l ON l.oid = p.prolang
        WHERE n.nspname = 'public'
          AND NOT EXISTS (
              SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid = d.refobjid
              WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid
                AND d.refclassid = 'pg_extension'::regclass AND d.deptype = 'e'
          )
    ), differences AS (
        SELECT 'missing'::text AS direction, missing.* FROM (
            SELECT * FROM expected
            EXCEPT ALL
            SELECT * FROM actual
        ) missing
        UNION ALL
        SELECT 'unexpected'::text AS direction, unexpected.* FROM (
            SELECT * FROM actual
            EXCEPT ALL
            SELECT * FROM expected
        ) unexpected
    )
    SELECT string_agg(
        format('%s:%s.%s(%s):result=%s:kind=%s:owner=%s:language=%s:volatility=%s:strict=%s:parallel=%s:leakproof=%s:security_definer=%s:config=%s:fingerprint=%s',
            direction, schema_name, function_name, identity_arguments, result_type,
            function_kind, owner_name, language_name, volatility, is_strict,
            parallel_safety, is_leakproof, is_security_definer, configuration,
            semantic_fingerprint),
        ', ' ORDER BY direction, schema_name, function_name, identity_arguments,
            semantic_fingerprint
    ) INTO drift
    FROM differences;
    IF drift IS NOT NULL THEN
        RAISE EXCEPTION 'application-owned public function semantic drift: %', drift;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
          AND pg_get_function_identity_arguments(p.oid) = '' AND pg_get_function_result(p.oid) = 'trigger'
    ) THEN
        RAISE EXCEPTION 'required application function public.set_updated_at() is missing or mistyped';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'publish_atomic_career_memory'
          AND pg_get_function_identity_arguments(p.oid) = 'p_payload jsonb'
          AND pg_get_function_result(p.oid) = 'jsonb'
          AND NOT p.prosecdef
          AND p.proconfig = ARRAY['search_path=pg_catalog, public']
    ) THEN
        RAISE EXCEPTION 'transactional publication RPC signature or SECURITY INVOKER/search_path boundary drifted';
    END IF;

    WITH rows AS (
        SELECT format('%s|%s|%s|%s|%s', c.relname, tr.tgname, tr.tgenabled, p.proname,
            regexp_replace(pg_get_triggerdef(tr.oid, true), E'\\s+', ' ', 'g')) AS semantic_value
        FROM pg_trigger tr
        JOIN pg_class c ON c.oid = tr.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_proc p ON p.oid = tr.tgfoid
        JOIN expected_application_tables t ON t.table_name = c.relname
        WHERE n.nspname = 'public' AND NOT tr.tgisinternal
    )
    SELECT count(*), md5(string_agg(semantic_value, E'\n' ORDER BY semantic_value))
    INTO actual_count, actual_fingerprint FROM rows;
    IF actual_count <> 8 OR actual_fingerprint <> 'f75659d52389f7c19a1cef4c7ad1f0bd' THEN
        RAISE EXCEPTION 'canonical trigger semantics drifted: count %, fingerprint %', actual_count, actual_fingerprint;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('career_data', 'job_descriptions', 'match_results', 'user_job_feed_memory', 'resume_copilot_outcome_events')
    ) THEN
        RAISE EXCEPTION 'retired or non-canonical legacy table appeared in canonical schema';
    END IF;

    IF to_regclass('public.career_source_units') IS NULL
       OR to_regclass('public.uq_resumes_profile_content_sha256') IS NULL
       OR to_regclass('public.uq_experiences_revision_role') IS NULL
       OR to_regclass('public.uq_evidence_pieces_revision_unit_atomic_index') IS NULL THEN
        RAISE EXCEPTION 'required atomic evidence relation or deterministic identity index is missing';
    END IF;
END;
$$;

ROLLBACK;
