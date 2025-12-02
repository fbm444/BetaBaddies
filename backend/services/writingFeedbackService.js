import database from "./database.js";
import writingAIService from "./writingAIService.js";
import writingPracticeService from "./writingPracticeService.js";
import { v4 as uuidv4 } from "uuid";

class WritingFeedbackService {
  // Generate feedback for a session
  async generateFeedback(sessionId, userId, options = {}) {
    const { forceRegenerate = false } = options;

    // Check for existing feedback
    if (!forceRegenerate) {
      const existing = await this.getFeedbackBySession(sessionId, userId);
      if (existing) {
        console.log(`✅ Returning cached feedback for session ${sessionId}`);
        return existing;
      }
    }

    // Get session
    const session = await writingPracticeService.getSessionById(sessionId, userId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (!session.response || session.response.trim().length === 0) {
      throw new Error("Session has no response to analyze");
    }

    // Generate feedback using AI service
    const feedback = await writingAIService.generateFeedback(
      session.response,
      session.prompt,
      userId
    );

    // Save feedback to database
    const feedbackId = uuidv4();
    await database.query(
      `INSERT INTO writing_feedback (
        id, session_id, user_id,
        clarity_score, professionalism_score, structure_score, storytelling_score, overall_score,
        clarity_feedback, professionalism_feedback, structure_feedback, storytelling_feedback,
        strengths, improvements, tips, generated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        feedbackId,
        sessionId,
        userId,
        feedback.clarityScore,
        feedback.professionalismScore,
        feedback.structureScore,
        feedback.storytellingScore,
        feedback.overallScore,
        feedback.clarityFeedback,
        feedback.professionalismFeedback,
        feedback.structureFeedback,
        feedback.storytellingFeedback,
        JSON.stringify(feedback.strengths),
        JSON.stringify(feedback.improvements),
        JSON.stringify(feedback.tips),
        feedback.generatedBy,
      ]
    );

    return await this.getFeedbackById(feedbackId, userId);
  }

  // Get feedback by session ID
  async getFeedbackBySession(sessionId, userId) {
    const result = await database.query(
      `SELECT * FROM writing_feedback
       WHERE session_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapFeedbackToObject(result.rows[0]);
  }

  // Get feedback by ID
  async getFeedbackById(feedbackId, userId) {
    const result = await database.query(
      `SELECT * FROM writing_feedback
       WHERE id = $1 AND user_id = $2`,
      [feedbackId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapFeedbackToObject(result.rows[0]);
  }

  // Compare two sessions
  async compareSessions(sessionId1, sessionId2, userId) {
    const [session1, session2] = await Promise.all([
      writingPracticeService.getSessionById(sessionId1, userId),
      writingPracticeService.getSessionById(sessionId2, userId),
    ]);

    if (!session1 || !session2) {
      throw new Error("One or both sessions not found");
    }

    const [feedback1, feedback2] = await Promise.all([
      this.getFeedbackBySession(sessionId1, userId),
      this.getFeedbackBySession(sessionId2, userId),
    ]);

    if (!feedback1 || !feedback2) {
      throw new Error("One or both sessions do not have feedback");
    }

    const comparison = await writingAIService.compareResponses(
      session1.response,
      session2.response,
      feedback1,
      feedback2
    );

    return {
      session1: {
        id: session1.id,
        prompt: session1.prompt,
        response: session1.response,
        feedback: feedback1,
      },
      session2: {
        id: session2.id,
        prompt: session2.prompt,
        response: session2.response,
        feedback: feedback2,
      },
      comparison,
    };
  }

  // Get feedback history
  async getFeedbackHistory(userId, limit = 10) {
    const result = await database.query(
      `SELECT f.*, s.prompt, s.session_type
       FROM writing_feedback f
       JOIN writing_practice_sessions s ON f.session_id = s.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row) => ({
      ...this.mapFeedbackToObject(row),
      prompt: row.prompt,
      sessionType: row.session_type,
    }));
  }

  // Map database row to object
  mapFeedbackToObject(row) {
    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      clarityScore: row.clarity_score,
      professionalismScore: row.professionalism_score,
      structureScore: row.structure_score,
      storytellingScore: row.storytelling_score,
      overallScore: row.overall_score,
      clarityFeedback: row.clarity_feedback,
      professionalismFeedback: row.professionalism_feedback,
      structureFeedback: row.structure_feedback,
      storytellingFeedback: row.storytelling_feedback,
      strengths: row.strengths || [],
      improvements: row.improvements || [],
      tips: row.tips || [],
      generatedBy: row.generated_by,
      createdAt: row.created_at,
    };
  }
}

export default new WritingFeedbackService();

