import { Icon } from "@iconify/react";

export interface SectionGrade {
  section: string;
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string[];
  status: "excellent" | "good" | "needs-improvement" | "poor";
}

export interface ValidationResults {
  overallScore: number;
  overallPercentage: number;
  overallStatus: "excellent" | "good" | "needs-improvement" | "poor";
  summary: string;
  highlights: string[];
  sectionGrades: SectionGrade[];
  recommendations: string[];
}

interface ResumeValidationResultsProps {
  results: ValidationResults | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ResumeValidationResults({
  results,
  isOpen,
  onClose,
}: ResumeValidationResultsProps) {
  if (!isOpen || !results) return null;

  // Safely get values with defaults
  const overallStatus = results.overallStatus || "needs-improvement";
  const overallPercentage = results.overallPercentage ?? 0;
  const overallScore = results.overallScore ?? 0;
  const summary = results.summary || "Resume analysis completed.";
  const highlights = results.highlights || [];
  const sectionGrades = results.sectionGrades || [];
  const recommendations = results.recommendations || [];

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "bg-gray-100 text-gray-800 border-gray-300";
    switch (status) {
      case "excellent":
        return "bg-green-100 text-green-800 border-green-300";
      case "good":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "needs-improvement":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "poor":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    if (!status) return "mingcute:info-line";
    switch (status) {
      case "excellent":
        return "mingcute:check-circle-fill";
      case "good":
        return "mingcute:check-line";
      case "needs-improvement":
        return "mingcute:alert-line";
      case "poor":
        return "mingcute:close-circle-fill";
      default:
        return "mingcute:info-line";
    }
  };

  const getScoreColor = (percentage: number | undefined) => {
    if (percentage === undefined || percentage === null) return "text-gray-600";
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const formatStatus = (status: string | undefined): string => {
    if (!status) return "Unknown";
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3351FD] to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Icon
                  icon="mingcute:scan-line"
                  className="w-6 h-6 text-white"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Resume Analysis Results</h2>
                <p className="text-white/80 text-sm mt-1">
                  Your resume has been scanned and analyzed
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Icon icon="mingcute:close-line" className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overall Score */}
          <div className="mb-6">
            <div
              className={`rounded-xl p-6 border-2 ${getStatusColor(
                overallStatus
              )}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Icon
                    icon={getStatusIcon(overallStatus)}
                    className="w-8 h-8"
                  />
                  <div>
                    <h3 className="text-lg font-semibold">Overall Score</h3>
                    <p className="text-sm opacity-80">
                      {formatStatus(overallStatus)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-4xl font-bold ${getScoreColor(
                      overallPercentage
                    )}`}
                  >
                    {overallPercentage}%
                  </div>
                  <div className="text-sm opacity-80">
                    {overallScore} / 100
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Summary
            </h3>
            <p className="text-gray-700 leading-relaxed">{summary}</p>
          </div>

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Highlights
              </h3>
              <div className="space-y-2">
                {highlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <Icon
                      icon="mingcute:check-circle-fill"
                      className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                    />
                    <p className="text-sm text-gray-700">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Grades */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Section Analysis
            </h3>
            {sectionGrades.length === 0 ? (
              <p className="text-gray-500 text-sm">No section analysis available.</p>
            ) : (
              <div className="space-y-3">
                {sectionGrades.map((grade, idx) => {
                  const gradeStatus = grade?.status || "needs-improvement";
                  const gradePercentage = grade?.percentage ?? 0;
                  const gradeScore = grade?.score ?? 0;
                  const gradeMaxScore = grade?.maxScore ?? 100;
                  const gradeSection = grade?.section || "Unknown";
                  const gradeFeedback = grade?.feedback || [];
                  
                  return (
                    <div
                      key={idx}
                      className={`border-2 rounded-lg p-4 ${getStatusColor(
                        gradeStatus
                      )}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon
                            icon={getStatusIcon(gradeStatus)}
                            className="w-5 h-5"
                          />
                          <h4 className="font-semibold capitalize">
                            {gradeSection}
                          </h4>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-xl font-bold ${getScoreColor(
                              gradePercentage
                            )}`}
                          >
                            {gradePercentage}%
                          </div>
                          <div className="text-xs opacity-80">
                            {gradeScore} / {gradeMaxScore}
                          </div>
                        </div>
                      </div>
                      {gradeFeedback.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {gradeFeedback.map((item, fIdx) => (
                            <div
                              key={fIdx}
                              className="text-sm opacity-90 flex items-start gap-2"
                            >
                              <span className="text-xs mt-1">•</span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Recommendations
              </h3>
              <div className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <Icon
                      icon="mingcute:lightbulb-line"
                      className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                    />
                    <p className="text-sm text-gray-700">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


