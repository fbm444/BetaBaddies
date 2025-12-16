import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Editor from "@monaco-editor/react";
import { api } from "../services/api";
import type { InterviewData, JobOpportunityData } from "../types";
import { CompanyResearchPreviewModal } from "../components/interviewPrep/CompanyResearchPreviewModal";
import { CompanyResearchExportModal } from "../components/interviewPrep/CompanyResearchExportModal";
import type { ExportFormat } from "../components/interviewPrep/CompanyResearchExportModal";

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
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabType | null>(null);

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

  // Listen for tab switch events from question detail modal
  useEffect(() => {}, [interviewId, navigate]);

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
      const response = await api.getJobOpportunity(interview.jobOpportunityId);
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

  const handleGeneralPrepClick = (tab: TabType) => {
    if (interviews.length === 0) {
      alert("Please schedule an interview first to use preparation tools.");
      return;
    }
    setPendingTab(tab);
    setShowInterviewModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            width={48}
            className="animate-spin mx-auto text-blue-700 mb-4"
          />
          <p className="text-slate-600">Loading interview preparation...</p>
        </div>
      </div>
    );
  }

  // Show interview selector if no interview is selected
  if (
    (showInterviewSelector || (!interview && !interviewId)) &&
    !showInterviewModal
  ) {
    return (
      <div className="min-h-screen bg-white font-poppins">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Interview Preparation
            </h1>
            <p className="text-slate-600 mb-6">
              Select an interview to prepare for, or use general preparation
              tools.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interview Selection */}
            <div className="bg-white rounded-xl border border-slate-300 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Select an Interview
              </h2>
              <p className="text-slate-600 mb-6">
                Choose a scheduled interview to access personalized preparation tools and company-specific insights.
              </p>
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
                    className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition"
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
                      className="w-full text-left p-4 border border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
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
            <div className="bg-white rounded-xl border border-slate-300 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Preparation Tools
              </h2>
              <p className="text-slate-600 mb-6">
                Select a tool to begin. You'll be prompted to choose an
                interview.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleGeneralPrepClick("questions")}
                  className="w-full text-left p-4 border border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      icon="mingcute:question-line"
                      width={24}
                      className="text-blue-700"
                    />
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Question Bank
                      </h3>
                      <p className="text-sm text-slate-600">
                        Practice with role-specific interview questions
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleGeneralPrepClick("mock")}
                  className="w-full text-left p-4 border border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      icon="mingcute:video-line"
                      width={24}
                      className="text-blue-700"
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
                  onClick={() => handleGeneralPrepClick("technical")}
                  className="w-full text-left p-4 border border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      icon="mingcute:code-line"
                      width={24}
                      className="text-blue-700"
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

  // Interview Selection Modal
  if (showInterviewModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[110] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-300 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              Select an Interview
            </h2>
            <button
              onClick={() => {
                setShowInterviewModal(false);
                setPendingTab(null);
              }}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <Icon icon="mingcute:close-line" width={24} />
            </button>
          </div>

          <div className="p-6">
            <p className="text-slate-600 mb-6">
              Please select an interview to access{" "}
              {pendingTab === "questions"
                ? "Question Bank"
                : pendingTab === "mock"
                ? "Mock Interview"
                : "Technical Prep"}
              .
            </p>

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
                  className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition"
                >
                  Schedule an Interview
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {interviews.map((int) => (
                  <button
                    key={int.id}
                    onClick={() => {
                      handleSelectInterview(int);
                      setShowInterviewModal(false);
                      setPendingTab(null);
                      if (pendingTab) {
                        setActiveTab(pendingTab);
                      }
                    }}
                    className="w-full text-left p-4 border border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {int.title}
                        </h3>
                        <p className="text-sm text-slate-600">{int.company}</p>
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
        </div>
      </div>
    );
  }

  if (error && interviewId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center border border-slate-300">
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
            className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition"
          >
            Back to Preparation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-poppins">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Interview Preparation
          </h1>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex-1">
              {interview ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full">
                    <Icon icon="mingcute:building-line" width={18} />
                    <span className="font-medium text-sm">
                      {interview.company}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-full">
                    <Icon icon="mingcute:briefcase-line" width={18} />
                    <span className="text-sm">{interview.title}</span>
                  </div>
                  {interview.scheduledAt && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full">
                      <Icon icon="mingcute:calendar-line" width={18} />
                      <span className="text-sm">
                        {new Date(interview.scheduledAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-600">
                  Get personalized interview tips, insights, and preparation guides organized by company. This information is cached and saved for quick access.
                </p>
              )}
            </div>
            {interview && (
              <button
                onClick={() => {
                  setShowInterviewSelector(true);
                  setInterview(null);
                  navigate("/interview-preparation", { replace: true });
                }}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition font-medium whitespace-nowrap bg-transparent hover:bg-transparent border-none p-0"
              >
                <Icon icon="mingcute:arrow-left-line" width={18} className="text-blue-600" />
                <span className="hidden sm:inline">Change Interview</span>
              </button>
            )}
          </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-8">
          <div 
            role="tablist" 
            aria-label="Interview preparation tabs"
            className="flex gap-1 overflow-x-auto scrollbar-hide"
            onKeyDown={(e) => {
              const tabs = Array.from(e.currentTarget.querySelectorAll('button[role="tab"]')) as HTMLButtonElement[]
              const currentIndex = tabs.findIndex(tab => tab === document.activeElement)
              
              if (e.key === 'ArrowRight') {
                e.preventDefault()
                const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
                tabs[nextIndex]?.focus()
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
                tabs[prevIndex]?.focus()
              } else if (e.key === 'Home') {
                e.preventDefault()
                tabs[0]?.focus()
              } else if (e.key === 'End') {
                e.preventDefault()
                tabs[tabs.length - 1]?.focus()
              }
            }}
          >
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
                  icon: "mingcute:chat-3-line",
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
              ].map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  onClick={() => {
                    setActiveTab(tab.id);
                    navigate(`?tab=${tab.id}`, { replace: true });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setActiveTab(tab.id);
                      navigate(`?tab=${tab.id}`, { replace: true });
                    }
                  }}
                  className={`px-6 py-3 font-medium text-sm whitespace-nowrap flex items-center gap-2 flex-shrink-0 min-w-fit bg-transparent hover:bg-transparent focus:bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 ${
                    activeTab === tab.id
                      ? "text-blue-700 border-b-2 border-blue-500"
                      : "text-slate-600"
                  }`}
                  style={{
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderRadius: '0'
                  }}
                >
                  <Icon icon={tab.icon} width={18} height={18} className="flex-shrink-0" style={{ minWidth: '18px', minHeight: '18px' }} />
                  <span className="flex-shrink-0 hidden sm:inline">{tab.label}</span>
                  <span className="flex-shrink-0 sm:hidden">{tab.label.split(" ")[0]}</span>
                </button>
              ))}
          </div>
        </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8 bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10 rounded-t-2xl">
          <div className="bg-white rounded-xl border border-slate-300 p-6">
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
                className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition inline-flex items-center gap-2"
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
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
        const researchData = response.data.research;
        setResearch(researchData);

        // If AI content is marked as loading, fetch it separately
        if (researchData.aiContentLoading) {
          fetchAIContent();
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch research:", err);
      setError(err.message || "Failed to load company research");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAIContent = async () => {
    if (!interview?.id) return;
    try {
      setIsLoadingAI(true);
      const response = await api.getInterviewCompanyResearchAIContent(
        interview.id
      );
      if (response.ok && response.data) {
        const aiContent = response.data.aiContent;
        setResearch((prev: any) => ({
          ...prev,
          competitiveLandscape: aiContent.competitiveLandscape,
          talkingPoints: aiContent.talkingPoints,
          questionsToAsk: aiContent.questionsToAsk,
          aiContentLoading: false,
        }));
      }
    } catch (err: any) {
      console.error("Failed to fetch AI content:", err);
      // Don't show error to user, just mark as not loading
      setResearch((prev: any) => ({
        ...prev,
        aiContentLoading: false,
      }));
    } finally {
      setIsLoadingAI(false);
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
        // Also fetch AI content after generating research
        await fetchAIContent();
      }
    } catch (err: any) {
      console.error("Failed to generate research:", err);
      setError(err.message || "Failed to generate company research");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportClick = () => {
    // Show preview modal first
    setShowPreviewModal(true);
  };

  const handleExportFromPreview = (format: "pdf" | "docx" | "txt" | "html") => {
    // For PDF, we need the preview element, so keep preview modal open
    // For other formats, close preview and open export modal
    if (format === "pdf") {
      // Keep preview modal open, just trigger export directly
      handleExport({
        format: "pdf",
        filename: `company-research-${interview?.company || "research"}`,
      });
    } else {
      // For other formats, trigger export directly (they use backend)
      handleExport({
        format: format,
        filename: `company-research-${interview?.company || "research"}`,
      });
    }
  };

  const handleExport = async (options: {
    format: ExportFormat;
    filename: string;
  }) => {
    if (!interview?.id || !research) return;

    try {
      setIsExporting(true);

      const format = options.format;
      const filename =
        options.filename ||
        `company-research-${interview.company || "research"}`;

      // For PDF - use pdfmake to generate from data (no image conversion)
      if (format === "pdf") {
        try {
          // Dynamically import pdfmake
          const pdfMakeModule = await import("pdfmake/build/pdfmake");
          const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
          const pdfMake = (pdfMakeModule as any).default || pdfMakeModule;

          // Set fonts
          if (pdfFontsModule && (pdfFontsModule as any).pdfMake) {
            pdfMake.vfs = (pdfFontsModule as any).pdfMake.vfs;
          } else if ((pdfFontsModule as any).default) {
            pdfMake.vfs =
              (pdfFontsModule as any).default.pdfMake?.vfs ||
              (pdfFontsModule as any).default;
          }

          // Create deep copies of data to prevent pdfmake from mutating React state
          const researchCopy = JSON.parse(JSON.stringify(research));
          const interviewCompany =
            interview?.company ||
            researchCopy?.companyInfo?.name ||
            "Company Research";
          const interviewTitle =
            interview?.title || jobOpportunity?.title || "";

          // Build PDF document definition from research data (using copies)
          const docDefinition: any = {
            pageSize: "A4",
            pageMargins: [40, 60, 40, 60],
            defaultStyle: {
              font: "Roboto",
              fontSize: 11,
              lineHeight: 1.4,
              color: "#1a1a1a",
            },
            styles: {
              header: {
                fontSize: 24,
                bold: true,
                color: "#1a1a1a",
                marginBottom: 10,
              },
              subheader: {
                fontSize: 18,
                bold: true,
                color: "#1a1a1a",
                marginTop: 20,
                marginBottom: 10,
              },
              sectionTitle: {
                fontSize: 16,
                bold: true,
                color: "#3b82f6",
                marginTop: 15,
                marginBottom: 8,
              },
              body: {
                fontSize: 11,
                color: "#334155",
                marginBottom: 5,
              },
              bullet: {
                fontSize: 11,
                color: "#334155",
                marginLeft: 10,
                marginBottom: 3,
              },
            },
            content: [
              // Header
              {
                text: interviewCompany,
                style: "header",
              },
              {
                text: interviewTitle,
                style: "body",
                fontSize: 14,
                marginBottom: 5,
              },
              {
                text: "Company Research for Interview Preparation",
                style: "body",
                fontSize: 10,
                color: "#64748b",
                marginBottom: 20,
              },
              { text: "", marginBottom: 10 },

              // Company Overview
              ...(researchCopy.companyInfo
                ? [
                    {
                      text: "Company Overview",
                      style: "sectionTitle",
                    },
                    ...(researchCopy.companyInfo.description
                      ? [
                          { text: "About", style: "subheader", fontSize: 14 },
                          {
                            text: researchCopy.companyInfo.description,
                            style: "body",
                            marginBottom: 10,
                          },
                        ]
                      : []),
                    ...(researchCopy.companyInfo.mission
                      ? [
                          {
                            text: "Mission & Values",
                            style: "subheader",
                            fontSize: 14,
                          },
                          {
                            text: researchCopy.companyInfo.mission,
                            style: "body",
                            marginBottom: 10,
                          },
                        ]
                      : []),
                    ...(researchCopy.companyInfo.values
                      ? [
                          {
                            text: "Core Values",
                            style: "subheader",
                            fontSize: 14,
                          },
                          {
                            ul: Array.isArray(researchCopy.companyInfo.values)
                              ? researchCopy.companyInfo.values
                              : [researchCopy.companyInfo.values],
                            style: "bullet",
                            marginBottom: 10,
                          },
                        ]
                      : []),
                    ...(researchCopy.companyInfo.culture
                      ? [
                          {
                            text: "Company Culture",
                            style: "subheader",
                            fontSize: 14,
                          },
                          {
                            text: researchCopy.companyInfo.culture,
                            style: "body",
                            marginBottom: 10,
                          },
                        ]
                      : []),
                  ]
                : []),

              // Leadership Team
              ...(researchCopy.interviewInsights?.interviewerProfiles?.length >
              0
                ? [
                    {
                      text: "Leadership Team & Potential Interviewers",
                      style: "sectionTitle",
                    },
                    {
                      columns:
                        researchCopy.interviewInsights.interviewerProfiles.map(
                          (profile: any) => ({
                            width: "auto",
                            stack: [
                              {
                                text: profile.name || profile.title || "",
                                bold: true,
                                marginBottom: 3,
                              },
                              ...(profile.role
                                ? [
                                    {
                                      text: profile.role,
                                      fontSize: 10,
                                      color: "#64748b",
                                      marginBottom: 2,
                                    },
                                  ]
                                : []),
                              ...(profile.background
                                ? [
                                    {
                                      text: profile.background,
                                      fontSize: 10,
                                      marginBottom: 5,
                                    },
                                  ]
                                : []),
                            ],
                            margin: [0, 0, 10, 10],
                          })
                        ),
                      columnGap: 10,
                      marginBottom: 15,
                    },
                  ]
                : []),

              // Competitive Landscape
              ...(researchCopy.competitiveLandscape
                ? [
                    {
                      text: "Competitive Landscape & Market Position",
                      style: "sectionTitle",
                    },
                    ...(typeof researchCopy.competitiveLandscape === "string"
                      ? [
                          {
                            text: researchCopy.competitiveLandscape,
                            style: "body",
                            marginBottom: 10,
                          },
                        ]
                      : [
                          ...(researchCopy.competitiveLandscape.marketPosition
                            ? [
                                {
                                  text: "Market Position",
                                  bold: true,
                                  marginBottom: 5,
                                },
                                {
                                  text:
                                    typeof researchCopy.competitiveLandscape
                                      .marketPosition === "string"
                                      ? researchCopy.competitiveLandscape
                                          .marketPosition
                                      : JSON.stringify(
                                          researchCopy.competitiveLandscape
                                            .marketPosition
                                        ),
                                  style: "body",
                                  marginBottom: 10,
                                },
                              ]
                            : []),
                          ...(researchCopy.competitiveLandscape.analysis
                            ? [
                                {
                                  text: "Market Analysis",
                                  bold: true,
                                  marginBottom: 5,
                                },
                                {
                                  text:
                                    typeof researchCopy.competitiveLandscape
                                      .analysis === "string"
                                      ? researchCopy.competitiveLandscape
                                          .analysis
                                      : typeof researchCopy.competitiveLandscape
                                          .analysis === "object"
                                      ? Object.entries(
                                          researchCopy.competitiveLandscape
                                            .analysis
                                        )
                                          .map(([k, v]) => `${k}: ${v}`)
                                          .join("\n")
                                      : JSON.stringify(
                                          researchCopy.competitiveLandscape
                                            .analysis
                                        ),
                                  style: "body",
                                  marginBottom: 10,
                                },
                              ]
                            : []),
                          ...(researchCopy.competitiveLandscape.strengths
                            ? [
                                {
                                  text: "Competitive Strengths",
                                  bold: true,
                                  marginBottom: 5,
                                },
                                {
                                  ul: Array.isArray(
                                    researchCopy.competitiveLandscape.strengths
                                  )
                                    ? researchCopy.competitiveLandscape.strengths.map(
                                        (s: any) =>
                                          typeof s === "string"
                                            ? s
                                            : JSON.stringify(s)
                                      )
                                    : [
                                        String(
                                          researchCopy.competitiveLandscape
                                            .strengths
                                        ),
                                      ],
                                  style: "bullet",
                                  marginBottom: 10,
                                },
                              ]
                            : []),
                          ...(researchCopy.competitiveLandscape.competitors
                            ? [
                                {
                                  text: "Key Competitors",
                                  bold: true,
                                  marginBottom: 5,
                                },
                                {
                                  ul: researchCopy.competitiveLandscape.competitors.map(
                                    (c: any) =>
                                      typeof c === "string"
                                        ? c
                                        : c.name || JSON.stringify(c)
                                  ),
                                  style: "bullet",
                                  marginBottom: 10,
                                },
                              ]
                            : []),
                        ]),
                  ]
                : []),

              // Recent News
              ...(researchCopy.news && researchCopy.news.length > 0
                ? [
                    {
                      text: "Recent News & Developments",
                      style: "sectionTitle",
                    },
                    ...researchCopy.news.map((article: any) => ({
                      stack: [
                        {
                          text: article.title || "",
                          bold: true,
                          marginBottom: 3,
                        },
                        ...(article.publishedAt
                          ? [
                              {
                                text: new Date(
                                  article.publishedAt
                                ).toLocaleDateString(),
                                fontSize: 9,
                                color: "#64748b",
                                marginBottom: 3,
                              },
                            ]
                          : []),
                        ...(article.description
                          ? [
                              {
                                text: article.description,
                                style: "body",
                                fontSize: 10,
                                marginBottom: 8,
                              },
                            ]
                          : []),
                      ],
                      marginBottom: 8,
                    })),
                  ]
                : []),

              // Talking Points
              ...(researchCopy.talkingPoints &&
              researchCopy.talkingPoints.length > 0
                ? [
                    {
                      text: "Key Talking Points",
                      style: "sectionTitle",
                    },
                    {
                      ul: researchCopy.talkingPoints,
                      style: "bullet",
                      marginBottom: 15,
                    },
                  ]
                : []),

              // Questions to Ask
              ...(researchCopy.questionsToAsk &&
              researchCopy.questionsToAsk.length > 0
                ? [
                    {
                      text: "Intelligent Questions to Ask",
                      style: "sectionTitle",
                    },
                    {
                      ul: researchCopy.questionsToAsk,
                      style: "bullet",
                      marginBottom: 15,
                    },
                  ]
                : []),

              // Interview Insights
              ...(researchCopy.interviewInsights?.preparationRecommendations
                ? [
                    {
                      text: "Interview Preparation Recommendations",
                      style: "sectionTitle",
                    },
                    {
                      ul: Array.isArray(
                        researchCopy.interviewInsights
                          .preparationRecommendations
                      )
                        ? researchCopy.interviewInsights
                            .preparationRecommendations
                        : [
                            researchCopy.interviewInsights
                              .preparationRecommendations,
                          ],
                      style: "bullet",
                      marginBottom: 15,
                    },
                  ]
                : []),
            ],
          };

          // Generate and download PDF
          pdfMake.createPdf(docDefinition).download(`${filename}.pdf`);
        } catch (err: any) {
          console.error("PDF export error:", err);
          // Ensure error message is a string, not an object
          const errorMessage =
            err?.message || err?.toString() || "Failed to export PDF";
          setError(
            typeof errorMessage === "string"
              ? errorMessage
              : "Failed to export PDF"
          );
        }
      } else if (format === "docx") {
        // For DOCX, use backend
        const response = await api.exportInterviewCompanyResearch(
          interview.id,
          "docx"
        );
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === "txt" || format === "html") {
        // For TXT and HTML, use backend with markdown format and convert
        const response = await api.exportInterviewCompanyResearch(
          interview.id,
          "markdown"
        );
        if (response.ok && response.data) {
          let content = response.data.report;
          let mimeType = "text/plain";
          let extension = "txt";

          if (format === "html") {
            // Convert markdown to HTML
            const ReactMarkdown = (await import("react-markdown")).default;
            const remarkGfm = (await import("remark-gfm")).default;
            // For now, just use markdown as HTML (you could use a markdown-to-html converter)
            content = `<html><head><title>${filename}</title></head><body><pre>${content}</pre></body></html>`;
            mimeType = "text/html";
            extension = "html";
          }

          const blob = new Blob([content], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${filename}.${extension}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    } catch (err: any) {
      console.error("Failed to export research:", err);
      // Ensure error message is a string, not an object
      const errorMessage =
        err?.message || err?.toString() || "Failed to export research";
      setError(
        typeof errorMessage === "string"
          ? errorMessage
          : "Failed to export research"
      );
    } finally {
      setIsExporting(false);
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
          className="animate-spin mx-auto text-blue-700 mb-4"
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
          className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
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
      <div className="flex items-center justify-between bg-white border border-slate-300 rounded-lg p-4">
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
        <div className="flex gap-2 items-center">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition disabled:opacity-50 bg-transparent hover:bg-transparent border-none p-0 cursor-pointer mr-4 font-medium"
            style={{ outline: 'none' }}
          >
            <Icon icon="mingcute:refresh-2-line" width={16} height={16} className="flex-shrink-0 inline-block text-blue-600" style={{ display: 'inline-block' }} />
            <span className="text-sm">{isGenerating ? "Generating..." : "Refresh Research"}</span>
          </button>
          <button
            onClick={handleExportClick}
            disabled={!research}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon icon="mingcute:download-line" width={20} />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Company Overview */}
      {research.companyInfo && (
        <div className="border border-slate-300 rounded-lg p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Icon
              icon="mingcute:building-2-line"
              width={24}
              className="text-blue-700"
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
          <div className="border border-slate-300 rounded-lg p-6 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <Icon
                icon="mingcute:user-3-line"
                width={24}
                className="text-blue-700"
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
                    className="border border-slate-300 rounded-lg p-4 hover:shadow-md transition"
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
      <div className="border border-slate-300 rounded-lg p-6 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Icon
            icon="mingcute:chart-line"
            width={24}
            className="text-blue-700"
          />
          <h3 className="text-xl font-semibold text-slate-900">
            Competitive Landscape & Market Position
          </h3>
        </div>
        {isLoadingAI || research.aiContentLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-sm text-slate-500">
                Generating competitive landscape analysis...
              </p>
            </div>
          </div>
        ) : research.competitiveLandscape ? (
          typeof research.competitiveLandscape === "string" ? (
            <p className="text-slate-700 leading-relaxed">
              {research.competitiveLandscape}
            </p>
          ) : (
            <div className="space-y-6">
              {/* Market Position - Primary field */}
              {research.competitiveLandscape.marketPosition && (
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Icon icon="mingcute:target-line" width={18} />
                    Market Position
                  </h4>
                  {typeof research.competitiveLandscape.marketPosition ===
                  "string" ? (
                    <p className="text-slate-700 leading-relaxed">
                      {research.competitiveLandscape.marketPosition}
                    </p>
                  ) : typeof research.competitiveLandscape.marketPosition ===
                      "object" &&
                    research.competitiveLandscape.marketPosition !== null ? (
                    <div className="space-y-3">
                      {Object.entries(
                        research.competitiveLandscape.marketPosition
                      ).map(([key, value]: [string, any]) => (
                        <div key={key}>
                          <span className="font-medium text-slate-800 capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}:{" "}
                          </span>
                          <span className="text-slate-700">
                            {typeof value === "string"
                              ? value
                              : Array.isArray(value)
                              ? value.join(", ")
                              : typeof value === "object"
                              ? Object.entries(value)
                                  .map(([k, v]: [string, any]) => `${k}: ${v}`)
                                  .join(", ")
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-700 leading-relaxed">
                      {String(research.competitiveLandscape.marketPosition)}
                    </p>
                  )}
                </div>
              )}

              {/* Market Analysis - Alternative field name */}
              {research.competitiveLandscape.analysis && (
                <div className="p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Icon icon="mingcute:analysis-line" width={18} />
                    Market Analysis
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    {typeof research.competitiveLandscape.analysis === "string"
                      ? research.competitiveLandscape.analysis
                      : typeof research.competitiveLandscape.analysis ===
                          "object" &&
                        research.competitiveLandscape.analysis !== null
                      ? Object.entries(
                          research.competitiveLandscape.analysis
                        ).map(([key, value]: [string, any]) => (
                          <div key={key} className="mb-2">
                            <span className="font-medium text-slate-800">
                              {key}:{" "}
                            </span>
                            <span className="text-slate-700">
                              {typeof value === "string"
                                ? value
                                : JSON.stringify(value)}
                            </span>
                          </div>
                        ))
                      : JSON.stringify(research.competitiveLandscape.analysis)}
                  </p>
                </div>
              )}

              {/* Competitive Strengths */}
              {research.competitiveLandscape.strengths && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Icon icon="mingcute:star-line" width={18} />
                    Competitive Strengths
                  </h4>
                  {Array.isArray(research.competitiveLandscape.strengths) ? (
                    <ul className="list-disc list-inside space-y-2 text-slate-700 ml-2">
                      {research.competitiveLandscape.strengths.map(
                        (strength: any, idx: number) => (
                          <li key={idx} className="leading-relaxed">
                            {typeof strength === "string"
                              ? strength
                              : JSON.stringify(strength)}
                          </li>
                        )
                      )}
                    </ul>
                  ) : typeof research.competitiveLandscape.strengths ===
                    "string" ? (
                    <p className="text-slate-700 leading-relaxed">
                      {research.competitiveLandscape.strengths}
                    </p>
                  ) : (
                    <p className="text-slate-700 leading-relaxed">
                      {JSON.stringify(research.competitiveLandscape.strengths)}
                    </p>
                  )}
                </div>
              )}

              {/* Market Share */}
              {research.competitiveLandscape.marketShare && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Icon icon="mingcute:pie-chart-line" width={18} />
                    Market Share
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    {typeof research.competitiveLandscape.marketShare ===
                    "string"
                      ? research.competitiveLandscape.marketShare
                      : JSON.stringify(
                          research.competitiveLandscape.marketShare
                        )}
                  </p>
                </div>
              )}

              {/* Key Competitors */}
              {research.competitiveLandscape.competitors &&
                (Array.isArray(research.competitiveLandscape.competitors) &&
                research.competitiveLandscape.competitors.length > 0 ? (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Icon icon="mingcute:users-line" width={18} />
                      Key Competitors
                    </h4>
                    <ul className="list-disc list-inside space-y-2 text-slate-700 ml-2">
                      {research.competitiveLandscape.competitors.map(
                        (competitor: any, idx: number) => (
                          <li key={idx} className="leading-relaxed">
                            {typeof competitor === "string"
                              ? competitor
                              : JSON.stringify(competitor)}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                ) : typeof research.competitiveLandscape.competitors ===
                  "string" ? (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Icon icon="mingcute:users-line" width={18} />
                      Key Competitors
                    </h4>
                    <p className="text-slate-700 leading-relaxed">
                      {research.competitiveLandscape.competitors}
                    </p>
                  </div>
                ) : null)}

              {/* Fallback: If no recognized fields, show all data */}
              {!research.competitiveLandscape.marketPosition &&
                !research.competitiveLandscape.analysis &&
                !research.competitiveLandscape.strengths &&
                !research.competitiveLandscape.marketShare &&
                (!research.competitiveLandscape.competitors ||
                  (Array.isArray(research.competitiveLandscape.competitors) &&
                    research.competitiveLandscape.competitors.length ===
                      0)) && (
                  <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                    <h4 className="font-semibold text-slate-900 mb-2">
                      Competitive Landscape
                    </h4>
                    <pre className="text-slate-700 text-sm whitespace-pre-wrap font-sans">
                      {JSON.stringify(research.competitiveLandscape, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          )
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Icon
              icon="mingcute:chart-line"
              width={48}
              className="mx-auto mb-2 text-slate-300"
            />
            <p>
              Click "Refresh Research" to generate competitive landscape
              analysis
            </p>
          </div>
        )}
      </div>

      {/* Recent News, Funding & Strategic Initiatives */}
      <div className="border border-slate-300 rounded-lg p-6 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Icon
            icon="mingcute:news-line"
            width={24}
            className="text-blue-700"
          />
          <h3 className="text-xl font-semibold text-slate-900">
            Recent News, Funding & Strategic Initiatives
          </h3>
        </div>
        {research.companyNews && research.companyNews.length > 0 ? (
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
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Icon
              icon="mingcute:news-line"
              width={48}
              className="mx-auto mb-2 text-slate-300"
            />
            <p>
              Click "Refresh Research" to compile recent news, funding
              announcements, and strategic initiatives
            </p>
          </div>
        )}
      </div>

      {/* Interview Insights */}
      {research.interviewInsights && (
        <div className="border border-slate-300 rounded-lg p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Icon
              icon="mingcute:lightbulb-line"
              width={24}
              className="text-blue-700"
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
                        className="p-3 bg-slate-50 rounded-lg border border-slate-300"
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
      <div className="border border-slate-300 rounded-lg p-6 bg-gradient-to-br from-green-50 to-emerald-50">
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
        {isLoadingAI || research.aiContentLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              <p className="text-sm text-slate-500">
                Generating intelligent talking points...
              </p>
            </div>
          </div>
        ) : research.talkingPoints && research.talkingPoints.length > 0 ? (
          <>
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
          </>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Icon
              icon="mingcute:chat-3-line"
              width={48}
              className="mx-auto mb-2 text-slate-300"
            />
            <p>
              Click "Refresh Research" to generate intelligent talking points
            </p>
          </div>
        )}
      </div>

      {/* Questions to Ask */}
      <div className="border border-slate-300 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
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
        {isLoadingAI || research.aiContentLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-sm text-slate-500">
                Generating intelligent questions...
              </p>
            </div>
          </div>
        ) : research.questionsToAsk && research.questionsToAsk.length > 0 ? (
          <>
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
                  <p className="text-slate-700 flex-1 font-medium">
                    {question}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Icon
              icon="mingcute:question-answer-line"
              width={48}
              className="mx-auto mb-2 text-slate-300"
            />
            <p>
              Click "Refresh Research" to generate intelligent questions to ask
            </p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <CompanyResearchPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        research={research}
        companyName={interview?.company || ""}
        jobTitle={interview?.title || ""}
        onExport={handleExportFromPreview}
        onShowAdvancedExport={() => {
          setShowPreviewModal(false);
          setTimeout(() => {
            setShowExportModal(true);
          }, 150);
        }}
        isExporting={isExporting}
      />

      {/* Export Modal */}
      <CompanyResearchExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        defaultFilename={`company-research-${interview?.company || "research"}`}
        isExporting={isExporting}
      />
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
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [categoryDifficulty, setCategoryDifficulty] = useState<string>("all"); // Difficulty within selected category
  const [error, setError] = useState<string | null>(null);

  // Detect role seniority level from job title and description
  const detectRoleSeniority = (
    roleTitle: string | null | undefined,
    jobDescription: string | null | undefined
  ): "entry" | "mid" | "senior" | null => {
    if (!roleTitle && !jobDescription) return null;

    const text = `${roleTitle || ""} ${jobDescription || ""}`.toLowerCase();

    // Senior level indicators
    const seniorIndicators = [
      "senior",
      "lead",
      "principal",
      "staff",
      "architect",
      "director",
      "manager",
      "head of",
      "vp ",
      "vice president",
      "5+ years",
      "7+ years",
      "10+ years",
      "8+ years",
    ];

    // Entry level indicators
    const entryIndicators = [
      "junior",
      "entry",
      "associate",
      "intern",
      "internship",
      "0-2 years",
      "1-2 years",
      "new grad",
      "new graduate",
      "recent graduate",
    ];

    // Check for senior first (more specific)
    if (seniorIndicators.some((indicator) => text.includes(indicator))) {
      return "senior";
    }

    // Check for entry level
    if (entryIndicators.some((indicator) => text.includes(indicator))) {
      return "entry";
    }

    // Check for mid-level indicators (if explicitly mentioned)
    const midIndicators = ["mid-level", "mid level", "3-5 years", "4-6 years"];
    if (midIndicators.some((indicator) => text.includes(indicator))) {
      return "mid";
    }

    // If no specific seniority detected, return null
    return null;
  };

  const detectedSeniority = detectRoleSeniority(
    interview?.title || jobOpportunity?.title,
    jobOpportunity?.description
  );
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [showQuestionDetail, setShowQuestionDetail] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [practicedQuestionIds, setPracticedQuestionIds] = useState<Set<string>>(
    new Set()
  );
  const [pastResponses, setPastResponses] = useState<any[]>([]);
  const [isLoadingPastResponses, setIsLoadingPastResponses] = useState(false);

  const fetchPracticedQuestions = async () => {
    if (!interview?.jobOpportunityId) return;
    try {
      const response = await api.getResponseHistory(
        undefined,
        undefined,
        interview.jobOpportunityId
      );
      if (response.ok && response.data) {
        const practicedIds = new Set(
          (response.data.responses || [])
            .map((r: any) => r.questionId)
            .filter(Boolean)
        );
        setPracticedQuestionIds(practicedIds);
      }
    } catch (err: any) {
      console.error("Failed to fetch practiced questions:", err);
    }
  };

  const fetchPastResponses = async (questionId: string) => {
    try {
      setIsLoadingPastResponses(true);
      const response = await api.getResponseHistory(undefined, questionId);
      if (response.ok && response.data) {
        setPastResponses(response.data.responses || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch past responses:", err);
      setPastResponses([]);
    } finally {
      setIsLoadingPastResponses(false);
    }
  };

  useEffect(() => {
    if (interview?.jobOpportunityId) {
      fetchQuestions();
      fetchPracticedQuestions();
    }
  }, [interview?.jobOpportunityId, selectedCategory, selectedDifficulty]);

  // Filter questions based on detected seniority
  const filteredQuestions = useMemo(() => {
    let filtered = questions || [];

    // If seniority is detected, only show questions at that level
    // But include questions with null/undefined difficultyLevel (they might be from company insights)
    if (detectedSeniority) {
      const beforeFilter = filtered.length;
      filtered = filtered.filter((q) => {
        const qDifficulty = q.difficultyLevel?.toLowerCase()?.trim();
        // Include questions that match the detected seniority OR have no difficulty level set
        return qDifficulty === detectedSeniority || !qDifficulty;
      });

      // Log if questions were filtered out
      if (beforeFilter > 0 && filtered.length === 0) {
        console.warn(
          `[QuestionBankTab] Detected ${detectedSeniority} seniority but no questions match. Total questions: ${beforeFilter}, difficulty levels:`,
          questions.map((q) => q.difficultyLevel)
        );
      }
    }

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (q) => q.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Apply difficulty filter only if no seniority is detected
    if (!detectedSeniority && selectedDifficulty !== "all") {
      filtered = filtered.filter(
        (q) => q.difficultyLevel?.toLowerCase()?.trim() === selectedDifficulty
      );
    }

    // Apply category-specific difficulty filter only if no seniority is detected
    if (
      !detectedSeniority &&
      selectedCategory !== "all" &&
      categoryDifficulty !== "all"
    ) {
      filtered = filtered.filter(
        (q) => q.difficultyLevel?.toLowerCase()?.trim() === categoryDifficulty
      );
    }

    return filtered;
  }, [
    questions,
    selectedCategory,
    selectedDifficulty,
    categoryDifficulty,
    detectedSeniority,
  ]);

  // Reset category difficulty when category changes
  useEffect(() => {
    setCategoryDifficulty("all");
  }, [selectedCategory]);

  const fetchQuestions = async () => {
    if (!interview?.jobOpportunityId) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getQuestionBank(
        interview.jobOpportunityId,
        selectedCategory !== "all" ? selectedCategory : undefined,
        selectedDifficulty !== "all" ? selectedDifficulty : undefined
      );
      if (response.ok && response.data) {
        const questionsList = response.data.questionBank?.questions || [];
        console.log(
          `[QuestionBankTab] Fetched ${
            questionsList.length
          } questions. Detected seniority: ${detectedSeniority || "none"}`
        );
        setQuestions(questionsList);
      } else {
        console.error("[QuestionBankTab] Failed to fetch questions:", response);
        setError(response.error?.message || "Failed to load questions");
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
      if (response.ok && response.data) {
        console.log(
          "[QuestionBankTab] Generated questions:",
          response.data.count || response.data.questions?.length || 0
        );
        // Wait a bit for the database to be updated
        await new Promise((resolve) => setTimeout(resolve, 500));
        await fetchQuestions();
      } else {
        setError(
          response.error?.message ||
            "Failed to generate question bank. Please try again."
        );
      }
    } catch (err: any) {
      console.error("Failed to generate questions:", err);
      setError(err.message || "Failed to generate question bank");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedQuestion || !responseText.trim() || !interview?.id) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.submitInterviewResponse(
        selectedQuestion.id,
        responseText,
        interview.id,
        undefined,
        interview.jobOpportunityId
      );
      if (response.ok && response.data) {
        setFeedback(response.data.feedback);
        // Refresh practiced questions after submitting a response
        await fetchPracticedQuestions();
      } else {
        setError(response.error || "Failed to submit response");
      }
    } catch (err: any) {
      console.error("Failed to submit response:", err);
      setError(err.message || "Failed to submit response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    "all",
    "behavioral",
    "technical",
    "situational",
    "company",
    "culture",
    "other",
  ];

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Icon
          icon="mingcute:loading-line"
          width={48}
          className="animate-spin mx-auto text-blue-700 mb-4"
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
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Icon icon="mingcute:add-line" width={20} />
          {isGenerating ? "Generating..." : "Generate Questions"}
        </button>
      </div>

      {/* Job Description Highlight */}
      {jobOpportunity?.jobDescription && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-3">
            <Icon
              icon="mingcute:file-text-line"
              width={24}
              className="text-blue-600 mt-1"
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Job Description Reference
              </h3>
              <p className="text-sm text-slate-600 mb-3">
                Questions are linked to skills and requirements from this job
                description
              </p>
              <div className="bg-white rounded-lg p-4 border border-blue-100 max-h-48 overflow-y-auto">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {jobOpportunity.jobDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Filter by Category
          </label>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full font-medium transition ${
                  selectedCategory === cat
                    ? "bg-blue-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Show difficulty filter only if no inherent seniority is detected */}
        {!detectedSeniority && (
          <>
            {selectedCategory === "all" ? (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Filter by Difficulty Level
                </label>
                <div className="flex gap-2 flex-wrap">
                  {["all", "entry", "mid", "senior"].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`px-4 py-2 rounded-full font-medium transition ${
                        selectedDifficulty === diff
                          ? "bg-purple-500 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Difficulty Level for{" "}
                  {selectedCategory.charAt(0).toUpperCase() +
                    selectedCategory.slice(1)}{" "}
                  Questions
                </label>
                <div className="flex gap-2 flex-wrap">
                  {["all", "entry", "mid", "senior"].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => {
                        setCategoryDifficulty(diff);
                        setSelectedDifficulty(diff);
                      }}
                      className={`px-4 py-2 rounded-full font-medium transition ${
                        categoryDifficulty === diff
                          ? "bg-purple-500 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {detectedSeniority && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> This role is{" "}
              <span className="font-semibold capitalize">
                {detectedSeniority}-level
              </span>
              . Showing only {detectedSeniority}-level questions. Difficulty
              filters are hidden since the role already specifies seniority.
            </p>
          </div>
        )}
      </div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <div className="text-center py-12 border border-slate-300 rounded-lg">
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
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isGenerating ? "Generating..." : "Generate Question Bank"}
          </button>
        </div>
      ) : (
        <>
          {/* Group questions by difficulty when category is selected and no seniority is detected */}
          {selectedCategory !== "all" &&
          categoryDifficulty === "all" &&
          !detectedSeniority ? (
            <div className="space-y-6">
              {["entry", "mid", "senior"].map((difficulty) => {
                const difficultyQuestions = filteredQuestions.filter(
                  (q) => q.difficultyLevel?.toLowerCase() === difficulty
                );
                if (difficultyQuestions.length === 0) return null;

                return (
                  <div key={difficulty} className="space-y-3">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-xl font-bold text-slate-900 capitalize">
                        {difficulty} Level Questions
                      </h3>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                        {difficultyQuestions.length}{" "}
                        {difficultyQuestions.length === 1
                          ? "question"
                          : "questions"}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {difficultyQuestions.map((q, idx) => {
                        const isPracticed = practicedQuestionIds.has(q.id);
                        return (
                          <div
                            key={q.id || idx}
                            onClick={async () => {
                              setSelectedQuestion(q);
                              setShowQuestionDetail(true);
                              if (q.id) {
                                await fetchPastResponses(q.id);
                              }
                            }}
                            className={`border rounded-lg p-6 hover:shadow-md transition cursor-pointer ${
                              isPracticed
                                ? "border-green-300 bg-green-50/30"
                                : "border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                    {q.category || "other"}
                                  </span>
                                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                                    {q.difficultyLevel}
                                  </span>
                                  {q.industrySpecific && (
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                      Industry-Specific
                                    </span>
                                  )}
                                  {isPracticed && (
                                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                                      <Icon
                                        icon="mingcute:check-circle-line"
                                        width={14}
                                      />
                                      Practiced
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-lg font-semibold text-slate-900 mb-3">
                                  {q.questionText}
                                </h4>
                                {q.linkedSkills &&
                                  q.linkedSkills.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      <span className="text-xs font-medium text-slate-600 self-center mr-1">
                                        Skills:
                                      </span>
                                      {q.linkedSkills.map(
                                        (skill: string, skillIdx: number) => (
                                          <span
                                            key={skillIdx}
                                            className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded border border-indigo-200"
                                          >
                                            {skill}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  )}
                                {q.starFrameworkGuidance && (
                                  <div className="bg-blue-50 border-l-4 border-blue-500 pl-4 py-2 rounded mb-2">
                                    <p className="text-sm text-slate-700 line-clamp-2">
                                      <strong className="text-blue-700">
                                        STAR:
                                      </strong>{" "}
                                      {q.starFrameworkGuidance}
                                    </p>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-blue-600 mt-3">
                                  <Icon icon="mingcute:eye-line" width={16} />
                                  <span className="font-medium">
                                    Click to view detailed answer guidance
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => {
                const isPracticed = practicedQuestionIds.has(q.id);
                return (
                  <div
                    key={q.id || idx}
                    onClick={async () => {
                      setSelectedQuestion(q);
                      setShowQuestionDetail(true);
                      // Fetch past responses for this question
                      if (q.id) {
                        await fetchPastResponses(q.id);
                      }
                    }}
                    className={`border rounded-lg p-6 hover:shadow-md transition cursor-pointer ${
                      isPracticed
                        ? "border-green-300 bg-green-50/30"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            {q.category || "other"}
                          </span>
                          {q.difficultyLevel && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                              {q.difficultyLevel}
                            </span>
                          )}
                          {q.industrySpecific && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                              Industry-Specific
                            </span>
                          )}
                          {isPracticed && (
                            <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                              <Icon
                                icon="mingcute:check-circle-line"
                                width={14}
                              />
                              Practiced
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-3">
                          {q.questionText}
                        </h4>
                        {q.linkedSkills && q.linkedSkills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="text-xs font-medium text-slate-600 self-center mr-1">
                              Skills:
                            </span>
                            {q.linkedSkills.map(
                              (skill: string, skillIdx: number) => (
                                <span
                                  key={skillIdx}
                                  className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded border border-indigo-200"
                                >
                                  {skill}
                                </span>
                              )
                            )}
                          </div>
                        )}
                        {q.starFrameworkGuidance && (
                          <div className="bg-blue-50 border-l-4 border-blue-500 pl-4 py-2 rounded mb-2">
                            <p className="text-sm text-slate-700 line-clamp-2">
                              <strong className="text-blue-700">STAR:</strong>{" "}
                              {q.starFrameworkGuidance}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-blue-600 mt-3">
                          <Icon icon="mingcute:eye-line" width={16} />
                          <span className="font-medium">
                            Click to view detailed answer guidance
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Answer Question Modal */}
          {showAnswerModal && selectedQuestion && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4"
              onClick={() => {
                setShowAnswerModal(false);
                setFeedback(null);
              }}
            >
              <div
                className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">
                    Answer Question
                  </h3>
                  <button
                    onClick={() => {
                      setShowAnswerModal(false);
                      setFeedback(null);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Icon icon="mingcute:close-line" width={24} />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Question */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">
                      Question:
                    </h4>
                    <p className="text-slate-700">
                      {selectedQuestion.questionText}
                    </p>
                    {selectedQuestion.starFrameworkGuidance && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-sm text-slate-600">
                          <strong>STAR Framework:</strong>{" "}
                          {selectedQuestion.starFrameworkGuidance}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Response Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Your Response
                    </label>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Write your response here... Use the STAR method for behavioral questions."
                      className="w-full h-64 p-4 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Feedback Display */}
                  {feedback && (
                    <div className="space-y-4 border-t border-slate-200 pt-6">
                      <h4 className="text-xl font-semibold text-slate-900">
                        AI Feedback
                      </h4>

                      {feedback.scores && (
                        <div className="border border-slate-300 rounded-lg p-4">
                          <h5 className="font-semibold text-slate-900 mb-3">
                            Scores
                          </h5>
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
                        </div>
                      )}

                      {feedback.aiFeedback && (
                        <div className="border border-slate-300 rounded-lg p-4">
                          <h5 className="font-semibold text-slate-900 mb-3">
                            Detailed Feedback
                          </h5>
                          {feedback.aiFeedback.content && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-slate-700 mb-1">
                                Content:
                              </p>
                              <p className="text-slate-600 text-sm">
                                {feedback.aiFeedback.content}
                              </p>
                            </div>
                          )}
                          {feedback.aiFeedback.strengths &&
                            feedback.aiFeedback.strengths.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-green-700 mb-1">
                                  Strengths:
                                </p>
                                <ul className="list-disc list-inside text-slate-600 text-sm">
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
                                <p className="text-sm font-medium text-red-700 mb-1">
                                  Areas for Improvement:
                                </p>
                                <ul className="list-disc list-inside text-slate-600 text-sm">
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
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowAnswerModal(false);
                      setFeedback(null);
                      setResponseText("");
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSubmitResponse}
                    disabled={!responseText.trim() || isSubmitting}
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
                  >
                    {isSubmitting
                      ? "Analyzing..."
                      : feedback
                      ? "Submit Another Response"
                      : "Get AI Feedback"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Question Detail Modal */}
          {showQuestionDetail && selectedQuestion && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4"
              onClick={() => setShowQuestionDetail(false)}
            >
              <div
                className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">
                    Question Details
                  </h3>
                  <button
                    onClick={() => setShowQuestionDetail(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Icon icon="mingcute:close-line" width={24} />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Question Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        {selectedQuestion.category || "other"}
                      </span>
                      {selectedQuestion.difficultyLevel && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                          {selectedQuestion.difficultyLevel}
                        </span>
                      )}
                      {selectedQuestion.industrySpecific && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Industry-Specific
                        </span>
                      )}
                    </div>
                    <h4 className="text-2xl font-bold text-slate-900 mb-4">
                      {selectedQuestion.questionText}
                    </h4>
                  </div>

                  {/* Linked Skills */}
                  {selectedQuestion.linkedSkills &&
                    selectedQuestion.linkedSkills.length > 0 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Icon icon="mingcute:link-line" width={18} />
                          Linked Skills from Job Description
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {selectedQuestion.linkedSkills.map(
                            (skill: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full border border-indigo-300"
                              >
                                {skill}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Why This Question is Asked */}
                  {selectedQuestion.whyAsked && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
                      <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <Icon icon="mingcute:lightbulb-line" width={18} />
                        Why This Question is Asked
                      </h5>
                      <p className="text-slate-700 leading-relaxed">
                        {selectedQuestion.whyAsked}
                      </p>
                    </div>
                  )}

                  {/* STAR Framework Guidance */}
                  {selectedQuestion.starFrameworkGuidance && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Icon icon="mingcute:target-line" width={18} />
                        STAR Method Framework
                      </h5>
                      <div className="space-y-3">
                        {selectedQuestion.starFrameworkGuidance.includes(
                          "Situation"
                        ) ||
                        selectedQuestion.starFrameworkGuidance.includes(
                          "Task"
                        ) ||
                        selectedQuestion.starFrameworkGuidance.includes(
                          "Action"
                        ) ||
                        selectedQuestion.starFrameworkGuidance.includes(
                          "Result"
                        ) ? (
                          <div className="space-y-2">
                            {selectedQuestion.starFrameworkGuidance
                              .split(/(?=Situation|Task|Action|Result)/)
                              .map((section: string, idx: number) => {
                                if (!section.trim()) return null;
                                const isHeader =
                                  /^(Situation|Task|Action|Result)/i.test(
                                    section
                                  );
                                return (
                                  <div
                                    key={idx}
                                    className={
                                      isHeader ? "mt-3 first:mt-0" : ""
                                    }
                                  >
                                    {isHeader ? (
                                      <p className="font-semibold text-blue-700 mb-1">
                                        {section.split(":")[0]}:
                                      </p>
                                    ) : null}
                                    <p className="text-slate-700 leading-relaxed ml-4">
                                      {isHeader
                                        ? section
                                            .split(":")
                                            .slice(1)
                                            .join(":")
                                            .trim()
                                        : section}
                                    </p>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <p className="text-slate-700 leading-relaxed">
                            {selectedQuestion.starFrameworkGuidance}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Detailed Answer Guidance */}
                  {selectedQuestion.answerGuidance && (
                    <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Icon icon="mingcute:check-circle-line" width={18} />
                        How to Answer This Question
                      </h5>
                      <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedQuestion.answerGuidance}
                      </div>
                    </div>
                  )}

                  {/* Job Description Reference */}
                  {jobOpportunity?.jobDescription && (
                    <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Icon icon="mingcute:file-text-line" width={18} />
                        Job Description Reference
                      </h5>
                      <div className="max-h-48 overflow-y-auto">
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {jobOpportunity.jobDescription}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Past Responses */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Icon icon="mingcute:history-line" width={18} />
                      Past Practice Responses
                    </h5>
                    {isLoadingPastResponses ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                        <span className="ml-2 text-sm text-slate-600">
                          Loading responses...
                        </span>
                      </div>
                    ) : pastResponses.length > 0 ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {pastResponses.map((response: any, idx: number) => (
                          <div
                            key={response.id || idx}
                            className="bg-white rounded-lg p-4 border border-purple-200"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-slate-500">
                                {new Date(
                                  response.createdAt || response.created_at
                                ).toLocaleDateString()}{" "}
                                at{" "}
                                {new Date(
                                  response.createdAt || response.created_at
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {response.scores && (
                                <div className="flex items-center gap-2">
                                  {Object.entries(response.scores)
                                    .slice(0, 2)
                                    .map(([key, value]: [string, any]) => (
                                      <span
                                        key={key}
                                        className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded"
                                      >
                                        {key}: {value}/100
                                      </span>
                                    ))}
                                </div>
                              )}
                            </div>
                            <div className="mb-3">
                              <p className="text-xs font-medium text-slate-600 mb-1">
                                Your Response:
                              </p>
                              <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-300">
                                {response.originalResponse ||
                                  response.original_response}
                              </p>
                            </div>
                            {response.aiFeedback && (
                              <div className="border-t border-purple-200 pt-3">
                                <p className="text-xs font-medium text-slate-600 mb-1">
                                  AI Feedback:
                                </p>
                                {response.aiFeedback.content && (
                                  <p className="text-xs text-slate-600 mb-2">
                                    {response.aiFeedback.content}
                                  </p>
                                )}
                                {response.aiFeedback.strengths &&
                                  response.aiFeedback.strengths.length > 0 && (
                                    <div className="mb-2">
                                      <p className="text-xs font-medium text-green-700 mb-1">
                                        Strengths:
                                      </p>
                                      <ul className="text-xs text-slate-600 list-disc list-inside">
                                        {response.aiFeedback.strengths
                                          .slice(0, 2)
                                          .map((s: string, i: number) => (
                                            <li key={i}>{s}</li>
                                          ))}
                                      </ul>
                                    </div>
                                  )}
                                {response.aiFeedback.weaknesses &&
                                  response.aiFeedback.weaknesses.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-red-700 mb-1">
                                        Areas to Improve:
                                      </p>
                                      <ul className="text-xs text-slate-600 list-disc list-inside">
                                        {response.aiFeedback.weaknesses
                                          .slice(0, 2)
                                          .map((w: string, i: number) => (
                                            <li key={i}>{w}</li>
                                          ))}
                                      </ul>
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-500">
                        <Icon
                          icon="mingcute:file-text-line"
                          width={32}
                          className="mx-auto mb-2 text-slate-300"
                        />
                        <p className="text-sm">
                          No past responses yet. Practice this question to see
                          your responses here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowQuestionDetail(false);
                      setFeedback(null);
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowQuestionDetail(false);
                      setShowAnswerModal(true);
                      setResponseText("");
                      setFeedback(null);
                    }}
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
                  >
                    Answer This Question
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Response Coaching Tab Component (UC-076) - Chat-based coaching
function ResponseCoachingTab({
  interview,
  jobOpportunity,
}: {
  interview: InterviewData | null;
  jobOpportunity: JobOpportunityData | null;
}) {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>
  >([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [isSuggestionsMinimized, setIsSuggestionsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSuggestions();
    // Add initial greeting message
    setMessages([
      {
        role: "assistant",
        content:
          "Hi! I'm your interview coach. I can help you improve your interview performance based on your past mock interview sessions. What would you like to work on?",
        timestamp: new Date(),
      },
    ]);
  }, [interview?.id]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSuggestions = async () => {
    try {
      setIsLoadingSuggestions(true);
      const response = await api.getCoachingSuggestions(interview?.id);
      if (response.ok && response.data) {
        setSuggestions(response.data.suggestions || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch suggestions:", err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    // Add user message
    const userMessage = {
      role: "user" as const,
      content: messageToSend,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");

    // Get AI response
    try {
      setIsLoading(true);
      const response = await api.sendCoachingMessage(
        messageToSend,
        interview?.id
      );
      if (response.ok && response.data) {
        const aiMessage = {
          role: "assistant" as const,
          content: response.data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const errorMessage = {
          role: "assistant" as const,
          content:
            "I apologize, but I'm having trouble responding right now. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (err: any) {
      console.error("Failed to send message:", err);
      const errorMessage = {
        role: "assistant" as const,
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-300px)] max-h-[800px] bg-white border border-slate-300 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500 rounded-lg">
            <Icon icon="mingcute:chat-line" width={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Interview Response Coaching
            </h2>
            <p className="text-sm text-slate-600">
              Get personalized coaching based on your mock interview performance
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === "user"
                  ? "bg-blue-700 text-white"
                  : "bg-white border border-slate-300 text-slate-900"
              }`}
            >
              <div className="flex items-start gap-3">
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Icon
                      icon="mingcute:robot-line"
                      width={18}
                      className="text-green-600"
                    />
                  </div>
                )}
                <div className="flex-1">
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-slate prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700 prose-code:text-slate-900 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-100 prose-pre:text-slate-900 prose-a:text-green-600 prose-a:no-underline hover:prose-a:underline">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  )}
                  <span
                    className={`text-xs mt-2 block ${
                      message.role === "user"
                        ? "text-blue-100"
                        : "text-slate-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center">
                    <Icon
                      icon="mingcute:user-line"
                      width={18}
                      className="text-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-300 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                <span className="text-slate-600 text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {suggestions.length > 0 && (
        <div className="bg-slate-100 border-t border-slate-200">
          <button
            onClick={() => setIsSuggestionsMinimized(!isSuggestionsMinimized)}
            className="w-full px-6 py-2 flex items-center justify-between hover:bg-slate-200 transition"
          >
            <p className="text-xs font-medium text-slate-600">
              Suggested questions
            </p>
            <Icon
              icon={
                isSuggestionsMinimized
                  ? "mingcute:up-line"
                  : "mingcute:down-line"
              }
              width={16}
              className="text-slate-600"
            />
          </button>
          {!isSuggestionsMinimized && (
            <div className="px-6 pb-3">
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="flex gap-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your interview performance, areas to improve, or how to structure better answers..."
            className="flex-1 p-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Icon icon="mingcute:send-plane-line" width={20} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
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
        <div className="text-center py-12 border border-slate-300 rounded-lg">
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
            className="bg-blue-700 text-white px-6 py-2 rounded-full hover:bg-blue-800 transition disabled:opacity-50 inline-flex items-center gap-2"
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
                    className="border border-slate-300 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
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
    <div className="flex flex-col h-[calc(100vh-300px)] border border-slate-300 rounded-lg bg-white">
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
                  ? "bg-blue-700 text-white"
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
                className="w-5 h-5 animate-spin text-blue-700"
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
              className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-white rounded-xl border border-slate-300 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
                    className="animate-spin text-blue-700 mb-4"
                  />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Evaluating Interview Performance
                  </h3>
                  <p className="text-slate-600">
                    Analyzing your responses and generating feedback...
                  </p>
                  <div className="w-full max-w-md mt-6 bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full animate-pulse"
                      style={{ width: "60%" }}
                    ></div>
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
                    <div className="border border-slate-300 rounded-lg p-6">
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
                    <div className="border border-slate-300 rounded-lg p-6">
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
                    <div className="border border-slate-300 rounded-lg p-6">
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
                    <div className="border border-slate-300 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        Response Quality Scores
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 mb-1">
                            {performanceSummary.responseQuality.relevance}
                          </div>
                          <div className="text-sm text-slate-600">
                            Relevance
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600 mb-1">
                            {performanceSummary.responseQuality.specificity}
                          </div>
                          <div className="text-sm text-slate-600">
                            Specificity
                          </div>
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
                      {performanceSummary.confidenceBuilding.exercises?.length >
                        0 && (
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
                      {performanceSummary.confidenceBuilding.techniques
                        ?.length > 0 && (
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
                    <div className="border border-slate-300 rounded-lg p-6 bg-slate-50">
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
                className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
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
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(
    null
  );
  const [progress, setProgress] = useState<any>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [editorLanguage, setEditorLanguage] = useState<
    "python" | "javascript" | "java" | "cpp"
  >("python");
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [codeOutput, setCodeOutput] = useState<any>(null);

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

  const executeJavaScript = (code: string, testCases: any[]): any[] => {
    const results: any[] = [];
    const consoleLogs: string[] = [];

    // Capture console.log
    const originalConsoleLog = console.log;
    console.log = (...args: any[]) => {
      consoleLogs.push(
        args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
          )
          .join(" ")
      );
      originalConsoleLog.apply(console, args);
    };

    // Wrap code in an IIFE to capture the function
    // Try to extract function name or create a wrapper
    let userFunction: any = null;
    let functionName: string | null = null;

    // Try to find function declarations
    const functionPatterns = [
      /function\s+(\w+)\s*\(/,
      /const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function)/,
      /let\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function)/,
      /var\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function)/,
    ];

    for (const pattern of functionPatterns) {
      const match = code.match(pattern);
      if (match) {
        functionName = match[1];
        break;
      }
    }

    try {
      // Create isolated scope for execution
      const isolatedCode = `
        (function() {
          ${code}
          ${functionName ? `return ${functionName};` : "return null;"}
        })()
      `;

      // Execute in a try-catch to capture the function
      try {
        userFunction = eval(isolatedCode);
      } catch (e) {
        // If that fails, try executing the code directly and then accessing the function
        eval(code);
        if (functionName) {
          userFunction =
            (window as any)[functionName] || (globalThis as any)[functionName];
        }
      }

      // If we still don't have a function, try to wrap the code
      if (!userFunction) {
        // Assume the code is a function body and wrap it
        const wrappedCode = `(function() { return (${code}); })()`;
        try {
          userFunction = eval(wrappedCode);
        } catch (e) {
          // Last resort: try to execute as-is
          userFunction = eval(`(${code})`);
        }
      }

      // Store console logs (will be set after execution)
      const logsToStore = [...consoleLogs];

      // Execute test cases
      testCases.forEach((testCase, idx) => {
        const startTime = performance.now();
        try {
          let actualOutput: any;

          if (userFunction && typeof userFunction === "function") {
            // Call the function with test input
            if (Array.isArray(testCase.input)) {
              actualOutput = userFunction(...testCase.input);
            } else if (
              typeof testCase.input === "object" &&
              testCase.input !== null &&
              !Array.isArray(testCase.input)
            ) {
              // For object inputs, try to spread or pass as single arg
              const keys = Object.keys(testCase.input);
              if (keys.length === 1) {
                actualOutput = userFunction(testCase.input[keys[0]]);
              } else {
                actualOutput = userFunction(...Object.values(testCase.input));
              }
            } else {
              actualOutput = userFunction(testCase.input);
            }
          } else {
            throw new Error(
              "Could not find or execute function. Make sure your code defines a function."
            );
          }

          const executionTime = performance.now() - startTime;

          // Normalize outputs for comparison
          const normalize = (val: any) => {
            if (Array.isArray(val)) {
              return JSON.stringify(val.sort ? val.sort() : val);
            }
            return JSON.stringify(val);
          };

          const normalizedActual = normalize(actualOutput);
          const normalizedExpected = normalize(testCase.expectedOutput);
          const passed = normalizedActual === normalizedExpected;

          results.push({
            testCase: idx + 1,
            input: JSON.stringify(testCase.input),
            expectedOutput: normalizedExpected,
            actualOutput: normalizedActual,
            passed,
            error: null,
            executionTime: Math.round(executionTime * 100) / 100,
          });
        } catch (e: any) {
          const executionTime = performance.now() - startTime;
          results.push({
            testCase: idx + 1,
            input: JSON.stringify(testCase.input),
            expectedOutput: JSON.stringify(testCase.expectedOutput),
            actualOutput: "Error",
            passed: false,
            error: e.message || "Execution error",
            executionTime: Math.round(executionTime * 100) / 100,
          });
        }
      });
    } catch (e: any) {
      // If execution fails completely
      testCases.forEach((testCase, idx) => {
        results.push({
          testCase: idx + 1,
          input: JSON.stringify(testCase.input),
          expectedOutput: JSON.stringify(testCase.expectedOutput),
          actualOutput: "Execution Error",
          passed: false,
          error: e.message || "Failed to execute code",
          executionTime: null,
        });
      });
    } finally {
      // Restore original console.log
      console.log = originalConsoleLog;
      // Set console output after execution
      setConsoleOutput(consoleLogs);
    }

    return results;
  };

  const executeCodeOnly = (
    code: string,
    testInput?: any
  ): { output: any; error: string | null; input: any } => {
    const consoleLogs: string[] = [];
    let output: any = null;
    let error: string | null = null;

    // Capture console.log
    const originalConsoleLog = console.log;
    console.log = (...args: any[]) => {
      consoleLogs.push(
        args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
          )
          .join(" ")
      );
      originalConsoleLog.apply(console, args);
    };

    try {
      // Try to extract and execute the function
      let userFunction: any = null;
      let functionName: string | null = null;

      const functionPatterns = [
        /function\s+(\w+)\s*\(/,
        /const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function)/,
        /let\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function)/,
        /var\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function)/,
      ];

      for (const pattern of functionPatterns) {
        const match = code.match(pattern);
        if (match) {
          functionName = match[1];
          break;
        }
      }

      // Execute code to get the function
      const isolatedCode = `
        (function() {
          ${code}
          ${functionName ? `return ${functionName};` : "return null;"}
        })()
      `;

      try {
        userFunction = eval(isolatedCode);
      } catch (e) {
        eval(code);
        if (functionName) {
          userFunction =
            (window as any)[functionName] || (globalThis as any)[functionName];
        }
      }

      // If we have a function and test input, execute it
      if (
        userFunction &&
        typeof userFunction === "function" &&
        testInput !== undefined
      ) {
        try {
          // Call the function with test input
          if (Array.isArray(testInput)) {
            output = userFunction(...testInput);
          } else if (
            typeof testInput === "object" &&
            testInput !== null &&
            !Array.isArray(testInput)
          ) {
            // For object inputs, try to spread or pass as single arg
            const keys = Object.keys(testInput);
            if (keys.length === 1) {
              output = userFunction(testInput[keys[0]]);
            } else {
              output = userFunction(...Object.values(testInput));
            }
          } else {
            output = userFunction(testInput);
          }
        } catch (e: any) {
          error = e.message || "Error executing function";
          output = null;
        }
      } else if (userFunction && typeof userFunction === "function") {
        // Function defined but no test input provided
        output = `Function "${
          functionName || "anonymous"
        }" is defined. Provide input to see output.`;
      } else {
        // If no function found, try to execute the code as a script
        try {
          const result = eval(`(${code})`);
          if (result !== undefined) {
            output = result;
          } else {
            // Try executing as a statement
            eval(code);
            output = "Code executed successfully (no return value)";
          }
        } catch (e: any) {
          error = e.message || "Error executing code";
        }
      }
    } catch (e: any) {
      error = e.message || "Error executing code";
    } finally {
      console.log = originalConsoleLog;
      setConsoleOutput(consoleLogs);
    }

    return { output, error, input: testInput };
  };

  const handleRunCode = async () => {
    if (!selectedChallenge || !solution.trim()) return;
    try {
      setIsRunning(true);
      setCodeOutput(null);
      setConsoleOutput([]);

      // For JavaScript, execute in browser
      if (editorLanguage === "javascript") {
        // Get first test case for execution
        const testCases = extractTestCasesFromQuestion(
          selectedChallenge.questionText || ""
        );
        const firstTestCase = testCases.length > 0 ? testCases[0] : null;

        const result = executeCodeOnly(solution, firstTestCase?.input);

        if (result.error) {
          setCodeOutput({
            value: result.error,
            type: "error",
            input: firstTestCase ? JSON.stringify(firstTestCase.input) : null,
          });
        } else {
          setCodeOutput({
            value: result.output,
            type: typeof result.output,
            input: firstTestCase ? JSON.stringify(firstTestCase.input) : null,
          });
        }
        setIsRunning(false);
        return;
      }

      // For other languages, use backend execution
      try {
        // Get first test case for execution
        const testCases = extractTestCasesFromQuestion(
          selectedChallenge.questionText || ""
        );
        const firstTestCase = testCases.length > 0 ? testCases[0] : null;

        const response = await api.runTechnicalCode(
          selectedChallenge.id,
          solution,
          editorLanguage,
          firstTestCase?.input,
          true // runOnce = true for single execution
        );

        if (response.ok && response.data) {
          // Check for output (including empty strings)
          if (
            response.data.output !== undefined &&
            response.data.output !== null
          ) {
            setCodeOutput({
              value:
                response.data.output === ""
                  ? "(empty output)"
                  : response.data.output,
              type: response.data.error ? "error" : typeof response.data.output,
              input: firstTestCase ? JSON.stringify(firstTestCase.input) : null,
            });
          } else if (
            response.data.rawOutput !== undefined &&
            response.data.rawOutput !== null
          ) {
            // Fallback to rawOutput if output is not available
            setCodeOutput({
              value:
                response.data.rawOutput === ""
                  ? "(empty output)"
                  : response.data.rawOutput,
              type: response.data.error ? "error" : "string",
              input: firstTestCase ? JSON.stringify(firstTestCase.input) : null,
            });
          } else if (response.data.error) {
            setCodeOutput({
              value: response.data.error,
              type: "error",
              input: firstTestCase ? JSON.stringify(firstTestCase.input) : null,
            });
          } else {
            setCodeOutput({
              value: "No output received from server",
              type: "error",
              input: firstTestCase ? JSON.stringify(firstTestCase.input) : null,
            });
          }
        } else {
          setCodeOutput({
            value: response.error || "Failed to execute code",
            type: "error",
            input: null,
          });
        }
      } catch (err: any) {
        setCodeOutput({
          value: `Error: ${err.message || "Failed to execute code"}`,
          type: "error",
          input: null,
        });
      }
    } catch (err: any) {
      console.error("Failed to run code:", err);
      setCodeOutput({
        value: `Error: ${err.message || "Failed to execute code"}`,
        type: "error",
        input: null,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunTests = async () => {
    if (!selectedChallenge || !solution.trim()) return;
    try {
      setIsRunningTests(true);
      setTestResults(null);

      // For JavaScript, execute in browser
      if (editorLanguage === "javascript") {
        // Extract test cases from the challenge
        const testCases = extractTestCasesFromQuestion(
          selectedChallenge.questionText || ""
        );

        if (testCases.length === 0) {
          setTestResults({
            success: false,
            testResults: [],
            message: "No test cases found in problem statement",
          });
          setIsRunningTests(false);
          return;
        }

        const results = executeJavaScript(solution, testCases);
        const allPassed = results.every((r) => r.passed);

        setTestResults({
          success: true,
          testResults: results,
          message: allPassed
            ? "All test cases passed!"
            : `${results.filter((r) => r.passed).length}/${
                results.length
              } test cases passed`,
        });
        setIsRunningTests(false);
        return;
      }

      // For other languages, use backend
      const response = await api.runTechnicalCode(
        selectedChallenge.id,
        solution,
        editorLanguage
      );
      if (response.ok && response.data) {
        setTestResults(response.data);
      } else {
        setTestResults({
          success: false,
          testResults: [],
          message: response.error || "Failed to run tests",
        });
      }
    } catch (err: any) {
      console.error("Failed to run tests:", err);
      setTestResults({
        success: false,
        testResults: [],
        message: err.message || "Failed to run tests",
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const extractTestCasesFromQuestion = (questionText: string): any[] => {
    const testCases: any[] = [];
    if (!questionText) return testCases;

    // Look for Example patterns
    const exampleRegex =
      /Example\s+(\d+):\s*\nInput:\s*([^\n]+)\nOutput:\s*([^\n]+)/gi;
    let match;
    while ((match = exampleRegex.exec(questionText)) !== null) {
      try {
        let input = match[2].trim();
        // Remove common prefixes
        input = input.replace(/^(nums|target|s|str)\s*=\s*/i, "").trim();

        const output = match[3].trim();

        testCases.push({
          input: parseInput(input),
          expectedOutput: parseOutput(output),
          exampleNumber: parseInt(match[1]),
        });
      } catch (e) {
        console.warn("Failed to parse test case:", e);
      }
    }

    return testCases;
  };

  const parseInput = (inputStr: string): any => {
    try {
      return JSON.parse(inputStr);
    } catch {
      return inputStr;
    }
  };

  const parseOutput = (outputStr: string): any => {
    try {
      return JSON.parse(outputStr);
    } catch {
      return outputStr;
    }
  };

  const handleSubmitSolution = async () => {
    if (!selectedChallenge || !solution.trim() || !startTime) return;
    try {
      setIsSubmitting(true);
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);

      // First, run the tests to get execution results
      let testResults = null;
      try {
        if (editorLanguage === "javascript") {
          // For JavaScript, run tests client-side
          const testCases = extractTestCasesFromQuestion(
            selectedChallenge.questionText || ""
          );
          if (testCases.length > 0) {
            const results = executeJavaScript(solution, testCases);
            const allPassed = results.every((r) => r.passed);
            testResults = {
              success: allPassed,
              testResults: results,
              message: allPassed
                ? "All test cases passed!"
                : `${results.filter((r) => r.passed).length}/${
                    results.length
                  } test cases passed`,
            };
          }
        } else {
          // For other languages, run tests via backend
          const testResponse = await api.runTechnicalCode(
            selectedChallenge.id,
            solution,
            editorLanguage
          );
          if (testResponse.ok && testResponse.data) {
            testResults = testResponse.data;
          }
        }
      } catch (testErr: any) {
        console.warn("Failed to run tests before submission:", testErr);
        // Continue with submission even if tests fail
      }

      // Submit solution with test results
      const response = await api.submitTechnicalSolution(
        selectedChallenge.id,
        solution,
        timeTaken,
        testResults
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
          className="animate-spin mx-auto text-blue-700 mb-4"
        />
        <p className="text-slate-600">Loading technical prep...</p>
      </div>
    );
  }

  const getDefaultSolution = (language: string, questionText: string) => {
    // Try to extract function signature from question text
    const functionMatch = questionText.match(
      /(?:def|function|public\s+static|class\s+Solution)\s+(\w+)\s*\([^)]*\)/
    );
    const isLeetCodeStyle =
      questionText.includes("Example") ||
      questionText.includes("Constraints") ||
      functionMatch;

    if (!isLeetCodeStyle) {
      return `// Write your solution here\n// Use proper syntax and formatting\n\n`;
    }

    switch (language) {
      case "python":
        return `# Solution
# Write your solution function here
# The input will be automatically passed to your function
# Make sure to return the result (it will be printed automatically)

def solve(nums):
    # Your code here
    # Example: return the sum of all numbers
    return sum(nums) if nums else 0

# Or use a class-based approach:
# class Solution:
#     def solve(self, nums):
#         # Your code here
#         return sum(nums) if nums else 0
`;
      case "javascript":
        return `// Solution\n/**\n * @param {number[]} nums\n * @return {number[]}\n */\nvar solve = function(nums) {\n    // Your code here\n    return [];\n};\n`;
      case "java":
        return `// Solution\nclass Solution {\n    public int[] solve(int[] nums) {\n        // Your code here\n        return new int[]{};\n    }\n}\n`;
      case "cpp":
        return `// Solution\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums) {\n        // Your code here\n        return {};\n    }\n};\n`;
      default:
        return `// Write your solution here\n`;
    }
  };

  const handleOpenChallenge = async (challenge: any) => {
    setSelectedChallenge(challenge);
    const defaultSolution = getDefaultSolution(
      editorLanguage,
      challenge.questionText || ""
    );
    setSolution(defaultSolution);
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
          <div className="bg-white rounded-xl border border-slate-300 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Your Progress
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#1E3097] to-[#3351FD] p-6 text-white border border-slate-300 min-h-[180px]">
                <div className="flex items-start justify-between">
                  <p className="text-[22px] font-normal" style={{ fontFamily: "Poppins" }}>
                    Total Attempts
                  </p>
                </div>
                <p className="text-6xl font-medium leading-none text-[#E7EFFF] mt-2" style={{ fontFamily: "Poppins" }}>
                  {progress.totalAttempts || 0}
                </p>
              </div>
              <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#2563EB] to-[#60A5FA] p-6 text-white border border-slate-300 min-h-[180px]">
                <div className="flex items-start justify-between">
                  <p className="text-[22px] font-normal" style={{ fontFamily: "Poppins" }}>
                    Avg Score
                  </p>
                </div>
                <p className="text-6xl font-medium leading-none text-[#E7EFFF] mt-2" style={{ fontFamily: "Poppins" }}>
                  {progress.averageScore ? Math.round(progress.averageScore) : 0}
                </p>
              </div>
              <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#3B82F6] to-[#93C5FD] p-6 text-white border border-slate-300 min-h-[180px]">
                <div className="flex items-start justify-between">
                  <p className="text-[22px] font-normal" style={{ fontFamily: "Poppins" }}>
                    Challenges Solved
                  </p>
                </div>
                <p className="text-6xl font-medium leading-none text-[#E7EFFF] mt-2" style={{ fontFamily: "Poppins" }}>
                  {progress.uniqueChallenges || 0}
                </p>
              </div>
              <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#0284C7] to-[#38BDF8] p-6 text-white border border-slate-300 min-h-[180px]">
                <div className="flex items-start justify-between">
                  <p className="text-[22px] font-normal" style={{ fontFamily: "Poppins" }}>
                    Last Attempt
                  </p>
                </div>
                <p className="text-3xl font-medium leading-none text-[#E7EFFF] mt-2" style={{ fontFamily: "Poppins" }}>
                  {progress.lastAttemptDate
                    ? new Date(progress.lastAttemptDate).toLocaleDateString()
                    : "Never"}
                </p>
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
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Icon icon="mingcute:add-line" width={20} />
            {isGenerating ? "Generating..." : "Generate Prep"}
          </button>
        </div>

        {challenges.length === 0 ? (
          <div className="text-center py-12 border border-slate-300 rounded-lg">
            <Icon
              icon="mingcute:code-line"
              width={64}
              className="mx-auto text-slate-300 mb-4"
            />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">
              No Challenges Available
            </h4>
            <p className="text-slate-600">
              Generate technical interview preparation challenges based on your
              role.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                onClick={() => handleOpenChallenge(challenge)}
                className="border border-slate-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all bg-white"
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
            className="bg-white rounded-xl border border-slate-300 w-full max-w-7xl h-[90vh] flex flex-col"
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
              <div className="w-1/2 border-r border-slate-200 overflow-y-auto p-6 bg-white">
                <div className="space-y-6">
                  {/* Problem Statement */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                      Problem Statement
                    </h3>
                    <div className="bg-white rounded-lg p-4 border border-slate-300">
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
                      <div className="bg-white rounded-lg p-4 border border-slate-300">
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
                      <div className="bg-white rounded-lg p-4 border border-slate-300">
                        <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                          {selectedChallenge.realWorldScenario}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Whiteboarding Techniques */}
                  {selectedChallenge.whiteboardingTechniques && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Icon icon="mingcute:edit-line" width={20} />
                        Whiteboarding Techniques
                      </h3>
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-l-4 border-purple-500 rounded-lg p-4">
                        <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                          {selectedChallenge.whiteboardingTechniques}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Performance Metrics */}
                  {selectedChallenge.performanceMetrics &&
                    Object.keys(selectedChallenge.performanceMetrics).length >
                      0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Icon icon="mingcute:chart-line" width={20} />
                          Performance Metrics
                        </h3>
                        <div className="bg-white rounded-lg p-4 border border-slate-300">
                          <div className="grid grid-cols-2 gap-4">
                            {selectedChallenge.performanceMetrics
                              .timeComplexity && (
                              <div>
                                <div className="text-xs font-medium text-slate-500 mb-1">
                                  Time Complexity
                                </div>
                                <div className="text-sm font-semibold text-slate-900">
                                  {
                                    selectedChallenge.performanceMetrics
                                      .timeComplexity
                                  }
                                </div>
                              </div>
                            )}
                            {selectedChallenge.performanceMetrics
                              .spaceComplexity && (
                              <div>
                                <div className="text-xs font-medium text-slate-500 mb-1">
                                  Space Complexity
                                </div>
                                <div className="text-sm font-semibold text-slate-900">
                                  {
                                    selectedChallenge.performanceMetrics
                                      .spaceComplexity
                                  }
                                </div>
                              </div>
                            )}
                            {selectedChallenge.performanceMetrics
                              .codeQuality && (
                              <div className="col-span-2">
                                <div className="text-xs font-medium text-slate-500 mb-1">
                                  Code Quality Standards
                                </div>
                                <div className="text-sm text-slate-700">
                                  {
                                    selectedChallenge.performanceMetrics
                                      .codeQuality
                                  }
                                </div>
                              </div>
                            )}
                            {selectedChallenge.performanceMetrics
                              .testCoverage && (
                              <div className="col-span-2">
                                <div className="text-xs font-medium text-slate-500 mb-1">
                                  Test Coverage Expectations
                                </div>
                                <div className="text-sm text-slate-700">
                                  {
                                    selectedChallenge.performanceMetrics
                                      .testCoverage
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Challenge Type Badge Enhancement */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedChallenge.type === "system_design" && (
                      <div className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full border border-amber-300">
                        <Icon
                          icon="mingcute:server-line"
                          width={14}
                          className="inline mr-1"
                        />
                        System Design
                      </div>
                    )}
                    {selectedChallenge.type === "case_study" && (
                      <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-300">
                        <Icon
                          icon="mingcute:file-chart-line"
                          width={14}
                          className="inline mr-1"
                        />
                        Case Study
                      </div>
                    )}
                    {selectedChallenge.type === "coding" && (
                      <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-300">
                        <Icon
                          icon="mingcute:code-line"
                          width={14}
                          className="inline mr-1"
                        />
                        Coding Challenge
                      </div>
                    )}
                    {selectedChallenge.type === "whiteboarding" && (
                      <div className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full border border-purple-300">
                        <Icon
                          icon="mingcute:edit-line"
                          width={14}
                          className="inline mr-1"
                        />
                        Whiteboarding
                      </div>
                    )}
                  </div>

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
                          className="animate-spin mx-auto text-blue-700"
                        />
                      </div>
                    ) : attemptHistory.length === 0 ? (
                      <div className="bg-white rounded-lg p-4 border border-slate-300 text-center">
                        <p className="text-slate-600 text-sm">
                          No previous attempts. Submit a solution to track your
                          progress!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {attemptHistory.map((attempt, idx) => {
                          const attemptId = attempt.id || `attempt-${idx}`;
                          const isExpanded = expandedAttemptId === attemptId;
                          const hasFeedback =
                            attempt.feedback && attempt.feedback.trim();

                          return (
                            <div
                              key={attemptId}
                              className="bg-white rounded-lg border border-slate-300 hover:border-blue-300 transition"
                            >
                              <div className="p-4">
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
                                {hasFeedback && (
                                  <div>
                                    <div
                                      className={`text-xs text-slate-600 ${
                                        !isExpanded ? "line-clamp-2" : ""
                                      }`}
                                    >
                                      {!isExpanded ? (
                                        <span>
                                          {attempt.feedback.substring(0, 150)}
                                          ...
                                        </span>
                                      ) : (
                                        <div className="prose prose-xs max-w-none prose-slate mt-2">
                                          <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                          >
                                            {attempt.feedback}
                                          </ReactMarkdown>
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      onClick={() =>
                                        setExpandedAttemptId(
                                          isExpanded ? null : attemptId
                                        )
                                      }
                                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <Icon
                                            icon="mingcute:up-line"
                                            width={14}
                                          />
                                          Show Less
                                        </>
                                      ) : (
                                        <>
                                          <Icon
                                            icon="mingcute:down-line"
                                            width={14}
                                          />
                                          Show Full Analysis
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Code Editor or Solution View */}
              <div className="w-1/2 flex flex-col bg-white overflow-hidden">
                {/* Editor Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveView("problem")}
                      className={`px-3 py-1 rounded text-sm font-medium transition ${
                        activeView === "problem"
                          ? "bg-blue-700 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Problem
                    </button>
                    <button
                      onClick={() => setActiveView("solution")}
                      className={`px-3 py-1 rounded text-sm font-medium transition ${
                        activeView === "solution"
                          ? "bg-blue-700 text-white"
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

                {/* Code Editor or Solution View */}
                {activeView === "problem" ? (
                  <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden min-h-0">
                    {/* Editor Toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          Language:
                        </span>
                        <select
                          value={editorLanguage}
                          onChange={(e) => {
                            const newLang = e.target.value as any;
                            setEditorLanguage(newLang);
                            // Update solution template when language changes
                            if (selectedChallenge) {
                              const defaultSolution = getDefaultSolution(
                                newLang,
                                selectedChallenge.questionText || ""
                              );
                              if (
                                !solution ||
                                solution.trim() ===
                                  getDefaultSolution(
                                    editorLanguage,
                                    selectedChallenge.questionText || ""
                                  ).trim()
                              ) {
                                setSolution(defaultSolution);
                              }
                            }
                          }}
                          className="px-3 py-1 bg-slate-700 text-slate-100 border border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="python">Python</option>
                          <option value="javascript">JavaScript</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Icon icon="mingcute:code-line" width={16} />
                        <span>Monaco Editor</span>
                      </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <Editor
                        height="100%"
                        language={editorLanguage}
                        value={solution}
                        onChange={(value) => setSolution(value || "")}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: "on",
                          roundedSelection: false,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          tabSize: 2,
                          wordWrap: "on",
                          formatOnPaste: true,
                          formatOnType: true,
                          suggestOnTriggerCharacters: true,
                          acceptSuggestionOnEnter: "on",
                          tabCompletion: "on",
                          quickSuggestions: true,
                        }}
                        loading={
                          <div className="flex items-center justify-center h-full bg-slate-900">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                          </div>
                        }
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="p-4 border-t border-slate-700 bg-slate-800 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleRunCode}
                          disabled={!solution.trim() || isRunning}
                          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          <Icon icon="mingcute:play-line" width={18} />
                          {isRunning ? "Running..." : "Run Code"}
                        </button>
                        <button
                          onClick={handleRunTests}
                          disabled={!solution.trim() || isRunningTests}
                          className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          <Icon icon="mingcute:test-tube-line" width={18} />
                          {isRunningTests ? "Testing..." : "Run Tests"}
                        </button>
                        <button
                          onClick={handleSubmitSolution}
                          disabled={!solution.trim() || isSubmitting}
                          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          <Icon icon="mingcute:check-line" width={18} />
                          {isSubmitting ? "Analyzing..." : "Submit Solution"}
                        </button>
                        <button
                          onClick={() => {
                            setSolution("");
                            setTestResults(null);
                            setConsoleOutput([]);
                            setCodeOutput(null);
                          }}
                          disabled={!solution.trim()}
                          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Icon icon="mingcute:refresh-line" width={18} />
                          Clear
                        </button>
                        <div className="flex-1" />
                        <div className="text-sm text-slate-400">
                          {solution.length} characters
                        </div>
                      </div>
                    </div>

                    {/* Code Output Section - Inside Modal */}
                    {codeOutput && (
                      <div
                        className="border-t border-slate-700 bg-slate-900 p-4 flex-shrink-0 overflow-y-auto"
                        style={{ maxHeight: "200px" }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Icon
                            icon="mingcute:terminal-line"
                            width={16}
                            className="text-slate-400"
                          />
                          <h4 className="font-semibold text-slate-300 text-sm">
                            Output
                          </h4>
                        </div>
                        {codeOutput.input && (
                          <div className="mb-2">
                            <div className="text-xs text-slate-400 mb-1">
                              Input:
                            </div>
                            <div className="bg-slate-950 rounded p-2 font-mono text-xs text-slate-400 break-all">
                              {codeOutput.input}
                            </div>
                          </div>
                        )}
                        <div
                          className={`bg-slate-950 rounded p-3 font-mono text-sm ${
                            codeOutput.type === "error"
                              ? "text-red-400"
                              : "text-green-300"
                          } whitespace-pre-wrap break-all`}
                        >
                          {codeOutput.value === null ||
                          codeOutput.value === undefined
                            ? "(null)"
                            : codeOutput.value === ""
                            ? "(empty output)"
                            : typeof codeOutput.value === "object"
                            ? JSON.stringify(codeOutput.value, null, 2)
                            : String(codeOutput.value)}
                        </div>
                      </div>
                    )}

                    {/* Console Output Section - Inside Modal */}
                    {consoleOutput.length > 0 && (
                      <div className="border-t border-slate-700 bg-slate-900 p-4 flex-shrink-0 max-h-32 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon
                            icon="mingcute:terminal-line"
                            width={16}
                            className="text-slate-400"
                          />
                          <h4 className="font-semibold text-slate-300 text-sm">
                            Console Output
                          </h4>
                        </div>
                        <div className="bg-slate-950 rounded p-2 font-mono text-xs text-slate-300 space-y-1">
                          {consoleOutput.map((log, idx) => (
                            <div
                              key={idx}
                              className="whitespace-pre-wrap break-all"
                            >
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col bg-slate-900 overflow-y-auto">
                    <div className="p-6 space-y-6">
                      {/* Solution Code */}
                      {selectedChallenge.solutionCode && (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                            <Icon icon="mingcute:code-line" width={20} />
                            Solution Code
                          </h3>
                          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                            <Editor
                              height="400px"
                              language="python"
                              value={selectedChallenge.solutionCode}
                              theme="vs-dark"
                              options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontSize: 14,
                                lineNumbers: "on",
                                wordWrap: "on",
                                automaticLayout: true,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Solution Framework */}
                      {selectedChallenge.solutionFramework && (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-100 mb-3">
                            Solution Framework
                          </h3>
                          <div className="bg-slate-800 border-l-4 border-blue-500 rounded-lg p-4">
                            <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                              {selectedChallenge.solutionFramework}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Best Practices */}
                      {selectedChallenge.bestPractices && (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-100 mb-3">
                            Best Practices
                          </h3>
                          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                            <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                              {selectedChallenge.bestPractices}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Real World Scenario */}
                      {selectedChallenge.realWorldScenario && (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-100 mb-3">
                            Real-World Context
                          </h3>
                          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                            <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                              {selectedChallenge.realWorldScenario}
                            </p>
                          </div>
                        </div>
                      )}

                      {!selectedChallenge.solutionCode &&
                        !selectedChallenge.solutionFramework &&
                        !selectedChallenge.bestPractices &&
                        !selectedChallenge.realWorldScenario && (
                          <div className="text-center py-12">
                            <p className="text-slate-400">
                              No solution details available for this challenge.
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* Test Results Section - Only show in problem view */}
                {activeView === "problem" && testResults && (
                  <div className="border-t border-slate-700 bg-slate-800 p-4 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-100">
                        Test Results
                      </h4>
                      <div
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          testResults.success &&
                          testResults.testResults?.every((r: any) => r.passed)
                            ? "bg-green-600 text-white"
                            : testResults.testResults?.some(
                                (r: any) => r.passed
                              )
                            ? "bg-yellow-600 text-white"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {testResults.testResults?.filter((r: any) => r.passed)
                          .length || 0}{" "}
                        / {testResults.testResults?.length || 0} Passed
                      </div>
                    </div>
                    {testResults.message && (
                      <div
                        className={`mb-3 p-2 rounded text-sm ${
                          testResults.success
                            ? "bg-green-900/30 text-green-300"
                            : "bg-red-900/30 text-red-300"
                        }`}
                      >
                        {testResults.message}
                      </div>
                    )}
                    {testResults.testResults &&
                    testResults.testResults.length > 0 ? (
                      <div className="space-y-3">
                        {testResults.testResults.map(
                          (result: any, idx: number) => {
                            // Parse JSON strings back to readable format
                            const parseValue = (val: string) => {
                              try {
                                const parsed = JSON.parse(val);
                                return typeof parsed === "object"
                                  ? JSON.stringify(parsed, null, 2)
                                  : String(parsed);
                              } catch {
                                return val;
                              }
                            };

                            return (
                              <div
                                key={idx}
                                className={`p-4 rounded-lg border-2 ${
                                  result.passed
                                    ? "bg-green-900/20 border-green-600"
                                    : "bg-red-900/20 border-red-600"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <Icon
                                    icon={
                                      result.passed
                                        ? "mingcute:check-circle-line"
                                        : "mingcute:close-circle-line"
                                    }
                                    width={20}
                                    className={
                                      result.passed
                                        ? "text-green-400"
                                        : "text-red-400"
                                    }
                                  />
                                  <span className="font-semibold text-slate-100">
                                    Test Case {result.testCase}
                                  </span>
                                  {result.executionTime && (
                                    <span className="text-xs text-slate-400 ml-auto bg-slate-700 px-2 py-1 rounded">
                                      {result.executionTime.toFixed(2)}ms
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="bg-slate-900/50 rounded p-2">
                                    <div className="text-slate-400 text-xs mb-1 font-medium">
                                      Input:
                                    </div>
                                    <code className="text-slate-200 text-xs font-mono block whitespace-pre-wrap break-all">
                                      {parseValue(result.input)}
                                    </code>
                                  </div>
                                  <div className="bg-slate-900/50 rounded p-2">
                                    <div className="text-slate-400 text-xs mb-1 font-medium">
                                      Expected Output:
                                    </div>
                                    <code className="text-green-300 text-xs font-mono block whitespace-pre-wrap break-all">
                                      {parseValue(result.expectedOutput)}
                                    </code>
                                  </div>
                                  <div
                                    className={`rounded p-2 ${
                                      result.passed
                                        ? "bg-green-900/30"
                                        : "bg-red-900/30"
                                    }`}
                                  >
                                    <div className="text-slate-400 text-xs mb-1 font-medium">
                                      Your Output:
                                    </div>
                                    <code
                                      className={`text-xs font-mono block whitespace-pre-wrap break-all ${
                                        result.passed
                                          ? "text-green-300"
                                          : "text-red-300"
                                      }`}
                                    >
                                      {result.actualOutput === "Error" ||
                                      result.actualOutput === "Execution Error"
                                        ? result.error || result.actualOutput
                                        : parseValue(result.actualOutput)}
                                    </code>
                                  </div>
                                  {result.error &&
                                    result.actualOutput !== "Error" && (
                                      <div className="bg-red-900/50 rounded p-2 border border-red-700">
                                        <div className="text-red-300 text-xs font-medium">
                                          Error:
                                        </div>
                                        <div className="text-red-400 text-xs mt-1">
                                          {result.error}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-sm">
                        No test cases available for this problem.
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback Section - Only show in problem view */}
                {activeView === "problem" && feedback && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50 max-h-96 overflow-y-auto">
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
                    <div className="bg-white rounded-lg p-4 border border-slate-300">
                      <div className="prose prose-sm max-w-none prose-slate prose-headings:text-slate-900 prose-headings:text-base prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:text-slate-700 prose-p:text-sm prose-p:leading-relaxed prose-p:my-2 prose-strong:text-slate-900 prose-strong:font-semibold prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:text-xs prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-ul:text-sm prose-ul:my-2 prose-ul:space-y-1 prose-ol:text-sm prose-ol:my-2 prose-ol:space-y-1 prose-li:text-slate-700 prose-li:my-1 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-slate-300 prose-blockquote:pl-4 prose-blockquote:italic prose-hr:border-slate-200 prose-hr:my-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {feedback.feedback || ""}
                        </ReactMarkdown>
                      </div>
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
