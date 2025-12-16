-- Job Offers Table for UC-127: Offer Evaluation & Comparison Tool
-- This table stores detailed job offer information for comparison and evaluation

CREATE TABLE IF NOT EXISTS public.job_offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    job_opportunity_id uuid,
    interview_id uuid,
    
    -- Basic offer information
    company character varying(255) NOT NULL,
    position_title character varying(255) NOT NULL,
    offer_date date DEFAULT CURRENT_DATE,
    decision_deadline date,
    
    -- Compensation details
    base_salary numeric(12,2) NOT NULL,
    signing_bonus numeric(12,2) DEFAULT 0,
    annual_bonus numeric(12,2) DEFAULT 0,
    bonus_percentage numeric(5,2),
    performance_bonus_max numeric(12,2) DEFAULT 0,
    
    -- Equity/Stock compensation
    equity_type character varying(50), -- 'RSU', 'ISO', 'NSO', 'Stock Options', 'None'
    equity_amount numeric(12,2) DEFAULT 0,
    equity_vesting_schedule text,
    equity_vesting_years integer DEFAULT 4,
    equity_cliff_months integer DEFAULT 12,
    
    -- Benefits
    health_insurance_monthly_value numeric(10,2) DEFAULT 0,
    health_insurance_coverage character varying(100), -- 'Full', 'Partial', 'None'
    dental_insurance boolean DEFAULT false,
    vision_insurance boolean DEFAULT false,
    life_insurance boolean DEFAULT false,
    disability_insurance boolean DEFAULT false,
    retirement_401k_match_percentage numeric(5,2) DEFAULT 0,
    retirement_401k_match_max numeric(10,2) DEFAULT 0,
    hsa_contribution numeric(10,2) DEFAULT 0,
    pto_days integer DEFAULT 0,
    sick_days integer DEFAULT 0,
    holidays integer DEFAULT 0,
    parental_leave_weeks integer DEFAULT 0,
    
    -- Additional perks
    relocation_assistance numeric(12,2) DEFAULT 0,
    tuition_reimbursement numeric(10,2) DEFAULT 0,
    professional_development_budget numeric(10,2) DEFAULT 0,
    gym_membership boolean DEFAULT false,
    commuter_benefits numeric(10,2) DEFAULT 0,
    meal_stipend numeric(10,2) DEFAULT 0,
    remote_work_stipend numeric(10,2) DEFAULT 0,
    
    -- Location and work arrangement
    location character varying(255) NOT NULL,
    remote_policy character varying(50), -- 'Full Remote', 'Hybrid', 'On-site'
    remote_days_per_week integer,
    required_office_days integer,
    timezone character varying(100),
    
    -- Cost of living adjustment
    col_index numeric(6,2), -- Cost of living index (100 = baseline)
    col_adjusted_salary numeric(12,2), -- Calculated field
    
    -- Non-financial factors (scored 1-5)
    culture_fit_score integer,
    growth_opportunities_score integer,
    work_life_balance_score integer,
    team_quality_score integer,
    management_quality_score integer,
    tech_stack_score integer,
    company_stability_score integer,
    learning_opportunities_score integer,
    
    -- Calculated total compensation
    total_cash_compensation numeric(12,2),
    total_compensation_year_1 numeric(12,2),
    total_compensation_annual_avg numeric(12,2),
    benefits_value_annual numeric(12,2),
    
    -- Weighted scoring
    overall_score numeric(6,2), -- Overall weighted score
    financial_score numeric(6,2),
    non_financial_score numeric(6,2),
    
    -- Negotiation
    negotiation_status character varying(50) DEFAULT 'received', -- 'received', 'negotiating', 'accepted', 'declined', 'expired'
    negotiation_notes text,
    negotiation_history jsonb DEFAULT '[]'::jsonb,
    negotiation_recommendations jsonb,
    
    -- Decision tracking
    offer_status character varying(50) DEFAULT 'active', -- 'active', 'accepted', 'declined', 'expired', 'withdrawn'
    accepted_at timestamp with time zone,
    declined_at timestamp with time zone,
    decline_reason text,
    
    -- Scenario analysis
    scenarios jsonb DEFAULT '[]'::jsonb, -- Store what-if scenarios
    
    -- Notes and attachments
    notes text,
    offer_letter_url character varying(1000),
    documents jsonb DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Foreign keys
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT fk_job_opportunity FOREIGN KEY (job_opportunity_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL,
    CONSTRAINT fk_interview FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT check_base_salary_positive CHECK (base_salary >= 0),
    CONSTRAINT check_scores_range CHECK (
        (culture_fit_score IS NULL OR (culture_fit_score >= 1 AND culture_fit_score <= 5)) AND
        (growth_opportunities_score IS NULL OR (growth_opportunities_score >= 1 AND growth_opportunities_score <= 5)) AND
        (work_life_balance_score IS NULL OR (work_life_balance_score >= 1 AND work_life_balance_score <= 5)) AND
        (team_quality_score IS NULL OR (team_quality_score >= 1 AND team_quality_score <= 5)) AND
        (management_quality_score IS NULL OR (management_quality_score >= 1 AND management_quality_score <= 5)) AND
        (tech_stack_score IS NULL OR (tech_stack_score >= 1 AND tech_stack_score <= 5)) AND
        (company_stability_score IS NULL OR (company_stability_score >= 1 AND company_stability_score <= 5)) AND
        (learning_opportunities_score IS NULL OR (learning_opportunities_score >= 1 AND learning_opportunities_score <= 5))
    ),
    CONSTRAINT check_offer_status CHECK (offer_status IN ('active', 'accepted', 'declined', 'expired', 'withdrawn')),
    CONSTRAINT check_negotiation_status CHECK (negotiation_status IN ('received', 'negotiating', 'accepted', 'declined', 'expired'))
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_offers_user_id ON public.job_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_job_opportunity_id ON public.job_offers(job_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_interview_id ON public.job_offers(interview_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_offer_status ON public.job_offers(offer_status);
CREATE INDEX IF NOT EXISTS idx_job_offers_created_at ON public.job_offers(created_at DESC);

-- Comments
COMMENT ON TABLE public.job_offers IS 'Stores detailed job offer information for evaluation and comparison (UC-127)';
COMMENT ON COLUMN public.job_offers.base_salary IS 'Annual base salary';
COMMENT ON COLUMN public.job_offers.equity_type IS 'Type of equity compensation: RSU, ISO, NSO, Stock Options, or None';
COMMENT ON COLUMN public.job_offers.col_index IS 'Cost of living index for location (100 = national average)';
COMMENT ON COLUMN public.job_offers.col_adjusted_salary IS 'Base salary adjusted for cost of living';
COMMENT ON COLUMN public.job_offers.total_cash_compensation IS 'Base + signing + annual bonus';
COMMENT ON COLUMN public.job_offers.total_compensation_year_1 IS 'Total compensation including all benefits for first year';
COMMENT ON COLUMN public.job_offers.total_compensation_annual_avg IS 'Average annual total compensation (amortized over 4 years)';
COMMENT ON COLUMN public.job_offers.scenarios IS 'JSON array of what-if scenarios with adjusted values';
COMMENT ON COLUMN public.job_offers.negotiation_history IS 'JSON array tracking negotiation rounds and responses';
COMMENT ON COLUMN public.job_offers.negotiation_recommendations IS 'AI-generated negotiation recommendations based on market data';

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER trigger_update_job_offers_updated_at
    BEFORE UPDATE ON public.job_offers
    FOR EACH ROW
    EXECUTE FUNCTION update_job_offers_updated_at();
