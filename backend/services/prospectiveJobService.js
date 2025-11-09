import database from "./database.js";

class ProspectiveJobService {
  /**
   * Get all prospective jobs for a user
   */
  async getProspectiveJobs(userId, options = {}) {
    try {
      const { stage, sort = "-date_added", limit = 100, offset = 0 } = options;

      // Build WHERE clause
      let whereClause = "WHERE user_id = $1";
      const params = [userId];
      let paramIndex = 2;

      if (stage) {
        whereClause += ` AND stage = $${paramIndex}`;
        params.push(stage);
        paramIndex++;
      }

      // Build sort clause
      let sortClause = "ORDER BY date_added DESC";
      if (sort === "date_added") {
        sortClause = "ORDER BY date_added ASC";
      } else if (sort === "company") {
        sortClause = "ORDER BY company ASC";
      } else if (sort === "job_title") {
        sortClause = "ORDER BY job_title ASC";
      }

      // Validate limit and offset
      const validLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 200);
      const validOffset = Math.max(parseInt(offset) || 0, 0);

      params.push(validLimit);
      params.push(validOffset);

      const query = `
        SELECT 
          id, user_id, deadline, description, industry, job_type,
          job_title, company, location, salary_low, salary_high, stage,
          status_change_time, personal_notes, salary_notes, date_added,
          job_url, current_resume, current_coverletter, autoarchive_time_limit
        FROM prospectivejobs
        ${whereClause}
        ${sortClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await database.query(query, params);

      return result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        deadline: row.deadline,
        description: row.description,
        industry: row.industry,
        jobType: row.job_type,
        jobTitle: row.job_title,
        company: row.company,
        location: row.location,
        salaryLow: row.salary_low,
        salaryHigh: row.salary_high,
        stage: row.stage,
        statusChangeTime: row.status_change_time,
        personalNotes: row.personal_notes,
        salaryNotes: row.salary_notes,
        dateAdded: row.date_added,
        jobUrl: row.job_url,
        currentResume: row.current_resume,
        currentCoverletter: row.current_coverletter,
        autoarchiveTimeLimit: row.autoarchive_time_limit,
      }));
    } catch (error) {
      console.error("❌ Error getting prospective jobs:", error);
      throw error;
    }
  }

  /**
   * Get a specific prospective job by ID
   */
  async getProspectiveJobById(jobId, userId) {
    try {
      const query = `
        SELECT 
          id, user_id, deadline, description, industry, job_type,
          job_title, company, location, salary_low, salary_high, stage,
          status_change_time, personal_notes, salary_notes, date_added,
          job_url, current_resume, current_coverletter, autoarchive_time_limit
        FROM prospectivejobs
        WHERE id = $1 AND user_id = $2
      `;

      const result = await database.query(query, [jobId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        deadline: row.deadline,
        description: row.description,
        industry: row.industry,
        jobType: row.job_type,
        jobTitle: row.job_title,
        company: row.company,
        location: row.location,
        salaryLow: row.salary_low,
        salaryHigh: row.salary_high,
        stage: row.stage,
        statusChangeTime: row.status_change_time,
        personalNotes: row.personal_notes,
        salaryNotes: row.salary_notes,
        dateAdded: row.date_added,
        jobUrl: row.job_url,
        currentResume: row.current_resume,
        currentCoverletter: row.current_coverletter,
        autoarchiveTimeLimit: row.autoarchive_time_limit,
      };
    } catch (error) {
      console.error("❌ Error getting prospective job by ID:", error);
      throw error;
    }
  }
}

export default new ProspectiveJobService();

