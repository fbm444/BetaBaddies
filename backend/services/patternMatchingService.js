import database from "./database.js";
import interviewBenchmarks, { calculatePercentile, getBenchmark } from "../config/interviewBenchmarks.js";

class PatternMatchingService {
  /**
   * Identify patterns in successful interviews
   */
  async identifySuccessfulPatterns(userId) {
    try {
      // Get successful interviews (offers)
      const successfulQuery = `
        SELECT 
          i.format,
          i.type,
          AVG(ipa.preparation_hours)::numeric(5,2) as avg_prep_hours,
          AVG(ipa.confidence_level)::numeric(5,2) as avg_confidence,
          AVG(ipa.anxiety_level)::numeric(5,2) as avg_anxiety,
          jo.industry,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (i.scheduled_at - ipa.created_at)) / 3600)::numeric(5,2) as avg_time_before_interview
        FROM interviews i
        LEFT JOIN interview_pre_assessment ipa ON i.id = ipa.interview_id
        LEFT JOIN job_opportunities jo ON i.job_opportunity_id = jo.id
        WHERE i.user_id = $1
          AND i.outcome = 'offer_extended'
          AND i.status = 'completed'
        GROUP BY i.format, i.type, jo.industry
        ORDER BY count DESC
      `;

      const successfulResult = await database.query(successfulQuery, [userId]);

      // Get unsuccessful interviews for comparison
      const unsuccessfulQuery = `
        SELECT 
          i.format,
          i.type,
          AVG(ipa.preparation_hours)::numeric(5,2) as avg_prep_hours,
          AVG(ipa.confidence_level)::numeric(5,2) as avg_confidence,
          AVG(ipa.anxiety_level)::numeric(5,2) as avg_anxiety,
          jo.industry,
          COUNT(*) as count
        FROM interviews i
        LEFT JOIN interview_pre_assessment ipa ON i.id = ipa.interview_id
        LEFT JOIN job_opportunities jo ON i.job_opportunity_id = jo.id
        WHERE i.user_id = $1
          AND i.outcome = 'rejected'
          AND i.status = 'completed'
        GROUP BY i.format, i.type, jo.industry
        ORDER BY count DESC
      `;

      const unsuccessfulResult = await database.query(unsuccessfulQuery, [userId]);

      // Compare patterns
      const patterns = [];
      const successfulMap = new Map();
      successfulResult.rows.forEach((row) => {
        const key = `${row.format || 'unknown'}-${row.industry || 'unknown'}`;
        successfulMap.set(key, row);
      });

      successfulMap.forEach((successful, key) => {
        const unsuccessful = unsuccessfulResult.rows.find(
          (r) => `${r.format || 'unknown'}-${r.industry || 'unknown'}` === key
        );

        if (successful && successful.count >= 2) {
          patterns.push({
            format: successful.format,
            industry: successful.industry,
            successCount: parseInt(successful.count) || 0,
            failureCount: unsuccessful ? parseInt(unsuccessful.count) || 0 : 0,
            avgPrepHours: parseFloat(successful.avg_prep_hours) || 0,
            avgConfidence: parseFloat(successful.avg_confidence) || 0,
            avgAnxiety: parseFloat(successful.avg_anxiety) || 0,
            differenceInPrep: unsuccessful
              ? (parseFloat(successful.avg_prep_hours) || 0) - (parseFloat(unsuccessful.avg_prep_hours) || 0)
              : null,
            differenceInConfidence: unsuccessful
              ? (parseFloat(successful.avg_confidence) || 0) - (parseFloat(unsuccessful.avg_confidence) || 0)
              : null,
          });
        }
      });

      return patterns.sort((a, b) => b.successCount - a.successCount);
    } catch (error) {
      console.error("❌ Error identifying successful patterns:", error);
      throw error;
    }
  }

