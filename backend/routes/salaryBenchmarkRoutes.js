import express from "express";
import salaryBenchmarkController from "../controllers/salaryBenchmarkController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// GET /api/v1/salary-benchmarks?jobTitle=...&location=...
router.get("/", salaryBenchmarkController.getSalaryBenchmark);

export default router;

