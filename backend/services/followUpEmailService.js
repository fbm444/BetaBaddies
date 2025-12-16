import database from "./database.js";
import OpenAI from "openai";

class FollowUpEmailService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL;
    this.useAI = process.env.FOLLOW_UP_EMAIL_USE_AI === "true";

    if (this.openaiApiKey && this.useAI) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
        ...(this.openaiApiUrl && { baseURL: this.openaiApiUrl }),
      });
    } else {
      this.openai = null;
    }
  }

  /**
   * Get email template from database
   */
  async getEmailTemplate(templateType) {
    try {
      const query = `
        SELECT * FROM email_templates
        WHERE template_type = $1 AND is_system_template = true
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await database.query(query, [templateType]);

      if (result.rows.length === 0) {
        // Fallback to generic template
        const fallbackResult = await database.query(
          "SELECT * FROM email_templates WHERE template_type = 'follow_up_custom' AND is_system_template = true LIMIT 1"
        );
        return fallbackResult.rows[0] || null;
      }

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error getting email template:", error);
      return null;
    }
  }

  /**
   * Generate email template variables from job opportunity
   */
  async getEmailVariables(jobOpportunity, userProfile, eventDate, daysSince) {
    try {
      // Get recruiter name (prefer hiring manager, then recruiter)
      const recruiterName = jobOpportunity.hiringManagerName || 
                           jobOpportunity.recruiterName || 
                           "Hiring Manager";

      // Format dates
      const formatDate = (date) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      };

      return {
        jobTitle: jobOpportunity.title || "the position",
        companyName: jobOpportunity.company || "the company",
        recruiterName: recruiterName,
        applicationDate: formatDate(jobOpportunity.applicationHistory?.[0]?.date || jobOpportunity.createdAt),
        interviewDate: formatDate(eventDate),
        daysSince: daysSince || 0,
        userName: userProfile?.fullName || userProfile?.firstName || "Candidate",
        userEmail: userProfile?.email || ""
      };
    } catch (error) {
      console.error("❌ Error getting email variables:", error);
      return {};
    }
  }

  /**
   * Replace template variables in text
   */
  replaceTemplateVariables(text, variables) {
    if (!text || !variables) return text;

    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      result = result.replace(regex, value || "");
    }

    return result;
  }

  /**
   * Generate email using AI (if available) or template
   */
  async generateEmailWithAI(templateType, jobOpportunity, userProfile, eventDate, daysSince) {
    if (!this.openai) {
      return null; // Fallback to template
    }

    try {
      const variables = await this.getEmailVariables(jobOpportunity, userProfile, eventDate, daysSince);

      const systemPrompt = `You are a professional career coach helping write follow-up emails. 
      Write concise, professional, and warm emails that are appropriate for the context.
      Keep emails brief (2-3 short paragraphs) and avoid being pushy.`;

      const userPrompt = `Write a follow-up email for:
- Job: ${variables.jobTitle} at ${variables.companyName}
- Recipient: ${variables.recruiterName}
- Context: ${this.getContextForTemplateType(templateType)}
- Days since event: ${daysSince}
- Tone: Professional but friendly, not pushy

Include:
- Appropriate greeting
- Brief context/reference to previous interaction
- Expression of continued interest
- Offer to provide additional information
- Professional closing

Return JSON with "subject" and "body" fields.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const raw = response.choices[0]?.message?.content || "";
      let parsed = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        // Try to extract JSON from markdown code blocks
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        }
      }

      if (parsed && parsed.subject && parsed.body) {
        return {
          subject: parsed.subject,
          body: parsed.body
        };
      }

      return null;
    } catch (error) {
      console.error("❌ Error generating email with AI:", error);
      return null; // Fallback to template
    }
  }

  /**
   * Get context description for template type
   */
  getContextForTemplateType(templateType) {
    const contexts = {
      'follow_up_application': 'Following up on application submission',
      'follow_up_interview': 'Confirming upcoming interview',
      'follow_up_post_interview': 'Thank you note after interview',
      'follow_up_offer_response': 'Following up on job offer',
      'follow_up_custom': 'General follow-up'
    };
    return contexts[templateType] || 'General follow-up';
  }

  /**
   * Generate email template for a reminder
   */
  async generateEmailTemplate(reminderType, jobOpportunity, userProfile, eventDate, daysSince) {
    try {
      // Map reminder type to template type
      const templateTypeMap = {
        'application': 'follow_up_application',
        'interview': 'follow_up_interview',
        'post_interview': 'follow_up_post_interview',
        'offer_response': 'follow_up_offer_response',
        'custom': 'follow_up_custom'
      };

      const templateType = templateTypeMap[reminderType] || 'follow_up_custom';

      // Try AI generation first (if enabled)
      if (this.openai) {
        const aiEmail = await this.generateEmailWithAI(
          templateType,
          jobOpportunity,
          userProfile,
          eventDate,
          daysSince
        );

        if (aiEmail) {
          return {
            subject: aiEmail.subject,
            body: aiEmail.body,
            source: 'ai'
          };
        }
      }

      // Fallback to database template
      const template = await this.getEmailTemplate(templateType);
      if (!template) {
        throw new Error(`No template found for type: ${templateType}`);
      }

      const variables = await this.getEmailVariables(jobOpportunity, userProfile, eventDate, daysSince);

      const subject = this.replaceTemplateVariables(template.subject_template, variables);
      const body = this.replaceTemplateVariables(template.body_template, variables);

      return {
        subject: subject,
        body: body,
        source: 'template',
        templateId: template.id
      };
    } catch (error) {
      console.error("❌ Error generating email template:", error);
      // Return a basic fallback email
      return {
        subject: `Following up on ${jobOpportunity.title || "position"} at ${jobOpportunity.company || "company"}`,
        body: `Hi,\n\nI wanted to follow up regarding the ${jobOpportunity.title || "position"} at ${jobOpportunity.company || "company"}. I remain very interested in this opportunity.\n\nThank you for your time and consideration.\n\nBest regards`,
        source: 'fallback'
      };
    }
  }
}

export default new FollowUpEmailService();

