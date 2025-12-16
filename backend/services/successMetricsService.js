import database from "./database.js";

class SuccessMetricsService {
  /**
   * Calculate all success metrics for a user
   */
  async calculateSuccessMetrics(userId, period = null) {
    try {
      const responseRate = await this.getResponseRate(userId, period);
      const interviewConversion = await this.getInterviewConversionRate(userId, period);
      const offerRate = await this.getOfferRate(userId, period);
      const interviewToOffer = await this.getInterviewToOfferConversion(userId, period);

      // Get application counts
      const countsQuery = `
        SELECT 
          COUNT(*) as total_applications,
          COUNT(CASE WHEN status IN ('Phone Screen', 'Interview', 'Offer') THEN 1 END) as total_responses,
          COUNT(CASE WHEN status IN ('Interview', 'Offer') THEN 1 END) as total_interviews,
          COUNT(CASE WHEN status = 'Offer' THEN 1 END) as total_offers
        FROM job_opportunities
        WHERE user_id = $1
        ${period ? 'AND created_at >= $2' : ''}
      `;

      const countsParams = period ? [userId, period] : [userId];
      const countsResult = await database.query(countsQuery, countsParams);
      const counts = countsResult.rows[0];

      return {
        totalApplications: parseInt(counts.total_applications) || 0,
        totalResponses: parseInt(counts.total_responses) || 0,
        totalInterviews: parseInt(counts.total_interviews) || 0,
        totalOffers: parseInt(counts.total_offers) || 0,
        responseRate: parseFloat(responseRate) || 0,
        interviewConversionRate: parseFloat(interviewConversion) || 0,
        offerRate: parseFloat(offerRate) || 0,
        interviewToOfferConversion: parseFloat(interviewToOffer) || 0,
        overallSuccessRate: parseFloat(offerRate) || 0
      };
    } catch (error) {
      console.error("❌ Error calculating success metrics:", error);
      throw error;
    }
  }

