import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../config/routes";
import { ResumeTemplate, Resume } from "../types";
import { resumeService } from "../services/resumeService";

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
          setTemplates(response.data.templates);
        }
      } catch (err: any) {
        // If API fails, use mock data for preview
        console.log(
          "API not available, using mock data for preview:",
          err.message
        );
        setTemplates([
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
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [selectedType]);

  const handleSelectTemplate = (templateId: string) => {
    const createNew = searchParams.get("create") === "true";
    if (createNew) {
      navigate(`${ROUTES.RESUME_BUILDER}?templateId=${templateId}`);
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
      alert(err.message || "Failed to parse resume. Please try again.");
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-[#3351FD]"
          />
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Resume Templates
              </h1>
              <p className="text-gray-600 mt-1">
                Choose a template to create your resume
              </p>
            </div>
            <button
              onClick={handleCreateFromResume}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <Icon icon="mingcute:upload-line" className="w-5 h-5" />
              Import from Resume
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setSelectedType("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === "all"
                  ? "bg-[#3351FD] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              All Templates
            </button>
            <button
              onClick={() => setSelectedType("chronological")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === "chronological"
                  ? "bg-[#3351FD] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Chronological
            </button>
            <button
              onClick={() => setSelectedType("functional")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === "functional"
                  ? "bg-[#3351FD] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Functional
            </button>
            <button
              onClick={() => setSelectedType("hybrid")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === "hybrid"
                  ? "bg-[#3351FD] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Hybrid
            </button>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const colors = parseColors(template.colors);
            return (
              <div
                key={template.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Template Preview */}
                <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white opacity-90 p-4">
                    <div
                      className="h-full border-2 rounded p-4"
                      style={{ borderColor: colors.primary }}
                    >
                      {/* Mock Resume Preview */}
                      <div className="space-y-3">
                        <div
                          className="h-4 rounded w-3/4"
                          style={{ backgroundColor: colors.primary }}
                        ></div>
                        <div className="h-2 bg-gray-300 rounded w-full"></div>
                        <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                        <div className="mt-4 space-y-2">
                          <div
                            className="h-3 rounded w-1/2"
                            style={{ backgroundColor: colors.secondary }}
                          ></div>
                          <div className="h-2 bg-gray-300 rounded w-full"></div>
                          <div className="h-2 bg-gray-300 rounded w-4/5"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {template.isDefault && (
                    <div className="absolute top-4 right-4 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                      Default
                    </div>
                  )}
                </div>

                {/* Template Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {template.templateName}
                    </h3>
                    {template.templateType && (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded capitalize">
                        {template.templateType}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {template.description || "Professional resume template"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSelectTemplate(template.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                    >
                      <Icon icon="mingcute:add-line" className="w-5 h-5" />
                      Use Template
                    </button>
                    <button
                      onClick={() => setPreviewTemplateId(template.id)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Preview"
                    >
                      <Icon
                        icon="mingcute:eye-line"
                        className="w-5 h-5 text-gray-700"
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Icon
              icon="mingcute:file-line"
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No templates found
            </h3>
            <p className="text-gray-600">
              Try selecting a different template type
            </p>
          </div>
        )}

        {/* Template Preview Modal */}
        {previewTemplateId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold">Template Preview</h2>
                <button
                  onClick={handlePreviewClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon icon="mingcute:close-line" className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <iframe
                  src={`${
                    import.meta.env.VITE_API_URL || "/api/v1"
                  }/resumes/templates/${previewTemplateId}/preview`}
                  className="w-full h-full min-h-[600px] border-0"
                  title="Template Preview"
                />
              </div>
            </div>
          </div>
        )}

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
