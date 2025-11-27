import express from "express";
import networkingGoalController from "../controllers/networkingGoalController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.get("/", isAuthenticated, networkingGoalController.getAll);
router.post("/", isAuthenticated, networkingGoalController.create);
router.get("/:id", isAuthenticated, networkingGoalController.getById);
router.put("/:id", isAuthenticated, networkingGoalController.update);
router.delete("/:id", isAuthenticated, networkingGoalController.delete);
router.post("/:id/increment", isAuthenticated, networkingGoalController.incrementProgress);

export default router;

