import express from "express";
import interviewPrepController from "../controllers/interviewPrepController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All interview prep routes require authentication
router.use(isAuthenticated);

// ============================================================================
// UC-074: Company Research Automation
// ============================================================================
router.get("/interviews/:id/company-research", interviewPrepController.getCompanyResearch);
router.post("/interviews/:id/company-research/generate", interviewPrepController.generateCompanyResearch);
router.get("/interviews/:id/company-research/export", interviewPrepController.exportCompanyResearch);

// ============================================================================
// UC-075: Role-Specific Question Bank
// ============================================================================
router.get("/question-bank", interviewPrepController.getQuestionBank);
router.post("/question-bank/generate", interviewPrepController.generateQuestionBank);
router.get("/question-bank/:id", interviewPrepController.getQuestionById);

// ============================================================================
// UC-076: AI-Powered Response Coaching
// ============================================================================
router.post("/responses", interviewPrepController.submitResponse);
router.get("/responses/:id", interviewPrepController.getResponseFeedback);
router.get("/responses", interviewPrepController.getResponseHistory);
router.post("/responses/compare", interviewPrepController.compareResponses);

// ============================================================================
// UC-077: Mock Interview Practice Sessions
// ============================================================================
// Note: More specific routes must come before parameterized routes
router.post("/mock-interviews", interviewPrepController.createMockSession);
router.get("/mock-interviews", interviewPrepController.getMockSessionHistory);
router.post("/mock-interviews/:id/responses", interviewPrepController.submitMockResponse);
router.post("/mock-interviews/:id/chat", interviewPrepController.submitChatMessage);
router.get("/mock-interviews/:id/messages", interviewPrepController.getSessionMessages);
router.post("/mock-interviews/:id/complete", interviewPrepController.completeMockSession);
// Generic :id route comes last
router.get("/mock-interviews/:id", interviewPrepController.getMockSession);

// ============================================================================
// UC-078: Technical Interview Preparation
// ============================================================================
// Note: Specific routes must come before parameterized routes
router.post("/technical/generate", interviewPrepController.generateTechnicalPrep);
router.get("/technical/challenges", interviewPrepController.getCodingChallenges);
router.get("/technical/system-design", interviewPrepController.getSystemDesignQuestions);
router.post("/technical/solutions", interviewPrepController.submitTechnicalSolution);
router.get("/technical/progress", interviewPrepController.getTechnicalProgress);
router.get("/technical/attempts/:challengeId", interviewPrepController.getChallengeAttemptHistory);
router.get("/technical/attempts", interviewPrepController.getUserAttemptHistory);
// Parameterized routes come last - handle both with and without interviewId
router.get("/technical/:interviewId", interviewPrepController.getTechnicalPrep);
router.get("/technical", interviewPrepController.getTechnicalPrep);

export default router;

