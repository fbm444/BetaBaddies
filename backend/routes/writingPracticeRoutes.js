import express from "express";
import writingPracticeController from "../controllers/writingPracticeController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Practice Sessions
router.post("/sessions", writingPracticeController.createSession);
router.get("/sessions", writingPracticeController.getSessions);
router.get("/sessions/:id", writingPracticeController.getSessionById);
router.put("/sessions/:id", writingPracticeController.updateSession);
router.delete("/sessions/:id", writingPracticeController.deleteSession);
router.get("/sessions/:id/stats", writingPracticeController.getSessionStats);

// Feedback
router.post("/sessions/:id/feedback", writingPracticeController.generateFeedback);
router.get("/sessions/:id/feedback", writingPracticeController.getFeedback);
router.post("/compare", writingPracticeController.compareSessions);
router.get("/feedback/history", writingPracticeController.getFeedbackHistory);

// Prompts
router.get("/prompts", writingPracticeController.getPrompts);
router.get("/prompts/random", writingPracticeController.getRandomPrompt);
router.get("/prompts/interview/:jobId", writingPracticeController.getPromptsForInterview);
router.post("/prompts/custom", writingPracticeController.createCustomPrompt);

// Progress
router.get("/progress", writingPracticeController.getProgress);
router.get("/progress/trend", writingPracticeController.getProgressTrend);
router.get("/progress/insights", writingPracticeController.getProgressInsights);

// Nerves Management
router.get("/nerves/exercises", writingPracticeController.getNervesExercises);
router.post("/nerves/exercises/complete", writingPracticeController.completeNervesExercise);
router.get("/nerves/history", writingPracticeController.getExerciseHistory);
router.get("/nerves/checklist/:jobId", writingPracticeController.generatePreparationChecklist);

export default router;

