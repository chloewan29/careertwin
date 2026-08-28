\set ON_ERROR_STOP on

-- Disposable-only transactional publication verification. All helpers,
-- triggers, and synthetic rows are removed before this script completes.

CREATE OR REPLACE FUNCTION public.careertwin_test_deterministic_uuid(p_parts TEXT[])
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_hex TEXT;
BEGIN
    v_hex := substr(encode(extensions.digest(convert_to(array_to_string(p_parts, E'\x1f'), 'UTF8'), 'sha256'), 'hex'), 1, 32);
    v_hex := overlay(v_hex placing '5' from 13 for 1);
    v_hex := overlay(v_hex placing substr('89ab', mod(strpos('0123456789abcdef', substr(v_hex, 17, 1)) - 1, 4) + 1, 1) from 17 for 1);
    RETURN (substr(v_hex,1,8)||'-'||substr(v_hex,9,4)||'-'||substr(v_hex,13,4)||'-'||substr(v_hex,17,4)||'-'||substr(v_hex,21,12))::UUID;
END;
$$;

CREATE OR REPLACE FUNCTION public.careertwin_test_publication_payload(
    p_sequence INTEGER, p_expected UUID, p_prefix TEXT DEFAULT '40000000'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_revision TEXT := lpad(to_hex(p_sequence), 64, '0');
    v_user UUID := (p_prefix || '-0000-4000-8000-000000000001')::UUID;
    v_profile UUID := (p_prefix || '-0000-4000-8000-000000000002')::UUID;
    v_career UUID := (p_prefix || '-0000-4000-8000-000000000003')::UUID;
    v_resume UUID := (p_prefix || '-0000-4000-8000-' || lpad((p_sequence * 20 + 1)::TEXT, 12, '0'))::UUID;
    v_experience UUID := public.careertwin_test_deterministic_uuid(ARRAY['experience', v_career::TEXT, v_revision, 'ROLE_01']);
    v_unit UUID := public.careertwin_test_deterministic_uuid(ARRAY['source-unit', v_career::TEXT, v_revision, 'SOURCE_001']);
    v_evidence UUID := public.careertwin_test_deterministic_uuid(ARRAY['atomic-evidence', v_career::TEXT, v_revision, 'SOURCE_001', '0']);
    v_signal UUID := public.careertwin_test_deterministic_uuid(ARRAY['evidence-signal', v_career::TEXT, v_revision, v_evidence::TEXT, '0']);
    v_capability UUID := public.careertwin_test_deterministic_uuid(ARRAY['capability', v_career::TEXT, v_revision, 'test capability ' || p_sequence]);
    v_signal_link UUID := public.careertwin_test_deterministic_uuid(ARRAY['capability-signal-link', v_capability::TEXT, v_signal::TEXT]);
BEGIN
    RETURN jsonb_build_object(
        'publication_version', 'atomic-career-memory-publication/1.0.0',
        'expected_previous_active_resume_id', p_expected,
        'profile', jsonb_build_object(
            'id', v_profile, 'user_id', v_user,
            'display_name', 'Transactional Tester ' || p_sequence,
            'current_title', 'Transactional Test ' || p_sequence,
            'years_experience', 10, 'seniority_level', 'senior', 'industry', 'testing',
            'summary', 'Transactional publication test', 'companies', jsonb_build_array('Test Co'),
            'capabilities', jsonb_build_array('Test Capability ' || p_sequence),
            'capability_evidence', '{}'::JSONB
        ),
        'resume', jsonb_build_object(
            'id', v_resume, 'user_id', v_user, 'profile_id', v_profile,
            'file_name', 'transactional-test.pdf', 'file_url', NULL, 'raw_text', 'Delivered test outcome.',
            'parsed_json', jsonb_build_object(
                'sequence', p_sequence,
                'alpha', jsonb_build_object('enabled', true),
                'omega', 'root-state',
                'ordered_steps', jsonb_build_array('first', 'second')
            ),
            'content_sha256', v_revision
        ),
        'career', jsonb_build_object(
            'id', v_career, 'user_id', v_user,
            'headline', 'Transactional Test ' || p_sequence,
            'summary', 'Transactional publication test', 'total_years_experience', 10
        ),
        'revision', v_revision, 'materialization_status', 'completed',
        'experiences', jsonb_build_array(jsonb_build_object(
            'id', v_experience, 'career_id', v_career,
            'resume_id', v_resume, 'company', 'Test Co', 'title', 'Test Role', 'date_range', '2020 - 2026',
            'summary', NULL, 'source_type', 'resume', 'sort_order', 0,
            'source_revision_sha256', v_revision, 'source_role_ref', 'ROLE_01',
            'materialization_version', 'atomic-evidence-materialization/1.0.0'
        )),
        'source_units', jsonb_build_array(jsonb_build_object(
            'id', v_unit, 'career_id', v_career,
            'resume_id', v_resume, 'experience_id', v_experience, 'source_revision_sha256', v_revision,
            'source_role_ref', 'ROLE_01', 'source_unit_ref', 'SOURCE_001', 'source_unit_ordinal', 0,
            'source_unit_sha256', repeat('a', 64), 'source_text', 'Delivered test outcome.',
            'fate', 'ATOMIC_EVIDENCE_CREATED', 'provider', 'test', 'model', 'test',
            'provider_version', 'test/1', 'validation_errors', '[]'::JSONB
        )),
        'evidence', jsonb_build_array(jsonb_build_object(
            'id', v_evidence, 'career_id', v_career,
            'resume_id', v_resume, 'experience_id', v_experience, 'company', 'Test Co', 'role', 'Test Role',
            'date_range', '2020 - 2026', 'raw_text', 'Delivered test outcome.', 'source_type', 'resume_bullet',
            'evidence_source_type', 'resume', 'summary', 'Delivered test outcome.', 'action', 'Delivered test outcome',
            'impact', 'test outcome', 'stakeholders', jsonb_build_array(), 'tools_methods', jsonb_build_array(),
            'business_context', 'test context', 'inferred_scale', '{}'::JSONB, 'inferred_scope', '{}'::JSONB,
            'confidence', 0.9, 'missing_fields', jsonb_build_array(), 'sort_order', 0,
            'source_revision_sha256', v_revision, 'source_role_ref', 'ROLE_01', 'source_unit_id', v_unit,
            'source_unit_ref', 'SOURCE_001', 'source_unit_sha256', repeat('a', 64),
            'source_quote', 'Delivered test outcome.', 'source_span_start', 0, 'source_span_end', 23,
            'atomic_index', 0, 'atomic_statement', 'Delivered test outcome.', 'context', 'test context',
            'outcome', 'test outcome', 'source_supported_metrics', jsonb_build_array(),
            'extraction_confidence', 0.9, 'provider', 'test', 'provider_model', 'test',
            'provider_version', 'test/1', 'review_status', 'machine_validated'
        )),
        'signals', jsonb_build_array(jsonb_build_object(
            'id', v_signal, 'career_id', v_career,
            'evidence_piece_id', v_evidence, 'action', 'delivered', 'domain', 'testing',
            'initiative_type', 'delivery', 'scope_level', 'project', 'ownership_level', 'owner',
            'stakeholder_scope', jsonb_build_array('internal'), 'tool_signals', jsonb_build_array(),
            'capability_hints', jsonb_build_array('Test Capability ' || p_sequence),
            'team_signal', NULL, 'impact_signal', 'operational', 'confidence_score', 0.9
        )),
        'capabilities', jsonb_build_array(jsonb_build_object(
            'id', v_capability, 'career_id', v_career,
            'name', 'Test Capability ' || p_sequence, 'normalized_name', 'test capability ' || p_sequence,
            'canonical_name', 'test capability ' || p_sequence, 'display_name', 'Test Capability ' || p_sequence,
            'scope_summary', 'project', 'ownership_summary', 'owner', 'impact_summary', 'operational',
            'confidence', 0.9, 'confidence_score', 0.9, 'evidence_count', 1, 'evidence_signal_count', 1,
            'supporting_evidence_ids', jsonb_build_array(v_evidence), 'context_domains', jsonb_build_array('testing'),
            'scale_summary', jsonb_build_object('scale_confidence', 'high'), 'confidence_level', 'high'
        )),
        'capability_evidence_links', jsonb_build_array(jsonb_build_object(
            'capability_id', v_capability, 'evidence_piece_id', v_evidence, 'link_strength', 1
        )),
        'capability_signal_links', jsonb_build_array(jsonb_build_object(
            'id', v_signal_link, 'capability_id', v_capability, 'evidence_signal_id', v_signal,
            'contribution_weight', 0.9, 'rationale', 'Transactional test link.'
        ))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.careertwin_test_publication_payload(INTEGER, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.careertwin_test_publication_payload(INTEGER, UUID, TEXT) TO service_role;

INSERT INTO public.users (id) VALUES ('40000000-0000-4000-8000-000000000001');
INSERT INTO public.profiles (id, user_id) VALUES (
    '40000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001'
);

DO $$
DECLARE v_result JSONB; v_before JSONB; v_after JSONB;
BEGIN
    SET LOCAL ROLE service_role;
    v_result := public.publish_atomic_career_memory(public.careertwin_test_publication_payload(1, NULL));
    IF v_result->>'outcome' <> 'PUBLISHED' THEN RAISE EXCEPTION 'initial publication did not publish: %', v_result; END IF;
    SELECT jsonb_build_object(
        'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = '40000000-0000-4000-8000-000000000002'),
        'resume', (SELECT to_jsonb(r) FROM public.resumes r WHERE r.id = '40000000-0000-4000-8000-000000000021'),
        'career', (SELECT to_jsonb(c) FROM public.careers c WHERE c.id = '40000000-0000-4000-8000-000000000003'),
        'capabilities', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM public.capabilities c WHERE c.career_id = '40000000-0000-4000-8000-000000000003')
    ) INTO v_before;
    v_result := public.publish_atomic_career_memory(public.careertwin_test_publication_payload(1, NULL));
    IF v_result->>'outcome' <> 'COMPLETE_REPLAY' THEN RAISE EXCEPTION 'exact retry was not COMPLETE_REPLAY: %', v_result; END IF;
    SELECT jsonb_build_object(
        'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = '40000000-0000-4000-8000-000000000002'),
        'resume', (SELECT to_jsonb(r) FROM public.resumes r WHERE r.id = '40000000-0000-4000-8000-000000000021'),
        'career', (SELECT to_jsonb(c) FROM public.careers c WHERE c.id = '40000000-0000-4000-8000-000000000003'),
        'capabilities', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM public.capabilities c WHERE c.career_id = '40000000-0000-4000-8000-000000000003')
    ) INTO v_after;
    IF v_after IS DISTINCT FROM v_before THEN RAISE EXCEPTION 'exact replay performed a database write'; END IF;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) acl
        WHERE p.oid = 'public.publish_atomic_career_memory(jsonb)'::regprocedure
          AND acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    ) OR has_function_privilege('anon', 'public.publish_atomic_career_memory(jsonb)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.publish_atomic_career_memory(jsonb)', 'EXECUTE')
       OR NOT has_function_privilege('service_role', 'public.publish_atomic_career_memory(jsonb)', 'EXECUTE') THEN
        RAISE EXCEPTION 'publication RPC privilege boundary is incorrect';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.careertwin_test_publication_state(
    p_profile UUID, p_resume UUID, p_career UUID
)
RETURNS JSONB
LANGUAGE sql
AS $$
    SELECT jsonb_build_object(
        'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = p_profile),
        'resume', (SELECT to_jsonb(r) FROM public.resumes r WHERE r.id = p_resume),
        'career', (SELECT to_jsonb(c) FROM public.careers c WHERE c.id = p_career),
        'experiences', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.id), '[]'::JSONB) FROM public.experiences x WHERE x.career_id = p_career),
        'source_units', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.id), '[]'::JSONB) FROM public.career_source_units x WHERE x.career_id = p_career),
        'evidence', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.id), '[]'::JSONB) FROM public.evidence_pieces x WHERE x.career_id = p_career),
        'signals', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.id), '[]'::JSONB) FROM public.evidence_signals x WHERE x.career_id = p_career),
        'capabilities', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.id), '[]'::JSONB) FROM public.capabilities x WHERE x.career_id = p_career),
        'evidence_links', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.capability_id, x.evidence_piece_id), '[]'::JSONB)
            FROM public.capability_evidence_links x JOIN public.capabilities c ON c.id = x.capability_id WHERE c.career_id = p_career),
        'signal_links', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.id), '[]'::JSONB)
            FROM public.capability_signal_links x JOIN public.capabilities c ON c.id = x.capability_id WHERE c.career_id = p_career)
    );
