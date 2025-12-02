import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ProgressTrend } from "../../types";

interface ProgressChartProps {
  trends: ProgressTrend[];
  title: string;
  color: string;
}

export function ProgressChart({ trends, title, color }: ProgressChartProps) {
  const chartData = useMemo(() => {
    if (trends.length === 0) return [];

    // Sort trends by period
    const sortedTrends = [...trends].sort(
      (a, b) => new Date(a.period).getTime() - new Date(b.period).getTime()
    );

    // Format data for chart
    return sortedTrends.map((trend) => {
      const date = new Date(trend.period);
      return {
        period: `${date.getMonth() + 1}/${date.getFullYear()}`,
        date: date.toISOString(),
        score: trend.avgScore,
      };
    });
  }, [trends]);

  if (trends.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">{title}</h4>
        <div className="h-[200px] flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-[#6D7A99]">No data available</p>
        </div>
      </div>
    );
  }

  // Create gradient ID based on color
  const gradientId = `areaGradient-${color.replace('#', '')}`;

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <h4 className="text-sm font-semibold text-slate-900 mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ left: 10, right: 10, bottom: 60 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={color} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
          <XAxis 
            dataKey="period" 
            tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }} 
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
            domain={[0, 10]}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <Tooltip 
            contentStyle={{ fontFamily: 'Poppins', backgroundColor: 'white', border: '1px solid #D9D9D9', borderRadius: '8px' }}
            formatter={(value: number) => [value.toFixed(1), 'Score']}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke={color}
            fill={`url(#${gradientId})`}
            name="Score"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

