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
      const { questionText, questionType, responseText, tags = [], editNotes } = responseData;

      this.validateQuestionType(questionType);

      if (!questionText || !responseText) {
        throw new Error("Question text and response text are required");
      }

      const responseId = uuidv4();
      const versionId = uuidv4();

      // Use transaction to ensure data consistency
      return await database.transaction(async (client) => {
        // Create the response entry
        const responseQuery = `
          INSERT INTO interview_responses (id, user_id, question_text, question_type, current_version_id)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, question_text, question_type, current_version_id, created_at, updated_at
        `;

        const responseResult = await client.query(responseQuery, [
          responseId,
          userId,
          questionText,
          questionType,
          versionId,
        ]);

        // Create the first version
        const versionQuery = `
          INSERT INTO interview_response_versions (id, response_id, version_number, response_text, created_by, edit_notes)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, version_number, response_text, created_at, edit_notes
        `;

        await client.query(versionQuery, [
          versionId,
          responseId,
          1,
          responseText,
          userId,
          editNotes || null,
        ]);

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
      throw error;
    }
  }

  // Get all responses for a user with filters
  async getResponses(userId, filters = {}) {
    try {
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
      return result.rows.length > 0 ? result.rows[0] : null;
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
      return result.rows;
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
      return result.rows;
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
      return result.rows;
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
          (outcome) => outcome.created_at >= version.created_at
        );

        versionOutcomes.forEach((outcome) => {
          if (outcome.outcome_type === "offer") score += 10;
          else if (outcome.outcome_type === "next_round") score += 5;
          else if (outcome.outcome_type === "rejected") score -= 2;
        });

        // Tag matching with job requirements
        if (jobRequirements && jobRequirements.skills) {
          const matchingTags = response.tags.filter(
            (tag) =>
              tag.tag_type === "skill" &&
              jobRequirements.skills.some((skill) =>
                tag.tag_value.toLowerCase().includes(skill.toLowerCase())
              )
          );
          score += matchingTags.length * 3;
        }

        // Recency bonus
        const daysSinceCreation =
          (Date.now() - new Date(version.created_at).getTime()) / (1000 * 60 * 60 * 24);
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

