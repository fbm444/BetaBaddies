import database from "./database.js";

class TimingAnalysisService {
  /**
   * Analyze optimal timing for applications
   */
  async analyzeOptimalTiming(userId) {
    try {
      const dayOfWeek = await this.getDayOfWeekPerformance(userId);
      const hourOfDay = await this.getHourOfDayPerformance(userId);
      const timeOfDay = await this.getTimeOfDayPerformance(userId);

      // Find best performing times
      const bestDay = dayOfWeek.length > 0 
        ? dayOfWeek.reduce((best, current) => 
            (current.offer_rate || 0) > (best.offer_rate || 0) ? current : best
          )
        : null;

      const bestHour = hourOfDay.length > 0
        ? hourOfDay.reduce((best, current) =>
            (current.offer_rate || 0) > (best.offer_rate || 0) ? current : best
          )
        : null;

      const bestTimeOfDay = timeOfDay.length > 0
        ? timeOfDay.reduce((best, current) =>
            (current.offer_rate || 0) > (best.offer_rate || 0) ? current : best
          )
        : null;

      return {
        dayOfWeek,
        hourOfDay,
        timeOfDay,
        recommendations: {
          bestDay: bestDay ? {
            day: bestDay.day_of_week,
            dayName: this.getDayName(bestDay.day_of_week),
            offerRate: bestDay.offer_rate,
            responseRate: bestDay.response_rate
          } : null,
          bestHour: bestHour ? {
            hour: bestHour.hour_of_day,
            offerRate: bestHour.offer_rate,
            responseRate: bestHour.response_rate
          } : null,
          bestTimeOfDay: bestTimeOfDay ? {
            timeOfDay: bestTimeOfDay.time_of_day,
            offerRate: bestTimeOfDay.offer_rate,
            responseRate: bestTimeOfDay.response_rate
          } : null
        }
      };
    } catch (error) {
      console.error("❌ Error analyzing optimal timing:", error);
      throw error;
    }
  }

  /**
   * Get performance by day of week
   */
  async getDayOfWeekPerformance(userId) {
    try {
      const query = `
        SELECT 
          s.day_of_week,
          COUNT(DISTINCT s.job_opportunity_id) as total_applications,
          COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END) as responses,
          COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN s.job_opportunity_id END) as interviews,
          COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END) as offers,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as response_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as offer_rate
        FROM application_strategies s
        JOIN job_opportunities jo ON s.job_opportunity_id = jo.id
        WHERE s.user_id = $1 AND s.day_of_week IS NOT NULL
        GROUP BY s.day_of_week
        ORDER BY s.day_of_week
      `;

      const result = await database.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting day of week performance:", error);
      throw error;
    }
  }

  /**
   * Get performance by hour of day
   */
  async getHourOfDayPerformance(userId) {
    try {
      const query = `
        SELECT 
          s.hour_of_day,
          COUNT(DISTINCT s.job_opportunity_id) as total_applications,
          COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END) as responses,
          COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END) as offers,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as response_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as offer_rate
        FROM application_strategies s
        JOIN job_opportunities jo ON s.job_opportunity_id = jo.id
        WHERE s.user_id = $1 AND s.hour_of_day IS NOT NULL
        GROUP BY s.hour_of_day
        ORDER BY s.hour_of_day
      `;

      const result = await database.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting hour of day performance:", error);
      throw error;
    }
  }

  /**
   * Get performance by time of day category
   */
  async getTimeOfDayPerformance(userId) {
    try {
      const query = `
        SELECT 
          s.time_of_day,
          COUNT(DISTINCT s.job_opportunity_id) as total_applications,
          COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END) as responses,
          COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END) as offers,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as response_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as offer_rate
        FROM application_strategies s
        JOIN job_opportunities jo ON s.job_opportunity_id = jo.id
        WHERE s.user_id = $1 AND s.time_of_day IS NOT NULL
        GROUP BY s.time_of_day
        ORDER BY 
          CASE s.time_of_day
            WHEN 'morning' THEN 1
            WHEN 'afternoon' THEN 2
            WHEN 'evening' THEN 3
            WHEN 'night' THEN 4
          END
      `;

      const result = await database.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting time of day performance:", error);
      throw error;
    }
  }

  /**
   * Get timing performance with filters
   */
  async getTimingPerformance(userId, filters = {}) {
    try {
      let query = `
        SELECT 
          s.day_of_week,
          s.hour_of_day,
          s.time_of_day,
          COUNT(DISTINCT s.job_opportunity_id) as total_applications,
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
        GROUP BY s.day_of_week, s.hour_of_day, s.time_of_day
        ORDER BY offer_rate DESC NULLS LAST
      `;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting timing performance:", error);
      throw error;
    }
  }

  /**
   * Get timing recommendations
   */
  async getTimingRecommendations(userId) {
    try {
      const analysis = await this.analyzeOptimalTiming(userId);
      const recommendations = [];

      if (analysis.recommendations.bestDay) {
        recommendations.push({
          type: 'day_of_week',
          priority: 'high',
          title: `Apply on ${analysis.recommendations.bestDay.dayName}s`,
          description: `Your applications submitted on ${analysis.recommendations.bestDay.dayName}s have a ${analysis.recommendations.bestDay.offerRate}% offer rate, which is higher than other days.`,
          actionItems: [
            `Schedule application submissions for ${analysis.recommendations.bestDay.dayName}s`,
            `Prepare applications earlier in the week to submit on ${analysis.recommendations.bestDay.dayName}s`
          ],
          expectedImpact: 'medium'
        });
      }

      if (analysis.recommendations.bestTimeOfDay) {
        recommendations.push({
          type: 'time_of_day',
          priority: 'medium',
          title: `Apply during ${analysis.recommendations.bestTimeOfDay.timeOfDay}`,
          description: `Applications submitted during ${analysis.recommendations.bestTimeOfDay.timeOfDay} show better results.`,
          actionItems: [
            `Submit applications during ${analysis.recommendations.bestTimeOfDay.timeOfDay} hours`,
            `Set reminders to submit applications at optimal times`
          ],
          expectedImpact: 'low'
        });
      }

      return recommendations;
    } catch (error) {
      console.error("❌ Error getting timing recommendations:", error);
      throw error;
    }
  }

  /**
   * Helper to get day name from day number
   */
  getDayName(dayOfWeek) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }
}

export default new TimingAnalysisService();

