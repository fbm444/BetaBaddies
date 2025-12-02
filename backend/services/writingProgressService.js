import database from "./database.js";
import writingFeedbackService from "./writingFeedbackService.js";

class WritingProgressService {
  // Calculate progress metrics for a user
  async calculateProgressMetrics(userId, dateRange = {}) {
    const { startDate, endDate } = dateRange;

    let query = `
      SELECT 
        AVG(f.clarity_score) as clarity_avg,
        AVG(f.professionalism_score) as professionalism_avg,
        AVG(f.structure_score) as structure_avg,
        AVG(f.storytelling_score) as storytelling_avg,
        AVG(f.overall_score) as overall_avg,
        COUNT(*) as session_count
      FROM writing_feedback f
      JOIN writing_practice_sessions s ON f.session_id = s.id
      WHERE s.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND s.session_date >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND s.session_date <= $${paramIndex++}`;
      params.push(endDate);
    }

    const result = await database.query(query, params);
    const row = result.rows[0];

    return {
      clarityAvg: parseFloat(row.clarity_avg) || 0,
      professionalismAvg: parseFloat(row.professionalism_avg) || 0,
      structureAvg: parseFloat(row.structure_avg) || 0,
      storytellingAvg: parseFloat(row.storytelling_avg) || 0,
      overallAvg: parseFloat(row.overall_avg) || 0,
      sessionCount: parseInt(row.session_count) || 0,
    };
  }

  // Get progress trend for a specific metric
  async getProgressTrend(userId, metric, period = "month") {
    let dateTrunc = "month";
    if (period === "week") dateTrunc = "week";
    if (period === "day") dateTrunc = "day";

    const metricMap = {
      clarity: "clarity_score",
      professionalism: "professionalism_score",
      structure: "structure_score",
      storytelling: "storytelling_score",
      overall: "overall_score",
    };

    const metricColumn = metricMap[metric] || "overall_score";

    // For overall_score, calculate from individual scores if not in feedback
    // For other metrics, use session's direct score or feedback score
    let scoreExpression;
    if (metricColumn === "overall_score") {
      // Calculate overall as average of the 4 component scores if not in feedback
      scoreExpression = `COALESCE(
        f.overall_score,
        (s.clarity_score + s.professionalism_score + s.structure_score + s.storytelling_score)::float / 4.0
      )`;
    } else {
      // Use feedback score if available, otherwise session's direct score
      scoreExpression = `COALESCE(f.${metricColumn}, s.${metricColumn})`;
    }
    
    const result = await database.query(
      `SELECT 
        DATE_TRUNC($1, s.session_date)::timestamp as period,
        AVG(${scoreExpression}) as avg_score,
        COUNT(DISTINCT s.id) as session_count
      FROM writing_practice_sessions s
      LEFT JOIN writing_feedback f ON f.session_id = s.id
      WHERE s.user_id = $2
        AND s.is_completed = true
        AND (
          ${metricColumn === "overall_score" 
            ? "(f.overall_score IS NOT NULL OR (s.clarity_score IS NOT NULL AND s.professionalism_score IS NOT NULL AND s.structure_score IS NOT NULL AND s.storytelling_score IS NOT NULL))"
            : `(f.${metricColumn} IS NOT NULL OR s.${metricColumn} IS NOT NULL)`}
        )
      GROUP BY DATE_TRUNC($1, s.session_date)
      ORDER BY period ASC`,
      [dateTrunc, userId]
    );

    return result.rows.map((row) => {
      // Format period as ISO string to ensure consistent date parsing across timezones
      const periodDate = row.period instanceof Date 
        ? row.period 
        : new Date(row.period);
      return {
        period: periodDate.toISOString(),
        avgScore: row.avg_score ? parseFloat(row.avg_score) : 0,
        sessionCount: parseInt(row.session_count) || 0,
      };
    });
  }

  // Update progress tracking (called after feedback generation)
  async updateProgressTracking(userId, sessionId) {
    // Calculate current period metrics
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const metrics = await this.calculateProgressMetrics(userId, {
      startDate: periodStart,
      endDate: periodEnd,
    });

    // Update or insert progress tracking
    const metricsToTrack = [
      { name: "clarity_avg", value: metrics.clarityAvg },
      { name: "professionalism_avg", value: metrics.professionalismAvg },
      { name: "structure_avg", value: metrics.structureAvg },
      { name: "storytelling_avg", value: metrics.storytellingAvg },
      { name: "overall_avg", value: metrics.overallAvg },
    ];

    for (const metric of metricsToTrack) {
      // Check if entry exists for this period
      const existing = await database.query(
        `SELECT id FROM writing_progress_tracking
         WHERE user_id = $1 AND metric_name = $2 AND period_start = $3 AND period_end = $4`,
        [userId, metric.name, periodStart, periodEnd]
      );

      if (existing.rows.length > 0) {
        // Update existing entry
        await database.query(
          `UPDATE writing_progress_tracking
           SET metric_value = $1, session_count = $2
           WHERE user_id = $3 AND metric_name = $4 AND period_start = $5 AND period_end = $6`,
          [metric.value, metrics.sessionCount, userId, metric.name, periodStart, periodEnd]
        );
      } else {
        // Insert new entry
        await database.query(
          `INSERT INTO writing_progress_tracking (
            user_id, metric_name, metric_value, session_count, period_start, period_end
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId,
            metric.name,
            metric.value,
            metrics.sessionCount,
            periodStart,
            periodEnd,
          ]
        );
      }
    }
  }

  // Get progress insights (AI-generated)
  async getProgressInsights(userId) {
    const trends = await Promise.all([
      this.getProgressTrend(userId, "overall", "month"),
      this.getProgressTrend(userId, "clarity", "month"),
      this.getProgressTrend(userId, "professionalism", "month"),
      this.getProgressTrend(userId, "structure", "month"),
      this.getProgressTrend(userId, "storytelling", "month"),
    ]);

    const currentMetrics = await this.calculateProgressMetrics(userId);

    // Simple insights (can be enhanced with AI later)
    const insights = [];
    
    if (trends[0].length >= 2) {
      const recent = trends[0][trends[0].length - 1];
      const previous = trends[0][trends[0].length - 2];
      if (recent.avgScore > previous.avgScore) {
        insights.push(`Your overall score improved from ${previous.avgScore.toFixed(1)} to ${recent.avgScore.toFixed(1)} this month!`);
      }
    }

    const lowestMetric = [
      { name: "Clarity", value: currentMetrics.clarityAvg },
      { name: "Professionalism", value: currentMetrics.professionalismAvg },
      { name: "Structure", value: currentMetrics.structureAvg },
      { name: "Storytelling", value: currentMetrics.storytellingAvg },
    ].sort((a, b) => a.value - b.value)[0];

    if (lowestMetric.value < 7) {
      insights.push(`Focus on improving your ${lowestMetric.name.toLowerCase()} - it's your area with the most potential for growth.`);
    }

    return {
      insights,
      currentMetrics,
      trends: {
        overall: trends[0],
        clarity: trends[1],
        professionalism: trends[2],
        structure: trends[3],
        storytelling: trends[4],
      },
    };
  }
}

export default new WritingProgressService();

