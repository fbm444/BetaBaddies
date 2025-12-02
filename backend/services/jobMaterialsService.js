import database from "./database.js";
import jobOpportunityService from "./jobOpportunityService.js";

/**
 * Service for managing resume and cover letter materials linked to job opportunities
 * Uses existing job_id columns in resume and coverletter tables (no DB schema changes needed)
 */
class JobMaterialsService {
  /**
   * Check if a column exists in a table
   */
  async columnExists(tableName, columnName) {
    try {
      const query = `
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      `;
      const result = await database.query(query, [tableName, columnName]);
      return result.rows.length > 0;
    } catch (error) {
      console.warn(`Error checking column existence: ${tableName}.${columnName}`, error.message);
      return false;
    }
  }
  /**
   * Get current materials (resume and cover letter) for a job opportunity
   */
  async getCurrentMaterials(jobOpportunityId, userId) {
    try {
      // Verify user owns the job opportunity
      const opportunity = await jobOpportunityService.getJobOpportunityById(
        jobOpportunityId,
        userId
      );
      if (!opportunity) {
        throw new Error("Job opportunity not found or access denied");
      }

      // Get resume linked to this job opportunity
      const resumeQuery = `
        SELECT id, version_name, version_number, description, 
               created_at, updated_at, file, is_master, parent_resume_id
        FROM resume
        WHERE job_id = $1 AND user_id = $2
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      const resumeResult = await database.query(resumeQuery, [
        jobOpportunityId,
        userId,
      ]);

      // Get cover letter linked to this job opportunity
      const coverLetterQuery = `
        SELECT id, version_name, version_number, description,
               created_at, updated_at, file, is_master, parent_coverletter_id
        FROM coverletter
        WHERE job_id = $1 AND user_id = $2
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      const coverLetterResult = await database.query(coverLetterQuery, [
        jobOpportunityId,
        userId,
      ]);

      return {
        resume:
          resumeResult.rows.length > 0
            ? {
                id: resumeResult.rows[0].id,
                versionName: resumeResult.rows[0].version_name,
                versionNumber: resumeResult.rows[0].version_number || 1,
                description: resumeResult.rows[0].description,
                createdAt: resumeResult.rows[0].created_at,
                updatedAt: resumeResult.rows[0].updated_at,
                file: resumeResult.rows[0].file,
                isMaster: resumeResult.rows[0].is_master || false,
                parentResumeId: resumeResult.rows[0].parent_resume_id,
              }
            : null,
        coverLetter:
          coverLetterResult.rows.length > 0
            ? {
                id: coverLetterResult.rows[0].id,
                versionName: coverLetterResult.rows[0].version_name,
                versionNumber: coverLetterResult.rows[0].version_number || 1,
                description: coverLetterResult.rows[0].description,
                createdAt: coverLetterResult.rows[0].created_at,
                updatedAt: coverLetterResult.rows[0].updated_at,
                file: coverLetterResult.rows[0].file,
                isMaster: coverLetterResult.rows[0].is_master || false,
                parentCoverLetterId: coverLetterResult.rows[0].parent_coverletter_id,
              }
            : null,
      };
    } catch (error) {
      console.error("❌ Error getting current materials:", error);
      throw error;
    }
  }

