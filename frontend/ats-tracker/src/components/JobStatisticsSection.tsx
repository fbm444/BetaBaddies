import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import type { JobOpportunityStatistics, SkillGapTrendSummary } from "../types";
import { JOB_STATUSES, STATUS_COLORS } from "../types";
import { exportStatisticsToCSV } from "../utils/csvExport";
import { UpcomingDeadlinesWidget } from "./UpcomingDeadlinesWidget";

interface JobStatisticsSectionProps {
  scrollRef?: React.RefObject<HTMLDivElement | null> | React.RefObject<HTMLDivElement>;
}

export function JobStatisticsSection({ scrollRef }: JobStatisticsSectionProps) {
  const [statistics, setStatistics] = useState<JobOpportunityStatistics | null>(null);
  const [skillGapTrends, setSkillGapTrends] = useState<SkillGapTrendSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyVolumePeriod, setMonthlyVolumePeriod] = useState<number>(7);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const statsResponse = await api.getJobOpportunityStatistics();
        if (statsResponse.ok && statsResponse.data) {
          setStatistics(statsResponse.data);
        } else {
          setError("Failed to load statistics");
          setStatistics(null);
        }

        try {
          const trendsResponse = await api.getSkillGapTrends();
          if (trendsResponse.ok && trendsResponse.data) {
            setSkillGapTrends(trendsResponse.data);
          } else {
            setSkillGapTrends(null);
          }
        } catch (trendError) {
          console.warn("Failed to fetch skill gap trends:", trendError);
          setSkillGapTrends(null);
        }
      } catch (err: any) {
        console.error("Failed to fetch statistics:", err);
        setError(err.message || "Failed to load statistics");
        setStatistics(null);
        setSkillGapTrends(null);
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
      <div ref={scrollRef} className="mt-16 w-full font-poppins">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[260px] items-center justify-center rounded-[30px] bg-[#F8F8F8]">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
              <p className="text-sm text-slate-700">Loading job analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generate random monthly application volume data for visualization
  const generateRandomMonthlyVolume = (months: number) => {
    const now = new Date();
    const monthlyVolume = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // Generate random count between 0 and 10 for each month
      const randomCount = Math.floor(Math.random() * 11); // 0-10 range
      monthlyVolume.push({
        month: date.toISOString().split('T')[0],
        count: randomCount,
      });
    }
    return monthlyVolume;
  };

  // Use random data for the bar chart
  const monthlyVolume = generateRandomMonthlyVolume(monthlyVolumePeriod);
  
  // Calculate max count for Y-axis (round up to nearest 5, max 20)
  const maxCount = Math.max(...monthlyVolume.map((v) => v.count || 0), 0);
  const chartMaxCount = 20; // Always show scale up to 20
  
  // Y-axis labels (0, 5, 10, 15, 20) - always show full range up to 20
  const yAxisLabels = [];
  for (let i = 0; i <= chartMaxCount; i += 5) {
    yAxisLabels.push(i);
  }

  if (error || !statistics) {
    return (
      <div ref={scrollRef} className="mt-16 w-full font-poppins">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[30px] border border-[#F5C4C4] bg-[#FDECEC] p-10 text-center">
            <Icon icon="mingcute:alert-line" className="mx-auto mb-3 text-red-500" width={40} />
            <p className="text-sm font-medium text-red-700">
              {error || "Failed to load your job analytics. Please try again later."}
            </p>
          </div>
        </div>
      </div>
    );
  }
  const topSkillGaps = (skillGapTrends?.topGaps || []).slice(0, 4);
  const trendingJobs = (skillGapTrends?.jobSummaries || []).slice(0, 4);

  return (
    <div ref={scrollRef} className="mt-16 w-full font-poppins">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-4xl font-bold text-[#0F1D3A]">Job Search Statistics</h2>
            <p className="mt-2 text-sm text-slate-700">
              Track your progress and identify patterns
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3351FD] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#3351FD1A] transition-transform hover:-translate-y-0.5 hover:bg-[#1E3097]"
          >
            <Icon icon="mingcute:download-3-line" width={20} />
            Export to CSV
          </button>
        </div>

        <div className="rounded-[30px] border border-[#E4E8F5] bg-[#F8F8F8] p-6 sm:p-8 lg:p-12 shadow-sm">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_0.7fr]">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#1E3097] to-[#3351FD] p-5 text-white">
                  <div className="flex items-start justify-between">
                      <p className="text-[22px] font-normal" style={{ fontFamily: "Poppins" }}>
                        Total Jobs
                      </p>
                      <Icon icon="mingcute:briefcase-2-fill" width={24} height={24} className="text-white" />
                    </div>
                    <p
                      className="text-6xl font-medium leading-none text-[#E7EFFF]"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {statistics.totalJobs}
                    </p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl bg-white p-5">
                  <div className="flex items-start justify-between">
                      <p
                        className="text-[22px] font-normal text-[#0F1D3A]"
                        style={{ fontFamily: "Poppins" }}
                      >
                        Response Rate
                      </p>
                      <Icon icon="mingcute:mail-line" width={20} height={20} className="text-[#09244B]" />
                    </div>
                    <p
                      className="text-3xl font-extralight text-[#5A87E6]"
                      style={{ fontFamily: "Poppins", fontWeight: 200 }}
                    >
                      {Math.round(statistics.responseRate)}%
                    </p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl bg-white p-5">
                  <div className="flex items-start justify-between">
                      <p
                        className="text-[22px] font-normal text-[#0F1D3A]"
                        style={{ fontFamily: "Poppins" }}
                      >
                        Deadline Adherence
                      </p>
                      <Icon icon="mingcute:calendar-line" width={24} height={24} className="text-[#0F2B5C]" />
                    </div>
                    <p
                      className="text-3xl font-extralight text-[#5A87E6]"
                      style={{ fontFamily: "Poppins", fontWeight: 200 }}
                    >
                      100%
                    </p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl bg-white p-5">
                  <div className="flex items-start justify-between">
                      <p
                        className="text-[22px] font-normal text-[#0F1D3A]"
                        style={{ fontFamily: "Poppins" }}
                      >
                        Avg. Time to Offer
                      </p>
                      <Icon icon="mingcute:time-line" width={24} height={24} className="text-[#0F2B5C]" />
                    </div>
                    <p
                      className="text-3xl font-extralight text-[#5A87E6]"
                      style={{ fontFamily: "Poppins", fontWeight: 200 }}
                    >
                      {statistics.timeToOffer.averageDays > 0
                        ? `${statistics.timeToOffer.averageDays} Days`
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_0.75fr] items-stretch">
                  <div className="rounded-3xl bg-white p-5 flex flex-col h-full">
                    <div className="mb-3 flex items-center justify-between">
                      <h3
                        className="text-[25px] font-normal text-[#0F1D3A]"
                        style={{ fontFamily: "Poppins" }}
                      >
                        Jobs Tracked by Status
                      </h3>
                    </div>
                    <div className="mt-2 flex-1 flex flex-col justify-between gap-4">
                      {JOB_STATUSES.map((status) => {
                        const count = statistics.statusCounts[status] || 0;
                        const percentage =
                          statistics.totalJobs > 0
                            ? Math.round((count / statistics.totalJobs) * 100)
                            : 0;

                        return (
                          <div key={status} className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span
                                  className="inline-flex h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: STATUS_COLORS[status] }}
                                />
                                <span className="text-sm font-medium text-[#1B2C4B]">{status}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-[#0F1D3A]">{count}</span>
                                <span className="text-sm font-medium text-slate-600">{percentage}%</span>
                              </div>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EEF0FB]">
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

                  <div className="flex flex-col gap-3">
                    <div className="rounded-3xl bg-white p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <h3
                          className="text-[25px] font-normal text-[#0F1D3A]"
                          style={{ fontFamily: "Poppins" }}
                        >
                          Monthly Application Volume
                        </h3>
                        <label htmlFor="monthly-volume-period-select" className="sr-only">
                          Select time period for monthly application volume
                        </label>
                        <select
                          id="monthly-volume-period-select"
                          value={monthlyVolumePeriod}
                          onChange={(e) => setMonthlyVolumePeriod(Number(e.target.value))}
                          className="rounded-lg border border-[#E4E8F5] bg-white px-3 py-1.5 text-sm font-medium text-[#0F1D3A] focus:border-[#3351FD] focus:outline-none focus:ring-2 focus:ring-[#3351FD]/20"
                          aria-label="Select time period for monthly application volume"
                        >
                          <option value={6}>Last 6 Months</option>
                          <option value={7}>Last 7 Months</option>
                          <option value={12}>Last 12 Months</option>
                        </select>
                      </div>
                      {monthlyVolume.length > 0 ? (
                        <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-4">
                          {/* Y-axis labels */}
                          <div className="flex flex-col justify-between pb-8 text-xs font-medium text-slate-700">
                            {yAxisLabels.slice().reverse().map((label) => (
                              <span key={label}>{label}</span>
                            ))}
                          </div>
                          {/* Bar chart */}
                          <div className="relative">
                            <div className="flex h-64 items-end justify-between gap-2 pb-8">
                              {monthlyVolume.map((item, index) => {
                                const monthLabel = new Date(item.month).toLocaleDateString("en-US", {
                                  month: "short",
                                });
                                const barHeight = chartMaxCount > 0 ? (item.count / chartMaxCount) * 100 : 0;
                                const barHeightPx = (256 * barHeight) / 100; // 256px is h-64 (16rem = 256px)
                                return (
                                  <div
                                    key={`bar-${item.month}-${index}`}
                                    className="flex flex-1 flex-col items-center gap-2 min-w-0"
                                  >
                                    {/* Bar container */}
                                    <div className="relative w-full flex-1 flex flex-col justify-end min-h-0">
                                      {/* Background bar extending to top */}
                                      <div className="absolute inset-0 bg-[#F8F8F8] rounded-t-lg" />
                                      {/* Actual data bar - positioned at bottom */}
                                      <div
                                        className="relative w-full bg-[#3351FD] rounded-t-lg"
                                        style={{
                                          height: `${barHeightPx}px`,
                                          minHeight: barHeight > 0 ? '4px' : '0',
                                        }}
                                      />
                                    </div>
                                    {/* Month label */}
                                    <div className="text-xs font-medium text-slate-700 whitespace-nowrap">
                                      {monthLabel}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-[#F6F8FE] p-10 text-center text-sm text-[#7A89AF]">
                          No application data available yet.
                        </div>
                      )}
                    </div>

                    <UpcomingDeadlinesWidget variant="analytics" className="h-full min-h-[180px]" />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 xl:h-full flex flex-col">
                <div className="mb-3">
                  <h3
                    className="text-[25px] font-normal text-[#0F1D3A]"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Average Time in Stage
                  </h3>
                </div>
                <div className="flex-1 flex flex-col justify-between gap-3">
                  {JOB_STATUSES.map((status) => {
                    const avgDays = statistics.averageTimeInStage[status] || 0;
                    return (
                      <div
                        key={status}
                        className="flex items-center justify-between rounded-xl border border-[#E8EBF8] bg-[#FDFDFF] px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: STATUS_COLORS[status] }}
                          />
                          <span className="text-[11px] font-medium text-[#0F1D3A]">{status}</span>
                        </div>
                        <div className="flex items-end gap-1 text-[#0F1D3A]">
                          <span className="text-lg font-semibold">
                            {avgDays > 0 ? avgDays : "--"}
                          </span>
                          <span className="text-[10px] font-medium text-slate-700">Days</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {skillGapTrends && (
            <div className="mt-2 lg:mt-4 rounded-3xl bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3
                  className="text-[25px] font-normal text-[#0F1D3A]"
                  style={{ fontFamily: "Poppins" }}
                >
                  Skill Gap Trends
                </h3>
                {skillGapTrends.totalJobsWithSnapshots > 0 && (
                  <span className="text-xs font-medium text-slate-700">
                    Across {skillGapTrends.totalJobsWithSnapshots} job
                    {skillGapTrends.totalJobsWithSnapshots === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              {skillGapTrends.totalJobsWithSnapshots === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-700">
                  Run a skill gap analysis on a job to start tracking recurring gaps and recommended learning paths.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                  <div className="space-y-3">
                    {topSkillGaps.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        No recurring gaps yet. Keep refreshing analyses as you apply to more roles.
                      </div>
                    ) : (
                      topSkillGaps.map((gap) => {
                        const previewJobs = gap.jobs.slice(0, 2);
                        const remainingJobs = Math.max(gap.jobs.length - previewJobs.length, 0);
                        return (
                          <div
                            key={gap.skillName}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {gap.skillName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {gap.occurrences} occurrence{gap.occurrences === 1 ? "" : "s"} •{" "}
                                  {gap.criticalCount} critical
                                </p>
                              </div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                <Icon icon="mingcute:analysis-line" width={12} />
                                {gap.jobs.length} job{gap.jobs.length === 1 ? "" : "s"}
                              </span>
                            </div>
                            {previewJobs.length > 0 && (
                              <p className="mt-2 text-xs text-slate-500">
                                {previewJobs.map((job) => job.company).join(", ")}
                                {remainingJobs > 0 ? ` +${remainingJobs} more` : ""}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    {trendingJobs.length === 0 ? (
                      <p className="text-xs text-slate-600">
                        No recent skill gap snapshots yet.
                      </p>
                    ) : (
                      trendingJobs.map((job) => (
                        <div
                          key={job.snapshotId}
                          className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm border border-slate-200"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {job.company}
                            </p>
                            <p className="text-xs text-slate-500">{job.title}</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              <Icon icon="mingcute:warning-line" width={12} />
                              {job.totalGaps} gap{job.totalGaps === 1 ? "" : "s"}
                            </span>
                            <p className="mt-1 text-[10px] text-slate-600">
                              {new Date(job.generatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

