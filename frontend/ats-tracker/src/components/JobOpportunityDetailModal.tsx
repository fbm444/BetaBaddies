import { useState, useEffect, FormEvent } from "react";
import { Icon } from "@iconify/react";
import type {
  JobOpportunityData,
  JobOpportunityInput,
  JobStatus,
  ApplicationHistoryEntry,
  StatusHistoryEntry,
  SkillGapSnapshot,
  SkillGapProgressEntry,
} from "../types";
import { JOB_STATUSES, STATUS_COLORS, STATUS_BG_COLORS, INDUSTRIES, JOB_TYPES } from "../types";
import {
  getDaysRemaining,
  getDeadlineUrgency,
  getDeadlineColor,
  getDeadlineBgColor,
  formatDeadlineText,
} from "../utils/deadlineUtils";
import { CompanyInfoModal } from "./CompanyInfoModal";
import { JobSkillGapPanel } from "./skill-gaps/SkillGapPanel";
import { JobMaterialsSection } from "./JobMaterialsSection";

interface JobOpportunityDetailModalProps {
  opportunity: JobOpportunityData;
  onClose: () => void;
  onSave: (data: JobOpportunityInput) => Promise<void>;
  onDelete: () => void;
  onArchive?: (archiveReason?: string) => void;
  onUnarchive?: () => void;
}