$$;

CREATE OR REPLACE FUNCTION public.careertwin_test_assert_replay_rejected(
    p_payload JSONB,
    p_mutation_sql TEXT,
    p_restore_sql TEXT,
    p_expected_error TEXT,
    p_private_value TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_profile UUID := (p_payload->'profile'->>'id')::UUID;
    v_resume UUID := (p_payload->'resume'->>'id')::UUID;
    v_career UUID := (p_payload->'career'->>'id')::UUID;
    v_before JSONB;
    v_after JSONB;
    v_message TEXT;
    v_failed BOOLEAN := false;
    v_result JSONB;
BEGIN
    EXECUTE p_mutation_sql;
    v_before := public.careertwin_test_publication_state(v_profile, v_resume, v_career);
    BEGIN
        PERFORM public.publish_atomic_career_memory(p_payload);
    EXCEPTION WHEN OTHERS THEN
        v_failed := true;
        v_message := SQLERRM;
    END;
    IF NOT v_failed OR position(p_expected_error IN COALESCE(v_message, '')) = 0 THEN
        RAISE EXCEPTION 'root tamper did not fail as expected: expected %, observed %', p_expected_error, v_message;
    END IF;
    IF p_private_value IS NOT NULL AND position(p_private_value IN v_message) > 0 THEN
        RAISE EXCEPTION 'root mismatch diagnostic leaked private mutated content';
    END IF;
    v_after := public.careertwin_test_publication_state(v_profile, v_resume, v_career);
    IF v_after IS DISTINCT FROM v_before THEN
        RAISE EXCEPTION 'rejected replay changed persisted root or derived state';
    END IF;
    EXECUTE p_restore_sql;
    v_result := public.publish_atomic_career_memory(p_payload);
    IF v_result->>'outcome' <> 'COMPLETE_REPLAY' THEN
        RAISE EXCEPTION 'restored exact state did not replay completely';
    END IF;
END;
$$;

INSERT INTO public.users (id) VALUES ('40000000-0000-4000-8000-000000000009');

DO $$
DECLARE
    payload JSONB := public.careertwin_test_publication_payload(1, NULL);
    result JSONB;
    resume_id UUID := (public.careertwin_test_publication_payload(1, NULL)->'resume'->>'id')::UUID;
    capability_id UUID := (public.careertwin_test_publication_payload(1, NULL)->'capabilities'->0->>'id')::UUID;
    fingerprint TEXT;
BEGIN
    -- Profile: scalar, nullable, normalized/defaulted JSON, conditional display name, and ownership.
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        $sql$UPDATE public.profiles SET current_title = 'private-profile-title' WHERE id = '40000000-0000-4000-8000-000000000002'$sql$,
        $sql$UPDATE public.profiles SET current_title = 'Transactional Test 1' WHERE id = '40000000-0000-4000-8000-000000000002'$sql$,
        'profile root mismatch', 'private-profile-title');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        $sql$UPDATE public.profiles SET summary = NULL WHERE id = '40000000-0000-4000-8000-000000000002'$sql$,
        $sql$UPDATE public.profiles SET summary = 'Transactional publication test' WHERE id = '40000000-0000-4000-8000-000000000002'$sql$,
        'profile root mismatch');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        $sql$UPDATE public.profiles SET companies = '[]'::JSONB WHERE id = '40000000-0000-4000-8000-000000000002'$sql$,
        $sql$UPDATE public.profiles SET companies = '["Test Co"]'::JSONB WHERE id = '40000000-0000-4000-8000-000000000002'$sql$,
        'profile root mismatch');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        $sql$UPDATE public.profiles SET display_name = 'private-display-name' WHERE id = '40000000-0000-4000-8000-000000000002'$sql$,
        $sql$UPDATE public.profiles SET display_name = 'Transactional Tester 1' WHERE id = '40000000-0000-4000-8000-000000000002'$sql$,
        'profile root mismatch', 'private-display-name');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        $sql$UPDATE public.profiles SET user_id = '40000000-0000-4000-8000-000000000009' WHERE id = '40000000-0000-4000-8000-000000000002'$sql$,
        $sql$UPDATE public.profiles SET user_id = '40000000-0000-4000-8000-000000000001' WHERE id = '40000000-0000-4000-8000-000000000002'$sql$,
        'profile/user ownership mismatch');

    -- Resume: source content, candidate JSON, reserved metadata, identity, and completion state.
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET raw_text = %L WHERE id = %L', 'private-resume-text', resume_id),
        format('UPDATE public.resumes SET raw_text = %L WHERE id = %L', 'Delivered test outcome.', resume_id),
        'resume root mismatch', 'private-resume-text');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET file_name = %L WHERE id = %L', 'private-name.pdf', resume_id),
        format('UPDATE public.resumes SET file_name = %L WHERE id = %L', 'transactional-test.pdf', resume_id),
        'resume root mismatch', 'private-name.pdf');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET file_url = %L WHERE id = %L', 'https://private.invalid/resume', resume_id),
        format('UPDATE public.resumes SET file_url = NULL WHERE id = %L', resume_id),
        'resume root mismatch', 'https://private.invalid/resume');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET parsed_json = jsonb_set(parsed_json, ''{sequence}'', ''999''::JSONB) WHERE id = %L', resume_id),
        format('UPDATE public.resumes SET parsed_json = jsonb_set(parsed_json, ''{sequence}'', ''1''::JSONB) WHERE id = %L', resume_id),
        'resume root mismatch');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET parsed_json = parsed_json - ''alpha'' WHERE id = %L', resume_id),
        format('UPDATE public.resumes SET parsed_json = jsonb_set(parsed_json, ''{alpha}'', ''{"enabled":true}''::JSONB) WHERE id = %L', resume_id),
        'resume root mismatch');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET parsed_json = jsonb_set(parsed_json, ''{private_extra}'', ''"private-extra"''::JSONB) WHERE id = %L', resume_id),
        format('UPDATE public.resumes SET parsed_json = parsed_json - ''private_extra'' WHERE id = %L', resume_id),
        'resume root mismatch', 'private-extra');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET parsed_json = jsonb_set(parsed_json, ''{ordered_steps}'', ''["second","first"]''::JSONB) WHERE id = %L', resume_id),
        format('UPDATE public.resumes SET parsed_json = jsonb_set(parsed_json, ''{ordered_steps}'', ''["first","second"]''::JSONB) WHERE id = %L', resume_id),
        'resume root mismatch');
    SELECT parsed_json #>> '{_career_memory_publication,fingerprint}' INTO fingerprint
    FROM public.resumes WHERE id = resume_id;
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET parsed_json = (parsed_json - ''_career_memory_publication'') || jsonb_build_object(''_career_memory_publication'', jsonb_build_object(''fingerprint'', %L)) WHERE id = %L', fingerprint, resume_id),
        format('UPDATE public.resumes SET parsed_json = jsonb_set(parsed_json, ''{_career_memory_publication}'', %L::JSONB) WHERE id = %L',
            (SELECT parsed_json->'_career_memory_publication' FROM public.resumes WHERE id = resume_id)::TEXT, resume_id),
        'reserved publication metadata mismatch');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET parsed_json = jsonb_set(parsed_json, ''{_career_memory_publication,fingerprint}'', to_jsonb(repeat(''f'', 64))) WHERE id = %L', resume_id),
        format('UPDATE public.resumes SET parsed_json = jsonb_set(parsed_json, ''{_career_memory_publication,fingerprint}'', to_jsonb(%L::TEXT)) WHERE id = %L', fingerprint, resume_id),
        'active candidate fingerprint differs');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET materialization_status = ''pending'' WHERE id = %L', resume_id),
        format('UPDATE public.resumes SET materialization_status = ''completed'' WHERE id = %L', resume_id),
        'completion or activation state differs');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET materialization_version = ''private-version'' WHERE id = %L', resume_id),
        format('UPDATE public.resumes SET materialization_version = ''career-memory-atomic-materialization/1.0.0'' WHERE id = %L', resume_id),
        'resume root mismatch', 'private-version');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET content_sha256 = repeat(''f'', 64) WHERE id = %L', resume_id),
        format('UPDATE public.resumes SET content_sha256 = %L WHERE id = %L', payload->>'revision', resume_id),
        'resume root mismatch');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.resumes SET user_id = %L WHERE id = %L', '40000000-0000-4000-8000-000000000009', resume_id),
        format('UPDATE public.resumes SET user_id = %L WHERE id = %L', '40000000-0000-4000-8000-000000000001', resume_id),
        'resume root mismatch');

    -- Career: ownership, aggregate, activation, and descriptive root fields.
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        $sql$UPDATE public.careers SET user_id = '40000000-0000-4000-8000-000000000009' WHERE id = '40000000-0000-4000-8000-000000000003'$sql$,
        $sql$UPDATE public.careers SET user_id = '40000000-0000-4000-8000-000000000001' WHERE id = '40000000-0000-4000-8000-000000000003'$sql$,
        'CTPUB_CAREER_CONFLICT');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        $sql$UPDATE public.careers SET total_years_experience = 99 WHERE id = '40000000-0000-4000-8000-000000000003'$sql$,
        $sql$UPDATE public.careers SET total_years_experience = 10 WHERE id = '40000000-0000-4000-8000-000000000003'$sql$,
        'career root mismatch');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        $sql$UPDATE public.careers SET headline = 'private-career-headline' WHERE id = '40000000-0000-4000-8000-000000000003'$sql$,
        $sql$UPDATE public.careers SET headline = 'Transactional Test 1' WHERE id = '40000000-0000-4000-8000-000000000003'$sql$,
        'career root mismatch', 'private-career-headline');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        $sql$UPDATE public.careers SET active_resume_id = NULL WHERE id = '40000000-0000-4000-8000-000000000003'$sql$,
        format('UPDATE public.careers SET active_resume_id = %L WHERE id = %L', resume_id, '40000000-0000-4000-8000-000000000003'),
        'active pointer differs');

    -- Root/derived combinations.
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('UPDATE public.capabilities SET name = %L WHERE id = %L', 'private-derived-name', capability_id),
        format('UPDATE public.capabilities SET name = %L WHERE id = %L', 'Test Capability 1', capability_id),
        'active candidate value or relationship differs', 'private-derived-name');
    PERFORM public.careertwin_test_assert_replay_rejected(payload,
        format('WITH root_change AS (UPDATE public.resumes SET raw_text = %L WHERE id = %L RETURNING id) UPDATE public.capabilities SET name = %L WHERE id = %L',
            'private-combined-root', resume_id, 'private-combined-derived', capability_id),
        format('WITH root_restore AS (UPDATE public.resumes SET raw_text = %L WHERE id = %L RETURNING id) UPDATE public.capabilities SET name = %L WHERE id = %L',
            'Delivered test outcome.', resume_id, 'Test Capability 1', capability_id),
        'resume root mismatch', 'private-combined-root');

    -- Object key order is non-semantic for jsonb.
    payload := jsonb_set(payload, '{resume,parsed_json}',
        '{"omega":"root-state","ordered_steps":["first","second"],"alpha":{"enabled":true},"sequence":1}'::JSONB);
    result := public.publish_atomic_career_memory(payload);
    IF result->>'outcome' <> 'COMPLETE_REPLAY' THEN RAISE EXCEPTION 'object-key reorder did not replay'; END IF;

    -- Server-managed timestamps and unassigned legacy fields remain outside replay ownership.
    UPDATE public.profiles SET updated_at = updated_at + interval '1 second', education = '{"independent":true}'::JSONB
    WHERE id = '40000000-0000-4000-8000-000000000002';
    UPDATE public.resumes SET updated_at = updated_at + interval '1 second', materialized_at = materialized_at + interval '1 second'
    WHERE id = resume_id;
    UPDATE public.careers SET updated_at = updated_at + interval '1 second'
    WHERE id = '40000000-0000-4000-8000-000000000003';
    result := public.publish_atomic_career_memory(payload);
    IF result->>'outcome' <> 'COMPLETE_REPLAY'
       OR (SELECT education FROM public.profiles WHERE id = '40000000-0000-4000-8000-000000000002')
            IS DISTINCT FROM '{"independent":true}'::JSONB THEN
        RAISE EXCEPTION 'server-managed or independently mutable root field caused drift or was overwritten';
    END IF;

    -- Caller content cannot hide under the reserved server namespace.
    BEGIN
        PERFORM public.publish_atomic_career_memory(jsonb_set(payload, '{resume,parsed_json,_career_memory_publication}', '{"private":"hidden"}'::JSONB));
        RAISE EXCEPTION 'caller-supplied reserved metadata was accepted';
    EXCEPTION WHEN OTHERS THEN
        IF position('reserved publication metadata must not be caller supplied' IN SQLERRM) = 0 THEN RAISE; END IF;
        IF position('hidden' IN SQLERRM) > 0 THEN RAISE EXCEPTION 'reserved metadata rejection leaked private content'; END IF;
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.careertwin_test_fail_publication_phase()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF current_setting('careertwin.test_fault_phase', true) = TG_ARGV[0] THEN
        RAISE EXCEPTION 'CTTEST_FAULT:%', TG_ARGV[0];
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER ct_test_fault_resume_reconciliation BEFORE INSERT ON public.resumes
    FOR EACH ROW EXECUTE FUNCTION public.careertwin_test_fail_publication_phase('resume_reconciliation');
