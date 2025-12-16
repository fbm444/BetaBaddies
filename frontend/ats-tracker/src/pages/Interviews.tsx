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
import { InterviewPredictionTab } from "../components/interviews/InterviewPredictionTab";
import {
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_STATUS_COLORS,
} from "../types/interview.types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

type TabType = "schedule" | "preparation" | "reminders" | "thank-you" | "follow-ups" | "analytics" | "predictions";

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
  const [showCreateFollowUpModal, setShowCreateFollowUpModal] = useState(false);
  const [newFollowUpData, setNewFollowUpData] = useState({
    interviewId: "",
    actionType: "other",
    dueDate: "",
    notes: "",
  });
  const [activeFollowUpDraft, setActiveFollowUpDraft] = useState<{
    id: string;
    interviewId: string;
    subject: string;
    body: string;
    generatedBy?: string;
  } | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
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
  // Track which drafts are expanded inline in the cards
  const [expandedDraftCards, setExpandedDraftCards] = useState<Map<string, boolean>>(new Map());
  // Track which drafts are being edited (key: followUpId-index)
  const [editingDrafts, setEditingDrafts] = useState<Map<string, boolean>>(new Map());
  // Track edited draft content (key: followUpId-index)
  const [editedDraftContent, setEditedDraftContent] = useState<Map<string, { subject: string; body: string }>>(new Map());

  // Thank-you notes modal state
  const [activeThankYouInterview, setActiveThankYouInterview] = useState<InterviewData | null>(null);
  const [thankYouNotes, setThankYouNotes] = useState<any[]>([]);
  const [loadingThankYou, setLoadingThankYou] = useState(false);
  const [showAllThankYouNotes, setShowAllThankYouNotes] = useState(false);
  const [isEditingThankYouNote, setIsEditingThankYouNote] = useState(false);
  const [editedThankYouContent, setEditedThankYouContent] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [showCreateThankYouModal, setShowCreateThankYouModal] = useState(false);
  const [selectedInterviewForThankYou, setSelectedInterviewForThankYou] = useState<string>("");
  const [thankYouNoteStyle, setThankYouNoteStyle] = useState<"standard" | "enthusiastic" | "concise">("standard");
  // Store generated thank you notes by interview ID (latest first)
  const [storedThankYouNotes, setStoredThankYouNotes] = useState<
    Map<
      string,
      Array<{
        subject: string;
        body: string;
        style?: string;
        generatedBy?: string;
        createdAt: string;
      }>
    >
  >(new Map());
  // Store recently generated drafts (separate from cached notes)
  const [recentThankYouDrafts, setRecentThankYouDrafts] = useState<
    Array<{
      id: string;
      interviewId: string;
      subject: string;
      body: string;
      style?: string;
      generatedBy?: string;
      createdAt: string;
      interview: any;
    }>
  >([]);
  const [expandedThankYouCards, setExpandedThankYouCards] = useState<Map<string, boolean>>(new Map());
  const [editingThankYouCards, setEditingThankYouCards] = useState<Map<string, boolean>>(new Map());

  // Calendar state
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

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

  // Sync activeTab with URL parameter
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Fetch data when tab changes
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
      console.log("🔔 Fetching reminders. Total interviews:", interviews.length);
      
      // Fetch reminders for all upcoming interviews
      // Also include interviews that might have reminders even if past (to show sent reminders)
      const upcomingInterviews = interviews.filter((interview) => {
        if (!interview.scheduledAt) {
          console.log(`⏭️ Skipping interview ${interview.id}: no scheduledAt`);
          return false;
        }
        const interviewDate = new Date(interview.scheduledAt);
        const now = new Date();
        const isUpcoming = interviewDate > now;
        const isScheduled = interview.status === "scheduled";
        
        console.log(`📅 Interview ${interview.id}: scheduledAt=${interview.scheduledAt}, status=${interview.status}, isUpcoming=${isUpcoming}, isScheduled=${isScheduled}`);
        
        // Include scheduled interviews that are upcoming OR have reminders
        return isScheduled && isUpcoming;
      });

      console.log(`✅ Found ${upcomingInterviews.length} upcoming scheduled interviews`);

      const allReminders: any[] = [];
      for (const interview of upcomingInterviews) {
        try {
          console.log(`🔍 Fetching reminders for interview ${interview.id} (${interview.title || interview.company})`);
          const response = await api.getRemindersForInterview(interview.id);
          console.log(`📬 Response for interview ${interview.id}:`, response);
          
          if (response.ok && response.data?.reminders) {
            const allRemindersForInterview = response.data.reminders;
            console.log(`📋 Found ${allRemindersForInterview.length} total reminders for interview ${interview.id}`);
            
            // Filter for pending reminders that are in the future
            const now = new Date();
            const pendingReminders = allRemindersForInterview
              .filter((r: any) => {
                const isPending = r.status === "pending";
                const reminderTime = new Date(r.scheduledAt);
                const isFuture = reminderTime > now;
                console.log(`  Reminder ${r.id}: type=${r.reminderType}, status=${r.status}, scheduledAt=${r.scheduledAt}, isPending=${isPending}, isFuture=${isFuture}`);
                return isPending && isFuture;
              })
              .map((r: any) => ({ ...r, interview }));
            
            console.log(`✅ Adding ${pendingReminders.length} pending future reminders for interview ${interview.id}`);
            allReminders.push(...pendingReminders);
          } else {
            console.warn(`⚠️ No reminders found for interview ${interview.id} or response not ok:`, response);
          }
        } catch (err) {
          console.error(`❌ Failed to fetch reminders for interview ${interview.id}:`, err);
        }
      }

      console.log(`🎯 Total reminders collected: ${allReminders.length}`);

      // Sort by scheduledAt
      allReminders.sort((a, b) => 
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
      setUpcomingReminders(allReminders);
    } catch (err: any) {
      console.error("❌ Failed to fetch reminders:", err);
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

  const handleCreateFollowUp = async () => {
    if (!newFollowUpData.interviewId) {
      showMessage("Please select an interview", "error");
      return;
    }
    if (!newFollowUpData.actionType) {
      showMessage("Please select an action type", "error");
      return;
    }

    try {
      const response = await api.createFollowUpAction(
        newFollowUpData.interviewId,
        {
          actionType: newFollowUpData.actionType,
          dueDate: newFollowUpData.dueDate || undefined,
          notes: newFollowUpData.notes || undefined,
        }
      );

      if (response.ok) {
        showMessage("Follow-up action created successfully!", "success");
        setShowCreateFollowUpModal(false);
        setNewFollowUpData({
          interviewId: "",
          actionType: "other",
          dueDate: "",
          notes: "",
        });
        fetchPendingFollowUps();
      } else {
        showMessage(
          response.error?.message || "Failed to create follow-up action",
          "error"
        );
      }
    } catch (err: any) {
      console.error("Failed to create follow-up:", err);
      showMessage(
        err.message || "Failed to create follow-up action",
        "error"
      );
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

  const addToRecentDrafts = (interviewId: string, note: any, style: string) => {
    const interview = interviews.find(i => i.id === interviewId);
    const draftId = `${interviewId}-${Date.now()}-${Math.random()}`;
    
    setRecentThankYouDrafts(prev => [
      {
        id: draftId,
        interviewId,
        subject: note.subject || "",
        body: note.body || "",
        style,
        generatedBy: note.generatedBy || "ai",
        createdAt: new Date().toISOString(),
        interview: interview || null,
      },
      ...prev,
    ]);
  };

  const handleCreateThankYouNote = async () => {
    if (!selectedInterviewForThankYou) {
      showMessage("Please select an interview", "error");
      return;
    }

    try {
      setLoadingThankYou(true);
      const response = await api.generateThankYouNote(
        selectedInterviewForThankYou,
        thankYouNoteStyle
      );

      if (response.ok && response.data?.note) {
        const note = response.data.note;
        // Add to recent drafts (newly generated)
        addToRecentDrafts(selectedInterviewForThankYou, note, thankYouNoteStyle);
        
        showMessage("Thank you note generated successfully! View it in 'Recent Drafts' below.", "success");
        setShowCreateThankYouModal(false);
        setSelectedInterviewForThankYou("");
        setThankYouNoteStyle("standard");
      } else {
        showMessage(
          response.error?.message || "Failed to generate thank you note",
          "error"
        );
      }
    } catch (err: any) {
      console.error("Failed to create thank you note:", err);
      showMessage(
        err.message || "Failed to generate thank you note",
        "error"
      );
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
    setShowCalendarModal(true);
  };

  const confirmConnectCalendar = async () => {
    try {
      setShowCalendarModal(false);
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
    { id: "analytics", label: "Analytics", icon: "mingcute:trending-up-line" },
    { id: "predictions", label: "Predictions", icon: "mingcute:target-line" },
  ];

  return (
    <div className="min-h-screen bg-white font-poppins">
      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Interviews
          </h1>
          <div className="flex items-center justify-between gap-4">
            <p className="text-slate-600">
              View and manage your interviews. Schedule new interviews, view upcoming ones, and access all interview details.
            </p>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => navigate(ROUTES.INTERVIEW_SCHEDULING)}
                className="px-6 py-3 rounded-full bg-blue-700 text-white text-sm font-medium inline-flex items-center gap-2 shadow-md hover:bg-blue-800 transition-all"
              >
                <Icon icon="mingcute:calendar-line" width={20} />
                Interview Calendar
              </button>
              {!calendarConnected ? (
                <button
                  onClick={handleConnectCalendar}
                  className="px-6 py-3 rounded-full border-2 border-blue-500 text-blue-700 text-sm font-medium inline-flex items-center gap-2 hover:bg-blue-50 transition-all"
                >
                  Connect Google Calendar
                </button>
              ) : (
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
                  className="px-6 py-3 rounded-full border-2 border-green-500 text-green-700 text-sm font-medium inline-flex items-center gap-2 hover:bg-green-50 transition-all"
                >
                  <Icon icon="mingcute:check-circle-line" width={20} />
                  Connected
                </button>
              )}
            </div>
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
            <div className="bg-white rounded-2xl border border-slate-300 max-w-2xl w-full p-6 font-poppins">
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
                    className="animate-spin text-blue-700 mx-auto mb-2"
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
                        <div className="flex items-center gap-2">
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
                          {!isEditingThankYouNote && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingThankYouNote(true);
                                setEditedThankYouContent({
                                  subject: thankYouNotes[0].subject || "",
                                  body: thankYouNotes[0].body || "",
                                });
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              <Icon icon="mingcute:edit-line" width={14} />
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        readOnly={!isEditingThankYouNote}
                        value={isEditingThankYouNote && editedThankYouContent ? editedThankYouContent.subject : (thankYouNotes[0].subject || "")}
                        onChange={(e) => {
                          if (isEditingThankYouNote && editedThankYouContent) {
                            setEditedThankYouContent({
                              ...editedThankYouContent,
                              subject: e.target.value,
                            });
                          }
                        }}
                        className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2 font-mono whitespace-pre-wrap ${
                          isEditingThankYouNote
                            ? "bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            : "bg-slate-50"
                        }`}
                      />
                      <textarea
                        readOnly={!isEditingThankYouNote}
                        rows={8}
                        value={isEditingThankYouNote && editedThankYouContent ? editedThankYouContent.body : (thankYouNotes[0].body || "")}
                        onChange={(e) => {
                          if (isEditingThankYouNote && editedThankYouContent) {
                            setEditedThankYouContent({
                              ...editedThankYouContent,
                              body: e.target.value,
                            });
                          }
                        }}
                        className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono whitespace-pre-wrap ${
                          isEditingThankYouNote
                            ? "bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            : "bg-slate-50"
                        }`}
                      />
                      {!isEditingThankYouNote && (
                        <p className="text-xs text-slate-500 mt-2">
                          Click "Edit" to modify this draft, or copy it into your email client.
                        </p>
                      )}

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
                                  const note = response.data.note;
                                  // Add to recent drafts
                                  addToRecentDrafts(activeThankYouInterview.id, note, "standard");
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
                            className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xs sm:text-sm font-medium"
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
                                  const note = response.data.note;
                                  // Add to recent drafts
                                  addToRecentDrafts(activeThankYouInterview.id, note, "enthusiastic");
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
                                  const note = response.data.note;
                                  // Add to recent drafts
                                  addToRecentDrafts(activeThankYouInterview.id, note, "concise");
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
                                  const note = response.data.note;
                                  // Add to recent drafts
                                  addToRecentDrafts(activeThankYouInterview.id, note, "standard");
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
                                  const note = response.data.note;
                                  // Add to recent drafts
                                  addToRecentDrafts(activeThankYouInterview.id, note, "enthusiastic");
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
                                  const note = response.data.note;
                                  // Add to recent drafts
                                  addToRecentDrafts(activeThankYouInterview.id, note, "concise");
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

                    {isEditingThankYouNote ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setIsEditingThankYouNote(false);
                            setEditedThankYouContent(null);
                          }}
                          className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (editedThankYouContent && thankYouNotes.length > 0) {
                              // Update the first note in the array
                              const updatedNotes = [...thankYouNotes];
                              updatedNotes[0] = {
                                ...updatedNotes[0],
                                subject: editedThankYouContent.subject,
                                body: editedThankYouContent.body,
                                updatedAt: new Date().toISOString(),
                              };
                              setThankYouNotes(updatedNotes);
                              setIsEditingThankYouNote(false);
                              setEditedThankYouContent(null);
                              showMessage("Thank you note updated successfully!", "success");
                            }
                          }}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-800 transition"
                        >
                          Save Changes
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveThankYouInterview(null);
                          setThankYouNotes([]);
                          setIsEditingThankYouNote(false);
                          setEditedThankYouContent(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-8">
          <div 
            role="tablist" 
            aria-label="Interview tabs"
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
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Update URL without navigating away
                  const newSearchParams = new URLSearchParams(searchParams);
                  newSearchParams.set("tab", tab.id);
                  navigate(`?${newSearchParams.toString()}`, { replace: true });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveTab(tab.id);
                    const newSearchParams = new URLSearchParams(searchParams);
                    newSearchParams.set("tab", tab.id);
                    navigate(`?${newSearchParams.toString()}`, { replace: true });
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
        <div className="mt-8 bg-slate-50 -mx-6 lg:-mx-10 px-6 lg:px-10 py-10 rounded-t-2xl">
          {activeTab === "schedule" && (
            <div role="tabpanel" id="tabpanel-schedule" aria-labelledby="tab-schedule">
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
                  <Icon icon="mingcute:loading-line" className="animate-spin text-blue-700 mx-auto mb-4" width={32} />
                  <p className="text-slate-600">Loading interviews...</p>
                </div>
              ) : interviews.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <Icon icon="mingcute:calendar-line" width={48} className="text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No interviews scheduled yet</p>
                  <button
                    onClick={() => navigate(`${ROUTES.INTERVIEW_SCHEDULING}${jobOpportunityId ? `?jobOpportunityId=${jobOpportunityId}` : ""}`)}
                    className="mt-4 px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium inline-flex items-center gap-2"
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
                        className="bg-white border border-slate-300 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
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
                        <button className="px-4 py-2 bg-transparent border-2 border-blue-500 text-blue-700 rounded-full hover:bg-blue-50 text-sm font-medium transition-colors">
                          View Details →
                        </button>
                      </div>
                    ))}
                  </div>
                  {interviews.length > 6 && (
                    <div className="text-center">
                      <button
                        onClick={() => navigate(ROUTES.INTERVIEW_SCHEDULING)}
                        className="px-6 py-3 bg-blue-700 text-white rounded-full hover:bg-blue-800 font-medium transition-colors"
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
            <div role="tabpanel" id="tabpanel-preparation" aria-labelledby="tab-preparation">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Interview Preparation</h2>
              <p className="text-slate-600 mb-6">
                Get personalized interview tips, insights, and preparation guides organized by company. This information is cached and saved for quick access.
              </p>
              {loadingPreparation ? (
                <div className="text-center py-12">
                  <Icon icon="mingcute:loading-line" className="animate-spin text-blue-700 mx-auto mb-4" width={32} />
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
                      className="bg-white border border-slate-300 rounded-xl p-6 hover:shadow-md transition-shadow"
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
                          <Icon icon="mingcute:loading-line" className="animate-spin text-blue-700 mx-auto mb-2" width={24} />
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
                              className="flex items-center gap-1 text-blue-700 hover:text-blue-600 font-medium bg-transparent hover:bg-transparent border-none p-0 outline-none"
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
                                    className="rounded-lg border border-slate-300 bg-slate-50 p-4"
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
                                  <div key={`${item.question}-${index}`} className="rounded-md border border-slate-300 p-4">
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
                            className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-sm font-medium"
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
            <div role="tabpanel" id="tabpanel-reminders" aria-labelledby="tab-reminders">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Upcoming Reminders</h2>
              {loadingReminders ? (
                <div className="text-center py-12">
                  <Icon icon="mingcute:loading-line" className="animate-spin text-blue-700 mx-auto mb-4" width={32} />
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
                      className="bg-white border border-slate-300 rounded-xl p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Icon
                              icon={reminder.reminderType === "24_hours" ? "mingcute:time-line" : "mingcute:alarm-line"}
                              width={20}
                              className="text-blue-700"
                            />
                            <h3 className="font-semibold text-slate-900">
                              {reminder.reminderType === "24_hours" ? "24 Hours Before" : "2 Hours Before"}
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
                            <strong>Reminder Time:</strong> {formatDateTime(reminder.scheduledAt)}
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
            <div role="tabpanel" id="tabpanel-thank-you" aria-labelledby="tab-thank-you">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Thank You Notes</h2>
                  <p className="text-slate-600 mt-2">
                    Generate and send thank-you notes after your interviews. Click on any interview to create or review a draft.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateThankYouModal(true)}
                  className="bg-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-800 transition-all flex items-center gap-2 shadow-md"
                >
                  <Icon icon="mingcute:add-line" width={20} />
                  Create Thank You Note
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {interviews
                  .filter((i) => i.status === "completed" || i.outcome)
                  .slice(0, 6)
                  .map((interview) => (
                    <div
                      key={interview.id}
                      className="bg-white border border-slate-300 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
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
                    className="bg-white border border-slate-300 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer relative"
                    onClick={async () => {
                      const completedInterview = interviews.find(i => i.status === "completed" || i.outcome);
                      if (!completedInterview) {
                        showMessage("Please complete an interview first to generate a thank-you note", "error");
                        return;
                      }

                      try {
                        // Open modal first
                        await openThankYouModal(completedInterview);
                        
                        // Auto-generate standard thank-you note if none exists
                        const notesResponse = await api.getThankYouNotes(completedInterview.id);
                        if (notesResponse.ok && notesResponse.data?.notes && notesResponse.data.notes.length === 0) {
                          setLoadingThankYou(true);
                          try {
                            const generateResponse = await api.generateThankYouNote(
                              completedInterview.id,
                              "standard"
                            );
                            if (generateResponse.ok && generateResponse.data?.note) {
                              const updatedNotesResponse = await api.getThankYouNotes(completedInterview.id);
                              if (updatedNotesResponse.ok && updatedNotesResponse.data?.notes) {
                                setThankYouNotes(updatedNotesResponse.data.notes);
                                showMessage("Thank-you note generated successfully! You can regenerate with different styles if needed.", "success");
                              }
                            }
                          } catch (err: any) {
                            console.error("Failed to auto-generate thank-you note:", err);
                            // Don't show error - user can generate manually
                          } finally {
                            setLoadingThankYou(false);
                          }
                        }
                      } catch (error) {
                        console.error("Error opening thank-you modal:", error);
                        showMessage("Failed to open thank-you note editor. Please try again.", "error");
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon icon="mingcute:mail-line" width={20} className="text-blue-700" />
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
                    <div className="text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-2 text-slate-700">
                      <div>
                        <span className="font-semibold">Subject:</span>{" "}
                        Thank You - [Role] at [Company]
                      </div>
                      <div className="whitespace-pre-wrap text-[10px]">
                        Dear [Interviewer],{"\n\n"}
                        Thank you for taking the time to speak with me about the [Role] position at [Company]. I appreciated our discussion about [specific topic from interview notes]...
                      </div>
                    </div>
                    {loadingThankYou && (
                      <div className="absolute inset-0 bg-white/90 rounded-xl flex items-center justify-center z-10">
                        <div className="flex items-center gap-2 text-blue-600">
                          <Icon icon="mingcute:loading-line" width={20} className="animate-spin" />
                          <span className="text-sm font-medium">Generating thank-you note...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Inquiry Template */}
                  <div 
                    className="bg-white border border-slate-300 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer relative"
                    onClick={async () => {
                      const completedInterview = interviews.find(i => i.status === "completed" || i.outcome);
                      if (!completedInterview) {
                        showMessage("Please complete an interview first", "error");
                        return;
                      }

                      try {
                        // Find existing status inquiry follow-up
                        let statusFollowUp = pendingFollowUps.find(fu => 
                          (fu.interviewId === completedInterview.id || fu.interview_id === completedInterview.id) && 
                          (fu.actionType === "status_inquiry" || fu.action_type === "status_inquiry")
                        );

                        // If doesn't exist, create it
                        if (!statusFollowUp) {
                          setDraftLoadingId("creating");
                          const dueDate = new Date();
                          dueDate.setDate(dueDate.getDate() + 14); // 2 weeks from now
                          
                          try {
                            const createResponse = await api.createFollowUpAction(completedInterview.id, {
                              actionType: "status_inquiry",
                              dueDate: dueDate.toISOString(),
                              notes: "Follow-up on interview status and hiring timeline",
                            });

                            if (createResponse.ok && (createResponse.data?.followUp || (createResponse.data as any)?.action)) {
                              statusFollowUp = createResponse.data?.followUp || (createResponse.data as any)?.action;
                              // Add to pending follow-ups list
                              setPendingFollowUps(prev => [...prev, statusFollowUp]);
                              // Reload follow-ups to get updated list
                              fetchPendingFollowUps();
                            } else {
                              console.error("Failed to create follow-up action - Response:", createResponse);
                              const errorMsg = createResponse.error?.message || (createResponse.data as any)?.message || "Failed to create follow-up action. Please try again.";
                              showMessage(errorMsg, "error");
                              setDraftLoadingId(null);
                              return;
                            }
                          } catch (createError: any) {
                            console.error("Error creating follow-up action:", createError);
                            const errorMsg = createError.response?.data?.error?.message || createError.message || "Failed to create follow-up action. Please try again.";
                            showMessage(errorMsg, "error");
                            setDraftLoadingId(null);
                            return;
                          }
                        }

                        // Generate draft for follow-up
                        const followUpId = statusFollowUp.id;
                        setDraftLoadingId(followUpId);
                        try {
                          const response = await api.getFollowUpEmailDraft(completedInterview.id, followUpId);
                          
                          if (response.ok && response.data?.draft) {
                            const draft = response.data.draft;
                            setStoredFollowUpDrafts(prev => {
                              const updated = new Map(prev);
                              const existing = updated.get(followUpId) || [];
                              updated.set(followUpId, [
                                { ...draft, createdAt: new Date().toISOString() },
                                ...existing,
                              ]);
                              return updated;
                            });
                            // Cache the draft but don't open modal - stay in current tab
                            // The draft will be available to view in the cached drafts section
                            showMessage("Follow-up email draft generated successfully! View it in 'Cached Follow-up Drafts' below.", "success");
                          } else {
                            showMessage("Failed to generate email draft. Please try again.", "error");
                          }
                        } catch (draftError) {
                          console.error("Error generating draft:", draftError);
                          showMessage("Failed to generate email draft. Please try again.", "error");
                        }
                      } catch (error) {
                        console.error("Error handling status inquiry:", error);
                        showMessage("An error occurred. Please try again.", "error");
                      } finally {
                        setDraftLoadingId(null);
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
                    <div className="text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-2 text-slate-700">
                      <div>
                        <span className="font-semibold">Subject:</span>{" "}
                        Follow-up: [Role] Application Status
                      </div>
                      <div className="whitespace-pre-wrap text-[10px]">
                        Dear [Interviewer],{"\n\n"}
                        I hope this email finds you well. I wanted to follow up regarding the [Role] position at [Company] for which we spoke on [date]...
                      </div>
                    </div>
                    {(draftLoadingId === "creating" || (draftLoadingId && draftLoadingId !== "creating" && pendingFollowUps.some(fu => fu.id === draftLoadingId && (fu.actionType === "status_inquiry" || fu.action_type === "status_inquiry")))) && (
                      <div className="absolute inset-0 bg-white/90 rounded-xl flex items-center justify-center z-10">
                        <div className="flex items-center gap-2 text-orange-600">
                          <Icon icon="mingcute:loading-line" width={20} className="animate-spin" />
                          <span className="text-sm font-medium">
                            {draftLoadingId === "creating" ? "Creating follow-up..." : "Generating draft..."}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Feedback Request Template */}
                  <div 
                    className="bg-white border border-slate-300 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer relative"
                    onClick={async () => {
                      const rejectedInterview = interviews.find(i => i.outcome === "rejected");
                      if (!rejectedInterview) {
                        showMessage("This template is available for interviews with rejected outcomes", "info");
                        return;
                      }

                      try {
                        // Find existing feedback request follow-up (using "other" type with notes indicating feedback request)
                        let feedbackFollowUp = pendingFollowUps.find(fu => 
                          (fu.interviewId === rejectedInterview.id || fu.interview_id === rejectedInterview.id) && 
                          ((fu.actionType === "other" || fu.action_type === "other") && 
                           (fu.notes?.toLowerCase().includes("feedback") || fu.notes?.toLowerCase().includes("feedback request")))
                        );

                        // If doesn't exist, create it
                        if (!feedbackFollowUp) {
                          setDraftLoadingId("creating");
                          const dueDate = new Date();
                          dueDate.setDate(dueDate.getDate() + 1); // 1 day from now
                          
                          try {
                            const createResponse = await api.createFollowUpAction(rejectedInterview.id, {
                              actionType: "other", // Using "other" since "feedback_request" is not a valid action_type
                              dueDate: dueDate.toISOString(),
                              notes: "Request feedback on interview performance to improve for future opportunities",
                            });

                            if (createResponse.ok && (createResponse.data?.followUp || (createResponse.data as any)?.action)) {
                              feedbackFollowUp = createResponse.data?.followUp || (createResponse.data as any)?.action;
                              // Add to pending follow-ups list
                              setPendingFollowUps(prev => [...prev, feedbackFollowUp]);
                              // Reload follow-ups to get updated list
                              fetchPendingFollowUps();
                            } else {
                              console.error("Failed to create follow-up action - Response:", createResponse);
                              const errorMsg = createResponse.error?.message || (createResponse.data as any)?.message || "Failed to create follow-up action. Please try again.";
                              showMessage(errorMsg, "error");
                              setDraftLoadingId(null);
                              return;
                            }
                          } catch (createError: any) {
                            console.error("Error creating follow-up action:", createError);
                            const errorMsg = createError.response?.data?.error?.message || createError.message || "Failed to create follow-up action. Please try again.";
                            showMessage(errorMsg, "error");
                            setDraftLoadingId(null);
                            return;
                          }
                        }

                        // Generate draft for follow-up
                        const followUpId = feedbackFollowUp.id;
                        setDraftLoadingId(followUpId);
                        try {
                          const response = await api.getFollowUpEmailDraft(rejectedInterview.id, followUpId);
                          
                          if (response.ok && response.data?.draft) {
                            const draft = response.data.draft;
                            setStoredFollowUpDrafts(prev => {
                              const updated = new Map(prev);
                              const existing = updated.get(followUpId) || [];
                              updated.set(followUpId, [
                                { ...draft, createdAt: new Date().toISOString() },
                                ...existing,
                              ]);
                              return updated;
                            });
                            // Cache the draft but don't open modal - stay in current tab
                            // The draft will be available to view in the cached drafts section
                            showMessage("Follow-up email draft generated successfully! View it in 'Cached Follow-up Drafts' below.", "success");
                          } else {
                            showMessage("Failed to generate email draft. Please try again.", "error");
                          }
                        } catch (draftError) {
                          console.error("Error generating draft:", draftError);
                          showMessage("Failed to generate email draft. Please try again.", "error");
                        }
                      } catch (error) {
                        console.error("Error handling feedback request:", error);
                        showMessage("An error occurred. Please try again.", "error");
                      } finally {
                        setDraftLoadingId(null);
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
                    <div className="text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-2 text-slate-700">
                      <div>
                        <span className="font-semibold">Subject:</span>{" "}
                        Request for Interview Feedback
                      </div>
                      <div className="whitespace-pre-wrap text-[10px]">
                        Dear [Interviewer],{"\n\n"}
                        Thank you again for the opportunity to interview for the [Role] position at [Company]. While I understand the outcome was not favorable, I am committed to continuous improvement...
                      </div>
                    </div>
                    {(draftLoadingId === "creating" || (draftLoadingId && draftLoadingId !== "creating" && pendingFollowUps.some(fu => fu.id === draftLoadingId && (fu.actionType === "feedback_request" || fu.action_type === "feedback_request")))) && (
                      <div className="absolute inset-0 bg-white/90 rounded-xl flex items-center justify-center z-10">
                        <div className="flex items-center gap-2 text-purple-600">
                          <Icon icon="mingcute:loading-line" width={20} className="animate-spin" />
                          <span className="text-sm font-medium">
                            {draftLoadingId === "creating" ? "Creating follow-up..." : "Generating draft..."}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cached Follow-up Drafts Section - Show all drafts individually */}
                {storedFollowUpDrafts.size > 0 && (() => {
                  // Flatten all drafts into a single list with metadata
                  const allDrafts: Array<{
                    followUpId: string;
                    draftIndex: number;
                    draft: { subject: string; body: string; generatedBy?: string; createdAt: string };
                    interview: any;
                    actionType: string;
                  }> = [];
                  
                  Array.from(storedFollowUpDrafts.entries()).forEach(([followUpId, drafts]) => {
                    const followUp = pendingFollowUps.find(fu => fu.id === followUpId) || 
                                   completedFollowUps.find(fu => fu.id === followUpId);
                    const interview = followUp ? interviews.find(i => i.id === (followUp.interviewId || followUp.interview_id)) : null;
                    const actionType = followUp?.actionType || followUp?.action_type || "follow-up";
                    
                    drafts.forEach((draft, index) => {
                      allDrafts.push({ followUpId, draftIndex: index, draft, interview, actionType });
                    });
                  });
                  
                  return allDrafts.length > 0 ? (
                    <div className="mt-10">
                      <h3 className="text-xl font-semibold text-slate-900 mb-3">
                        All Cached Follow-up Drafts ({allDrafts.length})
                      </h3>
                      <p className="text-slate-600 text-sm mb-4">
                        View and edit all your generated follow-up email drafts. Each draft is saved individually.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allDrafts.map(({ followUpId, draftIndex, draft, interview, actionType }) => {
                          const draftKey = `${followUpId}-${draftIndex}`;
                          const isExpanded = expandedDraftCards.get(draftKey) || false;
                          const isEditing = editingDrafts.get(draftKey) || false;
                          const editedContent = editedDraftContent.get(draftKey) || { subject: draft.subject, body: draft.body };
                          
                          return (
                            <div
                              key={draftKey}
                              className="bg-white border border-slate-300 rounded-xl p-6 hover:shadow-lg transition-all"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Icon 
                                      icon={
                                        actionType === "status_inquiry" ? "mingcute:question-line" :
                                        actionType === "other" ? "mingcute:feedback-line" :
                                        "mingcute:mail-line"
                                      } 
                                      width={18} 
                                      className={
                                        actionType === "status_inquiry" ? "text-orange-500" :
                                        actionType === "other" ? "text-purple-500" :
                                        "text-blue-700"
                                      }
                                    />
                                    <p className="text-xs font-semibold uppercase text-slate-600 tracking-wide">
                                      {actionType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                    </p>
                                  </div>
                                  {interview && (
                                    <p className="text-sm font-medium text-slate-900">
                                      {interview.title} at {interview.company}
                                    </p>
                                  )}
                                  <p className="text-xs text-slate-500 mt-1">
                                    {draft.createdAt && new Date(draft.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mb-3">
                                {!isExpanded && (
                                  <p className="text-xs font-semibold text-slate-700 mb-1 truncate">
                                    {draft.subject || "No subject"}
                                  </p>
                                )}
                                {!isExpanded && (
                                  <p className="text-xs text-slate-600 line-clamp-2">
                                    {draft.body?.substring(0, 100)}...
                                  </p>
                                )}
                              </div>

                              {/* Expanded/Edit view */}
                              {isExpanded && (
                                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-300 space-y-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                      Subject
                                    </label>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editedContent.subject}
                                        onChange={(e) => {
                                          setEditedDraftContent(prev => {
                                            const updated = new Map(prev);
                                            updated.set(draftKey, { ...editedContent, subject: e.target.value });
                                            return updated;
                                          });
                                        }}
                                        className="w-full text-sm font-medium text-slate-900 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    ) : (
                                      <p className="text-sm font-medium text-slate-900">
                                        {editedContent.subject || "No subject"}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                      Email Body
                                    </label>
                                    {isEditing ? (
                                      <textarea
                                        value={editedContent.body}
                                        onChange={(e) => {
                                          setEditedDraftContent(prev => {
                                            const updated = new Map(prev);
                                            updated.set(draftKey, { ...editedContent, body: e.target.value });
                                            return updated;
                                          });
                                        }}
                                        rows={8}
                                        className="w-full text-sm text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    ) : (
                                      <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-300 max-h-96 overflow-y-auto">
                                        {editedContent.body || "No content"}
                                      </div>
                                    )}
                                  </div>
                                  {isEditing ? (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Save edited content
                                          setStoredFollowUpDrafts(prev => {
                                            const updated = new Map(prev);
                                            const drafts = updated.get(followUpId) || [];
                                            const newDrafts = [...drafts];
                                            newDrafts[draftIndex] = {
                                              ...newDrafts[draftIndex],
                                              subject: editedContent.subject,
                                              body: editedContent.body,
                                              createdAt: newDrafts[draftIndex].createdAt,
                                              generatedBy: newDrafts[draftIndex].generatedBy,
                                            };
                                            updated.set(followUpId, newDrafts);
                                            return updated;
                                          });
                                          setEditingDrafts(prev => {
                                            const updated = new Map(prev);
                                            updated.set(draftKey, false);
                                            return updated;
                                          });
                                          showMessage("Draft saved!", "success");
                                        }}
                                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium transition-colors"
                                      >
                                        Save Changes
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Cancel editing - revert to original
                                          setEditedDraftContent(prev => {
                                            const updated = new Map(prev);
                                            updated.set(draftKey, { subject: draft.subject, body: draft.body });
                                            return updated;
                                          });
                                          setEditingDrafts(prev => {
                                            const updated = new Map(prev);
                                            updated.set(draftKey, false);
                                            return updated;
                                          });
                                        }}
                                        className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-xs font-medium transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(editedContent.body || "");
                                          showMessage("Draft copied to clipboard!", "success");
                                        }}
                                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium transition-colors"
                                      >
                                        Copy to Clipboard
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingDrafts(prev => {
                                            const updated = new Map(prev);
                                            updated.set(draftKey, true);
                                            return updated;
                                          });
                                        }}
                                        className="px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xs font-medium transition-colors"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newExpanded = !isExpanded;
                                    setExpandedDraftCards(prev => {
                                      const updated = new Map(prev);
                                      updated.set(draftKey, newExpanded);
                                      return updated;
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xs font-medium transition-colors"
                                >
                                  {isExpanded ? "Hide Draft" : "View Draft"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}
                
                {/* Old grouped view - keeping for reference but replacing with above */}
                {false && storedFollowUpDrafts.size > 0 && (
                  <div className="mt-10">
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">
                      Cached Follow-up Drafts
                    </h3>
                    <p className="text-slate-600 text-sm mb-4">
                      Your generated follow-up email drafts are saved here. Click to view or regenerate.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from(storedFollowUpDrafts.entries()).map(([followUpId, drafts]) => {
                        if (!drafts || drafts.length === 0) return null;
                        const latestDraft = drafts[0];
                        const followUp = pendingFollowUps.find(fu => fu.id === followUpId) || 
                                       completedFollowUps.find(fu => fu.id === followUpId);
                        const interview = followUp ? interviews.find(i => i.id === (followUp.interviewId || followUp.interview_id)) : null;
                        const actionType = followUp?.actionType || followUp?.action_type || "follow-up";
                        
                        const isExpanded = expandedDraftCards.get(followUpId) || false;
                        return (
                          <div
                            key={followUpId}
                            className="bg-white border border-slate-300 rounded-xl p-6 hover:shadow-lg transition-all"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Icon 
                                    icon={
                                      actionType === "status_inquiry" ? "mingcute:question-line" :
                                      actionType === "other" ? "mingcute:feedback-line" :
                                      "mingcute:mail-line"
                                    } 
                                    width={18} 
                                    className={
                                      actionType === "status_inquiry" ? "text-orange-500" :
                                      actionType === "other" ? "text-purple-500" :
                                      "text-blue-700"
                                    }
                                  />
                                  <p className="text-xs font-semibold uppercase text-slate-600 tracking-wide">
                                    {actionType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </p>
                                </div>
                                {interview && (
                                  <p className="text-sm font-medium text-slate-900">
                                    {interview.title} at {interview.company}
                                  </p>
                                )}
                                <p className="text-xs text-slate-500 mt-1">
                                  {latestDraft.createdAt && new Date(latestDraft.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              {drafts.length > 1 && (
                                <span className="px-2 py-1 rounded-full text-[10px] bg-blue-50 text-blue-700">
                                  {drafts.length} drafts
                                </span>
                              )}
                            </div>
                            
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-slate-700 mb-1 truncate">
                                {latestDraft.subject || "No subject"}
                              </p>
                              {!isExpanded && (
                                <p className="text-xs text-slate-600 line-clamp-2">
                                  {latestDraft.body?.substring(0, 100)}...
                                </p>
                              )}
                            </div>

                            {/* Expanded view */}
                            {isExpanded && (
                              <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-300 space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Subject
                                  </label>
                                  <p className="text-sm font-medium text-slate-900">
                                    {latestDraft.subject || "No subject"}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Email Body
                                  </label>
                                  <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-300 max-h-96 overflow-y-auto">
                                    {latestDraft.body || "No content"}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(latestDraft.body || "");
                                    showMessage("Draft copied to clipboard!", "success");
                                  }}
                                  className="w-full px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium transition-colors"
                                >
                                  Copy to Clipboard
                                </button>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newExpanded = !isExpanded;
                                  setExpandedDraftCards(prev => {
                                    const updated = new Map(prev);
                                    updated.set(followUpId, newExpanded);
                                    return updated;
                                  });
                                }}
                                className="flex-1 px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xs font-medium transition-colors"
                              >
                                {isExpanded ? "Hide Draft" : "View Draft"}
                              </button>
                              {drafts.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const showAll = showAllFollowUpDrafts.get(followUpId) || false;
                                    setShowAllFollowUpDrafts(prev => {
                                      const updated = new Map(prev);
                                      updated.set(followUpId, !showAll);
                                      return updated;
                                    });
                                  }}
                                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-xs font-medium transition-colors"
                                >
                                  {showAllFollowUpDrafts.get(followUpId) ? "Less" : "More"}
                                </button>
                              )}
                            </div>

                            {showAllFollowUpDrafts.get(followUpId) && drafts.length > 1 && (
                              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 max-h-40 overflow-y-auto">
                                {drafts.slice(1).map((draft, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveFollowUpDraft({
                                        id: followUpId,
                                        interviewId: interview?.id || "",
                                        subject: draft.subject,
                                        body: draft.body,
                                        generatedBy: draft.generatedBy,
                                      });
                                    }}
                                    className="w-full text-left px-2 py-1 rounded border border-slate-300 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                  >
                                    <p className="text-xs font-medium text-slate-700 truncate">{draft.subject}</p>
                                    <p className="text-[10px] text-slate-500">
                                      {new Date(draft.createdAt).toLocaleDateString()}
                                    </p>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Drafts Section - Newly generated notes */}
                {recentThankYouDrafts.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">
                      Recent Drafts ({recentThankYouDrafts.length})
                    </h3>
                    <p className="text-slate-600 text-sm mb-4">
                      Your newly generated thank you note drafts. Edit, copy, or move to saved notes.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recentThankYouDrafts.map((draft) => {
                        const noteKey = draft.id;
                        const isExpanded = expandedThankYouCards.get(noteKey) || false;
                        const isEditing = editingThankYouCards.get(noteKey) || false;
                        const editedContent = editedDraftContent.get(noteKey) || { subject: draft.subject, body: draft.body };
                        
                        return (
                          <div
                            key={noteKey}
                            className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 hover:shadow-lg transition-all"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Icon 
                                    icon="mingcute:mail-line"
                                    width={18} 
                                    className="text-blue-600"
                                  />
                                  <p className="text-xs font-semibold uppercase text-blue-700 tracking-wide">
                                    {draft.style ? draft.style.charAt(0).toUpperCase() + draft.style.slice(1) : "Thank You"}
                                  </p>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-200 text-blue-800 font-medium">
                                    New
                                  </span>
                                </div>
                                {draft.interview && (
                                  <p className="text-sm font-medium text-slate-900">
                                    {draft.interview.title || "Interview"} at {draft.interview.company || "Company"}
                                  </p>
                                )}
                                <p className="text-xs text-slate-500 mt-1">
                                  {draft.createdAt && new Date(draft.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              {!isExpanded && (
                                <p className="text-xs font-semibold text-slate-700 mb-1 truncate">
                                  {draft.subject || "No subject"}
                                </p>
                              )}
                              {!isExpanded && (
                                <p className="text-xs text-slate-600 line-clamp-2">
                                  {draft.body?.substring(0, 100)}...
                                </p>
                              )}
                            </div>

                            {/* Expanded/Edit view */}
                            {isExpanded && (
                              <div className="mb-4 p-4 bg-white rounded-lg border border-blue-200 space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Subject
                                  </label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editedContent.subject}
                                      onChange={(e) => {
                                        setEditedDraftContent(prev => {
                                          const updated = new Map(prev);
                                          updated.set(noteKey, { ...editedContent, subject: e.target.value });
                                          return updated;
                                        });
                                      }}
                                      className="w-full text-sm font-medium text-slate-900 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  ) : (
                                    <p className="text-sm font-medium text-slate-900">
                                      {editedContent.subject || "No subject"}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Email Body
                                  </label>
                                  {isEditing ? (
                                    <textarea
                                      value={editedContent.body}
                                      onChange={(e) => {
                                        setEditedDraftContent(prev => {
                                          const updated = new Map(prev);
                                          updated.set(noteKey, { ...editedContent, body: e.target.value });
                                          return updated;
                                        });
                                      }}
                                      rows={8}
                                      className="w-full text-sm text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  ) : (
                                    <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-300 max-h-96 overflow-y-auto">
                                      {editedContent.body || "No content"}
                                    </div>
                                  )}
                                </div>
                                {isEditing ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingThankYouCards(prev => {
                                          const updated = new Map(prev);
                                          updated.set(noteKey, false);
                                          return updated;
                                        });
                                      }}
                                      className="flex-1 px-3 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 text-xs font-medium transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Update the draft
                                        setRecentThankYouDrafts(prev => 
                                          prev.map(d => d.id === noteKey ? {
                                            ...d,
                                            subject: editedContent.subject,
                                            body: editedContent.body,
                                          } : d)
                                        );
                                        setEditingThankYouCards(prev => {
                                          const updated = new Map(prev);
                                          updated.set(noteKey, false);
                                          return updated;
                                        });
                                        showMessage("Draft updated!", "success");
                                      }}
                                      className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium transition-colors"
                                    >
                                      Save Changes
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(editedContent.body || "");
                                        showMessage("Note copied to clipboard!", "success");
                                      }}
                                      className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium transition-colors"
                                    >
                                      Copy to Clipboard
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingThankYouCards(prev => {
                                          const updated = new Map(prev);
                                          updated.set(noteKey, true);
                                          return updated;
                                        });
                                      }}
                                      className="px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xs font-medium transition-colors"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            {!isExpanded && (
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newExpanded = !isExpanded;
                                    setExpandedThankYouCards(prev => {
                                      const updated = new Map(prev);
                                      updated.set(noteKey, newExpanded);
                                      return updated;
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xs font-medium transition-colors"
                                >
                                  {isExpanded ? "Hide Note" : "View Note"}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Move to cached notes
                                    setStoredThankYouNotes(prev => {
                                      const updated = new Map(prev);
                                      const existing = updated.get(draft.interviewId) || [];
                                      updated.set(draft.interviewId, [
                                        {
                                          subject: draft.subject,
                                          body: draft.body,
                                          style: draft.style,
                                          generatedBy: draft.generatedBy,
                                          createdAt: draft.createdAt,
                                        },
                                        ...existing,
                                      ]);
                                      return updated;
                                    });
                                    // Remove from recent drafts
                                    setRecentThankYouDrafts(prev => prev.filter(d => d.id !== noteKey));
                                    showMessage("Draft moved to saved notes!", "success");
                                  }}
                                  className="px-3 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 text-xs font-medium transition-colors"
                                  title="Save to cached notes"
                                >
                                  <Icon icon="mingcute:bookmark-line" width={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cached Thank You Notes Section - Show all notes individually */}
                {storedThankYouNotes.size > 0 && (() => {
                  // Flatten all notes into a single list with metadata
                  const allNotes: Array<{
                    interviewId: string;
                    noteIndex: number;
                    note: { subject: string; body: string; style?: string; generatedBy?: string; createdAt: string };
                    interview: any;
                  }> = [];
                  
                  Array.from(storedThankYouNotes.entries()).forEach(([interviewId, notes]) => {
                    const interview = interviews.find(i => i.id === interviewId);
                    
                    notes.forEach((note, index) => {
                      allNotes.push({ interviewId, noteIndex: index, note, interview });
                    });
                  });
                  
                  return allNotes.length > 0 ? (
                    <div className="mt-10">
                      <h3 className="text-xl font-semibold text-slate-900 mb-3">
                        All Cached Thank You Notes ({allNotes.length})
                      </h3>
                      <p className="text-slate-600 text-sm mb-4">
                        View and edit all your generated thank you note drafts. Each draft is saved individually.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allNotes.map(({ interviewId, noteIndex, note, interview }) => {
                          const noteKey = `${interviewId}-${noteIndex}`;
                          const isExpanded = expandedThankYouCards.get(noteKey) || false;
                          const isEditing = editingThankYouCards.get(noteKey) || false;
                          const editedContent = editedDraftContent.get(noteKey) || { subject: note.subject, body: note.body };
                          
                          return (
                            <div
                              key={noteKey}
                              className="bg-white border border-slate-300 rounded-xl p-6 hover:shadow-lg transition-all"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Icon 
                                      icon="mingcute:mail-line"
                                      width={18} 
                                      className="text-blue-700"
                                    />
                                    <p className="text-xs font-semibold uppercase text-slate-600 tracking-wide">
                                      {note.style ? note.style.charAt(0).toUpperCase() + note.style.slice(1) : "Thank You"}
                                    </p>
                                  </div>
                                  {interview && (
                                    <p className="text-sm font-medium text-slate-900">
                                      {interview.title || "Interview"} at {interview.company || "Company"}
                                    </p>
                                  )}
                                  <p className="text-xs text-slate-500 mt-1">
                                    {note.createdAt && new Date(note.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mb-3">
                                {!isExpanded && (
                                  <p className="text-xs font-semibold text-slate-700 mb-1 truncate">
                                    {note.subject || "No subject"}
                                  </p>
                                )}
                                {!isExpanded && (
                                  <p className="text-xs text-slate-600 line-clamp-2">
                                    {note.body?.substring(0, 100)}...
                                  </p>
                                )}
                              </div>

                              {/* Expanded/Edit view */}
                              {isExpanded && (
                                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-300 space-y-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                      Subject
                                    </label>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editedContent.subject}
                                        onChange={(e) => {
                                          setEditedDraftContent(prev => {
                                            const updated = new Map(prev);
                                            updated.set(noteKey, { ...editedContent, subject: e.target.value });
                                            return updated;
                                          });
                                        }}
                                        className="w-full text-sm font-medium text-slate-900 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    ) : (
                                      <p className="text-sm font-medium text-slate-900">
                                        {editedContent.subject || "No subject"}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                      Email Body
                                    </label>
                                    {isEditing ? (
                                      <textarea
                                        value={editedContent.body}
                                        onChange={(e) => {
                                          setEditedDraftContent(prev => {
                                            const updated = new Map(prev);
                                            updated.set(noteKey, { ...editedContent, body: e.target.value });
                                            return updated;
                                          });
                                        }}
                                        rows={8}
                                        className="w-full text-sm text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    ) : (
                                      <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-300 max-h-96 overflow-y-auto">
                                        {editedContent.body || "No content"}
                                      </div>
                                    )}
                                  </div>
                                  {isEditing ? (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingThankYouCards(prev => {
                                            const updated = new Map(prev);
                                            updated.set(noteKey, false);
                                            return updated;
                                          });
                                        }}
                                        className="flex-1 px-3 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 text-xs font-medium transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Save edited content
                                          setStoredThankYouNotes(prev => {
                                            const updated = new Map(prev);
                                            const notes = updated.get(interviewId) || [];
                                            const newNotes = [...notes];
                                            newNotes[noteIndex] = {
                                              ...newNotes[noteIndex],
                                              subject: editedContent.subject,
                                              body: editedContent.body,
                                              createdAt: newNotes[noteIndex].createdAt,
                                              style: newNotes[noteIndex].style,
                                              generatedBy: newNotes[noteIndex].generatedBy,
                                            };
                                            updated.set(interviewId, newNotes);
                                            return updated;
                                          });
                                          setEditingThankYouCards(prev => {
                                            const updated = new Map(prev);
                                            updated.set(noteKey, false);
                                            return updated;
                                          });
                                          showMessage("Note saved!", "success");
                                        }}
                                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium transition-colors"
                                      >
                                        Save Changes
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(editedContent.body || "");
                                          showMessage("Note copied to clipboard!", "success");
                                        }}
                                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium transition-colors"
                                      >
                                        Copy to Clipboard
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingThankYouCards(prev => {
                                            const updated = new Map(prev);
                                            updated.set(noteKey, true);
                                            return updated;
                                          });
                                        }}
                                        className="px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xs font-medium transition-colors"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              {!isExpanded && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newExpanded = !isExpanded;
                                      setExpandedThankYouCards(prev => {
                                        const updated = new Map(prev);
                                        updated.set(noteKey, newExpanded);
                                        return updated;
                                      });
                                    }}
                                    className="flex-1 px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xs font-medium transition-colors"
                                  >
                                    {isExpanded ? "Hide Note" : "View Note"}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          {activeTab === "follow-ups" && (
            <div role="tabpanel" id="tabpanel-follow-ups" aria-labelledby="tab-follow-ups">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900">Follow-up Actions</h2>
                <button
                  onClick={() => setShowCreateFollowUpModal(true)}
                  className="bg-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-800 transition-all flex items-center gap-2 shadow-md"
                >
                  <Icon icon="mingcute:add-line" width={20} />
                  Create Follow-up
                </button>
              </div>
              {loadingFollowUps ? (
                <div className="text-center py-12">
                  <Icon icon="mingcute:loading-line" className="animate-spin text-blue-700 mx-auto mb-4" width={32} />
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
                      className="bg-white border border-slate-300 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col relative"
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
                          <Icon icon="mingcute:eye-line" width={18} className="text-blue-700" />
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
                            <Icon icon="mingcute:task-line" width={18} className="text-blue-700" />
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
                          className="w-full px-4 py-2 bg-blue-700 text-white rounded-full hover:bg-blue-800 text-xs font-medium"
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
                                className="bg-slate-50 border border-slate-300 rounded-xl p-5 opacity-75"
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
                            <div className="mb-4 max-h-48 overflow-y-auto border border-slate-300 rounded-lg p-2 bg-slate-50">
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
                                  className="p-2 mb-2 bg-white rounded border border-slate-300 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
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
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-slate-500">
                            Subject
                          </label>
                          {!isEditingDraft && (
                            <button
                              onClick={() => {
                                setIsEditingDraft(true);
                                const draftKey = `modal-${activeFollowUpDraft.id}`;
                                setEditedDraftContent(prev => {
                                  const updated = new Map(prev);
                                  updated.set(draftKey, {
                                    subject: activeFollowUpDraft.subject,
                                    body: activeFollowUpDraft.body,
                                  });
                                  return updated;
                                });
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              <Icon icon="mingcute:edit-line" width={14} className="inline mr-1" />
                              Edit
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          readOnly={!isEditingDraft}
                          value={(() => {
                            if (isEditingDraft) {
                              const draftKey = `modal-${activeFollowUpDraft.id}`;
                              const edited = editedDraftContent.get(draftKey);
                              return edited ? edited.subject : activeFollowUpDraft.subject;
                            }
                            return activeFollowUpDraft.subject;
                          })()}
                          onChange={(e) => {
                            if (isEditingDraft) {
                              const draftKey = `modal-${activeFollowUpDraft.id}`;
                              setEditedDraftContent(prev => {
                                const updated = new Map(prev);
                                const current = updated.get(draftKey) || { subject: activeFollowUpDraft.subject, body: activeFollowUpDraft.body };
                                updated.set(draftKey, {
                                  ...current,
                                  subject: e.target.value,
                                });
                                return updated;
                              });
                            }
                          }}
                          className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono whitespace-pre-wrap ${
                            isEditingDraft
                              ? "bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              : "bg-slate-50"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Body
                        </label>
                        <textarea
                          readOnly={!isEditingDraft}
                          rows={8}
                          value={(() => {
                            if (isEditingDraft) {
                              const draftKey = `modal-${activeFollowUpDraft.id}`;
                              const edited = editedDraftContent.get(draftKey);
                              return edited ? edited.body : activeFollowUpDraft.body;
                            }
                            return activeFollowUpDraft.body;
                          })()}
                          onChange={(e) => {
                            if (isEditingDraft) {
                              const draftKey = `modal-${activeFollowUpDraft.id}`;
                              setEditedDraftContent(prev => {
                                const updated = new Map(prev);
                                const current = updated.get(draftKey) || { subject: activeFollowUpDraft.subject, body: activeFollowUpDraft.body };
                                updated.set(draftKey, {
                                  ...current,
                                  body: e.target.value,
                                });
                                return updated;
                              });
                            }
                          }}
                          className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono whitespace-pre-wrap ${
                            isEditingDraft
                              ? "bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              : "bg-slate-50"
                          }`}
                        />
                      </div>
                      {!isEditingDraft && (
                        <p className="text-xs text-slate-500">
                          Click "Edit" to modify this draft, or copy it into your email client.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="mt-4 flex justify-between items-center">
                {isEditingDraft ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingDraft(false);
                        const draftKey = `modal-${activeFollowUpDraft.id}`;
                        setEditedDraftContent(prev => {
                          const updated = new Map(prev);
                          updated.delete(draftKey);
                          return updated;
                        });
                      }}
                      className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (activeFollowUpDraft) {
                          const draftKey = `modal-${activeFollowUpDraft.id}`;
                          const edited = editedDraftContent.get(draftKey);
                          if (edited) {
                            // Update the draft in stored drafts
                            setStoredFollowUpDrafts((prev) => {
                              const updated = new Map(prev);
                              const drafts = updated.get(activeFollowUpDraft.id) || [];
                              if (drafts.length > 0) {
                                // Update the first (latest) draft
                                const updatedDrafts = [
                                  {
                                    ...drafts[0],
                                    subject: edited.subject,
                                    body: edited.body,
                                    createdAt: new Date().toISOString(),
                                  },
                                  ...drafts.slice(1),
                                ];
                                updated.set(activeFollowUpDraft.id, updatedDrafts);
                              }
                              return updated;
                            });
                            // Update the active draft
                            setActiveFollowUpDraft({
                              ...activeFollowUpDraft,
                              subject: edited.subject,
                              body: edited.body,
                            });
                            setIsEditingDraft(false);
                            setEditedDraftContent(prev => {
                              const updated = new Map(prev);
                              updated.delete(draftKey);
                              return updated;
                            });
                            showMessage("Draft updated successfully!", "success");
                          }
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-800 transition"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setActiveFollowUpDraft(null);
                      setIsEditingDraft(false);
                      const draftKey = activeFollowUpDraft ? `modal-${activeFollowUpDraft.id}` : null;
                      if (draftKey) {
                        setEditedDraftContent(prev => {
                          const updated = new Map(prev);
                          updated.delete(draftKey);
                          return updated;
                        });
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
              )}
            </div>
          )}


          {activeTab === "analytics" && (
            <div role="tabpanel" id="tabpanel-analytics" aria-labelledby="tab-analytics">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Interview Performance Analytics</h2>
              <p className="text-slate-600 mb-6">
                Track your progress and identify patterns
              </p>
              {loadingAnalytics ? (
                <div className="text-center py-12">
                  <Icon icon="mingcute:loading-line" className="animate-spin text-blue-700 mx-auto mb-4" width={32} />
                  <p className="text-slate-600">Loading analytics...</p>
                </div>
              ) : analytics ? (
                <>
                  {(() => {
                    // Prepare chart data with abbreviated labels
                    const abbreviateFormatLabel = (label: string) => {
                      const labelLower = label.toLowerCase();
                      if (labelLower.includes('system design')) return 'Sys Design';
                      if (labelLower.includes('phone')) return 'Phone';
                      if (labelLower.includes('hirevue')) return 'HireVue';
                      if (labelLower.includes('technical')) return 'Technical';
                      if (labelLower.includes('behavioral')) return 'Behavioral';
                      if (labelLower.includes('on-site') || labelLower.includes('onsite')) return 'On-site';
                      return label.length > 8 ? label.substring(0, 8) : label;
                    };

                    const formatChartData = analytics.performanceByFormat?.map((item) => ({
                      name: abbreviateFormatLabel(item.formatLabel),
                      successful: item.successful,
                      total: item.total,
                    })) || [];

                    const companyTypeChartData = analytics.performanceByCompanyType?.map((item) => ({
                      name: item.companyType,
                      successful: item.successful,
                      total: item.total,
                    })) || [];

                    const skillAreaChartData = analytics.skillAreaPerformance?.map((item) => ({
                      name: item.skillAreaLabel,
                      score: item.averageScore,
                      remaining: 100 - item.averageScore,
                    })) || [];

                    const trendChartData = analytics.improvementTrend
                      ?.filter((item) => item.period && item.averageScore !== null)
                      .map((item) => ({
                        period: item.period,
                        score: item.averageScore || 0,
                      })) || [];

                    const confidenceChartData = analytics.confidenceTrends
                      ? analytics.confidenceTrends
                          .filter((item) => item.period && item.avgPreConfidence !== null)
                          .map((item) => ({
                            period: item.period,
                            confidence: item.avgPreConfidence || 0,
                          }))
                      : [];

                    const anxietyChartData = analytics.anxietyProgress
                      ? analytics.anxietyProgress
                          .filter((item) => item.period && item.avgPreAnxiety !== null)
                          .map((item) => ({
                            period: item.period,
                            anxiety: item.avgPreAnxiety || 0,
                          }))
                      : [];

                    return (
                      <div>
                        {/* Main Content Container with Light Blue Background */}
                        <div className="bg-[#EBF5FF] rounded-t-[30px] border border-[#B7B7B7] p-8">
                          {/* Single Grid Layout with Strategy Insights spanning all rows */}
                          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.8fr_350px] gap-6 auto-rows-min">
                            {/* Left Column: Stacked Cards (Conversion Rate, Industry Standards, Company Types) */}
                            <div className="space-y-6">
                              {/* Top Row: Small Conversion Rate Cards */}
                              <div className="grid grid-cols-2 gap-6">
                                {/* Interview to Offer Conversion Rate - Smaller */}
                                <div className="rounded-[15px] p-3 flex flex-col justify-between" style={{ background: 'linear-gradient(180deg, #1E3097 0%, #3351FD 100%)', minHeight: '170px' }}>
                                  <h3 className="text-[16px] font-medium text-white mb-1" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
                                    Interview to Offer Conversion Rate
                                  </h3>
                                  <div className="text-[50px] font-medium text-[#E7EFFF]" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
                                    {analytics.conversionRate.userRate}%
                                  </div>
                                </div>

                                {/* Industry Standards - Smaller */}
                                <div className="bg-white rounded-[15px] p-3 flex flex-col justify-between" style={{ minHeight: '170px' }}>
                                  <h3 className="text-[16px] font-light text-black mb-1" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                                    Industry Standards
                                  </h3>
                                  <div className="flex items-end gap-3">
                                    <div className="flex-shrink-0">
                                      <div className="text-[36px] font-medium" style={{ color: '#3351FD', fontFamily: 'Poppins', fontWeight: 500 }}>
                                        {analytics.conversionRate.userRate}%
                                      </div>
                                      <p className="text-[11px]" style={{ color: '#737373', fontFamily: 'Poppins' }}>Your Score</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                      <div className="text-[36px]" style={{ color: '#9A9A9A', fontFamily: 'Poppins', fontWeight: 100 }}>
                                        {analytics.conversionRate.industryAverage}%
                                      </div>
                                      <p className="text-[11px] whitespace-nowrap" style={{ color: '#737373', fontFamily: 'Poppins' }}>Industry Standards</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Performance Across Company Types - Spans both cards above, matches height with Format Comparison + Strongest/Weakest */}
                              {companyTypeChartData.length > 0 && (
                                <div className="bg-white rounded-[15px] p-3" style={{ minHeight: '370px' }}>
                                  <h3 className="text-[25px] font-light text-black mb-4" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                                    Performance Across Company Types
                                  </h3>
                                  <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={companyTypeChartData} margin={{ left: 10, right: 10 }}>
                                      <defs>
                                        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#3351FD" />
                                          <stop offset="100%" stopColor="#1E3097" />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
                                      <XAxis 
                                        dataKey="name" 
                                        tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                                      />
                                      <YAxis 
                                        tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                                        domain={[0, 30]}
                                        label={{ value: 'Successful Interviews', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 } }}
                                      />
                                      <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
                                      <Bar 
                                        dataKey="successful" 
                                        name="Successful Interviews"
                                        radius={[15, 15, 0, 0]}
                                        fill="url(#blueGradient)"
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>

                            {/* Middle Column: Format Comparison and Strongest & Weakest Areas */}
                            <div className="flex flex-col gap-6">
                              {/* Interview Format Comparison */}
                              {formatChartData.length > 0 && (
                                <div className="bg-white rounded-[15px] p-3" style={{ minHeight: '310px' }}>
                                  <h3 className="text-[20px] font-light text-black mb-6" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                                    Interview Format Comparison
                                  </h3>
                                  <ResponsiveContainer width="100%" height={224}>
                                    <BarChart data={formatChartData} margin={{ left: 10, right: 10, bottom: 30 }}>
                                      <defs>
                                        <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#FFD53F" />
                                          <stop offset="100%" stopColor="#F89000" />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
                                      <XAxis 
                                        dataKey="name" 
                                        angle={-15}
                                        textAnchor="end"
                                        height={60}
                                        interval={0}
                                        tick={{ fill: '#737373', fontSize: 10, fontFamily: 'Poppins', fontWeight: 400 }}
                                      />
                                      <YAxis 
                                        tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                                        domain={[0, 30]}
                                        label={{ value: 'Successful Interviews', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 } }}
                                      />
                                      <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
                                      <Bar 
                                        dataKey="successful" 
                                        name="Successful Interviews"
                                        radius={[15, 15, 0, 0]}
                                        fill="url(#orangeGradient)"
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              )}

                              {/* Strongest & Weakest Areas - Should align with Company Types card */}
                              {skillAreaChartData.length > 0 && (
                                <div className="bg-white rounded-[15px] p-4 flex flex-col" style={{ paddingBottom: '21px', minHeight: '230px' }}>
                                  <h3 className="text-[18px] font-light text-black mb-5" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                                    Strongest & Weakest Areas
                                  </h3>
                                  <div className="space-y-6">
                                    {skillAreaChartData.slice(0, 3).map((item, idx) => (
                                      <div key={idx} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] text-black" style={{ fontFamily: 'Poppins', fontWeight: 400 }}>
                                            {item.name}
                                          </span>
                                          <span className="text-[10px]" style={{ color: '#606060', fontFamily: 'Poppins', fontWeight: 400 }}>
                                            {item.score}/100
                                          </span>
                                        </div>
                                        <div className="relative w-full h-[8px] rounded-[10px]" style={{ background: '#D9D9D9' }}>
                                          <div 
                                            className="h-[8px] rounded-[10px]" 
                                            style={{ 
                                              width: `${item.score}%`,
                                              background: 'linear-gradient(90deg, #1E3097 0%, #3351FD 100%)'
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right Column: Optimal Interview Strategy Insights - Spanning first 2 rows only */}
                            {analytics.optimalStrategyInsights && analytics.optimalStrategyInsights.length > 0 && (
                              <div className="bg-white rounded-[15px] p-6 flex flex-col" style={{ gridRow: 'span 2', minHeight: '600px' }}>
                                <h3 className="text-[25px] font-light text-black mb-6" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                                  Optimal Interview Strategy Insights
                                </h3>
                                <div className="space-y-8 flex-1 flex flex-col justify-between">
                                  {analytics.optimalStrategyInsights.map((insight, idx) => (
                                    <div key={insight.number} className="flex-1 flex flex-col justify-center">
                                      <div className="flex gap-4">
                                        <span className="text-[35px] font-light shrink-0" style={{ color: '#003DB6', fontFamily: 'Poppins', fontWeight: 300 }}>
                                          {insight.number}.
                                        </span>
                                        <div>
                                          <h4 className="text-[13px] font-semibold text-black mb-2" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>
                                            {insight.title}
                                          </h4>
                                          <p className="text-[13px] font-light leading-relaxed" style={{ color: '#737373', fontFamily: 'Poppins', fontWeight: 300 }}>
                                            {insight.description}
                                          </p>
                                        </div>
                                      </div>
                                      {idx < analytics.optimalStrategyInsights.length - 1 && (
                                        <div className="h-[1px] mt-8" style={{ background: '#D9D9D9' }} />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Second Row: Improvements Over Time and Recommendations with custom proportions */}
                            <div className="flex gap-6" style={{ gridColumn: '1 / 3' }}>
                              {/* Improvements Over Time - Smaller width */}
                              {trendChartData.length > 0 && (
                                <div className="bg-white rounded-[15px] p-3 flex-shrink-0" style={{ width: '38%', minHeight: '270px' }}>
                                  <h3 className="text-[20px] font-light text-black mb-3" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                                    Improvements Over Time
                                  </h3>
                                  <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={trendChartData} margin={{ left: 10, right: 10 }}>
                                      <defs>
                                        <linearGradient id="orangeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#FFD53F" />
                                          <stop offset="100%" stopColor="#F89000" />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
                                      <XAxis dataKey="period" tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }} />
                                      <YAxis 
                                        tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                                        label={{ value: 'Average Score', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 } }}
                                      />
                                      <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
                                      <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke="url(#orangeAreaGradient)"
                                        fill="url(#orangeAreaGradient)"
                                        name="Average Score"
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              )}

                              {/* Recommendations - Extended width */}
                              {analytics.recommendations && analytics.recommendations.length > 0 && (
                                <div className="bg-white rounded-[15px] p-4 flex-1" style={{ minHeight: '270px' }}>
                                  <h3 className="text-[20px] font-light text-black mb-3" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                                    Personalized Improvement <br/>Recommendations
                                  </h3>
                                  <p className="text-[16px] font-light mb-3" style={{ color: '#6A94EE', fontFamily: 'Poppins', fontWeight: 300 }}>
                                    Recommended Actions ({analytics.recommendations.length}):
                                  </p>
                                  <ul className="space-y-2">
                                    {analytics.recommendations.map((rec, index) => (
                                      <li key={index} className="flex items-start gap-3">
                                        <div className="w-[15px] h-[15px] mt-0.5 flex items-center justify-center" style={{ background: 'transparent' }}>
                                          <div className="w-[11.25px] h-[11.25px]" style={{ background: '#09244B' }} />
                                        </div>
                                        <span className="text-[13px] font-light text-black" style={{ fontFamily: 'Poppins', fontWeight: 275 }}>
                                          {rec}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row: Confidence, Anxiety, Practice vs Real - Full width under everything */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                            {/* Confidence Trends */}
                            <div className="bg-white rounded-[15px] p-4" style={{ minHeight: '300px' }}>
                              <h3 className="text-[20px] font-light text-black mb-3" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                                Confidence Levels Over Time
                              </h3>
                              {confidenceChartData.length > 0 ? (
                                <>
                                  <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={confidenceChartData} margin={{ left: 10, right: 10 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
                                      <XAxis dataKey="period" tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }} />
                                      <YAxis 
                                        domain={[0, 100]} 
                                        tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                                        label={{ value: 'Confidence Level', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 } }}
                                      />
                                      <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
                                      <Area
                                        type="monotone"
                                        dataKey="confidence"
                                        stroke="#10B981"
                                        fill="#10B981"
                                        fillOpacity={0.3}
                                        name="Confidence Level"
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                  <p className="text-sm mt-2" style={{ color: '#737373', fontFamily: 'Poppins' }}>
                                    Track your confidence levels before interviews (0-100 scale)
                                  </p>
                                </>
                              ) : (
                                <div className="h-[200px] flex items-center justify-center" style={{ color: '#737373' }}>
                                  <p style={{ fontFamily: 'Poppins' }}>No confidence data available yet</p>
                                </div>
                              )}
                            </div>

                            {/* Anxiety Progress */}
                            <div className="bg-white rounded-[15px] p-4" style={{ minHeight: '300px' }}>
                              <h3 className="text-[20px] font-light text-black mb-3" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                                Anxiety Management Progress
                              </h3>
                              {anxietyChartData.length > 0 ? (
                                <>
                                  <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={anxietyChartData} margin={{ left: 10, right: 10 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
                                      <XAxis dataKey="period" tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }} />
                                      <YAxis 
                                        domain={[0, 100]} 
                                        tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                                        label={{ value: 'Anxiety Level', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 } }}
                                      />
                                      <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
                                      <Area
                                        type="monotone"
                                        dataKey="anxiety"
                                        stroke="#EF4444"
                                        fill="#EF4444"
                                        fillOpacity={0.3}
                                        name="Anxiety Level"
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                  <p className="text-sm mt-2" style={{ color: '#737373', fontFamily: 'Poppins' }}>
                                    Monitor anxiety levels before interviews (0-100 scale, lower is better)
                                  </p>
                                </>
                              ) : (
                                <div className="h-[200px] flex items-center justify-center" style={{ color: '#737373' }}>
                                  <p style={{ fontFamily: 'Poppins' }}>No anxiety data available yet</p>
                                </div>
                              )}
                            </div>

                            {/* Practice vs Real Comparison */}
                            <div className="bg-white rounded-[15px] p-4" style={{ minHeight: '280px' }}>
                              <h3 className="text-[20px] font-light text-black mb-3" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                                Practice vs Real Interview Comparison
                              </h3>
                              {analytics.practiceVsRealComparison ? (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Practice Interviews */}
                                    <div className="border border-slate-300 rounded-lg p-3">
                                      <h4 className="font-semibold text-slate-700 mb-2" style={{ fontFamily: 'Poppins' }}>Practice Interviews</h4>
                                      <div className="space-y-2">
                                        <div>
                                          <span className="text-sm text-slate-600" style={{ fontFamily: 'Poppins' }}>Conversion Rate: </span>
                                          <span className="font-bold text-slate-900" style={{ fontFamily: 'Poppins' }}>
                                            {analytics.practiceVsRealComparison.practice.conversionRate.toFixed(1)}%
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-sm text-slate-600" style={{ fontFamily: 'Poppins' }}>Completed: </span>
                                          <span className="font-medium text-slate-900" style={{ fontFamily: 'Poppins' }}>
                                            {analytics.practiceVsRealComparison.practice.completed}
                                          </span>
                                        </div>
                                        {analytics.practiceVsRealComparison.practice.avgScore && (
                                          <div>
                                            <span className="text-sm text-slate-600" style={{ fontFamily: 'Poppins' }}>Avg Score: </span>
                                            <span className="font-medium text-slate-900" style={{ fontFamily: 'Poppins' }}>
                                              {analytics.practiceVsRealComparison.practice.avgScore.toFixed(1)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Real Interviews */}
                                    <div className="border border-slate-300 rounded-lg p-3">
                                      <h4 className="font-semibold text-slate-700 mb-2" style={{ fontFamily: 'Poppins' }}>Real Interviews</h4>
                                      <div className="space-y-2">
                                        <div>
                                          <span className="text-sm text-slate-600" style={{ fontFamily: 'Poppins' }}>Conversion Rate: </span>
                                          <span className="font-bold" style={{ color: '#3351FD', fontFamily: 'Poppins' }}>
                                            {analytics.practiceVsRealComparison.real.conversionRate.toFixed(1)}%
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-sm text-slate-600" style={{ fontFamily: 'Poppins' }}>Completed: </span>
                                          <span className="font-medium text-slate-900" style={{ fontFamily: 'Poppins' }}>
                                            {analytics.practiceVsRealComparison.real.completed}
                                          </span>
                                        </div>
                                        {analytics.practiceVsRealComparison.real.avgScore && (
                                          <div>
                                            <span className="text-sm text-slate-600" style={{ fontFamily: 'Poppins' }}>Avg Score: </span>
                                            <span className="font-medium text-slate-900" style={{ fontFamily: 'Poppins' }}>
                                              {analytics.practiceVsRealComparison.real.avgScore.toFixed(1)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {analytics.practiceVsRealComparison.improvement !== 0 && (
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <p className="text-sm text-blue-800" style={{ fontFamily: 'Poppins' }}>
                                        {analytics.practiceVsRealComparison.improvement > 0 ? "✅" : "📉"}{" "}
                                        {analytics.practiceVsRealComparison.improvement > 0
                                          ? `You're performing ${Math.abs(analytics.practiceVsRealComparison.improvement).toFixed(1)}% better in real interviews than practice!`
                                          : `Your real interview conversion rate is ${Math.abs(analytics.practiceVsRealComparison.improvement).toFixed(1)}% lower than practice.`}
                                      </p>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-center py-8" style={{ color: '#737373' }}>
                                  <p style={{ fontFamily: 'Poppins' }}>No practice vs real comparison data available yet</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="bg-white border border-slate-300 rounded-xl p-12 text-center">
                  <Icon icon="mingcute:chart-line" width={48} className="text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">No analytics data available</p>
                  <p className="text-sm text-slate-500">
                    Complete some interviews to see your analytics
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "predictions" && (
            <div role="tabpanel" id="tabpanel-predictions" aria-labelledby="tab-predictions">
              <InterviewPredictionTab
                jobOpportunities={jobOpportunities}
                interviews={interviews}
              />
            </div>
          )}
        </div>
      </main>

      {/* Google Calendar Connection Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Icon icon="mingcute:calendar-line" width={32} className="text-blue-700" />
              <h3 className="text-xl font-semibold text-slate-900">Connect Google Calendar</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Sync your interviews with Google Calendar to get automatic reminders and updates
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCalendarModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmConnectCalendar}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-medium transition shadow-md"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Thank You Note Modal */}
      {showCreateThankYouModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Icon icon="mingcute:mail-line" width={32} className="text-blue-700" />
                <h3 className="text-xl font-semibold text-slate-900">Create Thank You Note</h3>
              </div>
              <button
                onClick={() => {
                  setShowCreateThankYouModal(false);
                  setSelectedInterviewForThankYou("");
                  setThankYouNoteStyle("standard");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Interview Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Interview <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedInterviewForThankYou}
                  onChange={(e) => setSelectedInterviewForThankYou(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select an interview...</option>
                  {interviews
                    .filter((interview) => interview.status === "completed" || interview.outcome || interview.scheduledAt)
                    .map((interview) => (
                      <option key={interview.id} value={interview.id}>
                        {interview.title || interview.company || "Interview"} - {interview.company || "Company"} ({formatDate(interview.scheduledAt || interview.createdAt)})
                      </option>
                    ))}
                </select>
                {interviews.filter((interview) => interview.status === "completed" || interview.outcome || interview.scheduledAt).length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">No interviews available. Complete an interview first.</p>
                )}
              </div>

              {/* Note Style */}
              <div>
                <label htmlFor="note-style-select" className="block text-sm font-medium text-slate-700 mb-2">
                  Note Style <span className="text-red-500">*</span>
                </label>
                <select
                  id="note-style-select"
                  value={thankYouNoteStyle}
                  onChange={(e) => setThankYouNoteStyle(e.target.value as "standard" | "enthusiastic" | "concise")}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  required
                  aria-required="true"
                >
                  <option value="standard">Standard</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="concise">Concise</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {thankYouNoteStyle === "standard" && "Professional and balanced tone"}
                  {thankYouNoteStyle === "enthusiastic" && "Energetic and positive tone"}
                  {thankYouNoteStyle === "concise" && "Brief and to the point"}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateThankYouModal(false);
                  setSelectedInterviewForThankYou("");
                  setThankYouNoteStyle("standard");
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateThankYouNote}
                disabled={loadingThankYou || !selectedInterviewForThankYou}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-medium transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingThankYou ? "Generating..." : "Generate Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Follow-up Modal */}
      {showCreateFollowUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Icon icon="mingcute:task-line" width={32} className="text-blue-700" />
                <h3 className="text-xl font-semibold text-slate-900">Create Follow-up Action</h3>
              </div>
              <button
                onClick={() => {
                  setShowCreateFollowUpModal(false);
                  setNewFollowUpData({
                    interviewId: "",
                    actionType: "other",
                    dueDate: "",
                    notes: "",
                  });
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Interview Selection */}
              <div>
                <label htmlFor="follow-up-interview-select" className="block text-sm font-medium text-slate-700 mb-2">
                  Interview <span className="text-red-500">*</span>
                </label>
                <select
                  id="follow-up-interview-select"
                  value={newFollowUpData.interviewId}
                  onChange={(e) =>
                    setNewFollowUpData({ ...newFollowUpData, interviewId: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  required
                  aria-required="true"
                >
                  <option value="">Select an interview...</option>
                  {interviews.map((interview) => (
                    <option key={interview.id} value={interview.id}>
                      {interview.title || interview.company || "Interview"} - {interview.company || "Company"} ({formatDate(interview.scheduledAt || interview.createdAt)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Type */}
              <div>
                <label htmlFor="action-type-select" className="block text-sm font-medium text-slate-700 mb-2">
                  Action Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="action-type-select"
                  value={newFollowUpData.actionType}
                  onChange={(e) =>
                    setNewFollowUpData({ ...newFollowUpData, actionType: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  required
                  aria-required="true"
                >
                  <option value="thank_you_note">Thank You Note</option>
                  <option value="follow_up_email">Follow-up Email</option>
                  <option value="status_inquiry">Status Inquiry</option>
                  <option value="references_sent">References Sent</option>
                  <option value="portfolio_sent">Portfolio Sent</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={newFollowUpData.dueDate}
                  onChange={(e) =>
                    setNewFollowUpData({ ...newFollowUpData, dueDate: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={newFollowUpData.notes}
                  onChange={(e) =>
                    setNewFollowUpData({ ...newFollowUpData, notes: e.target.value })
                  }
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes or reminders about this follow-up..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateFollowUpModal(false);
                  setNewFollowUpData({
                    interviewId: "",
                    actionType: "other",
                    dueDate: "",
                    notes: "",
                  });
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFollowUp}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-medium transition shadow-md"
              >
                Create Follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

