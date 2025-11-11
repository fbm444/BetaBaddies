import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../config/routes";
import { ResumeTemplate, Resume } from "../types";
import { resumeService } from "../services/resumeService";
import { Toast } from "../components/resume/Toast";
import { TemplatePreview } from "../components/resume/TemplatePreview";

export function ResumeTemplates() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<
    "all" | "chronological" | "functional" | "hybrid"
  >("all");
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    null
  );
  const [showImportResumeModal, setShowImportResumeModal] = useState(false);
  const [availableResumes, setAvailableResumes] = useState<Resume[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Fetch templates from API (or use mock data if API fails)
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await resumeService.getTemplates(
          selectedType === "all" ? undefined : selectedType
        );
        if (response.ok && response.data) {
          let fetchedTemplates = response.data.templates || [];
          if (selectedType !== "all") {
            fetchedTemplates = fetchedTemplates.filter(
              (template: ResumeTemplate) => template.templateType === selectedType
            );
          }
          setTemplates(fetchedTemplates);
        }
      } catch (err: any) {
        // If API fails, use mock data for preview
        console.log(
          "API not available, using mock data for preview:",
          err.message
        );
        const fallbackTemplates: ResumeTemplate[] = [
          {
            id: "default-chronological",
            templateName: "Modern Chronological",
            templateType: "chronological",
            description:
              "Traditional format highlighting work history in reverse chronological order. Best for candidates with steady career progression.",
            colors: JSON.stringify({
              primary: "#3351FD",
              secondary: "#000000",
              text: "#000000",
              background: "#FFFFFF",
              accent: "#F5F5F5",
            }),
            fonts: JSON.stringify({
              heading: "Inter",
              body: "Inter",
              size: { heading: "24px", body: "12px" },
            }),
            sectionOrder: [
              "personal",
              "summary",
              "experience",
              "education",
              "skills",
              "projects",
              "certifications",
            ],
            isDefault: true,
            isShared: true,
            layoutConfig: {
              spacing: { section: 24, item: 12 },
              alignment: "left",
              headerStyle: "centered",
            } as any,
            existingResumeTemplate: null,
          },
          {
            id: "default-functional",
            templateName: "Functional Focus",
            templateType: "functional",
            description:
              "Skills-focused format emphasizing abilities over work history. Ideal for career changers or those with employment gaps.",
            colors: JSON.stringify({
              primary: "#000000",
              secondary: "#3351FD",
              text: "#000000",
              background: "#FFFFFF",
              accent: "#F0F0F0",
            }),
            fonts: JSON.stringify({
              heading: "Roboto",
              body: "Roboto",
              size: { heading: "22px", body: "11px" },
            }),
            sectionOrder: [
              "personal",
              "summary",
              "skills",
              "experience",
              "education",
              "projects",
            ],
            isDefault: true,
            isShared: true,
            layoutConfig: {
              spacing: { section: 20, item: 10 },
              alignment: "left",
              headerStyle: "left-aligned",
            },
            existingResumeTemplate: null,
          },
          {
            id: "default-hybrid",
            templateName: "Hybrid Professional",
            templateType: "hybrid",
            description:
              "Combines chronological and functional elements. Highlights both skills and work history. Great for experienced professionals.",
            colors: JSON.stringify({
              primary: "#000000",
              secondary: "#666666",
              text: "#000000",
              background: "#FFFFFF",
              accent: "#E8E8E8",
            }),
            fonts: JSON.stringify({
              heading: "Georgia",
              body: "Georgia",
              size: { heading: "26px", body: "13px" },
            }),
            sectionOrder: [
              "personal",
              "summary",
              "experience",
              "skills",
              "education",
              "projects",
              "certifications",
            ],
            isDefault: true,
            isShared: true,
            layoutConfig: {
              spacing: { section: 28, item: 14 },
              alignment: "justified",
              headerStyle: "centered",
            },
            existingResumeTemplate: null,
          },
          {
            id: "default-minimal",
            templateName: "Minimal Clean",
            templateType: "chronological",
            description:
              "Clean, minimalist design with plenty of white space. Perfect for creative professionals and tech roles.",
            colors: JSON.stringify({
              primary: "#000000",
              secondary: "#333333",
              text: "#000000",
              background: "#FFFFFF",
              accent: "#FAFAFA",
            }),
            fonts: JSON.stringify({
              heading: "Helvetica",
              body: "Helvetica",
              size: { heading: "20px", body: "11px" },
            }),
            sectionOrder: [
              "personal",
              "summary",
              "experience",
              "education",
              "skills",
            ],
            isDefault: true,
            isShared: true,
            layoutConfig: {
              spacing: { section: 30, item: 15 },
              alignment: "left",
              headerStyle: "centered",
            },
            existingResumeTemplate: null,
          },
          {
            id: "default-executive",
            templateName: "Executive Classic",
            templateType: "chronological",
            description:
              "Professional, traditional format for senior-level positions. Emphasizes leadership and achievements.",
            colors: JSON.stringify({
              primary: "#1A1A1A",
              secondary: "#4A4A4A",
              text: "#000000",
              background: "#FFFFFF",
              accent: "#F8F8F8",
            }),
            fonts: JSON.stringify({
              heading: "Times New Roman",
              body: "Times New Roman",
              size: { heading: "28px", body: "12px" },
            }),
            sectionOrder: [
              "personal",
              "summary",
              "experience",
              "education",
              "certifications",
              "skills",
            ],
            isDefault: true,
            isShared: true,
            layoutConfig: {
              spacing: { section: 25, item: 12 },
              alignment: "left",
              headerStyle: "centered",
            },
            existingResumeTemplate: null,
          },
        ];

        if (selectedType === "all") {
          setTemplates(fallbackTemplates);
        } else {
          setTemplates(
            fallbackTemplates.filter(
              (template) => template.templateType === selectedType
            )
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [selectedType]);

  const handleSelectTemplate = (templateId: string) => {
    const createNew = searchParams.get("create") === "true";
    const jobId = searchParams.get("jobId");
    if (createNew) {
      if (jobId) {
        // Navigate to AI tailoring loader for job-based resumes
        navigate(`${ROUTES.RESUME_AI_TAILORING}?templateId=${templateId}&jobId=${jobId}`);
      } else {
        // Regular resume creation
        navigate(`${ROUTES.RESUME_BUILDER}?templateId=${templateId}`);
      }
    } else {
      // Preview template
      setPreviewTemplateId(templateId);
    }
  };

  const handlePreviewClose = () => {
    setPreviewTemplateId(null);
  };

  const handleCreateFromResume = async () => {
    try {
      setIsLoadingResumes(true);
      setShowImportResumeModal(true);
      
      // Fetch available resumes
      const response = await resumeService.getResumes();
      if (response.ok && response.data) {
        setAvailableResumes(response.data.resumes);
      } else {
        setAvailableResumes([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch resumes:", err);
      setAvailableResumes([]);
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const handleSelectResumeToImport = (resumeId: string) => {
    // Navigate to resume builder with importFromId parameter
    navigate(`${ROUTES.RESUME_BUILDER}?importFromId=${resumeId}`);
    setShowImportResumeModal(false);
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploadingFile(true);
      
      // Parse the uploaded file
      const response = await resumeService.parseResume(file);
      
      if (response.ok && response.data) {
        // Navigate to resume builder with parsed content
        // We'll pass the content via state or URL params
        // For now, navigate and let ResumeBuilder handle it via a special parameter
        navigate(`${ROUTES.RESUME_BUILDER}?uploaded=true`);
        setShowImportResumeModal(false);
        
        // Store parsed content in sessionStorage temporarily
        sessionStorage.setItem('uploadedResumeContent', JSON.stringify(response.data.content));
      }
    } catch (err: any) {
      console.error("Failed to parse uploaded resume:", err);
      setToast({
        message: err.message || "Failed to parse resume. Please try again.",
        type: "error",
      });
    } finally {
      setIsUploadingFile(false);
    }
  };

  const parseColors = (colors: string | object | undefined) => {
    if (!colors)
      return {
        primary: "#3351FD",
        secondary: "#000",
        text: "#000",
        background: "#fff",
      };
    if (typeof colors === "string") {
      try {
        return JSON.parse(colors);
      } catch {
        return {
          primary: "#3351FD",
          secondary: "#000",
          text: "#000",
          background: "#fff",
        };
      }
    }
    return colors;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6FB] flex items-center justify-center font-poppins">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-[#5B72FF]"
          />
          <p className="mt-4 text-[#6F7A97]">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F6FB] flex items-center justify-center font-poppins">
        <div className="text-center">
          <Icon
            icon="mingcute:alert-circle-line"
            className="w-12 h-12 mx-auto text-red-500 mb-4"
          />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-full bg-[#5B72FF] text-white hover:bg-[#4a62ef] transition-colors"
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[36px] leading-tight font-semibold text-[#0F172A]">
                Resume Templates
              </h1>
              <p className="text-base text-[#6F7A97] mt-1.5">
                Choose a template to create your resume
              </p>
            </div>
            <button
              onClick={handleCreateFromResume}
              className="flex items-center gap-2 px-6 py-3 rounded-full border border-[#DDE2F2] bg-white text-[#1B2559] hover:bg-[#F8FAFF] transition-colors text-sm font-medium"
            >
              <Icon icon="mingcute:upload-line" className="w-5 h-5" />
              Import from Resume
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setSelectedType("all")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedType === "all"
                  ? "bg-black text-white"
                  : "bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]"
              }`}
            >
              All Templates
            </button>
            <button
              onClick={() => setSelectedType("chronological")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedType === "chronological"
                  ? "bg-black text-white"
                  : "bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]"
              }`}
            >
              Chronological
            </button>
            <button
              onClick={() => setSelectedType("functional")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedType === "functional"
                  ? "bg-black text-white"
                  : "bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]"
              }`}
            >
              Functional
            </button>
            <button
              onClick={() => setSelectedType("hybrid")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedType === "hybrid"
                  ? "bg-black text-white"
                  : "bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]"
              }`}
            >
              Hybrid
            </button>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            return (
              <div
                key={template.id}
                className="bg-white rounded-[26px] border border-[#E2E8F8] transition-all overflow-hidden flex flex-col hover:border-[#C3CCE8]"
              >
                {/* Template Preview */}
                <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white opacity-90 p-4">
                    <div
                      className="h-full border-2 rounded p-4"
                      style={{ 
                        borderColor: (() => {
                          const colors = typeof template.colors === 'string' 
                            ? JSON.parse(template.colors) 
                            : template.colors || {};
                          return colors.primary || "#3351FD";
                        })()
                      }}
                    >
                      {/* Mock Resume Preview */}
                      <div className="space-y-3">
                        <div
                          className="h-4 rounded w-3/4"
                          style={{ 
                            backgroundColor: (() => {
                              const colors = typeof template.colors === 'string' 
                                ? JSON.parse(template.colors) 
                                : template.colors || {};
                              return colors.primary || "#3351FD";
                            })()
                          }}
                        ></div>
                        <div className="h-2 bg-gray-300 rounded w-full"></div>
                        <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                        <div className="mt-4 space-y-2">
                          <div
                            className="h-3 rounded w-1/2"
                            style={{ 
                              backgroundColor: (() => {
                                const colors = typeof template.colors === 'string' 
                                  ? JSON.parse(template.colors) 
                                  : template.colors || {};
                                return colors.secondary || "#000000";
                              })()
                            }}
                          ></div>
                          <div className="h-2 bg-gray-300 rounded w-full"></div>
                          <div className="h-2 bg-gray-300 rounded w-4/5"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {template.templateName === "Modern Chronological" && (
                    <div className="absolute top-4 right-4 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                      Default
                    </div>
                  )}
                </div>

                {/* Template Info */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-[#0F172A]">
                      {template.templateName}
                    </h3>
                    {template.templateType && (
                      <span
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-full capitalize ${
                          template.templateType === "chronological"
                            ? "bg-[#E9ECFF] text-[#4A5AFF]"
                            : template.templateType === "functional"
                            ? "bg-[#E8FFF4] text-[#1E9B6C]"
                            : template.templateType === "hybrid"
                            ? "bg-[#FFF2E6] text-[#E07835]"
                            : "bg-[#EEF1F7] text-[#44506C]"
                        }`}
                      >
                        {template.templateType}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#6F7A97] mb-3 line-clamp-3">
                    {template.description || "Professional resume template"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[#8A94AD] mb-4">
                    <span className="flex items-center gap-1">
                      <Icon icon="mingcute:layout-4-line" className="w-3 h-3" />
                      {template.sectionOrder?.length || 5} sections
                    </span>
                    {template.colors && (
                      <span className="flex items-center gap-1">
                        <Icon icon="mingcute:palette-line" className="w-3 h-3" />
                        Custom palette
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSelectTemplate(template.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5B72FF] text-white rounded-full hover:bg-[#4a62ef] transition-colors text-sm font-semibold"
                    >
                      <Icon icon="mingcute:layout-4-line" className="w-5 h-5" />
                      Use Template
                    </button>
                    <button
                      onClick={() => setPreviewTemplateId(template.id)}
                      className="px-3 py-2.5 border border-[#DDE2F2] rounded-full hover:bg-white transition-colors"
                      title="Preview"
                    >
                      <Icon
                        icon="mingcute:eye-line"
                        className="w-5 h-5 text-[#1B2559]"
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12 bg-white rounded-[28px] border border-dashed border-[#DCE1F1]">
            <Icon
              icon="mingcute:file-line"
              className="w-16 h-16 mx-auto text-[#C2CAE6] mb-4"
            />
            <h3 className="text-xl font-semibold text-[#0F172A] mb-2">
              No templates found
            </h3>
            <p className="text-[#6F7A97]">
              Try selecting a different template type
            </p>
          </div>
        )}

        {/* Template Preview Modal */}
        {previewTemplateId && (() => {
          const previewTemplate = templates.find(t => t.id === previewTemplateId);
          if (!previewTemplate) return null;
          
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-[#3351FD] to-purple-600 text-white">
                  <div>
                    <h2 className="text-2xl font-bold">Template Preview</h2>
                    <p className="text-white/80 text-sm mt-1">
                      {previewTemplate.templateName}
                    </p>
                  </div>
                  <button
                    onClick={handlePreviewClose}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Icon icon="mingcute:close-line" className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-8 bg-gray-50">
                  <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8">
                    <TemplatePreview template={previewTemplate} scale={1.0} />
                  </div>
                </div>
                <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-end gap-3">
                  <button
                    onClick={handlePreviewClose}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleSelectTemplate(previewTemplateId);
                      handlePreviewClose();
                    }}
                    className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors font-medium flex items-center gap-2"
                  >
                    <Icon icon="mingcute:add-line" className="w-4 h-4" />
                    Use This Template
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Import Resume Modal */}
        {showImportResumeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Import from Existing Resume
                </h2>
                <button
                  onClick={() => setShowImportResumeModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon
                    icon="mingcute:close-line"
                    className="w-5 h-5 text-gray-600"
                  />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* File Upload Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Upload Resume File
                  </h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#3351FD] transition-colors">
                    <input
                      type="file"
                      id="resume-file-upload"
                      accept=".pdf,.docx,.doc"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await handleFileUpload(file);
                      }}
                      className="hidden"
                      disabled={isUploadingFile}
                    />
                    <label
                      htmlFor="resume-file-upload"
                      className={`cursor-pointer flex flex-col items-center gap-3 ${
                        isUploadingFile ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isUploadingFile ? (
                        <>
                          <Icon
                            icon="mingcute:loading-line"
                            className="w-10 h-10 animate-spin text-[#3351FD]"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Parsing resume with AI...
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              This may take a few moments
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Icon
                            icon="mingcute:file-upload-line"
                            className="w-10 h-10 text-gray-400"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              PDF or DOCX files only (max 10MB)
                            </p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                    <div className="flex items-start gap-2">
                      <Icon
                        icon="mingcute:information-line"
                        className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
                      />
                      <p className="text-xs text-blue-800">
                        Our AI will extract all information from your resume
                        including: personal info, experience, education, skills,
                        projects, and certifications.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">OR</span>
                  </div>
                </div>

                {/* Existing Resumes Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Import from Existing Resume
                  </h3>
                  {isLoadingResumes ? (
                    <div className="flex items-center justify-center py-12">
                      <Icon
                        icon="mingcute:loading-line"
                        className="w-8 h-8 animate-spin text-[#3351FD]"
                      />
                      <p className="ml-3 text-gray-600">Loading resumes...</p>
                    </div>
                  ) : availableResumes.length === 0 ? (
                    <div className="text-center py-8">
                      <Icon
                        icon="mingcute:file-line"
                        className="w-10 h-10 mx-auto text-gray-400 mb-3"
                      />
                      <p className="text-sm text-gray-600 mb-1">No resumes found</p>
                      <p className="text-xs text-gray-500">
                        Create a resume first to import from it
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableResumes.map((resume) => (
                        <button
                          key={resume.id}
                          onClick={() => handleSelectResumeToImport(resume.id)}
                          className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-[#3351FD] hover:bg-blue-50 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">
                                {resume.name || resume.versionName || "Untitled Resume"}
                              </h3>
                              {resume.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {resume.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                {resume.isMaster && (
                                  <span className="flex items-center gap-1">
                                    <Icon icon="mingcute:star-fill" className="w-3 h-3" />
                                    Master
                                  </span>
                                )}
                                <span>
                                  Updated:{" "}
                                  {new Date(resume.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Icon
                              icon="mingcute:arrow-right-line"
                              className="w-5 h-5 text-gray-400"
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
