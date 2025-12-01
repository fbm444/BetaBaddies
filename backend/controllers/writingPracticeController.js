import writingPracticeService from "../services/writingPracticeService.js";
import writingFeedbackService from "../services/writingFeedbackService.js";
import writingPromptsService from "../services/writingPromptsService.js";
import writingProgressService from "../services/writingProgressService.js";
import nervesManagementService from "../services/nervesManagementService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class WritingPracticeController {
  // Create new practice session
  createSession = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { sessionType, prompt, promptId, timeLimit } = req.body;

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error: "Prompt is required",
      });
    }

    const session = await writingPracticeService.createSession(userId, {
      sessionType,
      prompt,
      promptId,
      timeLimit,
    });

    res.status(201).json({
      ok: true,
      data: {
        session,
        message: "Practice session created successfully",
      },
    });
  });

  // Get all sessions for user
  getSessions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { sessionType, isCompleted, limit, offset, orderBy, orderDirection } = req.query;

    const filters = {
      sessionType,
      isCompleted: isCompleted === "true" ? true : isCompleted === "false" ? false : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      orderBy,
      orderDirection,
    };

    const sessions = await writingPracticeService.getSessionsByUserId(userId, filters);

    res.status(200).json({
      ok: true,
      data: {
        sessions,
      },
    });
  });

  // Get session by ID
  getSessionById = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const session = await writingPracticeService.getSessionById(id, userId);

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "Session not found",
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        session,
      },
    });
  });

  // Update session
  updateSession = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { response, wordCount, timeSpentSeconds, isCompleted } = req.body;

    const session = await writingPracticeService.updateSession(id, userId, {
      response,
      wordCount,
      timeSpentSeconds,
      isCompleted,
    });

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "Session not found",
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        session,
        message: "Session updated successfully",
      },
    });
  });

  // Delete session
  deleteSession = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const deleted = await writingPracticeService.deleteSession(id, userId);

    if (!deleted) {
      return res.status(404).json({
        ok: false,
        error: "Session not found",
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        message: "Session deleted successfully",
      },
    });
  });

  // Get session statistics
  getSessionStats = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    const stats = await writingPracticeService.getSessionStats(userId, {
      startDate,
      endDate,
    });

    res.status(200).json({
      ok: true,
      data: {
        stats,
      },
    });
  });

  // Generate feedback for session
  generateFeedback = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { forceRegenerate } = req.body;

    const feedback = await writingFeedbackService.generateFeedback(id, userId, {
      forceRegenerate: forceRegenerate || false,
    });

    // Update progress tracking
    await writingProgressService.updateProgressTracking(userId, id);

    res.status(200).json({
      ok: true,
      data: {
        feedback,
        message: "Feedback generated successfully",
      },
    });
  });

  // Get feedback for session
  getFeedback = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const feedback = await writingFeedbackService.getFeedbackBySession(id, userId);

    if (!feedback) {
      return res.status(404).json({
        ok: false,
        error: "Feedback not found for this session",
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        feedback,
      },
    });
  });

  // Compare two sessions
  compareSessions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { sessionId1, sessionId2 } = req.body;

    if (!sessionId1 || !sessionId2) {
      return res.status(400).json({
        ok: false,
        error: "Both sessionId1 and sessionId2 are required",
      });
    }

    const comparison = await writingFeedbackService.compareSessions(
      sessionId1,
      sessionId2,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        comparison,
      },
    });
  });

  // Get feedback history
  getFeedbackHistory = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { limit } = req.query;

    const history = await writingFeedbackService.getFeedbackHistory(
      userId,
      limit ? parseInt(limit) : 10
    );

    res.status(200).json({
      ok: true,
      data: {
        history,
      },
    });
  });

  // Get prompts
  getPrompts = asyncHandler(async (req, res) => {
    const { category, difficulty, isActive } = req.query;

    const prompts = await writingPromptsService.getPromptsByCategory(
      category,
      difficulty,
      isActive !== "false"
    );

    res.status(200).json({
      ok: true,
      data: {
        prompts,
      },
    });
  });

  // Get random prompt
  getRandomPrompt = asyncHandler(async (req, res) => {
    const { category, difficulty } = req.query;

    const prompt = await writingPromptsService.getRandomPrompt(category, difficulty);

    if (!prompt) {
      return res.status(404).json({
        ok: false,
        error: "No prompts found",
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        prompt,
      },
    });
  });

  // Get prompts for interview
  getPromptsForInterview = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    const prompts = await writingPromptsService.getPromptsForInterview(jobId);

    res.status(200).json({
      ok: true,
      data: {
        prompts,
      },
    });
  });

  // Create custom prompt
  createCustomPrompt = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { category, promptText, difficultyLevel, estimatedTimeMinutes, tags } = req.body;

    if (!promptText) {
      return res.status(400).json({
        ok: false,
        error: "Prompt text is required",
      });
    }

    const prompt = await writingPromptsService.createCustomPrompt(userId, {
      category,
      promptText,
      difficultyLevel,
      estimatedTimeMinutes,
      tags,
    });

    res.status(201).json({
      ok: true,
      data: {
        prompt,
        message: "Custom prompt created successfully",
      },
    });
  });

  // Get progress metrics
  getProgress = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    const metrics = await writingProgressService.calculateProgressMetrics(userId, {
      startDate,
      endDate,
    });

    res.status(200).json({
      ok: true,
      data: {
        metrics,
      },
    });
  });

  // Get progress trend
  getProgressTrend = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { metric, period } = req.query;

    const trend = await writingProgressService.getProgressTrend(
      userId,
      metric || "overall",
      period || "month"
    );

    res.status(200).json({
      ok: true,
      data: {
        trend,
      },
    });
  });

  // Get progress insights
  getProgressInsights = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const insights = await writingProgressService.getProgressInsights(userId);

    res.status(200).json({
      ok: true,
      data: {
        insights,
      },
    });
  });

  // Get nerves management exercises
  getNervesExercises = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { sessionId } = req.query;

    const exercises = await nervesManagementService.getExercisesForSession(sessionId, userId);

    res.status(200).json({
      ok: true,
      data: {
        exercises,
      },
    });
  });

  // Complete nerves exercise
  completeNervesExercise = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { exerciseType, sessionId, effectivenessRating, notes, exerciseData } = req.body;

    if (!exerciseType) {
      return res.status(400).json({
        ok: false,
        error: "Exercise type is required",
      });
    }

    const exercise = await nervesManagementService.completeExercise(null, userId, {
      exerciseType,
      sessionId,
      effectivenessRating,
      notes,
      exerciseData,
    });

    res.status(201).json({
      ok: true,
      data: {
        exercise,
        message: "Exercise completed successfully",
      },
    });
  });

  // Get exercise history
  getExerciseHistory = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { limit } = req.query;

    const history = await nervesManagementService.getExerciseHistory(
      userId,
      limit ? parseInt(limit) : 20
    );

    res.status(200).json({
      ok: true,
      data: {
        history,
      },
    });
  });

  // Generate preparation checklist
  generatePreparationChecklist = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;

    const checklist = await nervesManagementService.generatePreparationChecklist(jobId, userId);

    res.status(200).json({
      ok: true,
      data: {
        checklist,
      },
    });
  });
}

export default new WritingPracticeController();

