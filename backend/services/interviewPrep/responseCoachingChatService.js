import OpenAI from "openai";
import database from "../database.js";
import mockInterviewService from "./mockInterviewService.js";

/**
 * Service for AI-powered response coaching chat (UC-076)
 * Provides personalized coaching based on mock interview performance
 */
class ResponseCoachingChatService {
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
   * Get user's mock interview history for context
   */
  async getMockInterviewHistoryForCoaching(userId, interviewId = null) {
    try {
      let query = `
        SELECT 
          id, target_role, target_company, interview_format, 
          status, started_at, completed_at, confidence_score,
          performance_summary, improvement_areas, pacing_recommendations
        FROM mock_interview_sessions
        WHERE user_id = $1 AND status = 'completed'
      `;
      const params = [userId];

      if (interviewId) {
        query += ` AND interview_id = $2`;
        params.push(interviewId);
      }

      query += ` ORDER BY completed_at DESC LIMIT 10`;

      const result = await database.query(query, params);

      return result.rows.map((row) => ({
        id: row.id,
        targetRole: row.target_role,
        targetCompany: row.target_company,
        interviewFormat: row.interview_format,
        confidenceScore: row.confidence_score,
        performanceSummary:
          typeof row.performance_summary === "string"
            ? JSON.parse(row.performance_summary)
            : row.performance_summary,
        improvementAreas:
          typeof row.improvement_areas === "string"
            ? JSON.parse(row.improvement_areas)
            : row.improvement_areas,
        pacingRecommendations: row.pacing_recommendations,
        completedAt: row.completed_at,
      }));
    } catch (error) {
      console.error(
        "[ResponseCoachingChatService] Error fetching mock interview history:",
        error
      );
      return [];
    }
  }

  /**
   * Generate coaching response based on user question and past performance
   */
  async generateCoachingResponse(userId, userMessage, interviewId = null) {
    if (!this.openai) {
      return {
        content:
          "AI coaching is not available. Please configure OpenAI API key.",
        error: true,
      };
    }

    try {
      // Get mock interview history for context
      const mockHistory = await this.getMockInterviewHistoryForCoaching(
        userId,
        interviewId
      );

      // Build context from past performance
      let performanceContext = "";
      if (mockHistory.length > 0) {
        const recentSessions = mockHistory.slice(0, 3); // Use 3 most recent
        performanceContext = `\n\nPast Mock Interview Performance:\n`;
        recentSessions.forEach((session, idx) => {
          performanceContext += `\nSession ${idx + 1} (${session.targetRole} at ${session.targetCompany || "General"}):\n`;
          if (session.performanceSummary) {
            performanceContext += `- Overall: ${session.performanceSummary.overall || "N/A"}\n`;
            if (session.performanceSummary.strengths) {
              performanceContext += `- Strengths: ${session.performanceSummary.strengths.join(", ")}\n`;
            }
            if (session.performanceSummary.weaknesses) {
              performanceContext += `- Weaknesses: ${session.performanceSummary.weaknesses.join(", ")}\n`;
            }
          }
          if (session.improvementAreas && session.improvementAreas.length > 0) {
            performanceContext += `- Improvement Areas: ${session.improvementAreas.join(", ")}\n`;
          }
          if (session.confidenceScore !== null) {
            performanceContext += `- Confidence Score: ${session.confidenceScore}/100\n`;
          }
          if (session.pacingRecommendations) {
            performanceContext += `- Pacing: ${session.pacingRecommendations}\n`;
          }
        });
      } else {
        performanceContext = "\n\nNote: No completed mock interview sessions found. General coaching will be provided.";
      }

      const prompt = `You are an expert interview coach providing personalized coaching based on the candidate's past mock interview performance.

${performanceContext}

Evaluation Parameters to Consider:
- Interview scenarios based on target role and company
- Different interview formats (behavioral, technical, case study)
- Sequential question prompts and follow-ups
- Written responses quality and structure
- Performance summary and improvement areas
- Response length guidance and pacing recommendations
- Common interview question progressions
- Confidence building exercises and techniques
- STAR method adherence
- Content quality, clarity, and impact

User Question: ${userMessage}

Provide a helpful, personalized coaching response that:
1. References their past performance when relevant
2. Addresses their specific question
3. Provides actionable advice
4. Suggests specific improvement areas based on their history
5. Includes confidence-building techniques if needed
6. Offers pacing and response length guidance
7. Considers their target role/company if available

Be encouraging but honest. Focus on actionable steps they can take to improve.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content:
              "You are a supportive, expert interview coach who provides personalized, actionable advice based on candidates' past performance. Be encouraging, specific, and practical.",
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

      return {
        content,
        error: false,
      };
    } catch (error) {
      console.error(
        "[ResponseCoachingChatService] Error generating coaching response:",
        error
      );
      return {
        content:
          "I apologize, but I'm having trouble generating a response right now. Please try again later.",
        error: true,
      };
    }
  }

  /**
   * Get suggested coaching questions based on past performance
   */
  async getSuggestedQuestions(userId, interviewId = null) {
    try {
      const mockHistory = await this.getMockInterviewHistoryForCoaching(
        userId,
        interviewId
      );

      const suggestions = [
        "How can I improve my interview responses?",
        "What are my biggest weaknesses in interviews?",
        "How can I better structure my answers?",
        "What should I focus on practicing?",
      ];

      if (mockHistory.length > 0) {
        const recentSession = mockHistory[0];
        if (recentSession.improvementAreas && recentSession.improvementAreas.length > 0) {
          suggestions.unshift(
            `How can I improve in ${recentSession.improvementAreas[0]}?`
          );
        }
        if (recentSession.confidenceScore !== null && recentSession.confidenceScore < 70) {
          suggestions.unshift("How can I build more confidence in interviews?");
        }
        if (recentSession.pacingRecommendations) {
          suggestions.unshift("How can I improve my response pacing?");
        }
      }

      return suggestions.slice(0, 5);
    } catch (error) {
      console.error(
        "[ResponseCoachingChatService] Error getting suggestions:",
        error
      );
      return [
        "How can I improve my interview responses?",
        "What are my biggest weaknesses?",
        "How can I better structure my answers?",
      ];
    }
  }
}

export default new ResponseCoachingChatService();

