import { v4 as uuidv4 } from "uuid";
import database from "./database.js";

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
    } = contactData;

    try {
      // Check if contact with same email already exists
      if (email) {
        const existingContact = await this.getContactByEmail(userId, email);
        if (existingContact) {
          throw new Error("A contact with this email already exists");
        }
      }

      const contactId = uuidv4();

      const query = `
        INSERT INTO professional_contacts (
          id, user_id, first_name, last_name, email, phone, company,
          job_title, industry, location, relationship_type, relationship_strength,
          relationship_context, personal_interests, professional_interests,
          linkedin_url, notes, imported_from, last_interaction_date, next_reminder_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
      ]);

      return this.mapRowToContact(result.rows[0]);
    } catch (error) {
      console.error("❌ Error creating contact:", error);
      throw error;
    }
  }

  // Get all contacts for a user
  async getContactsByUserId(userId, filters = {}) {
    try {
      let query = `
        SELECT *
        FROM professional_contacts
        WHERE user_id = $1
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
      return result.rows.map(this.mapRowToContact);
    } catch (error) {
      console.error("❌ Error getting contacts:", error);
      throw error;
    }
  }

  // Get contact by ID
  async getContactById(contactId, userId) {
    try {
      const query = `
        SELECT *
        FROM professional_contacts
        WHERE id = $1 AND user_id = $2
      `;

      const result = await database.query(query, [contactId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToContact(result.rows[0]);
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

  // Get interaction history for a contact
  async getContactInteractions(contactId, userId) {
    try {
      // Verify contact belongs to user
      const contact = await this.getContactById(contactId, userId);
      if (!contact) {
        throw new Error("Contact not found");
      }

      const query = `
        SELECT *
        FROM contact_interactions
        WHERE contact_id = $1
        ORDER BY interaction_date DESC, created_at DESC
      `;

      const result = await database.query(query, [contactId]);
      return result.rows.map((row) => ({
        id: row.id,
        contactId: row.contact_id,
        interactionType: row.interaction_type,
        interactionDate: row.interaction_date,
        summary: row.summary,
        notes: row.notes,
        createdAt: row.created_at,
      }));
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new ProfessionalContactService();

