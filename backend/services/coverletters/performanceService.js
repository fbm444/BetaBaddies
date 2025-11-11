import { v4 as uuidv4 } from "uuid";
import database from "../database.js";

class CoverLetterPerformanceService {
  // Track cover letter performance
  async trackPerformance(coverLetterId, userId, performanceData) {
    try {
      const { jobId, applicationOutcome, responseDate, notes } =
        performanceData;

      const performanceId = uuidv4();

      const query = `
        INSERT INTO cover_letter_performance (
          id, coverletter_id, job_id, application_outcome, response_date, notes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, coverletter_id, job_id, application_outcome, response_date, notes, created_at, updated_at
      `;

      const result = await database.query(query, [
        performanceId,
        coverLetterId,
        jobId || null,
        applicationOutcome || null,
        responseDate || null,
        notes || null,
      ]);

      // Update performance metrics in cover letter
      await this.updateCoverLetterMetrics(coverLetterId, userId);

      return {
        id: result.rows[0].id,
        coverLetterId: result.rows[0].coverletter_id,
        jobId: result.rows[0].job_id,
        applicationOutcome: result.rows[0].application_outcome,
        responseDate: result.rows[0].response_date,
        notes: result.rows[0].notes,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      };
    } catch (error) {
      console.error("❌ Error tracking performance:", error);
      throw error;
    }
  }

  // Get performance metrics for a cover letter
  async getPerformanceMetrics(coverLetterId, userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_applications,
          COUNT(CASE WHEN application_outcome = 'interview' THEN 1 END) as interviews,
          COUNT(CASE WHEN application_outcome = 'accepted' THEN 1 END) as acceptances,
          COUNT(CASE WHEN application_outcome = 'rejected' THEN 1 END) as rejections,
          COUNT(CASE WHEN application_outcome = 'no_response' THEN 1 END) as no_responses,
          ROUND(
            COUNT(CASE WHEN application_outcome = 'interview' THEN 1 END)::numeric / 
            NULLIF(COUNT(*), 0) * 100, 
            2
          ) as interview_rate,
          ROUND(
            COUNT(CASE WHEN application_outcome = 'accepted' THEN 1 END)::numeric / 
            NULLIF(COUNT(*), 0) * 100, 
            2
          ) as acceptance_rate
        FROM cover_letter_performance
        WHERE coverletter_id = $1
      `;

      const result = await database.query(query, [coverLetterId]);

      return result.rows[0] || {
        total_applications: 0,
        interviews: 0,
        acceptances: 0,
        rejections: 0,
        no_responses: 0,
        interview_rate: 0,
        acceptance_rate: 0,
      };
    } catch (error) {
      console.error("❌ Error getting performance metrics:", error);
      throw error;
    }
  }

  // Get performance by template
  async getPerformanceByTemplate(templateId) {
    try {
      const query = `
        SELECT 
          cl.template_id,
          COUNT(DISTINCT cp.coverletter_id) as cover_letters_used,
          COUNT(cp.id) as total_applications,
          COUNT(CASE WHEN cp.application_outcome = 'interview' THEN 1 END) as interviews,
          COUNT(CASE WHEN cp.application_outcome = 'accepted' THEN 1 END) as acceptances,
          ROUND(
            COUNT(CASE WHEN cp.application_outcome = 'interview' THEN 1 END)::numeric / 
            NULLIF(COUNT(cp.id), 0) * 100, 
            2
          ) as interview_rate
        FROM cover_letter_performance cp
        JOIN coverletter cl ON cp.coverletter_id = cl.id
        WHERE cl.template_id = $1
        GROUP BY cl.template_id
      `;

      const result = await database.query(query, [templateId]);

      return result.rows[0] || {
        template_id: templateId,
        cover_letters_used: 0,
        total_applications: 0,
        interviews: 0,
        acceptances: 0,
        interview_rate: 0,
      };
    } catch (error) {
      console.error("❌ Error getting performance by template:", error);
      throw error;
    }
  }

  // Update cover letter performance metrics
  async updateCoverLetterMetrics(coverLetterId, userId) {
    try {
      const metrics = await this.getPerformanceMetrics(coverLetterId, userId);

      // Update cover letter with metrics
      const { default: coverLetterService } = await import("./coreService.js");
      await coverLetterService.updateCoverLetter(coverLetterId, userId, {
        performanceMetrics: metrics,
      });

      return metrics;
    } catch (error) {
      console.error("❌ Error updating cover letter metrics:", error);
      throw error;
    }
  }

  // Get all performance records for a cover letter
  async getPerformanceRecords(coverLetterId, userId) {
    try {
      const query = `
        SELECT 
          cp.id,
          cp.coverletter_id,
          cp.job_id,
          cp.application_outcome,
          cp.response_date,
          cp.notes,
          cp.created_at,
          cp.updated_at,
          pj.job_title,
          pj.company
        FROM cover_letter_performance cp
        LEFT JOIN prospectivejobs pj ON cp.job_id = pj.id
        WHERE cp.coverletter_id = $1
        ORDER BY cp.created_at DESC
      `;

      const result = await database.query(query, [coverLetterId]);

      return result.rows.map((row) => ({
        id: row.id,
        coverLetterId: row.coverletter_id,
        jobId: row.job_id,
        applicationOutcome: row.application_outcome,
        responseDate: row.response_date,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        jobTitle: row.job_title,
        company: row.company,
      }));
    } catch (error) {
      console.error("❌ Error getting performance records:", error);
      throw error;
    }
  }
}

export default new CoverLetterPerformanceService();

