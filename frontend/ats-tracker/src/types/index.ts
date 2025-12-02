// Export all types from a single place
export * from './user.types';
export * from './dashboard.types';
export * from './api.types';
export * from './profile.types';
export * from './education.types';
export * from './project.types';
export * from './certification.types';
export * from './job.types';
export * from './skill.types';
export * from './file.types';
export * from './skillGap.types';
// Export resume types (ResumeVersion and AIGeneration from resume.types take precedence)
export * from './resume.types';
// Export jobOpportunity types except ResumeVersion (already in resume.types)
export type {
  JobStatus,
  StatusHistoryEntry,
  MaterialsChangeHistoryEntry,
  ApplicationHistoryEntry,
  JobOpportunityData,
  JobOpportunityInput,
  StatusCounts,
  JobOpportunityStatistics,
  CompanyInfo,
  // ResumeVersion is excluded - use from resume.types
  CoverLetterVersion,
  MaterialsHistoryEntry,
  MaterialsUsageStats,
  MaterialsUsageAnalytics,
  VersionComparison,
  CurrentMaterials,
  MatchScoreBreakdown,
  MatchStrength,
  MatchGap,
  MatchSuggestion,
  MatchScore,
  MatchScoreHistoryEntry,
  MatchScoreComparison,
  JobType,
  Industry,
} from './jobOpportunity.types';
// Export constants as values (not types)
export {
  JOB_STATUSES,
  STATUS_COLORS,
  STATUS_BG_COLORS,
  JOB_TYPES,
  INDUSTRIES,
} from './jobOpportunity.types';
// Export coverLetter types except AIGeneration (already in resume.types)
export type {
  CoverLetterTemplate,
  CoverLetterContent,
  ToneSettings,
  CompanyResearch,
  PerformanceMetrics,
  CoverLetter,
  CoverLetterInput,
  // AIGeneration is excluded - use from resume.types
  PerformanceRecord,
  RelevantExperience,
  ExperienceHighlighting,
} from './coverLetter.types';
export * from './interview.types';
export * from './analytics.types';
export * from './interviewAnalytics.types';
export * from './interviewPrediction.types';
export * from './salaryNegotiation.types';
export * from './writingPractice.types';
