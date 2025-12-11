import express from "express";
import gmailController from "../controllers/gmailController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All Gmail routes require authentication
router.use(isAuthenticated);

// Get authorization URL
router.get("/auth/url", gmailController.getAuthorizationUrl);

// Handle OAuth callback
router.get("/auth/callback", gmailController.handleCallback);

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

