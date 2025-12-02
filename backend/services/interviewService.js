import { v4 as uuidv4 } from "uuid";
import database from "./database.js";
import googleCalendarService from "./googleCalendarService.js";
import { teamService } from "./collaboration/index.js";
import reminderService from "./reminderService.js";
import followUpService from "./followUpService.js";

class InterviewService {
  constructor() {
    this.validTypes = ["phone", "video", "in-person"];
    this.validStatuses = ["scheduled", "completed", "cancelled", "rescheduled"];
    this.validOutcomes = [
      "pending",
      "passed",
      "failed",
      "no_decision",
      "offer_extended",
      "rejected",
    ];
  }

  // Validate interview type
  validateType(type) {
    if (type && !this.validTypes.includes(type)) {
      throw new Error(
        `Invalid interview type. Must be one of: ${this.validTypes.join(", ")}`
      );
    }
  }

  // Validate status
  validateStatus(status) {
    if (status && !this.validStatuses.includes(status)) {
      throw new Error(
        `Invalid status. Must be one of: ${this.validStatuses.join(", ")}`
      );
    }
  }

  // Validate outcome
  validateOutcome(outcome) {
    if (outcome && !this.validOutcomes.includes(outcome)) {
      throw new Error(
        `Invalid outcome. Must be one of: ${this.validOutcomes.join(", ")}`
      );
    }
  }

  // Check for scheduling conflicts
  async checkConflicts(userId, scheduledAt, duration, excludeInterviewId = null) {
    try {
      const startTime = new Date(scheduledAt);
      const endTime = new Date(startTime.getTime() + duration * 60000); // duration in minutes

      let query = `
        SELECT id, scheduled_at, duration, title, company
        FROM interviews
        WHERE user_id = $1
          AND status = 'scheduled'
          AND scheduled_at IS NOT NULL
          AND (
            (scheduled_at <= $2 AND scheduled_at + (duration || ' minutes')::interval >= $2)
            OR (scheduled_at >= $2 AND scheduled_at <= $3)
          )
      `;

      const params = [userId, startTime, endTime];

      if (excludeInterviewId) {
        query += ` AND id != $4`;
        params.push(excludeInterviewId);
      }

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("Error checking conflicts:", error);
      throw error;
    }
  }

