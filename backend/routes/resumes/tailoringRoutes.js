import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// Tailoring Routes
router.get("/:id/tailoring", resumeController.getTailoring);
router.post("/:id/tailoring", resumeController.createOrUpdateTailoring);
router.delete("/:id/tailoring", resumeController.deleteTailoring);

export default router;

