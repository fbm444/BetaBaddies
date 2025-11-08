import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../config/routes";
import { Resume } from "../types";
import { resumeService } from "../services/resumeService";

export function Resumes() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'master' | 'versions'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);

  // Fetch resumes from API (or use mock data if API fails)
  useEffect(() => {
    const fetchResumes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await resumeService.getResumes();
        if (response.ok && response.data) {
          setResumes(response.data.resumes);
        }
      } catch (err: any) {
        // If API fails, use mock data for preview
        console.log("API not available, using mock data for preview:", err.message);
        setResumes([
          {
            id: "1",
            userId: "user1",
            versionName: "Software Engineer Resume",
            description: "Tailored for tech positions",
            templateId: "default-chronological",
            content: null,
            sectionConfig: null,
            customizations: null,
            versionNumber: 1,
            parentResumeId: null,
            isMaster: true,
            file: null,
            commentsId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name: "Software Engineer Resume",
          },
          {
            id: "2",
            userId: "user1",
            versionName: "Product Manager Resume",
            description: "For PM roles",
            templateId: "default-functional",
            content: null,
            sectionConfig: null,
            customizations: null,
            versionNumber: 1,
            parentResumeId: null,
            isMaster: true,
            file: null,
            commentsId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name: "Product Manager Resume",
          },
          {
            id: "3",
            userId: "user1",
            versionName: "Data Scientist Resume",
            description: "ML and analytics focus",
            templateId: "default-hybrid",
            content: null,
            sectionConfig: null,
            customizations: null,
            versionNumber: 2,
            parentResumeId: "1",
            isMaster: false,
            file: null,
            commentsId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name: "Data Scientist Resume",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResumes();
  }, []);

  const filteredResumes = resumes.filter((resume) => {
    if (filter === 'master' && !resume.isMaster) return false;
    if (filter === 'versions' && resume.isMaster) return false;
    const name = resume.name || resume.versionName || '';
    if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleCreateResume = () => {
    navigate(`${ROUTES.RESUME_TEMPLATES}?create=true`);
  };

  const handleEditResume = (id: string) => {
    navigate(`${ROUTES.RESUME_BUILDER}?id=${id}`);
  };

  const handlePreviewResume = (id: string) => {
    navigate(`${ROUTES.RESUME_PREVIEW}?id=${id}`);
  };

  const handleDuplicateResume = async (id: string) => {
    try {
      const response = await resumeService.duplicateResume(id);
      if (response.ok) {
        // Refresh resumes list
        const resumesResponse = await resumeService.getResumes();
        if (resumesResponse.ok && resumesResponse.data) {
          setResumes(resumesResponse.data.resumes);
        }
      }
    } catch (err: any) {
      // Mock mode - just show alert
      alert("Duplicate functionality will work once database is set up");
      console.log("Would duplicate resume:", id);
    }
  };

  const handleDeleteResume = async (id: string) => {
    if (confirm("Are you sure you want to delete this resume?")) {
      try {
        await resumeService.deleteResume(id);
        setResumes(resumes.filter((r) => r.id !== id));
      } catch (err: any) {
        // Mock mode - remove from local state
        setResumes(resumes.filter((r) => r.id !== id));
        console.log("Would delete resume:", id);
      }
    }
  };

  const handleExport = async (resumeId: string, format: 'pdf' | 'docx' | 'txt' | 'html') => {
    try {
      setExportingId(resumeId);
      setShowExportMenu(null);
      
      let blob: Blob;
      const resume = resumes.find(r => r.id === resumeId);
      const filename = resume?.name || resume?.versionName || `resume_${resumeId}`;

      switch (format) {
        case 'pdf':
          const pdfResult = await resumeService.exportPDF(resumeId, { filename: `${filename}.pdf` });
          resumeService.downloadBlob(pdfResult.blob, pdfResult.filename);
          break;
        case 'docx':
          const docxResult = await resumeService.exportDOCX(resumeId, { filename: `${filename}.docx` });
          resumeService.downloadBlob(docxResult.blob, docxResult.filename);
          break;
        case 'txt':
          const txtResult = await resumeService.exportTXT(resumeId, { filename: `${filename}.txt` });
          resumeService.downloadBlob(txtResult.blob, txtResult.filename);
          break;
        case 'html':
          const htmlResult = await resumeService.exportHTML(resumeId, { filename: `${filename}.html` });
          resumeService.downloadBlob(htmlResult.blob, htmlResult.filename);
          break;
      }
    } catch (err: any) {
      // Mock mode - show alert
      alert(`Export to ${format.toUpperCase()} will work once database is set up. For now, this is just a preview.`);
      console.log("Would export resume:", resumeId, "as", format);
    } finally {
      setExportingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mingcute:loading-line" className="w-12 h-12 animate-spin mx-auto text-[#3351FD]" />
          <p className="mt-4 text-gray-600">Loading resumes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mingcute:alert-circle-line" className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors"
          >
            Retry
          </button>
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
              <h1 className="text-3xl font-bold text-gray-900">My Resumes</h1>
              <p className="text-gray-600 mt-1">Manage and create tailored resumes for different positions</p>
            </div>
            <button
              onClick={handleCreateResume}
              className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              <Icon icon="mingcute:add-line" className="w-5 h-5" />
              Create New Resume
            </button>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <div className="flex-1">
              <div className="relative">
                <Icon
                  icon="mingcute:search-line"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                />
                <input
                  type="text"
                  placeholder="Search resumes..."
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

        {/* Resumes Grid */}
        {filteredResumes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Icon icon="mingcute:file-line" className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No resumes found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? "Try adjusting your search" : "Get started by creating your first resume"}
            </p>
            <button
              onClick={handleCreateResume}
              className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              <Icon icon="mingcute:add-line" className="w-5 h-5" />
              Create New Resume
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResumes.map((resume) => (
              <div
                key={resume.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Resume Preview Card */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{resume.name || resume.versionName}</h3>
                      {resume.isMaster && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Master
                        </span>
                      )}
                    </div>
                    {resume.description && (
                      <p className="text-sm text-gray-600 mb-2">{resume.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Icon icon="mingcute:time-line" className="w-4 h-4" />
                        {new Date(resume.updatedAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon icon="mingcute:file-line" className="w-4 h-4" />
                        v{resume.versionNumber || 1}
                      </span>
                    </div>
                  </div>
                </div>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditResume(resume.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors text-sm font-medium"
                    >
                      <Icon icon="mingcute:edit-line" className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handlePreviewResume(resume.id)}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Preview"
                    >
                      <Icon icon="mingcute:eye-line" className="w-4 h-4 text-gray-700" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowExportMenu(showExportMenu === resume.id ? null : resume.id)}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Export"
                        disabled={exportingId === resume.id}
                      >
                        {exportingId === resume.id ? (
                          <Icon icon="mingcute:loading-line" className="w-4 h-4 text-gray-700 animate-spin" />
                        ) : (
                          <Icon icon="mingcute:download-line" className="w-4 h-4 text-gray-700" />
                        )}
                      </button>
                      {showExportMenu === resume.id && (
                        <div className="absolute right-0 bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                          <button
                            onClick={() => handleExport(resume.id, 'pdf')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Icon icon="mingcute:file-pdf-line" className="w-4 h-4 text-red-600" />
                            Export PDF
                          </button>
                          <button
                            onClick={() => handleExport(resume.id, 'docx')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Icon icon="mingcute:file-word-line" className="w-4 h-4 text-blue-600" />
                            Export DOCX
                          </button>
                          <button
                            onClick={() => handleExport(resume.id, 'html')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Icon icon="mingcute:file-html-line" className="w-4 h-4 text-orange-600" />
                            Export HTML
                          </button>
                          <button
                            onClick={() => handleExport(resume.id, 'txt')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Icon icon="mingcute:file-text-line" className="w-4 h-4 text-gray-600" />
                            Export TXT
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDuplicateResume(resume.id)}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Duplicate"
                    >
                      <Icon icon="mingcute:file-copy-line" className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      onClick={() => handleDeleteResume(resume.id)}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Icon icon="mingcute:delete-line" className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowExportMenu(null)}
        />
      )}
    </div>
  );
}