  // Create interview
  async createInterview(userId, interviewData) {
    try {
      this.validateType(interviewData.interviewType);

      // Check for conflicts
      const conflicts = await this.checkConflicts(
        userId,
        interviewData.scheduledAt,
        interviewData.duration || 60
      );

      const conflictDetected = conflicts.length > 0;

      // Get job opportunity details if jobOpportunityId is provided
      let title = interviewData.title || "Interview";
      let company = interviewData.company || "";

      if (interviewData.jobOpportunityId) {
        const jobQuery = `
          SELECT title, company
          FROM job_opportunities
          WHERE id = $1 AND user_id = $2
        `;
        const jobResult = await database.query(jobQuery, [
          interviewData.jobOpportunityId,
          userId,
        ]);
        if (jobResult.rows.length > 0) {
          title = `${jobResult.rows[0].title} Interview`;
          company = jobResult.rows[0].company;
        }
      }

      const query = `
        INSERT INTO interviews (
          id, user_id, job_opportunity_id, title, company,
          type, date, scheduled_at, duration, location, video_link, phone_number,
          interviewer_name, interviewer_email, interviewer_title,
          notes, preparation_notes, status, conflict_detected, is_practice
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        RETURNING *
      `;

      const id = uuidv4();
      const result = await database.query(query, [
        id,
        userId,
        interviewData.jobOpportunityId || null,
        title,
        company,
        interviewData.interviewType,
        interviewData.scheduledAt, // Set both date and scheduled_at to the same value
        interviewData.duration || 60,
        interviewData.location || null,
        interviewData.videoLink || null,
        interviewData.phoneNumber || null,
        interviewData.interviewerName || null,
        interviewData.interviewerEmail || null,
        interviewData.interviewerTitle || null,
        interviewData.notes || null,
        interviewData.preparationNotes || null,
        "scheduled",
        conflictDetected,
        interviewData.isPractice || false,
      ]);

      const interview = result.rows[0];

      // Create preparation tasks if provided, otherwise generate a tailored checklist
      if (interviewData.preparationTasks && interviewData.preparationTasks.length > 0) {
        await this.createPreparationTasks(interview.id, interviewData.preparationTasks);
      } else {
        await this.generateDefaultPreparationTasks(interview.id, interviewData.interviewType);
      }

      // Store conflicts if any
      if (conflicts.length > 0) {
        for (const conflict of conflicts) {
          await database.query(
            `
            INSERT INTO interview_conflicts (
              interview_id, conflicting_interview_id, conflict_type, detected_at
            ) VALUES ($1, $2, 'overlap', now())
            ON CONFLICT (interview_id, conflicting_interview_id) DO NOTHING
            `,
            [interview.id, conflict.id]
          );
        }
      }

      const fullInterview = await this.getInterviewById(userId, interview.id);

      // Sync to Google Calendar if enabled
      try {
        const syncStatus = await googleCalendarService.getSyncStatus(userId);
        if (syncStatus.enabled) {
          await googleCalendarService.createEvent(userId, fullInterview);
        }
      } catch (error) {
        console.error("Error syncing interview to Google Calendar:", error);
        // Don't fail the interview creation if calendar sync fails
      }

<<<<<<< HEAD
      // Log activity to all teams user is a member of
      try {
        const userTeams = await database.query(
          `SELECT team_id, role FROM team_members WHERE user_id = $1 AND active = true`,
          [userId]
        );
        for (const team of userTeams.rows) {
          await teamService.logActivity(
            team.team_id,
            userId,
            team.role || "candidate",
            "interview_scheduled",
            {
              interview_id: interview.id,
              interview_type: interviewData.interviewType,
              company: company,
              title: title,
              scheduled_at: interviewData.scheduledAt
            }
          );
        }
      } catch (error) {
        console.error("Error logging interview activity:", error);
        // Don't fail interview creation if activity logging fails
      }

      // Schedule reminders (24h and 2h before)
      try {
        if (interviewData.scheduledAt) {
          await reminderService.scheduleReminders(
            userId,
            interview.id,
            interviewData.scheduledAt
          );
        }
      } catch (error) {
        console.error("Error scheduling reminders:", error);
        // Don't fail the interview creation if reminder scheduling fails
      }

      return fullInterview;
    } catch (error) {
      console.error("Error creating interview:", error);
      throw error;
    }
  }

