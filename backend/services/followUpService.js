import database from "./database.js";
import { v4 as uuidv4 } from "uuid";
import communicationsAIService from "./interviewCommunicationsAIService.js";

class FollowUpService {
  /**
   * Auto-generate follow-up actions after interview completion
   */
  async generateFollowUpActions(interviewId, userId) {
    try {
      // Get interview details
      const interviewQuery = `
        SELECT 
          i.*,
          jo.title as job_title,
          jo.company
        FROM interviews i
        LEFT JOIN job_opportunities jo ON i.job_opportunity_id = jo.id
        WHERE i.id = $1 AND i.user_id = $2
      `;

      const interviewResult = await database.query(interviewQuery, [
        interviewId,
        userId,
      ]);

      if (interviewResult.rows.length === 0) {
        throw new Error("Interview not found");
      }

      const interview = interviewResult.rows[0];
      const interviewDate = interview.scheduled_at
        ? new Date(interview.scheduled_at)
        : new Date();

      // Generate recommended follow-up actions
      const actions = [];

      // 1. Thank-you note (within 24 hours)
      if (interview.interviewer_email) {
        const thankYouNoteDue = new Date(interviewDate);
        thankYouNoteDue.setHours(thankYouNoteDue.getHours() + 24);

        actions.push({
          actionType: "thank_you_note",
          dueDate: thankYouNoteDue,
          notes: "Send a thank-you note to express appreciation for the interview",
        });
      }

      // 2. Follow-up email (within 1 week if no response)
      const followUpDue = new Date(interviewDate);
      followUpDue.setDate(followUpDue.getDate() + 7);

      actions.push({
        actionType: "follow_up_email",
        dueDate: followUpDue,
        notes: "Follow up on interview status if you haven't heard back",
      });

      // 3. Status inquiry (after 2 weeks)
      const statusInquiryDue = new Date(interviewDate);
      statusInquiryDue.setDate(statusInquiryDue.getDate() + 14);

      actions.push({
        actionType: "status_inquiry",
        dueDate: statusInquiryDue,
        notes: "Inquire about the hiring decision timeline",
      });

      // Insert actions into database
      const createdActions = [];
      for (const action of actions) {
        const actionId = uuidv4();
        await database.query(
          `INSERT INTO interview_follow_ups (
            id, interview_id, action_type, due_date, notes, completed, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
          ON CONFLICT DO NOTHING`,
          [
            actionId,
            interviewId,
            action.actionType,
            action.dueDate,
            action.notes,
          ]
        );

        createdActions.push({
          id: actionId,
          ...action,
        });
      }

      return createdActions;
    } catch (error) {
      console.error("❌ Error generating follow-up actions:", error);
      throw error;
    }
  }

