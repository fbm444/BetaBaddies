import gmailService from "../services/gmailService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class GmailController {
  // Get authorization URL for Gmail
  getAuthorizationUrl = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const authUrl = gmailService.getAuthorizationUrl(userId);

    res.status(200).json({
      ok: true,
      data: {
        authUrl,
      },
    });
  });

  // Handle OAuth callback
  handleCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const userId = state || req.session.userId;

    if (!code) {
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/job-opportunities?gmail_error=no_code`
      );
    }

    if (!userId) {
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/job-opportunities?gmail_error=unauthorized`
      );
    }

    try {
      const tokens = await gmailService.getTokensFromCode(code);
      await gmailService.storeTokens(
        userId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expiry_date
      );

      res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/job-opportunities?gmail=connected`
      );
    } catch (error) {
      console.error("Error handling Gmail callback:", error);
      res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/job-opportunities?gmail_error=connection_failed`
      );
    }
  });

  // Get sync status
  getSyncStatus = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const status = await gmailService.getSyncStatus(userId);

    res.status(200).json({
      ok: true,
      data: {
        status,
      },
    });
  });

  // Disconnect Gmail
  disconnect = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    await gmailService.disconnect(userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Gmail disconnected successfully",
      },
    });
  });

  // Search emails
  searchEmails = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { query, maxResults } = req.query;

    if (!query) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "Search query is required",
        },
      });
    }

    try {
      const emails = await gmailService.searchEmails(
        userId,
        query,
        maxResults ? parseInt(maxResults) : 50
      );

      res.status(200).json({
        ok: true,
        data: {
          emails,
        },
      });
    } catch (error) {
      console.error("Error searching emails:", error);
      res.status(500).json({
        ok: false,
        error: {
          message: error.message || "Failed to search emails",
        },
      });
    }
  });

  // Get recent emails
  getRecentEmails = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { days = 30, maxResults = 50 } = req.query;

    try {
      const emails = await gmailService.getRecentEmails(
        userId,
        parseInt(days),
        parseInt(maxResults)
      );

      res.status(200).json({
        ok: true,
        data: {
          emails,
        },
      });
    } catch (error) {
      console.error("Error getting recent emails:", error);
      res.status(500).json({
        ok: false,
        error: {
          message: error.message || "Failed to get recent emails",
        },
      });
    }
  });

  // Search emails by keywords (company name or job title)
  searchEmailsByKeywords = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { keywords, maxResults = 50 } = req.query;

    if (!keywords) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "Keywords are required",
        },
      });
    }

    try {
      const emails = await gmailService.searchEmailsByKeywords(
        userId,
        keywords,
        parseInt(maxResults)
      );

      // Add status suggestions based on subject
      const emailsWithSuggestions = emails.map((email) => ({
        ...email,
        suggestedStatus: gmailService.detectStatusFromSubject(email.subject),
      }));

      res.status(200).json({
        ok: true,
        data: {
          emails: emailsWithSuggestions,
        },
      });
    } catch (error) {
      console.error("Error searching emails by keywords:", error);
      res.status(500).json({
        ok: false,
        error: {
          message: error.message || "Failed to search emails",
        },
      });
    }
  });

  // Link email to job opportunity
  linkEmailToJob = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobOpportunityId, gmailMessageId } = req.body;

    if (!jobOpportunityId || !gmailMessageId) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "jobOpportunityId and gmailMessageId are required",
        },
      });
    }

    try {
      const emailLink = await gmailService.linkEmailToJob(
        userId,
        jobOpportunityId,
        gmailMessageId
      );

      res.status(200).json({
        ok: true,
        data: {
          emailLink,
        },
      });
    } catch (error) {
      console.error("Error linking email to job:", error);
      res.status(500).json({
        ok: false,
        error: {
          message: error.message || "Failed to link email to job",
        },
      });
    }
  });

  // Get linked emails for a job opportunity
  getLinkedEmails = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobOpportunityId } = req.params;

    if (!jobOpportunityId) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "jobOpportunityId is required",
        },
      });
    }

    try {
      const emails = await gmailService.getLinkedEmails(userId, jobOpportunityId);

      res.status(200).json({
        ok: true,
        data: {
          emails,
        },
      });
    } catch (error) {
      console.error("Error getting linked emails:", error);
      res.status(500).json({
        ok: false,
        error: {
          message: error.message || "Failed to get linked emails",
        },
      });
    }
  });

  // Unlink email from job opportunity
  unlinkEmailFromJob = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { emailLinkId } = req.params;
    const { jobOpportunityId } = req.body;

    if (!emailLinkId || !jobOpportunityId) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "emailLinkId and jobOpportunityId are required",
        },
      });
    }

    try {
      const result = await gmailService.unlinkEmailFromJob(
        userId,
        jobOpportunityId,
        emailLinkId
      );

      res.status(200).json({
        ok: true,
        data: {
          message: "Email unlinked successfully",
          emailLink: result,
        },
      });
    } catch (error) {
      console.error("Error unlinking email from job:", error);
      res.status(500).json({
        ok: false,
        error: {
          message: error.message || "Failed to unlink email from job",
        },
      });
    }
  });
}

export default new GmailController();

