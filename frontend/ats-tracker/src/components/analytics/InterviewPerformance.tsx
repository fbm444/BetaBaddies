import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { InterviewPerformance, DateRange } from "../../types/analytics.types";

interface InterviewPerformanceProps {
  dateRange?: DateRange;
}

export function InterviewPerformance({ dateRange }: InterviewPerformanceProps) {
  const [data, setData] = useState<InterviewPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.getInterviewPerformance(dateRange);
        if (response.ok && response.data?.performance) {
          setData(response.data.performance);
        } else {
          setError("Failed to load interview performance data");
        }
      } catch (err: any) {
        console.error("Failed to fetch interview performance:", err);
        setError(err.message || "Failed to load interview performance data");
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
          <p className="text-sm text-[#6D7A99]">Loading interview performance...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[#F5C4C4] bg-[#FDECEC] p-10 text-center">
        <Icon icon="mingcute:alert-line" className="mx-auto mb-3 text-red-500" width={40} />
        <p className="text-sm font-medium text-red-700">
          {error || "Failed to load interview performance. Please try again later."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4 font-poppins">Interview Performance</h2>
        <p className="text-slate-600 mb-6 font-poppins">
          Track your interview outcomes, performance trends, and success rates across different interview types.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Total Interviews, Interview to Offer, Performance Trends */}
        <div className="space-y-4">
          {/* Total Interviews and Interview to Offer - Side by Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Interviews */}
            <div className="rounded-2xl bg-gradient-to-b from-[#1E3097] to-[#3351FD] p-6 text-white min-h-[160px] flex flex-col justify-between">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[18px] font-normal">Total Interviews</p>
                <Icon icon="mingcute:chat-smile-line" width={24} className="text-white" />
              </div>
              <p className="text-5xl font-medium leading-none text-[#E7EFFF]">
                {data.overall.totalInterviews}
              </p>
            </div>

            {/* Interview to Offer */}
            <div className="rounded-2xl bg-white p-6 border border-[#E4E8F5] min-h-[160px] flex flex-col justify-between">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[18px] font-normal text-[#0F1D3A]">Interview to Offer</p>
                <Icon icon="mingcute:target-line" width={20} className="text-[#09244B]" />
              </div>
              <div className="flex items-end gap-3">
                <p className="text-5xl font-extralight text-[#5A87E6]">{data.overall.offerRate}%</p>
                <p className="text-xs text-[#6D7A99] mb-1">
                  {data.overall.offers} offers from {data.overall.totalInterviews} interviews
                </p>
              </div>
            </div>
          </div>

          {/* Performance Trends - Full Width Under Both */}
          {data.trends.length > 0 && (
            <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
              <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Performance Trends</h3>
              <div className="space-y-3">
                {data.trends.map((trend, index) => {
                  const date = new Date(trend.month + "-01");
                  const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

                  return (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]">
                      <span className="text-sm font-medium text-[#0F1D3A]">{monthLabel}</span>
                      <div className="flex items-center gap-6">
                        <span className="text-xs text-[#6D7A99]">
                          {trend.count} interviews
                        </span>
                        <span className="text-xs text-[#6D7A99]">
                          {trend.offers} offers
                        </span>
                        {trend.avgConfidence !== null && (
                          <span className="text-xs font-semibold text-[#3351FD]">
                            Confidence: {trend.avgConfidence}/5
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Performance by Interview Type - Full Height */}
        {data.byType.length > 0 && (
          <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
            <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Performance by Interview Type</h3>
            <div className="space-y-3">
              {data.byType
                .filter((item) => item.type != null) // Filter out null/undefined types
                .map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#0F1D3A]">
                        {item.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-[#6D7A99]">{item.count} interviews</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-[#6D7A99]">
                        Offer Rate: <span className="font-semibold text-[#0F1D3A]">{item.offerRate}%</span>
                      </span>
                      {item.avgConfidence !== null && (
                        <span className="text-[#6D7A99]">
                          Confidence: <span className="font-semibold text-[#0F1D3A]">{item.avgConfidence}/5</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-semibold text-[#3351FD]">{item.offers}</p>
                    <p className="text-xs text-[#6D7A99]">offers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Additional Metrics Row - Avg Confidence and Avg Difficulty */}
      {(data.overall.avgConfidence !== null || data.overall.avgDifficulty !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.overall.avgConfidence !== null && (
            <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5]">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[18px] font-normal text-[#0F1D3A]">Avg. Confidence</p>
                <Icon icon="mingcute:star-line" width={20} className="text-[#09244B]" />
              </div>
              <p className="text-4xl font-extralight text-[#5A87E6]">
                {data.overall.avgConfidence}/5
              </p>
            </div>
          )}

          {data.overall.avgDifficulty !== null && (
            <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5]">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[18px] font-normal text-[#0F1D3A]">Avg. Difficulty</p>
                <Icon icon="mingcute:alert-line" width={20} className="text-[#09244B]" />
              </div>
              <p className="text-4xl font-extralight text-[#5A87E6]">
                {data.overall.avgDifficulty}/5
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {data.overall.totalInterviews === 0 && (
        <div className="rounded-2xl border border-dashed border-[#E4E8F5] bg-[#F8F8F8] p-10 text-center">
          <Icon icon="mingcute:chat-smile-line" className="mx-auto mb-3 text-[#6D7A99]" width={48} />
          <p className="text-sm text-[#6D7A99]">
            No interview data available yet. Schedule interviews to start tracking performance.
          </p>
        </div>
      )}
    </div>
  );
}

