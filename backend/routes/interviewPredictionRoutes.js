import express from "express";
import interviewPredictionController from "../controllers/interviewPredictionController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Get prediction for a job opportunity
router.get("/:jobOpportunityId", interviewPredictionController.getPrediction);

// Calculate or recalculate prediction
router.post("/:jobOpportunityId/calculate", interviewPredictionController.calculatePrediction);

// Compare predictions for multiple opportunities
router.get("/compare", interviewPredictionController.comparePredictions);

// Update actual outcome
router.put("/:jobOpportunityId/outcome", interviewPredictionController.updateOutcome);

// Get accuracy metrics
router.get("/accuracy/metrics", interviewPredictionController.getAccuracyMetrics);

// Recalculate all predictions
router.post("/recalculate-all", interviewPredictionController.recalculateAll);

export default router;

