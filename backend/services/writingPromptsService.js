import database from "./database.js";

class WritingPromptsService {
  // Get prompts by category and difficulty
  async getPromptsByCategory(category = null, difficulty = null, isActive = true) {
    let query = `SELECT * FROM writing_practice_prompts WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (difficulty) {
      query += ` AND difficulty_level = $${paramIndex++}`;
      params.push(difficulty);
    }

    if (isActive !== null) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(isActive);
    }

    query += ` ORDER BY category, difficulty_level, created_at`;

    const result = await database.query(query, params);
    return result.rows.map((row) => this.mapPromptToObject(row));
  }

  // Get random prompt
  async getRandomPrompt(category = null, difficulty = null) {
    let query = `SELECT * FROM writing_practice_prompts WHERE is_active = true`;
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (difficulty) {
      query += ` AND difficulty_level = $${paramIndex++}`;
      params.push(difficulty);
    }

    query += ` ORDER BY RANDOM() LIMIT 1`;

    const result = await database.query(query, params);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapPromptToObject(result.rows[0]);
  }

  // Get prompt by ID
  async getPromptById(promptId) {
    const result = await database.query(
      `SELECT * FROM writing_practice_prompts WHERE id = $1`,
      [promptId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapPromptToObject(result.rows[0]);
  }

  // Create custom prompt
  async createCustomPrompt(userId, promptData) {
    const {
      category = "custom",
      promptText,
      difficultyLevel = "intermediate",
      estimatedTimeMinutes = 5,
      tags = [],
    } = promptData;

    if (!promptText) {
      throw new Error("Prompt text is required");
    }

    const result = await database.query(
      `INSERT INTO writing_practice_prompts (
        category, prompt_text, difficulty_level, estimated_time_minutes, tags, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        category,
        promptText,
        difficultyLevel,
        estimatedTimeMinutes,
        JSON.stringify(tags),
        true,
      ]
    );

    return this.mapPromptToObject(result.rows[0]);
  }

  // Get prompts for specific interview (based on job opportunity)
  async getPromptsForInterview(jobOpportunityId) {
    // For now, return a mix of relevant prompts
    // In the future, this could be AI-selected based on job description
    const result = await database.query(
      `SELECT * FROM writing_practice_prompts
       WHERE is_active = true
       AND category IN ('behavioral', 'company_fit', 'strengths', 'situational')
       ORDER BY RANDOM()
       LIMIT 10`
    );

    return result.rows.map((row) => this.mapPromptToObject(row));
  }

  // Map database row to object
  mapPromptToObject(row) {
    return {
      id: row.id,
      category: row.category,
      promptText: row.prompt_text,
      difficultyLevel: row.difficulty_level,
      estimatedTimeMinutes: row.estimated_time_minutes,
      tags: row.tags || [],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new WritingPromptsService();

