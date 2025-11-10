import { useState, useRef } from "react";
import { Icon } from "@iconify/react";

export type ExportFormat = "pdf" | "docx" | "txt" | "html";
export type ExportTheme = "professional" | "modern" | "classic" | "creative" | "minimal";

interface ResumeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: {
    format: ExportFormat;
    filename: string;
    watermark?: File | null;
    theme: ExportTheme;
    printOptimized: boolean;
  }) => void;
  defaultFilename?: string;
  isExporting?: boolean;
}

const EXPORT_FORMATS = [
  {
    format: "pdf" as const,
    label: "PDF",
    icon: "mingcute:file-pdf-line",
    description: "Professional PDF format - best for applications",
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
    description: "Simple text format for online applications",
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
  {
    format: "html" as const,
    label: "HTML",
    icon: "mingcute:file-code-line",
    description: "Web format for portfolios",
    color: "text-green-600 bg-green-50 border-green-200",
  },
];

const EXPORT_THEMES = [
  {
    theme: "professional" as const,
    label: "Professional",
    description: "Clean, traditional format",
    icon: "mingcute:suitcase-line",
  },
  {
    theme: "modern" as const,
    label: "Modern",
    description: "Contemporary design with subtle colors",
    icon: "mingcute:palette-line",
  },
  {
    theme: "classic" as const,
    label: "Classic",
    description: "Timeless, formal style",
    icon: "mingcute:book-line",
  },
  {
    theme: "creative" as const,
    label: "Creative",
    description: "Bold design for creative fields",
    icon: "mingcute:brush-line",
  },
  {
    theme: "minimal" as const,
    label: "Minimal",
    description: "Simple, clean, and focused",
    icon: "mingcute:minimize-line",
  },
];

export function ResumeExportModal({
  isOpen,
  onClose,
  onExport,
  defaultFilename = "resume",
  isExporting = false,
}: ResumeExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [filename, setFilename] = useState(defaultFilename);
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ExportTheme>("professional");
  const [printOptimized, setPrintOptimized] = useState(true);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleWatermarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image file size must be less than 5MB");
        return;
      }
      setWatermarkFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setWatermarkPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveWatermark = () => {
    setWatermarkFile(null);
    setWatermarkPreview(null);
    if (watermarkInputRef.current) {
      watermarkInputRef.current.value = "";
    }
  };

  const handleExport = () => {
    onExport({
      format: selectedFormat,
      filename: filename.trim() || defaultFilename,
      watermark: watermarkFile,
      theme: selectedTheme,
      printOptimized,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Export Resume</h2>
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
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.description}</div>
                  </div>
                  {selectedFormat === option.format && (
                    <Icon icon="mingcute:check-line" className="w-5 h-5 flex-shrink-0" />
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
              <span className="text-sm text-gray-500">
                .{selectedFormat}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Only letters, numbers, hyphens, and underscores allowed
            </p>
          </div>

          {/* Formatting Theme */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Formatting Theme
            </label>
            <div className="grid grid-cols-5 gap-2">
              {EXPORT_THEMES.map((theme) => (
                <button
                  key={theme.theme}
                  onClick={() => setSelectedTheme(theme.theme)}
                  disabled={isExporting}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    selectedTheme === theme.theme
                      ? "border-[#3351FD] bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  } ${isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <Icon icon={theme.icon} className="w-5 h-5 text-gray-700" />
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-900">
                      {theme.label}
                    </div>
                    <div className="text-xs text-gray-500">{theme.description}</div>
                  </div>
                  {selectedTheme === theme.theme && (
                    <Icon
                      icon="mingcute:check-line"
                      className="w-4 h-4 text-[#3351FD] absolute top-1 right-1"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Watermark */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Watermark / Branding (Optional)
            </label>
            <div className="space-y-3">
              {watermarkPreview ? (
                <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={watermarkPreview}
                      alt="Watermark preview"
                      className="w-20 h-20 object-contain bg-gray-50 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {watermarkFile?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(watermarkFile?.size || 0) / 1024} KB
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveWatermark}
                      disabled={isExporting}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Icon icon="mingcute:delete-line" className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#3351FD] transition-colors ${
                    isExporting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <input
                    ref={watermarkInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleWatermarkChange}
                    disabled={isExporting}
                    className="hidden"
                  />
                  <Icon
                    icon="mingcute:image-add-line"
                    className="w-8 h-8 text-gray-400"
                  />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      Upload watermark image
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, or SVG (max 5MB)
                    </p>
                  </div>
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Add your logo or branding to the exported document
            </p>
          </div>

          {/* Print Optimized */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label htmlFor="print-optimized-toggle" className="text-sm font-medium text-gray-900 cursor-pointer">
                Print-Optimized Formatting
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Optimize margins and spacing for printing
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={printOptimized}
              onClick={() => !isExporting && setPrintOptimized(!printOptimized)}
              disabled={isExporting}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#3351FD] focus:ring-offset-2 ${
                printOptimized ? 'bg-[#3351FD]' : 'bg-gray-200'
              } ${isExporting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform duration-200 ease-in-out ${
                printOptimized ? 'translate-x-5' : 'translate-x-0'
              }`}></div>
            </button>
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

