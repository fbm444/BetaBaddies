/**
 * Bayesian Prediction Service
 * Provides pattern recognition and success prediction using Bayesian probability
 * No ML training required - works with any data volume
 */

import database from "./database.js";

class BayesianPredictionService {
  constructor() {
    // Industry benchmarks based on real job market data
    this.benchmarks = {
      industries: {
        'Technology': { interviewRate: 8, offerRate: 3 },
        'Finance': { interviewRate: 5, offerRate: 2 },
        'Healthcare': { interviewRate: 10, offerRate: 4 },
        'Marketing': { interviewRate: 7, offerRate: 3 },
        'Sales': { interviewRate: 12, offerRate: 5 },
        'Education': { interviewRate: 12, offerRate: 5 },
        'Consulting': { interviewRate: 6, offerRate: 2 },
        'Engineering': { interviewRate: 7, offerRate: 3 },
        'Design': { interviewRate: 6, offerRate: 2.5 },
        'Operations': { interviewRate: 8, offerRate: 3 },
        'default': { interviewRate: 6, offerRate: 2.5 }
      },
      
      sources: {
        'referral': 15,
        'recruiter': 8,
        'company_website': 5,
        'job_board': 3,
        'networking': 10,
        'social_media': 4,
        'default': 4
      },
      
      methods: {
        'recruiter_submission': 8,
        'referral': 12,
        'linkedin_easy_apply': 2,
        'online_form': 4,
        'email': 5,
        'direct_application': 6,
        'default': 4
      }
    };
  }

  /**
   * Main prediction function - Bayesian probability blending
   */
  async predictSuccess(userId, opportunityData) {
    try {
      // Get industry benchmark (always available)
      const industryBenchmark = this.benchmarks.industries[opportunityData.industry] || 
                                this.benchmarks.industries.default;
      
      const sourceBenchmark = this.benchmarks.sources[opportunityData.application_source] || 
                             this.benchmarks.sources.default;
      
      const methodBenchmark = this.benchmarks.methods[opportunityData.application_method] || 
                             this.benchmarks.methods.default;
      
      // Combine benchmarks (weighted average)
      const baseBenchmark = 
        (industryBenchmark.offerRate * 0.4) +  // 40% from industry
        (sourceBenchmark * 0.35) +              // 35% from source
        (methodBenchmark * 0.25);               // 25% from method
      
      // Get user's actual historical performance
      const userPerformance = await this.getUserPerformance(userId, opportunityData);
      
      // Calculate how much to trust user data vs benchmark
      const userDataWeight = this.calculateUserDataWeight(userPerformance.sampleSize);
      const benchmarkWeight = 1 - userDataWeight;
      
      // THE BAYESIAN FORMULA
      const baseScore = 
        (baseBenchmark * benchmarkWeight) + 
        (userPerformance.successRate * userDataWeight);
      
      // Apply multipliers for special circumstances
      let finalScore = baseScore;
      const multipliers = [];
      
      // Hiring manager contact boost (strongest personal connection)
      if (opportunityData.hiring_manager_name) {
        finalScore *= 1.8;
        multipliers.push({ factor: 'Direct Contact with Hiring Manager', multiplier: 1.8 });
      }
      
      // Recruiter contact boost
      if (opportunityData.recruiter_name) {
        finalScore *= 1.5;
        multipliers.push({ factor: 'Working with Recruiter', multiplier: 1.5 });
      }
      
      // Personalized materials boost (checking by name match)
      if (opportunityData.has_tailored_resume) {
        finalScore *= 1.4;
        multipliers.push({ factor: 'Using Tailored Resume', multiplier: 1.4 });
      }
      
      if (opportunityData.has_tailored_coverletter) {
        finalScore *= 1.3;
        multipliers.push({ factor: 'Using Custom Cover Letter', multiplier: 1.3 });
      }
      
      // Preparation time multipliers (more granular)
      if (opportunityData.prep_hours >= 10) {
        finalScore *= 1.7;  // Exceptional prep = 70% boost
        multipliers.push({ factor: 'Exceptional Preparation (10+ hours)', multiplier: 1.7 });
      } else if (opportunityData.prep_hours >= 7) {
        finalScore *= 1.5;  // Extensive prep = 50% boost
        multipliers.push({ factor: 'Extensive Preparation (7-9 hours)', multiplier: 1.5 });
      } else if (opportunityData.prep_hours >= 4) {
        finalScore *= 1.3;  // Good prep = 30% boost
        multipliers.push({ factor: 'Good Preparation (4-6 hours)', multiplier: 1.3 });
      } else if (opportunityData.prep_hours >= 2) {
        finalScore *= 1.1;  // Moderate prep = 10% boost
        multipliers.push({ factor: 'Moderate Preparation (2-3 hours)', multiplier: 1.1 });
      } else if (opportunityData.prep_hours > 0 && opportunityData.prep_hours < 2) {
        finalScore *= 0.7;  // Poor prep = 30% penalty
        multipliers.push({ factor: 'Low Preparation (< 2 hours)', multiplier: 0.7 });
      }
      
      // Cap at reasonable max (nobody has 100% success rate)
      finalScore = Math.min(finalScore, 85);
      
      return {
        successProbability: Math.round(finalScore),
        confidence: this.getConfidenceLevel(userPerformance.sampleSize),
        breakdown: {
          industryBenchmark: industryBenchmark.offerRate,
          sourceBenchmark: sourceBenchmark,
          methodBenchmark: methodBenchmark,
          userHistoricalRate: Math.round(userPerformance.successRate),
          weightOnUserData: Math.round(userDataWeight * 100),
          weightOnBenchmark: Math.round(benchmarkWeight * 100)
        },
        multipliers: multipliers,
        insights: this.generateInsights(finalScore, userPerformance, benchmarkWeight, multipliers),
        sampleSize: userPerformance.sampleSize,
        recommendedActions: this.generateRecommendedActions(finalScore, opportunityData, userPerformance)
      };
    } catch (error) {
      console.error('Error in predictSuccess:', error);
      throw error;
    }
  }

