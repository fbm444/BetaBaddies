import networkingGoalService from "../services/networkingGoalService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class NetworkingGoalController {
  // Create a new goal
  create = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const goalData = req.body;

    const goal = await networkingGoalService.createGoal(userId, goalData);

    res.status(201).json({
      ok: true,
      data: {
        goal,
        message: "Networking goal created successfully",
      },
    });
  });

  // Get all goals for the current user
  getAll = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const filters = {
      status: req.query.status,
      goalType: req.query.goalType,
    };

    const goals = await networkingGoalService.getGoalsByUserId(userId, filters);

    res.status(200).json({
      ok: true,
      data: {
        goals,
      },
    });
  });

  // Get goal by ID
  getById = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const goal = await networkingGoalService.getGoalById(id, userId);

    if (!goal) {
      return res.status(404).json({
        ok: false,
        error: {
          message: "Goal not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        goal,
      },
    });
  });

  // Update goal
  update = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const goalData = req.body;

    const goal = await networkingGoalService.updateGoal(id, userId, goalData);

    res.status(200).json({
      ok: true,
      data: {
        goal,
        message: "Goal updated successfully",
      },
    });
  });

  // Delete goal
  delete = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    await networkingGoalService.deleteGoal(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Goal deleted successfully",
      },
    });
  });

  // Increment goal progress
  incrementProgress = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { increment } = req.body;

    const goal = await networkingGoalService.incrementGoalProgress(
      id,
      userId,
      increment || 1
    );

    res.status(200).json({
      ok: true,
      data: {
        goal,
        message: "Goal progress updated successfully",
      },
    });
  });
}

export default new NetworkingGoalController();

