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
      // Return HTML that closes the popup and signals success/error to parent
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gmail Connection Error</title>
          </head>
          <body>
            <p>Connection cancelled. You can close this window now.</p>
            <script>
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage({ type: 'gmail_oauth', status: 'error', error: 'no_code' }, '*');
                }
                setTimeout(function() {
                  window.close();
                }, 500);
              } catch (e) {
                window.location.href = '${process.env.FRONTEND_URL || "http://localhost:3000"}/job-opportunities?gmail_error=no_code';
              }
            </script>
          </body>
        </html>
      `);
    }

    if (!userId) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gmail Connection Error</title>
          </head>
          <body>
            <p>Unauthorized. You can close this window now.</p>
            <script>
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage({ type: 'gmail_oauth', status: 'error', error: 'unauthorized' }, '*');
                }
                setTimeout(function() {
                  window.close();
                }, 500);
              } catch (e) {
                window.location.href = '${process.env.FRONTEND_URL || "http://localhost:3000"}/job-opportunities?gmail_error=unauthorized';
              }
            </script>
          </body>
        </html>
      `);
    }

    try {
      const tokens = await gmailService.getTokensFromCode(code);
      await gmailService.storeTokens(
        userId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expiry_date
      );

      // Return HTML that signals success to parent (parent will close popup)
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gmail Connected</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .message {
                text-align: center;
                padding: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
            </style>
          </head>
          <body>
            <div class="message">
              <h2>✓ Gmail Connected Successfully!</h2>
              <p>You can close this window now.</p>
            </div>
            <script>
              (function() {
                try {
                  if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({ type: 'gmail_oauth', status: 'success' }, '*');
                    // Try to close, but don't rely on it
                    setTimeout(function() {
                      try {
                        window.close();
                      } catch (e) {
                        // Browser may block window.close(), that's okay - parent will close it
                      }
                    }, 1000);
                  } else {
                    // Fallback: redirect if no opener
                    setTimeout(function() {
                      window.location.href = '${process.env.FRONTEND_URL || "http://localhost:3000"}/job-opportunities?gmail=connected';
                    }, 2000);
                  }
                } catch (e) {
                  console.error('Error in callback:', e);
                  window.location.href = '${process.env.FRONTEND_URL || "http://localhost:3000"}/job-opportunities?gmail=connected';
                }
              })();
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error handling Gmail callback:", error);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gmail Connection Error</title>
          </head>
          <body>
            <p>Connection failed. You can close this window now.</p>
            <script>
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage({ type: 'gmail_oauth', status: 'error', error: 'connection_failed' }, '*');
                }
                setTimeout(function() {
                  window.close();
                }, 500);
              } catch (e) {
                window.location.href = '${process.env.FRONTEND_URL || "http://localhost:3000"}/job-opportunities?gmail_error=connection_failed';
              }
            </script>
          </body>
        </html>
      `);
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

