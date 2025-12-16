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
    
    // Log for debugging
    console.log("📧 Gmail OAuth callback received:", {
      hasCode: !!code,
      hasState: !!state,
      stateValue: state,
      hasSession: !!req.session,
      sessionUserId: req.session?.userId,
    });

    // Try to get userId from state first, then session
    let userId = state || req.session?.userId;

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
      console.error("❌ Gmail OAuth callback: No userId found in state or session");
      console.error("   State:", state);
      console.error("   Session:", req.session);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gmail Connection Error</title>
          </head>
          <body>
            <p>Unauthorized. Missing user ID. You can close this window now.</p>
            <script>
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage({ type: 'gmail_oauth', status: 'error', error: 'unauthorized', details: 'missing_user_id' }, '*');
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
      console.log("📧 Attempting to exchange OAuth code for tokens, userId:", userId);
      const tokens = await gmailService.getTokensFromCode(code);
      
      if (!tokens || !tokens.access_token || !tokens.refresh_token) {
        throw new Error("Invalid tokens received from Google OAuth");
      }
      
      console.log("✅ Tokens received, storing for userId:", userId);
      await gmailService.storeTokens(
        userId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expiry_date
      );
      console.log("✅ Gmail tokens stored successfully for userId:", userId);

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
      console.error("❌ Error handling Gmail callback:", error);
      console.error("   Error details:", {
        message: error.message,
        code: error.code,
        userId: userId,
        hasCode: !!code,
        hasState: !!state,
      });
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
        status: {
          connected: status.connected || false,
        },
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

    console.log(`📧 getRecentEmails controller: userId=${userId}, days=${days}, maxResults=${maxResults}`);

    try {
      const emails = await gmailService.getRecentEmails(
        userId,
        parseInt(days),
        parseInt(maxResults)
      );

      console.log(`📧 Controller returning ${emails.length} emails`);

      res.status(200).json({
        ok: true,
        data: {
          emails,
        },
      });
    } catch (error) {
      console.error("❌ Error getting recent emails:", error);
      console.error("❌ Error stack:", error.stack);
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

    console.log(`🔗 Linking email request: userId=${userId}, jobOpportunityId=${jobOpportunityId}, gmailMessageId=${gmailMessageId}`);
    console.log(`🔗 Request body:`, req.body);

    if (!jobOpportunityId || !gmailMessageId) {
      console.error(`❌ Missing required fields: jobOpportunityId=${jobOpportunityId}, gmailMessageId=${gmailMessageId}`);
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

      console.log(`✅ Email linked successfully:`, emailLink.id);

      res.status(200).json({
        ok: true,
        data: {
          emailLink,
        },
      });
    } catch (error) {
      console.error("❌ Error linking email to job:", error);
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

      // Transform emails to match frontend expected format
      const transformedEmails = emails.map((email) => ({
        id: email.id,
        emailLinkId: email.id,
        gmailMessageId: email.gmail_message_id,
        subject: email.subject,
        from: email.sender_email || email.sender_name || "Unknown",
        date: email.email_date,
        snippet: email.snippet || "",
        threadId: email.thread_id,
        linkedAt: email.created_at,
        suggestedStatus: email.subject ? gmailService.detectStatusFromSubject(email.subject) : null,
      }));

      res.status(200).json({
        ok: true,
        data: {
          emails: transformedEmails,
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

