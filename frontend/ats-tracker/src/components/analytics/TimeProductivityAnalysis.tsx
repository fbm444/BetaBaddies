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
      {/* Time Investment & Productivity Analysis */}
      <div className="rounded-3xl bg-gradient-to-br from-[#F8F9FF] to-white p-6 border-2 border-[#3351FD]/20">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Icon icon="mingcute:time-line" width={28} className="text-[#3351FD]" />
            <h3 className="text-[28px] font-semibold text-[#0F1D3A]">
              Time Investment & Productivity Analysis
            </h3>
          </div>
          
          {/* Interactive Toggle & Actions */}
          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'manual' ? 'estimated' : 'manual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                viewMode === 'manual'
                  ? 'border-green-500 bg-green-50 hover:bg-green-100'
                  : 'border-blue-500 bg-blue-50 hover:bg-blue-100'
              }`}
              title="Click to toggle between manual and estimated data"
            >
              <Icon 
                icon={viewMode === 'manual' ? 'mingcute:check-circle-fill' : 'mingcute:chart-line-fill'} 
                width={18} 
                className={viewMode === 'manual' ? 'text-green-500' : 'text-blue-500'}
              />
              <span className="text-sm font-medium text-[#0F1D3A]">
                {viewMode === 'manual' ? '✅ Your Logged Time' : '📊 Estimated'}
              </span>
            </button>
            
            {/* Log Time Button */}
            <button
              onClick={() => setShowTimeLogModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3351FD] text-white hover:bg-[#2941DD] transition-colors"
              title="Log your time spent on job search activities"
            >
              <Icon icon="mingcute:add-circle-line" width={18} />
              <span className="text-sm font-medium">Log Time</span>
            </button>
          </div>
        </div>

        {/* Time Investment Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl bg-white p-4 border border-[#E4E8F5] shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="mingcute:hourglass-line" width={18} className="text-[#3351FD]" />
              <span className="text-xs font-medium text-[#6D7A99]">Total Hours Invested</span>
            </div>
            <p className="text-3xl font-bold text-[#0F1D3A]">
              {productivityData.timeInvestment.totalHoursInvested}
              <span className="text-sm font-normal text-[#6D7A99] ml-1">hrs</span>
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 border border-[#E4E8F5] shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="mingcute:calendar-2-line" width={18} className="text-[#3351FD]" />
              <span className="text-xs font-medium text-[#6D7A99]">Avg. Hours/Week</span>
            </div>
            <p className="text-3xl font-bold text-[#0F1D3A]">
              {productivityData.timeInvestment.avgHoursPerWeek}
              <span className="text-sm font-normal text-[#6D7A99] ml-1">hrs</span>
            </p>
          </div>

        </div>

        {/* Activity Breakdown & Efficiency Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Activity Breakdown */}
          <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5]">
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
          <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5]">
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
          <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5] mb-6">
            <h4 className="text-lg font-semibold text-[#0F1D3A] mb-4 flex items-center gap-2">
              <Icon icon="mingcute:chart-bar-line" width={20} className="text-[#3351FD]" />
              Productivity by Day of Week
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
              {productivityData.productivityPatterns.byDayOfWeek.map((day, index) => (
                <div
                  key={index}
                  className="text-center p-3 rounded-lg border border-[#E4E8F5] hover:bg-[#F8F9FF] transition-colors"
                >
                  <p className="text-xs font-semibold text-[#0F1D3A] mb-1">{day.day}</p>
                  <p className="text-lg font-bold text-[#3351FD]">{day.tasksCompleted}</p>
                  <p className="text-xs text-[#6D7A99]">{day.hours}hrs</p>
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

        {/* Task Completion Metrics */}
        <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5] mb-6">
          <h4 className="text-lg font-semibold text-[#0F1D3A] mb-4 flex items-center gap-2">
            <Icon icon="mingcute:checkbox-line" width={20} className="text-[#3351FD]" />
            Task Completion Metrics
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-[#F8F9FF]">
              <p className="text-xs text-[#6D7A99] mb-1">Total Tasks</p>
              <p className="text-3xl font-bold text-[#0F1D3A]">
                {productivityData.taskMetrics.totalTasks}
              </p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[#F8F9FF]">
              <p className="text-xs text-[#6D7A99] mb-1">Completed</p>
              <p className="text-3xl font-bold text-[#3351FD]">
                {productivityData.taskMetrics.completedTasks}
              </p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[#F8F9FF]">
              <p className="text-xs text-[#6D7A99] mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-[#3351FD]">
                {productivityData.taskMetrics.completionRate}%
              </p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {productivityData.recommendations.length > 0 && (
          <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5] mb-6">
            <h4 className="text-lg font-semibold text-[#0F1D3A] mb-4 flex items-center gap-2">
              <Icon icon="mingcute:bulb-line" width={20} className="text-[#3351FD]" />
              Productivity Recommendations
            </h4>
            <div className="space-y-3">
              {productivityData.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    rec.priority === 'high'
                      ? 'border-red-500 bg-red-50'
                      : rec.priority === 'medium'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      icon={
                        rec.priority === 'high'
                          ? 'mingcute:alert-line'
                          : rec.priority === 'medium'
                          ? 'mingcute:warning-line'
                          : 'mingcute:information-line'
                      }
                      width={20}
                      className={
                        rec.priority === 'high'
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
              ))}
            </div>
          </div>
        )}

        {/* Wellness & Burnout Indicators */}
        <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 p-5 border border-purple-200">
          <h4 className="text-lg font-semibold text-[#0F1D3A] mb-4 flex items-center gap-2">
            <Icon icon="mingcute:heart-line" width={20} className="text-purple-600" />
            Work-Life Balance & Wellness
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
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
            <div className="bg-white rounded-xl p-4 shadow-sm">
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
                  className="flex items-start gap-2 p-3 bg-white rounded-lg border border-orange-200"
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

