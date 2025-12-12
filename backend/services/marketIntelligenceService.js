import database from "./database.js";
import adzunaService from "./externalApis/adzunaService.js";
import newsApiService from "./externalApis/newsApiService.js";
import OpenAI from "openai";

/**
 * Market Intelligence Service
 * Provides job market trends, salary intelligence, skill demand analysis,
 * and AI-generated career recommendations
 */
class MarketIntelligenceService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;

    // Initialize OpenAI if configured
    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
      });
    }
  }

  // ========================================
  // CACHE HELPERS
  // ========================================

  /**
   * Get data from cache
   */
  async getFromCache(cacheKey, dataType) {
    try {
      const result = await database.query(
        `
        SELECT data, created_at, expires_at
        FROM market_intelligence_cache
        WHERE cache_key = $1 
          AND data_type = $2
          AND expires_at > NOW()
      `,
        [cacheKey, dataType]
      );

      if (result.rows.length > 0) {
        return {
          data: result.rows[0].data,
          cached: true,
          cacheAge: result.rows[0].created_at,
          expiresAt: result.rows[0].expires_at,
        };
      }

      return null;
    } catch (error) {
      console.error("❌ Error getting from cache:", error);
      return null;
    }
  }

  /**
   * Store data in cache
   */
  async storeInCache(
    cacheKey,
    dataType,
    data,
    daysToExpire = 7,
    metadata = null
  ) {
    try {
      await database.query(
        `
        INSERT INTO market_intelligence_cache 
          (cache_key, data_type, data, metadata, expires_at)
        VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${daysToExpire} days')
        ON CONFLICT (cache_key, data_type) 
        DO UPDATE SET 
          data = EXCLUDED.data,
          metadata = EXCLUDED.metadata,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `,
        [
          cacheKey,
          dataType,
          JSON.stringify(data),
          metadata ? JSON.stringify(metadata) : null,
        ]
      );
    } catch (error) {
      console.error("❌ Error storing in cache:", error);
    }
  }

  // ========================================
  // SALARY INTELLIGENCE
  // ========================================

  /**
   * Get comprehensive salary intelligence
   */
  async getSalaryIntelligence(jobTitle, location = null, industry = null) {
    // Handle null or empty job title
    if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length === 0) {
      return {
        jobTitle: jobTitle || 'Unknown',
        location: location || 'All locations',
        industry,
        yourMarket: {
          sampleSize: 0,
          median: null,
          range: { min: null, max: null },
          percentiles: null,
          note: 'No job title provided'
        },
        nationalBenchmark: {
          median: null,
          year: new Date().getFullYear().toString(),
          yearOverYearChange: null,
          trend: 'unknown',
          source: 'Market data unavailable',
          note: 'Job title is required to fetch salary intelligence'
        },
        comparison: null,
        salaryDistribution: null,
        generatedAt: new Date().toISOString(),
        cached: false
      };
    }

    const cacheKey = `salary:${jobTitle}:${location || 'any'}:${industry || 'any'}`;
    
    // Check cache first
    const cached = await this.getFromCache(cacheKey, "salary_trends");
    if (cached) {
      return { ...cached.data, cached: true, cacheAge: cached.cacheAge };
    }

    try {
      // Try with location first, then fall back to without location if no results
      let yourData = await this.getYourSalaryData(jobTitle, location, industry);

      // If no results with location, try without location filter
      if (yourData.sampleSize === 0 && location) {
        console.log(
          `📊 No salary data for ${jobTitle} in ${location}, trying without location filter...`
        );
        yourData = await this.getYourSalaryData(jobTitle, null, industry);
      }

      // Get Adzuna market data (salary estimate + distribution)
      let adzunaSalary = null;
      let adzunaDistribution = null;

      try {
        // Get salary estimate
        adzunaSalary = await adzunaService.getSalaryEstimate(
          jobTitle,
          [],
          location
        );

        console.log(
          "📊 Adzuna data:",
          adzunaSalary ? `Median: $${adzunaSalary.median}` : "N/A"
        );
        // Note: Not using Adzuna histogram - buckets are $20k increments (too coarse)
        // Your local job data provides better salary distribution
      } catch (adzunaError) {
        console.log("ℹ️ Adzuna data not available:", adzunaError.message);
      }

      const result = {
        jobTitle,
        location: yourData.sampleSize > 0 ? location : "All locations",
        industry,
        yourMarket: yourData,
        nationalBenchmark: adzunaSalary
          ? {
              median: adzunaSalary.median,
              year: new Date().getFullYear().toString(),
              yearOverYearChange: null, // Adzuna doesn't provide YoY
              trend: "current",
              source: "Adzuna (Real-time job market data)",
              note: `Based on live job postings in ${adzunaSalary.location}`,
            }
          : {
              median: null,
              year: new Date().getFullYear().toString(),
              yearOverYearChange: null,
              trend: "unknown",
              source: "Market data unavailable",
              note: "National benchmark data is currently unavailable. Showing your market data only.",
            },
        comparison: this.generateSalaryComparison(yourData, adzunaSalary),
        // Use your local job data for distribution (more granular than Adzuna's $20k buckets)
        salaryDistribution: yourData.percentiles
          ? {
              min: yourData.range.min,
              p25: yourData.percentiles.p25,
              median: yourData.percentiles.median,
              p75: yourData.percentiles.p75,
              max: yourData.range.max,
              source: "Your job data",
              note: `Based on ${yourData.sampleSize} jobs in your search`,
            }
          : null,
        generatedAt: new Date().toISOString(),
      };

      // Cache for 7 days
      await this.storeInCache(cacheKey, "salary_trends", result, 7, {
        sampleSize: yourData.sampleSize,
        hasAdzunaData: !!(adzunaSalary || adzunaDistribution),
      });

      return { ...result, cached: false };
    } catch (error) {
      console.error("❌ Error getting salary intelligence:", error);
      throw error;
    }
  }

  /**
   * Get salary data from your database
   */
  async getYourSalaryData(jobTitle, location, industry) {
    // Handle null or empty job title
    if (!jobTitle || typeof jobTitle !== 'string') {
      return {
        sampleSize: 0,
        median: null,
        range: { min: null, max: null },
        percentiles: null,
        note: 'No job title provided'
      };
    }

    // Extract keywords from job title for broader matching
    // e.g., "Senior Software Engineer" -> ["Senior", "Software", "Engineer"]
    const keywords = jobTitle
      .split(" ")
      .filter(
        (word) =>
          word.length > 2 && !["the", "and", "for"].includes(word.toLowerCase())
      );

    // Build flexible WHERE clause: match jobs containing ANY of the keywords
    let whereConditions = [];
    let params = [];

    if (keywords.length > 0) {
      const titleConditions = keywords.map((keyword, idx) => {
        params.push(`%${keyword}%`);
        return `title ILIKE $${params.length}`;
      });
      whereConditions.push(`(${titleConditions.join(" OR ")})`);
    }

    whereConditions.push(`(archived = false OR archived IS NULL)`);
    whereConditions.push(`(salary_min IS NOT NULL OR salary_max IS NOT NULL)`);

    // Don't filter by industry for salary data - we want all tech-related jobs
    // regardless of specific industry categorization (Fintech, SaaS, AI, etc.)
    // The job title matching already ensures we get relevant positions

    if (location) {
      params.push(`%${location}%`);
      whereConditions.push(`location ILIKE $${params.length}`);
    }

    let query = `
      SELECT 
        AVG(salary_min) as avg_min,
        AVG(salary_max) as avg_max,
        MIN(salary_min) as min_salary,
        MAX(salary_max) as max_salary,
        COUNT(*) as count,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY salary_max) as p25,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY salary_max) as median,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY salary_max) as p75
      FROM job_opportunities
      WHERE ${whereConditions.join(" AND ")}
    `;

    const result = await database.query(query, params);
    const data = result.rows[0];

    return {
      average:
        Math.round(
          (parseFloat(data.avg_min || 0) + parseFloat(data.avg_max || 0)) / 2
        ) || 0,
      range: {
        min: Math.round(parseFloat(data.min_salary || 0)) || 0,
        max: Math.round(parseFloat(data.max_salary || 0)) || 0,
      },
      percentiles: {
        p25: Math.round(parseFloat(data.p25 || 0)) || 0,
        median: Math.round(parseFloat(data.median || 0)) || 0,
        p75: Math.round(parseFloat(data.p75 || 0)) || 0,
      },
      sampleSize: parseInt(data.count) || 0,
      source: "Your job applications",
    };
  }

  /**
   * Generate salary comparison insights
   */
  generateSalaryComparison(yourData, marketData) {
    if (!marketData || !marketData.median || !yourData.sampleSize) {
      return null;
    }

    const yourAvg = yourData.average;
    const nationalMedian = marketData.median;
    const difference = yourAvg - nationalMedian;
    const percentDiff = ((difference / nationalMedian) * 100).toFixed(1);

    return {
      difference,
      percentDifference: percentDiff,
      positioning:
        percentDiff > 10
          ? "above_market"
          : percentDiff < -10
          ? "below_market"
          : "at_market",
      insight: this.generateSalaryInsight(
        percentDiff,
        difference,
        yourData.sampleSize
      ),
    };
  }

  /**
   * Generate human-readable salary insight
   */
  generateSalaryInsight(percentDiff, dollarDiff, sampleSize) {
    if (percentDiff > 10) {
      return `Your market shows salaries ${percentDiff}% above the national median ($${Math.abs(
        dollarDiff
      ).toLocaleString()} higher). This could indicate strong local demand or more senior positions.`;
    } else if (percentDiff < -10) {
      return `Your market shows salaries ${Math.abs(
        percentDiff
      )}% below the national median ($${Math.abs(
        dollarDiff
      ).toLocaleString()} lower). Consider targeting higher-paying opportunities or locations.`;
    } else {
      return `Your market aligns closely with the national median (within ${Math.abs(
        percentDiff
      )}%). This suggests competitive market positioning.`;
    }
  }

  // ========================================
  // INDUSTRY TRENDS
  // ========================================

  /**
   * Get industry trend analysis
   */
  async getIndustryTrends(industry, location = null, timeframe = 365) {
    const cacheKey = `industry:${industry}:${location || "any"}:${timeframe}d`;

    // Check cache
    const cached = await this.getFromCache(cacheKey, "industry_trends");
    if (cached) {
      return { ...cached.data, cached: true };
    }

    try {
      // Get Adzuna real market data
      const adzunaTrends = await adzunaService.getIndustryTrends(
        industry,
        location
      );
      const adzunaCompanies = await adzunaService.getTopCompanies(
        industry,
        location,
        10
      );

      const result = {
        industry,
        location,
        timeframe,
        growthMetrics: adzunaTrends || {
          recentJobs: 0,
          previousPeriodJobs: 0,
          growthRate: 0,
          trend: "unknown",
          note: "Market data unavailable",
        },
        hiringActivity: adzunaTrends
          ? {
              totalJobs: adzunaTrends.recentJobs,
              activeCompanies: adzunaCompanies.length,
              avgJobAge: 15, // Adzuna data is current
              hiringVelocity: "high",
              insight: `${
                adzunaTrends.recentJobs
              } active job postings in the last 30 days. ${
                adzunaTrends.trend === "growing" ||
                adzunaTrends.trend === "strong_growth"
                  ? "Strong hiring demand."
                  : "Stable market conditions."
              }`,
            }
          : await this.calculateHiringActivity(industry, location, timeframe),
        topCompanies:
          adzunaCompanies.length > 0
            ? adzunaCompanies
            : await this.getTopHiringCompanies(industry, location, timeframe),
        salaryTrends: [], // Adzuna doesn't provide historical trends
        source: adzunaTrends ? "Adzuna (Real-time market data)" : "Local data",
        generatedAt: new Date().toISOString(),
      };

      // Cache for 1 day
      await this.storeInCache(cacheKey, "industry_trends", result, 1);

      return { ...result, cached: false };
    } catch (error) {
      console.error("❌ Error getting industry trends:", error);
      throw error;
    }
  }

  /**
   * Calculate growth metrics
   */
  async calculateGrowthMetrics(industry, location, timeframe) {
    let query = `
      WITH periods AS (
        SELECT 
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${timeframe} days') as recent_count,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${
            timeframe * 2
          } days' 
                           AND created_at < NOW() - INTERVAL '${timeframe} days') as previous_count
        FROM job_opportunities
        WHERE industry ILIKE $1
          AND (archived = false OR archived IS NULL)
    `;

    const params = [`%${industry}%`];

    // Note: Location filter removed to get broader results
    // Most job data doesn't have precise location matching

    query += `)
      SELECT 
        recent_count,
        previous_count,
        CASE 
          WHEN previous_count > 0 THEN 
            ROUND(((recent_count::NUMERIC - previous_count) / previous_count * 100)::NUMERIC, 2)
          ELSE NULL 
        END as growth_rate
      FROM periods`;

    const result = await database.query(query, params);
    const data = result.rows[0];

    return {
      recentJobs: parseInt(data.recent_count) || 0,
      previousPeriodJobs: parseInt(data.previous_count) || 0,
      growthRate: parseFloat(data.growth_rate) || 0,
      trend:
        data.growth_rate > 10
          ? "strong_growth"
          : data.growth_rate > 0
          ? "growing"
          : data.growth_rate < -10
          ? "declining"
          : "stable",
    };
  }

  /**
   * Calculate hiring activity
   */
  async calculateHiringActivity(industry, location, timeframe) {
    let query = `
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(DISTINCT company) as active_companies,
        ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)::NUMERIC, 1) as avg_age_days
      FROM job_opportunities
      WHERE industry ILIKE $1
        AND created_at >= NOW() - INTERVAL '${timeframe} days'
        AND (archived = false OR archived IS NULL)
    `;

    const params = [`%${industry}%`];

    // Note: Location filter removed for broader results

    const result = await database.query(query, params);
    const data = result.rows[0];

    const avgAge = parseFloat(data.avg_age_days) || 0;

    const totalJobs = parseInt(data.total_jobs) || 0;
    const avgAgeDays = Math.round(avgAge);

    return {
      totalJobs,
      activeCompanies: parseInt(data.active_companies) || 0,
      avgJobAge: avgAgeDays,
      hiringVelocity:
        avgAge < 14
          ? "very_high"
          : avgAge < 30
          ? "high"
          : avgAge < 60
          ? "moderate"
          : "low",
      insight:
        totalJobs === 0
          ? "No recent job postings in this timeframe."
          : avgAge > 180
          ? `Jobs in your database are ${avgAgeDays} days old on average. Consider adding more recent opportunities for current market insights.`
          : avgAge > 0 && avgAge < 30
          ? `Companies are filling positions quickly (${avgAgeDays} days average). Strong hiring demand.`
          : avgAge > 0
          ? `Positions staying open longer (${avgAgeDays} days average). More selective hiring.`
          : "Limited recent activity data available.",
    };
  }

  /**
   * Get top hiring companies
   */
  async getTopHiringCompanies(industry, location, timeframe, limit = 10) {
    let query = `
      SELECT 
        company,
        COUNT(*) as job_count,
        AVG(salary_max) as avg_salary
      FROM job_opportunities
      WHERE industry ILIKE $1
        AND created_at >= NOW() - INTERVAL '${timeframe} days'
        AND (archived = false OR archived IS NULL)
        AND company IS NOT NULL
    `;

    const params = [`%${industry}%`];

    if (location) {
      query += ` AND location ILIKE $${params.length + 1}`;
      params.push(`%${location}%`);
    }

    query += `
      GROUP BY company
      ORDER BY job_count DESC
      LIMIT ${limit}
    `;

    const result = await database.query(query, params);

    return result.rows.map((row) => ({
      company: row.company,
      jobCount: parseInt(row.job_count),
      avgSalary: row.avg_salary ? Math.round(parseFloat(row.avg_salary)) : null,
    }));
  }

  /**
   * Get industry salary trends over time
   */
  async getIndustrySalaryTrends(industry, location, timeframe) {
    let query = `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        AVG(salary_max) as avg_salary,
        COUNT(*) as count
      FROM job_opportunities
      WHERE industry ILIKE $1
        AND created_at >= NOW() - INTERVAL '${timeframe} days'
        AND (archived = false OR archived IS NULL)
        AND salary_max IS NOT NULL
    `;

    const params = [`%${industry}%`];

    if (location) {
      query += ` AND location ILIKE $${params.length + 1}`;
      params.push(`%${location}%`);
    }

    query += `
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `;

    const result = await database.query(query, params);

    return result.rows.map((row) => ({
      month: row.month,
      avgSalary: Math.round(parseFloat(row.avg_salary)),
      jobCount: parseInt(row.count),
    }));
  }

  // ========================================
  // SKILL DEMAND ANALYSIS
  // ========================================

  /**
   * Get skill demand trends
   */
  async getSkillDemandTrends(industry = null, timeframe = 365) {
    const cacheKey = `skills:${industry || "all"}:${timeframe}d`;

    // Check cache
    const cached = await this.getFromCache(cacheKey, "skill_demand");
    if (cached) {
      return { ...cached.data, cached: true };
    }

    try {
      // Use Adzuna to get real skill demand from live job postings
      const topTechSkills = [
        "Python",
        "JavaScript",
        "Java",
        "TypeScript",
        "React",
        "Node.js",
        "AWS",
        "Docker",
        "Kubernetes",
        "SQL",
        "PostgreSQL",
        "MongoDB",
        "Git",
        "REST API",
        "GraphQL",
        "Machine Learning",
        "AI",
        "Angular",
        "Vue",
        "Go",
      ];

      // Get total tech jobs count for percentage calculation
      // Use "software" as a broad category to get total tech job market
      const totalTechJobs = await adzunaService.getIndustryTrends(
        "software",
        null
      );
      const totalJobCount = totalTechJobs?.recentJobs || 100000; // Fallback to 100k if unavailable

      const skillsData = await adzunaService.getSkillDemand(
        topTechSkills,
        null,
        30
      );

      // Convert to expected format with ACTUAL percentages
      const skills = skillsData.map((skill) => ({
        skillName: skill.skillName,
        demandCount: skill.demandCount,
        percentageOfJobs: ((skill.demandCount / totalJobCount) * 100).toFixed(
          1
        ),
        growthRate: 0, // Adzuna doesn't provide historical growth
        source: "Adzuna",
      }));

      const result = {
        industry,
        timeframe: 30, // Adzuna uses 30 days
        topSkills: skills.slice(0, 20),
        emergingSkills: [], // Would need historical data
        decliningSkills: [],
        source:
          skillsData.length > 0
            ? "Adzuna (Real-time job market)"
            : "No data available",
        totalMarketJobs: totalJobCount,
        generatedAt: new Date().toISOString(),
      };

      // Cache for 7 days
      await this.storeInCache(cacheKey, "skill_demand", result, 7);

      return { ...result, cached: false };
    } catch (error) {
      console.error("❌ Error getting skill demand trends:", error);
      throw error;
    }
  }

  /**
   * Extract top skills from job descriptions
   */
  async extractTopSkills(industry, timeframe) {
    // Common tech skills to track
    const skillsToTrack = [
      "Python",
      "JavaScript",
      "Java",
      "C++",
      "C#",
      "Go",
      "Rust",
      "TypeScript",
      "React",
      "Angular",
      "Vue",
      "Node.js",
      "Django",
      "Flask",
      "Spring",
      "AWS",
      "Azure",
      "GCP",
      "Docker",
      "Kubernetes",
      "Terraform",
      "SQL",
      "PostgreSQL",
      "MySQL",
      "MongoDB",
      "Redis",
      "Git",
      "CI/CD",
      "Agile",
      "Scrum",
      "Machine Learning",
      "AI",
      "Deep Learning",
      "TensorFlow",
      "PyTorch",
      "REST API",
      "GraphQL",
      "Microservices",
    ];

    let query = `
      SELECT job_description
      FROM job_opportunities
      WHERE created_at >= NOW() - INTERVAL '${timeframe} days'
        AND (archived = false OR archived IS NULL)
        AND job_description IS NOT NULL
    `;

    const params = [];

    if (industry) {
      query += ` AND industry ILIKE $1`;
      params.push(`%${industry}%`);
    }

    const result = await database.query(query, params);

    // Count skill mentions
    const skillCounts = {};
    skillsToTrack.forEach((skill) => {
      skillCounts[skill] = 0;
    });

    result.rows.forEach((row) => {
      const description = row.job_description.toLowerCase();
      skillsToTrack.forEach((skill) => {
        if (description.includes(skill.toLowerCase())) {
          skillCounts[skill]++;
        }
      });
    });

    // Convert to array and calculate percentages
    const totalJobs = result.rows.length;
    const skillsArray = Object.entries(skillCounts)
      .map(([skill, count]) => ({
        skillName: skill,
        demandCount: count,
        percentageOfJobs:
          totalJobs > 0 ? ((count / totalJobs) * 100).toFixed(1) : 0,
        growthRate: 0, // Would need historical data to calculate
      }))
      .filter((s) => s.demandCount > 0)
      .sort((a, b) => b.demandCount - a.demandCount);

    return skillsArray;
  }

  // ========================================
  // MARKET INSIGHTS (AI-Generated)
  // ========================================

  /**
   * Generate personalized market insights for a user
   */
  async generateUserInsights(userId) {
    try {
      // Get user profile
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        throw new Error("User profile not found");
      }

      // Get market data
      const marketData = await this.getMarketDataForUser(userProfile);

      // Generate insights with AI if available, fallback to basic on error
      if (this.openai) {
        try {
          return await this.generateAIInsights(userId, userProfile, marketData);
        } catch (aiError) {
          console.warn(
            "⚠️ AI insights failed, falling back to basic insights:",
            aiError.message
          );
          return await this.generateBasicInsights(
            userId,
            userProfile,
            marketData
          );
        }
      } else {
        return await this.generateBasicInsights(
          userId,
          userProfile,
          marketData
        );
      }
    } catch (error) {
      console.error("❌ Error generating user insights:", error);
      throw error;
    }
  }

  /**
   * Get user profile data
   */
  async getUserProfile(userId) {
    const query = `
      SELECT 
        p.industry,
        p.exp_level,
        p.job_title,
        p.city,
        p.state,
        array_agg(DISTINCT s.skill_name) as skills
      FROM profiles p
      LEFT JOIN skills s ON s.user_id = p.user_id
      WHERE p.user_id = $1
      GROUP BY p.user_id, p.industry, p.exp_level, p.job_title, p.city, p.state
    `;

    const result = await database.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Get market data relevant to user
   */
  async getMarketDataForUser(userProfile) {
    const location = userProfile.state
      ? `${userProfile.city}, ${userProfile.state}`
      : null;

    const [salaryData, industryTrends, skillTrends] = await Promise.all([
      this.getSalaryIntelligence(
        userProfile.job_title,
        location,
        userProfile.industry
      ),
      this.getIndustryTrends(userProfile.industry, location),
      this.getSkillDemandTrends(userProfile.industry),
    ]);

    return { salaryData, industryTrends, skillTrends };
  }

  /**
   * Generate AI-powered insights
   */
  async generateAIInsights(userId, userProfile, marketData) {
    const topSkillsWithDemand = marketData.skillTrends.topSkills
      .slice(0, 10)
      .map(
        (s) =>
          `${s.skillName} (${s.demandCount.toLocaleString()} jobs, ${
            s.percentageOfJobs
          }%)`
      )
      .join(", ");

    const prompt = `You are an expert career advisor. Analyze this data and generate 2-3 highly actionable, specific career insights.

PROFILE:
• Role: ${userProfile.job_title} in ${userProfile.industry}
• Experience: ${userProfile.exp_level}
• Location: ${userProfile.city}, ${userProfile.state}
• Current Skills: ${
      userProfile.skills?.filter((s) => s).join(", ") || "Not specified"
    }

MARKET DATA:
• Your Market Salary: $${marketData.salaryData.yourMarket.average.toLocaleString()} (${
      marketData.salaryData.yourMarket.sampleSize
    } jobs)
• National Median: $${
      marketData.salaryData.nationalBenchmark?.median?.toLocaleString() || "N/A"
    }
• Salary Positioning: ${
      marketData.salaryData.comparison?.percentDifference || "0"
    }% vs national
• Industry Growth: ${
      marketData.industryTrends.growthMetrics.growthRate
    }% (${marketData.industryTrends.growthMetrics.recentJobs.toLocaleString()} jobs, ${
      marketData.industryTrends.growthMetrics.trend
    })
• Hiring Velocity: ${marketData.industryTrends.hiringActivity.hiringVelocity}
• Top In-Demand Skills: ${topSkillsWithDemand}
• Top Hiring Companies: ${marketData.industryTrends.topCompanies
      .slice(0, 5)
      .map((c) => c.company)
      .join(", ")}

INSTRUCTIONS:
1. Focus on the MOST impactful insights based on the data
2. Prioritize actionable recommendations over observations
3. Use "high" priority ONLY for critical opportunities or gaps
4. Be specific with numbers and percentages
5. Filter out niche/low-demand skills - focus on mainstream technologies

Return JSON with "insights" array:
{
  "insights": [{
    "type": "skill_gap" | "salary_positioning" | "market_opportunity" | "career_strategy",
    "priority": "high" | "medium" | "low",
    "title": "Concise, specific title (max 50 chars)",
    "description": "2-3 sentences with specific data points and clear reasoning",
    "actionableItems": ["Specific action 1", "Specific action 2", "Specific action 3"],
    "supportingData": { relevant key-value pairs }
  }]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a career advisor providing data-driven insights.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const insights =
        JSON.parse(response.choices[0].message.content).insights || [];

      // Store insights in database
      for (const insight of insights) {
        await database.query(
          `
          INSERT INTO market_insights 
            (user_id, insight_type, title, description, priority, actionable_items, supporting_data, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
        `,
          [
            userId,
            insight.type,
            insight.title,
            insight.description,
            insight.priority,
            JSON.stringify(insight.actionableItems),
            JSON.stringify(insight.supportingData),
          ]
        );
      }

      return insights;
    } catch (error) {
      console.error("❌ Error generating AI insights:", error);
      throw error; // Let generateUserInsights handle the fallback
    }
  }

  /**
   * Generate basic insights without AI
   */
  async generateBasicInsights(userId, userProfile, marketData) {
    const insights = [];

    // Salary positioning insight
    if (marketData.salaryData.yourMarket.sampleSize > 0) {
      const yourAvg = marketData.salaryData.yourMarket.average;
      const nationalMedian = marketData.salaryData.nationalBenchmark?.median;

      if (nationalMedian) {
        const comp = marketData.salaryData.comparison;
        insights.push({
          type: "salary_positioning",
          priority: comp.positioning === "below_market" ? "high" : "medium",
          title: "Salary Market Positioning",
          description: comp.insight,
          actionableItems:
            comp.positioning === "below_market"
              ? [
                  "Research higher-paying opportunities",
                  "Update resume to highlight achievements",
                  "Consider salary negotiation",
                ]
              : ["Continue current strategy", "Monitor market changes"],
          supportingData: {
            yourAverage: yourAvg,
            nationalMedian: nationalMedian,
            difference: comp.difference,
          },
        });
      } else {
        // No national data, just show your market data
        insights.push({
          type: "salary_positioning",
          priority: "medium",
          title: "Your Market Salary Range",
          description: `Based on ${
            marketData.salaryData.yourMarket.sampleSize
          } jobs in your search, the average salary is $${yourAvg.toLocaleString()} with a range of $${marketData.salaryData.yourMarket.range.min.toLocaleString()} - $${marketData.salaryData.yourMarket.range.max.toLocaleString()}.`,
          actionableItems: [
            "Target positions in the higher end of this range",
            "Highlight skills that command premium salaries",
            "Research additional salary benchmarks",
          ],
          supportingData: {
            average: yourAvg,
            range: marketData.salaryData.yourMarket.range,
            percentiles: marketData.salaryData.yourMarket.percentiles,
          },
        });
      }
    }

    // Industry growth insight
    const growth = marketData.industryTrends.growthMetrics;
    if (growth.recentJobs > 0) {
      insights.push({
        type: "market_opportunity",
        priority: growth.trend === "strong_growth" ? "high" : "medium",
        title: "Industry Activity Analysis",
        description: `${userProfile.industry} shows ${
          growth.recentJobs
        } opportunities in the last ${
          marketData.industryTrends.timeframe
        } days${
          growth.growthRate !== 0 ? ` with ${growth.growthRate}% growth` : ""
        }. ${
          growth.trend === "strong_growth"
            ? "Strong hiring demand - favorable time to apply."
            : growth.trend === "declining"
            ? "Slower hiring - be more selective."
            : "Stable market conditions."
        }`,
        actionableItems:
          growth.trend === "strong_growth" || growth.recentJobs > 10
            ? [
                "Increase application volume",
                "Act quickly on opportunities",
                "Leverage strong demand in negotiations",
              ]
            : [
                "Focus on quality over quantity",
                "Build stronger applications",
                "Network actively",
              ],
        supportingData: {
          growthRate: growth.growthRate,
          recentJobs: growth.recentJobs,
          trend: growth.trend,
        },
      });
    }

    // Skill demand insight - only show mainstream, high-demand skills
    if (marketData.skillTrends.topSkills.length > 0) {
      // Filter for skills with significant demand (>1000 jobs or >1% of market)
      const highDemandSkills = marketData.skillTrends.topSkills
        .filter(
          (s) => s.demandCount > 1000 || parseFloat(s.percentageOfJobs) > 1
        )
        .slice(0, 5);

      if (highDemandSkills.length > 0) {
        insights.push({
          type: "skill_gap",
          priority: "low", // Changed from medium - not urgent
          title: "In-Demand Skills to Highlight",
          description: `The most sought-after skills are: ${highDemandSkills
            .map(
              (s) => `${s.skillName} (${s.demandCount.toLocaleString()} jobs)`
            )
            .join(
              ", "
            )}. Focus on these mainstream technologies when updating your materials.`,
          actionableItems: [
            "Highlight relevant skills prominently in resume summary",
            "Prepare specific examples for top 3 skills in interviews",
            "Consider certifications in skills you want to develop",
          ],
          supportingData: {
            topSkills: highDemandSkills.map((s) => ({
              skill: s.skillName,
              demand: s.demandCount,
              percentage: s.percentageOfJobs,
            })),
          },
        });
      }
    }

    // Store insights
    for (const insight of insights) {
      await database.query(
        `
        INSERT INTO market_insights 
          (user_id, insight_type, title, description, priority, actionable_items, supporting_data, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      `,
        [
          userId,
          insight.type,
          insight.title,
          insight.description,
          insight.priority,
          JSON.stringify(insight.actionableItems),
          JSON.stringify(insight.supportingData),
        ]
      );
    }

    return insights;
  }

  /**
   * Get user's insights from database
   */
  async getUserInsights(userId, status = "active") {
    const query = `
      SELECT *
      FROM market_insights
      WHERE user_id = $1
        AND status = $2
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY 
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        created_at DESC
    `;

    const result = await database.query(query, [userId, status]);
    return result.rows;
  }

  /**
   * Update insight status
   */
  async updateInsightStatus(insightId, userId, status) {
    const query = `
      UPDATE market_insights
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;

    const result = await database.query(query, [status, insightId, userId]);
    return result.rows[0];
  }
}

export default new MarketIntelligenceService();
