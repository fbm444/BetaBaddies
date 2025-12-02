/**
 * Report Routes
 * API endpoints for report generation
 */

import express from "express";
import reportController from "../controllers/reportController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All report routes require authentication
router.use(isAuthenticated);

/**
 * GET /api/v1/reports/templates
 * Get available report templates
 */
router.get("/templates", reportController.getTemplates.bind(reportController));

/**
 * GET /api/v1/reports/filter-options
 * Get available filter options for user's data
 */
router.get(
  "/filter-options",
  reportController.getFilterOptions.bind(reportController)
);

/**
 * POST /api/v1/reports/generate
 * Generate a report
 * Body: { templateId?, dateRange?, filters?, metrics?, format: 'pdf'|'csv', includeAI: boolean }
 */
router.post("/generate", reportController.generateReport.bind(reportController));

/**
 * POST /api/v1/reports/preview
 * Preview report data without generating file
 * Body: { templateId?, dateRange?, filters?, metrics? }
 */
router.post("/preview", reportController.previewReport.bind(reportController));

/**
 * GET /api/v1/reports/executive-summary
 * Get quick executive summary
 * Query: { dateRange?: 'last_7_days'|'last_30_days'|'all_time' }
 */
router.get(
  "/executive-summary",
  reportController.getExecutiveSummary.bind(reportController)
);

export default router;

