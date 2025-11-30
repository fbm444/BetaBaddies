import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { ApplicationSuccessAnalysis, DateRange } from "../../types/analytics.types";

interface ApplicationSuccessAnalysisProps {
  dateRange?: DateRange;
}

export function ApplicationSuccessAnalysis({ dateRange }: ApplicationSuccessAnalysisProps) {
  const [data, setData] = useState<ApplicationSuccessAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.getApplicationSuccessAnalysis(dateRange);
        if (response.ok && response.data?.analysis) {
          setData(response.data.analysis);
        } else {
          setError("Failed to load success analysis data");
        }
      } catch (err: any) {
        console.error("Failed to fetch success analysis:", err);
        setError(err.message || "Failed to load success analysis data");
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
          <p className="text-sm text-[#6D7A99]">Loading success analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[#F5C4C4] bg-[#FDECEC] p-10 text-center">
        <Icon icon="mingcute:alert-line" className="mx-auto mb-3 text-red-500" width={40} />
        <p className="text-sm font-medium text-red-700">
          {error || "Failed to load success analysis. Please try again later."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success by Industry */}
      {data.byIndustry.length > 0 && (
        <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
          <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Success by Industry</h3>
          <div className="space-y-3">
            {data.byIndustry.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1B2C4B]">{item.industry}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[#6D7A99]">
                      {item.interviews} interviews ({item.interviewRate}%)
                    </span>
                    <span className="text-xs font-semibold text-[#0F1D3A]">
                      {item.offers} offers ({item.offerRate}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEF0FB]">
                  <div
                    className="h-full rounded-full bg-[#3351FD] transition-all"
                    style={{ width: `${Math.min(item.offerRate, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-[#94A3C0]">
                  {item.applied} applied, {item.total} total opportunities
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success by Source */}
      {data.bySource.length > 0 && (
        <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
          <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Success by Application Source</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.bySource.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#0F1D3A]">
                    {item.source.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-[#6D7A99]">{item.total} total</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6D7A99]">Interview Rate:</span>
                    <span className="font-medium text-[#0F1D3A]">{item.interviewRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6D7A99]">Offer Rate:</span>
                    <span className="font-semibold text-[#3351FD]">{item.offerRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success by Method */}
      {data.byMethod.length > 0 && (
        <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
          <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Success by Application Method</h3>
          <div className="space-y-3">
            {data.byMethod.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]">
                <div>
                  <p className="text-sm font-medium text-[#0F1D3A]">
                    {item.method.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-[#6D7A99]">
                    {item.applied} applied • {item.interviews} interviews • {item.offers} offers
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-[#3351FD]">{item.offerRate}%</p>
                  <p className="text-xs text-[#6D7A99]">offer rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-br from-[#F8F9FF] to-[#EEF0FB] p-6 border border-[#E4E8F5]">
          <div className="flex items-center gap-2 mb-4">
            <Icon icon="mingcute:lightbulb-line" className="text-[#3351FD]" width={24} />
            <h3 className="text-[25px] font-normal text-[#0F1D3A]">Recommendations</h3>
          </div>
          <div className="space-y-3">
            {data.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border ${
                  rec.priority === "high"
                    ? "border-[#3351FD] bg-white"
                    : "border-[#E8EBF8] bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    icon={
                      rec.priority === "high"
                        ? "mingcute:alert-line"
                        : "mingcute:information-line"
                    }
                    className={`mt-0.5 ${
                      rec.priority === "high" ? "text-[#3351FD]" : "text-[#6D7A99]"
                    }`}
                    width={20}
                  />
                  <p className="text-sm text-[#0F1D3A] flex-1">{rec.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.byIndustry.length === 0 &&
        data.bySource.length === 0 &&
        data.byMethod.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#E4E8F5] bg-[#F8F8F8] p-10 text-center">
            <Icon icon="mingcute:chart-line" className="mx-auto mb-3 text-[#6D7A99]" width={48} />
            <p className="text-sm text-[#6D7A99]">
              No success analysis data available yet. Start applying to jobs to see insights.
            </p>
          </div>
        )}
    </div>
  );
}

