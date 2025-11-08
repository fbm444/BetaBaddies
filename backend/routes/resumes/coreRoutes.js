import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// Core Resume CRUD Operations
router.post("/", resumeController.createResume);
router.get("/", resumeController.getResumes);
router.get("/:id", resumeController.getResume);
router.put("/:id", resumeController.updateResume);
router.delete("/:id", resumeController.deleteResume);
router.post("/:id/duplicate", resumeController.duplicateResume);
router.get("/:id/preview", resumeController.getResumePreview);

export default router;

