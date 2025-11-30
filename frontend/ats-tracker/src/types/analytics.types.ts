// Analytics Types for UC-096 through UC-101

// ============================================
// UC-096: Job Search Performance Dashboard
// ============================================
export interface JobSearchPerformance {
  keyMetrics: {
    totalApplications: number;
    applicationsSent: number;
    interviewsScheduled: number;
    offersReceived: number;
    rejections: number;
    interested: number;
  };
  conversionRates: {
    applicationToInterview: number;
    interviewToOffer: number;
    overallSuccess: number;
  };
  timeMetrics: {
    avgDaysToResponse: number | null;
    responsesReceived: number;
    avgDaysToInterview: number | null;
    interviewsScheduledCount: number;
  };
  monthlyVolume: Array<{
    month: string;
    count: number;
  }>;
  benchmarks: {
    responseRate: number;
    interviewRate: number;
    offerRate: number;
    timeToResponse: number;
    timeToInterview: number;
    timeToOffer: number;
  };
}

// ============================================
// UC-097: Application Success Rate Analysis
// ============================================
export interface ApplicationSuccessAnalysis {
  byIndustry: Array<{
    industry: string;
    total: number;
    applied: number;
    interviews: number;
    offers: number;
    rejected: number;
    interviewRate: number;
    offerRate: number;
  }>;
  bySource: Array<{
    source: string;
    total: number;
    applied: number;
    interviews: number;
    offers: number;
    interviewRate: number;
    offerRate: number;
  }>;
  byMethod: Array<{
    method: string;
    total: number;
    applied: number;
    interviews: number;
    offers: number;
    interviewRate: number;
    offerRate: number;
  }>;
  recommendations: Array<{
    type: string;
    priority: "high" | "medium" | "low";
    message: string;
  }>;
}

// ============================================
// UC-098: Interview Performance Tracking
// ============================================
export interface InterviewPerformance {
  overall: {
    totalInterviews: number;
    offers: number;
    passed: number;
    failed: number;
    offerRate: number;
    avgConfidence: number | null;
    avgDifficulty: number | null;
  };
  byType: Array<{
    type: string;
    count: number;
    offers: number;
    offerRate: number;
    avgConfidence: number | null;
    avgDifficulty: number | null;
  }>;
  trends: Array<{
    month: string;
    count: number;
    offers: number;
    avgConfidence: number | null;
  }>;
}

// ============================================
// UC-099: Network ROI Analytics
// ============================================
export interface NetworkROI {
  overall: {
    totalActivities: number;
    referrals: number;
    opportunitiesFromNetwork: number;
    uniqueContacts: number;
  };
  byType: Array<{
    type: string;
    count: number;
    referrals: number;
    opportunities: number;
  }>;
}

// ============================================
// UC-100: Salary Progression and Market Positioning
// ============================================
export interface SalaryProgression {
  progression: Array<{
    month: string;
    avgMin: number | null;
    avgMax: number | null;
    offerCount: number;
  }>;
  byIndustry: Array<{
    industry: string;
    avgMin: number | null;
    avgMax: number | null;
    count: number;
  }>;
}

// ============================================
// UC-101: Goal Setting and Achievement Tracking
// ============================================
export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: "career" | "job_search" | "skills" | "networking" | "salary";
  goalType: "short_term" | "long_term";
  targetValue?: number;
  currentValue: number;
  unit?: string;
  targetDate?: string;
  startDate: string;
  status: "active" | "completed" | "paused" | "cancelled";
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface GoalProgress {
  id: string;
  goalId: string;
  userId: string;
  value: number;
  notes?: string;
  recordedAt: string;
  createdAt: string;
}

export interface GoalAnalytics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  achievementRate: number;
  byCategory: Array<{
    category: string;
    total: number;
    completed: number;
    active: number;
  }>;
  recentProgress: Array<{
    goalId: string;
    goalTitle: string;
    progress: number;
    targetValue: number;
    percentage: number;
  }>;
}

// Date range for filtering
export interface DateRange {
  startDate?: string;
  endDate?: string;
}

