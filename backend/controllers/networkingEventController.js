import networkingEventService from "../services/networkingEventService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class NetworkingEventController {
  // Create a new event
  create = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const eventData = req.body;

    const event = await networkingEventService.createEvent(userId, eventData);

    res.status(201).json({
      ok: true,
      data: {
        event,
        message: "Networking event created successfully",
      },
    });
  });

  // Get all events for the current user
  getAll = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const filters = {
      industry: req.query.industry,
      attended: req.query.attended !== undefined ? req.query.attended === "true" : undefined,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
    };

    const events = await networkingEventService.getEventsByUserId(userId, filters);

    res.status(200).json({
      ok: true,
      data: {
        events,
      },
    });
  });

  // Get event by ID
  getById = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const event = await networkingEventService.getEventById(id, userId);

    if (!event) {
      return res.status(404).json({
        ok: false,
        error: {
          message: "Event not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        event,
      },
    });
  });

  // Update event
  update = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const eventData = req.body;

    const event = await networkingEventService.updateEvent(id, userId, eventData);

    res.status(200).json({
      ok: true,
      data: {
        event,
        message: "Event updated successfully",
      },
    });
  });

  // Delete event
  delete = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    await networkingEventService.deleteEvent(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Event deleted successfully",
      },
    });
  });

  // Get upcoming events
  getUpcoming = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const events = await networkingEventService.getUpcomingEvents(userId);

    res.status(200).json({
      ok: true,
      data: {
        events,
      },
    });
  });

  // Get event connections
  getConnections = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const connections = await networkingEventService.getEventConnections(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        connections,
      },
    });
  });

  // Add connection to event
  addConnection = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const connectionData = req.body;

    const connection = await networkingEventService.addEventConnection(id, userId, connectionData);

    res.status(201).json({
      ok: true,
      data: {
        connection,
        message: "Connection added successfully",
      },
    });
  });

  // Discover events from all users in the database
  discoverEvents = asyncHandler(async (req, res) => {
    console.log("🔍 Discover events endpoint hit");
    const userId = req.session.userId;
    const { location, industry, query, startDate, endDate, limit } = req.query;

    const searchParams = {
      location: location || undefined,
      industry: industry || undefined,
      search: query || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: limit ? parseInt(limit) : 50,
    };

    console.log("🔍 Search params:", searchParams);

    const events = await networkingEventService.getAllPublicEvents(searchParams, userId);

    res.status(200).json({
      ok: true,
      data: {
        events,
        pagination: {
          total: events.length,
        },
      },
    });
  });

  // Register for an event (import to My Events)
  registerForEvent = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const result = await networkingEventService.registerForEvent(id, userId);

    if (result.alreadyRegistered) {
      return res.status(200).json({
        ok: true,
        data: {
          message: "You are already registered for this event",
          alreadyRegistered: true,
        },
      });
    }

    res.status(201).json({
      ok: true,
      data: {
        registration: result.registration,
        message: "Successfully registered for event",
      },
    });
  });

  // Unregister from an event
  unregisterFromEvent = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const result = await networkingEventService.unregisterFromEvent(id, userId);

    if (!result.success) {
      return res.status(404).json({
        ok: false,
        error: {
          message: result.message || "Registration not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        message: result.message,
      },
    });
  });

  // Get event attendees
  getEventAttendees = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    const attendees = await networkingEventService.getEventAttendees(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        attendees,
      },
    });
  });

  // Get event goals for current user
  getEventGoals = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const goals = await networkingEventService.getEventGoals(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        goals: goals || null,
      },
    });
  });

  // Create or update event goals
  upsertEventGoals = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const goalsData = req.body;

    const goals = await networkingEventService.upsertEventGoals(id, userId, goalsData);

    res.status(200).json({
      ok: true,
      data: {
        goals,
        message: "Event goals saved successfully",
      },
    });
  });
}

export default new NetworkingEventController();

