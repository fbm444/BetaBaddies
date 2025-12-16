import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { ProjectData, ProjectInput } from "../types";
import { api } from "../services/api";
import { isValidUrl, getUrlErrorMessage } from "../utils/urlValidation";
import { GitHubImportModal } from "../components/GitHubImportModal";

export function Projects() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showGitHubImportModal, setShowGitHubImportModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState<ProjectInput>({
    name: "",
    link: "",
    description: "",
    start_date: "",
    end_date: "",
    technologies: "",
    collaborators: "",
    status: "Ongoing",
    industry: "",
  });

  // Form errors state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Filter and sort whenever relevant state changes
  useEffect(() => {
    let filtered = [...projects];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          project.technologies?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((project) => project.status === statusFilter);
    }

    // Apply sorting
    if (sortBy === "date") {
      filtered.sort(
        (a, b) =>
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm, statusFilter, sortBy]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getProjects();
      setProjects(response.data.projects || []);
    } catch (err: any) {
      console.error("Failed to fetch projects:", err);
      setError(err.message || "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProject = async () => {
    // Validate form first
    if (!validateForm()) {
      return;
    }

    try {
      // Convert snake_case to camelCase for backend
      const backendData: any = {
        name: formData.name,
        status: formData.status,
        startDate: formData.start_date,
      };

      // Only add optional fields if they have values
      if (formData.link && formData.link.trim())
        backendData.link = formData.link;
      if (formData.description && formData.description.trim())
        backendData.description = formData.description;
      if (formData.end_date && formData.end_date.trim())
        backendData.endDate = formData.end_date;
      if (formData.technologies && formData.technologies.trim())
        backendData.technologies = formData.technologies;
      if (formData.collaborators && formData.collaborators.trim())
        backendData.collaborators = formData.collaborators;
      if (formData.industry && formData.industry.trim())
        backendData.industry = formData.industry;

      console.log("Sending project data:", backendData);
      await api.createProject(backendData);
      setShowAddModal(false);
      resetForm();
      fetchProjects();
    } catch (err: any) {
      console.error("Failed to create project:", err);
      const errorMessage =
        err.status === 409
          ? "A project with this name already exists. Please use a different name."
          : err.message || "Failed to create project";
      alert(errorMessage);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    // Validate form first
    if (!validateForm()) {
      return;
    }

    try {
      // Convert snake_case to camelCase for backend
      const backendData: any = {
        name: formData.name,
        status: formData.status,
        startDate: formData.start_date,
      };

      // Only add optional fields if they have values
      if (formData.link && formData.link.trim())
        backendData.link = formData.link;
      if (formData.description && formData.description.trim())
        backendData.description = formData.description;
      if (formData.end_date && formData.end_date.trim())
        backendData.endDate = formData.end_date;
      if (formData.technologies && formData.technologies.trim())
        backendData.technologies = formData.technologies;
      if (formData.collaborators && formData.collaborators.trim())
        backendData.collaborators = formData.collaborators;
      if (formData.industry && formData.industry.trim())
        backendData.industry = formData.industry;

      console.log("Updating project data:", backendData);
      await api.updateProject(selectedProject.id, backendData);
      setShowEditModal(false);
      resetForm();
      setSelectedProject(null);
      fetchProjects();
    } catch (err: any) {
      console.error("Failed to update project:", err);
      const errorMessage =
        err.status === 409
          ? "Another project with this name already exists."
          : err.message || "Failed to update project";
      alert(errorMessage);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.deleteProject(id);
      fetchProjects();
    } catch (err: any) {
      alert(err.message || "Failed to delete project");
    }
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (project: ProjectData) => {
    setSelectedProject(project);
    
    // Helper function to format date for HTML date input (YYYY-MM-DD)
    const formatDateForInput = (dateString: string | null | undefined): string => {
      if (!dateString) return "";
      try {
        // Parse the ISO date and extract YYYY-MM-DD
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return "";
      }
    };
    
    setFormData({
      name: project.name,
      link: project.link || "",
      description: project.description || "",
      start_date: formatDateForInput(project.start_date),
      end_date: formatDateForInput(project.end_date),
      technologies: project.technologies || "",
      collaborators: project.collaborators || "",
      status: project.status,
      industry: project.industry || "",
    });
    setShowEditModal(true);
  };

  const openDetailModal = (project: ProjectData) => {
    setSelectedProject(project);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      link: "",
      description: "",
      start_date: "",
      end_date: "",
      technologies: "",
      collaborators: "",
      status: "Ongoing",
      industry: "",
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate required fields
    if (!formData.name || !formData.name.trim()) {
      errors.name = "Project name is required";
      console.log("❌ Validation failed: Project name is required");
    }

    if (!formData.start_date) {
      errors.start_date = "Start date is required";
      console.log("❌ Validation failed: Start date is required");
    }

    // Validate URL if provided (optional field)
    if (formData.link && formData.link.trim()) {
      const isValid = isValidUrl(formData.link);
      console.log(`URL validation: "${formData.link}" -> ${isValid ? "✅ Valid" : "❌ Invalid"}`);
      
      if (!isValid) {
        errors.link = getUrlErrorMessage("project link");
      }
    } else {
      console.log("URL field is empty, skipping validation");
    }

    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      console.log("❌ Form validation failed:", errors);
      return false;
    }
    
    console.log("✅ Form validation passed");
    return true;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "Ongoing":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Planned":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Present";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  if (isLoading) {
    return (
      <div className="p-10 max-w-[1400px] mx-auto bg-white font-sans min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-slate-900 mb-2">
            Loading projects...
          </div>
          <div className="text-base text-slate-500">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-white font-sans min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Projects Portfolio
          </h1>
          <p className="text-lg text-slate-600">
            Showcase your work and achievements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGitHubImportModal(true)}
            className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-medium hover:bg-slate-200 transition-all flex items-center gap-2 shadow-sm"
          >
            <Icon icon="mingcute:github-line" width={20} />
            Import from GitHub
          </button>
          <button
            onClick={openAddModal}
            className="bg-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-800 transition-all flex items-center gap-2 shadow-md"
          >
            <Icon icon="mingcute:add-line" width={20} />
            Add Project
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Icon
                icon="mingcute:search-line"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                width={20}
              />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="project-status-filter" className="sr-only">
              Filter projects by status
            </label>
            <select
              id="project-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              aria-label="Filter projects by status"
            >
              <option value="all">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Planned">Planned</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex gap-2">
            <label htmlFor="project-sort-select" className="sr-only">
              Sort projects
            </label>
            <select
              id="project-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "name")}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              aria-label="Sort projects"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
            </select>

            {/* View Toggle */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2 ${
                  viewMode === "grid"
                    ? "bg-blue-700 text-white"
                    : "bg-white text-slate-600"
                }`}
              >
                <Icon icon="mingcute:grid-line" width={20} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 ${
                  viewMode === "list"
                    ? "bg-blue-700 text-white"
                    : "bg-white text-slate-600"
                }`}
              >
                <Icon icon="mingcute:list-check-line" width={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Active filters summary */}
        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="text-slate-600 font-medium">
            {filteredProjects.length} projects
          </span>
          {searchTerm && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
              Search: "{searchTerm}"
            </span>
          )}
          {statusFilter !== "all" && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
              Status: {statusFilter}
            </span>
          )}
        </div>
      </div>

      {/* Projects Grid/List */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100">
          <Icon
            icon="mingcute:folder-line"
            width={64}
            className="mx-auto text-slate-300 mb-4"
          />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            No projects found
          </h3>
          <p className="text-slate-600 mb-6">
            Start by adding your first project to showcase your work
          </p>
          <button
            onClick={openAddModal}
            className="bg-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-800 transition-all inline-flex items-center gap-2"
          >
            <Icon icon="mingcute:add-line" width={20} />
            Add Your First Project
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all cursor-pointer group"
            >
              {/* Project Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">
                    {project.name}
                  </h3>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      project.status
                    )}`}
                  >
                    {project.status}
                  </span>
                </div>
              </div>

              {/* Project Description */}
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {project.description || "No description provided"}
              </p>

              {/* Technologies */}
              {project.technologies && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.technologies
                    .split(",")
                    .slice(0, 3)
                    .map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-slate-50 text-slate-700 rounded text-xs font-medium border border-slate-200"
                      >
                        {tech.trim()}
                      </span>
                    ))}
                  {project.technologies.split(",").length > 3 && (
                    <span className="px-2 py-1 text-slate-500 text-xs">
                      +{project.technologies.split(",").length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Date Range */}
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <Icon icon="mingcute:calendar-line" width={16} />
                <span>
                  {formatDate(project.start_date)} -{" "}
                  {formatDate(project.end_date || "")}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => openDetailModal(project)}
                  className="flex-1 px-4 py-2 bg-slate-50 text-slate-900 rounded-lg hover:bg-slate-100 transition-all text-sm font-medium"
                >
                  View Details
                </button>
                <button
                  onClick={() => openEditModal(project)}
                  className="px-3 py-2 bg-slate-50 text-slate-900 rounded-lg hover:bg-slate-100 transition-all"
                >
                  <Icon icon="mingcute:edit-line" width={18} />
                </button>
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                >
                  <Icon icon="mingcute:delete-line" width={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-slate-900">
                      {project.name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        project.status
                      )}`}
                    >
                      {project.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    {project.description || "No description"}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Icon icon="mingcute:calendar-line" width={16} />
                      <span>
                        {formatDate(project.start_date)} -{" "}
                        {formatDate(project.end_date || "")}
                      </span>
                    </div>
                    {project.industry && (
                      <div className="flex items-center gap-1">
                        <Icon icon="mingcute:building-2-line" width={16} />
                        <span>{project.industry}</span>
                      </div>
                    )}
                    {project.link && (
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-700 hover:text-blue-600"
                      >
                        <Icon icon="mingcute:external-link-line" width={16} />
                        <span>View Project</span>
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openDetailModal(project)}
                    className="px-4 py-2 bg-slate-50 text-slate-900 rounded-lg hover:bg-slate-100 transition-all text-sm font-medium"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => openEditModal(project)}
                    className="px-3 py-2 bg-slate-50 text-slate-900 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    <Icon icon="mingcute:edit-line" width={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                  >
                    <Icon icon="mingcute:delete-line" width={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {showAddModal ? "Add New Project" : "Edit Project"}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    // Clear error on change
                    if (formErrors.name) {
                      const newErrors = { ...formErrors };
                      delete newErrors.name;
                      setFormErrors(newErrors);
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.name ? "border-red-500" : "border-slate-200"
                  }`}
                  placeholder="My Awesome Project"
                />
                {formErrors.name && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <Icon icon="mingcute:alert-line" width={14} height={14} />
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* Status and Industry */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Planned">Planned</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={formData.industry || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, industry: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Healthcare, Finance, etc."
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  placeholder="Describe your project..."
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => {
                      setFormData({ ...formData, start_date: e.target.value });
                      // Clear error on change
                      if (formErrors.start_date) {
                        const newErrors = { ...formErrors };
                        delete newErrors.start_date;
                        setFormErrors(newErrors);
                      }
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.start_date ? "border-red-500" : "border-slate-200"
                    }`}
                  />
                  {formErrors.start_date && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <Icon icon="mingcute:alert-line" width={14} height={14} />
                      {formErrors.start_date}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Technologies */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Technologies
                </label>
                <input
                  type="text"
                  value={formData.technologies || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, technologies: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="React, Node.js, PostgreSQL (comma-separated)"
                />
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Project Link
                </label>
                <input
                  type="url"
                  value={formData.link || ""}
                  onChange={(e) => {
                    setFormData({ ...formData, link: e.target.value });
                    // Clear error on change
                    if (formErrors.link) {
                      const newErrors = { ...formErrors };
                      delete newErrors.link;
                      setFormErrors(newErrors);
                    }
                  }}
                  onBlur={(e) => {
                    // Validate on blur
                    const value = e.target.value.trim();
                    const newErrors = { ...formErrors };
                    
                    if (value && !isValidUrl(value)) {
                      newErrors.link = getUrlErrorMessage("project link");
                    } else {
                      // Clear error if field is empty or valid
                      delete newErrors.link;
                    }
                    
                    setFormErrors(newErrors);
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.link ? "border-red-500" : "border-slate-200"
                  }`}
                  placeholder="https://github.com/..."
                />
                {formErrors.link && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <Icon icon="mingcute:alert-line" width={14} height={14} />
                    {formErrors.link}
                  </p>
                )}
                {formData.link && !formErrors.link && isValidUrl(formData.link) && (
                  <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                    <Icon icon="mingcute:check-circle-line" width={14} height={14} />
                    Valid URL
                  </p>
                )}
              </div>

              {/* Collaborators */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Collaborators
                </label>
                <input
                  type="text"
                  value={formData.collaborators || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, collaborators: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe, Jane Smith (comma-separated)"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-900 rounded-xl font-medium hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={showAddModal ? handleAddProject : handleUpdateProject}
                className="flex-1 px-6 py-3 bg-blue-700 text-white rounded-xl font-medium hover:bg-blue-800 transition-all"
              >
                {showAddModal ? "Add Project" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  {selectedProject.name}
                </h2>
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(
                    selectedProject.status
                  )}`}
                >
                  {selectedProject.status}
                </span>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Description */}
              {selectedProject.description && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Description
                  </h3>
                  <p className="text-slate-600">
                    {selectedProject.description}
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">
                    Start Date
                  </h4>
                  <p className="text-slate-900">
                    {formatDate(selectedProject.start_date)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">
                    End Date
                  </h4>
                  <p className="text-slate-900">
                    {formatDate(selectedProject.end_date || "")}
                  </p>
                </div>
                {selectedProject.industry && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-1">
                      Industry
                    </h4>
                    <p className="text-slate-900">{selectedProject.industry}</p>
                  </div>
                )}
                {selectedProject.collaborators && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-1">
                      Collaborators
                    </h4>
                    <p className="text-slate-900">
                      {selectedProject.collaborators}
                    </p>
                  </div>
                )}
              </div>

              {/* Technologies */}
              {selectedProject.technologies && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">
                    Technologies Used
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.technologies
                      .split(",")
                      .map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                        >
                          {tech.trim()}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Project Link */}
              {selectedProject.link && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Project Link
                  </h3>
                  <a
                    href={selectedProject.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-600 font-medium"
                  >
                    <Icon icon="mingcute:external-link-line" width={20} />
                    {selectedProject.link}
                  </a>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  openEditModal(selectedProject);
                }}
                className="flex-1 px-6 py-3 bg-blue-700 text-white rounded-xl font-medium hover:bg-blue-800 transition-all"
              >
                Edit Project
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                }}
                className="px-6 py-3 bg-slate-100 text-slate-900 rounded-xl font-medium hover:bg-slate-200 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Import Modal */}
      <GitHubImportModal
        isOpen={showGitHubImportModal}
        onClose={() => setShowGitHubImportModal(false)}
        onImport={() => {
          fetchProjects();
          setShowGitHubImportModal(false);
        }}
        existingProjects={projects}
      />
    </div>
  );
}
