import interviewAnalyticsService from "../services/interviewAnalyticsService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class InterviewAnalyticsController {
  // Get all analytics data
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

    const analytics = await interviewAnalyticsService.getAllAnalytics(userId);

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
}

export default new InterviewAnalyticsController();

