import { useState } from 'react';
import { Icon } from '@iconify/react';

export function ReportGenerator() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [excelGenerated, setExcelGenerated] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);

  const handleGenerate = async (format: 'pdf' | 'csv') => {
    setError(null);
    setGenerating(true);

    try {
      const response = await fetch('http://localhost:3001/api/v1/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dateRange: { period: 'all_time' },
          filters: {},
          format: format,
          includeAI: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      
      if (format === 'pdf') {
        setPdfBlob(blob);
        setPdfGenerated(true);
      } else {
        setExcelBlob(blob);
        setExcelGenerated(true);
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (format: 'pdf' | 'csv') => {
    const blob = format === 'pdf' ? pdfBlob : excelBlob;
    if (!blob) return;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-search-report-${Date.now()}.${format === 'pdf' ? 'pdf' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Generate Job Search Report</h1>
        <p className="text-gray-600">
          Export a comprehensive report with AI-powered insights about your job search performance
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <Icon icon="mdi:alert-circle" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="space-y-8">
          {/* Info Section */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
              <Icon icon="mdi:file-document" className="w-10 h-10 text-blue-600" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-2">Comprehensive Job Search Report</h2>
              <p className="text-gray-600 text-sm max-w-md mx-auto">
                Your report includes performance metrics, success patterns, time investment analysis, 
                AI-powered predictions, and personalized recommendations
              </p>
            </div>
          </div>

          {/* Generate Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 text-center">Step 1: Generate Report</h3>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {/* Generate PDF */}
              <button
                onClick={() => handleGenerate('pdf')}
                disabled={generating}
                className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2"
              >
                <Icon icon="mdi:file-pdf-box" className="w-8 h-8" />
                <span className="text-sm">Generate PDF</span>
              </button>

              {/* Generate Excel */}
              <button
                onClick={() => handleGenerate('csv')}
                disabled={generating}
                className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2"
              >
                <Icon icon="mdi:file-excel-box" className="w-8 h-8" />
                <span className="text-sm">Generate Excel</span>
              </button>
            </div>
            
            {generating && (
              <div className="text-center mt-4 text-gray-600 flex items-center justify-center gap-2">
                <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                <span className="text-sm">Generating report...</span>
              </div>
            )}
          </div>

          {/* Download Section */}
          {(pdfGenerated || excelGenerated) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-center">Step 2: Download Report</h3>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {/* Download PDF */}
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={!pdfGenerated}
                  className={`${
                    pdfGenerated
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  } py-3 px-4 rounded-lg font-medium transition-colors flex flex-col items-center justify-center gap-2`}
                >
                  <Icon icon="mdi:download" className="w-8 h-8" />
                  <span className="text-sm">Download PDF</span>
                  {pdfGenerated && (
                    <span className="text-xs opacity-75">✓ Ready</span>
                  )}
                </button>

                {/* Download Excel */}
                <button
                  onClick={() => handleDownload('csv')}
                  disabled={!excelGenerated}
                  className={`${
                    excelGenerated
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  } py-3 px-4 rounded-lg font-medium transition-colors flex flex-col items-center justify-center gap-2`}
                >
                  <Icon icon="mdi:download" className="w-8 h-8" />
                  <span className="text-sm">Download Excel</span>
                  {excelGenerated && (
                    <span className="text-xs opacity-75">✓ Ready</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* What's Included */}
          <div className="border-t pt-6 space-y-3">
            <p className="text-sm font-medium text-gray-700">What's included:</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Icon icon="mdi:check" className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>Performance metrics and success rates</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="mdi:check" className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>Application timeline and trends</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="mdi:check" className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>Time investment breakdown</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="mdi:check" className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>AI-powered insights and recommendations (PDF only)</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="mdi:check" className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>Success predictions for active opportunities</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="mdi:check" className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>Detailed application data (Excel has raw data)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
