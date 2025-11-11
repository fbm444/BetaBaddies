-- Migration: add_company_interview_insights.sql
-- Purpose: Store AI-generated interview insights per company and role with caching metadata

CREATE TABLE IF NOT EXISTS public.company_interview_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    company_key TEXT NOT NULL,
    requested_role TEXT,
    role_key TEXT NOT NULL DEFAULT '',
    job_id UUID,
    payload JSONB NOT NULL,
    source TEXT DEFAULT 'openai',
    prompt_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    CONSTRAINT fk_company_interview_insights_job FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL,
    CONSTRAINT company_interview_insights_company_role_key UNIQUE (company_key, role_key)
);

CREATE INDEX IF NOT EXISTS idx_company_interview_insights_company
    ON public.company_interview_insights (company_key);

CREATE INDEX IF NOT EXISTS idx_company_interview_insights_expires_at
    ON public.company_interview_insights (expires_at);

-- Trigger to keep updated_at current
DROP TRIGGER IF EXISTS trg_company_interview_insights_updated_at ON public.company_interview_insights;
CREATE TRIGGER trg_company_interview_insights_updated_at
    BEFORE UPDATE ON public.company_interview_insights
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

