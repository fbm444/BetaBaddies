import { v4 as uuidv4 } from "uuid";
import database from "./database.js";
import preparationAnalysisService from "./preparationAnalysisService.js";
import roleMatchService from "./roleMatchService.js";
import companyResearchService from "./companyResearchService.js";
import practiceAnalysisService from "./practiceAnalysisService.js";
import historicalPerformanceService from "./historicalPerformanceService.js";
import recommendationEngineService from "./recommendationEngineService.js";

class InterviewPredictionService {
  constructor() {
    // Weight configuration for factors
    this.weights = {
      preparation: 0.30,
      roleMatch: 0.25,
      companyResearch: 0.20,
      practiceHours: 0.15,
      historical: 0.10,
    };
  }

  /**
   * Calculate interview success probability for a job opportunity
   */
  async calculateSuccessProbability(jobOpportunityId, userId) {
    try {
      console.log(`📊 Calculating prediction for job ${jobOpportunityId}, user ${userId}`);

      // Calculate all factor scores
      const [
        preparationResult,
        roleMatchResult,
        companyResearchResult,
        practiceResult,
        historicalResult,
      ] = await Promise.all([
        preparationAnalysisService.calculatePreparationScore(jobOpportunityId, userId),
        roleMatchService.calculateRoleMatch(jobOpportunityId, userId),
        companyResearchService.calculateResearchScore(jobOpportunityId, userId),
        practiceAnalysisService.calculatePracticeScore(userId),
        historicalPerformanceService.calculateHistoricalScore(userId, jobOpportunityId),
      ]);

      const factors = {
        preparation: preparationResult.score,
        roleMatch: roleMatchResult.score,
        companyResearch: companyResearchResult.score,
        practiceHours: practiceResult.score,
        historical: historicalResult.score,
      };

      // Calculate weighted base score
      const baseScore =
        factors.preparation * this.weights.preparation +
        factors.roleMatch * this.weights.roleMatch +
        factors.companyResearch * this.weights.companyResearch +
        factors.practiceHours * this.weights.practiceHours +
        factors.historical * this.weights.historical;

      // Apply adjustments (can be extended later)
      const adjustments = this.calculateAdjustments(factors, {
        preparation: preparationResult,
        roleMatch: roleMatchResult,
        companyResearch: companyResearchResult,
        practice: practiceResult,
        historical: historicalResult,
      });

      const finalProbability = Math.min(100, Math.max(0, baseScore + adjustments.total));

      // Calculate confidence score
      const confidence = this.calculateConfidence({
        preparation: preparationResult,
        roleMatch: roleMatchResult,
        companyResearch: companyResearchResult,
        practice: practiceResult,
        historical: historicalResult,
      });

      // Build factors breakdown
      const factorsBreakdown = {
        preparation: {
          score: factors.preparation,
          weight: this.weights.preparation,
          breakdown: preparationResult.breakdown || {},
          status: preparationResult.status || "complete",
        },
        roleMatch: {
          score: factors.roleMatch,
          weight: this.weights.roleMatch,
          breakdown: roleMatchResult.breakdown || {},
          status: roleMatchResult.status || "complete",
        },
        companyResearch: {
          score: factors.companyResearch,
          weight: this.weights.companyResearch,
          breakdown: companyResearchResult.breakdown || {},
          status: companyResearchResult.status || "complete",
        },
        practiceHours: {
          score: factors.practiceHours,
          weight: this.weights.practiceHours,
          breakdown: practiceResult.breakdown || {},
          status: practiceResult.status || "complete",
        },
        historical: {
          score: factors.historical,
          weight: this.weights.historical,
          breakdown: historicalResult.breakdown || {},
          status: historicalResult.status || "complete",
        },
      };

      // Generate recommendations
      const recommendations = await recommendationEngineService.generateRecommendations({
        probability: finalProbability,
        confidence,
        factors: factorsBreakdown,
      });

      // Save or update prediction
      const prediction = await this.savePrediction({
        userId,
        jobOpportunityId,
        probability: finalProbability,
        confidence,
        factors,
        factorsBreakdown,
        recommendations,
        adjustments,
      });

      // Save to history
      await this.saveToHistory(prediction.id, finalProbability, confidence, factorsBreakdown);

      return {
        id: prediction.id,
        jobOpportunityId,
        predictedSuccessProbability: finalProbability,
        confidenceScore: confidence,
        preparationScore: factors.preparation,
        roleMatchScore: factors.roleMatch,
        companyResearchScore: factors.companyResearch,
        practiceHoursScore: factors.practiceHours,
        historicalPerformanceScore: factors.historical,
        factorsBreakdown,
        recommendations,
        calculatedAt: prediction.calculated_at,
        lastUpdated: prediction.last_updated,
      };
    } catch (error) {
      console.error("❌ Error calculating success probability:", error);
      throw error;
    }
  }

