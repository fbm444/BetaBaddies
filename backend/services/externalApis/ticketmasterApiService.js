import axios from "axios";

class TicketmasterApiService {
  constructor() {
    this.apiKey = process.env.TICKETMASTER_API_KEY;
    this.baseUrl = "https://app.ticketmaster.com/discovery/v2";
  }

  /**
   * Search for events by location and category
   * @param {Object} params - Search parameters
   * @param {string} params.location - Location (city, state, or "city, state")
   * @param {string} params.industry - Industry/category filter
   * @param {string} params.query - Search query/keywords
   * @param {Date} params.startDate - Start date for event search
   * @param {Date} params.endDate - End date for event search
   * @param {number} params.limit - Number of results (max 200)
   */
  async searchEvents({ location, industry, query, startDate, endDate, limit = 20 }) {
    if (!this.apiKey) {
      console.warn("⚠️ Ticketmaster API key not configured");
      return {
        events: [],
        message: "Ticketmaster API key not configured. Please add TICKETMASTER_API_KEY to your .env file. Get your free API key from https://developer.ticketmaster.com/",
      };
    }

    try {
      console.log("🎫 Ticketmaster: Starting search with params:", { location, industry, query });

      // Build search parameters
      const params = {
        apikey: this.apiKey,
        size: Math.min(limit, 200), // Ticketmaster allows up to 200 per page
        sort: "date,asc", // Sort by date ascending
      };

      // Add location - Ticketmaster requires specific format
      // Use geoPoint or city/stateCode/countryCode combination
      if (location) {
        const locationParts = location.split(",").map(s => s.trim());
        if (locationParts.length >= 2) {
          // Format: "City, State" or "City, ST"
          params.city = locationParts[0];
          // State code should be 2 letters (e.g., "CA", "NY")
          const statePart = locationParts[1];
          if (statePart.length === 2) {
            params.stateCode = statePart.toUpperCase();
            params.countryCode = "US";
          } else {
            // Try to find state code from full state name
            const stateCode = this.getStateCode(statePart);
            if (stateCode) {
              params.stateCode = stateCode;
              params.countryCode = "US";
            } else {
              // Fallback to keyword search
              params.keyword = location;
            }
          }
        } else {
          // Single location value - use as keyword
          params.keyword = location;
        }
      }

      // Add category/classification
      // Ticketmaster uses segmentId or genreId for categories
      // Common segments: KZFzniwnSyZfZ7v7nJ (Music), KZFzniwnSyZfZ7v7nE (Sports), etc.
      if (industry) {
        const industryMap = this.mapIndustryToSegment(industry);
        if (industryMap) {
          params.segmentId = industryMap.segmentId;
          if (industryMap.genreId) {
            params.genreId = industryMap.genreId;
          }
        } else {
          // Use as keyword if no mapping found
          params.keyword = params.keyword ? `${params.keyword} ${industry}` : industry;
        }
      }

      // Add search query/keywords
      if (query) {
        params.keyword = params.keyword ? `${params.keyword} ${query}` : query;
      }

      // Add date range - Ticketmaster expects ISO 8601 format
      // Format: YYYY-MM-DDTHH:mm:ssZ or just YYYY-MM-DD
      const now = new Date();
      if (startDate) {
        const start = new Date(startDate);
        params.startDateTime = start.toISOString().split('.')[0] + 'Z';
      } else {
        // Default to today
        params.startDateTime = now.toISOString().split('.')[0] + 'Z';
      }

      if (endDate) {
        const end = new Date(endDate);
        // Set to end of day
        end.setHours(23, 59, 59);
        params.endDateTime = end.toISOString().split('.')[0] + 'Z';
      }

      // Remove undefined and empty parameters
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });
      
      // Ticketmaster requires at least one of: keyword, city, or geoPoint
      // If we don't have any, add a default keyword
      if (!params.keyword && !params.city && !params.geoPoint) {
        params.keyword = "events";
      }

      console.log("🎫 Ticketmaster: Request params:", params);
      console.log("🎫 Ticketmaster: Request URL:", `${this.baseUrl}/events.json`);

      const response = await axios.get(`${this.baseUrl}/events.json`, {
        params,
      });

      console.log("🎫 Ticketmaster: Response received, total events:", response.data?._embedded?.events?.length || 0);

      const events = (response.data?._embedded?.events || []).map((event) => {
        return this.mapTicketmasterEvent(event, industry);
      }).filter((event) => event !== null);

      console.log(`🎫 Ticketmaster: Mapped ${events.length} events after filtering`);