  /**
   * Get response rate
   */
  async getResponseRate(userId, period = null) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_applications,
          COUNT(CASE WHEN status IN ('Phone Screen', 'Interview', 'Offer') THEN 1 END) as responses,
          ROUND(
            COUNT(CASE WHEN status IN ('Phone Screen', 'Interview', 'Offer') THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100,
            2
          ) as response_rate
        FROM job_opportunities
        WHERE user_id = $1
        ${period ? 'AND created_at >= $2' : ''}
      `;

      const params = period ? [userId, period] : [userId];
      const result = await database.query(query, params);
      return result.rows[0]?.response_rate || 0;
    } catch (error) {
      console.error("❌ Error getting response rate:", error);
      throw error;
    }
  }

  /**
   * Get interview conversion rate (interviews / responses)
   */
  async getInterviewConversionRate(userId, period = null) {
    try {
      const query = `
        SELECT 
          COUNT(CASE WHEN status IN ('Phone Screen', 'Interview', 'Offer') THEN 1 END) as responses,
          COUNT(CASE WHEN status IN ('Interview', 'Offer') THEN 1 END) as interviews,
          ROUND(
            COUNT(CASE WHEN status IN ('Interview', 'Offer') THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(CASE WHEN status IN ('Phone Screen', 'Interview', 'Offer') THEN 1 END), 0) * 100,
            2
          ) as interview_conversion_rate
        FROM job_opportunities
        WHERE user_id = $1
        ${period ? 'AND created_at >= $2' : ''}
      `;

      const params = period ? [userId, period] : [userId];
      const result = await database.query(query, params);
      return result.rows[0]?.interview_conversion_rate || 0;
    } catch (error) {
      console.error("❌ Error getting interview conversion rate:", error);
      throw error;
    }
  }

  /**
   * Get offer rate
   */
  async getOfferRate(userId, period = null) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_applications,
          COUNT(CASE WHEN status = 'Offer' THEN 1 END) as offers,
          ROUND(
            COUNT(CASE WHEN status = 'Offer' THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100,
            2
          ) as offer_rate
        FROM job_opportunities
        WHERE user_id = $1
        ${period ? 'AND created_at >= $2' : ''}
      `;

      const params = period ? [userId, period] : [userId];
      const result = await database.query(query, params);
      return result.rows[0]?.offer_rate || 0;
    } catch (error) {
      console.error("❌ Error getting offer rate:", error);
      throw error;
    }
  }

  /**
   * Get interview to offer conversion rate
   */
  async getInterviewToOfferConversion(userId, period = null) {
    try {
      const query = `
        SELECT 
          COUNT(CASE WHEN status IN ('Interview', 'Offer') THEN 1 END) as interviews,
          COUNT(CASE WHEN status = 'Offer' THEN 1 END) as offers,
          ROUND(
            COUNT(CASE WHEN status = 'Offer' THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(CASE WHEN status IN ('Interview', 'Offer') THEN 1 END), 0) * 100,
            2
          ) as interview_to_offer_rate
        FROM job_opportunities
        WHERE user_id = $1
        ${period ? 'AND created_at >= $2' : ''}
      `;

      const params = period ? [userId, period] : [userId];
      const result = await database.query(query, params);
      return result.rows[0]?.interview_to_offer_rate || 0;
    } catch (error) {
      console.error("❌ Error getting interview to offer conversion:", error);
      throw error;
    }
  }

  /**
   * Get trend data for a metric
   */
  async getTrendData(userId, metric, periodType = 'monthly', limit = 12) {
    try {
      // Get snapshots
      const snapshots = await this.getHistoricalSnapshots(userId, periodType, limit);

      // Extract metric values
      const trendData = snapshots.map(snapshot => ({
        date: snapshot.snapshot_date,
        value: this.getMetricFromSnapshot(snapshot, metric)
      }));

      return trendData;
    } catch (error) {
      console.error("❌ Error getting trend data:", error);
      throw error;
    }
  }

  /**
   * Create a metrics snapshot
   */
  async createSnapshot(userId, date, periodType = 'monthly') {
    try {
      // Calculate metrics for the period
      const metrics = await this.calculateSuccessMetrics(userId);

      // Get strategy breakdown
      const strategyBreakdown = await this.getStrategyBreakdown(userId, date);
      const documentPerformance = await this.getDocumentPerformanceBreakdown(userId, date);
      const timingAnalysis = await this.getTimingBreakdown(userId, date);
      const roleTypeBreakdown = await this.getRoleTypeBreakdown(userId, date);

      // Check if snapshot already exists
      const existingQuery = `
        SELECT id FROM success_metrics_snapshots
        WHERE user_id = $1 AND snapshot_date = $2 AND period_type = $3
      `;
      const existing = await database.query(existingQuery, [userId, date, periodType]);

      if (existing.rows.length > 0) {
        // Update existing snapshot
        const updateQuery = `
          UPDATE success_metrics_snapshots
          SET
            total_applications = $1,
            applications_this_period = $2,
            total_responses = $3,
            responses_this_period = $4,
            response_rate = $5,
            total_interviews = $6,
            interviews_this_period = $7,
            interview_rate = $8,
            interview_conversion_rate = $9,
            total_offers = $10,
            offers_this_period = $11,
            offer_rate = $12,
            offer_conversion_rate = $13,
            strategy_breakdown = $14,
            document_performance = $15,
            timing_analysis = $16,
            role_type_breakdown = $17
          WHERE user_id = $18 AND snapshot_date = $19 AND period_type = $20
          RETURNING *
        `;

        const result = await database.query(updateQuery, [
          metrics.totalApplications,
          metrics.totalApplications, // This would need period calculation
          metrics.totalResponses,
          metrics.totalResponses,
          metrics.responseRate,
          metrics.totalInterviews,
          metrics.totalInterviews,
          metrics.interviewConversionRate,
          metrics.interviewConversionRate,
          metrics.totalOffers,
          metrics.totalOffers,
          metrics.offerRate,
          metrics.interviewToOfferConversion,
          JSON.stringify(strategyBreakdown),
          JSON.stringify(documentPerformance),
          JSON.stringify(timingAnalysis),
          JSON.stringify(roleTypeBreakdown),
          userId,
          date,
          periodType
        ]);

        return result.rows[0];
      } else {
        // Create new snapshot
        const insertQuery = `
          INSERT INTO success_metrics_snapshots (
            user_id, snapshot_date, period_type,
            total_applications, applications_this_period,
            total_responses, responses_this_period, response_rate,
            total_interviews, interviews_this_period, interview_rate, interview_conversion_rate,
            total_offers, offers_this_period, offer_rate, offer_conversion_rate,
            strategy_breakdown, document_performance, timing_analysis, role_type_breakdown
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING *
        `;

        const result = await database.query(insertQuery, [
          userId,
          date,
          periodType,
          metrics.totalApplications,
          metrics.totalApplications,
          metrics.totalResponses,
          metrics.totalResponses,
          metrics.responseRate,
          metrics.totalInterviews,
          metrics.totalInterviews,
          metrics.interviewConversionRate,
          metrics.interviewConversionRate,
          metrics.totalOffers,
          metrics.totalOffers,
          metrics.offerRate,
          metrics.interviewToOfferConversion,
          JSON.stringify(strategyBreakdown),
          JSON.stringify(documentPerformance),
          JSON.stringify(timingAnalysis),
          JSON.stringify(roleTypeBreakdown)
        ]);

        return result.rows[0];
      }
    } catch (error) {
      console.error("❌ Error creating snapshot:", error);
      throw error;
    }
  }

  /**
   * Get historical snapshots
   */
  async getHistoricalSnapshots(userId, periodType = 'monthly', limit = 12) {
    try {
      const query = `
        SELECT *
        FROM success_metrics_snapshots
        WHERE user_id = $1 AND period_type = $2
        ORDER BY snapshot_date DESC
        LIMIT $3
      `;

      const result = await database.query(query, [userId, periodType, limit]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting historical snapshots:", error);
      throw error;
    }
  }

  /**
   * Helper methods for breakdowns
   */
  async getStrategyBreakdown(userId, date = null) {
    // Simplified - would need full implementation
    return {};
  }

  async getDocumentPerformanceBreakdown(userId, date = null) {
    // Simplified - would need full implementation
    return {};
  }

  async getTimingBreakdown(userId, date = null) {
    // Simplified - would need full implementation
    return {};
  }

  async getRoleTypeBreakdown(userId, date = null) {
    // Simplified - would need full implementation
    return {};
  }

  getMetricFromSnapshot(snapshot, metric) {
    const metricMap = {
      'response_rate': snapshot.response_rate,
      'interview_conversion_rate': snapshot.interview_conversion_rate,
      'offer_rate': snapshot.offer_rate,
      'interview_to_offer': snapshot.offer_conversion_rate
    };
    return metricMap[metric] || 0;
  }
}

export default new SuccessMetricsService();