  /**
   * Get benchmark comparison with percentile rankings
   */
  async getBenchmarkComparison(userId) {
    try {
      // Get user's conversion rate
      const conversionQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE outcome = 'offer_extended') as offers,
          COUNT(*) FILTER (WHERE status = 'completed' AND outcome IS NOT NULL AND outcome != 'pending') as completed
        FROM interviews
        WHERE user_id = $1 AND is_practice = false
      `;

      const conversionResult = await database.query(conversionQuery, [userId]);
      const row = conversionResult.rows[0];
      const offers = parseInt(row.offers) || 0;
      const completed = parseInt(row.completed) || 0;
      const userRate = completed > 0 ? (offers / completed) * 100 : 0;

      // Get format-specific rates
      const formatQuery = `
        SELECT 
          format,
          COUNT(*) FILTER (WHERE outcome = 'offer_extended') as offers,
          COUNT(*) FILTER (WHERE status = 'completed' AND outcome IS NOT NULL AND outcome != 'pending') as completed
        FROM interviews
        WHERE user_id = $1 AND is_practice = false AND format IS NOT NULL
        GROUP BY format
      `;

      const formatResult = await database.query(formatQuery, [userId]);

      const formatComparisons = formatResult.rows.map((row) => {
        const formatOffers = parseInt(row.offers) || 0;
        const formatCompleted = parseInt(row.completed) || 0;
        const formatRate = formatCompleted > 0 ? (formatOffers / formatCompleted) * 100 : 0;
        const benchmark = getBenchmark("conversionRate", "byFormat")[row.format] || getBenchmark("conversionRate");
        const percentile = calculatePercentile(formatRate, benchmark);

        return {
          format: row.format,
          userRate: formatRate,
          benchmark: benchmark.average,
          topBenchmark: benchmark.top,
          percentile: percentile,
          comparison: formatRate >= benchmark.average ? "above" : "below",
        };
      });

      // Get skill area comparisons
      const skillQuery = `
        SELECT 
          skill_area,
          AVG(score)::numeric(5,2) as avg_score,
          COUNT(*) as count
        FROM interview_feedback
        WHERE user_id = $1
        GROUP BY skill_area
        HAVING COUNT(*) >= 2
      `;

      const skillResult = await database.query(skillQuery, [userId]);

      const skillComparisons = skillResult.rows.map((row) => {
        const avgScore = parseFloat(row.avg_score) || 0;
        const benchmark = getBenchmark("skillAreaScores")[row.skill_area] || { average: 65, top: 90 };
        const percentile = calculatePercentile(avgScore, benchmark);

        return {
          skillArea: row.skill_area,
          userScore: avgScore,
          benchmark: benchmark.average,
          topBenchmark: benchmark.top,
          percentile: percentile,
          comparison: avgScore >= benchmark.average ? "above" : "below",
        };
      });

      // Calculate overall percentile
      const overallBenchmark = getBenchmark("conversionRate");
      const overallPercentile = calculatePercentile(userRate, overallBenchmark);

      return {
        overall: {
          userRate: userRate,
          benchmark: overallBenchmark.average,
          topBenchmark: overallBenchmark.top,
          percentile: overallPercentile,
          comparison: userRate >= overallBenchmark.average ? "above" : "below",
          gap: userRate - overallBenchmark.average,
        },
        byFormat: formatComparisons,
        bySkillArea: skillComparisons,
      };
    } catch (error) {
      console.error("❌ Error getting benchmark comparison:", error);
      throw error;
    }
  }

  /**
   * Get personal benchmarks (user's best performance)
   */
  async getPersonalBenchmarks(userId) {
    try {
      // Best conversion rate period
      const bestPeriodQuery = `
        SELECT 
          DATE_TRUNC('month', scheduled_at) as period,
          COUNT(*) FILTER (WHERE outcome = 'offer_extended')::numeric / 
            NULLIF(COUNT(*) FILTER (WHERE status = 'completed' AND outcome IS NOT NULL), 0) * 100 as conversion_rate,
          COUNT(*) FILTER (WHERE outcome = 'offer_extended') as offers,
          COUNT(*) FILTER (WHERE status = 'completed' AND outcome IS NOT NULL) as completed
        FROM interviews
        WHERE user_id = $1 AND is_practice = false
          AND scheduled_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', scheduled_at)
        HAVING COUNT(*) FILTER (WHERE status = 'completed' AND outcome IS NOT NULL) >= 2
        ORDER BY conversion_rate DESC
        LIMIT 1
      `;

      const bestPeriod = await database.query(bestPeriodQuery, [userId]);

      // Best skill area score
      const bestSkillQuery = `
        SELECT 
          skill_area,
          AVG(score)::numeric(5,2) as avg_score,
          MAX(score) as max_score,
          COUNT(*) as count
        FROM interview_feedback
        WHERE user_id = $1
        GROUP BY skill_area
        HAVING COUNT(*) >= 3
        ORDER BY avg_score DESC
        LIMIT 1
      `;

      const bestSkill = await database.query(bestSkillQuery, [userId]);

      // Best performing format
      const bestFormatQuery = `
        SELECT 
          format,
          COUNT(*) FILTER (WHERE outcome = 'offer_extended')::numeric / 
            NULLIF(COUNT(*) FILTER (WHERE status = 'completed' AND outcome IS NOT NULL), 0) * 100 as conversion_rate
        FROM interviews
        WHERE user_id = $1 AND is_practice = false AND format IS NOT NULL
        GROUP BY format
        HAVING COUNT(*) FILTER (WHERE status = 'completed' AND outcome IS NOT NULL) >= 2
        ORDER BY conversion_rate DESC
        LIMIT 1
      `;

      const bestFormat = await database.query(bestFormatQuery, [userId]);

      return {
        bestPeriod: bestPeriod.rows[0] ? {
          period: bestPeriod.rows[0].period ? new Date(bestPeriod.rows[0].period).toISOString().substring(0, 7) : null,
          conversionRate: parseFloat(bestPeriod.rows[0].conversion_rate) || 0,
          offers: parseInt(bestPeriod.rows[0].offers) || 0,
          completed: parseInt(bestPeriod.rows[0].completed) || 0,
        } : null,
        bestSkillArea: bestSkill.rows[0] ? {
          skillArea: bestSkill.rows[0].skill_area,
          avgScore: parseFloat(bestSkill.rows[0].avg_score) || 0,
          maxScore: parseInt(bestSkill.rows[0].max_score) || 0,
          count: parseInt(bestSkill.rows[0].count) || 0,
        } : null,
        bestFormat: bestFormat.rows[0] ? {
          format: bestFormat.rows[0].format,
          conversionRate: parseFloat(bestFormat.rows[0].conversion_rate) || 0,
        } : null,
      };
    } catch (error) {
      console.error("❌ Error getting personal benchmarks:", error);
      throw error;
    }
  }

  /**
   * Get recommendations based on successful patterns
   */
  async getRecommendationsFromPatterns(userId) {
    try {
      const patterns = await this.identifySuccessfulPatterns(userId);
      const benchmarks = await this.getBenchmarkComparison(userId);
      const recommendations = [];

      // Analyze patterns and generate recommendations
      if (patterns.length > 0) {
        const topPattern = patterns[0];
        
        if (topPattern.differenceInPrep && topPattern.differenceInPrep > 2) {
          recommendations.push({
            type: "preparation",
            priority: "high",
            message: `You perform ${topPattern.differenceInPrep.toFixed(1)} hours better when you prepare more. Consider increasing preparation time.`,
            data: {
              successfulPrepHours: topPattern.avgPrepHours,
              format: topPattern.format,
            },
          });
        }

        if (topPattern.differenceInConfidence && topPattern.differenceInConfidence > 10) {
          recommendations.push({
            type: "confidence",
            priority: "medium",
            message: `Your successful interviews show ${topPattern.differenceInConfidence.toFixed(0)} points higher confidence. Focus on confidence-building exercises.`,
            data: {
              successfulConfidence: topPattern.avgConfidence,
            },
          });
        }
      }

      // Format-specific recommendations
      benchmarks.byFormat.forEach((format) => {
        if (format.comparison === "below" && format.percentile < 50) {
          recommendations.push({
            type: "format",
            priority: "high",
            message: `Your ${format.format} interview performance is below average. Consider additional practice in this format.`,
            data: {
              format: format.format,
              percentile: format.percentile,
            },
          });
        }
      });

      // Skill area recommendations
      benchmarks.bySkillArea.forEach((skill) => {
        if (skill.comparison === "below" && skill.percentile < 50) {
          recommendations.push({
            type: "skill",
            priority: "medium",
            message: `Your ${skill.skillArea} scores are below average. Focus on improving this area.`,
            data: {
              skillArea: skill.skillArea,
              percentile: skill.percentile,
            },
          });
        }
      });

      return recommendations.slice(0, 5); // Return top 5 recommendations
    } catch (error) {
      console.error("❌ Error getting pattern-based recommendations:", error);
      return [];
    }
  }
}

export default new PatternMatchingService();

