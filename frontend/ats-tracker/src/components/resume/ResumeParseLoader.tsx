import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { resumeService } from "../../services/resumeService";

interface ResumeParseLoaderProps {
  file: File;
  onComplete: (parsedContent: any) => void;
  onError: (error: string) => void;
}

const PARSE_STEPS = [
  { label: "Reading file...", progress: 10 },
  { label: "Extracting text from document...", progress: 30 },
  { label: "Analyzing document structure...", progress: 50 },
  { label: "Identifying sections and content...", progress: 70 },
  { label: "Parsing with AI...", progress: 85 },
  { label: "Validating extracted data...", progress: 95 },
  { label: "Complete!", progress: 100 },
];

const INSPIRATIONAL_QUOTES = [
  "Your resume is your first impression—make it count!",
  "Every great career starts with a single step forward.",
  "We're extracting all the details from your resume.",
  "Your unique experiences make you stand out.",
  "Success is where preparation meets opportunity.",
  "Your next opportunity is just around the corner.",
  "Showcase your achievements with confidence.",
  "A well-crafted resume opens doors.",
  "Your skills and experience tell your story.",
  "Make every word on your resume work for you.",
  "Your career journey is unique—own it!",
  "The best resumes tell a compelling story.",
];

const PARSE_TIPS = [
  "💡 Tip: Make sure your resume is well-formatted for best results.",
  "💡 Tip: Include quantifiable achievements in your experience.",
  "💡 Tip: List relevant skills that match your target roles.",
  "💡 Tip: Keep your resume concise and focused.",
  "💡 Tip: Highlight results, not just responsibilities.",
  "💡 Tip: Use industry-specific terminology.",
  "💡 Tip: Show progression in your career.",
  "💡 Tip: Include relevant certifications and education.",
];

export function ResumeParseLoader({
  file,
  onComplete,
  onError,
}: ResumeParseLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Rotate tips and quotes while loading
  useEffect(() => {
    if (progress > 0 && progress < 100) {
      const allTips = [...INSPIRATIONAL_QUOTES, ...PARSE_TIPS];

      // Set initial tip
      setCurrentTip(allTips[0]);

      // Rotate tips every 3 seconds
      let tipIndex = 0;
      const tipInterval = setInterval(() => {
        tipIndex = (tipIndex + 1) % allTips.length;
        setCurrentTip(allTips[tipIndex]);
      }, 3000);

      return () => clearInterval(tipInterval);
    } else {
      setCurrentTip("");
    }
  }, [progress]);

  // Simulate progress steps
  useEffect(() => {
    const simulateProgress = () => {
      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        if (stepIndex < PARSE_STEPS.length - 1) {
          setCurrentStep(stepIndex);
          setProgress(PARSE_STEPS[stepIndex].progress);
          stepIndex++;
        } else {
          clearInterval(stepInterval);
        }
      }, 800); // Update every 800ms

      return () => clearInterval(stepInterval);
    };

    const progressInterval = simulateProgress();
    return () => clearInterval(progressInterval);
  }, []);

  // Parse the resume
  useEffect(() => {
    const parseResume = async () => {
      try {
        // Wait a bit to show initial progress
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Update to parsing step
        setCurrentStep(4); // "Parsing with AI..."
        setProgress(85);

        // Call the actual parse API
        const response = await resumeService.parseResume(file);

        if (!response.ok || !response.data) {
          throw new Error(
            response.error?.message || "Failed to parse resume"
          );
        }

        // Complete
        setCurrentStep(PARSE_STEPS.length - 1);
        setProgress(100);
        setCurrentTip("");

        // Wait a moment to show completion, then call onComplete
        setTimeout(() => {
          onComplete(response.data.content);
        }, 500);
      } catch (err: any) {
        console.error("Resume parsing error:", err);
        setError(err.message || "Failed to parse resume. Please try again.");
        setProgress(0);
        setCurrentTip("");
      }
    };

    parseResume();
  }, [file, onComplete]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <Icon
            icon="mingcute:close-circle-fill"
            className="w-16 h-16 text-red-500 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => onError(error)}
            className="px-6 py-3 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3351FD] to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Icon icon="mingcute:ai-fill" className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            AI Resume Parsing
          </h2>
          <p className="text-gray-600">
            {PARSE_STEPS[currentStep]?.label || "Processing..."}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#3351FD] to-purple-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-center mt-2">
            <span className="text-sm font-medium text-gray-700">
              {progress}%
            </span>
          </div>
        </div>

        {/* Loading Animation */}
        <div className="flex justify-center gap-2 mb-6">
          <div
            className="w-3 h-3 bg-[#3351FD] rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-3 h-3 bg-[#3351FD] rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-3 h-3 bg-[#3351FD] rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>

        {/* Rotating Tips/Quotes */}
        {currentTip && progress > 0 && progress < 100 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100 transition-opacity duration-500">
              <p className="text-sm text-gray-700 text-center font-medium">
                {currentTip}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

