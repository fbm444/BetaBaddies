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
} from "../types";
import {
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_STATUS_COLORS,
} from "../types/interview.types";

type TabType = "schedule" | "preparation" | "reminders" | "thank-you" | "follow-ups" | "calendar";

export function Interviews() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobOpportunityId = searchParams.get("jobOpportunityId");

  const [activeTab, setActiveTab] = useState<TabType>("schedule");
  const [interviews, setInterviews] = useState<InterviewData[]>([]);
  const [jobOpportunities, setJobOpportunities] = useState<JobOpportunityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reminders state
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  // Follow-ups state
  const [pendingFollowUps, setPendingFollowUps] = useState<any[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);

  // Calendar state
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);

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
      const response = await api.getPendingFollowUps();
      if (response.ok && response.data) {
        setPendingFollowUps(response.data.followUps || []);
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

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "schedule", label: "Schedule", icon: "mingcute:calendar-line" },
    { id: "preparation", label: "Preparation", icon: "mingcute:lightbulb-line" },
    { id: "reminders", label: "Reminders", icon: "mingcute:alarm-line" },
    { id: "thank-you", label: "Thank You Notes", icon: "mingcute:mail-line" },
    { id: "follow-ups", label: "Follow-ups", icon: "mingcute:task-line" },
    { id: "calendar", label: "Calendar", icon: "mingcute:calendar-check-line" },
  ];

  return (
    <div className="min-h-screen bg-white font-poppins">
      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
            Interviews
          </h1>
          {activeTab === "schedule" && (
            <button
              onClick={() => navigate(`${ROUTES.INTERVIEW_SCHEDULING}${jobOpportunityId ? `?jobOpportunityId=${jobOpportunityId}` : ""}`)}
              className="px-6 py-3 rounded-full bg-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow hover:bg-blue-600"
            >
              <Icon icon="mingcute:add-line" width={20} />
              Schedule New Interview
            </button>
          )}
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
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <Icon icon={tab.icon} width={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === "schedule" && (
            <div>
              <p className="text-slate-600 mb-6">
                View and manage your interviews. Schedule new interviews, view upcoming ones, and access all interview details.
              </p>
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
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          View Details →
                        </button>
                      </div>
                    ))}
                  </div>
                  {interviews.length > 6 && (
                    <div className="text-center">
                      <button
                        onClick={() => navigate(ROUTES.INTERVIEW_SCHEDULING)}
                        className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
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
                  {Array.from(companyInsights.entries()).map(([companyKey, companyData]) => (
                    <div
                      key={companyKey}
                      className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900 mb-1">{companyData.company}</h3>
                          <p className="text-slate-600 text-sm">{companyData.jobTitle}</p>
                        </div>
                        {companyData.metadata?.fromCache && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            Cached
                          </span>
                        )}
                      </div>

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
                              className="px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-100 text-slate-600 font-medium"
                            >
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
                                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
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
                                      <span className="rounded-full bg-slate-100 px-2 py-1 uppercase tracking-wide">
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
                    </div>
                  ))}
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
                Generate and send thank-you notes after your interviews. Click on any interview to manage thank-you notes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {interviews
                  .filter((i) => i.status === "completed" || i.outcome)
                  .slice(0, 6)
                  .map((interview) => (
                    <div
                      key={interview.id}
                      className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`${ROUTES.INTERVIEW_SCHEDULING}?interviewId=${interview.id}&tab=thank-you`)}
                    >
                      <h3 className="font-semibold text-slate-900 mb-2">{interview.title || "Interview"}</h3>
                      <p className="text-slate-600 text-sm mb-4">{interview.company || "N/A"}</p>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Manage Notes →
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
              ) : pendingFollowUps.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <Icon icon="mingcute:task-line" width={48} className="text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No pending follow-up actions</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Follow-up actions are automatically created after interviews are completed
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingFollowUps.map((followUp) => (
                    <div
                      key={followUp.id}
                      className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Icon icon="mingcute:task-line" width={20} className="text-blue-500" />
                            <h3 className="font-semibold text-slate-900 capitalize">
                              {followUp.action_type?.replace(/_/g, " ")}
                            </h3>
                          </div>
                          {followUp.due_date && (
                            <p className="text-slate-600 mb-2">
                              <strong>Due:</strong> {formatDate(followUp.due_date)}
                            </p>
                          )}
                          {followUp.notes && (
                            <p className="text-slate-600">{followUp.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const interviewId = followUp.interview_id;
                              await api.completeFollowUpAction(interviewId, followUp.id);
                              showMessage("Follow-up action completed!", "success");
                              fetchPendingFollowUps();
                            } catch (err: any) {
                              showMessage(err.message || "Failed to complete action", "error");
                            }
                          }}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
                        >
                          Mark Complete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "calendar" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Calendar Integration</h2>
              <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-2xl">
                {calendarLoading ? (
                  <div className="text-center py-8">
                    <Icon icon="mingcute:loading-line" className="animate-spin text-blue-500 mx-auto mb-4" width={32} />
                    <p className="text-slate-600">Checking calendar status...</p>
                  </div>
                ) : calendarConnected ? (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <Icon icon="mingcute:check-circle-line" width={32} className="text-green-500" />
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Google Calendar Connected</h3>
                        <p className="text-slate-600">Your interviews will be automatically synced to your calendar</p>
                      </div>
                    </div>
                    <div className="space-y-4">
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
                        className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
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
                        className="w-full px-6 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-medium"
                      >
                        Disconnect Calendar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <Icon icon="mingcute:calendar-line" width={32} className="text-slate-400" />
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Connect Google Calendar</h3>
                        <p className="text-slate-600">
                          Sync your interviews with Google Calendar to get automatic reminders and updates
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleConnectCalendar}
                      className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                    >
                      Connect Google Calendar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

