import express from "express";
import coverLetterController from "../../controllers/coverLetterController.js";

const router = express.Router();

// Template Management Routes
router.get("/", coverLetterController.getTemplates);
router.get("/:id", coverLetterController.getTemplate);
router.get("/:id/preview", coverLetterController.getTemplatePreview);
router.post("/", coverLetterController.createTemplate);
router.put("/:id", coverLetterController.updateTemplate);
router.delete("/:id", coverLetterController.deleteTemplate);
router.get("/:id/analytics", coverLetterController.getTemplateAnalytics);

export default router;

