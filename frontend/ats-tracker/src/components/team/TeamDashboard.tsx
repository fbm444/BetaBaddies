import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import { MilestoneCard } from "./MilestoneCard";

interface TeamDashboardProps {
  teamId: string;
  refreshKey?: number; // Add refresh key to force refresh
}

export function TeamDashboard({ teamId, refreshKey }: TeamDashboardProps) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  useEffect(() => {
    fetchDashboard();
    // Only fetch insights if not cached (fetchAIInsights checks cache internally)
    fetchAIInsights(false);
  }, [teamId, refreshKey]); // Add refreshKey to dependencies

  // Fetch current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userResponse = await api.getUserAuth();
        if (userResponse.ok && userResponse.data?.user?.id) {
          setCurrentUserId(userResponse.data.user.id);
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

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

  const fetchAIInsights = async (forceRefresh = false) => {
    try {
      setIsLoadingInsights(true);
      
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cacheKey = `team_insights_${teamId}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            const cacheAge = Date.now() - timestamp;
            const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
            
            // Use cached data if it's less than 30 minutes old
            if (cacheAge < CACHE_DURATION) {
              console.log("Using cached AI insights");
              setAiInsights(data);
              setIsLoadingInsights(false);
              return;
            } else {
              console.log("Cache expired, fetching new insights");
              localStorage.removeItem(cacheKey);
            }
          } catch (e) {
            console.warn("Failed to parse cached insights:", e);
            localStorage.removeItem(cacheKey);
          }
        }
      }
      
      // Fetch fresh insights
      const response = await api.getTeamAIInsights(teamId);
      if (response.ok && response.data) {
        const insights = response.data.insights;
        setAiInsights(insights);
        
        // Cache the insights
        const cacheKey = `team_insights_${teamId}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          data: insights,
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.error("Failed to fetch AI insights:", err);
      // Don't set error state - insights are optional
    } finally {
      setIsLoadingInsights(false);
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

      {/* AI Insights Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Icon icon="mingcute:chart-2-line" width={20} height={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Team Performance Insights</h3>
              <p className="text-sm text-slate-600">AI-powered analysis of team success patterns and collaboration</p>
            </div>
          </div>
          <button
            onClick={() => fetchAIInsights(true)}
            disabled={isLoadingInsights}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Icon 
              icon={isLoadingInsights ? "mingcute:loading-line" : "mingcute:refresh-line"} 
              width={18} 
              className={isLoadingInsights ? "animate-spin" : ""} 
            />
            {isLoadingInsights ? "Generating..." : "Refresh Insights"}
          </button>
        </div>

        {isLoadingInsights && !aiInsights && (
          <div className="flex items-center justify-center py-8">
            <Icon icon="mingcute:loading-line" width={32} className="animate-spin text-blue-500" />
            <span className="ml-3 text-slate-600">Generating AI insights...</span>
          </div>
        )}

        {!isLoadingInsights && aiInsights && aiInsights.insights && aiInsights.insights.length > 0 && (
          <div className="space-y-4">
            {aiInsights.insights.map((insight: any, index: number) => (
              <div
                key={index}
                className="bg-white rounded-lg p-5 border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    insight.type === 'success_pattern' ? 'bg-green-100' :
                    insight.type === 'improvement_opportunity' ? 'bg-orange-100' :
                    insight.type === 'collaboration_insight' ? 'bg-blue-100' :
                    insight.type === 'trend_analysis' ? 'bg-purple-100' :
                    'bg-slate-100'
                  }`}>
                    <Icon
                      icon={
                        insight.type === 'success_pattern' ? 'mingcute:trophy-line' :
                        insight.type === 'improvement_opportunity' ? 'mingcute:target-line' :
                        insight.type === 'collaboration_insight' ? 'mingcute:team-line' :
                        insight.type === 'trend_analysis' ? 'mingcute:chart-line' :
                        'mingcute:lightbulb-line'
                      }
                      width={20}
                      className={
                        insight.type === 'success_pattern' ? 'text-green-600' :
                        insight.type === 'improvement_opportunity' ? 'text-orange-600' :
                        insight.type === 'collaboration_insight' ? 'text-blue-600' :
                        insight.type === 'trend_analysis' ? 'text-purple-600' :
                        'text-slate-600'
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-lg font-semibold text-slate-900">{insight.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                        insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                        insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {insight.impact} impact
                      </span>
                    </div>
                    <p className="text-slate-700 mb-3 leading-relaxed">{insight.description}</p>
                    {insight.actionableAdvice && (
                      <div className="bg-slate-50 rounded-lg p-3 border-l-4 border-blue-500">
                        <p className="text-sm font-medium text-slate-900 mb-1">💡 Actionable Advice:</p>
                        <p className="text-sm text-slate-700">{insight.actionableAdvice}</p>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <span className="px-2 py-1 bg-slate-100 rounded capitalize">{insight.category}</span>
                      <span className="px-2 py-1 bg-slate-100 rounded capitalize">{insight.type?.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoadingInsights && (!aiInsights || !aiInsights.insights || aiInsights.insights.length === 0) && (
          <div className="bg-white rounded-lg p-6 border border-slate-200 text-center">
            <Icon icon="mingcute:information-line" width={32} className="text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600">No insights available. Click "Refresh Insights" to generate AI-powered analysis.</p>
          </div>
        )}

        {aiInsights && aiInsights.teamStats && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-slate-600">
              Generated at {new Date(aiInsights.generatedAt).toLocaleString()} • 
              Based on {aiInsights.teamStats.totalMembers} team members • 
              {aiInsights.teamStats.totalApplications} applications • 
              {aiInsights.teamStats.totalInterviews} interviews • 
              {aiInsights.teamStats.totalOffers} offers
            </p>
          </div>
        )}
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
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Icon icon="mingcute:trophy-fill" width={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Recent Milestones</h3>
                <p className="text-sm text-slate-500 mt-0.5">Celebrate team achievements</p>
              </div>
            </div>
            {milestones.length > 5 && (
              <span className="text-sm text-slate-500">Showing 5 of {milestones.length}</span>
            )}
          </div>
          <div className="space-y-4">
            {milestones.slice(0, 5).map((milestone: any) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                currentUserId={currentUserId || undefined}
                onUpdate={fetchDashboard}
              />
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
            {activityFeed.slice(0, 10).map((activity: any) => {
              // If this is a milestone_achieved activity with milestone data, use MilestoneCard
              if (activity.activityType === 'milestone_achieved' && activity.milestone) {
                return (
                  <MilestoneCard
                    key={activity.id}
                    milestone={activity.milestone}
                    currentUserId={currentUserId || undefined}
                    onUpdate={fetchDashboard}
                  />
                );
              }
              
              // Otherwise, render as regular activity item
              const defaultAvatar = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png';
              const userProfilePicture = activity.userProfilePicture;
              
              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  {/* Profile Picture or Person Icon */}
                  {userProfilePicture && !userProfilePicture.includes('blank-profile-picture') ? (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-slate-200">
                      <img 
                        src={userProfilePicture} 
                        alt={activity.userName || "User"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = defaultAvatar;
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border-2 border-slate-300">
                      <Icon
                        icon="mingcute:user-line"
                        width={20}
                        className="text-slate-600"
                      />
                    </div>
                  )}
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getActivityIcon(activityType: string): string {
  const icons: Record<string, string> = {
    interview_scheduled: "mingcute:calendar-line",
    interview_created: "mingcute:calendar-line",
    skill_added: "mingcute:star-line",
    certification_earned: "mingcute:certificate-line",
    certification_added: "mingcute:certificate-line",
    experience_added: "mingcute:briefcase-line",
    job_added: "mingcute:briefcase-line",
    milestone_achieved: "mingcute:trophy-line",
    // Keep some legacy types for backwards compatibility
    job_shared: "lucide:share-2",
    comment_added: "mingcute:message-line",
    feedback_provided: "mingcute:feedback-line",
    task_assigned: "mingcute:task-line",
    task_completed: "mingcute:check-circle-line",
    member_invited: "mingcute:user-add-line",
    team_created: "mingcute:team-line",
  };
  return icons[activityType] || "mingcute:activity-line";
}

function getActivityDescription(activityType: string, activityData: any): string {
  // Parse activity data if it's a string
  const data = typeof activityData === "string" 
    ? (() => { try { return JSON.parse(activityData); } catch { return {}; } })()
    : activityData || {};

  const descriptions: Record<string, string> = {
    interview_scheduled: data.interview_type || data.company
      ? `scheduled ${data.interview_type ? data.interview_type.replace(/_/g, " ") : ""} interview${data.company ? ` at ${data.company}` : ""}`
      : "scheduled an interview",
    interview_created: data.interview_type || data.company
      ? `scheduled ${data.interview_type ? data.interview_type.replace(/_/g, " ") : ""} interview${data.company ? ` at ${data.company}` : ""}`
      : "scheduled an interview",
    skill_added: data.skill_name || data.skill
      ? `added skill: ${data.skill_name || data.skill}`
      : "added a new skill",
    certification_earned: data.certification_name || data.certification
      ? `earned certification: ${data.certification_name || data.certification}`
      : "earned a certification",
    certification_added: data.certification_name || data.certification
      ? `added certification: ${data.certification_name || data.certification}`
      : "added a certification",
    experience_added: data.job_title || data.title
      ? `added experience: ${data.job_title || data.title}${data.company ? ` at ${data.company}` : ""}`
      : "added work experience",
    job_added: data.job_title || data.title
      ? `added experience: ${data.job_title || data.title}${data.company ? ` at ${data.company}` : ""}`
      : "added work experience",
    milestone_achieved: data.milestone_title
      ? `achieved milestone: ${data.milestone_title}`
      : data.milestone_type
      ? `achieved ${data.milestone_type.replace(/_/g, " ")} milestone`
      : "achieved a milestone",
    // Keep some legacy types for backwards compatibility
    job_shared: "shared a job posting",
    comment_added: "added a comment",
    feedback_provided: "provided feedback",
    task_assigned: "assigned a task",
    task_completed: "completed a task",
    member_invited: "invited a new member",
    team_created: "created the team",
  };
  return descriptions[activityType] || "performed an action";
}

