import database from "./database.js";
import { v4 as uuidv4 } from "uuid";

class WritingPracticeService {
  // Create a new practice session
  async createSession(userId, sessionData) {
    const {
      sessionType = "interview_response",
      prompt,
      promptId = null,
      timeLimit = null,
    } = sessionData;

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const sessionId = uuidv4();
    const result = await database.query(
      `INSERT INTO writing_practice_sessions (
        id, user_id, session_type, prompt, question_id, word_count, time_spent_seconds,
        session_date, is_completed, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        sessionId,
        userId,
        sessionType,
        prompt,
        promptId || null, // Use promptId if provided, otherwise NULL
        0,
        0,
        new Date(),
        false,
        new Date(),
        new Date(),
      ]
    );

    return this.mapSessionToObject(result.rows[0]);
  }

  // Get session by ID
  async getSessionById(sessionId, userId) {
    const result = await database.query(
      `SELECT * FROM writing_practice_sessions
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapSessionToObject(result.rows[0]);
  }

  // Get all sessions for a user with filters
  async getSessionsByUserId(userId, filters = {}) {
    const {
      sessionType,
      isCompleted,
      limit = 50,
      offset = 0,
      orderBy = "session_date",
      orderDirection = "DESC",
    } = filters;

    let query = `SELECT * FROM writing_practice_sessions WHERE user_id = $1`;
    const params = [userId];
    let paramIndex = 2;

    if (sessionType) {
      query += ` AND session_type = $${paramIndex++}`;
      params.push(sessionType);
    }

    if (isCompleted !== undefined) {
      query += ` AND is_completed = $${paramIndex++}`;
      params.push(isCompleted);
    }

    query += ` ORDER BY ${orderBy} ${orderDirection}`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await database.query(query, params);
    return result.rows.map((row) => this.mapSessionToObject(row));
  }

  // Update session
  async updateSession(sessionId, userId, updates) {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updates.response !== undefined) {
      updateFields.push(`response = $${paramIndex++}`);
      updateValues.push(updates.response);
    }

    if (updates.wordCount !== undefined) {
      updateFields.push(`word_count = $${paramIndex++}`);
      updateValues.push(updates.wordCount);
    }

    if (updates.timeSpentSeconds !== undefined) {
      updateFields.push(`time_spent_seconds = $${paramIndex++}`);
      updateValues.push(updates.timeSpentSeconds);
    }

    if (updates.isCompleted !== undefined) {
      updateFields.push(`is_completed = $${paramIndex++}`);
      updateValues.push(updates.isCompleted);
    }

    if (updateFields.length === 0) {
      return await this.getSessionById(sessionId, userId);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date());

    updateValues.push(sessionId, userId);

    const result = await database.query(
      `UPDATE writing_practice_sessions
       SET ${updateFields.join(", ")}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapSessionToObject(result.rows[0]);
  }

  // Delete session
  async deleteSession(sessionId, userId) {
    const result = await database.query(
      `DELETE FROM writing_practice_sessions
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [sessionId, userId]
    );

    return result.rows.length > 0;
  }

  // Get session statistics
  async getSessionStats(userId, dateRange = {}) {
    const { startDate, endDate } = dateRange;
    let query = `SELECT 
      COUNT(*) as total_sessions,
      COUNT(*) FILTER (WHERE is_completed = true) as completed_sessions,
      AVG(word_count) FILTER (WHERE is_completed = true) as avg_word_count,
      AVG(time_spent_seconds) FILTER (WHERE is_completed = true) as avg_time_spent,
      SUM(time_spent_seconds) FILTER (WHERE is_completed = true) as total_time_spent
    FROM writing_practice_sessions
    WHERE user_id = $1`;
    
    const params = [userId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND session_date >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND session_date <= $${paramIndex++}`;
      params.push(endDate);
    }

    const result = await database.query(query, params);
    return {
      totalSessions: parseInt(result.rows[0].total_sessions) || 0,
      completedSessions: parseInt(result.rows[0].completed_sessions) || 0,
      avgWordCount: parseFloat(result.rows[0].avg_word_count) || 0,
      avgTimeSpent: parseFloat(result.rows[0].avg_time_spent) || 0,
      totalTimeSpent: parseInt(result.rows[0].total_time_spent) || 0,
    };
  }

  // Map database row to object
  mapSessionToObject(row) {
    return {
      id: row.id,
      userId: row.user_id,
      sessionType: row.session_type,
      prompt: row.prompt,
      response: row.response,
      wordCount: row.word_count,
      timeSpentSeconds: row.time_spent_seconds,
      sessionDate: row.session_date,
      isCompleted: row.is_completed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new WritingPracticeService();

