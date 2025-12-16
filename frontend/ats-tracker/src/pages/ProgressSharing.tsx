import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";

export function ProgressSharing() {
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [period, setPeriod] = useState("week");
  const [generateAI, setGenerateAI] = useState(true);
  const [mentor, setMentor] = useState<any>(null);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState<string>("");

  useEffect(() => {
    fetchMentor();
    fetchSavedReports();
  }, []);

  useEffect(() => {
    if (period) {
      fetchProgressReport();
    }
  }, [period]);

  const fetchMentor = async () => {
    try {
      const response = await api.getMentor();
      if (response.ok && response.data) {
        setMentor(response.data.mentor);
        if (response.data.mentor?.id) {
          setSelectedMentorId(response.data.mentor.id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch mentor:", error);
    }
  };

  const fetchSavedReports = async () => {
    try {
      const response = await api.getUserProgressReports();
      if (response.ok && response.data) {
        setSavedReports(response.data.reports || []);
      }
    } catch (error) {
      console.error("Failed to fetch saved reports:", error);
    }
  };

  const fetchProgressReport = async () => {
    try {
      setIsLoading(true);
      const response = await api.generateProgressReport(period, generateAI);
      if (response.ok && response.data) {
        setReport(response.data.report);
      }
    } catch (error) {
      console.error("Failed to fetch progress report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await fetchProgressReport();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveReport = async () => {
    if (!report) return;
    
    setIsSaving(true);
    try {
      const response = await api.saveProgressReport(report, []);
      if (response.ok) {
        alert("Progress report saved successfully!");
        fetchSavedReports();
      } else {
        alert("Failed to save progress report");
      }
    } catch (error) {
      console.error("Failed to save report:", error);
      alert("Failed to save progress report");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareWithMentor = async () => {
    if (!report || !selectedMentorId) return;

    try {
      // First save the report if not already saved
      let reportId: string;
      const savedReport = savedReports.find(r => 
        r.periodStart === report.periodStart && 
        r.periodEnd === report.periodEnd
      );

      if (savedReport) {
        reportId = savedReport.id;
        const shareResponse = await api.shareReportWithMentor(reportId, selectedMentorId);
        if (!shareResponse.ok) {
          alert("Failed to share report with mentor");
          return;
        }
      } else {
        // Save new report and share at the same time
        const saveResponse = await api.saveProgressReport(report, [selectedMentorId]);
        if (!saveResponse.ok) {
          alert("Failed to save and share report");
          return;
        }
        reportId = saveResponse.data.report.id;
      }

      alert("Progress report shared with mentor successfully!");
      setShowShareModal(false);
      fetchSavedReports();
    } catch (error) {
      console.error("Error sharing report:", error);
      alert("Failed to share report with mentor");
    }
  };

  if (isLoading && !report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon icon="mingcute:loading-line" width={48} className="animate-spin text-blue-700" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Progress Sharing</h1>
          <p className="text-slate-600 mt-1">Generate and share your job search progress with mentors</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={generateAI}
              onChange={(e) => setGenerateAI(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-700">Generate AI Summary</span>
          </label>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Icon icon="mingcute:refresh-line" width={20} />
            {isGenerating ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {report && (
        <div className="space-y-6">
          {/* AI Summary */}
          {report.aiSummary && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <Icon icon="mingcute:magic-line" width={24} className="text-blue-600" />
                <h2 className="text-2xl font-bold text-slate-900">AI-Generated Summary</h2>
              </div>
              {report.aiSummary.summary && (
                <div className="mb-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Executive Summary</h3>
                  <p className="text-slate-700">{report.aiSummary.summary}</p>
                </div>
              )}
              {report.aiSummary.achievements && (
                <div className="mb-4">
                  <h3 className="font-semibold text-green-700 mb-2">Key Achievements</h3>
                  <p className="text-slate-700">{report.aiSummary.achievements}</p>
                </div>
              )}
              {report.aiSummary.improvements && (
                <div className="mb-4">
                  <h3 className="font-semibold text-orange-700 mb-2">Areas for Improvement</h3>
                  <p className="text-slate-700">{report.aiSummary.improvements}</p>
                </div>
              )}
              {report.aiSummary.recommendations && (
                <div className="mb-4">
                  <h3 className="font-semibold text-blue-700 mb-2">Recommendations</h3>
                  <p className="text-slate-700">{report.aiSummary.recommendations}</p>
                </div>
              )}
              {report.aiSummary.encouragement && (
                <div className="bg-white/50 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-700 mb-2">Encouragement</h3>
                  <p className="text-slate-700">{report.aiSummary.encouragement}</p>
                </div>
              )}
            </div>
          )}

          {/* Progress Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <Icon icon="mingcute:file-edit-line" width={24} className="text-blue-700" />
                <span className="text-2xl font-bold text-blue-600">
                  {report.jobSearch?.applications_submitted || 0}
                </span>
              </div>
              <div className="text-sm text-slate-600">Applications Submitted</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <Icon icon="mingcute:calendar-event-line" width={24} className="text-green-500" />
                <span className="text-2xl font-bold text-green-600">
                  {report.jobSearch?.interviews_scheduled || 0}
                </span>
              </div>
              <div className="text-sm text-slate-600">Interviews Scheduled</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <Icon icon="mingcute:gift-line" width={24} className="text-purple-500" />
                <span className="text-2xl font-bold text-purple-600">
                  {report.jobSearch?.offers_received || 0}
                </span>
              </div>
              <div className="text-sm text-slate-600">Offers Received</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between mb-2">
                <Icon icon="mingcute:trophy-line" width={24} className="text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-600">
                  {report.milestones?.length || 0}
                </span>
              </div>
              <div className="text-sm text-slate-600">Milestones Achieved</div>
            </div>
          </div>

          {/* Mock Interview Analytics */}
          {report.mockInterviews && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Icon icon="mingcute:chat-3-line" width={24} />
                Mock Interview Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Total Sessions</div>
                  <div className="text-2xl font-bold text-blue-600">{report.mockInterviews.total || 0}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Completed</div>
                  <div className="text-2xl font-bold text-green-600">{report.mockInterviews.completed || 0}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Avg Confidence Score</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {report.mockInterviews.avgConfidenceScore || 0}/100
                  </div>
                </div>
              </div>
              {report.mockInterviews.recentSessions && report.mockInterviews.recentSessions.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-slate-900 mb-2">Recent Sessions</h4>
                  <div className="space-y-2">
                    {report.mockInterviews.recentSessions.map((session: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <div className="font-medium text-slate-900">
                            {session.targetRole} {session.targetCompany ? `@ ${session.targetCompany}` : ""}
                          </div>
                          <div className="text-sm text-slate-600">
                            {new Date(session.completedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-lg font-bold text-purple-600">
                          {session.confidenceScore || 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interview Success Rate */}
          {report.interviewSuccess && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Icon icon="mingcute:chart-line" width={24} />
                Interview Success Rate
              </h3>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {report.interviewSuccess.successRate || 0}%
                  </div>
                  <div className="text-sm text-slate-600">
                    {report.interviewSuccess.successfulInterviews || 0} successful out of{" "}
                    {report.interviewSuccess.totalCompleted || 0} completed interviews
                  </div>
                </div>
                <div className="w-32 h-32 relative">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-slate-200"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(report.interviewSuccess.successRate || 0) * 3.51} 351`}
                      className="text-green-500"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Interviews */}
          {report.upcomingInterviews && report.upcomingInterviews.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Icon icon="mingcute:calendar-check-line" width={24} />
                Upcoming Interviews
              </h3>
              <div className="space-y-3">
                {report.upcomingInterviews.map((interview: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                    <div>
                      <div className="font-semibold text-slate-900">{interview.title || interview.company}</div>
                      <div className="text-sm text-slate-600">
                        {new Date(interview.interview_date).toLocaleDateString()} • {interview.interview_type || "Interview"}
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                      {interview.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestones */}
          {report.milestones && report.milestones.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Recent Milestones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.milestones.map((milestone: any, idx: number) => (
                  <div key={idx} className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <div className="font-semibold text-slate-900">{milestone.milestone_title}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      {new Date(milestone.achieved_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 bg-white rounded-lg shadow p-6">
            <button
              onClick={handleSaveReport}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Icon icon="mingcute:save-line" width={20} />
              {isSaving ? "Saving..." : "Save Report"}
            </button>
            {mentor && (
              <button
                onClick={() => setShowShareModal(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Icon icon="mingcute:share-line" width={20} />
                Share with Mentor
              </button>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Share Progress Report</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>
            {mentor ? (
              <div>
                <p className="text-slate-600 mb-4">
                  Share this progress report with your mentor: <strong>{mentor.email}</strong>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleShareWithMentor}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Share
                  </button>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-slate-600 mb-4">You don't have a mentor assigned yet.</p>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Saved Reports</h3>
          <div className="space-y-2">
            {savedReports.map((savedReport) => (
              <div
                key={savedReport.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {new Date(savedReport.periodStart).toLocaleDateString()} -{" "}
                    {new Date(savedReport.periodEnd).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-slate-600">
                    Generated {new Date(savedReport.generatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  Shared with {savedReport.sharedWith?.length || 0} mentor(s)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
