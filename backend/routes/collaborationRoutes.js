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
// Specific resource detail routes (must come before list routes)
router.get("/mentor/mentees/:id/resumes/:resumeId", collaborationController.getMenteeResumeDetail);
router.get("/mentor/mentees/:id/cover-letters/:coverLetterId", collaborationController.getMenteeCoverLetterDetail);
router.get("/mentor/mentees/:id/jobs/:jobId", collaborationController.getMenteeJobDetail);
// Resource list routes for task assignment
router.get("/mentor/mentees/:id/jobs", collaborationController.getMenteeJobs);
router.get("/mentor/mentees/:id/resumes", collaborationController.getMenteeResumes);
router.get("/mentor/mentees/:id/cover-letters", collaborationController.getMenteeCoverLetters);
router.get("/mentor/mentees/:id/insights", collaborationController.getCoachingInsights);
router.get("/mentor/mentees/:id/goals", collaborationController.getMenteeGoals);
router.post("/mentor/feedback", collaborationController.provideFeedback);

// Mentee Dashboard
router.get("/mentee/mentor", collaborationController.getMentor);
router.get("/mentee/feedback", collaborationController.getMenteeFeedback);
router.get("/mentee/progress", collaborationController.getOwnProgress);
router.get("/mentee/mentor-activity", collaborationController.getMentorActivityFeed);
router.get("/mentee/pending-invitations", collaborationController.getPendingMentorInvitations);
router.post("/mentee/invite-mentor", collaborationController.inviteMentor);
router.post("/mentee/accept-invitation/:relationshipId", collaborationController.acceptMentorInvitation);
router.post("/mentee/decline-invitation/:relationshipId", collaborationController.declineMentorInvitation);

// Document Review (UC-110)
router.post("/reviews", collaborationController.requestReview);
router.get("/reviews", collaborationController.getUserReviews);
router.get("/reviews/:id", collaborationController.getReview);
router.post("/reviews/:id/comments", collaborationController.addReviewComment);
router.post("/reviews/:id/complete", collaborationController.completeReview);

// Progress Sharing (UC-111)
router.post("/progress/share", collaborationController.configureSharing);
router.get("/progress/report", collaborationController.generateProgressReport);
router.post("/progress/report/save", collaborationController.saveProgressReport);
router.post("/progress/report/:reportId/share", collaborationController.shareReportWithMentor);
router.get("/progress/reports", collaborationController.getUserProgressReports);
router.get("/progress/reports/mentee", collaborationController.getMenteeProgressReports);
router.post("/progress/report/:reportId/comment", collaborationController.addReportComment);
router.get("/progress/report/:reportId/comments", collaborationController.getReportComments);
router.get("/progress/shared/:userId", collaborationController.getSharedProgress);
router.post("/milestones", collaborationController.createMilestone);
router.get("/milestones/predefined", collaborationController.getPredefinedMilestones);
router.post("/milestones/:milestoneId/reactions", collaborationController.addMilestoneReaction);

// Team Dashboard (UC-108)
router.get("/teams/:teamId/dashboard", collaborationController.getTeamDashboard);
router.get("/teams/:teamId/performance", collaborationController.getTeamPerformance);
router.get("/teams/:teamId/insights", collaborationController.generateTeamAIInsights);

// Job Sharing
router.post("/jobs/:id/share", collaborationController.shareJob);
router.get("/teams/:teamId/jobs", collaborationController.getSharedJobs);
router.post("/jobs/:id/comments", collaborationController.addJobComment);
router.get("/jobs/:id/comments", collaborationController.getJobComments);

// Task Management
router.post("/tasks", collaborationController.assignTask);
router.get("/tasks", collaborationController.getUserTasks);
router.get("/tasks/mentee/:menteeId", collaborationController.getMenteeTasks);
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

