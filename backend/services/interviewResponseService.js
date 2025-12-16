import { v4 as uuidv4 } from "uuid";
import database from "./database.js";

class InterviewResponseService {
  constructor() {
    this.validQuestionTypes = ["behavioral", "technical", "situational"];
    this.validTagTypes = ["skill", "experience", "company", "technology", "industry"];
    this.validOutcomeTypes = ["offer", "next_round", "rejected", "no_decision"];
  }

  // Validate question type
  validateQuestionType(type) {
    if (!this.validQuestionTypes.includes(type)) {
      throw new Error(
        `Invalid question type. Must be one of: ${this.validQuestionTypes.join(", ")}`
      );
    }
  }

  // Validate tag type
  validateTagType(type) {
    if (!this.validTagTypes.includes(type)) {
      throw new Error(
        `Invalid tag type. Must be one of: ${this.validTagTypes.join(", ")}`
      );
    }
  }

  // Create a new interview response
  async createResponse(userId, responseData) {
    try {
      // Check if table exists
      const tableCheck = await database.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'interview_responses'
        );
      `);
      
      if (!tableCheck.rows[0]?.exists) {
        throw new Error("Database tables not found. Please run the migration to create interview_responses tables.");
      }

      // Verify user exists
      if (!userId) {
        throw new Error("User ID is required");
      }

      const userCheck = await database.query(
        `SELECT u_id FROM users WHERE u_id = $1`,
        [userId]
      );

      if (userCheck.rows.length === 0) {
        const error = new Error(`User with ID ${userId} does not exist in the users table`);
        error.code = "USER_NOT_FOUND";
        throw error;
      }

      const { questionText, questionType, responseText, tags = [], editNotes } = responseData;

      this.validateQuestionType(questionType);

      if (!questionText || !responseText) {
        throw new Error("Question text and response text are required");
      }

      const responseId = uuidv4();
      const versionId = uuidv4();

      // Use transaction to ensure data consistency
      return await database.transaction(async (client) => {
        try {
          // Create the response entry (set current_version_id to NULL initially)
          // The trigger will set it after the version is created
          const responseQuery = `
            INSERT INTO interview_responses (id, user_id, question_text, question_type, current_version_id)
            VALUES ($1, $2, $3, $4, NULL)
            RETURNING id, question_text, question_type, current_version_id, created_at, updated_at
          `;

          console.log("Creating interview response with:", { responseId, userId, questionText, questionType });

          const responseResult = await client.query(responseQuery, [
            responseId,
            userId,
            questionText,
            questionType,
          ]);

          console.log("Response created successfully:", responseResult.rows[0]?.id);

          // Create the first version
          // The trigger will automatically set current_version_id after this insert
          const versionQuery = `
            INSERT INTO interview_response_versions (id, response_id, version_number, response_text, created_by, edit_notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, version_number, response_text, created_at, edit_notes
          `;

          console.log("Creating version with:", { versionId, responseId, userId });

          await client.query(versionQuery, [
            versionId,
            responseId,
            1,
            responseText,
            userId,
            editNotes || null,
          ]);

          console.log("Version created successfully");
        } catch (transactionError) {
          console.error("Transaction error details:", {
            code: transactionError.code,
            constraint: transactionError.constraint,
            detail: transactionError.detail,
            message: transactionError.message,
            table: transactionError.table,
            schema: transactionError.schema,
            column: transactionError.column,
          });
          throw transactionError;
        }

        // Add tags if provided
        if (tags.length > 0) {
          for (const tag of tags) {
            this.validateTagType(tag.tagType);
            const tagId = uuidv4();
            await client.query(
              `INSERT INTO interview_response_tags (id, response_id, tag_type, tag_value)
               VALUES ($1, $2, $3, $4)`,
              [tagId, responseId, tag.tagType, tag.tagValue]
            );
          }
        }

        // Fetch the complete response with version and tags
        return await this.getResponseById(userId, responseId, client);
      });
    } catch (error) {
      console.error("Error creating interview response:", error);
      console.error("Error details:", {
        code: error.code,
        constraint: error.constraint,
        detail: error.detail,
        message: error.message,
        table: error.table,
        schema: error.schema
      });
      
      // Provide more helpful error messages
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        throw new Error("Database tables not found. Please run the migration: db/migrations/add_interview_response_library.sql");
      }
      
      if (error.code === "23503" || (error.constraint && error.constraint.includes("fkey"))) {
        const constraintName = error.constraint || "unknown constraint";
        const detail = error.detail || error.message || "Referenced table or column does not exist";
        const errorMessage = `Foreign key constraint violation${constraintName !== "unknown constraint" ? ` (${constraintName})` : ""}: ${detail}. Please ensure all referenced tables exist and the user ID is valid.`;
        const enhancedError = new Error(errorMessage);
        enhancedError.code = error.code;
        enhancedError.constraint = error.constraint;
        enhancedError.detail = error.detail;
        throw enhancedError;
      }
      
      throw error;
    }
  }

  // Get all responses for a user with filters
  async getResponses(userId, filters = {}) {
    try {
      // Check if table exists, return empty array if not
      const tableCheck = await database.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'interview_responses'
        );
      `);
      
      if (!tableCheck.rows[0]?.exists) {
        console.warn("interview_responses table does not exist. Please run the migration.");
        return [];
      }

      const { questionType, tagValue, searchTerm } = filters;
      let query = `
        SELECT DISTINCT
          r.id,
          r.question_text,
          r.question_type,
          r.current_version_id,
          r.created_at,
          r.updated_at,
          v.response_text as current_response_text,
          v.version_number as current_version_number,
          v.created_at as current_version_created_at
        FROM interview_responses r
        LEFT JOIN interview_response_versions v ON r.current_version_id = v.id
        WHERE r.user_id = $1
      `;

      const params = [userId];
      let paramIndex = 2;

      if (questionType) {
        query += ` AND r.question_type = $${paramIndex}`;
        params.push(questionType);
        paramIndex++;
      }

      if (searchTerm) {
        query += ` AND (r.question_text ILIKE $${paramIndex} OR v.response_text ILIKE $${paramIndex})`;
        params.push(`%${searchTerm}%`);
        paramIndex++;
      }

      if (tagValue) {
        query += `
          AND r.id IN (
            SELECT response_id FROM interview_response_tags
            WHERE tag_value ILIKE $${paramIndex}
          )
        `;
        params.push(`%${tagValue}%`);
        paramIndex++;
      }

      query += ` ORDER BY r.updated_at DESC`;

      const result = await database.query(query, params);

      // Fetch tags and outcomes for each response
      const responses = await Promise.all(
        result.rows.map(async (row) => {
          const tags = await this.getResponseTags(row.id);
          const outcomes = await this.getResponseOutcomes(row.id);
          const versionCount = await this.getVersionCount(row.id);

          return {
            id: row.id,
            questionText: row.question_text,
            questionType: row.question_type,
            currentVersion: {
              id: row.current_version_id,
              versionNumber: row.current_version_number || null,
              responseText: row.current_response_text || '',
              createdAt: row.current_version_created_at || row.created_at,
            },
            tags,
            outcomes,
            versionCount,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        })
      );

      return responses;
    } catch (error) {
      console.error("Error fetching interview responses:", error);
      // If table doesn't exist or other database error, return empty array
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        console.warn("interview_responses table does not exist. Please run the migration.");
        return [];
      }
      throw error;
    }
  }

  // Get a single response by ID
  async getResponseById(userId, responseId, client = null) {
    try {
      const db = client || database;
      const query = `
        SELECT
          r.id,
          r.question_text,
          r.question_type,
          r.current_version_id,
          r.created_at,
          r.updated_at
        FROM interview_responses r
        WHERE r.id = $1 AND r.user_id = $2
      `;

      const result = await db.query(query, [responseId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // Get current version
      const currentVersion = await this.getCurrentVersion(responseId, db);

      // Get all versions
      const versions = await this.getResponseVersions(responseId, db);

      // Get tags
      const tags = await this.getResponseTags(responseId, db);

      // Get outcomes
      const outcomes = await this.getResponseOutcomes(responseId, db);

      return {
        id: row.id,
        questionText: row.question_text,
        questionType: row.question_type,
        currentVersion,
        versions,
        tags,
        outcomes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error("Error fetching interview response:", error);
      throw error;
    }
  }

  // Get current version of a response
  async getCurrentVersion(responseId, client = null) {
    try {
      const db = client || database;
      const query = `
        SELECT id, version_number, response_text, created_at, edit_notes
        FROM interview_response_versions
        WHERE response_id = $1
        ORDER BY version_number DESC
        LIMIT 1
      `;

      const result = await db.query(query, [responseId]);
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        versionNumber: row.version_number,
        responseText: row.response_text,
        createdAt: row.created_at,
        editNotes: row.edit_notes,
      };
    } catch (error) {
      console.error("Error fetching current version:", error);
      throw error;
    }
  }

  // Get all versions of a response
  async getResponseVersions(responseId, client = null) {
    try {
      const db = client || database;
      const query = `
        SELECT id, version_number, response_text, created_at, edit_notes
        FROM interview_response_versions
        WHERE response_id = $1
        ORDER BY version_number DESC
      `;

      const result = await db.query(query, [responseId]);
      return result.rows.map((row) => ({
        id: row.id,
        versionNumber: row.version_number,
        responseText: row.response_text,
        createdAt: row.created_at,
        editNotes: row.edit_notes,
      }));
    } catch (error) {
      console.error("Error fetching response versions:", error);
      throw error;
    }
  }

  // Get tags for a response
  async getResponseTags(responseId, client = null) {
    try {
      const db = client || database;
      const query = `
        SELECT id, tag_type, tag_value, created_at
        FROM interview_response_tags
        WHERE response_id = $1
        ORDER BY tag_type, tag_value
      `;

      const result = await db.query(query, [responseId]);
      return result.rows.map((row) => ({
        id: row.id,
        tagType: row.tag_type,
        tagValue: row.tag_value,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error("Error fetching response tags:", error);
      throw error;
    }
  }

  // Get outcomes for a response
  async getResponseOutcomes(responseId, client = null) {
    try {
      const db = client || database;
      const query = `
        SELECT id, interview_id, outcome_type, company, job_title, notes, created_at
        FROM interview_response_outcomes
        WHERE response_id = $1
        ORDER BY created_at DESC
      `;

      const result = await db.query(query, [responseId]);
      return result.rows.map((row) => ({
        id: row.id,
        interviewId: row.interview_id,
        outcomeType: row.outcome_type,
        company: row.company,
        jobTitle: row.job_title,
        notes: row.notes,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error("Error fetching response outcomes:", error);
      throw error;
    }
  }

  // Get version count
  async getVersionCount(responseId, client = null) {
    try {
      const db = client || database;
      const query = `
        SELECT COUNT(*) as count
        FROM interview_response_versions
        WHERE response_id = $1
      `;

      const result = await db.query(query, [responseId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error("Error fetching version count:", error);
      throw error;
    }
  }

  // Create a new version of a response
  async createVersion(userId, responseId, versionData) {
    try {
      const { responseText, editNotes } = versionData;

      if (!responseText) {
        throw new Error("Response text is required");
      }

      // Verify response belongs to user
      const response = await this.getResponseById(userId, responseId);
      if (!response) {
        throw new Error("Response not found");
      }

      // Get next version number
      const versionCount = await this.getVersionCount(responseId);
      const nextVersionNumber = versionCount + 1;

      const versionId = uuidv4();

      return await database.transaction(async (client) => {
        // Create new version
        const versionQuery = `
          INSERT INTO interview_response_versions (id, response_id, version_number, response_text, created_by, edit_notes)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, version_number, response_text, created_at, edit_notes
        `;

        const versionResult = await client.query(versionQuery, [
          versionId,
          responseId,
          nextVersionNumber,
          responseText,
          userId,
          editNotes || null,
        ]);

        // Update current_version_id
        await client.query(
          `UPDATE interview_responses SET current_version_id = $1 WHERE id = $2`,
          [versionId, responseId]
        );

        return versionResult.rows[0];
      });
    } catch (error) {
      console.error("Error creating response version:", error);
      throw error;
    }
  }

  // Update response metadata (question text, question type)
  async updateResponse(userId, responseId, updateData) {
    try {
      const { questionText, questionType } = updateData;

      // Verify response belongs to user
      const response = await this.getResponseById(userId, responseId);
      if (!response) {
        throw new Error("Response not found");
      }

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (questionText !== undefined) {
        updates.push(`question_text = $${paramIndex}`);
        params.push(questionText);
        paramIndex++;
      }

      if (questionType !== undefined) {
        this.validateQuestionType(questionType);
        updates.push(`question_type = $${paramIndex}`);
        params.push(questionType);
        paramIndex++;
      }

      if (updates.length === 0) {
        throw new Error("No valid fields to update");
      }

      params.push(responseId, userId);

      const query = `
        UPDATE interview_responses
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING id, question_text, question_type, updated_at
      `;

      const result = await database.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error("Error updating response:", error);
      throw error;
    }
  }

  // Add tag to response
  async addTag(userId, responseId, tagData) {
    try {
      const { tagType, tagValue } = tagData;

      this.validateTagType(tagType);

      if (!tagValue) {
        throw new Error("Tag value is required");
      }

      // Verify response belongs to user
      const response = await this.getResponseById(userId, responseId);
      if (!response) {
        throw new Error("Response not found");
      }

      const tagId = uuidv4();

      const query = `
        INSERT INTO interview_response_tags (id, response_id, tag_type, tag_value)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (response_id, tag_type, tag_value) DO NOTHING
        RETURNING id, tag_type, tag_value, created_at
      `;

      const result = await database.query(query, [tagId, responseId, tagType, tagValue]);

      if (result.rows.length === 0) {
        throw new Error("Tag already exists");
      }

      return result.rows[0];
    } catch (error) {
      console.error("Error adding tag:", error);
      throw error;
    }
  }

  // Remove tag from response
  async removeTag(userId, responseId, tagId) {
    try {
      // Verify response belongs to user
      const response = await this.getResponseById(userId, responseId);
      if (!response) {
        throw new Error("Response not found");
      }

      const query = `
        DELETE FROM interview_response_tags
        WHERE id = $1 AND response_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [tagId, responseId]);

      if (result.rows.length === 0) {
        throw new Error("Tag not found");
      }

      return { success: true };
    } catch (error) {
      console.error("Error removing tag:", error);
      throw error;
    }
  }

  // Add outcome to response
  async addOutcome(userId, responseId, outcomeData) {
    try {
      const { interviewId, outcomeType, company, jobTitle, notes } = outcomeData;

      if (!this.validOutcomeTypes.includes(outcomeType)) {
        throw new Error(
          `Invalid outcome type. Must be one of: ${this.validOutcomeTypes.join(", ")}`
        );
      }

      // Verify response belongs to user
      const response = await this.getResponseById(userId, responseId);
      if (!response) {
        throw new Error("Response not found");
      }

      const outcomeId = uuidv4();

      const query = `
        INSERT INTO interview_response_outcomes (id, response_id, interview_id, outcome_type, company, job_title, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, interview_id, outcome_type, company, job_title, notes, created_at
      `;

      const result = await database.query(query, [
        outcomeId,
        responseId,
        interviewId || null,
        outcomeType,
        company || null,
        jobTitle || null,
        notes || null,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("Error adding outcome:", error);
      throw error;
    }
  }

  // Delete response
  async deleteResponse(userId, responseId) {
    try {
      // Verify response belongs to user
      const response = await this.getResponseById(userId, responseId);
      if (!response) {
        throw new Error("Response not found");
      }

      const query = `DELETE FROM interview_responses WHERE id = $1 AND user_id = $2 RETURNING id`;

      const result = await database.query(query, [responseId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Response not found");
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting response:", error);
      throw error;
    }
  }

  // Get gap analysis - identify missing question types
  async getGapAnalysis(userId) {
    try {
      // Check if table exists
      const tableCheck = await database.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'interview_responses'
        );
      `);
      
      if (!tableCheck.rows[0]?.exists) {
        console.warn("interview_responses table does not exist. Please run the migration.");
        return {
          existing: [],
          missing: this.validQuestionTypes.map((type) => ({
            questionType: type,
            count: 0,
          })),
          totalResponses: 0,
        };
      }

      const query = `
        SELECT question_type, COUNT(*) as count
        FROM interview_responses
        WHERE user_id = $1
        GROUP BY question_type
      `;

      const result = await database.query(query, [userId]);

      const existingTypes = result.rows.map((row) => row.question_type);
      const allTypes = this.validQuestionTypes;
      const missingTypes = allTypes.filter((type) => !existingTypes.includes(type));

      return {
        existing: result.rows,
        missing: missingTypes.map((type) => ({
          questionType: type,
          count: 0,
        })),
        totalResponses: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      };
    } catch (error) {
      console.error("Error getting gap analysis:", error);
      // If table doesn't exist, return empty gap analysis
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        return {
          existing: [],
          missing: this.validQuestionTypes.map((type) => ({
            questionType: type,
            count: 0,
          })),
          totalResponses: 0,
        };
      }
      throw error;
    }
  }

  // Suggest best response based on job requirements
  async suggestBestResponse(userId, responseId, jobRequirements) {
    try {
      // Verify response belongs to user
      const response = await this.getResponseById(userId, responseId);
      if (!response) {
        throw new Error("Response not found");
      }

      // Get all versions with their outcomes
      const versions = await this.getResponseVersions(responseId);
      const outcomes = await this.getResponseOutcomes(responseId);

      // Simple scoring algorithm based on:
      // 1. Outcomes (offer > next_round > rejected)
      // 2. Tag matching with job requirements
      // 3. Recency

      const versionScores = versions.map((version) => {
        let score = 0;

        // Check outcomes for this version (simplified - using all outcomes)
        const versionOutcomes = outcomes.filter(
          (outcome) => outcome.createdAt >= version.createdAt
        );

        versionOutcomes.forEach((outcome) => {
          if (outcome.outcomeType === "offer") score += 10;
          else if (outcome.outcomeType === "next_round") score += 5;
          else if (outcome.outcomeType === "rejected") score -= 2;
        });

        // Tag matching with job requirements
        if (jobRequirements && jobRequirements.skills) {
          const matchingTags = response.tags.filter(
            (tag) =>
              tag.tagType === "skill" &&
              jobRequirements.skills.some((skill) =>
                tag.tagValue.toLowerCase().includes(skill.toLowerCase())
              )
          );
          score += matchingTags.length * 3;
        }

        // Recency bonus
        const daysSinceCreation =
          (Date.now() - new Date(version.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 5 - daysSinceCreation / 30); // Bonus decreases over time

        return { version, score };
      });

      // Sort by score descending
      versionScores.sort((a, b) => b.score - a.score);

      const bestVersion = versionScores[0]?.version;

      // Store suggestion
      if (bestVersion) {
        const suggestionId = uuidv4();
        await database.query(
          `INSERT INTO interview_response_suggestions 
           (id, response_id, job_requirements, suggested_version_id, confidence_score, reasoning)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            suggestionId,
            responseId,
            JSON.stringify(jobRequirements),
            bestVersion.id,
            Math.min(100, Math.max(0, versionScores[0].score)),
            `Best version based on outcomes, tag matching, and recency. Score: ${versionScores[0].score.toFixed(2)}`,
          ]
        );
      }

      return {
        suggestedVersion: bestVersion,
        confidenceScore: bestVersion ? versionScores[0].score : 0,
        reasoning: bestVersion
          ? `Version ${bestVersion.version_number} has the highest score based on outcomes, tag matching, and recency.`
          : "No suitable version found.",
      };
    } catch (error) {
      console.error("Error suggesting best response:", error);
      throw error;
    }
  }

  // Export response library as interview prep guide
  async exportPrepGuide(userId, format = "json") {
    try {
      const responses = await this.getResponses(userId);

      if (format === "json") {
        return JSON.stringify(responses, null, 2);
      } else if (format === "markdown") {
        let markdown = "# Interview Response Library\n\n";
        markdown += `Generated on ${new Date().toLocaleDateString()}\n\n`;

        // Group by question type
        const grouped = responses.reduce((acc, response) => {
          if (!acc[response.questionType]) {
            acc[response.questionType] = [];
          }
          acc[response.questionType].push(response);
          return acc;
        }, {});

        Object.keys(grouped).forEach((type) => {
          markdown += `## ${type.charAt(0).toUpperCase() + type.slice(1)} Questions\n\n`;
          grouped[type].forEach((response) => {
            markdown += `### ${response.questionText}\n\n`;
            markdown += `**Response:**\n${response.currentVersion.responseText}\n\n`;
            if (response.tags.length > 0) {
              markdown += `**Tags:** ${response.tags.map((t) => t.tag_value).join(", ")}\n\n`;
            }
            if (response.outcomes.length > 0) {
              markdown += `**Outcomes:** ${response.outcomes.map((o) => o.outcome_type).join(", ")}\n\n`;
            }
            markdown += "---\n\n";
          });
        });

        return markdown;
      }

      throw new Error(`Unsupported export format: ${format}`);
    } catch (error) {
      console.error("Error exporting prep guide:", error);
      throw error;
    }
  }
}

export default new InterviewResponseService();

