import { useState } from 'react';
import { Icon } from '@iconify/react';

export function ReportGenerator() {
  const [generating, setGenerating] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState<'pdf' | 'csv' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [excelGenerated, setExcelGenerated] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);

  const handleGenerate = async (format: 'pdf' | 'csv') => {
    setError(null);
    setGenerating(true);
    setGeneratingFormat(format);

    try {
      // Use environment variable or fallback to relative path (for proxy)
      const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL 
        ? `${import.meta.env.VITE_API_BASE_URL}/api/v1` 
        : '/api/v1';
      
      const response = await fetch(`${apiBase}/reports/generate`, {
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
      setGeneratingFormat(null);
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

  const features = [
    {
      icon: 'mingcute:chart-bar-line',
      title: 'Performance Metrics',
      description: 'Success rates and key performance indicators',
    },
    {
      icon: 'mingcute:time-line',
      title: 'Timeline & Trends',
      description: 'Application timeline and progress trends',
    },
    {
      icon: 'mingcute:time-duration-line',
      title: 'Time Investment',
      description: 'Breakdown of time spent on job search activities',
    },
    {
      icon: 'mingcute:brain-line',
      title: 'AI Insights',
      description: 'AI-powered predictions and recommendations (PDF only)',
    },
    {
      icon: 'mingcute:target-line',
      title: 'Success Predictions',
      description: 'Predictions for active opportunities',
    },
    {
      icon: 'mingcute:chart-horizontal-line',
      title: 'Detailed Data',
      description: 'Raw application data export (Excel format)',
    },
  ];

  return (
    <div className="min-h-screen bg-white font-poppins py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-10 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 font-poppins">Generate Reports</h1>
          <p className="text-slate-600 font-poppins">
            Export comprehensive job search reports with AI-powered insights and detailed analytics
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <Icon icon="mdi:alert-circle" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-semibold font-poppins">Error</p>
                <p className="text-red-600 text-sm font-poppins">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="space-y-6">
          {/* Generate Card */}
          <div className="bg-white border border-slate-300 rounded-xl p-8">
            {/* Note */}
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Icon icon="mingcute:information-line" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed font-poppins">
                  <strong className="font-semibold font-poppins">Note:</strong> PDF reports include AI-powered insights and visualizations. 
                  Excel files contain raw data for spreadsheet analysis.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 font-poppins mb-2">Generate Report</h2>
              <p className="text-slate-600 font-poppins">
                Choose your preferred format below.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Generate PDF with AI Gradient Fill */}
              <button
                onClick={() => handleGenerate('pdf')}
                disabled={generating}
                className="relative py-6 px-4 rounded-xl font-medium font-poppins transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-3 text-white"
                style={{
                  background: 'linear-gradient(to right, #EC85CA, #3351FD)',
                }}
                onMouseEnter={(e) => {
                  if (!generating) {
                    e.currentTarget.style.background = 'linear-gradient(to right, #d975b8, #2d49e4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!generating) {
                    e.currentTarget.style.background = 'linear-gradient(to right, #EC85CA, #3351FD)';
                  }
                }}
              >
                {generating && generatingFormat === 'pdf' ? (
                  <>
                    <Icon icon="mdi:loading" className="w-6 h-6 animate-spin text-white" />
                    <span className="font-poppins text-sm text-white">Generating...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:file-pdf-box" className="w-8 h-8 text-white" />
                    <div className="text-center px-2">
                      <span className="block font-poppins text-sm font-semibold text-white">Generate PDF with AI Insights</span>
                    </div>
                  </>
                )}
              </button>

              {/* Generate Excel with Green Fill */}
              <button
                onClick={() => handleGenerate('csv')}
                disabled={generating}
                className="py-6 px-4 rounded-xl bg-green-600 text-white font-medium font-poppins transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 flex flex-col items-center justify-center gap-3"
              >
                {generating && generatingFormat === 'csv' ? (
                  <>
                    <Icon icon="mdi:loading" className="w-6 h-6 animate-spin text-white" />
                    <span className="font-poppins text-sm text-white">Generating...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:file-excel-box" className="w-8 h-8 text-white" />
                    <div className="text-center px-2">
                      <span className="block font-poppins text-sm font-semibold text-white">Generate Excel</span>
                    </div>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Download Card */}
          {(pdfGenerated || excelGenerated) && (
            <div className="bg-white border border-slate-300 rounded-xl p-8">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-semibold text-slate-900 font-poppins mb-2">Download Report</h2>
                <p className="text-slate-600 font-poppins">
                  Your reports are ready! Click below to download them to your device.
                </p>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                {/* Download PDF */}
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={!pdfGenerated}
                  className={`w-full py-6 px-6 rounded-xl font-medium font-poppins transition-all flex flex-col items-center justify-center gap-3 ${
                    pdfGenerated
                      ? 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50'
                      : 'border-2 border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
                  }`}
                >
                  <Icon icon={pdfGenerated ? "mdi:download" : "mdi:file-lock"} className={`w-8 h-8 ${pdfGenerated ? 'text-slate-700' : 'text-slate-400'}`} />
                  <div className="text-center">
                    <span className="block text-base font-poppins">Download PDF</span>
                    {pdfGenerated && (
                      <span className="text-xs font-poppins opacity-75 mt-1 flex items-center justify-center gap-1">
                        <Icon icon="mdi:check-circle" className="w-4 h-4" />
                        Ready
                      </span>
                    )}
                  </div>
                </button>

                {/* Download Excel */}
                <button
                  onClick={() => handleDownload('csv')}
                  disabled={!excelGenerated}
                  className={`w-full py-6 px-6 rounded-xl font-medium font-poppins transition-all flex flex-col items-center justify-center gap-3 ${
                    excelGenerated
                      ? 'border-2 border-green-500 text-green-700 hover:bg-green-50'
                      : 'border-2 border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
                  }`}
                >
                  <Icon icon={excelGenerated ? "mdi:download" : "mdi:file-lock"} className={`w-8 h-8 ${excelGenerated ? 'text-green-700' : 'text-slate-400'}`} />
                  <div className="text-center">
                    <span className="block text-base font-poppins">Download Excel</span>
                    {excelGenerated && (
                      <span className="text-xs font-poppins opacity-75 mt-1 flex items-center justify-center gap-1">
                        <Icon icon="mdi:check-circle" className="w-4 h-4" />
                        Ready
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* What's Included Card */}
          <div className="bg-white border border-slate-300 rounded-xl p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 font-poppins">What's Included</h3>
            </div>
            
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon icon={feature.icon} className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 text-sm mb-1 font-poppins">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-poppins">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
