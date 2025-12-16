import express from "express";
import followUpReminderController from "../controllers/followUpReminderController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/v1/follow-up-reminders
// Get all reminders for user (with optional filters)
router.get("/", followUpReminderController.getReminders);

// GET /api/v1/follow-up-reminders/pending
// Get pending reminders (for notifications)
router.get("/pending", followUpReminderController.getPendingReminders);

// GET /api/v1/follow-up-reminders/etiquette-tips
// Get etiquette tips
router.get("/etiquette-tips", followUpReminderController.getEtiquetteTips);

// GET /api/v1/follow-up-reminders/:id
// Get specific reminder details
router.get("/:id", followUpReminderController.getReminderById);

// GET /api/v1/follow-up-reminders/:id/email-template
// Get generated email template for reminder
router.get("/:id/email-template", followUpReminderController.getEmailTemplate);

// POST /api/v1/follow-up-reminders
// Create custom reminder
router.post("/", followUpReminderController.createReminder);

// PATCH /api/v1/follow-up-reminders/:id/complete
// Mark reminder as completed
router.patch("/:id/complete", followUpReminderController.completeReminder);

// PATCH /api/v1/follow-up-reminders/:id/snooze
// Snooze reminder
router.patch("/:id/snooze", followUpReminderController.snoozeReminder);

// PATCH /api/v1/follow-up-reminders/:id/dismiss
// Dismiss reminder
router.patch("/:id/dismiss", followUpReminderController.dismissReminder);

// DELETE /api/v1/follow-up-reminders/:id
// Delete reminder
router.delete("/:id", followUpReminderController.deleteReminder);

export default router;

