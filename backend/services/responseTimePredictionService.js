import database from "./database.js";

class ResponseTimePredictionService {
  /**
   * Predict response time window and follow-up suggestion for a single job
   */
  async predictForJob(userId, jobId) {
    // Get job details including title and company size (if tracked)
    const jobResult = await database.query(
      `
        SELECT 
          jo.id,
          jo.title,
          jo.industry,
          jo.job_type,
          jo.application_submitted_at,
          jo.created_at,
          ci.size AS company_size
        FROM job_opportunities jo
        LEFT JOIN company_info ci ON ci.job_id = jo.id
        WHERE jo.id = $1 AND jo.user_id = $2
        LIMIT 1
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

    const jobLevel = this.inferJobLevel(job.title);

    // Cohort: same industry + job_type (+ company size when available)
    const stats = await this.getCohortStats(userId, {
      industry: job.industry,
      jobType: job.job_type,
      companySize: job.company_size || null,
    });

    if (!stats || !stats.count || parseInt(stats.count, 10) === 0) {
      // Fallback to global user stats
      const globalStats = await this.getCohortStats(userId, {});
      if (!globalStats || !globalStats.count || parseInt(globalStats.count, 10) === 0) {
        return null;
      }
      return this.buildPrediction(globalStats, appliedAt, null, jobLevel, job.company_size || null);
    }

    return this.buildPrediction(
      stats,
      appliedAt,
      {
        industry: job.industry,
        jobType: job.job_type,
        companySize: job.company_size || null,
      },
      jobLevel,
      job.company_size || null
    );
  }

  /**
   * Infer rough job level based on title text
   */
  inferJobLevel(title) {
    if (!title) return null;
    const t = title.toLowerCase();
    if (t.includes("intern")) return "intern";
    if (t.includes("junior") || t.includes("jr")) return "junior";
    if (t.includes("senior") || t.includes("sr")) return "senior";
    if (t.includes("lead") || t.includes("principal")) return "lead";
    if (t.includes("director") || t.includes("vp") || t.includes("chief")) return "executive";
    return "mid";
  }

  /**
   * Get cohort stats (average, percentiles) for response times
   * Filters by industry, job type, and (when present) company size.
   */
  async getCohortStats(userId, filters) {
    const conditions = [
      "jo.user_id = $1",
      "jo.application_submitted_at IS NOT NULL",
      "jo.first_response_at IS NOT NULL",
    ];
    const params = [userId];
    let idx = 2;

    if (filters.industry) {
      conditions.push(`jo.industry = $${idx}`);
      params.push(filters.industry);
      idx++;
    }

    if (filters.jobType) {
      conditions.push(`jo.job_type = $${idx}`);
      params.push(filters.jobType);
      idx++;
    }

    if (filters.companySize) {
      conditions.push(`ci.size = $${idx}`);
      params.push(filters.companySize);
      idx++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      WITH response_times AS (
        SELECT
          EXTRACT(EPOCH FROM (jo.first_response_at - jo.application_submitted_at)) / 86400.0 AS days
        FROM job_opportunities jo
        LEFT JOIN company_info ci ON ci.job_id = jo.id
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

  /**
   * Build prediction object, including overdue flags and confidence window.
   */
  buildPrediction(stats, appliedAt, cohortInfo, jobLevel, companySize) {
    const count = parseInt(stats.count, 10) || 0;
    const avgDays = stats.avg_days != null ? parseFloat(stats.avg_days) : 0;
    const p10 = stats.p10 != null ? parseFloat(stats.p10) : 0;
    const p80 = stats.p80 != null ? parseFloat(stats.p80) : 0;
    const p90 = stats.p90 != null ? parseFloat(stats.p90) : 0;

    // Confidence window (approx 80% in P10–P80)
    let lowerDays = Math.max(0, Math.round(p10));
    let upperDays = Math.max(lowerDays + 1, Math.round(p80 || p90 || avgDays || 0));

    const appliedDate = new Date(appliedAt);

    // Seasonality adjustment: simple holiday / fiscal-year-end bump (Dec/Jan)
    const month = appliedDate.getMonth(); // 0-11
    if (month === 11 || month === 0) {
      lowerDays += 1;
      upperDays += 2;
    }

    // Day-of-week adjustment: Friday/Saturday submissions tend to respond later
    const dow = appliedDate.getDay(); // 0=Sun..6=Sat
    if (dow === 5 || dow === 6) {
      lowerDays += 0;
      upperDays += 1;
    }

    const followUpDays = upperDays + 2; // suggest follow-up a bit after upper bound
    const followUpDate = new Date(
      appliedDate.getTime() + followUpDays * 24 * 60 * 60 * 1000
    );

    const now = new Date();
    const daysSinceApplied = (now.getTime() - appliedDate.getTime()) / (24 * 60 * 60 * 1000);
    const isOverdue = daysSinceApplied > upperDays;
    const overdueDays = isOverdue ? Math.max(0, daysSinceApplied - upperDays) : 0;

    return {
      sampleSize: count,
      avgDays,
      lowerDays,
      upperDays,
      confidence: 0.8,
      appliedAt,
      recommendedFollowUpDays: followUpDays,
      recommendedFollowUpDate: followUpDate.toISOString(),
      cohort: cohortInfo
        ? {
            ...cohortInfo,
            jobLevel: jobLevel || null,
          }
        : null,
      companySize: companySize || null,
      daysSinceApplied,
      isOverdue,
      overdueDays,
    };
  }

  /**
   * Benchmarks for dashboard (by industry and job type)
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