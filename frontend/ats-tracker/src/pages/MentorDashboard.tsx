import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";
import { ChatWindow } from "../components/chat/ChatWindow";
import { DocumentViewer } from "../components/team/DocumentViewer";
import { AssignTaskModal } from "../components/mentor/AssignTaskModal";

export function MentorDashboard() {
  const navigate = useNavigate();
  const [mentees, setMentees] = useState<any[]>([]);
  const [selectedMentee, setSelectedMentee] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [materials, setMaterials] = useState<any>(null);
  const [goals, setGoals] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMenteeData, setIsLoadingMenteeData] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "materials" | "goals" | "insights" | "communication" | "activity" | "tasks">("overview");
  const [menteeTasks, setMenteeTasks] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [menteeConversations, setMenteeConversations] = useState<any[]>([]);
  const [feedbackForm, setFeedbackForm] = useState({
    feedbackType: "general",
    feedbackContent: "",
    recommendations: "",
    relatedItemType: "",
    relatedItemId: "",
  });
  const [taskForm, setTaskForm] = useState({
    taskType: "interview_prep",
    taskTitle: "",
    taskDescription: "",
    dueDate: "",
    teamId: "",
  });
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState<{
    type: "resume" | "coverLetter" | "job" | null;
    id: string | null;
    data: any | null;
  }>({ type: null, id: null, data: null });
  const [isLoadingMaterial, setIsLoadingMaterial] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  useEffect(() => {
    fetchMentees();
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await api.getUserTeams();
      if (response.ok && response.data) {
        setAvailableTeams(response.data.teams || []);
        if (response.data.teams?.length > 0 && !taskForm.teamId) {
          setTaskForm(prev => ({ ...prev, teamId: response.data.teams[0].id }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    }
  };

  useEffect(() => {
    if (selectedMentee) {
      setProgress(null);
      setInsights(null);
      setMaterials(null);
      setGoals(null);
      setMenteeConversations([]);
      setSelectedDocument(null); // Reset selected document when switching mentees
      setMenteeTasks([]);
      fetchMenteeData(selectedMentee.menteeId);
      fetchMenteeConversations(selectedMentee.menteeId);
      fetchMenteeTasks(selectedMentee.menteeId);
    }
  }, [selectedMentee]);

  const fetchMentees = async () => {
    try {
      setIsLoading(true);
      const response = await api.getMentees();
      if (response.ok && response.data) {
        const menteesList = response.data.mentees || [];
        setMentees(menteesList);
        if (menteesList.length > 0) {
          setSelectedMentee(menteesList[0]);
        }
      } else {
        console.error("Failed to fetch mentees: Response not OK", response);
        setMentees([]);
      }
    } catch (error) {
      console.error("Failed to fetch mentees:", error);
      setMentees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMenteeData = async (menteeId: string) => {
    try {
      setIsLoadingMenteeData(true);
      
      // Fetch each endpoint separately to better isolate errors
      let progressResponse, insightsResponse, materialsResponse, goalsResponse;
      
      try {
        progressResponse = await api.getMenteeProgress(menteeId);
      if (progressResponse.ok && progressResponse.data) {
        setProgress(progressResponse.data.progress);
      } else {
          console.error("[MentorDashboard] Progress fetch failed:", progressResponse);
          setProgress({
            jobSearch: { total_jobs: 0, applied_count: 0, interview_count: 0 },
            engagementScore: 0
          });
        }
      } catch (error) {
        console.error("[MentorDashboard] Error fetching progress:", error);
        setProgress({
          jobSearch: { total_jobs: 0, applied_count: 0, interview_count: 0 },
          engagementScore: 0
        });
      }

      try {
        insightsResponse = await api.getCoachingInsights(menteeId);
      if (insightsResponse.ok && insightsResponse.data) {
        setInsights(insightsResponse.data.insights);
        } else {
          console.error("[MentorDashboard] Insights fetch failed:", insightsResponse);
        }
      } catch (error) {
        console.error("[MentorDashboard] Error fetching insights:", error);
      }

      try {
        materialsResponse = await api.getMenteeMaterials(menteeId);
      if (materialsResponse.ok && materialsResponse.data) {
          console.log("[MentorDashboard] Materials response:", materialsResponse.data);
        setMaterials(materialsResponse.data.materials);
        } else {
          console.error("[MentorDashboard] Materials fetch failed:", materialsResponse);
          setMaterials({ resumes: [], coverLetters: [], jobs: [] });
        }
      } catch (error) {
        console.error("[MentorDashboard] Error fetching materials:", error);
        setMaterials({ resumes: [], coverLetters: [], jobs: [] });
      }

      try {
        goalsResponse = await api.getMenteeGoals(menteeId);
      if (goalsResponse.ok && goalsResponse.data) {
        setGoals(goalsResponse.data.goals);
        } else {
          console.error("[MentorDashboard] Goals fetch failed:", goalsResponse);
        }
      } catch (error) {
        console.error("[MentorDashboard] Error fetching goals:", error);
      }
    } catch (error) {
      console.error("Failed to fetch mentee data:", error);
      setProgress({
        jobSearch: { total_jobs: 0, applied_count: 0, interview_count: 0 },
        engagementScore: 0
      });
    } finally {
      setIsLoadingMenteeData(false);
    }
  };

  const fetchMenteeConversations = async (menteeId: string) => {
    try {
      const response = await api.getUserConversations("mentor", undefined);
      if (response.ok && response.data) {
        // Filter conversations that include this mentee
        const conversations = response.data.conversations || [];
        const menteeConvs = conversations.filter((conv: any) => 
          conv.participants?.some((p: any) => p.userId === menteeId) ||
          conv.relatedEntityId === menteeId
        );
        setMenteeConversations(menteeConvs);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  const handleCreateConversation = async () => {
    if (!selectedMentee) return;
    
    try {
      const response = await api.createOrGetConversation({
        conversationType: "mentor",
        relatedEntityType: "mentee",
        relatedEntityId: selectedMentee.menteeId,
        participantIds: [selectedMentee.menteeId],
        title: `${selectedMentee.firstName || selectedMentee.email} - Mentor Chat`
      });

      if (response.ok && response.data) {
        const newConv = response.data.conversation;
        setSelectedConversationId(newConv.id);
        await fetchMenteeConversations(selectedMentee.menteeId);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedMentee || !feedbackForm.feedbackContent.trim()) return;

    try {
      setIsSubmittingFeedback(true);
      const response = await api.provideFeedback({
        menteeId: selectedMentee.menteeId,
        ...feedbackForm,
      });

      if (response.ok) {
        setShowFeedbackModal(false);
        setFeedbackForm({
          feedbackType: "general",
          feedbackContent: "",
          recommendations: "",
          relatedItemType: "",
          relatedItemId: "",
        });
        // Refresh insights to show new feedback
        if (selectedMentee) {
          const insightsResponse = await api.getCoachingInsights(selectedMentee.menteeId);
          if (insightsResponse.ok && insightsResponse.data) {
            setInsights(insightsResponse.data.insights);
          }
        }
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const fetchMenteeTasks = async (menteeId: string) => {
    try {
      setIsLoadingTasks(true);
      const response = await api.getMenteeTasks(menteeId);
      if (response.ok && response.data) {
        setMenteeTasks(response.data.tasks || []);
      } else {
        console.error("[MentorDashboard] Failed to fetch mentee tasks:", response);
        setMenteeTasks([]);
      }
    } catch (error) {
      console.error("Failed to fetch mentee tasks:", error);
      setMenteeTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleTaskAssigned = async () => {
        if (selectedMentee) {
      await fetchMenteeTasks(selectedMentee.menteeId);
      // Refresh progress to show new task
          const progressResponse = await api.getMenteeProgress(selectedMentee.menteeId);
          if (progressResponse.ok && progressResponse.data) {
            setProgress(progressResponse.data.progress);
          }
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
        year: "numeric" 
      });
    } catch {
      return "N/A";
    }
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
        minute: "2-digit"
      });
    } catch {
      return "N/A";
    }
  };

  const formatActivityDescription = (activityType: string, activityData: any): string => {
    if (!activityData || typeof activityData === "string") {
      return activityData || "";
    }

    try {
      // Parse if it's a string
      const data = typeof activityData === "string" ? JSON.parse(activityData) : activityData;

      switch (activityType) {
        case "job_shared":
          return data.job_title 
            ? `Shared job: ${data.job_title} at ${data.company || "a company"}`
            : "Shared a job posting";
        
        case "comment_added":
          return data.document_type
            ? `Added a comment on ${data.document_type.replace("_", " ")}`
            : "Added a comment";
        
        case "milestone_achieved":
          return data.milestone_title
            ? `Achieved milestone: ${data.milestone_title}`
            : data.milestone_type
            ? `Achieved ${data.milestone_type.replace("_", " ")} milestone`
            : "Achieved a milestone";
        
        case "feedback_provided":
          return data.feedback_type
            ? `Provided ${data.feedback_type.replace("_", " ")} feedback`
            : "Provided feedback";
        
        case "task_assigned":
          return data.task_title
            ? `Assigned task: ${data.task_title}`
            : data.task_type
            ? `Assigned ${data.task_type.replace("_", " ")} task`
            : "Assigned a task";
        
        case "task_completed":
          return data.task_title
            ? `Completed task: ${data.task_title}`
            : "Completed a task";
        
        case "task_updated":
          return data.task_title
            ? `Updated task: ${data.task_title} (${data.new_status?.replace("_", " ") || "updated"})`
            : "Updated a task";
        
        case "resume_created":
          return data.resume_name
            ? `Created resume: ${data.resume_name}`
            : "Created a resume";
        
        case "resume_updated":
          return data.resume_name
            ? `Updated resume: ${data.resume_name}`
            : "Updated a resume";
        
        case "cover_letter_created":
          return data.cover_letter_title
            ? `Created cover letter: ${data.cover_letter_title}`
            : "Created a cover letter";
        
        case "cover_letter_updated":
          return data.cover_letter_title
            ? `Updated cover letter: ${data.cover_letter_title}`
            : "Updated a cover letter";
        
        case "job_application_submitted":
          return data.job_title
            ? `Applied to ${data.job_title} at ${data.company || "a company"}`
            : "Submitted a job application";
        
        case "interview_scheduled":
          return data.interview_type
            ? `Scheduled ${data.interview_type.replace("_", " ")} interview`
            : "Scheduled an interview";
        
        case "interview_completed":
          return data.interview_type
            ? `Completed ${data.interview_type.replace("_", " ")} interview`
            : "Completed an interview";
        
        case "member_invited":
          return data.invitee_email
            ? `Invited ${data.invitee_email} to join the team`
            : "Invited a new member";
        
        case "team_created":
          return "Created the team";
        
        case "document_shared":
          return data.document_type && data.document_name
            ? `Shared ${data.document_type.replace("_", " ")}: ${data.document_name}`
            : "Shared a document";
        
        default:
          // Try to create a readable description from the data
          if (data.title || data.name) {
            return `${activityType.replace(/_/g, " ")}: ${data.title || data.name}`;
          }
          return activityType.replace(/_/g, " ");
      }
    } catch (error) {
      // If parsing fails, return a generic message
      return activityType.replace(/_/g, " ");
    }
  };

  const getActivityIcon = (activityType: string): string => {
    const icons: Record<string, string> = {
      // Job related
      job_shared: "mingcute:share-2-line",
      job_application_submitted: "mingcute:send-line",
      
      // Comments and feedback
      comment_added: "mingcute:message-3-line",
      feedback_provided: "mingcute:feedback-line",
      
      // Milestones and achievements
      milestone_achieved: "mingcute:trophy-line",
      
      // Tasks
      task_assigned: "mingcute:task-line",
      task_completed: "mingcute:check-circle-line",
      task_updated: "mingcute:refresh-2-line",
      
      // Documents - Resumes
      resume_created: "mingcute:file-add-line",
      resume_updated: "mingcute:file-edit-line",
      
      // Documents - Cover Letters
      cover_letter_created: "mingcute:mail-add-line",
      cover_letter_updated: "mingcute:mail-edit-line",
      
      // Interviews
      interview_scheduled: "mingcute:calendar-3-line",
      interview_completed: "mingcute:check-2-line",
      
      // Team and collaboration
      member_invited: "mingcute:user-add-line",
      team_created: "mingcute:user-group-2-line",
      document_shared: "mingcute:share-forward-line",
      
      // Profile and account
      profile_updated: "mingcute:user-settings-line",
      account_created: "mingcute:user-line",
    };
    return icons[activityType] || "mingcute:activity-line";
  };

  const handleViewMaterial = async (type: "resume" | "coverLetter" | "job", id: string) => {
    if (!selectedMentee) return;

    try {
      setIsLoadingMaterial(true);
      setViewingMaterial({ type, id, data: null });

      let response;
      if (type === "resume") {
        response = await api.getMenteeResumeDetail(selectedMentee.menteeId, id);
      } else if (type === "coverLetter") {
        response = await api.getMenteeCoverLetterDetail(selectedMentee.menteeId, id);
      } else {
        response = await api.getMenteeJobDetail(selectedMentee.menteeId, id);
      }

      if (response.ok && response.data) {
        setViewingMaterial({
          type,
          id,
          data: type === "resume" ? response.data.resume : 
                type === "coverLetter" ? response.data.coverLetter : 
                response.data.job
        });
      } else {
        console.error("Failed to load material:", response);
        alert("Failed to load material. Please try again.");
        setViewingMaterial({ type: null, id: null, data: null });
      }
    } catch (error) {
      console.error("Error loading material:", error);
      alert("Failed to load material. Please try again.");
      setViewingMaterial({ type: null, id: null, data: null });
    } finally {
      setIsLoadingMaterial(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon icon="mingcute:loading-line" width={48} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (mentees.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <Icon icon="mingcute:user-star-line" width={64} className="mx-auto text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">No Mentees Yet</h1>
        <p className="text-slate-600 mb-4">You don't have any mentees assigned. Mentees will appear here once they accept your mentorship invitation or join your team.</p>
        <button
          onClick={fetchMentees}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>
    );
  }

  const selectedMenteeName = selectedMentee?.firstName && selectedMentee?.lastName
    ? `${selectedMentee.firstName} ${selectedMentee.lastName}`.trim()
    : selectedMentee?.firstName || selectedMentee?.lastName || selectedMentee?.email;

  // Get teamId for the selected mentee - use team_id from mentee or find shared team
  const getMenteeTeamId = (): string | null => {
    if (selectedMentee?.team_id) {
      return selectedMentee.team_id;
    }
    // Fallback: find a team where both mentor and mentee are members
    if (selectedMentee?.menteeId && availableTeams.length > 0) {
      // For now, use the first available team - in a real scenario, you'd query which team they share
      return availableTeams[0]?.id || null;
    }
    return null;
  };

  const menteeTeamId = getMenteeTeamId();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Mentor Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{mentees.length}</span> {mentees.length === 1 ? 'Mentee' : 'Mentees'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Mentee List Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4 sticky top-6">
            <h2 className="font-semibold text-slate-900 mb-4">Your Mentees</h2>
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {mentees.map((mentee) => {
                const fullName = mentee.firstName && mentee.lastName
                  ? `${mentee.firstName} ${mentee.lastName}`.trim()
                  : mentee.firstName || mentee.lastName || mentee.email;
                return (
                  <button
                    key={mentee.menteeId}
                    onClick={() => setSelectedMentee(mentee)}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      selectedMentee?.menteeId === mentee.menteeId
                        ? "bg-blue-50 border-2 border-blue-500"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-medium text-slate-900">{fullName}</div>
                    <div className="text-sm text-slate-600">{mentee.relationshipType || "Mentee"}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {selectedMentee && (
          <div className="lg:col-span-3 space-y-6">
            {/* Mentee Header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedMenteeName}</h2>
                    <p className="text-slate-600 text-sm mt-1">{selectedMentee.email}</p>
                </div>
                  <div className="flex items-center gap-2 flex-wrap">
                  <button
                      onClick={() => setShowTaskModal(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition text-sm font-medium shadow-sm"
                      title="Assign Task"
                  >
                      <Icon icon="mingcute:task-line" width={16} />
                      <span className="hidden sm:inline">Assign Task</span>
                  </button>
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition text-sm font-medium shadow-sm"
                      title="Provide Feedback"
                  >
                    <Icon icon="mingcute:edit-line" width={16} />
                      <span className="hidden sm:inline">Feedback</span>
                    </button>
                    <button
                      onClick={handleCreateConversation}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-sm font-medium shadow-sm"
                      title="Send Message"
                    >
                      <Icon icon="mingcute:message-line" width={16} />
                      <span className="hidden sm:inline">Message</span>
                  </button>
                  </div>
                </div>
              </div>

              {/* Tab Navigation - Scrollable */}
              <div className="bg-slate-50/50 border-b border-slate-200">
                <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <style>{`
                    div[style*="scrollbarWidth"]::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  <div className="flex gap-0.5 px-1 min-w-max">
                    {[
                      { id: "overview", label: "Overview", icon: "mingcute:chart-line", shortLabel: "Overview" },
                      { id: "materials", label: "Materials", icon: "mingcute:file-line", shortLabel: "Materials" },
                      { id: "tasks", label: "Tasks", icon: "mingcute:task-line", shortLabel: "Tasks" },
                      { id: "goals", label: "Goals", icon: "mingcute:target-line", shortLabel: "Goals" },
                      { id: "insights", label: "Insights", icon: "mingcute:lightbulb-line", shortLabel: "Insights" },
                      { id: "communication", label: "Messages", icon: "mingcute:message-line", shortLabel: "Messages" },
                      { id: "activity", label: "Activity", icon: "mingcute:time-line", shortLabel: "Activity" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id
                            ? "border-blue-500 text-blue-600 font-semibold bg-white shadow-sm"
                            : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    <Icon icon={tab.icon} width={18} />
                        <span className="text-sm font-medium">{tab.shortLabel}</span>
                  </button>
                ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
            {isLoadingMenteeData ? (
                <div className="p-12">
                <div className="flex items-center justify-center">
                  <Icon icon="mingcute:loading-line" width={32} className="animate-spin text-blue-500" />
                  <span className="ml-3 text-slate-600">Loading mentee data...</span>
                </div>
              </div>
            ) : (
                <div className="p-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    {/* Key Performance Indicators */}
                    {progress && (
                        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Key Performance Indicators</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Icon icon="mingcute:briefcase-line" width={24} className="text-blue-600" />
                              <span className="text-xs text-slate-500">Total</span>
                            </div>
                            <div className="text-3xl font-bold text-blue-600">
                              {progress.jobSearch?.total_jobs || 0}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">Job Opportunities</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Icon icon="mingcute:send-line" width={24} className="text-green-600" />
                              <span className="text-xs text-slate-500">Applied</span>
                            </div>
                            <div className="text-3xl font-bold text-green-600">
                              {progress.jobSearch?.applied_count || 0}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">Applications</div>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Icon icon="mingcute:calendar-line" width={24} className="text-purple-600" />
                              <span className="text-xs text-slate-500">Scheduled</span>
                            </div>
                            <div className="text-3xl font-bold text-purple-600">
                              {progress.jobSearch?.interview_count || 0}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">Interviews</div>
                          </div>
                          <div className="bg-yellow-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Icon icon="mingcute:fire-line" width={24} className="text-yellow-600" />
                              <span className="text-xs text-slate-500">Score</span>
                            </div>
                            <div className="text-3xl font-bold text-yellow-600">
                              {progress.engagementScore || 0}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">Engagement</div>
                          </div>
                        </div>

                        {/* Additional Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                          <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-sm text-slate-600 mb-1">Task Completion</div>
                            <div className="text-2xl font-bold text-slate-900">
                              {progress.tasks?.total_tasks > 0
                                ? Math.round((progress.tasks.completed_tasks / progress.tasks.total_tasks) * 100)
                                : 0}%
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {progress.tasks?.completed_tasks || 0} of {progress.tasks?.total_tasks || 0} tasks
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-sm text-slate-600 mb-1">Interview Prep</div>
                            <div className="text-2xl font-bold text-slate-900">
                              {progress.interviewPrep?.scheduled_interviews || 0}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Scheduled interviews</div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-sm text-slate-600 mb-1">Application Rate</div>
                            <div className="text-2xl font-bold text-slate-900">
                              {progress.jobSearch?.total_jobs > 0
                                ? Math.round((progress.jobSearch.applied_count / progress.jobSearch.total_jobs) * 100)
                                : 0}%
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Applications per opportunity</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Insights Summary */}
                    {insights && insights.insights && insights.insights.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Quick Insights</h3>
                        <div className="space-y-3">
                          {insights.insights.slice(0, 3).map((insight: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-lg border-l-4 ${
                                insight.priority === "high"
                                  ? "bg-red-50 border-red-500"
                                  : "bg-yellow-50 border-yellow-500"
                              }`}
                            >
                              <div className="font-semibold text-slate-900">{insight.title}</div>
                              <div className="text-sm text-slate-700 mt-1">{insight.message}</div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setActiveTab("insights")}
                          className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View all insights →
                        </button>
                      </div>
                    )}

                    {/* Upcoming Interviews & Dates */}
                    {progress?.upcomingInterviews && progress.upcomingInterviews.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Icon icon="mingcute:calendar-line" width={24} />
                          Upcoming Interviews & Dates
                        </h3>
                        <div className="space-y-3">
                          {progress.upcomingInterviews.map((interview: any) => (
                            <div key={interview.id} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-blue-500">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-slate-900 text-lg mb-1">
                                    {interview.title || `${interview.type} Interview`}
                                  </div>
                                  {interview.jobTitle && interview.jobCompany && (
                                    <div className="text-sm text-slate-700 mb-2">
                                      {interview.jobTitle} at {interview.jobCompany}
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 mt-2">
                                    <div className="flex items-center gap-1">
                                      <Icon icon="mingcute:time-line" width={16} />
                                      <span>
                                        {interview.scheduledAt 
                                          ? formatDateTime(interview.scheduledAt)
                                          : "Date TBD"}
                                      </span>
                                    </div>
                                    {interview.duration && (
                                      <div className="flex items-center gap-1">
                                        <Icon icon="mingcute:clock-line" width={16} />
                                        <span>{interview.duration} minutes</span>
                                      </div>
                                    )}
                                    {interview.location && (
                                      <div className="flex items-center gap-1">
                                        <Icon icon="mingcute:map-pin-line" width={16} />
                                        <span>{interview.location}</span>
                                      </div>
                                    )}
                                    {interview.videoLink && (
                                      <div className="flex items-center gap-1">
                                        <Icon icon="mingcute:video-line" width={16} />
                                        <a 
                                          href={interview.videoLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          Video Link
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                  {interview.interviewerName && (
                                    <div className="text-sm text-slate-600 mt-2">
                                      <span className="font-medium">Interviewer:</span> {interview.interviewerName}
                                      {interview.interviewerEmail && ` (${interview.interviewerEmail})`}
                                    </div>
                                  )}
                                </div>
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium capitalize">
                                  {interview.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Technical Interview Progress */}
                    {progress?.technicalProgress && progress.technicalProgress.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Icon icon="mingcute:code-line" width={24} />
                          Technical Interview Progress
                        </h3>
                        <div className="space-y-4">
                          {progress.technicalProgress.map((tech: any, idx: number) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {tech.jobTitle || "Technical Prep"}
                                  </div>
                                  {tech.jobCompany && (
                                    <div className="text-sm text-slate-600">{tech.jobCompany}</div>
                                  )}
                                </div>
                                {tech.avgScore !== null && (
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-blue-600">{tech.avgScore}%</div>
                                    <div className="text-xs text-slate-500">Avg Score</div>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-4 mt-3">
                                <div>
                                  <div className="text-sm text-slate-600">Challenges</div>
                                  <div className="text-lg font-semibold text-slate-900">
                                    {tech.completedAttempts} / {tech.totalChallenges}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-slate-600">Types</div>
                                  <div className="text-lg font-semibold text-slate-900">
                                    {tech.challengeTypesCount}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-slate-600">Last Attempt</div>
                                  <div className="text-sm font-medium text-slate-700">
                                    {tech.lastAttemptDate ? formatDate(tech.lastAttemptDate) : "Never"}
                                  </div>
                                </div>
                              </div>
                              {tech.totalChallenges > 0 && (
                                <div className="mt-3">
                                  <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-500 h-2 rounded-full transition-all"
                                      style={{ 
                                        width: `${Math.min(100, (tech.completedAttempts / tech.totalChallenges) * 100)}%` 
                                      }}
                                    />
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {Math.round((tech.completedAttempts / tech.totalChallenges) * 100)}% Complete
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Behavioral/Mock Interview Progress */}
                    {progress?.behavioralProgress && progress.behavioralProgress.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Icon icon="mingcute:chat-3-line" width={24} />
                          Behavioral & Mock Interview Progress
                        </h3>
                        <div className="space-y-4">
                          {progress.behavioralProgress.map((behavioral: any, idx: number) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {behavioral.jobTitle || "Mock Interview Prep"}
                                  </div>
                                  {behavioral.jobCompany && (
                                    <div className="text-sm text-slate-600">{behavioral.jobCompany}</div>
                                  )}
                                </div>
                                {behavioral.avgConfidenceScore !== null && (
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-green-600">
                                      {behavioral.avgConfidenceScore}%
                                    </div>
                                    <div className="text-xs text-slate-500">Confidence</div>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-4 mt-3">
                                <div>
                                  <div className="text-sm text-slate-600">Sessions</div>
                                  <div className="text-lg font-semibold text-slate-900">
                                    {behavioral.completedSessions} / {behavioral.totalSessions}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-slate-600">Formats</div>
                                  <div className="text-lg font-semibold text-slate-900">
                                    {behavioral.interviewFormatsCount}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-slate-600">Last Session</div>
                                  <div className="text-sm font-medium text-slate-700">
                                    {behavioral.lastSessionDate ? formatDate(behavioral.lastSessionDate) : "Never"}
                                  </div>
                                </div>
                              </div>
                              {behavioral.totalSessions > 0 && (
                                <div className="mt-3">
                                  <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                      className="bg-green-500 h-2 rounded-full transition-all"
                                      style={{ 
                                        width: `${Math.min(100, (behavioral.completedSessions / behavioral.totalSessions) * 100)}%` 
                                      }}
                                    />
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {Math.round((behavioral.completedSessions / behavioral.totalSessions) * 100)}% Complete
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Activity */}
                    {progress?.recentActivity && progress.recentActivity.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Recent Activity</h3>
                        <div className="space-y-3">
                          {progress.recentActivity.slice(0, 5).map((activity: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                              <Icon icon="mingcute:activity-line" width={20} className="text-slate-400 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-900">{activity.activity_type}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {formatDateTime(activity.created_at)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setActiveTab("activity")}
                          className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View all activity →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Materials Tab */}
                {activeTab === "materials" && (
                    <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Documents</h2>
                        <p className="text-sm text-slate-500">View resumes and cover letters for {selectedMenteeName}</p>
                      </div>
                      <button
                        onClick={() => selectedMentee && fetchMenteeData(selectedMentee.menteeId)}
                        className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title="Refresh documents"
                      >
                        <Icon icon="mingcute:refresh-line" width={18} />
                      </button>
                    </div>
                    {isLoadingMenteeData ? (
                      <div className="flex items-center justify-center py-12">
                        <Icon icon="mingcute:loading-line" width={32} className="animate-spin text-blue-500" />
                        <span className="ml-3 text-slate-600">Loading documents...</span>
                      </div>
                    ) : !materials ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                          <Icon icon="mingcute:file-line" width={32} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600 mb-1">No documents available</p>
                        <p className="text-xs text-slate-500">This mentee hasn't created any resumes or cover letters yet</p>
                      </div>
                    ) : (materials?.resumes?.length === 0 && materials?.coverLetters?.length === 0) ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                          <Icon icon="mingcute:file-line" width={32} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600 mb-1">No documents available</p>
                        <p className="text-xs text-slate-500">This mentee hasn't created any resumes or cover letters yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                      {/* Resumes */}
                        {materials?.resumes && materials.resumes.length > 0 && (
                          materials.resumes.map((resume: any) => {
                            const doc = {
                              id: `resume-${resume.id}`,
                              documentId: resume.id,
                              documentType: "resume",
                              documentName: resume.name || resume.version_name || "Untitled Resume",
                              sharedAt: resume.created_at,
                              commentCount: 0,
                            };
                            return (
                              <div
                                key={resume.id}
                                className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                                  selectedDocument?.id === doc.id
                                    ? "border-blue-500 shadow-lg"
                                    : "border-slate-200 hover:border-blue-300 shadow-sm"
                                }`}
                              >
                                <div
                                  className="p-5 cursor-pointer"
                                  onClick={() => setSelectedDocument(selectedDocument?.id === doc.id ? null : doc)}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-2">
                                        <Icon
                                          icon="mingcute:file-text-line"
                                          width={24}
                                          className="text-blue-500"
                                        />
                                        <h3 className="text-lg font-bold text-slate-900">{doc.documentName}</h3>
                                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                                          Resume
                                        </span>
                                        {resume.is_master && (
                                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                                            Master
                                      </span>
                                    )}
                                  </div>
                                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                        {resume.updated_at && (
                                          <span>
                                            Updated {new Date(resume.updated_at).toLocaleDateString()}
                                          </span>
                                        )}
                                        {resume.version_name && (
                                          <span className="text-slate-400">•</span>
                                        )}
                                        {resume.version_name && (
                                          <span>Version: {resume.version_name}</span>
                                        )}
                                </div>
                                </div>
                                    <Icon
                                      icon={selectedDocument?.id === doc.id ? "mingcute:up-line" : "mingcute:down-line"}
                                      width={20}
                                      className="text-slate-400"
                                    />
                              </div>
                          </div>
                                {selectedDocument?.id === doc.id && menteeTeamId && (
                                  <div className="border-t border-slate-200 p-5 bg-slate-50">
                                    <DocumentViewer
                                      document={doc}
                                      teamId={menteeTeamId}
                                      onClose={() => setSelectedDocument(null)}
                                    />
                                  </div>
                        )}
                      </div>
                            );
                          })
                        )}

                      {/* Cover Letters */}
                        {materials?.coverLetters && materials.coverLetters.length > 0 && (
                          materials.coverLetters.map((coverLetter: any) => {
                            const doc = {
                              id: `coverletter-${coverLetter.id}`,
                              documentId: coverLetter.id,
                              documentType: "cover_letter",
                              documentName: coverLetter.title || coverLetter.version_name || "Untitled Cover Letter",
                              sharedAt: coverLetter.created_at,
                              commentCount: 0,
                            };
                            return (
                              <div
                                key={coverLetter.id}
                                className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                                  selectedDocument?.id === doc.id
                                    ? "border-blue-500 shadow-lg"
                                    : "border-slate-200 hover:border-blue-300 shadow-sm"
                                }`}
                              >
                                <div
                                  className="p-5 cursor-pointer"
                                  onClick={() => setSelectedDocument(selectedDocument?.id === doc.id ? null : doc)}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-2">
                                        <Icon
                                          icon="mingcute:mail-line"
                                          width={24}
                                          className="text-purple-500"
                                        />
                                        <h3 className="text-lg font-bold text-slate-900">{doc.documentName}</h3>
                                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                                          Cover Letter
                                        </span>
                                  </div>
                                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                        {coverLetter.updated_at && (
                                          <span>
                                            Updated {new Date(coverLetter.updated_at).toLocaleDateString()}
                                          </span>
                                        )}
                                        {coverLetter.version_name && (
                                          <span className="text-slate-400">•</span>
                                        )}
                                        {coverLetter.version_name && (
                                          <span>Version: {coverLetter.version_name}</span>
                                        )}
                                  </div>
                                </div>
                                    <Icon
                                      icon={selectedDocument?.id === doc.id ? "mingcute:up-line" : "mingcute:down-line"}
                                      width={20}
                                      className="text-slate-400"
                                    />
                                </div>
                              </div>
                                {selectedDocument?.id === doc.id && menteeTeamId && (
                                  <div className="border-t border-slate-200 p-5 bg-slate-50">
                                    <DocumentViewer
                                      document={doc}
                                      teamId={menteeTeamId}
                                      onClose={() => setSelectedDocument(null)}
                                    />
                          </div>
                        )}
                      </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}

                  {/* Tasks Tab */}
                  {activeTab === "tasks" && (
                    <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Assigned Tasks</h2>
                        <p className="text-sm text-slate-500">View and manage tasks assigned to {selectedMenteeName}</p>
                                  </div>
                                  <button
                        onClick={() => setShowTaskModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition text-sm font-medium"
                                  >
                        <Icon icon="mingcute:add-line" width={18} />
                        Assign New Task
                                  </button>
                    </div>
                    {isLoadingTasks ? (
                      <div className="flex items-center justify-center py-12">
                        <Icon icon="mingcute:loading-line" width={32} className="animate-spin text-blue-500" />
                        <span className="ml-3 text-slate-600">Loading tasks...</span>
                      </div>
                    ) : menteeTasks.length === 0 ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                          <Icon icon="mingcute:task-line" width={32} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600 mb-1">No tasks assigned yet</p>
                        <p className="text-xs text-slate-500 mb-4">Assign preparation tasks to help {selectedMenteeName} stay on track</p>
                                  <button
                          onClick={() => setShowTaskModal(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm font-medium"
                                  >
                          <Icon icon="mingcute:add-line" width={18} />
                          Assign First Task
                                  </button>
                                </div>
                    ) : (
                      <div className="space-y-4">
                        {menteeTasks.map((task: any) => {
                          const getStatusColor = (status: string) => {
                            switch (status) {
                              case "completed":
                                return "bg-green-100 text-green-800";
                              case "in_progress":
                                return "bg-blue-100 text-blue-800";
                              case "pending":
                                return "bg-amber-100 text-amber-800";
                              case "cancelled":
                                return "bg-slate-100 text-slate-800";
                              default:
                                return "bg-slate-100 text-slate-800";
                            }
                          };

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

                          const taskTitle = task.taskTitle || task.task_title;
                          const taskDescription = task.taskDescription || task.task_description;
                          const taskType = task.taskType || task.task_type;
                          const dueDate = task.dueDate || task.due_date;
                          const createdAt = task.createdAt || task.created_at;
                          const taskData = task.taskData || task.task_data || {};
                          const subtasks = Array.isArray(taskData.subtasks) ? taskData.subtasks : [];
                          const linkedJobId = taskData.linkedJobId;
                          const linkedResumeId = taskData.linkedResumeId;
                          const linkedCoverLetterId = taskData.linkedCoverLetterId;
                          const isOverdue = dueDate && new Date(dueDate) < new Date() && task.status !== "completed" && task.status !== "cancelled";

                          return (
                            <div
                              key={task.id}
                              className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                                isOverdue
                                  ? "border-red-300 bg-red-50/30"
                                  : "border-slate-200 hover:border-slate-300 shadow-sm"
                              }`}
                            >
                              <div className="p-5">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className={`p-2 rounded-lg ${
                                      task.status === "completed" ? "bg-green-100" :
                                      task.status === "in_progress" ? "bg-blue-100" :
                                      "bg-amber-100"
                                    }`}>
                                      <Icon
                                        icon={getTaskTypeIcon(taskType)}
                                        width={24}
                                        className={
                                          task.status === "completed" ? "text-green-600" :
                                          task.status === "in_progress" ? "text-blue-600" :
                                          "text-amber-600"
                                        }
                                      />
                              </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-slate-900">{taskTitle}</h3>
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                                          {task.status?.replace("_", " ")}
                                        </span>
                                        {isOverdue && (
                                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                            Overdue
                                          </span>
                                        )}
                                      </div>
                                      {taskDescription && (
                                        <p className="text-sm text-slate-600 mb-2 line-clamp-2">{taskDescription}</p>
                                      )}
                                      {subtasks.length > 0 && (
                                        <div className="mb-2">
                                          <div className="text-xs text-slate-500 mb-1">
                                            {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {subtasks.slice(0, 3).map((subtask: string, idx: number) => (
                                              <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                                {subtask}
                                              </span>
                                            ))}
                                            {subtasks.length > 3 && (
                                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                                +{subtasks.length - 3} more
                                              </span>
                                            )}
                          </div>
                                        </div>
                                      )}
                                      {(linkedJobId || linkedResumeId || linkedCoverLetterId) && (
                                        <div className="mb-2 flex items-center gap-2 flex-wrap">
                                          {linkedJobId && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                              <Icon icon="mingcute:briefcase-line" width={14} />
                                              Job Linked
                                            </span>
                                          )}
                                          {linkedResumeId && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                              <Icon icon="mingcute:file-text-line" width={14} />
                                              Resume Linked
                                            </span>
                                          )}
                                          {linkedCoverLetterId && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                              <Icon icon="mingcute:mail-line" width={14} />
                                              Cover Letter Linked
                                            </span>
                        )}
                      </div>
                                      )}
                                      <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                          <Icon icon="mingcute:tag-line" width={14} />
                                          {taskType?.replace(/_/g, " ")}
                                        </span>
                                        {dueDate && (
                                          <>
                                            <span className="text-slate-300">•</span>
                                            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                                              <Icon icon="mingcute:calendar-line" width={14} />
                                              Due {formatDate(dueDate)}
                                            </span>
                                          </>
                                        )}
                                        <span className="text-slate-300">•</span>
                                        <span className="flex items-center gap-1">
                                          <Icon icon="mingcute:time-line" width={14} />
                                          Assigned {formatDate(createdAt)}
                                        </span>
                    </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Goals & Milestones Tab */}
                {activeTab === "goals" && (
                  <div className="space-y-6">
                    {/* Goals Progress */}
                    {goals && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Goal Progress</h3>
                        <div className="space-y-4">
                          {goals.goals && goals.goals.length > 0 ? (
                            goals.goals.map((goal: any) => {
                              const progressPercent = goal.target > 0 
                                ? Math.min(100, Math.round((goal.current / goal.target) * 100))
                                : 0;
                              return (
                                <div key={goal.id} className="p-4 bg-slate-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-slate-900">{goal.title}</div>
                                    <div className="text-sm font-medium text-slate-700">
                                      {goal.current} / {goal.target}
                                    </div>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
                                    <div
                                      className={`h-2.5 rounded-full transition-all ${
                                        progressPercent >= 100
                                          ? "bg-green-500"
                                          : progressPercent >= 75
                                          ? "bg-blue-500"
                                          : progressPercent >= 50
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                      }`}
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {progressPercent}% complete • {goal.period}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-slate-500 text-sm">No goals set yet</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recent Achievements */}
                    {goals && goals.achievements && goals.achievements.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Recent Achievements</h3>
                        <div className="space-y-3">
                          {goals.achievements.map((achievement: any) => (
                            <div key={achievement.id} className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-l-4 border-yellow-500">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                                    <Icon icon="mingcute:award-line" width={20} className="text-yellow-600" />
                                    {achievement.title}
                                  </div>
                                  {achievement.description && (
                                    <div className="text-sm text-slate-700 mt-1">{achievement.description}</div>
                                  )}
                                  <div className="text-xs text-slate-500 mt-2">
                                    Achieved {formatDate(achievement.achievedAt)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All Milestones */}
                    {goals && goals.milestones && goals.milestones.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">All Milestones</h3>
                        <div className="space-y-3">
                          {goals.milestones.map((milestone: any) => (
                            <div key={milestone.id} className="p-4 bg-slate-50 rounded-lg">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-slate-900">{milestone.title}</div>
                                  {milestone.description && (
                                    <div className="text-sm text-slate-700 mt-1">{milestone.description}</div>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                      {milestone.type}
                                    </span>
                                    <span>{formatDate(milestone.achievedAt)}</span>
                                    {milestone.sharedWithTeam && (
                                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                                        Shared with team
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!goals || (goals.goals?.length === 0 && goals.achievements?.length === 0 && goals.milestones?.length === 0)) && (
                      <div className="bg-white rounded-lg shadow p-12 text-center">
                        <Icon icon="mingcute:target-line" width={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-600">No goals or milestones tracked yet</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Insights Tab */}
                {activeTab === "insights" && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Coaching Insights & Recommendations</h3>
                    {insights && insights.insights && insights.insights.length > 0 ? (
                      <div className="space-y-4">
                        {insights.insights.map((insight: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-5 rounded-lg border-l-4 ${
                              insight.priority === "high"
                                ? "bg-red-50 border-red-500"
                                : insight.priority === "medium"
                                ? "bg-yellow-50 border-yellow-500"
                                : "bg-blue-50 border-blue-500"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="font-semibold text-slate-900 text-lg">{insight.title}</div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                insight.priority === "high"
                                  ? "bg-red-100 text-red-700"
                                  : insight.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                                {insight.priority || "low"} priority
                              </span>
                            </div>
                            <div className="text-sm text-slate-700 mt-2 mb-3">{insight.message}</div>
                            {insight.recommendation && (
                              <div className="mt-3 p-3 bg-white rounded border border-slate-200">
                                <div className="flex items-start gap-2">
                                  <Icon icon="mingcute:lightbulb-line" width={20} className="text-blue-600 mt-0.5" />
                                  <div>
                                    <div className="font-medium text-slate-900 text-sm">Recommendation</div>
                                    <div className="text-sm text-slate-700 mt-1">{insight.recommendation}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Icon icon="mingcute:lightbulb-line" width={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-600">No insights available at this time</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Communication Tab */}
                {activeTab === "communication" && (
                    <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-900">Messages</h3>
                      <button
                        onClick={handleCreateConversation}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                      >
                        <Icon icon="mingcute:add-line" width={16} />
                        New Message
                      </button>
                    </div>
                    {selectedConversationId ? (
                      <div className="border border-slate-200 rounded-lg overflow-hidden" style={{ height: "600px" }}>
                        <ChatWindow
                          conversationId={selectedConversationId}
                          title={`Chat with ${selectedMenteeName}`}
                          onClose={() => setSelectedConversationId(null)}
                          className="h-full"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {menteeConversations.length > 0 ? (
                          menteeConversations.map((conv: any) => (
                            <button
                              key={conv.id}
                              onClick={() => setSelectedConversationId(conv.id)}
                              className="w-full text-left p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium text-slate-900">{conv.title || "Mentor Chat"}</div>
                                <div className="text-sm text-slate-600 mt-1">
                                  {conv.lastMessageAt ? formatDateTime(conv.lastMessageAt) : "No messages yet"}
                                </div>
                              </div>
                              {conv.unreadCount > 0 && (
                                <span className="px-2 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="text-center py-12">
                            <Icon icon="mingcute:message-line" width={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-600 mb-4">No messages yet</p>
                            <button
                              onClick={handleCreateConversation}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                            >
                              Start Conversation
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Activity Tab */}
                {activeTab === "activity" && (
                    <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Activity & Engagement</h3>
                    {progress?.recentActivity && progress.recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {progress.recentActivity.map((activity: any, idx: number) => {
                          const activityDescription = formatActivityDescription(
                            activity.activity_type,
                            activity.activity_data
                          );
                          const activityIcon = getActivityIcon(activity.activity_type);
                          
                          // Get icon color based on activity type
                          const getIconColor = (type: string) => {
                            if (type.includes("completed") || type.includes("achieved")) {
                              return "text-green-600 bg-green-100";
                            }
                            if (type.includes("created") || type.includes("shared")) {
                              return "text-blue-600 bg-blue-100";
                            }
                            if (type.includes("updated") || type.includes("updated")) {
                              return "text-purple-600 bg-purple-100";
                            }
                            if (type.includes("assigned") || type.includes("scheduled")) {
                              return "text-amber-600 bg-amber-100";
                            }
                            if (type.includes("comment") || type.includes("feedback")) {
                              return "text-indigo-600 bg-indigo-100";
                            }
                            return "text-blue-600 bg-blue-100";
                          };
                          
                          return (
                            <div key={idx} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getIconColor(activity.activity_type)}`}>
                                <Icon icon={activityIcon} width={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-900">
                                  {activityDescription}
                              </div>
                                {activity.team_name && (
                                  <div className="text-xs text-slate-500 mt-1">
                                    Team: {activity.team_name}
                                </div>
                              )}
                              <div className="text-xs text-slate-500 mt-2">
                                {formatDateTime(activity.created_at)}
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Icon icon="mingcute:time-line" width={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-600">No recent activity</p>
                      </div>
                    )}

                    {/* Engagement Metrics */}
                    {progress && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <h4 className="font-semibold text-slate-900 mb-3">Engagement Metrics</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-2xl font-bold text-blue-600">{progress.engagementScore || 0}</div>
                            <div className="text-sm text-slate-600">Engagement Score</div>
                            <div className="text-xs text-slate-500 mt-1">Based on last 7 days activity</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">
                              {progress.recentActivity?.length || 0}
                            </div>
                            <div className="text-sm text-slate-600">Recent Activities</div>
                            <div className="text-xs text-slate-500 mt-1">Last 10 activities</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Provide Feedback</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Feedback Type</label>
                <select
                  value={feedbackForm.feedbackType}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, feedbackType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="general">General</option>
                  <option value="resume">Resume</option>
                  <option value="cover_letter">Cover Letter</option>
                  <option value="application">Application</option>
                  <option value="interview_prep">Interview Preparation</option>
                  <option value="goal_progress">Goal Progress</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Feedback</label>
                <textarea
                  value={feedbackForm.feedbackContent}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, feedbackContent: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg h-32"
                  placeholder="Provide detailed feedback..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Recommendations</label>
                <textarea
                  value={feedbackForm.recommendations}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, recommendations: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg h-24"
                  placeholder="Actionable recommendations..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback || !feedbackForm.feedbackContent.trim()}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingFeedback ? (
                    <>
                      <Icon icon="mingcute:loading-line" width={20} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Feedback"
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setFeedbackForm({
                      feedbackType: "general",
                      feedbackContent: "",
                      recommendations: "",
                      relatedItemType: "",
                      relatedItemId: "",
                    });
                  }}
                  className="flex-1 bg-slate-200 text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Assignment Modal */}
      {showTaskModal && selectedMentee && (
        <AssignTaskModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          menteeName={selectedMenteeName}
          menteeId={selectedMentee.menteeId}
          availableTeams={availableTeams}
          onTaskAssigned={handleTaskAssigned}
        />
      )}

      {/* Material Viewer Modal */}
      {viewingMaterial.type && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                {viewingMaterial.type === "resume" && "Resume Details"}
                {viewingMaterial.type === "coverLetter" && "Cover Letter Details"}
                {viewingMaterial.type === "job" && "Job Posting Details"}
              </h3>
              <button
                onClick={() => setViewingMaterial({ type: null, id: null, data: null })}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingMaterial ? (
                <div className="flex items-center justify-center py-12">
                  <Icon icon="mingcute:loading-line" width={32} className="animate-spin text-blue-500" />
                  <span className="ml-3 text-slate-600">Loading...</span>
                </div>
              ) : viewingMaterial.data ? (
                <>
                  {/* Resume Viewer */}
                  {viewingMaterial.type === "resume" && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-lg mb-2">
                          {viewingMaterial.data.name || viewingMaterial.data.version_name || "Resume"}
                        </h4>
                        {viewingMaterial.data.description && (
                          <p className="text-slate-600 text-sm">{viewingMaterial.data.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span>Version {viewingMaterial.data.version_number || 1}</span>
                          {viewingMaterial.data.is_master && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Master</span>
                          )}
                        </div>
                      </div>
                      {viewingMaterial.data.content && (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h5 className="font-semibold text-slate-900 mb-3">Resume Content</h5>
                          <div className="prose max-w-none">
                            {typeof viewingMaterial.data.content === "string" ? (
                              <pre className="whitespace-pre-wrap text-sm">{viewingMaterial.data.content}</pre>
                            ) : (
                              <div className="space-y-4">
                                {viewingMaterial.data.content.personalInfo && (
                                  <div>
                                    <h6 className="font-semibold mb-2">Personal Information</h6>
                                    <pre className="text-sm whitespace-pre-wrap">
                                      {JSON.stringify(viewingMaterial.data.content.personalInfo, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {viewingMaterial.data.content.summary && (
                                  <div>
                                    <h6 className="font-semibold mb-2">Summary</h6>
                                    <p className="text-sm">{viewingMaterial.data.content.summary}</p>
                                  </div>
                                )}
                                {viewingMaterial.data.content.experience && (
                                  <div>
                                    <h6 className="font-semibold mb-2">Experience</h6>
                                    <pre className="text-sm whitespace-pre-wrap">
                                      {JSON.stringify(viewingMaterial.data.content.experience, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {viewingMaterial.data.file && (
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">File:</span> {viewingMaterial.data.file}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cover Letter Viewer */}
                  {viewingMaterial.type === "coverLetter" && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-lg mb-2">
                          {viewingMaterial.data.title || viewingMaterial.data.version_name || "Cover Letter"}
                        </h4>
                        {viewingMaterial.data.description && (
                          <p className="text-slate-600 text-sm">{viewingMaterial.data.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span>Version {viewingMaterial.data.version_number || 1}</span>
                          {viewingMaterial.data.is_master && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Master</span>
                          )}
                        </div>
                      </div>
                      {viewingMaterial.data.content && (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h5 className="font-semibold text-slate-900 mb-3">Cover Letter Content</h5>
                          <div className="prose max-w-none">
                            <pre className="whitespace-pre-wrap text-sm font-sans">
                              {viewingMaterial.data.content}
                            </pre>
                          </div>
                        </div>
                      )}
                      {viewingMaterial.data.tone_settings && (
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Tone:</span> {viewingMaterial.data.tone_settings}
                        </div>
                      )}
                      {viewingMaterial.data.file && (
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">File:</span> {viewingMaterial.data.file}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Job Posting Viewer */}
                  {viewingMaterial.type === "job" && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-lg mb-2">
                          {viewingMaterial.data.title}
                        </h4>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="font-medium text-slate-700">{viewingMaterial.data.company}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-600">{viewingMaterial.data.location}</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {viewingMaterial.data.status}
                          </span>
                        </div>
                      </div>
                      {viewingMaterial.data.job_description && (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h5 className="font-semibold text-slate-900 mb-3">Job Description</h5>
                          <div className="prose max-w-none">
                            <p className="text-sm whitespace-pre-wrap">{viewingMaterial.data.job_description}</p>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {viewingMaterial.data.industry && (
                          <div>
                            <span className="text-sm font-medium text-slate-700">Industry:</span>
                            <span className="text-sm text-slate-600 ml-2">{viewingMaterial.data.industry}</span>
                          </div>
                        )}
                        {viewingMaterial.data.job_type && (
                          <div>
                            <span className="text-sm font-medium text-slate-700">Job Type:</span>
                            <span className="text-sm text-slate-600 ml-2">{viewingMaterial.data.job_type}</span>
                          </div>
                        )}
                        {(viewingMaterial.data.salary_min || viewingMaterial.data.salary_max) && (
                          <div>
                            <span className="text-sm font-medium text-slate-700">Salary:</span>
                            <span className="text-sm text-slate-600 ml-2">
                              {viewingMaterial.data.salary_min && viewingMaterial.data.salary_max
                                ? `$${viewingMaterial.data.salary_min.toLocaleString()} - $${viewingMaterial.data.salary_max.toLocaleString()}`
                                : viewingMaterial.data.salary_min
                                ? `$${viewingMaterial.data.salary_min.toLocaleString()}+`
                                : viewingMaterial.data.salary_max
                                ? `Up to $${viewingMaterial.data.salary_max.toLocaleString()}`
                                : "Not specified"}
                            </span>
                          </div>
                        )}
                        {viewingMaterial.data.application_deadline && (
                          <div>
                            <span className="text-sm font-medium text-slate-700">Deadline:</span>
                            <span className="text-sm text-slate-600 ml-2">
                              {formatDate(viewingMaterial.data.application_deadline)}
                            </span>
                          </div>
                        )}
                      </div>
                      {viewingMaterial.data.job_posting_url && (
                        <div>
                          <a
                            href={viewingMaterial.data.job_posting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                          >
                            <Icon icon="mingcute:external-link-line" width={16} />
                            View Original Posting
                          </a>
                        </div>
                      )}
                      {viewingMaterial.data.notes && (
                        <div className="bg-yellow-50 rounded-lg p-4">
                          <h5 className="font-semibold text-slate-900 mb-2">Notes</h5>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {viewingMaterial.data.notes}
                          </p>
                        </div>
                      )}
                      {(viewingMaterial.data.recruiter_name || viewingMaterial.data.recruiter_email) && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h5 className="font-semibold text-slate-900 mb-2">Recruiter Contact</h5>
                          <div className="text-sm text-slate-700">
                            {viewingMaterial.data.recruiter_name && (
                              <div>Name: {viewingMaterial.data.recruiter_name}</div>
                            )}
                            {viewingMaterial.data.recruiter_email && (
                              <div>Email: {viewingMaterial.data.recruiter_email}</div>
                            )}
                            {viewingMaterial.data.recruiter_phone && (
                              <div>Phone: {viewingMaterial.data.recruiter_phone}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-600">
                  Failed to load material content
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              {viewingMaterial.data && (
                <button
                  onClick={() => {
                    setFeedbackForm({
                      feedbackType: viewingMaterial.type === "resume" ? "resume" : 
                                   viewingMaterial.type === "coverLetter" ? "cover_letter" : "application",
                      feedbackContent: "",
                      recommendations: "",
                      relatedItemType: viewingMaterial.type === "resume" ? "resume" : 
                                     viewingMaterial.type === "coverLetter" ? "cover_letter" : "job",
                      relatedItemId: viewingMaterial.id || "",
                    });
                    setViewingMaterial({ type: null, id: null, data: null });
                    setShowFeedbackModal(true);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
                >
                  <Icon icon="mingcute:edit-line" width={16} />
                  Provide Feedback
                </button>
              )}
              <button
                onClick={() => setViewingMaterial({ type: null, id: null, data: null })}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