CREATE TRIGGER ct_test_fault_experience BEFORE INSERT ON public.experiences
    FOR EACH ROW EXECUTE FUNCTION public.careertwin_test_fail_publication_phase('experience_persistence');
CREATE TRIGGER ct_test_fault_source_unit BEFORE INSERT ON public.career_source_units
    FOR EACH ROW EXECUTE FUNCTION public.careertwin_test_fail_publication_phase('source_unit_persistence');
CREATE TRIGGER ct_test_fault_evidence BEFORE INSERT ON public.evidence_pieces
    FOR EACH ROW EXECUTE FUNCTION public.careertwin_test_fail_publication_phase('atomic_evidence_persistence');
CREATE TRIGGER ct_test_fault_signal BEFORE INSERT ON public.evidence_signals
    FOR EACH ROW EXECUTE FUNCTION public.careertwin_test_fail_publication_phase('signal_persistence');
CREATE TRIGGER ct_test_fault_capability_delete BEFORE DELETE ON public.capabilities
    FOR EACH ROW EXECUTE FUNCTION public.careertwin_test_fail_publication_phase('capability_deletion');
CREATE TRIGGER ct_test_fault_capability_insert BEFORE INSERT ON public.capabilities
    FOR EACH ROW EXECUTE FUNCTION public.careertwin_test_fail_publication_phase('capability_insertion');
