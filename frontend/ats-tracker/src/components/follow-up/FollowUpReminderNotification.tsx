import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { FollowUpReminder } from "../../types";
import { ROUTES } from "../../config/routes";

export function FollowUpReminderNotification() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);

  useEffect(() => {
    fetchPendingReminders();
    // Poll every 5 minutes for new reminders
    const interval = setInterval(fetchPendingReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingReminders = async () => {
    try {
      const response = await api.getPendingFollowUpReminders(5);
      if (response.ok && response.data?.reminders) {
        setReminders(response.data.reminders);
      }
    } catch (error) {
      console.error("Failed to fetch pending reminders:", error);
    }
  };

  const pendingCount = reminders.filter((r) => r.status === "pending").length;

  if (pendingCount === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => navigate(ROUTES.FOLLOW_UP_REMINDERS)}
        className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors"
        title="Follow-up Reminders"
      >
        <Icon icon="mingcute:notification-line" width={24} height={24} />
        {pendingCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>
    </div>
  );
}