export function JobOpportunityDetailModal({
  opportunity,
  onClose,
  onSave,
  onDelete,
  onArchive,
  onUnarchive,
}: JobOpportunityDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  const [formData, setFormData] = useState<JobOpportunityInput>({
    title: opportunity.title,
    company: opportunity.company,
    location: opportunity.location,
    salaryMin: opportunity.salaryMin,
    salaryMax: opportunity.salaryMax,
    jobPostingUrl: opportunity.jobPostingUrl || "",
    applicationDeadline: opportunity.applicationDeadline
      ? opportunity.applicationDeadline.split("T")[0]
      : "",
    description: opportunity.description || "",
    industry: opportunity.industry || "",
    jobType: opportunity.jobType || "",
    status: opportunity.status,
    notes: opportunity.notes || "",
    recruiterName: opportunity.recruiterName || "",
    recruiterEmail: opportunity.recruiterEmail || "",
    recruiterPhone: opportunity.recruiterPhone || "",
    hiringManagerName: opportunity.hiringManagerName || "",
    hiringManagerEmail: opportunity.hiringManagerEmail || "",
    hiringManagerPhone: opportunity.hiringManagerPhone || "",
    salaryNegotiationNotes: opportunity.salaryNegotiationNotes || "",
    interviewNotes: opportunity.interviewNotes || "",
    applicationHistory: opportunity.applicationHistory || [],
  });

  const [newHistoryEntry, setNewHistoryEntry] = useState<{
    status: JobStatus;
    notes: string;
  }>({
    status: opportunity.status,
    notes: "",
  });

  useEffect(() => {
    // Reset form data when opportunity changes
    setFormData({
      title: opportunity.title,
      company: opportunity.company,
      location: opportunity.location,
      salaryMin: opportunity.salaryMin,
      salaryMax: opportunity.salaryMax,
      jobPostingUrl: opportunity.jobPostingUrl || "",
      applicationDeadline: opportunity.applicationDeadline
        ? opportunity.applicationDeadline.split("T")[0]
        : "",
      description: opportunity.description || "",
      industry: opportunity.industry || "",
      jobType: opportunity.jobType || "",
      status: opportunity.status,
      notes: opportunity.notes || "",
      recruiterName: opportunity.recruiterName || "",
      recruiterEmail: opportunity.recruiterEmail || "",
      recruiterPhone: opportunity.recruiterPhone || "",
      hiringManagerName: opportunity.hiringManagerName || "",
      hiringManagerEmail: opportunity.hiringManagerEmail || "",
      hiringManagerPhone: opportunity.hiringManagerPhone || "",
      salaryNegotiationNotes: opportunity.salaryNegotiationNotes || "",
      interviewNotes: opportunity.interviewNotes || "",
      applicationHistory: opportunity.applicationHistory || [],
    });
    setIsEditMode(false);
  }, [opportunity]);

  const extendDeadline = (days: number) => {
    if (!opportunity.applicationDeadline) return;
    
    const currentDate = new Date(opportunity.applicationDeadline);
    currentDate.setDate(currentDate.getDate() + days);
    const newDeadline = currentDate.toISOString().split("T")[0];
    
    setFormData({
      ...formData,
      applicationDeadline: newDeadline,
    });
    setIsEditMode(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditMode(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHistoryEntry = () => {
    if (!newHistoryEntry.status) return;

    const entry: StatusHistoryEntry = {
      type: "status_change",
      timestamp: new Date().toISOString(),
      status: newHistoryEntry.status,
      notes: newHistoryEntry.notes.trim() || undefined,
    };

    setFormData((prev) => ({
      ...prev,
      applicationHistory: [...(prev.applicationHistory || []), entry],
    }));

    setNewHistoryEntry({
      status: opportunity.status,
      notes: "",
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const PROGRESS_STATUS_LABELS: Record<SkillGapProgressEntry["status"], string> = {
    planned: "Planned",
    "in-progress": "In Progress",
    completed: "Completed",
  };

  const handleHistorySync = (entries: ApplicationHistoryEntry[]) => {
    setFormData((prev) => ({
      ...prev,
      applicationHistory: entries,
    }));
  };

  const isStatusHistory = (
    entry: ApplicationHistoryEntry
  ): entry is StatusHistoryEntry => {
    return (
      typeof entry === "object" &&
      entry !== null &&
      "status" in entry &&
      "timestamp" in entry &&
      typeof (entry as StatusHistoryEntry).status === "string"
    );
  };

  const isSkillGapSnapshotHistory = (
    entry: ApplicationHistoryEntry
  ): entry is SkillGapSnapshot => {
    return typeof entry === "object" && entry !== null && (entry as any).type === "skill_gap_snapshot";
  };

  const isSkillGapProgressHistory = (
    entry: ApplicationHistoryEntry
  ): entry is SkillGapProgressEntry => {
    return typeof entry === "object" && entry !== null && (entry as any).type === "skill_gap_progress";
  };

  const getHistoryTimestamp = (entry: ApplicationHistoryEntry) => {
    if (isStatusHistory(entry)) {
      return entry.timestamp;
    }
    if (isSkillGapSnapshotHistory(entry)) {
      return entry.generatedAt;
    }
    if (isSkillGapProgressHistory(entry)) {
      return entry.updatedAt;
    }
    if (typeof entry === "object" && entry !== null) {
      if ("timestamp" in entry && typeof (entry as any).timestamp === "string") {
        return (entry as any).timestamp;
      }
      if ("generatedAt" in entry && typeof (entry as any).generatedAt === "string") {
        return (entry as any).generatedAt;
      }
      if ("updatedAt" in entry && typeof (entry as any).updatedAt === "string") {
        return (entry as any).updatedAt;
      }
    }
    return new Date().toISOString();
  };

  const renderHistoryEntry = (entry: ApplicationHistoryEntry, index: number) => {
    const timestamp = getHistoryTimestamp(entry);
    const formattedTimestamp =
      formatDate(timestamp) || new Date(timestamp).toLocaleString();

    if (isStatusHistory(entry)) {
      return (
        <div
          key={`history-status-${index}`}
          className="p-4 bg-slate-50 rounded-lg border border-slate-200"
        >
          <div className="flex justify-between items-start mb-2">
            <span
              className="px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: STATUS_BG_COLORS[entry.status],
                color: STATUS_COLORS[entry.status],
              }}
            >
              {entry.status}
            </span>
            <span className="text-xs text-slate-500">{formattedTimestamp}</span>
          </div>
          {entry.notes && (
            <p className="text-sm text-slate-600 mt-2">{entry.notes}</p>
          )}
        </div>
      );
    }

    if (isSkillGapSnapshotHistory(entry)) {
      return (
        <div
          key={`history-snapshot-${entry.snapshotId}-${index}`}
          className="p-4 bg-blue-50 rounded-lg border border-blue-200"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-blue-700 font-medium">
              <Icon icon="mingcute:radar-line" width={16} />
              <span>Skill Gap Analysis</span>
            </div>
            <span className="text-xs text-blue-600 font-medium">
              {formattedTimestamp}
            </span>
          </div>
          <p className="mt-2 text-sm text-blue-800">
            {entry.gaps.length} open gap{entry.gaps.length === 1 ? "" : "s"} detected.{" "}
            {entry.trend?.message}
          </p>
        </div>
      );
    }

    if (isSkillGapProgressHistory(entry)) {
      return (
        <div
          key={`history-progress-${entry.progressId}-${index}`}
          className="p-4 bg-white rounded-lg border border-slate-200"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Icon icon="mingcute:flag-line" width={16} className="text-slate-500" />
                {entry.skillName}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                {PROGRESS_STATUS_LABELS[entry.status]}
              </p>
            </div>
            <span className="text-xs text-slate-400">{formattedTimestamp}</span>
          </div>
          {entry.notes && (
            <p className="mt-2 text-sm text-slate-600">{entry.notes}</p>
          )}
          {entry.resource && (
            <p className="mt-2 text-xs text-slate-500">
              Resource:{" "}
              {entry.resource.url ? (
                <a
                  href={entry.resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {entry.resource.title}
                </a>
              ) : (
                entry.resource.title
              )}
              <span className="text-slate-400">
                {entry.resource.provider ? ` (${entry.resource.provider})` : ""}
              </span>
            </p>
          )}
          {entry.newProficiency && (
            <p className="mt-2 text-xs font-medium text-blue-600">
              Updated proficiency: {entry.newProficiency}
            </p>
          )}
        </div>
      );
    }

    return (
      <div
        key={`history-generic-${index}`}
        className="p-4 bg-slate-100 rounded-lg border border-slate-200"
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-sm font-medium text-slate-700">
            Activity Recorded
          </span>
          <span className="text-xs text-slate-500">{formattedTimestamp}</span>
        </div>
        <pre className="mt-2 max-h-32 overflow-y-auto rounded bg-white p-3 text-xs text-slate-500">
          {JSON.stringify(entry, null, 2)}
        </pre>
      </div>
    );
  };

  // Filter out skill gap snapshots and progress entries since they're shown in the Skill Gap Panel
  const filteredHistoryEntries = (formData.applicationHistory || []).filter(
    (entry) => !isSkillGapSnapshotHistory(entry) && !isSkillGapProgressHistory(entry)
  );

  const sortedHistoryEntries = [...filteredHistoryEntries].sort(
    (a, b) =>
      new Date(getHistoryTimestamp(b)).getTime() -
      new Date(getHistoryTimestamp(a)).getTime()
  );

  const formatSalary = () => {
    if (formData.salaryMin && formData.salaryMax) {
      return `$${formData.salaryMin.toLocaleString()} - $${formData.salaryMax.toLocaleString()}`;
    } else if (formData.salaryMin) {
      return `$${formData.salaryMin.toLocaleString()}+`;
    } else if (formData.salaryMax) {
      return `Up to $${formData.salaryMax.toLocaleString()}`;
    }
    return null;
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the backdrop, not on the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4 font-poppins"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto font-poppins"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
              {isEditMode ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="text-2xl font-bold text-slate-900 border-b-2 border-blue-500 focus:outline-none flex-1"
                  placeholder="Job Title"
                />
              ) : (
                <h2 className="text-2xl font-bold text-slate-900">
                  {opportunity.title}
                </h2>
              )}
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: STATUS_BG_COLORS[opportunity.status],
                  color: STATUS_COLORS[opportunity.status],
                }}
              >
                {opportunity.status}
              </span>
            </div>
            {isEditMode ? (
              <input
                type="text"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                className="text-lg text-slate-600 border-b-2 border-blue-500 focus:outline-none mt-1"
                placeholder="Company Name"
              />
            ) : (
              <p className="text-lg text-slate-600">{opportunity.company}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {!isEditMode && (
              <>
                {opportunity.jobPostingUrl && (
                  <button
                    onClick={() => setShowCompanyInfo(true)}
                    className="px-2.5 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    <Icon icon="mingcute:building-line" width={14} />
                    Company Info
                  </button>
                )}
                {!opportunity.archived && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-2.5 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    <Icon icon="mingcute:edit-line" width={14} />
                    Edit
                  </button>
                )}
                {opportunity.archived && onUnarchive && (
                  <button
                    onClick={onUnarchive}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <Icon icon="mingcute:refresh-line" width={18} />
                    Restore
                  </button>
                )}
                {!opportunity.archived && onArchive && (
                  <button
                    onClick={() => onArchive()}
                    className="px-2.5 py-1 bg-[#EC85CA] text-white rounded-md hover:bg-[#D468B1] transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    <Icon icon="mingcute:archive-line" width={14} />
                    Archive
                  </button>
                )}
                <button
                  onClick={onDelete}
                  className="px-2.5 py-1 border border-red-500 text-red-500 rounded-md hover:bg-red-50 transition-colors flex items-center gap-1 text-xs font-medium"
                >
                  <Icon icon="mingcute:delete-line" width={14} />
                  Delete
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600"
            >
              <Icon icon="mingcute:close-line" width={24} />
            </button>
          </div>
        </div>
      </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-8 py-6">
          <div className="space-y-6">
            {/* Archive Information (if archived) */}
            {opportunity.archived && (
              <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icon icon="mingcute:archive-line" className="text-amber-600 mt-0.5" width={20} />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900 mb-2">
                      Archived Job Opportunity
                    </h4>
                    {opportunity.archivedAt && (
                      <p className="text-sm text-amber-800 mb-1">
                        Archived on: {new Date(opportunity.archivedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    {opportunity.archiveReason && (
                      <p className="text-sm text-amber-800">
                        Reason: {opportunity.archiveReason}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Basic Information */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Location
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-slate-600">{opportunity.location}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Job Type
                  </label>
                  {isEditMode ? (
                    <select
                      value={formData.jobType || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, jobType: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Job Type</option>
                      {JOB_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-slate-600">
                      {opportunity.jobType || "Not specified"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Industry
                  </label>
                  {isEditMode ? (
                    <select
                      value={formData.industry || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, industry: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Industry</option>
                      {INDUSTRIES.map((industry) => (
                        <option key={industry} value={industry}>
                          {industry}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-slate-600">
                      {opportunity.industry || "Not specified"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status
                  </label>
                  {isEditMode ? (
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as JobStatus,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {JOB_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-slate-600">{opportunity.status}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Salary Range
                  </label>
                  {isEditMode ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.salaryMin || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            salaryMin: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Min"
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        value={formData.salaryMax || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            salaryMax: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Max"
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <p className="text-slate-600">
                      {formatSalary() || "Not specified"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Application Deadline
                  </label>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={formData.applicationDeadline || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          applicationDeadline: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <p className="text-slate-600">
                          {opportunity.applicationDeadline
                            ? formatDate(opportunity.applicationDeadline)
                            : "Not specified"}
                        </p>
                        {opportunity.applicationDeadline && (
                          <div
                            className="px-3 py-1 rounded-lg text-sm font-medium"
                            style={{
                              backgroundColor: getDeadlineBgColor(
                                getDeadlineUrgency(
                                  getDaysRemaining(opportunity.applicationDeadline)
                                )
                              ),
                              color: getDeadlineColor(
                                getDeadlineUrgency(
                                  getDaysRemaining(opportunity.applicationDeadline)
                                )
                              ),
                            }}
                          >
                            {formatDeadlineText(
                              getDaysRemaining(opportunity.applicationDeadline)
                            )}
                          </div>
                        )}
                      </div>
                      {opportunity.applicationDeadline && !isEditMode && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => extendDeadline(7)}
                            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Extend by 7 days
                          </button>
                          <button
                            type="button"
                            onClick={() => extendDeadline(14)}
                            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Extend by 14 days
                          </button>
                          <button
                            type="button"
                            onClick={() => extendDeadline(30)}
                            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Extend by 30 days
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Job Posting URL
                </label>
                {isEditMode ? (
                  <input
                    type="url"
                    value={formData.jobPostingUrl || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jobPostingUrl: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-slate-600">
                    {opportunity.jobPostingUrl ? (
                      <a
                        href={opportunity.jobPostingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {opportunity.jobPostingUrl}
                      </a>
                    ) : (
                      "Not specified"
                    )}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Job Description
                </label>
                {isEditMode ? (
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Job description..."
                  />
                ) : (
                  <p className="text-slate-600 whitespace-pre-wrap">
                    {opportunity.description || "No description provided"}
                  </p>
                )}
              </div>
            </section>

            {/* Contact Information */}
            <section className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">
                    Recruiter
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Name
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={formData.recruiterName || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              recruiterName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {opportunity.recruiterName || "Not specified"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Email
                      </label>
                      {isEditMode ? (
                        <input
                          type="email"
                          value={formData.recruiterEmail || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              recruiterEmail: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {opportunity.recruiterEmail ? (
                            <a
                              href={`mailto:${opportunity.recruiterEmail}`}
                              className="text-blue-600 hover:underline"
                            >
                              {opportunity.recruiterEmail}
                            </a>
                          ) : (
                            "Not specified"
                          )}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Phone
                      </label>
                      {isEditMode ? (
                        <input
                          type="tel"
                          value={formData.recruiterPhone || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              recruiterPhone: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {opportunity.recruiterPhone ? (
                            <a
                              href={`tel:${opportunity.recruiterPhone}`}
                              className="text-blue-600 hover:underline"
                            >
                              {opportunity.recruiterPhone}
                            </a>
                          ) : (
                            "Not specified"
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">
                    Hiring Manager
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Name
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={formData.hiringManagerName || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hiringManagerName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {opportunity.hiringManagerName || "Not specified"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Email
                      </label>
                      {isEditMode ? (
                        <input
                          type="email"
                          value={formData.hiringManagerEmail || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hiringManagerEmail: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {opportunity.hiringManagerEmail ? (
                            <a
                              href={`mailto:${opportunity.hiringManagerEmail}`}
                              className="text-blue-600 hover:underline"
                            >
                              {opportunity.hiringManagerEmail}
                            </a>
                          ) : (
                            "Not specified"
                          )}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Phone
                      </label>
                      {isEditMode ? (
                        <input
                          type="tel"
                          value={formData.hiringManagerPhone || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hiringManagerPhone: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {opportunity.hiringManagerPhone ? (
                            <a
                              href={`tel:${opportunity.hiringManagerPhone}`}
                              className="text-blue-600 hover:underline"
                            >
                              {opportunity.hiringManagerPhone}
                            </a>
                          ) : (
                            "Not specified"
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Notes */}
            <section className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Notes
              </h3>
              {isEditMode ? (
                <textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add your personal notes and observations..."
                />
              ) : (
                <p className="text-slate-600 whitespace-pre-wrap">
                  {opportunity.notes || "No notes added"}
                </p>
              )}
            </section>

            {/* Salary Negotiation Notes */}
            <section className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Salary Negotiation Notes
              </h3>
              {isEditMode ? (
                <textarea
                  value={formData.salaryNegotiationNotes || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryNegotiationNotes: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add notes about salary negotiations..."
                />
              ) : (
                <p className="text-slate-600 whitespace-pre-wrap">
                  {opportunity.salaryNegotiationNotes || "No notes added"}
                </p>
              )}
            </section>

            {/* Interview Notes */}
            <section className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Interview Notes & Feedback
              </h3>
              {isEditMode ? (
                <textarea
                  value={formData.interviewNotes || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interviewNotes: e.target.value,
                    })
                  }
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add interview notes and feedback..."
                />
              ) : (
                <p className="text-slate-600 whitespace-pre-wrap">
                  {opportunity.interviewNotes || "No notes added"}
                </p>
              )}
            </section>

            {/* Application Materials */}
            <JobMaterialsSection
              opportunity={opportunity}
              isEditMode={isEditMode}
              onMaterialsChange={() => {
                // Materials are handled separately via API
              }}
            />

            <JobSkillGapPanel
              opportunity={{
                ...opportunity,
                applicationHistory: formData.applicationHistory,
              }}
              onHistorySync={handleHistorySync}
            />

            {/* Application History */}
            <section className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Application History
              </h3>
              {isEditMode && (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Status
                      </label>
                      <select
                        value={newHistoryEntry.status}
                        onChange={(e) =>
                          setNewHistoryEntry({
                            ...newHistoryEntry,
                            status: e.target.value as JobStatus,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {JOB_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={newHistoryEntry.notes}
                        onChange={(e) =>
                          setNewHistoryEntry({
                            ...newHistoryEntry,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Optional notes..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddHistoryEntry}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    Add History Entry
                  </button>
                </div>
              )}
              <div className="space-y-3">
              {sortedHistoryEntries.length > 0 ? (
                sortedHistoryEntries.map((entry, index) =>
                  renderHistoryEntry(entry, index)
                )
              ) : (
                <p className="text-slate-500 text-sm">No history entries</p>
              )}
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          {isEditMode && (
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-4 mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="px-6 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Icon
                      icon="mingcute:loading-line"
                      className="animate-spin"
                      width={18}
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon icon="mingcute:save-line" width={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Company Info Modal */}
      {showCompanyInfo && (
        <CompanyInfoModal
          opportunityId={opportunity.id}
          companyName={opportunity.company}
          jobTitle={opportunity.title}
          location={opportunity.location}
          industry={opportunity.industry}
          onClose={() => setShowCompanyInfo(false)}
        />
      )}
    </div>
  );
}

