import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";

interface Email {
  id: string;
  gmailMessageId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  threadId?: string;
  suggestedStatus?: string;
}

interface LinkedEmail extends Email {
  emailLinkId: string;
  linkedAt: string;
}

interface EmailSidebarProps {
  jobOpportunityId: string;
  companyName: string;
  jobTitle: string;
  onEmailLinked?: () => void;
}

export function EmailSidebar({
  jobOpportunityId,
  companyName,
  jobTitle,
  onEmailLinked,
}: EmailSidebarProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allEmails, setAllEmails] = useState<Email[]>([]); // Store all loaded emails
  const [linkedEmails, setLinkedEmails] = useState<LinkedEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"recent" | "linked">("recent");
  const [error, setError] = useState<string | null>(null);
  const [hasMoreEmails, setHasMoreEmails] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    checkConnection();
    loadLinkedEmails();
  }, [jobOpportunityId]);

  useEffect(() => {
    if (isConnected && allEmails.length === 0) {
      loadAllEmails(false);
    }
  }, [isConnected]);

  // Auto-set search query to company name when connected (but don't auto-search)
  useEffect(() => {
    if (isConnected && companyName && !searchQuery) {
      // Pre-fill search with company name but don't perform search
      // User can clear it or modify it to filter
      setSearchQuery(companyName);
    }
  }, [isConnected, companyName]);

  const checkConnection = async () => {
    try {
      const response = await api.getGmailStatus();
      setIsConnected(response.data?.status?.connected || false);
    } catch (err: any) {
      console.error("Failed to check Gmail connection:", err);
      setIsConnected(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getGmailAuthUrl();
      const authUrl = response.data?.authUrl;
      if (!authUrl) {
        throw new Error("Failed to get authorization URL");
      }

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        "Gmail Authorization",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        setError("Popup blocked. Please allow popups for this site and try again.");
        setIsLoading(false);
        return;
      }

      let messageReceived = false;
      let connectionChecked = false;
      let connectionPoll: ReturnType<typeof setInterval> | null = null;
      let checkClosed: ReturnType<typeof setInterval> | null = null;
      let popupCheckDelay: ReturnType<typeof setTimeout> | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      // Cleanup function
      const cleanup = () => {
        if (connectionPoll) {
          clearInterval(connectionPoll);
          connectionPoll = null;
        }
        if (checkClosed) {
          clearInterval(checkClosed);
          checkClosed = null;
        }
        if (popupCheckDelay) {
          clearTimeout(popupCheckDelay);
          popupCheckDelay = null;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        window.removeEventListener("message", messageListener);
      };

      // Listen for OAuth callback
      const messageListener = (event: MessageEvent) => {
        // Only process gmail_oauth messages once
        if (messageReceived) {
          return;
        }
        
        // Filter: Only process messages that are Gmail OAuth messages
        // Check for the specific structure we expect from the callback page
        // Ignore all other messages (browser extensions, other components, etc.)
        if (!event.data || typeof event.data !== 'object' || event.data.type !== "gmail_oauth") {
          return;
        }
        
        console.log("📧 Received Gmail OAuth message from origin:", event.origin, "status:", event.data.status);
        
        messageReceived = true;
        cleanup();
        
        if (event.data.status === "success") {
          console.log("✅ Gmail OAuth success received");
          setIsConnected(true);
          setError(null);
          
          // Wait a bit for backend to save tokens, then verify connection
          setTimeout(async () => {
            await checkConnection();
            connectionChecked = true;
            setIsLoading(false);
            
            // Load emails after connection is confirmed
            loadAllEmails(false);
            loadLinkedEmails();
          }, 1500);
        } else {
          console.error("❌ Gmail OAuth error:", event.data.error);
          const errorMsg = event.data.error === 'no_code' 
            ? "OAuth authorization was cancelled or incomplete. Please try again."
            : event.data.error || "Failed to connect Gmail";
          setError(errorMsg);
          setIsLoading(false);
          connectionChecked = true;
        }
        
        // Try to close popup (may fail due to COOP, but that's okay)
        try {
          if (popup) {
            // Don't check popup.closed due to COOP restrictions - just try to close
            try {
              popup.close();
            } catch (e) {
              // COOP may block this, ignore the error
              console.log("Could not close popup (COOP restriction):", e);
            }
          }
        } catch (e) {
          // COOP may block this, ignore the error
          console.log("Could not close popup (COOP restriction):", e);
        }
      };

      window.addEventListener("message", messageListener, { once: false });

      // Wait a bit before checking if popup was closed (allow time for OAuth redirect)
      popupCheckDelay = setTimeout(() => {
        // Only start checking if popup was closed after initial OAuth flow has time to start
        checkClosed = setInterval(() => {
          // Don't check if we already received a message or checked connection
          if (messageReceived || connectionChecked) {
            return;
          }
          
          // Skip checking if popup is closed due to COOP restrictions
          // COOP blocks access to popup.closed during OAuth redirect
          // We rely on postMessage and connection polling instead
          // This check is intentionally disabled to avoid COOP errors
        }, 2000); // Check every 2 seconds
      }, 5000); // Wait 5 seconds before checking (OAuth redirect takes time)

      // Poll connection status periodically (fallback if message doesn't arrive)
      connectionPoll = setInterval(async () => {
        if (messageReceived || connectionChecked) {
          cleanup();
          return;
        }
        
        try {
          const statusResponse = await api.getGmailStatus();
          if (statusResponse.data?.status?.connected) {
            console.log("✅ Connection detected via polling");
            messageReceived = true;
            connectionChecked = true;
            cleanup();
            setIsConnected(true);
            setIsLoading(false);
            setError(null);
            loadAllEmails();
            loadLinkedEmails();
            
            // Try to close popup
            try {
              if (popup) {
                // Check if popup is closed before attempting to close it
                let isClosed = false;
                try {
                  isClosed = popup.closed;
                } catch (e) {
                  // COOP may block access to popup.closed, just try to close anyway
                  isClosed = false;
                }
                
                if (!isClosed) {
                  popup.close();
                }
              }
            } catch (e) {
              // COOP may block this, ignore the error
              console.log("Could not close popup (COOP restriction):", e);
            }
          }
        } catch (err) {
          // Connection not ready yet, continue polling
          console.log("Polling for connection...");
        }
      }, 2000);

      // Timeout after 2 minutes (reduced from 5 minutes)
      timeoutId = setTimeout(() => {
        if (!messageReceived && !connectionChecked) {
          cleanup();
          setIsLoading(false);
          setError("Connection timeout. Please try again or check if the popup was blocked.");
        }
      }, 120000);
    } catch (err: any) {
      console.error("Failed to connect Gmail:", err);
      setError(err.message || "Failed to connect Gmail");
      setIsLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      setIsLoading(true);
      await api.disconnectGmail();
      setIsConnected(false);
      setAllEmails([]);
      setLinkedEmails([]);
      setSearchQuery("");
    } catch (err: any) {
      console.error("Failed to disconnect Gmail:", err);
      setError(err.message || "Failed to disconnect Gmail");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllEmails = async (append = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setCurrentPage(0);
      }
      setError(null);
      console.log(`📧 Starting to load emails... (append: ${append}, page: ${currentPage})`);
      
      // Load 20 emails per page, skip already loaded emails
      const skip = append ? allEmails.length : 0;
      const limit = 20;
      const response = await api.getRecentGmailEmails(365, limit + skip);
      const newEmails = response.data?.emails || [];
      
      // If appending, get only the new emails (skip the ones we already have)
      const emailsToAdd = append 
        ? newEmails.slice(skip) 
        : newEmails.slice(0, limit);
      
      console.log(`📧 API returned ${newEmails.length} total emails, adding ${emailsToAdd.length} new emails`);
      
      if (append) {
        setAllEmails([...allEmails, ...emailsToAdd]);
      } else {
        setAllEmails(emailsToAdd);
      }
      
      // Check if there are more emails to load
      setHasMoreEmails(newEmails.length > (append ? allEmails.length + limit : limit));
      setCurrentPage(currentPage + (append ? 1 : 0));
      
      if (!append && emailsToAdd.length === 0) {
        console.warn("⚠️ No emails returned from API");
        setError("No emails found. Make sure your Gmail account has emails and try refreshing.");
      }
    } catch (err: any) {
      console.error("❌ Failed to load emails:", err);
      console.error("❌ Error details:", err.response?.data || err.message);
      setError(err.message || "Failed to load emails. Please check the console for details.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    loadAllEmails(true);
  };

  const loadLinkedEmails = async () => {
    try {
      const response = await api.getLinkedEmails(jobOpportunityId);
      setLinkedEmails(response.data?.emails || []);
    } catch (err: any) {
      console.error("Failed to load linked emails:", err);
    }
  };

  // Filter emails client-side based on search query (by email subject/heading)
  const getFilteredEmails = (): Email[] => {
    if (!searchQuery.trim()) {
      return allEmails;
    }

    const query = searchQuery.toLowerCase().trim();
    const queryTerms = query.split(/\s+/).filter(term => term.length > 0);

    return allEmails.filter(email => {
      // Check if any search term matches the email subject/heading
      const subjectText = (email.subject || "").toLowerCase();
      return queryTerms.some(term => subjectText.includes(term));
    });
  };

  const handleLinkEmail = async (email: Email) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("🔗 Linking email:", { jobOpportunityId, gmailMessageId: email.gmailMessageId });
      
      if (!jobOpportunityId) {
        throw new Error("Job opportunity ID is missing");
      }
      if (!email.gmailMessageId) {
        throw new Error("Gmail message ID is missing from email");
      }
      
      await api.linkEmailToJob(jobOpportunityId, email.gmailMessageId);
      await loadLinkedEmails();
      if (onEmailLinked) {
        onEmailLinked();
      }
    } catch (err: any) {
      console.error("❌ Failed to link email:", err);
      console.error("❌ Error details:", err.response?.data || err.message);
      setError(err.response?.data?.error?.message || err.message || "Failed to link email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlinkEmail = async (emailLinkId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await api.unlinkEmailFromJob(emailLinkId, jobOpportunityId);
      await loadLinkedEmails();
    } catch (err: any) {
      console.error("Failed to unlink email:", err);
      setError(err.response?.data?.error?.message || err.message || "Failed to unlink email");
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailLinked = (gmailMessageId: string) => {
    return linkedEmails.some((email) => email.gmailMessageId === gmailMessageId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return "bg-slate-100 text-slate-600";
    const lower = status.toLowerCase();
    if (lower.includes("interview")) return "bg-blue-100 text-blue-700";
    if (lower.includes("offer")) return "bg-green-100 text-green-700";
    if (lower.includes("rejection") || lower.includes("reject")) return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-600";
  };

  if (!isConnected) {
    return (
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Email Integration</h3>
          <p className="text-sm text-slate-600 mb-4">
            Connect your Gmail account to link emails to this job application.
          </p>
          <button
            onClick={handleConnectGmail}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                <Icon icon="mingcute:mail-line" width={18} />
                Connect Gmail
              </>
            )}
          </button>
          {error && (
            <p className="text-xs text-red-600 mt-2">{error}</p>
          )}
        </div>
      </div>
    );
  }

  const displayEmails = activeTab === "recent" ? getFilteredEmails() : [];

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900">Email Integration</h3>
          <button
            onClick={handleDisconnectGmail}
            disabled={isLoading}
            className="text-xs text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
            title="Disconnect Gmail"
          >
            <Icon icon="mingcute:unlink-line" width={16} />
          </button>
        </div>

        {/* Search Bar - Always visible when connected */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                // Filtering happens automatically, just ensure we're on recent tab
                setActiveTab("recent");
              }
            }}
            placeholder={`Search by email subject (e.g., "${companyName}")...`}
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery.trim() && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              title="Clear search"
            >
              <Icon icon="mingcute:close-line" width={18} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab("recent")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === "recent"
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Emails {searchQuery.trim() && `(${getFilteredEmails().length}/${allEmails.length})`}
          </button>
          <button
            onClick={() => setActiveTab("linked")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === "linked"
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Linked ({linkedEmails.length})
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && activeTab !== "linked" ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : activeTab === "linked" ? (
          linkedEmails.length > 0 ? (
            <div className="p-2 space-y-2">
              {linkedEmails
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((email) => (
                  <div
                    key={email.emailLinkId}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {email.subject}
                        </p>
                        <p className="text-xs text-slate-600 truncate">{email.from}</p>
                      </div>
                      <button
                        onClick={() => handleUnlinkEmail(email.emailLinkId)}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Unlink email"
                      >
                        <Icon icon="mingcute:unlink-line" width={16} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 mb-2">{email.snippet}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{formatDate(email.date)}</span>
                      {email.suggestedStatus && (
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${getStatusColor(
                            email.suggestedStatus
                          )}`}
                        >
                          {email.suggestedStatus}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Icon icon="mingcute:mail-line" width={48} className="text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No linked emails yet</p>
            </div>
          )
        ) : activeTab === "recent" && displayEmails.length > 0 ? (
          <div className="p-2 space-y-2">
            {displayEmails.map((email) => {
              const linked = isEmailLinked(email.gmailMessageId);
              return (
                <div
                  key={email.id}
                  className={`p-3 border rounded-lg transition-colors ${
                    linked
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {email.subject}
                      </p>
                      <p className="text-xs text-slate-600 truncate">{email.from}</p>
                    </div>
                    {linked && (
                      <Icon
                        icon="mingcute:check-circle-fill"
                        width={16}
                        className="text-blue-500 flex-shrink-0"
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-2">{email.snippet}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{formatDate(email.date)}</span>
                    <div className="flex items-center gap-2">
                      {email.suggestedStatus && (
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${getStatusColor(
                            email.suggestedStatus
                          )}`}
                        >
                          {email.suggestedStatus}
                        </span>
                      )}
                      {!linked && (
                        <button
                          onClick={() => handleLinkEmail(email)}
                          disabled={isLoading}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                          title="Link to job application"
                        >
                          Link
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Load More Button */}
            {!searchQuery.trim() && hasMoreEmails && (
              <div className="pt-2 pb-2">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Icon icon="mingcute:arrow-down-line" width={16} />
                      Load More Emails
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Icon icon="mingcute:mail-line" width={48} className="text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">
              {searchQuery.trim()
                ? `No emails match "${searchQuery}". Try different keywords.`
                : "No emails found"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

