import { v4 as uuidv4 } from "uuid";
import database from "./database.js";

class NetworkingEventService {
  // Create a new networking event
  async createEvent(userId, eventData) {
    const {
      eventName,
      eventType,
      industry,
      location,
      eventDate,
      eventTime,
      endDate,
      endTime,
      eventUrl,
      isVirtual,
      description,
      networkingGoals,
      preparationNotes,
      attended,
      attendanceDate,
      postEventNotes,
      roiScore,
      connectionsMadeCount,
    } = eventData;

    try {
      const eventId = uuidv4();

      const query = `
        INSERT INTO networking_events (
          id, user_id, event_name, event_type, industry, location,
          event_date, event_time, end_date, end_time, event_url, is_virtual,
          description, networking_goals, preparation_notes, attended, attendance_date,
          post_event_notes, roi_score, connections_made_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `;

      const result = await database.query(query, [
        eventId,
        userId,
        eventName,
        eventType || null,
        industry || null,
        location || null,
        eventDate,
        eventTime || null,
        endDate || null,
        endTime || null,
        eventUrl || null,
        isVirtual || false,
        description || null,
        networkingGoals || null,
        preparationNotes || null,
        attended || false,
        attendanceDate || null,
        postEventNotes || null,
        roiScore || null,
        connectionsMadeCount || 0,
      ]);

      const event = this.mapRowToEvent(result.rows[0]);

      // Automatically register the creator for their own event
      try {
        await this.registerForEvent(eventId, userId);
      } catch (regError) {
        console.warn("⚠️ Could not register creator for event:", regError);
        // Don't fail event creation if registration fails
      }

      return event;
    } catch (error) {
      console.error("❌ Error creating networking event:", error);
      throw error;
    }
  }

  // Get all public events from all users (for discovery)
  async getAllPublicEvents(filters = {}, currentUserId = null) {
    try {
      let query = `
        SELECT 
          ne.*, 
          u.email as creator_email,
          COUNT(er.id) as signup_count,
          CASE WHEN EXISTS (
            SELECT 1 FROM event_registrations er2 
            WHERE er2.event_id = ne.id AND er2.user_id = $1
          ) THEN true ELSE false END as is_registered,
          ne.created_at
        FROM networking_events ne
        JOIN users u ON ne.user_id = u.u_id
        LEFT JOIN event_registrations er ON ne.id = er.event_id
        WHERE 1=1
      `;
      const params = [currentUserId || null];

      // Apply filters
      if (filters.industry) {
        params.push(`%${filters.industry}%`);
        query += ` AND ne.industry ILIKE $${params.length}`;
      }
      if (filters.location) {
        params.push(`%${filters.location}%`);
        query += ` AND ne.location ILIKE $${params.length}`;
      }
      if (filters.search) {
        params.push(`%${filters.search}%`);
        query += ` AND (
          ne.event_name ILIKE $${params.length} OR
          ne.description ILIKE $${params.length} OR
          ne.location ILIKE $${params.length} OR
          ne.industry ILIKE $${params.length}
        )`;
      }
      if (filters.startDate) {
        params.push(filters.startDate);
        query += ` AND ne.event_date >= $${params.length}`;
      }
      if (filters.endDate) {
        params.push(filters.endDate);
        query += ` AND ne.event_date <= $${params.length}`;
      }

      // Show all events (upcoming and recent past events within 30 days, or events without dates)
      query += ` AND (ne.event_date IS NULL OR ne.event_date >= CURRENT_DATE - INTERVAL '30 days')`;

      query += ` GROUP BY ne.id, u.email`;

      query += ` ORDER BY ne.event_date ASC, ne.event_time ASC NULLS LAST`;

      if (filters.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      }

      const result = await database.query(query, params);
      return result.rows.map((row) => {
        const event = this.mapRowToEvent(row);
        return {
          ...event,
          name: event.eventName, // Map eventName to name for DiscoveredEvent interface
          startDate: event.eventDate,
          startTime: event.eventTime,
          endDate: event.endDate,
          endTime: event.endTime,
          category: event.industry,
          creatorEmail: row.creator_email,
          signupCount: parseInt(row.signup_count) || 0,
          isRegistered: row.is_registered || false,
          createdAt: row.created_at,
        };
      });
    } catch (error) {
      console.error("❌ Error getting public events:", error);
      throw error;
    }
  }

