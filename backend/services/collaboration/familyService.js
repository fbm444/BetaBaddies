import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import crypto from "crypto";
import emailService from "../emailService.js";

/**
 * Service for Family Support Management (UC-113)
 * Handles family member invitations, access management, and progress sharing
 */
class FamilyService {
  /**
   * Invite a family member
   */
  async inviteFamilyMember(userId, invitationData) {
    try {
      const { email, familyMemberName, relationship } = invitationData;

      if (!email) {
        throw new Error("Email is required");
      }

      // Check if user already has this family member
      const existingUser = await database.query(
        `SELECT u_id FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        const existingAccess = await database.query(
          `SELECT id FROM family_support_access 
           WHERE user_id = $1 AND family_member_email = $2 AND active = true`,
          [userId, email.toLowerCase()]
        );

        if (existingAccess.rows.length > 0) {
          throw new Error("This family member is already invited");
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await database.query(
        `SELECT id FROM family_invitations 
         WHERE user_id = $1 AND email = $2 AND status = 'pending'`,
        [userId, email.toLowerCase()]
      );

      if (existingInvitation.rows.length > 0) {
        throw new Error("An invitation is already pending for this email");
      }

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14); // 14 days expiry for family

      // Create invitation
      const invitationId = uuidv4();
      await database.query(
        `INSERT INTO family_invitations 
         (id, user_id, invited_by, email, family_member_name, relationship, invitation_token, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          invitationId,
          userId,
          userId,
          email.toLowerCase(),
          familyMemberName || null,
          relationship || null,
          invitationToken,
          expiresAt,
        ]
      );

      // Get inviter info for email
      const inviterResult = await database.query(
        `SELECT u.email, p.first_name, p.last_name 
         FROM users u
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE u.u_id = $1`,
        [userId]
      );
      const inviter = inviterResult.rows[0];
      const inviterName = inviter
        ? `${inviter.first_name || ""} ${inviter.last_name || ""}`.trim() ||
          inviter.email
        : "a family member";

      // Send invitation email
      try {
        console.log(
          "[FamilyService] Sending family invitation email to:",
          email.toLowerCase()
        );
        console.log("[FamilyService] Email service available:", !!emailService);
        console.log(
          "[FamilyService] sendFamilyInvitation method available:",
          typeof emailService.sendFamilyInvitation
        );

        if (
          !emailService ||
          typeof emailService.sendFamilyInvitation !== "function"
        ) {
          console.error(
            "[FamilyService] Email service or sendFamilyInvitation method not available!"
          );
          throw new Error("Email service method not available");
        }

        await emailService.sendFamilyInvitation(email.toLowerCase(), {
          inviterName,
          inviterEmail: inviter?.email || "",
          familyMemberName: familyMemberName || "Family Member",
          relationship: relationship || "family member",
          invitationToken,
        });
        console.log(
          "[FamilyService] Family invitation email sent successfully"
        );
      } catch (emailError) {
        console.error(
          "[FamilyService] Error sending invitation email:",
          emailError
        );
        // Don't throw - invitation is still created even if email fails
      }

      return {
        id: invitationId,
        email: email,
        familyMemberName,
        relationship,
        invitationToken: invitationToken,
        expiresAt: expiresAt,
      };
    } catch (error) {
      console.error("[FamilyService] Error inviting family member:", error);
      throw error;
    }
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token) {
    try {
      const result = await database.query(
        `SELECT 
          fi.*,
          u.email as inviter_email,
          p.first_name as inviter_first_name,
          p.last_name as inviter_last_name
         FROM family_invitations fi
         JOIN users u ON fi.invited_by = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE fi.invitation_token = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const invitation = result.rows[0];

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        await database.query(
          `UPDATE family_invitations SET status = 'expired' WHERE id = $1`,
          [invitation.id]
        );
        invitation.status = "expired";
      }

      return invitation;
    } catch (error) {
      console.error("[FamilyService] Error getting invitation:", error);
      throw error;
    }
  }

  /**
   * Accept family invitation
   */
  async acceptInvitation(invitationToken, userId) {
    try {
      // Get invitation
      const invitation = await this.getInvitationByToken(invitationToken);

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      if (invitation.status !== "pending") {
        throw new Error(`Invitation is ${invitation.status}`);
      }

      // Verify email matches if user is already registered
      const userResult = await database.query(
        `SELECT email FROM users WHERE u_id = $1`,
        [userId]
      );

      if (userResult.rows.length > 0) {
        const userEmail = userResult.rows[0].email.toLowerCase();
        if (userEmail !== invitation.email.toLowerCase()) {
          throw new Error("Email does not match invitation");
        }
      }

      // Update invitation status
      await database.query(
        `UPDATE family_invitations 
         SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [invitation.id]
      );

      // Create or update family_support_access
      const existingAccess = await database.query(
        `SELECT id FROM family_support_access 
         WHERE user_id = $1 AND family_member_email = $2`,
        [invitation.user_id, invitation.email]
      );

      if (existingAccess.rows.length > 0) {
        // Update existing access
        await database.query(
          `UPDATE family_support_access 
           SET active = true, invitation_id = $1
           WHERE id = $2`,
          [invitation.id, existingAccess.rows[0].id]
        );
      } else {
        // Create new access
        await database.query(
          `INSERT INTO family_support_access 
           (user_id, family_member_email, family_member_name, relationship, invitation_id, active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [
            invitation.user_id,
            invitation.email,
            invitation.family_member_name,
            invitation.relationship,
            invitation.id,
          ]
        );
      }

      // If the accepting user is a registered user, create reverse access
      // (so they can see who invited them - the job seeker can see their family supporters)
      if (userResult.rows.length > 0) {
        // Get the inviter's email (the person who invited the current user)
        const inviterResult = await database.query(
          `SELECT email, u_id FROM users WHERE u_id = $1`,
          [invitation.user_id] // The job seeker who sent the invitation
        );

        if (inviterResult.rows.length > 0) {
          const inviterEmail = inviterResult.rows[0].email;
          const inviterUserId = inviterResult.rows[0].u_id;
          
          // Check if reverse access exists (for the job seeker to see who they invited)
          // This is for the job seeker (invitation.user_id) to see the family member (userId)
          const reverseAccess = await database.query(
            `SELECT id FROM family_support_access 
             WHERE user_id = $1 AND family_member_email = $2`,
            [inviterUserId, userResult.rows[0].email.toLowerCase()]
          );

          if (reverseAccess.rows.length === 0) {
            // Create reverse access so the job seeker can see this family member
            await database.query(
              `INSERT INTO family_support_access 
               (user_id, family_member_email, family_member_name, relationship, active, invitation_id)
               VALUES ($1, $2, $3, $4, true, $5)`,
              [
                inviterUserId, // The job seeker
                userResult.rows[0].email.toLowerCase(), // The family member who accepted
                invitation.family_member_name || null,
                invitation.relationship || "family_member",
                invitation.id,
              ]
            );
          }
        }
      }

      return {
        invitation,
        userId: invitation.user_id,
      };
    } catch (error) {
      console.error("[FamilyService] Error accepting invitation:", error);
      throw error;
    }
  }

  /**
   * Get all family members for a user
   */
  async getFamilyMembers(userId) {
    try {
      const result = await database.query(
        `SELECT 
          fsa.*,
          u.u_id as family_member_user_id,
          u.email as family_member_email,
          u.account_type,
          p.first_name,
          p.last_name
         FROM family_support_access fsa
         LEFT JOIN users u ON fsa.family_member_email = u.email
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE fsa.user_id = $1 AND fsa.active = true
         ORDER BY fsa.created_at DESC`,
        [userId]
      );

      return result.rows.map((row) => ({
        id: row.id,
        email: row.family_member_email,
        name:
          row.family_member_name ||
          `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
          row.family_member_email,
        relationship: row.relationship,
        isRegisteredUser: !!row.family_member_user_id,
        accountType: row.account_type || "regular",
        userId: row.family_member_user_id,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error("[FamilyService] Error getting family members:", error);
      throw error;
    }
  }

  /**
   * Get pending invitations for a user
   */
  async getPendingInvitations(userId) {
    try {
      const result = await database.query(
        `SELECT * FROM family_invitations 
         WHERE user_id = $1 AND status = 'pending'
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      console.error("[FamilyService] Error getting invitations:", error);
      throw error;
    }
  }

  /**
   * Remove a family member
   */
  async removeFamilyMember(userId, familyMemberId) {
    try {
      // Deactivate access
      await database.query(
        `UPDATE family_support_access 
         SET active = false 
         WHERE id = $1 AND user_id = $2`,
        [familyMemberId, userId]
      );

      return { success: true };
    } catch (error) {
      console.error("[FamilyService] Error removing family member:", error);
      throw error;
    }
  }

  /**
   * Cancel an invitation
   */
  async cancelInvitation(userId, invitationId) {
    try {
      await database.query(
        `UPDATE family_invitations 
         SET status = 'cancelled' 
         WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
        [invitationId, userId]
      );

      return { success: true };
    } catch (error) {
      console.error("[FamilyService] Error cancelling invitation:", error);
      throw error;
    }
  }

  /**
   * Get users who are supporting the current user (job seeker)
   * Returns family members who have accepted invitations from this job seeker
   * 
   * This finds all family members who have accepted invitations to support this job seeker
   */
  async getUsersWhoInvitedMe(jobSeekerUserId) {
    try {
      // Find all accepted invitations sent BY this job seeker (user_id = job seeker)
      // These are invitations that family members have accepted to support this job seeker
      const result = await database.query(
        `SELECT DISTINCT
          COALESCE(fm_user.u_id, NULL) as user_id,
          COALESCE(fm_user.email, fi.email) as email,
          fm_profile.first_name,
          fm_profile.last_name,
          fi.family_member_name,
          fi.relationship,
          fi.accepted_at as created_at
         FROM family_invitations fi
         LEFT JOIN users fm_user ON LOWER(fm_user.email) = LOWER(fi.email)
         LEFT JOIN profiles fm_profile ON fm_user.u_id = fm_profile.user_id
         WHERE fi.user_id = $1 
           AND fi.status = 'accepted'
         ORDER BY fi.accepted_at DESC`,
        [jobSeekerUserId]
      );

      return result.rows.map((row) => ({
        id: row.user_id, // Use user_id as id for consistency
        userId: row.user_id,
        email: row.email,
        name:
          row.family_member_name ||
          `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
          row.email,
        relationship: row.relationship,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error(
        "[FamilyService] Error getting users who invited me:",
        error
      );
      throw error;
    }
  }

  /**
   * Get family progress summary for a user (family-friendly, no sensitive data)
   */
  async getFamilyProgressSummary(userId) {
    try {
      // Get basic job search stats (without sensitive details)
      const jobStats = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'applied') as applications_count,
          COUNT(*) FILTER (WHERE status = 'interview') as interviews_count,
          COUNT(*) FILTER (WHERE status = 'offer') as offers_count
         FROM job_opportunities 
         WHERE user_id = $1`,
        [userId]
      );

      // Get recent milestones (from family_progress_summaries or generate)
      const milestones = await database.query(
        `SELECT * FROM family_progress_summaries 
         WHERE user_id = $1 
         ORDER BY generated_at DESC 
         LIMIT 1`,
        [userId]
      );

      return {
        jobStats: jobStats.rows[0] || {
          applications_count: 0,
          interviews_count: 0,
          offers_count: 0,
        },
        milestones: milestones.rows[0] || null,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[FamilyService] Error getting progress summary:", error);
      throw error;
    }
  }

  /**
   * Create a family communication
   */
  async createCommunication(userId, familyMemberUserId, communicationData) {
    try {
      const { communication_type, message } = communicationData;
      const communicationId = uuidv4();

      await database.query(
        `INSERT INTO family_communications 
         (id, user_id, family_member_user_id, communication_type, message)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          communicationId,
          userId,
          familyMemberUserId,
          communication_type,
          message,
        ]
      );

      return { id: communicationId, success: true };
    } catch (error) {
      console.error("[FamilyService] Error creating communication:", error);
      throw error;
    }
  }

  /**
   * Get communications for a user
   */
  async getCommunications(userId, familyMemberUserId = null) {
    try {
      let query = `
        SELECT fc.*, 
               u.email as family_member_email,
               p.first_name, p.last_name
        FROM family_communications fc
        LEFT JOIN users u ON fc.family_member_user_id = u.u_id
        LEFT JOIN profiles p ON u.u_id = p.user_id
        WHERE fc.user_id = $1
      `;
      const params = [userId];

      if (familyMemberUserId) {
        query += ` AND fc.family_member_user_id = $2`;
        params.push(familyMemberUserId);
      }

      query += ` ORDER BY fc.created_at DESC LIMIT 50`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("[FamilyService] Error getting communications:", error);
      throw error;
    }
  }

  /**
   * Create a celebration
   * @param {string} familyMemberUserId - The family member creating the celebration (from session)
   * @param {string} jobSeekerUserId - The job seeker being celebrated (from request)
   * @param {Object} celebrationData - Celebration data
   */
  async createCelebration(familyMemberUserId, jobSeekerUserId, celebrationData) {
    try {
      const { celebration_type, title, description, milestone_data } =
        celebrationData;
      const celebrationId = uuidv4();

      // user_id = job seeker (person being celebrated)
      // family_member_user_id = family member (person creating the celebration)
      await database.query(
        `INSERT INTO family_celebrations 
         (id, user_id, family_member_user_id, celebration_type, title, description, milestone_data, shared_with_family)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [
          celebrationId,
          jobSeekerUserId, // The job seeker being celebrated
          familyMemberUserId, // The family member creating it
          celebration_type,
          title,
          description || null,
          milestone_data ? JSON.stringify(milestone_data) : null,
        ]
      );

      return { id: celebrationId, success: true };
    } catch (error) {
      console.error("[FamilyService] Error creating celebration:", error);
      throw error;
    }
  }

  /**
   * Get celebrations for a user
   * @param {string} currentUserId - The current logged-in user (from session)
   * @param {string} jobSeekerUserId - Optional: specific job seeker to get celebrations for (from query param)
   * 
   * If jobSeekerUserId is provided:
   *   - Returns celebrations FOR that job seeker (where user_id = jobSeekerUserId)
   * 
   * If jobSeekerUserId is NOT provided:
   *   - Returns celebrations where user is either:
   *     - The job seeker (user_id = currentUserId)
   *     - OR the family member who created them (family_member_user_id = currentUserId)
   */
  async getCelebrations(currentUserId, jobSeekerUserId = null) {
    try {
      let query = `
        SELECT fc.*,
               u.email as family_member_email,
               p.first_name, p.last_name
        FROM family_celebrations fc
        LEFT JOIN users u ON fc.family_member_user_id = u.u_id
        LEFT JOIN profiles p ON u.u_id = p.user_id
        WHERE fc.shared_with_family = true
      `;
      const params = [];

      if (jobSeekerUserId) {
        // Get celebrations FOR a specific job seeker
        query += ` AND fc.user_id = $1`;
        params.push(jobSeekerUserId);
      } else {
        // Get celebrations where current user is either the job seeker OR the family member
        query += ` AND (fc.user_id = $1 OR fc.family_member_user_id = $1)`;
        params.push(currentUserId);
      }

      query += ` ORDER BY fc.created_at DESC LIMIT 20`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("[FamilyService] Error getting celebrations:", error);
      throw error;
    }
  }

  /**
   * Track well-being
   */
  async trackWellbeing(userId, trackedByUserId, wellbeingData) {
    try {
      const {
        stress_level,
        mood_indicator,
        energy_level,
        sleep_quality,
        notes,
        wellbeing_indicators,
      } = wellbeingData;

      const trackingId = uuidv4();

      await database.query(
        `INSERT INTO family_wellbeing_tracking 
         (id, user_id, tracked_by_user_id, stress_level, mood_indicator, energy_level, sleep_quality, notes, wellbeing_indicators)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          trackingId,
          userId,
          trackedByUserId,
          stress_level || null,
          mood_indicator || null,
          energy_level || null,
          sleep_quality || null,
          notes || null,
          wellbeing_indicators ? JSON.stringify(wellbeing_indicators) : null,
        ]
      );

      return { id: trackingId, success: true };
    } catch (error) {
      console.error("[FamilyService] Error tracking wellbeing:", error);
      throw error;
    }
  }

  /**
   * Get wellbeing tracking data
   */
  async getWellbeingTracking(userId, trackedByUserId = null) {
    try {
      let query = `
        SELECT fwt.*,
               u.email as tracked_by_email,
               p.first_name, p.last_name
        FROM family_wellbeing_tracking fwt
        LEFT JOIN users u ON fwt.tracked_by_user_id = u.u_id
        LEFT JOIN profiles p ON u.u_id = p.user_id
        WHERE fwt.user_id = $1
      `;
      const params = [userId];

      if (trackedByUserId) {
        query += ` AND fwt.tracked_by_user_id = $2`;
        params.push(trackedByUserId);
      }

      query += ` ORDER BY fwt.created_at DESC LIMIT 30`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("[FamilyService] Error getting wellbeing tracking:", error);
      throw error;
    }
  }

  /**
   * Get or create boundary settings
   */
  async getBoundarySettings(userId, familyMemberUserId) {
    try {
      const result = await database.query(
        `SELECT * FROM family_boundary_settings 
         WHERE user_id = $1 AND family_member_user_id = $2`,
        [userId, familyMemberUserId]
      );

      return result.rows;
    } catch (error) {
      console.error("[FamilyService] Error getting boundary settings:", error);
      throw error;
    }
  }

  /**
   * Update boundary settings
   */
  async updateBoundarySettings(userId, familyMemberUserId, settings) {
    try {
      for (const setting of settings) {
        await database.query(
          `INSERT INTO family_boundary_settings 
           (user_id, family_member_user_id, setting_type, setting_value, ai_suggestions, updated_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, family_member_user_id, setting_type)
           DO UPDATE SET 
             setting_value = EXCLUDED.setting_value,
             ai_suggestions = EXCLUDED.ai_suggestions,
             updated_at = CURRENT_TIMESTAMP`,
          [
            userId,
            familyMemberUserId,
            setting.setting_type,
            JSON.stringify(setting.setting_value),
            setting.ai_suggestions
              ? JSON.stringify(setting.ai_suggestions)
              : null,
          ]
        );
      }

      return { success: true };
    } catch (error) {
      console.error("[FamilyService] Error updating boundary settings:", error);
      throw error;
    }
  }

  /**
   * Track support effectiveness
   */
  async trackSupportEffectiveness(userId, familyMemberUserId, trackingData) {
    try {
      const {
        support_type,
        emotional_support_score,
        impact_on_performance,
        stress_management_notes,
        wellbeing_indicators,
        support_activity_type,
        support_activity_details,
        performance_metrics,
      } = trackingData;

      const trackingId = uuidv4();

      await database.query(
        `INSERT INTO support_effectiveness_tracking 
         (id, user_id, family_member_user_id, support_type, emotional_support_score, 
          impact_on_performance, stress_management_notes, wellbeing_indicators,
          support_activity_type, support_activity_details, performance_metrics)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          trackingId,
          userId,
          familyMemberUserId,
          support_type || null,
          emotional_support_score || null,
          impact_on_performance || null,
          stress_management_notes || null,
          wellbeing_indicators ? JSON.stringify(wellbeing_indicators) : null,
          support_activity_type || null,
          support_activity_details
            ? JSON.stringify(support_activity_details)
            : null,
          performance_metrics ? JSON.stringify(performance_metrics) : null,
        ]
      );

      return { id: trackingId, success: true };
    } catch (error) {
      console.error(
        "[FamilyService] Error tracking support effectiveness:",
        error
      );
      throw error;
    }
  }

  /**
   * Get support effectiveness data
   */
  async getSupportEffectiveness(userId, familyMemberUserId = null) {
    try {
      let query = `
        SELECT set.*,
               u.email as family_member_email,
               p.first_name, p.last_name
        FROM support_effectiveness_tracking set
        LEFT JOIN users u ON set.family_member_user_id = u.u_id
        LEFT JOIN profiles p ON u.u_id = p.user_id
        WHERE set.user_id = $1
      `;
      const params = [userId];

      if (familyMemberUserId) {
        query += ` AND set.family_member_user_id = $2`;
        params.push(familyMemberUserId);
      }

      query += ` ORDER BY set.created_at DESC LIMIT 30`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error(
        "[FamilyService] Error getting support effectiveness:",
        error
      );
      throw error;
    }
  }

  /**
   * Get educational resources
   * @param {string} userId - The job seeker's user ID (optional, for user-specific resources)
   * @param {string} category - Optional category filter
   */
  async getEducationalResources(userId = null, category = null) {
    try {
      let query = `SELECT * FROM family_educational_resources WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error(
        "[FamilyService] Error getting educational resources:",
        error
      );
      throw error;
    }
  }

  /**
   * Get AI support suggestions
   */
  async getSupportSuggestions(userId, familyMemberUserId = null) {
    try {
      let query = `
        SELECT fss.*,
               u.email as family_member_email,
               p.first_name, p.last_name
        FROM family_support_suggestions fss
        LEFT JOIN users u ON fss.family_member_user_id = u.u_id
        LEFT JOIN profiles p ON u.u_id = p.user_id
        WHERE fss.user_id = $1
      `;
      const params = [userId];

      if (familyMemberUserId) {
        query += ` AND fss.family_member_user_id = $2`;
        params.push(familyMemberUserId);
      }

      query += ` ORDER BY fss.created_at DESC LIMIT 20`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error(
        "[FamilyService] Error getting support suggestions:",
        error
      );
      throw error;
    }
  }
}

export default new FamilyService();
