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

// Get archived job opportunities (must be before :id)
router.get("/archived", jobOpportunityController.getArchivedJobOpportunities);

// Bulk archive (must be before :id)
router.post("/bulk-archive", jobOpportunityController.bulkArchiveJobOpportunities);

// Archive/unarchive job opportunity (must be before generic :id routes)
router.post("/:id/archive", jobOpportunityController.archiveJobOpportunity);
router.post("/:id/unarchive", jobOpportunityController.unarchiveJobOpportunity);

// Get company information (must be before generic :id routes)
router.get("/:id/company", jobOpportunityController.getCompanyInformation);

// Import job from URL (must be before generic :id routes)
router.post("/import", jobOpportunityController.importJobFromUrl);

// Get job opportunity by ID (must be after other routes to avoid conflicts)
router.get("/:id", jobOpportunityController.getJobOpportunity);

// Update job opportunity
router.put("/:id", jobOpportunityController.updateJobOpportunity);

// Delete job opportunity
router.delete("/:id", jobOpportunityController.deleteJobOpportunity);

export default router;

