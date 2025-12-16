import followUpReminderService from "../services/followUpReminderService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class FollowUpReminderController {
  /**
   * GET /api/v1/follow-up-reminders
   * Get all reminders for user (with optional filters)
   */
  getReminders = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { status, jobOpportunityId, isActive, limit, offset } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (jobOpportunityId) filters.jobOpportunityId = jobOpportunityId;
    if (isActive !== undefined) filters.isActive = isActive === "true";
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const reminders = await followUpReminderService.getReminders(userId, filters);

    res.status(200).json({
      ok: true,
      data: { reminders },
    });
  });

  /**
   * GET /api/v1/follow-up-reminders/pending
   * Get pending reminders (for notifications)
   */
  getPendingReminders = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const reminders = await followUpReminderService.getPendingReminders(userId, limit);

    res.status(200).json({
      ok: true,
      data: { reminders },
    });
  });

  /**
   * GET /api/v1/follow-up-reminders/:id
   * Get specific reminder details
   */
  getReminderById = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const reminder = await followUpReminderService.getReminderById(id, userId);

    if (!reminder) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Reminder not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: { reminder },
    });
  });

  /**
   * POST /api/v1/follow-up-reminders
   * Create custom reminder
   */
  createReminder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { jobOpportunityId, reminderType, scheduledDate, dueDate, customMessage, daysAfterEvent } = req.body;

    if (!jobOpportunityId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "jobOpportunityId is required",
        },
      });
    }

    const reminder = await followUpReminderService.createCustomReminder(userId, jobOpportunityId, {
      reminderType,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      customMessage,
      daysAfterEvent,
    });

    res.status(201).json({
      ok: true,
      data: { reminder },
    });
  });

  /**
   * PATCH /api/v1/follow-up-reminders/:id/complete
   * Mark reminder as completed
   */
  completeReminder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { responseType } = req.body;

    const reminder = await followUpReminderService.completeReminder(id, userId, responseType);

    res.status(200).json({
      ok: true,
      data: { reminder },
    });
  });

  /**
   * PATCH /api/v1/follow-up-reminders/:id/snooze
   * Snooze reminder
   */
  snoozeReminder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { days } = req.body;

    if (!days || days < 1) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "days must be a positive number",
        },
      });
    }

    const reminder = await followUpReminderService.snoozeReminder(id, userId, parseInt(days));

    res.status(200).json({
      ok: true,
      data: { reminder },
    });
  });

  /**
   * PATCH /api/v1/follow-up-reminders/:id/dismiss
   * Dismiss reminder
   */
  dismissReminder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const reminder = await followUpReminderService.dismissReminder(id, userId);

    res.status(200).json({
      ok: true,
      data: { reminder },
    });
  });

  /**
   * DELETE /api/v1/follow-up-reminders/:id
   * Delete reminder
   */
  deleteReminder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify reminder belongs to user
    const reminder = await followUpReminderService.getReminderById(id, userId);
    if (!reminder) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Reminder not found",
        },
      });
    }

    // Soft delete by setting is_active = false
    await followUpReminderService.dismissReminder(id, userId);

    res.status(200).json({
      ok: true,
      data: { message: "Reminder deleted successfully" },
    });
  });

  /**
   * GET /api/v1/follow-up-reminders/:id/email-template
   * Get generated email template for reminder
   */
  getEmailTemplate = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const reminder = await followUpReminderService.getReminderById(id, userId);

    if (!reminder) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Reminder not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        emailTemplate: {
          subject: reminder.generated_email_subject,
          body: reminder.generated_email_body,
        },
      },
    });
  });

  /**
   * GET /api/v1/follow-up-reminders/etiquette-tips
   * Get etiquette tips for application stage
   */
  getEtiquetteTips = asyncHandler(async (req, res) => {
    const { applicationStage, daysSinceLastContact } = req.query;

    if (!applicationStage) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "applicationStage is required",
        },
      });
    }

    const tips = followUpReminderService.getEtiquetteTips(
      applicationStage,
      parseInt(daysSinceLastContact) || 0
    );

    res.status(200).json({
      ok: true,
      data: { tips },
    });
  });
}

export default new FollowUpReminderController();

