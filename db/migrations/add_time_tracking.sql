-- =====================================================
-- Migration: Add Time Tracking for UC-103
-- Purpose: Enable manual time logging for job search activities
-- Created: 2025-12-01
-- =====================================================

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS public.time_logs CASCADE;

-- Create time_logs table
CREATE TABLE public.time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    job_opportunity_id UUID,
    
    -- Activity tracking
    activity_type VARCHAR(50) NOT NULL,
    hours_spent NUMERIC(5,2) NOT NULL CHECK (hours_spent >= 0 AND hours_spent <= 24),
    
    -- When the activity occurred
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Optional context
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT time_logs_user_fkey FOREIGN KEY (user_id) 
        REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT time_logs_job_fkey FOREIGN KEY (job_opportunity_id) 
        REFERENCES public.job_opportunities(id) ON DELETE CASCADE,
    CONSTRAINT time_logs_activity_type_check CHECK (
        activity_type IN (
            'research',
            'application',
            'interview_prep',
            'interview',
            'networking',
            'follow_up',
            'offer_negotiation',
            'other'
        )
    )
);

-- Create indexes for performance
CREATE INDEX idx_time_logs_user_id ON public.time_logs(user_id);
CREATE INDEX idx_time_logs_job_id ON public.time_logs(job_opportunity_id);
CREATE INDEX idx_time_logs_activity_date ON public.time_logs(activity_date);
CREATE INDEX idx_time_logs_user_date ON public.time_logs(user_id, activity_date DESC);
CREATE INDEX idx_time_logs_activity_type ON public.time_logs(activity_type);

-- Create composite index for common queries
CREATE INDEX idx_time_logs_user_job_date ON public.time_logs(user_id, job_opportunity_id, activity_date);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_time_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_time_logs_timestamp
    BEFORE UPDATE ON public.time_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_time_logs_timestamp();

-- Add helpful comments
COMMENT ON TABLE public.time_logs IS 'Manual time tracking for job search activities (UC-103)';
COMMENT ON COLUMN public.time_logs.activity_type IS 'Type of job search activity: research, application, interview_prep, interview, networking, follow_up, offer_negotiation, other';
COMMENT ON COLUMN public.time_logs.hours_spent IS 'Actual hours spent on the activity (0-24 per entry)';
COMMENT ON COLUMN public.time_logs.activity_date IS 'Date when the activity occurred';
COMMENT ON COLUMN public.time_logs.job_opportunity_id IS 'Optional: Link to specific job opportunity';

-- Grant permissions
ALTER TABLE public.time_logs OWNER TO ats_user;
GRANT ALL ON TABLE public.time_logs TO ats_user;

-- Sample data for testing (optional - comment out for production)
-- INSERT INTO public.time_logs (user_id, activity_type, hours_spent, activity_date, notes)
-- SELECT 
--     u_id,
--     'research',
--     2.5,
--     CURRENT_DATE - INTERVAL '1 day',
--     'Sample time log entry'
-- FROM public.users
-- LIMIT 1;

COMMIT;

