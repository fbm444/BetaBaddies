import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// Validation Routes
router.post("/:id/validate", resumeController.validateResume);
router.post("/:id/critique", resumeController.critiqueResume);
router.get("/:id/validation-issues", resumeController.getValidationIssues);
router.post(
  "/validation-issues/:issueId/resolve",
  resumeController.resolveValidationIssue
);

export default router;

