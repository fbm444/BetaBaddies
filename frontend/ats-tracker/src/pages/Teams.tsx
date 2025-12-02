import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";
import { ChatWindow } from "../components/chat/ChatWindow";
import { ChatList } from "../components/chat/ChatList";
import { TeamDashboard } from "../components/team/TeamDashboard";
import { TeamPerformance } from "../components/team/TeamPerformance";
import { MilestoneCelebration } from "../components/team/MilestoneCelebration";
import { JobCollaboration } from "../components/team/JobCollaboration";
import { DocumentViewer } from "../components/team/DocumentViewer";
import { JobOpportunityDetailModal } from "../components/JobOpportunityDetailModal";

export function Teams() {
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId?: string }>();
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("candidate");
  const [invitations, setInvitations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showCreateConversationModal, setShowCreateConversationModal] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [teamConversations, setTeamConversations] = useState<any[]>([]);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "performance" | "members" | "conversations" | "shared-jobs" | "documents">("dashboard");
  const [sharedJobs, setSharedJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [viewingJobDetail, setViewingJobDetail] = useState<any | null>(null);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [sharedDocuments, setSharedDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; email: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  // Fetch current user ID on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userResponse = await api.getUserAuth();
        if (userResponse.ok && userResponse.data?.user?.id) {
          setCurrentUserId(userResponse.data.user.id);
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (teamId) {
      fetchTeamDetails(teamId);
    }
  }, [teamId]);

  // Fetch conversations when switching to conversations tab
  useEffect(() => {
    if (activeTab === "conversations" && selectedTeam && teamConversations.length === 0) {
      fetchTeamConversations(selectedTeam.id);
    }
  }, [activeTab, selectedTeam]);

  // Fetch shared jobs when switching to shared-jobs tab
  useEffect(() => {
    if (activeTab === "shared-jobs" && selectedTeam) {
      fetchSharedJobs(selectedTeam.id);
    }
  }, [activeTab, selectedTeam]);

  // Fetch shared documents when switching to documents tab
  useEffect(() => {
    if (activeTab === "documents" && selectedTeam) {
      fetchSharedDocuments(selectedTeam.id);
    }
  }, [activeTab, selectedTeam]);

  // Refresh invitations when switching to members tab
  useEffect(() => {
    if (activeTab === "members" && selectedTeam) {
      const refreshInvitations = async () => {
        try {
          const invitationsResponse = await api.getTeamInvitations(selectedTeam.id);
          if (invitationsResponse.ok && invitationsResponse.data) {
            setInvitations(invitationsResponse.data.invitations || []);
          }
        } catch (error) {
          console.error("Failed to refresh invitations:", error);
        }
      };
      refreshInvitations();
    }
  }, [activeTab, selectedTeam]);

  const fetchSharedJobs = async (teamId: string) => {
    try {
      const response = await api.getSharedJobs(teamId);
      if (response.ok && response.data) {
        setSharedJobs(response.data.jobs || []);
      }
    } catch (error) {
      console.error("Failed to fetch shared jobs:", error);
    }
  };

  const handleViewJobDetail = async (jobId: string) => {
    try {
      // First try to get from shared jobs (already loaded)
      const sharedJob = sharedJobs.find(job => job.id === jobId);
      if (sharedJob) {
        // Transform shared job data to match JobOpportunityData format
        const jobData = {
          id: sharedJob.id,
          title: sharedJob.title,
          company: sharedJob.company,
          location: sharedJob.location,
          salaryMin: sharedJob.salaryMin,
          salaryMax: sharedJob.salaryMax,
          jobPostingUrl: sharedJob.jobPostingUrl,
          applicationDeadline: sharedJob.applicationDeadline,
          description: sharedJob.description,
          industry: sharedJob.industry,
          jobType: sharedJob.jobType,
          status: sharedJob.status,
          notes: sharedJob.notes,
          recruiterName: sharedJob.recruiterName,
          recruiterEmail: sharedJob.recruiterEmail,
          recruiterPhone: sharedJob.recruiterPhone,
          hiringManagerName: sharedJob.hiringManagerName,
          hiringManagerEmail: sharedJob.hiringManagerEmail,
          hiringManagerPhone: sharedJob.hiringManagerPhone,
          salaryNegotiationNotes: sharedJob.salaryNegotiationNotes,
          interviewNotes: sharedJob.interviewNotes,
          applicationHistory: sharedJob.applicationHistory || [],
          statusUpdatedAt: sharedJob.statusUpdatedAt,
          archived: sharedJob.archived,
          archivedAt: sharedJob.archivedAt,
          archiveReason: sharedJob.archiveReason,
          createdAt: sharedJob.createdAt,
          updatedAt: sharedJob.updatedAt,
        };
        setViewingJobDetail(jobData);
      } else {
        // Fallback to API call if not found in shared jobs
        const response = await api.getJobOpportunity(jobId);
        if (response.ok && response.data?.jobOpportunity) {
          setViewingJobDetail(response.data.jobOpportunity);
        } else {
          console.error("Failed to fetch job details:", response);
          alert("Failed to load job details. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
      alert("Failed to load job details. Please try again.");
    }
  };

  const fetchSharedDocuments = async (teamId: string) => {
    try {
      setIsLoadingDocuments(true);
      const response = await api.getSharedDocuments(teamId);
      if (response.ok && response.data) {
        setSharedDocuments(response.data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch shared documents:", error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await api.getUserTeams();
      if (response.ok && response.data) {
        const fetchedTeams = response.data.teams || [];
        setTeams(fetchedTeams);
        // If we have teams but no teamId in URL, navigate to first team
        if (fetchedTeams.length > 0 && !teamId) {
          navigate(`/collaboration/teams/${fetchedTeams[0].id}`);
        }
        // If we have a teamId in URL, make sure we fetch its details
        if (teamId && fetchedTeams.some((t: any) => t.id === teamId)) {
          fetchTeamDetails(teamId);
        }
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamDetails = async (id: string) => {
    try {
      const [teamResponse, dashboardResponse, invitationsResponse] = await Promise.all([
        api.getTeamById(id),
        api.getTeamDashboard(id),
        api.getTeamInvitations(id),
      ]);

      if (teamResponse.ok && teamResponse.data) {
        setSelectedTeam(teamResponse.data.team);
      }

      if (dashboardResponse.ok && dashboardResponse.data) {
        setDashboard(dashboardResponse.data.dashboard);
      }

      // Always use invitations from the dedicated invitations endpoint
      // This ensures we get all invitations including pending ones
      if (invitationsResponse.ok && invitationsResponse.data) {
        const allInvitations = invitationsResponse.data.invitations || [];
        setInvitations(allInvitations);
      } else if (teamResponse.ok && teamResponse.data?.team?.invitations) {
        // Fallback to team response invitations if dedicated endpoint fails
        setInvitations(teamResponse.data.team.invitations);
      } else {
        // If no invitations found, set empty array
        setInvitations([]);
      }

      // Fetch all team conversations
      await fetchTeamConversations(id);
    } catch (error) {
      console.error("Failed to fetch team details:", error);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const teamData = {
      teamName: formData.get("teamName") as string,
      teamType: formData.get("teamType") as string,
      billingEmail: formData.get("billingEmail") as string,
      subscriptionTier: formData.get("subscriptionTier") as string || "basic",
      maxMembers: parseInt(formData.get("maxMembers") as string) || 10,
    };

    try {
      setIsCreating(true);
      const response = await api.createTeam(teamData);
      if (response.ok && response.data) {
        setShowCreateTeamModal(false);
        await fetchTeams();
        if (response.data.team) {
          navigate(`/collaboration/teams/${response.data.team.id}`);
          // Fetch team details after navigation
          setTimeout(() => {
            fetchTeamDetails(response.data.team.id);
          }, 100);
        }
      }
    } catch (error) {
      console.error("Failed to create team:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedTeam || !memberToRemove) return;

    try {
      setIsRemoving(true);
      console.log(`[Teams] Removing member: userId=${memberToRemove.userId}, teamId=${selectedTeam.id}`);
      
      const response = await api.removeTeamMember(selectedTeam.id, memberToRemove.userId);
      
      console.log(`[Teams] Remove member response:`, response);

      if (response.ok) {
        setMemberToRemove(null);
        // Refresh team details
        await fetchTeamDetails(selectedTeam.id);
      } else {
        alert(response.error?.message || "Failed to remove member. Please try again.");
      }
    } catch (error: any) {
      console.error("Failed to remove member:", error);
      alert(error.message || "Failed to remove member. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!selectedTeam || !inviteEmail) {
      setInviteError("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteError("Please enter a valid email address");
      return;
    }

    try {
      setIsInviting(true);
      setInviteError(null);
      
      console.log(`[Teams] Inviting member: email=${inviteEmail}, role=${inviteRole}, teamId=${selectedTeam.id}`);
      
      const response = await api.inviteTeamMember(selectedTeam.id, {
        email: inviteEmail,
        role: inviteRole,
      });

      console.log(`[Teams] Invite response:`, response);

      if (response.ok) {
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteRole("candidate");
        setInviteError(null);
        
        // Wait a moment for the database to commit
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh team details which will fetch invitations
        await fetchTeamDetails(selectedTeam.id);
        
        // Also explicitly fetch invitations
        try {
          const invitationsResponse = await api.getTeamInvitations(selectedTeam.id);
          if (invitationsResponse.ok && invitationsResponse.data) {
            setInvitations(invitationsResponse.data.invitations || []);
          }
        } catch (err) {
          console.error("Failed to refresh invitations:", err);
        }
      } else {
        setInviteError(response.error?.message || "Failed to invite member. Please try again.");
      }
    } catch (error: any) {
      console.error("Failed to invite member:", error);
      setInviteError(error.message || "Failed to invite member. Please try again.");
    } finally {
      setIsInviting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon icon="mingcute:loading-line" width={48} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Create Your First Team</h1>
        <form onSubmit={handleCreateTeam} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Team Name</label>
            <input
              type="text"
              name="teamName"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Team Type</label>
            <select
              name="teamType"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="standard">Standard</option>
              <option value="university">University Career Center</option>
              <option value="mentorship">Mentorship Program</option>
              <option value="job_search_group">Job Search Group</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Billing Email (Optional)</label>
            <input
              type="email"
              name="billingEmail"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-full hover:bg-blue-600 disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create Team"}
          </button>
        </form>
      </div>
    );
  }

  const fetchTeamConversations = async (teamId: string) => {
    try {
      const conversationsResponse = await api.getUserConversations("team", teamId);
      if (conversationsResponse.ok && conversationsResponse.data) {
        const conversations = conversationsResponse.data.conversations || [];
        console.log(`[Teams] Fetched ${conversations.length} conversations for team ${teamId}:`, conversations);
        setTeamConversations(conversations);
        
        // Auto-select first conversation if none selected
        // Removed auto-selection of first conversation to prevent chat modal from auto-opening
      } else {
        console.error("[Teams] Failed to fetch conversations:", conversationsResponse);
      }
    } catch (error) {
      console.error("[Teams] Failed to fetch team conversations:", error);
    }
  };

  const handleCreateConversation = async () => {
    if (!selectedTeam || !newConversationTitle.trim()) return;

    try {
      const response = await api.createOrGetConversation({
        conversationType: "team",
        teamId: selectedTeam.id,
        title: newConversationTitle.trim(),
      });

      if (response.ok && response.data) {
        const newConv = response.data.conversation;
        console.log(`[Teams] Created new conversation:`, newConv);
        
        if (newConv && newConv.id) {
          // Format the conversation to match the list format
          const formattedConv = {
            id: newConv.id,
            conversationType: newConv.conversationType || "team",
            teamId: newConv.teamId,
            title: newConv.title || newConversationTitle.trim(),
            lastMessageAt: newConv.lastMessageAt || null,
            createdAt: newConv.createdAt || new Date().toISOString(),
            unreadCount: newConv.unreadCount || 0
          };
          
          console.log(`[Teams] Formatted conversation:`, formattedConv);
          
          // Add the new conversation to the list immediately
          setTeamConversations((prev) => {
            // Check if it's already in the list
            const exists = prev.some(c => c.id === formattedConv.id);
            if (exists) {
              console.log(`[Teams] Conversation already in list, updating...`);
              return prev.map(c => c.id === formattedConv.id ? formattedConv : c);
            }
            // Add to the beginning of the list
            console.log(`[Teams] Adding new conversation to list`);
            return [formattedConv, ...prev];
          });
          
          // Select the new conversation
          console.log(`[Teams] Selecting conversation: ${formattedConv.id}`);
          setSelectedConversationId(formattedConv.id);
        } else {
          console.error("[Teams] Invalid conversation data:", newConv);
        }
        
        // Also refresh the full list to ensure we have the latest data
        await fetchTeamConversations(selectedTeam.id);
        
        setNewConversationTitle("");
        setShowCreateConversationModal(false);
      } else {
        console.error("[Teams] Failed to create conversation:", response);
        alert(`Failed to create conversation: ${response.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
      // Show error to user
      alert("Failed to create conversation. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Teams</h1>
          <p className="text-sm text-slate-500">Manage your teams and collaborate</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateTeamModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2.5 rounded-xl hover:from-green-600 hover:to-green-700 transition shadow-sm font-medium"
          >
            <Icon icon="mingcute:add-line" width={18} />
            Create Team
          </button>
          {selectedTeam && selectedTeam.userRole === "admin" && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-sm font-medium"
            >
              <Icon icon="mingcute:add-line" width={18} />
              Invite Member
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Team List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 text-lg">Your Teams</h2>
            </div>
            <div className="space-y-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => {
                    navigate(`/collaboration/teams/${team.id}`);
                    // Force fetch team details when clicking
                    fetchTeamDetails(team.id);
                    // Reset to dashboard when switching teams
                    setActiveTab("dashboard");
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                    selectedTeam?.id === team.id
                      ? "bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-500 shadow-md"
                      : "bg-slate-50 hover:bg-slate-100 border-2 border-transparent hover:border-slate-200"
                  }`}
                >
                  <div className="font-semibold text-slate-900 mb-1">{team.teamName}</div>
                  <div className="text-sm text-slate-600 flex items-center gap-2">
                    <Icon icon="mingcute:user-line" width={14} />
                    <span>{team.activeMembers} members</span>
                    <span className="text-slate-400">•</span>
                    <span className="capitalize">{team.userRole}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {selectedTeam ? (
          <div className="lg:col-span-3 space-y-6 min-w-0">
            {/* Navigation Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white overflow-x-auto">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-6 py-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    activeTab === "dashboard"
                      ? "text-blue-600 border-b-2 border-blue-500 bg-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Icon icon="mingcute:chart-line" width={18} className="inline mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("performance")}
                  className={`px-6 py-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    activeTab === "performance"
                      ? "text-blue-600 border-b-2 border-blue-500 bg-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Icon icon="mingcute:chart-bar-line" width={18} className="inline mr-2" />
                  Performance
                </button>
                <button
                  onClick={() => setActiveTab("members")}
                  className={`px-6 py-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    activeTab === "members"
                      ? "text-blue-600 border-b-2 border-blue-500 bg-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Icon icon="mingcute:user-group-line" width={18} className="inline mr-2" />
                  Members
                </button>
                <button
                  onClick={() => setActiveTab("conversations")}
                  className={`px-6 py-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    activeTab === "conversations"
                      ? "text-blue-600 border-b-2 border-blue-500 bg-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Icon icon="mingcute:chat-3-line" width={18} className="inline mr-2" />
                  Conversations
                </button>
                <button
                  onClick={() => setActiveTab("shared-jobs")}
                  className={`px-6 py-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    activeTab === "shared-jobs"
                      ? "text-blue-600 border-b-2 border-blue-500 bg-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Icon icon="mingcute:briefcase-line" width={18} className="inline mr-2" />
                  Shared Jobs
                </button>
                <button
                  onClick={() => setActiveTab("documents")}
                  className={`px-6 py-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    activeTab === "documents"
                      ? "text-blue-600 border-b-2 border-blue-500 bg-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Icon icon="mingcute:file-line" width={18} className="inline mr-2" />
                  Documents
                </button>
              </div>

              {/* Content Area */}
              <div className="p-6 overflow-x-auto bg-white min-h-[500px]">
                {activeTab === "dashboard" && (
                  <div className="space-y-6 min-w-0">
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Team Dashboard</h2>
                        <p className="text-sm text-slate-500">Overview of your team's progress and activity</p>
                      </div>
                      <MilestoneCelebration
                        teamId={selectedTeam.id}
                        onMilestoneCreated={() => {
                          fetchTeamDetails(selectedTeam.id);
                          setDashboardRefreshKey(prev => prev + 1); // Force dashboard refresh
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <TeamDashboard teamId={selectedTeam.id} refreshKey={dashboardRefreshKey} />
                    </div>
                  </div>
                )}

                {activeTab === "performance" && (
                  <div>
                    <TeamPerformance teamId={selectedTeam.id} />
                  </div>
                )}

                {activeTab === "members" && (
                  <div className="space-y-4">
                    {/* All Invitations - Show all statuses including past ones */}
                    {invitations && invitations.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4">
                          Invitations 
                          <span className="text-sm font-normal text-slate-600 ml-2">
                            ({invitations.filter((inv: any) => inv.status === "pending").length} pending, {invitations.length} total)
                          </span>
                        </h3>
                        <div className="space-y-3">
                          {invitations
                            .sort((a: any, b: any) => {
                              // Sort pending first, then by date (newest first)
                              if (a.status === "pending" && b.status !== "pending") return -1;
                              if (a.status !== "pending" && b.status === "pending") return 1;
                              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                            })
                            .map((invitation: any) => {
                              const isExpired = new Date(invitation.expiresAt) < new Date();
                              const isPending = invitation.status === "pending";
                              return (
                                <div
                                  key={invitation.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    isPending && !isExpired
                                      ? "bg-amber-50 border-amber-200"
                                      : isExpired
                                      ? "bg-slate-50 border-slate-200 opacity-75"
                                      : "bg-slate-50 border-slate-200"
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium text-slate-900">{invitation.email}</div>
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                                        isExpired
                                          ? "bg-red-100 text-red-800"
                                          : isPending
                                          ? "bg-amber-100 text-amber-800"
                                          : invitation.status === "accepted"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-slate-100 text-slate-800"
                                      }`}>
                                        {isExpired ? "Expired" : invitation.status}
                                      </span>
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                                        {invitation.role}
                                      </span>
                                    </div>
                                    <div className="text-sm text-slate-600 mt-1">
                                      Invited {new Date(invitation.createdAt).toLocaleDateString()}
                                      {invitation.inviterName && ` by ${invitation.inviterName}`}
                                      {!isExpired && isPending && (
                                        <> • Expires {new Date(invitation.expiresAt).toLocaleDateString()}</>
                                      )}
                                      {invitation.acceptedAt && (
                                        <> • Accepted {new Date(invitation.acceptedAt).toLocaleDateString()}</>
                                      )}
                                    </div>
                                  </div>
                                  {selectedTeam.userRole === "admin" && isPending && !isExpired && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          const response = await api.cancelTeamInvitation(
                                            selectedTeam.id,
                                            invitation.id
                                          );
                                          if (response.ok) {
                                            await fetchTeamDetails(selectedTeam.id);
                                          }
                                        } catch (error) {
                                          console.error("Failed to cancel invitation:", error);
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-700 ml-2"
                                      title="Cancel invitation"
                                    >
                                      <Icon icon="mingcute:close-line" width={20} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                    
                    {(!invitations || invitations.length === 0) && (
                      <div className="text-center py-8 text-slate-500">
                        <Icon icon="mingcute:mail-line" width={48} className="mx-auto mb-2 text-slate-300" />
                        <p>No invitations sent yet</p>
                      </div>
                    )}

                    {/* Team Members */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Team Members</h3>
                      <div className="space-y-3">
                        {selectedTeam.members?.map((member: any) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium text-slate-900">{member.email}</div>
                                <div className="text-sm text-slate-600 capitalize">{member.role}</div>
                              </div>
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                Active
                              </span>
                            </div>
                            {selectedTeam.userRole === "admin" && member.userId !== currentUserId && (
                              <button 
                                onClick={() => setMemberToRemove({ userId: member.userId, email: member.email })}
                                className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                                title="Remove member"
                              >
                                <Icon icon="mingcute:delete-line" width={20} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "conversations" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Team Conversations</h2>
                        <p className="text-sm text-slate-500">Chat with your team members</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => selectedTeam && fetchTeamConversations(selectedTeam.id)}
                          className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Refresh conversations"
                        >
                          <Icon icon="mingcute:refresh-line" width={18} />
                        </button>
                        <button
                          onClick={() => setShowCreateConversationModal(true)}
                          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-sm font-medium text-sm"
                          title="Create new conversation"
                        >
                          <Icon icon="mingcute:add-line" width={16} />
                          New Conversation
                        </button>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="max-h-[600px] overflow-y-auto">
                        {teamConversations.length === 0 ? (
                          <div className="p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                              <Icon icon="mingcute:chat-3-line" width={32} className="text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-600 mb-1">No conversations yet</p>
                            <button
                              onClick={() => setShowCreateConversationModal(true)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                            >
                              Create one
                            </button>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {teamConversations.map((conv) => {
                              const formatTime = (dateString: string | null): string => {
                                if (!dateString) return "No messages";
                                const date = new Date(dateString);
                                const now = new Date();
                                const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
                                if (diffInSeconds < 60) return "Just now";
                                if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
                                if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
                                if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
                                return date.toLocaleDateString([], { month: "short", day: "numeric" });
                              };

                              return (
                                <button
                                  key={conv.id}
                                  onClick={() => setSelectedConversationId(conv.id)}
                                  className={`w-full text-left p-4 hover:bg-slate-50/50 transition-all duration-150 ${
                                    selectedConversationId === conv.id 
                                      ? "bg-blue-50/50 border-l-4 border-blue-500 shadow-sm" 
                                      : ""
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                                      <Icon icon="mingcute:chat-3-line" width={18} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <div className="font-semibold text-slate-900 text-sm truncate">
                                          {conv.title || "Untitled Chat"}
                                        </div>
                                        {conv.unreadCount > 0 && (
                                          <span className="flex-shrink-0 bg-blue-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shadow-sm">
                                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500 font-medium">
                                        {formatTime(conv.lastMessageAt)}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "shared-jobs" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Shared Job Opportunities</h2>
                        <p className="text-sm text-slate-500">Collaborate on job postings with your team</p>
                      </div>
                      <button
                        onClick={() => selectedTeam && fetchSharedJobs(selectedTeam.id)}
                        className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title="Refresh shared jobs"
                      >
                        <Icon icon="mingcute:refresh-line" width={18} />
                      </button>
                    </div>
                    {sharedJobs.length === 0 ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                          <Icon icon="mingcute:briefcase-line" width={32} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600 mb-1">No shared jobs yet</p>
                        <p className="text-xs text-slate-500">Share job postings from the Job Opportunities page to collaborate with your team</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sharedJobs.map((job) => (
                          <div
                            key={job.id}
                            className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                              selectedJobId === job.id
                                ? "border-blue-500 shadow-lg"
                                : "border-slate-200 hover:border-blue-300 shadow-sm"
                            }`}
                          >
                            {/* Job Header */}
                            <div
                              className="p-5 cursor-pointer"
                              onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                                    {job.status && (
                                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                        {job.status}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                                    <div className="flex items-center gap-1">
                                      <Icon icon="mingcute:building-line" width={16} />
                                      <span className="font-medium">{job.company}</span>
                                    </div>
                                    {job.location && (
                                      <div className="flex items-center gap-1">
                                        <Icon icon="mingcute:map-pin-line" width={16} />
                                        <span>{job.location}</span>
                                      </div>
                                    )}
                                    {job.salaryMin && job.salaryMax && (
                                      <div className="flex items-center gap-1">
                                        <Icon icon="mingcute:dollar-line" width={16} />
                                        <span>
                                          ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {job.description && (
                                    <p className="text-sm text-slate-600 line-clamp-2 mt-2">
                                      {job.description.substring(0, 150)}...
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                    {job.sharedBy && (
                                      <span>
                                        Shared by {job.sharedByEmail || "team member"}
                                      </span>
                                    )}
                                    {job.sharedAt && (
                                      <span>
                                        {new Date(job.sharedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewJobDetail(job.id);
                                    }}
                                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-1"
                                    title="View full details"
                                  >
                                    <Icon icon="mingcute:eye-line" width={16} />
                                    View Details
                                  </button>
                                  {job.jobPostingUrl && (
                                    <a
                                      href={job.jobPostingUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                      title="View job posting"
                                    >
                                      <Icon icon="mingcute:external-link-line" width={18} />
                                    </a>
                                  )}
                                  <Icon
                                    icon={selectedJobId === job.id ? "mingcute:up-line" : "mingcute:down-line"}
                                    width={20}
                                    className="text-slate-400"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Collaboration Section - Expandable */}
                            {selectedJobId === job.id && (
                              <div className="border-t border-slate-200 p-5 bg-slate-50">
                                <JobCollaboration
                                  teamId={selectedTeam.id}
                                  jobId={job.id}
                                  jobTitle={job.title}
                                  jobCompany={job.company}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "documents" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Shared Documents</h2>
                        <p className="text-sm text-slate-500">Collaborate on resumes and cover letters with your team</p>
                      </div>
                      <button
                        onClick={() => selectedTeam && fetchSharedDocuments(selectedTeam.id)}
                        className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title="Refresh shared documents"
                      >
                        <Icon icon="mingcute:refresh-line" width={18} />
                      </button>
                    </div>
                    {isLoadingDocuments ? (
                      <div className="flex items-center justify-center py-12">
                        <Icon icon="mingcute:loading-line" width={32} className="animate-spin text-blue-500" />
                        <span className="ml-3 text-slate-600">Loading documents...</span>
                      </div>
                    ) : sharedDocuments.length === 0 ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                          <Icon icon="mingcute:file-line" width={32} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600 mb-1">No shared documents yet</p>
                        <p className="text-xs text-slate-500">Share resumes or cover letters from the Resumes or Cover Letters pages to collaborate with your team</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sharedDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                              selectedDocument?.id === doc.id
                                ? "border-blue-500 shadow-lg"
                                : "border-slate-200 hover:border-blue-300 shadow-sm"
                            }`}
                          >
                            <div
                              className="p-5 cursor-pointer"
                              onClick={() => setSelectedDocument(selectedDocument?.id === doc.id ? null : doc)}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Icon
                                      icon={doc.documentType === "resume" ? "mingcute:file-text-line" : "mingcute:mail-line"}
                                      width={24}
                                      className={doc.documentType === "resume" ? "text-blue-500" : "text-purple-500"}
                                    />
                                    <h3 className="text-lg font-bold text-slate-900">{doc.documentName}</h3>
                                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 capitalize">
                                      {doc.documentType === "resume" ? "Resume" : "Cover Letter"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                    {currentUserId && doc.sharedBy === currentUserId ? (
                                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                                        <Icon icon="mingcute:share-line" width={14} />
                                        You shared this
                                        {doc.isTeamWide ? " with team" : doc.sharedWithName ? ` with ${doc.sharedWithName}` : ""}
                                      </span>
                                    ) : doc.sharedByName ? (
                                      <span>
                                        Shared by {doc.sharedByName}
                                      </span>
                                    ) : null}
                                    {doc.sharedAt && (
                                      <span>
                                        {new Date(doc.sharedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                    {doc.commentCount > 0 && (
                                      <span className="flex items-center gap-1">
                                        <Icon icon="mingcute:comment-line" width={14} />
                                        {doc.commentCount} {doc.commentCount === 1 ? "comment" : "comments"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Icon
                                  icon={selectedDocument?.id === doc.id ? "mingcute:up-line" : "mingcute:down-line"}
                                  width={20}
                                  className="text-slate-400"
                                />
                              </div>
                            </div>
                            {selectedDocument?.id === doc.id && (
                              <div className="border-t border-slate-200 p-5 bg-slate-50">
                                <DocumentViewer
                                  document={doc}
                                  teamId={selectedTeam.id}
                                  onClose={() => setSelectedDocument(null)}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <Icon icon="mingcute:user-group-line" width={40} className="text-slate-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">No Team Selected</h2>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Select a team from the list or create a new team to get started.
              </p>
              <button
                onClick={() => setShowCreateTeamModal(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-sm font-medium"
              >
                <Icon icon="mingcute:add-line" width={18} className="inline mr-2" />
                Create Team
              </button>
            </div>
          </div>
        )}

        {/* Chat Modal */}
        {selectedConversationId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedConversationId(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <ChatWindow
                conversationId={selectedConversationId}
                title={teamConversations.find(c => c.id === selectedConversationId)?.title || "Team Chat"}
                onClose={() => setSelectedConversationId(null)}
                className="flex-1 min-h-0"
                onConversationUpdate={(updatedConv) => {
                  // Update the conversation in the list
                  setTeamConversations(prev => 
                    prev.map(conv => 
                      conv.id === updatedConv.id 
                        ? { ...conv, title: updatedConv.title }
                        : conv
                    )
                  );
                  // Refresh the conversations list to ensure consistency
                  if (selectedTeam) {
                    fetchTeamConversations(selectedTeam.id);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Invite Team Member</h3>
            <div className="space-y-4">
              {inviteError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{inviteError}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError(null); // Clear error when user types
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@example.com"
                  disabled={isInviting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isInviting}
                >
                  <option value="candidate">Candidate</option>
                  <option value="mentor">Mentor</option>
                  <option value="career_coach">Career Coach</option>
                  <option value="peer">Peer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleInviteMember}
                  disabled={isInviting || !inviteEmail}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isInviting ? (
                    <>
                      <Icon icon="mingcute:loading-line" width={20} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError(null);
                    setInviteEmail("");
                    setInviteRole("candidate");
                  }}
                  disabled={isInviting}
                  className="flex-1 bg-slate-200 text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Remove Team Member</h3>
            <p className="text-slate-700 mb-6">
              Are you sure you want to remove <strong>{memberToRemove.email}</strong> from this team? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRemoveMember}
                disabled={isRemoving}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRemoving ? (
                  <>
                    <Icon icon="mingcute:loading-line" width={20} className="animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove Member"
                )}
              </button>
              <button
                onClick={() => setMemberToRemove(null)}
                disabled={isRemoving}
                className="flex-1 bg-slate-200 text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Create New Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Team Name</label>
                <input
                  type="text"
                  name="teamName"
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Team Type</label>
                <select
                  name="teamType"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="university">University Career Center</option>
                  <option value="mentorship">Mentorship Program</option>
                  <option value="job_search_group">Job Search Group</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Billing Email (Optional)</label>
                <input
                  type="email"
                  name="billingEmail"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="billing@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Max Members</label>
                <input
                  type="number"
                  name="maxMembers"
                  min="1"
                  defaultValue="10"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Team"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="flex-1 bg-slate-200 text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Conversation Modal */}
      {showCreateConversationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Create New Conversation</h2>
              <button
                onClick={() => {
                  setShowCreateConversationModal(false);
                  setNewConversationTitle("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Conversation Title
                </label>
                <input
                  type="text"
                  value={newConversationTitle}
                  onChange={(e) => setNewConversationTitle(e.target.value)}
                  placeholder="e.g., General Discussion, Project Planning..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateConversation();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCreateConversationModal(false);
                    setNewConversationTitle("");
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateConversation}
                  disabled={!newConversationTitle.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Job Detail Modal */}
      {viewingJobDetail && (
        <JobOpportunityDetailModal
          opportunity={viewingJobDetail}
          onClose={() => setViewingJobDetail(null)}
          onSave={async () => {
            // Read-only mode - no save functionality for shared jobs
            alert("You cannot edit shared jobs. Please contact the job owner to make changes.");
          }}
          onDelete={() => {
            // Read-only mode - no delete functionality for shared jobs
            alert("You cannot delete shared jobs. Please contact the job owner.");
          }}
          readOnly={true}
        />
      )}
    </div>
  );
}

