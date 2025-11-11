import { useState, FormEvent } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import type { JobOpportunityInput } from "../types";

interface JobImportModalProps {
  onImport: (data: JobOpportunityInput) => void;
  onClose: () => void;
}

interface ImportResult {
  success: boolean;
  error?: string | null;
  data?: {
    url: string;
    title?: string | null;
    company?: string | null;
    location?: string | null;
    description?: string | null;
    jobBoard?: string | null;
    importStatus: "success" | "partial" | "failed";
  };
}

export function JobImportModal({ onImport, onClose }: JobImportModalProps) {
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importedData, setImportedData] = useState<JobOpportunityInput | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleImport = async (e: FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setErrors({ url: "URL is required" });
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setErrors({ url: "Please enter a valid URL" });
      return;
    }

    setIsImporting(true);
    setErrors({});
    setImportResult(null);

    try {
      const response = await api.importJobFromUrl(url);
      if (response.ok && response.data) {
        const result = response.data.importResult;
        setImportResult(result);

        if (result.success && result.data) {
          // Always pre-populate form with URL at minimum
          const data: JobOpportunityInput = {
            title: result.data.title || "",
            company: result.data.company || "",
            location: result.data.location || "",
            jobPostingUrl: result.data.url,
            description: result.data.description || undefined,
            status: "Interested",
          };
          setImportedData(data);

          // Auto-proceed to form if import was successful
          if (result.data.importStatus === "success") {
            // Small delay to show success message, then auto-proceed
            setTimeout(() => {
              onImport(data);
              onClose();
            }, 1500);
          }
        } else if (result.data) {
          // Even if import failed, we can still use the URL
          const data: JobOpportunityInput = {
            title: "",
            company: "",
            location: "",
            jobPostingUrl: result.data.url,
            status: "Interested",
          };
          setImportedData(data);
        }
      } else {
        setImportResult({
          success: false,
          error: response.error?.message || "Failed to import job data",
        });
      }
    } catch (err: any) {
      console.error("Failed to import job:", err);
      setImportResult({
        success: false,
        error: err.message || "Failed to import job data",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleContinue = () => {
    if (importedData) {
      // Use imported data (will have URL at minimum)
      onImport(importedData);
      onClose();
    } else if (url) {
      // Fallback: just use the URL
      const data: JobOpportunityInput = {
        title: "",
        company: "",
        location: "",
        jobPostingUrl: url,
        status: "Interested",
      };
      onImport(data);
      onClose();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "partial":
        return "bg-amber-50 border-amber-200 text-amber-800";
      case "failed":
        return "bg-red-50 border-red-200 text-red-800";
      default:
        return "bg-slate-50 border-slate-200 text-slate-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return "mingcute:check-circle-line";
      case "partial":
        return "mingcute:alert-line";
      case "failed":
        return "mingcute:close-circle-line";
      default:
        return "mingcute:information-line";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-poppins">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto font-poppins">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon icon="mingcute:link-line" className="text-blue-600" width={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Import Job from URL</h2>
              <p className="text-sm text-slate-600">
                Paste a job posting URL to auto-populate fields
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        {/* URL Input Form */}
        <form onSubmit={handleImport} className="mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Job Posting URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setErrors({});
                  setImportResult(null);
                }}
                placeholder="https://linkedin.com/jobs/view/... or https://indeed.com/viewjob?jk=..."
                className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.url ? "border-red-300" : "border-slate-300"
                }`}
                disabled={isImporting}
              />
              <button
                type="submit"
                disabled={isImporting || !url.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Icon icon="mingcute:loading-line" className="animate-spin" width={20} />
                    Importing...
                  </>
                ) : (
                  <>
                    <Icon icon="mingcute:search-line" width={20} />
                    Import
                  </>
                )}
              </button>
            </div>
            {errors.url && (
              <p className="mt-1 text-sm text-red-600">{errors.url}</p>
            )}
          </div>

          {/* Supported Job Boards Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-900 mb-2 font-medium">
              Supported Job Boards:
            </p>
            <div className="flex flex-wrap gap-2">
              {["LinkedIn", "Indeed", "Glassdoor", "Company Websites"].map((board) => (
                <span
                  key={board}
                  className="px-2 py-1 bg-white rounded text-xs font-medium text-blue-700 border border-blue-200"
                >
                  {board}
                </span>
              ))}
            </div>
          </div>
        </form>

        {/* Import Result */}
        {importResult && (
          <div className="mb-6">
            <div className={`border rounded-lg p-4 mb-4 ${getStatusColor(importResult.data?.importStatus || "failed")}`}>
              <div className="flex items-start gap-3">
                <Icon
                  icon={getStatusIcon(importResult.data?.importStatus || "failed")}
                  className="mt-0.5"
                  width={20}
                />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">
                    {importResult.data?.importStatus === "success"
                      ? "Import Successful"
                      : importResult.data?.importStatus === "partial"
                      ? "Partial Import"
                      : "Import Failed"}
                  </h3>
                  <p className="text-sm">
                    {importResult.error ||
                      (importResult.data?.importStatus === "success"
                        ? "Job details have been extracted successfully! Opening form..."
                        : importResult.data?.importStatus === "partial"
                        ? "Some job details could be extracted. Please review and complete the information."
                        : "Unable to extract job details from this URL. You can still add the job manually.")}
                  </p>
                  {importResult.data?.jobBoard && (
                    <p className="text-sm mt-2 font-medium">
                      Detected: {importResult.data.jobBoard.charAt(0).toUpperCase() + importResult.data.jobBoard.slice(1)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Imported Data Preview */}
            {importedData && (
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">Imported Data:</h4>
                <div className="space-y-2 text-sm">
                  {importedData.title && (
                    <div>
                      <span className="font-medium text-slate-600">Title: </span>
                      <span className="text-slate-900">{importedData.title}</span>
                    </div>
                  )}
                  {importedData.company && (
                    <div>
                      <span className="font-medium text-slate-600">Company: </span>
                      <span className="text-slate-900">{importedData.company}</span>
                    </div>
                  )}
                  {importedData.location && (
                    <div>
                      <span className="font-medium text-slate-600">Location: </span>
                      <span className="text-slate-900">{importedData.location}</span>
                    </div>
                  )}
                  {importedData.jobPostingUrl && (
                    <div>
                      <span className="font-medium text-slate-600">URL: </span>
                      <a
                        href={importedData.jobPostingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        {importedData.jobPostingUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
          >
            Cancel
          </button>
          {(importResult || url) && (
            <button
              onClick={handleContinue}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2"
            >
              <Icon icon="mingcute:arrow-right-line" width={18} />
              {importResult?.data?.importStatus === "success"
                ? "Continue to Review"
                : importResult?.data?.importStatus === "partial"
                ? "Continue to Form"
                : "Continue to Form"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

