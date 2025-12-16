import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { ProductivityAnalytics, DateRange } from "../../types/analytics.types";
import { TimeLogModal } from "./TimeLogModal";

interface TimeProductivityAnalysisProps {
  dateRange?: DateRange;
}

export function TimeProductivityAnalysis({ dateRange }: TimeProductivityAnalysisProps) {
  const [productivityData, setProductivityData] = useState<ProductivityAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTimeLogModal, setShowTimeLogModal] = useState(false);
  
  // User's viewing preference
  const [viewMode, setViewMode] = useState<'manual' | 'estimated'>('estimated');

  // Fetch productivity data based on viewMode
  const fetchProductivityData = async (mode: 'manual' | 'estimated') => {
    try {
      setIsLoading(true);
      const response = await api.getProductivityAnalytics(dateRange, mode === 'manual');
      if (response.ok && response.data?.analytics) {
        setProductivityData(response.data.analytics);
      } else {
        setError("Failed to load productivity data");
      }
    } catch (err: any) {
      console.error("Error loading productivity data:", err);
      setError(err.message || "Failed to load productivity data");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchProductivityData(viewMode);
  }, [dateRange]);

  // Refetch productivity data when viewMode changes
  useEffect(() => {
    if (!isLoading) {
      fetchProductivityData(viewMode);
    }
  }, [viewMode]);

  const handleTimeLogged = async () => {
    // Refetch productivity data after logging time, switch to manual mode
    setViewMode('manual');
    await fetchProductivityData('manual');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#3351FD]" />
          <p className="text-sm text-[#6D7A99]">Loading productivity data...</p>
        </div>
      </div>
    );
  }

  if (error || !productivityData) {
    return (
      <div className="rounded-2xl border border-[#F5C4C4] bg-[#FDECEC] p-10 text-center">
        <Icon icon="mingcute:alert-line" className="mx-auto mb-3 text-red-500" width={40} />
        <p className="text-sm font-medium text-red-700">
          {error || "Failed to load productivity data. Please try again later."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4 font-poppins">Time Investment & Productivity Analysis</h2>
        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-600 font-poppins">
            Track your time investment, productivity patterns, and work-life balance metrics.
          </p>
          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'manual' ? 'estimated' : 'manual')}
              className={`px-4 py-2 rounded-full border transition-all text-sm font-medium ${
                viewMode === 'manual'
                  ? 'border-green-500 bg-green-50 hover:bg-green-100 text-green-700'
                  : 'border-blue-500 bg-blue-50 hover:bg-blue-100 text-blue-700'
              }`}
              title="Click to toggle between manual and estimated data"
            >
              {viewMode === 'manual' ? 'Your Logged Time' : 'Use Estimated Time'}
            </button>
            
            {/* Log Time Button */}
            <button
              onClick={() => setShowTimeLogModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#3351FD] text-white hover:bg-[#2941DD] transition-colors text-sm font-medium"
              title="Log your time spent on job search activities"
            >
              <Icon icon="mingcute:add-line" width={18} />
              Log Time
            </button>
          </div>
        </div>
      </div>

      {/* Time Investment Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#1E3097] to-[#3351FD] p-6 text-white min-h-[180px] lg:col-span-2">
          <p className="text-[22px] font-normal">Total Hours Invested</p>
          <p className="text-6xl font-medium leading-none text-[#E7EFFF]">
            {productivityData.timeInvestment.totalHoursInvested}
            <span className="text-sm font-normal text-white ml-1">hrs</span>
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-6 border border-slate-300 min-h-[180px] lg:col-span-2">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[18px] font-normal text-[#0F1D3A]">Avg. Hours/Week</p>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-5xl font-extralight text-[#5A87E6]">
              {productivityData.timeInvestment.avgHoursPerWeek}
            </p>
            <p className="text-xs text-[#6D7A99] mb-1">hrs</p>
          </div>
        </div>

        {/* Task Completion Metrics */}
        <div className="rounded-2xl bg-white p-4 border border-slate-300 min-h-[180px] flex flex-col lg:col-span-3">
          <h4 className="text-xs font-semibold text-[#0F1D3A] mb-2 flex items-center gap-1.5">
            <Icon icon="mingcute:checkbox-line" width={14} className="text-[#3351FD]" />
            Task Completion
          </h4>
          <div className="grid grid-cols-3 gap-2 flex-1 items-center">
            <div className="text-center p-2.5 rounded-lg bg-[#F8F9FF] flex flex-col justify-center">
              <p className="text-xs text-slate-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-[#0F1D3A]">
                {productivityData.taskMetrics.totalTasks}
              </p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-[#F8F9FF] flex flex-col justify-center">
              <p className="text-xs text-slate-600 mb-1">Done</p>
              <p className="text-2xl font-bold text-[#3351FD]">
                {productivityData.taskMetrics.completedTasks}
              </p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-[#F8F9FF] flex flex-col justify-center">
              <p className="text-xs text-slate-600 mb-1">Rate</p>
              <p className="text-2xl font-bold text-[#3351FD]">
                {productivityData.taskMetrics.completionRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Breakdown & Efficiency Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Breakdown */}
          <div className="rounded-2xl bg-white p-5 border border-slate-300">
            <h4 className="text-lg font-semibold text-[#0F1D3A] mb-4 flex items-center gap-2">
              <Icon icon="mingcute:chart-pie-line" width={20} className="text-[#3351FD]" />
              Time by Activity Type
            </h4>
            {productivityData.activityBreakdown.length > 0 ? (
              <div className="space-y-3">
                {productivityData.activityBreakdown.map((activity, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-[#1B2C4B]">{activity.activityType}</span>
                      <span className="text-[#6D7A99]">
                        {activity.hoursSpent}hrs ({activity.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEF0FB]">
                      <div
                        className="h-full rounded-full bg-[#3351FD] transition-all"
                        style={{ width: `${activity.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#94A3C0] mt-0.5">
                      {activity.tasksCompleted} tasks • {activity.avgTimePerTask}hrs avg
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6D7A99] text-center py-4">No activity data available</p>
            )}
          </div>

          {/* Efficiency Metrics */}
          <div className="rounded-2xl bg-white p-5 border border-slate-300">
            <h4 className="text-lg font-semibold text-[#0F1D3A] mb-4 flex items-center gap-2">
              <Icon icon="mingcute:rocket-line" width={20} className="text-[#3351FD]" />
              Efficiency Metrics
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8F9FF]">
                <span className="text-sm font-medium text-[#0F1D3A]">Applications per Hour</span>
                <span className="text-xl font-bold text-[#3351FD]">
                  {productivityData.efficiency.applicationEfficiency}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8F9FF]">
                <span className="text-sm font-medium text-[#0F1D3A]">Interviews per Hour</span>
                <span className="text-xl font-bold text-[#3351FD]">
                  {productivityData.efficiency.interviewEfficiency}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8F9FF]">
                <span className="text-sm font-medium text-[#0F1D3A]">Offers per Hour</span>
                <span className="text-xl font-bold text-[#3351FD]">
                  {productivityData.efficiency.offerEfficiency}
                </span>
              </div>
              {productivityData.efficiency.timeToOutcomeRatio > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8F9FF]">
                  <span className="text-sm font-medium text-[#0F1D3A]">Hours per Offer</span>
                  <span className="text-xl font-bold text-[#3351FD]">
                    {productivityData.efficiency.timeToOutcomeRatio}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Productivity Patterns */}
      {productivityData.productivityPatterns.byDayOfWeek.length > 0 && (
        <div className="rounded-2xl bg-white p-5 border border-slate-300">
            <h4 className="text-lg font-semibold text-[#0F1D3A] mb-4 flex items-center gap-2">
              <Icon icon="mingcute:chart-bar-line" width={20} className="text-[#3351FD]" />
              Productivity by Day of Week
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
              {productivityData.productivityPatterns.byDayOfWeek.map((day, index) => (
                <div
                  key={index}
                  className="text-center p-3 rounded-lg border border-slate-300 hover:bg-[#F8F9FF] transition-colors"
                >
                  <p className="text-xs font-semibold text-[#0F1D3A] mb-1">{day.day}</p>
                  <p className="text-lg font-bold text-[#3351FD]">{day.tasksCompleted}</p>
                  <p className="text-xs text-slate-600">{day.hours}hrs</p>
                  <div className="mt-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full ${
                      day.efficiency > 50 ? 'bg-green-100 text-green-700' :
                      day.efficiency > 25 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {day.efficiency}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {productivityData.timeInvestment.mostProductiveDay && (
              <p className="text-sm text-[#6D7A99] mt-3 text-center">
                💡 Most productive day: <strong className="text-[#3351FD]">{productivityData.timeInvestment.mostProductiveDay}</strong>
              </p>
            )}
          </div>
        )}


      {/* Recommendations & Wellness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendations */}
        {productivityData.recommendations.length > 0 && (
          <div className="rounded-2xl bg-white p-5 border border-slate-300">
              <h4 className="text-lg font-semibold text-[#0F1D3A] mb-4 flex items-center gap-2">
                <Icon icon="mingcute:bulb-line" width={20} className="text-[#3351FD]" />
                Productivity Recommendations
              </h4>
              <div className="space-y-3">
                {productivityData.recommendations.map((rec, index) => {
                  // Check if it's a positive/success message
                  const isPositive = rec.type === 'success' || 
                                    rec.message.toLowerCase().includes('excellent') ||
                                    rec.message.toLowerCase().includes('great') ||
                                    rec.message.toLowerCase().includes('well done');
                  
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-l-4 ${
                        isPositive
                          ? 'border-green-500 bg-green-50'
                          : rec.priority === 'high'
                          ? 'border-red-500 bg-red-50'
                          : rec.priority === 'medium'
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon
                          icon={
                            isPositive
                              ? 'mingcute:check-circle-line'
                              : rec.priority === 'high'
                              ? 'mingcute:alert-line'
                              : rec.priority === 'medium'
                              ? 'mingcute:warning-line'
                              : 'mingcute:information-line'
                          }
                          width={20}
                          className={
                            isPositive
                              ? 'text-green-600'
                              : rec.priority === 'high'
                              ? 'text-red-600'
                              : rec.priority === 'medium'
                              ? 'text-yellow-600'
                              : 'text-blue-600'
                          }
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#0F1D3A] mb-1">{rec.message}</p>
                          <p className="text-xs text-[#6D7A99]">💡 {rec.actionable}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Wellness & Burnout Indicators */}
        <div className="rounded-2xl bg-white p-5 border border-slate-300">
          <h4 className="text-lg font-semibold text-[#0F1D3A] mb-4 flex items-center gap-2">
            <Icon icon="mingcute:heart-line" width={20} className="text-[#3351FD]" />
            Work-Life Balance & Wellness
          </h4>
          <div className="space-y-4 mb-4">
            <div className="bg-white rounded-xl p-4 border border-slate-300">
              <p className="text-xs text-[#6D7A99] mb-2">Burnout Risk</p>
              <div className="flex items-center gap-2">
                <div
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    productivityData.wellnessIndicators.burnoutRisk === 'low'
                      ? 'bg-green-100 text-green-700'
                      : productivityData.wellnessIndicators.burnoutRisk === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {productivityData.wellnessIndicators.burnoutRisk.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-300">
              <p className="text-xs text-[#6D7A99] mb-2">Work-Life Balance Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      productivityData.wellnessIndicators.workLifeBalance > 70
                        ? 'bg-green-500'
                        : productivityData.wellnessIndicators.workLifeBalance > 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{
                      width: `${productivityData.wellnessIndicators.workLifeBalance}%`,
                    }}
                  />
                </div>
                <span className="text-lg font-bold text-[#0F1D3A]">
                  {productivityData.wellnessIndicators.workLifeBalance}
                </span>
              </div>
            </div>
          </div>
          {productivityData.wellnessIndicators.overworkWarnings.length > 0 && (
            <div className="space-y-2">
              {productivityData.wellnessIndicators.overworkWarnings.map((warning, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-white rounded-lg border border-slate-300"
                >
                  <Icon icon="mingcute:alert-line" width={16} className="text-orange-600 mt-0.5" />
                  <p className="text-xs text-[#0F1D3A]">{warning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time Log Modal */}
      <TimeLogModal
        isOpen={showTimeLogModal}
        onClose={() => setShowTimeLogModal(false)}
        onSuccess={handleTimeLogged}
      />
    </div>
  );
}

