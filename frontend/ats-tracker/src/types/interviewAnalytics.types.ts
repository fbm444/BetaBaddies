// Interview Analytics Types

export interface InterviewAnalytics {
  conversionRate: ConversionRateData;
  performanceByFormat: FormatPerformance[];
  performanceByCompanyType: CompanyTypePerformance[];
  skillAreaPerformance: SkillAreaPerformance[];
  improvementTrend: ImprovementTrendPoint[];
  recommendations: string[];
  optimalStrategyInsights: StrategyInsight[];
  // New enhanced features
  confidenceTrends?: ConfidenceTrendPoint[];
  anxietyProgress?: AnxietyTrendPoint[];
  practiceVsRealComparison?: PracticeVsRealComparison;
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

export interface ConfidenceTrendPoint {
  period: string | null; // YYYY-MM format
  avgPreConfidence: number | null;
  assessmentCount: number;
}

export interface AnxietyTrendPoint {
  period: string | null; // YYYY-MM format
  avgPreAnxiety: number | null;
  assessmentCount: number;
}

export interface PracticeVsRealComparison {
  practice: {
    conversionRate: number;
    offers: number;
    completed: number;
    avgScore: number | null;
  };
  real: {
    conversionRate: number;
    offers: number;
    completed: number;
    avgScore: number | null;
  };
  improvement: number;
}

