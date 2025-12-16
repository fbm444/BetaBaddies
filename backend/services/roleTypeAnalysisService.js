import database from "./database.js";

class RoleTypeAnalysisService {
  /**
   * Get performance by role type
   */
  async getRoleTypePerformance(userId) {
    try {
      const query = `
        SELECT 
          jo.title as role_title,
          jo.job_type,
          jo.industry,
          COUNT(DISTINCT jo.id) as total_applications,
          COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN jo.id END) as responses,
          COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN jo.id END) as interviews,
          COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN jo.id END) as offers,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN jo.id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT jo.id), 0) * 100,
            2
          ) as response_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN jo.id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN jo.id END), 0) * 100,
            2
          ) as interview_conversion_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN jo.id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT jo.id), 0) * 100,
            2
          ) as offer_rate
        FROM job_opportunities jo
        WHERE jo.user_id = $1
        GROUP BY jo.title, jo.job_type, jo.industry
        HAVING COUNT(DISTINCT jo.id) >= 2
        ORDER BY offer_rate DESC NULLS LAST, response_rate DESC NULLS LAST
      `;

      const result = await database.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting role type performance:", error);
      throw error;
    }
  }

  /**
   * Get best performing role types
   */
  async getBestPerformingRoleTypes(userId, limit = 5) {
    try {
      const query = `
        SELECT 
          jo.title as role_title,
          jo.job_type,
          jo.industry,
          COUNT(DISTINCT jo.id) as total_applications,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN jo.id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT jo.id), 0) * 100,
            2
          ) as offer_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN jo.id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT jo.id), 0) * 100,
            2
          ) as response_rate
        FROM job_opportunities jo
        WHERE jo.user_id = $1
        GROUP BY jo.title, jo.job_type, jo.industry
        HAVING COUNT(DISTINCT jo.id) >= 3
        ORDER BY offer_rate DESC NULLS LAST, response_rate DESC NULLS LAST
        LIMIT $2
      `;

      const result = await database.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting best performing role types:", error);
      throw error;
    }
  }

  /**
   * Get role type recommendations
   */
  async getRoleTypeRecommendations(userId) {
    try {
      const bestRoles = await this.getBestPerformingRoleTypes(userId, 3);
      const allPerformance = await this.getRoleTypePerformance(userId);

      if (bestRoles.length === 0) {
        return [];
      }

      const recommendations = [];
      const avgOfferRate = allPerformance.reduce((sum, r) => sum + (r.offer_rate || 0), 0) / allPerformance.length;

      if (bestRoles[0] && bestRoles[0].offer_rate > avgOfferRate * 1.2) {
        const best = bestRoles[0];
        recommendations.push({
          type: 'role_type',
          priority: 'medium',
          title: `Focus on ${best.role_title || best.job_type} roles`,
          description: `Your applications for ${best.role_title || best.job_type} roles have a ${best.offer_rate}% offer rate, which is significantly higher than your average.`,
          actionItems: [
            `Search for more ${best.role_title || best.job_type} positions`,
            `Tailor your applications to match this role type`,
            `Consider similar roles in the same industry`
          ],
          expectedImpact: 'medium'
        });
      }

      return recommendations;
    } catch (error) {
      console.error("❌ Error getting role type recommendations:", error);
      return [];
    }
  }

  /**
   * Analyze role type trends
   */
  async analyzeRoleTypeTrends(userId) {
    try {
      const query = `
        SELECT 
          jo.title as role_title,
          jo.job_type,
          DATE_TRUNC('month', jo.created_at) as month,
          COUNT(DISTINCT jo.id) as applications,
          COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN jo.id END) as offers,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN jo.id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT jo.id), 0) * 100,
            2
          ) as offer_rate
        FROM job_opportunities jo
        WHERE jo.user_id = $1
          AND jo.created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY jo.title, jo.job_type, DATE_TRUNC('month', jo.created_at)
        ORDER BY month DESC, offer_rate DESC
      `;

      const result = await database.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error analyzing role type trends:", error);
      throw error;
    }
  }
}

export default new RoleTypeAnalysisService();

