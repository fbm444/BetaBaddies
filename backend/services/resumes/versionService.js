import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import resumeService from "./coreService.js";

class ResumeVersionService {
  // Get all versions of a resume
  async getVersions(resumeId, userId) {
    try {
      // Verify user owns the resume
      const resume = await resumeService.getResumeById(resumeId, userId);
      if (!resume) {
        throw new Error("Resume not found");
      }

      // Get all versions (resumes with same parent_resume_id or resume itself)
      const query = `
        SELECT id, user_id, version_name, description, created_at, updated_at, 
               version_number, parent_resume_id, is_master
        FROM resume
        WHERE (id = $1 OR parent_resume_id = $1 OR 
               (parent_resume_id IS NULL AND id = $1))
          AND user_id = $2
        ORDER BY version_number ASC, created_at ASC
      `;

      const result = await database.query(query, [resumeId, userId]);

      return result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        versionName: row.version_name,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        versionNumber: row.version_number || 1,
        parentResumeId: row.parent_resume_id,
        isMaster: row.is_master || false,
      }));
    } catch (error) {
      console.error("❌ Error getting versions:", error);
      throw error;
    }
  }

  // Create new version from existing resume
  async createVersion(resumeId, userId, versionData) {
    try {
      const { versionName, description } = versionData;

      const originalResume = await resumeService.getResumeById(resumeId, userId);
      if (!originalResume) {
        throw new Error("Resume not found");
      }

      // Get next version number
      const versions = await this.getVersions(resumeId, userId);
      const nextVersionNumber = versions.length > 0 
        ? Math.max(...versions.map(v => v.versionNumber || 1)) + 1
        : 2;

      // Determine parent resume ID (use original if it has a parent, otherwise use original ID)
      const parentResumeId = originalResume.parentResumeId || resumeId;

      // Create new version with all content
      const newResumeData = {
        versionName: versionName || `${originalResume.versionName} v${nextVersionNumber}`,
        description: description || originalResume.description,
        file: originalResume.file,
        templateId: originalResume.templateId,
        jobId: originalResume.jobId,
        content: originalResume.content,
        sectionConfig: originalResume.sectionConfig,
        customizations: originalResume.customizations,
        commentsId: originalResume.commentsId,
        parentResumeId: parentResumeId,
        versionNumber: nextVersionNumber,
        isMaster: false,
      };

      return await resumeService.createResume(userId, newResumeData);
    } catch (error) {
      console.error("❌ Error creating version:", error);
      throw error;
    }
  }

  // Compare two versions
  async compareVersions(resumeId1, resumeId2, userId) {
    try {
      // Verify user owns both resumes
      const resume1 = await resumeService.getResumeById(resumeId1, userId);
      const resume2 = await resumeService.getResumeById(resumeId2, userId);

      if (!resume1 || !resume2) {
        throw new Error("One or both resumes not found");
      }

      // Compare basic fields
      const differences = {
        versionName: resume1.versionName !== resume2.versionName,
        description: resume1.description !== resume2.description,
        file: resume1.file !== resume2.file,
        content: JSON.stringify(resume1.content || {}) !== JSON.stringify(resume2.content || {}),
        sectionConfig: JSON.stringify(resume1.sectionConfig || {}) !== JSON.stringify(resume2.sectionConfig || {}),
        customizations: JSON.stringify(resume1.customizations || {}) !== JSON.stringify(resume2.customizations || {}),
        templateId: resume1.templateId !== resume2.templateId,
        jobId: resume1.jobId !== resume2.jobId,
        createdAt: resume1.createdAt !== resume2.createdAt,
        updatedAt: resume1.updatedAt !== resume2.updatedAt,
      };

      // Get detailed differences
      const detailedDifferences = [];

      if (differences.versionName) {
        detailedDifferences.push({
          field: "versionName",
          old: resume1.versionName,
          new: resume2.versionName,
        });
      }

      if (differences.description) {
        detailedDifferences.push({
          field: "description",
          old: resume1.description,
          new: resume2.description,
        });
      }

      if (differences.file) {
        detailedDifferences.push({
          field: "file",
          old: resume1.file,
          new: resume2.file,
        });
      }

      if (differences.content) {
        detailedDifferences.push({
          field: "content",
          old: "Content differs",
          new: "Content differs",
          hasChanges: true,
        });
      }

      if (differences.sectionConfig) {
        detailedDifferences.push({
          field: "sectionConfig",
          old: "Section configuration differs",
          new: "Section configuration differs",
          hasChanges: true,
        });
      }

      if (differences.customizations) {
        detailedDifferences.push({
          field: "customizations",
          old: "Customizations differ",
          new: "Customizations differ",
          hasChanges: true,
        });
      }

      if (differences.templateId) {
        detailedDifferences.push({
          field: "templateId",
          old: resume1.templateId,
          new: resume2.templateId,
        });
      }

      if (differences.jobId) {
        detailedDifferences.push({
          field: "jobId",
          old: resume1.jobId,
          new: resume2.jobId,
        });
      }

      return {
        resume1: {
          id: resume1.id,
          versionName: resume1.versionName,
          versionNumber: resume1.versionNumber || 1,
          updatedAt: resume1.updatedAt,
        },
        resume2: {
          id: resume2.id,
          versionName: resume2.versionName,
          versionNumber: resume2.versionNumber || 1,
          updatedAt: resume2.updatedAt,
        },
        differences,
        detailedDifferences,
        hasDifferences: Object.values(differences).some((diff) => diff === true),
      };
    } catch (error) {
      console.error("❌ Error comparing versions:", error);
      throw error;
    }
  }

  // Merge changes from one version to another
  async mergeVersions(targetResumeId, sourceResumeId, userId, mergeOptions = {}) {
    try {
      const { fields = ["versionName", "description", "file"] } = mergeOptions;

      // Verify user owns both resumes
      const targetResume = await resumeService.getResumeById(targetResumeId, userId);
      const sourceResume = await resumeService.getResumeById(sourceResumeId, userId);

      if (!targetResume || !sourceResume) {
        throw new Error("One or both resumes not found");
      }

      // Build merge data
      const mergeData = {};

      if (fields.includes("versionName") && sourceResume.versionName) {
        mergeData.versionName = sourceResume.versionName;
      }

      if (fields.includes("description") && sourceResume.description) {
        mergeData.description = sourceResume.description;
      }

      if (fields.includes("file") && sourceResume.file) {
        mergeData.file = sourceResume.file;
      }

      // Update target resume with merged data
      const updatedResume = await resumeService.updateResume(
        targetResumeId,
        userId,
        mergeData
      );

      return {
        targetResume: updatedResume,
        sourceResume,
        mergedFields: Object.keys(mergeData),
      };
    } catch (error) {
      console.error("❌ Error merging versions:", error);
      throw error;
    }
  }

  // Set resume as master version
  async setMasterVersion(resumeId, userId) {
    try {
      const resume = await resumeService.getResumeById(resumeId, userId);
      if (!resume) {
        throw new Error("Resume not found");
      }

      // Get all versions in the same family
      const versions = await this.getVersions(resumeId, userId);

      // Unset all other master flags
      for (const version of versions) {
        if (version.id !== resumeId && version.isMaster) {
          await database.query(
            `UPDATE resume SET is_master = false WHERE id = $1`,
            [version.id]
          ).catch(() => {
            // Column might not exist yet
          });
        }
      }

      // Set this resume as master
      await database.query(
        `UPDATE resume SET is_master = true WHERE id = $1`,
        [resumeId]
      ).catch(() => {
        // Column might not exist yet
      });

      return await resumeService.getResumeById(resumeId, userId);
    } catch (error) {
      console.error("❌ Error setting master version:", error);
      throw error;
    }
  }

  // Get version history
  async getVersionHistory(resumeId, userId) {
    try {
      const versions = await this.getVersions(resumeId, userId);

      return versions.map((version) => ({
        id: version.id,
        versionName: version.versionName,
        versionNumber: version.versionNumber,
        description: version.description,
        isMaster: version.isMaster,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
      }));
    } catch (error) {
      console.error("❌ Error getting version history:", error);
      throw error;
    }
  }
}

export default new ResumeVersionService();

