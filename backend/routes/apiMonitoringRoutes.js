import express from "express";
import apiMonitoringController from "../controllers/apiMonitoringController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { isAdmin } from "../middleware/admin.js";

const router = express.Router();

// All routes require authentication and admin access
router.use(isAuthenticated);
router.use(isAdmin);

// Dashboard summary
router.get("/dashboard", apiMonitoringController.getDashboard);

// Usage statistics
router.get("/stats", apiMonitoringController.getUsageStats);

// Quota information
router.get("/quotas", apiMonitoringController.getQuotas);

// Error logs
router.get("/errors", apiMonitoringController.getRecentErrors);

// Alerts
router.get("/alerts", apiMonitoringController.getActiveAlerts);
router.patch("/alerts/:alertId/resolve", apiMonitoringController.resolveAlert);

// Response time metrics
router.get("/response-times", apiMonitoringController.getResponseTimes);

// Weekly reports
router.get("/reports/weekly", apiMonitoringController.getWeeklyReports);
router.post("/reports/weekly", apiMonitoringController.generateWeeklyReport);

export default router;

