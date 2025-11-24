import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import OpenAI from "openai";

/**
 * Service for AI-powered response coaching (UC-076)
 * Uses interview_response_coaching and question_practice_sessions tables
 */
class InterviewResponseCoachingService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL;
    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
        ...(this.openaiApiUrl && { baseURL: this.openaiApiUrl }),
      });
    }
  }

  /**
   * Submit a practice response and get AI coaching feedback
   */
  async submitResponse(userId, questionId, responseText, options = {}) {
    try {
    const { interviewId, practiceSessionId } = options;

      // Get question details
      const questionQuery = `
        SELECT id, question_text, category, star_framework_guidance
        FROM interview_question_banks
        WHERE id = $1
      `;
      const questionResult = await database.query(questionQuery, [questionId]);

      if (questionResult.rows.length === 0) {
        throw new Error("Question not found");
      }

      const question = questionResult.rows[0];

      // Create practice session if not provided
      let sessionId = practiceSessionId;
      if (!sessionId) {
        const sessionQuery = `
          INSERT INTO question_practice_sessions 
          (id, user_id, question_id, job_id, written_response, practiced_at)
          VALUES ($1, $2, $3, $4, $5, now())
          RETURNING id
        `;
        const jobId = options.jobId || null;
        sessionId = uuidv4();
        await database.query(sessionQuery, [
          sessionId,
          userId,
          questionId,
          jobId,
          responseText,
        ]);
      } else {
        // Update existing session
        await database.query(
          `
          UPDATE question_practice_sessions
          SET written_response = $1, practiced_at = now()
          WHERE id = $2 AND user_id = $3
          `,
          [responseText, sessionId, userId]
        );
      }

      // Analyze response with AI
      const feedback = await this.analyzeResponseWithAI(
        question.question_text,
        responseText,
        question.category,
        question.star_framework_guidance
      );

      // Save coaching feedback
      const coachingId = uuidv4();
      await database.query(
        `
        INSERT INTO interview_response_coaching
        (id, user_id, question_id, practice_session_id, original_response,
         ai_feedback, content_score, structure_score, clarity_score,
         relevance_score, specificity_score, impact_score, response_length,
         recommended_length, weak_language_patterns, suggested_alternatives,
         star_method_adherence, alternative_approaches, improvement_tracking)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `,
        [
          coachingId,
          userId,
          questionId,
          sessionId,
          responseText,
          JSON.stringify(feedback.aiFeedback),
          feedback.scores.content,
          feedback.scores.structure,
          feedback.scores.clarity,
          feedback.scores.relevance,
          feedback.scores.specificity,
          feedback.scores.impact,
          responseText.length,
          feedback.recommendedLength,
          JSON.stringify(feedback.weakLanguagePatterns || []),
          JSON.stringify(feedback.suggestedAlternatives || []),
          feedback.starScore,
          JSON.stringify(feedback.alternativeApproaches || []),
          JSON.stringify([]),
        ]
      );

      return {
        id: coachingId,
        practiceSessionId: sessionId,
        feedback,
      };
    } catch (error) {
      console.error(
        "[InterviewResponseCoachingService] Error submitting response:",
        error
      );
      throw error;
    }
  }

  /**
   * Analyze response using OpenAI
   */
  async analyzeResponseWithAI(questionText, responseText, category, starGuidance) {
    if (!this.openai) {
      return this.getFallbackFeedback(responseText, category);
    }

    try {
      const prompt = `You are an expert interview coach. Analyze this interview response and provide detailed feedback.

Question: ${questionText}
Question Category: ${category}
${starGuidance ? `STAR Framework Guidance: ${starGuidance}` : ""}

Response to Analyze:
${responseText}

Provide comprehensive feedback in JSON format:
{
  "aiFeedback": {
    "content": "Overall content quality feedback",
    "structure": "Structure and organization feedback",
    "clarity": "Clarity and communication feedback",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"]
  },
  "scores": {
    "content": <0-100>,
    "structure": <0-100>,
    "clarity": <0-100>,
    "relevance": <0-100>,
    "specificity": <0-100>,
    "impact": <0-100>
  },
  "starScore": <0-100>,
  "recommendedLength": <optimal word count>,
  "weakLanguagePatterns": ["pattern1", "pattern2"],
  "suggestedAlternatives": ["alternative1", "alternative2"],
  "alternativeApproaches": ["approach1", "approach2"],
  "improvementSuggestions": ["suggestion1", "suggestion2"]
}

Focus on:
- STAR method adherence (for behavioral questions)
- Specificity and quantifiable results
- Clear structure and flow
- Professional language
- Appropriate length (2-3 minutes when spoken)`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content:
              "You are a professional interview coach providing constructive, specific feedback.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Could not parse JSON from OpenAI response");
    } catch (error) {
      console.warn(
        "[InterviewResponseCoachingService] AI analysis failed, using fallback:",
        error.message
      );
      return this.getFallbackFeedback(responseText, category);
    }
  }

  /**
   * Get fallback feedback if AI is unavailable
   */
  getFallbackFeedback(responseText, category) {
    const wordCount = responseText.split(/\s+/).length;
    const avgScore = 70;

    return {
      aiFeedback: {
        content: "Response provides relevant information. Consider adding more specific examples.",
        structure: "Response is well-organized. Ensure clear beginning, middle, and end.",
        clarity: "Response is clear. Consider using more action verbs.",
        strengths: ["Relevant to the question", "Professional tone"],
        weaknesses: ["Could use more specific examples", "Consider quantifying achievements"],
      },
      scores: {
        content: avgScore,
        structure: avgScore + 5,
        clarity: avgScore,
        relevance: avgScore + 10,
        specificity: avgScore - 10,
        impact: avgScore,
      },
      starScore: category === "behavioral" ? avgScore : null,
      recommendedLength: 200,
      weakLanguagePatterns: ["I think", "maybe", "kind of"],
      suggestedAlternatives: ["I believe", "definitely", "specifically"],
      alternativeApproaches: [
        "Start with a brief context, then focus on your actions and results",
        "Use the STAR method: Situation, Task, Action, Result",
      ],
      improvementSuggestions: [
        "Add quantifiable results to strengthen your response",
        "Use stronger action verbs",
        "Ensure your response directly answers the question",
      ],
    };
  }

  /**
   * Get feedback for a specific response
   */
  async getResponseFeedback(coachingId, userId) {
    try {
      const query = `
        SELECT ir.*, iqb.question_text, iqb.category
        FROM interview_response_coaching ir
        JOIN interview_question_banks iqb ON ir.question_id = iqb.id
        WHERE ir.id = $1 AND ir.user_id = $2
      `;
      const result = await database.query(query, [coachingId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Response feedback not found");
      }

      return this.mapCoachingRow(result.rows[0]);
    } catch (error) {
      console.error(
        "[InterviewResponseCoachingService] Error getting feedback:",
        error
      );
      throw error;
    }
  }

  /**
   * Get response history for a user/interview
   */
  async getResponseHistory(userId, options = {}) {
    try {
      const { interviewId, questionId } = options;

      let query = `
        SELECT ir.*, iqb.question_text, iqb.category
        FROM interview_response_coaching ir
        JOIN interview_question_banks iqb ON ir.question_id = iqb.id
        WHERE ir.user_id = $1
      `;
      const params = [userId];

      if (questionId) {
        query += ` AND ir.question_id = $${params.length + 1}`;
        params.push(questionId);
      }

      query += ` ORDER BY ir.created_at DESC LIMIT 50`;

      const result = await database.query(query, params);
      return result.rows.map(this.mapCoachingRow);
    } catch (error) {
      console.error(
        "[InterviewResponseCoachingService] Error getting response history:",
        error
      );
      throw error;
    }
  }

  /**
   * Compare multiple responses
   */
  async compareResponses(responseId1, responseId2, userId) {
    try {
      const [response1, response2] = await Promise.all([
        this.getResponseFeedback(responseId1, userId),
        this.getResponseFeedback(responseId2, userId),
      ]);

      return {
        response1,
        response2,
        comparison: {
          contentImprovement:
            response2.scores.content - response1.scores.content,
          structureImprovement:
            response2.scores.structure - response1.scores.structure,
          clarityImprovement:
            response2.scores.clarity - response1.scores.clarity,
          overallImprovement:
            (response2.scores.content +
              response2.scores.structure +
              response2.scores.clarity) /
              3 -
            (response1.scores.content +
              response1.scores.structure +
              response1.scores.clarity) /
              3,
        },
      };
    } catch (error) {
      console.error(
        "[InterviewResponseCoachingService] Error comparing responses:",
        error
      );
      throw error;
    }
  }

  /**
   * Map database row to coaching object
   */
  mapCoachingRow(row) {
    return {
      id: row.id,
      userId: row.user_id,
      questionId: row.question_id,
      questionText: row.question_text,
      category: row.category,
      practiceSessionId: row.practice_session_id,
      originalResponse: row.original_response,
      aiFeedback:
        typeof row.ai_feedback === "string"
          ? JSON.parse(row.ai_feedback)
          : row.ai_feedback,
      scores: {
        content: row.content_score,
        structure: row.structure_score,
        clarity: row.clarity_score,
        relevance: row.relevance_score,
        specificity: row.specificity_score,
        impact: row.impact_score,
      },
      responseLength: row.response_length,
      recommendedLength: row.recommended_length,
      weakLanguagePatterns:
        typeof row.weak_language_patterns === "string"
          ? JSON.parse(row.weak_language_patterns)
          : row.weak_language_patterns || [],
      suggestedAlternatives:
        typeof row.suggested_alternatives === "string"
          ? JSON.parse(row.suggested_alternatives)
          : row.suggested_alternatives || [],
      starScore: row.star_method_adherence,
      alternativeApproaches:
        typeof row.alternative_approaches === "string"
          ? JSON.parse(row.alternative_approaches)
          : row.alternative_approaches || [],
      improvementTracking:
        typeof row.improvement_tracking === "string"
          ? JSON.parse(row.improvement_tracking)
          : row.improvement_tracking || [],
      createdAt: row.created_at,
    };
  }
}

export default new InterviewResponseCoachingService();

