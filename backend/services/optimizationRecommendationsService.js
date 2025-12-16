import database from "./database.js";
import applicationStrategyService from "./applicationStrategyService.js";
import documentPerformanceService from "./documentPerformanceService.js";
import timingAnalysisService from "./timingAnalysisService.js";

class OptimizationRecommendationsService {
  /**
   * Generate all recommendations for a user
   */
  async generateRecommendations(userId) {
    try {
      const recommendations = [];

      // Strategy recommendations
      const strategyRecs = await this.generateStrategyRecommendations(userId);
      recommendations.push(...strategyRecs);

      // Document recommendations
      const documentRecs = await this.generateDocumentRecommendations(userId);
      recommendations.push(...documentRecs);

      // Timing recommendations
      const timingRecs = await this.generateTimingRecommendations(userId);
      recommendations.push(...timingRecs);

      // Role type recommendations
      const roleTypeRecs = await this.generateRoleTypeRecommendations(userId);
      recommendations.push(...roleTypeRecs);

      // Save recommendations
      for (const rec of recommendations) {
        await this.createRecommendation(userId, rec);
      }

      return recommendations;
    } catch (error) {
      console.error("❌ Error generating recommendations:", error);
      throw error;
    }
  }

  /**
   * Generate strategy-based recommendations
   */
  async generateStrategyRecommendations(userId) {
    try {
      const recommendations = [];
      const bestStrategies = await applicationStrategyService.getBestPerformingStrategies(userId, 3);
      const allPerformance = await applicationStrategyService.getStrategyPerformance(userId);

      if (bestStrategies.length > 0) {
        const best = bestStrategies[0];
        const avgOfferRate = allPerformance.reduce((sum, s) => sum + (s.offer_rate || 0), 0) / allPerformance.length;

        if (best.offer_rate > avgOfferRate * 1.2) {
          recommendations.push({
            recommendationType: 'strategy',
            priority: 'high',
            title: `Focus on ${best.application_method} applications`,
            description: `Your ${best.application_method} applications have a ${best.offer_rate}% offer rate, which is significantly higher than your average. Consider increasing your use of this method.`,
            rationale: `Based on ${best.total_applications} applications, ${best.application_method} shows ${((best.offer_rate / avgOfferRate - 1) * 100).toFixed(0)}% better performance than average.`,
            actionItems: [
              `Increase applications via ${best.application_method}`,
              `Identify what makes ${best.application_method} successful for you`,
              `Replicate successful elements in other application methods`
            ],
            expectedImpact: 'high',
            estimatedImprovement: ((best.offer_rate - avgOfferRate) / avgOfferRate * 100).toFixed(1)
          });
        }
      }

      return recommendations;
    } catch (error) {
      console.error("❌ Error generating strategy recommendations:", error);
      return [];
    }
  }

  /**
   * Generate document-based recommendations
   */
  async generateDocumentRecommendations(userId) {
    try {
      const recommendations = [];

      // Check resume performance
      const resumeVersions = await documentPerformanceService.compareDocumentVersions(userId, 'resume');
      if (resumeVersions.length > 1) {
        const sorted = resumeVersions.sort((a, b) => (b.offer_rate || 0) - (a.offer_rate || 0));
        const best = sorted[0];
        const second = sorted[1];

        if (best.offer_rate > (second.offer_rate || 0) * 1.15 && best.total_uses >= 5) {
          if (!best.is_primary) {
            recommendations.push({
              recommendationType: 'document',
              priority: 'high',
              title: `Switch to ${best.document_name} as your primary resume`,
              description: `${best.document_name} has a ${best.offer_rate}% offer rate compared to ${second.offer_rate || 0}% for your current primary resume.`,
              rationale: `Based on ${best.total_uses} uses, this version performs significantly better.`,
              actionItems: [
                `Set ${best.document_name} as your primary resume`,
                `Use this version for future applications`
              ],
              expectedImpact: 'medium',
              estimatedImprovement: ((best.offer_rate - (second.offer_rate || 0)) / (second.offer_rate || 1) * 100).toFixed(1)
            });
          }
        }
      }

      // Check cover letter performance
      const coverLetterVersions = await documentPerformanceService.compareDocumentVersions(userId, 'cover_letter');
      if (coverLetterVersions.length > 1) {
        const sorted = coverLetterVersions.sort((a, b) => (b.offer_rate || 0) - (a.offer_rate || 0));
        const best = sorted[0];
        const second = sorted[1];

        if (best.offer_rate > (second.offer_rate || 0) * 1.15 && best.total_uses >= 5) {
          if (!best.is_primary) {
            recommendations.push({
              recommendationType: 'document',
              priority: 'medium',
              title: `Switch to ${best.document_name} as your primary cover letter`,
              description: `${best.document_name} shows better performance.`,
              rationale: `Based on ${best.total_uses} uses, this version performs better.`,
              actionItems: [
                `Set ${best.document_name} as your primary cover letter`
              ],
              expectedImpact: 'medium',
              estimatedImprovement: ((best.offer_rate - (second.offer_rate || 0)) / (second.offer_rate || 1) * 100).toFixed(1)
            });
          }
        }
      }

      return recommendations;
    } catch (error) {
      console.error("❌ Error generating document recommendations:", error);
      return [];
    }
  }

