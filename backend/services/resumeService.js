import { v4 as uuidv4 } from "uuid";
import database from "./database.js";

class ResumeService {
  constructor() {
    this.maxVersionNameLength = 255;
    this.maxDescriptionLength = 2000;
    this.maxFilePathLength = 1000;
  }

  // Create a new resume
  async createResume(userId, resumeData) {
    const {
      versionName = "New_Resume",
      description,
      templateId,
      file,
      commentsId,
      jobId,
      content,
      sectionConfig,
      customizations,
      versionNumber = 1,
      parentResumeId,
      isMaster = false,
    } = resumeData;

    try {
      // Validate required fields
      if (!userId) {
        throw new Error("User ID is required");
      }

      // Validate field lengths
      if (versionName && versionName.length > this.maxVersionNameLength) {
        throw new Error(
          `Version name must be less than ${this.maxVersionNameLength} characters`
        );
      }

      if (description && description.length > this.maxDescriptionLength) {
        throw new Error(
          `Description must be less than ${this.maxDescriptionLength} characters`
        );
      }

      const resumeId = uuidv4();

      // Only use basic columns that exist in the table
      // Optional columns (template_id, job_id, content, etc.) will be added via migration
      const columns = [
        "id",
        "user_id",
        "version_name",
        "description",
        "file",
        "comments_id",
      ];
      const values = [
        resumeId,
        userId,
        versionName,
        description || null,
        file || null,
        commentsId || null,
      ];
      const placeholders = ["$1", "$2", "$3", "$4", "$5", "$6"];

      // Create resume in database
      const query = `
        INSERT INTO resume (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING id, user_id, version_name, description, created_at, updated_at, file, comments_id
      `;

      const result = await database.query(query, values);

      return this.mapRowToResume(result.rows[0]);
    } catch (error) {
      console.error("❌ Error creating resume:", error);
      throw error;
    }
  }

  // Get all resumes for a user
  async getResumesByUserId(userId, options = {}) {
    try {
      const { sort = "-created_at", limit = 50, offset = 0 } = options;

      // Validate limit
      const validLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
      const validOffset = Math.max(parseInt(offset) || 0, 0);

      // Build sort clause
      let sortClause = "ORDER BY created_at DESC";
      if (sort === "created_at") {
        sortClause = "ORDER BY created_at ASC";
      } else if (sort === "updated_at") {
        sortClause = "ORDER BY updated_at DESC";
      } else if (sort === "version_name") {
        sortClause = "ORDER BY version_name ASC";
      }

      const query = `
        SELECT id, user_id, version_name, description, created_at, updated_at, file, comments_id
        FROM resume
        WHERE user_id = $1
        ${sortClause}
        LIMIT $2 OFFSET $3
      `;

      const result = await database.query(query, [
        userId,
        validLimit,
        validOffset,
      ]);

      return result.rows.map(this.mapRowToResume);
    } catch (error) {
      console.error("❌ Error getting resumes by user ID:", error);
      throw error;
    }
  }

  // Get resume by ID
  async getResumeById(resumeId, userId) {
    try {
      // Build query with only columns that exist (handle missing columns gracefully)
      const query = `
        SELECT id, user_id, version_name, description, created_at, updated_at, file, comments_id
        FROM resume
        WHERE id = $1 AND user_id = $2
      `;

      const result = await database.query(query, [resumeId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToResume(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting resume by ID:", error);
      throw error;
    }
  }

  // Update resume
  async updateResume(resumeId, userId, resumeData) {
    const {
      versionName,
      description,
      file,
      commentsId,
      templateId,
      jobId,
      content,
      sectionConfig,
      customizations,
      versionNumber,
      parentResumeId,
      isMaster,
    } = resumeData;

    try {
      // Check if resume exists and belongs to user
      const existingResume = await this.getResumeById(resumeId, userId);
      if (!existingResume) {
        throw new Error("Resume not found");
      }

      // Validate field lengths
      if (versionName && versionName.length > this.maxVersionNameLength) {
        throw new Error(
          `Version name must be less than ${this.maxVersionNameLength} characters`
        );
      }

      if (description && description.length > this.maxDescriptionLength) {
        throw new Error(
          `Description must be less than ${this.maxDescriptionLength} characters`
        );
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (versionName !== undefined) {
        updates.push(`version_name = $${paramCount++}`);
        values.push(versionName);
      }

      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description || null);
      }

      if (file !== undefined) {
        updates.push(`file = $${paramCount++}`);
        values.push(file || null);
      }

      if (commentsId !== undefined) {
        updates.push(`comments_id = $${paramCount++}`);
        values.push(commentsId || null);
      }

      // Only update basic columns that exist in the table
      // Skip optional columns (template_id, job_id, content, etc.) - they'll be added via migration

      if (updates.length === 0) {
        return existingResume;
      }

      // Add resumeId and userId to values
      values.push(resumeId, userId);

      const query = `
        UPDATE resume
        SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount++} AND user_id = $${paramCount++}
        RETURNING id, user_id, version_name, description, created_at, updated_at, file, comments_id
      `;

      const result = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Resume not found or update failed");
      }

      return this.mapRowToResume(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating resume:", error);
      throw error;
    }
  }

  // Delete resume
  async deleteResume(resumeId, userId) {
    try {
      // Check if resume exists and belongs to user
      const existingResume = await this.getResumeById(resumeId, userId);
      if (!existingResume) {
        throw new Error("Resume not found");
      }

      const query = `
        DELETE FROM resume
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [resumeId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Resume not found or delete failed");
      }

      return { id: result.rows[0].id };
    } catch (error) {
      console.error("❌ Error deleting resume:", error);
      throw error;
    }
  }

  // Duplicate resume (create new version)
  async duplicateResume(resumeId, userId, newVersionName) {
    try {
      const originalResume = await this.getResumeById(resumeId, userId);
      if (!originalResume) {
        throw new Error("Resume not found");
      }

      const newResumeData = {
        versionName: newVersionName || `${originalResume.versionName} (Copy)`,
        description: originalResume.description,
        file: originalResume.file,
        commentsId: originalResume.commentsId,
      };

      return await this.createResume(userId, newResumeData);
    } catch (error) {
      console.error("❌ Error duplicating resume:", error);
      throw error;
    }
  }

  // Map database row to resume object
  mapRowToResume(row) {
    const resume = {
      id: row.id,
      userId: row.user_id,
      versionName: row.version_name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      file: row.file,
      commentsId: row.comments_id,
    };

    // Add optional fields if they exist
    if (row.template_id !== undefined) resume.templateId = row.template_id;
    if (row.job_id !== undefined) resume.jobId = row.job_id;
    if (row.content !== undefined) {
      try {
        resume.content =
          typeof row.content === "string"
            ? JSON.parse(row.content)
            : row.content;
      } catch {
        resume.content = row.content;
      }
    }
    if (row.section_config !== undefined) {
      try {
        resume.sectionConfig =
          typeof row.section_config === "string"
            ? JSON.parse(row.section_config)
            : row.section_config;
      } catch {
        resume.sectionConfig = row.section_config;
      }
    }
    if (row.customizations !== undefined) {
      try {
        resume.customizations =
          typeof row.customizations === "string"
            ? JSON.parse(row.customizations)
            : row.customizations;
      } catch {
        resume.customizations = row.customizations;
      }
    }
    if (row.version_number !== undefined)
      resume.versionNumber = row.version_number;
    if (row.parent_resume_id !== undefined)
      resume.parentResumeId = row.parent_resume_id;
    if (row.is_master !== undefined) resume.isMaster = row.is_master;

    return resume;
  }
}

export default new ResumeService();
