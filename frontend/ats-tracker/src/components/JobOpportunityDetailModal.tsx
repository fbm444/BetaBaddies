import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import type {
  JobOpportunityData,
  JobOpportunityInput,
  JobStatus,
  ApplicationHistoryEntry,
  StatusHistoryEntry,
  SkillGapSnapshot,
  SkillGapProgressEntry,
} from "../types";
import { JOB_STATUSES, STATUS_COLORS, STATUS_BG_COLORS, INDUSTRIES, JOB_TYPES } from "../types";
import {
  getDaysRemaining,
  getDeadlineUrgency,
  getDeadlineColor,
  getDeadlineBgColor,
  formatDeadlineText,
} from "../utils/deadlineUtils";
import { CompanyInfoModal } from "./CompanyInfoModal";
import { JobSkillGapPanel } from "./skill-gaps/SkillGapPanel";
import { JobMaterialsSection } from "./JobMaterialsSection";
import { JobMatchScore } from "./JobMatchScore";
import { EmailSidebar } from "./EmailSidebar";
import { SalaryBenchmark } from "./SalaryBenchmark";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";

interface JobOpportunityDetailModalProps {
  opportunity: JobOpportunityData;
  onClose: () => void;
  onSave: (data: JobOpportunityInput) => Promise<void>;
  onDelete: () => void;
  onArchive?: (archiveReason?: string) => void;
  onUnarchive?: () => void;
  readOnly?: boolean; // If true, hides edit/delete/archive buttons
}

