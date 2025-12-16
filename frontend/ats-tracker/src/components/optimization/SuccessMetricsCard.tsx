import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface SuccessMetricsCardProps {
  dateRange?: { startDate?: string; endDate?: string };
}

export function SuccessMetricsCard({ dateRange }: SuccessMetricsCardProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    fetchTrends();
  }, [dateRange]);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const period = dateRange?.startDate || dateRange?.endDate 
        ? `${dateRange.startDate || ''}_${dateRange.endDate || ''}` 
        : undefined;
      const response = await api.getOptimizationMetrics(period);
      if (response.ok && response.data) {
        setMetrics(response.data.metrics);
      } else {
        setError(response.error?.message || "Failed to load metrics");
      }
    } catch (err: any) {
      console.error("Error fetching metrics:", err);
      setError(err.message || "Failed to load metrics");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await api.getOptimizationTrends("offer_rate", "monthly", 12);
      if (response.ok && response.data) {
        setTrends(response.data.trends || []);
      }
    } catch (err) {
      console.error("Error fetching trends:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading success metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <Icon icon="mingcute:alert-line" className="mx-auto mb-3 text-red-500" width={40} />
        <p className="text-sm font-medium text-red-700">
          {error || "Failed to load success metrics"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Success Metrics</h2>
        <p className="text-slate-600 mb-6">
          Track your application performance with key success indicators
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Response Rate</span>
            <Icon icon="mingcute:mail-line" className="text-blue-600" width={24} />
          </div>
          <p className="text-3xl font-bold text-blue-900">
            {metrics.responseRate ? `${(metrics.responseRate * 100).toFixed(1)}%` : "N/A"}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Applications that received responses
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">Interview Conversion</span>
            <Icon icon="mingcute:calendar-line" className="text-purple-600" width={24} />
          </div>
          <p className="text-3xl font-bold text-purple-900">
            {metrics.interviewConversionRate 
              ? `${(metrics.interviewConversionRate * 100).toFixed(1)}%` 
              : "N/A"}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            Responses that led to interviews
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Offer Rate</span>
            <Icon icon="mingcute:file-certificate-line" className="text-green-600" width={24} />
          </div>
          <p className="text-3xl font-bold text-green-900">
            {metrics.offerRate ? `${(metrics.offerRate * 100).toFixed(1)}%` : "N/A"}
          </p>
          <p className="text-xs text-green-600 mt-1">
            Interviews that resulted in offers
          </p>
        </div>
      </div>

      {/* Additional Metrics */}
      {metrics.totalApplications && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Total Applications</p>
            <p className="text-xl font-bold text-slate-900">{metrics.totalApplications}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Responses</p>
            <p className="text-xl font-bold text-slate-900">{metrics.totalResponses || 0}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Interviews</p>
            <p className="text-xl font-bold text-slate-900">{metrics.totalInterviews || 0}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Offers</p>
            <p className="text-xl font-bold text-slate-900">{metrics.totalOffers || 0}</p>
          </div>
        </div>
      )}

      {/* Trends Preview */}
      {trends.length > 0 && (
        <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Recent Trend</h3>
          <p className="text-xs text-slate-600">
            {trends.length} data points available. View the Trends tab for detailed analysis.
          </p>
        </div>
      )}
    </div>
  );
}

