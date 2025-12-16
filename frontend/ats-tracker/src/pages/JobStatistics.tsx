import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import type { JobOpportunityStatistics } from "../types";
import { JOB_STATUSES, STATUS_COLORS, STATUS_BG_COLORS } from "../types";
import { exportStatisticsToCSV } from "../utils/csvExport";

export function JobStatistics() {
  const [statistics, setStatistics] = useState<JobOpportunityStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.getJobOpportunityStatistics();
        if (response.ok && response.data) {
          setStatistics(response.data);
        } else {
          setError("Failed to load statistics");
        }
      } catch (err: any) {
        console.error("Failed to fetch statistics:", err);
        setError(err.message || "Failed to load statistics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  const handleExportCSV = () => {
    if (statistics) {
      exportStatisticsToCSV(statistics);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-slate-600">Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !statistics) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <Icon icon="mingcute:alert-line" className="mx-auto text-red-600 mb-2" width={48} />
            <p className="text-red-800">{error || "Failed to load statistics"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Job Search Statistics</h1>
            <p className="text-slate-600">Track your progress and identify patterns</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2"
          >
            <Icon icon="mingcute:download-line" width={20} />
            Export to CSV
          </button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Icon icon="mingcute:briefcase-line" className="text-blue-600" width={24} />
              <h3 className="text-sm font-medium text-slate-600">Total Jobs</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{statistics.totalJobs}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Icon icon="mingcute:mail-line" className="text-green-600" width={24} />
              <h3 className="text-sm font-medium text-slate-600">Response Rate</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{statistics.responseRate}%</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Icon icon="mingcute:calendar-check-line" className="text-purple-600" width={24} />
              <h3 className="text-sm font-medium text-slate-600">Deadline Adherence</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {statistics.deadlineAdherence.percentage}%
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Icon icon="mingcute:time-line" className="text-amber-600" width={24} />
              <h3 className="text-sm font-medium text-slate-600">Avg. Time to Offer</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {statistics.timeToOffer.averageDays > 0
                ? `${statistics.timeToOffer.averageDays} days`
                : "N/A"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Jobs by Status</h2>
            <div className="space-y-4">
              {JOB_STATUSES.map((status) => {
                const count = statistics.statusCounts[status] || 0;
                const percentage =
                  statistics.totalJobs > 0
                    ? Math.round((count / statistics.totalJobs) * 100)
                    : 0;

                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[status] }}
                        />
                        <span className="text-sm font-medium text-slate-700">{status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-900">{count}</span>
                        <span className="text-sm text-slate-500 w-12 text-right">{percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: STATUS_COLORS[status],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Application Volume */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Monthly Application Volume</h2>
            <div className="h-64 flex items-end justify-between gap-2">
              {statistics.monthlyVolume.length > 0 ? (
                statistics.monthlyVolume.map((item, index) => {
                  const maxCount = Math.max(
                    ...statistics.monthlyVolume.map((v) => v.count),
                    1
                  );
                  const height = (item.count / maxCount) * 100;

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative w-full flex items-end justify-center" style={{ height: '200px' }}>
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-800"
                          style={{ height: `${height}%`, minHeight: item.count > 0 ? '4px' : '0' }}
                          title={`${item.count} applications in ${new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                        />
                      </div>
                      <span className="text-xs text-slate-600 transform -rotate-45 origin-top-left whitespace-nowrap">
                        {new Date(item.month).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-xs font-medium text-slate-900">{item.count}</span>
                    </div>
                  );
                })
              ) : (
                <div className="w-full text-center text-slate-500 py-12">
                  No application data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Deadline Adherence Details */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Deadline Adherence</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Total with Deadlines</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {statistics.deadlineAdherence.totalWithDeadlines}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Met Deadlines</span>
                  <span className="text-sm font-semibold text-green-600">
                    {statistics.deadlineAdherence.metDeadlines}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Overdue</span>
                  <span className="text-sm font-semibold text-red-600">
                    {statistics.deadlineAdherence.overdueCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Upcoming</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {statistics.deadlineAdherence.upcomingCount}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-900">Adherence Rate</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {statistics.deadlineAdherence.percentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Time-to-Offer Analytics */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Time-to-Offer Analytics</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Total Offers</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {statistics.timeToOffer.totalOffers}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Average Time</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {statistics.timeToOffer.averageDays > 0
                      ? `${statistics.timeToOffer.averageDays} days`
                      : "N/A"}
                  </span>
                </div>
              </div>
              {statistics.timeToOffer.totalOffers === 0 && (
                <div className="pt-4 text-sm text-slate-500 text-center">
                  No offers received yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Average Time in Stage */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Average Time in Each Stage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {JOB_STATUSES.map((status) => {
              const avgDays = statistics.averageTimeInStage[status] || 0;
              return (
                <div
                  key={status}
                  className="p-4 rounded-lg border border-slate-200"
                  style={{ borderLeftColor: STATUS_COLORS[status], borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[status] }}
                    />
                    <span className="text-sm font-medium text-slate-700">{status}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {avgDays > 0 ? `${avgDays} days` : "N/A"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

