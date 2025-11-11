import interviewService from "../services/interviewService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class InterviewController {
  // Create a new interview
  createInterview = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const interviewData = req.body;

    const interview = await interviewService.createInterview(
      userId,
      interviewData
    );

    res.status(201).json({
      ok: true,
      data: {
        interview,
        message: "Interview scheduled successfully",
      },
    });
  });

  // Get all interviews for the authenticated user
  getInterviews = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { status, jobOpportunityId, startDate, endDate } = req.query;

    const filters = {
      status,
      jobOpportunityId,
      startDate,
      endDate,
    };

    const interviews = await interviewService.getInterviews(userId, filters);

    res.status(200).json({
      ok: true,
      data: {
        interviews,
      },
    });
  });

  // Get interview by ID
  getInterviewById = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const interview = await interviewService.getInterviewById(userId, id);

    if (!interview) {
      return res.status(404).json({
        ok: false,
        error: {
          message: "Interview not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        interview,
      },
    });
  });

  // Update interview
  updateInterview = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const updateData = req.body;

    const interview = await interviewService.updateInterview(
      userId,
      id,
      updateData
    );

    res.status(200).json({
      ok: true,
      data: {
        interview,
        message: "Interview updated successfully",
      },
    });
  });

  // Cancel interview
  cancelInterview = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const interview = await interviewService.cancelInterview(
      userId,
      id,
      cancellationReason
    );

    res.status(200).json({
      ok: true,
      data: {
        interview,
        message: "Interview cancelled successfully",
      },
    });
  });

  // Reschedule interview
  rescheduleInterview = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { scheduledAt, duration } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "scheduledAt is required",
        },
      });
    }

    const interview = await interviewService.rescheduleInterview(
      userId,
      id,
      scheduledAt,
      duration
    );

    res.status(200).json({
      ok: true,
      data: {
        interview,
        message: "Interview rescheduled successfully",
      },
    });
  });

  // Update preparation task
  updatePreparationTask = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { interviewId, taskId } = req.params;
    const updateData = req.body;

    // Verify interview belongs to user
    const interview = await interviewService.getInterviewById(
      userId,
      interviewId
    );
    if (!interview) {
      return res.status(404).json({
        ok: false,
        error: {
          message: "Interview not found",
        },
      });
    }

    const task = await interviewService.updatePreparationTask(
      interviewId,
      taskId,
      updateData
    );

    res.status(200).json({
      ok: true,
      data: {
        task,
        message: "Preparation task updated successfully",
      },
    });
  });

  // Delete interview
  deleteInterview = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    await interviewService.deleteInterview(userId, id);

    res.status(200).json({
      ok: true,
      data: {
        message: "Interview deleted successfully",
      },
    });
  });

  // Check for conflicts
  checkConflicts = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { scheduledAt, duration, excludeInterviewId } = req.query;

    if (!scheduledAt || !duration) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "scheduledAt and duration are required",
        },
      });
    }

    const conflicts = await interviewService.checkConflicts(
      userId,
      scheduledAt,
      parseInt(duration),
      excludeInterviewId
    );

    res.status(200).json({
      ok: true,
      data: {
        conflicts,
        hasConflicts: conflicts.length > 0,
      },
    });
  });
}

export default new InterviewController();

