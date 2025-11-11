import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { CoverLetter } from "../../types";
import { api } from "../../services/api";

interface CoverLetterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverLetter: CoverLetter | null;
  onExport: (format: "pdf" | "docx" | "txt" | "html") => void;
  onShowAdvancedExport?: () => void;
  isExporting?: boolean;
}

export function CoverLetterPreviewModal({
  isOpen,
  onClose,
  coverLetter,
  onExport,
  onShowAdvancedExport,
  isExporting = false,
}: CoverLetterPreviewModalProps) {
  const [userName, setUserName] = useState<string>("Your Name");
  const [jobDetails, setJobDetails] = useState<any>(null);

  // Fetch user profile for name
  useEffect(() => {
    if (isOpen && coverLetter) {
      const fetchUserData = async () => {
        try {
          const profileResponse = await api.getProfile();
          if (profileResponse.ok && profileResponse.data?.profile) {
            const profile = profileResponse.data.profile;
            const name =
              profile.fullName ||
              `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
            if (name) {
              setUserName(name);
            }
          }
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
      };

      // Fetch job details if jobId exists
      const fetchJobDetails = async () => {
        if (coverLetter.jobId) {
          try {
            const jobResponse = await api.getJobOpportunity(coverLetter.jobId);
            if (jobResponse.ok && jobResponse.data?.jobOpportunity) {
              setJobDetails(jobResponse.data.jobOpportunity);
            }
          } catch (err) {
            console.error("Failed to fetch job details:", err);
          }
        }
      };

      fetchUserData();
      fetchJobDetails();
    }
  }, [isOpen, coverLetter]);

  if (!isOpen || !coverLetter) return null;

  const colors = coverLetter.customizations?.colors || {
    primary: "#000000",
    secondary: "#000000",
    text: "#000000",
    background: "#FFFFFF",
    accent: "#F5F5F5",
  };
  const fonts = coverLetter.customizations?.fonts || {
    heading: "Arial",
    body: "Arial",
    size: { heading: "14pt", body: "11pt" },
  };

  // Parse font sizes
  const bodyFontSize = fonts.size?.body
    ? parseFloat(fonts.size.body.replace("pt", "")) || 11
    : 11;

    return (
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm ${isExporting ? 'z-[45]' : 'z-50'} flex items-center justify-center p-4 transition-opacity duration-200`}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Cover Letter Preview</h2>
            <p className="text-sm text-gray-500 mt-1">
              Review your cover letter before exporting
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onShowAdvancedExport?.()}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon icon="mingcute:download-line" className="w-5 h-5" />
              {isExporting ? "Exporting..." : "Export"}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon icon="mingcute:close-line" className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <div
            id="cover-letter-export-target"
            className="bg-white shadow-lg p-12 mx-auto max-w-3xl"
            style={{
              fontFamily: fonts.body || "Arial",
              backgroundColor: colors.background || "#FFFFFF",
              color: colors.text || "#000000",
            }}
          >
            {/* Date */}
            <div
              className="text-right mb-6"
              style={{
                fontSize: `${bodyFontSize}pt`,
                color: colors.text || "#000000",
              }}
            >
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>

            {/* Recipient */}
            {jobDetails && (
              <div
                className="mb-6"
                style={{
                  fontSize: `${bodyFontSize}pt`,
                  color: colors.text || "#000000",
                }}
              >
                <div>{jobDetails.company || ""}</div>
                {jobDetails.location && <div>{jobDetails.location}</div>}
              </div>
            )}

            {/* Greeting */}
            <div
              className="mb-4"
              style={{
                fontSize: `${bodyFontSize}pt`,
                color: colors.text || "#000000",
              }}
            >
              {coverLetter.content?.greeting || "Dear Hiring Manager,"}
            </div>

            {/* Opening Paragraph */}
            {coverLetter.content?.opening && (
              <div
                className="mb-4"
                style={{
                  fontSize: `${bodyFontSize}pt`,
                  color: colors.text || "#000000",
                  lineHeight: "1.6",
                  textAlign: "justify",
                }}
              >
                {coverLetter.content.opening}
              </div>
            )}

            {/* Body Paragraphs */}
            {coverLetter.content?.body &&
              Array.isArray(coverLetter.content.body) &&
              coverLetter.content.body.map((paragraph, index) => (
                <div
                  key={index}
                  className="mb-4"
                  style={{
                    fontSize: `${bodyFontSize}pt`,
                    color: colors.text || "#000000",
                    lineHeight: "1.6",
                    textAlign: "justify",
                  }}
                >
                  {paragraph}
                </div>
              ))}

            {/* Fallback to fullText if body is empty */}
            {(!coverLetter.content?.body ||
              coverLetter.content.body.length === 0) &&
              coverLetter.content?.fullText && (
                <div
                  className="mb-4 whitespace-pre-line"
                  style={{
                    fontSize: `${bodyFontSize}pt`,
                    color: colors.text || "#000000",
                    lineHeight: "1.6",
                    textAlign: "justify",
                  }}
                >
                  {coverLetter.content.fullText}
                </div>
              )}

            {/* Closing Paragraph */}
            {coverLetter.content?.closing && (
              <div
                className="mb-4"
                style={{
                  fontSize: `${bodyFontSize}pt`,
                  color: colors.text || "#000000",
                  lineHeight: "1.6",
                  textAlign: "justify",
                }}
              >
                {coverLetter.content.closing}
              </div>
            )}

            {/* Signature */}
            <div className="mt-8">
              <div
                className="mb-2"
                style={{
                  fontSize: `${bodyFontSize}pt`,
                  color: colors.text || "#000000",
                }}
              >
                Sincerely,
              </div>
              <div
                style={{
                  fontSize: `${bodyFontSize}pt`,
                  color: colors.text || "#000000",
                }}
              >
                {userName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

