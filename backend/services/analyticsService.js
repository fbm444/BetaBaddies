/**
 * Comprehensive Analytics Service
 * Provides analytics for UC-096 through UC-101
 */

import database from "./database.js";

class AnalyticsService {
  constructor() {
    // Industry benchmark data (placeholder - can be enhanced with real data)
    this.industryBenchmarks = {
      responseRate: 15, // Average response rate percentage
      interviewRate: 5, // Average interview rate percentage
      offerRate: 2, // Average offer rate percentage
      timeToResponse: 7, // Average days to first response
      timeToInterview: 14, // Average days from application to interview
      timeToOffer: 45, // Average days from application to offer
    };
    
    // Cache column existence checks
    this.columnCache = {};
  }

  // Helper to check if column exists
  async columnExists(tableName, columnName) {
    const cacheKey = `${tableName}.${columnName}`;
    if (this.columnCache[cacheKey] !== undefined) {
      return this.columnCache[cacheKey];
    }

    try {
      const query = `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1 
          AND column_name = $2
        ) as exists;
      `;
      const result = await database.query(query, [tableName, columnName]);
      const exists = result.rows[0]?.exists || false;
      this.columnCache[cacheKey] = exists;
      return exists;
    } catch (error) {
      console.warn(`Error checking column ${tableName}.${columnName}:`, error);
      return false;
    }
  }

  // ============================================
  // UC-096: Job Search Performance Dashboard
  // ============================================

