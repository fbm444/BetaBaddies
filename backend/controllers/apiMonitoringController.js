import { asyncHandler } from "../middleware/errorHandler.js";
import apiMonitoringService from "../services/apiMonitoringService.js";

/**
 * API Monitoring Controller
 * Provides endpoints for administrators to monitor API usage
 */
class ApiMonitoringController {
  /**
   * Get API usage statistics
   * GET /api/v1/admin/api-monitoring/stats
   */
  getUsageStats = asyncHandler(async (req, res) => {
    const { serviceName, startDate, endDate } = req.query;

    const stats = await apiMonitoringService.getUsageStats(
      serviceName || null,
      startDate || null,
      endDate || null
    );

    // Transform stats to match frontend expectations
    const transformedStats = stats.map((stat) => ({
      service_name: stat.service_name,
      display_name: stat.display_name,
      total_requests: parseInt(stat.total_requests || 0),
      successful_requests: parseInt(stat.successful_requests || 0),
      failed_requests: parseInt(stat.failed_requests || 0),
      total_tokens_used: parseInt(stat.total_tokens || 0),
      total_cost_usd: parseFloat(stat.total_cost || 0),
      avg_response_time_ms: parseFloat(stat.avg_response_time || 0),
    }));

    res.status(200).json({
      ok: true,
      data: {
        stats: transformedStats,
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    });
  });

  /**
   * Get remaining quota for all services
   * GET /api/v1/admin/api-monitoring/quotas
   */
  getQuotas = asyncHandler(async (req, res) => {
    const { serviceName, periodType = "daily" } = req.query;

    if (serviceName) {
      const quota = await apiMonitoringService.getRemainingQuota(serviceName, periodType);
      if (!quota) {
        return res.status(200).json({
          ok: true,
          data: { quotas: [] },
        });
      }
      // Transform quota to match frontend expectations
      const transformedQuota = {
        service_name: quota.serviceName,
        display_name: quota.displayName,
        period_type: quota.periodType,
        requests_count: quota.used || 0,
        requests_limit: quota.limit || 0,
        tokens_used: quota.tokensUsed || 0,
        tokens_limit: 0,
        cost_usd: quota.costUsed || 0,
        cost_limit_usd: 0,
        remaining_requests: quota.remaining !== null ? quota.remaining : null,
        remaining_tokens: null,
        usage_percentage: quota.percentage !== null ? quota.percentage : 0,
      };
      return res.status(200).json({
        ok: true,
        data: { quotas: [transformedQuota] },
      });
    }

    // Get quotas for all services - if periodType is "all", get hourly, daily, and monthly
    const services = ["openai", "abstract_api", "newsapi", "bls", "gmail"];
    const quotas = [];
    const periodTypes = periodType === "all" ? ["hourly", "daily", "monthly"] : [periodType];

    for (const service of services) {
      for (const period of periodTypes) {
        const quota = await apiMonitoringService.getRemainingQuota(service, period);
        if (quota) {
          quotas.push({
            service_name: quota.serviceName,
            display_name: quota.displayName,
            period_type: quota.periodType,
            requests_count: quota.used || 0,
            requests_limit: quota.limit || 0,
            tokens_used: quota.tokensUsed || 0,
            tokens_limit: 0,
            cost_usd: quota.costUsed || 0,
            cost_limit_usd: 0,
            remaining_requests: quota.remaining !== null ? quota.remaining : null,
            remaining_tokens: null,
            usage_percentage: quota.percentage !== null ? quota.percentage : 0,
          });
        }
      }
    }

    res.status(200).json({
      ok: true,
      data: { quotas },
    });
  });

  /**
   * Get recent API errors
   * GET /api/v1/admin/api-monitoring/errors
   */
  getRecentErrors = asyncHandler(async (req, res) => {
    const { serviceName, limit = 50 } = req.query;

    const errors = await apiMonitoringService.getRecentErrors(
      serviceName || null,
      parseInt(limit)
    );

    res.status(200).json({
      ok: true,
      data: {
        errors,
        count: errors.length,
      },
    });
  });

  /**
   * Get active alerts
   * GET /api/v1/admin/api-monitoring/alerts
   */
  getActiveAlerts = asyncHandler(async (req, res) => {
    const { serviceName } = req.query;

    const alerts = await apiMonitoringService.getActiveAlerts(serviceName || null);

    res.status(200).json({
      ok: true,
      data: {
        alerts,
        count: alerts.length,
      },
    });
  });

  /**
   * Resolve an alert
   * PATCH /api/v1/admin/api-monitoring/alerts/:alertId/resolve
   */
  resolveAlert = asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const database = (await import("../services/database.js")).default;

    const result = await database.query(
      `UPDATE api_alerts 
       SET is_resolved = true, resolved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [alertId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Alert not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        alert: result.rows[0],
        message: "Alert resolved",
      },
    });
  });

  /**
   * Get response time metrics
   * GET /api/v1/admin/api-monitoring/response-times
   */
  getResponseTimes = asyncHandler(async (req, res) => {
    const { serviceName, startDate, endDate, limit = 1000 } = req.query;
    const database = (await import("../services/database.js")).default;

    // Query to get per-service aggregated metrics (main view)
    let query = `
      SELECT 
        s.service_name,
        s.display_name,
        AVG(rt.response_time_ms) as avg_response_time,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rt.response_time_ms) as p50_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY rt.response_time_ms) as p95_response_time,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY rt.response_time_ms) as p99_response_time,
        MIN(rt.response_time_ms) as min_response_time,
        MAX(rt.response_time_ms) as max_response_time,
        COUNT(*) as request_count
      FROM api_response_times rt
      JOIN api_services s ON rt.service_id = s.id
    `;

    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (serviceName) {
      conditions.push(`s.service_name = $${paramCount++}`);
      params.push(serviceName);
    }

    if (startDate) {
      conditions.push(`rt.created_at >= $${paramCount++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`rt.created_at <= $${paramCount++}`);
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // Group by service only (per-API aggregation)
    query += ` GROUP BY s.id, s.service_name, s.display_name
               ORDER BY avg_response_time DESC
               LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    console.log("Executing response times query:", query);
    console.log("Query params:", params);
    
    const result = await database.query(query, params);

    console.log("Response times query result:", result.rows.length, "rows");

    // Transform the results to ensure proper numeric types
    const metrics = result.rows.map(row => {
      const metric = {
        service_name: row.service_name,
        display_name: row.display_name,
        endpoint: null, // Not grouping by endpoint anymore
        avg_response_time: parseFloat(row.avg_response_time) || 0,
        p50_response_time: parseFloat(row.p50_response_time) || 0,
        p95_response_time: parseFloat(row.p95_response_time) || 0,
        p99_response_time: parseFloat(row.p99_response_time) || 0,
        min_response_time: parseFloat(row.min_response_time) || 0,
        max_response_time: parseFloat(row.max_response_time) || 0,
        request_count: parseInt(row.request_count) || 0,
      };
      console.log("Processed metric:", metric);
      return metric;
    });

    res.status(200).json({
      ok: true,
      data: {
        metrics,
        count: metrics.length,
      },
    });
  });

  /**
   * Generate weekly report
   * POST /api/v1/admin/api-monitoring/reports/weekly
   */
  generateWeeklyReport = asyncHandler(async (req, res) => {
    const { serviceName } = req.body;

    const reports = await apiMonitoringService.generateWeeklyReport(serviceName || null);

    res.status(200).json({
      ok: true,
      data: {
        reports,
        count: reports.length,
        generatedAt: new Date().toISOString(),
      },
    });
  });

  /**
   * Get weekly reports
   * GET /api/v1/admin/api-monitoring/reports/weekly
   */
  getWeeklyReports = asyncHandler(async (req, res) => {
    const { serviceName, weeks = 4 } = req.query;

    const reports = await apiMonitoringService.getWeeklyReports(
      serviceName || null,
      parseInt(weeks)
    );

    res.status(200).json({
      ok: true,
      data: {
        reports,
        count: reports.length,
      },
    });
  });

  /**
   * Get dashboard summary
   * GET /api/v1/admin/api-monitoring/dashboard
   * Query params: period (optional) - 'last_7_days', 'last_30_days', 'last_90_days', or 'all_time' (default)
   */
  getDashboard = asyncHandler(async (req, res) => {
    // Parse date range from query params
    const { period = "all_time" } = req.query;
    let startDate = null;
    let endDate = null;

    if (period === "last_7_days") {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "last_30_days") {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === "last_90_days") {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
    }
    // else: all_time - startDate and endDate remain null to get all historical data

    console.log(`📊 Dashboard request - Period: ${period}, StartDate: ${startDate?.toISOString() || 'all_time'}, EndDate: ${endDate?.toISOString() || 'all_time'}`);

      const [stats, quotas, errors, alerts] = await Promise.all([
      apiMonitoringService.getUsageStats(null, startDate, endDate),
      Promise.all([
        // Get hourly, daily, and monthly quotas for all services
        apiMonitoringService.getRemainingQuota("openai", "hourly"),
        apiMonitoringService.getRemainingQuota("openai", "daily"),
        apiMonitoringService.getRemainingQuota("openai", "monthly"),
        apiMonitoringService.getRemainingQuota("abstract_api", "hourly"),
        apiMonitoringService.getRemainingQuota("abstract_api", "daily"),
        apiMonitoringService.getRemainingQuota("abstract_api", "monthly"),
        apiMonitoringService.getRemainingQuota("newsapi", "hourly"),
        apiMonitoringService.getRemainingQuota("newsapi", "daily"),
        apiMonitoringService.getRemainingQuota("newsapi", "monthly"),
        apiMonitoringService.getRemainingQuota("bls", "hourly"),
        apiMonitoringService.getRemainingQuota("bls", "daily"),
        apiMonitoringService.getRemainingQuota("bls", "monthly"),
        apiMonitoringService.getRemainingQuota("gmail", "hourly"),
        apiMonitoringService.getRemainingQuota("gmail", "daily"),
        apiMonitoringService.getRemainingQuota("gmail", "monthly"),
      ]).then((results) => results.filter((q) => q !== null)),
      apiMonitoringService.getRecentErrors(null, 10),
      apiMonitoringService.getActiveAlerts(null),
    ]);

    // Transform stats to match frontend expectations
    const transformedStats = stats.map((stat) => ({
      service_name: stat.service_name,
      display_name: stat.display_name,
      total_requests: parseInt(stat.total_requests || 0),
      successful_requests: parseInt(stat.successful_requests || 0),
      failed_requests: parseInt(stat.failed_requests || 0),
      total_tokens_used: parseInt(stat.total_tokens || 0),
      total_cost_usd: parseFloat(stat.total_cost || 0),
      avg_response_time_ms: parseFloat(stat.avg_response_time || 0),
    }));

    // Transform quotas to match frontend expectations
    const transformedQuotas = quotas.map((quota) => ({
      service_name: quota.serviceName,
      display_name: quota.displayName,
      period_type: quota.periodType,
      requests_count: quota.used || 0,
      requests_limit: quota.limit || 0,
      tokens_used: quota.tokensUsed || 0,
      tokens_limit: 0, // Not tracked per period
      cost_usd: quota.costUsed || 0,
      cost_limit_usd: 0, // Not tracked per period
      remaining_requests: quota.remaining !== null ? quota.remaining : null,
      remaining_tokens: null,
      usage_percentage: quota.percentage !== null ? quota.percentage : 0,
    }));

    res.status(200).json({
      ok: true,
      data: {
        stats: transformedStats,
        quotas: transformedQuotas,
        recentErrors: errors.slice(0, 10),
        activeAlerts: alerts,
        summary: {
          totalServices: stats.length,
          totalRequests: stats.reduce((sum, s) => sum + parseInt(s.total_requests || 0), 0),
          totalErrors: errors.length,
          activeAlertsCount: alerts.length,
          period: {
            type: period || "all_time",
            startDate: startDate ? startDate.toISOString() : null,
            endDate: endDate ? endDate.toISOString() : null,
          },
        },
      },
    });
  });
}

export default new ApiMonitoringController();