  /**
   * Generate timing-based recommendations
   */
  async generateTimingRecommendations(userId) {
    try {
      const recommendations = [];
      const timingRecs = await timingAnalysisService.getTimingRecommendations(userId);

      for (const rec of timingRecs) {
        recommendations.push({
          recommendationType: 'timing',
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          actionItems: rec.actionItems,
          expectedImpact: rec.expectedImpact
        });
      }

      return recommendations;
    } catch (error) {
      console.error("❌ Error generating timing recommendations:", error);
      return [];
    }
  }

  /**
   * Generate role type recommendations
   */
  async generateRoleTypeRecommendations(userId) {
    // Placeholder - would need role type analysis service
    return [];
  }

  /**
   * Create a recommendation
   */
  async createRecommendation(userId, recommendationData) {
    try {
      const {
        recommendationType,
        priority = 'medium',
        title,
        description,
        rationale,
        actionItems = [],
        expectedImpact,
        estimatedImprovement,
        relatedAbTestId,
        supportingData
      } = recommendationData;

      // Check if similar recommendation already exists
      const existingQuery = `
        SELECT id FROM optimization_recommendations
        WHERE user_id = $1 AND title = $2 AND status = 'pending'
      `;
      const existing = await database.query(existingQuery, [userId, title]);

      if (existing.rows.length > 0) {
        return existing.rows[0].id;
      }

      const insertQuery = `
        INSERT INTO optimization_recommendations (
          user_id, recommendation_type, priority, title, description, rationale,
          action_items, expected_impact, estimated_improvement,
          related_ab_test_id, supporting_data, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
        RETURNING *
      `;

      const result = await database.query(insertQuery, [
        userId,
        recommendationType,
        priority,
        title,
        description,
        rationale || null,
        JSON.stringify(actionItems),
        expectedImpact || null,
        estimatedImprovement ? parseFloat(estimatedImprovement) : null,
        relatedAbTestId || null,
        supportingData ? JSON.stringify(supportingData) : null
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error creating recommendation:", error);
      throw error;
    }
  }

  /**
   * Get recommendations for a user
   */
  async getRecommendations(userId, filters = {}) {
    try {
      let query = `
        SELECT *
        FROM optimization_recommendations
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.priority) {
        paramCount++;
        query += ` AND priority = $${paramCount}`;
        params.push(filters.priority);
      }

      if (filters.recommendationType) {
        paramCount++;
        query += ` AND recommendation_type = $${paramCount}`;
        params.push(filters.recommendationType);
      }

      query += ` ORDER BY 
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        created_at DESC
      `;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting recommendations:", error);
      throw error;
    }
  }

  /**
   * Acknowledge a recommendation
   */
  async acknowledgeRecommendation(recommendationId, userId) {
    try {
      const query = `
        UPDATE optimization_recommendations
        SET 
          status = 'in_progress',
          acknowledged_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [recommendationId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error acknowledging recommendation:", error);
      throw error;
    }
  }

  /**
   * Complete a recommendation
   */
  async completeRecommendation(recommendationId, userId) {
    try {
      const query = `
        UPDATE optimization_recommendations
        SET 
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [recommendationId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error completing recommendation:", error);
      throw error;
    }
  }

  /**
   * Dismiss a recommendation
   */
  async dismissRecommendation(recommendationId, userId) {
    try {
      const query = `
        UPDATE optimization_recommendations
        SET 
          status = 'dismissed',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [recommendationId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error dismissing recommendation:", error);
      throw error;
    }
  }
}

export default new OptimizationRecommendationsService();

