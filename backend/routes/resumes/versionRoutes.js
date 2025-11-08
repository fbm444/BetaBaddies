import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// Version Management Routes
router.get("/:id/versions", resumeController.getVersions);
router.post("/:id/versions", resumeController.createVersion);
router.get("/:id/compare", resumeController.compareVersions);
router.post("/:id/merge", resumeController.mergeVersions);
router.post("/:id/set-master", resumeController.setMasterVersion);
router.get("/:id/version-history", resumeController.getVersionHistory);

export default router;

