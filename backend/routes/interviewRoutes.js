import express from "express";
import interviewController from "../controllers/interviewController.js";
import interviewAnalyticsController from "../controllers/interviewAnalyticsController.js";
import reminderController from "../controllers/reminderController.js";
import thankYouNoteController from "../controllers/thankYouNoteController.js";
import followUpController from "../controllers/followUpController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All interview routes require authentication
router.use(isAuthenticated);

// Analytics routes (must be before :id routes)
router.get("/analytics", interviewAnalyticsController.getAllAnalytics);
router.get(
  "/analytics/conversion-rate",
  interviewAnalyticsController.getConversionRate
);
router.get("/analytics/trends", interviewAnalyticsController.getTrends);
router.get(
  "/analytics/recommendations",
  interviewAnalyticsController.getRecommendations
);
router.get(
  "/analytics/practice-vs-real",
  interviewAnalyticsController.getPracticeVsReal
);
router.get(
  "/analytics/confidence-trends",
  interviewAnalyticsController.getConfidenceTrends
);
router.get(
  "/analytics/anxiety-progress",
  interviewAnalyticsController.getAnxietyProgress
);
router.get("/analytics/benchmarks", interviewAnalyticsController.getBenchmarks);
router.get(
  "/analytics/feedback-themes",
  interviewAnalyticsController.getFeedbackThemes
);

// Create a new interview
router.post("/", interviewController.createInterview);

// Get all interviews for the authenticated user
router.get("/", interviewController.getInterviews);

// Check for conflicts (must be before :id)
router.get("/check-conflicts", interviewController.checkConflicts);

// Pre/post interview assessments (must be before :id routes to avoid conflicts)
router.post("/:id/pre-assessment", interviewController.createPreAssessment);
router.post("/:id/post-reflection", interviewController.createPostReflection);
router.get("/:id/pre-assessment", interviewController.getPreAssessment);
router.get("/:id/post-reflection", interviewController.getPostReflection);

// Reminders (must be before :id routes)
router.get("/:id/reminders", reminderController.getRemindersForInterview);

// Thank-you notes (must be before :id routes)
router.post("/:id/thank-you-notes/generate", thankYouNoteController.generateThankYouNote);
router.get("/:id/thank-you-notes", thankYouNoteController.getThankYouNotes);
router.put("/:id/thank-you-notes/:noteId", thankYouNoteController.updateThankYouNote);
router.post("/:id/thank-you-notes/:noteId/send", thankYouNoteController.sendThankYouNote);

// Follow-up actions (must be before :id routes)
router.get("/:id/follow-ups", followUpController.getFollowUpActions);
router.post("/:id/follow-ups", followUpController.createFollowUpAction);
router.post("/:id/follow-ups/:actionId/complete", followUpController.completeFollowUpAction);

// Get interview by ID
router.get("/:id", interviewController.getInterviewById);

// Update interview
router.put("/:id", interviewController.updateInterview);

// Cancel interview
router.post("/:id/cancel", interviewController.cancelInterview);

// Reschedule interview
router.post("/:id/reschedule", interviewController.rescheduleInterview);

// Regenerate preparation tasks for an interview
router.post("/:id/preparation/generate", interviewController.regeneratePreparationTasks);

// Update preparation task
router.put("/:interviewId/tasks/:taskId", interviewController.updatePreparationTask);

// Delete interview
router.delete("/:id", interviewController.deleteInterview);

export default router;

