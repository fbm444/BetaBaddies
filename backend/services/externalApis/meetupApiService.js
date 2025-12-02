import axios from "axios";

class MeetupApiService {
  constructor() {
    this.apiKey = process.env.MEETUP_API_KEY;
    this.baseUrl = "https://api.meetup.com";
  }

  /**
   * Search for networking events by location and category
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
      console.warn("⚠️ Meetup API key not configured");
      return {
        events: [],
        message: "Meetup API key not configured. Please add MEETUP_API_KEY to your .env file. Get your free API key from https://www.meetup.com/meetup_api/",
      };
    }

    try {
      console.log("👥 Meetup: Starting search with params:", { location, industry, query });

      // Build search parameters for Meetup API
      const params = {
        key: this.apiKey,
        sign: "true",
        page: limit, // Number of results
        only: "public", // Only public events
        status: "upcoming", // Only upcoming events
        order: "time", // Order by time
      };

      // Add location - Meetup uses "city,state" or "city,country" format
      if (location) {
        const locationParts = location.split(",").map(s => s.trim());
        if (locationParts.length >= 2) {
          // Format: "City, State" or "City, ST"
          params.location = `${locationParts[0]},${locationParts[1]}`;
        } else {
          params.location = locationParts[0];
        }
      }

      // Add topic/category - Meetup uses topic IDs or category IDs
      // Common networking-related topics: tech, business, career, professional
      if (industry) {
        const topicMap = this.mapIndustryToTopic(industry);
        if (topicMap) {
          params.topic_category = topicMap.categoryId;
          if (topicMap.topicId) {
            params.topic_id = topicMap.topicId;
          }
        }
      }

      // Add search text/keywords
      if (query) {
        params.text = query;
      } else if (industry) {
        // Use industry as search text if no query provided
        params.text = industry;
      } else {
        // Default search for networking events
        params.text = "networking professional business";
      }

      // Add date range
      if (startDate) {
        const start = new Date(startDate);
        params.time = `${start.getTime()},`; // Start time in milliseconds
      } else {
        // Default to now
        params.time = `${Date.now()},`;
      }

      if (endDate) {
        const end = new Date(endDate);
        params.time = params.time ? `${params.time}${end.getTime()}` : `,${end.getTime()}`;
      }

      // Remove undefined parameters
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });

      console.log("👥 Meetup: Request params:", params);
      console.log("👥 Meetup: Request URL:", `${this.baseUrl}/find/events`);

      const response = await axios.get(`${this.baseUrl}/find/events`, {
        params,
      });

      console.log("👥 Meetup: Response received, total events:", response.data?.length || 0);

      const events = (response.data || []).map((event) => {
        return this.mapMeetupEvent(event, industry);
      }).filter((event) => event !== null);

      console.log(`👥 Meetup: Mapped ${events.length} events after filtering`);

      return {
        events: events.slice(0, limit),
        pagination: {
          total: events.length,
        },
      };
    } catch (error) {
      console.error("❌ Error calling Meetup API:", error.message);
      console.error("❌ Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        params: error.config?.params,
      });

      let errorMessage = "Failed to fetch events from Meetup.";

      if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = "Invalid Meetup API key. Please check your MEETUP_API_KEY in the .env file.";
      } else if (error.response?.status === 429) {
        errorMessage = "Rate limit reached. Please try again later.";
      } else if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => err.message || JSON.stringify(err)).join(", ");
        errorMessage = `Meetup API error: ${errorMessages}`;
      } else if (error.message) {
        errorMessage = `Meetup API error: ${error.message}`;
      }

      return {
        events: [],
        message: errorMessage,
      };
    }
  }

  /**
   * Map Meetup event to our DiscoveredEvent format
   */
  mapMeetupEvent(event, industryFilter) {
    // Filter by industry if specified
    const eventTopics = event.topics?.map(t => t.name.toLowerCase()) || [];
    const eventName = (event.name || "").toLowerCase();
    const eventDescription = (event.description || "").toLowerCase();
    
    if (industryFilter) {
      const industryLower = industryFilter.toLowerCase();
      const matches = eventTopics.some(t => t.includes(industryLower)) ||
                     eventName.includes(industryLower) ||
                     eventDescription.includes(industryLower);
      if (!matches) {
        return null;
      }
    }

    // Format location
    let location = "Location TBD";
    if (event.venue) {
      const parts = [];
      if (event.venue.name) parts.push(event.venue.name);
      if (event.venue.address_1) parts.push(event.venue.address_1);
      if (event.venue.city) parts.push(event.venue.city);
      if (event.venue.state) parts.push(event.venue.state);
      location = parts.join(", ");
    } else if (event.is_online_event) {
      location = "Online Event";
    }

    // Format dates
    const startDate = event.local_date || null;
    const startTime = event.local_time || null;
    const duration = event.duration || null; // Duration in milliseconds

    // Calculate end time if duration is available
    let endDate = null;
    if (startDate && duration) {
      const start = new Date(`${startDate}T${startTime || '00:00'}`);
      const end = new Date(start.getTime() + duration);
      endDate = end.toISOString().split('T')[0];
    }

    // Get category from topics
    const category = eventTopics.length > 0 ? eventTopics[0] : 
                    event.group?.category?.name || null;

    return {
      id: event.id,
      name: event.name,
      description: event.description || event.group?.description || "",
      url: event.link,
      startDate: startDate,
      startTime: startTime ? startTime.substring(0, 5) : null, // Format HH:MM
      endDate: endDate,
      location: location,
      isVirtual: event.is_online_event || false,
      organizer: event.group?.name || null,
      category: category || industryFilter || null,
      imageUrl: event.featured_photo?.photo_link || event.group?.key_photo?.photo_link || null,
      capacity: event.rsvp_limit || null,
      ticketAvailability: event.status === "upcoming" ? "Available" : "Unknown",
      source: "meetup",
    };
  }

  /**
   * Map industry keywords to Meetup topic categories
   * Meetup uses category IDs: 2 (Tech), 3 (Business), 4 (Science), etc.
   */
  mapIndustryToTopic(industry) {
    const industryLower = industry.toLowerCase();
    
    // Technology
    if (industryLower.includes("tech") || industryLower.includes("technology") ||
        industryLower.includes("software") || industryLower.includes("developer") ||
        industryLower.includes("programming") || industryLower.includes("coding")) {
      return { categoryId: 2 }; // Tech
    }
    
    // Business/Professional
    if (industryLower.includes("business") || industryLower.includes("professional") ||
        industryLower.includes("networking") || industryLower.includes("career") ||
        industryLower.includes("entrepreneur") || industryLower.includes("startup")) {
      return { categoryId: 3 }; // Business
    }
    
    // Science
    if (industryLower.includes("science") || industryLower.includes("research") ||
        industryLower.includes("engineering")) {
      return { categoryId: 4 }; // Science
    }
    
    // Health & Wellness
    if (industryLower.includes("health") || industryLower.includes("wellness") ||
        industryLower.includes("fitness") || industryLower.includes("medical")) {
      return { categoryId: 5 }; // Health & Wellness
    }
    
    // Sports & Recreation
    if (industryLower.includes("sport") || industryLower.includes("athletic") ||
        industryLower.includes("recreation")) {
      return { categoryId: 6 }; // Sports & Recreation
    }
    
    // Default to Business for networking events
    return { categoryId: 3 }; // Business
  }
}

export default new MeetupApiService();

