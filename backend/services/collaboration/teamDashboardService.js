import database from "../database.js";
import { teamService } from "./index.js";

/**
 * Service for Team Dashboard with Aggregate Statistics (UC-108)
 * Provides team-wide analytics and collaboration metrics
 */
class TeamDashboardService {
  /**
   * Get team dashboard with aggregate statistics
   */
  async getTeamDashboard(teamId, userId) {
    try {
      // Verify user is team member
      const member = await database.query(
        `SELECT role, permissions FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, userId]
      );

      if (member.rows.length === 0) {
        throw new Error("You are not a member of this team");
      }

      const permissions = typeof member.rows[0].permissions === "string"
        ? JSON.parse(member.rows[0].permissions)
        : member.rows[0].permissions;

      // Get team info
      const teamResult = await database.query(
        `SELECT * FROM teams WHERE id = $1`,
        [teamId]
      );
      const team = teamResult.rows[0];

      // Get team members count by role
      const membersByRole = await database.query(
        `SELECT 
          role,
          COUNT(*) as count
         FROM team_members
         WHERE team_id = $1 AND active = true
         GROUP BY role`,
        [teamId]
      );

      // Get aggregate job search statistics
      const jobStats = await database.query(
        `SELECT 
          COUNT(DISTINCT jo.id) as total_jobs,
          COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'Interested') as interested_count,
          COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'Applied') as applied_count,
          COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'Phone Screen') as phone_screen_count,
          COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'Interview') as interview_count,
          COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'Offer') as offer_count,
          COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'Rejected') as rejected_count,
          COUNT(DISTINCT tm.user_id) as active_candidates
         FROM team_members tm
         LEFT JOIN job_opportunities jo ON tm.user_id = jo.user_id AND jo.archived = false
         WHERE tm.team_id = $1 AND tm.active = true
           AND (tm.role = 'candidate' OR tm.role = 'peer')`,
        [teamId]
      );

      // Get shared jobs count
      const sharedJobsCount = await database.query(
        `SELECT COUNT(DISTINCT job_id) as count
         FROM shared_jobs
         WHERE team_id = $1`,
        [teamId]
      );

      // Get active tasks
      const tasksStats = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
          COUNT(*) as total_tasks
         FROM preparation_tasks
         WHERE team_id = $1`,
        [teamId]
      );

      // Get recent milestones with milestone_data for reactions/comments
      const recentMilestones = await database.query(
        `SELECT 
          m.*,
          u.email as user_email,
          p.first_name,
          p.last_name
         FROM milestones m
         JOIN users u ON m.user_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE m.team_id = $1 AND m.shared_with_team = true
         ORDER BY m.achieved_at DESC
         LIMIT 10`,
        [teamId]
      );

      // Get collaboration metrics (comments, feedback, etc.)
      const collaborationMetrics = await database.query(
        `SELECT 
          (SELECT COUNT(*) FROM job_comments WHERE team_id = $1) as job_comments_count,
          (SELECT COUNT(*) FROM mentor_feedback mf
           JOIN mentor_relationships mr ON mf.relationship_id = mr.id
           JOIN team_members tm ON mr.mentor_id = tm.user_id OR mr.mentee_id = tm.user_id
           WHERE tm.team_id = $1) as feedback_count,
          (SELECT COUNT(*) FROM chat_messages cm
           JOIN chat_conversations cc ON cm.conversation_id = cc.id
           WHERE cc.team_id = $1 AND cm.created_at >= NOW() - INTERVAL '7 days') as messages_last_week`,
        [teamId]
      );

      // Get activity feed (last 20 milestone-related activities only)
      // Focus on: interviews scheduled, skills/certifications added, experience added, milestones achieved
      const activityFeed = await database.query(
        `SELECT 
          al.*,
          u.email as user_email,
          p.first_name,
          p.last_name
         FROM activity_logs al
         JOIN users u ON al.user_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE al.team_id = $1
           AND al.activity_type IN (
             'interview_scheduled',
             'interview_created',
             'skill_added',
             'certification_earned',
             'certification_added',
             'experience_added',
             'job_added',
             'milestone_achieved'
           )
         ORDER BY al.created_at DESC
         LIMIT 20`,
        [teamId]
      );

      // Calculate engagement score (based on recent activity)
      const engagementScore = await database.query(
        `SELECT COUNT(*) as activity_count
         FROM activity_logs
         WHERE team_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
        [teamId]
      );

      return {
        team: {
          id: team.id,
          teamName: team.team_name,
          teamType: team.team_type,
          activeMembers: parseInt(team.active_members),
          maxMembers: team.max_members
        },
        membersByRole: membersByRole.rows.reduce((acc, row) => {
          acc[row.role] = parseInt(row.count);
          return acc;
        }, {}),
        jobSearch: {
          ...jobStats.rows[0],
          sharedJobs: parseInt(sharedJobsCount.rows[0]?.count || 0)
        },
        tasks: tasksStats.rows[0],
        milestones: recentMilestones.rows.map(row => ({
          id: row.id,
          milestoneType: row.milestone_type,
          milestoneTitle: row.milestone_title,
          milestoneDescription: row.milestone_description,
          milestoneData: typeof row.milestone_data === "string"
            ? JSON.parse(row.milestone_data)
            : row.milestone_data || {},
          achievedAt: row.achieved_at,
          userEmail: row.user_email,
          userName: row.first_name && row.last_name
            ? `${row.first_name} ${row.last_name}`.trim()
            : row.user_email
        })),
        collaboration: {
          ...collaborationMetrics.rows[0],
          engagementScore: Math.min(100, (engagementScore.rows[0]?.activity_count || 0) * 2)
        },
        activityFeed: activityFeed.rows.map(row => ({
          id: row.id,
          activityType: row.activity_type,
          activityData: typeof row.activity_data === "string"
            ? JSON.parse(row.activity_data)
            : row.activity_data,
          createdAt: row.created_at,
          userEmail: row.user_email,
          userName: row.first_name && row.last_name
            ? `${row.first_name} ${row.last_name}`.trim()
            : row.user_email
        })),
        userRole: member.rows[0].role,
        userPermissions: permissions
      };
    } catch (error) {
      console.error("[TeamDashboardService] Error getting team dashboard:", error);
      throw error;
    }
  }

  /**
   * Get team performance comparison (anonymized benchmarking)
   */
  async getTeamPerformanceComparison(teamId, userId) {
    try {
      // Verify user is a team member
      // Since data is anonymized, all team members can view it
      const member = await database.query(
        `SELECT role, permissions FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, userId]
      );

      if (member.rows.length === 0) {
        throw new Error("You are not a member of this team");
      }

      // Get anonymized member statistics
      // Include all active team members (not just candidates/peers) to show performance data for everyone
      const memberStats = await database.query(
        `SELECT 
          tm.user_id,
          tm.role,
          COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'Applied') as applications_count,
          COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'Interview') as interviews_count,
          COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'Offer') as offers_count,
          COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'completed') as tasks_completed,
          COUNT(DISTINCT m.id) as milestones_achieved,
          MAX(jo.status_updated_at) as last_activity
         FROM team_members tm
         LEFT JOIN job_opportunities jo ON tm.user_id = jo.user_id AND jo.archived = false
         LEFT JOIN preparation_tasks pt ON tm.user_id = pt.assigned_to
         LEFT JOIN milestones m ON tm.user_id = m.user_id AND m.team_id = $1
         WHERE tm.team_id = $1 AND tm.active = true
         GROUP BY tm.user_id, tm.role`,
        [teamId]
      );

      // Calculate averages and percentiles
      const stats = memberStats.rows.map(row => ({
        applicationsCount: parseInt(row.applications_count || 0),
        interviewsCount: parseInt(row.interviews_count || 0),
        offersCount: parseInt(row.offers_count || 0),
        tasksCompleted: parseInt(row.tasks_completed || 0),
        milestonesAchieved: parseInt(row.milestones_achieved || 0),
        lastActivity: row.last_activity
      }));

      const totalMembers = stats.length;
      if (totalMembers === 0) {
        return {
          totalMembers: 0,
          averages: {
            applications: 0,
            interviews: 0,
            offers: 0,
            tasksCompleted: 0,
            milestones: 0
          },
          percentiles: {
            applications: { p25: 0, p50: 0, p75: 0 },
            interviews: { p25: 0, p50: 0, p75: 0 },
            offers: { p25: 0, p50: 0, p75: 0 }
          },
          anonymizedMembers: []
        };
      }

      // Calculate averages
      const averages = {
        applications: stats.reduce((sum, s) => sum + s.applicationsCount, 0) / totalMembers,
        interviews: stats.reduce((sum, s) => sum + s.interviewsCount, 0) / totalMembers,
        offers: stats.reduce((sum, s) => sum + s.offersCount, 0) / totalMembers,
        tasksCompleted: stats.reduce((sum, s) => sum + s.tasksCompleted, 0) / totalMembers,
        milestones: stats.reduce((sum, s) => sum + s.milestonesAchieved, 0) / totalMembers
      };

      // Calculate percentiles
      const sortedApplications = [...stats].sort((a, b) => a.applicationsCount - b.applicationsCount);
      const sortedInterviews = [...stats].sort((a, b) => a.interviewsCount - b.interviewsCount);
      const sortedOffers = [...stats].sort((a, b) => a.offersCount - b.offersCount);

      const percentiles = {
        applications: {
          p25: sortedApplications[Math.floor(totalMembers * 0.25)]?.applicationsCount ?? 0,
          p50: sortedApplications[Math.floor(totalMembers * 0.5)]?.applicationsCount ?? 0,
          p75: sortedApplications[Math.floor(totalMembers * 0.75)]?.applicationsCount ?? 0
        },
        interviews: {
          p25: sortedInterviews[Math.floor(totalMembers * 0.25)]?.interviewsCount ?? 0,
          p50: sortedInterviews[Math.floor(totalMembers * 0.5)]?.interviewsCount ?? 0,
          p75: sortedInterviews[Math.floor(totalMembers * 0.75)]?.interviewsCount ?? 0
        },
        offers: {
          p25: sortedOffers[Math.floor(totalMembers * 0.25)]?.offersCount ?? 0,
          p50: sortedOffers[Math.floor(totalMembers * 0.5)]?.offersCount ?? 0,
          p75: sortedOffers[Math.floor(totalMembers * 0.75)]?.offersCount ?? 0
        }
      };

      // Return anonymized member data (no user_id, just performance metrics)
      const anonymizedMembers = stats.map((stat, index) => ({
        memberId: `member_${index + 1}`, // Anonymized ID
        applicationsCount: stat.applicationsCount,
        interviewsCount: stat.interviewsCount,
        offersCount: stat.offersCount,
        tasksCompleted: stat.tasksCompleted,
        milestonesAchieved: stat.milestonesAchieved,
        performanceTier: this._calculatePerformanceTier(stat, averages)
      }));

      return {
        totalMembers,
        averages,
        percentiles,
        anonymizedMembers,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error("[TeamDashboardService] Error getting team performance comparison:", error);
      throw error;
    }
  }

  /**
   * Calculate performance tier for a member
   */
  _calculatePerformanceTier(stat, averages) {
    const score = (
      (stat.applicationsCount / Math.max(averages.applications, 1)) * 0.3 +
      (stat.interviewsCount / Math.max(averages.interviews, 1)) * 0.3 +
      (stat.offersCount / Math.max(averages.offers, 1)) * 0.2 +
      (stat.tasksCompleted / Math.max(averages.tasksCompleted, 1)) * 0.1 +
      (stat.milestonesAchieved / Math.max(averages.milestones, 1)) * 0.1
    );

    if (score >= 1.2) return "high";
    if (score >= 0.8) return "medium";
    return "low";
  }
}

export default new TeamDashboardService();

