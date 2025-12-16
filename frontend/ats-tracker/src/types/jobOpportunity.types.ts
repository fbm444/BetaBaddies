import type { SkillGapHistoryEntry } from "./skillGap.types";
import type { SalaryBenchmarkData } from "./salaryBenchmark.types";

export type JobStatus =
  | "Interested"
  | "Applied"
  | "Phone Screen"
  | "Interview"
  | "Offer"
  | "Rejected";

export interface StatusHistoryEntry {
  type?: "status_change";
  timestamp: string;
  status: JobStatus;
  notes?: string;
}

export interface MaterialsChangeHistoryEntry {
  type: "materials_change";
  timestamp: string;
  resumeVersionId?: string | null;
  coverLetterVersionId?: string | null;
  previousResumeId?: string | null;
  previousCoverLetterId?: string | null;
}

export type ApplicationHistoryEntry =
  | StatusHistoryEntry
  | MaterialsChangeHistoryEntry
  | SkillGapHistoryEntry
  | Record<string, unknown>;

export interface JobOpportunityData {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  jobPostingUrl?: string;
  applicationDeadline?: string;
  description?: string;
  industry?: string;
  jobType?: string;
  status: JobStatus;
  notes?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterPhone?: string;
  hiringManagerName?: string;
  hiringManagerEmail?: string;
  hiringManagerPhone?: string;
  salaryNegotiationNotes?: string;
  interviewNotes?: string;
  applicationHistory?: ApplicationHistoryEntry[];
  statusUpdatedAt?: string;
  archived?: boolean;
  archivedAt?: string;
  archiveReason?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Salary benchmark data (optional, included when requested) */
  salaryBenchmark?: SalaryBenchmarkData | null;
}

export interface JobOpportunityInput {
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  jobPostingUrl?: string;
  applicationDeadline?: string;
  description?: string;
  industry?: string;
  jobType?: string;
  status?: JobStatus;
  notes?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterPhone?: string;
  hiringManagerName?: string;
  hiringManagerEmail?: string;
  hiringManagerPhone?: string;
  salaryNegotiationNotes?: string;
  interviewNotes?: string;
  applicationHistory?: ApplicationHistoryEntry[];
}

export interface StatusCounts {
  Interested: number;
  Applied: number;
  "Phone Screen": number;
  Interview: number;
  Offer: number;
  Rejected: number;
}

export const JOB_STATUSES: JobStatus[] = [
  "Interested",
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
];

export const STATUS_COLORS: Record<JobStatus, string> = {
  Interested: "#5490FF",
  Applied: "#858CE7",
  "Phone Screen": "#B05FFF",
  Interview: "#F67DF0",
  Offer: "#4DF744",
  Rejected: "#FF0000",
};

export const STATUS_BG_COLORS: Record<JobStatus, string> = {
  Interested: "#E8F1FF",
  Applied: "#ECECFF",
  "Phone Screen": "#F2E8FF",
  Interview: "#FFE9F8",
  Offer: "#E7FFE9",
  Rejected: "#FFE5E5",
};

// Common job types
export const JOB_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Internship",
  "Freelance",
  "Remote",
  "Hybrid",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

// Common industries
export const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Retail",
  "Consulting",
  "Media & Entertainment",
  "Real Estate",
  "Transportation",
  "Hospitality",
  "Energy",
  "Government",
  "Non-profit",
  "Other",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export interface JobOpportunityStatistics {
  totalJobs: number;
  statusCounts: StatusCounts;
  responseRate: number;
  monthlyVolume: Array<{
    month: string;
    count: number;
  }>;
  deadlineAdherence: {
    percentage: number;
    totalWithDeadlines: number;
    metDeadlines: number;
    overdueCount: number;
    upcomingCount: number;
  };
  timeToOffer: {
    averageDays: number;
    totalOffers: number;
  };
  averageTimeInStage: Record<JobStatus, number>;
}

export interface CompanyInfo {
  name: string;
  website?: string | null;
  domain?: string | null;
  logo?: string | null;
  size?: string | null;
  industry?: string | null;
  description?: string | null;
  mission?: string | null;
  founded?: string | null;
  headquarters?: string | null;
}

// Materials (Resume/Cover Letter) Types
export interface ResumeVersion {
  id: string;
  versionName: string;
  versionNumber: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  file?: string | null;
  isMaster: boolean;
  parentResumeId?: string | null;
  jobId?: string | null; // job_id from resume table
}

export interface CoverLetterVersion {
  id: string;
  versionName: string;
  versionNumber: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  file?: string | null;
  isMaster: boolean;
  parentCoverLetterId?: string | null;
  jobId?: string | null; // job_id from coverletter table
}

export interface MaterialsHistoryEntry {
  id: string;
  jobOpportunityId: string;
  changedAt: string;
  changedByUserId?: string | null;
  changeType: "linked" | "updated" | "removed";
  notes?: string | null;
  resume: ResumeVersion | null;
  coverLetter: CoverLetterVersion | null;
}

export interface MaterialsUsageStats {
  id: string;
  versionName: string;
  versionNumber: number;
  usageCount: number;
  activeUsageCount: number;
  appliedCount: number;
  offerCount: number;
}

export interface MaterialsUsageAnalytics {
  resumeUsage: MaterialsUsageStats[];
  coverLetterUsage: MaterialsUsageStats[];
  mostUsedResume: {
    id: string;
    versionName: string;
    versionNumber: number;
    usageCount: number;
  } | null;
  mostUsedCoverLetter: {
    id: string;
    versionName: string;
    versionNumber: number;
    usageCount: number;
  } | null;
  totalStats: {
    totalJobs: number;
    jobsWithResume: number;
    jobsWithCoverLetter: number;
    jobsWithBoth: number;
  };
}

export interface VersionComparison<T> {
  version1: T;
  version2: T;
}

export interface CurrentMaterials {
  resume: ResumeVersion | null;
  coverLetter: CoverLetterVersion | null;
}

// Job Matching Types
export interface MatchScoreBreakdown {
  skills: {
    score: number;
    matched: Array<{
      name: string;
      category: string;
      proficiency: string;
      score: number;
      partialMatch?: boolean;
    }>;
    missing: Array<{
      name: string;
      category: string;
    }>;
    matchPercentage: number;
    totalRequired: number;
    matchedCount: number;
  };
  experience: {
    score: number;
    totalYears: number;
    requiredYears: number | null;
    levelMatch: number;
    yearsMatch: number;
    titleMatch: number;
    industryMatch: number;
    userExpLevel: string;
    requiredLevel: string;
  };
  education: {
    score: number;
    matched: string[];
    missing: string[];
    matchPercentage: number;
    userHighestLevel: string;
    requiredLevel: string;
  };
}

export interface MatchStrength {
  category: string;
  description: string;
  score: number;
}

export interface MatchGap {
  category: string;
  items: string[];
  description: string;
}

export interface MatchSuggestion {
  category: string;
  suggestion: string;
  priority: "High" | "Medium" | "Low";
}

export interface MatchScore {
  overallScore: number;
  breakdown: MatchScoreBreakdown;
  strengths: MatchStrength[];
  gaps: MatchGap[];
  suggestions: MatchSuggestion[];
  calculatedAt: string;
  weights?: {
    skills: number;
    experience: number;
    education: number;
  };
}

export interface MatchScoreHistoryEntry {
  score: number;
  timestamp: string;
  breakdown: MatchScoreBreakdown;
}

export interface MatchScoreComparison {
  jobId: string;
  matchScore: number | null;
  breakdown: MatchScoreBreakdown | null;
  error?: string;
}

