-- Forward-only reconciliation from the verified pre-atomic application
-- baseline to the runtime contract consumed by canonical evidence ingestion.

ALTER TABLE public.evidence_pieces
    ADD COLUMN evidence_source_type TEXT,
    ADD COLUMN summary TEXT,
    ADD COLUMN action TEXT,
    ADD COLUMN impact TEXT,
    ADD COLUMN stakeholders TEXT[] DEFAULT '{}'::text[],
    ADD COLUMN tools_methods TEXT[] DEFAULT '{}'::text[],
    ADD COLUMN business_context TEXT,
    ADD COLUMN inferred_scale JSONB,
    ADD COLUMN inferred_scope JSONB,
    ADD COLUMN confidence NUMERIC,
    ADD COLUMN missing_fields TEXT[] DEFAULT '{}'::text[];

UPDATE public.evidence_pieces
SET evidence_source_type = CASE
    WHEN source_type = 'interview' THEN 'interview'
    WHEN source_type = 'manual' THEN 'manual'
    WHEN source_type = 'linkedin' THEN 'imported_doc'
    ELSE 'resume'
END
WHERE evidence_source_type IS NULL;

ALTER TABLE public.evidence_pieces
    ALTER COLUMN evidence_source_type SET DEFAULT 'resume';

ALTER TABLE public.capabilities
    ADD COLUMN evidence_count INTEGER DEFAULT 0,
    ADD COLUMN supporting_evidence_ids UUID[] DEFAULT '{}'::uuid[],
    ADD COLUMN context_domains TEXT[] DEFAULT '{}'::text[],
    ADD COLUMN scale_summary JSONB,
    ADD COLUMN confidence_level TEXT;

UPDATE public.evidence_signals
SET stakeholder_scope = COALESCE(stakeholder_scope, '[]'::jsonb),
    tool_signals = COALESCE(tool_signals, '[]'::jsonb),
    capability_hints = COALESCE(capability_hints, '[]'::jsonb)
WHERE stakeholder_scope IS NULL
   OR tool_signals IS NULL
   OR capability_hints IS NULL;

ALTER TABLE public.evidence_signals
    ALTER COLUMN stakeholder_scope SET NOT NULL,
    ALTER COLUMN tool_signals SET NOT NULL,
    ALTER COLUMN capability_hints SET NOT NULL,
    ADD CONSTRAINT chk_evidence_signals_stakeholder_scope_array
        CHECK (jsonb_typeof(stakeholder_scope) = 'array'),
    ADD CONSTRAINT chk_evidence_signals_tool_signals_array
        CHECK (jsonb_typeof(tool_signals) = 'array'),
    ADD CONSTRAINT chk_evidence_signals_capability_hints_array
        CHECK (jsonb_typeof(capability_hints) = 'array');

ALTER TABLE public.capability_signal_links
    ADD CONSTRAINT capability_signal_links_evidence_signal_id_fkey
    FOREIGN KEY (evidence_signal_id)
    REFERENCES public.evidence_signals(id)
    ON DELETE CASCADE;
