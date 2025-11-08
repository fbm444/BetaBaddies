import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../config/routes";
import { Resume } from "../../types";

interface ResumeTopBarProps {
  resume: Resume | null;
  resumeId: string | null;
  versions: Resume[];
  isSaving: boolean;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  exporting: boolean;
  showExportMenu: boolean;
  showVersionHistory: boolean;
  showCustomization: boolean;
  showValidationPanel: boolean;
  canUndo: boolean;
  onNavigateBack: () => void;
  onSave: () => void;
  onUndo: () => void;
  onExport: (format: "pdf" | "docx" | "txt" | "html") => void;
  onToggleExportMenu: () => void;
  onToggleVersionHistory: () => void;
  onToggleCustomization: () => void;
  onToggleValidationPanel: () => void;
  onShowVersionModal: () => void;
  onShowImportResumeModal: () => void;
  onSwitchVersion: (versionId: string) => void;
  onSetMasterVersion: (versionId: string) => void;
  onShowVersionCompare: () => void;
}

export function ResumeTopBar({
  resume,
  resumeId,
  versions,
  isSaving,
  isAutoSaving,
  lastSaved,
  exporting,
  showExportMenu,
  showVersionHistory,
  showCustomization,
  showValidationPanel,
  canUndo,
  onNavigateBack,
  onSave,
  onUndo,
  onExport,
  onToggleExportMenu,
  onToggleVersionHistory,
  onToggleCustomization,
  onToggleValidationPanel,
  onShowVersionModal,
  onShowImportResumeModal,
  onSwitchVersion,
  onSetMasterVersion,
  onShowVersionCompare,
}: ResumeTopBarProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon
                icon="mingcute:arrow-left-line"
                className="w-5 h-5 text-gray-700"
              />
            </button>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {resume?.name || "New Resume"}
                </h1>
                <p className="text-xs text-gray-500">
                  v{resume?.versionNumber || 1}
                  {resume?.isMaster && (
                    <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      Master
                    </span>
                  )}
                </p>
              </div>
              {versions.length > 0 && (
                <div className="relative">
                  <button
                    onClick={onToggleVersionHistory}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <Icon
                      icon="mingcute:git-branch-line"
                      className="w-4 h-4"
                    />
                    Versions ({versions.length})
                    <Icon
                      icon={
                        showVersionHistory
                          ? "mingcute:up-line"
                          : "mingcute:down-line"
                      }
                      className="w-3 h-3"
                    />
                  </button>
                  {showVersionHistory && (
                    <div className="absolute left-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px] max-h-[400px] overflow-y-auto">
                      <div className="p-3 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">
                            Versions
                          </h3>
                          <button
                            onClick={() => {
                              onShowVersionModal();
                              onToggleVersionHistory();
                            }}
                            className="text-xs px-2 py-1 bg-[#3351FD] text-white rounded hover:bg-[#2a45d4] transition-colors flex items-center gap-1"
                          >
                            <Icon
                              icon="mingcute:add-line"
                              className="w-3 h-3"
                            />
                            New
                          </button>
                        </div>
                      </div>
                      <div className="p-2">
                        {versions.map((version) => (
                          <button
                            key={version.id}
                            onClick={() => onSwitchVersion(version.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors mb-1 ${
                              version.id === resumeId
                                ? "bg-blue-50 border border-blue-200"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {version.name ||
                                      `Version ${version.versionNumber}`}
                                  </span>
                                  {version.isMaster && (
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium flex-shrink-0">
                                      Master
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  v{version.versionNumber || 1}
                                </p>
                              </div>
                              {version.id !== resumeId && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSetMasterVersion(version.id);
                                  }}
                                  className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                                  title="Set as Master"
                                >
                                  <Icon
                                    icon="mingcute:star-line"
                                    className="w-4 h-4 text-gray-600"
                                  />
                                </button>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="p-3 border-t border-gray-200">
                        <button
                          onClick={() => {
                            onShowVersionCompare();
                            onToggleVersionHistory();
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Icon
                            icon="mingcute:git-compare-line"
                            className="w-4 h-4"
                          />
                          Compare Versions
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Undo button */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo last change"
            >
              <Icon icon="mingcute:arrow-go-back-line" className="w-4 h-4" />
              Undo
            </button>
            {/* Auto-save indicator */}
            {isAutoSaving && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg">
                <Icon
                  icon="mingcute:loading-line"
                  className="w-3 h-3 animate-spin text-[#3351FD]"
                />
                <span>Saving...</span>
              </div>
            )}
            {lastSaved && !isAutoSaving && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg">
                <Icon
                  icon="mingcute:check-circle-line"
                  className="w-3 h-3 text-green-600"
                />
                <span>
                  Saved{" "}
                  {lastSaved.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            <button
              onClick={onShowImportResumeModal}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
              title="Import existing resume (PDF/DOCX)"
            >
              <Icon icon="mingcute:upload-line" className="w-4 h-4" />
              Import Resume
            </button>
            {resumeId && resumeId !== "new" && (
              <button
                onClick={onShowVersionModal}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
              >
                <Icon icon="mingcute:git-branch-line" className="w-4 h-4" />
                Create Version
              </button>
            )}
            <button
              onClick={onToggleCustomization}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showCustomization
                  ? "bg-[#3351FD] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Icon
                icon="mingcute:palette-line"
                className="w-4 h-4 inline mr-2"
              />
              Customize
            </button>
            <button
              onClick={onToggleValidationPanel}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showValidationPanel
                  ? "bg-[#3351FD] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Icon
                icon="mingcute:check-line"
                className="w-4 h-4 inline mr-2"
              />
              Validate
            </button>
            <div className="relative">
              <button
                onClick={onToggleExportMenu}
                disabled={exporting}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <Icon
                      icon="mingcute:loading-line"
                      className="w-4 h-4 animate-spin"
                    />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Icon icon="mingcute:download-line" className="w-4 h-4" />
                    Export
                    <Icon
                      icon="mingcute:arrow-down-line"
                      className="w-3 h-3"
                    />
                  </>
                )}
              </button>
              {showExportMenu && !exporting && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                  <button
                    onClick={() => onExport("pdf")}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100"
                  >
                    <Icon
                      icon="mingcute:file-pdf-line"
                      className="w-4 h-4 text-red-600"
                    />
                    Export as PDF
                  </button>
                  <button
                    onClick={() => onExport("docx")}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100"
                  >
                    <Icon
                      icon="mingcute:file-word-line"
                      className="w-4 h-4 text-blue-600"
                    />
                    Export as DOCX
                  </button>
                  <button
                    onClick={() => onExport("html")}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100"
                  >
                    <Icon
                      icon="mingcute:file-html-line"
                      className="w-4 h-4 text-orange-600"
                    />
                    Export as HTML
                  </button>
                  <button
                    onClick={() => onExport("txt")}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                  >
                    <Icon
                      icon="mingcute:file-text-line"
                      className="w-4 h-4 text-gray-600"
                    />
                    Export as TXT
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Icon
                    icon="mingcute:loading-line"
                    className="w-4 h-4 animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Icon icon="mingcute:save-line" className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

