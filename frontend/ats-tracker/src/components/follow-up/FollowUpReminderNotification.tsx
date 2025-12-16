import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { FollowUpReminder } from "../../types";
import { ROUTES } from "../../config/routes";

export function FollowUpReminderNotification() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchPendingReminders();
    // Poll every 5 minutes for new reminders
    const interval = setInterval(fetchPendingReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingReminders = async () => {
    try {
      setIsLoading(true);
      const response = await api.getPendingFollowUpReminders(5);
      if (response.ok && response.data?.reminders) {
        setReminders(response.data.reminders);
      }
    } catch (error) {
      console.error("Failed to fetch pending reminders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingCount = reminders.filter(r => r.status === 'pending').length;
  const overdueCount = reminders.filter(r => {
    if (!r.dueDate) return false;
    return new Date(r.dueDate) < new Date() && r.status === 'pending';
  }).length;

  if (pendingCount === 0 && !showDropdown) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors"
        title="Follow-up Reminders"
      >
        <Icon icon="mingcute:notification-line" width={24} height={24} />
        {pendingCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Follow-Up Reminders</h3>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate(ROUTES.FOLLOW_UP_REMINDERS || "/follow-up-reminders");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View All
                </button>
              </div>
              {overdueCount > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {overdueCount} {overdueCount === 1 ? 'reminder' : 'reminders'} overdue
                </p>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Icon icon="mingcute:loading-line" className="animate-spin mx-auto text-blue-500" width={24} />
                </div>
              ) : reminders.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No pending reminders
                </div>
              ) : (
                reminders.slice(0, 5).map((reminder) => (
                  <div
                    key={reminder.id}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate(`${ROUTES.FOLLOW_UP_REMINDERS || "/follow-up-reminders"}?reminder=${reminder.id}`);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                        new Date(reminder.dueDate) < new Date()
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">
                          {reminder.jobTitle || 'Position'} @ {reminder.companyName || 'Company'}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {reminder.applicationStage}
                        </p>
                        <p className={`text-xs mt-1 ${
                          new Date(reminder.dueDate) < new Date()
                            ? 'text-red-600 font-medium'
                            : 'text-slate-500'
                        }`}>
                          {new Date(reminder.dueDate) < new Date()
                            ? `Overdue: ${Math.abs(Math.floor((new Date(reminder.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days ago`
                            : `Due: ${new Date(reminder.dueDate).toLocaleDateString()}`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

