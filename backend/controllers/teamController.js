import { asyncHandler } from "../middleware/errorHandler.js";
import { teamService } from "../services/collaboration/index.js";

class TeamController {
  /**
   * POST /api/teams
   * Create a new team
   */
  createTeam = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { teamName, teamType, billingEmail, subscriptionTier, maxMembers } = req.body;

    if (!teamName) {
      return res.status(400).json({
        ok: false,
        error: { message: "teamName is required" },
      });
    }

    const team = await teamService.createTeam(userId, {
      teamName,
      teamType,
      billingEmail,
      subscriptionTier,
      maxMembers,
    });

    res.status(201).json({
      ok: true,
      data: { team },
    });
  });

  /**
   * GET /api/teams
   * Get all teams for current user
   */
  getUserTeams = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const teams = await teamService.getUserTeams(userId);

    res.status(200).json({
      ok: true,
      data: { teams },
    });
  });

  /**
   * GET /api/teams/:id
   * Get team by ID
   */
  getTeamById = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const team = await teamService.getTeamById(id, userId);

    res.status(200).json({
      ok: true,
      data: { team },
    });
  });

  /**
   * POST /api/teams/:id/invitations
   * Invite member to team
   */
  inviteMember = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: teamId } = req.params;
    const { email, role, permissions } = req.body;

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: { message: "email is required" },
      });
    }

    const invitation = await teamService.inviteMember(teamId, userId, {
      email,
      role,
      permissions,
    });

    res.status(201).json({
      ok: true,
      data: { invitation },
    });
  });

  /**
   * GET /api/teams/invitations/:token
   * Get invitation details by token (public endpoint)
   */
  getInvitationByToken = asyncHandler(async (req, res) => {
    const { token } = req.params;

    const invitation = await teamService.getInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({
        ok: false,
        error: { message: "Invitation not found" },
      });
    }

    res.status(200).json({
      ok: true,
      data: { invitation },
    });
  });

  /**
   * POST /api/teams/invitations/:token/accept
   * Accept team invitation
   */
  acceptInvitation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { token } = req.params;

    const team = await teamService.acceptInvitation(token, userId);

    res.status(200).json({
      ok: true,
      data: { team },
    });
  });

  /**
   * PUT /api/teams/:id/members/:userId
   * Update team member role
   */
  updateMemberRole = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: teamId, userId: memberUserId } = req.params;
    const { role, permissions } = req.body;

    const team = await teamService.updateMemberRole(teamId, memberUserId, userId, {
      role,
      permissions,
    });

    res.status(200).json({
      ok: true,
      data: { team },
    });
  });

  /**
   * DELETE /api/teams/:id/members/:userId
   * Remove member from team
   */
  removeMember = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: teamId, userId: memberUserId } = req.params;

    await teamService.removeMember(teamId, memberUserId, userId);

    res.status(200).json({
      ok: true,
      data: { message: "Member removed successfully" },
    });
  });

  /**
   * GET /api/teams/:id/dashboard
   * Get team dashboard data
   */
  getTeamDashboard = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: teamId } = req.params;

    const dashboard = await teamService.getTeamDashboard(teamId, userId);

    res.status(200).json({
      ok: true,
      data: { dashboard },
    });
  });

  /**
   * GET /api/teams/:id/invitations
   * Get team invitations
   */
  getTeamInvitations = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: teamId } = req.params;

    const invitations = await teamService.getTeamInvitations(teamId, userId);

    res.status(200).json({
      ok: true,
      data: { invitations },
    });
  });

  /**
   * DELETE /api/teams/:id/invitations/:invitationId
   * Cancel a pending invitation
   */
  cancelInvitation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: teamId, invitationId } = req.params;

    await teamService.cancelInvitation(teamId, invitationId, userId);

    res.status(200).json({
      ok: true,
      data: { message: "Invitation cancelled successfully" },
    });
  });
}

export default new TeamController();

