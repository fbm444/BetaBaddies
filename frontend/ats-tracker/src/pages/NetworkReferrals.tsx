import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ReferralRequest, ReferralRequestInput, ReferralTemplate, ProfessionalContact } from "../types/network.types";
import { JobOpportunityData } from "../types/jobOpportunity.types";
import { validateRequired } from "../utils/validation";

export function NetworkReferrals() {
  const [referrals, setReferrals] = useState<ReferralRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<ReferralRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendRequestReferral, setSendRequestReferral] = useState<ReferralRequest | null>(null);

  useEffect(() => {
    fetchReferrals();
  }, []);

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


  const handleAddReferral = async (referralData: ReferralRequestInput) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.createReferralRequest(referralData);
      if (response.ok) {
        await fetchReferrals();
        setIsAddModalOpen(false);
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Referral Requests</h1>
          <p className="text-slate-600">Track and manage referral requests to leverage your network</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

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
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors flex items-center gap-2 mx-auto"
            >
              <Icon icon="mingcute:add-line" width={20} height={20} />
              Request Referral
            </button>
          </div>
        ) : (
          <div className="space-y-4">
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors flex items-center gap-2"
                  >
                    <Icon icon="mingcute:add-line" width={20} height={20} />
                    Request Referral
                  </button>
                </div>
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {referral.jobCompany}
                        </h3>
                        {referral.jobTitle && (
                          <p className="text-sm text-slate-600 mt-1">{referral.jobTitle}</p>
                        )}
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          {referral.contactName && <p>Contact: {referral.contactName}</p>}
                          {referral.sentAt && (
                            <p>Sent: {new Date(referral.sentAt).toLocaleDateString()}</p>
                          )}
                          {referral.referralSuccessful !== null && (
                            <p className={referral.referralSuccessful ? "text-green-600" : "text-red-600"}>
                              {referral.referralSuccessful ? "✓ Referral successful" : "✗ Referral unsuccessful"}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!referral.sentAt && (
                          <button
                            onClick={() => {
                              setSendRequestReferral(referral);
                            }}
                            className="px-3 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors text-sm flex items-center gap-2"
                            title="Send Request"
                          >
                            <Icon icon="mingcute:send-line" width={16} height={16} />
                            Send Request
                          </button>
                        )}
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
                      </div>
                    </div>
                  </div>
                ))}
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
            }}
            onSave={isAddModalOpen ? handleAddReferral : (data) => selectedReferral && handleEditReferral(selectedReferral.id, data)}
            referral={selectedReferral}
            isSubmitting={isSubmitting}
          />
        )}

        {sendRequestReferral && (
          <SendRequestModal
            referral={sendRequestReferral}
            onClose={() => setSendRequestReferral(null)}
            onSent={() => {
              setSendRequestReferral(null);
              fetchReferrals();
            }}
          />
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
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ReferralRequestInput) => void;
  referral?: ReferralRequest | null;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<ReferralRequestInput>({
    contactId: referral?.contactId || "",
    jobId: referral?.jobId || "",
    personalizedMessage: referral?.personalizedMessage || "",
    requestTemplateId: referral?.requestTemplateId,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
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

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.jobId && jobOpportunities.length > 0) {
      const job = jobOpportunities.find((j) => j.id === formData.jobId);
      setSelectedJob(job || null);
      if (job) {
        loadSuggestedContacts(job.industry);
      }
    }
  }, [formData.jobId, jobOpportunities, referral]);

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
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadSuggestedContacts = async (industry?: string) => {
    if (!industry) {
      setSuggestedContacts({ industryMatches: [], otherContacts: contacts });
      return;
    }

    // Filter contacts by industry
    const industryMatches = contacts.filter(
      (contact) => contact.industry?.toLowerCase() === industry.toLowerCase()
    );
    const otherContacts = contacts.filter(
      (contact) => contact.industry?.toLowerCase() !== industry.toLowerCase()
    );

    setSuggestedContacts({ industryMatches, otherContacts });
  };

  const handleTemplateSelect = (template: ReferralTemplate) => {
    setSelectedTemplate(template);
    if (template.templateBody) {
      setFormData({
        ...formData,
        requestTemplateId: template.id,
        personalizedMessage: template.templateBody,
      });
    }
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
    if (errors[field as string]) {
      setErrors({ ...errors, [field as string]: "" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {referral ? "Edit Referral Request" : "Request Referral"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  }`}
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                      errors.contactId ? "border-red-300" : "border-slate-300"
                    }`}
                  >
                    <option value="">Select a contact (select job first for suggestions)</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName}
                        {contact.company ? ` - ${contact.company}` : ""}
                      </option>
                    ))}
                  </select>
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
                  >
                    <option value="">Select a template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.templateName || "Untitled Template"}
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
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
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium text-slate-700">Referral Successful</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.gratitudeExpressed || false}
                      onChange={(e) => handleFieldChange("gratitudeExpressed", e.target.checked)}
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
              disabled={isSubmitting || isLoadingData}
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

