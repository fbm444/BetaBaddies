import { asyncHandler } from "../middleware/errorHandler.js";
import applicationStrategyService from "../services/applicationStrategyService.js";
import documentPerformanceService from "../services/documentPerformanceService.js";
import timingAnalysisService from "../services/timingAnalysisService.js";
import abTestingService from "../services/abTestingService.js";
import successMetricsService from "../services/successMetricsService.js";
import optimizationRecommendationsService from "../services/optimizationRecommendationsService.js";
import roleTypeAnalysisService from "../services/roleTypeAnalysisService.js";
import responseTimePredictionService from "../services/responseTimePredictionService.js";
import applicationQualityService from "../services/applicationQualityService.js";
import competitiveAnalysisService from "../services/competitiveAnalysisService.js";

class OptimizationController {
  // ============================================================================
  // Success Metrics
  // ============================================================================

  getMetrics = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { period } = req.query;

    const metrics = await successMetricsService.calculateSuccessMetrics(
      userId,
      period ? new Date(period) : null
    );

    res.status(200).json({
      ok: true,
      data: { metrics }
    });
  });

  getTrends = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { metric, periodType, limit } = req.query;

    const trends = await successMetricsService.getTrendData(
      userId,
      metric || 'offer_rate',
      periodType || 'monthly',
      parseInt(limit) || 12
    );

    res.status(200).json({
      ok: true,
      data: { trends }
    });
  });

  getSnapshots = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { periodType, limit } = req.query;

    const snapshots = await successMetricsService.getHistoricalSnapshots(
      userId,
      periodType || 'monthly',
      parseInt(limit) || 12
    );

    res.status(200).json({
      ok: true,
      data: { snapshots }
    });
  });

  createSnapshot = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { date, periodType } = req.body;

    const snapshot = await successMetricsService.createSnapshot(
      userId,
      date ? new Date(date) : new Date(),
      periodType || 'monthly'
    );

    res.status(201).json({
      ok: true,
      data: { snapshot }
    });
  });

  // ============================================================================
  // Application Strategy
  // ============================================================================

  trackStrategy = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobOpportunityId, ...strategyData } = req.body;

    if (!jobOpportunityId) {
      return res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "jobOpportunityId is required" }
      });
    }

    const strategy = await applicationStrategyService.trackApplicationStrategy(
      userId,
      jobOpportunityId,
      strategyData
    );

    res.status(201).json({
      ok: true,
      data: { strategy }
    });
  });

  getStrategyPerformance = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { applicationMethod, startDate, endDate } = req.query;

    const filters = {};
    if (applicationMethod) filters.applicationMethod = applicationMethod;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const performance = await applicationStrategyService.getStrategyPerformance(userId, filters);

    res.status(200).json({
      ok: true,
      data: { performance }
    });
  });

  getBestStrategies = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit) || 5;

    const strategies = await applicationStrategyService.getBestPerformingStrategies(userId, limit);

    res.status(200).json({
      ok: true,
      data: { strategies }
    });
  });

  compareStrategies = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { strategy1, strategy2 } = req.body;

    if (!strategy1 || !strategy2) {
      return res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "strategy1 and strategy2 are required" }
      });
    }

    const comparison = await applicationStrategyService.compareStrategies(
      userId,
      strategy1,
      strategy2
    );

    res.status(200).json({
      ok: true,
      data: { comparison }
    });
  });

  // ============================================================================
  // Document Performance
  // ============================================================================

  registerDocument = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const documentData = req.body;

    const document = await documentPerformanceService.registerDocumentVersion(userId, documentData);

    res.status(201).json({
      ok: true,
      data: { document }
    });
  });

  getDocumentPerformance = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const document = await documentPerformanceService.getDocumentPerformance(userId, id);

    res.status(200).json({
      ok: true,
      data: { document }
    });
  });

  compareDocuments = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { documentType } = req.query;

    if (!documentType) {
      return res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "documentType is required" }
      });
    }

    const comparison = await documentPerformanceService.compareDocumentVersions(userId, documentType);

    res.status(200).json({
      ok: true,
      data: { comparison }
    });
  });

  getBestDocuments = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { documentType, limit } = req.query;

    if (!documentType) {
      return res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "documentType is required" }
      });
    }

    const documents = await documentPerformanceService.getBestPerformingDocuments(
      userId,
      documentType,
      parseInt(limit) || 3
    );

    res.status(200).json({
      ok: true,
      data: { documents }
    });
  });

  setPrimaryDocument = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const document = await documentPerformanceService.setPrimaryDocument(userId, id);

    res.status(200).json({
      ok: true,
      data: { document }
    });
  });

  // ============================================================================
  // Timing Analysis
  // ============================================================================

  getOptimalTiming = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const analysis = await timingAnalysisService.analyzeOptimalTiming(userId);

    res.status(200).json({
      ok: true,
      data: { analysis }
    });
  });

  getDayOfWeekPerformance = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const performance = await timingAnalysisService.getDayOfWeekPerformance(userId);

    res.status(200).json({
      ok: true,
      data: { performance }
    });
  });

  getHourOfDayPerformance = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const performance = await timingAnalysisService.getHourOfDayPerformance(userId);

    res.status(200).json({
      ok: true,
      data: { performance }
    });
  });

  getTimeOfDayPerformance = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const performance = await timingAnalysisService.getTimeOfDayPerformance(userId);

    res.status(200).json({
      ok: true,
      data: { performance }
    });
  });

  // ============================================================================
  // Response Time Prediction
  // ============================================================================

  getResponseTimePrediction = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;

    const prediction = await responseTimePredictionService.predictForJob(
      userId,
      jobId
    );

    res.status(200).json({
      ok: true,
      data: { prediction },
    });
  });

  getResponseTimeBenchmarks = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const benchmarks = await responseTimePredictionService.getBenchmarks(
      userId
    );

    res.status(200).json({
      ok: true,
      data: { benchmarks },
    });
  });

  // ============================================================================
  // A/B Testing
  // ============================================================================

  createABTest = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const testConfig = req.body;

    const test = await abTestingService.createABTest(userId, testConfig);

    res.status(201).json({
      ok: true,
      data: { test }
    });
  });

  getABTests = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { status, testType } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (testType) filters.testType = testType;

    const tests = await abTestingService.getAllTests(userId, filters);

    res.status(200).json({
      ok: true,
      data: { tests }
    });
  });

  getABTestResults = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const results = await abTestingService.getTestResults(id, userId);

    res.status(200).json({
      ok: true,
      data: { results }
    });
  });

  startABTest = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const test = await abTestingService.startTest(id, userId);

    res.status(200).json({
      ok: true,
      data: { test }
    });
  });

  completeABTest = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const test = await abTestingService.completeTest(id, userId);

    res.status(200).json({
      ok: true,
      data: { test }
    });
  });

  // ============================================================================
  // Recommendations
  // ============================================================================

  generateRecommendations = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const recommendations = await optimizationRecommendationsService.generateRecommendations(userId);

    res.status(200).json({
      ok: true,
      data: { recommendations }
    });
  });

  getRecommendations = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { status, priority, recommendationType } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (recommendationType) filters.recommendationType = recommendationType;

    const recommendations = await optimizationRecommendationsService.getRecommendations(userId, filters);

    res.status(200).json({
      ok: true,
      data: { recommendations }
    });
  });

  acknowledgeRecommendation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const recommendation = await optimizationRecommendationsService.acknowledgeRecommendation(id, userId);

    res.status(200).json({
      ok: true,
      data: { recommendation }
    });
  });

  completeRecommendation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const recommendation = await optimizationRecommendationsService.completeRecommendation(id, userId);

    res.status(200).json({
      ok: true,
      data: { recommendation }
    });
  });

  dismissRecommendation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const recommendation = await optimizationRecommendationsService.dismissRecommendation(id, userId);

    res.status(200).json({
      ok: true,
      data: { recommendation }
    });
  });

  // ============================================================================
  // Role Type Analysis
  // ============================================================================

  getRoleTypePerformance = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const performance = await roleTypeAnalysisService.getRoleTypePerformance(userId);

    res.status(200).json({
      ok: true,
      data: { performance }
    });
  });

  getBestRoleTypes = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit) || 5;

    const roleTypes = await roleTypeAnalysisService.getBestPerformingRoleTypes(userId, limit);

    res.status(200).json({
      ok: true,
      data: { roleTypes }
    });
  });

  // ============================================================================
  // Application Quality Scoring
  // ============================================================================

  scoreApplicationQuality = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;
    const { resumeDocumentId, coverLetterDocumentId, linkedinUrl } = req.body || {};

    if (!jobId) {
      return res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "jobId is required" }
      });
    }

    const quality = await applicationQualityService.scoreApplication(userId, jobId, {
      resumeDocumentId,
      coverLetterDocumentId,
      linkedinUrl,
    });

    res.status(201).json({
      ok: true,
      data: { quality }
    });
  });

  getApplicationQuality = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "jobId is required" }
      });
    }

    const quality = await applicationQualityService.getLatestScore(userId, jobId);

    res.status(200).json({
      ok: true,
      data: { quality }
    });
  });

  getApplicationQualityStats = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const stats = await applicationQualityService.getStats(userId);

    res.status(200).json({
      ok: true,
      data: { stats }
    });
  });

  getApplicationQualityHistory = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "jobId is required" }
      });
    }

    const history = await applicationQualityService.getHistory(userId, jobId);

    res.status(200).json({
      ok: true,
      data: { history }
    });
  });

  // ============================================================================
  // Competitive Analysis
  // ============================================================================

  analyzeCompetitiveness = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "jobId is required" }
      });
    }

    const analysis = await competitiveAnalysisService.analyzeCompetitiveness(userId, jobId);

    res.status(200).json({
      ok: true,
      data: { analysis }
    });
  });

  getPrioritizedApplications = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const prioritized = await competitiveAnalysisService.prioritizeApplications(userId);

    res.status(200).json({
      ok: true,
      data: { prioritized }
    });
  });

  compareToHiredProfile = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "jobId is required" }
      });
    }

    // Get user profile
    const userProfile = await competitiveAnalysisService.getUserProfile(userId);

    // Get job
    const jobRes = await database.query(
      `SELECT * FROM job_opportunities WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [jobId, userId]
    );

    if (jobRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Job opportunity not found" }
      });
    }

    const comparison = await competitiveAnalysisService.compareToTypicalHiredProfile(
      userProfile,
      jobRes.rows[0]
    );

    res.status(200).json({
      ok: true,
      data: { comparison }
    });
  });
}

export default new OptimizationController();

