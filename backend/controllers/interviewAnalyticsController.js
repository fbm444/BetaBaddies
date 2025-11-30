import interviewAnalyticsService from "../services/interviewAnalyticsService.js";
import confidenceAnxietyService from "../services/confidenceAnxietyService.js";
import feedbackAnalysisService from "../services/feedbackAnalysisService.js";
import patternMatchingService from "../services/patternMatchingService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class InterviewAnalyticsController {
  // Get all analytics data (enhanced version with all features)
  getAllAnalytics = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const analytics = await interviewAnalyticsService.getEnhancedAnalytics(userId);

    res.status(200).json({
      ok: true,
      data: analytics,
    });
  });

  // Get conversion rate only
  getConversionRate = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const conversionRate = await interviewAnalyticsService.getConversionRate(
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        conversionRate,
      },
    });
  });

  // Get improvement trends
  getTrends = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { months } = req.query;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const monthsParam = months ? parseInt(months) : 12;
    const trends = await interviewAnalyticsService.getImprovementTrend(
      userId,
      monthsParam
    );

    res.status(200).json({
      ok: true,
      data: {
        trends,
      },
    });
  });

  // Get personalized recommendations
  getRecommendations = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const recommendations =
      await interviewAnalyticsService.generateRecommendations(userId);

    res.status(200).json({
      ok: true,
      data: {
        recommendations,
      },
    });
  });

  // Get practice vs real comparison
  getPracticeVsReal = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const comparison = await interviewAnalyticsService.getPracticeVsRealComparison(userId);

    res.status(200).json({
      ok: true,
      data: {
        comparison,
      },
    });
  });

  // Get confidence trends
  getConfidenceTrends = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { months } = req.query;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const trends = await confidenceAnxietyService.getConfidenceTrends(userId, months || 12);

    res.status(200).json({
      ok: true,
      data: {
        trends,
      },
    });
  });

  // Get anxiety progress
  getAnxietyProgress = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { months } = req.query;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const progress = await confidenceAnxietyService.getAnxietyProgress(userId, months || 12);

    res.status(200).json({
      ok: true,
      data: {
        progress,
      },
    });
  });

  // Get benchmark comparison
  getBenchmarks = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const benchmarks = await patternMatchingService.getBenchmarkComparison(userId);

    res.status(200).json({
      ok: true,
      data: {
        benchmarks,
      },
    });
  });

  // Get feedback themes
  getFeedbackThemes = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          message: "Unauthorized",
        },
      });
    }

    const themes = await feedbackAnalysisService.getCommonThemes(userId);
    const improvementAreas = await feedbackAnalysisService.getCommonImprovementAreas(userId);

    res.status(200).json({
      ok: true,
      data: {
        themes,
        improvementAreas,
      },
    });
  });
}

export default new InterviewAnalyticsController();

