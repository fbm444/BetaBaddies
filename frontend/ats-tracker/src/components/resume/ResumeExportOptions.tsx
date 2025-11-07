import { useState } from "react";
import { Icon } from "@iconify/react";

interface ResumeExportOptionsProps {
  resumeId: string;
  onExport: (format: 'pdf' | 'docx' | 'txt' | 'html') => void;
}

export function ResumeExportOptions({ resumeId, onExport }: ResumeExportOptionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx' | 'txt' | 'html'>('pdf');

  const exportOptions = [
    {
      format: 'pdf' as const,
      label: 'PDF',
      icon: 'mingcute:file-pdf-line',
      description: 'Professional PDF format',
      color: 'text-red-600 bg-red-50 border-red-200',
    },
    {
      format: 'docx' as const,
      label: 'Word Document',
      icon: 'mingcute:file-word-line',
      description: 'Editable .docx format',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      format: 'txt' as const,
      label: 'Plain Text',
      icon: 'mingcute:file-text-line',
      description: 'Simple text format',
      color: 'text-gray-600 bg-gray-50 border-gray-200',
    },
    {
      format: 'html' as const,
      label: 'HTML',
      icon: 'mingcute:file-code-line',
      description: 'Web format',
      color: 'text-green-600 bg-green-50 border-green-200',
    },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    // Simulate export
    setTimeout(() => {
      setIsExporting(false);
      onExport(selectedFormat);
    }, 1500);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Export Resume</h3>
        <p className="text-sm text-gray-600">Choose a format to download your resume</p>
      </div>

      <div className="space-y-3 mb-6">
        {exportOptions.map((option) => (
          <button
            key={option.format}
            onClick={() => setSelectedFormat(option.format)}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
              selectedFormat === option.format
                ? `${option.color} border-current`
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <Icon icon={option.icon} className="w-6 h-6" />
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900">{option.label}</div>
              <div className="text-xs text-gray-600">{option.description}</div>
            </div>
            {selectedFormat === option.format && (
              <Icon icon="mingcute:check-line" className="w-5 h-5" />
            )}
          </button>
        ))}
      </div>

      {/* Export Options */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filename</label>
          <input
            type="text"
            defaultValue="resume"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
          />
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
            <span className="text-sm text-gray-700">Include watermark</span>
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300" defaultChecked />
            <span className="text-sm text-gray-700">Print-optimized formatting</span>
          </label>
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full flex items-center justify-center gap-2 bg-black text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <Icon icon="mingcute:loading-line" className="w-5 h-5 animate-spin" />
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
  );
}

