import express from 'express';
import marketIntelligenceController from '../controllers/marketIntelligenceController.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// All market intelligence routes require authentication
router.use(isAuthenticated);

// ========================================
// MARKET INTELLIGENCE ROUTES
// ========================================

/**
 * GET /api/market-intelligence/overview
 * Get comprehensive market overview for current user
 */
router.get('/overview', marketIntelligenceController.getMarketOverview);

/**
 * GET /api/market-intelligence/salary-trends
 * Query params: jobTitle (required), location (optional), industry (optional)
 * Get salary trends and benchmarks
 */
router.get('/salary-trends', marketIntelligenceController.getSalaryTrends);

/**
 * GET /api/market-intelligence/industry-trends
 * Query params: industry (required), location (optional), timeframe (optional, default 90)
 * Get industry growth trends and hiring activity
 */
router.get('/industry-trends', marketIntelligenceController.getIndustryTrends);

/**
 * GET /api/market-intelligence/skill-demand
 * Query params: industry (optional), timeframe (optional, default 90)
 * Get skill demand trends and emerging technologies
 */
router.get('/skill-demand', marketIntelligenceController.getSkillDemand);

/**
 * GET /api/market-intelligence/insights
 * Query params: status (optional, default 'active')
 * Get personalized market insights for current user
 */
router.get('/insights', marketIntelligenceController.getPersonalizedInsights);

/**
 * POST /api/market-intelligence/insights/generate
 * Generate new personalized insights for current user
 */
router.post('/insights/generate', marketIntelligenceController.generateInsights);

/**
 * PATCH /api/market-intelligence/insights/:id
 * Body: { status: 'active' | 'dismissed' | 'completed' }
 * Update insight status
 */
router.patch('/insights/:id', marketIntelligenceController.updateInsightStatus);

/**
 * POST /api/market-intelligence/refresh-cache
 * Clear market intelligence cache for current user's data
 * Forces fresh data fetch from Adzuna on next request
 */
router.post('/refresh-cache', marketIntelligenceController.refreshCache);

export default router;

