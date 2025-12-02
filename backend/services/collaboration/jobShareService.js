import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import { teamService } from "./index.js";
import jobOpportunityService from "../jobOpportunityService.js";

/**
 * Service for sharing job postings with teams
 */
class JobShareService {
  /**
   * Share job with team
   */
  async shareJobWithTeam(userId, jobId, teamId) {
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

      if (permissions?.can_share_jobs === false && member.rows[0].role !== "admin") {
        throw new Error("You do not have permission to share jobs");
      }

      // Check if already shared
      const existing = await database.query(
        `SELECT id FROM shared_jobs WHERE job_id = $1 AND team_id = $2`,
        [jobId, teamId]
      );

      if (existing.rows.length > 0) {
        throw new Error("Job is already shared with this team");
      }

      // Share job
      const shareId = uuidv4();
      await database.query(
        `INSERT INTO shared_jobs (id, job_id, shared_by, shared_by_role, team_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [shareId, jobId, userId, member.rows[0].role, teamId]
      );

      // Log activity
      await teamService.logActivity(teamId, userId, member.rows[0].role, "job_shared", {
        job_id: jobId
      });

      return { id: shareId, jobId, teamId };
    } catch (error) {
      console.error("[JobShareService] Error sharing job:", error);
      throw error;
    }
  }

  /**
   * Get shared jobs for team
   */
  async getSharedJobs(teamId, userId) {
    try {
      // Verify user is team member
      const member = await database.query(
        `SELECT id FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, userId]
      );

      if (member.rows.length === 0) {
        throw new Error("You are not a member of this team");
      }

      const result = await database.query(
        `SELECT 
          sj.id as share_id,
          sj.shared_at,
          sj.shared_by,
          sj.shared_by_role,
          jo.*,
          u.email as shared_by_email
         FROM shared_jobs sj
         JOIN job_opportunities jo ON sj.job_id = jo.id
         JOIN users u ON sj.shared_by = u.u_id
         WHERE sj.team_id = $1
         ORDER BY sj.shared_at DESC`,
        [teamId]
      );

      // Map rows to camelCase format expected by frontend
      return result.rows.map(row => {
        const jobOpportunity = jobOpportunityService.mapRowToJobOpportunity(row);
        return {
          ...jobOpportunity,
          shareId: row.share_id,
          sharedAt: row.shared_at,
          sharedBy: row.shared_by,
          sharedByEmail: row.shared_by_email,
          sharedByRole: row.shared_by_role
        };
      });
    } catch (error) {
      console.error("[JobShareService] Error getting shared jobs:", error);
      throw error;
    }
  }

  /**
   * Add comment to shared job
   */
  async addJobComment(userId, jobId, teamId, commentData) {
    try {
      // Verify job is shared with team
      const shared = await database.query(
        `SELECT id FROM shared_jobs WHERE job_id = $1 AND team_id = $2`,
        [jobId, teamId]
      );

      if (shared.rows.length === 0) {
        throw new Error("Job is not shared with this team");
      }

      const { commentText, parentCommentId } = commentData;

      const commentId = uuidv4();
      await database.query(
        `INSERT INTO job_comments (id, job_id, team_id, user_id, parent_comment_id, comment_text)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [commentId, jobId, teamId, userId, parentCommentId || null, commentText]
      );

      // Log activity
      await teamService.logActivity(teamId, userId, "candidate", "comment_added", {
        job_id: jobId,
        comment_id: commentId
      });

      return {
        id: commentId,
        jobId,
        teamId,
        commentText,
        createdAt: new Date()
      };
    } catch (error) {
      console.error("[JobShareService] Error adding job comment:", error);
      throw error;
    }
  }

  /**
   * Get comments for shared job
   */
  async getJobComments(jobId, teamId) {
    try {
      const result = await database.query(
        `SELECT jc.*, u.email as commenter_email
         FROM job_comments jc
         JOIN users u ON jc.user_id = u.u_id
         WHERE jc.job_id = $1 AND jc.team_id = $2
         ORDER BY jc.created_at ASC`,
        [jobId, teamId]
      );

      // Build comment tree
      const commentMap = new Map();
      const rootComments = [];

      result.rows.forEach(comment => {
        commentMap.set(comment.id, {
          id: comment.id,
          commenterEmail: comment.commenter_email,
          commentText: comment.comment_text,
          isSuggestion: comment.is_suggestion,
          createdAt: comment.created_at,
          replies: []
        });
      });

      result.rows.forEach(comment => {
        const commentObj = commentMap.get(comment.id);
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies.push(commentObj);
          }
        } else {
          rootComments.push(commentObj);
        }
      });

      return rootComments;
    } catch (error) {
      console.error("[JobShareService] Error getting job comments:", error);
      throw error;
    }
  }
}

export default new JobShareService();

