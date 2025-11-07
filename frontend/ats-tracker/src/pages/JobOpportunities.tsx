import { useState, useEffect, FormEvent } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import type {
  JobOpportunityData,
  JobOpportunityInput,
  JobStatus,
  StatusCounts,
} from "../types";
import { INDUSTRIES, JOB_TYPES, JOB_STATUSES, STATUS_COLORS, STATUS_BG_COLORS } from "../types";
import { isValidUrl, getUrlErrorMessage } from "../utils/urlValidation";
import { JobPipeline } from "../components/JobPipeline";

export function JobOpportunities() {
  const [opportunities, setOpportunities] = useState<JobOpportunityData[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    Interested: 0,
    Applied: 0,
    "Phone Screen": 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // View mode: 'list' or 'pipeline'
  const [viewMode, setViewMode] = useState<"list" | "pipeline">("pipeline");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<JobOpportunityData | null>(null);

  // Load opportunities and status counts on mount and when filter/view changes
  useEffect(() => {
    const loadData = async () => {
      await fetchOpportunities();
      await fetchStatusCounts();
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, viewMode]);

  // Reset filter and clear selection when switching to pipeline view
  useEffect(() => {
    if (viewMode === "pipeline") {
      if (statusFilter !== "all") {
        setStatusFilter("all");
      }
      // Clear selection when switching to pipeline view
      setSelectedIds(new Set());
      setShowBulkActions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const showMessage = (text: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccessMessage(text);
      setError(null);
    } else {
      setError(text);
      setSuccessMessage(null);
    }
    setTimeout(() => {
      if (type === "success") {
        setSuccessMessage(null);
      } else {
        setError(null);
      }
    }, 5000);
  };

  const fetchOpportunities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // In pipeline view, always fetch all opportunities. In list view, respect filter.
      const status = viewMode === "pipeline" || statusFilter === "all" 
        ? undefined 
        : statusFilter;
      const response = await api.getJobOpportunities(undefined, undefined, undefined, status);
      if (response.ok && response.data) {
        setOpportunities(response.data.jobOpportunities);
      }
    } catch (err: any) {
      console.error("Failed to fetch job opportunities:", err);
      showMessage(
        err.message || "Failed to load job opportunities",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatusCounts = async () => {
    try {
      const response = await api.getJobOpportunityStatusCounts();
      if (response.ok && response.data) {
        setStatusCounts(response.data.statusCounts);
      }
    } catch (err: any) {
      console.error("Failed to fetch status counts:", err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: JobStatus) => {
    try {
      const response = await api.updateJobOpportunity(id, { status: newStatus });
      if (response.ok) {
        await fetchOpportunities();
        await fetchStatusCounts();
        showMessage("Status updated successfully!", "success");
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to update status", "error");
      throw err;
    }
  };

  const handleBulkStatusUpdate = async (newStatus: JobStatus) => {
    if (selectedIds.size === 0) return;

    try {
      const response = await api.bulkUpdateJobOpportunityStatus(
        Array.from(selectedIds),
        newStatus
      );
      if (response.ok && response.data) {
        setSelectedIds(new Set());
        setShowBulkActions(false);
        await fetchOpportunities();
        await fetchStatusCounts();
        showMessage(
          `${response.data.updatedOpportunities.length} job(s) updated successfully!`,
          "success"
        );
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to update jobs", "error");
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === opportunities.length) {
      setSelectedIds(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedIds(new Set(opportunities.map((o) => o.id)));
      setShowBulkActions(true);
    }
  };

  const handleAddOpportunity = async (data: JobOpportunityInput) => {
    try {
      const response = await api.createJobOpportunity(data);
      if (response.ok) {
        setShowAddModal(false);
        await fetchOpportunities();
        await fetchStatusCounts();
        showMessage("Job opportunity added successfully!", "success");
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to add job opportunity", "error");
    }
  };

  const handleEditOpportunity = async (data: JobOpportunityInput) => {
    if (!selectedOpportunity) return;

    try {
      const response = await api.updateJobOpportunity(
        selectedOpportunity.id,
        data
      );
      if (response.ok) {
        setShowEditModal(false);
        setSelectedOpportunity(null);
        await fetchOpportunities();
        await fetchStatusCounts();
        showMessage("Job opportunity updated successfully!", "success");
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to update job opportunity", "error");
    }
  };

  const handleDeleteOpportunity = async () => {
    if (!selectedOpportunity) return;

    try {
      const response = await api.deleteJobOpportunity(selectedOpportunity.id);
      if (response.ok) {
        setShowDeleteModal(false);
        setSelectedOpportunity(null);
        await fetchOpportunities();
        await fetchStatusCounts();
        showMessage("Job opportunity deleted successfully!", "success");
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to delete job opportunity", "error");
    }
  };

  const openEditModal = (opportunity: JobOpportunityData) => {
    setSelectedOpportunity(opportunity);
    setShowEditModal(true);
  };

  const openDeleteModal = (opportunity: JobOpportunityData) => {
    setSelectedOpportunity(opportunity);
    setShowDeleteModal(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-10 max-w-[1400px] mx-auto bg-white font-poppins min-h-full flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="animate-spin text-blue-500 mx-auto mb-4"
            width={48}
          />
          <div className="text-2xl font-semibold text-slate-900 mb-2">
            Loading job opportunities...
          </div>
          <div className="text-base text-slate-500">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-white font-poppins min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Job Opportunities
          </h1>
          <p className="text-slate-600">
            Track positions you're interested in applying for • {opportunities.length}{" "}
            total
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2"
        >
          <Icon icon="mingcute:add-line" width={20} />
          Add Job Opportunity
        </button>
      </div>

      {/* View Mode Toggle and Status Filter */}
      <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("pipeline")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                viewMode === "pipeline"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              }`}
            >
              <Icon icon="mingcute:grid-line" width={18} />
              Pipeline View
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                viewMode === "list"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              }`}
            >
              <Icon icon="mingcute:list-check-line" width={18} />
              List View
            </button>
          </div>

          {/* Status Filter (only show in list view) */}
          {viewMode === "list" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Filter:</span>
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                }`}
              >
                All ({opportunities.length})
              </button>
              {JOB_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? "text-white"
                      : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                  }`}
                  style={{
                    backgroundColor:
                      statusFilter === status ? STATUS_COLORS[status] : undefined,
                  }}
                >
                  {status} ({statusCounts[status]})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Counts (only show in pipeline view) */}
      {viewMode === "pipeline" && (
        <div className="grid grid-cols-6 gap-4 mb-6">
          {JOB_STATUSES.map((status) => (
            <div
              key={status}
              className="bg-white rounded-lg p-4 border border-slate-200 text-center"
            >
              <div
                className="text-2xl font-bold mb-1"
                style={{ color: STATUS_COLORS[status] }}
              >
                {statusCounts[status]}
              </div>
              <div className="text-xs text-slate-600">{status}</div>
            </div>
          ))}
        </div>
      )}

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Icon
            icon="mingcute:check-circle-line"
            width={20}
            height={20}
            className="text-green-600"
          />
          <p className="text-green-800 text-sm m-0">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Icon
            icon="mingcute:alert-line"
            width={20}
            height={20}
            className="text-red-600"
          />
          <p className="text-red-800 text-sm m-0">{error}</p>
        </div>
      )}

      {/* Empty State for List View */}
      {viewMode === "list" && opportunities.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
          <Icon
            icon="mingcute:briefcase-line"
            width={64}
            className="mx-auto text-slate-300 mb-4"
          />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {statusFilter !== "all"
              ? `No jobs with status "${statusFilter}"`
              : "No Job Opportunities Yet"}
          </h3>
          <p className="text-slate-600 mb-6">
            {statusFilter !== "all"
              ? "Try selecting a different status filter or add a new job opportunity."
              : "Start tracking positions you're interested in by adding your first job opportunity."}
          </p>
          {statusFilter === "all" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium inline-flex items-center gap-2"
            >
              <Icon icon="mingcute:add-line" width={20} />
              Add Your First Opportunity
            </button>
          )}
        </div>
      )}

            {/* Pipeline View */}
            {viewMode === "pipeline" && opportunities.length > 0 && (
              <JobPipeline
                opportunities={opportunities}
                onStatusChange={handleStatusChange}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
              />
            )}

      {/* Bulk Actions Bar */}
      {viewMode === "list" && showBulkActions && selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size} job{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <button
                onClick={() => {
                  setSelectedIds(new Set());
                  setShowBulkActions(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear selection
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm text-blue-900 sm:mr-2">Update status to:</span>
              <div className="flex flex-wrap gap-2">
                {JOB_STATUSES.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleBulkStatusUpdate(status)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && opportunities.length > 0 && (
        <div>
          {/* Select All Checkbox */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size === opportunities.length && opportunities.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 text-blue-500 border-slate-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-slate-700">
              Select all ({opportunities.length})
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
                isSelected={selectedIds.has(opportunity.id)}
                onToggleSelect={() => toggleSelection(opportunity.id)}
                showCheckbox={true}
              />
            ))}
          </div>
        </div>
      )}


      {/* Modals */}
      {showAddModal && (
        <JobOpportunityFormModal
          title="Add Job Opportunity"
          onSubmit={handleAddOpportunity}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showEditModal && selectedOpportunity && (
        <JobOpportunityFormModal
          title="Edit Job Opportunity"
          initialData={selectedOpportunity}
          onSubmit={handleEditOpportunity}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOpportunity(null);
          }}
        />
      )}

      {showDeleteModal && selectedOpportunity && (
        <DeleteConfirmationModal
          opportunity={selectedOpportunity}
          onConfirm={handleDeleteOpportunity}
          onCancel={() => {
            setShowDeleteModal(false);
            setSelectedOpportunity(null);
          }}
        />
      )}
    </div>
  );
}

// Opportunity Card Component
function OpportunityCard({
  opportunity,
  onEdit,
  onDelete,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
}: {
  opportunity: JobOpportunityData;
  onEdit: (opportunity: JobOpportunityData) => void;
  onDelete: (opportunity: JobOpportunityData) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}) {
  const formatSalary = () => {
    if (opportunity.salaryMin && opportunity.salaryMax) {
      return `$${opportunity.salaryMin.toLocaleString()} - $${opportunity.salaryMax.toLocaleString()}`;
    } else if (opportunity.salaryMin) {
      return `$${opportunity.salaryMin.toLocaleString()}+`;
    } else if (opportunity.salaryMax) {
      return `Up to $${opportunity.salaryMax.toLocaleString()}`;
    }
    return null;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isDeadlinePassed = () => {
    if (!opportunity.applicationDeadline) return false;
    return new Date(opportunity.applicationDeadline) < new Date();
  };

  return (
    <div
      className={`bg-white rounded-xl p-6 shadow-sm border transition-all ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-200"
          : "border-slate-200 hover:shadow-md"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-2 flex-1">
          {showCheckbox && onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 mt-1 text-blue-500 border-slate-300 rounded focus:ring-blue-500"
            />
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {opportunity.title}
            </h3>
            <p className="text-base font-medium text-slate-700">
              {opportunity.company}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(opportunity)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Icon icon="mingcute:edit-line" width={18} />
          </button>
          <button
            onClick={() => onDelete(opportunity)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Icon icon="mingcute:delete-line" width={18} />
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-2">
        <span
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: STATUS_BG_COLORS[opportunity.status],
            color: STATUS_COLORS[opportunity.status],
          }}
        >
          {opportunity.status}
        </span>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 text-slate-600 text-sm mb-2">
        <Icon icon="mingcute:location-line" width={16} />
        <span>{opportunity.location}</span>
      </div>

      {/* Job Type & Industry */}
      {(opportunity.jobType || opportunity.industry) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {opportunity.jobType && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
              {opportunity.jobType}
            </span>
          )}
          {opportunity.industry && (
            <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
              {opportunity.industry}
            </span>
          )}
        </div>
      )}

      {/* Salary */}
      {formatSalary() && (
        <div className="flex items-center gap-2 text-slate-700 text-sm mb-3">
          <Icon icon="mingcute:currency-dollar-line" width={16} />
          <span>{formatSalary()}</span>
        </div>
      )}

      {/* Application Deadline */}
      {opportunity.applicationDeadline && (
        <div
          className={`flex items-center gap-2 text-sm mb-3 ${
            isDeadlinePassed() ? "text-red-600" : "text-slate-600"
          }`}
        >
          <Icon icon="mingcute:calendar-line" width={16} />
          <span>
            Deadline: {formatDate(opportunity.applicationDeadline)}
            {isDeadlinePassed() && " (Passed)"}
          </span>
        </div>
      )}

      {/* Description Preview */}
      {opportunity.description && (
        <p className="text-slate-600 text-sm mb-3 line-clamp-2">
          {opportunity.description}
        </p>
      )}

      {/* Job Posting URL */}
      {opportunity.jobPostingUrl && (
        <a
          href={opportunity.jobPostingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          <Icon icon="mingcute:external-link-line" width={16} />
          View Job Posting
        </a>
      )}
    </div>
  );
}

// Job Opportunity Form Modal Component
function JobOpportunityFormModal({
  title,
  initialData,
  onSubmit,
  onClose,
}: {
  title: string;
  initialData?: JobOpportunityData;
  onSubmit: (data: JobOpportunityInput) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<JobOpportunityInput>({
    title: initialData?.title || "",
    company: initialData?.company || "",
    location: initialData?.location || "",
    salaryMin: initialData?.salaryMin,
    salaryMax: initialData?.salaryMax,
    jobPostingUrl: initialData?.jobPostingUrl || "",
    applicationDeadline: initialData?.applicationDeadline
      ? initialData.applicationDeadline.split("T")[0]
      : "",
    description: initialData?.description || "",
    industry: initialData?.industry || "",
    jobType: initialData?.jobType || "",
    status: initialData?.status || "Interested",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const charCount = formData.description?.length || 0;
  const maxDescriptionLength = 2000;

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        company: initialData.company || "",
        location: initialData.location || "",
        salaryMin: initialData.salaryMin,
        salaryMax: initialData.salaryMax,
        jobPostingUrl: initialData.jobPostingUrl || "",
        applicationDeadline: initialData.applicationDeadline
          ? initialData.applicationDeadline.split("T")[0]
          : "",
        description: initialData.description || "",
        industry: initialData.industry || "",
        jobType: initialData.jobType || "",
        status: initialData.status || "Interested",
      });
    } else {
      setFormData({
        title: "",
        company: "",
        location: "",
        salaryMin: undefined,
        salaryMax: undefined,
        jobPostingUrl: "",
        applicationDeadline: "",
        description: "",
        industry: "",
        jobType: "",
        status: "Interested",
      });
    }
    setErrors({});
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Job title is required";
    }

    if (!formData.company.trim()) {
      newErrors.company = "Company name is required";
    }

    if (!formData.location || !formData.location.trim()) {
      newErrors.location = "Location is required";
    }

    if (formData.description && formData.description.length > maxDescriptionLength) {
      newErrors.description = `Description must be less than ${maxDescriptionLength} characters`;
    }

    if (formData.jobPostingUrl && !isValidUrl(formData.jobPostingUrl)) {
      newErrors.jobPostingUrl = getUrlErrorMessage("job posting URL");
    }

    if (
      formData.salaryMin !== undefined &&
      formData.salaryMin !== null &&
      formData.salaryMin < 0
    ) {
      newErrors.salaryMin = "Minimum salary cannot be negative";
    }

    if (
      formData.salaryMax !== undefined &&
      formData.salaryMax !== null &&
      formData.salaryMax < 0
    ) {
      newErrors.salaryMax = "Maximum salary cannot be negative";
    }

    if (
      formData.salaryMin !== undefined &&
      formData.salaryMin !== null &&
      formData.salaryMax !== undefined &&
      formData.salaryMax !== null &&
      formData.salaryMin > formData.salaryMax
    ) {
      newErrors.salaryMax = "Maximum salary must be greater than minimum salary";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const submitData: JobOpportunityInput = {
      title: formData.title.trim(),
      company: formData.company.trim(),
      location: formData.location?.trim() || "",
      salaryMin: formData.salaryMin || undefined,
      salaryMax: formData.salaryMax || undefined,
      jobPostingUrl: formData.jobPostingUrl?.trim() || undefined,
      applicationDeadline: formData.applicationDeadline || undefined,
      description: formData.description?.trim() || undefined,
      industry: formData.industry?.trim() || undefined,
      jobType: formData.jobType?.trim() || undefined,
      status: formData.status || "Interested",
    };

    await onSubmit(submitData);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            disabled={isSubmitting}
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? "border-red-500" : "border-slate-300"
              }`}
              placeholder="e.g., Senior Software Engineer"
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.company ? "border-red-500" : "border-slate-300"
              }`}
              placeholder="e.g., TechCorp Inc."
              disabled={isSubmitting}
            />
            {errors.company && (
              <p className="text-red-500 text-sm mt-1">{errors.company}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.location ? "border-red-500" : "border-slate-300"
              }`}
              placeholder="e.g., San Francisco, CA or Remote"
              disabled={isSubmitting}
            />
            {errors.location && (
              <p className="text-red-500 text-sm mt-1">{errors.location}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as JobStatus })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            >
              {JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Salary Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Minimum Salary
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  value={formData.salaryMin || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryMin: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.salaryMin ? "border-red-500" : "border-slate-300"
                  }`}
                  placeholder="50000"
                  min="0"
                  disabled={isSubmitting}
                />
              </div>
              {errors.salaryMin && (
                <p className="text-red-500 text-sm mt-1">{errors.salaryMin}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Maximum Salary
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  value={formData.salaryMax || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryMax: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.salaryMax ? "border-red-500" : "border-slate-300"
                  }`}
                  placeholder="100000"
                  min="0"
                  disabled={isSubmitting}
                />
              </div>
              {errors.salaryMax && (
                <p className="text-red-500 text-sm mt-1">{errors.salaryMax}</p>
              )}
            </div>
          </div>

          {/* Job Posting URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Job Posting URL
            </label>
            <input
              type="text"
              value={formData.jobPostingUrl}
              onChange={(e) =>
                setFormData({ ...formData, jobPostingUrl: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.jobPostingUrl ? "border-red-500" : "border-slate-300"
              }`}
              placeholder="https://example.com/job-posting"
              disabled={isSubmitting}
            />
            {errors.jobPostingUrl && (
              <p className="text-red-500 text-sm mt-1">
                {errors.jobPostingUrl}
              </p>
            )}
          </div>

          {/* Application Deadline */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Application Deadline
            </label>
            <input
              type="date"
              value={formData.applicationDeadline}
              onChange={(e) =>
                setFormData({ ...formData, applicationDeadline: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          {/* Industry & Job Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Industry
              </label>
              <select
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="">Select Industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Job Type
              </label>
              <select
                value={formData.jobType}
                onChange={(e) =>
                  setFormData({ ...formData, jobType: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="">Select Job Type</option>
                {JOB_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Job Description ({charCount}/{maxDescriptionLength} characters)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={6}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.description ? "border-red-500" : "border-slate-300"
              }`}
              placeholder="Enter job description..."
              disabled={isSubmitting}
              maxLength={maxDescriptionLength}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icon
                    icon="mingcute:loading-line"
                    className="animate-spin"
                    width={20}
                  />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmationModal({
  opportunity,
  onConfirm,
  onCancel,
}: {
  opportunity: JobOpportunityData;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <Icon
            icon="mingcute:alert-fill"
            className="text-red-500"
            width={32}
          />
          <h2 className="text-2xl font-bold text-slate-900">
            Delete Job Opportunity?
          </h2>
        </div>

        <p className="text-slate-600 mb-4">
          Are you sure you want to delete this job opportunity?
        </p>

        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <p className="font-semibold text-slate-900">{opportunity.title}</p>
          <p className="text-sm text-slate-600">{opportunity.company}</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            ⚠️ This action cannot be undone. The job opportunity will be
            permanently deleted.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Icon
                  icon="mingcute:loading-line"
                  className="animate-spin"
                  width={20}
                />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