CREATE TRIGGER ct_test_fault_capability_aggregate AFTER INSERT ON public.capabilities
    FOR EACH ROW EXECUTE FUNCTION public.careertwin_test_fail_publication_phase('aggregate_update');
CREATE TRIGGER ct_test_fault_evidence_link BEFORE INSERT ON public.capability_evidence_links
    FOR EACH ROW EXECUTE FUNCTION public.careertwin_test_fail_publication_phase('capability_evidence_link');
CREATE TRIGGER ct_test_fault_signal_link BEFORE INSERT ON public.capability_signal_links
    FOR EACH ROW EXECUTE FUNCTION public.careertwin_test_fail_publication_phase('capability_signal_link');
CREATE TRIGGER ct_test_fault_completed BEFORE UPDATE ON public.resumes
    FOR EACH ROW WHEN (NEW.materialization_status = 'completed')
    EXECUTE FUNCTION public.careertwin_test_fail_publication_phase('completed_status');
CREATE TRIGGER ct_test_fault_activation BEFORE UPDATE ON public.careers
    FOR EACH ROW WHEN (NEW.active_resume_id IS DISTINCT FROM OLD.active_resume_id)
    EXECUTE FUNCTION public.careertwin_test_fail_publication_phase('active_pointer');

DO $$
DECLARE
    phases TEXT[] := ARRAY[
        'resume_reconciliation', 'experience_persistence', 'source_unit_persistence',
        'atomic_evidence_persistence', 'signal_persistence', 'capability_deletion',
        'capability_insertion', 'capability_evidence_link', 'capability_signal_link',
        'aggregate_update', 'completed_status', 'active_pointer'
    ];
    phase TEXT;
    sequence_number INTEGER := 2;
    old_active UUID;
    candidate_resume UUID;
    before_capabilities JSONB;
    after_capabilities JSONB;
    payload JSONB;
    result JSONB;
    failed BOOLEAN;
