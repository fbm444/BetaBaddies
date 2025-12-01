import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import { teamService } from "./index.js";

/**
 * Service for Progress Sharing and Accountability (UC-111)
 */
class ProgressShareService {
  /**
   * Configure progress sharing
   */
  async configureSharing(userId, shareConfig) {
    try {
      const { sharedWithUserId, sharedWithTeamId, shareType, privacyLevel } = shareConfig;

      if (!sharedWithUserId && !sharedWithTeamId) {
        throw new Error("Must specify either sharedWithUserId or sharedWithTeamId");
      }

      // Remove existing shares for this configuration
      if (sharedWithUserId) {
        await database.query(
          `UPDATE progress_shares 
           SET is_active = false 
           WHERE user_id = $1 AND shared_with_user_id = $2`,
          [userId, sharedWithUserId]
        );
      } else {
        await database.query(
          `UPDATE progress_shares 
           SET is_active = false 
           WHERE user_id = $1 AND shared_with_team_id = $2`,
          [userId, sharedWithTeamId]
        );
      }

      // Create new share configuration
      const shareId = uuidv4();
      await database.query(
        `INSERT INTO progress_shares 
         (id, user_id, shared_with_user_id, shared_with_team_id, share_type, privacy_level, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [shareId, userId, sharedWithUserId || null, sharedWithTeamId || null, shareType || "all", privacyLevel || "team"]
      );

      return { id: shareId, ...shareConfig };
    } catch (error) {
      console.error("[ProgressShareService] Error configuring sharing:", error);
      throw error;
    }
  }

  /**
   * Generate progress report
   */
  async generateProgressReport(userId, reportPeriod = "week") {
    try {
      const periodStart = new Date();
      if (reportPeriod === "week") {
        periodStart.setDate(periodStart.getDate() - 7);
      } else if (reportPeriod === "month") {
        periodStart.setMonth(periodStart.getMonth() - 1);
      }

      // Get job search progress
      const jobProgress = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'Applied' AND created_at >= $1) as applications_submitted,
          COUNT(*) FILTER (WHERE status = 'Interview' AND status_updated_at >= $1) as interviews_scheduled,
          COUNT(*) FILTER (WHERE status = 'Offer' AND status_updated_at >= $1) as offers_received,
          COUNT(*) as total_jobs
         FROM job_opportunities
         WHERE user_id = $2 AND archived = false`,
        [periodStart, userId]
      );

      // Get interview prep progress
      const interviewPrep = await database.query(
        `SELECT 
          COUNT(*) as interviews_completed,
          AVG(performance_score) as avg_performance_score
         FROM interviews
         WHERE user_id = $2 AND created_at >= $1`,
        [periodStart, userId]
      );

      // Get task completion
      const tasks = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= $1) as tasks_completed,
          COUNT(*) FILTER (WHERE status = 'pending') as tasks_pending
         FROM preparation_tasks
         WHERE assigned_to = $2`,
        [periodStart, userId]
      );

      // Get milestones achieved
      const milestones = await database.query(
        `SELECT milestone_type, milestone_title, achieved_at
         FROM milestones
         WHERE user_id = $2 AND achieved_at >= $1
         ORDER BY achieved_at DESC`,
        [periodStart, userId]
      );

      return {
        period: reportPeriod,
        periodStart: periodStart,
        periodEnd: new Date(),
        jobSearch: jobProgress.rows[0],
        interviewPrep: interviewPrep.rows[0],
        tasks: tasks.rows[0],
        milestones: milestones.rows,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error("[ProgressShareService] Error generating progress report:", error);
      throw error;
    }
  }

  /**
   * Get shared progress for a user (what they can see)
   */
  async getSharedProgress(viewerId, targetUserId) {
    try {
      // Check if viewer has permission to see target's progress
      const shareConfig = await database.query(
        `SELECT * FROM progress_shares
         WHERE user_id = $1 
           AND ((shared_with_user_id = $2) OR (shared_with_team_id IN (
             SELECT team_id FROM team_members WHERE user_id = $2 AND active = true
           )))
           AND is_active = true`,
        [targetUserId, viewerId]
      );

      if (shareConfig.rows.length === 0) {
        throw new Error("You do not have permission to view this user's progress");
      }

      // Get progress based on share type
      const share = shareConfig.rows[0];
      const progress = {};

      if (share.share_type === "all" || share.share_type === "applications") {
        progress.jobs = await database.query(
          `SELECT id, title, company, status, status_updated_at
           FROM job_opportunities
           WHERE user_id = $1 AND archived = false
           ORDER BY status_updated_at DESC`,
          [targetUserId]
        );
      }

      if (share.share_type === "all" || share.share_type === "interviews") {
        progress.interviews = await database.query(
          `SELECT id, title, company, scheduled_at as interview_date, status
           FROM interviews
           WHERE user_id = $1
           ORDER BY COALESCE(scheduled_at, date) DESC`,
          [targetUserId]
        );
      }

      if (share.share_type === "all" || share.share_type === "milestones") {
        progress.milestones = await database.query(
          `SELECT milestone_type, milestone_title, achieved_at
           FROM milestones
           WHERE user_id = $1
           ORDER BY achieved_at DESC`,
          [targetUserId]
        );
      }

      return progress;
    } catch (error) {
      console.error("[ProgressShareService] Error getting shared progress:", error);
      throw error;
    }
  }

  /**
   * Get predefined milestone types for job search
   */
  getPredefinedMilestones() {
    return [
      {
        type: "first_application",
        title: "First Application Submitted",
        description: "Submitted your first job application",
        category: "application"
      },
      {
        type: "five_applications",
        title: "5 Applications Submitted",
        description: "Reached 5 job applications",
        category: "application"
      },
      {
        type: "ten_applications",
        title: "10 Applications Submitted",
        description: "Reached 10 job applications",
        category: "application"
      },
      {
        type: "first_interview",
        title: "First Interview Scheduled",
        description: "Scheduled your first interview",
        category: "interview"
      },
      {
        type: "phone_screen_complete",
        title: "Phone Screen Completed",
        description: "Completed a phone screen interview",
        category: "interview"
      },
      {
        type: "technical_interview",
        title: "Technical Interview Completed",
        description: "Completed a technical interview",
        category: "interview"
      },
      {
        type: "first_offer",
        title: "First Job Offer Received",
        description: "Received your first job offer",
        category: "offer"
      },
      {
        type: "resume_optimized",
        title: "Resume Optimized",
        description: "Optimized your resume for ATS",
        category: "preparation"
      },
      {
        type: "cover_letter_created",
        title: "Cover Letter Created",
        description: "Created your first tailored cover letter",
        category: "preparation"
      },
      {
        type: "network_connection",
        title: "Network Connection Made",
        description: "Made a meaningful professional connection",
        category: "networking"
      },
      {
        type: "skill_certification",
        title: "Skill Certification Earned",
        description: "Earned a new skill certification",
        category: "preparation"
      },
      {
        type: "interview_prep_complete",
        title: "Interview Prep Completed",
        description: "Completed interview preparation session",
        category: "preparation"
      }
    ];
  }

  /**
   * Auto-detect and create milestone based on user activity
   */
  async autoDetectMilestone(userId, activityType, activityData, teamId = null) {
    try {
      const predefined = this.getPredefinedMilestones();
      let milestoneToCreate = null;

      // Check application milestones
      if (activityType === "job_application_submitted") {
        const appCount = await database.query(
          `SELECT COUNT(*) as count FROM job_opportunities 
           WHERE user_id = $1 AND status = 'Applied' AND archived = false`,
          [userId]
        );
        const count = parseInt(appCount.rows[0]?.count || 0);
        
        if (count === 1) {
          milestoneToCreate = predefined.find(m => m.type === "first_application");
        } else if (count === 5) {
          milestoneToCreate = predefined.find(m => m.type === "five_applications");
        } else if (count === 10) {
          milestoneToCreate = predefined.find(m => m.type === "ten_applications");
        }
      }

      // Check interview milestones
      if (activityType === "interview_scheduled" || activityType === "interview_completed") {
        const interviewCount = await database.query(
          `SELECT COUNT(*) as count FROM interviews WHERE user_id = $1`,
          [userId]
        );
        const count = parseInt(interviewCount.rows[0]?.count || 0);
        
        if (count === 1) {
          milestoneToCreate = predefined.find(m => m.type === "first_interview");
        }
      }

      // Check offer milestones
      if (activityType === "job_offer_received") {
        milestoneToCreate = predefined.find(m => m.type === "first_offer");
      }

      if (milestoneToCreate) {
        return await this.createMilestone(userId, {
          milestoneType: milestoneToCreate.type,
          milestoneTitle: milestoneToCreate.title,
          milestoneDescription: milestoneToCreate.description,
          sharedWithTeam: teamId ? true : false
        }, teamId);
      }

      return null;
    } catch (error) {
      console.error("[ProgressShareService] Error auto-detecting milestone:", error);
      return null;
    }
  }

  /**
   * Create milestone
   */
  async createMilestone(userId, milestoneData, teamId = null) {
    try {
      const { milestoneType, milestoneTitle, milestoneDescription, milestoneData: data, sharedWithTeam } = milestoneData;

      const milestoneId = uuidv4();
      await database.query(
        `INSERT INTO milestones 
         (id, user_id, team_id, milestone_type, milestone_title, milestone_description, milestone_data, shared_with_team)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [milestoneId, userId, teamId, milestoneType, milestoneTitle, milestoneDescription || null, JSON.stringify(data || {}), sharedWithTeam || false]
      );

