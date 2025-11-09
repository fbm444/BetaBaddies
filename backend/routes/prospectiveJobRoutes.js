import express from "express";
import prospectiveJobController from "../controllers/prospectiveJobController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All prospective job routes require authentication
router.use(isAuthenticated);

// Get all prospective jobs for the authenticated user
router.get("/", prospectiveJobController.getProspectiveJobs);

// Get a specific prospective job by ID
router.get("/:id", prospectiveJobController.getProspectiveJobById);

export default router;

