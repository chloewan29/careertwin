-- Publish one complete Career Memory revision through a single PostgREST RPC
-- transaction. Candidate rows are private-by-pointer until the final career
-- promotion write; career-wide derived rows are replaced only after the full
-- payload has passed structural and relationship validation.

CREATE OR REPLACE FUNCTION public.publish_atomic_career_memory(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_profile_id UUID;
    v_user_id UUID;
    v_career_id UUID;
    v_resume_id UUID;
    v_revision TEXT;
    v_expected_active UUID;
    v_current_active UUID;
    v_current_active_created_at TIMESTAMPTZ;
    v_existing_resume_created_at TIMESTAMPTZ;
    v_status TEXT;
    v_fingerprint TEXT;
    v_stored_fingerprint TEXT;
    v_counts JSONB;
    v_candidate_resume_parsed JSONB;
    v_expected_profile_root JSONB;
    v_actual_profile_root JSONB;
    v_expected_resume_root JSONB;
    v_actual_resume_root JSONB;
    v_expected_career_root JSONB;
    v_actual_career_root JSONB;
    v_expected_publication_metadata JSONB;
    v_actual_publication_metadata JSONB;
    v_count INTEGER;
    v_item JSONB;
    v_ordinal BIGINT;
    v_identity_hex TEXT;
    v_expected_identity UUID;
BEGIN
    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: payload must be an object';
    END IF;
    IF NOT (p_payload ?& ARRAY[
        'publication_version', 'expected_previous_active_resume_id', 'profile', 'resume', 'career',
        'revision', 'materialization_status', 'experiences', 'source_units', 'evidence', 'signals',
        'capabilities', 'capability_evidence_links', 'capability_signal_links'
    ]) THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: required top-level key is missing';
    END IF;
    IF p_payload->>'publication_version' <> 'atomic-career-memory-publication/1.0.0' THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: unsupported publication version';
    END IF;
    IF EXISTS (
        SELECT 1 FROM unnest(ARRAY[
            'profile', 'resume', 'career'
        ]) key_name WHERE jsonb_typeof(p_payload->key_name) <> 'object'
    ) OR EXISTS (
        SELECT 1 FROM unnest(ARRAY[
            'experiences', 'source_units', 'evidence', 'signals', 'capabilities',
            'capability_evidence_links', 'capability_signal_links'
        ]) key_name WHERE jsonb_typeof(p_payload->key_name) <> 'array'
    ) THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: object/array shape mismatch';
    END IF;

    v_profile_id := (p_payload->'profile'->>'id')::UUID;
    v_user_id := (p_payload->'profile'->>'user_id')::UUID;
    v_career_id := (p_payload->'career'->>'id')::UUID;
    v_resume_id := (p_payload->'resume'->>'id')::UUID;
    v_revision := p_payload->>'revision';
    v_expected_active := NULLIF(p_payload->>'expected_previous_active_resume_id', '')::UUID;
    v_status := p_payload->>'materialization_status';
    IF v_revision !~ '^[a-f0-9]{64}$'
       OR p_payload->'resume'->>'content_sha256' <> v_revision
       OR p_payload->'resume'->>'profile_id' <> v_profile_id::TEXT
       OR p_payload->'resume'->>'user_id' <> v_user_id::TEXT
       OR p_payload->'career'->>'user_id' <> v_user_id::TEXT
       OR v_status NOT IN ('completed', 'needs_review') THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: root identity, revision, or status mismatch';
    END IF;

    v_candidate_resume_parsed := p_payload->'resume'->'parsed_json';
    IF v_candidate_resume_parsed IS NULL OR v_candidate_resume_parsed = 'null'::JSONB THEN
        v_candidate_resume_parsed := '{}'::JSONB;
    ELSIF jsonb_typeof(v_candidate_resume_parsed) <> 'object' THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: resume parsed_json must be an object or null';
    END IF;
    IF v_candidate_resume_parsed ? '_career_memory_publication' THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: reserved publication metadata must not be caller supplied';
    END IF;

    IF jsonb_array_length(p_payload->'experiences') NOT BETWEEN 1 AND 100
       OR jsonb_array_length(p_payload->'source_units') NOT BETWEEN 1 AND 2000
       OR jsonb_array_length(p_payload->'evidence') > 5000
       OR jsonb_array_length(p_payload->'signals') > 10000
       OR jsonb_array_length(p_payload->'capabilities') > 1000
       OR jsonb_array_length(p_payload->'capability_evidence_links') > 20000
       OR jsonb_array_length(p_payload->'capability_signal_links') > 20000 THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: collection cardinality outside supported bounds';
    END IF;
    IF length(COALESCE(p_payload->'resume'->>'raw_text', '')) > 2000000 THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: resume text exceeds supported bound';
    END IF;

    -- Serialize both career creation and publication. The user lock prevents
    -- concurrent first-career creation; the row lock serializes established careers.
    PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::TEXT, 0));
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = v_profile_id AND p.user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'CTPUB_OWNERSHIP_CONFLICT: profile/user ownership mismatch';
    END IF;
    SELECT c.active_resume_id INTO v_current_active
    FROM public.careers c WHERE c.id = v_career_id AND c.user_id = v_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        IF EXISTS (SELECT 1 FROM public.careers c WHERE c.id = v_career_id)
           OR EXISTS (SELECT 1 FROM public.careers c WHERE c.user_id = v_user_id) THEN
            RAISE EXCEPTION 'CTPUB_CAREER_CONFLICT: submitted career is not the canonical career for this user';
        END IF;
        INSERT INTO public.careers (id, user_id, headline, summary, total_years_experience)
        VALUES (
            v_career_id, v_user_id, p_payload->'career'->>'headline', p_payload->'career'->>'summary',
            NULLIF(p_payload->'career'->>'total_years_experience', '')::NUMERIC
        );
        v_current_active := NULL;
    END IF;
    v_fingerprint := encode(extensions.digest(convert_to(p_payload::TEXT, 'UTF8'), 'sha256'), 'hex');
    v_counts := jsonb_build_object(
        'experiences', jsonb_array_length(p_payload->'experiences'),
        'source_units', jsonb_array_length(p_payload->'source_units'),
        'evidence', jsonb_array_length(p_payload->'evidence'),
        'signals', jsonb_array_length(p_payload->'signals'),
        'capabilities', jsonb_array_length(p_payload->'capabilities'),
        'capability_evidence_links', jsonb_array_length(p_payload->'capability_evidence_links'),
        'capability_signal_links', jsonb_array_length(p_payload->'capability_signal_links')
    );

    IF v_current_active IS DISTINCT FROM v_resume_id AND EXISTS (
        SELECT 1 FROM public.resumes r
        WHERE r.id = v_resume_id
          AND r.materialization_status = 'completed'
          AND r.parsed_json #>> '{_career_memory_publication,fingerprint}' = v_fingerprint
    ) THEN
        RAISE EXCEPTION 'CTPUB_ACTIVE_CONFLICT: active pointer differs';
    END IF;

    -- A committed response-loss retry must be a read-only classification.
    IF v_current_active = v_resume_id THEN
        SELECT r.parsed_json #>> '{_career_memory_publication,fingerprint}'
        INTO v_stored_fingerprint FROM public.resumes r WHERE r.id = v_resume_id;
        IF v_stored_fingerprint IS DISTINCT FROM v_fingerprint THEN
            RAISE EXCEPTION 'CTPUB_ACTIVE_CONFLICT: active candidate fingerprint differs';
        END IF;

        -- Root replay reconciliation manifest:
        -- profile: identity/ownership plus every payload-assigned attribute;
        -- resume: identity/source/content plus normalized candidate parsed_json and materialization version;
        -- career: identity/ownership plus every payload-assigned descriptive aggregate.
        -- created_at/updated_at and the exact materialized_at timestamp are server-managed.
        -- Unassigned legacy columns are independently mutable. display_name is conditionally
        -- publication-owned only when the candidate supplies a non-empty value.
        v_expected_profile_root := jsonb_build_object(
            'id', v_profile_id,
            'user_id', v_user_id,
            'current_title', p_payload->'profile'->>'current_title',
            'years_experience', (NULLIF(p_payload->'profile'->>'years_experience', '')::NUMERIC)::INTEGER,
            'seniority_level', p_payload->'profile'->>'seniority_level',
            'industry', p_payload->'profile'->>'industry',
            'summary', p_payload->'profile'->>'summary',
            'companies', COALESCE(p_payload->'profile'->'companies', '[]'::JSONB),
            'capabilities', COALESCE(p_payload->'profile'->'capabilities', '[]'::JSONB),
            'capability_evidence', COALESCE(p_payload->'profile'->'capability_evidence', '{}'::JSONB)
        ) || CASE WHEN NULLIF(p_payload->'profile'->>'display_name', '') IS NULL
            THEN '{}'::JSONB
            ELSE jsonb_build_object('display_name', p_payload->'profile'->>'display_name')
        END;
        SELECT jsonb_build_object(
            'id', p.id,
            'user_id', p.user_id,
            'current_title', p.current_title,
            'years_experience', p.years_experience,
            'seniority_level', p.seniority_level,
            'industry', p.industry,
            'summary', p.summary,
            'companies', p.companies,
            'capabilities', p.capabilities,
            'capability_evidence', p.capability_evidence
        ) || CASE WHEN NULLIF(p_payload->'profile'->>'display_name', '') IS NULL
            THEN '{}'::JSONB
            ELSE jsonb_build_object('display_name', p.display_name)
        END
        INTO v_actual_profile_root
        FROM public.profiles p
        WHERE p.id = v_profile_id;
        IF v_actual_profile_root IS DISTINCT FROM v_expected_profile_root THEN
            RAISE EXCEPTION 'CTPUB_ACTIVE_CONFLICT: profile root mismatch';
        END IF;

        v_expected_resume_root := jsonb_build_object(
            'id', v_resume_id,
            'user_id', v_user_id,
            'profile_id', v_profile_id,
            'file_name', p_payload->'resume'->>'file_name',
            'file_url', p_payload->'resume'->>'file_url',
            'raw_text', p_payload->'resume'->>'raw_text',
            'parsed_json', v_candidate_resume_parsed,
            'content_sha256', v_revision,
            'materialization_version', 'career-memory-atomic-materialization/1.0.0'
        );
        SELECT jsonb_build_object(
            'id', r.id,
            'user_id', r.user_id,
            'profile_id', r.profile_id,
            'file_name', r.file_name,
            'file_url', r.file_url,
            'raw_text', r.raw_text,
            'parsed_json', r.parsed_json - '_career_memory_publication',
            'content_sha256', r.content_sha256,
            'materialization_version', r.materialization_version
        ), r.parsed_json->'_career_memory_publication'
        INTO v_actual_resume_root, v_actual_publication_metadata
        FROM public.resumes r
        WHERE r.id = v_resume_id;
        IF v_actual_resume_root IS DISTINCT FROM v_expected_resume_root THEN
            RAISE EXCEPTION 'CTPUB_ACTIVE_CONFLICT: resume root mismatch';
        END IF;

        v_expected_publication_metadata := jsonb_build_object(
            'version', p_payload->>'publication_version',
            'fingerprint', v_fingerprint,
            'counts', v_counts,
            'expected_previous_active_resume_id', v_expected_active
        );
        IF v_actual_publication_metadata IS DISTINCT FROM v_expected_publication_metadata THEN
            RAISE EXCEPTION 'CTPUB_ACTIVE_CONFLICT: reserved publication metadata mismatch';
        END IF;

        v_expected_career_root := jsonb_build_object(
            'id', v_career_id,
            'user_id', v_user_id,
            'headline', p_payload->'career'->>'headline',
            'summary', p_payload->'career'->>'summary',
            'total_years_experience', NULLIF(p_payload->'career'->>'total_years_experience', '')::NUMERIC
        );
        SELECT jsonb_build_object(
            'id', c.id,
            'user_id', c.user_id,
            'headline', c.headline,
            'summary', c.summary,
            'total_years_experience', c.total_years_experience
        )
        INTO v_actual_career_root
        FROM public.careers c
        WHERE c.id = v_career_id;
        IF v_actual_career_root IS DISTINCT FROM v_expected_career_root THEN
            RAISE EXCEPTION 'CTPUB_ACTIVE_CONFLICT: career root mismatch';
        END IF;

        IF (SELECT count(*) FROM public.experiences e WHERE e.career_id = v_career_id AND e.source_revision_sha256 = v_revision)
                <> jsonb_array_length(p_payload->'experiences')
           OR (SELECT count(*) FROM public.career_source_units u WHERE u.career_id = v_career_id AND u.source_revision_sha256 = v_revision)
                <> jsonb_array_length(p_payload->'source_units')
           OR (SELECT count(*) FROM public.evidence_pieces e WHERE e.career_id = v_career_id AND e.source_revision_sha256 = v_revision)
                <> jsonb_array_length(p_payload->'evidence')
           OR (SELECT count(*) FROM public.capabilities c WHERE c.career_id = v_career_id)
                <> jsonb_array_length(p_payload->'capabilities') THEN
            RAISE EXCEPTION 'CTPUB_ACTIVE_CONFLICT: active candidate collection count differs';
        END IF;
        IF EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_payload->'experiences') expected
            LEFT JOIN public.experiences actual ON actual.id = (expected->>'id')::UUID
            WHERE actual.id IS NULL OR NOT (to_jsonb(actual) @> expected)
        ) OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_payload->'source_units') expected
            LEFT JOIN public.career_source_units actual ON actual.id = (expected->>'id')::UUID
            WHERE actual.id IS NULL OR NOT (to_jsonb(actual) @> expected)
        ) OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_payload->'evidence') expected
            LEFT JOIN public.evidence_pieces actual ON actual.id = (expected->>'id')::UUID
            WHERE actual.id IS NULL OR NOT (to_jsonb(actual) @> expected)
        ) OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_payload->'signals') expected
            LEFT JOIN public.evidence_signals actual ON actual.id = (expected->>'id')::UUID
            WHERE actual.id IS NULL OR NOT (to_jsonb(actual) @> expected)
        ) OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_payload->'capabilities') expected
            LEFT JOIN public.capabilities actual ON actual.id = (expected->>'id')::UUID
            WHERE actual.id IS NULL OR NOT (to_jsonb(actual) @> expected)
        ) OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_payload->'capability_evidence_links') expected
            LEFT JOIN public.capability_evidence_links actual
              ON actual.capability_id = (expected->>'capability_id')::UUID
             AND actual.evidence_piece_id = (expected->>'evidence_piece_id')::UUID
            WHERE actual.capability_id IS NULL OR NOT (to_jsonb(actual) @> expected)
        ) OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_payload->'capability_signal_links') expected
            LEFT JOIN public.capability_signal_links actual ON actual.id = (expected->>'id')::UUID
            WHERE actual.id IS NULL OR NOT (to_jsonb(actual) @> expected)
        ) THEN
            RAISE EXCEPTION 'CTPUB_ACTIVE_CONFLICT: active candidate value or relationship differs';
        END IF;
        IF (SELECT count(*) FROM public.evidence_signals s JOIN public.evidence_pieces e ON e.id = s.evidence_piece_id
            WHERE e.career_id = v_career_id AND e.source_revision_sha256 = v_revision) <> jsonb_array_length(p_payload->'signals')
           OR (SELECT count(*) FROM public.capability_evidence_links l JOIN public.capabilities c ON c.id = l.capability_id
            WHERE c.career_id = v_career_id) <> jsonb_array_length(p_payload->'capability_evidence_links')
           OR (SELECT count(*) FROM public.capability_signal_links l JOIN public.capabilities c ON c.id = l.capability_id
            WHERE c.career_id = v_career_id) <> jsonb_array_length(p_payload->'capability_signal_links') THEN
            RAISE EXCEPTION 'CTPUB_ACTIVE_CONFLICT: active derived multiplicity differs';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.resumes r
            WHERE r.id = v_resume_id AND r.user_id = v_user_id AND r.profile_id = v_profile_id
              AND r.content_sha256 = v_revision
              AND r.materialization_status = 'completed' AND r.materialized_at IS NOT NULL
        ) OR NOT EXISTS (
            SELECT 1 FROM public.careers c
            WHERE c.id = v_career_id AND c.user_id = v_user_id AND c.active_resume_id = v_resume_id
        ) THEN
            RAISE EXCEPTION 'CTPUB_ACTIVE_CONFLICT: active candidate completion or activation state differs';
        END IF;
        RETURN jsonb_build_object(
            'outcome', 'COMPLETE_REPLAY', 'career_id', v_career_id, 'resume_id', v_resume_id,
            'revision', v_revision, 'active_resume_id', v_resume_id, 'fingerprint', v_fingerprint, 'counts', v_counts
        );
    END IF;

    IF v_current_active IS DISTINCT FROM v_expected_active THEN
        RAISE EXCEPTION 'CTPUB_STALE_WRITER: expected active %, observed %', v_expected_active, v_current_active;
    END IF;

    -- Prevent A -> B -> A ABA publication. A completed historical revision may
    -- only be replayed while active, never promoted again over a newer revision.
    IF EXISTS (SELECT 1 FROM public.resumes r WHERE r.id = v_resume_id AND r.materialization_status = 'completed') THEN
        RAISE EXCEPTION 'CTPUB_REVISION_REGRESSION: completed historical revision cannot be republished';
    END IF;
    IF v_current_active IS NOT NULL THEN
        SELECT r.created_at INTO v_current_active_created_at FROM public.resumes r WHERE r.id = v_current_active;
        SELECT r.created_at INTO v_existing_resume_created_at FROM public.resumes r WHERE r.id = v_resume_id;
        IF v_existing_resume_created_at IS NOT NULL AND v_existing_resume_created_at <= v_current_active_created_at THEN
            RAISE EXCEPTION 'CTPUB_REVISION_REGRESSION: candidate predates active revision';
        END IF;
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.resumes r
        WHERE r.profile_id = v_profile_id AND r.content_sha256 = v_revision AND r.id <> v_resume_id
    ) THEN
        RAISE EXCEPTION 'CTPUB_IDENTITY_CONFLICT: revision belongs to another resume identity';
    END IF;

    -- Collection IDs must be unique and every edge must remain inside the
    -- submitted career/resume/revision graph.
    IF EXISTS (
        SELECT 1 FROM (VALUES
            ('experiences', p_payload->'experiences'), ('source_units', p_payload->'source_units'),
            ('evidence', p_payload->'evidence'), ('signals', p_payload->'signals'),
            ('capabilities', p_payload->'capabilities'), ('capability_signal_links', p_payload->'capability_signal_links')
        ) collections(name, rows)
        WHERE jsonb_array_length(rows) <> (SELECT count(DISTINCT item->>'id') FROM jsonb_array_elements(rows) item)
    ) THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: duplicate deterministic identity';
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'experiences') LOOP
        v_identity_hex := substr(encode(extensions.digest(convert_to(
            concat_ws(E'\x1f', 'experience', v_career_id::TEXT, v_revision, v_item->>'source_role_ref'), 'UTF8'
        ), 'sha256'), 'hex'), 1, 32);
        v_identity_hex := overlay(v_identity_hex placing '5' from 13 for 1);
        v_identity_hex := overlay(v_identity_hex placing substr('89ab', mod(strpos('0123456789abcdef', substr(v_identity_hex, 17, 1)) - 1, 4) + 1, 1) from 17 for 1);
        v_expected_identity := (substr(v_identity_hex,1,8)||'-'||substr(v_identity_hex,9,4)||'-'||substr(v_identity_hex,13,4)||'-'||substr(v_identity_hex,17,4)||'-'||substr(v_identity_hex,21,12))::UUID;
        IF (v_item->>'id')::UUID <> v_expected_identity THEN RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: non-deterministic experience identity'; END IF;
    END LOOP;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'source_units') LOOP
        v_identity_hex := substr(encode(extensions.digest(convert_to(
            concat_ws(E'\x1f', 'source-unit', v_career_id::TEXT, v_revision, v_item->>'source_unit_ref'), 'UTF8'
        ), 'sha256'), 'hex'), 1, 32);
        v_identity_hex := overlay(v_identity_hex placing '5' from 13 for 1);
        v_identity_hex := overlay(v_identity_hex placing substr('89ab', mod(strpos('0123456789abcdef', substr(v_identity_hex, 17, 1)) - 1, 4) + 1, 1) from 17 for 1);
        v_expected_identity := (substr(v_identity_hex,1,8)||'-'||substr(v_identity_hex,9,4)||'-'||substr(v_identity_hex,13,4)||'-'||substr(v_identity_hex,17,4)||'-'||substr(v_identity_hex,21,12))::UUID;
        IF (v_item->>'id')::UUID <> v_expected_identity THEN RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: non-deterministic source-unit identity'; END IF;
    END LOOP;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'evidence') LOOP
        v_identity_hex := substr(encode(extensions.digest(convert_to(
            concat_ws(E'\x1f', 'atomic-evidence', v_career_id::TEXT, v_revision, v_item->>'source_unit_ref', v_item->>'atomic_index'), 'UTF8'
        ), 'sha256'), 'hex'), 1, 32);
        v_identity_hex := overlay(v_identity_hex placing '5' from 13 for 1);
        v_identity_hex := overlay(v_identity_hex placing substr('89ab', mod(strpos('0123456789abcdef', substr(v_identity_hex, 17, 1)) - 1, 4) + 1, 1) from 17 for 1);
        v_expected_identity := (substr(v_identity_hex,1,8)||'-'||substr(v_identity_hex,9,4)||'-'||substr(v_identity_hex,13,4)||'-'||substr(v_identity_hex,17,4)||'-'||substr(v_identity_hex,21,12))::UUID;
        IF (v_item->>'id')::UUID <> v_expected_identity THEN RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: non-deterministic evidence identity'; END IF;
    END LOOP;
    FOR v_item, v_ordinal IN SELECT value, ordinality FROM jsonb_array_elements(p_payload->'signals') WITH ORDINALITY LOOP
        v_identity_hex := substr(encode(extensions.digest(convert_to(
            concat_ws(E'\x1f', 'evidence-signal', v_career_id::TEXT, v_revision, v_item->>'evidence_piece_id', v_ordinal - 1), 'UTF8'
        ), 'sha256'), 'hex'), 1, 32);
        v_identity_hex := overlay(v_identity_hex placing '5' from 13 for 1);
        v_identity_hex := overlay(v_identity_hex placing substr('89ab', mod(strpos('0123456789abcdef', substr(v_identity_hex, 17, 1)) - 1, 4) + 1, 1) from 17 for 1);
        v_expected_identity := (substr(v_identity_hex,1,8)||'-'||substr(v_identity_hex,9,4)||'-'||substr(v_identity_hex,13,4)||'-'||substr(v_identity_hex,17,4)||'-'||substr(v_identity_hex,21,12))::UUID;
        IF (v_item->>'id')::UUID <> v_expected_identity THEN RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: non-deterministic signal identity'; END IF;
    END LOOP;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'capabilities') LOOP
        v_identity_hex := substr(encode(extensions.digest(convert_to(
            concat_ws(E'\x1f', 'capability', v_career_id::TEXT, v_revision, v_item->>'normalized_name'), 'UTF8'
        ), 'sha256'), 'hex'), 1, 32);
        v_identity_hex := overlay(v_identity_hex placing '5' from 13 for 1);
        v_identity_hex := overlay(v_identity_hex placing substr('89ab', mod(strpos('0123456789abcdef', substr(v_identity_hex, 17, 1)) - 1, 4) + 1, 1) from 17 for 1);
        v_expected_identity := (substr(v_identity_hex,1,8)||'-'||substr(v_identity_hex,9,4)||'-'||substr(v_identity_hex,13,4)||'-'||substr(v_identity_hex,17,4)||'-'||substr(v_identity_hex,21,12))::UUID;
        IF (v_item->>'id')::UUID <> v_expected_identity THEN RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: non-deterministic capability identity'; END IF;
    END LOOP;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'capability_signal_links') LOOP
        v_identity_hex := substr(encode(extensions.digest(convert_to(
            concat_ws(E'\x1f', 'capability-signal-link', v_item->>'capability_id', v_item->>'evidence_signal_id'), 'UTF8'
        ), 'sha256'), 'hex'), 1, 32);
        v_identity_hex := overlay(v_identity_hex placing '5' from 13 for 1);
        v_identity_hex := overlay(v_identity_hex placing substr('89ab', mod(strpos('0123456789abcdef', substr(v_identity_hex, 17, 1)) - 1, 4) + 1, 1) from 17 for 1);
        v_expected_identity := (substr(v_identity_hex,1,8)||'-'||substr(v_identity_hex,9,4)||'-'||substr(v_identity_hex,13,4)||'-'||substr(v_identity_hex,17,4)||'-'||substr(v_identity_hex,21,12))::UUID;
        IF (v_item->>'id')::UUID <> v_expected_identity THEN RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: non-deterministic signal-link identity'; END IF;
    END LOOP;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'experiences') e
        WHERE e->>'career_id' <> v_career_id::TEXT OR e->>'resume_id' <> v_resume_id::TEXT
           OR e->>'source_revision_sha256' <> v_revision OR NULLIF(e->>'source_role_ref', '') IS NULL
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'source_units') u
        WHERE u->>'career_id' <> v_career_id::TEXT OR u->>'resume_id' <> v_resume_id::TEXT
           OR u->>'source_revision_sha256' <> v_revision
           OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'experiences') e
               WHERE e->>'id' = u->>'experience_id' AND e->>'source_role_ref' = u->>'source_role_ref')
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'evidence') e
        WHERE e->>'career_id' <> v_career_id::TEXT OR e->>'resume_id' <> v_resume_id::TEXT
           OR e->>'source_revision_sha256' <> v_revision
           OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'source_units') u
               WHERE u->>'id' = e->>'source_unit_id' AND u->>'experience_id' = e->>'experience_id'
                 AND u->>'source_unit_ref' = e->>'source_unit_ref' AND u->>'source_role_ref' = e->>'source_role_ref')
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'signals') s
        WHERE s->>'career_id' <> v_career_id::TEXT
           OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'evidence') e WHERE e->>'id' = s->>'evidence_piece_id')
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'capabilities') c
        WHERE c->>'career_id' <> v_career_id::TEXT OR NULLIF(c->>'normalized_name', '') IS NULL
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'capability_evidence_links') l
        WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'capabilities') c WHERE c->>'id' = l->>'capability_id')
           OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'evidence') e WHERE e->>'id' = l->>'evidence_piece_id')
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'capability_signal_links') l
        WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'capabilities') c WHERE c->>'id' = l->>'capability_id')
           OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'signals') s WHERE s->>'id' = l->>'evidence_signal_id')
    ) THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: cross-career, cross-revision, or orphan relationship';
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'source_units') u
        WHERE ((u->>'fate' = 'ATOMIC_EVIDENCE_CREATED') <> EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_payload->'evidence') e WHERE e->>'source_unit_id' = u->>'id'
        ))
    ) THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: source-unit fate/evidence cardinality mismatch';
    END IF;
    IF (SELECT count(DISTINCT c->>'normalized_name') FROM jsonb_array_elements(p_payload->'capabilities') c)
            <> jsonb_array_length(p_payload->'capabilities')
       OR (SELECT count(*) FROM jsonb_array_elements(p_payload->'capability_evidence_links') l)
            <> (SELECT count(*) FROM (SELECT DISTINCT l->>'capability_id', l->>'evidence_piece_id' FROM jsonb_array_elements(p_payload->'capability_evidence_links') l) d)
       OR (SELECT count(*) FROM jsonb_array_elements(p_payload->'capability_signal_links') l)
            <> (SELECT count(*) FROM (SELECT DISTINCT l->>'capability_id', l->>'evidence_signal_id' FROM jsonb_array_elements(p_payload->'capability_signal_links') l) d) THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: duplicate capability or link identity';
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'capabilities') c
        WHERE COALESCE((c->>'evidence_count')::INTEGER, -1) <> (
                SELECT count(DISTINCT l->>'evidence_piece_id')
                FROM jsonb_array_elements(p_payload->'capability_evidence_links') l
                WHERE l->>'capability_id' = c->>'id'
            )
           OR COALESCE((c->>'evidence_signal_count')::INTEGER, -1) <> (
                SELECT count(DISTINCT l->>'evidence_signal_id')
                FROM jsonb_array_elements(p_payload->'capability_signal_links') l
                WHERE l->>'capability_id' = c->>'id'
            )
           OR COALESCE(c->'supporting_evidence_ids', '[]'::JSONB) <> COALESCE((
                SELECT jsonb_agg(to_jsonb(evidence_id) ORDER BY evidence_id)
                FROM (
                    SELECT DISTINCT l->>'evidence_piece_id' AS evidence_id
                    FROM jsonb_array_elements(p_payload->'capability_evidence_links') l
                    WHERE l->>'capability_id' = c->>'id'
                ) ids
            ), '[]'::JSONB)
    ) THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: capability aggregate/link mismatch';
    END IF;
    IF v_status = 'completed' AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'source_units') u
        WHERE u->>'fate' IN ('PROVIDER_FAILURE', 'VALIDATION_REJECTED')
    ) THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: failed source unit cannot be completed';
    END IF;
    IF v_status = 'needs_review' AND (
        jsonb_array_length(p_payload->'signals') <> 0 OR jsonb_array_length(p_payload->'capabilities') <> 0
        OR jsonb_array_length(p_payload->'capability_evidence_links') <> 0
        OR jsonb_array_length(p_payload->'capability_signal_links') <> 0
    ) THEN
        RAISE EXCEPTION 'CTPUB_INVALID_PAYLOAD: review materialization cannot publish derived state';
    END IF;

    -- Reject deterministic IDs already owned by another immutable graph.
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'experiences') expected
        JOIN public.experiences actual ON actual.id = (expected->>'id')::UUID
        WHERE actual.career_id <> v_career_id OR actual.source_revision_sha256 IS DISTINCT FROM v_revision
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'source_units') expected
        JOIN public.career_source_units actual ON actual.id = (expected->>'id')::UUID
        WHERE actual.career_id <> v_career_id OR actual.source_revision_sha256 <> v_revision
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'evidence') expected
        JOIN public.evidence_pieces actual ON actual.id = (expected->>'id')::UUID
        WHERE actual.career_id <> v_career_id OR actual.source_revision_sha256 IS DISTINCT FROM v_revision
    ) THEN
        RAISE EXCEPTION 'CTPUB_IDENTITY_CONFLICT: deterministic identity belongs to another graph';
    END IF;

    UPDATE public.profiles SET
        current_title = p_payload->'profile'->>'current_title',
        years_experience = NULLIF(p_payload->'profile'->>'years_experience', '')::NUMERIC,
        seniority_level = p_payload->'profile'->>'seniority_level',
        industry = p_payload->'profile'->>'industry',
        summary = p_payload->'profile'->>'summary',
        companies = COALESCE(p_payload->'profile'->'companies', '[]'::JSONB),
        capabilities = COALESCE(p_payload->'profile'->'capabilities', '[]'::JSONB),
        capability_evidence = COALESCE(p_payload->'profile'->'capability_evidence', '{}'::JSONB),
        display_name = COALESCE(NULLIF(p_payload->'profile'->>'display_name', ''), display_name)
    WHERE id = v_profile_id AND user_id = v_user_id;

    INSERT INTO public.resumes (
        id, user_id, profile_id, file_name, file_url, raw_text, parsed_json, content_sha256,
        materialization_version, materialization_status
    ) VALUES (
        v_resume_id, v_user_id, v_profile_id, p_payload->'resume'->>'file_name',
        p_payload->'resume'->>'file_url', p_payload->'resume'->>'raw_text',
        v_candidate_resume_parsed, v_revision,
        'career-memory-atomic-materialization/1.0.0', 'pending'
    ) ON CONFLICT (profile_id, content_sha256) DO UPDATE SET
        file_name = EXCLUDED.file_name, file_url = EXCLUDED.file_url, raw_text = EXCLUDED.raw_text,
        parsed_json = EXCLUDED.parsed_json, materialization_status = 'pending', materialized_at = NULL;
    IF NOT EXISTS (SELECT 1 FROM public.resumes r WHERE r.id = v_resume_id AND r.profile_id = v_profile_id AND r.content_sha256 = v_revision) THEN
        RAISE EXCEPTION 'CTPUB_IDENTITY_CONFLICT: resume upsert resolved to another identity';
    END IF;

    -- Candidate-owned partial rows are authoritative and safely replaceable
    -- while inactive. Deletes remain inside this transaction.
    DELETE FROM public.evidence_pieces e WHERE e.career_id = v_career_id AND e.source_revision_sha256 = v_revision;
    DELETE FROM public.career_source_units u WHERE u.career_id = v_career_id AND u.source_revision_sha256 = v_revision;
    DELETE FROM public.experiences e WHERE e.career_id = v_career_id AND e.source_revision_sha256 = v_revision;

    INSERT INTO public.experiences (
        id, career_id, resume_id, company, title, date_range, summary, source_type, sort_order,
        source_revision_sha256, source_role_ref, materialization_version
    ) SELECT id, career_id, resume_id, company, title, date_range, summary, source_type, sort_order,
        source_revision_sha256, source_role_ref, materialization_version
    FROM jsonb_to_recordset(p_payload->'experiences') AS x(
        id UUID, career_id UUID, resume_id UUID, company TEXT, title TEXT, date_range TEXT,
        summary TEXT, source_type TEXT, sort_order INTEGER, source_revision_sha256 TEXT,
        source_role_ref TEXT, materialization_version TEXT
    );

    INSERT INTO public.career_source_units (
        id, career_id, resume_id, experience_id, source_revision_sha256, source_role_ref,
        source_unit_ref, source_unit_ordinal, source_unit_sha256, source_text, fate,
        provider, model, provider_version, validation_errors
    ) SELECT id, career_id, resume_id, experience_id, source_revision_sha256, source_role_ref,
        source_unit_ref, source_unit_ordinal, source_unit_sha256, source_text, fate,
        provider, model, provider_version, validation_errors
    FROM jsonb_to_recordset(p_payload->'source_units') AS x(
        id UUID, career_id UUID, resume_id UUID, experience_id UUID, source_revision_sha256 TEXT,
        source_role_ref TEXT, source_unit_ref TEXT, source_unit_ordinal INTEGER, source_unit_sha256 TEXT,
        source_text TEXT, fate TEXT, provider TEXT, model TEXT, provider_version TEXT, validation_errors JSONB
    );

    INSERT INTO public.evidence_pieces (
        id, career_id, resume_id, experience_id, company, role, date_range, raw_text, source_type,
        evidence_source_type, summary, action, impact, stakeholders, tools_methods, business_context,
        inferred_scale, inferred_scope, confidence, missing_fields, sort_order, source_revision_sha256,
        source_role_ref, source_unit_id, source_unit_ref, source_unit_sha256, source_quote,
        source_span_start, source_span_end, atomic_index, atomic_statement, context, outcome,
        source_supported_metrics, extraction_confidence, provider, provider_model, provider_version, review_status
    ) SELECT id, career_id, resume_id, experience_id, company, role, date_range, raw_text, source_type,
        evidence_source_type, summary, action, impact, stakeholders, tools_methods, business_context,
        inferred_scale, inferred_scope, confidence, missing_fields, sort_order, source_revision_sha256,
        source_role_ref, source_unit_id, source_unit_ref, source_unit_sha256, source_quote,
        source_span_start, source_span_end, atomic_index, atomic_statement, context, outcome,
        source_supported_metrics, extraction_confidence, provider, provider_model, provider_version, review_status
    FROM jsonb_to_recordset(p_payload->'evidence') AS x(
        id UUID, career_id UUID, resume_id UUID, experience_id UUID, company TEXT, role TEXT, date_range TEXT,
        raw_text TEXT, source_type TEXT, evidence_source_type TEXT, summary TEXT, action TEXT, impact TEXT,
        stakeholders TEXT[], tools_methods TEXT[], business_context TEXT, inferred_scale JSONB, inferred_scope JSONB,
        confidence NUMERIC, missing_fields TEXT[], sort_order INTEGER, source_revision_sha256 TEXT,
        source_role_ref TEXT, source_unit_id UUID, source_unit_ref TEXT, source_unit_sha256 TEXT,
        source_quote TEXT, source_span_start INTEGER, source_span_end INTEGER, atomic_index INTEGER,
        atomic_statement TEXT, context TEXT, outcome TEXT, source_supported_metrics JSONB,
        extraction_confidence NUMERIC, provider TEXT, provider_model TEXT, provider_version TEXT, review_status TEXT
    );

    INSERT INTO public.evidence_signals (
        id, career_id, evidence_piece_id, action, domain, initiative_type, scope_level, ownership_level,
        stakeholder_scope, tool_signals, capability_hints, team_signal, impact_signal, confidence_score
    ) SELECT id, career_id, evidence_piece_id, action, domain, initiative_type, scope_level, ownership_level,
        stakeholder_scope, tool_signals, capability_hints, team_signal, impact_signal, confidence_score
    FROM jsonb_to_recordset(p_payload->'signals') AS x(
        id UUID, career_id UUID, evidence_piece_id UUID, action TEXT, domain TEXT, initiative_type TEXT,
        scope_level TEXT, ownership_level TEXT, stakeholder_scope JSONB, tool_signals JSONB,
        capability_hints JSONB, team_signal TEXT, impact_signal TEXT, confidence_score NUMERIC
    );

    IF v_status = 'needs_review' THEN
        UPDATE public.resumes SET
            materialization_version = 'career-memory-atomic-materialization/1.0.0',
            materialization_status = 'needs_review', materialized_at = NULL,
            parsed_json = v_candidate_resume_parsed
        WHERE id = v_resume_id;
        RETURN jsonb_build_object(
            'outcome', 'NEEDS_REVIEW', 'career_id', v_career_id, 'resume_id', v_resume_id,
            'revision', v_revision, 'active_resume_id', v_current_active,
            'fingerprint', v_fingerprint, 'counts', v_counts
        );
    END IF;

    -- The previous capability graph remains visible to concurrent readers until
    -- this transaction commits; rollback restores it exactly.
    DELETE FROM public.capabilities c WHERE c.career_id = v_career_id;
    INSERT INTO public.capabilities (
        id, career_id, name, normalized_name, canonical_name, display_name, scope_summary,
        ownership_summary, impact_summary, confidence, confidence_score, evidence_count,
        evidence_signal_count, supporting_evidence_ids, context_domains, scale_summary, confidence_level
    ) SELECT id, career_id, name, normalized_name, canonical_name, display_name, scope_summary,
        ownership_summary, impact_summary, confidence, confidence_score, evidence_count,
        evidence_signal_count, supporting_evidence_ids, context_domains, scale_summary, confidence_level
    FROM jsonb_to_recordset(p_payload->'capabilities') AS x(
        id UUID, career_id UUID, name TEXT, normalized_name TEXT, canonical_name TEXT, display_name TEXT,
        scope_summary TEXT, ownership_summary TEXT, impact_summary TEXT, confidence NUMERIC,
        confidence_score NUMERIC, evidence_count INTEGER, evidence_signal_count INTEGER,
        supporting_evidence_ids UUID[], context_domains TEXT[], scale_summary JSONB, confidence_level TEXT
    );
    INSERT INTO public.capability_evidence_links (capability_id, evidence_piece_id, link_strength)
    SELECT capability_id, evidence_piece_id, link_strength
    FROM jsonb_to_recordset(p_payload->'capability_evidence_links') AS x(
        capability_id UUID, evidence_piece_id UUID, link_strength NUMERIC
    );
    INSERT INTO public.capability_signal_links (
        id, capability_id, evidence_signal_id, contribution_weight, rationale
    ) SELECT id, capability_id, evidence_signal_id, contribution_weight, rationale
    FROM jsonb_to_recordset(p_payload->'capability_signal_links') AS x(
        id UUID, capability_id UUID, evidence_signal_id UUID, contribution_weight NUMERIC, rationale TEXT
    );

    -- Exact final reconciliation: cardinality, deterministic IDs, field values,
    -- and every edge must match the authoritative submitted graph.
    IF (SELECT count(*) FROM public.experiences e WHERE e.career_id = v_career_id AND e.source_revision_sha256 = v_revision)
            <> jsonb_array_length(p_payload->'experiences')
       OR (SELECT count(*) FROM public.career_source_units u WHERE u.career_id = v_career_id AND u.source_revision_sha256 = v_revision)
            <> jsonb_array_length(p_payload->'source_units')
       OR (SELECT count(*) FROM public.evidence_pieces e WHERE e.career_id = v_career_id AND e.source_revision_sha256 = v_revision)
            <> jsonb_array_length(p_payload->'evidence')
       OR (SELECT count(*) FROM public.evidence_signals s JOIN public.evidence_pieces e ON e.id = s.evidence_piece_id
            WHERE e.career_id = v_career_id AND e.source_revision_sha256 = v_revision)
            <> jsonb_array_length(p_payload->'signals')
       OR (SELECT count(*) FROM public.capabilities c WHERE c.career_id = v_career_id)
            <> jsonb_array_length(p_payload->'capabilities')
       OR (SELECT count(*) FROM public.capability_evidence_links l JOIN public.capabilities c ON c.id = l.capability_id
            WHERE c.career_id = v_career_id) <> jsonb_array_length(p_payload->'capability_evidence_links')
       OR (SELECT count(*) FROM public.capability_signal_links l JOIN public.capabilities c ON c.id = l.capability_id
            WHERE c.career_id = v_career_id) <> jsonb_array_length(p_payload->'capability_signal_links') THEN
        RAISE EXCEPTION 'CTPUB_RECONCILIATION_FAILED: collection multiplicity differs';
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'experiences') expected
        LEFT JOIN public.experiences actual ON actual.id = (expected->>'id')::UUID
        WHERE actual.id IS NULL OR NOT (to_jsonb(actual) @> expected)
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'source_units') expected
        LEFT JOIN public.career_source_units actual ON actual.id = (expected->>'id')::UUID
        WHERE actual.id IS NULL OR NOT (to_jsonb(actual) @> expected)
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'evidence') expected
        LEFT JOIN public.evidence_pieces actual ON actual.id = (expected->>'id')::UUID
        WHERE actual.id IS NULL OR NOT (to_jsonb(actual) @> expected)
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'signals') expected
        LEFT JOIN public.evidence_signals actual ON actual.id = (expected->>'id')::UUID
        WHERE actual.id IS NULL OR NOT (to_jsonb(actual) @> expected)
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'capabilities') expected
        LEFT JOIN public.capabilities actual ON actual.id = (expected->>'id')::UUID
        WHERE actual.id IS NULL OR NOT (to_jsonb(actual) @> expected)
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'capability_evidence_links') expected
        LEFT JOIN public.capability_evidence_links actual
          ON actual.capability_id = (expected->>'capability_id')::UUID
         AND actual.evidence_piece_id = (expected->>'evidence_piece_id')::UUID
        WHERE actual.capability_id IS NULL OR NOT (to_jsonb(actual) @> expected)
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload->'capability_signal_links') expected
        LEFT JOIN public.capability_signal_links actual ON actual.id = (expected->>'id')::UUID
        WHERE actual.id IS NULL OR NOT (to_jsonb(actual) @> expected)
    ) THEN
        RAISE EXCEPTION 'CTPUB_RECONCILIATION_FAILED: deterministic value or relationship differs';
    END IF;

    UPDATE public.resumes SET
        materialization_version = 'career-memory-atomic-materialization/1.0.0',
        materialization_status = 'completed', materialized_at = clock_timestamp(),
        parsed_json = v_candidate_resume_parsed || jsonb_build_object(
            '_career_memory_publication', jsonb_build_object(
                'version', p_payload->>'publication_version', 'fingerprint', v_fingerprint, 'counts', v_counts,
                'expected_previous_active_resume_id', v_expected_active
            )
        )
    WHERE id = v_resume_id;
    UPDATE public.careers SET
        headline = p_payload->'career'->>'headline', summary = p_payload->'career'->>'summary',
        total_years_experience = NULLIF(p_payload->'career'->>'total_years_experience', '')::NUMERIC,
        active_resume_id = v_resume_id
    WHERE id = v_career_id AND user_id = v_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'CTPUB_PROMOTION_FAILED: career disappeared before activation';
    END IF;

    RETURN jsonb_build_object(
        'outcome', 'PUBLISHED', 'career_id', v_career_id, 'resume_id', v_resume_id,
        'revision', v_revision, 'active_resume_id', v_resume_id,
        'fingerprint', v_fingerprint, 'counts', v_counts
    );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_atomic_career_memory(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_atomic_career_memory(JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.publish_atomic_career_memory(JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.publish_atomic_career_memory(JSONB) TO service_role;
