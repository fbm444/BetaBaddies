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
}

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

