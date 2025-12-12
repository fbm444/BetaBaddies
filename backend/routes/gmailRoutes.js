import express from "express";
import gmailController from "../controllers/gmailController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// OAuth callback does NOT require session auth (it uses state param with userId)
router.get("/auth/callback", gmailController.handleCallback);

// All other Gmail routes require authentication
router.use(isAuthenticated);

// Get authorization URL
router.get("/auth/url", gmailController.getAuthorizationUrl);

// Get sync status
router.get("/status", gmailController.getSyncStatus);

// Disconnect Gmail
router.post("/disconnect", gmailController.disconnect);

// Search emails
router.get("/search", gmailController.searchEmails);

// Get recent emails
router.get("/recent", gmailController.getRecentEmails);

// Search emails by keywords (company name or job title)
router.get("/search/keywords", gmailController.searchEmailsByKeywords);

// Link email to job opportunity
router.post("/link", gmailController.linkEmailToJob);

// Get linked emails for a job opportunity
router.get("/linked/:jobOpportunityId", gmailController.getLinkedEmails);

// Unlink email from job opportunity
router.delete("/unlink/:emailLinkId", gmailController.unlinkEmailFromJob);

export default router;

