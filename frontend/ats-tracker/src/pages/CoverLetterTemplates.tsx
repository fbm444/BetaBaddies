import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../config/routes";
import { CoverLetterTemplate } from "../types";
import { coverLetterService } from "../services/coverLetterService";

export function CoverLetterTemplates() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [templates, setTemplates] = useState<CoverLetterTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<
    "all" | "formal" | "casual" | "enthusiastic" | "analytical"
  >("all");
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    null
  );
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const industry = selectedIndustry === "all" ? undefined : selectedIndustry;
        const response = await coverLetterService.getTemplates(industry);
        if (response.ok && response.data) {
          let filteredTemplates = response.data.templates;
          
          // Filter by tone if not "all"
          if (selectedTone !== "all") {
            filteredTemplates = filteredTemplates.filter(
              (t) => t.tone === selectedTone
            );
          }
          
          setTemplates(filteredTemplates);
        }
      } catch (err: any) {
        console.log("API not available, using mock data for preview:", err.message);
        // Use default templates structure
        setTemplates([
          {
            id: "default-formal",
            templateName: "Formal Professional",
            description:
              "Traditional, formal tone perfect for corporate positions, finance, law, and government roles.",
            tone: "formal",
            length: "standard",
            writingStyle: "direct",
            isDefault: true,
            isShared: true,
            industry: "general",
          },
          {
            id: "default-creative",
            templateName: "Creative & Modern",
            description:
              "Energetic and creative tone ideal for design, marketing, advertising, and startup roles.",
            tone: "enthusiastic",
            length: "standard",
            writingStyle: "narrative",
            isDefault: true,
            isShared: true,
            industry: "creative",
          },
          {
            id: "default-technical",
            templateName: "Technical Professional",
            description:
              "Analytical and precise tone perfect for engineering, software development, and technical roles.",
            tone: "analytical",
            length: "detailed",
            writingStyle: "direct",
            isDefault: true,
            isShared: true,
            industry: "technology",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [selectedTone, selectedIndustry]);

  const handleSelectTemplate = (templateId: string) => {
    const createNew = searchParams.get("create") === "true";
    if (createNew) {
      navigate(`${ROUTES.COVER_LETTER_BUILDER}?templateId=${templateId}`);
    } else {
      // Preview template
      setPreviewTemplateId(templateId);
    }
  };

  const handlePreviewClose = () => {
    setPreviewTemplateId(null);
  };

  const parseColors = (colors: string | object | undefined) => {
    if (!colors)
      return {
        primary: "#000000",
        secondary: "#333333",
        text: "#000000",
        background: "#fff",
      };
    if (typeof colors === "string") {
      try {
        return JSON.parse(colors);
      } catch {
        return {
          primary: "#000000",
          secondary: "#333333",
          text: "#000000",
          background: "#fff",
        };
      }
    }
    return colors;
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case "formal":
        return "bg-gray-100 text-gray-700";
      case "casual":
        return "bg-blue-100 text-blue-700";
      case "enthusiastic":
        return "bg-purple-100 text-purple-700";
      case "analytical":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
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
                Cover Letter Templates
              </h1>
              <p className="text-gray-600 mt-1">
                Choose a template to create your cover letter
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mt-6">
            <button
              onClick={() => setSelectedTone("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTone === "all"
                  ? "bg-[#3351FD] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              All Tones
            </button>
            <button
              onClick={() => setSelectedTone("formal")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTone === "formal"
                  ? "bg-[#3351FD] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Formal
            </button>
            <button
              onClick={() => setSelectedTone("casual")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTone === "casual"
                  ? "bg-[#3351FD] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Casual
            </button>
            <button
              onClick={() => setSelectedTone("enthusiastic")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTone === "enthusiastic"
                  ? "bg-[#3351FD] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Enthusiastic
            </button>
            <button
              onClick={() => setSelectedTone("analytical")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTone === "analytical"
                  ? "bg-[#3351FD] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Analytical
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
                      {/* Mock Cover Letter Preview */}
                      <div className="space-y-2">
                        <div className="text-right text-xs text-gray-500">
                          [Date]
                        </div>
                        <div className="text-xs font-semibold" style={{ color: colors.primary }}>
                          [Company Name]
                        </div>
                        <div className="text-xs text-gray-600">
                          Dear Hiring Manager,
                        </div>
                        <div className="text-xs text-gray-700 mt-2 space-y-1">
                          <div className="h-2 bg-gray-300 rounded w-full"></div>
                          <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                          <div className="h-2 bg-gray-300 rounded w-4/5"></div>
                        </div>
                        <div className="text-xs text-gray-700 mt-3 space-y-1">
                          <div className="h-2 bg-gray-300 rounded w-full"></div>
                          <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                        </div>
                        <div className="text-xs text-gray-600 mt-3">
                          Sincerely,
                        </div>
                        <div className="text-xs font-semibold">
                          [Your Name]
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
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded capitalize ${getToneColor(
                        template.tone
                      )}`}
                    >
                      {template.tone}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {template.description || "Professional cover letter template"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Icon icon="mingcute:time-line" className="w-3 h-3" />
                      {template.length}
                    </span>
                    {template.writingStyle && (
                      <span className="flex items-center gap-1">
                        <Icon icon="mingcute:edit-line" className="w-3 h-3" />
                        {template.writingStyle}
                      </span>
                    )}
                  </div>
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
              icon="mingcute:mail-line"
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No templates found
            </h3>
            <p className="text-gray-600">
              Try selecting a different tone filter
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
                  }/coverletter/templates/${previewTemplateId}/preview`}
                  className="w-full h-full min-h-[600px] border-0"
                  title="Template Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

