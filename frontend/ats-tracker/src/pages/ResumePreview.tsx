import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../config/routes";
import { Resume } from "../types";
import { resumeService } from "../services/resumeService";
import { Toast } from "../components/resume/Toast";
import { AIAssistantChat } from "../components/resume/AIAssistantChat";

export function ResumePreview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get("id");
  const jobId = searchParams.get("jobId");
  const aiExplanation = searchParams.get("aiExplanation");

  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Helper function to validate UUID format
  const isValidUUID = (id: string | null): boolean => {
    if (!id || id === "new") return false;
    // Check for common route names that shouldn't be treated as IDs
    if (["templates", "builder", "preview", "ai-tailoring"].includes(id)) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  // Helper function to safely get decoded explanation
  // URLSearchParams.get() already decodes the parameter, but if it contains
  // characters that look like encoded sequences (e.g., % followed by non-hex),
  // we need to handle potential decoding errors gracefully
  const getDecodedExplanation = (str: string | null): string | undefined => {
    if (!str) return undefined;
    // URLSearchParams.get() already decoded it, but if the original string
    // contained % characters that aren't part of valid encoding, we might
    // need to handle edge cases. For now, use as-is since URLSearchParams
    // handles standard encoding/decoding.
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

  // Get enabled sections in order
  const getEnabledSections = (resumeData: Resume) => {
    const sectionConfig = resumeData.sectionConfig || {};
    const sectionOrder = [
      { id: "personal", label: "Personal Info" },
      { id: "summary", label: "Summary" },
      { id: "experience", label: "Experience" },
      { id: "education", label: "Education" },
      { id: "skills", label: "Skills" },
      { id: "projects", label: "Projects" },
      { id: "certifications", label: "Certifications" },
    ];

    return sectionOrder
      .filter((section) => {
        const config = sectionConfig[section.id];
        return config?.enabled !== false;
      })
      .sort((a, b) => {
        const orderA = sectionConfig[a.id]?.order ?? 999;
        const orderB = sectionConfig[b.id]?.order ?? 999;
        return orderA - orderB;
      });
  };

  // Fetch resume data
  useEffect(() => {
    const fetchResume = async () => {
      if (!resumeId) {
        setIsLoading(false);
        return;
      }

      // Validate UUID before making API call
      if (!isValidUUID(resumeId)) {
        console.error("Invalid resume ID format:", resumeId);
        setToast({
          message: "Invalid resume ID. Please select a valid resume.",
          type: "error",
        });
        setIsLoading(false);
        setTimeout(() => {
          navigate(ROUTES.RESUMES);
        }, 2000);
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await resumeService.getResume(resumeId);
        if (response.ok && response.data?.resume) {
          setResume(response.data.resume);
          // Auto-open AI panel if explanation is provided
          if (aiExplanation) {
            setTimeout(() => {
              setShowAIPanel(true);
      }, 500);
    }
        } else {
          setToast({
            message: response.error?.message || "Failed to load resume",
            type: "error",
          });
        }
      } catch (err: any) {
        console.error("Failed to fetch resume:", err);
        setToast({
          message: err.message || "Failed to load resume",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchResume();
  }, [resumeId, aiExplanation, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'txt' | 'html') => {
    if (!resumeId) return;
    
    try {
      setExporting(true);
      setShowExportMenu(false);
      
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
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mingcute:loading-line" className="w-12 h-12 animate-spin mx-auto text-[#3351FD]" />
          <p className="mt-4 text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mingcute:alert-line" className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Resume not found</h3>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(ROUTES.RESUMES)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="mingcute:arrow-left-line" className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{resume.name || resume.versionName}</h1>
                <p className="text-xs text-gray-500">Preview Mode</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {aiExplanation && (
                <button
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    showAIPanel
                      ? "bg-[#3351FD] text-white"
                      : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                  }`}
                >
                  <Icon icon="mingcute:ai-fill" className="w-4 h-4 inline mr-2" />
                  {showAIPanel ? "Hide AI" : "View AI Explanation"}
                </button>
              )}
              <button
                onClick={() => navigate(`${ROUTES.RESUME_BUILDER}?id=${resume.id}`)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Icon icon="mingcute:edit-line" className="w-4 h-4 inline mr-2" />
                Edit
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <Icon icon="mingcute:loading-line" className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Icon icon="mingcute:download-line" className="w-4 h-4" />
                      Export
                      <Icon icon="mingcute:arrow-down-line" className="w-3 h-3" />
                    </>
                  )}
                </button>
                {showExportMenu && !exporting && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100"
                    >
                      <Icon icon="mingcute:file-pdf-line" className="w-4 h-4 text-red-600" />
                      Export as PDF
                    </button>
                    <button
                      onClick={() => handleExport('docx')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100"
                    >
                      <Icon icon="mingcute:file-word-line" className="w-4 h-4 text-blue-600" />
                      Export as DOCX
                    </button>
                    <button
                      onClick={() => handleExport('html')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100"
                    >
                      <Icon icon="mingcute:file-html-line" className="w-4 h-4 text-orange-600" />
                      Export as HTML
                    </button>
                    <button
                      onClick={() => handleExport('txt')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <Icon icon="mingcute:file-text-line" className="w-4 h-4 text-gray-600" />
                      Export as TXT
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                <Icon icon="mingcute:print-line" className="w-4 h-4 inline mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Panel */}
      {showAIPanel && resume && (
        <div className="fixed right-0 top-0 bottom-0 w-[28rem] bg-white border-l border-gray-200 shadow-2xl z-50">
          <AIAssistantChat
            resume={resume}
            resumeId={resumeId}
            isOpen={showAIPanel}
            onClose={() => setShowAIPanel(false)}
            initialJobId={jobId || null}
            initialMessage={getDecodedExplanation(aiExplanation)}
            autoAnalyzeJob={false}
          />
        </div>
      )}

      {/* Resume Preview */}
      {resume && (
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${showAIPanel ? 'mr-[28rem]' : ''}`}>
          <div
            id="resume-export-target"
            className="bg-white shadow-lg p-12 print:shadow-none print:p-8"
            style={{
              fontFamily: resume.customizations?.fonts?.body || "Inter",
              backgroundColor: resume.customizations?.colors?.background || "#FFFFFF",
            }}
          >
            {/* Get colors and fonts from customizations */}
            {(() => {
              const colors = resume.customizations?.colors || {
                primary: "#3351FD",
                secondary: "#000000",
                text: "#000000",
                background: "#FFFFFF",
              };
              const fonts = resume.customizations?.fonts || {
                heading: "Inter",
                body: "Inter",
              };

              // Get enabled sections in order
              const enabledSections = getEnabledSections(resume);

              return (
                <>
                  {/* Render sections dynamically based on order */}
                  {enabledSections.map((section) => {
                    const sectionId = section.id;

                    // Personal Info Section
                    if (sectionId === "personal") {
                      return (
                        <div
                          key={sectionId}
                          className={`border-b pb-6 mb-6 ${
                            resume.customizations?.headerStyle === "right"
                              ? "text-right"
                              : resume.customizations?.headerStyle === "left"
                              ? "text-left"
                              : "text-center" // Default to centered
                          }`}
                          style={{
                            borderColor: colors.primary,
                            marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                          }}
                        >
                          <h1
                            className="text-4xl font-bold mb-2"
                            style={{
                              color: colors.primary,
                              fontFamily: fonts.heading,
                            }}
                          >
                            {resume.content.personalInfo.firstName}{" "}
                            {resume.content.personalInfo.lastName}
                          </h1>
                          <div
                            className="flex items-center justify-center gap-4 mt-3 text-sm flex-wrap"
                            style={{ color: colors.secondary }}
                          >
                            {resume.content.personalInfo.email && (
                              <span>{resume.content.personalInfo.email}</span>
                            )}
                            {resume.content.personalInfo.phone && (
                              <span>• {resume.content.personalInfo.phone}</span>
                            )}
                            {resume.content.personalInfo.location && (
                              <span>• {resume.content.personalInfo.location}</span>
                            )}
                            {resume.content.personalInfo.linkedIn && (
                              <span>• {resume.content.personalInfo.linkedIn}</span>
                            )}
                            {resume.content.personalInfo.portfolio && (
                              <span>• {resume.content.personalInfo.portfolio}</span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Summary Section
                    if (sectionId === "summary" && resume.content.summary) {
                      return (
                        <div
                          key={sectionId}
                          className="mb-6"
                          style={{
                            marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                          }}
                        >
                          <h2
                            className="text-2xl font-semibold mb-3"
                            style={{
                              color: colors.primary,
                              fontFamily: fonts.heading,
                            }}
                          >
                            Summary
                          </h2>
                          <p
                            className="leading-relaxed"
                            style={{
                              color: colors.text,
                              fontFamily: fonts.body,
                            }}
                          >
                            {resume.content.summary}
                          </p>
                        </div>
                      );
                    }

                    // Experience Section
                    if (sectionId === "experience") {
                      return (
                        <div
                          key={sectionId}
                          className="mb-6"
                          style={{
                            marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                          }}
                        >
                          <h2
                            className="text-2xl font-semibold mb-3"
                            style={{
                              color: colors.primary,
                              fontFamily: fonts.heading,
                            }}
                          >
                            Experience
                          </h2>
                          {resume.content.experience.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">
                              No experience entries yet
                            </p>
                          ) : (
                            <div className="space-y-6">
                              {resume.content.experience.map((exp) => (
                                <div
                                  key={exp.id}
                                  className="border-l-2 pl-4 relative"
                                  style={{ borderColor: colors.primary }}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <h3
                                      className="text-lg font-semibold"
                                      style={{
                                        color: colors.text,
                                        fontFamily: fonts.heading,
                                      }}
                                    >
                                      {exp.title}
                                    </h3>
                                    <span
                                      className="text-sm"
                                      style={{ color: colors.secondary }}
                                    >
                                      {formatDateMonthYear(exp.startDate)} -{" "}
                                      {exp.isCurrent
                                        ? "Present"
                                        : formatDateMonthYear(exp.endDate)}
                                    </span>
                                  </div>
                                  <p
                                    className="font-medium mb-2"
                                    style={{
                                      color: colors.text,
                                      fontFamily: fonts.body,
                                    }}
                                  >
                                    {exp.company}
                                  </p>
                                  {exp.location && (
                                    <p
                                      className="text-sm mb-2"
                                      style={{ color: colors.secondary }}
                                    >
                                      {exp.location}
                                    </p>
                                  )}
                                  {exp.description && exp.description.length > 0 && (
                                    <ul
                                      className="list-disc list-inside space-y-1"
                                      style={{
                                        color: colors.text,
                                        fontFamily: fonts.body,
                                      }}
                                    >
                                      {exp.description.map((desc, idx) => (
                                        <li key={idx}>{desc}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Education Section
                    if (sectionId === "education") {
                      return (
                        <div
                          key={sectionId}
                          className="mb-6"
                          style={{
                            marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                          }}
                        >
                          <h2
                            className="text-2xl font-semibold mb-3"
                            style={{
                              color: colors.primary,
                              fontFamily: fonts.heading,
                            }}
                          >
                            Education
                          </h2>
                          {resume.content.education.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">
                              No education entries yet
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {resume.content.education.map((edu) => (
                                <div key={edu.id}>
                                  <h3
                                    className="text-lg font-semibold"
                                    style={{
                                      color: colors.text,
                                      fontFamily: fonts.heading,
                                    }}
                                  >
                                    {edu.degree}
                                  </h3>
                                  <p
                                    style={{
                                      color: colors.text,
                                      fontFamily: fonts.body,
                                    }}
                                  >
                                    {edu.school}
                                  </p>
                                  {edu.field && (
                                    <p
                                      className="text-sm"
                                      style={{ color: colors.secondary }}
                                    >
                                      {edu.field}
                                    </p>
                                  )}
                                  {edu.endDate && (
                                    <p
                                      className="text-sm"
                                      style={{ color: colors.secondary }}
                                    >
                                      {formatDateMonthYear(edu.endDate)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Skills Section
                    if (sectionId === "skills") {
                      return (
                        <div
                          key={sectionId}
                          className="mb-6"
                          style={{
                            marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                          }}
                        >
                          <h2
                            className="text-2xl font-semibold mb-3"
                            style={{
                              color: colors.primary,
                              fontFamily: fonts.heading,
                            }}
                          >
                            Skills
                          </h2>
                          {resume.content.skills.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">
                              No skills yet
                            </p>
                          ) : (
                            (() => {
                              // Group skills by category/group (support custom groups)
                              const skillsByCategory = resume.content.skills.reduce(
                                (
                                  acc: Record<string, typeof resume.content.skills>,
                                  skill
                                ) => {
                                  // Use custom group if available, otherwise use category
                                  const group =
                                    skill.group || skill.category || "Technical";
                                  if (!acc[group]) {
                                    acc[group] = [];
                                  }
                                  acc[group].push(skill);
                                  return acc;
                                },
                                {}
                              );

                              // Get visible categories from sectionConfig (default: all visible)
                              const sectionConfig = resume.sectionConfig || {};
                              const skillsConfig = (sectionConfig.skills as any) || {};
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

                              const hiddenCategories = sortedCategories.filter(
                                (cat) => !visibleCategories.includes(cat)
                              );

                              return (
                                <div className="space-y-3">
                                  {sortedCategories.map((category) => {
                                    const categorySkills = skillsByCategory[category];
                                    const isVisible = visibleCategories.includes(category);

                                    if (!isVisible) return null;

                                    return (
                                      <div key={category} className="mb-2">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span
                                            className="text-xs font-semibold uppercase tracking-wide"
                                            style={{ color: colors.secondary }}
                                          >
                                            {category}:
                                          </span>
                                        </div>
                                        <div
                                          className="text-sm leading-relaxed ml-0"
                                          style={{
                                            color: colors.text,
                                            fontFamily: fonts.body,
                                          }}
                                        >
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
                                      <div
                                        className="text-xs mb-2"
                                        style={{ color: colors.secondary }}
                                      >
                                        Hidden categories:
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {hiddenCategories.map((category) => (
                                          <span
                                            key={category}
                                            className="text-xs px-2 py-1 bg-gray-100 rounded"
                                            style={{ color: colors.secondary }}
                                          >
                                            {category}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()
                          )}
                        </div>
                      );
                    }

                    // Projects Section
                    if (sectionId === "projects") {
                      return (
                        <div
                          key={sectionId}
                          className="mb-6"
                          style={{
                            marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                          }}
                        >
                          <h2
                            className="text-2xl font-semibold mb-3"
                            style={{
                              color: colors.primary,
                              fontFamily: fonts.heading,
                            }}
                          >
                            Projects
                          </h2>
                          {resume.content.projects.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">
                              No projects yet
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {resume.content.projects.map((proj) => (
                                <div key={proj.id}>
                                  <h3
                                    className="text-lg font-semibold"
                                    style={{
                                      color: colors.text,
                                      fontFamily: fonts.heading,
                                    }}
                                  >
                                    {proj.name}
                                  </h3>
                                  <p
                                    style={{
                                      color: colors.text,
                                      fontFamily: fonts.body,
                                    }}
                                  >
                                    {proj.description}
                                  </p>
                                  {proj.technologies &&
                                    proj.technologies.length > 0 && (
                                      <p
                                        className="text-sm"
                                        style={{ color: colors.secondary }}
                                      >
                                        Technologies: {proj.technologies.join(", ")}
                                      </p>
                                    )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Certifications Section
                    if (sectionId === "certifications") {
                      return (
                        <div
                          key={sectionId}
                          className="mb-6"
                          style={{
                            marginBottom: `${resume.customizations?.spacing?.section || 24}px`,
                          }}
                        >
                          <h2
                            className="text-2xl font-semibold mb-3"
                            style={{
                              color: colors.primary,
                              fontFamily: fonts.heading,
                            }}
                          >
                            Certifications
                          </h2>
                          {resume.content.certifications.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">
                              No certifications yet
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {resume.content.certifications.map((cert) => (
                                <div key={cert.id}>
                                  <h3
                                    className="text-lg font-semibold"
                                    style={{
                                      color: colors.text,
                                      fontFamily: fonts.heading,
                                    }}
                                  >
                                    {cert.name}
                                  </h3>
                                  <p
                                    style={{
                                      color: colors.text,
                                      fontFamily: fonts.body,
                                    }}
                                  >
                                    {cert.organization}
                                  </p>
                                  {cert.dateEarned && (
                                    <p
                                      className="text-sm"
                                      style={{ color: colors.secondary }}
                                    >
                                      {formatDateMonthYear(cert.dateEarned)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </div>
  );
}