  /**
   * Link materials to a job opportunity by updating job_id on resume/coverletter records
   */
  async linkMaterials(jobOpportunityId, userId, resumeVersionId, coverLetterVersionId) {
    try {
      // Verify user owns the job opportunity
      const opportunity = await jobOpportunityService.getJobOpportunityById(
        jobOpportunityId,
        userId
      );
      if (!opportunity) {
        throw new Error("Job opportunity not found or access denied");
      }

      // Get current materials to track changes
      const currentMaterials = await this.getCurrentMaterials(jobOpportunityId, userId);
      const oldResumeId = currentMaterials.resume?.id || null;
      const oldCoverLetterId = currentMaterials.coverLetter?.id || null;

      // Handle resume changes
      if (oldResumeId !== resumeVersionId) {
        // Unlink old resume if it exists
        if (oldResumeId) {
          const unlinkResumeQuery = `
            UPDATE resume
            SET job_id = NULL, updated_at = NOW()
            WHERE id = $1 AND user_id = $2 AND job_id = $3
          `;
          await database.query(unlinkResumeQuery, [oldResumeId, userId, jobOpportunityId]);
        }

        // Link new resume if provided
        if (resumeVersionId) {
          // Verify user owns the resume
          const verifyResumeQuery = `
            SELECT id FROM resume WHERE id = $1 AND user_id = $2
          `;
          const verifyResume = await database.query(verifyResumeQuery, [
            resumeVersionId,
            userId,
          ]);

          if (verifyResume.rows.length === 0) {
            throw new Error("Resume not found or access denied");
          }

          // Unlink resume from any other job opportunity (one resume can only be linked to one job at a time)
          const unlinkOtherResumeQuery = `
            UPDATE resume
            SET job_id = NULL, updated_at = NOW()
            WHERE id = $1 AND user_id = $2 AND job_id IS NOT NULL AND job_id != $3
          `;
          await database.query(unlinkOtherResumeQuery, [
            resumeVersionId,
            userId,
            jobOpportunityId,
          ]);

          // Link resume to this job opportunity
          const linkResumeQuery = `
            UPDATE resume
            SET job_id = $1, updated_at = NOW()
            WHERE id = $2 AND user_id = $3
          `;
          await database.query(linkResumeQuery, [
            jobOpportunityId,
            resumeVersionId,
            userId,
          ]);
        }
      }

      // Handle cover letter changes
      if (oldCoverLetterId !== coverLetterVersionId) {
        // Unlink old cover letter if it exists
        if (oldCoverLetterId) {
          const unlinkCoverLetterQuery = `
            UPDATE coverletter
            SET job_id = NULL, updated_at = NOW()
            WHERE id = $1 AND user_id = $2 AND job_id = $3
          `;
          await database.query(unlinkCoverLetterQuery, [
            oldCoverLetterId,
            userId,
            jobOpportunityId,
          ]);
        }

        // Link new cover letter if provided
        if (coverLetterVersionId) {
          // Verify user owns the cover letter
          const verifyCoverLetterQuery = `
            SELECT id FROM coverletter WHERE id = $1 AND user_id = $2
          `;
          const verifyCoverLetter = await database.query(verifyCoverLetterQuery, [
            coverLetterVersionId,
            userId,
          ]);

          if (verifyCoverLetter.rows.length === 0) {
            throw new Error("Cover letter not found or access denied");
          }

          // Unlink cover letter from any other job opportunity
          const unlinkOtherCoverLetterQuery = `
            UPDATE coverletter
            SET job_id = NULL, updated_at = NOW()
            WHERE id = $1 AND user_id = $2 AND job_id IS NOT NULL AND job_id != $3
          `;
          await database.query(unlinkOtherCoverLetterQuery, [
            coverLetterVersionId,
            userId,
            jobOpportunityId,
          ]);

          // Link cover letter to this job opportunity
          const linkCoverLetterQuery = `
            UPDATE coverletter
            SET job_id = $1, updated_at = NOW()
            WHERE id = $2 AND user_id = $3
          `;
          await database.query(linkCoverLetterQuery, [
            jobOpportunityId,
            coverLetterVersionId,
            userId,
          ]);
        }
      }

      // Only log if there was an actual change
      if (oldResumeId !== resumeVersionId || oldCoverLetterId !== coverLetterVersionId) {
        // Check if job_opportunities has resume_id and coverletter_id columns
        const hasResumeIdColumn = await this.columnExists("job_opportunities", "resume_id");
        const hasCoverLetterIdColumn = await this.columnExists("job_opportunities", "coverletter_id");

        // Log materials change in application_history
        const changeEntry = {
          type: "materials_change",
          timestamp: new Date().toISOString(),
          resumeVersionId: resumeVersionId || null,
          coverLetterVersionId: coverLetterVersionId || null,
          previousResumeId: oldResumeId,
          previousCoverLetterId: oldCoverLetterId,
        };

        // Get current application history
        const currentHistory = opportunity.applicationHistory || [];
        const updatedHistory = [...currentHistory, changeEntry];

        // Update job_opportunities with resume_id/coverletter_id (if columns exist) and application_history
        const updateData = {
          applicationHistory: updatedHistory,
        };
        
        // Only add resume_id/coverletter_id if columns exist
        if (hasResumeIdColumn) {
          updateData.resumeId = resumeVersionId || null;
        }
        if (hasCoverLetterIdColumn) {
          updateData.coverletterId = coverLetterVersionId || null;
        }

        try {
          // Update job_opportunities with resume_id/coverletter_id and application_history
          await jobOpportunityService.updateJobOpportunity(jobOpportunityId, userId, updateData);
        } catch (error) {
          // If update fails due to missing columns, try without resume_id/coverletter_id
          if (error.message && (error.message.includes("column") || error.message.includes("does not exist"))) {
            console.warn("Resume/Cover Letter columns not found, updating application_history only");
            await jobOpportunityService.updateJobOpportunity(jobOpportunityId, userId, {
              applicationHistory: updatedHistory,
            });
          } else {
            throw error; // Re-throw if it's a different error
          }
        }
      }

      // Return updated materials
      return await this.getCurrentMaterials(jobOpportunityId, userId);
    } catch (error) {
      console.error("❌ Error linking materials:", error);
      throw error;
    }
  }

