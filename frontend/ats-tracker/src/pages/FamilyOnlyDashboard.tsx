import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";

type TabType =
  | "progress"
  | "suggestions"
  | "resources"
  | "celebrations"
  | "communication"
  | "boundaries"
  | "wellbeing"
  | "effectiveness";

export function FamilyOnlyDashboard() {
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("progress");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Data states
  const [memberProgress, setMemberProgress] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [educationalResources, setEducationalResources] = useState<any[]>([]);
  const [celebrations, setCelebrations] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [boundarySettings, setBoundarySettings] = useState<any[]>([]);
  const [boundarySuggestions, setBoundarySuggestions] = useState<any>(null);
  const [wellbeingTracking, setWellbeingTracking] = useState<any[]>([]);
  const [supportEffectiveness, setSupportEffectiveness] = useState<any[]>([]);

  useEffect(() => {
    fetchUserAndFamilyData();
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      loadTabData();
    }
  }, [selectedMemberId, activeTab]);

  const fetchUserAndFamilyData = async () => {
    try {
      setIsLoading(true);

      const userResponse = await api.getUserAuth();
      if (userResponse.ok && userResponse.data?.user) {
        setCurrentUser(userResponse.data.user);
      }

      const invitedByResponse = await api.getUsersWhoInvitedMe();
      if (invitedByResponse.ok && invitedByResponse.data) {
        const invitedBy = invitedByResponse.data.users || [];
        setFamilyMembers(invitedBy);

        if (invitedBy.length > 0 && invitedBy[0].userId) {
          setSelectedMemberId(invitedBy[0].userId);
        }
      }

      // Educational resources will be loaded when a member is selected
    } catch (error) {
      console.error("Failed to fetch family data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTabData = async () => {
    if (!selectedMemberId) return;

    switch (activeTab) {
      case "progress":
        await loadProgress();
        break;
      case "suggestions":
        await loadAISuggestions();
        break;
      case "celebrations":
        await loadCelebrations();
        break;
      case "communication":
        await loadCommunications();
        break;
      case "resources":
        await loadEducationalResources();
        break;
      case "boundaries":
        await loadBoundaries();
        break;
      case "wellbeing":
        await loadWellbeing();
        break;
      case "effectiveness":
        await loadSupportEffectiveness();
        break;
    }
  };

  const loadProgress = async () => {
    if (!selectedMemberId) return;
    try {
      const response = await api.getFamilyProgressSummary(selectedMemberId);
      if (response.ok && response.data) {
        setMemberProgress(response.data.summary);
      }
    } catch (error) {
      console.error("Failed to load progress:", error);
    }
  };

  const loadAISuggestions = async () => {
    if (!selectedMemberId) return;
    try {
      setIsLoadingSuggestions(true);
      const response = await api.generateAISupportSuggestions(selectedMemberId);
      if (response.ok && response.data) {
        setAiSuggestions(response.data);
      }
    } catch (error) {
      console.error("Failed to load AI suggestions:", error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const loadEducationalResources = async (forceRegenerate = false) => {
    if (!selectedMemberId) return;
    try {
      const response = await api.getEducationalResources(
        selectedMemberId,
        undefined,
        forceRegenerate
      );
      if (response.ok && response.data) {
        setEducationalResources(response.data.resources || []);
      }
    } catch (error) {
      console.error("Failed to load educational resources:", error);
    }
  };

  const loadCelebrations = async () => {
    if (!selectedMemberId) return;
    try {
      const response = await api.getFamilyCelebrations(selectedMemberId);
      if (response.ok && response.data) {
        setCelebrations(response.data.celebrations || []);
      }
    } catch (error) {
      console.error("Failed to load celebrations:", error);
    }
  };

  const loadCommunications = async () => {
    if (!selectedMemberId) return;
    try {
      const response = await api.getFamilyCommunications(selectedMemberId);
      if (response.ok && response.data) {
        setCommunications(response.data.communications || []);
      }
    } catch (error) {
      console.error("Failed to load communications:", error);
    }
  };

  const loadBoundaries = async () => {
    if (!selectedMemberId) return;
    try {
      const [settingsResponse, suggestionsResponse] = await Promise.all([
        api.getFamilyBoundarySettings(selectedMemberId),
        api.generateFamilyBoundarySuggestions(selectedMemberId),
      ]);

      if (settingsResponse.ok && settingsResponse.data) {
        setBoundarySettings(settingsResponse.data.settings || []);
      }
      if (suggestionsResponse.ok && suggestionsResponse.data) {
        setBoundarySuggestions(suggestionsResponse.data);
      }
    } catch (error) {
      console.error("Failed to load boundaries:", error);
    }
  };

  const loadWellbeing = async () => {
    if (!selectedMemberId) return;
    try {
      const response = await api.getFamilyWellbeingTracking(selectedMemberId);
      if (response.ok && response.data) {
        setWellbeingTracking(response.data.tracking || []);
      }
    } catch (error) {
      console.error("Failed to load wellbeing tracking:", error);
    }
  };

  const loadSupportEffectiveness = async () => {
    if (!selectedMemberId) return;
    try {
      const response = await api.getSupportEffectiveness(selectedMemberId);
      if (response.ok && response.data) {
        setSupportEffectiveness(response.data.effectiveness || []);
      }
    } catch (error) {
      console.error("Failed to load support effectiveness:", error);
    }
  };

  const handleCreateCelebration = async (celebrationData: any) => {
    if (!selectedMemberId) return;
    try {
      await api.createFamilyCelebration({
        familyMemberUserId: selectedMemberId,
        ...celebrationData,
      });
      await loadCelebrations();
    } catch (error) {
      console.error("Failed to create celebration:", error);
    }
  };

  const handleSendCommunication = async (message: string, type: string) => {
    if (!selectedMemberId) return;
    try {
      await api.createFamilyCommunication({
        familyMemberUserId: selectedMemberId,
        communication_type: type,
        message,
      });
      await loadCommunications();
    } catch (error) {
      console.error("Failed to send communication:", error);
    }
  };

  const handleTrackWellbeing = async (wellbeingData: any) => {
    if (!selectedMemberId) return;
    try {
      await api.trackFamilyWellbeing({
        userId: selectedMemberId,
        ...wellbeingData,
      });
      await loadWellbeing();
    } catch (error) {
      console.error("Failed to track wellbeing:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="animate-spin text-4xl text-blue-600 mb-4"
          />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const selectedMember = familyMembers.find(
    (m) => m.userId === selectedMemberId
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Family Support Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Support and encourage your family member's job search journey
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Family Members List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Family Members
                </h2>
              </div>
              <div className="p-4">
                {familyMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Icon
                      icon="mingcute:user-3-line"
                      className="text-4xl text-gray-300 mx-auto mb-3"
                    />
                    <p className="text-gray-500 text-sm">
                      No family members yet. You'll see members here when
                      someone invites you.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {familyMembers.map((member) => (
                      <button
                        key={member.userId}
                        onClick={() => {
                          setSelectedMemberId(member.userId);
                          setActiveTab("progress");
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedMemberId === member.userId
                            ? "bg-blue-50 border-2 border-blue-500"
                            : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Icon
                              icon="mingcute:user-line"
                              className="text-xl text-blue-600"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {member.email}
                            </p>
                            {member.relationship && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {member.relationship}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {selectedMemberId ? (
              <div className="space-y-6">
                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="border-b border-gray-200">
                    <nav className="flex overflow-x-auto" aria-label="Tabs">
                      {[
                        {
                          id: "progress",
                          label: "Progress",
                          icon: "mingcute:chart-line",
                        },
                        {
                          id: "suggestions",
                          label: "AI Suggestions",
                          icon: "mingcute:magic-line",
                        },
                        {
                          id: "resources",
                          label: "Resources",
                          icon: "mingcute:book-line",
                        },
                        {
                          id: "celebrations",
                          label: "Celebrations",
                          icon: "mingcute:star-line",
                        },
                        {
                          id: "communication",
                          label: "Messages",
                          icon: "mingcute:message-line",
                        },
                        {
                          id: "boundaries",
                          label: "Boundaries",
                          icon: "mingcute:shield-line",
                        },
                        {
                          id: "wellbeing",
                          label: "Well-being",
                          icon: "mingcute:heart-line",
                        },
                        {
                          id: "effectiveness",
                          label: "Impact",
                          icon: "mingcute:target-line",
                        },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as TabType)}
                          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.id
                              ? "border-blue-500 text-blue-600"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <Icon icon={tab.icon} width={18} />
                          <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  {activeTab === "progress" && (
                    <ProgressTab
                      memberProgress={memberProgress}
                      selectedMember={selectedMember}
                      onLoad={loadProgress}
                    />
                  )}

                  {activeTab === "suggestions" && (
                    <AISuggestionsTab
                      suggestions={aiSuggestions}
                      isLoading={isLoadingSuggestions}
                      selectedMember={selectedMember}
                      onRefresh={loadAISuggestions}
                    />
                  )}

                  {activeTab === "resources" && (
                    <EducationalResourcesTab
                      resources={educationalResources}
                      selectedMember={selectedMember}
                      onLoad={(force?: boolean) =>
                        loadEducationalResources(force)
                      }
                    />
                  )}

                  {activeTab === "celebrations" && (
                    <CelebrationsTab
                      celebrations={celebrations}
                      selectedMember={selectedMember}
                      onCreate={handleCreateCelebration}
                      onLoad={loadCelebrations}
                    />
                  )}

                  {activeTab === "communication" && (
                    <CommunicationTab
                      communications={communications}
                      selectedMember={selectedMember}
                      onSend={handleSendCommunication}
                      onLoad={loadCommunications}
                    />
                  )}

                  {activeTab === "boundaries" && (
                    <BoundariesTab
                      settings={boundarySettings}
                      suggestions={boundarySuggestions}
                      selectedMember={selectedMember}
                      onUpdate={async (settings) => {
                        if (selectedMemberId) {
                          await api.updateFamilyBoundarySettings(
                            selectedMemberId,
                            settings
                          );
                          await loadBoundaries();
                        }
                      }}
                      onLoadSuggestions={loadBoundaries}
                    />
                  )}

                  {activeTab === "wellbeing" && (
                    <WellbeingTab
                      tracking={wellbeingTracking}
                      selectedMember={selectedMember}
                      onTrack={handleTrackWellbeing}
                      onLoad={loadWellbeing}
                    />
                  )}

                  {activeTab === "effectiveness" && (
                    <EffectivenessTab
                      effectiveness={supportEffectiveness}
                      selectedMember={selectedMember}
                      onLoad={loadSupportEffectiveness}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Icon
                  icon="mingcute:user-3-line"
                  className="text-6xl text-gray-300 mx-auto mb-4"
                />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a Family Member
                </h3>
                <p className="text-gray-600">
                  Choose a family member from the list to view their progress
                  and provide support
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Progress Tab Component
function ProgressTab({ memberProgress, selectedMember, onLoad }: any) {
  useEffect(() => {
    onLoad();
  }, []);

  if (!memberProgress) {
    return (
      <div className="text-center py-12">
        <Icon
          icon="mingcute:loading-line"
          className="animate-spin text-4xl text-blue-600 mx-auto mb-4"
        />
        <p className="text-gray-600">Loading progress...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Progress Summary for {selectedMember?.name || "Family Member"}
        </h2>
        <p className="text-gray-600">
          Family-friendly overview of their job search journey
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-200">
          <p className="text-4xl font-bold text-blue-600 mb-2">
            {memberProgress.jobStats?.applications_count || 0}
          </p>
          <p className="text-sm font-medium text-gray-700">Applications</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg text-center border border-green-200">
          <p className="text-4xl font-bold text-green-600 mb-2">
            {memberProgress.jobStats?.interviews_count || 0}
          </p>
          <p className="text-sm font-medium text-gray-700">Interviews</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-200">
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
            <Icon
              icon="mingcute:star-line"
              className="text-amber-600 text-xl"
            />
            <h3 className="font-semibold text-gray-900">Recent Milestones</h3>
          </div>
          <p className="text-gray-700">
            {memberProgress.milestones.summary_content}
          </p>
          {memberProgress.milestones.milestones_shared && (
            <div className="mt-4 space-y-2">
              {JSON.parse(
                memberProgress.milestones.milestones_shared || "[]"
              ).map((milestone: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <Icon
                    icon="mingcute:check-circle-line"
                    className="text-green-600"
                  />
                  <span>{milestone}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <div className="flex items-start gap-3">
          <Icon
            icon="mingcute:heart-line"
            className="text-blue-600 text-2xl flex-shrink-0 mt-1"
          />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Your Support Matters
            </h3>
            <p className="text-gray-700 text-sm">
              Your encouragement and support play a vital role in their job
              search journey. Continue to celebrate their achievements and
              provide emotional support during this process.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// AI Suggestions Tab Component
function AISuggestionsTab({
  suggestions,
  isLoading,
  selectedMember,
  onRefresh,
}: any) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onRefresh();
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || isGenerating) {
    return (
      <div className="text-center py-12">
        <Icon
          icon="mingcute:loading-line"
          className="animate-spin text-4xl text-blue-600 mx-auto mb-4"
        />
        <p className="text-gray-600">Generating AI suggestions...</p>
      </div>
    );
  }

  if (!suggestions) {
    return (
      <div className="text-center py-12">
        <Icon
          icon="mingcute:magic-line"
          className="text-6xl text-gray-300 mx-auto mb-4"
        />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          AI Support Suggestions
        </h3>
        <p className="text-gray-600 mb-6">
          Get personalized AI-powered guidance on how to best support{" "}
          {selectedMember?.name || "your family member"}
        </p>
        <button
          onClick={handleGenerate}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition"
        >
          Generate Suggestions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            AI Support Suggestions
          </h2>
          <p className="text-gray-600 mt-1">
            Personalized guidance for supporting{" "}
            {selectedMember?.name || "your family member"}
          </p>
        </div>
        <button
          onClick={handleGenerate}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition flex items-center gap-2"
        >
          <Icon icon="mingcute:refresh-line" width={18} />
          Refresh
        </button>
      </div>

      {suggestions.overallGuidance && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <Icon
              icon="mingcute:lightbulb-line"
              className="text-blue-600 text-2xl flex-shrink-0 mt-1"
            />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Overall Guidance
              </h3>
              <p className="text-gray-700">{suggestions.overallGuidance}</p>
            </div>
          </div>
        </div>
      )}

      {suggestions.suggestions && suggestions.suggestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Specific Suggestions
          </h3>
          {suggestions.suggestions.map((suggestion: any, idx: number) => (
            <div
              key={suggestion.id || idx}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Icon
                      icon={
                        suggestion.suggestion_type === "celebration_idea"
                          ? "mingcute:star-line"
                          : suggestion.suggestion_type === "boundary_setting"
                          ? "mingcute:shield-line"
                          : suggestion.suggestion_type === "communication_tip"
                          ? "mingcute:message-line"
                          : "mingcute:heart-line"
                      }
                      className="text-blue-600 text-xl"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {suggestion.title}
                  </h4>
                  <p className="text-gray-700 text-sm mb-3">
                    {suggestion.suggestion_text}
                  </p>
                  {suggestion.context && (
                    <div className="bg-gray-50 rounded p-3 text-xs text-gray-600">
                      <p className="font-medium mb-1">
                        Why now: {suggestion.context.why_now}
                      </p>
                      <p>
                        Expected impact: {suggestion.context.expected_impact}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.boundaryRecommendations &&
        suggestions.boundaryRecommendations.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Icon icon="mingcute:shield-line" className="text-amber-600" />
              Boundary Recommendations
            </h3>
            <ul className="space-y-2">
              {suggestions.boundaryRecommendations.map(
                (rec: string, idx: number) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <Icon
                      icon="mingcute:check-line"
                      className="text-amber-600 mt-0.5"
                    />
                    <span>{rec}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        )}

      {suggestions.communicationTips &&
        suggestions.communicationTips.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Icon icon="mingcute:message-line" className="text-green-600" />
              Communication Tips
            </h3>
            <ul className="space-y-2">
              {suggestions.communicationTips.map((tip: string, idx: number) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <Icon
                    icon="mingcute:check-line"
                    className="text-green-600 mt-0.5"
                  />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}

// Educational Resources Tab Component
function EducationalResourcesTab({ resources, selectedMember, onLoad }: any) {
  const [isGenerating, setIsGenerating] = useState(false);
  const categories = [
    {
      id: "support_strategies",
      label: "Support Strategies",
      icon: "mingcute:heart-line",
    },
    {
      id: "communication",
      label: "Communication",
      icon: "mingcute:message-line",
    },
    { id: "boundaries", label: "Boundaries", icon: "mingcute:shield-line" },
    { id: "celebration", label: "Celebration", icon: "mingcute:star-line" },
    {
      id: "wellbeing_support",
      label: "Well-being Support",
      icon: "mingcute:heart-line",
    },
  ];

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (onLoad) {
      onLoad();
    }
  }, []);

  const filteredResources = selectedCategory
    ? resources.filter((r: any) => r.category === selectedCategory)
    : resources;

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      if (onLoad) {
        await onLoad(true); // Pass true to force regeneration
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Educational Resources
          </h2>
          <p className="text-gray-600">
            Personalized resources for supporting{" "}
            {selectedMember?.name || "your family member"}'s job search
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isGenerating}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Icon
            icon={
              isGenerating ? "mingcute:loading-line" : "mingcute:refresh-line"
            }
            width={18}
            className={isGenerating ? "animate-spin" : ""}
          />
          {isGenerating ? "Generating..." : "Regenerate Resources"}
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            selectedCategory === null
              ? "bg-blue-700 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All Resources
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              selectedCategory === cat.id
                ? "bg-blue-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Icon icon={cat.icon} width={16} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Resources List */}
      <div className="space-y-4">
        {filteredResources.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Icon
              icon="mingcute:book-line"
              className="text-4xl text-gray-300 mx-auto mb-4"
            />
            <p className="text-gray-600">
              {selectedCategory
                ? "No resources in this category yet"
                : "No resources available yet"}
            </p>
          </div>
        ) : (
          filteredResources.map((resource: any) => (
            <div
              key={resource.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Icon
                      icon="mingcute:book-line"
                      className="text-blue-600 text-xl"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {resource.title}
                    </h3>
                    {resource.ai_generated && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                        AI Generated
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">
                    {resource.content}
                  </p>
                  {resource.category && (
                    <p className="text-xs text-gray-500 mt-2">
                      Category: {resource.category}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Celebrations Tab Component
function CelebrationsTab({
  celebrations,
  selectedMember,
  onCreate,
  onLoad,
}: any) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    celebration_type: "milestone",
    title: "",
    description: "",
  });

  useEffect(() => {
    onLoad();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate(formData);
    setFormData({ celebration_type: "milestone", title: "", description: "" });
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Celebrations & Milestones
          </h2>
          <p className="text-gray-600 mt-1">
            Celebrate achievements and milestones with{" "}
            {selectedMember?.name || "your family member"}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition flex items-center gap-2"
        >
          <Icon icon="mingcute:add-line" width={18} />
          Add Celebration
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Create a Celebration
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Celebration Type
              </label>
              <select
                value={formData.celebration_type}
                onChange={(e) =>
                  setFormData({ ...formData, celebration_type: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="milestone">Milestone</option>
                <option value="achievement">Achievement</option>
                <option value="interview">Interview Scheduled</option>
                <option value="offer">Job Offer</option>
                <option value="application_milestone">
                  Application Milestone
                </option>
                <option value="personal_win">Personal Win</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="e.g., First Interview Scheduled!"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Add a message of celebration and encouragement..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
              >
                Create Celebration
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {celebrations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Icon
              icon="mingcute:star-line"
              className="text-4xl text-gray-300 mx-auto mb-4"
            />
            <p className="text-gray-600">
              No celebrations yet. Create one to get started!
            </p>
          </div>
        ) : (
          celebrations.map((celebration: any) => (
            <div
              key={celebration.id}
              className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-amber-200 rounded-lg p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <Icon
                      icon="mingcute:star-fill"
                      className="text-amber-600 text-xl"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {celebration.title}
                    </h3>
                    <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-full capitalize">
                      {celebration.celebration_type.replace("_", " ")}
                    </span>
                  </div>
                  {celebration.description && (
                    <p className="text-gray-700 text-sm mb-2">
                      {celebration.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(celebration.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Communication Tab Component
function CommunicationTab({
  communications,
  selectedMember,
  onSend,
  onLoad,
}: any) {
  const [message, setMessage] = useState("");
  const [communicationType, setCommunicationType] = useState("check_in");

  useEffect(() => {
    onLoad();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    await onSend(message, communicationType);
    setMessage("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Communication</h2>
        <p className="text-gray-600 mt-1">
          Send supportive messages to{" "}
          {selectedMember?.name || "your family member"}
        </p>
      </div>

      {/* Send Message Form */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Send a Message</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Type
            </label>
            <select
              value={communicationType}
              onChange={(e) => setCommunicationType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="check_in">Check In</option>
              <option value="support_message">Support Message</option>
              <option value="update">Update Request</option>
              <option value="milestone">Milestone Recognition</option>
              <option value="celebration">Celebration</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Write a supportive message..."
              required
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
          >
            Send Message
          </button>
        </form>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
        {communications.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Icon
              icon="mingcute:message-line"
              className="text-4xl text-gray-300 mx-auto mb-4"
            />
            <p className="text-gray-600">
              No messages yet. Send your first message above!
            </p>
          </div>
        ) : (
          communications.map((comm: any) => (
            <div
              key={comm.id}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Icon
                      icon={
                        comm.communication_type === "celebration"
                          ? "mingcute:star-line"
                          : comm.communication_type === "milestone"
                          ? "mingcute:trophy-line"
                          : "mingcute:message-line"
                      }
                      className="text-blue-600"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                      {comm.communication_type.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comm.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {comm.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Boundaries Tab Component
function BoundariesTab({
  settings,
  suggestions,
  selectedMember,
  onUpdate,
  onLoadSuggestions,
}: any) {
  const [localSettings, setLocalSettings] = useState<any[]>(settings || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings || []);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(localSettings);
    } finally {
      setIsSaving(false);
    }
  };

  const defaultSettings = [
    {
      setting_type: "communication_frequency",
      setting_value: { frequency: "weekly", preferred_days: [] },
    },
    {
      setting_type: "data_sharing_level",
      setting_value: { level: "high_level", include_rejections: false },
    },
    {
      setting_type: "support_style",
      setting_value: { style: "encouraging", avoid_advice: true },
    },
    {
      setting_type: "notification_preferences",
      setting_value: { milestones: true, interviews: true, offers: true },
    },
  ];

  const getSetting = (type: string) => {
    return (
      localSettings.find((s: any) => s.setting_type === type) ||
      defaultSettings.find((s: any) => s.setting_type === type)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Boundary Settings
          </h2>
          <p className="text-gray-600 mt-1">
            Set healthy boundaries for supporting{" "}
            {selectedMember?.name || "your family member"}
          </p>
        </div>
        <button
          onClick={onLoadSuggestions}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-2"
        >
          <Icon icon="mingcute:magic-line" width={18} />
          Get AI Suggestions
        </button>
      </div>

      {suggestions && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Icon icon="mingcute:magic-line" className="text-purple-600" />
            AI Boundary Recommendations
          </h3>
          {suggestions.recommendations &&
            suggestions.recommendations.length > 0 && (
              <div className="space-y-4">
                {suggestions.recommendations.map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg p-4 border border-purple-100"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 capitalize">
                        {rec.setting_type.replace("_", " ")}
                      </h4>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          rec.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : rec.priority === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {rec.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {rec.reasoning}
                    </p>
                    <div className="bg-gray-50 rounded p-3 text-sm">
                      <p className="text-gray-700">
                        <strong>Recommended:</strong> {rec.recommended_value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          {suggestions.overallGuidance && (
            <div className="mt-4 p-4 bg-white rounded-lg">
              <p className="text-gray-700 text-sm">
                {suggestions.overallGuidance}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {defaultSettings.map((defaultSetting) => {
          const current = getSetting(defaultSetting.setting_type);
          return (
            <div
              key={defaultSetting.setting_type}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4 capitalize">
                {defaultSetting.setting_type.replace("_", " ")}
              </h3>
              <div className="space-y-3">
                {defaultSetting.setting_type === "communication_frequency" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={current?.setting_value?.frequency || "weekly"}
                      onChange={(e) => {
                        const updated = [...localSettings];
                        const existing = updated.findIndex(
                          (s: any) =>
                            s.setting_type === defaultSetting.setting_type
                        );
                        if (existing >= 0) {
                          updated[existing].setting_value.frequency =
                            e.target.value;
                        } else {
                          updated.push({
                            setting_type: defaultSetting.setting_type,
                            setting_value: {
                              ...defaultSetting.setting_value,
                              frequency: e.target.value,
                            },
                          });
                        }
                        setLocalSettings(updated);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="as_needed">As Needed</option>
                    </select>
                  </div>
                )}
                {defaultSetting.setting_type === "data_sharing_level" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Sharing Level
                    </label>
                    <select
                      value={current?.setting_value?.level || "high_level"}
                      onChange={(e) => {
                        const updated = [...localSettings];
                        const existing = updated.findIndex(
                          (s: any) =>
                            s.setting_type === defaultSetting.setting_type
                        );
                        if (existing >= 0) {
                          updated[existing].setting_value.level =
                            e.target.value;
                        } else {
                          updated.push({
                            setting_type: defaultSetting.setting_type,
                            setting_value: {
                              ...defaultSetting.setting_value,
                              level: e.target.value,
                            },
                          });
                        }
                        setLocalSettings(updated);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="high_level">
                        High Level Only (applications, interviews, offers)
                      </option>
                      <option value="milestones">Milestones Only</option>
                      <option value="celebrations">Celebrations Only</option>
                    </select>
                  </div>
                )}
                {defaultSetting.setting_type === "support_style" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Support Style
                    </label>
                    <select
                      value={current?.setting_value?.style || "encouraging"}
                      onChange={(e) => {
                        const updated = [...localSettings];
                        const existing = updated.findIndex(
                          (s: any) =>
                            s.setting_type === defaultSetting.setting_type
                        );
                        if (existing >= 0) {
                          updated[existing].setting_value.style =
                            e.target.value;
                        } else {
                          updated.push({
                            setting_type: defaultSetting.setting_type,
                            setting_value: {
                              ...defaultSetting.setting_value,
                              style: e.target.value,
                            },
                          });
                        }
                        setLocalSettings(updated);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="encouraging">Encouraging</option>
                      <option value="supportive">Supportive</option>
                      <option value="hands_off">Hands Off</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// Wellbeing Tab Component
function WellbeingTab({ tracking, selectedMember, onTrack, onLoad }: any) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    stress_level: 5,
    mood_indicator: "neutral",
    energy_level: 5,
    sleep_quality: 5,
    notes: "",
  });

  useEffect(() => {
    onLoad();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onTrack(formData);
    setFormData({
      stress_level: 5,
      mood_indicator: "neutral",
      energy_level: 5,
      sleep_quality: 5,
      notes: "",
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Well-being Monitoring
          </h2>
          <p className="text-gray-600 mt-1">
            Track and monitor {selectedMember?.name || "your family member"}'s
            well-being
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
        >
          <Icon icon="mingcute:add-line" width={18} />
          Record Well-being
        </button>
      </div>

      {showForm && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Record Well-being Check
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stress Level (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.stress_level}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stress_level: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Low (1)</span>
                <span className="font-medium">{formData.stress_level}</span>
                <span>High (10)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mood
              </label>
              <select
                value={formData.mood_indicator}
                onChange={(e) =>
                  setFormData({ ...formData, mood_indicator: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="neutral">Neutral</option>
                <option value="low">Low</option>
                <option value="struggling">Struggling</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Energy Level (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.energy_level}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    energy_level: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Low (1)</span>
                <span className="font-medium">{formData.energy_level}</span>
                <span>High (10)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sleep Quality (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.sleep_quality}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sleep_quality: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Poor (1)</span>
                <span className="font-medium">{formData.sleep_quality}</span>
                <span>Excellent (10)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Additional observations or notes..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                Record
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Wellbeing Chart/History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Well-being History
        </h3>
        {tracking.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Icon
              icon="mingcute:heart-line"
              className="text-4xl text-gray-300 mx-auto mb-4"
            />
            <p className="text-gray-600">No well-being data recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tracking.map((entry: any) => (
              <div
                key={entry.id}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon
                      icon="mingcute:calendar-line"
                      className="text-gray-400"
                    />
                    <span className="text-sm text-gray-600">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {entry.stress_level && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Stress Level</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              entry.stress_level <= 3
                                ? "bg-green-500"
                                : entry.stress_level <= 6
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${(entry.stress_level / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {entry.stress_level}/10
                        </span>
                      </div>
                    </div>
                  )}
                  {entry.mood_indicator && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Mood</p>
                      <p className="text-sm font-medium capitalize">
                        {entry.mood_indicator}
                      </p>
                    </div>
                  )}
                  {entry.energy_level && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Energy</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${(entry.energy_level / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {entry.energy_level}/10
                        </span>
                      </div>
                    </div>
                  )}
                  {entry.sleep_quality && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Sleep</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{
                              width: `${(entry.sleep_quality / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {entry.sleep_quality}/10
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {entry.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-700">{entry.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Effectiveness Tab Component
function EffectivenessTab({ effectiveness, selectedMember, onLoad }: any) {
  useEffect(() => {
    onLoad();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Support Impact Tracking
        </h2>
        <p className="text-gray-600 mt-1">
          Track how your support is impacting{" "}
          {selectedMember?.name || "your family member"}'s job search
        </p>
      </div>

      {effectiveness.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Icon
            icon="mingcute:target-line"
            className="text-4xl text-gray-300 mx-auto mb-4"
          />
          <p className="text-gray-600">No support effectiveness data yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Support effectiveness is tracked automatically based on your
            interactions
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {effectiveness.map((entry: any) => (
            <div
              key={entry.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {entry.support_type || "Support Activity"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
                {entry.emotional_support_score && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {entry.emotional_support_score}
                    </p>
                    <p className="text-xs text-gray-500">Support Score</p>
                  </div>
                )}
              </div>
              {entry.impact_on_performance && (
                <div className="bg-blue-50 rounded-lg p-4 mb-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Impact on Performance
                  </p>
                  <p className="text-sm text-gray-700">
                    {entry.impact_on_performance}
                  </p>
                </div>
              )}
              {entry.stress_management_notes && (
                <div className="bg-green-50 rounded-lg p-4 mb-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Stress Management Notes
                  </p>
                  <p className="text-sm text-gray-700">
                    {entry.stress_management_notes}
                  </p>
                </div>
              )}
              {entry.performance_metrics && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">
                    Performance Metrics
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(
                      JSON.parse(entry.performance_metrics || "{}")
                    ).map(([key, value]: [string, any]) => (
                      <div key={key}>
                        <span className="text-gray-600 capitalize">
                          {key.replace("_", " ")}:
                        </span>{" "}
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
