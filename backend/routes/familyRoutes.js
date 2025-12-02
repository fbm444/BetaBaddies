import express from "express";
import familyController from "../controllers/familyController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Public invitation endpoint (no auth required) - must be before isAuthenticated
// This allows users to view invitation details before logging in
router.get("/invitations/:token", familyController.getInvitationByToken);

// All other routes require authentication
router.use(isAuthenticated);

// Accept invitation requires authentication (user must be logged in)
router.post("/invitations/:token/accept", familyController.acceptInvitation);

// Family management
router.post("/invitations", familyController.inviteFamilyMember);
router.get("/invitations", familyController.getPendingInvitations);
router.get("/members", familyController.getFamilyMembers);
router.get("/invited-by", familyController.getUsersWhoInvitedMe);
router.delete("/members/:id", familyController.removeFamilyMember);
router.delete("/invitations/:id", familyController.cancelInvitation);
router.get("/progress/:userId", familyController.getFamilyProgressSummary);

export default router;

