import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface DocumentPerformanceCardProps {
  dateRange?: { startDate?: string; endDate?: string };
}

export function DocumentPerformanceCard({ dateRange }: DocumentPerformanceCardProps) {
  const [bestDocuments, setBestDocuments] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string>("resume");

  useEffect(() => {
    fetchBestDocuments();
  }, [documentType, dateRange]);

  const fetchBestDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getBestDocuments(documentType);
      if (response.ok && response.data) {
        setBestDocuments(response.data.documents || []);
      } else {
        setError(response.error?.message || "Failed to load document performance");
      }
    } catch (err: any) {
      console.error("Error fetching document performance:", err);
      setError(err.message || "Failed to load document performance");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = async () => {
    try {
      const response = await api.compareDocuments(documentType);
      if (response.ok && response.data) {
        setComparison(response.data.comparison);
      }
    } catch (err) {
      console.error("Error comparing documents:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading document performance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <Icon icon="mingcute:alert-line" className="mx-auto mb-3 text-red-500" width={40} />
        <p className="text-sm font-medium text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Document Performance</h2>
        <p className="text-slate-600 mb-6">
          Analyze which resume and cover letter versions perform best
        </p>
      </div>

      {/* Document Type Selector */}
      <div className="flex items-center gap-4 mb-6">
        <label className="text-sm font-medium text-slate-700">Document Type:</label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="resume">Resume</option>
          <option value="cover_letter">Cover Letter</option>
        </select>
        <button
          onClick={handleCompare}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Compare All Versions
        </button>
      </div>

      {/* Best Performing Documents */}
      {bestDocuments.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Top Performing Versions</h3>
          {bestDocuments.map((doc, index) => (
            <div
              key={doc.id || index}
              className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-6 border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                    <h4 className="text-lg font-semibold text-slate-900">
                      {doc.versionName || `Version ${doc.versionNumber || index + 1}`}
                    </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Response Rate</p>
                      <p className="text-lg font-bold text-slate-900">
                        {doc.responseRate ? `${(doc.responseRate * 100).toFixed(1)}%` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Interview Rate</p>
                      <p className="text-lg font-bold text-slate-900">
                        {doc.interviewRate ? `${(doc.interviewRate * 100).toFixed(1)}%` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Usage Count</p>
                      <p className="text-lg font-bold text-slate-900">{doc.usageCount || 0}</p>
                    </div>
                  </div>
                </div>
                {doc.isPrimary && (
                  <span className="ml-4 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    Primary
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <Icon icon="mingcute:file-line" className="mx-auto mb-3 text-slate-400" width={48} />
          <p className="text-slate-600">No document performance data available</p>
          <p className="text-sm text-slate-500 mt-1">
            Start tracking document versions to see performance metrics
          </p>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="mt-6 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Version Comparison</h3>
          <div className="space-y-2">
            {comparison.versions?.map((v: any, i: number) => (
              <div key={i} className="bg-white rounded p-3">
                <p className="text-sm font-medium text-slate-900">{v.name}</p>
                <p className="text-xs text-slate-600">Response Rate: {v.responseRate}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

