import { asyncHandler } from "../middleware/errorHandler.js";
import { familyService } from "../services/collaboration/index.js";

class FamilyController {
  /**
   * POST /api/family/invitations
   * Invite a family member
   */
  inviteFamilyMember = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { email, familyMemberName, relationship } = req.body;

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: { message: "email is required" },
      });
    }

    const invitation = await familyService.inviteFamilyMember(userId, {
      email,
      familyMemberName,
      relationship,
    });

    res.status(201).json({
      ok: true,
      data: { invitation },
    });
  });

  /**
   * GET /api/family/invitations/:token
   * Get invitation details by token (public endpoint)
   */
  getInvitationByToken = asyncHandler(async (req, res) => {
    const { token } = req.params;

    const invitation = await familyService.getInvitationByToken(token);

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
   * POST /api/family/invitations/:token/accept
   * Accept family invitation
   */
  acceptInvitation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { token } = req.params;

    const result = await familyService.acceptInvitation(token, userId);

    res.status(200).json({
      ok: true,
      data: {
        invitation: result.invitation,
        userId: result.userId,
      },
    });
  });

  /**
   * GET /api/family/members
   * Get all family members for current user
   */
  getFamilyMembers = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const members = await familyService.getFamilyMembers(userId);

    res.status(200).json({
      ok: true,
      data: { members },
    });
  });

  /**
   * GET /api/family/invitations
   * Get pending invitations for current user
   */
  getPendingInvitations = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const invitations = await familyService.getPendingInvitations(userId);

    res.status(200).json({
      ok: true,
      data: { invitations },
    });
  });

  /**
   * DELETE /api/family/members/:id
   * Remove a family member
   */
  removeFamilyMember = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    await familyService.removeFamilyMember(userId, id);

    res.status(200).json({
      ok: true,
      data: { message: "Family member removed successfully" },
    });
  });

  /**
   * DELETE /api/family/invitations/:id
   * Cancel an invitation
   */
  cancelInvitation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    await familyService.cancelInvitation(userId, id);

    res.status(200).json({
      ok: true,
      data: { message: "Invitation cancelled successfully" },
    });
  });

  /**
   * GET /api/family/invited-by
   * Get users who have invited the current user as a family member
   */
  getUsersWhoInvitedMe = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const users = await familyService.getUsersWhoInvitedMe(userId);

    res.status(200).json({
      ok: true,
      data: { users },
    });
  });

  /**
   * GET /api/family/progress/:userId
   * Get family-friendly progress summary for a user
   */
  getFamilyProgressSummary = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.session.userId;

    // Verify that current user has access to view this user's progress
    const accessCheck = await familyService.getFamilyMembers(userId);
    const hasAccess = accessCheck.some(
      (member) => member.userId === currentUserId
    );

    if (!hasAccess && userId !== currentUserId) {
      return res.status(403).json({
        ok: false,
        error: { message: "You don't have access to view this progress" },
      });
    }

    const summary = await familyService.getFamilyProgressSummary(userId);

    res.status(200).json({
      ok: true,
      data: { summary },
    });
  });
}

export default new FamilyController();

