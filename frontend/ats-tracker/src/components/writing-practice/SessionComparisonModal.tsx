import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { SessionComparison, WritingPracticeSession } from "../../types";

interface SessionComparisonModalProps {
  sessionId1: string;
  sessionId2: string;
  onClose: () => void;
}

export function SessionComparisonModal({
  sessionId1,
  sessionId2,
  onClose,
}: SessionComparisonModalProps) {
  const [comparison, setComparison] = useState<SessionComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComparison();
  }, [sessionId1, sessionId2]);

  const fetchComparison = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.compareWritingSessions(sessionId1, sessionId2);
      if (response.ok && response.data?.comparison) {
        setComparison(response.data.comparison);
      } else {
        throw new Error("Failed to load comparison");
      }
    } catch (err: any) {
      console.error("Failed to fetch comparison:", err);
      setError(err.message || "Failed to load comparison");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-blue-500 mb-4"
          />
          <p className="text-slate-600">Generating comparison...</p>
        </div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <Icon icon="mingcute:alert-line" width={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Error</h3>
          <p className="text-slate-600 mb-4">{error || "Failed to load comparison"}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const getImprovementColor = (improvement: number) => {
    if (improvement > 0) return "text-green-600";
    if (improvement < 0) return "text-red-600";
    return "text-slate-600";
  };

  const getImprovementIcon = (improvement: number) => {
    if (improvement > 0) return "mingcute:arrow-up-line";
    if (improvement < 0) return "mingcute:arrow-down-line";
    return "mingcute:minus-line";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Session Comparison</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Comparison Scores */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries(comparison.comparison).map(([metric, data]) => (
              <div
                key={metric}
                className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center"
              >
                <p className="text-xs text-slate-600 mb-2 capitalize">{metric}</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Session 1:</span>
                    <span className="font-semibold">{data.score1}/10</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Session 2:</span>
                    <span className="font-semibold">{data.score2}/10</span>
                  </div>
                  <div
                    className={`flex items-center justify-center gap-1 text-sm font-semibold mt-2 ${getImprovementColor(
                      data.improvement
                    )}`}
                  >
                    <Icon icon={getImprovementIcon(data.improvement)} width={16} />
                    <span>
                      {data.improvement > 0 ? "+" : ""}
                      {data.improvement.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Session Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Session 1 */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Session 1</h3>
              <p className="text-sm text-blue-800 mb-3">{comparison.session1.prompt}</p>
              <div className="bg-white rounded p-3 mb-3">
                <p className="text-xs text-slate-600 mb-1">Response:</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">
                  {comparison.session1.response}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-blue-700">Clarity: </span>
                  <span className="font-semibold">{comparison.session1.feedback.clarityScore}/10</span>
                </div>
                <div>
                  <span className="text-blue-700">Professionalism: </span>
                  <span className="font-semibold">
                    {comparison.session1.feedback.professionalismScore}/10
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Structure: </span>
                  <span className="font-semibold">{comparison.session1.feedback.structureScore}/10</span>
                </div>
                <div>
                  <span className="text-blue-700">Storytelling: </span>
                  <span className="font-semibold">
                    {comparison.session1.feedback.storytellingScore}/10
                  </span>
                </div>
              </div>
            </div>

            {/* Session 2 */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2">Session 2</h3>
              <p className="text-sm text-green-800 mb-3">{comparison.session2.prompt}</p>
              <div className="bg-white rounded p-3 mb-3">
                <p className="text-xs text-slate-600 mb-1">Response:</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">
                  {comparison.session2.response}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-green-700">Clarity: </span>
                  <span className="font-semibold">{comparison.session2.feedback.clarityScore}/10</span>
                </div>
                <div>
                  <span className="text-green-700">Professionalism: </span>
                  <span className="font-semibold">
                    {comparison.session2.feedback.professionalismScore}/10
                  </span>
                </div>
                <div>
                  <span className="text-green-700">Structure: </span>
                  <span className="font-semibold">{comparison.session2.feedback.structureScore}/10</span>
                </div>
                <div>
                  <span className="text-green-700">Storytelling: </span>
                  <span className="font-semibold">
                    {comparison.session2.feedback.storytellingScore}/10
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-2">Comparison Summary</h3>
            <ul className="space-y-1 text-sm text-purple-800">
              {comparison.comparison.overall.improvement > 0 && (
                <li className="flex items-center gap-2">
                  <Icon icon="mingcute:arrow-up-line" width={16} className="text-green-600" />
                  <span>
                    Overall score improved by {comparison.comparison.overall.improvement.toFixed(1)} points
                  </span>
                </li>
              )}
              {comparison.comparison.clarity.improvement > 0 && (
                <li className="flex items-center gap-2">
                  <Icon icon="mingcute:check-circle-line" width={16} className="text-green-600" />
                  <span>
                    Clarity improved by {comparison.comparison.clarity.improvement.toFixed(1)} points
                  </span>
                </li>
              )}
              {comparison.comparison.professionalism.improvement > 0 && (
                <li className="flex items-center gap-2">
                  <Icon icon="mingcute:check-circle-line" width={16} className="text-green-600" />
                  <span>
                    Professionalism improved by{" "}
                    {comparison.comparison.professionalism.improvement.toFixed(1)} points
                  </span>
                </li>
              )}
              {comparison.comparison.structure.improvement > 0 && (
                <li className="flex items-center gap-2">
                  <Icon icon="mingcute:check-circle-line" width={16} className="text-green-600" />
                  <span>
                    Structure improved by {comparison.comparison.structure.improvement.toFixed(1)} points
                  </span>
                </li>
              )}
              {comparison.comparison.storytelling.improvement > 0 && (
                <li className="flex items-center gap-2">
                  <Icon icon="mingcute:check-circle-line" width={16} className="text-green-600" />
                  <span>
                    Storytelling improved by{" "}
                    {comparison.comparison.storytelling.improvement.toFixed(1)} points
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