  // Generate default (but tailored) preparation tasks for an interview
  async generateDefaultPreparationTasks(interviewId, interviewTypeHint) {
    // Load interview + related job information so we can customize tasks
    const query = `
      SELECT 
        i.type,
        i.scheduled_at,
        i.format,
        i.job_opportunity_id,
        jo.title       AS job_title,
        jo.company     AS company,
        jo.industry    AS industry
      FROM interviews i
      LEFT JOIN job_opportunities jo ON i.job_opportunity_id = jo.id
      WHERE i.id = $1
    `;

    const result = await database.query(query, [interviewId]);
    const row = result.rows[0] || {};

    const interviewType = row.type || interviewTypeHint || "video";
    const scheduledAt = row.scheduled_at ? new Date(row.scheduled_at) : null;
    const jobTitle = row.job_title || "this role";
    const company = row.company || "the company";
    const industry = (row.industry || "").toLowerCase();

    const tasks = [];

    // Helper to compute due dates relative to interview time
    const addHours = (date, hours) =>
      new Date(date.getTime() + hours * 60 * 60 * 1000);

    const addTask = (task, offsetHoursFromInterview = null) => {
      let dueDate = null;
      if (scheduledAt && offsetHoursFromInterview !== null) {
        dueDate = addHours(scheduledAt, offsetHoursFromInterview).toISOString();
      }
      tasks.push({ task, completed: false, dueDate });
    };

    // 1) Role & experience specific
    addTask(
      `Read the ${jobTitle} job description at ${company} and highlight the top 5 responsibilities.`,
      scheduledAt ? -48 : null
    );
    addTask(
      "Write 3–5 STAR stories that match the main requirements of this role.",
      scheduledAt ? -36 : null
    );

    // 2) Company research verification
    addTask(
      `Skim ${company}'s homepage and product pages; write a 2–3 sentence summary of what they do.`,
      scheduledAt ? -48 : null
    );
    addTask(
      `Check ${company}'s values/culture page and note 2–3 values you can speak to with examples.`,
      scheduledAt ? -36 : null
    );

    // 3) Thoughtful questions for interviewer
    addTask(
      "Draft at least 5 questions for the interviewer about the team, product roadmap, and growth opportunities.",
      scheduledAt ? -24 : null
    );

    // 4) Attire suggestion based on industry
    let attireSuggestion = "smart casual (nice top, dark jeans or chinos, closed‑toe shoes)";
    if (industry.includes("finance") || industry.includes("law") || industry.includes("consulting")) {
      attireSuggestion = "business formal (suit or blazer, dress shirt, dress shoes)";
    } else if (industry.includes("startup")) {
      attireSuggestion = "startup smart casual (clean sneakers ok, no logos, simple layers)";
    }
    addTask(
      `Pick your interview outfit (${attireSuggestion}) and lay it out the night before.`,
      scheduledAt ? -18 : null
    );

    // 5) Logistics & technology
    if (interviewType === "video") {
      addTask(
        "Join a test video call to check camera, microphone, and screen share.",
        scheduledAt ? -12 : null
      );
      addTask(
        "Choose a quiet, well‑lit spot; check your background and lighting on camera.",
        scheduledAt ? -6 : null
      );
    } else if (interviewType === "in-person") {
      addTask(
        "Confirm the office address and entry instructions; plan your route with 10–15 minutes buffer.",
        scheduledAt ? -24 : null
      );
      addTask(
        "Save directions and interview contact info offline in case of transit or signal issues.",
        scheduledAt ? -18 : null
      );
    } else if (interviewType === "phone") {
      addTask(
        "Pick a quiet location for the call and silence notifications on all devices.",
        scheduledAt ? -12 : null
      );
      addTask(
        "Charge your phone to 100% and test your headset or speakerphone.",
        scheduledAt ? -6 : null
      );
    }

    // 6) Confidence-building activities
    addTask(
      "Answer 5 common behavioral questions using STAR; record yourself or practice in a mirror.",
      scheduledAt ? -24 : null
    );
    addTask(
      "Do a 20–30 minute mock interview with a friend, mentor, or practice tool.",
      scheduledAt ? -24 : null
    );
    addTask(
      "Choose a 5‑minute breathing or visualization exercise to do right before the interview.",
      scheduledAt ? -1 : null
    );

    // 7) Portfolio / work samples (for relevant roles)
    const titleLower = jobTitle.toLowerCase();
    if (
      titleLower.includes("engineer") ||
      titleLower.includes("developer") ||
      titleLower.includes("designer") ||
      titleLower.includes("data") ||
      titleLower.includes("scientist") ||
      titleLower.includes("analyst")
    ) {
      addTask(
        "Pick 2–3 projects/work samples that best match this role and note talking points for each.",
        scheduledAt ? -36 : null
      );
      addTask(
        "Update your portfolio / GitHub / case studies and keep the links ready to share.",
        scheduledAt ? -30 : null
      );
    }

    // 8) Post-interview follow-up tasks
    // These are scheduled after the interview time so they show up as reminders later.
    if (scheduledAt) {
      addTask(
        `Send a personalized thank‑you email to your interviewer(s) for the ${jobTitle} role at ${company}.`,
        24 // 24 hours after interview
      );
      addTask(
        "Write a short reflection: what went well, what was challenging, and what to improve next time.",
        26 // shortly after the thank-you
      );
      addTask(
        "Update your job search tracker with the interview outcome and key notes from the conversation.",
        28
      );
    }

    await this.createPreparationTasks(interviewId, tasks);
  }

  // Create preparation tasks
  async createPreparationTasks(interviewId, tasks) {
    try {
      for (const taskData of tasks) {
        const taskId = uuidv4();
        await database.query(
          `
          INSERT INTO interview_preparation_tasks (
            id, interview_id, task, completed, due_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, now(), now())
          `,
          [
            taskId,
            interviewId,
            taskData.task || taskData,
            taskData.completed || false,
            taskData.dueDate || null,
          ]
        );
      }
    } catch (error) {
      console.error("Error creating preparation tasks:", error);
      throw error;
    }
  }

