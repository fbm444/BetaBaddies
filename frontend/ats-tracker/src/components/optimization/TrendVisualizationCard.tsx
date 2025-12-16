import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TrendVisualizationCardProps {
  dateRange?: { startDate?: string; endDate?: string };
}

export function TrendVisualizationCard({ dateRange }: TrendVisualizationCardProps) {
  const [trends, setTrends] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("offer_rate");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendData();
  }, [selectedMetric, dateRange]);

  const fetchTrendData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [trendsRes, snapshotsRes] = await Promise.all([
        api.getOptimizationTrends(selectedMetric, "monthly", 12),
        api.getOptimizationSnapshots("monthly", 12),
      ]);

      if (trendsRes.ok && trendsRes.data) {
        setTrends(trendsRes.data.trends || []);
      }
      if (snapshotsRes.ok && snapshotsRes.data) {
        setSnapshots(snapshotsRes.data.snapshots || []);
      }
    } catch (err: any) {
      console.error("Error fetching trend data:", err);
      setError(err.message || "Failed to load trend data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading trend visualization...</p>
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

  const formatChartData = () => {
    return trends.map((trend) => ({
      period: trend.period || trend.date || "Unknown",
      value: trend.value || trend[selectedMetric] || 0,
      responseRate: trend.responseRate || 0,
      interviewRate: trend.interviewRate || 0,
      offerRate: trend.offerRate || 0,
    }));
  };

  const chartData = formatChartData();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Trend Visualization</h2>
        <p className="text-slate-600 mb-6">
          Track improvement over time with trend visualization
        </p>
      </div>

      {/* Metric Selector */}
      <div className="flex items-center gap-4 mb-6">
        <label className="text-sm font-medium text-slate-700">Metric:</label>
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="response_rate">Response Rate</option>
          <option value="interview_rate">Interview Rate</option>
          <option value="offer_rate">Offer Rate</option>
        </select>
      </div>

      {/* Trend Charts */}
      {chartData.length > 0 ? (
        <div className="space-y-6">
          {/* Main Metric Chart */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {selectedMetric.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())} Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="period"
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Value"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* All Metrics Comparison Chart */}
          {snapshots.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                All Metrics Comparison
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={snapshots.map((s: any) => ({
                  period: s.period || s.snapshot_date || "Unknown",
                  responseRate: (s.response_rate || 0) / 100,
                  interviewRate: (s.interview_rate || 0) / 100,
                  offerRate: (s.offer_rate || 0) / 100,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="period"
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, ""]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="responseRate"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Response Rate"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="interviewRate"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    name="Interview Rate"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="offerRate"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Offer Rate"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <Icon icon="mingcute:trending-up-line" className="mx-auto mb-3 text-slate-400" width={48} />
          <p className="text-slate-600">No trend data available</p>
          <p className="text-sm text-slate-500 mt-1">
            Historical data will appear as you track your applications over time
          </p>
        </div>
      )}

      {/* Snapshots Summary */}
      {snapshots.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Historical Snapshots</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {snapshots.slice(0, 6).map((snapshot, index) => (
              <div
                key={snapshot.id || index}
                className="bg-white rounded-lg p-4 border border-slate-200"
              >
                <p className="text-xs text-slate-600 mb-1">
                  {snapshot.period || snapshot.date || "Unknown"}
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Response:</span>
                    <span className="font-semibold text-slate-900">
                      {snapshot.responseRate
                        ? `${(snapshot.responseRate * 100).toFixed(1)}%`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Interview:</span>
                    <span className="font-semibold text-slate-900">
                      {snapshot.interviewRate
                        ? `${(snapshot.interviewRate * 100).toFixed(1)}%`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Offer:</span>
                    <span className="font-semibold text-slate-900">
                      {snapshot.offerRate
                        ? `${(snapshot.offerRate * 100).toFixed(1)}%`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

