import express from "express";
import linkedinController from "../controllers/linkedinController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.post(
  "/import-profile",
  isAuthenticated,
  linkedinController.importProfile
);

router.post(
  "/templates/generate",
  isAuthenticated,
  linkedinController.generateNetworkingTemplate
);

router.get(
  "/templates",
  isAuthenticated,
  linkedinController.getNetworkingTemplates
);

router.post(
  "/optimization/generate",
  isAuthenticated,
  linkedinController.generateProfileOptimization
);

router.get(
  "/optimization",
  isAuthenticated,
  linkedinController.getProfileOptimization
);

router.put(
  "/optimization/:optimizationId/implement",
  isAuthenticated,
  linkedinController.markOptimizationImplemented
);

router.post(
  "/strategies/generate",
  isAuthenticated,
  linkedinController.generateNetworkingStrategies
);

export default router;

