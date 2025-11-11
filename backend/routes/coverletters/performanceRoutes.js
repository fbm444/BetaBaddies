import express from "express";
import coverLetterController from "../../controllers/coverLetterController.js";

const router = express.Router();

// Performance Tracking Routes
router.post("/:id/performance", coverLetterController.trackPerformance);
router.get("/:id/performance", coverLetterController.getPerformance);
router.get("/:id/performance/metrics", coverLetterController.getPerformanceMetrics);
router.get("/:id/performance/records", coverLetterController.getPerformanceRecords);

export default router;

