// Interview Success Prediction Types

export interface FactorBreakdown {
  score: number;
  weight: number;
  breakdown?: Record<string, any>;
  status?: "complete" | "partial" | "missing";
}

export interface FactorsBreakdown {
  preparation: FactorBreakdown;
  roleMatch: FactorBreakdown;
  companyResearch: FactorBreakdown;
  practiceHours: FactorBreakdown;
  historical: FactorBreakdown;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  impact: number;
  category: string;
  actionUrl?: string;
  completed: boolean;
}

export interface InterviewPrediction {
  id: string;
  jobOpportunityId: string;
  userId: string;
  predictedSuccessProbability: number;
  confidenceScore: number;
  preparationScore: number;
  roleMatchScore: number;
  companyResearchScore: number;
  practiceHoursScore: number;
  historicalPerformanceScore: number;
  factorsBreakdown: FactorsBreakdown;
  recommendations: Recommendation[];
  adjustments?: {
    total: number;
    details: Record<string, number>;
  };
  actualOutcome?: "accepted" | "rejected" | "pending" | "withdrawn" | "no_response";
  outcomeDate?: string;
  predictionAccuracy?: number;
  calculatedAt: string;
  lastUpdated: string;
  createdAt: string;
}

export interface PredictionComparison {
  jobOpportunityId: string;
  jobTitle: string;
  company: string;
  prediction: InterviewPrediction;
}

export interface PredictionAccuracyMetrics {
  totalPredictions: number;
  accuratePredictions: number;
  avgError: number;
  byConfidenceLevel?: Record<string, {
    count: number;
    accuracy: number;
  }>;
  lastCalculated?: string;
}

