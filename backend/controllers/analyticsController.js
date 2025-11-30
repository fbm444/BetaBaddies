import analyticsService from "../services/analyticsService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class AnalyticsController {
  // UC-096: Job Search Performance Dashboard
  getJobSearchPerformance = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    const dateRange = {
      startDate: startDate || null,
      endDate: endDate || null,
    };

    const performance = await analyticsService.getJobSearchPerformance(
      userId,
      dateRange
    );

    res.status(200).json({
      ok: true,
      data: { performance },
    });
  });

  // UC-097: Application Success Rate Analysis
  getApplicationSuccessAnalysis = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    const dateRange = {
      startDate: startDate || null,
      endDate: endDate || null,
    };

    const analysis = await analyticsService.getApplicationSuccessAnalysis(
      userId,
      dateRange
    );

    res.status(200).json({
      ok: true,
      data: { analysis },
    });
  });

  // UC-098: Interview Performance Tracking
  getInterviewPerformance = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    const dateRange = {
      startDate: startDate || null,
      endDate: endDate || null,
    };

    const performance = await analyticsService.getInterviewPerformance(
      userId,
      dateRange
    );

    res.status(200).json({
      ok: true,
      data: { performance },
    });
  });

  // UC-099: Network ROI Analytics
  getNetworkROI = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    const dateRange = {
      startDate: startDate || null,
      endDate: endDate || null,
    };

    const roi = await analyticsService.getNetworkROI(userId, dateRange);

    res.status(200).json({
      ok: true,
      data: { roi },
    });
  });

  // UC-100: Salary Progression and Market Positioning
  getSalaryProgression = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    const dateRange = {
      startDate: startDate || null,
      endDate: endDate || null,
    };

    const progression = await analyticsService.getSalaryProgression(
      userId,
      dateRange
    );

    res.status(200).json({
      ok: true,
      data: { progression },
    });
  });
}

export default new AnalyticsController();

