import coverLetterService from "./coreService.js";

class CoverLetterVersionService {
  // Get all versions of a cover letter
  async getVersions(masterCoverLetterId, userId) {
    try {
      // Get master cover letter
      const master = await coverLetterService.getCoverLetterById(
        masterCoverLetterId,
        userId
      );
      if (!master) {
        throw new Error("Cover letter not found");
      }

      // Get all versions (master + children)
      const allVersions = [master];

      // Get child versions
      const query = `
        SELECT id, user_id, version_name, description, created_at, updated_at, file, 
               template_id, job_id, content, tone_settings, customizations, 
               version_number, parent_coverletter_id, is_master, comments_id,
               company_research, performance_metrics
        FROM coverletter
        WHERE (id = $1 OR parent_coverletter_id = $1) AND user_id = $2
        ORDER BY version_number ASC, created_at ASC
      `;

      const { default: database } = await import("../database.js");
      const result = await database.query(query, [masterCoverLetterId, userId]);

      // Map results
      const versions = result.rows.map((row) =>
        coverLetterService.mapRowToCoverLetter(row)
      );

      return versions;
    } catch (error) {
      console.error("❌ Error getting cover letter versions:", error);
      throw error;
    }
  }

  // Get version history
  async getVersionHistory(coverLetterId, userId) {
    try {
      const coverLetter = await coverLetterService.getCoverLetterById(
        coverLetterId,
        userId
      );
      if (!coverLetter) {
        throw new Error("Cover letter not found");
      }

      // Determine master ID
      const masterId = coverLetter.parentCoverLetterId || coverLetter.id;

      // Get all versions
      const versions = await this.getVersions(masterId, userId);

      return {
        history: versions.map((v) => ({
          id: v.id,
          versionName: v.versionName,
          versionNumber: v.versionNumber,
          description: v.description,
          isMaster: v.isMaster,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        })),
        count: versions.length,
      };
    } catch (error) {
      console.error("❌ Error getting version history:", error);
      throw error;
    }
  }
}

export default new CoverLetterVersionService();

