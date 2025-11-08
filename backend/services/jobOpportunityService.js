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
      notes,
      recruiterName,
      recruiterEmail,
      recruiterPhone,
      hiringManagerName,
      hiringManagerEmail,
      hiringManagerPhone,
      salaryNegotiationNotes,
      interviewNotes,
      applicationHistory,
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

      // Validate application history if provided
      if (applicationHistory !== undefined && applicationHistory !== null) {
        if (!Array.isArray(applicationHistory)) {
          throw new Error("Application history must be an array");
        }
      }

      // Create job opportunity in database
      const query = `
        INSERT INTO job_opportunities (
          id, user_id, title, company, location, salary_min, salary_max,
          job_posting_url, application_deadline, job_description, industry, job_type, status,
          notes, recruiter_name, recruiter_email, recruiter_phone,
          hiring_manager_name, hiring_manager_email, hiring_manager_phone,
          salary_negotiation_notes, interview_notes, application_history
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING id, title, company, location, salary_min, salary_max,
          job_posting_url, application_deadline, job_description, industry, job_type, status,
          notes, recruiter_name, recruiter_email, recruiter_phone,
          hiring_manager_name, hiring_manager_email, hiring_manager_phone,
          salary_negotiation_notes, interview_notes, application_history,
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
        notes?.trim() || null,
        recruiterName?.trim() || null,
        recruiterEmail?.trim() || null,
        recruiterPhone?.trim() || null,
        hiringManagerName?.trim() || null,
        hiringManagerEmail?.trim() || null,
        hiringManagerPhone?.trim() || null,
        salaryNegotiationNotes?.trim() || null,
        interviewNotes?.trim() || null,
        applicationHistory ? JSON.stringify(applicationHistory) : '[]',
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
        notes: row.notes,
        recruiterName: row.recruiter_name,
        recruiterEmail: row.recruiter_email,
        recruiterPhone: row.recruiter_phone,
        hiringManagerName: row.hiring_manager_name,
        hiringManagerEmail: row.hiring_manager_email,
        hiringManagerPhone: row.hiring_manager_phone,
        salaryNegotiationNotes: row.salary_negotiation_notes,
        interviewNotes: row.interview_notes,
        applicationHistory: row.application_history || [],
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
          notes, recruiter_name, recruiter_email, recruiter_phone,
          hiring_manager_name, hiring_manager_email, hiring_manager_phone,
          salary_negotiation_notes, interview_notes, application_history,
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
        notes: opportunity.notes,
        recruiterName: opportunity.recruiter_name,
        recruiterEmail: opportunity.recruiter_email,
        recruiterPhone: opportunity.recruiter_phone,
        hiringManagerName: opportunity.hiring_manager_name,
        hiringManagerEmail: opportunity.hiring_manager_email,
        hiringManagerPhone: opportunity.hiring_manager_phone,
        salaryNegotiationNotes: opportunity.salary_negotiation_notes,
        interviewNotes: opportunity.interview_notes,
        applicationHistory: opportunity.application_history || [],
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
      const {
        sort = "-created_at",
        limit = 50,
        offset = 0,
        status,
        search,
        industry,
        location,
        salaryMin,
        salaryMax,
        deadlineFrom,
        deadlineTo,
      } = options;

      // Validate limit
      const validLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
      const validOffset = Math.max(parseInt(offset) || 0, 0);

      // Build WHERE clause
      let whereClause = "WHERE user_id = $1";
      const queryParams = [userId];
      let paramIndex = 2;

      // Search filter (searches in title, company, description, notes)
      if (search && search.trim()) {
        const searchTerm = `%${search.trim().toLowerCase()}%`;
        whereClause += ` AND (
          LOWER(title) LIKE $${paramIndex} OR
          LOWER(company) LIKE $${paramIndex} OR
          LOWER(job_description) LIKE $${paramIndex} OR
          LOWER(notes) LIKE $${paramIndex}
        )`;
        queryParams.push(searchTerm);
        paramIndex++;
      }

      // Status filter
      if (status) {
        this.validateStatus(status);
        whereClause += ` AND status = $${paramIndex++}`;
        queryParams.push(status);
      }

      // Industry filter
      if (industry && industry.trim()) {
        whereClause += ` AND industry = $${paramIndex++}`;
        queryParams.push(industry.trim());
      }

      // Location filter (case-insensitive partial match)
      if (location && location.trim()) {
        whereClause += ` AND LOWER(location) LIKE $${paramIndex++}`;
        queryParams.push(`%${location.trim().toLowerCase()}%`);
      }

      // Salary range filter
      if (salaryMin !== undefined && salaryMin !== null) {
        whereClause += ` AND (salary_max >= $${paramIndex} OR salary_max IS NULL)`;
        queryParams.push(salaryMin);
        paramIndex++;
      }
      if (salaryMax !== undefined && salaryMax !== null) {
        whereClause += ` AND (salary_min <= $${paramIndex} OR salary_min IS NULL)`;
        queryParams.push(salaryMax);
        paramIndex++;
      }

      // Application deadline date range filter
      if (deadlineFrom) {
        whereClause += ` AND application_deadline >= $${paramIndex++}`;
        queryParams.push(deadlineFrom);
      }
      if (deadlineTo) {
        whereClause += ` AND application_deadline <= $${paramIndex++}`;
        queryParams.push(deadlineTo);
      }

      // Build sort clause
      let sortClause = "ORDER BY created_at DESC";
      if (sort === "created_at") {
        sortClause = "ORDER BY created_at ASC";
      } else if (sort === "-created_at") {
        sortClause = "ORDER BY created_at DESC";
      } else if (sort === "application_deadline") {
        sortClause = "ORDER BY application_deadline ASC NULLS LAST";
      } else if (sort === "-application_deadline") {
        sortClause = "ORDER BY application_deadline DESC NULLS LAST";
      } else if (sort === "company") {
        sortClause = "ORDER BY company ASC";
      } else if (sort === "-company") {
        sortClause = "ORDER BY company DESC";
      } else if (sort === "salary") {
        sortClause = "ORDER BY salary_min ASC NULLS LAST, salary_max ASC NULLS LAST";
      } else if (sort === "-salary") {
        sortClause = "ORDER BY salary_max DESC NULLS LAST, salary_min DESC NULLS LAST";
      } else if (sort === "status_updated_at") {
        sortClause = "ORDER BY status_updated_at DESC";
      }

      const query = `
        SELECT id, title, company, location, salary_min, salary_max,
          job_posting_url, application_deadline, job_description, industry, job_type, status,
          notes, recruiter_name, recruiter_email, recruiter_phone,
          hiring_manager_name, hiring_manager_email, hiring_manager_phone,
          salary_negotiation_notes, interview_notes, application_history,
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
        notes: opportunity.notes,
        recruiterName: opportunity.recruiter_name,
        recruiterEmail: opportunity.recruiter_email,
        recruiterPhone: opportunity.recruiter_phone,
        hiringManagerName: opportunity.hiring_manager_name,
        hiringManagerEmail: opportunity.hiring_manager_email,
        hiringManagerPhone: opportunity.hiring_manager_phone,
        salaryNegotiationNotes: opportunity.salary_negotiation_notes,
        interviewNotes: opportunity.interview_notes,
        applicationHistory: opportunity.application_history || [],
        statusUpdatedAt: opportunity.status_updated_at,
        createdAt: opportunity.created_at,
        updatedAt: opportunity.updated_at,
      }));
    } catch (error) {
      console.error("❌ Error getting job opportunities:", error);
      throw error;
    }
  }

  // Get total count of job opportunities for a user (with same filters as getJobOpportunitiesByUserId)
  async getJobOpportunitiesCount(userId, options = {}) {
    try {
      const {
        status,
        search,
        industry,
        location,
        salaryMin,
        salaryMax,
        deadlineFrom,
        deadlineTo,
      } = options;

      // Build WHERE clause (same as getJobOpportunitiesByUserId)
      let whereClause = "WHERE user_id = $1";
      const queryParams = [userId];
      let paramIndex = 2;

      // Search filter
      if (search && search.trim()) {
        const searchTerm = `%${search.trim().toLowerCase()}%`;
        whereClause += ` AND (
          LOWER(title) LIKE $${paramIndex} OR
          LOWER(company) LIKE $${paramIndex} OR
          LOWER(job_description) LIKE $${paramIndex} OR
          LOWER(notes) LIKE $${paramIndex}
        )`;
        queryParams.push(searchTerm);
        paramIndex++;
      }

      // Status filter
      if (status) {
        this.validateStatus(status);
        whereClause += ` AND status = $${paramIndex++}`;
        queryParams.push(status);
      }

      // Industry filter
      if (industry && industry.trim()) {
        whereClause += ` AND industry = $${paramIndex++}`;
        queryParams.push(industry.trim());
      }

      // Location filter
      if (location && location.trim()) {
        whereClause += ` AND LOWER(location) LIKE $${paramIndex++}`;
        queryParams.push(`%${location.trim().toLowerCase()}%`);
      }

      // Salary range filter
      if (salaryMin !== undefined && salaryMin !== null) {
        whereClause += ` AND (salary_max >= $${paramIndex} OR salary_max IS NULL)`;
        queryParams.push(salaryMin);
        paramIndex++;
      }
      if (salaryMax !== undefined && salaryMax !== null) {
        whereClause += ` AND (salary_min <= $${paramIndex} OR salary_min IS NULL)`;
        queryParams.push(salaryMax);
        paramIndex++;
      }

      // Application deadline date range filter
      if (deadlineFrom) {
        whereClause += ` AND application_deadline >= $${paramIndex++}`;
        queryParams.push(deadlineFrom);
      }
      if (deadlineTo) {
        whereClause += ` AND application_deadline <= $${paramIndex++}`;
        queryParams.push(deadlineTo);
      }

      const query = `
        SELECT COUNT(*) as count
        FROM job_opportunities
        ${whereClause}
      `;

      const result = await database.query(query, queryParams);
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

      // Validate application history if provided
      if (updateData.applicationHistory !== undefined && updateData.applicationHistory !== null) {
        if (!Array.isArray(updateData.applicationHistory)) {
          throw new Error("Application history must be an array");
        }
      }

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
        notes: "notes",
        recruiterName: "recruiter_name",
        recruiterEmail: "recruiter_email",
        recruiterPhone: "recruiter_phone",
        hiringManagerName: "hiring_manager_name",
        hiringManagerEmail: "hiring_manager_email",
        hiringManagerPhone: "hiring_manager_phone",
        salaryNegotiationNotes: "salary_negotiation_notes",
        interviewNotes: "interview_notes",
        applicationHistory: "application_history",
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
          } else if (key === "notes" || key === "salaryNegotiationNotes" || key === "interviewNotes") {
            // Text fields (unlimited length)
            updates.push(`${column} = $${paramIndex++}`);
            values.push(
              updateData[key] && updateData[key].trim() !== ""
                ? updateData[key].trim()
                : null
            );
          } else if (key === "recruiterName" || key === "recruiterEmail" || key === "recruiterPhone" ||
                     key === "hiringManagerName" || key === "hiringManagerEmail" || key === "hiringManagerPhone") {
            // Contact information fields
            updates.push(`${column} = $${paramIndex++}`);
            values.push(
              updateData[key] && updateData[key].trim() !== ""
                ? updateData[key].trim()
                : null
            );
          } else if (key === "applicationHistory") {
            // JSONB field - store as JSON string
            updates.push(`${column} = $${paramIndex++}`);
            values.push(
              updateData[key] && Array.isArray(updateData[key])
                ? JSON.stringify(updateData[key])
                : '[]'
            );
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
          notes, recruiter_name, recruiter_email, recruiter_phone,
          hiring_manager_name, hiring_manager_email, hiring_manager_phone,
          salary_negotiation_notes, interview_notes, application_history,
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
        notes: row.notes,
        recruiterName: row.recruiter_name,
        recruiterEmail: row.recruiter_email,
        recruiterPhone: row.recruiter_phone,
        hiringManagerName: row.hiring_manager_name,
        hiringManagerEmail: row.hiring_manager_email,
        hiringManagerPhone: row.hiring_manager_phone,
        salaryNegotiationNotes: row.salary_negotiation_notes,
        interviewNotes: row.interview_notes,
        applicationHistory: row.application_history || [],
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

  // Get comprehensive job opportunity statistics
  async getJobOpportunityStatistics(userId) {
    try {
      // Get total jobs by status
      const statusCountsQuery = `
        SELECT 
          status,
          COUNT(*) as count
        FROM job_opportunities
        WHERE user_id = $1
        GROUP BY status
        ORDER BY status
      `;
      const statusCountsResult = await database.query(statusCountsQuery, [userId]);
      
      const statusCounts = {};
      let totalJobs = 0;
      statusCountsResult.rows.forEach((row) => {
        statusCounts[row.status] = parseInt(row.count);
        totalJobs += parseInt(row.count);
      });

      // Calculate application response rate
      // Response rate = (Jobs that received responses) / (Total applications)
      // Applications are jobs with status "Applied" or beyond
      const appliedCount = statusCounts["Applied"] || 0;
      const respondedCount = 
        (statusCounts["Phone Screen"] || 0) +
        (statusCounts["Interview"] || 0) +
        (statusCounts["Offer"] || 0) +
        (statusCounts["Rejected"] || 0);
      
      // Total applications = currently applied + those that received responses
      const totalApplications = appliedCount + respondedCount;
      
      const responseRate = totalApplications > 0 
        ? Math.round((respondedCount / totalApplications) * 100 * 10) / 10
        : 0;

      // Get monthly application volume
      const monthlyVolumeQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as count
        FROM job_opportunities
        WHERE user_id = $1
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
        LIMIT 12
      `;
      const monthlyVolumeResult = await database.query(monthlyVolumeQuery, [userId]);
      
      const monthlyVolume = monthlyVolumeResult.rows.map((row) => ({
        month: row.month.toISOString().split('T')[0],
        count: parseInt(row.count),
      })).reverse(); // Reverse to show oldest first

      // Calculate deadline adherence
      const deadlineQuery = `
        SELECT 
          COUNT(*) as total_with_deadlines,
          COUNT(CASE WHEN application_deadline < CURRENT_DATE THEN 1 END) as overdue,
          COUNT(CASE WHEN application_deadline >= CURRENT_DATE THEN 1 END) as upcoming
        FROM job_opportunities
        WHERE user_id = $1 AND application_deadline IS NOT NULL
      `;
      const deadlineResult = await database.query(deadlineQuery, [userId]);
      const deadlineStats = deadlineResult.rows[0];
      
      const totalWithDeadlines = parseInt(deadlineStats.total_with_deadlines) || 0;
      const overdueCount = parseInt(deadlineStats.overdue) || 0;
      const upcomingCount = parseInt(deadlineStats.upcoming) || 0;
      
      // Check which overdue deadlines had applications submitted before deadline
      const adherenceQuery = `
        SELECT 
          COUNT(*) as met_deadlines
        FROM job_opportunities
        WHERE user_id = $1 
          AND application_deadline IS NOT NULL
          AND application_deadline < CURRENT_DATE
          AND status != 'Interested'
      `;
      const adherenceResult = await database.query(adherenceQuery, [userId]);
      const metDeadlines = parseInt(adherenceResult.rows[0].met_deadlines) || 0;
      
      const deadlineAdherence = totalWithDeadlines > 0
        ? Math.round((metDeadlines / totalWithDeadlines) * 100 * 10) / 10
        : 0;

      // Calculate time-to-offer analytics
      // For jobs with status "Offer", calculate average time from created_at to status change
      // Since we don't track status_updated_at reliably, we'll use a simplified approach
      // based on created_at and assume Offer status means they got an offer
      const offerQuery = `
        SELECT 
          created_at,
          updated_at
        FROM job_opportunities
        WHERE user_id = $1 AND status = 'Offer'
        ORDER BY updated_at DESC
      `;
      const offerResult = await database.query(offerQuery, [userId]);
      
      let totalDaysToOffer = 0;
      let offerCount = offerResult.rows.length;
      
      offerResult.rows.forEach((row) => {
        const created = new Date(row.created_at);
        const updated = new Date(row.updated_at);
        const daysDiff = Math.floor((updated - created) / (1000 * 60 * 60 * 24));
        totalDaysToOffer += daysDiff;
      });
      
      const averageTimeToOffer = offerCount > 0
        ? Math.round((totalDaysToOffer / offerCount) * 10) / 10
        : 0;

      // Calculate average time in each stage (simplified - based on created_at and status)
      // This is an approximation since we don't track stage entry times
      const stageTimeQuery = `
        SELECT 
          status,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_days
        FROM job_opportunities
        WHERE user_id = $1
        GROUP BY status
      `;
      const stageTimeResult = await database.query(stageTimeQuery, [userId]);
      
      const averageTimeInStage = {};
      stageTimeResult.rows.forEach((row) => {
        averageTimeInStage[row.status] = Math.round(parseFloat(row.avg_days) * 10) / 10;
      });

      return {
        totalJobs,
        statusCounts,
        responseRate,
        monthlyVolume,
        deadlineAdherence: {
          percentage: deadlineAdherence,
          totalWithDeadlines,
          metDeadlines,
          overdueCount,
          upcomingCount,
        },
        timeToOffer: {
          averageDays: averageTimeToOffer,
          totalOffers: offerCount,
        },
        averageTimeInStage,
      };
    } catch (error) {
      console.error("❌ Error getting job opportunity statistics:", error);
      throw error;
    }
  }
}

export default new JobOpportunityService();

