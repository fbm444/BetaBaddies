import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { NetworkROI, DateRange } from "../../types/analytics.types";

interface NetworkROIProps {
  dateRange?: DateRange;
}

type TabType = "overview" | "recruiters" | "linkedin" | "coffee-chats" | "search";

export function NetworkROI({ dateRange }: NetworkROIProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [roiData, setRoiData] = useState<NetworkROI | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [linkedInContacts, setLinkedInContacts] = useState<any[]>([]);
  const [coffeeChats, setCoffeeChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Message generation state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageData, setMessageData] = useState<any>(null);
  const [generatedMessage, setGeneratedMessage] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Search state
  const [searchIndustry, setSearchIndustry] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateRange, activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Always fetch ROI data and analytics
      const [roiResponse, analyticsResponse] = await Promise.all([
        api.getNetworkROI(dateRange),
        api.getNetworkingAnalytics(dateRange),
      ]);

      if (roiResponse.ok && roiResponse.data?.roi) {
        setRoiData(roiResponse.data.roi);
      }

      if (analyticsResponse.ok && analyticsResponse.data?.analytics) {
        setAnalytics(analyticsResponse.data.analytics);
      }

      // Fetch tab-specific data
      if (activeTab === "recruiters") {
        const recruitersResponse = await api.getRecruiters();
        if (recruitersResponse.ok && recruitersResponse.data?.recruiters) {
          setRecruiters(recruitersResponse.data.recruiters);
        }
      } else if (activeTab === "linkedin") {
        const linkedInResponse = await api.getLinkedInNetwork();
        if (linkedInResponse.ok && linkedInResponse.data?.contacts) {
          setLinkedInContacts(linkedInResponse.data.contacts);
        }
      } else if (activeTab === "coffee-chats") {
        const chatsResponse = await api.getCoffeeChats();
        if (chatsResponse.ok && chatsResponse.data?.chats) {
          setCoffeeChats(chatsResponse.data.chats);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch networking data:", err);
      setError(err.message || "Failed to load networking data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMessage = async (contact: any, messageType: string = "coffee_chat") => {
    try {
      setIsGenerating(true);
      setMessageData({ contact, messageType });
      const response = await api.generateNetworkingMessage({
        recipientName: contact.name || contact.fullName || `${contact.firstName} ${contact.lastName}`,
        recipientTitle: contact.title || contact.currentTitle,
        recipientCompany: contact.company || contact.currentCompany,
        messageType: messageType as any,
        personalContext: "",
      });

      if (response.ok && response.data?.message) {
        setGeneratedMessage(response.data.message);
        setShowMessageModal(true);
      }
    } catch (err: any) {
      console.error("Failed to generate message:", err);
      alert(err.message || "Failed to generate message");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchCompanies = async () => {
    if (!searchIndustry.trim()) return;

    try {
      setIsSearching(true);
      const response = await api.searchCompanies(searchIndustry);
      if (response.ok && response.data?.companies) {
        setSearchResults(response.data.companies);
      }
    } catch (err: any) {
      console.error("Failed to search companies:", err);
      alert(err.message || "Failed to search companies");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateCoffeeChat = async (contact: any) => {
    try {
      const response = await api.createCoffeeChat({
        contactName: contact.name || contact.fullName || `${contact.firstName} ${contact.lastName}`,
        contactEmail: contact.email || contact.recipientEmail,
        contactLinkedInUrl: contact.linkedInUrl || contact.profileUrl,
        contactCompany: contact.company || contact.currentCompany,
        contactTitle: contact.title || contact.currentTitle,
        chatType: "coffee_chat",
      });

      if (response.ok) {
        alert("Coffee chat created successfully!");
        fetchData();
      }
    } catch (err: any) {
      console.error("Failed to create coffee chat:", err);
      alert(err.message || "Failed to create coffee chat");
    }
  };

  if (isLoading && !roiData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#3351FD]" />
          <p className="text-sm text-[#6D7A99]">Loading networking data...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as TabType, label: "Overview", icon: "mingcute:chart-line" },
    { id: "recruiters" as TabType, label: "Recruiters", icon: "mingcute:user-line" },
    { id: "linkedin" as TabType, label: "LinkedIn Network", icon: "mingcute:linkedin-line" },
    { id: "coffee-chats" as TabType, label: "Coffee Chats", icon: "mingcute:chat-3-line" },
    { id: "search" as TabType, label: "Search", icon: "mingcute:search-line" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4 font-poppins">Network ROI</h2>
        <p className="text-slate-600 mb-6 font-poppins">
          Manage your networking activities, track coffee chats, connect with recruiters, and measure the impact on your job search.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 font-medium text-sm whitespace-nowrap flex items-center gap-2 flex-shrink-0 min-w-fit bg-transparent hover:bg-transparent focus:bg-transparent relative ${
                activeTab === tab.id ? "text-blue-500" : "text-slate-600"
              }`}
            >
              <Icon icon={tab.icon} width={18} />
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <OverviewTab
            roiData={roiData}
            analytics={analytics}
            isLoading={isLoading}
            error={error}
          />
        )}

        {activeTab === "recruiters" && (
          <RecruitersTab
            recruiters={recruiters}
            isLoading={isLoading}
            onGenerateMessage={handleGenerateMessage}
          />
        )}

        {activeTab === "linkedin" && (
          <LinkedInTab
            contacts={linkedInContacts}
            isLoading={isLoading}
            onGenerateMessage={handleGenerateMessage}
            onCreateCoffeeChat={handleCreateCoffeeChat}
          />
        )}

        {activeTab === "coffee-chats" && (
          <CoffeeChatsTab
            chats={coffeeChats}
            isLoading={isLoading}
            onRefresh={fetchData}
          />
        )}

        {activeTab === "search" && (
          <SearchTab
            searchIndustry={searchIndustry}
            setSearchIndustry={setSearchIndustry}
            searchResults={searchResults}
            isSearching={isSearching}
            onSearch={handleSearchCompanies}
            onGenerateMessage={handleGenerateMessage}
            onCreateCoffeeChat={handleCreateCoffeeChat}
          />
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && generatedMessage && messageData && (
        <MessageModal
          message={generatedMessage}
          contact={messageData.contact}
          onClose={() => {
            setShowMessageModal(false);
            setGeneratedMessage(null);
            setMessageData(null);
          }}
          onSave={async () => {
            try {
              await api.saveNetworkingMessage({
                messageType: generatedMessage.messageType,
                recipientName: messageData.contact.name || messageData.contact.fullName,
                recipientEmail: messageData.contact.email,
                recipientLinkedInUrl: messageData.contact.linkedInUrl || messageData.contact.profileUrl,
                subject: generatedMessage.subject,
                messageBody: generatedMessage.messageBody,
              });
              alert("Message saved successfully!");
              setShowMessageModal(false);
            } catch (err: any) {
              console.error("Failed to save message:", err);
              alert(err.message || "Failed to save message");
            }
          }}
        />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ roiData, analytics, isLoading, error }: any) {
  if (error) {
    return (
      <div className="rounded-2xl border border-[#F5C4C4] bg-[#FDECEC] p-10 text-center">
        <Icon icon="mingcute:alert-line" className="mx-auto mb-3 text-red-500" width={40} />
        <p className="text-sm font-medium text-red-700">{error}</p>
      </div>
    );
  }

  const referralRate =
    roiData?.overall.totalActivities > 0
      ? Math.round((roiData.overall.referrals / roiData.overall.totalActivities) * 100 * 10) / 10
      : 0;

  const opportunityRate =
    roiData?.overall.totalActivities > 0
      ? Math.round(
          (roiData.overall.opportunitiesFromNetwork / roiData.overall.totalActivities) * 100 * 10
        ) / 10
      : 0;

  const responseRate = analytics?.overall?.responseRate || 0;
  const referralRateFromChats = analytics?.overall?.referralRate || 0;

  return (
    <div className="space-y-6">
      {/* Overall Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-gradient-to-b from-[#1E3097] to-[#3351FD] p-6 text-white min-h-[160px] flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[18px] font-normal">Total Activities</p>
            <Icon icon="mingcute:user-community-line" width={24} className="text-white" />
          </div>
          <p className="text-5xl font-medium leading-none text-[#E7EFFF]">
            {roiData?.overall.totalActivities || 0}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 border border-[#E4E8F5] min-h-[160px] flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[18px] font-normal text-[#0F1D3A]">Response Rate</p>
            <Icon icon="mingcute:mail-line" width={20} className="text-[#09244B]" />
          </div>
          <div className="flex items-end gap-3">
            <p className="text-5xl font-extralight text-[#5A87E6]">{responseRate}%</p>
            <p className="text-xs text-[#6D7A99] mb-1">
              {analytics?.overall?.responsesReceived || 0} responses
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 border border-[#E4E8F5] min-h-[160px] flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[18px] font-normal text-[#0F1D3A]">Referrals</p>
            <Icon icon="mingcute:user-add-line" width={20} className="text-[#09244B]" />
          </div>
          <div className="flex items-end gap-3">
            <p className="text-5xl font-extralight text-[#5A87E6]">
              {analytics?.overall?.referralsReceived || roiData?.overall.referrals || 0}
            </p>
            <p className="text-xs text-[#6D7A99] mb-1">{referralRateFromChats}% rate</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 border border-[#E4E8F5] min-h-[160px] flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[18px] font-normal text-[#0F1D3A]">Coffee Chats</p>
            <Icon icon="mingcute:chat-3-line" width={20} className="text-[#09244B]" />
          </div>
          <div className="flex items-end gap-3">
            <p className="text-5xl font-extralight text-[#5A87E6]">
              {analytics?.overall?.totalChats || 0}
            </p>
            <p className="text-xs text-[#6D7A99] mb-1">
              {analytics?.overall?.upcomingChats || 0} upcoming
            </p>
          </div>
        </div>
      </div>

      {/* Coffee Chat Stats */}
      {analytics && (
        <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
          <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Coffee Chat Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]">
              <p className="text-xs text-[#6D7A99] mb-1">Messages Sent</p>
              <p className="text-2xl font-semibold text-[#3351FD]">
                {analytics.overall.messagesSent || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]">
              <p className="text-xs text-[#6D7A99] mb-1">Responses Received</p>
              <p className="text-2xl font-semibold text-[#3351FD]">
                {analytics.overall.responsesReceived || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]">
              <p className="text-xs text-[#6D7A99] mb-1">Linked to Opportunities</p>
              <p className="text-2xl font-semibold text-[#3351FD]">
                {analytics.overall.chatsLinkedToOpportunities || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activities by Type */}
      {roiData?.byType && roiData.byType.length > 0 && (
        <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
          <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Activities by Type</h3>
          <div className="space-y-3">
            {roiData.byType
              .filter((item: any) => item.type != null)
              .map((item: any, index: number) => {
                const referralPercent =
                  item.count > 0 ? Math.round((item.referrals / item.count) * 100 * 10) / 10 : 0;
                const opportunityPercent =
                  item.count > 0
                    ? Math.round((item.opportunities / item.count) * 100 * 10) / 10
                    : 0;

                return (
                  <div key={index} className="p-4 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-[#0F1D3A]">
                        {item.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-[#6D7A99]">{item.count} activities</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 rounded-lg bg-white">
                        <p className="text-xs text-[#6D7A99] mb-1">Referrals</p>
                        <div className="flex items-baseline gap-1">
                          <p className="text-lg font-semibold text-[#3351FD]">{item.referrals}</p>
                          <p className="text-xs text-[#6D7A99]">({referralPercent}%)</p>
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white">
                        <p className="text-xs text-[#6D7A99] mb-1">Opportunities</p>
                        <div className="flex items-baseline gap-1">
                          <p className="text-lg font-semibold text-[#3351FD]">
                            {item.opportunities}
                          </p>
                          <p className="text-xs text-[#6D7A99]">({opportunityPercent}%)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// Recruiters Tab Component
function RecruitersTab({ recruiters, isLoading, onGenerateMessage }: any) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#3351FD]" />
          <p className="text-sm text-[#6D7A99]">Loading recruiters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-600">
          Recruiters extracted from your job opportunities. Connect with them to build relationships.
        </p>
      </div>

      {recruiters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E4E8F5] bg-[#F8F8F8] p-10 text-center">
          <Icon icon="mingcute:user-line" className="mx-auto mb-3 text-[#6D7A99]" width={48} />
          <p className="text-sm text-[#6D7A99]">
            No recruiters found. Add recruiter information to your job opportunities to see them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recruiters.map((recruiter: any, index: number) => (
            <div
              key={index}
              className="rounded-xl bg-white p-6 border border-[#E4E8F5] hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F1D3A]">{recruiter.name}</h3>
                  {recruiter.company && (
                    <p className="text-sm text-[#6D7A99] mt-1">{recruiter.company}</p>
                  )}
                </div>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                  {recruiter.opportunityCount} {recruiter.opportunityCount === 1 ? "role" : "roles"}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {recruiter.email && (
                  <div className="flex items-center gap-2 text-sm text-[#6D7A99]">
                    <Icon icon="mingcute:mail-line" width={16} />
                    <span>{recruiter.email}</span>
                  </div>
                )}
                {recruiter.phone && (
                  <div className="flex items-center gap-2 text-sm text-[#6D7A99]">
                    <Icon icon="mingcute:phone-line" width={16} />
                    <span>{recruiter.phone}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onGenerateMessage(recruiter, "coffee_chat")}
                className="w-full px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#1E3097] transition-colors text-sm font-medium"
              >
                Generate Message
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// LinkedIn Tab Component
function LinkedInTab({ contacts, isLoading, onGenerateMessage, onCreateCoffeeChat }: any) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#3351FD]" />
          <p className="text-sm text-[#6D7A99]">Loading LinkedIn network...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-600">
          Your LinkedIn network contacts. Connect with them for coffee chats and networking.
        </p>
        <button
          onClick={() => {
            // TODO: Implement LinkedIn sync
            alert("LinkedIn sync feature coming soon!");
          }}
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          <Icon icon="mingcute:refresh-line" width={16} className="inline mr-2" />
          Sync Network
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E4E8F5] bg-[#F8F8F8] p-10 text-center">
          <Icon icon="mingcute:linkedin-line" className="mx-auto mb-3 text-[#6D7A99]" width={48} />
          <p className="text-sm text-[#6D7A99] mb-4">
            No LinkedIn contacts found. Connect your LinkedIn account to see your network.
          </p>
          <button
            onClick={() => {
              // TODO: Implement LinkedIn OAuth
              alert("LinkedIn connection feature coming soon!");
            }}
            className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#1E3097] transition-colors"
          >
            Connect LinkedIn
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact: any, index: number) => (
            <div
              key={index}
              className="rounded-xl bg-white p-6 border border-[#E4E8F5] hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 mb-4">
                {contact.profilePictureUrl && (
                  <img
                    src={contact.profilePictureUrl}
                    alt={contact.fullName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#0F1D3A]">
                    {contact.fullName || `${contact.firstName} ${contact.lastName}`}
                  </h3>
                  {contact.headline && (
                    <p className="text-sm text-[#6D7A99] mt-1 line-clamp-2">{contact.headline}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {contact.company && (
                  <div className="flex items-center gap-2 text-sm text-[#6D7A99]">
                    <Icon icon="mingcute:building-2-line" width={16} />
                    <span>{contact.company}</span>
                  </div>
                )}
                {contact.title && (
                  <div className="flex items-center gap-2 text-sm text-[#6D7A99]">
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
                <button
                  onClick={() => onGenerateMessage(contact, "coffee_chat")}
                  className="flex-1 px-3 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#1E3097] transition-colors text-sm font-medium"
                >
                  Message
                </button>
                <button
                  onClick={() => onCreateCoffeeChat(contact)}
                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  Add Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Coffee Chats Tab Component
function CoffeeChatsTab({ chats, isLoading, onRefresh }: any) {
  const [filterStatus, setFilterStatus] = useState<string>("all");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#3351FD]" />
          <p className="text-sm text-[#6D7A99]">Loading coffee chats...</p>
        </div>
      </div>
    );
  }

  const filteredChats =
    filterStatus === "all"
      ? chats
      : chats.filter((chat: any) => chat.status === filterStatus);

  const upcomingChats = chats.filter((chat: any) => chat.status === "upcoming");
  const completedChats = chats.filter((chat: any) => chat.status === "completed");

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: "all", label: "All", count: chats.length },
          { id: "upcoming", label: "Upcoming", count: upcomingChats.length },
          { id: "completed", label: "Completed", count: completedChats.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-4 py-2 font-medium text-sm relative ${
              filterStatus === tab.id ? "text-blue-500" : "text-slate-600"
            }`}
          >
            {tab.label} ({tab.count})
            {filterStatus === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
            )}
          </button>
        ))}
      </div>

      {filteredChats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E4E8F5] bg-[#F8F8F8] p-10 text-center">
          <Icon icon="mingcute:chat-3-line" className="mx-auto mb-3 text-[#6D7A99]" width={48} />
          <p className="text-sm text-[#6D7A99]">
            No coffee chats found. Start networking to track your conversations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChats.map((chat: any) => (
            <div
              key={chat.id}
              className="rounded-xl bg-white p-6 border border-[#E4E8F5] hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F1D3A]">{chat.contactName}</h3>
                  {chat.contactCompany && (
                    <p className="text-sm text-[#6D7A99] mt-1">{chat.contactCompany}</p>
                  )}
                  {chat.jobTitle && chat.jobCompany && (
                    <p className="text-xs text-blue-600 mt-1">
                      Linked to: {chat.jobTitle} at {chat.jobCompany}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    chat.status === "upcoming"
                      ? "bg-blue-100 text-blue-700"
                      : chat.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {chat.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {chat.scheduledDate && (
                  <div>
                    <p className="text-xs text-[#6D7A99] mb-1">Scheduled</p>
                    <p className="text-sm font-medium text-[#0F1D3A]">
                      {new Date(chat.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {chat.responseReceived && (
                  <div>
                    <p className="text-xs text-[#6D7A99] mb-1">Response</p>
                    <p className="text-sm font-medium text-green-600">Received</p>
                  </div>
                )}
                {chat.referralProvided && (
                  <div>
                    <p className="text-xs text-[#6D7A99] mb-1">Referral</p>
                    <p className="text-sm font-medium text-blue-600">Provided</p>
                  </div>
                )}
              </div>

              {chat.notes && (
                <p className="text-sm text-[#6D7A99] mb-4">{chat.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Search Tab Component
function SearchTab({
  searchIndustry,
  setSearchIndustry,
  searchResults,
  isSearching,
  onSearch,
  onGenerateMessage,
  onCreateCoffeeChat,
}: any) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 border border-[#E4E8F5]">
        <h3 className="text-lg font-semibold text-[#0F1D3A] mb-4">Search Companies by Industry</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchIndustry}
            onChange={(e) => setSearchIndustry(e.target.value)}
            placeholder="e.g., semiconductor, technology, finance"
            className="flex-1 px-4 py-2 border border-[#E4E8F5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3351FD]"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                onSearch();
              }
            }}
          />
          <button
            onClick={onSearch}
            disabled={isSearching || !searchIndustry.trim()}
            className="px-6 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#1E3097] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
        <p className="text-xs text-[#6D7A99] mt-2">
          Search for large companies in your target industry (e.g., "semiconductor" will show NVIDIA, AMD, etc.)
        </p>
      </div>

      {searchResults.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[#0F1D3A] mb-4">Search Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((company: any, index: number) => (
              <div
                key={index}
                className="rounded-xl bg-white p-6 border border-[#E4E8F5] hover:shadow-md transition-shadow"
              >
                <h4 className="text-lg font-semibold text-[#0F1D3A] mb-2">{company.name}</h4>
                <p className="text-sm text-[#6D7A99] mb-4">{company.industry}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // TODO: Search for contacts at this company
                      alert(`Searching for contacts at ${company.name}...`);
                    }}
                    className="flex-1 px-3 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#1E3097] transition-colors text-sm font-medium"
                  >
                    Find Contacts
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Message Modal Component
function MessageModal({ message, contact, onClose, onSave }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-[#0F1D3A]">Generated Message</h2>
          <button
            onClick={onClose}
            className="p-2 text-[#6D7A99] hover:text-[#0F1D3A] transition-colors"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F1D3A] mb-1">To</label>
            <p className="text-sm text-[#6D7A99]">
              {contact.name || contact.fullName || `${contact.firstName} ${contact.lastName}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F1D3A] mb-1">Subject</label>
            <input
              type="text"
              value={message.subject}
              readOnly
              className="w-full px-4 py-2 border border-[#E4E8F5] rounded-lg bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F1D3A] mb-1">Message</label>
            <textarea
              value={message.messageBody}
              readOnly
              rows={10}
              className="w-full px-4 py-2 border border-[#E4E8F5] rounded-lg bg-slate-50"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-[#E4E8F5]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#6D7A99] hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#1E3097] transition-colors"
          >
            Save Message
          </button>
        </div>
      </div>
    </div>
  );
}
