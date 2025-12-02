import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";

export function FamilyOnlyDashboard() {
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberProgress, setMemberProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchUserAndFamilyData();
  }, []);

  const fetchUserAndFamilyData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user info
      const userResponse = await api.getUserAuth();
      if (userResponse.ok && userResponse.data?.user) {
        setCurrentUser(userResponse.data.user);
      }

      // Get users who invited this user as a family member
      const invitedByResponse = await api.getUsersWhoInvitedMe();
      if (invitedByResponse.ok && invitedByResponse.data) {
        const invitedBy = invitedByResponse.data.users || [];
        setFamilyMembers(invitedBy);
        
        // Auto-select first member if available
        if (invitedBy.length > 0 && invitedBy[0].userId) {
          handleViewProgress(invitedBy[0].userId);
        }
      }
    } catch (error) {
      console.error("Failed to fetch family data:", error);
    } finally {
      setIsLoading(false);
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Icon icon="mingcute:loading-line" className="animate-spin text-4xl text-blue-600 mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Family Support Dashboard</h1>
              <p className="mt-2 text-gray-600">
                View and support your family members' job search journeys
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Icon icon="mingcute:user-line" width={20} />
              <span>{currentUser?.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Family Members List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Family Members</h2>
              </div>
              <div className="p-4">
                {familyMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Icon icon="mingcute:user-3-line" className="text-4xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      No family members yet. You'll see members here when someone invites you.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {familyMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => member.userId && handleViewProgress(member.userId)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedMemberId === member.userId
                            ? "bg-blue-50 border-2 border-blue-500"
                            : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Icon icon="mingcute:user-line" className="text-xl text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{member.name}</p>
                            <p className="text-xs text-gray-500 truncate">{member.email}</p>
                            {member.relationship && (
                              <p className="text-xs text-gray-400 mt-0.5">{member.relationship}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Educational Resources */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Support Resources</h2>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <a
                    href="#"
                    className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Icon icon="mingcute:book-line" className="text-blue-600 text-xl flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">How to Provide Effective Support</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Learn best practices for supporting someone's job search
                      </p>
                    </div>
                  </a>
                  <a
                    href="#"
                    className="flex items-start gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Icon icon="mingcute:heart-line" className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Emotional Support Guide</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Tips for providing emotional support during job search
                      </p>
                    </div>
                  </a>
                  <a
                    href="#"
                    className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Icon icon="mingcute:lightbulb-line" className="text-purple-600 text-xl flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Celebrating Milestones</p>
                      <p className="text-xs text-gray-600 mt-1">
                        How to celebrate achievements and maintain motivation
                      </p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Progress Summary */}
          <div className="lg:col-span-2">
            {selectedMemberId ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Progress Summary</h2>
                </div>
                <div className="p-6">
                  {isLoadingProgress ? (
                    <div className="text-center py-12">
                      <Icon icon="mingcute:loading-line" className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-600">Loading progress...</p>
                    </div>
                  ) : memberProgress ? (
                    <div className="space-y-6">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-6 rounded-lg text-center">
                          <p className="text-4xl font-bold text-blue-600 mb-2">
                            {memberProgress.jobStats?.applications_count || 0}
                          </p>
                          <p className="text-sm font-medium text-gray-700">Applications</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-lg text-center">
                          <p className="text-4xl font-bold text-green-600 mb-2">
                            {memberProgress.jobStats?.interviews_count || 0}
                          </p>
                          <p className="text-sm font-medium text-gray-700">Interviews</p>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-lg text-center">
                          <p className="text-4xl font-bold text-purple-600 mb-2">
                            {memberProgress.jobStats?.offers_count || 0}
                          </p>
                          <p className="text-sm font-medium text-gray-700">Offers</p>
                        </div>
                      </div>

                      {/* Milestones */}
                      {memberProgress.milestones && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <Icon icon="mingcute:star-line" className="text-amber-600 text-xl" />
                            <h3 className="font-semibold text-gray-900">Recent Milestones</h3>
                          </div>
                          <p className="text-gray-700">{memberProgress.milestones.summary_content}</p>
                          {memberProgress.milestones.milestones_shared && (
                            <div className="mt-4 space-y-2">
                              {JSON.parse(memberProgress.milestones.milestones_shared || '[]').map((milestone: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                  <Icon icon="mingcute:check-circle-line" className="text-green-600" />
                                  <span>{milestone}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Support Message */}
                      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Icon icon="mingcute:heart-line" className="text-blue-600 text-2xl flex-shrink-0 mt-1" />
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-2">Your Support Matters</h3>
                            <p className="text-gray-700 text-sm">
                              Your encouragement and support play a vital role in their job search journey. 
                              Continue to celebrate their achievements and provide emotional support during this process.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Icon icon="mingcute:file-line" className="text-4xl text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No progress data available</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Icon icon="mingcute:user-3-line" className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Family Member</h3>
                <p className="text-gray-600">
                  Choose a family member from the list to view their progress summary
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

