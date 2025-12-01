import database from "./database.js";
import emailService from "./emailService.js";
import { v4 as uuidv4 } from "uuid";
import communicationsAIService from "./interviewCommunicationsAIService.js";

class ThankYouNoteService {
  /**
   * Generate a thank-you note for an interview
   */
  async generateThankYouNote(interviewId, userId, options = {}) {
    try {
      // Get interview details (for recipient and validation)
      const interviewQuery = `
        SELECT 
          i.*,
          jo.title as job_title,
          jo.company,
          p.first_name,
          p.last_name
        FROM interviews i
        LEFT JOIN job_opportunities jo ON i.job_opportunity_id = jo.id
        LEFT JOIN profiles p ON i.user_id = p.user_id
        WHERE i.id = $1 AND i.user_id = $2
      `;

      const interviewResult = await database.query(interviewQuery, [
        interviewId,
        userId,
      ]);

      if (interviewResult.rows.length === 0) {
        throw new Error("Interview not found");
      }

      const interview = interviewResult.rows[0];
      const interviewerName = interview.interviewer_name || "Interviewer";
      // For draft generation we don't require a real email; use a placeholder if missing
      const interviewerEmail =
        interview.interviewer_email || "no-email@placeholder.local";

      // Generate note content using AI + fallback service
      let draft;
      try {
        draft = await communicationsAIService.generateThankYouDraft(
          interviewId,
          userId,
          options
        );
      } catch (error) {
        console.warn(
          "[ThankYouNoteService] Failed to generate AI thank-you draft, using legacy template:",
          error.message
        );

        const interviewDate = interview.scheduled_at
          ? new Date(interview.scheduled_at).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "recently";

        const userName =
          interview.first_name && interview.last_name
            ? `${interview.first_name} ${interview.last_name}`
            : "Candidate";

        const subject = `Thank You - ${
          interview.job_title || interview.title || "Interview"
        } at ${interview.company || "your company"}`;

        const body = this.generateNoteBody({
          interviewerName,
          userName,
          interviewDate,
          jobTitle: interview.job_title || interview.title,
          company: interview.company,
          interviewType: interview.type,
          interviewNotes: interview.notes,
        });

        draft = { subject, body, generatedBy: "legacy" };
      }

      const subject = draft.subject;
      const body = draft.body;

      // Create thank-you note record
      const noteId = uuidv4();
      await database.query(
        `INSERT INTO interview_thank_you_notes (
          id, interview_id, recipient_email, recipient_name, subject, body, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'draft')`,
        [noteId, interviewId, interviewerEmail, interviewerName, subject, body]
      );

      return {
        id: noteId,
        interviewId,
        recipientEmail: interviewerEmail,
        recipientName: interviewerName,
        subject,
        body,
        status: "draft",
      };
    } catch (error) {
      console.error("❌ Error generating thank-you note:", error);
      throw error;
    }
  }

  /**
   * Generate note body content
   */
  generateNoteBody({ interviewerName, userName, interviewDate, jobTitle, company, interviewType, interviewNotes }) {
    let body = `Dear ${interviewerName},\n\n`;

    body += `Thank you for taking the time to meet with me on ${interviewDate} regarding the ${jobTitle || "position"} at ${company || "your company"}. `;

    body += `I truly enjoyed our conversation and learning more about the role and the team.\n\n`;

    // Add personalized touch based on interview notes
    if (interviewNotes) {
      body += `I particularly appreciated our discussion about `;
      // Extract key topics from notes (simple implementation)
      const noteWords = interviewNotes.split(" ").slice(0, 10).join(" ");
      body += `${noteWords}...\n\n`;
    }

    body += `I am very excited about the opportunity to contribute to ${company || "your organization"} and believe my background and experience align well with the requirements of this role.\n\n`;

    body += `Please let me know if you need any additional information from me. I look forward to hearing from you soon.\n\n`;

    body += `Best regards,\n${userName}`;

    return body;
  }

  /**
   * Send thank-you note via email
   */
  async sendThankYouNote(noteId, userId) {
    try {
      // Get note details
      const noteQuery = `
        SELECT 
          tn.*,
          i.user_id,
          u.email as sender_email
        FROM interview_thank_you_notes tn
        JOIN interviews i ON tn.interview_id = i.id
        JOIN users u ON i.user_id = u.u_id
        WHERE tn.id = $1 AND i.user_id = $2
      `;

      const noteResult = await database.query(noteQuery, [noteId, userId]);

      if (noteResult.rows.length === 0) {
        throw new Error("Thank-you note not found");
      }

      const note = noteResult.rows[0];

      if (note.status === "sent") {
        throw new Error("Thank-you note has already been sent");
      }

      // Send email
      await emailService.sendThankYouNoteEmail({
        to: note.recipient_email,
        recipientName: note.recipient_name,
        subject: note.subject,
        body: note.body,
        senderEmail: note.sender_email,
      });

      // Update note status
      await database.query(
        `UPDATE interview_thank_you_notes 
         SET status = 'sent', sent_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [noteId]
      );

      return { success: true, sentAt: new Date() };
    } catch (error) {
      console.error("❌ Error sending thank-you note:", error);

      // Update note status to failed
      await database.query(
        `UPDATE interview_thank_you_notes 
         SET status = 'failed', updated_at = NOW()
         WHERE id = $1`,
        [noteId]
      );

      throw error;
    }
  }

  /**
   * Get thank-you notes for an interview
   */
  async getThankYouNotesForInterview(interviewId, userId) {
    try {
      const query = `
        SELECT 
          id,
          interview_id,
          recipient_email,
          recipient_name,
          subject,
          body,
          sent_at,
          status,
          created_at,
          updated_at
        FROM interview_thank_you_notes
        WHERE interview_id = $1 
          AND interview_id IN (SELECT id FROM interviews WHERE user_id = $2)
        ORDER BY created_at DESC
      `;

      const result = await database.query(query, [interviewId, userId]);

      return result.rows.map((row) => ({
        id: row.id,
        interviewId: row.interview_id,
        recipientEmail: row.recipient_email,
        recipientName: row.recipient_name,
        subject: row.subject,
        body: row.body,
        sentAt: row.sent_at,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error("❌ Error getting thank-you notes:", error);
      throw error;
    }
  }

  /**
   * Update thank-you note
   */
  async updateThankYouNote(noteId, userId, updates) {
    try {
      const { subject, body } = updates;

      // Verify note belongs to user
      const verifyQuery = `
        SELECT tn.id
        FROM interview_thank_you_notes tn
        JOIN interviews i ON tn.interview_id = i.id
        WHERE tn.id = $1 AND i.user_id = $2
      `;

      const verifyResult = await database.query(verifyQuery, [noteId, userId]);

      if (verifyResult.rows.length === 0) {
        throw new Error("Thank-you note not found");
      }

      // Build update query
      const updatesList = [];
      const params = [];
      let paramIndex = 1;

      if (subject !== undefined) {
        updatesList.push(`subject = $${paramIndex++}`);
        params.push(subject);
      }

      if (body !== undefined) {
        updatesList.push(`body = $${paramIndex++}`);
        params.push(body);
      }

      if (updatesList.length === 0) {
        throw new Error("No updates provided");
      }

      updatesList.push(`updated_at = NOW()`);
      params.push(noteId);

      const updateQuery = `
        UPDATE interview_thank_you_notes 
        SET ${updatesList.join(", ")}
        WHERE id = $${paramIndex}
      `;

      await database.query(updateQuery, params);

      return { success: true };
    } catch (error) {
      console.error("❌ Error updating thank-you note:", error);
      throw error;
    }
  }
}

export default new ThankYouNoteService();

