import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../services/api";
import type { InterviewData, JobOpportunityData } from "../types";

type TabType = "research" | "questions" | "coaching" | "mock" | "technical";

export function InterviewPreparation() {
  const { interviewId } = useParams<{ interviewId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get("tab") as TabType) || "research"
  );
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [interviews, setInterviews] = useState<InterviewData[]>([]);
  const [jobOpportunity, setJobOpportunity] =
    useState<JobOpportunityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInterviewSelector, setShowInterviewSelector] = useState(
    !interviewId
  );

  useEffect(() => {
    if (interviewId) {
      fetchInterview();
      setShowInterviewSelector(false);
    } else {
      fetchInterviews();
      setIsLoading(false);
    }
  }, [interviewId]);

  useEffect(() => {
    if (interview?.jobOpportunityId) {
      fetchJobOpportunity();
    }
  }, [interview?.jobOpportunityId]);

  const fetchInterviews = async () => {
    try {
      setIsLoading(true);
      const response = await api.getInterviews({ status: "scheduled" });
      if (response.ok && response.data) {
        setInterviews(response.data.interviews || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch interviews:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInterview = async () => {
    if (!interviewId) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getInterview(interviewId);
      if (response.ok && response.data) {
        setInterview(response.data.interview);
        setShowInterviewSelector(false);
      }
    } catch (err: any) {
      console.error("Failed to fetch interview:", err);
      setError(err.message || "Failed to load interview");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobOpportunity = async () => {
    if (!interview?.jobOpportunityId) return;
    try {
      const response = await api.getJobOpportunityById(
        interview.jobOpportunityId
      );
      if (response.ok && response.data) {
        setJobOpportunity(response.data.jobOpportunity);
      }
    } catch (err: any) {
      console.error("Failed to fetch job opportunity:", err);
    }
  };

  const handleSelectInterview = (selectedInterview: InterviewData) => {
    setInterview(selectedInterview);
    setShowInterviewSelector(false);
    navigate(
      `/interview-preparation/${selectedInterview.id}?tab=${activeTab}`,
      { replace: true }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            width={48}
            className="animate-spin mx-auto text-blue-500 mb-4"
          />
          <p className="text-slate-600">Loading interview preparation...</p>
        </div>
      </div>
    );
  }

  // Show interview selector if no interview is selected
  if (showInterviewSelector || (!interview && !interviewId)) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 font-poppins">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Interview Preparation
            </h1>
            <p className="text-slate-600">
              Select an interview to prepare for, or use general preparation
              tools.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interview Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Select an Interview
              </h2>
              {interviews.length === 0 ? (
                <div className="text-center py-12">
                  <Icon
                    icon="mingcute:calendar-line"
                    width={64}
                    className="mx-auto text-slate-300 mb-4"
                  />
                  <p className="text-slate-600 mb-4">
                    No scheduled interviews found.
                  </p>
                  <button
                    onClick={() => navigate("/interview-scheduling")}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Schedule an Interview
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {interviews.map((int) => (
                    <button
                      key={int.id}
                      onClick={() => handleSelectInterview(int)}
                      className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {int.title}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {int.company}
                          </p>
                          {int.scheduledAt && (
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(int.scheduledAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Icon
                          icon="mingcute:arrow-right-line"
                          width={20}
                          className="text-slate-400"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* General Preparation Tools */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                General Preparation
              </h2>
              <p className="text-slate-600 mb-6">
                Access preparation tools without selecting a specific interview.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowInterviewSelector(false);
                    setInterview(null);
                  }}
                  className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      icon="mingcute:question-line"
                      width={24}
                      className="text-blue-500"
                    />
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Question Bank
                      </h3>
                      <p className="text-sm text-slate-600">
                        Practice with general interview questions
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowInterviewSelector(false);
                    setInterview(null);
                    setActiveTab("mock");
                  }}
                  className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      icon="mingcute:video-line"
                      width={24}
                      className="text-blue-500"
                    />
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Mock Interview
                      </h3>
                      <p className="text-sm text-slate-600">
                        Practice a complete interview simulation
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowInterviewSelector(false);
                    setInterview(null);
                    setActiveTab("technical");
                  }}
                  className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      icon="mingcute:code-line"
                      width={24}
                      className="text-blue-500"
                    />
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Technical Prep
                      </h3>
                      <p className="text-sm text-slate-600">
                        Practice coding and system design
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && interviewId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-sm border border-slate-200">
          <Icon
            icon="mingcute:alert-circle-line"
            width={64}
            className="mx-auto text-red-500 mb-4"
          />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Interview Not Found
          </h3>
          <p className="text-slate-600 mb-6">
            {error || "The interview you're looking for doesn't exist."}
          </p>
          <button
            onClick={() => navigate("/interview-preparation")}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Back to Preparation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-poppins">
      {/* Header Bar - Sticky */}
      <div className="sticky top-[80px] z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center py-5">
            <div className="w-full flex items-center justify-center mb-3">
              <h1 className="text-2xl font-bold text-slate-900">
                Interview Preparation
              </h1>
            </div>
            {interview ? (
              <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <Icon icon="mingcute:building-line" width={18} />
                  <span className="font-medium text-sm">
                    {interview.company}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg">
                  <Icon icon="mingcute:briefcase-line" width={18} />
                  <span className="text-sm">{interview.title}</span>
                </div>
                {interview.scheduledAt && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg">
                    <Icon icon="mingcute:calendar-line" width={18} />
                    <span className="text-sm">
                      {new Date(interview.scheduledAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {interview && (
                  <button
                    onClick={() => {
                      setShowInterviewSelector(true);
                      setInterview(null);
                      navigate("/interview-preparation", { replace: true });
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition font-medium whitespace-nowrap ml-2"
                  >
                    <Icon icon="mingcute:arrow-left-line" width={18} />
                    <span className="hidden sm:inline">Change Interview</span>
                  </button>
                )}
              </div>
            ) : (
              <p className="text-slate-600 text-sm mb-3">
                General interview preparation tools
              </p>
            )}

            {/* Tabs */}
            <div className="w-full flex gap-1 overflow-x-auto scrollbar-hide pb-1 justify-center">
              {[
                {
                  id: "research" as TabType,
                  label: "Company Research",
                  icon: "mingcute:building-line",
                  color: "blue",
                },
                {
                  id: "questions" as TabType,
                  label: "Question Bank",
                  icon: "mingcute:question-line",
                  color: "purple",
                },
                {
                  id: "coaching" as TabType,
                  label: "Response Coaching",
                  icon: "mingcute:chat-line",
                  color: "green",
                },
                {
                  id: "mock" as TabType,
                  label: "Mock Interview",
                  icon: "mingcute:video-line",
                  color: "orange",
                },
                {
                  id: "technical" as TabType,
                  label: "Technical Prep",
                  icon: "mingcute:code-line",
                  color: "indigo",
                },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const colorClasses = {
                  blue: isActive
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "hover:bg-blue-50 hover:text-blue-600",
                  purple: isActive
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "hover:bg-purple-50 hover:text-purple-600",
                  green: isActive
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "hover:bg-green-50 hover:text-green-600",
                  orange: isActive
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "hover:bg-orange-50 hover:text-orange-600",
                  indigo: isActive
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "hover:bg-indigo-50 hover:text-indigo-600",
                };

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      navigate(`?tab=${tab.id}`, { replace: true });
                    }}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition rounded-t-lg border-b-2 whitespace-nowrap ${
                      isActive
                        ? `${
                            colorClasses[tab.color as keyof typeof colorClasses]
                          } border-b-2`
                        : "text-slate-600 hover:text-slate-900 border-transparent"
                    }`}
                  >
                    <Icon icon={tab.icon} width={20} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6">
          {!interview &&
          (activeTab === "research" ||
            activeTab === "questions" ||
            activeTab === "coaching") ? (
            <div className="text-center py-12">
              <Icon
                icon="mingcute:alert-circle-line"
                width={64}
                className="mx-auto text-amber-500 mb-4"
              />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Interview Selected
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                {activeTab === "research" &&
                  "Please select an interview to view company research and insights."}
                {activeTab === "questions" &&
                  "Please select an interview to access role-specific question banks."}
                {activeTab === "coaching" &&
                  "Please select an interview to practice responses and get AI feedback."}
              </p>
              <button
                onClick={() => setShowInterviewSelector(true)}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition inline-flex items-center gap-2"
              >
                <Icon icon="mingcute:calendar-line" width={20} />
                Select an Interview
              </button>
            </div>
          ) : activeTab === "research" ? (
            <CompanyResearchTab
              interview={interview}
              jobOpportunity={jobOpportunity}
            />
          ) : activeTab === "questions" ? (
            <QuestionBankTab
              interview={interview}
              jobOpportunity={jobOpportunity}
            />
          ) : activeTab === "coaching" ? (
            <ResponseCoachingTab
              interview={interview}
              jobOpportunity={jobOpportunity}
            />
          ) : activeTab === "mock" ? (
            <MockInterviewTab
              interview={interview}
              jobOpportunity={jobOpportunity}
            />
          ) : activeTab === "technical" ? (
            <TechnicalPrepTab
              interview={interview}
              jobOpportunity={jobOpportunity}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Company Research Tab Component (UC-074)
function CompanyResearchTab({
  interview,
  jobOpportunity,
}: {
  interview: InterviewData | null;
  jobOpportunity: JobOpportunityData | null;
}) {
  const [research, setResearch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest('[id="export-menu"]') &&
        !target.closest('button[class*="bg-blue-500"]')
      ) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showExportMenu]);

  useEffect(() => {
    if (interview?.id) {
      fetchResearch();
    }
  }, [interview?.id]);

  const fetchResearch = async () => {
    if (!interview?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getInterviewCompanyResearch(interview.id);
      if (response.ok && response.data) {
        setResearch(response.data.research);
      }
    } catch (err: any) {
      console.error("Failed to fetch research:", err);
      setError(err.message || "Failed to load company research");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!interview?.id) return;
    try {
      setIsGenerating(true);
      setError(null);
      const response = await api.generateInterviewCompanyResearch(
        interview.id,
        false
      );
      if (response.ok) {
        await fetchResearch();
      }
    } catch (err: any) {
      console.error("Failed to generate research:", err);
      setError(err.message || "Failed to generate company research");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: "markdown" | "json" | "pdf" | "docx") => {
    if (!interview?.id) return;
    try {
      const response = await api.exportInterviewCompanyResearch(
        interview.id,
        format
      );

      if (format === "pdf" || format === "docx") {
        // For PDF and DOCX, response is a blob
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `company-research-${
          interview.company
        }-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // For markdown and JSON, response is JSON
        if (response.ok && response.data) {
          const blob = new Blob([response.data.report], {
            type: format === "json" ? "application/json" : "text/markdown",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `company-research-${interview.company}-${Date.now()}.${
            format === "json" ? "json" : "md"
          }`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    } catch (err: any) {
      console.error("Failed to export research:", err);
      setError(err.message || "Failed to export research");
    }
  };

  if (!interview) {
    return (
      <div className="text-center py-12">
        <Icon
          icon="mingcute:building-line"
          width={64}
          className="mx-auto text-slate-300 mb-4"
        />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          Select an Interview
        </h3>
        <p className="text-slate-600">
          Please select an interview from the main page to view company
          research.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Icon
          icon="mingcute:loading-line"
          width={48}
          className="animate-spin mx-auto text-blue-500 mb-4"
        />
        <p className="text-slate-600">Loading company research...</p>
      </div>
    );
  }

  if (!research) {
    return (
      <div className="text-center py-12">
        <Icon
          icon="mingcute:building-line"
          width={64}
          className="mx-auto text-slate-300 mb-4"
        />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          No Research Available
        </h3>
        <p className="text-slate-600 mb-6">
          Generate comprehensive company research to prepare for your interview.
        </p>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate Company Research"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* UC-074 Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Icon
                  icon="mingcute:building-line"
                  width={24}
                  className="text-white"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Company Research Automation
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  UC-074: Comprehensive company profiles for interview
                  preparation
                </p>
              </div>
            </div>
            <p className="text-slate-700 mt-3">
              Generate comprehensive company research including history,
              mission, values, leadership team, competitive landscape, recent
              news, and intelligent talking points to demonstrate knowledge and
              ask informed questions during your interview.
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {interview.company} - {interview.title}
            </h3>
            <p className="text-sm text-slate-600">
              {jobOpportunity?.company_name || interview.company}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
          >
            <Icon icon="mingcute:refresh-line" width={20} />
            {isGenerating ? "Generating..." : "Refresh Research"}
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowExportMenu(!showExportMenu);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              <Icon icon="mingcute:download-line" width={20} />
              Export
              <Icon icon="mingcute:arrow-down-line" width={16} />
            </button>
            {showExportMenu && (
              <div
                className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-1 z-10 min-w-[180px]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    handleExport("pdf");
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded whitespace-nowrap flex items-center gap-2"
                >
                  <Icon icon="mingcute:file-pdf-line" width={16} />
                  Export as PDF
                </button>
                <button
                  onClick={() => {
                    handleExport("docx");
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded whitespace-nowrap flex items-center gap-2"
                >
                  <Icon icon="mingcute:file-word-line" width={16} />
                  Export as DOCX
                </button>
                <div className="border-t border-slate-200 my-1" />
                <button
                  onClick={() => {
                    handleExport("markdown");
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded whitespace-nowrap"
                >
                  Export as Markdown
                </button>
                <button
                  onClick={() => {
                    handleExport("json");
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded whitespace-nowrap"
                >
                  Export as JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Company Overview */}
      {research.companyInfo && (
        <div className="border border-slate-200 rounded-lg p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Icon
              icon="mingcute:building-2-line"
              width={24}
              className="text-blue-500"
            />
            <h3 className="text-xl font-semibold text-slate-900">
              Company Overview
            </h3>
          </div>
          {research.companyInfo.description && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-900 mb-2">About</h4>
              <p className="text-slate-700 leading-relaxed">
                {research.companyInfo.description}
              </p>
            </div>
          )}
          {research.companyInfo.mission && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Icon icon="mingcute:target-line" width={18} />
                Mission & Values
              </h4>
              <p className="text-slate-700">{research.companyInfo.mission}</p>
            </div>
          )}
          {research.companyInfo.values && (
            <div className="mb-4">
              <h4 className="font-semibold text-slate-900 mb-2">Core Values</h4>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(research.companyInfo.values) ? (
                  research.companyInfo.values.map(
                    (value: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                      >
                        {value}
                      </span>
                    )
                  )
                ) : (
                  <p className="text-slate-700">
                    {research.companyInfo.values}
                  </p>
                )}
              </div>
            </div>
          )}
          {research.companyInfo.culture && (
            <div className="mb-4">
              <h4 className="font-semibold text-slate-900 mb-2">
                Company Culture
              </h4>
              <p className="text-slate-700">{research.companyInfo.culture}</p>
            </div>
          )}
        </div>
      )}

      {/* Leadership Team & Potential Interviewers */}
      {research.interviewInsights?.interviewerProfiles &&
        research.interviewInsights.interviewerProfiles.length > 0 && (
          <div className="border border-slate-200 rounded-lg p-6 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <Icon
                icon="mingcute:user-3-line"
                width={24}
                className="text-blue-500"
              />
              <h3 className="text-xl font-semibold text-slate-900">
                Leadership Team & Potential Interviewers
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {research.interviewInsights.interviewerProfiles.map(
                (profile: any, idx: number) => (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    {profile.name && (
                      <h4 className="font-semibold text-slate-900 mb-1">
                        {profile.name}
                      </h4>
                    )}
                    {profile.role && (
                      <p className="text-sm text-slate-600 mb-2">
                        {profile.role}
                      </p>
                    )}
                    {profile.background && (
                      <p className="text-sm text-slate-700">
                        {profile.background}
                      </p>
                    )}
                    {profile.interviewStyle && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <p className="text-xs text-slate-600 font-medium mb-1">
                          Interview Style:
                        </p>
                        <p className="text-sm text-slate-700">
                          {profile.interviewStyle}
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

      {/* Competitive Landscape & Market Position */}
      {research.competitiveLandscape && (
        <div className="border border-slate-200 rounded-lg p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Icon
              icon="mingcute:chart-line"
              width={24}
              className="text-blue-500"
            />
            <h3 className="text-xl font-semibold text-slate-900">
              Competitive Landscape & Market Position
            </h3>
          </div>
          {typeof research.competitiveLandscape === "string" ? (
            <p className="text-slate-700 leading-relaxed">
              {research.competitiveLandscape}
            </p>
          ) : (
            <div className="space-y-4">
              {research.competitiveLandscape.marketPosition && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Market Position
                  </h4>
                  <p className="text-slate-700">
                    {research.competitiveLandscape.marketPosition}
                  </p>
                </div>
              )}
              {research.competitiveLandscape.competitors && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Key Competitors
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {Array.isArray(
                      research.competitiveLandscape.competitors
                    ) ? (
                      research.competitiveLandscape.competitors.map(
                        (competitor: string, idx: number) => (
                          <li key={idx}>{competitor}</li>
                        )
                      )
                    ) : (
                      <li>{research.competitiveLandscape.competitors}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent News, Funding & Strategic Initiatives */}
      {research.companyNews && research.companyNews.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Icon
              icon="mingcute:news-line"
              width={24}
              className="text-blue-500"
            />
            <h3 className="text-xl font-semibold text-slate-900">
              Recent News, Funding & Strategic Initiatives
            </h3>
          </div>
          <div className="space-y-4">
            {research.companyNews.slice(0, 10).map((news: any, idx: number) => {
              const isFunding =
                news.heading?.toLowerCase().includes("funding") ||
                news.heading?.toLowerCase().includes("raised") ||
                news.heading?.toLowerCase().includes("investment");
              const isStrategic =
                news.heading?.toLowerCase().includes("partnership") ||
                news.heading?.toLowerCase().includes("acquisition") ||
                news.heading?.toLowerCase().includes("expansion");

              return (
                <div
                  key={idx}
                  className={`border-l-4 pl-4 py-2 rounded-r ${
                    isFunding
                      ? "border-green-500 bg-green-50"
                      : isStrategic
                      ? "border-purple-500 bg-purple-50"
                      : "border-blue-500 bg-blue-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {isFunding && (
                        <span className="inline-block px-2 py-1 bg-green-200 text-green-800 text-xs font-medium rounded mb-2">
                          Funding
                        </span>
                      )}
                      {isStrategic && (
                        <span className="inline-block px-2 py-1 bg-purple-200 text-purple-800 text-xs font-medium rounded mb-2">
                          Strategic Initiative
                        </span>
                      )}
                      <h4 className="font-semibold text-slate-900 mb-1">
                        {news.heading}
                      </h4>
                      {news.description && (
                        <p className="text-slate-600 text-sm mb-2">
                          {news.description}
                        </p>
                      )}
                    </div>
                    {news.date && (
                      <span className="text-slate-500 text-xs whitespace-nowrap ml-4">
                        {new Date(news.date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {news.url && (
                    <a
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-xs hover:underline flex items-center gap-1 mt-2"
                    >
                      Read more{" "}
                      <Icon icon="mingcute:external-link-line" width={14} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interview Insights */}
      {research.interviewInsights && (
        <div className="border border-slate-200 rounded-lg p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Icon
              icon="mingcute:lightbulb-line"
              width={24}
              className="text-blue-500"
            />
            <h3 className="text-xl font-semibold text-slate-900">
              Interview Process Insights
            </h3>
          </div>
          {research.interviewInsights.processOverview && (
            <div className="mb-6 p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
              <h4 className="font-semibold text-slate-900 mb-2">
                Process Overview
              </h4>
              <p className="text-slate-700">
                {research.interviewInsights.processOverview}
              </p>
            </div>
          )}
          {research.interviewInsights.commonQuestions &&
            research.interviewInsights.commonQuestions.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">
                  Common Interview Questions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {research.interviewInsights.commonQuestions
                    .slice(0, 10)
                    .map((q: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <p className="text-slate-700 text-sm">
                          {q.question || q}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          {research.interviewInsights.checklist && (
            <div className="mt-4">
              <h4 className="font-semibold text-slate-900 mb-3">
                Preparation Checklist
              </h4>
              <div className="space-y-2">
                {Array.isArray(research.interviewInsights.checklist) ? (
                  research.interviewInsights.checklist.map(
                    (item: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Icon
                          icon="mingcute:check-line"
                          width={20}
                          className="text-green-500 mt-0.5 flex-shrink-0"
                        />
                        <span className="text-slate-700">{item}</span>
                      </div>
                    )
                  )
                ) : (
                  <p className="text-slate-700">
                    {research.interviewInsights.checklist}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Talking Points */}
      {research.talkingPoints && research.talkingPoints.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-6 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="flex items-center gap-2 mb-4">
            <Icon
              icon="mingcute:chat-3-line"
              width={24}
              className="text-green-600"
            />
            <h3 className="text-xl font-semibold text-slate-900">
              Intelligent Talking Points
            </h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Use these points to demonstrate your knowledge and interest during
            the interview:
          </p>
          <div className="space-y-3">
            {research.talkingPoints.map((point: string, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200"
              >
                <Icon
                  icon="mingcute:message-2-line"
                  width={20}
                  className="text-green-600 mt-0.5 flex-shrink-0"
                />
                <p className="text-slate-700 flex-1">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions to Ask */}
      {research.questionsToAsk && research.questionsToAsk.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2 mb-4">
            <Icon
              icon="mingcute:question-answer-line"
              width={24}
              className="text-blue-600"
            />
            <h3 className="text-xl font-semibold text-slate-900">
              Intelligent Questions to Ask
            </h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            These thoughtful questions demonstrate your research and genuine
            interest:
          </p>
          <div className="space-y-3">
            {research.questionsToAsk.map((question: string, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 bg-white rounded-lg border border-blue-200 hover:shadow-md transition"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-semibold">
                    {idx + 1}
                  </span>
                </div>
                <p className="text-slate-700 flex-1 font-medium">{question}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Question Bank Tab Component (UC-075)
function QuestionBankTab({
  interview,
  jobOpportunity,
}: {
  interview: InterviewData | null;
  jobOpportunity: JobOpportunityData | null;
}) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (interview?.jobOpportunityId) {
      fetchQuestions();
    }
  }, [interview?.jobOpportunityId, selectedCategory]);

  const fetchQuestions = async () => {
    if (!interview.jobOpportunityId) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getQuestionBank(
        interview.jobOpportunityId,
        selectedCategory !== "all" ? selectedCategory : undefined
      );
      if (response.ok && response.data) {
        setQuestions(response.data.questionBank.questions || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch questions:", err);
      setError(err.message || "Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!interview?.jobOpportunityId) return;
    try {
      setIsGenerating(true);
      setError(null);
      const response = await api.generateQuestionBank(
        interview.jobOpportunityId,
        interview?.title,
        jobOpportunity?.industry
      );
      if (response.ok) {
        await fetchQuestions();
      }
    } catch (err: any) {
      console.error("Failed to generate questions:", err);
      setError(err.message || "Failed to generate question bank");
    } finally {
      setIsGenerating(false);
    }
  };

  const categories = [
    "all",
    "behavioral",
    "technical",
    "situational",
    "culture",
    "other",
  ];

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Icon
          icon="mingcute:loading-line"
          width={48}
          className="animate-spin mx-auto text-blue-500 mb-4"
        />
        <p className="text-slate-600">Loading question bank...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">
          Interview Question Bank
        </h2>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !interview?.jobOpportunityId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
        >
          <Icon icon="mingcute:add-line" width={20} />
          {isGenerating ? "Generating..." : "Generate Questions"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === cat
                ? "bg-blue-500 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="text-center py-12 border border-slate-200 rounded-lg">
          <Icon
            icon="mingcute:question-line"
            width={64}
            className="mx-auto text-slate-300 mb-4"
          />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            No Questions Available
          </h3>
          <p className="text-slate-600 mb-6">
            Generate a question bank to start practicing your interview
            responses.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !interview?.jobOpportunityId}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Question Bank"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {q.category || "other"}
                    </span>
                    {q.difficultyLevel && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                        {q.difficultyLevel}
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">
                    {q.questionText}
                  </h4>
                  {q.starFrameworkGuidance && (
                    <div className="bg-slate-50 border-l-4 border-blue-500 pl-4 py-2 rounded">
                      <p className="text-sm text-slate-700">
                        <strong>STAR Guidance:</strong>{" "}
                        {q.starFrameworkGuidance}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Response Coaching Tab Component (UC-076)
function ResponseCoachingTab({
  interview,
  jobOpportunity,
}: {
  interview: InterviewData | null;
  jobOpportunity: JobOpportunityData | null;
}) {
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [responseText, setResponseText] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [responseHistory, setResponseHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (interview?.jobOpportunityId) {
      fetchQuestions();
      fetchResponseHistory();
    }
  }, [interview?.jobOpportunityId]);

  const fetchQuestions = async () => {
    if (!interview.jobOpportunityId) return;
    try {
      const response = await api.getQuestionBank(interview.jobOpportunityId);
      if (response.ok && response.data) {
        setQuestions(response.data.questionBank.questions || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch questions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResponseHistory = async () => {
    try {
      const response = await api.getResponseHistory(interview?.id);
      if (response.ok && response.data) {
        setResponseHistory(response.data.responses || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch response history:", err);
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedQuestion || !responseText.trim()) return;
    try {
      setIsSubmitting(true);
      const response = await api.submitInterviewResponse(
        selectedQuestion.id,
        responseText,
        interview?.id,
        undefined,
        interview?.jobOpportunityId
      );
      if (response.ok && response.data) {
        setFeedback(response.data.feedback);
        setResponseText("");
        await fetchResponseHistory();
      }
    } catch (err: any) {
      console.error("Failed to submit response:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Icon
          icon="mingcute:loading-line"
          width={48}
          className="animate-spin mx-auto text-blue-500 mb-4"
        />
        <p className="text-slate-600">Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Question Selection and Response Writing */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 mb-4">
            Select a Question
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {questions.length === 0 ? (
              <p className="text-slate-600 text-center py-8">
                No questions available. Generate a question bank first.
              </p>
            ) : (
              questions.map((q, idx) => (
                <button
                  key={q.id || idx}
                  onClick={() => {
                    setSelectedQuestion(q);
                    setFeedback(null);
                    setResponseText("");
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition ${
                    selectedQuestion?.id === q.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                      {q.category}
                    </span>
                  </div>
                  <p className="font-medium text-slate-900">{q.questionText}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {selectedQuestion && (
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              Write Your Response
            </h3>
            <div className="border border-slate-200 rounded-lg p-4 mb-4 bg-slate-50">
              <p className="text-slate-900 font-medium mb-2">
                {selectedQuestion.questionText}
              </p>
              {selectedQuestion.starFrameworkGuidance && (
                <p className="text-sm text-slate-600">
                  {selectedQuestion.starFrameworkGuidance}
                </p>
              )}
            </div>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Write your response here... Use the STAR method for behavioral questions."
              className="w-full h-48 p-4 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSubmitResponse}
              disabled={!responseText.trim() || isSubmitting}
              className="mt-4 w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              {isSubmitting ? "Analyzing..." : "Get AI Feedback"}
            </button>
          </div>
        )}
      </div>

      {/* Right: Feedback Display */}
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-4">
          AI Feedback
        </h3>
        {feedback ? (
          <div className="space-y-4">
            {/* Scores */}
            {feedback.scores && (
              <div className="border border-slate-200 rounded-lg p-6">
                <h4 className="font-semibold text-slate-900 mb-4">Scores</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(feedback.scores).map(
                    ([key, value]: [string, any]) => (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600 capitalize">
                            {key}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {value}/100
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
                {feedback.starScore !== null &&
                  feedback.starScore !== undefined && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-600">
                          STAR Method Adherence
                        </span>
                        <span className="font-semibold text-slate-900">
                          {feedback.starScore}/100
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${feedback.starScore}%` }}
                        />
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* AI Feedback */}
            {feedback.aiFeedback && (
              <div className="border border-slate-200 rounded-lg p-6">
                <h4 className="font-semibold text-slate-900 mb-4">
                  Detailed Feedback
                </h4>
                {feedback.aiFeedback.content && (
                  <div className="mb-4">
                    <h5 className="font-medium text-slate-900 mb-2">Content</h5>
                    <p className="text-slate-700 text-sm">
                      {feedback.aiFeedback.content}
                    </p>
                  </div>
                )}
                {feedback.aiFeedback.structure && (
                  <div className="mb-4">
                    <h5 className="font-medium text-slate-900 mb-2">
                      Structure
                    </h5>
                    <p className="text-slate-700 text-sm">
                      {feedback.aiFeedback.structure}
                    </p>
                  </div>
                )}
                {feedback.aiFeedback.strengths &&
                  feedback.aiFeedback.strengths.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-green-700 mb-2">
                        Strengths
                      </h5>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm">
                        {feedback.aiFeedback.strengths.map(
                          (s: string, idx: number) => (
                            <li key={idx}>{s}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                {feedback.aiFeedback.weaknesses &&
                  feedback.aiFeedback.weaknesses.length > 0 && (
                    <div>
                      <h5 className="font-medium text-red-700 mb-2">
                        Areas for Improvement
                      </h5>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm">
                        {feedback.aiFeedback.weaknesses.map(
                          (w: string, idx: number) => (
                            <li key={idx}>{w}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {/* Improvement Suggestions */}
            {feedback.improvementSuggestions &&
              feedback.improvementSuggestions.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-6">
                  <h4 className="font-semibold text-slate-900 mb-4">
                    Improvement Suggestions
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-slate-700">
                    {feedback.improvementSuggestions.map(
                      (s: string, idx: number) => (
                        <li key={idx}>{s}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg p-12 text-center">
            <Icon
              icon="mingcute:chat-line"
              width={64}
              className="mx-auto text-slate-300 mb-4"
            />
            <p className="text-slate-600">
              Select a question and write a response to receive AI feedback.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Mock Interview Tab Component (UC-077) - Chat Style
function MockInterviewTab({
  interview,
  jobOpportunity,
}: {
  interview: InterviewData | null;
  jobOpportunity: JobOpportunityData | null;
}) {
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [performanceSummary, setPerformanceSummary] = useState<any>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessionHistory();
  }, []);

  useEffect(() => {
    if (session?.id && messages.length === 0) {
      // Only fetch messages if we don't already have them (e.g., from session creation)
      // Add a small delay to ensure the session is fully created on the backend
      const timer = setTimeout(() => {
        fetchMessages();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [session?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchSessionHistory = async () => {
    try {
      const response = await api.getMockInterviewHistory(20, 0);
      if (response.ok && response.data) {
        setSessionHistory(response.data.sessions || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch session history:", err);
    }
  };

  const fetchMessages = async () => {
    if (!session?.id) return;
    try {
      const response = await api.getMockInterviewMessages(session.id);
      if (response.ok && response.data) {
        const fetchedMessages = response.data.messages || [];
        setMessages(fetchedMessages);
        // If no messages yet, the greeting should be there - if not, it might still be generating
        if (fetchedMessages.length === 0) {
          // Wait a moment and try again in case the greeting is still being saved
          setTimeout(() => {
            api
              .getMockInterviewMessages(session.id)
              .then((retryResponse) => {
                if (
                  retryResponse.ok &&
                  retryResponse.data?.messages?.length > 0
                ) {
                  setMessages(retryResponse.data.messages);
                }
              })
              .catch((err) => {
                console.error("Retry fetch messages failed:", err);
              });
          }, 500);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch messages:", err);
      // If 404, the route might not exist - log for debugging
      if (err.message?.includes("404") || err.message?.includes("Not Found")) {
        console.error(
          "Messages endpoint not found. Make sure backend server is running and route is registered."
        );
      }
    }
  };

  const handleCreateSession = async () => {
    try {
      setIsCreating(true);
      const response = await api.createMockInterviewSession(
        interview?.id,
        interview?.jobOpportunityId || undefined,
        interview?.title,
        interview?.company,
        "mixed"
      );
      if (response.ok && response.data) {
        const newSession = response.data.session;
        setSession(newSession);
        // Set messages from response if available
        if (newSession.messages && newSession.messages.length > 0) {
          setMessages(newSession.messages);
        } else {
          // If messages not in response, fetch them after session is set
          // Use a small delay to ensure the greeting message is saved
          setTimeout(async () => {
            try {
              const messagesResponse = await api.getMockInterviewMessages(
                newSession.id
              );
              if (messagesResponse.ok && messagesResponse.data) {
                setMessages(messagesResponse.data.messages || []);
              }
            } catch (fetchErr: any) {
              console.error("Failed to fetch initial messages:", fetchErr);
              // If fetch fails, the messages endpoint might not be available yet
              // The greeting should still be in the session response
            }
          }, 500);
        }
      }
    } catch (err: any) {
      console.error("Failed to create session:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!session || !inputMessage.trim() || isSending) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);

    // Add user message to UI immediately
    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await api.submitMockInterviewChatMessage(
        session.id,
        userMessage
      );
      if (response.ok && response.data) {
        // Reload messages to get the full conversation
        await fetchMessages();
      }
    } catch (err: any) {
      console.error("Failed to send message:", err);
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!session) return;
    try {
      setIsCompleting(true);
      setIsGeneratingSummary(true);
      setShowPerformanceModal(true);
      
      const response = await api.completeMockInterviewSession(session.id);
      if (response.ok && response.data) {
        // Get the performance summary from the response
        const summary = response.data.performanceSummary;
        setPerformanceSummary(summary);
        
        await fetchSessionHistory();
        // Reload session to update status
        const sessionResponse = await api.getMockInterviewSession(session.id);
        if (sessionResponse.ok && sessionResponse.data) {
          setSession(sessionResponse.data.session);
          // Refresh messages to get updated conversation
          await fetchMessages();
        }
      }
    } catch (err: any) {
      console.error("Failed to complete session:", err);
      setShowPerformanceModal(false);
      setIsGeneratingSummary(false);
    } finally {
      setIsCompleting(false);
      setIsGeneratingSummary(false);
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      const response = await api.getMockInterviewSession(sessionId);
      if (response.ok && response.data) {
        setSession(response.data.session);
        setMessages(response.data.session.messages || []);
        setShowHistory(false);
      }
    } catch (err: any) {
      console.error("Failed to load session:", err);
    }
  };

  if (!session) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 border border-slate-200 rounded-lg">
          <Icon
            icon="mingcute:chat-3-line"
            width={64}
            className="mx-auto text-slate-300 mb-4"
          />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Start Mock Interview
          </h3>
          <p className="text-slate-600 mb-6">
            Practice a conversational mock interview with AI. The interviewer
            will ask questions and provide feedback on your responses.
          </p>
          <button
            onClick={handleCreateSession}
            disabled={isCreating}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <Icon
                  icon="mingcute:loading-line"
                  width={20}
                  className="animate-spin"
                />
                Creating Session...
              </>
            ) : (
              <>
                <Icon icon="mingcute:chat-3-line" width={20} />
                Start Mock Interview
              </>
            )}
          </button>
        </div>

        {/* Session History */}
        {sessionHistory.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">
                Previous Sessions
              </h3>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showHistory ? "Hide" : "Show All"}
              </button>
            </div>
            <div className="space-y-3">
              {(showHistory ? sessionHistory : sessionHistory.slice(0, 5)).map(
                (s) => (
                  <div
                    key={s.id}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                    onClick={() => handleLoadSession(s.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {s.targetRole || "Mock Interview"}
                        </p>
                        <p className="text-sm text-slate-600">
                          {s.targetCompany || ""} • {s.interviewFormat}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">
                          {s.startedAt
                            ? new Date(s.startedAt).toLocaleDateString()
                            : ""}
                        </p>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            s.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const isCompleted = session.status === "completed";

  return (
    <div className="flex flex-col h-[calc(100vh-300px)] border border-slate-200 rounded-lg bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Mock Interview
          </h3>
          <p className="text-sm text-slate-600">
            {session.targetRole || "Interview"}{" "}
            {session.targetCompany ? `at ${session.targetCompany}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isCompleted && session.confidenceScore && (
            <div className="text-right">
              <p className="text-xs text-slate-600">Confidence Score</p>
              <p className="text-lg font-bold text-blue-600">
                {session.confidenceScore}/100
              </p>
            </div>
          )}
          {!isCompleted && (
            <button
              onClick={handleCompleteSession}
              disabled={isCompleting}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 text-sm"
            >
              {isCompleting ? "Completing..." : "End Interview"}
            </button>
          )}
          <button
            onClick={() => {
              setSession(null);
              setMessages([]);
            }}
            className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm"
          >
            <Icon icon="mingcute:close-line" width={20} />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <Icon
              icon="mingcute:chat-3-line"
              className="w-12 h-12 mx-auto mb-3 text-slate-400"
            />
            <p className="text-sm">Starting conversation...</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : message.messageType === "summary"
                  ? "bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200"
                  : "bg-slate-100 text-slate-900"
              }`}
            >
              {message.messageType === "summary" ? (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
              )}
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-lg p-3">
              <Icon
                icon="mingcute:loading-line"
                className="w-5 h-5 animate-spin text-blue-500"
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      {!isCompleted && (
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your response..."
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon icon="mingcute:send-plane-line" width={20} />
            </button>
          </form>
        </div>
      )}

      {isCompleted && (
        <div className="border-t border-slate-200 p-4 bg-slate-50 text-center text-sm text-slate-600">
          This interview session has been completed. Start a new session to
          practice again.
        </div>
      )}

      {/* Performance Summary Modal */}
      {showPerformanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                Interview Performance Evaluation
              </h2>
              <button
                onClick={() => {
                  setShowPerformanceModal(false);
                  setPerformanceSummary(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isGeneratingSummary ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Icon
                    icon="mingcute:loading-line"
                    width={48}
                    className="animate-spin text-blue-500 mb-4"
                  />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Evaluating Interview Performance
                  </h3>
                  <p className="text-slate-600">
                    Analyzing your responses and generating feedback...
                  </p>
                  <div className="w-full max-w-md mt-6 bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
                  </div>
                </div>
              ) : performanceSummary ? (
                <div className="space-y-6">
                  {/* Confidence Score */}
                  {performanceSummary.confidenceScore !== undefined && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-1">
                            Overall Confidence Score
                          </h3>
                          <p className="text-sm text-slate-600">
                            Based on your interview performance
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-5xl font-bold text-blue-600">
                            {performanceSummary.confidenceScore}
                          </div>
                          <div className="text-sm text-slate-600">/ 100</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Overall Assessment */}
                  {performanceSummary.summary?.overall && (
                    <div className="border border-slate-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">
                        Overall Assessment
                      </h3>
                      <p className="text-slate-700 leading-relaxed">
                        {performanceSummary.summary.overall}
                      </p>
                    </div>
                  )}

                  {/* Strengths */}
                  {performanceSummary.summary?.strengths?.length > 0 && (
                    <div className="border border-green-200 rounded-lg p-6 bg-green-50">
                      <div className="flex items-center gap-2 mb-4">
                        <Icon
                          icon="mingcute:check-circle-line"
                          width={24}
                          className="text-green-600"
                        />
                        <h3 className="text-lg font-semibold text-slate-900">
                          Strengths
                        </h3>
                      </div>
                      <ul className="space-y-2">
                        {performanceSummary.summary.strengths.map(
                          (strength: string, idx: number) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-slate-700"
                            >
                              <Icon
                                icon="mingcute:check-line"
                                width={20}
                                className="text-green-600 mt-0.5 flex-shrink-0"
                              />
                              <span>{strength}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Areas for Improvement */}
                  {performanceSummary.summary?.weaknesses?.length > 0 && (
                    <div className="border border-amber-200 rounded-lg p-6 bg-amber-50">
                      <div className="flex items-center gap-2 mb-4">
                        <Icon
                          icon="mingcute:alert-line"
                          width={24}
                          className="text-amber-600"
                        />
                        <h3 className="text-lg font-semibold text-slate-900">
                          Areas for Improvement
                        </h3>
                      </div>
                      <ul className="space-y-2">
                        {performanceSummary.summary.weaknesses.map(
                          (weakness: string, idx: number) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-slate-700"
                            >
                              <Icon
                                icon="mingcute:arrow-right-line"
                                width={20}
                                className="text-amber-600 mt-0.5 flex-shrink-0"
                              />
                              <span>{weakness}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Improvement Areas */}
                  {performanceSummary.improvementAreas?.length > 0 && (
                    <div className="border border-slate-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        Recommended Focus Areas
                      </h3>
                      <ul className="space-y-2">
                        {performanceSummary.improvementAreas.map(
                          (area: string, idx: number) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-slate-700"
                            >
                              <Icon
                                icon="mingcute:target-line"
                                width={20}
                                className="text-blue-600 mt-0.5 flex-shrink-0"
                              />
                              <span>{area}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Pacing Recommendations */}
                  {performanceSummary.pacingRecommendations && (
                    <div className="border border-purple-200 rounded-lg p-6 bg-purple-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon
                          icon="mingcute:time-line"
                          width={24}
                          className="text-purple-600"
                        />
                        <h3 className="text-lg font-semibold text-slate-900">
                          Pacing Recommendations
                        </h3>
                      </div>
                      <p className="text-slate-700">
                        {performanceSummary.pacingRecommendations}
                      </p>
                    </div>
                  )}

                  {/* STAR Framework */}
                  {performanceSummary.starFrameworkAdherence && (
                    <div className="border border-slate-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">
                        STAR Framework Assessment
                      </h3>
                      <p className="text-slate-700">
                        {performanceSummary.starFrameworkAdherence}
                      </p>
                    </div>
                  )}

                  {/* Response Quality Scores */}
                  {performanceSummary.responseQuality && (
                    <div className="border border-slate-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        Response Quality Scores
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 mb-1">
                            {performanceSummary.responseQuality.relevance}
                          </div>
                          <div className="text-sm text-slate-600">Relevance</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600 mb-1">
                            {performanceSummary.responseQuality.specificity}
                          </div>
                          <div className="text-sm text-slate-600">Specificity</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600 mb-1">
                            {performanceSummary.responseQuality.impact}
                          </div>
                          <div className="text-sm text-slate-600">Impact</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confidence Building */}
                  {performanceSummary.confidenceBuilding && (
                    <div className="border border-green-200 rounded-lg p-6 bg-gradient-to-br from-green-50 to-emerald-50">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        Confidence Building
                      </h3>
                      {performanceSummary.confidenceBuilding.exercises?.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-slate-800 mb-2">
                            Recommended Exercises
                          </h4>
                          <ul className="space-y-2">
                            {performanceSummary.confidenceBuilding.exercises.map(
                              (exercise: string, idx: number) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-slate-700"
                                >
                                  <Icon
                                    icon="mingcute:exercise-line"
                                    width={20}
                                    className="text-green-600 mt-0.5 flex-shrink-0"
                                  />
                                  <span>{exercise}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                      {performanceSummary.confidenceBuilding.techniques?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-slate-800 mb-2">
                            Techniques to Try
                          </h4>
                          <ul className="space-y-2">
                            {performanceSummary.confidenceBuilding.techniques.map(
                              (technique: string, idx: number) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-slate-700"
                                >
                                  <Icon
                                    icon="mingcute:lightbulb-line"
                                    width={20}
                                    className="text-green-600 mt-0.5 flex-shrink-0"
                                  />
                                  <span>{technique}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full Summary (Markdown) */}
                  {performanceSummary.formattedText && (
                    <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        Detailed Summary
                      </h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {performanceSummary.formattedText}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPerformanceModal(false);
                  setPerformanceSummary(null);
                }}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Technical Prep Tab Component (UC-078)
function TechnicalPrepTab({
  interview,
  jobOpportunity,
}: {
  interview: InterviewData | null;
  jobOpportunity: JobOpportunityData | null;
}) {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [solution, setSolution] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeView, setActiveView] = useState<"problem" | "solution">(
    "problem"
  );
  const [attemptHistory, setAttemptHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    fetchChallenges();
    fetchProgress();
  }, [interview?.id, interview?.jobOpportunityId]);

  // Timer for tracking time spent on challenge
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (showModal && selectedChallenge && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showModal, selectedChallenge, startTime]);

  const fetchChallenges = async () => {
    try {
      setIsLoading(true);
      const response = await api.getTechnicalPrep(
        interview?.id,
        interview?.jobOpportunityId || undefined
      );
      if (response.ok && response.data) {
        setChallenges(response.data.challenges || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch challenges:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await api.getTechnicalProgress();
      if (response.ok && response.data) {
        setProgress(response.data.progress);
      }
    } catch (err: any) {
      console.error("Failed to fetch progress:", err);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const response = await api.generateTechnicalPrep(
        interview?.id,
        interview?.jobOpportunityId || undefined
      );
      if (response.ok) {
        await fetchChallenges();
      }
    } catch (err: any) {
      console.error("Failed to generate challenges:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!selectedChallenge || !solution.trim() || !startTime) return;
    try {
      setIsSubmitting(true);
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const response = await api.submitTechnicalSolution(
        selectedChallenge.id,
        solution,
        timeTaken
      );
      if (response.ok && response.data) {
        setFeedback(response.data.feedback);
        // Refresh attempt history and progress after submission
        const historyResponse = await api.getChallengeAttemptHistory(
          selectedChallenge.id
        );
        if (historyResponse.ok && historyResponse.data) {
          setAttemptHistory(historyResponse.data.attempts || []);
        }
        await fetchProgress();
      }
    } catch (err: any) {
      console.error("Failed to submit solution:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Icon
          icon="mingcute:loading-line"
          width={48}
          className="animate-spin mx-auto text-blue-500 mb-4"
        />
        <p className="text-slate-600">Loading technical prep...</p>
      </div>
    );
  }

  const handleOpenChallenge = async (challenge: any) => {
    setSelectedChallenge(challenge);
    setSolution("");
    setFeedback(null);
    setActiveView("problem");
    setShowModal(true);
    setStartTime(Date.now());
    setElapsedTime(0);

    // Fetch attempt history for this challenge
    try {
      setIsLoadingHistory(true);
      const response = await api.getChallengeAttemptHistory(challenge.id);
      if (response.ok && response.data) {
        setAttemptHistory(response.data.attempts || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch attempt history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedChallenge(null);
    setSolution("");
    setFeedback(null);
    setStartTime(null);
    setElapsedTime(0);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Progress Overview */}
        {progress && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Your Progress
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {progress.totalAttempts || 0}
                </div>
                <div className="text-sm text-slate-600">Total Attempts</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {progress.averageScore
                    ? Math.round(progress.averageScore)
                    : 0}
                </div>
                <div className="text-sm text-slate-600">Avg Score</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {progress.uniqueChallenges || 0}
                </div>
                <div className="text-sm text-slate-600">Challenges Solved</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <div className="text-sm font-semibold text-amber-700 mb-1">
                  {progress.lastAttemptDate
                    ? new Date(progress.lastAttemptDate).toLocaleDateString()
                    : "Never"}
                </div>
                <div className="text-sm text-slate-600">Last Attempt</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            Technical Challenges
          </h3>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            <Icon icon="mingcute:add-line" width={20} />
            {isGenerating ? "Generating..." : "Generate Prep"}
          </button>
        </div>

        {challenges.length === 0 ? (
          <div className="text-center py-12 border border-slate-200 rounded-lg">
            <Icon
              icon="mingcute:code-line"
              width={64}
              className="mx-auto text-slate-300 mb-4"
            />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">
              No Challenges Available
            </h4>
            <p className="text-slate-600 mb-6">
              Generate technical interview preparation challenges based on your
              role.
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate Technical Prep"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                onClick={() => handleOpenChallenge(challenge)}
                className="border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all bg-white"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    {challenge.type}
                  </span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                    {challenge.difficulty}
                  </span>
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">
                  {challenge.title}
                </h4>
                <p className="text-sm text-slate-600 line-clamp-2">
                  {challenge.description}
                </p>
                <div className="mt-3 flex items-center gap-2 text-blue-600 text-sm font-medium">
                  <span>Start Solving</span>
                  <Icon icon="mingcute:arrow-right-line" width={16} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LeetCode-Style Modal */}
      {showModal && selectedChallenge && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[110] flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedChallenge.title}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    {selectedChallenge.type}
                  </span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                    {selectedChallenge.difficulty}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <Icon
                  icon="mingcute:close-line"
                  width={24}
                  className="text-slate-600"
                />
              </button>
            </div>

            {/* Main Content - Split View */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Problem Description */}
              <div className="w-1/2 border-r border-slate-200 overflow-y-auto p-6 bg-slate-50">
                <div className="space-y-6">
                  {/* Problem Statement */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                      Problem Statement
                    </h3>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedChallenge.questionText}
                      </p>
                    </div>
                  </div>

                  {/* Solution Framework */}
                  {selectedChallenge.solutionFramework && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">
                        Solution Framework
                      </h3>
                      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                        <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                          {selectedChallenge.solutionFramework}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Best Practices */}
                  {selectedChallenge.bestPractices && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">
                        Best Practices
                      </h3>
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                          {selectedChallenge.bestPractices}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Real World Scenario */}
                  {selectedChallenge.realWorldScenario && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">
                        Real-World Context
                      </h3>
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                          {selectedChallenge.realWorldScenario}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Attempt History */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                      Your Attempts ({attemptHistory.length})
                    </h3>
                    {isLoadingHistory ? (
                      <div className="text-center py-4">
                        <Icon
                          icon="mingcute:loading-line"
                          width={24}
                          className="animate-spin mx-auto text-blue-500"
                        />
                      </div>
                    ) : attemptHistory.length === 0 ? (
                      <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                        <p className="text-slate-600 text-sm">
                          No previous attempts. Submit a solution to track your
                          progress!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {attemptHistory.map((attempt, idx) => (
                          <div
                            key={attempt.id || idx}
                            className="bg-white rounded-lg p-4 border border-slate-200 hover:border-blue-300 transition"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-500">
                                  Attempt #{attemptHistory.length - idx}
                                </span>
                                {attempt.completedAt && (
                                  <span className="text-xs text-slate-500">
                                    {new Date(
                                      attempt.completedAt
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {attempt.performanceScore !== null && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-600">
                                    Score:
                                  </span>
                                  <span
                                    className={`text-lg font-bold ${
                                      attempt.performanceScore >= 80
                                        ? "text-green-600"
                                        : attempt.performanceScore >= 60
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {attempt.performanceScore}/100
                                  </span>
                                </div>
                              )}
                            </div>
                            {attempt.timeTakenSeconds && (
                              <div className="text-xs text-slate-500 mb-2">
                                Time:{" "}
                                {Math.floor(attempt.timeTakenSeconds / 60)}m{" "}
                                {attempt.timeTakenSeconds % 60}s
                              </div>
                            )}
                            {attempt.feedback && (
                              <p className="text-xs text-slate-600 line-clamp-2">
                                {attempt.feedback}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Code Editor */}
              <div className="w-1/2 flex flex-col bg-white">
                {/* Editor Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveView("problem")}
                      className={`px-3 py-1 rounded text-sm font-medium transition ${
                        activeView === "problem"
                          ? "bg-blue-500 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Problem
                    </button>
                    <button
                      onClick={() => setActiveView("solution")}
                      className={`px-3 py-1 rounded text-sm font-medium transition ${
                        activeView === "solution"
                          ? "bg-blue-500 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Solution
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {elapsedTime > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                        <Icon icon="mingcute:time-line" width={16} />
                        <span>
                          {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
                        </span>
                      </div>
                    )}
                    {selectedChallenge.isTimed &&
                      selectedChallenge.timeLimitMinutes && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded text-sm">
                          <Icon icon="mingcute:time-line" width={16} />
                          <span>
                            Limit: {selectedChallenge.timeLimitMinutes} min
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Code Editor */}
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 p-4">
                    <textarea
                      value={solution}
                      onChange={(e) => setSolution(e.target.value)}
                      placeholder={`// Write your solution here...\n// Use proper syntax and formatting\n\nfunction solve() {\n  // Your code here\n  return null;\n}`}
                      className="w-full h-full p-4 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-slate-900 text-slate-100 leading-relaxed"
                      style={{
                        fontFamily:
                          "'Fira Code', 'Consolas', 'Monaco', monospace",
                        tabSize: 2,
                      }}
                      spellCheck={false}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSubmitSolution}
                        disabled={!solution.trim() || isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        <Icon icon="mingcute:check-line" width={18} />
                        {isSubmitting ? "Analyzing..." : "Submit Solution"}
                      </button>
                      <button
                        onClick={() => setSolution("")}
                        disabled={!solution.trim()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Icon icon="mingcute:refresh-line" width={18} />
                        Clear
                      </button>
                      <div className="flex-1" />
                      <div className="text-sm text-slate-600">
                        {solution.length} characters
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback Section */}
                {feedback && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-900">Feedback</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Score:</span>
                        <span className="text-xl font-bold text-blue-600">
                          {feedback.score}/100
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          feedback.score >= 80
                            ? "bg-green-500"
                            : feedback.score >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${feedback.score}%` }}
                      />
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                        {feedback.feedback}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
