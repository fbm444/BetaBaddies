import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import { teamService, chatService } from "./index.js";

/**
 * Service for Mentor Dashboard and Coaching Tools (UC-109)
 */
class MentorDashboardService {
  /**
   * Get mentor's mentees
   */
  async getMentees(mentorId) {
    try {
      const result = await database.query(
        `SELECT 
          mr.id as relationship_id,
          mr.mentee_id,
          u.email,
          u.role as user_role,
          mr.relationship_type,
          mr.permissions_granted,
          mr.accepted_at,
          p.first_name,
          p.last_name,
          p.linkedin_url,
          p.github_url
         FROM mentor_relationships mr
         JOIN users u ON mr.mentee_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE mr.mentor_id = $1 AND mr.active = true AND mr.invitation_status = 'accepted'
         ORDER BY mr.accepted_at DESC`,
        [mentorId]
      );

      return result.rows.map(row => ({
        relationshipId: row.relationship_id,
        menteeId: row.mentee_id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        linkedinUrl: row.linkedin_url,
        githubUrl: row.github_url,
        relationshipType: row.relationship_type,
        permissions: typeof row.permissions_granted === "string" 
          ? JSON.parse(row.permissions_granted) 
          : row.permissions_granted,
        acceptedAt: row.accepted_at
      }));
    } catch (error) {
      console.error("[MentorDashboardService] Error getting mentees:", error);
      throw error;
    }
  }