  /**
   * Get user's historical performance for similar opportunities
   */
  async getUserPerformance(userId, opportunityData) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_applications,
          COUNT(CASE WHEN status = 'Offer' THEN 1 END) as offers,
          COUNT(CASE WHEN status IN ('Phone Screen', 'Interview') THEN 1 END) as interviews
        FROM job_opportunities
        WHERE user_id = $1
          AND status IN ('Offer', 'Rejected', 'Withdrawn')
          AND (
            industry = $2 OR 
            application_source = $3 OR
            application_method = $4
          )
      `;
      
      const result = await database.query(query, [
        userId,
        opportunityData.industry || '',
        opportunityData.application_source || '',
        opportunityData.application_method || ''
      ]);
      
      const { total_applications, offers } = result.rows[0];
      const totalApps = parseInt(total_applications) || 0;
      const totalOffers = parseInt(offers) || 0;
      
      return {
        sampleSize: totalApps,
        successRate: totalApps > 0 ? (totalOffers / totalApps) * 100 : 0
      };
    } catch (error) {
      console.error('Error in getUserPerformance:', error);
      return { sampleSize: 0, successRate: 0 };
    }
  }

  /**
   * Calculate how much to trust user data vs benchmarks
   * More applications = more trust in user data
   */
  calculateUserDataWeight(sampleSize) {
    if (sampleSize === 0) return 0;
    if (sampleSize >= 40) return 0.9;  // Cap at 90% trust
    
    // Smooth curve: trust increases but with diminishing returns
    return Math.min(0.9, sampleSize / 45);
  }

  /**
   * Determine confidence level based on sample size
   */
  getConfidenceLevel(sampleSize) {
    if (sampleSize >= 15) return 'high';
    if (sampleSize >= 8) return 'medium';
    if (sampleSize >= 3) return 'low';
    return 'very_low';
  }

  /**
   * Generate insights explaining the prediction
   */
  generateInsights(score, userPerformance, benchmarkWeight, multipliers) {
    const insights = [];
    
    // Data source insight
    if (benchmarkWeight > 0.7) {
      insights.push({
        type: 'info',
        message: `Prediction based primarily on industry benchmarks (you have ${userPerformance.sampleSize} similar applications in history)`
      });
    } else if (benchmarkWeight < 0.3) {
      insights.push({
        type: 'success',
        message: `Prediction highly personalized to your history (${userPerformance.sampleSize} similar applications)`
      });
    } else {
      insights.push({
        type: 'info',
        message: `Prediction blends industry data with your ${userPerformance.sampleSize} similar applications`
      });
    }
    
    // Success probability insight
    if (score >= 60) {
      insights.push({
        type: 'positive',
        message: 'This is a high-potential opportunity based on your profile and historical patterns'
      });
    } else if (score >= 40) {
      insights.push({
        type: 'neutral',
        message: 'Moderate success probability - consider prioritizing based on other factors'
      });
    } else {
      insights.push({
        type: 'warning',
        message: 'Lower success probability - ensure strong fit before investing significant time'
      });
    }
    
    // Multiplier insights
    if (multipliers.length > 0) {
      const boosts = multipliers.filter(m => m.multiplier > 1);
      const penalties = multipliers.filter(m => m.multiplier < 1);
      
      if (boosts.length > 0) {
        insights.push({
          type: 'positive',
          message: `Success boosted by: ${boosts.map(b => b.factor).join(', ')}`
        });
      }
      
      if (penalties.length > 0) {
        insights.push({
          type: 'warning',
          message: `Success reduced by: ${penalties.map(p => p.factor).join(', ')}`
        });
      }
    }
    
    return insights;
  }

  /**
   * Generate recommended actions to improve success probability
   */
  generateRecommendedActions(score, opportunityData, userPerformance) {
    const actions = [];
    
    // Contact recommendations
    if (!opportunityData.hiring_manager_name) {
      actions.push('Research and connect with the hiring manager on LinkedIn for an 80% boost');
    }
    
    if (!opportunityData.recruiter_name && opportunityData.application_source !== 'recruiter') {
      actions.push('Consider working with a recruiter for this role (50% boost)');
    }
    
    // Materials recommendations
    if (!opportunityData.has_tailored_resume) {
      actions.push('Create a tailored resume with the company name in the title for a 40% boost');
    }
    
    if (!opportunityData.has_tailored_coverletter) {
      actions.push('Write a personalized cover letter with the company name in the title for a 30% boost');
    }
    
    // Preparation recommendations (more granular)
    if (!opportunityData.prep_hours || opportunityData.prep_hours === 0) {
      actions.push('Start logging preparation time - aim for at least 4-6 hours');
    } else if (opportunityData.prep_hours < 2) {
      actions.push('Increase preparation time to avoid 30% penalty - aim for 4+ hours');
    } else if (opportunityData.prep_hours < 4) {
      actions.push('Boost prep time to 4-6 hours for a 30% improvement');
    } else if (opportunityData.prep_hours >= 4 && opportunityData.prep_hours < 7) {
      actions.push('Consider 7+ hours of prep for a 50% boost (currently at 30% boost)');
    } else if (opportunityData.prep_hours >= 7 && opportunityData.prep_hours < 10) {
      actions.push('Excellent prep! 10+ hours could maximize your chances (70% boost vs current 50%)');
    }
    
    // Performance-based recommendations
    if (userPerformance.successRate > 0 && userPerformance.successRate < 5) {
      actions.push('Review your overall strategy - current success rate is below industry average');
    }
    
    if (score < 30) {
      actions.push('Lower probability - prioritize higher-potential applications or improve the factors above');
    } else if (score >= 60) {
      actions.push('High potential! Prioritize this application and invest quality time');
    }
    
    return actions;
  }

  /**
   * Predict success for all opportunities (not just active)
   */
  async predictActiveOpportunities(userId) {
    try {
      // Get ALL opportunities (including completed ones)
      const query = `
        SELECT 
          jo.id,
          jo.title as job_title,
          jo.company,
          jo.industry,
          jo.application_source,
          jo.application_method,
          jo.recruiter_name,
          jo.hiring_manager_name,
          jo.status,
          COALESCE((
            SELECT SUM(hours_spent)
            FROM time_logs
            WHERE job_opportunity_id = jo.id
          ), 0) as prep_hours,
          -- Check if any resume mentions this company
          EXISTS(
            SELECT 1 FROM resume r
            WHERE r.user_id = $1 
            AND (LOWER(r.version_name) LIKE '%' || LOWER(jo.company) || '%'
                 OR LOWER(r.name) LIKE '%' || LOWER(jo.company) || '%')
          ) as has_tailored_resume,
          -- Check if any cover letter mentions this company
          EXISTS(
            SELECT 1 FROM coverletter c
            WHERE c.user_id = $1
            AND LOWER(c.version_name) LIKE '%' || LOWER(jo.company) || '%'
          ) as has_tailored_coverletter
        FROM job_opportunities jo
        WHERE jo.user_id = $1
          AND (jo.archived = false OR jo.archived IS NULL)
        ORDER BY 
          CASE 
            WHEN jo.status IN ('Offer', 'Rejected', 'Withdrawn') THEN 2
            ELSE 1
          END,
          jo.created_at DESC
        LIMIT 50
      `;
      
      const result = await database.query(query, [userId]);
      
      // Predict for each opportunity
      const predictions = await Promise.all(
        result.rows.map(async (opp) => {
          const prediction = await this.predictSuccess(userId, {
            industry: opp.industry,
            application_source: opp.application_source,
            application_method: opp.application_method,
            recruiter_name: opp.recruiter_name,
            hiring_manager_name: opp.hiring_manager_name,
            has_tailored_resume: opp.has_tailored_resume,
            has_tailored_coverletter: opp.has_tailored_coverletter,
            prep_hours: parseFloat(opp.prep_hours) || 0
          });
          
          return {
            jobOpportunityId: opp.id,
            jobTitle: opp.job_title,
            company: opp.company,
            status: opp.status, // Include status to show context
            ...prediction
          };
        })
      );
      
      return predictions;
    } catch (error) {
      console.error('Error in predictActiveOpportunities:', error);
      return [];
    }
  }
}

export default new BayesianPredictionService();

