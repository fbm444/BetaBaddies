import OpenAI from "openai";
import database from "../database.js";
import { v4 as uuidv4 } from "uuid";

/**
 * AI Service for Family Support Suggestions
 * Provides AI-powered guidance for family members on effective support strategies
 */
class FamilySupportAIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openai = this.openaiApiKey
      ? new OpenAI({ apiKey: this.openaiApiKey })
      : null;
  }

  /**
   * Generate AI-powered support suggestions for a family member
   * @param {string} userId - The job seeker's user ID
   * @param {string} familyMemberUserId - The family member's user ID
   * @param {Object} context - Context data (progress, recent activities, etc.)
   * @returns {Promise<Object>} AI-generated suggestions
   */
  async generateSupportSuggestions(userId, familyMemberUserId, context = {}) {
    try {
      // Get user's recent progress and job search data
      const progressData = await this.getUserProgressContext(userId);
      
      // Get relationship context
      const relationshipData = await this.getRelationshipContext(userId, familyMemberUserId);
      
      // Get recent support activities
      const supportHistory = await this.getSupportHistory(userId, familyMemberUserId);

      if (!this.openai) {
        return this.getFallbackSuggestions(progressData, relationshipData);
      }

      const prompt = this.buildSupportSuggestionPrompt(
        progressData,
        relationshipData,
        supportHistory,
        context
      );

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert family support coach specializing in helping family members provide effective, healthy support during job searches. Your suggestions should:
- Be empathetic and understanding
- Respect boundaries and autonomy
- Focus on emotional support over practical advice
- Avoid being pushy or overbearing
- Celebrate achievements appropriately
- Recognize when to step back
- Provide actionable, specific guidance
- Consider the job seeker's current state and needs`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

      const aiResponse = JSON.parse(response.choices[0]?.message?.content || "{}");
      
      // Save suggestions to database
      const suggestions = [];
      if (aiResponse.suggestions && Array.isArray(aiResponse.suggestions)) {
        for (const suggestion of aiResponse.suggestions) {
          const suggestionId = uuidv4();
          await database.query(
            `INSERT INTO family_support_suggestions 
             (id, user_id, family_member_user_id, suggestion_type, title, suggestion_text, context_data, ai_generated)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
            [
              suggestionId,
              userId,
              familyMemberUserId,
              suggestion.suggestion_type || "support_strategy",
              suggestion.title,
              suggestion.suggestion_text,
              JSON.stringify(suggestion.context || {}),
            ]
          );
          suggestions.push({
            id: suggestionId,
            ...suggestion,
          });
        }
      }

      return {
        suggestions,
        overallGuidance: aiResponse.overall_guidance || "",
        boundaryRecommendations: aiResponse.boundary_recommendations || [],
        communicationTips: aiResponse.communication_tips || [],
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[FamilySupportAIService] Error generating suggestions:", error);
      // Return fallback suggestions on error
      const progressData = await this.getUserProgressContext(userId);
      const relationshipData = await this.getRelationshipContext(userId, familyMemberUserId);
      return this.getFallbackSuggestions(progressData, relationshipData);
    }
  }

  /**
   * Generate boundary setting suggestions
   */
  async generateBoundarySuggestions(userId, familyMemberUserId, currentBoundaries = {}) {
    if (!this.openai) {
      return this.getFallbackBoundarySuggestions();
    }

    try {
      const progressData = await this.getUserProgressContext(userId);
      const relationshipData = await this.getRelationshipContext(userId, familyMemberUserId);

      const prompt = `Analyze this family support relationship and suggest healthy boundaries:

Job Seeker Progress:
- Applications: ${progressData.applications_count || 0}
- Interviews: ${progressData.interviews_count || 0}
- Current Status: ${progressData.current_status || "Active job search"}

Relationship: ${relationshipData.relationship || "Family member"}
Current Boundaries: ${JSON.stringify(currentBoundaries)}

Provide boundary recommendations in JSON format:
{
  "recommendations": [
    {
      "setting_type": "communication_frequency|data_sharing_level|support_style|notification_preferences",
      "current_value": "description of current setting",
      "recommended_value": "description of recommended setting",
      "reasoning": "why this boundary is important",
      "priority": "high|medium|low"
    }
  ],
  "overallGuidance": "General guidance on maintaining healthy boundaries",
  "redFlags": ["warning signs to watch for", "..."],
  "greenFlags": ["positive indicators", "..."]
}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a relationship counselor specializing in healthy family dynamics during stressful periods like job searches. Focus on maintaining autonomy, respect, and mutual understanding.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0]?.message?.content || "{}");
    } catch (error) {
      console.error("[FamilySupportAIService] Error generating boundary suggestions:", error);
      return this.getFallbackBoundarySuggestions();
    }
  }

  /**
   * Get user progress context for AI
   */
  async getUserProgressContext(userId) {
    try {
      const jobStats = await database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'applied') as applications_count,
          COUNT(*) FILTER (WHERE status = 'interview') as interviews_count,
          COUNT(*) FILTER (WHERE status = 'offer') as offers_count,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejections_count
         FROM job_opportunities 
         WHERE user_id = $1`,
        [userId]
      );

      const recentActivity = await database.query(
        `SELECT 
          COUNT(*) as recent_applications
         FROM job_opportunities 
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
        [userId]
      );

      const interviews = await database.query(
        `SELECT COUNT(*) as upcoming_interviews
         FROM interviews 
         WHERE user_id = $1 AND scheduled_at > NOW() AND scheduled_at < NOW() + INTERVAL '14 days'`,
        [userId]
      );

      return {
        applications_count: parseInt(jobStats.rows[0]?.applications_count || 0),
        interviews_count: parseInt(jobStats.rows[0]?.interviews_count || 0),
        offers_count: parseInt(jobStats.rows[0]?.offers_count || 0),
        rejections_count: parseInt(jobStats.rows[0]?.rejections_count || 0),
        recent_applications: parseInt(recentActivity.rows[0]?.recent_applications || 0),
        upcoming_interviews: parseInt(interviews.rows[0]?.upcoming_interviews || 0),
        current_status: this.determineCurrentStatus(jobStats.rows[0], recentActivity.rows[0], interviews.rows[0]),
      };
    } catch (error) {
      console.error("[FamilySupportAIService] Error getting progress context:", error);
      return {};
    }
  }

  /**
   * Get relationship context
   */
  async getRelationshipContext(userId, familyMemberUserId) {
    try {
      const result = await database.query(
        `SELECT relationship, created_at 
         FROM family_support_access 
         WHERE user_id = $1 AND family_member_email = (
           SELECT email FROM users WHERE u_id = $2
         ) AND active = true
         LIMIT 1`,
        [userId, familyMemberUserId]
      );

      return {
        relationship: result.rows[0]?.relationship || "family member",
        relationshipDuration: result.rows[0]?.created_at || new Date(),
      };
    } catch (error) {
      console.error("[FamilySupportAIService] Error getting relationship context:", error);
      return { relationship: "family member" };
    }
  }

  /**
   * Get support history
   */
  async getSupportHistory(userId, familyMemberUserId) {
    try {
      const communications = await database.query(
        `SELECT communication_type, COUNT(*) as count
         FROM family_communications 
         WHERE user_id = $1 AND family_member_user_id = $2
         AND created_at > NOW() - INTERVAL '30 days'
         GROUP BY communication_type`,
        [userId, familyMemberUserId]
      );

      const celebrations = await database.query(
        `SELECT COUNT(*) as count
         FROM family_celebrations 
         WHERE user_id = $1 AND family_member_user_id = $2
         AND created_at > NOW() - INTERVAL '30 days'`,
        [userId, familyMemberUserId]
      );

      return {
        communications: communications.rows,
        celebrations_count: parseInt(celebrations.rows[0]?.count || 0),
      };
    } catch (error) {
      console.error("[FamilySupportAIService] Error getting support history:", error);
      return { communications: [], celebrations_count: 0 };
    }
  }

  /**
   * Build AI prompt for support suggestions
   */
  buildSupportSuggestionPrompt(progressData, relationshipData, supportHistory, context) {
    return `Generate personalized support suggestions for a family member supporting someone's job search.

Job Seeker's Current Situation:
- Total Applications: ${progressData.applications_count || 0}
- Interviews Scheduled: ${progressData.interviews_count || 0}
- Offers Received: ${progressData.offers_count || 0}
- Recent Activity: ${progressData.recent_applications || 0} applications in last 7 days
- Upcoming Interviews: ${progressData.upcoming_interviews || 0} in next 2 weeks
- Current Status: ${progressData.current_status || "Active job search"}

Relationship: ${relationshipData.relationship || "Family member"}

Recent Support Activity:
- Communications: ${supportHistory.communications?.length || 0} types
- Celebrations Shared: ${supportHistory.celebrations_count || 0}

Provide suggestions in JSON format:
{
  "suggestions": [
    {
      "suggestion_type": "support_strategy|boundary_setting|communication_tip|celebration_idea|wellbeing_support",
      "title": "Short, actionable title",
      "suggestion_text": "Detailed, empathetic suggestion (2-3 sentences)",
      "context": {
        "why_now": "Why this suggestion is relevant now",
        "expected_impact": "What positive impact this could have"
      }
    }
  ],
  "overall_guidance": "2-3 sentence summary of how to best support right now",
  "boundary_recommendations": ["specific boundary tip 1", "..."],
  "communication_tips": ["specific communication tip 1", "..."]
}

Focus on:
- Emotional support over practical advice
- Respecting autonomy
- Celebrating small wins
- Knowing when to step back
- Maintaining healthy boundaries
- Being encouraging without being pushy`;
  }

  /**
   * Determine current status from data
   */
  determineCurrentStatus(jobStats, recentActivity, interviews) {
    if (parseInt(jobStats?.offers_count || 0) > 0) {
      return "Has received offers";
    }
    if (parseInt(interviews?.upcoming_interviews || 0) > 0) {
      return "Active interview phase";
    }
    if (parseInt(recentActivity?.recent_applications || 0) > 0) {
      return "Actively applying";
    }
    if (parseInt(jobStats?.applications_count || 0) > 0) {
      return "Job search in progress";
    }
    return "Starting job search";
  }

  /**
   * Fallback suggestions when AI is unavailable
   */
  getFallbackSuggestions(progressData, relationshipData) {
    return {
      suggestions: [
        {
          id: uuidv4(),
          suggestion_type: "support_strategy",
          title: "Provide Encouragement",
          suggestion_text: "Offer words of encouragement and let them know you believe in them. Avoid giving unsolicited advice unless asked.",
          context: {
            why_now: "Job searching can be emotionally challenging",
            expected_impact: "Boosts confidence and morale",
          },
        },
        {
          id: uuidv4(),
          suggestion_type: "communication_tip",
          title: "Check In, Don't Check Up",
          suggestion_text: "Ask how they're doing emotionally rather than constantly asking about applications. Show interest in their well-being, not just outcomes.",
          context: {
            why_now: "Maintains healthy communication",
            expected_impact: "Reduces pressure and stress",
          },
        },
      ],
      overallGuidance: "Focus on emotional support and celebrate their efforts, not just outcomes. Respect their autonomy in the job search process.",
      boundaryRecommendations: [
        "Let them share updates on their timeline",
        "Avoid asking for daily progress reports",
        "Respect their decision-making process",
      ],
      communicationTips: [
        "Ask open-ended questions about how they're feeling",
        "Celebrate small wins and milestones",
        "Offer help only when asked",
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fallback boundary suggestions
   */
  getFallbackBoundarySuggestions() {
    return {
      recommendations: [
        {
          setting_type: "communication_frequency",
          current_value: "Not set",
          recommended_value: "Weekly check-ins unless they reach out more",
          reasoning: "Balances support with autonomy",
          priority: "medium",
        },
        {
          setting_type: "data_sharing_level",
          current_value: "Not set",
          recommended_value: "High-level progress only (applications, interviews, offers)",
          reasoning: "Respects privacy while staying informed",
          priority: "high",
        },
      ],
      overallGuidance: "Set clear boundaries around communication frequency and data sharing to maintain a healthy support relationship.",
      redFlags: ["Feeling pressured", "Constant checking in", "Overstepping boundaries"],
      greenFlags: ["Open communication", "Respectful of autonomy", "Celebrating together"],
    };
  }
}

export default new FamilySupportAIService();

