import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface RoleTypeAnalysisCardProps {
  dateRange?: { startDate?: string; endDate?: string };
}

export function RoleTypeAnalysisCard({ dateRange }: RoleTypeAnalysisCardProps) {
  const [rolePerformance, setRolePerformance] = useState<any[]>([]);
  const [bestRoles, setBestRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoleData();
  }, [dateRange]);

  const fetchRoleData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [performance, best] = await Promise.all([
        api.getRoleTypePerformance(),
        api.getBestRoleTypes(10),
      ]);

      if (performance.ok && performance.data) {
        setRolePerformance(performance.data.performance || []);
      }
      if (best.ok && best.data) {
        setBestRoles(best.data.roles || []);
      }
    } catch (err: any) {
      console.error("Error fetching role data:", err);
      setError(err.message || "Failed to load role analysis");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading role analysis...</p>
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Role Type Analysis</h2>
        <p className="text-slate-600 mb-6">
          Highlight which types of roles yield best response rates
        </p>
      </div>

      {/* Best Performing Roles */}
      {bestRoles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Performing Role Types</h3>
          <div className="space-y-3">
            {bestRoles.map((role, index) => (
              <div
                key={role.roleType || index}
                className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-5 border border-indigo-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <h4 className="text-lg font-semibold text-slate-900">
                        {role.roleType || "Unknown Role Type"}
                      </h4>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Response Rate</p>
                        <p className="text-lg font-bold text-slate-900">
                          {role.responseRate ? `${(role.responseRate * 100).toFixed(1)}%` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Interview Rate</p>
                        <p className="text-lg font-bold text-slate-900">
                          {role.interviewRate ? `${(role.interviewRate * 100).toFixed(1)}%` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Applications</p>
                        <p className="text-lg font-bold text-slate-900">{role.applicationCount || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Role Performance */}
      {rolePerformance.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">All Role Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolePerformance.map((role, index) => (
              <div
                key={role.roleType || index}
                className="bg-slate-50 rounded-lg p-4 border border-slate-200"
              >
                <h4 className="font-semibold text-slate-900 mb-2">{role.roleType || "Unknown"}</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Response:</span>
                    <span className="font-semibold text-slate-900">
                      {role.responseRate ? `${(role.responseRate * 100).toFixed(1)}%` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Applications:</span>
                    <span className="font-semibold text-slate-900">{role.applicationCount || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bestRoles.length === 0 && rolePerformance.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <Icon icon="mingcute:briefcase-line" className="mx-auto mb-3 text-slate-400" width={48} />
          <p className="text-slate-600">No role type data available</p>
          <p className="text-sm text-slate-500 mt-1">
            Apply to different role types to see which perform best
          </p>
        </div>
      )}
    </div>
  );
}

