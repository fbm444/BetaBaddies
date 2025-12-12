import geocodingService from "../services/geocodingService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class GeocodingController {
  /**
   * Geocode a location string
   * POST /api/v1/geocoding/geocode
   */
  geocode = asyncHandler(async (req, res) => {
    const { location } = req.body;

    if (!location || !location.trim()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Location is required",
        },
      });
    }

    const result = await geocodingService.geocode(location);

    if (!result) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Location not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        location: result,
      },
    });
  });

  /**
   * Batch geocode multiple locations
   * POST /api/v1/geocoding/batch
   */
  batchGeocode = asyncHandler(async (req, res) => {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Locations array is required",
        },
      });
    }

    // Limit batch size to prevent abuse
    if (locations.length > 50) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Maximum 50 locations per batch",
        },
      });
    }

    const results = await Promise.all(
      locations.map(async (location) => {
        try {
          const result = await geocodingService.geocode(location);
          return {
            location,
            coordinates: result
              ? {
                  latitude: result.latitude,
                  longitude: result.longitude,
                  displayName: result.displayName,
                }
              : null,
            error: result ? null : "Location not found",
          };
        } catch (error) {
          return {
            location,
            coordinates: null,
            error: error.message,
          };
        }
      })
    );

    res.status(200).json({
      ok: true,
      data: {
        results,
      },
    });
  });

  /**
   * Calculate distance between two locations
   * POST /api/v1/geocoding/distance
   */
  calculateDistance = asyncHandler(async (req, res) => {
    const { from, to } = req.body;

    if (!from || !to) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Both 'from' and 'to' locations are required",
        },
      });
    }

    // Geocode both locations
    const [fromResult, toResult] = await Promise.all([
      typeof from === "string" ? geocodingService.geocode(from) : Promise.resolve(from),
      typeof to === "string" ? geocodingService.geocode(to) : Promise.resolve(to),
    ]);

    if (!fromResult || !toResult) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "One or both locations could not be geocoded",
        },
      });
    }

    const distanceKm = geocodingService.calculateDistanceKm(fromResult, toResult);
    const travelTimeMinutes = geocodingService.estimateTravelTimeMinutes(
      distanceKm,
      "on-site"
    );

    res.status(200).json({
      ok: true,
      data: {
        distance: {
          kilometers: distanceKm,
          miles: distanceKm ? (distanceKm * 0.621371).toFixed(1) : null,
        },
        travelTime: {
          minutes: travelTimeMinutes,
          hours: travelTimeMinutes
            ? (travelTimeMinutes / 60).toFixed(1)
            : null,
        },
        from: fromResult,
        to: toResult,
      },
    });
  });
}

export default new GeocodingController();

