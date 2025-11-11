import {
  ApiResponse,
  CoverLetter,
  CoverLetterTemplate,
  CoverLetterInput,
  AIGeneration,
  PerformanceRecord,
  PerformanceMetrics,
  ExperienceHighlighting,
  CompanyResearch,
} from "../types";

// In development, use proxy (relative path). In production, use env variable or full URL
const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";
const COVER_LETTER_API_BASE = `${API_BASE}/coverletter`;
const RATE_LIMIT_EVENT = "app:rate-limit-warning";
const COVER_LETTER_AI_ENDPOINT_KEYWORDS = [
  "/generate",
  "/research-company",
  "/highlight-experiences",
  "/ai/",
];

function shouldSurfaceCoverLetterRateLimit(endpoint: string): boolean {
  if (!endpoint) {
    return false;
  }
  const [path] = endpoint.split("?");
  return COVER_LETTER_AI_ENDPOINT_KEYWORDS.some((keyword) =>
    path.includes(keyword)
  );
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

class CoverLetterService {
  // Map backend cover letter format to frontend format
  private mapCoverLetterFromBackend(backendCoverLetter: any): CoverLetter {
    return {
      ...backendCoverLetter,
      name: backendCoverLetter.versionName || backendCoverLetter.name || "New Cover Letter",
      versionName: backendCoverLetter.versionName,
      // Ensure all fields are present with defaults
      content: backendCoverLetter.content || {
        greeting: "Dear Hiring Manager,",
        opening: "",
        body: [],
        closing: "",
        fullText: "",
      },
      toneSettings: backendCoverLetter.toneSettings || {
        tone: "formal",
        length: "standard",
      },
      customizations: backendCoverLetter.customizations || {},
      versionNumber: backendCoverLetter.versionNumber || 1,
      isMaster: backendCoverLetter.isMaster ?? false,
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${COVER_LETTER_API_BASE}${endpoint}`, {
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
      shouldSurfaceCoverLetterRateLimit(endpoint)
    ) {
      emitRateLimitWarning(endpoint, options.method || "GET", "cover-letter");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: "Request failed" },
      }));

      throw new ApiError(
        error.error?.message || "Request failed",
        response.status,
        error.error?.code,
        error.error?.detail
      );
    }

    return response.json();
  }

  // Template Management
  async getTemplates(
    industry?: string
  ): Promise<ApiResponse<{ templates: CoverLetterTemplate[]; count: number }>> {
    const params = industry ? `?industry=${industry}` : "";
    return this.request<
      ApiResponse<{ templates: CoverLetterTemplate[]; count: number }>
    >(`/templates${params}`);
  }

  async getTemplate(
    id: string
  ): Promise<ApiResponse<{ template: CoverLetterTemplate }>> {
    return this.request<ApiResponse<{ template: CoverLetterTemplate }>>(
      `/templates/${id}`
    );
  }

  async getTemplatePreview(id: string): Promise<string> {
    const response = await fetch(
      `${COVER_LETTER_API_BASE}/templates/${id}/preview`,
      {
        credentials: "include",
      }
    );
    if (!response.ok) throw new Error("Preview failed");
    return response.text();
  }

  async createTemplate(
    data: Partial<CoverLetterTemplate>
  ): Promise<ApiResponse<{ template: CoverLetterTemplate }>> {
    return this.request<ApiResponse<{ template: CoverLetterTemplate }>>(
      "/templates",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async updateTemplate(
    id: string,
    data: Partial<CoverLetterTemplate>
  ): Promise<ApiResponse<{ template: CoverLetterTemplate }>> {
    return this.request<ApiResponse<{ template: CoverLetterTemplate }>>(
      `/templates/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteTemplate(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(
      `/templates/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  async getTemplateAnalytics(
    id: string
  ): Promise<ApiResponse<{ analytics: any }>> {
    return this.request<ApiResponse<{ analytics: any }>>(
      `/templates/${id}/analytics`
    );
  }

  // Cover Letter Management
  async getCoverLetters(): Promise<ApiResponse<{ coverLetters: CoverLetter[] }>> {
    const response = await this.request<ApiResponse<{ coverLetters: any[] }>>(
      "/"
    );
    return {
      ...response,
      data: {
        ...response.data,
        coverLetters: response.data.coverLetters.map((cl) =>
          this.mapCoverLetterFromBackend(cl)
        ),
      },
    };
  }

  async getCoverLetter(
    id: string
  ): Promise<ApiResponse<{ coverLetter: CoverLetter }>> {
    const response = await this.request<ApiResponse<{ coverLetter: any }>>(
      `/${id}`
    );
    return {
      ...response,
      data: {
        ...response.data,
        coverLetter: this.mapCoverLetterFromBackend(response.data.coverLetter),
      },
    };
  }

  async createCoverLetter(
    data: CoverLetterInput
  ): Promise<ApiResponse<{ coverLetter: CoverLetter }>> {
    // Map frontend format to backend format
    const backendData = {
      ...data,
      versionName: data.name || "New Cover Letter",
    };
    const response = await this.request<ApiResponse<{ coverLetter: any }>>(
      "/",
      {
        method: "POST",
        body: JSON.stringify(backendData),
      }
    );
    return {
      ...response,
      data: {
        ...response.data,
        coverLetter: this.mapCoverLetterFromBackend(response.data.coverLetter),
      },
    };
  }

  async updateCoverLetter(
    id: string,
    data: Partial<CoverLetterInput>
  ): Promise<ApiResponse<{ coverLetter: CoverLetter }>> {
    // Map frontend format to backend format
    const backendData: any = { ...data };
    if (data.name !== undefined) {
      backendData.versionName = data.name;
      delete backendData.name;
    }
    const response = await this.request<ApiResponse<{ coverLetter: any }>>(
      `/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(backendData),
      }
    );
    return {
      ...response,
      data: {
        ...response.data,
        coverLetter: this.mapCoverLetterFromBackend(response.data.coverLetter),
      },
    };
  }

  async deleteCoverLetter(
    id: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(
      `/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  async duplicateCoverLetter(
    id: string
  ): Promise<ApiResponse<{ coverLetter: CoverLetter }>> {
    const response = await this.request<ApiResponse<{ coverLetter: any }>>(
      `/${id}/duplicate`,
      {
        method: "POST",
      }
    );
    return {
      ...response,
      data: {
        ...response.data,
        coverLetter: this.mapCoverLetterFromBackend(response.data.coverLetter),
      },
    };
  }

  // AI Generation
  async generateContent(
    coverLetterId: string,
    options: {
      jobId?: string;
      tone?: string;
      length?: string;
      includeCompanyResearch?: boolean;
      highlightExperiences?: boolean;
    }
  ): Promise<
    ApiResponse<{
      content: any;
      variations: any[];
      companyResearch?: CompanyResearch;
      tone: string;
      length: string;
    }>
  > {
    return this.request<
      ApiResponse<{
        content: any;
        variations: any[];
        companyResearch?: CompanyResearch;
        tone: string;
        length: string;
      }>
    >(`/${coverLetterId}/generate`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  async researchCompany(
    coverLetterId: string,
    companyName: string
  ): Promise<ApiResponse<{ companyResearch: CompanyResearch }>> {
    return this.request<ApiResponse<{ companyResearch: CompanyResearch }>>(
      `/${coverLetterId}/research-company`,
      {
        method: "POST",
        body: JSON.stringify({ companyName }),
      }
    );
  }

  async highlightExperiences(
    coverLetterId: string,
    jobId: string
  ): Promise<ApiResponse<ExperienceHighlighting>> {
    return this.request<ApiResponse<ExperienceHighlighting>>(
      `/${coverLetterId}/highlight-experiences`,
      {
        method: "POST",
        body: JSON.stringify({ jobId }),
      }
    );
  }

  async getVariations(
    coverLetterId: string
  ): Promise<ApiResponse<{ variations: any[] }>> {
    return this.request<ApiResponse<{ variations: any[] }>>(
      `/${coverLetterId}/variations`
    );
  }

  // Export
  async exportPDF(
    coverLetterId: string,
    options?: { filename?: string; includeLetterhead?: boolean }
  ): Promise<{ blob: Blob; filename: string }> {
    const params = new URLSearchParams();
    if (options?.filename) params.append("filename", options.filename);
    if (options?.includeLetterhead)
      params.append("includeLetterhead", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(
      `${COVER_LETTER_API_BASE}/${coverLetterId}/export/pdf${query}`,
      {
        credentials: "include",
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: "Export failed" },
      }));
      throw new Error(error.error?.message || "Export failed");
    }
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = options?.filename || `cover_letter_${coverLetterId}.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    return { blob: await response.blob(), filename };
  }

  async exportDOCX(
    coverLetterId: string,
    options?: { filename?: string }
  ): Promise<{ blob: Blob; filename: string }> {
    const params = new URLSearchParams();
    if (options?.filename) params.append("filename", options.filename);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(
      `${COVER_LETTER_API_BASE}/${coverLetterId}/export/docx${query}`,
      {
        credentials: "include",
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: "Export failed" },
      }));
      throw new Error(error.error?.message || "Export failed");
    }
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = options?.filename || `cover_letter_${coverLetterId}.docx`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    return { blob: await response.blob(), filename };
  }

  async exportTXT(
    coverLetterId: string,
    options?: { filename?: string }
  ): Promise<{ blob: Blob; filename: string }> {
    const params = new URLSearchParams();
    if (options?.filename) params.append("filename", options.filename);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(
      `${COVER_LETTER_API_BASE}/${coverLetterId}/export/txt${query}`,
      {
        credentials: "include",
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: "Export failed" },
      }));
      throw new Error(error.error?.message || "Export failed");
    }
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = options?.filename || `cover_letter_${coverLetterId}.txt`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    return { blob: await response.blob(), filename };
  }

  async exportHTML(
    coverLetterId: string,
    options?: { filename?: string }
  ): Promise<{ blob: Blob; filename: string }> {
    const params = new URLSearchParams();
    if (options?.filename) params.append("filename", options.filename);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(
      `${COVER_LETTER_API_BASE}/${coverLetterId}/export/html${query}`,
      {
        credentials: "include",
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: "Export failed" },
      }));
      throw new Error(error.error?.message || "Export failed");
    }
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = options?.filename || `cover_letter_${coverLetterId}.html`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    return { blob: await response.blob(), filename };
  }

  // Helper to download blob
  downloadBlob(blob: Blob, filename: string) {
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 200);
    } catch (error) {
      console.error("Error downloading blob:", error);
      throw error;
    }
  }

  // Version Management
  async getVersions(
    coverLetterId: string
  ): Promise<ApiResponse<{ coverLetters: CoverLetter[] }>> {
    return this.request<ApiResponse<{ coverLetters: CoverLetter[] }>>(
      `/${coverLetterId}/versions`
    );
  }

  async getVersionHistory(
    coverLetterId: string
  ): Promise<
    ApiResponse<{
      history: Array<{
        id: string;
        versionName: string;
        versionNumber: number;
        description?: string;
        isMaster: boolean;
        createdAt: string;
        updatedAt: string;
      }>;
      count: number;
    }>
  > {
    return this.request<
      ApiResponse<{
        history: Array<{
          id: string;
          versionName: string;
          versionNumber: number;
          description?: string;
          isMaster: boolean;
          createdAt: string;
          updatedAt: string;
        }>;
        count: number;
      }>
    >(`/${coverLetterId}/version-history`);
  }

  // Performance Tracking
  async trackPerformance(
    coverLetterId: string,
    performanceData: {
      jobId?: string;
      applicationOutcome?: "interview" | "rejected" | "no_response" | "accepted";
      responseDate?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<{ performance: PerformanceRecord }>> {
    return this.request<ApiResponse<{ performance: PerformanceRecord }>>(
      `/${coverLetterId}/performance`,
      {
        method: "POST",
        body: JSON.stringify(performanceData),
      }
    );
  }

  async getPerformance(
    coverLetterId: string
  ): Promise<ApiResponse<{ records: PerformanceRecord[] }>> {
    return this.request<ApiResponse<{ records: PerformanceRecord[] }>>(
      `/${coverLetterId}/performance`
    );
  }

  async getPerformanceMetrics(
    coverLetterId: string
  ): Promise<ApiResponse<{ metrics: PerformanceMetrics }>> {
    return this.request<ApiResponse<{ metrics: PerformanceMetrics }>>(
      `/${coverLetterId}/performance/metrics`
    );
  }

  async getPerformanceRecords(
    coverLetterId: string
  ): Promise<ApiResponse<{ records: PerformanceRecord[] }>> {
    return this.request<ApiResponse<{ records: PerformanceRecord[] }>>(
      `/${coverLetterId}/performance/records`
    );
  }
}

export const coverLetterService = new CoverLetterService();

