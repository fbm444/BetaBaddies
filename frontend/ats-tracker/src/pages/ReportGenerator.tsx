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
      icon: 'mingcute:chart-line',
      title: 'Performance Metrics',
      description: 'Success rates and key performance indicators',
    },
    {
      icon: 'mingcute:time-line',
      title: 'Timeline & Trends',
      description: 'Application timeline and progress trends',
    },
    {
      icon: 'mingcute:calculator-line',
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
      icon: 'mingcute:database-line',
      title: 'Detailed Data',
      description: 'Raw application data export (Excel format)',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg mb-4">
            <Icon icon="mingcute:file-download-line" className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Generate Reports</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Export comprehensive job search reports with AI-powered insights and detailed analytics
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm">
            <Icon icon="mdi:alert-circle" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-semibold">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <Icon icon="mdi:close" className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Generation Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Generate Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon icon="mingcute:magic-line" className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Generate Report</h2>
              </div>

              <p className="text-slate-600 mb-6">
                Choose your preferred format. PDF includes AI-powered insights and visualizations, 
                while Excel contains raw data for further analysis.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Generate PDF */}
                <button
                  onClick={() => handleGenerate('pdf')}
                  disabled={generating}
                  className="group relative bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-6 px-6 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-red-500 disabled:hover:to-red-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex flex-col items-center justify-center gap-3"
                >
                  {generating && generatingFormat === 'pdf' ? (
                    <>
                      <Icon icon="mdi:loading" className="w-8 h-8 animate-spin" />
                      <span className="text-sm">Generating...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Icon icon="mdi:file-pdf-box" className="w-7 h-7" />
                      </div>
                      <div className="text-center">
                        <span className="block text-base">Generate PDF</span>
                        <span className="text-xs opacity-90 font-normal mt-1">With AI Insights</span>
                      </div>
                    </>
                  )}
                </button>

                {/* Generate Excel */}
                <button
                  onClick={() => handleGenerate('csv')}
                  disabled={generating}
                  className="group relative bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-6 px-6 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-500 disabled:hover:to-green-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex flex-col items-center justify-center gap-3"
                >
                  {generating && generatingFormat === 'csv' ? (
                    <>
                      <Icon icon="mdi:loading" className="w-8 h-8 animate-spin" />
                      <span className="text-sm">Generating...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Icon icon="mdi:file-excel-box" className="w-7 h-7" />
                      </div>
                      <div className="text-center">
                        <span className="block text-base">Generate Excel</span>
                        <span className="text-xs opacity-90 font-normal mt-1">Raw Data Export</span>
                      </div>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Download Card */}
            {(pdfGenerated || excelGenerated) && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Icon icon="mingcute:download-line" className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Download Report</h2>
                </div>

                <p className="text-slate-600 mb-6">
                  Your reports are ready! Click below to download them to your device.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Download PDF */}
                  <button
                    onClick={() => handleDownload('pdf')}
                    disabled={!pdfGenerated}
                    className={`group relative ${
                      pdfGenerated
                        ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    } py-6 px-6 rounded-xl font-semibold transition-all duration-200 flex flex-col items-center justify-center gap-3`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      pdfGenerated ? 'bg-white/20 group-hover:bg-white/30' : 'bg-slate-200'
                    } transition-colors`}>
                      <Icon icon={pdfGenerated ? "mdi:download" : "mdi:file-lock"} className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <span className="block text-base">Download PDF</span>
                      {pdfGenerated && (
                        <span className="text-xs opacity-90 font-normal mt-1 flex items-center justify-center gap-1">
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
                    className={`group relative ${
                      excelGenerated
                        ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    } py-6 px-6 rounded-xl font-semibold transition-all duration-200 flex flex-col items-center justify-center gap-3`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      excelGenerated ? 'bg-white/20 group-hover:bg-white/30' : 'bg-slate-200'
                    } transition-colors`}>
                      <Icon icon={excelGenerated ? "mdi:download" : "mdi:file-lock"} className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <span className="block text-base">Download Excel</span>
                      {excelGenerated && (
                        <span className="text-xs opacity-90 font-normal mt-1 flex items-center justify-center gap-1">
                          <Icon icon="mdi:check-circle" className="w-4 h-4" />
                          Ready
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Features Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <Icon icon="mingcute:list-check-line" className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-bold text-slate-900">What's Included</h3>
              </div>
              
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-3 group">
                    <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                      <Icon icon={feature.icon} className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 text-sm mb-1">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Icon icon="mingcute:information-line" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-900 leading-relaxed">
                      <strong className="font-semibold">Note:</strong> PDF reports include AI-powered insights and visualizations. 
                      Excel files contain raw data for spreadsheet analysis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
