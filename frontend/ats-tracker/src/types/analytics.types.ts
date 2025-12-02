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
  byResume?: Array<{
    resumeId: string;
    resumeName: string;
    total: number;
    applied: number;
    interviews: number;
    offers: number;
    rejected: number;
    interviewRate: number;
    offerRate: number;
  }>;
  byCoverLetter?: Array<{
    coverLetterId: string;
    coverLetterName: string;
    total: number;
    applied: number;
    interviews: number;
    offers: number;
    rejected: number;
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
    type: 'offer' | 'employment'; // Distinguishes between job offers and actual employment
    avgMin: number | null;
    avgMax: number | null;
    count: number; // Number of offers or employment records for this month
    negotiationStatus?: string | null;
    location?: string | null;
  }>;
  byIndustry: Array<{
    industry: string;
    avgMin: number | null;
    avgMax: number | null;
    count: number;
    industryAverage?: number | null; // Industry benchmark for comparison
    vsIndustry?: number | null; // Percentage above/below industry average
    location?: string | null;
    locationAverage?: number | null; // Location-specific average
    vsLocation?: number | null; // Percentage above/below location average
    negotiationStatus?: string | null;
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
  progressPercentage: number;
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

// ============================================
// UC-103: Time Investment and Productivity Analysis
// ============================================
export interface TimeLog {
  id: string;
  userId: string;
  jobOpportunityId?: string;
  activityType: 'research' | 'application' | 'interview_prep' | 'interview' | 'networking' | 'follow_up' | 'offer_negotiation' | 'other';
  hoursSpent: number;
  activityDate: string;
  notes?: string;
  jobTitle?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeLogInput {
  jobOpportunityId?: string;
  activityType: string;
  hoursSpent: number;
  activityDate?: string;
  notes?: string;
}

export interface TimeSummary {
  byActivity: Array<{
    activityType: string;
    totalHours: number;
    entryCount: number;
    avgHoursPerEntry: number;
    firstDate: string;
    lastDate: string;
  }>;
  totalHours: number;
}

export interface ProductivityAnalytics {
  dataSource: 'manual' | 'estimated'; // Indicates whether data is from manual logs or estimates
  timeInvestment: {
    totalHoursInvested: number;
    avgHoursPerDay: number;
    avgHoursPerWeek: number;
    mostProductiveDay: string | null;
    mostProductiveTime: string | null;
  };
  activityBreakdown: Array<{
    activityType: string;
    hoursSpent: number;
    percentage: number;
    tasksCompleted: number;
    avgTimePerTask: number;
  }>;
  productivityPatterns: {
    byDayOfWeek: Array<{
      day: string;
      hours: number;
      tasksCompleted: number;
      efficiency: number;
    }>;
    byTimeOfDay: Array<{
      hour: string;
      tasks: number;
      successRate: number;
    }>;
  };
  taskMetrics: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    avgCompletionTime: number | null;
  };
  efficiency: {
    timeToOutcomeRatio: number;
    applicationEfficiency: number; // apps per hour
    interviewEfficiency: number; // interviews per hour invested
    offerEfficiency: number; // offers per hour invested
  };
  recommendations: Array<{
    type: string;
    priority: "high" | "medium" | "low";
    message: string;
    actionable: string;
  }>;
  wellnessIndicators: {
    burnoutRisk: "low" | "medium" | "high";
    workLifeBalance: number; // 0-100 score
    energyLevels: Array<{
      date: string;
      level: number; // 1-5 scale
      productivity: number;
    }>;
    overworkWarnings: string[];
  };
}

