import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { NetworkingEvent, NetworkingEventInput, DiscoveredEvent, EventAttendee, EventGoals, EventGoalsInput, EventConnection } from "../types/network.types";
import type { JobOpportunityData, JobStatus } from "../types";
import { validateUrl, validateTime, validateDate, validateRequired } from "../utils/validation";
import { INDUSTRIES } from "../types/jobOpportunity.types";

export function NetworkEvents() {
  const [events, setEvents] = useState<NetworkingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<NetworkingEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-events" | "discover">("my-events");
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [eventAttendees, setEventAttendees] = useState<EventAttendee[]>([]);
  const [eventGoals, setEventGoals] = useState<EventGoals | null>(null);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [eventTab, setEventTab] = useState<Record<string, "planning" | "debrief" | "outcomes">>({});
  const [eventConnections, setEventConnections] = useState<Record<string, EventConnection[]>>({});
  const [isLoadingConnections, setIsLoadingConnections] = useState<Record<string, boolean>>({});
  const [eventConnectionCounts, setEventConnectionCounts] = useState<Record<string, number>>({});
  const [jobOutcomes, setJobOutcomes] = useState<JobOpportunityData[] | null>(null);
  const [isLoadingJobOutcomes, setIsLoadingJobOutcomes] = useState(false);
  
  // Discovery state
  const [discoveredEvents, setDiscoveredEvents] = useState<DiscoveredEvent[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    location: "",
    industry: "",
    query: "",
  });

  useEffect(() => {
    fetchEvents();
    loadUserProfile();
    loadCurrentUserId();
  }, []);

  const loadCurrentUserId = async () => {
    try {
      const response = await api.getUserAuth();
      if (response.ok && response.data?.user) {
        setCurrentUserId(response.data.user.id);
      }
    } catch (err) {
      console.error("Failed to load current user ID:", err);
    }
  };

  // Auto-load events when switching to discover tab
  useEffect(() => {
    if (activeTab === "discover" && discoveredEvents.length === 0 && !isDiscovering) {
      // Auto-search with current filters (or no filters) when tab is opened
      const autoSearch = async () => {
        try {
          setIsDiscovering(true);
          const response = await api.discoverNetworkingEvents({
            location: searchFilters.location?.trim() || undefined,
            industry: searchFilters.industry?.trim() || undefined,
            query: searchFilters.query?.trim() || undefined,
            limit: 50,
          });
          if (response.ok) {
            const events = response.data?.events || [];
            setDiscoveredEvents(events);
          }
        } catch (err: any) {
          console.error("Failed to load events:", err);
        } finally {
          setIsDiscovering(false);
        }
      };
      autoSearch();
    }
  }, [activeTab, searchFilters]);

  const loadUserProfile = async () => {
    try {
      const response = await api.getProfile();
      if (response.ok && response.data?.profile) {
        const profile = response.data.profile;
        // Auto-populate location and industry from profile
        const location = profile.city && profile.state 
          ? `${profile.city}, ${profile.state}`
          : profile.city || profile.state || "";
        
        setSearchFilters({
          location: location,
          industry: profile.industry || "",
          query: "",
        });
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      // Don't show error to user, just use empty defaults
    }
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getNetworkingEvents();
      if (response.ok) {
        setEvents(response.data!.events);
      }
    } catch (err: any) {
      console.error("Failed to fetch events:", err);
      setError("Failed to load events. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  const handleEditEvent = async (id: string, eventData: Partial<NetworkingEventInput>) => {
    // Double-check that the user is the creator before allowing edit
    const event = events.find(e => e.id === id);
    if (event && currentUserId && event.userId !== currentUserId) {
      setError("You can only edit events you created");
      setIsEditModalOpen(false);
      setSelectedEvent(null);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.updateNetworkingEvent(id, eventData);
      if (response.ok) {
        await fetchEvents();
        setIsEditModalOpen(false);
        setSelectedEvent(null);
      } else {
        setError(response.error?.message || "Failed to update event");
      }
    } catch (err: any) {
      console.error("Failed to update event:", err);
      setError("Failed to update event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this event? It will be marked as cancelled and others won't be able to sign up.")) return;
    try {
      setError(null);
      const response = await api.deleteNetworkingEvent(id);
      if (response.ok) {
        await fetchEvents();
        // Refresh discovered events if on that tab
        if (activeTab === "discover") {
          const searchResponse = await api.discoverNetworkingEvents({
            location: searchFilters.location?.trim() || undefined,
            industry: searchFilters.industry?.trim() || undefined,
            query: searchFilters.query?.trim() || undefined,
            limit: 20,
          });
          if (searchResponse.ok) {
            setDiscoveredEvents(searchResponse.data?.events || []);
          }
        }
      } else {
        setError(response.error?.message || "Failed to cancel event");
      }
    } catch (err: any) {
      console.error("Failed to cancel event:", err);
      setError("Failed to cancel event. Please try again.");
    }
  };

  const handleUnregister = async (eventId: string) => {
    if (!confirm("Are you sure you want to remove this event from My Events?")) return;
    try {
      setError(null);
      const response = await api.unregisterFromEvent(eventId);
      if (response.ok) {
        await fetchEvents();
        // Always refresh discovered events to update signup count and registration status
        const searchResponse = await api.discoverNetworkingEvents({
          location: searchFilters.location?.trim() || undefined,
          industry: searchFilters.industry?.trim() || undefined,
          query: searchFilters.query?.trim() || undefined,
          limit: 50,
        });
        if (searchResponse.ok) {
          setDiscoveredEvents(searchResponse.data?.events || []);
        }
      } else {
        setError(response.error?.message || "Failed to unregister from event");
      }
    } catch (err: any) {
      console.error("Failed to unregister from event:", err);
      setError("Failed to unregister from event. Please try again.");
    }
  };

  const handleViewAttendees = async (eventId: string) => {
    try {
      setIsLoadingAttendees(true);
      setSelectedEvent(events.find(e => e.id === eventId) || null);
      const response = await api.getEventAttendees(eventId);
      if (response.ok) {
        const attendees = response.data!.attendees;
        // Check which attendees are already contacts
        const attendeesWithContactStatus = await Promise.all(
          attendees.map(async (attendee) => {
            if (!attendee.email) {
              return { ...attendee, isContact: false };
            }
            try {
              const checkResponse = await api.checkContactByEmail(attendee.email);
              if (checkResponse.ok && checkResponse.data?.exists) {
                return {
                  ...attendee,
                  isContact: true,
                  contactId: checkResponse.data.contact?.id,
                };
              }
            } catch (err) {
              console.warn(`Failed to check contact for ${attendee.email}:`, err);
            }
            return { ...attendee, isContact: false };
          })
        );
        setEventAttendees(attendeesWithContactStatus);
        setIsAttendeesModalOpen(true);
      } else {
        setError(response.error?.message || "Failed to load attendees");
      }
    } catch (err: any) {
      console.error("Failed to load attendees:", err);
      setError("Failed to load attendees. Please try again.");
    } finally {
      setIsLoadingAttendees(false);
    }
  };

  const handleViewGoals = async (eventId: string) => {
    try {
      setIsLoadingGoals(true);
      setSelectedEvent(events.find(e => e.id === eventId) || null);
      const response = await api.getEventGoals(eventId);
      if (response.ok) {
        setEventGoals(response.data!.goals);
        setIsGoalsModalOpen(true);
      } else {
        setError(response.error?.message || "Failed to load goals");
      }
    } catch (err: any) {
      console.error("Failed to load goals:", err);
      setError("Failed to load goals. Please try again.");
    } finally {
      setIsLoadingGoals(false);
    }
  };

  const handleAddAttendeeAsContact = async (attendee: EventAttendee) => {
    if (!selectedEvent) return;
    
    // If already a contact, just create the event connection if it doesn't exist
    if (attendee.isContact && attendee.contactId) {
      try {
        setIsSubmitting(true);
        setError(null);
        // Try to create event connection (it may already exist, which is fine)
        try {
          await api.addEventConnection(selectedEvent.id, {
            contactId: attendee.contactId,
            connectionQuality: "Good",
            followupRequired: true,
            notes: `Added from event attendees`,
          });
        } catch (connErr: any) {
          // If connection already exists, that's okay
          if (!connErr.message?.includes("already exists") && !connErr.message?.includes("duplicate")) {
            console.warn("Failed to create event connection:", connErr);
          }
        }
        
        // Update attendee status to show as contact
        setEventAttendees(prev => prev.map(a => 
          a.registrationId === attendee.registrationId 
            ? { ...a, isContact: true, contactId: attendee.contactId }
            : a
        ));

        // Optimistically increment current connections count for this event
        setEventConnectionCounts(prev => ({
          ...prev,
          [selectedEvent.id]: (prev[selectedEvent.id] || 0) + 1,
        }));
      } catch (err: any) {
        console.error("Failed to link existing contact:", err);
        setError("Failed to link contact to event. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Create new contact
    try {
      setIsSubmitting(true);
      setError(null);
      const contactData = {
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email,
        industry: attendee.industry,
        jobTitle: attendee.jobTitle,
        location: attendee.location,
        relationshipType: "Event Attendee",
        relationshipContext: `Met at event: ${selectedEvent.eventName}`,
      };
      const response = await api.createContact(contactData);
      if (response.ok && response.data?.contact) {
        // Create event connection to link the contact to this event
        try {
          await api.addEventConnection(selectedEvent.id, {
            contactId: response.data.contact.id,
            connectionQuality: "Good",
            followupRequired: true,
            notes: `Added from event attendees`,
          });
        } catch (connErr) {
          console.warn("Failed to create event connection:", connErr);
          // Don't fail the whole operation if connection creation fails
        }
        
        // Update attendee status to show as contact
        setEventAttendees(prev => prev.map(a => 
          a.registrationId === attendee.registrationId 
            ? { ...a, isContact: true, contactId: response.data.contact.id }
            : a
        ));

        // Optimistically increment current connections count for this event
        setEventConnectionCounts(prev => ({
          ...prev,
          [selectedEvent.id]: (prev[selectedEvent.id] || 0) + 1,
        }));
      } else {
        // Check if it's a duplicate email error
        if (response.error?.code === "DUPLICATE_EMAIL" || response.error?.message?.includes("already exists")) {
          // Contact already exists, check and update status
          if (attendee.email) {
            const checkResponse = await api.checkContactByEmail(attendee.email);
            if (checkResponse.ok && checkResponse.data?.exists && checkResponse.data.contact) {
              setEventAttendees(prev => prev.map(a => 
                a.registrationId === attendee.registrationId 
                  ? { ...a, isContact: true, contactId: checkResponse.data.contact!.id }
                  : a
              ));
              // Try to create event connection
              try {
                await api.addEventConnection(selectedEvent.id, {
                  contactId: checkResponse.data.contact!.id,
                  connectionQuality: "Good",
                  followupRequired: true,
                  notes: `Added from event attendees`,
                });
              } catch (connErr) {
                console.warn("Failed to create event connection:", connErr);
              }

              // Optimistically increment current connections count for this event
              setEventConnectionCounts(prev => ({
                ...prev,
                [selectedEvent.id]: (prev[selectedEvent.id] || 0) + 1,
              }));
            }
          }
        } else {
          setError(response.error?.message || "Failed to add contact");
        }
      }
    } catch (err: any) {
      console.error("Failed to add contact:", err);
      setError("Failed to add contact. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveGoals = async (goalsData: EventGoalsInput) => {
    if (!selectedEvent) return;
    // Remove currentCount and goalType from the data - currentCount is automatically calculated, goalType is removed
    const { currentCount, goalType, targetIndustry, ...rest } = goalsData;

    // Always derive targetIndustry from the event itself, not user input
    const goalsDataToSave: EventGoalsInput = {
      ...rest,
      targetIndustry: selectedEvent.industry || undefined,
    };
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.upsertEventGoals(selectedEvent.id, goalsDataToSave);
      if (response.ok) {
        setEventGoals(response.data!.goals);
        setIsGoalsModalOpen(false);
      } else {
        setError(response.error?.message || "Failed to save goals");
      }
    } catch (err: any) {
      console.error("Failed to save goals:", err);
      setError("Failed to save goals. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadConnections = async (eventId: string) => {
    if (eventConnections[eventId]) return; // Already loaded
    
    try {
      setIsLoadingConnections(prev => ({ ...prev, [eventId]: true }));
      const response = await api.getEventConnections(eventId);
      if (response.ok) {
        const connections = response.data!.connections;
        setEventConnections(prev => ({ ...prev, [eventId]: connections }));
        setEventConnectionCounts(prev => ({
          ...prev,
          [eventId]: connections.length,
        }));
      }
    } catch (err: any) {
      console.error("Failed to load connections:", err);
    } finally {
      setIsLoadingConnections(prev => ({ ...prev, [eventId]: false }));
    }
  };

  // Load job opportunities once so we can link networking connections to job outcomes
  const loadJobOutcomes = async () => {
    if (jobOutcomes || isLoadingJobOutcomes) return;

    try {
      setIsLoadingJobOutcomes(true);
      const response = await api.getJobOpportunities({
        sort: "-created_at",
      });
      if (response.ok && response.data) {
        const allJobs = (response.data as any).jobOpportunities || [];
        // Filter out archived jobs
        const activeJobs = (allJobs as JobOpportunityData[]).filter(job => !job.archived);
        setJobOutcomes(activeJobs);
      } else {
        setJobOutcomes([]);
      }
    } catch (err) {
      console.error("Failed to load job outcomes for networking events:", err);
      setJobOutcomes([]);
    } finally {
      setIsLoadingJobOutcomes(false);
    }
  };

  const handleToggleEventTabs = (eventId: string, tab: "planning" | "debrief" | "outcomes") => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
    setEventTab(prev => ({ ...prev, [eventId]: tab }));
    
    // Load connections when opening debrief or outcomes tab
    if ((tab === "debrief" || tab === "outcomes") && expandedEventId !== eventId) {
      handleLoadConnections(eventId);
      loadJobOutcomes();
    }
  };

  const handleUpdatePreparationNotes = async (eventId: string, notes: string) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.updateNetworkingEvent(eventId, { preparationNotes: notes });
      if (response.ok) {
        // Update the event in the events list
        setEvents(prev => prev.map(e => 
          e.id === eventId ? { ...e, preparationNotes: notes } : e
        ));
      } else {
        setError(response.error?.message || "Failed to update preparation notes");
      }
    } catch (err: any) {
      console.error("Failed to update preparation notes:", err);
      setError("Failed to update preparation notes. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if event has ended
  const hasEventEnded = (event: NetworkingEvent): boolean => {
    if (!event.endDate) return false; // If no end date, event hasn't ended
    
    const now = new Date();
    const endDate = new Date(event.endDate);
    
    // If end date is in the past, event has ended
    if (endDate < new Date(now.toDateString())) {
      return true;
    }
    
    // If end date is today, check end time
    if (endDate.toDateString() === now.toDateString() && event.endTime) {
      const [hours, minutes] = event.endTime.split(':').map(Number);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(hours, minutes, 0, 0);
      return now >= endDateTime;
    }
    
    return false;
  };

  const handleImportEvent = async (discoveredEvent: DiscoveredEvent) => {
    try {
      setIsSubmitting(true);
      setError(null);
      // Register for the event instead of creating a new one
      const response = await api.registerForEvent(discoveredEvent.id);
      if (response.ok) {
        await fetchEvents();
        // Refresh discovered events to update signup count and registration status
        const searchResponse = await api.discoverNetworkingEvents({
          location: searchFilters.location?.trim() || undefined,
          industry: searchFilters.industry?.trim() || undefined,
          query: searchFilters.query?.trim() || undefined,
          limit: 50,
        });
        if (searchResponse.ok) {
          setDiscoveredEvents(searchResponse.data?.events || []);
        }
        setActiveTab("my-events");
      } else {
        setError(response.error?.message || "Failed to register for event");
      }
    } catch (err: any) {
      console.error("Failed to register for event:", err);
      setError("Failed to register for event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateEvent = async (eventData: NetworkingEventInput) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.createNetworkingEvent(eventData);
      if (response.ok) {
        await fetchEvents();
        // Refresh discovered events if we're on the discover tab
        if (activeTab === "discover") {
          const searchResponse = await api.discoverNetworkingEvents({
            location: searchFilters.location?.trim() || undefined,
            industry: searchFilters.industry?.trim() || undefined,
            query: searchFilters.query?.trim() || undefined,
            limit: 20,
          });
          if (searchResponse.ok) {
            setDiscoveredEvents(searchResponse.data?.events || []);
          }
        }
        setIsEditModalOpen(false);
        setSelectedEvent(null);
      } else {
        setError(response.error?.message || "Failed to create event");
      }
    } catch (err: any) {
      console.error("Failed to create event:", err);
      setError("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Networking Events</h1>
          <p className="text-slate-600">Track networking events and opportunities</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-slate-200 p-1 mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab("my-events")}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "my-events"
                ? "bg-[#3351FD] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            My Events
          </button>
          <button
            onClick={() => setActiveTab("discover")}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "discover"
                ? "bg-[#3351FD] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Discover Events
          </button>
        </div>

        {activeTab === "my-events" && (
          <>
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900">My Events</h2>
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setIsEditModalOpen(true);
                }}
                className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors flex items-center gap-2"
              >
                <Icon icon="mingcute:add-line" width={20} height={20} />
                Create Event
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
                <p className="mt-4 text-slate-600">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <Icon icon="mingcute:calendar-line" width={64} height={64} className="mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No events found</h3>
                <p className="text-slate-600 mb-4">Create a new event or discover events from other users.</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setSelectedEvent(null);
                      setIsEditModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors flex items-center gap-2"
                  >
                    <Icon icon="mingcute:add-line" width={20} height={20} />
                    Create Event
                  </button>
                  <button
                    onClick={() => setActiveTab("discover")}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2"
                  >
                    <Icon icon="mingcute:search-line" width={20} height={20} />
                    Discover Events
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-3">{event.eventName}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          {event.eventDate && (
                            <div>
                              <span className="font-medium text-slate-700">Date:</span>
                              <p className="text-slate-600">{new Date(event.eventDate).toLocaleDateString()}</p>
                            </div>
                          )}
                          {event.eventTime && (
                            <div>
                              <span className="font-medium text-slate-700">Time:</span>
                              <p className="text-slate-600">{event.eventTime}</p>
                            </div>
                          )}
                          {event.location && (
                            <div>
                              <span className="font-medium text-slate-700">Location:</span>
                              <p className="text-slate-600">{event.location}</p>
                            </div>
                          )}
                          {event.industry && (
                            <div>
                              <span className="font-medium text-slate-700">Industry:</span>
                              <p className="text-slate-600">{event.industry}</p>
                            </div>
                          )}
                        </div>
                        {event.signupCount !== undefined && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                            <Icon icon="mingcute:user-line" width={16} height={16} />
                            <span className="font-medium">{event.signupCount}</span>
                            <span>people signed up</span>
                          </div>
                        )}
                        {event.description && (
                          <p className="mt-3 text-sm text-slate-600 line-clamp-2">{event.description}</p>
                        )}
                        {event.attended && (
                          <p className="mt-2 text-sm text-green-600 font-medium">✓ Will be attending</p>
                        )}
                        
                        {/* Tabs */}
                        <div className="mt-4 border-t border-slate-200 pt-4">
                          <div className="flex gap-2 mb-4">
                            {currentUserId && event.userId === currentUserId && (
                              <button
                                onClick={() => handleToggleEventTabs(event.id, "planning")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  expandedEventId === event.id && eventTab[event.id] === "planning"
                                    ? "bg-[#3351FD] text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                Planning
                              </button>
                            )}
                            {hasEventEnded(event) && (
                              <>
                                <button
                                  onClick={() => handleToggleEventTabs(event.id, "debrief")}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    expandedEventId === event.id && eventTab[event.id] === "debrief"
                                      ? "bg-[#3351FD] text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  Debrief
                                </button>
                                <button
                                  onClick={() => handleToggleEventTabs(event.id, "outcomes")}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    expandedEventId === event.id && eventTab[event.id] === "outcomes"
                                      ? "bg-[#3351FD] text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  Outcomes
                                </button>
                              </>
                            )}
                          </div>
                          
                          {/* Tab Content */}
                          {expandedEventId === event.id && (
                            <div className="mt-4">
                              {eventTab[event.id] === "planning" && currentUserId && event.userId === currentUserId && (
                                <PlanningTab
                                  event={event}
                                  onUpdateNotes={handleUpdatePreparationNotes}
                                  isSubmitting={isSubmitting}
                                />
                              )}
                              {eventTab[event.id] === "debrief" && (
                                <DebriefTab
                                  event={event}
                                  connections={eventConnections[event.id] || []}
                                  isLoading={isLoadingConnections[event.id] || false}
                                />
                              )}
                              {eventTab[event.id] === "outcomes" && (
                                <OutcomesTab
                                  event={event}
                                  connections={eventConnections[event.id] || []}
                                  jobOpportunities={jobOutcomes || []}
                                  isLoadingConnections={isLoadingConnections[event.id] || false}
                                  isLoadingJobs={isLoadingJobOutcomes}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-4">
                        {currentUserId && event.userId === currentUserId && (
                          <button
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-slate-600 hover:text-[#3351FD] hover:bg-slate-50 rounded"
                            title="Edit event"
                          >
                            <Icon icon="mingcute:edit-line" width={18} height={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleViewAttendees(event.id)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View attendees"
                        >
                          <Icon icon="mingcute:user-3-line" width={18} height={18} />
                        </button>
                        <button
                          onClick={() => handleViewGoals(event.id)}
                          className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                          title="Event goals"
                        >
                          <Icon icon="mingcute:target-line" width={18} height={18} />
                        </button>
                        <button
                          onClick={() => handleUnregister(event.id)}
                          className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded"
                          title="Remove from My Events"
                        >
                          <Icon icon="mingcute:user-remove-line" width={18} height={18} />
                        </button>
                        {currentUserId && event.userId === currentUserId && (
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Cancel event"
                          >
                            <Icon icon="mingcute:delete-line" width={18} height={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "discover" && (
          <EventDiscoveryPanel
            searchFilters={searchFilters}
            setSearchFilters={setSearchFilters}
            discoveredEvents={discoveredEvents}
            setDiscoveredEvents={setDiscoveredEvents}
            isDiscovering={isDiscovering}
            setIsDiscovering={setIsDiscovering}
            onImportEvent={handleImportEvent}
            isSubmitting={isSubmitting}
          />
        )}

        {isEditModalOpen && (
          <EventModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedEvent(null);
              setError(null);
            }}
            onSave={(data) => 
              selectedEvent 
                ? handleEditEvent(selectedEvent.id, data)
                : handleCreateEvent(data)
            }
            event={selectedEvent}
            isSubmitting={isSubmitting}
          />
        )}

        {isAttendeesModalOpen && selectedEvent && (
          <AttendeesModal
            isOpen={isAttendeesModalOpen}
            onClose={() => {
              setIsAttendeesModalOpen(false);
              setEventAttendees([]);
            }}
            event={selectedEvent}
            attendees={eventAttendees}
            isLoading={isLoadingAttendees}
            onAddAsContact={handleAddAttendeeAsContact}
            isSubmitting={isSubmitting}
          />
        )}

        {isGoalsModalOpen && selectedEvent && (
          <EventGoalsModal
            isOpen={isGoalsModalOpen}
            onClose={() => {
              setIsGoalsModalOpen(false);
              setEventGoals(null);
            }}
            event={selectedEvent}
            goals={eventGoals}
            liveConnectionCount={eventConnectionCounts[selectedEvent.id]}
            isLoading={isLoadingGoals}
            onSave={handleSaveGoals}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}

// Attendees Modal Component
function AttendeesModal({
  isOpen,
  onClose,
  event,
  attendees,
  isLoading,
  onAddAsContact,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  event: NetworkingEvent;
  attendees: EventAttendee[];
  isLoading: boolean;
  onAddAsContact: (attendee: EventAttendee) => void;
  isSubmitting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Event Attendees</h2>
          <p className="text-sm text-slate-600 mt-1">{event.eventName}</p>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
              <p className="mt-4 text-slate-600">Loading attendees...</p>
            </div>
          ) : attendees.length === 0 ? (
            <div className="text-center py-12">
              <Icon icon="mingcute:user-line" width={64} height={64} className="mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600">No attendees registered yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendees.map((attendee) => (
                <div
                  key={attendee.registrationId}
                  className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">
                        {attendee.fullName || "Unknown"}
                      </h3>
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        {attendee.jobTitle && (
                          <p><span className="font-medium">Job Title:</span> {attendee.jobTitle}</p>
                        )}
                        {attendee.industry && (
                          <p><span className="font-medium">Industry:</span> {attendee.industry}</p>
                        )}
                        {attendee.location && (
                          <p><span className="font-medium">Location:</span> {attendee.location}</p>
                        )}
                        {attendee.email && (
                          <p><span className="font-medium">Email:</span> {attendee.email}</p>
                        )}
                      </div>
                    </div>
                    {attendee.isContact ? (
                      <div className="ml-4 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
                        <Icon icon="mingcute:check-circle-line" width={16} height={16} />
                        Contact Added
                      </div>
                    ) : (
                      <button
                        onClick={() => onAddAsContact(attendee)}
                        disabled={isSubmitting}
                        className="ml-4 px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                      >
                        <Icon icon="mingcute:user-add-line" width={16} height={16} />
                        Add as Contact
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Event Goals Modal Component
function EventGoalsModal({
  isOpen,
  onClose,
  event,
  goals,
  liveConnectionCount,
  isLoading,
  onSave,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  event: NetworkingEvent;
  goals: EventGoals | null;
  liveConnectionCount?: number;
  isLoading: boolean;
  onSave: (data: EventGoalsInput) => void;
  isSubmitting: boolean;
}) {
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Normalize any stored date string into YYYY-MM-DD for the date input
  const normalizeDateForInput = (dateStr?: string) => {
    if (!dateStr) return "";

    // If it's already in YYYY-MM-DD format, use it as-is
    if (typeof dateStr === "string" && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }

    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      return "";
    }

    return parsed.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState<EventGoalsInput>({
    goalDescription: goals?.goalDescription || "",
    // targetIndustry is now derived from the event, not edited in the form
    targetIndustry: goals?.targetIndustry || event.industry || "",
    targetCompanies: goals?.targetCompanies || [],
    targetRoles: goals?.targetRoles || [],
    goalType: goals?.goalType || "",
    targetCount: goals?.targetCount || 0,
    currentCount: typeof liveConnectionCount === "number"
      ? liveConnectionCount
      : (goals?.currentCount || 0),
    deadline: normalizeDateForInput(goals?.deadline) || getTodayDate(),
    status: goals?.status || "active",
  });

  useEffect(() => {
    const getTodayDate = () => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    };

    if (goals) {
      setFormData({
        goalDescription: goals.goalDescription || "",
        // Keep targetIndustry in state for completeness, but it's derived from the event
        targetIndustry: goals.targetIndustry || event.industry || "",
        targetCompanies: goals.targetCompanies || [],
        targetRoles: goals.targetRoles || [],
        goalType: goals.goalType || "",
        targetCount: goals.targetCount || 0,
        currentCount: typeof liveConnectionCount === "number"
          ? liveConnectionCount
          : (goals.currentCount || 0),
        deadline: normalizeDateForInput(goals.deadline) || getTodayDate(),
        status: goals.status || "active",
      });
    } else {
      setFormData({
        goalDescription: "",
        // Default to the event's industry when no goals exist yet
        targetIndustry: event.industry || "",
        targetCompanies: [],
        targetRoles: [],
        goalType: "",
        targetCount: 0,
        currentCount: typeof liveConnectionCount === "number"
          ? liveConnectionCount
          : 0,
        deadline: getTodayDate(),
        status: "active",
      });
    }
  }, [goals, isOpen, liveConnectionCount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleFieldChange = (field: keyof EventGoalsInput, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Event Goals</h2>
          <p className="text-sm text-slate-600 mt-1">{event.eventName}</p>
        </div>
        <div className="p-6 space-y-6">
          {/* Existing goal summary (read-only) */}
          {goals && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Current Saved Goal
                </h3>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                  {goals.status ? goals.status.charAt(0).toUpperCase() + goals.status.slice(1) : "Active"}
                </span>
              </div>
              {goals.goalDescription && (
                <p className="text-sm text-slate-700 mb-3">
                  {goals.goalDescription}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-slate-500">Targeted Connections</span>
                  <span className="font-semibold text-slate-900">
                    {goals.targetCount ?? 0}
                  </span>
                </div>
                {goals.deadline && (
                  <div>
                    <span className="block text-slate-500">Deadline</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(goals.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {goals.targetIndustry && (
                  <div>
                    <span className="block text-slate-500">Target Industry</span>
                    <span className="font-semibold text-slate-900">
                      {goals.targetIndustry}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form to add/update the single goal for this event */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Goal Description</label>
              <textarea
                value={formData.goalDescription}
                onChange={(e) => handleFieldChange("goalDescription", e.target.value)}
                rows={3}
                placeholder="What do you want to achieve at this event?"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Targeted Connections from Event</label>
                <input
                  type="number"
                  min="0"
                  value={formData.targetCount}
                  onChange={(e) => handleFieldChange("targetCount", parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Connections from Event</label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg">
                  <span className="text-slate-900 font-medium">{formData.currentCount || 0}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Progress</label>
                <div className="px-3 py-2 bg-slate-50 rounded-lg">
                  <div className="text-sm font-medium text-slate-900">
                    {formData.targetCount > 0
                      ? Math.round((formData.currentCount / formData.targetCount) * 100)
                      : 0}%
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-[#3351FD] h-2 rounded-full transition-all"
                      style={{
                        width: `${formData.targetCount > 0 ? Math.min((formData.currentCount / formData.targetCount) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleFieldChange("deadline", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : goals ? "Update Goal" : "Save Goal"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EventModal({
  isOpen,
  onClose,
  onSave,
  event,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NetworkingEventInput) => void;
  event?: NetworkingEvent | null;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<NetworkingEventInput>({
    eventName: event?.eventName || "",
    eventDate: event?.eventDate || "",
    location: event?.location || "",
    industry: event?.industry || "",
    description: event?.description || "",
    attended: event?.attended || false,
    eventUrl: event?.eventUrl || "",
    eventTime: event?.eventTime || "",
    endDate: event?.endDate || "",
    endTime: event?.endTime || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when event changes (for editing) or when modal opens
  useEffect(() => {
    if (isOpen) {
      if (event) {
        // Format date for input (YYYY-MM-DD)
        let dateValue = "";
        if (event.eventDate) {
          // Handle both string dates (YYYY-MM-DD) and Date objects
          if (typeof event.eventDate === 'string' && event.eventDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateValue = event.eventDate;
          } else {
            try {
              const date = new Date(event.eventDate);
              if (!isNaN(date.getTime())) {
                dateValue = date.toISOString().split('T')[0];
              }
            } catch (e) {
              console.warn("Could not parse date:", event.eventDate);
            }
          }
        }
        // Format time for input (HH:MM) - ensure it's in HH:MM format
        let timeValue = "";
        if (event.eventTime) {
          // If time is already in HH:MM format, use it; otherwise try to parse
          if (typeof event.eventTime === 'string' && event.eventTime.match(/^\d{2}:\d{2}$/)) {
            timeValue = event.eventTime;
          } else if (typeof event.eventTime === 'string' && event.eventTime.includes(':')) {
            // Try to extract HH:MM from longer time strings
            const timeMatch = event.eventTime.match(/(\d{2}):(\d{2})/);
            if (timeMatch) {
              timeValue = `${timeMatch[1]}:${timeMatch[2]}`;
            }
          }
        }
        
        // Format end date
        let endDateValue = "";
        if (event.endDate) {
          if (typeof event.endDate === 'string' && event.endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            endDateValue = event.endDate;
          } else {
            try {
              const endDate = new Date(event.endDate);
              if (!isNaN(endDate.getTime())) {
                endDateValue = endDate.toISOString().split('T')[0];
              }
            } catch (e) {
              console.warn("Could not parse end date:", event.endDate);
            }
          }
        }
        // Format end time
        let endTimeValue = "";
        if (event.endTime) {
          if (typeof event.endTime === 'string' && event.endTime.match(/^\d{2}:\d{2}$/)) {
            endTimeValue = event.endTime;
          } else if (typeof event.endTime === 'string' && event.endTime.includes(':')) {
            const endTimeMatch = event.endTime.match(/(\d{2}):(\d{2})/);
            if (endTimeMatch) {
              endTimeValue = `${endTimeMatch[1]}:${endTimeMatch[2]}`;
            }
          }
        }
        
        setFormData({
          eventName: event.eventName || "",
          eventDate: dateValue,
          location: event.location || "",
          industry: event.industry || "",
          description: event.description || "",
          attended: event.attended || false,
          eventUrl: event.eventUrl || "",
          eventTime: timeValue,
          endDate: endDateValue,
          endTime: endTimeValue,
        });
      } else {
        // Reset form for new event
        setFormData({
          eventName: "",
          eventDate: "",
          location: "",
          industry: "",
          description: "",
          attended: false,
          eventUrl: "",
          eventTime: "",
          endDate: "",
          endTime: "",
        });
      }
    }
  }, [event, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameError = validateRequired(formData.eventName, "Event name");
    if (nameError) newErrors.eventName = nameError;

    const dateError = validateRequired(formData.eventDate, "Event date");
    if (dateError) {
      newErrors.eventDate = dateError;
    } else {
      const dateValidationError = validateDate(formData.eventDate);
      if (dateValidationError) newErrors.eventDate = dateValidationError;
    }

    const timeError = validateTime(formData.eventTime || "");
    if (timeError) newErrors.eventTime = timeError;

    const urlError = validateUrl(formData.eventUrl || "");
    if (urlError) newErrors.eventUrl = urlError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleFieldChange = (field: keyof NetworkingEventInput, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors({ ...errors, [field as string]: "" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {event ? "Edit Event" : "Create Event"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Name *</label>
            <input
              type="text"
              required
              value={formData.eventName}
              onChange={(e) => handleFieldChange("eventName", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                errors.eventName ? "border-red-300" : "border-slate-300"
              }`}
            />
            {errors.eventName && (
              <p className="mt-1 text-sm text-red-600">{errors.eventName}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.eventDate}
                onChange={(e) => handleFieldChange("eventDate", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                  errors.eventDate ? "border-red-300" : "border-slate-300"
                }`}
              />
              {errors.eventDate && (
                <p className="mt-1 text-sm text-red-600">{errors.eventDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
              <div className="flex gap-2">
                <select
                  value={formData.eventTime || ""}
                  onChange={(e) => handleFieldChange("eventTime", e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                    errors.eventTime ? "border-red-300" : "border-slate-300"
                  }`}
                >
                  <option value="">Select Time</option>
                  {Array.from({ length: 48 }, (_, i) => {
                    const hour = Math.floor(i / 2);
                    const minute = i % 2 === 0 ? "00" : "30";
                    const time24 = `${hour.toString().padStart(2, "0")}:${minute}`;
                    const time12 = new Date(`2000-01-01T${time24}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                    return (
                      <option key={time24} value={time24}>
                        {time12}
                      </option>
                    );
                  })}
                </select>
                {formData.eventTime && (
                  <button
                    type="button"
                    onClick={() => handleFieldChange("eventTime", "")}
                    className="px-3 py-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50"
                    title="Clear time"
                  >
                    <Icon icon="mingcute:close-line" width={16} height={16} />
                  </button>
                )}
              </div>
              {errors.eventTime && (
                <p className="mt-1 text-sm text-red-600">{errors.eventTime}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate || ""}
                onChange={(e) => handleFieldChange("endDate", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
              <div className="flex gap-2">
                <select
                  value={formData.endTime || ""}
                  onChange={(e) => handleFieldChange("endTime", e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
                >
                  <option value="">Select Time</option>
                  {Array.from({ length: 48 }, (_, i) => {
                    const hour = Math.floor(i / 2);
                    const minute = i % 2 === 0 ? "00" : "30";
                    const time24 = `${hour.toString().padStart(2, "0")}:${minute}`;
                    const time12 = new Date(`2000-01-01T${time24}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                    return (
                      <option key={time24} value={time24}>
                        {time12}
                      </option>
                    );
                  })}
                </select>
                {formData.endTime && (
                  <button
                    type="button"
                    onClick={() => handleFieldChange("endTime", "")}
                    className="px-3 py-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50"
                    title="Clear time"
                  >
                    <Icon icon="mingcute:close-line" width={16} height={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleFieldChange("location", e.target.value)}
                placeholder="City, State or Address"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
              <select
                value={formData.industry || ""}
                onChange={(e) => handleFieldChange("industry", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              >
                <option value="">Select Industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event URL</label>
            <input
              type="url"
              value={formData.eventUrl}
              onChange={(e) => handleFieldChange("eventUrl", e.target.value)}
              placeholder="https://..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                errors.eventUrl ? "border-red-300" : "border-slate-300"
              }`}
            />
            {errors.eventUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.eventUrl}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Event description, agenda, or additional details..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] disabled:opacity-50"
            >
              {isSubmitting ? (event ? "Updating..." : "Creating...") : (event ? "Update" : "Create")} Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Event Discovery Panel Component
function EventDiscoveryPanel({
  searchFilters,
  setSearchFilters,
  discoveredEvents,
  setDiscoveredEvents,
  isDiscovering,
  setIsDiscovering,
  onImportEvent,
  isSubmitting,
}: {
  searchFilters: { location: string; industry: string; query: string };
  setSearchFilters: (filters: { location: string; industry: string; query: string }) => void;
  discoveredEvents: DiscoveredEvent[];
  setDiscoveredEvents: (events: DiscoveredEvent[]) => void;
  isDiscovering: boolean;
  setIsDiscovering: (value: boolean) => void;
  onImportEvent: (event: DiscoveredEvent) => void;
  isSubmitting: boolean;
}) {
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Check if discovered event has ended
  const hasDiscoveredEventEnded = (event: DiscoveredEvent): boolean => {
    if (!event.endDate) {
      // If no end date, check if start date is in the past (for events without end date)
      if (event.startDate) {
        const startDate = new Date(event.startDate);
        const now = new Date();
        // If start date is more than 1 day in the past, consider it ended
        return startDate < new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      return false;
    }
    
    const now = new Date();
    const endDate = new Date(event.endDate);
    
    // If end date is in the past, event has ended
    if (endDate < new Date(now.toDateString())) {
      return true;
    }
    
    // If end date is today, check if we're past the end time (if available)
    if (endDate.toDateString() === now.toDateString()) {
      if (event.endTime) {
        const [hours, minutes] = event.endTime.split(':').map(Number);
        const endDateTime = new Date(endDate);
        endDateTime.setHours(hours, minutes, 0, 0);
        return now >= endDateTime;
      } else {
        // If no end time but end date is today, check if it's past midnight (end of day)
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        return now >= endOfDay;
      }
    }
    
    return false;
  };

  const handleSearch = async () => {
    try {
      setIsDiscovering(true);
      setDiscoveryError(null);
      console.log("🔍 Starting search with filters:", searchFilters);
      
      const response = await api.discoverNetworkingEvents({
        location: searchFilters.location?.trim() || undefined,
        industry: searchFilters.industry?.trim() || undefined,
        query: searchFilters.query?.trim() || undefined,
        limit: 20,
      });

      console.log("🔍 Search response:", response);

      if (response.ok) {
        const events = response.data?.events || [];
        console.log("🔍 Found events:", events.length);
        setDiscoveredEvents(events);
        setDiscoveryError(null);
        if (events.length === 0) {
          setDiscoveryError("No events found matching your search criteria. Try adjusting your filters or create a new event.");
        }
      } else {
        const errorMsg = response.error?.message || "Unable to search for events at this time. Please try again later.";
        console.error("🔍 Search error:", errorMsg);
        setDiscoveryError(errorMsg);
        setDiscoveredEvents([]);
      }
    } catch (err: any) {
      console.error("🔍 Failed to discover events:", err);
      setDiscoveryError(err.message || "Failed to discover events. Please try again.");
      setDiscoveredEvents([]);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleFormSubmit} className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Discover Networking Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <input
              type="text"
              value={searchFilters.location}
              onChange={(e) => setSearchFilters({ ...searchFilters, location: e.target.value })}
              placeholder="City, State or City, Country"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
            <select
              value={searchFilters.industry}
              onChange={(e) => setSearchFilters({ ...searchFilters, industry: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
            >
              <option value="">All Industries</option>
              {INDUSTRIES.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Keywords</label>
            <input
              type="text"
              value={searchFilters.query}
              onChange={(e) => setSearchFilters({ ...searchFilters, query: e.target.value })}
              placeholder="Search terms"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
            />
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          disabled={isDiscovering}
          className="px-6 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isDiscovering ? (
            <>
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Searching...
            </>
          ) : (
            <>
              <Icon icon="mingcute:search-line" width={20} height={20} />
              Search Events
            </>
          )}
        </button>
      </form>

      {discoveryError && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
          <p className="font-medium">ℹ️ {discoveryError}</p>
        </div>
      )}

      {/* Discovered Events */}
      {discoveredEvents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Found {discoveredEvents.length} Event(s)
          </h3>
          {discoveredEvents.map((event) => (
            <div
              key={event.id}
              className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow ${
                event.cancelled ? "border-red-300 bg-red-50" : "border-slate-200"
              }`}
            >
              {event.cancelled && (
                <div className="mb-3 px-3 py-2 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 font-medium text-sm flex items-center gap-2">
                    <Icon icon="mingcute:close-circle-line" width={16} height={16} />
                    Cancelled
                  </p>
                </div>
              )}
              <div className="flex items-start gap-4">
                {event.imageUrl && (
                  <img
                    src={event.imageUrl}
                    alt={event.name}
                    className="w-24 h-24 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-slate-900 mb-2">{event.name}</h4>
                  {event.createdAt && (
                    <p className="text-xs text-slate-500 mb-2">
                      Created: {new Date(event.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                      {event.description.substring(0, 200)}...
                    </p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    {event.startDate && (
                      <div>
                        <span className="font-medium text-slate-700">Date:</span>
                        <p className="text-slate-600">{new Date(event.startDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {event.startTime && (
                      <div>
                        <span className="font-medium text-slate-700">Time:</span>
                        <p className="text-slate-600">{event.startTime}</p>
                      </div>
                    )}
                    {event.location && (
                      <div>
                        <span className="font-medium text-slate-700">Location:</span>
                        <p className="text-slate-600 truncate">{event.location}</p>
                      </div>
                    )}
                    {event.category && (
                      <div>
                        <span className="font-medium text-slate-700">Industry:</span>
                        <p className="text-slate-600">{event.category}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm mb-3">
                    {event.signupCount !== undefined && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Icon icon="mingcute:user-line" width={16} height={16} />
                        <span className="font-medium">{event.signupCount}</span>
                        <span>people signed up</span>
                      </div>
                    )}
                    {event.isVirtual && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <Icon icon="mingcute:video-line" width={16} height={16} />
                        <span>Virtual Event</span>
                      </div>
                    )}
                    {event.creatorEmail && (
                      <div className="text-slate-500 text-xs">
                        Created by: {event.creatorEmail}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {event.url && (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#3351FD] hover:underline flex items-center gap-1"
                      >
                        <Icon icon="mingcute:external-link-line" width={16} height={16} />
                        View Event
                      </a>
                    )}
                    {event.isRegistered ? (
                      <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
                        <Icon icon="mingcute:check-circle-line" width={16} height={16} />
                        Event Added
                      </div>
                    ) : hasDiscoveredEventEnded(event) ? (
                      <div className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium flex items-center gap-2">
                        <Icon icon="mingcute:time-line" width={16} height={16} />
                        Event Ended
                      </div>
                    ) : (
                      <button
                        onClick={() => onImportEvent(event)}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                      >
                        <Icon icon="mingcute:add-line" width={16} height={16} />
                        Add to My Events
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isDiscovering && discoveredEvents.length === 0 && !discoveryError && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Icon icon="mingcute:search-line" width={64} height={64} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Discover Networking Events</h3>
          <p className="text-slate-600 mb-4">
            Search for networking events by location, industry, or keywords
          </p>
        </div>
      )}
    </div>
  );
}

// Planning Tab Component (only for event creator)
function PlanningTab({
  event,
  onUpdateNotes,
  isSubmitting,
}: {
  event: NetworkingEvent;
  onUpdateNotes: (eventId: string, notes: string) => void;
  isSubmitting: boolean;
}) {
  const [preparationNotes, setPreparationNotes] = useState(event.preparationNotes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateNotes(event.id, preparationNotes);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-semibold text-slate-900 mb-2">Pre-Event Preparation & Research</h4>
        <p className="text-sm text-slate-600 mb-4">
          Plan your approach, research attendees, and prepare talking points for this networking event.
        </p>
        <textarea
          value={preparationNotes}
          onChange={(e) => setPreparationNotes(e.target.value)}
          placeholder="Add your preparation notes, research findings, talking points, and goals for this event..."
          rows={8}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || isSubmitting}
            className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors disabled:opacity-50 text-sm"
          >
            {isSaving ? "Saving..." : "Save Notes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Debrief Tab Component (for all users)
function DebriefTab({
  event,
  connections,
  isLoading,
}: {
  event: NetworkingEvent;
  connections: EventConnection[];
  isLoading: boolean;
}) {
  const followUpActions = [
    "Send personalized LinkedIn connection requests within 24-48 hours",
    "Follow up with a brief email referencing your conversation",
    "Share relevant articles or resources you discussed",
    "Schedule a follow-up coffee chat or virtual meeting",
    "Add contacts to your CRM or contact management system",
    "Set reminders for future check-ins (30, 60, 90 days)",
    "Connect contacts with others in your network when appropriate",
    "Thank event organizers and key speakers",
    "Update your notes with key conversation points",
    "Review and reflect on what you learned from the event"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-slate-900 mb-2">Event Debrief</h4>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-blue-900">
            New Connections Made: <span className="text-lg">{connections.length}</span>
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
          <p className="mt-4 text-slate-600">Loading connections...</p>
        </div>
      ) : connections.length > 0 ? (
        <div>
          <h5 className="text-md font-semibold text-slate-900 mb-3">Connections Made</h5>
          <div className="space-y-3">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="border border-slate-200 rounded-lg p-4 bg-slate-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h6 className="font-semibold text-slate-900">
                      {connection.contactName || "Unknown"}
                    </h6>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      {connection.contactJobTitle && (
                        <p><span className="font-medium">Title:</span> {connection.contactJobTitle}</p>
                      )}
                      {connection.contactIndustry && (
                        <p><span className="font-medium">Industry:</span> {connection.contactIndustry}</p>
                      )}
                      {connection.contactCompany && (
                        <p><span className="font-medium">Company:</span> {connection.contactCompany}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
          <Icon icon="mingcute:user-line" width={48} height={48} className="mx-auto text-slate-400 mb-2" />
          <p className="text-slate-600">No connections made yet from this event.</p>
          <p className="text-sm text-slate-500 mt-1">Add contacts through the Attendees tab to see them here.</p>
        </div>
      )}

      <div className="mt-6">
        <h5 className="text-md font-semibold text-slate-900 mb-3">Follow-Up Actions</h5>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <ul className="space-y-2 text-sm text-slate-700">
            {followUpActions.map((action, index) => (
              <li key={index} className="flex items-start gap-2">
                <Icon icon="mingcute:check-circle-line" width={18} height={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Outcomes Tab Component: links networking connections to job search outcomes
function OutcomesTab({
  event,
  connections,
  jobOpportunities,
  isLoadingConnections,
  isLoadingJobs,
}: {
  event: NetworkingEvent;
  connections: EventConnection[];
  jobOpportunities: JobOpportunityData[];
  isLoadingConnections: boolean;
  isLoadingJobs: boolean;
}) {
  // Build a normalized set of companies from event connections
  const connectedCompanies = Array.from(
    new Set(
      connections
        .map((c) => (c.contactCompany || "").trim())
        .filter((name) => name.length > 0)
        .map((name) => name.toLowerCase())
    )
  );

  // Filter job opportunities where the company matches one of the connected companies
  const linkedJobs = jobOpportunities.filter((job) =>
    job.company &&
    connectedCompanies.includes(job.company.trim().toLowerCase())
  );

  // Count outcomes by status for these linked jobs
  const statusCounts: Partial<Record<JobStatus, number>> = {};
  linkedJobs.forEach((job) => {
    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
  });

  const totalLinked = linkedJobs.length;
  const applied = (statusCounts["Applied"] || 0) + (statusCounts["Phone Screen"] || 0) + (statusCounts["Interview"] || 0) + (statusCounts["Offer"] || 0);
  const interviews = (statusCounts["Phone Screen"] || 0) + (statusCounts["Interview"] || 0);
  const offers = statusCounts["Offer"] || 0;

  const isLoading = isLoadingConnections || isLoadingJobs;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-slate-900 mb-2">Job Search Outcomes</h4>
        <p className="text-sm text-slate-600 mb-3">
          See how your connections from <span className="font-medium">{event.eventName}</span> relate to your job search.
        </p>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
            <p className="mt-4 text-slate-600">Loading outcomes...</p>
          </div>
        ) : totalLinked === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
            <Icon icon="mingcute:briefcase-line" width={40} height={40} className="mx-auto text-slate-400 mb-2" />
            <p className="text-slate-600">
              No job opportunities found yet at companies you connected with from this event.
            </p>
            <p className="text-sm text-slate-500 mt-1">
              As you add applications in the Jobs tab, any that match these companies will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Linked Companies
                </div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {connectedCompanies.length}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Applications
                </div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {applied}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Interviews
                </div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {interviews}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Offers
                </div>
                <div className="mt-1 text-2xl font-semibold text-slate-900 text-green-600">
                  {offers}
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-md font-semibold text-slate-900 mb-3">
                Jobs at Companies You Met Here
              </h5>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 bg-white">
                {linkedJobs.map((job) => (
                  <div key={job.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {job.title}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {job.company} • {job.location}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: STATUS_BG_COLORS[job.status],
                          color: STATUS_COLORS[job.status],
                        }}
                      >
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