BEGIN
    FOREACH phase IN ARRAY phases LOOP
        SELECT active_resume_id INTO old_active FROM public.careers
        WHERE id = '40000000-0000-4000-8000-000000000003';
        SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.id), '[]'::JSONB) INTO before_capabilities
        FROM public.capabilities c WHERE c.career_id = '40000000-0000-4000-8000-000000000003';
        payload := public.careertwin_test_publication_payload(sequence_number, old_active);
        candidate_resume := (payload->'resume'->>'id')::UUID;
        PERFORM set_config('careertwin.test_fault_phase', phase, true);
        failed := false;
        BEGIN
            PERFORM public.publish_atomic_career_memory(payload);
        EXCEPTION WHEN OTHERS THEN
            IF position('CTTEST_FAULT:' || phase IN SQLERRM) = 0 THEN RAISE; END IF;
            failed := true;
        END;
        PERFORM set_config('careertwin.test_fault_phase', '', true);
        IF NOT failed THEN RAISE EXCEPTION 'fault phase % did not fail', phase; END IF;
        IF (SELECT active_resume_id FROM public.careers WHERE id = '40000000-0000-4000-8000-000000000003') IS DISTINCT FROM old_active THEN
            RAISE EXCEPTION 'fault phase % changed active pointer', phase;
        END IF;
        SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.id), '[]'::JSONB) INTO after_capabilities
        FROM public.capabilities c WHERE c.career_id = '40000000-0000-4000-8000-000000000003';
        IF after_capabilities IS DISTINCT FROM before_capabilities THEN
            RAISE EXCEPTION 'fault phase % changed previous capability graph', phase;
        END IF;
        IF EXISTS (SELECT 1 FROM public.resumes WHERE id = candidate_resume) THEN
            RAISE EXCEPTION 'fault phase % left candidate resume behind', phase;
        END IF;
        result := public.publish_atomic_career_memory(payload);
        IF result->>'outcome' <> 'PUBLISHED' THEN RAISE EXCEPTION 'fault phase % retry did not publish', phase; END IF;
        result := public.publish_atomic_career_memory(payload);
        IF result->>'outcome' <> 'COMPLETE_REPLAY' THEN RAISE EXCEPTION 'fault phase % replay was not complete', phase; END IF;
        sequence_number := sequence_number + 1;
    END LOOP;
