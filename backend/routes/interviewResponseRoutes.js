import express from "express";
import interviewResponseController from "../controllers/interviewResponseController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Create a new interview response
router.post("/", interviewResponseController.createResponse);

// Get all responses with optional filters
router.get("/", interviewResponseController.getResponses);

// Get gap analysis
router.get("/gap-analysis", interviewResponseController.getGapAnalysis);

// Export prep guide
router.get("/export", interviewResponseController.exportPrepGuide);

// Suggest best response for a job
router.post("/:id/suggest", interviewResponseController.suggestBestResponse);

// Get a single response by ID
router.get("/:id", interviewResponseController.getResponseById);

// Update response metadata
router.put("/:id", interviewResponseController.updateResponse);

// Delete response
router.delete("/:id", interviewResponseController.deleteResponse);

// Create a new version
router.post("/:id/versions", interviewResponseController.createVersion);

// Add tag to response
router.post("/:id/tags", interviewResponseController.addTag);

// Remove tag from response
router.delete("/:id/tags/:tagId", interviewResponseController.removeTag);

// Add outcome to response
router.post("/:id/outcomes", interviewResponseController.addOutcome);

export default router;

