import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type {
  Goal,
  GoalAnalytics,
  DateRange,
} from "../../types/analytics.types";

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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4 font-poppins">Goal Setting</h2>
        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-600 font-poppins">
            Create and track SMART goals to stay focused and measure your progress throughout your job search journey.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-6 py-3 text-sm font-medium text-white hover:bg-blue-800 transition-colors"
          >
            <Icon icon="mingcute:add-line" width={20} />
            Create Goal
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-gradient-to-b from-[#1E3097] to-[#3351FD] p-6 text-white min-h-[160px] flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[18px] font-normal">Total Goals</p>
              <Icon
                icon="mingcute:target-2-line"
                width={24}
                className="text-white"
              />
            </div>
            <p className="text-5xl font-medium leading-none text-[#E7EFFF]">
              {analytics.totalGoals}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 border border-slate-300 min-h-[160px] flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[18px] font-normal text-[#0F1D3A]">
                Active Goals
              </p>
              <Icon
                icon="mingcute:time-line"
                width={20}
                className="text-[#09244B]"
              />
            </div>
            <div className="flex items-end gap-3">
              <p className="text-5xl font-extralight text-[#5A87E6]">
                {analytics.activeGoals}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 border border-slate-300 min-h-[160px] flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[18px] font-normal text-[#0F1D3A]">
                Completed
              </p>
              <Icon
                icon="mingcute:check-circle-line"
                width={20}
                className="text-[#09244B]"
              />
            </div>
            <div className="flex items-end gap-3">
              <p className="text-5xl font-extralight text-[#5A87E6]">
                {analytics.completedGoals}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 border border-slate-300 min-h-[160px] flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[18px] font-normal text-[#0F1D3A]">
                Achievement Rate
              </p>
              <Icon
                icon="mingcute:chart-pie-line"
                width={20}
                className="text-[#09244B]"
              />
            </div>
            <div className="flex items-end gap-3">
              <p className="text-5xl font-extralight text-[#5A87E6]">
                {analytics.achievementRate}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Goals List */}
      {goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="rounded-2xl bg-white p-6 border border-slate-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-semibold text-[#0F1D3A]">
                      {goal.title}
                    </h3>
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
                  </div>
                  {goal.description && (
                    <p className="text-sm text-[#6D7A99] mb-2">
                      {goal.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-[#6D7A99]">
                    <span>
                      {goal.category
                        ? goal.category.replace(/_/g, " ").split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
                        : "Unknown"}
                    </span>
                    <span>•</span>
                    <span className="capitalize">
                      {goal.goalType
                        ? goal.goalType.replace("_", " ")
                        : "Unknown"}
                    </span>
                    {goal.targetDate && (
                      <>
                        <span>•</span>
                        <span>
                          Target:{" "}
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(goal.status === "active" ||
                    !goal.status ||
                    goal.status === "") && (
                    <button
                      onClick={async () => {
                        try {
                          const response = await api.completeGoal(goal.id);
                          if (response.ok) {
                            await fetchGoals();
                            await fetchAnalytics();
                          } else {
                            console.error(
                              "Failed to complete goal:",
                              response.error || response.data?.error
                            );
                            alert("Failed to complete goal. Please try again.");
                          }
                        } catch (err: any) {
                          console.error("Failed to complete goal:", err);
                          alert(err.message || "Failed to complete goal");
                        }
                      }}
                      className="p-2 text-green-500 hover:text-green-600 transition-colors"
                      title="Complete Goal"
                      aria-label="Complete Goal"
                    >
                      <Icon icon="mingcute:check-circle-line" width={18} />
                    </button>
                  )}
                  {goal.status === "completed" && (
                    <button
                      onClick={async () => {
                        try {
                          const response = await api.updateGoal(goal.id, {
                            status: "active",
                          });
                          if (response.ok) {
                            await fetchGoals();
                            await fetchAnalytics();
                          } else {
                            console.error(
                              "Failed to uncomplete goal:",
                              response.error || response.data?.error
                            );
                            alert("Failed to uncomplete goal. Please try again.");
                          }
                        } catch (err: any) {
                          console.error("Failed to uncomplete goal:", err);
                          alert(err.message || "Failed to uncomplete goal");
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                      title="Uncomplete Goal"
                      aria-label="Uncomplete Goal"
                    >
                      <Icon icon="mingcute:back-line" width={18} />
                    </button>
                  )}
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
                      {goal.currentValue} / {goal.targetValue} {goal.unit || ""}{" "}
                      ({goal.progressPercentage}%)
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-[#EEF0FB]">
                    <div
                      className="h-full rounded-full bg-[#3351FD] transition-all"
                      style={{
                        width: `${Math.min(goal.progressPercentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#E4E8F5] bg-[#F8F8F8] p-10 text-center">
          <Icon
            icon="mingcute:target-2-line"
            className="mx-auto mb-3 text-[#6D7A99]"
            width={48}
          />
          <p className="text-sm text-[#6D7A99] mb-4">
            No goals set yet. Create your first SMART goal to start tracking
            your progress.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-blue-500 px-6 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <Icon icon="mingcute:add-line" width={20} />
            Create Your First Goal
          </button>
        </div>
      )}

      {/* Create/Edit Goal Modal */}
      {(showCreateModal || editingGoal) && (
        <GoalFormModal
          goal={editingGoal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingGoal(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingGoal(null);
            fetchGoals();
          }}
        />
      )}
    </div>
  );
}

// Goal Form Modal Component
function GoalFormModal({
  goal,
  onClose,
  onSuccess,
}: {
  goal: Goal | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    title: goal?.title || "",
    description: goal?.description || "",
    category: goal?.category || "job_search",
    goalType: goal?.goalType || "short_term",
    targetValue: goal?.targetValue?.toString() || "",
    currentValue: goal?.currentValue?.toString() || "0",
    unit: goal?.unit || "",
    targetDate: goal?.targetDate ? goal.targetDate.split("T")[0] : "",
    priority: goal?.priority || "medium",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when goal prop changes
  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title || "",
        description: goal.description || "",
        category: goal.category || "job_search",
        goalType: goal.goalType || "short_term",
        targetValue: goal.targetValue?.toString() || "",
        currentValue: goal.currentValue?.toString() || "0",
        unit: goal.unit || "",
        targetDate: goal.targetDate ? goal.targetDate.split("T")[0] : "",
        priority: goal.priority || "medium",
      });
    } else {
      // Reset form when creating new goal
      setFormData({
        title: "",
        description: "",
        category: "job_search",
        goalType: "short_term",
        targetValue: "",
        currentValue: "0",
        unit: "",
        targetDate: "",
        priority: "medium",
      });
    }
    setError(null); // Clear any previous errors
  }, [goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const goalData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        goalType: formData.goalType,
        targetValue: formData.targetValue
          ? parseFloat(formData.targetValue)
          : undefined,
        currentValue: parseFloat(formData.currentValue) || 0,
        unit: formData.unit.trim() || undefined,
        targetDate: formData.targetDate || undefined,
        priority: formData.priority,
      };

      let response;
      if (goal) {
        response = await api.updateGoal(goal.id, goalData);
      } else {
        response = await api.createGoal(goalData);
      }

      if (response.ok) {
        onSuccess();
        onClose(); // Close modal on success
      } else {
        const errorMsg =
          response.error?.message ||
          response.data?.error?.message ||
          "Failed to save goal";
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error("Failed to save goal:", err);
      const errorMsg =
        err.message || err.error?.message || "Failed to save goal";
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!goal || !confirm("Are you sure you want to delete this goal?")) {
      return;
    }

    try {
      const response = await api.deleteGoal(goal.id);
      if (response.ok) {
        onSuccess();
      } else {
        setError("Failed to delete goal");
      }
    } catch (err: any) {
      console.error("Failed to delete goal:", err);
      setError(err.message || "Failed to delete goal");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-[#0F1D3A]">
            {goal ? "Edit Goal" : "Create New Goal"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-[#6D7A99] hover:text-[#0F1D3A] transition-colors"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#0F1D3A] mb-1">
              Goal Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Send 20 applications this month"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#0F1D3A] mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Additional details about this goal..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]"
            />
          </div>

          {/* Category and Goal Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F1D3A] mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]"
              >
                <option value="job_search">Job Search</option>
                <option value="career">Career</option>
                <option value="skills">Skills</option>
                <option value="networking">Networking</option>
                <option value="salary">Salary</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F1D3A] mb-1">
                Goal Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.goalType}
                onChange={(e) =>
                  setFormData({ ...formData, goalType: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]"
              >
                <option value="short_term">Short Term</option>
                <option value="long_term">Long Term</option>
              </select>
            </div>
          </div>

          {/* Target Value and Current Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F1D3A] mb-1">
                Target Value
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.targetValue}
                onChange={(e) =>
                  setFormData({ ...formData, targetValue: e.target.value })
                }
                placeholder="20"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F1D3A] mb-1">
                Current Value
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.currentValue}
                onChange={(e) =>
                  setFormData({ ...formData, currentValue: e.target.value })
                }
                placeholder="0"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
          </div>

          {/* Unit and Target Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F1D3A] mb-1">
                Unit
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                placeholder="e.g., applications, interviews"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F1D3A] mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) =>
                  setFormData({ ...formData, targetDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-[#0F1D3A] mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value as any })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E4E8F5]">
            <div>
              {goal && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[#6D7A99] hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#1E3097] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Saving..."
                  : goal
                  ? "Update Goal"
                  : "Create Goal"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
