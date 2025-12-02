import { asyncHandler } from "../middleware/errorHandler.js";
import { familyService } from "../services/collaboration/index.js";
import familySupportAIService from "../services/collaboration/familySupportAIService.js";
import familyEducationalResourcesService from "../services/collaboration/familyEducationalResourcesService.js";

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

  /**
   * POST /api/family/communications
   * Create a family communication
   */
  createCommunication = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { familyMemberUserId, communication_type, message } = req.body;

    if (!familyMemberUserId || !communication_type || !message) {
      return res.status(400).json({
        ok: false,
        error: {
          message:
            "familyMemberUserId, communication_type, and message are required",
        },
      });
    }

    const result = await familyService.createCommunication(
      userId,
      familyMemberUserId,
      {
        communication_type,
        message,
      }
    );

    res.status(201).json({
      ok: true,
      data: result,
    });
  });

  /**
   * GET /api/family/communications
   * Get communications for current user
   */
  getCommunications = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { familyMemberUserId } = req.query;

    const communications = await familyService.getCommunications(
      userId,
      familyMemberUserId || null
    );

    res.status(200).json({
      ok: true,
      data: { communications },
    });
  });

  /**
   * POST /api/family/celebrations
   * Create a celebration
   * familyMemberUserId in body = the job seeker being celebrated
   * userId from session = the family member creating the celebration
   */
  createCelebration = asyncHandler(async (req, res) => {
    const familyMemberUserId = req.session.userId; // Family member creating it
    const {
      familyMemberUserId: jobSeekerUserId, // Job seeker being celebrated (confusing name, but it's the selected member)
      celebration_type,
      title,
      description,
      milestone_data,
    } = req.body;

    if (!celebration_type || !title) {
      return res.status(400).json({
        ok: false,
        error: { message: "celebration_type and title are required" },
      });
    }

    if (!jobSeekerUserId) {
      return res.status(400).json({
        ok: false,
        error: { message: "familyMemberUserId (job seeker ID) is required" },
      });
    }

    const result = await familyService.createCelebration(
      familyMemberUserId, // Family member creating it
      jobSeekerUserId, // Job seeker being celebrated
      {
        celebration_type,
        title,
        description,
        milestone_data,
      }
    );

    res.status(201).json({
      ok: true,
      data: result,
    });
  });

  /**
   * GET /api/family/celebrations
   * Get celebrations for current user
   * 
   * If familyMemberUserId query param is provided:
   *   - Returns celebrations FOR that job seeker (for family members viewing)
   * 
   * If no query param:
   *   - Returns celebrations where current user is either the job seeker or the family member
   */
  getCelebrations = asyncHandler(async (req, res) => {
    const currentUserId = req.session.userId;
    const { familyMemberUserId } = req.query;

    // familyMemberUserId in query = the job seeker's ID (when family member is viewing)
    const celebrations = await familyService.getCelebrations(
      currentUserId,
      familyMemberUserId || null
    );

    res.status(200).json({
      ok: true,
      data: { celebrations },
    });
  });

  /**
   * POST /api/family/wellbeing
   * Track well-being
   */
  trackWellbeing = asyncHandler(async (req, res) => {
    const trackedByUserId = req.session.userId;
    const {
      userId,
      stress_level,
      mood_indicator,
      energy_level,
      sleep_quality,
      notes,
      wellbeing_indicators,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: { message: "userId is required" },
      });
    }

    const result = await familyService.trackWellbeing(trackedByUserId, userId, {
      stress_level,
      mood_indicator,
      energy_level,
      sleep_quality,
      notes,
      wellbeing_indicators,
    });

    res.status(201).json({
      ok: true,
      data: result,
    });
  });

  /**
   * GET /api/family/wellbeing
   * Get wellbeing tracking data
   */
  getWellbeingTracking = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { trackedByUserId } = req.query;

    const tracking = await familyService.getWellbeingTracking(
      userId,
      trackedByUserId || null
    );

    res.status(200).json({
      ok: true,
      data: { tracking },
    });
  });

  /**
   * GET /api/family/boundaries/:familyMemberUserId
   * Get boundary settings
   */
  getBoundarySettings = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { familyMemberUserId } = req.params;

    const settings = await familyService.getBoundarySettings(
      userId,
      familyMemberUserId
    );

    res.status(200).json({
      ok: true,
      data: { settings },
    });
  });

  /**
   * PUT /api/family/boundaries/:familyMemberUserId
   * Update boundary settings
   */
  updateBoundarySettings = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { familyMemberUserId } = req.params;
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({
        ok: false,
        error: { message: "settings array is required" },
      });
    }

    const result = await familyService.updateBoundarySettings(
      userId,
      familyMemberUserId,
      settings
    );

    res.status(200).json({
      ok: true,
      data: result,
    });
  });

  /**
   * POST /api/family/support-effectiveness
   * Track support effectiveness
   */
  trackSupportEffectiveness = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const {
      familyMemberUserId,
      support_type,
      emotional_support_score,
      impact_on_performance,
      stress_management_notes,
      wellbeing_indicators,
      support_activity_type,
      support_activity_details,
      performance_metrics,
    } = req.body;

    if (!familyMemberUserId) {
      return res.status(400).json({
        ok: false,
        error: { message: "familyMemberUserId is required" },
      });
    }

    const result = await familyService.trackSupportEffectiveness(
      userId,
      familyMemberUserId,
      {
        support_type,
        emotional_support_score,
        impact_on_performance,
        stress_management_notes,
        wellbeing_indicators,
        support_activity_type,
        support_activity_details,
        performance_metrics,
      }
    );

    res.status(201).json({
      ok: true,
      data: result,
    });
  });

  /**
   * GET /api/family/support-effectiveness
   * Get support effectiveness data
   */
  getSupportEffectiveness = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { familyMemberUserId } = req.query;

    const effectiveness = await familyService.getSupportEffectiveness(
      userId,
      familyMemberUserId || null
    );

    res.status(200).json({
      ok: true,
      data: { effectiveness },
    });
  });

  /**
   * GET /api/family/educational-resources
   * Get educational resources (generates AI resources if needed)
   */
  getEducationalResources = asyncHandler(async (req, res) => {
    const { category, userId, forceRegenerate } = req.query;
    const currentUserId = req.session.userId;

    // If userId is provided, use it (for family members viewing resources for the job seeker)
    // Otherwise, use current user's ID (for job seekers viewing their own resources)
    const targetUserId = userId || currentUserId;

    if (!targetUserId) {
      return res.status(400).json({
        ok: false,
        error: { message: "userId is required" },
      });
    }

    // Get or generate resources for this user
    const resources =
      await familyEducationalResourcesService.getOrGenerateResources(
        targetUserId,
        category || null,
        forceRegenerate === "true" || forceRegenerate === true
      );

    res.status(200).json({
      ok: true,
      data: { resources },
    });
  });

  /**
   * POST /api/family/ai-suggestions/:familyMemberUserId
   * Generate AI support suggestions
   */
  generateAISuggestions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { familyMemberUserId } = req.params;
    const context = req.body.context || {};

    const suggestions = await familySupportAIService.generateSupportSuggestions(
      userId,
      familyMemberUserId,
      context
    );

    res.status(200).json({
      ok: true,
      data: suggestions,
    });
  });

  /**
   * GET /api/family/ai-suggestions
   * Get saved AI suggestions
   */
  getAISuggestions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { familyMemberUserId } = req.query;

    const suggestions = await familyService.getSupportSuggestions(
      userId,
      familyMemberUserId || null
    );

    res.status(200).json({
      ok: true,
      data: { suggestions },
    });
  });

  /**
   * POST /api/family/boundaries/:familyMemberUserId/ai-suggestions
   * Generate AI boundary suggestions
   */
  generateBoundarySuggestions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { familyMemberUserId } = req.params;
    const { currentBoundaries } = req.body;

    const suggestions =
      await familySupportAIService.generateBoundarySuggestions(
        userId,
        familyMemberUserId,
        currentBoundaries || {}
      );

    res.status(200).json({
      ok: true,
      data: suggestions,
    });
  });
}

export default new FamilyController();
