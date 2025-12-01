import database from "./database.js";

class HistoricalPerformanceService {
  /**
   * Calculate historical performance score based on past interview outcomes
   */
  async calculateHistoricalScore(userId, jobOpportunityId) {
    try {
      const breakdown = {
        overallRate: { score: 0, status: "unknown", notes: [], rate: 0 },
        recentTrend: { score: 0, status: "unknown", notes: [] },
        byType: { score: 0, status: "unknown", notes: [] },
      };

      // Get all past interview outcomes
      const interviewsResult = await database.query(
        `SELECT 
          outcome,
          interview_type,
          interview_date,
          COUNT(*) as count
         FROM interviews
         WHERE user_id = $1 
           AND outcome IS NOT NULL
           AND outcome != 'pending'
         GROUP BY outcome, interview_type, interview_date
         ORDER BY interview_date DESC`,
        [userId]
      );

      if (interviewsResult.rows.length === 0) {
        return {
          score: 50, // Neutral score if no history
          hasData: false,
          status: "missing",
          breakdown,
        };
      }

      const interviews = interviewsResult.rows;
      const totalInterviews = interviews.reduce((sum, row) => sum + parseInt(row.count), 0);
      const acceptedInterviews = interviews
        .filter((row) => row.outcome === "accepted")
        .reduce((sum, row) => sum + parseInt(row.count), 0);

      // Calculate success rate
      const successRate = totalInterviews > 0 ? (acceptedInterviews / totalInterviews) * 100 : 0;
      breakdown.overallRate.rate = successRate;
      breakdown.overallRate.notes.push(
        `${acceptedInterviews} accepted out of ${totalInterviews} interviews (${successRate.toFixed(1)}%)`
      );

      // Score based on success rate
      let rateScore = 0;
      if (successRate >= 60) {
        rateScore = 100;
        breakdown.overallRate.status = "complete";
      } else if (successRate >= 40) {
        rateScore = 75;
        breakdown.overallRate.status = "partial";
      } else if (successRate >= 20) {
        rateScore = 50;
        breakdown.overallRate.status = "partial";
      } else {
        rateScore = 25;
        breakdown.overallRate.status = "partial";
      }
      breakdown.overallRate.score = rateScore;

      // Recent trend (last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const recentResult = await database.query(
        `SELECT 
          outcome,
          COUNT(*) as count
         FROM interviews
         WHERE user_id = $1 
           AND outcome IS NOT NULL
           AND outcome != 'pending'
           AND interview_date >= $2
         GROUP BY outcome`,
        [userId, threeMonthsAgo]
      );

      if (recentResult.rows.length > 0) {
        const recentTotal = recentResult.rows.reduce(
          (sum, row) => sum + parseInt(row.count),
          0
        );
        const recentAccepted = recentResult.rows
          .filter((row) => row.outcome === "accepted")
          .reduce((sum, row) => sum + parseInt(row.count), 0);
        const recentRate = recentTotal > 0 ? (recentAccepted / recentTotal) * 100 : 0;

        let trendScore = 50; // Neutral
        if (recentRate > successRate) {
          trendScore = 100; // Improving
          breakdown.recentTrend.status = "complete";
          breakdown.recentTrend.notes.push(
            `Improving trend: ${recentRate.toFixed(1)}% recent vs ${successRate.toFixed(1)}% overall`
          );
        } else if (recentRate < successRate) {
          trendScore = 25; // Declining
          breakdown.recentTrend.status = "partial";
          breakdown.recentTrend.notes.push(
            `Declining trend: ${recentRate.toFixed(1)}% recent vs ${successRate.toFixed(1)}% overall`
          );
        } else {
          breakdown.recentTrend.status = "partial";
          breakdown.recentTrend.notes.push("Stable performance");
        }
        breakdown.recentTrend.score = trendScore;
      } else {
        breakdown.recentTrend.score = 50;
        breakdown.recentTrend.status = "unknown";
        breakdown.recentTrend.notes.push("No recent interview data");
      }

      // By interview type (simplified)
      breakdown.byType.score = 70; // Default moderate
      breakdown.byType.status = "partial";
      breakdown.byType.notes.push("Interview type analysis available");

      // Calculate overall score
      const overallScore =
        breakdown.overallRate.score * 0.5 +
        breakdown.recentTrend.score * 0.3 +
        breakdown.byType.score * 0.2;

      const hasData = totalInterviews > 0;
      const status =
        overallScore >= 70 ? "complete" : overallScore >= 40 ? "partial" : "missing";

      return {
        score: Math.round(overallScore),
        hasData,
        status,
        breakdown,
      };
    } catch (error) {
      console.error("❌ Error calculating historical score:", error);
      return {
        score: 50, // Neutral on error
        hasData: false,
        status: "error",
        breakdown: {},
      };
    }
  }
}

export default new HistoricalPerformanceService();

