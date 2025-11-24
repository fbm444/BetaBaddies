import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import interviewQuestionBankService from "./interviewQuestionBankService.js";
import OpenAI from "openai";

/**
 * Service for mock interview practice sessions (UC-077)
 * Uses mock_interview_sessions, mock_interview_questions, and mock_interview_followups tables
 */
class MockInterviewService {
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
   * Create a new mock interview session (chat-style)
   */
  async createMockInterviewSession(userId, options = {}) {
    try {
      const {
        interviewId,
        jobId,
        targetRole,
        targetCompany,
        interviewFormat = "mixed",
      } = options;

      // Get job details if jobId provided
      let jobDetails = null;
      if (jobId) {
        const jobQuery = `
          SELECT title, company, industry, job_description
          FROM job_opportunities
          WHERE id = $1 AND user_id = $2
        `;
        const jobResult = await database.query(jobQuery, [jobId, userId]);
        if (jobResult.rows.length > 0) {
          jobDetails = jobResult.rows[0];
        }
      }

      // Create session
      const sessionId = uuidv4();
      await database.query(
        `
        INSERT INTO mock_interview_sessions
        (id, user_id, interview_id, job_id, target_role, target_company, interview_format, status, started_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'in_progress', now())
        `,
        [
          sessionId,
          userId,
          interviewId || null,
          jobId || null,
          targetRole || jobDetails?.title || null,
          targetCompany || jobDetails?.company || null,
          interviewFormat,
        ]
      );

      // Generate initial greeting message from AI interviewer
      const greetingMessage = await this.generateGreetingMessage(
        targetRole || jobDetails?.title,
        targetCompany || jobDetails?.company,
        interviewFormat
      );

      // Save initial greeting message
      await this.addMessage(
        sessionId,
        "assistant",
        greetingMessage,
        "greeting"
      );

      return {
        id: sessionId,
        interviewFormat,
        status: "in_progress",
        messages: [
          {
            id: uuidv4(),
            role: "assistant",
            content: greetingMessage,
            messageType: "greeting",
            createdAt: new Date(),
          },
        ],
      };
    } catch (error) {
      console.error(
        "[MockInterviewService] Error creating mock interview:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate initial greeting message
   */
  async generateGreetingMessage(roleTitle, companyName, format) {
    if (!this.openai) {
      return `Hello! I'm your AI interview coach. I'll be conducting a ${format} format mock interview for the ${roleTitle} position${
        companyName ? ` at ${companyName}` : ""
      }. Let's begin! 

To start, could you please tell me a bit about yourself and what interests you about this role?`;
    }

    try {
      const prompt = `You are a professional, friendly AI interview coach conducting a mock interview. Generate a warm, professional greeting message to start the interview.

Role: ${roleTitle || "Software Engineer"}
Company: ${companyName || "Tech Company"}
Format: ${format}

The greeting should:
- Be warm and professional
- Set the tone for the interview
- Briefly mention the role/company
- End with a specific opening question to get the conversation started (e.g., "To start, could you tell me a bit about yourself?" or "Let's begin - can you walk me through your background?")

Keep it concise (3-4 sentences) and make sure to end with a question.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content: "You are a professional, friendly AI interview coach.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      return (
        response.choices[0]?.message?.content ||
        this.getFallbackGreeting(roleTitle, companyName, format)
      );
    } catch (error) {
      console.warn(
        "[MockInterviewService] AI greeting failed, using fallback:",
        error.message
      );
      return this.getFallbackGreeting(roleTitle, companyName, format);
    }
  }

  /**
   * Get fallback greeting message
   */
  getFallbackGreeting(roleTitle, companyName, format) {
    return `Hello! I'm your AI interview coach. I'll be conducting a ${format} format mock interview for the ${roleTitle} position${
      companyName ? ` at ${companyName}` : ""
    }. Let's begin! 

To start, could you please tell me a bit about yourself and what interests you about this role?`;
  }

  /**
   * Add a message to the chat
   */
  async addMessage(
    sessionId,
    role,
    content,
    messageType = "message",
    metadata = {}
  ) {
    try {
      const messageId = uuidv4();
      await database.query(
        `
        INSERT INTO mock_interview_messages
        (id, session_id, role, content, message_type, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, now())
        `,
        [
          messageId,
          sessionId,
          role,
          content,
          messageType,
          JSON.stringify(metadata),
        ]
      );
      return messageId;
    } catch (error) {
      console.error("[MockInterviewService] Error adding message:", error);
      throw error;
    }
  }

  /**
   * Get all messages for a session
   */
  async getSessionMessages(sessionId, userId) {
    try {
      // Verify session belongs to user
      const sessionQuery = `
        SELECT id FROM mock_interview_sessions
        WHERE id = $1 AND user_id = $2
      `;
      const sessionResult = await database.query(sessionQuery, [
        sessionId,
        userId,
      ]);
      if (sessionResult.rows.length === 0) {
        throw new Error("Session not found");
      }

      const messagesQuery = `
        SELECT id, role, content, message_type, metadata, created_at
        FROM mock_interview_messages
        WHERE session_id = $1
        ORDER BY created_at ASC
      `;
      const messagesResult = await database.query(messagesQuery, [sessionId]);

      return messagesResult.rows.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        messageType: row.message_type,
        metadata:
          typeof row.metadata === "string"
            ? JSON.parse(row.metadata)
            : row.metadata,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error("[MockInterviewService] Error getting messages:", error);
      throw error;
    }
  }

  /**
   * Submit user message and get AI response (chat-style)
   */
  async submitChatMessage(sessionId, userMessage, userId) {
    try {
      // Verify session belongs to user and is in progress
      const sessionQuery = `
        SELECT * FROM mock_interview_sessions
        WHERE id = $1 AND user_id = $2 AND status = 'in_progress'
      `;
      const sessionResult = await database.query(sessionQuery, [
        sessionId,
        userId,
      ]);
      if (sessionResult.rows.length === 0) {
        throw new Error("Session not found or not in progress");
      }

      const session = sessionResult.rows[0];

      // Save user message
      await this.addMessage(sessionId, "user", userMessage, "message");

      // Get conversation history
      const messages = await this.getSessionMessages(sessionId, userId);

      // Generate AI response based on conversation context
      const aiResponse = await this.generateConversationalResponse(
        messages,
        session.target_role,
        session.target_company,
        session.interview_format
      );

      // Save AI response
      await this.addMessage(sessionId, "assistant", aiResponse, "message");

      return {
        success: true,
        message: aiResponse,
      };
    } catch (error) {
      console.error(
        "[MockInterviewService] Error submitting chat message:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate conversational AI response
   */
  async generateConversationalResponse(
    messages,
    roleTitle,
    companyName,
    format
  ) {
    if (!this.openai) {
      return this.getFallbackResponse(messages);
    }

    try {
      // Build conversation context
      const conversationHistory = messages.slice(-15).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Count user responses to track interview progress
      const userMessages = messages.filter((m) => m.role === "user");
      const questionCount = userMessages.length;
      const totalMessages = messages.length;

      // Determine interview stage
      let interviewStage = "opening";
      if (questionCount >= 1 && questionCount < 3) {
        interviewStage = "early";
      } else if (questionCount >= 3 && questionCount < 6) {
        interviewStage = "middle";
      } else if (questionCount >= 6) {
        interviewStage = "closing";
      }

      // Format-specific question types
      const formatQuestionTypes = {
        behavioral: [
          "Tell me about a time when...",
          "Describe a situation where...",
          "Give me an example of...",
        ],
        technical: [
          "How would you approach...",
          "Explain the concept of...",
          "What's the time complexity of...",
        ],
        case_study: [
          "How would you solve this problem...",
          "Walk me through your approach to...",
          "What factors would you consider...",
        ],
        mixed: ["Mix of behavioral, technical, and situational questions"],
      };

      const systemPrompt = `You are a professional, friendly AI interview coach conducting a ${format} format mock interview for the ${roleTitle} position${
        companyName ? ` at ${companyName}` : ""
      }.

**INTERVIEW STRUCTURE & PROGRESSION:**
You must follow a structured interview progression:

1. **Opening Stage** (First 1-2 questions):
   - Start with "Tell me about yourself" or similar opening
   - Ask about interest in the role/company
   - Set a warm, professional tone

2. **Early Stage** (Questions 2-4):
   - Ask foundational questions about experience and background
   - For ${format} format: Focus on ${
        format === "behavioral"
          ? "past experiences and situations"
          : format === "technical"
          ? "technical knowledge and problem-solving"
          : format === "case_study"
          ? "analytical thinking and case scenarios"
          : "a mix of behavioral, technical, and situational questions"
      }
   - Provide gentle feedback on response structure

3. **Middle Stage** (Questions 4-7):
   - Ask deeper, more specific questions
   - Use follow-up questions to dig deeper (e.g., "Can you tell me more about that?", "What was the outcome?", "How did you measure success?")
   - Provide constructive feedback on STAR method usage, response length, and clarity
   - Ask for specific examples and quantifiable results

4. **Closing Stage** (Questions 7+):
   - Ask about questions they have for you
   - Provide confidence-building feedback
   - Summarize key strengths observed
   - Close professionally

**YOUR RESPONSIBILITIES:**

1. **Generate Interview Scenarios**: Create realistic scenarios based on the ${roleTitle} role and ${
        companyName ? companyName : "the company"
      }. Make questions relevant to the position.

2. **Simulate Interview Formats**: 
   - For ${format} format interviews, use appropriate question types
   - Behavioral: Focus on past experiences, STAR method
   - Technical: Focus on skills, problem-solving, technical knowledge
   - Case Study: Present scenarios and ask for analysis
   - Mixed: Combine all types appropriately

3. **Sequential Question Prompts & Follow-ups**:
   - Ask ONE main question at a time
   - After the candidate responds, provide brief feedback (1-2 sentences)
   - Ask 1-2 follow-up questions to dig deeper (e.g., "Can you tell me more about your specific role in that project?", "What was the impact of that decision?")
   - Then move to the next main question
   - Follow common interview progressions: opening → experience → skills → challenges → culture fit → closing

4. **Response Length Guidance & Pacing**:
   - After each response, provide brief feedback on length:
     * If too short (< 50 words): "That's a good start. Can you expand on that with more specific details?"
     * If appropriate (50-200 words): "Good length. You covered the key points well."
     * If too long (> 300 words): "That's comprehensive, but try to be more concise. Aim for 2-3 minutes of speaking time."
   - Recommend pacing: "For this type of question, aim for 2-3 minutes. You're doing well with the timing."

5. **Confidence Building**:
   - After strong responses: "That's an excellent example. You clearly demonstrated [specific skill/quality]."
   - After weaker responses: "Good effort. To strengthen this, consider [specific suggestion]. You're on the right track."
   - Use encouraging phrases: "Great example!", "That shows strong [skill]", "You're handling this well"
   - Build confidence: "You're doing well. Keep going with that level of detail."

6. **Real-time Feedback**:
   - Identify weak language patterns: "Instead of saying 'I think I did well,' try 'I achieved [specific result]'"
   - Suggest stronger alternatives: "Consider using more action verbs like 'led,' 'implemented,' 'delivered'"
   - Score responses implicitly: "Your response was very relevant and specific. Great use of concrete examples."

**CURRENT INTERVIEW STAGE**: ${interviewStage} (${questionCount} questions answered so far)

**RESPONSE FORMAT:**
- Keep responses conversational and natural
- After candidate answers, provide: (1) Brief feedback, (2) Follow-up question OR next main question, (3) Pacing/confidence feedback if appropriate
- Be adaptive but maintain structure
- Track which types of questions you've asked to ensure variety

**IMPORTANT**: Always end your response with a question to keep the conversation flowing.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...conversationHistory,
        ],
      });

      return (
        response.choices[0]?.message?.content ||
        this.getFallbackResponse(messages)
      );
    } catch (error) {
      console.warn(
        "[MockInterviewService] AI response failed, using fallback:",
        error.message
      );
      return this.getFallbackResponse(messages);
    }
  }

