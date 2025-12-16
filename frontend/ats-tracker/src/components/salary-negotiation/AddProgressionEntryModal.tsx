import { useState } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { SalaryProgressionEntry } from "../../types";

interface AddProgressionEntryModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddProgressionEntryModal({
  onClose,
  onSuccess,
}: AddProgressionEntryModalProps) {
  const [formData, setFormData] = useState({
    baseSalary: "",
    bonus: "",
    equity: "",
    benefitsValue: "",
    roleTitle: "",
    company: "",
    location: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateTotal = () => {
    const base = parseFloat(formData.baseSalary) || 0;
    const bonus = parseFloat(formData.bonus) || 0;
    const equity = parseFloat(formData.equity) || 0;
    const benefits = parseFloat(formData.benefitsValue) || 0;
    return base + bonus + equity + benefits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.baseSalary || parseFloat(formData.baseSalary) <= 0) {
      setError("Base salary is required");
      return;
    }

    if (!formData.roleTitle || !formData.company) {
      setError("Role title and company are required");
      return;
    }

    try {
      setIsSubmitting(true);
      const totalCompensation = calculateTotal();

      const response = await api.addSalaryProgressionEntry({
        baseSalary: parseFloat(formData.baseSalary),
        bonus: formData.bonus ? parseFloat(formData.bonus) : undefined,
        equity: formData.equity ? parseFloat(formData.equity) : undefined,
        benefitsValue: formData.benefitsValue ? parseFloat(formData.benefitsValue) : undefined,
        totalCompensation,
        currency: "USD",
        roleTitle: formData.roleTitle,
        company: formData.company,
        location: formData.location || undefined,
        effectiveDate: formData.effectiveDate,
        notes: formData.notes || undefined,
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError(response.error || "Failed to add progression entry");
      }
    } catch (err: any) {
      console.error("Failed to add progression entry:", err);
      setError(err.message || "Failed to add progression entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Add Salary Progression Entry</h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close modal"
          >
            <Icon icon="mingcute:close-line" width={24} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Role & Company */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Role Title *
              </label>
              <input
                type="text"
                value={formData.roleTitle}
                onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Software Engineer"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Company *
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Company Name"
                required
              />
            </div>
          </div>

          {/* Location & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="City, State"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Effective Date *
              </label>
              <input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Compensation */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Compensation Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Base Salary *
                </label>
                <input
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="100000"
                  min="0"
                  step="1000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bonus
                </label>
                <input
                  type="number"
                  value={formData.bonus}
                  onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="10000"
                  min="0"
                  step="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Equity
                </label>
                <input
                  type="number"
                  value={formData.equity}
                  onChange={(e) => setFormData({ ...formData, equity: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="50000"
                  min="0"
                  step="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Benefits Value
                </label>
                <input
                  type="number"
                  value={formData.benefitsValue}
                  onChange={(e) => setFormData({ ...formData, benefitsValue: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="15000"
                  min="0"
                  step="1000"
                />
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Total Compensation</span>
                <span className="text-xl font-bold text-blue-900">
                  ${calculateTotal().toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Additional notes about this compensation package..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icon icon="mingcute:loading-line" className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Icon icon="mingcute:check-line" width={16} />
                  Add Entry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

