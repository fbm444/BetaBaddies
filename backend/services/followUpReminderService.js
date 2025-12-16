import database from "./database.js";
import followUpEmailService from "./followUpEmailService.js";
import companyResponsivenessService from "./companyResponsivenessService.js";

class FollowUpReminderService {
  // Default timing rules (days after event)
  DEFAULT_TIMING = {
    'Applied': 7,
    'Interview Scheduled': 1, // 1 day before interview
    'Interview Completed': 3,
    'Offer': 2,
    'Offer Accepted': 0, // No follow-up needed
    'Rejected': 0, // Auto-disable
    'Withdrawn': 0, // Auto-disable
    'Archived': 0
  };

  /**
   * Create reminder when application status changes
   */
  async createReminderForStatusChange(jobOpportunityId, newStatus, eventDate, userId) {
    try {
      // Check if reminder should be created for this status
      const daysAfter = this.DEFAULT_TIMING[newStatus];
      if (!daysAfter || daysAfter === 0) {
        return null; // No reminder needed for this status
      }

      // Get job opportunity details
      const jobQuery = `
        SELECT jo.*, u.email, u.first_name, u.last_name
        FROM job_opportunities jo
        LEFT JOIN users u ON jo.user_id = u.id
        WHERE jo.id = $1
      `;
      const jobResult = await database.query(jobQuery, [jobOpportunityId]);

      if (jobResult.rows.length === 0) {
        throw new Error("Job opportunity not found");
      }

      const jobOpportunity = jobResult.rows[0];
      const actualUserId = userId || jobOpportunity.user_id;

      // Calculate due date
      const dueDate = new Date(eventDate);
      if (newStatus === 'Interview Scheduled') {
        // 1 day before interview
        dueDate.setDate(dueDate.getDate() - 1);
      } else {
        // X days after event
        dueDate.setDate(dueDate.getDate() + daysAfter);
      }

      // Determine reminder type
      const reminderType = this.getReminderTypeForStatus(newStatus);

      // Get company responsiveness for adaptive frequency
      const responsiveness = await companyResponsivenessService.getCompanyResponsiveness(
        actualUserId,
        jobOpportunity.company
      );

      // Check if reminder already exists for this event
      const existingQuery = `
        SELECT id FROM follow_up_reminders
        WHERE job_opportunity_id = $1
          AND application_stage = $2
          AND event_date = $3
          AND is_active = true
      `;
      const existingResult = await database.query(existingQuery, [
        jobOpportunityId,
        newStatus,
        eventDate
      ]);

      if (existingResult.rows.length > 0) {
        console.log(`⚠️ Reminder already exists for ${newStatus} at ${jobOpportunity.company}`);
        return existingResult.rows[0].id;
      }

      // Generate email template
      const userProfile = {
        fullName: `${jobOpportunity.first_name || ''} ${jobOpportunity.last_name || ''}`.trim(),
        firstName: jobOpportunity.first_name,
        email: jobOpportunity.email
      };

      const daysSince = Math.floor((new Date() - new Date(eventDate)) / (1000 * 60 * 60 * 24));
      const emailTemplate = await followUpEmailService.generateEmailTemplate(
        reminderType,
        jobOpportunity,
        userProfile,
        eventDate,
        daysSince
      );

      // Create reminder
      const insertQuery = `
        INSERT INTO follow_up_reminders (
          user_id, job_opportunity_id, reminder_type, application_stage,
          scheduled_date, due_date, event_date, days_after_event,
          generated_email_subject, generated_email_body,
          email_template_id, reminder_frequency_days,
          company_responsiveness_score, status, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', true)
        RETURNING *
      `;

      const result = await database.query(insertQuery, [
        actualUserId,
        jobOpportunityId,
        reminderType,
        newStatus,
        new Date(), // scheduled_date
        dueDate,
        eventDate,
        daysAfter,
        emailTemplate.subject,
        emailTemplate.body,
        emailTemplate.templateId || null,
        responsiveness.recommendedFrequency,
        responsiveness.responsivenessScore,
      ]);

      console.log(`✅ Created follow-up reminder for ${newStatus} at ${jobOpportunity.company}`);

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error creating reminder for status change:", error);
      throw error;
    }
  }

  /**
   * Get reminder type for application status
   */
  getReminderTypeForStatus(status) {
    const typeMap = {
      'Applied': 'application',
      'Interview Scheduled': 'interview',
      'Interview Completed': 'post_interview',
      'Offer': 'offer_response',
      'Offer Accepted': 'custom',
      'Rejected': 'custom',
      'Withdrawn': 'custom',
      'Archived': 'custom'
    };
    return typeMap[status] || 'custom';
  }

