import express from "express";
import teamController from "../controllers/teamController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Public invitation endpoint (no auth required) - must be before isAuthenticated
// This allows users to view invitation details before logging in
router.get("/invitations/:token", teamController.getInvitationByToken);

// All other routes require authentication
router.use(isAuthenticated);

// Accept invitation requires authentication (user must be logged in)
router.post("/invitations/:token/accept", teamController.acceptInvitation);

// Team management
router.post("/", teamController.createTeam);
router.get("/", teamController.getUserTeams);
router.get("/:id", teamController.getTeamById);
router.get("/:id/dashboard", teamController.getTeamDashboard);

// Member management
router.post("/:id/invitations", teamController.inviteMember);
router.get("/:id/invitations", teamController.getTeamInvitations);
router.delete("/:id/invitations/:invitationId", teamController.cancelInvitation);
router.put("/:id/members/:userId", teamController.updateMemberRole);
router.delete("/:id/members/:userId", teamController.removeMember);

export default router;

