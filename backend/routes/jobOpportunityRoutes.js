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

// Skill gap analytics and operations
router.get("/skill-gaps/trends", jobOpportunityController.getSkillGapTrends);
router.get("/:id/skill-gaps", jobOpportunityController.getSkillGapAnalysis);
router.post("/:id/skill-gaps/refresh", jobOpportunityController.refreshSkillGapAnalysis);
router.post("/:id/skill-gaps/:skillName/progress", jobOpportunityController.updateSkillGapProgress);

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

// Materials management routes (must be before generic :id routes)
router.get("/materials/resumes", jobOpportunityController.getAvailableResumes);
router.get("/materials/cover-letters", jobOpportunityController.getAvailableCoverLetters);
router.get("/materials/analytics", jobOpportunityController.getMaterialsUsageAnalytics);
router.get("/materials/compare/resumes", jobOpportunityController.compareResumeVersions);
router.get("/materials/compare/cover-letters", jobOpportunityController.compareCoverLetterVersions);

// Materials for a specific job opportunity (must be before generic :id routes)
router.get("/:id/materials", jobOpportunityController.getCurrentMaterials);
router.post("/:id/materials", jobOpportunityController.linkMaterials);
router.get("/:id/materials/history", jobOpportunityController.getMaterialsHistory);

// Job matching routes (must be before generic :id routes)
// Note: match-scores and matching-weights routes must come before :id routes
router.post("/match-scores", jobOpportunityController.getMatchScoresForJobs);
router.put("/matching-weights", jobOpportunityController.updateMatchingWeights);
router.get("/:id/match-score", jobOpportunityController.getMatchScore);
router.post("/:id/match-score", jobOpportunityController.calculateMatchScore);
router.get("/:id/match-score/history", jobOpportunityController.getMatchScoreHistory);

// Get job opportunity by ID (must be after other routes to avoid conflicts)
router.get("/:id", jobOpportunityController.getJobOpportunity);

// Update job opportunity
router.put("/:id", jobOpportunityController.updateJobOpportunity);

// Delete job opportunity
router.delete("/:id", jobOpportunityController.deleteJobOpportunity);

export default router;

