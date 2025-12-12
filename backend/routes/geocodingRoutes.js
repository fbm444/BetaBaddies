import express from "express";
import geocodingController from "../controllers/geocodingController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// All geocoding routes require authentication
router.use(isAuthenticated);

/**
 * POST /api/v1/geocoding/geocode
 * Geocode a single location
 */
router.post("/geocode", geocodingController.geocode);

/**
 * POST /api/v1/geocoding/batch
 * Batch geocode multiple locations
 */
router.post("/batch", geocodingController.batchGeocode);

/**
 * POST /api/v1/geocoding/distance
 * Calculate distance between two locations
 */
router.post("/distance", geocodingController.calculateDistance);

export default router;

