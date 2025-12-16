import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { FollowUpReminder } from "../../types";

interface FollowUpEmailTemplateProps {
  reminder: FollowUpReminder;
  onClose: () => void;
  onEmailSent?: () => void;
}

export function FollowUpEmailTemplate({ reminder, onClose, onEmailSent }: FollowUpEmailTemplateProps) {
  const [emailTemplate, setEmailTemplate] = useState<{ subject: string; body: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchEmailTemplate();
  }, [reminder.id]);

  const fetchEmailTemplate = async () => {
    try {
      setIsLoading(true);
      const response = await api.getFollowUpReminderEmailTemplate(reminder.id);
      if (response.ok && response.data?.emailTemplate) {
        const template = response.data.emailTemplate;
        setEmailTemplate(template);
        setEditedSubject(template.subject);
        setEditedBody(template.body);
      } else {
        // Fallback to reminder's stored template
        if (reminder.generatedEmailSubject && reminder.generatedEmailBody) {
          setEmailTemplate({
            subject: reminder.generatedEmailSubject,
            body: reminder.generatedEmailBody
          });
          setEditedSubject(reminder.generatedEmailSubject);
          setEditedBody(reminder.generatedEmailBody);
        }
      }
    } catch (error) {
      console.error("Failed to fetch email template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    const emailText = `Subject: ${editedSubject}\n\n${editedBody}`;
    navigator.clipboard.writeText(emailText);
    // Show toast notification (you can add a toast library)
    alert("Email copied to clipboard!");
  };

  const handleSendEmail = async () => {
    // This would integrate with your email service
    // For now, just mark as completed
    try {
      await api.completeFollowUpReminder(reminder.id);
      if (onEmailSent) {
        onEmailSent();
      }
      onClose();
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-3xl w-full">
          <div className="text-center">
            <Icon icon="mingcute:loading-line" className="animate-spin mx-auto text-blue-500" width={32} />
            <p className="mt-4 text-slate-600">Loading email template...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Follow-Up Email Template</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subject
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-slate-900">{editedSubject || emailTemplate?.subject || "No subject"}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Body
            </label>
            {isEditing ? (
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={12}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            ) : (
              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
                <pre className="whitespace-pre-wrap text-slate-900 font-sans text-sm">
                  {editedBody || emailTemplate?.body || "No email body"}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium flex items-center gap-2"
            >
              <Icon icon={isEditing ? "mingcute:eye-line" : "mingcute:edit-line"} width={16} />
              {isEditing ? "Preview" : "Edit"}
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium flex items-center gap-2"
            >
              <Icon icon="mingcute:copy-line" width={16} />
              Copy
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm font-medium"
            >
              Close
            </button>
            <button
              onClick={handleSendEmail}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium flex items-center gap-2"
            >
              <Icon icon="mingcute:mail-send-line" width={16} />
              Mark as Sent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

