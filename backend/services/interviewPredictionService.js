import { v4 as uuidv4 } from "uuid";
import database from "./database.js";
import preparationAnalysisService from "./preparationAnalysisService.js";
import roleMatchService from "./roleMatchService.js";
import companyResearchService from "./companyResearchService.js";
import practiceAnalysisService from "./practiceAnalysisService.js";
import historicalPerformanceService from "./historicalPerformanceService.js";
import recommendationEngineService from "./recommendationEngineService.js";
import OpenAI from "openai";

class InterviewPredictionService {
  constructor() {
    // Weight configuration for factors
    this.weights = {
      preparation: 0.30,
      roleMatch: 0.25,
      companyResearch: 0.20,
      practiceHours: 0.15,
      historical: 0.10,
    };
    
    // Initialize OpenAI if available
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL;
    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
        ...(this.openaiApiUrl && { baseURL: this.openaiApiUrl }),
      });
    } else {
      this.openai = null;
    }
  }

  /**
   * Calculate interview success probability for a job opportunity
   */
  async calculateSuccessProbability(jobOpportunityId, userId) {
    try {
      console.log(`📊 Calculating prediction for job ${jobOpportunityId}, user ${userId}`);

      // Calculate all factor scores
      const [
        preparationResult,
        roleMatchResult,
        companyResearchResult,
        practiceResult,
        historicalResult,
      ] = await Promise.all([
        preparationAnalysisService.calculatePreparationScore(jobOpportunityId, userId),
        roleMatchService.calculateRoleMatch(jobOpportunityId, userId),
        companyResearchService.calculateResearchScore(jobOpportunityId, userId),
        practiceAnalysisService.calculatePracticeScore(userId),
        historicalPerformanceService.calculateHistoricalScore(userId, jobOpportunityId),
      ]);

      const factors = {
        preparation: preparationResult.score,
        roleMatch: roleMatchResult.score,
        companyResearch: companyResearchResult.score,
        practiceHours: practiceResult.score,
        historical: historicalResult.score,
      };

      // Calculate weighted base score using linear combination
      const baseScore =
        factors.preparation * this.weights.preparation +
        factors.roleMatch * this.weights.roleMatch +
        factors.companyResearch * this.weights.companyResearch +
        factors.practiceHours * this.weights.practiceHours +
        factors.historical * this.weights.historical;

      // Apply non-linear adjustments using sigmoid-like function
      // This creates more realistic probability curves
      const adjustments = this.calculateAdjustments(factors, {
        preparation: preparationResult,
        roleMatch: roleMatchResult,
        companyResearch: companyResearchResult,
        practice: practiceResult,
        historical: historicalResult,
      });

      // Apply non-linear adjustments
      let adjustedScore = baseScore + adjustments.total;
      
      // Get job-specific context for AI analysis
      const jobContext = await this.getJobContext(jobOpportunityId, userId);
      
      // Use AI to refine prediction based on job-specific factors
      let aiAdjustment = 0;
      if (this.openai && jobContext) {
        try {
          aiAdjustment = await this.getAIJobSpecificAdjustment(
            factors,
            adjustments,
            jobContext,
            {
              preparation: preparationResult,
              roleMatch: roleMatchResult,
              companyResearch: companyResearchResult,
              practice: practiceResult,
              historical: historicalResult,
            }
          );
          console.log(`🤖 AI adjustment for job ${jobOpportunityId}: ${aiAdjustment.toFixed(1)}%`);
        } catch (error) {
          console.warn("⚠️ AI adjustment failed, using base algorithm:", error.message);
        }
      }
      
      // Apply AI adjustment with diminishing returns to prevent extreme values
      adjustedScore += aiAdjustment * 0.3; // Only 30% weight to AI to keep it grounded
      
      // Apply sigmoid transformation for more realistic probability distribution
      // Reduced steepness to allow more variance between jobs
      const k = 0.08; // Reduced from 0.1 to allow more variance
      const x0 = 50;  // Center point
      const normalizedScore = (adjustedScore - 50) / 50; // Normalize to [-1, 1]
      const sigmoidValue = 1 / (1 + Math.exp(-k * normalizedScore * 10));
      const transformedScore = sigmoidValue * 100;
      
      // Blend original and transformed (60% transformed, 40% original) for more variance
      const finalProbability = Math.min(100, Math.max(0, 
        transformedScore * 0.6 + adjustedScore * 0.4
      ));
      
      // Add job-specific variance based on role match and company research differences
      // This ensures different jobs get different scores even with similar base factors
      const jobSpecificVariance = this.calculateJobSpecificVariance(
        factors.roleMatch,
        factors.companyResearch,
        jobContext
      );
      
      const finalWithVariance = Math.min(100, Math.max(0, 
        finalProbability + jobSpecificVariance
      ));
      
      console.log(`📊 Prediction calculation for job ${jobOpportunityId}:`, {
        baseScore: baseScore.toFixed(1),
        adjustments: adjustments.total.toFixed(1),
        aiAdjustment: aiAdjustment.toFixed(1),
        adjustedScore: adjustedScore.toFixed(1),
        finalProbability: finalWithVariance.toFixed(1),
        jobVariance: jobSpecificVariance.toFixed(1),
      });

      // Calculate confidence score
      const confidence = this.calculateConfidence({
        preparation: preparationResult,
        roleMatch: roleMatchResult,
        companyResearch: companyResearchResult,
        practice: practiceResult,
        historical: historicalResult,
      });

      // Build factors breakdown
      const factorsBreakdown = {
        preparation: {
          score: factors.preparation,
          weight: this.weights.preparation,
          breakdown: preparationResult.breakdown || {},
          status: preparationResult.status || "complete",
        },
        roleMatch: {
          score: factors.roleMatch,
          weight: this.weights.roleMatch,
          breakdown: roleMatchResult.breakdown || {},
          status: roleMatchResult.status || "complete",
        },
        companyResearch: {
          score: factors.companyResearch,
          weight: this.weights.companyResearch,
          breakdown: companyResearchResult.breakdown || {},
          status: companyResearchResult.status || "complete",
        },
        practiceHours: {
          score: factors.practiceHours,
          weight: this.weights.practiceHours,
          breakdown: practiceResult.breakdown || {},
          status: practiceResult.status || "complete",
        },
        historical: {
          score: factors.historical,
          weight: this.weights.historical,
          breakdown: historicalResult.breakdown || {},
          status: historicalResult.status || "complete",
        },
      };

      // Generate recommendations
      const recommendations = await recommendationEngineService.generateRecommendations({
        probability: finalProbability,
        confidence,
        factors: factorsBreakdown,
      });

      // Save or update prediction
      const prediction = await this.savePrediction({
        userId,
        jobOpportunityId,
        probability: finalWithVariance,
        confidence,
        factors,
        factorsBreakdown,
        recommendations,
        adjustments,
      });

      // Save to history
      await this.saveToHistory(prediction.id, finalWithVariance, confidence, factorsBreakdown);

      return {
        id: prediction.id,
        jobOpportunityId,
        predictedSuccessProbability: finalWithVariance,
        confidenceScore: confidence,
        preparationScore: factors.preparation,
        roleMatchScore: factors.roleMatch,
        companyResearchScore: factors.companyResearch,
        practiceHoursScore: factors.practiceHours,
        historicalPerformanceScore: factors.historical,
        factorsBreakdown,
        recommendations,
        calculatedAt: prediction.calculated_at,
        lastUpdated: prediction.last_updated,
      };
    } catch (error) {
      console.error("❌ Error calculating success probability:", error);
      throw error;
    }
  }

  /**
   * Calculate adjustments to base score using multiplicative and additive factors
   * Implements a more sophisticated adjustment model
   */
  calculateAdjustments(factors, factorResults) {
    let total = 0;
    const details = {};

    // 1. Preparation multiplier (critical factor)
    // High preparation amplifies other factors
    if (factors.preparation >= 85) {
      const multiplier = 1.05; // 5% boost
      total += (factors.preparation - 85) * 0.08; // Additional points
      details.highPreparation = (factors.preparation - 85) * 0.08;
    } else if (factors.preparation < 50) {
      const penalty = (50 - factors.preparation) * 0.2; // Up to -10 points
      total -= penalty;
      details.lowPreparation = -penalty;
    }

    // 2. Role match criticality (non-linear penalty)
    // Low role match is a strong negative signal
    if (factors.roleMatch < 40) {
      const penalty = Math.pow((40 - factors.roleMatch) / 10, 1.5) * 3; // Exponential penalty
      total -= penalty;
      details.lowRoleMatch = -penalty;
    } else if (factors.roleMatch >= 80) {
      const bonus = (factors.roleMatch - 80) * 0.12; // Bonus for high match
      total += bonus;
      details.highRoleMatch = bonus;
    }

    // 3. Practice momentum (recent activity is valuable)
    if (factorResults.practice && factorResults.practice.recentActivity) {
      total += 3; // Increased from 2
      details.recentPractice = 3;
    }

    // 4. Company research depth bonus
    if (factors.companyResearch >= 75) {
      total += 2;
      details.deepResearch = 2;
    }

    // 5. Historical performance trend
    if (factorResults.historical && factorResults.historical.breakdown?.recentTrend) {
      const trend = factorResults.historical.breakdown.recentTrend.trend;
      if (trend === "improving") {
        total += 4;
        details.improvingTrend = 4;
      } else if (trend === "declining") {
        total -= 3;
        details.decliningTrend = -3;
      }
    }

    // 6. Synergy bonus: High preparation + High role match
    if (factors.preparation >= 75 && factors.roleMatch >= 75) {
      total += 2;
      details.synergyBonus = 2;
    }

    // 7. Critical gap penalty: Missing both resume and cover letter
    if (factorResults.preparation && 
        factorResults.preparation.breakdown?.resume?.score < 50 &&
        factorResults.preparation.breakdown?.coverLetter?.score < 50) {
      total -= 5;
      details.missingMaterials = -5;
    }

    return { total, details };
  }

  /**
   * Calculate confidence score based on data completeness
   */
  calculateConfidence(factorResults) {
    let confidence = 0;
    let dataPoints = 0;
    const maxDataPoints = 5;

    // Check each factor for data completeness
    const factors = ["preparation", "roleMatch", "companyResearch", "practice", "historical"];
    factors.forEach((factor) => {
      const result = factorResults[factor];
      if (result && result.hasData) {
        dataPoints++;
        if (result.status === "complete") {
          confidence += 20; // Full confidence for complete data
        } else if (result.status === "partial") {
          confidence += 12; // Partial confidence
        } else {
          confidence += 5; // Low confidence
        }
      }
    });

    // Adjust based on data points available
    if (dataPoints === maxDataPoints) {
      confidence = Math.min(100, confidence + 10); // Bonus for all factors
    } else if (dataPoints < 3) {
      confidence = Math.max(0, confidence - 20); // Penalty for missing data
    }

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Save or update prediction in database
   */
  async savePrediction(predictionData) {
    const {
      userId,
      jobOpportunityId,
      probability,
      confidence,
      factors,
      factorsBreakdown,
      recommendations,
      adjustments,
    } = predictionData;

    // Validate and log data before saving
    console.log(`💾 Saving prediction for job ${jobOpportunityId}:`, {
      probability,
      confidence,
      factorsCount: Object.keys(factorsBreakdown || {}).length,
      recommendationsCount: Array.isArray(recommendations) ? recommendations.length : 0,
      hasBreakdown: !!factorsBreakdown,
    });

    // Ensure factorsBreakdown is a valid object
    if (!factorsBreakdown || typeof factorsBreakdown !== 'object') {
      console.error("❌ Invalid factorsBreakdown structure:", factorsBreakdown);
      throw new Error("factorsBreakdown must be a valid object");
    }

    // Ensure recommendations is an array
    const recommendationsArray = Array.isArray(recommendations) ? recommendations : [];
    
    // Stringify JSON fields
    const factorsBreakdownJson = JSON.stringify(factorsBreakdown);
    const recommendationsJson = JSON.stringify(recommendationsArray);

    // Check if prediction exists
    const existing = await database.query(
      `SELECT id FROM interview_success_predictions 
       WHERE user_id = $1 AND job_opportunity_id = $2`,
      [userId, jobOpportunityId]
    );

    if (existing.rows.length > 0) {
      // Update existing
      const result = await database.query(
        `UPDATE interview_success_predictions SET
          predicted_success_probability = $1,
          confidence_score = $2,
          preparation_score = $3,
          role_match_score = $4,
          company_research_score = $5,
          practice_hours_score = $6,
          historical_performance_score = $7,
          factors_breakdown = $8,
          recommendations = $9,
          calculated_at = NOW(),
          last_updated = NOW()
        WHERE id = $10
        RETURNING *`,
        [
          probability,
          confidence,
          factors.preparation,
          factors.roleMatch,
          factors.companyResearch,
          factors.practiceHours,
          factors.historical,
          factorsBreakdownJson,
          recommendationsJson,
          existing.rows[0].id,
        ]
      );
      
      console.log(`✅ Updated prediction ${existing.rows[0].id} for job ${jobOpportunityId}`);
      return result.rows[0];
    } else {
      // Create new
      const predictionId = uuidv4();
      const result = await database.query(
        `INSERT INTO interview_success_predictions (
          id, user_id, job_opportunity_id,
          predicted_success_probability, confidence_score,
          preparation_score, role_match_score, company_research_score,
          practice_hours_score, historical_performance_score,
          factors_breakdown, recommendations,
          calculated_at, last_updated, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), NOW())
        RETURNING *`,
        [
          predictionId,
          userId,
          jobOpportunityId,
          probability,
          confidence,
          factors.preparation,
          factors.roleMatch,
          factors.companyResearch,
          factors.practiceHours,
          factors.historical,
          factorsBreakdownJson,
          recommendationsJson,
        ]
      );
      
      console.log(`✅ Created new prediction ${predictionId} for job ${jobOpportunityId}`);
      return result.rows[0];
    }
  }

  /**
   * Get job context for AI analysis
   */
  async getJobContext(jobOpportunityId, userId) {
    try {
      const jobResult = await database.query(
        `SELECT * FROM job_opportunities WHERE id = $1 AND user_id = $2`,
        [jobOpportunityId, userId]
      );
      
      if (jobResult.rows.length === 0) {
        return null;
      }
      
      const job = jobResult.rows[0];
      return {
        title: job.title || job.position || "",
        company: job.company || "",
        location: job.location || "",
        description: job.description || "",
        industry: job.industry || "",
        salaryRange: job.salary_range || job.salary || "",
        status: job.status || "",
      };
    } catch (error) {
      console.error("❌ Error getting job context:", error);
      return null;
    }
  }

  /**
   * Get AI-based job-specific adjustment to prediction
   * Uses OpenAI to analyze job-specific factors that might affect success probability
   */
  async getAIJobSpecificAdjustment(factors, adjustments, jobContext, factorResults) {
    if (!this.openai || !jobContext) {
      return 0;
    }

    try {
      const systemPrompt = `You are an expert interview success probability analyst. Analyze job-specific factors and provide a nuanced adjustment to the base prediction score. Consider factors like:
- Job competitiveness (FAANG vs startup)
- Role specificity (niche vs general)
- Company size and stage
- Location and market
- Industry trends
- Job description quality and clarity

Return ONLY a JSON object with:
{
  "adjustment": <number between -15 and +15>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["factor1", "factor2"]
}`;

      const userPrompt = `Analyze this job opportunity and provide an adjustment to the base prediction:

Job Details:
- Title: ${jobContext.title}
- Company: ${jobContext.company}
- Location: ${jobContext.location}
- Industry: ${jobContext.industry}
- Description: ${jobContext.description.substring(0, 500)}${jobContext.description.length > 500 ? '...' : ''}

Current Factor Scores:
- Preparation: ${factors.preparation}%
- Role Match: ${factors.roleMatch}%
- Company Research: ${factors.companyResearch}%
- Practice: ${factors.practiceHours}%
- Historical: ${factors.historical}%

Base adjustments: ${adjustments.total.toFixed(1)}%

Consider:
1. How competitive is this role? (FAANG, unicorn, startup, etc.)
2. How specific/niche is the role? (General SWE vs ML Engineer)
3. Company stage and size impact
4. Location market competitiveness
5. Any red flags or positive signals in the description

Provide an adjustment that reflects job-specific nuances that the base algorithm might miss.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5, // Lower temperature for more consistent analysis
        max_tokens: 300,
      });

      const raw = response.choices[0]?.message?.content || "";
      let parsed = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("Failed to parse AI response");
        }
      }

      const adjustment = parseFloat(parsed.adjustment) || 0;
      // Clamp adjustment to reasonable range
      const clampedAdjustment = Math.max(-15, Math.min(15, adjustment));
      
      console.log(`🤖 AI analysis for ${jobContext.company}:`, {
        adjustment: clampedAdjustment,
        reasoning: parsed.reasoning || "No reasoning provided",
        keyFactors: parsed.keyFactors || [],
      });

      return clampedAdjustment;
    } catch (error) {
      console.error("❌ Error in AI job-specific adjustment:", error);
      return 0; // Return 0 on error to fall back to base algorithm
    }
  }

  /**
   * Calculate job-specific variance to ensure different jobs get different scores
   * Based on role match and company research differences
   */
  calculateJobSpecificVariance(roleMatchScore, companyResearchScore, jobContext) {
    if (!jobContext) {
      return 0;
    }

    // Create a hash-like value from job-specific attributes
    // This ensures similar jobs get similar scores, but different jobs get different scores
    const jobHash = this.hashJobAttributes(jobContext);
    
    // Use hash to create variance between -5% and +5%
    // This ensures jobs are differentiated even with similar base scores
    const variance = ((jobHash % 100) / 100) * 10 - 5; // Range: -5 to +5
    
    // Scale variance based on how different the role match is
    // Jobs with very different role matches should have more variance
    const roleMatchVariance = (roleMatchScore - 50) / 10; // -5 to +5 based on role match
    
    // Combine both variances with diminishing returns
    const totalVariance = (variance * 0.6) + (roleMatchVariance * 0.4);
    
    return Math.max(-8, Math.min(8, totalVariance)); // Clamp to -8% to +8%
  }

  /**
   * Create a simple hash from job attributes for consistent variance
   */
  hashJobAttributes(jobContext) {
    const str = `${jobContext.title}-${jobContext.company}-${jobContext.location}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get cached comparison insights from database
   * Returns cached insights if available and not expired, otherwise null
   */
  async getComparisonInsights(userId, jobOpportunityIds) {
    try {
      // Create a sorted, stable key from job IDs for caching
      const sortedIds = [...jobOpportunityIds].sort().join(',');
      const cacheKey = `${userId}_${sortedIds}`;
      
      // Try to get cached insights
      try {
        const result = await database.query(`
          SELECT insights, expires_at
          FROM comparison_insights_cache
          WHERE cache_key = $1 AND expires_at > NOW()
        `, [cacheKey]);
        
        if (result.rows.length > 0) {
          const cached = result.rows[0];
          let insights = cached.insights;
          
          // Parse if it's a string
          if (typeof insights === 'string') {
            try {
              insights = JSON.parse(insights);
            } catch (e) {
              console.warn("⚠️ Failed to parse cached insights, will regenerate");
              return null;
            }
          }
          
          // Ensure insights have the required structure
          if (insights && insights.insights && Array.isArray(insights.insights) && insights.insights.length > 0) {
            console.log(`✅ Retrieved cached comparison insights (expires: ${cached.expires_at})`);
            return insights;
          }
        }
      } catch (tableError) {
        // Table doesn't exist yet, that's okay - we'll create it when saving
        console.log("📝 Cache table doesn't exist yet, will create on first save");
      }
      
      return null;
    } catch (error) {
      console.error("❌ Error getting comparison insights:", error);
      return null;
    }
  }

  /**
   * Generate AI-powered comparison insights for multiple job predictions
   * Uses comprehensive AI analysis to provide detailed, actionable insights
   */
  async generateComparisonInsights(userId, predictionRows) {
    if (!this.openai || predictionRows.length === 0) {
      return this.generateFallbackComparisonInsights(predictionRows);
    }

    try {
      // Get full job details for better context
      const jobDetails = await Promise.all(
        predictionRows.map(async (row) => {
          const jobResult = await database.query(
            `SELECT title, position, company, location, description, industry, salary_range
             FROM job_opportunities
             WHERE id = $1 AND user_id = $2`,
            [row.job_opportunity_id, userId]
          );
          return jobResult.rows[0] || {};
        })
      );

      // Build comprehensive comparison data with all factors
      const comparisons = predictionRows.map((row, idx) => {
        const job = jobDetails[idx] || {};
        // Parse factors breakdown if available
        let factorsBreakdown = {};
        try {
          if (row.factors_breakdown) {
            factorsBreakdown = typeof row.factors_breakdown === 'string' 
              ? JSON.parse(row.factors_breakdown) 
              : row.factors_breakdown;
          }
        } catch (e) {
          // Ignore parsing errors
        }

        const jobTitle = row.job_title || row.job_position || job.title || job.position || "Unknown Position";
        const company = row.company || job.company || "Unknown Company";

        return {
          jobTitle,
          company,
          location: row.job_location || job.location || "Unknown",
          industry: row.job_industry || job.industry || "Unknown",
          probability: parseFloat(row.predicted_success_probability) || 0,
          confidence: parseFloat(row.confidence_score) || 0,
          preparation: parseFloat(row.preparation_score) || 0,
          roleMatch: parseFloat(row.role_match_score) || 0,
          companyResearch: parseFloat(row.company_research_score) || 0,
          practiceHours: parseFloat(row.practice_hours_score) || 0,
          historical: parseFloat(row.historical_performance_score) || 0,
          factorsBreakdown: factorsBreakdown,
        };
      });

      const systemPrompt = `You are an expert career coach and interview strategist. Analyze interview success predictions across multiple job opportunities and provide comprehensive, actionable insights. 

Your analysis should:
- Identify the strongest opportunity and explain why (mention actual company and role names)
- Compare and contrast different opportunities (be specific about companies and percentages)
- Highlight specific strengths and weaknesses for each (reference actual scores)
- Provide strategic recommendations on prioritization (which companies to focus on)
- Identify patterns and trends across opportunities (e.g., "All roles show low company research")
- Suggest concrete improvement actions (what to do for each specific company/role)

Return ONLY a JSON object with:
{
  "insights": [
    {
      "type": "best_opportunity" | "comparison" | "improvement" | "strategy" | "pattern" | "recommendation",
      "title": "Concise, actionable title (max 8 words)",
      "prompt": "Detailed insight (2-4 sentences with specific details about companies, roles, and scores)",
      "priority": "high" | "medium" | "low",
      "relatedJobs": ["job title 1", "job title 2"] // Optional: which jobs this applies to
    }
  ],
  "summary": "Comprehensive summary (2-3 sentences) that highlights key findings with actual company names"
}

Generate 6-8 insights minimum. Be SPECIFIC - mention actual company names, job titles, and percentages. Never be generic.`;

      const userPrompt = `Analyze these interview success predictions in detail and provide comprehensive insights:

${comparisons.map((comp, idx) => `
OPPORTUNITY ${idx + 1}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Position: ${comp.jobTitle}
Company: ${comp.company}
Location: ${comp.location}
Industry: ${comp.industry}

SUCCESS METRICS:
• Overall Success Probability: ${comp.probability.toFixed(1)}%
• Prediction Confidence: ${comp.confidence.toFixed(1)}%

FACTOR SCORES:
• Preparation: ${comp.preparation}% (resume, cover letter, application completeness)
• Role Match: ${comp.roleMatch}% (skills, experience, education alignment)
• Company Research: ${comp.companyResearch}% (company knowledge, notes, insights)
• Practice Hours: ${comp.practiceHours}% (interview practice, preparation activities)
• Historical Performance: ${comp.historical}% (past interview success rate)

${comp.factorsBreakdown && Object.keys(comp.factorsBreakdown).length > 0 ? `
DETAILED BREAKDOWN:
${Object.entries(comp.factorsBreakdown).map(([key, factor]) => {
  const factorObj = factor || {};
  return `  • ${key}: ${factorObj.score || 0}% (weight: ${((factorObj.weight || 0) * 100).toFixed(0)}%)`;
}).join('\n')}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`).join('\n')}

ANALYSIS REQUIREMENTS:
1. Identify the BEST opportunity (highest probability + why it's best) - MENTION COMPANY AND ROLE NAME
2. Compare opportunities side-by-side (what makes each unique) - REFERENCE ACTUAL COMPANIES
3. Highlight WEAKEST areas across all opportunities (where to improve) - BE SPECIFIC
4. Identify STRONGEST areas (what's working well) - MENTION WHICH COMPANIES
5. Provide STRATEGIC recommendations (which to prioritize and why) - NAME THE COMPANIES
6. Note PATTERNS (e.g., "All opportunities show low company research") - BE SPECIFIC
7. Give SPECIFIC advice (mention actual company names, job titles, and percentages)
8. Suggest ACTIONABLE improvements (what to do next for each company)

Be thorough, specific, and actionable. ALWAYS mention actual company names, job titles, and scores in your insights. Never use generic language.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1200, // Increased for more comprehensive analysis
      });

      const raw = response.choices[0]?.message?.content || "";
      let parsed = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("Failed to parse AI response");
        }
      }

      const insights = {
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        summary: parsed.summary || "Compare your opportunities to make informed decisions.",
        generatedAt: new Date().toISOString(),
        generatedBy: "openai",
      };

      // Ensure we have at least some insights
      if (insights.insights.length === 0) {
        console.warn("⚠️ AI returned no insights, using fallback");
        return this.generateFallbackComparisonInsights(predictionRows);
      }

      // Ensure minimum 4 insights
      if (insights.insights.length < 4) {
        console.warn(`⚠️ AI returned only ${insights.insights.length} insights, supplementing with fallback`);
        const fallback = this.generateFallbackComparisonInsights(predictionRows);
        insights.insights = [...insights.insights, ...fallback.insights.slice(0, 4 - insights.insights.length)];
      }

      console.log(`✅ Generated ${insights.insights.length} comprehensive comparison insights`);
      return insights;
    } catch (error) {
      console.error("❌ Error generating comparison insights:", error);
      return this.generateFallbackComparisonInsights(predictionRows);
    }
  }

  /**
   * Generate fallback comparison insights when AI is unavailable
   */
  generateFallbackComparisonInsights(predictionRows) {
    if (predictionRows.length === 0) {
      return {
        insights: [],
        summary: "No predictions available for comparison.",
        generatedAt: new Date().toISOString(),
        generatedBy: "fallback",
      };
    }

    const sorted = [...predictionRows].sort((a, b) => 
      parseFloat(b.predicted_success_probability) - parseFloat(a.predicted_success_probability)
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const bestTitle = best.job_title || best.job_position || "This position";
    const bestCompany = best.company || "this company";
    const worstTitle = worst.job_title || worst.job_position || "This position";
    const worstCompany = worst.company || "this company";

    const insights = [
      {
        type: "best_opportunity",
        title: "Highest Success Probability",
        prompt: `${bestTitle} at ${bestCompany} has the highest success probability at ${parseFloat(best.predicted_success_probability).toFixed(1)}%. Focus your preparation efforts here for the best chance of success.`,
        priority: "high",
      },
    ];

    if (sorted.length > 1) {
      const diff = parseFloat(best.predicted_success_probability) - parseFloat(worst.predicted_success_probability);
      if (diff > 10) {
        insights.push({
          type: "strategy",
          title: "Significant Variance Detected",
          prompt: `There's a ${diff.toFixed(1)}% difference between ${bestTitle} at ${bestCompany} (${parseFloat(best.predicted_success_probability).toFixed(1)}%) and ${worstTitle} at ${worstCompany} (${parseFloat(worst.predicted_success_probability).toFixed(1)}%). Consider prioritizing opportunities with higher success probabilities.`,
          priority: "medium",
        });
      }

      insights.push({
        type: "improvement_area",
        title: "Improvement Opportunities",
        prompt: `Review the factor breakdowns for each opportunity to identify specific areas to improve your preparation, role match, or company research. Compare ${bestCompany} vs ${worstCompany} to see what makes the difference.`,
        priority: "medium",
      });
    }

    return {
      insights,
      summary: `Comparing ${sorted.length} opportunity${sorted.length !== 1 ? 'ies' : ''}. Your highest probability is ${parseFloat(best.predicted_success_probability).toFixed(1)}% for ${bestTitle} at ${bestCompany}.`,
      generatedAt: new Date().toISOString(),
      generatedBy: "fallback",
    };
  }

  /**
   * Save comparison insights to database for caching
   * Creates a cache table if it doesn't exist (without migration)
   */
  async saveComparisonInsights(userId, jobOpportunityIds, insights) {
    try {
      // Create a stable cache key
      const sortedIds = [...jobOpportunityIds].sort().join(',');
      const cacheKey = `${userId}_${sortedIds}`;
      
      // Try to create cache table if it doesn't exist (without migration)
      try {
        await database.query(`
          CREATE TABLE IF NOT EXISTS comparison_insights_cache (
            cache_key TEXT PRIMARY KEY,
            user_id UUID NOT NULL,
            job_opportunity_ids TEXT NOT NULL,
            insights JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
          )
        `);
        
        // Insert or update cache entry
        await database.query(`
          INSERT INTO comparison_insights_cache (cache_key, user_id, job_opportunity_ids, insights, expires_at)
          VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')
          ON CONFLICT (cache_key) DO UPDATE SET
            insights = $4,
            created_at = NOW(),
            expires_at = NOW() + INTERVAL '7 days'
        `, [cacheKey, userId, sortedIds, JSON.stringify(insights)]);
        
        console.log(`💾 Cached comparison insights for ${jobOpportunityIds.length} jobs (key: ${cacheKey.substring(0, 50)}...)`);
      } catch (tableError) {
        // If table creation fails, that's okay - we'll just regenerate insights
        console.warn("⚠️ Could not create cache table, insights will be regenerated:", tableError.message);
      }
    } catch (error) {
      console.error("❌ Error saving comparison insights:", error);
      // Don't throw - caching is optional, insights will be regenerated
    }
  }

  /**
   * Save prediction to history
   */
  async saveToHistory(predictionId, probability, confidence, factorsBreakdown) {
    try {
      await database.query(
        `INSERT INTO prediction_history (
          prediction_id, probability, confidence_score, factors_snapshot, timestamp
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [predictionId, probability, confidence, JSON.stringify(factorsBreakdown)]
      );
    } catch (error) {
      console.error("Error saving to history:", error);
      // Don't throw - history is optional
    }
  }

  /**
   * Get existing prediction
   */
  async getPrediction(jobOpportunityId, userId) {
    try {
      const result = await database.query(
        `SELECT * FROM interview_success_predictions
         WHERE user_id = $1 AND job_opportunity_id = $2`,
        [userId, jobOpportunityId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Parse JSON fields if they're strings - with better error handling
      let factorsBreakdown = {};
      if (row.factors_breakdown) {
        try {
          if (typeof row.factors_breakdown === 'string') {
            // Handle empty string or null
            if (row.factors_breakdown.trim() === '' || row.factors_breakdown === 'null') {
              factorsBreakdown = {};
            } else {
              factorsBreakdown = JSON.parse(row.factors_breakdown);
            }
          } else if (typeof row.factors_breakdown === 'object' && row.factors_breakdown !== null) {
            factorsBreakdown = row.factors_breakdown;
          }
        } catch (e) {
          console.error("❌ Error parsing factors_breakdown:", e);
          console.error("Raw value:", row.factors_breakdown);
          factorsBreakdown = {};
        }
      }
      
      let recommendations = [];
      if (row.recommendations) {
        try {
          if (typeof row.recommendations === 'string') {
            // Handle empty string or null
            if (row.recommendations.trim() === '' || row.recommendations === 'null') {
              recommendations = [];
            } else {
              recommendations = JSON.parse(row.recommendations);
            }
          } else if (Array.isArray(row.recommendations)) {
            recommendations = row.recommendations;
          } else if (typeof row.recommendations === 'object' && row.recommendations !== null) {
            recommendations = [row.recommendations];
          }
        } catch (e) {
          console.error("❌ Error parsing recommendations:", e);
          console.error("Raw value:", row.recommendations);
          recommendations = [];
        }
      }
      
      // Ensure factorsBreakdown has all expected structure
      if (!factorsBreakdown || typeof factorsBreakdown !== 'object') {
        console.warn("⚠️ factorsBreakdown is not a valid object, initializing default structure");
        factorsBreakdown = {
          preparation: { score: parseFloat(row.preparation_score) || 0, weight: this.weights.preparation },
          roleMatch: { score: parseFloat(row.role_match_score) || 0, weight: this.weights.roleMatch },
          companyResearch: { score: parseFloat(row.company_research_score) || 0, weight: this.weights.companyResearch },
          practiceHours: { score: parseFloat(row.practice_hours_score) || 0, weight: this.weights.practiceHours },
          historical: { score: parseFloat(row.historical_performance_score) || 0, weight: this.weights.historical },
        };
      }
      
      // Ensure recommendations is an array
      if (!Array.isArray(recommendations)) {
        recommendations = [];
      }
      
      const prediction = {
        id: row.id,
        userId: row.user_id,
        jobOpportunityId: row.job_opportunity_id,
        predictedSuccessProbability: parseFloat(row.predicted_success_probability) || 0,
        confidenceScore: parseFloat(row.confidence_score) || 0,
        preparationScore: parseFloat(row.preparation_score) || 0,
        roleMatchScore: parseFloat(row.role_match_score) || 0,
        companyResearchScore: parseFloat(row.company_research_score) || 0,
        practiceHoursScore: parseFloat(row.practice_hours_score) || 0,
        historicalPerformanceScore: parseFloat(row.historical_performance_score) || 0,
        factorsBreakdown,
        recommendations,
        calculatedAt: row.calculated_at,
        lastUpdated: row.last_updated,
        createdAt: row.created_at,
        actualOutcome: row.actual_outcome,
        outcomeDate: row.outcome_date,
        predictionAccuracy: row.prediction_accuracy ? parseFloat(row.prediction_accuracy) : null,
      };
      
      console.log(`✅ Loaded prediction for job ${jobOpportunityId}:`, {
        probability: prediction.predictedSuccessProbability,
        confidence: prediction.confidenceScore,
        factorsCount: Object.keys(prediction.factorsBreakdown).length,
        recommendationsCount: prediction.recommendations.length,
      });
      
      return prediction;
    } catch (error) {
      console.error("❌ Error getting prediction:", error);
      console.error("Stack:", error.stack);
      throw error;
    }
  }

  /**
   * Get predictions for multiple job opportunities (for comparison)
   * Generates AI-powered comparison insights if not already cached
   */
  async comparePredictions(userId, jobOpportunityIds) {
    try {
      if (!jobOpportunityIds || jobOpportunityIds.length === 0) {
        return [];
      }

      const placeholders = jobOpportunityIds.map((_, i) => `$${i + 2}`).join(",");
      const result = await database.query(
        `SELECT 
          p.*,
          jo.title AS job_title,
          jo.position AS job_position,
          jo.company AS company,
          jo.location AS job_location,
          jo.description AS job_description,
          jo.industry AS job_industry
         FROM interview_success_predictions p
         LEFT JOIN job_opportunities jo ON p.job_opportunity_id = jo.id AND jo.user_id = $1
         WHERE p.user_id = $1 AND p.job_opportunity_id IN (${placeholders})
         ORDER BY p.predicted_success_probability DESC`,
        [userId, ...jobOpportunityIds]
      );

      console.log(`[comparePredictions] Found ${result.rows.length} predictions for ${jobOpportunityIds.length} job opportunities`);

      const predictions = result.rows.map((row) => {
        // Parse JSON fields if they're strings - with better error handling
        let factorsBreakdown = {};
        if (row.factors_breakdown) {
          try {
            if (typeof row.factors_breakdown === 'string') {
              if (row.factors_breakdown.trim() === '' || row.factors_breakdown === 'null') {
                factorsBreakdown = {};
              } else {
                factorsBreakdown = JSON.parse(row.factors_breakdown);
              }
            } else if (typeof row.factors_breakdown === 'object' && row.factors_breakdown !== null) {
              factorsBreakdown = row.factors_breakdown;
            }
          } catch (e) {
            console.warn("⚠️ Failed to parse factors_breakdown:", e);
            factorsBreakdown = {};
          }
        }
        
        // Ensure factorsBreakdown has proper structure
        if (!factorsBreakdown || typeof factorsBreakdown !== 'object') {
          factorsBreakdown = {
            preparation: { score: parseFloat(row.preparation_score) || 0, weight: 0.30 },
            roleMatch: { score: parseFloat(row.role_match_score) || 0, weight: 0.25 },
            companyResearch: { score: parseFloat(row.company_research_score) || 0, weight: 0.20 },
            practiceHours: { score: parseFloat(row.practice_hours_score) || 0, weight: 0.15 },
            historical: { score: parseFloat(row.historical_performance_score) || 0, weight: 0.10 },
          };
        }
        
        let recommendations = [];
        if (row.recommendations) {
          try {
            if (typeof row.recommendations === 'string') {
              if (row.recommendations.trim() === '' || row.recommendations === 'null') {
                recommendations = [];
              } else {
                recommendations = JSON.parse(row.recommendations);
              }
            } else if (Array.isArray(row.recommendations)) {
              recommendations = row.recommendations;
            } else if (typeof row.recommendations === 'object' && row.recommendations !== null) {
              recommendations = [row.recommendations];
            }
          } catch (e) {
            console.warn("⚠️ Failed to parse recommendations:", e);
            recommendations = [];
          }
        }
        
        // Ensure recommendations is an array
        if (!Array.isArray(recommendations)) {
          recommendations = [];
        }

        // Get job title - try both title and position fields
        const jobTitle = row.job_title || row.job_position || null;
        const company = row.company || null;

        console.log(`[comparePredictions] Job ${row.job_opportunity_id}: title="${jobTitle}", company="${company}", probability=${parseFloat(row.predicted_success_probability) || 0}%`);

        return {
          id: row.id,
          jobOpportunityId: row.job_opportunity_id,
          jobTitle: jobTitle || "Unknown Position",
          company: company || "Unknown Company",
          location: row.job_location || null,
          industry: row.job_industry || null,
          prediction: {
            predictedSuccessProbability: parseFloat(row.predicted_success_probability) || 0,
            confidenceScore: parseFloat(row.confidence_score) || 0,
            preparationScore: parseFloat(row.preparation_score) || 0,
            roleMatchScore: parseFloat(row.role_match_score) || 0,
            companyResearchScore: parseFloat(row.company_research_score) || 0,
            practiceHoursScore: parseFloat(row.practice_hours_score) || 0,
            historicalPerformanceScore: parseFloat(row.historical_performance_score) || 0,
            factorsBreakdown: factorsBreakdown || {},
            recommendations: recommendations || [],
            calculatedAt: row.calculated_at,
            lastUpdated: row.last_updated,
            actualOutcome: row.actual_outcome,
            outcomeDate: row.outcome_date,
            predictionAccuracy: row.prediction_accuracy ? parseFloat(row.prediction_accuracy) : null,
          },
          calculatedAt: row.calculated_at,
        };
      });

      // Get or generate comparison insights - NEVER return empty!
      let comparisonInsights = await this.getComparisonInsights(userId, jobOpportunityIds);
      if (!comparisonInsights || !comparisonInsights.insights || comparisonInsights.insights.length === 0) {
        console.log("🔄 Generating new comparison insights with AI...");
        comparisonInsights = await this.generateComparisonInsights(userId, result.rows);
        // Cache the insights
        await this.saveComparisonInsights(userId, jobOpportunityIds, comparisonInsights);
      } else {
        console.log("✅ Using cached comparison insights");
      }

      // Ensure insights are never empty - generate fallback if needed
      if (!comparisonInsights || !comparisonInsights.insights || comparisonInsights.insights.length === 0) {
        console.warn("⚠️ Insights are empty, generating fallback...");
        comparisonInsights = this.generateFallbackComparisonInsights(result.rows);
        // Cache the fallback too so we don't regenerate unnecessarily
        await this.saveComparisonInsights(userId, jobOpportunityIds, comparisonInsights);
      }

      // Return both predictions and insights
      return {
        predictions,
        insights: comparisonInsights,
      };
    } catch (error) {
      console.error("❌ Error comparing predictions:", error);
      console.error("Error details:", error.message, error.stack);
      throw error;
    }
  }

  /**
   * Update actual outcome and calculate accuracy
   */
  async updateOutcome(jobOpportunityId, userId, outcome, outcomeDate = null) {
    try {
      const prediction = await this.getPrediction(jobOpportunityId, userId);
      if (!prediction) {
        throw new Error("Prediction not found");
      }

      const predicted = prediction.predictedSuccessProbability;
      let accuracy = null;

      // Calculate accuracy based on outcome
      if (outcome === "accepted") {
        // Positive accuracy if predicted high and got accepted
        accuracy = predicted - 50; // How much above/below 50% threshold
      } else if (outcome === "rejected") {
        // Negative accuracy if predicted high but got rejected
        accuracy = 50 - predicted; // Inverse of acceptance
      }

      const result = await database.query(
        `UPDATE interview_success_predictions SET
          actual_outcome = $1,
          outcome_date = $2,
          prediction_accuracy = $3,
          last_updated = NOW()
        WHERE user_id = $4 AND job_opportunity_id = $5
        RETURNING *`,
        [outcome, outcomeDate || new Date(), accuracy, userId, jobOpportunityId]
      );

      // Update accuracy metrics
      await this.updateAccuracyMetrics(userId);

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error updating outcome:", error);
      throw error;
    }
  }

  /**
   * Update aggregate accuracy metrics for user
   */
  async updateAccuracyMetrics(userId) {
    try {
      const result = await database.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN prediction_accuracy IS NOT NULL THEN 1 END) as with_accuracy,
          AVG(ABS(prediction_accuracy)) as avg_error
        FROM interview_success_predictions
        WHERE user_id = $1 AND actual_outcome IS NOT NULL`,
        [userId]
      );

      const stats = result.rows[0];
      const total = parseInt(stats.total);
      const withAccuracy = parseInt(stats.with_accuracy);
      const avgError = stats.avg_error ? parseFloat(stats.avg_error) : 0;

      // Calculate accurate predictions (within 20 points)
      const accurateResult = await database.query(
        `SELECT COUNT(*) as accurate
         FROM interview_success_predictions
         WHERE user_id = $1 
           AND actual_outcome IS NOT NULL
           AND ABS(prediction_accuracy) <= 20`,
        [userId]
      );
      const accurate = parseInt(accurateResult.rows[0].accurate);

      await database.query(
        `INSERT INTO prediction_accuracy_metrics (
          user_id, total_predictions, accurate_predictions, avg_error, last_calculated, updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          total_predictions = $2,
          accurate_predictions = $3,
          avg_error = $4,
          last_calculated = NOW(),
          updated_at = NOW()`,
        [userId, total, accurate, avgError]
      );
    } catch (error) {
      console.error("❌ Error updating accuracy metrics:", error);
      // Don't throw - metrics are optional
    }
  }

  /**
   * Recalculate all predictions for a user
   */
  async recalculateAll(userId) {
    try {
      // Get all active job opportunities
      const result = await database.query(
        `SELECT id FROM job_opportunities
         WHERE user_id = $1 
           AND status IN ('Applied', 'Interview', 'Offer', 'Pending')
         ORDER BY created_at DESC`,
        [userId]
      );

      const predictions = [];
      for (const row of result.rows) {
        try {
          const prediction = await this.calculateSuccessProbability(row.id, userId);
          predictions.push(prediction);
        } catch (error) {
          console.error(`Error calculating for job ${row.id}:`, error);
        }
      }

      return predictions;
    } catch (error) {
      console.error("❌ Error recalculating all predictions:", error);
      throw error;
    }
  }
}

export default new InterviewPredictionService();

