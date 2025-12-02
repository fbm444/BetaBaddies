import axios from "axios";

class EventbriteApiService {
  constructor() {
    this.apiKey = process.env.EVENTBRITE_API_KEY;
    this.baseUrl = "https://www.eventbriteapi.com/v3";
  }

  /**
   * Search for events by location and category
   * @param {Object} params - Search parameters
   * @param {string} params.location - Location (city, state, or "city, state")
   * @param {string} params.industry - Industry/category filter
   * @param {string} params.query - Search query/keywords
   * @param {Date} params.startDate - Start date for event search
   * @param {Date} params.endDate - End date for event search
   * @param {number} params.limit - Number of results (max 100)
   */
  async searchEvents({ location, industry, query, startDate, endDate, limit = 20 }) {
    if (!this.apiKey) {
      console.warn("⚠️ Eventbrite API key not configured");
      return {
        events: [],
        message: "Eventbrite API key not configured. Please add EVENTBRITE_API_KEY to your .env file.",
      };
    }

    // IMPORTANT: Eventbrite removed public access to /events/search/ endpoint in 2020
    // The public search API is no longer available. 
    // However, we can try to get events from your own organizations if you have any
    
    try {
      console.log("🔍 Eventbrite: Starting search with params:", { location, industry, query });
      
      // First, try to get the user's organizations
      console.log("🔍 Eventbrite: Getting user info from /users/me/");
      const userResponse = await axios.get(`${this.baseUrl}/users/me/`, {
        params: { token: this.apiKey },
      });
      
      console.log("🔍 Eventbrite: User response:", userResponse.data);
      const userId = userResponse.data?.id;
      if (!userId) {
        throw new Error("Could not retrieve user information from Eventbrite");
      }

      // Try to get organizations for this user
      console.log("🔍 Eventbrite: Getting organizations for user:", userId);
      const orgsResponse = await axios.get(`${this.baseUrl}/users/${userId}/organizations/`, {
        params: { token: this.apiKey },
      });

      console.log("🔍 Eventbrite: Organizations response:", orgsResponse.data);
      const organizations = orgsResponse.data?.organizations || [];
      
      if (organizations.length === 0) {
        console.log("⚠️ Eventbrite: User has no organizations");
        return {
          events: [],
          message: "Eventbrite's public event search was discontinued in 2020. You don't have any Eventbrite organizations to search. Please manually add events using the event URL, or consider using other event discovery services like Meetup.",
        };
      }

      console.log(`🔍 Eventbrite: Found ${organizations.length} organization(s)`);

      // Search through all organizations
      const allEvents = [];
      for (const org of organizations.slice(0, 5)) { // Limit to first 5 orgs
        try {
          console.log(`🔍 Eventbrite: Fetching events for organization ${org.id} (${org.name})`);
          const eventsResponse = await axios.get(`${this.baseUrl}/organizations/${org.id}/events/`, {
            params: {
              token: this.apiKey,
              status: "live",
              expand: "venue,organizer,format,category",
              page_size: Math.min(limit, 100),
            },
          });
          
          const orgEvents = eventsResponse.data?.events || [];
          console.log(`🔍 Eventbrite: Found ${orgEvents.length} events in organization ${org.name}`);
          allEvents.push(...orgEvents);
        } catch (orgError) {
          console.warn(`⚠️ Could not fetch events for organization ${org.id}:`, orgError.message);
          console.warn(`⚠️ Organization error details:`, {
            status: orgError.response?.status,
            data: orgError.response?.data,
          });
        }
      }

      console.log(`🔍 Eventbrite: Total events found before filtering: ${allEvents.length}`);

      // Map and filter events
      const events = allEvents
        .map((event) => this.mapEventbriteEvent(event, location, industry))
        .filter((event) => event !== null)
        .slice(0, limit);

      return {
        events,
        pagination: {},
      };
    } catch (error) {
      console.error("❌ Error fetching events from Eventbrite:", error.message);
      console.error("❌ Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      
      let errorMessage = "Failed to fetch events from Eventbrite.";
      
      if (error.response?.status === 401) {
        errorMessage = "Invalid Eventbrite API key. Please check your EVENTBRITE_API_KEY in the .env file.";
      } else if (error.response?.status === 404) {
        errorMessage = "Eventbrite API endpoint not found. The public search API was discontinued in 2020.";
      } else if (error.response?.status === 403) {
        errorMessage = "Access denied. Your API key may not have permission to access this resource.";
      } else if (error.message) {
        errorMessage = `Eventbrite API error: ${error.message}`;
      }
      
      return {
        events: [],
        message: errorMessage + " Please manually add events using the event URL.",
      };
    }

  }

  /**
   * Map Eventbrite event object to our DiscoveredEvent format
   */
  mapEventbriteEvent(event, locationFilter, industryFilter) {
    const category = event.category_id
      ? this.mapCategoryToIndustry(event.category_id)
      : null;

    // Filter by industry if specified
    if (industryFilter && category && !category.toLowerCase().includes(industryFilter.toLowerCase())) {
      return null;
    }

    // Filter by location if specified (basic check)
    const eventLocation = event.venue
      ? `${event.venue.address?.localized_address_display || event.venue.address?.address_1 || ""}`
      : event.online_event
      ? "Online"
      : "";

    if (locationFilter && eventLocation && !eventLocation.toLowerCase().includes(locationFilter.toLowerCase())) {
      return null;
    }

    return {
      id: event.id,
      name: event.name?.text || event.name,
      description: event.description?.text || event.description || "",
      url: event.url,
      startDate: event.start?.utc
        ? new Date(event.start.utc).toISOString().split("T")[0]
        : null,
      startTime: event.start?.utc
        ? new Date(event.start.utc).toTimeString().split(" ")[0].substring(0, 5)
        : null,
      endDate: event.end?.utc
        ? new Date(event.end.utc).toISOString().split("T")[0]
        : null,
      location: event.venue
        ? `${event.venue.name || ""}${event.venue.address ? `, ${event.venue.address.localized_address_display || event.venue.address.address_1 || ""}` : ""}`
        : event.online_event
        ? "Online Event"
        : locationFilter || "Location TBD",
      isVirtual: event.online_event || false,
      organizer: event.organizer?.name || null,
      category: category || industryFilter || null,
      imageUrl: event.logo?.url || null,
      capacity: event.capacity || null,
      ticketAvailability: event.ticket_availability?.has_available_tickets
        ? "Available"
        : "Sold Out",
      source: "eventbrite",
    };
  }

  /**
   * Map Eventbrite category IDs to industry names
   * Common categories: 101 (Business), 103 (Science & Tech), 104 (Music), etc.
   */
  mapCategoryToIndustry(categoryId) {
    const categoryMap = {
      101: "Business",
      102: "Science & Technology",
      103: "Music",
      104: "Film & Media",
      105: "Performing & Visual Arts",
      106: "Fashion",
      107: "Health & Wellness",
      108: "Sports & Fitness",
      109: "Travel & Outdoor",
      110: "Food & Drink",
      111: "Charity & Causes",
      112: "Government",
      113: "Spirituality",
      114: "Family & Education",
      115: "Holiday",
      116: "School Activities",
      117: "Other",
    };

    return categoryMap[categoryId] || "General";
  }

  /**
   * Get event details by ID
   */
  async getEventDetails(eventId) {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/events/${eventId}/`, {
        params: {
          token: this.apiKey, // Eventbrite v3 requires token as query parameter
          expand: "venue,organizer,format,category",
        },
      });

      const event = response.data;
      return {
        id: event.id,
        name: event.name?.text || event.name,
        description: event.description?.text || event.description || "",
        url: event.url,
        startDate: event.start?.utc
          ? new Date(event.start.utc).toISOString().split("T")[0]
          : null,
        startTime: event.start?.utc
          ? new Date(event.start.utc).toTimeString().split(" ")[0].substring(0, 5)
          : null,
        endDate: event.end?.utc
          ? new Date(event.end.utc).toISOString().split("T")[0]
          : null,
        location: event.venue
          ? `${event.venue.name || ""}${event.venue.address ? `, ${event.venue.address.localized_address_display || event.venue.address.address_1 || ""}` : ""}`
          : event.online_event
          ? "Online Event"
          : "Location TBD",
        isVirtual: event.online_event || false,
        organizer: event.organizer?.name || null,
        category: this.mapCategoryToIndustry(event.category_id) || null,
        imageUrl: event.logo?.url || null,
        capacity: event.capacity || null,
        ticketAvailability: event.ticket_availability?.has_available_tickets
          ? "Available"
          : "Sold Out",
        source: "eventbrite",
      };
    } catch (error) {
      console.error("❌ Error fetching event details from Eventbrite:", error.message);
      return null;
    }
  }
}

export default new EventbriteApiService();

