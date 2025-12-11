import express from "express";
import githubController from "../controllers/githubController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Connection management
router.post("/connect", githubController.connect);
router.delete("/disconnect", githubController.disconnect);
router.get("/status", githubController.getStatus);

// Repository management
router.post("/repositories/import", githubController.importRepositories);
router.post("/repositories/sync", githubController.syncRepositories);
router.get("/repositories", githubController.getRepositories);
router.get("/repositories/statistics", githubController.getStatistics);
router.get("/repositories/:id", githubController.getRepository);
router.put("/repositories/:id/featured", githubController.setFeatured);
router.post("/repositories/:id/skills", githubController.linkToSkills);
router.get("/repositories/:id/contributions", githubController.getContributions);
router.post("/repositories/:id/add-to-projects", githubController.addToProjects);
router.get("/contributions/overall", githubController.getOverallContributions);

export default router;