  /**
   * Get fallback response
   */
  getFallbackResponse(messages) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      return "Thank you for that response. Can you tell me more about that experience?";
    }
    return "That's interesting. Let's continue with the next question. Can you describe a challenging project you worked on?";
  }

  /**
   * Generate interview scenario using AI
   */
  async generateInterviewScenario(
    roleTitle,
    companyName,
    format,
    jobDescription
  ) {
    if (!this.openai) {
      return this.getFallbackScenario(roleTitle, companyName, format);
    }

    try {
      const prompt = `Generate a realistic mock interview scenario for:

Role: ${roleTitle || "Software Engineer"}
Company: ${companyName || "Tech Company"}
Interview Format: ${format}
${jobDescription ? `Job Description: ${jobDescription.substring(0, 500)}` : ""}

Generate:
1. A brief scenario description
2. 8-12 interview questions appropriate for this role and format
3. Include behavioral, technical, and situational questions
4. For behavioral questions, include follow-up questions

Respond with ONLY valid JSON:
{
  "description": "Scenario description",
  "questions": [
    {
      "text": "Question text",
      "type": "behavioral|technical|situational|case_study",
      "followups": ["followup1", "followup2"]
    }
  ]
}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content:
              "You are an expert interview coach creating realistic interview scenarios.",
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

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Could not parse JSON from OpenAI response");
    } catch (error) {
      console.warn(
        "[MockInterviewService] AI generation failed, using fallback:",
        error.message
      );
      return this.getFallbackScenario(roleTitle, companyName, format);
    }
  }

  /**
   * Get fallback scenario if AI is unavailable
   */
  getFallbackScenario(roleTitle, companyName, format) {
    return {
      description: `Mock interview for ${roleTitle} position at ${
        companyName || "a company"
      }. This is a ${format} format interview.`,
      questions: [
        {
          text: "Tell me about yourself.",
          type: "behavioral",
          followups: [
            "What interests you about this role?",
            "Why are you looking for a new opportunity?",
          ],
        },
        {
          text: "Describe a challenging project you worked on.",
          type: "behavioral",
          followups: [
            "What was your specific role?",
            "How did you measure success?",
          ],
        },
        {
          text: "How do you handle tight deadlines?",
          type: "situational",
          followups: [],
        },
        {
          text: "What are your strengths and weaknesses?",
          type: "behavioral",
          followups: [],
        },
        {
          text: "Why do you want to work here?",
          type: "culture",
          followups: [],
        },
      ],
    };
  }

  /**
   * Submit response to a mock interview question
   */
  async submitMockResponse(sessionId, questionId, responseText, userId) {
    try {
      // Verify session belongs to user
      const sessionQuery = `
        SELECT id FROM mock_interview_sessions
        WHERE id = $1 AND user_id = $2 AND status = 'in_progress'
      `;
      const sessionResult = await database.query(sessionQuery, [
        sessionId,
        userId,
      ]);

      if (sessionResult.rows.length === 0) {
        throw new Error("Session not found or not in progress");
      }

      // Update question with response
      await database.query(
        `
        UPDATE mock_interview_questions
        SET written_response = $1, response_length = $2
        WHERE id = $3 AND session_id = $4
        `,
        [responseText, responseText.length, questionId, sessionId]
      );

      return { success: true };
    } catch (error) {
      console.error("[MockInterviewService] Error submitting response:", error);
      throw error;
    }
  }

  /**
   * Complete mock interview session and generate performance summary
   */
  async completeMockSession(sessionId, userId) {
    try {
      // Verify session belongs to user
      const sessionQuery = `
        SELECT * FROM mock_interview_sessions
        WHERE id = $1 AND user_id = $2
      `;
      const sessionResult = await database.query(sessionQuery, [
        sessionId,
        userId,
      ]);

      if (sessionResult.rows.length === 0) {
        throw new Error("Session not found");
      }

      // Get all chat messages
      const messages = await this.getSessionMessages(sessionId, userId);
      const userMessages = messages.filter((m) => m.role === "user");

      // Generate performance summary based on chat messages
      const performanceSummary = await this.generatePerformanceSummaryFromChat(
        messages,
        userMessages
      );

      // Format summary text (but don't add to chat - will be shown in modal)
      const summaryText = this.formatPerformanceSummary(performanceSummary);

      // Update session
      await database.query(
        `
        UPDATE mock_interview_sessions
        SET status = 'completed',
            completed_at = now(),
            performance_summary = $1,
            improvement_areas = $2,
            confidence_score = $3,
            pacing_recommendations = $4
        WHERE id = $5
        `,
        [
          JSON.stringify(performanceSummary.summary),
          JSON.stringify(performanceSummary.improvementAreas),
          performanceSummary.confidenceScore,
          performanceSummary.pacingRecommendations,
          sessionId,
        ]
      );

      return {
        sessionId,
        performanceSummary: {
          ...performanceSummary,
          formattedText: summaryText,
        },
      };
    } catch (error) {
      console.error("[MockInterviewService] Error completing session:", error);
      throw error;
    }
  }

  /**
   * Generate performance summary from chat messages
   */
  async generatePerformanceSummaryFromChat(messages, userMessages) {
    if (!this.openai) {
      return this.getFallbackPerformanceSummaryFromChat(messages, userMessages);
    }

    try {
      // Build conversation context for analysis
      const conversationText = messages
        .map(
          (m) =>
            `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.content}`
        )
        .join("\n\n");

      const prompt = `Analyze this mock interview conversation and provide comprehensive performance feedback:

${conversationText}

Provide detailed feedback in JSON format:
{
  "summary": {
    "overall": "Overall performance assessment (2-3 sentences)",
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2"]
  },
  "improvementAreas": ["area1", "area2", "area3"],
  "confidenceScore": <0-100>,
  "pacingRecommendations": "Specific recommendations for response length and timing (2-3 minute target per response)",
  "starFrameworkAdherence": "Assessment of STAR method usage and suggestions for improvement",
  "languagePatterns": {
    "weak": ["weak pattern 1", "weak pattern 2"],
    "suggestions": ["stronger alternative 1", "stronger alternative 2"]
  },
  "responseQuality": {
    "relevance": <0-100>,
    "specificity": <0-100>,
    "impact": <0-100>
  },
  "alternativeApproaches": ["alternative approach 1", "alternative approach 2"],
  "confidenceBuilding": {
    "exercises": ["exercise 1 to build confidence", "exercise 2 to practice", "exercise 3 for improvement"],
    "techniques": ["technique 1 for better delivery", "technique 2 for stronger presence", "technique 3 for clarity"],
    "positiveReinforcement": "Specific positive feedback highlighting what went well"
  },
  "questionProgression": "Assessment of how well the candidate followed common interview question progressions",
  "formatSpecificFeedback": "Feedback specific to the interview format (behavioral/technical/case study)"
}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content:
              "You are an expert interview coach providing detailed performance feedback.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Could not parse JSON");
    } catch (error) {
      console.warn(
        "[MockInterviewService] AI summary failed, using fallback:",
        error.message
      );
      return this.getFallbackPerformanceSummaryFromChat(messages, userMessages);
    }
  }

  /**
   * Get fallback performance summary from chat
   */
  getFallbackPerformanceSummaryFromChat(messages, userMessages) {
    const totalMessages = messages.length;
    const userResponseCount = userMessages.length;
    const avgResponseLength =
      userMessages.length > 0
        ? userMessages.reduce((sum, m) => sum + m.content.length, 0) /
          userMessages.length
        : 0;

    return {
      summary: {
        overall: `You participated in a ${totalMessages} message conversation with ${userResponseCount} responses. Good engagement!`,
        strengths: [
          "Engaged with the questions",
          "Provided thoughtful responses",
        ],
        weaknesses: [
          "Could use more specific examples",
          "Consider practicing more",
        ],
      },
      improvementAreas: [
        "Add more quantifiable results to your responses",
        "Practice using the STAR method",
        "Work on response length and pacing",
      ],
      confidenceScore: Math.min(60 + userResponseCount * 5, 85),
      pacingRecommendations: `Your average response length is ${Math.round(
        avgResponseLength
      )} characters. Aim for 2-3 minute responses (approximately 300-500 words). Practice timing yourself to ensure you can convey your message effectively within this timeframe.`,
      starFrameworkAdherence:
        "Consider using the STAR method (Situation, Task, Action, Result) for behavioral questions. This structure helps you provide comprehensive, structured answers.",
      languagePatterns: {
        weak: [
          "Consider avoiding filler words",
          "Reduce use of vague qualifiers",
        ],
        suggestions: [
          "Use more action verbs (led, implemented, delivered, achieved)",
          "Be more specific with numbers and metrics",
          "Replace 'I think' with 'I demonstrated' or 'I achieved'",
        ],
      },
      responseQuality: {
        relevance: 75,
        specificity: 70,
        impact: 65,
      },
      alternativeApproaches: [
        "Consider starting with a brief summary before diving into details",
        "Use specific examples from your experience",
        "Quantify your achievements with numbers and percentages",
      ],
      confidenceBuilding: {
        exercises: [
          "Practice answering common interview questions out loud daily",
          "Record yourself answering questions and review for clarity and pacing",
          "Practice with a friend or mentor and ask for honest feedback",
          "Prepare 3-5 strong examples using the STAR method",
        ],
        techniques: [
          "Use power poses before interviews to boost confidence",
          "Practice deep breathing to manage nerves",
          "Focus on your accomplishments and strengths",
          "Maintain eye contact and speak clearly",
        ],
        positiveReinforcement:
          "You demonstrated good communication skills and provided relevant examples. With continued practice, you'll build even more confidence.",
      },
      questionProgression:
        "You followed a logical progression through the interview. Continue practicing to improve flow and transitions between topics.",
      formatSpecificFeedback:
        "You handled the interview format well. Continue practicing format-specific questions to build expertise.",
    };
  }

  /**
   * Format performance summary as readable text
   */
  formatPerformanceSummary(performanceSummary) {
    let text = "## Interview Performance Summary\n\n";

    if (performanceSummary.summary?.overall) {
      text += `**Overall Assessment:**\n${performanceSummary.summary.overall}\n\n`;
    }

    if (performanceSummary.summary?.strengths?.length > 0) {
      text += `**Strengths:**\n${performanceSummary.summary.strengths
        .map((s) => `• ${s}`)
        .join("\n")}\n\n`;
    }

    if (performanceSummary.summary?.weaknesses?.length > 0) {
      text += `**Areas for Improvement:**\n${performanceSummary.summary.weaknesses
        .map((w) => `• ${w}`)
        .join("\n")}\n\n`;
    }

    if (performanceSummary.improvementAreas?.length > 0) {
      text += `**Recommended Focus Areas:**\n${performanceSummary.improvementAreas
        .map((a) => `• ${a}`)
        .join("\n")}\n\n`;
    }

    if (performanceSummary.confidenceScore !== undefined) {
      text += `**Confidence Score:** ${performanceSummary.confidenceScore}/100\n\n`;
    }

    if (performanceSummary.pacingRecommendations) {
      text += `**Pacing Recommendations:**\n${performanceSummary.pacingRecommendations}\n\n`;
    }

    if (performanceSummary.starFrameworkAdherence) {
      text += `**STAR Framework Assessment:**\n${performanceSummary.starFrameworkAdherence}\n\n`;
    }

    if (performanceSummary.responseQuality) {
      text += `**Response Quality Scores:**\n`;
      text += `• Relevance: ${performanceSummary.responseQuality.relevance}/100\n`;
      text += `• Specificity: ${performanceSummary.responseQuality.specificity}/100\n`;
      text += `• Impact: ${performanceSummary.responseQuality.impact}/100\n\n`;
    }

    if (performanceSummary.languagePatterns) {
      if (performanceSummary.languagePatterns.weak?.length > 0) {
        text += `**Language Patterns to Improve:**\n${performanceSummary.languagePatterns.weak
          .map((w) => `• ${w}`)
          .join("\n")}\n\n`;
      }
      if (performanceSummary.languagePatterns.suggestions?.length > 0) {
        text += `**Stronger Language Alternatives:**\n${performanceSummary.languagePatterns.suggestions
          .map((s) => `• ${s}`)
          .join("\n")}\n\n`;
      }
    }

    if (performanceSummary.alternativeApproaches?.length > 0) {
      text += `**Alternative Approaches to Consider:**\n${performanceSummary.alternativeApproaches
        .map((a) => `• ${a}`)
        .join("\n")}\n\n`;
    }

    if (performanceSummary.confidenceBuilding) {
      text += `**Confidence Building Exercises:**\n`;
      if (performanceSummary.confidenceBuilding.exercises?.length > 0) {
        text += performanceSummary.confidenceBuilding.exercises
          .map((e) => `• ${e}`)
          .join("\n");
        text += `\n\n`;
      }

      text += `**Confidence Building Techniques:**\n`;
      if (performanceSummary.confidenceBuilding.techniques?.length > 0) {
        text += performanceSummary.confidenceBuilding.techniques
          .map((t) => `• ${t}`)
          .join("\n");
        text += `\n\n`;
      }

      if (performanceSummary.confidenceBuilding.positiveReinforcement) {
        text += `**Positive Reinforcement:**\n${performanceSummary.confidenceBuilding.positiveReinforcement}\n\n`;
      }
    }

    if (performanceSummary.questionProgression) {
      text += `**Interview Question Progression:**\n${performanceSummary.questionProgression}\n\n`;
    }

    if (performanceSummary.formatSpecificFeedback) {
      text += `**Format-Specific Feedback:**\n${performanceSummary.formatSpecificFeedback}\n\n`;
    }

    text +=
      "Great work on completing this mock interview! Keep practicing to improve your skills.";

    return text;
  }

  /**
   * Generate performance summary using AI
   */
  async generatePerformanceSummary(questions) {
    if (!this.openai) {
      return this.getFallbackPerformanceSummary(questions);
    }

    try {
      const responses = questions
        .map(
          (q, i) =>
            `Question ${i + 1}: ${q.question_text}\nResponse: ${
              q.written_response || "No response"
            }\n`
        )
        .join("\n");

      const prompt = `Analyze these mock interview responses and provide a performance summary:

${responses}

Provide feedback in JSON format:
{
  "summary": {
    "overall": "Overall performance assessment",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"]
  },
  "improvementAreas": ["area1", "area2"],
  "confidenceScore": <0-100>,
  "pacingRecommendations": "Recommendations for pacing and timing"
}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content:
              "You are an expert interview coach providing performance feedback.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Could not parse JSON");
    } catch (error) {
      console.warn(
        "[MockInterviewService] AI summary failed, using fallback:",
        error.message
      );
      return this.getFallbackPerformanceSummary(questions);
    }
  }

  /**
   * Get fallback performance summary
   */
  getFallbackPerformanceSummary(questions) {
    const answeredCount = questions.filter((q) => q.written_response).length;
    const totalCount = questions.length;
    const completionRate = (answeredCount / totalCount) * 100;

    return {
      summary: {
        overall: `You answered ${answeredCount} out of ${totalCount} questions. Good effort!`,
        strengths: [
          "Engaged with the questions",
          "Provided relevant responses",
        ],
        weaknesses: [
          "Could use more specific examples",
          "Consider practicing more",
        ],
      },
      improvementAreas: [
        "Add more quantifiable results to your responses",
        "Practice using the STAR method",
        "Work on response length and pacing",
      ],
      confidenceScore: Math.min(completionRate + 20, 85),
      pacingRecommendations:
        "Aim for 2-3 minute responses. Practice timing yourself to ensure you can convey your message effectively within this timeframe.",
    };
  }

  /**
   * Get mock session by ID (with chat messages)
   */
  async getMockSession(sessionId, userId) {
    try {
      const sessionQuery = `
        SELECT * FROM mock_interview_sessions
        WHERE id = $1 AND user_id = $2
      `;
      const sessionResult = await database.query(sessionQuery, [
        sessionId,
        userId,
      ]);

      if (sessionResult.rows.length === 0) {
        throw new Error("Session not found");
      }

      const session = sessionResult.rows[0];

      // Get chat messages
      const messages = await this.getSessionMessages(sessionId, userId);

      return {
        id: session.id,
        userId: session.user_id,
        interviewId: session.interview_id,
        jobId: session.job_id,
        targetRole: session.target_role,
        targetCompany: session.target_company,
        interviewFormat: session.interview_format,
        status: session.status,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        performanceSummary:
          typeof session.performance_summary === "string"
            ? JSON.parse(session.performance_summary)
            : session.performance_summary,
        improvementAreas:
          typeof session.improvement_areas === "string"
            ? JSON.parse(session.improvement_areas)
            : session.improvement_areas,
        confidenceScore: session.confidence_score,
        pacingRecommendations: session.pacing_recommendations,
        messages: messages,
      };
    } catch (error) {
      console.error("[MockInterviewService] Error getting session:", error);
      throw error;
    }
  }

  /**
   * Get mock session history for user
   */
  async getMockSessionHistory(userId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      const query = `
        SELECT id, user_id, job_id, target_role, target_company, 
               interview_format, status, started_at, completed_at, confidence_score
        FROM mock_interview_sessions
        WHERE user_id = $1
        ORDER BY started_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await database.query(query, [userId, limit, offset]);

      return result.rows.map((row) => ({
        id: row.id,
        jobId: row.job_id,
        targetRole: row.target_role,
        targetCompany: row.target_company,
        interviewFormat: row.interview_format,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        confidenceScore: row.confidence_score,
      }));
    } catch (error) {
      console.error(
        "[MockInterviewService] Error getting session history:",
        error
      );
      throw error;
    }
  }
}

export default new MockInterviewService();