END;
$$;

DO $$
DECLARE old_active UUID; payload JSONB; mutated JSONB; failed BOOLEAN;
BEGIN
    SELECT active_resume_id INTO old_active FROM public.careers WHERE id = '40000000-0000-4000-8000-000000000003';
    payload := public.careertwin_test_publication_payload(100, old_active);
    FOREACH mutated IN ARRAY ARRAY[
        payload - 'evidence',
        jsonb_set(payload, '{evidence,0,id}', to_jsonb('40000000-0000-4000-8000-999999999998'::TEXT)),
        jsonb_set(payload, '{evidence,0,source_revision_sha256}', to_jsonb(repeat('f', 64))),
        jsonb_set(payload, '{signals,0,evidence_piece_id}', to_jsonb('40000000-0000-4000-8000-999999999999'::TEXT)),
        jsonb_set(payload, '{capability_signal_links,0,capability_id}', to_jsonb('40000000-0000-4000-8000-999999999999'::TEXT)),
        jsonb_set(payload, '{capability_signal_links}', '[]'::JSONB),
        jsonb_set(payload, '{capabilities,0,evidence_count}', '2'::JSONB)
    ] LOOP
        failed := false;
        BEGIN PERFORM public.publish_atomic_career_memory(mutated);
        EXCEPTION WHEN OTHERS THEN failed := true; END;
        IF NOT failed THEN RAISE EXCEPTION 'malformed/cross-graph payload did not fail closed'; END IF;
        IF (SELECT active_resume_id FROM public.careers WHERE id = '40000000-0000-4000-8000-000000000003') IS DISTINCT FROM old_active THEN
            RAISE EXCEPTION 'malformed payload changed active pointer';
        END IF;
    END LOOP;
    failed := false;
    BEGIN PERFORM public.publish_atomic_career_memory(public.careertwin_test_publication_payload(101, NULL));
    EXCEPTION WHEN OTHERS THEN failed := position('CTPUB_STALE_WRITER' IN SQLERRM) > 0; END;
    IF NOT failed THEN RAISE EXCEPTION 'stale expected pointer did not fail closed'; END IF;
