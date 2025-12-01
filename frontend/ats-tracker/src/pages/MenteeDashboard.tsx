import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";

export function MenteeDashboard() {
  const navigate = useNavigate();
  const [mentor, setMentor] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [mentorActivityFeed, setMentorActivityFeed] = useState<any[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "feedback" | "tasks">("overview");
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const [subtaskStatuses, setSubtaskStatuses] = useState<Record<string, Record<number, boolean>>>({});

  useEffect(() => {
    fetchDashboardData();
    fetchMentorActivityFeed();
  }, []);

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
      const [mentorResponse, progressResponse, feedbackResponse, tasksResponse] = await Promise.all([
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon icon="mingcute:loading-line" width={48} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Mentee Dashboard</h1>
        <p className="text-slate-600">Track your progress and connect with your mentor</p>
      </div>

      {/* Mentor Information Card */}
      {mentor ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {mentor.fullName?.charAt(0)?.toUpperCase() || mentor.email?.charAt(0)?.toUpperCase() || "M"}
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
                      <Icon icon="mingcute:linkedin-line" width={18} className="mr-1" />
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
                      <Icon icon="mingcute:github-line" width={18} className="mr-1" />
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
            <Icon icon="mingcute:user-star-line" width={48} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Mentor Assigned</h3>
            <p className="text-slate-600 text-sm mb-4">
              Mentor relationships are created when you join a team with mentors, or when mentors join your team.
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
            { id: "feedback", label: "Feedback", icon: "mingcute:message-line" },
            { id: "tasks", label: "Tasks", icon: "mingcute:task-line" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Icon icon={tab.icon} width={20} />
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
                    <h3 className="text-sm font-medium text-slate-600">Job Applications</h3>
                    <Icon icon="mingcute:briefcase-line" width={24} className="text-blue-500" />
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
                    <h3 className="text-sm font-medium text-slate-600">Tasks</h3>
                    <Icon icon="mingcute:task-line" width={24} className="text-green-500" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {progress.tasks?.completed_tasks || 0}/{progress.tasks?.total_tasks || 0}
                  </div>
                  <div className="text-sm text-slate-500">
                    {progress.tasks?.pending_tasks || 0} pending
                  </div>
                </div>

                {/* Engagement Score */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-600">Engagement</h3>
                    <Icon icon="mingcute:fire-line" width={24} className="text-orange-500" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {progress.engagementScore || 0}%
                  </div>
                  <div className="text-sm text-slate-500">Last 7 days</div>
                </div>

              {/* Feedback Received */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-600">Feedback</h3>
                  <Icon icon="mingcute:message-line" width={24} className="text-purple-500" />
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
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Mentor Activity</h2>
                  <p className="text-sm text-slate-500">See what your mentor has been up to</p>
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
                  <Icon icon="mingcute:loading-line" width={32} className="animate-spin text-blue-500" />
                  <span className="ml-3 text-slate-600">Loading activity feed...</span>
                        </div>
              ) : mentorActivityFeed.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <Icon icon="mingcute:activity-line" width={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">No Activity Yet</h3>
                  <p className="text-slate-600 text-sm">Your mentor hasn't taken any actions yet. Check back soon!</p>
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
                            ? `Commented on ${item.metadata.documentType.replace(/_/g, " ")}: ${item.metadata.documentName}`
                            : item.title;
                        case "message_sent":
                          return item.title;
                        default:
                          return item.title;
                      }
                    };

                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
                      >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(item.type)}`}>
                          <Icon icon={getActivityIcon(item.type, item.metadata)} width={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <div className="font-semibold text-slate-900">
                                {formatActivityTitle(item)}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                by {item.mentorName || mentor?.fullName || mentor?.email || "your mentor"}
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
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.metadata.status)}`}>
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
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => navigate(ROUTES.JOB_OPPORTUNITIES)}
                    className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                  >
                    <Icon icon="mingcute:add-line" width={24} className="text-blue-600" />
                    <div>
                      <div className="font-medium text-slate-900">Add Job</div>
                      <div className="text-xs text-slate-600">Track a new opportunity</div>
                    </div>
                  </button>
                  <button
                    onClick={() => navigate(ROUTES.INTERVIEW_PREPARATION)}
                    className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
                  >
                    <Icon icon="mingcute:book-line" width={24} className="text-purple-600" />
                    <div>
                      <div className="font-medium text-slate-900">Prepare</div>
                      <div className="text-xs text-slate-600">Interview prep</div>
                    </div>
                  </button>
                  <button
                    onClick={() => navigate(ROUTES.RESUMES)}
                    className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
                  >
                    <Icon icon="mingcute:file-line" width={24} className="text-green-600" />
                    <div>
                      <div className="font-medium text-slate-900">Resume</div>
                      <div className="text-xs text-slate-600">Update resume</div>
                    </div>
                  </button>
                  <button
                    onClick={() => navigate(ROUTES.DOCUMENT_REVIEWS)}
                    className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left"
                  >
                    <Icon icon="mingcute:file-edit-line" width={24} className="text-orange-600" />
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
          {feedback.length > 0 ? (
            feedback.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      <Icon icon={getFeedbackTypeIcon(item.feedbackType)} width={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {item.mentor?.fullName || item.mentor?.email || "Mentor"}
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
                  <p className="text-slate-700 whitespace-pre-wrap">{item.feedbackContent}</p>
                </div>
                {item.recommendations && (
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="text-sm font-semibold text-blue-900 mb-1">Recommendations</div>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{item.recommendations}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-12 text-center">
              <Icon icon="mingcute:message-line" width={48} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No Feedback Yet</h3>
              <p className="text-slate-600 text-sm">Your mentor hasn't provided feedback yet. Check back soon!</p>
            </div>
          )}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">My Tasks</h2>
              <p className="text-sm text-slate-500">Tasks assigned by your mentor</p>
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
              const taskDescription = task.task_description || task.taskDescription;
              const taskType = task.task_type || task.taskType;
              const dueDate = task.due_date || task.dueDate;
              const createdAt = task.created_at || task.createdAt;
              const taskData = task.task_data || task.taskData || {};
              const subtasks = Array.isArray(taskData.subtasks) ? taskData.subtasks : [];
              const linkedJobId = taskData.linkedJobId;
              const linkedResumeId = taskData.linkedResumeId;
              const linkedCoverLetterId = taskData.linkedCoverLetterId;
              const taskSubtaskStatuses = subtaskStatuses[task.id] || {};
              const isOverdue = dueDate && new Date(dueDate) < new Date() && task.status !== "completed" && task.status !== "cancelled";
              const isCompleted = task.status === "completed";

              const handleToggleComplete = async () => {
                if (isUpdating) return;
                try {
                  setUpdatingTasks(prev => new Set(prev).add(task.id));
                  const newStatus = isCompleted ? "pending" : "completed";
                  await api.updateTaskStatus(task.id, newStatus);
                  await fetchDashboardData();
                } catch (error) {
                  console.error("Failed to update task:", error);
                  alert("Failed to update task. Please try again.");
                } finally {
                  setUpdatingTasks(prev => {
                    const next = new Set(prev);
                    next.delete(task.id);
                    return next;
                  });
                }
              };

              const toggleExpand = () => {
                setExpandedTasks(prev => {
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
                          } ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {isCompleted && (
                            <Icon icon="mingcute:check-line" width={16} />
                          )}
                        </button>
                      </div>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div
                          className="cursor-pointer"
                          onClick={toggleExpand}
              >
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`p-2 rounded-lg flex-shrink-0 ${
                                isCompleted ? "bg-green-100" :
                                task.status === "in_progress" ? "bg-blue-100" :
                                "bg-amber-100"
                              }`}>
                                <Icon
                                  icon={getTaskTypeIcon(taskType)}
                                  width={24}
                                  className={
                                    isCompleted ? "text-green-600" :
                                    task.status === "in_progress" ? "text-blue-600" :
                                    "text-amber-600"
                                  }
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={`text-lg font-bold ${isCompleted ? "line-through text-slate-500" : "text-slate-900"}`}>
                                    {taskTitle}
                                  </h3>
                                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                                    {task.status?.replace("_", " ")}
                                  </span>
                                  {isOverdue && !isCompleted && (
                                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                      Overdue
                                    </span>
                                  )}
                                </div>
                                {!isExpanded && taskDescription && (
                                  <p className="text-sm text-slate-600 line-clamp-2">{taskDescription}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                                  <span className="flex items-center gap-1">
                                    <Icon icon="mingcute:tag-line" width={14} />
                                    {taskType?.replace(/_/g, " ")}
                                  </span>
                                  {dueDate && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span className={`flex items-center gap-1 ${isOverdue && !isCompleted ? "text-red-600 font-medium" : ""}`}>
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
                            <Icon
                              icon={isExpanded ? "mingcute:up-line" : "mingcute:down-line"}
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
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Description</h4>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{taskDescription}</p>
                  </div>
                            )}

                            {/* Subtasks */}
                            {subtasks.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Subtasks</h4>
                                <div className="space-y-2">
                                  {subtasks.map((subtask: string, index: number) => (
                                    <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                    <button
                                        type="button"
                                        onClick={() => {
                                          setSubtaskStatuses(prev => ({
                                            ...prev,
                                            [task.id]: {
                                              ...(prev[task.id] || {}),
                                              [index]: !(prev[task.id]?.[index] || false)
                                            }
                                          }));
                                        }}
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                          taskSubtaskStatuses[index]
                                            ? "bg-green-500 border-green-500 text-white"
                                            : "border-slate-300 hover:border-green-500"
                                        }`}
                                      >
                                        {taskSubtaskStatuses[index] && (
                                          <Icon icon="mingcute:check-line" width={14} />
                                        )}
                                      </button>
                                      <span className={`text-sm flex-1 ${taskSubtaskStatuses[index] ? "line-through text-slate-400" : "text-slate-700"}`}>
                                        {subtask}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Linked Resources */}
                            {(linkedJobId || linkedResumeId || linkedCoverLetterId) && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Linked Resources</h4>
                                <div className="space-y-2">
                                  {linkedJobId && (
                                    <button
                                      onClick={() => navigate(`${ROUTES.JOB_OPPORTUNITIES}?jobId=${linkedJobId}`)}
                                      className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition text-left"
                                    >
                                      <Icon icon="mingcute:briefcase-line" width={20} className="text-blue-600" />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-blue-900">View Job Opportunity</div>
                                        <div className="text-xs text-blue-700">Click to open linked job</div>
                                      </div>
                                      <Icon icon="mingcute:arrow-right-line" width={18} className="text-blue-600" />
                                    </button>
                                  )}
                                  {linkedResumeId && (
                                    <button
                                      onClick={() => navigate(`${ROUTES.RESUME_BUILDER}?id=${linkedResumeId}`)}
                                      className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition text-left"
                                    >
                                      <Icon icon="mingcute:file-text-line" width={20} className="text-green-600" />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-green-900">View Resume</div>
                                        <div className="text-xs text-green-700">Click to open linked resume</div>
                                      </div>
                                      <Icon icon="mingcute:arrow-right-line" width={18} className="text-green-600" />
                                    </button>
                                  )}
                                  {linkedCoverLetterId && (
                                    <button
                                      onClick={() => navigate(`${ROUTES.COVER_LETTER_BUILDER}?id=${linkedCoverLetterId}`)}
                                      className="w-full flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition text-left"
                                    >
                                      <Icon icon="mingcute:mail-line" width={20} className="text-purple-600" />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-purple-900">View Cover Letter</div>
                                        <div className="text-xs text-purple-700">Click to open linked cover letter</div>
                                      </div>
                                      <Icon icon="mingcute:arrow-right-line" width={18} className="text-purple-600" />
                    </button>
                  )}
                </div>
              </div>
                            )}

                            {/* Assigned By Section */}
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                  {(task.assigned_by_name || task.assignedByName || task.assigned_by_email || task.assignedByEmail || "M")?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-slate-900">
                                    Assigned by {task.assigned_by_name || task.assignedByName || task.assigned_by_email || task.assignedByEmail || "Mentor"}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {(task.assigned_by_role || task.assignedByRole) ? 
                                      `${(task.assigned_by_role || task.assignedByRole).replace(/_/g, " ")} • ` : ""}
                                      {formatDateTime(createdAt)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {isCompleted && task.completed_at && (
                              <div className="flex items-center gap-2 text-sm text-green-700">
                                <Icon icon="mingcute:check-circle-line" width={18} />
                                <span className="font-medium">Completed on {formatDate(task.completed_at || task.completedAt)}</span>
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
                <Icon icon="mingcute:task-line" width={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No Tasks Assigned</h3>
              <p className="text-slate-600 text-sm">You don't have any tasks from your mentor yet. Check back soon!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

