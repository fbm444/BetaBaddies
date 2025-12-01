import express from "express";
import thankYouNoteController from "../controllers/thankYouNoteController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Generate thank-you note
router.post("/interviews/:id/thank-you-notes/generate", thankYouNoteController.generateThankYouNote);

// Send thank-you note
router.post("/interviews/:id/thank-you-notes/:noteId/send", thankYouNoteController.sendThankYouNote);

// Get thank-you notes for interview
router.get("/interviews/:id/thank-you-notes", thankYouNoteController.getThankYouNotes);

// Update thank-you note
router.put("/interviews/:id/thank-you-notes/:noteId", thankYouNoteController.updateThankYouNote);

export default router;

