import { asyncHandler } from "../middleware/errorHandler.js";
import interviewPredictionService from "../services/interviewPredictionService.js";
import database from "../services/database.js";

class InterviewPredictionController {
  /**
   * Get prediction for a job opportunity
   */
  getPrediction = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobOpportunityId } = req.params;

    if (!jobOpportunityId) {
      return res.status(400).json({
        ok: false,
        error: "Job opportunity ID is required",
      });
    }

    const prediction = await interviewPredictionService.getPrediction(
      jobOpportunityId,
      userId
    );

    if (!prediction) {
      return res.status(404).json({
        ok: false,
        error: "Prediction not found. Calculate prediction first.",
      });
    }

    res.status(200).json({
      ok: true,
      data: { prediction },
    });
  });

  /**
   * Calculate or recalculate prediction
   */
  calculatePrediction = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobOpportunityId } = req.params;

    if (!jobOpportunityId) {
      return res.status(400).json({
        ok: false,
        error: "Job opportunity ID is required",
      });
    }

    const prediction = await interviewPredictionService.calculateSuccessProbability(
      jobOpportunityId,
      userId
    );

    res.status(200).json({
      ok: true,
      data: { prediction },
      message: "Prediction calculated successfully",
    });
  });

  /**
   * Compare predictions for multiple job opportunities
   */
  comparePredictions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { opportunities } = req.query;

    if (!opportunities) {
      return res.status(400).json({
        ok: false,
        error: "Opportunity IDs are required (comma-separated)",
      });
    }

    const opportunityIds = opportunities.split(",").map((id) => id.trim());

    if (opportunityIds.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "At least one opportunity ID is required",
      });
    }

    const predictions = await interviewPredictionService.comparePredictions(
      userId,
      opportunityIds
    );

    res.status(200).json({
      ok: true,
      data: { predictions },
    });
  });

  /**
   * Update actual outcome and calculate accuracy
   */
  updateOutcome = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobOpportunityId } = req.params;
    const { outcome, outcomeDate } = req.body;

    if (!jobOpportunityId || !outcome) {
      return res.status(400).json({
        ok: false,
        error: "Job opportunity ID and outcome are required",
      });
    }

    const validOutcomes = ["accepted", "rejected", "pending", "withdrawn", "no_response"];
    if (!validOutcomes.includes(outcome)) {
      return res.status(400).json({
        ok: false,
        error: `Outcome must be one of: ${validOutcomes.join(", ")}`,
      });
    }

    const updated = await interviewPredictionService.updateOutcome(
      jobOpportunityId,
      userId,
      outcome,
      outcomeDate
    );

    res.status(200).json({
      ok: true,
      data: { prediction: updated },
      message: "Outcome updated successfully",
    });
  });

  /**
   * Get prediction accuracy metrics for user
   */
  getAccuracyMetrics = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    // Get accuracy metrics from database
    const result = await database.query(
      `SELECT * FROM prediction_accuracy_metrics WHERE user_id = $1`,
      [userId]
    );

    const metrics = result.rows[0] || {
      totalPredictions: 0,
      accuratePredictions: 0,
      avgError: 0,
      byConfidenceLevel: {},
    };

    res.status(200).json({
      ok: true,
      data: { metrics },
    });
  });

  /**
   * Recalculate all predictions for user
   */
  recalculateAll = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const predictions = await interviewPredictionService.recalculateAll(userId);

    res.status(200).json({
      ok: true,
      data: { predictions },
      message: `Recalculated ${predictions.length} predictions`,
    });
  });
}

export default new InterviewPredictionController();

