import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../config/routes";
import { Resume, JobOpportunityData, JobStatus } from "../types";
import { resumeService } from "../services/resumeService";
import { api } from "../services/api";
import { Toast } from "../components/resume/Toast";

export function Resumes() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "master" | "versions">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);
  const [jobOpportunities, setJobOpportunities] = useState<
    JobOpportunityData[]
  >([]);
  const [showJobPipeline, setShowJobPipeline] = useState(true);
  const [jobFilterStage, setJobFilterStage] = useState<string>("all");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Fetch resumes from API (or use mock data if API fails)
  useEffect(() => {
    const fetchResumes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await resumeService.getResumes();
        if (response.ok && response.data) {
          const allResumes = response.data.resumes;

          // Deduplicate resumes: Remove true duplicates (same name, jobId, and created within 5 seconds)
          // This handles cases where the same resume was created twice due to race conditions
          const seenResumes = new Map<string, Resume>();
          const resumeIds = new Set<string>(); // Track unique IDs

          allResumes.forEach((resume: Resume) => {
            // Skip if we've already seen this exact ID (shouldn't happen, but be safe)
            if (resumeIds.has(resume.id)) {
              return;
            }

            // Create a unique key based on name, jobId, and creation time (within 5 seconds)
            const resumeName = resume.name || resume.versionName || "";
            const jobId = resume.jobId || "no-job";
            const createdAt = new Date(resume.createdAt).getTime();

            // Round creation time to nearest 5 seconds to catch duplicates created close together
            const timeBucket = Math.floor(createdAt / 5000) * 5000;
            const key = `${resumeName}_${jobId}_${timeBucket}`;

            if (!seenResumes.has(key)) {
              // First time seeing this resume - add it
              seenResumes.set(key, resume);
              resumeIds.add(resume.id);
            } else {
              // Potential duplicate found - keep the one that is:
              // 1. Master (if one is master and the other isn't)
              // 2. Most recently updated (if both are same type)
              const existing = seenResumes.get(key)!;
              const existingIsMaster = existing.isMaster ?? false;
              const currentIsMaster = resume.isMaster ?? false;

              // If they're the same ID, skip (shouldn't happen)
              if (existing.id === resume.id) {
                return;
              }

              if (currentIsMaster && !existingIsMaster) {
                // Current is master, existing is not - replace
                resumeIds.delete(existing.id);
                seenResumes.set(key, resume);
                resumeIds.add(resume.id);
              } else if (!currentIsMaster && existingIsMaster) {
                // Existing is master, current is not - keep existing, skip current
                // Do nothing
              } else {
                // Both are same type - keep the most recently updated
                const existingDate = new Date(existing.updatedAt).getTime();
                const currentDate = new Date(resume.updatedAt).getTime();
                if (currentDate > existingDate) {
                  resumeIds.delete(existing.id);
                  seenResumes.set(key, resume);
                  resumeIds.add(resume.id);
                }
              }
            }
          });

          // Convert map back to array
          const deduplicatedResumes = Array.from(seenResumes.values());

          setResumes(deduplicatedResumes);
        }
      } catch (err: any) {
        // If API fails, use mock data for preview
        console.log(
          "API not available, using mock data for preview:",
          err.message
        );
        setResumes([
          {
            id: "1",
            userId: "user1",
            versionName: "Software Engineer Resume",
            description: "Tailored for tech positions",
            templateId: "default-chronological",
            content: null,
            sectionConfig: null,
            customizations: null,
            versionNumber: 1,
            parentResumeId: null,
            isMaster: true,
            file: null,
            commentsId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name: "Software Engineer Resume",
          },
          {
            id: "2",
            userId: "user1",
            versionName: "Product Manager Resume",
            description: "For PM roles",
            templateId: "default-functional",
            content: null,
            sectionConfig: null,
            customizations: null,
            versionNumber: 1,
            parentResumeId: null,
            isMaster: true,
            file: null,
            commentsId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name: "Product Manager Resume",
          },
          {
            id: "3",
            userId: "user1",
            versionName: "Data Scientist Resume",
            description: "ML and analytics focus",
            templateId: "default-hybrid",
            content: null,
            sectionConfig: null,
            customizations: null,
            versionNumber: 2,
            parentResumeId: "1",
            isMaster: false,
            file: null,
            commentsId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name: "Data Scientist Resume",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResumes();
    fetchJobOpportunities();
  }, []);

  const fetchJobOpportunities = async () => {
    try {
      console.log("Fetching job opportunities...");
      const response = await api.getJobOpportunities({
        sort: "-created_at",
      });
      console.log("Job opportunities response:", response);
      if (response.ok && response.data) {
        console.log(
          "Setting job opportunities:",
          response.data.jobOpportunities
        );
        // Filter out archived jobs on the frontend
        const nonArchivedJobs = (response.data.jobOpportunities || []).filter(
          (job: JobOpportunityData) => !job.archived
        );
        setJobOpportunities(nonArchivedJobs);
      } else {
        console.warn("Response not ok:", response);
      }
    } catch (err: any) {
      console.error("Failed to fetch job opportunities:", err);
      // Set empty array on error so UI doesn't break
      setJobOpportunities([]);
    }
  };

  const filteredResumes = resumes.filter((resume) => {
    if (filter === "master" && !resume.isMaster) return false;
    if (filter === "versions" && resume.isMaster) return false;
    const name = resume.name || resume.versionName || "";
    if (
      searchQuery &&
      !name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Clear selection when filter or search changes
  useEffect(() => {
    // Only keep selected resumes that are still in the filtered list
    setSelectedResumes((prev) => {
      const filteredIds = new Set(filteredResumes.map((r) => r.id));
      const newSelection = new Set<string>();
      prev.forEach((id) => {
        if (filteredIds.has(id)) {
          newSelection.add(id);
        }
      });
      return newSelection;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchQuery, resumes.length]);

  const handleCreateResume = () => {
    navigate(`${ROUTES.RESUME_TEMPLATES}?create=true`);
  };

  const handleCreateResumeForJob = (jobId: string) => {
    navigate(`${ROUTES.RESUME_TEMPLATES}?create=true&jobId=${jobId}`);
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      Interested: "bg-blue-100 text-blue-700 border-blue-200",
      Applied: "bg-purple-100 text-purple-700 border-purple-200",
      "Phone Screen": "bg-yellow-100 text-yellow-700 border-yellow-200",
      Interview: "bg-orange-100 text-orange-700 border-orange-200",
      Offer: "bg-green-100 text-green-700 border-green-200",
      Rejected: "bg-red-100 text-red-700 border-red-200",
    };
    return colors[stage] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const filteredJobs = jobOpportunities.filter((job) => {
    // Filter by status if stage filter is set (archived jobs are already filtered out in fetchJobOpportunities)
    if (jobFilterStage !== "all" && job.status !== jobFilterStage) return false;
    return true;
  });

  const handleEditResume = (id: string) => {
    navigate(`${ROUTES.RESUME_BUILDER}?id=${id}`);
  };

  const handlePreviewResume = (id: string) => {
    navigate(`${ROUTES.RESUME_PREVIEW}?id=${id}`);
  };

  const handleDuplicateResume = async (id: string) => {
    // Prevent duplicate clicks
    if (duplicatingId === id) {
      return;
    }

    try {
      setDuplicatingId(id);
      const response = await resumeService.duplicateResume(id);
      if (response.ok && response.data) {
        // Refresh resumes list immediately after duplication
        const resumesResponse = await resumeService.getResumes();
        if (resumesResponse.ok && resumesResponse.data) {
          const allResumes = resumesResponse.data.resumes;

          // Deduplicate resumes: Remove true duplicates (same name, jobId, and created within 5 seconds)
          const seenResumes = new Map<string, Resume>();
          const resumeIds = new Set<string>();

          allResumes.forEach((resume: Resume) => {
            if (resumeIds.has(resume.id)) {
              return;
            }

            const resumeName = resume.name || resume.versionName || "";
            const jobId = resume.jobId || "no-job";
            const createdAt = new Date(resume.createdAt).getTime();
            const timeBucket = Math.floor(createdAt / 5000) * 5000;
            const key = `${resumeName}_${jobId}_${timeBucket}`;

            if (!seenResumes.has(key)) {
              seenResumes.set(key, resume);
              resumeIds.add(resume.id);
            } else {
              const existing = seenResumes.get(key)!;
              const existingIsMaster = existing.isMaster ?? false;
              const currentIsMaster = resume.isMaster ?? false;

              if (existing.id === resume.id) {
                return;
              }

              if (currentIsMaster && !existingIsMaster) {
                resumeIds.delete(existing.id);
                seenResumes.set(key, resume);
                resumeIds.add(resume.id);
              } else if (!currentIsMaster && existingIsMaster) {
                // Keep existing
              } else {
                const existingDate = new Date(existing.updatedAt).getTime();
                const currentDate = new Date(resume.updatedAt).getTime();
                if (currentDate > existingDate) {
                  resumeIds.delete(existing.id);
                  seenResumes.set(key, resume);
                  resumeIds.add(resume.id);
                }
              }
            }
          });

          setResumes(Array.from(seenResumes.values()));
        }
        // Show success message
        const duplicatedResume = response.data.resume;
        setToast({
          message: `Resume duplicated successfully! Created: ${
            duplicatedResume.name || duplicatedResume.versionName
          }`,
          type: "success",
        });
      } else {
        setToast({
          message:
            response.error?.message ||
            "Failed to duplicate resume. Please try again.",
          type: "error",
        });
        // Still try to refresh the list in case the duplicate partially succeeded
        const resumesResponse = await resumeService.getResumes();
        if (resumesResponse.ok && resumesResponse.data) {
          const allResumes = resumesResponse.data.resumes;

          // Deduplicate resumes
          const seenResumes = new Map<string, Resume>();
          const resumeIds = new Set<string>();

          allResumes.forEach((resume: Resume) => {
            if (resumeIds.has(resume.id)) {
              return;
            }

            const resumeName = resume.name || resume.versionName || "";
            const jobId = resume.jobId || "no-job";
            const createdAt = new Date(resume.createdAt).getTime();
            const timeBucket = Math.floor(createdAt / 5000) * 5000;
            const key = `${resumeName}_${jobId}_${timeBucket}`;

            if (!seenResumes.has(key)) {
              seenResumes.set(key, resume);
              resumeIds.add(resume.id);
            } else {
              const existing = seenResumes.get(key)!;
              const existingIsMaster = existing.isMaster ?? false;
              const currentIsMaster = resume.isMaster ?? false;

              if (existing.id === resume.id) {
                return;
              }

              if (currentIsMaster && !existingIsMaster) {
                resumeIds.delete(existing.id);
                seenResumes.set(key, resume);
                resumeIds.add(resume.id);
              } else if (!currentIsMaster && existingIsMaster) {
                // Keep existing
              } else {
                const existingDate = new Date(existing.updatedAt).getTime();
                const currentDate = new Date(resume.updatedAt).getTime();
                if (currentDate > existingDate) {
                  resumeIds.delete(existing.id);
                  seenResumes.set(key, resume);
                  resumeIds.add(resume.id);
                }
              }
            }
          });

          setResumes(Array.from(seenResumes.values()));
        }
      }
    } catch (err: any) {
      console.error("Error duplicating resume:", err);
      setToast({
        message: err.message || "Failed to duplicate resume. Please try again.",
        type: "error",
      });
      // Try to refresh the list anyway in case the duplicate succeeded but response failed
      try {
        const resumesResponse = await resumeService.getResumes();
        if (resumesResponse.ok && resumesResponse.data) {
          const allResumes = resumesResponse.data.resumes;

          // Deduplicate resumes
          const seenResumes = new Map<string, Resume>();
          const resumeIds = new Set<string>();

          allResumes.forEach((resume: Resume) => {
            if (resumeIds.has(resume.id)) {
              return;
            }

            const resumeName = resume.name || resume.versionName || "";
            const jobId = resume.jobId || "no-job";
            const createdAt = new Date(resume.createdAt).getTime();
            const timeBucket = Math.floor(createdAt / 5000) * 5000;
            const key = `${resumeName}_${jobId}_${timeBucket}`;

            if (!seenResumes.has(key)) {
              seenResumes.set(key, resume);
              resumeIds.add(resume.id);
            } else {
              const existing = seenResumes.get(key)!;
              const existingIsMaster = existing.isMaster ?? false;
              const currentIsMaster = resume.isMaster ?? false;

              if (existing.id === resume.id) {
                return;
              }

              if (currentIsMaster && !existingIsMaster) {
                resumeIds.delete(existing.id);
                seenResumes.set(key, resume);
                resumeIds.add(resume.id);
              } else if (!currentIsMaster && existingIsMaster) {
                // Keep existing
              } else {
                const existingDate = new Date(existing.updatedAt).getTime();
                const currentDate = new Date(resume.updatedAt).getTime();
                if (currentDate > existingDate) {
                  resumeIds.delete(existing.id);
                  seenResumes.set(key, resume);
                  resumeIds.add(resume.id);
                }
              }
            }
          });

          setResumes(Array.from(seenResumes.values()));
        }
      } catch (refreshErr) {
        console.error("Failed to refresh resumes after duplicate:", refreshErr);
      }
    } finally {
      setDuplicatingId(null);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedResumes, setSelectedResumes] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const handleDeleteResume = (id: string) => {
    console.log("🗑️ handleDeleteResume called with id:", id);
    setShowDeleteConfirm(id);
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedResumes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedResumes.size === filteredResumes.length) {
      // Deselect all
      setSelectedResumes(new Set());
    } else {
      // Select all filtered resumes
      setSelectedResumes(new Set(filteredResumes.map((r) => r.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedResumes.size > 0) {
      setShowBulkDeleteConfirm(true);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedResumes.size === 0) {
      setShowBulkDeleteConfirm(false);
      return;
    }

    const idsToDelete = Array.from(selectedResumes);
    setShowBulkDeleteConfirm(false);
    
    // Optimistically remove from UI
    setResumes((prevResumes) => 
      prevResumes.filter((r) => !selectedResumes.has(r.id))
    );
    
    // Clear selection
    setSelectedResumes(new Set());

    // Delete all selected resumes in parallel
    const deletePromises = idsToDelete.map(async (id) => {
      try {
        const response = await resumeService.deleteResume(id);
        return { id, ok: response.ok, error: null };
      } catch (err: any) {
        console.error(`Failed to delete resume ${id}:`, err);
        return { id, ok: false, error: err };
      }
    });

    try {
      const results = await Promise.all(deletePromises);
      const successCount = results.filter((r) => r.ok).length;
      const failCount = results.length - successCount;

      if (failCount === 0) {
        setToast({
          message: `Successfully deleted ${successCount} resume${successCount !== 1 ? 's' : ''}`,
          type: "success",
        });
      } else {
        setToast({
          message: `Deleted ${successCount} resume${successCount !== 1 ? 's' : ''}, ${failCount} failed`,
          type: "error",
        });
      }

      // Refresh from server
      try {
        const resumesResponse = await resumeService.getResumes();
        if (resumesResponse.ok && resumesResponse.data) {
          const allResumes = resumesResponse.data.resumes;
          // Deduplicate resumes
          const seenResumes = new Map<string, Resume>();
          const resumeIds = new Set<string>();

          allResumes.forEach((resume: Resume) => {
            if (resumeIds.has(resume.id)) {
              return;
            }

            const resumeName = resume.name || resume.versionName || "";
            const jobId = resume.jobId || "no-job";
            const createdAt = new Date(resume.createdAt).getTime();
            const timeBucket = Math.floor(createdAt / 5000) * 5000;
            const key = `${resumeName}_${jobId}_${timeBucket}`;

            if (!seenResumes.has(key)) {
              seenResumes.set(key, resume);
              resumeIds.add(resume.id);
            } else {
              const existing = seenResumes.get(key)!;
              const existingIsMaster = existing.isMaster ?? false;
              const currentIsMaster = resume.isMaster ?? false;

              if (existing.id === resume.id) {
                return;
              }

              if (currentIsMaster && !existingIsMaster) {
                resumeIds.delete(existing.id);
                seenResumes.set(key, resume);
                resumeIds.add(resume.id);
              } else if (!currentIsMaster && existingIsMaster) {
                // Keep existing
              } else {
                const existingDate = new Date(existing.updatedAt).getTime();
                const currentDate = new Date(resume.updatedAt).getTime();
                if (currentDate > existingDate) {
                  resumeIds.delete(existing.id);
                  seenResumes.set(key, resume);
                  resumeIds.add(resume.id);
                }
              }
            }
          });

          setResumes(Array.from(seenResumes.values()));
        }
      } catch (refreshErr) {
        console.error("Failed to refresh resumes list:", refreshErr);
      }
    } catch (err) {
      console.error("Error during bulk delete:", err);
      setToast({
        message: "Failed to delete some resumes. Please try again.",
        type: "error",
      });
    }
  };

  const confirmDeleteResume = async () => {
    // Use a ref to capture the current value to avoid stale closures
    const currentDeleteConfirm = showDeleteConfirm;
    console.log(
      "🔴 confirmDeleteResume called, showDeleteConfirm:",
      currentDeleteConfirm
    );

    if (!currentDeleteConfirm) {
      console.warn(
        "❌ confirmDeleteResume called but showDeleteConfirm is null"
      );
      return;
    }

    // Capture the ID before clearing the state to avoid race conditions
    const idToDelete = currentDeleteConfirm;
    console.log("✅ Confirming deletion of resume:", idToDelete);

    // Set deleting state and close modal IMMEDIATELY
    setDeletingId(idToDelete);
    setShowDeleteConfirm(null);

    // IMMEDIATELY remove from local state to update UI (optimistic update)
    // Use functional update to ensure we have the latest state
    setResumes((prevResumes) => {
      const filtered = prevResumes.filter((r) => r.id !== idToDelete);
      console.log(
        "📝 Removed resume from state. Previous count:",
        prevResumes.length,
        "New count:",
        filtered.length
      );
      console.log(
        "📝 Remaining resume IDs:",
        filtered.map((r) => r.id)
      );
      return filtered;
    });

    try {
      console.log("🚀 Attempting to delete resume via API:", idToDelete);
      // The request method throws an ApiError if the response is not ok
      const deleteResponse = await resumeService.deleteResume(idToDelete);

      console.log("✅ Delete API response:", deleteResponse);

      // Show success message
      setToast({
        message: "Resume deleted successfully",
        type: "success",
      });
      setDeletingId(null);

      // Refresh from server in the background to ensure consistency
      try {
        const resumesResponse = await resumeService.getResumes();
        if (resumesResponse.ok && resumesResponse.data) {
          const allResumes = resumesResponse.data.resumes;

          // Deduplicate resumes: Remove true duplicates (same name, jobId, and created within 5 seconds)
          const seenResumes = new Map<string, Resume>();
          const resumeIds = new Set<string>();

          allResumes.forEach((resume: Resume) => {
            if (resumeIds.has(resume.id)) {
              return;
            }

            const resumeName = resume.name || resume.versionName || "";
            const jobId = resume.jobId || "no-job";
            const createdAt = new Date(resume.createdAt).getTime();
            const timeBucket = Math.floor(createdAt / 5000) * 5000;
            const key = `${resumeName}_${jobId}_${timeBucket}`;

            if (!seenResumes.has(key)) {
              seenResumes.set(key, resume);
              resumeIds.add(resume.id);
            } else {
              const existing = seenResumes.get(key)!;
              const existingIsMaster = existing.isMaster ?? false;
              const currentIsMaster = resume.isMaster ?? false;

              if (existing.id === resume.id) {
                return;
              }

              if (currentIsMaster && !existingIsMaster) {
                resumeIds.delete(existing.id);
                seenResumes.set(key, resume);
                resumeIds.add(resume.id);
              } else if (!currentIsMaster && existingIsMaster) {
                // Keep existing
              } else {
                const existingDate = new Date(existing.updatedAt).getTime();
                const currentDate = new Date(resume.updatedAt).getTime();
                if (currentDate > existingDate) {
                  resumeIds.delete(existing.id);
                  seenResumes.set(key, resume);
                  resumeIds.add(resume.id);
                }
              }
            }
          });

          // Update with deduplicated list
          setResumes(Array.from(seenResumes.values()));
        }
      } catch (refreshErr) {
        // If refresh fails, that's okay - we already updated the UI
        console.warn(
          "Failed to refresh resumes list after deletion:",
          refreshErr
        );
      }
    } catch (err: any) {
      console.error("❌ Failed to delete resume:", err);
      console.error("❌ Error details:", {
        message: err.message,
        status: err.status,
        code: err.code,
        detail: err.detail,
        name: err.name,
        stack: err.stack,
        fullError: err,
      });

      // Revert the optimistic update on error by refreshing from server
      setDeletingId(null);
      // Re-open the confirmation modal if deletion failed
      setShowDeleteConfirm(idToDelete);

      // Refresh the list from server to restore the deleted resume
      try {
        const resumesResponse = await resumeService.getResumes();
        if (resumesResponse.ok && resumesResponse.data) {
          const allResumes = resumesResponse.data.resumes;

          // Deduplicate resumes
          const seenResumes = new Map<string, Resume>();
          const resumeIds = new Set<string>();

          allResumes.forEach((resume: Resume) => {
            if (resumeIds.has(resume.id)) {
              return;
            }

            const resumeName = resume.name || resume.versionName || "";
            const jobId = resume.jobId || "no-job";
            const createdAt = new Date(resume.createdAt).getTime();
            const timeBucket = Math.floor(createdAt / 5000) * 5000;
            const key = `${resumeName}_${jobId}_${timeBucket}`;

            if (!seenResumes.has(key)) {
              seenResumes.set(key, resume);
              resumeIds.add(resume.id);
            } else {
              const existing = seenResumes.get(key)!;
              const existingIsMaster = existing.isMaster ?? false;
              const currentIsMaster = resume.isMaster ?? false;

              if (existing.id === resume.id) {
                return;
              }

              if (currentIsMaster && !existingIsMaster) {
                resumeIds.delete(existing.id);
                seenResumes.set(key, resume);
                resumeIds.add(resume.id);
              } else if (!currentIsMaster && existingIsMaster) {
                // Keep existing
              } else {
                const existingDate = new Date(existing.updatedAt).getTime();
                const currentDate = new Date(resume.updatedAt).getTime();
                if (currentDate > existingDate) {
                  resumeIds.delete(existing.id);
                  seenResumes.set(key, resume);
                  resumeIds.add(resume.id);
                }
              }
            }
          });

          setResumes(Array.from(seenResumes.values()));
        }
      } catch (refreshErr) {
        console.error(
          "Failed to refresh resumes list after deletion error:",
          refreshErr
        );
      }

      // Extract error message from ApiError or regular error
      let errorMessage = "Failed to delete resume. Please try again.";

      // ApiError has a message property
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      // Check if it's an ApiError with status code
      else if (err.status && err.message) {
        errorMessage = err.message;
      }
      // Check for nested error structure
      else if (err.error?.message) {
        errorMessage = err.error.message;
      }
      // Check for direct message property
      else if (err.message) {
        errorMessage = err.message;
      }

      // Add more context if available
      if (err.detail) {
        errorMessage += `: ${err.detail}`;
      }

      setToast({
        message: errorMessage,
        type: "error",
      });
    }
  };

  const handleExport = async (
    resumeId: string,
    format: "pdf" | "docx" | "txt" | "html"
  ) => {
    try {
      setExportingId(resumeId);
      setShowExportMenu(null);

      let blob: Blob;
      const resume = resumes.find((r) => r.id === resumeId);
      const filename =
        resume?.name || resume?.versionName || `resume_${resumeId}`;

      switch (format) {
        case "pdf":
          const pdfResult = await resumeService.exportPDF(resumeId, {
            filename: `${filename}.pdf`,
          });
          resumeService.downloadBlob(pdfResult.blob, pdfResult.filename);
          break;
        case "docx":
          const docxResult = await resumeService.exportDOCX(resumeId, {
            filename: `${filename}.docx`,
          });
          resumeService.downloadBlob(docxResult.blob, docxResult.filename);
          break;
        case "txt":
          const txtResult = await resumeService.exportTXT(resumeId, {
            filename: `${filename}.txt`,
          });
          resumeService.downloadBlob(txtResult.blob, txtResult.filename);
          break;
        case "html":
          const htmlResult = await resumeService.exportHTML(resumeId, {
            filename: `${filename}.html`,
          });
          resumeService.downloadBlob(htmlResult.blob, htmlResult.filename);
          break;
      }
    } catch (err: any) {
      // Mock mode - show toast
      setToast({
        message: `Export to ${format.toUpperCase()} will work once database is set up. For now, this is just a preview.`,
        type: "info",
      });
      console.log("Would export resume:", resumeId, "as", format);
    } finally {
      setExportingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-poppins">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-[#3351FD]"
          />
          <p className="mt-4 text-gray-600">Loading resumes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-poppins">
        <div className="text-center">
          <Icon
            icon="mingcute:alert-circle-line"
            className="w-12 h-12 mx-auto text-red-500 mb-4"
          />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FB] py-10 font-poppins">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBulkDeleteConfirm(false);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl border border-[#E2E8F8] max-w-md w-full p-6 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Delete {selectedResumes.size} Resume{selectedResumes.size !== 1 ? 's' : ''}
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {selectedResumes.size} selected resume{selectedResumes.size !== 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete {selectedResumes.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => {
            // Close modal if clicking on backdrop
            if (e.target === e.currentTarget) {
              setShowDeleteConfirm(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl border border-[#E2E8F8] max-w-md w-full p-6 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Delete Resume
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this resume? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("🖱️ Delete button clicked in modal");
                  console.log("   showDeleteConfirm:", showDeleteConfirm);
                  console.log("   deletingId:", deletingId);

                  // Don't check showDeleteConfirm here - let the function handle it
                  // Just check if we're already deleting
                  if (!deletingId) {
                    console.log("   ✅ Calling confirmDeleteResume...");
                    confirmDeleteResume();
                  } else {
                    console.log("   ⏸️ Already deleting, ignoring click");
                  }
                }}
                disabled={!!deletingId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {deletingId ? (
                  <span className="flex items-center gap-2">
                    <Icon
                      icon="mingcute:loading-line"
                      className="w-4 h-4 animate-spin"
                    />
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[42px] leading-[1.1] font-semibold text-[#0F172A]">
                My Resumes
              </h1>
              <p className="text-base text-[#6F7A97] mt-1.5">
                Manage and create tailored resumes for different positions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowJobPipeline(!showJobPipeline)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all text-sm font-medium ${
                  showJobPipeline
                    ? "bg-[#5B72FF] text-white"
                    : "bg-white text-[#0F1D3A] border border-[#D6DDF1] hover:bg-[#EEF1FF]"
                }`}
              >
                <Icon icon="mingcute:briefcase-line" className="w-5 h-5" />
                Job Pipeline
                {jobOpportunities.length > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      showJobPipeline ? "bg-white/25" : "bg-[#EEF1FF] text-[#5B72FF]"
                    }`}
                  >
                    {jobOpportunities.length}
                  </span>
                )}
              </button>
              <button
                onClick={handleCreateResume}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-white transition-all text-sm font-semibold bg-gradient-to-r from-[#845BFF] to-[#F551A2] hover:opacity-90"
              >
                <Icon icon="mingcute:sparkles-line" className="w-5 h-5" />
                Create New Resume
              </button>
            </div>
          </div>

          {/* Selection Bar - Shows when resumes are selected */}
          {selectedResumes.size > 0 && (
            <div className="mb-5 rounded-2xl border border-[#DCE1F8] bg-[#EEF1FF] px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedResumes.size === filteredResumes.length && filteredResumes.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-[#5B72FF] border-[#BFC9F3] rounded focus:ring-[#5B72FF] focus:ring-2"
                    />
                    <span className="text-sm font-medium text-[#1B2559]">
                      {selectedResumes.size === filteredResumes.length 
                        ? "All selected" 
                        : `${selectedResumes.size} of ${filteredResumes.length} selected`}
                    </span>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedResumes(new Set())}
                    className="px-4 py-2 text-sm text-[#1B2559] bg-white border border-[#DDE2F2] rounded-full hover:bg-[#F8FAFF] transition-colors font-medium"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-[#EF4444] text-white rounded-full hover:bg-[#dc2626] transition-colors font-semibold text-sm"
                  >
                    <Icon icon="mingcute:delete-line" className="w-4 h-4" />
                    Delete Selected ({selectedResumes.size})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 mt-6">
            <div className="flex-1">
              <label className="relative block">
                <Icon
                  icon="mingcute:search-line"
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9AA4C2] w-[18px] h-[18px]"
                />
                <input
                  type="text"
                  placeholder="Search resumes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 rounded-full border border-[#DDE2F2] bg-white text-sm text-[#1B2559] placeholder-[#9AA4C2] focus:outline-none focus:ring-2 focus:ring-[#5B72FF] focus:border-transparent transition-all"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === "all"
                    ? "bg-black text-white"
                    : "bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("master")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === "master"
                    ? "bg-black text-white"
                    : "bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]"
                }`}
              >
                Master
              </button>
              <button
                onClick={() => setFilter("versions")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === "versions"
                    ? "bg-black text-white"
                    : "bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]"
                }`}
              >
                Versions
              </button>
            </div>
          </div>
        </div>

        {/* Job Pipeline Section */}
        {showJobPipeline && (
          <div className="mb-8 rounded-[24px] border border-[#E2E8F8] bg-white">
            <div className="px-8 py-5 border-b border-[#EDF1FD]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F4FF]">
                    <Icon icon="mingcute:briefcase-line" className="w-6 h-6 text-[#5B72FF]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-[#0F172A]">
                      Job Pipeline
                    </h2>
                    <p className="text-sm text-[#6F7A97] mt-1">
                      Select a job to create a tailored resume version
                    </p>
                  </div>
                </div>
                <select
                  value={jobFilterStage}
                  onChange={(e) => setJobFilterStage(e.target.value)}
                  className="h-11 rounded-full border border-[#DDE2F2] bg-white px-5 text-sm text-[#1B2559] focus:outline-none focus:ring-2 focus:ring-[#5B72FF] focus:border-transparent transition-all"
                >
                  <option value="all">All Stages</option>
                  <option value="Interested">Interested</option>
                  <option value="Applied">Applied</option>
                  <option value="Phone Screen">Phone Screen</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="px-8 py-8">
              {filteredJobs.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F7FF]">
                    <Icon
                      icon="mingcute:briefcase-line"
                      className="w-8 h-8 text-[#B4BDE2]"
                    />
                  </div>
                  <div className="max-w-sm">
                    <p className="text-sm font-semibold text-[#1B2559]">
                      No jobs in your pipeline
                    </p>
                    <p className="mt-1 text-sm text-[#8A94AD]">
                      Add jobs to start creating tailored resume versions for different opportunities.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-2xl border border-[#E2E8F8] bg-white p-5 transition-all cursor-pointer group hover:border-[#5B72FF]"
                      onClick={() => handleCreateResumeForJob(job.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#0F172A] truncate group-hover:text-[#5B72FF] transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-sm text-[#6F7A97] truncate">
                            {job.company}
                          </p>
                          {job.location && (
                            <p className="mt-2 flex items-center gap-1 text-xs text-[#8A94AD]">
                              <Icon
                                icon="mingcute:map-pin-line"
                                className="w-3 h-3"
                              />
                              {job.location}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold border flex-shrink-0 ${getStageColor(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                      </div>
                      {job.description && (
                        <p className="mt-2.5 text-xs text-[#6F7A97] line-clamp-2">
                          {job.description}
                        </p>
                      )}
                      <div className="mt-3.5 flex items-center justify-between border-t border-[#EEF1FD] pt-2.5">
                        <span className="text-xs text-[#8A94AD]">
                          {job.createdAt
                            ? new Date(job.createdAt).toLocaleDateString()
                            : "N/A"}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-[#5B72FF] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Create Resume</span>
                          <Icon
                            icon="mingcute:arrow-right-line"
                            className="w-3 h-3"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumes Grid */}
        {filteredResumes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[28px] border border-dashed border-[#DCE1F1]">
            <Icon
              icon="mingcute:file-line"
              className="w-16 h-16 mx-auto text-[#C2CAE6] mb-4"
            />
            <h3 className="text-xl font-semibold text-[#0F172A] mb-2">
              No resumes found
            </h3>
            <p className="text-[#6F7A97] mb-6">
              {searchQuery
                ? "Try adjusting your search"
                : "Get started by creating your first resume"}
            </p>
            <button
              onClick={handleCreateResume}
              className="inline-flex items-center gap-2 bg-[#3351FD] text-white px-6 py-3 rounded-full hover:bg-[#2744d8] transition-all text-sm font-semibold"
            >
              <Icon icon="mingcute:add-line" className="w-5 h-5" />
              Create New Resume
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResumes.map((resume) => (
              <div
                key={resume.id}
                className={`bg-white rounded-[26px] border transition-all overflow-hidden flex flex-col ${
                  selectedResumes.has(resume.id)
                    ? "border-[#5B72FF] ring-2 ring-[#5B72FF]/40"
                    : "border-[#E2E8F8] hover:border-[#5B72FF]"
                }`}
              >
                {/* Resume Preview Card */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedResumes.has(resume.id)}
                      onChange={() => handleToggleSelect(resume.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 w-4 h-4 text-[#5B72FF] border-[#DDE2F2] rounded focus:ring-[#5B72FF] focus:ring-2 cursor-pointer flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-[#0F172A]">
                          {resume.name || resume.versionName}
                        </h3>
                        {resume.isMaster && (
                          <span className="px-2.5 py-1 text-[11px] font-semibold bg-[#EEF1FF] text-[#5B72FF] rounded-full flex-shrink-0">
                            Master
                          </span>
                        )}
                      </div>
                      {resume.description ? (
                        <p className="text-sm text-[#6F7A97] mb-3 line-clamp-2">
                          {resume.description}
                        </p>
                      ) : (
                        <div className="h-5 mb-3"></div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-[#8A94AD]">
                        <span className="flex items-center gap-1">
                          <Icon icon="mingcute:time-line" className="w-4 h-4" />
                          {new Date(resume.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon icon="mingcute:file-line" className="w-4 h-4" />
                          v{resume.versionNumber || 1}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-[#EDF1FD] px-5 py-4 bg-[#F8FAFF]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditResume(resume.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-[#5B72FF] text-white rounded-full hover:bg-[#4a62ef] transition-colors text-sm font-semibold"
                      type="button"
                    >
                      <Icon icon="mingcute:edit-line" className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewResume(resume.id);
                      }}
                      className="px-3 py-2.5 border border-[#DDE2F2] rounded-full hover:bg-white transition-colors"
                      title="Preview"
                      type="button"
                    >
                      <Icon
                        icon="mingcute:eye-line"
                        className="w-4 h-4 text-[#1B2559]"
                      />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setShowExportMenu(
                            showExportMenu === resume.id ? null : resume.id
                          )
                        }
                        className="px-3 py-2.5 border border-[#DDE2F2] rounded-full hover:bg-white transition-colors"
                        title="Export"
                        disabled={exportingId === resume.id}
                      >
                        {exportingId === resume.id ? (
                          <Icon
                            icon="mingcute:loading-line"
                            className="w-4 h-4 text-[#1B2559] animate-spin"
                          />
                        ) : (
                          <Icon
                            icon="mingcute:download-line"
                            className="w-4 h-4 text-[#1B2559]"
                          />
                        )}
                      </button>
                      {showExportMenu === resume.id && (
                        <div className="absolute right-0 bottom-full mb-2 bg-white border border-[#E2E8F8] rounded-xl z-10 min-w-[150px]">
                          <button
                            onClick={() => handleExport(resume.id, "pdf")}
                            className="w-full text-left px-4 py-2 hover:bg-[#F8FAFF] flex items-center gap-2 text-sm text-[#1B2559]"
                          >
                            <Icon
                              icon="mingcute:file-pdf-line"
                              className="w-4 h-4 text-red-500"
                            />
                            Export PDF
                          </button>
                          <button
                            onClick={() => handleExport(resume.id, "docx")}
                            className="w-full text-left px-4 py-2 hover:bg-[#F8FAFF] flex items-center gap-2 text-sm text-[#1B2559]"
                          >
                            <Icon
                              icon="mingcute:file-word-line"
                              className="w-4 h-4 text-[#3351FD]"
                            />
                            Export DOCX
                          </button>
                          <button
                            onClick={() => handleExport(resume.id, "html")}
                            className="w-full text-left px-4 py-2 hover:bg-[#F8FAFF] flex items-center gap-2 text-sm text-[#1B2559]"
                          >
                            <Icon
                              icon="mingcute:file-html-line"
                              className="w-4 h-4 text-orange-500"
                            />
                            Export HTML
                          </button>
                          <button
                            onClick={() => handleExport(resume.id, "txt")}
                            className="w-full text-left px-4 py-2 hover:bg-[#F8FAFF] flex items-center gap-2 text-sm text-[#1B2559]"
                          >
                            <Icon
                              icon="mingcute:file-text-line"
                              className="w-4 h-4 text-[#6F7A97]"
                            />
                            Export TXT
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateResume(resume.id);
                      }}
                      disabled={duplicatingId === resume.id}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Duplicate"
                      type="button"
                    >
                      {duplicatingId === resume.id ? (
                        <Icon
                          icon="mingcute:loading-line"
                          className="w-4 h-4 text-gray-700 animate-spin"
                        />
                      ) : (
                        <Icon
                          icon="mingcute:add-line"
                          className="w-4 h-4 text-gray-700"
                        />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteResume(resume.id);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                      type="button"
                    >
                      <Icon
                        icon="mingcute:delete-line"
                        className="w-4 h-4 text-red-600"
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowExportMenu(null)}
        />
      )}
    </div>
  );
}
