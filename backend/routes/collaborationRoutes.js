import express from "express";
import collaborationController from "../controllers/collaborationController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Mentor Dashboard (UC-109)
router.get("/mentor/mentees", collaborationController.getMentees);
router.get("/mentor/mentees/:id/progress", collaborationController.getMenteeProgress);
router.get("/mentor/mentees/:id/materials", collaborationController.getMenteeMaterials);
router.get("/mentor/mentees/:id/insights", collaborationController.getCoachingInsights);
router.post("/mentor/feedback", collaborationController.provideFeedback);

// Document Review (UC-110)
router.post("/reviews", collaborationController.requestReview);
router.get("/reviews", collaborationController.getUserReviews);
router.get("/reviews/:id", collaborationController.getReview);
router.post("/reviews/:id/comments", collaborationController.addReviewComment);
router.post("/reviews/:id/complete", collaborationController.completeReview);

// Progress Sharing (UC-111)
router.post("/progress/share", collaborationController.configureSharing);
router.get("/progress/report", collaborationController.generateProgressReport);
router.get("/progress/shared/:userId", collaborationController.getSharedProgress);
router.post("/milestones", collaborationController.createMilestone);
router.get("/milestones/predefined", collaborationController.getPredefinedMilestones);

// Team Dashboard (UC-108)
router.get("/teams/:teamId/dashboard", collaborationController.getTeamDashboard);
router.get("/teams/:teamId/performance", collaborationController.getTeamPerformance);

// Job Sharing
router.post("/jobs/:id/share", collaborationController.shareJob);
router.get("/teams/:teamId/jobs", collaborationController.getSharedJobs);
router.post("/jobs/:id/comments", collaborationController.addJobComment);
router.get("/jobs/:id/comments", collaborationController.getJobComments);

// Task Management
router.post("/tasks", collaborationController.assignTask);
router.get("/tasks", collaborationController.getUserTasks);
router.put("/tasks/:id/status", collaborationController.updateTaskStatus);

// Activity Feed
router.get("/teams/:teamId/activity", collaborationController.getActivityFeed);

// Document Sharing
router.post("/documents/share", collaborationController.shareDocument);
router.get("/teams/:teamId/documents", collaborationController.getSharedDocuments);
router.post("/documents/comments", collaborationController.addDocumentComment);
router.get("/documents/:documentType/:documentId/comments", collaborationController.getDocumentComments);
router.get("/documents/:documentType/:documentId", collaborationController.getDocumentDetails);

export default router;

