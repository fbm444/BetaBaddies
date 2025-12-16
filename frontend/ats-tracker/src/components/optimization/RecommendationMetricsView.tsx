import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface RecommendationMetricsViewProps {
  recommendation: any;
  supportingData: any;
}

export function RecommendationMetricsView({ recommendation, supportingData }: RecommendationMetricsViewProps) {
  // Prepare comparison chart data
  const prepareComparisonData = () => {
    const data = [];
    
    if (supportingData.bestRate !== undefined && supportingData.secondRate !== undefined) {
      // Document comparison
      data.push(
        {
          name: supportingData.bestVersion || "Best Version",
          offerRate: (supportingData.bestRate || 0) * 100,
          responseRate: (supportingData.responseRate || 0) * 100,
          interviewRate: (supportingData.interviewRate || 0) * 100,
        },
        {
          name: "Other Versions",
          offerRate: (supportingData.secondRate || 0) * 100,
          responseRate: 0,
          interviewRate: 0,
        }
      );
    } else if (supportingData.currentRate !== undefined && supportingData.bestRate !== undefined) {
      // Strategy comparison
      data.push(
        {
          name: supportingData.applicationMethod || "Best Method",
          offerRate: (supportingData.bestRate || 0) * 100,
          responseRate: (supportingData.responseRate || 0) * 100,
          interviewRate: (supportingData.interviewRate || 0) * 100,
        },
        {
          name: "Average",
          offerRate: (supportingData.currentRate || 0) * 100,
          responseRate: 0,
          interviewRate: 0,
        }
      );
    } else if (supportingData.bestDay) {
      // Timing recommendation
      return null; // Timing data handled differently
    }
    
    return data.length > 0 ? data : null;
  };

  const chartData = prepareComparisonData();

  return (
    <div className="mt-4 space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {supportingData.bestRate !== undefined && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-700 mb-1">Best Performance</p>
            <p className="text-lg font-bold text-blue-900">
              {((supportingData.bestRate || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-blue-600">Offer Rate</p>
          </div>
        )}
        {supportingData.secondRate !== undefined && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-700 mb-1">Comparison</p>
            <p className="text-lg font-bold text-slate-900">
              {((supportingData.secondRate || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-600">Other Versions</p>
          </div>
        )}
        {supportingData.applicationCount !== undefined && (
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-xs text-green-700 mb-1">Sample Size</p>
            <p className="text-lg font-bold text-green-900">
              {supportingData.applicationCount || supportingData.usageCount || 0}
            </p>
            <p className="text-xs text-green-600">Applications</p>
          </div>
        )}
        {supportingData.bestDay && (
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <p className="text-xs text-purple-700 mb-1">Best Day</p>
            <p className="text-lg font-bold text-purple-900">{supportingData.bestDay}</p>
            <p className="text-xs text-purple-600">
              {((supportingData.offerRate || 0) * 100).toFixed(1)}% offer rate
            </p>
          </div>
        )}
        {supportingData.bestHour !== undefined && (
          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
            <p className="text-xs text-indigo-700 mb-1">Best Hour</p>
            <p className="text-lg font-bold text-indigo-900">{supportingData.bestHour}:00</p>
            <p className="text-xs text-indigo-600">
              {((supportingData.offerRate || 0) * 100).toFixed(1)}% offer rate
            </p>
          </div>
        )}
      </div>

      {/* Comparison Chart */}
      {chartData && chartData.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <h5 className="text-sm font-semibold text-slate-900 mb-3">Performance Comparison</h5>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
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
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
              />
              <Legend />
              <Bar dataKey="offerRate" fill="#10B981" name="Offer Rate" radius={[4, 4, 0, 0]} />
              {chartData.some((d) => d.responseRate > 0) && (
                <Bar dataKey="responseRate" fill="#3B82F6" name="Response Rate" radius={[4, 4, 0, 0]} />
              )}
              {chartData.some((d) => d.interviewRate > 0) && (
                <Bar dataKey="interviewRate" fill="#8B5CF6" name="Interview Rate" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Improvement Estimate */}
      {recommendation.estimatedImprovement && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="mingcute:trending-up-line" className="text-green-600" width={20} />
            <p className="text-sm font-semibold text-green-900">Potential Improvement</p>
          </div>
          <p className="text-2xl font-bold text-green-700">
            +{recommendation.estimatedImprovement}%
          </p>
          <p className="text-xs text-green-600 mt-1">
            Estimated increase in offer rate if you follow this recommendation
          </p>
        </div>
      )}
    </div>
  );
}

