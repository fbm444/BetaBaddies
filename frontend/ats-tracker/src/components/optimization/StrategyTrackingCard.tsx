import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface StrategyTrackingCardProps {
  dateRange?: { startDate?: string; endDate?: string };
}

export function StrategyTrackingCard({ dateRange }: StrategyTrackingCardProps) {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBestStrategies();
    fetchPerformance();
  }, [dateRange]);

  const fetchBestStrategies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getBestStrategies(10);
      if (response.ok && response.data) {
        setStrategies(response.data.strategies || []);
      } else {
        setError(response.error?.message || "Failed to load strategies");
      }
    } catch (err: any) {
      console.error("Error fetching strategies:", err);
      setError(err.message || "Failed to load strategies");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPerformance = async () => {
    try {
      const filters: any = {};
      if (dateRange?.startDate) filters.startDate = dateRange.startDate;
      if (dateRange?.endDate) filters.endDate = dateRange.endDate;
      
      const response = await api.getStrategyPerformance(filters);
      if (response.ok && response.data) {
        setPerformance(response.data.performance);
      }
    } catch (err) {
      console.error("Error fetching performance:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading strategies...</p>
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

  const formatApplicationMethod = (method: string) => {
    return method
      ?.split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || method;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Application Strategies</h2>
        <p className="text-slate-600 mb-6">
          Track effectiveness of different application approaches (direct, referral, etc.)
        </p>
      </div>

      {strategies.length > 0 ? (
        <div className="space-y-4">
          {strategies.map((strategy, index) => (
            <div
              key={strategy.id || index}
              className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                    <h4 className="text-lg font-semibold text-slate-900">
                      {formatApplicationMethod(strategy.applicationMethod)}
                    </h4>
                  </div>
                  {strategy.hasReferral && (
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                      With Referral
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Response Rate</p>
                  <p className="text-lg font-bold text-slate-900">
                    {strategy.responseRate ? `${(strategy.responseRate * 100).toFixed(1)}%` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Interview Rate</p>
                  <p className="text-lg font-bold text-slate-900">
                    {strategy.interviewRate ? `${(strategy.interviewRate * 100).toFixed(1)}%` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Applications</p>
                  <p className="text-lg font-bold text-slate-900">{strategy.applicationCount || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <Icon icon="mingcute:target-line" className="mx-auto mb-3 text-slate-400" width={48} />
          <p className="text-slate-600">No strategy data available</p>
          <p className="text-sm text-slate-500 mt-1">
            Track application methods to see which strategies work best
          </p>
        </div>
      )}

      {performance && (
        <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Overall Performance</h3>
          <p className="text-xs text-slate-600">
            Based on {performance.totalApplications || 0} tracked applications
          </p>
        </div>
      )}
    </div>
  );
}

