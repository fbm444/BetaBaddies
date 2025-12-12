import database from "./database.js";

/**
 * API Monitoring Service
 * Tracks API usage, errors, quotas, and response times
 */
class ApiMonitoringService {
  constructor() {
    this.serviceCache = new Map();
  }

  /**
   * Get or cache API service by name
   */
  async getServiceByName(serviceName) {
    if (this.serviceCache.has(serviceName)) {
      return this.serviceCache.get(serviceName);
    }

    const result = await database.query(
      "SELECT * FROM api_services WHERE service_name = $1",
      [serviceName]
    );

    if (result.rows.length === 0) {
      // Auto-create service if it doesn't exist
      const insertResult = await database.query(
        `INSERT INTO api_services (service_name, display_name, is_active)
         VALUES ($1, $2, true)
         RETURNING *`,
        [serviceName, serviceName.replace(/_/g, " ").toUpperCase()]
      );
      const service = insertResult.rows[0];
      this.serviceCache.set(serviceName, service);
      return service;
    }

    const service = result.rows[0];
    this.serviceCache.set(serviceName, service);
    return service;
  }

  /**
   * Log API usage
   */
  async logUsage({
    serviceName,
    endpoint,
    userId = null,
    requestMethod = null,
    responseStatus = null,
    responseTimeMs = null,
    tokensUsed = null,
    costUsd = null,
    success = true,
  }) {
    try {
      const service = await this.getServiceByName(serviceName);

      await database.query(
        `INSERT INTO api_usage_logs 
         (service_id, endpoint, user_id, request_method, response_status, 
          response_time_ms, tokens_used, cost_usd, success)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          service.id,
          endpoint,
          userId,
          requestMethod,
          responseStatus,
          responseTimeMs,
          tokensUsed,
          costUsd || 0,
          success,
        ]
      );

      // Log response time for performance monitoring
      if (responseTimeMs !== null) {
        await database.query(
          `INSERT INTO api_response_times (service_id, endpoint, response_time_ms)
           VALUES ($1, $2, $3)`,
          [service.id, endpoint, responseTimeMs]
        );
      }

      // Update quota tracking
      await this.updateQuota(service.id, {
        tokensUsed: tokensUsed || 0,
        costUsd: costUsd || 0,
      });

      // Check for rate limit warnings
      await this.checkRateLimits(service.id);
    } catch (error) {
      console.error("❌ Error logging API usage:", error);
      // Don't throw - monitoring shouldn't break the app
    }
  }

  /**
   * Log API error
   */
  async logError({
    serviceName,
    endpoint,
    userId = null,
    errorCode,
    errorMessage,
    errorDetails = null,
    requestPayload = null,
    responseStatus = null,
  }) {
    try {
      const service = await this.getServiceByName(serviceName);

      await database.query(
        `INSERT INTO api_error_logs 
         (service_id, endpoint, user_id, error_code, error_message, 
          error_details, request_payload, response_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          service.id,
          endpoint,
          userId,
          errorCode,
          errorMessage,
          errorDetails ? JSON.stringify(errorDetails) : null,
          requestPayload ? JSON.stringify(requestPayload) : null,
          responseStatus,
        ]
      );

      // Create alert for critical errors
      if (errorCode === "RATE_LIMIT" || errorCode === "QUOTA_EXCEEDED") {
        await this.createAlert({
          serviceId: service.id,
          alertType: errorCode.toLowerCase(),
          severity: "critical",
          message: errorMessage,
        });
      }
    } catch (error) {
      console.error("❌ Error logging API error:", error);
    }
  }

