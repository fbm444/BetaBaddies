import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import crypto from "crypto";
import emailService from "../emailService.js";
import { chatService } from "./index.js";

/**
 * Service for Team Account Management (UC-108)
 * Handles team creation, member management, invitations, and permissions
 */
class TeamService {
  /**
   * Get default permissions for a role
   */
  getDefaultPermissions(role) {
    const rolePermissions = {
      admin: {
        can_manage_members: true,
        can_assign_tasks: true,
        can_view_all_progress: true,
        can_share_jobs: true,
        can_provide_feedback: true,
        can_view_analytics: true,
        can_manage_team_settings: true
      },
      mentor: {
        can_manage_members: false,
        can_assign_tasks: true,
        can_view_all_progress: true,
        can_share_jobs: true,
        can_provide_feedback: true,
        can_view_analytics: true,
        can_manage_team_settings: false
      },
      career_coach: {
        can_manage_members: false,
        can_assign_tasks: true,
        can_view_all_progress: true,
        can_share_jobs: true,
        can_provide_feedback: true,
        can_view_analytics: true,
        can_manage_team_settings: false
      },
      peer: {
        can_manage_members: false,
        can_assign_tasks: false,
        can_view_all_progress: false,
        can_share_jobs: true,
        can_provide_feedback: false,
        can_view_analytics: false,
        can_manage_team_settings: false
      },
      candidate: {
        can_manage_members: false,
        can_assign_tasks: false,
        can_view_all_progress: false,
        can_share_jobs: true,
        can_provide_feedback: false,
        can_view_analytics: false,
        can_manage_team_settings: false
      }
    };

    return rolePermissions[role] || rolePermissions.candidate;
  }
  /**
   * Create a new team
   */
  async createTeam(userId, teamData) {
    try {
      const { teamName, teamType, billingEmail, subscriptionTier, maxMembers } = teamData;
      
      const teamId = uuidv4();
      
      // Create team
      await database.query(
        `INSERT INTO teams (id, team_name, team_type, billing_email, subscription_tier, max_members, active_members)
         VALUES ($1, $2, $3, $4, $5, $6, 1)`,
        [teamId, teamName, teamType || "standard", billingEmail, subscriptionTier || "basic", maxMembers || 10]
      );

      // Add creator as admin
      const adminPermissions = this.getDefaultPermissions('admin');
      await database.query(
        `INSERT INTO team_members (team_id, user_id, role, permissions, invitation_status, joined_at, active)
         VALUES ($1, $2, 'admin', $3, 'accepted', CURRENT_TIMESTAMP, true)`,
        [teamId, userId, JSON.stringify(adminPermissions)]
      );

      // Update user's team_id
      await database.query(
        `UPDATE users SET team_id = $1 WHERE u_id = $2`,
        [teamId, userId]
      );

      // Log activity
      await this.logActivity(teamId, userId, "admin", "team_created", {
        team_name: teamName
      });

      // Create team chat conversation
      try {
        await chatService.getOrCreateConversation(userId, {
          conversationType: "team",
          teamId: teamId,
          title: `${teamName} Team Chat`,
          participantIds: [userId]
        });
      } catch (chatError) {
        console.error("[TeamService] Error creating team chat:", chatError);
        // Don't fail team creation if chat creation fails
      }

      return await this.getTeamById(teamId, userId);
    } catch (error) {
      console.error("[TeamService] Error creating team:", error);
      throw error;
    }
  }