  /**
   * Calculate appropriate follow-up timing
   */
  calculateFollowUpTiming(applicationStage, eventDate, companyResponsiveness) {
    const baseDays = this.DEFAULT_TIMING[applicationStage] || 7;

    // Adjust based on company responsiveness
    if (companyResponsiveness && companyResponsiveness.responsivenessScore > 0.7) {
      // Responsive companies: slightly more frequent
      return Math.max(3, baseDays - 1);
    } else if (companyResponsiveness && companyResponsiveness.responsivenessScore < 0.4) {
      // Less responsive: space out more
      return baseDays + 3;
    }

    return baseDays;
  }

  /**
   * Get pending reminders for user
   */
  async getPendingReminders(userId, limit = 10) {
    try {
      const query = `
        SELECT 
          r.*,
          jo.title as job_title,
          jo.company as company_name,
          jo.location,
          jo.status as current_status,
          EXTRACT(EPOCH FROM (r.due_date - CURRENT_TIMESTAMP)) / 86400 as days_until_due
        FROM follow_up_reminders r
        JOIN job_opportunities jo ON r.job_opportunity_id = jo.id
        WHERE r.user_id = $1
          AND r.is_active = true
          AND r.status IN ('pending', 'snoozed')
          AND (r.snoozed_until IS NULL OR r.snoozed_until <= CURRENT_TIMESTAMP)
        ORDER BY r.due_date ASC
        LIMIT $2
      `;

      const result = await database.query(query, [userId, limit]);
      return result.rows || [];
    } catch (error) {
      // If tables don't exist yet, return empty array instead of throwing
      if (error.message && error.message.includes('does not exist')) {
        console.warn("⚠️ Follow-up reminders tables not found. Run migrations first.");
        return [];
      }
      console.error("❌ Error getting pending reminders:", error);
      throw error;
    }
  }

  /**
   * Get all reminders for user (with filters)
   */
  async getReminders(userId, filters = {}) {
    try {
      let query = `
        SELECT 
          r.*,
          jo.title as job_title,
          jo.company as company_name,
          jo.location,
          jo.status as current_status
        FROM follow_up_reminders r
        JOIN job_opportunities jo ON r.job_opportunity_id = jo.id
        WHERE r.user_id = $1
      `;

      const params = [userId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND r.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.jobOpportunityId) {
        paramCount++;
        query += ` AND r.job_opportunity_id = $${paramCount}`;
        params.push(filters.jobOpportunityId);
      }

      if (filters.isActive !== undefined) {
        paramCount++;
        query += ` AND r.is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

      query += ` ORDER BY r.due_date DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
      }

      const result = await database.query(query, params);
      return result.rows || [];
    } catch (error) {
      // If tables don't exist yet, return empty array instead of throwing
      if (error.message && error.message.includes('does not exist')) {
        console.warn("⚠️ Follow-up reminders tables not found. Run migrations first.");
        return [];
      }
      console.error("❌ Error getting reminders:", error);
      throw error;
    }
  }

