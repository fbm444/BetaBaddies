import { useState, useEffect, FormEvent } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import type {
  JobOpportunityData,
  JobOpportunityInput,
} from "../types";
import { INDUSTRIES, JOB_TYPES } from "../types";
import { isValidUrl, getUrlErrorMessage } from "../utils/urlValidation";

export function JobOpportunities() {
  const [opportunities, setOpportunities] = useState<JobOpportunityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<JobOpportunityData | null>(null);

  // Load opportunities on mount
  useEffect(() => {
    fetchOpportunities();
  }, []);

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
      const response = await api.getJobOpportunities();
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

  const handleAddOpportunity = async (data: JobOpportunityInput) => {
    try {
      const response = await api.createJobOpportunity(data);
      if (response.ok) {
        setShowAddModal(false);
        await fetchOpportunities();
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

      {/* Empty State */}
      {opportunities.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
          <Icon
            icon="mingcute:briefcase-line"
            width={64}
            className="mx-auto text-slate-300 mb-4"
          />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            No Job Opportunities Yet
          </h3>
          <p className="text-slate-600 mb-6">
            Start tracking positions you're interested in by adding your first job
            opportunity.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium inline-flex items-center gap-2"
          >
            <Icon icon="mingcute:add-line" width={20} />
            Add Your First Opportunity
          </button>
        </div>
      )}

      {/* Opportunities List */}
      {opportunities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
          ))}
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
}: {
  opportunity: JobOpportunityData;
  onEdit: (opportunity: JobOpportunityData) => void;
  onDelete: (opportunity: JobOpportunityData) => void;
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
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            {opportunity.title}
          </h3>
          <p className="text-base font-medium text-slate-700">
            {opportunity.company}
          </p>
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

