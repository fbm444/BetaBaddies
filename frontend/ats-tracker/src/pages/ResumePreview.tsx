import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../config/routes";
import { Resume } from "../types";
import { resumeService } from "../services/resumeService";

export function ResumePreview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get("id");

  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Mock data for preview
  useEffect(() => {
    if (resumeId) {
      setTimeout(() => {
        setResume({
          id: resumeId,
          userId: "user1",
          name: "Software Engineer Resume",
          description: "Tailored for tech positions",
          templateId: "template1",
          content: {
            personalInfo: {
              firstName: "John",
              lastName: "Doe",
              email: "john.doe@example.com",
              phone: "+1 (555) 123-4567",
              location: "San Francisco, CA",
              linkedIn: "linkedin.com/in/johndoe",
              portfolio: "johndoe.dev",
            },
            summary: "Experienced software engineer with 5+ years of experience building scalable web applications using modern technologies.",
            experience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: [],
          },
          sectionConfig: {},
          customizations: {
            colors: { primary: "#3351FD", secondary: "#000", text: "#000", background: "#fff" },
            fonts: { heading: "Inter", body: "Inter" },
            spacing: { section: 24, item: 12 },
          },
          versionNumber: 1,
          isMaster: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setIsLoading(false);
      }, 500);
    }
  }, [resumeId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'txt' | 'html') => {
    if (!resumeId) return;
    
    try {
      setExporting(true);
      setShowExportMenu(false);
      
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
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mingcute:loading-line" className="w-12 h-12 animate-spin mx-auto text-[#3351FD]" />
          <p className="mt-4 text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mingcute:alert-line" className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Resume not found</h3>
          <button
            onClick={() => navigate(ROUTES.RESUMES)}
            className="mt-4 px-6 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors"
          >
            Back to Resumes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(ROUTES.RESUMES)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="mingcute:arrow-left-line" className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{resume.name || resume.versionName}</h1>
                <p className="text-xs text-gray-500">Preview Mode</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`${ROUTES.RESUME_BUILDER}?id=${resume.id}`)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Icon icon="mingcute:edit-line" className="w-4 h-4 inline mr-2" />
                Edit
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <Icon icon="mingcute:loading-line" className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Icon icon="mingcute:download-line" className="w-4 h-4" />
                      Export
                      <Icon icon="mingcute:arrow-down-line" className="w-3 h-3" />
                    </>
                  )}
                </button>
                {showExportMenu && !exporting && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100"
                    >
                      <Icon icon="mingcute:file-pdf-line" className="w-4 h-4 text-red-600" />
                      Export as PDF
                    </button>
                    <button
                      onClick={() => handleExport('docx')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100"
                    >
                      <Icon icon="mingcute:file-word-line" className="w-4 h-4 text-blue-600" />
                      Export as DOCX
                    </button>
                    <button
                      onClick={() => handleExport('html')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100"
                    >
                      <Icon icon="mingcute:file-html-line" className="w-4 h-4 text-orange-600" />
                      Export as HTML
                    </button>
                    <button
                      onClick={() => handleExport('txt')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <Icon icon="mingcute:file-text-line" className="w-4 h-4 text-gray-600" />
                      Export as TXT
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                <Icon icon="mingcute:print-line" className="w-4 h-4 inline mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Preview */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-lg p-12 print:shadow-none print:p-8">
          {/* Personal Info */}
          <div className="text-center border-b pb-6 mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {resume.content.personalInfo.firstName} {resume.content.personalInfo.lastName}
            </h1>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm text-gray-600 flex-wrap">
              {resume.content.personalInfo.email && (
                <span className="flex items-center gap-1">
                  <Icon icon="mingcute:mail-line" className="w-4 h-4" />
                  {resume.content.personalInfo.email}
                </span>
              )}
              {resume.content.personalInfo.phone && (
                <span className="flex items-center gap-1">
                  <Icon icon="mingcute:phone-line" className="w-4 h-4" />
                  {resume.content.personalInfo.phone}
                </span>
              )}
              {resume.content.personalInfo.location && (
                <span className="flex items-center gap-1">
                  <Icon icon="mingcute:map-pin-line" className="w-4 h-4" />
                  {resume.content.personalInfo.location}
                </span>
              )}
              {resume.content.personalInfo.linkedIn && (
                <span className="flex items-center gap-1">
                  <Icon icon="mingcute:linkedin-line" className="w-4 h-4" />
                  {resume.content.personalInfo.linkedIn}
                </span>
              )}
              {resume.content.personalInfo.portfolio && (
                <span className="flex items-center gap-1">
                  <Icon icon="mingcute:link-line" className="w-4 h-4" />
                  {resume.content.personalInfo.portfolio}
                </span>
              )}
            </div>
          </div>

          {/* Summary */}
          {resume.content.summary && (
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Summary</h2>
              <p className="text-gray-700 leading-relaxed">{resume.content.summary}</p>
            </div>
          )}

          {/* Experience */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Experience</h2>
            {resume.content.experience.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No experience entries yet</p>
            ) : (
              <div className="space-y-4">
                {resume.content.experience.map((exp) => (
                  <div key={exp.id} className="border-l-2 border-gray-300 pl-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{exp.title}</h3>
                      <span className="text-sm text-gray-600">
                        {exp.startDate} - {exp.isCurrent ? "Present" : exp.endDate}
                      </span>
                    </div>
                    <p className="text-gray-700 font-medium mb-2">{exp.company}</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {exp.description.map((desc, idx) => (
                        <li key={idx}>{desc}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Education */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Education</h2>
            {resume.content.education.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No education entries yet</p>
            ) : (
              <div className="space-y-3">
                {resume.content.education.map((edu) => (
                  <div key={edu.id}>
                    <h3 className="text-lg font-semibold text-gray-900">{edu.degree}</h3>
                    <p className="text-gray-700">{edu.school}</p>
                    {edu.field && <p className="text-gray-600 text-sm">{edu.field}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Skills</h2>
            {resume.content.skills.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No skills yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {resume.content.skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </div>
  );
}

