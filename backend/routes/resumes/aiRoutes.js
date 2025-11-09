import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// AI Tailoring Route (must come before /:resumeId routes to avoid conflicts)
router.post("/ai/tailor", resumeController.tailorResume);

// AI Assistant Routes
router.post("/:resumeId/ai/chat", resumeController.chat);
router.post("/:resumeId/ai/generate", resumeController.generateContent);

export default router;

