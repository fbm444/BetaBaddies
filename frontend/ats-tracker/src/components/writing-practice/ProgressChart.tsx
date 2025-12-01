import { useEffect, useRef } from "react";
import type { ProgressTrend } from "../../types";

interface ProgressChartProps {
  trends: ProgressTrend[];
  title: string;
  color: string;
}

export function ProgressChart({ trends, title, color }: ProgressChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || trends.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (trends.length === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No data available", width / 2, height / 2);
      return;
    }

    // Find min and max values
    const scores = trends.map((t) => t.avgScore);
    const minScore = Math.min(...scores, 0);
    const maxScore = Math.max(...scores, 10);
    const scoreRange = maxScore - minScore || 10;

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
      const value = maxScore - (scoreRange / 5) * i;
      const y = padding + (chartHeight / 5) * i;
      ctx.fillText(value.toFixed(1), padding - 10, y + 4);
    }

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    trends.forEach((trend, index) => {
      const x = padding + (chartWidth / (trends.length - 1 || 1)) * index;
      const y =
        padding +
        chartHeight -
        ((trend.avgScore - minScore) / scoreRange) * chartHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points
    ctx.fillStyle = color;
    trends.forEach((trend, index) => {
      const x = padding + (chartWidth / (trends.length - 1 || 1)) * index;
      const y =
        padding +
        chartHeight -
        ((trend.avgScore - minScore) / scoreRange) * chartHeight;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw X-axis labels (dates)
    ctx.fillStyle = "#64748b";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    trends.forEach((trend, index) => {
      const x = padding + (chartWidth / (trends.length - 1 || 1)) * index;
      const date = new Date(trend.period);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      ctx.fillText(label, x, height - padding + 20);
    });
  }, [trends, color]);

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <h4 className="text-sm font-semibold text-slate-900 mb-3">{title}</h4>
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="w-full"
        style={{ maxWidth: "100%" }}
      />
    </div>
  );
}

