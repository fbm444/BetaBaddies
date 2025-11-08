import { v4 as uuidv4 } from "uuid";
import database from "../database.js";

class ResumeTailoringService {
  // Create or update resume tailoring
  async createOrUpdateTailoring(resumeId, userId, tailoringData) {
    const { workexpDescription } = tailoringData;

    try {
      if (!resumeId || !userId) {
        throw new Error("Resume ID and User ID are required");
      }

      // Check if tailoring already exists
      const existing = await this.getTailoringByResumeId(resumeId);

      if (existing) {
        // Update existing tailoring
        const query = `
          UPDATE resume_tailoring
          SET workexp_description = $1
          WHERE id = $2
          RETURNING id, user_id, workexp_description
        `;

        const result = await database.query(query, [
          workexpDescription || null,
          resumeId,
        ]);

        return this.mapRowToTailoring(result.rows[0]);
      } else {
        // Create new tailoring
        const query = `
          INSERT INTO resume_tailoring (id, user_id, workexp_description)
          VALUES ($1, $2, $3)
          RETURNING id, user_id, workexp_description
        `;

        const result = await database.query(query, [
          resumeId,
          userId,
          workexpDescription || null,
        ]);

        return this.mapRowToTailoring(result.rows[0]);
      }
    } catch (error) {
      console.error("❌ Error creating/updating tailoring:", error);
      throw error;
    }
  }

  // Get tailoring by resume ID
  async getTailoringByResumeId(resumeId) {
    try {
      const query = `
        SELECT id, user_id, workexp_description
        FROM resume_tailoring
        WHERE id = $1
      `;

      const result = await database.query(query, [resumeId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTailoring(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting tailoring by resume ID:", error);
      throw error;
    }
  }

  // Get all tailoring for a user
  async getTailoringByUserId(userId) {
    try {
      const query = `
        SELECT id, user_id, workexp_description
        FROM resume_tailoring
        WHERE user_id = $1
        ORDER BY id ASC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map(this.mapRowToTailoring);
    } catch (error) {
      console.error("❌ Error getting tailoring by user ID:", error);
      throw error;
    }
  }

  // Delete tailoring
  async deleteTailoring(resumeId) {
    try {
      const query = `
        DELETE FROM resume_tailoring
        WHERE id = $1
        RETURNING id
      `;

      const result = await database.query(query, [resumeId]);

      if (result.rows.length === 0) {
        throw new Error("Tailoring not found");
      }

      return { id: result.rows[0].id };
    } catch (error) {
      console.error("❌ Error deleting tailoring:", error);
      throw error;
    }
  }

  // Map database row to tailoring object
  mapRowToTailoring(row) {
    return {
      id: row.id,
      userId: row.user_id,
      workexpDescription: row.workexp_description,
    };
  }
}

export default new ResumeTailoringService();