      // Log activity
      if (teamId) {
        await teamService.logActivity(teamId, userId, "candidate", "milestone_achieved", {
          milestone_type: milestoneType,
          milestone_title: milestoneTitle
        });
      }

      return {
        id: milestoneId,
        milestoneType,
        milestoneTitle,
        achievedAt: new Date()
      };
    } catch (error) {
      console.error("[ProgressShareService] Error creating milestone:", error);
      throw error;
    }
  }

  /**
   * Add reaction or comment to milestone
   */
  async addMilestoneReaction(milestoneId, userId, reactionType, commentText = null) {
    try {
      // Get current milestone data
      const milestone = await database.query(
        `SELECT milestone_data, user_id, team_id FROM milestones WHERE id = $1`,
        [milestoneId]
      );

      if (milestone.rows.length === 0) {
        throw new Error("Milestone not found");
      }

      // Parse milestone_data if it's a string (JSONB is usually already parsed, but handle both cases)
      let currentData = milestone.rows[0].milestone_data || {};
      if (typeof currentData === 'string') {
        try {
          currentData = JSON.parse(currentData);
        } catch (e) {
          currentData = {};
        }
      }
      const reactions = currentData.reactions || [];
      const comments = currentData.comments || [];

      // Get user profile for display
      const userProfile = await database.query(
        `SELECT p.first_name, p.last_name, u.email 
         FROM users u
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE u.u_id = $1`,
        [userId]
      );

      const userName = userProfile.rows[0]?.first_name && userProfile.rows[0]?.last_name
        ? `${userProfile.rows[0].first_name} ${userProfile.rows[0].last_name}`
        : userProfile.rows[0]?.email || "Unknown User";

      if (reactionType === "comment" && commentText) {
        // Add comment
        const newComment = {
          id: uuidv4(),
          userId,
          userName,
          text: commentText,
          createdAt: new Date().toISOString()
        };
        comments.push(newComment);
      } else if (reactionType && ["celebrate", "congrats", "awesome", "fire", "clap"].includes(reactionType)) {
        // Add or update reaction
        const existingReactionIndex = reactions.findIndex((r) => r.userId === userId && r.type === reactionType);
        
        if (existingReactionIndex >= 0) {
          // Remove reaction (toggle off)
          reactions.splice(existingReactionIndex, 1);
        } else {
          // Add reaction
          reactions.push({
            userId,
            userName,
            type: reactionType,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Update milestone_data
      const updatedData = {
        ...currentData,
        reactions,
        comments
      };

      await database.query(
        `UPDATE milestones SET milestone_data = $1 WHERE id = $2`,
        [JSON.stringify(updatedData), milestoneId]
      );

      return {
        reactions,
        comments
      };
    } catch (error) {
      console.error("[ProgressShareService] Error adding milestone reaction:", error);
      throw error;
    }
  }

  /**
   * Get accountability partner engagement
   */
  async getAccountabilityEngagement(userId, partnerId) {
    try {
      // Get relationship
      const relationship = await database.query(
        `SELECT * FROM accountability_relationships
         WHERE (user_id = $1 AND accountability_partner_id = $2)
            OR (user_id = $2 AND accountability_partner_id = $1)`,
        [userId, partnerId]
      );

      if (relationship.rows.length === 0) {
        throw new Error("Accountability relationship not found");
      }

      // Get engagement metrics
      const engagement = await database.query(
        `SELECT 
          COUNT(*) as interactions_count,
          MAX(created_at) as last_interaction
         FROM activity_logs
         WHERE user_id = $1 AND activity_type IN ('progress_shared', 'milestone_achieved', 'feedback_provided')
           AND created_at >= NOW() - INTERVAL '30 days'`,
        [partnerId]
      );

      return {
        relationship: relationship.rows[0],
        engagement: engagement.rows[0],
        effectiveness: engagement.rows[0]?.interactions_count > 10 ? "high" : 
                      engagement.rows[0]?.interactions_count > 5 ? "medium" : "low"
      };
    } catch (error) {
      console.error("[ProgressShareService] Error getting accountability engagement:", error);
      throw error;
    }
  }
}

export default new ProgressShareService();

