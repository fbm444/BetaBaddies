import axios from 'axios';

// Use environment variable or fallback to relative path (for proxy)
const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api/v1` : '/api/v1');

const api = axios.create({
  baseURL: `${API_BASE}/market-intelligence`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface SalaryData {
  jobTitle: string;
  location: string | null;
  industry: string | null;
  yourMarket: {
    average: number;
    range: { min: number; max: number };
    percentiles: { p25: number; median: number; p75: number };
    sampleSize: number;
    source: string;
  };
  nationalBenchmark: {
    median: number;
    year: string;
    yearOverYearChange: string;
    trend: string;
    source: string;
  } | null;
  salaryDistribution?: {
    p10?: number;
    p25?: number;
    median?: number;
    p75?: number;
    p90?: number;
    min?: number;
    max?: number;
    source: string;
    note?: string;
  } | null;
  comparison: {
    difference: number;
    percentDifference: string;
    positioning: 'above_market' | 'at_market' | 'below_market';
    insight: string;
  } | null;
  cached: boolean;
  generatedAt: string;
}

export interface IndustryTrends {
  industry: string;
  location: string | null;
  timeframe: number;
  growthMetrics: {
    recentJobs: number;
    previousPeriodJobs: number;
    growthRate: number;
    trend: 'strong_growth' | 'growing' | 'stable' | 'declining';
  };
  hiringActivity: {
    totalJobs: number;
    activeCompanies: number;
    avgJobAge: number;
    hiringVelocity: 'very_high' | 'high' | 'moderate' | 'low';
    insight: string;
  };
  topCompanies: Array<{
    company: string;
    jobCount: number;
    avgSalary: number | null;
  }>;
  salaryTrends: Array<{
    month: string;
    avgSalary: number;
    jobCount: number;
  }>;
  cached: boolean;
  generatedAt: string;
}

export interface SkillDemand {
  industry: string | null;
  timeframe: number;
  topSkills: Array<{
    skillName: string;
    demandCount: number;
    percentageOfJobs: string;
    growthRate: number;
  }>;
  emergingSkills: Array<{
    skillName: string;
    demandCount: number;
    percentageOfJobs: string;
    growthRate: number;
  }>;
  decliningSkills: Array<{
    skillName: string;
    demandCount: number;
    percentageOfJobs: string;
    growthRate: number;
  }>;
  cached: boolean;
  generatedAt: string;
}

export interface MarketInsight {
  id: string;
  user_id: string;
  insight_type: 'skill_gap' | 'salary_positioning' | 'market_opportunity';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable_items: string[];
  supporting_data: Record<string, any>;
  status: 'active' | 'dismissed' | 'completed';
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface MarketOverview {
  profile: {
    jobTitle: string;
    industry: string;
    location: string | null;
  };
  salaryIntelligence: SalaryData;
  industryTrends: IndustryTrends;
  skillDemand: SkillDemand;
  personalizedInsights: MarketInsight[];
}

export const marketIntelligenceService = {
  /**
   * Get comprehensive market overview
   */
  async getMarketOverview(): Promise<MarketOverview> {
    const response = await api.get('/overview');
    return response.data.data;
  },

  /**
   * Get salary trends
   */
  async getSalaryTrends(
    jobTitle: string,
    location?: string,
    industry?: string
  ): Promise<SalaryData> {
    const params = new URLSearchParams({ jobTitle });
    if (location) params.append('location', location);
    if (industry) params.append('industry', industry);

    const response = await api.get(`/salary-trends?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Get industry trends
   */
  async getIndustryTrends(
    industry: string,
    location?: string,
    timeframe?: number
  ): Promise<IndustryTrends> {
    const params = new URLSearchParams({ industry });
    if (location) params.append('location', location);
    if (timeframe) params.append('timeframe', timeframe.toString());

    const response = await api.get(`/industry-trends?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Get skill demand
   */
  async getSkillDemand(industry?: string, timeframe?: number): Promise<SkillDemand> {
    const params = new URLSearchParams();
    if (industry) params.append('industry', industry);
    if (timeframe) params.append('timeframe', timeframe.toString());

    const response = await api.get(`/skill-demand?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Get personalized insights
   */
  async getInsights(status: string = 'active'): Promise<MarketInsight[]> {
    const response = await api.get(`/insights?status=${status}`);
    return response.data.data.insights;
  },

  /**
   * Generate new insights
   */
  async generateInsights(): Promise<MarketInsight[]> {
    const response = await api.post('/insights/generate');
    return response.data.data.insights;
  },

  /**
   * Update insight status
   */
  async updateInsightStatus(
    insightId: string,
    status: 'active' | 'dismissed' | 'completed'
  ): Promise<MarketInsight> {
    const response = await api.patch(`/insights/${insightId}`, { status });
    return response.data.data.insight;
  },

  /**
   * Refresh market data cache
   * Clears cached data for current user to force fresh fetch from Adzuna
   */
  async refreshCache(): Promise<{ clearedEntries: number }> {
    const response = await api.post('/refresh-cache');
    return response.data.data;
  },
};

