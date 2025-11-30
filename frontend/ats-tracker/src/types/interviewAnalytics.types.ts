// Interview Analytics Types

export interface InterviewAnalytics {
  conversionRate: ConversionRateData;
  performanceByFormat: FormatPerformance[];
  performanceByCompanyType: CompanyTypePerformance[];
  skillAreaPerformance: SkillAreaPerformance[];
  improvementTrend: ImprovementTrendPoint[];
  recommendations: string[];
  optimalStrategyInsights: StrategyInsight[];
}

export interface ConversionRateData {
  userRate: number;
  industryAverage: number;
  industryTop: number;
  offers: number;
  completedInterviews: number;
}

export interface FormatPerformance {
  format: string;
  formatLabel: string;
  successful: number;
  total: number;
}

export interface CompanyTypePerformance {
  companyType: string;
  successful: number;
  total: number;
}

export interface SkillAreaPerformance {
  skillArea: string;
  skillAreaLabel: string;
  averageScore: number;
  count: number;
  maxScore: number;
}

export interface ImprovementTrendPoint {
  period: string | null; // YYYY-MM format
  averageScore: number | null;
  conversionRate: number | null;
}

export interface StrategyInsight {
  number: number;
  title: string;
  description: string;
}

