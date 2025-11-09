import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Resume } from "../../types";

interface VersionControlProps {
  versions: Resume[];
  currentVersionId: string | null;
  onSelectVersion: (versionId: string) => void;
  onClose: () => void;
}

export function VersionControl({
  versions,
  currentVersionId,
  onSelectVersion,
  onClose,
}: VersionControlProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedVersions, setLoadedVersions] = useState<Map<string, Resume>>(
    new Map()
  );

  // Find initial index based on current version
  useEffect(() => {
    if (currentVersionId && versions.length > 0) {
      const index = versions.findIndex((v) => v.id === currentVersionId);
      if (index !== -1) {
        setCurrentIndex(index);
      } else {
        setCurrentIndex(0);
      }
    }
  }, [currentVersionId, versions]);

  // Safety check
  if (!versions || versions.length === 0) {
    return null;
  }

  const currentVersion = versions[currentIndex] || versions[0];
  if (!currentVersion) {
    return null;
  }
  const currentResume = loadedVersions.get(currentVersion.id) || currentVersion;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < versions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSelectVersion = (versionId: string) => {
    onSelectVersion(versionId);
  };

  const renderResumePreview = (resume: Resume) => {
    const customizations = resume.customizations || {};
    const colors = customizations.colors || {
      primary: "#3351FD",
      secondary: "#000000",
      text: "#000000",
      background: "#FFFFFF",
    };
    const fonts = customizations.fonts || {
      heading: "Inter",
      body: "Inter",
    };

    return (
      <div
        className="max-w-2xl mx-auto bg-white shadow-2xl p-8 rounded-xl border border-gray-100"
        style={{
          fontFamily: fonts.body || "Inter",
          backgroundColor: colors.background || "#FFFFFF",
        }}
      >
        {/* Personal Info */}
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h1
            className="text-3xl font-bold mb-2 tracking-tight"
            style={{
              color: colors.primary || "#3351FD",
              fontFamily: fonts.heading || "Inter",
            }}
          >
            {resume.content?.personalInfo?.firstName}{" "}
            {resume.content?.personalInfo?.lastName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            {resume.content?.personalInfo?.email && (
              <span className="flex items-center gap-1">
                <Icon icon="mingcute:mail-line" className="w-4 h-4" />
                {resume.content.personalInfo.email}
              </span>
            )}
            {resume.content?.personalInfo?.phone && (
              <span className="flex items-center gap-1">
                <Icon icon="mingcute:phone-line" className="w-4 h-4" />
                {resume.content.personalInfo.phone}
              </span>
            )}
            {resume.content?.personalInfo?.location && (
              <span className="flex items-center gap-1">
                <Icon icon="mingcute:map-pin-line" className="w-4 h-4" />
                {resume.content.personalInfo.location}
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        {resume.content?.summary && (
          <div className="mb-6">
            <h2
              className="text-xl font-semibold mb-3 tracking-tight"
              style={{ color: colors.primary || "#3351FD" }}
            >
              Summary
            </h2>
            <p className="text-gray-700 leading-relaxed">{resume.content.summary}</p>
          </div>
        )}

        {/* Experience */}
        {resume.content?.experience && resume.content.experience.length > 0 && (
          <div className="mb-6">
            <h2
              className="text-xl font-semibold mb-4 tracking-tight"
              style={{ color: colors.primary || "#3351FD" }}
            >
              Experience
            </h2>
            {resume.content.experience.slice(0, 2).map((exp: any) => (
              <div key={exp.id} className="mb-5 pb-5 border-b border-gray-100 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{exp.title}</h3>
                    <p className="text-gray-700 font-medium">{exp.company}</p>
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {exp.startDate} - {exp.isCurrent ? "Present" : exp.endDate || ""}
                  </span>
                </div>
                {exp.description && exp.description.length > 0 && (
                  <ul className="list-disc list-inside mt-2 text-gray-700 space-y-1">
                    {exp.description.slice(0, 2).map((desc: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">{desc}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {resume.content?.skills && resume.content.skills.length > 0 && (
          <div className="mb-4">
            <h2
              className="text-xl font-semibold mb-3 tracking-tight"
              style={{ color: colors.primary || "#3351FD" }}
            >
              Skills
            </h2>
            <div className="text-sm text-gray-700 leading-relaxed">
              {resume.content.skills
                .slice(0, 8)
                .map((skill: any) => skill.name)
                .join(", ")}
              {resume.content.skills.length > 8 && "..."}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Version Control
              </h2>
              <p className="text-sm text-gray-600 mt-1.5">
                Browse and compare all versions of your resume
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <Icon icon="mingcute:close-line" className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
            </button>
          </div>
        </div>

        {/* Compact Version Navigation */}
        <div className="px-5 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous version"
            >
              <Icon icon="mingcute:arrow-left-line" className="w-4 h-4 text-gray-700" />
            </button>

            <div className="flex-1 flex items-center justify-center gap-3">
              {/* Version Dots */}
              <div className="flex gap-1.5 items-center">
                {versions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`rounded-full transition-all ${
                      index === currentIndex
                        ? "bg-[#3351FD] w-8 h-2"
                        : "bg-gray-300 hover:bg-gray-400 w-2 h-2"
                    }`}
                    aria-label={`Go to version ${index + 1}`}
                  />
                ))}
              </div>
              
              {/* Version Selector */}
              <select
                value={currentVersion.id}
                onChange={(e) => {
                  const index = versions.findIndex((v) => v.id === e.target.value);
                  if (index !== -1) {
                    setCurrentIndex(index);
                  }
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-[#3351FD] transition-all bg-white text-sm font-medium text-gray-900"
              >
                {versions.map((version, index) => (
                  <option key={version.id} value={version.id}>
                    {version.versionName || version.name || `Version ${version.versionNumber || index + 1}`}
                    {version.isMaster && " (Master)"}
                    {version.jobId && " • Job"}
                  </option>
                ))}
              </select>
              
              <span className="text-xs text-gray-500 font-medium">
                {currentIndex + 1}/{versions.length}
              </span>
            </div>

            <button
              onClick={handleNext}
              disabled={currentIndex === versions.length - 1}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next version"
            >
              <Icon icon="mingcute:arrow-right-line" className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Resume Preview */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative">
          {/* Version Indicator Overlay */}
          <div className="absolute top-4 right-4 z-10">
            <div className="px-4 py-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#3351FD] animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">
                Viewing: {currentVersion.versionName || currentVersion.name || `v${currentVersion.versionNumber || currentIndex + 1}`}
              </span>
            </div>
          </div>
          <div className="transition-all duration-300 ease-in-out">
            {renderResumePreview(currentResume)}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-200 bg-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-gradient-to-r from-[#3351FD] to-[#2a45d4] text-white rounded-lg shadow-md">
              <div className="flex items-center gap-2">
                <Icon icon="mingcute:git-branch-line" className="w-4 h-4" />
                <span className="text-sm font-bold">
                  {currentVersion.versionName || currentVersion.name || `Version ${currentVersion.versionNumber || currentIndex + 1}`}
                </span>
                {currentVersion.isMaster && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs font-medium">
                    Master
                  </span>
                )}
                {currentVersion.jobId && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs font-medium flex items-center gap-1">
                    <Icon icon="mingcute:briefcase-line" className="w-3 h-3" />
                    Job
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Created {new Date(currentVersion.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all font-medium shadow-sm hover:shadow"
            >
              Close
            </button>
            <button
              onClick={() => {
                handleSelectVersion(currentVersion.id);
                onClose();
              }}
              className="px-5 py-2.5 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Icon icon="mingcute:eye-line" className="w-4 h-4" />
              View This Version
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

