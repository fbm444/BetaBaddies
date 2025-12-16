import express from "express";
import optimizationController from "../controllers/optimizationController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// ============================================================================
// Success Metrics Routes
// ============================================================================
router.get("/metrics", optimizationController.getMetrics);
router.get("/metrics/trends", optimizationController.getTrends);
router.get("/metrics/snapshots", optimizationController.getSnapshots);
router.post("/metrics/snapshots", optimizationController.createSnapshot);

// ============================================================================
// Application Strategy Routes
// ============================================================================
router.post("/strategies/track", optimizationController.trackStrategy);
router.get("/strategies/performance", optimizationController.getStrategyPerformance);
router.get("/strategies/best", optimizationController.getBestStrategies);
router.post("/strategies/compare", optimizationController.compareStrategies);

// ============================================================================
// Document Performance Routes
// ============================================================================
router.post("/documents/register", optimizationController.registerDocument);
router.get("/documents/:id/performance", optimizationController.getDocumentPerformance);
router.get("/documents/compare", optimizationController.compareDocuments);
router.get("/documents/best", optimizationController.getBestDocuments);
router.put("/documents/:id/set-primary", optimizationController.setPrimaryDocument);

// ============================================================================
// Timing Analysis Routes
// ============================================================================
router.get("/timing/optimal", optimizationController.getOptimalTiming);
router.get("/timing/day-of-week", optimizationController.getDayOfWeekPerformance);
router.get("/timing/hour-of-day", optimizationController.getHourOfDayPerformance);
router.get("/timing/time-of-day", optimizationController.getTimeOfDayPerformance);

// ============================================================================
// Response Time Prediction Routes
// ============================================================================
router.get(
  "/response-time/prediction/:jobId",
  optimizationController.getResponseTimePrediction
);
router.get(
  "/response-time/benchmarks",
  optimizationController.getResponseTimeBenchmarks
);

// ============================================================================
// A/B Testing Routes
// ============================================================================
router.post("/ab-tests", optimizationController.createABTest);
router.get("/ab-tests", optimizationController.getABTests);
router.get("/ab-tests/:id/results", optimizationController.getABTestResults);
router.put("/ab-tests/:id/start", optimizationController.startABTest);
router.put("/ab-tests/:id/complete", optimizationController.completeABTest);

// ============================================================================
// Recommendations Routes
// ============================================================================
router.post("/recommendations/generate", optimizationController.generateRecommendations);
router.get("/recommendations", optimizationController.getRecommendations);
router.put("/recommendations/:id/acknowledge", optimizationController.acknowledgeRecommendation);
router.put("/recommendations/:id/complete", optimizationController.completeRecommendation);
router.put("/recommendations/:id/dismiss", optimizationController.dismissRecommendation);

// ============================================================================
// Role Type Analysis Routes
// ============================================================================
router.get("/role-types/performance", optimizationController.getRoleTypePerformance);
router.get("/role-types/best", optimizationController.getBestRoleTypes);

// ============================================================================
// Application Quality Scoring Routes
// ============================================================================
router.post(
  "/quality/score/:jobId",
  optimizationController.scoreApplicationQuality
);
router.get(
  "/quality/latest/:jobId",
  optimizationController.getApplicationQuality
);
router.get(
  "/quality/stats",
  optimizationController.getApplicationQualityStats
);
router.get(
  "/quality/history/:jobId",
  optimizationController.getApplicationQualityHistory
);

// ============================================================================
// Competitive Analysis Routes
// ============================================================================
router.get(
  "/competitive/analyze/:jobId",
  optimizationController.analyzeCompetitiveness
);
router.get(
  "/competitive/prioritize",
  optimizationController.getPrioritizedApplications
);
router.get(
  "/competitive/compare/:jobId",
  optimizationController.compareToHiredProfile
);

export default router;