  // Get all interviews for user
  async getInterviews(userId, filters = {}) {
    try {
      let query = `
        SELECT i.*,
          json_agg(
            json_build_object(
              'id', t.id,
              'task', t.task,
              'completed', t.completed,
              'dueDate', t.due_date,
              'createdAt', t.created_at
            )
          ) FILTER (WHERE t.id IS NOT NULL) as preparation_tasks
        FROM interviews i
        LEFT JOIN interview_preparation_tasks t ON i.id = t.interview_id
        WHERE i.user_id = $1
      `;

      const params = [userId];
      let paramIndex = 2;

      if (filters.status) {
        query += ` AND i.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.jobOpportunityId) {
        query += ` AND i.job_opportunity_id = $${paramIndex}`;
        params.push(filters.jobOpportunityId);
        paramIndex++;
      }

      if (filters.startDate) {
        query += ` AND i.scheduled_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        query += ` AND i.scheduled_at <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      query += `
        GROUP BY i.id
        ORDER BY i.scheduled_at ASC NULLS LAST
      `;

      const result = await database.query(query, params);
      return result.rows.map((row) => this.mapInterviewRow(row));
    } catch (error) {
      console.error("Error getting interviews:", error);
      throw error;
    }
  }

  // Get interview by ID
  async getInterviewById(userId, interviewId) {
    try {
      const query = `
        SELECT i.*,
          json_agg(
            json_build_object(
              'id', t.id,
              'task', t.task,
              'completed', t.completed,
              'dueDate', t.due_date,
              'createdAt', t.created_at
            )
          ) FILTER (WHERE t.id IS NOT NULL) as preparation_tasks
        FROM interviews i
        LEFT JOIN interview_preparation_tasks t ON i.id = t.interview_id
        WHERE i.id = $1 AND i.user_id = $2
        GROUP BY i.id
        ORDER BY i.scheduled_at ASC NULLS LAST
      `;

      const result = await database.query(query, [interviewId, userId]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapInterviewRow(result.rows[0]);
    } catch (error) {
      console.error("Error getting interview:", error);
      throw error;
    }
  }

  // Update interview
  async updateInterview(userId, interviewId, updateData) {
    try {
      if (updateData.interviewType) {
        this.validateType(updateData.interviewType);
      }
      if (updateData.status) {
        this.validateStatus(updateData.status);
      }
      if (updateData.outcome) {
        this.validateOutcome(updateData.outcome);
      }

      // Get current interview to check status and for conflict checking
      const currentInterview = await this.getInterviewById(userId, interviewId);
      if (!currentInterview) {
        throw new Error("Interview not found");
      }

      const wasCompleted = currentInterview.status === "completed";

      // Check for conflicts if scheduled_at or duration is being updated
      let conflictDetected = false;
      if (updateData.scheduledAt || updateData.duration) {
        const scheduledAt = updateData.scheduledAt || currentInterview.scheduledAt;
        const duration = updateData.duration || currentInterview.duration;

        const conflicts = await this.checkConflicts(
          userId,
          scheduledAt,
          duration,
          interviewId
        );
        conflictDetected = conflicts.length > 0;
      }

      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      const fieldMapping = {
        interviewType: "type",
        format: "format",
        scheduledAt: "scheduled_at",
        duration: "duration",
        location: "location",
        videoLink: "video_link",
        phoneNumber: "phone_number",
        interviewerName: "interviewer_name",
        interviewerEmail: "interviewer_email",
        interviewerTitle: "interviewer_title",
        notes: "notes",
        preparationNotes: "preparation_notes",
        status: "status",
        outcome: "outcome",
        outcomeNotes: "outcome_notes",
        isPractice: "is_practice",
      };

      for (const [key, value] of Object.entries(updateData)) {
        if (fieldMapping[key] && value !== undefined) {
          updateFields.push(`${fieldMapping[key]} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }

      if (conflictDetected) {
        updateFields.push(`conflict_detected = $${paramIndex}`);
        params.push(true);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return await this.getInterviewById(userId, interviewId);
      }

      params.push(interviewId, userId);
      const query = `
        UPDATE interviews
        SET ${updateFields.join(", ")}, updated_at = now()
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await database.query(query, params);
      if (result.rows.length === 0) {
        throw new Error("Interview not found");
      }

      const updatedInterview = await this.getInterviewById(userId, interviewId);

      // Sync to Google Calendar if enabled
      try {
        const syncStatus = await googleCalendarService.getSyncStatus(userId);
        if (syncStatus.enabled) {
          await googleCalendarService.updateEvent(userId, updatedInterview);
        }
      } catch (error) {
        console.error("Error syncing interview to Google Calendar:", error);
        // Don't fail the interview update if calendar sync fails
      }

      // Reschedule reminders if interview time changed
      try {
        if (updateData.scheduledAt) {
          await reminderService.rescheduleReminders(interviewId, updateData.scheduledAt);
        }
      } catch (error) {
        console.error("Error rescheduling reminders:", error);
        // Don't fail the interview update if reminder rescheduling fails
      }

      // Generate follow-up actions if interview was just marked as completed
      try {
        if (updateData.status === "completed" && !wasCompleted) {
          await followUpService.generateFollowUpActions(interviewId, userId);
        }
      } catch (error) {
        console.error("Error generating follow-up actions:", error);
        // Don't fail the interview update if follow-up generation fails
      }

      return updatedInterview;
    } catch (error) {
      console.error("Error updating interview:", error);
      throw error;
    }
  }

  // Cancel interview
  async cancelInterview(userId, interviewId, cancellationReason) {
    try {
      // Get interview before cancelling to check for calendar event
      const interview = await this.getInterviewById(userId, interviewId);
      if (!interview) {
        throw new Error("Interview not found");
      }

      const query = `
        UPDATE interviews
        SET status = 'cancelled',
            cancelled_at = now(),
            cancellation_reason = $1,
            updated_at = now()
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await database.query(query, [
        cancellationReason || null,
        interviewId,
        userId,
      ]);

      if (result.rows.length === 0) {
        throw new Error("Interview not found");
      }

      // Delete from Google Calendar if event exists
      try {
        if (interview.googleCalendarEventId) {
          const syncStatus = await googleCalendarService.getSyncStatus(userId);
          if (syncStatus.enabled) {
            await googleCalendarService.deleteEvent(userId, interview.googleCalendarEventId);
          }
        }
      } catch (error) {
        console.error("Error deleting cancelled interview from Google Calendar:", error);
        // Don't fail the interview cancellation if calendar sync fails
      }

      // Cancel all pending reminders
      try {
        await reminderService.cancelReminders(interviewId);
      } catch (error) {
        console.error("Error cancelling reminders:", error);
        // Don't fail the interview cancellation if reminder cancellation fails
      }

      return await this.getInterviewById(userId, interviewId);
    } catch (error) {
      console.error("Error cancelling interview:", error);
      throw error;
    }
  }

