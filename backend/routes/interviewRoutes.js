import express from "express";
import interviewController from "../controllers/interviewController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All interview routes require authentication
router.use(isAuthenticated);

// Create a new interview
router.post("/", interviewController.createInterview);

// Get all interviews for the authenticated user
router.get("/", interviewController.getInterviews);

// Check for conflicts (must be before :id)
router.get("/check-conflicts", interviewController.checkConflicts);

// Get interview by ID
router.get("/:id", interviewController.getInterviewById);

// Update interview
router.put("/:id", interviewController.updateInterview);

// Cancel interview
router.post("/:id/cancel", interviewController.cancelInterview);

// Reschedule interview
router.post("/:id/reschedule", interviewController.rescheduleInterview);

// Update preparation task
router.put("/:interviewId/tasks/:taskId", interviewController.updatePreparationTask);

// UC-074: Company Research endpoints
router.get("/:id/company-research", interviewController.getCompanyResearch);
router.post("/:id/company-research/generate", interviewController.generateCompanyResearch);
router.get("/:id/company-research/export", interviewController.exportCompanyResearch);

// Delete interview
router.delete("/:id", interviewController.deleteInterview);

export default router;

