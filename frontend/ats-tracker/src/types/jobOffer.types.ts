// Types for UC-127: Offer Evaluation & Comparison Tool

export type EquityType = 'RSU' | 'ISO' | 'NSO' | 'Stock Options' | 'None';
export type HealthInsuranceCoverage = 'Full' | 'Partial' | 'None';
export type RemotePolicy = 'Full Remote' | 'Hybrid' | 'On-site';
export type NegotiationStatus = 'received' | 'negotiating' | 'accepted' | 'declined' | 'expired';
export type OfferStatus = 'active' | 'accepted' | 'declined' | 'expired' | 'withdrawn';

export interface JobOfferInput {
  job_opportunity_id?: string;
  interview_id?: string;
  
  // Basic information
  company: string;
  position_title: string;
  offer_date?: string;
  decision_deadline?: string;
  
  // Compensation
  base_salary: number;
  signing_bonus?: number;
  annual_bonus?: number;
  bonus_percentage?: number;
  performance_bonus_max?: number;
  
  // Equity
  equity_type?: EquityType;
  equity_amount?: number;
  equity_vesting_schedule?: string;
  equity_vesting_years?: number;
  equity_cliff_months?: number;
  
  // Benefits
  health_insurance_monthly_value?: number;
  health_insurance_coverage?: HealthInsuranceCoverage;
  dental_insurance?: boolean;
  vision_insurance?: boolean;
  life_insurance?: boolean;
  disability_insurance?: boolean;
  retirement_401k_match_percentage?: number;
  retirement_401k_match_max?: number;
  hsa_contribution?: number;
  pto_days?: number;
  sick_days?: number;
  holidays?: number;
  parental_leave_weeks?: number;
  
  // Perks
  relocation_assistance?: number;
  tuition_reimbursement?: number;
  professional_development_budget?: number;
  gym_membership?: boolean;
  commuter_benefits?: number;
  meal_stipend?: number;
  remote_work_stipend?: number;
  
  // Location
  location: string;
  remote_policy?: RemotePolicy;
  remote_days_per_week?: number;
  required_office_days?: number;
  timezone?: string;
  
  // COL
  col_index?: number;
  
  // Non-financial factors (1-5)
  culture_fit_score?: number;
  growth_opportunities_score?: number;
  work_life_balance_score?: number;
  team_quality_score?: number;
  management_quality_score?: number;
  tech_stack_score?: number;
  company_stability_score?: number;
  learning_opportunities_score?: number;
  
  // Negotiation
  negotiation_status?: NegotiationStatus;
  negotiation_notes?: string;
  
  // Decision
  offer_status?: OfferStatus;
  decline_reason?: string;
  
  // Notes
  notes?: string;
  offer_letter_url?: string;
}

export interface NegotiationHistoryEntry {
  date: string;
  round: number;
  request_type: string;
  request_amount?: number;
  request_details: string;
  response?: string;
  response_date?: string;
  accepted: boolean;
}

export interface NegotiationRecommendation {
  category: string; // 'salary', 'bonus', 'equity', 'benefits', 'remote'
  recommendation: string;
  rationale: string;
  market_data?: string;
  priority: 'high' | 'medium' | 'low';
  suggested_ask?: number;
}

export interface ScenarioAnalysis {
  id: string;
  name: string;
  description: string;
  adjustments: {
    base_salary?: number;
    signing_bonus?: number;
    annual_bonus?: number;
    equity_amount?: number;
    pto_days?: number;
    remote_days_per_week?: number;
    [key: string]: any;
  };
  calculated_values?: JobOfferCalculations;
}

export interface JobOfferCalculations {
  total_cash_compensation: number;
  total_compensation_year_1: number;
  total_compensation_annual_avg: number;
  benefits_value_annual: number;
  col_adjusted_salary: number;
  overall_score: number;
  financial_score: number;
  non_financial_score: number;
}

export interface JobOfferData extends JobOfferInput, JobOfferCalculations {
  id: string;
  user_id: string;
  negotiation_history: NegotiationHistoryEntry[];
  negotiation_recommendations?: NegotiationRecommendation[];
  scenarios: ScenarioAnalysis[];
  documents: { name: string; url: string; type: string }[];
  accepted_at?: string;
  declined_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OfferComparisonData {
  offers: JobOfferData[];
  comparison_matrix: ComparisonMatrix;
  recommendations: ComparisonRecommendation[];
}

export interface ComparisonMatrix {
  headers: string[];
  rows: ComparisonRow[];
}

export interface ComparisonRow {
  category: string;
  subcategory?: string;
  values: (string | number | boolean)[];
  highlight?: 'best' | 'worst' | 'neutral';
  format?: 'currency' | 'percentage' | 'number' | 'text' | 'boolean';
}

export interface ComparisonRecommendation {
  offer_id: string;
  company: string;
  recommendation_type: 'best_overall' | 'best_financial' | 'best_culture' | 'negotiate';
  reasoning: string;
  pros: string[];
  cons: string[];
}

export interface OfferWeights {
  financial: number;
  culture_fit: number;
  growth_opportunities: number;
  work_life_balance: number;
  team_quality: number;
  management_quality: number;
  tech_stack: number;
  company_stability: number;
  learning_opportunities: number;
  location: number;
  remote_policy: number;
}

export const DEFAULT_WEIGHTS: OfferWeights = {
  financial: 0.40,
  culture_fit: 0.10,
  growth_opportunities: 0.10,
  work_life_balance: 0.10,
  team_quality: 0.05,
  management_quality: 0.05,
  tech_stack: 0.05,
  company_stability: 0.05,
  learning_opportunities: 0.05,
  location: 0.025,
  remote_policy: 0.025,
};

export interface COLData {
  location: string;
  index: number;
  category?: string;
}
