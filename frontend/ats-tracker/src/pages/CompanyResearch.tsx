import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import companyResearchService, {
  type ResearchedCompany,
  type CompleteCompanyResearch,
  type AISummary,
} from "../services/companyResearchService";
import { api } from "../services/api";
import type { JobOpportunityData } from "../types";

export function CompanyResearch() {
  const [isLoading, setIsLoading] = useState(true);
  const [companies, setCompanies] = useState<ResearchedCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompleteCompanyResearch | null>(null);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [jobs, setJobs] = useState<JobOpportunityData[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResearchedCompanies();
  }, []);

  const fetchResearchedCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await companyResearchService.getResearchedCompanies();
      setCompanies(data);
    } catch (err: any) {
      console.error("Failed to fetch researched companies:", err);
      setError("Failed to load companies. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await api.getJobOpportunities();
      if (response.data) {
        setJobs(response.data.jobOpportunities);
      }
    } catch (err: any) {
      console.error("Failed to fetch jobs:", err);
      setError("Failed to load jobs. Please try again.");
    }
  };

  const handleOpenModal = async () => {
    await fetchJobs();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJobId("");
    setError(null);
  };

  const handleResearchCompany = async () => {
    if (!selectedJobId) {
      setError("Please select a job");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Trigger automated research (Abstract API + NewsAPI + OpenAI)
      await companyResearchService.fetchCompanyResearch(selectedJobId);

      await fetchResearchedCompanies();
      handleCloseModal();
    } catch (err: any) {
      console.error("Failed to research company:", err);
      setError(err.response?.data?.error?.message || err.message || "Failed to research company. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = async (company: ResearchedCompany) => {
    try {
      const details = await companyResearchService.getCompanyResearchByJobId(company.jobId);
      setSelectedCompany(details);
      setIsDetailModalOpen(true);
      setAiSummary(null); // Reset AI summary
      
      // Fetch AI summary in the background
      setIsLoadingAI(true);
      try {
        const summary = await companyResearchService.generateAISummary(company.jobId);
        setAiSummary(summary);
      } catch (aiErr: any) {
        console.error("Failed to generate AI summary:", aiErr);
        // Don't show error to user, just don't display AI summary
      } finally {
        setIsLoadingAI(false);
      }
    } catch (err: any) {
      console.error("Failed to fetch company details:", err);
      setError("Failed to load company details. Please try again.");
    }
  };

  const handleDeleteResearch = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this company research?")) {
      return;
    }

    try {
      await companyResearchService.deleteCompanyResearch(jobId);
      await fetchResearchedCompanies();
      if (selectedCompany?.jobId === jobId) {
        setIsDetailModalOpen(false);
        setSelectedCompany(null);
      }
    } catch (err: any) {
      console.error("Failed to delete company research:", err);
      setError("Failed to delete research. Please try again.");
    }
  };

  return (
    <div className="font-poppins min-h-full">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-light leading-tight"
            style={{ fontFamily: "Poppins" }}
          >
            <span className="font-semibold" style={{ color: "#3351FD" }}>
              Company
            </span>{" "}
            Research
          </h1>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-[#3351FD] text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:bg-[#2641DD] disabled:opacity-50 disabled:cursor-not-allowed self-start lg:self-auto"
            onClick={handleOpenModal}
            disabled={isLoading}
          >
            <Icon icon="mingcute:add-line" width={20} height={20} />
            Research Company
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          {isLoading ? (
            <div className="text-center py-16">
              <Icon
                icon="mingcute:loading-line"
                width={48}
                height={48}
                className="mx-auto mb-4 text-[#3351FD] animate-spin"
              />
              <p className="text-slate-600">Loading researched companies...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-16">
              <Icon
                icon="mingcute:building-line"
                width={64}
                height={64}
                className="mx-auto mb-4 text-slate-300"
              />
              <h3 className="text-xl font-medium text-slate-900 mb-2">
                No Company Research Yet
              </h3>
              <p className="text-slate-600 mb-6">
                Start researching companies to get insights about potential employers
              </p>
              <button
                className="px-6 py-3 bg-[#3351FD] text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:bg-[#2641DD]"
                onClick={handleOpenModal}
              >
                Research Your First Company
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewDetails(company)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {company.companyName}
                      </h3>
                      <p className="text-sm text-slate-600">{company.jobTitle}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteResearch(company.jobId);
                      }}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Icon icon="mingcute:delete-line" width={20} height={20} />
                    </button>
                  </div>
                  {company.industry && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                      <Icon icon="mingcute:building-2-line" width={16} height={16} />
                      <span>{company.industry}</span>
                    </div>
                  )}
                  {company.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Icon icon="mingcute:location-line" width={16} height={16} />
                      <span>{company.location}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Research Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Research Company</h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Icon icon="mingcute:close-line" width={24} height={24} />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Select a job from your opportunities to research the company
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Job
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3351FD]"
              >
                <option value="">Choose a job...</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} at {job.company}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResearchCompany}
                disabled={isSubmitting || !selectedJobId}
                className="flex-1 px-4 py-2 bg-[#3351FD] text-white rounded-md text-sm font-medium hover:bg-[#2641DD] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Researching..." : "Research"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-slate-900">
                Company Research Details
              </h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Icon icon="mingcute:close-line" width={24} height={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Company Info */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  Company Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCompany.industry && (
                    <div>
                      <p className="text-sm text-slate-600">Industry</p>
                      <p className="text-base text-slate-900">{selectedCompany.industry}</p>
                    </div>
                  )}
                  {selectedCompany.size && (
                    <div>
                      <p className="text-sm text-slate-600">Company Size</p>
                      <p className="text-base text-slate-900">{selectedCompany.size}</p>
                    </div>
                  )}
                  {selectedCompany.location && (
                    <div>
                      <p className="text-sm text-slate-600">Location</p>
                      <p className="text-base text-slate-900">{selectedCompany.location}</p>
                    </div>
                  )}
                  {selectedCompany.website && (
                    <div>
                      <p className="text-sm text-slate-600">Website</p>
                      <a
                        href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base text-[#3351FD] hover:underline"
                      >
                        {selectedCompany.website}
                      </a>
                    </div>
                  )}
                </div>
                {selectedCompany.description && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-600 mb-1">Description</p>
                    <p className="text-base text-slate-900">{selectedCompany.description}</p>
                  </div>
                )}
              </div>

              {/* Social Media */}
              {selectedCompany.media && selectedCompany.media.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Social Media</h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedCompany.media.map((media) => (
                      <a
                        key={media.id}
                        href={media.link && media.link.startsWith('http') ? media.link : `https://${media.link || ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                      >
                        <Icon icon="mingcute:link-line" width={16} height={16} />
                        <span className="text-sm">{media.platform}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insights */}
              {isLoadingAI && (
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon icon="mingcute:sparkles-line" width={20} height={20} className="text-[#3351FD]" />
                    <h3 className="text-lg font-semibold text-slate-900">AI Insights</h3>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Icon icon="mingcute:loading-line" width={20} height={20} className="animate-spin" />
                    <span className="text-sm">Generating AI insights...</span>
                  </div>
                </div>
              )}
              
              {!isLoadingAI && aiSummary && (
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon icon="mingcute:sparkles-line" width={20} height={20} className="text-[#3351FD]" />
                    <h3 className="text-lg font-semibold text-slate-900">AI Insights</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {aiSummary.mission && (
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2">Mission & Values</h4>
                        <p className="text-sm text-slate-600">{aiSummary.mission}</p>
                      </div>
                    )}
                    
                    {aiSummary.culture && (
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2">Company Culture</h4>
                        <p className="text-sm text-slate-600">{aiSummary.culture}</p>
                      </div>
                    )}
                    
                    {aiSummary.products && aiSummary.products.length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2">Products & Services</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {aiSummary.products.map((product, idx) => (
                            <li key={idx} className="text-sm text-slate-600">{product}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {aiSummary.competitors && aiSummary.competitors.length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2">Main Competitors</h4>
                        <div className="flex flex-wrap gap-2">
                          {aiSummary.competitors.map((competitor, idx) => (
                            <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                              {competitor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {aiSummary.whyWorkHere && (
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2">Why Work Here</h4>
                        <p className="text-sm text-slate-600">{aiSummary.whyWorkHere}</p>
                      </div>
                    )}
                    
                    {aiSummary.interviewTips && (
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2">Interview Tips</h4>
                        <p className="text-sm text-slate-600">{aiSummary.interviewTips}</p>
                      </div>
                    )}
                    
                    {aiSummary.recentDevelopments && (
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2">Recent Developments</h4>
                        <p className="text-sm text-slate-600">{aiSummary.recentDevelopments}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* News */}
              {selectedCompany.news && selectedCompany.news.length > 0 && (
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Recent News</h3>
                  <div className="space-y-4">
                    {selectedCompany.news.map((newsItem) => (
                      <div key={newsItem.id} className="border border-slate-200 rounded-md p-4">
                        <h4 className="font-medium text-slate-900 mb-2">{newsItem.heading}</h4>
                        {newsItem.description && (
                          <p className="text-sm text-slate-600 mb-2">{newsItem.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {newsItem.source && <span>{newsItem.source}</span>}
                          {newsItem.date && <span>{new Date(newsItem.date).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {(!selectedCompany.media || selectedCompany.media.length === 0) &&
                (!selectedCompany.news || selectedCompany.news.length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-slate-600">
                      No additional research data available yet. This will be populated when you run
                      the research automation.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
