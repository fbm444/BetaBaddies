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

    res.status(200).json({
      ok: true,
      data: {
        stats,
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
      return res.status(200).json({
        ok: true,
        data: { quota },
      });
    }

    // Get quotas for all services
    const services = ["openai", "abstract_api", "newsapi", "bls"];
    const quotas = [];

    for (const service of services) {
      const quota = await apiMonitoringService.getRemainingQuota(service, periodType);
      if (quota) {
        quotas.push(quota);
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

    let query = `
      SELECT 
        s.service_name,
        s.display_name,
        rt.endpoint,
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

    query += ` GROUP BY s.id, s.service_name, s.display_name, rt.endpoint
               ORDER BY avg_response_time DESC
               LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await database.query(query, params);

    res.status(200).json({
      ok: true,
      data: {
        metrics: result.rows,
        count: result.rows.length,
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
   */
  getDashboard = asyncHandler(async (req, res) => {
    // Get stats for last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const [stats, quotas, errors, alerts] = await Promise.all([
      apiMonitoringService.getUsageStats(null, startDate, endDate),
      Promise.all([
        apiMonitoringService.getRemainingQuota("openai", "daily"),
        apiMonitoringService.getRemainingQuota("abstract_api", "daily"),
        apiMonitoringService.getRemainingQuota("newsapi", "daily"),
        apiMonitoringService.getRemainingQuota("bls", "daily"),
      ]).then((results) => results.filter((q) => q !== null)),
      apiMonitoringService.getRecentErrors(null, 10),
      apiMonitoringService.getActiveAlerts(null),
    ]);

    res.status(200).json({
      ok: true,
      data: {
        stats,
        quotas,
        recentErrors: errors.slice(0, 10),
        activeAlerts: alerts,
        summary: {
          totalServices: stats.length,
          totalRequests: stats.reduce((sum, s) => sum + parseInt(s.total_requests || 0), 0),
          totalErrors: errors.length,
          activeAlertsCount: alerts.length,
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
      },
    });
  });
}

export default new ApiMonitoringController();

