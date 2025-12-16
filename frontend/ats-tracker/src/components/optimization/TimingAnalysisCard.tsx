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
      {optimalTiming && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <Icon icon="mingcute:time-line" className="text-green-600" width={32} />
            <h3 className="text-lg font-semibold text-green-900">Recommended Timing</h3>
          </div>
          <div className="space-y-2">
            {optimalTiming.bestDayOfWeek && (
              <p className="text-sm text-green-700">
                <span className="font-semibold">Best Day:</span> {optimalTiming.bestDayOfWeek}
              </p>
            )}
            {optimalTiming.bestHourOfDay && (
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
              const data = dayOfWeek.find((d: any) => d.dayOfWeek === index + 1);
              const responseRate = data?.responseRate || 0;
              return (
                <div
                  key={day}
                  className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center"
                >
                  <p className="text-xs font-medium text-slate-600 mb-2">{day.slice(0, 3)}</p>
                  <p className="text-lg font-bold text-slate-900">
                    {responseRate > 0 ? `${(responseRate * 100).toFixed(0)}%` : "—"}
                  </p>
                  {data && (
                    <p className="text-xs text-slate-500 mt-1">{data.applicationCount || 0} apps</p>
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
              return (
                <div
                  key={i}
                  className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-center"
                >
                  <p className="text-xs font-medium text-slate-600 mb-1">{i}:00</p>
                  <p className="text-sm font-bold text-slate-900">
                    {responseRate > 0 ? `${(responseRate * 100).toFixed(0)}%` : "—"}
                  </p>
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