  /**
   * Get team by ID
   */
  async getTeamById(teamId, userId) {
    try {
      const teamResult = await database.query(
        `SELECT t.*, 
                (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND active = true) as active_members_count
         FROM teams t
         WHERE t.id = $1`,
        [teamId]
      );

      if (teamResult.rows.length === 0) {
        throw new Error("Team not found");
      }

      const team = teamResult.rows[0];

      // Get team members
      const membersResult = await database.query(
        `SELECT tm.*, u.email, u.role as user_role
         FROM team_members tm
         JOIN users u ON tm.user_id = u.u_id
         WHERE tm.team_id = $1 AND tm.active = true
         ORDER BY tm.joined_at ASC`,
        [teamId]
      );

      team.members = membersResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        email: row.email,
        role: row.role,
        userRole: row.user_role,
        permissions: typeof row.permissions === "string" ? JSON.parse(row.permissions) : row.permissions,
        invitationStatus: row.invitation_status,
        joinedAt: row.joined_at,
        invitedBy: row.invited_by
      }));

      // Get user's role in team
      const userMemberResult = await database.query(
        `SELECT role, permissions FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, userId]
      );

      team.userRole = userMemberResult.rows[0]?.role || null;
      team.userPermissions = userMemberResult.rows[0]?.permissions 
        ? (typeof userMemberResult.rows[0].permissions === "string" 
            ? JSON.parse(userMemberResult.rows[0].permissions) 
            : userMemberResult.rows[0].permissions)
        : {};

      // Get pending invitations
      const invitationsResult = await database.query(
        `SELECT ti.*, u.email as inviter_email, p.first_name, p.last_name
         FROM team_invitations ti
         LEFT JOIN users u ON ti.invited_by = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE ti.team_id = $1 AND ti.status = 'pending'
         ORDER BY ti.created_at DESC`,
        [teamId]
      );

      team.invitations = invitationsResult.rows.map(row => ({
        id: row.id,
        email: row.email,
        role: row.role,
        status: row.status,
        invitationToken: row.invitation_token,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        acceptedAt: row.accepted_at,
        inviterEmail: row.inviter_email,
        inviterName: row.first_name && row.last_name 
          ? `${row.first_name} ${row.last_name}`.trim() 
          : null
      }));

      return team;
    } catch (error) {
      console.error("[TeamService] Error getting team:", error);
      throw error;
    }
  }

  /**
   * Get all teams for a user
   */
  async getUserTeams(userId) {
    try {
      const result = await database.query(
        `SELECT t.*, tm.role as user_role, tm.permissions as user_permissions,
                (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND active = true) as active_members_count
         FROM teams t
         JOIN team_members tm ON t.id = tm.team_id
         WHERE tm.user_id = $1 AND tm.active = true
         ORDER BY t.created_at DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        teamName: row.team_name,
        teamType: row.team_type,
        subscriptionTier: row.subscription_tier,
        maxMembers: row.max_members,
        activeMembers: parseInt(row.active_members_count),
        userRole: row.user_role,
        userPermissions: typeof row.user_permissions === "string" 
          ? JSON.parse(row.user_permissions) 
          : row.user_permissions,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error("[TeamService] Error getting user teams:", error);
      throw error;
    }
  }

  /**
   * Invite member to team
   */
  async inviteMember(teamId, invitedBy, invitationData) {
    try {
      const { email, role = "candidate", permissions = {} } = invitationData;
      
      // Validate role
      const validRoles = ['admin', 'mentor', 'career_coach', 'peer', 'candidate'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }
      
      // Get default permissions for role if not provided
      const defaultPermissions = this.getDefaultPermissions(role);
      const finalPermissions = Object.keys(permissions).length > 0 
        ? { ...defaultPermissions, ...permissions }
        : defaultPermissions;

      // Check if user already in team
      const existingUser = await database.query(
        `SELECT u_id FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        const existingMember = await database.query(
          `SELECT id FROM team_members 
           WHERE team_id = $1 AND user_id = $2 AND active = true`,
          [teamId, existingUser.rows[0].u_id]
        );

        if (existingMember.rows.length > 0) {
          throw new Error("User is already a member of this team");
        }
      }

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create invitation
      const invitationId = uuidv4();
      await database.query(
        `INSERT INTO team_invitations 
         (id, team_id, invited_by, email, role, permissions, invitation_token, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          invitationId,
          teamId,
          invitedBy,
          email.toLowerCase(),
          role,
          JSON.stringify(finalPermissions),
          invitationToken,
          expiresAt
        ]
      );

      // Get team and inviter info for email
      const teamResult = await database.query(
        `SELECT team_name FROM teams WHERE id = $1`,
        [teamId]
      );
      const teamName = teamResult.rows[0]?.team_name || "a team";

      const inviterResult = await database.query(
        `SELECT u.email, p.first_name, p.last_name 
         FROM users u
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE u.u_id = $1`,
        [invitedBy]
      );
      const inviter = inviterResult.rows[0];
      const inviterName = inviter 
        ? `${inviter.first_name || ""} ${inviter.last_name || ""}`.trim() || null
        : null;

      // Send invitation email
      try {
        await emailService.sendTeamInvitation(email.toLowerCase(), {
          teamName,
          inviterName,
          inviterEmail: inviter?.email || "a team member",
          role,
          invitationToken
        });
      } catch (emailError) {
        console.error("[TeamService] Error sending invitation email:", emailError);
        // Don't throw - invitation is still created even if email fails
      }

      // Log activity
      await this.logActivity(teamId, invitedBy, "admin", "member_invited", {
        email: email,
        role: role
      });

      return {
        id: invitationId,
        email: email,
        role: role,
        invitationToken: invitationToken,
        expiresAt: expiresAt
      };
    } catch (error) {
      console.error("[TeamService] Error inviting member:", error);
      throw error;
    }
  }

  /**
   * Get invitation details by token (public, for invitation page)
   */
  async getInvitationByToken(invitationToken) {
    try {
      const result = await database.query(
        `SELECT ti.*, t.team_name, u.email as inviter_email, p.first_name, p.last_name
         FROM team_invitations ti
         JOIN teams t ON ti.team_id = t.id
         LEFT JOIN users u ON ti.invited_by = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE ti.invitation_token = $1`,
        [invitationToken]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const invitation = result.rows[0];
      const isExpired = new Date(invitation.expires_at) < new Date();
      const isUsed = invitation.status !== "pending";

      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        teamName: invitation.team_name,
        teamId: invitation.team_id,
        inviterEmail: invitation.inviter_email,
        inviterName: invitation.first_name && invitation.last_name
          ? `${invitation.first_name} ${invitation.last_name}`.trim()
          : null,
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at,
        isExpired,
        isUsed,
        isValid: !isExpired && !isUsed && invitation.status === "pending"
      };
    } catch (error) {
      console.error("[TeamService] Error getting invitation by token:", error);
      throw error;
    }
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(invitationToken, userId) {
    try {
      // Get invitation
      const invitationResult = await database.query(
        `SELECT * FROM team_invitations 
         WHERE invitation_token = $1 AND status = 'pending'`,
        [invitationToken]
      );

      if (invitationResult.rows.length === 0) {
        throw new Error("Invitation not found or already used");
      }

      const invitation = invitationResult.rows[0];

      // Check expiry
      if (new Date(invitation.expires_at) < new Date()) {
        await database.query(
          `UPDATE team_invitations SET status = 'expired' WHERE id = $1`,
          [invitation.id]
        );
        throw new Error("Invitation has expired");
      }

      // Verify email matches
      const userResult = await database.query(
        `SELECT email FROM users WHERE u_id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0 || 
          userResult.rows[0].email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new Error("Email does not match invitation");
      }

      // Add user to team
      await database.query(
        `INSERT INTO team_members (team_id, user_id, role, permissions, invitation_status, joined_at, active, invited_by)
         VALUES ($1, $2, $3, $4, 'accepted', CURRENT_TIMESTAMP, true, $5)
         ON CONFLICT DO NOTHING`,
        [
          invitation.team_id,
          userId,
          invitation.role,
          invitation.permissions,
          invitation.invited_by
        ]
      );

      // Update user's team_id if not set
      await database.query(
        `UPDATE users SET team_id = $1 WHERE u_id = $2 AND team_id IS NULL`,
        [invitation.team_id, userId]
      );

      // Add user to team chat conversation
      try {
        const teamChat = await database.query(
          `SELECT id FROM chat_conversations 
           WHERE team_id = $1 AND conversation_type = 'team'`,
          [invitation.team_id]
        );
        if (teamChat.rows.length > 0) {
          await chatService.addParticipant(teamChat.rows[0].id, userId, invitation.role);
        }
      } catch (chatError) {
        console.error("[TeamService] Error adding user to team chat:", chatError);
        // Don't fail invitation acceptance if chat update fails
      }

      // Update invitation status
      await database.query(
        `UPDATE team_invitations 
         SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [invitation.id]
      );

      // Update team active_members count
      await database.query(
        `UPDATE teams 
         SET active_members = (SELECT COUNT(*) FROM team_members WHERE team_id = $1 AND active = true)
         WHERE id = $1`,
        [invitation.team_id]
      );

      // Log activity
      await this.logActivity(invitation.team_id, userId, invitation.role, "member_joined", {});

      return await this.getTeamById(invitation.team_id, userId);
    } catch (error) {
      console.error("[TeamService] Error accepting invitation:", error);
      throw error;
    }
  }

  /**
   * Update team member role and permissions
   */
  async updateMemberRole(teamId, memberUserId, updatedBy, roleData) {
    try {
      // Check if updater has permission
      const updaterMember = await database.query(
        `SELECT role, permissions FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, updatedBy]
      );

      if (updaterMember.rows.length === 0) {
        throw new Error("You are not a member of this team");
      }

      const updaterRole = updaterMember.rows[0].role;
      if (updaterRole !== "admin") {
        throw new Error("Only admins can update member roles");
      }

      const { role, permissions } = roleData;

      await database.query(
        `UPDATE team_members 
         SET role = $1, permissions = $2, updated_at = CURRENT_TIMESTAMP
         WHERE team_id = $3 AND user_id = $4 AND active = true`,
        [role, JSON.stringify(permissions || {}), teamId, memberUserId]
      );

      // Log activity
      await this.logActivity(teamId, updatedBy, updaterRole, "member_role_updated", {
        member_user_id: memberUserId,
        new_role: role
      });

      return await this.getTeamById(teamId, updatedBy);
    } catch (error) {
      console.error("[TeamService] Error updating member role:", error);
      throw error;
    }
  }

  /**
   * Remove member from team
   */
  async removeMember(teamId, memberUserId, removedBy) {
    try {
      // Check permissions
      const updaterMember = await database.query(
        `SELECT role FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, removedBy]
      );

      if (updaterMember.rows.length === 0) {
        throw new Error("You are not a member of this team");
      }

      const updaterRole = updaterMember.rows[0].role;
      if (updaterRole !== "admin" && removedBy !== memberUserId) {
        throw new Error("Only admins can remove other members");
      }

      // Deactivate member
      await database.query(
        `UPDATE team_members 
         SET active = false, updated_at = CURRENT_TIMESTAMP
         WHERE team_id = $1 AND user_id = $2`,
        [teamId, memberUserId]
      );

      // Update team active_members count
      await database.query(
        `UPDATE teams 
         SET active_members = (SELECT COUNT(*) FROM team_members WHERE team_id = $1 AND active = true)
         WHERE id = $1`,
        [teamId]
      );

      // Log activity
      await this.logActivity(teamId, removedBy, updaterRole, "member_removed", {
        removed_user_id: memberUserId
      });

      return { success: true };
    } catch (error) {
      console.error("[TeamService] Error removing member:", error);
      throw error;
    }
  }

  /**
   * Get team dashboard data
   */
  async getTeamDashboard(teamId, userId) {
    try {
      // Verify user is team member
      const memberCheck = await database.query(
        `SELECT role FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, userId]
      );

      if (memberCheck.rows.length === 0) {
        throw new Error("You are not a member of this team");
      }

      // Get aggregate statistics
      const stats = await database.query(
        `SELECT 
          COUNT(DISTINCT tm.user_id) FILTER (WHERE tm.role = 'candidate') as total_candidates,
          COUNT(DISTINCT tm.user_id) FILTER (WHERE tm.role = 'mentor') as total_mentors,
          COUNT(DISTINCT jo.id) as total_jobs,
          COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'Applied') as applied_jobs,
          COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'Interview') as interview_jobs,
          COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'Offer') as offer_jobs,
          COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'pending') as pending_tasks,
          COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'completed') as completed_tasks
         FROM teams t
         LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.active = true
         LEFT JOIN users u ON tm.user_id = u.u_id
         LEFT JOIN job_opportunities jo ON u.u_id = jo.user_id
         LEFT JOIN preparation_tasks pt ON pt.team_id = t.id
         WHERE t.id = $1`,
        [teamId]
      );

      // Get recent activity
      const recentActivity = await database.query(
        `SELECT * FROM activity_logs 
         WHERE team_id = $1 
         ORDER BY created_at DESC 
         LIMIT 20`,
        [teamId]
      );

      // Get team performance metrics
      const performance = await database.query(
        `SELECT 
          AVG(CASE WHEN jo.status = 'Offer' THEN 1 ELSE 0 END) * 100 as offer_rate,
          AVG(CASE WHEN jo.status IN ('Interview', 'Offer') THEN 1 ELSE 0 END) * 100 as interview_rate
         FROM team_members tm
         JOIN users u ON tm.user_id = u.u_id
         JOIN job_opportunities jo ON u.u_id = jo.user_id
         WHERE tm.team_id = $1 AND tm.active = true AND tm.role = 'candidate'`,
        [teamId]
      );

      return {
        statistics: stats.rows[0],
        recentActivity: recentActivity.rows,
        performance: performance.rows[0] || { offer_rate: 0, interview_rate: 0 }
      };
    } catch (error) {
      console.error("[TeamService] Error getting team dashboard:", error);
      throw error;
    }
  }

  /**
   * Get team invitations (all statuses)
   */
  async getTeamInvitations(teamId, userId) {
    try {
      // Verify user is team member
      const memberCheck = await database.query(
        `SELECT role FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, userId]
      );

      if (memberCheck.rows.length === 0) {
        throw new Error("You are not a member of this team");
      }

      const result = await database.query(
        `SELECT ti.*, u.email as inviter_email, p.first_name, p.last_name
         FROM team_invitations ti
         LEFT JOIN users u ON ti.invited_by = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE ti.team_id = $1
         ORDER BY ti.created_at DESC`,
        [teamId]
      );

      return result.rows.map(row => ({
        id: row.id,
        email: row.email,
        role: row.role,
        status: row.status,
        invitationToken: row.invitation_token,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        acceptedAt: row.accepted_at,
        inviterEmail: row.inviter_email,
        inviterName: row.first_name && row.last_name 
          ? `${row.first_name} ${row.last_name}`.trim() 
          : null
      }));
    } catch (error) {
      console.error("[TeamService] Error getting team invitations:", error);
      throw error;
    }
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(teamId, invitationId, userId) {
    try {
      // Verify user is admin
      const memberCheck = await database.query(
        `SELECT role FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, userId]
      );

      if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== "admin") {
        throw new Error("Only team admins can cancel invitations");
      }

      await database.query(
        `UPDATE team_invitations 
         SET status = 'cancelled' 
         WHERE id = $1 AND team_id = $2 AND status = 'pending'`,
        [invitationId, teamId]
      );

      return { success: true };
    } catch (error) {
      console.error("[TeamService] Error cancelling invitation:", error);
      throw error;
    }
  }

  /**
   * Log activity
   */
  async logActivity(teamId, userId, actorRole, activityType, activityData) {
    try {
      await database.query(
        `INSERT INTO activity_logs (team_id, user_id, actor_role, activity_type, activity_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [teamId, userId, actorRole, activityType, JSON.stringify(activityData)]
      );
    } catch (error) {
      console.error("[TeamService] Error logging activity:", error);
      // Don't throw - activity logging shouldn't break main flow
    }
  }
}

export default new TeamService();

