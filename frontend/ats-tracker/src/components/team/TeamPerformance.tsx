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
      setError("Failed to load performance data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <Icon icon="mingcute:chart-line" width={64} className="animate-pulse text-blue-500" />
          <Icon 
            icon="mingcute:loading-line" 
            width={32} 
            className="animate-spin text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
          />
        </div>
        <span className="mt-4 text-slate-600 font-medium">Loading performance data...</span>
      </div>
    );
  }

  if (error || !performance) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-200 rounded-full">
            <Icon icon="mingcute:alert-line" width={24} className="text-red-600" />
          </div>
          <div>
            <p className="text-red-900 font-semibold text-lg">Error Loading Data</p>
            <p className="text-red-700 text-sm mt-1">{error || "Failed to load performance data"}</p>
          </div>
        </div>
      </div>
    );
  }

  const { totalMembers, averages, percentiles, anonymizedMembers } = performance;

  const metricCards = [
    {
      label: "Applications",
      value: averages?.applications ?? 0,
      icon: "mingcute:file-edit-line",
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
    },
    {
      label: "Interviews",
      value: averages?.interviews ?? 0,
      icon: "mingcute:calendar-event-line",
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-50 to-purple-100",
      textColor: "text-purple-700",
      borderColor: "border-purple-200",
    },
    {
      label: "Offers",
      value: averages?.offers ?? 0,
      icon: "mingcute:gift-line",
      gradient: "from-green-500 to-green-600",
      bgGradient: "from-green-50 to-green-100",
      textColor: "text-green-700",
      borderColor: "border-green-200",
    },
    {
      label: "Tasks Completed",
      value: averages?.tasksCompleted ?? 0,
      icon: "mingcute:check-circle-line",
      gradient: "from-yellow-500 to-yellow-600",
      bgGradient: "from-yellow-50 to-yellow-100",
      textColor: "text-yellow-700",
      borderColor: "border-yellow-200",
    },
    {
      label: "Milestones",
      value: averages?.milestones ?? 0,
      icon: "mingcute:trophy-line",
      gradient: "from-orange-500 to-orange-600",
      bgGradient: "from-orange-50 to-orange-100",
      textColor: "text-orange-700",
      borderColor: "border-orange-200",
    },
  ];

  const percentileMetrics = [
    {
      label: "Applications",
      icon: "mingcute:file-edit-line",
      color: "blue",
      data: percentiles?.applications,
    },
    {
      label: "Interviews",
      icon: "mingcute:calendar-event-line",
      color: "purple",
      data: percentiles?.interviews,
    },
    {
      label: "Offers",
      icon: "mingcute:gift-line",
      color: "green",
      data: percentiles?.offers,
    },
  ];

  const getTierBadge = (tier: string) => {
    const styles = {
      high: {
        bg: "bg-gradient-to-r from-green-500 to-emerald-500",
        text: "text-white",
        icon: "mingcute:arrow-up-line",
      },
      medium: {
        bg: "bg-gradient-to-r from-yellow-400 to-orange-400",
        text: "text-white",
        icon: "mingcute:arrow-right-line",
      },
      low: {
        bg: "bg-gradient-to-r from-slate-400 to-slate-500",
        text: "text-white",
        icon: "mingcute:arrow-down-line",
      },
    };
    const style = styles[tier as keyof typeof styles] || styles.low;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${style.bg} ${style.text}`}>
        <Icon icon={style.icon} width={12} />
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl shadow-2xl p-8 text-white">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
              <Icon icon="mingcute:chart-2-line" width={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">Team Performance Dashboard</h2>
              <p className="text-blue-100 text-sm">
                Anonymized benchmarking to identify best practices and motivate team members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-6 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg w-fit">
            <Icon icon="mingcute:shield-check-line" width={18} className="text-blue-200" />
            <span className="text-sm text-blue-100">All data is anonymized to protect privacy</span>
          </div>
        </div>
      </div>

      {/* Team Averages - Enhanced Cards */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <Icon icon="mingcute:bar-chart-line" width={24} className="text-white" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">Team Averages</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {metricCards.map((metric, index) => (
            <div
              key={index}
              className={`relative overflow-hidden bg-gradient-to-br ${metric.bgGradient} border-2 ${metric.borderColor} rounded-xl p-5 hover:shadow-xl transition-all duration-300 hover:scale-105 group`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 bg-gradient-to-br ${metric.gradient} rounded-lg shadow-md`}>
                    <Icon icon={metric.icon} width={20} className="text-white" />
                  </div>
                </div>
                <div className={`text-4xl font-bold ${metric.textColor} mb-1`}>
                  {metric.value.toFixed(1)}
                </div>
                <div className={`text-sm font-medium ${metric.textColor} opacity-80`}>
                  {metric.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Percentiles - Enhanced */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
            <Icon icon="mingcute:pie-chart-line" width={24} className="text-white" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">Performance Percentiles</h3>
        </div>
        <div className="space-y-6">
          {percentileMetrics.map((metric, index) => {
            const colorClasses = {
              blue: {
                bg: "bg-blue-100",
                text: "text-blue-900",
                border: "border-blue-300",
                gradient: "from-blue-500 to-blue-600",
              },
              purple: {
                bg: "bg-purple-100",
                text: "text-purple-900",
                border: "border-purple-300",
                gradient: "from-purple-500 to-purple-600",
              },
              green: {
                bg: "bg-green-100",
                text: "text-green-900",
                border: "border-green-300",
                gradient: "from-green-500 to-green-600",
              },
            };
            const colors = colorClasses[metric.color as keyof typeof colorClasses];
            const maxValue = Math.max(
              metric.data?.p25 ?? 0,
              metric.data?.p50 ?? 0,
              metric.data?.p75 ?? 0,
              1
            );

            return (
              <div key={index} className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Icon icon={metric.icon} width={20} className={colors.text} />
                  <span className="font-semibold text-slate-900">{metric.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`${colors.bg} border-2 ${colors.border} rounded-xl p-4 text-center hover:shadow-md transition-shadow`}>
                    <div className="text-xs font-medium text-slate-600 mb-2">25th Percentile</div>
                    <div className={`text-2xl font-bold ${colors.text}`}>
                      {metric.data?.p25 ?? 0}
                    </div>
                    <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full transition-all duration-500`}
                        style={{ width: `${((metric.data?.p25 ?? 0) / maxValue) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className={`${colors.bg} border-2 ${colors.border} rounded-xl p-4 text-center hover:shadow-lg transition-shadow scale-105 relative`}>
                    <div className={`absolute -top-2 -right-2 bg-gradient-to-r ${colors.gradient} text-white text-xs font-bold px-2 py-1 rounded-full shadow-md`}>
                      MEDIAN
                    </div>
                    <div className="text-xs font-medium text-slate-600 mb-2">50th Percentile</div>
                    <div className={`text-2xl font-bold ${colors.text}`}>
                      {metric.data?.p50 ?? 0}
                    </div>
                    <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full transition-all duration-500`}
                        style={{ width: `${((metric.data?.p50 ?? 0) / maxValue) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className={`${colors.bg} border-2 ${colors.border} rounded-xl p-4 text-center hover:shadow-md transition-shadow`}>
                    <div className="text-xs font-medium text-slate-600 mb-2">75th Percentile</div>
                    <div className={`text-2xl font-bold ${colors.text}`}>
                      {metric.data?.p75 ?? 0}
                    </div>
                    <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full transition-all duration-500`}
                        style={{ width: `${((metric.data?.p75 ?? 0) / maxValue) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Anonymized Member Performance - Enhanced Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg">
              <Icon icon="mingcute:user-group-line" width={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Member Performance</h3>
              <p className="text-sm text-slate-500 mt-1">Anonymized data for privacy protection</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 rounded-lg">
            <span className="text-sm font-semibold text-slate-700">
              {totalMembers} {totalMembers === 1 ? "Member" : "Members"}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Icon icon="mingcute:user-line" width={16} />
                    Member ID
                  </div>
                </th>
                <th className="text-center py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <Icon icon="mingcute:file-edit-line" width={16} />
                    Applications
                  </div>
                </th>
                <th className="text-center py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <Icon icon="mingcute:calendar-event-line" width={16} />
                    Interviews
                  </div>
                </th>
                <th className="text-center py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <Icon icon="mingcute:gift-line" width={16} />
                    Offers
                  </div>
                </th>
                <th className="text-center py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <Icon icon="mingcute:check-circle-line" width={16} />
                    Tasks
                  </div>
                </th>
                <th className="text-center py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <Icon icon="mingcute:trophy-line" width={16} />
                    Milestones
                  </div>
                </th>
                <th className="text-center py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <Icon icon="mingcute:chart-line" width={16} />
                    Tier
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {anonymizedMembers && anonymizedMembers.length > 0 ? (
                anonymizedMembers.map((member: any, index: number) => (
                  <tr
                    key={member.memberId}
                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors duration-200 border-b border-slate-50"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="font-mono text-sm font-semibold text-slate-900">
                          {member.memberId}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 font-bold rounded-lg">
                        {member.applicationsCount ?? 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 text-purple-700 font-bold rounded-lg">
                        {member.interviewsCount ?? 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-green-100 text-green-700 font-bold rounded-lg">
                        {member.offersCount ?? 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-yellow-100 text-yellow-700 font-bold rounded-lg">
                        {member.tasksCompleted ?? 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-orange-100 text-orange-700 font-bold rounded-lg">
                        {member.milestonesAchieved ?? 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {getTierBadge(member.performanceTier || "low")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-slate-100 rounded-full">
                        <Icon icon="mingcute:chart-line" width={48} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium text-lg mb-1">
                          No performance data available yet
                        </p>
                        <p className="text-slate-500 text-sm">
                          Data will appear as team members track their job search progress
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
