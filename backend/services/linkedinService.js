import database from "./database.js";
import { ApiError } from "../utils/ApiError.js";
import axios from "axios";
import OpenAI from "openai";

class LinkedInService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openai = this.openaiApiKey
      ? new OpenAI({ apiKey: this.openaiApiKey })
      : null;
  }

  /**
   * Fetch LinkedIn profile data using access token
   * @param {string} accessToken - LinkedIn OAuth access token
   * @returns {Promise<Object>} LinkedIn profile data
   */
  async fetchLinkedInProfile(accessToken) {
    try {
      // LinkedIn API v2 endpoint for profile
      const response = await axios.get("https://api.linkedin.com/v2/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          projection:
            "(id,firstName,lastName,profilePicture(displayImage~:playableStreams))",
        },
      });

      // Fetch email separately (requires r_emailaddress scope)
      let email = null;
      try {
        const emailResponse = await axios.get(
          "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (emailResponse.data?.elements?.[0]?.["handle~"]?.emailAddress) {
          email = emailResponse.data.elements[0]["handle~"].emailAddress;
        }
      } catch (emailError) {
        console.warn("⚠️ Could not fetch LinkedIn email:", emailError.message);
      }

      // Fetch headline/position
      let headline = null;
      try {
        const headlineResponse = await axios.get(
          "https://api.linkedin.com/v2/me",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              projection: "(headline)",
            },
          }
        );
        headline = headlineResponse.data?.headline || null;
      } catch (headlineError) {
        console.warn(
          "⚠️ Could not fetch LinkedIn headline:",
          headlineError.message
        );
      }

      // Extract profile picture URL
      let profilePicture = null;
      if (response.data?.profilePicture?.["displayImage~"]?.elements) {
        const images = response.data.profilePicture["displayImage~"].elements;
        // Get the largest image
        const largestImage = images.sort(
          (a, b) => (b.width || 0) - (a.width || 0)
        )[0];
        profilePicture = largestImage?.identifiers?.[0]?.identifier || null;
      }

      return {
        linkedinId: response.data.id,
        firstName:
          response.data.firstName?.localized?.en_US ||
          response.data.firstName?.preferredLocale?.language ||
          null,
        lastName:
          response.data.lastName?.localized?.en_US ||
          response.data.lastName?.preferredLocale?.language ||
          null,
        email,
        profilePicture,
        headline,
        profileUrl: `https://www.linkedin.com/in/${response.data.id}`,
      };
    } catch (error) {
      console.error("❌ Error fetching LinkedIn profile:", error);
      if (error.response) {
        throw new ApiError(
          `LinkedIn API error: ${error.response.status} - ${
            error.response.data?.message || error.message
          }`,
          error.response.status
        );
      }
      throw new ApiError(
        `Failed to fetch LinkedIn profile: ${error.message}`,
        500
      );
    }
  }

  /**
   * Import LinkedIn profile data to user's profile
   * @param {string} userId - User ID
   * @param {Object} profileData - LinkedIn profile data
   */
  async importProfileToUser(userId, profileData) {
    try {
      const { firstName, lastName, profilePicture, headline } = profileData;

      // Check if profile exists
      const profileCheck = await database.query(
        `SELECT user_id FROM profiles WHERE user_id = $1`,
        [userId]
      );

      const defaultPfpLink =
        profilePicture ||
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

      if (profileCheck.rows.length === 0) {
        // Create profile if it doesn't exist
        await database.query(
          `INSERT INTO profiles (user_id, first_name, last_name, state, pfp_link, job_title)
           VALUES ($1, $2, $3, 'NY', $4, $5)`,
          [userId, firstName, lastName, defaultPfpLink, headline]
        );
      } else {
        // Update profile with LinkedIn data (only if fields are empty or default)
        await database.query(
          `UPDATE profiles 
           SET first_name = COALESCE(NULLIF(first_name, ''), $2),
               last_name = COALESCE(NULLIF(last_name, ''), $3),
               pfp_link = CASE 
                 WHEN pfp_link LIKE '%blank-profile%' OR pfp_link IS NULL OR pfp_link = '' THEN $4
                 ELSE pfp_link
               END,
               job_title = COALESCE(NULLIF(job_title, ''), $5)
           WHERE user_id = $1`,
          [userId, firstName, lastName, defaultPfpLink, headline]
        );
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Error importing LinkedIn profile:", error);
      throw error;
    }
  }

  /**
   * Fetch LinkedIn connections (requires r_network scope)
   * Note: LinkedIn API v2 has limited connection access
   * This is a placeholder for future implementation
   * @param {string} accessToken - LinkedIn OAuth access token
   * @returns {Promise<Array>} Array of connection data
   */
  async fetchLinkedInConnections(accessToken) {
    try {
      // LinkedIn API v2 doesn't provide direct access to connections list
      // This would require additional permissions and may not be available
      // For now, return empty array
      console.warn("⚠️ LinkedIn connections API is not available in v2");
      return [];
    } catch (error) {
      console.error("❌ Error fetching LinkedIn connections:", error);
      throw new ApiError(
        `Failed to fetch LinkedIn connections: ${error.message}`,
        500
      );
    }
  }

  /**
   * Import LinkedIn connections as professional contacts
   * @param {string} userId - User ID
   * @param {Array} connections - Array of LinkedIn connection data
   */
  async importConnectionsAsContacts(userId, connections) {
    try {
      const importedContacts = [];

      for (const connection of connections) {
        try {
          // Check if contact already exists
          const existingContact = await database.query(
            `SELECT id FROM professional_contacts 
             WHERE user_id = $1 AND (email = $2 OR linkedin_url = $3)`,
            [userId, connection.email, connection.profileUrl]
          );

          if (existingContact.rows.length === 0) {
            // Insert new contact
            const result = await database.query(
              `INSERT INTO professional_contacts 
               (user_id, first_name, last_name, email, company, job_title, industry, linkedin_url, imported_from, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'linkedin', NOW(), NOW())
               RETURNING id`,
              [
                userId,
                connection.firstName,
                connection.lastName,
                connection.email,
                connection.company,
                connection.headline,
                connection.industry,
                connection.profileUrl,
              ]
            );

            importedContacts.push(result.rows[0].id);
          }
        } catch (contactError) {
          console.error(
            `❌ Error importing contact ${connection.email}:`,
            contactError
          );
          // Continue with next contact
        }
      }

      return { importedCount: importedContacts.length, importedContacts };
    } catch (error) {
      console.error("❌ Error importing LinkedIn connections:", error);
      throw error;
    }
  }

  /**
   * Get user's LinkedIn profile URL
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} LinkedIn profile URL or null
   */
  async getLinkedInProfileUrl(userId) {
    try {
      const result = await database.query(
        `SELECT linkedin_id FROM users WHERE u_id = $1 AND linkedin_id IS NOT NULL`,
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].linkedin_id) {
        return null;
      }

      return `https://www.linkedin.com/in/${result.rows[0].linkedin_id}`;
    } catch (error) {
      console.error("❌ Error getting LinkedIn profile URL:", error);
      throw error;
    }
  }

  /**
   * Get user's LinkedIn access token
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} Access token or null
   */
  async getLinkedInAccessToken(userId) {
    try {
      const result = await database.query(
        `SELECT linkedin_access_token, linkedin_token_expires_at 
         FROM users 
         WHERE u_id = $1 AND linkedin_access_token IS NOT NULL`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const { linkedin_access_token, linkedin_token_expires_at } =
        result.rows[0];

      // Check if token is expired
      if (
        linkedin_token_expires_at &&
        new Date(linkedin_token_expires_at) < new Date()
      ) {
        console.warn("⚠️ LinkedIn access token expired");
        return null;
      }

      return linkedin_access_token;
    } catch (error) {
      console.error("❌ Error getting LinkedIn access token:", error);
      throw error;
    }
  }

  /**
   * Generate LinkedIn networking message templates
   * @param {string} userId - User ID
   * @param {Object} options - Template generation options
   * @returns {Promise<Object>} Generated template
   */
  async generateNetworkingTemplate(userId, options = {}) {
    try {
      const {
        templateType = "connection_request", // connection_request, outreach_message, follow_up, thank_you
        contactName,
        contactTitle,
        contactCompany,
        context,
        jobTitle,
        jobCompany,
      } = options;

      // Get user profile data for personalization
      const profileResult = await database.query(
        `SELECT first_name, last_name, job_title, industry 
         FROM profiles 
         WHERE user_id = $1`,
        [userId]
      );
      const profile = profileResult.rows[0] || {};

      // Generate template using AI
      let templateContent = "";
      let optimizationSuggestions = "";

      if (this.openai) {
        const prompt = this.buildTemplatePrompt(templateType, profile, {
          contactName,
          contactTitle,
          contactCompany,
          context,
          jobTitle,
          jobCompany,
        });

        const response = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a LinkedIn networking expert. Generate professional, personalized LinkedIn messages that are authentic and effective.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
        });

        const aiResponse = response.choices[0]?.message?.content || "";
        const parsed = this.parseTemplateResponse(aiResponse);
        templateContent = parsed.template || aiResponse;
        optimizationSuggestions = parsed.suggestions || "";
      } else {
        // Fallback template generation
        templateContent = this.generateFallbackTemplate(templateType, profile, {
          contactName,
          contactTitle,
          contactCompany,
          context,
        });
        optimizationSuggestions =
          this.getFallbackOptimizationSuggestions(templateType);
      }

      // Save template to database
      const templateName = `${templateType}_${
        contactName || "template"
      }_${Date.now()}`;
      const result = await database.query(
        `INSERT INTO linkedin_networking_templates 
         (user_id, template_type, template_name, message_template, optimization_suggestions, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, template_type, template_name, message_template, optimization_suggestions, created_at`,
        [
          userId,
          templateType,
          templateName,
          templateContent,
          optimizationSuggestions,
        ]
      );

      return {
        id: result.rows[0].id,
        templateType: result.rows[0].template_type,
        templateName: result.rows[0].template_name,
        messageTemplate: result.rows[0].message_template,
        optimizationSuggestions: result.rows[0].optimization_suggestions,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      console.error("❌ Error generating networking template:", error);
      throw error;
    }
  }

  /**
   * Get user's LinkedIn networking templates
   * @param {string} userId - User ID
   * @param {string} templateType - Optional filter by template type
   * @returns {Promise<Array>} Array of templates
   */
  async getNetworkingTemplates(userId, templateType = null) {
    try {
      let query = `
        SELECT id, template_type, template_name, message_template, optimization_suggestions, created_at
        FROM linkedin_networking_templates
        WHERE user_id = $1
      `;
      const params = [userId];

      if (templateType) {
        query += ` AND template_type = $2`;
        params.push(templateType);
      }

      query += ` ORDER BY created_at DESC`;

      const result = await database.query(query, params);
      return result.rows.map((row) => ({
        id: row.id,
        templateType: row.template_type,
        templateName: row.template_name,
        messageTemplate: row.message_template,
        optimizationSuggestions: row.optimization_suggestions,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error("❌ Error getting networking templates:", error);
      throw error;
    }
  }

  /**
   * Generate LinkedIn profile optimization suggestions
   * @param {string} userId - User ID
   * @param {Object} profileData - Current profile data
   * @returns {Promise<Array>} Array of optimization suggestions
   */
  async generateProfileOptimizationSuggestions(userId, profileData = {}) {
    try {
      // Get user's current profile
      const profileResult = await database.query(
        `SELECT first_name, last_name, job_title, industry, summary, skills
         FROM profiles p
         LEFT JOIN (
           SELECT user_id, STRING_AGG(skill_name, ', ') as skills
           FROM skills
           WHERE user_id = $1
           GROUP BY user_id
         ) s ON p.user_id = s.user_id
         WHERE p.user_id = $1`,
        [userId]
      );
      const currentProfile = profileResult.rows[0] || {};

      // Merge with provided profile data
      const fullProfile = { ...currentProfile, ...profileData };

      // Generate optimization suggestions using AI
      const optimizationAreas = [
        "headline",
        "summary",
        "experience",
        "skills",
        "profile_picture",
        "content_strategy",
      ];

      const suggestions = [];

      if (this.openai) {
        for (const area of optimizationAreas) {
          try {
            const prompt = this.buildOptimizationPrompt(area, fullProfile);
            const response = await this.openai.chat.completions.create({
              model: process.env.OPENAI_MODEL || "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a LinkedIn profile optimization expert. Provide specific, actionable suggestions to improve LinkedIn profiles.",
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
              temperature: 0.6,
              max_tokens: 500,
            });

            const aiResponse = response.choices[0]?.message?.content || "";
            const parsed = this.parseOptimizationResponse(aiResponse, area);

            // Save to database
            const result = await database.query(
              `INSERT INTO linkedin_profile_optimization 
               (user_id, optimization_area, current_content, suggested_improvements, best_practices, implemented, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
               RETURNING id, optimization_area, current_content, suggested_improvements, best_practices, implemented, created_at`,
              [
                userId,
                area,
                parsed.currentContent || "",
                parsed.suggestions || "",
                parsed.bestPractices || "",
              ]
            );

            suggestions.push({
              id: result.rows[0].id,
              optimizationArea: result.rows[0].optimization_area,
              currentContent: result.rows[0].current_content,
              suggestedImprovements: result.rows[0].suggested_improvements,
              bestPractices: result.rows[0].best_practices,
              implemented: result.rows[0].implemented,
              createdAt: result.rows[0].created_at,
            });
          } catch (areaError) {
            console.error(
              `❌ Error generating optimization for ${area}:`,
              areaError
            );
            // Continue with next area
          }
        }
      } else {
        // Fallback suggestions
        for (const area of optimizationAreas) {
          const fallback = this.getFallbackOptimizationSuggestion(
            area,
            fullProfile
          );
          const result = await database.query(
            `INSERT INTO linkedin_profile_optimization 
             (user_id, optimization_area, current_content, suggested_improvements, best_practices, implemented, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
             RETURNING id, optimization_area, current_content, suggested_improvements, best_practices, implemented, created_at`,
            [
              userId,
              area,
              fallback.currentContent,
              fallback.suggestions,
              fallback.bestPractices,
            ]
          );
          suggestions.push({
            id: result.rows[0].id,
            optimizationArea: result.rows[0].optimization_area,
            currentContent: result.rows[0].current_content,
            suggestedImprovements: result.rows[0].suggested_improvements,
            bestPractices: result.rows[0].best_practices,
            implemented: result.rows[0].implemented,
            createdAt: result.rows[0].created_at,
          });
        }
      }

      return suggestions;
    } catch (error) {
      console.error(
        "❌ Error generating profile optimization suggestions:",
        error
      );
      throw error;
    }
  }

  /**
   * Get user's LinkedIn profile optimization suggestions
   * @param {string} userId - User ID
   * @param {boolean} implementedOnly - Filter by implementation status
   * @returns {Promise<Array>} Array of optimization suggestions
   */
  async getProfileOptimizationSuggestions(userId, implementedOnly = false) {
    try {
      let query = `
        SELECT id, optimization_area, current_content, suggested_improvements, best_practices, implemented, created_at, updated_at
        FROM linkedin_profile_optimization
        WHERE user_id = $1
      `;
      const params = [userId];

      if (implementedOnly) {
        query += ` AND implemented = true`;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await database.query(query, params);
      return result.rows.map((row) => ({
        id: row.id,
        optimizationArea: row.optimization_area,
        currentContent: row.current_content,
        suggestedImprovements: row.suggested_improvements,
        bestPractices: row.best_practices,
        implemented: row.implemented,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error(
        "❌ Error getting profile optimization suggestions:",
        error
      );
      throw error;
    }
  }

  /**
   * Mark optimization suggestion as implemented
   * @param {string} userId - User ID
   * @param {string} optimizationId - Optimization suggestion ID
   * @returns {Promise<Object>} Updated optimization suggestion
   */
  async markOptimizationImplemented(userId, optimizationId) {
    try {
      const result = await database.query(
        `UPDATE linkedin_profile_optimization 
         SET implemented = true, updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING id, optimization_area, implemented, updated_at`,
        [optimizationId, userId]
      );

      if (result.rows.length === 0) {
        throw new ApiError("Optimization suggestion not found", 404);
      }

      return {
        id: result.rows[0].id,
        optimizationArea: result.rows[0].optimization_area,
        implemented: result.rows[0].implemented,
        updatedAt: result.rows[0].updated_at,
      };
    } catch (error) {
      console.error("❌ Error marking optimization as implemented:", error);
      throw error;
    }
  }

  /**
   * Generate networking strategies and best practices
   * @param {string} userId - User ID
   * @param {Object} options - Strategy generation options
   * @returns {Promise<Object>} Networking strategies
   */
  async generateNetworkingStrategies(userId, options = {}) {
    try {
      const { industry, targetRoles, goal } = options;

      // Get user profile for context
      const profileResult = await database.query(
        `SELECT job_title, industry FROM profiles WHERE user_id = $1`,
        [userId]
      );
      const profile = profileResult.rows[0] || {};

      let strategies = {};

      if (this.openai) {
        const prompt = `Generate comprehensive LinkedIn networking strategies for a professional.

User Profile:
- Current Role: ${profile.job_title || "Not specified"}
- Industry: ${profile.industry || industry || "Not specified"}
- Target Roles: ${targetRoles ? targetRoles.join(", ") : "Not specified"}
- Goal: ${goal || "Build professional network"}

Provide strategies in JSON format:
{
  "connectionRequestStrategy": {
    "approach": "strategy description",
    "templates": ["template1", "template2"],
    "bestPractices": ["practice1", "practice2"]
  },
  "outreachStrategy": {
    "approach": "strategy description",
    "timing": "best times to reach out",
    "followUp": "follow-up strategy"
  },
  "contentStrategy": {
    "postingFrequency": "recommendation",
    "contentTypes": ["type1", "type2"],
    "engagementTips": ["tip1", "tip2"]
  },
  "campaignStrategy": {
    "approach": "campaign approach",
    "trackingMetrics": ["metric1", "metric2"]
  }
}`;

        const response = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a LinkedIn networking strategist. Provide actionable, specific networking strategies.",
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

        const content = response.choices[0]?.message?.content || "{}";
        strategies = JSON.parse(content);
      } else {
        // Fallback strategies
        strategies = this.getFallbackNetworkingStrategies(profile, options);
      }

      return strategies;
    } catch (error) {
      console.error("❌ Error generating networking strategies:", error);
      throw error;
    }
  }

  // Helper methods for building prompts and parsing responses
  buildTemplatePrompt(templateType, profile, context) {
    const {
      contactName,
      contactTitle,
      contactCompany,
      jobTitle,
      jobCompany,
      context: customContext,
    } = context;

    const templates = {
      connection_request: `Generate a personalized LinkedIn connection request message.

Your Profile:
- Name: ${profile.first_name || ""} ${profile.last_name || ""}
- Title: ${profile.job_title || ""}
- Industry: ${profile.industry || ""}

Contact:
- Name: ${contactName || "Professional"}
- Title: ${contactTitle || ""}
- Company: ${contactCompany || ""}
${customContext ? `- Context: ${customContext}` : ""}

Requirements:
- Keep it under 300 characters
- Be authentic and personal
- Mention a specific reason for connecting
- Avoid being salesy

Return JSON:
{
  "template": "the connection request message",
  "suggestions": "optimization tips for this message"
}`,

      outreach_message: `Generate a professional LinkedIn outreach message.

Your Profile:
- Name: ${profile.first_name || ""} ${profile.last_name || ""}
- Title: ${profile.job_title || ""}

Contact:
- Name: ${contactName || "Professional"}
- Title: ${contactTitle || ""}
- Company: ${contactCompany || ""}
${jobTitle ? `- Target Role: ${jobTitle} at ${jobCompany || ""}` : ""}
${customContext ? `- Context: ${customContext}` : ""}

Requirements:
- Professional but friendly tone
- Clear purpose
- Specific and relevant
- Include a call to action

Return JSON:
{
  "template": "the outreach message",
  "suggestions": "optimization tips"
}`,

      follow_up: `Generate a LinkedIn follow-up message.

Context: ${customContext || "Following up on a previous conversation"}

Requirements:
- Reference previous interaction
- Be concise
- Provide value
- Clear next steps

Return JSON:
{
  "template": "the follow-up message",
  "suggestions": "optimization tips"
}`,

      thank_you: `Generate a LinkedIn thank you message.

Context: ${customContext || "Thanking someone for their time or help"}

Requirements:
- Sincere and appreciative
- Specific about what you're thanking them for
- Professional tone

Return JSON:
{
  "template": "the thank you message",
  "suggestions": "optimization tips"
}`,
    };

    return templates[templateType] || templates.connection_request;
  }

  parseTemplateResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        template: parsed.template || response,
        suggestions: parsed.suggestions || "",
      };
    } catch {
      return {
        template: response,
        suggestions: "",
      };
    }
  }

  generateFallbackTemplate(templateType, profile, context) {
    const { contactName, contactTitle, contactCompany } = context;
    const userName = `${profile.first_name || ""} ${
      profile.last_name || ""
    }`.trim();

    const templates = {
      connection_request: `Hi ${contactName || "there"},

I noticed your work at ${
        contactCompany || "your company"
      } and would love to connect. ${
        contactTitle
          ? `Your experience as a ${contactTitle} aligns with my interests in ${
              profile.industry || "the industry"
            }.`
          : ""
      }

Looking forward to connecting!

Best,
${userName || "Professional"}`,

      outreach_message: `Hi ${contactName || "there"},

I hope this message finds you well. ${
        contactTitle
          ? `As a ${contactTitle} at ${contactCompany || "your company"},`
          : ""
      } I'd love to learn more about your experience.

${
  profile.job_title ? `I'm currently a ${profile.job_title} and` : "I"
} would appreciate any insights you could share.

Would you be open to a brief conversation?

Best regards,
${userName || "Professional"}`,

      follow_up: `Hi ${contactName || "there"},

Following up on our previous conversation. I wanted to reach out again regarding ${
        context?.context || "our discussion"
      }.

I'd love to continue the conversation when you have a moment.

Best,
${userName || "Professional"}`,

      thank_you: `Hi ${contactName || "there"},

Thank you so much for ${
        context?.context || "your time and insights"
      }. I really appreciate it.

${
  context?.context
    ? `Your advice on ${context.context} was particularly helpful.`
    : ""
}

Best regards,
${userName || "Professional"}`,
    };

    return templates[templateType] || templates.connection_request;
  }

  getFallbackOptimizationSuggestions(templateType) {
    const suggestions = {
      connection_request:
        "Personalize each request. Mention specific reasons for connecting. Keep it concise.",
      outreach_message:
        "Be clear about your purpose. Provide value. Include a specific call to action.",
      follow_up:
        "Reference previous interaction. Be respectful of their time. Provide additional value.",
      thank_you:
        "Be specific about what you're thanking them for. Keep it genuine and brief.",
    };
    return (
      suggestions[templateType] || "Personalize your message and be authentic."
    );
  }

  buildOptimizationPrompt(area, profile) {
    const prompts = {
      headline: `Analyze this LinkedIn headline and provide optimization suggestions:

Current Headline: "${profile.job_title || "Not set"}"

Provide:
1. Current content assessment
2. Specific improvement suggestions
3. Best practices for LinkedIn headlines

Return JSON:
{
  "currentContent": "current headline",
  "suggestions": "improved headline and explanation",
  "bestPractices": "best practices list"
}`,

      summary: `Analyze this LinkedIn summary and provide optimization suggestions:

Current Summary: "${profile.summary || "Not set"}"

Provide:
1. Current content assessment
2. Specific improvement suggestions
3. Best practices for LinkedIn summaries

Return JSON:
{
  "currentContent": "current summary",
  "suggestions": "improved summary and explanation",
  "bestPractices": "best practices list"
}`,

      experience: `Provide LinkedIn experience section optimization suggestions for:

Current Role: ${profile.job_title || "Not specified"}
Industry: ${profile.industry || "Not specified"}

Provide:
1. Current content assessment
2. Specific improvement suggestions
3. Best practices for LinkedIn experience sections

Return JSON:
{
  "currentContent": "current experience description",
  "suggestions": "improved experience descriptions",
  "bestPractices": "best practices list"
}`,

      skills: `Provide LinkedIn skills section optimization suggestions:

Current Skills: ${profile.skills || "Not specified"}
Industry: ${profile.industry || "Not specified"}

Provide:
1. Current skills assessment
2. Recommended skills to add
3. Best practices for LinkedIn skills

Return JSON:
{
  "currentContent": "current skills",
  "suggestions": "recommended skills and explanation",
  "bestPractices": "best practices list"
}`,

      profile_picture: `Provide LinkedIn profile picture optimization suggestions.

Provide:
1. Current profile picture assessment
2. Specific improvement suggestions
3. Best practices for LinkedIn profile pictures

Return JSON:
{
  "currentContent": "profile picture status",
  "suggestions": "improvement suggestions",
  "bestPractices": "best practices list"
}`,

      content_strategy: `Provide LinkedIn content sharing strategy suggestions.

User Profile:
- Role: ${profile.job_title || "Not specified"}
- Industry: ${profile.industry || "Not specified"}

Provide:
1. Current content strategy assessment
2. Content type recommendations
3. Posting frequency and timing suggestions
4. Best practices for LinkedIn content

Return JSON:
{
  "currentContent": "current content strategy",
  "suggestions": "content strategy recommendations",
  "bestPractices": "best practices list"
}`,
    };

    return prompts[area] || prompts.headline;
  }

  parseOptimizationResponse(response, area) {
    try {
      const parsed = JSON.parse(response);
      return {
        currentContent: parsed.currentContent || "",
        suggestions: parsed.suggestions || "",
        bestPractices: parsed.bestPractices || "",
      };
    } catch {
      return {
        currentContent: "",
        suggestions: response,
        bestPractices: "",
      };
    }
  }

  getFallbackOptimizationSuggestion(area, profile) {
    const suggestions = {
      headline: {
        currentContent: profile.job_title || "Not set",
        suggestions:
          "Include your role, key skills, and value proposition. Keep it under 120 characters.",
        bestPractices:
          "Use keywords relevant to your industry. Be specific about your expertise.",
      },
      summary: {
        currentContent: profile.summary || "Not set",
        suggestions:
          "Write a compelling summary that tells your professional story. Include achievements and goals.",
        bestPractices:
          "Use first person. Include keywords. Show personality while staying professional.",
      },
      experience: {
        currentContent: profile.job_title || "Not set",
        suggestions:
          "Quantify achievements. Use action verbs. Highlight impact and results.",
        bestPractices:
          "Focus on accomplishments, not just responsibilities. Use metrics when possible.",
      },
      skills: {
        currentContent: profile.skills || "Not set",
        suggestions:
          "Include both technical and soft skills. Prioritize skills relevant to your target roles.",
        bestPractices:
          "Get endorsements. Keep skills updated. Include industry-relevant keywords.",
      },
      profile_picture: {
        currentContent: "Profile picture status",
        suggestions:
          "Use a professional headshot. Ensure good lighting and clear background.",
        bestPractices:
          "Professional attire. Smile naturally. High resolution. Square format works best.",
      },
      content_strategy: {
        currentContent: "Content strategy",
        suggestions:
          "Share industry insights, professional achievements, and valuable content regularly.",
        bestPractices:
          "Post 2-3 times per week. Engage with others' content. Share original thoughts.",
      },
    };

    return suggestions[area] || suggestions.headline;
  }

  getFallbackNetworkingStrategies(profile, options) {
    return {
      connectionRequestStrategy: {
        approach:
          "Personalize each connection request with a specific reason for connecting",
        templates: [
          "Mention shared connections or interests",
          "Reference their recent activity or achievements",
          "Express genuine interest in their work",
        ],
        bestPractices: [
          "Always personalize",
          "Keep it under 300 characters",
          "Avoid sales pitches",
          "Be authentic",
        ],
      },
      outreachStrategy: {
        approach: "Build relationships before asking for favors",
        timing: "Best times: Tuesday-Thursday, 8-10 AM or 5-6 PM",
        followUp: "Follow up once after 1-2 weeks if no response",
      },
      contentStrategy: {
        postingFrequency: "2-3 times per week",
        contentTypes: [
          "Industry insights",
          "Professional achievements",
          "Thought leadership",
          "Engaging questions",
        ],
        engagementTips: [
          "Comment on others' posts thoughtfully",
          "Share valuable content",
          "Engage with your network's content",
        ],
      },
      campaignStrategy: {
        approach: "Set clear goals and track metrics",
        trackingMetrics: [
          "Connection requests sent",
          "Response rate",
          "Meetings scheduled",
          "Opportunities generated",
        ],
      },
    };
  }
}

export default new LinkedInService();
