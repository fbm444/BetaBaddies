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
  const [filter, setFilter] = useState<'all' | 'master' | 'versions'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);
  const [jobOpportunities, setJobOpportunities] = useState<JobOpportunityData[]>([]);
  const [showJobPipeline, setShowJobPipeline] = useState(true);
  const [jobFilterStage, setJobFilterStage] = useState<string>("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

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
            const resumeName = resume.name || resume.versionName || '';
            const jobId = resume.jobId || 'no-job';
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
        console.log("API not available, using mock data for preview:", err.message);
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
        sort: "-created_at"
      });
      console.log("Job opportunities response:", response);
      if (response.ok && response.data) {
        console.log("Setting job opportunities:", response.data.jobOpportunities);
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
    if (filter === 'master' && !resume.isMaster) return false;
    if (filter === 'versions' && resume.isMaster) return false;
    const name = resume.name || resume.versionName || '';
    if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

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
            
            const resumeName = resume.name || resume.versionName || '';
            const jobId = resume.jobId || 'no-job';
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
          message: `Resume duplicated successfully! Created: ${duplicatedResume.name || duplicatedResume.versionName}`,
          type: "success",
        });
      } else {
        setToast({
          message: response.error?.message || "Failed to duplicate resume. Please try again.",
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
            
            const resumeName = resume.name || resume.versionName || '';
            const jobId = resume.jobId || 'no-job';
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
            
            const resumeName = resume.name || resume.versionName || '';
            const jobId = resume.jobId || 'no-job';
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteResume = (id: string) => {
    console.log("🗑️ handleDeleteResume called with id:", id);
    setShowDeleteConfirm(id);
  };

  const confirmDeleteResume = async () => {
    // Use a ref to capture the current value to avoid stale closures
    const currentDeleteConfirm = showDeleteConfirm;
    console.log("🔴 confirmDeleteResume called, showDeleteConfirm:", currentDeleteConfirm);
    
    if (!currentDeleteConfirm) {
      console.warn("❌ confirmDeleteResume called but showDeleteConfirm is null");
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
      console.log("📝 Removed resume from state. Previous count:", prevResumes.length, "New count:", filtered.length);
      console.log("📝 Remaining resume IDs:", filtered.map(r => r.id));
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
            
            const resumeName = resume.name || resume.versionName || '';
            const jobId = resume.jobId || 'no-job';
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
        console.warn("Failed to refresh resumes list after deletion:", refreshErr);
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
            
            const resumeName = resume.name || resume.versionName || '';
            const jobId = resume.jobId || 'no-job';
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
        console.error("Failed to refresh resumes list after deletion error:", refreshErr);
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

  const handleExport = async (resumeId: string, format: 'pdf' | 'docx' | 'txt' | 'html') => {
    try {
      setExportingId(resumeId);
      setShowExportMenu(null);
      
      let blob: Blob;
      const resume = resumes.find(r => r.id === resumeId);
      const filename = resume?.name || resume?.versionName || `resume_${resumeId}`;

      switch (format) {
        case 'pdf':
          const pdfResult = await resumeService.exportPDF(resumeId, { filename: `${filename}.pdf` });
          resumeService.downloadBlob(pdfResult.blob, pdfResult.filename);
          break;
        case 'docx':
          const docxResult = await resumeService.exportDOCX(resumeId, { filename: `${filename}.docx` });
          resumeService.downloadBlob(docxResult.blob, docxResult.filename);
          break;
        case 'txt':
          const txtResult = await resumeService.exportTXT(resumeId, { filename: `${filename}.txt` });
          resumeService.downloadBlob(txtResult.blob, txtResult.filename);
          break;
        case 'html':
          const htmlResult = await resumeService.exportHTML(resumeId, { filename: `${filename}.html` });
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mingcute:loading-line" className="w-12 h-12 animate-spin mx-auto text-[#3351FD]" />
          <p className="mt-4 text-gray-600">Loading resumes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mingcute:alert-circle-line" className="w-12 h-12 mx-auto text-red-500 mb-4" />
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
    <div className="min-h-screen bg-gray-50 py-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
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
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Resume</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this resume? This action cannot be undone.
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
                    <Icon icon="mingcute:loading-line" className="w-4 h-4 animate-spin" />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Resumes</h1>
              <p className="text-gray-600 mt-1">Manage and create tailored resumes for different positions</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowJobPipeline(!showJobPipeline)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                  showJobPipeline
                    ? "bg-[#3351FD] text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Icon icon="mingcute:briefcase-line" className="w-5 h-5" />
                Job Pipeline
                {jobOpportunities.length > 0 && (
                  <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">
                    {jobOpportunities.length}
                  </span>
                )}
              </button>
              <button
                onClick={handleCreateResume}
                className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                <Icon icon="mingcute:add-line" className="w-5 h-5" />
                Create New Resume
              </button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <div className="flex-1">
              <div className="relative">
                <Icon
                  icon="mingcute:search-line"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                />
                <input
                  type="text"
                  placeholder="Search resumes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-[#3351FD] text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('master')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'master'
                    ? 'bg-[#3351FD] text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Master
              </button>
              <button
                onClick={() => setFilter('versions')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'versions'
                    ? 'bg-[#3351FD] text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Versions
              </button>
            </div>
          </div>
        </div>

        {/* Job Pipeline Section */}
        {showJobPipeline && (
          <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Icon icon="mingcute:briefcase-line" className="w-6 h-6 text-[#3351FD]" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Job Pipeline</h2>
                    <p className="text-sm text-gray-600">Select a job to create a tailored resume version</p>
                  </div>
                </div>
                <select
                  value={jobFilterStage}
                  onChange={(e) => setJobFilterStage(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent text-sm"
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
            <div className="p-6">
              {filteredJobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Icon icon="mingcute:briefcase-line" className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    {jobOpportunities.length === 0
                      ? "No jobs in your pipeline. Add jobs to create tailored resume versions."
                      : "No jobs match the selected stage filter."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-[#3351FD] hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => handleCreateResumeForJob(job.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-[#3351FD] transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-sm text-gray-700 truncate">{job.company}</p>
                          {job.location && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Icon icon="mingcute:map-pin-line" className="w-3 h-3" />
                              {job.location}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ${getStageColor(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                      </div>
                      {job.description && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                          {job.description}
                        </p>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-[#3351FD] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Create Resume</span>
                          <Icon icon="mingcute:arrow-right-line" className="w-3 h-3" />
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
          <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Icon icon="mingcute:file-line" className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No resumes found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? "Try adjusting your search" : "Get started by creating your first resume"}
            </p>
            <button
              onClick={handleCreateResume}
              className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              <Icon icon="mingcute:add-line" className="w-5 h-5" />
              Create New Resume
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResumes.map((resume) => (
              <div
                key={resume.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Resume Preview Card */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{resume.name || resume.versionName}</h3>
                      {resume.isMaster && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Master
                        </span>
                      )}
                    </div>
                    {resume.description && (
                      <p className="text-sm text-gray-600 mb-2">{resume.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
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
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditResume(resume.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors text-sm font-medium"
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
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Preview"
                      type="button"
                    >
                      <Icon icon="mingcute:eye-line" className="w-4 h-4 text-gray-700" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowExportMenu(showExportMenu === resume.id ? null : resume.id)}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Export"
                        disabled={exportingId === resume.id}
                      >
                        {exportingId === resume.id ? (
                          <Icon icon="mingcute:loading-line" className="w-4 h-4 text-gray-700 animate-spin" />
                        ) : (
                          <Icon icon="mingcute:download-line" className="w-4 h-4 text-gray-700" />
                        )}
                      </button>
                      {showExportMenu === resume.id && (
                        <div className="absolute right-0 bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                          <button
                            onClick={() => handleExport(resume.id, 'pdf')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Icon icon="mingcute:file-pdf-line" className="w-4 h-4 text-red-600" />
                            Export PDF
                          </button>
                          <button
                            onClick={() => handleExport(resume.id, 'docx')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Icon icon="mingcute:file-word-line" className="w-4 h-4 text-blue-600" />
                            Export DOCX
                          </button>
                          <button
                            onClick={() => handleExport(resume.id, 'html')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Icon icon="mingcute:file-html-line" className="w-4 h-4 text-orange-600" />
                            Export HTML
                          </button>
                          <button
                            onClick={() => handleExport(resume.id, 'txt')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Icon icon="mingcute:file-text-line" className="w-4 h-4 text-gray-600" />
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
                        <Icon icon="mingcute:loading-line" className="w-4 h-4 text-gray-700 animate-spin" />
                      ) : (
                        <Icon icon="mingcute:add-line" className="w-4 h-4 text-gray-700" />
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
                      <Icon icon="mingcute:delete-line" className="w-4 h-4 text-red-600" />
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

