import { useState, useEffect, Fragment, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../config/routes";
import {
  Resume,
  SkillData,
  CertificationData,
  JobData,
  EducationData,
  ProjectData,
  ProfileData,
} from "../types";
import { resumeService } from "../services/resumeService";
import { api } from "../services/api";
import { JobOpportunityData } from "../types";
import { AIAssistantChat } from "../components/resume/AIAssistantChat";
import { Toast } from "../components/resume/Toast";
import { ResumeTopBar } from "../components/resume/ResumeTopBar";
import { VersionControl } from "../components/resume/VersionControl";
import { ResumeParseLoader } from "../components/resume/ResumeParseLoader";
import {
  ResumeExportModal,
  ExportFormat,
  ExportTheme,
} from "../components/resume/ResumeExportModal";
import { ResumeValidationScanner } from "../components/resume/ResumeValidationScanner";
import {
  ResumeValidationResults,
  ValidationResults,
  SectionGrade,
} from "../components/resume/ResumeValidationResults";

export function ResumeBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Memoize search params to prevent unnecessary re-renders when searchParams object changes
  const resumeId = useMemo(() => searchParams.get("id"), [searchParams]);
  const templateId = useMemo(
    () => searchParams.get("templateId"),
    [searchParams]
  );
  const importFromId = useMemo(
    () => searchParams.get("importFromId"),
    [searchParams]
  );
  const uploaded = useMemo(() => searchParams.get("uploaded"), [searchParams]);
  const jobId = useMemo(() => searchParams.get("jobId"), [searchParams]);
  const aiExplanation = useMemo(
    () => searchParams.get("aiExplanation"),
    [searchParams]
  );

  // Helper function to validate UUID format
  const isValidUUID = (id: string | null): boolean => {
    if (!id || id === "new") return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id
    );
  };

  // Helper function to safely get decoded explanation
  // URLSearchParams.get() already decodes the parameter, so we use it as-is
  const getDecodedExplanation = (str: string | null): string | undefined => {
    if (!str) return undefined;
    return str;
  };

  // Helper function to format date as "Month Year" (e.g., "January 2020")
  const formatDateMonthYear = (
    dateString: string | undefined | null
  ): string => {
    if (!dateString) return "";

    // Handle formats like "2020-01", "2020-01-15", or "2020-01-15T00:00:00Z"
    const dateMatch = dateString.match(/^(\d{4})-(\d{2})/);
    if (dateMatch) {
      const year = dateMatch[1];
      const month = parseInt(dateMatch[2], 10);
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return `${monthNames[month - 1]} ${year}`;
    }

    // Fallback: try to parse as Date
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }
    } catch (e) {
      // If parsing fails, return original string
    }

    return dateString;
  };

  const [resume, setResume] = useState<Resume | null>(null);
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const [templateData, setTemplateData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{
    section: string;
    itemId: string;
  } | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [validationCurrentSection, setValidationCurrentSection] = useState<
    string | undefined
  >(undefined);
  const [validationResults, setValidationResults] =
    useState<ValidationResults | null>(null);
  const [showValidationResults, setShowValidationResults] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [aiSectionEnhancement, setAiSectionEnhancement] = useState<{
    sectionId: string;
    message: string;
  } | null>(null);
  const [isEnhancingSection, setIsEnhancingSection] = useState(false);
  const [enhancingSectionId, setEnhancingSectionId] = useState<string | null>(
    null
  );
  const [enhancedConversation, setEnhancedConversation] = useState<{
    user: string;
    assistant: string;
  } | null>(null);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [sectionPresets, setSectionPresets] = useState<
    Array<{ id: string; name: string; sectionConfig: any }>
  >([]);
  const [jobType, setJobType] = useState<string>("all"); // "all", "tech", "creative", "executive", "academic"
  const [sectionFormatting, setSectionFormatting] = useState<
    Record<string, any>
  >({});
  const [draggedDocumentSection, setDraggedDocumentSection] = useState<
    string | null
  >(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null); // Track which section is being dragged over
  const [selectedSectionForFormatting, setSelectedSectionForFormatting] =
    useState<string | null>(null);
  const [showYourData, setShowYourData] = useState(true);

  // Version management
  const [versions, setVersions] = useState<Resume[]>([]);
  const [versionHistory, setVersionHistory] = useState<
    Array<{
      id: string;
      versionName: string;
      versionNumber: number;
      description?: string;
      isMaster: boolean;
      createdAt: string;
      updatedAt: string;
    }>
  >([]);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showVersionCompare, setShowVersionCompare] = useState(false);
  const [showVersionControl, setShowVersionControl] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionDescription, setNewVersionDescription] = useState("");
  const [newVersionJobId, setNewVersionJobId] = useState<string>("");
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState<{
    sectionId: string;
    itemId: string;
  } | null>(null);
  const [showResetFormattingConfirm, setShowResetFormattingConfirm] =
    useState(false);
  const [selectedVersion1, setSelectedVersion1] = useState<string | null>(null);
  const [selectedVersion2, setSelectedVersion2] = useState<string | null>(null);
  const [versionComparison, setVersionComparison] = useState<any>(null);
  const [resume1Data, setResume1Data] = useState<Resume | null>(null);
  const [resume2Data, setResume2Data] = useState<Resume | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Undo/Redo history
  const [resumeHistory, setResumeHistory] = useState<Resume[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySize = 50; // Limit history to prevent memory issues
  const maxLocalStorageSize = 10; // Limit localStorage history (smaller due to size constraints)
  const localStorageKey = `resume_history_${resumeId || "new"}`;
  const isUndoingRef = useRef(false); // Track if we're currently undoing to prevent saving to history

  // Toast notifications
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Resume import
  const [showImportResumeModal, setShowImportResumeModal] = useState(false);
  const [importingResume, setImportingResume] = useState(false);
  const [parsedResumeContent, setParsedResumeContent] = useState<any>(null);
  const [showParseLoader, setShowParseLoader] = useState(false);
  const [fileToParse, setFileToParse] = useState<File | null>(null);
  const [shouldAutoAnalyzeResume, setShouldAutoAnalyzeResume] = useState(false);

  // User data from database
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [userSkills, setUserSkills] = useState<SkillData[]>([]);
  const [userCertifications, setUserCertifications] = useState<
    CertificationData[]
  >([]);
  const [userJobs, setUserJobs] = useState<JobData[]>([]);
  const [userEducation, setUserEducation] = useState<EducationData[]>([]);
  const [userProjects, setUserProjects] = useState<ProjectData[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  // Job opportunity data
  const [jobOpportunity, setJobOpportunity] =
    useState<JobOpportunityData | null>(null);
  const [importSection, setImportSection] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<{
    skills: string[];
    certifications: string[];
    jobs: string[];
    education: string[];
    projects: string[];
  }>({
    skills: [],
    certifications: [],
    jobs: [],
    education: [],
    projects: [],
  });

  // Fetch user data from database
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [profileRes, skillsRes, certsRes, jobsRes, eduRes, projectsRes] =
          await Promise.allSettled([
            api.getProfile(),
            api.getSkills(),
            api.getCertifications(),
            api.getJobs(),
            api.getEducation(),
            api.getProjects(),
          ]);

        if (profileRes.status === "fulfilled" && profileRes.value.ok) {
          setUserProfile(profileRes.value.data?.profile || null);
        }
        if (skillsRes.status === "fulfilled" && skillsRes.value.ok) {
          setUserSkills(skillsRes.value.data?.skills || []);
        }
        if (certsRes.status === "fulfilled" && certsRes.value.ok) {
          setUserCertifications(certsRes.value.data?.certifications || []);
        }
        if (jobsRes.status === "fulfilled" && jobsRes.value.ok) {
          setUserJobs(jobsRes.value.data?.jobs || []);
        }
        if (eduRes.status === "fulfilled" && eduRes.value.ok) {
          setUserEducation(eduRes.value.data?.educations || []);
        }
        if (projectsRes.status === "fulfilled" && projectsRes.value.ok) {
          setUserProjects(projectsRes.value.data?.projects || []);
        }
      } catch (err) {
        console.log(
          "Failed to fetch user data (will work once authenticated):",
          err
        );
      }
    };

    fetchUserData();
  }, []);

  // Fetch job opportunity details if jobId is provided
  useEffect(() => {
    const fetchJob = async () => {
      if (jobId && isValidUUID(jobId)) {
        try {
          const response = await api.getJobOpportunity(jobId);
          if (response.ok && response.data?.jobOpportunity) {
            setJobOpportunity(response.data.jobOpportunity);
          }
        } catch (err) {
          console.error("Failed to fetch job opportunity details:", err);
        }
      }
    };

    fetchJob();
  }, [jobId]);

  // Auto-save refs (declared before useEffects that use them)
  const hasAutoSavedRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResumeIdRef = useRef<string | null>(null);
  const aiExplanationOpenedRef = useRef(false);
  const jobIdOpenedRef = useRef<string | null>(null);

  // Update resume name when job is loaded (for new resumes)
  useEffect(() => {
    if (!resumeId && resume && jobOpportunity && resume.id === "new") {
      let resumeName = "New Resume";
      if (jobOpportunity.title && jobOpportunity.company) {
        resumeName = `Resume for ${jobOpportunity.title} at ${jobOpportunity.company}`;
      } else if (jobOpportunity.title) {
        resumeName = `Resume for ${jobOpportunity.title}`;
      } else if (jobOpportunity.company) {
        resumeName = `Resume for ${jobOpportunity.company}`;
      }

      if (
        resume.name !== resumeName ||
        resume.jobId !== (jobId && isValidUUID(jobId) ? jobId : undefined)
      ) {
        const updatedResume = {
          ...resume,
          name: resumeName,
          description: `Tailored for ${jobOpportunity.title || "position"} at ${
            jobOpportunity.company || "company"
          }`,
          jobId: jobId && isValidUUID(jobId) ? jobId : resume.jobId,
        };
        setResume(updatedResume);
        // Note: Auto-save is handled by the separate useEffect below
        // This effect only updates the resume name/description when job loads
      }
    }
  }, [
    jobOpportunity,
    resumeId,
    jobId,
    resume,
    isLoading,
    showImportResumeModal,
    importingResume,
    navigate,
  ]);

  // Auto-save new resume after creation
  useEffect(() => {
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // CRITICAL: Don't auto-save if resumeId is in URL (means we're loading an existing resume)
    // This prevents duplicate creation when coming from AI tailoring or loading existing resumes
    if (resumeId && isValidUUID(resumeId)) {
      hasAutoSavedRef.current = true;
      return; // Exit early - don't auto-save existing resumes
    }

    // Only auto-save if:
    // 1. Resume exists
    // 2. Resume ID is "new" (not yet saved)
    // 3. No resumeId in URL (meaning it's truly a new resume, not loading an existing one)
    // 4. Resume ID is actually "new" (not a valid UUID)
    // 5. Not currently loading
    // 6. Haven't auto-saved this resume yet
    // 7. Not importing a resume (wait for user confirmation)
    // 8. Resume ID hasn't changed (prevent re-running when resume object reference changes)
    // For new resumes, set lastResumeIdRef to "new" if it's not already set
    if (resume && resume.id === "new" && !lastResumeIdRef.current) {
      lastResumeIdRef.current = "new";
    }

    if (
      resume &&
      resume.id === "new" &&
      !resumeId && // No resumeId in URL
      !isValidUUID(resume?.id || "") && // Resume ID is not a valid UUID
      !isLoading &&
      !hasAutoSavedRef.current &&
      !showImportResumeModal &&
      !importingResume &&
      resume.id === lastResumeIdRef.current // Only run if resume ID hasn't changed
    ) {
      // If jobId is provided, wait for job to load (or timeout after 3 seconds)
      // Otherwise, wait 1 second to ensure resume is fully initialized
      const delay = jobId && !jobOpportunity ? 3000 : 1000;

      autoSaveTimerRef.current = setTimeout(async () => {
        // Double-check conditions before saving
        // CRITICAL: Also check resumeId in URL - if it exists, don't save (existing resume)
        // Also check if resume ID has changed since timer was set
        if (
          resume &&
          resume.id === "new" &&
          !resumeId && // No resumeId in URL
          !isValidUUID(resume?.id || "") && // Resume ID is not a valid UUID
          !hasAutoSavedRef.current &&
          resume.id === lastResumeIdRef.current // Resume ID hasn't changed
        ) {
          hasAutoSavedRef.current = true;
          try {
            setIsAutoSaving(true);
            const response = await resumeService.createResume({
              name: resume.name || "New Resume",
              description: resume.description,
              templateId: resume.templateId,
              jobId: resume.jobId,
              content: resume.content,
              sectionConfig: resume.sectionConfig,
              customizations: resume.customizations,
            });

            if (response.ok && response.data?.resume) {
              const newResume = response.data.resume;
              setResume(newResume);
              lastResumeIdRef.current = newResume.id;
              // Update URL with new resume ID, preserving jobId and aiExplanation if present
              const urlParams = new URLSearchParams();
              urlParams.set("id", newResume.id);
              if (jobId && isValidUUID(jobId)) {
                urlParams.set("jobId", jobId);
              }
              if (aiExplanation) {
                urlParams.set("aiExplanation", aiExplanation);
              }
              navigate(`${ROUTES.RESUME_BUILDER}?${urlParams.toString()}`, {
                replace: true,
              });
              setLastSaved(new Date());
              // Auto-open AI panel if resume is for a job
              if (jobId && isValidUUID(jobId)) {
                setTimeout(() => {
                  setShowAIPanel(true);
                }, 500);
              }
              // Don't show toast for auto-save to avoid interrupting user
            } else {
              // Reset flag on error so it can retry
              hasAutoSavedRef.current = false;
              console.error("Auto-save failed:", response.error);
            }
          } catch (err: any) {
            // Reset flag on error so it can retry
            hasAutoSavedRef.current = false;
            console.error("Auto-save error:", err);
          } finally {
            setIsAutoSaving(false);
          }
        }
      }, delay);

      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
          autoSaveTimerRef.current = null;
        }
      };
    }
  }, [
    resume?.id, // Only depend on resume.id, not the entire resume object
    resumeId, // Add resumeId to dependencies to prevent auto-save when loading existing resume
    isLoading,
    showImportResumeModal,
    importingResume,
    navigate,
    jobId,
    jobOpportunity,
  ]);

  // Reset auto-save flag when resumeId changes (new resume created)
  // IMPORTANT: If resumeId is a valid UUID, it means we're loading an existing resume
  // so we should set hasAutoSavedRef to true to prevent duplicate creation
  useEffect(() => {
    if (resumeId && isValidUUID(resumeId)) {
      // This is an existing resume from the backend - don't auto-save
      hasAutoSavedRef.current = true;
      lastResumeIdRef.current = resumeId;
    } else if (!resumeId || resumeId === "new") {
      // This is a new resume - allow auto-save
      hasAutoSavedRef.current = false;
      lastResumeIdRef.current = null;
    }
  }, [resumeId]);

  // Fetch resume or use mock data
  useEffect(() => {
    const fetchResume = async () => {
      let templateData: any = null;
      try {
        setIsLoading(true);

        // CRITICAL: If resumeId exists and is valid, immediately disable auto-save
        // This prevents race conditions where auto-save might run before resume loads
        if (resumeId && isValidUUID(resumeId)) {
          hasAutoSavedRef.current = true;
        }

        // Validate UUID format if resumeId is provided
        if (resumeId) {
          if (!isValidUUID(resumeId) && resumeId !== "new") {
            showToast(
              "Invalid resume ID format. Please select a valid resume.",
              "error"
            );
            navigate(ROUTES.RESUMES);
            return;
          }

          if (isValidUUID(resumeId)) {
            const response = await resumeService.getResume(resumeId);
            if (response.ok && response.data) {
              const loadedResume = response.data.resume;
              setResume(loadedResume);
              
              // Fetch template data if templateId exists
              if (loadedResume.templateId) {
                try {
                  const templateResponse = await resumeService.getTemplate(
                    loadedResume.templateId
                  );
                  if (templateResponse.ok && templateResponse.data?.template) {
                    setTemplateData(templateResponse.data.template);
                  }
                } catch (err) {
                  console.log("Failed to fetch template:", err);
                }
              }
              // IMPORTANT: Mark as already saved to prevent auto-save from creating duplicate
              hasAutoSavedRef.current = true;
              lastResumeIdRef.current = loadedResume.id;
              // Initialize history with loaded resume first
              const initialHistory = [JSON.parse(JSON.stringify(loadedResume))];
              setResumeHistory(initialHistory);
              setHistoryIndex(0);
              // Then try to load history from localStorage (will override if available)
              loadHistoryFromStorage(loadedResume);
              // Load section formatting from resume customizations
              if (loadedResume.customizations?.sectionFormatting) {
                setSectionFormatting(
                  loadedResume.customizations.sectionFormatting
                );
              }
              // Don't auto-open AI panel here - handle it in a separate useEffect
            } else if (response.error?.code === "INVALID_ID") {
              showToast(
                "Invalid resume ID format. Please select a valid resume.",
                "error"
              );
              navigate(ROUTES.RESUMES);
              return;
            }
          }
        } else {
          // New resume - check if uploaded file content is available
          if (uploaded === "true") {
            try {
              // Get parsed content from sessionStorage
              const storedContent = sessionStorage.getItem(
                "uploadedResumeContent"
              );
              if (storedContent) {
                const parsedContent = JSON.parse(storedContent);
                // Set parsed content to show preview
                setParsedResumeContent(parsedContent);
                // Show import modal
                setShowImportResumeModal(true);
                showToast(
                  "Resume parsed successfully! Review and confirm to import.",
                  "success"
                );
                // Clear sessionStorage
                sessionStorage.removeItem("uploadedResumeContent");
                // Remove uploaded parameter from URL
                navigate(
                  `${ROUTES.RESUME_BUILDER}?templateId=${
                    templateId || "default-chronological"
                  }`,
                  { replace: true }
                );
              }
            } catch (err: any) {
              console.error("Failed to load uploaded resume content:", err);
              showToast("Failed to load uploaded resume content.", "error");
            }
          }

          // New resume - check if importing from existing resume
          if (importFromId && isValidUUID(importFromId)) {
            try {
              // Load the resume to import from
              const importResponse = await resumeService.getResume(
                importFromId
              );
              if (importResponse.ok && importResponse.data) {
                const sourceResume = importResponse.data.resume;
                // Set parsed content to show preview (same as file upload)
                setParsedResumeContent(sourceResume.content);
                // Show import modal
                setShowImportResumeModal(true);
                showToast(
                  "Resume loaded! Review and confirm to import.",
                  "success"
                );
                // Remove importFromId from URL
                navigate(
                  `${ROUTES.RESUME_BUILDER}?templateId=${
                    templateId || "default-chronological"
                  }`,
                  { replace: true }
                );
              }
            } catch (importErr: any) {
              console.error("Failed to load resume for import:", importErr);
              showToast(
                importErr.message || "Failed to load resume for import.",
                "error"
              );
            }
          }

          // New resume - fetch template FIRST and apply its settings
          if (templateId) {
            try {
              // Get template to apply its colors, fonts, sectionOrder, and layoutConfig
              const templateResponse = await resumeService.getTemplate(
                templateId
              );
              if (templateResponse.ok && templateResponse.data?.template) {
                const fetchedTemplate = templateResponse.data.template;
                templateData = fetchedTemplate;
                setTemplateData(fetchedTemplate);
                console.log("✅ Template fetched and stored:", {
                  id: fetchedTemplate.id,
                  name: fetchedTemplate.templateName,
                  type: fetchedTemplate.templateType,
                  hasColors: !!fetchedTemplate.colors,
                  hasFonts: !!fetchedTemplate.fonts,
                  hasSectionOrder: !!fetchedTemplate.sectionOrder,
                  hasLayoutConfig: !!fetchedTemplate.layoutConfig,
                });
                
                // Check if template has an existing resume file to parse
                if (fetchedTemplate.existingResumeTemplate) {
                  // Template has an existing resume file - parse it with AI
                  showToast("Parsing template resume with AI...", "info");
                  setImportingResume(true);

                  try {
                    const parseResponse = await resumeService.parseTemplateResume(
                      templateId
                    );
                    if (parseResponse.ok && parseResponse.data) {
                      // Set parsed content to show preview
                      setParsedResumeContent(parseResponse.data.content);
                      // Show import modal
                      setShowImportResumeModal(true);
                      showToast(
                        "Template resume parsed successfully! Review and confirm to import.",
                        "success"
                      );
                    }
                  } catch (parseErr: any) {
                    console.error("Failed to parse template resume:", parseErr);
                    showToast(
                      parseErr.message ||
                        "Failed to parse template resume. Using default template.",
                      "error"
                    );
                  } finally {
                    setImportingResume(false);
                  }
                }
              } else {
                console.log("Template not found, using default settings");
              }
            } catch (templateErr: any) {
              console.log(
                "Template not found or error fetching template:",
                templateErr.message
              );
              // Continue with default template
            }
          }

          // New resume - use mock data for preview
          // NOTE: templateData is now available from the fetch above
          // Set resume name based on job if available
          let resumeName = "New Resume";
          if (jobOpportunity) {
            if (jobOpportunity.title && jobOpportunity.company) {
              resumeName = `Resume for ${jobOpportunity.title} at ${jobOpportunity.company}`;
            } else if (jobOpportunity.title) {
              resumeName = `Resume for ${jobOpportunity.title}`;
            } else if (jobOpportunity.company) {
              resumeName = `Resume for ${jobOpportunity.company}`;
            }
          }

          const newResume = {
            id: "new",
            userId: "user1",
            name: resumeName,
            description: jobOpportunity
              ? `Tailored for ${jobOpportunity.title || "position"} at ${
                  jobOpportunity.company || "company"
                }`
              : "",
            templateId: templateId || "default-chronological",
            jobId: jobId && isValidUUID(jobId) ? jobId : undefined,
            content: {
              personalInfo: {
                firstName: "John",
                lastName: "Doe",
                email: "john.doe@example.com",
                phone: "+1 (555) 123-4567",
                location: "San Francisco, CA",
                linkedIn: "linkedin.com/in/johndoe",
                portfolio: "johndoe.dev",
              },
              summary:
                "Experienced software engineer with 5+ years of experience building scalable web applications using modern technologies.",
              experience: [
                {
                  id: "1",
                  title: "Senior Software Engineer",
                  company: "Tech Company",
                  location: "San Francisco, CA",
                  startDate: "2020-01",
                  endDate: undefined,
                  isCurrent: true,
                  description: [
                    "Led development of scalable web applications serving 100K+ users",
                    "Mentored junior developers and improved team productivity by 30%",
                    "Implemented CI/CD pipelines reducing deployment time by 50%",
                  ],
                },
              ],
              education: [
                {
                  id: "1",
                  school: "University Name",
                  degree: "Bachelor of Science",
                  field: "Computer Science",
                  startDate: "2014-09",
                  endDate: "2018-05",
                  gpa: 3.8,
                  honors: "Summa Cum Laude",
                },
              ],
              skills: [
                {
                  id: "1",
                  name: "JavaScript",
                  category: "Technical",
                  proficiency: "Expert",
                },
                {
                  id: "2",
                  name: "React",
                  category: "Technical",
                  proficiency: "Expert",
                },
                {
                  id: "3",
                  name: "Node.js",
                  category: "Technical",
                  proficiency: "Advanced",
                },
                {
                  id: "4",
                  name: "Python",
                  category: "Technical",
                  proficiency: "Advanced",
                },
                {
                  id: "5",
                  name: "AWS",
                  category: "Technical",
                  proficiency: "Intermediate",
                },
              ],
              projects: [],
              certifications: [],
            },
            sectionConfig: (() => {
              // Apply template's sectionOrder if available
              if (templateData?.sectionOrder && Array.isArray(templateData.sectionOrder)) {
                const sectionOrder = templateData.sectionOrder;
                const sectionConfig: any = {};
                sectionOrder.forEach((section: string, index: number) => {
                  sectionConfig[section] = { enabled: true, order: index };
                });
                // Add any sections not in the order as disabled
                const allSections = ["personal", "summary", "experience", "education", "skills", "projects", "certifications"];
                allSections.forEach((section) => {
                  if (!sectionConfig[section]) {
                    sectionConfig[section] = { enabled: false, order: 999 };
                  }
                });
                return sectionConfig;
              }
              // Default section order
              return {
                personal: { enabled: true, order: 0 },
                summary: { enabled: true, order: 1 },
                experience: { enabled: true, order: 2 },
                education: { enabled: true, order: 3 },
                skills: { enabled: true, order: 4 },
                projects: { enabled: false, order: 5 },
                certifications: { enabled: false, order: 6 },
              };
            })(),
            customizations: (() => {
              // Parse and apply template's colors, fonts, and layoutConfig
              let colors = {
                primary: "#3351FD",
                secondary: "#000000",
                text: "#000000",
                background: "#FFFFFF",
              };
              let fonts = { heading: "Inter", body: "Inter" };
              let spacing = { section: 24, item: 12 };
              let alignment = "left";
              let headerStyle = "centered";

              if (templateData) {
                // Use colors directly (backend now parses them)
                if (templateData.colors) {
                  colors = typeof templateData.colors === "string" 
                    ? (() => {
                        try {
                          return JSON.parse(templateData.colors);
                        } catch (e) {
                          console.error("Failed to parse template colors:", e);
                          return colors;
                        }
                      })()
                    : templateData.colors;
                }

                // Use fonts directly (backend now parses them)
                if (templateData.fonts) {
                  fonts = typeof templateData.fonts === "string" 
                    ? (() => {
                        try {
                          return JSON.parse(templateData.fonts);
                        } catch (e) {
                          console.error("Failed to parse template fonts:", e);
                          return fonts;
                        }
                      })()
                    : templateData.fonts;
                }

                // Apply layoutConfig
                if (templateData.layoutConfig) {
                  if (templateData.layoutConfig.spacing) {
                    spacing = templateData.layoutConfig.spacing;
                  }
                  if (templateData.layoutConfig.alignment) {
                    alignment = templateData.layoutConfig.alignment;
                  }
                  if (templateData.layoutConfig.headerStyle) {
                    headerStyle = templateData.layoutConfig.headerStyle;
                  }
                }
              }

              return {
                colors,
                fonts,
                spacing,
                alignment,
                headerStyle,
              };
            })(),
            versionNumber: 1,
            isMaster: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setResume(newResume);
          lastResumeIdRef.current = newResume.id;
          // Initialize history with new resume
          setResumeHistory([JSON.parse(JSON.stringify(newResume))]);
          setHistoryIndex(0);
        }
      } catch (err: any) {
        // Use mock data if API fails
        console.log("API not available, using mock data:", err.message);
        // Only use mock data if resumeId is "new" or invalid UUID
        if (isValidUUID(resumeId)) {
          // If it's a valid UUID but API failed, show error
          showToast("Failed to load resume. Please try again.", "error");
          return;
        }
        // Set resume name based on job if available
        let fallbackResumeName = "Software Engineer Resume";
        if (jobOpportunity) {
          if (jobOpportunity.title && jobOpportunity.company) {
            fallbackResumeName = `Resume for ${jobOpportunity.title} at ${jobOpportunity.company}`;
          } else if (jobOpportunity.title) {
            fallbackResumeName = `Resume for ${jobOpportunity.title}`;
          } else if (jobOpportunity.company) {
            fallbackResumeName = `Resume for ${jobOpportunity.company}`;
          }
        }

        setResume({
          id: resumeId || "new",
          userId: "user1",
          name: fallbackResumeName,
          description: jobOpportunity
            ? `Tailored for ${jobOpportunity.title || "position"} at ${
                jobOpportunity.company || "company"
              }`
            : "Tailored for tech positions",
          templateId: templateId || "default-chronological",
          jobId: jobId && isValidUUID(jobId) ? jobId : undefined,
          content: {
            personalInfo: {
              firstName: "John",
              lastName: "Doe",
              email: "john.doe@example.com",
              phone: "+1 (555) 123-4567",
              location: "San Francisco, CA",
              linkedIn: "linkedin.com/in/johndoe",
              portfolio: "johndoe.dev",
            },
            summary:
              "Experienced software engineer with 5+ years of experience building scalable web applications using modern technologies.",
            experience: [
              {
                id: "1",
                title: "Senior Software Engineer",
                company: "Tech Company",
                location: "San Francisco, CA",
                startDate: "2020-01",
                endDate: undefined,
                isCurrent: true,
                description: [
                  "Led development of scalable web applications serving 100K+ users",
                  "Mentored junior developers and improved team productivity by 30%",
                  "Implemented CI/CD pipelines reducing deployment time by 50%",
                ],
              },
            ],
            education: [
              {
                id: "1",
                school: "University Name",
                degree: "Bachelor of Science",
                field: "Computer Science",
                startDate: "2014-09",
                endDate: "2018-05",
                gpa: 3.8,
                honors: "Summa Cum Laude",
              },
            ],
            skills: [
              {
                id: "1",
                name: "JavaScript",
                category: "Technical",
                proficiency: "Expert",
              },
              {
                id: "2",
                name: "React",
                category: "Technical",
                proficiency: "Expert",
              },
              {
                id: "3",
                name: "Node.js",
                category: "Technical",
                proficiency: "Advanced",
              },
            ],
            projects: [],
            certifications: [],
          },
          sectionConfig: (() => {
            // Apply template's sectionOrder if available
            if (templateData?.sectionOrder && Array.isArray(templateData.sectionOrder)) {
              const sectionOrder = templateData.sectionOrder;
              const sectionConfig: any = {};
              sectionOrder.forEach((section: string, index: number) => {
                sectionConfig[section] = { enabled: true, order: index };
              });
              // Add any sections not in the order as disabled
              const allSections = ["personal", "summary", "experience", "education", "skills", "projects", "certifications"];
              allSections.forEach((section) => {
                if (!sectionConfig[section]) {
                  sectionConfig[section] = { enabled: false, order: 999 };
                }
              });
              return sectionConfig;
            }
            // Default section order
            return {
              personal: { enabled: true, order: 0 },
              summary: { enabled: true, order: 1 },
              experience: { enabled: true, order: 2 },
              education: { enabled: true, order: 3 },
              skills: { enabled: true, order: 4 },
              projects: { enabled: false, order: 5 },
              certifications: { enabled: false, order: 6 },
            };
          })(),
          customizations: (() => {
            // Parse and apply template's colors, fonts, and layoutConfig
            let colors = {
              primary: "#3351FD",
              secondary: "#000000",
              text: "#000000",
              background: "#FFFFFF",
            };
            let fonts = { heading: "Inter", body: "Inter" };
            let spacing = { section: 24, item: 12 };
            let alignment = "left";
            let headerStyle = "centered";

            if (templateData) {
              // Use colors directly (backend now parses them)
              if (templateData.colors) {
                colors = typeof templateData.colors === "string" 
                  ? (() => {
                      try {
                        return JSON.parse(templateData.colors);
                      } catch (e) {
                        console.error("Failed to parse template colors:", e);
                        return colors;
                      }
                    })()
                  : templateData.colors;
              }

              // Use fonts directly (backend now parses them)
              if (templateData.fonts) {
                fonts = typeof templateData.fonts === "string" 
                  ? (() => {
                      try {
                        return JSON.parse(templateData.fonts);
                      } catch (e) {
                        console.error("Failed to parse template fonts:", e);
                        return fonts;
                      }
                    })()
                  : templateData.fonts;
              }

              // Apply layoutConfig
              if (templateData.layoutConfig) {
                if (templateData.layoutConfig.spacing) {
                  spacing = templateData.layoutConfig.spacing;
                }
                if (templateData.layoutConfig.alignment) {
                  alignment = templateData.layoutConfig.alignment;
                }
                if (templateData.layoutConfig.headerStyle) {
                  headerStyle = templateData.layoutConfig.headerStyle;
                }
              }
            }

            return {
              colors,
              fonts,
              spacing,
              alignment,
              headerStyle,
            };
          })(),
          versionNumber: 1,
          isMaster: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        lastResumeIdRef.current = resumeId || "new";
      } finally {
        setIsLoading(false);
      }
    };

    fetchResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId, templateId, importFromId, uploaded]);

  // Auto-open AI panel if explanation is provided (from AI tailoring flow) OR if jobId is present
  // This is separate from fetchResume to avoid re-running fetchResume when aiExplanation changes
  useEffect(() => {
    // Check if we should open the AI panel
    const hasValidResume =
      resume && resume.id !== "new" && isValidUUID(resume.id);
    const hasJobId = jobId && isValidUUID(jobId);
    const hasExplanation = !!aiExplanation;

    // Open if:
    // 1. Resume is loaded and valid
    // 2. Either aiExplanation is present OR jobId is present
    // 3. We haven't already opened it for this resume+jobId combination
    const shouldOpenForExplanation =
      hasValidResume &&
      hasExplanation &&
      resume.id !== lastResumeIdRef.current &&
      !aiExplanationOpenedRef.current;

    const shouldOpenForJobId =
      hasValidResume && hasJobId && jobId !== jobIdOpenedRef.current;

    if (shouldOpenForExplanation) {
      lastResumeIdRef.current = resume.id;
      aiExplanationOpenedRef.current = true;
      if (hasJobId) {
        jobIdOpenedRef.current = jobId;
      }
      setTimeout(() => {
        setShowAIPanel(true);
      }, 500);
    } else if (shouldOpenForJobId) {
      // Open for jobId even if we've already opened for this resume before
      jobIdOpenedRef.current = jobId;
      setTimeout(() => {
        setShowAIPanel(true);
      }, 500);
    }

    // Reset flags when resumeId changes
    if (resumeId !== lastResumeIdRef.current) {
      aiExplanationOpenedRef.current = false;
      jobIdOpenedRef.current = null;
    }
  }, [aiExplanation, resume, resumeId, jobId]);

  // Fetch versions when resumeId changes
  useEffect(() => {
    const fetchVersions = async () => {
      if (!resumeId || resumeId === "new" || !isValidUUID(resumeId)) {
        setVersions([]);
        setVersionHistory([]);
        return;
      }

      try {
        const [versionsRes, historyRes] = await Promise.allSettled([
          resumeService.getVersions(resumeId),
          resumeService.getVersionHistory(resumeId),
        ]);

        if (versionsRes.status === "fulfilled" && versionsRes.value.ok) {
          const fetchedVersions = versionsRes.value.data?.resumes || [];
          // Ensure current resume is included if not already in versions
          if (
            resume &&
            !fetchedVersions.find((v: Resume) => v.id === resume.id)
          ) {
            setVersions([resume, ...fetchedVersions]);
          } else {
            setVersions(fetchedVersions);
          }
        } else if (resume) {
          // If API fails but we have a resume, at least show that
          setVersions([resume]);
        }

        if (historyRes.status === "fulfilled" && historyRes.value.ok) {
          setVersionHistory(historyRes.value.data?.history || []);
        }
      } catch (err) {
        console.log("Failed to fetch versions:", err);
      }
    };

    fetchVersions();
  }, [resumeId]);

  const sections = [
    { id: "personal", label: "Personal Info", icon: "mingcute:user-line" },
    { id: "summary", label: "Summary", icon: "mingcute:file-line" },
    { id: "experience", label: "Experience", icon: "mingcute:briefcase-line" },
    { id: "education", label: "Education", icon: "mingcute:school-line" },
    { id: "skills", label: "Skills", icon: "mingcute:star-line" },
    { id: "projects", label: "Projects", icon: "mingcute:folder-line" },
    {
      id: "certifications",
      label: "Certifications",
      icon: "mingcute:award-line",
    },
  ];

  const toggleSection = (sectionId: string) => {
    if (!resume) return;
    const currentConfig = resume.sectionConfig || {};
    const currentEnabled = currentConfig[sectionId]?.enabled ?? true;
    const newConfig = {
      ...currentConfig,
      [sectionId]: {
        ...currentConfig[sectionId],
        enabled: !currentEnabled,
        order:
          currentConfig[sectionId]?.order ??
          sections.findIndex((s) => s.id === sectionId),
      },
    };
    // Update resume state immediately so the document reflects changes
    setResume({ ...resume, sectionConfig: newConfig });

    // Auto-save section config changes (optional - can be removed if you want manual save only)
    if (resumeId && resumeId !== "new" && isValidUUID(resumeId)) {
      // Silently save section config changes
      resumeService
        .updateResume(resumeId, {
          sectionConfig: newConfig,
        })
        .catch((err) => {
          console.log(
            "Auto-save failed (will work once database is set up):",
            err
          );
        });
    }
  };

  const handleDragStart = (sectionId: string) => {
    setDraggedSection(sectionId);
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSection(sectionId);
  };

  const handleDrop = (targetSectionId: string) => {
    setDragOverSection(null); // Clear drag over state
    if (!resume || !draggedSection || draggedSection === targetSectionId) {
      setDraggedSection(null);
      return;
    }

    const currentConfig = resume.sectionConfig || {};
    const sortedSections = [...sections].sort((a, b) => {
      const orderA =
        currentConfig[a.id]?.order ?? sections.findIndex((s) => s.id === a.id);
      const orderB =
        currentConfig[b.id]?.order ?? sections.findIndex((s) => s.id === b.id);
      return orderA - orderB;
    });

    const newOrder = sortedSections.map((s) => s.id);
    const draggedIndex = newOrder.indexOf(draggedSection);
    const targetIndex = newOrder.indexOf(targetSectionId);

    // Remove dragged section and insert at target position
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedSection);

    // Update section config with new order
    const newConfig = { ...currentConfig };
    newOrder.forEach((sectionId, index) => {
      newConfig[sectionId] = {
        ...newConfig[sectionId],
        order: index,
        enabled: newConfig[sectionId]?.enabled ?? true,
      };
    });

    setResume({ ...resume, sectionConfig: newConfig });
    setDraggedSection(null);

    // Auto-save reorder changes
    if (resumeId && resumeId !== "new" && isValidUUID(resumeId)) {
      resumeService.reorderSections(resumeId, newOrder).catch((err) => {
        console.log(
          "Auto-save reorder failed (will work once database is set up):",
          err
        );
      });
    }
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
    setDragOverSection(null);
  };

  // Document drag handlers (for actual resume sections)
  const handleDocumentDragStart = (sectionId: string) => {
    setDraggedDocumentSection(sectionId);
  };

  const handleDocumentDragOver = (e: React.DragEvent, sectionId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (sectionId) {
      setDragOverSection(sectionId);
    }
  };

  const handleDocumentDrop = (targetSectionId: string) => {
    setDragOverSection(null); // Clear drag over state
    if (
      !resume ||
      !draggedDocumentSection ||
      draggedDocumentSection === targetSectionId
    ) {
      setDraggedDocumentSection(null);
      return;
    }

    const currentConfig = resume.sectionConfig || {};
    const enabledSectionsList = getEnabledSections();
    const sortedSections = [...enabledSectionsList].sort((a, b) => {
      const orderA =
        currentConfig[a.id]?.order ??
        enabledSectionsList.findIndex((s) => s.id === a.id);
      const orderB =
        currentConfig[b.id]?.order ??
        enabledSectionsList.findIndex((s) => s.id === b.id);
      return orderA - orderB;
    });

    const newOrder = sortedSections.map((s) => s.id);
    const draggedIndex = newOrder.indexOf(draggedDocumentSection);
    const targetIndex = newOrder.indexOf(targetSectionId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedDocumentSection);

    const newConfig = { ...currentConfig };
    newOrder.forEach((sectionId, index) => {
      newConfig[sectionId] = {
        ...newConfig[sectionId],
        order: index,
        enabled: newConfig[sectionId]?.enabled ?? true,
      };
    });

    setResume({ ...resume, sectionConfig: newConfig });
    setDraggedDocumentSection(null);

    if (resumeId && resumeId !== "new" && isValidUUID(resumeId)) {
      resumeService.reorderSections(resumeId, newOrder).catch((err) => {
        console.log("Auto-save reorder failed:", err);
      });
    }
  };

  const handleDocumentDragEnd = () => {
    setDraggedDocumentSection(null);
    setDragOverSection(null);
  };

  // Preset management
  const handleApplyPreset = async (presetId: string) => {
    if (!resume || !resumeId) return;
    try {
      const response = await resumeService.applySectionPreset(
        resumeId,
        presetId
      );
      if (response.ok && response.data) {
        setResume({ ...resume, sectionConfig: response.data.sectionConfig });
        setShowPresetMenu(false);
      }
    } catch (err) {
      console.log("Failed to apply preset:", err);
      // Apply preset locally if API fails
      const preset = sectionPresets.find((p) => p.id === presetId);
      if (preset) {
        setResume({ ...resume, sectionConfig: preset.sectionConfig });
        setShowPresetMenu(false);
      }
    }
  };

  const handleSavePreset = async () => {
    if (!resume) return;
    const presetName = prompt("Enter preset name:");
    if (!presetName) return;

    try {
      await resumeService.saveSectionPreset(presetName, resume.sectionConfig);
      // Refresh presets
      const response = await resumeService.getSectionPresets();
      if (response.ok && response.data) {
        setSectionPresets(response.data.presets);
      }
    } catch (err) {
      console.log("Failed to save preset:", err);
    }
  };

  // Section-specific formatting
  const updateSectionFormatting = (sectionId: string, formatting: any) => {
    if (!resume) return;
    const newFormatting = {
      ...sectionFormatting,
      [sectionId]: { ...sectionFormatting[sectionId], ...formatting },
    };
    setSectionFormatting(newFormatting);

    // Update resume customizations with section formatting
    const currentCustomizations = ensureCustomizations();
    const updatedResume = {
      ...resume,
      customizations: {
        ...currentCustomizations,
        sectionFormatting: newFormatting,
      },
    };
    setResume(updatedResume);

    // Auto-save to backend if resume exists
    if (resumeId && resumeId !== "new" && isValidUUID(resumeId)) {
      setIsAutoSaving(true);
      resumeService
        .updateResume(resumeId, {
          customizations: updatedResume.customizations,
        })
        .then(() => {
          setLastSaved(new Date());
        })
        .catch((err) => {
          console.error("Auto-save failed:", err);
        })
        .finally(() => {
          setTimeout(() => setIsAutoSaving(false), 500);
        });
    }
  };

  const getSectionFormatting = (sectionId: string) => {
    // First check local state, then check resume customizations
    if (sectionFormatting[sectionId]) {
      return sectionFormatting[sectionId];
    }
    if (resume?.customizations?.sectionFormatting?.[sectionId]) {
      return resume.customizations.sectionFormatting[sectionId];
    }
    return {};
  };

  // Apply section formatting to a section element
  const getSectionStyle = (sectionId: string) => {
    const formatting = getSectionFormatting(sectionId);
    const style: React.CSSProperties = {};

    if (formatting.fontSize) {
      style.fontSize = formatting.fontSize;
    }
    if (formatting.fontWeight) {
      style.fontWeight = formatting.fontWeight;
    }
    if (formatting.color) {
      style.color = formatting.color;
    }
    if (formatting.backgroundColor) {
      style.backgroundColor = formatting.backgroundColor;
    }
    if (formatting.textAlign) {
      style.textAlign = formatting.textAlign as
        | "left"
        | "center"
        | "right"
        | "justify";
    }
    if (formatting.marginTop) {
      style.marginTop = formatting.marginTop;
    }
    if (formatting.marginBottom) {
      style.marginBottom = formatting.marginBottom;
    }

    return style;
  };

  // Save current resume state to history (both memory and localStorage)
  const saveToHistory = (resumeState: Resume) => {
    // Don't save to history if we're currently undoing
    if (isUndoingRef.current) {
      console.log("⏭️ Skipping history save during undo operation");
      return;
    }

    setHistoryIndex((prevIndex) => {
      setResumeHistory((prevHistory) => {
        // Remove any history after current index (if we're not at the end)
        const newHistory = prevHistory.slice(0, prevIndex + 1);

        // Add new state
        const updatedHistory = [
          ...newHistory,
          JSON.parse(JSON.stringify(resumeState)),
        ];

        // Limit history size
        let finalHistory = updatedHistory;
        let newIndex = updatedHistory.length - 1;
        if (updatedHistory.length > maxHistorySize) {
          finalHistory = updatedHistory.slice(-maxHistorySize);
          // Update index to match trimmed history
          newIndex = finalHistory.length - 1;
        }

        // Persist to localStorage (limited to recent history due to size constraints)
        try {
          const historyForStorage = finalHistory.slice(-maxLocalStorageSize);
          const historyData = {
            history: historyForStorage,
            index: Math.min(newIndex, historyForStorage.length - 1),
            timestamp: Date.now(),
          };
          localStorage.setItem(localStorageKey, JSON.stringify(historyData));
        } catch (error) {
          // localStorage might be full or unavailable - silently fail
          console.warn("Failed to save history to localStorage:", error);
        }

        return finalHistory;
      });

      // Calculate new index
      return prevIndex + 1;
    });
  };

  // Load history from localStorage on mount
  const loadHistoryFromStorage = (currentResume: Resume | null) => {
    if (!resumeId || resumeId === "new") return; // Don't load for new resumes

    try {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        const historyData = JSON.parse(stored);
        // Only restore if it's recent (within last 24 hours)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (historyData.timestamp && historyData.timestamp > oneDayAgo) {
          if (historyData.history && historyData.history.length > 0) {
            // Merge with current resume to ensure we have the latest state
            if (currentResume) {
              // Prepend current resume to history if not already there
              const mergedHistory = [currentResume, ...historyData.history];
              setResumeHistory(mergedHistory);
              setHistoryIndex(mergedHistory.length - 1);
            } else {
              setResumeHistory(historyData.history);
              setHistoryIndex(
                Math.min(historyData.index || 0, historyData.history.length - 1)
              );
            }
          }
        } else {
          // Clean up old history
          localStorage.removeItem(localStorageKey);
        }
      }
    } catch (error) {
      console.warn("Failed to load history from localStorage:", error);
      // Clean up corrupted data
      localStorage.removeItem(localStorageKey);
    }
  };

  // Undo function
  const handleUndo = () => {
    setHistoryIndex((prevIndex) => {
      setResumeHistory((prevHistory) => {
        console.log("🔄 Undo check:", {
          prevIndex,
          historyLength: prevHistory.length,
          canUndo: prevIndex > 0 && prevHistory.length > 0,
        });

        if (prevIndex > 0 && prevHistory.length > 0) {
          // Set flag to prevent saving to history during undo
          isUndoingRef.current = true;

          const previousState = prevHistory[prevIndex - 1];
          console.log("↩️ Undoing to state at index:", prevIndex - 1);

          setResume(previousState);
          setToast({
            message: "Changes undone",
            type: "success",
          });

          // Save to backend if resume exists
          if (resumeId && resumeId !== "new" && previousState) {
            resumeService
              .updateResume(resumeId, previousState)
              .then(() => {
                setLastSaved(new Date());
                // Reset flag after a short delay to allow state updates to complete
                setTimeout(() => {
                  isUndoingRef.current = false;
                }, 200);
              })
              .catch((err) => {
                console.error("Failed to save undo:", err);
                isUndoingRef.current = false;
              });
          } else {
            // Reset flag if no backend save needed
            setTimeout(() => {
              isUndoingRef.current = false;
            }, 200);
          }

          // Update localStorage
          try {
            const historyForStorage = prevHistory.slice(-maxLocalStorageSize);
            const historyData = {
              history: historyForStorage,
              index: prevIndex - 1,
              timestamp: Date.now(),
            };
            localStorage.setItem(localStorageKey, JSON.stringify(historyData));
          } catch (error) {
            console.warn("Failed to save undo to localStorage:", error);
          }

          return prevHistory; // Don't modify history on undo
        } else {
          setToast({
            message: "Nothing to undo",
            type: "info",
          });
          return prevHistory;
        }
      });

      // Decrement index if we can undo
      if (prevIndex > 0) {
        const newIndex = prevIndex - 1;
        console.log("📉 History index decremented:", prevIndex, "->", newIndex);
        return newIndex;
      }
      return prevIndex;
    });
  };

  // Check if undo is available
  const canUndo = historyIndex > 0 && resumeHistory.length > 0;

  // Toast notification helper
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    if (!resume) {
      showToast("No resume to save", "error");
      return;
    }

    try {
      setIsSaving(true);

      // If resumeId is "new" or invalid, create a new resume
      if (!resumeId || resumeId === "new" || !isValidUUID(resumeId)) {
        const response = await resumeService.createResume({
          name: resume.name || "New Resume",
          description: resume.description,
          templateId: resume.templateId,
          jobId: resume.jobId,
          content: resume.content,
          sectionConfig: resume.sectionConfig,
          customizations: resume.customizations,
        });

        if (response.ok && response.data?.resume) {
          const newResume = response.data.resume;
          setResume(newResume);
          // Update URL with new resume ID
          navigate(`${ROUTES.RESUME_BUILDER}?id=${newResume.id}`, {
            replace: true,
          });
          setLastSaved(new Date());
          showToast("Resume created successfully!", "success");
        } else {
          throw new Error(response.error?.message || "Failed to create resume");
        }
      } else {
        // Update existing resume
        await resumeService.updateResume(resumeId, {
          name: resume.name,
          description: resume.description,
          content: resume.content,
          sectionConfig: resume.sectionConfig,
          customizations: resume.customizations,
          templateId: resume.templateId,
          jobId: resume.jobId,
        });
        setLastSaved(new Date());
        showToast("Resume saved successfully!", "success");
      }
    } catch (err: any) {
      showToast(
        err.message || "Failed to save resume. Please try again.",
        "error"
      );
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (options: {
    format: ExportFormat;
    filename: string;
    watermark?: File | null;
    theme: ExportTheme;
    printOptimized: boolean;
  }) => {
    try {
      setExporting(true);
      setShowExportModal(false);
      showToast(`Exporting as ${options.format.toUpperCase()}...`, "info");

      const filename =
        options.filename || resume?.name || `resume_${resumeId || Date.now()}`;
      const format = options.format;

      // For PDF - use client-side html2canvas + jsPDF
      if (format === "pdf") {
        // Find the resume preview element by ID (more reliable)
        let previewElement = document.getElementById(
          "resume-export-target"
        ) as HTMLElement;

        // Fallback to class selector if ID not found
        if (!previewElement) {
          previewElement = document.querySelector(
            '[class*="max-w-4xl"][class*="bg-white"][class*="shadow-lg"]'
          ) as HTMLElement;
        }

        if (!previewElement) {
          showToast(
            "Could not find preview element. Please try again.",
            "error"
          );
          setExporting(false);
          return;
        }

        // Dynamically import html2canvas and jsPDF
        const html2canvas = (await import("html2canvas")).default;
        const jsPDFModule = await import("jspdf");
        // jsPDF is the default export - get the constructor class
        const jsPDF = (jsPDFModule as any).default || jsPDFModule;

        // Inject a style override to convert oklch CSS variables to RGB before capture
        const styleOverride = document.createElement("style");
        styleOverride.id = "pdf-export-oklch-override";
        styleOverride.textContent = `
          :root {
            --background: #ffffff;
            --foreground: #1a1a1a;
            --card: #ffffff;
            --card-foreground: #1a1a1a;
            --popover: #ffffff;
            --popover-foreground: #1a1a1a;
            --primary: #1a1a1a;
            --primary-foreground: #fafafa;
            --secondary: #f5f5f5;
            --secondary-foreground: #1a1a1a;
            --muted: #f5f5f5;
            --muted-foreground: #737373;
            --accent: #f5f5f5;
            --accent-foreground: #1a1a1a;
            --destructive: #dc2626;
            --border: #e5e5e5;
            --input: #e5e5e5;
            --ring: #a3a3a3;
          }
        `;
        document.head.appendChild(styleOverride);

        try {
          // Capture the element as canvas
          const canvas = await html2canvas(previewElement, {
            scale: 2, // Higher quality
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            width: previewElement.scrollWidth,
            height: previewElement.scrollHeight,
          });

          // Calculate PDF dimensions (A4: 210mm x 297mm)
          const imgWidth = 210; // A4 width in mm
          const pageHeight = 297; // A4 height in mm
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const pdf = new jsPDF("p", "mm", "a4");

          // If content fits on one page
          if (imgHeight <= pageHeight) {
            pdf.addImage(
              canvas.toDataURL("image/png"),
              "PNG",
              0,
              0,
              imgWidth,
              imgHeight
            );
          } else {
            // Split across multiple pages
            const pageCount = Math.ceil(imgHeight / pageHeight);

            for (let i = 0; i < pageCount; i++) {
              if (i > 0) {
                pdf.addPage();
              }

              // Calculate the portion of the image to show on this page
              const sourceY = (canvas.height / imgHeight) * (i * pageHeight);
              const sourceHeight = Math.min(
                (canvas.height / imgHeight) * pageHeight,
                canvas.height - sourceY
              );

              // Create a temporary canvas for this page's portion
              const pageCanvas = document.createElement("canvas");
              pageCanvas.width = canvas.width;
              pageCanvas.height = sourceHeight;
              const pageCtx = pageCanvas.getContext("2d");

              if (pageCtx) {
                pageCtx.drawImage(
                  canvas,
                  0,
                  sourceY,
                  canvas.width,
                  sourceHeight,
                  0,
                  0,
                  canvas.width,
                  sourceHeight
                );

                const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;
                pdf.addImage(
                  pageCanvas.toDataURL("image/png"),
                  "PNG",
                  0,
                  0,
                  imgWidth,
                  pageImgHeight
                );
              }
            }
          }

          // Add watermark if provided
          if (options.watermark) {
            const watermarkImg = await new Promise<HTMLImageElement>(
              (resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = URL.createObjectURL(options.watermark!);
              }
            );

            // Add watermark to each page
            const pageCount = pdf.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
              pdf.setPage(i);
              const pageWidth = pdf.internal.pageSize.getWidth();
              const pageHeight = pdf.internal.pageSize.getHeight();

              // Calculate watermark size (20% of page width)
              const watermarkWidth = pageWidth * 0.2;
              const watermarkHeight =
                (watermarkImg.height / watermarkImg.width) * watermarkWidth;

              // Center the watermark
              const x = (pageWidth - watermarkWidth) / 2;
              const y = (pageHeight - watermarkHeight) / 2;

              // Add watermark with opacity
              pdf.saveGraphicsState();
              pdf.setGState(pdf.GState({ opacity: 0.15 }));
              pdf.addImage(
                watermarkImg.src,
                "PNG",
                x,
                y,
                watermarkWidth,
                watermarkHeight
              );
              pdf.restoreGraphicsState();
            }

            URL.revokeObjectURL(watermarkImg.src);
          }

          // Save the PDF
          pdf.save(`${filename}.pdf`);
          showToast("Resume exported as PDF successfully!", "success");
        } finally {
          // Remove the style override
          const overrideStyle = document.getElementById(
            "pdf-export-oklch-override"
          );
          if (overrideStyle) {
            overrideStyle.remove();
          }
        }
      }
      // For DOCX - send HTML to backend
      else if (format === "docx") {
        // Find the resume preview element
        const previewElement = document.querySelector(
          '[class*="max-w-4xl"][class*="bg-white"][class*="shadow-lg"]'
        ) as HTMLElement;

        if (!previewElement) {
          showToast(
            "Could not find preview element. Please try again.",
            "error"
          );
          setExporting(false);
          return;
        }

        // Capture HTML from preview element
        const html = previewElement.outerHTML;

        // Add styles from the document
        const styles = Array.from(document.styleSheets)
          .map((sheet) => {
            try {
              return Array.from(sheet.cssRules)
                .map((rule) => rule.cssText)
                .join("\n");
            } catch (e) {
              return "";
            }
          })
          .join("\n");

        // Create complete HTML document
        const completeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <style>
        ${styles}
        body { margin: 0; padding: 0; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>
    ${html}
</body>
</html>`;

        // Get current resume data to send to backend
        const currentResumeData = previewResume || resume;

        // Convert watermark file to base64 if provided
        let watermarkBase64 = null;
        if (options.watermark) {
          watermarkBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(options.watermark!);
          });
        }

        const docxResult = await resumeService.exportDOCXFromHTML(
          completeHTML,
          {
            filename: `${filename}.docx`,
            resumeData: currentResumeData,
            watermark: watermarkBase64,
            theme: options.theme,
            printOptimized: options.printOptimized,
          }
        );
        resumeService.downloadBlob(docxResult.blob, docxResult.filename);
        showToast("Resume exported as DOCX successfully!", "success");
      }
      // For HTML - use client-side export with all styles
      else if (format === "html") {
        // Find the resume preview element
        let previewElement = document.getElementById(
          "resume-export-target"
        ) as HTMLElement;

        // Fallback to class selector if ID not found
        if (!previewElement) {
          previewElement = document.querySelector(
            '[class*="max-w-4xl"][class*="bg-white"][class*="shadow-lg"]'
          ) as HTMLElement;
        }

        if (!previewElement) {
          showToast(
            "Could not find preview element. Please try again.",
            "error"
          );
          setExporting(false);
          return;
        }

        // Get all stylesheets from the document
        const styles = Array.from(document.styleSheets)
          .map((sheet) => {
            try {
              return Array.from(sheet.cssRules)
                .map((rule) => rule.cssText)
                .join("\n");
            } catch (e) {
              // Cross-origin stylesheets will throw an error, skip them
              return "";
            }
          })
          .filter(Boolean)
          .join("\n");

        // Capture HTML from preview element
        const html = previewElement.outerHTML;

        // Create complete HTML document with all styles
        const completeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <style>
        ${styles}
        body { 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        }
        .resume-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        @media print { 
            body { 
                padding: 0; 
                background: white;
            }
            .resume-container {
                box-shadow: none;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="resume-container">
        ${html}
    </div>
</body>
</html>`;

        // Create blob and download
        const blob = new Blob([completeHTML], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast("Resume exported as HTML successfully!", "success");
      }
      // For TXT, use backend method (requires resumeId)
      else if (format === "txt") {
        if (!resumeId || resumeId === "new") {
          showToast("Please save the resume before exporting", "error");
          setExporting(false);
          return;
        }

        // Validate UUID format
        if (!isValidUUID(resumeId)) {
          showToast(
            "Invalid resume ID. Please save the resume first.",
            "error"
          );
          setExporting(false);
          return;
        }

        const txtResult = await resumeService.exportTXT(resumeId, {
          filename: `${filename}.txt`,
        });
        resumeService.downloadBlob(txtResult.blob, txtResult.filename);
        showToast("Resume exported as TXT successfully!", "success");
      }
    } catch (err: any) {
      showToast(
        err.message ||
          `Failed to export as ${options.format.toUpperCase()}. Please try again.`,
        "error"
      );
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const updateContent = (
    sectionId: string,
    value: any,
    closeEdit: boolean = false
  ) => {
    if (!resume) return;
    const newContent = { ...resume.content };
    if (sectionId === "personal") {
      newContent.personalInfo = { ...newContent.personalInfo, ...value };
    } else {
      (newContent as any)[sectionId] = value;
    }
    const updatedResume = { ...resume, content: newContent };
    setResume(updatedResume);

    // Also update previewResume if it exists
    if (previewResume) {
      const previewContent = { ...previewResume.content };
      if (sectionId === "personal") {
        previewContent.personalInfo = {
          ...previewContent.personalInfo,
          ...value,
        };
      } else {
        (previewContent as any)[sectionId] = value;
      }
      setPreviewResume({ ...previewResume, content: previewContent });
    }

    // Auto-save to backend
    if (resumeId && resumeId !== "new" && isValidUUID(resumeId)) {
      saveToHistory(resume); // Save to history before updating
      resumeService
        .updateResume(resumeId, {
          content: newContent,
        })
        .then(() => {
          setLastSaved(new Date());
        })
        .catch((err) => {
          console.error("Auto-save failed:", err);
        });
    }

    if (closeEdit) {
      setEditingSection(null);
    }
  };

  const updateItem = (
    sectionId: string,
    itemId: string,
    updates: any,
    closeEdit: boolean = false
  ) => {
    if (!resume) return;

    // Create a deep copy to avoid mutation issues
    const newContent = { ...resume.content };
    const section = (newContent as any)[sectionId];

    if (Array.isArray(section)) {
      const index = section.findIndex((item: any) => item.id === itemId);
      if (index !== -1) {
        // Create new array with updated item (immutable update)
        const updatedSection = section.map((item: any, i: number) =>
          i === index ? { ...item, ...updates } : item
        );
        (newContent as any)[sectionId] = updatedSection;
        const updatedResume = { ...resume, content: newContent };
        setResume(updatedResume);

        // Also update previewResume if it exists
        if (previewResume) {
          const previewContent = { ...previewResume.content };
          const previewSection = (previewContent as any)[sectionId];
          if (Array.isArray(previewSection)) {
            const previewIndex = previewSection.findIndex(
              (item: any) => item.id === itemId
            );
            if (previewIndex !== -1) {
              // Create new array with updated item (immutable update)
              const updatedPreviewSection = previewSection.map(
                (item: any, i: number) =>
                  i === previewIndex ? { ...item, ...updates } : item
              );
              (previewContent as any)[sectionId] = updatedPreviewSection;
              setPreviewResume({ ...previewResume, content: previewContent });
            }
          }
        }

        // Auto-save to backend
        if (resumeId && resumeId !== "new") {
          saveToHistory(resume); // Save to history before updating
          resumeService
            .updateResume(resumeId, {
              content: newContent,
            })
            .then(() => {
              setLastSaved(new Date());
            })
            .catch((err) => {
              console.error("Auto-save failed:", err);
            });
        }
      } else {
        console.warn(
          `Item with id ${itemId} not found in section ${sectionId}`
        );
      }
    } else {
      console.warn(`Section ${sectionId} is not an array`);
    }

    if (closeEdit) {
      setEditingItem(null);
    }
  };

  const addItem = (sectionId: string, newItem: any) => {
    if (!resume) return;
    const newContent = { ...resume.content };
    const section = (newContent as any)[sectionId];
    if (Array.isArray(section)) {
      (newContent as any)[sectionId] = [...section, newItem];
      const updatedResume = { ...resume, content: newContent };
      setResume(updatedResume);

      // Also update previewResume if it exists
      if (previewResume) {
        const previewContent = { ...previewResume.content };
        const previewSection = (previewContent as any)[sectionId];
        if (Array.isArray(previewSection)) {
          (previewContent as any)[sectionId] = [...previewSection, newItem];
          setPreviewResume({ ...previewResume, content: previewContent });
        }
      }

      // Auto-save to backend
      if (resumeId && resumeId !== "new") {
        saveToHistory(resume); // Save to history before updating
        resumeService
          .updateResume(resumeId, {
            content: newContent,
          })
          .then(() => {
            setLastSaved(new Date());
          })
          .catch((err) => {
            console.error("Auto-save failed:", err);
          });
      }
    }
    setEditingItem(null);
  };

  const deleteItem = (sectionId: string, itemId: string) => {
    if (!resume) return;
    setShowDeleteItemConfirm({ sectionId, itemId });
  };

  // Handle section enhancement with AI
  const handleEnhanceSectionWithAI = async (sectionId: string) => {
    if (!resume) return;

    const sectionNames: Record<string, string> = {
      personal: "Personal Information",
      summary: "Summary",
      experience: "Experience",
      education: "Education",
      skills: "Skills",
      projects: "Projects",
      certifications: "Certifications",
    };

    const sectionName = sectionNames[sectionId] || sectionId;
    const sectionContent = (resume.content as any)[sectionId];

    // Build context message based on section type
    let contextMessage = `I need help improving my ${sectionName} section.\n\nGuidelines:\n- Respond ONLY with clear, human-readable guidance (paragraphs and bullet points).\n- Do NOT include JSON, code blocks, or any backend/API instructions.\n- Do NOT mention internal system behavior, schemas, or implementation details.\n- Focus on specificity, clarity, actionability, and ATS-friendly phrasing.`;

    if (sectionId === "personal") {
      const personalInfo = sectionContent || {};
      contextMessage += `Current information:\n- Name: ${
        personalInfo.firstName || ""
      } ${personalInfo.lastName || ""}\n- Email: ${
        personalInfo.email || ""
      }\n- Phone: ${personalInfo.phone || ""}\n- Location: ${
        personalInfo.location || ""
      }\n- LinkedIn: ${personalInfo.linkedIn || ""}\n- Portfolio: ${
        personalInfo.portfolio || ""
      }\n\nPlease suggest improvements for formatting, completeness, and professional presentation.`;
    } else if (sectionId === "summary") {
      contextMessage += `Current summary:\n"${
        sectionContent || ""
      }"\n\nPlease suggest improvements for clarity, impact, and ATS optimization. Make it more compelling and tailored to my experience.`;
    } else if (sectionId === "experience") {
      const experiences = Array.isArray(sectionContent) ? sectionContent : [];
      contextMessage += `I have ${experiences.length} experience entries. `;
      if (experiences.length > 0) {
        contextMessage += `Here's my most recent:\n- ${
          experiences[0].title || ""
        } at ${experiences[0].company || ""}\n- Description: ${
          Array.isArray(experiences[0].description)
            ? experiences[0].description.join("\n")
            : experiences[0].description || ""
        }\n\n`;
      }
      contextMessage += `Please suggest improvements for bullet points, action verbs, quantifiable achievements, and overall impact.`;
    } else if (sectionId === "education") {
      const educations = Array.isArray(sectionContent) ? sectionContent : [];
      contextMessage += `I have ${educations.length} education entries. `;
      if (educations.length > 0) {
        contextMessage += `Here's my most recent:\n- ${
          educations[0].degree || ""
        } from ${educations[0].school || ""}\n- Field: ${
          educations[0].field || ""
        }\n- GPA: ${educations[0].gpa || ""}\n- Honors: ${
          educations[0].honors || ""
        }\n\n`;
      }
      contextMessage += `Please suggest improvements for formatting, completeness, and highlighting achievements.`;
    } else if (sectionId === "skills") {
      const skills = Array.isArray(sectionContent) ? sectionContent : [];
      contextMessage += `I have ${skills.length} skills listed. `;
      if (skills.length > 0) {
        const skillNames = skills.map((s: any) => s.name || s).join(", ");
        contextMessage += `Current skills: ${skillNames}\n\n`;
      }
      contextMessage += `Please suggest improvements for organization, categorization, relevance, and ATS optimization. Also suggest any missing skills based on my experience.`;
    } else if (sectionId === "projects") {
      const projects = Array.isArray(sectionContent) ? sectionContent : [];
      contextMessage += `I have ${projects.length} projects listed. `;
      if (projects.length > 0) {
        contextMessage += `Here's one example:\n- ${
          projects[0].name || ""
        }\n- Description: ${projects[0].description || ""}\n- Technologies: ${
          Array.isArray(projects[0].technologies)
            ? projects[0].technologies.join(", ")
            : projects[0].technologies || ""
        }\n\n`;
      }
      contextMessage += `Please suggest improvements for descriptions, impact, technologies, and overall presentation.`;
    } else if (sectionId === "certifications") {
      const certifications = Array.isArray(sectionContent)
        ? sectionContent
        : [];
      contextMessage += `I have ${certifications.length} certifications listed. `;
      if (certifications.length > 0) {
        const certNames = certifications
          .map((c: any) => `${c.name || ""} from ${c.organization || ""}`)
          .join(", ");
        contextMessage += `Current certifications: ${certNames}\n\n`;
      }
      contextMessage += `Please suggest improvements for formatting, relevance, and any additional certifications I should consider.`;
    }

    // Show enhancing loader and call AI
    setIsEnhancingSection(true);
    setEnhancingSectionId(sectionId);
    setEnhancedConversation(null);
    try {
      // If resumeId is "new" or invalid, we need to create the resume first or use a different approach
      if (!resumeId || resumeId === "new" || !isValidUUID(resumeId)) {
        console.error("Cannot enhance section: Resume must be saved first");
        showToast(
          "Please save your resume before using AI enhancement.",
          "error"
        );
        setIsEnhancingSection(false);
        setEnhancingSectionId(null);
        return;
      }

      const jobIdForContext = jobId && isValidUUID(jobId) ? jobId : undefined;
      console.log("📤 Calling AI chat for section enhancement:", {
        resumeId,
        sectionId,
        jobId: jobIdForContext,
        messageLength: contextMessage.length,
      });

      const resp = await resumeService.chat(
        resumeId,
        [{ role: "user", content: contextMessage }],
        jobIdForContext,
        resume || undefined
      );

      console.log("📥 AI chat response:", resp);

      if (resp.ok && resp.data?.message) {
        const assistantReply = resp.data.message || "";
        console.log("✅ AI response received, length:", assistantReply.length);
        setEnhancedConversation({
          user: contextMessage,
          assistant: assistantReply,
        });
        // Open AI panel only after we have the response
        setShowAIPanel(true);
      } else {
        console.error("❌ AI chat failed:", {
          ok: resp.ok,
          data: resp.data,
          error: resp.error,
        });
        showToast(
          resp.error?.message || "AI enhancement failed. Please try again.",
          "error"
        );
      }
    } catch (e: any) {
      console.error("❌ Enhance with AI exception:", e);
      showToast(
        e?.message || "AI enhancement error. Please try again.",
        "error"
      );
    } finally {
      setIsEnhancingSection(false);
      setEnhancingSectionId(null);
    }
  };

  // Handle resume validation
  const handleValidateResume = async () => {
    if (!resume) {
      showToast("No resume to validate", "error");
      return;
    }

    if (!resumeId || resumeId === "new" || !isValidUUID(resumeId)) {
      showToast("Please save your resume before validating", "error");
      return;
    }

    // Start validation with scanning animation
    setIsValidating(true);
    setValidationProgress(0);
    setValidationCurrentSection(undefined);
    setShowValidationPanel(false);

    // Simulate scanning progress
    const sections = [
      "Personal Information",
      "Summary",
      "Experience",
      "Education",
      "Skills",
      "Projects",
      "Certifications",
    ];

    const progressInterval = setInterval(() => {
      setValidationProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    const sectionInterval = setInterval(() => {
      setValidationCurrentSection((prev) => {
        const currentIndex = prev ? sections.indexOf(prev) : -1;
        const nextIndex = currentIndex + 1;
        if (nextIndex >= sections.length) {
          clearInterval(sectionInterval);
          return undefined;
        }
        return sections[nextIndex];
      });
    }, 1000);

    try {
      // Call validation API
      const resp = await resumeService.validateResume(
        resumeId,
        resume || undefined
      );

      // Clear intervals
      clearInterval(progressInterval);
      clearInterval(sectionInterval);

      if (resp.ok && resp.data) {
        setValidationProgress(100);
        setValidationCurrentSection(undefined);

        // Wait a moment to show 100% progress
        setTimeout(() => {
          setIsValidating(false);
          setValidationResults(resp.data as ValidationResults);
          setShowValidationResults(true);
        }, 500);
      } else {
        clearInterval(progressInterval);
        clearInterval(sectionInterval);
        setIsValidating(false);
        setValidationProgress(0);
        setValidationCurrentSection(undefined);
        showToast(
          resp.error?.message || "Validation failed. Please try again.",
          "error"
        );
      }
    } catch (e: any) {
      clearInterval(progressInterval);
      clearInterval(sectionInterval);
      setIsValidating(false);
      setValidationProgress(0);
      setValidationCurrentSection(undefined);
      console.error("❌ Validation exception:", e);
      showToast(e?.message || "Validation error. Please try again.", "error");
    }
  };

  const confirmDeleteItem = () => {
    if (!resume || !showDeleteItemConfirm) return;
    const { sectionId, itemId } = showDeleteItemConfirm;
    setShowDeleteItemConfirm(null);
    const newContent = { ...resume.content };
    const section = (newContent as any)[sectionId];
    if (Array.isArray(section)) {
      (newContent as any)[sectionId] = section.filter(
        (item: any) => item.id !== itemId
      );
      const updatedResume = { ...resume, content: newContent };
      setResume(updatedResume);

      // Also update previewResume if it exists
      if (previewResume) {
        const previewContent = { ...previewResume.content };
        const previewSection = (previewContent as any)[sectionId];
        if (Array.isArray(previewSection)) {
          (previewContent as any)[sectionId] = previewSection.filter(
            (item: any) => item.id !== itemId
          );
          setPreviewResume({ ...previewResume, content: previewContent });
        }
      }

      // Auto-save to backend
      if (resumeId && resumeId !== "new") {
        saveToHistory(resume); // Save to history before updating
        resumeService
          .updateResume(resumeId, {
            content: newContent,
          })
          .then(() => {
            setLastSaved(new Date());
          })
          .catch((err) => {
            console.error("Auto-save failed:", err);
          });
      }
    }
  };

  // Import functions to add items from database
  const handleImportFromDatabase = (sectionId: string) => {
    setImportSection(sectionId);

    // Auto-select items that aren't already in the resume
    if (sectionId === "skills") {
      const existingSkillIds = new Set(
        (resume?.content.skills || []).map(
          (s: any) => s.id || s.name || s.skillName
        )
      );
      const availableIds = userSkills
        .filter(
          (skill) =>
            !existingSkillIds.has(skill.id) &&
            !existingSkillIds.has(skill.skillName)
        )
        .map((skill) => skill.id);
      setSelectedItems((prev) => ({ ...prev, skills: availableIds }));
    } else if (sectionId === "certifications") {
      const existingCertIds = new Set(
        (resume?.content.certifications || []).map((c: any) => c.id)
      );
      const availableIds = userCertifications
        .filter((cert) => !existingCertIds.has(cert.id))
        .map((cert) => cert.id);
      setSelectedItems((prev) => ({ ...prev, certifications: availableIds }));
    } else if (sectionId === "experience") {
      const existingJobIds = new Set(
        (resume?.content.experience || []).map((j: any) => j.id)
      );
      const availableIds = userJobs
        .filter((job) => !existingJobIds.has(job.id))
        .map((job) => job.id);
      setSelectedItems((prev) => ({ ...prev, jobs: availableIds }));
    } else if (sectionId === "education") {
      const existingEduIds = new Set(
        (resume?.content.education || []).map((e: any) => e.id)
      );
      const availableIds = userEducation
        .filter((edu) => !existingEduIds.has(edu.id))
        .map((edu) => edu.id);
      setSelectedItems((prev) => ({ ...prev, education: availableIds }));
    } else if (sectionId === "projects") {
      const existingProjIds = new Set(
        (resume?.content.projects || []).map((p: any) => p.id)
      );
      const availableIds = userProjects
        .filter((proj) => !existingProjIds.has(proj.id))
        .map((proj) => proj.id);
      setSelectedItems((prev) => ({ ...prev, projects: availableIds }));
    }

    setShowImportModal(true);
  };

  const handleSelectAll = () => {
    if (!importSection || !resume) return;

    if (importSection === "skills") {
      const existingSkillIds = new Set(
        (resume.content.skills || []).map(
          (s: any) => s.id || s.name || s.skillName
        )
      );
      const availableIds = userSkills
        .filter(
          (skill) =>
            !existingSkillIds.has(skill.id) &&
            !existingSkillIds.has(skill.skillName)
        )
        .map((skill) => skill.id);
      setSelectedItems((prev) => ({ ...prev, skills: availableIds }));
    } else if (importSection === "certifications") {
      const existingCertIds = new Set(
        (resume.content.certifications || []).map((c: any) => c.id)
      );
      const availableIds = userCertifications
        .filter((cert) => !existingCertIds.has(cert.id))
        .map((cert) => cert.id);
      setSelectedItems((prev) => ({ ...prev, certifications: availableIds }));
    } else if (importSection === "experience") {
      const existingJobIds = new Set(
        (resume.content.experience || []).map((j: any) => j.id)
      );
      const availableIds = userJobs
        .filter((job) => !existingJobIds.has(job.id))
        .map((job) => job.id);
      setSelectedItems((prev) => ({ ...prev, jobs: availableIds }));
    } else if (importSection === "education") {
      const existingEduIds = new Set(
        (resume.content.education || []).map((e: any) => e.id)
      );
      const availableIds = userEducation
        .filter((edu) => !existingEduIds.has(edu.id))
        .map((edu) => edu.id);
      setSelectedItems((prev) => ({ ...prev, education: availableIds }));
    } else if (importSection === "projects") {
      const existingProjIds = new Set(
        (resume.content.projects || []).map((p: any) => p.id)
      );
      const availableIds = userProjects
        .filter((proj) => !existingProjIds.has(proj.id))
        .map((proj) => proj.id);
      setSelectedItems((prev) => ({ ...prev, projects: availableIds }));
    }
  };

  const handleDeselectAll = () => {
    if (!importSection) return;
    setSelectedItems((prev) => ({
      ...prev,
      [importSection]: [],
    }));
  };

  const handleImportSelectedItems = () => {
    if (!resume || !importSection) return;

    const newContent = { ...resume.content };
    const newSectionConfig = { ...resume.sectionConfig };

    // Ensure section exists and is initialized as an array
    if (!newContent[importSection as keyof typeof newContent]) {
      (newContent as any)[importSection] = [];
    }

    // Ensure section is enabled in sectionConfig
    if (!newSectionConfig[importSection]) {
      const enabledSections = getEnabledSections();
      const maxOrder = Math.max(
        ...enabledSections.map((s) => newSectionConfig[s.id]?.order ?? 0),
        -1
      );
      newSectionConfig[importSection] = {
        enabled: true,
        order: maxOrder + 1,
      };
    } else {
      // Ensure section is enabled
      newSectionConfig[importSection] = {
        ...newSectionConfig[importSection],
        enabled: true,
      };
    }

    const section = (newContent as any)[importSection] || [];

    if (importSection === "skills") {
      const selectedSkills = userSkills.filter((skill) =>
        selectedItems.skills.includes(skill.id)
      );
      const existingSkillIds = new Set(
        section.map((s: any) => s.id || s.name || s.skillName)
      );
      const newSkills = selectedSkills
        .filter(
          (skill) =>
            !existingSkillIds.has(skill.id) &&
            !existingSkillIds.has(skill.skillName)
        )
        .map((skill) => ({
          id: skill.id,
          name: skill.skillName,
          category: skill.category || "Technical",
          proficiency: skill.proficiency || "",
        }));
      (newContent as any)[importSection] = [...section, ...newSkills];
    } else if (importSection === "certifications") {
      const selectedCerts = userCertifications.filter((cert) =>
        selectedItems.certifications.includes(cert.id)
      );
      const existingCertIds = new Set(section.map((c: any) => c.id));
      const newCerts = selectedCerts
        .filter((cert) => !existingCertIds.has(cert.id))
        .map((cert) => ({
          id: cert.id,
          name: cert.name,
          organization: cert.org_name,
          dateEarned: cert.date_earned,
          expirationDate: cert.expiration_date || undefined,
        }));
      (newContent as any)[importSection] = [...section, ...newCerts];
    } else if (importSection === "experience") {
      const selectedJobs = userJobs.filter((job) =>
        selectedItems.jobs.includes(job.id)
      );
      const existingJobIds = new Set(section.map((j: any) => j.id));
      const newJobs = selectedJobs
        .filter((job) => !existingJobIds.has(job.id))
        .map((job) => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location || undefined,
          startDate: job.startDate || "",
          endDate: job.endDate || undefined,
          isCurrent: job.isCurrent || false,
          description: job.description
            ? typeof job.description === "string"
              ? job.description.split("\n").filter((l) => l.trim())
              : []
            : [],
        }));
      (newContent as any)[importSection] = [...section, ...newJobs];
    } else if (importSection === "education") {
      const selectedEdu = userEducation.filter((edu) =>
        selectedItems.education.includes(edu.id)
      );
      const existingEduIds = new Set(section.map((e: any) => e.id));
      const newEdu = selectedEdu
        .filter((edu) => !existingEduIds.has(edu.id))
        .map((edu) => ({
          id: edu.id,
          degree: edu.degreeType,
          school: edu.school,
          field: edu.field || undefined,
          startDate: edu.startDate || undefined,
          endDate: edu.endDate || undefined,
          gpa: edu.gpa || undefined,
          honors: edu.honors || undefined,
        }));
      (newContent as any)[importSection] = [...section, ...newEdu];
    } else if (importSection === "projects") {
      const selectedProjs = userProjects.filter((proj) =>
        selectedItems.projects.includes(proj.id)
      );
      const existingProjIds = new Set(section.map((p: any) => p.id));
      const newProjs = selectedProjs
        .filter((proj) => !existingProjIds.has(proj.id))
        .map((proj) => ({
          id: proj.id,
          name: proj.name,
          description: proj.description || "",
          technologies: proj.technologies
            ? proj.technologies
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t)
            : undefined,
          link: proj.link || undefined,
        }));
      (newContent as any)[importSection] = [...section, ...newProjs];
    } else if (importSection === "personal" && userProfile) {
      // Import personal info from profile
      newContent.personalInfo = {
        ...newContent.personalInfo,
        firstName: userProfile.first_name || newContent.personalInfo.firstName,
        lastName: userProfile.last_name || newContent.personalInfo.lastName,
        email: userProfile.email || newContent.personalInfo.email,
        phone: userProfile.phone || newContent.personalInfo.phone,
        location:
          userProfile.city && userProfile.state
            ? `${userProfile.city}, ${userProfile.state}`
            : newContent.personalInfo.location,
      };
      if (userProfile.bio && !newContent.summary) {
        newContent.summary = userProfile.bio;
      }
    }

    const updatedResume = {
      ...resume,
      content: newContent,
      sectionConfig: newSectionConfig,
    };
    setResume(updatedResume);

    // Auto-save to backend if resume exists
    if (resumeId && resumeId !== "new" && isValidUUID(resumeId)) {
      setIsAutoSaving(true);
      resumeService
        .updateResume(resumeId, {
          content: newContent,
          sectionConfig: newSectionConfig,
        })
        .then(() => {
          setLastSaved(new Date());
        })
        .catch((err) => {
          console.error("Auto-save failed:", err);
        })
        .finally(() => {
          setTimeout(() => setIsAutoSaving(false), 500);
        });
    }

    setShowImportModal(false);
    setImportSection(null);
    setSelectedItems({
      skills: [],
      certifications: [],
      jobs: [],
      education: [],
      projects: [],
    });
  };

  const toggleItemSelection = (itemId: string, section: string) => {
    setSelectedItems((prev) => {
      const sectionKey = section as keyof typeof prev;
      const current = prev[sectionKey] || [];
      if (current.includes(itemId)) {
        return {
          ...prev,
          [sectionKey]: current.filter((id) => id !== itemId),
        };
      } else {
        return {
          ...prev,
          [sectionKey]: [...current, itemId],
        };
      }
    });
  };

  // Version management functions
  const handleCreateVersion = async () => {
    if (!resumeId || resumeId === "new" || !isValidUUID(resumeId)) {
      showToast("Please save the resume before creating a version", "error");
      return;
    }

    if (!newVersionName.trim()) {
      showToast("Please enter a version name", "error");
      return;
    }

    try {
      const response = await resumeService.createVersion(resumeId, {
        versionName: newVersionName,
        description: newVersionDescription || undefined,
        jobId: newVersionJobId || undefined, // Support jobId for different job types
      });

      if (response.ok && response.data) {
        const newVersion = response.data.resume;
        // Refresh versions list - use parent ID to get all versions
        try {
          const parentId = newVersion.parentResumeId || resumeId;
          const versionsResponse = await resumeService.getVersions(parentId);
          if (versionsResponse.ok && versionsResponse.data) {
            const fetchedVersions =
              (versionsResponse.data as any).resumes ||
              (versionsResponse.data as any).versions ||
              [];
            setVersions(fetchedVersions);
          }
        } catch (err) {
          console.log("Failed to refresh versions:", err);
          // If refresh fails, add new version to existing list
          if (versions.length > 0) {
            setVersions([...versions, newVersion]);
          }
        }
        // Navigate to the new version
        navigate(`${ROUTES.RESUME_BUILDER}?id=${newVersion.id}`);
        setShowVersionModal(false);
        setNewVersionName("");
        setNewVersionDescription("");
        setNewVersionJobId("");
        showToast("Version created successfully!", "success");
      }
    } catch (err: any) {
      console.error("Failed to create version:", err);
      showToast(
        err.message || "Failed to create version. Please try again.",
        "error"
      );
    }
  };

  const handleSwitchVersion = (versionId: string) => {
    navigate(`${ROUTES.RESUME_BUILDER}?id=${versionId}`);
    setShowVersionHistory(false);
    setShowVersionCompare(false);
    setShowVersionControl(false);
  };

  // Mock data for comparison demo
  const getMockResume1 = (): Resume => ({
    id: "mock-1",
    userId: "user1",
    name: "Software Engineer Resume v1",
    description: "Original version",
    templateId: "default-chronological",
    versionNumber: 1,
    isMaster: true,
    parentResumeId: undefined,
    content: {
      personalInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1 (555) 123-4567",
        location: "San Francisco, CA",
        linkedIn: "linkedin.com/in/johndoe",
        portfolio: "johndoe.dev",
      },
      summary:
        "Experienced software engineer with 5+ years of experience building scalable web applications using modern technologies.",
      experience: [
        {
          id: "1",
          title: "Senior Software Engineer",
          company: "Tech Company",
          location: "San Francisco, CA",
          startDate: "2020-01",
          endDate: undefined,
          isCurrent: true,
          description: [
            "Led development of scalable web applications serving 100K+ users",
            "Mentored junior developers and improved team productivity by 30%",
            "Implemented CI/CD pipelines reducing deployment time by 50%",
          ],
        },
        {
          id: "2",
          title: "Software Engineer",
          company: "Startup Inc",
          location: "San Francisco, CA",
          startDate: "2018-06",
          endDate: "2019-12",
          isCurrent: false,
          description: [
            "Developed RESTful APIs using Node.js and Express",
            "Built responsive frontend components with React",
          ],
        },
      ],
      education: [
        {
          id: "1",
          school: "University of California",
          degree: "Bachelor of Science",
          field: "Computer Science",
          startDate: "2014-09",
          endDate: "2018-05",
          gpa: 3.8,
          honors: "Summa Cum Laude",
        },
      ],
      skills: [
        {
          id: "1",
          name: "JavaScript",
          category: "Technical",
          proficiency: "Expert",
        },
        {
          id: "2",
          name: "React",
          category: "Technical",
          proficiency: "Expert",
        },
        {
          id: "3",
          name: "Node.js",
          category: "Technical",
          proficiency: "Advanced",
        },
        {
          id: "4",
          name: "Python",
          category: "Technical",
          proficiency: "Intermediate",
        },
      ],
      projects: [],
      certifications: [],
    },
    sectionConfig: {
      personal: { enabled: true, order: 0 },
      summary: { enabled: true, order: 1 },
      experience: { enabled: true, order: 2 },
      education: { enabled: true, order: 3 },
      skills: { enabled: true, order: 4 },
      projects: { enabled: false, order: 5 },
      certifications: { enabled: false, order: 6 },
    },
    customizations: {
      colors: {
        primary: "#3351FD",
        secondary: "#000000",
        text: "#000000",
        background: "#FFFFFF",
      },
      fonts: { heading: "Inter", body: "Inter" },
      spacing: { section: 24, item: 12 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const getMockResume2 = (): Resume => ({
    id: "mock-2",
    userId: "user1",
    name: "Software Engineer Resume v2",
    description: "Updated version with more experience",
    templateId: "default-chronological",
    versionNumber: 2,
    isMaster: false,
    parentResumeId: "mock-1",
    content: {
      personalInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1 (555) 123-4567",
        location: "San Francisco, CA",
        linkedIn: "linkedin.com/in/johndoe",
        portfolio: "johndoe.dev",
      },
      summary:
        "Senior software engineer with 7+ years of experience building scalable web applications and leading engineering teams. Specialized in full-stack development with expertise in React, Node.js, and cloud infrastructure.",
      experience: [
        {
          id: "1",
          title: "Senior Software Engineer",
          company: "Tech Company",
          location: "San Francisco, CA",
          startDate: "2020-01",
          endDate: undefined,
          isCurrent: true,
          description: [
            "Led development of scalable web applications serving 500K+ users",
            "Mentored team of 5 junior developers and improved team productivity by 40%",
            "Implemented CI/CD pipelines reducing deployment time by 60%",
            "Architected microservices infrastructure handling 1M+ requests/day",
          ],
        },
        {
          id: "2",
          title: "Software Engineer",
          company: "Startup Inc",
          location: "San Francisco, CA",
          startDate: "2018-06",
          endDate: "2019-12",
          isCurrent: false,
          description: [
            "Developed RESTful APIs using Node.js and Express serving 50K+ users",
            "Built responsive frontend components with React and Redux",
            "Optimized database queries reducing response time by 35%",
          ],
        },
        {
          id: "3",
          title: "Junior Developer",
          company: "Web Agency",
          location: "San Francisco, CA",
          startDate: "2017-01",
          endDate: "2018-05",
          isCurrent: false,
          description: [
            "Developed client websites using HTML, CSS, and JavaScript",
            "Collaborated with designers to implement responsive layouts",
          ],
        },
      ],
      education: [
        {
          id: "1",
          school: "University of California",
          degree: "Bachelor of Science",
          field: "Computer Science",
          startDate: "2014-09",
          endDate: "2018-05",
          gpa: 3.8,
          honors: "Summa Cum Laude",
        },
      ],
      skills: [
        {
          id: "1",
          name: "JavaScript",
          category: "Technical",
          proficiency: "Expert",
        },
        {
          id: "2",
          name: "React",
          category: "Technical",
          proficiency: "Expert",
        },
        {
          id: "3",
          name: "Node.js",
          category: "Technical",
          proficiency: "Expert",
        },
        {
          id: "4",
          name: "Python",
          category: "Technical",
          proficiency: "Advanced",
        },
        {
          id: "5",
          name: "AWS",
          category: "Technical",
          proficiency: "Advanced",
        },
        {
          id: "6",
          name: "Docker",
          category: "Technical",
          proficiency: "Advanced",
        },
        {
          id: "7",
          name: "Kubernetes",
          category: "Technical",
          proficiency: "Intermediate",
        },
      ],
      projects: [
        {
          id: "1",
          name: "E-commerce Platform",
          description:
            "Built a full-stack e-commerce platform with React and Node.js",
          technologies: ["React", "Node.js", "MongoDB", "Stripe"],
          link: "https://example.com/project",
        },
      ],
      certifications: [
        {
          id: "1",
          name: "AWS Certified Solutions Architect",
          organization: "Amazon Web Services",
          dateEarned: "2022-03",
          expirationDate: undefined,
        },
      ],
    },
    sectionConfig: {
      personal: { enabled: true, order: 0 },
      summary: { enabled: true, order: 1 },
      experience: { enabled: true, order: 2 },
      education: { enabled: true, order: 3 },
      skills: { enabled: true, order: 4 },
      projects: { enabled: true, order: 5 },
      certifications: { enabled: true, order: 6 },
    },
    customizations: {
      colors: {
        primary: "#2563EB",
        secondary: "#000000",
        text: "#000000",
        background: "#FFFFFF",
      },
      fonts: { heading: "Roboto", body: "Roboto" },
      spacing: { section: 28, item: 14 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleCompareVersions = async (useMock: boolean = false) => {
    if (useMock) {
      // Use mock data for demo
      setLoadingComparison(true);
      setTimeout(() => {
        setResume1Data(getMockResume1());
        setResume2Data(getMockResume2());
        setVersionComparison({
          resume1: {
            id: "mock-1",
            versionName: "Software Engineer Resume v1",
            versionNumber: 1,
            updatedAt: new Date().toISOString(),
          },
          resume2: {
            id: "mock-2",
            versionName: "Software Engineer Resume v2",
            versionNumber: 2,
            updatedAt: new Date().toISOString(),
          },
          hasDifferences: true,
        });
        setShowVersionCompare(true);
        setLoadingComparison(false);
      }, 500);
      return;
    }

    if (!selectedVersion1 || !selectedVersion2) {
      showToast("Please select two versions to compare", "error");
      return;
    }

    if (selectedVersion1 === selectedVersion2) {
      showToast("Please select two different versions", "error");
      return;
    }

    if (!isValidUUID(selectedVersion1) || !isValidUUID(selectedVersion2)) {
      showToast("Invalid version IDs", "error");
      return;
    }

    try {
      setLoadingComparison(true);

      // Fetch both resumes for side-by-side comparison
      const [resume1Res, resume2Res, comparisonRes] = await Promise.allSettled([
        resumeService.getResume(selectedVersion1),
        resumeService.getResume(selectedVersion2),
        resumeService.compareVersions(selectedVersion1, selectedVersion2),
      ]);

      if (resume1Res.status === "fulfilled" && resume1Res.value.ok) {
        setResume1Data(resume1Res.value.data?.resume || null);
      }

      if (resume2Res.status === "fulfilled" && resume2Res.value.ok) {
        setResume2Data(resume2Res.value.data?.resume || null);
      }

      if (comparisonRes.status === "fulfilled" && comparisonRes.value.ok) {
        setVersionComparison(comparisonRes.value.data?.comparison || null);
      }

      setShowVersionCompare(true);
    } catch (err: any) {
      console.error("Failed to compare versions:", err);
      // Fallback to mock data if API fails
      setResume1Data(getMockResume1());
      setResume2Data(getMockResume2());
      setVersionComparison({
        resume1: {
          id: "mock-1",
          versionName: "Software Engineer Resume v1",
          versionNumber: 1,
          updatedAt: new Date().toISOString(),
        },
        resume2: {
          id: "mock-2",
          versionName: "Software Engineer Resume v2",
          versionNumber: 2,
          updatedAt: new Date().toISOString(),
        },
        hasDifferences: true,
      });
      setShowVersionCompare(true);
    } finally {
      setLoadingComparison(false);
    }
  };

  const handleUpdateResume = async (resumeIdToUpdate: string, updates: { name: string }) => {
    if (!isValidUUID(resumeIdToUpdate)) {
      showToast("Invalid resume ID", "error");
      return;
    }

    try {
      const response = await resumeService.updateResume(resumeIdToUpdate, {
        name: updates.name,
      });

      if (response.ok && response.data?.resume) {
        const updatedResume = response.data.resume;
        // Update the current resume state
        if (resume && resume.id === resumeIdToUpdate) {
          setResume({ ...resume, name: updatedResume.name || updatedResume.versionName });
        }
        // Refresh versions if needed
        const parentId = resume?.parentResumeId || resumeId;
        if (parentId && isValidUUID(parentId)) {
          const versionsRes = await resumeService.getVersions(parentId);
          if (versionsRes.ok) {
            setVersions(versionsRes.data?.resumes || []);
          }
        }
        showToast("Resume name updated successfully", "success");
      } else {
        showToast(response.error?.message || "Failed to update resume name", "error");
      }
    } catch (error: any) {
      console.error("Error updating resume name:", error);
      showToast(error.message || "Failed to update resume name", "error");
    }
  };

  const handleSetMasterVersion = async (versionId: string) => {
    if (!isValidUUID(versionId)) {
      showToast("Invalid version ID", "error");
      return;
    }

    try {
      const response = await resumeService.setMasterVersion(versionId);
      if (response.ok) {
        showToast("Master version updated successfully", "success");

        // If we set a different version as master, refresh the current resume
        if (versionId !== resumeId) {
          // Refresh versions
          const parentId = resume?.parentResumeId || resumeId;
          if (parentId && isValidUUID(parentId)) {
            const versionsRes = await resumeService.getVersions(parentId);
            if (versionsRes.ok) {
              setVersions(versionsRes.data?.resumes || []);
            }
          }

          // Update current resume if it's the one that was set as master
          if (resume && resume.id === versionId) {
            const updatedResume = { ...resume, isMaster: true };
            setResume(updatedResume);
          } else if (resume && resume.isMaster && versionId !== resume.id) {
            // If current resume was master and we set a different one, update it
            const updatedResume = { ...resume, isMaster: false };
            setResume(updatedResume);
          }
        } else {
          // If setting current version as master, just update it
          if (resume) {
            const updatedResume = { ...resume, isMaster: true };
            setResume(updatedResume);
          }

          // Refresh versions list
          const parentId = resume?.parentResumeId || resumeId;
          if (parentId && isValidUUID(parentId)) {
            const versionsRes = await resumeService.getVersions(parentId);
            if (versionsRes.ok) {
              setVersions(versionsRes.data?.resumes || []);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to set master version:", err);
      showToast(
        err.message || "Failed to set master version. Please try again.",
        "error"
      );
    }
  };

  // Fetch section presets
  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const response = await resumeService.getSectionPresets();
        if (response.ok && response.data) {
          setSectionPresets(response.data.presets);
        }
      } catch (err) {
        // Use default presets if API fails
        setSectionPresets([
          { id: "default", name: "Default", sectionConfig: {} },
          {
            id: "minimal",
            name: "Minimal",
            sectionConfig: {
              projects: { enabled: false },
              certifications: { enabled: false },
            },
          },
          { id: "comprehensive", name: "Comprehensive", sectionConfig: {} },
        ]);
      }
    };
    fetchPresets();
  }, []);

  // Get section completion status
  const getSectionCompletion = (
    sectionId: string
  ): { completed: boolean; percentage: number } => {
    if (!resume) return { completed: false, percentage: 0 };

    const content = resume.content;
    switch (sectionId) {
      case "personal":
        const personal = content.personalInfo;
        const personalFields = [
          personal.firstName,
          personal.lastName,
          personal.email,
          personal.phone,
          personal.location,
        ];
        const filledPersonal = personalFields.filter(
          (f) => f && f.trim()
        ).length;
        return {
          completed: filledPersonal >= 3,
          percentage: (filledPersonal / personalFields.length) * 100,
        };

      case "summary":
        return {
          completed: !!content.summary && content.summary.trim().length > 50,
          percentage: content.summary
            ? Math.min(100, (content.summary.length / 200) * 100)
            : 0,
        };

      case "experience":
        const expCount = Array.isArray(content.experience)
          ? content.experience.length
          : 0;
        return {
          completed: expCount > 0,
          percentage: Math.min(100, (expCount / 3) * 100),
        };

      case "education":
        const eduCount = Array.isArray(content.education)
          ? content.education.length
          : 0;
        return {
          completed: eduCount > 0,
          percentage: Math.min(100, (eduCount / 2) * 100),
        };

      case "skills":
        const skillCount = Array.isArray(content.skills)
          ? content.skills.length
          : 0;
        return {
          completed: skillCount >= 5,
          percentage: Math.min(100, (skillCount / 10) * 100),
        };

      case "projects":
        const projCount = Array.isArray(content.projects)
          ? content.projects.length
          : 0;
        return {
          completed: projCount > 0,
          percentage: Math.min(100, (projCount / 3) * 100),
        };

      case "certifications":
        const certCount = Array.isArray(content.certifications)
          ? content.certifications.length
          : 0;
        return {
          completed: certCount > 0,
          percentage: Math.min(100, (certCount / 3) * 100),
        };

      default:
        return { completed: false, percentage: 0 };
    }
  };

  // Get sections filtered by job type
  const getJobTypeSections = (): string[] => {
    const jobTypeMap: Record<string, string[]> = {
      tech: [
        "personal",
        "summary",
        "experience",
        "education",
        "skills",
        "projects",
        "certifications",
      ],
      creative: [
        "personal",
        "summary",
        "experience",
        "education",
        "skills",
        "projects",
      ],
      executive: [
        "personal",
        "summary",
        "experience",
        "education",
        "skills",
        "certifications",
      ],
      academic: [
        "personal",
        "summary",
        "education",
        "experience",
        "skills",
        "projects",
        "certifications",
      ],
      all: sections.map((s) => s.id),
    };
    return jobTypeMap[jobType] || jobTypeMap.all;
  };

  // Get all sections filtered by job type (for sidebar display)
  const getSidebarSections = () => {
    if (!resume) return [];

    // Filter by job type first
    const jobTypeFiltered = sections.filter((section) => {
      if (jobType === "all") return true;
      return getJobTypeSections().includes(section.id);
    });

    // Sort by order (default to section index if not set)
    return jobTypeFiltered.sort((a, b) => {
      const orderA =
        resume.sectionConfig?.[a.id]?.order ??
        sections.findIndex((s) => s.id === a.id);
      const orderB =
        resume.sectionConfig?.[b.id]?.order ??
        sections.findIndex((s) => s.id === b.id);
      return orderA - orderB;
    });
  };

  // Get enabled sections only (for document display)
  const getEnabledSections = (resumeData?: Resume | null) => {
    const dataToUse = resumeData || resume;
    if (!dataToUse) return [];

    // Filter by job type first
    const jobTypeFiltered = sections.filter((section) => {
      if (jobType === "all") return true;
      return getJobTypeSections().includes(section.id);
    });

    // Filter sections based on enabled state (default to true if not set)
    const enabled = jobTypeFiltered.filter((section) => {
      const config = dataToUse.sectionConfig?.[section.id];
      return config?.enabled !== false; // Default to enabled if not specified
    });

    // Sort by order (default to section index if not set)
    return enabled.sort((a, b) => {
      const orderA =
        dataToUse.sectionConfig?.[a.id]?.order ??
        sections.findIndex((s) => s.id === a.id);
      const orderB =
        dataToUse.sectionConfig?.[b.id]?.order ??
        sections.findIndex((s) => s.id === b.id);
      return orderA - orderB;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-[#3351FD]"
          />
          <p className="mt-4 text-gray-600">Loading resume builder...</p>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:alert-line"
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
          />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Resume not found
          </h3>
          <button
            onClick={() => navigate(ROUTES.RESUMES)}
            className="mt-4 px-6 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors"
          >
            Back to Resumes
          </button>
        </div>
      </div>
    );
  }

  const enabledSections = getEnabledSections();

  // Confirmation modals
  const DeleteItemModal = () =>
    showDeleteItemConfirm ? (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Item</h2>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this item? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteItemConfirm(null)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteItem}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const ResetFormattingModal = () =>
    showResetFormattingConfirm ? (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Reset Formatting
          </h2>
          <p className="text-gray-600 mb-6">
            Are you sure you want to reset all formatting to default? This will
            remove all custom colors, fonts, spacing, and section formatting.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowResetFormattingConfirm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={confirmResetFormatting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    ) : null;

  // Ensure customizations are always fully initialized
  const ensureCustomizations = () => {
    if (!resume) return null;
    const defaultCustomizations = {
      colors: {
        primary: "#3351FD",
        secondary: "#000000",
        text: "#000000",
        background: "#FFFFFF",
      },
      fonts: {
        heading: "Inter",
        body: "Inter",
      },
      spacing: {
        section: 24,
        item: 12,
      },
      alignment: "left",
      headerStyle: "centered",
    };
    return {
      ...defaultCustomizations,
      ...resume.customizations,
      colors: {
        ...defaultCustomizations.colors,
        ...resume.customizations?.colors,
      },
      fonts: {
        ...defaultCustomizations.fonts,
        ...resume.customizations?.fonts,
      },
      spacing: {
        ...defaultCustomizations.spacing,
        ...resume.customizations?.spacing,
      },
    };
  };

  const currentCustomizations = ensureCustomizations();

  // Helper function to auto-save customizations
  const autoSaveCustomizations = (newCustomizations: any) => {
    if (!resume) return;

    // Update local state
    setResume({
      ...resume,
      customizations: newCustomizations,
    });

    // Auto-save to backend if resume exists
    if (resumeId && resumeId !== "new" && isValidUUID(resumeId)) {
      setIsAutoSaving(true);
      resumeService
        .updateResume(resumeId, {
          customizations: newCustomizations,
        })
        .then(() => {
          setLastSaved(new Date());
        })
        .catch((err) => {
          console.error("Auto-save customizations failed:", err);
        })
        .finally(() => {
          setTimeout(() => setIsAutoSaving(false), 500);
        });
    }
  };

  // Default customizations
  const defaultCustomizations = {
    colors: {
      primary: "#3351FD",
      secondary: "#000000",
      text: "#000000",
      background: "#FFFFFF",
    },
    fonts: {
      heading: "Inter",
      body: "Inter",
    },
    spacing: {
      section: 24,
      item: 12,
    },
    alignment: "left",
    headerStyle: "centered",
    sectionFormatting: {},
  };

  // Reset all formatting to defaults
  const handleResetFormatting = () => {
    if (!resume) return;
    setShowResetFormattingConfirm(true);
  };

  const confirmResetFormatting = async () => {
    if (!resume) return;
    setShowResetFormattingConfirm(false);

    try {
      // Reset section formatting
      setSectionFormatting({});

      // Reset customizations to defaults
      const updatedResume = {
        ...resume,
        customizations: defaultCustomizations,
      };
      setResume(updatedResume);

      // Auto-save to backend if resume exists
      if (resumeId && resumeId !== "new") {
        setIsAutoSaving(true);
        resumeService
          .updateResume(resumeId, {
            customizations: defaultCustomizations,
          })
          .then(() => {
            setLastSaved(new Date());
            showToast("Formatting reset to default successfully!", "success");
          })
          .catch((err) => {
            console.error("Auto-save failed:", err);
            showToast("Failed to save reset. Please try again.", "error");
          })
          .finally(() => {
            setTimeout(() => setIsAutoSaving(false), 500);
          });
      } else {
        showToast("Formatting reset to default!", "success");
      }
    } catch (err: any) {
      console.error("Failed to reset formatting:", err);
      showToast("Failed to reset formatting. Please try again.", "error");
    }
  };

  // Get template type from templateData or resume's templateId
  const templateType = templateData?.templateType || 
    (resume?.templateId?.startsWith("default-functional") ? "functional" :
     resume?.templateId?.startsWith("default-hybrid") ? "hybrid" :
     "chronological");
  
  // Use template data if available, otherwise use resume customizations
  const colors = templateData?.colors || currentCustomizations?.colors || {
    primary: "#3351FD",
    secondary: "#000000",
    text: "#000000",
    background: "#FFFFFF",
  };
  const fonts = templateData?.fonts || currentCustomizations?.fonts || {
    heading: "Inter",
    body: "Inter",
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <DeleteItemModal />
      <ResetFormattingModal />
      <ResumeValidationScanner
        isScanning={isValidating}
        progress={validationProgress}
        currentSection={validationCurrentSection}
      />
      <ResumeValidationResults
        results={validationResults}
        isOpen={showValidationResults}
        onClose={() => setShowValidationResults(false)}
      />
      {/* Top Bar */}
      <ResumeTopBar
        resume={resume}
        resumeId={resumeId}
        versions={versions}
        isSaving={isSaving}
        isAutoSaving={isAutoSaving}
        lastSaved={lastSaved}
        exporting={exporting}
        showExportMenu={false}
        showVersionHistory={showVersionHistory}
        showCustomization={showCustomization}
        showValidationPanel={showValidationPanel}
        canUndo={canUndo}
        onNavigateBack={() => navigate(ROUTES.RESUMES)}
        onSave={handleSave}
        onUndo={handleUndo}
        onExport={() => setShowExportModal(true)}
        onToggleExportMenu={() => setShowExportModal(!showExportModal)}
        onToggleVersionHistory={() =>
          setShowVersionHistory(!showVersionHistory)
        }
        onToggleCustomization={() => setShowCustomization(!showCustomization)}
        onToggleValidationPanel={handleValidateResume}
        onShowVersionModal={() => setShowVersionModal(true)}
        onShowImportResumeModal={() => setShowImportResumeModal(true)}
        onSwitchVersion={handleSwitchVersion}
        onSetMasterVersion={handleSetMasterVersion}
        onUpdateResume={handleUpdateResume}
        onUpdateResumeName={(name: string) => {
          if (resume) {
            setResume({ ...resume, name });
          }
        }}
        onShowVersionCompare={() => {
          setSelectedVersion1(resumeId);
          setSelectedVersion2(null);
          setShowVersionCompare(true);
          setShowVersionHistory(false);
        }}
        onShowVersionControl={() => {
          setShowVersionControl(true);
          setShowVersionHistory(false);
        }}
      />

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Main Content */}
      <Fragment>
        <div
          className="flex-1 flex overflow-hidden"
          style={{
            height: "calc(100vh - 64px)",
            maxHeight: "calc(100vh - 64px)",
            minHeight: 0,
          }}
        >
          {/* Left Sidebar - Section Manager (Always Visible) */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              {/* AI Assistant Button - Prominent Feature */}
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className={`w-full flex items-center gap-3 px-4 py-3 mb-4 rounded-lg transition-all font-semibold text-sm shadow-md hover:shadow-lg ${
                  showAIPanel
                    ? "bg-gradient-to-r from-[#3351FD] to-[#5a6ffd] text-white"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                }`}
              >
                <div className="p-1.5 bg-white bg-opacity-20 rounded-lg">
                  <Icon icon="mingcute:ai-fill" className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold">AI Resume Assistant</div>
                  <div className="text-xs opacity-90">
                    {showAIPanel ? "Chat with AI" : "Get AI-powered help"}
                  </div>
                </div>
                {showAIPanel && (
                  <Icon
                    icon="mingcute:close-line"
                    className="w-4 h-4 opacity-80"
                  />
                )}
              </button>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  Sections
                </h2>
                <div className="relative">
                  <button
                    onClick={() => setShowPresetMenu(!showPresetMenu)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Section Presets"
                  >
                    <Icon
                      icon="mingcute:bookmark-line"
                      className="w-4 h-4 text-gray-600"
                    />
                  </button>
                  {showPresetMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="p-2">
                        <div className="text-xs font-semibold text-gray-700 mb-2 px-2">
                          Apply Preset
                        </div>
                        {sectionPresets.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => handleApplyPreset(preset.id)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm text-gray-700"
                          >
                            {preset.name}
                          </button>
                        ))}
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={handleSavePreset}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm text-[#3351FD]"
                        >
                          Save Current as Preset
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhance with AI scanning overlay */}
              {isEnhancingSection && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
                  {/* Animated backdrop with particles */}
                  <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/40 to-black/50 backdrop-blur-md transition-all duration-500">
                    {/* Floating particles */}
                    {[...Array(12)].map((_, i) => {
                      // Use index-based values for stable positioning
                      const left = (i * 7.5 + 5) % 100;
                      const top = (i * 11.3 + 8) % 100;
                      const duration = 3 + (i % 3) * 0.5;
                      const delay = (i * 0.3) % 2;
                      return (
                        <div
                          key={i}
                          className="absolute w-2 h-2 bg-[#3351FD]/30 rounded-full"
                          style={{
                            left: `${left}%`,
                            top: `${top}%`,
                            animation: `float ${duration}s ease-in-out infinite`,
                            animationDelay: `${delay}s`,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Main modal with entrance animation */}
                  <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-white rounded-3xl shadow-2xl p-8 max-w-lg w-full mx-4 pointer-events-auto border border-blue-100/50 animate-in zoom-in-95 duration-300">
                    {/* Glowing border effect */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3351FD]/20 via-purple-500/20 to-[#3351FD]/20 opacity-50 blur-xl -z-10 animate-pulse"></div>

                    {/* Header with animated icon */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3351FD] to-purple-600 flex items-center justify-center shadow-lg animate-pulse">
                          <Icon
                            icon="mingcute:sparkles-line"
                            className="w-6 h-6 text-white animate-spin-slow"
                          />
                        </div>
                        {/* Orbiting dots */}
                        <div className="absolute inset-0 animate-spin-slow">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#3351FD] rounded-full"></div>
                        </div>
                        <div
                          className="absolute inset-0 animate-spin-slow"
                          style={{
                            animationDirection: "reverse",
                            animationDuration: "3s",
                          }}
                        >
                          <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-[#3351FD] to-purple-600 bg-clip-text text-transparent animate-pulse">
                          Enhancing with AI
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {enhancingSectionId &&
                            sections.find((s) => s.id === enhancingSectionId)
                              ?.label}
                        </p>
                      </div>
                    </div>

                    {/* Animated status text */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <div className="flex gap-1">
                          <div
                            className="w-2 h-2 rounded-full bg-[#3351FD] animate-bounce"
                            style={{ animationDelay: "0s" }}
                          ></div>
                          <div
                            className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                          <div
                            className="w-2 h-2 rounded-full bg-[#3351FD] animate-bounce"
                            style={{ animationDelay: "0.4s" }}
                          ></div>
                        </div>
                        <span className="font-medium animate-pulse">
                          Scanning resume section...
                        </span>
                      </div>
                    </div>

                    {/* Enhanced resume preview with multiple scanning effects */}
                    <div className="relative overflow-hidden rounded-xl border-2 border-blue-200/50 bg-gradient-to-br from-blue-50 via-white to-blue-50 shadow-inner">
                      <div className="h-48 relative">
                        {/* Multiple scanning beams */}
                        <div className="absolute inset-0">
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-300/40 to-transparent animate-[scan_2s_ease-in-out_infinite]"></div>
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-300/30 to-transparent animate-[scan_2.5s_ease-in-out_infinite]"></div>
                        </div>

                        {/* Grid pattern overlay */}
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{
                            backgroundImage:
                              "linear-gradient(rgba(51, 81, 253, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(51, 81, 253, 0.1) 1px, transparent 1px)",
                            backgroundSize: "20px 20px",
                          }}
                        ></div>

                        {/* Animated content lines with staggered animations */}
                        <div className="absolute inset-0 p-5 space-y-3">
                          {[...Array(6)].map((_, i) => {
                            // Use index-based values for stable widths
                            const widths = [65, 75, 70, 80, 68, 72];
                            return (
                              <div
                                key={i}
                                className="h-2.5 bg-gradient-to-r from-white/80 via-white/90 to-white/80 rounded-full shadow-sm"
                                style={{
                                  width: `${widths[i]}%`,
                                  animation: `shimmer ${
                                    1.5 + i * 0.2
                                  }s ease-in-out infinite`,
                                  animationDelay: `${i * 0.15}s`,
                                }}
                              />
                            );
                          })}
                        </div>

                        {/* Corner glow effects */}
                        <div className="absolute top-0 left-0 w-20 h-20 bg-[#3351FD]/20 rounded-br-full blur-xl animate-pulse"></div>
                        <div
                          className="absolute bottom-0 right-0 w-20 h-20 bg-purple-500/20 rounded-tl-full blur-xl animate-pulse"
                          style={{ animationDelay: "0.5s" }}
                        ></div>
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          Processing...
                        </span>
                        <span className="text-xs font-medium text-[#3351FD] animate-pulse">
                          Analyzing
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#3351FD] via-purple-500 to-[#3351FD] rounded-full animate-[progress_2s_ease-in-out_infinite] relative">
                          <div className="absolute inset-0 bg-white/30 animate-shimmer-slide"></div>
                        </div>
                      </div>
                    </div>

                    {/* Animated status messages */}
                    <div className="mt-6 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Icon
                          icon="mingcute:check-line"
                          className="w-4 h-4 text-green-500 animate-bounce"
                        />
                        <span className="animate-fade-in">
                          Extracting section content...
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Icon
                          icon="mingcute:loading-line"
                          className="w-4 h-4 text-[#3351FD] animate-spin"
                        />
                        <span
                          className="animate-fade-in"
                          style={{ animationDelay: "0.3s" }}
                        >
                          Generating AI suggestions...
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-[#3351FD] animate-spin"></div>
                        <span
                          className="animate-fade-in"
                          style={{ animationDelay: "0.6s" }}
                        >
                          Optimizing recommendations...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Type Selector */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-700 mb-2 block">
                  Job Type
                </label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="tech">Tech</option>
                  <option value="creative">Creative</option>
                  <option value="executive">Executive</option>
                  <option value="academic">Academic</option>
                </select>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                Toggle sections on/off to customize your resume
              </p>
              <div className="space-y-2">
                {getSidebarSections().map((section) => {
                  const isEnabled =
                    resume.sectionConfig?.[section.id]?.enabled !== false;
                  const isDragging = draggedSection === section.id;
                  const completion = getSectionCompletion(section.id);
                  return (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={() => handleDragStart(section.id)}
                      onDragOver={(e) => handleDragOver(e, section.id)}
                      onDrop={() => handleDrop(section.id)}
                      onDragEnd={handleDragEnd}
                      onDragLeave={() => setDragOverSection(null)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-move ${
                        isDragging
                          ? "opacity-50 bg-blue-50 border-2 border-[#3351FD]"
                          : dragOverSection === section.id &&
                            draggedSection &&
                            draggedSection !== section.id
                          ? "bg-blue-100 border-2 border-blue-400 border-dashed"
                          : "bg-gray-50 hover:bg-gray-100 border border-transparent"
                      }`}
                    >
                      <div title="Drag to reorder">
                        <Icon
                          icon="mingcute:menu-line"
                          className="w-4 h-4 text-gray-400 cursor-move"
                        />
                      </div>
                      <Icon
                        icon={section.icon}
                        className="w-5 h-5 text-gray-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {section.label}
                          </span>
                          {completion.percentage > 0 && (
                            <div className="flex items-center gap-1 ml-2">
                              <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    completion.completed
                                      ? "bg-green-500"
                                      : completion.percentage >= 50
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${completion.percentage}%` }}
                                />
                              </div>
                              {completion.completed && (
                                <Icon
                                  icon="mingcute:check-line"
                                  className="w-3 h-3 text-green-500"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleSection(section.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-[#3351FD] bg-gray-100 border-gray-300 rounded focus:ring-[#3351FD] focus:ring-2 cursor-pointer flex-shrink-0"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Your Data Section - Shows available data from database */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowYourData(!showYourData)}
                  className="w-full flex items-center justify-between mb-3"
                >
                  <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                    <Icon
                      icon="mingcute:database-line"
                      className="w-4 h-4 text-green-600"
                    />
                    Your Data
                  </h3>
                  <Icon
                    icon={
                      showYourData ? "mingcute:up-line" : "mingcute:down-line"
                    }
                    className="w-4 h-4 text-gray-500"
                  />
                </button>
                {showYourData && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-600 mb-3">
                      Import your saved information directly into your resume
                    </p>

                    {/* Skills */}
                    {userSkills.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon
                              icon="mingcute:code-line"
                              className="w-4 h-4 text-green-600"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              Skills
                            </span>
                            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                              {userSkills.length}
                            </span>
                          </div>
                          <button
                            onClick={() => handleImportFromDatabase("skills")}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                          >
                            <Icon
                              icon="mingcute:add-line"
                              className="w-3 h-3"
                            />
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {userSkills.slice(0, 5).map((skill) => (
                            <span
                              key={skill.id}
                              className="text-xs px-2 py-0.5 bg-white border border-green-200 rounded text-gray-700"
                            >
                              {skill.skillName}
                            </span>
                          ))}
                          {userSkills.length > 5 && (
                            <span className="text-xs px-2 py-0.5 text-gray-500">
                              +{userSkills.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Experience/Jobs */}
                    {userJobs.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon
                              icon="mingcute:briefcase-line"
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              Experience
                            </span>
                            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                              {userJobs.length}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              handleImportFromDatabase("experience")
                            }
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                          >
                            <Icon
                              icon="mingcute:add-line"
                              className="w-3 h-3"
                            />
                            Add
                          </button>
                        </div>
                        <div className="space-y-1 mt-2">
                          {userJobs.slice(0, 3).map((job) => (
                            <div
                              key={job.id}
                              className="text-xs text-gray-700 bg-white border border-blue-200 rounded p-2"
                            >
                              <div className="font-medium">{job.title}</div>
                              <div className="text-gray-500">{job.company}</div>
                            </div>
                          ))}
                          {userJobs.length > 3 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              +{userJobs.length - 3} more positions
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {userEducation.length > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon
                              icon="mingcute:graduation-line"
                              className="w-4 h-4 text-purple-600"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              Education
                            </span>
                            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                              {userEducation.length}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              handleImportFromDatabase("education")
                            }
                            className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-1"
                          >
                            <Icon
                              icon="mingcute:add-line"
                              className="w-3 h-3"
                            />
                            Add
                          </button>
                        </div>
                        <div className="space-y-1 mt-2">
                          {userEducation.slice(0, 3).map((edu) => (
                            <div
                              key={edu.id}
                              className="text-xs text-gray-700 bg-white border border-purple-200 rounded p-2"
                            >
                              <div className="font-medium">
                                {edu.degreeType}
                              </div>
                              <div className="text-gray-500">{edu.school}</div>
                            </div>
                          ))}
                          {userEducation.length > 3 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              +{userEducation.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {userProjects.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon
                              icon="mingcute:folder-line"
                              className="w-4 h-4 text-orange-600"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              Projects
                            </span>
                            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                              {userProjects.length}
                            </span>
                          </div>
                          <button
                            onClick={() => handleImportFromDatabase("projects")}
                            className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors flex items-center gap-1"
                          >
                            <Icon
                              icon="mingcute:add-line"
                              className="w-3 h-3"
                            />
                            Add
                          </button>
                        </div>
                        <div className="space-y-1 mt-2">
                          {userProjects.slice(0, 3).map((proj) => (
                            <div
                              key={proj.id}
                              className="text-xs text-gray-700 bg-white border border-orange-200 rounded p-2"
                            >
                              <div className="font-medium">{proj.name}</div>
                              {proj.description && (
                                <div className="text-gray-500 truncate">
                                  {proj.description.substring(0, 40)}...
                                </div>
                              )}
                            </div>
                          ))}
                          {userProjects.length > 3 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              +{userProjects.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {userCertifications.length > 0 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon
                              icon="mingcute:certificate-line"
                              className="w-4 h-4 text-indigo-600"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              Certifications
                            </span>
                            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                              {userCertifications.length}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              handleImportFromDatabase("certifications")
                            }
                            className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center gap-1"
                          >
                            <Icon
                              icon="mingcute:add-line"
                              className="w-3 h-3"
                            />
                            Add
                          </button>
                        </div>
                        <div className="space-y-1 mt-2">
                          {userCertifications.slice(0, 3).map((cert) => (
                            <div
                              key={cert.id}
                              className="text-xs text-gray-700 bg-white border border-indigo-200 rounded p-2"
                            >
                              <div className="font-medium">{cert.name}</div>
                              <div className="text-gray-500">
                                {cert.org_name}
                              </div>
                            </div>
                          ))}
                          {userCertifications.length > 3 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              +{userCertifications.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Profile Info */}
                    {userProfile && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon
                              icon="mingcute:user-line"
                              className="w-4 h-4 text-gray-600"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              Profile Info
                            </span>
                          </div>
                          <button
                            onClick={() => handleImportFromDatabase("personal")}
                            className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors flex items-center gap-1"
                          >
                            <Icon
                              icon="mingcute:add-line"
                              className="w-3 h-3"
                            />
                            Add
                          </button>
                        </div>
                        <div className="text-xs text-gray-700 mt-2">
                          <div className="font-medium">
                            {userProfile.first_name} {userProfile.last_name}
                          </div>
                          <div className="text-gray-500">
                            {userProfile.email}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {userSkills.length === 0 &&
                      userJobs.length === 0 &&
                      userEducation.length === 0 &&
                      userProjects.length === 0 &&
                      userCertifications.length === 0 &&
                      !userProfile && (
                        <div className="text-center py-4 text-gray-500 text-xs">
                          <Icon
                            icon="mingcute:database-line"
                            className="w-8 h-8 mx-auto mb-2 text-gray-400"
                          />
                          <p>No data found in your profile</p>
                          <p className="mt-1 text-gray-400">
                            Add information in your dashboard to import it here
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center - Resume Document */}
          <div className="flex-1 overflow-y-auto bg-gray-100 p-8 transition-all duration-300">
            {/* Preview Banner */}
            {previewResume && (
              <div className="max-w-4xl mx-auto mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon
                      icon="mingcute:eye-line"
                      className="w-5 h-5 text-yellow-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-yellow-900">
                        Preview Mode
                      </p>
                      <p className="text-xs text-yellow-700">
                        You're viewing preview changes. They won't be saved
                        until you click "Apply Changes" in the AI chat.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div
              id="resume-export-target"
              className="max-w-4xl mx-auto bg-white shadow-lg p-12 print:shadow-none print:p-8"
              style={{
                fontFamily: fonts.body,
                backgroundColor: colors.background,
              }}
            >
              {/* Render sections dynamically based on order */}
              {(previewResume
                ? getEnabledSections(previewResume)
                : enabledSections
              ).map((section) => {
                const sectionId = section.id;
                const displayResume = previewResume || resume;
                if (!displayResume) return null;

                // Personal Info Section
                if (sectionId === "personal") {
                  return (
                    <div
                      key={sectionId}
                      draggable
                      onDragStart={() => handleDocumentDragStart("personal")}
                      onDragOver={(e) => handleDocumentDragOver(e, "personal")}
                      onDrop={() => handleDocumentDrop("personal")}
                      onDragEnd={handleDocumentDragEnd}
                      onDragLeave={() => setDragOverSection(null)}
                      className={`relative group transition-all ${
                        draggedDocumentSection === "personal"
                          ? "opacity-50 border-2 border-dashed border-[#3351FD] rounded-lg p-2"
                          : dragOverSection === "personal" &&
                            draggedDocumentSection &&
                            draggedDocumentSection !== "personal"
                          ? "border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg p-2"
                          : "hover:border-2 hover:border-dashed hover:border-gray-300 rounded-lg p-2"
                      }`}
                      style={{
                        ...getSectionStyle("personal"),
                        marginBottom:
                          getSectionFormatting("personal").marginBottom ||
                          `${
                            displayResume.customizations?.spacing?.section || 24
                          }px`,
                        marginTop:
                          getSectionFormatting("personal").marginTop ||
                          undefined,
                      }}
                      onDoubleClick={() => setEditingSection("personal")}
                    >
                      <div
                        className={`border-b pb-6 mb-6 ${
                          templateType === "functional"
                            ? "text-left"
                            : displayResume.customizations?.headerStyle === "right"
                            ? "text-right"
                            : displayResume.customizations?.headerStyle === "left"
                            ? "text-left"
                            : "text-center" // Default to centered
                        }`}
                        style={{
                          borderColor: colors.primary,
                          borderWidth: templateType === "hybrid" ? "3px" : "2px",
                          ...(getSectionFormatting("personal").textAlign && {
                            textAlign: getSectionFormatting("personal")
                              .textAlign as any,
                          }),
                          ...(getSectionFormatting("personal").color && {
                            color: getSectionFormatting("personal").color,
                          }),
                          ...(getSectionFormatting("personal").fontSize && {
                            fontSize: getSectionFormatting("personal").fontSize,
                          }),
                          ...(getSectionFormatting("personal").fontWeight && {
                            fontWeight:
                              getSectionFormatting("personal").fontWeight,
                          }),
                        }}
                      >
                        {editingSection === "personal" ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <input
                                type="text"
                                value={resume.content.personalInfo.firstName}
                                onChange={(e) =>
                                  updateContent("personal", {
                                    firstName: e.target.value,
                                  })
                                }
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="First Name"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={resume.content.personalInfo.lastName}
                                onChange={(e) =>
                                  updateContent("personal", {
                                    lastName: e.target.value,
                                  })
                                }
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="Last Name"
                              />
                            </div>
                            <input
                              type="email"
                              value={resume.content.personalInfo.email}
                              onChange={(e) =>
                                updateContent("personal", {
                                  email: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                              placeholder="Email"
                            />
                            <input
                              type="tel"
                              value={resume.content.personalInfo.phone}
                              onChange={(e) =>
                                updateContent("personal", {
                                  phone: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                              placeholder="Phone"
                            />
                            <input
                              type="text"
                              value={resume.content.personalInfo.location}
                              onChange={(e) =>
                                updateContent("personal", {
                                  location: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                              placeholder="Location"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setEditingSection(null);
                              }}
                              className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        ) : (
                          <>
                            <h1
                              className={`font-bold mb-2 ${
                                templateType === "functional" ? "text-2xl" : "text-4xl"
                              }`}
                              style={{
                                color: colors.primary,
                                fontFamily: fonts.heading,
                                fontSize: templateType === "functional" 
                                  ? (fonts.size?.heading || "22px")
                                  : (fonts.size?.heading || "24px"),
                              }}
                            >
                              {displayResume.content.personalInfo.firstName}{" "}
                              {displayResume.content.personalInfo.lastName}
                            </h1>
                            {templateType === "hybrid" && displayResume.content.personalInfo.title && (
                              <div
                                className="text-sm font-medium mb-1"
                                style={{
                                  color: colors.secondary,
                                  fontSize: fonts.size?.body || "12px",
                                }}
                              >
                                {displayResume.content.personalInfo.title}
                              </div>
                            )}
                            <div
                              className={`flex items-center gap-2 mt-3 flex-wrap ${
                                templateType === "functional"
                                  ? "justify-start text-xs"
                                  : displayResume.customizations?.headerStyle === "right"
                                  ? "justify-end"
                                  : displayResume.customizations?.headerStyle === "left"
                                  ? "justify-start"
                                  : "justify-center"
                              }`}
                              style={{ 
                                color: colors.secondary,
                                fontSize: templateType === "functional" ? "10px" : "12px",
                              }}
                            >
                              {displayResume.content.personalInfo.email && (
                                <span>
                                  {displayResume.content.personalInfo.email}
                                </span>
                              )}
                              {displayResume.content.personalInfo.phone && (
                                <span>
                                  • {displayResume.content.personalInfo.phone}
                                </span>
                              )}
                              {displayResume.content.personalInfo.location && (
                                <span>
                                  •{" "}
                                  {displayResume.content.personalInfo.location}
                                </span>
                              )}
                              {displayResume.content.personalInfo.linkedIn && (
                                <span>
                                  •{" "}
                                  {displayResume.content.personalInfo.linkedIn}
                                </span>
                              )}
                              {displayResume.content.personalInfo.portfolio && (
                                <span>
                                  •{" "}
                                  {displayResume.content.personalInfo.portfolio}
                                </span>
                              )}
                            </div>
                            <div className="absolute top-0 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {userProfile && (
                                <button
                                  className="p-2 hover:bg-gray-100 rounded-lg"
                                  onClick={() =>
                                    handleImportFromDatabase("personal")
                                  }
                                  title="Import from Profile"
                                >
                                  <Icon
                                    icon="mingcute:download-line"
                                    className="w-4 h-4 text-green-600"
                                  />
                                </button>
                              )}
                              <button
                                className="p-2 hover:bg-gray-100 rounded-lg"
                                onClick={() => {
                                  setShowCustomization(true);
                                  setSelectedSectionForFormatting("personal");
                                }}
                                title="Customize this section"
                              >
                                <Icon
                                  icon="mingcute:settings-3-line"
                                  className="w-4 h-4 text-purple-600"
                                />
                              </button>
                              <button
                                className="p-2 hover:bg-gray-100 rounded-lg"
                                onClick={() =>
                                  handleEnhanceSectionWithAI("personal")
                                }
                                title="Enhance with AI"
                              >
                                <Icon
                                  icon="mingcute:magic-1-line"
                                  className="w-4 h-4 text-[#3351FD]"
                                />
                              </button>
                              <button
                                className="p-2 hover:bg-gray-100 rounded-lg"
                                onClick={() => setEditingSection("personal")}
                                title="Edit"
                              >
                                <Icon
                                  icon="mingcute:edit-line"
                                  className="w-4 h-4 text-gray-600"
                                />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }

                // Summary Section
                if (sectionId === "summary" && displayResume.content.summary) {
                  return (
                    <div
                      key={sectionId}
                      draggable
                      onDragStart={() => handleDocumentDragStart("summary")}
                      onDragOver={(e) => handleDocumentDragOver(e, "summary")}
                      onDrop={() => handleDocumentDrop("summary")}
                      onDragEnd={handleDocumentDragEnd}
                      onDragLeave={() => setDragOverSection(null)}
                      className={`relative group transition-all ${
                        draggedDocumentSection === "summary"
                          ? "opacity-50 border-2 border-dashed border-[#3351FD] rounded-lg p-2"
                          : dragOverSection === "summary" &&
                            draggedDocumentSection &&
                            draggedDocumentSection !== "summary"
                          ? "border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg p-2"
                          : "hover:border-2 hover:border-dashed hover:border-gray-300 rounded-lg p-2"
                      } ${previewResume ? "ring-2 ring-yellow-400" : ""}`}
                      style={{
                        ...getSectionStyle("summary"),
                        marginBottom:
                          getSectionFormatting("summary").marginBottom ||
                          `${
                            displayResume.customizations?.spacing?.section || 24
                          }px`,
                        marginTop:
                          getSectionFormatting("summary").marginTop ||
                          undefined,
                      }}
                      onDoubleClick={() => setEditingSection("summary")}
                    >
                      {editingSection === "summary" ? (
                        <div>
                          <textarea
                            value={displayResume.content.summary}
                            onChange={(e) =>
                              updateContent("summary", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent min-h-[100px]"
                            placeholder="Professional summary"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setEditingSection(null);
                            }}
                            className="mt-2 px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            ...(getSectionFormatting("summary").textAlign && {
                              textAlign: getSectionFormatting("summary")
                                .textAlign as any,
                            }),
                            ...(getSectionFormatting("summary").color && {
                              color: getSectionFormatting("summary").color,
                            }),
                            ...(getSectionFormatting("summary").fontSize && {
                              fontSize:
                                getSectionFormatting("summary").fontSize,
                            }),
                            ...(getSectionFormatting("summary").fontWeight && {
                              fontWeight:
                                getSectionFormatting("summary").fontWeight,
                            }),
                            ...(getSectionFormatting("summary")
                              .backgroundColor && {
                              backgroundColor:
                                getSectionFormatting("summary").backgroundColor,
                              padding: "12px",
                              borderRadius: "8px",
                            }),
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h2
                              className={`font-semibold ${
                                templateType === "functional" 
                                  ? "text-lg uppercase tracking-wide" 
                                  : "text-2xl"
                              }`}
                              style={{
                                color:
                                  getSectionFormatting("summary").color ||
                                  colors.primary,
                                fontFamily: fonts.heading,
                                fontSize: templateType === "functional"
                                  ? (fonts.size?.heading ? `calc(${fonts.size.heading} - 2px)` : "18px")
                                  : (fonts.size?.heading ? `calc(${fonts.size.heading} - 4px)` : "20px"),
                                textTransform: templateType === "functional" ? "uppercase" : "none",
                                letterSpacing: templateType === "functional" ? "0.5px" : "normal",
                                textAlign: templateType === "functional" ? "left" : "left",
                              }}
                            >
                              {templateType === "functional" ? "Professional Summary" : "Summary"}
                            </h2>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setShowCustomization(true);
                                  setSelectedSectionForFormatting("summary");
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                                title="Customize this section"
                              >
                                <Icon
                                  icon="mingcute:settings-3-line"
                                  className="w-4 h-4 text-purple-600"
                                />
                              </button>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                                onClick={() =>
                                  handleEnhanceSectionWithAI("summary")
                                }
                                title="Enhance with AI"
                              >
                                <Icon
                                  icon="mingcute:magic-1-line"
                                  className="w-4 h-4 text-[#3351FD]"
                                />
                              </button>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                                onClick={() => setEditingSection("summary")}
                                title="Edit"
                              >
                                <Icon
                                  icon="mingcute:edit-line"
                                  className="w-4 h-4 text-gray-600"
                                />
                              </button>
                            </div>
                          </div>
                          <p
                            className={`leading-relaxed ${
                              templateType === "functional" ? "text-xs text-left" : ""
                            }`}
                            style={{
                              fontSize: templateType === "functional"
                                ? (fonts.size?.body || "11px")
                                : (fonts.size?.body || "12px"),
                              textAlign: templateType === "functional" ? "left" : 
                                (displayResume.customizations?.alignment === "justified" ? "justify" : "left"),
                            }}
                          >
                            {displayResume.content.summary}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                // Experience Section
                if (sectionId === "experience") {
                  return (
                    <div
                      key={sectionId}
                      draggable
                      onDragStart={() => handleDocumentDragStart("experience")}
                      onDragOver={(e) =>
                        handleDocumentDragOver(e, "experience")
                      }
                      onDrop={() => handleDocumentDrop("experience")}
                      onDragEnd={handleDocumentDragEnd}
                      onDragLeave={() => setDragOverSection(null)}
                      className={`relative group transition-all ${
                        draggedDocumentSection === "experience"
                          ? "opacity-50 border-2 border-dashed border-[#3351FD] rounded-lg p-2"
                          : dragOverSection === "experience" &&
                            draggedDocumentSection &&
                            draggedDocumentSection !== "experience"
                          ? "border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg p-2"
                          : "hover:border-2 hover:border-dashed hover:border-gray-300 rounded-lg p-2"
                      }`}
                      style={{
                        ...getSectionStyle("experience"),
                        marginBottom:
                          getSectionFormatting("experience").marginBottom ||
                          `${
                            displayResume.customizations?.spacing?.section || 24
                          }px`,
                        marginTop:
                          getSectionFormatting("experience").marginTop ||
                          undefined,
                      }}
                    >
                      <div
                        style={{
                          ...(getSectionFormatting("experience").textAlign && {
                            textAlign: getSectionFormatting("experience")
                              .textAlign as any,
                          }),
                          ...(getSectionFormatting("experience").color && {
                            color: getSectionFormatting("experience").color,
                          }),
                          ...(getSectionFormatting("experience").fontSize && {
                            fontSize:
                              getSectionFormatting("experience").fontSize,
                          }),
                          ...(getSectionFormatting("experience").fontWeight && {
                            fontWeight:
                              getSectionFormatting("experience").fontWeight,
                          }),
                          ...(getSectionFormatting("experience")
                            .backgroundColor && {
                            backgroundColor:
                              getSectionFormatting("experience")
                                .backgroundColor,
                            padding: "12px",
                            borderRadius: "8px",
                          }),
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h2
                            className={`font-semibold ${
                              templateType === "functional" 
                                ? "text-lg uppercase tracking-wide" 
                                : "text-2xl"
                            }`}
                            style={{
                              color:
                                getSectionFormatting("experience").color ||
                                colors.primary,
                              fontFamily: fonts.heading,
                              fontSize: templateType === "functional"
                                ? (fonts.size?.heading ? `calc(${fonts.size.heading} - 2px)` : "18px")
                                : (fonts.size?.heading ? `calc(${fonts.size.heading} - 4px)` : "20px"),
                              textTransform: templateType === "functional" ? "uppercase" : "none",
                              letterSpacing: templateType === "functional" ? "0.5px" : "normal",
                              textAlign: templateType === "functional" ? "left" : "left",
                            }}
                          >
                            {templateType === "functional" ? "Professional Experience" : "Experience"}
                          </h2>
                          <div className="flex gap-2">
                            {userJobs.length > 0 && (
                              <button
                                onClick={() =>
                                  handleImportFromDatabase("experience")
                                }
                                className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                title="Import from Database"
                              >
                                <Icon
                                  icon="mingcute:download-line"
                                  className="w-4 h-4 inline mr-1"
                                />
                                Import
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setShowCustomization(true);
                                setSelectedSectionForFormatting("experience");
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                              title="Customize this section"
                            >
                              <Icon
                                icon="mingcute:settings-3-line"
                                className="w-4 h-4 text-purple-600"
                              />
                            </button>
                            <button
                              onClick={() =>
                                handleEnhanceSectionWithAI("experience")
                              }
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                              title="Enhance with AI"
                            >
                              <Icon
                                icon="mingcute:magic-1-line"
                                className="w-4 h-4 text-[#3351FD]"
                              />
                            </button>
                            <button
                              onClick={() =>
                                setEditingItem({
                                  section: "experience",
                                  itemId: "new",
                                })
                              }
                              className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-sm bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4]"
                            >
                              <Icon
                                icon="mingcute:add-line"
                                className="w-4 h-4 inline mr-1"
                              />
                              Add
                            </button>
                          </div>
                        </div>
                        {displayResume.content.experience &&
                        displayResume.content.experience.length > 0 ? (
                          <div className="space-y-6">
                            {displayResume.content.experience.map((exp) => (
                              <div
                                key={exp.id}
                                className="border-l-2 pl-4 relative group/item"
                                style={{ borderColor: colors.primary }}
                              >
                                {editingItem?.section === "experience" &&
                                editingItem?.itemId === exp.id ? (
                                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                    <div className="grid grid-cols-2 gap-3">
                                      <input
                                        type="text"
                                        defaultValue={exp.title}
                                        onBlur={(e) =>
                                          updateItem(
                                            "experience",
                                            exp.id,
                                            {
                                              title: e.target.value,
                                            },
                                            false
                                          )
                                        }
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                        placeholder="Job Title"
                                      />
                                      <input
                                        type="text"
                                        defaultValue={exp.company}
                                        onBlur={(e) =>
                                          updateItem(
                                            "experience",
                                            exp.id,
                                            {
                                              company: e.target.value,
                                            },
                                            false
                                          )
                                        }
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                        placeholder="Company"
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      defaultValue={exp.location || ""}
                                      onBlur={(e) =>
                                        updateItem(
                                          "experience",
                                          exp.id,
                                          {
                                            location: e.target.value,
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                      placeholder="Location"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                      <input
                                        type="month"
                                        defaultValue={exp.startDate}
                                        onBlur={(e) =>
                                          updateItem(
                                            "experience",
                                            exp.id,
                                            {
                                              startDate: e.target.value,
                                            },
                                            false
                                          )
                                        }
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                      />
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="month"
                                          defaultValue={exp.endDate || ""}
                                          onBlur={(e) =>
                                            updateItem(
                                              "experience",
                                              exp.id,
                                              {
                                                endDate: e.target.value,
                                                isCurrent: false,
                                              },
                                              false
                                            )
                                          }
                                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                          disabled={exp.isCurrent}
                                        />
                                        <label className="flex items-center gap-2 text-sm">
                                          <input
                                            type="checkbox"
                                            defaultChecked={exp.isCurrent}
                                            onChange={(e) =>
                                              updateItem(
                                                "experience",
                                                exp.id,
                                                {
                                                  isCurrent: e.target.checked,
                                                  endDate: e.target.checked
                                                    ? undefined
                                                    : exp.endDate,
                                                },
                                                false
                                              )
                                            }
                                            className="w-4 h-4"
                                          />
                                          Current
                                        </label>
                                      </div>
                                    </div>
                                    <textarea
                                      defaultValue={
                                        exp.description?.join("\n") || ""
                                      }
                                      onBlur={(e) =>
                                        updateItem(
                                          "experience",
                                          exp.id,
                                          {
                                            description: e.target.value
                                              .split("\n")
                                              .filter((l) => l.trim()),
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent min-h-[100px]"
                                      placeholder="Description (one per line)"
                                    />
                                    <div
                                      className="flex gap-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setEditingItem(null);
                                        }}
                                        className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors relative z-10"
                                      >
                                        Done
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          deleteItem("experience", exp.id);
                                        }}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors relative z-10"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center justify-between mb-1">
                                      <h3 className="text-lg font-semibold text-gray-900">
                                        {exp.title}
                                      </h3>
                                      <span className="text-sm text-gray-600">
                                        {formatDateMonthYear(exp.startDate)} -{" "}
                                        {exp.isCurrent
                                          ? "Present"
                                          : formatDateMonthYear(exp.endDate)}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 font-medium mb-2">
                                      {exp.company}
                                    </p>
                                    {exp.location && (
                                      <p className="text-sm text-gray-600 mb-2">
                                        {exp.location}
                                      </p>
                                    )}
                                    {exp.description &&
                                      exp.description.length > 0 && (
                                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                                          {exp.description.map((desc, idx) => (
                                            <li key={idx}>{desc}</li>
                                          ))}
                                        </ul>
                                      )}
                                    <button
                                      className="absolute top-0 right-0 opacity-0 group-hover/item:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                                      onClick={() =>
                                        setEditingItem({
                                          section: "experience",
                                          itemId: exp.id,
                                        })
                                      }
                                      title="Edit"
                                    >
                                      <Icon
                                        icon="mingcute:edit-line"
                                        className="w-4 h-4 text-gray-600"
                                      />
                                    </button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                            <p className="text-gray-500 text-sm mb-3">
                              No experience entries yet
                            </p>
                            <button
                              onClick={() =>
                                setEditingItem({
                                  section: "experience",
                                  itemId: "new",
                                })
                              }
                              className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors text-sm"
                            >
                              <Icon
                                icon="mingcute:add-line"
                                className="w-4 h-4 inline mr-1"
                              />
                              Add Experience
                            </button>
                          </div>
                        )}
                        {editingItem?.section === "experience" &&
                          editingItem?.itemId === "new" && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  id="new-exp-title"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                  placeholder="Job Title"
                                />
                                <input
                                  type="text"
                                  id="new-exp-company"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                  placeholder="Company"
                                />
                              </div>
                              <input
                                type="text"
                                id="new-exp-location"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="Location"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="month"
                                  id="new-exp-start"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                  placeholder="Start Date"
                                />
                                <div className="flex items-center gap-2">
                                  <input
                                    type="month"
                                    id="new-exp-end"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                    placeholder="End Date"
                                  />
                                  <label className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      id="new-exp-current"
                                      className="w-4 h-4"
                                    />
                                    Current
                                  </label>
                                </div>
                              </div>
                              <textarea
                                id="new-exp-desc"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent min-h-[100px]"
                                placeholder="Description (one per line)"
                              />
                              <div
                                className="flex gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const title = (
                                      document.getElementById(
                                        "new-exp-title"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const company = (
                                      document.getElementById(
                                        "new-exp-company"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const location = (
                                      document.getElementById(
                                        "new-exp-location"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const startDate = (
                                      document.getElementById(
                                        "new-exp-start"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const endDate = (
                                      document.getElementById(
                                        "new-exp-end"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const isCurrent = (
                                      document.getElementById(
                                        "new-exp-current"
                                      ) as HTMLInputElement
                                    )?.checked;
                                    const desc = (
                                      document.getElementById(
                                        "new-exp-desc"
                                      ) as HTMLTextAreaElement
                                    )?.value;
                                    if (title && company && startDate) {
                                      addItem("experience", {
                                        id: `exp-${Date.now()}`,
                                        title,
                                        company,
                                        location: location || undefined,
                                        startDate,
                                        endDate: isCurrent
                                          ? undefined
                                          : endDate || undefined,
                                        isCurrent: isCurrent || false,
                                        description: desc
                                          ? desc
                                              .split("\n")
                                              .filter((l) => l.trim())
                                          : [],
                                      });
                                    }
                                  }}
                                  className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors relative z-10"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setEditingItem(null);
                                  }}
                                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors relative z-10"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  );
                }

                // Education Section
                if (sectionId === "education") {
                  return (
                    <div
                      key={sectionId}
                      draggable
                      onDragStart={() => handleDocumentDragStart("education")}
                      onDragOver={(e) => handleDocumentDragOver(e, "education")}
                      onDrop={() => handleDocumentDrop("education")}
                      onDragEnd={handleDocumentDragEnd}
                      onDragLeave={() => setDragOverSection(null)}
                      className={`relative group transition-all ${
                        draggedDocumentSection === "education"
                          ? "opacity-50 border-2 border-dashed border-[#3351FD] rounded-lg p-2"
                          : dragOverSection === "education" &&
                            draggedDocumentSection &&
                            draggedDocumentSection !== "education"
                          ? "border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg p-2"
                          : "hover:border-2 hover:border-dashed hover:border-gray-300 rounded-lg p-2"
                      }`}
                      style={{
                        ...getSectionStyle("education"),
                        marginBottom:
                          getSectionFormatting("education").marginBottom ||
                          `${
                            displayResume.customizations?.spacing?.section || 24
                          }px`,
                        marginTop:
                          getSectionFormatting("education").marginTop ||
                          undefined,
                      }}
                    >
                      <div
                        style={{
                          ...(getSectionFormatting("education").textAlign && {
                            textAlign: getSectionFormatting("education")
                              .textAlign as any,
                          }),
                          ...(getSectionFormatting("education").color && {
                            color: getSectionFormatting("education").color,
                          }),
                          ...(getSectionFormatting("education").fontSize && {
                            fontSize:
                              getSectionFormatting("education").fontSize,
                          }),
                          ...(getSectionFormatting("education").fontWeight && {
                            fontWeight:
                              getSectionFormatting("education").fontWeight,
                          }),
                          ...(getSectionFormatting("education")
                            .backgroundColor && {
                            backgroundColor:
                              getSectionFormatting("education").backgroundColor,
                            padding: "12px",
                            borderRadius: "8px",
                          }),
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h2
                            className="text-2xl font-semibold"
                            style={{
                              color:
                                getSectionFormatting("education").color ||
                                colors.primary,
                              fontFamily: fonts.heading,
                            }}
                          >
                            Education
                          </h2>
                          <div className="flex gap-2">
                            {userEducation.length > 0 && (
                              <button
                                onClick={() =>
                                  handleImportFromDatabase("education")
                                }
                                className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                title="Import from Database"
                              >
                                <Icon
                                  icon="mingcute:download-line"
                                  className="w-4 h-4 inline mr-1"
                                />
                                Import
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setShowCustomization(true);
                                setSelectedSectionForFormatting("education");
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                              title="Customize this section"
                            >
                              <Icon
                                icon="mingcute:settings-3-line"
                                className="w-4 h-4 text-purple-600"
                              />
                            </button>
                            <button
                              onClick={() =>
                                handleEnhanceSectionWithAI("education")
                              }
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                              title="Enhance with AI"
                            >
                              <Icon
                                icon="mingcute:magic-1-line"
                                className="w-4 h-4 text-[#3351FD]"
                              />
                            </button>
                            <button
                              onClick={() =>
                                setEditingItem({
                                  section: "education",
                                  itemId: "new",
                                })
                              }
                              className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-sm bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4]"
                            >
                              <Icon
                                icon="mingcute:add-line"
                                className="w-4 h-4 inline mr-1"
                              />
                              Add
                            </button>
                          </div>
                        </div>
                        {displayResume.content.education &&
                        displayResume.content.education.length > 0 ? (
                          <div className="space-y-4">
                            {displayResume.content.education.map((edu) => (
                              <div key={edu.id} className="relative group/item">
                                {editingItem?.section === "education" &&
                                editingItem?.itemId === edu.id ? (
                                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                    <input
                                      type="text"
                                      defaultValue={edu.degree}
                                      onBlur={(e) =>
                                        updateItem(
                                          "education",
                                          edu.id,
                                          {
                                            degree: e.target.value,
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                      placeholder="Degree"
                                    />
                                    <input
                                      type="text"
                                      defaultValue={edu.school}
                                      onBlur={(e) =>
                                        updateItem(
                                          "education",
                                          edu.id,
                                          {
                                            school: e.target.value,
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                      placeholder="School"
                                    />
                                    <input
                                      type="text"
                                      defaultValue={edu.field || ""}
                                      onBlur={(e) =>
                                        updateItem(
                                          "education",
                                          edu.id,
                                          {
                                            field: e.target.value || undefined,
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                      placeholder="Field of Study"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                      <input
                                        type="month"
                                        defaultValue={edu.startDate || ""}
                                        onBlur={(e) =>
                                          updateItem(
                                            "education",
                                            edu.id,
                                            {
                                              startDate:
                                                e.target.value || undefined,
                                            },
                                            false
                                          )
                                        }
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                        placeholder="Start Date"
                                      />
                                      <input
                                        type="month"
                                        defaultValue={edu.endDate || ""}
                                        onBlur={(e) =>
                                          updateItem(
                                            "education",
                                            edu.id,
                                            {
                                              endDate:
                                                e.target.value || undefined,
                                            },
                                            false
                                          )
                                        }
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                        placeholder="End Date"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <input
                                        type="number"
                                        step="0.1"
                                        defaultValue={edu.gpa || ""}
                                        onBlur={(e) =>
                                          updateItem(
                                            "education",
                                            edu.id,
                                            {
                                              gpa: e.target.value
                                                ? parseFloat(e.target.value)
                                                : undefined,
                                            },
                                            false
                                          )
                                        }
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                        placeholder="GPA"
                                      />
                                      <input
                                        type="text"
                                        defaultValue={edu.honors || ""}
                                        onBlur={(e) =>
                                          updateItem(
                                            "education",
                                            edu.id,
                                            {
                                              honors:
                                                e.target.value || undefined,
                                            },
                                            false
                                          )
                                        }
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                        placeholder="Honors"
                                      />
                                    </div>
                                    <div
                                      className="flex gap-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setEditingItem(null);
                                        }}
                                        className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors relative z-10"
                                      >
                                        Done
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          deleteItem("education", edu.id);
                                        }}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors relative z-10"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      {edu.degree}
                                    </h3>
                                    <p className="text-gray-700">
                                      {edu.school}
                                    </p>
                                    {edu.field && (
                                      <p className="text-gray-600 text-sm">
                                        {edu.field}
                                      </p>
                                    )}
                                    {edu.endDate && (
                                      <p className="text-sm text-gray-600">
                                        Graduated:{" "}
                                        {formatDateMonthYear(edu.endDate)}
                                      </p>
                                    )}
                                    {edu.gpa && (
                                      <p className="text-sm text-gray-600">
                                        GPA: {edu.gpa}
                                      </p>
                                    )}
                                    {edu.honors && (
                                      <p className="text-sm text-gray-600">
                                        {edu.honors}
                                      </p>
                                    )}
                                    <button
                                      className="absolute top-0 right-0 opacity-0 group-hover/item:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                                      onClick={() =>
                                        setEditingItem({
                                          section: "education",
                                          itemId: edu.id,
                                        })
                                      }
                                      title="Edit"
                                    >
                                      <Icon
                                        icon="mingcute:edit-line"
                                        className="w-4 h-4 text-gray-600"
                                      />
                                    </button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                            <p className="text-gray-500 text-sm mb-3">
                              No education entries yet
                            </p>
                            <button
                              onClick={() =>
                                setEditingItem({
                                  section: "education",
                                  itemId: "new",
                                })
                              }
                              className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors text-sm"
                            >
                              <Icon
                                icon="mingcute:add-line"
                                className="w-4 h-4 inline mr-1"
                              />
                              Add Education
                            </button>
                          </div>
                        )}
                        {editingItem?.section === "education" &&
                          editingItem?.itemId === "new" && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                              <input
                                type="text"
                                id="new-edu-degree"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="Degree"
                              />
                              <input
                                type="text"
                                id="new-edu-school"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="School"
                              />
                              <input
                                type="text"
                                id="new-edu-field"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="Field of Study"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="month"
                                  id="new-edu-start"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                  placeholder="Start Date"
                                />
                                <input
                                  type="month"
                                  id="new-edu-end"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                  placeholder="End Date"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="number"
                                  step="0.1"
                                  id="new-edu-gpa"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                  placeholder="GPA"
                                />
                                <input
                                  type="text"
                                  id="new-edu-honors"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                  placeholder="Honors"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const degree = (
                                      document.getElementById(
                                        "new-edu-degree"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const school = (
                                      document.getElementById(
                                        "new-edu-school"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const field = (
                                      document.getElementById(
                                        "new-edu-field"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const startDate = (
                                      document.getElementById(
                                        "new-edu-start"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const endDate = (
                                      document.getElementById(
                                        "new-edu-end"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const gpa = (
                                      document.getElementById(
                                        "new-edu-gpa"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const honors = (
                                      document.getElementById(
                                        "new-edu-honors"
                                      ) as HTMLInputElement
                                    )?.value;
                                    if (degree && school) {
                                      addItem("education", {
                                        id: `edu-${Date.now()}`,
                                        degree,
                                        school,
                                        field: field || undefined,
                                        startDate: startDate || undefined,
                                        endDate: endDate || undefined,
                                        gpa: gpa ? parseFloat(gpa) : undefined,
                                        honors: honors || undefined,
                                      });
                                    }
                                  }}
                                  className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors relative z-10"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setEditingItem(null);
                                  }}
                                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors relative z-10"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  );
                }

                // Skills Section
                if (sectionId === "skills") {
                  return (
                    <div
                      key={sectionId}
                      draggable
                      onDragStart={() => handleDocumentDragStart("skills")}
                      onDragOver={(e) => handleDocumentDragOver(e, "skills")}
                      onDrop={() => handleDocumentDrop("skills")}
                      onDragEnd={handleDocumentDragEnd}
                      onDragLeave={() => setDragOverSection(null)}
                      className={`relative group transition-all ${
                        draggedDocumentSection === "skills"
                          ? "opacity-50 border-2 border-dashed border-[#3351FD] rounded-lg p-2"
                          : dragOverSection === "skills" &&
                            draggedDocumentSection &&
                            draggedDocumentSection !== "skills"
                          ? "border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg p-2"
                          : "hover:border-2 hover:border-dashed hover:border-gray-300 rounded-lg p-2"
                      }`}
                      style={{
                        ...getSectionStyle("skills"),
                        marginBottom:
                          getSectionFormatting("skills").marginBottom ||
                          `${
                            displayResume.customizations?.spacing?.section || 24
                          }px`,
                        marginTop:
                          getSectionFormatting("skills").marginTop || undefined,
                      }}
                    >
                      <div
                        style={{
                          ...(getSectionFormatting("skills").textAlign && {
                            textAlign: getSectionFormatting("skills")
                              .textAlign as any,
                          }),
                          ...(getSectionFormatting("skills").color && {
                            color: getSectionFormatting("skills").color,
                          }),
                          ...(getSectionFormatting("skills").fontSize && {
                            fontSize: getSectionFormatting("skills").fontSize,
                          }),
                          ...(getSectionFormatting("skills").fontWeight && {
                            fontWeight:
                              getSectionFormatting("skills").fontWeight,
                          }),
                          ...(getSectionFormatting("skills")
                            .backgroundColor && {
                            backgroundColor:
                              getSectionFormatting("skills").backgroundColor,
                            padding: "12px",
                            borderRadius: "8px",
                          }),
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h2
                            className="text-2xl font-semibold"
                            style={{
                              color:
                                getSectionFormatting("skills").color ||
                                colors.primary,
                              fontFamily: fonts.heading,
                            }}
                          >
                            Skills
                          </h2>
                          {editingSection !== "skills" && (
                            <div className="flex gap-2">
                              {userSkills.length > 0 && (
                                <button
                                  onClick={() =>
                                    handleImportFromDatabase("skills")
                                  }
                                  className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                  title="Import from Database"
                                >
                                  <Icon
                                    icon="mingcute:download-line"
                                    className="w-4 h-4 inline mr-1"
                                  />
                                  Import
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setShowCustomization(true);
                                  setSelectedSectionForFormatting("skills");
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                                title="Customize this section"
                              >
                                <Icon
                                  icon="mingcute:settings-3-line"
                                  className="w-4 h-4 text-purple-600"
                                />
                              </button>
                              <button
                                onClick={() =>
                                  handleEnhanceSectionWithAI("skills")
                                }
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                                title="Enhance with AI"
                              >
                                <Icon
                                  icon="mingcute:magic-1-line"
                                  className="w-4 h-4 text-[#3351FD]"
                                />
                              </button>
                              <button
                                onClick={() => setEditingSection("skills")}
                                className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-sm bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4]"
                              >
                                <Icon
                                  icon="mingcute:edit-line"
                                  className="w-4 h-4 inline mr-1"
                                />
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                        {editingSection === "skills" ? (
                          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                            {/* Custom Groups Section */}
                            <div className="mb-4 pb-4 border-b border-gray-300">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Add Skill Group
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  id="new-skill-group"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent text-sm"
                                  placeholder="Group name (e.g., Frontend, Backend, DevOps)"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const input =
                                        e.target as HTMLInputElement;
                                      const groupName = input.value.trim();
                                      if (groupName) {
                                        if (!resume) return;
                                        const currentConfig =
                                          resume.sectionConfig || {};
                                        const skillsConfig =
                                          (currentConfig.skills as any) || {};
                                        const customGroups =
                                          (skillsConfig.customGroups as string[]) ||
                                          [];
                                        if (!customGroups.includes(groupName)) {
                                          const newConfig = {
                                            ...currentConfig,
                                            skills: {
                                              ...skillsConfig,
                                              customGroups: [
                                                ...customGroups,
                                                groupName,
                                              ],
                                            },
                                          };
                                          setResume({
                                            ...resume,
                                            sectionConfig: newConfig,
                                          });
                                          if (
                                            resumeId &&
                                            resumeId !== "new" &&
                                            isValidUUID(resumeId)
                                          ) {
                                            resumeService
                                              .updateResume(resumeId, {
                                                sectionConfig: newConfig,
                                              })
                                              .catch((err) => {
                                                console.error(
                                                  "Failed to save custom group:",
                                                  err
                                                );
                                              });
                                          }
                                        }
                                        input.value = "";
                                      }
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    const input = document.getElementById(
                                      "new-skill-group"
                                    ) as HTMLInputElement;
                                    const groupName = input.value.trim();
                                    if (groupName && resume) {
                                      const currentConfig =
                                        resume.sectionConfig || {};
                                      const skillsConfig =
                                        (currentConfig.skills as any) || {};
                                      const customGroups =
                                        (skillsConfig.customGroups as string[]) ||
                                        [];
                                      if (!customGroups.includes(groupName)) {
                                        const newConfig = {
                                          ...currentConfig,
                                          skills: {
                                            ...skillsConfig,
                                            customGroups: [
                                              ...customGroups,
                                              groupName,
                                            ],
                                          },
                                        };
                                        setResume({
                                          ...resume,
                                          sectionConfig: newConfig,
                                        });
                                        if (
                                          resumeId &&
                                          resumeId !== "new" &&
                                          isValidUUID(resumeId)
                                        ) {
                                          resumeService
                                            .updateResume(resumeId, {
                                              sectionConfig: newConfig,
                                            })
                                            .catch((err) => {
                                              console.error(
                                                "Failed to save custom group:",
                                                err
                                              );
                                            });
                                        }
                                      }
                                      input.value = "";
                                    }
                                  }}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                >
                                  Add Group
                                </button>
                              </div>
                            </div>

                            {/* Skills by Group */}
                            {(() => {
                              const sectionConfig = resume?.sectionConfig || {};
                              const skillsConfig =
                                (sectionConfig.skills as any) || {};
                              const customGroups =
                                (skillsConfig.customGroups as string[]) || [];
                              const allGroups = [
                                "Technical",
                                "Languages",
                                "Soft Skills",
                                "Industry-Specific",
                                ...customGroups,
                              ];

                              // Group skills by their category/group
                              const skillsByGroup = (
                                resume?.content.skills || []
                              ).reduce(
                                (
                                  acc: Record<
                                    string,
                                    typeof resume.content.skills
                                  >,
                                  skill
                                ) => {
                                  const group =
                                    skill.category ||
                                    skill.group ||
                                    "Technical";
                                  if (!acc[group]) {
                                    acc[group] = [];
                                  }
                                  acc[group].push(skill);
                                  return acc;
                                },
                                {}
                              );

                              return (
                                <div className="space-y-4">
                                  {allGroups.map((group) => {
                                    const groupSkills =
                                      skillsByGroup[group] || [];
                                    return (
                                      <div
                                        key={group}
                                        className="border border-gray-200 rounded-lg p-3 bg-white"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <label className="text-sm font-semibold text-gray-700">
                                            {group}
                                          </label>
                                          {customGroups.includes(group) && (
                                            <button
                                              onClick={() => {
                                                if (!resume) return;
                                                const currentConfig =
                                                  resume.sectionConfig || {};
                                                const skillsConfig =
                                                  (currentConfig.skills as any) ||
                                                  {};
                                                const customGroups =
                                                  (skillsConfig.customGroups as string[]) ||
                                                  [];
                                                const newConfig = {
                                                  ...currentConfig,
                                                  skills: {
                                                    ...skillsConfig,
                                                    customGroups:
                                                      customGroups.filter(
                                                        (g) => g !== group
                                                      ),
                                                  },
                                                };
                                                setResume({
                                                  ...resume,
                                                  sectionConfig: newConfig,
                                                });
                                                if (
                                                  resumeId &&
                                                  resumeId !== "new" &&
                                                  isValidUUID(resumeId)
                                                ) {
                                                  resumeService
                                                    .updateResume(resumeId, {
                                                      sectionConfig: newConfig,
                                                    })
                                                    .catch((err) => {
                                                      console.error(
                                                        "Failed to delete custom group:",
                                                        err
                                                      );
                                                    });
                                                }
                                              }}
                                              className="text-xs text-red-600 hover:text-red-700"
                                              title="Delete group"
                                            >
                                              <Icon
                                                icon="mingcute:delete-line"
                                                className="w-4 h-4"
                                              />
                                            </button>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                          {groupSkills.map((skill) => (
                                            <span
                                              key={skill.id}
                                              className="px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2"
                                              style={{
                                                backgroundColor: colors.primary,
                                                color: "white",
                                              }}
                                            >
                                              {skill.name}
                                              <button
                                                onClick={() =>
                                                  deleteItem("skills", skill.id)
                                                }
                                                className="hover:bg-white/20 rounded p-0.5 flex items-center justify-center bg-transparent border-0 cursor-pointer"
                                                style={{
                                                  minWidth: "16px",
                                                  minHeight: "16px",
                                                  padding: "2px",
                                                }}
                                                type="button"
                                              >
                                                <Icon
                                                  icon="mingcute:close-line"
                                                  className="w-3 h-3"
                                                  style={{
                                                    color: "white",
                                                    display: "block",
                                                    opacity: 1,
                                                  }}
                                                />
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            id={`new-skill-${group}`}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent text-sm"
                                            placeholder={`Add skill to ${group}`}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                const input =
                                                  e.target as HTMLInputElement;
                                                const skillName =
                                                  input.value.trim();
                                                if (skillName) {
                                                  addItem("skills", {
                                                    id: `skill-${Date.now()}`,
                                                    name: skillName,
                                                    category: group,
                                                    group:
                                                      customGroups.includes(
                                                        group
                                                      )
                                                        ? group
                                                        : undefined,
                                                    proficiency: "",
                                                  });
                                                  input.value = "";
                                                }
                                              }
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              const input =
                                                document.getElementById(
                                                  `new-skill-${group}`
                                                ) as HTMLInputElement;
                                              const skillName =
                                                input.value.trim();
                                              if (skillName) {
                                                addItem("skills", {
                                                  id: `skill-${Date.now()}`,
                                                  name: skillName,
                                                  category: group,
                                                  group: customGroups.includes(
                                                    group
                                                  )
                                                    ? group
                                                    : undefined,
                                                  proficiency: "",
                                                });
                                                input.value = "";
                                              }
                                            }}
                                            className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors text-sm"
                                          >
                                            Add
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setEditingSection(null);
                              }}
                              className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        ) : (
                          <>
                            {displayResume.content.skills &&
                            displayResume.content.skills.length > 0 ? (
                              (() => {
                                // Group skills by category/group (support custom groups)
                                const skillsByCategory =
                                  displayResume.content.skills.reduce(
                                    (
                                      acc: Record<
                                        string,
                                        typeof displayResume.content.skills
                                      >,
                                      skill
                                    ) => {
                                      // Use custom group if available, otherwise use category
                                      const group =
                                        skill.group ||
                                        skill.category ||
                                        "Technical";
                                      if (!acc[group]) {
                                        acc[group] = [];
                                      }
                                      acc[group].push(skill);
                                      return acc;
                                    },
                                    {}
                                  );

                                // Get visible categories from sectionConfig (default: all visible)
                                const sectionConfig =
                                  displayResume.sectionConfig || {};
                                const skillsConfig =
                                  (sectionConfig.skills as any) || {};
                                const visibleCategories =
                                  (skillsConfig.visibleCategories as string[]) ||
                                  Object.keys(skillsByCategory);

                                // Get custom groups
                                const customGroups =
                                  (skillsConfig.customGroups as string[]) || [];

                                // Category display order (include custom groups)
                                const categoryOrder = [
                                  "Technical",
                                  "Languages",
                                  "Soft Skills",
                                  "Industry-Specific",
                                  ...customGroups,
                                ];
                                const sortedCategories = Object.keys(
                                  skillsByCategory
                                ).sort((a, b) => {
                                  const indexA = categoryOrder.indexOf(a);
                                  const indexB = categoryOrder.indexOf(b);
                                  if (indexA === -1 && indexB === -1)
                                    return a.localeCompare(b);
                                  if (indexA === -1) return 1;
                                  if (indexB === -1) return -1;
                                  return indexA - indexB;
                                });

                                const hiddenCategories =
                                  sortedCategories.filter(
                                    (cat) => !visibleCategories.includes(cat)
                                  );

                                return (
                                  <div className="space-y-3">
                                    {sortedCategories.map((category) => {
                                      const categorySkills =
                                        skillsByCategory[category];
                                      const isVisible =
                                        visibleCategories.includes(category);

                                      if (!isVisible) return null;

                                      return (
                                        <div key={category} className="mb-2">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                              {category}:
                                            </span>
                                            <button
                                              onClick={() => {
                                                if (!resume) return;
                                                const currentConfig =
                                                  resume.sectionConfig || {};
                                                const skillsConfig =
                                                  (currentConfig.skills as any) ||
                                                  {};
                                                const allCategories =
                                                  Object.keys(skillsByCategory);
                                                const currentVisible =
                                                  (skillsConfig.visibleCategories as string[]) ||
                                                  allCategories;
                                                const newVisibleCategories =
                                                  currentVisible.filter(
                                                    (cat: string) =>
                                                      cat !== category
                                                  );

                                                const newConfig = {
                                                  ...currentConfig,
                                                  skills: {
                                                    ...skillsConfig,
                                                    visibleCategories:
                                                      newVisibleCategories,
                                                  },
                                                };

                                                setResume({
                                                  ...resume,
                                                  sectionConfig: newConfig,
                                                });

                                                // Auto-save
                                                if (
                                                  resumeId &&
                                                  resumeId !== "new" &&
                                                  isValidUUID(resumeId)
                                                ) {
                                                  resumeService
                                                    .updateResume(resumeId, {
                                                      sectionConfig: newConfig,
                                                    })
                                                    .catch((err) => {
                                                      console.error(
                                                        "Failed to save category toggle:",
                                                        err
                                                      );
                                                    });
                                                }
                                              }}
                                              className="text-xs text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                                              title="Hide this category"
                                            >
                                              <Icon
                                                icon="mingcute:eye-off-line"
                                                className="w-3.5 h-3.5"
                                              />
                                            </button>
                                          </div>
                                          <div className="text-sm text-gray-700 leading-relaxed ml-0">
                                            {categorySkills
                                              .map((skill) => skill.name)
                                              .join(", ")}
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Show hidden categories with option to show them */}
                                    {hiddenCategories.length > 0 && (
                                      <div className="pt-2 border-t border-gray-200">
                                        <div className="text-xs text-gray-500 mb-2">
                                          Hidden categories:
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {hiddenCategories.map((category) => (
                                            <button
                                              key={category}
                                              onClick={() => {
                                                if (!resume) return;
                                                const currentConfig =
                                                  resume.sectionConfig || {};
                                                const skillsConfig =
                                                  (currentConfig.skills as any) ||
                                                  {};
                                                const allCategories =
                                                  Object.keys(skillsByCategory);
                                                const currentVisible =
                                                  (skillsConfig.visibleCategories as string[]) ||
                                                  allCategories;
                                                const newVisibleCategories = [
                                                  ...currentVisible,
                                                  category,
                                                ];

                                                const newConfig = {
                                                  ...currentConfig,
                                                  skills: {
                                                    ...skillsConfig,
                                                    visibleCategories:
                                                      newVisibleCategories,
                                                  },
                                                };

                                                setResume({
                                                  ...resume,
                                                  sectionConfig: newConfig,
                                                });

                                                // Auto-save
                                                if (
                                                  resumeId &&
                                                  resumeId !== "new" &&
                                                  isValidUUID(resumeId)
                                                ) {
                                                  resumeService
                                                    .updateResume(resumeId, {
                                                      sectionConfig: newConfig,
                                                    })
                                                    .catch((err) => {
                                                      console.error(
                                                        "Failed to save category toggle:",
                                                        err
                                                      );
                                                    });
                                                }
                                              }}
                                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                                              title="Show this category"
                                            >
                                              <Icon
                                                icon="mingcute:eye-line"
                                                className="w-3 h-3"
                                              />
                                              {category}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <p className="text-gray-500 text-sm italic">
                                No skills yet. Click Edit to add skills.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                }

                // Projects Section
                if (sectionId === "projects") {
                  return (
                    <div
                      key={sectionId}
                      draggable
                      onDragStart={() => handleDocumentDragStart("projects")}
                      onDragOver={(e) => handleDocumentDragOver(e, "projects")}
                      onDrop={() => handleDocumentDrop("projects")}
                      onDragEnd={handleDocumentDragEnd}
                      onDragLeave={() => setDragOverSection(null)}
                      className={`relative group transition-all ${
                        draggedDocumentSection === "projects"
                          ? "opacity-50 border-2 border-dashed border-[#3351FD] rounded-lg p-2"
                          : dragOverSection === "projects" &&
                            draggedDocumentSection &&
                            draggedDocumentSection !== "projects"
                          ? "border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg p-2"
                          : "hover:border-2 hover:border-dashed hover:border-gray-300 rounded-lg p-2"
                      }`}
                      style={{
                        ...getSectionStyle("projects"),
                        marginBottom:
                          getSectionFormatting("projects").marginBottom ||
                          `${
                            displayResume.customizations?.spacing?.section || 24
                          }px`,
                        marginTop:
                          getSectionFormatting("projects").marginTop ||
                          undefined,
                      }}
                    >
                      <div
                        style={{
                          ...(getSectionFormatting("projects").textAlign && {
                            textAlign: getSectionFormatting("projects")
                              .textAlign as any,
                          }),
                          ...(getSectionFormatting("projects").color && {
                            color: getSectionFormatting("projects").color,
                          }),
                          ...(getSectionFormatting("projects").fontSize && {
                            fontSize: getSectionFormatting("projects").fontSize,
                          }),
                          ...(getSectionFormatting("projects").fontWeight && {
                            fontWeight:
                              getSectionFormatting("projects").fontWeight,
                          }),
                          ...(getSectionFormatting("projects")
                            .backgroundColor && {
                            backgroundColor:
                              getSectionFormatting("projects").backgroundColor,
                            padding: "12px",
                            borderRadius: "8px",
                          }),
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h2
                            className="text-2xl font-semibold"
                            style={{
                              color:
                                getSectionFormatting("projects").color ||
                                colors.primary,
                              fontFamily: fonts.heading,
                            }}
                          >
                            Projects
                          </h2>
                          <div className="flex gap-2">
                            {userProjects.length > 0 && (
                              <button
                                onClick={() =>
                                  handleImportFromDatabase("projects")
                                }
                                className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                title="Import from Database"
                              >
                                <Icon
                                  icon="mingcute:download-line"
                                  className="w-4 h-4 inline mr-1"
                                />
                                Import
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setShowCustomization(true);
                                setSelectedSectionForFormatting("projects");
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                              title="Customize this section"
                            >
                              <Icon
                                icon="mingcute:settings-3-line"
                                className="w-4 h-4 text-purple-600"
                              />
                            </button>
                            <button
                              onClick={() =>
                                handleEnhanceSectionWithAI("projects")
                              }
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                              title="Enhance with AI"
                            >
                              <Icon
                                icon="mingcute:magic-1-line"
                                className="w-4 h-4 text-[#3351FD]"
                              />
                            </button>
                            <button
                              onClick={() =>
                                setEditingItem({
                                  section: "projects",
                                  itemId: "new",
                                })
                              }
                              className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-sm bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4]"
                            >
                              <Icon
                                icon="mingcute:add-line"
                                className="w-4 h-4 inline mr-1"
                              />
                              Add
                            </button>
                          </div>
                        </div>
                        {displayResume.content.projects &&
                        displayResume.content.projects.length > 0 ? (
                          <div className="space-y-4">
                            {displayResume.content.projects.map((project) => (
                              <div
                                key={project.id}
                                className="relative group/item"
                              >
                                {editingItem?.section === "projects" &&
                                editingItem?.itemId === project.id ? (
                                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                    <input
                                      type="text"
                                      defaultValue={project.name}
                                      onBlur={(e) =>
                                        updateItem(
                                          "projects",
                                          project.id,
                                          {
                                            name: e.target.value,
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                      placeholder="Project Name"
                                    />
                                    <textarea
                                      defaultValue={project.description}
                                      onBlur={(e) =>
                                        updateItem(
                                          "projects",
                                          project.id,
                                          {
                                            description: e.target.value,
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent min-h-[80px]"
                                      placeholder="Description"
                                    />
                                    <input
                                      type="text"
                                      defaultValue={
                                        project.technologies?.join(", ") || ""
                                      }
                                      onBlur={(e) =>
                                        updateItem(
                                          "projects",
                                          project.id,
                                          {
                                            technologies: e.target.value
                                              .split(",")
                                              .map((t) => t.trim())
                                              .filter((t) => t),
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                      placeholder="Technologies (comma-separated)"
                                    />
                                    <input
                                      type="url"
                                      defaultValue={project.link || ""}
                                      onBlur={(e) =>
                                        updateItem(
                                          "projects",
                                          project.id,
                                          {
                                            link: e.target.value || undefined,
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                      placeholder="Project Link"
                                    />
                                    <div
                                      className="flex gap-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setEditingItem(null);
                                        }}
                                        className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors relative z-10"
                                      >
                                        Done
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          deleteItem("projects", project.id);
                                        }}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors relative z-10"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      {project.name}
                                    </h3>
                                    <p className="text-gray-700">
                                      {project.description}
                                    </p>
                                    {project.technologies &&
                                      project.technologies.length > 0 && (
                                        <p className="text-sm text-gray-600">
                                          Technologies:{" "}
                                          {project.technologies.join(", ")}
                                        </p>
                                      )}
                                    {project.link && (
                                      <a
                                        href={project.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-[#3351FD] hover:underline"
                                      >
                                        View Project
                                      </a>
                                    )}
                                    <button
                                      className="absolute top-0 right-0 opacity-0 group-hover/item:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                                      onClick={() =>
                                        setEditingItem({
                                          section: "projects",
                                          itemId: project.id,
                                        })
                                      }
                                      title="Edit"
                                    >
                                      <Icon
                                        icon="mingcute:edit-line"
                                        className="w-4 h-4 text-gray-600"
                                      />
                                    </button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                            <p className="text-gray-500 text-sm mb-3">
                              No projects yet
                            </p>
                            <button
                              onClick={() =>
                                setEditingItem({
                                  section: "projects",
                                  itemId: "new",
                                })
                              }
                              className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors text-sm"
                            >
                              <Icon
                                icon="mingcute:add-line"
                                className="w-4 h-4 inline mr-1"
                              />
                              Add Project
                            </button>
                          </div>
                        )}
                        {editingItem?.section === "projects" &&
                          editingItem?.itemId === "new" && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                              <input
                                type="text"
                                id="new-proj-name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="Project Name"
                              />
                              <textarea
                                id="new-proj-desc"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent min-h-[80px]"
                                placeholder="Description"
                              />
                              <input
                                type="text"
                                id="new-proj-tech"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="Technologies (comma-separated)"
                              />
                              <input
                                type="url"
                                id="new-proj-link"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="Project Link"
                              />
                              <div
                                className="flex gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const name = (
                                      document.getElementById(
                                        "new-proj-name"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const desc = (
                                      document.getElementById(
                                        "new-proj-desc"
                                      ) as HTMLTextAreaElement
                                    )?.value;
                                    const tech = (
                                      document.getElementById(
                                        "new-proj-tech"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const link = (
                                      document.getElementById(
                                        "new-proj-link"
                                      ) as HTMLInputElement
                                    )?.value;
                                    if (name && desc) {
                                      addItem("projects", {
                                        id: `proj-${Date.now()}`,
                                        name,
                                        description: desc,
                                        technologies: tech
                                          ? tech
                                              .split(",")
                                              .map((t) => t.trim())
                                              .filter((t) => t)
                                          : undefined,
                                        link: link || undefined,
                                      });
                                    }
                                  }}
                                  className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors relative z-10"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setEditingItem(null);
                                  }}
                                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors relative z-10"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  );
                }

                // Certifications Section
                if (sectionId === "certifications") {
                  return (
                    <div
                      key={sectionId}
                      draggable
                      onDragStart={() =>
                        handleDocumentDragStart("certifications")
                      }
                      onDragOver={(e) =>
                        handleDocumentDragOver(e, "certifications")
                      }
                      onDrop={() => handleDocumentDrop("certifications")}
                      onDragEnd={handleDocumentDragEnd}
                      onDragLeave={() => setDragOverSection(null)}
                      className={`relative group transition-all ${
                        draggedDocumentSection === "certifications"
                          ? "opacity-50 border-2 border-dashed border-[#3351FD] rounded-lg p-2"
                          : dragOverSection === "certifications" &&
                            draggedDocumentSection &&
                            draggedDocumentSection !== "certifications"
                          ? "border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg p-2"
                          : "hover:border-2 hover:border-dashed hover:border-gray-300 rounded-lg p-2"
                      }`}
                      style={{
                        ...getSectionStyle("certifications"),
                        marginBottom:
                          getSectionFormatting("certifications").marginBottom ||
                          `${
                            displayResume.customizations?.spacing?.section || 24
                          }px`,
                        marginTop:
                          getSectionFormatting("certifications").marginTop ||
                          undefined,
                      }}
                    >
                      <div
                        style={{
                          ...(getSectionFormatting("certifications")
                            .textAlign && {
                            textAlign: getSectionFormatting("certifications")
                              .textAlign as any,
                          }),
                          ...(getSectionFormatting("certifications").color && {
                            color: getSectionFormatting("certifications").color,
                          }),
                          ...(getSectionFormatting("certifications")
                            .fontSize && {
                            fontSize:
                              getSectionFormatting("certifications").fontSize,
                          }),
                          ...(getSectionFormatting("certifications")
                            .fontWeight && {
                            fontWeight:
                              getSectionFormatting("certifications").fontWeight,
                          }),
                          ...(getSectionFormatting("certifications")
                            .backgroundColor && {
                            backgroundColor:
                              getSectionFormatting("certifications")
                                .backgroundColor,
                            padding: "12px",
                            borderRadius: "8px",
                          }),
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h2
                            className="text-2xl font-semibold"
                            style={{
                              color:
                                getSectionFormatting("certifications").color ||
                                colors.primary,
                              fontFamily: fonts.heading,
                            }}
                          >
                            Certifications
                          </h2>
                          <div className="flex gap-2">
                            {userCertifications.length > 0 && (
                              <button
                                onClick={() =>
                                  handleImportFromDatabase("certifications")
                                }
                                className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                title="Import from Database"
                              >
                                <Icon
                                  icon="mingcute:download-line"
                                  className="w-4 h-4 inline mr-1"
                                />
                                Import
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setShowCustomization(true);
                                setSelectedSectionForFormatting(
                                  "certifications"
                                );
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                              title="Customize this section"
                            >
                              <Icon
                                icon="mingcute:settings-3-line"
                                className="w-4 h-4 text-purple-600"
                              />
                            </button>
                            <button
                              onClick={() =>
                                setEditingItem({
                                  section: "certifications",
                                  itemId: "new",
                                })
                              }
                              className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-sm bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4]"
                            >
                              <Icon
                                icon="mingcute:add-line"
                                className="w-4 h-4 inline mr-1"
                              />
                              Add
                            </button>
                          </div>
                        </div>
                        {resume.content.certifications &&
                        resume.content.certifications.length > 0 ? (
                          <div className="space-y-2">
                            {resume.content.certifications.map((cert) => (
                              <div
                                key={cert.id}
                                className="relative group/item"
                              >
                                {editingItem?.section === "certifications" &&
                                editingItem?.itemId === cert.id ? (
                                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                    <input
                                      type="text"
                                      defaultValue={cert.name}
                                      onBlur={(e) =>
                                        updateItem(
                                          "certifications",
                                          cert.id,
                                          {
                                            name: e.target.value,
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                      placeholder="Certification Name"
                                    />
                                    <input
                                      type="text"
                                      defaultValue={cert.organization}
                                      onBlur={(e) =>
                                        updateItem(
                                          "certifications",
                                          cert.id,
                                          {
                                            organization: e.target.value,
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                      placeholder="Organization"
                                    />
                                    <input
                                      type="month"
                                      defaultValue={cert.dateEarned}
                                      onBlur={(e) =>
                                        updateItem(
                                          "certifications",
                                          cert.id,
                                          {
                                            dateEarned: e.target.value,
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                      placeholder="Date Earned"
                                    />
                                    <input
                                      type="month"
                                      defaultValue={cert.expirationDate || ""}
                                      onBlur={(e) =>
                                        updateItem(
                                          "certifications",
                                          cert.id,
                                          {
                                            expirationDate:
                                              e.target.value || undefined,
                                          },
                                          false
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                      placeholder="Expiration Date (optional)"
                                    />
                                    <div
                                      className="flex gap-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setEditingItem(null);
                                        }}
                                        className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors relative z-10"
                                      >
                                        Done
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          deleteItem("certifications", cert.id);
                                        }}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors relative z-10"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      {cert.name}
                                    </h3>
                                    <p className="text-gray-700">
                                      {cert.organization} -{" "}
                                      {formatDateMonthYear(cert.dateEarned)}
                                    </p>
                                    {cert.expirationDate && (
                                      <p className="text-sm text-gray-600">
                                        Expires:{" "}
                                        {formatDateMonthYear(
                                          cert.expirationDate
                                        )}
                                      </p>
                                    )}
                                    <button
                                      className="absolute top-0 right-0 opacity-0 group-hover/item:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg"
                                      onClick={() =>
                                        setEditingItem({
                                          section: "certifications",
                                          itemId: cert.id,
                                        })
                                      }
                                      title="Edit"
                                    >
                                      <Icon
                                        icon="mingcute:edit-line"
                                        className="w-4 h-4 text-gray-600"
                                      />
                                    </button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                            <p className="text-gray-500 text-sm mb-3">
                              No certifications yet
                            </p>
                            <button
                              onClick={() =>
                                setEditingItem({
                                  section: "certifications",
                                  itemId: "new",
                                })
                              }
                              className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors text-sm"
                            >
                              <Icon
                                icon="mingcute:add-line"
                                className="w-4 h-4 inline mr-1"
                              />
                              Add Certification
                            </button>
                          </div>
                        )}
                        {editingItem?.section === "certifications" &&
                          editingItem?.itemId === "new" && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                              <input
                                type="text"
                                id="new-cert-name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="Certification Name"
                              />
                              <input
                                type="text"
                                id="new-cert-org"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="Organization"
                              />
                              <input
                                type="month"
                                id="new-cert-date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="Date Earned"
                              />
                              <input
                                type="month"
                                id="new-cert-exp"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                                placeholder="Expiration Date (optional)"
                              />
                              <div
                                className="flex gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const name = (
                                      document.getElementById(
                                        "new-cert-name"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const org = (
                                      document.getElementById(
                                        "new-cert-org"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const date = (
                                      document.getElementById(
                                        "new-cert-date"
                                      ) as HTMLInputElement
                                    )?.value;
                                    const exp = (
                                      document.getElementById(
                                        "new-cert-exp"
                                      ) as HTMLInputElement
                                    )?.value;
                                    if (name && org && date) {
                                      addItem("certifications", {
                                        id: `cert-${Date.now()}`,
                                        name,
                                        organization: org,
                                        dateEarned: date,
                                        expirationDate: exp || undefined,
                                      });
                                    }
                                  }}
                                  className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors relative z-10"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setEditingItem(null);
                                  }}
                                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors relative z-10"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>

          {/* Right Sidebar - AI Assistant */}
          {showAIPanel && (
            <div
              className="w-[28rem] bg-white border-r border-gray-200 flex flex-col overflow-hidden"
              style={{ height: "100%", maxHeight: "100%" }}
            >
              <AIAssistantChat
                resume={resume}
                resumeId={resumeId}
                isOpen={showAIPanel}
                onClose={() => setShowAIPanel(false)}
                initialJobId={jobId && isValidUUID(jobId) ? jobId : null}
                initialMessage={getDecodedExplanation(aiExplanation)}
                initialUserAndAssistant={enhancedConversation}
                autoAnalyzeJob={
                  !!(
                    jobId &&
                    isValidUUID(jobId) &&
                    resumeId &&
                    resumeId !== "new" &&
                    !aiExplanation &&
                    !shouldAutoAnalyzeResume
                  )
                }
                autoAnalyzeResume={shouldAutoAnalyzeResume}
                onAnalysisComplete={() => {
                  setShouldAutoAnalyzeResume(false);
                  showToast(
                    "Resume analysis complete! Check the AI assistant for feedback.",
                    "success"
                  );
                }}
                onResumeUpdate={(updates) => {
                  if (resume) {
                    // Save current state to history before applying changes
                    saveToHistory(resume);

                    const updatedResume = { ...resume, ...updates };
                    setResume(updatedResume);
                    // Auto-save to backend
                    if (resumeId && resumeId !== "new") {
                      resumeService
                        .updateResume(resumeId, updatedResume)
                        .then(() => {
                          setToast({
                            message: "Resume updated successfully!",
                            type: "success",
                          });
                        })
                        .catch((err) => {
                          console.error("Failed to save:", err);
                          setToast({
                            message: "Failed to save changes",
                            type: "error",
                          });
                        });
                    }
                  }
                }}
                onPreviewUpdate={(preview) => {
                  console.log(
                    "📝 Preview update received:",
                    preview ? "has preview" : "null"
                  );
                  setPreviewResume(preview);
                }}
              />
            </div>
          )}

          {/* Right Sidebar - Customization */}
          {showCustomization && (
            <div
              className="w-80 bg-white border-l border-gray-200 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Customize Appearance
                  </h2>
                  <button
                    onClick={handleResetFormatting}
                    className="px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5"
                    title="Reset all formatting to default"
                  >
                    <Icon
                      icon="mingcute:refresh-line"
                      className="w-3.5 h-3.5"
                    />
                    Reset
                  </button>
                </div>

                {/* Section Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Format Section
                  </label>
                  <select
                    value={selectedSectionForFormatting || "global"}
                    onChange={(e) =>
                      setSelectedSectionForFormatting(
                        e.target.value === "global" ? null : e.target.value
                      )
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                  >
                    <option value="global">Global (All Sections)</option>
                    {getSidebarSections().map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSectionForFormatting && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700">
                      Formatting options below will apply only to:{" "}
                      <strong>
                        {
                          sections.find(
                            (s) => s.id === selectedSectionForFormatting
                          )?.label
                        }
                      </strong>
                    </p>
                  </div>
                )}

                {/* Global Controls - Only show when no section is selected */}
                {!selectedSectionForFormatting && (
                  <>
                    {/* Colors */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Colors
                      </h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Primary Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colors.primary}
                            onChange={(e) => {
                              if (!resume) return;
                              const currentCustomizations =
                                ensureCustomizations();
                              const currentColors =
                                currentCustomizations?.colors || colors;
                              const newCustomizations = {
                                ...currentCustomizations,
                                colors: {
                                  primary: e.target.value,
                                  secondary: currentColors.secondary,
                                  text: currentColors.text,
                                  background: currentColors.background,
                                },
                              };
                              autoSaveCustomizations(newCustomizations);
                            }}
                            className="w-16 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={colors.primary}
                            onChange={(e) => {
                              if (!resume) return;
                              const currentCustomizations =
                                ensureCustomizations();
                              const currentColors =
                                currentCustomizations?.colors || colors;
                              const newCustomizations = {
                                ...currentCustomizations,
                                colors: {
                                  primary: e.target.value,
                                  secondary: currentColors.secondary,
                                  text: currentColors.text,
                                  background: currentColors.background,
                                },
                              };
                              autoSaveCustomizations(newCustomizations);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="#3351FD"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Secondary Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colors.secondary}
                            onChange={(e) => {
                              if (!resume) return;
                              const currentCustomizations =
                                ensureCustomizations();
                              const currentColors =
                                currentCustomizations?.colors || colors;
                              const newCustomizations = {
                                ...currentCustomizations,
                                colors: {
                                  primary: currentColors.primary,
                                  secondary: e.target.value,
                                  text: currentColors.text,
                                  background: currentColors.background,
                                },
                              };
                              autoSaveCustomizations(newCustomizations);
                            }}
                            className="w-16 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={colors.secondary}
                            onChange={(e) => {
                              if (!resume) return;
                              const currentCustomizations =
                                ensureCustomizations();
                              const currentColors =
                                currentCustomizations?.colors || colors;
                              const newCustomizations = {
                                ...currentCustomizations,
                                colors: {
                                  primary: currentColors.primary,
                                  secondary: e.target.value,
                                  text: currentColors.text,
                                  background: currentColors.background,
                                },
                              };
                              autoSaveCustomizations(newCustomizations);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Text Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colors.text}
                            onChange={(e) => {
                              if (!resume) return;
                              const currentCustomizations =
                                ensureCustomizations();
                              const currentColors =
                                currentCustomizations?.colors || colors;
                              const newCustomizations = {
                                ...currentCustomizations,
                                colors: {
                                  primary: currentColors.primary,
                                  secondary: currentColors.secondary,
                                  text: e.target.value,
                                  background: currentColors.background,
                                },
                              };
                              autoSaveCustomizations(newCustomizations);
                            }}
                            className="w-16 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={colors.text}
                            onChange={(e) => {
                              if (!resume) return;
                              const currentCustomizations =
                                ensureCustomizations();
                              const currentColors =
                                currentCustomizations?.colors || colors;
                              const newCustomizations = {
                                ...currentCustomizations,
                                colors: {
                                  primary: currentColors.primary,
                                  secondary: currentColors.secondary,
                                  text: e.target.value,
                                  background: currentColors.background,
                                },
                              };
                              autoSaveCustomizations(newCustomizations);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Background Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colors.background}
                            onChange={(e) => {
                              if (!resume) return;
                              const currentCustomizations =
                                ensureCustomizations();
                              const currentColors =
                                currentCustomizations?.colors || colors;
                              const newCustomizations = {
                                ...currentCustomizations,
                                colors: {
                                  primary: currentColors.primary,
                                  secondary: currentColors.secondary,
                                  text: currentColors.text,
                                  background: e.target.value,
                                },
                              };
                              autoSaveCustomizations(newCustomizations);
                            }}
                            className="w-16 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={colors.background}
                            onChange={(e) => {
                              if (!resume) return;
                              const currentCustomizations =
                                ensureCustomizations();
                              const currentColors =
                                currentCustomizations?.colors || colors;
                              const newCustomizations = {
                                ...currentCustomizations,
                                colors: {
                                  primary: currentColors.primary,
                                  secondary: currentColors.secondary,
                                  text: currentColors.text,
                                  background: e.target.value,
                                },
                              };
                              autoSaveCustomizations(newCustomizations);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="#FFFFFF"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fonts */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Fonts
                      </h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Heading Font
                        </label>
                        <select
                          value={fonts.heading}
                          onChange={(e) => {
                            if (!resume) return;
                            const currentCustomizations =
                              ensureCustomizations();
                            const currentFonts =
                              currentCustomizations?.fonts || fonts;
                            const newCustomizations = {
                              ...currentCustomizations,
                              fonts: {
                                heading: e.target.value,
                                body: currentFonts.body,
                              },
                            };
                            autoSaveCustomizations(newCustomizations);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option>Inter</option>
                          <option>Roboto</option>
                          <option>Georgia</option>
                          <option>Helvetica</option>
                          <option>Times New Roman</option>
                          <option>Open Sans</option>
                          <option>Lato</option>
                          <option>Montserrat</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Body Font
                        </label>
                        <select
                          value={fonts.body}
                          onChange={(e) => {
                            if (!resume) return;
                            const currentCustomizations =
                              ensureCustomizations();
                            const currentFonts =
                              currentCustomizations?.fonts || fonts;
                            const newCustomizations = {
                              ...currentCustomizations,
                              fonts: {
                                heading: currentFonts.heading,
                                body: e.target.value,
                              },
                            };
                            autoSaveCustomizations(newCustomizations);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option>Inter</option>
                          <option>Roboto</option>
                          <option>Georgia</option>
                          <option>Helvetica</option>
                          <option>Times New Roman</option>
                          <option>Open Sans</option>
                          <option>Lato</option>
                          <option>Montserrat</option>
                        </select>
                      </div>
                    </div>

                    {/* Layout */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Layout
                      </h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Text Alignment
                        </label>
                        <select
                          value={resume.customizations?.alignment || "left"}
                          onChange={(e) => {
                            if (!resume) return;
                            const currentCustomizations =
                              ensureCustomizations();
                            const newCustomizations = {
                              ...currentCustomizations,
                              alignment: e.target.value,
                            };
                            autoSaveCustomizations(newCustomizations);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                          <option value="justify">Justify</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Header Style
                        </label>
                        <select
                          value={
                            resume.customizations?.headerStyle || "centered"
                          }
                          onChange={(e) => {
                            if (!resume) return;
                            const currentCustomizations =
                              ensureCustomizations();
                            const newCustomizations = {
                              ...currentCustomizations,
                              headerStyle: e.target.value,
                            };
                            autoSaveCustomizations(newCustomizations);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="centered">Centered</option>
                          <option value="left">Left Aligned</option>
                          <option value="right">Right Aligned</option>
                        </select>
                      </div>
                    </div>

                    {/* Spacing */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Spacing
                      </h3>
                      {!selectedSectionForFormatting ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Section Spacing:{" "}
                              {resume.customizations?.spacing?.section || 24}px
                            </label>
                            <input
                              type="range"
                              min="12"
                              max="48"
                              step="2"
                              value={
                                resume.customizations?.spacing?.section || 24
                              }
                              onChange={(e) => {
                                if (!resume) return;
                                const currentCustomizations =
                                  ensureCustomizations();
                                const newCustomizations = {
                                  ...currentCustomizations,
                                  spacing: {
                                    ...currentCustomizations?.spacing,
                                    section: parseInt(e.target.value),
                                    item:
                                      currentCustomizations?.spacing?.item ||
                                      12,
                                  },
                                };
                                autoSaveCustomizations(newCustomizations);
                              }}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Item Spacing:{" "}
                              {resume.customizations?.spacing?.item || 12}px
                            </label>
                            <input
                              type="range"
                              min="6"
                              max="24"
                              step="2"
                              value={resume.customizations?.spacing?.item || 12}
                              onChange={(e) => {
                                if (!resume) return;
                                const currentCustomizations =
                                  ensureCustomizations();
                                const newCustomizations = {
                                  ...currentCustomizations,
                                  spacing: {
                                    ...currentCustomizations?.spacing,
                                    section:
                                      currentCustomizations?.spacing?.section ||
                                      24,
                                    item: parseInt(e.target.value),
                                  },
                                };
                                autoSaveCustomizations(newCustomizations);
                              }}
                              className="w-full"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Top Margin:{" "}
                              {(() => {
                                const margin = getSectionFormatting(
                                  selectedSectionForFormatting
                                ).marginTop;
                                return margin
                                  ? parseInt(
                                      margin.toString().replace("px", "")
                                    )
                                  : 0;
                              })()}
                              px
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="48"
                              step="2"
                              value={(() => {
                                const margin = getSectionFormatting(
                                  selectedSectionForFormatting
                                ).marginTop;
                                return margin
                                  ? parseInt(
                                      margin.toString().replace("px", "")
                                    )
                                  : 0;
                              })()}
                              onChange={(e) => {
                                updateSectionFormatting(
                                  selectedSectionForFormatting,
                                  {
                                    marginTop: `${e.target.value}px`,
                                  }
                                );
                              }}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bottom Margin:{" "}
                              {(() => {
                                const margin = getSectionFormatting(
                                  selectedSectionForFormatting
                                ).marginBottom;
                                return margin
                                  ? parseInt(
                                      margin.toString().replace("px", "")
                                    )
                                  : 0;
                              })()}
                              px
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="48"
                              step="2"
                              value={(() => {
                                const margin = getSectionFormatting(
                                  selectedSectionForFormatting
                                ).marginBottom;
                                return margin
                                  ? parseInt(
                                      margin.toString().replace("px", "")
                                    )
                                  : 0;
                              })()}
                              onChange={(e) => {
                                updateSectionFormatting(
                                  selectedSectionForFormatting,
                                  {
                                    marginBottom: `${e.target.value}px`,
                                  }
                                );
                              }}
                              className="w-full"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Section-Specific Formatting */}
                {selectedSectionForFormatting && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Section Formatting
                    </h3>

                    {/* Font Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Font Size:{" "}
                        {getSectionFormatting(selectedSectionForFormatting)
                          .fontSize || "inherit"}
                      </label>
                      <select
                        value={
                          getSectionFormatting(selectedSectionForFormatting)
                            .fontSize || "inherit"
                        }
                        onChange={(e) => {
                          updateSectionFormatting(
                            selectedSectionForFormatting,
                            {
                              fontSize: e.target.value,
                            }
                          );
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                      >
                        <option value="inherit">Inherit</option>
                        <option value="10px">10px</option>
                        <option value="11px">11px</option>
                        <option value="12px">12px</option>
                        <option value="14px">14px</option>
                        <option value="16px">16px</option>
                        <option value="18px">18px</option>
                        <option value="20px">20px</option>
                        <option value="24px">24px</option>
                      </select>
                    </div>

                    {/* Font Weight */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Font Weight
                      </label>
                      <select
                        value={
                          getSectionFormatting(selectedSectionForFormatting)
                            .fontWeight || "inherit"
                        }
                        onChange={(e) => {
                          updateSectionFormatting(
                            selectedSectionForFormatting,
                            {
                              fontWeight: e.target.value,
                            }
                          );
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                      >
                        <option value="inherit">Inherit</option>
                        <option value="300">Light</option>
                        <option value="400">Normal</option>
                        <option value="500">Medium</option>
                        <option value="600">Semi-Bold</option>
                        <option value="700">Bold</option>
                      </select>
                    </div>

                    {/* Text Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={
                            getSectionFormatting(selectedSectionForFormatting)
                              .color || colors.text
                          }
                          onChange={(e) => {
                            updateSectionFormatting(
                              selectedSectionForFormatting,
                              {
                                color: e.target.value,
                              }
                            );
                          }}
                          className="w-16 h-10 rounded-lg border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={
                            getSectionFormatting(selectedSectionForFormatting)
                              .color || colors.text
                          }
                          onChange={(e) => {
                            updateSectionFormatting(
                              selectedSectionForFormatting,
                              {
                                color: e.target.value,
                              }
                            );
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    {/* Background Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Background Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={
                            getSectionFormatting(selectedSectionForFormatting)
                              .backgroundColor || colors.background
                          }
                          onChange={(e) => {
                            updateSectionFormatting(
                              selectedSectionForFormatting,
                              {
                                backgroundColor: e.target.value,
                              }
                            );
                          }}
                          className="w-16 h-10 rounded-lg border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={
                            getSectionFormatting(selectedSectionForFormatting)
                              .backgroundColor || colors.background
                          }
                          onChange={(e) => {
                            updateSectionFormatting(
                              selectedSectionForFormatting,
                              {
                                backgroundColor: e.target.value,
                              }
                            );
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="#FFFFFF"
                        />
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Alignment
                      </label>
                      <select
                        value={
                          getSectionFormatting(selectedSectionForFormatting)
                            .textAlign || "inherit"
                        }
                        onChange={(e) => {
                          updateSectionFormatting(
                            selectedSectionForFormatting,
                            {
                              textAlign: e.target.value,
                            }
                          );
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                      >
                        <option value="inherit">Inherit</option>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                        <option value="justify">Justify</option>
                      </select>
                    </div>

                    {/* Reset Button */}
                    <button
                      onClick={() => {
                        if (!resume) return;
                        const newFormatting = { ...sectionFormatting };
                        delete newFormatting[selectedSectionForFormatting];
                        setSectionFormatting(newFormatting);

                        // Update resume customizations
                        const currentCustomizations = ensureCustomizations();
                        const updatedCustomizations = {
                          ...currentCustomizations,
                          sectionFormatting: newFormatting,
                        };
                        const updatedResume = {
                          ...resume,
                          customizations: updatedCustomizations,
                        };
                        setResume(updatedResume);

                        // Auto-save to backend if resume exists
                        if (resumeId && resumeId !== "new") {
                          setIsAutoSaving(true);
                          resumeService
                            .updateResume(resumeId, {
                              customizations: updatedCustomizations,
                            })
                            .then(() => {
                              setLastSaved(new Date());
                            })
                            .catch((err) => {
                              console.error("Auto-save failed:", err);
                            })
                            .finally(() => {
                              setTimeout(() => setIsAutoSaving(false), 500);
                            });
                        }
                      }}
                      className="w-full px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Reset Section Formatting
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Fragment>

      {/* Click outside to close menus */}
      {showPresetMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowPresetMenu(false);
          }}
        />
      )}

      {/* Export Modal */}
      <ResumeExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        defaultFilename={resume?.name || `resume_${resumeId || Date.now()}`}
        isExporting={exporting}
      />

      {/* Import Modal */}
      {showImportModal && importSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  Import from Database -{" "}
                  {importSection.charAt(0).toUpperCase() +
                    importSection.slice(1)}
                </h2>
                {importSection !== "personal" && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-xs px-3 py-1.5 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors flex items-center gap-1"
                    >
                      <Icon icon="mingcute:check-line" className="w-3 h-3" />
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-1"
                    >
                      <Icon icon="mingcute:close-line" className="w-3 h-3" />
                      Deselect All
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {importSection === "personal"
                  ? "Import your profile information into your resume"
                  : "Select items to import into your resume (items already in your resume are disabled)"}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {importSection === "skills" && (
                <div className="space-y-2">
                  {userSkills.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No skills found in your database
                    </p>
                  ) : (
                    userSkills.map((skill) => {
                      const isSelected = selectedItems.skills.includes(
                        skill.id
                      );
                      const isAlreadyInResume = resume?.content.skills?.some(
                        (s: any) =>
                          s.id === skill.id || s.name === skill.skillName
                      );
                      return (
                        <label
                          key={skill.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "border-[#3351FD] bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          } ${isAlreadyInResume ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              toggleItemSelection(skill.id, "skills")
                            }
                            disabled={isAlreadyInResume}
                            className="w-4 h-4 text-[#3351FD] rounded focus:ring-[#3351FD]"
                          />
                          <div className="ml-3 flex-1">
                            <div className="font-medium text-gray-900">
                              {skill.skillName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {skill.category || "Uncategorized"} •{" "}
                              {skill.proficiency}
                            </div>
                          </div>
                          {isAlreadyInResume && (
                            <span className="text-xs text-gray-500">
                              Already added
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              )}

              {importSection === "certifications" && (
                <div className="space-y-2">
                  {userCertifications.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No certifications found in your database
                    </p>
                  ) : (
                    userCertifications.map((cert) => {
                      const isSelected = selectedItems.certifications.includes(
                        cert.id
                      );
                      const isAlreadyInResume =
                        resume?.content.certifications?.some(
                          (c: any) => c.id === cert.id
                        );
                      return (
                        <label
                          key={cert.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "border-[#3351FD] bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          } ${isAlreadyInResume ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              toggleItemSelection(cert.id, "certifications")
                            }
                            disabled={isAlreadyInResume}
                            className="w-4 h-4 text-[#3351FD] rounded focus:ring-[#3351FD]"
                          />
                          <div className="ml-3 flex-1">
                            <div className="font-medium text-gray-900">
                              {cert.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {cert.org_name} •{" "}
                              {formatDateMonthYear(cert.date_earned)}
                            </div>
                          </div>
                          {isAlreadyInResume && (
                            <span className="text-xs text-gray-500">
                              Already added
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              )}

              {importSection === "experience" && (
                <div className="space-y-2">
                  {userJobs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No jobs found in your database
                    </p>
                  ) : (
                    userJobs.map((job) => {
                      const isSelected = selectedItems.jobs.includes(job.id);
                      const isAlreadyInResume =
                        resume?.content.experience?.some(
                          (e: any) => e.id === job.id
                        );
                      return (
                        <label
                          key={job.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "border-[#3351FD] bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          } ${isAlreadyInResume ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItemSelection(job.id, "jobs")}
                            disabled={isAlreadyInResume}
                            className="w-4 h-4 text-[#3351FD] rounded focus:ring-[#3351FD]"
                          />
                          <div className="ml-3 flex-1">
                            <div className="font-medium text-gray-900">
                              {job.title} at {job.company}
                            </div>
                            <div className="text-sm text-gray-500">
                              {job.startDate &&
                                new Date(job.startDate).getFullYear()}{" "}
                              -{" "}
                              {job.isCurrent
                                ? "Present"
                                : job.endDate
                                ? new Date(job.endDate).getFullYear()
                                : ""}
                            </div>
                          </div>
                          {isAlreadyInResume && (
                            <span className="text-xs text-gray-500">
                              Already added
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              )}

              {importSection === "education" && (
                <div className="space-y-2">
                  {userEducation.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No education found in your database
                    </p>
                  ) : (
                    userEducation.map((edu) => {
                      const isSelected = selectedItems.education.includes(
                        edu.id
                      );
                      const isAlreadyInResume = resume?.content.education?.some(
                        (e: any) => e.id === edu.id
                      );
                      return (
                        <label
                          key={edu.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "border-[#3351FD] bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          } ${isAlreadyInResume ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              toggleItemSelection(edu.id, "education")
                            }
                            disabled={isAlreadyInResume}
                            className="w-4 h-4 text-[#3351FD] rounded focus:ring-[#3351FD]"
                          />
                          <div className="ml-3 flex-1">
                            <div className="font-medium text-gray-900">
                              {edu.degreeType} in{" "}
                              {edu.field || "General Studies"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {edu.school} •{" "}
                              {edu.endDate
                                ? new Date(edu.endDate).getFullYear()
                                : "Ongoing"}
                            </div>
                          </div>
                          {isAlreadyInResume && (
                            <span className="text-xs text-gray-500">
                              Already added
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              )}

              {importSection === "projects" && (
                <div className="space-y-2">
                  {userProjects.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No projects found in your database
                    </p>
                  ) : (
                    userProjects.map((proj) => {
                      const isSelected = selectedItems.projects.includes(
                        proj.id
                      );
                      const isAlreadyInResume = resume?.content.projects?.some(
                        (p: any) => p.id === proj.id
                      );
                      return (
                        <label
                          key={proj.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "border-[#3351FD] bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          } ${isAlreadyInResume ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              toggleItemSelection(proj.id, "projects")
                            }
                            disabled={isAlreadyInResume}
                            className="w-4 h-4 text-[#3351FD] rounded focus:ring-[#3351FD]"
                          />
                          <div className="ml-3 flex-1">
                            <div className="font-medium text-gray-900">
                              {proj.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {proj.description?.substring(0, 100)}
                              {proj.description && proj.description.length > 100
                                ? "..."
                                : ""}
                            </div>
                          </div>
                          {isAlreadyInResume && (
                            <span className="text-xs text-gray-500">
                              Already added
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              )}

              {importSection === "personal" && userProfile && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">
                      Profile Information
                    </h3>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p>
                        <strong>Name:</strong> {userProfile.first_name}{" "}
                        {userProfile.last_name}
                      </p>
                      <p>
                        <strong>Email:</strong> {userProfile.email}
                      </p>
                      {userProfile.phone && (
                        <p>
                          <strong>Phone:</strong> {userProfile.phone}
                        </p>
                      )}
                      {userProfile.city && userProfile.state && (
                        <p>
                          <strong>Location:</strong> {userProfile.city},{" "}
                          {userProfile.state}
                        </p>
                      )}
                      {userProfile.bio && (
                        <p>
                          <strong>Bio:</strong> {userProfile.bio}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Click "Import" to populate your resume with this
                    information.
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportSection(null);
                  setSelectedItems({
                    skills: [],
                    certifications: [],
                    jobs: [],
                    education: [],
                    projects: [],
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSelectedItems}
                disabled={
                  importSection === "personal"
                    ? false
                    : selectedItems[importSection as keyof typeof selectedItems]
                        ?.length === 0
                }
                className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import{" "}
                {importSection !== "personal" &&
                  selectedItems[importSection as keyof typeof selectedItems]
                    ?.length > 0 &&
                  `(${
                    selectedItems[importSection as keyof typeof selectedItems]
                      .length
                  })`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Version Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Create New Version
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Create a new version of this resume to experiment with changes
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version Name *
                </label>
                <input
                  type="text"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                  placeholder="e.g., Software Engineer v2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newVersionDescription}
                  onChange={(e) => setNewVersionDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent min-h-[80px]"
                  placeholder="Describe what changes you plan to make in this version"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Job Posting (Optional)
                </label>
                <select
                  value={newVersionJobId}
                  onChange={(e) => setNewVersionJobId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                >
                  <option value="">No specific job (General resume)</option>
                  {userJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} at {job.company}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Link this version to a specific job posting for tailored
                  content
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowVersionModal(false);
                  setNewVersionName("");
                  setNewVersionDescription("");
                  setNewVersionJobId("");
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVersion}
                disabled={!newVersionName.trim()}
                className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Control Modal */}
      {showVersionControl &&
        (versions.length > 0 || resume ? (
          <VersionControl
            versions={versions.length > 0 ? versions : resume ? [resume] : []}
            currentVersionId={resumeId}
            onSelectVersion={(versionId) => {
              handleSwitchVersion(versionId);
              setShowVersionControl(false);
            }}
            onClose={() => setShowVersionControl(false)}
          />
        ) : (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  No Versions Available
                </h2>
                <button
                  onClick={() => setShowVersionControl(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon
                    icon="mingcute:close-line"
                    className="w-5 h-5 text-gray-600"
                  />
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Create at least one version to use version control.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowVersionControl(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowVersionControl(false);
                    setShowVersionModal(true);
                  }}
                  className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors font-medium shadow-md"
                >
                  Create Version
                </button>
              </div>
            </div>
          </div>
        ))}

      {/* Version Comparison Modal */}
      {showVersionCompare && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Compare Versions
                  </h2>
                  <p className="text-sm text-gray-600 mt-1.5">
                    {resume1Data && resume2Data
                      ? "Side-by-side comparison of resume content"
                      : "Select two versions to compare their differences"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowVersionCompare(false);
                    setVersionComparison(null);
                    setResume1Data(null);
                    setResume2Data(null);
                    setSelectedVersion1(null);
                    setSelectedVersion2(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <Icon
                    icon="mingcute:close-line"
                    className="w-5 h-5 text-gray-600 group-hover:text-gray-900"
                  />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              {loadingComparison ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Icon
                      icon="mingcute:loading-line"
                      className="w-8 h-8 animate-spin text-[#3351FD] mx-auto mb-2"
                    />
                    <p className="text-gray-600">Loading comparison...</p>
                  </div>
                </div>
              ) : !resume1Data || !resume2Data ? (
                <div className="p-8 flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
                  <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-[#3351FD]/10 rounded-full mb-4">
                        <Icon
                          icon="mingcute:git-compare-line"
                          className="w-8 h-8 text-[#3351FD]"
                        />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Select Two Versions to Compare
                      </h3>
                      <p className="text-sm text-gray-600">
                        Choose different versions to see side-by-side
                        differences
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      {/* Version 1 Selection */}
                      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-transparent transition-all hover:border-blue-200 hover:shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            Version 1
                          </label>
                          {selectedVersion1 && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                              Selected
                            </span>
                          )}
                        </div>
                        {versions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Icon
                              icon="mingcute:file-line"
                              className="w-8 h-8 mx-auto mb-2 opacity-50"
                            />
                            <p className="text-sm">No versions available</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {versions.map((version) => {
                              const isSelected =
                                selectedVersion1 === version.id;
                              const isDisabled =
                                selectedVersion2 === version.id;
                              return (
                                <button
                                  key={version.id}
                                  onClick={() =>
                                    !isDisabled &&
                                    setSelectedVersion1(version.id)
                                  }
                                  disabled={isDisabled}
                                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                    isSelected
                                      ? "border-[#3351FD] bg-blue-50 shadow-md"
                                      : isDisabled
                                      ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                                      : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-gray-900">
                                          {version.name ||
                                            `Version ${
                                              version.versionNumber || 1
                                            }`}
                                        </span>
                                        {version.isMaster && (
                                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                            Master
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span>
                                          v{version.versionNumber || 1}
                                        </span>
                                        {version.jobId && (
                                          <span className="flex items-center gap-1">
                                            <Icon
                                              icon="mingcute:briefcase-line"
                                              className="w-3 h-3"
                                            />
                                            Job Linked
                                          </span>
                                        )}
                                        <span>
                                          {new Date(
                                            version.createdAt
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <Icon
                                        icon="mingcute:check-circle-fill"
                                        className="w-5 h-5 text-[#3351FD] flex-shrink-0"
                                      />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Version 2 Selection */}
                      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-transparent transition-all hover:border-purple-200 hover:shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                            Version 2
                          </label>
                          {selectedVersion2 && (
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                              Selected
                            </span>
                          )}
                        </div>
                        {versions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Icon
                              icon="mingcute:file-line"
                              className="w-8 h-8 mx-auto mb-2 opacity-50"
                            />
                            <p className="text-sm">No versions available</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {versions.map((version) => {
                              const isSelected =
                                selectedVersion2 === version.id;
                              const isDisabled =
                                selectedVersion1 === version.id;
                              return (
                                <button
                                  key={version.id}
                                  onClick={() =>
                                    !isDisabled &&
                                    setSelectedVersion2(version.id)
                                  }
                                  disabled={isDisabled}
                                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                    isSelected
                                      ? "border-purple-500 bg-purple-50 shadow-md"
                                      : isDisabled
                                      ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                                      : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50"
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-gray-900">
                                          {version.name ||
                                            `Version ${
                                              version.versionNumber || 1
                                            }`}
                                        </span>
                                        {version.isMaster && (
                                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                            Master
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span>
                                          v{version.versionNumber || 1}
                                        </span>
                                        {version.jobId && (
                                          <span className="flex items-center gap-1">
                                            <Icon
                                              icon="mingcute:briefcase-line"
                                              className="w-3 h-3"
                                            />
                                            Job Linked
                                          </span>
                                        )}
                                        <span>
                                          {new Date(
                                            version.createdAt
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <Icon
                                        icon="mingcute:check-circle-fill"
                                        className="w-5 h-5 text-purple-500 flex-shrink-0"
                                      />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                      <div className="space-y-3">
                        <button
                          onClick={() => handleCompareVersions(false)}
                          disabled={
                            !selectedVersion1 ||
                            !selectedVersion2 ||
                            loadingComparison ||
                            selectedVersion1 === selectedVersion2
                          }
                          className="w-full px-6 py-4 bg-gradient-to-r from-[#3351FD] to-[#2a45d4] text-white rounded-lg hover:from-[#2a45d4] hover:to-[#3351FD] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                        >
                          {loadingComparison ? (
                            <>
                              <Icon
                                icon="mingcute:loading-line"
                                className="w-5 h-5 animate-spin"
                              />
                              Loading Comparison...
                            </>
                          ) : (
                            <>
                              <Icon
                                icon="mingcute:git-compare-line"
                                className="w-6 h-6"
                              />
                              Compare Selected Versions
                            </>
                          )}
                        </button>
                        {selectedVersion1 === selectedVersion2 &&
                          selectedVersion1 && (
                            <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <Icon
                                icon="mingcute:alert-line"
                                className="w-4 h-4 text-amber-600"
                              />
                              <p className="text-sm text-amber-700 font-medium">
                                Please select two different versions to compare
                              </p>
                            </div>
                          )}
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => {
                              setShowVersionCompare(false);
                              setShowVersionControl(true);
                            }}
                            disabled={versions.length === 0}
                            className="flex-1 px-4 py-2.5 text-[#3351FD] bg-blue-50 border border-[#3351FD] rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                          >
                            <Icon
                              icon="mingcute:git-branch-line"
                              className="w-4 h-4"
                            />
                            Version Control
                          </button>
                          <button
                            onClick={() => handleCompareVersions(true)}
                            disabled={loadingComparison}
                            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                          >
                            <Icon
                              icon="mingcute:eye-line"
                              className="w-4 h-4"
                            />
                            View Demo
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-hidden flex relative">
                  {/* Divider */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 z-20 transform -translate-x-1/2"></div>

                  {/* Side-by-side resume comparison */}
                  <div className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50/30 to-gray-50 p-6 border-r border-gray-200">
                    <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-2 mb-4 z-10 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {resume1Data.name ||
                              `v${resume1Data.versionNumber || 1}`}
                          </span>
                          {resume1Data.isMaster && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium flex-shrink-0">
                              Master
                            </span>
                          )}
                          {resume1Data.jobId && (
                            <Icon
                              icon="mingcute:briefcase-line"
                              className="w-3.5 h-3.5 text-green-600 flex-shrink-0"
                            />
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setShowVersionCompare(false);
                            handleSwitchVersion(resume1Data.id);
                          }}
                          className="px-2.5 py-1 text-xs bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors font-medium flex items-center gap-1.5 flex-shrink-0 ml-2"
                          title="View this version"
                        >
                          <Icon
                            icon="mingcute:eye-line"
                            className="w-3.5 h-3.5"
                          />
                          View
                        </button>
                      </div>
                    </div>
                    <div
                      className="max-w-2xl mx-auto bg-white shadow-xl p-8 rounded-xl border border-gray-100"
                      style={{
                        fontFamily:
                          resume1Data.customizations?.fonts?.body || "Inter",
                        backgroundColor:
                          resume1Data.customizations?.colors?.background ||
                          "#FFFFFF",
                      }}
                    >
                      {/* Personal Info */}
                      <div className="border-b pb-4 mb-4">
                        <h1
                          className="text-3xl font-bold mb-2"
                          style={{
                            color:
                              resume1Data.customizations?.colors?.primary ||
                              "#3351FD",
                            fontFamily:
                              resume1Data.customizations?.fonts?.heading ||
                              "Inter",
                          }}
                        >
                          {resume1Data.content.personalInfo.firstName}{" "}
                          {resume1Data.content.personalInfo.lastName}
                        </h1>
                        <div className="text-sm text-gray-600">
                          {resume1Data.content.personalInfo.email && (
                            <span>
                              {resume1Data.content.personalInfo.email}
                            </span>
                          )}
                          {resume1Data.content.personalInfo.phone && (
                            <span className="mx-2">•</span>
                          )}
                          {resume1Data.content.personalInfo.phone && (
                            <span>
                              {resume1Data.content.personalInfo.phone}
                            </span>
                          )}
                          {resume1Data.content.personalInfo.location && (
                            <span className="mx-2">•</span>
                          )}
                          {resume1Data.content.personalInfo.location && (
                            <span>
                              {resume1Data.content.personalInfo.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Summary */}
                      {resume1Data.content.summary && (
                        <div className="mb-4">
                          <h2
                            className="text-xl font-semibold mb-2"
                            style={{
                              color:
                                resume1Data.customizations?.colors?.primary ||
                                "#3351FD",
                            }}
                          >
                            Summary
                          </h2>
                          <p className="text-gray-700">
                            {resume1Data.content.summary}
                          </p>
                        </div>
                      )}

                      {/* Experience */}
                      {resume1Data.content.experience &&
                        resume1Data.content.experience.length > 0 && (
                          <div className="mb-4">
                            <h2
                              className="text-xl font-semibold mb-3"
                              style={{
                                color:
                                  resume1Data.customizations?.colors?.primary ||
                                  "#3351FD",
                              }}
                            >
                              Experience
                            </h2>
                            {resume1Data.content.experience.map((exp: any) => (
                              <div key={exp.id} className="mb-4">
                                <h3 className="font-semibold text-gray-900">
                                  {exp.title}
                                </h3>
                                <p className="text-gray-700">{exp.company}</p>
                                <p className="text-sm text-gray-600">
                                  {exp.startDate} -{" "}
                                  {exp.isCurrent
                                    ? "Present"
                                    : exp.endDate || ""}
                                </p>
                                {exp.description &&
                                  exp.description.length > 0 && (
                                    <ul className="list-disc list-inside mt-2 text-gray-700">
                                      {exp.description.map(
                                        (desc: string, idx: number) => (
                                          <li key={idx}>{desc}</li>
                                        )
                                      )}
                                    </ul>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}

                      {/* Education */}
                      {resume1Data.content.education &&
                        resume1Data.content.education.length > 0 && (
                          <div className="mb-4">
                            <h2
                              className="text-xl font-semibold mb-3"
                              style={{
                                color:
                                  resume1Data.customizations?.colors?.primary ||
                                  "#3351FD",
                              }}
                            >
                              Education
                            </h2>
                            {resume1Data.content.education.map((edu: any) => (
                              <div key={edu.id} className="mb-3">
                                <h3 className="font-semibold text-gray-900">
                                  {edu.degree}
                                </h3>
                                <p className="text-gray-700">{edu.school}</p>
                                {edu.field && (
                                  <p className="text-sm text-gray-600">
                                    {edu.field}
                                  </p>
                                )}
                                {edu.endDate && (
                                  <p className="text-sm text-gray-600">
                                    Graduated: {edu.endDate}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                      {/* Skills */}
                      {resume1Data.content.skills &&
                        resume1Data.content.skills.length > 0 && (
                          <div className="mb-4">
                            <h2
                              className="text-xl font-semibold mb-3"
                              style={{
                                color:
                                  resume1Data.customizations?.colors?.primary ||
                                  "#3351FD",
                              }}
                            >
                              Skills
                            </h2>
                            <div className="flex flex-wrap gap-2">
                              {resume1Data.content.skills.map((skill: any) => (
                                <span
                                  key={skill.id}
                                  className="px-3 py-1 rounded text-sm font-medium text-white"
                                  style={{
                                    backgroundColor:
                                      resume1Data.customizations?.colors
                                        ?.primary || "#3351FD",
                                  }}
                                >
                                  {skill.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-gradient-to-br from-purple-50/30 to-gray-50 p-6">
                    <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-2 mb-4 z-10 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></span>
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {resume2Data.name ||
                              `v${resume2Data.versionNumber || 1}`}
                          </span>
                          {resume2Data.isMaster && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium flex-shrink-0">
                              Master
                            </span>
                          )}
                          {resume2Data.jobId && (
                            <Icon
                              icon="mingcute:briefcase-line"
                              className="w-3.5 h-3.5 text-green-600 flex-shrink-0"
                            />
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setShowVersionCompare(false);
                            handleSwitchVersion(resume2Data.id);
                          }}
                          className="px-2.5 py-1 text-xs bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors font-medium flex items-center gap-1.5 flex-shrink-0 ml-2"
                          title="View this version"
                        >
                          <Icon
                            icon="mingcute:eye-line"
                            className="w-3.5 h-3.5"
                          />
                          View
                        </button>
                      </div>
                    </div>
                    <div
                      className="max-w-2xl mx-auto bg-white shadow-xl p-8 rounded-xl border border-gray-100"
                      style={{
                        fontFamily:
                          resume2Data.customizations?.fonts?.body || "Inter",
                        backgroundColor:
                          resume2Data.customizations?.colors?.background ||
                          "#FFFFFF",
                      }}
                    >
                      {/* Personal Info */}
                      <div className="border-b pb-4 mb-4">
                        <h1
                          className="text-3xl font-bold mb-2"
                          style={{
                            color:
                              resume2Data.customizations?.colors?.primary ||
                              "#3351FD",
                            fontFamily:
                              resume2Data.customizations?.fonts?.heading ||
                              "Inter",
                          }}
                        >
                          {resume2Data.content.personalInfo.firstName}{" "}
                          {resume2Data.content.personalInfo.lastName}
                        </h1>
                        <div className="text-sm text-gray-600">
                          {resume2Data.content.personalInfo.email && (
                            <span>
                              {resume2Data.content.personalInfo.email}
                            </span>
                          )}
                          {resume2Data.content.personalInfo.phone && (
                            <span className="mx-2">•</span>
                          )}
                          {resume2Data.content.personalInfo.phone && (
                            <span>
                              {resume2Data.content.personalInfo.phone}
                            </span>
                          )}
                          {resume2Data.content.personalInfo.location && (
                            <span className="mx-2">•</span>
                          )}
                          {resume2Data.content.personalInfo.location && (
                            <span>
                              {resume2Data.content.personalInfo.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Summary */}
                      {resume2Data.content.summary && (
                        <div className="mb-4">
                          <h2
                            className="text-xl font-semibold mb-2"
                            style={{
                              color:
                                resume2Data.customizations?.colors?.primary ||
                                "#3351FD",
                            }}
                          >
                            Summary
                          </h2>
                          <p className="text-gray-700">
                            {resume2Data.content.summary}
                          </p>
                        </div>
                      )}

                      {/* Experience */}
                      {resume2Data.content.experience &&
                        resume2Data.content.experience.length > 0 && (
                          <div className="mb-4">
                            <h2
                              className="text-xl font-semibold mb-3"
                              style={{
                                color:
                                  resume2Data.customizations?.colors?.primary ||
                                  "#3351FD",
                              }}
                            >
                              Experience
                            </h2>
                            {resume2Data.content.experience.map((exp: any) => (
                              <div key={exp.id} className="mb-4">
                                <h3 className="font-semibold text-gray-900">
                                  {exp.title}
                                </h3>
                                <p className="text-gray-700">{exp.company}</p>
                                <p className="text-sm text-gray-600">
                                  {exp.startDate} -{" "}
                                  {exp.isCurrent
                                    ? "Present"
                                    : exp.endDate || ""}
                                </p>
                                {exp.description &&
                                  exp.description.length > 0 && (
                                    <ul className="list-disc list-inside mt-2 text-gray-700">
                                      {exp.description.map(
                                        (desc: string, idx: number) => (
                                          <li key={idx}>{desc}</li>
                                        )
                                      )}
                                    </ul>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}

                      {/* Education */}
                      {resume2Data.content.education &&
                        resume2Data.content.education.length > 0 && (
                          <div className="mb-4">
                            <h2
                              className="text-xl font-semibold mb-3"
                              style={{
                                color:
                                  resume2Data.customizations?.colors?.primary ||
                                  "#3351FD",
                              }}
                            >
                              Education
                            </h2>
                            {resume2Data.content.education.map((edu: any) => (
                              <div key={edu.id} className="mb-3">
                                <h3 className="font-semibold text-gray-900">
                                  {edu.degree}
                                </h3>
                                <p className="text-gray-700">{edu.school}</p>
                                {edu.field && (
                                  <p className="text-sm text-gray-600">
                                    {edu.field}
                                  </p>
                                )}
                                {edu.endDate && (
                                  <p className="text-sm text-gray-600">
                                    Graduated: {edu.endDate}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                      {/* Skills */}
                      {resume2Data.content.skills &&
                        resume2Data.content.skills.length > 0 && (
                          <div className="mb-4">
                            <h2
                              className="text-xl font-semibold mb-3"
                              style={{
                                color:
                                  resume2Data.customizations?.colors?.primary ||
                                  "#3351FD",
                              }}
                            >
                              Skills
                            </h2>
                            <div className="flex flex-wrap gap-2">
                              {resume2Data.content.skills.map((skill: any) => (
                                <span
                                  key={skill.id}
                                  className="px-3 py-1 rounded text-sm font-medium text-white"
                                  style={{
                                    backgroundColor:
                                      resume2Data.customizations?.colors
                                        ?.primary || "#3351FD",
                                  }}
                                >
                                  {skill.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {(!resume1Data || !resume2Data) && (
              <div className="p-6 border-t border-gray-200 bg-white flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowVersionCompare(false);
                    setVersionComparison(null);
                    setResume1Data(null);
                    setResume2Data(null);
                    setSelectedVersion1(null);
                    setSelectedVersion2(null);
                  }}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
            {resume1Data && resume2Data && (
              <div className="p-5 border-t border-gray-200 bg-white flex justify-between items-center">
                <button
                  onClick={() => {
                    setResume1Data(null);
                    setResume2Data(null);
                    setVersionComparison(null);
                    setSelectedVersion1(null);
                    setSelectedVersion2(null);
                  }}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
                >
                  <Icon
                    icon="mingcute:arrow-go-back-line"
                    className="w-4 h-4"
                  />
                  Compare Different Versions
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowVersionCompare(false);
                      setShowVersionControl(true);
                    }}
                    className="px-5 py-2.5 text-[#3351FD] bg-blue-50 border border-[#3351FD] rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 font-medium shadow-sm"
                  >
                    <Icon icon="mingcute:git-branch-line" className="w-4 h-4" />
                    Version Control
                  </button>
                  <button
                    onClick={() => {
                      setShowVersionCompare(false);
                      setVersionComparison(null);
                      setResume1Data(null);
                      setResume2Data(null);
                      setSelectedVersion1(null);
                      setSelectedVersion2(null);
                    }}
                    className="px-5 py-2.5 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors font-medium shadow-md hover:shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Resume Modal */}
      {showImportResumeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Import Resume
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload your existing resume (PDF or DOCX) and we'll extract
                    all the information using AI
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowImportResumeModal(false);
                    setParsedResumeContent(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon
                    icon="mingcute:close-line"
                    className="w-5 h-5 text-gray-600"
                  />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!parsedResumeContent ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#3351FD] transition-colors">
                    <input
                      type="file"
                      id="resume-file-input"
                      accept=".pdf,.docx,.doc"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // Show the parse loader
                        setFileToParse(file);
                        setShowParseLoader(true);
                        setShowImportResumeModal(false);
                      }}
                      className="hidden"
                      disabled={importingResume}
                    />
                    <label
                      htmlFor="resume-file-input"
                      className={`cursor-pointer flex flex-col items-center gap-4 ${
                        importingResume ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {importingResume ? (
                        <>
                          <Icon
                            icon="mingcute:loading-line"
                            className="w-12 h-12 animate-spin text-[#3351FD]"
                          />
                          <div>
                            <p className="text-lg font-medium text-gray-900">
                              Parsing resume with AI...
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              This may take a few moments
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Icon
                            icon="mingcute:file-upload-line"
                            className="w-12 h-12 text-gray-400"
                          />
                          <div>
                            <p className="text-lg font-medium text-gray-900">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              PDF or DOCX files only (max 10MB)
                            </p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Icon
                        icon="mingcute:information-line"
                        className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                      />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">AI-Powered Parsing</p>
                        <p>
                          Our AI will extract all information from your resume
                          including: personal info, experience, education,
                          skills, projects, and certifications.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Icon
                        icon="mingcute:check-circle-line"
                        className="w-5 h-5 text-green-600"
                      />
                      <p className="text-sm font-medium text-green-800">
                        Resume parsed successfully! Review the extracted
                        information below.
                      </p>
                    </div>
                  </div>

                  {/* Preview Parsed Content */}
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {/* Personal Info */}
                    {parsedResumeContent.personalInfo && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          Personal Information
                        </h3>
                        <div className="text-sm text-gray-700 space-y-1">
                          <p>
                            <strong>Name:</strong>{" "}
                            {parsedResumeContent.personalInfo.firstName}{" "}
                            {parsedResumeContent.personalInfo.lastName}
                          </p>
                          {parsedResumeContent.personalInfo.email && (
                            <p>
                              <strong>Email:</strong>{" "}
                              {parsedResumeContent.personalInfo.email}
                            </p>
                          )}
                          {parsedResumeContent.personalInfo.phone && (
                            <p>
                              <strong>Phone:</strong>{" "}
                              {parsedResumeContent.personalInfo.phone}
                            </p>
                          )}
                          {parsedResumeContent.personalInfo.location && (
                            <p>
                              <strong>Location:</strong>{" "}
                              {parsedResumeContent.personalInfo.location}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {parsedResumeContent.summary && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          Summary
                        </h3>
                        <p className="text-sm text-gray-700">
                          {parsedResumeContent.summary}
                        </p>
                      </div>
                    )}

                    {/* Experience */}
                    {parsedResumeContent.experience &&
                      parsedResumeContent.experience.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-3">
                            Experience ({parsedResumeContent.experience.length}{" "}
                            positions)
                          </h3>
                          <div className="space-y-4">
                            {parsedResumeContent.experience
                              .slice(0, 3)
                              .map((exp: any) => (
                                <div
                                  key={exp.id}
                                  className="border-l-2 border-[#3351FD] pl-4 pb-2"
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {exp.title}
                                      </p>
                                      <p className="text-sm text-gray-700">
                                        {exp.company}
                                        {exp.location && ` • ${exp.location}`}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-600 whitespace-nowrap ml-2">
                                      {exp.startDate} -{" "}
                                      {exp.isCurrent
                                        ? "Present"
                                        : exp.endDate || ""}
                                    </p>
                                  </div>
                                  {exp.description &&
                                    exp.description.length > 0 && (
                                      <ul className="text-sm text-gray-700 mt-2 space-y-1 list-disc list-inside">
                                        {exp.description
                                          .slice(0, 3)
                                          .map((desc: string, idx: number) => (
                                            <li key={idx}>{desc}</li>
                                          ))}
                                        {exp.description.length > 3 && (
                                          <li className="text-gray-500 italic">
                                            +{exp.description.length - 3} more
                                            bullet points
                                          </li>
                                        )}
                                      </ul>
                                    )}
                                </div>
                              ))}
                            {parsedResumeContent.experience.length > 3 && (
                              <p className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
                                +{parsedResumeContent.experience.length - 3}{" "}
                                more positions
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Education */}
                    {parsedResumeContent.education &&
                      parsedResumeContent.education.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-3">
                            Education ({parsedResumeContent.education.length}{" "}
                            entries)
                          </h3>
                          <div className="space-y-3">
                            {parsedResumeContent.education.map((edu: any) => (
                              <div
                                key={edu.id}
                                className="border-l-2 border-[#3351FD] pl-4"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {edu.degree}
                                      {edu.field && ` in ${edu.field}`}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                      {edu.school}
                                    </p>
                                  </div>
                                  {edu.endDate && (
                                    <p className="text-xs text-gray-600 whitespace-nowrap ml-2">
                                      {edu.endDate}
                                    </p>
                                  )}
                                </div>
                                {(edu.gpa || edu.honors) && (
                                  <div className="mt-1 text-xs text-gray-600">
                                    {edu.gpa && <span>GPA: {edu.gpa}</span>}
                                    {edu.gpa && edu.honors && <span> • </span>}
                                    {edu.honors && <span>{edu.honors}</span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Skills */}
                    {parsedResumeContent.skills &&
                      parsedResumeContent.skills.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            Skills ({parsedResumeContent.skills.length} skills)
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {parsedResumeContent.skills
                              .slice(0, 10)
                              .map((skill: any) => (
                                <span
                                  key={skill.id}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                >
                                  {skill.name}
                                </span>
                              ))}
                            {parsedResumeContent.skills.length > 10 && (
                              <span className="px-2 py-1 text-gray-500 text-xs">
                                +{parsedResumeContent.skills.length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Projects */}
                    {parsedResumeContent.projects &&
                      parsedResumeContent.projects.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-3">
                            Projects ({parsedResumeContent.projects.length}{" "}
                            projects)
                          </h3>
                          <div className="space-y-3">
                            {parsedResumeContent.projects
                              .slice(0, 3)
                              .map((proj: any) => (
                                <div
                                  key={proj.id}
                                  className="border-l-2 border-[#3351FD] pl-4"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900">
                                        {proj.name}
                                      </p>
                                      {proj.description && (
                                        <p className="text-sm text-gray-700 mt-1">
                                          {proj.description.length > 150
                                            ? `${proj.description.substring(
                                                0,
                                                150
                                              )}...`
                                            : proj.description}
                                        </p>
                                      )}
                                    </div>
                                    {proj.link && (
                                      <a
                                        href={proj.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-[#3351FD] hover:underline ml-2 whitespace-nowrap"
                                      >
                                        View →
                                      </a>
                                    )}
                                  </div>
                                  {proj.technologies &&
                                    proj.technologies.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {proj.technologies
                                          .slice(0, 5)
                                          .map((tech: string, idx: number) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                            >
                                              {tech}
                                            </span>
                                          ))}
                                        {proj.technologies.length > 5 && (
                                          <span className="px-2 py-0.5 text-gray-500 text-xs">
                                            +{proj.technologies.length - 5} more
                                          </span>
                                        )}
                                      </div>
                                    )}
                                </div>
                              ))}
                            {parsedResumeContent.projects.length > 3 && (
                              <p className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
                                +{parsedResumeContent.projects.length - 3} more
                                projects
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Certifications */}
                    {parsedResumeContent.certifications &&
                      parsedResumeContent.certifications.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-3">
                            Certifications (
                            {parsedResumeContent.certifications.length}{" "}
                            certifications)
                          </h3>
                          <div className="space-y-2">
                            {parsedResumeContent.certifications.map(
                              (cert: any) => (
                                <div
                                  key={cert.id}
                                  className="border-l-2 border-[#3351FD] pl-4"
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {cert.name}
                                      </p>
                                      <p className="text-sm text-gray-700">
                                        {cert.organization}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-600 whitespace-nowrap ml-2">
                                      {formatDateMonthYear(cert.dateEarned)}
                                      {cert.expirationDate &&
                                        ` - ${formatDateMonthYear(
                                          cert.expirationDate
                                        )}`}
                                    </p>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportResumeModal(false);
                  setParsedResumeContent(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {parsedResumeContent ? "Cancel" : "Close"}
              </button>
              {parsedResumeContent && (
                <>
                  <button
                    onClick={() => {
                      setParsedResumeContent(null);
                      const input = document.getElementById(
                        "resume-file-input"
                      ) as HTMLInputElement;
                      if (input) input.value = "";
                    }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Upload Different File
                  </button>
                  <button
                    onClick={async () => {
                      if (!resume || !parsedResumeContent) return;

                      try {
                        // Merge parsed content with existing resume
                        const newContent = {
                          ...resume.content,
                          personalInfo: {
                            ...resume.content.personalInfo,
                            ...parsedResumeContent.personalInfo,
                          },
                          summary:
                            parsedResumeContent.summary ||
                            resume.content.summary,
                          experience: [
                            ...(resume.content.experience || []),
                            ...(parsedResumeContent.experience || []),
                          ],
                          education: [
                            ...(resume.content.education || []),
                            ...(parsedResumeContent.education || []),
                          ],
                          skills: [
                            ...(resume.content.skills || []),
                            ...(parsedResumeContent.skills || []),
                          ],
                          projects: [
                            ...(resume.content.projects || []),
                            ...(parsedResumeContent.projects || []),
                          ],
                          certifications: [
                            ...(resume.content.certifications || []),
                            ...(parsedResumeContent.certifications || []),
                          ],
                        };

                        const updatedResume = {
                          ...resume,
                          content: newContent,
                        };
                        setResume(updatedResume);

                        // Auto-save if resume exists
                        if (resumeId && resumeId !== "new") {
                          setIsAutoSaving(true);
                          resumeService
                            .updateResume(resumeId, {
                              content: newContent,
                            })
                            .then(() => {
                              setLastSaved(new Date());
                              showToast(
                                "Resume imported successfully!",
                                "success"
                              );
                            })
                            .catch((err) => {
                              console.error("Auto-save failed:", err);
                              showToast(
                                "Failed to save imported content. Please try again.",
                                "error"
                              );
                            })
                            .finally(() => {
                              setTimeout(() => setIsAutoSaving(false), 500);
                            });
                        } else {
                          showToast(
                            "Resume imported! Save the resume to persist changes.",
                            "success"
                          );
                        }

                        setShowImportResumeModal(false);
                        setParsedResumeContent(null);
                      } catch (err: any) {
                        console.error("Failed to import resume:", err);
                        showToast(
                          "Failed to import resume. Please try again.",
                          "error"
                        );
                      }
                    }}
                    className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors"
                  >
                    Import to Resume
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resume Parse Loader */}
      {showParseLoader && fileToParse && (
        <ResumeParseLoader
          file={fileToParse}
          onComplete={async (parsedContent) => {
            setShowParseLoader(false);
            setFileToParse(null);

            // Create a resume from the parsed content
            try {
              // First, create or get the resume
              let currentResumeId = resumeId;

              if (!currentResumeId || currentResumeId === "new") {
                // Create a new resume using ResumeInput
                const resumeInput = {
                  name:
                    `Resume - ${parsedContent.personalInfo?.firstName || ""} ${
                      parsedContent.personalInfo?.lastName || ""
                    }`.trim() || "Imported Resume",
                  content: {
                    personalInfo: parsedContent.personalInfo || {
                      firstName: "",
                      lastName: "",
                      email: "",
                    },
                    summary: parsedContent.summary || "",
                    experience: parsedContent.experience || [],
                    education: parsedContent.education || [],
                    skills: parsedContent.skills || [],
                    projects: parsedContent.projects || [],
                    certifications: parsedContent.certifications || [],
                  },
                };

                setParsedResumeContent(parsedContent);

                // Save the resume to get an ID
                try {
                  const createResponse = await resumeService.createResume(
                    resumeInput
                  );
                  if (createResponse.ok && createResponse.data?.resume) {
                    const savedResume = createResponse.data.resume;
                    currentResumeId = savedResume.id;
                    setResume(savedResume);
                    navigate(`${ROUTES.RESUME_BUILDER}?id=${currentResumeId}`, {
                      replace: true,
                    });
                  }
                } catch (err) {
                  console.error("Failed to save resume:", err);
                  // Continue with "new" resume ID
                }
              } else {
                // Update existing resume
                if (resume) {
                  const updatedContent = {
                    ...resume.content,
                    personalInfo: {
                      ...resume.content.personalInfo,
                      ...parsedContent.personalInfo,
                    },
                    summary: parsedContent.summary || resume.content.summary,
                    experience: [
                      ...(resume.content.experience || []),
                      ...(parsedContent.experience || []),
                    ],
                    education: [
                      ...(resume.content.education || []),
                      ...(parsedContent.education || []),
                    ],
                    skills: [
                      ...(resume.content.skills || []),
                      ...(parsedContent.skills || []),
                    ],
                    projects: [
                      ...(resume.content.projects || []),
                      ...(parsedContent.projects || []),
                    ],
                    certifications: [
                      ...(resume.content.certifications || []),
                      ...(parsedContent.certifications || []),
                    ],
                  };

                  const updatedResume = {
                    ...resume,
                    content: updatedContent,
                  };

                  setResume(updatedResume);

                  // Save to backend
                  try {
                    await resumeService.updateResume(currentResumeId, {
                      content: updatedContent,
                    });
                  } catch (err) {
                    console.error("Failed to save resume:", err);
                  }
                }
              }

              // Trigger auto-analysis of the resume
              if (currentResumeId && currentResumeId !== "new") {
                // Open the AI panel and trigger auto-analysis
                // The AI will automatically analyze the resume and display the response in chat
                setShowAIPanel(true);
                setShouldAutoAnalyzeResume(true);
                showToast("Resume imported! Analyzing with AI...", "info");
              } else {
                // For new resumes, just open the AI panel
                setShowAIPanel(true);
                showToast("Resume imported successfully!", "success");
              }
            } catch (err: any) {
              console.error("Failed to process parsed resume:", err);
              showToast(
                err.message ||
                  "Failed to process parsed resume. Please try again.",
                "error"
              );
            }
          }}
          onError={(error) => {
            setShowParseLoader(false);
            setFileToParse(null);
            showToast(error, "error");
          }}
        />
      )}
    </div>
  );
}
