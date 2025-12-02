// Salary Negotiation Types

export interface CompensationPackage {
  baseSalary: number;
  bonus?: number;
  equity?: number;
  benefitsValue?: number;
  totalCompensation?: number;
  currency?: string;
}

export interface MarketSalaryData {
  role: string;
  location: string;
  experienceLevel: number;
  industry: string;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  source: string;
  date: string;
  notes?: string;
  generatedBy?: "openai" | "fallback";
}

export interface MarketComparison {
  percentile: number;
  comparison: "below_25th" | "below_median" | "above_median" | "above_75th" | "above_90th";
  differenceFromMedian: number;
  percentDifference: number;
  recommendation: string;
}

export interface TalkingPoint {
  id: string;
  point: string;
  rationale: string;
  category: "experience" | "achievement" | "market" | "value";
}

export interface NegotiationScript {
  scenario: string;
  script: string;
  keyPhrases: string[];
  commonObjections: Array<{
    objection: string;
    response: string;
  }>;
}

export interface Counteroffer {
  id: string;
  baseSalary: number;
  bonus?: number;
  equity?: number;
  benefitsValue?: number;
  totalCompensation: number;
  date: string;
  notes?: string;
}

export interface CounterofferEvaluation {
  counterofferTotal: number;
  targetTotal: number;
  initialTotal: number;
  differenceFromTarget: number;
  percentFromTarget: number;
  improvementFromInitial: number;
  percentImprovement: number;
  marketComparison: MarketComparison | null;
  recommendation: string;
}

export interface TimingStrategy {
  whenToNegotiate: string;
  whenToRespond: string;
  timeline: string[];
  tips: string[];
}

export interface NegotiationStrategy {
  timing?: string;
  approach?: string;
  priorities?: string[];
}

export interface SalaryNegotiation {
  id: string;
  userId: string;
  jobOpportunityId: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  initialOffer: CompensationPackage;
  targetCompensation: CompensationPackage;
  finalCompensation?: CompensationPackage;
  negotiationStrategy?: NegotiationStrategy;
  talkingPoints?: TalkingPoint[];
  scripts?: Record<string, NegotiationScript>;
  marketSalaryData?: MarketSalaryData;
  marketResearchNotes?: string;
  counterofferCount: number;
  latestCounteroffer?: {
    baseSalary: number;
    totalCompensation: number;
  };
  counterofferHistory: Counteroffer[];
  outcome?: "accepted" | "rejected" | "pending" | "withdrawn";
  outcomeDate?: string;
  outcomeNotes?: string;
  confidenceExercisesCompleted?: string[];
  practiceSessionsCompleted: number;
  status: "draft" | "active" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface SalaryProgressionEntry {
  id: string;
  negotiationId?: string;
  jobOpportunityId?: string;
  baseSalary: number;
  bonus?: number;
  equity?: number;
  benefitsValue?: number;
  totalCompensation: number;
  currency: string;
  roleTitle?: string;
  company?: string;
  location?: string;
  effectiveDate: string;
  negotiationType?: "initial_offer" | "counteroffer" | "final_offer" | "accepted";
  createdAt: string;
  notes?: string;
}

export interface SalaryNegotiationInput {
  jobOpportunityId: string;
  offerData: {
    initialOffer: CompensationPackage;
    targetCompensation?: CompensationPackage;
    initialOfferDate?: string;
  };
}

export interface SalaryNegotiationUpdate {
  targetCompensation?: CompensationPackage;
  negotiationStrategy?: NegotiationStrategy | string;
  marketResearchNotes?: string;
  status?: "draft" | "active" | "completed" | "archived";
}

export interface CounterofferInput {
  baseSalary: number;
  bonus?: number;
  equity?: number;
  benefitsValue?: number;
  notes?: string;
}

export interface NegotiationOutcomeInput {
  finalCompensation?: CompensationPackage;
  outcome: "accepted" | "rejected" | "pending" | "withdrawn";
  outcomeDate?: string;
  outcomeNotes?: string;
}

export interface MarketResearchInput {
  role: string;
  location: string;
  experienceLevel?: number;
  industry?: string;
}

