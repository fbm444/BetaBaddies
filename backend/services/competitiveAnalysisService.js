import OpenAI from "openai";
import database from "./database.js";

class CompetitiveAnalysisService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
    } else {
      this.openai = null;
      console.warn(
        "⚠️  OpenAI API key not found. Competitive analysis will use fallback responses."
      );
    }
  }

  /**
   * Generate AI-powered competitive analysis for a user
   */
  async generateCompetitiveAnalysis(userId) {
    try {
      // Gather user data for analysis
      const userData = await this.getUserCompetitiveData(userId);

      // Generate AI analysis using OpenAI
      const analysis = await this.generateAnalysisWithAI(userData);

      return analysis;
    } catch (error) {
      console.error("❌ Error generating competitive analysis:", error);
      throw error;
    }
  }

  /**
   * Gather user data needed for competitive analysis
   */
  async getUserCompetitiveData(userId) {
    try {
      // Get user profile
      const profileQuery = `
        SELECT email, created_at
        FROM users
        WHERE u_id = $1
      `;
      const profileResult = await database.query(profileQuery, [userId]);
      const profile = profileResult.rows[0];

      // Get profile info
      const profileInfoQuery = `
        SELECT first_name, last_name, phone, city, state, 
               job_title, bio, industry, exp_level
        FROM profiles
        WHERE user_id = $1
      `;
      const profileInfoResult = await database.query(profileInfoQuery, [
        userId,
      ]);
      const profileInfo = profileInfoResult.rows[0] || {};
      const basicInfo = {
        ...profileInfo,
        location:
          profileInfo.city && profileInfo.state
            ? `${profileInfo.city}, ${profileInfo.state}`
            : profileInfo.city || profileInfo.state || null,
      };

      // Get employment history (jobs table)
      const employmentQuery = `
        SELECT title as job_title, company, location, start_date, end_date, is_current
        FROM jobs
        WHERE user_id = $1
        ORDER BY start_date DESC
      `;
      const employmentResult = await database.query(employmentQuery, [userId]);
      const employment = employmentResult.rows;

      // Get skills
      const skillsQuery = `
        SELECT skill_name, proficiency, category
        FROM skills
        WHERE user_id = $1
        ORDER BY 
          CASE proficiency 
            WHEN 'Expert' THEN 1
            WHEN 'Advanced' THEN 2
            WHEN 'Intermediate' THEN 3
            WHEN 'Beginner' THEN 4
            ELSE 5
          END
        LIMIT 10
      `;
      const skillsResult = await database.query(skillsQuery, [userId]);
      const skills = skillsResult.rows;

      // Get education
      const educationQuery = `
        SELECT degree_type as degree, field as field_of_study, school as institution, graddate as graduation_date
        FROM educations
        WHERE user_id = $1
        ORDER BY graddate DESC
      `;
      const educationResult = await database.query(educationQuery, [userId]);
      const education = educationResult.rows;

      // Get job search stats
      const jobStatsQuery = `
        SELECT 
          COUNT(*) as total_applications,
          COUNT(CASE WHEN status = 'Applied' THEN 1 END) as applied_count,
          COUNT(CASE WHEN status = 'Interview' THEN 1 END) as interview_count,
          COUNT(CASE WHEN status = 'Offer' THEN 1 END) as offer_count,
          MIN(created_at) as search_start_date
        FROM job_opportunities
        WHERE user_id = $1 AND (archived = false OR archived IS NULL)
      `;
      const jobStatsResult = await database.query(jobStatsQuery, [userId]);
      const jobStats = jobStatsResult.rows[0];

      // Get time investment data if available
      const timeStatsQuery = `
        SELECT 
          SUM(hours_spent) as total_hours,
          COUNT(DISTINCT activity_date) as active_days
        FROM time_logs
        WHERE user_id = $1
      `;
      const timeStatsResult = await database.query(timeStatsQuery, [userId]);
      const timeStats = timeStatsResult.rows[0];

      return {
        profile,
        basicInfo,
        employment,
        skills,
        education,
        jobStats,
        timeStats,
      };
    } catch (error) {
      console.error("❌ Error gathering user data:", error);
      throw error;
    }
  }

  /**
   * Generate competitive analysis using OpenAI
   */
  async generateAnalysisWithAI(userData) {
    try {
      const currentRole = userData.employment[0]?.job_title || "Professional";
      const topSkills = userData.skills
        .slice(0, 5)
        .map((s) => s.skill_name)
        .join(", ");
      const totalApplications =
        parseInt(userData.jobStats.total_applications) || 0;
      const interviewRate =
        totalApplications > 0
          ? (
              ((parseInt(userData.jobStats.interview_count) || 0) /
                totalApplications) *
              100
            ).toFixed(1)
          : 0;

      const prompt = `You are a career coach AI analyzing a job seeker's competitive position. Based on the following data, provide a comprehensive competitive analysis:

**Current Profile:**
- Role: ${currentRole}
- Top Skills: ${topSkills}
- Total Applications: ${totalApplications}
- Interview Rate: ${interviewRate}%
- Years of Experience: ${userData.employment.length} positions

**Analysis Required:**
1. Peer Benchmarking: Compare their application volume and success rates against industry standards
2. Skill Gap Analysis: Identify 3 skills they should develop to be competitive with top performers
3. Market Positioning: Assess their competitive strength (Strong/Moderate/Needs Improvement)
4. Differentiation Strategy: Suggest a unique value proposition based on their skill combination
5. Quick Wins: 3 immediate actions to improve competitiveness
6. Strategic Moves: 3 medium-term tactical improvements
7. Long-term Edge: 3 future-focused positioning strategies
8. Success Patterns: Typical timeline and expectations for someone in their position

Provide your response in JSON format with the following structure:
{
  "peerBenchmarking": {
    "userApplicationsPerWeek": number,
    "peerAverage": string,
    "topPerformers": string,
    "insight": string
  },
  "skillGaps": [
    { "skill": string, "importance": string, "currentLevel": number, "targetLevel": number }
  ],
  "marketPositioning": {
    "competitivenessScore": number (0-100),
    "level": string ("Strong" | "Moderate" | "Needs Improvement"),
    "strengths": [string],
    "insights": [string]
  },
  "differentiation": {
    "uniqueValueProposition": string,
    "competitiveAdvantages": [string]
  },
  "recommendations": {
    "quickWins": [string],
    "strategicMoves": [string],
    "longTermEdge": [string]
  },
  "successPatterns": {
    "avgTimeToOffer": string,
    "nextCareerStep": string,
    "typicalProgression": string
  }
}`;

      if (!this.openai) {
        // Fallback response when OpenAI is not configured
        return this.getFallbackAnalysis(userData);
      }

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert career coach and market analyst. Provide data-driven, actionable insights in JSON format only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
        stream: false, // Keep non-streaming for now - streaming with JSON mode is tricky
      });

      // Validate response structure
      if (
        !completion ||
        !completion.choices ||
        !completion.choices[0] ||
        !completion.choices[0].message
      ) {
        console.error("❌ Invalid OpenAI response structure:", completion);
        throw new Error("Invalid response from OpenAI API");
      }

      const analysisText = completion.choices[0].message.content;

      // Check if response is HTML (error page) instead of JSON
      if (typeof analysisText !== "string") {
        console.error(
          "❌ OpenAI response is not a string:",
          typeof analysisText
        );
        throw new Error("Invalid response format from OpenAI API");
      }

      if (
        analysisText.trim().toLowerCase().startsWith("<!doctype") ||
        analysisText.trim().toLowerCase().startsWith("<html")
      ) {
        console.error(
          "❌ OpenAI returned HTML instead of JSON. This usually indicates an API error or invalid API key."
        );
        console.error("Response preview:", analysisText.substring(0, 200));
        throw new Error(
          "OpenAI API returned an error page. Please check your API key and configuration."
        );
      }

      // Try to parse JSON
      let analysis;
      try {
        analysis = JSON.parse(analysisText);
      } catch (parseError) {
        console.error("❌ Failed to parse OpenAI response as JSON");
        console.error("Response preview:", analysisText.substring(0, 500));
        throw new Error(
          `Failed to parse OpenAI response: ${parseError.message}`
        );
      }

      return analysis;
    } catch (error) {
      console.error("❌ Error calling OpenAI:", error);
      // If it's a parsing error or HTML response, return fallback instead of throwing
      if (
        error.message.includes("parse") ||
        error.message.includes("HTML") ||
        error.message.includes("error page")
      ) {
        console.warn(
          "⚠️ Falling back to default analysis due to OpenAI API issue"
        );
        return this.getFallbackAnalysis(userData);
      }
      throw error;
    }
  }

  /**
   * Get fallback analysis when OpenAI is not configured
   */
  getFallbackAnalysis(userData) {
    const totalApplications =
      parseInt(userData.jobStats?.total_applications) || 0;
    const interviewCount = parseInt(userData.jobStats?.interview_count) || 0;
    const interviewRate =
      totalApplications > 0
        ? ((interviewCount / totalApplications) * 100).toFixed(1)
        : 0;

    return {
      peerBenchmarking: {
        userApplicationsPerWeek: 0,
        peerAverage: "Industry average: 5-10 applications per week",
        topPerformers: "Top performers: 15-20 applications per week",
        insight: "Configure OpenAI API key to enable personalized benchmarking",
      },
      skillGaps: [],
      marketPositioning: {
        competitivenessScore: 50,
        level: "Moderate",
        strengths: [],
        insights: [
          "Configure OpenAI API key to enable AI-powered competitive analysis",
        ],
      },
      differentiation: {
        uniqueValueProposition:
          "Configure OpenAI API key to enable personalized value proposition analysis",
        competitiveAdvantages: [],
      },
      recommendations: {
        quickWins: ["Configure OpenAI API key to enable AI recommendations"],
        strategicMoves: [],
        longTermEdge: [],
      },
      successPatterns: {
        avgTimeToOffer: "Configure OpenAI API key for personalized insights",
        nextCareerStep: "Configure OpenAI API key for personalized guidance",
        typicalProgression:
          "Configure OpenAI API key for personalized analysis",
      },
    };
  }
}

export default new CompetitiveAnalysisService();
