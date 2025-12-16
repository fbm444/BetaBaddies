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
   * Generate document-based recommendations
   */
  async generateDocumentRecommendations(userId) {
    try {
      const recommendations = [];

      // Check resume performance
      try {
        const resumeVersions = await documentPerformanceService.compareDocumentVersions(userId, 'resume');
        if (resumeVersions && resumeVersions.length > 1) {
          const sorted = resumeVersions.sort((a, b) => (parseFloat(b.offer_rate) || 0) - (parseFloat(a.offer_rate) || 0));
          const best = sorted[0];
          const second = sorted[1] || sorted[0];

          const bestRate = (parseFloat(best.offer_rate) || 0) / 100;
          const secondRate = (parseFloat(second.offer_rate) || 0) / 100;
          const bestUses = parseInt(best.total_uses) || 0;

          if (bestRate > secondRate * 1.15 && bestUses >= 2) {
            const improvement = ((bestRate - secondRate) / (secondRate || 0.01) * 100).toFixed(1);
            recommendations.push({
              recommendationType: 'document',
              category: 'Resume Optimization',
              priority: bestRate > secondRate * 1.3 ? 'high' : 'medium',
              title: `Switch to "${best.document_name || 'Best Performing Resume'}" as your primary resume`,
              description: `"${best.document_name || 'This version'}" has a ${(bestRate * 100).toFixed(1)}% offer rate compared to ${(secondRate * 100).toFixed(1)}% for other versions.`,
              reasoning: `Based on ${bestUses} applications, this resume version performs ${improvement}% better.`,
              actionItems: [
                `Set "${best.document_name}" as your primary resume`,
                `Use this version for future applications`,
                `Analyze what makes this version successful`
              ],
              expectedImpact: `Could improve offer rate by ${improvement}%`,
              estimatedImprovement: improvement,
              supportingData: {
                bestVersion: best.document_name,
                bestRate: bestRate,
                secondRate: secondRate,
                usageCount: bestUses,
                responseRate: (parseFloat(best.response_rate) || 0) / 100,
                interviewRate: (parseFloat(best.interview_rate) || 0) / 100
              }
            });
          }
        }
      } catch (err) {
        console.log("No resume data available for recommendations");
      }

      // Check cover letter performance
      try {
        const coverLetterVersions = await documentPerformanceService.compareDocumentVersions(userId, 'cover_letter');
        if (coverLetterVersions && coverLetterVersions.length > 1) {
          const sorted = coverLetterVersions.sort((a, b) => (parseFloat(b.offer_rate) || 0) - (parseFloat(a.offer_rate) || 0));
          const best = sorted[0];
          const second = sorted[1] || sorted[0];

          const bestRate = (parseFloat(best.offer_rate) || 0) / 100;
          const secondRate = (parseFloat(second.offer_rate) || 0) / 100;
          const bestUses = parseInt(best.total_uses) || 0;

          if (bestRate > secondRate * 1.15 && bestUses >= 2) {
            const improvement = ((bestRate - secondRate) / (secondRate || 0.01) * 100).toFixed(1);
            recommendations.push({
              recommendationType: 'document',
              category: 'Cover Letter Optimization',
              priority: 'medium',
              title: `Switch to "${best.document_name || 'Best Performing Cover Letter'}" as your primary cover letter`,
              description: `"${best.document_name || 'This version'}" shows ${(bestRate * 100).toFixed(1)}% offer rate vs ${(secondRate * 100).toFixed(1)}% for others.`,
              reasoning: `Based on ${bestUses} applications, this cover letter version performs ${improvement}% better.`,
              actionItems: [
                `Set "${best.document_name}" as your primary cover letter`,
                `Use this version for future applications`
              ],
              expectedImpact: `Could improve offer rate by ${improvement}%`,
              estimatedImprovement: improvement,
              supportingData: {
                bestVersion: best.document_name,
                bestRate: bestRate,
                secondRate: secondRate,
                usageCount: bestUses
              }
            });
          }
        }
      } catch (err) {
        console.log("No cover letter data available for recommendations");
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
      
      // Get timing analysis
      const optimalTiming = await timingAnalysisService.analyzeOptimalTiming(userId);
      const dayOfWeek = optimalTiming?.dayOfWeek || [];
      const hourOfDay = optimalTiming?.hourOfDay || [];
      
      if (dayOfWeek.length > 0) {
        const bestDay = dayOfWeek.reduce((best, current) => 
          (current.offerRate || 0) > (best.offerRate || 0) ? current : best
        );
        
        if (bestDay.offerRate > 0 && bestDay.applicationCount >= 3) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = dayNames[bestDay.dayOfWeek - 1] || `Day ${bestDay.dayOfWeek}`;
          
          recommendations.push({
            recommendationType: 'timing',
            category: 'Application Timing',
            priority: 'medium',
            title: `Apply more on ${dayName}s`,
            description: `Applications submitted on ${dayName}s show a ${(bestDay.offerRate * 100).toFixed(1)}% offer rate, which is higher than other days.`,
            reasoning: `Based on ${bestDay.applicationCount} applications, ${dayName} is your best performing day.`,
            actionItems: [
              `Schedule application submissions for ${dayName}s`,
              `Prepare applications earlier in the week to submit on ${dayName}`,
              `Track results to confirm this pattern`
            ],
            expectedImpact: 'medium',
            supportingData: {
              bestDay: dayName,
              offerRate: bestDay.offerRate,
              responseRate: bestDay.responseRate,
              applicationCount: bestDay.applicationCount
            }
          });
        }
      }
      
      if (hourOfDay.length > 0) {
        const bestHour = hourOfDay.reduce((best, current) =>
          (current.offerRate || 0) > (best.offerRate || 0) ? current : best
        );
        
        if (bestHour.offerRate > 0 && bestHour.applicationCount >= 3) {
          recommendations.push({
            recommendationType: 'timing',
            category: 'Application Timing',
            priority: 'low',
            title: `Submit applications around ${bestHour.hourOfDay}:00`,
            description: `Applications submitted at ${bestHour.hourOfDay}:00 show a ${(bestHour.offerRate * 100).toFixed(1)}% offer rate.`,
            reasoning: `Based on ${bestHour.applicationCount} applications, this time slot performs best.`,
            actionItems: [
              `Schedule application submissions for ${bestHour.hourOfDay}:00`,
              `Set reminders to submit at optimal times`
            ],
            expectedImpact: 'low',
            supportingData: {
              bestHour: bestHour.hourOfDay,
              offerRate: bestHour.offerRate,
              responseRate: bestHour.responseRate,
              applicationCount: bestHour.applicationCount
            }
          });
        }
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
    try {
      const recommendations = [];
      const roleTypeAnalysisService = (await import('./roleTypeAnalysisService.js')).default;
      const bestRoles = await roleTypeAnalysisService.getBestPerformingRoleTypes(userId, 3);
      
      if (bestRoles.length > 0) {
        const best = bestRoles[0];
        if (best.offerRate > 0.1 && best.applicationCount >= 3) {
          recommendations.push({
            recommendationType: 'role_type',
            category: 'Role Targeting',
            priority: 'medium',
            title: `Focus on ${best.roleType || 'your best performing role types'}`,
            description: `${best.roleType || 'This role type'} shows a ${(best.offerRate * 100).toFixed(1)}% offer rate with ${best.applicationCount} applications.`,
            reasoning: `This role type consistently performs better than others in your portfolio.`,
            actionItems: [
              `Apply to more ${best.roleType || 'similar'} positions`,
              `Tailor your applications to match this role type`,
              `Identify what makes you successful in these roles`
            ],
            expectedImpact: 'medium',
            supportingData: {
              roleType: best.roleType,
              offerRate: best.offerRate,
              responseRate: best.responseRate,
              applicationCount: best.applicationCount
            }
          });
        }
      }
      
      return recommendations;
    } catch (error) {
      console.error("❌ Error generating role type recommendations:", error);
      return [];
    }
  }

  /**
   * Create a recommendation
   */
  async createRecommendation(userId, recommendationData) {
    try {
      const {
        recommendationType,
        category,
        priority = 'medium',
        title,
        description,
        rationale,
        reasoning,
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

      // Include category in supporting_data if provided
      const finalSupportingData = {
        ...(supportingData || {}),
        ...(category ? { category } : {})
      };
      
      const insertQuery = `
        INSERT INTO optimization_recommendations (
          user_id, recommendation_type, priority, title, description, rationale,
          action_items, expected_impact, estimated_improvement,
          related_ab_test_id, supporting_data, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
        RETURNING *
      `;
      
      const insertParams = [
        userId,
        recommendationType,
        priority,
        title,
        description,
        rationale || reasoning || null,
        JSON.stringify(actionItems || []),
        expectedImpact || null,
        estimatedImprovement ? parseFloat(estimatedImprovement) : null,
        relatedAbTestId || null,
        Object.keys(finalSupportingData).length > 0 ? JSON.stringify(finalSupportingData) : null
      ];

      const result = await database.query(insertQuery, insertParams);

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error creating recommendation:", error);
      throw error;
    }
  }

  /**
   * Get recommendations for a user (auto-generates if none exist)
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
      
      // If no recommendations exist, generate them automatically
      if (result.rows.length === 0) {
        try {
          await this.generateRecommendations(userId);
          // Fetch again after generation
          const newResult = await database.query(query, params);
          return this.formatRecommendations(newResult.rows);
        } catch (genError) {
          console.error("❌ Error auto-generating recommendations:", genError);
          // Return empty array if generation fails
          return [];
        }
      }
      
      return this.formatRecommendations(result.rows);
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
   * Format recommendations for frontend
   */
  formatRecommendations(rows) {
    return rows.map(row => {
      const supportingData = typeof row.supporting_data === 'string' 
        ? JSON.parse(row.supporting_data) 
        : row.supporting_data;
      
      return {
        ...row,
        category: supportingData?.category || null,
        supportingData: supportingData,
        supporting_data: supportingData, // Keep both for compatibility
        actionItems: typeof row.action_items === 'string' 
          ? JSON.parse(row.action_items) 
          : row.action_items,
        reasoning: row.rationale, // Map rationale to reasoning for frontend
      };
    });
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

