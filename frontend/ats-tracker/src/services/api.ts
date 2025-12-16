import {
  ApiResponse,
  ProfileData,
  ProfileInput,
  EducationData,
  EducationInput,
  ProjectData,
  ProjectInput,
  ProjectFilters,
  ProjectSortOptions,
  CertificationData,
  CertificationInput,
  SkillData,
  SkillInput,
  SkillsByCategory,
  CategoryCounts,
  ProfilePictureData,
  FileUploadResponse,
  JobOpportunityData,
  JobOpportunityInput,
  JobStatus,
  StatusCounts,
  JobOpportunityStatistics,
  CompanyInfo,
  SkillGapSnapshotResponse,
  SkillGapProgressRequest,
  SkillGapProgressResponse,
  SkillGapTrendSummary,
  ResumeVersion,
  CoverLetterVersion,
  MaterialsHistoryEntry,
  MaterialsUsageAnalytics,
  VersionComparison,
  CurrentMaterials,
  MatchScore,
  MatchScoreHistoryEntry,
  MatchScoreComparison,
  InterviewData,
  InterviewInput,
  InterviewConflict,
  JobSearchPerformance,
  ApplicationSuccessAnalysis,
  InterviewPerformance,
  NetworkROI,
  ProductivityAnalytics,
  TimeLog,
  TimeLogInput,
  TimeSummary,
  SalaryProgression,
  DateRange,
  Goal,
  GoalAnalytics,
  InterviewAnalytics,
  SalaryNegotiation,
  SalaryNegotiationInput,
  SalaryNegotiationUpdate,
  CounterofferInput,
  NegotiationOutcomeInput,
  MarketResearchInput,
  TalkingPoint,
  NegotiationScript,
  CounterofferEvaluation,
  TimingStrategy,
  MarketSalaryData,
  SalaryProgressionEntry,
  SalaryBenchmarkData,
  SalaryBenchmarkResponse,
  WritingPracticeSession,
  WritingPracticeSessionInput,
  WritingPracticeSessionUpdate,
  WritingFeedback,
  WritingPrompt,
  ProgressMetrics,
  ProgressTrend,
  ProgressInsights,
  NervesExercise,
  CompletedNervesExercise,
  PreparationChecklist,
  SessionComparison,
  SessionStats,
  CustomPromptInput,
  CompleteExerciseInput,
  InterviewPrediction,
  PredictionComparison,
  PredictionAccuracyMetrics,
  FollowUpReminder,
  FollowUpReminderInput,
  ResponseType,
  InterviewResponse,
  InterviewResponseInput,
  InterviewResponseUpdate,
  InterviewResponseVersionInput,
  InterviewResponseTagInput,
  InterviewResponseOutcomeInput,
  GapAnalysis,
  ResponseSuggestion,
} from "../types";
import {
  ProfessionalContact,
  ContactInput,
  ContactInteraction,
  ContactInteractionInput,
  DiscoveredContact,
  ContactNetworkItem,
  GoogleContactsStatus,
  GoogleContactsImportSummary,
  NetworkingEvent,
  NetworkingEventInput,
  EventConnection,
  EventConnectionInput,
  EventAttendee,
  EventGoals,
  EventGoalsInput,
  ReferralRequest,
  ReferralRequestInput,
  ReferralTemplate,
  DiscoveredEvent,
  NetworkingGoal,
  NetworkingGoalInput,
} from "../types/network.types";

// In development, use proxy (relative path). In production, use env variable or full URL
const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";
const RATE_LIMIT_EVENT = "app:rate-limit-warning";
const AI_RATE_LIMIT_PATTERNS = [
  /^\/job-opportunities\/[^/]+\/skill-gaps/,
  /^\/job-opportunities\/skill-gaps/,
];

function shouldSurfaceAiRateLimit(endpoint: string): boolean {
  if (!endpoint) {
    return false;
  }
  const [path] = endpoint.split("?");
  return AI_RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(path));
}

function emitRateLimitWarning(
  endpoint: string,
  method?: string,
  feature?: string
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(RATE_LIMIT_EVENT, {
      detail: {
        endpoint,
        method,
        feature,
        timestamp: Date.now(),
      },
    })
  );
}

