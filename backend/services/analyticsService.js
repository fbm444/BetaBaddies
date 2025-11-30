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

      // Key metrics query
      const metricsQuery = `
        SELECT 
          COUNT(*) as total_applications,
          COUNT(CASE WHEN status = 'Applied' THEN 1 END) as applications_sent,
          COUNT(CASE WHEN status IN ('Phone Screen', 'Interview') THEN 1 END) as interviews_scheduled,
          COUNT(CASE WHEN status = 'Offer' THEN 1 END) as offers_received,
          COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejections,
          COUNT(CASE WHEN status = 'Interested' THEN 1 END) as interested
        FROM job_opportunities
        WHERE user_id = $1 AND (archived = false OR archived IS NULL) ${dateFilter}
      `;

      const metricsResult = await database.query(metricsQuery, queryParams);
      const metrics = metricsResult.rows[0];

      // Calculate conversion rates
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

      // Monthly volume trends
      const monthlyVolume = await this.getMonthlyVolume(userId, startDate, endDate);

      return {
        keyMetrics: {
          totalApplications: parseInt(metrics.total_applications) || 0,
          applicationsSent,
          interviewsScheduled,
          offersReceived,
          rejections: parseInt(metrics.rejections) || 0,
          interested: parseInt(metrics.interested) || 0,
        },
        conversionRates: {
          applicationToInterview: applicationToInterviewRate,
          interviewToOffer: interviewToOfferRate,
          overallSuccess: overallSuccessRate,
        },
        timeMetrics: {
          avgDaysToResponse,
          responsesReceived,
          avgDaysToInterview,
          interviewsScheduledCount,
        },
        monthlyVolume,
        benchmarks: this.industryBenchmarks,
      };
    } catch (error) {
      console.error("❌ Error getting job search performance:", error);
      throw error;
    }
  }

  /**
   * Get monthly application volume
   */
  async getMonthlyVolume(userId, startDate, endDate) {
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

      const query = `
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*) as count
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

      // Generate recommendations
      const recommendations = this.generateSuccessRecommendations({
        byIndustry,
        bySource,
        byMethod,
      });

      return {
        byIndustry,
        bySource,
        byMethod,
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

      // Salary offers over time
      const salaryOffersQuery = `
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          AVG(salary_min) as avg_min,
          AVG(salary_max) as avg_max,
          COUNT(*) as offer_count
        FROM job_opportunities
        WHERE user_id = $1 
          AND status = 'Offer' 
          AND (salary_min IS NOT NULL OR salary_max IS NOT NULL)
          AND (archived = false OR archived IS NULL)
          ${dateFilter}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month ASC
      `;

      const salaryResult = await database.query(salaryOffersQuery, params);
      const salaryProgression = salaryResult.rows.map((row) => ({
        month: row.month,
        avgMin: row.avg_min ? Math.round(row.avg_min) : null,
        avgMax: row.avg_max ? Math.round(row.avg_max) : null,
        offerCount: parseInt(row.offer_count) || 0,
      }));

      // Salary by industry
      const byIndustryQuery = `
        SELECT 
          industry,
          AVG(salary_min) as avg_min,
          AVG(salary_max) as avg_max,
          COUNT(*) as count
        FROM job_opportunities
        WHERE user_id = $1 
          AND status = 'Offer' 
          AND industry IS NOT NULL
          AND (salary_min IS NOT NULL OR salary_max IS NOT NULL)
          AND (archived = false OR archived IS NULL)
          ${dateFilter}
        GROUP BY industry
        ORDER BY avg_max DESC NULLS LAST
      `;

      const industryResult = await database.query(byIndustryQuery, params);
      const byIndustry = industryResult.rows.map((row) => ({
        industry: row.industry,
        avgMin: row.avg_min ? Math.round(row.avg_min) : null,
        avgMax: row.avg_max ? Math.round(row.avg_max) : null,
        count: parseInt(row.count) || 0,
      }));

      return {
        progression: salaryProgression,
        byIndustry,
      };
    } catch (error) {
      console.error("❌ Error getting salary progression:", error);
      throw error;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

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
