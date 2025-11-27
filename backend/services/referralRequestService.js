import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import database from "./database.js";

class ReferralRequestService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL;

    // Initialize OpenAI client
    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
        ...(this.openaiApiUrl && { baseURL: this.openaiApiUrl }),
      });
    }

  }

  // Create a new referral request
  async createReferralRequest(userId, referralData) {
    const {
      contactId,
      jobId,
      requestTemplateId,
      personalizedMessage,
      requestStatus,
      sentAt,
      responseReceivedAt,
      responseContent,
      referralSuccessful,
      followupRequired,
      followupSentAt,
      gratitudeExpressed,
      relationshipImpact,
    } = referralData;

    try {
      const referralId = uuidv4();

      const query = `
        INSERT INTO referral_requests (
          id, user_id, contact_id, job_id, request_template_id,
          personalized_message, request_status, sent_at, response_received_at,
          response_content, referral_successful, followup_required,
          followup_sent_at, gratitude_expressed, relationship_impact
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const result = await database.query(query, [
        referralId,
        userId,
        contactId,
        jobId,
        requestTemplateId || null,
        personalizedMessage || null,
        requestStatus || "pending",
        sentAt || null,
        responseReceivedAt || null,
        responseContent || null,
        referralSuccessful || null,
        followupRequired || false,
        followupSentAt || null,
        gratitudeExpressed || false,
        relationshipImpact || null,
      ]);

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        contactId: row.contact_id,
        jobId: row.job_id,
        requestTemplateId: row.request_template_id,
        personalizedMessage: row.personalized_message,
        requestStatus: row.request_status,
        sentAt: row.sent_at,
        responseReceivedAt: row.response_received_at,
        responseContent: row.response_content,
        referralSuccessful: row.referral_successful,
        followupRequired: row.followup_required,
        followupSentAt: row.followup_sent_at,
        gratitudeExpressed: row.gratitude_expressed,
        relationshipImpact: row.relationship_impact,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error("❌ Error creating referral request:", error);
      throw error;
    }
  }

  // Get all referral requests for a user
  async getReferralRequestsByUserId(userId, filters = {}) {
    try {
      let query = `
        SELECT rr.*, 
               pc.first_name as contact_first_name,
               pc.last_name as contact_last_name,
               pc.email as contact_email,
               pc.company as contact_company,
               jo.title as job_title,
               jo.company as job_company
        FROM referral_requests rr
        LEFT JOIN professional_contacts pc ON rr.contact_id = pc.id
        LEFT JOIN job_opportunities jo ON rr.job_id = jo.id
        WHERE rr.user_id = $1
      `;
      const params = [userId];

      // Apply filters
      if (filters.status) {
        query += ` AND rr.request_status = $${params.length + 1}`;
        params.push(filters.status);
      }
      if (filters.contactId) {
        query += ` AND rr.contact_id = $${params.length + 1}`;
        params.push(filters.contactId);
      }
      if (filters.jobId) {
        query += ` AND rr.job_id = $${params.length + 1}`;
        params.push(filters.jobId);
      }
      if (filters.followupRequired !== undefined) {
        query += ` AND rr.followup_required = $${params.length + 1}`;
        params.push(filters.followupRequired);
      }

      query += ` ORDER BY rr.created_at DESC`;

      const result = await database.query(query, params);
      return result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        contactId: row.contact_id,
        jobId: row.job_id,
        requestTemplateId: row.request_template_id,
        personalizedMessage: row.personalized_message,
        requestStatus: row.request_status,
        sentAt: row.sent_at,
        responseReceivedAt: row.response_received_at,
        responseContent: row.response_content,
        referralSuccessful: row.referral_successful,
        followupRequired: row.followup_required,
        followupSentAt: row.followup_sent_at,
        gratitudeExpressed: row.gratitude_expressed,
        relationshipImpact: row.relationship_impact,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        contactName: `${row.contact_first_name || ""} ${row.contact_last_name || ""}`.trim(),
        contactEmail: row.contact_email,
        contactCompany: row.contact_company,
        jobTitle: row.job_title,
        jobCompany: row.job_company,
      }));
    } catch (error) {
      console.error("❌ Error getting referral requests:", error);
      throw error;
    }
  }

  // Get referral request by ID
  async getReferralRequestById(referralId, userId) {
    try {
      const query = `
        SELECT rr.*, 
               pc.first_name as contact_first_name,
               pc.last_name as contact_last_name,
               pc.email as contact_email,
               pc.company as contact_company,
               jo.title as job_title,
               jo.company as job_company
        FROM referral_requests rr
        LEFT JOIN professional_contacts pc ON rr.contact_id = pc.id
        LEFT JOIN job_opportunities jo ON rr.job_id = jo.id
        WHERE rr.id = $1 AND rr.user_id = $2
      `;

      const result = await database.query(query, [referralId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        contactId: row.contact_id,
        jobId: row.job_id,
        requestTemplateId: row.request_template_id,
        personalizedMessage: row.personalized_message,
        requestStatus: row.request_status,
        sentAt: row.sent_at,
        responseReceivedAt: row.response_received_at,
        responseContent: row.response_content,
        referralSuccessful: row.referral_successful,
        followupRequired: row.followup_required,
        followupSentAt: row.followup_sent_at,
        gratitudeExpressed: row.gratitude_expressed,
        relationshipImpact: row.relationship_impact,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        contactName: `${row.contact_first_name || ""} ${row.contact_last_name || ""}`.trim(),
        contactEmail: row.contact_email,
        contactCompany: row.contact_company,
        jobTitle: row.job_title,
        jobCompany: row.job_company,
      };
    } catch (error) {
      console.error("❌ Error getting referral request by ID:", error);
      throw error;
    }
  }

  // Update referral request
  async updateReferralRequest(referralId, userId, referralData) {
    try {
      // First, verify the referral belongs to the user
      const existing = await this.getReferralRequestById(referralId, userId);
      if (!existing) {
        throw new Error("Referral request not found");
      }

      const fields = [];
      const values = [];
      let paramIndex = 1;

      const fieldMap = {
        contactId: "contact_id",
        jobId: "job_id",
        requestTemplateId: "request_template_id",
        personalizedMessage: "personalized_message",
        requestStatus: "request_status",
        sentAt: "sent_at",
        responseReceivedAt: "response_received_at",
        responseContent: "response_content",
        referralSuccessful: "referral_successful",
        followupRequired: "followup_required",
        followupSentAt: "followup_sent_at",
        gratitudeExpressed: "gratitude_expressed",
        relationshipImpact: "relationship_impact",
      };

      for (const [key, value] of Object.entries(referralData)) {
        if (value !== undefined && fieldMap[key]) {
          fields.push(`${fieldMap[key]} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        return existing;
      }

      // Always update updated_at
      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(referralId, userId);
      const query = `
        UPDATE referral_requests
        SET ${fields.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Failed to update referral request");
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        contactId: row.contact_id,
        jobId: row.job_id,
        requestTemplateId: row.request_template_id,
        personalizedMessage: row.personalized_message,
        requestStatus: row.request_status,
        sentAt: row.sent_at,
        responseReceivedAt: row.response_received_at,
        responseContent: row.response_content,
        referralSuccessful: row.referral_successful,
        followupRequired: row.followup_required,
        followupSentAt: row.followup_sent_at,
        gratitudeExpressed: row.gratitude_expressed,
        relationshipImpact: row.relationship_impact,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error("❌ Error updating referral request:", error);
      throw error;
    }
  }

  // Delete referral request
  async deleteReferralRequest(referralId, userId) {
    try {
      // First, verify the referral belongs to the user
      const existing = await this.getReferralRequestById(referralId, userId);
      if (!existing) {
        throw new Error("Referral request not found");
      }

      const query = `
        DELETE FROM referral_requests
        WHERE id = $1 AND user_id = $2
      `;

      await database.query(query, [referralId, userId]);

      return { success: true, message: "Referral request deleted successfully" };
    } catch (error) {
      console.error("❌ Error deleting referral request:", error);
      throw error;
    }
  }

  // Get referral requests needing follow-up
  async getReferralRequestsNeedingFollowup(userId) {
    try {
      const query = `
        SELECT rr.*, 
               pc.first_name as contact_first_name,
               pc.last_name as contact_last_name,
               jo.title as job_title,
               jo.company as job_company
        FROM referral_requests rr
        LEFT JOIN professional_contacts pc ON rr.contact_id = pc.id
        LEFT JOIN job_opportunities jo ON rr.job_id = jo.id
        WHERE rr.user_id = $1
          AND rr.followup_required = true
          AND (rr.followup_sent_at IS NULL OR rr.followup_sent_at < CURRENT_TIMESTAMP - INTERVAL '7 days')
        ORDER BY rr.sent_at ASC
      `;

      const result = await database.query(query, [userId]);
      return result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        contactId: row.contact_id,
        jobId: row.job_id,
        requestTemplateId: row.request_template_id,
        personalizedMessage: row.personalized_message,
        requestStatus: row.request_status,
        sentAt: row.sent_at,
        responseReceivedAt: row.response_received_at,
        responseContent: row.response_content,
        referralSuccessful: row.referral_successful,
        followupRequired: row.followup_required,
        followupSentAt: row.followup_sent_at,
        gratitudeExpressed: row.gratitude_expressed,
        relationshipImpact: row.relationship_impact,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        contactName: `${row.contact_first_name || ""} ${row.contact_last_name || ""}`.trim(),
        contactEmail: row.contact_email,
        contactCompany: row.contact_company,
        jobTitle: row.job_title,
        jobCompany: row.job_company,
      }));
    } catch (error) {
      console.error("❌ Error getting referral requests needing follow-up:", error);
      throw error;
    }
  }

  // Get referral templates
  async getReferralTemplates() {
    try {
      const query = `
        SELECT *
        FROM referral_templates
        ORDER BY created_at DESC
      `;

      const result = await database.query(query);
      return result.rows.map((row) => ({
        id: row.id,
        templateName: row.template_name,
        templateBody: row.template_body,
        etiquetteGuidance: row.etiquette_guidance,
        timingGuidance: row.timing_guidance,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error("❌ Error getting referral templates:", error);
      throw error;
    }
  }

  // Create referral template with AI
  async createReferralTemplateWithAI(options = {}) {
    const {
      templateName,
      industry,
      relationshipType,
      tone = "professional",
    } = options;

    try {
      if (!this.openai) {
        throw new Error("OpenAI API key not configured");
      }

      const prompt = `Create a professional referral request template for networking. The template should:

1. Be appropriate for requesting a referral from a professional contact
2. Include placeholders like [Contact Name], [Your Name], [Company Name], [Job Title], [Job Company]
3. Be ${tone} in tone
4. Follow professional networking etiquette
5. Be concise but warm
${industry ? `6. Be tailored for the ${industry} industry` : ""}
${relationshipType ? `7. Be appropriate for a ${relationshipType} relationship` : ""}

Provide the response as JSON with the following structure:
{
  "templateBody": "The full template message text with placeholders",
  "etiquetteGuidance": "Brief guidance on when and how to use this template appropriately",
  "timingGuidance": "Guidance on optimal timing for sending referral requests"
}

Make the template professional, personalized, and respectful of the contact's time.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert in professional networking and referral request etiquette. Create templates that are professional, respectful, and effective.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || "";
      
      // Parse JSON from response
      let parsedContent;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        // Fallback if JSON parsing fails
        parsedContent = {
          templateBody: content,
          etiquetteGuidance: "Send referral requests when you have a strong relationship with the contact and the job is a good fit for your background.",
          timingGuidance: "Request referrals 1-2 weeks before application deadlines, or when you're actively applying. Avoid busy periods like holidays.",
        };
      }

      // Create template in database
      const templateId = uuidv4();
      const query = `
        INSERT INTO referral_templates (
          id, template_name, template_body, etiquette_guidance, timing_guidance
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const result = await database.query(query, [
        templateId,
        templateName || "AI-Generated Referral Template",
        parsedContent.templateBody || content,
        parsedContent.etiquetteGuidance || null,
        parsedContent.timingGuidance || null,
      ]);

      return {
        id: result.rows[0].id,
        templateName: result.rows[0].template_name,
        templateBody: result.rows[0].template_body,
        etiquetteGuidance: result.rows[0].etiquette_guidance,
        timingGuidance: result.rows[0].timing_guidance,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      console.error("❌ Error creating referral template with AI:", error);
      throw error;
    }
  }

  // Create referral template manually
  async createReferralTemplate(templateData) {
    const {
      templateName,
      templateBody,
      etiquetteGuidance,
      timingGuidance,
    } = templateData;

    try {
      const templateId = uuidv4();
      const query = `
        INSERT INTO referral_templates (
          id, template_name, template_body, etiquette_guidance, timing_guidance
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const result = await database.query(query, [
        templateId,
        templateName || null,
        templateBody || null,
        etiquetteGuidance || null,
        timingGuidance || null,
      ]);

      return {
        id: result.rows[0].id,
        templateName: result.rows[0].template_name,
        templateBody: result.rows[0].template_body,
        etiquetteGuidance: result.rows[0].etiquette_guidance,
        timingGuidance: result.rows[0].timing_guidance,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      console.error("❌ Error creating referral template:", error);
      throw error;
    }
  }

}

export default new ReferralRequestService();

