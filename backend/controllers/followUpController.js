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

    const action = await followUpService.createFollowUpAction(interviewId, userId, {
      actionType,
      dueDate,
      notes,
    });

    res.status(201).json({
      ok: true,
      data: {
        action,
        message: "Follow-up action created successfully",
      },
    });
  });
}

export default new FollowUpController();

