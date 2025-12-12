import axios from "axios";
import database from "./database.js";

class GeocodingService {
  constructor() {
    this.cacheTtlMs = 1000 * 60 * 60 * 24 * 30; // 30 days
    this.userAgent =
      process.env.GEOCODING_USER_AGENT ||
      `ATS-Tracker/1.0 (+${process.env.GEOCODING_CONTACT_EMAIL || "support@example.com"})`;
    this.baseUrl =
      process.env.GEOCODING_BASE_URL || "https://nominatim.openstreetmap.org";
    this.referer = process.env.GEOCODING_REFERER || "http://localhost";
  }

  normalizeLocationType(jobType, location) {
    const normalized = (jobType || "").toLowerCase();
    if (normalized.includes("remote")) return "remote";
    if (normalized.includes("hybrid")) return "hybrid";

    const locationString = (location || "").toLowerCase();
    if (locationString.includes("remote")) return "remote";
    if (locationString.includes("hybrid")) return "hybrid";
    return "on-site";
  }

  async getCached(query) {
    const normalized = query.trim().toLowerCase();
    const result = await database.query(
      `
        SELECT query, latitude, longitude, display_name, timezone, country, region, city, raw, created_at
        FROM geocoding_cache
        WHERE LOWER(query) = $1
        LIMIT 1
      `,
      [normalized]
    );

    const row = result.rows[0];
    if (!row) return null;

    const isExpired = Date.now() - new Date(row.created_at).getTime() > this.cacheTtlMs;
    return isExpired
      ? null
      : {
          latitude: row.latitude ? parseFloat(row.latitude) : null,
          longitude: row.longitude ? parseFloat(row.longitude) : null,
          displayName: row.display_name,
          timezone: row.timezone,
          country: row.country,
          region: row.region,
          city: row.city,
          raw: row.raw,
        };
  }

  async saveCache(query, payload) {
    try {
      const normalized = query.trim().toLowerCase();
      await database.query(
        `
          INSERT INTO geocoding_cache
            (query, latitude, longitude, display_name, timezone, country, region, city, raw)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT ON CONSTRAINT geocoding_cache_query_unique
          DO UPDATE SET
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            display_name = EXCLUDED.display_name,
            timezone = EXCLUDED.timezone,
            country = EXCLUDED.country,
            region = EXCLUDED.region,
            city = EXCLUDED.city,
            raw = EXCLUDED.raw,
            created_at = NOW()
        `,
        [
          normalized,
          payload.latitude,
          payload.longitude,
          payload.displayName,
          payload.timezone || null,
          payload.country || null,
          payload.region || null,
          payload.city || null,
          payload.raw ? JSON.stringify(payload.raw) : null,
        ]
      );
    } catch (error) {
      console.warn("⚠️ Failed to cache geocode result:", error.message);
    }
  }

  async geocode(query) {
    if (!query || !query.trim()) {
      throw new Error("Location query is required for geocoding");
    }

    const cached = await this.getCached(query);
    if (cached) return cached;

    const params = {
      q: query,
      format: "jsonv2",
      addressdetails: 1,
      extratags: 1,
      limit: 1,
    };

    const doRequest = async (attempt = 1) => {
      try {
        return await axios.get(`${this.baseUrl}/search`, {
          params,
          headers: {
            "User-Agent": this.userAgent,
            Referer: this.referer,
            "Accept-Language": "en",
          },
          timeout: 8000,
        });
      } catch (error) {
        // Retry once on timeout or 5xx; surface 403/400 immediately
        const status = error?.response?.status;
        if (attempt === 1 && (!status || status >= 500 || error.code === "ECONNABORTED")) {
          await new Promise((res) => setTimeout(res, 400));
          return doRequest(attempt + 1);
        }
        throw error;
      }
    };

    try {
      const response = await doRequest();

      const result = Array.isArray(response.data) ? response.data[0] : null;
      if (!result) {
        return null;
      }

      const payload = {
        latitude: result.lat ? parseFloat(result.lat) : null,
        longitude: result.lon ? parseFloat(result.lon) : null,
        displayName: result.display_name,
        timezone: result.extratags?.timezone || null,
        country: result.address?.country || null,
        region:
          result.address?.state ||
          result.address?.region ||
          result.address?.county ||
          null,
        city:
          result.address?.city ||
          result.address?.town ||
          result.address?.village ||
          result.address?.municipality ||
          null,
        raw: result,
      };

      await this.saveCache(query, payload);
      return payload;
    } catch (error) {
      console.error("❌ Geocoding request failed:", error.message);
      return null;
    }
  }

  calculateDistanceKm(from, to) {
    if (
      !from ||
      !to ||
      from.latitude == null ||
      from.longitude == null ||
      to.latitude == null ||
      to.longitude == null
    ) {
      return null;
    }

    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // one decimal place
  }

  estimateTravelTimeMinutes(distanceKm, locationType = "on-site") {
    if (locationType === "remote") return 0;
    if (distanceKm == null) return null;

    // Simple heuristic: assume 60km/h average incl. traffic, add buffer
    const baseMinutes = (distanceKm / 60) * 60;
    const buffer = 10; // minutes for parking/transfer
    return Math.round(baseMinutes + buffer);
  }
}

export default new GeocodingService();

