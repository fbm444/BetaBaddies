import database from "./database.js";

class InterviewAnalyticsService {
  constructor() {
    // Industry benchmark data (can be moved to config/database later)
    this.industryBenchmarks = {
      conversionRate: {
        average: 15.0,
        top: 52.0,
      },
    };

    // Format labels for display
    this.formatLabels = {
      phone_screen: "Phone Screen",
      hirevue: "HireVue",
      technical: "Technical",
      behavioral: "Behavioral",
      on_site: "On-site",
      system_design: "System Design",
      other: "Other",
    };

    // Skill area labels
    this.skillAreaLabels = {
      system_design: "System Design",
      algorithms: "Algorithms",
      apis: "APIs",
      behavioral: "Behavioral",
      time_management: "Time Management",
    };
  }

  /**
   * Calculate interview-to-offer conversion rate
   */
  async getConversionRate(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE outcome = 'offer_extended') as offers,
          COUNT(*) FILTER (WHERE status = 'completed' AND outcome IS NOT NULL AND outcome != 'pending') as completed_interviews
        FROM interviews
        WHERE user_id = $1
      `;

      const result = await database.query(query, [userId]);
      const row = result.rows[0];

      const offers = parseInt(row.offers) || 0;
      const completed = parseInt(row.completed_interviews) || 0;

      const conversionRate = completed > 0 ? (offers / completed) * 100 : 0;

      return {
        userRate: Math.round(conversionRate * 10) / 10, // Round to 1 decimal
        industryAverage: this.industryBenchmarks.conversionRate.average,
        industryTop: this.industryBenchmarks.conversionRate.top,
        offers,
        completedInterviews: completed,
      };
    } catch (error) {
      console.error("Error calculating conversion rate:", error);
      throw error;
    }
  }

  /**
   * Get performance by interview format
   */
  async getPerformanceByFormat(userId) {
    try {
      const query = `
        SELECT 
          COALESCE(format, 'other') as format,
          COUNT(*) FILTER (WHERE outcome IN ('passed', 'offer_extended')) as successful,
          COUNT(*) FILTER (WHERE status = 'completed' AND outcome IS NOT NULL AND outcome != 'pending') as total
        FROM interviews
        WHERE user_id = $1
        GROUP BY format
        ORDER BY successful DESC, total DESC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        format: row.format,
        formatLabel: this.formatLabels[row.format] || row.format,
        successful: parseInt(row.successful) || 0,
        total: parseInt(row.total) || 0,
      }));
    } catch (error) {
      console.error("Error getting performance by format:", error);
      throw error;
    }
  }

  /**
   * Get performance by company type (using industry from job_opportunities)
   */
  async getPerformanceByCompanyType(userId) {
    try {
      const query = `
        SELECT 
          COALESCE(jo.industry, 'Unknown') as company_type,
          COUNT(*) FILTER (WHERE i.outcome IN ('passed', 'offer_extended')) as successful,
          COUNT(*) FILTER (WHERE i.status = 'completed' AND i.outcome IS NOT NULL AND i.outcome != 'pending') as total
        FROM interviews i
        LEFT JOIN job_opportunities jo ON i.job_opportunity_id = jo.id
        WHERE i.user_id = $1
        GROUP BY jo.industry
        HAVING COUNT(*) FILTER (WHERE i.status = 'completed' AND i.outcome IS NOT NULL AND i.outcome != 'pending') > 0
        ORDER BY successful DESC, total DESC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        companyType: row.company_type,
        successful: parseInt(row.successful) || 0,
        total: parseInt(row.total) || 0,
      }));
    } catch (error) {
      console.error("Error getting performance by company type:", error);
      throw error;
    }
  }

  /**
   * Get skill area performance from interview_feedback
   */
  async getSkillAreaPerformance(userId) {
    try {
      const query = `
        SELECT 
          skill_area,
          AVG(score)::numeric(5,2) as average_score,
          COUNT(*) as count
        FROM interview_feedback
        WHERE user_id = $1
        GROUP BY skill_area
        ORDER BY average_score DESC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        skillArea: row.skill_area,
        skillAreaLabel: this.skillAreaLabels[row.skill_area] || row.skill_area,
        averageScore: parseFloat(row.average_score) || 0,
        count: parseInt(row.count) || 0,
        maxScore: 100,
      }));
    } catch (error) {
      console.error("Error getting skill area performance:", error);
      throw error;
    }
  }

  /**
   * Get improvement trend over time
   */
  async getImprovementTrend(userId, months = 12) {
    try {
      // Validate months parameter to prevent SQL injection
      const monthsNum = parseInt(months);
      if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 120) {
        throw new Error("Months parameter must be between 1 and 120");
      }

      const query = `
        SELECT 
          DATE_TRUNC('month', i.scheduled_at) as period,
          AVG(if.score)::numeric(5,2) as average_score,
          COUNT(DISTINCT i.id) FILTER (WHERE i.outcome = 'offer_extended')::numeric / 
            NULLIF(COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed' AND i.outcome IS NOT NULL AND i.outcome != 'pending'), 0) * 100 as conversion_rate
        FROM interviews i
        LEFT JOIN interview_feedback if ON i.id = if.interview_id
        WHERE i.user_id = $1
          AND i.scheduled_at >= NOW() - INTERVAL '${monthsNum} months'
          AND i.status = 'completed'
        GROUP BY DATE_TRUNC('month', i.scheduled_at)
        ORDER BY period ASC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        period: row.period ? new Date(row.period).toISOString().substring(0, 7) : null, // YYYY-MM format
        averageScore: row.average_score ? parseFloat(row.average_score) : null,
        conversionRate: row.conversion_rate ? parseFloat(row.conversion_rate) : null,
      }));
    } catch (error) {
      console.error("Error getting improvement trend:", error);
      throw error;
    }
  }

  /**
   * Generate personalized recommendations based on performance data
   */
  async generateRecommendations(userId) {
    try {
      const recommendations = [];

      // Get skill area performance
      const skillAreas = await this.getSkillAreaPerformance(userId);

      // Check for low skill area scores
      skillAreas.forEach((area) => {
        if (area.averageScore < 50) {
          recommendations.push(
            `Focus on improving ${area.skillAreaLabel.toLowerCase()} skills through targeted practice`
          );
        }
      });

      // Check behavioral performance specifically
      const behavioral = skillAreas.find((a) => a.skillArea === "behavioral");
      if (behavioral && behavioral.averageScore < 60) {
        recommendations.push("Strengthen storytelling in your examples");
        recommendations.push("Add more measurable outcomes to your stories");
        recommendations.push("Improve answer structure for clarity");
        recommendations.push("Practice smoother transitions between points");
        recommendations.push("Highlight your impact more confidently");
      }

      // Get conversion rate
      const conversion = await this.getConversionRate(userId);
      if (conversion.userRate < conversion.industryAverage) {
        recommendations.push(
          "Focus on interview preparation and follow-up to improve conversion rate"
        );
      }

      // Get format performance
      const formatPerformance = await this.getPerformanceByFormat(userId);
      const lowPerformingFormats = formatPerformance.filter(
        (f) => f.total > 0 && f.successful / f.total < 0.5
      );

      if (lowPerformingFormats.length > 0) {
        lowPerformingFormats.forEach((format) => {
          recommendations.push(
            `Practice more ${format.formatLabel.toLowerCase()} interviews`
          );
        });
      }

      // Default recommendations if none generated
      if (recommendations.length === 0) {
        recommendations.push("Continue maintaining your strong performance");
        recommendations.push("Consider expanding to new interview formats");
        recommendations.push("Track your progress regularly");
      }

      // Return top 5-7 recommendations
      return recommendations.slice(0, 7);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      // Return default recommendations on error
      return [
        "Strengthen storytelling in your examples",
        "Add more measurable outcomes",
        "Improve answer structure for clarity",
        "Practice smoother transitions between points",
        "Highlight your impact more confidently",
      ];
    }
  }

  /**
   * Get optimal interview strategy insights
   */
  getOptimalStrategyInsights() {
    // These are general best practices - could be personalized based on user data
    return [
      {
        number: 1,
        title: "Lead with your strongest examples",
        description:
          "Start interviews by showcasing projects or experiences that best represent impact.",
      },
      {
        number: 2,
        title: "Tie every answer back to the role",
        description:
          "Choose stories that directly align with job description responsibilities.",
      },
      {
        number: 3,
        title: "Use a consistent structure for clarity",
        description:
          "Follow a reliable framework (e.g., STAR or PAR) for focused answers.",
      },
      {
        number: 4,
        title: "Emphasize outcomes before process",
        description:
          "Briefly state results at the beginning of the answer, then describe how they were achieved.",
      },
    ];
  }

  /**
   * Get all analytics data in one call
   */
  async getAllAnalytics(userId) {
    try {
      const [
        conversionRate,
        performanceByFormat,
        performanceByCompanyType,
        skillAreaPerformance,
        improvementTrend,
        recommendations,
      ] = await Promise.all([
        this.getConversionRate(userId),
        this.getPerformanceByFormat(userId),
        this.getPerformanceByCompanyType(userId),
        this.getSkillAreaPerformance(userId),
        this.getImprovementTrend(userId),
        this.generateRecommendations(userId),
      ]);

      const optimalStrategyInsights = this.getOptimalStrategyInsights();

      return {
        conversionRate,
        performanceByFormat,
        performanceByCompanyType,
        skillAreaPerformance,
        improvementTrend,
        recommendations,
        optimalStrategyInsights,
      };
    } catch (error) {
      console.error("Error getting all analytics:", error);
      throw error;
    }
  }
}

export default new InterviewAnalyticsService();

