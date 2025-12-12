import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "@iconify/react";
import type { JobOpportunityData } from "../types";
import { geocodingService, type GeocodingResult, type DistanceResult } from "../services/geocodingService";
import { api } from "../services/api";

// Fix for default marker icons in Leaflet with Vite
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icon for home location
const homeIcon = L.icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

interface JobOpportunitiesMapViewProps {
  opportunities: JobOpportunityData[];
  onClose: () => void;
}

// Component to fit map bounds
function FitBounds({ 
  bounds, 
  homeLocation, 
  jobLocations, 
  visibleJobs 
}: { 
  bounds: L.LatLngBounds | null;
  homeLocation: GeocodingResult | null;
  jobLocations: Map<string, GeocodingResult>;
  visibleJobs: string[];
}) {
  const map = useMap();

  useEffect(() => {
    // Recalculate bounds based on visible jobs
    const newBounds = new L.LatLngBounds([]);
    let hasLocations = false;

    if (homeLocation) {
      newBounds.extend([homeLocation.latitude, homeLocation.longitude]);
      hasLocations = true;
    }

    visibleJobs.forEach((jobId) => {
      const coords = jobLocations.get(jobId);
      if (coords) {
        newBounds.extend([coords.latitude, coords.longitude]);
        hasLocations = true;
      }
    });

    if (hasLocations && newBounds.isValid()) {
      map.fitBounds(newBounds, { padding: [50, 50] });
    }
  }, [map, homeLocation, jobLocations, visibleJobs]);

  return null;
}

interface JobDistanceInfo {
  distance: number; // in km
  travelTime: number; // in minutes
  distanceResult: DistanceResult | null;
}

type LocationType = "remote" | "hybrid" | "on-site";

// Helper function to normalize location type
function normalizeLocationType(jobType?: string, location?: string): LocationType {
  const normalized = (jobType || "").toLowerCase();
  if (normalized.includes("remote")) return "remote";
  if (normalized.includes("hybrid")) return "hybrid";

  const locationString = (location || "").toLowerCase();
  if (locationString.includes("remote")) return "remote";
  if (locationString.includes("hybrid")) return "hybrid";
  return "on-site";
}

