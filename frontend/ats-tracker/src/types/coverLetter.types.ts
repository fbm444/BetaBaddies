export interface CoverLetterTemplate {
  id: string;
  templateName: string;
  description?: string;
  tone: "formal" | "casual" | "enthusiastic" | "analytical";
  length: "brief" | "standard" | "detailed";
  writingStyle?: "direct" | "narrative" | "bullet-points";
  colors?: string | object;
  fonts?: string | object;
  isDefault?: boolean;
  isShared?: boolean;
  industry?: string;
  existingCoverLetterTemplate?: string | null;
}

export interface CoverLetterContent {
  greeting?: string;
  opening?: string;
  body?: string[];
  closing?: string;
  fullText?: string;
}

export interface ToneSettings {
  tone: "formal" | "casual" | "enthusiastic" | "analytical";
  length: "brief" | "standard" | "detailed";
  writingStyle?: "direct" | "narrative" | "bullet-points";
  customInstructions?: string;
}

export interface CompanyResearch {
  companyName: string;
  industry?: string;
  size?: string;
  mission?: string;
  recentNews?: string[];
  initiatives?: string[];
  culture?: string;
  growth?: string;
}

export interface PerformanceMetrics {
  total_applications: number;
  interviews: number;
  acceptances: number;
  rejections: number;
  no_responses: number;
  interview_rate: number;
  acceptance_rate: number;
}

export interface CoverLetter {
  id: string;
  userId: string;
  templateId?: string;
  name: string; // Maps to versionName in backend
  versionName?: string; // Backend field name
  description?: string;
  jobId?: string;
  content?: CoverLetterContent;
  toneSettings?: ToneSettings;
  customizations?: any;
  versionNumber: number;
  parentCoverLetterId?: string;
  isMaster: boolean;
  createdAt: string;
  updatedAt: string;
  file?: string;
  commentsId?: string;
  companyResearch?: CompanyResearch;
  performanceMetrics?: PerformanceMetrics;
}

export interface CoverLetterInput {
  name: string;
  description?: string;
  templateId?: string;
  jobId?: string;
  content?: Partial<CoverLetterContent>;
  toneSettings?: Partial<ToneSettings>;
  customizations?: any;
}

export interface AIGeneration {
  id: string;
  coverLetterId: string;
  jobId: string;
  content: CoverLetterContent;
  variations: CoverLetterContent[];
  companyResearch?: CompanyResearch;
  tone: string;
  length: string;
  createdAt: string;
}

export interface PerformanceRecord {
  id: string;
  coverLetterId: string;
  jobId?: string;
  applicationOutcome?: "interview" | "rejected" | "no_response" | "accepted";
  responseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  jobTitle?: string;
  company?: string;
}

export interface RelevantExperience {
  experienceId: string;
  relevanceScore: number;
  keyPoints: string[];
  connectionToJob: string;
}

export interface ExperienceHighlighting {
  relevantExperiences: RelevantExperience[];
  suggestions: string[];
}
