import express from "express";
import jobOpportunityController from "../controllers/jobOpportunityController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All job opportunity routes require authentication
router.use(isAuthenticated);

// Create a new job opportunity
router.post("/", jobOpportunityController.createJobOpportunity);

// Get all job opportunities for the authenticated user
router.get("/", jobOpportunityController.getJobOpportunities);

// Bulk update status (must be before :id)
router.post("/bulk-update-status", jobOpportunityController.bulkUpdateStatus);

// Get status counts (must be before :id)
router.get("/status/counts", jobOpportunityController.getStatusCounts);

// Get statistics (must be before :id)
router.get("/statistics", jobOpportunityController.getStatistics);

// Get job opportunity by ID (must be after other routes to avoid conflicts)
router.get("/:id", jobOpportunityController.getJobOpportunity);

// Update job opportunity
router.put("/:id", jobOpportunityController.updateJobOpportunity);

// Delete job opportunity
router.delete("/:id", jobOpportunityController.deleteJobOpportunity);

export default router;

