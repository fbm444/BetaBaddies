import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { JOB_STATUSES, INDUSTRIES, JobStatus } from "../types";

export interface JobOpportunityFilters {
  search?: string;
  status?: JobStatus | "all";
  industry?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  deadlineFrom?: string;
  deadlineTo?: string;
  sort?: string;
}

interface JobOpportunityFiltersProps {
  filters: JobOpportunityFilters;
  onFiltersChange: (filters: JobOpportunityFilters) => void;
  onClearFilters: () => void;
  showAdvanced?: boolean;
  hideSearchBar?: boolean;
  variant?: "card" | "plain";
  viewMode?: "list" | "pipeline" | "calendar";
  onViewModeChange?: (mode: "list" | "pipeline" | "calendar") => void;
  showArchivedValue?: boolean;
  onArchivedToggle?: (value: boolean) => void;
}

export function JobOpportunityFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  hideSearchBar = false,
  variant = "card",
  viewMode,
  onViewModeChange,
  showArchivedValue,
  onArchivedToggle,
}: JobOpportunityFiltersProps) {
  const showAdvanced = true;
  const [localFilters, setLocalFilters] = useState<JobOpportunityFilters>(filters);
  const [searchInput, setSearchInput] = useState(filters.search || "");

  const updateFilter = (key: keyof JobOpportunityFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
    setSearchInput(filters.search || "");
  }, [filters]);

  const applySearch = () => {
    if (searchInput === (filters.search || "")) {
      return;
    }
    const newFilters = { ...localFilters, search: searchInput || undefined };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const hasActiveFilters = () => {
    return !!(
      searchInput ||
      (localFilters.status && localFilters.status !== "all") ||
      localFilters.industry ||
      localFilters.location ||
      localFilters.salaryMin ||
      localFilters.salaryMax ||
      localFilters.deadlineFrom ||
      localFilters.deadlineTo ||
      (localFilters.sort && localFilters.sort !== "-created_at")
    );
  };

  const handleClearFilters = () => {
    const clearedFilters: JobOpportunityFilters = {
      sort: "-created_at",
    };
    setLocalFilters(clearedFilters);
    setSearchInput("");
    onClearFilters();
  };

  const wrapperClasses =
    variant === "card"
      ? "bg-white rounded-xl p-6 border border-slate-200 shadow-sm font-poppins"
      : "space-y-4 font-poppins";

  return (
    <div className={wrapperClasses}>
      {/* Search Bar */}
      {!hideSearchBar && (
        <div className="mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Icon
                icon="mingcute:search-line"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                width={20}
              />
              <input
                type="text"
                placeholder="Search by job title, company name, or keywords..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applySearch();
                  }
                }}
                className="w-full pl-12 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    updateFilter("search", "");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  type="button"
                >
                  <Icon icon="mingcute:close-line" width={18} />
                </button>
              )}
            </div>
            <button
              onClick={applySearch}
              type="button"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#3351FD] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2a45d4] disabled:bg-slate-300 disabled:text-slate-500"
              disabled={searchInput === (filters.search || "")}
            >
              <Icon icon="mingcute:search-2-line" width={18} />
              Search
            </button>
          </div>
        </div>
      )}

      {/* Quick Filters Row */}
      <div
        className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${
          hideSearchBar ? "" : "mb-4"
        }`}
      >
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Status
          </label>
          <select
            value={localFilters.status || "all"}
            onChange={(e) =>
              updateFilter("status", e.target.value === "all" ? undefined : e.target.value)
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            {JOB_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Industry Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Industry
          </label>
          <select
            value={localFilters.industry || ""}
            onChange={(e) => updateFilter("industry", e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Industries</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Location
          </label>
          <input
            type="text"
            placeholder="City, State, or Remote"
            value={localFilters.location || ""}
            onChange={(e) => updateFilter("location", e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Sort By
          </label>
          <select
            value={localFilters.sort || "-created_at"}
            onChange={(e) => updateFilter("sort", e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="-created_at">Newest First</option>
            <option value="created_at">Oldest First</option>
            <option value="-application_deadline">Deadline (Earliest)</option>
            <option value="application_deadline">Deadline (Latest)</option>
            <option value="company">Company (A-Z)</option>
            <option value="-company">Company (Z-A)</option>
            <option value="salary">Salary (Low to High)</option>
            <option value="-salary">Salary (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between">
        <div />

        {hasActiveFilters() && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
          >
            <Icon icon="mingcute:close-line" width={16} />
            Clear All Filters
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Salary Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Salary Range
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={localFilters.salaryMin || ""}
                    onChange={(e) =>
                      updateFilter("salaryMin", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <span className="self-center text-slate-500">to</span>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Max"
                    value={localFilters.salaryMax || ""}
                    onChange={(e) =>
                      updateFilter("salaryMax", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Application Deadline Range
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="date"
                value={localFilters.deadlineFrom || ""}
                onChange={(e) => updateFilter("deadlineFrom", e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={localFilters.deadlineTo || ""}
                onChange={(e) => updateFilter("deadlineTo", e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {(onViewModeChange || onArchivedToggle) && (
        <div className="mt-6 space-y-4 pt-4 border-t border-slate-200">
          {onArchivedToggle !== undefined && (
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-2">
                Data Set
              </span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => onArchivedToggle(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    !showArchivedValue
                      ? "bg-white text-slate-900 shadow"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => onArchivedToggle(true)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    showArchivedValue
                      ? "bg-[#F89000] text-white shadow"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Archived
                </button>
              </div>
            </div>
          )}

          {onViewModeChange && viewMode && (
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-2">
                View Mode
              </span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                {(["pipeline", "list", "calendar"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onViewModeChange(mode)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                      viewMode === mode
                        ? "bg-white text-slate-900 shadow"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {mode.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

