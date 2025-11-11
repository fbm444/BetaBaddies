import express from "express";
import coverLetterController from "../../controllers/coverLetterController.js";

const router = express.Router();

// Export Routes
router.get("/:id/export/pdf", coverLetterController.exportPDF);
router.get("/:id/export/docx", coverLetterController.exportDOCX);
router.get("/:id/export/txt", coverLetterController.exportTXT);
router.get("/:id/export/html", coverLetterController.exportHTML);

export default router;

