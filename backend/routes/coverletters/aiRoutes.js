import express from "express";
import coverLetterController from "../../controllers/coverLetterController.js";

const router = express.Router();

// AI Generation Routes
router.post("/:id/generate", coverLetterController.generateContent);
router.post("/:id/research-company", coverLetterController.researchCompany);
router.post("/:id/highlight-experiences", coverLetterController.highlightExperiences);
router.get("/:id/variations", coverLetterController.getVariations);

export default router;

