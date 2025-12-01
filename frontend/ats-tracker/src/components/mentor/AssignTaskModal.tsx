import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  menteeName: string;
  menteeId: string;
  availableTeams: any[];
  onTaskAssigned: () => void;
}

export function AssignTaskModal({
  isOpen,
  onClose,
  menteeName,
  menteeId,
  availableTeams,
  onTaskAssigned,
}: AssignTaskModalProps) {
  const [taskForm, setTaskForm] = useState({
    taskType: "interview_prep",
    taskTitle: "",
    taskDescription: "",
    dueDate: "",
    teamId: availableTeams.length > 0 ? availableTeams[0].id : "",
    subtasks: [] as string[],
    linkedJobId: "",
    linkedResumeId: "",
    linkedCoverLetterId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");

  // Load resources when modal opens
  useEffect(() => {
    if (isOpen) {
      loadResources();
    }
  }, [isOpen, menteeId]);

  const loadResources = async () => {
    try {
      setIsLoadingResources(true);
      const [jobsResponse, resumesResponse, coverLettersResponse] = await Promise.all([
        api.getMenteeJobs(menteeId),
        api.getMenteeResumes(menteeId),
        api.getMenteeCoverLetters(menteeId),
      ]);

      if (jobsResponse.ok && jobsResponse.data) {
        setJobs(jobsResponse.data.jobs || []);
      }
      if (resumesResponse.ok && resumesResponse.data) {
        setResumes(resumesResponse.data.resumes || []);
      }
      if (coverLettersResponse.ok && coverLettersResponse.data) {
        setCoverLetters(coverLettersResponse.data.coverLetters || []);
      }
    } catch (error) {
      console.error("Failed to load resources:", error);
    } finally {
      setIsLoadingResources(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskForm.taskTitle.trim()) {
      setError("Task title is required");
      return;
    }

    if (!taskForm.teamId) {
      setError("Please select a team");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const { api } = await import("../../services/api");
      const response = await api.assignTask({
        assignedTo: menteeId,
        teamId: taskForm.teamId,
        taskType: taskForm.taskType,
        taskTitle: taskForm.taskTitle,
        taskDescription: taskForm.taskDescription || undefined,
        dueDate: taskForm.dueDate || undefined,
        taskData: {
          subtasks: taskForm.subtasks.filter(s => s.trim()),
          linkedJobId: taskForm.linkedJobId || undefined,
          linkedResumeId: taskForm.linkedResumeId || undefined,
          linkedCoverLetterId: taskForm.linkedCoverLetterId || undefined,
        },
      });

      if (response.ok) {
        // Reset form
        setTaskForm({
          taskType: "interview_prep",
          taskTitle: "",
          taskDescription: "",
          dueDate: "",
          teamId: availableTeams.length > 0 ? availableTeams[0].id : "",
          subtasks: [],
          linkedJobId: "",
          linkedResumeId: "",
          linkedCoverLetterId: "",
        });
        setNewSubtask("");
        onTaskAssigned();
        onClose();
      } else {
        setError(response.error?.message || "Failed to assign task. Please try again.");
      }
    } catch (err: any) {
      console.error("Failed to assign task:", err);
      setError(err.message || "Failed to assign task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const taskTypeOptions = [
    { value: "interview_prep", label: "Interview Preparation", icon: "mingcute:chat-3-line" },
    { value: "resume_review", label: "Resume Review", icon: "mingcute:file-text-line" },
    { value: "cover_letter_review", label: "Cover Letter Review", icon: "mingcute:mail-line" },
    { value: "application", label: "Job Application", icon: "mingcute:briefcase-line" },
    { value: "resume_update", label: "Resume Update", icon: "mingcute:edit-line" },
    { value: "skill_development", label: "Skill Development", icon: "mingcute:book-line" },
    { value: "networking", label: "Networking", icon: "mingcute:user-group-line" },
    { value: "other", label: "Other", icon: "mingcute:more-2-line" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Assign Preparation Task</h2>
            <p className="text-sm text-slate-500 mt-1">Assign a task to {menteeName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Task Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Task Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {taskTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTaskForm({ ...taskForm, taskType: option.value })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    taskForm.taskType === option.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      icon={option.icon}
                      width={24}
                      className={
                        taskForm.taskType === option.value ? "text-blue-600" : "text-slate-400"
                      }
                    />
                    <span
                      className={`font-medium ${
                        taskForm.taskType === option.value ? "text-blue-900" : "text-slate-700"
                      }`}
                    >
                      {option.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={taskForm.taskTitle}
              onChange={(e) => setTaskForm({ ...taskForm, taskTitle: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Prepare for technical interview at Google"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={taskForm.taskDescription}
              onChange={(e) => setTaskForm({ ...taskForm, taskDescription: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
              placeholder="Provide detailed instructions for this task..."
            />
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Subtasks
            </label>
            <div className="space-y-2">
              {taskForm.subtasks.map((subtask, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={subtask}
                    onChange={(e) => {
                      const newSubtasks = [...taskForm.subtasks];
                      newSubtasks[index] = e.target.value;
                      setTaskForm({ ...taskForm, subtasks: newSubtasks });
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Enter subtask..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newSubtasks = taskForm.subtasks.filter((_, i) => i !== index);
                      setTaskForm({ ...taskForm, subtasks: newSubtasks });
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Icon icon="mingcute:delete-line" width={20} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newSubtask.trim()) {
                      e.preventDefault();
                      setTaskForm({
                        ...taskForm,
                        subtasks: [...taskForm.subtasks, newSubtask.trim()],
                      });
                      setNewSubtask("");
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Add a subtask (press Enter to add)"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSubtask.trim()) {
                      setTaskForm({
                        ...taskForm,
                        subtasks: [...taskForm.subtasks, newSubtask.trim()],
                      });
                      setNewSubtask("");
                    }
                  }}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                >
                  <Icon icon="mingcute:add-line" width={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Linked Resources */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Link to Resources (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Link to Job */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Job Opportunity
                </label>
                <select
                  value={taskForm.linkedJobId}
                  onChange={(e) => setTaskForm({ ...taskForm, linkedJobId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">None</option>
                  {isLoadingResources ? (
                    <option disabled>Loading...</option>
                  ) : jobs.length === 0 ? (
                    <option disabled>No jobs available</option>
                  ) : (
                    jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} - {job.company}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Link to Resume */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Resume
                </label>
                <select
                  value={taskForm.linkedResumeId}
                  onChange={(e) => setTaskForm({ ...taskForm, linkedResumeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">None</option>
                  {isLoadingResources ? (
                    <option disabled>Loading...</option>
                  ) : resumes.length === 0 ? (
                    <option disabled>No resumes available</option>
                  ) : (
                    resumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>
                        {resume.name || resume.version_name || `Resume ${resume.version_number || ""}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Link to Cover Letter */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Cover Letter
                </label>
                <select
                  value={taskForm.linkedCoverLetterId}
                  onChange={(e) => setTaskForm({ ...taskForm, linkedCoverLetterId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">None</option>
                  {isLoadingResources ? (
                    <option disabled>Loading...</option>
                  ) : coverLetters.length === 0 ? (
                    <option disabled>No cover letters available</option>
                  ) : (
                    coverLetters.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.version_name || cl.title || `Cover Letter ${cl.version_number || ""}`}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Due Date and Team */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Team <span className="text-red-500">*</span>
              </label>
              <select
                value={taskForm.teamId}
                onChange={(e) => setTaskForm({ ...taskForm, teamId: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a team...</option>
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !taskForm.taskTitle.trim() || !taskForm.teamId}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icon icon="mingcute:loading-line" width={20} className="animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Icon icon="mingcute:check-line" width={20} />
                  Assign Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

