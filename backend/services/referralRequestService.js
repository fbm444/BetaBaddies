import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import database from "./database.js";
import professionalContactService from "./professionalContactService.js";
import jobOpportunityService from "./jobOpportunityService.js";
import profileService from "./profileService.js";
import skillService from "./skillService.js";
import projectService from "./projectService.js";

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
        draftReferralLetter: row.draft_referral_letter,
      }));
    } catch (error) {
      console.error("❌ Error getting referral requests:", error);
      throw error;
    }
  }

  // Get referral request by ID
  async getReferralRequestById(referralId, userId = null) {
    try {
      let query = `
        SELECT rr.*, 
               pc.first_name as contact_first_name,
               pc.last_name as contact_last_name,
               pc.email as contact_email,
               pc.company as contact_company,
               jo.title as job_title,
               jo.company as job_company,
               jo.location as job_location,
               u.email as requester_email,
               p.first_name as requester_first_name,
               p.last_name as requester_last_name
        FROM referral_requests rr
        LEFT JOIN professional_contacts pc ON rr.contact_id = pc.id
        LEFT JOIN job_opportunities jo ON rr.job_id = jo.id
        LEFT JOIN users u ON rr.user_id = u.u_id
        LEFT JOIN profiles p ON u.u_id = p.user_id
        WHERE rr.id = $1
      `;
      const params = [referralId];

      // Only filter by userId if provided
      if (userId) {
        query += ` AND rr.user_id = $2`;
        params.push(userId);
      }

      const result = await database.query(query, params);

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
        draftReferralLetter: row.draft_referral_letter,
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
        jobLocation: row.job_location,
        requesterName: `${row.requester_first_name || ""} ${row.requester_last_name || ""}`.trim() || row.requester_email || null,
        requesterEmail: row.requester_email,
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
        draftReferralLetter: row.draft_referral_letter,
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

  // Get referral requests where the current user is the contact (they need to write a referral)
  async getReferralRequestsToWrite(userEmail) {
    try {
      const query = `
        SELECT rr.*, 
               pc.first_name as contact_first_name,
               pc.last_name as contact_last_name,
               pc.email as contact_email,
               pc.company as contact_company,
               jo.title as job_title,
               jo.company as job_company,
               jo.location as job_location,
               u.email as requester_email,
               p.first_name as requester_first_name,
               p.last_name as requester_last_name
        FROM referral_requests rr
        INNER JOIN professional_contacts pc ON rr.contact_id = pc.id
        LEFT JOIN job_opportunities jo ON rr.job_id = jo.id
        LEFT JOIN users u ON rr.user_id = u.u_id
        LEFT JOIN profiles p ON u.u_id = p.user_id
        WHERE LOWER(pc.email) = LOWER($1)
          AND rr.sent_at IS NOT NULL
          AND (rr.request_status IS NULL OR rr.request_status != 'received')
          AND rr.response_content IS NULL
        ORDER BY rr.sent_at DESC
      `;

      const result = await database.query(query, [userEmail]);
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
        contactName: `${row.contact_first_name || ""} ${row.contact_last_name || ""}`.trim() || "Contact",
        contactEmail: row.contact_email,
        contactCompany: row.contact_company,
        jobTitle: row.job_title,
        jobCompany: row.job_company,
        jobLocation: row.job_location,
        requesterName: `${row.requester_first_name || ""} ${row.requester_last_name || ""}`.trim() || row.requester_email || "Unknown",
        requesterEmail: row.requester_email,
        draftReferralLetter: row.draft_referral_letter,
      }));
    } catch (error) {
      console.error("❌ Error getting referral requests to write:", error);
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

  // Get default referral REQUEST templates (for asking FOR referrals - used in "Ask for Referrals" tab)
  getDefaultRequestTemplates() {
    return [
      {
        id: "default-request-warm-professional",
        templateName: "Warm Professional Request",
        tone: "warm professional",
        length: "standard",
        templateBody: `Hi [Contact Name],

I hope this message finds you well. I'm reaching out because I'm currently exploring new opportunities and came across a [Job Title] position at [Company Name] that aligns perfectly with my background and career goals.

I would be incredibly grateful if you would be willing to provide a referral or recommendation for this role. Based on our [relationship context], I believe you could speak to my [relevant skills/experiences].

If you're open to helping, I can provide more details about the position and my qualifications. I completely understand if this isn't possible, and I appreciate you considering it.

Thank you for your time and consideration.

Best regards,
[Your Name]`,
        etiquetteGuidance: "Send when you have a strong professional relationship. Include context about how you know them.",
        timingGuidance: "Request referrals 1-2 weeks before application deadlines.",
      },
      {
        id: "default-request-formal",
        templateName: "Formal Request",
        tone: "formal respectful",
        length: "standard",
        templateBody: `Dear [Contact Name],

I am writing to respectfully request your assistance with a professional referral opportunity. I have identified a [Job Title] position at [Company Name] that I believe aligns with my career objectives and professional background.

Given our professional relationship and your understanding of my work in [relevant field/context], I would greatly value your consideration in providing a referral or recommendation.

I would be happy to provide additional information about the role and my qualifications should you require it. Please know that I completely understand if this is not possible at this time.

I appreciate your time and consideration.

Sincerely,
[Your Name]`,
        etiquetteGuidance: "Best for formal relationships or when reaching out to senior professionals. Maintain professional distance.",
        timingGuidance: "Send during business hours, avoiding holidays and busy periods.",
      },
      {
        id: "default-request-casual",
        templateName: "Friendly & Casual Request",
        tone: "friendly casual",
        length: "brief",
        templateBody: `Hi [Contact Name],

Hope you're doing well! I'm reaching out because I found a [Job Title] role at [Company Name] that looks like a great fit, and I was wondering if you'd be open to providing a referral.

Given our [relationship context], I thought you might be a good person to ask. If you're comfortable with it, that would be amazing! If not, no worries at all.

Let me know if you'd like any more details about the position or my background.

Thanks so much!
[Your Name]`,
        etiquetteGuidance: "Best for close professional relationships or when you've worked together recently.",
        timingGuidance: "Can be sent at any reasonable time. More flexible with casual contacts.",
      },
      {
        id: "default-request-enthusiastic",
        templateName: "Enthusiastic Request",
        tone: "enthusiastic",
        length: "standard",
        templateBody: `Hi [Contact Name],

I hope you're doing fantastic! I'm really excited to share that I've found an incredible opportunity - a [Job Title] position at [Company Name] that I'm very passionate about pursuing.

Given our great working relationship and the way we've [specific collaboration context], I would be absolutely thrilled if you'd be willing to provide a referral. I believe your endorsement would be incredibly valuable, and I'm genuinely excited about the potential of this role.

I'm happy to share more details about why I'm so excited about this opportunity and how it aligns with my career goals. Your support would mean the world to me!

Thanks so much for considering this, and I'd love to catch up soon regardless!

Best,
[Your Name]`,
        etiquetteGuidance: "Use when you have a strong, positive relationship and the opportunity genuinely excites you.",
        timingGuidance: "Best sent when you're genuinely enthusiastic - your energy will come through.",
      },
    ];
  }

  // Get default referral RECOMMENDATION templates (for writing referrals FOR others - explaining why someone is a great fit)
  getDefaultRecommendationTemplates() {
    return [
      {
        id: "default-warm-professional",
        templateName: "Warm Professional",
        tone: "warm professional",
        length: "standard",
        templateBody: `Dear Hiring Manager,

I am writing to enthusiastically recommend [Candidate Name] for the [Job Title] position at [Company Name]. I have had the pleasure of [relationship context - e.g., working with them, supervising them, collaborating with them] and can confidently speak to their exceptional qualifications and character.

[Candidate Name] is an outstanding professional with [specific skills/qualities relevant to the role]. During our time together, I have been consistently impressed by their [specific achievements or examples]. Their ability to [specific skill or accomplishment] makes them exceptionally well-suited for this position.

What sets [Candidate Name] apart is not just their technical expertise, but their [personal qualities - e.g., work ethic, communication skills, leadership abilities]. They consistently [specific example of positive behavior or impact].

I believe [Candidate Name] would be an excellent addition to your team and would contribute significantly to [Company Name]'s continued success. They have my highest recommendation, and I would be happy to provide any additional information if needed.

Best regards,
[Your Name]
[Your Title]
[Your Company/Organization]`,
        etiquetteGuidance: "Use for professional relationships where you can speak authentically about the candidate's abilities and character.",
        timingGuidance: "Submit referral letters promptly when requested, ideally within 1-2 weeks of the request.",
      },
      {
        id: "default-formal-respectful",
        templateName: "Formal & Respectful",
        tone: "formal respectful",
        length: "standard",
        templateBody: `Dear Hiring Committee,

I am pleased to provide this letter of recommendation for [Candidate Name] in support of their application for the [Job Title] position at [Company Name].

I have had the opportunity to [relationship context - e.g., serve as [Candidate Name]'s supervisor, collaborate with them, observe their work] and can attest to their professional capabilities and suitability for this role.

Throughout our professional association, [Candidate Name] has demonstrated [specific strengths relevant to the position]. Their work in [specific area] has been consistently of high quality, and they have shown particular strength in [specific skill or competency].

[Candidate Name] exhibits strong [personal/professional qualities] and maintains the highest standards of professionalism. Their approach to [specific work area] reflects both competence and integrity.

I recommend [Candidate Name] without reservation for this position. They possess the qualifications, experience, and character necessary to excel in this role and make meaningful contributions to your organization.

Sincerely,
[Your Name]
[Your Title]
[Your Company/Organization]
[Contact Information]`,
        etiquetteGuidance: "Use for formal, professional settings or when recommending to senior-level positions. Maintain professional tone and structure.",
        timingGuidance: "Submit in a timely manner, ensuring all details are accurate and well-considered.",
      },
      {
        id: "default-friendly-casual",
        templateName: "Friendly & Casual",
        tone: "friendly casual",
        length: "brief",
        templateBody: `Hi [Hiring Manager/Recipient],

I wanted to reach out and recommend [Candidate Name] for the [Job Title] role you have open. I've [relationship context - e.g., worked with them, known them, collaborated with them] and think they'd be a great fit!

[Candidate Name] is really strong in [specific skills/areas]. When we worked together on [specific project/context], they showed [specific positive trait or accomplishment]. What I appreciate most is their [specific quality].

I think [Candidate Name] would bring a lot to this role and to [Company Name]. They're someone you can count on, and I know they'd hit the ground running.

Happy to chat more if you have questions!

Best,
[Your Name]`,
        etiquetteGuidance: "Best for informal work environments or when you have a friendly, close professional relationship with the candidate.",
        timingGuidance: "Can be submitted quickly and informally when appropriate for the context.",
      },
      {
        id: "default-enthusiastic",
        templateName: "Enthusiastic & Upbeat",
        tone: "enthusiastic",
        length: "standard",
        templateBody: `Dear Hiring Team,

I am absolutely thrilled to recommend [Candidate Name] for the [Job Title] position at [Company Name]! Having [relationship context], I can say with complete confidence that [Candidate Name] is not just qualified for this role—they're exceptional.

What makes [Candidate Name] stand out is their incredible [specific strengths]. I've had the pleasure of seeing them [specific example of achievement or positive impact], and it was truly impressive. Their ability to [specific skill] combined with their [personal quality] makes them an ideal candidate.

During our time working together, [Candidate Name] consistently [specific positive behavior or contribution]. They're the kind of person who [specific example that shows character/ability]. I've been so impressed by how they [specific accomplishment or quality].

I believe [Candidate Name] would be a fantastic addition to your team. They have the skills, the drive, and the personality to excel in this role and contribute meaningfully to [Company Name]'s mission.

I wholeheartedly recommend [Candidate Name] and am excited about the possibility of them joining your organization!

Best regards,
[Your Name]
[Your Title]`,
        etiquetteGuidance: "Use when you're genuinely enthusiastic about the candidate and have a positive, energetic relationship with them.",
        timingGuidance: "Submit with genuine enthusiasm when you truly believe in the candidate's fit for the role.",
      },
    ];
  }

  // Get referral REQUEST templates (for asking FOR referrals - used in "Ask for Referrals" tab)
  async getReferralTemplates() {
    try {
      // Get default request templates
      const defaultTemplates = this.getDefaultRequestTemplates();

      // Get user-created templates from database (request templates)
      const query = `
        SELECT *
        FROM referral_templates
        WHERE template_type IS NULL OR template_type = 'request'
        ORDER BY created_at DESC
      `;

      const result = await database.query(query);
      const userTemplates = result.rows.map((row) => ({
        id: row.id,
        templateName: row.template_name,
        templateBody: row.template_body,
        etiquetteGuidance: row.etiquette_guidance,
        timingGuidance: row.timing_guidance,
        tone: row.tone,
        length: row.length,
        createdAt: row.created_at,
      }));

      // Combine default templates (first) with user-created templates
      return [...defaultTemplates, ...userTemplates];
    } catch (error) {
      console.error("❌ Error getting referral templates:", error);
      // Return just default templates on error
      return this.getDefaultRequestTemplates();
    }
  }

  // Get referral RECOMMENDATION templates (for writing referrals FOR others - used in "Write Referrals" tab)
  async getReferralRecommendationTemplates() {
    try {
      // Get default recommendation templates
      const defaultTemplates = this.getDefaultRecommendationTemplates();

      // Get user-created recommendation templates from database
      const query = `
        SELECT *
        FROM referral_templates
        WHERE template_type = 'recommendation'
        ORDER BY created_at DESC
      `;

      const result = await database.query(query);
      const userTemplates = result.rows.map((row) => ({
        id: row.id,
        templateName: row.template_name,
        templateBody: row.template_body,
        etiquetteGuidance: row.etiquette_guidance,
        timingGuidance: row.timing_guidance,
        tone: row.tone,
        length: row.length,
        createdAt: row.created_at,
      }));

      // Combine default templates (first) with user-created templates
      return [...defaultTemplates, ...userTemplates];
    } catch (error) {
      console.error("❌ Error getting referral recommendation templates:", error);
      // Return just default templates on error
      return this.getDefaultRecommendationTemplates();
    }
  }

  // Create referral recommendation template with AI (generic, not job-specific)
  async createReferralRecommendationTemplateWithAI(options = {}) {
    const {
      templateName,
      tone = "warm professional",
      length = "standard",
    } = options;

    try {
      if (!this.openai) {
        throw new Error("OpenAI API key not configured");
      }

      const lengthGuidance = length === "brief" 
        ? "Keep it very concise (under 100 words)" 
        : length === "detailed" 
        ? "Be comprehensive and detailed (200-300 words)" 
        : "Use standard length (150-200 words)";

      const prompt = `Create a professional referral/recommendation letter template. This is a generic template for writing recommendation letters. The template should:

1. Be a recommendation letter explaining why a candidate is a great fit for a role
2. Include placeholders like [Candidate Name], [Your Name], [Company Name], [Job Title], [Job Company], [Hiring Manager/Recipient], [relationship context]
3. Be ${tone} in tone
4. Explain the candidate's qualifications, skills, and character
5. ${lengthGuidance}
6. Be warm and professional, highlighting why the candidate would excel in the role
7. Include placeholders for specific examples or achievements the recommender could reference
8. Be generic enough to work for any job role - do NOT tailor it to a specific job or company

Provide the response as JSON with the following structure:
{
  "templateBody": "The full recommendation letter template text with placeholders",
  "etiquetteGuidance": "Brief guidance on when and how to use this recommendation letter template appropriately",
  "timingGuidance": "Guidance on optimal timing for submitting referral letters"
}

Make the template professional, authentic, and generic so it can be customized for any role when used.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert in writing professional recommendation and referral letters. Create generic templates that can be customized for any role, focusing on highlighting a candidate's qualifications, skills, and character.",
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
          etiquetteGuidance:
            "Use this template when writing recommendation letters for candidates. Customize it with specific details about the candidate and the role.",
          timingGuidance:
            "Submit referral letters promptly when requested, ideally within 1-2 weeks of the request.",
        };
      }

      // Create template in database with template_type = 'recommendation'
      const templateId = uuidv4();
      const query = `
        INSERT INTO referral_templates (
          id, template_name, template_body, etiquette_guidance, timing_guidance, tone, length, template_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await database.query(query, [
        templateId,
        templateName || "AI-Generated Referral Recommendation Template",
        parsedContent.templateBody || content,
        parsedContent.etiquetteGuidance || null,
        parsedContent.timingGuidance || null,
        tone || null,
        length || null,
        'recommendation',
      ]);

      return {
        id: result.rows[0].id,
        templateName: result.rows[0].template_name,
        templateBody: result.rows[0].template_body,
        etiquetteGuidance: result.rows[0].etiquette_guidance,
        timingGuidance: result.rows[0].timing_guidance,
        tone: result.rows[0].tone,
        length: result.rows[0].length,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      console.error("❌ Error creating referral recommendation template with AI:", error);
      throw error;
    }
  }

  // Get template preview by ID (works for both request and recommendation templates)
  async getTemplatePreview(templateId) {
    try {
      // Check if it's a default template first
      const defaultRequestTemplates = this.getDefaultRequestTemplates();
      const defaultRecommendationTemplates = this.getDefaultRecommendationTemplates();
      
      const defaultTemplate = [...defaultRequestTemplates, ...defaultRecommendationTemplates].find(
        (t) => t.id === templateId
      );
      
      if (defaultTemplate) {
        return {
          templateBody: defaultTemplate.templateBody,
          templateName: defaultTemplate.templateName,
          etiquetteGuidance: defaultTemplate.etiquetteGuidance,
          timingGuidance: defaultTemplate.timingGuidance,
          tone: defaultTemplate.tone,
          length: defaultTemplate.length,
        };
      }

      // If not a default template, fetch from database (works for both request and recommendation types)
      const query = `
        SELECT *
        FROM referral_templates
        WHERE id = $1
      `;

      const result = await database.query(query, [templateId]);

      if (result.rows.length === 0) {
        throw new Error("Template not found");
      }

      const row = result.rows[0];
      return {
        templateBody: row.template_body,
        templateName: row.template_name,
        etiquetteGuidance: row.etiquette_guidance,
        timingGuidance: row.timing_guidance,
        tone: row.tone,
        length: row.length,
      };
    } catch (error) {
      console.error("❌ Error getting template preview:", error);
      throw error;
    }
  }

  // Create referral request template with AI (for asking FOR referrals - can be tailored to a job)
  async createReferralRequestTemplateWithAI(options = {}) {
    const {
      templateName,
      tone = "warm professional",
      length = "standard",
      jobId,
      jobTitle,
      jobCompany,
      jobLocation,
      jobIndustry,
    } = options;

    try {
      if (!this.openai) {
        throw new Error("OpenAI API key not configured");
      }

      const lengthGuidance = length === "brief" 
        ? "Keep it very concise (under 100 words)" 
        : length === "detailed" 
        ? "Be comprehensive and detailed (200-300 words)" 
        : "Use standard length (150-200 words)";

      const jobContext = (jobTitle || jobCompany) ? `
${jobTitle ? `- Target Job Title: ${jobTitle}` : ""}
${jobCompany ? `- Target Company: ${jobCompany}` : ""}
${jobLocation ? `- Job Location: ${jobLocation}` : ""}
${jobIndustry ? `- Industry: ${jobIndustry}` : ""}

Use this job information to make the template more relevant and specific, but still include placeholders like [Job Title] and [Company Name] so it can be reused.` : `
The template should be generic enough to work for any job role, but use placeholders that make it easy to customize.`;

      const prompt = `Create a professional referral REQUEST template. This is a template for asking someone to refer you for a job. The template should:

1. Be a request email asking someone to provide a referral or recommendation for you
2. Include placeholders like [Contact Name], [Your Name], [Company Name], [Job Title], [Job Company], [relationship context]
3. Be ${tone} in tone
4. Explain why you're asking them and why you're interested in the role
5. ${lengthGuidance}
6. Be warm and professional, respectful of their time
${jobTitle || jobCompany ? `7. Be tailored to reflect the nature of roles like "${jobTitle || "this position"}"${jobCompany ? ` at companies like "${jobCompany}"` : ""}, but still use placeholders for flexibility` : `7. Be generic enough to work for any job role, but use placeholders for easy customization`}
${jobContext}

Provide the response as JSON with the following structure:
{
  "templateBody": "The full request template text with placeholders",
  "etiquetteGuidance": "Brief guidance on when and how to use this request template appropriately",
  "timingGuidance": "Guidance on optimal timing for sending referral requests"
}

Make the template professional, respectful, and include placeholders so it can be customized for different roles when used.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert in professional networking and referral request etiquette. Create generic templates that can be customized for any role when requesting referrals.",
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
          etiquetteGuidance:
            "Send referral requests when you have a strong relationship with the contact and the job is a good fit for your background.",
          timingGuidance:
            "Request referrals 1-2 weeks before application deadlines, or when you're actively applying. Avoid busy periods like holidays.",
        };
      }

      // Create template in database with template_type = 'request'
      const templateId = uuidv4();
      const query = `
        INSERT INTO referral_templates (
          id, template_name, template_body, etiquette_guidance, timing_guidance, tone, length, template_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await database.query(query, [
        templateId,
        templateName || "AI-Generated Referral Request Template",
        parsedContent.templateBody || content,
        parsedContent.etiquetteGuidance || null,
        parsedContent.timingGuidance || null,
        tone || null,
        length || null,
        'request',
      ]);

      return {
        id: result.rows[0].id,
        templateName: result.rows[0].template_name,
        templateBody: result.rows[0].template_body,
        etiquetteGuidance: result.rows[0].etiquette_guidance,
        timingGuidance: result.rows[0].timing_guidance,
        tone: result.rows[0].tone,
        length: result.rows[0].length,
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
      tone,
      length,
      templateType,
    } = templateData;

    try {
      const templateId = uuidv4();
      const query = `
        INSERT INTO referral_templates (
          id, template_name, template_body, etiquette_guidance, timing_guidance, tone, length, template_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await database.query(query, [
        templateId,
        templateName || null,
        templateBody || null,
        etiquetteGuidance || null,
        timingGuidance || null,
        tone || null,
        length || null,
        templateType || 'request', // Default to 'request' for backward compatibility
      ]);

      return {
        id: result.rows[0].id,
        templateName: result.rows[0].template_name,
        templateBody: result.rows[0].template_body,
        etiquetteGuidance: result.rows[0].etiquette_guidance,
        timingGuidance: result.rows[0].timing_guidance,
        tone: result.rows[0].tone,
        length: result.rows[0].length,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      console.error("❌ Error creating referral template:", error);
      throw error;
    }
  }

  // Delete referral template
  async deleteReferralTemplate(templateId) {
    try {
      const query = `
        DELETE FROM referral_templates
        WHERE id = $1
        RETURNING *
      `;

      const result = await database.query(query, [templateId]);
      if (result.rows.length === 0) {
        const error = new Error("Referral template not found");
        error.status = 404;
        throw error;
      }

      return {
        id: result.rows[0].id,
        templateName: result.rows[0].template_name,
      };
    } catch (error) {
      console.error("❌ Error deleting referral template:", error);
      throw error;
    }
  }

  async generatePersonalizedMessage({
    userId,
    contactId,
    jobId,
    templateBody,
    templateId,
    tone = "warm professional",
  }) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    let resolvedTemplateBody = templateBody || null;
    let resolvedTone = tone;

    if ((!resolvedTemplateBody || !resolvedTone || resolvedTone === "warm professional") && templateId) {
      const templateResult = await database.query(
        `
          SELECT template_body, template_name
          FROM referral_templates
          WHERE id = $1
        `,
        [templateId]
      );

      if (templateResult.rows.length > 0) {
        resolvedTemplateBody = resolvedTemplateBody || templateResult.rows[0].template_body;
        if (!tone || tone === "warm professional") {
          const toneMatch =
            templateResult.rows[0].template_name?.match(/Tone:\s*([^•]+)/i) ||
            templateResult.rows[0].template_name?.match(/\((?:Tone|tone):\s*([^)]+)\)/);
          if (toneMatch) {
            resolvedTone = toneMatch[1].trim();
          }
        }
      }
    }

    const [contact, job, profile, skills, projects] = await Promise.all([
      professionalContactService.getContactById(contactId, userId),
      jobOpportunityService.getJobOpportunityById(jobId, userId),
      profileService.getProfileByUserId(userId),
      skillService.getSkillsByUserId(userId),
      projectService.getProjectsByUserId(userId, {}, { sortBy: "start_date", sortOrder: "desc" }),
    ]);

    if (!contact) {
      const error = new Error("Contact not found");
      error.status = 404;
      throw error;
    }

    if (!job) {
      const error = new Error("Job opportunity not found");
      error.status = 404;
      throw error;
    }

    const requesterName =
      (profile &&
        (`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.fullName)) ||
      "A colleague";
    const requesterTitle = profile?.job_title || profile?.jobTitle || null;
    const highlightSkill = skills?.[0]?.skillName;
    const highlightProject = projects?.[0]?.name;

    const templateGuide = resolvedTemplateBody
      ? `Use the following template as inspiration, but output a fully personalized, ready-to-send message with no placeholders:\n"""${resolvedTemplateBody}""" \n`
      : "";

    const userPrompt = `
Write a concise referral request email that is ready to send. Do not include placeholders or bracketed tokens.

Contact:
- Name: ${[contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || contact.email || "the contact"}
- Company: ${contact.company || job.company || "Not specified"}
- Relationship Context: ${contact.relationshipContext || contact.relationshipType || "Not specified"}

Requester:
- Name: ${requesterName}
- Current Title: ${requesterTitle || "Not specified"}
- Highlighted Skill: ${highlightSkill || "Not provided"}
- Highlighted Project: ${highlightProject || "Not provided"}

Job Opportunity:
- Role: ${job.title || "Not specified"}
- Company: ${job.company || "Not specified"}
- Location: ${job.location || "Not specified"}
- Description / Notes: ${job.description || job.notes || "Not provided"}

Instructions:
- Tone: ${resolvedTone}
- Length: under 180 words
- Reference the highlighted skill or project naturally.
- Offer to share a resume or additional details.
- Close with gratitude.

${templateGuide}
Return only the email body text.
    `.trim();

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful career coach who writes polished, friendly referral request emails on behalf of job seekers.",
        },
        { role: "user", content: userPrompt },
      ],
    });

    const message = response.choices[0]?.message?.content?.trim();
    if (!message) {
      throw new Error("Failed to generate personalized referral message");
    }

    return message;
  }

  // Generate a referral letter (recommendation letter) for writing referrals
  async generateReferralLetter({
    currentUserId,
    requesterUserId,
    requesterName,
    requesterEmail,
    jobId,
    tone = "warm professional",
  }) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    // Get job opportunity details
    const job = await jobOpportunityService.getJobOpportunityById(jobId, requesterUserId);
    if (!job) {
      throw new Error("Job opportunity not found");
    }

    // Get requester's profile and skills
    const [requesterProfile, requesterSkills, requesterProjects] = await Promise.all([
      profileService.getProfileByUserId(requesterUserId).catch(() => null),
      skillService.getSkillsByUserId(requesterUserId).catch(() => []),
      projectService.getProjectsByUserId(requesterUserId, {}, { sortBy: "start_date", sortOrder: "desc" }).catch(() => []),
    ]);

    // Get current user's profile for the letter writer
    const writerProfile = await profileService.getProfileByUserId(currentUserId);
    const writerName = writerProfile
      ? `${writerProfile.first_name || ""} ${writerProfile.last_name || ""}`.trim() || writerProfile.fullName
      : "A colleague";
    const writerTitle = writerProfile?.job_title || writerProfile?.jobTitle || null;

    const requesterFullName = requesterName || "the candidate";
    const requesterTitle = requesterProfile?.job_title || requesterProfile?.jobTitle || null;
    const highlightSkill = requesterSkills?.[0]?.skillName;
    const highlightProject = requesterProjects?.[0]?.name;

    const userPrompt = `
Write a professional referral letter (recommendation letter) that is ready to send. This is a letter written by ${writerName}${writerTitle ? ` (${writerTitle})` : ""} recommending ${requesterFullName}${requesterTitle ? ` (${requesterTitle})` : ""} for a job position.

Candidate Information:
- Name: ${requesterFullName}
- Current Title: ${requesterTitle || "Not specified"}
- Highlighted Skill: ${highlightSkill || "Not provided"}
- Highlighted Project: ${highlightProject || "Not provided"}

Job Opportunity:
- Role: ${job.title || "Not specified"}
- Company: ${job.company || "Not specified"}
- Location: ${job.location || "Not specified"}
- Description / Notes: ${job.description || job.notes || "Not provided"}

Instructions:
- Tone: ${tone}
- Length: 200-300 words
- Write in first person as ${writerName}
- Include specific examples of working with ${requesterFullName}
- Highlight relevant skills and experiences that match the job
- Be genuine and professional
- Close with a strong recommendation

Return only the letter body text, ready to send.
    `.trim();

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are a professional career advisor who writes compelling, genuine referral letters (recommendation letters) on behalf of professionals recommending their colleagues.",
        },
        { role: "user", content: userPrompt },
      ],
    });

    const message = response.choices[0]?.message?.content?.trim();
    if (!message) {
      throw new Error("Failed to generate referral letter");
    }

    return message;
  }

  // Generate a customized referral letter from a template and referral request
  async generateCustomizedReferralLetter({
    templateId,
    referralRequestId,
    currentUserId,
  }) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    // Get the template (use recommendation templates for writing referrals)
    const templates = await this.getReferralRecommendationTemplates();
    const template = templates.find((t) => t.id === templateId);
    if (!template || !template.templateBody) {
      throw new Error("Template not found");
    }

    // Get the referral request
    const referralRequest = await this.getReferralRequestById(referralRequestId, null);
    if (!referralRequest) {
      throw new Error("Referral request not found");
    }

    // Get job details
    const job = await jobOpportunityService.getJobOpportunityById(
      referralRequest.jobId,
      referralRequest.userId
    );
    if (!job) {
      throw new Error("Job opportunity not found");
    }

    // Get writer's profile with full information
    const writerProfile = await profileService.getProfileByUserId(currentUserId);
    
    // Get writer's current job/company if available
    let currentJob = null;
    try {
      const currentJobQuery = `
        SELECT title, company, location
        FROM jobs
        WHERE user_id = $1 AND is_current = true
        ORDER BY start_date DESC
        LIMIT 1
      `;
      const currentJobResult = await database.query(currentJobQuery, [currentUserId]);
      if (currentJobResult.rows.length > 0) {
        currentJob = currentJobResult.rows[0];
      }
    } catch (error) {
      console.warn("Could not fetch current job for writer:", error.message);
    }

    const writerName = writerProfile
      ? `${writerProfile.first_name || ""} ${writerProfile.last_name || ""}`.trim() || writerProfile.fullName || ""
      : "";
    const writerTitle = currentJob?.title || writerProfile?.job_title || "";
    const writerCompany = currentJob?.company || "";
    const writerLocation = writerProfile
      ? [writerProfile.city, writerProfile.state].filter(Boolean).join(", ") || ""
      : "";
    const writerEmail = writerProfile?.email || "";
    const writerPhone = writerProfile?.phone || "";
    let contactInfo = "";
    if (writerEmail && writerPhone) {
      contactInfo = `${writerEmail} | ${writerPhone}`;
    } else if (writerEmail) {
      contactInfo = writerEmail;
    } else if (writerPhone) {
      contactInfo = writerPhone;
    }

    // Get requester's info from referral request
    const requesterFullName = referralRequest.requesterName || "the candidate";

    const profileContext = writerProfile ? `
Writer's Profile Information:
- Full Name: ${writerName || "Not provided"}
- Current Job Title: ${writerTitle || "Not provided"}
- Company/Organization: ${writerCompany || writerProfile?.industry || "Not provided"}
- Location: ${writerLocation || "Not provided"}
- Email: ${writerEmail || "Not provided"}
- Phone: ${writerPhone || "Not provided"}
${writerProfile?.bio ? `- Bio/Background: ${writerProfile.bio}` : ""}
` : `
Writer's Profile Information: Not available
`;

    const prompt = `You are customizing a referral letter (recommendation letter) template. Replace ALL placeholders with actual information from the writer's profile. DO NOT leave any placeholders like [Your Name], [Your Title], [Your Company/Organization], [Contact Information], etc. - replace them all with real values.

Template:
${template.templateBody}

${profileContext}
Context for the Referral:
- Contact/Recipient: ${referralRequest.contactName || "Hiring Manager"}
- Candidate (person requesting referral): ${requesterFullName}
- Job Title (position candidate is applying for): ${job.title || "Position"}
- Company (where candidate is applying): ${job.company || "Company"}
- Job Location: ${job.location || "Not specified"}
- Relationship context: ${referralRequest.relationshipImpact || "Professional relationship"}

Instructions:
1. Replace [Contact Name] or [Hiring Manager/Recipient] with: ${referralRequest.contactName || "Hiring Manager"}
2. Replace [Your Name] with: ${writerName || "the writer's name"}
3. Replace [Candidate Name] with: ${requesterFullName}
4. Replace [Your Title] with: ${writerTitle || "the writer's current job title"}
5. Replace [Your Company/Organization] with: ${writerCompany || writerProfile?.industry || "the writer's company/organization"}
6. Replace [Contact Information] with: ${contactInfo || writerEmail || writerPhone || "contact information"}
7. Replace [Job Title] with: ${job.title || "the position"}
8. Replace [Job Company] or [Company Name] with: ${job.company || "the company"}
9. Replace [relationship context] with specific details about: ${referralRequest.relationshipImpact || "the professional relationship"}
10. Maintain the ${template.tone || "professional"} tone
11. Keep the ${template.length || "standard"} length
12. Make it specific and personalized based on the job, relationship, and writer's background
13. IMPORTANT: Do NOT include any placeholders or bracketed tokens like [Your Name], [Your Title], etc. - use actual values from the profile information provided above

Return only the fully customized letter text with all placeholders replaced, ready to use.`;

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "You are an expert at customizing professional referral letters with specific details.",
        },
        { role: "user", content: prompt },
      ],
    });

    const customizedLetter = response.choices[0]?.message?.content?.trim();
    if (!customizedLetter) {
      throw new Error("Failed to generate customized referral letter");
    }

    return customizedLetter;
  }

  // Submit referral letter (update referral request with letter content and send email)
  async submitReferralLetter(referralRequestId, letterContent, currentUserId) {
    try {
      // Get the referral request first to check for draft
      const referralRequest = await this.getReferralRequestById(referralRequestId, null);
      if (!referralRequest) {
        throw new Error("Referral request not found");
      }

      // Use draft letter if no content provided, otherwise use provided content
      const finalContent = letterContent || referralRequest.draftReferralLetter;
      if (!finalContent) {
        throw new Error("No referral letter content provided");
      }

      // Update the referral request with the letter content, mark as received, and remove follow-up flag
      const query = `
        UPDATE referral_requests
        SET response_content = $1,
            draft_referral_letter = NULL,
            response_received_at = CURRENT_TIMESTAMP,
            request_status = 'received',
            followup_required = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await database.query(query, [finalContent, referralRequestId]);
      
      if (result.rows.length === 0) {
        throw new Error("Failed to update referral request");
      }

      return {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        contactId: result.rows[0].contact_id,
        jobId: result.rows[0].job_id,
        responseContent: result.rows[0].response_content,
        responseReceivedAt: result.rows[0].response_received_at,
        requestStatus: result.rows[0].request_status,
        ...referralRequest, // Include all the joined fields
      };
    } catch (error) {
      console.error("❌ Error submitting referral letter:", error);
      throw error;
    }
  }

  // Save draft referral letter (for writing referrals)
  async saveDraftReferralLetter(referralRequestId, letterContent) {
    try {
      const query = `
        UPDATE referral_requests
        SET draft_referral_letter = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await database.query(query, [letterContent, referralRequestId]);
      
      if (result.rows.length === 0) {
        throw new Error("Referral request not found");
      }

      return {
        id: result.rows[0].id,
        draftReferralLetter: result.rows[0].draft_referral_letter,
      };
    } catch (error) {
      console.error("❌ Error saving draft referral letter:", error);
      throw error;
    }
  }
}

export default new ReferralRequestService();

