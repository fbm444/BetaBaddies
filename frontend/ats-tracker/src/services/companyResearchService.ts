import axios from 'axios';

// Use environment variable or fallback to relative path (for proxy)
const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/api/v1` : '/api/v1');

export interface CompanyInfo {
  id: string;
  jobId: string;
  size?: string;
  industry?: string;
  location?: string;
  website?: string;
  description?: string;
  companyLogo?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface CompanyMedia {
  id: string;
  companyId: string;
  platform: string;
  link?: string;
}

export interface CompanyNews {
  id: string;
  companyId: string;
  heading: string;
  description?: string;
  type: string;
  date?: string;
  source?: string;
}

export interface AISummary {
  mission?: string;
  culture?: string;
  products?: string[];
  competitors?: string[];
  recentDevelopments?: string;
  whyWorkHere?: string;
  interviewTips?: string;
}

export interface CompleteCompanyResearch {
  id: string;
  jobId: string;
  size?: string;
  industry?: string;
  location?: string;
  website?: string;
  description?: string;
  companyLogo?: string;
  contactEmail?: string;
  contactPhone?: string;
  media: CompanyMedia[];
  news: CompanyNews[];
  aiSummary?: AISummary;
}

export interface ResearchedCompany extends CompanyInfo {
  companyName: string;
  jobTitle: string;
}

export interface InterviewStage {
  stage: string;
  what_to_expect: string;
  duration: string | null;
}

export type InterviewQuestionCategory =
  | "behavioral"
  | "technical"
  | "system_design"
  | "product"
  | "culture"
  | "other";

export interface InterviewQuestion {
  question: string;
  category: InterviewQuestionCategory;
  why_asked: string;
}

export interface InterviewInterviewerProfile {
  role: string;
  focus: string;
  tips: string;
}

export interface InterviewInsights {
  process_overview: string;
  stages: InterviewStage[];
  timeline_expectations: string;
  interview_formats: string[];
  common_questions: InterviewQuestion[];
  interviewer_profiles: InterviewInterviewerProfile[];
  preparation_recommendations: string[];
  success_tips: string[];
  checklist: string[];
  additional_resources: string[];
}

export interface InterviewInsightsMetadata {
  companyName?: string;
  requestedRole?: string;
  generatedAt?: string | null;
  expiresAt?: string | null;
  source?: string;
  promptHash?: string | null;
  lastError?: string | null;
  fromCache?: boolean;
}

export interface InterviewInsightsResponse {
  interviewInsights: InterviewInsights;
  metadata: InterviewInsightsMetadata;
}

const companyResearchService = {
  // Trigger automated research for a job
  async fetchCompanyResearch(jobId: string): Promise<any> {
    const response = await axios.post(
      `${API_BASE}/company-research/fetch/${jobId}`,
      {},
      { withCredentials: true }
    );
    return response.data.data.research;
  },

  // Get all researched companies for the user
  async getResearchedCompanies(limit = 50, offset = 0): Promise<ResearchedCompany[]> {
    const response = await axios.get(`${API_BASE}/company-research`, {
      params: { limit, offset },
      withCredentials: true,
    });
    return response.data.data.companies;
  },

  // Get complete research for a specific job
  async getCompanyResearchByJobId(jobId: string): Promise<CompleteCompanyResearch> {
    const response = await axios.get(`${API_BASE}/company-research/job/${jobId}`, {
      withCredentials: true,
    });
    return response.data.data.research;
  },

  // Generate AI summary for a job's company research
  async generateAISummary(jobId: string): Promise<AISummary> {
    const response = await axios.get(`${API_BASE}/company-research/job/${jobId}/ai-summary`, {
      withCredentials: true,
    });
    return response.data.data.aiSummary;
  },

  async getInterviewInsights(
    jobId: string,
    options?: { roleTitle?: string; refresh?: boolean }
  ): Promise<InterviewInsightsResponse> {
    const response = await axios.get(
      `${API_BASE}/company-research/job/${jobId}/interview-insights`,
      {
        params: {
          role: options?.roleTitle,
          refresh: options?.refresh ? "true" : undefined,
        },
        withCredentials: true,
      }
    );
    return response.data.data as InterviewInsightsResponse;
  },

  // Create or update company info
  async upsertCompanyInfo(jobId: string, companyData: Partial<CompanyInfo>): Promise<CompanyInfo> {
    const response = await axios.post(`${API_BASE}/company-research/job/${jobId}`, companyData, {
      withCredentials: true,
    });
    return response.data.data.companyInfo;
  },

  // Delete company research
  async deleteCompanyResearch(jobId: string): Promise<void> {
    await axios.delete(`${API_BASE}/company-research/job/${jobId}`, {
      withCredentials: true,
    });
  },

  // Add company media
  async addCompanyMedia(companyInfoId: string, platform: string, link: string): Promise<CompanyMedia> {
    const response = await axios.post(
      `${API_BASE}/company-research/${companyInfoId}/media`,
      { platform, link },
      { withCredentials: true }
    );
    return response.data.data.media;
  },

  // Get company media
  async getCompanyMedia(companyInfoId: string): Promise<CompanyMedia[]> {
    const response = await axios.get(`${API_BASE}/company-research/${companyInfoId}/media`, {
      withCredentials: true,
    });
    return response.data.data.media;
  },

  // Delete company media
  async deleteCompanyMedia(mediaId: string): Promise<void> {
    await axios.delete(`${API_BASE}/company-research/media/${mediaId}`, {
      withCredentials: true,
    });
  },

  // Add company news
  async addCompanyNews(
    companyInfoId: string,
    newsData: {
      heading: string;
      description?: string;
      type?: string;
      date?: string;
      source?: string;
    }
  ): Promise<CompanyNews> {
    const response = await axios.post(
      `${API_BASE}/company-research/${companyInfoId}/news`,
      newsData,
      { withCredentials: true }
    );
    return response.data.data.news;
  },

  // Get company news
  async getCompanyNews(companyInfoId: string, type?: string, limit = 20, offset = 0): Promise<CompanyNews[]> {
    const response = await axios.get(`${API_BASE}/company-research/${companyInfoId}/news`, {
      params: { type, limit, offset },
      withCredentials: true,
    });
    return response.data.data.news;
  },

  // Delete company news
  async deleteCompanyNews(newsId: string): Promise<void> {
    await axios.delete(`${API_BASE}/company-research/news/${newsId}`, {
      withCredentials: true,
    });
  },
};

export default companyResearchService;

