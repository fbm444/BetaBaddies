import timeLogService from "../services/timeLogService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class TimeLogController {
  /**
   * Create a new time log entry
   * POST /api/v1/time-logs
   */
  createTimeLog = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const {  jobOpportunityId, activityType, hoursSpent, activityDate, notes } = req.body;

    // Validation
    if (!activityType || hoursSpent === undefined || hoursSpent === null) {
      return res.status(422).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Activity type and hours spent are required",
        },
      });
    }

    if (hoursSpent < 0 || hoursSpent > 24) {
      return res.status(422).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Hours spent must be between 0 and 24",
        },
      });
    }

    const timeLog = await timeLogService.createTimeLog({
      userId,
      jobOpportunityId,
      activityType,
      hoursSpent,
      activityDate,
      notes,
    });

    res.status(201).json({
      ok: true,
      data: { timeLog },
    });
  });

  /**
   * Get time logs for the current user
   * GET /api/v1/time-logs
   */
  getTimeLogs = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate, activityType, jobOpportunityId } = req.query;

    const filters = {
      startDate,
      endDate,
      activityType,
      jobOpportunityId,
    };

    const timeLogs = await timeLogService.getTimeLogs(userId, filters);

    res.status(200).json({
      ok: true,
      data: { timeLogs },
    });
  });

  /**
   * Get time summary for the current user
   * GET /api/v1/time-logs/summary
   */
  getTimeSummary = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    const summary = await timeLogService.getTimeSummary(userId, {
      startDate,
      endDate,
    });

    res.status(200).json({
      ok: true,
      data: { summary },
    });
  });

  /**
   * Update a time log entry
   * PUT /api/v1/time-logs/:id
   */
  updateTimeLog = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const updates = req.body;

    // Validate hours if provided
    if (updates.hoursSpent !== undefined && (updates.hoursSpent < 0 || updates.hoursSpent > 24)) {
      return res.status(422).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Hours spent must be between 0 and 24",
        },
      });
    }

    const timeLog = await timeLogService.updateTimeLog(id, userId, updates);

    res.status(200).json({
      ok: true,
      data: { timeLog },
    });
  });

  /**
   * Delete a time log entry
   * DELETE /api/v1/time-logs/:id
   */
  deleteTimeLog = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const result = await timeLogService.deleteTimeLog(id, userId);

    res.status(200).json({
      ok: true,
      data: result,
    });
  });
}

export default new TimeLogController();