END;
$$;

-- Multi-session serialization checks use dblink only in this disposable test.
CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA extensions;
INSERT INTO public.users (id) VALUES ('50000000-0000-4000-8000-000000000001');
INSERT INTO public.profiles (id, user_id) VALUES (
    '50000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001'
);
SELECT public.publish_atomic_career_memory(
    public.careertwin_test_publication_payload(1, NULL, '50000000')
);

CREATE OR REPLACE FUNCTION public.careertwin_test_delay_publication()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM pg_sleep(0.75);
    RETURN NEW;
END;
$$;
CREATE TRIGGER ct_test_publication_delay BEFORE INSERT ON public.experiences
    FOR EACH ROW EXECUTE FUNCTION public.careertwin_test_delay_publication();

DO $$
DECLARE
    old_active UUID;
    second_active UUID;
    payload_a JSONB;
    payload_b JSONB;
    result_a JSONB;
    result_b JSONB;
    successes INTEGER;
    failures INTEGER;
    started_at TIMESTAMPTZ;
    elapsed_seconds NUMERIC;
    connection_string TEXT := format('host=127.0.0.1 dbname=%s user=postgres', current_database());
BEGIN
    SELECT active_resume_id INTO old_active FROM public.careers
    WHERE id = '40000000-0000-4000-8000-000000000003';
    PERFORM extensions.dblink_connect('ct_same_a', connection_string);
    PERFORM extensions.dblink_connect('ct_same_b', connection_string);
    payload_a := public.careertwin_test_publication_payload(200, old_active);
    PERFORM extensions.dblink_send_query('ct_same_a', format(
        'SELECT public.publish_atomic_career_memory(%L::jsonb)', payload_a::TEXT
    ));
    PERFORM extensions.dblink_send_query('ct_same_b', format(
        'SELECT public.publish_atomic_career_memory(%L::jsonb)', payload_a::TEXT
    ));
    SELECT result INTO result_a FROM extensions.dblink_get_result('ct_same_a') AS t(result JSONB);
    SELECT result INTO result_b FROM extensions.dblink_get_result('ct_same_b') AS t(result JSONB);
    PERFORM extensions.dblink_disconnect('ct_same_a');
    PERFORM extensions.dblink_disconnect('ct_same_b');
    IF ARRAY[result_a->>'outcome', result_b->>'outcome'] @> ARRAY['PUBLISHED', 'COMPLETE_REPLAY'] IS NOT TRUE THEN
        RAISE EXCEPTION 'identical concurrent publications did not serialize to publish/replay: %, %', result_a, result_b;
    END IF;

    old_active := (result_a->>'active_resume_id')::UUID;
    payload_a := public.careertwin_test_publication_payload(201, old_active);
    payload_b := public.careertwin_test_publication_payload(202, old_active);
    PERFORM extensions.dblink_connect('ct_conflict_a', connection_string);
    PERFORM extensions.dblink_connect('ct_conflict_b', connection_string);
    PERFORM extensions.dblink_send_query('ct_conflict_a', format('SELECT public.publish_atomic_career_memory(%L::jsonb)', payload_a::TEXT));
    PERFORM extensions.dblink_send_query('ct_conflict_b', format('SELECT public.publish_atomic_career_memory(%L::jsonb)', payload_b::TEXT));
    successes := 0; failures := 0;
    BEGIN
        SELECT result INTO result_a FROM extensions.dblink_get_result('ct_conflict_a') AS t(result JSONB);
        successes := successes + 1;
    EXCEPTION WHEN OTHERS THEN failures := failures + 1; END;
    BEGIN
        SELECT result INTO result_b FROM extensions.dblink_get_result('ct_conflict_b') AS t(result JSONB);
        successes := successes + 1;
    EXCEPTION WHEN OTHERS THEN failures := failures + 1; END;
    PERFORM extensions.dblink_disconnect('ct_conflict_a');
    PERFORM extensions.dblink_disconnect('ct_conflict_b');
    IF successes <> 1 OR failures <> 1 THEN
        RAISE EXCEPTION 'conflicting concurrent publications were not serialized: successes %, failures %', successes, failures;
    END IF;

    SELECT active_resume_id INTO old_active FROM public.careers
    WHERE id = '40000000-0000-4000-8000-000000000003';
    SELECT active_resume_id INTO second_active FROM public.careers
    WHERE id = '50000000-0000-4000-8000-000000000003';
    payload_a := public.careertwin_test_publication_payload(300, old_active);
    payload_b := public.careertwin_test_publication_payload(300, second_active, '50000000');
    PERFORM extensions.dblink_connect('ct_parallel_a', connection_string);
    PERFORM extensions.dblink_connect('ct_parallel_b', connection_string);
    started_at := clock_timestamp();
    PERFORM extensions.dblink_send_query('ct_parallel_a', format('SELECT public.publish_atomic_career_memory(%L::jsonb)', payload_a::TEXT));
    PERFORM extensions.dblink_send_query('ct_parallel_b', format('SELECT public.publish_atomic_career_memory(%L::jsonb)', payload_b::TEXT));
    SELECT result INTO result_a FROM extensions.dblink_get_result('ct_parallel_a') AS t(result JSONB);
    SELECT result INTO result_b FROM extensions.dblink_get_result('ct_parallel_b') AS t(result JSONB);
    elapsed_seconds := extract(epoch FROM clock_timestamp() - started_at);
    PERFORM extensions.dblink_disconnect('ct_parallel_a');
    PERFORM extensions.dblink_disconnect('ct_parallel_b');
    IF result_a->>'outcome' <> 'PUBLISHED' OR result_b->>'outcome' <> 'PUBLISHED' OR elapsed_seconds > 1.35 THEN
        RAISE EXCEPTION 'different careers serialized unnecessarily or failed: elapsed %, %, %', elapsed_seconds, result_a, result_b;
    END IF;
