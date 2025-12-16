import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface TimingAnalysisCardProps {
  dateRange?: { startDate?: string; endDate?: string };
}

export function TimingAnalysisCard({ dateRange }: TimingAnalysisCardProps) {
  const [optimalTiming, setOptimalTiming] = useState<any>(null);
  const [dayOfWeek, setDayOfWeek] = useState<any[]>([]);
  const [hourOfDay, setHourOfDay] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimingData();
  }, [dateRange]);

  const fetchTimingData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [optimal, day, hour] = await Promise.all([
        api.getOptimalTiming(),
        api.getDayOfWeekPerformance(),
        api.getHourOfDayPerformance(),
      ]);

      if (optimal.ok && optimal.data) {
        setOptimalTiming(optimal.data.timing);
      }
      if (day.ok && day.data) {
        setDayOfWeek(day.data.performance || []);
      }
      if (hour.ok && hour.data) {
        setHourOfDay(hour.data.performance || []);
      }
    } catch (err: any) {
      console.error("Error fetching timing data:", err);
      setError(err.message || "Failed to load timing analysis");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading timing analysis...</p>
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

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Optimal Application Timing</h2>
        <p className="text-slate-600 mb-6">
          Identify optimal application timing based on your historical data
        </p>
      </div>

      {/* Optimal Timing Recommendation */}
      {optimalTiming && (optimalTiming.bestDayOfWeek || optimalTiming.bestHourOfDay || optimalTiming.recommendations) && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <Icon icon="mingcute:time-line" className="text-green-600" width={32} />
            <h3 className="text-lg font-semibold text-green-900">Recommended Timing</h3>
          </div>
          <div className="space-y-2">
            {optimalTiming.recommendations?.bestDay && (
              <p className="text-sm text-green-700">
                <span className="font-semibold">Best Day:</span> {optimalTiming.recommendations.bestDay.dayName || `Day ${optimalTiming.recommendations.bestDay.day}`}
                {optimalTiming.recommendations.bestDay.responseRate && (
                  <span className="text-xs text-green-600 ml-2">
                    ({((optimalTiming.recommendations.bestDay.responseRate || 0) * 100).toFixed(1)}% response rate)
                  </span>
                )}
              </p>
            )}
            {optimalTiming.recommendations?.bestHour && (
              <p className="text-sm text-green-700">
                <span className="font-semibold">Best Hour:</span> {optimalTiming.recommendations.bestHour.hour}:00
                {optimalTiming.recommendations.bestHour.responseRate && (
                  <span className="text-xs text-green-600 ml-2">
                    ({((optimalTiming.recommendations.bestHour.responseRate || 0) * 100).toFixed(1)}% response rate)
                  </span>
                )}
              </p>
            )}
            {optimalTiming.bestDayOfWeek && !optimalTiming.recommendations?.bestDay && (
              <p className="text-sm text-green-700">
                <span className="font-semibold">Best Day:</span> {optimalTiming.bestDayOfWeek}
              </p>
            )}
            {optimalTiming.bestHourOfDay && !optimalTiming.recommendations?.bestHour && (
              <p className="text-sm text-green-700">
                <span className="font-semibold">Best Hour:</span> {optimalTiming.bestHourOfDay}:00
              </p>
            )}
            {optimalTiming.reasoning && (
              <p className="text-xs text-green-600 mt-2 italic">{optimalTiming.reasoning}</p>
            )}
          </div>
        </div>
      )}

      {/* Day of Week Performance */}
      {dayOfWeek.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance by Day of Week</h3>
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map((day, index) => {
              // PostgreSQL DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
              // Our array: 0=Monday, 1=Tuesday, ..., 6=Sunday
              // So we need to map: index 0 (Monday) -> DOW 1, index 6 (Sunday) -> DOW 0
              const dowValue = index === 6 ? 0 : index + 1;
              const data = dayOfWeek.find((d: any) => {
                const dDay = d.dayOfWeek;
                // Handle both formats: 1-7 (Monday-Sunday) or 0-6 (Sunday-Saturday)
                return dDay === dowValue || (dDay === index + 1 && index !== 6);
              });
              const responseRate = data?.responseRate || 0;
              const maxRate = Math.max(...dayOfWeek.map((d: any) => d.responseRate || 0), 0);
              const isBest = maxRate > 0 && responseRate === maxRate;
              return (
                <div
                  key={day}
                  className={`rounded-lg p-4 border text-center transition-all ${
                    isBest
                      ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-sm"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <p className="text-xs font-medium text-slate-600 mb-2">{day.slice(0, 3)}</p>
                  <p className={`text-lg font-bold ${isBest ? "text-green-700" : "text-slate-900"}`}>
                    {responseRate > 0 ? `${(responseRate * 100).toFixed(0)}%` : "—"}
                  </p>
                  {data && (
                    <p className="text-xs text-slate-500 mt-1">{data.applicationCount || 0} apps</p>
                  )}
                  {isBest && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-200 text-green-700 text-xs font-semibold rounded">
                      Best
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hour of Day Performance */}
      {hourOfDay.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance by Hour of Day</h3>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 24 }, (_, i) => {
              const data = hourOfDay.find((h: any) => h.hourOfDay === i);
              const responseRate = data?.responseRate || 0;
              const maxRate = Math.max(...hourOfDay.map((h: any) => h.responseRate || 0), 0);
              const isBest = maxRate > 0 && responseRate === maxRate;
              return (
                <div
                  key={i}
                  className={`rounded-lg p-3 border text-center transition-all ${
                    isBest
                      ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-sm"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <p className="text-xs font-medium text-slate-600 mb-1">{i}:00</p>
                  <p className={`text-sm font-bold ${isBest ? "text-green-700" : "text-slate-900"}`}>
                    {responseRate > 0 ? `${(responseRate * 100).toFixed(0)}%` : "—"}
                  </p>
                  {data && data.applicationCount > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5">{data.applicationCount}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!optimalTiming && dayOfWeek.length === 0 && hourOfDay.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <Icon icon="mingcute:time-line" className="mx-auto mb-3 text-slate-400" width={48} />
          <p className="text-slate-600">No timing data available</p>
          <p className="text-sm text-slate-500 mt-1">
            Submit more applications to see timing insights
          </p>
        </div>
      )}
    </div>
  );
}

