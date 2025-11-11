import googleCalendarService from "../services/googleCalendarService.js";
import interviewService from "../services/interviewService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class GoogleCalendarController {
  // Get authorization URL for Google Calendar
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

    const authUrl = googleCalendarService.getAuthorizationUrl(userId);

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
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/interview-scheduling?error=no_code`
      );
    }

    if (!userId) {
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/interview-scheduling?error=unauthorized`
      );
    }

    try {
      const tokens = await googleCalendarService.getTokensFromCode(code);
      await googleCalendarService.storeTokens(
        userId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expiry_date
      );

      res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/interview-scheduling?calendar=connected`
      );
    } catch (error) {
      console.error("Error handling Google Calendar callback:", error);
      res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/interview-scheduling?error=calendar_connection_failed`
      );
    }
  });

  // Get sync status
  getSyncStatus = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const status = await googleCalendarService.getSyncStatus(userId);

    res.status(200).json({
      ok: true,
      data: {
        status,
      },
    });
  });

  // Disconnect Google Calendar
  disconnect = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    await googleCalendarService.disconnect(userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Google Calendar disconnected successfully",
      },
    });
  });

  // Sync interview to Google Calendar
  syncInterview = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { interviewId } = req.params;

    const interview = await interviewService.getInterviewById(userId, interviewId);
    if (!interview) {
      return res.status(404).json({
        ok: false,
        error: {
          message: "Interview not found",
        },
      });
    }

    try {
      const event = await googleCalendarService.createEvent(userId, interview);

      res.status(200).json({
        ok: true,
        data: {
          event,
          message: "Interview synced to Google Calendar successfully",
        },
      });
    } catch (error) {
      console.error("Error syncing interview to Google Calendar:", error);
      res.status(500).json({
        ok: false,
        error: {
          message: error.message || "Failed to sync interview to Google Calendar",
        },
      });
    }
  });

  // Sync all interviews to Google Calendar
  syncAllInterviews = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const interviews = await interviewService.getInterviews(userId, {
      status: "scheduled",
    });

    const results = [];
    const errors = [];

    for (const interview of interviews) {
      try {
        const event = await googleCalendarService.createEvent(userId, interview);
        results.push({
          interviewId: interview.id,
          eventId: event.id,
          success: true,
        });
      } catch (error) {
        console.error(`Error syncing interview ${interview.id}:`, error);
        errors.push({
          interviewId: interview.id,
          error: error.message,
          success: false,
        });
      }
    }

    res.status(200).json({
      ok: true,
      data: {
        synced: results.length,
        failed: errors.length,
        results,
        errors,
        message: `Synced ${results.length} interview(s) to Google Calendar`,
      },
    });
  });
}

export default new GoogleCalendarController();

