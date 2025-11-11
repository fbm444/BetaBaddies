import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../config/routes";
import { CoverLetter, JobOpportunityData } from "../types";
import { coverLetterService } from "../services/coverLetterService";
import { api } from "../services/api";

export function CoverLetters() {
  const navigate = useNavigate();
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'master' | 'versions'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);
  
  // AI Generation state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [jobs, setJobs] = useState<JobOpportunityData[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch cover letters from API
  useEffect(() => {
    const fetchCoverLetters = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await coverLetterService.getCoverLetters();
        if (response.ok && response.data) {
          setCoverLetters(response.data.coverLetters);
        }
      } catch (err: any) {
        console.log("API not available, using mock data for preview:", err.message);
        setCoverLetters([]);
        setError("Failed to load cover letters. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoverLetters();
  }, []);

  const filteredCoverLetters = coverLetters.filter((cl) => {
    if (filter === 'master' && !cl.isMaster) return false;
    if (filter === 'versions' && cl.isMaster) return false;
    const name = cl.name || cl.versionName || '';
    if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleCreateNew = () => {
    navigate(`${ROUTES.COVER_LETTER_TEMPLATES}?create=true`);
  };

  const handleOpenGenerateModal = async () => {
    try {
      const response = await api.getJobOpportunities();
      if (response.data) {
        setJobs(response.data.jobOpportunities);
      }
      setShowGenerateModal(true);
    } catch (err: any) {
      setError("Failed to load jobs. Please try again.");
    }
  };

  const handleGenerate = async () => {
    if (!selectedJobId) {
      setError("Please select a job");
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const selectedJob = jobs.find(j => j.id === selectedJobId);
      if (!selectedJob) {
        setError("Job not found");
        return;
      }

      // Create cover letter with auto-generated name
      const coverLetterName = `${selectedJob.company} - ${selectedJob.title} Cover Letter`;
      
      const createResponse = await coverLetterService.createCoverLetter({
        versionName: coverLetterName,
        description: `Cover letter for ${selectedJob.title} at ${selectedJob.company}`,
        jobId: selectedJobId,
      });

      if (!createResponse.ok || !createResponse.data) {
        throw new Error("Failed to create cover letter");
      }

      const coverLetterId = createResponse.data.coverLetter.id;

      // Generate AI content with company research
      await coverLetterService.generateContent(coverLetterId, {
        jobId: selectedJobId,
        includeCompanyResearch: true,
      });

      // Refresh list
      const refreshResponse = await coverLetterService.getCoverLetters();
      if (refreshResponse.ok && refreshResponse.data) {
        setCoverLetters(refreshResponse.data.coverLetters);
      }

      // Close modal and navigate to builder
      setShowGenerateModal(false);
      setSelectedJobId("");
      navigate(`${ROUTES.COVER_LETTER_BUILDER}?id=${coverLetterId}`);
      
    } catch (err: any) {
      console.error("Failed to generate cover letter:", err);
      setError(err.message || "Failed to generate cover letter. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`${ROUTES.COVER_LETTER_BUILDER}?id=${id}`);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this cover letter?")) {
      return;
    }

    try {
      await coverLetterService.deleteCoverLetter(id);
      setCoverLetters(coverLetters.filter((cl) => cl.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete cover letter");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await coverLetterService.duplicateCoverLetter(id);
      if (response.ok && response.data) {
        setCoverLetters([...coverLetters, response.data.coverLetter]);
      }
    } catch (err: any) {
      alert(err.message || "Failed to duplicate cover letter");
    }
  };

  const handleExport = async (id: string, format: 'pdf' | 'docx' | 'txt' | 'html') => {
    try {
      setExportingId(id);
      let result;
      
      switch (format) {
        case 'pdf':
          result = await coverLetterService.exportPDF(id);
          break;
        case 'docx':
          result = await coverLetterService.exportDOCX(id);
          break;
        case 'txt':
          result = await coverLetterService.exportTXT(id);
          break;
        case 'html':
          result = await coverLetterService.exportHTML(id);
          break;
      }
      
      coverLetterService.downloadBlob(result.blob, result.filename);
      setShowExportMenu(null);
    } catch (err: any) {
      alert(err.message || "Failed to export cover letter");
    } finally {
      setExportingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6FB] flex items-center justify-center font-poppins">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-[#5B72FF]"
          />
          <p className="mt-4 text-[#6F7A97]">Loading cover letters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FB] py-10 font-poppins">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[42px] leading-[1.1] font-semibold text-[#0F172A]">
                Cover Letters
              </h1>
              <p className="text-base text-[#6F7A97] mt-1.5">
                Manage and create professional cover letters
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleOpenGenerateModal}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-white transition-all text-sm font-semibold bg-gradient-to-r from-[#3351FD] to-[#5B72FF] hover:opacity-90"
              >
                <Icon icon="mingcute:sparkles-line" className="w-5 h-5" />
                AI Generate for Job
              </button>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-white transition-all text-sm font-semibold bg-gradient-to-r from-[#845BFF] to-[#F551A2] hover:opacity-90"
              >
                <Icon icon="mingcute:add-line" className="w-5 h-5" />
                Create From Template
              </button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 mt-6">
            <div className="flex-1">
              <label className="relative block">
                <Icon
                  icon="mingcute:search-line"
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9AA4C2] w-[18px] h-[18px]"
                />
                <input
                  type="text"
                  placeholder="Search cover letters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 rounded-full border border-[#DDE2F2] bg-white text-sm text-[#1B2559] placeholder-[#9AA4C2] focus:outline-none focus:ring-2 focus:ring-[#5B72FF] focus:border-transparent transition-all"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-black text-white'
                    : 'bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('master')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === 'master'
                    ? 'bg-black text-white'
                    : 'bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]'
                }`}
              >
                Master
              </button>
              <button
                onClick={() => setFilter('versions')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === 'versions'
                    ? 'bg-black text-white'
                    : 'bg-white text-[#1B2559] border border-[#DDE2F2] hover:bg-[#F4F6FB]'
                }`}
              >
                Versions
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Cover Letters Grid */}
        {filteredCoverLetters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[28px] border border-dashed border-[#DCE1F1]">
            <Icon
              icon="mingcute:mail-line"
              className="w-16 h-16 mx-auto text-[#C2CAE6] mb-4"
            />
            <h3 className="text-xl font-semibold text-[#0F172A] mb-2">
              No cover letters found
            </h3>
            <p className="text-[#6F7A97] mb-6">
              {searchQuery
                ? "Try adjusting your search criteria"
                : "Get started by creating your first cover letter"}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white transition-all text-sm font-semibold bg-gradient-to-r from-[#845BFF] to-[#F551A2] hover:opacity-90"
              >
                <Icon icon="mingcute:ai-fill" className="w-5 h-5" />
                Create Cover Letter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCoverLetters.map((coverLetter) => (
              <div
                key={coverLetter.id}
                className="bg-white rounded-[26px] border border-[#E2E8F8] transition-all overflow-hidden flex flex-col hover:border-[#C3CCE8]"
              >
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-[#0F172A] truncate">
                          {coverLetter.name || coverLetter.versionName || "Untitled"}
                        </h3>
                        {coverLetter.isMaster && (
                          <span className="px-2.5 py-1 text-[11px] font-semibold bg-[#EEF1FF] text-[#5B72FF] rounded-full flex-shrink-0">
                            Master
                          </span>
                        )}
                      </div>
                      {coverLetter.description ? (
                        <p className="text-sm text-[#6F7A97] mb-2 line-clamp-2">
                          {coverLetter.description}
                        </p>
                      ) : (
                        <div className="h-4 mb-2" />
                      )}
                      <div className="flex items-center gap-3 text-xs text-[#8A94AD]">
                        <span className="flex items-center gap-1">
                          <Icon icon="mingcute:file-line" className="w-4 h-4" />
                          v{coverLetter.versionNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon icon="mingcute:time-line" className="w-4 h-4" />
                          {new Date(coverLetter.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#EDF1FD] px-4 py-3 bg-[#F8FAFF] flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(coverLetter.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-[#5B72FF] text-white rounded-full hover:bg-[#4a62ef] transition-colors text-sm font-semibold"
                  >
                    <Icon icon="mingcute:edit-line" className="w-4 h-4" />
                    Edit
                  </button>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setShowExportMenu(
                          showExportMenu === coverLetter.id ? null : coverLetter.id
                        )
                      }
                      className="px-3 py-2.5 border border-[#DDE2F2] rounded-full hover:bg-white transition-colors"
                      title="Export"
                    >
                      <Icon
                        icon="mingcute:download-line"
                        className="w-4 h-4 text-[#1B2559]"
                      />
                    </button>
                    {showExportMenu === coverLetter.id && (
                      <div className="absolute right-0 bottom-full mb-2 w-44 bg-white border border-[#E2E8F8] rounded-xl z-10">
                        <button
                          onClick={() => handleExport(coverLetter.id, 'pdf')}
                          className="w-full text-left px-4 py-2 hover:bg-[#F8FAFF] text-sm flex items-center gap-2 text-[#1B2559]"
                          disabled={exportingId === coverLetter.id}
                        >
                          <Icon icon="mingcute:file-pdf-line" className="w-4 h-4 text-red-500" />
                          Export PDF
                        </button>
                        <button
                          onClick={() => handleExport(coverLetter.id, 'docx')}
                          className="w-full text-left px-4 py-2 hover:bg-[#F8FAFF] text-sm flex items-center gap-2 text-[#1B2559]"
                          disabled={exportingId === coverLetter.id}
                        >
                          <Icon icon="mingcute:file-word-line" className="w-4 h-4 text-[#3351FD]" />
                          Export DOCX
                        </button>
                        <button
                          onClick={() => handleExport(coverLetter.id, 'txt')}
                          className="w-full text-left px-4 py-2 hover:bg-[#F8FAFF] text-sm flex items-center gap-2 text-[#1B2559]"
                          disabled={exportingId === coverLetter.id}
                        >
                          <Icon icon="mingcute:file-text-line" className="w-4 h-4 text-[#6F7A97]" />
                          Export TXT
                        </button>
                        <button
                          onClick={() => handleExport(coverLetter.id, 'html')}
                          className="w-full text-left px-4 py-2 hover:bg-[#F8FAFF] text-sm flex items-center gap-2 text-[#1B2559]"
                          disabled={exportingId === coverLetter.id}
                        >
                          <Icon icon="mingcute:file-html-line" className="w-4 h-4 text-orange-500" />
                          Export HTML
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDuplicate(coverLetter.id)}
                    className="px-3 py-2.5 border border-[#DDE2F2] rounded-full hover:bg-white transition-colors"
                    title="Duplicate"
                  >
                    <Icon icon="mingcute:copy-line" className="w-4 h-4 text-[#1B2559]" />
                  </button>
                  <button
                    onClick={() => handleDelete(coverLetter.id)}
                    className="px-3 py-2.5 border border-red-300 text-red-600 rounded-full hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Icon icon="mingcute:delete-line" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Generate Cover Letter</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} height={24} />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Select a job to generate a tailored cover letter with AI
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

            <div className="flex gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedJobId}
                className="flex-1 px-4 py-2 bg-[#3351FD] text-white rounded-md text-sm font-medium hover:bg-[#2641DD] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Icon icon="mingcute:loading-line" className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon icon="mingcute:sparkles-line" className="w-5 h-5" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

