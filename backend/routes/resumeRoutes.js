import express from "express";
import resumeController from "../controllers/resumeController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Public Sharing Routes (No auth required - must be before isAuthenticated)
router.get("/shared/:token", resumeController.getSharedResume);
router.post("/shared/:token/feedback", resumeController.createFeedback);

// All other resume routes require authentication
router.use(isAuthenticated);

// Resume Management Routes
router.post("/", resumeController.createResume);
router.get("/", resumeController.getResumes);
router.get("/:id", resumeController.getResume);
router.put("/:id", resumeController.updateResume);
router.delete("/:id", resumeController.deleteResume);
router.post("/:id/duplicate", resumeController.duplicateResume);

// Template Management Routes
router.get("/templates", resumeController.getTemplates);
router.get("/templates/:id", resumeController.getTemplate);
router.get("/templates/:id/preview", resumeController.getTemplatePreview);
router.post("/templates", resumeController.createTemplate);
router.put("/templates/:id", resumeController.updateTemplate);
router.delete("/templates/:id", resumeController.deleteTemplate);

// Comments Routes
router.get("/:id/comments", resumeController.getComments);
router.post("/:id/comments", resumeController.createComment);
router.put("/comments/:commentId", resumeController.updateComment);
router.delete("/comments/:commentId", resumeController.deleteComment);

// Tailoring Routes
router.get("/:id/tailoring", resumeController.getTailoring);
router.post("/:id/tailoring", resumeController.createOrUpdateTailoring);
router.delete("/:id/tailoring", resumeController.deleteTailoring);

// Sharing Routes (Owner)
router.post("/:id/share", resumeController.createShare);
router.get("/:id/shares", resumeController.getShares);
router.get("/shares/:shareId", resumeController.getShare);
router.put("/shares/:shareId", resumeController.updateShare);
router.post("/shares/:shareId/revoke", resumeController.revokeShare);
router.delete("/shares/:shareId", resumeController.deleteShare);

// Feedback Routes (Owner)
router.get("/:id/feedback", resumeController.getFeedback);
router.put("/feedback/:feedbackId", resumeController.updateFeedbackStatus);
router.delete("/feedback/:feedbackId", resumeController.deleteFeedback);

// Export Routes
router.get("/:id/export/pdf", resumeController.exportPDF);
router.get("/:id/export/docx", resumeController.exportDOCX);
router.get("/:id/export/txt", resumeController.exportTXT);
router.get("/:id/export/html", resumeController.exportHTML);

// Validation Routes
router.post("/:id/validate", resumeController.validateResume);
router.post("/:id/critique", resumeController.critiqueResume);
router.get("/:id/validation-issues", resumeController.getValidationIssues);
router.post(
  "/validation-issues/:issueId/resolve",
  resumeController.resolveValidationIssue
);

// Section Management Routes
router.get("/:id/sections", resumeController.getSectionConfig);
router.put("/:id/sections", resumeController.updateSectionConfig);
router.post("/:id/sections/:sectionId/toggle", resumeController.toggleSection);
router.post("/:id/sections/reorder", resumeController.reorderSections);
router.get("/sections/presets", resumeController.getSectionPresets);
router.post("/:id/sections/presets", resumeController.applySectionPreset);

// Version Management Routes
router.get("/:id/versions", resumeController.getVersions);
router.post("/:id/versions", resumeController.createVersion);
router.get("/:id/compare", resumeController.compareVersions);
router.post("/:id/merge", resumeController.mergeVersions);
router.post("/:id/set-master", resumeController.setMasterVersion);
router.get("/:id/version-history", resumeController.getVersionHistory);

// Preview Routes
router.get("/:id/preview", resumeController.getResumePreview);

// Parse/Import Routes
router.post("/parse", resumeController.parseResume);
router.post("/templates/:id/parse", resumeController.parseTemplateResume);

// AI Assistant Routes
router.post("/:resumeId/ai/chat", resumeController.chat);
router.post("/:resumeId/ai/generate", resumeController.generateContent);

export default router;
