import analyticsService from "../services/analyticsService.js";
import bayesianPredictionService from "../services/bayesianPredictionService.js";
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

  // UC-103: Time Investment and Productivity Analysis
  getProductivityAnalytics = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate, useManual } = req.query;

    const dateRange = {
      startDate: startDate || null,
      endDate: endDate || null,
    };

    const analytics = await analyticsService.getProductivityAnalytics(
      userId,
      dateRange,
      useManual === 'true'
    );

    res.status(200).json({
      ok: true,
      data: { analytics },
    });
  });

  // Pattern Recognition Analysis
  getPatternRecognition = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    const dateRange = {
      startDate: startDate || null,
      endDate: endDate || null,
    };

    const analysis = await analyticsService.getPatternRecognitionAnalysis(
      userId,
      dateRange
    );

    res.status(200).json({
      ok: true,
      data: { analysis },
    });
  });

  // Predict Success for a Specific Opportunity
  predictSuccess = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const opportunityData = req.body;

    const prediction = await bayesianPredictionService.predictSuccess(
      userId,
      opportunityData
    );

    res.status(200).json({
      ok: true,
      data: { prediction },
    });
  });

  // Get Preparation Correlation Data
  getPreparationCorrelation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    const data = await analyticsService.analyzePreparationCorrelation(
      userId,
      startDate,
      endDate
    );

    res.status(200).json({
      ok: true,
      data,
    });
  });

  // Get Timing Patterns
  getTimingPatterns = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    const patterns = await analyticsService.getTimingPatterns(
      userId,
      startDate,
      endDate
    );

    res.status(200).json({
      ok: true,
      data: { patterns },
    });
  });
}

export default new AnalyticsController();