      return {
        events: events.slice(0, limit),
        pagination: {
          total: response.data?.page?.totalElements || 0,
          page: response.data?.page?.number || 0,
          size: response.data?.page?.size || 0,
        },
      };
    } catch (error) {
      console.error("❌ Error calling Ticketmaster API:", error.message);
      console.error("❌ Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        params: error.config?.params,
      });
      
      // Log the actual error messages from Ticketmaster
      if (error.response?.data?.errors) {
        console.error("❌ Ticketmaster error messages:", JSON.stringify(error.response.data.errors, null, 2));
      }

      let errorMessage = "Failed to fetch events from Ticketmaster.";

      // Extract specific error messages from Ticketmaster
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map(err => err.detail || err.message || JSON.stringify(err)).join(", ");
        errorMessage = `Ticketmaster API error: ${errorMessages}`;
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid request parameters. Please check your search criteria.";
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = "Invalid Ticketmaster API key. Please check your TICKETMASTER_API_KEY in the .env file.";
      } else if (error.response?.status === 429) {
        errorMessage = "Rate limit reached. Please try again later.";
      } else if (error.response?.data?.fault) {
        errorMessage = `Ticketmaster API error: ${error.response.data.fault.faultstring || error.message}`;
      } else if (error.message) {
        errorMessage = `Ticketmaster API error: ${error.message}`;
      }

      return {
        events: [],
        message: errorMessage,
      };
    }
  }

  /**
   * Map Ticketmaster event to our DiscoveredEvent format
   */
  mapTicketmasterEvent(event, industryFilter) {
    const venue = event._embedded?.venues?.[0];
    const classifications = event.classifications?.[0];
    const segment = classifications?.segment?.name || "";
    const genre = classifications?.genre?.name || "";
    const category = segment || genre || "";

    // Filter by industry if specified
    if (industryFilter && category && !category.toLowerCase().includes(industryFilter.toLowerCase())) {
      return null;
    }

    // Format location
    let location = "Location TBD";
    if (venue) {
      const parts = [];
      if (venue.name) parts.push(venue.name);
      if (venue.address?.line1) parts.push(venue.address.line1);
      if (venue.city?.name) parts.push(venue.city.name);
      if (venue.state?.stateCode) parts.push(venue.state.stateCode);
      location = parts.join(", ");
    }

    // Format dates
    const startDate = event.dates?.start?.localDate || null;
    const startTime = event.dates?.start?.localTime || null;
    const endDate = event.dates?.end?.localDate || null;

    return {
      id: event.id,
      name: event.name,
      description: event.info || event.description || "",
      url: event.url,
      startDate: startDate,
      startTime: startTime ? startTime.substring(0, 5) : null, // Format HH:MM
      endDate: endDate,
      location: location,
      isVirtual: false, // Ticketmaster is typically in-person events
      organizer: event.promoter?.name || event._embedded?.attractions?.[0]?.name || null,
      category: category || industryFilter || null,
      imageUrl: event.images?.find(img => img.ratio === "16_9" && img.width > 600)?.url || 
                event.images?.[0]?.url || null,
      capacity: null, // Not typically available in Ticketmaster API
      ticketAvailability: event.dates?.status?.code === "onsale" ? "Available" : 
                          event.dates?.status?.code === "offsale" ? "Sold Out" : "Unknown",
      source: "ticketmaster",
    };
  }

  /**
   * Map industry keywords to Ticketmaster segment IDs
   * Ticketmaster segments: Music, Sports, Arts, Theatre, Film, Misc, etc.
   */
  mapIndustryToSegment(industry) {
    const industryLower = industry.toLowerCase();
    
    // Music events
    if (industryLower.includes("music") || industryLower.includes("concert") || 
        industryLower.includes("band") || industryLower.includes("festival")) {
      return { segmentId: "KZFzniwnSyZfZ7v7nJ" }; // Music
    }
    
    // Sports
    if (industryLower.includes("sport") || industryLower.includes("game") || 
        industryLower.includes("athletic")) {
      return { segmentId: "KZFzniwnSyZfZ7v7nE" }; // Sports
    }
    
    // Arts & Theatre
    if (industryLower.includes("art") || industryLower.includes("theatre") || 
        industryLower.includes("theater") || industryLower.includes("dance") ||
        industryLower.includes("comedy")) {
      return { segmentId: "KZFzniwnSyZfZ7v7na" }; // Arts & Theatre
    }
    
    // Film
    if (industryLower.includes("film") || industryLower.includes("movie") || 
        industryLower.includes("cinema")) {
      return { segmentId: "KZFzniwnSyZfZ7v7na" }; // Arts & Theatre (includes film)
    }
    
    // Business/Professional
    if (industryLower.includes("business") || industryLower.includes("professional") ||
        industryLower.includes("networking") || industryLower.includes("conference") ||
        industryLower.includes("seminar") || industryLower.includes("workshop")) {
      return { segmentId: "KZFzniwnSyZfZ7v7n1" }; // Miscellaneous
    }
    
    // Technology
    if (industryLower.includes("tech") || industryLower.includes("technology") ||
        industryLower.includes("software") || industryLower.includes("developer")) {
      return { segmentId: "KZFzniwnSyZfZ7v7n1" }; // Miscellaneous
    }
    
    // Default to Miscellaneous
    return { segmentId: "KZFzniwnSyZfZ7v7n1" };
  }

  /**
   * Convert state name to state code
   */
  getStateCode(stateName) {
    const stateMap = {
      "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
      "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
      "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
      "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
      "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
      "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
      "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
      "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
      "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
      "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
      "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
      "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
      "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC"
    };
    
    return stateMap[stateName.toLowerCase()] || null;
  }
}

export default new TicketmasterApiService();