END;
$$;

DROP TRIGGER ct_test_publication_delay ON public.experiences;
DROP FUNCTION public.careertwin_test_delay_publication();

DROP TRIGGER ct_test_fault_resume_reconciliation ON public.resumes;
DROP TRIGGER ct_test_fault_experience ON public.experiences;
DROP TRIGGER ct_test_fault_source_unit ON public.career_source_units;
DROP TRIGGER ct_test_fault_evidence ON public.evidence_pieces;
DROP TRIGGER ct_test_fault_signal ON public.evidence_signals;
DROP TRIGGER ct_test_fault_capability_delete ON public.capabilities;
DROP TRIGGER ct_test_fault_capability_insert ON public.capabilities;
DROP TRIGGER ct_test_fault_capability_aggregate ON public.capabilities;
DROP TRIGGER ct_test_fault_evidence_link ON public.capability_evidence_links;
DROP TRIGGER ct_test_fault_signal_link ON public.capability_signal_links;
DROP TRIGGER ct_test_fault_completed ON public.resumes;
DROP TRIGGER ct_test_fault_activation ON public.careers;
DROP FUNCTION public.careertwin_test_fail_publication_phase();

DELETE FROM public.careers WHERE id = '40000000-0000-4000-8000-000000000003';
DELETE FROM public.resumes WHERE profile_id = '40000000-0000-4000-8000-000000000002';
DELETE FROM public.profiles WHERE id = '40000000-0000-4000-8000-000000000002';
DELETE FROM public.users WHERE id = '40000000-0000-4000-8000-000000000001';
DELETE FROM public.users WHERE id = '40000000-0000-4000-8000-000000000009';
DELETE FROM public.careers WHERE id = '50000000-0000-4000-8000-000000000003';
DELETE FROM public.resumes WHERE profile_id = '50000000-0000-4000-8000-000000000002';
DELETE FROM public.profiles WHERE id = '50000000-0000-4000-8000-000000000002';
DELETE FROM public.users WHERE id = '50000000-0000-4000-8000-000000000001';
DROP FUNCTION public.careertwin_test_assert_replay_rejected(JSONB, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION public.careertwin_test_publication_state(UUID, UUID, UUID);
DROP FUNCTION public.careertwin_test_publication_payload(INTEGER, UUID, TEXT);
DROP FUNCTION public.careertwin_test_deterministic_uuid(TEXT[]);
DROP EXTENSION dblink;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.resumes WHERE id::TEXT LIKE '40000000-0000-4000-8000-%')
       OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgname LIKE 'ct_test_fault_%')
       OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname LIKE 'careertwin_test_%') THEN
        RAISE EXCEPTION 'transactional publication test cleanup incomplete';
    END IF;
END;
$$;
