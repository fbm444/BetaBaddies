import express from "express";
import resumeController from "../../controllers/resumeController.js";

const router = express.Router();

// Section Management Routes
router.get("/:id/sections", resumeController.getSectionConfig);
router.put("/:id/sections", resumeController.updateSectionConfig);
router.post("/:id/sections/:sectionId/toggle", resumeController.toggleSection);
router.post("/:id/sections/reorder", resumeController.reorderSections);
router.get("/sections/presets", resumeController.getSectionPresets);
router.post("/:id/sections/presets", resumeController.applySectionPreset);

export default router;

