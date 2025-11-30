import express from "express";
import followUpController from "../controllers/followUpController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Get all pending follow-ups for user (standalone route)
router.get("/follow-ups/pending", followUpController.getPendingFollowUps);

export default router;

