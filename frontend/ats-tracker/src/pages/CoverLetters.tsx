import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../config/routes";
import { CoverLetter } from "../types";
import { coverLetterService } from "../services/coverLetterService";

export function CoverLetters() {
  const navigate = useNavigate();
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'master' | 'versions'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-[#3351FD]"
          />
          <p className="mt-4 text-gray-600">Loading cover letters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cover Letters</h1>
              <p className="text-gray-600 mt-1">
                Manage and create professional cover letters
              </p>
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 bg-[#3351FD] text-white px-6 py-3 rounded-lg hover:bg-[#2a45d4] transition-colors font-medium"
            >
              <Icon icon="mingcute:add-line" className="w-5 h-5" />
              Create New
            </button>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Icon
                  icon="mingcute:search-line"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                />
                <input
                  type="text"
                  placeholder="Search cover letters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-[#3351FD] text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('master')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'master'
                    ? 'bg-[#3351FD] text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Master
              </button>
              <button
                onClick={() => setFilter('versions')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'versions'
                    ? 'bg-[#3351FD] text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Versions
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Cover Letters Grid */}
        {filteredCoverLetters.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Icon
              icon="mingcute:mail-line"
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No cover letters found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? "Try adjusting your search criteria"
                : "Get started by creating your first cover letter"}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 bg-[#3351FD] text-white px-6 py-3 rounded-lg hover:bg-[#2a45d4] transition-colors font-medium"
              >
                <Icon icon="mingcute:add-line" className="w-5 h-5" />
                Create Cover Letter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoverLetters.map((coverLetter) => (
              <div
                key={coverLetter.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {coverLetter.name || coverLetter.versionName || "Untitled"}
                    </h3>
                    {coverLetter.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {coverLetter.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {coverLetter.isMaster && (
                        <span className="flex items-center gap-1">
                          <Icon icon="mingcute:star-fill" className="w-3 h-3" />
                          Master
                        </span>
                      )}
                      <span>v{coverLetter.versionNumber}</span>
                      <span>
                        {new Date(coverLetter.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(coverLetter.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#3351FD] text-white px-4 py-2 rounded-lg hover:bg-[#2a45d4] transition-colors font-medium text-sm"
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
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Export"
                    >
                      <Icon
                        icon="mingcute:download-line"
                        className="w-4 h-4 text-gray-700"
                      />
                    </button>
                    {showExportMenu === coverLetter.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => handleExport(coverLetter.id, 'pdf')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                          disabled={exportingId === coverLetter.id}
                        >
                          <Icon icon="mingcute:file-pdf-line" className="w-4 h-4" />
                          Export PDF
                        </button>
                        <button
                          onClick={() => handleExport(coverLetter.id, 'docx')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                          disabled={exportingId === coverLetter.id}
                        >
                          <Icon icon="mingcute:file-word-line" className="w-4 h-4" />
                          Export DOCX
                        </button>
                        <button
                          onClick={() => handleExport(coverLetter.id, 'txt')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                          disabled={exportingId === coverLetter.id}
                        >
                          <Icon icon="mingcute:file-text-line" className="w-4 h-4" />
                          Export TXT
                        </button>
                        <button
                          onClick={() => handleExport(coverLetter.id, 'html')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                          disabled={exportingId === coverLetter.id}
                        >
                          <Icon icon="mingcute:file-html-line" className="w-4 h-4" />
                          Export HTML
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDuplicate(coverLetter.id)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Duplicate"
                  >
                    <Icon icon="mingcute:copy-line" className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => handleDelete(coverLetter.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
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
    </div>
  );
}

