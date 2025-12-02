import { Icon } from "@iconify/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CompanyResearchData {
  companyInfo?: any;
  interviewInsights?: any;
  news?: any[];
  media?: any[];
  competitiveLandscape?: any;
  talkingPoints?: string[];
  questionsToAsk?: string[];
}

interface CompanyResearchPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  research: CompanyResearchData | null;
  companyName: string;
  jobTitle: string;
  onExport: (format: "pdf" | "docx" | "txt" | "html") => void;
  onShowAdvancedExport?: () => void;
  isExporting?: boolean;
}

export function CompanyResearchPreviewModal({
  isOpen,
  onClose,
  research,
  companyName,
  jobTitle,
  onExport,
  onShowAdvancedExport,
  isExporting = false,
}: CompanyResearchPreviewModalProps) {
  const handleExportPDF = async () => {
    const previewElement = document.getElementById("company-research-export-target");
    if (!previewElement) {
      alert("Could not find preview content");
      return;
    }

    try {
      onExport("pdf");
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export PDF. Please try again.");
    }
  };

  if (!isOpen || !research) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm ${
        isExporting ? "z-[45]" : "z-50"
      } flex items-center justify-center p-4 transition-opacity duration-200`}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Company Research Preview
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Review your research before exporting
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="mingcute:file-pdf-line" className="w-5 h-5" />
                {isExporting ? "Exporting..." : "Export PDF"}
              </button>
              <button
                onClick={() => onShowAdvancedExport?.()}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="mingcute:download-line" className="w-5 h-5" />
                More Formats
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon icon="mingcute:close-line" className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <div
            id="company-research-export-target"
            className="bg-white shadow-lg p-12 mx-auto max-w-4xl space-y-8"
            style={{
              pageBreakInside: "avoid",
            }}
          >
            {/* Header */}
            <div className="border-b-2 border-blue-500 pb-4 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {companyName}
              </h1>
              <p className="text-lg text-gray-600">{jobTitle}</p>
              <p className="text-sm text-gray-500 mt-2">
                Company Research for Interview Preparation
              </p>
            </div>

            {/* Company Overview */}
            {research.companyInfo && (
              <div 
                className="border border-slate-200 rounded-lg p-6"
                style={{ pageBreakInside: "avoid", pageBreakAfter: "auto" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Icon
                    icon="mingcute:building-2-line"
                    width={24}
                    className="text-blue-500"
                  />
                  <h2 className="text-xl font-semibold text-slate-900">
                    Company Overview
                  </h2>
                </div>
                {research.companyInfo.description && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-900 mb-2">About</h3>
                    <p className="text-slate-700 leading-relaxed">
                      {research.companyInfo.description}
                    </p>
                  </div>
                )}
                {research.companyInfo.mission && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Icon icon="mingcute:target-line" width={18} />
                      Mission & Values
                    </h3>
                    <p className="text-slate-700">
                      {research.companyInfo.mission}
                    </p>
                  </div>
                )}
                {research.companyInfo.values && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-slate-900 mb-2">
                      Core Values
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(research.companyInfo.values) ? (
                        research.companyInfo.values.map(
                          (value: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                            >
                              {value}
                            </span>
                          )
                        )
                      ) : (
                        <p className="text-slate-700">
                          {research.companyInfo.values}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {research.companyInfo.culture && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-slate-900 mb-2">
                      Company Culture
                    </h3>
                    <p className="text-slate-700">
                      {research.companyInfo.culture}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Leadership Team */}
            {research.interviewInsights?.interviewerProfiles &&
              research.interviewInsights.interviewerProfiles.length > 0 && (
                <div 
                  className="border border-slate-200 rounded-lg p-6"
                  style={{ pageBreakInside: "avoid", pageBreakAfter: "auto" }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Icon
                      icon="mingcute:user-3-line"
                      width={24}
                      className="text-blue-500"
                    />
                    <h2 className="text-xl font-semibold text-slate-900">
                      Leadership Team & Potential Interviewers
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {research.interviewInsights.interviewerProfiles.map(
                      (profile: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <h3 className="font-semibold text-slate-900 mb-1">
                            {profile.name || profile.title}
                          </h3>
                          {profile.role && (
                            <p className="text-sm text-slate-600 mb-2">
                              {profile.role}
                            </p>
                          )}
                          {profile.background && (
                            <p className="text-sm text-slate-700">
                              {profile.background}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Competitive Landscape */}
            {research.competitiveLandscape && (
              <div 
                className="border border-slate-200 rounded-lg p-6"
                style={{ pageBreakInside: "avoid", pageBreakAfter: "auto" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Icon
                    icon="mingcute:chart-line"
                    width={24}
                    className="text-blue-500"
                  />
                  <h2 className="text-xl font-semibold text-slate-900">
                    Competitive Landscape & Market Position
                  </h2>
                </div>
                <div className="text-slate-700 space-y-4">
                  {typeof research.competitiveLandscape === "string" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {research.competitiveLandscape}
                    </ReactMarkdown>
                  ) : (
                    <>
                      {/* Market Position */}
                      {research.competitiveLandscape.marketPosition && (
                        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <h3 className="font-semibold mb-2">Market Position</h3>
                          {typeof research.competitiveLandscape.marketPosition ===
                          "string" ? (
                            <p className="text-slate-700 leading-relaxed">
                              {research.competitiveLandscape.marketPosition}
                            </p>
                          ) : typeof research.competitiveLandscape.marketPosition ===
                            "object" &&
                            research.competitiveLandscape.marketPosition !== null ? (
                            <div className="space-y-3">
                              {Object.entries(
                                research.competitiveLandscape.marketPosition
                              ).map(([key, value]: [string, any]) => (
                                <div key={key}>
                                  <span className="font-medium text-slate-800 capitalize">
                                    {key.replace(/([A-Z])/g, " $1").trim()}:{" "}
                                  </span>
                                  <span className="text-slate-700">
                                    {typeof value === "string"
                                      ? value
                                      : Array.isArray(value)
                                      ? value.join(", ")
                                      : typeof value === "object"
                                      ? Object.entries(value)
                                          .map(
                                            ([k, v]: [string, any]) => `${k}: ${v}`
                                          )
                                          .join(", ")
                                      : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-700 leading-relaxed">
                              {String(
                                research.competitiveLandscape.marketPosition
                              )}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Market Analysis */}
                      {research.competitiveLandscape.analysis && (
                        <div className="p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
                          <h3 className="font-semibold mb-2">Market Analysis</h3>
                          <div className="text-slate-700 leading-relaxed">
                            {typeof research.competitiveLandscape.analysis === "string" ? (
                              <p>{research.competitiveLandscape.analysis}</p>
                            ) : typeof research.competitiveLandscape.analysis === "object" && research.competitiveLandscape.analysis !== null ? (
                              <div className="space-y-2">
                                {Object.entries(research.competitiveLandscape.analysis).map(([key, value]: [string, any]) => (
                                  <div key={key}>
                                    <span className="font-medium text-slate-800">{key}: </span>
                                    <span className="text-slate-700">
                                      {typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : JSON.stringify(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p>{JSON.stringify(research.competitiveLandscape.analysis)}</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Competitive Strengths */}
                      {research.competitiveLandscape.strengths && (
                        <div>
                          <h3 className="font-semibold mb-2">Competitive Strengths</h3>
                          {Array.isArray(research.competitiveLandscape.strengths) ? (
                            <ul className="list-disc list-inside space-y-1 text-slate-700 ml-2">
                              {research.competitiveLandscape.strengths.map(
                                (strength: any, idx: number) => (
                                  <li key={idx}>
                                    {typeof strength === "string"
                                      ? strength
                                      : JSON.stringify(strength)}
                                  </li>
                                )
                              )}
                            </ul>
                          ) : typeof research.competitiveLandscape.strengths === "string" ? (
                            <p className="text-slate-700">{research.competitiveLandscape.strengths}</p>
                          ) : (
                            <p className="text-slate-700">{JSON.stringify(research.competitiveLandscape.strengths)}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Market Share */}
                      {research.competitiveLandscape.marketShare && (
                        <div>
                          <h3 className="font-semibold mb-2">Market Share</h3>
                          <p className="text-slate-700">
                            {typeof research.competitiveLandscape.marketShare === "string"
                              ? research.competitiveLandscape.marketShare
                              : JSON.stringify(research.competitiveLandscape.marketShare)}
                          </p>
                        </div>
                      )}
                      
                      {/* Key Competitors */}
                      {research.competitiveLandscape.competitors &&
                        Array.isArray(
                          research.competitiveLandscape.competitors
                        ) && (
                          <div>
                            <h3 className="font-semibold mb-2">Key Competitors</h3>
                            <ul className="list-disc list-inside space-y-1 text-slate-700 ml-2">
                              {research.competitiveLandscape.competitors.map(
                                (comp: any, idx: number) => (
                                  <li key={idx}>
                                    {typeof comp === "string"
                                      ? comp
                                      : comp.name || JSON.stringify(comp)}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Recent News */}
            {research.news && research.news.length > 0 && (
              <div 
                className="border border-slate-200 rounded-lg p-6"
                style={{ pageBreakInside: "avoid", pageBreakAfter: "auto" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Icon
                    icon="mingcute:news-line"
                    width={24}
                    className="text-blue-500"
                  />
                  <h2 className="text-xl font-semibold text-slate-900">
                    Recent News & Developments
                  </h2>
                </div>
                <div className="space-y-4">
                  {research.news.map((article: any, idx: number) => (
                    <div key={idx} className="border-l-4 border-blue-500 pl-4">
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {article.title}
                      </h3>
                      {article.publishedAt && (
                        <p className="text-xs text-slate-500 mb-2">
                          {new Date(article.publishedAt).toLocaleDateString()}
                        </p>
                      )}
                      {article.description && (
                        <p className="text-slate-700 text-sm">
                          {article.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Talking Points */}
            {research.talkingPoints && research.talkingPoints.length > 0 && (
              <div 
                className="border border-slate-200 rounded-lg p-6"
                style={{ pageBreakInside: "avoid", pageBreakAfter: "auto" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Icon
                    icon="mingcute:chat-3-line"
                    width={24}
                    className="text-blue-500"
                  />
                  <h2 className="text-xl font-semibold text-slate-900">
                    Key Talking Points
                  </h2>
                </div>
                <ul className="space-y-2">
                  {research.talkingPoints.map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Icon
                        icon="mingcute:check-circle-line"
                        width={20}
                        className="text-green-500 mt-0.5 flex-shrink-0"
                      />
                      <span className="text-slate-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Questions to Ask */}
            {research.questionsToAsk && research.questionsToAsk.length > 0 && (
              <div 
                className="border border-slate-200 rounded-lg p-6"
                style={{ pageBreakInside: "avoid", pageBreakAfter: "auto" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Icon
                    icon="mingcute:question-line"
                    width={24}
                    className="text-blue-500"
                  />
                  <h2 className="text-xl font-semibold text-slate-900">
                    Intelligent Questions to Ask
                  </h2>
                </div>
                <ul className="space-y-2">
                  {research.questionsToAsk.map((question: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Icon
                        icon="mingcute:question-line"
                        width={20}
                        className="text-blue-500 mt-0.5 flex-shrink-0"
                      />
                      <span className="text-slate-700">{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interview Insights */}
            {research.interviewInsights?.preparationRecommendations && (
              <div 
                className="border border-slate-200 rounded-lg p-6"
                style={{ pageBreakInside: "avoid", pageBreakAfter: "auto" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Icon
                    icon="mingcute:lightbulb-line"
                    width={24}
                    className="text-blue-500"
                  />
                  <h2 className="text-xl font-semibold text-slate-900">
                    Interview Preparation Recommendations
                  </h2>
                </div>
                <div className="text-slate-700">
                  {Array.isArray(
                    research.interviewInsights.preparationRecommendations
                  ) ? (
                    <ul className="list-disc list-inside space-y-2">
                      {research.interviewInsights.preparationRecommendations.map(
                        (rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p>
                      {research.interviewInsights.preparationRecommendations}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

