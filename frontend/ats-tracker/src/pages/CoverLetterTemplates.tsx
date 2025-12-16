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
          let filteredTemplates = response.data.templates || [];

          if (selectedTone !== "all") {
            filteredTemplates = filteredTemplates.filter(
              (t: CoverLetterTemplate) => t.tone === selectedTone
            );
          }

          // Ensure we only keep one template per unique name
          const uniqueTemplates = [
            ...new Map(
              filteredTemplates.map((template: CoverLetterTemplate) => [
                template.templateName,
                template,
              ])
            ).values(),
          ];

          setTemplates(uniqueTemplates);
        }
      } catch (err: any) {
        console.log("API not available, using mock data for preview:", err.message);
        // Use default templates structure
        const fallbackTemplates: CoverLetterTemplate[] = [
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
        ];

        if (selectedTone === "all") {
          setTemplates(fallbackTemplates);
        } else {
          setTemplates(
            fallbackTemplates.filter((template) => template.tone === selectedTone)
          );
        }
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[36px] leading-tight font-semibold text-[#0F172A]">
                Cover Letter Templates
              </h1>
              <p className="text-base text-[#6F7A97] mt-1.5">
                Choose a template to create your cover letter
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mt-6">
            <button
              onClick={() => setSelectedTone("all")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTone === "all"
                  ? "bg-black text-white"
                  : "bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]"
              }`}
            >
              All Tones
            </button>
            <button
              onClick={() => setSelectedTone("formal")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTone === "formal"
                  ? "bg-black text-white"
                  : "bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]"
              }`}
            >
              Formal
            </button>
            <button
              onClick={() => setSelectedTone("casual")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTone === "casual"
                  ? "bg-black text-white"
                  : "bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]"
              }`}
            >
              Casual
            </button>
            <button
              onClick={() => setSelectedTone("enthusiastic")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTone === "enthusiastic"
                  ? "bg-black text-white"
                  : "bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]"
              }`}
            >
              Enthusiastic
            </button>
            <button
              onClick={() => setSelectedTone("analytical")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTone === "analytical"
                  ? "bg-black text-white"
                  : "bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]"
              }`}
            >
              Analytical
            </button>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const colors = parseColors(template.colors);
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
                      style={{ borderColor: colors.primary }}
                    >
                      {/* Mock Cover Letter Preview */}
                  <div className="space-y-2 flex-1 flex flex-col">
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
                  {template.templateName === "Formal Professional" && (
                    <div className="absolute top-4 right-4 bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium">
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
                    <span
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-full capitalize ${getToneColor(
                        template.tone
                      )}`}
                    >
                      {template.tone}
                    </span>
                  </div>
                  <p className="text-sm text-[#6F7A97] mb-2.5 line-clamp-3">
                    {template.description || "Professional cover letter template"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[#8A94AD] mb-3">
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
                  <div className="mt-auto flex gap-2">
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
              icon="mingcute:mail-line"
              className="w-16 h-16 mx-auto text-[#C2CAE6] mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No templates found
            </h3>
            <p className="text-[#6F7A97]">
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

