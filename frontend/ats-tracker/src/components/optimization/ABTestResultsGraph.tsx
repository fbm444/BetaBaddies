import { Icon } from "@iconify/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ABTestResultsGraphProps {
  test: any;
  results: any;
  onClose?: () => void;
}

export function ABTestResultsGraph({ test, results, onClose }: ABTestResultsGraphProps) {
  // Prepare chart data
  const chartData: any[] = [];
  
  // Control group
  if (test.controlGroupConfig || results?.control) {
    const control = results?.control || test.results?.control || {};
    chartData.push({
      name: test.controlGroupConfig?.name || "Control",
      responseRate: (control.responseRate || 0) * 100,
      interviewRate: (control.interviewRate || 0) * 100,
      offerRate: (control.offerRate || 0) * 100,
      sampleSize: control.sampleSize || control.applicationCount || 0,
    });
  }

  // Variant groups
  if (test.variantGroups && Array.isArray(test.variantGroups)) {
    test.variantGroups.forEach((variant: any, index: number) => {
      const variantKey = `variant_${String.fromCharCode(97 + index)}`;
      const variantData = results?.[variantKey] || test.results?.[variantKey] || {};
      chartData.push({
        name: variant.name || `Variant ${String.fromCharCode(65 + index)}`,
        responseRate: (variantData.responseRate || 0) * 100,
        interviewRate: (variantData.interviewRate || 0) * 100,
        offerRate: (variantData.offerRate || 0) * 100,
        sampleSize: variantData.sampleSize || variantData.applicationCount || 0,
      });
    });
  } else if (results?.variant_a || test.results?.variantA) {
    const variantA = results?.variant_a || test.results?.variantA || {};
    chartData.push({
      name: "Variant A",
      responseRate: (variantA.responseRate || 0) * 100,
      interviewRate: (variantA.interviewRate || 0) * 100,
      offerRate: (variantA.offerRate || 0) * 100,
      sampleSize: variantA.sampleSize || variantA.applicationCount || 0,
    });
  }

  // Pie chart data for sample size distribution
  const pieData = chartData.map((item) => ({
    name: item.name,
    value: item.sampleSize,
  }));

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
        <Icon icon="mingcute:chart-line" className="mx-auto mb-3 text-slate-400" width={48} />
        <p className="text-slate-600">No results data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {onClose && (
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-slate-900">Test Results Visualization</h4>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Icon icon="mingcute:close-line" width={20} />
          </button>
        </div>
      )}

      {/* Performance Metrics Comparison */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h5 className="text-sm font-semibold text-slate-900 mb-4">Performance Metrics Comparison</h5>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
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
              label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)}%`,
                name === 'responseRate' ? 'Response Rate' : name === 'interviewRate' ? 'Interview Rate' : 'Offer Rate'
              ]}
            />
            <Legend
              formatter={(value) => {
                const labels: { [key: string]: string } = {
                  responseRate: 'Response Rate',
                  interviewRate: 'Interview Rate',
                  offerRate: 'Offer Rate',
                };
                return labels[value] || value;
              }}
            />
            <Bar dataKey="responseRate" fill="#3B82F6" name="responseRate" radius={[4, 4, 0, 0]} />
            <Bar dataKey="interviewRate" fill="#8B5CF6" name="interviewRate" radius={[4, 4, 0, 0]} />
            <Bar dataKey="offerRate" fill="#10B981" name="offerRate" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sample Size Distribution */}
      {pieData.some((item) => item.value > 0) && (
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h5 className="text-sm font-semibold text-slate-900 mb-4">Sample Size Distribution</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} applications`, 'Sample Size']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center space-y-2">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-600">
                      {item.sampleSize} applications • Response: {item.responseRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Statistical Summary */}
      {chartData.length >= 2 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <h5 className="text-sm font-semibold text-slate-900 mb-3">Statistical Summary</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {chartData.map((item, index) => {
              const improvement = index > 0
                ? ((item.offerRate - chartData[0].offerRate) / chartData[0].offerRate) * 100
                : 0;
              return (
                <div key={index} className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-xs font-medium text-slate-600 mb-1">{item.name}</p>
                  <p className="text-lg font-bold text-slate-900">
                    {item.offerRate.toFixed(1)}%
                  </p>
                  {index > 0 && (
                    <p
                      className={`text-xs mt-1 ${
                        improvement > 0 ? "text-green-600" : improvement < 0 ? "text-red-600" : "text-slate-500"
                      }`}
                    >
                      {improvement > 0 ? "+" : ""}
                      {improvement.toFixed(1)}% vs Control
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

