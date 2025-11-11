import express from "express";
import companyResearchController from "../controllers/companyResearchController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Automated Research
router.post("/fetch/:jobId", companyResearchController.fetchCompanyResearch);

// Company Info routes
router.get("/", companyResearchController.getResearchedCompanies);
router.get("/job/:jobId", companyResearchController.getCompanyResearchByJobId);
router.get("/job/:jobId/ai-summary", companyResearchController.generateAISummary);
router.post("/job/:jobId", companyResearchController.upsertCompanyInfo);
router.delete("/job/:jobId", companyResearchController.deleteCompanyResearch);

// Company Media routes
router.post("/:companyInfoId/media", companyResearchController.addCompanyMedia);
router.get("/:companyInfoId/media", companyResearchController.getCompanyMedia);
router.delete("/media/:mediaId", companyResearchController.deleteCompanyMedia);

// Company News routes
router.post("/:companyInfoId/news", companyResearchController.addCompanyNews);
router.get("/:companyInfoId/news", companyResearchController.getCompanyNews);
router.delete("/news/:newsId", companyResearchController.deleteCompanyNews);

export default router;

