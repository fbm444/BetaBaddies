import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { JobSearchPerformance, DateRange } from "../../types/analytics.types";

interface JobSearchPerformanceProps {
  dateRange?: DateRange;
}

export function JobSearchPerformance({ dateRange }: JobSearchPerformanceProps) {
  const [data, setData] = useState<JobSearchPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.getJobSearchPerformance(dateRange);
        if (response.ok && response.data?.performance) {
          setData(response.data.performance);
        } else {
          setError("Failed to load performance data");
        }
      } catch (err: any) {
        console.error("Failed to fetch performance data:", err);
        setError(err.message || "Failed to load performance data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#3351FD]" />
          <p className="text-sm text-[#6D7A99]">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[#F5C4C4] bg-[#FDECEC] p-10 text-center">
        <Icon icon="mingcute:alert-line" className="mx-auto mb-3 text-red-500" width={40} />
        <p className="text-sm font-medium text-red-700">
          {error || "Failed to load performance data. Please try again later."}
        </p>
      </div>
    );
  }

  const { keyMetrics, conversionRates, timeMetrics, monthlyVolume, benchmarks } = data;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#1E3097] to-[#3351FD] p-5 text-white">
          <div className="flex items-start justify-between">
            <p className="text-[22px] font-normal">Applications Sent</p>
            <Icon icon="mingcute:send-plane-line" width={24} className="text-white" />
          </div>
          <p className="text-6xl font-medium leading-none text-[#E7EFFF]">
            {keyMetrics.applicationsSent}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-5 border border-[#E4E8F5]">
          <div className="flex items-start justify-between">
            <p className="text-[22px] font-normal text-[#0F1D3A]">Interviews Scheduled</p>
            <Icon icon="mingcute:calendar-line" width={20} className="text-[#09244B]" />
          </div>
          <p className="text-3xl font-extralight text-[#5A87E6]">
            {keyMetrics.interviewsScheduled}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-5 border border-[#E4E8F5]">
          <div className="flex items-start justify-between">
            <p className="text-[22px] font-normal text-[#0F1D3A]">Offers Received</p>
            <Icon icon="mingcute:check-circle-line" width={20} className="text-[#09244B]" />
          </div>
          <p className="text-3xl font-extralight text-[#5A87E6]">{keyMetrics.offersReceived}</p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-5 border border-[#E4E8F5]">
          <div className="flex items-start justify-between">
            <p className="text-[22px] font-normal text-[#0F1D3A]">Overall Success Rate</p>
            <Icon icon="mingcute:target-line" width={20} className="text-[#09244B]" />
          </div>
          <p className="text-3xl font-extralight text-[#5A87E6]">
            {conversionRates.overallSuccess}%
          </p>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
        <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Conversion Funnel</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#1B2C4B]">Application to Interview</span>
              <span className="text-sm font-semibold text-[#0F1D3A]">
                {conversionRates.applicationToInterview}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#EEF0FB]">
              <div
                className="h-full rounded-full bg-[#3351FD] transition-all"
                style={{ width: `${Math.min(conversionRates.applicationToInterview, 100)}%` }}
              />
            </div>
            <p className="text-xs text-[#94A3C0] mt-1">
              {keyMetrics.interviewsScheduled} interviews from {keyMetrics.applicationsSent}{" "}
              applications
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#1B2C4B]">Interview to Offer</span>
              <span className="text-sm font-semibold text-[#0F1D3A]">
                {conversionRates.interviewToOffer}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#EEF0FB]">
              <div
                className="h-full rounded-full bg-[#3351FD] transition-all"
                style={{ width: `${Math.min(conversionRates.interviewToOffer, 100)}%` }}
              />
            </div>
            <p className="text-xs text-[#94A3C0] mt-1">
              {keyMetrics.offersReceived} offers from {keyMetrics.interviewsScheduled} interviews
            </p>
          </div>
        </div>
      </div>

      {/* Time Metrics and Monthly Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Metrics */}
        <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
          <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Time Metrics</h3>
          <div className="space-y-4">
            {timeMetrics.avgDaysToResponse !== null && (
              <div className="flex items-center justify-between rounded-xl border border-[#E8EBF8] bg-[#FDFDFF] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icon icon="mingcute:time-line" width={20} className="text-[#3351FD]" />
                  <span className="text-sm font-medium text-[#0F1D3A]">Avg. Time to Response</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-[#0F1D3A]">
                    {timeMetrics.avgDaysToResponse}
                  </span>
                  <span className="text-[10px] font-medium text-[#6D7A99] ml-1">days</span>
                </div>
              </div>
            )}

            {timeMetrics.avgDaysToInterview !== null && (
              <div className="flex items-center justify-between rounded-xl border border-[#E8EBF8] bg-[#FDFDFF] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icon icon="mingcute:calendar-check-line" width={20} className="text-[#3351FD]" />
                  <span className="text-sm font-medium text-[#0F1D3A]">Avg. Time to Interview</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-[#0F1D3A]">
                    {timeMetrics.avgDaysToInterview}
                  </span>
                  <span className="text-[10px] font-medium text-[#6D7A99] ml-1">days</span>
                </div>
              </div>
            )}

            {timeMetrics.avgDaysToResponse === null && timeMetrics.avgDaysToInterview === null && (
              <p className="text-sm text-[#6D7A99] text-center py-4">
                No time metrics available yet. Submit applications to start tracking.
              </p>
            )}
          </div>
        </div>

        {/* Monthly Volume */}
        <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
          <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Monthly Application Volume</h3>
          {monthlyVolume.length > 0 ? (
            <div className="space-y-2">
              {monthlyVolume.map((item, index) => {
                const date = new Date(item.month + "-01");
                const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                const maxCount = Math.max(...monthlyVolume.map((v) => v.count), 1);
                const percentage = (item.count / maxCount) * 100;

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#1B2C4B]">{monthLabel}</span>
                      <span className="font-semibold text-[#0F1D3A]">{item.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEF0FB]">
                      <div
                        className="h-full rounded-full bg-[#3351FD] transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#6D7A99] text-center py-4">
              No application data available for the selected period.
            </p>
          )}
        </div>
      </div>

      {/* Benchmark Comparison */}
      {benchmarks && (
        <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
          <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Industry Benchmarks</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-[#F8F9FF]">
              <p className="text-xs text-[#6D7A99] mb-1">Your Response Rate</p>
              <p className="text-2xl font-semibold text-[#3351FD]">
                {keyMetrics.applicationsSent > 0
                  ? Math.round(
                      (timeMetrics.responsesReceived / keyMetrics.applicationsSent) * 100 * 10
                    ) / 10
                  : 0}
                %
              </p>
              <p className="text-xs text-[#6D7A99] mt-1">Industry Avg: {benchmarks.responseRate}%</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[#F8F9FF]">
              <p className="text-xs text-[#6D7A99] mb-1">Your Interview Rate</p>
              <p className="text-2xl font-semibold text-[#3351FD]">
                {conversionRates.applicationToInterview}%
              </p>
              <p className="text-xs text-[#6D7A99] mt-1">Industry Avg: {benchmarks.interviewRate}%</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[#F8F9FF]">
              <p className="text-xs text-[#6D7A99] mb-1">Your Offer Rate</p>
              <p className="text-2xl font-semibold text-[#3351FD]">
                {conversionRates.overallSuccess}%
              </p>
              <p className="text-xs text-[#6D7A99] mt-1">Industry Avg: {benchmarks.offerRate}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

