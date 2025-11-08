import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// Public Sharing Routes (No auth required)
router.get("/:token", resumeController.getSharedResume);
router.post("/:token/feedback", resumeController.createFeedback);

export default router;

