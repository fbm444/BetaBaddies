import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ReferralRequest, ReferralRequestInput, ReferralTemplate, ProfessionalContact } from "../types/network.types";
import { JobOpportunityData } from "../types/jobOpportunity.types";
import { validateRequired } from "../utils/validation";

type ReferralGroup = {
  key: string;
  jobId?: string;
  jobTitle?: string | null;
  jobCompany?: string | null;
  referrals: ReferralRequest[];
};

const TEMPLATE_TONES = [
  { value: "warm professional", label: "Warm Professional" },
  { value: "friendly casual", label: "Friendly & Approachable" },
  { value: "formal respectful", label: "Formal & Respectful" },
  { value: "enthusiastic", label: "Enthusiastic & Upbeat" },
] as const;

export function NetworkReferrals() {
  const [referrals, setReferrals] = useState<ReferralRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewReferralModalOpen, setIsViewReferralModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<ReferralRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendingReferralId, setSendingReferralId] = useState<string | null>(null);
  const [prefillJobId, setPrefillJobId] = useState<string | null>(null);
  const [modalExcludedContactIds, setModalExcludedContactIds] = useState<string[] | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"referrals" | "stats">("referrals");
  const [viewMode, setViewMode] = useState<"referrals" | "references">(() => {
    // Check URL parameter to determine initial view mode
    const tab = searchParams.get("tab");
    return tab === "write" ? "references" : "referrals";
  });

  const groupedReferrals = useMemo<ReferralGroup[]>(() => {
    if (referrals.length === 0) return [];

    const groups: Record<string, ReferralGroup> = {};

    referrals.forEach((referral) => {
      const key = referral.jobId || "no-job";
      if (!groups[key]) {
        groups[key] = {
          key,
          jobId: referral.jobId,
          jobTitle: referral.jobTitle || null,
          jobCompany: referral.jobCompany || null,
          referrals: [],
        };
      }

      if (!groups[key].jobTitle && referral.jobTitle) {
        groups[key].jobTitle = referral.jobTitle;
      }
      if (!groups[key].jobCompany && referral.jobCompany) {
        groups[key].jobCompany = referral.jobCompany;
      }

      groups[key].referrals.push(referral);
    });

    return Object.values(groups).sort((a, b) => {
      const labelA = (a.jobTitle || a.jobCompany || "Unassigned Job").toLowerCase();
      const labelB = (b.jobTitle || b.jobCompany || "Unassigned Job").toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [referrals]);

  useEffect(() => {
    if (viewMode === "referrals") {
      fetchReferrals();
    }
  }, [viewMode]);

  const buildFallbackMessage = (referral: ReferralRequest) => {
    const contactName = referral.contactName || "there";
    const jobTitle = referral.jobTitle || "the role";
    const jobCompany = referral.jobCompany || "the company";
    return `Hi ${contactName},

I hope you're doing well. I'm currently applying for the ${jobTitle} role at ${jobCompany} and would really appreciate a referral or any insights you can share. I'm happy to send along my resume or any context that would be helpful.

Thanks so much!`;
  };

  const fetchReferrals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getReferralRequests();
      if (response.ok) {
        setReferrals(response.data!.referrals);
      }
    } catch (err: any) {
      console.error("Failed to fetch referrals:", err);
      setError("Failed to load referrals. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReferral = async (referral: ReferralRequest, isResend: boolean = false) => {
    if (sendingReferralId) return;
    setSendingReferralId(referral.id);
    try {
      setError(null);
      const personalizedMessage =
        referral.personalizedMessage?.trim() || buildFallbackMessage(referral);

      const response = await api.updateReferralRequest(referral.id, {
        personalizedMessage,
        requestStatus: "sent",
        sentAt: new Date().toISOString(),
        requestTemplateId: referral.requestTemplateId,
        ...(isResend ? { resend: true } : {}),
      });

      if (response.ok) {
        await fetchReferrals();
      } else {
        setError(
          response.error?.message ||
            (isResend ? "Failed to resend referral request" : "Failed to send referral request")
        );
      }
    } catch (err: any) {
      console.error("Failed to send referral request:", err);
      setError(
        isResend
          ? "Failed to resend referral request. Please try again."
          : "Failed to send referral request. Please try again."
      );
    } finally {
      setSendingReferralId(null);
    }
  };


  const handleAddReferral = async (referralData: ReferralRequestInput) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.createReferralRequest(referralData);
      if (response.ok) {
        await fetchReferrals();
        setIsAddModalOpen(false);
        setPrefillJobId(null);
      } else {
        setError(response.error?.message || "Failed to create referral request");
      }
    } catch (err: any) {
      console.error("Failed to create referral request:", err);
      setError("Failed to create referral request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReferral = async (id: string, referralData: Partial<ReferralRequestInput>) => {
    const referral = referrals.find((r) => r.id === id);
    if (referral?.requestStatus === "received") {
      setError("Cannot edit a referral that has already been received.");
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.updateReferralRequest(id, referralData);
      if (response.ok) {
        await fetchReferrals();
        setIsEditModalOpen(false);
        setSelectedReferral(null);
      } else {
        setError(response.error?.message || "Failed to update referral request");
      }
    } catch (err: any) {
      console.error("Failed to update referral request:", err);
      setError("Failed to update referral request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReferral = async (id: string) => {
    const referral = referrals.find((r) => r.id === id);
    if (referral?.requestStatus === "received") {
      setError("Cannot delete a referral that has already been received.");
      return;
    }

    if (!confirm("Are you sure you want to delete this referral request?")) return;
    try {
      setError(null);
      const response = await api.deleteReferralRequest(id);
      if (response.ok) {
        await fetchReferrals();
      } else {
        setError(response.error?.message || "Failed to delete referral request");
      }
    } catch (err: any) {
      console.error("Failed to delete referral request:", err);
      setError("Failed to delete referral request. Please try again.");
    }
  };

  const handleDeleteRole = async (group: ReferralGroup) => {
    if (!group.jobId) return;
    if (
      !confirm(
        `Delete all referral requests for ${group.jobTitle || group.jobCompany || "this role"}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setDeletingRoleId(group.jobId);
      setError(null);
      for (const referral of group.referrals) {
        await api.deleteReferralRequest(referral.id);
      }
      await fetchReferrals();
    } catch (err: any) {
      console.error("Failed to delete referrals for role:", err);
      setError("Failed to delete referrals for this role. Please try again.");
    } finally {
      setDeletingRoleId(null);
    }
  };

  const getExcludedContactsForJob = useCallback(
    (jobId?: string | null, ignoreReferralId?: string) => {
      if (!jobId) return [];
      const group = groupedReferrals.find((g) => g.jobId === jobId);
      if (!group) return [];
      return (
        group.referrals
          ?.filter((ref) => ref.id !== ignoreReferralId)
          ?.map((referral) => referral.contactId)
          .filter((id): id is string => Boolean(id)) || []
      );
    },
    [groupedReferrals]
  );

  const handleRequestReferralForJob = (jobId?: string | null) => {
    if (!jobId) return;
    setPrefillJobId(jobId);
    setModalExcludedContactIds(getExcludedContactsForJob(jobId));
    setIsAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Referrals & References</h1>
          <p className="text-slate-600">Track and manage referral requests and professional references</p>
        </div>

        {/* Main View Toggle */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => setViewMode("referrals")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              viewMode === "referrals"
                ? "bg-[#3351FD] text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon icon="mingcute:handshake-line" width={20} height={20} />
              Ask for Referrals
            </div>
          </button>
          <button
            onClick={() => setViewMode("references")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              viewMode === "references"
                ? "bg-[#3351FD] text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon icon="mingcute:user-star-line" width={20} height={20} />
              Write Referrals
            </div>
          </button>
        </div>

        {viewMode === "references" ? (
          <WriteReferralsView />
        ) : (
          <>
            {/* Referral Tabs */}
            <div className="mb-6 border-b border-slate-200">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("referrals")}
                  className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                    activeTab === "referrals"
                      ? "border-[#3351FD] text-[#3351FD]"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Referrals
                </button>
                <button
                  onClick={() => setActiveTab("stats")}
                  className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                    activeTab === "stats"
                      ? "border-[#3351FD] text-[#3351FD]"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Referral Stats
                </button>
              </div>
            </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {activeTab === "stats" ? (
          <ReferralStats referrals={referrals} isLoading={isLoading} />
        ) : (
          <>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
            <p className="mt-4 text-slate-600">Loading referrals...</p>
          </div>
        ) : referrals.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Icon icon="mingcute:handshake-line" width={64} height={64} className="mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No referral requests found</h3>
            <p className="text-slate-600 mb-4">Get started by requesting a referral for one of your job applications.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setPrefillJobId(null);
                  setModalExcludedContactIds(null);
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors flex items-center gap-2"
              >
                <Icon icon="mingcute:add-line" width={20} height={20} />
                Request Referral
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
                <div className="flex flex-wrap justify-end gap-3 mb-4">
                  <button
                    onClick={() => {
                      setPrefillJobId(null);
                      setModalExcludedContactIds(null);
                      setIsAddModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors flex items-center gap-2"
                  >
                    <Icon icon="mingcute:add-line" width={20} height={20} />
                    Request Referral
                  </button>
                  <button
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="px-4 py-2 bg-white text-[#3351FD] border border-[#3351FD] rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <Icon icon="mingcute:magic-line" width={20} height={20} />
                    Generate Template
                  </button>
                </div>
                {groupedReferrals.map((group) => {
                  const jobTitleLabel = group.jobTitle || "No Job Selected";
                  const jobCompanyLabel = group.jobId
                    ? group.jobCompany || "Company not specified"
                    : "Requests without an associated job opportunity";

                  return (
                    <div
                      key={group.key}
                      className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Job Opportunity</p>
                          <h3 className="text-lg font-semibold text-slate-900">{jobTitleLabel}</h3>
                          <p className="text-sm text-slate-600">{jobCompanyLabel}</p>
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-2">
                          <span className="text-sm text-slate-500">
                            {group.referrals.length} {group.referrals.length === 1 ? "request" : "requests"}
                          </span>
                          {group.jobId && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleRequestReferralForJob(group.jobId!)}
                                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
                              >
                                Request Another Referral for this Role
                              </button>
                              <button
                                onClick={() => handleDeleteRole(group)}
                                disabled={deletingRoleId === group.jobId}
                                className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-60"
                              >
                                {deletingRoleId === group.jobId ? "Deleting..." : "Delete Role"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {group.referrals.map((referral) => (
                          <div
                            key={referral.id}
                            className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border border-slate-200 rounded-lg p-4 bg-slate-50"
                          >
                            <div className="flex-1">
                              <p className="text-base font-semibold text-slate-900">
                                {referral.contactName || "Unknown Contact"}
                              </p>
                              <div className="mt-2 space-y-1 text-sm text-slate-600">
                                {referral.contactEmail && <p>Email: {referral.contactEmail}</p>}
                                {referral.sentAt ? (
                                  <p>Sent: {new Date(referral.sentAt).toLocaleDateString()}</p>
                                ) : (
                                  <p>Status: Draft</p>
                                )}
                                {referral.sentAt && (
                                  <p className={referral.requestStatus === "received" ? "text-green-600 font-semibold" : "text-slate-600"}>
                                    Status: {referral.requestStatus === "received" ? "Received" : referral.requestStatus || "Sent"}
                                  </p>
                                )}
                                {referral.referralSuccessful !== null && referral.requestStatus !== "received" && (
                                  <p className={referral.referralSuccessful ? "text-green-600" : "text-red-600"}>
                                    {referral.referralSuccessful ? "✓ Referral successful" : "✗ Referral unsuccessful"}
                                  </p>
                                )}
                                {referral.followupRequired && <p className="text-orange-600">Follow-up needed</p>}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {referral.requestStatus === "received" && referral.responseContent ? (
                                <button
                                  onClick={() => {
                                    setSelectedReferral(referral);
                                    setIsViewReferralModalOpen(true);
                                  }}
                                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                                  title="View Referral Letter"
                                >
                                  <Icon icon="mingcute:eye-line" width={16} height={16} />
                                  View Referral
                                </button>
                              ) : !referral.sentAt ? (
                                <button
                                  onClick={() => handleSendReferral(referral)}
                                  disabled={sendingReferralId === referral.id}
                                  className="px-3 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors text-sm flex items-center gap-2 disabled:opacity-60"
                                  title="Send Request"
                                >
                                  {sendingReferralId === referral.id ? (
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                  ) : (
                                    <Icon icon="mingcute:send-line" width={16} height={16} />
                                  )}
                                  {sendingReferralId === referral.id ? "Sending..." : "Send Request"}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSendReferral(referral, true)}
                                  disabled={sendingReferralId === referral.id}
                                  className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm flex items-center gap-2 disabled:opacity-60"
                                  title="Resend Request"
                                >
                                  {sendingReferralId === referral.id ? (
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                  ) : (
                                    <Icon icon="mingcute:refresh-2-line" width={16} height={16} />
                                  )}
                                  {sendingReferralId === referral.id ? "Resending..." : "Resend Request"}
                                </button>
                              )}
                              {referral.requestStatus !== "received" && (
                                <>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const response = await api.updateReferralRequest(referral.id, {
                                          followupRequired: !referral.followupRequired,
                                        });
                                        if (response.ok) {
                                          fetchReferrals();
                                        }
                                      } catch (err) {
                                        console.error("Failed to toggle followup:", err);
                                      }
                                    }}
                                    className={`p-2 rounded transition-colors ${
                                      referral.followupRequired
                                        ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                        : "text-slate-600 hover:text-orange-600 hover:bg-orange-50"
                                    }`}
                                    title={referral.followupRequired ? "Mark follow-up as not required" : "Mark follow-up as required"}
                                  >
                                    <Icon icon="mingcute:notification-line" width={18} height={18} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedReferral(referral);
                                      setModalExcludedContactIds(
                                        getExcludedContactsForJob(referral.jobId, referral.id)
                                      );
                                      setIsEditModalOpen(true);
                                    }}
                                    className="p-2 text-slate-600 hover:text-[#3351FD] hover:bg-slate-50 rounded"
                                    title="Edit referral"
                                  >
                                    <Icon icon="mingcute:edit-line" width={18} height={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReferral(referral.id)}
                                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="Delete referral"
                                  >
                                    <Icon icon="mingcute:delete-line" width={18} height={18} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}


        {(isAddModalOpen || isEditModalOpen) && (
          <ReferralModal
            isOpen={isAddModalOpen || isEditModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              setSelectedReferral(null);
              setError(null);
              setPrefillJobId(null);
              setModalExcludedContactIds(null);
            }}
            onSave={isAddModalOpen ? handleAddReferral : (data) => selectedReferral && handleEditReferral(selectedReferral.id, data)}
            referral={selectedReferral}
            isSubmitting={isSubmitting}
            defaultJobId={prefillJobId}
            excludedContactIds={modalExcludedContactIds}
          />
        )}

        {isTemplateModalOpen && (
          <TemplateGeneratorModal
            isOpen={isTemplateModalOpen}
            onClose={() => setIsTemplateModalOpen(false)}
          />
        )}

        {isViewReferralModalOpen && selectedReferral && (
          <ViewReferralModal
            isOpen={isViewReferralModalOpen}
            onClose={() => {
              setIsViewReferralModalOpen(false);
              setSelectedReferral(null);
            }}
            referral={selectedReferral}
          />
        )}

          </>
        )}
        </>
        )}
      </div>
    </div>
  );
}

function WriteReferralsView() {
  const [templates, setTemplates] = useState<ReferralTemplate[]>([]);
  const [referralRequests, setReferralRequests] = useState<ReferralRequest[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReferralTemplate | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ReferralRequest | null>(null);
  const [generatedLetter, setGeneratedLetter] = useState<string>("");
  const [selectedToneFilter, setSelectedToneFilter] = useState<string>("all");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchReferralRequests();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      setError(null);
      // Use recommendation templates for Write Referrals tab
      const response = await api.getReferralRecommendationTemplates();
      if (response.ok && response.data?.templates) {
        setTemplates(response.data.templates);
      } else {
        setError(response.error?.message || "Failed to load templates");
      }
    } catch (err: any) {
      console.error("Failed to fetch templates:", err);
      setError("Failed to load templates. Please try again.");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const fetchReferralRequests = async () => {
    try {
      setIsLoadingRequests(true);
      setError(null);
      const response = await api.getReferralRequestsToWrite();
      if (response.ok && response.data) {
        setReferralRequests(response.data.referrals);
      } else {
        setError(response.error?.message || "Failed to load referral requests");
      }
    } catch (err: any) {
      console.error("Failed to fetch referral requests:", err);
      setError("Failed to load referral requests. Please try again.");
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleGenerateLetter = async () => {
    if (!selectedTemplate || !selectedRequest) {
      setError("Please select both a template and a referral request");
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setGeneratedLetter("");

      const response = await api.generateReferralLetter({
        templateId: selectedTemplate.id,
        referralRequestId: selectedRequest.id,
      });

      if (response.ok && response.data?.message) {
        setGeneratedLetter(response.data.message);
      } else {
        setError(response.error?.message || "Failed to generate letter");
      }
    } catch (err: any) {
      console.error("Failed to generate letter:", err);
      setError("Failed to generate letter. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveLetter = async () => {
    if (!selectedRequest) {
      setError("Please select a referral request first");
      return;
    }

    // Get the letter content from the state (could be generated letter or draft)
    const letterContent = generatedLetter || selectedRequest?.draftReferralLetter || "";
    
    if (!letterContent.trim()) {
      setError("Please generate a letter first or select a request with a draft");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const response = await api.saveDraftReferralLetter({
        referralRequestId: selectedRequest.id,
        letterContent: letterContent,
      });

      if (response.ok) {
        // Refresh requests to show updated draft
        await fetchReferralRequests();
        alert("Referral letter saved successfully!");
        // Optionally clear the generated letter
        setGeneratedLetter("");
        setSelectedRequest(null);
        setSelectedTemplate(null);
      } else {
        setError(response.error?.message || "Failed to save letter");
      }
    } catch (err: any) {
      console.error("Failed to save letter:", err);
      setError("Failed to save letter. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendLetter = async (requestId: string) => {
    try {
      setIsSending((prev) => ({ ...prev, [requestId]: true }));
      setError(null);
      const response = await api.submitReferralLetter({
        referralRequestId: requestId,
      });

      if (response.ok) {
        await fetchReferralRequests();
        alert("Referral letter sent successfully!");
      } else {
        setError(response.error?.message || "Failed to send letter");
      }
    } catch (err: any) {
      console.error("Failed to send letter:", err);
      setError("Failed to send letter. Please try again.");
    } finally {
      setIsSending((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const filteredTemplates = selectedToneFilter === "all"
    ? templates
    : templates.filter(t => t.tone === selectedToneFilter);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Templates */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Templates</h2>
            <select
              value={selectedToneFilter}
              onChange={(e) => setSelectedToneFilter(e.target.value)}
              className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#3351FD]"
            >
              <option value="all">All Tones</option>
              <option value="warm professional">Warm Professional</option>
              <option value="friendly casual">Friendly & Casual</option>
              <option value="formal respectful">Formal & Respectful</option>
              <option value="enthusiastic">Enthusiastic</option>
            </select>
          </div>
          {isLoadingTemplates ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
              <p className="mt-4 text-slate-600">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Icon icon="mingcute:file-text-line" width={64} height={64} className="mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No templates found</h3>
              <p className="text-slate-600">Try selecting a different tone filter.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`bg-white rounded-lg border-2 p-4 cursor-pointer hover:shadow-md transition-all ${
                    selectedTemplate?.id === template.id
                      ? "border-[#3351FD] bg-blue-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{template.templateName || "Untitled Template"}</h3>
                    {selectedTemplate?.id === template.id && (
                      <Icon icon="mingcute:check-circle-fill" className="text-[#3351FD]" width={20} height={20} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {template.tone && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {TEMPLATE_TONES.find(t => t.value === template.tone)?.label || template.tone}
                      </span>
                    )}
                    {template.length && (
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded capitalize">
                        {template.length}
                      </span>
                    )}
                  </div>
                  {template.templateBody && (
                    <p className="text-xs text-slate-600 line-clamp-3 mt-2">{template.templateBody}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTemplateId(template.id);
                      }}
                      className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
                    >
                      <Icon icon="mingcute:eye-line" width={14} height={14} />
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Referral Requests and Generator */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Referral Requests</h2>
          {isLoadingRequests ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
              <p className="mt-4 text-slate-600">Loading requests...</p>
            </div>
          ) : referralRequests.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Icon icon="mingcute:user-line" width={64} height={64} className="mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No referral requests</h3>
              <p className="text-slate-600">
                When someone requests a referral from you, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {referralRequests.map((request) => (
                <div
                  key={request.id}
                  className={`bg-white rounded-lg border-2 p-6 transition-all ${
                    selectedRequest?.id === request.id
                      ? "border-[#3351FD] bg-blue-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {request.requesterName || "Unknown Requester"}
                      </h3>
                      {request.requesterEmail && (
                        <p className="text-sm text-slate-600">{request.requesterEmail}</p>
                      )}
                    </div>
                    {selectedRequest?.id === request.id && (
                      <Icon icon="mingcute:check-circle-fill" className="text-[#3351FD]" width={24} height={24} />
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    {request.jobTitle && (
                      <div className="flex items-center gap-2">
                        <Icon icon="mingcute:briefcase-line" width={16} height={16} className="text-slate-400" />
                        <span className="text-slate-700">
                          <span className="font-medium">Position:</span> {request.jobTitle}
                        </span>
                      </div>
                    )}
                    {request.jobCompany && (
                      <div className="flex items-center gap-2">
                        <Icon icon="mingcute:building-line" width={16} height={16} className="text-slate-400" />
                        <span className="text-slate-700">
                          <span className="font-medium">Company:</span> {request.jobCompany}
                        </span>
                      </div>
                    )}
                    {request.jobLocation && (
                      <div className="flex items-center gap-2">
                        <Icon icon="mingcute:map-pin-line" width={16} height={16} className="text-slate-400" />
                        <span className="text-slate-700">
                          <span className="font-medium">Location:</span> {request.jobLocation}
                        </span>
                      </div>
                    )}
                    {request.relationshipImpact && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs font-medium text-slate-700 mb-1">How this person knows you:</p>
                        <p className="text-sm text-slate-600">{request.relationshipImpact}</p>
                      </div>
                    )}
                    {request.sentAt && (
                      <div className="flex items-center gap-2 mt-2">
                        <Icon icon="mingcute:calendar-line" width={16} height={16} className="text-slate-400" />
                        <span className="text-xs text-slate-500">
                          Requested: {new Date(request.sentAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle selection: if already selected, unselect; otherwise select
                        if (selectedRequest?.id === request.id) {
                          setSelectedRequest(null);
                          setGeneratedLetter("");
                        } else {
                          setSelectedRequest(request);
                        }
                      }}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                        selectedRequest?.id === request.id
                          ? "bg-[#3351FD] text-white hover:bg-[#2641DD]"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {selectedRequest?.id === request.id ? "Unselect" : "Select"}
                    </button>
                    {request.draftReferralLetter && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendLetter(request.id);
                        }}
                        disabled={isSending[request.id]}
                        className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                        title="Send saved letter"
                      >
                        {isSending[request.id] ? (
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <Icon icon="mingcute:send-plane-line" width={16} height={16} />
                        )}
                        Send
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generate and Save Section */}
          {selectedRequest && (selectedTemplate || selectedRequest.draftReferralLetter) && (
            <div className="mt-6 bg-white rounded-lg border border-slate-200 p-6 space-y-4">
              {selectedTemplate && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Generate & Customize Letter</h3>
                  <p className="text-xs text-slate-600 mb-4">
                    Template: <strong>{selectedTemplate.templateName}</strong> • 
                    Request from: <strong>{selectedRequest.requesterName}</strong>
                  </p>
                  <button
                    onClick={handleGenerateLetter}
                    disabled={isGenerating}
                    className="w-full px-4 py-3 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Icon icon="mingcute:magic-line" width={20} height={20} />
                        Generate Customized Letter
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {!selectedTemplate && selectedRequest?.draftReferralLetter && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Edit Draft Letter</h3>
                  <p className="text-xs text-slate-600 mb-4">
                    Request from: <strong>{selectedRequest.requesterName}</strong>
                  </p>
                </div>
              )}

              {(generatedLetter || selectedRequest?.draftReferralLetter) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {selectedRequest?.draftReferralLetter && !generatedLetter
                      ? "Draft Letter (edit as needed)"
                      : "Generated Letter (edit as needed)"}
                  </label>
                  <textarea
                    value={generatedLetter || selectedRequest?.draftReferralLetter || ""}
                    onChange={(e) => {
                      setGeneratedLetter(e.target.value);
                      setError(null); // Clear any previous errors when user edits
                    }}
                    rows={12}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] font-mono text-sm"
                    placeholder="Your referral letter will appear here..."
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleSaveLetter}
                      disabled={isSaving || (!generatedLetter?.trim() && !selectedRequest?.draftReferralLetter?.trim())}
                      className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Icon icon="mingcute:save-line" width={16} height={16} />
                          Save Letter
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Template Preview Modal */}
      {previewTemplateId && (
        <TemplatePreviewModal
          templateId={previewTemplateId}
          onClose={() => setPreviewTemplateId(null)}
        />
      )}
    </div>
  );
}

function ReferralStats({
  referrals,
  isLoading,
}: {
  referrals: ReferralRequest[];
  isLoading: boolean;
}) {
  const stats = useMemo(() => {
    if (referrals.length === 0) {
      return {
        overall: {
          total: 0,
          sent: 0,
          successful: 0,
          unsuccessful: 0,
          pending: 0,
          successRate: 0,
          responseRate: 0,
        },
        byContact: [] as Array<{
          contactId: string;
          contactName: string;
          contactEmail?: string;
          contactCompany?: string;
          total: number;
          sent: number;
          successful: number;
          unsuccessful: number;
          pending: number;
          successRate: number;
          responseRate: number;
          gratitudeExpressed: number;
          relationshipImpact: string[];
          reciprocityScore: number;
        }>,
      };
    }

    const sentReferrals = referrals.filter((r) => r.sentAt);
    const successfulReferrals = referrals.filter((r) => r.referralSuccessful === true);
    const unsuccessfulReferrals = referrals.filter((r) => r.referralSuccessful === false);
    const respondedReferrals = referrals.filter((r) => r.responseReceivedAt);
    const pendingReferrals = referrals.filter(
      (r) => r.sentAt && r.referralSuccessful === null && !r.responseReceivedAt
    );

    const overall = {
      total: referrals.length,
      sent: sentReferrals.length,
      successful: successfulReferrals.length,
      unsuccessful: unsuccessfulReferrals.length,
      pending: pendingReferrals.length,
      successRate:
        sentReferrals.length > 0
          ? (successfulReferrals.length / sentReferrals.length) * 100
          : 0,
      responseRate:
        sentReferrals.length > 0 ? (respondedReferrals.length / sentReferrals.length) * 100 : 0,
    };

    // Group by contact
    const contactMap = new Map<
      string,
      {
        contactId: string;
        contactName: string;
        contactEmail?: string;
        contactCompany?: string;
        referrals: ReferralRequest[];
      }
    >();

    referrals.forEach((referral) => {
      const contactId = referral.contactId;
      if (!contactMap.has(contactId)) {
        contactMap.set(contactId, {
          contactId,
          contactName: referral.contactName || "Unknown Contact",
          contactEmail: referral.contactEmail,
          contactCompany: referral.contactCompany,
          referrals: [],
        });
      }
      contactMap.get(contactId)!.referrals.push(referral);
    });

    const byContact = Array.from(contactMap.values()).map((contact) => {
      const contactReferrals = contact.referrals;
      const sent = contactReferrals.filter((r) => r.sentAt);
      const successful = contactReferrals.filter((r) => r.referralSuccessful === true);
      const unsuccessful = contactReferrals.filter((r) => r.referralSuccessful === false);
      const responded = contactReferrals.filter(
        (r) => r.responseReceivedAt || r.requestStatus === "received"
      );
      const pending = contactReferrals.filter(
        (r) => r.sentAt && r.referralSuccessful === null && !r.responseReceivedAt && r.requestStatus !== "received"
      );
      const gratitudeExpressed = contactReferrals.filter((r) => r.gratitudeExpressed).length;
      const relationshipImpacts = contactReferrals
        .map((r) => r.relationshipImpact)
        .filter((impact): impact is string => Boolean(impact));

      // Calculate reciprocity score (0-100)
      // Factors: response rate, success rate, gratitude expressed, positive relationship impact
      let reciprocityScore = 0;
      if (sent.length > 0) {
        const responseRate = (responded.length / sent.length) * 100;
        const successRate = sent.length > 0 ? (successful.length / sent.length) * 100 : 0;
        const gratitudeRate = (gratitudeExpressed / contactReferrals.length) * 100;
        const positiveImpactCount = relationshipImpacts.filter(
          (impact) =>
            impact.toLowerCase().includes("positive") ||
            impact.toLowerCase().includes("improved") ||
            impact.toLowerCase().includes("strengthened")
        ).length;
        const impactScore = relationshipImpacts.length > 0 ? (positiveImpactCount / relationshipImpacts.length) * 100 : 50;

        reciprocityScore = (responseRate * 0.3 + successRate * 0.4 + gratitudeRate * 0.2 + impactScore * 0.1);
      }

      return {
        contactId: contact.contactId,
        contactName: contact.contactName,
        contactEmail: contact.contactEmail,
        contactCompany: contact.contactCompany,
        total: contactReferrals.length,
        sent: sent.length,
        successful: successful.length,
        unsuccessful: unsuccessful.length,
        pending: pending.length,
        successRate: sent.length > 0 ? (successful.length / sent.length) * 100 : 0,
        responseRate: sent.length > 0 ? (responded.length / sent.length) * 100 : 0,
        gratitudeExpressed,
        relationshipImpact: relationshipImpacts,
        reciprocityScore: Math.round(reciprocityScore),
      };
    });

    // Sort by reciprocity score (highest first), then by total referrals
    byContact.sort((a, b) => {
      if (b.reciprocityScore !== a.reciprocityScore) {
        return b.reciprocityScore - a.reciprocityScore;
      }
      return b.total - a.total;
    });

    return { overall, byContact };
  }, [referrals]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
        <p className="mt-4 text-slate-600">Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Overall Referral Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Total Requests</p>
            <p className="text-2xl font-bold text-slate-900">{stats.overall.total}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 mb-1">Sent</p>
            <p className="text-2xl font-bold text-blue-900">{stats.overall.sent}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-green-900">
              {stats.overall.successRate.toFixed(1)}%
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600 mb-1">Response Rate</p>
            <p className="text-2xl font-bold text-purple-900">
              {stats.overall.responseRate.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-600">Successful</p>
            <p className="text-lg font-semibold text-green-600">{stats.overall.successful}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Unsuccessful</p>
            <p className="text-lg font-semibold text-red-600">{stats.overall.unsuccessful}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Pending</p>
            <p className="text-lg font-semibold text-orange-600">{stats.overall.pending}</p>
          </div>
        </div>
      </div>

      {/* Per-Person Stats */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Stats by Contact</h2>
        {stats.byContact.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <Icon icon="mingcute:user-line" width={48} height={48} className="mx-auto mb-3 text-slate-400" />
            <p>No referral data available yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stats.byContact.map((contact) => (
              <div
                key={contact.contactId}
                className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {contact.contactName}
                    </h3>
                    {contact.contactCompany && (
                      <p className="text-sm text-slate-600 mb-1">{contact.contactCompany}</p>
                    )}
                    {contact.contactEmail && (
                      <p className="text-xs text-slate-500">{contact.contactEmail}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Reciprocity Score</p>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              contact.reciprocityScore >= 70
                                ? "bg-green-500"
                                : contact.reciprocityScore >= 40
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${contact.reciprocityScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {contact.reciprocityScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Requests</p>
                    <p className="text-lg font-semibold text-slate-900">{contact.total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Success Rate</p>
                    <p className="text-lg font-semibold text-green-600">
                      {contact.successRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Response Rate</p>
                    <p className="text-lg font-semibold text-purple-600">
                      {contact.responseRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Gratitude Expressed</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {contact.gratitudeExpressed}/{contact.total}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Successful: </span>
                    <span className="font-semibold text-green-600">{contact.successful}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Unsuccessful: </span>
                    <span className="font-semibold text-red-600">{contact.unsuccessful}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Pending: </span>
                    <span className="font-semibold text-orange-600">{contact.pending}</span>
                  </div>
                </div>

                {contact.relationshipImpact.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Relationship Impact:</p>
                    <div className="flex flex-wrap gap-2">
                      {contact.relationshipImpact.map((impact, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded"
                        >
                          {impact}
                        </span>
                      ))}
                    </div>
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

function ReferralModal({
  isOpen,
  onClose,
  onSave,
  referral,
  isSubmitting,
  defaultJobId,
  excludedContactIds,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ReferralRequestInput) => void;
  referral?: ReferralRequest | null;
  isSubmitting: boolean;
  defaultJobId?: string | null;
  excludedContactIds?: string[] | null;
}) {
  const [formData, setFormData] = useState<ReferralRequestInput>({
    contactId: referral?.contactId || "",
    jobId: referral?.jobId || defaultJobId || "",
    personalizedMessage: referral?.personalizedMessage || "",
    requestTemplateId: referral?.requestTemplateId,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userName, setUserName] = useState<string>("");
  const [hasManualMessageEdit, setHasManualMessageEdit] = useState<boolean>(
    Boolean(referral?.personalizedMessage?.trim())
  );
  const [jobOpportunities, setJobOpportunities] = useState<JobOpportunityData[]>([]);
  const [contacts, setContacts] = useState<ProfessionalContact[]>([]);
  const [suggestedContacts, setSuggestedContacts] = useState<{
    industryMatches: ProfessionalContact[];
    otherContacts: ProfessionalContact[];
  }>({ industryMatches: [], otherContacts: [] });
  const [selectedJob, setSelectedJob] = useState<JobOpportunityData | null>(null);
  const [templates, setTemplates] = useState<ReferralTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReferralTemplate | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [userSkillOrProject, setUserSkillOrProject] = useState<string>("");
  const [isPersonalizingMessage, setIsPersonalizingMessage] = useState(false);
  const [personalizationError, setPersonalizationError] = useState<string | null>(null);

  const availableContacts = useMemo(() => {
    if (!excludedContactIds?.length) return contacts;
    const excludedSet = new Set(excludedContactIds);
    return contacts.filter((contact) => !excludedSet.has(contact.id));
  }, [contacts, excludedContactIds]);

  const getContactById = (contactId?: string) => {
    if (!contactId) return undefined;
    return contacts.find((contact) => contact.id === contactId);
  };

  const getJobById = (jobId?: string) => {
    if (!jobId) return null;
    if (selectedJob && selectedJob.id === jobId) {
      return selectedJob;
    }
    return jobOpportunities.find((job) => job.id === jobId) || null;
  };

  const getContactDisplayName = (contact?: ProfessionalContact) => {
    if (!contact) return "";
    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
    if (fullName) return fullName;
    if (contact.email) return contact.email;
    return "";
  };

  const getContactCompany = (contact?: ProfessionalContact) => {
    if (contact?.company) {
      return contact.company;
    }
    return referral?.contactCompany || "";
  };

  const getContactSkillsOrProjects = (referral?: ReferralRequest) => {
    const fields: Array<string | undefined | null> = [
      referral?.relationshipImpact,
      referral?.responseContent,
    ];
    const mention = fields.find((value) => value && value.trim().length > 0);
    return mention || userSkillOrProject || "";
  };

  const formatTemplateBody = (
    body?: string,
    overrides?: { contactId?: string; jobId?: string; referral?: ReferralRequest | null }
  ) => {
    if (!body) return "";
    const contact = getContactById(overrides?.contactId ?? formData.contactId);
    const job = getJobById(overrides?.jobId ?? formData.jobId);
    const referralContext = overrides?.referral || null;

    const replacements: Record<string, string> = {
      "Contact Name": getContactDisplayName(contact),
      "Contact Company": getContactCompany(contact),
      "Contact's Company Name": getContactCompany(contact),
      "Specific Skill/Project":
        getContactSkillsOrProjects(referralContext) || getContactSkillsOrProjects(referral),
      "Specific Skill or Project":
        getContactSkillsOrProjects(referralContext) || getContactSkillsOrProjects(referral),
      "Job Title": job?.title || "",
      "Job Company": job?.company || "",
      "Company Name": job?.company || "",
      "Your Name": userName || "Your Name",
    };

    return Object.entries(replacements).reduce((message, [token, value]) => {
      if (!value?.trim()) return message;
      const regex = new RegExp(`\\[${token}\\]`, "gi");
      return message.replace(regex, value);
    }, body);
  };

  const extractToneFromTemplate = (template?: ReferralTemplate | null) => {
    if (!template?.templateName) return undefined;
    const toneMatch =
      template.templateName.match(/Tone:\s*([^•]+)/i) ||
      template.templateName.match(/\((?:Tone|tone):\s*([^)]+)\)/);
    return toneMatch ? toneMatch[1].trim() : undefined;
  };

  const describeTemplateOption = (template: ReferralTemplate) => {
    const tone = extractToneFromTemplate(template) || "Warm Professional";
    let baseName = template.templateName || "";
    if (!baseName && template.templateBody) {
      const snippet = template.templateBody.substring(0, 60).trim();
      baseName = `${snippet}${template.templateBody.length > 60 ? "..." : ""}`;
    }
    if (!baseName) {
      baseName = "Untitled Template";
    }
    const cleanedBase = baseName.replace(/•\s*Tone:.*/i, "").trim();
    return `${cleanedBase} • Tone: ${tone}`;
  };

  const fetchPersonalizedMessage = useCallback(
    async (templateContent?: string | null, templateId?: string, toneHint?: string) => {
      if ((!templateContent && !templateId) || !formData.contactId || !formData.jobId) {
        return null;
      }
      try {
        setIsPersonalizingMessage(true);
        setPersonalizationError(null);
        const response = await api.generateReferralMessage({
          contactId: formData.contactId,
          jobId: formData.jobId,
          templateBody: templateContent,
          templateId,
          tone: toneHint,
        });
        if (response.ok && response.data?.message) {
          return response.data.message;
        }
        setPersonalizationError(response.error?.message || "Unable to personalize template with AI");
      } catch (err) {
        console.error("Failed to personalize referral template:", err);
        setPersonalizationError("Unable to personalize template with AI. Please try again.");
      } finally {
        setIsPersonalizingMessage(false);
      }
      return null;
    },
    [formData.contactId, formData.jobId]
  );

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!referral && defaultJobId && formData.jobId !== defaultJobId) {
      setFormData((prev) => ({ ...prev, jobId: defaultJobId }));
    }
  }, [defaultJobId, referral]);

  useEffect(() => {
    if (formData.contactId && excludedContactIds?.includes(formData.contactId)) {
      setFormData((prev) => ({ ...prev, contactId: "" }));
    }
  }, [excludedContactIds, formData.contactId]);

  useEffect(() => {
    if (formData.jobId && jobOpportunities.length > 0) {
      const job = jobOpportunities.find((j) => j.id === formData.jobId);
      setSelectedJob(job || null);
      if (job) {
        loadSuggestedContacts(job.industry);
      }
    }
  }, [formData.jobId, jobOpportunities, referral, availableContacts]);

  useEffect(() => {
    if (selectedJob) {
      loadSuggestedContacts(selectedJob.industry);
    } else {
      setSuggestedContacts({ industryMatches: [], otherContacts: availableContacts });
    }
  }, [availableContacts, selectedJob?.industry]);

  useEffect(() => {
    if (
      hasManualMessageEdit ||
      selectedTemplate ||
      !formData.contactId ||
      !formData.jobId ||
      contacts.length === 0 ||
      jobOpportunities.length === 0
    ) {
      return;
    }

    const contact = getContactById(formData.contactId);
    const job = getJobById(formData.jobId);
    if (!contact || !job) {
      return;
    }

    const contactName =
      [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() ||
      contact.email ||
      "there";
    const jobTitle = job.title || "the role";
    const jobCompany = job.company || "the company";
    const displayUserName = userName || "Your Name";
    const defaultMessage = `Hi ${contactName},

I hope you're doing well. I'm currently applying for the ${jobTitle} role at ${jobCompany} and would really appreciate a referral or any insights you can share. I'm happy to send along my resume or any context that would be helpful.

Thanks so much,
${displayUserName}`;

    if (formData.personalizedMessage?.trim() === defaultMessage.trim()) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      personalizedMessage: defaultMessage,
    }));
  }, [
    contacts,
    formData.contactId,
    formData.jobId,
    hasManualMessageEdit,
    jobOpportunities,
    selectedJob,
    selectedTemplate,
    userName,
  ]);

  useEffect(() => {
    if (!selectedTemplate || hasManualMessageEdit) {
      return;
    }

    const personalize = async () => {
      if (selectedTemplate.templateBody && formData.contactId && formData.jobId) {
        const aiMessage = await fetchPersonalizedMessage(
          selectedTemplate.templateBody,
          selectedTemplate.id,
          extractToneFromTemplate(selectedTemplate)
        );
        if (aiMessage) {
          if (aiMessage.trim() === formData.personalizedMessage?.trim()) {
            return;
          }
          setFormData((prev) => ({
            ...prev,
            personalizedMessage: aiMessage,
          }));
          return;
        }
      }

      const filledMessage = formatTemplateBody(selectedTemplate.templateBody, { referral });
      if (!filledMessage) {
        return;
      }

      if (filledMessage.trim() === formData.personalizedMessage?.trim()) {
        return;
      }

      setFormData((prev) => ({
        ...prev,
        personalizedMessage: filledMessage,
      }));
    };

    personalize();
  }, [
    fetchPersonalizedMessage,
    formData.contactId,
    formData.jobId,
    formData.personalizedMessage,
    hasManualMessageEdit,
    referral,
    selectedTemplate,
    userName,
    userSkillOrProject,
  ]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      // Load job opportunities
      const jobsResponse = await api.getJobOpportunities({ sort: "-created_at" });
      if (jobsResponse.ok && jobsResponse.data?.jobOpportunities) {
        const nonArchivedJobs = jobsResponse.data.jobOpportunities.filter((job: JobOpportunityData) => !job.archived);
        setJobOpportunities(nonArchivedJobs);
        
        // If editing, set selected job
        if (referral?.jobId) {
          const job = nonArchivedJobs.find((j: JobOpportunityData) => j.id === referral.jobId);
          setSelectedJob(job || null);
          if (job) {
            loadSuggestedContacts(job.industry);
          }
        }
      }

      // Load all contacts
      const contactsResponse = await api.getContacts();
      if (contactsResponse.ok && contactsResponse.data?.contacts) {
        setContacts(contactsResponse.data.contacts);
      }

      // Load templates
      const templatesResponse = await api.getReferralTemplates();
      if (templatesResponse.ok && templatesResponse.data?.templates) {
        setTemplates(templatesResponse.data.templates);
      }

      // Load user profile for personalization fallback
      const profileResponse = await api.getProfile();
      if (profileResponse.ok && profileResponse.data?.profile) {
        const profile = profileResponse.data.profile;
        const fullName =
          profile.fullName ||
          [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
        if (fullName) {
          setUserName(fullName);
        }
      }

      // Load skills for personalization
      let highlight = "";
      const skillsResponse = await api.getSkills();
      if (
        skillsResponse.ok &&
        skillsResponse.data?.skills &&
        skillsResponse.data.skills.length > 0
      ) {
        highlight = skillsResponse.data.skills[0].skillName || "";
      }

      if (!highlight) {
        const projectsResponse = await api.getProjects();
        if (
          projectsResponse.ok &&
          projectsResponse.data?.projects &&
          projectsResponse.data.projects.length > 0
        ) {
          highlight = projectsResponse.data.projects[0].name || "";
        }
      }

      if (highlight) {
        setUserSkillOrProject(highlight);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadSuggestedContacts = async (industry?: string) => {
    const sourceContacts = availableContacts;
    if (!industry) {
      setSuggestedContacts({ industryMatches: [], otherContacts: sourceContacts });
      return;
    }

    const industryLower = industry.toLowerCase();
    const industryMatches = sourceContacts.filter(
      (contact) => contact.industry?.toLowerCase() === industryLower
    );
    const otherContacts = sourceContacts.filter(
      (contact) => contact.industry?.toLowerCase() !== industryLower
    );

    setSuggestedContacts({ industryMatches, otherContacts });
  };

  const handleTemplateSelect = (template: ReferralTemplate) => {
    setSelectedTemplate(template);
    setPersonalizationError(null);
    setFormData((prev) => ({
      ...prev,
      requestTemplateId: template.id,
      personalizedMessage: template.templateBody
        ? formatTemplateBody(template.templateBody, {
            contactId: prev.contactId,
            jobId: prev.jobId,
            referral,
          }) || template.templateBody
        : prev.personalizedMessage,
    }));
    setHasManualMessageEdit(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const contactIdError = validateRequired(formData.contactId, "Contact");
    if (contactIdError) newErrors.contactId = contactIdError;

    const jobIdError = validateRequired(formData.jobId, "Job Opportunity");
    if (jobIdError) newErrors.jobId = jobIdError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleFieldChange = (field: keyof ReferralRequestInput, value: string | boolean | undefined) => {
    setFormData({ ...formData, [field]: value });
    if (field === "personalizedMessage") {
      setHasManualMessageEdit(true);
    }
    if (errors[field as string]) {
      setErrors({ ...errors, [field as string]: "" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-2 sm:p-4 pt-16 sm:pt-20 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full mb-4 sm:mb-8 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {referral ? "Edit Referral Request" : "Request Referral"}
          </h2>
          {referral?.requestStatus === "received" && (
            <p className="text-sm text-red-600 mt-2">
              This referral has been received and cannot be edited.
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {referral?.requestStatus === "received" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                This referral has already been received and cannot be edited or deleted.
              </p>
            </div>
          )}
          {isLoadingData ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
              <p className="mt-4 text-slate-600">Loading data...</p>
            </div>
          ) : (
            <>
              {/* Job Opportunity Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Job Opportunity *
                </label>
                <select
                  required
                  value={formData.jobId}
                  disabled={Boolean(referral) || Boolean(defaultJobId) || referral?.requestStatus === "received"}
                  onChange={(e) => {
                    handleFieldChange("jobId", e.target.value);
                    const job = jobOpportunities.find((j) => j.id === e.target.value);
                    setSelectedJob(job || null);
                    if (job) {
                      loadSuggestedContacts(job.industry);
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                    errors.jobId ? "border-red-300" : "border-slate-300"
                  } ${referral || defaultJobId ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
                >
                  <option value="">Select a job opportunity</option>
                  {jobOpportunities.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} at {job.company} {job.location ? `(${job.location})` : ""}
                    </option>
                  ))}
                </select>
                {errors.jobId && (
                  <p className="mt-1 text-sm text-red-600">{errors.jobId}</p>
                )}
                {selectedJob && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <span className="font-semibold">Industry:</span> {selectedJob.industry || "Not specified"}
                    </p>
                  </div>
                )}
              </div>

              {/* Contact Selection with Industry Suggestions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact *
                </label>
                {availableContacts.length === 0 ? (
                  <div className="mt-2 p-3 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600">
                    No other contacts available. Add more contacts to your network!
                  </div>
                ) : (
                  <>
                    {selectedJob && suggestedContacts.industryMatches.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">
                          Suggested Contacts (Same Industry: {selectedJob.industry})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                          {suggestedContacts.industryMatches.map((contact) => (
                            <button
                              key={contact.id}
                              type="button"
                              onClick={() => handleFieldChange("contactId", contact.id)}
                              disabled={referral?.requestStatus === "received"}
                              className={`p-3 text-left border rounded-lg transition-colors ${
                                formData.contactId === contact.id
                                  ? "border-[#3351FD] bg-blue-50"
                                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                              } ${referral?.requestStatus === "received" ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <p className="font-medium text-slate-900">
                                {contact.firstName} {contact.lastName}
                              </p>
                              {contact.company && (
                                <p className="text-xs text-slate-600">{contact.company}</p>
                              )}
                              {contact.jobTitle && (
                                <p className="text-xs text-slate-500">{contact.jobTitle}</p>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedJob && suggestedContacts.otherContacts.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">
                          Other Contacts
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                          {suggestedContacts.otherContacts.map((contact) => (
                            <button
                              key={contact.id}
                              type="button"
                              onClick={() => handleFieldChange("contactId", contact.id)}
                              className={`p-3 text-left border rounded-lg transition-colors ${
                                formData.contactId === contact.id
                                  ? "border-[#3351FD] bg-blue-50"
                                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <p className="font-medium text-slate-900">
                                {contact.firstName} {contact.lastName}
                              </p>
                              {contact.company && (
                                <p className="text-xs text-slate-600">{contact.company}</p>
                              )}
                              {contact.industry && (
                                <p className="text-xs text-slate-500">{contact.industry}</p>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!selectedJob && (
                      <select
                        required
                        value={formData.contactId}
                        onChange={(e) => handleFieldChange("contactId", e.target.value)}
                        disabled={referral?.requestStatus === "received"}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                          errors.contactId ? "border-red-300" : "border-slate-300"
                        } ${referral?.requestStatus === "received" ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
                      >
                        <option value="">Select a contact (select job first for suggestions)</option>
                        {availableContacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.firstName} {contact.lastName}
                            {contact.company ? ` - ${contact.company}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}

                {errors.contactId && (
                  <p className="mt-1 text-sm text-red-600">{errors.contactId}</p>
                )}
              </div>

              {/* Template Selection */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Referral Template (Optional)
                  </label>
                  <select
                    value={selectedTemplate?.id || ""}
                    onChange={(e) => {
                      const template = templates.find((t) => t.id === e.target.value);
                      if (template) {
                        handleTemplateSelect(template);
                      }
                    }}
                    disabled={referral?.requestStatus === "received"}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                      referral?.requestStatus === "received" ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
                    }`}
                  >
                    <option value="">Select a template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {describeTemplateOption(template)}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      {selectedTemplate.etiquetteGuidance && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-slate-700">Etiquette:</p>
                          <p className="text-xs text-slate-600">{selectedTemplate.etiquetteGuidance}</p>
                        </div>
                      )}
                      {selectedTemplate.timingGuidance && (
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Timing:</p>
                          <p className="text-xs text-slate-600">{selectedTemplate.timingGuidance}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {isPersonalizingMessage && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[#3351FD]"></div>
                      Personalizing message with AI...
                    </div>
                  )}
                  {selectedTemplate && (
                    <p className="mt-2 text-xs text-slate-500">
                      Tailored selection: {describeTemplateOption(selectedTemplate)}
                    </p>
                  )}
                  {personalizationError && (
                    <p className="mt-2 text-sm text-red-600">{personalizationError}</p>
                  )}
                </div>
              )}

              {/* Personalized Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Personalized Message
                </label>
                <textarea
                  value={formData.personalizedMessage}
                  onChange={(e) => handleFieldChange("personalizedMessage", e.target.value)}
                  rows={6}
                  disabled={referral?.requestStatus === "received"}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                    referral?.requestStatus === "received" ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
                  }`}
                  placeholder="Customize your referral request message..."
                />
              </div>


              {/* Additional fields for editing */}
              {referral && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.referralSuccessful || false}
                      onChange={(e) => handleFieldChange("referralSuccessful", e.target.checked)}
                      disabled={referral?.requestStatus === "received"}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium text-slate-700">Referral Successful</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.gratitudeExpressed || false}
                      onChange={(e) => handleFieldChange("gratitudeExpressed", e.target.checked)}
                      disabled={referral?.requestStatus === "received"}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium text-slate-700">Gratitude Expressed</label>
                  </div>
                </>
              )}
            </>
          )}

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
              disabled={isSubmitting || isLoadingData || referral?.requestStatus === "received"}
              className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : referral ? "Update" : "Request"} Referral
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TemplateGeneratorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<ReferralTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReferralTemplate | null>(null);
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<string>(TEMPLATE_TONES[0].value);
  const [selectedLength, setSelectedLength] = useState<"brief" | "standard" | "detailed">("standard");
  const [selectedToneFilter, setSelectedToneFilter] = useState<string>("all");
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobOpportunityData[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadJobs();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const templatesResponse = await api.getReferralTemplates();
      if (templatesResponse.ok && templatesResponse.data?.templates) {
        setTemplates(templatesResponse.data.templates);
        if (templatesResponse.data.templates.length > 0) {
          const firstTemplate = templatesResponse.data.templates[0];
          setSelectedTemplate(firstTemplate);
          setMessage(firstTemplate.templateBody || "");
        } else {
          setSelectedTemplate(null);
          setMessage("");
        }
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
      setError("Failed to load templates. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const response = await api.getJobOpportunities({ sort: "-created_at", limit: 100 });
      if (response.ok && response.data?.jobOpportunities) {
        const availableJobs = response.data.jobOpportunities.filter((job) => !job.archived);
        setJobs(availableJobs);
        if (availableJobs.length > 0) {
          setSelectedJobId(availableJobs[0].id);
        } else {
          setSelectedJobId("");
        }
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleGenerateTemplate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const toneLabel =
        TEMPLATE_TONES.find((tone) => tone.value === selectedTone)?.label || "Warm Professional";
      const selectedJob = jobs.find((j) => j.id === selectedJobId);
      
      const templateName = selectedJob
        ? `Referral Template - ${selectedJob.title} @ ${selectedJob.company} • ${toneLabel} (${selectedLength})`
        : `Referral Template - ${toneLabel} (${selectedLength})`;

      const response = await api.createReferralRequestTemplateWithAI({
        templateName,
        tone: selectedTone,
        length: selectedLength,
        jobId: selectedJobId || undefined,
        jobTitle: selectedJob?.title,
        jobCompany: selectedJob?.company,
        jobLocation: selectedJob?.location,
        jobIndustry: selectedJob?.industry,
      });
      if (response.ok && response.data?.template) {
        const newTemplate = response.data.template;
        setTemplates((prev) => [newTemplate, ...prev]);
        setSelectedTemplate(newTemplate);
        setMessage(newTemplate.templateBody || "");
      } else {
        setError(response.error?.message || "Failed to generate template");
      }
    } catch (err: any) {
      console.error("Failed to generate template:", err);
      setError("Failed to generate template. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectTemplate = (template: ReferralTemplate) => {
    setSelectedTemplate(template);
    setMessage(template.templateBody || "");
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (isDeletingId || !templateId) return;
    const template = templates.find((t) => t.id === templateId);
    const templateName = template?.templateName || "this template";
    if (!confirm(`Delete ${templateName}? This cannot be undone.`)) {
      return;
    }

    try {
      setIsDeletingId(templateId);
      setError(null);
      const response = await api.deleteReferralTemplate(templateId);
      if (response.ok) {
        const remaining = templates.filter((t) => t.id !== templateId);
        setTemplates(remaining);
        if (selectedTemplate?.id === templateId) {
          if (remaining.length > 0) {
            setSelectedTemplate(remaining[0]);
            setMessage(remaining[0].templateBody || "");
          } else {
            setSelectedTemplate(null);
            setMessage("");
          }
        }
      } else {
        setError(response.error?.message || "Failed to delete template");
      }
    } catch (err) {
      console.error("Failed to delete template:", err);
      setError("Failed to delete template. Please try again.");
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleCopyMessage = async () => {
    if (!message.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopyStatus("Copied!");
    } catch (err) {
      console.error("Failed to copy template:", err);
      setCopyStatus("Copy failed");
    } finally {
      setTimeout(() => setCopyStatus(null), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-2 sm:p-4 pt-16 sm:pt-20 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full mb-4 sm:mb-8 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Generate Referral Template</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon icon="mingcute:close-line" width={24} height={24} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/2 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Target Job Position (Optional)</h3>
                {isLoadingJobs ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[#3351FD]"></div>
                    Loading job opportunities...
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="p-3 text-sm text-slate-600 border border-dashed border-slate-300 rounded-lg">
                    No job opportunities available. The template will be generic.
                  </div>
                ) : (
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
                  >
                    <option value="">Generic Template (No specific job)</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} at {job.company}
                        {job.location ? ` (${job.location})` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {selectedJobId && (
                  <p className="mt-2 text-xs text-slate-500">
                    The template will be tailored for the selected role.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Tone</h3>
                <select
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
                >
                  {TEMPLATE_TONES.map((toneOption) => (
                    <option key={toneOption.value} value={toneOption.value}>
                      {toneOption.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Length</h3>
                <select
                  value={selectedLength}
                  onChange={(e) => setSelectedLength(e.target.value as "brief" | "standard" | "detailed")}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
                >
                  <option value="brief">Brief (Under 100 words)</option>
                  <option value="standard">Standard (150-200 words)</option>
                  <option value="detailed">Detailed (200-300 words)</option>
                </select>
              </div>

              <button
                onClick={handleGenerateTemplate}
                disabled={isGenerating}
                className="w-full px-4 py-3 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon icon="mingcute:magic-line" width={20} height={20} />
                    Generate Template with AI
                  </>
                )}
              </button>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-900">Existing Templates</h3>
                  <select
                    value={selectedToneFilter}
                    onChange={(e) => setSelectedToneFilter(e.target.value)}
                    className="text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-[#3351FD]"
                  >
                    <option value="all">All Tones</option>
                    {TEMPLATE_TONES.map((toneOption) => (
                      <option key={toneOption.value} value={toneOption.value}>
                        {toneOption.label}
                      </option>
                    ))}
                  </select>
                </div>
                {isLoading ? (
                  <div className="text-center py-8 text-slate-600">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#3351FD]"></div>
                    <p className="mt-3 text-sm">Loading templates...</p>
                  </div>
                ) : (() => {
                  const filteredTemplates = selectedToneFilter === "all" 
                    ? templates 
                    : templates.filter(t => t.tone === selectedToneFilter);
                  
                  return filteredTemplates.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600">
                      No templates found. {selectedToneFilter !== "all" ? "Try a different tone filter." : "Generate one to get started."}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {filteredTemplates.map((template) => (
                        <div
                          key={template.id}
                          className={`relative w-full border rounded-lg transition-colors ${
                            selectedTemplate?.id === template.id
                              ? "border-[#3351FD] bg-blue-50"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectTemplate(template)}
                            className="w-full text-left p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">
                                  {template.templateName || "Untitled Template"}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {template.tone && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                      {TEMPLATE_TONES.find(t => t.value === template.tone)?.label || template.tone}
                                    </span>
                                  )}
                                  {template.length && (
                                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded capitalize">
                                      {template.length}
                                    </span>
                                  )}
                                </div>
                                {template.templateBody && (
                                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                    {template.templateBody}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTemplateId(template.id);
                              }}
                              className="p-1.5 rounded-full text-slate-400 hover:text-[#3351FD] hover:bg-blue-50"
                              title="Preview template"
                            >
                              <Icon icon="mingcute:eye-line" width={16} height={16} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(template.id);
                              }}
                              disabled={isDeletingId === template.id}
                              className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-60"
                              title="Delete template"
                            >
                              {isDeletingId === template.id ? (
                                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                              ) : (
                                <Icon icon="mingcute:delete-line" width={16} height={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="lg:w-1/2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Template Preview</h3>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  disabled={!message.trim()}
                  className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1"
                >
                  <Icon icon="mingcute:copy-2-line" width={16} height={16} />
                  {copyStatus || "Copy"}
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={16}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] font-mono text-sm"
                placeholder="Select or generate a template to preview it here."
              />
              <p className="text-xs text-slate-500">
                Copy this message into your referral request to personalize it for a contact.
              </p>
            </div>
          </div>
        </div>

        {/* Template Preview Modal */}
        {previewTemplateId && (
          <TemplatePreviewModal
            templateId={previewTemplateId}
            onClose={() => setPreviewTemplateId(null)}
          />
        )}
      </div>
    </div>
  );
}

function TemplatePreviewModal({
  templateId,
  onClose,
}: {
  templateId: string;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.getReferralTemplatePreview(templateId);
        if (response.ok && response.data?.template) {
          setPreview(response.data.template.templateBody || "");
        } else {
          setError(response.error?.message || "Failed to load preview");
        }
      } catch (err: any) {
        console.error("Failed to load preview:", err);
        setError(err.message || "Failed to load preview. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (templateId) {
      loadPreview();
    }
  }, [templateId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-slate-900">Template Preview</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon="mingcute:close-line" width={24} height={24} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
              <p className="mt-4 text-slate-600">Loading preview...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <div className="prose prose-sm max-w-none">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {preview}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewReferralModal({
  isOpen,
  onClose,
  referral,
}: {
  isOpen: boolean;
  onClose: () => void;
  referral: ReferralRequest;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-2 sm:p-4 pt-16 sm:pt-20 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full mb-4 sm:mb-8 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Referral Letter Received</h2>
            <p className="text-sm text-slate-600 mt-1">
              From: {referral.contactName || "Unknown Contact"}
              {referral.responseReceivedAt && (
                <> • Received: {new Date(referral.responseReceivedAt).toLocaleDateString()}</>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Icon icon="mingcute:close-line" width={24} height={24} />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {referral.jobTitle} at {referral.jobCompany}
            </h3>
            {referral.jobLocation && (
              <p className="text-sm text-slate-600">Location: {referral.jobLocation}</p>
            )}
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Referral Letter</h4>
            <div className="prose prose-sm max-w-none">
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {referral.responseContent}
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
