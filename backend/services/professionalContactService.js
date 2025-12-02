import { v4 as uuidv4 } from "uuid";
import database from "./database.js";
import userService from "./userService.js";

class ProfessionalContactService {
  // Check if contact exists by email
  async getContactByEmail(userId, email) {
    try {
      if (!email) {
        return null;
      }

      const query = `
        SELECT *
        FROM professional_contacts
        WHERE user_id = $1 AND LOWER(email) = LOWER($2)
        LIMIT 1
      `;

      const result = await database.query(query, [userId, email]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToContact(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting contact by email:", error);
      throw error;
    }
  }

  async getExistingContactEmails(userId) {
    try {
      const query = `
        SELECT LOWER(email) AS email
        FROM professional_contacts
        WHERE user_id = $1 AND email IS NOT NULL
      `;

      const result = await database.query(query, [userId]);
      return new Set(result.rows.map((row) => row.email));
    } catch (error) {
      console.error("❌ Error getting existing contact emails:", error);
      throw error;
    }
  }

  // Create a new contact
  async createContact(userId, contactData) {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      industry,
      location,
      relationshipType,
      relationshipStrength,
      relationshipContext,
      personalInterests,
      professionalInterests,
      linkedinUrl,
      notes,
      importedFrom,
      lastInteractionDate,
      nextReminderDate,
      contactUserId,
    } = contactData;

    try {
      // Check if contact with same email already exists
      if (email) {
        const existingContact = await this.getContactByEmail(userId, email);
        if (existingContact) {
          throw new Error("A contact with this email already exists");
        }
      }

      // If contactUserId is not provided but email is, try to find the user by email
      let finalContactUserId = contactUserId;
      if (!finalContactUserId && email) {
        try {
          // Try case-insensitive lookup
          const query = `
            SELECT u_id, email
            FROM users
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
          `;
          const result = await database.query(query, [email]);
          if (result.rows.length > 0) {
            finalContactUserId = result.rows[0].u_id;
            console.log("✅ Found user for contact email:", email, "user_id:", result.rows[0].u_id);
          } else {
            console.log("⚠️ No user found for contact email:", email);
          }
        } catch (err) {
          // If user lookup fails, just continue without setting contactUserId
          console.log("❌ Error looking up user by email:", email, err.message);
        }
      } else if (finalContactUserId) {
        console.log("✅ Using provided contactUserId:", finalContactUserId);
      }

      // Prevent users from adding themselves as a contact
      if (finalContactUserId === userId) {
        throw new Error("You cannot add yourself as a contact");
      }

      // Also check if the email matches the current user's email
      if (email) {
        try {
          const userQuery = `
            SELECT u_id, email
            FROM users
            WHERE u_id = $1
            LIMIT 1
          `;
          const userResult = await database.query(userQuery, [userId]);
          if (userResult.rows.length > 0) {
            const currentUserEmail = userResult.rows[0].email;
            if (currentUserEmail && email.toLowerCase() === currentUserEmail.toLowerCase()) {
              throw new Error("You cannot add yourself as a contact");
            }
          }
        } catch (err) {
          // If it's our custom error, re-throw it
          if (err.message === "You cannot add yourself as a contact") {
            throw err;
          }
          // Otherwise, log and continue (don't block contact creation if user lookup fails)
          console.log("⚠️ Error checking current user email:", err.message);
        }
      }

      const contactId = uuidv4();

      const query = `
        INSERT INTO professional_contacts (
          id, user_id, first_name, last_name, email, phone, company,
          job_title, industry, location, relationship_type, relationship_strength,
          relationship_context, personal_interests, professional_interests,
          linkedin_url, notes, imported_from, last_interaction_date, next_reminder_date,
          contact_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `;

      const result = await database.query(query, [
        contactId,
        userId,
        firstName || null,
        lastName || null,
        email || null,
        phone || null,
        company || null,
        jobTitle || null,
        industry || null,
        location || null,
        relationshipType || null,
        relationshipStrength || null,
        relationshipContext || null,
        personalInterests || null,
        professionalInterests || null,
        linkedinUrl || null,
        notes || null,
        importedFrom || null,
        lastInteractionDate || null,
        nextReminderDate || null,
        finalContactUserId || null,
      ]);

      return this.mapRowToContact(result.rows[0]);
    } catch (error) {
      console.error("❌ Error creating contact:", error);
      throw error;
    }
  }

  // Sync contact information from user profile if contact has contact_user_id
  async syncContactFromProfile(contactId, contactUserId) {
    try {
      if (!contactUserId) {
        return; // No user to sync from
      }

      // Get profile information
      const profileQuery = `
        SELECT 
          p.first_name, 
          p.last_name, 
          p.phone, 
          p.job_title, 
          p.industry,
          p.city,
          p.state,
          p.pfp_link,
          u.email
        FROM profiles p
        JOIN users u ON p.user_id = u.u_id
        WHERE p.user_id = $1
      `;
      const profileResult = await database.query(profileQuery, [contactUserId]);

      if (profileResult.rows.length === 0) {
        return; // Profile doesn't exist
      }

      const profile = profileResult.rows[0];

      // Get current job from jobs table
      const jobQuery = `
        SELECT company, title, location
        FROM jobs
        WHERE user_id = $1 AND is_current = true
        ORDER BY start_date DESC
        LIMIT 1
      `;
      const jobResult = await database.query(jobQuery, [contactUserId]);

      // Build update fields
      const updates = [];
      const values = [];
      let paramIndex = 1;

      // Sync profile information if available
      if (profile.first_name) {
        updates.push(`first_name = $${paramIndex++}`);
        values.push(profile.first_name);
      }
      if (profile.last_name) {
        updates.push(`last_name = $${paramIndex++}`);
        values.push(profile.last_name);
      }
      if (profile.email) {
        updates.push(`email = $${paramIndex++}`);
        values.push(profile.email);
      }
      if (profile.phone) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(profile.phone);
      }
      if (profile.job_title) {
        updates.push(`job_title = $${paramIndex++}`);
        values.push(profile.job_title);
      }
      if (profile.industry) {
        updates.push(`industry = $${paramIndex++}`);
        values.push(profile.industry);
      }
      if (profile.city && profile.state) {
        updates.push(`location = $${paramIndex++}`);
        values.push(`${profile.city}, ${profile.state}`);
      }

      // Sync current job information if available
      if (jobResult.rows.length > 0) {
        const job = jobResult.rows[0];
        if (job.company) {
          updates.push(`company = $${paramIndex++}`);
          values.push(job.company);
        }
        if (job.title && !profile.job_title) {
          // Only update job_title from job if profile doesn't have one
          updates.push(`job_title = $${paramIndex++}`);
          values.push(job.title);
        }
      }

      // Only update if there are fields to update
      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(contactId);

        const updateQuery = `
          UPDATE professional_contacts
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex}
        `;

        await database.query(updateQuery, values);
      }
    } catch (error) {
      console.error(`❌ Error syncing contact ${contactId} from profile:`, error);
      // Don't throw - continue with other contacts even if one fails
    }
  }

  // Get all contacts for a user
  async getContactsByUserId(userId, filters = {}) {
    try {
      let query = `
        SELECT 
          pc.*,
          p.pfp_link as contact_profile_picture
        FROM professional_contacts pc
        LEFT JOIN profiles p ON pc.contact_user_id = p.user_id
        WHERE pc.user_id = $1
      `;
      const params = [userId];

      // Apply filters
      if (filters.industry) {
        query += ` AND industry = $${params.length + 1}`;
        params.push(filters.industry);
      }
      if (filters.relationshipType) {
        query += ` AND relationship_type = $${params.length + 1}`;
        params.push(filters.relationshipType);
      }
      if (filters.company) {
        query += ` AND company = $${params.length + 1}`;
        params.push(filters.company);
      }
      if (filters.search) {
        query += ` AND (
          first_name ILIKE $${params.length + 1} OR
          last_name ILIKE $${params.length + 1} OR
          email ILIKE $${params.length + 1} OR
          company ILIKE $${params.length + 1} OR
          job_title ILIKE $${params.length + 1}
        )`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      query += ` ORDER BY first_name ASC, last_name ASC`;

      const result = await database.query(query, params);
      let contacts = result.rows.map(this.mapRowToContact);

      // Sync contact information from profiles for contacts that have contact_user_id
      // This updates the database with the latest information from user profiles
      const contactsToSync = contacts.filter(contact => contact.contactUserId);
      if (contactsToSync.length > 0) {
        // Sync all contacts that have a linked user account
        // Use Promise.allSettled to ensure we don't fail if one sync fails
        await Promise.allSettled(
          contactsToSync.map(contact => 
            this.syncContactFromProfile(contact.id, contact.contactUserId)
          )
        );

        // Re-fetch all contacts after syncing to get updated information
        // This ensures we return the latest data with all filters applied
        const refreshResult = await database.query(query, params);
        contacts = refreshResult.rows.map(this.mapRowToContact);
      }

      return contacts;
    } catch (error) {
      console.error("❌ Error getting contacts:", error);
      throw error;
    }
  }

  // Get contact by ID
  async getContactById(contactId, userId) {
    try {
      const query = `
        SELECT 
          pc.*,
          p.pfp_link as contact_profile_picture
        FROM professional_contacts pc
        LEFT JOIN profiles p ON pc.contact_user_id = p.user_id
        WHERE pc.id = $1 AND pc.user_id = $2
      `;

      const result = await database.query(query, [contactId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const contact = this.mapRowToContact(result.rows[0]);

      // Sync contact information from profile if it has contact_user_id
      if (contact.contactUserId) {
        await this.syncContactFromProfile(contactId, contact.contactUserId);
        
        // Re-fetch to get updated information
        const refreshResult = await database.query(query, [contactId, userId]);
        if (refreshResult.rows.length > 0) {
          return this.mapRowToContact(refreshResult.rows[0]);
        }
      }

      return contact;
    } catch (error) {
      console.error("❌ Error getting contact by ID:", error);
      throw error;
    }
  }

  // Update contact
  async updateContact(contactId, userId, contactData) {
    try {
      // First, verify the contact belongs to the user
      const existing = await this.getContactById(contactId, userId);
      if (!existing) {
        throw new Error("Contact not found");
      }

      const fields = [];
      const values = [];
      let paramIndex = 1;

      const fieldMap = {
        firstName: "first_name",
        lastName: "last_name",
        email: "email",
        phone: "phone",
        company: "company",
        jobTitle: "job_title",
        industry: "industry",
        location: "location",
        relationshipType: "relationship_type",
        relationshipStrength: "relationship_strength",
        relationshipContext: "relationship_context",
        personalInterests: "personal_interests",
        professionalInterests: "professional_interests",
        linkedinUrl: "linkedin_url",
        notes: "notes",
        importedFrom: "imported_from",
        lastInteractionDate: "last_interaction_date",
        nextReminderDate: "next_reminder_date",
        contactUserId: "contact_user_id",
      };

      for (const [key, value] of Object.entries(contactData)) {
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

      values.push(contactId, userId);
      const query = `
        UPDATE professional_contacts
        SET ${fields.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Failed to update contact");
      }

      return this.mapRowToContact(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating contact:", error);
      throw error;
    }
  }

  // Delete contact
  async deleteContact(contactId, userId) {
    try {
      // First, verify the contact belongs to the user
      const existing = await this.getContactById(contactId, userId);
      if (!existing) {
        throw new Error("Contact not found");
      }

      const query = `
        DELETE FROM professional_contacts
        WHERE id = $1 AND user_id = $2
      `;

      await database.query(query, [contactId, userId]);

      return { success: true, message: "Contact deleted successfully" };
    } catch (error) {
      console.error("❌ Error deleting contact:", error);
      throw error;
    }
  }

  // Get contacts needing reminder
  async getContactsNeedingReminder(userId) {
    try {
      const query = `
        SELECT *
        FROM professional_contacts
        WHERE user_id = $1
          AND next_reminder_date IS NOT NULL
          AND next_reminder_date <= CURRENT_DATE
        ORDER BY next_reminder_date ASC
      `;

      const result = await database.query(query, [userId]);
      return result.rows.map(this.mapRowToContact);
    } catch (error) {
      console.error("❌ Error getting contacts needing reminder:", error);
      throw error;
    }
  }

  // Get interaction history for a contact (includes interactions and networking events)
  async getContactInteractions(contactId, userId) {
    try {
      // Verify contact belongs to user
      const contact = await this.getContactById(contactId, userId);
      if (!contact) {
        throw new Error("Contact not found");
      }

      // Get contact interactions
      const interactionsQuery = `
        SELECT *
        FROM contact_interactions
        WHERE contact_id = $1
        ORDER BY interaction_date DESC, created_at DESC
      `;

      const interactionsResult = await database.query(interactionsQuery, [contactId]);
      const interactions = interactionsResult.rows.map((row) => ({
        id: row.id,
        contactId: row.contact_id,
        interactionType: row.interaction_type,
        interactionDate: row.interaction_date,
        summary: row.summary,
        notes: row.notes,
        createdAt: row.created_at,
        source: "interaction",
      }));

      // Get networking events where both user and contact (by email) are registered
      const eventsQuery = `
        SELECT DISTINCT
          ne.id as event_id,
          ne.event_name,
          ne.event_type,
          ne.event_date,
          ne.event_time,
          ne.location,
          ne.industry,
          er1.registered_at as user_registered_at,
          er2.registered_at as contact_registered_at,
          ne.attended as user_attended,
          ne.attendance_date
        FROM networking_events ne
        INNER JOIN event_registrations er1 ON ne.id = er1.event_id AND er1.user_id = $1
        INNER JOIN event_registrations er2 ON ne.id = er2.event_id
        INNER JOIN users u ON er2.user_id = u.u_id
        WHERE LOWER(u.email) = LOWER($2)
        ORDER BY ne.event_date DESC, ne.event_time DESC
      `;

      const contactEmail = contact.email;
      let events = [];
      if (contactEmail) {
        const eventsResult = await database.query(eventsQuery, [userId, contactEmail]);
        events = eventsResult.rows.map((row) => ({
          id: `event_${row.event_id}`,
          contactId: contactId,
          interactionType: "Networking Event",
          interactionDate: row.event_date,
          summary: `Attended ${row.event_name}`,
          notes: row.location ? `Location: ${row.location}` : null,
          createdAt: row.user_registered_at || row.contact_registered_at,
          source: "event",
          eventId: row.event_id,
          eventName: row.event_name,
          eventType: row.event_type,
          eventDate: row.event_date,
          eventTime: row.event_time,
          location: row.location,
          industry: row.industry,
          userAttended: row.user_attended,
          attendanceDate: row.attendance_date,
        }));
      }

      // Get referral requests sent to this contact
      const referralsQuery = `
        SELECT 
          rr.id as referral_id,
          rr.request_status,
          rr.sent_at,
          rr.response_received_at,
          rr.response_content,
          rr.referral_successful,
          rr.personalized_message,
          rr.followup_required,
          rr.gratitude_expressed,
          rr.relationship_impact,
          rr.created_at,
          jo.title as job_title,
          jo.company as job_company
        FROM referral_requests rr
        LEFT JOIN job_opportunities jo ON rr.job_id = jo.id
        WHERE rr.contact_id = $1 AND rr.user_id = $2
        ORDER BY rr.sent_at DESC, rr.created_at DESC
      `;

      const referralsResult = await database.query(referralsQuery, [contactId, userId]);
      const referrals = referralsResult.rows.map((row) => ({
        id: `referral_${row.referral_id}`,
        contactId: contactId,
        interactionType: "Referral Request",
        interactionDate: row.sent_at || row.created_at,
        summary: row.job_title && row.job_company
          ? `Referral request for ${row.job_title} at ${row.job_company}`
          : row.job_title
          ? `Referral request for ${row.job_title}`
          : "Referral request",
        notes: row.personalized_message || null,
        createdAt: row.created_at,
        source: "referral",
        referralId: row.referral_id,
        requestStatus: row.request_status,
        sentAt: row.sent_at,
        responseReceivedAt: row.response_received_at,
        responseContent: row.response_content,
        referralSuccessful: row.referral_successful,
        personalizedMessage: row.personalized_message,
        followupRequired: row.followup_required,
        gratitudeExpressed: row.gratitude_expressed,
        relationshipImpact: row.relationship_impact,
        jobTitle: row.job_title,
        jobCompany: row.job_company,
      }));

      // Combine and sort by date
      const allInteractions = [...interactions, ...events, ...referrals];
      allInteractions.sort((a, b) => {
        const dateA = new Date(a.interactionDate || a.createdAt);
        const dateB = new Date(b.interactionDate || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      return allInteractions;
    } catch (error) {
      console.error("❌ Error getting contact interactions:", error);
      throw error;
    }
  }

  // Add interaction to contact
  async addInteraction(contactId, userId, interactionData) {
    try {
      // Verify contact belongs to user
      const contact = await this.getContactById(contactId, userId);
      if (!contact) {
        throw new Error("Contact not found");
      }

      const { interactionType, interactionDate, summary, notes } = interactionData;
      const interactionId = uuidv4();

      const query = `
        INSERT INTO contact_interactions (
          id, contact_id, interaction_type, interaction_date, summary, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await database.query(query, [
        interactionId,
        contactId,
        interactionType,
        interactionDate || new Date().toISOString().split("T")[0],
        summary || null,
        notes || null,
      ]);

      // Update last interaction date on contact
      await database.query(
        `UPDATE professional_contacts 
         SET last_interaction_date = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [interactionDate || new Date().toISOString().split("T")[0], contactId]
      );

      return {
        id: result.rows[0].id,
        contactId: result.rows[0].contact_id,
        interactionType: result.rows[0].interaction_type,
        interactionDate: result.rows[0].interaction_date,
        summary: result.rows[0].summary,
        notes: result.rows[0].notes,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      console.error("❌ Error adding interaction:", error);
      throw error;
    }
  }

  // Get contacts of a specific contact (their network)
  async getContactNetwork(contactId, userId) {
    try {
      // First verify the contact belongs to the user
      const contact = await this.getContactById(contactId, userId);
      if (!contact) {
        throw new Error("Contact not found");
      }

      console.log("🔍 Getting network for contact:", {
        contactId,
        contactName: `${contact.firstName} ${contact.lastName}`,
        contactEmail: contact.email,
        contactUserId: contact.contactUserId,
      });

      // If the contact doesn't have a contact_user_id, they're not a user in the system
      // so they don't have contacts to display
      if (!contact.contactUserId) {
        console.log("⚠️ Contact does not have contactUserId set");
        return [];
      }

      // Get all contacts that belong to this contact's user_id
      // This means contacts where user_id = contact's contact_user_id
      // Include profile pictures from the profiles table
      const query = `
        SELECT 
          pc.id,
          pc.first_name,
          pc.last_name,
          pc.email,
          pc.phone,
          pc.company,
          pc.job_title,
          pc.industry,
          pc.location,
          pc.linkedin_url,
          p.pfp_link as contact_profile_picture,
          NULL as connection_strength
        FROM professional_contacts pc
        LEFT JOIN profiles p ON pc.contact_user_id = p.user_id
        WHERE pc.user_id = $1
        ORDER BY pc.first_name ASC, pc.last_name ASC
      `;

      console.log("📊 Querying contacts for user_id:", contact.contactUserId);
      const result = await database.query(query, [contact.contactUserId]);
      console.log("✅ Found", result.rows.length, "contacts for this user");
      return result.rows.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        jobTitle: row.job_title,
        industry: row.industry,
        location: row.location,
        linkedinUrl: row.linkedin_url,
        profilePicture: row.contact_profile_picture,
        connectionStrength: row.connection_strength,
      }));
    } catch (error) {
      console.error("❌ Error getting contact network:", error);
      throw error;
    }
  }

  // Helper method to map database row to contact object
  mapRowToContact(row) {
    return {
      id: row.id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      jobTitle: row.job_title,
      industry: row.industry,
      location: row.location,
      relationshipType: row.relationship_type,
      relationshipStrength: row.relationship_strength,
      relationshipContext: row.relationship_context,
      personalInterests: row.personal_interests,
      professionalInterests: row.professional_interests,
      linkedinUrl: row.linkedin_url,
      notes: row.notes,
      importedFrom: row.imported_from,
      lastInteractionDate: row.last_interaction_date,
      nextReminderDate: row.next_reminder_date,
      contactUserId: row.contact_user_id,
      profilePicture: row.contact_profile_picture,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new ProfessionalContactService();

