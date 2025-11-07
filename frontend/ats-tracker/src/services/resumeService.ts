import { ApiResponse, Resume, ResumeTemplate, ResumeInput, AIGeneration, ValidationIssue, ResumeShare, ResumeFeedback } from "../types";

// In development, use proxy (relative path). In production, use env variable or full URL
const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

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

class ResumeService {
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
  async getTemplates(templateType?: string): Promise<ApiResponse<{ templates: ResumeTemplate[]; count: number }>> {
    const params = templateType ? `?templateType=${templateType}` : '';
    return this.request<ApiResponse<{ templates: ResumeTemplate[]; count: number }>>(`/resumes/templates${params}`);
  }

  async getTemplate(id: string): Promise<ApiResponse<{ template: ResumeTemplate }>> {
    return this.request<ApiResponse<{ template: ResumeTemplate }>>(`/resumes/templates/${id}`);
  }

  async getTemplatePreview(id: string): Promise<string> {
    const response = await fetch(`${API_BASE}/resumes/templates/${id}/preview`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Preview failed");
    return response.text();
  }

  async createTemplate(data: Partial<ResumeTemplate>): Promise<ApiResponse<{ template: ResumeTemplate }>> {
    return this.request<ApiResponse<{ template: ResumeTemplate }>>("/resumes/templates", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(id: string, data: Partial<ResumeTemplate>): Promise<ApiResponse<{ template: ResumeTemplate }>> {
    return this.request<ApiResponse<{ template: ResumeTemplate }>>(`/resumes/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(`/resumes/templates/${id}`, {
      method: "DELETE",
    });
  }

  // Resume Management
  async getResumes(): Promise<ApiResponse<{ resumes: Resume[] }>> {
    return this.request<ApiResponse<{ resumes: Resume[] }>>("/resumes");
  }

  async getResume(id: string): Promise<ApiResponse<{ resume: Resume }>> {
    return this.request<ApiResponse<{ resume: Resume }>>(`/resumes/${id}`);
  }

  async createResume(data: ResumeInput): Promise<ApiResponse<{ resume: Resume }>> {
    return this.request<ApiResponse<{ resume: Resume }>>("/resumes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateResume(id: string, data: Partial<ResumeInput>): Promise<ApiResponse<{ resume: Resume }>> {
    return this.request<ApiResponse<{ resume: Resume }>>(`/resumes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteResume(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(`/resumes/${id}`, {
      method: "DELETE",
    });
  }

  async duplicateResume(id: string): Promise<ApiResponse<{ resume: Resume }>> {
    return this.request<ApiResponse<{ resume: Resume }>>(`/resumes/${id}/duplicate`, {
      method: "POST",
    });
  }

  // AI Generation
  async generateAIContent(
    resumeId: string,
    jobId: string,
    type: 'content' | 'skills' | 'experience'
  ): Promise<ApiResponse<{ generation: AIGeneration }>> {
    return this.request<ApiResponse<{ generation: AIGeneration }>>(`/resumes/${resumeId}/ai/generate`, {
      method: "POST",
      body: JSON.stringify({ jobId, type }),
    });
  }

  async optimizeSkills(resumeId: string, jobId: string): Promise<ApiResponse<{ generation: AIGeneration }>> {
    return this.request<ApiResponse<{ generation: AIGeneration }>>(`/resumes/${resumeId}/ai/skills`, {
      method: "POST",
      body: JSON.stringify({ jobId }),
    });
  }

  async tailorExperience(resumeId: string, jobId: string): Promise<ApiResponse<{ generation: AIGeneration }>> {
    return this.request<ApiResponse<{ generation: AIGeneration }>>(`/resumes/${resumeId}/ai/experience`, {
      method: "POST",
      body: JSON.stringify({ jobId }),
    });
  }

  async getAIVariations(resumeId: string): Promise<ApiResponse<{ variations: AIGeneration[] }>> {
    return this.request<ApiResponse<{ variations: AIGeneration[] }>>(`/resumes/${resumeId}/ai/variations`);
  }

  async regenerateContent(resumeId: string, generationId: string): Promise<ApiResponse<{ generation: AIGeneration }>> {
    return this.request<ApiResponse<{ generation: AIGeneration }>>(`/resumes/${resumeId}/ai/regenerate`, {
      method: "POST",
      body: JSON.stringify({ generationId }),
    });
  }

  // Section Management
  async updateSections(resumeId: string, sections: any): Promise<ApiResponse<{ resume: Resume }>> {
    return this.request<ApiResponse<{ resume: Resume }>>(`/resumes/${resumeId}/sections`, {
      method: "PUT",
      body: JSON.stringify({ sections }),
    });
  }

  async reorderSections(resumeId: string, order: string[]): Promise<ApiResponse<{ resume: Resume }>> {
    return this.request<ApiResponse<{ resume: Resume }>>(`/resumes/${resumeId}/sections/reorder`, {
      method: "POST",
      body: JSON.stringify({ order }),
    });
  }

  // Section Presets
  async getSectionPresets(): Promise<ApiResponse<{ presets: Array<{ id: string; name: string; sectionConfig: any }>; count: number }>> {
    return this.request<ApiResponse<{ presets: Array<{ id: string; name: string; sectionConfig: any }>; count: number }>>(
      `/resumes/sections/presets`,
      {
        method: "GET",
      }
    );
  }

  async applySectionPreset(resumeId: string, presetId: string): Promise<ApiResponse<{ sectionConfig: any }>> {
    return this.request<ApiResponse<{ sectionConfig: any }>>(`/resumes/${resumeId}/sections/preset`, {
      method: "POST",
      body: JSON.stringify({ presetId }),
    });
  }

  async saveSectionPreset(presetName: string, sectionConfig: any): Promise<ApiResponse<{ preset: { id: string; name: string; sectionConfig: any } }>> {
    return this.request<ApiResponse<{ preset: { id: string; name: string; sectionConfig: any } }>>(`/resumes/sections/presets`, {
      method: "POST",
      body: JSON.stringify({ presetName, sectionConfig }),
    });
  }

  // Export
  async exportPDF(resumeId: string, options?: { filename?: string; watermark?: boolean }): Promise<Blob> {
    const params = new URLSearchParams();
    if (options?.filename) params.append('filename', options.filename);
    if (options?.watermark) params.append('watermark', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE}/resumes/${resumeId}/export/pdf${query}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Export failed");
    return response.blob();
  }

  async exportDOCX(resumeId: string, options?: { filename?: string }): Promise<Blob> {
    const params = new URLSearchParams();
    if (options?.filename) params.append('filename', options.filename);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE}/resumes/${resumeId}/export/docx${query}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Export failed");
    return response.blob();
  }

  async exportTXT(resumeId: string, options?: { filename?: string }): Promise<Blob> {
    const params = new URLSearchParams();
    if (options?.filename) params.append('filename', options.filename);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE}/resumes/${resumeId}/export/txt${query}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Export failed");
    return response.blob();
  }

  async exportHTML(resumeId: string, options?: { filename?: string; watermark?: boolean }): Promise<Blob> {
    const params = new URLSearchParams();
    if (options?.filename) params.append('filename', options.filename);
    if (options?.watermark) params.append('watermark', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE}/resumes/${resumeId}/export/html${query}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Export failed");
    return response.blob();
  }

  // Helper to download blob
  downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Validation
  async validateResume(resumeId: string): Promise<ApiResponse<{ issues: ValidationIssue[] }>> {
    return this.request<ApiResponse<{ issues: ValidationIssue[] }>>(`/resumes/${resumeId}/validate`, {
      method: "POST",
    });
  }

  async getValidationIssues(resumeId: string): Promise<ApiResponse<{ issues: ValidationIssue[] }>> {
    return this.request<ApiResponse<{ issues: ValidationIssue[] }>>(`/resumes/${resumeId}/validation-issues`);
  }

  // Sharing & Feedback
  async shareResume(resumeId: string, options: { accessLevel: 'view' | 'comment' | 'edit'; expiresAt?: string }): Promise<ApiResponse<{ share: ResumeShare }>> {
    return this.request<ApiResponse<{ share: ResumeShare }>>(`/resumes/${resumeId}/share`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  async getSharedResume(token: string): Promise<ApiResponse<{ resume: Resume }>> {
    return this.request<ApiResponse<{ resume: Resume }>>(`/resumes/shared/${token}`);
  }

  async addFeedback(token: string, feedback: { comment: string; sectionReference?: string }): Promise<ApiResponse<{ feedback: ResumeFeedback }>> {
    return this.request<ApiResponse<{ feedback: ResumeFeedback }>>(`/resumes/shared/${token}/feedback`, {
      method: "POST",
      body: JSON.stringify(feedback),
    });
  }

  async getFeedback(resumeId: string): Promise<ApiResponse<{ feedback: ResumeFeedback[] }>> {
    return this.request<ApiResponse<{ feedback: ResumeFeedback[] }>>(`/resumes/${resumeId}/feedback`);
  }

  async revokeShare(shareId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(`/resumes/shares/${shareId}`, {
      method: "DELETE",
    });
  }

  // Version Management
  async getVersions(resumeId: string): Promise<ApiResponse<{ resumes: Resume[] }>> {
    return this.request<ApiResponse<{ resumes: Resume[] }>>(`/resumes/${resumeId}/versions`);
  }

  async createVersion(resumeId: string, data: { versionName?: string; description?: string }): Promise<ApiResponse<{ resume: Resume }>> {
    return this.request<ApiResponse<{ resume: Resume }>>(`/resumes/${resumeId}/versions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async compareVersions(resumeId1: string, resumeId2: string): Promise<ApiResponse<{ comparison: any }>> {
    return this.request<ApiResponse<{ comparison: any }>>(`/resumes/${resumeId1}/compare?resumeId2=${resumeId2}`);
  }

  async mergeVersions(targetResumeId: string, sourceResumeId: string, fields?: string[]): Promise<ApiResponse<{ targetResume: Resume; sourceResume: Resume; mergedFields: string[] }>> {
    return this.request<ApiResponse<{ targetResume: Resume; sourceResume: Resume; mergedFields: string[] }>>(`/resumes/${targetResumeId}/merge`, {
      method: "POST",
      body: JSON.stringify({ sourceResumeId, fields }),
    });
  }

  async setMasterVersion(resumeId: string): Promise<ApiResponse<{ resume: Resume }>> {
    return this.request<ApiResponse<{ resume: Resume }>>(`/resumes/${resumeId}/set-master`, {
      method: "POST",
    });
  }

  async getVersionHistory(resumeId: string): Promise<ApiResponse<{ history: Array<{ id: string; versionName: string; versionNumber: number; description?: string; isMaster: boolean; createdAt: string; updatedAt: string }>; count: number }>> {
    return this.request<ApiResponse<{ history: Array<{ id: string; versionName: string; versionNumber: number; description?: string; isMaster: boolean; createdAt: string; updatedAt: string }>; count: number }>>(`/resumes/${resumeId}/version-history`);
  }

  // Parse/Import Resume
  async parseResume(file: File): Promise<ApiResponse<{ content: any }>> {
    const formData = new FormData();
    formData.append("resume", file);

    const response = await fetch(`${API_BASE}/resumes/parse`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

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
}

export const resumeService = new ResumeService();