  /**
   * Get reminder by ID
   */
  async getReminderById(reminderId, userId) {
    try {
      const query = `
        SELECT 
          r.*,
          jo.title as job_title,
          jo.company as company_name,
          jo.location,
          jo.status as current_status
        FROM follow_up_reminders r
        JOIN job_opportunities jo ON r.job_opportunity_id = jo.id
        WHERE r.id = $1 AND r.user_id = $2
      `;

      const result = await database.query(query, [reminderId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error getting reminder by ID:", error);
      throw error;
    }
  }

  /**
   * Mark reminder as completed
   */
  async completeReminder(reminderId, userId, responseType = null) {
    try {
      const updateQuery = `
        UPDATE follow_up_reminders
        SET 
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          response_type = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await database.query(updateQuery, [responseType, reminderId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Reminder not found");
      }

      // Update company responsiveness if response received
      if (responseType && responseType !== 'no_response') {
        const reminder = result.rows[0];
        const jobQuery = `SELECT company FROM job_opportunities WHERE id = $1`;
        const jobResult = await database.query(jobQuery, [reminder.job_opportunity_id]);

        if (jobResult.rows.length > 0) {
          // Calculate response time (simplified - would need email sent time)
          const responseTimeHours = 24; // Default estimate
          await companyResponsivenessService.updateResponseMetrics(
            userId,
            jobResult.rows[0].company,
            responseTimeHours,
            responseType
          );
        }
      }

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error completing reminder:", error);
      throw error;
    }
  }

  /**
   * Snooze reminder
   */
  async snoozeReminder(reminderId, userId, days) {
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + days);

      const updateQuery = `
        UPDATE follow_up_reminders
        SET 
          status = 'snoozed',
          snoozed_until = $1,
          due_date = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await database.query(updateQuery, [snoozeUntil, reminderId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Reminder not found");
      }

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error snoozing reminder:", error);
      throw error;
    }
  }

  /**
   * Dismiss reminder
   */
  async dismissReminder(reminderId, userId) {
    try {
      const updateQuery = `
        UPDATE follow_up_reminders
        SET 
          status = 'dismissed',
          dismissed_at = CURRENT_TIMESTAMP,
          is_active = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(updateQuery, [reminderId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Reminder not found");
      }

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error dismissing reminder:", error);
      throw error;
    }
  }

  /**
   * Handle rejected application - disable all reminders
   */
  async handleRejectedApplication(jobOpportunityId) {
    try {
      const updateQuery = `
        UPDATE follow_up_reminders
        SET 
          status = 'dismissed',
          is_active = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE job_opportunity_id = $1
          AND status IN ('pending', 'snoozed')
      `;

      await database.query(updateQuery, [jobOpportunityId]);
      console.log(`✅ Disabled reminders for rejected application: ${jobOpportunityId}`);
    } catch (error) {
      console.error("❌ Error handling rejected application:", error);
      throw error;
    }
  }

  /**
   * Create custom reminder
   */
  async createCustomReminder(userId, jobOpportunityId, reminderData) {
    try {
      const {
        reminderType = 'custom',
        scheduledDate,
        dueDate,
        customMessage,
        daysAfterEvent
      } = reminderData;

      // Get job opportunity
      const jobQuery = `SELECT * FROM job_opportunities WHERE id = $1 AND user_id = $2`;
      const jobResult = await database.query(jobQuery, [jobOpportunityId, userId]);

      if (jobResult.rows.length === 0) {
        throw new Error("Job opportunity not found");
      }

      const jobOpportunity = jobResult.rows[0];

      // Generate email template
      const userProfile = {
        fullName: "User",
        email: ""
      };

      const emailTemplate = await followUpEmailService.generateEmailTemplate(
        reminderType,
        jobOpportunity,
        userProfile,
        scheduledDate,
        0
      );

      // Override with custom message if provided
      if (customMessage) {
        emailTemplate.body = customMessage;
      }

      const insertQuery = `
        INSERT INTO follow_up_reminders (
          user_id, job_opportunity_id, reminder_type, application_stage,
          scheduled_date, due_date, event_date, days_after_event,
          generated_email_subject, generated_email_body,
          status, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', true)
        RETURNING *
      `;

      const result = await database.query(insertQuery, [
        userId,
        jobOpportunityId,
        reminderType,
        jobOpportunity.status,
        scheduledDate || new Date(),
        dueDate || new Date(),
        scheduledDate || new Date(),
        daysAfterEvent || 0,
        emailTemplate.subject,
        emailTemplate.body
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error creating custom reminder:", error);
      throw error;
    }
  }

  /**
   * Get follow-up etiquette tips
   */
  getEtiquetteTips(applicationStage, daysSinceLastContact) {
    const tips = {
      'Applied': [
        "Wait at least 1 week before following up",
        "Keep your message brief and professional",
        "Express continued interest without being pushy",
        "Offer to provide additional information if needed"
      ],
      'Interview Scheduled': [
        "Confirm interview details 1 day before",
        "Express enthusiasm about the opportunity",
        "Ask if there's anything specific to prepare",
        "Keep it brief and professional"
      ],
      'Interview Completed': [
        "Send thank you note within 24-48 hours",
        "Reference specific discussion points from the interview",
        "Reiterate your interest and fit for the role",
        "Keep it concise (2-3 short paragraphs)"
      ],
      'Offer': [
        "Respond within the given timeframe",
        "Express gratitude for the offer",
        "Ask thoughtful questions about the role",
        "Be professional even if declining"
      ]
    };

    const stageTips = tips[applicationStage] || [
      "Be professional and courteous",
      "Keep messages brief and to the point",
      "Don't follow up too frequently",
      "Personalize each message"
    ];

    // Add timing-specific tips
    if (daysSinceLastContact < 3) {
      stageTips.push("⚠️ It's been less than 3 days - consider waiting a bit longer");
    } else if (daysSinceLastContact > 14) {
      stageTips.push("💡 It's been over 2 weeks - a follow-up is appropriate");
    }

    return stageTips;
  }

  /**
   * Record that email was sent
   */
  async recordEmailSent(reminderId) {
    try {
      const updateQuery = `
        UPDATE follow_up_reminders
        SET email_sent_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      await database.query(updateQuery, [reminderId]);

      // Record follow-up sent for company responsiveness
      const reminder = await database.query(
        "SELECT user_id, job_opportunity_id FROM follow_up_reminders WHERE id = $1",
        [reminderId]
      );

      if (reminder.rows.length > 0) {
        const jobQuery = `SELECT company FROM job_opportunities WHERE id = $1`;
        const jobResult = await database.query(jobQuery, [reminder.rows[0].job_opportunity_id]);

        if (jobResult.rows.length > 0) {
          await companyResponsivenessService.recordFollowUpSent(
            reminder.rows[0].user_id,
            jobResult.rows[0].company
          );
        }
      }
    } catch (error) {
      console.error("❌ Error recording email sent:", error);
    }
  }
}

export default new FollowUpReminderService();

