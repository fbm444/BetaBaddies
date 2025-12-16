import marketIntelligenceService from '../services/marketIntelligenceService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import db from '../services/database.js';

class MarketIntelligenceController {
  /**
   * Get salary intelligence
   * GET /api/market-intelligence/salary-trends
   */
  getSalaryTrends = asyncHandler(async (req, res) => {
    const { jobTitle, location, industry } = req.query;

    if (!jobTitle) {
      return res.status(400).json({
        ok: false,
        error: 'jobTitle query parameter is required'
      });
    }

    const data = await marketIntelligenceService.getSalaryIntelligence(
      jobTitle,
      location,
      industry
    );

    res.status(200).json({
      ok: true,
      data
    });
  });

  /**
   * Get industry trends
   * GET /api/market-intelligence/industry-trends
   */
  getIndustryTrends = asyncHandler(async (req, res) => {
    const { industry, location, timeframe } = req.query;

    if (!industry) {
      return res.status(400).json({
        ok: false,
        error: 'industry query parameter is required'
      });
    }

    const data = await marketIntelligenceService.getIndustryTrends(
      industry,
      location,
      timeframe ? parseInt(timeframe) : 90
    );

    res.status(200).json({
      ok: true,
      data
    });
  });

  /**
   * Get skill demand trends
   * GET /api/market-intelligence/skill-demand
   */
  getSkillDemand = asyncHandler(async (req, res) => {
    const { industry, timeframe } = req.query;

    const data = await marketIntelligenceService.getSkillDemandTrends(
      industry,
      timeframe ? parseInt(timeframe) : 90
    );

    res.status(200).json({
      ok: true,
      data
    });
  });

  /**
   * Get personalized market insights for current user
   * GET /api/market-intelligence/insights
   */
  getPersonalizedInsights = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { status } = req.query;

    const insights = await marketIntelligenceService.getUserInsights(
      userId,
      status || 'active'
    );

    res.status(200).json({
      ok: true,
      data: { insights }
    });
  });

  /**
   * Generate new insights for current user
   * POST /api/market-intelligence/insights/generate
   */
  generateInsights = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const insights = await marketIntelligenceService.generateUserInsights(userId);

    res.status(200).json({
      ok: true,
      data: { insights },
      message: `Generated ${insights.length} new insights`
    });
  });

  /**
   * Update insight status (dismiss or complete)
   * PATCH /api/market-intelligence/insights/:id
   */
  updateInsightStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.session.userId;

    if (!status || !['active', 'dismissed', 'completed'].includes(status)) {
      return res.status(400).json({
        ok: false,
        error: 'Valid status is required (active, dismissed, or completed)'
      });
    }

    const insight = await marketIntelligenceService.updateInsightStatus(id, userId, status);

    if (!insight) {
      return res.status(404).json({
        ok: false,
        error: 'Insight not found or you do not have permission to update it'
      });
    }

    res.status(200).json({
      ok: true,
      data: { insight },
      message: `Insight ${status}`
    });
  });

  /**
   * Get comprehensive market overview
   * GET /api/market-intelligence/overview
   */
  getMarketOverview = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    // Get user profile to determine their industry/job
    const profileQuery = await db.query(`
      SELECT industry, job_title, city, state
      FROM profiles
      WHERE user_id = $1
    `, [userId]);

    const profile = profileQuery.rows[0];

    if (!profile) {
      return res.status(404).json({
        ok: false,
        error: 'User profile not found'
      });
    }

    const location = profile.state ? `${profile.city}, ${profile.state}` : null;

    // Get all relevant market data with error handling for each
    // Each service method now handles errors gracefully and returns default data
    const [salaryData, industryTrends, skillDemand, insights] = await Promise.all([
      marketIntelligenceService.getSalaryIntelligence(
        profile.job_title,
        location,
        profile.industry
      ).catch(err => {
        console.error('Error getting salary intelligence:', err);
        return {
          jobTitle: profile.job_title || 'Unknown',
          location: location || 'All locations',
          industry: profile.industry,
          yourMarket: { sampleSize: 0, median: null, range: { min: null, max: null }, percentiles: null, note: 'Unable to fetch salary data' },
          nationalBenchmark: { median: null, year: new Date().getFullYear().toString(), trend: 'unknown', source: 'Data unavailable' },
          comparison: null,
          salaryDistribution: null,
          generatedAt: new Date().toISOString(),
          cached: false
        };
      }),
      marketIntelligenceService.getIndustryTrends(profile.industry, location).catch(err => {
        console.error('Error getting industry trends:', err);
        return {
          industry: profile.industry || 'Unknown',
          location,
          timeframe: 365,
          growthMetrics: { recentJobs: 0, previousPeriodJobs: 0, growthRate: 0, trend: 'unknown', note: 'Unable to fetch industry trends' },
          hiringActivity: { totalJobs: 0, activeCompanies: 0, hiringVelocity: 'unknown', insight: 'Industry trends unavailable' },
          topCompanies: [],
          salaryTrends: [],
          source: 'Data unavailable',
          generatedAt: new Date().toISOString(),
          cached: false
        };
      }),
      marketIntelligenceService.getSkillDemandTrends(profile.industry).catch(err => {
        console.error('Error getting skill demand:', err);
        return {
          industry: profile.industry || 'Unknown',
          timeframe: 365,
          topSkills: [],
          emergingSkills: [],
          decliningSkills: [],
          source: 'Data unavailable',
          generatedAt: new Date().toISOString(),
          cached: false
        };
      }),
      marketIntelligenceService.getUserInsights(userId, 'active').catch(err => {
        console.error('Error getting user insights:', err);
        return [];
      })
    ]);

    res.status(200).json({
      ok: true,
      data: {
        profile: {
          jobTitle: profile.job_title,
          industry: profile.industry,
          location
        },
        salaryIntelligence: salaryData,
        industryTrends,
        skillDemand,
        personalizedInsights: insights
      }
    });
  });

  /**
   * Refresh market intelligence cache for current user
   * POST /api/market-intelligence/refresh-cache
   */
  refreshCache = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    // Get user profile to determine their cache keys
    const profileQuery = await db.query(`
      SELECT industry, job_title, city, state
      FROM profiles
      WHERE user_id = $1
    `, [userId]);

    const profile = profileQuery.rows[0];

    if (!profile) {
      return res.status(404).json({
        ok: false,
        error: 'User profile not found'
      });
    }

    const location = profile.state ? `${profile.city}, ${profile.state}` : null;

    // Clear cache entries related to this user's data
    const deletedCache = await db.query(`
      DELETE FROM market_intelligence_cache
      WHERE cache_key LIKE $1
         OR cache_key LIKE $2
         OR cache_key LIKE $3
    `, [
      `salary:${profile.job_title}%`,
      `industry:${profile.industry}%`,
      `skills:${profile.industry || 'all'}%`
    ]);

    res.status(200).json({
      ok: true,
      message: 'Market data cache refreshed successfully',
      data: {
        clearedEntries: deletedCache.rowCount || 0,
        profile: {
          jobTitle: profile.job_title,
          industry: profile.industry,
          location
        }
      }
    });
  });
}

export default new MarketIntelligenceController();

