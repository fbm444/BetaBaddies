import goalService from "../services/goalService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class GoalController {
  // Create a new goal
  createGoal = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const goalData = req.body;

    const goal = await goalService.createGoal(userId, goalData);

    res.status(201).json({
      ok: true,
      data: { goal, message: "Goal created successfully" },
    });
  });

  // Get all goals for user
  getGoals = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { status, category, goalType } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (goalType) filters.goalType = goalType;

    const goals = await goalService.getGoalsByUserId(userId, filters);

    res.status(200).json({
      ok: true,
      data: { goals },
    });
  });

  // Get goal by ID
  getGoalById = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const goal = await goalService.getGoalById(id, userId);

    if (!goal) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "GOAL_NOT_FOUND",
          message: "Goal not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: { goal },
    });
  });

  // Update goal
  updateGoal = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const updateData = req.body;

    const goal = await goalService.updateGoal(id, userId, updateData);

    res.status(200).json({
      ok: true,
      data: { goal, message: "Goal updated successfully" },
    });
  });

  // Delete goal
  deleteGoal = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    await goalService.deleteGoal(id, userId);

    res.status(200).json({
      ok: true,
      data: { message: "Goal deleted successfully" },
    });
  });

  // Get goal analytics
  getGoalAnalytics = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const analytics = await goalService.getGoalAnalytics(userId);

    res.status(200).json({
      ok: true,
      data: { analytics },
    });
  });
}

export default new GoalController();

