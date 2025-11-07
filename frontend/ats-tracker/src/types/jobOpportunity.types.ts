export type JobStatus =
  | "Interested"
  | "Applied"
  | "Phone Screen"
  | "Interview"
  | "Offer"
  | "Rejected";

export interface ApplicationHistoryEntry {
  timestamp: string;
  status: JobStatus;
  notes?: string;
}

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
  Interested: "#3B82F6", // Blue
  Applied: "#10B981", // Green
  "Phone Screen": "#F59E0B", // Amber
  Interview: "#8B5CF6", // Purple
  Offer: "#10B981", // Green (success color for offers)
  Rejected: "#6B7280", // Gray
};

export const STATUS_BG_COLORS: Record<JobStatus, string> = {
  Interested: "#DBEAFE", // Blue 100
  Applied: "#D1FAE5", // Green 100
  "Phone Screen": "#FEF3C7", // Amber 100
  Interview: "#EDE9FE", // Purple 100
  Offer: "#D1FAE5", // Green 100 (success background for offers)
  Rejected: "#F3F4F6", // Gray 100
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

