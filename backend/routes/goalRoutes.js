import express from "express";
import goalController from "../controllers/goalController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Goal routes
router.post("/", goalController.createGoal);
router.get("/", goalController.getGoals);
router.get("/analytics", goalController.getGoalAnalytics);
router.put("/:id/complete", goalController.completeGoal); // Complete goal route (must be before /:id)
router.get("/:id", goalController.getGoalById);
router.put("/:id", goalController.updateGoal);
router.delete("/:id", goalController.deleteGoal);

export default router;

