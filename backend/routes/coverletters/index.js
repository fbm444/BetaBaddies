import express from "express";
import coreRoutes from "./coreRoutes.js";
import templateRoutes from "./templateRoutes.js";
import exportRoutes from "./exportRoutes.js";
import aiRoutes from "./aiRoutes.js";
import versionRoutes from "./versionRoutes.js";
import performanceRoutes from "./performanceRoutes.js";
import { isAuthenticated } from "../../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Mount feature-specific routes
// IMPORTANT: Specific routes (/templates) must come BEFORE generic routes (/:id)
router.use("/templates", templateRoutes);
router.use("/", exportRoutes);
router.use("/", aiRoutes);
router.use("/", versionRoutes);
router.use("/", performanceRoutes);
router.use("/", coreRoutes); // Must be last - has /:id which catches everything

export default router;

