import { useState, useRef } from "react";
import { Icon } from "@iconify/react";

export type ExportFormat = "pdf" | "docx" | "txt" | "html";

interface CompanyResearchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: {
    format: ExportFormat;
    filename: string;
  }) => void;
  defaultFilename?: string;
  isExporting?: boolean;
}

const EXPORT_FORMATS = [
  {
    format: "pdf" as const,
    label: "PDF",
    icon: "mingcute:file-pdf-line",
    description: "Professional PDF format - best for printing",
    color: "text-red-600 bg-red-50 border-red-200",
  },
  {
    format: "docx" as const,
    label: "Word Document",
    icon: "mingcute:file-word-line",
    description: "Editable .docx format",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    format: "txt" as const,
    label: "Plain Text",
    icon: "mingcute:file-text-line",
    description: "Simple text format",
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
  {
    format: "html" as const,
    label: "HTML",
    icon: "mingcute:file-code-line",
    description: "Web format for sharing",
    color: "text-green-600 bg-green-50 border-green-200",
  },
];

export function CompanyResearchExportModal({
  isOpen,
  onClose,
  onExport,
  defaultFilename = "company_research",
  isExporting = false,
}: CompanyResearchExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [filename, setFilename] = useState(defaultFilename);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport({
      format: selectedFormat,
      filename: filename.trim() || defaultFilename,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[55] p-4 transition-opacity duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Export Company Research
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose format and customize export options
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isExporting}
          >
            <Icon icon="mingcute:close-line" className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {EXPORT_FORMATS.map((option) => (
                <button
                  key={option.format}
                  onClick={() => setSelectedFormat(option.format)}
                  disabled={isExporting}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    selectedFormat === option.format
                      ? `${option.color} border-current`
                      : "bg-white border-gray-200 hover:border-gray-300"
                  } ${isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <Icon icon={option.icon} className="w-6 h-6 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-600">
                      {option.description}
                    </div>
                  </div>
                  {selectedFormat === option.format && (
                    <Icon
                      icon="mingcute:check-line"
                      className="w-5 h-5 flex-shrink-0"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Filename */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Filename
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                disabled={isExporting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter filename"
              />
              <span className="text-sm text-gray-500">.{selectedFormat}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Only letters, numbers, hyphens, and underscores allowed
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !filename.trim()}
            className="px-6 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Icon
                  icon="mingcute:loading-line"
                  className="w-5 h-5 animate-spin"
                />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Icon icon="mingcute:download-line" className="w-5 h-5" />
                <span>Export as {selectedFormat.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