  /**
   * Get follow-up actions for an interview
   */
  async getFollowUpActions(interviewId, userId) {
    try {
      const query = `
        SELECT 
          id,
          interview_id,
          action_type,
          due_date,
          completed,
          completed_at,
          notes,
          created_at,
          updated_at
        FROM interview_follow_ups
        WHERE interview_id = $1 
          AND interview_id IN (SELECT id FROM interviews WHERE user_id = $2)
        ORDER BY due_date ASC, created_at ASC
      `;

      const result = await database.query(query, [interviewId, userId]);

      return result.rows.map((row) => ({
        id: row.id,
        interviewId: row.interview_id,
        actionType: row.action_type,
        dueDate: row.due_date,
        completed: row.completed,
        completedAt: row.completed_at,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error("❌ Error getting follow-up actions:", error);
      throw error;
    }
  }

  /**
   * Mark follow-up action as completed
   */
  async completeFollowUpAction(actionId, userId) {
    try {
      // Verify action belongs to user
      const verifyQuery = `
        SELECT fu.id
        FROM interview_follow_ups fu
        JOIN interviews i ON fu.interview_id = i.id
        WHERE fu.id = $1 AND i.user_id = $2
      `;

      const verifyResult = await database.query(verifyQuery, [actionId, userId]);

      if (verifyResult.rows.length === 0) {
        throw new Error("Follow-up action not found");
      }

      await database.query(
        `UPDATE interview_follow_ups 
         SET completed = true, completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [actionId]
      );

      return { success: true };
    } catch (error) {
      console.error("❌ Error completing follow-up action:", error);
      throw error;
    }
  }

  /**
   * Get all pending follow-up actions for a user
   */
  async getPendingFollowUpActions(userId) {
    try {
      const query = `
        SELECT 
          fu.id,
          fu.interview_id,
          fu.action_type,
          fu.due_date,
          fu.notes,
          fu.created_at,
          i.title as interview_title,
          i.company,
          i.scheduled_at as interview_date,
          i.job_opportunity_id,
          jo.title as job_title
        FROM interview_follow_ups fu
        JOIN interviews i ON fu.interview_id = i.id
        LEFT JOIN job_opportunities jo ON i.job_opportunity_id = jo.id
        WHERE i.user_id = $1 
          AND fu.completed = false
        ORDER BY fu.due_date ASC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        id: row.id,
        interviewId: row.interview_id,
        actionType: row.action_type,
        dueDate: row.due_date,
        notes: row.notes,
        createdAt: row.created_at,
        interview: {
          title: row.interview_title,
          company: row.company,
          scheduledAt: row.interview_date,
          jobOpportunityId: row.job_opportunity_id,
          jobTitle: row.job_title,
        },
      }));
    } catch (error) {
      console.error("❌ Error getting pending follow-up actions:", error);
      throw error;
    }
  }

  /**
   * Get all follow-up actions for a user (both pending and completed)
   */
  async getAllFollowUpActions(userId) {
    try {
      const query = `
        SELECT 
          fu.id,
          fu.interview_id,
          fu.action_type,
          fu.due_date,
          fu.notes,
          fu.completed,
          fu.completed_at,
          fu.created_at,
          i.title as interview_title,
          i.company,
          i.scheduled_at as interview_date,
          i.job_opportunity_id,
          jo.title as job_title
        FROM interview_follow_ups fu
        JOIN interviews i ON fu.interview_id = i.id
        LEFT JOIN job_opportunities jo ON i.job_opportunity_id = jo.id
        WHERE i.user_id = $1
        ORDER BY 
          fu.completed ASC,
          CASE WHEN fu.completed = false THEN fu.due_date END ASC,
          CASE WHEN fu.completed = true THEN fu.completed_at END DESC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        id: row.id,
        interviewId: row.interview_id,
        actionType: row.action_type,
        dueDate: row.due_date,
        notes: row.notes,
        completed: row.completed,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        interview: {
          title: row.interview_title,
          company: row.company,
          scheduledAt: row.interview_date,
          jobOpportunityId: row.job_opportunity_id,
          jobTitle: row.job_title,
        },
      }));
    } catch (error) {
      console.error("❌ Error getting all follow-up actions:", error);
      throw error;
    }
  }

  /**
   * Generate an email draft for a specific follow-up action (no DB write)
   */
  async generateFollowUpEmailDraft(actionId, userId) {
    try {
      const query = `
        SELECT 
          fu.id,
          fu.interview_id,
          fu.action_type,
          fu.due_date,
          fu.notes
        FROM interview_follow_ups fu
        JOIN interviews i ON fu.interview_id = i.id
        WHERE fu.id = $1 AND i.user_id = $2
      `;

      const result = await database.query(query, [actionId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Follow-up action not found");
      }

      const action = result.rows[0];

      const draft = await communicationsAIService.generateFollowUpDraft(
        action.interview_id,
        userId,
        action
      );

      return draft;
    } catch (error) {
      console.error("❌ Error generating follow-up email draft:", error);
      throw error;
    }
  }

  /**
   * Create a custom follow-up action
   */
  async createFollowUpAction(interviewId, userId, actionData) {
    try {
      const { actionType, dueDate, notes } = actionData;

      // Verify interview belongs to user
      const verifyQuery = `
        SELECT id FROM interviews WHERE id = $1 AND user_id = $2
      `;
      const verifyResult = await database.query(verifyQuery, [interviewId, userId]);

      if (verifyResult.rows.length === 0) {
        throw new Error("Interview not found");
      }

      const actionId = uuidv4();
      await database.query(
        `INSERT INTO interview_follow_ups (
          id, interview_id, action_type, due_date, notes, completed, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())`,
        [actionId, interviewId, actionType, dueDate || null, notes || null]
      );

      return {
        id: actionId,
        interviewId,
        actionType,
        dueDate,
        notes,
        completed: false,
      };
    } catch (error) {
      console.error("❌ Error creating follow-up action:", error);
      throw error;
    }
  }
}

export default new FollowUpService();

