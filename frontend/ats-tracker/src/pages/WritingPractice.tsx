import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { PracticeSessionModal } from "../components/writing-practice/PracticeSessionModal";
import { SessionDetailModal } from "../components/writing-practice/SessionDetailModal";
import { SessionComparisonModal } from "../components/writing-practice/SessionComparisonModal";
import { ProgressChart } from "../components/writing-practice/ProgressChart";
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
  const [comparisonSessionIds, setComparisonSessionIds] = useState<{ session1: string; session2: string } | null>(null);
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
      const response = await api.getWritingSessions({ 
        limit: 50,
        isCompleted: true, // Only fetch completed sessions
      });
      if (response.ok && response.data?.sessions) {
        // Filter to only show sessions with responses
        const sessionsWithResponses = response.data.sessions.filter(
          (session) => session.response && session.response.trim().length > 0
        );
        setSessions(sessionsWithResponses);
      }
    } catch (err: any) {
      console.error("Failed to fetch sessions:", err);
      setError("Failed to load session history");
    }
  };

  const fetchRecentSessions = async () => {
    try {
      const response = await api.getWritingSessions({ 
        limit: 5,
        isCompleted: true, // Only fetch completed sessions
      });
      if (response.ok && response.data?.sessions) {
        // Filter to only show sessions with responses
        const sessionsWithResponses = response.data.sessions.filter(
          (session) => session.response && session.response.trim().length > 0
        );
        setSessions(sessionsWithResponses);
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
            className="w-12 h-12 animate-spin mx-auto text-blue-700"
          />
          <p className="mt-4 text-slate-600">Loading writing practice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-poppins">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
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
        <div className="border-b border-slate-200 mb-8">
          <div 
            role="tablist" 
            aria-label="Writing practice tabs"
            className="flex gap-1 overflow-x-auto scrollbar-hide"
            onKeyDown={(e) => {
              const tabs = Array.from(e.currentTarget.querySelectorAll('button[role="tab"]')) as HTMLButtonElement[]
              const currentIndex = tabs.findIndex(tab => tab === document.activeElement)
              
              if (e.key === 'ArrowRight') {
                e.preventDefault()
                const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
                tabs[nextIndex]?.focus()
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
                tabs[prevIndex]?.focus()
              } else if (e.key === 'Home') {
                e.preventDefault()
                tabs[0]?.focus()
              } else if (e.key === 'End') {
                e.preventDefault()
                tabs[tabs.length - 1]?.focus()
              }
            }}
          >
            {[
              { id: "practice", label: "Practice", icon: "mingcute:edit-line" },
              { id: "history", label: "History", icon: "mingcute:file-list-line" },
              { id: "progress", label: "Progress", icon: "mingcute:chart-line" },
              { id: "exercises", label: "Exercises", icon: "mingcute:lightbulb-line" },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                id={`tab-${tab.id}`}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id as TabType)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveTab(tab.id as TabType)
                  }
                }}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap flex items-center gap-2 flex-shrink-0 min-w-fit bg-transparent hover:bg-transparent focus:bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 ${
                  activeTab === tab.id
                    ? "text-blue-700 border-b-2 border-blue-500"
                    : "text-slate-600"
                }`}
                style={{
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderRadius: '0'
                }}
              >
                <Icon icon={tab.icon} width={18} height={18} className="flex-shrink-0" style={{ minWidth: '18px', minHeight: '18px' }} />
                <span className="flex-shrink-0">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8 bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10 rounded-t-2xl">
          {activeTab === "practice" && (
            <div role="tabpanel" id="tabpanel-practice" aria-labelledby="tab-practice" className="space-y-6">
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
                  className="px-4 py-2 bg-blue-700 text-white rounded-full hover:bg-blue-800 text-sm font-medium"
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
                  { category: "behavioral", label: "Behavioral", icon: "mingcute:user-2-line" },
                  { category: "strengths", label: "Strengths", icon: "mingcute:star-line" },
                  { category: "weaknesses", label: "Weaknesses", icon: "mingcute:target-line" },
                  { category: "company_fit", label: "Company Fit", icon: "mingcute:building-2-line" },
                  { category: "situational", label: "Situational", icon: "mingcute:question-line" },
                  { category: "leadership", label: "Leadership", icon: "mingcute:user-star-line" },
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
                        <Icon icon={cat.icon} width={24} height={24} className="text-blue-700 flex-shrink-0" style={{ display: 'inline-block' }} />
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
            <div role="tabpanel" id="tabpanel-history" aria-labelledby="tab-history">
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
            <div role="tabpanel" id="tabpanel-progress" aria-labelledby="tab-progress">
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-slate-900">Writing Progress</h2>
                <p className="mt-2 text-sm text-[#6D7A99]">
                  Track your improvement and identify areas for growth
                </p>
              </div>

              {!progressMetrics && !progressInsights && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-[#6D7A99] text-center">
                  <Icon icon="mingcute:chart-line" width={48} className="text-slate-400 mx-auto mb-4" />
                  <p>Start practicing to see your progress analytics here.</p>
                </div>
              )}

              {progressMetrics && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                  <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#1E3097] to-[#3351FD] p-6 text-white border border-slate-300 min-h-[180px]">
                    <div className="flex items-start justify-between">
                      <p className="text-[22px] font-normal" style={{ fontFamily: "Poppins" }}>
                        Clarity
                      </p>
                      <Icon icon="mingcute:eye-line" width={24} height={24} className="text-white flex-shrink-0" />
                    </div>
                    <p
                      className="text-4xl font-medium leading-none text-[#E7EFFF] mt-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {progressMetrics.clarityAvg.toFixed(1)}/10
                    </p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#2563EB] to-[#60A5FA] p-6 text-white border border-slate-300 min-h-[180px]">
                    <div className="flex items-start justify-between">
                      <p className="text-[22px] font-normal" style={{ fontFamily: "Poppins" }}>
                        Professionalism
                      </p>
                      <Icon icon="mingcute:briefcase-line" width={24} height={24} className="text-white flex-shrink-0" />
                    </div>
                    <p
                      className="text-4xl font-medium leading-none text-[#E7EFFF] mt-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {progressMetrics.professionalismAvg.toFixed(1)}/10
                    </p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#3B82F6] to-[#93C5FD] p-6 text-white border border-slate-300 min-h-[180px]">
                    <div className="flex items-start justify-between">
                      <p className="text-[22px] font-normal" style={{ fontFamily: "Poppins" }}>
                        Structure
                      </p>
                      <Icon icon="mingcute:list-check-line" width={24} height={24} className="text-white flex-shrink-0" />
                    </div>
                    <p
                      className="text-4xl font-medium leading-none text-[#E7EFFF] mt-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {progressMetrics.structureAvg.toFixed(1)}/10
                    </p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#0284C7] to-[#38BDF8] p-6 text-white border border-slate-300 min-h-[180px]">
                    <div className="flex items-start justify-between">
                      <p className="text-[22px] font-normal" style={{ fontFamily: "Poppins" }}>
                        Storytelling
                      </p>
                      <Icon icon="mingcute:book-line" width={24} height={24} className="text-white flex-shrink-0" />
                    </div>
                    <p
                      className="text-4xl font-medium leading-none text-[#E7EFFF] mt-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {progressMetrics.storytellingAvg.toFixed(1)}/10
                    </p>
                  </div>
                </div>
              )}

              {progressInsights && progressInsights.insights.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon icon="mingcute:lightbulb-line" width={20} height={20} className="text-blue-600 flex-shrink-0" style={{ display: 'inline-block', minWidth: '20px', minHeight: '20px' }} />
                    <h3 className="text-lg font-semibold text-blue-900">Progress Insights</h3>
                  </div>
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

              {progressInsights && (
                <div className="rounded-3xl bg-white p-6 border border-slate-300">
                  <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-6" style={{ fontFamily: "Poppins" }}>Progress Trends</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProgressChart
                      trends={progressInsights.trends.overall}
                      title="Overall Score Trend"
                      color="#3b82f6"
                    />
                    <ProgressChart
                      trends={progressInsights.trends.clarity}
                      title="Clarity Trend"
                      color="#3b82f6"
                    />
                    <ProgressChart
                      trends={progressInsights.trends.professionalism}
                      title="Professionalism Trend"
                      color="#10b981"
                    />
                    <ProgressChart
                      trends={progressInsights.trends.structure}
                      title="Structure Trend"
                      color="#8b5cf6"
                    />
                    <div className="md:col-span-2 md:flex md:justify-center">
                      <div className="w-full md:max-w-[50%]">
                        <ProgressChart
                          trends={progressInsights.trends.storytelling}
                          title="Storytelling Trend"
                          color="#f97316"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "exercises" && (
            <div role="tabpanel" id="tabpanel-exercises" aria-labelledby="tab-exercises">
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
                    { type: "preparation_checklist", title: "Preparation Checklist", icon: "mingcute:list-check-line", description: "Coming soon" },
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
                        <Icon icon={exercise.icon} width={24} height={24} className="text-blue-700 flex-shrink-0" style={{ display: 'inline-block' }} />
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

      {/* Session Comparison Modal */}
      {comparisonSessionIds && (
        <SessionComparisonModal
          sessionId1={comparisonSessionIds.session1}
          sessionId2={comparisonSessionIds.session2}
          onClose={() => {
            setComparisonSessionIds(null);
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

