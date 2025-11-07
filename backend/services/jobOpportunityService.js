import { v4 as uuidv4 } from "uuid";
import database from "./database.js";

class JobOpportunityService {
  constructor() {
    this.maxDescriptionLength = 2000;
    this.maxTitleLength = 255;
    this.maxCompanyLength = 255;
    this.maxLocationLength = 255;
    this.maxUrlLength = 1000;
    this.maxIndustryLength = 255;
    this.maxJobTypeLength = 50;
    this.validStatuses = [
      "Interested",
      "Applied",
      "Phone Screen",
      "Interview",
      "Offer",
      "Rejected",
    ];
  }

  // Validate status
  validateStatus(status) {
    if (status && !this.validStatuses.includes(status)) {
      throw new Error(
        `Invalid status. Must be one of: ${this.validStatuses.join(", ")}`
      );
    }
  }

  // Validate field lengths
  validateFieldLengths(jobOpportunityData) {
    if (
      jobOpportunityData.title &&
      jobOpportunityData.title.length > this.maxTitleLength
    ) {
      throw new Error(`Title must be less than ${this.maxTitleLength} characters`);
    }

    if (
      jobOpportunityData.company &&
      jobOpportunityData.company.length > this.maxCompanyLength
    ) {
      throw new Error(
        `Company name must be less than ${this.maxCompanyLength} characters`
      );
    }

    if (
      jobOpportunityData.location &&
      jobOpportunityData.location.length > this.maxLocationLength
    ) {
      throw new Error(
        `Location must be less than ${this.maxLocationLength} characters`
      );
    }

    if (
      jobOpportunityData.jobPostingUrl &&
      jobOpportunityData.jobPostingUrl.length > this.maxUrlLength
    ) {
      throw new Error(`URL must be less than ${this.maxUrlLength} characters`);
    }

    if (
      jobOpportunityData.description &&
      jobOpportunityData.description.length > this.maxDescriptionLength
    ) {
      throw new Error(
        `Description must be less than ${this.maxDescriptionLength} characters`
      );
    }

    if (
      jobOpportunityData.industry &&
      jobOpportunityData.industry.length > this.maxIndustryLength
    ) {
      throw new Error(
        `Industry must be less than ${this.maxIndustryLength} characters`
      );
    }

    if (
      jobOpportunityData.jobType &&
      jobOpportunityData.jobType.length > this.maxJobTypeLength
    ) {
      throw new Error(
        `Job type must be less than ${this.maxJobTypeLength} characters`
      );
    }
  }

  // Validate salary range
  validateSalaryRange(salaryMin, salaryMax) {
    if (salaryMin !== undefined && salaryMin !== null && salaryMin < 0) {
      throw new Error("Minimum salary cannot be negative");
    }

    if (salaryMax !== undefined && salaryMax !== null && salaryMax < 0) {
      throw new Error("Maximum salary cannot be negative");
    }

    if (
      salaryMin !== undefined &&
      salaryMin !== null &&
      salaryMax !== undefined &&
      salaryMax !== null &&
      salaryMin > salaryMax
    ) {
      throw new Error("Minimum salary cannot be greater than maximum salary");
    }
  }

