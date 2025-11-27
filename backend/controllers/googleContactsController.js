import googleContactsService from "../services/googleContactsService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class GoogleContactsController {
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

    const authUrl = googleContactsService.getAuthorizationUrl(userId);
    res.status(200).json({
      ok: true,
      data: {
        authUrl,
      },
    });
  });

  handleCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const userId = state || req.session.userId;
    const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";
    const successRedirect = `${frontendBase}/network/contacts?googleContacts=connected`;
    const errorRedirect = `${frontendBase}/network/contacts?googleContacts=error`;

    if (!code || !userId) {
      return res.redirect(errorRedirect);
    }

    try {
      const tokens = await googleContactsService.getTokensFromCode(code);
      await googleContactsService.storeTokens(userId, tokens);
      res.redirect(successRedirect);
    } catch (error) {
      console.error("Error handling Google Contacts callback:", error);
      res.redirect(errorRedirect);
    }
  });

  getStatus = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const status = await googleContactsService.getStatus(userId);

    res.status(200).json({
      ok: true,
      data: {
        status,
      },
    });
  });

  disconnect = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    await googleContactsService.disconnect(userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Google Contacts disconnected successfully",
      },
    });
  });

  importContacts = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    try {
      const summary = await googleContactsService.importContacts(userId, req.body || {});
      const message =
        summary.created > 0
          ? `Imported ${summary.created} contact${summary.created === 1 ? "" : "s"} from Google`
          : "No new contacts were imported";

      return res.status(200).json({
        ok: true,
        data: {
          summary,
          message,
        },
      });
    } catch (error) {
      if (error.code === "GOOGLE_CONTACTS_NOT_CONNECTED") {
        return res.status(400).json({
          ok: false,
          error: {
            message: "Connect Google Contacts before importing.",
          },
        });
      }

      if (error.code === "GOOGLE_CONTACTS_AUTH_EXPIRED") {
        return res.status(401).json({
          ok: false,
          error: {
            message: "Google Contacts authorization expired. Please reconnect and try again.",
            code: "GOOGLE_CONTACTS_AUTH_EXPIRED",
          },
        });
      }

      throw error;
    }
  });
}

export default new GoogleContactsController();


