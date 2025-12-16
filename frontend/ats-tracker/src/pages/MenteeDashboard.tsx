import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MenteeDashboard() {
  const navigate = useNavigate();
  const [mentor, setMentor] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [mentorActivityFeed, setMentorActivityFeed] = useState<any[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "feedback" | "tasks" | "progressSharing" | "mockInterviews"
  >("overview");
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const [subtaskStatuses, setSubtaskStatuses] = useState<
    Record<string, Record<number, boolean>>
  >({});
  const [progressReport, setProgressReport] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("week");
  const [generateAI, setGenerateAI] = useState(true);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedSavedReport, setSelectedSavedReport] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [reportComments, setReportComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [mockInterviewsWithComments, setMockInterviewsWithComments] = useState<
    any[]
  >([]);
  const [isLoadingMockInterviews, setIsLoadingMockInterviews] = useState(false);
  const [selectedMockInterview, setSelectedMockInterview] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchMentorActivityFeed();
    if (activeTab === "progressSharing") {
      fetchSavedReports();
    }
  }, []);

  useEffect(() => {
    if (activeTab === "progressSharing") {
      fetchSavedReports();
    }
    if (activeTab === "mockInterviews") {
      fetchMockInterviewsWithComments();
    }
  }, [activeTab]);

  const fetchMentorActivityFeed = async () => {
    try {
      setIsLoadingFeed(true);
      const response = await api.getMentorActivityFeed();
      if (response.ok && response.data) {
        setMentorActivityFeed(response.data.feed || []);
      }
    } catch (error) {
      console.error("Failed to fetch mentor activity feed:", error);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [
        mentorResponse,
        progressResponse,
        feedbackResponse,
        tasksResponse,
      ] = await Promise.all([
        api.getMentor(),
        api.getOwnProgress(),
        api.getMenteeFeedback(),
        api.getUserTasks(),
      ]);

      if (mentorResponse.ok && mentorResponse.data) {
        setMentor(mentorResponse.data.mentor);
      }

      if (progressResponse.ok && progressResponse.data) {
        setProgress(progressResponse.data.progress);
      }

      if (feedbackResponse.ok && feedbackResponse.data) {
        setFeedback(feedbackResponse.data.feedback || []);
      }

      if (tasksResponse.ok && tasksResponse.data) {
        setTasks(tasksResponse.data.tasks || []);
      }

      // Refresh activity feed when data changes
      await fetchMentorActivityFeed();
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // Show notification toast
  const showNotification = (
    type: "success" | "error" | "info",
    message: string
  ) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Helper to clean markdown code blocks and extract text
  const cleanMarkdownText = (
    text: string | null | undefined
  ): string | null => {
    if (!text) return null;
    let cleaned = String(text);

    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    cleaned = cleaned.replace(/```markdown\n?/g, "").replace(/```text\n?/g, "");

    // Remove JSON wrapper if the entire text is a JSON object string
    if (cleaned.trim().startsWith("{") && cleaned.trim().endsWith("}")) {
      try {
        const parsed = JSON.parse(cleaned);
        // If it's an object with text fields, extract them
        if (typeof parsed === "object" && parsed !== null) {
          if (parsed.summary) return String(parsed.summary);
          if (parsed.text) return String(parsed.text);
          if (parsed.content) return String(parsed.content);
        }
      } catch (e) {
        // Not valid JSON, continue with original text
      }
    }

    return cleaned.trim();
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  const fetchProgressReport = async () => {
    try {
      setIsLoadingReport(true);
      const response = await api.generateProgressReport(
        reportPeriod,
        generateAI
      );
      if (response.ok && response.data) {
        const report = response.data.report;
        // Parse AI summary if it's a string (JSON)
        if (report.aiSummary && typeof report.aiSummary === "string") {
          try {
            report.aiSummary = JSON.parse(report.aiSummary);
          } catch (e) {
            // If parsing fails, treat as plain text
            report.aiSummary = { summary: report.aiSummary };
          }
        }
        setProgressReport(report);
      }
    } catch (error) {
      console.error("Failed to fetch progress report:", error);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const fetchReportComments = async (reportId: string) => {
    try {
      setIsLoadingComments(true);
      const response = await api.getReportComments(reportId);
      if (response.ok && response.data) {
        setReportComments(response.data.comments || []);
      }
    } catch (error) {
      console.error("Failed to fetch report comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleViewSavedReport = async (report: any) => {
    // Deep clone to avoid mutating the original
    const reportCopy = JSON.parse(JSON.stringify(report));

    // Parse AI summary if needed - handle multiple formats
    if (reportCopy.reportData?.aiSummary) {
      let aiSummary = reportCopy.reportData.aiSummary;

      // If it's a string, try to parse it (could be JSON string)
      if (typeof aiSummary === "string") {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(aiSummary);
          // If parsing succeeds and gives us an object, use it
          if (typeof parsed === "object" && parsed !== null) {
            aiSummary = parsed;
          } else {
            // If it's a string after parsing, wrap it
            aiSummary = { summary: parsed };
          }
        } catch (e) {
          // If parsing fails, treat as plain text summary
          aiSummary = { summary: aiSummary };
        }
      }

      // Clean up the aiSummary object - ensure all text fields are strings
      if (typeof aiSummary === "object" && aiSummary !== null) {
        const cleaned: any = {};
        Object.keys(aiSummary).forEach((key) => {
          const value = aiSummary[key];
          if (value !== null && value !== undefined) {
            // If it's already a string, use it
            if (typeof value === "string") {
              cleaned[key] = value;
            }
            // If it's an object, try to extract text or stringify
            else if (typeof value === "object") {
              if (value.text) cleaned[key] = String(value.text);
              else if (value.content) cleaned[key] = String(value.content);
              else cleaned[key] = JSON.stringify(value);
            }
            // Otherwise convert to string
            else {
              cleaned[key] = String(value);
            }
          }
        });
        aiSummary = cleaned;
      }

      reportCopy.reportData.aiSummary = aiSummary;
    }

    setSelectedSavedReport(reportCopy);
    setShowReportModal(true);
    // Fetch comments for this report
    await fetchReportComments(report.id);
  };

  const fetchSavedReports = async () => {
    try {
      const response = await api.getUserProgressReports();
      if (response.ok && response.data) {
        setSavedReports(response.data.reports || []);
      }
    } catch (error) {
      console.error("Failed to fetch saved reports:", error);
    }
  };

  const fetchMockInterviewsWithComments = async () => {
    try {
      setIsLoadingMockInterviews(true);
      // Clear selected interview when fetching new list
      setSelectedMockInterview(null);
      const response = await api.getUserMockInterviewsWithComments();
      if (response.ok && response.data) {
        const sessions = response.data.sessions || [];
        setMockInterviewsWithComments(sessions);
      } else {
        setMockInterviewsWithComments([]);
      }
    } catch (error) {
      console.error("Failed to fetch mock interviews:", error);
      setMockInterviewsWithComments([]);
    } finally {
      setIsLoadingMockInterviews(false);
    }
  };

  const fetchMockInterviewDetails = async (sessionId: string) => {
    try {
      const response = await api.getMockInterviewSession(sessionId);
      if (response.ok && response.data) {
        const session = response.data.session;
        // Get comments for this session
        const commentsResponse = await api.getMockInterviewComments(sessionId);
        if (commentsResponse.ok && commentsResponse.data) {
          session.comments = commentsResponse.data.comments || [];
        }
        setSelectedMockInterview(session);
      }
    } catch (error) {
      console.error("Failed to fetch mock interview details:", error);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await fetchProgressReport();
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSaveReport = async () => {
    if (!progressReport) return;

    setIsSavingReport(true);
    try {
      const response = await api.saveProgressReport(progressReport, []);
      if (response.ok) {
        showNotification("success", "Progress report saved successfully!");
        fetchSavedReports();
      } else {
        showNotification("error", "Failed to save progress report");
      }
    } catch (error) {
      console.error("Failed to save report:", error);
      alert("Failed to save progress report");
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleShareWithMentor = async (reportId?: string) => {
    if (!mentor) {
      showNotification(
        "info",
        "No mentor found. Please ensure you have a mentor assigned."
      );
      return;
    }

    // The mentor object uses mentorId, not id
    const mentorId = mentor.mentorId || mentor.id;
    if (!mentorId) {
      console.error("Mentor object:", mentor);
      showNotification("error", "Unable to identify mentor. Please try again.");
      return;
    }

    setIsSharing(true);
    try {
      let targetReportId: string;

      // If reportId is provided, share that saved report
      if (reportId) {
        targetReportId = reportId;
        console.log(
          "Sharing saved report:",
          targetReportId,
          "with mentor:",
          mentorId
        );
        const shareResponse = await api.shareReportWithMentor(
          targetReportId,
          mentorId
        );
        if (!shareResponse.ok) {
          console.error("Share response:", shareResponse);
          showNotification(
            "error",
            `Failed to share report with mentor: ${
              shareResponse.error || "Unknown error"
            }`
          );
          return;
        }
      } else if (progressReport) {
        // Share the currently generated report
        const savedReport = savedReports.find(
          (r) =>
            r.periodStart === progressReport.periodStart &&
            r.periodEnd === progressReport.periodEnd
        );

        if (savedReport) {
          targetReportId = savedReport.id;
          console.log(
            "Sharing existing report:",
            targetReportId,
            "with mentor:",
            mentorId
          );
          const shareResponse = await api.shareReportWithMentor(
            targetReportId,
            mentorId
          );
          if (!shareResponse.ok) {
            console.error("Share response:", shareResponse);
            showNotification(
              "error",
              `Failed to share report with mentor: ${
                shareResponse.error || "Unknown error"
              }`
            );
            return;
          }
        } else {
          console.log("Saving and sharing new report with mentor:", mentorId);
          const saveResponse = await api.saveProgressReport(progressReport, [
            mentorId,
          ]);
          if (!saveResponse.ok || !saveResponse.data) {
            console.error("Save response:", saveResponse);
            showNotification(
              "error",
              `Failed to save and share report: ${
                saveResponse.error || "Unknown error"
              }`
            );
            return;
          }
          targetReportId = saveResponse.data.report.id;
        }
      } else {
        showNotification(
          "info",
          "Please generate a progress report first or select a saved report to share."
        );
        return;
      }

      showNotification(
        "success",
        "Progress report shared with mentor successfully!"
      );
      setShowShareModal(false);
      fetchSavedReports();
    } catch (error: any) {
      console.error("Error sharing report:", error);
      showNotification(
        "error",
        `Failed to share report with mentor: ${
          error?.message || "Unknown error"
        }`
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareSavedReport = async (report: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the report modal
    await handleShareWithMentor(report.id);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      Applied: "bg-blue-100 text-blue-800",
      Interview: "bg-purple-100 text-purple-800",
      Offer: "bg-green-100 text-green-800",
      Rejected: "bg-red-100 text-red-800",
      scheduled: "bg-blue-100 text-blue-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getFeedbackTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      general: "mingcute:message-line",
      resume: "mingcute:file-line",
      interview: "mingcute:calendar-line",
      application: "mingcute:briefcase-line",
      skill: "mingcute:star-line",
    };
    return icons[type] || "mingcute:message-line";
  };

  // Get icon for milestone type
  const getMilestoneIcon = (milestone: any) => {
    const type = milestone.milestone_type || milestone.type || "";
    const title = milestone.milestone_title || milestone.title || "";

    // Type-specific icons
    if (
      type.includes("application") ||
      title.toLowerCase().includes("application")
    ) {
      return "mingcute:file-line";
    }
    if (
      type.includes("interview") ||
      title.toLowerCase().includes("interview")
    ) {
      return "mingcute:calendar-line";
    }
    if (type.includes("offer") || title.toLowerCase().includes("offer")) {
      return "mingcute:gift-line";
    }
    if (type.includes("resume") || title.toLowerCase().includes("resume")) {
      // Check for "optimized" specifically
      if (
        type.includes("optimized") ||
        title.toLowerCase().includes("optimized")
      ) {
        return "mingcute:magic-line";
      }
      return "mingcute:file-document-line";
    }
    if (
      type.includes("cover_letter") ||
      title.toLowerCase().includes("cover letter")
    ) {
      return "mingcute:mail-line";
    }
    if (type.includes("network") || title.toLowerCase().includes("network")) {
      return "mingcute:user-3-line";
    }
    if (
      type.includes("skill") ||
      type.includes("certification") ||
      title.toLowerCase().includes("skill") ||
      title.toLowerCase().includes("certification")
    ) {
      return "mingcute:certificate-line";
    }
    if (
      type.includes("phone_screen") ||
      title.toLowerCase().includes("phone screen")
    ) {
      return "mingcute:phone-line";
    }
    if (
      type.includes("technical") ||
      title.toLowerCase().includes("technical")
    ) {
      return "mingcute:code-line";
    }

    // Default trophy icon
    return "mingcute:trophy-line";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon
          icon="mingcute:loading-line"
          width={48}
          className="animate-spin text-blue-700"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[110] ${
            notification.type === "success"
              ? "bg-green-500"
              : notification.type === "error"
              ? "bg-red-500"
              : "bg-blue-500"
          } text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md animate-slide-in backdrop-blur-sm`}
        >
          <Icon
            icon={
              notification.type === "success"
                ? "mingcute:check-circle-line"
                : notification.type === "error"
                ? "mingcute:close-circle-line"
                : "mingcute:information-line"
            }
            width={24}
            className="flex-shrink-0"
          />
          <span className="flex-1 font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
          >
            <Icon icon="mingcute:close-line" width={20} />
          </button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Mentee Dashboard
        </h1>
        <p className="text-slate-600">
          Track your progress and connect with your mentor
        </p>
      </div>

      {/* Mentor Information Card */}
      {mentor ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {mentor.fullName?.charAt(0)?.toUpperCase() ||
                  mentor.email?.charAt(0)?.toUpperCase() ||
                  "M"}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-1">
                  {mentor.fullName || mentor.email}
                </h2>
                <p className="text-slate-600 text-sm mb-2">{mentor.email}</p>
                {mentor.bio && (
                  <p className="text-slate-700 text-sm mb-3">{mentor.bio}</p>
                )}
                <div className="flex items-center space-x-4 text-sm">
                  {mentor.linkedinUrl && (
                    <a
                      href={mentor.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-700"
                    >
                      <Icon
                        icon="mingcute:linkedin-line"
                        width={18}
                        className="mr-1"
                      />
                      LinkedIn
                    </a>
                  )}
                  {mentor.githubUrl && (
                    <a
                      href={mentor.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-slate-700 hover:text-slate-900"
                    >
                      <Icon
                        icon="mingcute:github-line"
                        width={18}
                        className="mr-1"
                      />
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500 mb-1">Mentor Since</div>
              <div className="text-sm font-medium text-slate-700">
                {formatDate(mentor.acceptedAt)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 mb-6">
          <div className="text-center">
            <Icon
              icon="mingcute:user-star-line"
              width={48}
              className="mx-auto text-slate-300 mb-3"
            />
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              No Mentor Assigned
            </h2>
            <p className="text-slate-600 text-sm mb-4">
              Mentor relationships are created when you join a team with
              mentors, or when mentors join your team.
            </p>
            <button
              onClick={() => navigate(ROUTES.TEAMS)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors inline-flex items-center"
            >
              <Icon icon="mingcute:team-line" width={18} className="mr-2" />
              Go to Teams
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: "overview", label: "Overview", icon: "mingcute:home-line" },
            {
              id: "feedback",
              label: "Feedback",
              icon: "mingcute:message-line",
            },
            { id: "tasks", label: "Tasks", icon: null },
            {
              id: "progressSharing",
              label: "Progress Sharing",
              icon: "mingcute:chart-line",
            },
            {
              id: "mockInterviews",
              label: "Mock Interviews",
              icon: null,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm bg-transparent hover:bg-transparent focus:bg-transparent ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-700"
                  : "border-transparent text-slate-600"
              }`}
              style={{ 
                outline: 'none', 
                boxShadow: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderRadius: '0'
              }}
            >
              {tab.icon && <Icon icon={tab.icon} width={20} />}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Progress Stats */}
          {progress && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Job Applications */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-slate-600">
                    Job Applications
                  </h2>
                  <Icon
                    icon="mingcute:briefcase-line"
                    width={24}
                    className="text-blue-700"
                  />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {progress.jobSearch?.applied_count || 0}
                </div>
                <div className="text-sm text-slate-500">
                  {progress.jobSearch?.total_jobs || 0} total jobs tracked
                </div>
              </div>

              {/* Tasks */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-slate-600">Tasks</h2>
                  <Icon
                    icon="mingcute:task-line"
                    width={24}
                    className="text-green-500"
                  />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {progress.tasks?.completed_tasks || 0}/
                  {progress.tasks?.total_tasks || 0}
                </div>
                <div className="text-sm text-slate-500">
                  {progress.tasks?.pending_tasks || 0} pending
                </div>
              </div>

              {/* Engagement Score */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-slate-600">
                    Engagement
                  </h2>
                  <Icon
                    icon="mingcute:fire-line"
                    width={24}
                    className="text-orange-500"
                  />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {progress.engagementScore || 0}%
                </div>
                <div className="text-sm text-slate-500">Last 7 days</div>
              </div>

              {/* Feedback Received */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-slate-600">
                    Feedback
                  </h2>
                  <Icon
                    icon="mingcute:chat-3-line"
                    width={24}
                    height={24}
                    className="text-purple-500"
                  />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {feedback.length}
                </div>
                <div className="text-sm text-slate-500">From your mentor</div>
              </div>
            </div>
          )}

          {/* Mentor Activity Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">
                    Mentor Activity
                  </h2>
                  <p className="text-sm text-slate-500">
                    See what your mentor has been up to
                  </p>
                </div>
                <button
                  onClick={fetchMentorActivityFeed}
                  className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  title="Refresh feed"
                >
                  <Icon icon="mingcute:refresh-line" width={18} />
                </button>
              </div>
            </div>
            <div className="p-6">
              {isLoadingFeed ? (
                <div className="flex items-center justify-center py-12">
                  <Icon
                    icon="mingcute:loading-line"
                    width={32}
                    className="animate-spin text-blue-700"
                  />
                  <span className="ml-3 text-slate-600">
                    Loading activity feed...
                  </span>
                </div>
              ) : mentorActivityFeed.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <Icon
                      icon="mingcute:activity-line"
                      width={32}
                      className="text-slate-400"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    No Activity Yet
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Your mentor hasn't taken any actions yet. Check back soon!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mentorActivityFeed.map((item: any) => {
                    const getTaskTypeIcon = (taskType: string) => {
                      switch (taskType) {
                        case "interview_prep":
                          return "mingcute:chat-3-line";
                        case "resume_review":
                          return "mingcute:file-text-line";
                        case "resume_update":
                          return "mingcute:edit-line";
                        case "cover_letter_review":
                          return "mingcute:mail-line";
                        case "application":
                          return "mingcute:briefcase-line";
                        case "skill_development":
                          return "mingcute:book-line";
                        case "networking":
                          return "mingcute:user-group-line";
                        case "other":
                          return "mingcute:more-2-line";
                        default:
                          return "mingcute:task-line";
                      }
                    };

                    const getActivityIcon = (type: string, metadata?: any) => {
                      // For task_assigned, use the specific task type icon if available
                      if (type === "task_assigned" && metadata?.taskType) {
                        return getTaskTypeIcon(metadata.taskType);
                      }

                      const icons: Record<string, string> = {
                        task_assigned: "mingcute:task-line",
                        feedback_provided: "mingcute:feedback-line",
                        comment_added: "mingcute:message-3-line",
                        message_sent: "mingcute:chat-3-line",
                        document_shared: "mingcute:share-forward-line",
                      };
                      return icons[type] || "mingcute:activity-line";
                    };

                    const getActivityColor = (type: string) => {
                      const colors: Record<string, string> = {
                        task_assigned: "text-purple-600 bg-purple-100",
                        feedback_provided: "text-blue-600 bg-blue-100",
                        comment_added: "text-indigo-600 bg-indigo-100",
                        message_sent: "text-green-600 bg-green-100",
                        document_shared: "text-amber-600 bg-amber-100",
                      };
                      return colors[type] || "text-slate-600 bg-slate-100";
                    };

                    const formatActivityTitle = (item: any) => {
                      switch (item.type) {
                        case "task_assigned":
                          return `Assigned task: ${item.title}`;
                        case "feedback_provided":
                          return `Provided ${item.title}`;
                        case "comment_added":
                          return item.metadata?.documentName
                            ? `Commented on ${item.metadata.documentType.replace(
                                /_/g,
                                " "
                              )}: ${item.metadata.documentName}`
                            : item.title;
                        case "message_sent":
                          return item.title;
                        default:
                          return item.title;
                      }
                    };

                    // Get mentor profile picture - check item first, then mentor object
                    const mentorProfilePicture =
                      item.mentorProfilePicture ||
                      mentor?.profilePicture ||
                      null;
                    const defaultAvatar =
                      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
                      >
                        {/* Profile Picture or Person Icon */}
                        {mentorProfilePicture &&
                        !mentorProfilePicture.includes(
                          "blank-profile-picture"
                        ) ? (
                          <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200">
                            <img
                              src={mentorProfilePicture}
                              alt={item.mentorName || "Mentor"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = defaultAvatar;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center border-2 border-slate-300">
                            <Icon
                              icon="mingcute:user-line"
                              width={20}
                              className="text-slate-600"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <div className="font-semibold text-slate-900">
                                {formatActivityTitle(item)}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                by{" "}
                                {item.mentorName ||
                                  mentor?.fullName ||
                                  mentor?.email ||
                                  "your mentor"}
                              </div>
                            </div>
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {formatDateTime(item.createdAt)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-sm text-slate-600 mt-2 line-clamp-3 whitespace-pre-wrap">
                              {item.description}
                            </p>
                          )}
                          {item.metadata?.dueDate && (
                            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                              <Icon icon="mingcute:calendar-line" width={14} />
                              Due: {formatDate(item.metadata.dueDate)}
                            </div>
                          )}
                          {item.metadata?.documentSection && (
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <Icon icon="mingcute:file-line" width={14} />
                              Section: {item.metadata.documentSection}
                            </div>
                          )}
                          {item.metadata?.status && (
                            <div className="mt-2">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  item.metadata.status
                                )}`}
                              >
                                {item.metadata.status.replace("_", " ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => navigate(ROUTES.JOB_OPPORTUNITIES)}
                className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                <Icon
                  icon="mingcute:add-line"
                  width={24}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium text-slate-900">Add Job</div>
                  <div className="text-xs text-slate-600">
                    Track a new opportunity
                  </div>
                </div>
              </button>
              <button
                onClick={() => navigate(ROUTES.INTERVIEW_PREPARATION)}
                className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
              >
                <Icon
                  icon="mingcute:book-line"
                  width={24}
                  className="text-purple-600"
                />
                <div>
                  <div className="font-medium text-slate-900">Prepare</div>
                  <div className="text-xs text-slate-600">Interview prep</div>
                </div>
              </button>
              <button
                onClick={() => navigate(ROUTES.RESUMES)}
                className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
              >
                <Icon
                  icon="mingcute:file-line"
                  width={24}
                  className="text-green-600"
                />
                <div>
                  <div className="font-medium text-slate-900">Resume</div>
                  <div className="text-xs text-slate-600">Update resume</div>
                </div>
              </button>
              <button
                onClick={() => navigate(ROUTES.DOCUMENT_REVIEWS)}
                className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left"
              >
                <Icon
                  icon="mingcute:edit-line"
                  width={24}
                  height={24}
                  className="text-orange-600"
                />
                <div>
                  <div className="font-medium text-slate-900">Review</div>
                  <div className="text-xs text-slate-600">Request review</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === "feedback" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                Feedback
              </h2>
              <p className="text-sm text-slate-500">
                Feedback and recommendations from your mentor
              </p>
            </div>
          </div>
          {feedback.length > 0 ? (
            feedback.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      <Icon
                        icon={getFeedbackTypeIcon(item.feedbackType)}
                        width={20}
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {item.mentor?.fullName ||
                          item.mentor?.email ||
                          "Mentor"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDateTime(item.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                    {item.feedbackType}
                  </span>
                </div>
                <div className="mb-3">
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {item.feedbackContent}
                  </p>
                </div>
                {item.recommendations && (
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="text-sm font-semibold text-blue-900 mb-1">
                      Recommendations
                    </div>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">
                      {item.recommendations}
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-12 text-center">
              <Icon
                icon="mingcute:message-line"
                width={48}
                className="mx-auto text-slate-300 mb-3"
              />
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                No Feedback Yet
              </h3>
              <p className="text-slate-600 text-sm">
                Your mentor hasn't provided feedback yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                My Tasks
              </h2>
              <p className="text-sm text-slate-500">
                Tasks assigned by your mentor
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="Refresh tasks"
            >
              <Icon icon="mingcute:refresh-line" width={18} />
            </button>
          </div>
          {tasks.length > 0 ? (
            tasks.map((task) => {
              const isExpanded = expandedTasks.has(task.id);
              const isUpdating = updatingTasks.has(task.id);

              const getTaskTypeIcon = (taskType: string) => {
                switch (taskType) {
                  case "interview_prep":
                    return "mingcute:chat-3-line";
                  case "resume_review":
                    return "mingcute:file-text-line";
                  case "resume_update":
                    return "mingcute:edit-line";
                  case "cover_letter_review":
                    return "mingcute:mail-line";
                  case "application":
                    return "mingcute:briefcase-line";
                  case "skill_development":
                    return "mingcute:book-line";
                  case "networking":
                    return "mingcute:user-group-line";
                  case "other":
                    return "mingcute:more-2-line";
                  default:
                    return "mingcute:task-line";
                }
              };

              const taskTitle = task.task_title || task.taskTitle;
              const taskDescription =
                task.task_description || task.taskDescription;
              const taskType = task.task_type || task.taskType;
              const dueDate = task.due_date || task.dueDate;
              const createdAt = task.created_at || task.createdAt;
              const taskData = task.task_data || task.taskData || {};
              const subtasks = Array.isArray(taskData.subtasks)
                ? taskData.subtasks
                : [];
              const linkedJobId = taskData.linkedJobId;
              const linkedResumeId = taskData.linkedResumeId;
              const linkedCoverLetterId = taskData.linkedCoverLetterId;
              const taskSubtaskStatuses = subtaskStatuses[task.id] || {};
              const isOverdue =
                dueDate &&
                new Date(dueDate) < new Date() &&
                task.status !== "completed" &&
                task.status !== "cancelled";
              const isCompleted = task.status === "completed";

              const handleToggleComplete = async () => {
                if (isUpdating) return;
                try {
                  setUpdatingTasks((prev) => new Set(prev).add(task.id));
                  const newStatus = isCompleted ? "pending" : "completed";
                  await api.updateTaskStatus(task.id, newStatus);
                  await fetchDashboardData();
                } catch (error) {
                  console.error("Failed to update task:", error);
                  showNotification(
                    "error",
                    "Failed to update task. Please try again."
                  );
                } finally {
                  setUpdatingTasks((prev) => {
                    const next = new Set(prev);
                    next.delete(task.id);
                    return next;
                  });
                }
              };

              const toggleExpand = () => {
                setExpandedTasks((prev) => {
                  const next = new Set(prev);
                  if (next.has(task.id)) {
                    next.delete(task.id);
                  } else {
                    next.add(task.id);
                  }
                  return next;
                });
              };

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                    isOverdue
                      ? "border-red-300 bg-red-50/30"
                      : isCompleted
                      ? "border-green-200 bg-green-50/30"
                      : "border-slate-200 hover:border-slate-300 shadow-sm"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <div className="flex-shrink-0 pt-1">
                        <button
                          onClick={handleToggleComplete}
                          disabled={isUpdating}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            isCompleted
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-slate-300 hover:border-green-500"
                          } ${
                            isUpdating
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                        >
                          {isCompleted && (
                            <Icon icon="mingcute:check-line" width={16} />
                          )}
                        </button>
                      </div>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div className="cursor-pointer" onClick={toggleExpand}>
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-start gap-3 flex-1">
                              <div
                                className={`p-2 rounded-lg flex-shrink-0 ${
                                  isCompleted
                                    ? "bg-green-100"
                                    : task.status === "in_progress"
                                    ? "bg-blue-100"
                                    : "bg-amber-100"
                                }`}
                              >
                                <Icon
                                  icon={getTaskTypeIcon(taskType)}
                                  width={24}
                                  className={
                                    isCompleted
                                      ? "text-green-600"
                                      : task.status === "in_progress"
                                      ? "text-blue-600"
                                      : "text-amber-600"
                                  }
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3
                                    className={`text-lg font-bold ${
                                      isCompleted
                                        ? "line-through text-slate-500"
                                        : "text-slate-900"
                                    }`}
                                  >
                                    {taskTitle}
                                  </h3>
                                  <span
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                      task.status
                                    )}`}
                                  >
                                    {task.status?.replace("_", " ")}
                                  </span>
                                  {isOverdue && !isCompleted && (
                                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                      Overdue
                                    </span>
                                  )}
                                </div>
                                {!isExpanded && taskDescription && (
                                  <p className="text-sm text-slate-600 line-clamp-2">
                                    {taskDescription}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                                  <span className="flex items-center gap-1">
                                    <Icon icon="mingcute:tag-line" width={14} />
                                    {taskType?.replace(/_/g, " ")}
                                  </span>
                                  {dueDate && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span
                                        className={`flex items-center gap-1 ${
                                          isOverdue && !isCompleted
                                            ? "text-red-600 font-medium"
                                            : ""
                                        }`}
                                      >
                                        <Icon
                                          icon="mingcute:calendar-line"
                                          width={14}
                                        />
                                        Due {formatDate(dueDate)}
                                      </span>
                                    </>
                                  )}
                                  <span className="text-slate-300">•</span>
                                  <span className="flex items-center gap-1">
                                    <Icon
                                      icon="mingcute:time-line"
                                      width={14}
                                    />
                                    Assigned {formatDate(createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Icon
                              icon={
                                isExpanded
                                  ? "mingcute:up-line"
                                  : "mingcute:down-line"
                              }
                              width={20}
                              className="text-slate-400 flex-shrink-0"
                            />
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                            {taskDescription && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                                  Description
                                </h4>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                  {taskDescription}
                                </p>
                              </div>
                            )}

                            {/* Subtasks */}
                            {subtasks.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                  Subtasks
                                </h4>
                                <div className="space-y-2">
                                  {subtasks.map(
                                    (subtask: string, index: number) => (
                                      <div
                                        key={index}
                                        className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSubtaskStatuses((prev) => ({
                                              ...prev,
                                              [task.id]: {
                                                ...(prev[task.id] || {}),
                                                [index]: !(
                                                  prev[task.id]?.[index] ||
                                                  false
                                                ),
                                              },
                                            }));
                                          }}
                                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                            taskSubtaskStatuses[index]
                                              ? "bg-green-500 border-green-500 text-white"
                                              : "border-slate-300 hover:border-green-500"
                                          }`}
                                        >
                                          {taskSubtaskStatuses[index] && (
                                            <Icon
                                              icon="mingcute:check-line"
                                              width={14}
                                            />
                                          )}
                                        </button>
                                        <span
                                          className={`text-sm flex-1 ${
                                            taskSubtaskStatuses[index]
                                              ? "line-through text-slate-400"
                                              : "text-slate-700"
                                          }`}
                                        >
                                          {subtask}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Linked Resources */}
                            {(linkedJobId ||
                              linkedResumeId ||
                              linkedCoverLetterId) && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                  Linked Resources
                                </h4>
                                <div className="space-y-2">
                                  {linkedJobId && (
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `${ROUTES.JOB_OPPORTUNITIES}?jobId=${linkedJobId}`
                                        )
                                      }
                                      className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition text-left"
                                    >
                                      <Icon
                                        icon="mingcute:briefcase-line"
                                        width={20}
                                        className="text-blue-600"
                                      />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-blue-900">
                                          View Job Opportunity
                                        </div>
                                        <div className="text-xs text-blue-700">
                                          Click to open linked job
                                        </div>
                                      </div>
                                      <Icon
                                        icon="mingcute:arrow-right-line"
                                        width={18}
                                        className="text-blue-600"
                                      />
                                    </button>
                                  )}
                                  {linkedResumeId && (
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `${ROUTES.RESUME_BUILDER}?id=${linkedResumeId}`
                                        )
                                      }
                                      className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition text-left"
                                    >
                                      <Icon
                                        icon="mingcute:file-text-line"
                                        width={20}
                                        className="text-green-600"
                                      />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-green-900">
                                          View Resume
                                        </div>
                                        <div className="text-xs text-green-700">
                                          Click to open linked resume
                                        </div>
                                      </div>
                                      <Icon
                                        icon="mingcute:arrow-right-line"
                                        width={18}
                                        className="text-green-600"
                                      />
                                    </button>
                                  )}
                                  {linkedCoverLetterId && (
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `${ROUTES.COVER_LETTER_BUILDER}?id=${linkedCoverLetterId}`
                                        )
                                      }
                                      className="w-full flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition text-left"
                                    >
                                      <Icon
                                        icon="mingcute:mail-line"
                                        width={20}
                                        className="text-purple-600"
                                      />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-purple-900">
                                          View Cover Letter
                                        </div>
                                        <div className="text-xs text-purple-700">
                                          Click to open linked cover letter
                                        </div>
                                      </div>
                                      <Icon
                                        icon="mingcute:arrow-right-line"
                                        width={18}
                                        className="text-purple-600"
                                      />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Assigned By Section */}
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                  {(
                                    task.assigned_by_name ||
                                    task.assignedByName ||
                                    task.assigned_by_email ||
                                    task.assignedByEmail ||
                                    "M"
                                  )
                                    ?.charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-slate-900">
                                    Assigned by{" "}
                                    {task.assigned_by_name ||
                                      task.assignedByName ||
                                      task.assigned_by_email ||
                                      task.assignedByEmail ||
                                      "Mentor"}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {task.assigned_by_role ||
                                    task.assignedByRole
                                      ? `${(
                                          task.assigned_by_role ||
                                          task.assignedByRole
                                        ).replace(/_/g, " ")} • `
                                      : ""}
                                    {formatDateTime(createdAt)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {isCompleted && task.completed_at && (
                              <div className="flex items-center gap-2 text-sm text-green-700">
                                <Icon
                                  icon="mingcute:check-circle-line"
                                  width={18}
                                />
                                <span className="font-medium">
                                  Completed on{" "}
                                  {formatDate(
                                    task.completed_at || task.completedAt
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Icon
                  icon="mingcute:task-line"
                  width={32}
                  className="text-slate-400"
                />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                No Tasks Assigned
              </h3>
              <p className="text-slate-600 text-sm">
                You don't have any tasks from your mentor yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Progress Sharing Tab */}
      {activeTab === "progressSharing" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                Progress Sharing
              </h2>
              <p className="text-slate-600 text-sm">
                Generate and share your job search progress with your mentor
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateAI}
                  onChange={(e) => setGenerateAI(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">AI Summary</span>
              </label>
              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
              >
                {isGeneratingReport ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {isLoadingReport ? (
            <div className="flex items-center justify-center py-12">
              <Icon
                icon="mingcute:loading-line"
                width={32}
                className="animate-spin text-blue-700"
              />
              <span className="ml-3 text-slate-600">
                Loading progress report...
              </span>
            </div>
          ) : progressReport ? (
            <div className="space-y-6">
              {/* AI Summary */}
              {progressReport.aiSummary &&
                (() => {
                  const aiSummary = progressReport.aiSummary;
                  const getText = (field: any) => {
                    if (!field) return null;
                    if (typeof field === "string") {
                      return cleanMarkdownText(field);
                    }
                    if (typeof field === "object" && field !== null) {
                      if (field.text)
                        return cleanMarkdownText(String(field.text));
                      if (field.content)
                        return cleanMarkdownText(String(field.content));
                      if (Array.isArray(field)) {
                        return field
                          .map((item) => cleanMarkdownText(String(item)))
                          .filter(Boolean)
                          .join("\n");
                      }
                      return cleanMarkdownText(JSON.stringify(field));
                    }
                    return cleanMarkdownText(String(field));
                  };

                  const summary = getText(aiSummary.summary);
                  const achievements = getText(aiSummary.achievements);
                  const improvements = getText(aiSummary.improvements);
                  const recommendations = getText(aiSummary.recommendations);
                  const encouragement = getText(aiSummary.encouragement);

                  return (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-blue-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Icon
                          icon="mingcute:magic-line"
                          width={24}
                          className="text-blue-600"
                        />
                        <h3 className="text-xl font-bold text-slate-900">
                          AI-Generated Summary
                        </h3>
                      </div>
                      {summary && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-slate-900 mb-2">
                            Executive Summary
                          </h4>
                          <div className="prose prose-sm max-w-none prose-slate prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {summary}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {achievements && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-green-700 mb-2">
                            Key Achievements
                          </h4>
                          <div className="prose prose-sm max-w-none prose-slate prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {achievements}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {improvements && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-orange-700 mb-2">
                            Areas for Improvement
                          </h4>
                          <div className="prose prose-sm max-w-none prose-slate prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {improvements}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {recommendations && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-blue-700 mb-2">
                            Recommendations
                          </h4>
                          <div className="prose prose-sm max-w-none prose-slate prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {recommendations}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {encouragement && (
                        <div className="bg-white/50 rounded-lg p-4">
                          <h4 className="font-semibold text-purple-700 mb-2">
                            Encouragement
                          </h4>
                          <div className="prose prose-sm max-w-none prose-slate prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {encouragement}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Applications Submitted */}
                <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-blue-200/50">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors flex items-center justify-center">
                        <Icon
                          icon="mingcute:file-line"
                          width={28}
                          className="text-blue-600"
                        />
                      </div>
                      <span className="text-4xl font-bold text-blue-700 group-hover:scale-110 transition-transform">
                        {progressReport.jobSearch?.applications_submitted || 0}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-blue-900/80 uppercase tracking-wide">
                      Applications Submitted
                    </div>
                    <div className="mt-2 h-1 bg-blue-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                        style={{ width: "100%" }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Interviews Scheduled */}
                <div className="group relative bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-green-200/50">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors flex items-center justify-center">
                        <Icon
                          icon="mingcute:calendar-line"
                          width={28}
                          className="text-green-600"
                        />
                      </div>
                      <span className="text-4xl font-bold text-green-700 group-hover:scale-110 transition-transform">
                        {progressReport.jobSearch?.interviews_scheduled || 0}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-green-900/80 uppercase tracking-wide">
                      Interviews Scheduled
                    </div>
                    <div className="mt-2 h-1 bg-green-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                        style={{ width: "100%" }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Offers Received */}
                <div className="group relative bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-purple-200/50">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                        <Icon
                          icon="mingcute:gift-line"
                          width={28}
                          className="text-purple-600"
                        />
                      </div>
                      <span className="text-4xl font-bold text-purple-700 group-hover:scale-110 transition-transform">
                        {progressReport.jobSearch?.offers_received || 0}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-purple-900/80 uppercase tracking-wide">
                      Offers Received
                    </div>
                    <div className="mt-2 h-1 bg-purple-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                        style={{ width: "100%" }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Milestones Achieved */}
                <div className="group relative bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-yellow-200/50">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-yellow-500/10 rounded-xl group-hover:bg-yellow-500/20 transition-colors">
                        <Icon
                          icon="mingcute:trophy-line"
                          width={28}
                          className="text-yellow-600"
                        />
                      </div>
                      <span className="text-4xl font-bold text-yellow-700 group-hover:scale-110 transition-transform">
                        {progressReport.milestones?.length || 0}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-yellow-900/80 uppercase tracking-wide">
                      Milestones Achieved
                    </div>
                    <div className="mt-2 h-1 bg-yellow-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full"
                        style={{ width: "100%" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock Interview Analytics */}
              {progressReport.mockInterviews && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Icon icon="mingcute:chat-3-line" width={24} />
                    Mock Interview Performance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-slate-600 mb-1">
                        Total Sessions
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {progressReport.mockInterviews.total || 0}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-slate-600 mb-1">
                        Completed
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {progressReport.mockInterviews.completed || 0}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-slate-600 mb-1">
                        Avg Confidence Score
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {progressReport.mockInterviews.avgConfidenceScore || 0}
                        /100
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Interview Success Rate */}
              {progressReport.interviewSuccess && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Icon icon="mingcute:chart-line" width={24} />
                    Interview Success Rate
                  </h3>
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {progressReport.interviewSuccess.successRate || 0}%
                      </div>
                      <div className="text-sm text-slate-600">
                        {progressReport.interviewSuccess.successfulInterviews ||
                          0}{" "}
                        successful out of{" "}
                        {progressReport.interviewSuccess.totalCompleted || 0}{" "}
                        completed interviews
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Upcoming Interviews */}
              {progressReport.upcomingInterviews &&
                progressReport.upcomingInterviews.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Icon icon="mingcute:calendar-check-line" width={24} />
                      Upcoming Interviews
                    </h3>
                    <div className="space-y-3">
                      {progressReport.upcomingInterviews.map(
                        (interview: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500"
                          >
                            <div>
                              <div className="font-semibold text-slate-900">
                                {interview.title || interview.company}
                              </div>
                              <div className="text-sm text-slate-600">
                                {new Date(
                                  interview.interview_date
                                ).toLocaleDateString()}{" "}
                                • {interview.interview_type || "Interview"}
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                              {interview.status}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Milestones */}
              {progressReport.milestones &&
                progressReport.milestones.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Icon icon="mingcute:trophy-line" width={24} />
                      Recent Milestones
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {progressReport.milestones.map(
                        (milestone: any, idx: number) => (
                          <div
                            key={idx}
                            className="group relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors flex items-center justify-center">
                                <Icon
                                  icon={getMilestoneIcon(milestone)}
                                  width={24}
                                  className="text-green-600"
                                />
                              </div>
                              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                {milestone.milestone_type
                                  ?.replace(/_/g, " ")
                                  .replace(/\b\w/g, (l: string) =>
                                    l.toUpperCase()
                                  ) || "Achievement"}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2 text-lg group-hover:text-green-700 transition-colors">
                              {milestone.milestone_title}
                            </h4>
                            {milestone.milestone_description && (
                              <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                                {milestone.milestone_description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Icon icon="mingcute:calendar-line" width={14} />
                              <span>
                                {new Date(
                                  milestone.achieved_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Icon
                                icon="mingcute:arrow-right-line"
                                width={20}
                                className="text-green-600"
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 bg-white rounded-lg shadow p-6">
                <button
                  onClick={handleSaveReport}
                  disabled={isSavingReport}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Icon icon="mingcute:save-line" width={20} />
                  {isSavingReport ? "Saving..." : "Save Report"}
                </button>
                {mentor && (
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Icon icon="mingcute:share-2-line" width={20} />
                    Share with Mentor
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Icon
                icon="mingcute:chart-line"
                width={48}
                className="mx-auto text-slate-300 mb-4"
              />
              <p className="text-slate-600">
                Click "Generate" to create your progress report
              </p>
            </div>
          )}

          {/* Saved Reports */}
          {savedReports.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Saved Reports
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedReports.map((savedReport) => (
                  <div
                    key={savedReport.id}
                    className="bg-slate-50 rounded-lg border-2 border-transparent hover:border-blue-300 transition-all overflow-hidden"
                  >
                    <div
                      onClick={() => handleViewSavedReport(savedReport)}
                      className="p-4 cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 mb-1">
                            {new Date(
                              savedReport.periodStart
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {new Date(
                              savedReport.periodEnd
                            ).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-slate-600">
                            Generated{" "}
                            {new Date(
                              savedReport.generatedAt
                            ).toLocaleDateString()}
                          </div>
                          {savedReport.reportData?.aiSummary && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                              <Icon icon="mingcute:magic-line" width={14} />
                              <span>AI Summary Included</span>
                            </div>
                          )}
                        </div>
                        <Icon
                          icon="mingcute:arrow-right-line"
                          width={20}
                          className="text-slate-400 flex-shrink-0 ml-2"
                        />
                      </div>
                    </div>
                    <div className="px-4 pb-4 flex items-center justify-between border-t border-slate-200 pt-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Icon icon="mingcute:user-group-line" width={16} />
                        <span>
                          {savedReport.sharedWith?.length || 0} shared
                        </span>
                      </div>
                      {mentor && (
                        <button
                          onClick={(e) =>
                            handleShareSavedReport(savedReport, e)
                          }
                          disabled={isSharing}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                          {isSharing ? (
                            <>
                              <Icon
                                icon="mingcute:loading-line"
                                width={16}
                                className="animate-spin"
                              />
                              <span>Sharing...</span>
                            </>
                          ) : (
                            <>
                              <Icon icon="mingcute:share-2-line" width={16} />
                              <span>Share</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved Report View Modal */}
          {showReportModal && selectedSavedReport && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      Progress Report
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {new Date(
                        selectedSavedReport.periodStart
                      ).toLocaleDateString()}{" "}
                      -{" "}
                      {new Date(
                        selectedSavedReport.periodEnd
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {mentor && (
                      <button
                        onClick={() =>
                          handleShareWithMentor(selectedSavedReport.id)
                        }
                        disabled={isSharing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSharing ? (
                          <>
                            <Icon
                              icon="mingcute:loading-line"
                              width={20}
                              className="animate-spin"
                            />
                            <span>Sharing...</span>
                          </>
                        ) : (
                          <>
                            <Icon icon="mingcute:share-2-line" width={20} />
                            <span>Share with Mentor</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowReportModal(false);
                        setSelectedSavedReport(null);
                        setReportComments([]);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg"
                    >
                      <Icon icon="mingcute:close-line" width={24} />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* AI Summary */}
                  {selectedSavedReport.reportData?.aiSummary &&
                    (() => {
                      const aiSummary =
                        selectedSavedReport.reportData.aiSummary;

                      // Helper to extract and clean text from various formats
                      const getText = (field: any): string | null => {
                        if (!field) return null;

                        let text: string | null = null;

                        if (typeof field === "string") {
                          text = cleanMarkdownText(field);
                        } else if (
                          typeof field === "object" &&
                          field !== null
                        ) {
                          // Try to extract text from object
                          if (field.text) text = String(field.text);
                          else if (field.content) text = String(field.content);
                          else if (Array.isArray(field)) {
                            text = field
                              .map((item) =>
                                typeof item === "string" ? item : String(item)
                              )
                              .join("\n");
                          } else {
                            // Try to stringify and clean
                            text = cleanMarkdownText(JSON.stringify(field));
                          }
                        } else {
                          text = cleanMarkdownText(String(field));
                        }

                        return text;
                      };

                      // Handle case where aiSummary might be a string or object
                      let summary: string | null = null;
                      let achievements: string | null = null;
                      let improvements: string | null = null;
                      let recommendations: string | null = null;
                      let encouragement: string | null = null;

                      if (typeof aiSummary === "string") {
                        // Try to parse as JSON
                        try {
                          const parsed = JSON.parse(aiSummary);
                          if (typeof parsed === "object") {
                            summary = getText(parsed.summary);
                            achievements = getText(parsed.achievements);
                            improvements = getText(parsed.improvements);
                            recommendations = getText(parsed.recommendations);
                            encouragement = getText(parsed.encouragement);
                          } else {
                            summary = aiSummary;
                          }
                        } catch (e) {
                          summary = aiSummary;
                        }
                      } else if (
                        typeof aiSummary === "object" &&
                        aiSummary !== null
                      ) {
                        summary = getText(aiSummary.summary);
                        achievements = getText(aiSummary.achievements);
                        improvements = getText(aiSummary.improvements);
                        recommendations = getText(aiSummary.recommendations);
                        encouragement = getText(aiSummary.encouragement);
                      }

                      return (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                          <div className="flex items-center gap-3 mb-4">
                            <Icon
                              icon="mingcute:magic-line"
                              width={24}
                              className="text-blue-600"
                            />
                            <h4 className="text-xl font-bold text-slate-900">
                              AI-Generated Summary
                            </h4>
                          </div>
                          {summary && (
                            <div className="mb-4">
                              <h5 className="font-semibold text-slate-900 mb-2">
                                Executive Summary
                              </h5>
                              <div className="prose prose-sm max-w-none prose-slate prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {summary}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                          {achievements && (
                            <div className="mb-4">
                              <h5 className="font-semibold text-green-700 mb-2">
                                Key Achievements
                              </h5>
                              <div className="prose prose-sm max-w-none prose-slate prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {achievements}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                          {improvements && (
                            <div className="mb-4">
                              <h5 className="font-semibold text-orange-700 mb-2">
                                Areas for Improvement
                              </h5>
                              <div className="prose prose-sm max-w-none prose-slate prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {improvements}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                          {recommendations && (
                            <div className="mb-4">
                              <h5 className="font-semibold text-blue-700 mb-2">
                                Recommendations
                              </h5>
                              <div className="prose prose-sm max-w-none prose-slate prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {recommendations}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                          {encouragement && (
                            <div className="bg-white/50 rounded-lg p-4 mt-4">
                              <h5 className="font-semibold text-purple-700 mb-2">
                                Encouragement
                              </h5>
                              <div className="prose prose-sm max-w-none prose-slate prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {encouragement}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedSavedReport.reportData?.jobSearch
                          ?.applications_submitted || 0}
                      </div>
                      <div className="text-sm text-slate-600">Applications</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedSavedReport.reportData?.jobSearch
                          ?.interviews_scheduled || 0}
                      </div>
                      <div className="text-sm text-slate-600">Interviews</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedSavedReport.reportData?.mockInterviews
                          ?.completed || 0}
                      </div>
                      <div className="text-sm text-slate-600">
                        Mock Interviews
                      </div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {selectedSavedReport.reportData?.milestones?.length ||
                          0}
                      </div>
                      <div className="text-sm text-slate-600">Milestones</div>
                    </div>
                  </div>

                  {/* Milestones */}
                  {selectedSavedReport.reportData?.milestones &&
                    selectedSavedReport.reportData.milestones.length > 0 && (
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 mb-3">
                          Milestones
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedSavedReport.reportData.milestones.map(
                            (milestone: any, idx: number) => (
                              <div
                                key={idx}
                                className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500 flex items-start gap-3"
                              >
                                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                                  <Icon
                                    icon={getMilestoneIcon(milestone)}
                                    width={20}
                                    className="text-green-600"
                                  />
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-slate-900">
                                    {milestone.milestone_title}
                                  </div>
                                  <div className="text-sm text-slate-600 mt-1">
                                    {new Date(
                                      milestone.achieved_at
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Comments Section */}
                  <div className="bg-white rounded-lg shadow p-6 border-t border-slate-200 mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon
                        icon="mingcute:message-3-line"
                        width={24}
                        className="text-blue-600"
                      />
                      <h4 className="text-lg font-bold text-slate-900">
                        Mentor Feedback
                      </h4>
                    </div>
                    {isLoadingComments ? (
                      <div className="flex items-center justify-center py-8">
                        <Icon
                          icon="mingcute:loading-line"
                          width={24}
                          className="animate-spin text-blue-700"
                        />
                        <span className="ml-3 text-slate-600">
                          Loading comments...
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reportComments.length > 0 ? (
                          reportComments.map((comment: any) => (
                            <div
                              key={comment.id}
                              className="border-l-4 border-blue-400 pl-4 py-2 bg-blue-50/50 rounded-r-lg"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Icon
                                  icon="mingcute:user-line"
                                  width={16}
                                  className="text-blue-600"
                                />
                                <span className="font-semibold text-slate-900">
                                  {comment.userName || "Mentor"}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {new Date(
                                    comment.createdAt
                                  ).toLocaleDateString()}{" "}
                                  at{" "}
                                  {new Date(
                                    comment.createdAt
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-slate-700 mt-1">
                                {comment.text}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 bg-slate-50 rounded-lg">
                            <Icon
                              icon="mingcute:message-2-line"
                              width={32}
                              className="mx-auto text-slate-300 mb-2"
                            />
                            <p className="text-slate-500 text-sm">
                              No feedback from your mentor yet.
                            </p>
                            <p className="text-slate-400 text-xs mt-1">
                              Your mentor can leave comments on this report.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mock Interviews Tab */}
      {(activeTab as string) === "mockInterviews" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                Mock Interview Feedback
              </h2>
              <p className="text-slate-600 text-sm">
                View mentor feedback on your mock interview practice sessions
              </p>
            </div>
            <button
              onClick={fetchMockInterviewsWithComments}
              disabled={isLoadingMockInterviews}
              className="text-blue-600 hover:text-blue-700 transition disabled:opacity-50 bg-transparent hover:bg-transparent border-none p-0 cursor-pointer flex items-center gap-2"
            >
              <Icon icon="mingcute:refresh-2-line" width={18} height={18} className="text-blue-600" />
              Refresh
            </button>
          </div>

          {isLoadingMockInterviews ? (
            <div className="flex items-center justify-center py-12">
              <Icon
                icon="mingcute:loading-line"
                width={32}
                className="animate-spin text-blue-700"
              />
              <span className="ml-3 text-slate-600">
                Loading mock interviews...
              </span>
            </div>
          ) : (
            <>
              {selectedMockInterview ? (
                <div className="space-y-6">
                  <button
                    onClick={() => setSelectedMockInterview(null)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Icon icon="mingcute:arrow-left-line" width={20} />
                    Back to Sessions
                  </button>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">
                          Mock Interview -{" "}
                          {selectedMockInterview.targetRole ||
                            "Practice Session"}
                        </h4>
                        <p className="text-sm text-slate-600">
                          {selectedMockInterview.targetCompany &&
                            `${selectedMockInterview.targetCompany} • `}
                          {new Date(
                            selectedMockInterview.startedAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          selectedMockInterview.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {selectedMockInterview.status}
                      </span>
                    </div>

                    {/* Mentor Feedback Section */}
                    {selectedMockInterview.comments &&
                    selectedMockInterview.comments.length > 0 ? (
                      <div className="bg-white rounded-lg p-6 mb-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Icon
                            icon="mingcute:message-3-line"
                            width={24}
                            className="text-blue-600"
                          />
                          <h5 className="text-lg font-bold text-slate-900">
                            Mentor Feedback
                          </h5>
                        </div>
                        <div className="space-y-4">
                          {selectedMockInterview.comments.map(
                            (comment: any) => (
                              <div
                                key={comment.id}
                                className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {comment.mentorProfilePicture &&
                                    !comment.mentorProfilePicture.includes(
                                      "blank-profile-picture"
                                    ) ? (
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-slate-200">
                                        <img
                                          src={comment.mentorProfilePicture}
                                          alt={comment.mentorName || "Mentor"}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display =
                                              "none";
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border-2 border-slate-300">
                                        <Icon
                                          icon="mingcute:user-line"
                                          width={16}
                                          className="text-slate-600"
                                        />
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-medium text-slate-900">
                                        {comment.mentorName || "Mentor"}
                                      </span>
                                      <span className="text-xs text-slate-500 ml-2">
                                        {new Date(
                                          comment.createdAt
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                    {comment.commentType}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                                  {comment.commentText}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-6 mb-4 text-center">
                        <Icon
                          icon="mingcute:message-2-line"
                          width={32}
                          className="mx-auto text-slate-300 mb-2"
                        />
                        <p className="text-slate-500 text-sm">
                          No feedback from your mentor yet.
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                          Your mentor can leave comments on this mock interview.
                        </p>
                      </div>
                    )}

                    {/* Performance Summary */}
                    {selectedMockInterview.performanceSummary &&
                      (() => {
                        const getPerformanceSummaryText = (
                          summary: any
                        ): string | null => {
                          if (!summary) return null;
                          if (typeof summary === "string") {
                            return cleanMarkdownText(summary);
                          }
                          if (typeof summary === "object" && summary !== null) {
                            // If it's an object, try to extract meaningful text
                            if (summary.overall)
                              return cleanMarkdownText(String(summary.overall));
                            if (summary.summary)
                              return cleanMarkdownText(String(summary.summary));
                            if (summary.text)
                              return cleanMarkdownText(String(summary.text));
                            if (summary.content)
                              return cleanMarkdownText(String(summary.content));
                            // If it's an array, join it
                            if (Array.isArray(summary)) {
                              return cleanMarkdownText(
                                summary.map((item) => String(item)).join("\n\n")
                              );
                            }
                            // Otherwise, stringify and clean
                            return cleanMarkdownText(
                              JSON.stringify(summary, null, 2)
                            );
                          }
                          return cleanMarkdownText(String(summary));
                        };

                        const summaryText = getPerformanceSummaryText(
                          selectedMockInterview.performanceSummary
                        );

                        return (
                          <div className="bg-white rounded-lg p-4 mb-4">
                            <h5 className="font-semibold text-slate-900 mb-2">
                              Performance Summary
                            </h5>
                            <div className="text-sm text-slate-700 prose prose-sm max-w-none">
                              {summaryText ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {summaryText}
                                </ReactMarkdown>
                              ) : (
                                <p className="text-slate-500 italic">
                                  No summary available
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                    {/* Conversation Preview */}
                    {selectedMockInterview.messages &&
                      selectedMockInterview.messages.length > 0 && (
                        <div className="bg-white rounded-lg p-4">
                          <h5 className="font-semibold text-slate-900 mb-3">
                            Conversation Preview
                          </h5>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {selectedMockInterview.messages
                              .slice(0, 5)
                              .map((msg: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={`text-xs p-2 rounded ${
                                    msg.role === "user"
                                      ? "bg-blue-50 text-blue-900"
                                      : "bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <span className="font-medium">
                                    {msg.role === "user"
                                      ? "You"
                                      : "Interviewer"}
                                    :
                                  </span>{" "}
                                  {msg.content.substring(0, 100)}
                                  {msg.content.length > 100 ? "..." : ""}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                <>
                  {Array.isArray(mockInterviewsWithComments) &&
                  mockInterviewsWithComments.length > 0 ? (
                    <div className="space-y-4">
                      {mockInterviewsWithComments.map((session) => {
                        const hasComments = session.commentCount > 0;
                        return (
                          <div
                            key={session.id}
                            className={`rounded-lg shadow p-6 border-2 transition cursor-pointer ${
                              hasComments
                                ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 hover:border-blue-400 hover:shadow-lg"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
                            }`}
                            onClick={() => {
                              fetchMockInterviewDetails(session.id);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-slate-900">
                                    {session.targetRole || "Practice Session"}
                                  </h4>
                                  {hasComments && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                                      <Icon
                                        icon="mingcute:message-line"
                                        width={12}
                                      />
                                      {session.commentCount} feedback
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600">
                                  {session.targetCompany &&
                                    `${session.targetCompany} • `}
                                  {new Date(
                                    session.startedAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    session.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {session.status}
                                </span>
                              </div>
                            </div>
                            {session.confidenceScore && (
                              <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                                <Icon icon="mingcute:star-line" width={16} />
                                Confidence Score: {session.confidenceScore}
                                /10
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Icon
                        icon="mingcute:microphone-line"
                        width={48}
                        className="mx-auto text-slate-300 mb-4"
                      />
                      <p className="text-slate-600 mb-2">
                        No mock interviews yet
                      </p>
                      <p className="text-sm text-slate-500">
                        Start a mock interview practice session to see it here.
                        Sessions with mentor feedback will be highlighted.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                Share Progress Report
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>
            {mentor ? (
              <div>
                <p className="text-slate-600 mb-4">
                  Share this progress report with your mentor:{" "}
                  <strong>{mentor.email}</strong>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleShareWithMentor()}
                    disabled={isSharing}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSharing ? (
                      <>
                        <Icon
                          icon="mingcute:loading-line"
                          width={20}
                          className="animate-spin"
                        />
                        Sharing...
                      </>
                    ) : (
                      <>
                        <Icon icon="mingcute:share-2-line" width={20} />
                        Share
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowShareModal(false)}
                    disabled={isSharing}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-slate-600 mb-4">
                  You don't have a mentor assigned yet.
                </p>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
