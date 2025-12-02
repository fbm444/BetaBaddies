import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

/**
 * Component for job seekers to view family support insights
 * Shows celebrations, communications, well-being tracking, and support effectiveness
 */
export function FamilySupportInsights() {
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [celebrations, setCelebrations] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [wellbeingTracking, setWellbeingTracking] = useState<any[]>([]);
  const [supportEffectiveness, setSupportEffectiveness] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "celebrations" | "communications" | "wellbeing" | "impact">("overview");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const currentUser = await api.getUserAuth();
      if (!currentUser.ok || !currentUser.data?.user) return;

      const userId = currentUser.data.user.id;

      // Get family members who are supporting this user (users who invited the current user)
      const membersResponse = await api.getUsersWhoInvitedMe();
      if (membersResponse.ok && membersResponse.data) {
        setFamilyMembers(membersResponse.data.users || []);
      }

      // Load all data
      const [celebrationsRes, communicationsRes, wellbeingRes, effectivenessRes] = await Promise.all([
        api.getFamilyCelebrations(),
        api.getFamilyCommunications(),
        api.getFamilyWellbeingTracking(),
        api.getSupportEffectiveness(),
      ]);

      if (celebrationsRes.ok && celebrationsRes.data) {
        setCelebrations(celebrationsRes.data.celebrations || []);
      }
      if (communicationsRes.ok && communicationsRes.data) {
        setCommunications(communicationsRes.data.communications || []);
      }
      if (wellbeingRes.ok && wellbeingRes.data) {
        setWellbeingTracking(wellbeingRes.data.tracking || []);
      }
      if (effectivenessRes.ok && effectivenessRes.data) {
        setSupportEffectiveness(effectivenessRes.data.effectiveness || []);
      }
    } catch (error) {
      console.error("Failed to load family support insights:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Icon icon="mingcute:loading-line" className="animate-spin text-3xl text-blue-600" />
        </div>
      </div>
    );
  }

  if (familyMembers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Icon icon="mingcute:heart-line" className="text-2xl text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Family Support</h2>
        </div>
        <div className="text-center py-8">
          <Icon icon="mingcute:user-3-line" className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">
            No family members are currently supporting you. Invite family members to share your journey!
          </p>
        </div>
      </div>
    );
  }

  const recentCelebrations = celebrations.slice(0, 3);
  const recentCommunications = communications.slice(0, 3);
  const latestWellbeing = wellbeingTracking[0];
  const avgSupportScore = supportEffectiveness.length > 0
    ? Math.round(
        supportEffectiveness.reduce((sum: number, e: any) => sum + (e.emotional_support_score || 0), 0) /
        supportEffectiveness.filter((e: any) => e.emotional_support_score).length
      )
    : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon icon="mingcute:heart-line" className="text-2xl text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Family Support</h2>
              <p className="text-sm text-gray-600">
                {familyMembers.length} {familyMembers.length === 1 ? "member" : "members"} supporting you
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex overflow-x-auto px-6" aria-label="Tabs">
          {[
            { id: "overview", label: "Overview", icon: "mingcute:home-line" },
            { id: "celebrations", label: "Celebrations", icon: "mingcute:star-line" },
            { id: "communications", label: "Messages", icon: "mingcute:message-line" },
            { id: "wellbeing", label: "Well-being", icon: "mingcute:heart-line" },
            { id: "impact", label: "Support Impact", icon: "mingcute:target-line" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon icon={tab.icon} width={16} />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Support Members */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Support Team</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {familyMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon icon="mingcute:user-line" className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{member.name}</p>
                        {member.relationship && (
                          <p className="text-xs text-gray-500">{member.relationship}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Celebrations */}
            {recentCelebrations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Celebrations</h3>
                <div className="space-y-2">
                  {recentCelebrations.map((celebration) => (
                    <div
                      key={celebration.id}
                      className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-amber-200 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Icon icon="mingcute:star-fill" className="text-amber-600 text-xl flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{celebration.title}</p>
                          {celebration.description && (
                            <p className="text-xs text-gray-600 mt-1">{celebration.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(celebration.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Messages */}
            {recentCommunications.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Messages</h3>
                <div className="space-y-2">
                  {recentCommunications.map((comm) => (
                    <div
                      key={comm.id}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Icon icon="mingcute:message-line" className="text-blue-600 text-lg flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{comm.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(comm.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Well-being Summary */}
            {latestWellbeing && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Latest Well-being Check</h3>
                <div className="grid grid-cols-2 gap-3">
                  {latestWellbeing.stress_level && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Stress Level</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              latestWellbeing.stress_level <= 3
                                ? "bg-green-500"
                                : latestWellbeing.stress_level <= 6
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${(latestWellbeing.stress_level / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{latestWellbeing.stress_level}/10</span>
                      </div>
                    </div>
                  )}
                  {latestWellbeing.mood_indicator && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Mood</p>
                      <p className="text-sm font-medium capitalize">{latestWellbeing.mood_indicator}</p>
                    </div>
                  )}
                </div>
                {latestWellbeing.notes && (
                  <p className="text-xs text-gray-700 mt-3">{latestWellbeing.notes}</p>
                )}
              </div>
            )}

            {/* Support Impact Summary */}
            {avgSupportScore && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Support Impact</h3>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-purple-600">{avgSupportScore}</div>
                  <div>
                    <p className="text-sm text-gray-700">Average Support Score</p>
                    <p className="text-xs text-gray-500">
                      Based on {supportEffectiveness.length} {supportEffectiveness.length === 1 ? "entry" : "entries"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "celebrations" && (
          <div className="space-y-4">
            {celebrations.length === 0 ? (
              <div className="text-center py-8">
                <Icon icon="mingcute:star-line" className="text-4xl text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No celebrations yet</p>
              </div>
            ) : (
              celebrations.map((celebration) => (
                <div
                  key={celebration.id}
                  className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-amber-200 rounded-lg p-5"
                >
                  <div className="flex items-start gap-4">
                    <Icon icon="mingcute:star-fill" className="text-amber-600 text-2xl flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{celebration.title}</h4>
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-full capitalize">
                          {celebration.celebration_type?.replace("_", " ")}
                        </span>
                      </div>
                      {celebration.description && (
                        <p className="text-sm text-gray-700 mb-2">{celebration.description}</p>
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
        )}

        {activeTab === "communications" && (
          <div className="space-y-4">
            {communications.length === 0 ? (
              <div className="text-center py-8">
                <Icon icon="mingcute:message-line" className="text-4xl text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No messages yet</p>
              </div>
            ) : (
              communications.map((comm) => (
                <div
                  key={comm.id}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-5"
                >
                  <div className="flex items-start gap-4">
                    <Icon icon="mingcute:message-line" className="text-blue-600 text-xl flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                          {comm.communication_type?.replace("_", " ")}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comm.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comm.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "wellbeing" && (
          <div className="space-y-4">
            {wellbeingTracking.length === 0 ? (
              <div className="text-center py-8">
                <Icon icon="mingcute:heart-line" className="text-4xl text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No well-being data recorded yet</p>
              </div>
            ) : (
              wellbeingTracking.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white border border-gray-200 rounded-lg p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
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
                              style={{ width: `${(entry.stress_level / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{entry.stress_level}/10</span>
                        </div>
                      </div>
                    )}
                    {entry.mood_indicator && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Mood</p>
                        <p className="text-sm font-medium capitalize">{entry.mood_indicator}</p>
                      </div>
                    )}
                    {entry.energy_level && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Energy</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${(entry.energy_level / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{entry.energy_level}/10</span>
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
                              style={{ width: `${(entry.sleep_quality / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{entry.sleep_quality}/10</span>
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
              ))
            )}
          </div>
        )}

        {activeTab === "impact" && (
          <div className="space-y-4">
            {supportEffectiveness.length === 0 ? (
              <div className="text-center py-8">
                <Icon icon="mingcute:target-line" className="text-4xl text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No support effectiveness data yet</p>
              </div>
            ) : (
              <>
                {avgSupportScore && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-purple-600">{avgSupportScore}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Average Support Score</p>
                        <p className="text-xs text-gray-600">
                          Based on {supportEffectiveness.length} {supportEffectiveness.length === 1 ? "entry" : "entries"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {supportEffectiveness.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white border border-gray-200 rounded-lg p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 capitalize">
                          {entry.support_type || "Support Activity"}
                        </h4>
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
                      <div className="bg-blue-50 rounded-lg p-3 mb-3">
                        <p className="text-xs font-medium text-gray-900 mb-1">Impact on Performance</p>
                        <p className="text-sm text-gray-700">{entry.impact_on_performance}</p>
                      </div>
                    )}
                    {entry.stress_management_notes && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-900 mb-1">Stress Management Notes</p>
                        <p className="text-sm text-gray-700">{entry.stress_management_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

