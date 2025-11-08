import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// Sharing Routes (Owner)
router.post("/:id/share", resumeController.createShare);
router.get("/:id/shares", resumeController.getShares);
router.get("/shares/:shareId", resumeController.getShare);
router.put("/shares/:shareId", resumeController.updateShare);
router.post("/shares/:shareId/revoke", resumeController.revokeShare);
router.delete("/shares/:shareId", resumeController.deleteShare);

export default router;

