import { useState, useEffect, useMemo, useRef, FormEvent } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import type { JobOpportunityData, JobOpportunityInput, JobStatus } from "../types";
import { INDUSTRIES, JOB_TYPES, JOB_STATUSES, STATUS_COLORS, STATUS_BG_COLORS } from "../types";
import { isValidUrl, getUrlErrorMessage } from "../utils/urlValidation";
import { highlightSearchTerm } from "../utils/searchHighlight";
import {
  getDaysRemaining,
  getDeadlineUrgency,
  getDeadlineColor,
  getDeadlineBgColor,
  formatDeadlineText,
} from "../utils/deadlineUtils";
import { JobPipeline } from "../components/JobPipeline";
import { JobOpportunityDetailModal } from "../components/JobOpportunityDetailModal";
import {
  JobOpportunityFilters,
  JobOpportunityFilters as FiltersComponent,
} from "../components/JobOpportunityFilters";
import { DeadlineCalendar } from "../components/DeadlineCalendar";
import { ArchiveModal } from "../components/ArchiveModal";
import { JobStatisticsSection } from "../components/JobStatisticsSection";
import { JobImportModal } from "../components/JobImportModal";

export function JobOpportunities() {
  const statisticsRef = useRef<HTMLDivElement>(null);
  const [opportunities, setOpportunities] = useState<JobOpportunityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // View mode: 'list', 'pipeline', or 'calendar'
  const [viewMode, setViewMode] = useState<"list" | "pipeline" | "calendar">("pipeline");
  const [previousViewMode, setPreviousViewMode] =
    useState<"list" | "pipeline" | "calendar">("pipeline");

  // Archive view mode
  const [showArchived, setShowArchived] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<JobOpportunityFilters>(() => {
    // Load saved preferences from localStorage
    const saved = localStorage.getItem("jobOpportunityFilters");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { sort: "-created_at" };
      }
    }
    return { sort: "-created_at" };
  });

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedJobData, setImportedJobData] = useState<JobOpportunityInput | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{
    type: "single" | "bulk";
    opportunity?: JobOpportunityData;
    opportunityIds?: string[];
  } | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<JobOpportunityData | null>(null);
  const [quickAddStatus, setQuickAddStatus] = useState<JobStatus | undefined>(undefined);
  const [addContextNote, setAddContextNote] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Notification state for undo
  const [undoArchive, setUndoArchive] = useState<{
    opportunityId: string;
    timeout: ReturnType<typeof setTimeout>;
  } | null>(null);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("jobOpportunityFilters", JSON.stringify(filters));
  }, [filters]);

  // Load opportunities and status counts on mount and when filter/view changes
  useEffect(() => {
    const loadData = async () => {
      await fetchOpportunities();
      if (!showArchived) {
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, viewMode, showArchived]);

  // Keep selected opportunity in sync with opportunities list
  useEffect(() => {
    if (selectedOpportunity && opportunities.length > 0) {
      const updated = opportunities.find((o) => o.id === selectedOpportunity.id);
      if (updated) {
        setSelectedOpportunity(updated);
      }
    }
  }, [opportunities]);

  // Clear selection when switching to pipeline view
  useEffect(() => {
    if (viewMode === "pipeline") {
      setSelectedIds(new Set());
      setShowBulkActions(false);
    }
  }, [viewMode]);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  const showMessage = (text: string, type: "success" | "error") => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = null;
    }

    if (type === "success") {
      setSuccessMessage(text);
      setError(null);
    } else {
      setError(text);
      setSuccessMessage(null);
    }
    messageTimeoutRef.current = setTimeout(() => {
      if (type === "success") {
        setSuccessMessage(null);
      } else {
        setError(null);
      }
      messageTimeoutRef.current = null;
    }, 5000);
  };

  const fetchOpportunities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (showArchived) {
        // Fetch archived opportunities
        const filterParams: any = {
          sort: filters.sort || "-archived_at",
          limit: 100,
        };
        const response = await api.getArchivedJobOpportunities(filterParams);
        if (response.ok && response.data) {
          setOpportunities(response.data.jobOpportunities);
        }
      } else {
        // Fetch active opportunities
        const filterParams: any = {
          sort: filters.sort || "-created_at",
          limit: 100, // Increased limit for better filtering
          search: filters.search,
          industry: filters.industry,
          location: filters.location,
          salaryMin: filters.salaryMin,
          salaryMax: filters.salaryMax,
          deadlineFrom: filters.deadlineFrom,
          deadlineTo: filters.deadlineTo,
        };

        // Only apply status filter in list view
        if (viewMode === "list" && filters.status && filters.status !== "all") {
          filterParams.status = filters.status;
        }

        const response = await api.getJobOpportunities(filterParams);
        if (response.ok && response.data) {
          setOpportunities(response.data.jobOpportunities);
        }
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

  const handleStatusChange = async (id: string, newStatus: JobStatus) => {
    try {
      const response = await api.updateJobOpportunity(id, { status: newStatus });
      if (response.ok) {
        await fetchOpportunities();
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
        showMessage(
          `${response.data.updatedOpportunities.length} job(s) updated successfully!`,
          "success"
        );
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to update jobs", "error");
    }
  };

  const handleBulkDeadlineExtension = async (days: number) => {
    if (selectedIds.size === 0) return;

    try {
      const selectedOpportunities = opportunities.filter((opp) =>
        selectedIds.has(opp.id)
      );
      
      // Filter to only opportunities with deadlines
      const opportunitiesWithDeadlines = selectedOpportunities.filter(
        (opp) => opp.applicationDeadline
      );

      if (opportunitiesWithDeadlines.length === 0) {
        showMessage(
          "Selected jobs don't have deadlines to extend",
          "error"
        );
        return;
      }

      // Update each opportunity's deadline
      const updatePromises = opportunitiesWithDeadlines.map(async (opp) => {
        const currentDate = new Date(opp.applicationDeadline!);
        currentDate.setDate(currentDate.getDate() + days);
        const newDeadline = currentDate.toISOString().split("T")[0];

        return api.updateJobOpportunity(opp.id, {
          ...opp,
          applicationDeadline: newDeadline,
        });
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter((r) => r.ok).length;

      if (successCount > 0) {
        setSelectedIds(new Set());
        setShowBulkActions(false);
        await fetchOpportunities();
        showMessage(
          `${successCount} job deadline(s) extended by ${days} days!`,
          "success"
        );
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to extend deadlines", "error");
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

  const openDetailModal = (opportunity: JobOpportunityData) => {
    setSelectedOpportunity(opportunity);
    setShowDetailModal(true);
  };

  const openArchiveModal = (opportunity?: JobOpportunityData) => {
    if (opportunity) {
      setArchiveTarget({ type: "single", opportunity });
    } else if (selectedIds.size > 0) {
      setArchiveTarget({ type: "bulk", opportunityIds: Array.from(selectedIds) });
    }
    setShowArchiveModal(true);
  };

  const handleArchive = async (archiveReason?: string) => {
    if (!archiveTarget) return;

    try {
      setShowArchiveModal(false);

      if (archiveTarget.type === "single" && archiveTarget.opportunity) {
        const response = await api.archiveJobOpportunity(
          archiveTarget.opportunity.id,
          archiveReason
        );
        if (response.ok && response.data) {
          await fetchOpportunities();
          showMessage("Job opportunity archived successfully!", "success");
          
          // Set up undo option
          const timeout = setTimeout(async () => {
            setUndoArchive(null);
          }, 10000); // 10 seconds to undo
          
          setUndoArchive({
            opportunityId: archiveTarget.opportunity!.id,
            timeout,
          });
        }
      } else if (archiveTarget.type === "bulk" && archiveTarget.opportunityIds) {
        const response = await api.bulkArchiveJobOpportunities(
          archiveTarget.opportunityIds,
          archiveReason
        );
        if (response.ok && response.data) {
          setSelectedIds(new Set());
          setShowBulkActions(false);
          await fetchOpportunities();
          showMessage(
            `${response.data.archivedOpportunities.length} job(s) archived successfully!`,
            "success"
          );
        }
      }
      
      setArchiveTarget(null);
    } catch (err: any) {
      showMessage(err.message || "Failed to archive job opportunity", "error");
    }
  };

  const handleUnarchive = async (opportunityId: string) => {
    try {
      const response = await api.unarchiveJobOpportunity(opportunityId);
      if (response.ok && response.data) {
        await fetchOpportunities();
        showMessage("Job opportunity restored successfully!", "success");
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to restore job opportunity", "error");
    }
  };

  const handleUndoArchive = async () => {
    if (!undoArchive) return;
    
    clearTimeout(undoArchive.timeout);
    await handleUnarchive(undoArchive.opportunityId);
    setUndoArchive(null);
  };

  const handleDetailSave = async (data: JobOpportunityInput) => {
    if (!selectedOpportunity) return;
    try {
      const response = await api.updateJobOpportunity(selectedOpportunity.id, data);
      if (response.ok && response.data) {
        // Update the selected opportunity with the response data
        setSelectedOpportunity(response.data.jobOpportunity);
        await fetchOpportunities();
        showMessage("Job opportunity updated successfully!", "success");
      }
    } catch (err: any) {
      showMessage(err.message || "Failed to update job opportunity", "error");
      throw err;
    }
  };

  const handleDetailDelete = async () => {
    if (!selectedOpportunity) return;
    setShowDetailModal(false);
    await handleDeleteOpportunity();
  };

  const handleToggleArchived = (value: boolean) => {
    setShowArchived(value);
    if (value) {
      setPreviousViewMode(viewMode);
      setViewMode("list");
    } else {
      setViewMode(previousViewMode);
    }
    setIsFiltersOpen(false);
  };

  const handleViewModeChange = (mode: "list" | "pipeline" | "calendar") => {
    if (showArchived && mode !== "list") {
      setShowArchived(false);
    }
    setViewMode(mode);
    if (!showArchived || mode !== "list") {
      setPreviousViewMode(mode);
    }
  };

  const handleOpenAddModal = (status?: JobStatus, note?: string | null) => {
    setQuickAddStatus(status);
    setAddContextNote(note || null);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setQuickAddStatus(undefined);
    setAddContextNote(null);
    setImportedJobData(null);
  };

  const hasActiveFilters = useMemo(() => {
    return !!(
      (filters.status && filters.status !== "all") ||
      filters.industry ||
      filters.location ||
      filters.salaryMin ||
      filters.salaryMax ||
      filters.deadlineFrom ||
      filters.deadlineTo ||
      (filters.sort && filters.sort !== "-created_at")
    );
  }, [filters]);

  useEffect(() => {
    setSearchValue(filters.search || "");
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setFilters((prev) => ({
      ...prev,
      search: value.trim() ? value : undefined,
    }));
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
    <div className="min-h-screen bg-white font-poppins">
      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900">Job Status Management</h1>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 mb-6">
          <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-xl">
            <div className="relative flex-1">
              <Icon
                icon="mingcute:search-line"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                width={20}
              />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search job applications..."
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-full shadow-sm focus:ring-2 focus:ring-[#5490FF] focus:border-transparent text-slate-700 text-sm"
              />
              {searchValue && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <Icon icon="mingcute:close-line" width={18} />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsFiltersOpen(true)}
              className={`px-4 py-2 rounded-full border transition-colors font-medium inline-flex items-center gap-2 text-sm ${
                hasActiveFilters
                  ? "border-[#5490FF] bg-[#EEF4FF] text-[#2F5DFF]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon icon="mingcute:filter-line" width={16} />
              Filter
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!showArchived && (
              <>
                <button
                  onClick={() => handleOpenAddModal(undefined, null)}
                  className="px-4 py-2 rounded-full bg-[#5490FF] text-white text-sm font-semibold inline-flex items-center gap-2 shadow hover:bg-[#4478D9]"
                >
                  <Icon icon="mingcute:add-line" width={16} />
                  Add New Application
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-sm font-semibold inline-flex items-center gap-2 shadow-sm hover:bg-slate-100"
                >
                  <Icon icon="mingcute:link-line" width={16} />
                  Import from URL
                </button>
                <button
                  onClick={() => {
                    statisticsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-sm font-semibold inline-flex items-center gap-2 shadow-sm hover:bg-slate-100"
                >
                  <Icon icon="mingcute:chart-line" width={16} />
                  View Statistics
                </button>
              </>
            )}
            <button
              onClick={() => handleToggleArchived(!showArchived)}
              className="font-semibold text-slate-600 hover:text-slate-900 text-sm"
            >
              {showArchived ? "Back to Active Jobs" : "View Archived Jobs"}
            </button>
          </div>
        </div>

        {/* Filters Modal */}
        {isFiltersOpen && (
          <div className="fixed inset-0 z-40 flex justify-end">
            <div
              className="absolute inset-0 bg-slate-900/30"
              onClick={() => setIsFiltersOpen(false)}
            />
            <div className="relative h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 pt-12 pb-6 px-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Filters</h2>
                <button
                  onClick={() => setIsFiltersOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Icon icon="mingcute:close-line" width={22} />
                </button>
              </div>
              <FiltersComponent
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={() => setFilters({ sort: "-created_at" })}
                hideSearchBar
                variant="plain"
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                showArchivedValue={showArchived}
                onArchivedToggle={handleToggleArchived}
              />
              <div className="mt-6">
                <button
                  onClick={() => setIsFiltersOpen(false)}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Icon
                icon="mingcute:check-circle-line"
                width={20}
                height={20}
                className="text-green-600"
              />
              <p className="text-green-800 text-sm m-0">{successMessage}</p>
            </div>
            {undoArchive && successMessage.includes("archived") && (
              <button
                onClick={handleUndoArchive}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Icon icon="mingcute:refresh-line" width={16} />
                Undo
              </button>
            )}
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

        {/* View Content */}
        {!showArchived && viewMode === "pipeline" && (
          <JobPipeline
            opportunities={opportunities}
            onStatusChange={handleStatusChange}
            onView={openDetailModal}
            onCreate={(status) =>
              handleOpenAddModal(
                status,
                `Adding a new application directly to ${status}. You can always adjust the stage later.`
              )
            }
            searchTerm={filters.search}
          />
        )}

        {!showArchived && viewMode === "calendar" && (
          <DeadlineCalendar
            opportunities={opportunities}
            onOpportunityClick={openDetailModal}
          />
        )}

      {/* Empty State for List View */}
      {viewMode === "list" && opportunities.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
          <Icon
            icon={showArchived ? "mingcute:archive-line" : "mingcute:briefcase-line"}
            width={64}
            className="mx-auto text-slate-300 mb-4"
          />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {showArchived
              ? "No Archived Jobs"
              : filters.search ||
                filters.status ||
                filters.industry ||
                filters.location ||
                filters.salaryMin ||
                filters.salaryMax ||
                filters.deadlineFrom ||
                filters.deadlineTo
              ? "No jobs match your filters"
              : "No Job Opportunities Yet"}
          </h3>
          <p className="text-slate-600 mb-6">
            {showArchived
              ? "You haven't archived any job opportunities yet. Archive completed or irrelevant jobs to keep your active list organized."
              : filters.search ||
                filters.status ||
                filters.industry ||
                filters.location ||
                filters.salaryMin ||
                filters.salaryMax ||
                filters.deadlineFrom ||
                filters.deadlineTo
              ? "Try adjusting your search criteria or filters to see more results."
              : "Start tracking positions you're interested in by adding your first job opportunity."}
          </p>
          {!showArchived &&
            !(filters.search ||
              filters.status ||
              filters.industry ||
              filters.location ||
              filters.salaryMin ||
              filters.salaryMax ||
              filters.deadlineFrom ||
              filters.deadlineTo) && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium inline-flex items-center gap-2"
              >
                <Icon icon="mingcute:add-line" width={20} />
                Add Your First Opportunity
              </button>
            )}
          {!showArchived &&
            (filters.search ||
              filters.status ||
              filters.industry ||
              filters.location ||
              filters.salaryMin ||
              filters.salaryMax ||
              filters.deadlineFrom ||
              filters.deadlineTo) && (
              <button
                onClick={() => setFilters({ sort: "-created_at" })}
                className="px-6 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors font-medium inline-flex items-center gap-2"
              >
                <Icon icon="mingcute:close-line" width={20} />
                Clear Filters
              </button>
            )}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {viewMode === "list" && !showArchived && showBulkActions && selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col gap-4">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
              <div className="border-t sm:border-t-0 sm:border-l border-blue-300 pt-4 sm:pt-0 sm:pl-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-sm text-blue-900 sm:mr-2">Extend deadline by:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleBulkDeadlineExtension(7)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      +7 days
                    </button>
                    <button
                      onClick={() => handleBulkDeadlineExtension(14)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      +14 days
                    </button>
                    <button
                      onClick={() => handleBulkDeadlineExtension(30)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      +30 days
                    </button>
                  </div>
                </div>
              </div>
              <div className="border-t sm:border-t-0 sm:border-l border-blue-300 pt-4 sm:pt-0 sm:pl-4">
                <button
                  onClick={() => openArchiveModal()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-2"
                >
                  <Icon icon="mingcute:archive-line" width={16} />
                  Archive Selected
                </button>
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
                  onView={openDetailModal}
                  onArchive={openArchiveModal}
                  onUnarchive={handleUnarchive}
                  isSelected={selectedIds.has(opportunity.id)}
                  onToggleSelect={() => toggleSelection(opportunity.id)}
                  showCheckbox={true}
                  searchTerm={filters.search}
                  showArchived={showArchived}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showAddModal && (
        <JobOpportunityFormModal
          title="Add Job Opportunity"
          onSubmit={handleAddOpportunity}
          onClose={handleCloseAddModal}
          defaultStatus={quickAddStatus}
          contextNote={addContextNote}
          initialData={importedJobData || undefined}
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

      {/* Detail Modal */}
      {showDetailModal && selectedOpportunity && (
        <JobOpportunityDetailModal
          opportunity={selectedOpportunity}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOpportunity(null);
          }}
          onSave={handleDetailSave}
          onDelete={handleDetailDelete}
          onArchive={() => {
            setArchiveTarget({ type: "single", opportunity: selectedOpportunity });
            setShowDetailModal(false);
            setShowArchiveModal(true);
          }}
          onUnarchive={() => handleUnarchive(selectedOpportunity.id)}
        />
      )}

      {/* Archive Modal */}
      {showArchiveModal && archiveTarget && (
        <ArchiveModal
          title={
            archiveTarget.type === "bulk"
              ? `Archive ${archiveTarget.opportunityIds?.length || 0} Jobs`
              : "Archive Job Opportunity"
          }
          message={
            archiveTarget.type === "bulk"
              ? `Are you sure you want to archive ${archiveTarget.opportunityIds?.length || 0} selected job opportunities? You can restore them later from the Archived Jobs view.`
              : `Are you sure you want to archive "${archiveTarget.opportunity?.title}" at ${archiveTarget.opportunity?.company}? You can restore it later from the Archived Jobs view.`
          }
          onConfirm={handleArchive}
          onCancel={() => {
            setShowArchiveModal(false);
            setArchiveTarget(null);
          }}
          isBulk={archiveTarget.type === "bulk"}
          itemCount={archiveTarget.type === "bulk" ? archiveTarget.opportunityIds?.length || 0 : 1}
        />
      )}

      {/* Statistics Section - Only show for active jobs */}
      {!showArchived && <JobStatisticsSection scrollRef={statisticsRef} />}

      {/* Import Modal */}
      {showImportModal && (
        <JobImportModal
          onImport={(data) => {
            setImportedJobData(data);
            setShowImportModal(false);
            // Open add modal with imported data
            setShowAddModal(true);
          }}
          onClose={() => {
            setShowImportModal(false);
            setImportedJobData(null);
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
  onView,
  onArchive,
  onUnarchive,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
  searchTerm,
  showArchived = false,
}: {
  opportunity: JobOpportunityData;
  onEdit: (opportunity: JobOpportunityData) => void;
  onDelete: (opportunity: JobOpportunityData) => void;
  onView?: (opportunity: JobOpportunityData) => void;
  onArchive?: (opportunity: JobOpportunityData) => void;
  onUnarchive?: (opportunityId: string) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
  searchTerm?: string;
  showArchived?: boolean;
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

  const daysRemaining = getDaysRemaining(opportunity.applicationDeadline);
  const urgency = getDeadlineUrgency(daysRemaining);
  const deadlineColor = getDeadlineColor(urgency);
  const deadlineBgColor = getDeadlineBgColor(urgency);

  return (
    <div
      className={`bg-white rounded-xl p-6 shadow-sm border transition-all ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-200"
          : "border-slate-200 hover:shadow-md"
      } ${onView ? "cursor-pointer" : ""}`}
      onClick={() => onView && onView(opportunity)}
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
              {highlightSearchTerm(opportunity.title, searchTerm)}
            </h3>
            <p className="text-base font-medium text-slate-700">
              {highlightSearchTerm(opportunity.company, searchTerm)}
            </p>
          </div>
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {!showArchived && onArchive && (
            <button
              onClick={() => onArchive(opportunity)}
              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Archive"
            >
              <Icon icon="mingcute:archive-line" width={18} />
            </button>
          )}
          {showArchived && onUnarchive && (
            <button
              onClick={() => onUnarchive(opportunity.id)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Restore"
            >
              <Icon icon="mingcute:refresh-line" width={18} />
            </button>
          )}
          {!showArchived && (
            <button
              onClick={() => onEdit(opportunity)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Icon icon="mingcute:edit-line" width={18} />
            </button>
          )}
          <button
            onClick={() => onDelete(opportunity)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Icon icon="mingcute:delete-line" width={18} />
          </button>
        </div>
      </div>

      {/* Status Badge and Archive Info */}
      <div className="mb-2 flex items-center gap-2 flex-wrap">
        <span
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: STATUS_BG_COLORS[opportunity.status],
            color: STATUS_COLORS[opportunity.status],
          }}
        >
          {opportunity.status}
        </span>
        {showArchived && opportunity.archivedAt && (
          <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
            Archived {formatDate(opportunity.archivedAt)}
          </span>
        )}
        {showArchived && opportunity.archiveReason && (
          <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
            {opportunity.archiveReason}
          </span>
        )}
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
        <div className="mb-3">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: deadlineBgColor,
              color: deadlineColor,
            }}
          >
            <Icon icon="mingcute:calendar-line" width={16} />
            <span>
              {formatDeadlineText(daysRemaining)} •{" "}
              {formatDate(opportunity.applicationDeadline)}
            </span>
          </div>
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
  defaultStatus,
  contextNote,
}: {
  title: string;
  initialData?: JobOpportunityData | JobOpportunityInput;
  onSubmit: (data: JobOpportunityInput) => void;
  onClose: () => void;
  defaultStatus?: JobStatus;
  contextNote?: string | null;
}) {
  // Helper to get date string from either format
  const getDateString = (date?: string | null) => {
    if (!date) return "";
    // Handle ISO date string
    if (date.includes("T")) {
      return date.split("T")[0];
    }
    // Handle date-only string (YYYY-MM-DD)
    return date;
  };

  const [formData, setFormData] = useState<JobOpportunityInput>({
    title: initialData?.title || "",
    company: initialData?.company || "",
    location: initialData?.location || "",
    salaryMin: initialData?.salaryMin,
    salaryMax: initialData?.salaryMax,
    jobPostingUrl: initialData?.jobPostingUrl || "",
    applicationDeadline: getDateString(
      "applicationDeadline" in (initialData || {}) ? initialData?.applicationDeadline : undefined
    ),
    description: initialData?.description || "",
    industry: initialData?.industry || "",
    jobType: initialData?.jobType || "",
    status: initialData?.status || defaultStatus || "Interested",
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
        applicationDeadline: getDateString(
          "applicationDeadline" in initialData ? initialData.applicationDeadline : undefined
        ),
        description: initialData.description || "",
        industry: initialData.industry || "",
        jobType: initialData.jobType || "",
        status: initialData.status || defaultStatus || "Interested",
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
        status: defaultStatus || "Interested",
      });
    }
    setErrors({});
  }, [initialData, defaultStatus]);

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

        {contextNote && (
          <div className="bg-violet-50 border border-violet-200 text-violet-800 text-sm rounded-xl p-4 mb-4">
            {contextNote}
          </div>
        )}

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

