/**
 * Report Controller
 * Handles report generation endpoints
 */

import reportDataService from "../services/reportDataService.js";
import reportAIService from "../services/reportAIService.js";
import reportExportService from "../services/reportExportService.js";

// Report templates configuration
const REPORT_TEMPLATES = {
  "weekly-summary": {
    name: "Weekly Performance Summary",
    description: "Quick overview of the past 7 days",
    defaultDateRange: "last_7_days",
    defaultMetrics: ["performance", "timeline", "time_investment"],
    aiPromptFocus: "weekly momentum and immediate action items",
  },
  "monthly-deep-dive": {
    name: "Monthly Deep Dive",
    description: "Comprehensive analysis of the past 30 days",
    defaultDateRange: "last_30_days",
    defaultMetrics: ["performance", "timeline", "success_patterns", "time_investment", "predictions"],
    aiPromptFocus: "comprehensive analysis with strategic recommendations",
  },
  "industry-comparison": {
    name: "Industry Performance Comparison",
    description: "Compare your success across different industries",
    defaultDateRange: "all_time",
    defaultMetrics: ["performance", "success_patterns"],
    aiPromptFocus: "which industries to focus on and why",
  },
  "preparation-effectiveness": {
    name: "Preparation ROI Analysis",
    description: "Analyze where your preparation time has the most impact",
    defaultDateRange: "all_time",
    defaultMetrics: ["time_investment", "preparation", "success_patterns"],
    aiPromptFocus: "where to invest time for maximum results",
  },
  "mentor-share": {
    name: "Mentor/Coach Report",
    description: "Concise summary perfect for sharing with mentors",
    defaultDateRange: "last_30_days",
    defaultMetrics: ["performance", "success_patterns", "predictions"],
    aiPromptFocus: "discussion points and areas needing guidance",
  },
};

class ReportController {
  /**
   * Get available report templates
   */
  async getTemplates(req, res) {
    try {
      res.json({
        templates: REPORT_TEMPLATES,
      });
    } catch (error) {
      console.error("Error getting templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  }

  /**
   * Get filter options for user's data
   */
  async getFilterOptions(req, res) {
    try {
      const userId = req.session.userId;
      const options = await reportDataService.getFilterOptions(userId);

      res.json({
        options,
      });
    } catch (error) {
      console.error("Error getting filter options:", error);
      res.status(500).json({ error: "Failed to fetch filter options" });
    }
  }

  /**
   * Generate a report
   */
  async generateReport(req, res) {
    try {
      const userId = req.session.userId;
      const {
        templateId,
        dateRange,
        filters,
        metrics,
        format = "pdf",
        includeAI = true,
      } = req.body;

      // Get template config if using a template
      const templateConfig = templateId ? REPORT_TEMPLATES[templateId] : {};

      // Build report configuration
      const reportConfig = {
        dateRange: this.parseDateRange(dateRange, templateConfig.defaultDateRange),
        filters: filters || {},
        metrics: metrics || templateConfig.defaultMetrics || [
          "performance",
          "timeline",
          "success_patterns",
          "time_investment",
        ],
      };

      console.log("Generating report for user:", userId);
      console.log("Report config:", reportConfig);

      // Step 1: Aggregate data
      const reportData = await reportDataService.aggregateReportData(
        userId,
        reportConfig
      );

      console.log("Report data aggregated successfully");

      // Step 2: Generate AI narrative if requested
      let aiNarrative = null;
      if (includeAI) {
        console.log("Generating AI narrative...");
        aiNarrative = await reportAIService.generateReportNarrative(
          reportData,
          templateId || "custom",
          templateConfig
        );
        console.log("AI narrative generated successfully");
      }

      // Step 3: Generate export file
      let fileBuffer;
      let contentType;
      let filename;

      if (format === "pdf") {
        console.log("Generating PDF...");
        fileBuffer = await reportExportService.generatePDF(
          reportData,
          aiNarrative
        );
        contentType = "application/pdf";
        filename = `report-${Date.now()}.pdf`;
      } else if (format === "csv" || format === "excel") {
        console.log("Generating CSV...");
        fileBuffer = await reportExportService.generateCSV(reportData);
        contentType = "text/csv";
        filename = `report-${Date.now()}.csv`;
      } else {
        return res.status(400).json({ error: "Invalid format specified" });
      }

      console.log("Export generated successfully");

      // Send file
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({
        error: "Failed to generate report",
        details: error.message,
      });
    }
  }

  /**
   * Preview report data (without generating file)
   */
  async previewReport(req, res) {
    try {
      const userId = req.session.userId;
      const { templateId, dateRange, filters, metrics } = req.body;

      const templateConfig = templateId ? REPORT_TEMPLATES[templateId] : {};

      const reportConfig = {
        dateRange: this.parseDateRange(dateRange, templateConfig.defaultDateRange),
        filters: filters || {},
        metrics: metrics || templateConfig.defaultMetrics || [
          "performance",
          "timeline",
          "success_patterns",
        ],
      };

      // Get data and AI narrative
      const reportData = await reportDataService.aggregateReportData(
        userId,
        reportConfig
      );

      const aiNarrative = await reportAIService.generateReportNarrative(
        reportData,
        templateId || "custom",
        templateConfig
      );

      // Return preview data
      res.json({
        success: true,
        preview: {
          summary: reportData.summary,
          narrative: aiNarrative.narrative,
          dataPoints: {
            applications: reportData.applications?.length || 0,
            timeActivities: reportData.timeInvestment?.length || 0,
            predictions: reportData.predictions?.length || 0,
          },
        },
      });
    } catch (error) {
      console.error("Error previewing report:", error);
      res.status(500).json({
        error: "Failed to preview report",
        details: error.message,
      });
    }
  }

  /**
   * Generate executive summary only (for quick sharing)
   */
  async getExecutiveSummary(req, res) {
    try {
      const userId = req.session.userId;
      const { dateRange } = req.query;

      const reportConfig = {
        dateRange: this.parseDateRange({ period: dateRange || "last_30_days" }),
        filters: {},
        metrics: ["performance", "success_patterns"],
      };

      const reportData = await reportDataService.aggregateReportData(
        userId,
        reportConfig
      );

      const summary = await reportAIService.generateExecutiveSummary(reportData);

      res.json({
        success: true,
        summary,
        stats: reportData.summary,
      });
    } catch (error) {
      console.error("Error generating executive summary:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  }

  /**
   * Parse date range from request
   */
  parseDateRange(dateRange, defaultPeriod) {
    if (!dateRange && !defaultPeriod) {
      return { startDate: null, endDate: null };
    }

    const period = dateRange?.period || defaultPeriod;

    // Handle predefined periods
    if (period === "last_7_days") {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      return {
        startDate: startDate.toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
      };
    }

    if (period === "last_30_days") {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      return {
        startDate: startDate.toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
      };
    }

    if (period === "last_90_days") {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      return {
        startDate: startDate.toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
      };
    }

    if (period === "all_time") {
      return { startDate: null, endDate: null };
    }

    // Handle custom date range
    return {
      startDate: dateRange?.startDate || null,
      endDate: dateRange?.endDate || null,
    };
  }
}

export default new ReportController();

