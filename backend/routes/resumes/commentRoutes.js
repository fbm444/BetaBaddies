import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// Comments Routes
router.get("/:id/comments", resumeController.getComments);
router.post("/:id/comments", resumeController.createComment);
router.put("/comments/:commentId", resumeController.updateComment);
router.delete("/comments/:commentId", resumeController.deleteComment);

export default router;

