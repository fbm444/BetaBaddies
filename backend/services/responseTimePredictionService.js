import database from "./database.js";

class ResponseTimePredictionService {
  /**
   * Predict response time window and follow-up suggestion for a single job
   */
  async predictForJob(userId, jobId) {
    // Get job details
    const jobResult = await database.query(
      `
        SELECT id, industry, job_type, application_submitted_at, created_at
        FROM job_opportunities
        WHERE id = $1 AND user_id = $2
      `,
      [jobId, userId]
    );

    if (jobResult.rows.length === 0) {
      throw new Error("Job opportunity not found");
    }

    const job = jobResult.rows[0];
    const appliedAt = job.application_submitted_at || job.created_at;
    if (!appliedAt) {
      return null;
    }

    // Cohort: same industry + job_type
    const stats = await this.getCohortStats(userId, {
      industry: job.industry,
      jobType: job.job_type,
    });

    if (!stats || !stats.count || parseInt(stats.count) === 0) {
      // Fallback to global user stats
      const globalStats = await this.getCohortStats(userId, {});
      if (!globalStats || !globalStats.count || parseInt(globalStats.count) === 0) {
        return null;
      }
      return this.buildPrediction(globalStats, appliedAt, null);
    }

    return this.buildPrediction(stats, appliedAt, {
      industry: job.industry,
      jobType: job.job_type,
    });
  }

  /**
   * Get cohort stats (average, percentiles) for response times
   */
  async getCohortStats(userId, filters) {
    const conditions = [
      "user_id = $1",
      "application_submitted_at IS NOT NULL",
      "first_response_at IS NOT NULL",
    ];
    const params = [userId];
    let idx = 2;

    if (filters.industry) {
      conditions.push(`industry = $${idx}`);
      params.push(filters.industry);
      idx++;
    }

    if (filters.jobType) {
      conditions.push(`job_type = $${idx}`);
      params.push(filters.jobType);
      idx++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      WITH response_times AS (
        SELECT
          EXTRACT(EPOCH FROM (first_response_at - application_submitted_at)) / 86400.0 AS days
        FROM job_opportunities
        ${whereClause}
      )
      SELECT
        COUNT(*) AS count,
        AVG(days) AS avg_days,
        PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY days) AS p10,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days) AS median,
        PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY days) AS p80,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY days) AS p90
      FROM response_times
      WHERE days IS NOT NULL
    `;

    const result = await database.query(query, params);
    return result.rows[0];
  }

  buildPrediction(stats, appliedAt, cohortInfo) {
    const count = parseInt(stats.count) || 0;
    const avgDays = parseFloat(stats.avg_days) || 0;
    const p10 = parseFloat(stats.p10) || 0;
    const p80 = parseFloat(stats.p80) || 0;
    const p90 = parseFloat(stats.p90) || 0;

    const lowerDays = Math.max(0, p10);
    const upperDays = p80 || p90 || avgDays || 0;

    const appliedDate = new Date(appliedAt);
    const followUpDays = upperDays + 1; // simple buffer
    const followUpDate = new Date(
      appliedDate.getTime() + followUpDays * 24 * 60 * 60 * 1000
    );

    return {
      sampleSize: count,
      avgDays,
      lowerDays,
      upperDays,
      confidence: 0.8,
      appliedAt,
      recommendedFollowUpDays: followUpDays,
      recommendedFollowUpDate: followUpDate.toISOString(),
      cohort: cohortInfo || null,
    };
  }

  /**
   * Benchmarks for dashboard
   */
  async getBenchmarks(userId) {
    const query = `
      SELECT
        industry,
        job_type,
        COUNT(*) AS count,
        AVG(EXTRACT(EPOCH FROM (first_response_at - application_submitted_at)) / 86400.0) AS avg_days
      FROM job_opportunities
      WHERE user_id = $1
        AND application_submitted_at IS NOT NULL
        AND first_response_at IS NOT NULL
        AND industry IS NOT NULL
      GROUP BY industry, job_type
      ORDER BY count DESC
      LIMIT 20
    `;

    const result = await database.query(query, [userId]);
    return result.rows;
  }
}

export default new ResponseTimePredictionService();