import express from "express";
import googleCalendarController from "../controllers/googleCalendarController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All Google Calendar routes require authentication
router.use(isAuthenticated);

// Get authorization URL
router.get("/auth/url", googleCalendarController.getAuthorizationUrl);

// Handle OAuth callback
router.get("/auth/callback", googleCalendarController.handleCallback);

// Get sync status
router.get("/status", googleCalendarController.getSyncStatus);

// Disconnect Google Calendar
router.post("/disconnect", googleCalendarController.disconnect);

// Sync interview to Google Calendar
router.post("/sync/interview/:interviewId", googleCalendarController.syncInterview);

// Sync all interviews to Google Calendar
router.post("/sync/all", googleCalendarController.syncAllInterviews);

export default router;

