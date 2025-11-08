import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// Parse/Import Routes
router.post("/parse", resumeController.parseResume);

export default router;

