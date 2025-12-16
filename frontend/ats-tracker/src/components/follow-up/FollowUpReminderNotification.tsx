import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import { transformReminders } from "../../utils/followUpReminderTransform";
import type { FollowUpReminder } from "../../types";
import { ROUTES } from "../../config/routes";

export function FollowUpReminderNotification() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);

  const fetchPendingReminders = async (): Promise<void> => {
    try {
      const response = await api.getPendingFollowUpReminders(5);
      if (response && response.ok && response.data) {
        // Safely extract reminders array, defaulting to empty array
        const remindersArray = Array.isArray(response.data.reminders) 
          ? response.data.reminders 
          : [];
        
        // Transform backend data (snake_case) to frontend format (camelCase)
        const transformedReminders = transformReminders(remindersArray);
        setReminders(transformedReminders);
      } else {
        // If response is not ok or data is missing, set empty array
        setReminders([]);
      }
    } catch (error) {
      console.error("Failed to fetch pending reminders:", error);
      // Set empty array on error to prevent undefined access
      setReminders([]);
    }
  };

  useEffect(() => {
    fetchPendingReminders();
    // Poll every 5 minutes for new reminders
    const interval = setInterval(fetchPendingReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Safely filter reminders, ensuring they exist and have required properties
  // Triple-check everything to prevent any undefined access
  const safeReminders = (() => {
    try {
      if (!Array.isArray(reminders)) return [];
      return reminders
        .filter((r) => {
          try {
            return (
              r != null &&
              r !== undefined &&
              typeof r === 'object' &&
              r.hasOwnProperty('id') &&
              r.id != null &&
              r.id !== undefined &&
              (typeof r.id === "string" || typeof r.id === "number") &&
              String(r.id).length > 0 &&
              r.hasOwnProperty('status') &&
              typeof r.status === "string"
            );
          } catch {
            return false;
          }
        })
        .map((r) => {
          // Ensure id is always a string
          if (r && typeof r.id === 'number') {
            r.id = String(r.id);
          }
          return r;
        })
        .filter((r): r is FollowUpReminder => r != null && r !== undefined);
    } catch {
      return [];
    }
  })();
  const pendingCount = safeReminders.filter((r) => r.status === "pending").length;

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

