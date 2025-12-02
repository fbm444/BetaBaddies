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

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch performance data
        const performanceResponse = await api.getJobSearchPerformance(dateRange);
        
        if (performanceResponse.ok && performanceResponse.data?.performance) {
          setData(performanceResponse.data.performance);
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4 font-poppins">Job Search Performance</h2>
        <p className="text-slate-600 mb-6 font-poppins">
          Track your overall job search metrics, conversion rates, and compare your performance against industry benchmarks.
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#1E3097] to-[#3351FD] p-6 text-white min-h-[160px]">
          <div className="flex items-start justify-between">
            <p className="text-[22px] font-normal">Applications Sent</p>
            <Icon icon="mingcute:send-plane-line" width={24} className="text-white" />
          </div>
          <p className="text-6xl font-medium leading-none text-[#E7EFFF]">
            {keyMetrics.applicationsSent}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-6 border border-slate-300 min-h-[160px]">
          <div className="flex items-start justify-between">
            <p className="text-[22px] font-normal text-[#0F1D3A]">Interviews Scheduled</p>
            <Icon icon="mingcute:calendar-line" width={20} className="text-[#09244B]" />
          </div>
          <p className="text-3xl font-extralight text-[#5A87E6]">
            {keyMetrics.interviewsScheduled}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-6 border border-slate-300 min-h-[160px]">
          <div className="flex items-start justify-between">
            <p className="text-[22px] font-normal text-[#0F1D3A]">Offers Received</p>
            <Icon icon="mingcute:check-circle-line" width={20} className="text-[#09244B]" />
          </div>
          <p className="text-3xl font-extralight text-[#5A87E6]">{keyMetrics.offersReceived}</p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-6 border border-slate-300 min-h-[160px]">
          <div className="flex items-start justify-between">
            <p className="text-[22px] font-normal text-[#0F1D3A]">Overall Success Rate</p>
            <Icon icon="mingcute:target-line" width={20} className="text-[#09244B]" />
          </div>
          <p className="text-3xl font-extralight text-[#5A87E6]">
            {conversionRates.overallSuccess}%
          </p>
        </div>
      </div>

      {/* Conversion Funnel and Monthly Volume - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="rounded-3xl bg-white p-6 border border-slate-300">
          <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-6 font-poppins">Conversion Funnel</h3>
          <div className="space-y-4">
            {/* Applications (starting point) */}
            <div className="flex items-center gap-4">
              <div 
                className="h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg relative overflow-hidden"
                style={{ 
                  width: '100%',
                  backgroundColor: '#1E3A8A'
                }}
              >
                <span className="z-10">{keyMetrics.applicationsSent}</span>
              </div>
              <span className="text-sm font-medium text-slate-700 font-poppins">Applications Sent</span>
            </div>

            {/* Application to Interview */}
            <div className="flex items-center gap-4">
              <div 
                className="h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg relative overflow-hidden"
                style={{ 
                  width: keyMetrics.applicationsSent > 0 
                    ? `${(keyMetrics.interviewsScheduled / keyMetrics.applicationsSent) * 100}%`
                    : '0%',
                  minWidth: keyMetrics.interviewsScheduled > 0 ? '60px' : '0px',
                  backgroundColor: '#1E40AF'
                }}
              >
                {keyMetrics.interviewsScheduled > 0 && (
                  <span className="z-10">{keyMetrics.interviewsScheduled}</span>
                )}
              </div>
              <span className="text-sm font-medium text-slate-700 font-poppins">Application to Interview</span>
            </div>

            {/* Interview to Offer */}
            <div className="flex items-center gap-4">
              <div 
                className="h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg relative overflow-hidden"
                style={{ 
                  width: keyMetrics.applicationsSent > 0
                    ? `${(keyMetrics.offersReceived / keyMetrics.applicationsSent) * 100}%`
                    : '0%',
                  minWidth: keyMetrics.offersReceived > 0 ? '60px' : '0px',
                  backgroundColor: '#3B82F6'
                }}
              >
                {keyMetrics.offersReceived > 0 && (
                  <span className="z-10">{keyMetrics.offersReceived}</span>
                )}
              </div>
              <span className="text-sm font-medium text-slate-700 font-poppins">Interview to Offer</span>
            </div>
          </div>
        </div>

        {/* Monthly Volume */}
        <div className="rounded-3xl bg-white p-6 border border-slate-300">
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
        <div className="rounded-3xl bg-white p-6 border border-slate-300">
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
