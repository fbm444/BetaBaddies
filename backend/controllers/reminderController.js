import reminderService from "../services/reminderService.js";
import database from "../services/database.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class ReminderController {
  // Get reminders for a specific interview
  getRemindersForInterview = asyncHandler(async (req, res) => {
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

    // Verify user owns the interview
    const interviewCheck = await database.query(
      `SELECT id FROM interviews WHERE id = $1 AND user_id = $2`,
      [interviewId, userId]
    );

    if (interviewCheck.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          message: "Interview not found",
        },
      });
    }

    const reminders = await reminderService.getRemindersForInterview(interviewId);

    res.status(200).json({
      ok: true,
      data: {
        reminders,
      },
    });
  });

  // Manual trigger for testing (admin only or for debugging)
  sendReminder = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: interviewId, reminderId } = req.params;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    // Get reminder details
    const reminders = await reminderService.getRemindersForInterview(interviewId);
    const reminder = reminders.find((r) => r.id === reminderId);

    if (!reminder) {
      return res.status(404).json({
        ok: false,
        error: {
          message: "Reminder not found",
        },
      });
    }

    // Get due reminders (this will include our reminder if it's due)
    const dueReminders = await reminderService.getDueReminders(60); // 1 hour buffer
    const reminderData = dueReminders.find((r) => r.reminderId === reminderId);

    if (!reminderData) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "Reminder is not due yet or has already been sent",
        },
      });
    }

    await reminderService.sendReminder(reminderId, reminderData);

    res.status(200).json({
      ok: true,
      data: {
        message: "Reminder sent successfully",
      },
    });
  });
}

export default new ReminderController();

