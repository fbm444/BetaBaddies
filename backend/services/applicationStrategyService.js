import database from "./database.js";

class ApplicationStrategyService {
  /**
   * Track application strategy for a job opportunity
   */
  async trackApplicationStrategy(userId, jobOpportunityId, strategyData) {
    try {
      const {
        applicationMethod,
        applicationChannel,
        referralSource,
        recruiterName,
        resumeVersionId,
        coverLetterVersionId,
        resumeTemplate,
        coverLetterTemplate,
        applicationTimestamp,
        customizationLevel = 'standard',
        personalizedElements = [],
        abTestId,
        abTestGroup
      } = strategyData;

      // Validate required fields
      if (!applicationMethod) {
        throw new Error("applicationMethod is required");
      }

      const insertQuery = `
        INSERT INTO application_strategies (
          user_id, job_opportunity_id,
          application_method, application_channel, referral_source, recruiter_name,
          resume_version_id, cover_letter_version_id, resume_template, cover_letter_template,
          application_timestamp, customization_level, personalized_elements,
          ab_test_id, ab_test_group
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const result = await database.query(insertQuery, [
        userId,
        jobOpportunityId,
        applicationMethod,
        applicationChannel || null,
        referralSource || null,
        recruiterName || null,
        resumeVersionId || null,
        coverLetterVersionId || null,
        resumeTemplate || null,
        coverLetterTemplate || null,
        applicationTimestamp || new Date(),
        customizationLevel,
        personalizedElements.length > 0 ? personalizedElements : null,
        abTestId || null,
        abTestGroup || null
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error tracking application strategy:", error);
      throw error;
    }
  }

  /**
   * Get strategy performance metrics
   */
  async getStrategyPerformance(userId, filters = {}) {
    try {
      let query = `
        SELECT 
          s.application_method,
          s.application_channel,
          s.customization_level,
          s.time_of_day,
          s.day_of_week,
          COUNT(DISTINCT s.job_opportunity_id) as total_applications,
          COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END) as total_responses,
          COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN s.job_opportunity_id END) as total_interviews,
          COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END) as total_offers,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100, 
            2
          ) as response_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END), 0) * 100,
            2
          ) as interview_conversion_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as offer_rate
        FROM application_strategies s
        JOIN job_opportunities jo ON s.job_opportunity_id = jo.id
        WHERE s.user_id = $1
      `;

      const params = [userId];
      let paramCount = 1;

      if (filters.applicationMethod) {
        paramCount++;
        query += ` AND s.application_method = $${paramCount}`;
        params.push(filters.applicationMethod);
      }

      if (filters.startDate) {
        paramCount++;
        query += ` AND s.application_timestamp >= $${paramCount}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        paramCount++;
        query += ` AND s.application_timestamp <= $${paramCount}`;
        params.push(filters.endDate);
      }

      query += `
        GROUP BY s.application_method, s.application_channel, s.customization_level, s.time_of_day, s.day_of_week
        ORDER BY offer_rate DESC NULLS LAST, response_rate DESC NULLS LAST
      `;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting strategy performance:", error);
      throw error;
    }
  }

  /**
   * Get best performing strategies
   */
  async getBestPerformingStrategies(userId, limit = 5) {
    try {
      let query = `
        SELECT 
          s.application_method,
          s.application_channel,
          COUNT(DISTINCT s.job_opportunity_id) as total_applications,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as offer_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as response_rate
        FROM application_strategies s
        JOIN job_opportunities jo ON s.job_opportunity_id = jo.id
        WHERE s.user_id = $1
        GROUP BY s.application_method, s.application_channel
        HAVING COUNT(DISTINCT s.job_opportunity_id) >= 3
        ORDER BY offer_rate DESC NULLS LAST, response_rate DESC NULLS LAST
        LIMIT $2
      `;

      let result = await database.query(query, [userId, limit]);
      
      // If no results, try to derive from job_opportunities directly
      if (result.rows.length === 0) {
        // Check if application_method or application_source column exists
        const columnCheck = await database.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'job_opportunities' 
          AND column_name IN ('application_method', 'application_source')
          LIMIT 1
        `);
        
        if (columnCheck.rows.length > 0) {
          const colName = columnCheck.rows[0].column_name;
          query = `
            SELECT 
              COALESCE(jo.${colName}, 'direct') as application_method,
              NULL as application_channel,
              COUNT(DISTINCT jo.id) as total_applications,
              COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN jo.id END) as responses,
              COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN jo.id END) as interviews,
              COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN jo.id END) as offers,
              ROUND(
                COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN jo.id END)::DECIMAL / 
                NULLIF(COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN jo.id END), 0) * 100,
                2
              ) as interview_conversion_rate,
              ROUND(
                COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN jo.id END)::DECIMAL / 
                NULLIF(COUNT(DISTINCT jo.id), 0) * 100,
                2
              ) as offer_rate,
              ROUND(
                COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN jo.id END)::DECIMAL / 
                NULLIF(COUNT(DISTINCT jo.id), 0) * 100,
                2
              ) as response_rate,
              false as has_referral
            FROM job_opportunities jo
            WHERE jo.user_id = $1
            GROUP BY jo.${colName}
            HAVING COUNT(DISTINCT jo.id) >= 2
            ORDER BY offer_rate DESC NULLS LAST, response_rate DESC NULLS LAST
            LIMIT $2
          `;
          result = await database.query(query, [userId, limit]);
        }
      }
      
      return result.rows.map(row => ({
        id: `${row.application_method}_${row.application_channel || 'default'}`,
        applicationMethod: row.application_method,
        applicationChannel: row.application_channel,
        applicationCount: parseInt(row.total_applications) || 0,
        responseRate: (parseFloat(row.response_rate) || 0) / 100,
        interviewRate: (parseFloat(row.interview_conversion_rate) || 0) / 100,
        offerRate: (parseFloat(row.offer_rate) || 0) / 100,
        hasReferral: row.has_referral || false
      }));
    } catch (error) {
      console.error("❌ Error getting best performing strategies:", error);
      throw error;
    }
  }

  /**
   * Compare two strategies
   */
  async compareStrategies(userId, strategy1, strategy2) {
    try {
      const query = `
        WITH strategy1_stats AS (
          SELECT 
            COUNT(DISTINCT s.job_opportunity_id) as applications,
            COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END) as responses,
            COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN s.job_opportunity_id END) as interviews,
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END) as offers
          FROM application_strategies s
          JOIN job_opportunities jo ON s.job_opportunity_id = jo.id
          WHERE s.user_id = $1
            AND s.application_method = $2
            ${strategy1.channel ? 'AND s.application_channel = $3' : ''}
        ),
        strategy2_stats AS (
          SELECT 
            COUNT(DISTINCT s.job_opportunity_id) as applications,
            COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END) as responses,
            COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN s.job_opportunity_id END) as interviews,
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END) as offers
          FROM application_strategies s
          JOIN job_opportunities jo ON s.job_opportunity_id = jo.id
          WHERE s.user_id = $1
            AND s.application_method = $4
            ${strategy2.channel ? 'AND s.application_channel = $5' : ''}
        )
        SELECT 
          'strategy1' as strategy_name,
          s1.*,
          ROUND(s1.responses::DECIMAL / NULLIF(s1.applications, 0) * 100, 2) as response_rate,
          ROUND(s1.offers::DECIMAL / NULLIF(s1.applications, 0) * 100, 2) as offer_rate
        FROM strategy1_stats s1
        UNION ALL
        SELECT 
          'strategy2' as strategy_name,
          s2.*,
          ROUND(s2.responses::DECIMAL / NULLIF(s2.applications, 0) * 100, 2) as response_rate,
          ROUND(s2.offers::DECIMAL / NULLIF(s2.applications, 0) * 100, 2) as offer_rate
        FROM strategy2_stats s2
      `;

      const params = [userId, strategy1.method];
      if (strategy1.channel) params.push(strategy1.channel);
      params.push(strategy2.method);
      if (strategy2.channel) params.push(strategy2.channel);

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("❌ Error comparing strategies:", error);
      throw error;
    }
  }

  /**
   * Get strategy for a specific job opportunity
   */
  async getStrategyByJobOpportunity(userId, jobOpportunityId) {
    try {
      const query = `
        SELECT *
        FROM application_strategies
        WHERE user_id = $1 AND job_opportunity_id = $2
        LIMIT 1
      `;

      const result = await database.query(query, [userId, jobOpportunityId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Error getting strategy by job opportunity:", error);
      throw error;
    }
  }

  /**
   * Update application strategy
   */
  async updateStrategy(strategyId, userId, updateData) {
    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (updateData.applicationMethod) {
        updates.push(`application_method = $${paramCount++}`);
        values.push(updateData.applicationMethod);
      }

      if (updateData.applicationChannel !== undefined) {
        updates.push(`application_channel = $${paramCount++}`);
        values.push(updateData.applicationChannel);
      }

      if (updateData.customizationLevel) {
        updates.push(`customization_level = $${paramCount++}`);
        values.push(updateData.customizationLevel);
      }

      if (updateData.resumeVersionId !== undefined) {
        updates.push(`resume_version_id = $${paramCount++}`);
        values.push(updateData.resumeVersionId);
      }

      if (updateData.coverLetterVersionId !== undefined) {
        updates.push(`cover_letter_version_id = $${paramCount++}`);
        values.push(updateData.coverLetterVersionId);
      }

      if (updates.length === 0) {
        throw new Error("No fields to update");
      }

      values.push(strategyId, userId);
      paramCount += 2;

      const query = `
        UPDATE application_strategies
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount - 1} AND user_id = $${paramCount}
        RETURNING *
      `;

      const result = await database.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error updating strategy:", error);
      throw error;
    }
  }
}

export default new ApplicationStrategyService();

