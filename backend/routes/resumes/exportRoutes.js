import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// Export Routes
router.get("/:id/export/pdf", resumeController.exportPDF);
router.get("/:id/export/docx", resumeController.exportDOCX);
router.get("/:id/export/txt", resumeController.exportTXT);
router.get("/:id/export/html", resumeController.exportHTML);

export default router;