  // Validate URL format
  validateUrl(url) {
    if (!url || url.trim() === "") {
      return; // Optional field
    }

    try {
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        throw new Error("URL must use http:// or https:// protocol");
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error("Invalid URL format");
      }
      throw error;
    }
  }

  // Create a new job opportunity
  async createJobOpportunity(userId, opportunityData) {
    const {
      title,
      company,
      location,
      salaryMin,
      salaryMax,
      jobPostingUrl,
      applicationDeadline,
      description,
      industry,
      jobType,
      status = "Interested",
    } = opportunityData;

    try {
      // Validate required fields
      if (!title || !title.trim()) {
        throw new Error("Title is required");
      }
      if (!company || !company.trim()) {
        throw new Error("Company is required");
      }
      if (!location || !location.trim()) {
        throw new Error("Location is required");
      }

      // Validate field lengths
      this.validateFieldLengths(opportunityData);

      // Validate salary range
      this.validateSalaryRange(salaryMin, salaryMax);

      // Validate URL if provided
      if (jobPostingUrl) {
        this.validateUrl(jobPostingUrl);
      }

      // Validate status
      this.validateStatus(status);

      const opportunityId = uuidv4();

      // Create job opportunity in database
      const query = `
        INSERT INTO job_opportunities (
          id, user_id, title, company, location, salary_min, salary_max,
          job_posting_url, application_deadline, job_description, industry, job_type, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, title, company, location, salary_min, salary_max,
          job_posting_url, application_deadline, job_description, industry, job_type, status,
          status_updated_at, created_at, updated_at
      `;

      const result = await database.query(query, [
        opportunityId,
        userId,
        title.trim(),
        company.trim(),
        location.trim(),
        salaryMin || null,
        salaryMax || null,
        jobPostingUrl?.trim() || null,
        applicationDeadline || null,
        description?.trim() || null,
        industry?.trim() || null,
        jobType?.trim() || null,
        status,
      ]);

      const row = result.rows[0];

      return {
        id: row.id,
        title: row.title,
        company: row.company,
        location: row.location,
        salaryMin: row.salary_min,
        salaryMax: row.salary_max,
        jobPostingUrl: row.job_posting_url,
        applicationDeadline: row.application_deadline,
        description: row.job_description,
        industry: row.industry,
        jobType: row.job_type,
        status: row.status,
        statusUpdatedAt: row.status_updated_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error("❌ Error creating job opportunity:", error);
      throw error;
    }
  }

  // Get job opportunity by ID (with user ownership validation)
  async getJobOpportunityById(opportunityId, userId) {
    try {
      const query = `
        SELECT id, title, company, location, salary_min, salary_max,
          job_posting_url, application_deadline, job_description, industry, job_type, status,
          status_updated_at, created_at, updated_at
        FROM job_opportunities
        WHERE id = $1 AND user_id = $2
      `;

      const result = await database.query(query, [opportunityId, userId]);
      const opportunity = result.rows[0];

      if (!opportunity) {
        return null;
      }

      return {
        id: opportunity.id,
        title: opportunity.title,
        company: opportunity.company,
        location: opportunity.location,
        salaryMin: opportunity.salary_min,
        salaryMax: opportunity.salary_max,
        jobPostingUrl: opportunity.job_posting_url,
        applicationDeadline: opportunity.application_deadline,
        description: opportunity.job_description,
        industry: opportunity.industry,
        jobType: opportunity.job_type,
        status: opportunity.status,
        statusUpdatedAt: opportunity.status_updated_at,
        createdAt: opportunity.created_at,
        updatedAt: opportunity.updated_at,
      };
    } catch (error) {
      console.error("❌ Error getting job opportunity by ID:", error);
      throw error;
    }
  }

  // Get all job opportunities for a user
  async getJobOpportunitiesByUserId(userId, options = {}) {
    try {
      const { sort = "-created_at", limit = 50, offset = 0, status } = options;

      // Validate limit
      const validLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
      const validOffset = Math.max(parseInt(offset) || 0, 0);

      // Build WHERE clause
      let whereClause = "WHERE user_id = $1";
      const queryParams = [userId];
      let paramIndex = 2;

      if (status) {
        this.validateStatus(status);
        whereClause += ` AND status = $${paramIndex++}`;
        queryParams.push(status);
      }

      // Build sort clause
      let sortClause = "ORDER BY created_at DESC";
      if (sort === "created_at") {
        sortClause = "ORDER BY created_at ASC";
      } else if (sort === "application_deadline") {
        sortClause = "ORDER BY application_deadline ASC NULLS LAST";
      } else if (sort === "-application_deadline") {
        sortClause = "ORDER BY application_deadline DESC NULLS LAST";
      } else if (sort === "company") {
        sortClause = "ORDER BY company ASC";
      } else if (sort === "status_updated_at") {
        sortClause = "ORDER BY status_updated_at DESC";
      }

      const query = `
        SELECT id, title, company, location, salary_min, salary_max,
          job_posting_url, application_deadline, job_description, industry, job_type, status,
          status_updated_at, created_at, updated_at
        FROM job_opportunities
        ${whereClause}
        ${sortClause}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      queryParams.push(validLimit, validOffset);

      const result = await database.query(query, queryParams);

      return result.rows.map((opportunity) => ({
        id: opportunity.id,
        title: opportunity.title,
        company: opportunity.company,
        location: opportunity.location,
        salaryMin: opportunity.salary_min,
        salaryMax: opportunity.salary_max,
        jobPostingUrl: opportunity.job_posting_url,
        applicationDeadline: opportunity.application_deadline,
        description: opportunity.job_description,
        industry: opportunity.industry,
        jobType: opportunity.job_type,
        status: opportunity.status,
        statusUpdatedAt: opportunity.status_updated_at,
        createdAt: opportunity.created_at,
        updatedAt: opportunity.updated_at,
      }));
    } catch (error) {
      console.error("❌ Error getting job opportunities:", error);
      throw error;
    }
  }

  // Get total count of job opportunities for a user
  async getJobOpportunitiesCount(userId) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM job_opportunities
        WHERE user_id = $1
      `;

      const result = await database.query(query, [userId]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error("❌ Error getting job opportunities count:", error);
      throw error;
    }
  }

  // Update job opportunity
  async updateJobOpportunity(opportunityId, userId, updateData) {
    try {
      // Check if opportunity exists and belongs to user
      const existing = await this.getJobOpportunityById(opportunityId, userId);
      if (!existing) {
        throw new Error("Job opportunity not found");
      }

      // Validate field lengths if provided
      this.validateFieldLengths(updateData);

      // Validate salary range if provided
      const salaryMin = updateData.salaryMin !== undefined ? updateData.salaryMin : existing.salaryMin;
      const salaryMax = updateData.salaryMax !== undefined ? updateData.salaryMax : existing.salaryMax;
      this.validateSalaryRange(salaryMin, salaryMax);

      // Validate URL if provided
      if (updateData.jobPostingUrl !== undefined) {
        if (updateData.jobPostingUrl) {
          this.validateUrl(updateData.jobPostingUrl);
        }
      }

      // Check if status is being updated
      if (updateData.status !== undefined) {
        this.validateStatus(updateData.status);
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramIndex = 1;

      const fields = {
        title: "title",
        company: "company",
        location: "location",
        salaryMin: "salary_min",
        salaryMax: "salary_max",
        jobPostingUrl: "job_posting_url",
        applicationDeadline: "application_deadline",
        description: "job_description",
        industry: "industry",
        jobType: "job_type",
        status: "status",
      };

      for (const [key, column] of Object.entries(fields)) {
        if (updateData[key] !== undefined) {
          if (key === "title" || key === "company" || key === "location") {
            // Required fields - must not be empty
            if (!updateData[key] || updateData[key].trim() === "") {
              throw new Error(`${key} is required`);
            }
            updates.push(`${column} = $${paramIndex++}`);
            values.push(updateData[key].trim());
          } else if (key === "description" || key === "industry" || key === "jobType") {
            // Optional string fields
            updates.push(`${column} = $${paramIndex++}`);
            values.push(
              updateData[key] && updateData[key].trim() !== ""
                ? updateData[key].trim()
                : null
            );
          } else if (key === "jobPostingUrl") {
            updates.push(`${column} = $${paramIndex++}`);
            values.push(
              updateData[key] && updateData[key].trim() !== ""
                ? updateData[key].trim()
                : null
            );
          } else if (key === "salaryMin" || key === "salaryMax") {
            updates.push(`${column} = $${paramIndex++}`);
            values.push(updateData[key] || null);
          } else if (key === "applicationDeadline") {
            updates.push(`${column} = $${paramIndex++}`);
            values.push(updateData[key] || null);
          } else if (key === "status") {
            // Status field - will update the value
            updates.push(`${column} = $${paramIndex++}`);
            values.push(updateData[key]);
          }
        }
      }

      if (updates.length === 0) {
        return existing; // No updates to make
      }

      // Add user_id and opportunity_id to values
      values.push(userId, opportunityId);

      const query = `
        UPDATE job_opportunities
        SET ${updates.join(", ")}, updated_at = NOW()
        WHERE user_id = $${paramIndex++} AND id = $${paramIndex}
        RETURNING id, title, company, location, salary_min, salary_max,
          job_posting_url, application_deadline, job_description, industry, job_type, status,
          status_updated_at, created_at, updated_at
      `;

      const result = await database.query(query, values);
      const row = result.rows[0];

      return {
        id: row.id,
        title: row.title,
        company: row.company,
        location: row.location,
        salaryMin: row.salary_min,
        salaryMax: row.salary_max,
        jobPostingUrl: row.job_posting_url,
        applicationDeadline: row.application_deadline,
        description: row.job_description,
        industry: row.industry,
        jobType: row.job_type,
        status: row.status,
        statusUpdatedAt: row.status_updated_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error("❌ Error updating job opportunity:", error);
      throw error;
    }
  }

  // Bulk update status for multiple job opportunities
  async bulkUpdateStatus(userId, opportunityIds, newStatus) {
    try {
      // Validate status
      this.validateStatus(newStatus);

      if (!Array.isArray(opportunityIds) || opportunityIds.length === 0) {
        throw new Error("Opportunity IDs array is required and cannot be empty");
      }

      // Verify all opportunities belong to the user
      const placeholders = opportunityIds.map((_, index) => `$${index + 2}`).join(", ");
      const query = `
        UPDATE job_opportunities
        SET status = $1, updated_at = NOW()
        WHERE user_id = $${opportunityIds.length + 2} 
          AND id IN (${placeholders})
        RETURNING id, title, company, status, status_updated_at
      `;

      const values = [newStatus, ...opportunityIds, userId];
      const result = await database.query(query, values);

      if (result.rows.length !== opportunityIds.length) {
        throw new Error(
          "Some job opportunities were not found or do not belong to the user"
        );
      }

      return result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        company: row.company,
        status: row.status,
        statusUpdatedAt: row.status_updated_at,
      }));
    } catch (error) {
      console.error("❌ Error bulk updating status:", error);
      throw error;
    }
  }

  // Get status counts for a user
  async getStatusCounts(userId) {
    try {
      const query = `
        SELECT status, COUNT(*) as count
        FROM job_opportunities
        WHERE user_id = $1
        GROUP BY status
        ORDER BY 
          CASE status
            WHEN 'Interested' THEN 1
            WHEN 'Applied' THEN 2
            WHEN 'Phone Screen' THEN 3
            WHEN 'Interview' THEN 4
            WHEN 'Offer' THEN 5
            WHEN 'Rejected' THEN 6
          END
      `;

      const result = await database.query(query, [userId]);
      const counts = {};

      // Initialize all statuses with 0
      this.validStatuses.forEach((status) => {
        counts[status] = 0;
      });

      // Update with actual counts
      result.rows.forEach((row) => {
        counts[row.status] = parseInt(row.count, 10);
      });

      return counts;
    } catch (error) {
      console.error("❌ Error getting status counts:", error);
      throw error;
    }
  }

  // Delete job opportunity
  async deleteJobOpportunity(opportunityId, userId) {
    try {
      // Check if opportunity exists and belongs to user
      const existing = await this.getJobOpportunityById(opportunityId, userId);
      if (!existing) {
        throw new Error("Job opportunity not found");
      }

      const query = `
        DELETE FROM job_opportunities
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [opportunityId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Job opportunity not found");
      }

      return { id: result.rows[0].id };
    } catch (error) {
      console.error("❌ Error deleting job opportunity:", error);
      throw error;
    }
  }
}

export default new JobOpportunityService();

