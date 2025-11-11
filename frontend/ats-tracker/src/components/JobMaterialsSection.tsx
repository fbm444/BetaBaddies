import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import type {
  ResumeVersion,
  CoverLetterVersion,
  MaterialsHistoryEntry,
  JobOpportunityData,
  CurrentMaterials,
} from "../types";
import { api } from "../services/api";

interface JobMaterialsSectionProps {
  opportunity: JobOpportunityData;
  isEditMode: boolean;
  onMaterialsChange?: () => void;
}

export function JobMaterialsSection({
  opportunity,
  isEditMode,
  onMaterialsChange,
}: JobMaterialsSectionProps) {
  const [availableResumes, setAvailableResumes] = useState<ResumeVersion[]>([]);
  const [availableCoverLetters, setAvailableCoverLetters] = useState<CoverLetterVersion[]>([]);
  const [materialsHistory, setMaterialsHistory] = useState<MaterialsHistoryEntry[]>([]);
  const [currentMaterials, setCurrentMaterials] = useState<CurrentMaterials | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, [opportunity.id]);

  const loadMaterials = async () => {
    setIsLoading(true);
    try {
      const [resumesResponse, coverLettersResponse, historyResponse, materialsResponse] = await Promise.all([
        api.getAvailableResumes(),
        api.getAvailableCoverLetters(),
        api.getMaterialsHistory(opportunity.id),
        api.getCurrentMaterials(opportunity.id),
      ]);

      if (resumesResponse.ok && resumesResponse.data) {
        setAvailableResumes(resumesResponse.data.resumes);
      }
      if (coverLettersResponse.ok && coverLettersResponse.data) {
        setAvailableCoverLetters(coverLettersResponse.data.coverLetters);
      }
      if (historyResponse.ok && historyResponse.data) {
        setMaterialsHistory(historyResponse.data.history);
      }
      if (materialsResponse.ok && materialsResponse.data) {
        setCurrentMaterials(materialsResponse.data.materials);
        setSelectedResumeId(materialsResponse.data.materials.resume?.id || null);
        setSelectedCoverLetterId(materialsResponse.data.materials.coverLetter?.id || null);
      }
    } catch (error) {
      console.error("Error loading materials:", error);
      // Don't throw - just log the error so the component still renders
    } finally {
      setIsLoading(false);
    }
  };

  const saveMaterials = async (resumeId: string | null, coverLetterId: string | null) => {
    setIsSaving(true);
    try {
      const response = await api.linkMaterials(
        opportunity.id,
        resumeId,
        coverLetterId
      );

      if (response.ok && response.data) {
        setCurrentMaterials(response.data.materials);
        setSelectedResumeId(resumeId);
        setSelectedCoverLetterId(coverLetterId);
        // Reload history to show the new change
        const historyResponse = await api.getMaterialsHistory(opportunity.id);
        if (historyResponse.ok && historyResponse.data) {
          setMaterialsHistory(historyResponse.data.history);
        }
        if (onMaterialsChange) {
          onMaterialsChange();
        }
      }
    } catch (error) {
      console.error("Error saving materials:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumeChange = async (resumeId: string | null) => {
    setSelectedResumeId(resumeId);
    // Auto-save in edit mode
    if (isEditMode) {
      await saveMaterials(resumeId, selectedCoverLetterId);
    }
  };

  const handleCoverLetterChange = async (coverLetterId: string | null) => {
    setSelectedCoverLetterId(coverLetterId);
    // Auto-save in edit mode
    if (isEditMode) {
      await saveMaterials(selectedResumeId, coverLetterId);
    }
  };

  const getSelectedResume = () => {
    return currentMaterials?.resume || availableResumes.find((r) => r.id === selectedResumeId);
  };

  const getSelectedCoverLetter = () => {
    return currentMaterials?.coverLetter || availableCoverLetters.find((cl) => cl.id === selectedCoverLetterId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <section className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Application Materials
        </h3>
        <p className="text-slate-500">Loading materials...</p>
      </section>
    );
  }

  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Application Materials
        </h3>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Icon icon="mingcute:time-line" width={16} />
          {showHistory ? "Hide" : "Show"} History
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resume Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Resume Version
          </label>
          {isEditMode ? (
            <div className="space-y-2">
              <select
                value={selectedResumeId || ""}
                onChange={(e) => handleResumeChange(e.target.value || null)}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- No Resume Selected --</option>
                {availableResumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.versionName} {resume.isMaster && "(Master)"} - v{resume.versionNumber}
                    {resume.description && ` - ${resume.description}`}
                    {resume.jobId && resume.jobId !== opportunity.id && " (Linked to another job)"}
                  </option>
                ))}
              </select>
              {isSaving && (
                <p className="text-xs text-slate-500">Saving...</p>
              )}
            </div>
          ) : (
            <div className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm">
              {getSelectedResume() ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">
                      {getSelectedResume()?.versionName}
                    </span>
                    {getSelectedResume()?.isMaster && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                        Master
                      </span>
                    )}
                    <span className="ml-2 text-slate-500">
                      v{getSelectedResume()?.versionNumber}
                    </span>
                    {getSelectedResume()?.file && (
                      <a
                        href={getSelectedResume()?.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        <Icon icon="mingcute:download-line" width={14} className="inline mr-1" />
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-slate-500">No resume selected</span>
              )}
            </div>
          )}
        </div>

        {/* Cover Letter Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Cover Letter Version
          </label>
          {isEditMode ? (
            <div className="space-y-2">
              <select
                value={selectedCoverLetterId || ""}
                onChange={(e) => handleCoverLetterChange(e.target.value || null)}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- No Cover Letter Selected --</option>
                {availableCoverLetters.map((coverLetter) => (
                  <option key={coverLetter.id} value={coverLetter.id}>
                    {coverLetter.versionName} {coverLetter.isMaster && "(Master)"} - v{coverLetter.versionNumber}
                    {coverLetter.description && ` - ${coverLetter.description}`}
                    {coverLetter.jobId && coverLetter.jobId !== opportunity.id && " (Linked to another job)"}
                  </option>
                ))}
              </select>
              {isSaving && (
                <p className="text-xs text-slate-500">Saving...</p>
              )}
            </div>
          ) : (
            <div className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm">
              {getSelectedCoverLetter() ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">
                      {getSelectedCoverLetter()?.versionName}
                    </span>
                    {getSelectedCoverLetter()?.isMaster && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                        Master
                      </span>
                    )}
                    <span className="ml-2 text-slate-500">
                      v{getSelectedCoverLetter()?.versionNumber}
                    </span>
                    {getSelectedCoverLetter()?.file && (
                      <a
                        href={getSelectedCoverLetter()?.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        <Icon icon="mingcute:download-line" width={14} className="inline mr-1" />
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-slate-500">No cover letter selected</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Materials History */}
      {showHistory && materialsHistory.length > 0 && (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Materials History</h4>
          <ul className="space-y-3">
            {materialsHistory.map((entry) => (
              <li
                key={entry.id}
                className="bg-slate-50 p-3 rounded-lg border border-slate-200"
              >
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700">
                    {formatDate(entry.changedAt)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      entry.changeType === "linked"
                        ? "bg-green-100 text-green-800"
                        : entry.changeType === "removed"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {entry.changeType}
                  </span>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>
                    Resume:{" "}
                    {entry.resume
                      ? `${entry.resume.versionName} (v${entry.resume.versionNumber})`
                      : "N/A"}
                  </p>
                  <p>
                    Cover Letter:{" "}
                    {entry.coverLetter
                      ? `${entry.coverLetter.versionName} (v${entry.coverLetter.versionNumber})`
                      : "N/A"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showHistory && materialsHistory.length === 0 && (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">No materials history available for this job.</p>
        </div>
      )}
    </section>
  );
}

