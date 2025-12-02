import express from "express";
import networkingEventController from "../controllers/networkingEventController.js";
import { isAuthenticated } from "../middleware/auth.js";
import {
  validateCreateEvent,
  validateUpdateEvent,
  validateEventId,
  validateAddEventConnection,
} from "../middleware/validation.js";

const router = express.Router();

// All routes require authentication
router.get("/", isAuthenticated, networkingEventController.getAll);
router.get("/upcoming", isAuthenticated, networkingEventController.getUpcoming);
router.get("/discover", isAuthenticated, networkingEventController.discoverEvents);
router.post("/", isAuthenticated, validateCreateEvent, networkingEventController.create);
router.get("/:id", isAuthenticated, validateEventId, networkingEventController.getById);
router.put("/:id", isAuthenticated, validateEventId, validateUpdateEvent, networkingEventController.update);
router.delete("/:id", isAuthenticated, validateEventId, networkingEventController.delete);
router.get("/:id/connections", isAuthenticated, validateEventId, networkingEventController.getConnections);
router.post("/:id/connections", isAuthenticated, validateEventId, validateAddEventConnection, networkingEventController.addConnection);
router.post("/:id/register", isAuthenticated, validateEventId, networkingEventController.registerForEvent);
router.delete("/:id/register", isAuthenticated, validateEventId, networkingEventController.unregisterFromEvent);
router.get("/:id/attendees", isAuthenticated, validateEventId, networkingEventController.getEventAttendees);
router.get("/:id/goals", isAuthenticated, validateEventId, networkingEventController.getEventGoals);
router.post("/:id/goals", isAuthenticated, validateEventId, networkingEventController.upsertEventGoals);
router.put("/:id/goals", isAuthenticated, validateEventId, networkingEventController.upsertEventGoals);

export default router;

