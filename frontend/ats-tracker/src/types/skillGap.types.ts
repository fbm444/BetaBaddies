export type SkillGapPriority = "P1" | "P2" | "P3";

export interface SkillGapLearningResource {
  skillName?: string;
  provider: string;
  title: string;
  url?: string;
  estimatedHours?: number;
  level?: string;
  tags?: string[];
}

export interface SkillGapRequirement {
  skillName: string;
  importance: "critical" | "high" | "medium" | "low";
  requiredLevel: number;
  currentLevel: number;
  currentProficiencyLabel?: string;
  source?: string;
  notes?: string;
  matched?: boolean;
  gapLevel?: number;
}

export interface SkillGapItem {
  skillName: string;
  severityScore: number;
  requiredLevel: number;
  currentLevel: number;
  priority: SkillGapPriority;
  summary?: string;
  recommendedResources?: SkillGapLearningResource[];
}

export interface SkillGapLearningPlanStep {
  skillName: string;
  priority: SkillGapPriority;
  severityScore: number;
  recommendedResources?: SkillGapLearningResource[];
  estimatedHours?: number;
  suggestedDeadline?: string;
}

export interface SkillGapLearningPlan {
  totalHours: number;
  steps: SkillGapLearningPlanStep[];
}

export interface SkillGapTrendInfo {
  direction: "rising" | "improving" | "stable";
  message: string;
  previousGapCount?: number;
  currentGapCount?: number;
}

export interface SkillGapSnapshot {
  type: "skill_gap_snapshot";
  snapshotId: string;
  generatedAt: string;
  requirements: SkillGapRequirement[];
  gaps: SkillGapItem[];
  learningPlan: SkillGapLearningPlan;
  stats: {
    totalRequirements: number;
    totalGaps: number;
    criticalGaps: number;
    highPriorityGaps: number;
  };
  trend: SkillGapTrendInfo;
}

export interface SkillGapProgressEntry {
  type: "skill_gap_progress";
  progressId: string;
  skillName: string;
  status: "planned" | "in-progress" | "completed";
  notes?: string | null;
  resource?: {
    title: string;
    url?: string | null;
    provider?: string | null;
  } | null;
  newProficiency?: string | null;
  updatedAt: string;
}

export type SkillGapHistoryEntry = SkillGapSnapshot | SkillGapProgressEntry;

export interface SkillGapSnapshotResponse {
  job: {
    id: string;
    title: string;
    company: string;
    status: string;
  };
  snapshot: SkillGapSnapshot;
  history: {
    totalSnapshots: number;
    snapshotIds?: string[];
  };
  message?: string;
}

export interface SkillGapProgressRequest {
  status: "planned" | "in-progress" | "completed";
  notes?: string;
  resourceUrl?: string;
  resourceTitle?: string;
  resourceProvider?: string;
  newProficiency?: string;
}

export interface SkillGapProgressResponse {
  job: {
    id: string;
    title: string;
    company: string;
  };
  progressEntry: SkillGapProgressEntry;
  skill?: {
    id: string;
    skillName: string;
    proficiency: string;
    category?: string | null;
  } | null;
  historyLength: number;
  message: string;
}

export interface SkillGapTrendSummary {
  topGaps: Array<{
    skillName: string;
    occurrences: number;
    criticalCount: number;
    jobs: Array<{
      jobId: string;
      title: string;
      company: string;
      severity: SkillGapPriority;
    }>;
  }>;
  jobSummaries: Array<{
    jobId: string;
    title: string;
    company: string;
    snapshotId: string;
    generatedAt: string;
    totalGaps: number;
    criticalGaps: number;
  }>;
  totalJobsWithSnapshots: number;
}

