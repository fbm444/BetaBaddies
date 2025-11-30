import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface TeamPerformanceProps {
  teamId: string;
}

export function TeamPerformance({ teamId }: TeamPerformanceProps) {
  const [performance, setPerformance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformance();
  }, [teamId]);

  const fetchPerformance = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getTeamPerformance(teamId);
      if (response.ok && response.data) {
        setPerformance(response.data.performance);
      } else {
        setError("Failed to load team performance data");
      }
    } catch (err) {
      console.error("Failed to fetch team performance:", err);
      setError("Failed to load team performance data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon icon="mingcute:loading-line" width={32} className="animate-spin text-blue-500" />
        <span className="ml-3 text-slate-600">Loading performance data...</span>
      </div>
    );
  }

  if (error || !performance) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || "Failed to load performance data"}</p>
      </div>
    );
  }

  const { totalMembers, averages, percentiles, anonymizedMembers } = performance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Team Performance Comparison</h2>
        <p className="text-slate-600">
          Anonymized benchmarking to help identify best practices and motivate team members
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Icon icon="mingcute:information-line" width={16} />
          <span>All data is anonymized to protect privacy</span>
        </div>
      </div>

      {/* Averages */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Team Averages</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {(averages?.applications ?? 0).toFixed(1)}
            </div>
            <div className="text-sm text-slate-600">Applications</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {(averages?.interviews ?? 0).toFixed(1)}
            </div>
            <div className="text-sm text-slate-600">Interviews</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {(averages?.offers ?? 0).toFixed(1)}
            </div>
            <div className="text-sm text-slate-600">Offers</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {(averages?.tasksCompleted ?? 0).toFixed(1)}
            </div>
            <div className="text-sm text-slate-600">Tasks Completed</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">
              {(averages?.milestones ?? 0).toFixed(1)}
            </div>
            <div className="text-sm text-slate-600">Milestones</div>
          </div>
        </div>
      </div>

      {/* Percentiles */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Performance Percentiles</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Applications</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-100 rounded p-2 text-center">
                <div className="text-xs text-slate-600">25th</div>
                <div className="font-bold text-slate-900">{percentiles?.applications?.p25 ?? 0}</div>
              </div>
              <div className="flex-1 bg-blue-100 rounded p-2 text-center">
                <div className="text-xs text-slate-600">50th (Median)</div>
                <div className="font-bold text-blue-900">{percentiles?.applications?.p50 ?? 0}</div>
              </div>
              <div className="flex-1 bg-slate-100 rounded p-2 text-center">
                <div className="text-xs text-slate-600">75th</div>
                <div className="font-bold text-slate-900">{percentiles?.applications?.p75 ?? 0}</div>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Interviews</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-100 rounded p-2 text-center">
                <div className="text-xs text-slate-600">25th</div>
                <div className="font-bold text-slate-900">{percentiles?.interviews?.p25 ?? 0}</div>
              </div>
              <div className="flex-1 bg-purple-100 rounded p-2 text-center">
                <div className="text-xs text-slate-600">50th (Median)</div>
                <div className="font-bold text-purple-900">{percentiles?.interviews?.p50 ?? 0}</div>
              </div>
              <div className="flex-1 bg-slate-100 rounded p-2 text-center">
                <div className="text-xs text-slate-600">75th</div>
                <div className="font-bold text-slate-900">{percentiles?.interviews?.p75 ?? 0}</div>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Offers</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-100 rounded p-2 text-center">
                <div className="text-xs text-slate-600">25th</div>
                <div className="font-bold text-slate-900">{percentiles?.offers?.p25 ?? 0}</div>
              </div>
              <div className="flex-1 bg-green-100 rounded p-2 text-center">
                <div className="text-xs text-slate-600">50th (Median)</div>
                <div className="font-bold text-green-900">{percentiles?.offers?.p50 ?? 0}</div>
              </div>
              <div className="flex-1 bg-slate-100 rounded p-2 text-center">
                <div className="text-xs text-slate-600">75th</div>
                <div className="font-bold text-slate-900">{percentiles?.offers?.p75 ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Anonymized Member Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-4">
          Member Performance (Anonymized)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Member
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Applications
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Interviews
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Offers
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Tasks
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Milestones
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Tier
                </th>
              </tr>
            </thead>
            <tbody>
              {anonymizedMembers && anonymizedMembers.length > 0 ? (
                anonymizedMembers.map((member: any, index: number) => (
                  <tr key={member.memberId} className="border-b border-slate-100">
                    <td className="py-3 px-4 text-sm text-slate-900">{member.memberId}</td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700">
                      {member.applicationsCount ?? 0}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700">
                      {member.interviewsCount ?? 0}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700">
                      {member.offersCount ?? 0}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700">
                      {member.tasksCompleted ?? 0}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-slate-700">
                      {member.milestonesAchieved ?? 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          member.performanceTier === "high"
                            ? "bg-green-100 text-green-800"
                            : member.performanceTier === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {member.performanceTier || "low"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No performance data available yet. Data will appear as team members track their job search progress.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-slate-500 text-center">
          Total Members: {totalMembers}
        </div>
      </div>
    </div>
  );
}

