import express from "express";
import coverLetterController from "../../controllers/coverLetterController.js";

const router = express.Router();

// Core Cover Letter Routes
router.get("/", coverLetterController.getCoverLetters);
router.get("/:id", coverLetterController.getCoverLetter);
router.post("/", coverLetterController.createCoverLetter);
router.put("/:id", coverLetterController.updateCoverLetter);
router.delete("/:id", coverLetterController.deleteCoverLetter);
router.post("/:id/duplicate", coverLetterController.duplicateCoverLetter);

export default router;