  /**
   * Get materials history from application_history JSONB field
   */
  async getMaterialsHistory(jobOpportunityId, userId) {
    try {
      // Verify user owns the job opportunity
      const opportunity = await jobOpportunityService.getJobOpportunityById(
        jobOpportunityId,
        userId
      );
      if (!opportunity) {
        throw new Error("Job opportunity not found or access denied");
      }

      // Extract materials_change entries from application_history
      const materialsHistory = (opportunity.applicationHistory || [])
        .filter((entry) => entry.type === "materials_change")
        .map(async (entry) => {
          let resume = null;
          let coverLetter = null;

          // Get resume details if resumeVersionId exists
          if (entry.resumeVersionId) {
            const resumeQuery = `
              SELECT id, version_name, version_number, file, created_at
              FROM resume
              WHERE id = $1 AND user_id = $2
            `;
            const resumeResult = await database.query(resumeQuery, [
              entry.resumeVersionId,
              userId,
            ]);
            if (resumeResult.rows.length > 0) {
              const row = resumeResult.rows[0];
              resume = {
                id: row.id,
                versionName: row.version_name,
                versionNumber: row.version_number || 1,
                file: row.file,
                createdAt: row.created_at,
              };
            }
          }

          // Get cover letter details if coverLetterVersionId exists
          if (entry.coverLetterVersionId) {
            const coverLetterQuery = `
              SELECT id, version_name, version_number, file, created_at
              FROM coverletter
              WHERE id = $1 AND user_id = $2
            `;
            const coverLetterResult = await database.query(coverLetterQuery, [
              entry.coverLetterVersionId,
              userId,
            ]);
            if (coverLetterResult.rows.length > 0) {
              const row = coverLetterResult.rows[0];
              coverLetter = {
                id: row.id,
                versionName: row.version_name,
                versionNumber: row.version_number || 1,
                file: row.file,
                createdAt: row.created_at,
              };
            }
          }

          // Determine change type
          // Priority: removed > linked > updated
          let changeType = "updated";
          
          // Check if any material was removed
          if (
            (entry.resumeVersionId === null && entry.previousResumeId !== null) ||
            (entry.coverLetterVersionId === null && entry.previousCoverLetterId !== null)
          ) {
            changeType = "removed";
          }
          // Check if any material was linked (only if not removed)
          else if (
            (entry.previousResumeId === null && entry.resumeVersionId !== null) ||
            (entry.previousCoverLetterId === null && entry.coverLetterVersionId !== null)
          ) {
            changeType = "linked";
          }
          // Otherwise it's an update (both existed before and after, but changed)
          else if (
            (entry.previousResumeId !== entry.resumeVersionId) ||
            (entry.previousCoverLetterId !== entry.coverLetterVersionId)
          ) {
            changeType = "updated";
          }

          return {
            id: entry.timestamp, // Use timestamp as ID
            jobOpportunityId,
            changedAt: entry.timestamp,
            changedByUserId: userId,
            changeType,
            notes: null,
            resume,
            coverLetter,
          };
        });

      // Resolve all promises
      return await Promise.all(materialsHistory);
    } catch (error) {
      console.error("❌ Error getting materials history:", error);
      throw error;
    }
  }

