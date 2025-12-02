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
import type { SalaryProgressionEntry } from "../../types";

interface SalaryProgressionChartProps {
  entries: SalaryProgressionEntry[];
}

export function SalaryProgressionChart({ entries }: SalaryProgressionChartProps) {
  const chartData = useMemo(() => {
    if (entries.length === 0) return [];

    // Sort entries by date
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    );

    // Format data for chart
    return sortedEntries.map((entry) => {
      const date = new Date(entry.effectiveDate);
      return {
        period: `${date.getMonth() + 1}/${date.getFullYear()}`,
        date: date.toISOString(),
        salary: entry.totalCompensation,
      };
    });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm text-[#6D7A99]">No data available for chart</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData} margin={{ left: 10, right: 10, bottom: 60 }}>
        <defs>
          <linearGradient id="blueAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3351FD" />
            <stop offset="100%" stopColor="#1E3097" />
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
          tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`}
        />
        <Tooltip 
          contentStyle={{ fontFamily: 'Poppins', backgroundColor: 'white', border: '1px solid #D9D9D9', borderRadius: '8px' }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total Compensation']}
        />
        <Area
          type="monotone"
          dataKey="salary"
          stroke="url(#blueAreaGradient)"
          fill="url(#blueAreaGradient)"
          name="Total Compensation"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

