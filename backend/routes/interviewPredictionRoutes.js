import express from "express";
import interviewPredictionController from "../controllers/interviewPredictionController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Static routes must come before parameterized routes
// Compare predictions for multiple opportunities
router.get("/compare", interviewPredictionController.comparePredictions);

// Get accuracy metrics
router.get("/accuracy/metrics", interviewPredictionController.getAccuracyMetrics);

// Recalculate all predictions
router.post("/recalculate-all", interviewPredictionController.recalculateAll);

// Parameterized routes
// Get prediction for a job opportunity
router.get("/:jobOpportunityId", interviewPredictionController.getPrediction);

// Calculate or recalculate prediction
router.post("/:jobOpportunityId/calculate", interviewPredictionController.calculatePrediction);

// Update actual outcome
router.put("/:jobOpportunityId/outcome", interviewPredictionController.updateOutcome);

export default router;