  // Register a user for an event
  async registerForEvent(eventId, userId) {
    try {
      // Check if event is cancelled or has ended
      const eventCheck = await database.query(
        "SELECT cancelled, end_date, end_time FROM networking_events WHERE id = $1",
        [eventId]
      );

      if (eventCheck.rows.length === 0) {
        throw new Error("Event not found");
      }

      if (eventCheck.rows[0].cancelled) {
        throw new Error("Cannot register for a cancelled event");
      }

      // Check if event has ended
      const event = eventCheck.rows[0];
      if (event.end_date) {
        const now = new Date();
        const endDate = new Date(event.end_date);
        
        // If end date is in the past, event has ended
        if (endDate < new Date(now.toDateString())) {
          throw new Error("Cannot register for an event that has already ended");
        }
        
        // If end date is today, check end time
        if (endDate.toDateString() === now.toDateString() && event.end_time) {
          const [hours, minutes] = event.end_time.split(':').map(Number);
          const endDateTime = new Date(endDate);
          endDateTime.setHours(hours, minutes, 0, 0);
          if (now >= endDateTime) {
            throw new Error("Cannot register for an event that has already ended");
          }
        }
      }

      // Check if already registered
      const existing = await database.query(
        "SELECT id FROM event_registrations WHERE event_id = $1 AND user_id = $2",
        [eventId, userId]
      );

      if (existing.rows.length > 0) {
        return { alreadyRegistered: true };
      }

      // Register user
      const registrationId = uuidv4();
      const query = `
        INSERT INTO event_registrations (id, event_id, user_id, status)
        VALUES ($1, $2, $3, 'registered')
        RETURNING *
      `;

      const result = await database.query(query, [registrationId, eventId, userId]);
      return { registration: result.rows[0], alreadyRegistered: false };
    } catch (error) {
      console.error("❌ Error registering for event:", error);
      throw error;
    }
  }

  // Get signup count for an event
  async getEventSignupCount(eventId) {
    try {
      const result = await database.query(
        "SELECT COUNT(*) as count FROM event_registrations WHERE event_id = $1",
        [eventId]
      );
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error("❌ Error getting signup count:", error);
      return 0;
    }
  }

