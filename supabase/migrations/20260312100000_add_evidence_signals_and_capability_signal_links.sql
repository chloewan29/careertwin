-- Career-centric intermediate evidence signal layer.
-- Keeps legacy capability_evidence_links for backward compatibility.

CREATE TABLE IF NOT EXISTS public.evidence_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
    evidence_piece_id UUID NOT NULL REFERENCES public.evidence_pieces(id) ON DELETE CASCADE,
    action TEXT NULL,
    domain TEXT NULL,
    initiative_type TEXT NULL,
    scope_level TEXT NULL CHECK (scope_level IN ('task', 'project', 'team', 'function', 'enterprise', 'market')),
    ownership_level TEXT NULL CHECK (ownership_level IN ('contributor', 'driver', 'owner', 'lead')),
    stakeholder_scope JSONB NOT NULL DEFAULT '[]'::jsonb,
    tool_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
    capability_hints JSONB NOT NULL DEFAULT '[]'::jsonb,
    team_signal TEXT NULL,
    impact_signal TEXT NULL,
    confidence_score NUMERIC(5,4) NULL CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_evidence_signals_stakeholder_scope_array
        CHECK (jsonb_typeof(stakeholder_scope) = 'array'),
    CONSTRAINT chk_evidence_signals_tool_signals_array
        CHECK (jsonb_typeof(tool_signals) = 'array'),
    CONSTRAINT chk_evidence_signals_capability_hints_array
        CHECK (jsonb_typeof(capability_hints) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_evidence_signals_career_id
    ON public.evidence_signals(career_id);

CREATE INDEX IF NOT EXISTS idx_evidence_signals_evidence_piece_id
    ON public.evidence_signals(evidence_piece_id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'set_updated_at'
    ) THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'trg_evidence_signals_updated_at'
        ) THEN
            CREATE TRIGGER trg_evidence_signals_updated_at
            BEFORE UPDATE ON public.evidence_signals
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
        END IF;
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.capability_signal_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capability_id UUID NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,
    evidence_signal_id UUID NOT NULL REFERENCES public.evidence_signals(id) ON DELETE CASCADE,
    contribution_weight NUMERIC(6,4) NULL,
    rationale TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_capability_signal_links UNIQUE (capability_id, evidence_signal_id)
);

CREATE INDEX IF NOT EXISTS idx_capability_signal_links_capability_id
    ON public.capability_signal_links(capability_id);

CREATE INDEX IF NOT EXISTS idx_capability_signal_links_evidence_signal_id
    ON public.capability_signal_links(evidence_signal_id);

ALTER TABLE IF EXISTS public.capabilities
    ADD COLUMN IF NOT EXISTS career_id UUID REFERENCES public.careers(id),
    ADD COLUMN IF NOT EXISTS canonical_name TEXT,
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS scope_summary TEXT,
    ADD COLUMN IF NOT EXISTS ownership_summary TEXT,
    ADD COLUMN IF NOT EXISTS impact_summary TEXT,
    ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS evidence_signal_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_capabilities_career_id
    ON public.capabilities(career_id);