  /**
   * Get mentee progress summary
   */
  async getMenteeProgress(mentorId, menteeId) {
    try {
      // Verify relationship
      const relationship = await database.query(
        `SELECT id FROM mentor_relationships 
         WHERE mentor_id = $1 AND mentee_id = $2 AND active = true`,
        [mentorId, menteeId]
      );

      if (relationship.rows.length === 0) {
        throw new Error("Mentor relationship not found");
      }

      // Get job search statistics
      const jobStats = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'Interested') as interested_count,
          COUNT(*) FILTER (WHERE status = 'Applied') as applied_count,
          COUNT(*) FILTER (WHERE status = 'Phone Screen') as phone_screen_count,
          COUNT(*) FILTER (WHERE status = 'Interview') as interview_count,
          COUNT(*) FILTER (WHERE status = 'Offer') as offer_count,
          COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_count,
          COUNT(*) as total_jobs,
          MAX(created_at) as last_activity
         FROM job_opportunities
         WHERE user_id = $1 AND archived = false`,
        [menteeId]
      );

      // Get interview prep progress
      const interviewPrep = await database.query(
        `SELECT 
          COUNT(DISTINCT i.id) as total_interviews,
          COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'scheduled') as scheduled_interviews,
          COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed') as completed_interviews
         FROM interviews i
         WHERE i.user_id = $1`,
        [menteeId]
      );

      // Get task completion
      const tasks = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
          COUNT(*) as total_tasks
         FROM preparation_tasks
         WHERE assigned_to = $1`,
        [menteeId]
      );

      // Get recent activity
      const recentActivity = await database.query(
        `SELECT activity_type, activity_data, created_at
         FROM activity_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [menteeId]
      );

      // Get engagement score (based on recent activity)
      const engagementScore = await database.query(
        `SELECT COUNT(*) as activity_count
         FROM activity_logs
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
        [menteeId]
      );

      return {
        jobSearch: jobStats.rows[0],
        interviewPrep: interviewPrep.rows[0],
        tasks: tasks.rows[0],
        recentActivity: recentActivity.rows,
        engagementScore: Math.min(100, (engagementScore.rows[0]?.activity_count || 0) * 10)
      };
    } catch (error) {
      console.error("[MentorDashboardService] Error getting mentee progress:", error);
      throw error;
    }
  }

  /**
   * Get mentee job search materials
   */
  async getMenteeMaterials(mentorId, menteeId, materialType = "all") {
    try {
      // Verify relationship
      const relationship = await database.query(
        `SELECT permissions_granted FROM mentor_relationships 
         WHERE mentor_id = $1 AND mentee_id = $2 AND active = true`,
        [mentorId, menteeId]
      );

      if (relationship.rows.length === 0) {
        throw new Error("Mentor relationship not found");
      }

      const permissions = typeof relationship.rows[0].permissions_granted === "string"
        ? JSON.parse(relationship.rows[0].permissions_granted)
        : relationship.rows[0].permissions_granted;

      const materials = {};

      // Get resumes if permitted
      if (materialType === "all" || materialType === "resumes") {
        if (permissions?.can_view_resumes !== false) {
          const resumes = await database.query(
            `SELECT id, name, created_at, updated_at, is_default
             FROM resume
             WHERE user_id = $1
             ORDER BY is_default DESC, updated_at DESC`,
            [menteeId]
          );
          materials.resumes = resumes.rows;
        }
      }

      // Get cover letters if permitted
      if (materialType === "all" || materialType === "cover_letters") {
        if (permissions?.can_view_cover_letters !== false) {
          const coverLetters = await database.query(
            `SELECT id, job_id, version_name as title, created_at, updated_at
             FROM coverletter
             WHERE user_id = $1
             ORDER BY updated_at DESC`,
            [menteeId]
          );
          materials.coverLetters = coverLetters.rows;
        }
      }

      // Get job applications if permitted
      if (materialType === "all" || materialType === "jobs") {
        if (permissions?.can_view_applications !== false) {
          const jobs = await database.query(
            `SELECT id, title, company, status, created_at, status_updated_at
             FROM job_opportunities
             WHERE user_id = $1 AND archived = false
             ORDER BY status_updated_at DESC`,
            [menteeId]
          );
          materials.jobs = jobs.rows;
        }
      }

      return materials;
    } catch (error) {
      console.error("[MentorDashboardService] Error getting mentee materials:", error);
      throw error;
    }
  }

  /**
   * Provide feedback to mentee
   */
  async provideFeedback(mentorId, menteeId, feedbackData) {
    try {
      // Verify relationship
      const relationship = await database.query(
        `SELECT id FROM mentor_relationships 
         WHERE mentor_id = $1 AND mentee_id = $2 AND active = true`,
        [mentorId, menteeId]
      );

      if (relationship.rows.length === 0) {
        throw new Error("Mentor relationship not found");
      }

      const { feedbackType, feedbackContent, recommendations, relatedItemType, relatedItemId } = feedbackData;

      const feedbackId = uuidv4();

      await database.query(
        `INSERT INTO mentor_feedback 
         (id, relationship_id, feedback_type, feedback_content, recommendations)
         VALUES ($1, $2, $3, $4, $5)`,
        [feedbackId, relationship.rows[0].id, feedbackType, feedbackContent, recommendations || null]
      );

      // Log activity
      await teamService.logActivity(
        null, // team_id if available
        mentorId,
        "mentor",
        "feedback_provided",
        {
          mentee_id: menteeId,
          feedback_type: feedbackType,
          related_item_type: relatedItemType,
          related_item_id: relatedItemId
        }
      );

      // Create or get mentor-mentee chat conversation
      try {
        await chatService.getOrCreateConversation(mentorId, {
          conversationType: "mentor_mentee",
          relatedEntityType: "mentor_relationship",
          relatedEntityId: relationship.rows[0].id,
          title: `Mentor Chat`,
          participantIds: [menteeId]
        });
      } catch (chatError) {
        console.error("[MentorDashboardService] Error creating mentor chat:", chatError);
        // Don't fail feedback if chat creation fails
      }

      return { id: feedbackId, ...feedbackData };
    } catch (error) {
      console.error("[MentorDashboardService] Error providing feedback:", error);
      throw error;
    }
  }

  /**
   * Get coaching insights for mentee
   */
  async getCoachingInsights(mentorId, menteeId) {
    try {
      // Get mentee progress
      const progress = await this.getMenteeProgress(mentorId, menteeId);

      // Generate insights based on data
      const insights = [];

      // Application rate insight
      if (progress.jobSearch.total_jobs > 0) {
        const applicationRate = (progress.jobSearch.applied_count / progress.jobSearch.total_jobs) * 100;
        if (applicationRate < 30) {
          insights.push({
            type: "application_rate",
            priority: "high",
            title: "Low Application Rate",
            message: `Only ${applicationRate.toFixed(0)}% of interested jobs have been applied to. Consider increasing application activity.`,
            recommendation: "Set a goal to apply to at least 3-5 jobs per week"
          });
        }
      }

      // Interview conversion insight
      if (progress.jobSearch.applied_count > 0) {
        const interviewRate = (progress.jobSearch.interview_count / progress.jobSearch.applied_count) * 100;
        if (interviewRate < 10) {
          insights.push({
            type: "interview_conversion",
            priority: "high",
            title: "Low Interview Conversion",
            message: `Only ${interviewRate.toFixed(0)}% of applications are leading to interviews. Review application materials.`,
            recommendation: "Consider getting resume and cover letters reviewed"
          });
        }
      }

      // Task completion insight
      if (progress.tasks.total_tasks > 0) {
        const completionRate = (progress.tasks.completed_tasks / progress.tasks.total_tasks) * 100;
        if (completionRate < 50) {
          insights.push({
            type: "task_completion",
            priority: "medium",
            title: "Task Completion Rate",
            message: `${completionRate.toFixed(0)}% of assigned tasks are completed.`,
            recommendation: "Focus on completing pending tasks to stay on track"
          });
        }
      }

      // Engagement insight
      if (progress.engagementScore < 30) {
        insights.push({
          type: "engagement",
          priority: "medium",
          title: "Low Engagement",
          message: "Activity has been low recently. Check in with mentee.",
          recommendation: "Schedule a check-in meeting"
        });
      }

      return {
        insights,
        progress,
        recommendations: insights.map(i => i.recommendation)
      };
    } catch (error) {
      console.error("[MentorDashboardService] Error getting coaching insights:", error);
      throw error;
    }
  }

  /**
   * Get mentee goals and progress
   */
  async getMenteeGoals(mentorId, menteeId) {
    try {
      // This would integrate with a goals system
      // For now, return placeholder structure
      return {
        goals: [],
        achievements: [],
        milestones: []
      };
    } catch (error) {
      console.error("[MentorDashboardService] Error getting mentee goals:", error);
      throw error;
    }
  }
}

export default new MentorDashboardService();

