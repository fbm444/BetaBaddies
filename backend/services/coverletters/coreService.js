import { v4 as uuidv4, v5 as uuidv5 } from "uuid";
import database from "../database.js";

class CoverLetterService {
  constructor() {
    this.maxVersionNameLength = 255;
    this.maxDescriptionLength = 2000;
    this.maxFilePathLength = 1000;
    // Namespace UUID for deterministic UUID generation from default template IDs
    this.DEFAULT_TEMPLATE_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
  }

  // Generate deterministic UUID from default template ID
  generateDefaultTemplateUUID(defaultId) {
    return uuidv5(defaultId, this.DEFAULT_TEMPLATE_NAMESPACE);
  }

  // Create a new cover letter
  async createCoverLetter(userId, coverLetterData) {
    const {
      versionName = "New_CoverLetter",
      description,
      templateId,
      file,
      commentsId,
      jobId,
      content,
      toneSettings,
      customizations,
      versionNumber = 1,
      parentCoverLetterId,
      isMaster = false,
      companyResearch,
      performanceMetrics,
    } = coverLetterData;

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

      const coverLetterId = uuidv4();

      // Handle templateId: convert default template IDs to UUIDs
      let validTemplateId = null;
      if (templateId) {
        if (this.isValidUUID(templateId)) {
          validTemplateId = templateId;
        } else if (templateId.startsWith("default-")) {
          // Convert default template ID to deterministic UUID
          validTemplateId = this.generateDefaultTemplateUUID(templateId);
          console.log(
            `✓ Converted default template ID "${templateId}" to UUID: ${validTemplateId}`
          );
        } else {
          console.log(
            `⚠️ Template ID "${templateId}" is not a UUID or default template. Setting template_id to NULL.`
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
        "tone_settings",
        "customizations",
        "version_number",
        "parent_coverletter_id",
        "is_master",
        "comments_id",
        "company_research",
        "performance_metrics",
      ];
      const values = [
        coverLetterId,
        userId,
        versionName,
        description || null,
        file || null,
        validTemplateId,
        jobId || null,
        content ? JSON.stringify(content) : null,
        toneSettings ? JSON.stringify(toneSettings) : null,
        customizations ? JSON.stringify(customizations) : null,
        versionNumber || 1,
        parentCoverLetterId || null,
        isMaster || false,
        commentsId || null,
        companyResearch ? JSON.stringify(companyResearch) : null,
        performanceMetrics ? JSON.stringify(performanceMetrics) : null,
      ];
      const placeholders = values.map((_, i) => `$${i + 1}`);

      // Create cover letter in database
      const query = `
        INSERT INTO coverletter (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING id, user_id, version_name, description, created_at, updated_at, file, 
                  template_id, content, tone_settings, customizations, 
                  version_number, parent_coverletter_id, is_master, comments_id,
                  company_research, performance_metrics
      `;

      const result = await database.query(query, values);

      return this.mapRowToCoverLetter(result.rows[0]);
    } catch (error) {
      console.error("❌ Error creating cover letter:", error);
      throw error;
    }
  }

  // Get all cover letters for a user
  async getCoverLettersByUserId(userId, options = {}) {
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
               template_id, content, tone_settings, customizations, 
               version_number, parent_coverletter_id, is_master, comments_id,
               company_research, performance_metrics
        FROM coverletter
        WHERE user_id = $1
        ${sortClause}
        LIMIT $2 OFFSET $3
      `;

      const result = await database.query(query, [
        userId,
        validLimit,
        validOffset,
      ]);

      return result.rows.map(this.mapRowToCoverLetter);
    } catch (error) {
      console.error("❌ Error getting cover letters by user ID:", error);
      throw error;
    }
  }

  // Validate UUID format
  isValidUUID(uuid) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Get cover letter by ID (with user validation)
  async getCoverLetterById(coverLetterId, userId) {
    try {
      // Validate UUID format
      if (!this.isValidUUID(coverLetterId)) {
        throw new Error(
          `Invalid cover letter ID format. Expected UUID, got: ${coverLetterId}`
        );
      }

      const query = `
        SELECT id, user_id, version_name, description, created_at, updated_at, file, 
               template_id, content, tone_settings, customizations, 
               version_number, parent_coverletter_id, is_master, comments_id,
               company_research, performance_metrics
        FROM coverletter
        WHERE id = $1 AND user_id = $2
      `;

      const result = await database.query(query, [coverLetterId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCoverLetter(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting cover letter by ID:", error);
      throw error;
    }
  }

  // Get cover letter by ID (alias)
  async getCoverLetter(coverLetterId, userId) {
    return this.getCoverLetterById(coverLetterId, userId);
  }

  // Update cover letter
  async updateCoverLetter(coverLetterId, userId, coverLetterData) {
    const {
      versionName,
      description,
      file,
      commentsId,
      templateId,
      jobId,
      content,
      toneSettings,
      customizations,
      versionNumber,
      parentCoverLetterId,
      isMaster,
      companyResearch,
      performanceMetrics,
    } = coverLetterData;

    try {
      // Validate UUID format
      if (!this.isValidUUID(coverLetterId)) {
        throw new Error(
          `Invalid cover letter ID format. Expected UUID, got: ${coverLetterId}`
        );
      }

      // Check if cover letter exists and belongs to user
      const existingCoverLetter = await this.getCoverLetterById(
        coverLetterId,
        userId
      );
      if (!existingCoverLetter) {
        throw new Error("Cover letter not found");
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
        let validTemplateId = null;
        if (templateId) {
          if (this.isValidUUID(templateId)) {
            validTemplateId = templateId;
          } else {
            console.log(
              `⚠️ Template ID "${templateId}" is not a UUID. Setting template_id to NULL.`
            );
            validTemplateId = null;
          }
        }
        updates.push(`template_id = $${paramCount++}`);
        values.push(validTemplateId);
      }

      if (content !== undefined) {
        updates.push(`content = $${paramCount++}`);
        values.push(content ? JSON.stringify(content) : null);
      }

      if (toneSettings !== undefined) {
        updates.push(`tone_settings = $${paramCount++}`);
        values.push(toneSettings ? JSON.stringify(toneSettings) : null);
      }

      if (customizations !== undefined) {
        updates.push(`customizations = $${paramCount++}`);
        values.push(customizations ? JSON.stringify(customizations) : null);
      }

      if (versionNumber !== undefined) {
        updates.push(`version_number = $${paramCount++}`);
        values.push(versionNumber);
      }

      if (parentCoverLetterId !== undefined) {
        updates.push(`parent_coverletter_id = $${paramCount++}`);
        values.push(parentCoverLetterId || null);
      }

      if (isMaster !== undefined) {
        updates.push(`is_master = $${paramCount++}`);
        values.push(isMaster);
      }

      if (companyResearch !== undefined) {
        updates.push(`company_research = $${paramCount++}`);
        values.push(companyResearch ? JSON.stringify(companyResearch) : null);
      }

      if (performanceMetrics !== undefined) {
        updates.push(`performance_metrics = $${paramCount++}`);
        values.push(
          performanceMetrics ? JSON.stringify(performanceMetrics) : null
        );
      }

      if (updates.length === 0) {
        return existingCoverLetter;
      }

      // Add coverLetterId and userId to values
      values.push(coverLetterId, userId);

      const query = `
        UPDATE coverletter
        SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount++} AND user_id = $${paramCount++}
        RETURNING id, user_id, version_name, description, created_at, updated_at, file, 
                  template_id, content, tone_settings, customizations, 
                  version_number, parent_coverletter_id, is_master, comments_id,
                  company_research, performance_metrics
      `;

      const result = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Cover letter not found or update failed");
      }

      return this.mapRowToCoverLetter(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating cover letter:", error);
      throw error;
    }
  }

  // Delete cover letter
  async deleteCoverLetter(coverLetterId, userId) {
    try {
      // Check if cover letter exists and belongs to user
      const existingCoverLetter = await this.getCoverLetterById(
        coverLetterId,
        userId
      );
      if (!existingCoverLetter) {
        throw new Error("Cover letter not found");
      }

      const query = `
        DELETE FROM coverletter
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [coverLetterId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Cover letter not found or delete failed");
      }

      return { id: result.rows[0].id };
    } catch (error) {
      console.error("❌ Error deleting cover letter:", error);
      throw error;
    }
  }

  // Duplicate cover letter (create new version)
  async duplicateCoverLetter(coverLetterId, userId, newVersionName) {
    try {
      const originalCoverLetter = await this.getCoverLetterById(
        coverLetterId,
        userId
      );
      if (!originalCoverLetter) {
        throw new Error("Cover letter not found");
      }

      // Import versionService dynamically to avoid circular dependency
      const { default: versionService } = await import("./versionService.js");

      // Determine the master cover letter ID
      const masterCoverLetterId =
        originalCoverLetter.parentCoverLetterId || originalCoverLetter.id;

      // Get all versions to calculate next version number
      const versions = await versionService.getVersions(
        masterCoverLetterId,
        userId
      );

      // Calculate next version number
      const nextVersionNumber =
        versions.length > 0
          ? Math.max(...versions.map((v) => v.versionNumber || 1)) + 1
          : 2;

      // Get the base name
      let masterCoverLetter;
      if (masterCoverLetterId === originalCoverLetter.id) {
        masterCoverLetter = originalCoverLetter;
      } else {
        masterCoverLetter = await this.getCoverLetterById(
          masterCoverLetterId,
          userId
        );
        if (!masterCoverLetter) {
          masterCoverLetter = originalCoverLetter;
        }
      }

      const baseName =
        masterCoverLetter.versionName || originalCoverLetter.versionName;
      const baseNameWithoutVersion = baseName.replace(/\s+v\d+$/i, "").trim();
      const generatedVersionName =
        newVersionName || `${baseNameWithoutVersion} v${nextVersionNumber}`;

      const newCoverLetterData = {
        versionName: generatedVersionName,
        description: originalCoverLetter.description,
        file: originalCoverLetter.file,
        templateId: originalCoverLetter.templateId,
        jobId: originalCoverLetter.jobId,
        content: originalCoverLetter.content,
        toneSettings: originalCoverLetter.toneSettings,
        customizations: originalCoverLetter.customizations,
        versionNumber: nextVersionNumber,
        parentCoverLetterId: masterCoverLetterId,
        isMaster: false,
        commentsId: originalCoverLetter.commentsId,
        companyResearch: originalCoverLetter.companyResearch,
        performanceMetrics: originalCoverLetter.performanceMetrics,
      };

      return await this.createCoverLetter(userId, newCoverLetterData);
    } catch (error) {
      console.error("❌ Error duplicating cover letter:", error);
      throw error;
    }
  }

  // Map database row to cover letter object
  mapRowToCoverLetter(row) {
    const coverLetter = {
      id: row.id,
      userId: row.user_id,
      versionName: row.version_name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      file: row.file,
      templateId: row.template_id || undefined,
      versionNumber: row.version_number ?? 1,
      parentCoverLetterId: row.parent_coverletter_id || undefined,
      isMaster: row.is_master ?? false,
      commentsId: row.comments_id || undefined,
    };

    // Parse JSONB fields
    if (row.content !== undefined && row.content !== null) {
      try {
        coverLetter.content =
          typeof row.content === "string"
            ? JSON.parse(row.content)
            : row.content;
      } catch {
        coverLetter.content = row.content;
      }
    } else {
      coverLetter.content = undefined;
    }

    if (row.tone_settings !== undefined && row.tone_settings !== null) {
      try {
        coverLetter.toneSettings =
          typeof row.tone_settings === "string"
            ? JSON.parse(row.tone_settings)
            : row.tone_settings;
      } catch {
        coverLetter.toneSettings = row.tone_settings;
      }
    } else {
      coverLetter.toneSettings = undefined;
    }

    if (row.customizations !== undefined && row.customizations !== null) {
      try {
        coverLetter.customizations =
          typeof row.customizations === "string"
            ? JSON.parse(row.customizations)
            : row.customizations;
      } catch {
        coverLetter.customizations = row.customizations;
      }
    } else {
      coverLetter.customizations = undefined;
    }

    if (row.company_research !== undefined && row.company_research !== null) {
      try {
        coverLetter.companyResearch =
          typeof row.company_research === "string"
            ? JSON.parse(row.company_research)
            : row.company_research;
      } catch {
        coverLetter.companyResearch = row.company_research;
      }
    } else {
      coverLetter.companyResearch = undefined;
    }

    if (
      row.performance_metrics !== undefined &&
      row.performance_metrics !== null
    ) {
      try {
        coverLetter.performanceMetrics =
          typeof row.performance_metrics === "string"
            ? JSON.parse(row.performance_metrics)
            : row.performance_metrics;
      } catch {
        coverLetter.performanceMetrics = row.performance_metrics;
      }
    } else {
      coverLetter.performanceMetrics = undefined;
    }

    return coverLetter;
  }
}

export default new CoverLetterService();

