import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";

export function MentorDashboard() {
  const navigate = useNavigate();
  const [mentees, setMentees] = useState<any[]>([]);
  const [selectedMentee, setSelectedMentee] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [materials, setMaterials] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMenteeData, setIsLoadingMenteeData] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
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

  useEffect(() => {
    fetchMentees();
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await api.getUserTeams();
      if (response.ok && response.data) {
        setAvailableTeams(response.data.teams || []);
        // Set default team if available
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
      // Reset data when switching mentees
      setProgress(null);
      setInsights(null);
      setMaterials(null);
      fetchMenteeData(selectedMentee.menteeId);
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
      const [progressResponse, insightsResponse, materialsResponse] = await Promise.all([
        api.getMenteeProgress(menteeId),
        api.getCoachingInsights(menteeId),
        api.getMenteeMaterials(menteeId),
      ]);

      if (progressResponse.ok && progressResponse.data) {
        setProgress(progressResponse.data.progress);
      } else {
        // Set default progress structure if request fails
        setProgress({
          jobSearch: { total_jobs: 0, applied_count: 0, interview_count: 0 },
          engagementScore: 0
        });
      }

      if (insightsResponse.ok && insightsResponse.data) {
        setInsights(insightsResponse.data.insights);
      }

      if (materialsResponse.ok && materialsResponse.data) {
        setMaterials(materialsResponse.data.materials);
      }
    } catch (error) {
      console.error("Failed to fetch mentee data:", error);
      // Set default values on error so UI still renders
      setProgress({
        jobSearch: { total_jobs: 0, applied_count: 0, interview_count: 0 },
        engagementScore: 0
      });
    } finally {
      setIsLoadingMenteeData(false);
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
        <p className="text-slate-600">You don't have any mentees assigned. Mentees will appear here once they accept your mentorship invitation.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Mentor Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mentee List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-slate-900 mb-4">Your Mentees</h2>
            <div className="space-y-2">
              {mentees.map((mentee) => (
                <button
                  key={mentee.menteeId}
                  onClick={() => setSelectedMentee(mentee)}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    selectedMentee?.menteeId === mentee.menteeId
                      ? "bg-blue-50 border-2 border-blue-500"
                      : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-medium text-slate-900">{mentee.email}</div>
                  <div className="text-sm text-slate-600">{mentee.relationshipType || "Mentee"}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mentee Details */}
        {selectedMentee && (
          <div className="lg:col-span-2 space-y-6">
            {isLoadingMenteeData ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-center py-12">
                  <Icon icon="mingcute:loading-line" width={32} className="animate-spin text-blue-500" />
                  <span className="ml-3 text-slate-600">Loading mentee data...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Progress Summary */}
                {progress && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">
                      {selectedMentee.email}'s Progress
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-600">
                          {progress.jobSearch?.total_jobs || 0}
                        </div>
                        <div className="text-sm text-slate-600">Total Jobs</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600">
                          {progress.jobSearch?.applied_count || 0}
                        </div>
                        <div className="text-sm text-slate-600">Applications</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-600">
                          {progress.jobSearch?.interview_count || 0}
                        </div>
                        <div className="text-sm text-slate-600">Interviews</div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-yellow-600">
                          {progress.engagementScore || 0}
                        </div>
                        <div className="text-sm text-slate-600">Engagement</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Coaching Insights */}
                {insights && insights.insights && insights.insights.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Coaching Insights</h3>
                    <div className="space-y-3">
                      {insights.insights.map((insight: any, idx: number) => (
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
                          <div className="text-sm font-medium text-blue-600 mt-2">
                            💡 {insight.recommendation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materials */}
                {materials && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-900">Application Materials</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowFeedbackModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                        >
                          <Icon icon="mingcute:message-line" width={16} />
                          Provide Feedback
                        </button>
                        <button
                          onClick={() => setShowTaskModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium"
                        >
                          <Icon icon="mingcute:task-line" width={16} />
                          Assign Task
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {materials.resumes && materials.resumes.length > 0 ? (
                        <div>
                          <h4 className="font-semibold text-slate-700 mb-2">Resumes</h4>
                          <div className="space-y-2">
                            {materials.resumes.map((resume: any) => (
                              <div key={resume.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                                <span className="font-medium">{resume.name}</span>
                                <button
                                  onClick={() => {
                                    setFeedbackForm({
                                      feedbackType: "resume",
                                      feedbackContent: "",
                                      recommendations: "",
                                      relatedItemType: "resume",
                                      relatedItemId: resume.id,
                                    });
                                    setShowFeedbackModal(true);
                                  }}
                                  className="ml-3 flex-shrink-0 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                                >
                                  <Icon icon="mingcute:edit-line" width={16} />
                                  Review
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm">No resumes available</p>
                      )}
                      {materials.coverLetters && materials.coverLetters.length > 0 ? (
                        <div>
                          <h4 className="font-semibold text-slate-700 mb-2">Cover Letters</h4>
                          <div className="space-y-2">
                            {materials.coverLetters.map((coverLetter: any) => (
                              <div key={coverLetter.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{coverLetter.title || "Untitled Cover Letter"}</div>
                                  <div className="text-sm text-slate-600">
                                    Updated {new Date(coverLetter.updated_at).toLocaleDateString()}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setFeedbackForm({
                                      feedbackType: "cover_letter",
                                      feedbackContent: "",
                                      recommendations: "",
                                      relatedItemType: "cover_letter",
                                      relatedItemId: coverLetter.id,
                                    });
                                    setShowFeedbackModal(true);
                                  }}
                                  className="ml-3 flex-shrink-0 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                                >
                                  <Icon icon="mingcute:edit-line" width={16} />
                                  Review
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm">No cover letters available</p>
                      )}
                      {materials.jobs && materials.jobs.length > 0 ? (
                        <div>
                          <h4 className="font-semibold text-slate-700 mb-2">Job Applications</h4>
                          <div className="space-y-2">
                            {materials.jobs.slice(0, 5).map((job: any) => (
                              <div key={job.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{job.title} at {job.company}</div>
                                  <div className="text-sm text-slate-600">Status: {job.status}</div>
                                </div>
                                <button
                                  onClick={() => {
                                    setFeedbackForm({
                                      ...feedbackForm,
                                      relatedItemType: "job_application",
                                      relatedItemId: job.id,
                                    });
                                    setShowFeedbackModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                  Review
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm">No job applications available</p>
                      )}
                      {(!materials.resumes || materials.resumes.length === 0) && 
                       (!materials.coverLetters || materials.coverLetters.length === 0) &&
                       (!materials.jobs || materials.jobs.length === 0) && (
                        <p className="text-slate-500 text-sm">No application materials available</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Provide Feedback Modal */}
      {showFeedbackModal && selectedMentee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Provide Feedback</h3>
                {feedbackForm.relatedItemType && feedbackForm.relatedItemId && (
                  <p className="text-sm text-slate-600 mt-1">
                    Reviewing: <span className="font-medium capitalize">
                      {feedbackForm.relatedItemType === "resume" && "Resume"}
                      {feedbackForm.relatedItemType === "cover_letter" && "Cover Letter"}
                      {feedbackForm.relatedItemType === "job_application" && "Job Application"}
                    </span>
                  </p>
                )}
              </div>
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
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!feedbackForm.feedbackContent.trim() || isSubmittingFeedback) return;

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
                    alert("Feedback provided successfully!");
                    // Refresh mentee data
                    await fetchMenteeData(selectedMentee.menteeId);
                  } else {
                    alert(response.error || "Failed to provide feedback");
                  }
                } catch (error) {
                  console.error("Failed to provide feedback:", error);
                  alert("Failed to provide feedback. Please try again.");
                } finally {
                  setIsSubmittingFeedback(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Feedback Type
                </label>
                <select
                  value={feedbackForm.feedbackType}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, feedbackType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!!(feedbackForm.relatedItemType && feedbackForm.relatedItemId)}
                >
                  <option value="general">General Feedback</option>
                  <option value="resume">Resume Feedback</option>
                  <option value="cover_letter">Cover Letter Feedback</option>
                  <option value="interview_prep">Interview Preparation</option>
                  <option value="application_strategy">Application Strategy</option>
                </select>
                {feedbackForm.relatedItemType && feedbackForm.relatedItemId && (
                  <p className="text-xs text-slate-500 mt-1">
                    Feedback type is automatically set based on the selected document
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Feedback Content
                </label>
                <textarea
                  value={feedbackForm.feedbackContent}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, feedbackContent: e.target.value })}
                  placeholder="Provide detailed feedback..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Recommendations (Optional)
                </label>
                <textarea
                  value={feedbackForm.recommendations}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, recommendations: e.target.value })}
                  placeholder="Specific recommendations for improvement..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
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
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback || !feedbackForm.feedbackContent.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  {isSubmittingFeedback ? (
                    <>
                      <Icon icon="mingcute:loading-line" width={18} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Icon icon="mingcute:check-line" width={18} />
                      Submit Feedback
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showTaskModal && selectedMentee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Assign Preparation Task</h3>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setTaskForm({
                    taskType: "interview_prep",
                    taskTitle: "",
                    taskDescription: "",
                    dueDate: "",
                  });
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!taskForm.taskTitle.trim() || isSubmittingTask) return;

                try {
                  setIsSubmittingTask(true);
                  // Get team ID from mentee relationship or use a default
                  // For now, we'll need to get team context - this might need adjustment
                  if (!taskForm.teamId) {
                    alert("Please select a team to assign the task.");
                    return;
                  }

                  const response = await api.assignTask({
                    assignedTo: selectedMentee.menteeId,
                    teamId: taskForm.teamId,
                    taskType: taskForm.taskType,
                    taskTitle: taskForm.taskTitle,
                    taskDescription: taskForm.taskDescription,
                    dueDate: taskForm.dueDate || undefined,
                  });
                  if (response.ok) {
                    setShowTaskModal(false);
                    setTaskForm({
                      taskType: "interview_prep",
                      taskTitle: "",
                      taskDescription: "",
                      dueDate: "",
                      teamId: availableTeams.length > 0 ? availableTeams[0].id : "",
                    });
                    alert("Task assigned successfully!");
                    // Refresh mentee data
                    await fetchMenteeData(selectedMentee.menteeId);
                  } else {
                    alert(response.error || "Failed to assign task");
                  }
                } catch (error) {
                  console.error("Failed to assign task:", error);
                  alert("Failed to assign task. Please try again.");
                } finally {
                  setIsSubmittingTask(false);
                }
              }}
              className="space-y-4"
            >
              {availableTeams.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Team
                  </label>
                  <select
                    value={taskForm.teamId}
                    onChange={(e) => setTaskForm({ ...taskForm, teamId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a team...</option>
                    {availableTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.teamName}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Both you and the mentee must be members of the selected team
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Task Type
                </label>
                <select
                  value={taskForm.taskType}
                  onChange={(e) => setTaskForm({ ...taskForm, taskType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="interview_prep">Interview Preparation</option>
                  <option value="resume_review">Resume Review</option>
                  <option value="cover_letter_review">Cover Letter Review</option>
                  <option value="networking">Networking</option>
                  <option value="skill_development">Skill Development</option>
                  <option value="application_followup">Application Follow-up</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  value={taskForm.taskTitle}
                  onChange={(e) => setTaskForm({ ...taskForm, taskTitle: e.target.value })}
                  placeholder="e.g., Prepare for technical interview at Google"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Task Description
                </label>
                <textarea
                  value={taskForm.taskDescription}
                  onChange={(e) => setTaskForm({ ...taskForm, taskDescription: e.target.value })}
                  placeholder="Provide detailed instructions for the task..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setTaskForm({
                      taskType: "interview_prep",
                      taskTitle: "",
                      taskDescription: "",
                      dueDate: "",
                      teamId: availableTeams.length > 0 ? availableTeams[0].id : "",
                    });
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask || !taskForm.taskTitle.trim()}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  {isSubmittingTask ? (
                    <>
                      <Icon icon="mingcute:loading-line" width={18} className="animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Icon icon="mingcute:check-line" width={18} />
                      Assign Task
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

