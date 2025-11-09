import { ApiResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

export interface ProspectiveJob {
  id: string;
  jobTitle: string;
  company: string;
  location?: string;
  description?: string;
  industry?: string;
  jobType?: string;
  salaryLow?: number;
  salaryHigh?: number;
  stage: string;
  dateAdded: string;
  jobUrl?: string;
  deadline?: string;
}

class ProspectiveJobService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: "Request failed" },
      }));

      throw new Error(
        error.error?.message || `Request failed with status ${response.status}`
      );
    }

    return response.json();
  }

  async getProspectiveJobs(): Promise<ApiResponse<{ jobs: ProspectiveJob[] }>> {
    return this.request<ApiResponse<{ jobs: ProspectiveJob[] }>>(
      "/prospective-jobs"
    );
  }

  async getProspectiveJobById(
    jobId: string
  ): Promise<ApiResponse<{ job: ProspectiveJob }>> {
    return this.request<ApiResponse<{ job: ProspectiveJob }>>(
      `/prospective-jobs/${jobId}`
    );
  }
}

export const prospectiveJobService = new ProspectiveJobService();

