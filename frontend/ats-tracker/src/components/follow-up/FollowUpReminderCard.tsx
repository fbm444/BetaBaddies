import { useState } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { FollowUpReminder } from "../../types";
import { FollowUpEmailTemplate } from "./FollowUpEmailTemplate";

interface FollowUpReminderCardProps {
  reminder: FollowUpReminder;
  onUpdate: () => void;
}

export function FollowUpReminderCard({ reminder, onUpdate }: FollowUpReminderCardProps) {
  // Early return if reminder is invalid
  if (!reminder || !reminder.id || typeof reminder.id !== 'string') {
    return null;
  }

  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [isSnoozing, setIsSnoozing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const isOverdue = reminder.dueDate && new Date(reminder.dueDate) < new Date() && reminder.status === 'pending';
  const daysUntilDue = reminder.dueDate 
    ? Math.floor((new Date(reminder.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleSnooze = async (days: number) => {
    if (!reminder?.id) return;
    try {
      setIsSnoozing(true);
      const response = await api.snoozeFollowUpReminder(reminder.id, days);
      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to snooze reminder:", error);
    } finally {
      setIsSnoozing(false);
    }
  };

  const handleComplete = async () => {
    if (!reminder?.id) return;
    try {
      setIsCompleting(true);
      const response = await api.completeFollowUpReminder(reminder.id);
      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to complete reminder:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDismiss = async () => {
    if (!reminder?.id) return;
    try {
      setIsDismissing(true);
      const response = await api.dismissFollowUpReminder(reminder.id);
      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to dismiss reminder:", error);
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <>
      <div className={`bg-white rounded-xl border-2 p-6 transition-all ${
        isOverdue
          ? 'border-red-300 bg-red-50/30'
          : reminder.status === 'snoozed'
          ? 'border-yellow-300 bg-yellow-50/30'
          : 'border-slate-200 hover:border-blue-300'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-slate-900">
                {reminder.jobTitle || 'Position'} @ {reminder.companyName || 'Company'}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                reminder.status === 'pending'
                  ? 'bg-blue-100 text-blue-700'
                  : reminder.status === 'snoozed'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {reminder.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Icon icon="mingcute:briefcase-line" width={16} />
                {reminder.applicationStage}
              </span>
              <span className="flex items-center gap-1">
                <Icon icon="mingcute:calendar-line" width={16} />
                {reminder.dueDate ? new Date(reminder.dueDate).toLocaleDateString() : 'No date'}
              </span>
              {reminder.location && (
                <span className="flex items-center gap-1">
                  <Icon icon="mingcute:map-pin-line" width={16} />
                  {reminder.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {isOverdue && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-sm text-red-800 font-medium">
              ⚠️ This reminder is overdue by {Math.abs(daysUntilDue)} {daysUntilDue === -1 ? 'day' : 'days'}
            </p>
          </div>
        )}

        {reminder.status === 'snoozed' && reminder.snoozedUntil && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800">
              Snoozed until {new Date(reminder.snoozedUntil).toLocaleDateString()}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowEmailTemplate(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium flex items-center gap-2"
          >
            <Icon icon="mingcute:mail-line" width={16} />
            View Email
          </button>
          
          {reminder.status === 'pending' && (
            <>
              <button
                onClick={() => handleSnooze(3)}
                disabled={isSnoozing}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Icon icon="mingcute:time-line" width={16} />
                Snooze 3d
              </button>
              <button
                onClick={handleComplete}
                disabled={isCompleting}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Icon icon="mingcute:check-line" width={16} />
                Complete
              </button>
            </>
          )}
          
          <button
            onClick={handleDismiss}
            disabled={isDismissing}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Icon icon="mingcute:close-line" width={16} />
            Dismiss
          </button>
        </div>
      </div>

      {showEmailTemplate && (
        <FollowUpEmailTemplate
          reminder={reminder}
          onClose={() => setShowEmailTemplate(false)}
          onEmailSent={onUpdate}
        />
      )}
    </>
  );
}