  // Reschedule interview
  async rescheduleInterview(
    userId,
    interviewId,
    newScheduledAt,
    newDuration
  ) {
    try {
      const currentInterview = await this.getInterviewById(userId, interviewId);
      if (!currentInterview) {
        throw new Error("Interview not found");
      }

      // Check for conflicts with new time
      const conflicts = await this.checkConflicts(
        userId,
        newScheduledAt,
        newDuration || currentInterview.duration,
        interviewId
      );

      const conflictDetected = conflicts.length > 0;

      // Create new interview record
      const newInterviewId = uuidv4();
      const createQuery = `
        INSERT INTO interviews (
          id, user_id, job_opportunity_id, title, company,
          type, date, scheduled_at, duration, location, video_link, phone_number,
          interviewer_name, interviewer_email, interviewer_title,
          notes, preparation_notes, status, rescheduled_from, conflict_detected
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        RETURNING *
      `;

      await database.query(createQuery, [
        newInterviewId,
        userId,
        currentInterview.jobOpportunityId,
        currentInterview.title,
        currentInterview.company,
        currentInterview.type,
        newScheduledAt, // Set both date and scheduled_at to the same value
        newDuration || currentInterview.duration,
        currentInterview.location,
        currentInterview.videoLink,
        currentInterview.phoneNumber,
        currentInterview.interviewerName,
        currentInterview.interviewerEmail,
        currentInterview.interviewerTitle,
        currentInterview.notes,
        currentInterview.preparationNotes,
        "scheduled",
        interviewId,
        conflictDetected,
      ]);

      // Update original interview
      await database.query(
        `
        UPDATE interviews
        SET status = 'rescheduled',
            rescheduled_to = $1,
            updated_at = now()
        WHERE id = $2 AND user_id = $3
        `,
        [newInterviewId, interviewId, userId]
      );

      const newInterview = await this.getInterviewById(userId, newInterviewId);

      // Sync to Google Calendar if enabled
      try {
        const syncStatus = await googleCalendarService.getSyncStatus(userId);
        if (syncStatus.enabled) {
          await googleCalendarService.createEvent(userId, newInterview);
        }
      } catch (error) {
        console.error("Error syncing rescheduled interview to Google Calendar:", error);
        // Don't fail the interview reschedule if calendar sync fails
      }

      // Cancel old reminders and schedule new ones
      try {
        await reminderService.cancelReminders(interviewId);
        if (newScheduledAt) {
          await reminderService.scheduleReminders(userId, newInterviewId, newScheduledAt);
        }
      } catch (error) {
        console.error("Error rescheduling reminders:", error);
        // Don't fail the interview rescheduling if reminder scheduling fails
      }

      return newInterview;
    } catch (error) {
      console.error("Error rescheduling interview:", error);
      throw error;
    }
  }

