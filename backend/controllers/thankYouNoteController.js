import thankYouNoteService from "../services/thankYouNoteService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class ThankYouNoteController {
  // Generate a thank-you note for an interview
  generateThankYouNote = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: interviewId } = req.params;
    const { templateStyle } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const note = await thankYouNoteService.generateThankYouNote(interviewId, userId, {
      templateStyle: templateStyle || "standard",
    });

    res.status(201).json({
      ok: true,
      data: {
        note,
        message: "Thank-you note generated successfully",
      },
    });
  });

  // Send thank-you note via email
  sendThankYouNote = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: interviewId, noteId } = req.params;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const result = await thankYouNoteService.sendThankYouNote(noteId, userId);

    res.status(200).json({
      ok: true,
      data: {
        ...result,
        message: "Thank-you note sent successfully",
      },
    });
  });

  // Get thank-you notes for an interview
  getThankYouNotes = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: interviewId } = req.params;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const notes = await thankYouNoteService.getThankYouNotesForInterview(interviewId, userId);

    res.status(200).json({
      ok: true,
      data: {
        notes,
      },
    });
  });

  // Update thank-you note
  updateThankYouNote = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: interviewId, noteId } = req.params;
    const { subject, body } = req.body;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    await thankYouNoteService.updateThankYouNote(noteId, userId, { subject, body });

    res.status(200).json({
      ok: true,
      data: {
        message: "Thank-you note updated successfully",
      },
    });
  });
}

export default new ThankYouNoteController();

