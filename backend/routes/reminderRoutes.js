import express from "express";
import reminderController from "../controllers/reminderController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Get reminders for an interview
router.get("/interviews/:id/reminders", reminderController.getRemindersForInterview);

// Manual trigger for testing (can be removed in production or restricted to admin)
router.post("/interviews/:id/reminders/:reminderId/send", reminderController.sendReminder);

export default router;