  /**
   * Get available resume versions for a user
   */
  async getAvailableResumes(userId) {
    try {
      const query = `
        SELECT id, version_name, version_number, description, 
               created_at, updated_at, file, is_master, parent_resume_id, job_id
        FROM resume
        WHERE user_id = $1
        ORDER BY is_master DESC, version_number DESC, created_at DESC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        id: row.id,
        versionName: row.version_name,
        versionNumber: row.version_number || 1,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        file: row.file,
        isMaster: row.is_master || false,
        parentResumeId: row.parent_resume_id,
        jobId: row.job_id, // Include job_id to show if already linked
      }));
    } catch (error) {
      console.error("❌ Error getting available resumes:", error);
      throw error;
    }
  }

  /**
   * Get available cover letter versions for a user
   */
  async getAvailableCoverLetters(userId) {
    try {
      const query = `
        SELECT id, version_name, version_number, description,
               created_at, updated_at, file, is_master, parent_coverletter_id, job_id
        FROM coverletter
        WHERE user_id = $1
        ORDER BY is_master DESC, version_number DESC, created_at DESC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        id: row.id,
        versionName: row.version_name,
        versionNumber: row.version_number || 1,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        file: row.file,
        isMaster: row.is_master || false,
        parentCoverLetterId: row.parent_coverletter_id,
        jobId: row.job_id, // Include job_id to show if already linked
      }));
    } catch (error) {
      console.error("❌ Error getting available cover letters:", error);
      throw error;
    }
  }

  /**
   * Get materials usage analytics
   */
  async getMaterialsUsageAnalytics(userId) {
    try {
      // Get resume usage statistics
      const resumeUsageQuery = `
        SELECT 
          r.id,
          r.version_name,
          r.version_number,
          COUNT(CASE WHEN r.job_id IS NOT NULL THEN 1 END) AS usage_count,
          COUNT(CASE WHEN r.job_id IS NOT NULL AND jo.archived = false THEN 1 END) AS active_usage_count,
          COUNT(CASE WHEN r.job_id IS NOT NULL AND jo.status = 'Applied' THEN 1 END) AS applied_count,
          COUNT(CASE WHEN r.job_id IS NOT NULL AND jo.status = 'Offer' THEN 1 END) AS offer_count
        FROM resume r
        LEFT JOIN job_opportunities jo ON jo.id = r.job_id AND jo.user_id = $1
        WHERE r.user_id = $1
        GROUP BY r.id, r.version_name, r.version_number
        ORDER BY usage_count DESC, r.created_at DESC
      `;

      const resumeUsageResult = await database.query(resumeUsageQuery, [userId]);

      // Get cover letter usage statistics
      const coverLetterUsageQuery = `
        SELECT 
          cl.id,
          cl.version_name,
          cl.version_number,
          COUNT(CASE WHEN cl.job_id IS NOT NULL THEN 1 END) AS usage_count,
          COUNT(CASE WHEN cl.job_id IS NOT NULL AND jo.archived = false THEN 1 END) AS active_usage_count,
          COUNT(CASE WHEN cl.job_id IS NOT NULL AND jo.status = 'Applied' THEN 1 END) AS applied_count,
          COUNT(CASE WHEN cl.job_id IS NOT NULL AND jo.status = 'Offer' THEN 1 END) AS offer_count
        FROM coverletter cl
        LEFT JOIN job_opportunities jo ON jo.id = cl.job_id AND jo.user_id = $1
        WHERE cl.user_id = $1
        GROUP BY cl.id, cl.version_name, cl.version_number
        ORDER BY usage_count DESC, cl.created_at DESC
      `;

      const coverLetterUsageResult = await database.query(coverLetterUsageQuery, [userId]);

      // Get most used materials
      const mostUsedResume = resumeUsageResult.rows[0] || null;
      const mostUsedCoverLetter = coverLetterUsageResult.rows[0] || null;

      // Get total statistics
      const totalJobsQuery = `
        SELECT 
          COUNT(*) AS total_jobs,
          COUNT(CASE WHEN r.job_id IS NOT NULL THEN 1 END) AS jobs_with_resume,
          COUNT(CASE WHEN cl.job_id IS NOT NULL THEN 1 END) AS jobs_with_cover_letter,
          COUNT(CASE WHEN r.job_id IS NOT NULL AND cl.job_id IS NOT NULL THEN 1 END) AS jobs_with_both
        FROM job_opportunities jo
        LEFT JOIN resume r ON r.job_id = jo.id AND r.user_id = jo.user_id
        LEFT JOIN coverletter cl ON cl.job_id = jo.id AND cl.user_id = jo.user_id
        WHERE jo.user_id = $1 AND jo.archived = false
      `;

      const totalStatsResult = await database.query(totalJobsQuery, [userId]);
      const totalStats = totalStatsResult.rows[0];

      return {
        resumeUsage: resumeUsageResult.rows.map((row) => ({
          id: row.id,
          versionName: row.version_name,
          versionNumber: row.version_number,
          usageCount: parseInt(row.usage_count) || 0,
          activeUsageCount: parseInt(row.active_usage_count) || 0,
          appliedCount: parseInt(row.applied_count) || 0,
          offerCount: parseInt(row.offer_count) || 0,
        })),
        coverLetterUsage: coverLetterUsageResult.rows.map((row) => ({
          id: row.id,
          versionName: row.version_name,
          versionNumber: row.version_number,
          usageCount: parseInt(row.usage_count) || 0,
          activeUsageCount: parseInt(row.active_usage_count) || 0,
          appliedCount: parseInt(row.applied_count) || 0,
          offerCount: parseInt(row.offer_count) || 0,
        })),
        mostUsedResume: mostUsedResume
          ? {
              id: mostUsedResume.id,
              versionName: mostUsedResume.version_name,
              versionNumber: mostUsedResume.version_number,
              usageCount: parseInt(mostUsedResume.usage_count) || 0,
            }
          : null,
        mostUsedCoverLetter: mostUsedCoverLetter
          ? {
              id: mostUsedCoverLetter.id,
              versionName: mostUsedCoverLetter.version_name,
              versionNumber: mostUsedCoverLetter.version_number,
              usageCount: parseInt(mostUsedCoverLetter.usage_count) || 0,
            }
          : null,
        totalStats: {
          totalJobs: parseInt(totalStats.total_jobs) || 0,
          jobsWithResume: parseInt(totalStats.jobs_with_resume) || 0,
          jobsWithCoverLetter: parseInt(totalStats.jobs_with_cover_letter) || 0,
          jobsWithBoth: parseInt(totalStats.jobs_with_both) || 0,
        },
      };
    } catch (error) {
      console.error("❌ Error getting materials usage analytics:", error);
      throw error;
    }
  }

  /**
   * Compare two resume versions
   */
  async compareResumeVersions(resumeId1, resumeId2, userId) {
    try {
      // Verify user owns both resumes
      const verifyQuery = `
        SELECT id, version_name, version_number, content, created_at, updated_at
        FROM resume
        WHERE id IN ($1, $2) AND user_id = $3
      `;
      const verifyResult = await database.query(verifyQuery, [
        resumeId1,
        resumeId2,
        userId,
      ]);

      if (verifyResult.rows.length !== 2) {
        throw new Error("One or more resumes not found or access denied");
      }

      const resume1 = verifyResult.rows.find((r) => r.id === resumeId1);
      const resume2 = verifyResult.rows.find((r) => r.id === resumeId2);

      // Parse JSONB content
      let content1 = null;
      let content2 = null;

      try {
        content1 =
          typeof resume1.content === "string"
            ? JSON.parse(resume1.content)
            : resume1.content;
        content2 =
          typeof resume2.content === "string"
            ? JSON.parse(resume2.content)
            : resume2.content;
      } catch (error) {
        console.error("Error parsing resume content:", error);
      }

      return {
        resume1: {
          id: resume1.id,
          versionName: resume1.version_name,
          versionNumber: resume1.version_number,
          content: content1,
          createdAt: resume1.created_at,
          updatedAt: resume1.updated_at,
        },
        resume2: {
          id: resume2.id,
          versionName: resume2.version_name,
          versionNumber: resume2.version_number,
          content: content2,
          createdAt: resume2.created_at,
          updatedAt: resume2.updated_at,
        },
      };
    } catch (error) {
      console.error("❌ Error comparing resume versions:", error);
      throw error;
    }
  }

  /**
   * Compare two cover letter versions
   */
  async compareCoverLetterVersions(coverLetterId1, coverLetterId2, userId) {
    try {
      // Verify user owns both cover letters
      const verifyQuery = `
        SELECT id, version_name, version_number, content, created_at, updated_at
        FROM coverletter
        WHERE id IN ($1, $2) AND user_id = $3
      `;
      const verifyResult = await database.query(verifyQuery, [
        coverLetterId1,
        coverLetterId2,
        userId,
      ]);

      if (verifyResult.rows.length !== 2) {
        throw new Error("One or more cover letters not found or access denied");
      }

      const coverLetter1 = verifyResult.rows.find((cl) => cl.id === coverLetterId1);
      const coverLetter2 = verifyResult.rows.find((cl) => cl.id === coverLetterId2);

      // Parse JSONB content
      let content1 = null;
      let content2 = null;

      try {
        content1 =
          typeof coverLetter1.content === "string"
            ? JSON.parse(coverLetter1.content)
            : coverLetter1.content;
        content2 =
          typeof coverLetter2.content === "string"
            ? JSON.parse(coverLetter2.content)
            : coverLetter2.content;
      } catch (error) {
        console.error("Error parsing cover letter content:", error);
      }

      return {
        coverLetter1: {
          id: coverLetter1.id,
          versionName: coverLetter1.version_name,
          versionNumber: coverLetter1.version_number,
          content: content1,
          createdAt: coverLetter1.created_at,
          updatedAt: coverLetter1.updated_at,
        },
        coverLetter2: {
          id: coverLetter2.id,
          versionName: coverLetter2.version_name,
          versionNumber: coverLetter2.version_number,
          content: content2,
          createdAt: coverLetter2.created_at,
          updatedAt: coverLetter2.updated_at,
        },
      };
    } catch (error) {
      console.error("❌ Error comparing cover letter versions:", error);
      throw error;
    }
  }
}

export default new JobMaterialsService();

