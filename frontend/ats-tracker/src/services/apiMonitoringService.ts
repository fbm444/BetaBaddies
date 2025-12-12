// API base URL
const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

// Types for API Monitoring
export interface ApiUsageStat {
  service_name: string;
  display_name: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_tokens_used: number;
  total_cost_usd: number;
  avg_response_time_ms: number;
}

export interface ApiQuota {
  service_name: string;
  display_name: string;
  period_type: string;
  requests_count: number;
  requests_limit: number;
  tokens_used: number;
  tokens_limit: number;
  cost_usd: number;
  cost_limit_usd: number;
  remaining_requests: number;
  remaining_tokens: number;
  usage_percentage: number;
}

export interface ApiError {
  id: number;
  service_name: string;
  display_name: string;
  endpoint: string;
  error_code: string;
  error_message: string;
  error_details: any;
  created_at: string;
}

export interface ApiAlert {
  id: number;
  service_name: string;
  display_name: string;
  alert_type: string;
  severity: string;
  message: string;
  threshold_value: number;
  current_value: number;
  is_resolved: boolean;
  created_at: string;
}

export interface ResponseTimeMetric {
  service_name: string;
  display_name: string;
  endpoint: string;
  avg_response_time: number;
  p50_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  min_response_time: number;
  max_response_time: number;
  request_count: number;
}

export interface WeeklyReport {
  id: number;
  service_name: string;
  display_name: string;
  report_week_start: string;
  report_week_end: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_tokens_used: number;
  total_cost_usd: number;
  avg_response_time_ms: number;
  error_count: number;
  rate_limit_hits: number;
}

export interface DashboardSummary {
  stats: ApiUsageStat[];
  quotas: ApiQuota[];
  recentErrors: ApiError[];
  activeAlerts: ApiAlert[];
  summary: {
    totalServices: number;
    totalRequests: number;
    totalErrors: number;
    activeAlertsCount: number;
    period: {
      type: string;
      startDate: string | null;
      endDate: string | null;
    };
  };
}

/**
 * API Monitoring Service
 * Provides methods to interact with the API monitoring endpoints
 */
export const apiMonitoringService = {
  /**
   * Helper to make API requests
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
      throw new Error(error.error?.message || "Request failed");
    }

    return response.json();
  },

  /**
   * Get dashboard summary
   * @param period - 'all_time', 'last_7_days', 'last_30_days', or 'last_90_days'
   */
  async getDashboard(period: string = "all_time"): Promise<DashboardSummary> {
    const params = new URLSearchParams();
    params.append("period", period);
    
    const response = await this.request<{ ok: boolean; data: DashboardSummary }>(
      `/admin/api-monitoring/dashboard?${params.toString()}`,
      {
        method: "GET",
      }
    );
    return response.data;
  },

  /**
   * Get usage statistics
   */
  async getUsageStats(
    serviceName?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiUsageStat[]> {
    const params = new URLSearchParams();
    if (serviceName) params.append("serviceName", serviceName);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await this.request<{ ok: boolean; data: { stats: ApiUsageStat[] } }>(
      `/admin/api-monitoring/stats?${params.toString()}`,
      {
        method: "GET",
      }
    );
    return response.data.stats;
  },

  /**
   * Get quotas
   */
  async getQuotas(serviceName?: string, periodType: string = "all"): Promise<ApiQuota[]> {
    const params = new URLSearchParams();
    if (serviceName) params.append("serviceName", serviceName);
    params.append("periodType", periodType);

    const response = await this.request<{ ok: boolean; data: { quotas: ApiQuota[] } }>(
      `/admin/api-monitoring/quotas?${params.toString()}`,
      {
        method: "GET",
      }
    );
    const quotas = response.data.quotas;
    return Array.isArray(quotas) ? quotas : quotas ? [quotas] : [];
  },

  /**
   * Get recent errors
   */
  async getRecentErrors(serviceName?: string, limit: number = 50): Promise<ApiError[]> {
    const params = new URLSearchParams();
    if (serviceName) params.append("serviceName", serviceName);
    params.append("limit", limit.toString());

    const response = await this.request<{ ok: boolean; data: { errors: ApiError[] } }>(
      `/admin/api-monitoring/errors?${params.toString()}`,
      {
        method: "GET",
      }
    );
    return response.data.errors;
  },

  /**
   * Get active alerts
   */
  async getActiveAlerts(serviceName?: string): Promise<ApiAlert[]> {
    const params = new URLSearchParams();
    if (serviceName) params.append("serviceName", serviceName);

    const response = await this.request<{ ok: boolean; data: { alerts: ApiAlert[] } }>(
      `/admin/api-monitoring/alerts?${params.toString()}`,
      {
        method: "GET",
      }
    );
    return response.data.alerts;
  },

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: number): Promise<void> {
    await this.request(`/admin/api-monitoring/alerts/${alertId}/resolve`, {
      method: "PATCH",
    });
  },

  /**
   * Get response times
   */
  async getResponseTimes(
    serviceName?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 1000
  ): Promise<ResponseTimeMetric[]> {
    const params = new URLSearchParams();
    if (serviceName) params.append("serviceName", serviceName);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("limit", limit.toString());

    const response = await this.request<{ ok: boolean; data: { metrics: ResponseTimeMetric[] } }>(
      `/admin/api-monitoring/response-times?${params.toString()}`,
      {
        method: "GET",
      }
    );
    return response.data.metrics;
  },

  /**
   * Get weekly reports
   */
  async getWeeklyReports(serviceName?: string, weeks: number = 4): Promise<WeeklyReport[]> {
    const params = new URLSearchParams();
    if (serviceName) params.append("serviceName", serviceName);
    params.append("weeks", weeks.toString());

    const response = await this.request<{ ok: boolean; data: { reports: WeeklyReport[] } }>(
      `/admin/api-monitoring/reports/weekly?${params.toString()}`,
      {
        method: "GET",
      }
    );
    return response.data.reports;
  },

  /**
   * Generate weekly report
   */
  async generateWeeklyReport(serviceName?: string): Promise<WeeklyReport[]> {
    const response = await this.request<{ ok: boolean; data: { reports: WeeklyReport[] } }>(
      "/admin/api-monitoring/reports/weekly",
      {
        method: "POST",
        body: JSON.stringify({ serviceName }),
      }
    );
    return response.data.reports;
  },
};

