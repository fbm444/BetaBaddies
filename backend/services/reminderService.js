import database from "./database.js";
import emailService from "./emailService.js";
import interviewService from "./interviewService.js";
import { v4 as uuidv4 } from "uuid";

class ReminderService {
  /**
   * Schedule reminders for an interview (24h and 2h before)
   */
  async scheduleReminders(userId, interviewId, interviewScheduledAt) {
    try {
      const scheduledAt = new Date(interviewScheduledAt);

      // Calculate reminder times
      const reminder24h = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
      const reminder2h = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000); // 2 hours before

      // Only schedule reminders if they're in the future
      const now = new Date();
      const reminders = [];

      if (reminder24h > now) {
        reminders.push({
          type: "24_hours",
          scheduledAt: reminder24h,
        });
      }

      if (reminder2h > now) {
        reminders.push({
          type: "2_hours",
          scheduledAt: reminder2h,
        });
      }

      // Insert reminders into database
      for (const reminder of reminders) {
        await database.query(
          `INSERT INTO interview_reminders (
            id, interview_id, reminder_type, scheduled_at, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
          ON CONFLICT (interview_id, reminder_type) 
          DO UPDATE SET scheduled_at = $4, status = 'pending', updated_at = NOW()`,
          [uuidv4(), interviewId, reminder.type, reminder.scheduledAt]
        );
      }

      return reminders;
    } catch (error) {
      console.error("❌ Error scheduling reminders:", error);
      throw error;
    }
  }

  /**
   * Reschedule reminders when interview time changes
   */
  async rescheduleReminders(interviewId, newScheduledAt) {
    try {
      // Cancel existing pending reminders
      await database.query(
        `UPDATE interview_reminders 
         SET status = 'cancelled', updated_at = NOW()
         WHERE interview_id = $1 AND status = 'pending'`,
        [interviewId]
      );

      // Get interview to find userId
      const interviewQuery = await database.query(
        `SELECT user_id, scheduled_at FROM interviews WHERE id = $1`,
        [interviewId]
      );

      if (interviewQuery.rows.length === 0) {
        throw new Error("Interview not found");
      }

      const userId = interviewQuery.rows[0].user_id;

      // Schedule new reminders
      return await this.scheduleReminders(userId, interviewId, newScheduledAt);
    } catch (error) {
      console.error("❌ Error rescheduling reminders:", error);
      throw error;
    }
  }

  /**
   * Cancel all reminders for an interview
   */
  async cancelReminders(interviewId) {
    try {
      await database.query(
        `UPDATE interview_reminders 
         SET status = 'cancelled', updated_at = NOW()
         WHERE interview_id = $1 AND status = 'pending'`,
        [interviewId]
      );
    } catch (error) {
      console.error("❌ Error cancelling reminders:", error);
      throw error;
    }
  }

  /**
   * Get due reminders (for cron job processing)
   */
  async getDueReminders(bufferMinutes = 5) {
    try {
      const bufferMs = bufferMinutes * 60 * 1000;
      const now = new Date();

      const query = `
        SELECT 
          ir.id,
          ir.interview_id,
          ir.reminder_type,
          ir.scheduled_at,
          i.user_id,
          i.title,
          i.company,
          i.scheduled_at as interview_time,
          i.duration,
          i.location,
          i.video_link,
          i.phone_number,
          i.interviewer_name,
          i.interviewer_email,
          i.type as interview_type,
          i.format as interview_format,
          u.email as user_email,
          p.first_name,
          p.last_name
        FROM interview_reminders ir
        JOIN interviews i ON ir.interview_id = i.id
        JOIN users u ON i.user_id = u.u_id
        LEFT JOIN profiles p ON u.u_id = p.user_id
        WHERE ir.status = 'pending'
          AND ir.scheduled_at <= $1
          AND ir.scheduled_at >= $2
        ORDER BY ir.scheduled_at ASC
      `;

      const maxTime = new Date(now.getTime() + bufferMs);
      const minTime = new Date(now.getTime() - bufferMs); // Allow small buffer for retries

      const result = await database.query(query, [maxTime, minTime]);

      return result.rows.map((row) => ({
        reminderId: row.id,
        interviewId: row.interview_id,
        reminderType: row.reminder_type,
        scheduledAt: row.scheduled_at,
        userId: row.user_id,
        userEmail: row.user_email,
        userName: row.first_name && row.last_name 
          ? `${row.first_name} ${row.last_name}` 
          : row.user_email,
        interview: {
          title: row.title,
          company: row.company,
          scheduledAt: row.interview_time,
          duration: row.duration,
          location: row.location,
          videoLink: row.video_link,
          phoneNumber: row.phone_number,
          interviewerName: row.interviewer_name,
          interviewerEmail: row.interviewer_email,
          type: row.interview_type,
          format: row.interview_format,
        },
      }));
    } catch (error) {
      console.error("❌ Error getting due reminders:", error);
      throw error;
    }
  }

  /**
   * Send a reminder email
   */
  async sendReminder(reminderId, reminderData) {
    try {
      const { reminderType, userEmail, userName, interview } = reminderData;

      // Send email
      await emailService.sendInterviewReminder(userEmail, {
        userName,
        reminderType,
        interview,
      });

      // Update reminder status
      await database.query(
        `UPDATE interview_reminders 
         SET status = 'sent', sent_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [reminderId]
      );

      return { success: true };
    } catch (error) {
      console.error(`❌ Error sending reminder ${reminderId}:`, error);

      // Update reminder status to failed
      await database.query(
        `UPDATE interview_reminders 
         SET status = 'failed', 
             last_error = $2, 
             retry_count = retry_count + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [reminderId, error.message?.substring(0, 500) || "Unknown error"]
      );

      throw error;
    }
  }

  /**
   * Get reminders for a specific interview
   */
  async getRemindersForInterview(interviewId) {
    try {
      const query = `
        SELECT 
          id,
          reminder_type,
          scheduled_at,
          sent_at,
          status,
          retry_count,
          last_error,
          created_at,
          updated_at
        FROM interview_reminders
        WHERE interview_id = $1
        ORDER BY scheduled_at ASC
      `;

      const result = await database.query(query, [interviewId]);

      return result.rows.map((row) => ({
        id: row.id,
        reminderType: row.reminder_type,
        scheduledAt: row.scheduled_at,
        sentAt: row.sent_at,
        status: row.status,
        retryCount: row.retry_count || 0,
        lastError: row.last_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error("❌ Error getting reminders for interview:", error);
      throw error;
    }
  }

  /**
   * Process due reminders (called by cron job)
   */
  async processDueReminders() {
    try {
      const dueReminders = await this.getDueReminders();

      if (dueReminders.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      let succeeded = 0;
      let failed = 0;

      for (const reminder of dueReminders) {
        try {
          await this.sendReminder(reminder.reminderId, reminder);
          succeeded++;
        } catch (error) {
          failed++;
          console.error(`Failed to send reminder ${reminder.reminderId}:`, error);
        }
      }

      return {
        processed: dueReminders.length,
        succeeded,
        failed,
      };
    } catch (error) {
      console.error("❌ Error processing due reminders:", error);
      throw error;
    }
  }
}

export default new ReminderService();

