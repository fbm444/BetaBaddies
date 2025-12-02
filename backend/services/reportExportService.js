/**
 * Report Export Service
 * Generates PDF and Excel exports of reports
 * Uses PDFKit (already in dependencies)
 */

import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

class ReportExportService {
  /**
   * Generate PDF report
   */
  async generatePDF(reportData, aiNarrative) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margins: { top: 50, bottom: 50, left: 60, right: 60 },
        });

        const stream = new PassThrough();
        const buffers = [];

        stream.on("data", (chunk) => buffers.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(buffers)));
        stream.on("error", reject);

        doc.pipe(stream);

        // Build PDF content
        this.addHeader(doc, reportData);
        this.addExecutiveSummary(doc, aiNarrative);
        this.addPerformanceMetrics(doc, reportData);
        this.addKeyFindings(doc, aiNarrative);
        this.addTrendAnalysis(doc, aiNarrative);
        this.addRecommendations(doc, aiNarrative);
        this.addDetailedData(doc, reportData);
        this.addFooter(doc, reportData);

        doc.end();
      } catch (error) {
        console.error("Error generating PDF:", error);
        reject(error);
      }
    });
  }

  /**
   * Add PDF header with title and metadata
   */
  addHeader(doc, reportData) {
    const { metadata, summary } = reportData;

    // Title
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Job Search Performance Report", { align: "center" });

    doc.moveDown(0.5);

    // Subtitle with date range
    doc.fontSize(12).font("Helvetica").fillColor("#666666");

    if (metadata?.dateRange) {
      const { startDate, endDate } = metadata.dateRange;
      const dateText = `${startDate || "All time"} to ${endDate || "Present"}`;
      doc.text(dateText, { align: "center" });
    }

    doc.text(`Generated: ${new Date().toLocaleDateString()}`, {
      align: "center",
    });

    doc.moveDown(1);
    doc.strokeColor("#000000").lineWidth(2).moveTo(60, doc.y).lineTo(535, doc.y).stroke();
    doc.moveDown(1);
    doc.fillColor("#000000");
  }

  /**
   * Add executive summary section
   */
  addExecutiveSummary(doc, aiNarrative) {
    this.addSectionTitle(doc, "Executive Summary");

    const summary = aiNarrative?.narrative?.executiveSummary || "No summary available.";
    
    doc.fontSize(11).font("Helvetica").text(summary, {
      align: "left",
      lineGap: 4,
      width: 480,
    });

    // Data quality badge
    if (aiNarrative?.narrative?.dataQuality) {
      const dq = aiNarrative.narrative.dataQuality;
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#666666");
      doc.text(`Data Quality: ${dq.rating?.toUpperCase() || "UNKNOWN"}`, {
        continued: true,
      });
      if (dq.sampleSize) {
        doc.text(` (${dq.sampleSize} completed applications analyzed)`);
      } else {
        doc.text("");
      }
      doc.fillColor("#000000");
    }

    doc.moveDown(1.5);
  }

  /**
   * Add performance metrics summary
   */
  addPerformanceMetrics(doc, reportData) {
    this.addSectionTitle(doc, "Performance at a Glance");

    const { summary } = reportData;

    if (!summary) {
      doc.fontSize(10).text("No metrics available.");
      doc.moveDown(1);
      return;
    }

    // Create metrics grid
    const metrics = [
      { label: "Applications Sent", value: summary.totalApplications || 0 },
      { label: "Interviews", value: summary.totalInterviews || 0 },
      { label: "Offers Received", value: summary.totalOffers || 0 },
      { label: "Success Rate", value: `${summary.successRate || 0}%` },
      { label: "Avg Prep Time", value: `${summary.avgPrepTime || 0}h` },
    ];

    const startY = doc.y;
    const boxWidth = 85;
    const boxHeight = 60;
    const spacing = 8;
    const cols = 5;
    const leftMargin = 60; // Match document margin

    metrics.forEach((metric, i) => {
      const col = i % cols;
      const x = leftMargin + col * (boxWidth + spacing);
      const y = startY;

      // Draw box
      doc
        .rect(x, y, boxWidth, boxHeight)
        .fillAndStroke("#f0f0f0", "#cccccc");

      // Value
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(metric.value, x, y + 15, {
          width: boxWidth,
          align: "center",
        });

      // Label
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#666666")
        .text(metric.label, x, y + 40, {
          width: boxWidth,
          align: "center",
        });
    });

    // Reset position after boxes to prevent text shifting
    doc.y = startY + boxHeight + 20;
    doc.x = 60; // Reset to left margin
    doc.fillColor("#000000");
  }

  /**
   * Add key findings section
   */
  addKeyFindings(doc, aiNarrative) {
    const findings = aiNarrative?.narrative?.keyFindings || [];

    if (findings.length === 0) return;

    this.checkPageBreak(doc, 100);
    this.addSectionTitle(doc, "Key Findings");

    findings.forEach((finding, i) => {
      this.checkPageBreak(doc, 60);

      // Finding number and title
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(`${i + 1}. ${finding.title}`, { continued: false });

      // Impact badge
      if (finding.impact) {
        const impactColors = {
          high: "#dc2626",
          medium: "#f59e0b",
          low: "#10b981",
        };
        doc
          .fontSize(9)
          .fillColor(impactColors[finding.impact] || "#666666")
          .text(`  [${finding.impact.toUpperCase()} IMPACT]`);
      }

      // Description
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#000000")
        .text(finding.description, { lineGap: 2, width: 480 });

      // Metric if available
      if (finding.metric) {
        doc.fontSize(9).fillColor("#666666").text(`→ ${finding.metric}`);
      }

      doc.moveDown(0.8);
      doc.fillColor("#000000");
    });

    doc.moveDown(0.5);
  }

  /**
   * Add trend analysis section
   */
  addTrendAnalysis(doc, aiNarrative) {
    const trends = aiNarrative?.narrative?.trendAnalysis;

    if (!trends) return;

    this.checkPageBreak(doc, 150);
    this.addSectionTitle(doc, "Trend Analysis");

    // What's Working
    if (trends.whatsWorking?.length > 0) {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#10b981").text("✓ What's Working:");
      doc.fontSize(10).font("Helvetica").fillColor("#000000");
      trends.whatsWorking.forEach((item) => {
        doc.text(`  • ${item}`, { lineGap: 2 });
      });
      doc.moveDown(0.5);
    }

    // What's Not Working
    if (trends.whatsNotWorking?.length > 0) {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#dc2626").text("✗ What's Not Working:");
      doc.fontSize(10).font("Helvetica").fillColor("#000000");
      trends.whatsNotWorking.forEach((item) => {
        doc.text(`  • ${item}`, { lineGap: 2 });
      });
      doc.moveDown(0.5);
    }

    // Emerging Patterns
    if (trends.emergingPatterns?.length > 0) {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#3b82f6").text("→ Emerging Patterns:");
      doc.fontSize(10).font("Helvetica").fillColor("#000000");
      trends.emergingPatterns.forEach((item) => {
        doc.text(`  • ${item}`, { lineGap: 2 });
      });
      doc.moveDown(0.5);
    }

    doc.moveDown(0.5);
    doc.fillColor("#000000");
  }

  /**
   * Add recommendations section
   */
  addRecommendations(doc, aiNarrative) {
    const recommendations = aiNarrative?.narrative?.recommendations || [];

    if (recommendations.length === 0) return;

    this.checkPageBreak(doc, 100);
    this.addSectionTitle(doc, "Actionable Recommendations");

    // Sort by priority
    const sorted = [...recommendations].sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[a.priority] - priority[b.priority];
    });

    sorted.forEach((rec, i) => {
      this.checkPageBreak(doc, 70);

      // Priority badge and action
      const priorityColors = {
        high: "#dc2626",
        medium: "#f59e0b",
        low: "#10b981",
      };

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(priorityColors[rec.priority] || "#000000")
        .text(`[${rec.priority?.toUpperCase() || "MEDIUM"}]`, { continued: true })
        .fillColor("#000000")
        .text(` ${rec.action}`);

      // Reasoning
      doc.fontSize(10).font("Helvetica").text(`   ${rec.reasoning}`, {
        lineGap: 2,
      });

      // Expected impact
      if (rec.expectedImpact) {
        doc
          .fontSize(9)
          .fillColor("#666666")
          .text(`   Expected Impact: ${rec.expectedImpact}`);
      }

      doc.moveDown(0.8);
      doc.fillColor("#000000");
    });

    // Next Steps
    const nextSteps = aiNarrative?.narrative?.nextSteps || [];
    if (nextSteps.length > 0) {
      this.checkPageBreak(doc, 80);
      doc.fontSize(11).font("Helvetica-Bold").text("Immediate Next Steps:");
      doc.fontSize(10).font("Helvetica");
      nextSteps.forEach((step, i) => {
        doc.text(`${i + 1}. ${step}`, { lineGap: 2 });
      });
      doc.moveDown(1);
    }
  }

  /**
   * Add detailed data section
   */
  addDetailedData(doc, reportData) {
    this.checkPageBreak(doc, 100);
    this.addSectionTitle(doc, "Detailed Data");

    // Time investment breakdown
    if (reportData.timeInvestment?.length > 0) {
      doc.fontSize(11).font("Helvetica-Bold").text("Time Investment:");
      doc.fontSize(10).font("Helvetica");

      reportData.timeInvestment.forEach((activity) => {
        doc.text(
          `  • ${activity.activity_type}: ${parseFloat(activity.total_hours).toFixed(1)} hours (${
            activity.activity_count
          } activities)`
        );
      });
      doc.moveDown(0.8);
    }

    // Top industries
    if (reportData.successPatterns?.topPerformingIndustries?.length > 0) {
      this.checkPageBreak(doc, 60);
      doc.fontSize(11).font("Helvetica-Bold").text("Top Performing Industries:");
      doc.fontSize(10).font("Helvetica");

      reportData.successPatterns.topPerformingIndustries
        .slice(0, 5)
        .forEach((ind) => {
          doc.text(
            `  • ${ind.industry}: ${ind.success_rate}% success rate (${ind.total} applications)`
          );
        });
      doc.moveDown(0.8);
    }

    // Recent applications
    if (reportData.applications?.length > 0) {
      this.checkPageBreak(doc, 100);
      doc.fontSize(11).font("Helvetica-Bold").text("Recent Applications:");
      doc.fontSize(9).font("Helvetica");

      const recentApps = reportData.applications.slice(0, 10);
      recentApps.forEach((app) => {
        this.checkPageBreak(doc, 20);
        doc.text(
          `  • ${app.company} - ${app.title} [${app.status}] - ${parseFloat(
            app.total_prep_hours || 0
          ).toFixed(1)}h prep`,
          { lineGap: 1 }
        );
      });
    }

    doc.moveDown(1);
  }

  /**
   * Add footer with branding
   */
  addFooter(doc, reportData) {
    const bottomY = doc.page.height - 80;
    doc.y = bottomY;

    doc
      .strokeColor("#cccccc")
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(0.5);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text("Generated by BetaBaddies ATS Tracker", { align: "center" });

    doc.text("Powered by AI-driven analytics", { align: "center" });
  }

  /**
   * Add section title
   */
  addSectionTitle(doc, title) {
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(title, { underline: false });

    doc.moveDown(0.5);
  }

  /**
   * Check if page break is needed
   */
  checkPageBreak(doc, requiredSpace) {
    if (doc.y + requiredSpace > doc.page.height - 80) {
      doc.addPage();
    }
  }

  /**
   * Generate simple Excel CSV format
   * (For full Excel support, we'd need exceljs package, but CSV works for MVP)
   */
  async generateCSV(reportData) {
    try {
      const applications = reportData.applications || [];

      if (applications.length === 0) {
        return "No applications data available";
      }

      // CSV headers
      const headers = [
        "Company",
        "Role",
        "Industry",
        "Status",
        "Application Date",
        "Prep Hours",
        "Source",
        "Method",
        "Salary Min",
        "Salary Max",
      ];

      // CSV rows
      const rows = applications.map((app) => [
        this.escapeCsvField(app.company),
        this.escapeCsvField(app.title),
        this.escapeCsvField(app.industry),
        this.escapeCsvField(app.status),
        new Date(app.created_at).toLocaleDateString(),
        parseFloat(app.total_prep_hours || 0).toFixed(1),
        this.escapeCsvField(app.application_source),
        this.escapeCsvField(app.application_method),
        app.salary_min || "",
        app.salary_max || "",
      ]);

      // Combine
      const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

      return Buffer.from(csv, "utf-8");
    } catch (error) {
      console.error("Error generating CSV:", error);
      throw error;
    }
  }

  /**
   * Escape CSV field
   */
  escapeCsvField(field) {
    if (!field) return "";
    const str = String(field);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

export default new ReportExportService();

