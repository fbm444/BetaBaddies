import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// Template Management Routes
router.get("/", resumeController.getTemplates);
router.get("/:id", resumeController.getTemplate);
router.get("/:id/preview", resumeController.getTemplatePreview);
router.post("/", resumeController.createTemplate);
router.put("/:id", resumeController.updateTemplate);
router.delete("/:id", resumeController.deleteTemplate);
router.post("/:id/parse", resumeController.parseTemplateResume);

export default router;

