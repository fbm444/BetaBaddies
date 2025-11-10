import type { SkillGapHistoryEntry } from "./skillGap.types";

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

export type ApplicationHistoryEntry =
  | StatusHistoryEntry
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