  /**
   * Update quota tracking
   */
  async updateQuota(serviceId, { tokensUsed = 0, costUsd = 0 }) {
    const now = new Date();
    const periods = [
      {
        type: "hourly",
        start: new Date(now.setMinutes(0, 0, 0)),
        end: new Date(now.getTime() + 60 * 60 * 1000),
      },
      {
        type: "daily",
        start: new Date(now.setHours(0, 0, 0, 0)),
        end: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
      {
        type: "monthly",
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      },
    ];

    for (const period of periods) {
      await database.query(
        `INSERT INTO api_quotas 
         (service_id, period_type, period_start, period_end, requests_count, 
          tokens_used, cost_usd)
         VALUES ($1, $2, $3, $4, 1, $5, $6)
         ON CONFLICT (service_id, period_type, period_start)
         DO UPDATE SET 
           requests_count = api_quotas.requests_count + 1,
           tokens_used = api_quotas.tokens_used + $5,
           cost_usd = api_quotas.cost_usd + $6,
           updated_at = NOW()`,
        [
          serviceId,
          period.type,
          period.start,
          period.end,
          tokensUsed,
          costUsd,
        ]
      );
    }
  }

  /**
   * Check rate limits and create alerts if approaching limits
   */
  async checkRateLimits(serviceId) {
    try {
      const serviceResult = await database.query(
        "SELECT * FROM api_services WHERE id = $1",
        [serviceId]
      );
      if (serviceResult.rows.length === 0) return;

      const service = serviceResult.rows[0];
      const now = new Date();

      // Check daily quota
      if (service.rate_limit_per_day > 0) {
        const dailyStart = new Date(now.setHours(0, 0, 0, 0));
        const quotaResult = await database.query(
          `SELECT requests_count FROM api_quotas
           WHERE service_id = $1 AND period_type = 'daily' 
           AND period_start = $2`,
          [serviceId, dailyStart]
        );

        if (quotaResult.rows.length > 0) {
          const current = quotaResult.rows[0].requests_count;
          const limit = service.rate_limit_per_day;
          const percentage = (current / limit) * 100;

          // Alert at 80% and 95%
          if (percentage >= 80 && percentage < 95) {
            await this.createAlert({
              serviceId,
              alertType: "rate_limit_warning",
              severity: "warning",
              message: `Approaching daily rate limit: ${current}/${limit} requests (${percentage.toFixed(1)}%)`,
              thresholdValue: 80,
              currentValue: percentage,
            });
          } else if (percentage >= 95) {
            await this.createAlert({
              serviceId,
              alertType: "rate_limit_warning",
              severity: "critical",
              message: `Near daily rate limit: ${current}/${limit} requests (${percentage.toFixed(1)}%)`,
              thresholdValue: 95,
              currentValue: percentage,
            });
          }
        }
      }

      // Check monthly quota
      if (service.quota_limit_per_month > 0) {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const quotaResult = await database.query(
          `SELECT requests_count FROM api_quotas
           WHERE service_id = $1 AND period_type = 'monthly' 
           AND period_start = $2`,
          [serviceId, monthStart]
        );

        if (quotaResult.rows.length > 0) {
          const current = quotaResult.rows[0].requests_count;
          const limit = service.quota_limit_per_month;
          const percentage = (current / limit) * 100;

          if (percentage >= 80) {
            await this.createAlert({
              serviceId,
              alertType: "quota_warning",
              severity: percentage >= 95 ? "critical" : "warning",
              message: `Monthly quota: ${current}/${limit} requests (${percentage.toFixed(1)}%)`,
              thresholdValue: 80,
              currentValue: percentage,
            });
          }
        }
      }
    } catch (error) {
      console.error("❌ Error checking rate limits:", error);
    }
  }

  /**
   * Create an alert
   */
  async createAlert({
    serviceId,
    alertType,
    severity = "warning",
    message,
    thresholdValue = null,
    currentValue = null,
  }) {
    try {
      // Check if similar unresolved alert exists
      const existing = await database.query(
        `SELECT id FROM api_alerts
         WHERE service_id = $1 AND alert_type = $2 
         AND is_resolved = false
         AND created_at > NOW() - INTERVAL '1 hour'`,
        [serviceId, alertType]
      );

      if (existing.rows.length > 0) {
        return; // Don't create duplicate alerts
      }

      await database.query(
        `INSERT INTO api_alerts 
         (service_id, alert_type, severity, message, threshold_value, current_value)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [serviceId, alertType, severity, message, thresholdValue, currentValue]
      );
    } catch (error) {
      console.error("❌ Error creating alert:", error);
    }
  }

  /**
   * Get API usage statistics
   */
  async getUsageStats(serviceName = null, startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          s.service_name,
          s.display_name,
          COUNT(u.id) as total_requests,
          COUNT(CASE WHEN u.success = true THEN 1 END) as successful_requests,
          COUNT(CASE WHEN u.success = false THEN 1 END) as failed_requests,
          COALESCE(SUM(u.tokens_used), 0) as total_tokens,
          COALESCE(SUM(u.cost_usd), 0) as total_cost,
          COALESCE(AVG(u.response_time_ms), 0) as avg_response_time,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY u.response_time_ms) as p95_response_time,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY u.response_time_ms) as p99_response_time
        FROM api_services s
        LEFT JOIN api_usage_logs u ON s.id = u.service_id
      `;

      const conditions = [];
      const params = [];
      let paramCount = 1;

      if (serviceName) {
        conditions.push(`s.service_name = $${paramCount++}`);
        params.push(serviceName);
      }

      if (startDate) {
        conditions.push(`u.created_at >= $${paramCount++}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`u.created_at <= $${paramCount++}`);
        params.push(endDate);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }

      query += ` GROUP BY s.id, s.service_name, s.display_name
                 ORDER BY s.service_name`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting usage stats:", error);
      return [];
    }
  }

  /**
   * Get remaining quota for a service
   */
  async getRemainingQuota(serviceName, periodType = "daily") {
    try {
      const service = await this.getServiceByName(serviceName);
      const now = new Date();

      let periodStart, periodEnd, limit;
      if (periodType === "daily") {
        periodStart = new Date(now.setHours(0, 0, 0, 0));
        periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
        limit = service.rate_limit_per_day;
      } else if (periodType === "monthly") {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        limit = service.quota_limit_per_month;
      } else {
        return null;
      }

      const quotaResult = await database.query(
        `SELECT requests_count, tokens_used, cost_usd
         FROM api_quotas
         WHERE service_id = $1 AND period_type = $2 AND period_start = $3`,
        [service.id, periodType, periodStart]
      );

      const used = quotaResult.rows.length > 0 ? quotaResult.rows[0].requests_count : 0;
      const tokensUsed = quotaResult.rows.length > 0 ? quotaResult.rows[0].tokens_used : 0;
      const costUsed = quotaResult.rows.length > 0 ? parseFloat(quotaResult.rows[0].cost_usd) : 0;

      return {
        serviceName: service.service_name,
        displayName: service.display_name,
        periodType,
        used,
        limit: limit || 0,
        remaining: limit > 0 ? Math.max(0, limit - used) : null,
        percentage: limit > 0 ? (used / limit) * 100 : null,
        tokensUsed,
        costUsed,
      };
    } catch (error) {
      console.error("❌ Error getting remaining quota:", error);
      return null;
    }
  }

  /**
   * Get recent API errors
   */
  async getRecentErrors(serviceName = null, limit = 50) {
    try {
      let query = `
        SELECT 
          e.id,
          s.service_name,
          s.display_name,
          e.endpoint,
          e.error_code,
          e.error_message,
          e.error_details,
          e.response_status,
          e.created_at
        FROM api_error_logs e
        JOIN api_services s ON e.service_id = s.id
      `;

      const params = [];
      if (serviceName) {
        query += ` WHERE s.service_name = $1`;
        params.push(serviceName);
      }

      query += ` ORDER BY e.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting recent errors:", error);
      return [];
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(serviceName = null) {
    try {
      let query = `
        SELECT 
          a.id,
          s.service_name,
          s.display_name,
          a.alert_type,
          a.severity,
          a.message,
          a.threshold_value,
          a.current_value,
          a.created_at
        FROM api_alerts a
        JOIN api_services s ON a.service_id = s.id
        WHERE a.is_resolved = false
      `;

      const params = [];
      if (serviceName) {
        query += ` AND s.service_name = $1`;
        params.push(serviceName);
      }

      query += ` ORDER BY 
        CASE a.severity 
          WHEN 'critical' THEN 1 
          WHEN 'warning' THEN 2 
          ELSE 3 
        END,
        a.created_at DESC`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting active alerts:", error);
      return [];
    }
  }

  /**
   * Generate weekly report
   */
  async generateWeeklyReport(serviceName = null) {
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const services = serviceName
        ? [await this.getServiceByName(serviceName)]
        : await database.query("SELECT * FROM api_services WHERE is_active = true").then((r) => r.rows);

      const reports = [];

      for (const service of services) {
        const stats = await this.getUsageStats(service.service_name, weekStart, weekEnd);
        const statsData = stats.find((s) => s.service_name === service.service_name) || {
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          total_tokens: 0,
          total_cost: 0,
          avg_response_time: 0,
          p95_response_time: 0,
          p99_response_time: 0,
        };

        const errors = await this.getRecentErrors(service.service_name, 100);
        const weekErrors = errors.filter(
          (e) => new Date(e.created_at) >= weekStart && new Date(e.created_at) < weekEnd
        );

        const reportData = {
          serviceName: service.service_name,
          displayName: service.display_name,
          weekStart: weekStart.toISOString().split("T")[0],
          weekEnd: weekEnd.toISOString().split("T")[0],
          totalRequests: parseInt(statsData.total_requests) || 0,
          successfulRequests: parseInt(statsData.successful_requests) || 0,
          failedRequests: parseInt(statsData.failed_requests) || 0,
          totalTokensUsed: parseInt(statsData.total_tokens) || 0,
          totalCostUsd: parseFloat(statsData.total_cost) || 0,
          avgResponseTimeMs: parseFloat(statsData.avg_response_time) || 0,
          p95ResponseTimeMs: parseFloat(statsData.p95_response_time) || 0,
          p99ResponseTimeMs: parseFloat(statsData.p99_response_time) || 0,
          errorCount: weekErrors.length,
          rateLimitHits: weekErrors.filter((e) => e.error_code === "RATE_LIMIT").length,
          errors: weekErrors.slice(0, 10), // Top 10 errors
        };

        // Save report to database
        await database.query(
          `INSERT INTO api_usage_reports 
           (service_id, report_week_start, report_week_end, total_requests, 
            successful_requests, failed_requests, total_tokens_used, total_cost_usd,
            avg_response_time_ms, p95_response_time_ms, p99_response_time_ms,
            error_count, rate_limit_hits, report_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (service_id, report_week_start)
           DO UPDATE SET
             total_requests = EXCLUDED.total_requests,
             successful_requests = EXCLUDED.successful_requests,
             failed_requests = EXCLUDED.failed_requests,
             total_tokens_used = EXCLUDED.total_tokens_used,
             total_cost_usd = EXCLUDED.total_cost_usd,
             avg_response_time_ms = EXCLUDED.avg_response_time_ms,
             p95_response_time_ms = EXCLUDED.p95_response_time_ms,
             p99_response_time_ms = EXCLUDED.p99_response_time_ms,
             error_count = EXCLUDED.error_count,
             rate_limit_hits = EXCLUDED.rate_limit_hits,
             report_data = EXCLUDED.report_data`,
          [
            service.id,
            weekStart,
            weekEnd,
            reportData.totalRequests,
            reportData.successfulRequests,
            reportData.failedRequests,
            reportData.totalTokensUsed,
            reportData.totalCostUsd,
            reportData.avgResponseTimeMs,
            reportData.p95ResponseTimeMs,
            reportData.p99ResponseTimeMs,
            reportData.errorCount,
            reportData.rateLimitHits,
            JSON.stringify(reportData),
          ]
        );

        reports.push(reportData);
      }

      return reports;
    } catch (error) {
      console.error("❌ Error generating weekly report:", error);
      throw error;
    }
  }

  /**
   * Get weekly reports
   */
  async getWeeklyReports(serviceName = null, weeks = 4) {
    try {
      let query = `
        SELECT 
          r.*,
          s.service_name,
          s.display_name
        FROM api_usage_reports r
        JOIN api_services s ON r.service_id = s.id
      `;

      const params = [];
      if (serviceName) {
        query += ` WHERE s.service_name = $1`;
        params.push(serviceName);
      }

      query += ` ORDER BY r.report_week_start DESC LIMIT $${params.length + 1}`;
      params.push(weeks);

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting weekly reports:", error);
      return [];
    }
  }
}

export default new ApiMonitoringService();

