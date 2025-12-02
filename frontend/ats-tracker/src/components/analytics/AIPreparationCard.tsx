import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface DateRange {
  startDate?: string;
  endDate?: string;
}

interface AIPreparationCardProps {
  dateRange?: DateRange;
}

export function AIPreparationCard({ dateRange }: AIPreparationCardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getAIPreparationAnalysis(dateRange);
      setData(response);
    } catch (err: any) {
      console.error("Error fetching AI preparation analysis:", err);
      setError(err.message || "Failed to load preparation analysis");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5] mb-6">
        <div className="flex items-center justify-center py-8">
          <Icon icon="mingcute:loading-line" className="animate-spin text-[#3351FD]" width={32} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5] mb-6">
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <Icon icon="mingcute:alert-line" className="text-red-600 mt-0.5" width={20} />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.hasData) {
    return (
      <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5] mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon icon="mingcute:sparkles-line" className="text-[#3351FD]" width={24} />
          <h3 className="text-[25px] font-normal text-[#0F1D3A]">
            AI Preparation Analysis
          </h3>
        </div>
        <div className="text-center py-8 text-[#6D7A99]">
          <Icon icon="mingcute:time-line" className="mx-auto mb-2" width={40} />
          <p className="text-sm">{data?.message || "Start tracking applications to see preparation insights"}</p>
        </div>
      </div>
    );
  }

  // Determine if we're showing AI analysis or general advice
  const showingAIAnalysis = data.hasSufficientData && !data.error;
  const content = showingAIAnalysis ? data : data.generalAdvice;

  return (
    <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5] mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="mingcute:sparkles-line" className="text-[#3351FD]" width={24} />
        <h3 className="text-[25px] font-normal text-[#0F1D3A]">
          {showingAIAnalysis ? "AI Preparation Analysis" : "Preparation Guidelines"}
        </h3>
        {showingAIAnalysis && data.dataQuality && (
          <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
            data.dataQuality.rating === 'excellent' ? 'bg-green-100 text-green-700' :
            data.dataQuality.rating === 'good' ? 'bg-blue-100 text-blue-700' :
            data.dataQuality.rating === 'fair' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {data.dataQuality.rating} data
          </div>
        )}
      </div>

      {/* Data quality warning for insufficient data */}
      {!showingAIAnalysis && data.hasSufficientData === false && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <Icon icon="mingcute:information-line" className="text-yellow-600 mt-0.5 flex-shrink-0" width={20} />
            <div>
              <div className="text-sm font-medium text-yellow-900 mb-1">Limited Data Available</div>
              <div className="text-sm text-yellow-700">
                {data.message} Showing general best practices below.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI or General Overview */}
      {content?.overview && (
        <p className="text-sm text-[#6D7A99] mb-4">{content.overview}</p>
      )}

      {/* Optimal Prep Time */}
      {content?.optimalPrepTime && (
        <div className={`rounded-2xl p-6 mb-4 ${
          content.optimalPrepTime.confidence === 'low' || content.optimalPrepTime.confidence === 'general_guidance'
            ? 'bg-gray-100 border-2 border-dashed border-gray-400 text-gray-700'
            : 'bg-gradient-to-br from-[#3351FD] to-[#5B72FF] text-white'
        }`}>
          <div className="text-sm mb-1 ${content.optimalPrepTime.confidence === 'general_guidance' ? 'text-gray-600' : 'opacity-90'}">
            {showingAIAnalysis ? "Your Optimal Preparation Time" : "Recommended Preparation Time"}
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-bold">{content.optimalPrepTime.hours}</div>
            <div className="text-lg">hours</div>
          </div>
          <div className={`text-sm mt-2 ${content.optimalPrepTime.confidence === 'general_guidance' ? 'text-gray-600' : 'opacity-90'}`}>
            {content.optimalPrepTime.reasoning}
          </div>
          {data.concludedApplications > 0 && (
            <div className={`text-xs mt-3 pt-3 border-t ${
              content.optimalPrepTime.confidence === 'general_guidance' 
                ? 'border-gray-400 text-gray-600' 
                : 'border-white/20 opacity-75'
            }`}>
              {showingAIAnalysis 
                ? `Based on ${data.concludedApplications} application${data.concludedApplications !== 1 ? 's' : ''}`
                : `Track ${3 - (data.concludedApplications || 0)} more concluded applications for personalized AI insights`
              }
            </div>
          )}
        </div>
      )}

      {/* Key Activities */}
      {content?.keyActivities && content.keyActivities.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-[#0F1D3A] mb-3">Key Preparation Activities</h4>
          <div className="space-y-2">
            {content.keyActivities.map((activity: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[#F8F9FF]">
                <Icon 
                  icon={
                    activity.impact === 'high' ? "mingcute:star-fill" :
                    activity.impact === 'medium' ? "mingcute:star-line" :
                    "mingcute:star-line"
                  } 
                  className={
                    activity.impact === 'high' ? 'text-green-600' :
                    activity.impact === 'medium' ? 'text-blue-600' :
                    'text-gray-600'
                  }
                  width={20} 
                />
                <div className="flex-1">
                  <div className="font-medium text-[#0F1D3A] text-sm">{activity.activity}</div>
                  <div className="text-xs text-[#6D7A99] mt-1">{activity.reasoning}</div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  activity.impact === 'high' ? 'bg-green-100 text-green-700' :
                  activity.impact === 'medium' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {activity.impact}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {data.insights && data.insights.length > 0 && showingAIAnalysis && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-[#0F1D3A]">AI Insights</h4>
          {data.insights.map((insight: string, idx: number) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-[#0F1D3A]">
              <Icon icon="mingcute:check-circle-line" className="text-[#3351FD] mt-0.5 flex-shrink-0" width={16} />
              <span>{insight}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

