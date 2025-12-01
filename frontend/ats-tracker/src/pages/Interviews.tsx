import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";
import companyResearchService, {
  type InterviewInsights,
  type InterviewInsightsMetadata,
} from "../services/companyResearchService";
import type {
  InterviewData,
  InterviewInput,
  InterviewStatus,
  JobOpportunityData,
  InterviewAnalytics,
} from "../types";
import {
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_STATUS_COLORS,
} from "../types/interview.types";

type TabType = "schedule" | "preparation" | "reminders" | "thank-you" | "follow-ups" | "calendar" | "analytics";

export function Interviews() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobOpportunityId = searchParams.get("jobOpportunityId");
  const tabParam = searchParams.get("tab") as TabType | null;

  const [activeTab, setActiveTab] = useState<TabType>(tabParam || "schedule");
  const [interviews, setInterviews] = useState<InterviewData[]>([]);
  const [jobOpportunities, setJobOpportunities] = useState<JobOpportunityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Reminders state
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  // Follow-ups state
  const [pendingFollowUps, setPendingFollowUps] = useState<any[]>([]);
  const [completedFollowUps, setCompletedFollowUps] = useState<any[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [activeFollowUpDraft, setActiveFollowUpDraft] = useState<{
    id: string;
    interviewId: string;
    subject: string;
    body: string;
    generatedBy?: string;
  } | null>(null);
  const [draftLoadingId, setDraftLoadingId] = useState<string | null>(null);
  // Store generated drafts history by follow-up ID (latest first)
  const [storedFollowUpDrafts, setStoredFollowUpDrafts] = useState<
    Map<
      string,
      Array<{
        subject: string;
        body: string;
        generatedBy?: string;
        createdAt: string;
      }>
    >
  >(new Map());
  const [showAllFollowUpDrafts, setShowAllFollowUpDrafts] = useState<Map<string, boolean>>(new Map());

  // Thank-you notes modal state
  const [activeThankYouInterview, setActiveThankYouInterview] = useState<InterviewData | null>(null);
  const [thankYouNotes, setThankYouNotes] = useState<any[]>([]);
  const [loadingThankYou, setLoadingThankYou] = useState(false);
  const [showAllThankYouNotes, setShowAllThankYouNotes] = useState(false);

  // Calendar state
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<InterviewAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Preparation/Interview Insights state
  const [companyInsights, setCompanyInsights] = useState<Map<string, {
    company: string;
    jobId: string;
    jobTitle: string;
    insights: InterviewInsights | null;
    metadata: InterviewInsightsMetadata | null;
    loading: boolean;
    error: string | null;
  }>>(new Map());
  const [loadingPreparation, setLoadingPreparation] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (companyKey: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyKey)) {
        newSet.delete(companyKey);
      } else {
        newSet.add(companyKey);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchInterviews();
    fetchJobOpportunities();
    checkCalendarStatus();
  }, []);

  useEffect(() => {
    if (activeTab === "reminders") {
      fetchUpcomingReminders();
    }
    if (activeTab === "follow-ups") {
      fetchPendingFollowUps();
    }
    if (activeTab === "preparation") {
      fetchCompanyInsights();
    }
    if (activeTab === "analytics") {
      fetchAnalytics();
    }
  }, [activeTab, interviews, jobOpportunities]);

  const fetchInterviews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getInterviews();
      if (response.ok && response.data) {
        setInterviews(response.data.interviews || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch interviews:", err);
      setError(err.message || "Failed to load interviews");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobOpportunities = async () => {
    try {
      const response = await api.getJobOpportunities({});
      if (response.ok && response.data) {
        setJobOpportunities(response.data.jobOpportunities || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch job opportunities:", err);
    }
  };

  const fetchUpcomingReminders = async () => {
    setLoadingReminders(true);
    try {
      // Fetch reminders for all upcoming interviews
      const upcomingInterviews = interviews.filter((interview) => {
        if (!interview.scheduledAt) return false;
        const interviewDate = new Date(interview.scheduledAt);
        const now = new Date();
        return interviewDate > now && interview.status === "scheduled";
      });

      const allReminders: any[] = [];
      for (const interview of upcomingInterviews) {
        try {
          const response = await api.getRemindersForInterview(interview.id);
          if (response.ok && response.data?.reminders) {
            const reminders = response.data.reminders
              .filter((r: any) => r.status === "pending")
              .map((r: any) => ({ ...r, interview }));
            allReminders.push(...reminders);
          }
        } catch (err) {
          console.error(`Failed to fetch reminders for interview ${interview.id}:`, err);
        }
      }

      // Sort by scheduled_at
      allReminders.sort((a, b) => 
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );
      setUpcomingReminders(allReminders);
    } catch (err: any) {
      console.error("Failed to fetch reminders:", err);
    } finally {
      setLoadingReminders(false);
    }
  };

  const fetchPendingFollowUps = async () => {
    setLoadingFollowUps(true);
    try {
      const response = await api.getAllFollowUps();
      if (response.ok && response.data) {
        const allFollowUps = response.data.followUps || [];
        // Separate pending and completed
        const pending = allFollowUps.filter((fu: any) => !fu.completed);
        const completed = allFollowUps.filter((fu: any) => fu.completed);
        setPendingFollowUps(pending);
        setCompletedFollowUps(completed);
      }
    } catch (err: any) {
      console.error("Failed to fetch follow-ups:", err);
    } finally {
      setLoadingFollowUps(false);
    }
  };

  const checkCalendarStatus = async () => {
    setCalendarLoading(true);
    try {
      const response = await api.getGoogleCalendarStatus();
      if (response.ok && response.data) {
        setCalendarConnected(response.data.status?.enabled || false);
      }
    } catch (err: any) {
      console.error("Failed to check calendar status:", err);
    } finally {
      setCalendarLoading(false);
    }
  };

  const fetchCompanyInsights = async () => {
    setLoadingPreparation(true);
    try {
      // Get unique companies from job opportunities and interviews
      const companiesMap = new Map<string, { jobId: string; company: string; jobTitle: string }>();

      // Add companies from job opportunities
      jobOpportunities.forEach((job) => {
        if (job.company && !companiesMap.has(job.company.toLowerCase())) {
          companiesMap.set(job.company.toLowerCase(), {
            jobId: job.id,
            company: job.company,
            jobTitle: job.title || "Position",
          });
        }
      });

      // Add companies from interviews
      interviews.forEach((interview) => {
        if (interview.company && interview.jobOpportunityId) {
          const companyKey = interview.company.toLowerCase();
          if (!companiesMap.has(companyKey)) {
            companiesMap.set(companyKey, {
              jobId: interview.jobOpportunityId,
              company: interview.company,
              jobTitle: interview.title || "Interview",
            });
          }
        }
      });

      // Initialize insights map
      const insightsMap = new Map(companyInsights);

      // Fetch insights for each company
      for (const [companyKey, companyData] of companiesMap.entries()) {
        if (!insightsMap.has(companyKey)) {
          insightsMap.set(companyKey, {
            ...companyData,
            insights: null,
            metadata: null,
            loading: true,
            error: null,
          });
        }
      }

      setCompanyInsights(insightsMap);

      // Fetch insights for each company
      for (const [companyKey, companyData] of companiesMap.entries()) {
        await fetchInsightsForCompany(companyData.jobId, companyData.company, companyKey);
      }
    } catch (err: any) {
      console.error("Failed to fetch company insights:", err);
    } finally {
      setLoadingPreparation(false);
    }
  };

  const openThankYouModal = async (interview: InterviewData) => {
    setActiveThankYouInterview(interview);
    setLoadingThankYou(true);
    try {
      const response = await api.getThankYouNotes(interview.id);
      if (response.ok && response.data?.notes) {
        setThankYouNotes(response.data.notes);
      } else {
        setThankYouNotes([]);
      }
    } catch (err) {
      console.error("Failed to load thank-you notes:", err);
      setThankYouNotes([]);
    } finally {
      setLoadingThankYou(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const response = await api.getInterviewAnalytics();
      if (response.ok && response.data) {
        setAnalytics(response.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch analytics:", err);
      showMessage(err.message || "Failed to load analytics", "error");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchInsightsForCompany = async (jobId: string, company: string, companyKey: string) => {
    setCompanyInsights((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(companyKey);
      if (existing) {
        updated.set(companyKey, { ...existing, loading: true, error: null });
      }
      return updated;
    });

    try {
      const response = await companyResearchService.getInterviewInsights(jobId);
      setCompanyInsights((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(companyKey) || {
          company,
          jobId,
          jobTitle: jobOpportunities.find((j) => j.id === jobId)?.title || "Position",
          insights: null,
          metadata: null,
          loading: false,
          error: null,
        };
        updated.set(companyKey, {
          ...existing,
          insights: response.interviewInsights,
          metadata: response.metadata,
          loading: false,
          error: null,
        });
        return updated;
      });
    } catch (err: any) {
      console.error(`Failed to fetch insights for ${company}:`, err);
      setCompanyInsights((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(companyKey);
        if (existing) {
          updated.set(companyKey, {
            ...existing,
            loading: false,
            error: err.message || "Failed to load insights",
          });
        }
        return updated;
      });
    }
  };

  const refreshInsightsForCompany = async (jobId: string, companyKey: string) => {
    const companyData = companyInsights.get(companyKey);
    if (!companyData) return;

    setCompanyInsights((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(companyKey);
      if (existing) {
        updated.set(companyKey, { ...existing, loading: true, error: null });
      }
      return updated;
    });

    try {
      const response = await companyResearchService.getInterviewInsights(jobId, { refresh: true });
      setCompanyInsights((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(companyKey);
        if (existing) {
          updated.set(companyKey, {
            ...existing,
            insights: response.interviewInsights,
            metadata: response.metadata,
            loading: false,
            error: null,
          });
        }
        return updated;
      });
      showMessage("Interview insights refreshed!", "success");
    } catch (err: any) {
      console.error(`Failed to refresh insights:`, err);
      setCompanyInsights((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(companyKey);
        if (existing) {
          updated.set(companyKey, {
            ...existing,
            loading: false,
            error: err.message || "Failed to refresh insights",
          });
        }
        return updated;
      });
      showMessage(err.message || "Failed to refresh insights", "error");
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const response = await api.getGoogleCalendarAuthUrl();
      if (response.ok && response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      }
    } catch (err: any) {
      setError(err.message || "Failed to get calendar auth URL");
    }
  };

  const showMessage = (text: string, type: "success" | "error" | "info") => {
    if (type === "success") {
      setSuccessMessage(text);
      setError(null);
      setInfoMessage(null);
    } else if (type === "error") {
      setError(text);
      setSuccessMessage(null);
      setInfoMessage(null);
    } else {
      setInfoMessage(text);
      setError(null);
      setSuccessMessage(null);
    }
    setTimeout(() => {
      if (type === "success") {
        setSuccessMessage(null);
      } else if (type === "error") {
        setError(null);
      } else {
        setInfoMessage(null);
      }
    }, 5000);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Color mapping for interview format tags
  const getInterviewFormatColor = (format: string) => {
    const normalized = format.toLowerCase().trim();
    if (normalized.includes("phone") || normalized.includes("phone screen")) {
      return "bg-blue-100 text-blue-700";
    } else if (normalized.includes("virtual") || normalized.includes("video")) {
      return "bg-purple-100 text-purple-700";
    } else if (normalized.includes("in-person") || normalized.includes("onsite") || normalized.includes("on-site")) {
      return "bg-green-100 text-green-700";
    }
    return "bg-slate-100 text-slate-700";
  };

  // Color mapping for question category tags
  const getQuestionCategoryColor = (category: string) => {
    const normalized = category.toLowerCase().trim().replace(/_/g, " ");
    if (normalized.includes("system design") || normalized.includes("system")) {
      return "bg-orange-100 text-orange-700";
    } else if (normalized.includes("behavioral") || normalized.includes("behavior")) {
      return "bg-pink-100 text-pink-700";
    } else if (normalized.includes("technical") || normalized.includes("tech")) {
      return "bg-indigo-100 text-indigo-700";
    } else if (normalized.includes("culture") || normalized.includes("cultural")) {
      return "bg-teal-100 text-teal-700";
    } else if (normalized.includes("coding") || normalized.includes("code")) {
      return "bg-cyan-100 text-cyan-700";
    } else if (normalized.includes("algorithm")) {
      return "bg-amber-100 text-amber-700";
    }
    return "bg-slate-100 text-slate-700";
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "schedule", label: "Schedule", icon: "mingcute:calendar-line" },
    { id: "preparation", label: "Preparation", icon: "mingcute:bulb-line" },
    { id: "reminders", label: "Reminders", icon: "mingcute:clipboard-line" },
    { id: "thank-you", label: "Thank You Notes", icon: "mingcute:mail-line" },
    { id: "follow-ups", label: "Follow-ups", icon: "mingcute:task-line" },
    { id: "calendar", label: "Calendar", icon: "mingcute:calendar-2-line" },
    { id: "analytics", label: "Analytics", icon: "mingcute:chart-bar-line" },
  ];

  return (
    <div className="min-h-screen bg-white font-poppins">
      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Interviews
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-slate-600">
              View and manage your interviews. Schedule new interviews, view upcoming ones, and access all interview details.
            </p>
            {activeTab === "schedule" && (
              <button
                onClick={() => navigate(`${ROUTES.INTERVIEW_SCHEDULING}${jobOpportunityId ? `?jobOpportunityId=${jobOpportunityId}` : ""}`)}
                className="px-6 py-3 rounded-full bg-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow hover:bg-blue-600 whitespace-nowrap"
              >
                <Icon icon="mingcute:add-line" width={20} />
                Schedule New Interview
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Icon icon="mingcute:check-circle-line" width={20} className="text-green-600" />
            <p className="text-green-800 text-sm m-0">{successMessage}</p>
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <Icon icon="mingcute:information-line" width={20} className="text-blue-600" />
            <p className="text-blue-800 text-sm m-0">{infoMessage}</p>
          </div>
        )}

        {/* Follow-up email draft modal */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
            <p className="text-red-800 text-sm m-0">{error}</p>
          </div>
        )}

        {/* Thank-you note modal */}
        {activeThankYouInterview && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 px-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 font-poppins">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Thank You Note – {activeThankYouInterview.title || "Interview"} at{" "}
                    {activeThankYouInterview.company || "Company"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Generate a draft, then copy it into your email client and edit before sending.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveThankYouInterview(null);
                    setThankYouNotes([]);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Icon icon="mingcute:close-line" width={20} />
                </button>
              </div>

              {loadingThankYou ? (
                <div className="text-center py-8">
                  <Icon
                    icon="mingcute:loading-line"
                    className="animate-spin text-blue-500 mx-auto mb-2"
                    width={24}
                  />
                  <p className="text-slate-600 text-sm">Loading thank-you notes...</p>
                </div>
              ) : (
                <>
                  {thankYouNotes.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-slate-500">
                          Latest Draft
                        </label>
                        {thankYouNotes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setShowAllThankYouNotes((prev) => !prev)}
                            className="text-[11px] text-blue-600 hover:text-blue-700 underline"
                          >
                            {showAllThankYouNotes
                              ? "Hide previous drafts"
                              : `View previous drafts (${thankYouNotes.length - 1})`}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={thankYouNotes[0].subject}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 mb-2"
                      />
                      <textarea
                        readOnly
                        rows={8}
                        value={thankYouNotes[0].body}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 font-mono whitespace-pre-wrap"
                      />

                      {showAllThankYouNotes && thankYouNotes.length > 1 && (
                        <div className="mt-3 border-t border-slate-200 pt-3 space-y-2 max-h-40 overflow-y-auto">
                          {thankYouNotes.slice(1).map((note, index) => (
                            <button
                              key={note.id || index}
                              type="button"
                              onClick={() => {
                                // swap selected previous into the main view position
                                setThankYouNotes((prev) => {
                                  const copy = [...prev];
                                  const targetIndex = index + 1;
                                  const [selected] = copy.splice(targetIndex, 1);
                                  return [selected, ...copy];
                                });
                              }}
                              className="w-full text-left text-xs px-2 py-1 rounded-lg hover:bg-slate-50 border border-slate-100 flex justify-between items-center"
                            >
                              <span className="truncate max-w-[70%]">
                                {note.subject || "Untitled draft"}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {(note.createdAt || note.updatedAt || note.sentAt) &&
                                  new Date(
                                    note.updatedAt || note.createdAt || note.sentAt
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {thankYouNotes.length === 0 && (
                    <p className="text-sm text-slate-500 mb-4">
                      No thank-you note has been generated yet for this interview.
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
                    <div className="flex flex-wrap gap-2">
                      {thankYouNotes.length > 0 ? (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!activeThankYouInterview) return;
                              setLoadingThankYou(true);
                              try {
                                const response = await api.generateThankYouNote(
                                  activeThankYouInterview.id,
                                  "standard",
                                  { regenerate: true }
                                );
                                if (response.ok && response.data?.note) {
                                  const notesResponse = await api.getThankYouNotes(
                                    activeThankYouInterview.id
                                  );
                                  if (notesResponse.ok && notesResponse.data?.notes) {
                                    setThankYouNotes(notesResponse.data.notes);
                                  }
                                  showMessage("Standard thank-you draft regenerated!", "success");
                                }
                              } catch (err: any) {
                                showMessage(
                                  err.message || "Failed to regenerate thank-you note",
                                  "error"
                                );
                              } finally {
                                setLoadingThankYou(false);
                              }
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs sm:text-sm font-medium"
                          >
                            Generate Standard
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!activeThankYouInterview) return;
                              setLoadingThankYou(true);
                              try {
                                const response = await api.generateThankYouNote(
                                  activeThankYouInterview.id,
                                  "enthusiastic",
                                  { regenerate: true }
                                );
                                if (response.ok && response.data?.note) {
                                  const notesResponse = await api.getThankYouNotes(
                                    activeThankYouInterview.id
                                  );
                                  if (notesResponse.ok && notesResponse.data?.notes) {
                                    setThankYouNotes(notesResponse.data.notes);
                                  }
                                  showMessage("Enthusiastic thank-you draft regenerated!", "success");
                                }
                              } catch (err: any) {
                                showMessage(
                                  err.message || "Failed to regenerate thank-you note",
                                  "error"
                                );
                              } finally {
                                setLoadingThankYou(false);
                              }
                            }}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-xs sm:text-sm font-medium"
                          >
                            Generate Enthusiastic
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!activeThankYouInterview) return;
                              setLoadingThankYou(true);
                              try {
                                const response = await api.generateThankYouNote(
                                  activeThankYouInterview.id,
                                  "concise",
                                  { regenerate: true }
                                );
                                if (response.ok && response.data?.note) {
                                  const notesResponse = await api.getThankYouNotes(
                                    activeThankYouInterview.id
                                  );
                                  if (notesResponse.ok && notesResponse.data?.notes) {
                                    setThankYouNotes(notesResponse.data.notes);
                                  }
                                  showMessage("Concise thank-you draft regenerated!", "success");
                                }
                              } catch (err: any) {
                                showMessage(
                                  err.message || "Failed to regenerate thank-you note",
                                  "error"
                                );
                              } finally {
                                setLoadingThankYou(false);
                              }
                            }}
                            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-xs sm:text-sm font-medium"
                          >
                            Generate Concise
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!activeThankYouInterview) return;
                              setLoadingThankYou(true);
                              try {
                                const response = await api.generateThankYouNote(
                                  activeThankYouInterview.id,
                                  "standard"
                                );
                                if (response.ok && response.data?.note) {
                                  const notesResponse = await api.getThankYouNotes(
                                    activeThankYouInterview.id
                                  );
                                  if (notesResponse.ok && notesResponse.data?.notes) {
                                    setThankYouNotes(notesResponse.data.notes);
                                  }
                                  showMessage("Standard thank-you draft generated!", "success");
                                }
                              } catch (err: any) {
                                showMessage(
                                  err.message || "Failed to generate thank-you note",
                                  "error"
                                );
                              } finally {
                                setLoadingThankYou(false);
                              }
                            }}
                            className="px-6 py-3 rounded-full transition-all text-xs sm:text-sm font-semibold relative overflow-hidden"
                            style={{
                              background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box',
                              border: '2px solid transparent',
                              color: '#845BFF'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(to right, #845BFF, #F551A2) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(white, white) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box';
                              e.currentTarget.style.color = '#845BFF';
                            }}
                          >
                            Generate Standard
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!activeThankYouInterview) return;
                              setLoadingThankYou(true);
                              try {
                                const response = await api.generateThankYouNote(
                                  activeThankYouInterview.id,
                                  "enthusiastic"
                                );
                                if (response.ok && response.data?.note) {
                                  const notesResponse = await api.getThankYouNotes(
                                    activeThankYouInterview.id
                                  );
                                  if (notesResponse.ok && notesResponse.data?.notes) {
                                    setThankYouNotes(notesResponse.data.notes);
                                  }
                                  showMessage("Enthusiastic thank-you draft generated!", "success");
                                }
                              } catch (err: any) {
                                showMessage(
                                  err.message || "Failed to generate thank-you note",
                                  "error"
                                );
                              } finally {
                                setLoadingThankYou(false);
                              }
                            }}
                            className="px-6 py-3 rounded-full transition-all text-xs sm:text-sm font-semibold relative overflow-hidden"
                            style={{
                              background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box',
                              border: '2px solid transparent',
                              color: '#845BFF'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(to right, #845BFF, #F551A2) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(white, white) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box';
                              e.currentTarget.style.color = '#845BFF';
                            }}
                          >
                            Generate Enthusiastic
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!activeThankYouInterview) return;
                              setLoadingThankYou(true);
                              try {
                                const response = await api.generateThankYouNote(
                                  activeThankYouInterview.id,
                                  "concise"
                                );
                                if (response.ok && response.data?.note) {
                                  const notesResponse = await api.getThankYouNotes(
                                    activeThankYouInterview.id
                                  );
                                  if (notesResponse.ok && notesResponse.data?.notes) {
                                    setThankYouNotes(notesResponse.data.notes);
                                  }
                                  showMessage("Concise thank-you draft generated!", "success");
                                }
                              } catch (err: any) {
                                showMessage(
                                  err.message || "Failed to generate thank-you note",
                                  "error"
                                );
                              } finally {
                                setLoadingThankYou(false);
                              }
                            }}
                            className="px-6 py-3 rounded-full transition-all text-xs sm:text-sm font-semibold relative overflow-hidden"
                            style={{
                              background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box',
                              border: '2px solid transparent',
                              color: '#845BFF'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(to right, #845BFF, #F551A2) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(white, white) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box';
                              e.currentTarget.style.color = '#845BFF';
                            }}
                          >
                            Generate Concise
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setActiveThankYouInterview(null);
                        setThankYouNotes([]);
                      }}
                      className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-8">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "analytics") {
                    navigate(ROUTES.INTERVIEW_ANALYTICS);
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
                className={`relative pb-3 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 bg-transparent ${
                  activeTab === tab.id
                    ? "text-blue-500"
                    : "text-slate-600"
                }`}
                style={{ 
                  outline: 'none', 
                  boxShadow: 'none', 
                  border: 'none',
                  borderRadius: '0px',
                  borderTopLeftRadius: '0px',
                  borderTopRightRadius: '0px',
                  borderBottomLeftRadius: '0px',
                  borderBottomRightRadius: '0px'
                }}
                onFocus={(e) => e.target.blur()}
              >
                <Icon icon={tab.icon} width={18} />
                {tab.label}
                {activeTab === tab.id && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                    style={{ height: '2px', borderRadius: '0px' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8 bg-slate-50 -mx-6 lg:-mx-10 px-6 lg:px-10 py-10 rounded-t-2xl">
          {activeTab === "schedule" && (
            <div>
              {jobOpportunityId && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <Icon icon="mingcute:info-line" width={16} className="inline mr-2" />
                    Scheduling interview for a job opportunity. The job will be pre-selected when you create the interview.
                  </p>
                </div>
              )}
              
              {isLoading ? (
                <div className="text-center py-12">
                  <Icon icon="mingcute:loading-line" className="animate-spin text-blue-500 mx-auto mb-4" width={32} />
                  <p className="text-slate-600">Loading interviews...</p>
                </div>
              ) : interviews.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <Icon icon="mingcute:calendar-line" width={48} className="text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No interviews scheduled yet</p>
                  <button
                    onClick={() => navigate(`${ROUTES.INTERVIEW_SCHEDULING}${jobOpportunityId ? `?jobOpportunityId=${jobOpportunityId}` : ""}`)}
                    className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium inline-flex items-center gap-2"
                  >
                    <Icon icon="mingcute:add-line" width={18} />
                    Schedule Your First Interview
                  </button>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {interviews.slice(0, 6).map((interview) => (
                      <div
                        key={interview.id}
                        className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`${ROUTES.INTERVIEW_SCHEDULING}?interviewId=${interview.id}`)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 mb-1">{interview.title || "Interview"}</h3>
                            <p className="text-slate-600 text-sm">{interview.company || "N/A"}</p>
                            {interview.jobOpportunityId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    `${ROUTES.JOB_OPPORTUNITIES}?jobId=${interview.jobOpportunityId}`
                                  );
                                }}
                                className="mt-1 text-xs text-blue-600 hover:text-blue-700 underline"
                              >
                                View linked job application
                              </button>
                            )}
                          </div>
                          <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: interview.status ? INTERVIEW_STATUS_COLORS[interview.status] + "20" : "#f1f5f9",
                              color: interview.status ? INTERVIEW_STATUS_COLORS[interview.status] : "#64748b",
                            }}
                          >
                            {interview.status ? INTERVIEW_STATUS_LABELS[interview.status] : "Unknown"}
                          </span>
                        </div>
                        {interview.scheduledAt && (
                          <p className="text-slate-600 text-sm mb-3">
                            <Icon icon="mingcute:time-line" width={14} className="inline mr-1" />
                            {formatDateTime(interview.scheduledAt)}
                          </p>
                        )}
                        <button className="px-4 py-2 bg-transparent border-2 border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 text-sm font-medium transition-colors">
                          View Details →
                        </button>
                      </div>
                    ))}
                  </div>
                  {interviews.length > 6 && (
                    <div className="text-center">
                      <button
                        onClick={() => navigate(ROUTES.INTERVIEW_SCHEDULING)}
                        className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 font-medium transition-colors"
                      >
                        View All Interviews
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "preparation" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Interview Preparation</h2>
              <p className="text-slate-600 mb-6">
                Get personalized interview tips, insights, and preparation guides organized by company. This information is cached and saved for quick access.
              </p>
              {loadingPreparation ? (
                <div className="text-center py-12">
                  <Icon icon="mingcute:loading-line" className="animate-spin text-blue-500 mx-auto mb-4" width={32} />
                  <p className="text-slate-600">Loading interview insights...</p>
                </div>
              ) : companyInsights.size === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <Icon icon="mingcute:lightbulb-line" width={48} className="text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No interview insights yet</p>
                  <p className="text-slate-500 text-sm">
                    Interview preparation tips will appear here when you have job opportunities or scheduled interviews
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Array.from(companyInsights.entries()).map(([companyKey, companyData]) => {
                    const isExpanded = expandedCards.has(companyKey);
                    return (
                    <div
                      key={companyKey}
                      className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-slate-900 mb-1">{companyData.company}</h3>
                          <p className="text-slate-600 text-sm">{companyData.jobTitle}</p>
                          {!isExpanded && companyData.insights?.process_overview && (
                            <p className="text-sm text-slate-600 mt-3 line-clamp-2">
                              {companyData.insights.process_overview.substring(0, 150)}...
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {companyData.metadata?.fromCache && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              Cached
                            </span>
                          )}
                          <button
                            onClick={() => toggleCard(companyKey)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            <Icon 
                              icon={isExpanded ? "mingcute:up-line" : "mingcute:down-line"} 
                              width={20} 
                              className="text-slate-600"
                            />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <>
                      {companyData.loading ? (
                        <div className="text-center py-8">
                          <Icon icon="mingcute:loading-line" className="animate-spin text-blue-500 mx-auto mb-2" width={24} />
                          <p className="text-slate-600 text-sm">Loading insights...</p>
                        </div>
                      ) : companyData.error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-red-600 text-sm mb-3">{companyData.error}</p>
                          <button
                            onClick={() => fetchInsightsForCompany(companyData.jobId, companyData.company, companyKey)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
                          >
                            Try Again
                          </button>
                        </div>
                      ) : companyData.insights ? (
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                            {companyData.metadata?.generatedAt && (
                              <span>Updated {formatDateTime(companyData.metadata.generatedAt)}</span>
                            )}
                            <button
                              onClick={() => refreshInsightsForCompany(companyData.jobId, companyKey)}
                              className="flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium bg-transparent hover:bg-transparent border-none p-0 outline-none"
                            >
                              <Icon icon="mingcute:refresh-2-line" width={16} />
                              Refresh
                            </button>
                          </div>

                          {companyData.insights.process_overview && (
                            <div>
                              <h4 className="font-medium text-slate-900 mb-2">Process Overview</h4>
                              <p className="text-sm text-slate-600">{companyData.insights.process_overview}</p>
                            </div>
                          )}

                          {companyData.insights.timeline_expectations && (
                            <div>
                              <h4 className="font-medium text-slate-900 mb-2">Timeline Expectations</h4>
                              <p className="text-sm text-slate-600">{companyData.insights.timeline_expectations}</p>
                            </div>
                          )}

                          {companyData.insights.stages && companyData.insights.stages.length > 0 && (
                            <div>
                              <h4 className="font-medium text-slate-900 mb-2">Typical Stages</h4>
                              <div className="space-y-3">
                                {companyData.insights.stages.map((stage: any, index: number) => (
                                  <div
                                    key={`${stage.stage}-${index}`}
                                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                      <p className="text-sm font-medium text-slate-900">{stage.stage}</p>
                                      {stage.duration && (
                                        <span className="text-xs text-slate-500">{stage.duration}</span>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-600">{stage.what_to_expect}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {companyData.insights.interview_formats && companyData.insights.interview_formats.length > 0 && (
                            <div>
                              <h4 className="font-medium text-slate-900 mb-2">Interview Formats</h4>
                              <div className="flex flex-wrap gap-2">
                                {companyData.insights.interview_formats.map((format: string, index: number) => (
                                  <span
                                    key={`${format}-${index}`}
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${getInterviewFormatColor(format)}`}
                                  >
                                    {format}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {companyData.insights.common_questions && companyData.insights.common_questions.length > 0 && (
                            <div>
                              <h4 className="font-medium text-slate-900 mb-2">Common Questions</h4>
                              <div className="space-y-3">
                                {companyData.insights.common_questions.map((item: any, index: number) => (
                                  <div key={`${item.question}-${index}`} className="rounded-md border border-slate-200 p-4">
                                    <p className="text-sm font-medium text-slate-900 mb-1">"{item.question}"</p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-2">
                                      <span className={`rounded-full px-2 py-1 uppercase tracking-wide font-medium ${getQuestionCategoryColor(item.category || "")}`}>
                                        {item.category?.replace(/_/g, " ")}
                                      </span>
                                      <span>{item.why_asked}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {companyData.insights.preparation_recommendations && companyData.insights.preparation_recommendations.length > 0 && (
                            <div>
                              <h4 className="font-medium text-slate-900 mb-2">Preparation Recommendations</h4>
                              <ul className="list-disc list-inside space-y-2 text-sm text-slate-600">
                                {companyData.insights.preparation_recommendations.map((rec: string, index: number) => (
                                  <li key={`${rec}-${index}`}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {companyData.insights.success_tips && companyData.insights.success_tips.length > 0 && (
                            <div>
                              <h4 className="font-medium text-slate-900 mb-2">Success Tips</h4>
                              <ul className="list-disc list-inside space-y-2 text-sm text-slate-600">
                                {companyData.insights.success_tips.map((tip: string, index: number) => (
                                  <li key={`${tip}-${index}`}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {companyData.insights.checklist && companyData.insights.checklist.length > 0 && (
                            <div>
                              <h4 className="font-medium text-slate-900 mb-2">Interview Checklist</h4>
                              <ul className="list-disc list-inside space-y-2 text-sm text-slate-600">
                                {companyData.insights.checklist.map((item: string, index: number) => (
                                  <li key={`${item}-${index}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-slate-600 text-sm mb-4">No insights available yet</p>
                          <button
                            onClick={() => fetchInsightsForCompany(companyData.jobId, companyData.company, companyKey)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
                          >
                            Generate Insights
                          </button>
                        </div>
                      )}
                      </>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "reminders" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Upcoming Reminders</h2>
              {loadingReminders ? (
                <div className="text-center py-12">
                  <Icon icon="mingcute:loading-line" className="animate-spin text-blue-500 mx-auto mb-4" width={32} />
                  <p className="text-slate-600">Loading reminders...</p>
                </div>
              ) : upcomingReminders.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <Icon icon="mingcute:alarm-off-line" width={48} className="text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No upcoming reminders</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Reminders are automatically scheduled when you create interviews
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Icon
                              icon={reminder.reminder_type === "24_hours" ? "mingcute:time-line" : "mingcute:alarm-line"}
                              width={20}
                              className="text-blue-500"
                            />
                            <h3 className="font-semibold text-slate-900">
                              {reminder.reminder_type === "24_hours" ? "24 Hours Before" : "2 Hours Before"}
                            </h3>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {reminder.status}
                            </span>
                          </div>
                          <p className="text-slate-600 mb-2">
                            <strong>Interview:</strong> {reminder.interview?.title || "Interview"}
                          </p>
                          <p className="text-slate-600 mb-2">
                            <strong>Company:</strong> {reminder.interview?.company || "N/A"}
                          </p>
                          <p className="text-slate-600">
                            <strong>Reminder Time:</strong> {formatDateTime(reminder.scheduled_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "thank-you" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Thank You Notes</h2>
              <p className="text-slate-600 mb-6">
                Generate and send thank-you notes after your interviews. Click on any interview to create or review a draft.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {interviews
                  .filter((i) => i.status === "completed" || i.outcome)
                  .slice(0, 6)
                  .map((interview) => (
                    <div
                      key={interview.id}
                      className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openThankYouModal(interview)}
                    >
                      <h3 className="font-semibold text-slate-900 mb-2">{interview.title || "Interview"}</h3>
                      <p className="text-slate-600 text-sm mb-4">{interview.company || "N/A"}</p>
                      <button 
                        className="px-4 py-2 rounded-full transition-all text-sm font-semibold relative overflow-hidden"
                        style={{
                          background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box',
                          border: '2px solid transparent',
                          color: '#845BFF'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(to right, #845BFF, #F551A2) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(white, white) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box';
                          e.currentTarget.style.color = '#845BFF';
                        }}
                      >
                        Generate / View Note →
                      </button>
                    </div>
                  ))}
              </div>
              {interviews.filter((i) => i.status === "completed" || i.outcome).length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <Icon icon="mingcute:mail-line" width={48} className="text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No completed interviews yet</p>
                </div>
              )}

              {/* Follow-up Communication Templates Section */}
              <div className="mt-10">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Follow-up Communication Templates
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  Select a template to generate a personalized draft. All templates include conversation references and are tailored to your interview details. You can edit everything before sending.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Thank-you Note Template */}
                  <div 
                    className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => {
                      const completedInterview = interviews.find(i => i.status === "completed" || i.outcome);
                      if (completedInterview) {
                        openThankYouModal(completedInterview);
                      } else {
                        showMessage("Please complete an interview first to generate a thank-you note", "error");
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon icon="mingcute:mail-line" width={20} className="text-blue-500" />
                        <div>
                          <p className="text-xs font-semibold uppercase text-blue-600 tracking-wide">
                            Thank-You Note
                          </p>
                          <p className="text-sm font-medium text-slate-900">
                            Post-Interview Appreciation
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full text-[11px] bg-blue-50 text-blue-700">
                        Send within 24h
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      Personalized thank-you email with specific conversation references and interviewer details. Includes timing suggestions.
                    </p>
                    <div className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-slate-700">
                      <div>
                        <span className="font-semibold">Subject:</span>{" "}
                        Thank You - [Role] at [Company]
                      </div>
                      <div className="whitespace-pre-wrap text-[10px]">
                        Dear [Interviewer],{"\n\n"}
                        Thank you for taking the time to speak with me about the [Role] position at [Company]. I appreciated our discussion about [specific topic from interview notes]...
                      </div>
                    </div>
                  </div>

                  {/* Status Inquiry Template */}
                  <div 
                    className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => {
                      const completedInterview = interviews.find(i => i.status === "completed" || i.outcome);
                      if (completedInterview) {
                        // Find or create a status inquiry follow-up for this interview
                        const statusFollowUp = pendingFollowUps.find(fu => 
                          fu.interviewId === completedInterview.id && 
                          (fu.actionType === "status_inquiry" || fu.action_type === "status_inquiry")
                        );
                        if (statusFollowUp) {
                          // Generate draft for existing follow-up
                          setDraftLoadingId(statusFollowUp.id);
                          api.getFollowUpEmailDraft(completedInterview.id, statusFollowUp.id)
                            .then(response => {
                              if (response.ok && response.data?.draft) {
                                const draft = response.data.draft;
                                setStoredFollowUpDrafts(prev => {
                                  const updated = new Map(prev);
                                  const existing = updated.get(statusFollowUp.id) || [];
                                  updated.set(statusFollowUp.id, [
                                    { ...draft, createdAt: new Date().toISOString() },
                                    ...existing,
                                  ]);
                                  return updated;
                                });
                                setActiveFollowUpDraft({
                                  id: statusFollowUp.id,
                                  interviewId: completedInterview.id,
                                  subject: draft.subject,
                                  body: draft.body,
                                  generatedBy: draft.generatedBy,
                                });
                              }
                            })
                            .finally(() => setDraftLoadingId(null));
                        } else {
                          showMessage("Status inquiry follow-up will be created automatically after your interview. Check back later!", "info");
                        }
                      } else {
                        showMessage("Please complete an interview first", "error");
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon icon="mingcute:question-line" width={20} className="text-orange-500" />
                        <div>
                          <p className="text-xs font-semibold uppercase text-orange-600 tracking-wide">
                            Status Inquiry
                          </p>
                          <p className="text-sm font-medium text-slate-900">
                            Follow-up on Delayed Response
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full text-[11px] bg-orange-50 text-orange-700">
                        Send after 1-2 weeks
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      Professional inquiry template for when you haven't heard back. Maintains interest while checking on timeline.
                    </p>
                    <div className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-slate-700">
                      <div>
                        <span className="font-semibold">Subject:</span>{" "}
                        Follow-up: [Role] Application Status
                      </div>
                      <div className="whitespace-pre-wrap text-[10px]">
                        Dear [Interviewer],{"\n\n"}
                        I hope this email finds you well. I wanted to follow up regarding the [Role] position at [Company] for which we spoke on [date]...
                      </div>
                    </div>
                  </div>

                  {/* Feedback Request Template */}
                  <div 
                    className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => {
                      const rejectedInterview = interviews.find(i => i.outcome === "rejected");
                      if (rejectedInterview) {
                        // Find or create a feedback request follow-up
                        const feedbackFollowUp = pendingFollowUps.find(fu => 
                          fu.interviewId === rejectedInterview.id && 
                          (fu.actionType === "feedback_request" || fu.action_type === "feedback_request")
                        );
                        if (feedbackFollowUp) {
                          setDraftLoadingId(feedbackFollowUp.id);
                          api.getFollowUpEmailDraft(rejectedInterview.id, feedbackFollowUp.id)
                            .then(response => {
                              if (response.ok && response.data?.draft) {
                                const draft = response.data.draft;
                                setStoredFollowUpDrafts(prev => {
                                  const updated = new Map(prev);
                                  const existing = updated.get(feedbackFollowUp.id) || [];
                                  updated.set(feedbackFollowUp.id, [
                                    { ...draft, createdAt: new Date().toISOString() },
                                    ...existing,
                                  ]);
                                  return updated;
                                });
                                setActiveFollowUpDraft({
                                  id: feedbackFollowUp.id,
                                  interviewId: rejectedInterview.id,
                                  subject: draft.subject,
                                  body: draft.body,
                                  generatedBy: draft.generatedBy,
                                });
                              }
                            })
                            .finally(() => setDraftLoadingId(null));
                        } else {
                          showMessage("Feedback request follow-up will be created automatically for rejected interviews. Check back later!", "info");
                        }
                      } else {
                        showMessage("This template is available for interviews with rejected outcomes", "info");
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon icon="mingcute:feedback-line" width={20} className="text-purple-500" />
                        <div>
                          <p className="text-xs font-semibold uppercase text-purple-600 tracking-wide">
                            Feedback Request
                          </p>
                          <p className="text-sm font-medium text-slate-900">
                            Professional Growth Inquiry
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full text-[11px] bg-purple-50 text-purple-700">
                        After rejection
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      Polite request for interview feedback to improve future performance. Shows professionalism and growth mindset.
                    </p>
                    <div className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-slate-700">
                      <div>
                        <span className="font-semibold">Subject:</span>{" "}
                        Request for Interview Feedback
                      </div>
                      <div className="whitespace-pre-wrap text-[10px]">
                        Dear [Interviewer],{"\n\n"}
                        Thank you again for the opportunity to interview for the [Role] position at [Company]. While I understand the outcome was not favorable, I am committed to continuous improvement...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "follow-ups" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Follow-up Actions</h2>
              {loadingFollowUps ? (
                <div className="text-center py-12">
                  <Icon icon="mingcute:loading-line" className="animate-spin text-blue-500 mx-auto mb-4" width={32} />
                  <p className="text-slate-600">Loading follow-ups...</p>
                </div>
              ) : (
                <>
                  {/* Pending Follow-ups Section */}
                  {pendingFollowUps.length === 0 && completedFollowUps.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <Icon icon="mingcute:task-line" width={48} className="text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No follow-up actions</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Follow-up actions are automatically created after interviews are completed
                  </p>
                </div>
              ) : (
                    <>
                      {/* Pending Section */}
                      {pendingFollowUps.length > 0 && (
                        <div className="mb-8">
                          <h3 className="text-lg font-semibold text-slate-500 mb-4">Pending Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingFollowUps.map((followUp) => {
                    const hasDraft = storedFollowUpDrafts.has(followUp.id) && storedFollowUpDrafts.get(followUp.id)!.length > 0;
                    return (
                    <div
                      key={followUp.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col relative"
                    >
                      {hasDraft && (
                        <button
                          onClick={() => {
                            const drafts = storedFollowUpDrafts.get(followUp.id);
                            if (drafts && drafts.length > 0) {
                              const latestDraft = drafts[0];
                              const interviewId = followUp.interviewId || followUp.interview_id;
                              setActiveFollowUpDraft({
                                id: followUp.id,
                                interviewId,
                                subject: latestDraft.subject,
                                body: latestDraft.body,
                                generatedBy: latestDraft.generatedBy,
                              });
                            }
                          }}
                          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          aria-label="View draft"
                        >
                          <Icon icon="mingcute:eye-line" width={18} className="text-blue-500" />
                        </button>
                      )}
                      <div className="flex-1">
                                    {/* Interview Context - Position, Company, Date */}
                                    {(followUp.interview?.jobTitle || followUp.interview?.company || followUp.interview?.scheduledAt) && (
                                      <div className="mb-3 pb-3 border-b border-slate-200">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Icon icon="mingcute:briefcase-line" width={16} className="text-slate-500" />
                                          <span className="font-semibold text-slate-900 text-sm">
                                            {followUp.interview?.jobTitle || followUp.interview?.title || "Position"}
                                          </span>
                                        </div>
                                        {followUp.interview?.company && (
                                          <p className="text-xs text-slate-600 ml-6 mb-1">{followUp.interview.company}</p>
                                        )}
                                        {followUp.interview?.scheduledAt && (
                                          <p className="text-xs text-slate-500 ml-6">
                                            {formatDate(followUp.interview.scheduledAt)}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Action Type */}
                          <div className="flex items-center gap-2 mb-2">
                            <Icon icon="mingcute:task-line" width={18} className="text-blue-500" />
                            <h3 className="font-semibold text-slate-900 capitalize text-sm">
                                        {followUp.action_type?.replace(/_/g, " ") || followUp.actionType?.replace(/_/g, " ")}
                            </h3>
                          </div>
                                    {(followUp.due_date || followUp.dueDate) && (
                            <p className="text-xs text-slate-600 mb-2">
                                        <strong>Due:</strong> {formatDate(followUp.due_date || followUp.dueDate)}
                            </p>
                          )}
                          {followUp.notes && (
                            <p className="text-xs text-slate-600 mb-3 line-clamp-2">{followUp.notes}</p>
                          )}
                      </div>
                      <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-slate-100">
                                    {hasDraft ? (
                                      <button
                                        onClick={async () => {
                                          try {
                                            setDraftLoadingId(followUp.id);
                                            const interviewId = followUp.interviewId || followUp.interview_id;
                                            const response = await api.getFollowUpEmailDraft(
                                              interviewId,
                                              followUp.id
                                            );
                                            if (response.ok && response.data?.draft) {
                                              const draft = response.data.draft;
                                              // Store the draft
                                              setStoredFollowUpDrafts((prev) => {
                                                const updated = new Map(prev);
                                                const existing = updated.get(followUp.id) || [];
                                                updated.set(followUp.id, [
                                                  {
                                                    subject: draft.subject,
                                                    body: draft.body,
                                                    generatedBy: draft.generatedBy,
                                                    createdAt: new Date().toISOString(),
                                                  },
                                                  ...existing,
                                                ]);
                                                return updated;
                                              });
                                              // Show it in modal
                                              setActiveFollowUpDraft({
                                                id: followUp.id,
                                                interviewId,
                                                subject: draft.subject,
                                                body: draft.body,
                                                generatedBy: draft.generatedBy,
                                              });
                                            }
                                          } catch (err: any) {
                                            showMessage(
                                              err.message || "Failed to regenerate email draft",
                                              "error"
                                            );
                                          } finally {
                                            setDraftLoadingId(null);
                                          }
                                        }}
                                        className="w-full px-4 py-2 rounded-full transition-all text-xs font-semibold relative overflow-hidden"
                                        style={{
                                          background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box',
                                          border: '2px solid transparent',
                                          color: '#845BFF'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = 'linear-gradient(to right, #845BFF, #F551A2) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box';
                                          e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'linear-gradient(white, white) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box';
                                          e.currentTarget.style.color = '#845BFF';
                                        }}
                                      >
                                        {draftLoadingId === followUp.id
                                          ? "Generating..."
                                          : "Regenerate Draft"}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={async () => {
                                          try {
                                            setDraftLoadingId(followUp.id);
                                            const interviewId = followUp.interviewId || followUp.interview_id;
                                            const response = await api.getFollowUpEmailDraft(
                                              interviewId,
                                              followUp.id
                                            );
                                            if (response.ok && response.data?.draft) {
                                              const draft = response.data.draft;
                                              // Store the draft
                                              setStoredFollowUpDrafts((prev) => {
                                                const updated = new Map(prev);
                                                const existing = updated.get(followUp.id) || [];
                                                updated.set(followUp.id, [
                                                  {
                                                    subject: draft.subject,
                                                    body: draft.body,
                                                    generatedBy: draft.generatedBy,
                                                    createdAt: new Date().toISOString(),
                                                  },
                                                  ...existing,
                                                ]);
                                                return updated;
                                              });
                                              // Show it in modal
                                              setActiveFollowUpDraft({
                                                id: followUp.id,
                                                interviewId,
                                                subject: draft.subject,
                                                body: draft.body,
                                                generatedBy: draft.generatedBy,
                                              });
                                            }
                                          } catch (err: any) {
                                            showMessage(
                                              err.message || "Failed to generate email draft",
                                              "error"
                                            );
                                          } finally {
                                            setDraftLoadingId(null);
                                          }
                                        }}
                                        className="w-full px-4 py-2 rounded-full transition-all text-xs font-semibold relative overflow-hidden"
                                        style={{
                                          background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box',
                                          border: '2px solid transparent',
                                          color: '#845BFF'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = 'linear-gradient(to right, #845BFF, #F551A2) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box';
                                          e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'linear-gradient(white, white) padding-box, linear-gradient(to right, #845BFF, #F551A2) border-box';
                                          e.currentTarget.style.color = '#845BFF';
                                        }}
                                      >
                                        {draftLoadingId === followUp.id
                                          ? "Generating..."
                                          : "Generate Draft"}
                                      </button>
                                    )}
                                    <button
                                      onClick={async () => {
                                        try {
                                          const interviewId = followUp.interviewId || followUp.interview_id;
                              await api.completeFollowUpAction(interviewId, followUp.id);
                              showMessage("Follow-up action completed!", "success");
                              fetchPendingFollowUps();
                            } catch (err: any) {
                              showMessage(err.message || "Failed to complete action", "error");
                            }
                          }}
                          className="w-full px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 text-xs font-medium"
                        >
                          Mark Complete
                        </button>
                                  </div>
                    </div>
                  );
                  })}
                          </div>
                </div>
                      )}

                      {/* Completed Follow-ups Section */}
                      {completedFollowUps.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-slate-200">
                          <h3 className="text-lg font-semibold text-slate-500 mb-4">Completed Actions</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {completedFollowUps.map((followUp) => (
                              <div
                                key={followUp.id}
                                className="bg-slate-50 border border-slate-200 rounded-xl p-5 opacity-75"
                              >
                                <div>
                                    {/* Interview Context - Position, Company, Date */}
                                    {(followUp.interview?.jobTitle || followUp.interview?.company || followUp.interview?.scheduledAt) && (
                                      <div className="mb-3 pb-3 border-b border-slate-200">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Icon icon="mingcute:briefcase-line" width={16} className="text-slate-400" />
                                          <span className="font-semibold text-slate-500 line-through text-sm">
                                            {followUp.interview?.jobTitle || followUp.interview?.title || "Position"}
                                          </span>
                                        </div>
                                        {followUp.interview?.company && (
                                          <p className="text-xs text-slate-500 ml-6 mb-1">{followUp.interview.company}</p>
                                        )}
                                        {followUp.interview?.scheduledAt && (
                                          <p className="text-xs text-slate-400 ml-6">
                                            {formatDate(followUp.interview.scheduledAt)}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Action Type */}
                                    <div className="flex items-center gap-2 mb-2">
                                      <Icon icon="mingcute:check-circle-line" width={18} className="text-green-500" />
                                      <h3 className="font-semibold text-slate-500 capitalize line-through text-sm">
                                        {followUp.action_type?.replace(/_/g, " ") || followUp.actionType?.replace(/_/g, " ")}
                                      </h3>
                                    </div>
                                    {followUp.completedAt && (
                                      <p className="text-slate-500 text-xs mb-2">
                                        <strong>Completed:</strong> {formatDate(followUp.completedAt)}
                                      </p>
                                    )}
                                    {followUp.notes && (
                                      <p className="text-slate-500 text-xs line-clamp-2">{followUp.notes}</p>
                                    )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

        {/* Follow-up email draft modal */}
        {activeFollowUpDraft && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 px-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 font-poppins">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Follow-up Email Draft
                  </h3>
                  {activeFollowUpDraft.generatedBy && (
                    <p className="text-xs text-slate-500 mt-1">
                      Generated by {activeFollowUpDraft.generatedBy === "openai" ? "AI" : "template"}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setActiveFollowUpDraft(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Icon icon="mingcute:close-line" width={20} />
                </button>
              </div>

              <div className="space-y-4">
                {(() => {
                  const drafts = storedFollowUpDrafts.get(activeFollowUpDraft.id) || [];
                  const showAll = showAllFollowUpDrafts.get(activeFollowUpDraft.id) || false;
                  return (
                    <>
                      {drafts.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-slate-500">
                              Latest Draft
                            </label>
                            {drafts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAllFollowUpDrafts((prev) => {
                                    const updated = new Map(prev);
                                    updated.set(activeFollowUpDraft.id, !showAll);
                                    return updated;
                                  });
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 underline"
                              >
                                {showAll
                                  ? "Hide previous drafts"
                                  : `View previous drafts (${drafts.length - 1})`}
                              </button>
                            )}
                          </div>
                          {showAll && drafts.length > 1 && (
                            <div className="mb-4 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                              {drafts.slice(1).map((draft, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setActiveFollowUpDraft({
                                      ...activeFollowUpDraft,
                                      subject: draft.subject,
                                      body: draft.body,
                                      generatedBy: draft.generatedBy,
                                    });
                                    setShowAllFollowUpDrafts((prev) => {
                                      const updated = new Map(prev);
                                      updated.set(activeFollowUpDraft.id, false);
                                      return updated;
                                    });
                                  }}
                                  className="p-2 mb-2 bg-white rounded border border-slate-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                >
                                  <div className="text-xs font-medium text-slate-700 mb-1 truncate">
                                    {draft.subject}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {new Date(draft.createdAt).toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={activeFollowUpDraft.subject}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Body
                        </label>
                        <textarea
                          readOnly
                          rows={8}
                          value={activeFollowUpDraft.body}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 font-mono whitespace-pre-wrap"
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        You can copy this draft into your email client and edit as needed before sending.
                      </p>
                    </>
                  );
                })()}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setActiveFollowUpDraft(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
              )}
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="bg-white border border-slate-200 rounded-xl p-12 max-w-md w-full shadow-sm">
                {calendarLoading ? (
                  <div className="text-center py-12">
                    <Icon icon="mingcute:loading-line" className="animate-spin text-blue-500 mx-auto mb-4" width={40} />
                    <p className="text-slate-600">Checking calendar status...</p>
                  </div>
                ) : calendarConnected ? (
                  <div className="text-center">
                    <div className="mb-8">
                      <Icon icon="mingcute:check-circle-line" width={64} className="text-green-500 mx-auto mb-4" />
                      <h3 className="text-2xl font-semibold text-slate-900 mb-2">Google Calendar Connected</h3>
                      <p className="text-slate-600">
                        Your interviews will be automatically synced to your calendar
                      </p>
                    </div>
                    <div className="space-y-3">
                      <button
                        onClick={async () => {
                          try {
                            const response = await api.syncAllInterviewsToCalendar();
                            if (response.ok) {
                              showMessage("All interviews synced to calendar!", "success");
                            }
                          } catch (err: any) {
                            showMessage(err.message || "Failed to sync interviews", "error");
                          }
                        }}
                        className="w-full px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 font-medium"
                      >
                        Sync All Interviews
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await api.disconnectGoogleCalendar();
                            setCalendarConnected(false);
                            showMessage("Calendar disconnected", "success");
                          } catch (err: any) {
                            showMessage(err.message || "Failed to disconnect", "error");
                          }
                        }}
                        className="w-full px-6 py-3 bg-slate-200 text-slate-800 rounded-full hover:bg-slate-300 font-medium"
                      >
                        Disconnect Calendar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mb-8">
                      <Icon icon="mingcute:calendar-line" width={64} className="text-slate-400 mx-auto mb-4" />
                      <h3 className="text-2xl font-semibold text-slate-900 mb-2">Connect Google Calendar</h3>
                      <p className="text-slate-600">
                        Sync your interviews with Google Calendar to get automatic reminders and updates
                      </p>
                    </div>
                    <button
                      onClick={handleConnectCalendar}
                      className="w-full px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 font-medium"
                    >
                      Connect Google Calendar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Interview Analytics</h2>
              {loadingAnalytics ? (
                <div className="text-center py-12">
                  <Icon icon="mingcute:loading-line" className="animate-spin text-blue-500 mx-auto mb-4" width={32} />
                  <p className="text-slate-600">Loading analytics...</p>
                </div>
              ) : analytics ? (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <p className="text-sm text-slate-600 mb-1">Completed Interviews</p>
                      <p className="text-3xl font-bold text-slate-900">{analytics.conversionRate.completedInterviews}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <p className="text-sm text-slate-600 mb-1">Success Rate</p>
                      <p className="text-3xl font-bold text-green-600">
                        {analytics.conversionRate.userRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <p className="text-sm text-slate-600 mb-1">Industry Average</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {analytics.conversionRate.industryAverage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <p className="text-sm text-slate-600 mb-1">Offers Received</p>
                      <p className="text-3xl font-bold text-emerald-600">{analytics.conversionRate.offers}</p>
                    </div>
                  </div>

                  {/* Performance by Format */}
                  {analytics.performanceByFormat && analytics.performanceByFormat.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance by Format</h3>
                      <div className="space-y-3">
                        {analytics.performanceByFormat.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-slate-700">{item.formatLabel}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-slate-600">
                                {item.successful}/{item.total} successful
                              </span>
                              <span className="text-sm font-medium text-slate-900">
                                {item.total > 0 ? ((item.successful / item.total) * 100).toFixed(0) : 0}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Performance by Company Type */}
                  {analytics.performanceByCompanyType && analytics.performanceByCompanyType.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance by Company Type</h3>
                      <div className="space-y-3">
                        {analytics.performanceByCompanyType.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-slate-700">{item.companyType}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-slate-600">
                                {item.successful}/{item.total} successful
                              </span>
                              <span className="text-sm font-medium text-slate-900">
                                {item.total > 0 ? ((item.successful / item.total) * 100).toFixed(0) : 0}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skill Area Performance */}
                  {analytics.skillAreaPerformance && analytics.skillAreaPerformance.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Skill Area Performance</h3>
                      <div className="space-y-4">
                        {analytics.skillAreaPerformance.map((item, idx) => (
                          <div key={idx}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-slate-700">{item.skillAreaLabel}</span>
                              <span className="text-sm font-medium text-slate-900">
                                {item.averageScore.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${item.averageScore}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvement Trend */}
                  {analytics.improvementTrend && analytics.improvementTrend.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Improvement Trend</h3>
                      <div className="space-y-2">
                        {analytics.improvementTrend
                          .filter((item) => item.period && item.averageScore !== null)
                          .map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-slate-700">{item.period}</span>
                              <span className="text-sm font-medium text-slate-900">
                                {item.averageScore?.toFixed(1) || "N/A"}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Link to full analytics page */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                    <p className="text-slate-700 mb-4">View detailed charts and insights</p>
                    <button
                      onClick={() => navigate(ROUTES.INTERVIEW_ANALYTICS)}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                    >
                      View Full Analytics Dashboard
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                  <Icon icon="mingcute:chart-line" width={48} className="text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">No analytics data available</p>
                  <p className="text-sm text-slate-500">
                    Complete some interviews to see your analytics
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

