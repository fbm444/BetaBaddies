import express from "express";
import coreRoutes from "./coreRoutes.js";
import templateRoutes from "./templateRoutes.js";
import exportRoutes from "./exportRoutes.js";
import aiRoutes from "./aiRoutes.js";
import versionRoutes from "./versionRoutes.js";
import validationRoutes from "./validationRoutes.js";
import sectionRoutes from "./sectionRoutes.js";
import commentRoutes from "./commentRoutes.js";
import shareRoutes from "./shareRoutes.js";
import tailoringRoutes from "./tailoringRoutes.js";
import parseRoutes from "./parseRoutes.js";
import { isAuthenticated } from "../../middleware/auth.js";

const router = express.Router();

// Public routes (no auth required)
import sharedRoutes from "./sharedRoutes.js";
router.use("/shared", sharedRoutes);

// All other routes require authentication
router.use(isAuthenticated);

// Mount feature-specific routes
// IMPORTANT: aiRoutes must come BEFORE coreRoutes to avoid /:id catching /ai/tailor
router.use("/", aiRoutes);
router.use("/", coreRoutes);
router.use("/templates", templateRoutes);
router.use("/", exportRoutes);
router.use("/", versionRoutes);
router.use("/", validationRoutes);
router.use("/", sectionRoutes);
router.use("/", commentRoutes);
router.use("/", shareRoutes);
router.use("/", tailoringRoutes);
router.use("/", parseRoutes);

export default router;