  /**
   * Get comprehensive job search performance metrics
   */
  async getJobSearchPerformance(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      // Build date filter for queries
      let dateFilter = "";
      const queryParams = [userId];
      if (startDate) {
        dateFilter += " AND created_at >= $" + (queryParams.length + 1);
        queryParams.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND created_at <= $" + (queryParams.length + 1);
        queryParams.push(endDate + " 23:59:59");
      }

      // Key metrics query - applications_sent should be CUMULATIVE (all that have been applied to)
      // Count ALL opportunities where status is beyond 'Interested' OR application_submitted_at is not null
      const hasSubmittedAt = await this.columnExists("job_opportunities", "application_submitted_at");
      const applicationsSentCondition = hasSubmittedAt 
        ? `(status != 'Interested' OR application_submitted_at IS NOT NULL)`
        : `status IN ('Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected')`;
      
      const metricsQuery = `
        SELECT 
          COUNT(*) as total_opportunities,
          COUNT(CASE WHEN ${applicationsSentCondition} THEN 1 END) as applications_sent,
          COUNT(CASE WHEN status IN ('Phone Screen', 'Interview') THEN 1 END) as interviews_scheduled,
          COUNT(CASE WHEN status = 'Offer' THEN 1 END) as offers_received,
          COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejections,
          COUNT(CASE WHEN status = 'Interested' THEN 1 END) as interested
        FROM job_opportunities
        WHERE user_id = $1 AND (archived = false OR archived IS NULL) ${dateFilter}
      `;

      const metricsResult = await database.query(metricsQuery, queryParams);
      const metrics = metricsResult.rows[0];

      // Calculate conversion rates - applications sent is CUMULATIVE (all applied)
      const applicationsSent = parseInt(metrics.applications_sent) || 0;
      const interviewsScheduled = parseInt(metrics.interviews_scheduled) || 0;
      const offersReceived = parseInt(metrics.offers_received) || 0;

      const applicationToInterviewRate =
        applicationsSent > 0
          ? Math.round((interviewsScheduled / applicationsSent) * 100 * 10) / 10
          : 0;
      const interviewToOfferRate =
        interviewsScheduled > 0
          ? Math.round((offersReceived / interviewsScheduled) * 100 * 10) / 10
          : 0;
      // Overall success rate: offers / applications (cumulative)
      const overallSuccessRate =
        applicationsSent > 0
          ? Math.round((offersReceived / applicationsSent) * 100 * 10) / 10
          : 0;

      // Time-to-response metrics - check if columns exist first
      let avgDaysToResponse = null;
      let responsesReceived = 0;
      const hasTimeColumns = await Promise.all([
        this.columnExists("job_opportunities", "first_response_at"),
        this.columnExists("job_opportunities", "application_submitted_at"),
      ]);

      if (hasTimeColumns[0] && hasTimeColumns[1]) {
        try {
          const timeToResponseQuery = `
            SELECT 
              AVG(EXTRACT(EPOCH FROM (first_response_at - application_submitted_at)) / 86400) as avg_days_to_response,
              COUNT(CASE WHEN first_response_at IS NOT NULL THEN 1 END) as responses_received
            FROM job_opportunities
            WHERE user_id = $1 
              AND (archived = false OR archived IS NULL)
              AND application_submitted_at IS NOT NULL
              ${dateFilter}
          `;

          const timeToResponseResult = await database.query(
            timeToResponseQuery,
            queryParams
          );
          const timeToResponse = timeToResponseResult.rows[0];
          if (timeToResponse?.avg_days_to_response) {
            avgDaysToResponse = Math.round(timeToResponse.avg_days_to_response * 10) / 10;
          }
          responsesReceived = parseInt(timeToResponse?.responses_received || 0);
        } catch (error) {
          console.warn("Error calculating time to response:", error.message);
        }
      }

      // Time-to-interview metrics
      let avgDaysToInterview = null;
      let interviewsScheduledCount = 0;
      const hasInterviewColumn = await this.columnExists("job_opportunities", "interview_scheduled_at");
      
      if (hasInterviewColumn && hasTimeColumns[1]) {
        try {
          const timeToInterviewQuery = `
            SELECT 
              AVG(EXTRACT(EPOCH FROM (interview_scheduled_at - application_submitted_at)) / 86400) as avg_days_to_interview,
              COUNT(CASE WHEN interview_scheduled_at IS NOT NULL THEN 1 END) as interviews_scheduled_count
            FROM job_opportunities
            WHERE user_id = $1 
              AND (archived = false OR archived IS NULL)
              AND application_submitted_at IS NOT NULL
              ${dateFilter}
          `;

          const timeToInterviewResult = await database.query(
            timeToInterviewQuery,
            queryParams
          );
          const timeToInterview = timeToInterviewResult.rows[0];
          if (timeToInterview?.avg_days_to_interview) {
            avgDaysToInterview = Math.round(timeToInterview.avg_days_to_interview * 10) / 10;
          }
          interviewsScheduledCount = parseInt(timeToInterview?.interviews_scheduled_count || 0);
        } catch (error) {
          console.warn("Error calculating time to interview:", error.message);
        }
      }

      // Monthly volume trends - count applications sent per month (not just created)
      const monthlyVolume = await this.getMonthlyVolume(userId, startDate, endDate, applicationsSentCondition);

      // Get time investment metrics (cumulative hours from time logs)
      const timeInvestment = await this.getTimeInvestmentMetrics(userId, dateRange);

      // Calculate efficiency metrics
      const efficiencyMetrics = this.calculateEfficiencyMetrics({
        applicationsSent,
        totalHours: timeInvestment.totalHours,
        interviewsScheduled,
        offersReceived,
      });

      // Calculate dynamic industry benchmarks based on actual data
      const industryBenchmarks = await this.calculateDynamicBenchmarks(userId, dateRange, {
        applicationsSent,
        interviewsScheduled,
        offersReceived,
        responsesReceived,
        avgDaysToResponse,
        avgDaysToInterview,
      });

      return {
        keyMetrics: {
          totalApplications: parseInt(metrics.total_opportunities) || 0,
          applicationsSent, // CUMULATIVE: all opportunities that have been applied to
          interviewsScheduled,
          offersReceived,
          rejections: parseInt(metrics.rejections) || 0,
          interested: parseInt(metrics.interested) || 0,
        },
        conversionRates: {
          applicationToInterview: applicationToInterviewRate,
          interviewToOffer: interviewToOfferRate,
          overallSuccess: overallSuccessRate, // Cumulative: offers/applications
        },
        timeMetrics: {
          avgDaysToResponse,
          responsesReceived,
          avgDaysToInterview,
          interviewsScheduledCount,
          ...timeInvestment, // Add cumulative time investment
        },
        efficiencyMetrics, // Add efficiency metrics
        monthlyVolume,
        benchmarks: industryBenchmarks, // Use dynamic benchmarks
      };
    } catch (error) {
      console.error("❌ Error getting job search performance:", error);
      throw error;
    }
  }

  /**
   * Get monthly application volume - count applications sent per month (not just created)
   */
  async getMonthlyVolume(userId, startDate, endDate, applicationsSentCondition = null) {
    try {
      let dateFilter = "";
      const params = [userId];

      if (startDate) {
        dateFilter += " AND created_at >= $" + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND created_at <= $" + (params.length + 1);
        params.push(endDate + " 23:59:59");
      }

      // If applicationsSentCondition is provided, count applications sent per month
      // Otherwise count all opportunities created per month
      const countCondition = applicationsSentCondition 
        ? `COUNT(CASE WHEN ${applicationsSentCondition} THEN 1 END)`
        : `COUNT(*)`;

      const query = `
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          ${countCondition} as count
        FROM job_opportunities
        WHERE user_id = $1 AND (archived = false OR archived IS NULL) ${dateFilter}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month ASC
      `;

      const result = await database.query(query, params);
      return result.rows.map((row) => ({
        month: row.month,
        count: parseInt(row.count) || 0,
      }));
    } catch (error) {
      console.error("❌ Error getting monthly volume:", error);
      return [];
    }
  }

  /**
   * Get time investment metrics (cumulative hours from time logs)
   */
  async getTimeInvestmentMetrics(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);
      
      // Check if time_logs table exists
      const hasTimeLogs = await this.columnExists("time_logs", "id");
      if (!hasTimeLogs) {
        return {
          totalHours: 0,
          hoursByActivity: [],
          avgHoursPerApplication: 0,
        };
      }

      let dateFilter = "";
      const params = [userId];
      if (startDate) {
        dateFilter += " AND activity_date >= $" + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND activity_date <= $" + (params.length + 1);
        params.push(endDate);
      }

      // Get total hours by activity type
      const query = `
        SELECT 
          activity_type,
          SUM(hours_spent) as total_hours
        FROM time_logs
        WHERE user_id = $1 ${dateFilter}
        GROUP BY activity_type
        ORDER BY total_hours DESC
      `;

      const result = await database.query(query, params);
      const hoursByActivity = result.rows.map((row) => ({
        activityType: row.activity_type,
        hours: parseFloat(row.total_hours || 0),
      }));

      const totalHours = hoursByActivity.reduce((sum, item) => sum + item.hours, 0);

      return {
        totalHours: Math.round(totalHours * 10) / 10,
        hoursByActivity,
        avgHoursPerApplication: 0, // Will be calculated separately with applications count
      };
    } catch (error) {
      console.warn("Error getting time investment metrics:", error.message);
      return {
        totalHours: 0,
        hoursByActivity: [],
        avgHoursPerApplication: 0,
      };
    }
  }

  /**
   * Calculate efficiency metrics
   */
  calculateEfficiencyMetrics({ applicationsSent, totalHours, interviewsScheduled, offersReceived }) {
    const applicationsPerHour = totalHours > 0 
      ? Math.round((applicationsSent / totalHours) * 10) / 10 
      : 0;
    
    const hoursPerApplication = applicationsSent > 0
      ? Math.round((totalHours / applicationsSent) * 10) / 10
      : 0;

    const hoursPerInterview = interviewsScheduled > 0
      ? Math.round((totalHours / interviewsScheduled) * 10) / 10
      : 0;

    const hoursPerOffer = offersReceived > 0
      ? Math.round((totalHours / offersReceived) * 10) / 10
      : 0;

    return {
      applicationsPerHour,
      hoursPerApplication,
      hoursPerInterview,
      hoursPerOffer,
    };
  }

  /**
   * Calculate dynamic industry benchmarks based on user's actual performance
   */
  async calculateDynamicBenchmarks(userId, dateRange = {}, userMetrics = {}) {
    try {
      const {
        applicationsSent = 0,
        interviewsScheduled = 0,
        offersReceived = 0,
        responsesReceived = 0,
        avgDaysToResponse = null,
        avgDaysToInterview = null,
      } = userMetrics;

      // Calculate user's actual rates
      const userResponseRate = applicationsSent > 0 
        ? Math.round((responsesReceived / applicationsSent) * 100 * 10) / 10 
        : 0;
      
      const userInterviewRate = applicationsSent > 0
        ? Math.round((interviewsScheduled / applicationsSent) * 100 * 10) / 10
        : 0;

      const userOfferRate = applicationsSent > 0
        ? Math.round((offersReceived / applicationsSent) * 100 * 10) / 10
        : 0;

      // Use industry benchmarks, but if user has data, blend with user performance
      // For now, return industry benchmarks (can be enhanced with real industry data later)
      return {
        responseRate: Math.max(userResponseRate || 0, this.industryBenchmarks.responseRate),
        interviewRate: Math.max(userInterviewRate || 0, this.industryBenchmarks.interviewRate),
        offerRate: Math.max(userOfferRate || 0, this.industryBenchmarks.offerRate),
        timeToResponse: avgDaysToResponse || this.industryBenchmarks.timeToResponse,
        timeToInterview: avgDaysToInterview || this.industryBenchmarks.timeToInterview,
        timeToOffer: this.industryBenchmarks.timeToOffer,
      };
    } catch (error) {
      console.warn("Error calculating dynamic benchmarks:", error.message);
      return this.industryBenchmarks;
    }
  }

  /**
   * Get success rate by resume used
   * Tracks which resumes perform best by comparing success rates
   */
  async getSuccessByResume(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);
      
      let dateFilter = "";
      const params = [userId];
      if (startDate) {
        dateFilter += " AND jo.created_at >= $" + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND jo.created_at <= $" + (params.length + 1);
        params.push(endDate + " 23:59:59");
      }

      // Check if job_opportunities has resume_id column (preferred method)
      const hasJobResumeId = await this.columnExists("job_opportunities", "resume_id");
      
      let query;
      if (hasJobResumeId) {
        // Use resume_id from job_opportunities - tracks which resume was actually used
        query = `
          SELECT 
            r.id as resume_id,
            COALESCE(r.version_name, r.name, 'Untitled Resume') as resume_name,
            COUNT(*) as total,
            COUNT(CASE WHEN jo.status IN ('Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected') THEN 1 END) as applied,
            COUNT(CASE WHEN jo.status IN ('Phone Screen', 'Interview') THEN 1 END) as interviews,
            COUNT(CASE WHEN jo.status = 'Offer' THEN 1 END) as offers,
            COUNT(CASE WHEN jo.status = 'Rejected' THEN 1 END) as rejected
          FROM job_opportunities jo
          INNER JOIN resume r ON jo.resume_id = r.id
          WHERE jo.user_id = $1 
            AND r.user_id = $1
            AND jo.resume_id IS NOT NULL
            AND (jo.archived = false OR jo.archived IS NULL)
            ${dateFilter}
          GROUP BY r.id, r.version_name, r.name
          HAVING COUNT(*) > 0
          ORDER BY total DESC
        `;
      } else {
        // Fallback: use resume.job_id to link resumes to jobs
        const hasResumeJobId = await this.columnExists("resume", "job_id");
        if (!hasResumeJobId) {
          return [];
        }

        query = `
          SELECT 
            r.id as resume_id,
            COALESCE(r.version_name, r.name, 'Untitled Resume') as resume_name,
            COUNT(*) as total,
            COUNT(CASE WHEN jo.status IN ('Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected') THEN 1 END) as applied,
            COUNT(CASE WHEN jo.status IN ('Phone Screen', 'Interview') THEN 1 END) as interviews,
            COUNT(CASE WHEN jo.status = 'Offer' THEN 1 END) as offers,
            COUNT(CASE WHEN jo.status = 'Rejected' THEN 1 END) as rejected
          FROM resume r
          INNER JOIN job_opportunities jo ON r.job_id = jo.id
          WHERE r.user_id = $1 
            AND jo.user_id = $1
            AND (jo.archived = false OR jo.archived IS NULL)
            ${dateFilter}
          GROUP BY r.id, r.version_name, r.name
          HAVING COUNT(*) > 0
          ORDER BY total DESC
        `;
      }

      const result = await database.query(query, params);
      return result.rows.map((row) => {
        const total = parseInt(row.total) || 0;
        const applied = parseInt(row.applied) || 0;
        const interviews = parseInt(row.interviews) || 0;
        const offers = parseInt(row.offers) || 0;

        return {
          resumeId: row.resume_id,
          resumeName: row.resume_name || "Untitled Resume",
          total,
          applied,
          interviews,
          offers,
          rejected: parseInt(row.rejected) || 0,
          interviewRate: applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0,
          offerRate: applied > 0 ? Math.round((offers / applied) * 1000) / 10 : 0,
          successRate: applied > 0 ? Math.round((offers / applied) * 1000) / 10 : 0, // For comparison
        };
      }).sort((a, b) => {
        // Sort by success rate first, then by total applications
        if (b.successRate !== a.successRate) {
          return b.successRate - a.successRate;
        }
        return b.total - a.total;
      });
    } catch (error) {
      console.warn("Error getting success by resume:", error.message);
      return [];
    }
  }

  /**
   * Get success rate by cover letter used
   * Tracks which cover letters perform best by comparing success rates
   */
  async getSuccessByCoverLetter(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);
      
      let dateFilter = "";
      const params = [userId];
      if (startDate) {
        dateFilter += " AND jo.created_at >= $" + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND jo.created_at <= $" + (params.length + 1);
        params.push(endDate + " 23:59:59");
      }

      // Check if job_opportunities has coverletter_id column (preferred method)
      const hasJobCoverLetterId = await this.columnExists("job_opportunities", "coverletter_id");
      
      let query;
      if (hasJobCoverLetterId) {
        // Use coverletter_id from job_opportunities - tracks which cover letter was actually used
        query = `
          SELECT 
            cl.id as coverletter_id,
            COALESCE(cl.version_name, 'Untitled Cover Letter') as coverletter_name,
            COUNT(*) as total,
            COUNT(CASE WHEN jo.status IN ('Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected') THEN 1 END) as applied,
            COUNT(CASE WHEN jo.status IN ('Phone Screen', 'Interview') THEN 1 END) as interviews,
            COUNT(CASE WHEN jo.status = 'Offer' THEN 1 END) as offers,
            COUNT(CASE WHEN jo.status = 'Rejected' THEN 1 END) as rejected
          FROM job_opportunities jo
          INNER JOIN coverletter cl ON jo.coverletter_id = cl.id
          WHERE jo.user_id = $1 
            AND cl.user_id = $1
            AND jo.coverletter_id IS NOT NULL
            AND (jo.archived = false OR jo.archived IS NULL)
            ${dateFilter}
          GROUP BY cl.id, cl.version_name
          HAVING COUNT(*) > 0
          ORDER BY total DESC
        `;
      } else {
        // Fallback: use coverletter.job_id to link cover letters to jobs
        const hasCoverLetterJobId = await this.columnExists("coverletter", "job_id");
        if (!hasCoverLetterJobId) {
          return [];
        }

        query = `
          SELECT 
            cl.id as coverletter_id,
            COALESCE(cl.version_name, 'Untitled Cover Letter') as coverletter_name,
            COUNT(*) as total,
            COUNT(CASE WHEN jo.status IN ('Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected') THEN 1 END) as applied,
            COUNT(CASE WHEN jo.status IN ('Phone Screen', 'Interview') THEN 1 END) as interviews,
            COUNT(CASE WHEN jo.status = 'Offer' THEN 1 END) as offers,
            COUNT(CASE WHEN jo.status = 'Rejected' THEN 1 END) as rejected
          FROM coverletter cl
          INNER JOIN job_opportunities jo ON cl.job_id = jo.id
          WHERE cl.user_id = $1 
            AND jo.user_id = $1
            AND (jo.archived = false OR jo.archived IS NULL)
            ${dateFilter}
          GROUP BY cl.id, cl.version_name
          HAVING COUNT(*) > 0
          ORDER BY total DESC
        `;
      }

      const result = await database.query(query, params);
      return result.rows.map((row) => {
        const total = parseInt(row.total) || 0;
        const applied = parseInt(row.applied) || 0;
        const interviews = parseInt(row.interviews) || 0;
        const offers = parseInt(row.offers) || 0;

        return {
          coverLetterId: row.coverletter_id,
          coverLetterName: row.coverletter_name || "Untitled Cover Letter",
          total,
          applied,
          interviews,
          offers,
          rejected: parseInt(row.rejected) || 0,
          interviewRate: applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0,
          offerRate: applied > 0 ? Math.round((offers / applied) * 1000) / 10 : 0,
          successRate: applied > 0 ? Math.round((offers / applied) * 1000) / 10 : 0, // For comparison
        };
      }).sort((a, b) => {
        // Sort by success rate first, then by total applications
        if (b.successRate !== a.successRate) {
          return b.successRate - a.successRate;
        }
        return b.total - a.total;
      });
    } catch (error) {
      console.warn("Error getting success by cover letter:", error.message);
      return [];
    }
  }

  // ============================================
  // UC-097: Application Success Rate Analysis
  // ============================================

  /**
   * Analyze application success rates by various factors
   */
  async getApplicationSuccessAnalysis(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      let dateFilter = "";
      const queryParams = [userId];
      if (startDate) {
        dateFilter += " AND created_at >= $" + (queryParams.length + 1);
        queryParams.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND created_at <= $" + (queryParams.length + 1);
        queryParams.push(endDate + " 23:59:59");
      }

      // Success rate by industry
      const byIndustryQuery = `
        SELECT 
          industry,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'Applied' THEN 1 END) as applied,
          COUNT(CASE WHEN status IN ('Phone Screen', 'Interview') THEN 1 END) as interviews,
          COUNT(CASE WHEN status = 'Offer' THEN 1 END) as offers,
          COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected
        FROM job_opportunities
        WHERE user_id = $1 AND (archived = false OR archived IS NULL) AND industry IS NOT NULL ${dateFilter}
        GROUP BY industry
        ORDER BY total DESC
      `;

      const industryResult = await database.query(byIndustryQuery, queryParams);
      const byIndustry = industryResult.rows.map((row) => {
        const total = parseInt(row.total) || 0;
        const applied = parseInt(row.applied) || 0;
        const interviews = parseInt(row.interviews) || 0;
        const offers = parseInt(row.offers) || 0;

        return {
          industry: row.industry,
          total,
          applied,
          interviews,
          offers,
          rejected: parseInt(row.rejected) || 0,
          interviewRate: applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0,
          offerRate: applied > 0 ? Math.round((offers / applied) * 1000) / 10 : 0,
        };
      });

      // Success rate by application source - check if column exists
      let bySource = [];
      const hasApplicationSource = await this.columnExists("job_opportunities", "application_source");
      
      if (hasApplicationSource) {
        try {
          const bySourceQuery = `
            SELECT 
              application_source,
              COUNT(*) as total,
              COUNT(CASE WHEN status = 'Applied' THEN 1 END) as applied,
              COUNT(CASE WHEN status IN ('Phone Screen', 'Interview') THEN 1 END) as interviews,
              COUNT(CASE WHEN status = 'Offer' THEN 1 END) as offers
            FROM job_opportunities
            WHERE user_id = $1 AND (archived = false OR archived IS NULL) AND application_source IS NOT NULL ${dateFilter}
            GROUP BY application_source
            ORDER BY total DESC
          `;

          const sourceResult = await database.query(bySourceQuery, queryParams);
          bySource = sourceResult.rows.map((row) => {
            const total = parseInt(row.total) || 0;
            const applied = parseInt(row.applied) || 0;
            const interviews = parseInt(row.interviews) || 0;
            const offers = parseInt(row.offers) || 0;

            return {
              source: row.application_source,
              total,
              applied,
              interviews,
              offers,
              interviewRate: applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0,
              offerRate: applied > 0 ? Math.round((offers / applied) * 1000) / 10 : 0,
            };
          });
        } catch (error) {
          console.warn("Error getting success by source:", error.message);
        }
      }

      // Success rate by application method - check if column exists
      let byMethod = [];
      const hasApplicationMethod = await this.columnExists("job_opportunities", "application_method");
      
      if (hasApplicationMethod) {
        try {
          const byMethodQuery = `
            SELECT 
              application_method,
              COUNT(*) as total,
              COUNT(CASE WHEN status = 'Applied' THEN 1 END) as applied,
              COUNT(CASE WHEN status IN ('Phone Screen', 'Interview') THEN 1 END) as interviews,
              COUNT(CASE WHEN status = 'Offer' THEN 1 END) as offers
            FROM job_opportunities
            WHERE user_id = $1 AND (archived = false OR archived IS NULL) AND application_method IS NOT NULL ${dateFilter}
            GROUP BY application_method
            ORDER BY total DESC
          `;

          const methodResult = await database.query(byMethodQuery, queryParams);
          byMethod = methodResult.rows.map((row) => {
            const total = parseInt(row.total) || 0;
            const applied = parseInt(row.applied) || 0;
            const interviews = parseInt(row.interviews) || 0;
            const offers = parseInt(row.offers) || 0;

            return {
              method: row.application_method,
              total,
              applied,
              interviews,
              offers,
              interviewRate: applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0,
              offerRate: applied > 0 ? Math.round((offers / applied) * 1000) / 10 : 0,
            };
          });
        } catch (error) {
          console.warn("Error getting success by method:", error.message);
        }
      }

      // Success rate by resume/cover letter - track which materials were used
      const byResume = await this.getSuccessByResume(userId, dateRange);
      const byCoverLetter = await this.getSuccessByCoverLetter(userId, dateRange);

      // Generate recommendations
      const recommendations = this.generateSuccessRecommendations({
        byIndustry,
        bySource,
        byMethod,
        byResume,
        byCoverLetter,
      });

      return {
        byIndustry,
        bySource,
        byMethod,
        byResume,
        byCoverLetter,
        recommendations,
      };
    } catch (error) {
      console.error("❌ Error getting application success analysis:", error);
      throw error;
    }
  }

  /**
   * Generate actionable recommendations based on success analysis
   */
  generateSuccessRecommendations(data) {
    const recommendations = [];

    // Find best performing source
    if (data.bySource && data.bySource.length > 0) {
      const bestSource = data.bySource.reduce((best, current) =>
        current.offerRate > (best?.offerRate || 0) ? current : best
      );
      if (bestSource && bestSource.offerRate > 0) {
        recommendations.push({
          type: "source",
          priority: "high",
          message: `Your highest success rate (${bestSource.offerRate}%) comes from ${bestSource.source}. Focus more applications here.`,
        });
      }
    }

    // Find best performing industry
    if (data.byIndustry && data.byIndustry.length > 0) {
      const bestIndustry = data.byIndustry.reduce((best, current) =>
        current.offerRate > (best?.offerRate || 0) ? current : best
      );
      if (bestIndustry && bestIndustry.offerRate > 0) {
        recommendations.push({
          type: "industry",
          priority: "medium",
          message: `${bestIndustry.industry} shows ${bestIndustry.offerRate}% offer rate. Consider focusing your search here.`,
        });
      }
    }

    return recommendations;
  }

  // ============================================
  // UC-098: Interview Performance Tracking
  // ============================================

  /**
   * Get interview performance analytics
   */
  async getInterviewPerformance(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      let dateFilter = "";
      const params = [userId];
      if (startDate) {
        dateFilter += " AND i.created_at >= $" + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND i.created_at <= $" + (params.length + 1);
        params.push(endDate + " 23:59:59");
      }

      // Check if interviews table exists and has required columns
      const hasInterviewsTable = await this.columnExists("interviews", "id");
      
      if (!hasInterviewsTable) {
        // Return empty data if interviews table doesn't exist
        return {
          overall: {
            totalInterviews: 0,
            offers: 0,
            passed: 0,
            failed: 0,
            offerRate: 0,
            avgConfidence: null,
            avgDifficulty: null,
          },
          byType: [],
          trends: [],
        };
      }

      // Check if outcome column exists
      const hasOutcome = await this.columnExists("interviews", "outcome");
      const outcomeCheck = hasOutcome ? "outcome = 'offer_extended'" : "false";
      const statusCheck = await this.columnExists("interviews", "status") 
        ? "status = 'completed'" 
        : "true";

      // Overall interview metrics
      const overallQuery = `
        SELECT 
          COUNT(*) as total_interviews,
          COUNT(CASE WHEN ${outcomeCheck} THEN 1 END) as offers,
          COUNT(CASE WHEN ${hasOutcome ? "outcome = 'passed'" : "false"} THEN 1 END) as passed,
          COUNT(CASE WHEN ${hasOutcome ? "outcome = 'failed'" : "false"} THEN 1 END) as failed
        FROM interviews i
        WHERE i.user_id = $1 AND ${statusCheck} ${dateFilter}
      `;

      const overallResult = await database.query(overallQuery, params);
      const overall = overallResult.rows[0];

      const totalInterviews = parseInt(overall.total_interviews) || 0;
      const offers = parseInt(overall.offers) || 0;

      // Check for confidence and difficulty columns
      const hasConfidence = await this.columnExists("interviews", "confidence_rating");
      const hasDifficulty = await this.columnExists("interviews", "difficulty_rating");
      
      let avgConfidence = null;
      let avgDifficulty = null;

      if (hasConfidence || hasDifficulty) {
        const ratingQuery = `
          SELECT 
            ${hasConfidence ? "AVG(confidence_rating) as avg_confidence" : "NULL as avg_confidence"},
            ${hasDifficulty ? "AVG(difficulty_rating) as avg_difficulty" : "NULL as avg_difficulty"}
          FROM interviews
          WHERE user_id = $1 AND ${statusCheck} ${dateFilter}
        `;
        const ratingResult = await database.query(ratingQuery, params);
        const ratings = ratingResult.rows[0];
        if (ratings?.avg_confidence) {
          avgConfidence = Math.round(ratings.avg_confidence * 10) / 10;
        }
        if (ratings?.avg_difficulty) {
          avgDifficulty = Math.round(ratings.avg_difficulty * 10) / 10;
        }
      }

      // Performance by interview type
      let byType = [];
      const hasInterviewType = await this.columnExists("interviews", "interview_type") || 
                               await this.columnExists("interviews", "type");
      
      if (hasInterviewType) {
        const typeColumn = await this.columnExists("interviews", "interview_type") 
          ? "interview_type" 
          : "type";
        
        try {
          const byTypeQuery = `
            SELECT 
              ${typeColumn} as interview_type,
              COUNT(*) as count,
              COUNT(CASE WHEN ${outcomeCheck} THEN 1 END) as offers,
              ${hasConfidence ? "AVG(confidence_rating) as avg_confidence" : "NULL as avg_confidence"},
              ${hasDifficulty ? "AVG(difficulty_rating) as avg_difficulty" : "NULL as avg_difficulty"}
            FROM interviews
            WHERE user_id = $1 AND ${statusCheck} ${dateFilter}
            GROUP BY ${typeColumn}
            ORDER BY count DESC
          `;

          const byTypeResult = await database.query(byTypeQuery, params);
          byType = byTypeResult.rows.map((row) => {
            const count = parseInt(row.count) || 0;
            const typeOffers = parseInt(row.offers) || 0;

            return {
              type: row.interview_type,
              count,
              offers: typeOffers,
              offerRate: count > 0 ? Math.round((typeOffers / count) * 1000) / 10 : 0,
              avgConfidence: row.avg_confidence ? Math.round(row.avg_confidence * 10) / 10 : null,
              avgDifficulty: row.avg_difficulty ? Math.round(row.avg_difficulty * 10) / 10 : null,
            };
          });
        } catch (error) {
          console.warn("Error getting performance by type:", error.message);
        }
      }

      // Improvement trends (over time)
      const trendsQuery = `
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*) as count,
          COUNT(CASE WHEN ${outcomeCheck} THEN 1 END) as offers,
          ${hasConfidence ? "AVG(confidence_rating) as avg_confidence" : "NULL as avg_confidence"}
        FROM interviews
        WHERE user_id = $1 AND ${statusCheck} ${dateFilter}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month ASC
      `;

      let trends = [];
      try {
        const trendsResult = await database.query(trendsQuery, params);
        trends = trendsResult.rows.map((row) => ({
          month: row.month,
          count: parseInt(row.count) || 0,
          offers: parseInt(row.offers) || 0,
          avgConfidence: row.avg_confidence
            ? Math.round(row.avg_confidence * 10) / 10
            : null,
        }));
      } catch (error) {
        console.warn("Error getting interview trends:", error.message);
      }

      return {
        overall: {
          totalInterviews,
          offers,
          passed: parseInt(overall.passed) || 0,
          failed: parseInt(overall.failed) || 0,
          offerRate:
            totalInterviews > 0
              ? Math.round((offers / totalInterviews) * 1000) / 10
              : 0,
          avgConfidence,
          avgDifficulty,
        },
        byType,
        trends,
      };
    } catch (error) {
      console.error("❌ Error getting interview performance:", error);
      throw error;
    }
  }

  // ============================================
  // UC-099: Network ROI Analytics
  // ============================================

  /**
   * Get network ROI and relationship analytics
   */
  async getNetworkROI(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      let dateFilter = "";
      const params = [userId];
      if (startDate) {
        dateFilter += " AND created_at >= $" + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND created_at <= $" + (params.length + 1);
        params.push(endDate + " 23:59:59");
      }

      // Check if networking_activities table exists, if not use professional_contacts
      const hasNetworkingActivities = await this.columnExists("networking_activities", "id");
      const hasProfessionalContacts = await this.columnExists("professional_contacts", "id");
      
      if (!hasNetworkingActivities && !hasProfessionalContacts) {
        return {
          overall: {
            totalActivities: 0,
            referrals: 0,
            opportunitiesFromNetwork: 0,
            uniqueContacts: 0,
          },
          byType: [],
        };
      }

      // Use networking_activities if it exists, otherwise use professional_contacts
      const tableName = hasNetworkingActivities ? "networking_activities" : "professional_contacts";
      const hasReferralProvided = await this.columnExists(tableName, "referral_provided");
      const hasJobOpportunityId = await this.columnExists(tableName, "job_opportunity_id");

      // Overall networking metrics
      const overallQuery = `
        SELECT 
          COUNT(*) as total_activities,
          ${hasReferralProvided ? "COUNT(CASE WHEN referral_provided = true THEN 1 END) as referrals" : "0 as referrals"},
          ${hasJobOpportunityId ? "COUNT(CASE WHEN job_opportunity_id IS NOT NULL THEN 1 END) as opportunities_from_network" : "0 as opportunities_from_network"},
          COUNT(DISTINCT ${hasNetworkingActivities ? "contact_name" : "first_name || ' ' || COALESCE(last_name, '')"}) as unique_contacts
        FROM ${tableName}
        WHERE user_id = $1 ${dateFilter}
      `;

      const overallResult = await database.query(overallQuery, params);
      const overall = overallResult.rows[0];

      // Activities by type
      let byType = [];
      const hasActivityType = await this.columnExists(tableName, "activity_type");
      const hasRelationshipType = await this.columnExists(tableName, "relationship_type");
      const typeColumn = hasActivityType ? "activity_type" : (hasRelationshipType ? "relationship_type" : null);

      if (typeColumn) {
        try {
          const byTypeQuery = `
            SELECT 
              ${typeColumn} as activity_type,
              COUNT(*) as count,
              ${hasReferralProvided ? "COUNT(CASE WHEN referral_provided = true THEN 1 END) as referrals" : "0 as referrals"},
              ${hasJobOpportunityId ? "COUNT(CASE WHEN job_opportunity_id IS NOT NULL THEN 1 END) as opportunities" : "0 as opportunities"}
            FROM ${tableName}
            WHERE user_id = $1 ${dateFilter}
            GROUP BY ${typeColumn}
            ORDER BY count DESC
          `;

          const byTypeResult = await database.query(byTypeQuery, params);
          byType = byTypeResult.rows.map((row) => ({
            type: row.activity_type,
            count: parseInt(row.count) || 0,
            referrals: parseInt(row.referrals) || 0,
            opportunities: parseInt(row.opportunities) || 0,
          }));
        } catch (error) {
          console.warn("Error getting activities by type:", error.message);
        }
      }

      return {
        overall: {
          totalActivities: parseInt(overall.total_activities) || 0,
          referrals: parseInt(overall.referrals) || 0,
          opportunitiesFromNetwork: parseInt(overall.opportunities_from_network) || 0,
          uniqueContacts: parseInt(overall.unique_contacts) || 0,
        },
        byType,
      };
    } catch (error) {
      console.error("❌ Error getting network ROI:", error);
      throw error;
    }
  }

  // ============================================
  // UC-100: Salary Progression and Market Positioning
  // ============================================

  /**
   * Get salary progression and market positioning
   */
  async getSalaryProgression(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      let dateFilter = "";
      const params = [userId];
      if (startDate) {
        dateFilter += " AND created_at >= $" + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND created_at <= $" + (params.length + 1);
        params.push(endDate + " 23:59:59");
      }

      // Salary progression: ONLY use employment history (not offers)
      // Get employment salaries over time with location
      let employmentParams = [userId];
      let employmentDateFilter = "";
      if (startDate) {
        employmentDateFilter += ` AND start_date >= $${employmentParams.length + 1}`;
        employmentParams.push(startDate);
      }
      if (endDate) {
        employmentDateFilter += ` AND start_date <= $${employmentParams.length + 1}`;
        employmentParams.push(endDate);
      }

      const employmentQuery = `
        SELECT 
          TO_CHAR(start_date, 'YYYY-MM') as month,
          AVG(salary) as avg_salary,
          COUNT(*) as employment_count,
          STRING_AGG(DISTINCT location, ', ' ORDER BY location) FILTER (WHERE location IS NOT NULL) as locations
        FROM jobs
        WHERE user_id = $1 
          AND salary IS NOT NULL
          ${employmentDateFilter}
        GROUP BY TO_CHAR(start_date, 'YYYY-MM')
        ORDER BY month ASC
      `;

      const employmentResult = await database.query(employmentQuery, employmentParams);
      const employmentByMonth = {};
      employmentResult.rows.forEach((row) => {
        employmentByMonth[row.month] = {
          avgSalary: row.avg_salary ? Math.round(row.avg_salary) : null,
          employmentCount: parseInt(row.employment_count) || 0,
          locations: row.locations || null,
        };
      });

      // Create progression entries from employment history only (most recent first)
      const salaryProgression = [];
      Object.keys(employmentByMonth)
        .sort()
        .reverse()
        .forEach((month) => {
          const employmentData = employmentByMonth[month];
          salaryProgression.push({
            month,
            type: 'employment',
            avgMin: employmentData.avgSalary,
            avgMax: employmentData.avgSalary,
            count: employmentData.employmentCount || 0,
            location: employmentData.locations || null,
            negotiationStatus: null,
          });
        });

      // Salary by industry - Include both employment history AND offers
      // Get employment salaries by industry and location (each job's location separately)
      const employmentByIndustryQuery = `
        SELECT 
          p.industry,
          j.location,
          j.salary,
          COUNT(*) OVER (PARTITION BY p.industry, j.location) as location_count
        FROM jobs j
        JOIN profiles p ON p.user_id = j.user_id
        WHERE j.user_id = $1 
          AND j.salary IS NOT NULL
          AND p.industry IS NOT NULL
          ${employmentDateFilter}
        ORDER BY j.start_date DESC
      `;
      const employmentByIndustryResult = await database.query(employmentByIndustryQuery, employmentParams);

      // Get offers by industry and location for market research
      const offersByIndustryQuery = `
        SELECT 
          industry,
          location,
          salary_min,
          salary_max,
          CASE 
            WHEN salary_min IS NOT NULL AND salary_max IS NOT NULL THEN (salary_min + salary_max) / 2
            WHEN salary_min IS NOT NULL THEN salary_min
            WHEN salary_max IS NOT NULL THEN salary_max
            ELSE NULL
          END as avg_salary
        FROM job_opportunities
        WHERE user_id = $1 
          AND status = 'Offer'
          AND (salary_min IS NOT NULL OR salary_max IS NOT NULL)
          AND (archived = false OR archived IS NULL)
          ${dateFilter}
        ORDER BY created_at DESC
      `;
      const offersByIndustryResult = await database.query(offersByIndustryQuery, params);

      // Group by industry and location (each location separately for accurate comparison)
      const industryData = {};
      const locationData = {}; // Track location-specific data for market comparison
      
      // Process employment data
      employmentByIndustryResult.rows.forEach((row) => {
        const industry = row.industry;
        const location = row.location || 'Unknown';
        const salary = Math.round(row.salary);
        
        // Group by industry
        if (!industryData[industry]) {
          industryData[industry] = {
            industry,
            salaries: [],
            locations: new Set(),
            count: 0,
          };
        }
        industryData[industry].salaries.push(salary);
        industryData[industry].locations.add(location);
        industryData[industry].count += 1;
        
        // Track location-specific data for market comparison
        if (!locationData[location]) {
          locationData[location] = {
            salaries: [],
            count: 0,
          };
        }
        locationData[location].salaries.push(salary);
        locationData[location].count += 1;
      });

      // Process offers data
      offersByIndustryResult.rows.forEach((row) => {
        if (!row.industry) return; // Skip if no industry
        
        const industry = row.industry;
        const location = row.location || 'Unknown';
        const salary = row.avg_salary ? Math.round(row.avg_salary) : null;
        
        if (salary === null) return; // Skip if no salary data
        
        // Group by industry
        if (!industryData[industry]) {
          industryData[industry] = {
            industry,
            salaries: [],
            locations: new Set(),
            count: 0,
          };
        }
        industryData[industry].salaries.push(salary);
        industryData[industry].locations.add(location);
        industryData[industry].count += 1;
        
        // Track location-specific data for market comparison
        if (!locationData[location]) {
          locationData[location] = {
            salaries: [],
            count: 0,
          };
        }
        locationData[location].salaries.push(salary);
        locationData[location].count += 1;
      });

      const byIndustry = Object.values(industryData).map((data) => {
        const validSalaries = data.salaries.filter(s => s !== null && s > 0);
        const avgMin = validSalaries.length > 0
          ? Math.round(validSalaries.reduce((sum, s) => sum + s, 0) / validSalaries.length)
          : null;
        const avgMax = validSalaries.length > 0
          ? Math.round(Math.max(...validSalaries))
          : null;

        // Calculate industry average (placeholder - can be enhanced with real industry data)
        const industryAverage = this.getIndustryAverageSalary(data.industry);
        
        // Calculate location average for the primary location (first location in set)
        let locationAverage = null;
        let vsLocation = null;
        const locationsArray = Array.from(data.locations);
        if (locationsArray.length > 0) {
          // Get average salary for the primary location from locationData
          const primaryLocation = locationsArray[0];
          if (locationData[primaryLocation] && locationData[primaryLocation].salaries.length > 0) {
            const locSalaries = locationData[primaryLocation].salaries;
            locationAverage = Math.round(locSalaries.reduce((sum, s) => sum + s, 0) / locSalaries.length);
            
            if (avgMax && locationAverage) {
              vsLocation = Math.round(((avgMax - locationAverage) / locationAverage) * 100 * 10) / 10;
            }
          }
        }

        return {
          industry: data.industry,
          avgMin,
          avgMax,
          count: data.count,
          industryAverage, // Industry benchmark for comparison
          vsIndustry: avgMax && industryAverage 
            ? Math.round(((avgMax - industryAverage) / industryAverage) * 100 * 10) / 10 
            : null, // Percentage above/below industry average
          location: locationsArray.length > 0 ? locationsArray.join(', ') : null,
          locationAverage,
          vsLocation, // Percentage above/below location average
        };
      }).sort((a, b) => (b.avgMax || 0) - (a.avgMax || 0));

      // Get ongoing negotiations (offers - show all offers, not just those with salary)
      const hasNegotiationStatus = await this.columnExists("job_opportunities", "negotiation_status");
      const hasNegotiationNotes = await this.columnExists("job_opportunities", "salary_negotiation_notes");
      
      let negotiationsQuery = `
        SELECT 
          id,
          title,
          company,
          location,
          salary_min,
          salary_max,
          industry,
          ${hasNegotiationStatus ? "negotiation_status," : "NULL as negotiation_status,"}
          ${hasNegotiationNotes ? "salary_negotiation_notes," : "NULL as salary_negotiation_notes,"}
          TO_CHAR(created_at, 'YYYY-MM') as month,
          created_at
        FROM job_opportunities
        WHERE user_id = $1 
          AND status = 'Offer' 
          AND (archived = false OR archived IS NULL)
      `;
      
      // Only filter out accepted/rejected if negotiation_status column exists
      // But still show offers with NULL negotiation_status (not yet started)
      if (hasNegotiationStatus) {
        negotiationsQuery += ` AND (negotiation_status IS NULL 
          OR negotiation_status NOT IN ('accepted', 'rejected'))`;
      }
      
      negotiationsQuery += ` ${dateFilter} ORDER BY created_at DESC`;
      
      const negotiationsResult = await database.query(negotiationsQuery, params);
      const ongoingNegotiations = negotiationsResult.rows.map((row) => {
        // Parse negotiation notes to extract bonus, equity, overtime info
        let bonus = null;
        let equity = null;
        let overtime = null;
        const notes = row.salary_negotiation_notes || '';
        
        // Simple parsing - look for keywords in notes
        if (notes) {
          const noteLower = notes.toLowerCase();
          const bonusMatch = noteLower.match(/(?:bonus|signing bonus)[:\s]*\$?([\d,]+)/i);
          const equityMatch = noteLower.match(/(?:equity|stock|options|rsu)[:\s]*\$?([\d,]+)/i);
          const overtimeMatch = noteLower.match(/(?:overtime|ot)[:\s]*(yes|no|eligible|available)/i);
          
          if (bonusMatch) bonus = parseInt(bonusMatch[1].replace(/,/g, ''));
          if (equityMatch) equity = parseInt(equityMatch[1].replace(/,/g, ''));
          if (overtimeMatch) overtime = overtimeMatch[1];
        }
        
        return {
          id: row.id,
          title: row.title,
          company: row.company,
          location: row.location,
          industry: row.industry || null,
          salaryMin: row.salary_min ? Math.round(row.salary_min) : null,
          salaryMax: row.salary_max ? Math.round(row.salary_max) : null,
          negotiationStatus: row.negotiation_status || 'not_started',
          notes: notes || null,
          bonus,
          equity,
          overtime,
          month: row.month,
          createdAt: row.created_at,
        };
      });

      return {
        progression: salaryProgression,
        byIndustry,
        ongoingNegotiations,
      };
    } catch (error) {
      console.error("❌ Error getting salary progression:", error);
      throw error;
    }
  }

  // ============================================
  // UC-103: Time Investment and Productivity Analysis
  // ============================================

  /**
   * Check if user has manual time logs
   */
  async hasTimeLogs(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);
      
      let dateFilter = "";
      const params = [userId];
      if (startDate) {
        dateFilter += " AND activity_date >= $" + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND activity_date <= $" + (params.length + 1);
        params.push(endDate);
      }

      const query = `
        SELECT COUNT(*) as count
        FROM time_logs
        WHERE user_id = $1 ${dateFilter}
      `;

      const result = await database.query(query, params);
      return parseInt(result.rows[0]?.count || 0) > 0;
    } catch (error) {
      console.warn("Error checking for time logs:", error.message);
      return false;
    }
  }

  /**
   * Get comprehensive productivity and time investment analytics
   * Automatically uses manual time logs if available, otherwise uses estimates
   */
  async getProductivityAnalytics(userId, dateRange = {}, useManual = null) {
    try {
      // If useManual is explicitly set, use that mode
      if (useManual === true) {
        return await this.getManualProductivityAnalytics(userId, dateRange);
      } else if (useManual === false) {
        return await this.getEstimatedProductivityAnalytics(userId, dateRange);
      }
      
      // Otherwise, auto-detect based on whether user has manual time logs
      const hasManualLogs = await this.hasTimeLogs(userId, dateRange);
      
      if (hasManualLogs) {
        return await this.getManualProductivityAnalytics(userId, dateRange);
      } else {
        return await this.getEstimatedProductivityAnalytics(userId, dateRange);
      }
    } catch (error) {
      console.error("❌ Error getting productivity analytics:", error);
      throw error;
    }
  }

  /**
   * Get productivity analytics from manual time logs
   */
  async getManualProductivityAnalytics(userId, dateRange = {}) {
    try {
      const { startDate, endDate} = this.parseDateRange(dateRange);

      let dateFilter = "";
      const params = [userId];
      if (startDate) {
        dateFilter += " AND activity_date >= $" + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND activity_date <= $" + (params.length + 1);
        params.push(endDate);
      }

      // Get total time investment from manual logs
      const timeInvestmentQuery = `
        SELECT 
          SUM(hours_spent) as total_hours,
          MIN(activity_date) as start_date,
          MAX(activity_date) as end_date
        FROM time_logs
        WHERE user_id = $1 ${dateFilter}
      `;

      const timeResult = await database.query(timeInvestmentQuery, params);
      const timeData = timeResult.rows[0];
      
      const totalHours = parseFloat(timeData.total_hours) || 0;
      
      // Calculate weeks based on actual span of logged activities
      let weeksBetween = 1;
      if (timeData.start_date && timeData.end_date) {
        const start = new Date(timeData.start_date);
        const end = new Date(timeData.end_date);
        const daysBetween = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
        weeksBetween = Math.max(1, daysBetween / 7);
      }

      const avgHoursPerWeek = totalHours / weeksBetween;
      const avgHoursPerDay = avgHoursPerWeek / 7;

      // Activity breakdown from manual time logs
      const activityQuery = `
        SELECT 
          activity_type,
          SUM(hours_spent) as hours_spent,
          COUNT(*) as task_count
        FROM time_logs
        WHERE user_id = $1 ${dateFilter}
        GROUP BY activity_type
        ORDER BY hours_spent DESC
      `;

      const activityResult = await database.query(activityQuery, params);
      
      const activityBreakdown = activityResult.rows.map(row => {
        const hoursSpent = parseFloat(row.hours_spent) || 0;
        const taskCount = parseInt(row.task_count) || 0;
        
        // Map activity types to display names
        const activityNames = {
          'research': 'Research & Planning',
          'application': 'Application Submission',
          'interview_prep': 'Interview Preparation',
          'interview': 'Interviewing',
          'networking': 'Networking',
          'follow_up': 'Follow-up',
          'offer_negotiation': 'Offer Negotiation',
          'other': 'Other'
        };
        
        return {
          activityType: activityNames[row.activity_type] || row.activity_type,
          hoursSpent,
          percentage: totalHours > 0 ? Math.round((hoursSpent / totalHours) * 100) : 0,
          tasksCompleted: taskCount,
          avgTimePerTask: taskCount > 0 ? Math.round((hoursSpent / taskCount) * 10) / 10 : 0
        };
      });

      // Productivity patterns by day of week (from manual logs)
      const dayOfWeekQuery = `
        SELECT 
          TO_CHAR(activity_date, 'Day') as day,
          EXTRACT(DOW FROM activity_date) as day_num,
          SUM(hours_spent) as hours,
          COUNT(DISTINCT activity_date) as days_active,
          COUNT(*) as tasks
        FROM time_logs
        WHERE user_id = $1 ${dateFilter}
        GROUP BY day, day_num
        ORDER BY day_num
      `;

      const dayResult = await database.query(dayOfWeekQuery, params);
      const byDayOfWeek = dayResult.rows.map(row => {
        const hours = parseFloat(row.hours) || 0;
        const tasks = parseInt(row.tasks) || 0;
        
        return {
          day: row.day.trim(),
          hours: Math.round(hours * 10) / 10,
          tasksCompleted: tasks,
          efficiency: 100 // Manual logs don't have success tracking
        };
      });

      // Find most productive day
      let mostProductiveDay = null;
      if (byDayOfWeek.length > 0) {
        mostProductiveDay = byDayOfWeek.reduce((best, current) => 
          current.hours > best.hours ? current : best
        ).day;
      }

      // Task completion metrics (from job opportunities)
      const taskMetricsQuery = `
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status NOT IN ('Interested', 'Rejected') THEN 1 END) as active_tasks,
          COUNT(CASE WHEN status IN ('Offer', 'Applied', 'Interview') THEN 1 END) as completed_tasks
        FROM job_opportunities
        WHERE user_id = $1 AND (archived = false OR archived IS NULL)
      `;

      const taskResult = await database.query(taskMetricsQuery, [userId]);
      const taskData = taskResult.rows[0];
      const totalTasks = parseInt(taskData.total_tasks) || 0;
      const completedTasks = parseInt(taskData.completed_tasks) || 0;

      // Get performance metrics for efficiency calculations
      const performanceData = await this.getJobSearchPerformance(userId, dateRange);
      const applications = performanceData.keyMetrics.applicationsSent || 0;
      const interviews = performanceData.keyMetrics.interviewsScheduled || 0;
      const offers = performanceData.keyMetrics.offersReceived || 0;

      // Calculate efficiency metrics
      const applicationEfficiency = totalHours > 0 ? Math.round((applications / totalHours) * 10) / 10 : 0;
      const interviewEfficiency = totalHours > 0 ? Math.round((interviews / totalHours) * 100) / 100 : 0;
      const offerEfficiency = totalHours > 0 ? Math.round((offers / totalHours) * 100) / 100 : 0;
      const timeToOutcomeRatio = offers > 0 ? Math.round((totalHours / offers) * 10) / 10 : 0;

      // Generate recommendations
      const recommendations = this.generateProductivityRecommendations({
        totalHours,
        avgHoursPerWeek,
        activityBreakdown,
        efficiency: {
          applicationEfficiency,
          interviewEfficiency,
          offerEfficiency
        },
        performanceData
      });

      // Wellness indicators
      const burnoutRisk = avgHoursPerWeek > 20 ? 'high' : avgHoursPerWeek > 10 ? 'medium' : 'low';
      const workLifeBalance = Math.max(0, Math.min(100, 100 - (avgHoursPerWeek * 2)));
      
      const overworkWarnings = [];
      if (avgHoursPerWeek > 20) {
        overworkWarnings.push('You\'re spending over 20 hours per week on job searching. Consider taking breaks to avoid burnout.');
      }
      if (applicationEfficiency < 0.5 && applications > 5) {
        overworkWarnings.push('Your application efficiency is lower than optimal. Focus on quality over quantity.');
      }

      return {
        dataSource: 'manual', // Indicates manual time log data
        timeInvestment: {
          totalHoursInvested: Math.round(totalHours * 10) / 10,
          avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
          avgHoursPerWeek: Math.round(avgHoursPerWeek * 10) / 10,
          mostProductiveDay,
          mostProductiveTime: '9:00 AM - 11:00 AM' // Placeholder - could be calculated from timestamps
        },
        activityBreakdown,
        productivityPatterns: {
          byDayOfWeek,
          byTimeOfDay: [] // Placeholder for future time-of-day tracking
        },
        taskMetrics: {
          totalTasks,
          completedTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          avgCompletionTime: null // Could be calculated with time tracking
        },
        efficiency: {
          timeToOutcomeRatio,
          applicationEfficiency,
          interviewEfficiency,
          offerEfficiency
        },
        recommendations,
        wellnessIndicators: {
          burnoutRisk,
          workLifeBalance: Math.round(workLifeBalance),
          energyLevels: [], // Placeholder for user-tracked energy levels
          overworkWarnings
        }
      };
    } catch (error) {
      console.error("❌ Error getting manual productivity analytics:", error);
      throw error;
    }
  }

  /**
   * Get productivity analytics from estimated time (fallback when no manual logs)
   */
  async getEstimatedProductivityAnalytics(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      let dateFilter = "";
      const params = [userId];
      if (startDate) {
        dateFilter += " AND created_at >= $" + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND created_at <= $" + (params.length + 1);
        params.push(endDate + " 23:59:59");
      }

      // Get estimated time from job search activities (using same logic as manual method)
      const timeInvestmentQuery = `
        SELECT 
          COUNT(CASE WHEN status IN ('Applied', 'Interested') THEN 1 END) * 1.0 as application_hours,
          COUNT(CASE WHEN status IN ('Phone Screen', 'Interview') THEN 1 END) * 3.0 as interview_hours,
          MIN(created_at)::date as start_date,
          MAX(created_at)::date as end_date
        FROM job_opportunities
        WHERE user_id = $1 AND (archived = false OR archived IS NULL) ${dateFilter}
      `;

      const timeResult = await database.query(timeInvestmentQuery, params);
      const timeData = timeResult.rows[0];
      
      const applicationHours = parseFloat(timeData.application_hours) || 0;
      const interviewHours = parseFloat(timeData.interview_hours) || 0;
      const totalHours = applicationHours + interviewHours;
      
      // Calculate weeks based on actual span of job opportunities
      let weeksBetween = 1;
      if (timeData.start_date && timeData.end_date) {
        const start = new Date(timeData.start_date);
        const end = new Date(timeData.end_date);
        const daysBetween = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        weeksBetween = Math.max(1, daysBetween / 7);
      }

      const avgHoursPerWeek = totalHours / weeksBetween;
      const avgHoursPerDay = avgHoursPerWeek / 7;

      // Activity breakdown by job search stage
      const activityQuery = `
        SELECT 
          CASE 
            WHEN status = 'Interested' THEN 'Research & Planning'
            WHEN status = 'Applied' THEN 'Application Submission'
            WHEN status = 'Phone Screen' THEN 'Phone Screening'
            WHEN status = 'Interview' THEN 'Interviewing'
            WHEN status = 'Offer' THEN 'Offer Negotiation'
            ELSE 'Other'
          END as activity_type,
          COUNT(*) as task_count
        FROM job_opportunities
        WHERE user_id = $1 AND (archived = false OR archived IS NULL) ${dateFilter}
        GROUP BY activity_type
        ORDER BY task_count DESC
      `;

      const activityResult = await database.query(activityQuery, params);
      
      const activityBreakdown = activityResult.rows.map(row => {
        let hoursPerTask;
        switch(row.activity_type) {
          case 'Research & Planning': hoursPerTask = 0.5; break;
          case 'Application Submission': hoursPerTask = 1.0; break;
          case 'Phone Screening': hoursPerTask = 1.5; break;
          case 'Interviewing': hoursPerTask = 3.0; break;
          case 'Offer Negotiation': hoursPerTask = 2.0; break;
          default: hoursPerTask = 1.0;
        }
        
        const taskCount = parseInt(row.task_count) || 0;
        const hoursSpent = taskCount * hoursPerTask;
        
        return {
          activityType: row.activity_type,
          hoursSpent,
          percentage: totalHours > 0 ? Math.round((hoursSpent / totalHours) * 100) : 0,
          tasksCompleted: taskCount,
          avgTimePerTask: hoursPerTask
        };
      });

      // Productivity patterns by day of week
      const dayOfWeekQuery = `
        SELECT 
          TO_CHAR(created_at, 'Day') as day,
          EXTRACT(DOW FROM created_at) as day_num,
          COUNT(*) as tasks,
          COUNT(CASE WHEN status IN ('Interview', 'Offer') THEN 1 END) as successful_tasks
        FROM job_opportunities
        WHERE user_id = $1 AND (archived = false OR archived IS NULL) ${dateFilter}
        GROUP BY day, day_num
        ORDER BY day_num
      `;

      const dayResult = await database.query(dayOfWeekQuery, params);
      const byDayOfWeek = dayResult.rows.map(row => {
        const tasks = parseInt(row.tasks) || 0;
        const successful = parseInt(row.successful_tasks) || 0;
        const estimatedHours = tasks * 1.5;
        
        return {
          day: row.day.trim(),
          hours: Math.round(estimatedHours * 10) / 10,
          tasksCompleted: tasks,
          efficiency: tasks > 0 ? Math.round((successful / tasks) * 100) : 0
        };
      });

      let mostProductiveDay = null;
      if (byDayOfWeek.length > 0) {
        mostProductiveDay = byDayOfWeek.reduce((best, current) => 
          current.tasksCompleted > best.tasksCompleted ? current : best
        ).day;
      }

      const taskMetricsQuery = `
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status NOT IN ('Interested', 'Rejected') THEN 1 END) as active_tasks,
          COUNT(CASE WHEN status IN ('Offer', 'Applied', 'Interview') THEN 1 END) as completed_tasks
        FROM job_opportunities
        WHERE user_id = $1 AND (archived = false OR archived IS NULL) ${dateFilter}
      `;

      const taskResult = await database.query(taskMetricsQuery, params);
      const taskData = taskResult.rows[0];
      const totalTasks = parseInt(taskData.total_tasks) || 0;
      const completedTasks = parseInt(taskData.completed_tasks) || 0;

      const performanceData = await this.getJobSearchPerformance(userId, dateRange);
      const applications = performanceData.keyMetrics.applicationsSent || 0;
      const interviews = performanceData.keyMetrics.interviewsScheduled || 0;
      const offers = performanceData.keyMetrics.offersReceived || 0;

      const applicationEfficiency = totalHours > 0 ? Math.round((applications / totalHours) * 10) / 10 : 0;
      const interviewEfficiency = totalHours > 0 ? Math.round((interviews / totalHours) * 100) / 100 : 0;
      const offerEfficiency = totalHours > 0 ? Math.round((offers / totalHours) * 100) / 100 : 0;
      const timeToOutcomeRatio = offers > 0 ? Math.round((totalHours / offers) * 10) / 10 : 0;

      const recommendations = this.generateProductivityRecommendations({
        totalHours,
        avgHoursPerWeek,
        activityBreakdown,
        efficiency: {
          applicationEfficiency,
          interviewEfficiency,
          offerEfficiency
        },
        performanceData
      });

      const burnoutRisk = avgHoursPerWeek > 20 ? 'high' : avgHoursPerWeek > 10 ? 'medium' : 'low';
      const workLifeBalance = Math.max(0, Math.min(100, 100 - (avgHoursPerWeek * 2)));
      
      const overworkWarnings = [];
      if (avgHoursPerWeek > 20) {
        overworkWarnings.push('You\'re spending over 20 hours per week on job searching. Consider taking breaks to avoid burnout.');
      }
      if (applicationEfficiency < 0.5 && applications > 5) {
        overworkWarnings.push('Your application efficiency is lower than optimal. Focus on quality over quantity.');
      }

      return {
        dataSource: 'estimated', // Indicates estimated data
        timeInvestment: {
          totalHoursInvested: Math.round(totalHours * 10) / 10,
          avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
          avgHoursPerWeek: Math.round(avgHoursPerWeek * 10) / 10,
          mostProductiveDay,
          mostProductiveTime: '9:00 AM - 11:00 AM'
        },
        activityBreakdown,
        productivityPatterns: {
          byDayOfWeek,
          byTimeOfDay: []
        },
        taskMetrics: {
          totalTasks,
          completedTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          avgCompletionTime: null
        },
        efficiency: {
          timeToOutcomeRatio,
          applicationEfficiency,
          interviewEfficiency,
          offerEfficiency
        },
        recommendations,
        wellnessIndicators: {
          burnoutRisk,
          workLifeBalance: Math.round(workLifeBalance),
          energyLevels: [],
          overworkWarnings
        }
      };
    } catch (error) {
      console.error("❌ Error getting estimated productivity analytics:", error);
      throw error;
    }
  }

  /**
   * Generate productivity recommendations
   */
  generateProductivityRecommendations(data) {
    const recommendations = [];

    // Time investment recommendations
    if (data.avgHoursPerWeek < 5) {
      recommendations.push({
        type: 'time_investment',
        priority: 'high',
        message: 'You\'re investing less than 5 hours per week in job searching.',
        actionable: 'Consider increasing your weekly time investment to 10-15 hours for better results.'
      });
    } else if (data.avgHoursPerWeek > 25) {
      recommendations.push({
        type: 'time_investment',
        priority: 'high',
        message: 'You\'re investing over 25 hours per week - this may lead to burnout.',
        actionable: 'Take breaks and focus on strategic, high-quality applications rather than volume.'
      });
    }

    // Efficiency recommendations
    if (data.efficiency.applicationEfficiency < 0.5) {
      recommendations.push({
        type: 'efficiency',
        priority: 'medium',
        message: 'Your application rate is below optimal (< 0.5 apps/hour).',
        actionable: 'Streamline your application process with templates and saved materials.'
      });
    }

    if (data.efficiency.offerEfficiency > 0) {
      const hoursPerOffer = 1 / data.efficiency.offerEfficiency;
      if (hoursPerOffer < 50) {
        recommendations.push({
          type: 'success',
          priority: 'high',
          message: `Excellent! You're getting offers with ${Math.round(hoursPerOffer)} hours of investment.`,
          actionable: 'Keep up your current strategy - it\'s working well!'
        });
      }
    }

    // Activity balance recommendations
    if (data.activityBreakdown.length > 0) {
      const researchActivity = data.activityBreakdown.find(a => a.activityType === 'Research & Planning');
      const applicationActivity = data.activityBreakdown.find(a => a.activityType === 'Application Submission');
      
      if (researchActivity && applicationActivity) {
        const researchPct = researchActivity.percentage;
        const applicationPct = applicationActivity.percentage;
        
        if (researchPct > 40) {
          recommendations.push({
            type: 'activity_balance',
            priority: 'medium',
            message: 'You\'re spending a lot of time on research.',
            actionable: 'Balance research with more applications. Aim for 20-30% research, 40-50% applications.'
          });
        }
      }
    }

    // Optimal scheduling recommendation
    recommendations.push({
      type: 'scheduling',
      priority: 'low',
      message: 'Most job seekers have best results applying Monday-Wednesday mornings.',
      actionable: 'Try scheduling your application time for 9-11 AM on Mondays through Wednesdays.'
    });

    return recommendations;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get industry average salary (placeholder - can be enhanced with real industry data)
   */
  getIndustryAverageSalary(industry) {
    // Placeholder industry averages - can be replaced with real industry data
    const industryAverages = {
      "Technology": 120000,
      "Finance": 110000,
      "Healthcare": 95000,
      "Education": 60000,
      "Manufacturing": 75000,
      "Retail": 45000,
      "Consulting": 130000,
      "Engineering": 115000,
      "Sales": 70000,
      "Marketing": 80000,
      "Design": 75000,
    };

    // Normalize industry name for lookup
    const normalizedIndustry = industry 
      ? industry.toLowerCase().replace(/[^a-z0-9]/g, '')
      : '';

    for (const [key, value] of Object.entries(industryAverages)) {
      if (normalizedIndustry.includes(key.toLowerCase())) {
        return value;
      }
    }

    // Default average if industry not found
    return 75000;
  }

  /**
   * Parse date range object
   */
  parseDateRange(dateRange) {
    return {
      startDate: dateRange.startDate || null,
      endDate: dateRange.endDate || null,
    };
  }
}

export default new AnalyticsService();
