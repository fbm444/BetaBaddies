import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../config/routes";
import { CoverLetter, CoverLetterTemplate } from "../types";
import { coverLetterService } from "../services/coverLetterService";
import { CoverLetterTopBar } from "../components/coverletter/CoverLetterTopBar";
import { CoverLetterAIAssistant } from "../components/coverletter/CoverLetterAIAssistant";

export function CoverLetterBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const coverLetterId = searchParams.get("id");
  const templateId = searchParams.get("templateId");

  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Helper function to validate UUID format
  const isValidUUID = (id: string | null): boolean => {
    if (!id || id === "new") return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  // Fetch cover letter or create new
  useEffect(() => {
    const fetchCoverLetter = async () => {
      try {
        setIsLoading(true);

        if (coverLetterId && isValidUUID(coverLetterId)) {
          // Load existing cover letter
          const response = await coverLetterService.getCoverLetter(coverLetterId);
          if (response.ok && response.data) {
            setCoverLetter(response.data.coverLetter);
          } else {
            throw new Error("Failed to load cover letter");
          }
        } else if (templateId) {
          // Create new cover letter from template
          let template = null;
          let templateResponse = null;
          
          try {
            templateResponse = await coverLetterService.getTemplate(templateId);
            if (templateResponse.ok && templateResponse.data) {
              template = templateResponse.data.template;
            }
          } catch (templateError) {
            console.warn("Failed to fetch template, will create cover letter with defaults:", templateError);
          }

          // If template fetch failed, try to get default template settings
          if (!template && templateId.startsWith("default-")) {
            // Get all templates to find the default one
            try {
              const allTemplatesResponse = await coverLetterService.getTemplates();
              if (allTemplatesResponse.ok && allTemplatesResponse.data) {
                template = allTemplatesResponse.data.templates.find(
                  (t) => t.id === templateId
                );
              }
            } catch (allTemplatesError) {
              console.warn("Failed to get all templates:", allTemplatesError);
            }
          }

          // Create cover letter with template settings (or defaults if template not found)
          const newCoverLetterData = {
            name: template 
              ? `Cover Letter - ${template.templateName}`
              : "New Cover Letter",
            templateId: template?.id || templateId || null,
            content: {
              greeting: template?.tone === "casual" 
                ? "Hi [Hiring Manager Name],"
                : "Dear Hiring Manager,",
              opening: "",
              body: [],
              closing: "",
              fullText: "",
            },
            toneSettings: {
              tone: template?.tone || "formal",
              length: template?.length || "standard",
              writingStyle: template?.writingStyle || "direct",
            },
            customizations: {
              colors: template?.colors
                ? (typeof template.colors === "string"
                    ? JSON.parse(template.colors)
                    : template.colors)
                : {
                    primary: "#000000",
                    secondary: "#000000",
                    text: "#000000",
                    background: "#FFFFFF",
                    accent: "#F5F5F5",
                  },
              fonts: template?.fonts
                ? (typeof template.fonts === "string"
                    ? JSON.parse(template.fonts)
                    : template.fonts)
                : {
                    heading: "Arial",
                    body: "Arial",
                    size: { heading: "14pt", body: "11pt" },
                  },
            },
          };

          const createResponse = await coverLetterService.createCoverLetter(
            newCoverLetterData
          );
          if (createResponse.ok && createResponse.data) {
            const newCoverLetter = createResponse.data.coverLetter;
            setCoverLetter(newCoverLetter);
            // Update URL with new ID
            navigate(`${ROUTES.COVER_LETTER_BUILDER}?id=${newCoverLetter.id}`, {
              replace: true,
            });
          } else {
            console.log("Error: Cannot create cover letter.")
            throw new Error("Failed to create cover letter");
          }
        } else {
          // Create blank cover letter
          const newCoverLetterData = {
            name: "New Cover Letter",
            content: {
              greeting: "Dear Hiring Manager,",
              opening: "",
              body: [],
              closing: "",
              fullText: "",
            },
            toneSettings: {
              tone: "formal",
              length: "standard",
            },
          };

          const createResponse = await coverLetterService.createCoverLetter(
            newCoverLetterData
          );
          if (createResponse.ok && createResponse.data) {
            const newCoverLetter = createResponse.data.coverLetter;
            setCoverLetter(newCoverLetter);
            navigate(`${ROUTES.COVER_LETTER_BUILDER}?id=${newCoverLetter.id}`, {
              replace: true,
            });
          }
        }
      } catch (err: any) {
        console.error("Error loading cover letter:", err);
        alert(err.message || "Failed to load cover letter");
        navigate(ROUTES.COVER_LETTERS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoverLetter();
  }, [coverLetterId, templateId, navigate]);

  // Auto-save functionality - DISABLED to prevent double saves
  // Users can manually save with the Save button
  // useEffect(() => {
  //   if (!coverLetter || !coverLetterId || coverLetterId === "new") return;
  //   // Auto-save logic here
  // }, [coverLetter, coverLetterId]);

  const handleSave = async () => {
    console.log("🔵 handleSave called", { coverLetterId, hasCoverLetter: !!coverLetter });
    
    if (!coverLetter || !coverLetterId || coverLetterId === "new") {
      alert("Please wait for the cover letter to be created");
      return;
    }

    try {
      setIsSaving(true);
      console.log("🟢 Calling updateCoverLetter with ID:", coverLetterId);
      await coverLetterService.updateCoverLetter(coverLetterId, {
        name: coverLetter.name,
        content: coverLetter.content,
        toneSettings: coverLetter.toneSettings,
        customizations: coverLetter.customizations,
      });
      console.log("✅ Update complete");
      setLastSaved(new Date());
      alert("Cover letter saved successfully!");
    } catch (err: any) {
      console.error("❌ Save error:", err);
      alert(err.message || "Failed to save cover letter");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (format: "pdf" | "docx" | "txt" | "html") => {
    if (!coverLetterId || coverLetterId === "new") {
      alert("Please save the cover letter before exporting");
      return;
    }

    try {
      setExporting(true);
      setShowExportMenu(false);

      let result;
      switch (format) {
        case "pdf":
          result = await coverLetterService.exportPDF(coverLetterId);
          break;
        case "docx":
          result = await coverLetterService.exportDOCX(coverLetterId);
          break;
        case "txt":
          result = await coverLetterService.exportTXT(coverLetterId);
          break;
        case "html":
          result = await coverLetterService.exportHTML(coverLetterId);
          break;
      }

      coverLetterService.downloadBlob(result.blob, result.filename);
      alert(`Cover letter exported as ${format.toUpperCase()} successfully!`);
    } catch (err: any) {
      alert(err.message || `Failed to export as ${format.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  const handleContentUpdate = (field: string, value: any) => {
    if (!coverLetter) return;

    setCoverLetter({
      ...coverLetter,
      content: {
        ...coverLetter.content,
        [field]: value,
      },
    });
  };

  const handleBodyParagraphUpdate = (index: number, value: string) => {
    if (!coverLetter) return;

    const newBody = [...(coverLetter.content?.body || [])];
    if (index >= newBody.length) {
      newBody.push(value);
    } else {
      newBody[index] = value;
    }

    setCoverLetter({
      ...coverLetter,
      content: {
        ...coverLetter.content,
        body: newBody,
      },
    });
  };

  const handleAddBodyParagraph = () => {
    if (!coverLetter) return;

    const newBody = [...(coverLetter.content?.body || []), ""];
    setCoverLetter({
      ...coverLetter,
      content: {
        ...coverLetter.content,
        body: newBody,
      },
    });
  };

  const handleRemoveBodyParagraph = (index: number) => {
    if (!coverLetter) return;

    const newBody = [...(coverLetter.content?.body || [])];
    newBody.splice(index, 1);
    setCoverLetter({
      ...coverLetter,
      content: {
        ...coverLetter.content,
        body: newBody,
      },
    });
  };

  const handleCustomizationUpdate = (customizations: any) => {
    if (!coverLetter) return;

    setCoverLetter({
      ...coverLetter,
      customizations: {
        ...coverLetter.customizations,
        ...customizations,
      },
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
          <p className="mt-4 text-gray-600">Loading cover letter...</p>
        </div>
      </div>
    );
  }

  if (!coverLetter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:alert-circle-line"
            className="w-12 h-12 mx-auto text-red-500 mb-4"
          />
          <p className="text-red-600 mb-4">Cover letter not found</p>
          <button
            onClick={() => navigate(ROUTES.COVER_LETTERS)}
            className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors"
          >
            Back to Cover Letters
          </button>
        </div>
      </div>
    );
  }

  const colors = coverLetter.customizations?.colors || {};
  const fonts = coverLetter.customizations?.fonts || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <CoverLetterTopBar
        coverLetter={coverLetter}
        coverLetterId={coverLetterId}
        isSaving={isSaving}
        isAutoSaving={isAutoSaving}
        lastSaved={lastSaved}
        exporting={exporting}
        showExportMenu={showExportMenu}
        showCustomization={showCustomization}
        onNavigateBack={() => navigate(ROUTES.COVER_LETTERS)}
        onSave={handleSave}
        onExport={handleExport}
        onToggleExportMenu={() => setShowExportMenu(!showExportMenu)}
        onToggleCustomization={() => setShowCustomization(!showCustomization)}
      />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Main Editor - Left Side */}
        <div
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            showAIPanel ? "mr-96" : ""
          }`}
        >
          <div className="max-w-4xl mx-auto p-8">
            {/* Customization Panel */}
            {showCustomization && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Customize Appearance
                </h3>

                {/* Colors */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Colors
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Primary Color
                      </label>
                      <input
                        type="color"
                        value={colors.primary || "#000000"}
                        onChange={(e) =>
                          handleCustomizationUpdate({
                            colors: { ...colors, primary: e.target.value },
                          })
                        }
                        className="w-full h-10 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={colors.text || "#000000"}
                        onChange={(e) =>
                          handleCustomizationUpdate({
                            colors: { ...colors, text: e.target.value },
                          })
                        }
                        className="w-full h-10 rounded border border-gray-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Fonts */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fonts
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Heading Font
                      </label>
                      <select
                        value={fonts.heading || "Arial"}
                        onChange={(e) =>
                          handleCustomizationUpdate({
                            fonts: { ...fonts, heading: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Calibri">Calibri</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Body Font
                      </label>
                      <select
                        value={fonts.body || "Arial"}
                        onChange={(e) =>
                          handleCustomizationUpdate({
                            fonts: { ...fonts, body: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Calibri">Calibri</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tone Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tone & Style
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Tone
                      </label>
                      <select
                        value={coverLetter.toneSettings?.tone || "formal"}
                        onChange={(e) =>
                          setCoverLetter({
                            ...coverLetter,
                            toneSettings: {
                              ...coverLetter.toneSettings,
                              tone: e.target.value as any,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="formal">Formal</option>
                        <option value="casual">Casual</option>
                        <option value="enthusiastic">Enthusiastic</option>
                        <option value="analytical">Analytical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Length
                      </label>
                      <select
                        value={coverLetter.toneSettings?.length || "standard"}
                        onChange={(e) =>
                          setCoverLetter({
                            ...coverLetter,
                            toneSettings: {
                              ...coverLetter.toneSettings,
                              length: e.target.value as any,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="brief">Brief</option>
                        <option value="standard">Standard</option>
                        <option value="detailed">Detailed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Assistant Toggle Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showAIPanel
                    ? "bg-[#3351FD] text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Icon icon="mingcute:ai-fill" className="w-5 h-5" />
                {showAIPanel ? "Hide AI Assistant" : "Show AI Assistant"}
              </button>
            </div>

            {/* Cover Letter Editor */}
            <div
              className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm"
              style={{
                fontFamily: fonts.body || "Arial",
                color: colors.text || "#000000",
              }}
            >
              {/* Greeting */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Greeting
                </label>
                <input
                  type="text"
                  value={coverLetter.content?.greeting || ""}
                  onChange={(e) => handleContentUpdate("greeting", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                  placeholder="Dear Hiring Manager,"
                />
              </div>

              {/* Opening Paragraph */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Paragraph
                </label>
                <textarea
                  value={coverLetter.content?.opening || ""}
                  onChange={(e) => handleContentUpdate("opening", e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                  placeholder="I am writing to express my interest in..."
                />
              </div>

              {/* Body Paragraphs */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Body Paragraphs
                  </label>
                  <button
                    onClick={handleAddBodyParagraph}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-[#3351FD] hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Icon icon="mingcute:add-line" className="w-4 h-4" />
                    Add Paragraph
                  </button>
                </div>
                {(coverLetter.content?.body || []).map((paragraph, index) => (
                  <div key={index} className="mb-4">
                    <div className="flex items-start gap-2">
                      <textarea
                        value={paragraph}
                        onChange={(e) =>
                          handleBodyParagraphUpdate(index, e.target.value)
                        }
                        rows={4}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                        placeholder={`Body paragraph ${index + 1}...`}
                      />
                      <button
                        onClick={() => handleRemoveBodyParagraph(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Icon icon="mingcute:delete-line" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!coverLetter.content?.body || coverLetter.content.body.length === 0) && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-sm">No body paragraphs yet</p>
                    <button
                      onClick={handleAddBodyParagraph}
                      className="mt-2 text-sm text-[#3351FD] hover:underline"
                    >
                      Add your first paragraph
                    </button>
                  </div>
                )}
              </div>

              {/* Closing Paragraph */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closing Paragraph
                </label>
                <textarea
                  value={coverLetter.content?.closing || ""}
                  onChange={(e) => handleContentUpdate("closing", e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                  placeholder="Thank you for considering my application..."
                />
              </div>

              {/* Signature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closing
                </label>
                <input
                  type="text"
                  value="Sincerely,"
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Assistant Panel - Right Side */}
        {showAIPanel && (
          <CoverLetterAIAssistant
            coverLetter={coverLetter}
            coverLetterId={coverLetterId}
            isOpen={showAIPanel}
            onClose={() => setShowAIPanel(false)}
            onCoverLetterUpdate={(updates) => {
              if (coverLetter) {
                setCoverLetter({ ...coverLetter, ...updates });
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