  // Update preparation task
  async updatePreparationTask(interviewId, taskId, updateData) {
    try {
      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      if (updateData.completed !== undefined) {
        updateFields.push(`completed = $${paramIndex}`);
        params.push(updateData.completed);
        paramIndex++;
      }

      if (updateData.task !== undefined) {
        updateFields.push(`task = $${paramIndex}`);
        params.push(updateData.task);
        paramIndex++;
      }

      if (updateData.dueDate !== undefined) {
        updateFields.push(`due_date = $${paramIndex}`);
        params.push(updateData.dueDate);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return;
      }

      params.push(taskId, interviewId);
      const query = `
        UPDATE interview_preparation_tasks
        SET ${updateFields.join(", ")}, updated_at = now()
        WHERE id = $${paramIndex} AND interview_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await database.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error("Error updating preparation task:", error);
      throw error;
    }
  }

  // Regenerate preparation tasks for an interview
  async regeneratePreparationTasks(interviewId) {
    try {
      // Clear existing tasks
      await database.query(
        `DELETE FROM interview_preparation_tasks WHERE interview_id = $1`,
        [interviewId]
      );

      // Re-generate using the latest interview/job data
      await this.generateDefaultPreparationTasks(interviewId, null);

      // Return updated list of tasks
      const result = await database.query(
        `
        SELECT id, task, completed, due_date AS "dueDate", created_at AS "createdAt"
        FROM interview_preparation_tasks
        WHERE interview_id = $1
        ORDER BY due_date NULLS LAST, created_at ASC
        `,
        [interviewId]
      );

      return result.rows;
    } catch (error) {
      console.error("Error regenerating preparation tasks:", error);
      throw error;
    }
  }

  // Delete interview
  async deleteInterview(userId, interviewId) {
    try {
      const query = `
        DELETE FROM interviews
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [interviewId, userId]);
      if (result.rows.length === 0) {
        throw new Error("Interview not found");
      }

      // Delete from Google Calendar if event exists
      try {
        const interview = await this.getInterviewById(userId, interviewId);
        if (interview && interview.googleCalendarEventId) {
          const syncStatus = await googleCalendarService.getSyncStatus(userId);
          if (syncStatus.enabled) {
            await googleCalendarService.deleteEvent(userId, interview.googleCalendarEventId);
          }
        }
      } catch (error) {
        console.error("Error deleting interview from Google Calendar:", error);
        // Don't fail the interview deletion if calendar sync fails
      }

      return { id: interviewId };
    } catch (error) {
      console.error("Error deleting interview:", error);
      throw error;
    }
  }

  // Map database row to interview object
  mapInterviewRow(row) {
    return {
      id: row.id,
      jobOpportunityId: row.job_opportunity_id,
      title: row.title,
      company: row.company,
      interviewType: row.type,
      scheduledAt: row.scheduled_at,
      googleCalendarEventId: row.google_calendar_event_id,
      duration: row.duration,
      location: row.location,
      videoLink: row.video_link,
      phoneNumber: row.phone_number,
      interviewerName: row.interviewer_name,
      interviewerEmail: row.interviewer_email,
      interviewerTitle: row.interviewer_title,
      notes: row.notes,
      preparationNotes: row.preparation_notes,
      status: row.status,
      outcome: row.outcome,
      outcomeNotes: row.outcome_notes,
      reminderSent: row.reminder_sent || false,
      reminderSentAt: row.reminder_sent_at,
      cancelledAt: row.cancelled_at,
      cancellationReason: row.cancellation_reason,
      rescheduledFrom: row.rescheduled_from,
      rescheduledTo: row.rescheduled_to,
      conflictDetected: row.conflict_detected || false,
      preparationTasks: row.preparation_tasks || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new InterviewService();

