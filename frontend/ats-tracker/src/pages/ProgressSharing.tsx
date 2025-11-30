import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";

export function ProgressSharing() {
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("week");

  useEffect(() => {
    fetchProgressReport();
  }, [period]);

  const fetchProgressReport = async () => {
    try {
      setIsLoading(true);
      const response = await api.generateProgressReport(period);
      if (response.ok && response.data) {
        setReport(response.data.report);
      }
    } catch (error) {
      console.error("Failed to fetch progress report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon icon="mingcute:loading-line" width={48} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Progress Sharing</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
        </select>
      </div>

      {report && (
        <div className="space-y-6">
          {/* Progress Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Progress Report</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {report.jobSearch?.applications_submitted || 0}
                </div>
                <div className="text-sm text-slate-600">Applications</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {report.jobSearch?.interviews_scheduled || 0}
                </div>
                <div className="text-sm text-slate-600">Interviews</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {report.tasks?.tasks_completed || 0}
                </div>
                <div className="text-sm text-slate-600">Tasks Completed</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {report.milestones?.length || 0}
                </div>
                <div className="text-sm text-slate-600">Milestones</div>
              </div>
            </div>
          </div>

          {/* Milestones */}
          {report.milestones && report.milestones.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Recent Milestones</h3>
              <div className="space-y-3">
                {report.milestones.map((milestone: any, idx: number) => (
                  <div key={idx} className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <div className="font-semibold text-slate-900">{milestone.milestone_title}</div>
                    <div className="text-sm text-slate-600">
                      {new Date(milestone.achieved_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

