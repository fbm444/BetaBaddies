import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ROUTES } from "../config/routes";
import { CoverLetter } from "../types";
import { coverLetterService } from "../services/coverLetterService";
import { api } from "../services/api";
import { CoverLetterTopBar } from "../components/coverletter/CoverLetterTopBar";
import { CoverLetterAIAssistant } from "../components/coverletter/CoverLetterAIAssistant";
import { CoverLetterPreviewModal } from "../components/coverletter/CoverLetterPreviewModal";
import {
  CoverLetterExportModal,
  ExportFormat,
  ExportTheme,
} from "../components/coverletter/CoverLetterExportModal";
import { Toast } from "../components/resume/Toast";
import { ShareDocumentModal } from "../components/team/ShareDocumentModal";

export function CoverLetterBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const coverLetterId = searchParams.get("id");
  const templateId = searchParams.get("templateId");
  const reviewMode = searchParams.get("mode") === "review"; // Review/suggesting mode for editors
  const teamId = searchParams.get("teamId"); // Team ID when in review mode

  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  // Review mode state
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState<{ section: string; index?: number } | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Helper function to validate UUID format
  const isValidUUID = (id: string | null): boolean => {
    if (!id || id === "new") return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  // Fetch cover letter or create new
  useEffect(() => {
    const fetchCoverLetter = async () => {
      try {
        setIsLoading(true);

        if (coverLetterId && isValidUUID(coverLetterId)) {
          // In review mode, use the collaboration API to get shared document
          if (reviewMode && teamId) {
            const response = await api.getDocumentDetails("cover_letter", coverLetterId);
            if (response.ok && response.data) {
              const doc = response.data.document;
              setCoverLetter({
                id: doc.id,
                userId: "",
                name: doc.name || doc.versionName || "Untitled Cover Letter",
                versionName: doc.versionName,
                content: doc.content || {},
                customizations: doc.customizations || {},
                jobId: doc.jobId,
                versionNumber: doc.versionNumber || 1,
                isMaster: false,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
              } as CoverLetter);
            } else {
              throw new Error("Failed to load shared cover letter");
            }
          } else {
            // Load existing cover letter (owner view)
          const response = await coverLetterService.getCoverLetter(coverLetterId);
          if (response.ok && response.data) {
            setCoverLetter(response.data.coverLetter);
          } else {
            throw new Error("Failed to load cover letter");
            }
          }
        } else if (templateId) {
          // Create new cover letter from template
          let template: any = null;
          let templateResponse = null;
          
          try {
            templateResponse = await coverLetterService.getTemplate(templateId);
            if (templateResponse.ok && templateResponse.data) {
              template = templateResponse.data.template;
            }
          } catch (templateError) {
            console.warn("Failed to fetch template, will create cover letter with defaults:", templateError);
          }

          // If template fetch failed, try to get default template settings
          if (!template && templateId.startsWith("default-")) {
            // Get all templates to find the default one
            try {
              const allTemplatesResponse = await coverLetterService.getTemplates();
              if (allTemplatesResponse.ok && allTemplatesResponse.data) {
                template = allTemplatesResponse.data.templates.find(
                  (t) => t.id === templateId
                );
              }
            } catch (allTemplatesError) {
              console.warn("Failed to get all templates:", allTemplatesError);
            }
          }

          // Create cover letter with template settings (or defaults if template not found)
          const newCoverLetterData = {
            name: template 
              ? `Cover Letter - ${template.templateName}`
              : "New Cover Letter",
            templateId: template?.id || (templateId || undefined),
            content: {
              greeting: template?.tone === "casual" 
                ? "Hi [Hiring Manager Name],"
                : "Dear Hiring Manager,",
              opening: "",
              body: [],
              closing: "",
              fullText: "",
            },
            toneSettings: {
              tone: (template?.tone || "formal") as "formal" | "casual" | "enthusiastic" | "analytical",
              length: (template?.length || "standard") as "brief" | "standard" | "detailed",
              writingStyle: (template?.writingStyle || "direct") as "direct" | "narrative" | "bullet-points",
            },
            customizations: {
              colors: template?.colors
                ? (typeof template.colors === "string"
                    ? JSON.parse(template.colors)
                    : template.colors)
                : {
                    primary: "#000000",
                    secondary: "#000000",
                    text: "#000000",
                    background: "#FFFFFF",
                    accent: "#F5F5F5",
                  },
              fonts: template?.fonts
                ? (typeof template.fonts === "string"
                    ? JSON.parse(template.fonts)
                    : template.fonts)
                : {
                    heading: "Arial",
                    body: "Arial",
                    size: { heading: "14pt", body: "11pt" },
                  },
            },
          };

          const createResponse = await coverLetterService.createCoverLetter(
            newCoverLetterData
          );
          if (createResponse.ok && createResponse.data) {
            const newCoverLetter = createResponse.data.coverLetter;
            setCoverLetter(newCoverLetter);
            // Update URL with new ID
            navigate(`${ROUTES.COVER_LETTER_BUILDER}?id=${newCoverLetter.id}`, {
              replace: true,
            });
                 } else {
                   console.log("Error: Cannot create cover letter.")
                   throw new Error("Failed to create cover letter");
                 }
               } else {
                 // Create blank cover letter
                 const newCoverLetterData = {
                   name: "New Cover Letter",
                   content: {
                     greeting: "Dear Hiring Manager,",
                     opening: "",
                     body: [],
                     closing: "",
                     fullText: "",
                   },
                   toneSettings: {
                     tone: "formal" as "formal" | "casual" | "enthusiastic" | "analytical",
                     length: "standard" as "brief" | "standard" | "detailed",
                   },
                 };

                 const createResponse = await coverLetterService.createCoverLetter(
                   newCoverLetterData
                 );
                 if (createResponse.ok && createResponse.data) {
                   const newCoverLetter = createResponse.data.coverLetter;
                   setCoverLetter(newCoverLetter);
                   navigate(`${ROUTES.COVER_LETTER_BUILDER}?id=${newCoverLetter.id}`, {
                     replace: true,
                   });
                 }
               }
             } catch (err: any) {
               console.error("Error loading cover letter:", err);
               setToast({
                 message: err.message || "Failed to load cover letter",
                 type: "error",
               });
               navigate(ROUTES.COVER_LETTERS);
             } finally {
               setIsLoading(false);
             }
           };

    fetchCoverLetter();
  }, [coverLetterId, templateId, navigate, reviewMode, teamId]);

  // Fetch comments - in review mode for specific team, in owner mode from all teams
  useEffect(() => {
    if (coverLetterId) {
      const fetchComments = async () => {
        try {
          setIsLoadingComments(true);
          if (reviewMode && teamId) {
            // Review mode: fetch comments for specific team
            const response = await api.getDocumentComments("cover_letter", coverLetterId, teamId);
            if (response.ok && response.data) {
              setComments(response.data.comments || []);
            }
          } else if (!reviewMode && coverLetter) {
            // Owner mode: fetch comments from all teams where document is shared
            // First, get all teams where this document is shared
            try {
              const userTeamsResponse = await api.getUserTeams();
              if (userTeamsResponse.ok && userTeamsResponse.data?.teams) {
                const teams = userTeamsResponse.data.teams;
                // Fetch comments from all teams
                const allComments: any[] = [];
                for (const team of teams) {
                  try {
                    const commentsResponse = await api.getDocumentComments("cover_letter", coverLetterId, team.id);
                    if (commentsResponse.ok && commentsResponse.data?.comments) {
                      // Add team info to each comment
                      const teamComments = commentsResponse.data.comments.map((c: any) => ({
                        ...c,
                        teamId: team.id,
                        teamName: team.teamName,
                      }));
                      allComments.push(...teamComments);
                    }
                  } catch (err) {
                    console.error(`Failed to fetch comments from team ${team.id}:`, err);
                  }
                }
                setComments(allComments);
              }
            } catch (error) {
              console.error("Failed to fetch teams for comments:", error);
            }
          }
        } catch (error) {
          console.error("Failed to fetch comments:", error);
        } finally {
          setIsLoadingComments(false);
        }
      };
      fetchComments();
    }
  }, [reviewMode, coverLetterId, teamId, coverLetter]);

  // Auto-save functionality - DISABLED to prevent double saves
  // Users can manually save with the Save button
  // useEffect(() => {
  //   if (!coverLetter || !coverLetterId || coverLetterId === "new") return;
  //   // Auto-save logic here
  // }, [coverLetter, coverLetterId]);

         const handleSave = async () => {
           console.log("🔵 handleSave called", { coverLetterId, hasCoverLetter: !!coverLetter });
           
           if (!coverLetter || !coverLetterId || coverLetterId === "new") {
             setToast({
               message: "Please wait for the cover letter to be created",
               type: "info",
             });
             return;
           }

           try {
             setIsSaving(true);
             console.log("🟢 Calling updateCoverLetter with ID:", coverLetterId);
             await coverLetterService.updateCoverLetter(coverLetterId, {
               name: coverLetter.name,
               content: coverLetter.content,
               toneSettings: coverLetter.toneSettings,
               customizations: coverLetter.customizations,
             });
             console.log("✅ Update complete");
             setLastSaved(new Date());
             setToast({
               message: "Cover letter saved successfully!",
               type: "success",
             });
           } catch (err: any) {
             console.error("❌ Save error:", err);
             setToast({
               message: err.message || "Failed to save cover letter",
               type: "error",
             });
           } finally {
             setIsSaving(false);
           }
         };

  const handleNameChange = async (newName: string) => {
    if (!coverLetter || !coverLetterId) return;

    // Update local state immediately for responsiveness
    setCoverLetter({
      ...coverLetter,
      name: newName,
    });

    // Save to backend
    try {
      await coverLetterService.updateCoverLetter(coverLetterId, {
        name: newName,
        content: coverLetter.content,
        toneSettings: coverLetter.toneSettings,
        customizations: coverLetter.customizations,
      });
      setLastSaved(new Date());
    } catch (err: any) {
      console.error("Failed to update name:", err);
      setToast({
        message: "Failed to update cover letter name",
        type: "error",
      });
    }
  };

  const handleExportClick = () => {
    // Show preview modal first
    setShowPreviewModal(true);
    setShowExportMenu(false);
  };

  const handleExportFromPreview = (format: "pdf" | "docx" | "txt" | "html") => {
    // For PDF, we need the preview element, so keep preview modal open
    // For other formats, close preview and open export modal
    if (format === "pdf") {
      // Keep preview modal open, just trigger export directly
      // The preview element will be available
      handleExport({
        format: "pdf",
        filename: coverLetter?.name || coverLetter?.versionName || `cover_letter_${coverLetterId || Date.now()}`,
        watermark: null,
        theme: "professional",
        printOptimized: true,
      });
    } else {
      // Close preview modal and open export modal for other formats
      setShowPreviewModal(false);
      // Small delay to prevent animation glitches
      setTimeout(() => {
        setShowExportModal(true);
      }, 150);
    }
  };

  const handleExport = async (options: {
    format: ExportFormat;
    filename: string;
    watermark?: File | null;
    theme: ExportTheme;
    printOptimized: boolean;
  }) => {
    if (!coverLetterId || coverLetterId === "new") {
      setToast({
        message: "Please save the cover letter before exporting",
        type: "info",
      });
      return;
    }

    try {
      setExporting(true);
      
      const format = options.format;
      const filename = options.filename || coverLetter?.name || coverLetter?.versionName || `cover_letter_${coverLetterId}`;

      // For PDF - use client-side html2canvas + jsPDF (like resume export)
      if (format === "pdf") {
        // Close export modal first if it's open (before opening preview to avoid glitches)
        if (showExportModal) {
          setShowExportModal(false);
          // Wait for modal to close
          await new Promise(resolve => setTimeout(resolve, 250));
        }

        // Only open preview modal if it's not already open
        if (!showPreviewModal) {
          setShowPreviewModal(true);
          // Wait for modal animation to complete
          await new Promise(resolve => setTimeout(resolve, 400));
        } else {
          // If already open, just wait a bit for stability
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Find the cover letter preview element by ID
        let previewElement = document.getElementById(
          "cover-letter-export-target"
        ) as HTMLElement;

        if (!previewElement) {
          // Retry after a bit more time
          await new Promise(resolve => setTimeout(resolve, 200));
          previewElement = document.getElementById(
            "cover-letter-export-target"
          ) as HTMLElement;
        }

        if (!previewElement) {
          setToast({
            message: "Could not find preview element. Please open the preview first.",
            type: "error",
          });
          setExporting(false);
          return;
        }

        // Dynamically import html2canvas and jsPDF
        const html2canvas = (await import("html2canvas")).default;
        const jsPDFModule = await import("jspdf");
        const jsPDF = (jsPDFModule as any).default || jsPDFModule;

        // Inject a style override to convert oklch CSS variables to RGB before capture
        const styleOverride = document.createElement("style");
        styleOverride.id = "pdf-export-oklch-override";
        styleOverride.textContent = `
          :root {
            --background: #ffffff;
            --foreground: #1a1a1a;
            --card: #ffffff;
            --card-foreground: #1a1a1a;
            --popover: #ffffff;
            --popover-foreground: #1a1a1a;
            --primary: #1a1a1a;
            --primary-foreground: #fafafa;
            --secondary: #f5f5f5;
            --secondary-foreground: #1a1a1a;
            --muted: #f5f5f5;
            --muted-foreground: #737373;
            --accent: #f5f5f5;
            --accent-foreground: #1a1a1a;
            --destructive: #dc2626;
            --border: #e5e5e5;
            --input: #e5e5e5;
            --ring: #a3a3a3;
          }
        `;
        document.head.appendChild(styleOverride);

        try {
          // Capture the element as canvas
          const canvas = await html2canvas(previewElement, {
            scale: 2, // Higher quality
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            width: previewElement.scrollWidth,
            height: previewElement.scrollHeight,
          });

          // Calculate PDF dimensions (A4: 210mm x 297mm)
          const imgWidth = 210; // A4 width in mm
          const pageHeight = 297; // A4 height in mm
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const pdf = new jsPDF("p", "mm", "a4");

          // If content fits on one page
          if (imgHeight <= pageHeight) {
            pdf.addImage(
              canvas.toDataURL("image/png"),
              "PNG",
              0,
              0,
              imgWidth,
              imgHeight
            );
          } else {
            // Split across multiple pages
            const pageCount = Math.ceil(imgHeight / pageHeight);

            for (let i = 0; i < pageCount; i++) {
              if (i > 0) {
                pdf.addPage();
              }

              // Calculate the portion of the image to show on this page
              const sourceY = (canvas.height / imgHeight) * (i * pageHeight);
              const sourceHeight = Math.min(
                (canvas.height / imgHeight) * pageHeight,
                canvas.height - sourceY
              );

              // Create a temporary canvas for this page's portion
              const pageCanvas = document.createElement("canvas");
              pageCanvas.width = canvas.width;
              pageCanvas.height = sourceHeight;
              const pageCtx = pageCanvas.getContext("2d");

              if (pageCtx) {
                pageCtx.drawImage(
                  canvas,
                  0,
                  sourceY,
                  canvas.width,
                  sourceHeight,
                  0,
                  0,
                  canvas.width,
                  sourceHeight
                );

                const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;
                pdf.addImage(
                  pageCanvas.toDataURL("image/png"),
                  "PNG",
                  0,
                  0,
                  imgWidth,
                  pageImgHeight
                );
              }
            }
          }

          // Add watermark if provided
          if (options.watermark) {
            const watermarkImg = await new Promise<HTMLImageElement>(
              (resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = URL.createObjectURL(options.watermark!);
              }
            );

            // Add watermark to each page
            const pageCount = pdf.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
              pdf.setPage(i);
              const pageWidth = pdf.internal.pageSize.getWidth();
              const pageHeight = pdf.internal.pageSize.getHeight();

              // Calculate watermark size (20% of page width)
              const watermarkWidth = pageWidth * 0.2;
              const watermarkHeight =
                (watermarkImg.height / watermarkImg.width) * watermarkWidth;

              // Center the watermark
              const x = (pageWidth - watermarkWidth) / 2;
              const y = (pageHeight - watermarkHeight) / 2;

              // Add watermark with opacity
              pdf.saveGraphicsState();
              pdf.setGState(pdf.GState({ opacity: 0.15 }));
              pdf.addImage(
                watermarkImg.src,
                "PNG",
                x,
                y,
                watermarkWidth,
                watermarkHeight
              );
              pdf.restoreGraphicsState();
            }

            URL.revokeObjectURL(watermarkImg.src);
          }

          // Save the PDF
          pdf.save(`${filename}.pdf`);
          
          setToast({
            message: "Cover letter exported as PDF successfully!",
            type: "success",
          });
          
          // Close preview modal after successful export (with delay for smooth animation)
          setTimeout(() => {
            setShowPreviewModal(false);
            setExporting(false);
          }, 400);
        } catch (pdfError) {
          console.error("Error during PDF export:", pdfError);
          setToast({
            message: "Failed to export PDF. Please try again.",
            type: "error",
          });
          setExporting(false);
        } finally {
          // Remove the style override
          const overrideStyle = document.getElementById(
            "pdf-export-oklch-override"
          );
          if (overrideStyle) {
            overrideStyle.remove();
          }
        }
      } else {
        // For other formats, use the backend service
      let result;
      switch (format) {
        case "docx":
          result = await coverLetterService.exportDOCX(coverLetterId);
          break;
        case "txt":
          result = await coverLetterService.exportTXT(coverLetterId);
          break;
        case "html":
          result = await coverLetterService.exportHTML(coverLetterId);
          break;
      }

        if (result) {
          coverLetterService.downloadBlob(result.blob, result.filename);
          setToast({
            message: `Cover letter exported as ${format.toUpperCase()} successfully!`,
            type: "success",
          });
        }
      }
    } catch (err: any) {
      console.error("Export error:", err);
      setToast({
        message: err.message || `Failed to export as ${options.format.toUpperCase()}`,
        type: "error",
      });
    } finally {
      // Only set exporting to false if not already handled (PDF handles it separately)
      if (options.format !== "pdf") {
        setExporting(false);
      }
    }
  };

  const handleContentUpdate = (field: string, value: any) => {
    if (!coverLetter) return;

    setCoverLetter({
      ...coverLetter,
      content: {
        ...coverLetter.content,
        [field]: value,
      },
    });
  };

  const handleBodyParagraphUpdate = (index: number, value: string) => {
    if (!coverLetter) return;

    const newBody = [...(coverLetter.content?.body || [])];
    if (index >= newBody.length) {
      newBody.push(value);
    } else {
      newBody[index] = value;
    }

    setCoverLetter({
      ...coverLetter,
      content: {
        ...coverLetter.content,
        body: newBody,
      },
    });
  };

  const handleAddBodyParagraph = () => {
    if (!coverLetter) return;

    const newBody = [...(coverLetter.content?.body || []), ""];
    setCoverLetter({
      ...coverLetter,
      content: {
        ...coverLetter.content,
        body: newBody,
      },
    });
  };

  const handleRemoveBodyParagraph = (index: number) => {
    if (!coverLetter) return;

    const newBody = [...(coverLetter.content?.body || [])];
    newBody.splice(index, 1);
    setCoverLetter({
      ...coverLetter,
      content: {
        ...coverLetter.content,
        body: newBody,
      },
    });
  };

  const handleCustomizationUpdate = (customizations: any) => {
    if (!coverLetter) return;

    setCoverLetter({
      ...coverLetter,
      customizations: {
        ...coverLetter.customizations,
        ...customizations,
      },
    });
  };

  // Review mode: Add comment to a section
  const handleAddComment = async (section: string, index?: number) => {
    if (!newComment.trim() || !coverLetterId || !teamId || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      const documentSection = index !== undefined ? `${section}_${index}` : section;
      const response = await api.addDocumentComment({
        documentType: "cover_letter",
        documentId: coverLetterId,
        teamId,
        commentText: newComment.trim(),
        documentSection,
      });

      if (response.ok) {
        setNewComment("");
        setShowCommentInput(null);
        // Refresh comments
        const commentsResponse = await api.getDocumentComments("cover_letter", coverLetterId, teamId);
        if (commentsResponse.ok && commentsResponse.data) {
          setComments(commentsResponse.data.comments || []);
        }
        setToast({
          message: "Comment added successfully",
          type: "success",
        });
      } else {
        setToast({
          message: response.error || "Failed to add comment",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
      setToast({
        message: "Failed to add comment. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Get comments for a specific section
  const getSectionComments = (section: string, index?: number) => {
    const documentSection = index !== undefined ? `${section}_${index}` : section;
    return comments.filter((c) => c.documentSection === documentSection);
  };

  // Owner mode: Accept a suggestion (apply it to the cover letter)
  const handleAcceptSuggestion = async (comment: any) => {
    if (!coverLetter || !coverLetterId) return;

    try {
      // Apply the suggestion based on the comment text
      // For now, we'll show the comment text as a suggestion that can be applied
      // In a more advanced version, we could parse structured suggestions
      const suggestionText = comment.commentText;
      
      // Determine which section to update based on documentSection
      const section = comment.documentSection?.split('_')[0] || '';
      const index = comment.documentSection?.includes('_') 
        ? parseInt(comment.documentSection.split('_')[1]) 
        : undefined;

      if (section === 'greeting' && suggestionText.toLowerCase().includes('greeting')) {
        // Extract greeting from suggestion or use a default
        const newGreeting = suggestionText.match(/["']([^"']+)["']/) 
          ? suggestionText.match(/["']([^"']+)["']/)![1]
          : suggestionText.split('\n')[0].replace(/^(suggest|try|use):\s*/i, '').trim();
        if (newGreeting) {
          handleContentUpdate('greeting', newGreeting);
          setToast({
            message: "Suggestion applied to greeting",
            type: "success",
          });
        }
      } else if (section === 'opening') {
        // For opening, we can replace or append based on suggestion
        const newOpening = suggestionText.replace(/^(suggest|try|use):\s*/i, '').trim();
        if (newOpening) {
          handleContentUpdate('opening', newOpening);
          setToast({
            message: "Suggestion applied to opening paragraph",
            type: "success",
          });
        }
      } else if (section === 'body' && index !== undefined) {
        const newBody = [...(coverLetter.content?.body || [])];
        const suggestionText = comment.commentText.replace(/^(suggest|try|use):\s*/i, '').trim();
        if (suggestionText && newBody[index] !== undefined) {
          newBody[index] = suggestionText;
          setCoverLetter({
            ...coverLetter,
            content: {
              ...coverLetter.content,
              body: newBody,
            },
          });
          setToast({
            message: `Suggestion applied to paragraph ${index + 1}`,
            type: "success",
          });
        }
      } else if (section === 'closing') {
        const newClosing = comment.commentText.replace(/^(suggest|try|use):\s*/i, '').trim();
        if (newClosing) {
          handleContentUpdate('closing', newClosing);
          setToast({
            message: "Suggestion applied to closing paragraph",
            type: "success",
          });
        }
      }

      // Save the cover letter after applying suggestion
      await handleSave();
    } catch (error) {
      console.error("Failed to apply suggestion:", error);
      setToast({
        message: "Failed to apply suggestion",
        type: "error",
      });
    }
  };

  // Owner mode: Reject/dismiss a suggestion
  const handleRejectSuggestion = (comment: any) => {
    // For now, just remove it from the UI (in a full implementation, we'd mark it as rejected in the backend)
    setComments(comments.filter((c) => c.id !== comment.id));
    setToast({
      message: "Suggestion dismissed",
      type: "info",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin mx-auto text-[#3351FD]"
          />
          <p className="mt-4 text-gray-600">Loading cover letter...</p>
        </div>
      </div>
    );
  }

  if (!coverLetter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="mingcute:alert-circle-line"
            className="w-12 h-12 mx-auto text-red-500 mb-4"
          />
          <p className="text-red-600 mb-4">Cover letter not found</p>
          <button
            onClick={() => navigate(ROUTES.COVER_LETTERS)}
            className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors"
          >
            Back to Cover Letters
          </button>
        </div>
      </div>
    );
  }

  const colors = coverLetter.customizations?.colors || {};
  const fonts = coverLetter.customizations?.fonts || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <CoverLetterTopBar
        coverLetter={coverLetter}
        coverLetterId={coverLetterId}
        isSaving={isSaving}
        isAutoSaving={false}
        lastSaved={lastSaved}
        exporting={exporting}
        showExportMenu={showExportMenu}
        showCustomization={showCustomization}
        onNavigateBack={() => navigate(ROUTES.COVER_LETTERS)}
        onSave={handleSave}
        onExport={handleExportClick}
        onToggleExportMenu={() => setShowExportMenu(!showExportMenu)}
        onToggleCustomization={() => setShowCustomization(!showCustomization)}
        onNameChange={handleNameChange}
        onShare={() => {
          setShowShareModal(true);
        }}
      />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Main Editor - Left Side */}
        <div
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            showAIPanel ? "mr-96" : ""
          }`}
        >
          <div className="max-w-4xl mx-auto p-8">
            {/* Customization Panel */}
            {showCustomization && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Customize Appearance
                </h3>

                {/* Colors */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Colors
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Primary Color
                      </label>
                      <input
                        type="color"
                        value={colors.primary || "#000000"}
                        onChange={(e) =>
                          handleCustomizationUpdate({
                            colors: { ...colors, primary: e.target.value },
                          })
                        }
                        className="w-full h-10 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={colors.text || "#000000"}
                        onChange={(e) =>
                          handleCustomizationUpdate({
                            colors: { ...colors, text: e.target.value },
                          })
                        }
                        className="w-full h-10 rounded border border-gray-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Fonts */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fonts
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Heading Font
                      </label>
                      <select
                        value={fonts.heading || "Arial"}
                        onChange={(e) =>
                          handleCustomizationUpdate({
                            fonts: { ...fonts, heading: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Calibri">Calibri</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Body Font
                      </label>
                      <select
                        value={fonts.body || "Arial"}
                        onChange={(e) =>
                          handleCustomizationUpdate({
                            fonts: { ...fonts, body: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Calibri">Calibri</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tone Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tone & Style
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Tone
                      </label>
                      <select
                        value={coverLetter.toneSettings?.tone || "formal"}
                        onChange={(e) =>
                          setCoverLetter({
                            ...coverLetter,
                            toneSettings: {
                              ...coverLetter.toneSettings,
                              tone: e.target.value as "formal" | "casual" | "enthusiastic" | "analytical",
                              length: coverLetter.toneSettings?.length || "standard",
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="formal">Formal</option>
                        <option value="casual">Casual</option>
                        <option value="enthusiastic">Enthusiastic</option>
                        <option value="analytical">Analytical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Length
                      </label>
                      <select
                        value={coverLetter.toneSettings?.length || "standard"}
                        onChange={(e) =>
                          setCoverLetter({
                            ...coverLetter,
                            toneSettings: {
                              ...coverLetter.toneSettings,
                              tone: coverLetter.toneSettings?.tone || "formal",
                              length: e.target.value as "brief" | "standard" | "detailed",
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="brief">Brief</option>
                        <option value="standard">Standard</option>
                        <option value="detailed">Detailed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Assistant Toggle Button - Hidden in review mode */}
            {!reviewMode && (
            <div className="mb-6">
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all bg-gradient-to-r from-[#845BFF] via-[#A95BFF] to-[#F551A2] text-white shadow-sm hover:opacity-90"
              >
                <Icon icon="mingcute:ai-fill" className="w-5 h-5" />
                {showAIPanel ? "Hide AI Assistant" : "Show AI Assistant"}
              </button>
            </div>
            )}

            {/* Cover Letter Editor */}
            <div
              className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm"
              style={{
                fontFamily: fonts.body || "Arial",
                color: colors.text || "#000000",
              }}
            >
              {/* Greeting */}
              <div className="mb-6 relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                  Greeting
                </label>
                  {reviewMode ? (
                    <button
                      onClick={() => setShowCommentInput(showCommentInput?.section === "greeting" ? null : { section: "greeting" })}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Icon icon="mingcute:comment-line" width={16} />
                      {getSectionComments("greeting").length > 0 && (
                        <span className="bg-blue-700 text-white rounded-full px-1.5 text-xs">
                          {getSectionComments("greeting").length}
                        </span>
                      )}
                    </button>
                  ) : getSectionComments("greeting").length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs text-amber-600 bg-amber-100 rounded">
                      <Icon icon="mingcute:lightbulb-line" width={16} />
                      {getSectionComments("greeting").length} {getSectionComments("greeting").length === 1 ? "suggestion" : "suggestions"}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={coverLetter.content?.greeting || ""}
                  onChange={(e) => handleContentUpdate("greeting", e.target.value)}
                  disabled={reviewMode}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent ${
                    reviewMode ? "bg-gray-50 cursor-not-allowed" : ""
                  }`}
                  placeholder="Dear Hiring Manager,"
                />
                {/* Comments for greeting */}
                {reviewMode && getSectionComments("greeting").length > 0 && (
                  <div className="mt-2 space-y-1">
                    {getSectionComments("greeting").map((comment) => (
                      <div key={comment.id} className="bg-blue-50 border-l-2 border-blue-400 pl-3 py-2 rounded text-sm">
                        <div className="font-medium text-blue-900">{comment.commenterName || comment.commenterEmail}</div>
                        <div className="text-blue-700">{comment.commentText}</div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Comment input for greeting */}
                {reviewMode && showCommentInput?.section === "greeting" && (
                  <div className="mt-2 border border-blue-300 rounded-lg p-3 bg-blue-50">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment or suggestion..."
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleAddComment("greeting")}
                        disabled={!newComment.trim() || isSubmittingComment}
                        className="px-3 py-1 bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 text-sm"
                      >
                        Add Comment
                      </button>
                      <button
                        onClick={() => {
                          setShowCommentInput(null);
                          setNewComment("");
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Opening Paragraph */}
              <div className="mb-6 relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                  Opening Paragraph
                </label>
                  {reviewMode ? (
                    <button
                      onClick={() => setShowCommentInput(showCommentInput?.section === "opening" ? null : { section: "opening" })}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Icon icon="mingcute:comment-line" width={16} />
                      {getSectionComments("opening").length > 0 && (
                        <span className="bg-blue-700 text-white rounded-full px-1.5 text-xs">
                          {getSectionComments("opening").length}
                        </span>
                      )}
                    </button>
                  ) : getSectionComments("opening").length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs text-amber-600 bg-amber-100 rounded">
                      <Icon icon="mingcute:lightbulb-line" width={16} />
                      {getSectionComments("opening").length} {getSectionComments("opening").length === 1 ? "suggestion" : "suggestions"}
                    </span>
                  )}
                </div>
                <textarea
                  value={coverLetter.content?.opening || ""}
                  onChange={(e) => handleContentUpdate("opening", e.target.value)}
                  disabled={reviewMode}
                  rows={4}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent ${
                    reviewMode ? "bg-gray-50 cursor-not-allowed" : ""
                  }`}
                  placeholder="I am writing to express my interest in..."
                />
                {/* Comments for opening */}
                {getSectionComments("opening").length > 0 && (
                  <div className="mt-2 space-y-1">
                    {getSectionComments("opening").map((comment) => (
                      <div key={comment.id} className={`border-l-2 pl-3 py-2 rounded text-sm ${
                        reviewMode 
                          ? "bg-blue-50 border-blue-400" 
                          : "bg-amber-50 border-amber-400"
                      }`}>
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1">
                            <div className={`font-medium ${reviewMode ? "text-blue-900" : "text-amber-900"}`}>
                              {comment.commenterName || comment.commenterEmail}
                              {comment.teamName && !reviewMode && (
                                <span className="text-xs text-amber-600 ml-2">({comment.teamName})</span>
                              )}
                            </div>
                            <div className={reviewMode ? "text-blue-700" : "text-amber-800"}>{comment.commentText}</div>
                          </div>
                          {!reviewMode && (
                            <div className="flex gap-2 ml-2">
                              <button
                                onClick={() => handleAcceptSuggestion(comment)}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                title="Apply this suggestion"
                              >
                                <Icon icon="mingcute:check-line" width={14} />
                              </button>
                              <button
                                onClick={() => handleRejectSuggestion(comment)}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                                title="Dismiss this suggestion"
                              >
                                <Icon icon="mingcute:close-line" width={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Comment input for opening */}
                {reviewMode && showCommentInput?.section === "opening" && (
                  <div className="mt-2 border border-blue-300 rounded-lg p-3 bg-blue-50">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment or suggestion..."
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleAddComment("opening")}
                        disabled={!newComment.trim() || isSubmittingComment}
                        className="px-3 py-1 bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 text-sm"
                      >
                        Add Comment
                      </button>
                      <button
                        onClick={() => {
                          setShowCommentInput(null);
                          setNewComment("");
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Body Paragraphs */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Body Paragraphs
                  </label>
                  {!reviewMode && (
                  <button
                    onClick={handleAddBodyParagraph}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-[#3351FD] hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Icon icon="mingcute:add-line" className="w-4 h-4" />
                    Add Paragraph
                  </button>
                  )}
                </div>
                {(coverLetter.content?.body || []).map((paragraph, index) => (
                  <div key={index} className="mb-4 relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Paragraph {index + 1}</span>
                      {reviewMode ? (
                        <button
                          onClick={() => setShowCommentInput(showCommentInput?.section === "body" && showCommentInput?.index === index ? null : { section: "body", index })}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Icon icon="mingcute:comment-line" width={16} />
                          {getSectionComments("body", index).length > 0 && (
                            <span className="bg-blue-700 text-white rounded-full px-1.5 text-xs">
                              {getSectionComments("body", index).length}
                            </span>
                          )}
                        </button>
                      ) : getSectionComments("body", index).length > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs text-amber-600 bg-amber-100 rounded">
                          <Icon icon="mingcute:lightbulb-line" width={16} />
                          {getSectionComments("body", index).length} {getSectionComments("body", index).length === 1 ? "suggestion" : "suggestions"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <textarea
                        value={paragraph}
                        onChange={(e) =>
                          handleBodyParagraphUpdate(index, e.target.value)
                        }
                        disabled={reviewMode}
                        rows={4}
                        className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent ${
                          reviewMode ? "bg-gray-50 cursor-not-allowed" : ""
                        }`}
                        placeholder={`Body paragraph ${index + 1}...`}
                      />
                      {!reviewMode && (
                      <button
                        onClick={() => handleRemoveBodyParagraph(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Icon icon="mingcute:delete-line" className="w-5 h-5" />
                      </button>
                      )}
                    </div>
                    {/* Comments for body paragraph */}
                    {getSectionComments("body", index).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {getSectionComments("body", index).map((comment) => (
                          <div key={comment.id} className={`border-l-2 pl-3 py-2 rounded text-sm ${
                            reviewMode 
                              ? "bg-blue-50 border-blue-400" 
                              : "bg-amber-50 border-amber-400"
                          }`}>
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1">
                                <div className={`font-medium ${reviewMode ? "text-blue-900" : "text-amber-900"}`}>
                                  {comment.commenterName || comment.commenterEmail}
                                  {comment.teamName && !reviewMode && (
                                    <span className="text-xs text-amber-600 ml-2">({comment.teamName})</span>
                                  )}
                                </div>
                                <div className={reviewMode ? "text-blue-700" : "text-amber-800"}>{comment.commentText}</div>
                              </div>
                              {!reviewMode && (
                                <div className="flex gap-2 ml-2">
                                  <button
                                    onClick={() => handleAcceptSuggestion(comment)}
                                    className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                    title="Apply this suggestion"
                                  >
                                    <Icon icon="mingcute:check-line" width={14} />
                                  </button>
                                  <button
                                    onClick={() => handleRejectSuggestion(comment)}
                                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                                    title="Dismiss this suggestion"
                                  >
                                    <Icon icon="mingcute:close-line" width={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Comment input for body paragraph */}
                    {reviewMode && showCommentInput?.section === "body" && showCommentInput?.index === index && (
                      <div className="mt-2 border border-blue-300 rounded-lg p-3 bg-blue-50">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment or suggestion..."
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                          rows={2}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleAddComment("body", index)}
                            disabled={!newComment.trim() || isSubmittingComment}
                            className="px-3 py-1 bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 text-sm"
                          >
                            Add Comment
                          </button>
                          <button
                            onClick={() => {
                              setShowCommentInput(null);
                              setNewComment("");
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(!coverLetter.content?.body || coverLetter.content.body.length === 0) && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-sm">No body paragraphs yet</p>
                    <button
                      onClick={handleAddBodyParagraph}
                      className="mt-2 text-sm text-[#3351FD] hover:underline"
                    >
                      Add your first paragraph
                    </button>
                  </div>
                )}
              </div>

              {/* Closing Paragraph */}
              <div className="mb-6 relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                  Closing Paragraph
                </label>
                  {reviewMode ? (
                    <button
                      onClick={() => setShowCommentInput(showCommentInput?.section === "closing" ? null : { section: "closing" })}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Icon icon="mingcute:comment-line" width={16} />
                      {getSectionComments("closing").length > 0 && (
                        <span className="bg-blue-700 text-white rounded-full px-1.5 text-xs">
                          {getSectionComments("closing").length}
                        </span>
                      )}
                    </button>
                  ) : getSectionComments("closing").length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs text-amber-600 bg-amber-100 rounded">
                      <Icon icon="mingcute:lightbulb-line" width={16} />
                      {getSectionComments("closing").length} {getSectionComments("closing").length === 1 ? "suggestion" : "suggestions"}
                    </span>
                  )}
                </div>
                <textarea
                  value={coverLetter.content?.closing || ""}
                  onChange={(e) => handleContentUpdate("closing", e.target.value)}
                  disabled={reviewMode}
                  rows={3}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent ${
                    reviewMode ? "bg-gray-50 cursor-not-allowed" : ""
                  }`}
                  placeholder="Thank you for considering my application..."
                />
                {/* Comments for closing */}
                {getSectionComments("closing").length > 0 && (
                  <div className="mt-2 space-y-1">
                    {getSectionComments("closing").map((comment) => (
                      <div key={comment.id} className={`border-l-2 pl-3 py-2 rounded text-sm ${
                        reviewMode 
                          ? "bg-blue-50 border-blue-400" 
                          : "bg-amber-50 border-amber-400"
                      }`}>
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1">
                            <div className={`font-medium ${reviewMode ? "text-blue-900" : "text-amber-900"}`}>
                              {comment.commenterName || comment.commenterEmail}
                              {comment.teamName && !reviewMode && (
                                <span className="text-xs text-amber-600 ml-2">({comment.teamName})</span>
                              )}
                            </div>
                            <div className={reviewMode ? "text-blue-700" : "text-amber-800"}>{comment.commentText}</div>
                          </div>
                          {!reviewMode && (
                            <div className="flex gap-2 ml-2">
                              <button
                                onClick={() => handleAcceptSuggestion(comment)}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                title="Apply this suggestion"
                              >
                                <Icon icon="mingcute:check-line" width={14} />
                              </button>
                              <button
                                onClick={() => handleRejectSuggestion(comment)}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                                title="Dismiss this suggestion"
                              >
                                <Icon icon="mingcute:close-line" width={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Comment input for closing */}
                {reviewMode && showCommentInput?.section === "closing" && (
                  <div className="mt-2 border border-blue-300 rounded-lg p-3 bg-blue-50">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment or suggestion..."
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleAddComment("closing")}
                        disabled={!newComment.trim() || isSubmittingComment}
                        className="px-3 py-1 bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 text-sm"
                      >
                        Add Comment
                      </button>
                      <button
                        onClick={() => {
                          setShowCommentInput(null);
                          setNewComment("");
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Signature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closing
                </label>
                <input
                  type="text"
                  value="Sincerely,"
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Assistant Panel - Right Side */}
        {showAIPanel && (
          <CoverLetterAIAssistant
            coverLetter={coverLetter}
            coverLetterId={coverLetterId}
            isOpen={showAIPanel}
            onClose={() => setShowAIPanel(false)}
            onCoverLetterUpdate={(updates) => {
              if (coverLetter) {
                setCoverLetter({ ...coverLetter, ...updates });
              }
            }}
          />
        )}
      </div>

      {/* Preview Modal - Keep open during PDF export */}
      <CoverLetterPreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          if (!exporting) {
            setShowPreviewModal(false);
          }
        }}
        coverLetter={coverLetter}
        onExport={handleExportFromPreview}
        onShowAdvancedExport={() => {
          // Close preview first, then open export modal after animation
          setShowPreviewModal(false);
          setTimeout(() => {
            setShowExportModal(true);
          }, 200);
        }}
        isExporting={exporting}
      />

      {/* Export Modal */}
      <CoverLetterExportModal
        isOpen={showExportModal}
        onClose={() => {
          if (!exporting) {
            setShowExportModal(false);
          }
        }}
        onExport={async (options) => {
          // Close export modal first to avoid visual glitches
          setShowExportModal(false);
          // Wait for modal close animation to complete
          await new Promise(resolve => setTimeout(resolve, 250));
          // Then handle export
          // For PDF, it will open preview modal if needed
          // For other formats, it will export directly
          await handleExport(options);
        }}
        defaultFilename={coverLetter?.name || coverLetter?.versionName || `cover_letter_${coverLetterId || Date.now()}`}
        isExporting={exporting}
      />

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Share Document Modal */}
      {showShareModal && coverLetter && (
        <ShareDocumentModal
          documentType="cover_letter"
          documentId={coverLetter.id}
          documentName={coverLetter.versionName || coverLetter.title || "Untitled Cover Letter"}
          onClose={() => setShowShareModal(false)}
          onShared={() => {
            setShowShareModal(false);
            setToast({
              message: "Cover letter shared successfully with team!",
              type: "success",
            });
          }}
        />
      )}
    </div>
  );
}

