/**
 * Networking Service
 * Handles coffee chats, LinkedIn networking, message generation, and tracking
 */

import database from "./database.js";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";

class NetworkingService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openai = this.openaiApiKey
      ? new OpenAI({ apiKey: this.openaiApiKey })
      : null;
  }

  /**
   * Get recruiters from job opportunities with message tracking
   */
  async getRecruitersFromOpportunities(userId) {
    try {
      const query = `
        SELECT DISTINCT
          jo.recruiter_name as name,
          jo.recruiter_email as email,
          jo.recruiter_phone as phone,
          jo.company,
          COUNT(*) as opportunity_count,
          MAX(CASE WHEN cc.message_sent = true THEN 1 ELSE 0 END) as has_message_sent,
          MAX(CASE WHEN cc.response_received = true THEN 1 ELSE 0 END) as has_response_received,
          MAX(CASE WHEN cc.referral_provided = true THEN 1 ELSE 0 END) as has_referral_provided,
          MAX(cc.message_sent_at) as last_message_sent_at,
          MAX(cc.response_received_at) as last_response_received_at,
          COUNT(DISTINCT CASE WHEN cc.id IS NOT NULL THEN cc.id END) as coffee_chat_count
        FROM job_opportunities jo
        LEFT JOIN coffee_chats cc ON (
          cc.user_id = jo.user_id
          AND cc.contact_email = jo.recruiter_email
          AND (cc.contact_name ILIKE '%' || jo.recruiter_name || '%' OR jo.recruiter_name ILIKE '%' || cc.contact_name || '%')
        )
        WHERE jo.user_id = $1
          AND jo.recruiter_name IS NOT NULL
          AND jo.recruiter_name != ''
        GROUP BY jo.recruiter_name, jo.recruiter_email, jo.recruiter_phone, jo.company
        ORDER BY opportunity_count DESC, jo.recruiter_name
      `;

      const result = await database.query(query, [userId]);
      return result.rows.map((row) => ({
        name: row.name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        opportunityCount: parseInt(row.opportunity_count) || 0,
        messageSent: row.has_message_sent === 1 || row.has_message_sent === true,
        responseReceived: row.has_response_received === 1 || row.has_response_received === true,
        referralProvided: row.has_referral_provided === 1 || row.has_referral_provided === true,
        lastMessageSentAt: row.last_message_sent_at,
        lastResponseReceivedAt: row.last_response_received_at,
        coffeeChatCount: parseInt(row.coffee_chat_count) || 0,
      }));
    } catch (error) {
      console.error("❌ Error getting recruiters:", error);
      throw error;
    }
  }

  /**
   * Search for contacts and recruiters by company name
   */
  async searchContactsByCompany(userId, companyName) {
    try {
      // Search for recruiters from job opportunities
      const recruiterQuery = `
        SELECT DISTINCT
          recruiter_name as name,
          recruiter_email as email,
          recruiter_phone as phone,
          company,
          'recruiter' as contact_type,
          COUNT(*) as opportunity_count
        FROM job_opportunities
        WHERE user_id = $1
          AND company ILIKE $2
          AND recruiter_name IS NOT NULL
          AND recruiter_name != ''
        GROUP BY recruiter_name, recruiter_email, recruiter_phone, company
        ORDER BY opportunity_count DESC
        LIMIT 20
      `;

      // Search for contacts from professional_contacts
      const contactQuery = `
        SELECT 
          id,
          COALESCE(first_name || ' ' || last_name, first_name, last_name, '') as name,
          email,
          phone,
          company,
          job_title as title,
          linkedin_url as linkedin_url,
          'contact' as contact_type
        FROM professional_contacts
        WHERE user_id = $1
          AND company ILIKE $2
        ORDER BY created_at DESC
        LIMIT 20
      `;

      const companyPattern = `%${companyName}%`;
      const [recruitersResult, contactsResult] = await Promise.all([
        database.query(recruiterQuery, [userId, companyPattern]),
        database.query(contactQuery, [userId, companyPattern]),
      ]);

      const recruiters = recruitersResult.rows.map((row) => ({
        name: row.name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        type: row.contact_type,
        opportunityCount: parseInt(row.opportunity_count) || 0,
      }));

      const contacts = contactsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        title: row.title,
        linkedinUrl: row.linkedin_url,
        type: row.contact_type,
      }));

      return {
        recruiters,
        contacts,
        total: recruiters.length + contacts.length,
      };
    } catch (error) {
      console.error("❌ Error searching contacts by company:", error);
      throw error;
    }
  }

  /**
   * Search for companies by industry (returns large companies in that industry)
   */
  async searchCompaniesByIndustry(industry) {
    try {
      // This is a simplified version - in production, you'd use a company database API
      // For now, we'll return some common companies based on industry keywords
      const industryMap = {
        semiconductor: ["NVIDIA", "AMD", "Intel", "TSMC", "Qualcomm", "Broadcom"],
        technology: ["Google", "Microsoft", "Apple", "Amazon", "Meta", "Netflix"],
        finance: ["JPMorgan Chase", "Goldman Sachs", "Morgan Stanley", "Bank of America"],
        healthcare: ["Johnson & Johnson", "Pfizer", "UnitedHealth Group", "Merck"],
        automotive: ["Tesla", "Ford", "General Motors", "Toyota"],
      };

      const normalizedIndustry = industry.toLowerCase();
      let companies = [];

      for (const [key, companyList] of Object.entries(industryMap)) {
        if (normalizedIndustry.includes(key) || key.includes(normalizedIndustry)) {
          companies = companyList;
          break;
        }
      }

      // If no match, return general tech companies
      if (companies.length === 0) {
        companies = industryMap.technology;
      }

      // Map company names to LinkedIn URLs (standard format)
      const linkedInUrlMap = {
        "NVIDIA": "https://www.linkedin.com/company/nvidia",
        "AMD": "https://www.linkedin.com/company/amd",
        "Intel": "https://www.linkedin.com/company/intel",
        "TSMC": "https://www.linkedin.com/company/tsmc",
        "Qualcomm": "https://www.linkedin.com/company/qualcomm",
        "Broadcom": "https://www.linkedin.com/company/broadcom",
        "Google": "https://www.linkedin.com/company/google",
        "Microsoft": "https://www.linkedin.com/company/microsoft",
        "Apple": "https://www.linkedin.com/company/apple",
        "Amazon": "https://www.linkedin.com/company/amazon",
        "Meta": "https://www.linkedin.com/company/meta",
        "Netflix": "https://www.linkedin.com/company/netflix",
        "JPMorgan Chase": "https://www.linkedin.com/company/jpmorgan-chase",
        "Goldman Sachs": "https://www.linkedin.com/company/goldman-sachs",
        "Morgan Stanley": "https://www.linkedin.com/company/morgan-stanley",
        "Bank of America": "https://www.linkedin.com/company/bank-of-america",
        "Johnson & Johnson": "https://www.linkedin.com/company/johnson-&-johnson",
        "Pfizer": "https://www.linkedin.com/company/pfizer",
        "UnitedHealth Group": "https://www.linkedin.com/company/unitedhealth-group",
        "Merck": "https://www.linkedin.com/company/merck",
        "Tesla": "https://www.linkedin.com/company/tesla-motors",
        "Ford": "https://www.linkedin.com/company/ford-motor-company",
        "General Motors": "https://www.linkedin.com/company/general-motors",
        "Toyota": "https://www.linkedin.com/company/toyota",
      };

      return companies.map((company) => ({
        name: company,
        industry: industry,
        type: "large_company",
        linkedInUrl: linkedInUrlMap[company] || `https://www.linkedin.com/company/${company.toLowerCase().replace(/\s+/g, '-')}`,
      }));
    } catch (error) {
      console.error("❌ Error searching companies:", error);
      throw error;
    }
  }

  /**
   * Get LinkedIn network contacts (from cached table or fetch from API)
   */
  async getLinkedInNetwork(userId, options = {}) {
    try {
      const { company, industry, limit = 50 } = options;

      let query = `
        SELECT *
        FROM linkedin_network_contacts
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (company) {
        query += ` AND current_company ILIKE $${paramIndex++}`;
        params.push(`%${company}%`);
      }

      if (industry) {
        query += ` AND industry ILIKE $${paramIndex++}`;
        params.push(`%${industry}%`);
      }

      query += ` ORDER BY last_updated DESC LIMIT $${paramIndex++}`;
      params.push(limit);

      const result = await database.query(query, params);
      return result.rows.map((row) => ({
        id: row.id,
        linkedinId: row.linkedin_id,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: row.full_name,
        headline: row.headline,
        company: row.current_company,
        title: row.current_title,
        location: row.location,
        profileUrl: row.profile_url,
        profilePictureUrl: row.profile_picture_url,
        connectionDegree: row.connection_degree,
        industry: row.industry,
        mutualConnectionsCount: row.mutual_connections_count || 0,
      }));
    } catch (error) {
      console.error("❌ Error getting LinkedIn network:", error);
      throw error;
    }
  }

  /**
   * Generate coffee chat or interview request message
   */
  async generateNetworkingMessage(userId, messageData) {
    try {
      const {
        recipientName,
        recipientTitle,
        recipientCompany,
        messageType = "coffee_chat", // coffee_chat, interview_request, referral_request
        jobOpportunityId = null,
        personalContext = "",
      } = messageData;

      // Get user profile for personalization
      const profileQuery = `
        SELECT p.first_name, p.last_name, p.job_title, p.industry, p.bio
        FROM profiles p
        WHERE p.user_id = $1
      `;
      const profileResult = await database.query(profileQuery, [userId]);
      const profile = profileResult.rows[0] || {};

      // Get job opportunity details if provided
      let jobDetails = null;
      if (jobOpportunityId) {
        const jobQuery = `
          SELECT title, company, location
          FROM job_opportunities
          WHERE id = $1 AND user_id = $2
        `;
        const jobResult = await database.query(jobQuery, [
          jobOpportunityId,
          userId,
        ]);
        jobDetails = jobResult.rows[0] || null;
      }

      // Generate message using OpenAI
      if (!this.openai) {
        throw new Error("OpenAI API key not configured");
      }

      const systemPrompt = `You are a professional networking assistant. Generate personalized, warm, and professional networking messages. 
Keep messages concise (2-3 short paragraphs), authentic, and value-focused.`;

      let userPrompt = `Generate a ${messageType.replace("_", " ")} message to ${recipientName}`;
      if (recipientTitle) userPrompt += `, ${recipientTitle}`;
      if (recipientCompany) userPrompt += ` at ${recipientCompany}`;

      userPrompt += `.\n\n`;

      if (messageType === "coffee_chat") {
        userPrompt += `Request a brief coffee chat or virtual meeting to learn about their experience and insights.`;
      } else if (messageType === "interview_request") {
        userPrompt += `Request an informational interview to learn about their role and company.`;
      } else if (messageType === "referral_request") {
        userPrompt += `Politely request a referral for a position at their company.`;
      }

      if (jobDetails) {
        userPrompt += `\n\nJob context: ${jobDetails.title} at ${jobDetails.company}`;
        if (jobDetails.location) {
          userPrompt += ` (${jobDetails.location})`;
        }
      }

      if (profile.first_name) {
        userPrompt += `\n\nYour name: ${profile.first_name} ${profile.last_name || ""}`;
      }
      if (profile.job_title) {
        userPrompt += `\nYour current role: ${profile.job_title}`;
      }
      if (profile.industry) {
        userPrompt += `\nYour industry: ${profile.industry}`;
      }
      if (personalContext) {
        userPrompt += `\n\nAdditional context: ${personalContext}`;
      }

      userPrompt += `\n\nGenerate a professional, warm message that is personalized and not generic.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const messageBody = completion.choices[0]?.message?.content || "";

      // Generate subject line
      const subjectPrompt = `Generate a concise, professional subject line for a ${messageType.replace("_", " ")} email to ${recipientName}${recipientCompany ? ` at ${recipientCompany}` : ""}. Keep it under 60 characters.`;
      const subjectCompletion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a professional email subject line generator." },
          { role: "user", content: subjectPrompt },
        ],
        temperature: 0.7,
        max_tokens: 50,
      });

      const subject = subjectCompletion.choices[0]?.message?.content?.trim() || `Networking Request - ${recipientName}`;

      return {
        subject,
        messageBody,
        messageType,
      };
    } catch (error) {
      console.error("❌ Error generating networking message:", error);
      throw error;
    }
  }

  /**
   * Create a coffee chat record
   */
  async createCoffeeChat(userId, chatData) {
    try {
      const {
        contactId,
        jobOpportunityId,
        contactName,
        contactEmail,
        contactLinkedInUrl,
        contactCompany,
        contactTitle,
        chatType = "coffee_chat",
        scheduledDate,
        notes,
      } = chatData;

      const chatId = uuidv4();

      const query = `
        INSERT INTO coffee_chats (
          id, user_id, contact_id, job_opportunity_id,
          contact_name, contact_email, contact_linkedin_url,
          contact_company, contact_title, chat_type,
          scheduled_date, notes, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *
      `;

      const result = await database.query(query, [
        chatId,
        userId,
        contactId || null,
        jobOpportunityId || null,
        contactName,
        contactEmail || null,
        contactLinkedInUrl || null,
        contactCompany || null,
        contactTitle || null,
        chatType,
        scheduledDate || null,
        notes || null,
        scheduledDate && new Date(scheduledDate) > new Date() ? "upcoming" : "completed",
      ]);

      return this.mapRowToCoffeeChat(result.rows[0]);
    } catch (error) {
      console.error("❌ Error creating coffee chat:", error);
      throw error;
    }
  }

  /**
   * Save generated networking message
   */
  async saveNetworkingMessage(userId, messageData) {
    try {
      const {
        coffeeChatId,
        messageType,
        recipientName,
        recipientEmail,
        recipientLinkedInUrl,
        subject,
        messageBody,
        generatedBy = "ai",
      } = messageData;

      const messageId = uuidv4();

      const query = `
        INSERT INTO networking_messages (
          id, user_id, coffee_chat_id, message_type,
          recipient_name, recipient_email, recipient_linkedin_url,
          subject, message_body, generated_by,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `;

      const result = await database.query(query, [
        messageId,
        userId,
        coffeeChatId || null,
        messageType,
        recipientName,
        recipientEmail || null,
        recipientLinkedInUrl || null,
        subject,
        messageBody,
        generatedBy,
      ]);

      return {
        id: result.rows[0].id,
        messageType: result.rows[0].message_type,
        subject: result.rows[0].subject,
        messageBody: result.rows[0].message_body,
        sent: result.rows[0].sent,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      console.error("❌ Error saving networking message:", error);
      throw error;
    }
  }

  /**
   * Get coffee chats for a user
   */
  async getCoffeeChats(userId, filters = {}) {
    try {
      const { status, jobOpportunityId } = filters;

      let query = `
        SELECT c.*,
          jo.title as job_title,
          jo.company as job_company,
          jo.status as job_status
        FROM coffee_chats c
        LEFT JOIN job_opportunities jo ON c.job_opportunity_id = jo.id
        WHERE c.user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        query += ` AND c.status = $${paramIndex++}`;
        params.push(status);
      }

      if (jobOpportunityId) {
        query += ` AND c.job_opportunity_id = $${paramIndex++}`;
        params.push(jobOpportunityId);
      }

      query += ` ORDER BY 
        CASE c.status
          WHEN 'upcoming' THEN 1
          WHEN 'completed' THEN 2
          WHEN 'cancelled' THEN 3
          ELSE 4
        END,
        c.scheduled_date DESC NULLS LAST,
        c.created_at DESC
      `;

      const result = await database.query(query, params);
      return result.rows.map((row) => this.mapRowToCoffeeChat(row));
    } catch (error) {
      console.error("❌ Error getting coffee chats:", error);
      throw error;
    }
  }

  /**
   * Update coffee chat status
   */
  async updateCoffeeChat(userId, chatId, updateData) {
    try {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      const fields = {
        status: "status",
        scheduledDate: "scheduled_date",
        completedDate: "completed_date",
        messageSent: "message_sent",
        messageSentAt: "message_sent_at",
        responseReceived: "response_received",
        responseReceivedAt: "response_received_at",
        responseContent: "response_content",
        referralProvided: "referral_provided",
        referralDetails: "referral_details",
        notes: "notes",
        impactOnOpportunity: "impact_on_opportunity",
      };

      for (const [key, column] of Object.entries(fields)) {
        if (updateData[key] !== undefined) {
          updates.push(`${column} = $${paramIndex++}`);
          values.push(updateData[key]);
        }
      }

      if (updates.length === 0) {
        throw new Error("No fields to update");
      }

      updates.push(`updated_at = NOW()`);
      values.push(chatId, userId);

      const query = `
        UPDATE coffee_chats
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await database.query(query, values);
      if (result.rows.length === 0) {
        throw new Error("Coffee chat not found");
      }

      return this.mapRowToCoffeeChat(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating coffee chat:", error);
      throw error;
    }
  }

  /**
   * Get networking analytics (response rates, referrals, etc.)
   */
  async getNetworkingAnalytics(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      let dateFilter = "";
      const params = [userId];
      if (startDate) {
        dateFilter += " AND c.created_at >= $" + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += " AND c.created_at <= $" + (params.length + 1);
        params.push(endDate + " 23:59:59");
      }

      // Overall stats
      const statsQuery = `
        SELECT 
          COUNT(*) as total_chats,
          COUNT(CASE WHEN status = 'upcoming' THEN 1 END) as upcoming_chats,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_chats,
          COUNT(CASE WHEN message_sent = true THEN 1 END) as messages_sent,
          COUNT(CASE WHEN response_received = true THEN 1 END) as responses_received,
          COUNT(CASE WHEN referral_provided = true THEN 1 END) as referrals_received,
          COUNT(CASE WHEN job_opportunity_id IS NOT NULL THEN 1 END) as chats_linked_to_opportunities
        FROM coffee_chats c
        WHERE user_id = $1 ${dateFilter}
      `;

      const statsResult = await database.query(statsQuery, params);
      const stats = statsResult.rows[0];

      const totalChats = parseInt(stats.total_chats) || 0;
      const messagesSent = parseInt(stats.messages_sent) || 0;
      const responsesReceived = parseInt(stats.responses_received) || 0;

      // Response rate
      const responseRate =
        messagesSent > 0 ? Math.round((responsesReceived / messagesSent) * 1000) / 10 : 0;

      // Referral rate
      const referralRate =
        totalChats > 0
          ? Math.round((parseInt(stats.referrals_received) / totalChats) * 1000) / 10
          : 0;

      // Impact on opportunities
      const impactQuery = `
        SELECT 
          c.impact_on_opportunity,
          COUNT(*) as count,
          COUNT(CASE WHEN jo.status = 'Offer' THEN 1 END) as offers
        FROM coffee_chats c
        LEFT JOIN job_opportunities jo ON c.job_opportunity_id = jo.id
        WHERE c.user_id = $1 
          AND c.job_opportunity_id IS NOT NULL
          ${dateFilter}
        GROUP BY c.impact_on_opportunity
      `;

      const impactResult = await database.query(impactQuery, params);
      const impactBreakdown = impactResult.rows.map((row) => ({
        impact: row.impact_on_opportunity || "unknown",
        count: parseInt(row.count) || 0,
        offers: parseInt(row.offers) || 0,
      }));

      return {
        overall: {
          totalChats,
          upcomingChats: parseInt(stats.upcoming_chats) || 0,
          completedChats: parseInt(stats.completed_chats) || 0,
          messagesSent,
          responsesReceived,
          responseRate,
          referralsReceived: parseInt(stats.referrals_received) || 0,
          referralRate,
          chatsLinkedToOpportunities: parseInt(stats.chats_linked_to_opportunities) || 0,
        },
        impactBreakdown,
      };
    } catch (error) {
      console.error("❌ Error getting networking analytics:", error);
      throw error;
    }
  }

  /**
   * Helper: Parse date range
   */
  parseDateRange(dateRange) {
    let startDate = dateRange?.startDate || null;
    let endDate = dateRange?.endDate || null;

    // If dates are provided as strings, ensure they're in the right format
    if (startDate && typeof startDate === "string") {
      startDate = startDate.split("T")[0]; // Get just the date part
    }
    if (endDate && typeof endDate === "string") {
      endDate = endDate.split("T")[0]; // Get just the date part
    }

    return { startDate, endDate };
  }

  /**
   * Helper: Map database row to coffee chat object
   */
  mapRowToCoffeeChat(row) {
    return {
      id: row.id,
      userId: row.user_id,
      contactId: row.contact_id,
      jobOpportunityId: row.job_opportunity_id,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactLinkedInUrl: row.contact_linkedin_url,
      contactCompany: row.contact_company,
      contactTitle: row.contact_title,
      chatType: row.chat_type,
      scheduledDate: row.scheduled_date,
      completedDate: row.completed_date,
      status: row.status,
      messageSent: row.message_sent,
      messageSentAt: row.message_sent_at,
      responseReceived: row.response_received,
      responseReceivedAt: row.response_received_at,
      responseContent: row.response_content,
      referralProvided: row.referral_provided,
      referralDetails: row.referral_details,
      notes: row.notes,
      impactOnOpportunity: row.impact_on_opportunity,
      jobTitle: row.job_title,
      jobCompany: row.job_company,
      jobStatus: row.job_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new NetworkingService();

