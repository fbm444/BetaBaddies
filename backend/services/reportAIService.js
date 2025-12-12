/**
 * Report AI Service
 * Uses OpenAI to generate narrative reports and insights
 * Pattern follows aiPreparationAnalysisService.js
 */

import OpenAI from "openai";

class ReportAIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
    } else {
      this.openai = null;
      console.warn('⚠️  OpenAI API key not found. AI report generation will use fallback responses.');
    }
  }

  /**
   * Generate comprehensive report narrative using AI
   */
  async generateReportNarrative(reportData, reportType, templateConfig = {}) {
    try {
      if (!this.openai) {
        // Fallback response when OpenAI is not configured
        return this.getFallbackNarrative(reportData, reportType);
      }

      const dataSummary = this.prepareDataSummary(reportData);
      const systemPrompt = this.getSystemPrompt(reportType);
      const userPrompt = this.getUserPrompt(
        dataSummary,
        reportType,
        templateConfig
      );

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const response = JSON.parse(completion.choices[0].message.content);
      return this.formatNarrative(response, reportType);
    } catch (error) {
      console.error("Error generating AI narrative:", error);
      throw error;
    }
  }

  /**
   * Get system prompt based on report type
   */
  getSystemPrompt(reportType) {
    const basePrompt = `You are an expert career coach and data analyst specializing in job search optimization. 
Analyze job search performance data and provide actionable, personalized insights.
Be specific, data-driven, and honest about data quality and limitations.
Focus on what THIS USER'S data shows, not generic career advice.`;

    const typeSpecificPrompts = {
      "weekly-summary": `${basePrompt}
Provide concise weekly momentum analysis. Focus on immediate wins and quick action items.`,

      "monthly-deep-dive": `${basePrompt}
Provide comprehensive monthly analysis. Identify trends, patterns, and strategic recommendations.`,

      "industry-comparison": `${basePrompt}
Compare performance across industries. Identify which industries to prioritize and why.`,

      "preparation-effectiveness": `${basePrompt}
Analyze ROI of preparation activities. Recommend optimal time investment strategies.`,

      "mentor-share": `${basePrompt}
Create a mentor-friendly summary with discussion points. Highlight blockers and areas needing guidance.`,

      custom: basePrompt,
    };

    return typeSpecificPrompts[reportType] || basePrompt;
  }

  /**
   * Get user prompt with data and instructions
   */
  getUserPrompt(dataSummary, reportType, templateConfig) {
    const focusArea = templateConfig.aiPromptFocus || "comprehensive analysis";

    return `Analyze this job search performance data and generate a professional report.

DATA SUMMARY:
${dataSummary}

REPORT TYPE: ${reportType}
FOCUS: ${focusArea}

Generate a JSON response with the following structure:
{
  "executiveSummary": "2-3 sentence overview of overall performance and key finding",
  "dataQuality": {
    "rating": "excellent|good|fair|poor",
    "sampleSize": number,
    "message": "Assessment of data reliability"
  },
  "keyFindings": [
    {
      "title": "Finding title",
      "description": "Specific data-backed finding",
      "impact": "high|medium|low",
      "metric": "Supporting statistic or data point"
    }
  ],
  "trendAnalysis": {
    "whatsWorking": ["Specific successful pattern 1", "Specific successful pattern 2"],
    "whatsNotWorking": ["Specific problem 1", "Specific problem 2"],
    "emergingPatterns": ["Notable trend 1", "Notable trend 2"]
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "Specific actionable recommendation",
      "reasoning": "Why this matters based on the data",
      "expectedImpact": "What improvement to expect"
    }
  ],
  "areasOfConcern": [
    {
      "concern": "Specific issue or blocker",
      "severity": "high|medium|low",
      "suggestion": "How to address it"
    }
  ],
  "strengths": [
    {
      "strength": "What user is doing well",
      "leverage": "How to capitalize on this strength"
    }
  ],
  "nextSteps": ["Immediate action 1", "Immediate action 2", "Immediate action 3"]
}

Be specific, quantitative, and personalized. If data is limited, acknowledge it clearly.`;
  }

  /**
   * Prepare data summary for AI analysis
   */
  prepareDataSummary(reportData) {
    const summary = [];

    // Metadata
    if (reportData.metadata) {
      const { dateRange } = reportData.metadata;
      summary.push(`REPORT PERIOD: ${dateRange?.startDate || dateRange?.period || "All time"} to ${
        dateRange?.endDate || "Present"
      }`);
      summary.push("");
    }

    // Summary statistics
    if (reportData.summary) {
      const s = reportData.summary;
      summary.push(`SUMMARY STATISTICS:`);
      summary.push(`  - Total Applications: ${s.totalApplications}`);
      summary.push(`  - Interviews Scheduled: ${s.totalInterviews}`);
      summary.push(`  - Offers Received: ${s.totalOffers}`);
      summary.push(`  - Success Rate: ${s.successRate}%`);
      summary.push(`  - Average Prep Time: ${s.avgPrepTime} hours per job`);
      if (s.topCompany) summary.push(`  - Most Applied Company: ${s.topCompany}`);
      if (s.topIndustry) summary.push(`  - Top Industry: ${s.topIndustry}`);
      if (s.mostEffectiveSource)
        summary.push(`  - Most Effective Source: ${s.mostEffectiveSource}`);
      summary.push("");
    }

    // Performance metrics
    if (reportData.performance?.keyMetrics) {
      const m = reportData.performance.keyMetrics;
      summary.push(`PERFORMANCE METRICS:`);
      summary.push(`  - Total Opportunities Tracked: ${m.total_opportunities || 0}`);
      summary.push(`  - Applications Sent: ${m.applications_sent || 0}`);
      summary.push(`  - Interviews: ${m.interviews_scheduled || 0}`);
      summary.push(`  - Offers: ${m.offers_received || 0}`);
      summary.push(`  - Rejections: ${m.rejections || 0}`);

      if (reportData.performance.conversionRates) {
        const cr = reportData.performance.conversionRates;
        summary.push(`  - Application → Interview Rate: ${cr.application_to_interview || 0}%`);
        summary.push(`  - Interview → Offer Rate: ${cr.interview_to_offer || 0}%`);
      }
      summary.push("");
    }

    // Time investment
    if (reportData.timeInvestment?.byActivity) {
      summary.push(`TIME INVESTMENT BY ACTIVITY:`);
      reportData.timeInvestment.byActivity.forEach((activity) => {
        summary.push(
          `  - ${activity.activityType}: ${parseFloat(
            activity.totalHours
          ).toFixed(1)} hours (${activity.count} activities)`
        );
      });
      summary.push("");
    }

    // Success patterns
    if (reportData.successAnalysis) {
      if (reportData.successAnalysis.byIndustry?.length > 0) {
        summary.push(`SUCCESS BY INDUSTRY:`);
        reportData.successAnalysis.byIndustry
          .slice(0, 3)
          .forEach((ind, i) => {
            summary.push(
              `  ${i + 1}. ${ind.industry}: ${ind.offerRate}% offer rate (${
                ind.total
              } applications)`
            );
          });
        summary.push("");
      }

      if (reportData.successAnalysis.bySource?.length > 0) {
        summary.push(`SUCCESS BY SOURCE:`);
        reportData.successAnalysis.bySource
          .slice(0, 3)
          .forEach((source, i) => {
            summary.push(
              `  ${i + 1}. ${source.source}: ${source.offerRate}% offer rate (${
                source.total
              } applications)`
            );
          });
        summary.push("");
      }
    }

    // Predictions summary
    if (reportData.predictions?.length > 0) {
      const avgSuccess =
        reportData.predictions.reduce(
          (sum, p) => sum + (p.successProbability || 0),
          0
        ) / reportData.predictions.length;
      const highPotential = reportData.predictions.filter(
        (p) => p.successProbability >= 60
      ).length;

      summary.push(`PREDICTIVE INSIGHTS:`);
      summary.push(
        `  - Average Success Probability: ${avgSuccess.toFixed(1)}%`
      );
      summary.push(
        `  - High-Potential Opportunities: ${highPotential} out of ${reportData.predictions.length}`
      );
      summary.push("");
    }


    // Recent applications sample
    if (reportData.applications?.length > 0) {
      summary.push(`RECENT APPLICATIONS (Sample of ${Math.min(5, reportData.applications.length)}):`);
      reportData.applications.slice(0, 5).forEach((app, i) => {
        summary.push(
          `  ${i + 1}. ${app.company} - ${app.title} [${app.status}] - ${parseFloat(
            app.total_prep_hours || 0
          ).toFixed(1)}h prep`
        );
      });
    }

    return summary.join("\n");
  }

  /**
   * Format AI response into structured narrative
   */
  formatNarrative(aiResponse, reportType) {
    return {
      type: reportType,
      generatedAt: new Date().toISOString(),
      narrative: {
        executiveSummary: aiResponse.executiveSummary || "",
        dataQuality: aiResponse.dataQuality || {
          rating: "unknown",
          message: "Unable to assess",
        },
        keyFindings: aiResponse.keyFindings || [],
        trendAnalysis: aiResponse.trendAnalysis || {
          whatsWorking: [],
          whatsNotWorking: [],
          emergingPatterns: [],
        },
        recommendations: aiResponse.recommendations || [],
        areasOfConcern: aiResponse.areasOfConcern || [],
        strengths: aiResponse.strengths || [],
        nextSteps: aiResponse.nextSteps || [],
      },
    };
  }

  /**
   * Get fallback narrative when OpenAI is not configured
   */
  getFallbackNarrative(reportData, reportType) {
    return this.formatNarrative({
      executiveSummary: "AI-powered analysis is not currently available. Please check your configuration.",
      dataQuality: {
        rating: "unknown",
        message: "Unable to assess data quality without AI analysis",
      },
      keyFindings: [],
      trendAnalysis: {
        whatsWorking: [],
        whatsNotWorking: [],
        emergingPatterns: [],
      },
      recommendations: ["Configure OpenAI API key to enable AI-powered insights"],
      areasOfConcern: [],
      strengths: [],
      nextSteps: [],
    }, reportType);
  }

  /**
   * Generate executive summary for sharing
   */
  async generateExecutiveSummary(reportData) {
    try {
      if (!this.openai) {
        // Fallback summary when OpenAI is not configured
        return "AI-powered executive summary generation is not currently available. Please check your configuration.";
      }

      const dataSummary = this.prepareDataSummary(reportData);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Use mini for shorter summaries
        messages: [
          {
            role: "system",
            content:
              "You are a career coach creating concise executive summaries.",
          },
          {
            role: "user",
            content: `Create a brief executive summary (3-4 sentences) of this job search data:\n\n${dataSummary}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Error generating executive summary:", error);
      return "Unable to generate summary at this time.";
    }
  }
}

export default new ReportAIService();