export function JobOpportunitiesMapView({
  opportunities,
  onClose,
}: JobOpportunitiesMapViewProps) {
  const [homeLocation, setHomeLocation] = useState<GeocodingResult | null>(null);
  const [jobLocations, setJobLocations] = useState<
    Map<string, GeocodingResult>
  >(new Map());
  const [jobDistances, setJobDistances] = useState<
    Map<string, JobDistanceInfo>
  >(new Map());
  const [jobVisibility, setJobVisibility] = useState<Map<string, boolean>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const boundsRef = useRef<L.LatLngBounds | null>(null);

  // Filter states
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [maxCommuteTime, setMaxCommuteTime] = useState<number | null>(null);
  const [locationTypeFilter, setLocationTypeFilter] = useState<Set<LocationType>>(
    new Set(["remote", "hybrid", "on-site"])
  );
  const [distanceUnit, setDistanceUnit] = useState<"km" | "miles">("km");

  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user profile for home location
        let homeLocationString = "";
        try {
          const profileResponse = await api.getProfile();
          const profile = profileResponse.data.profile;
          
          // Construct home location string
          if (profile.city && profile.state) {
            homeLocationString = `${profile.city}, ${profile.state}`;
          } else if (profile.state) {
            homeLocationString = profile.state;
          }
        } catch (err) {
          console.warn("Could not fetch user profile:", err);
        }


        // Filter opportunities with valid locations (include remote for filtering)
        const validOpportunities = opportunities.filter(
          (opp) => opp.location && opp.location.trim()
        );

        if (validOpportunities.length === 0) {
          setError("No job opportunities with locations to display.");
          setLoading(false);
          return;
        }

        // Geocode home location if available
        let home: GeocodingResult | null = null;
        if (homeLocationString) {
          try {
            home = await geocodingService.geocode(homeLocationString);
            setHomeLocation(home);
          } catch (err) {
            console.warn("Could not geocode home location:", err);
          }
        }

        // Batch geocode job locations (skip remote jobs)
        const opportunitiesToGeocode = validOpportunities.filter(
          (opp) => normalizeLocationType(opp.jobType, opp.location) !== "remote"
        );
        const locations = opportunitiesToGeocode.map((opp) => opp.location!);
        const geocodeResults = await geocodingService.batchGeocode(locations);

        // Map results to opportunities
        const locationMap = new Map<string, GeocodingResult>();
        geocodeResults.forEach((result, index) => {
          if (result.coordinates) {
            locationMap.set(opportunitiesToGeocode[index].id, result.coordinates);
          }
        });

        setJobLocations(locationMap);

        // Initialize visibility - all jobs visible by default
        const visibilityMap = new Map<string, boolean>();
        validOpportunities.forEach((opp) => {
          // Include remote jobs in visibility map even if they don't have coordinates
          visibilityMap.set(opp.id, true);
        });
        setJobVisibility(visibilityMap);

        // Calculate distances and travel times if home location exists
        if (home) {
          const distanceMap = new Map<string, JobDistanceInfo>();
          const distancePromises = Array.from(locationMap.entries()).map(
            async ([jobId, jobCoords]) => {
              try {
                const distanceResult = await geocodingService.calculateDistance(
                  home,
                  jobCoords
                );
                distanceMap.set(jobId, {
                  distance: distanceResult.distance.kilometers,
                  travelTime: distanceResult.travelTime.minutes,
                  distanceResult,
                });
              } catch (err) {
                console.warn(`Could not calculate distance for job ${jobId}:`, err);
                distanceMap.set(jobId, {
                  distance: 0,
                  travelTime: 0,
                  distanceResult: null,
                });
              }
            }
          );
          await Promise.all(distancePromises);
          setJobDistances(distanceMap);
        }

        // Calculate bounds
        const bounds = new L.LatLngBounds([]);
        if (home) {
          bounds.extend([home.latitude, home.longitude]);
        }
        locationMap.forEach((coords) => {
          bounds.extend([coords.latitude, coords.longitude]);
        });

        if (bounds.isValid()) {
          boundsRef.current = bounds;
        }
      } catch (err: any) {
        console.error("Error loading map data:", err);
        setError(err.message || "Failed to load map data");
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
  }, [opportunities]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-slate-700">Loading map data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Map View</h3>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              <Icon icon="mingcute:close-line" className="w-6 h-6" />
            </button>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Default center (US center) if no locations
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const hasLocations = jobLocations.size > 0 || homeLocation;

  const toggleJobVisibility = (jobId: string) => {
    setJobVisibility((prev) => {
      const newMap = new Map(prev);
      newMap.set(jobId, !newMap.get(jobId));
      return newMap;
    });
  };

  const toggleAllJobs = (visible: boolean) => {
    setJobVisibility((prev) => {
      const newMap = new Map(prev);
      Array.from(newMap.keys()).forEach((jobId) => {
        newMap.set(jobId, visible);
      });
      return newMap;
    });
  };

  // Apply filters to determine which jobs should be visible
  const getFilteredJobs = () => {
    return opportunities.filter((opp) => {
      // Check location type filter
      const locationType = normalizeLocationType(opp.jobType, opp.location);
      if (!locationTypeFilter.has(locationType)) {
        return false;
      }

      // For remote jobs, they pass if location type is allowed
      if (locationType === "remote") {
        return true;
      }

      // Check if job has coordinates (non-remote jobs)
      const coords = jobLocations.get(opp.id);
      if (!coords) {
        return false;
      }

      // Check distance filter
      const distanceInfo = jobDistances.get(opp.id);
      if (distanceInfo) {
        const distanceInUnit =
          distanceUnit === "km"
            ? distanceInfo.distance
            : distanceInfo.distance * 0.621371;

        if (maxDistance !== null && distanceInUnit > maxDistance) {
          return false;
        }

        // Check commute time filter
        if (
          maxCommuteTime !== null &&
          distanceInfo.travelTime > maxCommuteTime
        ) {
          return false;
        }
      }

      // Check manual visibility toggle
      return jobVisibility.get(opp.id) ?? true;
    });
  };

  const filteredJobs = getFilteredJobs();
  const visibleJobs = filteredJobs.map((opp) => opp.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full h-full md:w-11/12 md:h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-slate-900">Map View</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <Icon icon="mingcute:close-line" className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content: Sidebar + Map */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Filters + Job List */}
          <div className="w-80 border-r bg-slate-50 overflow-y-auto flex flex-col">
            {/* Filters Section */}
            <div className="p-4 border-b bg-white">
              <h4 className="font-semibold text-slate-900 mb-3">Filters</h4>
              
              {/* Location Type Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Location Type
                </label>
                <div className="space-y-2">
                  {(["remote", "hybrid", "on-site"] as LocationType[]).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={locationTypeFilter.has(type)}
                        onChange={(e) => {
                          const newSet = new Set(locationTypeFilter);
                          if (e.target.checked) {
                            newSet.add(type);
                          } else {
                            newSet.delete(type);
                          }
                          setLocationTypeFilter(newSet);
                        }}
                        className="w-4 h-4 text-blue-500 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700 capitalize">
                        {type === "on-site" ? "On-Site" : type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Distance Filter */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Max Distance
                  </label>
                  <select
                    value={distanceUnit}
                    onChange={(e) =>
                      setDistanceUnit(e.target.value as "km" | "miles")
                    }
                    className="text-xs px-2 py-1 border border-slate-300 rounded"
                  >
                    <option value="km">km</option>
                    <option value="miles">miles</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={maxDistance || ""}
                    onChange={(e) =>
                      setMaxDistance(
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    placeholder="No limit"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
                  />
                  <button
                    onClick={() => setMaxDistance(null)}
                    className="px-2 py-2 text-xs text-slate-500 hover:text-slate-700"
                    title="Clear"
                  >
                    <Icon icon="mingcute:close-line" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Commute Time Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Max Commute Time (minutes)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={maxCommuteTime || ""}
                    onChange={(e) =>
                      setMaxCommuteTime(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    placeholder="No limit"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
                  />
                  <button
                    onClick={() => setMaxCommuteTime(null)}
                    className="px-2 py-2 text-xs text-slate-500 hover:text-slate-700"
                    title="Clear"
                  >
                    <Icon icon="mingcute:close-line" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Clear All Filters */}
              {(maxDistance !== null ||
                maxCommuteTime !== null ||
                locationTypeFilter.size < 3) && (
                <button
                  onClick={() => {
                    setMaxDistance(null);
                    setMaxCommuteTime(null);
                    setLocationTypeFilter(new Set(["remote", "hybrid", "on-site"]));
                  }}
                  className="w-full px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            {/* Job List Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-900">Job Opportunities</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAllJobs(true)}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    title="Show all"
                  >
                    Show All
                  </button>
                  <button
                    onClick={() => toggleAllJobs(false)}
                    className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                    title="Hide all"
                  >
                    Hide All
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {visibleJobs.length} of {opportunities.length} jobs
                {filteredJobs.length < opportunities.length && (
                  <span className="text-blue-600"> (filtered)</span>
                )}
              </p>
            </div>
            {/* Job List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredJobs.map((opportunity) => {
                const jobId = opportunity.id;
                const coords = jobLocations.get(jobId);
                const isVisible = jobVisibility.get(jobId) ?? true;
                const distanceInfo = jobDistances.get(jobId);
                const locationType = normalizeLocationType(
                  opportunity.jobType,
                  opportunity.location
                );

                return (
                  <div
                    key={jobId}
                    className={`p-3 rounded-lg border transition-colors ${
                      isVisible
                        ? "bg-white border-blue-200"
                        : "bg-slate-100 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleJobVisibility(jobId)}
                        className="mt-1 w-4 h-4 text-blue-500 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-slate-900 text-sm truncate">
                            {opportunity.title}
                          </h5>
                          <span
                            className={`px-1.5 py-0.5 text-xs rounded ${
                              locationType === "remote"
                                ? "bg-green-100 text-green-700"
                                : locationType === "hybrid"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {locationType === "on-site" ? "On-Site" : locationType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">
                          {opportunity.company}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {opportunity.location}
                        </p>
                        {distanceInfo && homeLocation && coords && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <div className="flex items-center gap-2 text-xs">
                              <Icon
                                icon="mingcute:route-line"
                                className="w-3 h-3 text-blue-500"
                              />
                              <span className="text-slate-600">
                                {distanceUnit === "km"
                                  ? `${distanceInfo.distance.toFixed(1)} km`
                                  : `${(distanceInfo.distance * 0.621371).toFixed(1)} mi`}
                              </span>
                              <span className="text-slate-400">•</span>
                              <Icon
                                icon="mingcute:time-line"
                                className="w-3 h-3 text-blue-500"
                              />
                              <span className="text-slate-600">
                                ~{distanceInfo.travelTime} min
                              </span>
                            </div>
                          </div>
                        )}
                        {locationType === "remote" && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <p className="text-xs text-slate-500 italic">
                              Remote - No commute required
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredJobs.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No jobs match the current filters
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
          {hasLocations ? (
            <MapContainer
              center={defaultCenter}
              zoom={4}
              style={{ height: "100%", width: "100%" }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {homeLocation && (
                <Marker
                  position={[homeLocation.latitude, homeLocation.longitude]}
                  icon={homeIcon}
                >
                  <Popup>
                    <div className="text-center">
                      <strong className="text-blue-600">Home Location</strong>
                      <p className="text-sm text-slate-600 mt-1">
                        {homeLocation.displayName}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}
              {/* Draw lines from home to each visible filtered job */}
              {homeLocation &&
                filteredJobs
                  .filter((opp) => {
                    const coords = jobLocations.get(opp.id);
                    return coords && (jobVisibility.get(opp.id) ?? true);
                  })
                  .map((opportunity) => {
                    const jobId = opportunity.id;
                    const coords = jobLocations.get(jobId);
                    if (!coords) return null;
                    const distanceInfo = jobDistances.get(jobId);
                    return (
                      <Polyline
                        key={`line-${jobId}`}
                        positions={[
                          [homeLocation.latitude, homeLocation.longitude],
                          [coords.latitude, coords.longitude],
                        ]}
                        pathOptions={{
                          color: "#3b82f6",
                          weight: 2,
                          opacity: 0.6,
                          dashArray: "10, 10",
                        }}
                      >
                        {distanceInfo && (
                          <Popup>
                            <div className="text-sm">
                              <p className="font-medium text-slate-900 mb-1">
                                Distance: {distanceInfo.distance.toFixed(1)} km (
                                {(distanceInfo.distance * 0.621371).toFixed(1)} mi)
                              </p>
                              <p className="text-slate-600">
                                Travel Time: ~{distanceInfo.travelTime} minutes
                              </p>
                            </div>
                          </Popup>
                        )}
                      </Polyline>
                    );
                  })}
              {/* Job markers - only show filtered jobs with coordinates */}
              {filteredJobs
                .filter((opp) => {
                  const coords = jobLocations.get(opp.id);
                  return coords && (jobVisibility.get(opp.id) ?? true);
                })
                .map((opportunity) => {
                  const jobId = opportunity.id;
                  const coords = jobLocations.get(jobId);
                  if (!coords) return null;

                  const distanceInfo = jobDistances.get(jobId);

                  return (
                    <Marker
                      key={jobId}
                      position={[coords.latitude, coords.longitude]}
                    >
                      <Popup>
                        <div className="min-w-[200px]">
                          <h4 className="font-semibold text-slate-900 mb-1">
                            {opportunity.title}
                          </h4>
                          <p className="text-sm text-slate-600 mb-1">
                            {opportunity.company}
                          </p>
                          <p className="text-xs text-slate-500 mb-2">
                            {opportunity.location}
                          </p>
                          {distanceInfo && homeLocation && (
                            <div className="mt-2 pt-2 border-t">
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                  <Icon
                                    icon="mingcute:route-line"
                                    className="w-4 h-4 text-blue-500"
                                  />
                                  <span className="text-slate-700">
                                    {distanceInfo.distance.toFixed(1)} km (
                                    {(distanceInfo.distance * 0.621371).toFixed(1)} mi)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Icon
                                    icon="mingcute:time-line"
                                    className="w-4 h-4 text-blue-500"
                                  />
                                  <span className="text-slate-700">
                                    ~{distanceInfo.travelTime} minutes
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              <FitBounds 
                bounds={boundsRef.current} 
                homeLocation={homeLocation}
                jobLocations={jobLocations}
                visibleJobs={visibleJobs.filter((jobId) => {
                  const opp = opportunities.find((o) => o.id === jobId);
                  if (!opp) return false;
                  return jobLocations.has(jobId); // Only include jobs with coordinates
                })}
              />
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">No locations to display</p>
            </div>
          )}
        </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-t bg-slate-50">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-slate-600">Home Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-slate-600">Job Opportunities</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-t-2 border-dashed border-blue-500"></div>
              <span className="text-slate-600">Distance Lines</span>
            </div>
            <div className="ml-auto text-xs text-slate-500">
              {visibleJobs.filter((id) => jobLocations.has(id)).length} of {jobLocations.size} job{jobLocations.size !== 1 ? "s" : ""} on map
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

