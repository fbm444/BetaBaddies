// Resume Services - Main Export File
// This file exports all resume-related services for easy importing

export { default as coreService } from "./coreService.js";
export { default as templateService } from "./templateService.js";
export { default as exportService } from "./exportService.js";
export { default as aiService } from "./aiService.js";
export { default as versionService } from "./versionService.js";
export { default as validationService } from "./validationService.js";
export { default as sectionService } from "./sectionService.js";
export { default as commentService } from "./commentService.js";
export { default as shareService } from "./shareService.js";
export { default as tailoringService } from "./tailoringService.js";
export { default as parseService } from "./parseService.js";

// Default export for backward compatibility
import coreService from "./coreService.js";
export default coreService;