// Custom error class with status code support
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public detail?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: "include", // Always send session cookies
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const rateLimitStatus = response.headers.get("X-RateLimit-Status");
    if (rateLimitStatus === "exceeded" && shouldSurfaceAiRateLimit(endpoint)) {
      emitRateLimitWarning(
        endpoint,
        options.method || "GET",
        "skill-gap-analysis"
      );
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: "Request failed" },
      }));

      // Check for validation errors (422)
      if (response.status === 422 && error.error?.fields) {
        // Preserve the fields structure for validation errors
        throw new ApiError(
          error.error?.message || "Validation failed",
          response.status,
          error.error?.code || "VALIDATION_ERROR",
          JSON.stringify(error.error?.fields || {})
        );
      }

      // Check for duplicate/conflict errors (409)
      if (response.status === 409) {
        const errorCode = error.error?.code || "CONFLICT";
        const errorDetail =
          error.error?.detail ||
          error.error?.message ||
          "This item already exists";

        if (errorCode === "DUPLICATE_SKILL") {
          throw new ApiError(
            "You already have this skill",
            409,
            "DUPLICATE_SKILL",
            errorDetail
          );
        } else if (
          error.error?.message?.includes("already exists") ||
          errorDetail.includes("already")
        ) {
          throw new ApiError(errorDetail, 409, "CONFLICT", errorDetail);
        }
      }

      // Throw with status code and details
      throw new ApiError(
        error.error?.message || "Request failed",
        response.status,
        error.error?.code,
        error.error?.detail
      );
    }

    return response.json();
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    return this.request<
      ApiResponse<{ user: { id: string; email: string }; message: string }>
    >("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request<ApiResponse<{ message: string }>>("/users/logout", {
      method: "POST",
    });
  }

  async importLinkedInProfile() {
    return this.request<ApiResponse<{ message: string; profile: any }>>(
      "/users/import-linkedin-profile",
      {
        method: "POST",
      }
    );
  }

  // LinkedIn networking templates
  async generateLinkedInTemplate(templateData: {
    templateType?: string;
    contactName?: string;
    contactTitle?: string;
    contactCompany?: string;
    context?: string;
    jobTitle?: string;
    jobCompany?: string;
  }) {
    return this.request<ApiResponse<{ template: any; message: string }>>(
      "/linkedin/templates/generate",
      {
        method: "POST",
        body: JSON.stringify(templateData),
      }
    );
  }

  async getLinkedInTemplates(templateType?: string) {
    const params = templateType
      ? `?templateType=${encodeURIComponent(templateType)}`
      : "";
    return this.request<ApiResponse<{ templates: any[]; message: string }>>(
      `/linkedin/templates${params}`
    );
  }

  // LinkedIn profile optimization
  async generateLinkedInOptimization(profileData?: any) {
    return this.request<ApiResponse<{ suggestions: any[]; message: string }>>(
      "/linkedin/optimization/generate",
      {
        method: "POST",
        body: JSON.stringify(profileData || {}),
      }
    );
  }

  async getLinkedInOptimization(implemented?: boolean) {
    const params =
      implemented !== undefined ? `?implemented=${implemented}` : "";
    return this.request<ApiResponse<{ suggestions: any[]; message: string }>>(
      `/linkedin/optimization${params}`
    );
  }

  async markLinkedInOptimizationImplemented(optimizationId: string) {
    return this.request<ApiResponse<{ optimization: any; message: string }>>(
      `/linkedin/optimization/${optimizationId}/implement`,
      {
        method: "PUT",
      }
    );
  }

  // LinkedIn networking strategies
  async generateLinkedInStrategies(strategyData?: {
    industry?: string;
    targetRoles?: string[];
    goal?: string;
  }) {
    return this.request<ApiResponse<{ strategies: any; message: string }>>(
      "/linkedin/strategies/generate",
      {
        method: "POST",
        body: JSON.stringify(strategyData || {}),
      }
    );
  }

  async register(email: string, password: string, accountType?: string) {
    return this.request<
      ApiResponse<{
        user: { id: string; email: string; accountType?: string };
        message: string;
      }>
    >("/users/register", {
      method: "POST",
      body: JSON.stringify({ email, password, accountType }),
    });
  }

  // User endpoints (authentication data only)
  async getUserAuth() {
    // NOTE: This endpoint only returns users table data (email, id, authProvider, accountType)
    return this.request<
      ApiResponse<{
        user: {
          id: string;
          email: string;
          createdAt?: string;
          updatedAt?: string;
          authProvider?: string | null;
          accountType?: string;
        };
      }>
    >("/users/profile");
  }

  // Password reset endpoints
  async forgotPassword(email: string) {
    return this.request<ApiResponse<{ message: string }>>(
      "/users/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      }
    );
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<ApiResponse<{ message: string }>>(
      "/users/reset-password",
      {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      }
    );
  }

  // Profile endpoints (personal information from profiles table)
  async getProfile() {
    return this.request<ApiResponse<{ profile: ProfileData }>>("/profile");
  }

  async createOrUpdateProfile(data: ProfileInput) {
    return this.request<ApiResponse<{ profile: ProfileData; message: string }>>(
      "/profile",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async updateProfile(data: Partial<ProfileInput>) {
    return this.request<ApiResponse<{ profile: ProfileData; message: string }>>(
      "/profile",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async getProfilePicture() {
    return this.request<ApiResponse<{ picturePath: string }>>(
      "/profile/picture"
    );
  }

  async getProfileStatistics() {
    return this.request<ApiResponse<{ statistics: any }>>(
      "/profile/statistics"
    );
  }

  // File Upload endpoints
  async uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append("profilePicture", file);

    const response = await fetch(`${API_BASE}/files/profile-picture`, {
      method: "POST",
      credentials: "include",
      body: formData, // Don't set Content-Type header, browser will set it with boundary
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: "Upload failed" },
      }));
      throw new Error(error.error?.message || "Upload failed");
    }

    return response.json() as Promise<ApiResponse<FileUploadResponse>>;
  }

  async getCurrentProfilePicture() {
    return this.request<ApiResponse<{ profilePicture: ProfilePictureData }>>(
      "/files/profile-picture"
    );
  }

  async deleteFile(fileId: string) {
    return this.request<ApiResponse<{ message: string }>>(`/files/${fileId}`, {
      method: "DELETE",
    });
  }

  // Job/Employment endpoints (Full CRUD)
  async getJobs(filters?: { current?: boolean }) {
    const query =
      filters?.current !== undefined ? `?current=${filters.current}` : "";
    return this.request<ApiResponse<{ jobs: any[] }>>(`/jobs${query}`);
  }

  async getJob(id: string) {
    return this.request<ApiResponse<{ job: any }>>(`/jobs/${id}`);
  }

  async createJob(jobData: any) {
    return this.request<ApiResponse<{ job: any; message: string }>>("/jobs", {
      method: "POST",
      body: JSON.stringify(jobData),
    });
  }

  async updateJob(id: string, jobData: any) {
    return this.request<ApiResponse<{ job: any; message: string }>>(
      `/jobs/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(jobData),
      }
    );
  }

  async deleteJob(id: string) {
    return this.request<ApiResponse<{ message: string }>>(`/jobs/${id}`, {
      method: "DELETE",
    });
  }

  async getCurrentJob() {
    return this.request<ApiResponse<{ job: any | null }>>("/jobs/current");
  }

  async getJobHistory() {
    return this.request<ApiResponse<{ history: any[] }>>("/jobs/history");
  }

  async getJobStatistics() {
    return this.request<ApiResponse<{ statistics: any }>>("/jobs/statistics");
  }

  // Job Opportunities endpoints
  async getJobOpportunities(filters?: {
    sort?: string;
    limit?: number;
    offset?: number;
    status?: JobStatus;
    search?: string;
    industry?: string;
    location?: string;
    salaryMin?: number;
    salaryMax?: number;
    deadlineFrom?: string;
    deadlineTo?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.sort) params.append("sort", filters.sort);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.industry) params.append("industry", filters.industry);
    if (filters?.location) params.append("location", filters.location);
    if (filters?.salaryMin !== undefined)
      params.append("salaryMin", filters.salaryMin.toString());
    if (filters?.salaryMax !== undefined)
      params.append("salaryMax", filters.salaryMax.toString());
    if (filters?.deadlineFrom)
      params.append("deadlineFrom", filters.deadlineFrom);
    if (filters?.deadlineTo) params.append("deadlineTo", filters.deadlineTo);

    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<
      ApiResponse<{
        jobOpportunities: JobOpportunityData[];
        pagination: {
          total: number;
          limit: number;
          offset: number;
          hasMore: boolean;
        };
      }>
    >(`/job-opportunities${query}`);
  }

  async getJobOpportunity(id: string, includeSalaryBenchmarks = false) {
    const params = new URLSearchParams();
    if (includeSalaryBenchmarks) {
      params.append("includeSalaryBenchmarks", "true");
    }
    const queryString = params.toString();
    return this.request<ApiResponse<{ 
      jobOpportunity: JobOpportunityData;
      salaryBenchmark?: SalaryBenchmarkData | null;
    }>>(
      `/job-opportunities/${id}${queryString ? `?${queryString}` : ""}`
    );
  }

  async createJobOpportunity(data: JobOpportunityInput) {
    return this.request<
      ApiResponse<{ jobOpportunity: JobOpportunityData; message: string }>
    >("/job-opportunities", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateJobOpportunity(id: string, data: Partial<JobOpportunityInput>) {
    return this.request<
      ApiResponse<{ jobOpportunity: JobOpportunityData; message: string }>
    >(`/job-opportunities/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteJobOpportunity(id: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/job-opportunities/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  async bulkUpdateJobOpportunityStatus(
    opportunityIds: string[],
    status: JobStatus
  ) {
    return this.request<
      ApiResponse<{
        updatedOpportunities: Array<{
          id: string;
          title: string;
          company: string;
          status: JobStatus;
          statusUpdatedAt: string;
        }>;
        message: string;
      }>
    >("/job-opportunities/bulk-update-status", {
      method: "POST",
      body: JSON.stringify({ opportunityIds, status }),
    });
  }

  async getJobOpportunityStatusCounts() {
    return this.request<ApiResponse<{ statusCounts: StatusCounts }>>(
      "/job-opportunities/status/counts"
    );
  }

  async getJobOpportunityStatistics() {
    return this.request<ApiResponse<JobOpportunityStatistics>>(
      "/job-opportunities/statistics"
    );
  }

  async getSkillGapSnapshot(opportunityId: string) {
    return this.request<ApiResponse<SkillGapSnapshotResponse>>(
      `/job-opportunities/${opportunityId}/skill-gaps`
    );
  }

  async refreshSkillGapSnapshot(opportunityId: string) {
    return this.request<ApiResponse<SkillGapSnapshotResponse>>(
      `/job-opportunities/${opportunityId}/skill-gaps/refresh`,
      {
        method: "POST",
      }
    );
  }

  async logSkillGapProgress(
    opportunityId: string,
    skillName: string,
    payload: SkillGapProgressRequest
  ) {
    const encodedSkill = encodeURIComponent(skillName);
    return this.request<ApiResponse<SkillGapProgressResponse>>(
      `/job-opportunities/${opportunityId}/skill-gaps/${encodedSkill}/progress`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  async getSkillGapTrends() {
    return this.request<ApiResponse<SkillGapTrendSummary>>(
      "/job-opportunities/skill-gaps/trends"
    );
  }

  async archiveJobOpportunity(id: string, archiveReason?: string) {
    return this.request<
      ApiResponse<{ jobOpportunity: JobOpportunityData; message: string }>
    >(`/job-opportunities/${id}/archive`, {
        method: "POST",
        body: JSON.stringify({ archiveReason }),
    });
  }

  async unarchiveJobOpportunity(id: string) {
    return this.request<
      ApiResponse<{ jobOpportunity: JobOpportunityData; message: string }>
    >(`/job-opportunities/${id}/unarchive`, {
        method: "POST",
    });
  }

  async sendDeadlineReminder(id: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/job-opportunities/${id}/send-deadline-reminder`,
      {
        method: "POST",
      }
    );
  }

  async bulkArchiveJobOpportunities(
    opportunityIds: string[],
    archiveReason?: string
  ) {
    return this.request<
      ApiResponse<{
        archivedOpportunities: JobOpportunityData[];
        message: string;
      }>
    >("/job-opportunities/bulk-archive", {
        method: "POST",
        body: JSON.stringify({ opportunityIds, archiveReason }),
    });
  }

  async getArchivedJobOpportunities(options?: {
    limit?: number;
    offset?: number;
    sort?: string;
  }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.sort) params.append("sort", options.sort);

    const queryString = params.toString();
    return this.request<
      ApiResponse<{ jobOpportunities: JobOpportunityData[] }>
    >(`/job-opportunities/archived${queryString ? `?${queryString}` : ""}`);
  }

  async getSalaryBenchmark(jobTitle: string, location: string) {
    const params = new URLSearchParams();
    params.append("jobTitle", jobTitle);
    params.append("location", location);
    return this.request<ApiResponse<SalaryBenchmarkResponse>>(
      `/salary-benchmarks?${params.toString()}`
    );
  }

  async getCompanyInformation(opportunityId: string) {
    return this.request<
      ApiResponse<{
        companyInfo: CompanyInfo;
        jobOpportunity: {
          id: string;
          title: string;
          company: string;
          location: string;
          industry?: string;
        };
      }>
    >(`/job-opportunities/${opportunityId}/company`);
  }

  async importJobFromUrl(url: string) {
    return this.request<
      ApiResponse<{
        importResult: {
          success: boolean;
          error?: string | null;
          data?: {
            url: string;
            title?: string | null;
            company?: string | null;
            location?: string | null;
            description?: string | null;
            jobBoard?: string | null;
            importStatus: "success" | "partial" | "failed";
          };
        };
        message: string;
      }>
    >("/job-opportunities/import", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  }

  // Materials management endpoints
  async getCurrentMaterials(opportunityId: string) {
    return this.request<
      ApiResponse<{
        materials: CurrentMaterials;
      }>
    >(`/job-opportunities/${opportunityId}/materials`);
  }

  async linkMaterials(
    opportunityId: string,
    resumeVersionId: string | null,
    coverLetterVersionId: string | null
  ) {
    return this.request<
      ApiResponse<{
        materials: CurrentMaterials;
        message: string;
      }>
    >(`/job-opportunities/${opportunityId}/materials`, {
      method: "POST",
      body: JSON.stringify({
        resumeVersionId,
        coverLetterVersionId,
      }),
    });
  }

  async getMaterialsHistory(opportunityId: string) {
    return this.request<
      ApiResponse<{
        history: MaterialsHistoryEntry[];
        count: number;
      }>
    >(`/job-opportunities/${opportunityId}/materials/history`);
  }

  async getAvailableResumes() {
    return this.request<
      ApiResponse<{
        resumes: ResumeVersion[];
        count: number;
      }>
    >("/job-opportunities/materials/resumes");
  }

  async getAvailableCoverLetters() {
    return this.request<
      ApiResponse<{
        coverLetters: CoverLetterVersion[];
        count: number;
      }>
    >("/job-opportunities/materials/cover-letters");
  }

  async getMaterialsUsageAnalytics() {
    return this.request<
      ApiResponse<{
        analytics: MaterialsUsageAnalytics;
      }>
    >("/job-opportunities/materials/analytics");
  }

  async compareResumeVersions(resumeId1: string, resumeId2: string) {
    return this.request<
      ApiResponse<{
        comparison: VersionComparison<ResumeVersion>;
      }>
    >(
      `/job-opportunities/materials/compare/resumes?resumeId1=${resumeId1}&resumeId2=${resumeId2}`
    );
  }

  async compareCoverLetterVersions(
    coverLetterId1: string,
    coverLetterId2: string
  ) {
    return this.request<
      ApiResponse<{
        comparison: VersionComparison<CoverLetterVersion>;
      }>
    >(
      `/job-opportunities/materials/compare/cover-letters?coverLetterId1=${coverLetterId1}&coverLetterId2=${coverLetterId2}`
    );
  }

  // Job matching endpoints
  async getMatchScore(opportunityId: string) {
    return this.request<
      ApiResponse<{
        matchScore: MatchScore;
      }>
    >(`/job-opportunities/${opportunityId}/match-score`);
  }

  async calculateMatchScore(opportunityId: string) {
    return this.request<
      ApiResponse<{
        matchScore: MatchScore;
      }>
    >(`/job-opportunities/${opportunityId}/match-score`, {
      method: "POST",
    });
  }

  async getMatchScoreHistory(opportunityId: string) {
    return this.request<
      ApiResponse<{
        history: MatchScoreHistoryEntry[];
      }>
    >(`/job-opportunities/${opportunityId}/match-score/history`);
  }

  async getMatchScoresForJobs(jobIds: string[]) {
    return this.request<
      ApiResponse<{
        matchScores: MatchScoreComparison[];
      }>
    >("/job-opportunities/match-scores", {
      method: "POST",
      body: JSON.stringify({ jobIds }),
    });
  }

  async updateMatchingWeights(weights: {
    skills: number;
    experience: number;
    education: number;
  }) {
    return this.request<
      ApiResponse<{
        weights: {
          skills: number;
          experience: number;
          education: number;
        };
      }>
    >("/job-opportunities/matching-weights", {
      method: "PUT",
      body: JSON.stringify({ weights }),
    });
  }

  // Education endpoints
  async getEducation() {
    return this.request<ApiResponse<{ educations: EducationData[] }>>(
      "/education"
    );
  }

  async createEducation(data: EducationInput) {
    return this.request<
      ApiResponse<{ education: EducationData; message: string }>
    >("/education", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateEducation(id: string, data: Partial<EducationInput>) {
    return this.request<
      ApiResponse<{ education: EducationData; message: string }>
    >(`/education/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteEducation(id: string) {
    return this.request<ApiResponse<{ message: string }>>(`/education/${id}`, {
      method: "DELETE",
    });
  }

  // Projects endpoints
  async getProjects(
    filters?: ProjectFilters,
    sortOptions?: ProjectSortOptions
  ) {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    if (sortOptions) {
      if (sortOptions.sortBy) params.append("sortBy", sortOptions.sortBy);
      if (sortOptions.sortOrder)
        params.append("sortOrder", sortOptions.sortOrder);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/projects?${queryString}` : "/projects";

    return this.request<ApiResponse<{ projects: ProjectData[] }>>(endpoint);
  }

  async getProject(id: string) {
    return this.request<ApiResponse<{ project: ProjectData }>>(
      `/projects/${id}`
    );
  }

  async createProject(data: ProjectInput) {
    return this.request<ApiResponse<{ project: ProjectData; message: string }>>(
      "/projects",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async updateProject(id: string, data: Partial<ProjectInput>) {
    return this.request<ApiResponse<{ project: ProjectData; message: string }>>(
      `/projects/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteProject(id: string) {
    return this.request<ApiResponse<{ message: string }>>(`/projects/${id}`, {
      method: "DELETE",
    });
  }

  async searchProjects(searchTerm: string) {
    return this.request<
      ApiResponse<{ projects: ProjectData[]; count: number }>
    >(`/projects/search?q=${encodeURIComponent(searchTerm)}`);
  }

  async getProjectStatistics() {
    return this.request<ApiResponse<any>>("/projects/statistics");
  }

  // Certifications endpoints
  async getCertifications() {
    return this.request<
      ApiResponse<{ certifications: CertificationData[]; count: number }>
    >("/certifications");
  }

  async getCertification(id: string) {
    return this.request<ApiResponse<{ certification: CertificationData }>>(
      `/certifications/${id}`
    );
  }

  async createCertification(data: CertificationInput) {
    return this.request<
      ApiResponse<{ certification: CertificationData; message: string }>
    >("/certifications", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCertification(id: string, data: Partial<CertificationInput>) {
    return this.request<
      ApiResponse<{ certification: CertificationData; message: string }>
    >(`/certifications/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCertification(id: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/certifications/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  async getCurrentCertifications() {
    return this.request<
      ApiResponse<{ certifications: CertificationData[]; count: number }>
    >("/certifications/current");
  }

  async getCertificationHistory() {
    return this.request<
      ApiResponse<{ certifications: CertificationData[]; count: number }>
    >("/certifications/history");
  }

  async getExpiringCertifications(days: number = 30) {
    return this.request<
      ApiResponse<{
        certifications: CertificationData[];
        count: number;
        daysAhead: number;
      }>
    >(`/certifications/expiring?days=${days}`);
  }

  async getCertificationStatistics() {
    return this.request<ApiResponse<{ statistics: any }>>(
      "/certifications/statistics"
    );
  }

  async searchCertifications(searchTerm: string) {
    return this.request<
      ApiResponse<{
        certifications: CertificationData[];
        count: number;
        searchTerm: string;
      }>
    >(`/certifications/search?q=${encodeURIComponent(searchTerm)}`);
  }

  async getCertificationsByOrganization(organization: string) {
    return this.request<
      ApiResponse<{
        certifications: CertificationData[];
        count: number;
        organization: string;
      }>
    >(
      `/certifications/organization?organization=${encodeURIComponent(
        organization
      )}`
    );
  }

  async getCertificationsByCategory(category: string) {
    return this.request<
      ApiResponse<{
        certifications: CertificationData[];
        count: number;
        category: string;
      }>
    >(`/certifications/category?category=${encodeURIComponent(category)}`);
  }

  async uploadCertificationBadgeImage(file: File) {
    const formData = new FormData();
    formData.append("badgeImage", file);

    const response = await fetch(`${API_BASE}/certifications/badge-image`, {
      method: "POST",
      credentials: "include",
      body: formData, // Don't set Content-Type header, browser will set it with boundary
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: "Upload failed" },
      }));
      throw new Error(error.error?.message || "Upload failed");
    }

    return response.json() as Promise<
      ApiResponse<{ filePath: string; fileName: string; message: string }>
    >;
  }

  // Skills endpoints (Full CRUD + Category grouping)
  async getSkills(category?: string) {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    return this.request<ApiResponse<{ skills: SkillData[] }>>(
      `/skills${query}`
    );
  }

  async getSkillsByCategory() {
    return this.request<
      ApiResponse<{
        skillsByCategory: SkillsByCategory;
        categoryCounts: CategoryCounts;
      }>
    >("/skills/categories");
  }

  async getSkill(id: string) {
    return this.request<ApiResponse<{ skill: SkillData }>>(`/skills/${id}`);
  }

  async createSkill(skillData: SkillInput) {
    return this.request<ApiResponse<{ skill: SkillData; message: string }>>(
      "/skills",
      {
        method: "POST",
        body: JSON.stringify(skillData),
      }
    );
  }

  async updateSkill(id: string, skillData: Partial<SkillInput>) {
    return this.request<ApiResponse<{ skill: SkillData; message: string }>>(
      `/skills/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(skillData),
      }
    );
  }

  async deleteSkill(id: string) {
    return this.request<ApiResponse<{ message: string }>>(`/skills/${id}`, {
      method: "DELETE",
    });
  }

  // Account deletion (UC-009)
  async deleteAccount(password: string, confirmationText: string) {
    return this.request<ApiResponse<{ message: string; deletedAt: string }>>(
      "/users/account",
      {
        method: "DELETE",
        body: JSON.stringify({ password, confirmationText }),
      }
    );
  }

  // Interview endpoints
  async getInterviews(filters?: {
    status?: string;
    jobOpportunityId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.jobOpportunityId)
      queryParams.append("jobOpportunityId", filters.jobOpportunityId);
    if (filters?.startDate) queryParams.append("startDate", filters.startDate);
    if (filters?.endDate) queryParams.append("endDate", filters.endDate);

    const query = queryParams.toString();
    return this.request<ApiResponse<{ interviews: InterviewData[] }>>(
      `/interviews${query ? `?${query}` : ""}`
    );
  }

  async getInterview(id: string) {
    return this.request<ApiResponse<{ interview: InterviewData }>>(
      `/interviews/${id}`
    );
  }

  async createInterview(data: InterviewInput) {
    return this.request<
      ApiResponse<{ interview: InterviewData; message: string }>
    >("/interviews", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateInterview(id: string, data: Partial<InterviewInput>) {
    return this.request<
      ApiResponse<{ interview: InterviewData; message: string }>
    >(`/interviews/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async cancelInterview(id: string, cancellationReason?: string) {
    return this.request<
      ApiResponse<{ interview: InterviewData; message: string }>
    >(`/interviews/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancellationReason }),
    });
  }

  async rescheduleInterview(
    id: string,
    scheduledAt: string,
    duration?: number
  ) {
    return this.request<
      ApiResponse<{ interview: InterviewData; message: string }>
    >(`/interviews/${id}/reschedule`, {
      method: "POST",
      body: JSON.stringify({ scheduledAt, duration }),
    });
  }

  // Interview Analytics endpoints
  async getInterviewAnalytics() {
    return this.request<ApiResponse<InterviewAnalytics>>(
      "/interviews/analytics"
    );
  }

  async getInterviewConversionRate() {
    return this.request<
      ApiResponse<{ conversionRate: InterviewAnalytics["conversionRate"] }>
    >("/interviews/analytics/conversion-rate");
  }

  async getInterviewTrends(months?: number) {
    const query = months ? `?months=${months}` : "";
    return this.request<
      ApiResponse<{ trends: InterviewAnalytics["improvementTrend"] }>
    >(`/interviews/analytics/trends${query}`);
  }

  async getInterviewRecommendations() {
    return this.request<ApiResponse<{ recommendations: string[] }>>(
      "/interviews/analytics/recommendations"
    );
  }

  async updatePreparationTask(
    interviewId: string,
    taskId: string,
    updateData: { completed?: boolean; task?: string; dueDate?: string }
  ) {
    return this.request<ApiResponse<{ task: any; message: string }>>(
      `/interviews/${interviewId}/tasks/${taskId}`,
      {
      method: "PUT",
      body: JSON.stringify(updateData),
      }
    );
  }

  async generatePreparationTasks(interviewId: string) {
    return this.request<ApiResponse<{ tasks: any[]; message: string }>>(
      `/interviews/${interviewId}/preparation/generate`,
      {
        method: "POST",
      }
    );
  }

  async deleteInterview(id: string) {
    return this.request<ApiResponse<{ message: string }>>(`/interviews/${id}`, {
      method: "DELETE",
    });
  }

  async checkConflicts(
    scheduledAt: string,
    duration: number,
    excludeInterviewId?: string
  ) {
    const queryParams = new URLSearchParams();
    queryParams.append("scheduledAt", scheduledAt);
    queryParams.append("duration", duration.toString());
    if (excludeInterviewId)
      queryParams.append("excludeInterviewId", excludeInterviewId);

    return this.request<
      ApiResponse<{
        conflicts: InterviewConflict[];
        hasConflicts: boolean;
      }>
    >(`/interviews/check-conflicts?${queryParams.toString()}`);
  }

  // Interview Response Library endpoints
  async createInterviewResponse(data: InterviewResponseInput) {
    return this.request<
      ApiResponse<{ response: InterviewResponse; message: string }>
    >("/interview-responses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getInterviewResponses(filters?: {
    questionType?: string;
    tagValue?: string;
    searchTerm?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters?.questionType) queryParams.append("questionType", filters.questionType);
    if (filters?.tagValue) queryParams.append("tagValue", filters.tagValue);
    if (filters?.searchTerm) queryParams.append("searchTerm", filters.searchTerm);

    const query = queryParams.toString();
    return this.request<ApiResponse<{ responses: InterviewResponse[] }>>(
      `/interview-responses${query ? `?${query}` : ""}`
    );
  }

  async getInterviewResponse(id: string) {
    return this.request<ApiResponse<{ response: InterviewResponse }>>(
      `/interview-responses/${id}`
    );
  }

  async updateInterviewResponse(id: string, data: InterviewResponseUpdate) {
    return this.request<
      ApiResponse<{ response: any; message: string }>
    >(`/interview-responses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteInterviewResponse(id: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/interview-responses/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  async createResponseVersion(id: string, data: InterviewResponseVersionInput) {
    return this.request<
      ApiResponse<{ version: any; message: string }>
    >(`/interview-responses/${id}/versions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async addResponseTag(id: string, data: InterviewResponseTagInput) {
    return this.request<
      ApiResponse<{ tag: any; message: string }>
    >(`/interview-responses/${id}/tags`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async removeResponseTag(id: string, tagId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/interview-responses/${id}/tags/${tagId}`,
      {
        method: "DELETE",
      }
    );
  }

  async addResponseOutcome(id: string, data: InterviewResponseOutcomeInput) {
    return this.request<
      ApiResponse<{ outcome: any; message: string }>
    >(`/interview-responses/${id}/outcomes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getGapAnalysis() {
    return this.request<ApiResponse<{ gapAnalysis: GapAnalysis }>>(
      "/interview-responses/gap-analysis"
    );
  }

  async suggestBestResponse(id: string, jobRequirements: any) {
    return this.request<ApiResponse<{ suggestion: ResponseSuggestion }>>(
      `/interview-responses/${id}/suggest`,
      {
        method: "POST",
        body: JSON.stringify({ jobRequirements }),
      }
    );
  }

  async exportPrepGuide(format: "json" | "markdown" = "json") {
    const url = `/interview-responses/export?format=${format}`;
    
    if (format === "json" || format === "markdown") {
      const response = await fetch(`${API_BASE}${url}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to export prep guide: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `interview-prep-guide-${Date.now()}.${format === "json" ? "json" : "md"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return { ok: true, data: { message: "Export successful" } };
    }

    return this.request<ApiResponse<{ exportData: string }>>(url);
  }

  // Google Calendar endpoints
  async getGoogleCalendarAuthUrl() {
    return this.request<ApiResponse<{ authUrl: string }>>("/calendar/auth/url");
  }

  async getGoogleCalendarStatus() {
    return this.request<
      ApiResponse<{
        status: { enabled: boolean; calendarId: string | null };
      }>
    >("/calendar/status");
  }

  async disconnectGoogleCalendar() {
    return this.request<ApiResponse<{ message: string }>>(
      "/calendar/disconnect",
      {
      method: "POST",
      }
    );
  }

  async syncInterviewToCalendar(interviewId: string) {
    return this.request<ApiResponse<{ event: any; message: string }>>(
      `/calendar/sync/interview/${interviewId}`,
      {
      method: "POST",
      }
    );
  }

  async syncAllInterviewsToCalendar() {
    return this.request<
      ApiResponse<{
        synced: number;
        failed: number;
        results: any[];
        errors: any[];
        message: string;
      }>
    >("/calendar/sync/all", {
      method: "POST",
    });
  }

  // Analytics endpoints (UC-096 through UC-100)
  async getJobSearchPerformance(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);

    const queryString = params.toString();
    return this.request<ApiResponse<{ performance: JobSearchPerformance }>>(
      `/analytics/job-search-performance${queryString ? `?${queryString}` : ""}`
    );
  }

  async getApplicationSuccessAnalysis(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);

    const queryString = params.toString();
    return this.request<ApiResponse<{ analysis: ApplicationSuccessAnalysis }>>(
      `/analytics/application-success${queryString ? `?${queryString}` : ""}`
    );
  }

  async getInterviewPerformance(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);

    const queryString = params.toString();
    return this.request<ApiResponse<{ performance: InterviewPerformance }>>(
      `/analytics/interview-performance${queryString ? `?${queryString}` : ""}`
    );
  }

  async getNetworkROI(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);

    const queryString = params.toString();
    return this.request<ApiResponse<{ roi: NetworkROI }>>(
      `/analytics/network-roi${queryString ? `?${queryString}` : ""}`
    );
  }

  // Networking endpoints
  async getRecruiters() {
    return this.request<ApiResponse<{ recruiters: Array<{ name: string; email?: string; phone?: string; company?: string; opportunityCount: number }> }>>(
      `/networking/recruiters`
    );
  }

  async searchCompanies(industry: string) {
    return this.request<ApiResponse<{ companies: Array<{ name: string; industry: string; type: string; linkedInUrl?: string }> }>>(
      `/networking/companies/search?industry=${encodeURIComponent(industry)}`
    );
  }

  async searchContactsByCompany(company: string) {
    return this.request<ApiResponse<{ recruiters: Array<any>; contacts: Array<any>; total: number }>>(
      `/networking/contacts/search?company=${encodeURIComponent(company)}`
    );
  }

  async getLinkedInNetwork(options?: { company?: string; industry?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (options?.company) params.append("company", options.company);
    if (options?.industry) params.append("industry", options.industry);
    if (options?.limit) params.append("limit", options.limit.toString());
    const queryString = params.toString();
    return this.request<ApiResponse<{ contacts: any[] }>>(
      `/networking/linkedin/network${queryString ? `?${queryString}` : ""}`
    );
  }

  async generateNetworkingMessage(messageData: {
    recipientName: string;
    recipientTitle?: string;
    recipientCompany?: string;
    messageType?: "coffee_chat" | "interview_request" | "referral_request";
    jobOpportunityId?: string;
    personalContext?: string;
  }) {
    return this.request<ApiResponse<{ message: { subject: string; messageBody: string; messageType: string } }>>(
      `/networking/messages/generate`,
      {
        method: "POST",
        body: JSON.stringify(messageData),
      }
    );
  }

  async createCoffeeChat(chatData: {
    contactId?: string;
    jobOpportunityId?: string;
    contactName: string;
    contactEmail?: string;
    contactLinkedInUrl?: string;
    contactCompany?: string;
    contactTitle?: string;
    chatType?: "coffee_chat" | "interview_request" | "informational" | "referral_request";
    scheduledDate?: string;
    notes?: string;
  }) {
    return this.request<ApiResponse<{ chat: any }>>(
      `/networking/coffee-chats`,
      {
        method: "POST",
        body: JSON.stringify(chatData),
      }
    );
  }

  async getCoffeeChats(filters?: { status?: string; jobOpportunityId?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.jobOpportunityId) params.append("jobOpportunityId", filters.jobOpportunityId);
    const queryString = params.toString();
    return this.request<ApiResponse<{ chats: any[] }>>(
      `/networking/coffee-chats${queryString ? `?${queryString}` : ""}`
    );
  }

  async updateCoffeeChat(chatId: string, updateData: any) {
    return this.request<ApiResponse<{ chat: any }>>(
      `/networking/coffee-chats/${chatId}`,
      {
        method: "PUT",
        body: JSON.stringify(updateData),
      }
    );
  }

  async saveNetworkingMessage(messageData: {
    coffeeChatId?: string;
    messageType: string;
    recipientName: string;
    recipientEmail?: string;
    recipientLinkedInUrl?: string;
    subject: string;
    messageBody: string;
    generatedBy?: string;
  }) {
    return this.request<ApiResponse<{ message: any }>>(
      `/networking/messages`,
      {
        method: "POST",
        body: JSON.stringify(messageData),
      }
    );
  }

  async getNetworkingAnalytics(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);
    const queryString = params.toString();
    return this.request<ApiResponse<{ analytics: any }>>(
      `/networking/analytics${queryString ? `?${queryString}` : ""}`
    );
  }

  async getSalaryProgression(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);

    const queryString = params.toString();
    return this.request<ApiResponse<{ progression: SalaryProgression }>>(
      `/analytics/salary-progression${queryString ? `?${queryString}` : ""}`
    );
  }

  async getProductivityAnalytics(dateRange?: DateRange, useManual?: boolean) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);
    if (useManual !== undefined) params.append("useManual", String(useManual));

    const queryString = params.toString();
    return this.request<ApiResponse<{ analytics: ProductivityAnalytics }>>(
      `/analytics/productivity${queryString ? `?${queryString}` : ""}`
    );
  }

  // Time Log endpoints (UC-103 Manual Tracking)
  async createTimeLog(timeLog: TimeLogInput) {
    return this.request<ApiResponse<{ timeLog: TimeLog }>>("/time-logs", {
      method: "POST",
      body: JSON.stringify(timeLog),
    });
  }

  async getTimeLogs(filters?: {
    startDate?: string;
    endDate?: string;
    activityType?: string;
    jobOpportunityId?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.activityType)
      params.append("activityType", filters.activityType);
    if (filters?.jobOpportunityId)
      params.append("jobOpportunityId", filters.jobOpportunityId);

    const queryString = params.toString();
    return this.request<ApiResponse<{ timeLogs: TimeLog[] }>>(
      `/time-logs${queryString ? `?${queryString}` : ""}`
    );
  }

  async getTimeSummary(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);

    const queryString = params.toString();
    return this.request<ApiResponse<{ summary: TimeSummary }>>(
      `/time-logs/summary${queryString ? `?${queryString}` : ""}`
    );
  }

  async updateTimeLog(id: string, updates: Partial<TimeLogInput>) {
    return this.request<ApiResponse<{ timeLog: TimeLog }>>(`/time-logs/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteTimeLog(id: string) {
    return this.request<ApiResponse<{ id: string; deleted: boolean }>>(
      `/time-logs/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  // Goal endpoints (UC-101)
  async getGoals(filters?: {
    status?: string;
    category?: string;
    goalType?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.goalType) params.append("goalType", filters.goalType);

    const queryString = params.toString();
    return this.request<ApiResponse<{ goals: Goal[] }>>(
      `/goals${queryString ? `?${queryString}` : ""}`
    );
  }

  async getGoalById(id: string) {
    return this.request<ApiResponse<{ goal: Goal }>>(`/goals/${id}`);
  }

  async createGoal(goalData: Partial<Goal>) {
    return this.request<ApiResponse<{ goal: Goal; message: string }>>(
      "/goals",
      {
        method: "POST",
        body: JSON.stringify(goalData),
      }
    );
  }

  async updateGoal(id: string, goalData: Partial<Goal>) {
    return this.request<ApiResponse<{ goal: Goal; message: string }>>(
      `/goals/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(goalData),
      }
    );
  }

  async completeGoal(id: string) {
    return this.request<ApiResponse<{ goal: Goal; message: string }>>(
      `/goals/${id}/complete`,
      {
        method: "PUT",
      }
    );
  }

  async deleteGoal(id: string) {
    return this.request<ApiResponse<{ message: string }>>(`/goals/${id}`, {
      method: "DELETE",
    });
  }

  async getGoalAnalytics() {
    return this.request<ApiResponse<{ analytics: GoalAnalytics }>>(
      "/goals/analytics"
    );
  }

  // ============================================================================
  // Interview Preparation Suite (UC-074 to UC-078)
  // ============================================================================

  // UC-074: Company Research
  async getInterviewCompanyResearch(interviewId: string) {
    return this.request<ApiResponse<{ research: any }>>(
      `/interview-prep/interviews/${interviewId}/company-research`
    );
  }

  async getInterviewCompanyResearchAIContent(interviewId: string) {
    return this.request<ApiResponse<{ aiContent: any }>>(
      `/interview-prep/interviews/${interviewId}/company-research/ai-content`
    );
  }

  async generateInterviewCompanyResearch(
    interviewId: string,
    forceRefresh = false
  ) {
    return this.request<ApiResponse<{ researchData: any; message: string }>>(
      `/interview-prep/interviews/${interviewId}/company-research/generate`,
      {
        method: "POST",
        body: JSON.stringify({ forceRefresh }),
      }
    );
  }

  async exportInterviewCompanyResearch(
    interviewId: string,
    format: "markdown" | "json" | "pdf" | "docx" = "markdown"
  ) {
    const url = `/interview-prep/interviews/${interviewId}/company-research/export?format=${format}`;

    // For PDF and DOCX, return blob response
    if (format === "pdf" || format === "docx") {
      const response = await fetch(`${API_BASE}${url}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: "Export failed" } }));
        throw new Error(error.error?.message || "Export failed");
      }

      return response; // Return the response object for blob handling
    }

    // For markdown and JSON, return JSON response
    return this.request<ApiResponse<{ report: string; format: string }>>(url);
  }

  // UC-075: Question Bank
  async getQuestionBank(jobId: string, category?: string, difficulty?: string) {
    const params = new URLSearchParams({ jobId });
    if (category) params.append("category", category);
    if (difficulty) params.append("difficulty", difficulty);
    return this.request<ApiResponse<{ questionBank: any }>>(
      `/interview-prep/question-bank?${params.toString()}`
    );
  }

  async generateQuestionBank(
    jobId: string,
    jobTitle?: string,
    industry?: string,
    difficulty?: string
  ) {
    return this.request<
      ApiResponse<{ questions: any[]; count: number; message: string }>
    >(`/interview-prep/question-bank/generate`, {
      method: "POST",
      body: JSON.stringify({ jobId, jobTitle, industry, difficulty }),
    });
  }

  // UC-076: Response Coaching
  async submitInterviewResponse(
    questionId: string,
    responseText: string,
    interviewId?: string,
    practiceSessionId?: string,
    jobId?: string
  ) {
    return this.request<
      ApiResponse<{
        id: string;
        practiceSessionId: string;
        feedback: any;
        message: string;
      }>
    >(`/interview-prep/responses`, {
      method: "POST",
      body: JSON.stringify({
        questionId,
        responseText,
        interviewId,
        practiceSessionId,
        jobId,
      }),
    });
  }

  // Reminder endpoints
  async getRemindersForInterview(interviewId: string) {
    return this.request<ApiResponse<{ reminders: any[] }>>(
      `/interviews/${interviewId}/reminders`
    );
  }

  // Thank-you note endpoints
  async getThankYouNotes(interviewId: string) {
    return this.request<ApiResponse<{ notes: any[] }>>(
      `/interviews/${interviewId}/thank-you-notes`
    );
  }

  async generateThankYouNote(
    interviewId: string,
    templateStyle?: string,
    options?: { regenerate?: boolean }
  ) {
    return this.request<ApiResponse<{ note: any }>>(
      `/interviews/${interviewId}/thank-you-notes/generate`,
      {
        method: "POST",
        body: JSON.stringify({
          ...(templateStyle ? { templateStyle } : {}),
          ...(options?.regenerate ? { regenerate: true } : {}),
        }),
      }
    );
  }

  // ============================================================================
  // UC-108, UC-109, UC-110, UC-111: Collaboration & Social Features
  // ============================================================================

  // Teams (UC-108)
  async createTeam(teamData: {
    teamName: string;
    teamType?: string;
    billingEmail?: string;
    subscriptionTier?: string;
    maxMembers?: number;
  }) {
    return this.request<ApiResponse<{ team: any }>>(`/teams`, {
      method: "POST",
      body: JSON.stringify(teamData),
    });
  }

  async getUserTeams() {
    return this.request<ApiResponse<{ teams: any[] }>>(`/teams`);
  }

  async getTeamById(teamId: string) {
    return this.request<ApiResponse<{ team: any }>>(`/teams/${teamId}`);
  }

  async inviteTeamMember(
    teamId: string,
    invitationData: {
      email: string;
      role?: string;
      permissions?: any;
    }
  ) {
    return this.request<ApiResponse<{ invitation: any }>>(
      `/teams/${teamId}/invitations`,
      {
        method: "POST",
        body: JSON.stringify(invitationData),
      }
    );
  }

  async getInvitationByToken(token: string) {
    return this.request<ApiResponse<{ invitation: any }>>(
      `/teams/invitations/${token}`
    );
  }

  async acceptTeamInvitation(token: string) {
    return this.request<ApiResponse<{ team: any }>>(
      `/teams/invitations/${token}/accept`,
      {
        method: "POST",
      }
    );
  }

  async getTeamInvitations(teamId: string) {
    return this.request<ApiResponse<{ invitations: any[] }>>(
      `/teams/${teamId}/invitations`
    );
  }

  // Family Support API Methods
  async inviteFamilyMember(data: {
    email: string;
    familyMemberName?: string;
    relationship?: string;
  }) {
    return this.request<ApiResponse<{ invitation: any }>>(
      `/family/invitations`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getFamilyInvitationByToken(token: string) {
    return this.request<ApiResponse<{ invitation: any }>>(
      `/family/invitations/${token}`
    );
  }

  async acceptFamilyInvitation(token: string) {
    return this.request<ApiResponse<{ invitation: any; userId: string }>>(
      `/family/invitations/${token}/accept`,
      {
        method: "POST",
      }
    );
  }

  async getFamilyMembers() {
    return this.request<ApiResponse<{ members: any[] }>>(`/family/members`);
  }

  async getPendingFamilyInvitations() {
    return this.request<ApiResponse<{ invitations: any[] }>>(
      `/family/invitations`
    );
  }

  async removeFamilyMember(memberId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/family/members/${memberId}`,
      {
        method: "DELETE",
      }
    );
  }

  async cancelFamilyInvitation(invitationId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/family/invitations/${invitationId}`,
      {
        method: "DELETE",
      }
    );
  }

  async getFamilyProgressSummary(userId: string) {
    return this.request<ApiResponse<{ summary: any }>>(
      `/family/progress/${userId}`
    );
  }

  async getUsersWhoInvitedMe() {
    return this.request<ApiResponse<{ users: any[] }>>(`/family/invited-by`);
  }

  // Family Communications
  async createFamilyCommunication(data: {
    familyMemberUserId: string;
    communication_type: string;
    message: string;
  }) {
    return this.request<ApiResponse<{ id: string; success: boolean }>>(
      `/family/communications`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getFamilyCommunications(familyMemberUserId?: string) {
    const url = familyMemberUserId
      ? `/family/communications?familyMemberUserId=${familyMemberUserId}`
      : `/family/communications`;
    return this.request<ApiResponse<{ communications: any[] }>>(url);
  }

  // Family Celebrations
  async createFamilyCelebration(data: {
    familyMemberUserId?: string; // Job seeker ID (person being celebrated)
    celebration_type: string;
    title: string;
    description?: string;
    milestone_data?: any;
  }) {
    return this.request<ApiResponse<{ id: string; success: boolean }>>(
      `/family/celebrations`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getFamilyCelebrations(familyMemberUserId?: string) {
    const url = familyMemberUserId
      ? `/family/celebrations?familyMemberUserId=${familyMemberUserId}`
      : `/family/celebrations`;
    return this.request<ApiResponse<{ celebrations: any[] }>>(url);
  }

  // Well-being Tracking
  async trackFamilyWellbeing(data: {
    userId: string;
    stress_level?: number;
    mood_indicator?: string;
    energy_level?: number;
    sleep_quality?: number;
    notes?: string;
    wellbeing_indicators?: any;
  }) {
    return this.request<ApiResponse<{ id: string; success: boolean }>>(
      `/family/wellbeing`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getFamilyWellbeingTracking(trackedByUserId?: string) {
    const url = trackedByUserId
      ? `/family/wellbeing?trackedByUserId=${trackedByUserId}`
      : `/family/wellbeing`;
    return this.request<ApiResponse<{ tracking: any[] }>>(url);
  }

  // Boundary Settings
  async getFamilyBoundarySettings(familyMemberUserId: string) {
    return this.request<ApiResponse<{ settings: any[] }>>(
      `/family/boundaries/${familyMemberUserId}`
    );
  }

  async updateFamilyBoundarySettings(
    familyMemberUserId: string,
    settings: any[]
  ) {
    return this.request<ApiResponse<{ success: boolean }>>(
      `/family/boundaries/${familyMemberUserId}`,
      {
        method: "PUT",
        body: JSON.stringify({ settings }),
      }
    );
  }

  async generateFamilyBoundarySuggestions(
    familyMemberUserId: string,
    currentBoundaries?: any
  ) {
    return this.request<ApiResponse<any>>(
      `/family/boundaries/${familyMemberUserId}/ai-suggestions`,
      {
        method: "POST",
        body: JSON.stringify({ currentBoundaries: currentBoundaries || {} }),
      }
    );
  }

  // Support Effectiveness
  async trackSupportEffectiveness(data: {
    familyMemberUserId: string;
    support_type?: string;
    emotional_support_score?: number;
    impact_on_performance?: string;
    stress_management_notes?: string;
    wellbeing_indicators?: any;
    support_activity_type?: string;
    support_activity_details?: any;
    performance_metrics?: any;
  }) {
    return this.request<ApiResponse<{ id: string; success: boolean }>>(
      `/family/support-effectiveness`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getSupportEffectiveness(familyMemberUserId?: string) {
    const url = familyMemberUserId
      ? `/family/support-effectiveness?familyMemberUserId=${familyMemberUserId}`
      : `/family/support-effectiveness`;
    return this.request<ApiResponse<{ effectiveness: any[] }>>(url);
  }

  // Educational Resources
  async getEducationalResources(
    userId?: string,
    category?: string,
    forceRegenerate?: boolean
  ) {
    let url = `/family/educational-resources?`;
    const params = new URLSearchParams();

    if (userId) {
      params.append("userId", userId);
    }
    if (category) {
      params.append("category", category);
    }
    if (forceRegenerate) {
      params.append("forceRegenerate", "true");
    }

    url += params.toString();
    return this.request<ApiResponse<{ resources: any[] }>>(url);
  }

  // AI Suggestions
  async generateAISupportSuggestions(
    familyMemberUserId: string,
    context?: any
  ) {
    return this.request<ApiResponse<any>>(
      `/family/ai-suggestions/${familyMemberUserId}`,
      {
        method: "POST",
        body: JSON.stringify({ context: context || {} }),
      }
    );
  }

  async getAISupportSuggestions(familyMemberUserId?: string) {
    const url = familyMemberUserId
      ? `/family/ai-suggestions?familyMemberUserId=${familyMemberUserId}`
      : `/family/ai-suggestions`;
    return this.request<ApiResponse<{ suggestions: any[] }>>(url);
  }

  async cancelTeamInvitation(teamId: string, invitationId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/teams/${teamId}/invitations/${invitationId}`,
      {
        method: "DELETE",
      }
    );
  }
  // ============================================================================
  // Chat/Messaging API
  // ============================================================================

  async createOrGetConversation(conversationData: {
    conversationType: string;
    teamId?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    participantIds?: string[];
    title?: string;
  }) {
    return this.request<ApiResponse<{ conversation: any }>>(
      `/chat/conversations`,
      {
        method: "POST",
        body: JSON.stringify(conversationData),
      }
    );
  }

  async getUserConversations(type?: string, teamId?: string) {
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (teamId) params.append("teamId", teamId);
    const url = `/chat/conversations${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    return this.request<ApiResponse<{ conversations: any[] }>>(url);
  }

  async getConversation(conversationId: string) {
    return this.request<ApiResponse<{ conversation: any }>>(
      `/chat/conversations/${conversationId}`
    );
  }

  async addParticipant(
    conversationId: string,
    participantId: string,
    role?: string
  ) {
    return this.request<ApiResponse<{ message: string }>>(
      `/chat/conversations/${conversationId}/participants`,
      {
        method: "POST",
        body: JSON.stringify({ participantId, role }),
      }
    );
  }

  async sendMessage(
    conversationId: string,
    messageData: {
      messageText: string;
      messageType?: string;
      attachmentUrl?: string;
      attachmentType?: string;
      parentMessageId?: string;
    }
  ) {
    return this.request<ApiResponse<{ message: any }>>(
      `/chat/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(messageData),
      }
    );
  }

  async getMessages(conversationId: string, limit?: number, before?: string) {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (before) params.append("before", before);
    const url = `/chat/conversations/${conversationId}/messages${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    return this.request<ApiResponse<{ messages: any[] }>>(url);
  }

  async markConversationAsRead(conversationId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/chat/conversations/${conversationId}/read`,
      {
        method: "PUT",
      }
    );
  }

  async updateConversationTitle(conversationId: string, title: string) {
    return this.request<ApiResponse<{ conversation: any }>>(
      `/chat/conversations/${conversationId}/title`,
      {
        method: "PUT",
        body: JSON.stringify({ title }),
      }
    );
  }

  async editMessage(messageId: string, messageText: string) {
    return this.request<ApiResponse<{ message: any }>>(
      `/chat/messages/${messageId}`,
      {
        method: "PUT",
        body: JSON.stringify({ messageText }),
      }
    );
  }

  async deleteMessage(messageId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/chat/messages/${messageId}`,
      {
        method: "DELETE",
      }
    );
  }

  async getUnreadNotifications() {
    return this.request<ApiResponse<{ notifications: any[] }>>(
      `/chat/notifications`
    );
  }

  async updateTeamMemberRole(
    teamId: string,
    memberUserId: string,
    roleData: {
      role: string;
      permissions?: any;
    }
  ) {
    return this.request<ApiResponse<{ team: any }>>(
      `/teams/${teamId}/members/${memberUserId}`,
      {
        method: "PUT",
        body: JSON.stringify(roleData),
      }
    );
  }

  async removeTeamMember(teamId: string, memberUserId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/teams/${teamId}/members/${memberUserId}`,
      {
        method: "DELETE",
      }
    );
  }

  // Mentor Dashboard (UC-109)
  async getMentees() {
    return this.request<ApiResponse<{ mentees: any[] }>>(
      `/collaboration/mentor/mentees`
    );
  }

  async getMenteeProgress(menteeId: string) {
    return this.request<ApiResponse<{ progress: any }>>(
      `/collaboration/mentor/mentees/${menteeId}/progress`
    );
  }

  async getMenteeMaterials(menteeId: string, type?: string) {
    const params = type ? `?type=${type}` : "";
    return this.request<ApiResponse<{ materials: any }>>(
      `/collaboration/mentor/mentees/${menteeId}/materials${params}`
    );
  }

  async getMenteeResumeDetail(menteeId: string, resumeId: string) {
    return this.request<ApiResponse<{ resume: any }>>(
      `/collaboration/mentor/mentees/${menteeId}/resumes/${resumeId}`
    );
  }

  async getMenteeCoverLetterDetail(menteeId: string, coverLetterId: string) {
    return this.request<ApiResponse<{ coverLetter: any }>>(
      `/collaboration/mentor/mentees/${menteeId}/cover-letters/${coverLetterId}`
    );
  }

  async getMenteeJobDetail(menteeId: string, jobId: string) {
    return this.request<ApiResponse<{ job: any }>>(
      `/collaboration/mentor/mentees/${menteeId}/jobs/${jobId}`
    );
  }

  async getCoachingInsights(menteeId: string) {
    return this.request<ApiResponse<{ insights: any }>>(
      `/collaboration/mentor/mentees/${menteeId}/insights`
    );
  }

  async getMenteeJobs(menteeId: string) {
    return this.request<ApiResponse<{ jobs: any[] }>>(
      `/collaboration/mentor/mentees/${menteeId}/jobs`
    );
  }

  async getMenteeResumes(menteeId: string) {
    return this.request<ApiResponse<{ resumes: any[] }>>(
      `/collaboration/mentor/mentees/${menteeId}/resumes`
    );
  }

  async getMenteeCoverLetters(menteeId: string) {
    return this.request<ApiResponse<{ coverLetters: any[] }>>(
      `/collaboration/mentor/mentees/${menteeId}/cover-letters`
    );
  }

  async getMenteeGoals(menteeId: string) {
    return this.request<ApiResponse<{ goals: any }>>(
      `/collaboration/mentor/mentees/${menteeId}/goals`
    );
  }

  async provideFeedback(feedbackData: {
    menteeId: string;
    feedbackType: string;
    feedbackContent: string;
    recommendations?: string;
    relatedItemType?: string;
    relatedItemId?: string;
  }) {
    return this.request<ApiResponse<{ feedback: any }>>(
      `/collaboration/mentor/feedback`,
      {
        method: "POST",
        body: JSON.stringify(feedbackData),
      }
    );
  }

  // Mentee Dashboard
  async getMentor() {
    return this.request<ApiResponse<{ mentor: any }>>(
      `/collaboration/mentee/mentor`
    );
  }

  async getMenteeFeedback() {
    return this.request<ApiResponse<{ feedback: any[] }>>(
      `/collaboration/mentee/feedback`
    );
  }

  async getMentorActivityFeed() {
    return this.request<ApiResponse<{ feed: any[] }>>(
      `/collaboration/mentee/mentor-activity`
    );
  }

  async getOwnProgress() {
    return this.request<ApiResponse<{ progress: any }>>(
      `/collaboration/mentee/progress`
    );
  }

  async getPendingMentorInvitations() {
    return this.request<ApiResponse<{ invitations: any[] }>>(
      `/collaboration/mentee/pending-invitations`
    );
  }

  async inviteMentor(invitationData: {
    mentorEmail: string;
    relationshipType?: string;
    permissions?: any;
  }) {
    return this.request<ApiResponse<{ invitation: any }>>(
      `/collaboration/mentee/invite-mentor`,
      {
        method: "POST",
        body: JSON.stringify(invitationData),
      }
    );
  }

  async acceptMentorInvitation(relationshipId: string) {
    return this.request<ApiResponse<{ mentor: any }>>(
      `/collaboration/mentee/accept-invitation/${relationshipId}`,
      {
        method: "POST",
      }
    );
  }

  async declineMentorInvitation(relationshipId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/collaboration/mentee/decline-invitation/${relationshipId}`,
      {
        method: "POST",
      }
    );
  }

  // Team Dashboard (UC-108)
  async getTeamDashboard(teamId: string) {
    return this.request<ApiResponse<{ dashboard: any }>>(
      `/collaboration/teams/${teamId}/dashboard`
    );
  }

  async getTeamPerformance(teamId: string) {
    return this.request<ApiResponse<{ performance: any }>>(
      `/collaboration/teams/${teamId}/performance`
    );
  }

  async getTeamAIInsights(teamId: string) {
    return this.request<ApiResponse<{ insights: any }>>(
      `/collaboration/teams/${teamId}/insights`
    );
  }

  async getPredefinedMilestones() {
    return this.request<ApiResponse<{ milestones: any[] }>>(
      `/collaboration/milestones/predefined`
    );
  }

  async addMilestoneReaction(
    milestoneId: string,
    reactionType: string,
    commentText?: string
  ) {
    return this.request<ApiResponse<{ reactions: any[]; comments: any[] }>>(
      `/collaboration/milestones/${milestoneId}/reactions`,
      {
        method: "POST",
        body: JSON.stringify({ reactionType, commentText }),
      }
    );
  }

  // Document Review (UC-110)
  async requestDocumentReview(reviewData: {
    documentType: string;
    documentId: string;
    reviewerIds: string[];
    deadline?: string;
    teamId?: string;
  }) {
    return this.request<ApiResponse<{ requests: any[] }>>(
      `/collaboration/reviews`,
      {
        method: "POST",
        body: JSON.stringify(reviewData),
      }
    );
  }

  async getUserReviews(role?: string) {
    const params = role ? `?role=${role}` : "";
    return this.request<ApiResponse<{ reviews: any[] }>>(
      `/collaboration/reviews${params}`
    );
  }

  async getReview(reviewId: string) {
    return this.request<ApiResponse<{ review: any }>>(
      `/collaboration/reviews/${reviewId}`
    );
  }

  async addReviewComment(
    reviewId: string,
    commentData: {
      commentText: string;
      suggestionText?: string;
      commentType?: string;
      parentCommentId?: string;
      documentSection?: string;
    }
  ) {
    return this.request<ApiResponse<{ comment: any }>>(
      `/collaboration/reviews/${reviewId}/comments`,
      {
        method: "POST",
        body: JSON.stringify(commentData),
      }
    );
  }

  async completeReview(reviewId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/collaboration/reviews/${reviewId}/complete`,
      {
        method: "POST",
      }
    );
  }

  // Progress Sharing (UC-111)
  async configureProgressSharing(shareConfig: {
    sharedWithUserId?: string;
    sharedWithTeamId?: string;
    shareType: string;
    privacyLevel?: string;
  }) {
    return this.request<ApiResponse<{ share: any }>>(
      `/collaboration/progress/share`,
      {
        method: "POST",
        body: JSON.stringify(shareConfig),
      }
    );
  }

  async generateProgressReport(period?: string, generateAI?: boolean) {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (generateAI) params.append("generateAI", "true");
    const queryString = params.toString();
    return this.request<ApiResponse<{ report: any }>>(
      `/collaboration/progress/report${queryString ? `?${queryString}` : ""}`
    );
  }

  async saveProgressReport(
    reportData: any,
    sharedWithMentorIds: string[] = []
  ) {
    return this.request<ApiResponse<{ report: any }>>(
      `/collaboration/progress/report/save`,
      {
        method: "POST",
        body: JSON.stringify({ reportData, sharedWithMentorIds }),
      }
    );
  }

  async shareReportWithMentor(reportId: string, mentorId: string) {
    return this.request<
      ApiResponse<{ success: boolean; sharedWith: string[] }>
    >(`/collaboration/progress/report/${reportId}/share`, {
      method: "POST",
      body: JSON.stringify({ mentorId }),
    });
  }

  async getUserProgressReports() {
    return this.request<ApiResponse<{ reports: any[] }>>(
      `/collaboration/progress/reports`
    );
  }

  async getMenteeProgressReports() {
    return this.request<ApiResponse<{ reports: any[] }>>(
      `/collaboration/progress/reports/mentee`
    );
  }

  async addReportComment(reportId: string, commentText: string) {
    return this.request<ApiResponse<{ comment: any }>>(
      `/collaboration/progress/report/${reportId}/comment`,
      {
        method: "POST",
        body: JSON.stringify({ commentText }),
      }
    );
  }

  async getReportComments(reportId: string) {
    return this.request<ApiResponse<{ comments: any[] }>>(
      `/collaboration/progress/report/${reportId}/comments`
    );
  }

  async getSharedProgress(userId: string) {
    return this.request<ApiResponse<{ progress: any }>>(
      `/collaboration/progress/shared/${userId}`
    );
  }

  async createMilestone(milestoneData: {
    milestoneType: string;
    milestoneTitle: string;
    milestoneDescription?: string;
    milestoneData?: any;
    sharedWithTeam?: boolean;
    teamId?: string;
  }) {
    return this.request<ApiResponse<{ milestone: any }>>(
      `/collaboration/milestones`,
      {
        method: "POST",
        body: JSON.stringify(milestoneData),
      }
    );
  }

  // Job Sharing
  async shareJobWithTeam(jobId: string, teamId: string) {
    return this.request<ApiResponse<{ share: any }>>(
      `/collaboration/jobs/${jobId}/share`,
      {
        method: "POST",
        body: JSON.stringify({ teamId }),
      }
    );
  }

  async getSharedJobs(teamId: string) {
    return this.request<ApiResponse<{ jobs: any[] }>>(
      `/collaboration/teams/${teamId}/jobs`
    );
  }

  async addJobComment(
    jobId: string,
    teamId: string,
    commentData: {
      commentText: string;
      parentCommentId?: string;
    }
  ) {
    return this.request<ApiResponse<{ comment: any }>>(
      `/collaboration/jobs/${jobId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ teamId, ...commentData }),
      }
    );
  }

  async getJobComments(jobId: string, teamId: string) {
    return this.request<ApiResponse<{ comments: any[] }>>(
      `/collaboration/jobs/${jobId}/comments?teamId=${teamId}`
    );
  }

  // Document Sharing
  async shareDocumentWithTeam(data: {
    documentType: "resume" | "cover_letter";
    documentId: string;
    teamId: string;
    sharedWithUserId?: string; // Optional: share with specific team member, or null/undefined for team-wide
    versionNumber?: number;
  }) {
    return this.request<ApiResponse<{ share: any }>>(
      `/collaboration/documents/share`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getSharedDocuments(teamId: string) {
    return this.request<ApiResponse<{ documents: any[] }>>(
      `/collaboration/teams/${teamId}/documents`
    );
  }

  async addDocumentComment(data: {
    documentType: "resume" | "cover_letter";
    documentId: string;
    teamId: string;
    commentText: string;
    parentCommentId?: string;
    documentSection?: string;
  }) {
    return this.request<ApiResponse<{ comment: any }>>(
      `/collaboration/documents/comments`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getDocumentComments(
    documentType: "resume" | "cover_letter",
    documentId: string,
    teamId: string
  ) {
    return this.request<ApiResponse<{ comments: any[] }>>(
      `/collaboration/documents/${documentType}/${documentId}/comments?teamId=${teamId}`
    );
  }

  async getDocumentDetails(
    documentType: "resume" | "cover_letter",
    documentId: string
  ) {
    return this.request<ApiResponse<{ document: any }>>(
      `/collaboration/documents/${documentType}/${documentId}`
    );
  }

  // Task Management
  async assignTask(taskData: {
    assignedTo: string;
    teamId: string;
    taskType: string;
    taskTitle: string;
    taskDescription?: string;
    taskData?: any;
    dueDate?: string;
  }) {
    return this.request<ApiResponse<{ task: any }>>(`/collaboration/tasks`, {
      method: "POST",
      body: JSON.stringify(taskData),
    });
  }

  async getUserTasks(teamId?: string, status?: string) {
    const params = new URLSearchParams();
    if (teamId) params.append("teamId", teamId);
    if (status) params.append("status", status);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<ApiResponse<{ tasks: any[] }>>(
      `/collaboration/tasks${query}`
    );
  }

  async getMenteeTasks(menteeId: string, teamId?: string) {
    const params = new URLSearchParams();
    if (teamId) params.append("teamId", teamId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<ApiResponse<{ tasks: any[] }>>(
      `/collaboration/tasks/mentee/${menteeId}${query}`
    );
  }

  async updateTaskStatus(taskId: string, status: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/collaboration/tasks/${taskId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      }
    );
  }

  // Activity Feed
  async getTeamActivityFeed(teamId: string, limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<ApiResponse<{ activities: any[] }>>(
      `/collaboration/teams/${teamId}/activity${query}`
    );
  }

  async getResponseFeedback(responseId: string) {
    return this.request<ApiResponse<{ feedback: any }>>(
      `/interview-prep/responses/${responseId}`
    );
  }

  async getResponseHistory(
    interviewId?: string,
    questionId?: string,
    jobId?: string
  ) {
    const params = new URLSearchParams();
    if (interviewId) params.append("interviewId", interviewId);
    if (questionId) params.append("questionId", questionId);
    if (jobId) params.append("jobId", jobId);
    return this.request<ApiResponse<{ responses: any[] }>>(
      `/interview-prep/responses?${params.toString()}`
    );
  }

  async compareResponses(responseId1: string, responseId2: string) {
    return this.request<ApiResponse<{ comparison: any }>>(
      `/interview-prep/responses/compare`,
      {
        method: "POST",
        body: JSON.stringify({ responseId1, responseId2 }),
      }
    );
  }

  // Coaching Chat
  async sendCoachingMessage(message: string, interviewId?: string) {
    return this.request<ApiResponse<{ response: string; error: boolean }>>(
      `/interview-prep/coaching-chat`,
      {
        method: "POST",
        body: JSON.stringify({ message, interviewId }),
      }
    );
  }

  async getCoachingSuggestions(interviewId?: string) {
    const params = new URLSearchParams();
    if (interviewId) params.append("interviewId", interviewId);
    return this.request<ApiResponse<{ suggestions: string[] }>>(
      `/interview-prep/coaching-chat/suggestions?${params.toString()}`
    );
  }

  // UC-077: Mock Interviews
  async createMockInterviewSession(
    interviewId?: string,
    jobId?: string,
    targetRole?: string,
    targetCompany?: string,
    interviewFormat?: string
  ) {
    return this.request<ApiResponse<{ session: any; message: string }>>(
      `/interview-prep/mock-interviews`,
      {
        method: "POST",
        body: JSON.stringify({
          interviewId,
          jobId,
          targetRole,
          targetCompany,
          interviewFormat,
        }),
      }
    );
  }

  async getMockInterviewSession(sessionId: string) {
    return this.request<ApiResponse<{ session: any }>>(
      `/interview-prep/mock-interviews/${sessionId}`
    );
  }

  async submitMockInterviewResponse(
    sessionId: string,
    questionId: string,
    responseText: string
  ) {
    return this.request<ApiResponse<{ success: boolean; message: string }>>(
      `/interview-prep/mock-interviews/${sessionId}/responses`,
      {
        method: "POST",
        body: JSON.stringify({ questionId, responseText }),
      }
    );
  }

  async completeMockInterviewSession(sessionId: string) {
    return this.request<
      ApiResponse<{
        sessionId: string;
        performanceSummary: any;
        message: string;
      }>
    >(`/interview-prep/mock-interviews/${sessionId}/complete`, {
      method: "POST",
    });
  }

  async getMockInterviewHistory(limit = 20, offset = 0) {
    return this.request<ApiResponse<{ sessions: any[] }>>(
      `/interview-prep/mock-interviews?limit=${limit}&offset=${offset}`
    );
  }

  async submitMockInterviewChatMessage(sessionId: string, message: string) {
    return this.request<ApiResponse<{ success: boolean; message: string }>>(
      `/interview-prep/mock-interviews/${sessionId}/chat`,
      {
        method: "POST",
        body: JSON.stringify({ message }),
      }
    );
  }

  async getMockInterviewMessages(sessionId: string) {
    return this.request<ApiResponse<{ messages: any[] }>>(
      `/interview-prep/mock-interviews/${sessionId}/messages`
    );
  }

  // Mock Interview Comments (Mentor/Mentee)
  async getMenteeMockInterviews(menteeId: string) {
    return this.request<ApiResponse<{ sessions: any[] }>>(
      `/interview-prep/mentees/${menteeId}/mock-interviews`
    );
  }

  async getMockInterviewSessionForMentor(sessionId: string) {
    return this.request<ApiResponse<{ session: any }>>(
      `/interview-prep/mock-interviews/${sessionId}/mentor-view`
    );
  }

  async addMockInterviewComment(
    sessionId: string,
    menteeId: string,
    commentText: string,
    commentType: string = "general"
  ) {
    return this.request<ApiResponse<{ comment: any; message: string }>>(
      `/interview-prep/mock-interviews/${sessionId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ menteeId, commentText, commentType }),
      }
    );
  }

  async getMockInterviewComments(sessionId: string) {
    return this.request<ApiResponse<{ comments: any[] }>>(
      `/interview-prep/mock-interviews/${sessionId}/comments`
    );
  }

  async getUserMockInterviewsWithComments() {
    return this.request<ApiResponse<{ sessions: any[] }>>(
      `/interview-prep/mock-interviews/with-comments`
    );
  }

  // UC-078: Technical Prep
  async getTechnicalPrep(interviewId?: string, jobId?: string) {
    const params = new URLSearchParams();
    if (jobId) params.append("jobId", jobId);
    const endpoint = interviewId
      ? `/interview-prep/technical/${interviewId}?${params.toString()}`
      : `/interview-prep/technical?${params.toString()}`;
    return this.request<ApiResponse<{ challenges: any[] }>>(endpoint);
  }

  async generateTechnicalPrep(interviewId?: string, jobId?: string) {
    return this.request<
      ApiResponse<{ challenges: any[]; techStack: string[]; message: string }>
    >(`/interview-prep/technical/generate`, {
      method: "POST",
      body: JSON.stringify({ interviewId, jobId }),
    });
  }

  async getCodingChallenges(techStack?: string[], difficulty?: string) {
    const params = new URLSearchParams();
    if (techStack) params.append("techStack", techStack.join(","));
    if (difficulty) params.append("difficulty", difficulty);
    return this.request<ApiResponse<{ challenges: any[] }>>(
      `/interview-prep/technical/challenges?${params.toString()}`
    );
  }

  async getSystemDesignQuestions(roleLevel?: string) {
    const params = new URLSearchParams();
    if (roleLevel) params.append("roleLevel", roleLevel);
    return this.request<ApiResponse<{ questions: any[] }>>(
      `/interview-prep/technical/system-design?${params.toString()}`
    );
  }

  async runTechnicalCode(
    challengeId: string,
    solution: string,
    language: string = "python",
    input?: any,
    runOnce: boolean = false
  ) {
    return this.request<
      ApiResponse<{
        success: boolean;
        testResults?: any[];
        message?: string;
        output?: any;
        error?: string;
        rawOutput?: string;
      }>
    >(`/interview-prep/technical/run`, {
      method: "POST",
      body: JSON.stringify({ challengeId, solution, language, input, runOnce }),
    });
  }

  async submitTechnicalSolution(
    challengeId: string,
    solution: string,
    timeTakenSeconds?: number,
    testResults?: any
  ) {
    return this.request<
      ApiResponse<{ id: string; feedback: any; message: string }>
    >(`/interview-prep/technical/solutions`, {
      method: "POST",
      body: JSON.stringify({
        challengeId,
        solution,
        timeTakenSeconds,
        testResults,
      }),
    });
  }

  async getTechnicalProgress() {
    return this.request<ApiResponse<{ progress: any }>>(
      `/interview-prep/technical/progress`
    );
  }

  async getWhiteboardingTechniques(challengeType: string = "coding") {
    return this.request<ApiResponse<{ techniques: any }>>(
      `/interview-prep/technical/whiteboarding?challengeType=${challengeType}`
    );
  }

  async getChallengeAttemptHistory(challengeId: string) {
    return this.request<ApiResponse<{ attempts: any[] }>>(
      `/interview-prep/technical/attempts/${challengeId}`
    );
  }

  async getUserAttemptHistory(challengeId?: string, limit = 50, offset = 0) {
    const params = new URLSearchParams();
    if (challengeId) params.append("challengeId", challengeId);
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    return this.request<ApiResponse<{ attempts: any[] }>>(
      `/interview-prep/technical/attempts?${params.toString()}`
    );
  }

  // ============================================================================
  // Support Groups (UC-112)
  // ============================================================================

  async getSupportGroups(filters?: {
    category?: string;
    industry?: string;
    roleType?: string;
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append("category", filters.category);
    if (filters?.industry) params.append("industry", filters.industry);
    if (filters?.roleType) params.append("roleType", filters.roleType);
    if (filters?.search) params.append("search", filters.search);
    return this.request<ApiResponse<{ groups: any[] }>>(
      `/collaboration/support-groups${
        params.toString() ? `?${params.toString()}` : ""
      }`
    );
  }

  async getUserSupportGroups() {
    return this.request<ApiResponse<{ groups: any[] }>>(
      `/collaboration/support-groups/my-groups`
    );
  }

  async getSupportGroup(groupId: string) {
    return this.request<ApiResponse<{ group: any }>>(
      `/collaboration/support-groups/${groupId}`
    );
  }

  async joinSupportGroup(groupId: string, privacyLevel = "standard") {
    return this.request<ApiResponse<{ group: any }>>(
      `/collaboration/support-groups/${groupId}/join`,
      {
        method: "POST",
        body: JSON.stringify({ privacyLevel }),
      }
    );
  }

  // Google Contacts import endpoints
  async getGoogleContactsStatus() {
    return this.request<
      ApiResponse<{
        status: GoogleContactsStatus;
      }>
    >("/network/google-contacts/status");
  }

  async getGoogleContactsAuthUrl() {
    return this.request<ApiResponse<{ authUrl: string }>>(
      "/network/google-contacts/auth/url"
    );
  }

  async importGoogleContacts(options: { maxResults?: number } = {}) {
    return this.request<
      ApiResponse<{
        summary: GoogleContactsImportSummary;
        message: string;
      }>
    >("/network/google-contacts/import", {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  async disconnectGoogleContacts() {
    return this.request<ApiResponse<{ message: string }>>(
      "/network/google-contacts/disconnect",
      {
        method: "POST",
      }
    );
  }

  async getExploreNetworkContacts(filters?: {
    degree?: "2nd" | "3rd";
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.degree) params.append("degree", filters.degree);
    if (filters?.search) params.append("search", filters.search);
    const query = params.toString();

    return this.request<
      ApiResponse<{
        suggestions: DiscoveredContact[];
      }>
    >(`/network/explore${query ? `?${query}` : ""}`);
  }

  async getPeopleWhoHaveYou(filters?: { search?: string }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    const query = params.toString();

    return this.request<
      ApiResponse<{
        contacts: DiscoveredContact[];
      }>
    >(`/network/explore/who-have-you${query ? `?${query}` : ""}`);
  }

  async getPeopleInYourIndustry(filters?: { search?: string }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    const query = params.toString();

    return this.request<
      ApiResponse<{
        contacts: DiscoveredContact[];
      }>
    >(`/network/explore/same-industry${query ? `?${query}` : ""}`);
  }

  // Network Contacts endpoints
  async getContacts(filters?: {
    industry?: string;
    relationshipType?: string;
    company?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters?.industry) queryParams.append("industry", filters.industry);
    if (filters?.relationshipType)
      queryParams.append("relationshipType", filters.relationshipType);
    if (filters?.company) queryParams.append("company", filters.company);
    if (filters?.search) queryParams.append("search", filters.search);

    const query = queryParams.toString();
    return this.request<ApiResponse<{ contacts: ProfessionalContact[] }>>(
      `/network/contacts${query ? `?${query}` : ""}`
    );
  }

  async getContact(id: string) {
    return this.request<ApiResponse<{ contact: ProfessionalContact }>>(
      `/network/contacts/${id}`
    );
  }

  async getContactNetwork(id: string) {
    return this.request<ApiResponse<{ network: ContactNetworkItem[] }>>(
      `/network/contacts/${id}/network`
    );
  }

  async createContact(contactData: ContactInput) {
    return this.request<
      ApiResponse<{ contact: ProfessionalContact; message: string }>
    >("/network/contacts", {
      method: "POST",
      body: JSON.stringify(contactData),
    });
  }

  async leaveSupportGroup(groupId: string) {
    return this.request<ApiResponse<{ success: boolean }>>(
      `/collaboration/support-groups/${groupId}/leave`,
      {
        method: "POST",
      }
    );
  }

  async getGroupPosts(
    groupId: string,
    filters?: {
      postType?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const params = new URLSearchParams();
    if (filters?.postType) params.append("postType", filters.postType);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());
    return this.request<ApiResponse<{ posts: any[] }>>(
      `/collaboration/support-groups/${groupId}/posts${
        params.toString() ? `?${params.toString()}` : ""
      }`
    );
  }

  async createPost(
    groupId: string,
    postData: {
      title?: string;
      content: string;
      postType?: string;
      isAnonymous?: boolean;
      metadata?: any;
    }
  ) {
    return this.request<ApiResponse<{ post: any }>>(
      `/collaboration/support-groups/${groupId}/posts`,
      {
        method: "POST",
        body: JSON.stringify(postData),
      }
    );
  }

  async getPost(postId: string) {
    return this.request<ApiResponse<{ post: any }>>(
      `/collaboration/support-groups/posts/${postId}`
    );
  }

  async addComment(
    postId: string,
    commentData: {
      content: string;
      parentCommentId?: string;
      isAnonymous?: boolean;
    }
  ) {
    return this.request<ApiResponse<{ comments: any[] }>>(
      `/collaboration/support-groups/posts/${postId}/comments`,
      {
        method: "POST",
        body: JSON.stringify(commentData),
      }
    );
  }

  async togglePostLike(postId: string) {
    return this.request<ApiResponse<{ liked: boolean }>>(
      `/collaboration/support-groups/posts/${postId}/like`,
      {
        method: "POST",
      }
    );
  }

  async toggleCommentLike(commentId: string) {
    return this.request<ApiResponse<{ liked: boolean }>>(
      `/collaboration/support-groups/comments/${commentId}/like`,
      {
        method: "POST",
      }
    );
  }

  async getGroupResources(
    groupId: string,
    filters?: {
      resourceType?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const params = new URLSearchParams();
    if (filters?.resourceType)
      params.append("resourceType", filters.resourceType);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());
    return this.request<ApiResponse<{ resources: any[] }>>(
      `/collaboration/support-groups/${groupId}/resources${
        params.toString() ? `?${params.toString()}` : ""
      }`
    );
  }

  async getGroupChallenges(groupId: string) {
    return this.request<ApiResponse<{ challenges: any[] }>>(
      `/collaboration/support-groups/${groupId}/challenges`
    );
  }

  async joinChallenge(challengeId: string) {
    return this.request<ApiResponse<{ success: boolean }>>(
      `/collaboration/support-groups/challenges/${challengeId}/join`,
      {
        method: "POST",
      }
    );
  }

  async getGroupReferrals(
    groupId: string,
    filters?: {
      limit?: number;
      offset?: number;
    }
  ) {
    const params = new URLSearchParams();
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());
    return this.request<ApiResponse<{ referrals: any[] }>>(
      `/collaboration/support-groups/${groupId}/referrals${
        params.toString() ? `?${params.toString()}` : ""
      }`
    );
  }

  async generateAIContent(groupId: string, contentType: string, context?: any) {
    return this.request<ApiResponse<{ content: string }>>(
      `/collaboration/support-groups/${groupId}/generate-content`,
      {
        method: "POST",
        body: JSON.stringify({ contentType, context }),
      }
    );
  }

  async trackNetworkingImpact(impactData: {
    groupId: string;
    metricName: string;
    metricValue?: number;
    description?: string;
    relatedPostId?: string;
    relatedReferralId?: string;
    impactDate?: string;
  }) {
    return this.request<ApiResponse<{ success: boolean; impactId: string }>>(
      `/collaboration/support-groups/networking-impact`,
      {
        method: "POST",
        body: JSON.stringify(impactData),
      }
    );
  }

  async getUserNetworkingImpact() {
    return this.request<ApiResponse<{ impact: any[] }>>(
      `/collaboration/support-groups/networking-impact`
    );
  }

  async createSupportGroup(groupData: {
    name: string;
    description?: string;
    category: string;
    industry?: string;
    roleType?: string;
    interestTags?: string[];
    isPublic?: boolean;
  }) {
    return this.request<ApiResponse<{ group: any }>>(
      `/collaboration/support-groups/create`,
      {
        method: "POST",
        body: JSON.stringify(groupData),
      }
    );
  }

  async getGroupMembers(groupId: string) {
    return this.request<ApiResponse<{ members: any[] }>>(
      `/collaboration/support-groups/${groupId}/members`
    );
  }

  async getAbstractUserProfile(userId: string) {
    return this.request<ApiResponse<{ profile: any }>>(
      `/collaboration/support-groups/members/${userId}/profile`
    );
  }

  // Removed: Challenge and resource generation is now automatic in the background
  // async generateMonthlyChallenge(groupId: string) {
  //   return this.request<ApiResponse<{ challenge: any }>>(
  //     `/collaboration/support-groups/${groupId}/generate-challenge`,
  //     {
  //       method: "POST",
  //     }
  //   );
  // }

  async generateGroupResources(groupId: string, resourceType?: string) {
    return this.request<ApiResponse<{ resources: any[] }>>(
      `/collaboration/support-groups/${groupId}/generate-resources`,
      {
        method: "POST",
        body: JSON.stringify({ resourceType: resourceType || "general" }),
      }
    );
  }

  async updateThankYouNote(
    interviewId: string,
    noteId: string,
    data: { subject?: string; body?: string }
  ) {
    return this.request<ApiResponse<{ note: any }>>(
      `/interviews/${interviewId}/thank-you-notes/${noteId}`,
      {
      method: "PUT",
      body: JSON.stringify(data),
      }
    );
  }

  async updateContact(id: string, contactData: Partial<ContactInput>) {
    return this.request<
      ApiResponse<{ contact: ProfessionalContact; message: string }>
    >(`/network/contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify(contactData),
    });
  }

  async sendThankYouNote(interviewId: string, noteId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/interviews/${interviewId}/thank-you-notes/${noteId}/send`,
      {
      method: "POST",
      }
    );
  }

  // Follow-up endpoints
  async getFollowUpActions(interviewId: string) {
    return this.request<ApiResponse<{ followUps: any[] }>>(
      `/interviews/${interviewId}/follow-ups`
    );
  }

  async getPendingFollowUps() {
    return this.request<ApiResponse<{ followUps: any[] }>>(
      "/follow-ups/pending"
    );
  }

  async getAllFollowUps() {
    return this.request<ApiResponse<{ followUps: any[] }>>("/follow-ups/all");
  }

  async getFollowUpEmailDraft(interviewId: string, actionId: string) {
    return this.request<
      ApiResponse<{
        draft: { subject: string; body: string; generatedBy?: string };
      }>
    >(`/interviews/${interviewId}/follow-ups/${actionId}/draft`);
  }

  async completeFollowUpAction(interviewId: string, actionId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/interviews/${interviewId}/follow-ups/${actionId}/complete`,
      {
        method: "POST",
      }
    );
  }

  async createFollowUpAction(
    interviewId: string,
    data: { actionType: string; dueDate?: string; notes?: string }
  ) {
    return this.request<ApiResponse<{ followUp: any }>>(
      `/interviews/${interviewId}/follow-ups`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  // ========== Salary Negotiation Methods ==========

  async createSalaryNegotiation(data: SalaryNegotiationInput) {
    return this.request<
      ApiResponse<{ negotiation: SalaryNegotiation; message: string }>
    >("/salary-negotiations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getSalaryNegotiations(filters?: {
    status?: string;
    outcome?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.outcome) queryParams.append("outcome", filters.outcome);
    if (filters?.limit) queryParams.append("limit", filters.limit.toString());
    if (filters?.offset)
      queryParams.append("offset", filters.offset.toString());

    const query = queryParams.toString();
    return this.request<ApiResponse<{ negotiations: SalaryNegotiation[] }>>(
      `/salary-negotiations${query ? `?${query}` : ""}`
    );
  }

  async getSalaryNegotiation(id: string) {
    return this.request<ApiResponse<{ negotiation: SalaryNegotiation }>>(
      `/salary-negotiations/${id}`
    );
  }

  async getSalaryNegotiationByJob(jobOpportunityId: string) {
    return this.request<ApiResponse<{ negotiation: SalaryNegotiation | null }>>(
      `/salary-negotiations/job/${jobOpportunityId}`
    );
  }

  async updateSalaryNegotiation(id: string, updates: SalaryNegotiationUpdate) {
    return this.request<
      ApiResponse<{ negotiation: SalaryNegotiation; message: string }>
    >(`/salary-negotiations/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async addCounteroffer(id: string, counterofferData: CounterofferInput) {
    return this.request<
      ApiResponse<{ negotiation: SalaryNegotiation; message: string }>
    >(`/salary-negotiations/${id}/counteroffer`, {
      method: "POST",
      body: JSON.stringify(counterofferData),
    });
  }

  async completeNegotiation(id: string, outcomeData: NegotiationOutcomeInput) {
    return this.request<
      ApiResponse<{ negotiation: SalaryNegotiation; message: string }>
    >(`/salary-negotiations/${id}/complete`, {
      method: "PUT",
      body: JSON.stringify(outcomeData),
    });
  }

  async getMarketResearch(
    id: string,
    params?: {
      role?: string;
      location?: string;
      experienceLevel?: number;
      industry?: string;
    }
  ) {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.append("role", params.role);
    if (params?.location) queryParams.append("location", params.location);
    if (params?.experienceLevel)
      queryParams.append("experienceLevel", params.experienceLevel.toString());
    if (params?.industry) queryParams.append("industry", params.industry);

    const query = queryParams.toString();
    return this.request<ApiResponse<{ marketData: MarketSalaryData }>>(
      `/salary-negotiations/${id}/market-research${query ? `?${query}` : ""}`
    );
  }

  async triggerMarketResearch(id: string, data: MarketResearchInput) {
    return this.request<
      ApiResponse<{ marketData: MarketSalaryData; message: string }>
    >(`/salary-negotiations/${id}/market-research`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getTalkingPoints(id: string) {
    return this.request<ApiResponse<{ talkingPoints: TalkingPoint[] }>>(
      `/salary-negotiations/${id}/talking-points`
    );
  }

  async generateTalkingPoints(id: string, regenerate?: boolean) {
    return this.request<
      ApiResponse<{ talkingPoints: TalkingPoint[]; message: string }>
    >(`/salary-negotiations/${id}/talking-points`, {
      method: "POST",
      body: JSON.stringify({ regenerate: regenerate || false }),
    });
  }

  async getNegotiationScript(id: string, scenario: string) {
    return this.request<ApiResponse<{ script: NegotiationScript }>>(
      `/salary-negotiations/${id}/scripts/${scenario}`
    );
  }

  async generateNegotiationScript(
    id: string,
    scenario: string,
    regenerate?: boolean
  ) {
    return this.request<
      ApiResponse<{ script: NegotiationScript; message: string }>
    >(`/salary-negotiations/${id}/scripts/${scenario}`, {
      method: "POST",
      body: JSON.stringify({ regenerate: regenerate || false }),
    });
  }

  async evaluateCounteroffer(id: string, counterofferData: CounterofferInput) {
    return this.request<ApiResponse<{ evaluation: CounterofferEvaluation }>>(
      `/salary-negotiations/${id}/evaluate-counteroffer`,
      {
        method: "POST",
        body: JSON.stringify(counterofferData),
      }
    );
  }

  async getTimingStrategy(id: string) {
    return this.request<ApiResponse<{ strategy: TimingStrategy }>>(
      `/salary-negotiations/${id}/timing-strategy`
    );
  }

  async getSalaryProgressionHistory() {
    return this.request<ApiResponse<{ progression: SalaryProgressionEntry[] }>>(
      "/salary-negotiations/progression/history"
    );
  }

  async addSalaryProgressionEntry(
    data: Omit<SalaryProgressionEntry, "id" | "createdAt">
  ) {
    return this.request<
      ApiResponse<{ entry: SalaryProgressionEntry; message: string }>
    >("/salary-negotiations/progression/entry", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteSalaryProgressionEntry(entryId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/salary-negotiations/progression/entry/${entryId}`,
      {
        method: "DELETE",
      }
    );
  }

  // Competitive Analysis
  async getCompetitiveAnalysis() {
    return this.request<ApiResponse<{ analysis: any }>>(
      "/competitive-analysis"
    );
  }

  // Pattern Recognition Analytics
  async getPatternRecognitionAnalysis(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);

    const queryString = params.toString();
    return this.request<ApiResponse<{ analysis: any }>>(
      `/analytics/pattern-recognition${queryString ? `?${queryString}` : ""}`
    );
  }

  async predictJobSuccess(opportunityData: any) {
    return this.request<ApiResponse<{ prediction: any }>>(
      "/analytics/predict-success",
      {
        method: "POST",
        body: JSON.stringify(opportunityData),
      }
    );
  }

  async getPreparationCorrelation(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);

    const queryString = params.toString();
    return this.request<ApiResponse<any>>(
      `/analytics/preparation-correlation${
        queryString ? `?${queryString}` : ""
      }`
    );
  }

  async getTimingPatterns(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);

    const queryString = params.toString();
    return this.request<ApiResponse<{ patterns: any[] }>>(
      `/analytics/timing-patterns${queryString ? `?${queryString}` : ""}`
    );
  }

  // AI Preparation Analysis (replaces flawed statistical version)
  async getAIPreparationAnalysis(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);

    const queryString = params.toString();
    return this.request<any>(
      `/analytics/ai-preparation-analysis${
        queryString ? `?${queryString}` : ""
      }`
    );
  }

  async deleteContact(id: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/network/contacts/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  // ============================================
  // Writing Practice API Methods
  // ============================================

  // Practice Sessions
  async createWritingSession(data: WritingPracticeSessionInput) {
    return this.request<
      ApiResponse<{ session: WritingPracticeSession; message: string }>
    >("/writing-practice/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getWritingSessions(filters?: {
    sessionType?: string;
    isCompleted?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.sessionType) params.append("sessionType", filters.sessionType);
    if (filters?.isCompleted !== undefined)
      params.append("isCompleted", filters.isCompleted.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());
    if (filters?.orderBy) params.append("orderBy", filters.orderBy);
    if (filters?.orderDirection)
      params.append("orderDirection", filters.orderDirection);

    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<ApiResponse<{ sessions: WritingPracticeSession[] }>>(
      `/writing-practice/sessions${query}`
    );
  }

  async getWritingSessionById(id: string) {
    return this.request<ApiResponse<{ session: WritingPracticeSession }>>(
      `/writing-practice/sessions/${id}`
    );
  }

  async updateWritingSession(id: string, data: WritingPracticeSessionUpdate) {
    return this.request<
      ApiResponse<{ session: WritingPracticeSession; message: string }>
    >(`/writing-practice/sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteWritingSession(id: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/writing-practice/sessions/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  async getContactsNeedingReminder() {
    return this.request<ApiResponse<{ contacts: ProfessionalContact[] }>>(
      "/network/contacts/reminders"
    );
  }

  async checkContactByEmail(email: string) {
    return this.request<
      ApiResponse<{ exists: boolean; contact: ProfessionalContact | null }>
    >(`/network/contacts/check-email?email=${encodeURIComponent(email)}`);
  }

  async getContactInteractions(contactId: string) {
    return this.request<ApiResponse<{ interactions: ContactInteraction[] }>>(
      `/network/contacts/${contactId}/interactions`
    );
  }

  async addContactInteraction(
    contactId: string,
    interactionData: ContactInteractionInput
  ) {
    return this.request<
      ApiResponse<{ interaction: ContactInteraction; message: string }>
    >(`/network/contacts/${contactId}/interactions`, {
      method: "POST",
      body: JSON.stringify(interactionData),
    });
  }

  // Networking Events endpoints
  async getNetworkingEvents(filters?: {
    industry?: string;
    attended?: boolean;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters?.industry) queryParams.append("industry", filters.industry);
    if (filters?.attended !== undefined)
      queryParams.append("attended", String(filters.attended));
    if (filters?.startDate) queryParams.append("startDate", filters.startDate);
    if (filters?.endDate) queryParams.append("endDate", filters.endDate);
    if (filters?.search) queryParams.append("search", filters.search);

    const query = queryParams.toString();
    return this.request<ApiResponse<{ events: NetworkingEvent[] }>>(
      `/network/events${query ? `?${query}` : ""}`
    );
  }

  async getNetworkingEvent(id: string) {
    return this.request<ApiResponse<{ event: NetworkingEvent }>>(
      `/network/events/${id}`
    );
  }

  async createNetworkingEvent(eventData: NetworkingEventInput) {
    return this.request<
      ApiResponse<{ event: NetworkingEvent; message: string }>
    >("/network/events", {
      method: "POST",
      body: JSON.stringify(eventData),
    });
  }

  async updateNetworkingEvent(
    id: string,
    eventData: Partial<NetworkingEventInput>
  ) {
    return this.request<
      ApiResponse<{ event: NetworkingEvent; message: string }>
    >(`/network/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(eventData),
    });
  }

  async deleteNetworkingEvent(id: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/network/events/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  async registerForEvent(eventId: string) {
    return this.request<
      ApiResponse<{
        registration: any;
        message: string;
        alreadyRegistered?: boolean;
      }>
    >(`/network/events/${eventId}/register`, {
      method: "POST",
    });
  }

  async unregisterFromEvent(eventId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/network/events/${eventId}/register`,
      {
        method: "DELETE",
      }
    );
  }

  async getEventAttendees(eventId: string) {
    return this.request<ApiResponse<{ attendees: EventAttendee[] }>>(
      `/network/events/${eventId}/attendees`
    );
  }

  async getEventGoals(eventId: string) {
    return this.request<ApiResponse<{ goals: EventGoals | null }>>(
      `/network/events/${eventId}/goals`
    );
  }

  async upsertEventGoals(eventId: string, goalsData: EventGoalsInput) {
    return this.request<ApiResponse<{ goals: EventGoals; message: string }>>(
      `/network/events/${eventId}/goals`,
      {
        method: "POST",
        body: JSON.stringify(goalsData),
      }
    );
  }

  async getWritingSessionStats(
    id: string,
    dateRange?: { startDate?: string; endDate?: string }
  ) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<ApiResponse<{ stats: SessionStats }>>(
      `/writing-practice/sessions/${id}/stats${query}`
    );
  }

  // Feedback
  async generateWritingFeedback(id: string, forceRegenerate?: boolean) {
    return this.request<
      ApiResponse<{ feedback: WritingFeedback; message: string }>
    >(`/writing-practice/sessions/${id}/feedback`, {
      method: "POST",
      body: JSON.stringify({ forceRegenerate: forceRegenerate || false }),
    });
  }

  async getWritingFeedback(id: string) {
    return this.request<ApiResponse<{ feedback: WritingFeedback }>>(
      `/writing-practice/sessions/${id}/feedback`
    );
  }

  async compareWritingSessions(sessionId1: string, sessionId2: string) {
    return this.request<ApiResponse<{ comparison: SessionComparison }>>(
      "/writing-practice/compare",
      {
        method: "POST",
        body: JSON.stringify({ sessionId1, sessionId2 }),
      }
    );
  }

  async getWritingFeedbackHistory(limit?: number) {
    const params = limit ? `?limit=${limit}` : "";
    return this.request<
      ApiResponse<{
        history: Array<
          WritingFeedback & { prompt: string; sessionType: string }
        >;
      }>
    >(`/writing-practice/feedback/history${params}`);
  }

  // Prompts
  async getWritingPrompts(filters?: {
    category?: string;
    difficulty?: string;
    isActive?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append("category", filters.category);
    if (filters?.difficulty) params.append("difficulty", filters.difficulty);
    if (filters?.isActive !== undefined)
      params.append("isActive", filters.isActive.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<ApiResponse<{ prompts: WritingPrompt[] }>>(
      `/writing-practice/prompts${query}`
    );
  }

  async getRandomWritingPrompt(category?: string, difficulty?: string) {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (difficulty) params.append("difficulty", difficulty);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<ApiResponse<{ prompt: WritingPrompt }>>(
      `/writing-practice/prompts/random${query}`
    );
  }

  async getWritingPromptsForInterview(jobId: string) {
    return this.request<ApiResponse<{ prompts: WritingPrompt[] }>>(
      `/writing-practice/prompts/interview/${jobId}`
    );
  }

  async createCustomPrompt(data: CustomPromptInput) {
    return this.request<
      ApiResponse<{ prompt: WritingPrompt; message: string }>
    >("/writing-practice/prompts/custom", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Progress
  async getWritingProgress(dateRange?: {
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<ApiResponse<{ metrics: ProgressMetrics }>>(
      `/writing-practice/progress${query}`
    );
  }

  async getWritingProgressTrend(metric?: string, period?: string) {
    const params = new URLSearchParams();
    if (metric) params.append("metric", metric);
    if (period) params.append("period", period);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<ApiResponse<{ trend: ProgressTrend[] }>>(
      `/writing-practice/progress/trend${query}`
    );
  }

  async getWritingProgressInsights() {
    return this.request<ApiResponse<{ insights: ProgressInsights }>>(
      "/writing-practice/progress/insights"
    );
  }

  // Nerves Management
  async getNervesExercises(sessionId?: string) {
    const params = sessionId ? `?sessionId=${sessionId}` : "";
    return this.request<ApiResponse<{ exercises: NervesExercise[] }>>(
      `/writing-practice/nerves/exercises${params}`
    );
  }

  async completeNervesExercise(data: CompleteExerciseInput) {
    return this.request<
      ApiResponse<{ exercise: CompletedNervesExercise; message: string }>
    >("/writing-practice/nerves/exercises/complete", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getNervesExerciseHistory(limit?: number) {
    const params = limit ? `?limit=${limit}` : "";
    return this.request<ApiResponse<{ history: CompletedNervesExercise[] }>>(
      `/writing-practice/nerves/history${params}`
    );
  }

  async generatePreparationChecklist(jobId: string) {
    return this.request<ApiResponse<{ checklist: PreparationChecklist }>>(
      `/writing-practice/nerves/checklist/${jobId}`
    );
  }

  // Interview Predictions
  async getInterviewPrediction(jobOpportunityId: string) {
    return this.request<ApiResponse<{ prediction: InterviewPrediction }>>(
      `/interview-predictions/${jobOpportunityId}`
    );
  }

  async calculateInterviewPrediction(jobOpportunityId: string) {
    return this.request<ApiResponse<{ prediction: InterviewPrediction }>>(
      `/interview-predictions/${jobOpportunityId}/calculate`,
      {
        method: "POST",
      }
    );
  }

  async compareInterviewPredictions(jobOpportunityIds: string[]) {
    const opportunities = jobOpportunityIds.join(",");
    return this.request<
      ApiResponse<{
        predictions: PredictionComparison[];
        insights?: {
          insights: Array<{
            type: string;
            title: string;
            prompt: string;
            priority: "high" | "medium" | "low";
          }>;
          summary: string;
          generatedAt?: string;
          generatedBy?: string;
        } | null;
      }>
    >(`/interview-predictions/compare?opportunities=${opportunities}`);
  }

  async updatePredictionOutcome(
    jobOpportunityId: string,
    outcome: "accepted" | "rejected" | "pending" | "withdrawn" | "no_response",
    outcomeDate?: string
  ) {
    return this.request<ApiResponse<{ prediction: InterviewPrediction }>>(
      `/interview-predictions/${jobOpportunityId}/outcome`,
      {
        method: "PUT",
        body: JSON.stringify({ outcome, outcomeDate }),
      }
    );
  }

  async getPredictionAccuracyMetrics() {
    return this.request<ApiResponse<{ metrics: PredictionAccuracyMetrics }>>(
      "/interview-predictions/accuracy/metrics"
    );
  }

  async recalculateAllPredictions() {
    return this.request<ApiResponse<{ predictions: InterviewPrediction[] }>>(
      "/interview-predictions/recalculate-all",
      {
        method: "POST",
      }
    );
  }

  async getUpcomingEvents() {
    return this.request<ApiResponse<{ events: NetworkingEvent[] }>>(
      "/network/events/upcoming"
    );
  }

  async getEventConnections(eventId: string) {
    return this.request<ApiResponse<{ connections: EventConnection[] }>>(
      `/network/events/${eventId}/connections`
    );
  }

  async addEventConnection(
    eventId: string,
    connectionData: EventConnectionInput
  ) {
    return this.request<
      ApiResponse<{ connection: EventConnection; message: string }>
    >(`/network/events/${eventId}/connections`, {
      method: "POST",
      body: JSON.stringify(connectionData),
    });
  }

  // Referral Requests endpoints
  async getReferralRequests(filters?: {
    status?: string;
    contactId?: string;
    jobId?: string;
    followupRequired?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.contactId) queryParams.append("contactId", filters.contactId);
    if (filters?.jobId) queryParams.append("jobId", filters.jobId);
    if (filters?.followupRequired !== undefined)
      queryParams.append("followupRequired", String(filters.followupRequired));

    const query = queryParams.toString();
    return this.request<ApiResponse<{ referrals: ReferralRequest[] }>>(
      `/network/referrals${query ? `?${query}` : ""}`
    );
  }

  async getReferralRequest(id: string) {
    return this.request<ApiResponse<{ referral: ReferralRequest }>>(
      `/network/referrals/${id}`
    );
  }

  async createReferralRequest(referralData: ReferralRequestInput) {
    return this.request<
      ApiResponse<{ referral: ReferralRequest; message: string }>
    >("/network/referrals", {
      method: "POST",
      body: JSON.stringify(referralData),
    });
  }

  async updateReferralRequest(
    id: string,
    referralData: Partial<ReferralRequestInput>
  ) {
    return this.request<
      ApiResponse<{ referral: ReferralRequest; message: string }>
    >(`/network/referrals/${id}`, {
      method: "PUT",
      body: JSON.stringify(referralData),
    });
  }

  async deleteReferralRequest(id: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/network/referrals/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  async getReferralRequestsNeedingFollowup() {
    return this.request<ApiResponse<{ referrals: ReferralRequest[] }>>(
      "/network/referrals/followup"
    );
  }

  async getReferralTemplates() {
    return this.request<ApiResponse<{ templates: ReferralTemplate[] }>>(
      "/network/referrals/templates"
    );
  }

  async getReferralRecommendationTemplates() {
    return this.request<ApiResponse<{ templates: ReferralTemplate[] }>>(
      "/network/referrals/templates/recommendations"
    );
  }

  // Create referral request template with AI (for "Ask for Referrals" tab)
  async createReferralRequestTemplateWithAI(options?: {
    templateName?: string;
    tone?: string;
    length?: string;
    jobId?: string;
    jobTitle?: string;
    jobCompany?: string;
    jobLocation?: string;
    jobIndustry?: string;
  }) {
    return this.request<
      ApiResponse<{ template: ReferralTemplate; message: string }>
    >("/network/referrals/templates/ai", {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  }

  // Create referral recommendation template with AI (for "Write Referrals" tab)
  async createReferralTemplateWithAI(options?: {
    templateName?: string;
    tone?: string;
    length?: string;
  }) {
    return this.request<
      ApiResponse<{ template: ReferralTemplate; message: string }>
    >("/network/referrals/templates/recommendations/ai", {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  }

  async createReferralTemplate(templateData: {
    templateName?: string;
    templateBody?: string;
    etiquetteGuidance?: string;
    timingGuidance?: string;
  }) {
    return this.request<
      ApiResponse<{ template: ReferralTemplate; message: string }>
    >("/network/referrals/templates", {
      method: "POST",
      body: JSON.stringify(templateData),
    });
  }

  async deleteReferralTemplate(id: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/network/referrals/templates/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  async generateReferralMessage(payload: {
    contactId: string;
    jobId: string;
    templateBody?: string | null;
    templateId?: string;
    tone?: string;
  }) {
    return this.request<ApiResponse<{ message: string }>>(
      "/network/referrals/personalize",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  async generateReferralLetter(payload: {
    templateId: string;
    referralRequestId: string;
  }) {
    return this.request<ApiResponse<{ message: string }>>(
      "/network/referrals/generate-letter",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  async saveDraftReferralLetter(payload: {
    referralRequestId: string;
    letterContent: string;
  }) {
    return this.request<
      ApiResponse<{ referral: ReferralRequest; message: string }>
    >("/network/referrals/save-draft-letter", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async submitReferralLetter(payload: {
    referralRequestId: string;
    letterContent?: string;
  }) {
    return this.request<
      ApiResponse<{ referral: ReferralRequest; message: string }>
    >("/network/referrals/submit-letter", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getReferralRequestsToWrite() {
    return this.request<ApiResponse<{ referrals: ReferralRequest[] }>>(
      "/network/referrals/to-write"
    );
  }

  async getReferralTemplatePreview(templateId: string) {
    return this.request<ApiResponse<{ template: ReferralTemplate }>>(
      `/network/referrals/templates/${templateId}/preview`
    );
  }

  // Discover networking events from external APIs
  async discoverNetworkingEvents(filters?: {
    location?: string;
    industry?: string;
    query?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (filters?.location) queryParams.append("location", filters.location);
    if (filters?.industry) queryParams.append("industry", filters.industry);
    if (filters?.query) queryParams.append("query", filters.query);
    if (filters?.startDate) queryParams.append("startDate", filters.startDate);
    if (filters?.endDate) queryParams.append("endDate", filters.endDate);
    if (filters?.limit) queryParams.append("limit", String(filters.limit));

    const query = queryParams.toString();
    return this.request<
      ApiResponse<{
        events: DiscoveredEvent[];
        pagination?: any;
        message?: string;
      }>
    >(`/network/events/discover${query ? `?${query}` : ""}`);
  }

  // Networking Goals
  async getNetworkingGoals() {
    return this.request<ApiResponse<{ goals: NetworkingGoal[] }>>(
      "/network/goals"
    );
  }

  async createNetworkingGoal(goalData: NetworkingGoalInput) {
    return this.request<ApiResponse<{ goal: NetworkingGoal; message: string }>>(
      "/network/goals",
      {
        method: "POST",
        body: JSON.stringify(goalData),
      }
    );
  }

  async getNetworkingGoal(id: string) {
    return this.request<ApiResponse<{ goal: NetworkingGoal }>>(
      `/network/goals/${id}`
    );
  }

  async updateNetworkingGoal(
    id: string,
    goalData: Partial<NetworkingGoalInput>
  ) {
    return this.request<ApiResponse<{ goal: NetworkingGoal; message: string }>>(
      `/network/goals/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(goalData),
      }
    );
  }

  async deleteNetworkingGoal(id: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/network/goals/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  async incrementGoalProgress(id: string, increment: number = 1) {
    return this.request<ApiResponse<{ goal: NetworkingGoal; message: string }>>(
      `/network/goals/${id}/increment`,
      {
        method: "POST",
        body: JSON.stringify({ increment }),
      }
    );
  }

  // GitHub Integration
  async getGitHubStatus() {
    return this.request<ApiResponse<{ connected: boolean; username: string | null }>>(
      "/github/status"
    );
  }

  async connectGitHub(accessToken: string, username: string, refreshToken?: string, expiresAt?: string) {
    return this.request<ApiResponse<{ message: string; profile: any }>>(
      "/github/connect",
      {
        method: "POST",
        body: JSON.stringify({ accessToken, username, refreshToken, expiresAt }),
      }
    );
  }

  async disconnectGitHub() {
    return this.request<ApiResponse<{ message: string }>>(
      "/github/disconnect",
      {
        method: "DELETE",
      }
    );
  }

  async getGitHubRepositories() {
    return this.request<ApiResponse<{ repositories: any[] }>>(
      "/github/repositories"
    );
  }

  async importGitHubRepositories(includePrivate: boolean = false) {
    return this.request<ApiResponse<{ message: string; imported: number; updated: number; skipped: number }>>(
      "/github/repositories/import",
      {
        method: "POST",
        body: JSON.stringify({ includePrivate }),
      }
    );
  }

  async syncGitHubRepositories() {
    return this.request<ApiResponse<{ message: string; synced: number }>>(
      "/github/repositories/sync",
      {
        method: "POST",
      }
    );
  }

  async addGitHubRepositoryToProjects(repositoryId: string) {
    return this.request<ApiResponse<{ project: any; message: string; skillsAdded: number; skillsSkipped: number }>>(
      `/github/repositories/${repositoryId}/add-to-projects`,
      {
        method: "POST",
      }
    );
  }

  async setGitHubRepositoryFeatured(repositoryId: string, isFeatured: boolean) {
    return this.request<ApiResponse<{ repository: any; message: string }>>(
      `/github/repositories/${repositoryId}/featured`,
      {
        method: "PUT",
        body: JSON.stringify({ isFeatured }),
      }
    );
  }

  async getGitHubRepositoryContributions(repositoryId: string) {
    return this.request<ApiResponse<{ contributions: any[]; statistics: any; count: number }>>(
      `/github/repositories/${repositoryId}/contributions`
    );
  }

  async getGitHubRepositoryStatistics() {
    return this.request<ApiResponse<{ statistics: any }>>(
      "/github/repositories/statistics"
    );
  }

  async linkGitHubRepositoryToSkills(repositoryId: string, skillIds: string[]) {
    return this.request<ApiResponse<{ message: string }>>(
      `/github/repositories/${repositoryId}/skills`,
      {
        method: "POST",
        body: JSON.stringify({ skillIds }),
      }
    );
  }

  // Gmail Integration
  async getGmailAuthUrl() {
    return this.request<ApiResponse<{ authUrl: string }>>("/gmail/auth/url");
  }

  async getGmailStatus() {
    return this.request<ApiResponse<{ status: { connected: boolean; email?: string; lastSync?: string } }>>(
      "/gmail/status"
    );
  }

  async disconnectGmail() {
    return this.request<ApiResponse<{ message: string }>>("/gmail/disconnect", {
      method: "POST",
    });
  }

  async searchGmailEmails(query: string, maxResults: number = 50) {
    return this.request<ApiResponse<{ emails: any[] }>>(
      `/gmail/search?query=${encodeURIComponent(query)}&maxResults=${maxResults}`
    );
  }

  async getRecentGmailEmails(days: number = 30, maxResults: number = 50) {
    return this.request<ApiResponse<{ emails: any[] }>>(
      `/gmail/recent?days=${days}&maxResults=${maxResults}`
    );
  }

  async searchGmailEmailsByKeywords(keywords: string, maxResults: number = 50) {
    return this.request<ApiResponse<{ emails: any[] }>>(
      `/gmail/search/keywords?keywords=${encodeURIComponent(keywords)}&maxResults=${maxResults}`
    );
  }

  async linkEmailToJob(jobOpportunityId: string, gmailMessageId: string) {
    return this.request<ApiResponse<{ emailLink: any }>>("/gmail/link", {
      method: "POST",
      body: JSON.stringify({ jobOpportunityId, gmailMessageId }),
    });
  }

  async getLinkedEmails(jobOpportunityId: string) {
    return this.request<ApiResponse<{ emails: any[] }>>(
      `/gmail/linked/${jobOpportunityId}`
    );
  }

  async unlinkEmailFromJob(emailLinkId: string, jobOpportunityId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/gmail/unlink/${emailLinkId}`,
      {
        method: "DELETE",
        body: JSON.stringify({ jobOpportunityId }),
      }
    );
  }

  // ============================================
  // Follow-Up Reminders (UC-128)
  // ============================================
  async getFollowUpReminders(filters?: {
    status?: string;
    jobOpportunityId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.jobOpportunityId) params.append("jobOpportunityId", filters.jobOpportunityId);
    if (filters?.isActive !== undefined) params.append("isActive", String(filters.isActive));
    if (filters?.limit) params.append("limit", String(filters.limit));
    if (filters?.offset) params.append("offset", String(filters.offset));

    const queryString = params.toString();
    return this.request<ApiResponse<{ reminders: FollowUpReminder[] }>>(
      `/follow-up-reminders${queryString ? `?${queryString}` : ""}`
    );
  }

  async getPendingFollowUpReminders(limit?: number) {
    const params = new URLSearchParams();
    if (limit) params.append("limit", String(limit));
    const queryString = params.toString();
    return this.request<ApiResponse<{ reminders: FollowUpReminder[] }>>(
      `/follow-up-reminders/pending${queryString ? `?${queryString}` : ""}`
    );
  }

  async getFollowUpReminderById(id: string) {
    return this.request<ApiResponse<{ reminder: FollowUpReminder }>>(
      `/follow-up-reminders/${id}`
    );
  }

  async createFollowUpReminder(data: FollowUpReminderInput) {
    return this.request<ApiResponse<{ reminder: FollowUpReminder }>>(
      "/follow-up-reminders",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async completeFollowUpReminder(id: string, responseType?: ResponseType) {
    return this.request<ApiResponse<{ reminder: FollowUpReminder }>>(
      `/follow-up-reminders/${id}/complete`,
      {
        method: "PATCH",
        body: JSON.stringify({ responseType }),
      }
    );
  }

  async snoozeFollowUpReminder(id: string, days: number) {
    return this.request<ApiResponse<{ reminder: FollowUpReminder }>>(
      `/follow-up-reminders/${id}/snooze`,
      {
        method: "PATCH",
        body: JSON.stringify({ days }),
      }
    );
  }

  async dismissFollowUpReminder(id: string) {
    return this.request<ApiResponse<{ reminder: FollowUpReminder }>>(
      `/follow-up-reminders/${id}/dismiss`,
      {
        method: "PATCH",
      }
    );
  }

  async deleteFollowUpReminder(id: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/follow-up-reminders/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  async getFollowUpReminderEmailTemplate(id: string) {
    return this.request<ApiResponse<{ emailTemplate: { subject: string; body: string } }>>(
      `/follow-up-reminders/${id}/email-template`
    );
  }

  async getFollowUpEtiquetteTips(applicationStage: string, daysSinceLastContact?: number) {
    const params = new URLSearchParams();
    params.append("applicationStage", applicationStage);
    if (daysSinceLastContact !== undefined) {
      params.append("daysSinceLastContact", String(daysSinceLastContact));
    }
    return this.request<ApiResponse<{ tips: string[] }>>(
      `/follow-up-reminders/etiquette-tips?${params.toString()}`
    );
  }

  // ============================================================================
  // JOB OFFERS (UC-127: Offer Evaluation & Comparison Tool)
  // ============================================================================

  async createJobOffer(offerData: any) {
    return this.request<ApiResponse<any>>("/job-offers", {
      method: "POST",
      body: JSON.stringify(offerData),
    });
  }

  async getJobOffers(filters?: { offer_status?: string; negotiation_status?: string; company?: string }) {
    const queryParams = new URLSearchParams();
    if (filters?.offer_status) queryParams.append("offer_status", filters.offer_status);
    if (filters?.negotiation_status) queryParams.append("negotiation_status", filters.negotiation_status);
    if (filters?.company) queryParams.append("company", filters.company);
    
    const queryString = queryParams.toString();
    return this.request<ApiResponse<any[]>>(
      `/job-offers${queryString ? `?${queryString}` : ""}`
    );
  }

  async getJobOfferById(offerId: string) {
    return this.request<ApiResponse<any>>(`/job-offers/${offerId}`);
  }

  async updateJobOffer(offerId: string, updateData: any) {
    return this.request<ApiResponse<any>>(`/job-offers/${offerId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  async deleteJobOffer(offerId: string) {
    return this.request<ApiResponse<{ message: string }>>(`/job-offers/${offerId}`, {
      method: "DELETE",
    });
  }

  async acceptJobOffer(offerId: string) {
    return this.request<ApiResponse<any>>(`/job-offers/${offerId}/accept`, {
      method: "POST",
    });
  }

  async declineJobOffer(offerId: string, reason?: string) {
    return this.request<ApiResponse<any>>(`/job-offers/${offerId}/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async addOfferScenario(offerId: string, scenario: any) {
    return this.request<ApiResponse<any>>(`/job-offers/${offerId}/scenarios`, {
      method: "POST",
      body: JSON.stringify(scenario),
    });
  }

  async deleteOfferScenario(offerId: string, scenarioId: string) {
    return this.request<ApiResponse<any>>(`/job-offers/${offerId}/scenarios/${scenarioId}`, {
      method: "DELETE",
    });
  }

  async addOfferNegotiationEntry(offerId: string, entry: any) {
    return this.request<ApiResponse<any>>(`/job-offers/${offerId}/negotiation`, {
      method: "POST",
      body: JSON.stringify(entry),
    });
  }

  async generateOfferNegotiationRecommendations(offerId: string) {
    return this.request<ApiResponse<any[]>>(`/job-offers/${offerId}/negotiation/recommendations`);
  }

  async compareJobOffers(offerIds: string[], weights?: any) {
    return this.request<ApiResponse<any>>("/job-offers/compare", {
      method: "POST",
      body: JSON.stringify({ offer_ids: offerIds, weights }),
    });
  }

  async generateCareerSimulation(offerId: string, userPreferences?: any) {
    return this.request<ApiResponse<any>>(`/job-offers/${offerId}/career-simulation`, {
      method: "POST",
      body: JSON.stringify({ userPreferences }),
    });
  }

  async compareCareerPaths(offerIds: string[], userPreferences?: any) {
    return this.request<ApiResponse<any>>("/job-offers/career-comparison", {
      method: "POST",
      body: JSON.stringify({ offer_ids: offerIds, userPreferences }),
    });
  }
}

export const api = new ApiService();
