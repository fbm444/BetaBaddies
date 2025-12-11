import { google } from "googleapis";
import database from "./database.js";

class GmailService {
  constructor() {
    this.scopes = [
      "https://www.googleapis.com/auth/gmail.readonly", // Read-only access
    ];
    this.rateLimitDelay = 100; // Delay between requests to respect rate limits (ms)
    this.maxRetries = 3;
  }

  // Get OAuth2 client for a user
  async getOAuth2Client(userId) {
    try {
      const query = `
        SELECT gmail_access_token, gmail_refresh_token, gmail_token_expiry
        FROM users
        WHERE u_id = $1
      `;
      const result = await database.query(query, [userId]);

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      const user = result.rows[0];

      if (!user.gmail_access_token || !user.gmail_refresh_token) {
        throw new Error("Gmail not connected");
      }

      const redirectUri = process.env.GOOGLE_GMAIL_CALLBACK_URL || 
        `${process.env.BACKEND_URL || process.env.SERVER_URL || "http://localhost:3001"}/api/v1/gmail/auth/callback`;
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CONTACTS_CLIENT_ID,
        process.env.GOOGLE_CONTACTS_CLIENT_SECRET,
        redirectUri
      );

      oauth2Client.setCredentials({
        access_token: user.gmail_access_token,
        refresh_token: user.gmail_refresh_token,
        expiry_date: user.gmail_token_expiry
          ? new Date(user.gmail_token_expiry).getTime()
          : null,
      });

      // Refresh token if expired
      if (user.gmail_token_expiry && new Date(user.gmail_token_expiry) < new Date()) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          await this.updateTokens(userId, credentials);
          oauth2Client.setCredentials(credentials);
        } catch (error) {
          console.error("Error refreshing Gmail token:", error);
          throw new Error("Failed to refresh Gmail token. Please reconnect.");
        }
      }

      return oauth2Client;
    } catch (error) {
      console.error("Error getting OAuth2 client:", error);
      throw error;
    }
  }

  // Update Gmail tokens for a user
  async updateTokens(userId, tokens) {
    try {
      const query = `
        UPDATE users
        SET gmail_access_token = $1,
            gmail_refresh_token = $2,
            gmail_token_expiry = $3,
            gmail_sync_enabled = true
        WHERE u_id = $4
      `;

      const expiryDate = tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null;

      await database.query(query, [
        tokens.access_token,
        tokens.refresh_token,
        expiryDate,
        userId,
      ]);
    } catch (error) {
      console.error("Error updating Gmail tokens:", error);
      throw error;
    }
  }

  // Store Gmail tokens from OAuth callback
  async storeTokens(userId, accessToken, refreshToken, expiryDate) {
    try {
      const query = `
        UPDATE users
        SET gmail_access_token = $1,
            gmail_refresh_token = $2,
            gmail_token_expiry = $3,
            gmail_sync_enabled = true
        WHERE u_id = $4
      `;

      await database.query(query, [
        accessToken,
        refreshToken,
        expiryDate ? new Date(expiryDate).toISOString() : null,
        userId,
      ]);
    } catch (error) {
      console.error("Error storing Gmail tokens:", error);
      throw error;
    }
  }

  // Get Gmail sync status for a user
  async getSyncStatus(userId) {
    try {
      const query = `
        SELECT gmail_sync_enabled
        FROM users
        WHERE u_id = $1
      `;
      const result = await database.query(query, [userId]);

      if (result.rows.length === 0) {
        return { enabled: false };
      }

      return {
        enabled: result.rows[0].gmail_sync_enabled || false,
      };
    } catch (error) {
      console.error("Error getting Gmail sync status:", error);
      throw error;
    }
  }

  // Disconnect Gmail
  async disconnect(userId) {
    try {
      const query = `
        UPDATE users
        SET gmail_access_token = NULL,
            gmail_refresh_token = NULL,
            gmail_token_expiry = NULL,
            gmail_sync_enabled = false
        WHERE u_id = $1
      `;

      await database.query(query, [userId]);
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
      throw error;
    }
  }

  // Get authorization URL for Gmail OAuth
  getAuthorizationUrl(userId) {
    const redirectUri = process.env.GOOGLE_GMAIL_CALLBACK_URL || 
      `${process.env.BACKEND_URL || process.env.SERVER_URL || "http://localhost:3001"}/api/v1/gmail/auth/callback`;
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CONTACTS_CLIENT_ID,
      process.env.GOOGLE_CONTACTS_CLIENT_SECRET,
      redirectUri
    );

    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: this.scopes,
      prompt: "consent",
      state: userId, // Pass user ID in state for callback
    });
  }

  // Exchange authorization code for tokens
  async getTokensFromCode(code) {
    try {
      const redirectUri = process.env.GOOGLE_GMAIL_CALLBACK_URL || 
        `${process.env.BACKEND_URL || process.env.SERVER_URL || "http://localhost:3001"}/api/v1/gmail/auth/callback`;
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CONTACTS_CLIENT_ID,
        process.env.GOOGLE_CONTACTS_CLIENT_SECRET,
        redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error("Error getting tokens from code:", error);
      throw error;
    }
  }

  // Search emails with retry logic and rate limiting
  async searchEmails(userId, query, maxResults = 50) {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Add delay to respect rate limits
      await this.delay(this.rateLimitDelay);

      const response = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: Math.min(maxResults, 50), // Gmail API limit is 50
      });

      if (!response.data.messages || response.data.messages.length === 0) {
        return [];
      }

      // Fetch full message details (with rate limiting)
      const messages = [];
      for (let i = 0; i < response.data.messages.length; i++) {
        const message = response.data.messages[i];
        try {
          await this.delay(this.rateLimitDelay);
          const messageDetail = await this.getMessageDetail(userId, message.id);
          if (messageDetail) {
            messages.push(messageDetail);
          }
        } catch (error) {
          console.error(`Error fetching message ${message.id}:`, error);
          // If it's a connection error, stop trying to fetch more messages
          if (error.message && error.message.includes("Gmail not connected")) {
            throw new Error("Gmail not connected. Please reconnect your Gmail account.");
          }
          // Continue with other messages for other errors
        }
      }

      return messages;
    } catch (error) {
      console.error("Error searching emails:", error);
      if (error.code === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (error.code === 401 || error.code === 403) {
        throw new Error("Gmail authentication failed. Please reconnect your Gmail account.");
      }
      throw error;
    }
  }

  // Get message detail by ID
  async getMessageDetail(userId, messageId) {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      await this.delay(this.rateLimitDelay);

      const response = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });

      const message = response.data;
      const headers = message.payload?.headers || [];
      
      const fromHeader = headers.find((h) => h.name === "From");
      const subjectHeader = headers.find((h) => h.name === "Subject");
      const dateHeader = headers.find((h) => h.name === "Date");

      // Parse sender email and name
      let senderEmail = "";
      let senderName = "";
      if (fromHeader) {
        const fromMatch = fromHeader.value.match(/^(.+?)\s*<(.+?)>$|^(.+?)$/);
        if (fromMatch) {
          senderName = (fromMatch[1] || fromMatch[3] || "").trim().replace(/^["']|["']$/g, "");
          senderEmail = (fromMatch[2] || fromMatch[3] || "").trim();
        }
      }

      return {
        id: message.id,
        threadId: message.threadId,
        subject: subjectHeader?.value || "(No subject)",
        senderEmail,
        senderName,
        snippet: message.snippet || "",
        date: dateHeader?.value ? new Date(dateHeader.value).toISOString() : new Date().toISOString(),
        internalDate: message.internalDate ? new Date(parseInt(message.internalDate)).toISOString() : new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error getting message detail for ${messageId}:`, error);
      throw error;
    }
  }

  // Get recent emails (last N days)
  async getRecentEmails(userId, days = 30, maxResults = 50) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    // Gmail search expects date in YYYY/MM/DD format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateQuery = `after:${year}/${month}/${day}`;
    
    return this.searchEmails(userId, dateQuery, maxResults);
  }

  // Search emails by company name or job title keywords
  async searchEmailsByKeywords(userId, keywords, maxResults = 50) {
    // Build Gmail search query
    const searchTerms = keywords
      .split(/\s+/)
      .filter((term) => term.length > 0)
      .map((term) => `"${term}"`)
      .join(" OR ");
    
    const query = `(${searchTerms})`;
    return this.searchEmails(userId, query, maxResults);
  }

  // Link email to job opportunity
  async linkEmailToJob(userId, jobOpportunityId, gmailMessageId) {
    try {
      // Get email details
      const emailDetail = await this.getMessageDetail(userId, gmailMessageId);

      // Check if already linked
      const existingLink = await database.query(
        `
        SELECT id FROM email_links
        WHERE user_id = $1 AND job_opportunity_id = $2 AND gmail_message_id = $3
        `,
        [userId, jobOpportunityId, gmailMessageId]
      );

      if (existingLink.rows.length > 0) {
        return existingLink.rows[0];
      }

      // Insert email link
      const result = await database.query(
        `
        INSERT INTO email_links (
          user_id, job_opportunity_id, gmail_message_id,
          subject, sender_email, sender_name, snippet, email_date, thread_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        `,
        [
          userId,
          jobOpportunityId,
          gmailMessageId,
          emailDetail.subject,
          emailDetail.senderEmail,
          emailDetail.senderName,
          emailDetail.snippet,
          emailDetail.internalDate,
          emailDetail.threadId,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error("Error linking email to job:", error);
      throw error;
    }
  }

  // Get linked emails for a job opportunity
  async getLinkedEmails(userId, jobOpportunityId) {
    try {
      const result = await database.query(
        `
        SELECT * FROM email_links
        WHERE user_id = $1 AND job_opportunity_id = $2
        ORDER BY email_date DESC
        `,
        [userId, jobOpportunityId]
      );

      return result.rows;
    } catch (error) {
      console.error("Error getting linked emails:", error);
      throw error;
    }
  }

  // Unlink email from job opportunity
  async unlinkEmailFromJob(userId, jobOpportunityId, emailLinkId) {
    try {
      const result = await database.query(
        `
        DELETE FROM email_links
        WHERE id = $1 AND user_id = $2 AND job_opportunity_id = $3
        RETURNING *
        `,
        [emailLinkId, userId, jobOpportunityId]
      );

      return result.rows[0];
    } catch (error) {
      console.error("Error unlinking email from job:", error);
      throw error;
    }
  }

  // Detect status suggestions from email subject
  detectStatusFromSubject(subject) {
    if (!subject) return null;

    const lowerSubject = subject.toLowerCase();
    
    if (lowerSubject.includes("interview") || lowerSubject.includes("meeting")) {
      return "Interview";
    }
    if (lowerSubject.includes("offer") || lowerSubject.includes("congratulations")) {
      return "Offer";
    }
    if (lowerSubject.includes("reject") || lowerSubject.includes("unfortunately") || lowerSubject.includes("not moving forward")) {
      return "Rejected";
    }
    if (lowerSubject.includes("phone") || lowerSubject.includes("screening")) {
      return "Phone Screen";
    }
    
    return null;
  }

  // Utility: Delay function for rate limiting
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new GmailService();

