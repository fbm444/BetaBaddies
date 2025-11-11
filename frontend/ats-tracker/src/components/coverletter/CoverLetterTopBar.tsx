import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../config/routes";
import { CoverLetter } from "../../types";

interface CoverLetterTopBarProps {
  coverLetter: CoverLetter | null;
  coverLetterId: string | null;
  isSaving: boolean;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  exporting: boolean;
  showExportMenu: boolean;
  showCustomization: boolean;
  onNavigateBack: () => void;
  onSave: () => void;
  onExport: (format: "pdf" | "docx" | "txt" | "html") => void;
  onToggleExportMenu: () => void;
  onToggleCustomization: () => void;
}

export function CoverLetterTopBar({
  coverLetter,
  coverLetterId,
  isSaving,
  isAutoSaving,
  lastSaved,
  exporting,
  showExportMenu,
  showCustomization,
  onNavigateBack,
  onSave,
  onExport,
  onToggleExportMenu,
  onToggleCustomization,
}: CoverLetterTopBarProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
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
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {coverLetter?.name || "New Cover Letter"}
              </h1>
              <p className="text-xs text-gray-500">
                v{coverLetter?.versionNumber || 1}
                {coverLetter?.isMaster && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    Master
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

