import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../../config/routes";
import { resumeService } from "../../services/resumeService";

interface AITailoringLoaderProps {
  templateId: string;
  jobId: string;
}

const INSPIRATIONAL_QUOTES = [
  "Your resume is your first impression—make it count!",
  "Every great career starts with a single step forward.",
  "Tailor your story to match your dream job.",
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

const CAREER_TIPS = [
  "💡 Tip: Use action verbs to start your bullet points.",
  "💡 Tip: Quantify your achievements with numbers.",
  "💡 Tip: Match keywords from the job description.",
  "💡 Tip: Keep your resume concise and focused.",
  "💡 Tip: Highlight results, not just responsibilities.",
  "💡 Tip: Tailor your resume for each application.",
  "💡 Tip: Use industry-specific terminology.",
  "💡 Tip: Show progression in your career.",
];

export function AITailoringLoader({
  templateId,
  jobId,
}: AITailoringLoaderProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState<string>("");

  // Rotate tips and quotes while loading
  useEffect(() => {
    if (progress > 0 && progress < 100) {
      const allTips = [...INSPIRATIONAL_QUOTES, ...CAREER_TIPS];

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

  useEffect(() => {
    const tailorResume = async () => {
      try {
        // Step 1: Call backend to tailor resume (backend handles everything)
        setStatus(
          "Tailoring your profile for the job using our specialized AI service..."
        );
        setProgress(20);

        const response = await resumeService.tailorResume(templateId, jobId);

        if (!response.ok || !response.data) {
          throw new Error(response.error?.message || "Failed to tailor resume");
        }

        const { resume, explanation } = response.data;

        setProgress(100);
        setStatus("Complete! Redirecting to resume builder...");
        setCurrentTip(""); // Clear tip when done

        // Navigate to resume builder with explanation
        setTimeout(() => {
          navigate(
            `${ROUTES.RESUME_BUILDER}?id=${
              resume.id
            }&jobId=${jobId}&aiExplanation=${encodeURIComponent(explanation)}`
          );
        }, 500);
      } catch (err: any) {
        console.error("AI tailoring error:", err);
        setError(err.message || "Failed to tailor resume. Please try again.");
        setProgress(0);
        setCurrentTip(""); // Clear tip on error
      }
    };

    tailorResume();
  }, [templateId, jobId, navigate]);

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
            onClick={() => navigate(ROUTES.RESUMES)}
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
            AI Resume Tailoring
          </h2>
          <p className="text-gray-600">{status}</p>
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
