import { useState, useEffect, FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import {
  ProfessionalContact,
  ContactInput,
  GoogleContactsStatus,
  GoogleContactsImportSummary,
  DiscoveredContact,
  ContactNetworkItem,
  ContactInteraction,
} from "../types/network.types";
import { validateEmail, validatePhone, validateUrl } from "../utils/validation";
import { INDUSTRIES } from "../types/jobOpportunity.types";
import type { JobOpportunityData } from "../types";

export function NetworkContacts() {
  const location = useLocation();
  const [contacts, setContacts] = useState<ProfessionalContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ProfessionalContact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [linkedInContacts, setLinkedInContacts] = useState<any[]>([]);
  const [isLoadingLinkedIn, setIsLoadingLinkedIn] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleContactsStatus | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<GoogleContactsImportSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"my" | "explore">("my");
  const [exploreContacts, setExploreContacts] = useState<DiscoveredContact[]>([]);
  const [isExploreLoading, setIsExploreLoading] = useState(false);
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [exploreSearch, setExploreSearch] = useState("");
  const [degreeFilter, setDegreeFilter] = useState<"all" | "2nd" | "3rd">("all");
  const [hasLoadedExplore, setHasLoadedExplore] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [contactNetwork, setContactNetwork] = useState<ContactNetworkItem[]>([]);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(false);
  const [isInteractionsModalOpen, setIsInteractionsModalOpen] = useState(false);
  const [contactInteractions, setContactInteractions] = useState<ContactInteraction[]>([]);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [addingContactIds, setAddingContactIds] = useState<Set<string>>(new Set());
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [peopleWhoHaveYou, setPeopleWhoHaveYou] = useState<DiscoveredContact[]>([]);
  const [isLoadingWhoHaveYou, setIsLoadingWhoHaveYou] = useState(false);
  const [peopleInYourIndustry, setPeopleInYourIndustry] = useState<DiscoveredContact[]>([]);
  const [isLoadingIndustry, setIsLoadingIndustry] = useState(false);
  const [suggestedContacts, setSuggestedContacts] = useState<DiscoveredContact[]>([]);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);

  useEffect(() => {
    fetchContacts();
    fetchGoogleContactsStatus();
    // Fetch current user email for validation
    const fetchUserEmail = async () => {
      try {
        const response = await api.getUserAuth();
        if (response.ok && response.data?.user) {
          setCurrentUserEmail(response.data.user.email);
        }
      } catch (err) {
        console.error("Failed to fetch user email:", err);
      }
    };
    fetchUserEmail();
  }, []);

  // Fetch LinkedIn contacts when company filter is set
  useEffect(() => {
    if (companyFilter && companyFilter.trim()) {
      fetchLinkedInContactsByCompany(companyFilter.trim());
    } else {
      setLinkedInContacts([]);
    }
  }, [companyFilter]);

  const fetchLinkedInContactsByCompany = async (company: string) => {
    try {
      setIsLoadingLinkedIn(true);
      const response = await api.getLinkedInNetwork({ company, limit: 100 });
      if (response.ok && response.data?.contacts) {
        setLinkedInContacts(response.data.contacts);
      }
    } catch (err: any) {
      console.error("Failed to fetch LinkedIn contacts:", err);
    } finally {
      setIsLoadingLinkedIn(false);
    }
  };

  // Helper function to check if a contact is already in the user's contacts list
  const isContactAlreadyAdded = (contact: DiscoveredContact): boolean => {
    if (!contact.email) return false;
    const contactEmailLower = contact.email.toLowerCase();
    return contacts.some(
      (c) => c.email && c.email.toLowerCase() === contactEmailLower
    );
  };

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      setError(null); // Always clear error at the start
      const filters: {
        search?: string;
        industry?: string;
        company?: string;
      } = {};
      if (searchTerm) filters.search = searchTerm;
      if (industryFilter) filters.industry = industryFilter;
      if (companyFilter) filters.company = companyFilter;
      const response = await api.getContacts(filters);
      if (response.ok && response.data) {
        setContacts(response.data.contacts);
        setError(null); // Ensure error is cleared on success
      } else {
        // If response is not ok, check if we have existing contacts
        // If we do, client-side filtering will work, so don't show error
        // Only show error if we have no contacts at all
        const hasExistingContacts = contacts.length > 0;
        if (!hasExistingContacts) {
          setError(response.error?.message || "Failed to load contacts. Please try again.");
        } else {
          // We have contacts, so client-side filtering will work - don't show error
          setError(null);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch contacts:", err);
      // Only set error if we don't have any contacts to show
      // Otherwise, client-side filtering will still work
      const hasExistingContacts = contacts.length > 0;
      if (!hasExistingContacts) {
        setError("Failed to load contacts. Please try again.");
      } else {
        // If we have contacts, client-side filtering will still work - don't show error
        setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoogleContactsStatus = async () => {
    try {
      const response = await api.getGoogleContactsStatus();
      if (response.ok && response.data) {
        setGoogleStatus(response.data.status);
      }
    } catch (err) {
      console.error("Failed to fetch Google Contacts status:", err);
    }
  };

  const fetchExploreContacts = async () => {
    try {
      setIsExploreLoading(true);
      setExploreError(null);
      const response = await api.getExploreNetworkContacts({
        degree: degreeFilter === "all" ? undefined : degreeFilter,
        search: exploreSearch.trim() || undefined,
      });
      if (response.ok && response.data) {
        setExploreContacts(response.data.suggestions);
        setExploreError(null);
      } else {
        setExploreError(response.error?.message || "Failed to load network suggestions.");
      }
    } catch (err: any) {
      console.error("Failed to load network suggestions:", err);
      setExploreError("Failed to load network suggestions. Please try again.");
    } finally {
      setIsExploreLoading(false);
      setHasLoadedExplore(true);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [searchTerm, industryFilter]);

  const fetchPeopleWhoHaveYou = async () => {
    try {
      setIsLoadingWhoHaveYou(true);
      const response = await api.getPeopleWhoHaveYou({
        search: exploreSearch.trim() || undefined,
      });
      if (response.ok && response.data) {
        setPeopleWhoHaveYou(response.data.contacts);
      }
    } catch (err: any) {
      console.error("Failed to load people who have you:", err);
    } finally {
      setIsLoadingWhoHaveYou(false);
    }
  };

  const fetchPeopleInYourIndustry = async () => {
    try {
      setIsLoadingIndustry(true);
      const response = await api.getPeopleInYourIndustry({
        search: exploreSearch.trim() || undefined,
      });
      if (response.ok && response.data) {
        setPeopleInYourIndustry(response.data.contacts);
      }
    } catch (err: any) {
      console.error("Failed to load people in your industry:", err);
    } finally {
      setIsLoadingIndustry(false);
    }
  };

  const fetchSuggestedContacts = async () => {
    try {
      setIsLoadingSuggested(true);
      // Fetch job opportunities
      const jobsResponse = await api.getJobOpportunities({
        limit: 100,
        sort: "-created_at",
      });

      if (!jobsResponse.ok || !jobsResponse.data) {
        return;
      }

      const jobOpportunities = jobsResponse.data.jobOpportunities.filter(
        (job: JobOpportunityData) => !job.archived
      );

      if (jobOpportunities.length === 0) {
        setSuggestedContacts([]);
        return;
      }

      // Extract unique companies from job opportunities
      const companies = Array.from(
        new Set(
          jobOpportunities
            .map((job: JobOpportunityData) => job.company)
            .filter((company): company is string => !!company)
        )
      );

      // Get existing contact emails to avoid duplicates
      const existingContactEmails = new Set(
        contacts.map((c) => c.email?.toLowerCase()).filter((e): e is string => !!e)
      );

      // Fetch contacts for each company from explore network
      const allSuggestedContacts: DiscoveredContact[] = [];
      const seenContactIds = new Set<string>();

      for (const company of companies.slice(0, 10)) {
        // Limit to first 10 companies to avoid too many API calls
        try {
          const searchResponse = await api.getExploreNetworkContacts({
            search: company,
            degree: "all",
          });

          if (searchResponse.ok && searchResponse.data) {
            const matchingContacts = searchResponse.data.suggestions.filter(
              (contact: DiscoveredContact) => {
                // Filter contacts that:
                // 1. Work at the company (case-insensitive match)
                // 2. Are not already in contacts
                // 3. Haven't been added to suggestions yet
                const companyMatch =
                  contact.company?.toLowerCase().includes(company.toLowerCase()) ||
                  company.toLowerCase().includes(contact.company?.toLowerCase() || "");
                const notAlreadyAdded = !existingContactEmails.has(
                  contact.email?.toLowerCase() || ""
                );
                const notDuplicate = !seenContactIds.has(contact.id);

                if (companyMatch && notAlreadyAdded && notDuplicate) {
                  seenContactIds.add(contact.id);
                  return true;
                }
                return false;
              }
            );
            allSuggestedContacts.push(...matchingContacts);
          }
        } catch (err) {
          console.error(`Failed to search contacts for company ${company}:`, err);
        }
      }

      // Limit to top 20 suggestions
      setSuggestedContacts(allSuggestedContacts.slice(0, 20));
    } catch (err: any) {
      console.error("Failed to load suggested contacts:", err);
    } finally {
      setIsLoadingSuggested(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "explore") {
      return;
    }
    fetchExploreContacts();
    fetchPeopleWhoHaveYou();
    fetchPeopleInYourIndustry();
    fetchSuggestedContacts();
  }, [activeTab, degreeFilter, exploreSearch]);


  useEffect(() => {
    if (!location.search) {
      return;
    }
    const params = new URLSearchParams(location.search);
    const googleParam = params.get("googleContacts");
    if (googleParam === "connected") {
      setStatusBanner({
        type: "success",
        text: "Google Contacts connected. You can import your contacts now.",
      });
      fetchGoogleContactsStatus();
    } else if (googleParam === "error") {
      setStatusBanner({
        type: "error",
        text: "Failed to connect Google Contacts. Please try again.",
      });
    } else {
      return;
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [location]);

  const handleAddContact = async (contactData: ContactInput) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Check if user is trying to add themselves
      if (currentUserEmail && contactData.email && contactData.email.toLowerCase() === currentUserEmail.toLowerCase()) {
        setError("You cannot add yourself as a contact");
        setIsSubmitting(false);
        return;
      }
      
      const response = await api.createContact(contactData);
      if (response.ok) {
        await fetchContacts();
        setIsAddModalOpen(false);
      } else {
        // Handle validation errors
        if (response.error?.fields) {
          const fieldErrors = Object.entries(response.error.fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join(", ");
          setError(fieldErrors || response.error?.message || "Failed to create contact");
        } else {
          setError(response.error?.message || response.error?.code || "Failed to create contact");
        }
      }
    } catch (err: any) {
      console.error("Failed to create contact:", err);
      // Try to parse validation error fields from detail
      if (err.detail) {
        try {
          const fields = JSON.parse(err.detail);
          const fieldErrors = Object.entries(fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join(", ");
          setError(fieldErrors || err.message);
        } catch {
          setError(err.message || "Failed to create contact. Please try again.");
        }
      } else {
        setError(err.message || "Failed to create contact. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditContact = async (id: string, contactData: Partial<ContactInput>) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.updateContact(id, contactData);
      if (response.ok) {
        await fetchContacts();
        setIsEditModalOpen(false);
        setSelectedContact(null);
      } else {
        setError(response.error?.message || "Failed to update contact");
      }
    } catch (err: any) {
      console.error("Failed to update contact:", err);
      setError("Failed to update contact. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      setError(null);
      const response = await api.deleteContact(id);
      if (response.ok) {
        await fetchContacts();
      } else {
        setError(response.error?.message || "Failed to delete contact");
      }
    } catch (err: any) {
      console.error("Failed to delete contact:", err);
      setError("Failed to delete contact. Please try again.");
    }
  };

  const handleViewNetwork = async (contact: ProfessionalContact) => {
    try {
      setIsLoadingNetwork(true);
      setError(null);
      console.log("Fetching network for contact:", contact.id);
      const response = await api.getContactNetwork(contact.id);
      console.log("Network response:", response);
      if (response.ok && response.data) {
        setContactNetwork(response.data.network);
        setSelectedContact(contact);
        setIsNetworkModalOpen(true);
      } else {
        const errorMsg = response.error?.message || "Failed to load contact network";
        console.error("Network response error:", response.error);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error("Failed to load contact network - exception:", err);
      console.error("Error details:", {
        message: err.message,
        status: err.status,
        code: err.code,
        detail: err.detail,
      });
      setError(err.message || "Failed to load contact network. Please try again.");
    } finally {
      setIsLoadingNetwork(false);
    }
  };

  const handleViewInteractions = async (contact: ProfessionalContact) => {
    try {
      setIsLoadingInteractions(true);
      setError(null);
      const response = await api.getContactInteractions(contact.id);
      if (response.ok && response.data) {
        setContactInteractions(response.data.interactions);
        setSelectedContact(contact);
        setIsInteractionsModalOpen(true);
      } else {
        setError(response.error?.message || "Failed to load interaction history");
      }
    } catch (err: any) {
      console.error("Failed to load interaction history:", err);
      setError("Failed to load interaction history. Please try again.");
    } finally {
      setIsLoadingInteractions(false);
    }
  };

  const handleAddFromExplore = async (contact: DiscoveredContact) => {
    try {
      setAddingContactIds((prev) => new Set(prev).add(contact.id));
      setError(null);

      // Check if user is trying to add themselves
      if (currentUserEmail && contact.email && contact.email.toLowerCase() === currentUserEmail.toLowerCase()) {
        setError("You cannot add yourself as a contact");
        setAddingContactIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(contact.id);
          return newSet;
        });
        return;
      }

      // Parse contact name to extract first and last name
      const nameParts = (contact.contactName || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const contactData: ContactInput = {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        company: contact.company || undefined,
        jobTitle: contact.contactTitle || undefined,
        industry: contact.industry || undefined,
        location: contact.location || undefined,
        linkedinUrl: contact.linkedinUrl || undefined,
        contactUserId: contact.contactUserId || undefined, // Include contact_user_id if available
      };

      const response = await api.createContact(contactData);
      if (response.ok) {
        // Remove from explore contacts by ID and also by email (in case same person appears with different ID)
        setExploreContacts((prev) => prev.filter((c) => {
          if (c.id === contact.id) return false;
          // Also remove if email matches (case-insensitive)
          if (contact.email && c.email && contact.email.toLowerCase() === c.email.toLowerCase()) {
            return false;
          }
          return true;
        }));
        // Remove from people who have you list by ID and also by email
        setPeopleWhoHaveYou((prev) => prev.filter((c) => {
          if (c.id === contact.id) return false;
          // Also remove if email matches (case-insensitive)
          if (contact.email && c.email && contact.email.toLowerCase() === c.email.toLowerCase()) {
            return false;
          }
          return true;
        }));
        // Remove from people in your industry list by ID and also by email
        setPeopleInYourIndustry((prev) => prev.filter((c) => {
          if (c.id === contact.id) return false;
          // Also remove if email matches (case-insensitive)
          if (contact.email && c.email && contact.email.toLowerCase() === c.email.toLowerCase()) {
            return false;
          }
          return true;
        }));
        // Remove from suggested contacts list by ID and also by email
        setSuggestedContacts((prev) => prev.filter((c) => {
          if (c.id === contact.id) return false;
          // Also remove if email matches (case-insensitive)
          if (contact.email && c.email && contact.email.toLowerCase() === c.email.toLowerCase()) {
            return false;
          }
          return true;
        }));
        // Refresh contacts list
        await fetchContacts();
        setStatusBanner({
          type: "success",
          text: `${contact.contactName || "Contact"} has been added to your contacts.`,
        });
        setTimeout(() => setStatusBanner(null), 5000);
      } else {
        setError(response.error?.message || "Failed to add contact");
      }
    } catch (err: any) {
      console.error("Failed to add contact from explore:", err);
      setError("Failed to add contact. Please try again.");
    } finally {
      setAddingContactIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(contact.id);
        return newSet;
      });
    }
  };

  const handleGoogleImportClick = async () => {
    setStatusBanner(null);
    setImportSummary(null);

    if (!googleStatus?.connected) {
      try {
        const response = await api.getGoogleContactsAuthUrl();
        if (response.ok && response.data?.authUrl) {
          window.location.href = response.data.authUrl;
        } else {
          setStatusBanner({
            type: "error",
            text: response.error?.message || "Unable to start Google authorization.",
          });
        }
      } catch (err: any) {
        console.error("Failed to get Google Contacts auth URL:", err);
        setStatusBanner({
          type: "error",
          text: err?.message || "Unable to connect to Google Contacts.",
        });
      }
      return;
    }

    setIsGoogleModalOpen(true);
  };

  const handleImportContacts = async ({ maxResults }: { maxResults: number }) => {
    try {
      setIsImporting(true);
      setStatusBanner(null);
      const response = await api.importGoogleContacts({ maxResults });
      if (response.ok && response.data) {
        setImportSummary(response.data.summary);
        setStatusBanner({
          type: "success",
          text: response.data.message || "Google Contacts import complete.",
        });
        await fetchContacts();
        await fetchGoogleContactsStatus();
      } else {
        setStatusBanner({
          type: "error",
          text: response.error?.message || "Failed to import contacts from Google.",
        });
      }
    } catch (err: any) {
      console.error("Failed to import Google contacts:", err);
      const message =
        err?.code === "GOOGLE_CONTACTS_AUTH_EXPIRED"
          ? "Google authorization expired. Please reconnect and try again."
          : err?.message || "Failed to import contacts from Google.";
      setStatusBanner({
        type: "error",
        text: message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDisconnectGoogleContacts = async () => {
    if (!confirm("Disconnect Google Contacts? You can reconnect anytime.")) {
      return;
    }

    try {
      const response = await api.disconnectGoogleContacts();
      if (response.ok) {
        setStatusBanner({
          type: "success",
          text: response.data?.message || "Google Contacts disconnected successfully.",
        });
      } else {
        setStatusBanner({
          type: "error",
          text: response.error?.message || "Failed to disconnect Google Contacts.",
        });
      }
    } catch (err: any) {
      console.error("Failed to disconnect Google Contacts:", err);
      setStatusBanner({
        type: "error",
        text: err?.message || "Failed to disconnect Google Contacts.",
      });
    } finally {
      await fetchGoogleContactsStatus();
      setIsGoogleModalOpen(false);
    }
  };

  const extractMutualConnectionNames = (
    mutualConnections: DiscoveredContact["mutualConnections"]
  ): string[] => {
    if (!mutualConnections) {
      return [];
    }

    if (Array.isArray(mutualConnections)) {
      return mutualConnections.map((entry, index) => {
        if (typeof entry === "string") {
          return entry;
        }
        if (entry && typeof entry === "object") {
          return (
            entry.name ||
            entry.contactName ||
            entry.fullName ||
            entry.email ||
            `Mutual connection ${index + 1}`
          );
        }
        return `Mutual connection ${index + 1}`;
      });
    }

    if (typeof mutualConnections === "object") {
      return Object.values(mutualConnections).map((value, index) => {
        if (typeof value === "string") {
          return value;
        }
        if (value && typeof value === "object") {
          return (
            value.name ||
            value.contactName ||
            value.fullName ||
            value.email ||
            `Mutual connection ${index + 1}`
          );
        }
        return `Mutual connection ${index + 1}`;
      });
    }

    return [];
  };

  const formatConnectionDegree = (degree?: string) => {
    if (!degree) {
      return "2nd Degree";
    }
    const normalized = degree.toString().toLowerCase();
    if (normalized.startsWith("2")) {
      return "2nd Degree";
    }
    if (normalized.startsWith("3")) {
      return "3rd Degree";
    }
    return degree;
  };

  // Extract unique values for filter dropdowns
  const uniqueIndustries = Array.from(
    new Set(contacts.map((c) => c.industry).filter((v): v is string => !!v))
  ).sort();

  const uniqueRoles = Array.from(
    new Set(contacts.map((c) => c.jobTitle).filter((v): v is string => !!v))
  ).sort();

  // Helper function to determine contact source
  const getContactSource = (contact: ProfessionalContact): string => {
    if (contact.importedFrom === "google_contacts") {
      return "Google Contacts";
    }
    if (contact.relationshipType === "Event Attendee") {
      return "Event Attendee";
    }
    return "Other";
  };

  // Always show all three source options in the dropdown
  const sourceOptions = ["Google Contacts", "Event Attendee", "Other"];

  const filteredContacts = contacts.filter((contact) => {
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        contact.firstName?.toLowerCase().includes(search) ||
        contact.lastName?.toLowerCase().includes(search) ||
        contact.email?.toLowerCase().includes(search) ||
        contact.company?.toLowerCase().includes(search) ||
        contact.jobTitle?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Apply industry filter
    if (industryFilter && contact.industry !== industryFilter) {
      return false;
    }

    // Apply role filter
    if (roleFilter && contact.jobTitle !== roleFilter) {
      return false;
    }

    // Apply source filter
    if (sourceFilter) {
      const contactSource = getContactSource(contact);
      if (contactSource !== sourceFilter) {
        return false;
      }
    }

    // Apply company filter
    if (companyFilter) {
      const company = companyFilter.toLowerCase();
      const contactCompany = contact.company?.toLowerCase() || "";
      if (!contactCompany.includes(company)) {
        return false;
      }
    }

    return true;
  });

  const renderMyContactsSection = () => (
    <>
      {/* Actions Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 w-full md:max-w-md">
              <div className="relative">
                <Icon
                  icon="mingcute:search-line"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  width={20}
                  height={20}
                />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-[#3351FD] text-white rounded-full hover:bg-[#2a43d4] transition-colors flex items-center gap-2"
            >
              <Icon icon="mingcute:add-line" width={20} height={20} />
              Add Contact
            </button>
            <button
              onClick={handleGoogleImportClick}
              className={`px-4 py-2 rounded-full border transition-colors flex items-center gap-2 ${
                googleStatus?.connected
                  ? "bg-white border-[#3351FD] text-[#3351FD] hover:bg-blue-50"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {googleStatus?.connected ? "Import Google Contacts" : "Connect Google Contacts"}
            </button>
            {googleStatus?.connected && (
              <button
                onClick={handleDisconnectGoogleContacts}
                className="text-sm text-red-600 hover:underline sm:ml-2"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
        {/* Filter Options */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-slate-700 mb-1">Industry</label>
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent bg-white"
              >
                <option value="">All Industries</option>
                {uniqueIndustries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent bg-white"
              >
                <option value="">All Roles</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-slate-700 mb-1">Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent bg-white"
              >
                <option value="">All Sources</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-slate-700 mb-1">Company</label>
              <input
                type="text"
                placeholder="Search by company..."
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent bg-white"
              />
            </div>
            {(industryFilter || roleFilter || sourceFilter || companyFilter) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setIndustryFilter("");
                    setRoleFilter("");
                    setSourceFilter("");
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
        {googleStatus && (
          <div className="mt-3 text-xs text-slate-500 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {googleStatus.connected ? "Google Contacts connected" : "Google Contacts not connected"}
            </span>
            {googleStatus.connected && (
              <span>
                {googleStatus.lastSyncAt
                  ? `Last import ${new Date(googleStatus.lastSyncAt).toLocaleString()}`
                  : "No imports yet"}
                {typeof googleStatus.totalImported === "number" &&
                  ` • Total imported ${googleStatus.totalImported}`}
              </span>
            )}
          </div>
        )}
        </div>
      </div>

      {statusBanner && (
        <div
          className={`mb-4 p-4 rounded-lg border ${
            statusBanner.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-yellow-50 border-yellow-200 text-yellow-800"
          }`}
        >
          {statusBanner.text}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Contacts List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
          <p className="mt-4 text-slate-600">Loading contacts...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Icon icon="mingcute:user-3-line" width={64} height={64} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No contacts found</h3>
          <p className="text-slate-600 mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first contact"}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-[#3351FD] text-white rounded-full hover:bg-[#2a43d4] transition-colors"
            >
              Add Contact
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {contact.profilePicture && !contact.profilePicture.includes('blank-profile-picture') ? (
                      <img
                        src={contact.profilePicture}
                        alt={`${contact.firstName} ${contact.lastName}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.profile-fallback') as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <span className="profile-fallback w-full h-full items-center justify-center text-slate-500 text-lg font-semibold" style={{ display: (contact.profilePicture && !contact.profilePicture.includes('blank-profile-picture')) ? 'none' : 'flex' }}>
                      {(contact.firstName?.[0] || '').toUpperCase()}{(contact.lastName?.[0] || '').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {contact.firstName} {contact.lastName}
                    </h3>
                  {contact.jobTitle && (
                    <p className="text-sm text-slate-600 mt-1">{contact.jobTitle}</p>
                  )}
                  {contact.company && (
                    <p className="text-sm text-slate-500 mt-1">{contact.company}</p>
                  )}
                  {contact.industry && (
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">Industry:</span> {contact.industry}
                    </p>
                  )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewInteractions(contact)}
                    className="p-2 text-slate-600 hover:text-[#3351FD] hover:bg-slate-50 rounded transition-colors"
                    title="View interaction history"
                  >
                    <Icon icon="mingcute:history-line" width={18} height={18} />
                  </button>
                  <button
                    onClick={() => handleViewNetwork(contact)}
                    className="p-2 text-slate-600 hover:text-[#3351FD] hover:bg-slate-50 rounded transition-colors"
                    title="View their network"
                  >
                    <Icon icon="mingcute:user-3-line" width={18} height={18} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedContact(contact);
                      setIsEditModalOpen(true);
                    }}
                    className="p-2 text-slate-600 hover:text-[#3351FD] hover:bg-slate-50 rounded transition-colors"
                    title="Edit contact"
                  >
                    <Icon icon="mingcute:edit-line" width={18} height={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete contact"
                  >
                    <Icon icon="mingcute:delete-line" width={18} height={18} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Icon icon="mingcute:mail-line" width={16} height={16} />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Icon icon="mingcute:phone-line" width={16} height={16} />
                    <span>{contact.phone}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {contact.relationshipType && contact.relationshipType !== "Event Attendee" && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                      {contact.relationshipType}
                    </div>
                  )}
                  {(() => {
                    const source = getContactSource(contact);
                    if (source === "Google Contacts") {
                      return (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-[#3351FD]">
                          <Icon icon="mdi:google-contacts" width={14} height={14} />
                          Google Contacts
                        </div>
                      );
                    }
                    if (source === "Event Attendee") {
                      return (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700">
                          <Icon icon="mingcute:calendar-line" width={14} height={14} />
                          Event Attendee
                        </div>
                      );
                    }
                    return (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        Other
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LinkedIn Contacts Section - shown when company filter is active */}
      {companyFilter && companyFilter.trim() && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Icon icon="mingcute:linkedin-fill" width={24} height={24} className="text-[#0077B5]" />
              LinkedIn Contacts at {companyFilter}
            </h2>
          </div>
          {isLoadingLinkedIn ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
              <p className="mt-4 text-slate-600">Loading LinkedIn contacts...</p>
            </div>
          ) : linkedInContacts.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Icon icon="mingcute:linkedin-line" width={64} height={64} className="mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No LinkedIn contacts found</h3>
              <p className="text-slate-600 mb-4">
                No LinkedIn contacts found for this company. Make sure you're connected to LinkedIn.
              </p>
              <button
                onClick={() => {
                  window.location.href = "/api/v1/users/auth/linkedin";
                }}
                className="px-4 py-2 bg-[#0077B5] text-white rounded-full hover:bg-[#005885] transition-colors flex items-center gap-2 mx-auto"
              >
                <Icon icon="mingcute:linkedin-fill" width={20} />
                Connect LinkedIn
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {linkedInContacts.map((contact: any, index: number) => (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3 mb-4">
                    {contact.profilePictureUrl && (
                      <img
                        src={contact.profilePictureUrl}
                        alt={contact.fullName || contact.firstName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {contact.fullName || `${contact.firstName || ""} ${contact.lastName || ""}`.trim()}
                      </h3>
                      {contact.headline && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{contact.headline}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    {contact.company && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Icon icon="mingcute:building-2-line" width={16} />
                        <span>{contact.company}</span>
                      </div>
                    )}
                    {contact.title && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Icon icon="mingcute:briefcase-line" width={16} />
                        <span>{contact.title}</span>
                      </div>
                    )}
                    {contact.connectionDegree && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Icon icon="mingcute:user-2-line" width={16} />
                        <span>{contact.connectionDegree} connection</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {contact.profileUrl && (
                      <a
                        href={contact.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-[#0077B5] text-white rounded-lg hover:bg-[#005885] transition-colors text-sm font-medium text-center"
                      >
                        View Profile
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <ContactModal
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedContact(null);
            setError(null);
          }}
          onSave={isAddModalOpen ? handleAddContact : (data) => selectedContact && handleEditContact(selectedContact.id, data)}
          contact={selectedContact}
          isSubmitting={isSubmitting}
          backendError={error}
        />
      )}

      <GoogleContactsImportModal
        isOpen={isGoogleModalOpen}
        onClose={() => {
          setIsGoogleModalOpen(false);
          setImportSummary(null);
        }}
        onImport={handleImportContacts}
        onDisconnect={googleStatus?.connected ? handleDisconnectGoogleContacts : undefined}
        isImporting={isImporting}
        summary={importSummary}
        status={googleStatus}
      />

      {/* Contact Network Modal */}
      {isNetworkModalOpen && selectedContact && (
        <ContactNetworkModal
          isOpen={isNetworkModalOpen}
          onClose={() => {
            setIsNetworkModalOpen(false);
            setSelectedContact(null);
            setContactNetwork([]);
          }}
          contact={selectedContact}
          network={contactNetwork}
          isLoading={isLoadingNetwork}
        />
      )}

      {/* Contact Interactions Modal */}
      {isInteractionsModalOpen && selectedContact && (
        <ContactInteractionsModal
          isOpen={isInteractionsModalOpen}
          onClose={() => {
            setIsInteractionsModalOpen(false);
            setSelectedContact(null);
            setContactInteractions([]);
          }}
          contact={selectedContact}
          interactions={contactInteractions}
          isLoading={isLoadingInteractions}
        />
      )}
    </>
  );

  const renderExploreNetworkSection = () => (
    <>
      {/* Suggested Contacts from Job Opportunities */}
      {suggestedContacts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Icon icon="mingcute:briefcase-line" width={24} height={24} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Suggested Contacts from Your Job Opportunities</h3>
              <p className="text-sm text-slate-600">Connect with people who work at companies in your tracked job opportunities.</p>
            </div>
          </div>
          {isLoadingSuggested ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-white rounded-lg border border-amber-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {contact.profilePicture && !contact.profilePicture.includes('blank-profile-picture') ? (
                          <img
                            src={contact.profilePicture}
                            alt={contact.contactName || "Suggested contact"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = parent.querySelector('.profile-fallback') as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <span className="profile-fallback w-full h-full items-center justify-center text-slate-500 text-lg font-semibold" style={{ display: (contact.profilePicture && !contact.profilePicture.includes('blank-profile-picture')) ? 'none' : 'flex' }}>
                          {(contact.contactName?.[0] || '?').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {contact.contactName || "Suggested contact"}
                        </h3>
                        {contact.contactTitle && (
                          <p className="text-sm text-slate-600 mt-1">{contact.contactTitle}</p>
                        )}
                        {contact.company && (
                          <p className="text-sm text-slate-500 mt-1">{contact.company}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {contact.connectionPath && (
                    <p className="mt-3 text-sm text-slate-600">{contact.connectionPath}</p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Icon icon="mingcute:mail-line" width={14} height={14} />
                          {contact.email}
                        </span>
                      )}
                    </div>
                    {isContactAlreadyAdded(contact) || contact.alreadyInContacts ? (
                      <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm font-medium flex items-center gap-2">
                        <Icon icon="mingcute:check-circle-line" width={16} height={16} />
                        <span>Already Added</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddFromExplore(contact)}
                        disabled={addingContactIds.has(contact.id)}
                        className="px-4 py-2 bg-[#3351FD] text-white rounded-full hover:bg-[#2a43d4] transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {addingContactIds.has(contact.id) ? (
                          <>
                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <Icon icon="mingcute:add-line" width={16} height={16} />
                            <span>Add to Contacts</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* People Who Have You Card */}
      {peopleWhoHaveYou.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Icon icon="mingcute:user-add-line" width={24} height={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">People Who Have You in Their Contacts</h3>
              <p className="text-sm text-slate-600">These people have added you as a contact. Consider adding them back!</p>
            </div>
          </div>
          {isLoadingWhoHaveYou ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {peopleWhoHaveYou.map((contact) => {
                return (
                  <div
                    key={contact.id}
                    className="bg-white rounded-lg border border-blue-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {contact.profilePicture && !contact.profilePicture.includes('blank-profile-picture') ? (
                            <img
                              src={contact.profilePicture}
                              alt={contact.contactName || "Potential contact"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = parent.querySelector('.profile-fallback') as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <span className="profile-fallback w-full h-full items-center justify-center text-slate-500 text-lg font-semibold" style={{ display: (contact.profilePicture && !contact.profilePicture.includes('blank-profile-picture')) ? 'none' : 'flex' }}>
                            {(contact.contactName?.[0] || '?').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {contact.contactName || "Potential contact"}
                          </h3>
                          {contact.contactTitle && (
                            <p className="text-sm text-slate-600 mt-1">{contact.contactTitle}</p>
                          )}
                          {contact.company && (
                            <p className="text-sm text-slate-500 mt-1">{contact.company}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {contact.connectionPath && (
                      <p className="mt-3 text-sm text-slate-600">{contact.connectionPath}</p>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Icon icon="mingcute:mail-line" width={14} height={14} />
                            {contact.email}
                          </span>
                        )}
                      </div>
                      {isContactAlreadyAdded(contact) || contact.alreadyInContacts ? (
                        <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium flex items-center gap-2">
                          <Icon icon="mingcute:check-circle-line" width={16} height={16} />
                          <span>Already Added</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddFromExplore(contact)}
                          disabled={addingContactIds.has(contact.id)}
                          className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {addingContactIds.has(contact.id) ? (
                            <>
                              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Adding...</span>
                            </>
                          ) : (
                            <>
                              <Icon icon="mingcute:add-line" width={16} height={16} />
                              <span>Add to Contacts</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* People in Your Industry Card */}
      {peopleInYourIndustry.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Icon icon="mingcute:building-line" width={24} height={24} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">People in Your Industry</h3>
              <p className="text-sm text-slate-600">Connect with professionals who share your industry background.</p>
            </div>
          </div>
          {isLoadingIndustry ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {peopleInYourIndustry.map((contact) => {
                return (
                  <div
                    key={contact.id}
                    className="bg-white rounded-lg border border-purple-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {contact.profilePicture && !contact.profilePicture.includes('blank-profile-picture') ? (
                            <img
                              src={contact.profilePicture}
                              alt={contact.contactName || "Potential contact"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = parent.querySelector('.profile-fallback') as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <span className="profile-fallback w-full h-full items-center justify-center text-slate-500 text-lg font-semibold" style={{ display: (contact.profilePicture && !contact.profilePicture.includes('blank-profile-picture')) ? 'none' : 'flex' }}>
                            {(contact.contactName?.[0] || '?').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {contact.contactName || "Potential contact"}
                          </h3>
                          {contact.contactTitle && (
                            <p className="text-sm text-slate-600 mt-1">{contact.contactTitle}</p>
                          )}
                          {contact.company && (
                            <p className="text-sm text-slate-500 mt-1">{contact.company}</p>
                          )}
                        </div>
                      </div>
                      <div
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"
                      >
                        {contact.industry || "Same Industry"}
                      </div>
                    </div>

                    {contact.connectionPath && (
                      <p className="mt-3 text-sm text-slate-600">{contact.connectionPath}</p>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Icon icon="mingcute:mail-line" width={14} height={14} />
                            {contact.email}
                          </span>
                        )}
                        {contact.location && (
                          <span className="flex items-center gap-1">
                            <Icon icon="mingcute:map-pin-line" width={14} height={14} />
                            {contact.location}
                          </span>
                        )}
                      </div>
                      {isContactAlreadyAdded(contact) || contact.alreadyInContacts ? (
                        <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium flex items-center gap-2">
                          <Icon icon="mingcute:check-circle-line" width={16} height={16} />
                          <span>Already Added</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddFromExplore(contact)}
                          disabled={addingContactIds.has(contact.id)}
                          className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {addingContactIds.has(contact.id) ? (
                            <>
                              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Adding...</span>
                            </>
                          ) : (
                            <>
                              <Icon icon="mingcute:add-line" width={16} height={16} />
                              <span>Add to Contacts</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 w-full md:max-w-lg">
            <div className="relative">
              <Icon
                icon="mingcute:search-line"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                width={20}
                height={20}
              />
              <input
                type="text"
                placeholder="Search by name, company, or title..."
                value={exploreSearch}
                onChange={(e) => setExploreSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "All" },
              { value: "2nd", label: "2nd Degree" },
              { value: "3rd", label: "3rd Degree" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDegreeFilter(option.value as "all" | "2nd" | "3rd")}
                className={`px-3 py-2 rounded-full text-sm border ${
                  degreeFilter === option.value
                    ? "bg-[#3351FD] text-white border-[#3351FD]"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-6">
          Find new connections through your network. We'll show you people connected to your contacts (2nd degree) 
          and people connected to those connections (3rd degree) who aren't already in your contact list.
        </p>
      </div>

      {exploreError && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          {exploreError}
        </div>
      )}

      {isExploreLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
          <p className="mt-4 text-slate-600">Analyzing your extended network...</p>
        </div>
      ) : exploreContacts.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <Icon icon="mingcute:radar-line" width={64} height={64} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No suggestions yet</h3>
          <p className="text-slate-600">
            {hasLoadedExplore
              ? "We couldn't find any second or third degree contacts that aren't already in your list."
              : "Tap the Explore tab again to scan for second and third degree connections."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exploreContacts.map((contact) => {
            const mutualNames = extractMutualConnectionNames(contact.mutualConnections);
            return (
              <div
                key={contact.id}
                className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {contact.profilePicture && !contact.profilePicture.includes('blank-profile-picture') ? (
                        <img
                          src={contact.profilePicture}
                          alt={contact.contactName || "Potential contact"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.profile-fallback') as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <span className="profile-fallback w-full h-full items-center justify-center text-slate-500 text-lg font-semibold" style={{ display: (contact.profilePicture && !contact.profilePicture.includes('blank-profile-picture')) ? 'none' : 'flex' }}>
                        {(contact.contactName?.[0] || '?').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {contact.contactName || "Potential contact"}
                      </h3>
                    {contact.contactTitle && (
                      <p className="text-sm text-slate-600 mt-1">{contact.contactTitle}</p>
                    )}
                    {contact.company && (
                      <p className="text-sm text-slate-500 mt-1">{contact.company}</p>
                    )}
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      contact.connectionDegree?.startsWith("3")
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {formatConnectionDegree(contact.connectionDegree)}
                  </div>
                </div>

                {contact.connectionPath && (
                  <p className="mt-3 text-sm text-slate-600">{contact.connectionPath}</p>
                )}

                {mutualNames.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Mutual connections ({mutualNames.length})
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {mutualNames.slice(0, 4).map((name, index) => (
                        <span
                          key={`${contact.id}-mutual-${index}`}
                          className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs"
                        >
                          {name}
                        </span>
                      ))}
                      {mutualNames.length > 4 && (
                        <span className="text-xs text-slate-500">
                          +{mutualNames.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    {typeof contact.relevanceScore === "number" && (
                      <span>Relevance score: {contact.relevanceScore}</span>
                    )}
                    {contact.createdAt && (
                      <span>Discovered {new Date(contact.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {isContactAlreadyAdded(contact) || contact.alreadyInContacts ? (
                    <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium flex items-center gap-2">
                      <Icon icon="mingcute:check-circle-line" width={16} height={16} />
                      <span>Already Added</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddFromExplore(contact)}
                      disabled={addingContactIds.has(contact.id)}
                      className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {addingContactIds.has(contact.id) ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <Icon icon="mingcute:add-line" width={16} height={16} />
                          <span>Add to Contacts</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Professional Contacts</h1>
          <p className="text-slate-600">Manage your professional network and relationships</p>
        </div>

        <div className="border-b border-slate-200 mb-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab("my")}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit bg-transparent hover:bg-transparent focus:bg-transparent ${
                activeTab === "my"
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-slate-600"
              }`}
              style={{ 
                outline: 'none', 
                boxShadow: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderRadius: '0'
              }}
              onFocus={(e) => e.target.blur()}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              My Contacts
            </button>
            <button
              onClick={() => setActiveTab("explore")}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit bg-transparent hover:bg-transparent focus:bg-transparent ${
                activeTab === "explore"
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-slate-600"
              }`}
              style={{ 
                outline: 'none', 
                boxShadow: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderRadius: '0'
              }}
              onFocus={(e) => e.target.blur()}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Explore Network
            </button>
          </div>
        </div>

        {activeTab === "my" ? renderMyContactsSection() : renderExploreNetworkSection()}
      </div>
    </div>
  );
}

// Contact Modal Component
function ContactModal({
  isOpen,
  onClose,
  onSave,
  contact,
  isSubmitting,
  backendError,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ContactInput) => void;
  contact?: ProfessionalContact | null;
  isSubmitting: boolean;
  backendError?: string | null;
}) {
  const [formData, setFormData] = useState<ContactInput>({
    firstName: contact?.firstName || "",
    lastName: contact?.lastName || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    company: contact?.company || "",
    jobTitle: contact?.jobTitle || "",
    industry: contact?.industry || "",
    location: contact?.location || "",
    relationshipType: contact?.relationshipType || "",
    relationshipStrength: contact?.relationshipStrength || "",
    notes: contact?.notes || "",
    linkedinUrl: contact?.linkedinUrl || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email is required and must be valid format
    const emailError = validateEmail(formData.email || "", true);
    if (emailError) newErrors.email = emailError;

    // Phone is optional but must be exactly 10 digits if provided
    const phoneError = validatePhone(formData.phone || "", false);
    if (phoneError) newErrors.phone = phoneError;

    const urlError = validateUrl(formData.linkedinUrl || "");
    if (urlError) newErrors.linkedinUrl = urlError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Clean up the data: convert empty strings to undefined for optional fields, but keep email
      const cleanedData: ContactInput = {
        firstName: formData.firstName?.trim() || undefined,
        lastName: formData.lastName?.trim() || undefined,
        email: formData.email?.trim() || "", // Email is required - validation will catch if empty
        phone: formData.phone?.trim() || undefined,
        company: formData.company?.trim() || undefined,
        jobTitle: formData.jobTitle?.trim() || undefined,
        industry: formData.industry?.trim() || undefined,
        location: formData.location?.trim() || undefined,
        relationshipType: formData.relationshipType?.trim() || undefined,
        relationshipStrength: formData.relationshipStrength?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        linkedinUrl: formData.linkedinUrl?.trim() || undefined,
      };
      // Ensure email is present (should be caught by validation, but double-check)
      if (!cleanedData.email || cleanedData.email.trim() === "") {
        setErrors({ email: "Email is required" });
        return;
      }
      onSave(cleanedData);
    }
  };

  // Display backend errors if they exist
  useEffect(() => {
    if (backendError) {
      // Try to parse field-specific errors from backend
      if (backendError.includes("email")) {
        setErrors((prev) => ({ ...prev, email: backendError }));
      } else if (backendError.includes("phone")) {
        setErrors((prev) => ({ ...prev, phone: backendError }));
      }
    }
  }, [backendError]);

  const handleFieldChange = (field: keyof ContactInput, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[110] p-2 sm:p-4 overflow-y-auto" style={{ paddingTop: '80px' }}>
      <div className="bg-white rounded-lg max-w-2xl w-full my-4 sm:my-8 max-h-[calc(100vh-120px)] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {contact ? "Edit Contact" : "Add Contact"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {backendError && !errors.email && !errors.phone && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {backendError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                  errors.email ? "border-red-300" : "border-slate-300"
                }`}
                placeholder="example@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                  errors.phone ? "border-red-300" : "border-slate-300"
                }`}
                placeholder="(123) 456-7890"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
              {!errors.phone && (
                <p className="mt-1 text-xs text-slate-500">Must be exactly 10 digits (optional)</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
            <select
              value={formData.industry || ""}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value || undefined })}
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL</label>
            <input
              type="url"
              value={formData.linkedinUrl}
              onChange={(e) => handleFieldChange("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                errors.linkedinUrl ? "border-red-300" : "border-slate-300"
              }`}
            />
            {errors.linkedinUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.linkedinUrl}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
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
              {isSubmitting ? "Saving..." : contact ? "Update" : "Add"} Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GoogleContactsImportModal({
  isOpen,
  onClose,
  onImport,
  onDisconnect,
  isImporting,
  summary,
  status,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (options: { maxResults: number }) => void;
  onDisconnect?: () => void;
  isImporting: boolean;
  summary: GoogleContactsImportSummary | null;
  status: GoogleContactsStatus | null;
}) {
  const [maxResults, setMaxResults] = useState(250);

  useEffect(() => {
    if (isOpen) {
      setMaxResults(250);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const safeValue = Math.min(Math.max(maxResults || 1, 1), 1000);
    onImport({ maxResults: safeValue });
  };

  const errorsToShow = summary?.errors?.slice(0, 3) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[110] p-2 sm:p-4 overflow-y-auto" style={{ paddingTop: '80px' }}>
      <div className="bg-white rounded-lg max-w-xl w-full mb-4 sm:mb-8 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Import from Google Contacts</h2>
          <p className="text-sm text-slate-600 mt-1">
            We&apos;ll pull contacts from Google and skip any that already exist in your Network.
          </p>
          {status?.lastSyncAt && (
            <p className="text-xs text-slate-500 mt-2">
              Last import {new Date(status.lastSyncAt).toLocaleString()} • Total imported{" "}
              {status.totalImported ?? 0}
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Maximum contacts to import
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={maxResults}
              onChange={(e) => {
                const nextValue = Number(e.target.value);
                setMaxResults(Number.isNaN(nextValue) ? 1 : nextValue);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
            />
            <p className="text-xs text-slate-500 mt-1">
              Limit imports to avoid hitting Google rate limits. Maximum 1,000 contacts per import.
            </p>
          </div>

          {summary && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold text-slate-900">Fetched:</span> {summary.fetched}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Imported:</span> {summary.created}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Skipped (no email):</span>{" "}
                  {summary.skippedNoEmail}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Skipped (existing):</span>{" "}
                  {summary.skippedExisting}
                </div>
              </div>
              {errorsToShow.length > 0 && (
                <div className="text-red-600 text-sm">
                  <p className="font-semibold mb-1">Errors</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {errorsToShow.map((err, idx) => (
                      <li key={`${err.email || "error"}-${idx}`}>
                        {err.email ? `${err.email}: ` : ""}
                        {err.message}
                      </li>
                    ))}
                    {summary.errors.length > errorsToShow.length && (
                      <li>+ {summary.errors.length - errorsToShow.length} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-200">
            {onDisconnect && (
              <button
                type="button"
                onClick={onDisconnect}
                className="text-sm text-red-600 hover:underline text-left"
              >
                Disconnect Google Contacts
              </button>
            )}
            <div className="flex gap-3 sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isImporting}
                className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] disabled:opacity-50"
              >
                {isImporting ? "Importing..." : "Import contacts"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Contact Network Modal Component
function ContactNetworkModal({
  isOpen,
  onClose,
  contact,
  network,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  contact: ProfessionalContact;
  network: ContactNetworkItem[];
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[110] p-2 sm:p-4 overflow-y-auto" style={{ paddingTop: '80px' }}>
      <div className="bg-white rounded-lg max-w-4xl w-full mb-4 sm:mb-8 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {contact.firstName} {contact.lastName}'s Network
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Contacts connected to {contact.firstName} {contact.lastName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
            >
              <Icon icon="mingcute:close-line" width={24} height={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
              <p className="mt-4 text-slate-600">Loading network...</p>
            </div>
          ) : network.length === 0 ? (
            <div className="text-center py-12">
              <Icon icon="mingcute:user-3-line" width={64} height={64} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No contacts found</h3>
              <p className="text-slate-600">
                This contact doesn't have any connections in the network yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-slate-600 mb-4">
                Found {network.length} contact{network.length !== 1 ? "s" : ""} in their network
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {network.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {item.profilePicture && !item.profilePicture.includes('blank-profile-picture') ? (
                            <img
                              src={item.profilePicture}
                              alt={`${item.firstName} ${item.lastName}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = parent.querySelector('.profile-fallback') as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <span className="profile-fallback w-full h-full items-center justify-center text-slate-500 text-sm font-semibold" style={{ display: (item.profilePicture && !item.profilePicture.includes('blank-profile-picture')) ? 'none' : 'flex' }}>
                            {(item.firstName?.[0] || '').toUpperCase()}{(item.lastName?.[0] || '').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900">
                            {item.firstName} {item.lastName}
                          </h3>
                        {item.jobTitle && (
                          <p className="text-sm text-slate-600 mt-1">{item.jobTitle}</p>
                        )}
                        {item.company && (
                          <p className="text-sm text-slate-500 mt-1">{item.company}</p>
                        )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {item.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Icon icon="mingcute:mail-line" width={16} height={16} />
                          <span className="truncate">{item.email}</span>
                        </div>
                      )}
                      {item.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Icon icon="mingcute:phone-line" width={16} height={16} />
                          <span>{item.phone}</span>
                        </div>
                      )}
                      {item.industry && (
                        <div className="text-slate-600">
                          <span className="font-medium">Industry:</span> {item.industry}
                        </div>
                      )}
                      {item.location && (
                        <div className="text-slate-600">
                          <span className="font-medium">Location:</span> {item.location}
                        </div>
                      )}
                      {item.connectionStrength && (
                        <div className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          Connection: {item.connectionStrength}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-200 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactInteractionsModal({
  isOpen,
  onClose,
  contact,
  interactions,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  contact: ProfessionalContact;
  interactions: ContactInteraction[];
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString?: string, timeString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      let formatted = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      if (timeString) {
        formatted += ` at ${timeString}`;
      }
      return formatted;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[110] p-2 sm:p-4 overflow-y-auto" style={{ paddingTop: '80px' }}>
      <div className="bg-white rounded-lg max-w-4xl w-full mb-4 sm:mb-8 flex flex-col shadow-xl max-h-[85vh] sm:max-h-[80vh]">
        <div className="p-4 sm:p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
                Interaction History
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 break-words">
                {contact.firstName} {contact.lastName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded flex-shrink-0"
            >
              <Icon icon="mingcute:close-line" width={24} height={24} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">
          <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
              <p className="mt-4 text-sm sm:text-base text-slate-600">Loading interactions...</p>
            </div>
          ) : interactions.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-2">
              <Icon icon="mingcute:history-line" width={48} height={48} className="mx-auto text-slate-300 mb-4 sm:w-16 sm:h-16" />
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No interactions found</h3>
              <p className="text-xs sm:text-sm text-slate-600 px-2">
                There are no recorded interactions, shared networking events, or referral requests with this contact yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <div className="text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4">
                {interactions.length} interaction{interactions.length !== 1 ? "s" : ""} found
              </div>
              <div className="space-y-3">
                {interactions.map((interaction) => (
                  <div
                    key={interaction.id}
                    className="bg-slate-50 rounded-lg border border-slate-200 p-3 sm:p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {interaction.source === "event" ? (
                            <Icon icon="mingcute:calendar-line" width={20} height={20} className="text-[#3351FD] flex-shrink-0" />
                          ) : interaction.source === "referral" ? (
                            <Icon icon="mingcute:user-recommend-line" width={20} height={20} className="text-[#3351FD] flex-shrink-0" />
                          ) : (
                            <Icon icon="mingcute:chat-3-line" width={20} height={20} className="text-[#3351FD] flex-shrink-0" />
                          )}
                          <h3 className="font-semibold text-slate-900 text-sm sm:text-base break-words">
                            {interaction.interactionType || "Interaction"}
                          </h3>
                          {interaction.source === "event" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-[#3351FD] whitespace-nowrap">
                              <Icon icon="mingcute:calendar-line" width={12} height={12} />
                              <span className="hidden sm:inline">Networking Event</span>
                              <span className="sm:hidden">Event</span>
                            </span>
                          )}
                          {interaction.source === "referral" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600 whitespace-nowrap">
                              <Icon icon="mingcute:user-recommend-line" width={12} height={12} />
                              <span className="hidden sm:inline">Referral Request</span>
                              <span className="sm:hidden">Referral</span>
                            </span>
                          )}
                        </div>
                        {interaction.source === "event" && interaction.eventName && (
                          <p className="text-xs sm:text-sm font-medium text-slate-700 mb-1 break-words">
                            {interaction.eventName}
                          </p>
                        )}
                        {interaction.source === "referral" && interaction.jobTitle && (
                          <p className="text-xs sm:text-sm font-medium text-slate-700 mb-1 break-words">
                            {interaction.jobTitle}
                            {interaction.jobCompany && ` at ${interaction.jobCompany}`}
                          </p>
                        )}
                        {interaction.summary && (
                          <p className="text-xs sm:text-sm text-slate-600 mb-2 break-words">{interaction.summary}</p>
                        )}
                        {interaction.notes && interaction.source !== "referral" && (
                          <p className="text-xs sm:text-sm text-slate-500 italic mb-2 break-words">{interaction.notes}</p>
                        )}
                        {interaction.source === "referral" && interaction.personalizedMessage && (
                          <p className="text-xs sm:text-sm text-slate-500 italic mb-2 border-l-2 border-purple-200 pl-2 sm:pl-3 break-words">
                            {interaction.personalizedMessage}
                          </p>
                        )}
                        {interaction.source === "referral" && interaction.responseContent && (
                          <div className="mt-2 p-2 sm:p-3 bg-green-50 rounded border border-green-200">
                            <p className="text-xs font-medium text-green-800 mb-1">Response:</p>
                            <p className="text-xs sm:text-sm text-green-700 break-words">{interaction.responseContent}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Icon icon="mingcute:time-line" width={14} height={14} className="flex-shrink-0" />
                        <span className="break-words">
                          {interaction.source === "event" && interaction.eventTime
                            ? formatDateTime(interaction.eventDate, interaction.eventTime)
                            : interaction.source === "referral" && interaction.sentAt
                            ? formatDate(interaction.sentAt)
                            : formatDate(interaction.interactionDate || interaction.createdAt)}
                        </span>
                      </div>
                      {interaction.source === "event" && interaction.location && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Icon icon="mingcute:map-pin-line" width={14} height={14} className="flex-shrink-0" />
                          <span className="break-words">{interaction.location}</span>
                        </div>
                      )}
                      {interaction.source === "event" && interaction.industry && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Icon icon="mingcute:briefcase-line" width={14} height={14} className="flex-shrink-0" />
                          <span className="break-words">{interaction.industry}</span>
                        </div>
                      )}
                      {interaction.source === "event" && interaction.userAttended && (
                        <div className="flex items-center gap-1 text-green-600 flex-shrink-0">
                          <Icon icon="mingcute:check-circle-line" width={14} height={14} className="flex-shrink-0" />
                          <span className="whitespace-nowrap">You attended</span>
                        </div>
                      )}
                      {interaction.source === "referral" && interaction.requestStatus && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                            interaction.requestStatus === "accepted" || interaction.requestStatus === "completed"
                              ? "bg-green-100 text-green-700"
                              : interaction.requestStatus === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : interaction.requestStatus === "declined" || interaction.requestStatus === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {interaction.requestStatus.charAt(0).toUpperCase() + interaction.requestStatus.slice(1)}
                          </span>
                        </div>
                      )}
                      {interaction.source === "referral" && interaction.referralSuccessful && (
                        <div className="flex items-center gap-1 text-green-600 flex-shrink-0">
                          <Icon icon="mingcute:check-circle-line" width={14} height={14} className="flex-shrink-0" />
                          <span className="whitespace-nowrap">Referral successful</span>
                        </div>
                      )}
                      {interaction.source === "referral" && interaction.responseReceivedAt && (
                        <div className="flex items-center gap-1 text-blue-600 flex-shrink-0">
                          <Icon icon="mingcute:mail-line" width={14} height={14} className="flex-shrink-0" />
                          <span className="break-words">
                            <span className="hidden sm:inline">Response received </span>
                            <span className="sm:hidden">Response </span>
                            {formatDate(interaction.responseReceivedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-200 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

