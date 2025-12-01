import express from "express";
import timeLogController from "../controllers/timeLogController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All time log routes require authentication
router.use(isAuthenticated);

// Time log CRUD endpoints
router.post("/", timeLogController.createTimeLog);
router.get("/", timeLogController.getTimeLogs);
router.get("/summary", timeLogController.getTimeSummary);
router.put("/:id", timeLogController.updateTimeLog);
router.delete("/:id", timeLogController.deleteTimeLog);

export default router;

