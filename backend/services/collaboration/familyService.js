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
        console.log("[FamilyService] Sending family invitation email to:", email.toLowerCase());
        console.log("[FamilyService] Email service available:", !!emailService);
        console.log("[FamilyService] sendFamilyInvitation method available:", typeof emailService.sendFamilyInvitation);
        
        if (!emailService || typeof emailService.sendFamilyInvitation !== 'function') {
          console.error("[FamilyService] Email service or sendFamilyInvitation method not available!");
          throw new Error("Email service method not available");
        }
        
        await emailService.sendFamilyInvitation(email.toLowerCase(), {
          inviterName,
          inviterEmail: inviter?.email || "",
          familyMemberName: familyMemberName || "Family Member",
          relationship: relationship || "family member",
          invitationToken,
        });
        console.log("[FamilyService] Family invitation email sent successfully");
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
      // (so they can see who invited them)
      if (userResult.rows.length > 0) {
        // Check if reverse access exists
        const reverseAccess = await database.query(
          `SELECT id FROM family_support_access 
           WHERE user_id = $1 AND family_member_email = $2`,
          [userId, invitation.email]
        );

        if (reverseAccess.rows.length === 0) {
          // Get the inviter's email
          const inviterResult = await database.query(
            `SELECT email FROM users WHERE u_id = $1`,
            [invitation.invited_by]
          );

          if (inviterResult.rows.length > 0) {
            await database.query(
              `INSERT INTO family_support_access 
               (user_id, family_member_email, family_member_name, relationship, active)
               VALUES ($1, $2, $3, $4, true)`,
              [
                userId,
                inviterResult.rows[0].email,
                `${invitation.inviter_first_name || ""} ${invitation.inviter_last_name || ""}`.trim() || null,
                "family_member",
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
        name: row.family_member_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.family_member_email,
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
   * Get users who have invited the current user as a family member
   */
  async getUsersWhoInvitedMe(familyMemberUserId) {
    try {
      // Get the current user's email
      const userResult = await database.query(
        `SELECT email FROM users WHERE u_id = $1`,
        [familyMemberUserId]
      );

      if (userResult.rows.length === 0) {
        return [];
      }

      const userEmail = userResult.rows[0].email;

      // Find all users who have this user as a family member
      const result = await database.query(
        `SELECT 
          fsa.user_id,
          u.email,
          p.first_name,
          p.last_name,
          fsa.family_member_name,
          fsa.relationship,
          fsa.created_at
         FROM family_support_access fsa
         JOIN users u ON fsa.user_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE fsa.family_member_email = $1 AND fsa.active = true
         ORDER BY fsa.created_at DESC`,
        [userEmail]
      );

      return result.rows.map((row) => ({
        userId: row.user_id,
        email: row.email,
        name: row.family_member_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email,
        relationship: row.relationship,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error("[FamilyService] Error getting users who invited me:", error);
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
}

export default new FamilyService();

