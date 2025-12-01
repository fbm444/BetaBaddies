import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { PracticeSessionModal } from "../components/writing-practice/PracticeSessionModal";
import { SessionDetailModal } from "../components/writing-practice/SessionDetailModal";
import { BreathingExercise } from "../components/writing-practice/exercises/BreathingExercise";
import { VisualizationExercise } from "../components/writing-practice/exercises/VisualizationExercise";
import { AffirmationExercise } from "../components/writing-practice/exercises/AffirmationExercise";
import type {
  WritingPracticeSession,
  WritingPrompt,
  ProgressMetrics,
  ProgressInsights,
  WritingFeedback,
} from "../types";

type TabType = "practice" | "history" | "progress" | "exercises";

export function WritingPractice() {
  const [activeTab, setActiveTab] = useState<TabType>("practice");
  const [sessions, setSessions] = useState<WritingPracticeSession[]>([]);
  const [prompts, setPrompts] = useState<WritingPrompt[]>([]);
  const [progressMetrics, setProgressMetrics] = useState<ProgressMetrics | null>(null);
  const [progressInsights, setProgressInsights] = useState<ProgressInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<WritingPrompt | string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState<"breathing" | "visualization" | "affirmation" | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchSessions();
    } else if (activeTab === "progress") {
      fetchProgress();
    }
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Promise.all([
        fetchPrompts(),
        fetchRecentSessions(),
        fetchProgress(),
      ]);
    } catch (err: any) {
      console.error("Failed to fetch initial data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrompts = async () => {
    try {
      const response = await api.getWritingPrompts({ isActive: true });
      if (response.ok && response.data?.prompts) {
        setPrompts(response.data.prompts);
      }
    } catch (err: any) {
      console.error("Failed to fetch prompts:", err);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.getWritingSessions({ limit: 50 });
      if (response.ok && response.data?.sessions) {
        setSessions(response.data.sessions);
      }
    } catch (err: any) {
      console.error("Failed to fetch sessions:", err);
      setError("Failed to load session history");
    }
  };

  const fetchRecentSessions = async () => {
    try {
      const response = await api.getWritingSessions({ limit: 5 });
      if (response.ok && response.data?.sessions) {
        setSessions(response.data.sessions);
      }
    } catch (err: any) {
      console.error("Failed to fetch recent sessions:", err);
    }
  };

  const fetchProgress = async () => {
    try {
      const [metricsRes, insightsRes] = await Promise.all([
        api.getWritingProgress(),
        api.getWritingProgressInsights(),
      ]);

      if (metricsRes.ok && metricsRes.data?.metrics) {
        setProgressMetrics(metricsRes.data.metrics);
      }

      if (insightsRes.ok && insightsRes.data?.insights) {
        setProgressInsights(insightsRes.data.insights);
      }
    } catch (err: any) {
      console.error("Failed to fetch progress:", err);
    }
  };

  const showMessage = (text: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccessMessage(text);
      setError(null);
    } else {
      setError(text);
      setSuccessMessage(null);
    }
    setTimeout(() => {
      if (type === "success") {
        setSuccessMessage(null);
      } else {
        setError(null);
      }
    }, 5000);
  };

  if (isLoading && activeTab === "practice") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-blue-500"
          />
          <p className="mt-4 text-slate-600">Loading writing practice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-poppins">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Writing Practice
          </h1>
          <p className="text-slate-600">
            Improve your interview responses with timed writing exercises and AI-powered feedback
          </p>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Icon icon="mingcute:check-circle-line" width={20} className="text-green-600" />
            <p className="text-green-800 text-sm m-0">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
            <p className="text-red-800 text-sm m-0">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="flex space-x-8">
            {[
              { id: "practice", label: "Practice", icon: "mingcute:edit-line" },
              { id: "history", label: "History", icon: "mingcute:file-list-line" },
              { id: "progress", label: "Progress", icon: "mingcute:chart-line" },
              { id: "exercises", label: "Exercises", icon: "mingcute:lightbulb-line" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon icon={tab.icon} width={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "practice" && (
          <div className="space-y-6">
            {/* Quick Start */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Quick Start</h2>
                <button
                  onClick={async () => {
                    try {
                      const response = await api.getRandomWritingPrompt();
                      if (response.ok && response.data?.prompt) {
                        setSelectedPrompt(response.data.prompt);
                        setShowSessionModal(true);
                      } else {
                        showMessage("Failed to get random prompt", "error");
                      }
                    } catch (err: any) {
                      showMessage("Failed to get random prompt", "error");
                    }
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
                >
                  Start Random Practice
                </button>
              </div>
              <p className="text-slate-600 text-sm">
                Get a random practice question and start improving your interview responses
              </p>
            </div>

            {/* Recent Sessions */}
            {sessions.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">Recent Sessions</h2>
                </div>
                <div className="divide-y divide-slate-200">
                  {sessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className="p-6 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-slate-500 mb-1">
                            {new Date(session.sessionDate).toLocaleDateString()}
                          </p>
                          <p className="text-slate-900 font-medium mb-2 line-clamp-2">
                            {session.prompt}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <span>{session.wordCount} words</span>
                            <span>{Math.floor(session.timeSpentSeconds / 60)} min</span>
                            {session.isCompleted && (
                              <span className="text-green-600 font-medium">Completed</span>
                            )}
                          </div>
                        </div>
                        <Icon icon="mingcute:arrow-right-line" width={20} className="text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt Categories */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">Practice by Category</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { category: "behavioral", label: "Behavioral", icon: "mingcute:user-line" },
                  { category: "strengths", label: "Strengths", icon: "mingcute:star-line" },
                  { category: "weaknesses", label: "Weaknesses", icon: "mingcute:target-line" },
                  { category: "company_fit", label: "Company Fit", icon: "mingcute:building-line" },
                  { category: "situational", label: "Situational", icon: "mingcute:question-line" },
                  { category: "leadership", label: "Leadership", icon: "mingcute:user-team-line" },
                ].map((cat) => {
                  const categoryPrompts = prompts.filter((p) => p.category === cat.category);
                  return (
                    <div
                      key={cat.category}
                      onClick={async () => {
                        try {
                          const response = await api.getRandomWritingPrompt(cat.category);
                          if (response.ok && response.data?.prompt) {
                            setSelectedPrompt(response.data.prompt);
                            setShowSessionModal(true);
                          }
                        } catch (err: any) {
                          showMessage("Failed to get prompt", "error");
                        }
                      }}
                      className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Icon icon={cat.icon} width={24} className="text-blue-500" />
                        <h3 className="font-semibold text-slate-900">{cat.label}</h3>
                      </div>
                      <p className="text-sm text-slate-600">
                        {categoryPrompts.length} prompts available
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">Session History</h2>
              </div>
              {sessions.length === 0 ? (
                <div className="p-12 text-center">
                  <Icon icon="mingcute:file-list-line" width={48} className="text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No practice sessions yet</p>
                  <p className="text-sm text-slate-500">
                    Start a practice session to see your history here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className="p-6 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-slate-500 mb-1">
                            {new Date(session.sessionDate).toLocaleDateString()}
                          </p>
                          <p className="text-slate-900 font-medium mb-2">
                            {session.prompt}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <span>{session.wordCount} words</span>
                            <span>{Math.floor(session.timeSpentSeconds / 60)} min</span>
                            <span className="capitalize">{session.sessionType.replace("_", " ")}</span>
                            {session.isCompleted && (
                              <span className="text-green-600 font-medium">✓ Completed</span>
                            )}
                          </div>
                        </div>
                        <Icon icon="mingcute:arrow-right-line" width={20} className="text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "progress" && (
          <div>
            {progressMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">Clarity</p>
                    <Icon icon="mingcute:eye-line" width={24} className="text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">
                    {progressMetrics.clarityAvg.toFixed(1)}/10
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">Professionalism</p>
                    <Icon icon="mingcute:briefcase-line" width={24} className="text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">
                    {progressMetrics.professionalismAvg.toFixed(1)}/10
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">Structure</p>
                    <Icon icon="mingcute:file-text-line" width={24} className="text-purple-500" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">
                    {progressMetrics.structureAvg.toFixed(1)}/10
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">Storytelling</p>
                    <Icon icon="mingcute:book-line" width={24} className="text-orange-500" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">
                    {progressMetrics.storytellingAvg.toFixed(1)}/10
                  </p>
                </div>
              </div>
            )}

            {progressInsights && progressInsights.insights.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Progress Insights</h3>
                <ul className="space-y-2">
                  {progressInsights.insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-blue-800">
                      <Icon icon="mingcute:lightbulb-line" width={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Progress Charts</h3>
              <p className="text-slate-600">
                Charts and detailed progress tracking coming soon...
              </p>
            </div>
          </div>
        )}

        {activeTab === "exercises" && (
          <div>
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">Nerves Management Exercises</h2>
              </div>
              <div className="p-6">
                <p className="text-slate-600 mb-6">
                  Practice exercises to manage interview nerves and build confidence
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { type: "breathing", title: "Breathing Exercise", icon: "mingcute:wind-line", description: "4-4-4-2 breathing technique" },
                    { type: "visualization", title: "Visualization", icon: "mingcute:eye-line", description: "Visualize interview success" },
                    { type: "affirmation", title: "Affirmations", icon: "mingcute:heart-line", description: "Build confidence with positive affirmations" },
                    { type: "preparation_checklist", title: "Preparation Checklist", icon: "mingcute:checklist-line", description: "Coming soon" },
                  ].map((exercise) => (
                    <div
                      key={exercise.type}
                      onClick={() => {
                        if (exercise.type === "preparation_checklist") {
                          showMessage("Preparation checklist coming soon!", "error");
                        } else {
                          setActiveExercise(exercise.type as "breathing" | "visualization" | "affirmation");
                        }
                      }}
                      className="p-6 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Icon icon={exercise.icon} width={24} className="text-blue-500" />
                        <h3 className="font-semibold text-slate-900">{exercise.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600">
                        {exercise.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Practice Session Modal */}
      {showSessionModal && selectedPrompt && (
        <PracticeSessionModal
          prompt={selectedPrompt}
          onClose={() => {
            setShowSessionModal(false);
            setSelectedPrompt(null);
          }}
          onComplete={async (session, feedback) => {
            setShowSessionModal(false);
            setSelectedPrompt(null);
            if (feedback) {
              showMessage("Feedback generated successfully!", "success");
            }
            // Refresh sessions
            await fetchRecentSessions();
            if (activeTab === "history") {
              await fetchSessions();
            }
            if (activeTab === "progress") {
              await fetchProgress();
            }
          }}
        />
      )}

      {/* Session Detail Modal */}
      {selectedSessionId && (
        <SessionDetailModal
          sessionId={selectedSessionId}
          onClose={() => {
            setSelectedSessionId(null);
            // Refresh sessions when closing
            fetchRecentSessions();
            if (activeTab === "history") {
              fetchSessions();
            }
          }}
        />
      )}

      {/* Exercise Modals */}
      {activeExercise === "breathing" && (
        <BreathingExercise
          onClose={() => setActiveExercise(null)}
          onComplete={() => {
            setActiveExercise(null);
            showMessage("Breathing exercise completed!", "success");
          }}
        />
      )}

      {activeExercise === "visualization" && (
        <VisualizationExercise
          onClose={() => setActiveExercise(null)}
          onComplete={() => {
            setActiveExercise(null);
            showMessage("Visualization exercise completed!", "success");
          }}
        />
      )}

      {activeExercise === "affirmation" && (
        <AffirmationExercise
          onClose={() => setActiveExercise(null)}
          onComplete={() => {
            setActiveExercise(null);
            showMessage("Affirmation exercise completed!", "success");
          }}
        />
      )}
    </div>
  );
}