  /**
   * Calculate adjustments to base score
   */
  calculateAdjustments(factors, factorResults) {
    let total = 0;
    const details = {};

    // Bonus for high preparation (above 80)
    if (factors.preparation >= 80) {
      const bonus = (factors.preparation - 80) * 0.1; // Up to +2 points
      total += bonus;
      details.highPreparation = bonus;
    }

    // Penalty for very low role match (below 40)
    if (factors.roleMatch < 40) {
      const penalty = (40 - factors.roleMatch) * 0.15; // Up to -6 points
      total -= penalty;
      details.lowRoleMatch = -penalty;
    }

    // Bonus for recent practice activity
    if (factorResults.practice.recentActivity) {
      total += 2;
      details.recentPractice = 2;
    }

    return { total, details };
  }

  /**
   * Calculate confidence score based on data completeness
   */
  calculateConfidence(factorResults) {
    let confidence = 0;
    let dataPoints = 0;
    const maxDataPoints = 5;

    // Check each factor for data completeness
    const factors = ["preparation", "roleMatch", "companyResearch", "practice", "historical"];
    factors.forEach((factor) => {
      const result = factorResults[factor];
      if (result && result.hasData) {
        dataPoints++;
        if (result.status === "complete") {
          confidence += 20; // Full confidence for complete data
        } else if (result.status === "partial") {
          confidence += 12; // Partial confidence
        } else {
          confidence += 5; // Low confidence
        }
      }
    });

    // Adjust based on data points available
    if (dataPoints === maxDataPoints) {
      confidence = Math.min(100, confidence + 10); // Bonus for all factors
    } else if (dataPoints < 3) {
      confidence = Math.max(0, confidence - 20); // Penalty for missing data
    }

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Save or update prediction in database
   */
  async savePrediction(predictionData) {
    const {
      userId,
      jobOpportunityId,
      probability,
      confidence,
      factors,
      factorsBreakdown,
      recommendations,
      adjustments,
    } = predictionData;

    // Check if prediction exists
    const existing = await database.query(
      `SELECT id FROM interview_success_predictions 
       WHERE user_id = $1 AND job_opportunity_id = $2`,
      [userId, jobOpportunityId]
    );

    if (existing.rows.length > 0) {
      // Update existing
      const result = await database.query(
        `UPDATE interview_success_predictions SET
          predicted_success_probability = $1,
          confidence_score = $2,
          preparation_score = $3,
          role_match_score = $4,
          company_research_score = $5,
          practice_hours_score = $6,
          historical_performance_score = $7,
          factors_breakdown = $8,
          recommendations = $9,
          calculated_at = NOW(),
          last_updated = NOW()
        WHERE id = $10
        RETURNING *`,
        [
          probability,
          confidence,
          factors.preparation,
          factors.roleMatch,
          factors.companyResearch,
          factors.practiceHours,
          factors.historical,
          JSON.stringify(factorsBreakdown),
          JSON.stringify(recommendations),
          existing.rows[0].id,
        ]
      );
      return result.rows[0];
    } else {
      // Create new
      const predictionId = uuidv4();
      const result = await database.query(
        `INSERT INTO interview_success_predictions (
          id, user_id, job_opportunity_id,
          predicted_success_probability, confidence_score,
          preparation_score, role_match_score, company_research_score,
          practice_hours_score, historical_performance_score,
          factors_breakdown, recommendations,
          calculated_at, last_updated, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), NOW())
        RETURNING *`,
        [
          predictionId,
          userId,
          jobOpportunityId,
          probability,
          confidence,
          factors.preparation,
          factors.roleMatch,
          factors.companyResearch,
          factors.practiceHours,
          factors.historical,
          JSON.stringify(factorsBreakdown),
          JSON.stringify(recommendations),
        ]
      );
      return result.rows[0];
    }
  }

  /**
   * Save prediction to history
   */
  async saveToHistory(predictionId, probability, confidence, factorsBreakdown) {
    try {
      await database.query(
        `INSERT INTO prediction_history (
          prediction_id, probability, confidence_score, factors_snapshot, timestamp
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [predictionId, probability, confidence, JSON.stringify(factorsBreakdown)]
      );
    } catch (error) {
      console.error("Error saving to history:", error);
      // Don't throw - history is optional
    }
  }

  /**
   * Get existing prediction
   */
  async getPrediction(jobOpportunityId, userId) {
    try {
      const result = await database.query(
        `SELECT * FROM interview_success_predictions
         WHERE user_id = $1 AND job_opportunity_id = $2`,
        [userId, jobOpportunityId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        jobOpportunityId: row.job_opportunity_id,
        predictedSuccessProbability: parseFloat(row.predicted_success_probability),
        confidenceScore: parseFloat(row.confidence_score),
        preparationScore: parseFloat(row.preparation_score),
        roleMatchScore: parseFloat(row.role_match_score),
        companyResearchScore: parseFloat(row.company_research_score),
        practiceHoursScore: parseFloat(row.practice_hours_score),
        historicalPerformanceScore: parseFloat(row.historical_performance_score),
        factorsBreakdown: row.factors_breakdown || {},
        recommendations: row.recommendations || [],
        calculatedAt: row.calculated_at,
        lastUpdated: row.last_updated,
        actualOutcome: row.actual_outcome,
        predictionAccuracy: row.prediction_accuracy ? parseFloat(row.prediction_accuracy) : null,
      };
    } catch (error) {
      console.error("❌ Error getting prediction:", error);
      throw error;
    }
  }

  /**
   * Get predictions for multiple job opportunities (for comparison)
   */
  async comparePredictions(userId, jobOpportunityIds) {
    try {
      const placeholders = jobOpportunityIds.map((_, i) => `$${i + 2}`).join(",");
      const result = await database.query(
        `SELECT * FROM interview_success_predictions
         WHERE user_id = $1 AND job_opportunity_id IN (${placeholders})
         ORDER BY predicted_success_probability DESC`,
        [userId, ...jobOpportunityIds]
      );

      return result.rows.map((row) => ({
        id: row.id,
        jobOpportunityId: row.job_opportunity_id,
        predictedSuccessProbability: parseFloat(row.predicted_success_probability),
        confidenceScore: parseFloat(row.confidence_score),
        preparationScore: parseFloat(row.preparation_score),
        roleMatchScore: parseFloat(row.role_match_score),
        companyResearchScore: parseFloat(row.company_research_score),
        practiceHoursScore: parseFloat(row.practice_hours_score),
        historicalPerformanceScore: parseFloat(row.historical_performance_score),
        factorsBreakdown: row.factors_breakdown || {},
        recommendations: row.recommendations || [],
        calculatedAt: row.calculated_at,
      }));
    } catch (error) {
      console.error("❌ Error comparing predictions:", error);
      throw error;
    }
  }

  /**
   * Update actual outcome and calculate accuracy
   */
  async updateOutcome(jobOpportunityId, userId, outcome, outcomeDate = null) {
    try {
      const prediction = await this.getPrediction(jobOpportunityId, userId);
      if (!prediction) {
        throw new Error("Prediction not found");
      }

      const predicted = prediction.predictedSuccessProbability;
      let accuracy = null;

      // Calculate accuracy based on outcome
      if (outcome === "accepted") {
        // Positive accuracy if predicted high and got accepted
        accuracy = predicted - 50; // How much above/below 50% threshold
      } else if (outcome === "rejected") {
        // Negative accuracy if predicted high but got rejected
        accuracy = 50 - predicted; // Inverse of acceptance
      }

      const result = await database.query(
        `UPDATE interview_success_predictions SET
          actual_outcome = $1,
          outcome_date = $2,
          prediction_accuracy = $3,
          last_updated = NOW()
        WHERE user_id = $4 AND job_opportunity_id = $5
        RETURNING *`,
        [outcome, outcomeDate || new Date(), accuracy, userId, jobOpportunityId]
      );

      // Update accuracy metrics
      await this.updateAccuracyMetrics(userId);

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error updating outcome:", error);
      throw error;
    }
  }

  /**
   * Update aggregate accuracy metrics for user
   */
  async updateAccuracyMetrics(userId) {
    try {
      const result = await database.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN prediction_accuracy IS NOT NULL THEN 1 END) as with_accuracy,
          AVG(ABS(prediction_accuracy)) as avg_error
        FROM interview_success_predictions
        WHERE user_id = $1 AND actual_outcome IS NOT NULL`,
        [userId]
      );

      const stats = result.rows[0];
      const total = parseInt(stats.total);
      const withAccuracy = parseInt(stats.with_accuracy);
      const avgError = stats.avg_error ? parseFloat(stats.avg_error) : 0;

      // Calculate accurate predictions (within 20 points)
      const accurateResult = await database.query(
        `SELECT COUNT(*) as accurate
         FROM interview_success_predictions
         WHERE user_id = $1 
           AND actual_outcome IS NOT NULL
           AND ABS(prediction_accuracy) <= 20`,
        [userId]
      );
      const accurate = parseInt(accurateResult.rows[0].accurate);

      await database.query(
        `INSERT INTO prediction_accuracy_metrics (
          user_id, total_predictions, accurate_predictions, avg_error, last_calculated, updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          total_predictions = $2,
          accurate_predictions = $3,
          avg_error = $4,
          last_calculated = NOW(),
          updated_at = NOW()`,
        [userId, total, accurate, avgError]
      );
    } catch (error) {
      console.error("❌ Error updating accuracy metrics:", error);
      // Don't throw - metrics are optional
    }
  }

  /**
   * Recalculate all predictions for a user
   */
  async recalculateAll(userId) {
    try {
      // Get all active job opportunities
      const result = await database.query(
        `SELECT id FROM job_opportunities
         WHERE user_id = $1 
           AND status IN ('Applied', 'Interview', 'Offer', 'Pending')
         ORDER BY created_at DESC`,
        [userId]
      );

      const predictions = [];
      for (const row of result.rows) {
        try {
          const prediction = await this.calculateSuccessProbability(row.id, userId);
          predictions.push(prediction);
        } catch (error) {
          console.error(`Error calculating for job ${row.id}:`, error);
        }
      }

      return predictions;
    } catch (error) {
      console.error("❌ Error recalculating all predictions:", error);
      throw error;
    }
  }
}

export default new InterviewPredictionService();

