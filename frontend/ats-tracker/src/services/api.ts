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

  async getJobOpportunity(id: string) {
    return this.request<ApiResponse<{ jobOpportunity: JobOpportunityData }>>(
      `/job-opportunities/${id}`
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
}

export const api = new ApiService();
