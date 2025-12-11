import express from "express";
import certificationController from "../controllers/certificationController.js";
import { isAuthenticated } from "../middleware/auth.js";
import {
  validateCreateCertification,
  validateUpdateCertification,
  validateCertificationId,
} from "../middleware/validation.js";

const router = express.Router();

// All certification routes require authentication
router.use(isAuthenticated);

// Create a new certification
router.post("/", validateCreateCertification, certificationController.create);

// Get all certifications for the authenticated user
router.get("/", certificationController.getAll);

// Get current certifications (non-expired)
router.get("/current", certificationController.getCurrent);

// Get certification history (all certifications including expired)
router.get("/history", certificationController.getHistory);

// Get certification statistics
router.get("/statistics", certificationController.getStatistics);

// Get expiring certifications
router.get("/expiring", certificationController.getExpiring);

// Search certifications
router.get("/search", certificationController.search);

// Get certifications by organization
router.get("/organization", certificationController.getByOrganization);

// Get certifications by category
router.get("/category", certificationController.getByCategory);

// Upload badge image
router.post("/badge-image", certificationController.uploadBadgeImage);

// Get certification by ID (must be after other routes to avoid conflicts)
router.get("/:id", validateCertificationId, certificationController.getById);

// Update certification
router.put(
  "/:id",
  validateCertificationId,
  validateUpdateCertification,
  certificationController.update
);

// Delete certification
router.delete("/:id", validateCertificationId, certificationController.delete);

export default router;
