import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import { RecommendationMetricsView } from "./RecommendationMetricsView";

interface OptimizationRecommendationsCardProps {
  dateRange?: { startDate?: string; endDate?: string };
}

export function OptimizationRecommendationsCard({ dateRange }: OptimizationRecommendationsCardProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetchRecommendations();
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    try {
      const response = await api.getOptimizationMetrics();
      if (response.ok && response.data) {
        setMetrics(response.data.metrics);
      }
    } catch (err) {
      console.error("Error fetching metrics:", err);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getOptimizationRecommendations(20);
      if (response.ok && response.data) {
        setRecommendations(response.data.recommendations || []);
      } else {
        setError(response.error?.message || "Failed to load recommendations");
      }
    } catch (err: any) {
      console.error("Error fetching recommendations:", err);
      setError(err.message || "Failed to load recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await api.acknowledgeRecommendation(id);
      fetchRecommendations();
    } catch (err) {
      console.error("Error acknowledging recommendation:", err);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.completeRecommendation(id);
      fetchRecommendations();
    } catch (err) {
      console.error("Error completing recommendation:", err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.dismissRecommendation(id);
      fetchRecommendations();
    } catch (err) {
      console.error("Error dismissing recommendation:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <Icon icon="mingcute:alert-line" className="mx-auto mb-3 text-red-500" width={40} />
        <p className="text-sm font-medium text-red-700">{error}</p>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Optimization Recommendations</h2>
        <p className="text-slate-600 mb-6">
          Actionable recommendations to improve your application success rate
        </p>
      </div>

      {/* Overall Metrics Summary */}
      {metrics && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Performance Metrics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-600 mb-1">Response Rate</p>
              <p className="text-2xl font-bold text-slate-900">
                {metrics.responseRate ? `${(metrics.responseRate * 100).toFixed(1)}%` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-1">Interview Conversion</p>
              <p className="text-2xl font-bold text-slate-900">
                {metrics.interviewConversionRate 
                  ? `${(metrics.interviewConversionRate * 100).toFixed(1)}%` 
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-1">Offer Rate</p>
              <p className="text-2xl font-bold text-slate-900">
                {metrics.offerRate ? `${(metrics.offerRate * 100).toFixed(1)}%` : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}

      {recommendations.length > 0 ? (
        <div className="space-y-4">
          {recommendations
            .filter((rec) => rec.status !== "dismissed" && rec.status !== "completed")
            .map((rec) => {
              // Parse supporting_data if it's a string
              const supportingData = typeof rec.supporting_data === 'string' 
                ? JSON.parse(rec.supporting_data) 
                : rec.supporting_data;
              
              return (
              <div
                key={rec.id}
                className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded border ${getPriorityColor(
                          rec.priority
                        )}`}
                      >
                        {rec.priority || "Medium"} Priority
                      </span>
                      <span className="text-xs text-slate-500">
                        {rec.category || "General"}
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">
                      {rec.title || rec.recommendation}
                    </h4>
                    {rec.description && (
                      <p className="text-sm text-slate-700 mb-2">{rec.description}</p>
                    )}
                    {rec.reasoning && (
                      <p className="text-xs text-slate-600 italic mb-3">{rec.reasoning}</p>
                    )}
                    {rec.expectedImpact && (
                      <div className="mt-3 p-2 bg-white rounded border border-amber-200">
                        <p className="text-xs font-medium text-slate-700 mb-1">Expected Impact:</p>
                        <p className="text-xs text-slate-600">{rec.expectedImpact}</p>
                      </div>
                    )}
                    
                    {/* Supporting Data Metrics */}
                    {supportingData && (
                      <div className="mt-3">
                        <button
                          onClick={() => setExpandedRecId(expandedRecId === rec.id ? null : rec.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <Icon 
                            icon={expandedRecId === rec.id ? "mingcute:up-line" : "mingcute:down-line"} 
                            width={14} 
                          />
                          {expandedRecId === rec.id ? "Hide" : "Show"} Metrics & Comparison
                        </button>
                        
                        {expandedRecId === rec.id && (
                          <RecommendationMetricsView 
                            recommendation={rec}
                            supportingData={supportingData}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleAcknowledge(rec.id)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => handleComplete(rec.id)}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                  >
                    Mark Complete
                  </button>
                  <button
                    onClick={() => handleDismiss(rec.id)}
                    className="px-3 py-1.5 bg-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-400 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
            })}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <Icon icon="mingcute:lightbulb-line" className="mx-auto mb-3 text-slate-400" width={48} />
          <p className="text-slate-600">No recommendations available</p>
          <p className="text-sm text-slate-500 mt-1">
            Recommendations will appear as we analyze your application data
          </p>
        </div>
      )}
    </div>
  );
}

