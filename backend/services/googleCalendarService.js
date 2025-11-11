import { google } from "googleapis";
import database from "./database.js";

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = null;
    this.scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ];
  }

  // Get OAuth2 client for a user
  async getOAuth2Client(userId) {
    try {
      const query = `
        SELECT google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expiry
        FROM users
        WHERE u_id = $1
      `;
      const result = await database.query(query, [userId]);

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      const user = result.rows[0];

      if (!user.google_calendar_access_token || !user.google_calendar_refresh_token) {
        throw new Error("Google Calendar not connected");
      }

      // Use GOOGLE_CALENDAR_CALLBACK_URL if set, otherwise construct from BACKEND_URL
      const redirectUri = process.env.GOOGLE_CALENDAR_CALLBACK_URL || 
        `${process.env.BACKEND_URL || process.env.SERVER_URL || "http://localhost:3001"}/api/v1/calendar/auth/callback`;
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      oauth2Client.setCredentials({
        access_token: user.google_calendar_access_token,
        refresh_token: user.google_calendar_refresh_token,
        expiry_date: user.google_calendar_token_expiry
          ? new Date(user.google_calendar_token_expiry).getTime()
          : null,
      });

      // Refresh token if expired
      if (user.google_calendar_token_expiry && new Date(user.google_calendar_token_expiry) < new Date()) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await this.updateTokens(userId, credentials);
        oauth2Client.setCredentials(credentials);
      }

      return oauth2Client;
    } catch (error) {
      console.error("Error getting OAuth2 client:", error);
      throw error;
    }
  }

  // Update Google Calendar tokens for a user
  async updateTokens(userId, tokens) {
    try {
      const query = `
        UPDATE users
        SET google_calendar_access_token = $1,
            google_calendar_refresh_token = $2,
            google_calendar_token_expiry = $3,
            google_calendar_sync_enabled = true
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
      console.error("Error updating tokens:", error);
      throw error;
    }
  }

  // Store Google Calendar tokens from OAuth callback
  async storeTokens(userId, accessToken, refreshToken, expiryDate) {
    try {
      const query = `
        UPDATE users
        SET google_calendar_access_token = $1,
            google_calendar_refresh_token = $2,
            google_calendar_token_expiry = $3,
            google_calendar_sync_enabled = true
        WHERE u_id = $4
      `;

      await database.query(query, [
        accessToken,
        refreshToken,
        expiryDate ? new Date(expiryDate).toISOString() : null,
        userId,
      ]);
    } catch (error) {
      console.error("Error storing tokens:", error);
      throw error;
    }
  }

  // Get calendar sync status for a user
  async getSyncStatus(userId) {
    try {
      const query = `
        SELECT google_calendar_sync_enabled, google_calendar_id
        FROM users
        WHERE u_id = $1
      `;
      const result = await database.query(query, [userId]);

      if (result.rows.length === 0) {
        return { enabled: false, calendarId: null };
      }

      return {
        enabled: result.rows[0].google_calendar_sync_enabled || false,
        calendarId: result.rows[0].google_calendar_id || null,
      };
    } catch (error) {
      console.error("Error getting sync status:", error);
      throw error;
    }
  }

  // Disconnect Google Calendar
  async disconnect(userId) {
    try {
      const query = `
        UPDATE users
        SET google_calendar_access_token = NULL,
            google_calendar_refresh_token = NULL,
            google_calendar_token_expiry = NULL,
            google_calendar_sync_enabled = false,
            google_calendar_id = NULL
        WHERE u_id = $1
      `;

      await database.query(query, [userId]);
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
      throw error;
    }
  }

  // Create calendar event for an interview
  async createEvent(userId, interview) {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      const startTime = new Date(interview.scheduledAt);
      const endTime = new Date(
        startTime.getTime() + (interview.duration || 60) * 60000
      );

      const event = {
        summary: `${interview.title || "Interview"} - ${interview.company}`,
        description: this.buildEventDescription(interview),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        location: interview.location || interview.videoLink || interview.phoneNumber || "",
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 1 day before
            { method: "popup", minutes: 60 }, // 1 hour before
          ],
        },
        attendees: interview.interviewerEmail
          ? [{ email: interview.interviewerEmail }]
          : [],
      };

      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      });

      // Store event ID in database
      await this.updateInterviewEventId(interview.id, response.data.id);

      return response.data;
    } catch (error) {
      console.error("Error creating calendar event:", error);
      throw error;
    }
  }

  // Update calendar event for an interview
  async updateEvent(userId, interview) {
    try {
      if (!interview.googleCalendarEventId) {
        // If no event ID, create a new event
        return await this.createEvent(userId, interview);
      }

      const oauth2Client = await this.getOAuth2Client(userId);
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      const startTime = new Date(interview.scheduledAt);
      const endTime = new Date(
        startTime.getTime() + (interview.duration || 60) * 60000
      );

      const event = {
        summary: `${interview.title || "Interview"} - ${interview.company}`,
        description: this.buildEventDescription(interview),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        location: interview.location || interview.videoLink || interview.phoneNumber || "",
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 1 day before
            { method: "popup", minutes: 60 }, // 1 hour before
          ],
        },
        attendees: interview.interviewerEmail
          ? [{ email: interview.interviewerEmail }]
          : [],
      };

      const response = await calendar.events.update({
        calendarId: "primary",
        eventId: interview.googleCalendarEventId,
        requestBody: event,
      });

      return response.data;
    } catch (error) {
      console.error("Error updating calendar event:", error);
      // If event not found, create a new one
      if (error.code === 404) {
        return await this.createEvent(userId, interview);
      }
      throw error;
    }
  }

  // Delete calendar event for an interview
  async deleteEvent(userId, eventId) {
    try {
      if (!eventId) {
        return;
      }

      const oauth2Client = await this.getOAuth2Client(userId);
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      await calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
      });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      // If event not found, that's okay - it's already deleted
      if (error.code !== 404) {
        throw error;
      }
    }
  }

  // Update interview with Google Calendar event ID
  async updateInterviewEventId(interviewId, eventId) {
    try {
      const query = `
        UPDATE interviews
        SET google_calendar_event_id = $1
        WHERE id = $2
      `;
      await database.query(query, [eventId, interviewId]);
    } catch (error) {
      console.error("Error updating interview event ID:", error);
      throw error;
    }
  }

  // Build event description from interview data
  buildEventDescription(interview) {
    const parts = [];

    if (interview.notes) {
      parts.push(`Notes: ${interview.notes}`);
    }

    if (interview.preparationNotes) {
      parts.push(`Preparation Notes: ${interview.preparationNotes}`);
    }

    if (interview.interviewerName) {
      parts.push(`Interviewer: ${interview.interviewerName}`);
      if (interview.interviewerTitle) {
        parts.push(`Title: ${interview.interviewerTitle}`);
      }
    }

    if (interview.interviewerEmail) {
      parts.push(`Email: ${interview.interviewerEmail}`);
    }

    if (interview.videoLink) {
      parts.push(`Video Link: ${interview.videoLink}`);
    }

    if (interview.phoneNumber) {
      parts.push(`Phone: ${interview.phoneNumber}`);
    }

    if (interview.jobOpportunityId) {
      parts.push(`Job Opportunity ID: ${interview.jobOpportunityId}`);
    }

    return parts.join("\n\n");
  }

  // Get authorization URL for Google Calendar OAuth
  getAuthorizationUrl(userId) {
    // Use GOOGLE_CALENDAR_CALLBACK_URL if set, otherwise construct from BACKEND_URL
    const redirectUri = process.env.GOOGLE_CALENDAR_CALLBACK_URL || 
      `${process.env.BACKEND_URL || process.env.SERVER_URL || "http://localhost:3001"}/api/v1/calendar/auth/callback`;
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
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
      // Use GOOGLE_CALENDAR_CALLBACK_URL if set, otherwise construct from BACKEND_URL
      const redirectUri = process.env.GOOGLE_CALENDAR_CALLBACK_URL || 
        `${process.env.BACKEND_URL || process.env.SERVER_URL || "http://localhost:3001"}/api/v1/calendar/auth/callback`;
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error("Error getting tokens from code:", error);
      throw error;
    }
  }
}

export default new GoogleCalendarService();