export function JobOpportunityDetailModal({
  opportunity,
  onClose,
  onSave,
  onDelete,
  onArchive,
  onUnarchive,
  readOnly = false,
}: JobOpportunityDetailModalProps) {
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedTeams, setSharedTeams] = useState<string[]>([]);
  const [responsePrediction, setResponsePrediction] = useState<any | null>(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [quality, setQuality] = useState<any | null>(null);
  const [qualityStats, setQualityStats] = useState<any | null>(null);
  const [qualityHistory, setQualityHistory] = useState<any[]>([]);
  const [isLoadingQuality, setIsLoadingQuality] = useState(false);
  const [isScoringQuality, setIsScoringQuality] = useState(false);
  const [qualityError, setQualityError] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState<string>("");
  const [showQualityDetails, setShowQualityDetails] = useState(false);
  const QUALITY_THRESHOLD = 70; // Minimum score to allow "Applied" status
  const [competitiveAnalysis, setCompetitiveAnalysis] = useState<any | null>(null);
  const [isLoadingCompetitive, setIsLoadingCompetitive] = useState(false);
  const [competitiveError, setCompetitiveError] = useState<string | null>(null);
  const [showCompetitiveDetails, setShowCompetitiveDetails] = useState(false);

  const handleScheduleInterview = () => {
    navigate(`${ROUTES.INTERVIEW_SCHEDULING}?jobOpportunityId=${opportunity.id}`);
    onClose(); // Close the modal when navigating
  };
  const [formData, setFormData] = useState<JobOpportunityInput>({
    title: opportunity.title,
    company: opportunity.company,
    location: opportunity.location,
    salaryMin: opportunity.salaryMin,
    salaryMax: opportunity.salaryMax,
    jobPostingUrl: opportunity.jobPostingUrl || "",
    applicationDeadline: opportunity.applicationDeadline
      ? opportunity.applicationDeadline.split("T")[0]
      : "",
    description: opportunity.description || "",
    industry: opportunity.industry || "",
    jobType: opportunity.jobType || "",
    status: opportunity.status,
    notes: opportunity.notes || "",
    recruiterName: opportunity.recruiterName || "",
    recruiterEmail: opportunity.recruiterEmail || "",
    recruiterPhone: opportunity.recruiterPhone || "",
    hiringManagerName: opportunity.hiringManagerName || "",
    hiringManagerEmail: opportunity.hiringManagerEmail || "",
    hiringManagerPhone: opportunity.hiringManagerPhone || "",
    salaryNegotiationNotes: opportunity.salaryNegotiationNotes || "",
    interviewNotes: opportunity.interviewNotes || "",
    applicationHistory: opportunity.applicationHistory || [],
  });

  const [newHistoryEntry, setNewHistoryEntry] = useState<{
    status: JobStatus;
    notes: string;
  }>({
    status: opportunity.status,
    notes: "",
  });

  useEffect(() => {
    // Reset form data when opportunity changes
    setFormData({
      title: opportunity.title,
      company: opportunity.company,
      location: opportunity.location,
      salaryMin: opportunity.salaryMin,
      salaryMax: opportunity.salaryMax,
      jobPostingUrl: opportunity.jobPostingUrl || "",
      applicationDeadline: opportunity.applicationDeadline
        ? opportunity.applicationDeadline.split("T")[0]
        : "",
      description: opportunity.description || "",
      industry: opportunity.industry || "",
      jobType: opportunity.jobType || "",
      status: opportunity.status,
      notes: opportunity.notes || "",
      recruiterName: opportunity.recruiterName || "",
      recruiterEmail: opportunity.recruiterEmail || "",
      recruiterPhone: opportunity.recruiterPhone || "",
      hiringManagerName: opportunity.hiringManagerName || "",
      hiringManagerEmail: opportunity.hiringManagerEmail || "",
      hiringManagerPhone: opportunity.hiringManagerPhone || "",
      salaryNegotiationNotes: opportunity.salaryNegotiationNotes || "",
      interviewNotes: opportunity.interviewNotes || "",
      applicationHistory: opportunity.applicationHistory || [],
    });
    setIsEditMode(false);
    fetchTeams();
    checkSharedTeams();
  }, [opportunity]);

  // Load response time prediction
  useEffect(() => {
    const loadPrediction = async () => {
      if (!opportunity.id) return;
      try {
        setIsLoadingPrediction(true);
        setPredictionError(null);
        const res = await api.getResponseTimePrediction(opportunity.id);
        if (res.ok && res.data && res.data.prediction) {
          setResponsePrediction(res.data.prediction);
        } else {
          setResponsePrediction(null);
        }
      } catch (err: any) {
        console.error("Error loading response time prediction:", err);
        setPredictionError("Response time prediction not available yet.");
        setResponsePrediction(null);
      } finally {
        setIsLoadingPrediction(false);
      }
    };

    loadPrediction();
  }, [opportunity.id]);

  // Load application quality (latest + stats + history)
  useEffect(() => {
    const loadQuality = async () => {
      if (!opportunity.id) return;
      try {
        setIsLoadingQuality(true);
        setQualityError(null);
        const [qRes, statsRes, historyRes] = await Promise.all([
          api.getApplicationQuality(opportunity.id),
          api.getApplicationQualityStats(),
          api.getApplicationQualityHistory(opportunity.id),
        ]);
        if (qRes.ok && qRes.data) {
          const q = qRes.data.quality || null;
          setQuality(q);
          if (q?.linkedin_url) setLinkedinUrl(q.linkedin_url);
        } else {
          setQuality(null);
        }
        if (statsRes.ok && statsRes.data) {
          setQualityStats(statsRes.data.stats || null);
        } else {
          setQualityStats(null);
        }
        if (historyRes.ok && historyRes.data) {
          setQualityHistory(historyRes.data.history || []);
        } else {
          setQualityHistory([]);
        }
      } catch (err: any) {
        console.error("Error loading application quality:", err);
        setQualityError("Quality score not available yet.");
        setQuality(null);
      } finally {
        setIsLoadingQuality(false);
      }
    };

    loadQuality();
  }, [opportunity.id]);

  // Load competitive analysis
  useEffect(() => {
    const loadCompetitive = async () => {
      if (!opportunity.id) return;
      try {
        setIsLoadingCompetitive(true);
        setCompetitiveError(null);
        const res = await api.analyzeCompetitiveness(opportunity.id);
        if (res.ok && res.data && res.data.analysis) {
          setCompetitiveAnalysis(res.data.analysis);
        } else if (res.ok && res.data) {
          // handle fallback payload shape
          setCompetitiveAnalysis(res.data);
        } else {
          setCompetitiveAnalysis(null);
          setCompetitiveError(res.error || "Competitive analysis not available yet.");
        }
      } catch (err: any) {
        console.error("Error loading competitive analysis:", err);
        setCompetitiveError("Competitive analysis not available yet.");
        setCompetitiveAnalysis(null);
      } finally {
        setIsLoadingCompetitive(false);
      }
    };

    loadCompetitive();
  }, [opportunity.id]);

  const fetchTeams = async () => {
    try {
      const response = await api.getUserTeams();
      if (response.ok && response.data) {
        setTeams(response.data.teams || []);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    }
  };

  const checkSharedTeams = async () => {
    try {
      const response = await api.getUserTeams();
      if (response.ok && response.data) {
        const userTeams = response.data.teams || [];
        const shared: string[] = [];
        for (const team of userTeams) {
          const sharedJobsResponse = await api.getSharedJobs(team.id);
          if (sharedJobsResponse.ok && sharedJobsResponse.data) {
            const isShared = sharedJobsResponse.data.jobs?.some(
              (job: any) => job.id === opportunity.id
            );
            if (isShared) {
              shared.push(team.id);
            }
          }
        }
        setSharedTeams(shared);
      }
    } catch (error) {
      console.error("Failed to check shared teams:", error);
    }
  };

  const handleShareJob = async () => {
    if (!selectedTeamId || isSharing) return;

    try {
      setIsSharing(true);
      const response = await api.shareJobWithTeam(opportunity.id, selectedTeamId);
      if (response.ok) {
        setSharedTeams([...sharedTeams, selectedTeamId]);
        setShowShareModal(false);
        setSelectedTeamId(null);
      } else {
        alert(response.error || "Failed to share job");
      }
    } catch (error) {
      console.error("Failed to share job:", error);
      alert("Failed to share job. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const extendDeadline = (days: number) => {
    if (!opportunity.applicationDeadline) return;
    
    const currentDate = new Date(opportunity.applicationDeadline);
    currentDate.setDate(currentDate.getDate() + days);
    const newDeadline = currentDate.toISOString().split("T")[0];
    
    setFormData({
      ...formData,
      applicationDeadline: newDeadline,
    });
    setIsEditMode(true);
  };

  const handleSendReminder = async () => {
    if (!opportunity.applicationDeadline) return;

    setIsSendingReminder(true);
    setReminderMessage(null);

    try {
      const response = await api.sendDeadlineReminder(opportunity.id);
      if (response.ok) {
        setReminderMessage({
          text: "Reminder email sent successfully!",
          type: "success",
        });
        // Clear message after 5 seconds
        setTimeout(() => setReminderMessage(null), 5000);
      } else {
        setReminderMessage({
          text: response.error?.message || "Failed to send reminder email",
          type: "error",
        });
      }
    } catch (error: any) {
      setReminderMessage({
        text: error.message || "Failed to send reminder email",
        type: "error",
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Quality threshold check: if changing to "Applied" and score is below threshold
    if (formData.status === "Applied" && quality && quality.overall_score < QUALITY_THRESHOLD) {
      const proceed = confirm(
        `Your application quality score is ${Math.round(quality.overall_score)}/100, which is below the recommended threshold of ${QUALITY_THRESHOLD}.\n\n` +
        `We recommend improving your application before submitting. Would you like to proceed anyway?`
      );
      if (!proceed) {
        return;
      }
    }
    
    setIsSaving(true);
    try {
      // Ensure recruiter fields are included even if empty (backend will convert empty strings to null)
      const submitData = {
        ...formData,
        recruiterName: formData.recruiterName || "",
        recruiterEmail: formData.recruiterEmail || "",
        recruiterPhone: formData.recruiterPhone || "",
      };
      await onSave(submitData);
      setIsEditMode(false);
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHistoryEntry = () => {
    if (!newHistoryEntry.status) return;

    const entry: StatusHistoryEntry = {
      type: "status_change",
      timestamp: new Date().toISOString(),
      status: newHistoryEntry.status,
      notes: newHistoryEntry.notes.trim() || undefined,
    };

    setFormData((prev) => ({
      ...prev,
      applicationHistory: [...(prev.applicationHistory || []), entry],
    }));

    setNewHistoryEntry({
      status: opportunity.status,
      notes: "",
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const PROGRESS_STATUS_LABELS: Record<SkillGapProgressEntry["status"], string> = {
    planned: "Planned",
    "in-progress": "In Progress",
    completed: "Completed",
  };

  const handleHistorySync = (entries: ApplicationHistoryEntry[]) => {
    setFormData((prev) => ({
      ...prev,
      applicationHistory: entries,
    }));
  };

  const isStatusHistory = (
    entry: ApplicationHistoryEntry
  ): entry is StatusHistoryEntry => {
    return (
      typeof entry === "object" &&
      entry !== null &&
      "status" in entry &&
      "timestamp" in entry &&
      typeof (entry as StatusHistoryEntry).status === "string"
    );
  };

  const isSkillGapSnapshotHistory = (
    entry: ApplicationHistoryEntry
  ): entry is SkillGapSnapshot => {
    return typeof entry === "object" && entry !== null && (entry as any).type === "skill_gap_snapshot";
  };

  const isSkillGapProgressHistory = (
    entry: ApplicationHistoryEntry
  ): entry is SkillGapProgressEntry => {
    return typeof entry === "object" && entry !== null && (entry as any).type === "skill_gap_progress";
  };

  const getHistoryTimestamp = (entry: ApplicationHistoryEntry) => {
    if (isStatusHistory(entry)) {
      return entry.timestamp;
    }
    if (isSkillGapSnapshotHistory(entry)) {
      return entry.generatedAt;
    }
    if (isSkillGapProgressHistory(entry)) {
      return entry.updatedAt;
    }
    if (typeof entry === "object" && entry !== null) {
      if ("timestamp" in entry && typeof (entry as any).timestamp === "string") {
        return (entry as any).timestamp;
      }
      if ("generatedAt" in entry && typeof (entry as any).generatedAt === "string") {
        return (entry as any).generatedAt;
      }
      if ("updatedAt" in entry && typeof (entry as any).updatedAt === "string") {
        return (entry as any).updatedAt;
      }
    }
    return new Date().toISOString();
  };

  const renderHistoryEntry = (entry: ApplicationHistoryEntry, index: number) => {
    const timestamp = getHistoryTimestamp(entry);
    const formattedTimestamp =
      formatDate(timestamp) || new Date(timestamp).toLocaleString();

    if (isStatusHistory(entry)) {
      return (
        <div
          key={`history-status-${index}`}
          className="p-4 bg-slate-50 rounded-lg border border-slate-200"
        >
          <div className="flex justify-between items-start mb-2">
            <span
              className="px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: STATUS_BG_COLORS[entry.status],
                color: STATUS_COLORS[entry.status],
              }}
            >
              {entry.status}
            </span>
            <span className="text-xs text-slate-500">{formattedTimestamp}</span>
          </div>
          {entry.notes && (
            <p className="text-sm text-slate-600 mt-2">{entry.notes}</p>
          )}
        </div>
      );
    }

    if (isSkillGapSnapshotHistory(entry)) {
      return (
        <div
          key={`history-snapshot-${entry.snapshotId}-${index}`}
          className="p-4 bg-blue-50 rounded-lg border border-blue-200"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-blue-700 font-medium">
              <Icon icon="mingcute:radar-line" width={16} />
              <span>Skill Gap Analysis</span>
            </div>
            <span className="text-xs text-blue-600 font-medium">
              {formattedTimestamp}
            </span>
          </div>
          <p className="mt-2 text-sm text-blue-800">
            {entry.gaps.length} open gap{entry.gaps.length === 1 ? "" : "s"} detected.{" "}
            {entry.trend?.message}
          </p>
        </div>
      );
    }

    if (isSkillGapProgressHistory(entry)) {
      return (
        <div
          key={`history-progress-${entry.progressId}-${index}`}
          className="p-4 bg-white rounded-lg border border-slate-200"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Icon icon="mingcute:flag-line" width={16} className="text-slate-500" />
                {entry.skillName}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                {PROGRESS_STATUS_LABELS[entry.status]}
              </p>
            </div>
            <span className="text-xs text-slate-600">{formattedTimestamp}</span>
          </div>
          {entry.notes && (
            <p className="mt-2 text-sm text-slate-600">{entry.notes}</p>
          )}
          {entry.resource && (
            <p className="mt-2 text-xs text-slate-500">
              Resource:{" "}
              {entry.resource.url ? (
                <a
                  href={entry.resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {entry.resource.title}
                </a>
              ) : (
                entry.resource.title
              )}
              <span className="text-slate-600">
                {entry.resource.provider ? ` (${entry.resource.provider})` : ""}
              </span>
            </p>
          )}
          {entry.newProficiency && (
            <p className="mt-2 text-xs font-medium text-blue-600">
              Updated proficiency: {entry.newProficiency}
            </p>
          )}
        </div>
      );
    }

    return (
      <div
        key={`history-generic-${index}`}
        className="p-4 bg-slate-100 rounded-lg border border-slate-200"
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-sm font-medium text-slate-700">
            Activity Recorded
          </span>
          <span className="text-xs text-slate-500">{formattedTimestamp}</span>
        </div>
        <pre className="mt-2 max-h-32 overflow-y-auto rounded bg-white p-3 text-xs text-slate-500">
          {JSON.stringify(entry, null, 2)}
        </pre>
      </div>
    );
  };

  // Filter out skill gap snapshots and progress entries since they're shown in the Skill Gap Panel
  const filteredHistoryEntries = (formData.applicationHistory || []).filter(
    (entry) => !isSkillGapSnapshotHistory(entry) && !isSkillGapProgressHistory(entry)
  );

  const sortedHistoryEntries = [...filteredHistoryEntries].sort(
    (a, b) =>
      new Date(getHistoryTimestamp(b)).getTime() -
      new Date(getHistoryTimestamp(a)).getTime()
  );

  const formatSalary = () => {
    if (formData.salaryMin && formData.salaryMax) {
      return `$${formData.salaryMin.toLocaleString()} - $${formData.salaryMax.toLocaleString()}`;
    } else if (formData.salaryMin) {
      return `$${formData.salaryMin.toLocaleString()}+`;
    } else if (formData.salaryMax) {
      return `Up to $${formData.salaryMax.toLocaleString()}`;
    }
    return null;
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the backdrop, not on the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Linked Emails Section Component
  const LinkedEmailsSection = ({ jobOpportunityId }: { jobOpportunityId: string }) => {
    const [linkedEmails, setLinkedEmails] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

    const loadLinkedEmails = async () => {
      try {
        setIsLoading(true);
        const response = await api.getLinkedEmails(jobOpportunityId);
        setLinkedEmails(response.data?.emails || []);
      } catch (err: any) {
        console.error("Failed to load linked emails:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleUnlinkEmail = async (emailLinkId: string) => {
      try {
        setUnlinkingId(emailLinkId);
        await api.unlinkEmailFromJob(emailLinkId, jobOpportunityId);
        // Refresh the list after unlinking
        await loadLinkedEmails();
        // Trigger event to refresh EmailSidebar if needed
        window.dispatchEvent(new CustomEvent('linkedEmailUpdated'));
      } catch (err: any) {
        console.error("Failed to unlink email:", err);
        alert(err.response?.data?.error?.message || err.message || "Failed to unlink email");
      } finally {
        setUnlinkingId(null);
      }
    };

    const handleOpenInGmail = (gmailMessageId: string) => {
      // Gmail URL format: https://mail.google.com/mail/u/0/#inbox/{messageId}
      const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${gmailMessageId}`;
      window.open(gmailUrl, '_blank');
    };

    // Refresh linked emails when jobOpportunityId changes or when email is linked
    useEffect(() => {
      loadLinkedEmails();
      
      // Listen for email linked events
      const handleEmailLinked = () => {
        loadLinkedEmails();
      };
      
      window.addEventListener('linkedEmailUpdated', handleEmailLinked);
      
      return () => {
        window.removeEventListener('linkedEmailUpdated', handleEmailLinked);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobOpportunityId]);

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const getStatusColor = (status?: string) => {
      if (!status) return "bg-slate-100 text-slate-600";
      const lower = status.toLowerCase();
      if (lower.includes("interview")) return "bg-blue-100 text-blue-700";
      if (lower.includes("offer")) return "bg-green-100 text-green-700";
      if (lower.includes("rejection") || lower.includes("reject")) return "bg-red-100 text-red-700";
      return "bg-slate-100 text-slate-600";
    };

    if (isLoading) {
      return (
        <section className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Linked Emails</h3>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </section>
      );
    }

    return (
      <section className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Linked Emails</h3>
        {linkedEmails.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Icon icon="mingcute:mail-line" width={32} className="mx-auto mb-2 text-slate-400" aria-hidden="true" />
            <p className="text-sm">No emails linked to this job opportunity yet</p>
            <p className="text-xs text-slate-600 mt-1">
              Link emails using the email sidebar on the right
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {linkedEmails
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((email) => (
                <div
                  key={email.emailLinkId}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 mb-1">{email.subject}</p>
                      <p className="text-xs text-slate-600">{email.from}</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(email.date)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">{email.snippet}</p>
                  
                  <div className="flex items-center justify-between gap-2">
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
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {email.gmailMessageId && (
                        <button
                          onClick={() => handleOpenInGmail(email.gmailMessageId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                          title="Open in Gmail"
                        >
                          <Icon icon="mingcute:mail-open-line" width={14} />
                          Open in Gmail
                        </button>
                      )}
                      <button
                        onClick={() => handleUnlinkEmail(email.emailLinkId)}
                        disabled={unlinkingId === email.emailLinkId}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Unlink email"
                      >
                        {unlinkingId === email.emailLinkId ? (
                          <>
                            <Icon
                              icon="mingcute:loading-line"
                              className="animate-spin"
                              width={14}
                            />
                            Unlinking...
                          </>
                        ) : (
                          <>
                            <Icon icon="mingcute:link-unlink-line" width={14} />
                            Unlink
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
        </div>
        )}
      </section>
    );
  };

  return (
    <>
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4 font-poppins"
      onClick={handleBackdropClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl max-w-7xl w-full max-h-[90vh] flex overflow-hidden font-poppins"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        tabIndex={-1}
      >
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
              {isEditMode ? (
                <input
                  id="detail-title-input"
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="text-2xl font-bold text-slate-900 border-b-2 border-blue-500 focus:outline-none flex-1"
                  placeholder="Job Title"
                  aria-label="Job title"
                />
              ) : (
                <h2 id="detail-modal-title" className="text-2xl font-bold text-slate-900">
                  {opportunity.title}
                </h2>
              )}
              <span
                className="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap text-center"
                style={{
                  backgroundColor: STATUS_BG_COLORS[opportunity.status],
                  color: STATUS_COLORS[opportunity.status],
                }}
              >
                {opportunity.status}
              </span>
            </div>
            {isEditMode ? (
              <input
                type="text"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                className="text-lg text-slate-600 border-b-2 border-blue-500 focus:outline-none mt-1"
                placeholder="Company Name"
              />
            ) : (
              <p className="text-lg text-slate-600">{opportunity.company}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {!isEditMode && (
              <>
                {!opportunity.archived && (
                  <button
                    onClick={handleScheduleInterview}
                    className="px-2.5 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    <Icon icon="mingcute:calendar-line" width={14} />
                    Schedule Interview
                  </button>
                )}
                {opportunity.jobPostingUrl && (
                  <button
                    onClick={() => setShowCompanyInfo(true)}
                    className="px-2.5 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    <Icon icon="mingcute:building-line" width={14} />
                    Company Info
                  </button>
                )}
                {teams.length > 0 && (
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-2.5 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    <Icon icon="lucide:share-2" width={14} />
                    Share
                    {sharedTeams.length > 0 && (
                      <span className="ml-1 bg-white/20 rounded-full px-1.5 text-xs">
                        {sharedTeams.length}
                      </span>
                    )}
                  </button>
                )}
                {!opportunity.archived && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-2.5 py-1 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    <Icon icon="mingcute:edit-line" width={14} />
                    Edit
                  </button>
                )}
                {opportunity.archived && onUnarchive && (
                  <button
                    onClick={onUnarchive}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <Icon icon="mingcute:refresh-line" width={18} />
                    Restore
                  </button>
                )}
                {!opportunity.archived && onArchive && (
                  <button
                    onClick={() => onArchive()}
                    className="px-2.5 py-1 bg-[#EC85CA] text-white rounded-md hover:bg-[#D468B1] transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    <Icon icon="mingcute:archive-line" width={14} />
                    Archive
                  </button>
                )}
                <button
                  onClick={onDelete}
                  className="px-2.5 py-1 border border-red-500 text-red-500 rounded-md hover:bg-red-50 transition-colors flex items-center gap-1 text-xs font-medium"
                >
                  <Icon icon="mingcute:delete-line" width={14} />
                  Delete
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700"
              aria-label="Close modal"
            >
              <Icon icon="mingcute:close-line" width={24} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-8 py-6">
          <div className="space-y-6">
            {/* Archive Information (if archived) */}
            {opportunity.archived && (
              <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icon icon="mingcute:archive-line" className="text-amber-600 mt-0.5" width={20} />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900 mb-2">
                      Archived Job Opportunity
                    </h4>
                    {opportunity.archivedAt && (
                      <p className="text-sm text-amber-800 mb-1">
                        Archived on: {new Date(opportunity.archivedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    {opportunity.archiveReason && (
                      <p className="text-sm text-amber-800">
                        Reason: {opportunity.archiveReason}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Basic Information */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Location
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-slate-600">{opportunity.location}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Job Type
                  </label>
                  {isEditMode ? (
                    <select
                      value={formData.jobType || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, jobType: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Job Type</option>
                      {JOB_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-slate-600">
                      {opportunity.jobType || "Not specified"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Industry
                  </label>
                  {isEditMode ? (
                    <select
                      value={formData.industry || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, industry: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Industry</option>
                      {INDUSTRIES.map((industry) => (
                        <option key={industry} value={industry}>
                          {industry}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-slate-600">
                      {opportunity.industry || "Not specified"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status
                  </label>
                  {isEditMode ? (
                    <select
                      value={formData.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as JobStatus;
                        // Warn if changing to "Applied" with low quality score
                        if (newStatus === "Applied" && quality && quality.overall_score < QUALITY_THRESHOLD) {
                          const proceed = confirm(
                            `Your application quality score is ${Math.round(quality.overall_score)}/100, which is below the recommended threshold of ${QUALITY_THRESHOLD}.\n\n` +
                            `We recommend improving your application before submitting. Would you like to proceed anyway?`
                          );
                          if (!proceed) {
                            return; // Don't change status
                          }
                        }
                        setFormData({
                          ...formData,
                          status: newStatus,
                        });
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {JOB_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-slate-600">{opportunity.status}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Salary Range
                  </label>
                  {isEditMode ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.salaryMin || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            salaryMin: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Min"
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        value={formData.salaryMax || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            salaryMax: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Max"
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <p className="text-slate-600">
                      {formatSalary() || "Not specified"}
                    </p>
                  )}
                </div>


                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Application Deadline
                  </label>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={formData.applicationDeadline || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          applicationDeadline: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <p className="text-slate-600">
                          {opportunity.applicationDeadline
                            ? formatDate(opportunity.applicationDeadline)
                            : "Not specified"}
                        </p>
                        {opportunity.applicationDeadline && (
                          <div
                            className="px-3 py-1 rounded-lg text-sm font-medium"
                            style={{
                              backgroundColor: getDeadlineBgColor(
                                getDeadlineUrgency(
                                  getDaysRemaining(opportunity.applicationDeadline)
                                )
                              ),
                              color: getDeadlineColor(
                                getDeadlineUrgency(
                                  getDaysRemaining(opportunity.applicationDeadline)
                                )
                              ),
                            }}
                          >
                            {formatDeadlineText(
                              getDaysRemaining(opportunity.applicationDeadline)
                            )}
                          </div>
                        )}
                      </div>
                      {opportunity.applicationDeadline && !isEditMode && (
                        <div className="space-y-3">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => extendDeadline(7)}
                              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              Extend by 7 days
                            </button>
                            <button
                              type="button"
                              onClick={() => extendDeadline(14)}
                              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              Extend by 14 days
                            </button>
                            <button
                              type="button"
                              onClick={() => extendDeadline(30)}
                              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              Extend by 30 days
                            </button>
                          </div>
                          <div className="border-t border-slate-200 pt-3">
                            <button
                              type="button"
                              onClick={handleSendReminder}
                              disabled={isSendingReminder}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSendingReminder ? (
                                <>
                                  <Icon
                                    icon="mingcute:loading-line"
                                    className="animate-spin"
                                    width={16}
                                  />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Icon icon="mingcute:mail-line" width={16} />
                                  Send Email Reminder
                                </>
                              )}
                            </button>
                            {reminderMessage && (
                              <div
                                className={`mt-2 text-sm ${
                                  reminderMessage.type === "success"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {reminderMessage.text}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Job Posting URL
                </label>
                {isEditMode ? (
                  <input
                    type="url"
                    value={formData.jobPostingUrl || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jobPostingUrl: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-slate-600">
                    {opportunity.jobPostingUrl ? (
                      <a
                        href={opportunity.jobPostingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {opportunity.jobPostingUrl}
                      </a>
                    ) : (
                      "Not specified"
                    )}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Job Description
                </label>
                {isEditMode ? (
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Job description..."
                  />
                ) : (
                  <p className="text-slate-600 whitespace-pre-wrap">
                    {opportunity.description || "No description provided"}
                  </p>
                )}
              </div>
            </section>

            {/* Contact Information */}
            <section className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">
                    Recruiter
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Name
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={formData.recruiterName || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              recruiterName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {opportunity.recruiterName || "Not specified"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Email
                      </label>
                      {isEditMode ? (
                        <input
                          type="email"
                          value={formData.recruiterEmail || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              recruiterEmail: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {opportunity.recruiterEmail ? (
                            <a
                              href={`mailto:${opportunity.recruiterEmail}`}
                              className="text-blue-600 hover:underline"
                            >
                              {opportunity.recruiterEmail}
                            </a>
                          ) : (
                            "Not specified"
                          )}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Phone
                      </label>
                      {isEditMode ? (
                        <input
                          type="tel"
                          value={formData.recruiterPhone || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              recruiterPhone: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {opportunity.recruiterPhone ? (
                            <a
                              href={`tel:${opportunity.recruiterPhone}`}
                              className="text-blue-600 hover:underline"
                            >
                              {opportunity.recruiterPhone}
                            </a>
                          ) : (
                            "Not specified"
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">
                    Hiring Manager
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Name
                      </label>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={formData.hiringManagerName || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hiringManagerName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {opportunity.hiringManagerName || "Not specified"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Email
                      </label>
                      {isEditMode ? (
                        <input
                          type="email"
                          value={formData.hiringManagerEmail || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hiringManagerEmail: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {opportunity.hiringManagerEmail ? (
                            <a
                              href={`mailto:${opportunity.hiringManagerEmail}`}
                              className="text-blue-600 hover:underline"
                            >
                              {opportunity.hiringManagerEmail}
                            </a>
                          ) : (
                            "Not specified"
                          )}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Phone
                      </label>
                      {isEditMode ? (
                        <input
                          type="tel"
                          value={formData.hiringManagerPhone || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hiringManagerPhone: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {opportunity.hiringManagerPhone ? (
                            <a
                              href={`tel:${opportunity.hiringManagerPhone}`}
                              className="text-blue-600 hover:underline"
                            >
                              {opportunity.hiringManagerPhone}
                            </a>
                          ) : (
                            "Not specified"
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Notes */}
            <section className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Notes
              </h3>
              {isEditMode ? (
                <textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add your personal notes and observations..."
                />
              ) : (
                <p className="text-slate-600 whitespace-pre-wrap">
                  {opportunity.notes || "No notes added"}
                </p>
              )}
            </section>

            {/* Salary Negotiation Notes */}
            <section className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Salary Negotiation Notes
              </h3>
              {isEditMode ? (
                <textarea
                  value={formData.salaryNegotiationNotes || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryNegotiationNotes: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add notes about salary negotiations..."
                />
              ) : (
                <p className="text-slate-600 whitespace-pre-wrap">
                  {opportunity.salaryNegotiationNotes || "No notes added"}
                </p>
              )}
            </section>

            {/* Interview Notes */}
            <section className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Interview Notes & Feedback
              </h3>
              {isEditMode ? (
                <textarea
                  value={formData.interviewNotes || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interviewNotes: e.target.value,
                    })
                  }
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add interview notes and feedback..."
                />
              ) : (
                <p className="text-slate-600 whitespace-pre-wrap">
                  {opportunity.interviewNotes || "No notes added"}
                </p>
              )}
            </section>

            {/* Job Match Score */}
            <JobMatchScore
              opportunity={opportunity}
              onScoreUpdate={(score) => {
                // Match score updated
                console.log("Match score updated:", score);
              }}
            />

            {/* Application Materials */}
            <JobMaterialsSection
              opportunity={opportunity}
              isEditMode={isEditMode}
              onMaterialsChange={() => {
                // Materials are handled separately via API
              }}
            />

            <JobSkillGapPanel
              opportunity={{
                ...opportunity,
                applicationHistory: formData.applicationHistory,
              }}
              onHistorySync={handleHistorySync}
            />

            {/* Linked Emails */}
            <LinkedEmailsSection jobOpportunityId={opportunity.id} />

            {/* Application History */}
            <section className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Application History
              </h3>
              {isEditMode && (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Status
                      </label>
                      <select
                        value={newHistoryEntry.status}
                        onChange={(e) =>
                          setNewHistoryEntry({
                            ...newHistoryEntry,
                            status: e.target.value as JobStatus,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {JOB_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={newHistoryEntry.notes}
                        onChange={(e) =>
                          setNewHistoryEntry({
                            ...newHistoryEntry,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Optional notes..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddHistoryEntry}
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm"
                  >
                    Add History Entry
                  </button>
                </div>
              )}
              <div className="space-y-3">
              {sortedHistoryEntries.length > 0 ? (
                sortedHistoryEntries.map((entry, index) =>
                  renderHistoryEntry(entry, index)
                )
              ) : (
                <p className="text-slate-500 text-sm">No history entries</p>
              )}
              </div>
            </section>
          </div>

          {/* Application Quality Score */}
          {!isEditMode && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Icon icon="mingcute:magic-line" width={18} className="text-purple-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Application Quality
                  </h3>
                  {quality && quality.overall_score < QUALITY_THRESHOLD && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-medium">
                      <Icon icon="mingcute:alert-line" width={12} />
                      Below Threshold ({QUALITY_THRESHOLD})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQualityDetails(!showQualityDetails)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Icon icon={showQualityDetails ? "mingcute:up-line" : "mingcute:down-line"} width={14} />
                    {showQualityDetails ? "Less" : "Details"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!opportunity.id) return;
                      try {
                        setIsScoringQuality(true);
                        setQualityError(null);
                        const payload: any = {};
                        if (linkedinUrl) payload.linkedinUrl = linkedinUrl;
                        const res = await api.scoreApplicationQuality(opportunity.id, payload);
                        if (res.ok && res.data) {
                          setQuality(res.data.quality || null);
                        }
                        // Refresh stats and history
                        const [statsRes, historyRes] = await Promise.all([
                          api.getApplicationQualityStats(),
                          api.getApplicationQualityHistory(opportunity.id),
                        ]);
                        if (statsRes.ok && statsRes.data) {
                          setQualityStats(statsRes.data.stats || null);
                        }
                        if (historyRes.ok && historyRes.data) {
                          setQualityHistory(historyRes.data.history || []);
                        }
                      } catch (err: any) {
                        console.error("Error scoring application quality:", err);
                        setQualityError("Failed to score application. Try again.");
                      } finally {
                        setIsScoringQuality(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50"
                    disabled={isScoringQuality}
                  >
                    {isScoringQuality ? (
                      <>
                        <Icon icon="mingcute:loading-line" className="animate-spin" width={14} />
                        Scoring...
                      </>
                    ) : (
                      <>
                        <Icon icon="mingcute:sparkles-line" width={14} />
                        Re-score
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* LinkedIn URL Input */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  LinkedIn Profile URL (optional, for better analysis)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {isLoadingQuality ? (
                <p className="text-xs text-slate-500">Loading quality score...</p>
              ) : quality ? (
                <div className="space-y-4">
                  {/* Overall Score & Sub-scores */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-start">
                        <span className="text-[11px] uppercase tracking-wide text-slate-500">
                          Overall Score
                        </span>
                        <span
                          className={`text-2xl font-bold ${
                            quality.overall_score >= 80
                              ? "text-emerald-600"
                              : quality.overall_score >= 70
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {Math.round(quality.overall_score)} / 100
                        </span>
                        {qualityStats && typeof qualityStats.avg_score === "number" && (
                          <span className="mt-1 text-[11px] text-slate-500">
                            Your avg: {Math.round(qualityStats.avg_score)} · Top:{" "}
                            {typeof qualityStats.p90_score === "number"
                              ? Math.round(qualityStats.p90_score)
                              : "—"}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600">
                        <span>
                          Alignment:{" "}
                          <strong>
                            {quality.alignment_score != null
                              ? Math.round(quality.alignment_score)
                              : "—"}
                          </strong>
                        </span>
                        <span>
                          Formatting:{" "}
                          <strong>
                            {quality.format_score != null
                              ? Math.round(quality.format_score)
                              : "—"}
                          </strong>
                        </span>
                        <span>
                          Consistency:{" "}
                          <strong>
                            {quality.consistency_score != null
                              ? Math.round(quality.consistency_score)
                              : "—"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {showQualityDetails && (
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      {/* Missing Keywords */}
                      {Array.isArray(quality.missing_keywords) && quality.missing_keywords.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon icon="mingcute:search-line" width={14} className="text-amber-700" />
                            <p className="text-xs font-semibold text-amber-900">Missing Keywords</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {quality.missing_keywords.map((kw: any, idx: number) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                                  kw.importance === "high"
                                    ? "bg-red-100 text-red-800"
                                    : kw.importance === "medium"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {kw.keyword}
                                {kw.importance === "high" && (
                                  <Icon icon="mingcute:alert-fill" width={10} />
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Skills */}
                      {Array.isArray(quality.missing_skills) && quality.missing_skills.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon icon="mingcute:code-line" width={14} className="text-blue-700" />
                            <p className="text-xs font-semibold text-blue-900">Missing Skills</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {quality.missing_skills.map((skill: any, idx: number) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                                  skill.importance === "high"
                                    ? "bg-red-100 text-red-800"
                                    : skill.importance === "medium"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {skill.skill}
                                {skill.importance === "high" && (
                                  <Icon icon="mingcute:alert-fill" width={10} />
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Formatting Issues */}
                      {Array.isArray(quality.issues) && quality.issues.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon icon="mingcute:file-warning-line" width={14} className="text-red-700" />
                            <p className="text-xs font-semibold text-red-900">Formatting Issues & Typos</p>
                          </div>
                          <ul className="space-y-1.5">
                            {quality.issues.map((issue: any, idx: number) => (
                              <li key={idx} className="text-[11px] text-red-800">
                                <div className="flex items-start gap-2">
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      issue.severity === "high"
                                        ? "bg-red-200 text-red-900"
                                        : issue.severity === "medium"
                                        ? "bg-amber-200 text-amber-900"
                                        : "bg-slate-200 text-slate-700"
                                    }`}
                                  >
                                    {issue.severity || "low"}
                                  </span>
                                  <div className="flex-1">
                                    <span className="font-medium">{issue.type}:</span> {issue.description}
                                    {issue.location && (
                                      <span className="text-red-600 ml-1">({issue.location})</span>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Prioritized Suggestions */}
                      {Array.isArray(quality.suggestions) && quality.suggestions.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-slate-700 mb-2">
                            Improvement Suggestions (Prioritized)
                          </p>
                          <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {quality.suggestions
                              .sort((a: any, b: any) => {
                                const priorityOrder = { high: 3, medium: 2, low: 1 };
                                return (
                                  (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
                                  (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
                                );
                              })
                              .map((s: any, idx: number) => (
                                <li key={s.id || idx} className="text-[11px] text-slate-700">
                                  <div className="flex items-start gap-2">
                                    <span
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                        s.priority === "high"
                                          ? "bg-red-100 text-red-800"
                                          : s.priority === "medium"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-slate-200 text-slate-700"
                                      }`}
                                    >
                                      {s.priority || "low"}
                                    </span>
                                    <div className="flex-1">
                                      <span className="font-semibold">
                                        {s.title || `Suggestion ${idx + 1}`}:
                                      </span>{" "}
                                      {s.description}
                                      {s.estimatedImpact && (
                                        <span className="text-slate-500 ml-1">
                                          (+{s.estimatedImpact} pts)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      {/* Score History */}
                      {qualityHistory.length > 0 && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon icon="mingcute:chart-line" width={14} className="text-purple-700" />
                            <p className="text-xs font-semibold text-purple-900">Score History</p>
                          </div>
                          <div className="space-y-1.5">
                            {qualityHistory.slice(-5).reverse().map((h: any, idx: number) => {
                              const prevScore = idx < qualityHistory.length - 1 
                                ? qualityHistory[qualityHistory.length - 2 - idx]?.overall_score 
                                : null;
                              const improvement = prevScore ? h.overall_score - prevScore : 0;
                              return (
                                <div
                                  key={h.id || idx}
                                  className="flex items-center justify-between text-[11px]"
                                >
                                  <span className="text-slate-600">
                                    {new Date(h.created_at).toLocaleDateString()}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">
                                      {Math.round(h.overall_score)}/100
                                    </span>
                                    {improvement !== 0 && (
                                      <span
                                        className={`text-[10px] ${
                                          improvement > 0 ? "text-emerald-600" : "text-red-600"
                                        }`}
                                      >
                                        {improvement > 0 ? "↑" : "↓"} {Math.abs(Math.round(improvement))}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Collapsed View - Top Suggestions */}
                  {!showQualityDetails && (
                    <div className="flex-1">
                      {Array.isArray(quality.suggestions) && quality.suggestions.length > 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <p className="text-[11px] font-semibold text-slate-700 mb-1">
                            Top Suggestions
                          </p>
                          <ul className="space-y-1 max-h-28 overflow-y-auto pr-1">
                            {quality.suggestions
                              .sort((a: any, b: any) => {
                                const priorityOrder = { high: 3, medium: 2, low: 1 };
                                return (
                                  (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
                                  (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
                                );
                              })
                              .slice(0, 3)
                              .map((s: any, idx: number) => (
                                <li key={s.id || idx} className="text-[11px] text-slate-600">
                                  <span className="font-medium">
                                    {s.title || `Suggestion ${idx + 1}`}:
                                  </span>{" "}
                                  {s.description}
                                </li>
                              ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          No specific suggestions yet. Re-score after updating your resume or cover
                          letter.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {qualityError ||
                    "No quality score yet. Click Re-score to analyze this application before submitting."}
                </p>
              )}
            </div>
          )}

          {/* Competitive Analysis */}
          {!isEditMode && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Icon icon="mingcute:target-line" width={18} className="text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Competitive Analysis
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompetitiveDetails(!showCompetitiveDetails)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Icon icon={showCompetitiveDetails ? "mingcute:up-line" : "mingcute:down-line"} width={14} />
                  {showCompetitiveDetails ? "Less" : "Details"}
                </button>
              </div>
              {isLoadingCompetitive ? (
                <p className="text-xs text-slate-500">Analyzing competitiveness...</p>
              ) : competitiveAnalysis ? (
                <div className="space-y-4">
                  {/* Competitive Score & Interview Likelihood */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-start">
                        <span className="text-[11px] uppercase tracking-wide text-slate-500">
                          Competitive Score
                        </span>
                        <span
                          className={`text-2xl font-bold ${
                            competitiveAnalysis.competitiveScore >= 80
                              ? "text-emerald-600"
                              : competitiveAnalysis.competitiveScore >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {competitiveAnalysis.competitiveScore} / 100
                        </span>
                        <span className="mt-1 text-[11px] text-slate-500">
                          ~{competitiveAnalysis.applicantCount?.total || 0} estimated applicants
                        </span>
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-[11px] uppercase tracking-wide text-slate-500">
                          Interview Likelihood
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xl font-bold ${
                              competitiveAnalysis.interviewLikelihood?.level === "high"
                                ? "text-emerald-600"
                                : competitiveAnalysis.interviewLikelihood?.level === "medium"
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {competitiveAnalysis.interviewLikelihood?.percentage?.toFixed(1) || 0}%
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              competitiveAnalysis.interviewLikelihood?.level === "high"
                                ? "bg-emerald-100 text-emerald-800"
                                : competitiveAnalysis.interviewLikelihood?.level === "medium"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {competitiveAnalysis.interviewLikelihood?.level?.toUpperCase() || "LOW"}
                          </span>
                        </div>
                        <span className="mt-1 text-[11px] text-slate-500">
                          Confidence: {competitiveAnalysis.confidence || 50}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {showCompetitiveDetails && (
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      {/* Competitive Advantages */}
                      {Array.isArray(competitiveAnalysis.advantages) &&
                        competitiveAnalysis.advantages.length > 0 && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon icon="mingcute:check-circle-line" width={14} className="text-emerald-700" />
                              <p className="text-xs font-semibold text-emerald-900">
                                Competitive Advantages ({competitiveAnalysis.advantages.length})
                              </p>
                            </div>
                            <ul className="space-y-2">
                              {competitiveAnalysis.advantages.map((adv: any, idx: number) => (
                                <li key={idx} className="text-[11px] text-emerald-800">
                                  <div className="flex items-start gap-2">
                                    <span
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                        adv.impact === "high"
                                          ? "bg-emerald-200 text-emerald-900"
                                          : "bg-emerald-100 text-emerald-800"
                                      }`}
                                    >
                                      {adv.impact}
                                    </span>
                                    <div className="flex-1">
                                      <span className="font-semibold">{adv.title}:</span> {adv.description}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* Competitive Disadvantages */}
                      {Array.isArray(competitiveAnalysis.disadvantages) &&
                        competitiveAnalysis.disadvantages.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon icon="mingcute:alert-line" width={14} className="text-amber-700" />
                              <p className="text-xs font-semibold text-amber-900">
                                Areas to Improve ({competitiveAnalysis.disadvantages.length})
                              </p>
                            </div>
                            <ul className="space-y-2">
                              {competitiveAnalysis.disadvantages.map((dis: any, idx: number) => (
                                <li key={idx} className="text-[11px] text-amber-800">
                                  <div className="flex items-start gap-2">
                                    <span
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                        dis.severity === "high"
                                          ? "bg-red-200 text-red-900"
                                          : dis.severity === "medium"
                                          ? "bg-amber-200 text-amber-900"
                                          : "bg-amber-100 text-amber-800"
                                      }`}
                                    >
                                      {dis.severity}
                                    </span>
                                    <div className="flex-1">
                                      <span className="font-semibold">{dis.title}:</span> {dis.description}
                                      {dis.mitigation && (
                                        <div className="mt-1 text-[10px] text-amber-700 italic">
                                          💡 {dis.mitigation}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* Differentiating Strategies */}
                      {Array.isArray(competitiveAnalysis.strategies) &&
                        competitiveAnalysis.strategies.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon icon="mingcute:lightbulb-line" width={14} className="text-blue-700" />
                              <p className="text-xs font-semibold text-blue-900">
                                Strategies to Stand Out
                              </p>
                            </div>
                            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {competitiveAnalysis.strategies
                                .sort((a: any, b: any) => {
                                  const priorityOrder = { high: 3, medium: 2, low: 1 };
                                  return (
                                    (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
                                    (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
                                  );
                                })
                                .map((strategy: any, idx: number) => (
                                  <li key={idx} className="text-[11px] text-blue-800">
                                    <div className="flex items-start gap-2">
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                          strategy.priority === "high"
                                            ? "bg-blue-200 text-blue-900"
                                            : "bg-blue-100 text-blue-800"
                                        }`}
                                      >
                                        {strategy.priority}
                                      </span>
                                      <div className="flex-1">
                                        <span className="font-semibold">{strategy.title}:</span>{" "}
                                        {strategy.description}
                                        {strategy.estimatedImpact && (
                                          <span className="text-blue-600 ml-1">
                                            (+{strategy.estimatedImpact} pts)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}

                      {/* Profile Comparison */}
                      {competitiveAnalysis.profileComparison && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon icon="mingcute:user-compare-line" width={14} className="text-purple-700" />
                            <p className="text-xs font-semibold text-purple-900">
                              Profile Comparison
                            </p>
                          </div>
                          <div className="space-y-2 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-purple-700">Experience:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {competitiveAnalysis.profileComparison.experience?.user || 0} years
                                </span>
                                <span className="text-purple-500">vs</span>
                                <span>
                                  {competitiveAnalysis.profileComparison.experience?.typical || "N/A"}
                                </span>
                                {competitiveAnalysis.profileComparison.experience?.match ? (
                                  <Icon icon="mingcute:check-line" width={14} className="text-emerald-600" />
                                ) : (
                                  <Icon icon="mingcute:close-line" width={14} className="text-red-600" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-purple-700">Education:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {competitiveAnalysis.profileComparison.education?.user || "None"}
                                </span>
                                <span className="text-purple-500">vs</span>
                                <span>
                                  {competitiveAnalysis.profileComparison.education?.typical || "N/A"}
                                </span>
                                {competitiveAnalysis.profileComparison.education?.match ? (
                                  <Icon icon="mingcute:check-line" width={14} className="text-emerald-600" />
                                ) : (
                                  <Icon icon="mingcute:close-line" width={14} className="text-red-600" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-purple-700">Skills:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {competitiveAnalysis.profileComparison.skills?.user || 0} skills
                                </span>
                                <span className="text-purple-500">vs</span>
                                <span>
                                  {competitiveAnalysis.profileComparison.skills?.typical || "N/A"}
                                </span>
                                {competitiveAnalysis.profileComparison.skills?.match ? (
                                  <Icon icon="mingcute:check-line" width={14} className="text-emerald-600" />
                                ) : (
                                  <Icon icon="mingcute:close-line" width={14} className="text-red-600" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Collapsed View - Quick Stats */}
                  {!showCompetitiveDetails && (
                    <div className="flex items-center gap-4 text-[11px] text-slate-600">
                      <span>
                        Advantages: <strong>{competitiveAnalysis.advantages?.length || 0}</strong>
                      </span>
                      <span>
                        Areas to Improve: <strong>{competitiveAnalysis.disadvantages?.length || 0}</strong>
                      </span>
                      <span>
                        Strategies: <strong>{competitiveAnalysis.strategies?.length || 0}</strong>
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {competitiveError ||
                    "Competitive analysis not available. This feature analyzes your competitiveness for this role."}
                </p>
              )}
            </div>
          )}

          {/* Response Time Prediction */}
          {!isEditMode && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Icon icon="mingcute:time-line" width={18} className="text-slate-600" />
                  Expected Employer Response
                </h3>
                {responsePrediction?.isOverdue && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-medium">
                    <Icon icon="mingcute:alarm-line" width={14} />
                    Overdue by{" "}
                    {Math.round(responsePrediction.overdueDays || 0)}{" "}
                    {Math.round(responsePrediction.overdueDays || 0) === 1 ? "day" : "days"}
                  </span>
                )}
              </div>
              {isLoadingPrediction ? (
                <p className="text-xs text-slate-500">Loading response time prediction...</p>
              ) : responsePrediction ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-700">
                      Typically responds in{" "}
                      <span className="font-semibold">
                        {Math.round(responsePrediction.lowerDays)}–
                        {Math.round(responsePrediction.upperDays)} days
                      </span>{" "}
                      for similar {responsePrediction.cohort?.jobType || "roles"} in{" "}
                      {responsePrediction.cohort?.industry || "your history"}.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Based on {responsePrediction.sampleSize} past applications. ~
                      {Math.round((responsePrediction.confidence || 0.8) * 100)}% responded
                      within this window.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Suggested follow-up date:{" "}
                      <span className="font-semibold">
                        {new Date(
                          responsePrediction.recommendedFollowUpDate
                        ).toLocaleDateString()}
                      </span>
                      .
                    </p>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium inline-flex flex-col items-start">
                    <span className="uppercase tracking-wide text-[10px] text-blue-500 mb-1">
                      Follow-up Hint
                    </span>
                    <span>
                      If you haven&apos;t heard back by{" "}
                      {new Date(
                        responsePrediction.recommendedFollowUpDate
                      ).toLocaleDateString()}
                      , send a polite check-in.
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {predictionError ||
                    "Not enough past data yet to generate a response time prediction for this role."}
                </p>
              )}
            </div>
          )}

          {/* Salary Benchmark - At the bottom */}
          {!isEditMode && opportunity.title && opportunity.location && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <SalaryBenchmark
                jobTitle={opportunity.title}
                location={opportunity.location}
                jobSalaryMin={opportunity.salaryMin}
                jobSalaryMax={opportunity.salaryMax}
              />
            </div>
          )}

          {/* Footer Actions */}
          {isEditMode && (
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-4 mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="px-6 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Icon
                      icon="mingcute:loading-line"
                      className="animate-spin"
                      width={18}
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon icon="mingcute:save-line" width={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </form>
        </div>
        {/* Email Sidebar */}
        <EmailSidebar
          jobOpportunityId={opportunity.id}
          companyName={opportunity.company}
          jobTitle={opportunity.title}
          onEmailLinked={() => {
            // Trigger refresh of linked emails section
            // The LinkedEmailsSection will auto-refresh when jobOpportunityId changes
            // Force a re-render by updating a key or state
            window.dispatchEvent(new CustomEvent('linkedEmailUpdated'));
          }}
        />
      </div>
    </div>

    {/* Company Info Modal */}
    {showCompanyInfo && (
      <CompanyInfoModal
        opportunityId={opportunity.id}
        companyName={opportunity.company}
        jobTitle={opportunity.title}
        location={opportunity.location}
        industry={opportunity.industry}
        onClose={() => setShowCompanyInfo(false)}
      />
    )}
      
    {/* Share Job Modal */}
    {showShareModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Share Job with Team</h3>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setSelectedTeamId(null);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                <Icon icon="mingcute:close-line" width={24} aria-hidden="true" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Share "{opportunity.title}" at {opportunity.company} with your team members for collaborative feedback.
            </p>
            {teams.length === 0 ? (
              <div className="text-center py-8">
                <Icon icon="mingcute:user-group-line" width={48} className="mx-auto text-slate-400 mb-2" aria-hidden="true" />
                <p className="text-slate-600 mb-4">You don't have any teams yet.</p>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    window.location.href = "/collaboration/teams";
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create a team
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((team) => {
                  const isShared = sharedTeams.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      onClick={() => !isShared && setSelectedTeamId(team.id)}
                      disabled={isShared || isSharing}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isShared
                          ? "bg-green-50 border-green-300 cursor-not-allowed"
                          : selectedTeamId === team.id
                          ? "bg-blue-50 border-blue-500"
                          : "bg-white border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{team.teamName}</div>
                          <div className="text-sm text-slate-600">
                            {team.activeMembers} members
                          </div>
                        </div>
                        {isShared ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <Icon icon="mingcute:check-circle-line" width={18} />
                            Shared
                          </span>
                        ) : (
                          <Icon
                            icon="mingcute:arrow-right-line"
                            width={20}
                            className="text-slate-500"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowShareModal(false);
                      setSelectedTeamId(null);
                    }}
                    className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShareJob}
                    disabled={!selectedTeamId || isSharing}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
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
      )}
    </>
  );
}

