export type QuestionType = "behavioral" | "technical" | "situational";

export type TagType = "skill" | "experience" | "company" | "technology" | "industry";

export type OutcomeType = "offer" | "next_round" | "rejected" | "no_decision";

export interface InterviewResponseVersion {
  id: string;
  versionNumber: number;
  responseText: string;
  createdAt: string;
  editNotes?: string;
}

export interface InterviewResponseTag {
  id: string;
  tagType: TagType;
  tagValue: string;
  createdAt: string;
}

export interface InterviewResponseOutcome {
  id: string;
  interviewId?: string;
  outcomeType: OutcomeType;
  company?: string;
  jobTitle?: string;
  notes?: string;
  createdAt: string;
}

export interface InterviewResponse {
  id: string;
  questionText: string;
  questionType: QuestionType;
  currentVersion: InterviewResponseVersion;
  versions?: InterviewResponseVersion[];
  tags: InterviewResponseTag[];
  outcomes: InterviewResponseOutcome[];
  versionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewResponseInput {
  questionText: string;
  questionType: QuestionType;
  responseText: string;
  tags?: Array<{
    tagType: TagType;
    tagValue: string;
  }>;
  editNotes?: string;
}

export interface InterviewResponseUpdate {
  questionText?: string;
  questionType?: QuestionType;
}

export interface InterviewResponseVersionInput {
  responseText: string;
  editNotes?: string;
}

export interface InterviewResponseTagInput {
  tagType: TagType;
  tagValue: string;
}

export interface InterviewResponseOutcomeInput {
  interviewId?: string;
  outcomeType: OutcomeType;
  company?: string;
  jobTitle?: string;
  notes?: string;
}

export interface GapAnalysis {
  existing: Array<{
    question_type: QuestionType;
    count: string;
  }>;
  missing: Array<{
    questionType: QuestionType;
    count: number;
  }>;
  totalResponses: number;
}

export interface ResponseSuggestion {
  suggestedVersion: InterviewResponseVersion | null;
  confidenceScore: number;
  reasoning: string;
}

export const QUESTION_TYPES: QuestionType[] = ["behavioral", "technical", "situational"];

export const TAG_TYPES: TagType[] = ["skill", "experience", "company", "technology", "industry"];

export const OUTCOME_TYPES: OutcomeType[] = ["offer", "next_round", "rejected", "no_decision"];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  behavioral: "Behavioral",
  technical: "Technical",
  situational: "Situational",
};

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  skill: "Skill",
  experience: "Experience",
  company: "Company",
  technology: "Technology",
  industry: "Industry",
};

export const OUTCOME_TYPE_LABELS: Record<OutcomeType, string> = {
  offer: "Offer",
  next_round: "Next Round",
  rejected: "Rejected",
  no_decision: "No Decision",
};

export const QUESTION_TYPE_COLORS: Record<QuestionType, string> = {
  behavioral: "#3B82F6",
  technical: "#8B5CF6",
  situational: "#10B981",
};

export const OUTCOME_TYPE_COLORS: Record<OutcomeType, string> = {
  offer: "#10B981",
  next_round: "#3B82F6",
  rejected: "#EF4444",
  no_decision: "#6B7280",
};

