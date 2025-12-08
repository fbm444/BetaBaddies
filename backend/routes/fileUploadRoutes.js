import express from "express";
import fileUploadController from "../controllers/fileUploadController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { validateFileId } from "../middleware/validation.js";

const router = express.Router();

// All file upload routes require authentication
router.use(isAuthenticated);

// Profile Picture Routes
router.post("/profile-picture", fileUploadController.uploadProfilePicture);

router.get("/profile-picture", fileUploadController.getProfilePicture);

// Document Routes
router.post("/document", fileUploadController.uploadDocument);

router.get("/documents", fileUploadController.getDocuments);

// Resume Routes
router.post("/resume", fileUploadController.uploadResume);

router.get("/resumes", fileUploadController.getResumes);

// General File Routes
router.get("/", fileUploadController.getUserFiles);

router.get("/statistics", fileUploadController.getFileStatistics);

router.get("/:fileId", validateFileId, fileUploadController.getFileById);

router.get("/:fileId/content", validateFileId, fileUploadController.serveFile);

// Proxy endpoint for profile pictures - generates fresh signed URLs on-demand
router.get("/profile-picture/:fileId/url", validateFileId, fileUploadController.getProfilePictureUrl);

router.delete("/:fileId", validateFileId, fileUploadController.deleteFile);

export default router;
