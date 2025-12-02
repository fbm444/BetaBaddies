import express from "express";
import salaryNegotiationController from "../controllers/salaryNegotiationController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Create negotiation
router.post("/", salaryNegotiationController.createNegotiation);

// Get all negotiations
router.get("/", salaryNegotiationController.getNegotiations);

// Get negotiation by ID
router.get("/:id", salaryNegotiationController.getNegotiationById);

// Get negotiation by job opportunity
router.get("/job/:jobOpportunityId", salaryNegotiationController.getNegotiationByJob);

// Update negotiation
router.put("/:id", salaryNegotiationController.updateNegotiation);

// Add counteroffer
router.post("/:id/counteroffer", salaryNegotiationController.addCounteroffer);

// Complete negotiation
router.put("/:id/complete", salaryNegotiationController.completeNegotiation);

// Market research
router.get("/:id/market-research", salaryNegotiationController.getMarketResearch);
router.post("/:id/market-research", salaryNegotiationController.triggerMarketResearch);

// Talking points
router.get("/:id/talking-points", salaryNegotiationController.getTalkingPoints);
router.post("/:id/talking-points", salaryNegotiationController.generateTalkingPoints);

// Scripts
router.get("/:id/scripts/:scenario", salaryNegotiationController.getNegotiationScript);
router.post("/:id/scripts/:scenario", salaryNegotiationController.generateNegotiationScript);

// Counteroffer evaluation
router.post("/:id/evaluate-counteroffer", salaryNegotiationController.evaluateCounteroffer);

// Timing strategy
router.get("/:id/timing-strategy", salaryNegotiationController.getTimingStrategy);

// Salary progression
router.get("/progression/history", salaryNegotiationController.getSalaryProgression);
router.post("/progression/entry", salaryNegotiationController.addSalaryProgressionEntry);
router.delete("/progression/entry/:entryId", salaryNegotiationController.deleteSalaryProgressionEntry);

export default router;

