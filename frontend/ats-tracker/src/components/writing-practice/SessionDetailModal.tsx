import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { WritingPracticeSession, WritingFeedback } from "../../types";

interface SessionDetailModalProps {
  sessionId: string;
  onClose: () => void;
}

export function SessionDetailModal({ sessionId, onClose }: SessionDetailModalProps) {
  const [session, setSession] = useState<WritingPracticeSession | null>(null);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [sessionRes, feedbackRes] = await Promise.all([
        api.getWritingSessionById(sessionId),
        api.getWritingFeedback(sessionId).catch(() => null), // Feedback might not exist
      ]);

      if (sessionRes.ok && sessionRes.data?.session) {
        setSession(sessionRes.data.session);
      } else {
        throw new Error("Failed to load session");
      }

      if (feedbackRes?.ok && feedbackRes.data?.feedback) {
        setFeedback(feedbackRes.data.feedback);
      }
    } catch (err: any) {
      console.error("Failed to fetch session data:", err);
      setError(err.message || "Failed to load session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFeedback = async () => {
    if (!session || !session.response) {
      return;
    }

    try {
      setIsGeneratingFeedback(true);
      setError(null);

      const response = await api.generateWritingFeedback(sessionId);
      if (response.ok && response.data?.feedback) {
        setFeedback(response.data.feedback);
      } else {
        throw new Error("Failed to generate feedback");
      }
    } catch (err: any) {
      console.error("Failed to generate feedback:", err);
      setError(err.message || "Failed to generate feedback");
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-blue-700 mb-4"
          />
          <p className="text-slate-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <Icon icon="mingcute:alert-line" width={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Error</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Session Details</h2>
            <p className="text-sm text-slate-600 mt-1">
              {new Date(session.sessionDate).toLocaleDateString()} • {session.wordCount} words •{" "}
              {Math.floor(session.timeSpentSeconds / 60)} min
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Prompt */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Prompt</h3>
            <p className="text-blue-800">{session.prompt}</p>
          </div>

          {/* Response */}
          {session.response && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">Your Response</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{session.response}</p>
            </div>
          )}

          {/* Feedback Section */}
          {feedback ? (
            <div className="space-y-6">
              {/* Scores */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 mb-1">Clarity</p>
                  <p className="text-2xl font-bold text-blue-900">{feedback.clarityScore}/10</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 mb-1">Professionalism</p>
                  <p className="text-2xl font-bold text-green-900">{feedback.professionalismScore}/10</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-700 mb-1">Structure</p>
                  <p className="text-2xl font-bold text-purple-900">{feedback.structureScore}/10</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xs text-orange-700 mb-1">Storytelling</p>
                  <p className="text-2xl font-bold text-orange-900">{feedback.storytellingScore}/10</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-700 mb-1">Overall</p>
                  <p className="text-2xl font-bold text-slate-900">{feedback.overallScore}/10</p>
                </div>
              </div>

              {/* Feedback Sections */}
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-2">Clarity Feedback</h4>
                  <p className="text-sm text-slate-700">{feedback.clarityFeedback}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-2">Professionalism Feedback</h4>
                  <p className="text-sm text-slate-700">{feedback.professionalismFeedback}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-2">Structure Feedback</h4>
                  <p className="text-sm text-slate-700">{feedback.structureFeedback}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-2">Storytelling Feedback</h4>
                  <p className="text-sm text-slate-700">{feedback.storytellingFeedback}</p>
                </div>
              </div>

              {/* Strengths */}
              {feedback.strengths.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {feedback.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                        <Icon icon="mingcute:check-circle-line" width={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {feedback.improvements.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Improvements</h4>
                  <ul className="space-y-1">
                    {feedback.improvements.map((improvement, idx) => (
                      <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                        <Icon icon="mingcute:arrow-right-line" width={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tips */}
              {feedback.tips.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2">Tips</h4>
                  <ul className="space-y-1">
                    {feedback.tips.map((tip, idx) => (
                      <li key={idx} className="text-sm text-purple-800 flex items-start gap-2">
                        <Icon icon="mingcute:lightbulb-line" width={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : session.response ? (
            <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200 text-center">
              <Icon icon="mingcute:alert-line" width={48} className="text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Feedback Yet</h3>
              <p className="text-yellow-800 mb-4">
                Generate AI-powered feedback to see detailed analysis of your response.
              </p>
              <button
                onClick={handleGenerateFeedback}
                disabled={isGeneratingFeedback}
                className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {isGeneratingFeedback ? (
                  <>
                    <Icon icon="mingcute:loading-line" className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon icon="mingcute:magic-line" width={16} />
                    Generate Feedback
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 text-center">
              <p className="text-slate-600">No response submitted yet.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

