import { useState, FormEvent } from "react";
import { Icon } from "@iconify/react";

interface ArchiveModalProps {
  title: string;
  message: string;
  onConfirm: (archiveReason?: string) => void;
  onCancel: () => void;
  isBulk?: boolean;
  itemCount?: number;
}

const ARCHIVE_REASONS = [
  "No longer interested",
  "Position filled",
  "Application rejected",
  "Accepted another offer",
  "Job posting removed",
  "Company closed",
  "Other",
] as const;

export function ArchiveModal({
  title,
  message,
  onConfirm,
  onCancel,
  isBulk = false,
  itemCount = 1,
}: ArchiveModalProps) {
  const [archiveReason, setArchiveReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [showCustomReason, setShowCustomReason] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const reason = showCustomReason && customReason.trim() 
      ? customReason.trim() 
      : archiveReason || undefined;
    onConfirm(reason);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4 font-poppins"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onCancel();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl font-poppins"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg" aria-hidden="true">
            <Icon icon="mingcute:archive-line" className="text-amber-600" width={24} />
          </div>
          <h2 id="archive-modal-title" className="text-xl font-bold text-slate-900">{title}</h2>
        </div>

        <p className="text-slate-600 mb-6">{message}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="archive-reason-select" className="block text-sm font-medium text-slate-700 mb-2">
              Archive Reason (Optional)
            </label>
            <select
              id="archive-reason-select"
              value={archiveReason}
              onChange={(e) => {
                setArchiveReason(e.target.value);
                setShowCustomReason(e.target.value === "Other");
                if (e.target.value !== "Other") {
                  setCustomReason("");
                }
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">Select a reason (optional)</option>
              {ARCHIVE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>

            {showCustomReason && (
              <textarea
                id="custom-reason-textarea"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter custom reason..."
                rows={3}
                className="w-full mt-3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                maxLength={255}
                aria-label="Custom archive reason"
              />
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium flex items-center gap-2"
            >
              <Icon icon="mingcute:archive-line" width={18} />
              Archive {isBulk && itemCount > 1 ? `${itemCount} Jobs` : "Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

