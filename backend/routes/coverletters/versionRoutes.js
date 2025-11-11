import express from "express";
import coverLetterController from "../../controllers/coverLetterController.js";

const router = express.Router();

// Version Management Routes
router.get("/:id/versions", coverLetterController.getVersions);
router.get("/:id/version-history", coverLetterController.getVersionHistory);

export default router;

