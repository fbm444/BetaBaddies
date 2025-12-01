import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { WritingPracticeSession, WritingPrompt, WritingFeedback } from "../../types";

interface PracticeSessionModalProps {
  prompt: WritingPrompt | string;
  onClose: () => void;
  onComplete: (session: WritingPracticeSession, feedback: WritingFeedback | null) => void;
}

export function PracticeSessionModal({
  prompt,
  onClose,
  onComplete,
}: PracticeSessionModalProps) {
  const [session, setSession] = useState<WritingPracticeSession | null>(null);
  const [response, setResponse] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const promptText = typeof prompt === "string" ? prompt : prompt.promptText;

  useEffect(() => {
    // Create session on mount
    createSession();
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Update word count
    const words = response.trim().split(/\s+/).filter((w) => w.length > 0);
    setWordCount(words.length);
  }, [response]);

  const createSession = async () => {
    try {
      const response = await api.createWritingSession({
        prompt: promptText,
        sessionType: "interview_response",
      });

      if (response.ok && response.data?.session) {
        setSession(response.data.session);
      } else {
        setError("Failed to create practice session");
      }
    } catch (err: any) {
      console.error("Failed to create session:", err);
      setError(err.message || "Failed to create practice session");
    }
  };

  const startTimer = () => {
    if (!session) return;
    
    setIsTimerRunning(true);
    startTimeRef.current = Date.now() - timeSpent * 1000;

    timerIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTimeSpent(elapsed);
      }
    }, 1000);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (!session || !response.trim()) {
      setError("Please write a response before submitting");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Update session with response
      const updateResponse = await api.updateWritingSession(session.id, {
        response,
        wordCount,
        timeSpentSeconds: timeSpent,
        isCompleted: true,
      });

      if (!updateResponse.ok || !updateResponse.data?.session) {
        throw new Error("Failed to save session");
      }

      const updatedSession = updateResponse.data.session;

      // Generate feedback
      setIsGeneratingFeedback(true);
      const feedbackResponse = await api.generateWritingFeedback(session.id);

      if (feedbackResponse.ok && feedbackResponse.data?.feedback) {
        setFeedback(feedbackResponse.data.feedback);
        onComplete(updatedSession, feedbackResponse.data.feedback);
      } else {
        onComplete(updatedSession, null);
      }
    } catch (err: any) {
      console.error("Failed to submit session:", err);
      setError(err.message || "Failed to submit session");
    } finally {
      setIsSubmitting(false);
      setIsGeneratingFeedback(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  if (isGeneratingFeedback) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-blue-500 mb-4"
          />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Generating Feedback
          </h3>
          <p className="text-slate-600">
            Analyzing your response and generating personalized feedback...
          </p>
        </div>
      </div>
    );
  }

  if (feedback) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-4xl my-8">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Feedback</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <Icon icon="mingcute:close-line" width={24} />
            </button>
          </div>
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
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
          <div className="p-6 border-t border-slate-200 flex justify-end gap-4">
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

  if (!session) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-blue-500 mb-4"
          />
          <p className="text-slate-600">Setting up practice session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900">Practice Session</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
              <span>{wordCount} words</span>
              <span className="font-mono">{formatTime(timeSpent)}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isTimerRunning && timeSpent === 0 && (
              <button
                onClick={startTimer}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium flex items-center gap-2"
              >
                <Icon icon="mingcute:play-line" width={16} />
                Start
              </button>
            )}
            {isTimerRunning && (
              <button
                onClick={pauseTimer}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium flex items-center gap-2"
              >
                <Icon icon="mingcute:pause-line" width={16} />
                Pause
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <Icon icon="mingcute:close-line" width={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Prompt */}
          <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Prompt</h3>
            <p className="text-blue-800">{promptText}</p>
          </div>

          {/* Writing Area */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your Response
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="w-full h-64 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Write your response here..."
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {wordCount > 0 && <span>{wordCount} words</span>}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !response.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icon icon="mingcute:loading-line" className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Icon icon="mingcute:check-line" width={16} />
                  Submit & Get Feedback
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

