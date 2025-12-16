// Career Path Simulation Service
// Simulates career trajectories and long-term outcomes for job offers
import OpenAI from "openai";
import db from "./database.js";

class CareerPathSimulationService {
  constructor() {
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
   * Generate career path simulation for a job offer
   * @param {string} userId - User ID
   * @param {string} offerId - Job offer ID
   * @param {object} userPreferences - User career preferences
   * @returns {object} Career path simulation data
   */
  async simulateCareerPath(userId, offerId, userPreferences = {}) {
    const client = await db.getClient();
    try {
      // Get offer details
      const offerQuery = `
        SELECT jo.*, 
               j.industry as job_industry,
               j.job_type,
               j.job_description
        FROM job_offers jo
        LEFT JOIN job_opportunities j ON jo.job_opportunity_id = j.id
        WHERE jo.id = $1 AND jo.user_id = $2
      `;
      const offerResult = await client.query(offerQuery, [offerId, userId]);
      
      if (offerResult.rows.length === 0) {
        throw new Error("Job offer not found");
      }

      const offer = offerResult.rows[0];

      // Get user profile and experience
      const userQuery = `
        SELECT 
          p.*,
          (SELECT COUNT(*) FROM jobs WHERE user_id = $1) as total_jobs,
          (SELECT COALESCE(EXTRACT(YEAR FROM AGE(NOW(), MIN(start_date))), 0) 
           FROM jobs WHERE user_id = $1) as years_of_experience,
          (SELECT COALESCE(json_agg(json_build_object('title', title, 'company', company, 'salary', salary)), '[]'::json)
           FROM (SELECT title, company, salary FROM jobs WHERE user_id = $1 ORDER BY start_date DESC LIMIT 3) recent) as recent_jobs,
          (SELECT COALESCE(json_agg(skill_name), '[]'::json) FROM skills WHERE user_id = $1) as skills,
          (SELECT COALESCE(json_agg(json_build_object('school', school, 'degree_type', degree_type, 'field', field)), '[]'::json)
           FROM educations WHERE user_id = $1) as education
        FROM profiles p
        WHERE p.user_id = $1
      `;
      const userResult = await client.query(userQuery, [userId]);
      const userProfile = userResult.rows[0] || {};

      // Generate simulations for 5-year and 10-year horizons
      const simulation5Year = await this.generateTrajectory(offer, userProfile, userPreferences, 5);
      const simulation10Year = await this.generateTrajectory(offer, userProfile, userPreferences, 10);

      // Calculate expected lifetime earnings
      const lifetimeEarnings = this.calculateLifetimeEarnings(simulation5Year, simulation10Year);

      // Identify key decision points
      const decisionPoints = this.identifyDecisionPoints(simulation5Year, simulation10Year);

      // Generate optimal recommendations
      const recommendations = await this.generateRecommendations(
        offer,
        userProfile,
        userPreferences,
        simulation5Year,
        simulation10Year
      );

      return {
        offerId,
        offer: {
          company: offer.company,
          position: offer.position_title,
          baseSalary: offer.base_salary,
          location: offer.location,
        },
        simulations: {
          fiveYear: simulation5Year,
          tenYear: simulation10Year,
        },
        lifetimeEarnings,
        decisionPoints,
        recommendations,
        userPreferences,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error simulating career path:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate career trajectory for a specific time horizon
   */
  async generateTrajectory(offer, userProfile, preferences, years) {
    // Calculate progression milestones
    const milestones = this.calculateMilestones(offer, userProfile, years);

    // Generate AI insights if available
    let aiInsights = null;
    if (this.openai) {
      aiInsights = await this.generateAIInsights(offer, userProfile, preferences, years);
    }

    // Calculate probability distributions
    const probabilities = this.calculateProbabilityDistributions(offer, userProfile, years);

    return {
      horizon: years,
      milestones,
      aiInsights,
      probabilities,
      summary: {
        expectedTotalEarnings: this.sumEarnings(milestones),
        expectedFinalTitle: milestones[milestones.length - 1].title,
        expectedFinalSalary: milestones[milestones.length - 1].salary,
        careerGrowthRate: this.calculateGrowthRate(milestones),
      },
    };
  }

  /**
   * Calculate career progression milestones
   */
  calculateMilestones(offer, userProfile, years) {
    const milestones = [];
    const currentYear = new Date().getFullYear();
    
    // Base salary and title
    let currentSalary = parseFloat(offer.base_salary || 0);
    let currentTitle = offer.position_title || "Software Engineer";
    let currentLevel = this.extractLevel(currentTitle);

    // Industry-specific growth rates
    const industry = offer.job_industry || "Technology";
    const baseGrowthRate = this.getIndustryGrowthRate(industry);
    const experienceMultiplier = 1 + (parseFloat(userProfile.years_of_experience || 0) * 0.01);

    // Company size factor (startup vs enterprise)
    const companySize = this.inferCompanySize(offer.company);
    const companySizeFactor = this.getCompanySizeFactor(companySize);

    for (let year = 0; year <= years; year++) {
      // Calculate salary growth with diminishing returns
      let yearGrowthRate = baseGrowthRate * experienceMultiplier * companySizeFactor;
      
      // Add randomness for realism (±2%)
      yearGrowthRate *= (0.98 + Math.random() * 0.04);

      // Promotions typically happen every 2-3 years
      let titleChanged = false;
      if (year > 0 && year % 3 === 0 && currentLevel < 5) {
        currentLevel++;
        currentTitle = this.getNextTitle(currentTitle, currentLevel);
        titleChanged = true;
        // Promotion bump (10-20% increase)
        yearGrowthRate += 0.10 + Math.random() * 0.10;
      }

      if (year > 0) {
        currentSalary = currentSalary * (1 + yearGrowthRate);
      }

      // Calculate total compensation including bonuses, equity, benefits
      const totalComp = this.calculateTotalCompensation(currentSalary, offer, year);

      milestones.push({
        year: currentYear + year,
        yearOffset: year,
        title: currentTitle,
        level: currentLevel,
        salary: Math.round(currentSalary),
        totalCompensation: Math.round(totalComp),
        titleChanged,
        growthRate: year > 0 ? yearGrowthRate : 0,
        events: this.generateYearEvents(year, titleChanged, currentLevel),
      });
    }

    return milestones;
  }

  /**
   * Generate AI-powered insights using OpenAI
   */
  async generateAIInsights(offer, userProfile, preferences, years) {
    if (!this.openai) {
      return null;
    }

    try {
      const prompt = `You are a career advisor analyzing career trajectory for a job offer. Generate insights for a ${years}-year career path.

Job Offer:
- Company: ${offer.company}
- Position: ${offer.position_title}
- Base Salary: $${offer.base_salary}
- Location: ${offer.location}
- Industry: ${offer.job_industry || "Technology"}
- Remote Policy: ${offer.remote_policy || "Not specified"}

User Profile:
- Current Title: ${userProfile.job_title || "Not specified"}
- Experience Level: ${userProfile.exp_level || "Mid-level"}
- Years of Experience: ${userProfile.years_of_experience || 0}
- Industry: ${userProfile.industry || "Technology"}
- Skills: ${Array.isArray(userProfile.skills) ? userProfile.skills.join(", ") : "Not specified"}

User Career Preferences:
- Priority: ${preferences.priority || "career growth"}
- Work-Life Balance Importance: ${preferences.workLifeBalance || "moderate"}
- Learning Opportunities: ${preferences.learningOpportunities || "high"}
- Leadership Aspirations: ${preferences.leadershipAspirations || "yes"}

Provide a detailed ${years}-year career trajectory analysis including:
1. Title progression and promotion timeline
2. Expected salary growth trajectory
3. Key skill development areas
4. Industry-specific opportunities and challenges
5. Career pivots or decision points
6. Risk factors (market changes, company stability, technology shifts)
7. Recommendations for maximizing career growth

Format your response as JSON with the following structure:
{
  "titleProgression": ["Senior Software Engineer", "Staff Engineer", "Principal Engineer"],
  "salaryTrajectory": "Description of salary growth expectations",
  "keySkills": ["skill1", "skill2", "skill3"],
  "opportunities": ["opportunity1", "opportunity2"],
  "challenges": ["challenge1", "challenge2"],
  "decisionPoints": [{"year": 2, "decision": "description"}],
  "riskFactors": ["risk1", "risk2"],
  "recommendations": ["recommendation1", "recommendation2"]
}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert career advisor specializing in tech industry career trajectories. Provide realistic, data-driven insights.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { raw: content };
    } catch (error) {
      console.error("Error generating AI insights:", error);
      return null;
    }
  }

  /**
   * Calculate probability distributions (best, worst, average case)
   */
  calculateProbabilityDistributions(offer, userProfile, years) {
    const baseSalary = parseFloat(offer.base_salary || 0);
    const industry = offer.job_industry || "Technology";
    const baseGrowthRate = this.getIndustryGrowthRate(industry);

    // Best case: promotions on schedule, high growth, bonuses
    const bestCase = this.calculateScenario(baseSalary, years, baseGrowthRate * 1.3);
    
    // Average case: normal progression
    const averageCase = this.calculateScenario(baseSalary, years, baseGrowthRate);
    
    // Worst case: minimal growth, economic downturns
    const worstCase = this.calculateScenario(baseSalary, years, baseGrowthRate * 0.5);

    return {
      bestCase: {
        probability: 0.15,
        finalSalary: bestCase.finalSalary,
        totalEarnings: bestCase.totalEarnings,
        description: "Strong performance, promotions on schedule, favorable market conditions",
      },
      averageCase: {
        probability: 0.70,
        finalSalary: averageCase.finalSalary,
        totalEarnings: averageCase.totalEarnings,
        description: "Normal career progression, steady growth, typical market conditions",
      },
      worstCase: {
        probability: 0.15,
        finalSalary: worstCase.finalSalary,
        totalEarnings: worstCase.totalEarnings,
        description: "Slow growth, economic challenges, limited advancement opportunities",
      },
    };
  }

  /**
   * Calculate scenario outcomes
   */
  calculateScenario(startSalary, years, growthRate) {
    let totalEarnings = 0;
    let currentSalary = startSalary;

    for (let i = 0; i <= years; i++) {
      totalEarnings += currentSalary;
      currentSalary *= (1 + growthRate);
    }

    return {
      finalSalary: Math.round(currentSalary),
      totalEarnings: Math.round(totalEarnings),
    };
  }

  /**
   * Calculate lifetime earnings projection
   */
  calculateLifetimeEarnings(simulation5Year, simulation10Year) {
    const year5Salary = simulation5Year.summary.expectedFinalSalary;
    const year10Salary = simulation10Year.summary.expectedFinalSalary;
    
    // Project to 30-year career
    const remainingYears = 20;
    const averageGrowthRate = 0.03; // Conservative 3% after 10 years
    
    let projectedEarnings = simulation10Year.summary.expectedTotalEarnings;
    let currentSalary = year10Salary;
    
    for (let i = 1; i <= remainingYears; i++) {
      currentSalary *= (1 + averageGrowthRate);
      projectedEarnings += currentSalary;
    }

    return {
      fiveYearTotal: simulation5Year.summary.expectedTotalEarnings,
      tenYearTotal: simulation10Year.summary.expectedTotalEarnings,
      thirtyYearProjection: Math.round(projectedEarnings),
      assumptions: "Assumes 3% average annual growth after year 10, no major career changes",
    };
  }

  /**
   * Identify key decision points in career trajectory
   */
  identifyDecisionPoints(simulation5Year, simulation10Year) {
    const decisionPoints = [];

    // Year 2-3: First major decision point
    decisionPoints.push({
      year: 2,
      yearRange: "2-3 years",
      type: "promotion_trajectory",
      title: "First Promotion Window",
      description: "Critical period to demonstrate impact and earn first promotion or consider switching companies for faster growth",
      options: [
        {
          choice: "Stay and grow internally",
          impact: "Moderate growth, cultural stability, relationship building",
          salaryImpact: "+10-15%",
        },
        {
          choice: "Switch companies for promotion",
          impact: "Higher growth potential, risk of cultural mismatch, reset relationships",
          salaryImpact: "+20-30%",
        },
      ],
    });

    // Year 4-5: Specialization decision
    decisionPoints.push({
      year: 4,
      yearRange: "4-5 years",
      type: "specialization",
      title: "Technical vs Management Track",
      description: "Decision point to continue as individual contributor (IC) or transition to people management",
      options: [
        {
          choice: "Individual Contributor (IC) track",
          impact: "Deep technical expertise, senior/staff/principal progression, high market value",
          salaryImpact: "Competitive with management at senior levels",
        },
        {
          choice: "Management track",
          impact: "Team leadership, broader organizational impact, different skill set development",
          salaryImpact: "Higher bonus potential, stock grants",
        },
      ],
    });

    // Year 7-8: Senior leadership or pivot
    decisionPoints.push({
      year: 7,
      yearRange: "7-8 years",
      type: "career_milestone",
      title: "Senior Leadership or Career Pivot",
      description: "Opportunity to pursue senior leadership roles, switch industries, or explore entrepreneurship",
      options: [
        {
          choice: "Continue current trajectory",
          impact: "Stable growth, expertise deepening, predictable progression",
          salaryImpact: "+5-10% annually",
        },
        {
          choice: "Pursue leadership role",
          impact: "Director/VP track, organizational influence, higher stress",
          salaryImpact: "+30-50% jump",
        },
        {
          choice: "Industry pivot or startup",
          impact: "High risk/reward, equity potential, skill diversification",
          salaryImpact: "Variable, potential equity upside",
        },
      ],
    });

    return decisionPoints;
  }

  /**
   * Generate optimal career recommendations
   */
  async generateRecommendations(offer, userProfile, preferences, simulation5Year, simulation10Year) {
    const recommendations = [];

    // Analyze offer strength
    const offerStrength = this.analyzeOfferStrength(offer, userProfile);
    
    recommendations.push({
      category: "Immediate Decision",
      priority: "high",
      title: offerStrength.verdict,
      description: offerStrength.reasoning,
      action: offerStrength.action,
    });

    // Long-term growth recommendations
    if (preferences.priority === "career growth" || preferences.leadershipAspirations === "yes") {
      recommendations.push({
        category: "Career Growth",
        priority: "high",
        title: "Focus on High-Impact Projects",
        description: "In the first 2 years, prioritize projects with visible business impact to accelerate promotion timeline",
        action: "Identify and volunteer for strategic initiatives, build relationships with senior leaders",
      });
    }

    // Work-life balance recommendations
    if (preferences.workLifeBalance === "high") {
      recommendations.push({
        category: "Work-Life Balance",
        priority: "medium",
        title: "Establish Boundaries Early",
        description: "Set sustainable work patterns from the start to avoid burnout over the long term",
        action: "Negotiate flexible working arrangements, clarify expectations around work hours",
      });
    }

    // Skill development recommendations
    recommendations.push({
      category: "Skill Development",
      priority: "high",
      title: "Invest in Emerging Technologies",
      description: "Based on industry trends, focus on skills that will be valuable in 5-10 years",
      action: "AI/ML, Cloud Architecture, System Design, Leadership skills",
    });

    // Financial planning
    const tenYearEarnings = simulation10Year.summary.expectedTotalEarnings;
    recommendations.push({
      category: "Financial Planning",
      priority: "medium",
      title: "Maximize Long-Term Wealth",
      description: `With projected ${this.formatCurrency(tenYearEarnings)} in 10-year earnings, focus on equity compensation and retirement savings`,
      action: "Maximize 401(k) contributions, negotiate for equity, consider tax-advantaged accounts",
    });

    return recommendations;
  }

  /**
   * Analyze offer strength relative to career goals
   */
  analyzeOfferStrength(offer, userProfile) {
    const baseSalary = parseFloat(offer.base_salary || 0);
    const currentSalary = parseFloat(userProfile.current_salary || baseSalary * 0.85);
    const salaryIncrease = ((baseSalary - currentSalary) / currentSalary) * 100;

    const growthScore = offer.growth_opportunities_score || 3;
    const cultureScore = offer.culture_fit_score || 3;
    const learningScore = offer.learning_opportunities_score || 3;

    const avgScore = (growthScore + cultureScore + learningScore) / 3;

    if (salaryIncrease > 20 && avgScore >= 4) {
      return {
        verdict: "Strong Offer - Recommended Accept",
        reasoning: `Significant salary increase (${salaryIncrease.toFixed(1)}%) with strong growth and culture scores`,
        action: "Accept offer with confidence, negotiate signing bonus if possible",
      };
    } else if (salaryIncrease > 10 && avgScore >= 3.5) {
      return {
        verdict: "Solid Offer - Likely Accept",
        reasoning: "Good salary improvement with positive career growth indicators",
        action: "Accept or negotiate for additional benefits/flexibility",
      };
    } else if (salaryIncrease < 5 && avgScore < 3) {
      return {
        verdict: "Weak Offer - Consider Alternatives",
        reasoning: "Limited financial upside and concerning growth/culture scores",
        action: "Continue job search or negotiate significantly higher compensation",
      };
    } else {
      return {
        verdict: "Moderate Offer - Evaluate Carefully",
        reasoning: "Mixed signals on financial and non-financial factors",
        action: "Compare with other offers, negotiate key concerns before deciding",
      };
    }
  }

  // Helper methods
  extractLevel(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes("junior") || titleLower.includes("entry")) return 1;
    if (titleLower.includes("senior") || titleLower.includes("sr.")) return 3;
    if (titleLower.includes("staff")) return 4;
    if (titleLower.includes("principal") || titleLower.includes("lead")) return 5;
    if (titleLower.includes("director") || titleLower.includes("vp")) return 6;
    return 2; // Default to mid-level
  }

  getNextTitle(currentTitle, level) {
    const baseTitles = {
      1: "Junior Software Engineer",
      2: "Software Engineer",
      3: "Senior Software Engineer",
      4: "Staff Software Engineer",
      5: "Principal Software Engineer",
      6: "Engineering Director",
    };

    // Preserve role type (Engineer, Developer, etc.)
    if (currentTitle.toLowerCase().includes("developer")) {
      return baseTitles[level].replace("Engineer", "Developer");
    }
    return baseTitles[level] || currentTitle;
  }

  getIndustryGrowthRate(industry) {
    const rates = {
      Technology: 0.07,
      Finance: 0.06,
      Healthcare: 0.05,
      "E-commerce": 0.08,
      "Artificial Intelligence": 0.10,
      Consulting: 0.06,
      Default: 0.06,
    };
    return rates[industry] || rates.Default;
  }

  inferCompanySize(companyName) {
    // Major tech companies (typically larger)
    const largeTech = ["Google", "Amazon", "Microsoft", "Apple", "Meta", "Facebook", "Netflix"];
    if (largeTech.some((company) => companyName.includes(company))) {
      return "large";
    }
    // Could enhance with additional logic or API lookups
    return "medium";
  }

  getCompanySizeFactor(size) {
    return {
      large: 0.95, // More stable but slower growth
      medium: 1.0,
      small: 1.1, // Higher growth potential but more risk
    }[size] || 1.0;
  }

  calculateTotalCompensation(baseSalary, offer, year) {
    const annualBonus = parseFloat(offer.annual_bonus || 0);
    const bonusPercentage = parseFloat(offer.bonus_percentage || 0);
    const equityAmount = parseFloat(offer.equity_amount || 0);
    const equityYears = parseInt(offer.equity_vesting_years || 4);

    let totalComp = baseSalary;

    // Add bonus
    if (bonusPercentage > 0) {
      totalComp += baseSalary * (bonusPercentage / 100);
    } else {
      totalComp += annualBonus;
    }

    // Add equity (amortized)
    if (equityAmount > 0 && year < equityYears) {
      totalComp += equityAmount / equityYears;
    }

    return totalComp;
  }

  sumEarnings(milestones) {
    return milestones.reduce((sum, m) => sum + m.totalCompensation, 0);
  }

  calculateGrowthRate(milestones) {
    if (milestones.length < 2) return 0;
    const start = milestones[0].salary;
    const end = milestones[milestones.length - 1].salary;
    const years = milestones.length - 1;
    return Math.pow(end / start, 1 / years) - 1;
  }

  generateYearEvents(year, titleChanged, level) {
    const events = [];
    
    if (titleChanged) {
      events.push("Promotion to new title");
    }
    
    if (year === 1) {
      events.push("Complete onboarding and initial projects");
    }
    
    if (year % 2 === 0 && year > 0) {
      events.push("Performance review and potential raise");
    }
    
    if (level >= 3 && year % 3 === 0) {
      events.push("Opportunity to mentor junior team members");
    }

    return events;
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Compare career paths for multiple offers
   */
  async compareCareerPaths(userId, offerIds, userPreferences = {}) {
    try {
      const simulations = [];
      
      for (const offerId of offerIds) {
        const simulation = await this.simulateCareerPath(userId, offerId, userPreferences);
        simulations.push(simulation);
      }

      // Compare and rank offers
      const comparison = {
        offers: simulations,
        rankings: this.rankOffersByCareerOutcome(simulations),
        comparisonInsights: this.generateComparisonInsights(simulations),
      };

      return comparison;
    } catch (error) {
      console.error("Error comparing career paths:", error);
      throw error;
    }
  }

  /**
   * Rank offers by long-term career outcomes
   */
  rankOffersByCareerOutcome(simulations) {
    const rankings = simulations.map((sim) => {
      const tenYearEarnings = sim.simulations.tenYear.summary.expectedTotalEarnings;
      const lifetimeEarnings = sim.lifetimeEarnings.thirtyYearProjection;
      const growthRate = sim.simulations.tenYear.summary.careerGrowthRate;

      // Calculate composite score
      const score = (tenYearEarnings * 0.4) + (lifetimeEarnings * 0.4) + (growthRate * 1000000 * 0.2);

      return {
        offerId: sim.offerId,
        company: sim.offer.company,
        position: sim.offer.position,
        score,
        tenYearEarnings,
        lifetimeEarnings,
        growthRate: (growthRate * 100).toFixed(2) + "%",
      };
    });

    // Sort by score descending
    rankings.sort((a, b) => b.score - a.score);
    
    // Add rank
    rankings.forEach((r, i) => {
      r.rank = i + 1;
    });

    return rankings;
  }

  /**
   * Generate insights comparing multiple career paths
   */
  generateComparisonInsights(simulations) {
    if (simulations.length < 2) {
      return [];
    }

    const insights = [];

    // Find highest lifetime earnings
    const maxLifetime = Math.max(...simulations.map(s => s.lifetimeEarnings.thirtyYearProjection));
    const maxLifetimeOffer = simulations.find(s => s.lifetimeEarnings.thirtyYearProjection === maxLifetime);

    insights.push({
      type: "highest_lifetime_earnings",
      title: "Highest Lifetime Earnings Potential",
      company: maxLifetimeOffer.offer.company,
      value: this.formatCurrency(maxLifetime),
      description: `${maxLifetimeOffer.offer.company} offers the highest projected 30-year earnings`,
    });

    // Find fastest growth
    const maxGrowth = Math.max(...simulations.map(s => s.simulations.tenYear.summary.careerGrowthRate));
    const maxGrowthOffer = simulations.find(s => s.simulations.tenYear.summary.careerGrowthRate === maxGrowth);

    insights.push({
      type: "fastest_growth",
      title: "Fastest Career Growth",
      company: maxGrowthOffer.offer.company,
      value: ((maxGrowth * 100).toFixed(1)) + "%",
      description: `${maxGrowthOffer.offer.company} offers the highest annual salary growth rate`,
    });

    // Calculate earnings spread
    const minLifetime = Math.min(...simulations.map(s => s.lifetimeEarnings.thirtyYearProjection));
    const earningsDiff = maxLifetime - minLifetime;

    insights.push({
      type: "earnings_spread",
      title: "Significant Long-Term Difference",
      value: this.formatCurrency(earningsDiff),
      description: `The difference between highest and lowest earning paths over 30 years is ${this.formatCurrency(earningsDiff)}`,
    });

    return insights;
  }
}

export default new CareerPathSimulationService();
