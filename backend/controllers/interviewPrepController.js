import {
  interviewCompanyResearchService,
  interviewQuestionBankService,
  interviewResponseCoachingService,
  mockInterviewService,
  technicalInterviewPrepService,
} from "../services/interviewPrep/index.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class InterviewPrepController {
  // ============================================================================
  // UC-074: Company Research Automation
  // ============================================================================

  /**
   * GET /api/interview-prep/interviews/:id/company-research
   * Get company research for an interview
   */
  getCompanyResearch = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const research = await interviewCompanyResearchService.getCompanyResearchForInterview(
      id,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        research,
      },
    });
  });

  /**
   * POST /api/interview-prep/interviews/:id/company-research/generate
   * Generate/refresh company research
   */
  generateCompanyResearch = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { forceRefresh } = req.body;

    const result = await interviewCompanyResearchService.generateCompanyResearch(
      id,
      userId,
      { forceRefresh }
    );

    res.status(200).json({
      ok: true,
      data: {
        ...result,
        message: "Company research generated successfully",
      },
    });
  });

  /**
   * GET /api/interview-prep/interviews/:id/company-research/export
   * Export company research report
   */
  exportCompanyResearch = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { format = "markdown" } = req.query;

    const result = await interviewCompanyResearchService.exportResearchReport(
      id,
      userId,
      format
    );

    // For PDF and DOCX, send file directly
    if (format === "pdf" || format === "docx") {
      const filePath = result.filePath;
      const filename = result.filename;
      const mimeType = result.mimeType;

      const fs = await import("fs/promises");
      const fileBuffer = await fs.readFile(filePath);

      res.setHeader("Content-Type", mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.send(fileBuffer);

      // Clean up file after sending
      await fs.unlink(filePath).catch(() => {});
    } else {
      // For markdown and JSON, send as JSON response
      res.status(200).json({
        ok: true,
        data: {
          report: result.report,
          format,
        },
      });
    }
  });

  // ============================================================================
  // UC-075: Role-Specific Question Bank
  // ============================================================================

  /**
   * GET /api/interview-prep/question-bank
   * Get question bank for a job
   */
  getQuestionBank = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId, category, difficulty } = req.query;

    if (!jobId) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "jobId is required",
        },
      });
    }

    const questionBank = await interviewQuestionBankService.getQuestionBankByJob(
      jobId,
      userId,
      { category, difficulty }
    );

    res.status(200).json({
      ok: true,
      data: {
        questionBank,
      },
    });
  });

  /**
   * POST /api/interview-prep/question-bank/generate
   * Generate question bank for a role
   */
  generateQuestionBank = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId, jobTitle, industry, difficulty } = req.body;

    if (!jobId) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "jobId is required",
        },
      });
    }

    const result = await interviewQuestionBankService.generateQuestionBank(
      jobId,
      userId,
      { jobTitle, industry, difficulty }
    );

    res.status(200).json({
      ok: true,
      data: {
        ...result,
        message: "Question bank generated successfully",
      },
    });
  });

  /**
   * GET /api/interview-prep/question-bank/:id
   * Get specific question by ID
   */
  getQuestionById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // This would require a new method in the service
    // For now, return not implemented
    res.status(501).json({
      ok: false,
      error: {
        message: "Not implemented",
      },
    });
  });

  // ============================================================================
  // UC-076: AI-Powered Response Coaching
  // ============================================================================

  /**
   * POST /api/interview-prep/responses
   * Submit a practice response
   */
  submitResponse = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { questionId, responseText, interviewId, practiceSessionId, jobId } =
      req.body;

    if (!questionId || !responseText) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "questionId and responseText are required",
        },
      });
    }

    const result = await interviewResponseCoachingService.submitResponse(
      userId,
      questionId,
      responseText,
      { interviewId, practiceSessionId, jobId }
    );

    res.status(201).json({
      ok: true,
      data: {
        ...result,
        message: "Response submitted and analyzed successfully",
      },
    });
  });

  /**
   * GET /api/interview-prep/responses/:id
   * Get response feedback
   */
  getResponseFeedback = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const feedback = await interviewResponseCoachingService.getResponseFeedback(
      id,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        feedback,
      },
    });
  });

  /**
   * GET /api/interview-prep/responses
   * Get response history
   */
  getResponseHistory = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { interviewId, questionId } = req.query;

    const history = await interviewResponseCoachingService.getResponseHistory(
      userId,
      { interviewId, questionId }
    );

    res.status(200).json({
      ok: true,
      data: {
        responses: history,
      },
    });
  });

  /**
   * POST /api/interview-prep/responses/compare
   * Compare two responses
   */
  compareResponses = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { responseId1, responseId2 } = req.body;

    if (!responseId1 || !responseId2) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "responseId1 and responseId2 are required",
        },
      });
    }

    const comparison =
      await interviewResponseCoachingService.compareResponses(
        responseId1,
        responseId2,
        userId
      );

    res.status(200).json({
      ok: true,
      data: {
        comparison,
      },
    });
  });

  // ============================================================================
  // UC-077: Mock Interview Practice Sessions
  // ============================================================================

  /**
   * POST /api/interview-prep/mock-interviews
   * Create a new mock interview session
   */
  createMockSession = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const {
      interviewId,
      jobId,
      targetRole,
      targetCompany,
      interviewFormat,
    } = req.body;

    const session = await mockInterviewService.createMockInterviewSession(
      userId,
      {
        interviewId,
        jobId,
        targetRole,
        targetCompany,
        interviewFormat,
      }
    );

    res.status(201).json({
      ok: true,
      data: {
        session,
        message: "Mock interview session created successfully",
      },
    });
  });

  /**
   * GET /api/interview-prep/mock-interviews/:id
   * Get mock interview session
   */
  getMockSession = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const session = await mockInterviewService.getMockSession(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        session,
      },
    });
  });

  /**
   * POST /api/interview-prep/mock-interviews/:id/responses
   * Submit response to a mock interview question (legacy - kept for backward compatibility)
   */
  submitMockResponse = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: sessionId } = req.params;
    const { questionId, responseText } = req.body;

    if (!questionId || !responseText) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "questionId and responseText are required",
        },
      });
    }

    const result = await mockInterviewService.submitMockResponse(
      sessionId,
      questionId,
      responseText,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        ...result,
        message: "Response submitted successfully",
      },
    });
  });

  /**
   * POST /api/interview-prep/mock-interviews/:id/chat
   * Submit a chat message and get AI response (new chat-style interface)
   */
  submitChatMessage = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: sessionId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "message is required",
        },
      });
    }

    const result = await mockInterviewService.submitChatMessage(
      sessionId,
      message.trim(),
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        ...result,
        message: "Chat message sent successfully",
      },
    });
  });

  /**
   * GET /api/interview-prep/mock-interviews/:id/messages
   * Get all messages for a mock interview session
   */
  getSessionMessages = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: sessionId } = req.params;

    const messages = await mockInterviewService.getSessionMessages(
      sessionId,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        messages,
      },
    });
  });

  /**
   * POST /api/interview-prep/mock-interviews/:id/complete
   * Complete mock interview session
   */
  completeMockSession = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const result = await mockInterviewService.completeMockSession(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        ...result,
        message: "Mock interview session completed",
      },
    });
  });

  /**
   * GET /api/interview-prep/mock-interviews
   * Get mock interview session history
   */
  getMockSessionHistory = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { limit = 20, offset = 0 } = req.query;

    const history = await mockInterviewService.getMockSessionHistory(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      ok: true,
      data: {
        sessions: history,
      },
    });
  });

  // ============================================================================
  // UC-078: Technical Interview Preparation
  // ============================================================================

  /**
   * GET /api/interview-prep/technical or /api/interview-prep/technical/:interviewId
   * Get technical prep for an interview/job
   */
  getTechnicalPrep = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { interviewId } = req.params;
    const { jobId } = req.query;
    
    // interviewId can come from params or query
    const finalInterviewId = interviewId || req.query.interviewId;

    const prep = await technicalInterviewPrepService.getTechnicalPrep(
      finalInterviewId,
      jobId,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        challenges: prep,
      },
    });
  });

  /**
   * POST /api/interview-prep/technical/generate
   * Generate technical prep challenges
   */
  generateTechnicalPrep = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { interviewId, jobId } = req.body;

    if (!jobId && !interviewId) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "jobId or interviewId is required",
        },
      });
    }

    const result = await technicalInterviewPrepService.generateTechnicalPrep(
      interviewId,
      jobId,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        ...result,
        message: "Technical prep generated successfully",
      },
    });
  });

  /**
   * POST /api/interview-prep/technical/challenges
   * Get coding challenges by tech stack
   */
  getCodingChallenges = asyncHandler(async (req, res) => {
    const { techStack, difficulty } = req.query;

    const challenges =
      await technicalInterviewPrepService.getCodingChallenges(
        techStack ? techStack.split(",") : null,
        difficulty
      );

    res.status(200).json({
      ok: true,
      data: {
        challenges,
      },
    });
  });

  /**
   * GET /api/interview-prep/technical/system-design
   * Get system design questions
   */
  getSystemDesignQuestions = asyncHandler(async (req, res) => {
    const { roleLevel } = req.query;

    const questions =
      await technicalInterviewPrepService.getSystemDesignQuestions(roleLevel);

    res.status(200).json({
      ok: true,
      data: {
        questions,
      },
    });
  });

  /**
   * POST /api/interview-prep/technical/solutions
   * Submit solution to a technical challenge
   */
  submitTechnicalSolution = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { challengeId, solution, timeTakenSeconds } = req.body;

    if (!challengeId || !solution) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "challengeId and solution are required",
        },
      });
    }

    const result = await technicalInterviewPrepService.submitTechnicalSolution(
      challengeId,
      solution,
      userId,
      timeTakenSeconds
    );

    res.status(201).json({
      ok: true,
      data: {
        ...result,
        message: "Solution submitted successfully",
      },
    });
  });

  /**
   * GET /api/interview-prep/technical/progress
   * Track technical interview progress
   */
  getTechnicalProgress = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const progress =
      await technicalInterviewPrepService.trackTechnicalProgress(userId);

    res.status(200).json({
      ok: true,
      data: {
        progress,
      },
    });
  });

  /**
   * GET /api/interview-prep/technical/attempts/:challengeId
   * Get attempt history for a specific challenge
   */
  getChallengeAttemptHistory = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { challengeId } = req.params;

    const history =
      await technicalInterviewPrepService.getChallengeAttemptHistory(
        challengeId,
        userId
      );

    res.status(200).json({
      ok: true,
      data: {
        attempts: history,
      },
    });
  });

  /**
   * GET /api/interview-prep/technical/attempts
   * Get all user attempts
   */
  getUserAttemptHistory = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { challengeId, limit = 50, offset = 0 } = req.query;

    const history = await technicalInterviewPrepService.getUserAttemptHistory(
      userId,
      {
        challengeId,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }
    );

    res.status(200).json({
      ok: true,
      data: {
        attempts: history,
      },
    });
  });
}

export default new InterviewPrepController();

