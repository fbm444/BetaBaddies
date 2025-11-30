import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface TeamDashboardProps {
  teamId: string;
}

export function TeamDashboard({ teamId }: TeamDashboardProps) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, [teamId]);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getTeamDashboard(teamId);
      if (response.ok && response.data) {
        setDashboard(response.data.dashboard);
      } else {
        setError("Failed to load team dashboard");
      }
    } catch (err) {
      console.error("Failed to fetch team dashboard:", err);
      setError("Failed to load team dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon icon="mingcute:loading-line" width={32} className="animate-spin text-blue-500" />
        <span className="ml-3 text-slate-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || "Failed to load dashboard"}</p>
      </div>
    );
  }

  const { team, membersByRole, jobSearch, tasks, milestones, collaboration, activityFeed } = dashboard;

  return (
    <div className="space-y-6 min-w-0">
      {/* Team Overview */}
      <div className="bg-white rounded-lg shadow p-6 min-w-0">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-bold text-slate-900 truncate">{team.teamName}</h2>
          <div className="text-sm text-slate-600 whitespace-nowrap">
            {team.activeMembers} / {team.maxMembers} members
          </div>
        </div>

        {/* Members by Role */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-4">
          {Object.entries(membersByRole).map(([role, count]: [string, any]) => (
            <div key={role} className="bg-slate-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-slate-900">{count}</div>
              <div className="text-sm text-slate-600 capitalize">{role.replace('_', ' ')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Job Search Statistics */}
      <div className="bg-white rounded-lg shadow p-6 min-w-0">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Job Search Statistics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {jobSearch?.total_jobs || 0}
            </div>
            <div className="text-sm text-slate-600">Total Jobs</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {jobSearch?.applied_count || 0}
            </div>
            <div className="text-sm text-slate-600">Applications</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {jobSearch?.interview_count || 0}
            </div>
            <div className="text-sm text-slate-600">Interviews</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {jobSearch?.sharedJobs || 0}
            </div>
            <div className="text-sm text-slate-600">Shared Jobs</div>
          </div>
        </div>
      </div>

      {/* Tasks Overview */}
      <div className="bg-white rounded-lg shadow p-6 min-w-0">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Tasks Overview</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-900">
              {tasks?.pending_tasks || 0}
            </div>
            <div className="text-sm text-slate-600">Pending</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {tasks?.in_progress_tasks || 0}
            </div>
            <div className="text-sm text-slate-600">In Progress</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {tasks?.completed_tasks || 0}
            </div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
        </div>
      </div>

      {/* Recent Milestones */}
      {milestones && milestones.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Recent Milestones</h3>
          <div className="space-y-3">
            {milestones.slice(0, 5).map((milestone: any) => (
              <div
                key={milestone.id}
                className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg p-4"
              >
                <div className="flex items-center gap-2">
                  <Icon icon="mingcute:trophy-line" width={24} className="text-yellow-600" />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{milestone.milestoneTitle}</div>
                    <div className="text-sm text-slate-600">
                      {milestone.userName} • {new Date(milestone.achievedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collaboration Metrics */}
      <div className="bg-white rounded-lg shadow p-6 min-w-0">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Collaboration Metrics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-900">
              {collaboration?.job_comments_count || 0}
            </div>
            <div className="text-sm text-slate-600">Job Comments</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-900">
              {collaboration?.feedback_count || 0}
            </div>
            <div className="text-sm text-slate-600">Feedback Given</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-900">
              {collaboration?.messages_last_week || 0}
            </div>
            <div className="text-sm text-slate-600">Messages (7d)</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {collaboration?.engagementScore || 0}
            </div>
            <div className="text-sm text-slate-600">Engagement Score</div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      {activityFeed && activityFeed.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activityFeed.slice(0, 10).map((activity: any) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <Icon
                  icon={getActivityIcon(activity.activityType)}
                  width={20}
                  className="text-slate-600 mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm text-slate-900">
                    <span className="font-medium">{activity.userName}</span>{" "}
                    {getActivityDescription(activity.activityType, activity.activityData)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(activity.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getActivityIcon(activityType: string): string {
  const icons: Record<string, string> = {
    job_shared: "lucide:share-2",
    comment_added: "mingcute:message-line",
    milestone_achieved: "mingcute:trophy-line",
    feedback_provided: "mingcute:feedback-line",
    task_assigned: "mingcute:task-line",
    task_completed: "mingcute:check-circle-line",
    member_invited: "mingcute:user-add-line",
    team_created: "mingcute:team-line",
  };
  return icons[activityType] || "mingcute:activity-line";
}

function getActivityDescription(activityType: string, activityData: any): string {
  const descriptions: Record<string, string> = {
    job_shared: "shared a job posting",
    comment_added: "added a comment",
    milestone_achieved: `achieved milestone: ${activityData?.milestone_title || ""}`,
    feedback_provided: "provided feedback",
    task_assigned: "assigned a task",
    task_completed: "completed a task",
    member_invited: "invited a new member",
    team_created: "created the team",
  };
  return descriptions[activityType] || "performed an action";
}

