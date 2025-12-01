import database from "./database.js";

class HistoricalPerformanceService {
  /**
   * Calculate historical performance using statistical analysis
   * Uses Bayesian inference and trend analysis
   */
  async calculateHistoricalScore(userId, jobOpportunityId) {
    try {
      const breakdown = {
        overallRate: { score: 0, status: "unknown", notes: [], rate: 0, sampleSize: 0 },
        recentTrend: { score: 0, status: "unknown", notes: [], trend: "stable" },
        byType: { score: 0, status: "unknown", notes: [] },
        confidence: { score: 0, status: "unknown", notes: [] },
      };

      // Get all past interview outcomes with detailed data
      const interviewsResult = await database.query(
        `SELECT 
          outcome,
          interview_type,
          interview_date,
          job_opportunity_id,
          feedback_score
         FROM interviews
         WHERE user_id = $1 
           AND outcome IS NOT NULL
           AND outcome != 'pending'
         ORDER BY interview_date DESC`,
        [userId]
      );

      if (interviewsResult.rows.length === 0) {
        return {
          score: 50, // Neutral score if no history (Bayesian prior)
          hasData: false,
          status: "missing",
          breakdown,
        };
      }

      const interviews = interviewsResult.rows;
      const totalInterviews = interviews.length;
      
      // Calculate success rate
      const acceptedInterviews = interviews.filter(row => row.outcome === "accepted").length;
      const rejectedInterviews = interviews.filter(row => row.outcome === "rejected").length;
      const successRate = totalInterviews > 0 ? (acceptedInterviews / totalInterviews) * 100 : 0;

      // Use Bayesian estimation for small sample sizes (adds prior belief)
      // For small samples, we use a Beta distribution prior (Bayesian average)
      const priorAlpha = 2; // Prior successes
      const priorBeta = 2; // Prior failures (50% prior)
      const bayesianSuccessRate = totalInterviews < 5
        ? ((acceptedInterviews + priorAlpha) / (totalInterviews + priorAlpha + priorBeta)) * 100
        : successRate;

      breakdown.overallRate.rate = Math.round(bayesianSuccessRate);
      breakdown.overallRate.sampleSize = totalInterviews;
      breakdown.overallRate.notes.push(
        `${acceptedInterviews} accepted out of ${totalInterviews} interviews`
      );
      breakdown.overallRate.notes.push(
        `Success rate: ${successRate.toFixed(1)}% (${totalInterviews < 5 ? 'Bayesian adjusted: ' : ''}${bayesianSuccessRate.toFixed(1)}%)`
      );

      // Score based on success rate with confidence intervals
      let rateScore = this.calculateRateScore(bayesianSuccessRate, totalInterviews);
      breakdown.overallRate.score = rateScore;
      breakdown.overallRate.status = rateScore >= 70 ? "complete" : rateScore >= 40 ? "partial" : "missing";

      // Recent trend analysis (last 3 months vs overall)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const recentInterviews = interviews.filter(row => 
        row.interview_date && new Date(row.interview_date) >= threeMonthsAgo
      );
      
      if (recentInterviews.length > 0) {
        const recentAccepted = recentInterviews.filter(row => row.outcome === "accepted").length;
        const recentRate = (recentAccepted / recentInterviews.length) * 100;
        
        // Calculate trend direction and strength
        const trendDiff = recentRate - bayesianSuccessRate;
        let trendScore = 50; // Neutral
        let trend = "stable";
        
        if (Math.abs(trendDiff) < 5) {
          trend = "stable";
          trendScore = 60; // Slight bonus for stability
        } else if (trendDiff > 15) {
          trend = "improving";
          trendScore = 100; // Strong improvement
        } else if (trendDiff > 5) {
          trend = "improving";
          trendScore = 85; // Moderate improvement
        } else if (trendDiff < -15) {
          trend = "declining";
          trendScore = 20; // Strong decline
        } else {
          trend = "declining";
          trendScore = 35; // Moderate decline
        }

        breakdown.recentTrend.score = trendScore;
        breakdown.recentTrend.trend = trend;
        breakdown.recentTrend.status = trendScore >= 70 ? "complete" : trendScore >= 40 ? "partial" : "missing";
        breakdown.recentTrend.notes.push(
          `Recent (${recentInterviews.length} interviews): ${recentRate.toFixed(1)}% vs Overall: ${bayesianSuccessRate.toFixed(1)}%`
        );
        breakdown.recentTrend.notes.push(
          `Trend: ${trend} (${trendDiff > 0 ? '+' : ''}${trendDiff.toFixed(1)}%)`
        );
      } else {
        breakdown.recentTrend.score = 50;
        breakdown.recentTrend.status = "unknown";
        breakdown.recentTrend.notes.push("No recent interview data (last 3 months)");
      }

      // Interview type performance analysis
      const typePerformance = this.analyzeByInterviewType(interviews);
      breakdown.byType = typePerformance;

      // Confidence score based on sample size
      const confidenceScore = this.calculateConfidenceScore(totalInterviews);
      breakdown.confidence.score = confidenceScore;
      breakdown.confidence.status = confidenceScore >= 70 ? "complete" : "partial";
      breakdown.confidence.notes.push(
        `Sample size: ${totalInterviews} interviews (${confidenceScore >= 80 ? 'high' : confidenceScore >= 60 ? 'moderate' : 'low'} confidence)`
      );

      // Calculate overall score with weights
      // Overall rate: 40%, Recent trend: 30%, Type performance: 20%, Confidence: 10%
      const overallScore =
        breakdown.overallRate.score * 0.40 +
        breakdown.recentTrend.score * 0.30 +
        breakdown.byType.score * 0.20 +
        breakdown.confidence.score * 0.10;

      const hasData = totalInterviews > 0;
      const status =
        overallScore >= 70 ? "complete" : overallScore >= 40 ? "partial" : "missing";

      return {
        score: Math.round(overallScore),
        hasData,
        status,
        breakdown,
      };
    } catch (error) {
      console.error("❌ Error calculating historical score:", error);
      return {
        score: 50, // Neutral on error
        hasData: false,
        status: "error",
        breakdown: {},
      };
    }
  }

  /**
   * Calculate score from success rate with statistical confidence
   */
  calculateRateScore(rate, sampleSize) {
    // Base score from rate
    let score = rate;
    
    // Adjust for sample size (smaller samples get penalized)
    if (sampleSize < 3) {
      score *= 0.8; // 20% penalty for very small sample
    } else if (sampleSize < 5) {
      score *= 0.9; // 10% penalty for small sample
    }
    
    // Bonus for high success rates
    if (rate >= 70) {
      score = Math.min(100, score + 5);
    } else if (rate >= 50) {
      score = Math.min(100, score + 2);
    }
    
    // Penalty for very low rates
    if (rate < 20) {
      score = Math.max(0, score - 10);
    }
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Analyze performance by interview type
   */
  analyzeByInterviewType(interviews) {
    const typeGroups = {};
    
    interviews.forEach(interview => {
      const type = interview.interview_type || "unknown";
      if (!typeGroups[type]) {
        typeGroups[type] = { total: 0, accepted: 0 };
      }
      typeGroups[type].total++;
      if (interview.outcome === "accepted") {
        typeGroups[type].accepted++;
      }
    });

    // Calculate average performance across types
    const typeScores = Object.values(typeGroups).map(group => {
      return group.total > 0 ? (group.accepted / group.total) * 100 : 50;
    });

    const avgTypeScore = typeScores.length > 0
      ? typeScores.reduce((sum, score) => sum + score, 0) / typeScores.length
      : 50;

    const notes = Object.entries(typeGroups).map(([type, group]) => {
      const rate = group.total > 0 ? (group.accepted / group.total) * 100 : 0;
      return `${type}: ${group.accepted}/${group.total} (${rate.toFixed(0)}%)`;
    });

    return {
      score: Math.round(avgTypeScore),
      status: avgTypeScore >= 60 ? "complete" : avgTypeScore >= 40 ? "partial" : "missing",
      notes,
    };
  }

  /**
   * Calculate confidence score based on sample size
   * Uses statistical power analysis
   */
  calculateConfidenceScore(sampleSize) {
    if (sampleSize >= 20) return 100; // High confidence
    if (sampleSize >= 10) return 85;  // Good confidence
    if (sampleSize >= 5) return 70;   // Moderate confidence
    if (sampleSize >= 3) return 55;   // Low confidence
    if (sampleSize >= 1) return 40;   // Very low confidence
    return 0; // No data
  }
}

export default new HistoricalPerformanceService();
