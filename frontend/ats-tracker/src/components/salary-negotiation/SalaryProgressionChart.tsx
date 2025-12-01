import { useEffect, useRef } from "react";
import type { SalaryProgressionEntry } from "../../types";

interface SalaryProgressionChartProps {
  entries: SalaryProgressionEntry[];
}

export function SalaryProgressionChart({ entries }: SalaryProgressionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size based on container
    const container = canvas.parentElement;
    if (container) {
      const containerWidth = container.clientWidth || 800;
      canvas.width = Math.max(800, containerWidth);
      canvas.height = 400;
    }

    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (entries.length === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No data available", width / 2, height / 2);
      return;
    }

    // Sort entries by date
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    );

    // Find min and max values
    const totals = sortedEntries.map((e) => e.totalCompensation);
    const minTotal = Math.min(...totals);
    const maxTotal = Math.max(...totals);
    const range = maxTotal - minTotal || maxTotal * 0.2; // Add 20% padding if range is 0
    const minValue = Math.max(0, minTotal - range * 0.1);
    const maxValue = maxTotal + range * 0.1;

    // Draw grid lines
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw Y-axis labels
    ctx.fillStyle = "#64748b";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const value = maxValue - ((maxValue - minValue) / 5) * i;
      const y = padding + (chartHeight / 5) * i;
      const label = value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${Math.round(value)}`;
      ctx.fillText(label, padding - 15, y + 4);
    }

    // Draw line for total compensation
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    sortedEntries.forEach((entry, index) => {
      const x = padding + (chartWidth / (sortedEntries.length - 1 || 1)) * index;
      const y =
        padding +
        chartHeight -
        ((entry.totalCompensation - minValue) / (maxValue - minValue)) * chartHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw gradient fill under the line
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.beginPath();
    sortedEntries.forEach((entry, index) => {
      const x = padding + (chartWidth / (sortedEntries.length - 1 || 1)) * index;
      const y =
        padding +
        chartHeight -
        ((entry.totalCompensation - minValue) / (maxValue - minValue)) * chartHeight;
      if (index === 0) {
        ctx.moveTo(x, height - padding);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(padding + chartWidth, height - padding);
    ctx.closePath();
    ctx.fill();

    // Draw points
    ctx.fillStyle = "#3b82f6";
    sortedEntries.forEach((entry, index) => {
      const x = padding + (chartWidth / (sortedEntries.length - 1 || 1)) * index;
      const y =
        padding +
        chartHeight -
        ((entry.totalCompensation - minValue) / (maxValue - minValue)) * chartHeight;
      
      // Outer ring
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
      ctx.fill();
      
      // Inner point
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      
      // White border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // Draw X-axis labels (dates)
    ctx.fillStyle = "#64748b";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    sortedEntries.forEach((entry, index) => {
      const x = padding + (chartWidth / (sortedEntries.length - 1 || 1)) * index;
      const date = new Date(entry.effectiveDate);
      const label = `${date.getMonth() + 1}/${date.getFullYear()}`;
      ctx.fillText(label, x, height - padding + 20);
    });

    // Add title
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Salary Progression", width / 2, 25);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Total Compensation Over Time</h4>
        <div className="h-[300px] flex items-center justify-center text-slate-500">
          <p>No data available for chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative bg-slate-50 rounded-lg p-6 border border-slate-200">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-auto"
          style={{ maxWidth: "100%" }}
        />
      </div>
    </div>
  );
}