  // Unregister a user from an event
  async unregisterFromEvent(eventId, userId) {
    try {
      const query = `
        DELETE FROM event_registrations
        WHERE event_id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [eventId, userId]);

      if (result.rows.length === 0) {
        return { success: false, message: "Registration not found" };
      }

      return { success: true, message: "Successfully unregistered from event" };
    } catch (error) {
      console.error("❌ Error unregistering from event:", error);
      throw error;
    }
  }

  // Get all attendees for an event with their profile information (excluding current user)
  async getEventAttendees(eventId, currentUserId = null) {
    try {
      let query = `
        SELECT 
          er.id as registration_id,
          er.registered_at,
          er.status,
          u.u_id as user_id,
          u.email,
          p.first_name,
          p.last_name,
          p.industry,
          p.job_title,
          p.city,
          p.state
        FROM event_registrations er
        JOIN users u ON er.user_id = u.u_id
        LEFT JOIN profiles p ON u.u_id = p.user_id
        WHERE er.event_id = $1
      `;
      const params = [eventId];

      // Exclude current user from the list
      if (currentUserId) {
        query += ` AND er.user_id != $2`;
        params.push(currentUserId);
      }

      query += ` ORDER BY er.registered_at ASC`;

      const result = await database.query(query, params);

      return result.rows.map((row) => ({
        registrationId: row.registration_id,
        userId: row.user_id,
        email: row.email,
        firstName: row.first_name || "",
        lastName: row.last_name || "",
        fullName: `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Unknown",
        industry: row.industry || "",
        jobTitle: row.job_title || "",
        location: row.city && row.state 
          ? `${row.city}, ${row.state}`
          : row.city || row.state || "",
        registeredAt: row.registered_at,
        status: row.status,
      }));
    } catch (error) {
      console.error("❌ Error getting event attendees:", error);
      throw error;
    }
  }

  // Get or create event goals for a user
  async getEventGoals(eventId, userId) {
    try {
      // First get the goals
      const goalsQuery = `
        SELECT 
          ng.*,
          ne.event_name,
          ne.event_date
        FROM networking_goals ng
        JOIN networking_events ne ON ng.event_id = ne.id
        WHERE ng.event_id = $1 AND ng.user_id = $2
      `;

      const goalsResult = await database.query(goalsQuery, [eventId, userId]);

      if (goalsResult.rows.length === 0) {
        return null;
      }

      const row = goalsResult.rows[0];
      // Then count connections for this event
      const connectionQuery = `
        SELECT COUNT(DISTINCT ec.contact_id) as connection_count
        FROM event_connections ec
        WHERE ec.event_id = $1
      `;

      const connectionResult = await database.query(connectionQuery, [eventId]);
      const connectionCount = parseInt(connectionResult.rows[0]?.connection_count) || 0;

      // Persist the up-to-date connection count on the networking_goals row
      try {
        await database.query(
          `
            UPDATE networking_goals
            SET current_count = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `,
          [connectionCount, row.id]
        );
      } catch (updateErr) {
        console.warn("⚠️ Failed to update networking_goals.current_count:", updateErr);
      }
      
      return {
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        eventName: row.event_name,
        eventDate: row.event_date,
        goalDescription: row.goal_description,
        targetIndustry: row.target_industry,
        targetCompanies: row.target_companies || [],
        targetRoles: row.target_roles || [],
        goalType: row.goal_type,
        targetCount: row.target_count,
        currentCount: connectionCount,
        deadline: row.deadline,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error("❌ Error getting event goals:", error);
      throw error;
    }
  }

  // Create or update event goals
  async upsertEventGoals(eventId, userId, goalsData) {
    try {
      // Check if goals exist
      const existing = await this.getEventGoals(eventId, userId);

      if (existing) {
        // Update existing goals
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (goalsData.goalDescription !== undefined) {
          updates.push(`goal_description = $${paramIndex++}`);
          values.push(goalsData.goalDescription);
        }
        if (goalsData.targetIndustry !== undefined) {
          updates.push(`target_industry = $${paramIndex++}`);
          values.push(goalsData.targetIndustry);
        }
        if (goalsData.targetCompanies !== undefined) {
          updates.push(`target_companies = $${paramIndex++}`);
          values.push(JSON.stringify(goalsData.targetCompanies));
        }
        if (goalsData.targetRoles !== undefined) {
          updates.push(`target_roles = $${paramIndex++}`);
          values.push(JSON.stringify(goalsData.targetRoles));
        }
        if (goalsData.goalType !== undefined) {
          updates.push(`goal_type = $${paramIndex++}`);
          values.push(goalsData.goalType);
        }
        if (goalsData.targetCount !== undefined) {
          updates.push(`target_count = $${paramIndex++}`);
          values.push(goalsData.targetCount);
        }
        // Don't allow manual updates to currentCount - it's automatically calculated from event_connections
        // if (goalsData.currentCount !== undefined) {
        //   updates.push(`current_count = $${paramIndex++}`);
        //   values.push(goalsData.currentCount);
        // }
        if (goalsData.deadline !== undefined) {
          updates.push(`deadline = $${paramIndex++}`);
          values.push(goalsData.deadline);
        }
        if (goalsData.status !== undefined) {
          updates.push(`status = $${paramIndex++}`);
          values.push(goalsData.status);
        }

        if (updates.length === 0) {
          // Even if nothing else changed, return the latest, fully computed goals
          return await this.getEventGoals(eventId, userId);
        }

        values.push(existing.id);
        const query = `
          UPDATE networking_goals
          SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        await database.query(query, values);
      } else {
        // Create new goals
        const goalId = uuidv4();

        // Start current_count at the real number of connections already made
        const connectionResult = await database.query(
          `
            SELECT COUNT(DISTINCT ec.contact_id) as connection_count
            FROM event_connections ec
            WHERE ec.event_id = $1
          `,
          [eventId]
        );
        const connectionCount = parseInt(connectionResult.rows[0]?.connection_count) || 0;

        const query = `
          INSERT INTO networking_goals (
            id, user_id, event_id, goal_description, target_industry,
            target_companies, target_roles, goal_type, target_count,
            current_count, deadline, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `;

        await database.query(query, [
          goalId,
          userId,
          eventId,
          goalsData.goalDescription || null,
          goalsData.targetIndustry || null,
          JSON.stringify(goalsData.targetCompanies || []),
          JSON.stringify(goalsData.targetRoles || []),
          goalsData.goalType || null,
          goalsData.targetCount || 0,
          connectionCount,
          goalsData.deadline || null,
          goalsData.status || "active",
        ]);
      }

      // Always return the fully up-to-date goals, with currentCount derived from event_connections
      return await this.getEventGoals(eventId, userId);
    } catch (error) {
      console.error("❌ Error upserting event goals:", error);
      throw error;
    }
  }

  // Helper to map goals row
  mapGoalsRow(row, eventId) {
    return {
      id: row.id,
      userId: row.user_id,
      eventId: row.event_id || eventId,
      goalDescription: row.goal_description,
      targetIndustry: row.target_industry,
      targetCompanies: row.target_companies || [],
      targetRoles: row.target_roles || [],
      goalType: row.goal_type,
      targetCount: row.target_count,
      currentCount: row.current_count,
      deadline: row.deadline,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Get all events for a user (events they created OR events they registered for, including signup counts)
  async getEventsByUserId(userId, filters = {}) {
    try {
      let query = `
        SELECT DISTINCT
          ne.*,
          COUNT(DISTINCT er.id) as signup_count
        FROM networking_events ne
        LEFT JOIN event_registrations er ON ne.id = er.event_id
        WHERE ne.user_id = $1 OR EXISTS (
          SELECT 1 FROM event_registrations er2 
          WHERE er2.event_id = ne.id AND er2.user_id = $1
        )
      `;
      const params = [userId];

      // Apply filters
      if (filters.industry) {
        query += ` AND industry = $${params.length + 1}`;
        params.push(filters.industry);
      }
      if (filters.attended !== undefined) {
        query += ` AND attended = $${params.length + 1}`;
        params.push(filters.attended);
      }
      if (filters.startDate) {
        query += ` AND event_date >= $${params.length + 1}`;
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        query += ` AND event_date <= $${params.length + 1}`;
        params.push(filters.endDate);
      }
      if (filters.search) {
        query += ` AND (
          ne.event_name ILIKE $${params.length + 1} OR
          ne.description ILIKE $${params.length + 1} OR
          ne.location ILIKE $${params.length + 1}
        )`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      query += ` GROUP BY ne.id`;
      query += ` ORDER BY ne.event_date ASC, ne.event_time ASC NULLS LAST`;

      const result = await database.query(query, params);
      return result.rows.map((row) => ({
        ...this.mapRowToEvent(row),
        signupCount: parseInt(row.signup_count) || 0,
      }));
    } catch (error) {
      console.error("❌ Error getting events:", error);
      throw error;
    }
  }

  // Get event by ID
  async getEventById(eventId, userId) {
    try {
      const query = `
        SELECT *
        FROM networking_events
        WHERE id = $1 AND user_id = $2
      `;

      const result = await database.query(query, [eventId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEvent(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting event by ID:", error);
      throw error;
    }
  }

  // Update event
  async updateEvent(eventId, userId, eventData) {
    try {
      // First, verify the event belongs to the user
      const existing = await this.getEventById(eventId, userId);
      if (!existing) {
        throw new Error("Event not found");
      }

      const fields = [];
      const values = [];
      let paramIndex = 1;

      const fieldMap = {
        eventName: "event_name",
        eventType: "event_type",
        industry: "industry",
        location: "location",
        eventDate: "event_date",
        eventTime: "event_time",
        endDate: "end_date",
        endTime: "end_time",
        eventUrl: "event_url",
        isVirtual: "is_virtual",
        description: "description",
        networkingGoals: "networking_goals",
        preparationNotes: "preparation_notes",
        attended: "attended",
        attendanceDate: "attendance_date",
        postEventNotes: "post_event_notes",
        roiScore: "roi_score",
        connectionsMadeCount: "connections_made_count",
      };

      for (const [key, value] of Object.entries(eventData)) {
        if (value !== undefined && fieldMap[key]) {
          // Convert empty strings to null for optional fields
          const dbValue = (value === "" && (key === "industry" || key === "location" || key === "eventUrl" || key === "description" || key === "eventTime" || key === "endTime")) 
            ? null 
            : value;
          fields.push(`${fieldMap[key]} = $${paramIndex}`);
          values.push(dbValue);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        return existing;
      }

      // Always update updated_at
      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(eventId, userId);
      const query = `
        UPDATE networking_events
        SET ${fields.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Failed to update event");
      }

      return this.mapRowToEvent(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating event:", error);
      throw error;
    }
  }

  // Delete event (mark as cancelled instead of actually deleting)
  async deleteEvent(eventId, userId) {
    try {
      // First, verify the event belongs to the user
      const existing = await this.getEventById(eventId, userId);
      if (!existing) {
        throw new Error("Event not found");
      }

      // Mark as cancelled instead of deleting
      const query = `
        UPDATE networking_events
        SET cancelled = true, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [eventId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Failed to cancel event");
      }

      return { success: true, message: "Event cancelled successfully", event: this.mapRowToEvent(result.rows[0]) };
    } catch (error) {
      console.error("❌ Error cancelling event:", error);
      throw error;
    }
  }

  // Get upcoming events
  async getUpcomingEvents(userId) {
    try {
      const query = `
        SELECT *
        FROM networking_events
        WHERE user_id = $1
          AND event_date >= CURRENT_DATE
          AND attended = false
        ORDER BY event_date ASC, event_time ASC
      `;

      const result = await database.query(query, [userId]);
      return result.rows.map(this.mapRowToEvent);
    } catch (error) {
      console.error("❌ Error getting upcoming events:", error);
      throw error;
    }
  }

  // Get connections made at an event
  async getEventConnections(eventId, userId) {
    try {
      // Verify user is registered for the event or is the creator
      const eventCheck = await database.query(
        `SELECT user_id FROM networking_events WHERE id = $1`,
        [eventId]
      );
      if (eventCheck.rows.length === 0) {
        throw new Error("Event not found");
      }

      // Check if user is registered for the event or is the creator
      const registrationCheck = await database.query(
        `SELECT 1 FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
        [eventId, userId]
      );
      const isCreator = eventCheck.rows[0].user_id === userId;
      const isRegistered = registrationCheck.rows.length > 0;

      if (!isCreator && !isRegistered) {
        throw new Error("You are not registered for this event");
      }

      // Get connections where the contact belongs to the user
      const query = `
        SELECT ec.*, pc.first_name, pc.last_name, pc.email, pc.company, pc.job_title, pc.industry
        FROM event_connections ec
        JOIN professional_contacts pc ON ec.contact_id = pc.id
        WHERE ec.event_id = $1 AND pc.user_id = $2
        ORDER BY ec.created_at DESC
      `;

      const result = await database.query(query, [eventId, userId]);
      return result.rows.map((row) => ({
        id: row.id,
        eventId: row.event_id,
        contactId: row.contact_id,
        contactName: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
        contactEmail: row.email,
        contactCompany: row.company,
        contactJobTitle: row.job_title,
        contactIndustry: row.industry,
        connectionQuality: row.connection_quality,
        followupRequired: row.followup_required,
        followupCompleted: row.followup_completed,
        notes: row.notes,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error("❌ Error getting event connections:", error);
      throw error;
    }
  }

  // Add connection to event
  async addEventConnection(eventId, userId, connectionData) {
    try {
      // Verify event belongs to user
      const event = await this.getEventById(eventId, userId);
      if (!event) {
        throw new Error("Event not found");
      }

      const { contactId, connectionQuality, followupRequired, notes } = connectionData;

      // Check if a connection for this contact and event already exists
      // This keeps counts accurate and prevents double-counting the same person
      const existingConnectionResult = await database.query(
        `
          SELECT id, event_id, contact_id, connection_quality, followup_required, followup_completed, notes, created_at
          FROM event_connections
          WHERE event_id = $1 AND contact_id = $2
        `,
        [eventId, contactId]
      );

      if (existingConnectionResult.rows.length > 0) {
        const existing = existingConnectionResult.rows[0];
        return {
          id: existing.id,
          eventId: existing.event_id,
          contactId: existing.contact_id,
          connectionQuality: existing.connection_quality,
          followupRequired: existing.followup_required,
          followupCompleted: existing.followup_completed,
          notes: existing.notes,
          createdAt: existing.created_at,
        };
      }

      const connectionId = uuidv4();

      const query = `
        INSERT INTO event_connections (
          id, event_id, contact_id, connection_quality, followup_required, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await database.query(query, [
        connectionId,
        eventId,
        contactId,
        connectionQuality || null,
        followupRequired || false,
        notes || null,
      ]);

      // Update connections count
      await database.query(
        `UPDATE networking_events 
         SET connections_made_count = connections_made_count + 1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [eventId]
      );

      return {
        id: result.rows[0].id,
        eventId: result.rows[0].event_id,
        contactId: result.rows[0].contact_id,
        connectionQuality: result.rows[0].connection_quality,
        followupRequired: result.rows[0].followup_required,
        followupCompleted: result.rows[0].followup_completed,
        notes: result.rows[0].notes,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      console.error("❌ Error adding event connection:", error);
      throw error;
    }
  }

  // Helper method to map database row to event object
  mapRowToEvent(row) {
    return {
      id: row.id,
      userId: row.user_id,
      eventName: row.event_name,
      eventType: row.event_type,
      industry: row.industry,
      location: row.location,
      eventDate: row.event_date,
      eventTime: row.event_time,
      endDate: row.end_date,
      endTime: row.end_time,
      eventUrl: row.event_url,
      isVirtual: row.is_virtual || false,
      description: row.description,
      networkingGoals: row.networking_goals,
      preparationNotes: row.preparation_notes,
      attended: row.attended,
      attendanceDate: row.attendance_date,
      postEventNotes: row.post_event_notes,
      roiScore: row.roi_score,
      connectionsMadeCount: row.connections_made_count,
      cancelled: row.cancelled || false,
      cancelledAt: row.cancelled_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new NetworkingEventService();

