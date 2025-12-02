import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { TimeLogInput } from "../../types/analytics.types";

interface TimeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogSuccess?: () => void;
  prefilledJobId?: string;
}

interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  status: string;
}

export function TimeLogModal({ isOpen, onClose, onLogSuccess, prefilledJobId }: TimeLogModalProps) {
  const [formData, setFormData] = useState<TimeLogInput>({
    activityType: 'application',
    hoursSpent: 1,
    activityDate: new Date().toISOString().split('T')[0],
    notes: '',
    jobOpportunityId: prefilledJobId,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobOpportunities, setJobOpportunities] = useState<JobOpportunity[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Fetch job opportunities when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchJobOpportunities();
    }
  }, [isOpen]);

  const fetchJobOpportunities = async () => {
    try {
      setLoadingJobs(true);
      const response = await api.getJobOpportunities();
      
      // Extract jobOpportunities array from response.data
      const jobs = response.data?.jobOpportunities || [];
      
      // Sort by most recent
      const sortedJobs = jobs
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((job: any) => ({
          id: job.id,
          title: job.title,
          company: job.company,
          status: job.status,
        }));
      
      setJobOpportunities(sortedJobs);
    } catch (err) {
      console.error('Failed to fetch job opportunities:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  // Reset form when modal opens or prefilledJobId changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        activityType: 'application',
        hoursSpent: 1,
        activityDate: new Date().toISOString().split('T')[0],
        notes: '',
        jobOpportunityId: prefilledJobId,
      });
      setError(null);
    }
  }, [isOpen, prefilledJobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.hoursSpent <= 0 || formData.hoursSpent > 24) {
      setError("Hours must be between 0 and 24");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await api.createTimeLog(formData);
      
      if (response.ok) {
        onLogSuccess?.();
        onClose();
      } else {
        setError("Failed to log time. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log time");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E4E8F5]">
          <div className="flex items-center gap-2">
            <Icon icon="mingcute:time-line" width={24} className="text-[#3351FD]" />
            <h2 className="text-xl font-semibold text-[#0F1D3A]">Log Time Spent</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#6D7A99] hover:text-[#0F1D3A] transition-colors"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Job Opportunity (Optional) */}
          <div>
            <label className="block text-sm font-medium text-[#0F1D3A] mb-2">
              Related Job Opportunity (Optional)
            </label>
            {loadingJobs ? (
              <div className="w-full px-4 py-2 border border-[#E4E8F5] rounded-lg bg-[#F8F9FF] text-[#6D7A99] flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#3351FD] border-t-transparent rounded-full animate-spin" />
                Loading jobs...
              </div>
            ) : (
              <select
                value={formData.jobOpportunityId || ''}
                onChange={(e) => setFormData({ ...formData, jobOpportunityId: e.target.value || undefined })}
                className="w-full px-4 py-2 border border-[#E4E8F5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]/20"
                disabled={!!prefilledJobId}
              >
                <option value="">General job search activity</option>
                {jobOpportunities.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {job.company} ({job.status})
                  </option>
                ))}
              </select>
            )}
            {prefilledJobId && (
              <p className="text-xs text-[#6D7A99] mt-1">
                Pre-selected for a specific job opportunity
              </p>
            )}
          </div>

          {/* Activity Type */}
          <div>
            <label className="block text-sm font-medium text-[#0F1D3A] mb-2">
              Activity Type
            </label>
            <select
              value={formData.activityType}
              onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
              className="w-full px-4 py-2 border border-[#E4E8F5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]/20"
              required
            >
              <option value="research">Research & Planning</option>
              <option value="application">Application Submission</option>
              <option value="interview_prep">Interview Preparation</option>
              <option value="interview">Interviewing</option>
              <option value="networking">Networking</option>
              <option value="follow_up">Follow-up</option>
              <option value="offer_negotiation">Offer Negotiation</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Hours Spent */}
          <div>
            <label className="block text-sm font-medium text-[#0F1D3A] mb-2">
              Hours Spent
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="24"
                step="0.25"
                value={formData.hoursSpent}
                onChange={(e) => setFormData({ ...formData, hoursSpent: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-4 py-2 border border-[#E4E8F5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]/20"
                required
              />
              <span className="text-sm text-[#6D7A99]">hours</span>
            </div>
            <p className="text-xs text-[#6D7A99] mt-1">Use 0.25 for 15 minutes, 0.5 for 30 minutes, etc.</p>
          </div>

          {/* Quick Time Buttons */}
          <div className="flex gap-2 flex-wrap">
            {[0.25, 0.5, 1, 1.5, 2, 3].map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => setFormData({ ...formData, hoursSpent: hours })}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  formData.hoursSpent === hours
                    ? 'bg-[#3351FD] text-white'
                    : 'bg-[#F8F9FF] text-[#3351FD] hover:bg-[#E8EBFF]'
                }`}
              >
                {hours}h
              </button>
            ))}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-[#0F1D3A] mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.activityDate}
              onChange={(e) => setFormData({ ...formData, activityDate: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-[#E4E8F5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]/20"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#0F1D3A] mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional details..."
              rows={3}
              className="w-full px-4 py-2 border border-[#E4E8F5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]/20 resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#E4E8F5] rounded-lg text-[#6D7A99] hover:bg-[#F8F9FF] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2941DD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Icon icon="mingcute:check-line" width={18} />
                  Log Time
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

