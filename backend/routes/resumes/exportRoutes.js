import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// Export Routes
// New methods - receive HTML from frontend
router.post("/export/pdf", resumeController.exportPDFFromHTML);
router.post("/export/docx", resumeController.exportDOCXFromHTML);

// Legacy methods - kept for backward compatibility
router.get("/:id/export/pdf", resumeController.exportPDF);
router.get("/:id/export/docx", resumeController.exportDOCX);
router.get("/:id/export/txt", resumeController.exportTXT);
router.get("/:id/export/html", resumeController.exportHTML);

export default router;

