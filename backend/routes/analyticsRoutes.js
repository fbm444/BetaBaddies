import express from "express";
import analyticsController from "../controllers/analyticsController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All analytics routes require authentication
router.use(isAuthenticated);

// Analytics endpoints
router.get("/job-search-performance", analyticsController.getJobSearchPerformance);
router.get("/application-success", analyticsController.getApplicationSuccessAnalysis);
router.get("/interview-performance", analyticsController.getInterviewPerformance);
router.get("/network-roi", analyticsController.getNetworkROI);
router.get("/salary-progression", analyticsController.getSalaryProgression);
router.get("/productivity", analyticsController.getProductivityAnalytics);

export default router;

