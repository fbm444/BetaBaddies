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
} from "../types";
import {
  ProfessionalContact,
  ContactInput,
  ContactInteraction,
  ContactInteractionInput,
  DiscoveredContact,
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
  EventAttendee,
  EventGoals,
  EventGoalsInput,
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
    if (
      rateLimitStatus === "exceeded" &&
      shouldSurfaceAiRateLimit(endpoint)
    ) {
      emitRateLimitWarning(endpoint, options.method || "GET", "skill-gap-analysis");
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

  async register(email: string, password: string) {
    return this.request<
      ApiResponse<{ user: { id: string; email: string }; message: string }>
    >("/users/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  // User endpoints (authentication data only)
  async getUserAuth() {
    // NOTE: This endpoint only returns users table data (email, id)
    return this.request<
      ApiResponse<{
        user: {
          id: string;
          email: string;
          createdAt?: string;
          updatedAt?: string;
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
    if (filters?.deadlineFrom) params.append("deadlineFrom", filters.deadlineFrom);
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

  async getJobOpportunity(id: string) {
    return this.request<
      ApiResponse<{ jobOpportunity: JobOpportunityData }>
    >(`/job-opportunities/${id}`);
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

  async bulkUpdateJobOpportunityStatus(opportunityIds: string[], status: JobStatus) {
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
    return this.request<ApiResponse<{ jobOpportunity: JobOpportunityData; message: string }>>(
      `/job-opportunities/${id}/archive`,
      {
        method: "POST",
        body: JSON.stringify({ archiveReason }),
      }
    );
  }

  async unarchiveJobOpportunity(id: string) {
    return this.request<ApiResponse<{ jobOpportunity: JobOpportunityData; message: string }>>(
      `/job-opportunities/${id}/unarchive`,
      {
        method: "POST",
      }
    );
  }

  async sendDeadlineReminder(id: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/job-opportunities/${id}/send-deadline-reminder`,
      {
        method: "POST",
      }
    );
  }

  async bulkArchiveJobOpportunities(opportunityIds: string[], archiveReason?: string) {
    return this.request<ApiResponse<{ archivedOpportunities: JobOpportunityData[]; message: string }>>(
      "/job-opportunities/bulk-archive",
      {
        method: "POST",
        body: JSON.stringify({ opportunityIds, archiveReason }),
      }
    );
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
    return this.request<ApiResponse<{ jobOpportunities: JobOpportunityData[] }>>(
      `/job-opportunities/archived${queryString ? `?${queryString}` : ""}`
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
    return this.request<
      ApiResponse<{ interviews: InterviewData[] }>
    >(`/interviews${query ? `?${query}` : ""}`);
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

  async updatePreparationTask(
    interviewId: string,
    taskId: string,
    updateData: { completed?: boolean; task?: string; dueDate?: string }
  ) {
    return this.request<
      ApiResponse<{ task: any; message: string }>
    >(`/interviews/${interviewId}/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
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
    return this.request<
      ApiResponse<{ message: string }>
    >("/calendar/disconnect", {
      method: "POST",
    });
  }

  async syncInterviewToCalendar(interviewId: string) {
    return this.request<
      ApiResponse<{ event: any; message: string }>
    >(`/calendar/sync/interview/${interviewId}`, {
      method: "POST",
    });
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

  // Google Contacts import endpoints
  async getGoogleContactsStatus() {
    return this.request<
      ApiResponse<{
        status: GoogleContactsStatus;
      }>
    >("/network/google-contacts/status");
  }

  async getGoogleContactsAuthUrl() {
    return this.request<ApiResponse<{ authUrl: string }>>("/network/google-contacts/auth/url");
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
    return this.request<ApiResponse<{ message: string }>>("/network/google-contacts/disconnect", {
      method: "POST",
    });
  }

  async getExploreNetworkContacts(filters?: { degree?: "2nd" | "3rd"; search?: string }) {
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
    if (filters?.relationshipType) queryParams.append("relationshipType", filters.relationshipType);
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
    return this.request<ApiResponse<{ contact: ProfessionalContact; message: string }>>(
      "/network/contacts",
      {
        method: "POST",
        body: JSON.stringify(contactData),
      }
    );
  }

  async updateContact(id: string, contactData: Partial<ContactInput>) {
    return this.request<ApiResponse<{ contact: ProfessionalContact; message: string }>>(
      `/network/contacts/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(contactData),
      }
    );
  }

  async deleteContact(id: string) {
    return this.request<ApiResponse<{ message: string }>>(`/network/contacts/${id}`, {
      method: "DELETE",
    });
  }

  async getContactsNeedingReminder() {
    return this.request<ApiResponse<{ contacts: ProfessionalContact[] }>>(
      "/network/contacts/reminders"
    );
  }

  async checkContactByEmail(email: string) {
    return this.request<ApiResponse<{ exists: boolean; contact: ProfessionalContact | null }>>(
      `/network/contacts/check-email?email=${encodeURIComponent(email)}`
    );
  }

  async getContactInteractions(contactId: string) {
    return this.request<ApiResponse<{ interactions: ContactInteraction[] }>>(
      `/network/contacts/${contactId}/interactions`
    );
  }

  async addContactInteraction(contactId: string, interactionData: ContactInteractionInput) {
    return this.request<ApiResponse<{ interaction: ContactInteraction; message: string }>>(
      `/network/contacts/${contactId}/interactions`,
      {
        method: "POST",
        body: JSON.stringify(interactionData),
      }
    );
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
    if (filters?.attended !== undefined) queryParams.append("attended", String(filters.attended));
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
    return this.request<ApiResponse<{ event: NetworkingEvent; message: string }>>(
      "/network/events",
      {
        method: "POST",
        body: JSON.stringify(eventData),
      }
    );
  }

  async updateNetworkingEvent(id: string, eventData: Partial<NetworkingEventInput>) {
    return this.request<ApiResponse<{ event: NetworkingEvent; message: string }>>(
      `/network/events/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(eventData),
      }
    );
  }

  async deleteNetworkingEvent(id: string) {
    return this.request<ApiResponse<{ message: string }>>(`/network/events/${id}`, {
      method: "DELETE",
    });
  }

  async registerForEvent(eventId: string) {
    return this.request<ApiResponse<{ registration: any; message: string; alreadyRegistered?: boolean }>>(
      `/network/events/${eventId}/register`,
      {
        method: "POST",
      }
    );
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

  async addEventConnection(eventId: string, connectionData: EventConnectionInput) {
    return this.request<ApiResponse<{ connection: EventConnection; message: string }>>(
      `/network/events/${eventId}/connections`,
      {
        method: "POST",
        body: JSON.stringify(connectionData),
      }
    );
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
    return this.request<ApiResponse<{ referral: ReferralRequest; message: string }>>(
      "/network/referrals",
      {
        method: "POST",
        body: JSON.stringify(referralData),
      }
    );
  }

  async updateReferralRequest(id: string, referralData: Partial<ReferralRequestInput>) {
    return this.request<ApiResponse<{ referral: ReferralRequest; message: string }>>(
      `/network/referrals/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(referralData),
      }
    );
  }

  async deleteReferralRequest(id: string) {
    return this.request<ApiResponse<{ message: string }>>(`/network/referrals/${id}`, {
      method: "DELETE",
    });
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
    return this.request<ApiResponse<{ template: ReferralTemplate; message: string }>>(
      "/network/referrals/templates/ai",
      {
        method: "POST",
        body: JSON.stringify(options || {}),
      }
    );
  }

  // Create referral recommendation template with AI (for "Write Referrals" tab)
  async createReferralTemplateWithAI(options?: {
    templateName?: string;
    tone?: string;
    length?: string;
  }) {
    return this.request<ApiResponse<{ template: ReferralTemplate; message: string }>>(
      "/network/referrals/templates/recommendations/ai",
      {
        method: "POST",
        body: JSON.stringify(options || {}),
      }
    );
  }

  async createReferralTemplate(templateData: {
    templateName?: string;
    templateBody?: string;
    etiquetteGuidance?: string;
    timingGuidance?: string;
  }) {
    return this.request<ApiResponse<{ template: ReferralTemplate; message: string }>>(
      "/network/referrals/templates",
      {
        method: "POST",
        body: JSON.stringify(templateData),
      }
    );
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
    return this.request<ApiResponse<{ referral: ReferralRequest; message: string }>>(
      "/network/referrals/save-draft-letter",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  async submitReferralLetter(payload: {
    referralRequestId: string;
    letterContent?: string;
  }) {
    return this.request<ApiResponse<{ referral: ReferralRequest; message: string }>>(
      "/network/referrals/submit-letter",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
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
    return this.request<ApiResponse<{ events: DiscoveredEvent[]; pagination?: any; message?: string }>>(
      `/network/events/discover${query ? `?${query}` : ""}`
    );
  }

  // Networking Goals
  async getNetworkingGoals() {
    return this.request<ApiResponse<{ goals: NetworkingGoal[] }>>("/network/goals");
  }

  async createNetworkingGoal(goalData: NetworkingGoalInput) {
    return this.request<ApiResponse<{ goal: NetworkingGoal; message: string }>>("/network/goals", {
      method: "POST",
      body: JSON.stringify(goalData),
    });
  }

  async getNetworkingGoal(id: string) {
    return this.request<ApiResponse<{ goal: NetworkingGoal }>>(`/network/goals/${id}`);
  }

  async updateNetworkingGoal(id: string, goalData: Partial<NetworkingGoalInput>) {
    return this.request<ApiResponse<{ goal: NetworkingGoal; message: string }>>(`/network/goals/${id}`, {
      method: "PUT",
      body: JSON.stringify(goalData),
    });
  }

  async deleteNetworkingGoal(id: string) {
    return this.request<ApiResponse<{ message: string }>>(`/network/goals/${id}`, {
      method: "DELETE",
    });
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
}

export const api = new ApiService();
