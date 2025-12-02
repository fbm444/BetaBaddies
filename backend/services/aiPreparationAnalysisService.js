/**
 * AI-Powered Preparation Analysis Service
 * Uses OpenAI to analyze preparation effectiveness (replaces flawed statistics)
 */

import OpenAI from 'openai';
import database from './database.js';

class AIPreparationAnalysisService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Get user's preparation data for AI analysis
   */
  async getUserPreparationData(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      
      let dateFilter = "";
      const params = [userId];
      if (startDate) {
        dateFilter += " AND jo.created_at >= $" + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND jo.created_at <= $" + (params.length + 1);
        params.push(endDate + " 23:59:59");
      }

      // Get job opportunities with prep data
      const query = `
        SELECT 
          jo.id,
          jo.title,
          jo.company,
          jo.industry,
          jo.status,
          jo.created_at,
          COALESCE(
            (SELECT SUM(hours_spent) 
             FROM time_logs 
             WHERE job_opportunity_id = jo.id), 
            0
          ) as total_prep_hours,
          COALESCE(
            (SELECT json_agg(json_build_object(
              'activity_type', activity_type,
              'hours_spent', hours_spent,
              'notes', notes
            ))
             FROM time_logs 
             WHERE job_opportunity_id = jo.id), 
            '[]'
          ) as prep_activities
        FROM job_opportunities jo
        WHERE jo.user_id = $1
          AND jo.status IN ('Offer', 'Rejected', 'Withdrawn', 'Interview', 'Phone Screen')
          ${dateFilter}
        ORDER BY jo.created_at DESC
        LIMIT 100
      `;

      const result = await database.query(query, params);
      return result.rows.map(row => ({
        ...row,
        prep_activities: typeof row.prep_activities === 'string' 
          ? JSON.parse(row.prep_activities) 
          : row.prep_activities,
      }));
    } catch (error) {
      console.error('❌ Error fetching preparation data:', error);
      throw error;
    }
  }

  /**
   * Analyze preparation effectiveness using AI
   */
  async analyzePreparation(userId, dateRange = {}) {
    try {
      const prepData = await this.getUserPreparationData(userId, dateRange);

      if (prepData.length === 0) {
        return {
          hasData: false,
          message: "No application data found. Start tracking your applications to receive preparation insights.",
        };
      }

      // Filter for concluded applications
      const concluded = prepData.filter(j => ['Offer', 'Rejected', 'Withdrawn'].includes(j.status));

      if (concluded.length < 3) {
        return {
          hasData: true,
          hasSufficientData: false,
          totalApplications: prepData.length,
          concludedApplications: concluded.length,
          message: `You have ${concluded.length} concluded application${concluded.length !== 1 ? 's' : ''}. At least 3 are needed for meaningful preparation insights.`,
          generalAdvice: {
            overview: "Based on job search best practices, effective preparation is key to success.",
            optimalPrepTime: {
              hours: 2,
              reasoning: "Industry standard: Most successful applicants spend 2-3 hours preparing per application, including company research, resume tailoring, and cover letter customization.",
              confidence: "general_guidance"
            },
            keyActivities: [
              {
                activity: "Company Research",
                impact: "high",
                reasoning: "Understanding the company's mission, recent news, and culture helps tailor your application and prepare for interviews."
              },
              {
                activity: "Resume Tailoring",
                impact: "high",
                reasoning: "Customizing your resume to match the job description keywords increases ATS pass rate and recruiter interest."
              },
              {
                activity: "Application Materials Review",
                impact: "medium",
                reasoning: "Proofreading and refining your materials prevents careless errors that could cost you the opportunity."
              }
            ]
          }
        };
      }

      // Prepare data summary for AI
      const dataSummary = this.prepareDataForAI(prepData, concluded);

      // Call OpenAI for analysis
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert career coach analyzing preparation effectiveness for job applications.
Analyze the correlation between preparation time/activities and outcomes (offers, interviews, rejections).
Be honest about data quality. If sample size is small, acknowledge it clearly.
Provide specific, personalized recommendations based on the actual data patterns.
Focus on what THIS USER'S data shows, not generic advice.`
          },
          {
            role: "user",
            content: `Analyze this user's preparation data and provide insights:

${dataSummary}

Provide analysis in JSON format:
{
  "dataQuality": {
    "rating": "excellent|good|fair|poor",
    "concludedApplications": number,
    "message": "Assessment of data quality"
  },
  "overview": "2-3 sentence summary of what the data shows about preparation effectiveness",
  "optimalPrepTime": {
    "hours": number,
    "reasoning": "Specific explanation based on THIS USER'S data patterns",
    "confidence": "high|medium|low"
  },
  "keyActivities": [
    {
      "activity": "Activity name",
      "impact": "high|medium|low",
      "reasoning": "Why this activity matters based on the data"
    }
  ],
  "insights": [
    "Specific insight 1 based on user's data",
    "Specific insight 2 based on user's data"
  ]
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content);
      
      return {
        hasData: true,
        hasSufficientData: true,
        totalApplications: prepData.length,
        concludedApplications: concluded.length,
        ...analysis,
        analyzedAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Error analyzing preparation with AI:', error);
      
      // Fallback response
      return {
        hasData: true,
        hasSufficientData: false,
        error: true,
        message: "Analysis temporarily unavailable. Showing general guidance.",
        generalAdvice: {
          overview: "Effective preparation typically takes 2-3 hours per application and significantly improves success rates.",
          optimalPrepTime: {
            hours: 2,
            reasoning: "Industry standard based on successful job seekers. Track your preparation time to get personalized insights.",
            confidence: "general_guidance"
          },
          keyActivities: [
            {
              activity: "Company Research",
              impact: "high",
              reasoning: "Understanding company culture and recent developments helps tailor your application."
            },
            {
              activity: "Resume Tailoring",
              impact: "high",
              reasoning: "Matching your resume to job requirements increases interview chances."
            }
          ]
        },
        insights: [
          "Continue tracking preparation activities to enable AI analysis",
          "Focus on quality over quantity in applications"
        ]
      };
    }
  }

  /**
   * Prepare data summary for AI
   */
  prepareDataForAI(allApplications, concluded) {
    const offers = concluded.filter(j => j.status === 'Offer');
    const interviews = concluded.filter(j => j.status === 'Interview' || j.status === 'Phone Screen');
    const rejected = concluded.filter(j => j.status === 'Rejected');

    // Analyze prep time patterns
    const withPrep = concluded.filter(j => parseFloat(j.total_prep_hours) > 0);
    const withoutPrep = concluded.filter(j => parseFloat(j.total_prep_hours) === 0);

    // Group by prep time ranges
    const prepRanges = {
      'under_1': concluded.filter(j => parseFloat(j.total_prep_hours) < 1),
      '1_to_2': concluded.filter(j => parseFloat(j.total_prep_hours) >= 1 && parseFloat(j.total_prep_hours) < 2),
      '2_to_3': concluded.filter(j => parseFloat(j.total_prep_hours) >= 2 && parseFloat(j.total_prep_hours) < 3),
      '3_to_5': concluded.filter(j => parseFloat(j.total_prep_hours) >= 3 && parseFloat(j.total_prep_hours) < 5),
      '5_plus': concluded.filter(j => parseFloat(j.total_prep_hours) >= 5),
    };

    // Activity type analysis
    const activityMap = {};
    concluded.forEach(job => {
      job.prep_activities.forEach(activity => {
        if (!activityMap[activity.activity_type]) {
          activityMap[activity.activity_type] = { jobs: [], totalHours: 0, offers: 0 };
        }
        activityMap[activity.activity_type].jobs.push(job);
        activityMap[activity.activity_type].totalHours += parseFloat(activity.hours_spent) || 0;
        if (job.status === 'Offer') {
          activityMap[activity.activity_type].offers++;
        }
      });
    });

    return `
OVERVIEW:
- Total Applications: ${allApplications.length}
- Concluded (Offer/Interview/Rejected): ${concluded.length}
- Offers: ${offers.length}
- Interviews/Phone Screens: ${interviews.length}
- Rejections: ${rejected.length}
- Success Rate: ${concluded.length > 0 ? Math.round((offers.length / concluded.length) * 100) : 0}%

PREPARATION TIME ANALYSIS:
Applications with prep time logged: ${withPrep.length}
Applications without prep time: ${withoutPrep.length}

Breakdown by prep time:
- Under 1 hour: ${prepRanges.under_1.length} apps, ${prepRanges.under_1.filter(j => j.status === 'Offer').length} offers (${prepRanges.under_1.length > 0 ? Math.round((prepRanges.under_1.filter(j => j.status === 'Offer').length / prepRanges.under_1.length) * 100) : 0}%)
- 1-2 hours: ${prepRanges['1_to_2'].length} apps, ${prepRanges['1_to_2'].filter(j => j.status === 'Offer').length} offers (${prepRanges['1_to_2'].length > 0 ? Math.round((prepRanges['1_to_2'].filter(j => j.status === 'Offer').length / prepRanges['1_to_2'].length) * 100) : 0}%)
- 2-3 hours: ${prepRanges['2_to_3'].length} apps, ${prepRanges['2_to_3'].filter(j => j.status === 'Offer').length} offers (${prepRanges['2_to_3'].length > 0 ? Math.round((prepRanges['2_to_3'].filter(j => j.status === 'Offer').length / prepRanges['2_to_3'].length) * 100) : 0}%)
- 3-5 hours: ${prepRanges['3_to_5'].length} apps, ${prepRanges['3_to_5'].filter(j => j.status === 'Offer').length} offers (${prepRanges['3_to_5'].length > 0 ? Math.round((prepRanges['3_to_5'].filter(j => j.status === 'Offer').length / prepRanges['3_to_5'].length) * 100) : 0}%)
- 5+ hours: ${prepRanges['5_plus'].length} apps, ${prepRanges['5_plus'].filter(j => j.status === 'Offer').length} offers (${prepRanges['5_plus'].length > 0 ? Math.round((prepRanges['5_plus'].filter(j => j.status === 'Offer').length / prepRanges['5_plus'].length) * 100) : 0}%)

PREPARATION ACTIVITIES:
${Object.entries(activityMap).map(([type, data]) => {
  const successRate = data.jobs.length > 0 ? Math.round((data.offers / data.jobs.length) * 100) : 0;
  return `- ${type}: ${data.jobs.length} apps, ${data.totalHours.toFixed(1)} total hours, ${data.offers} offers (${successRate}%)`;
}).join('\n') || 'No detailed activity tracking yet'}

SAMPLE APPLICATIONS:
${concluded.slice(0, 10).map(j => `
- ${j.title} at ${j.company}
  Status: ${j.status}
  Prep Time: ${j.total_prep_hours}h
  Activities: ${j.prep_activities.length > 0 ? j.prep_activities.map(a => a.activity_type).join(', ') : 'none logged'}
`).join('')}
`;
  }
}

export default new AIPreparationAnalysisService();

