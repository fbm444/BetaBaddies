import OpenAI from "openai";
import database from "../database.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Service for generating AI-powered educational resources for family members
 * Resources are personalized based on the job seeker's profile and progress
 */
class FamilyEducationalResourcesService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openai = this.openaiApiKey
      ? new OpenAI({ apiKey: this.openaiApiKey })
      : null;
  }

  /**
   * Generate or retrieve educational resources for a specific user
   * @param {string} userId - The job seeker's user ID
   * @param {string} category - Optional category filter
   * @param {boolean} forceRegenerate - Force regeneration even if recent resources exist
   * @returns {Promise<Array>} Array of educational resources
   */
  async getOrGenerateResources(
    userId,
    category = null,
    forceRegenerate = false
  ) {
    try {
      // First, check if resources already exist for this user
      let query = `
        SELECT * FROM family_educational_resources 
        WHERE user_id = $1
      `;
      const params = [userId];

      if (category) {
        query += ` AND category = $2`;
        params.push(category);
      }

      query += ` ORDER BY created_at DESC`;

      const existingResources = await database.query(query, params);

      // If force regenerate, delete old resources and generate new ones
      if (forceRegenerate) {
        await database.query(
          `DELETE FROM family_educational_resources WHERE user_id = $1`,
          [userId]
        );
        if (this.openai) {
          const newResources = await this.generateResourcesForUser(userId);
          return newResources;
        }
        return [];
      }

      // If resources exist and are recent (within last 7 days), return them
      const recentResources = existingResources.rows.filter((resource) => {
        const createdAt = new Date(resource.created_at);
        const daysSinceCreation =
          (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreation < 7;
      });

      if (recentResources.length > 0) {
        return recentResources;
      }

      // If no recent resources, generate new ones
      if (this.openai) {
        const newResources = await this.generateResourcesForUser(userId);
        return newResources;
      }

      // Fallback to existing resources or empty array
      return existingResources.rows;
    } catch (error) {
      console.error(
        "[FamilyEducationalResourcesService] Error getting resources:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate educational resources for a specific user based on their profile and progress
   */
  async generateResourcesForUser(userId) {
    try {
      // Get user's profile and progress data
      const userContext = await this.getUserContext(userId);

      if (!this.openai) {
        return this.getFallbackResources();
      }

      const prompt = this.buildResourceGenerationPrompt(userContext);

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert career coach and family support advisor. Generate educational resources (articles/guides) that help family members provide effective support during a job search. Resources should be:
- Empathetic and understanding
- Practical and actionable
- Specific to the job seeker's current situation
- Focused on healthy support strategies
- Respectful of boundaries and autonomy`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const aiResponse = JSON.parse(
        response.choices[0]?.message?.content || "{}"
      );

      // Save generated resources to database
      const savedResources = [];
      if (aiResponse.resources && Array.isArray(aiResponse.resources)) {
        for (const resource of aiResponse.resources) {
          const resourceId = uuidv4();
          await database.query(
            `INSERT INTO family_educational_resources 
             (id, user_id, resource_type, title, content, category, ai_generated)
             VALUES ($1, $2, $3, $4, $5, $6, true)`,
            [
              resourceId,
              userId,
              resource.resource_type || "article",
              resource.title,
              resource.content,
              resource.category || "support_strategies",
            ]
          );
          savedResources.push({
            id: resourceId,
            user_id: userId,
            ...resource,
            ai_generated: true,
          });
        }
      }

      return savedResources;
    } catch (error) {
      console.error(
        "[FamilyEducationalResourcesService] Error generating resources:",
        error
      );
      // Return fallback resources on error
      return this.getFallbackResources();
    }
  }

  /**
   * Get user context for resource generation
   */
  async getUserContext(userId) {
    try {
      // Get basic user info
      const userResult = await database.query(
        `SELECT u.email, p.first_name, p.last_name, p.industry, p.target_role
         FROM users u
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE u.u_id = $1`,
        [userId]
      );

      // Get job search stats
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

      // Get recent activity
      const recentActivity = await database.query(
        `SELECT 
          COUNT(*) as recent_applications
         FROM job_opportunities 
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
        [userId]
      );

      // Get upcoming interviews
      const interviews = await database.query(
        `SELECT COUNT(*) as upcoming_interviews
         FROM interviews 
         WHERE user_id = $1 AND scheduled_at > NOW() AND scheduled_at < NOW() + INTERVAL '14 days'`,
        [userId]
      );

      const user = userResult.rows[0] || {};
      const stats = jobStats.rows[0] || {};
      const recent = recentActivity.rows[0] || {};
      const upcoming = interviews.rows[0] || {};

      return {
        name:
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.email,
        industry: user.industry || "General",
        targetRole: user.target_role || "Not specified",
        applicationsCount: parseInt(stats.applications_count || 0),
        interviewsCount: parseInt(stats.interviews_count || 0),
        offersCount: parseInt(stats.offers_count || 0),
        rejectionsCount: parseInt(stats.rejections_count || 0),
        recentApplications: parseInt(recent.recent_applications || 0),
        upcomingInterviews: parseInt(upcoming.upcoming_interviews || 0),
        currentStatus: this.determineCurrentStatus(stats, recent, upcoming),
      };
    } catch (error) {
      console.error(
        "[FamilyEducationalResourcesService] Error getting user context:",
        error
      );
      return {};
    }
  }

  /**
   * Build prompt for resource generation
   */
  buildResourceGenerationPrompt(userContext) {
    return `Generate 4-6 educational resources (articles/guides) for a family member supporting someone's job search.

Job Seeker's Current Situation:
- Name: ${userContext.name || "Job Seeker"}
- Industry: ${userContext.industry || "General"}
- Target Role: ${userContext.targetRole || "Not specified"}
- Total Applications: ${userContext.applicationsCount || 0}
- Interviews Scheduled: ${userContext.interviewsCount || 0}
- Offers Received: ${userContext.offersCount || 0}
- Recent Activity: ${
      userContext.recentApplications || 0
    } applications in last 7 days
- Upcoming Interviews: ${userContext.upcomingInterviews || 0} in next 2 weeks
- Current Status: ${userContext.currentStatus || "Active job search"}

Generate resources in JSON format:
{
  "resources": [
    {
      "resource_type": "article|guide|tip",
      "title": "Engaging, specific title (e.g., 'How to Support During Interview Season')",
      "content": "Comprehensive article content (500-800 words) with practical advice, examples, and actionable tips. Write in a warm, empathetic tone. Include specific suggestions based on the job seeker's current situation.",
      "category": "support_strategies|communication|boundaries|celebration|wellbeing_support"
    }
  ]
}

Focus on:
- Resources relevant to the current job search phase
- Specific support strategies for this situation
- How to celebrate achievements appropriately
- Communication tips for this stage
- Boundary setting for healthy support
- Well-being support strategies
- Practical, actionable advice

Make each resource specific to the job seeker's current situation, not generic advice.`;
  }

  /**
   * Determine current status from data
   */
  determineCurrentStatus(jobStats, recentActivity, interviews) {
    if (parseInt(jobStats?.offers_count || 0) > 0) {
      return "Has received offers - decision making phase";
    }
    if (parseInt(interviews?.upcoming_interviews || 0) > 0) {
      return "Active interview phase - preparing for interviews";
    }
    if (parseInt(recentActivity?.recent_applications || 0) > 0) {
      return "Actively applying - sending out applications";
    }
    if (parseInt(jobStats?.applications_count || 0) > 0) {
      return "Job search in progress - building applications";
    }
    return "Starting job search - initial planning phase";
  }

  /**
   * Fallback resources when AI is unavailable
   */
  getFallbackResources() {
    return [
      {
        id: uuidv4(),
        resource_type: "article",
        title: "How to Provide Effective Emotional Support During Job Search",
        content: `Job searching can be emotionally challenging. Here are key ways to provide effective support:

1. **Listen Without Judgment**: Let them share their experiences without offering unsolicited advice. Sometimes they just need to vent.

2. **Celebrate Small Wins**: Acknowledge every application submitted, every interview scheduled, and every positive response - not just job offers.

3. **Respect Their Autonomy**: Remember this is their journey. Offer help when asked, but don't take over the process.

4. **Maintain Normalcy**: Keep regular routines and activities. Don't let the job search consume all conversations.

5. **Be Patient**: Job searches take time. Avoid asking "any news?" too frequently.`,
        category: "support_strategies",
        ai_generated: false,
      },
      {
        id: uuidv4(),
        resource_type: "guide",
        title: "Communication Tips for Supporting a Job Seeker",
        content: `Effective communication is key to providing healthy support:

**What to Say:**
- "I'm here for you"
- "You're doing great"
- "I believe in you"
- "How are you feeling about the process?"

**What to Avoid:**
- Constant questions about applications
- Comparing to others' job searches
- Unsolicited advice
- Pressure to apply to specific jobs

**Check-In Frequency:**
- Weekly check-ins are usually sufficient
- Let them initiate conversations about the job search
- Focus on their well-being, not just outcomes`,
        category: "communication",
        ai_generated: false,
      },
    ];
  }
}

export default new FamilyEducationalResourcesService();
