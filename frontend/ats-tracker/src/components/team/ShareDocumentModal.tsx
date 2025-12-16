import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface ShareDocumentModalProps {
  documentType: "resume" | "cover_letter";
  documentId: string;
  documentName: string;
  onClose: () => void;
  onShared?: () => void;
}

export function ShareDocumentModal({
  documentType,
  documentId,
  documentName,
  onClose,
  onShared,
}: ShareDocumentModalProps) {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [shareType, setShareType] = useState<"team" | "member">("team");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedWith, setSharedWith] = useState<Array<{ teamId: string; memberId?: string; memberEmail?: string; teamName?: string }>>([]);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamMembers(selectedTeamId);
    } else {
      setTeamMembers([]);
      setSelectedMemberId("");
    }
  }, [selectedTeamId]);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await api.getUserTeams();
      if (response.ok && response.data) {
        const userTeams = response.data.teams || [];
        setTeams(userTeams);
        if (userTeams.length > 0) {
          setSelectedTeamId(userTeams[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      setIsLoadingMembers(true);
      const response = await api.getTeamById(teamId);
      if (response.ok && response.data?.team?.members) {
        const members = response.data.team.members.filter((m: any) => m.userId !== undefined);
        setTeamMembers(members);
        if (members.length > 0 && shareType === "member" && !selectedMemberId) {
          // Only auto-select if no member is currently selected
          setSelectedMemberId(members[0].userId);
        } else if (shareType === "member" && selectedMemberId && !members.find((m: any) => m.userId === selectedMemberId)) {
          // If selected member is not in new team, reset selection
          setSelectedMemberId(members.length > 0 ? members[0].userId : "");
        }
      } else {
        setTeamMembers([]);
        setSelectedMemberId("");
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      setTeamMembers([]);
      setSelectedMemberId("");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleShare = async () => {
    if (!selectedTeamId || isSharing) return;
    if (shareType === "member" && !selectedMemberId) return;

    try {
      setIsSharing(true);
      const response = await api.shareDocumentWithTeam({
        documentType,
        documentId,
        teamId: selectedTeamId,
        sharedWithUserId: shareType === "member" ? selectedMemberId : undefined,
      });

      if (response.ok) {
        const selectedTeam = teams.find((t) => t.id === selectedTeamId);
        const selectedMember = shareType === "member" ? teamMembers.find((m) => m.userId === selectedMemberId) : null;
        setSharedWith([
          ...sharedWith,
          {
            teamId: selectedTeamId,
            memberId: shareType === "member" ? selectedMemberId : undefined,
            memberEmail: selectedMember?.email,
            teamName: selectedTeam?.teamName,
          },
        ]);
        if (onShared) {
          onShared();
        }
        // Reset selection
        const nextTeam = teams.find((t) => !sharedWith.some((s) => s.teamId === t.id && !s.memberId));
        if (nextTeam) {
          setSelectedTeamId(nextTeam.id);
          setShareType("team");
        }
      } else {
        alert(response.error || "Failed to share document");
      }
    } catch (error) {
      console.error("Failed to share document:", error);
      alert("Failed to share document. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const isAlreadyShared = () => {
    if (shareType === "team") {
      return sharedWith.some((s) => s.teamId === selectedTeamId && !s.memberId);
    } else {
      return sharedWith.some((s) => s.teamId === selectedTeamId && s.memberId === selectedMemberId);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Share {documentType === "resume" ? "Resume" : "Cover Letter"}</h2>
            <p className="text-sm text-slate-500 mt-1">{documentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icon icon="mingcute:loading-line" width={24} className="animate-spin text-blue-700" />
            <span className="ml-2 text-slate-600">Loading teams...</span>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-8">
            <Icon icon="mingcute:user-group-line" width={48} className="mx-auto mb-3 text-slate-400" />
            <p className="text-sm text-slate-600 mb-4">You don't have any teams yet.</p>
            <p className="text-xs text-slate-500">Create a team first to share documents.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Team
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => {
                  setSelectedTeamId(e.target.value);
                  setShareType("team");
                  setSelectedMemberId("");
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>

            {selectedTeamId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Share with
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="radio"
                      name="shareType"
                      value="team"
                      checked={shareType === "team"}
                      onChange={() => {
                        setShareType("team");
                        setSelectedMemberId("");
                      }}
                      className="text-blue-700"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon icon="mingcute:user-group-line" width={18} className="text-slate-600" />
                        <span className="font-medium text-slate-900">Entire Team</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">All team members can view and comment</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="radio"
                      name="shareType"
                      value="member"
                      checked={shareType === "member"}
                      onChange={() => setShareType("member")}
                      className="text-blue-700"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon icon="mingcute:user-line" width={18} className="text-slate-600" />
                        <span className="font-medium text-slate-900">Specific Member</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Share with one team member only</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {shareType === "member" && selectedTeamId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Team Member
                </label>
                {isLoadingMembers ? (
                  <div className="flex items-center justify-center py-4">
                    <Icon icon="mingcute:loading-line" width={20} className="animate-spin text-blue-700" />
                    <span className="ml-2 text-sm text-slate-600">Loading members...</span>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-4 text-sm text-slate-500">
                    No members found in this team
                  </div>
                ) : (
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {teamMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.email || `Member (${member.role || "member"})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {sharedWith.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-900 mb-2">Shared with:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {sharedWith.map((share, idx) => {
                    const teamName = share.teamName || teams.find((t) => t.id === share.teamId)?.teamName || "Team";
                    if (!teamName) return null;

                    if (share.memberId) {
                      const memberName = share.memberEmail || "Member";
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm text-blue-700">
                          <Icon icon="mingcute:check-line" width={16} />
                          <span>{teamName}</span>
                          <span className="text-blue-700">•</span>
                          <span className="text-blue-600">{memberName}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm text-blue-700">
                          <Icon icon="mingcute:check-line" width={16} />
                          <span>{teamName}</span>
                          <span className="text-blue-700">(entire team)</span>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
              >
                Close
              </button>
              <button
                onClick={handleShare}
                disabled={
                  !selectedTeamId ||
                  isSharing ||
                  isAlreadyShared() ||
                  (shareType === "member" && !selectedMemberId)
                }
                className="flex-1 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {isSharing ? (
                  <>
                    <Icon icon="mingcute:loading-line" width={18} className="animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:share-2" width={18} />
                    Share
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render modal using portal to document body to avoid z-index issues
  if (typeof window !== 'undefined' && window.document) {
    return createPortal(modalContent, window.document.body);
  }

  return null;
}

