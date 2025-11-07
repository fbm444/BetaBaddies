import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { ValidationIssue } from "../types";

interface ResumeValidationPanelProps {
  resumeId: string;
  onValidate: () => void;
}

export function ResumeValidationPanel({ resumeId, onValidate }: ResumeValidationPanelProps) {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  // Mock validation issues for preview
  useEffect(() => {
    if (issues.length === 0) {
      setIssues([
        {
          id: "1",
          resumeId,
          issueType: "spelling",
          severity: "error",
          message: "Misspelled word: 'experiance' should be 'experience'",
          sectionReference: "experience",
          suggestion: "Change 'experiance' to 'experience'",
          isResolved: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "2",
          resumeId,
          issueType: "length",
          severity: "warning",
          message: "Resume is 3 pages long. Consider condensing to 1-2 pages.",
          sectionReference: "all",
          suggestion: "Remove less relevant experience or reduce bullet points",
          isResolved: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "3",
          resumeId,
          issueType: "missing_info",
          severity: "info",
          message: "Phone number is missing from contact information",
          sectionReference: "personal",
          suggestion: "Add phone number for better contact options",
          isResolved: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }, [resumeId, issues.length]);

  const handleValidate = async () => {
    setIsValidating(true);
    // Simulate validation
    setTimeout(() => {
      setIsValidating(false);
      onValidate();
    }, 1500);
  };

  const filteredIssues = issues.filter((issue) => {
    if (filter === 'all') return true;
    return issue.severity === filter;
  });

  const issueCounts = {
    error: issues.filter((i) => i.severity === 'error').length,
    warning: issues.filter((i) => i.severity === 'warning').length,
    info: issues.filter((i) => i.severity === 'info').length,
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'mingcute:close-circle-line';
      case 'warning':
        return 'mingcute:alert-line';
      case 'info':
        return 'mingcute:information-line';
      default:
        return 'mingcute:information-line';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Resume Validation</h3>
          <p className="text-sm text-gray-600">Check for issues and improvements</p>
        </div>
        <button
          onClick={handleValidate}
          disabled={isValidating}
          className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating ? (
            <>
              <Icon icon="mingcute:loading-line" className="w-4 h-4 inline mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Icon icon="mingcute:check-line" className="w-4 h-4 inline mr-2" />
              Run Validation
            </>
          )}
        </button>
      </div>

      {/* Issue Counts */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{issueCounts.error}</div>
          <div className="text-xs text-red-700">Errors</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{issueCounts.warning}</div>
          <div className="text-xs text-yellow-700">Warnings</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{issueCounts.info}</div>
          <div className="text-xs text-blue-700">Info</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'error', 'warning', 'info'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-[#3351FD] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Issues List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Icon icon="mingcute:check-circle-line" className="w-12 h-12 mx-auto text-green-500 mb-2" />
            <p>No issues found!</p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
            >
              <div className="flex items-start gap-3">
                <Icon icon={getSeverityIcon(issue.severity)} className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium uppercase">{issue.issueType}</span>
                    {issue.sectionReference && (
                      <span className="text-xs opacity-75">Section: {issue.sectionReference}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium mb-1">{issue.message}</p>
                  {issue.suggestion && (
                    <p className="text-xs opacity-75 mt-1">
                      <strong>Suggestion:</strong> {issue.suggestion}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIssues(issues.filter((i) => i.id !== issue.id));
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="mingcute:close-line" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

