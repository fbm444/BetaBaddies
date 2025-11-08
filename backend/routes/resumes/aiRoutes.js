import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// AI Assistant Routes
router.post("/:resumeId/ai/chat", resumeController.chat);
router.post("/:resumeId/ai/generate", resumeController.generateContent);

export default router;

