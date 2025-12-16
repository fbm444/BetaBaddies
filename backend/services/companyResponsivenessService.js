import database from "./database.js";

class CompanyResponsivenessService {
  /**
   * Calculate responsiveness score for a company
   * Score ranges from 0.0 to 1.0
   * Higher score = more responsive company
   */
  async calculateResponsivenessScore(userId, companyName) {
    try {
      const query = `
        SELECT 
          total_follow_ups_sent,
          total_responses_received,
          average_response_time_hours,
          response_rate,
          responsiveness_score
        FROM company_responsiveness_tracking
        WHERE user_id = $1 AND company_name = $2
      `;

      const result = await database.query(query, [userId, companyName]);

      if (result.rows.length === 0) {
        // No data yet, return default score
        return 0.5;
      }

      const metrics = result.rows[0];

      // If we have enough data, use existing score
      if (metrics.total_follow_ups_sent >= 2) {
        return parseFloat(metrics.responsiveness_score || 0.5);
      }

      // Calculate score for new companies
      return this.calculateScoreFromMetrics(metrics);
    } catch (error) {
      console.error("❌ Error calculating responsiveness score:", error);
      return 0.5; // Default to neutral
    }
  }

  /**
   * Calculate score from metrics
   */
  calculateScoreFromMetrics(metrics) {
    const responseRate = metrics.total_follow_ups_sent > 0
      ? metrics.total_responses_received / metrics.total_follow_ups_sent
      : 0;

    const avgResponseTime = parseFloat(metrics.average_response_time_hours || 168); // Default to 1 week

    // Faster responses = higher score
    let timeScore = 0.5; // Default neutral
    if (avgResponseTime < 24) {
      timeScore = 1.0; // Very responsive (< 1 day)
    } else if (avgResponseTime < 72) {
      timeScore = 0.7; // Responsive (< 3 days)
    } else if (avgResponseTime < 168) {
      timeScore = 0.4; // Moderate (1 week)
    } else {
      timeScore = 0.2; // Slow (> 1 week)
    }

    // Combine response rate (60%) and time score (40%)
    const finalScore = (responseRate * 0.6) + (timeScore * 0.4);

    return Math.max(0, Math.min(1, finalScore)); // Clamp between 0 and 1
  }

  /**
   * Update response metrics when a response is received
   */
  async updateResponseMetrics(userId, companyName, responseTimeHours, responseType = 'neutral') {
    try {
      // Get or create tracking record
      const getQuery = `
        SELECT * FROM company_responsiveness_tracking
        WHERE user_id = $1 AND company_name = $2
      `;
      const getResult = await database.query(getQuery, [userId, companyName]);

      if (getResult.rows.length === 0) {
        // Create new record
        const insertQuery = `
          INSERT INTO company_responsiveness_tracking (
            user_id, company_name, total_follow_ups_sent,
            total_responses_received, average_response_time_hours,
            last_response_received_at, updated_at
          ) VALUES ($1, $2, 0, 1, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `;
        await database.query(insertQuery, [userId, companyName, responseTimeHours]);
      } else {
        // Update existing record
        const existing = getResult.rows[0];
        const newTotalResponses = existing.total_responses_received + 1;
        const newTotalFollowUps = existing.total_follow_ups_sent || 0;

        // Calculate new average response time
        const currentAvg = parseFloat(existing.average_response_time_hours || responseTimeHours);
        const newAvg = ((currentAvg * existing.total_responses_received) + responseTimeHours) / newTotalResponses;

        // Calculate new response rate
        const responseRate = newTotalFollowUps > 0
          ? (newTotalResponses / newTotalFollowUps) * 100
          : 0;

        // Calculate new responsiveness score
        const newScore = this.calculateScoreFromMetrics({
          total_follow_ups_sent: newTotalFollowUps,
          total_responses_received: newTotalResponses,
          average_response_time_hours: newAvg,
          response_rate: responseRate
        });

        // Calculate recommended frequency
        const recommendedFrequency = this.getRecommendedFollowUpFrequency(newScore);

        const updateQuery = `
          UPDATE company_responsiveness_tracking
          SET 
            total_responses_received = $1,
            average_response_time_hours = $2,
            response_rate = $3,
            responsiveness_score = $4,
            preferred_follow_up_frequency_days = $5,
            last_response_received_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $6 AND company_name = $7
        `;

        await database.query(updateQuery, [
          newTotalResponses,
          newAvg,
          responseRate,
          newScore,
          recommendedFrequency,
          userId,
          companyName
        ]);
      }

      console.log(`✅ Updated responsiveness metrics for ${companyName}`);
    } catch (error) {
      console.error("❌ Error updating response metrics:", error);
      throw error;
    }
  }

  /**
   * Record that a follow-up was sent
   */
  async recordFollowUpSent(userId, companyName) {
    try {
      const getQuery = `
        SELECT * FROM company_responsiveness_tracking
        WHERE user_id = $1 AND company_name = $2
      `;
      const getResult = await database.query(getQuery, [userId, companyName]);

      if (getResult.rows.length === 0) {
        // Create new record
        const insertQuery = `
          INSERT INTO company_responsiveness_tracking (
            user_id, company_name, total_follow_ups_sent,
            last_follow_up_sent_at, updated_at
          ) VALUES ($1, $2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        await database.query(insertQuery, [userId, companyName]);
      } else {
        // Update existing record
        const existing = getResult.rows[0];
        const newTotal = (existing.total_follow_ups_sent || 0) + 1;

        const updateQuery = `
          UPDATE company_responsiveness_tracking
          SET 
            total_follow_ups_sent = $1,
            last_follow_up_sent_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2 AND company_name = $3
        `;

        await database.query(updateQuery, [newTotal, userId, companyName]);
      }
    } catch (error) {
      console.error("❌ Error recording follow-up sent:", error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Get recommended follow-up frequency based on responsiveness score
   */
  getRecommendedFollowUpFrequency(responsivenessScore) {
    if (responsivenessScore > 0.7) {
      return 5; // Responsive companies: check in more frequently
    } else if (responsivenessScore > 0.4) {
      return 7; // Average: standard frequency
    } else {
      return 10; // Less responsive: space out follow-ups
    }
  }

  /**
   * Get responsiveness data for a company
   */
  async getCompanyResponsiveness(userId, companyName) {
    try {
      const query = `
        SELECT * FROM company_responsiveness_tracking
        WHERE user_id = $1 AND company_name = $2
      `;

      const result = await database.query(query, [userId, companyName]);

      if (result.rows.length === 0) {
        return {
          responsivenessScore: 0.5,
          recommendedFrequency: 7,
          totalFollowUps: 0,
          totalResponses: 0,
          responseRate: 0,
          averageResponseTime: null
        };
      }

      const data = result.rows[0];
      return {
        responsivenessScore: parseFloat(data.responsiveness_score || 0.5),
        recommendedFrequency: data.preferred_follow_up_frequency_days || 7,
        totalFollowUps: data.total_follow_ups_sent || 0,
        totalResponses: data.total_responses_received || 0,
        responseRate: parseFloat(data.response_rate || 0),
        averageResponseTime: data.average_response_time_hours ? parseFloat(data.average_response_time_hours) : null,
        lastFollowUpSent: data.last_follow_up_sent_at,
        lastResponseReceived: data.last_response_received_at
      };
    } catch (error) {
      console.error("❌ Error getting company responsiveness:", error);
      throw error;
    }
  }
}

export default new CompanyResponsivenessService();

