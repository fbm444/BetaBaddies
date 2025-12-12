// API base URL
const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  timezone?: string;
  country?: string;
  region?: string;
  city?: string;
}

export interface BatchGeocodingResult {
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
    displayName: string;
  } | null;
  error: string | null;
}

export interface DistanceResult {
  distance: {
    kilometers: number;
    miles: string;
  };
  travelTime: {
    minutes: number;
    hours: string;
  };
  from: GeocodingResult;
  to: GeocodingResult;
}

/**
 * Geocoding Service
 * Provides methods to interact with the geocoding endpoints
 */
export const geocodingService = {
  /**
   * Helper to make API requests
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: "Request failed" },
      }));
      throw new Error(error.error?.message || "Request failed");
    }

    return response.json();
  },

  /**
   * Geocode a single location
   */
  async geocode(location: string): Promise<GeocodingResult> {
    const response = await this.request<{ ok: boolean; data: { location: GeocodingResult } }>(
      "/geocoding/geocode",
      {
        method: "POST",
        body: JSON.stringify({ location }),
      }
    );
    return response.data.location;
  },

  /**
   * Batch geocode multiple locations
   */
  async batchGeocode(locations: string[]): Promise<BatchGeocodingResult[]> {
    const response = await this.request<{
      ok: boolean;
      data: { results: BatchGeocodingResult[] };
    }>("/geocoding/batch", {
      method: "POST",
      body: JSON.stringify({ locations }),
    });
    return response.data.results;
  },

  /**
   * Calculate distance between two locations
   */
  async calculateDistance(
    from: string | GeocodingResult,
    to: string | GeocodingResult
  ): Promise<DistanceResult> {
    const response = await this.request<{
      ok: boolean;
      data: DistanceResult;
    }>("/geocoding/distance", {
      method: "POST",
      body: JSON.stringify({ from, to }),
    });
    return response.data;
  },
};