// Send Request Modal - Handles template selection/generation and sending
function SendRequestModal({
  referral,
  onClose,
  onSent,
}: {
  referral: ReferralRequest;
  onClose: () => void;
  onSent: () => void;
}) {
  const [step, setStep] = useState<"template" | "edit">("template");
  const [templates, setTemplates] = useState<ReferralTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReferralTemplate | null>(null);
  const [message, setMessage] = useState<string>(referral.personalizedMessage || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobOpportunity, setJobOpportunity] = useState<JobOpportunityData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load templates
      const templatesResponse = await api.getReferralTemplates();
      if (templatesResponse.ok && templatesResponse.data?.templates) {
        setTemplates(templatesResponse.data.templates);
      }

      // Load job opportunity
      const jobResponse = await api.getJobOpportunity(referral.jobId);
      if (jobResponse.ok && jobResponse.data?.jobOpportunity) {
        setJobOpportunity(jobResponse.data.jobOpportunity);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTemplate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const response = await api.createReferralTemplateWithAI({
        templateName: `Referral for ${jobOpportunity?.company || "Company"}`,
        industry: jobOpportunity?.industry,
      });
      if (response.ok && response.data?.template) {
        const newTemplate = response.data.template;
        setTemplates([newTemplate, ...templates]);
        setSelectedTemplate(newTemplate);
        if (newTemplate.templateBody) {
          setMessage(newTemplate.templateBody);
        }
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
    if (template.templateBody) {
      setMessage(template.templateBody);
      setStep("edit");
    }
  };

  const handleSend = async () => {
    try {
      setIsSending(true);
      setError(null);
      
      // Update referral with message and send timestamp
      const response = await api.updateReferralRequest(referral.id, {
        personalizedMessage: message,
        requestStatus: "sent",
        sentAt: new Date().toISOString(),
        requestTemplateId: selectedTemplate?.id,
      });

      if (response.ok) {
        // Email will be sent by backend
        onSent();
      } else {
        setError(response.error?.message || "Failed to send referral request");
      }
    } catch (err: any) {
      console.error("Failed to send referral request:", err);
      setError("Failed to send referral request. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (!referral) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {step === "template" ? "Select or Generate Template" : "Edit & Send Request"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <Icon icon="mingcute:close-line" width={24} height={24} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {step === "template" ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>To:</strong> {referral.contactName} ({referral.contactEmail})
                </p>
                <p className="text-sm text-blue-900 mt-1">
                  <strong>Job:</strong> {referral.jobTitle} at {referral.jobCompany}
                </p>
              </div>

              <div className="flex gap-4 mb-6">
                <button
                  onClick={handleGenerateTemplate}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-3 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Or Select Existing Template</h3>
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">
                    No templates available. Generate one using AI above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? "border-[#3351FD] bg-blue-50"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <h4 className="font-semibold text-slate-900 mb-2">
                          {template.templateName || "Untitled Template"}
                        </h4>
                        {template.templateBody && (
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {template.templateBody.substring(0, 150)}...
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {message && (
                <div className="mt-6">
                  <button
                    onClick={() => setStep("edit")}
                    className="w-full px-4 py-3 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors"
                  >
                    Continue to Edit
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>To:</strong> {referral.contactName} ({referral.contactEmail})
                </p>
                <p className="text-sm text-blue-900 mt-1">
                  <strong>Job:</strong> {referral.jobTitle} at {referral.jobCompany}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] font-mono text-sm"
                  placeholder="Enter your referral request message..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep("template")}
                  className="flex-1 px-4 py-3 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Back to Templates
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending || !message.trim()}
                  className="flex-1 px-4 py-3 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Icon icon="mingcute:send-line" width={20} height={20} />
                      Send Request
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
