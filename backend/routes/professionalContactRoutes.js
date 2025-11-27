import express from "express";
import professionalContactController from "../controllers/professionalContactController.js";
import { isAuthenticated } from "../middleware/auth.js";
import {
  validateCreateContact,
  validateUpdateContact,
  validateContactId,
  validateAddContactInteraction,
} from "../middleware/validation.js";

const router = express.Router();

// All routes require authentication
router.get("/", isAuthenticated, professionalContactController.getAll);
router.get("/reminders", isAuthenticated, professionalContactController.getNeedingReminder);
router.get("/check-email", isAuthenticated, professionalContactController.checkByEmail);
router.post("/", isAuthenticated, validateCreateContact, professionalContactController.create);
router.get("/:id", isAuthenticated, validateContactId, professionalContactController.getById);
router.put("/:id", isAuthenticated, validateContactId, validateUpdateContact, professionalContactController.update);
router.delete("/:id", isAuthenticated, validateContactId, professionalContactController.delete);
router.get("/:id/interactions", isAuthenticated, validateContactId, professionalContactController.getInteractions);
router.post("/:id/interactions", isAuthenticated, validateContactId, validateAddContactInteraction, professionalContactController.addInteraction);

export default router;

