import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
  apiMonitoringService,
  ApiUsageStat,
  ApiQuota,
  ApiError,
  ApiAlert,
  WeeklyReport,
  DashboardSummary,
} from "../services/apiMonitoringService";

export function ApiMonitoring() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "errors" | "alerts" | "reports"
  >("dashboard");
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [usageStats, setUsageStats] = useState<ApiUsageStat[]>([]);
  const [quotas, setQuotas] = useState<ApiQuota[]>([]);
  const [recentErrors, setRecentErrors] = useState<ApiError[]>([]);
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [selectedService, setSelectedService] = useState<string>("");
  const [statsPeriod, setStatsPeriod] = useState<string>("all_time"); // 'all_time', 'last_7_days', 'last_30_days', 'last_90_days'
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load initial data
  useEffect(() => {
    loadDashboard();
  }, []);

  // Load data when tab/filters change
  useEffect(() => {
    if (activeTab === "dashboard") {
      loadDashboard();
    } else if (activeTab === "errors") {
      loadErrors();
    } else if (activeTab === "alerts") {
      loadAlerts();
    } else if (activeTab === "reports") {
      loadWeeklyReports();
    }
    setLastUpdated(new Date());
  }, [activeTab, selectedService, statsPeriod, dateRange]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    let refreshInProgress = false;

    const refreshData = async () => {
      if (refreshInProgress) return;
      refreshInProgress = true;
      setIsRefreshing(true);
      try {
        if (activeTab === "dashboard") {
          const data = await apiMonitoringService.getDashboard(statsPeriod);
          setDashboard(data);
        } else if (activeTab === "errors") {
          const errors = await apiMonitoringService.getRecentErrors(
            selectedService || undefined,
            100
          );
          setRecentErrors(errors);
        } else if (activeTab === "alerts") {
          const alertData = await apiMonitoringService.getActiveAlerts(
            selectedService || undefined
          );
          setAlerts(alertData);
        } else if (activeTab === "reports") {
          const reports = await apiMonitoringService.getWeeklyReports(
            selectedService || undefined,
            4
          );
          setWeeklyReports(reports);
        }
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Auto-refresh error:", err);
      } finally {
        setIsRefreshing(false);
        refreshInProgress = false;
      }
    };

    const interval = setInterval(refreshData, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [
    autoRefresh,
    refreshInterval,
    activeTab,
    selectedService,
    statsPeriod,
    dateRange.start,
    dateRange.end,
  ]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiMonitoringService.getDashboard(statsPeriod);
      console.log(`Dashboard data loaded (period: ${statsPeriod}):`, data);
      setDashboard(data);
    } catch (err: any) {
      console.error("Failed to load dashboard:", err);
      // Check for 403 Forbidden (admin access required)
      if (err?.status === 403 || err?.message?.includes("Administrator access required") || err?.message?.includes("FORBIDDEN")) {
        setError("Administrator access required. This page is only available to administrators.");
      } else {
        setError(err.message || "Failed to load dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadErrors = async () => {
    try {
      const errors = await apiMonitoringService.getRecentErrors(
        selectedService || undefined,
        100
      );
      setRecentErrors(errors);
    } catch (err: any) {
      console.error("Failed to load errors:", err);
      if (err?.status === 403 || err?.message?.includes("Administrator access required") || err?.message?.includes("FORBIDDEN")) {
        setError("Administrator access required. This page is only available to administrators.");
      } else {
        setError(err.message || "Failed to load error logs");
      }
    }
  };

  const loadAlerts = async () => {
    try {
      const alertData = await apiMonitoringService.getActiveAlerts(
        selectedService || undefined
      );
      setAlerts(alertData);
    } catch (err: any) {
      console.error("Failed to load alerts:", err);
      if (err?.status === 403 || err?.message?.includes("Administrator access required") || err?.message?.includes("FORBIDDEN")) {
        setError("Administrator access required. This page is only available to administrators.");
      } else {
        setError(err.message || "Failed to load alerts");
      }
    }
  };

  const loadWeeklyReports = async () => {
    try {
      const reports = await apiMonitoringService.getWeeklyReports(
        selectedService || undefined,
        4
      );
      setWeeklyReports(reports);
    } catch (err: any) {
      console.error("Failed to load weekly reports:", err);
      if (err?.status === 403 || err?.message?.includes("Administrator access required") || err?.message?.includes("FORBIDDEN")) {
        setError("Administrator access required. This page is only available to administrators.");
      } else {
        setError(err.message || "Failed to load weekly reports");
      }
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      await apiMonitoringService.resolveAlert(alertId);
      await loadAlerts();
      if (activeTab === "dashboard") {
        await loadDashboard();
      }
    } catch (err: any) {
      console.error("Failed to resolve alert:", err);
      setError(err.message || "Failed to resolve alert");
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      const reports = await apiMonitoringService.generateWeeklyReport(
        selectedService || undefined
      );
      setWeeklyReports(reports);
    } catch (err: any) {
      console.error("Failed to generate report:", err);
      setError(err.message || "Failed to generate weekly report");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (activeTab === "dashboard") {
        await loadDashboard();
      } else if (activeTab === "errors") {
        await loadErrors();
      } else if (activeTab === "alerts") {
        await loadAlerts();
      } else if (activeTab === "reports") {
        await loadWeeklyReports();
      }
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icon icon="mingcute:loading-line" className="animate-spin text-4xl text-blue-700" />
          <p className="mt-4 text-slate-600">Loading API monitoring data...</p>
        </div>
      </div>
    );
  }

  // Show error message if there's an error (especially for 403/admin access)
  if (error && (error.includes("Administrator access required") || error.includes("FORBIDDEN"))) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <Icon icon="mingcute:shield-error-line" className="text-6xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Administrator Access Required</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <p className="text-sm text-slate-500">
            The API Monitoring page is only available to users with administrator privileges.
            Please contact your system administrator to request access.
          </p>
        </div>
      </div>
    );
  }

  if (!dashboard && !loading && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600">No dashboard data available. Please try refreshing.</p>
          <button
            onClick={loadDashboard}
            className="mt-4 px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">API Monitoring</h1>
          <p className="text-slate-600 mt-1">Monitor API usage, errors, and performance</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm text-slate-700">
              Auto-refresh
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="ml-2 px-2 py-1 border rounded text-sm"
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
              </select>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
          >
            <Icon
              icon="mingcute:refresh-line"
              className={isRefreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
          {lastUpdated && (
            <span className="text-sm text-slate-500">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-4">
          {[
            { id: "dashboard", label: "Dashboard", icon: "mingcute:home-line" },
            { id: "errors", label: "Errors", icon: "mingcute:alert-line" },
            { id: "alerts", label: "Alerts", icon: "mingcute:bell-line" },
            { id: "reports", label: "Reports", icon: "mingcute:file-line" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 border-b-2 transition ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 font-semibold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon icon={tab.icon} className="inline mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Service
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="">All Services</option>
            <option value="openai">OpenAI</option>
            <option value="abstract_api">Abstract API</option>
            <option value="newsapi">NewsAPI</option>
            <option value="bls">BLS API</option>
            <option value="gmail">Gmail API</option>
          </select>
        </div>
        {activeTab === "dashboard" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Stats Period
            </label>
            <select
              value={statsPeriod}
              onChange={(e) => setStatsPeriod(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="all_time">All Time</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
            </select>
          </div>
        )}
        {activeTab !== "dashboard" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border rounded"
              />
            </div>
          </>
        )}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === "dashboard" && dashboard && (() => {
          // Filter dashboard stats based on selected service
          const filteredStats = selectedService
            ? dashboard.stats.filter((stat) => stat.service_name === selectedService)
            : dashboard.stats;

          // Filter dashboard data based on date range if provided
          const filteredErrors = selectedService
            ? dashboard.recentErrors.filter((err) => err.service_name === selectedService)
            : dashboard.recentErrors;

          const filteredAlerts = selectedService
            ? dashboard.activeAlerts.filter((alert) => alert.service_name === selectedService)
            : dashboard.activeAlerts;

          // Recalculate summary based on filtered data
          const filteredSummary = {
            ...dashboard.summary,
            totalServices: filteredStats.length,
            totalRequests: filteredStats.reduce((sum, s) => sum + parseInt(s.total_requests || 0), 0),
            totalErrors: filteredErrors.length,
            activeAlertsCount: filteredAlerts.length,
          };

          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-sm text-blue-600">Total Services</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {filteredSummary.totalServices}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <div className="text-sm text-green-600">Total Requests</div>
                  <div className="text-2xl font-bold text-green-900">
                    {filteredSummary.totalRequests != null ? filteredSummary.totalRequests.toLocaleString() : "0"}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded">
                  <div className="text-sm text-red-600">Total Errors</div>
                  <div className="text-2xl font-bold text-red-900">
                    {filteredSummary.totalErrors}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded">
                  <div className="text-sm text-yellow-600">Active Alerts</div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {filteredSummary.activeAlertsCount}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Usage Statistics</h2>
                  <span className="text-sm text-slate-500">
                    {dashboard.summary.period.type === "all_time" 
                      ? "Showing all historical data" 
                      : dashboard.summary.period.startDate && dashboard.summary.period.endDate
                      ? `${new Date(dashboard.summary.period.startDate).toLocaleDateString()} - ${new Date(dashboard.summary.period.endDate).toLocaleDateString()}`
                      : dashboard.summary.period.type}
                  </span>
                </div>
                {filteredStats.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No usage statistics available for the selected period.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                            Service
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                            Requests
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                            Success Rate
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                            Tokens
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                            Cost
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                            Avg Response
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {filteredStats.map((stat) => (
                        <tr key={stat.service_name}>
                          <td className="px-4 py-3 whitespace-nowrap font-medium">
                            {stat.display_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {stat.total_requests != null ? stat.total_requests.toLocaleString() : "0"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {stat.total_requests != null && stat.total_requests > 0
                              ? (
                                  ((stat.successful_requests || 0) / stat.total_requests) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {stat.total_tokens_used?.toLocaleString() || "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            ${(() => {
                              const cost = stat.total_cost_usd != null
                                ? (typeof stat.total_cost_usd === 'number' 
                                    ? stat.total_cost_usd 
                                    : parseFloat(String(stat.total_cost_usd)) || 0)
                                : 0;
                              return cost.toFixed(4);
                            })()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {(() => {
                              const time = stat.avg_response_time_ms != null
                                ? (typeof stat.avg_response_time_ms === 'number' 
                                    ? stat.avg_response_time_ms 
                                    : parseFloat(String(stat.avg_response_time_ms)) || 0)
                                : 0;
                              return `${Math.round(time)}ms`;
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>

              {/* Quotas Section */}
              {dashboard.quotas && dashboard.quotas.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Quotas</h2>
                  <div className="space-y-6">
                    {(() => {
                      // Filter quotas based on selected service
                      const filteredQuotas = selectedService
                        ? dashboard.quotas.filter((q) => q.service_name === selectedService)
                        : dashboard.quotas;

                      if (filteredQuotas.length === 0) {
                        return (
                          <div className="text-center text-slate-500 py-8">
                            No quota information available.
                          </div>
                        );
                      }

                      // Group quotas by service
                      const quotasByService = new Map<string, { hourly?: ApiQuota; daily?: ApiQuota; monthly?: ApiQuota }>();
                      filteredQuotas.forEach((quota) => {
                        if (!quotasByService.has(quota.service_name)) {
                          quotasByService.set(quota.service_name, {});
                        }
                        const serviceQuotas = quotasByService.get(quota.service_name)!;
                        if (quota.period_type === "hourly") {
                          serviceQuotas.hourly = quota;
                        } else if (quota.period_type === "daily") {
                          serviceQuotas.daily = quota;
                        } else if (quota.period_type === "monthly") {
                          serviceQuotas.monthly = quota;
                        }
                      });

                      return Array.from(quotasByService.entries()).map(([serviceName, serviceQuotas]) => {
                        const hourly = serviceQuotas.hourly;
                        const daily = serviceQuotas.daily;
                        const monthly = serviceQuotas.monthly;
                        const displayName = hourly?.display_name || daily?.display_name || monthly?.display_name || serviceName;

                        return (
                          <div key={serviceName} className="border rounded p-3 bg-slate-50">
                            <div className="font-semibold mb-3 text-base">{displayName}</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Hourly Quota */}
                              {hourly ? (
                                <div className="bg-white rounded p-2.5 border">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-medium text-slate-700">Hourly</span>
                                    {hourly.requests_limit > 0 && hourly.usage_percentage >= 80 && (
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        hourly.usage_percentage >= 95
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                      }`}>
                                        {hourly.usage_percentage >= 95 ? "!" : "⚠"}
                                      </span>
                                    )}
                                    {hourly.requests_limit === 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                                        ∞
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-600">Used</span>
                                    <span className="font-semibold text-slate-900">
                                      {hourly.requests_count}{hourly.requests_limit > 0 ? `/${hourly.requests_limit}` : ""}
                                    </span>
                                  </div>
                                  {hourly.requests_limit > 0 ? (
                                    <>
                                      {hourly.remaining_requests !== null && hourly.remaining_requests < 50 && (
                                        <div className="text-[10px] text-slate-500 mb-1">
                                          {hourly.remaining_requests} left
                                        </div>
                                      )}
                                      <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                                        <div
                                          className={`h-2 rounded-full transition-all ${
                                            hourly.usage_percentage >= 95
                                              ? "bg-red-500"
                                              : hourly.usage_percentage >= 80
                                              ? "bg-yellow-500"
                                              : "bg-green-500"
                                          }`}
                                          style={{ width: `${Math.min(hourly.usage_percentage, 100)}%` }}
                                        />
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        {hourly.usage_percentage.toFixed(0)}%
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-[10px] text-blue-600 font-medium mt-1">
                                      Unlimited
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-white rounded p-2.5 border border-dashed border-slate-300">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-slate-400">Hourly</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                      N/A
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-1">
                                    Not tracked
                                  </div>
                                </div>
                              )}

                              {/* Daily Quota */}
                              {daily ? (
                                <div className="bg-white rounded p-2.5 border">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-medium text-slate-700">Daily</span>
                                    {daily.requests_limit > 0 && daily.usage_percentage >= 80 && (
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        daily.usage_percentage >= 95
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                      }`}>
                                        {daily.usage_percentage >= 95 ? "!" : "⚠"}
                                      </span>
                                    )}
                                    {daily.requests_limit === 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                                        ∞
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-600">Used</span>
                                    <span className="font-semibold text-slate-900">
                                      {daily.requests_count}{daily.requests_limit > 0 ? `/${daily.requests_limit}` : ""}
                                    </span>
                                  </div>
                                  {daily.requests_limit > 0 ? (
                                    <>
                                      {daily.remaining_requests !== null && daily.remaining_requests < 50 && (
                                        <div className="text-[10px] text-slate-500 mb-1">
                                          {daily.remaining_requests} left
                                        </div>
                                      )}
                                      <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                                        <div
                                          className={`h-2 rounded-full transition-all ${
                                            daily.usage_percentage >= 95
                                              ? "bg-red-500"
                                              : daily.usage_percentage >= 80
                                              ? "bg-yellow-500"
                                              : "bg-green-500"
                                          }`}
                                          style={{ width: `${Math.min(daily.usage_percentage, 100)}%` }}
                                        />
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        {daily.usage_percentage.toFixed(0)}%
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-[10px] text-blue-600 font-medium mt-1">
                                      Unlimited
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-white rounded p-2.5 border border-dashed border-slate-300">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-slate-400">Daily</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                      N/A
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-1">
                                    Not tracked
                                  </div>
                                </div>
                              )}

                              {/* Monthly Quota */}
                              {monthly ? (
                                <div className="bg-white rounded p-2.5 border">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-medium text-slate-700">Monthly</span>
                                    {monthly.requests_limit > 0 && monthly.usage_percentage >= 80 && (
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        monthly.usage_percentage >= 95
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                      }`}>
                                        {monthly.usage_percentage >= 95 ? "!" : "⚠"}
                                      </span>
                                    )}
                                    {monthly.requests_limit === 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                                        ∞
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-600">Used</span>
                                    <span className="font-semibold text-slate-900">
                                      {monthly.requests_count}{monthly.requests_limit > 0 ? `/${monthly.requests_limit}` : ""}
                                    </span>
                                  </div>
                                  {monthly.requests_limit > 0 ? (
                                    <>
                                      {monthly.remaining_requests !== null && monthly.remaining_requests < 100 && (
                                        <div className="text-[10px] text-slate-500 mb-1">
                                          {monthly.remaining_requests} left
                                        </div>
                                      )}
                                      <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                                        <div
                                          className={`h-2 rounded-full transition-all ${
                                            monthly.usage_percentage >= 95
                                              ? "bg-red-500"
                                              : monthly.usage_percentage >= 80
                                              ? "bg-yellow-500"
                                              : "bg-green-500"
                                          }`}
                                          style={{ width: `${Math.min(monthly.usage_percentage, 100)}%` }}
                                        />
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        {monthly.usage_percentage.toFixed(0)}%
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-[10px] text-blue-600 font-medium mt-1">
                                      Unlimited
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-white rounded p-2.5 border border-dashed border-slate-300">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-slate-400">Monthly</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                      N/A
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-1">
                                    Not tracked
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {filteredAlerts.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Active Alerts</h2>
                <div className="space-y-2">
                  {filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded border-l-4 ${
                        alert.severity === "critical"
                          ? "bg-red-50 border-red-500"
                          : alert.severity === "warning"
                          ? "bg-yellow-50 border-yellow-500"
                          : "bg-blue-50 border-blue-500"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{alert.display_name}</div>
                          <div className="text-sm mt-1">{alert.message}</div>
                        </div>
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="px-3 py-1 bg-white rounded text-sm hover:bg-slate-50"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {activeTab === "errors" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Errors</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Service
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Endpoint
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Error Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {recentErrors.map((err) => (
                    <tr key={err.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {new Date(err.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {err.display_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{err.endpoint}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                          {err.error_code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{err.error_message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "alerts" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Alerts</h2>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded border-l-4 ${
                    alert.severity === "critical"
                      ? "bg-red-50 border-red-500"
                      : alert.severity === "warning"
                      ? "bg-yellow-50 border-yellow-500"
                      : "bg-blue-50 border-blue-500"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{alert.display_name}</span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            alert.severity === "critical"
                              ? "bg-red-200 text-red-800"
                              : alert.severity === "warning"
                              ? "bg-yellow-200 text-yellow-800"
                              : "bg-blue-200 text-blue-800"
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <div className="text-sm text-slate-700 mb-2">{alert.message}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                    {!alert.is_resolved && (
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="px-3 py-1 bg-white rounded text-sm hover:bg-slate-50 ml-4"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-8 text-slate-500">No active alerts</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Weekly Reports</h2>
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50"
              >
                {generatingReport ? "Generating..." : "Generate Report"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Service
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Week
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Requests
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Success Rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Tokens
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Cost
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Avg Response
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {weeklyReports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-4 py-3 font-medium">{report.display_name}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(report.report_week_start).toLocaleDateString()} -{" "}
                        {new Date(report.report_week_end).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {report.total_requests != null ? report.total_requests.toLocaleString() : "0"}
                      </td>
                      <td className="px-4 py-3">
                        {report.total_requests != null && report.total_requests > 0
                          ? (
                              ((report.successful_requests || 0) / report.total_requests) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </td>
                      <td className="px-4 py-3">
                        {report.total_tokens_used != null ? report.total_tokens_used.toLocaleString() : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        ${report.total_cost_usd != null
                          ? (() => {
                              const cost = typeof report.total_cost_usd === 'number' 
                                ? report.total_cost_usd 
                                : parseFloat(String(report.total_cost_usd)) || 0;
                              return cost.toFixed(4);
                            })()
                          : "0.0000"}
                      </td>
                      <td className="px-4 py-3">
                        {report.avg_response_time_ms != null
                          ? (() => {
                              const time = typeof report.avg_response_time_ms === 'number' 
                                ? report.avg_response_time_ms 
                                : parseFloat(String(report.avg_response_time_ms)) || 0;
                              return time > 0 ? `${Math.round(time)}ms` : "N/A";
                            })()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

