// Writing Practice Types

export type SessionType = "interview_response" | "thank_you_note" | "follow_up" | "cover_letter" | "custom";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type PromptCategory = "behavioral" | "technical" | "situational" | "strengths" | "weaknesses" | "company_fit" | "leadership" | "teamwork" | "problem_solving" | "custom";
export type ExerciseType = "breathing" | "visualization" | "affirmation" | "preparation_checklist";

export interface WritingPracticeSession {
  id: string;
  userId: string;
  sessionType: SessionType;
  prompt: string;
  response?: string;
  wordCount: number;
  timeSpentSeconds: number;
  sessionDate: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WritingFeedback {
  id: string;
  sessionId: string;
  userId: string;
  clarityScore: number;
  professionalismScore: number;
  structureScore: number;
  storytellingScore: number;
  overallScore: number;
  clarityFeedback: string;
  professionalismFeedback: string;
  structureFeedback: string;
  storytellingFeedback: string;
  strengths: string[];
  improvements: string[];
  tips: string[];
  generatedBy: "openai" | "fallback";
  createdAt: string;
}

export interface WritingPrompt {
  id: string;
  category: PromptCategory;
  promptText: string;
  difficultyLevel: DifficultyLevel;
  estimatedTimeMinutes: number;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressMetrics {
  clarityAvg: number;
  professionalismAvg: number;
  structureAvg: number;
  storytellingAvg: number;
  overallAvg: number;
  sessionCount: number;
}

export interface ProgressTrend {
  period: string;
  avgScore: number;
  sessionCount: number;
}

export interface ProgressInsights {
  insights: string[];
  currentMetrics: ProgressMetrics;
  trends: {
    overall: ProgressTrend[];
    clarity: ProgressTrend[];
    professionalism: ProgressTrend[];
    structure: ProgressTrend[];
    storytelling: ProgressTrend[];
  };
}

export interface NervesExercise {
  id: string;
  type: ExerciseType;
  title: string;
  description: string;
  duration: number;
}

export interface CompletedNervesExercise {
  id: string;
  userId: string;
  sessionId?: string;
  exerciseType: ExerciseType;
  exerciseData: Record<string, any>;
  completedAt?: string;
  effectivenessRating?: number;
  notes?: string;
  createdAt: string;
}

export interface PreparationChecklist {
  jobOpportunityId: string;
  jobTitle: string;
  company: string;
  checklist: ChecklistItem[];
  generatedAt: string;
}

export interface ChecklistItem {
  id: string;
  item: string;
  description: string;
  completed: boolean;
}

export interface SessionComparison {
  session1: {
    id: string;
    prompt: string;
    response: string;
    feedback: WritingFeedback;
  };
  session2: {
    id: string;
    prompt: string;
    response: string;
    feedback: WritingFeedback;
  };
  comparison: {
    clarity: {
      score1: number;
      score2: number;
      improvement: number;
    };
    professionalism: {
      score1: number;
      score2: number;
      improvement: number;
    };
    structure: {
      score1: number;
      score2: number;
      improvement: number;
    };
    storytelling: {
      score1: number;
      score2: number;
      improvement: number;
    };
    overall: {
      score1: number;
      score2: number;
      improvement: number;
    };
  };
}

export interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  avgWordCount: number;
  avgTimeSpent: number;
  totalTimeSpent: number;
}

export interface WritingPracticeSessionInput {
  sessionType?: SessionType;
  prompt: string;
  promptId?: string;
  timeLimit?: number;
}

export interface WritingPracticeSessionUpdate {
  response?: string;
  wordCount?: number;
  timeSpentSeconds?: number;
  isCompleted?: boolean;
}

export interface CustomPromptInput {
  category?: PromptCategory;
  promptText: string;
  difficultyLevel?: DifficultyLevel;
  estimatedTimeMinutes?: number;
  tags?: string[];
}

export interface CompleteExerciseInput {
  exerciseType: ExerciseType;
  sessionId?: string;
  effectivenessRating?: number;
  notes?: string;
  exerciseData?: Record<string, any>;
}

