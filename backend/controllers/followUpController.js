import followUpService from "../services/followUpService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class FollowUpController {
  // Get follow-up actions for an interview
  getFollowUpActions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: interviewId } = req.params;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const actions = await followUpService.getFollowUpActions(interviewId, userId);

    res.status(200).json({
      ok: true,
      data: {
        actions,
      },
    });
  });

  // Get all pending follow-up actions for user
  getPendingFollowUps = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const actions = await followUpService.getPendingFollowUpActions(userId);

    res.status(200).json({
      ok: true,
      data: {
        // Keep original key for backwards compatibility
        actions,
        // Frontend expects followUps
        followUps: actions,
      },
    });
  });

  // Get all follow-up actions for user (both pending and completed)
  getAllFollowUps = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const actions = await followUpService.getAllFollowUpActions(userId);

    res.status(200).json({
      ok: true,
      data: {
        actions,
        followUps: actions,
      },
    });
  });

  // Mark follow-up action as completed
  completeFollowUpAction = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: interviewId, actionId } = req.params;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    await followUpService.completeFollowUpAction(actionId, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Follow-up action marked as completed",
      },
    });
  });

  // Generate email draft for a follow-up action
  getFollowUpEmailDraft = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { actionId } = req.params;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const draft = await followUpService.generateFollowUpEmailDraft(
      actionId,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        draft,
      },
    });
  });

  // Create custom follow-up action
  createFollowUpAction = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: interviewId } = req.params;
    const { actionType, dueDate, notes } = req.body;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    if (!actionType) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "actionType is required",
        },
      });
    }

    // Validate action type
    const allowedActionTypes = ['thank_you_note', 'follow_up_email', 'status_inquiry', 'references_sent', 'portfolio_sent', 'other'];
    if (!allowedActionTypes.includes(actionType)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ACTION_TYPE",
          message: `Invalid action type: ${actionType}. Allowed types: ${allowedActionTypes.join(', ')}`,
        },
      });
    }

    try {
      const action = await followUpService.createFollowUpAction(interviewId, userId, {
        actionType,
        dueDate,
        notes,
      });

      res.status(201).json({
        ok: true,
        data: {
          followUp: action,
          action: action, // Keep both for compatibility
          message: "Follow-up action created successfully",
        },
      });
    } catch (error) {
      // Error will be caught by asyncHandler, but log it here for debugging
      console.error("❌ Error in createFollowUpAction controller:", error);
      throw error; // Re-throw to let asyncHandler handle it
    }
  });
}

export default new FollowUpController();

