import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

interface ResumeValidationScannerProps {
  isScanning: boolean;
  progress: number;
  currentSection?: string;
}

export function ResumeValidationScanner({
  isScanning,
  progress,
  currentSection,
}: ResumeValidationScannerProps) {
  const [scanPosition, setScanPosition] = useState(0);

  useEffect(() => {
    if (!isScanning) {
      setScanPosition(0);
      return;
    }

    const interval = setInterval(() => {
      setScanPosition((prev) => {
        if (prev >= 100) return 0;
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isScanning]);

  if (!isScanning) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-50 animate-pulse" />

        {/* Scanning beam overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, transparent ${scanPosition}%, rgba(51, 81, 253, 0.3) ${scanPosition}%, rgba(51, 81, 253, 0.3) ${Math.min(scanPosition + 5, 100)}%, transparent ${Math.min(scanPosition + 5, 100)}%)`,
            transition: "background 0.1s linear",
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <Icon
                icon="mingcute:scan-line"
                className="w-16 h-16 text-[#3351FD] animate-pulse"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#3351FD] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Analyzing Your Resume
          </h2>
          <p className="text-gray-600 text-center mb-6">
            {currentSection
              ? `Scanning ${currentSection}...`
              : "AI is evaluating your resume quality, ATS compatibility, and content..."}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#3351FD] via-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-shimmer-slide" />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <span>Progress</span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>

          {/* Scanning indicators */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {["Content", "ATS", "Format", "Skills"].map((label, idx) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
                style={{
                  opacity: progress > idx * 25 ? 1 : 0.5,
                  transform: progress > idx * 25 ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    progress > idx * 25
                      ? "bg-green-500 animate-pulse"
                      : "bg-gray-400"
                  }`}
                />
                <span className="text-xs font-medium text-gray-700">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


