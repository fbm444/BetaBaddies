import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { Goal, GoalAnalytics, DateRange } from "../../types/analytics.types";

interface GoalTrackingProps {
  dateRange?: DateRange;
}

export function GoalTracking({ dateRange }: GoalTrackingProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [analytics, setAnalytics] = useState<GoalAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    fetchGoals();
    fetchAnalytics();
  }, [dateRange]);

  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getGoals();
      if (response.ok && response.data?.goals) {
        setGoals(response.data.goals);
      } else {
        setError("Failed to load goals");
      }
    } catch (err: any) {
      console.error("Failed to fetch goals:", err);
      setError(err.message || "Failed to load goals");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.getGoalAnalytics();
      if (response.ok && response.data?.analytics) {
        setAnalytics(response.data.analytics);
      }
    } catch (err: any) {
      console.error("Failed to fetch goal analytics:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#3351FD]" />
          <p className="text-sm text-[#6D7A99]">Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-gradient-to-b from-[#1E3097] to-[#3351FD] p-5 text-white">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[18px] font-normal">Total Goals</p>
              <Icon icon="mingcute:target-2-line" width={24} className="text-white" />
            </div>
            <p className="text-5xl font-medium leading-none text-[#E7EFFF]">
              {analytics.totalGoals}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5]">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[18px] font-normal text-[#0F1D3A]">Active Goals</p>
              <Icon icon="mingcute:time-line" width={20} className="text-[#09244B]" />
            </div>
            <p className="text-4xl font-extralight text-[#5A87E6]">{analytics.activeGoals}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5]">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[18px] font-normal text-[#0F1D3A]">Completed</p>
              <Icon icon="mingcute:check-circle-line" width={20} className="text-[#09244B]" />
            </div>
            <p className="text-4xl font-extralight text-[#5A87E6]">{analytics.completedGoals}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 border border-[#E4E8F5]">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[18px] font-normal text-[#0F1D3A]">Achievement Rate</p>
              <Icon icon="mingcute:chart-pie-line" width={20} className="text-[#09244B]" />
            </div>
            <p className="text-4xl font-extralight text-[#5A87E6]">{analytics.achievementRate}%</p>
          </div>
        </div>
      )}

      {/* Create Goal Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[#3351FD] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#3351FD1A] transition-transform hover:-translate-y-0.5 hover:bg-[#1E3097]"
        >
          <Icon icon="mingcute:add-line" width={20} />
          Create Goal
        </button>
      </div>

      {/* Goals List */}
      {goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="rounded-2xl bg-white p-6 border border-[#E4E8F5]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-[#0F1D3A] mb-1">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-sm text-[#6D7A99] mb-2">{goal.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-[#6D7A99]">
                    <span className="capitalize">{goal.category}</span>
                    <span>•</span>
                    <span className="capitalize">{goal.goalType.replace("_", " ")}</span>
                    {goal.targetDate && (
                      <>
                        <span>•</span>
                        <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      goal.status === "active"
                        ? "bg-blue-100 text-blue-700"
                        : goal.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {goal.status}
                  </span>
                  <button
                    onClick={() => setEditingGoal(goal)}
                    className="p-2 text-[#6D7A99] hover:text-[#0F1D3A] transition-colors"
                  >
                    <Icon icon="mingcute:edit-line" width={20} />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {goal.targetValue && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6D7A99]">Progress</span>
                    <span className="font-semibold text-[#0F1D3A]">
                      {goal.currentValue} / {goal.targetValue} {goal.unit || ""} ({goal.progressPercentage}%)
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-[#EEF0FB]">
                    <div
                      className="h-full rounded-full bg-[#3351FD] transition-all"
                      style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#E4E8F5] bg-[#F8F8F8] p-10 text-center">
          <Icon icon="mingcute:target-2-line" className="mx-auto mb-3 text-[#6D7A99]" width={48} />
          <p className="text-sm text-[#6D7A99] mb-4">
            No goals set yet. Create your first SMART goal to start tracking your progress.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#3351FD] px-6 py-3 text-sm font-semibold text-white"
          >
            <Icon icon="mingcute:add-line" width={20} />
            Create Your First Goal
          </button>
        </div>
      )}

      {/* Create/Edit Goal Modal - Placeholder */}
      {(showCreateModal || editingGoal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <p className="text-sm text-[#6D7A99]">
              Goal creation form will be implemented here.
            </p>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setEditingGoal(null);
              }}
              className="mt-4 px-4 py-2 bg-[#3351FD] text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

