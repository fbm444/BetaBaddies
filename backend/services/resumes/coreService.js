import { v4 as uuidv4 } from "uuid";
import database from "../database.js";

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

      // Handle templateId: if it's not a valid UUID, set to null
      // Default templates (like "default-chronological") don't have UUIDs in the database
      let validTemplateId = null;
      if (templateId) {
        if (this.isValidUUID(templateId)) {
          validTemplateId = templateId;
        } else {
          // If it's a default template identifier (starts with "default-"), set to null
          // The template identifier can be stored in customizations or remembered separately
          console.log(
            `⚠️ Template ID "${templateId}" is not a UUID. Setting template_id to NULL.`
          );
          validTemplateId = null;
        }
      }

      // Build columns and values arrays dynamically
      const columns = [
        "id",
        "user_id",
        "version_name",
        "description",
        "file",
        "template_id",
        "job_id",
        "content",
        "section_config",
        "customizations",
        "version_number",
        "parent_resume_id",
        "is_master",
        "comments_id",
      ];
      const values = [
        resumeId,
        userId,
        versionName,
        description || null,
        file || null,
        validTemplateId,
        jobId || null,
        content ? JSON.stringify(content) : null,
        sectionConfig ? JSON.stringify(sectionConfig) : null,
        customizations ? JSON.stringify(customizations) : null,
        versionNumber || 1,
        parentResumeId || null,
        isMaster || false,
        commentsId || null,
      ];
      const placeholders = values.map((_, i) => `$${i + 1}`);

      // Create resume in database
      const query = `
        INSERT INTO resume (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING id, user_id, version_name, description, created_at, updated_at, file, 
                  template_id, job_id, content, section_config, customizations, 
                  version_number, parent_resume_id, is_master, comments_id
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
        SELECT id, user_id, version_name, description, created_at, updated_at, file, 
               template_id, job_id, content, section_config, customizations, 
               version_number, parent_resume_id, is_master, comments_id
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

  // Validate UUID format
  isValidUUID(uuid) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Get resume by ID (with user validation)
  async getResumeById(resumeId, userId) {
    try {
      // Validate UUID format
      if (!this.isValidUUID(resumeId)) {
        throw new Error(
          `Invalid resume ID format. Expected UUID, got: ${resumeId}`
        );
      }

      const query = `
        SELECT id, user_id, version_name, description, created_at, updated_at, file, 
               template_id, job_id, content, section_config, customizations, 
               version_number, parent_resume_id, is_master, comments_id
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

  // Get resume by ID (alias for getResumeById, used by AI assistant)
  async getResume(resumeId, userId) {
    return this.getResumeById(resumeId, userId);
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
      // Validate UUID format
      if (!this.isValidUUID(resumeId)) {
        throw new Error(
          `Invalid resume ID format. Expected UUID, got: ${resumeId}`
        );
      }

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

      if (templateId !== undefined) {
        // Handle templateId: if it's not a valid UUID, set to null
        let validTemplateId = null;
        if (templateId) {
          if (this.isValidUUID(templateId)) {
            validTemplateId = templateId;
          } else {
            // If it's a default template identifier (starts with "default-"), set to null
            console.log(
              `⚠️ Template ID "${templateId}" is not a UUID. Setting template_id to NULL.`
            );
            validTemplateId = null;
          }
        }
        updates.push(`template_id = $${paramCount++}`);
        values.push(validTemplateId);
      }

      if (jobId !== undefined) {
        updates.push(`job_id = $${paramCount++}`);
        values.push(jobId || null);
      }

      if (content !== undefined) {
        updates.push(`content = $${paramCount++}`);
        values.push(content ? JSON.stringify(content) : null);
      }

      if (sectionConfig !== undefined) {
        updates.push(`section_config = $${paramCount++}`);
        values.push(sectionConfig ? JSON.stringify(sectionConfig) : null);
      }

      if (customizations !== undefined) {
        updates.push(`customizations = $${paramCount++}`);
        values.push(customizations ? JSON.stringify(customizations) : null);
      }

      if (versionNumber !== undefined) {
        updates.push(`version_number = $${paramCount++}`);
        values.push(versionNumber);
      }

      if (parentResumeId !== undefined) {
        updates.push(`parent_resume_id = $${paramCount++}`);
        values.push(parentResumeId || null);
      }

      if (isMaster !== undefined) {
        updates.push(`is_master = $${paramCount++}`);
        values.push(isMaster);
      }

      if (updates.length === 0) {
        return existingResume;
      }

      // Add resumeId and userId to values
      values.push(resumeId, userId);

      const query = `
        UPDATE resume
        SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount++} AND user_id = $${paramCount++}
        RETURNING id, user_id, version_name, description, created_at, updated_at, file, 
                  template_id, job_id, content, section_config, customizations, 
                  version_number, parent_resume_id, is_master, comments_id
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

      // Check if this resume has any child resumes (versions/duplicates)
      // We need to prevent deletion of parent resumes that have children
      // to avoid accidentally deleting the original when trying to delete a duplicate
      const checkChildrenQuery = `
        SELECT id, version_name, version_number
        FROM resume
        WHERE parent_resume_id = $1 AND user_id = $2
      `;
      const childrenResult = await database.query(checkChildrenQuery, [
        resumeId,
        userId,
      ]);

      // If this resume has children, prevent deletion
      // This prevents the CASCADE from deleting children when deleting the parent
      // Users should delete children (duplicates) first, then the parent (original)
      if (childrenResult.rows.length > 0) {
        throw new Error(
          `Cannot delete this resume because it has ${childrenResult.rows.length} version(s). ` +
            `Please delete the version(s) first before deleting the original resume.`
        );
      }

      // IMPORTANT: Before deleting, check if this resume is a child (duplicate)
      // If it is, we need to ensure we're not accidentally deleting the parent
      // The CASCADE constraint only works when deleting the parent, not the child
      // So deleting a child should be safe, but let's verify the relationship
      if (existingResume.parentResumeId) {
        // This is a duplicate/version - safe to delete
        // The CASCADE won't affect the parent when deleting a child
        // Verify the parent still exists (sanity check)
        const parentCheck = await this.getResumeById(
          existingResume.parentResumeId,
          userId
        );
        if (!parentCheck) {
          console.warn(
            `⚠️ Parent resume ${existingResume.parentResumeId} not found for duplicate ${resumeId}`
          );
        }
        console.log(
          `Deleting duplicate resume ${resumeId} (parent: ${existingResume.parentResumeId})`
        );
      } else {
        // This is a master/original resume - verify it has no children (already checked above)
        console.log(`Deleting master resume ${resumeId}`);
      }

      // Safe to delete - this is either:
      // 1. A duplicate/version (has a parent, but no children itself) - CASCADE won't affect parent
      // 2. An original resume with no versions/duplicates - safe to delete
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

      // Import versionService dynamically to avoid circular dependency
      const { default: versionService } = await import("./versionService.js");

      // Determine the master resume ID (the original resume in the version chain)
      // If the original resume has a parent, use that as the master; otherwise, the original is the master
      const masterResumeId = originalResume.parentResumeId || originalResume.id;

      // Get all versions of this resume family to calculate next version number
      const versions = await versionService.getVersions(masterResumeId, userId);

      // Calculate next version number
      // If no versions exist, start at v2; otherwise, find the max version number and add 1
      const nextVersionNumber =
        versions.length > 0
          ? Math.max(...versions.map((v) => v.versionNumber || 1)) + 1
          : 2;

      // Get the base name (from master resume or original)
      let masterResume;
      if (masterResumeId === originalResume.id) {
        // Original resume is the master
        masterResume = originalResume;
      } else {
        // Fetch the master resume
        masterResume = await this.getResumeById(masterResumeId, userId);
        if (!masterResume) {
          // Fallback: use original resume if master not found (shouldn't happen, but be safe)
          masterResume = originalResume;
        }
      }

      const baseName = masterResume.versionName || originalResume.versionName;

      // Remove existing version suffix (e.g., "Resume Name v2" -> "Resume Name")
      // This ensures we always use the clean base name for versioning
      const baseNameWithoutVersion = baseName.replace(/\s+v\d+$/i, "").trim();

      // Generate version name: "Base Name v2", "Base Name v3", etc.
      const generatedVersionName =
        newVersionName || `${baseNameWithoutVersion} v${nextVersionNumber}`;

      const newResumeData = {
        versionName: generatedVersionName,
        description: originalResume.description,
        file: originalResume.file,
        templateId: originalResume.templateId,
        jobId: originalResume.jobId,
        content: originalResume.content,
        sectionConfig: originalResume.sectionConfig,
        customizations: originalResume.customizations,
        versionNumber: nextVersionNumber,
        parentResumeId: masterResumeId,
        isMaster: false,
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
      templateId: row.template_id || undefined,
      jobId: row.job_id || undefined,
      versionNumber: row.version_number ?? 1,
      parentResumeId: row.parent_resume_id || undefined,
      isMaster: row.is_master ?? false,
      commentsId: row.comments_id || undefined,
    };

    // Parse JSONB fields (they come as objects from PostgreSQL, but handle string fallback)
    if (row.content !== undefined && row.content !== null) {
      try {
        resume.content =
          typeof row.content === "string"
            ? JSON.parse(row.content)
            : row.content;
      } catch {
        resume.content = row.content;
      }
    } else {
      resume.content = undefined;
    }

    if (row.section_config !== undefined && row.section_config !== null) {
      try {
        resume.sectionConfig =
          typeof row.section_config === "string"
            ? JSON.parse(row.section_config)
            : row.section_config;
      } catch {
        resume.sectionConfig = row.section_config;
      }
    } else {
      resume.sectionConfig = undefined;
    }

    if (row.customizations !== undefined && row.customizations !== null) {
      try {
        resume.customizations =
          typeof row.customizations === "string"
            ? JSON.parse(row.customizations)
            : row.customizations;
      } catch {
        resume.customizations = row.customizations;
      }
    } else {
      resume.customizations = undefined;
    }

    return resume;
  }
}

export default new ResumeService();
