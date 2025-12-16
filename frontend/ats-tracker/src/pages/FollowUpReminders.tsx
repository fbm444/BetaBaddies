import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { FollowUpReminderCard } from "../components/follow-up/FollowUpReminderCard";
import { FollowUpEmailTemplate } from "../components/follow-up/FollowUpEmailTemplate";
import { EtiquetteTipsPanel } from "../components/follow-up/EtiquetteTipsPanel";
import type { FollowUpReminder } from "../types";

type FilterStatus = "all" | "pending" | "snoozed" | "completed" | "dismissed";

export function FollowUpReminders() {
  const [searchParams] = useSearchParams();
  const reminderId = searchParams.get("reminder");

  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [selectedReminder, setSelectedReminder] = useState<FollowUpReminder | null>(null);
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, [statusFilter]);

  useEffect(() => {
    if (reminderId) {
      // Find and select the reminder
      const reminder = reminders.find(r => r.id === reminderId);
      if (reminder) {
        setSelectedReminder(reminder);
        setShowEmailTemplate(true);
      }
    }
  }, [reminderId, reminders]);

  const fetchReminders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters: any = {};
      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }
      filters.isActive = true;

      const response = await api.getFollowUpReminders(filters);
      if (response.ok && response.data?.reminders) {
        setReminders(response.data.reminders);
      }
    } catch (err: any) {
      console.error("Failed to fetch reminders:", err);
      setError(err.message || "Failed to load follow-up reminders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = () => {
    fetchReminders();
  };

  const pendingCount = reminders.filter(r => r.status === 'pending').length;
  const overdueCount = reminders.filter(r => {
    if (!r.dueDate || r.status !== 'pending') return false;
    return new Date(r.dueDate) < new Date();
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 font-poppins">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Follow-Up Reminders
          </h1>
          <p className="text-slate-600">
            Stay on top of your job application follow-ups
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <p className="text-sm text-slate-600 mb-2">Total Reminders</p>
            <p className="text-3xl font-bold text-slate-900">{reminders.length}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <p className="text-sm text-blue-700 mb-2">Pending</p>
            <p className="text-3xl font-bold text-blue-900">{pendingCount}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-6 border border-red-200">
            <p className="text-sm text-red-700 mb-2">Overdue</p>
            <p className="text-3xl font-bold text-red-900">{overdueCount}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <p className="text-sm text-green-700 mb-2">Completed</p>
            <p className="text-3xl font-bold text-green-900">
              {reminders.filter(r => r.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
            <p className="text-red-800 text-sm m-0">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-600 font-medium">Filter:</span>
          {[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "snoozed", label: "Snoozed" },
            { value: "completed", label: "Completed" },
            { value: "dismissed", label: "Dismissed" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value as FilterStatus)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-blue-500 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Reminders List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Icon icon="mingcute:loading-line" className="animate-spin mx-auto text-blue-500" width={32} />
              <p className="mt-4 text-slate-600">Loading reminders...</p>
            </div>
          </div>
        ) : reminders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Icon icon="mingcute:notification-line" width={48} className="text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No reminders found</p>
            <p className="text-sm text-slate-500">
              {statusFilter === "all"
                ? "Reminders will appear here when you update job opportunity statuses"
                : `No ${statusFilter} reminders`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reminders.map((reminder) => (
              <FollowUpReminderCard
                key={reminder.id}
                reminder={reminder}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}

        {/* Etiquette Tips Panel */}
        {reminders.length > 0 && (
          <div className="mt-8">
            <EtiquetteTipsPanel
              applicationStage={reminders[0]?.applicationStage || "Applied"}
              daysSinceLastContact={reminders[0]?.daysAfterEvent || 7}
            />
          </div>
        )}
      </div>

      {/* Email Template Modal */}
      {showEmailTemplate && selectedReminder && (
        <FollowUpEmailTemplate
          reminder={selectedReminder}
          onClose={() => {
            setShowEmailTemplate(false);
            setSelectedReminder(null);
          }}
          onEmailSent={handleUpdate}
        />
      )}
    </div>
  );
}

