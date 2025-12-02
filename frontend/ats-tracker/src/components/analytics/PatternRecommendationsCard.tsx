import { Icon } from "@iconify/react";
import type { PatternRecommendation } from "../../types/analytics.types";

interface PatternRecommendationsCardProps {
  recommendations: PatternRecommendation[];
}

export function PatternRecommendationsCard({ recommendations }: PatternRecommendationsCardProps) {
  // Sort by priority
  const priorityOrder = { high: 1, medium: 2, low: 3 };
  const sortedRecommendations = [...recommendations].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#F8F9FF] to-[#EEF0FB] p-6 border border-[#E4E8F5]">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="mingcute:lightbulb-line" className="text-[#3351FD]" width={24} />
        <h3 className="text-[25px] font-normal text-[#0F1D3A]">
          AI-Powered Recommendations
        </h3>
      </div>

      <p className="text-sm text-[#6D7A99] mb-4">
        Data-driven insights based on your success patterns
      </p>
      
      <div className="space-y-3">
        {sortedRecommendations.map((rec, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border bg-white ${
              rec.priority === "high"
                ? "border-[#3351FD] shadow-sm"
                : "border-[#E8EBF8]"
            }`}
          >
            <div className="flex items-start gap-3">
              <Icon
                icon={
                  rec.priority === "high"
                    ? "mingcute:alert-line"
                    : rec.priority === "medium"
                    ? "mingcute:information-line"
                    : "mingcute:lightbulb-line"
                }
                className={`mt-0.5 flex-shrink-0 ${
                  rec.priority === "high" 
                    ? "text-[#3351FD]" 
                    : rec.priority === "medium"
                    ? "text-yellow-500"
                    : "text-[#6D7A99]"
                }`}
                width={20}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-[#0F1D3A]">
                    {rec.title}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
                <p className="text-sm text-[#0F1D3A] mb-2">{rec.message}</p>
                <div className="bg-[#F8F9FF] rounded-lg p-3 mb-2">
                  <div className="text-xs font-semibold text-[#0F1D3A] mb-1">
                    Action Item:
                  </div>
                  <p className="text-xs text-[#6D7A99]">{rec.actionable}</p>
                </div>
                {rec.impact && (
                  <div className="flex items-center gap-1 text-xs text-[#6D7A99]">
                    <Icon icon="mingcute:chart-line" width={14} />
                    <span>{rec.impact}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {recommendations.length === 0 && (
        <div className="text-center py-8 text-[#6D7A99]">
          <Icon icon="mingcute:lightbulb-line" className="mx-auto mb-2" width={40} />
          <p className="text-sm">No recommendations yet</p>
          <p className="text-xs mt-1">Apply to more jobs to get personalized insights</p>
        </div>
      )}
    </div>
  );
}

