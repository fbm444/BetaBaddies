import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";

export function Family() {
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRelationship, setInviteRelationship] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberProgress, setMemberProgress] = useState<any>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const fetchFamilyData = async () => {
    try {
      setIsLoading(true);
      const [membersResponse, invitationsResponse] = await Promise.all([
        api.getFamilyMembers(),
        api.getPendingFamilyInvitations(),
      ]);

      if (membersResponse.ok && membersResponse.data) {
        setFamilyMembers(membersResponse.data.members || []);
      } else {
        console.error("Failed to fetch family members:", membersResponse);
      }

      if (invitationsResponse.ok && invitationsResponse.data) {
        setInvitations(invitationsResponse.data.invitations || []);
      } else {
        console.error("Failed to fetch invitations:", invitationsResponse);
      }
    } catch (error) {
      console.error("Failed to fetch family data:", error);
      // Show error to user
      setInviteError("Failed to load family data. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }

    try {
      setIsInviting(true);
      setInviteError(null);
      const response = await api.inviteFamilyMember({
        email: inviteEmail.trim(),
        familyMemberName: inviteName.trim() || undefined,
        relationship: inviteRelationship.trim() || undefined,
      });

      if (response.ok) {
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteName("");
        setInviteRelationship("");
        await fetchFamilyData();
      } else {
        setInviteError(response.error?.message || "Failed to send invitation");
      }
    } catch (error: any) {
      setInviteError(error.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return;

    try {
      const response = await api.cancelFamilyInvitation(invitationId);
      if (response.ok) {
        await fetchFamilyData();
      }
    } catch (error) {
      console.error("Failed to cancel invitation:", error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this family member?")) return;

    try {
      const response = await api.removeFamilyMember(memberId);
      if (response.ok) {
        await fetchFamilyData();
      }
    } catch (error) {
      console.error("Failed to remove family member:", error);
    }
  };

  const handleViewProgress = async (userId: string) => {
    try {
      setIsLoadingProgress(true);
      setSelectedMemberId(userId);
      const response = await api.getFamilyProgressSummary(userId);
      if (response.ok && response.data) {
        setMemberProgress(response.data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icon icon="mingcute:loading-line" className="animate-spin text-4xl text-blue-600 mb-4" />
          <p className="text-gray-600">Loading family members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {inviteError && !showInviteModal && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <Icon icon="mingcute:alert-circle-line" className="text-red-600" width={20} />
              <p className="text-red-700">{inviteError}</p>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Family Support</h1>
              <p className="mt-2 text-gray-600">
                Invite family members to support your job search journey
              </p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Icon icon="mingcute:add-line" width={20} />
              Invite Family Member
            </button>
          </div>
        </div>

        {/* Family Members List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Family Members</h2>
          </div>
          <div className="p-6">
            {familyMembers.length === 0 ? (
              <div className="text-center py-12">
                <Icon icon="mingcute:user-3-line" className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No family members yet</p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Invite your first family member
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {familyMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Icon icon="mingcute:user-line" className="text-2xl text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{member.name}</h3>
                          {member.isRegisteredUser && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                              Registered
                            </span>
                          )}
                          {member.accountType === "family_only" && (
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                              Family Account
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        {member.relationship && (
                          <p className="text-xs text-gray-500 mt-1">
                            Relationship: {member.relationship}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.isRegisteredUser && member.userId && (
                        <button
                          onClick={() => handleViewProgress(member.userId)}
                          className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          View Progress
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Icon icon="mingcute:delete-line" width={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Pending Invitations</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border border-amber-200 bg-amber-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{invitation.email}</p>
                      {invitation.family_member_name && (
                        <p className="text-sm text-gray-600">{invitation.family_member_name}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Progress Modal */}
        {selectedMemberId && memberProgress && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Progress Summary</h2>
                <button
                  onClick={() => {
                    setSelectedMemberId(null);
                    setMemberProgress(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="mingcute:close-line" width={24} />
                </button>
              </div>
              <div className="p-6">
                {isLoadingProgress ? (
                  <div className="text-center py-8">
                    <Icon icon="mingcute:loading-line" className="animate-spin text-4xl text-blue-600 mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-blue-600">
                          {memberProgress.jobStats?.applications_count || 0}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">Applications</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-green-600">
                          {memberProgress.jobStats?.interviews_count || 0}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">Interviews</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-purple-600">
                          {memberProgress.jobStats?.offers_count || 0}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">Offers</p>
                      </div>
                    </div>
                    {memberProgress.milestones && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Recent Milestones</h3>
                        <p className="text-gray-600">{memberProgress.milestones.summary_content}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Invite Family Member</h2>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError(null);
                    setInviteEmail("");
                    setInviteName("");
                    setInviteRelationship("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="mingcute:close-line" width={24} />
                </button>
              </div>
              <form onSubmit={handleInvite} className="p-6">
                {inviteError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {inviteError}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="family.member@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship (Optional)
                    </label>
                    <select
                      value={inviteRelationship}
                      onChange={(e) => setInviteRelationship(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select relationship</option>
                      <option value="parent">Parent</option>
                      <option value="spouse">Spouse/Partner</option>
                      <option value="sibling">Sibling</option>
                      <option value="child">Child</option>
                      <option value="friend">Friend</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteError(null);
                      setInviteEmail("");
                      setInviteName("");
                      setInviteRelationship("");
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isInviting ? "Sending..." : "Send Invitation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

