import express from "express";
import referralRequestController from "../controllers/referralRequestController.js";
import { isAuthenticated } from "../middleware/auth.js";
import {
  validateCreateReferralRequest,
  validateUpdateReferralRequest,
  validateReferralRequestId,
  validateReferralTemplateId,
  validatePersonalizeReferralRequest,
} from "../middleware/validation.js";

const router = express.Router();

// All routes require authentication
router.get("/", isAuthenticated, referralRequestController.getAll);
router.get("/to-write", isAuthenticated, referralRequestController.getToWrite);
router.get("/followup", isAuthenticated, referralRequestController.getNeedingFollowup);
router.get("/templates", isAuthenticated, referralRequestController.getTemplates);
router.get("/templates/recommendations", isAuthenticated, referralRequestController.getRecommendationTemplates);
router.get("/templates/:id/preview", isAuthenticated, referralRequestController.getTemplatePreview);
router.post("/templates/ai", isAuthenticated, referralRequestController.createTemplateWithAI);
router.post("/templates/recommendations/ai", isAuthenticated, referralRequestController.createRecommendationTemplateWithAI);
router.post("/templates", isAuthenticated, referralRequestController.createTemplate);
router.delete(
  "/templates/:id",
  isAuthenticated,
  validateReferralTemplateId,
  referralRequestController.deleteTemplate
);
router.post(
  "/personalize",
  isAuthenticated,
  validatePersonalizeReferralRequest,
  referralRequestController.personalizeMessage
);
router.post(
  "/generate-letter",
  isAuthenticated,
  referralRequestController.generateReferralLetter
);
router.post(
  "/save-draft-letter",
  isAuthenticated,
  referralRequestController.saveDraftReferralLetter
);
router.post(
  "/submit-letter",
  isAuthenticated,
  referralRequestController.submitReferralLetter
);
router.post("/", isAuthenticated, validateCreateReferralRequest, referralRequestController.create);
router.get("/:id", isAuthenticated, validateReferralRequestId, referralRequestController.getById);
router.put("/:id", isAuthenticated, validateReferralRequestId, validateUpdateReferralRequest, referralRequestController.update);
router.delete("/:id", isAuthenticated, validateReferralRequestId, referralRequestController.delete);
router.post("/:id/gratitude/generate", isAuthenticated, validateReferralRequestId, referralRequestController.generateGratitudeMessage);
router.post("/:id/gratitude/send", isAuthenticated, validateReferralRequestId, referralRequestController.sendGratitudeMessage);

export default router;

