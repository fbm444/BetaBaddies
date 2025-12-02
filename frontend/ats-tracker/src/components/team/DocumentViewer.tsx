import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import { ResumePreviewModal } from "../resume/ResumePreviewModal";
import { CoverLetterPreviewModal } from "../coverletter/CoverLetterPreviewModal";
import { Resume, CoverLetter } from "../../types";

interface DocumentViewerProps {
  document: any;
  teamId: string;
  onClose?: () => void;
}

export function DocumentViewer({ document, teamId, onClose }: DocumentViewerProps) {
  const navigate = useNavigate();
  const [documentData, setDocumentData] = useState<Resume | CoverLetter | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    // For cover letters and resumes, navigate to builder in review mode
    if (document.documentType === "cover_letter") {
      navigate(`/coverletter/builder?id=${document.documentId}&mode=review&teamId=${teamId}`);
      return;
    }
    if (document.documentType === "resume") {
      navigate(`/resumes/builder?id=${document.documentId}&mode=review&teamId=${teamId}`);
      return;
    }
    // Fallback: load the document (shouldn't reach here for known types)
    loadDocumentAndComments();
  }, [document, teamId, navigate]);

  const loadDocumentAndComments = async () => {
    setIsLoading(true);
    try {
      const [docResponse, commentsResponse] = await Promise.all([
        api.getDocumentDetails(document.documentType, document.documentId),
        api.getDocumentComments(document.documentType, document.documentId, teamId),
      ]);

      if (docResponse.ok && docResponse.data) {
        const doc = docResponse.data.document;
        console.log("[DocumentViewer] Loaded document:", {
          type: document.documentType,
          id: doc.id,
          hasContent: !!doc.content,
          contentKeys: doc.content ? Object.keys(doc.content) : [],
          content: doc.content
        });
        
        // Map the document to the expected format
        if (document.documentType === "resume") {
          setDocumentData({
            id: doc.id,
            name: doc.name || doc.versionName || "Untitled Resume",
            versionName: doc.versionName,
            content: doc.content || {},
            customizations: doc.customizations || {},
            sectionConfig: doc.sectionConfig || {},
            versionNumber: doc.versionNumber || 1,
            isMaster: doc.isMaster || false,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          } as Resume);
        } else {
          // Ensure content structure is correct for cover letters
          let content = doc.content;
          if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
            // If content is missing or empty, create a default structure
            content = {
              greeting: "Dear Hiring Manager,",
              opening: "",
              body: [],
              closing: "",
              fullText: ""
            };
          }
          
          setDocumentData({
            id: doc.id,
            userId: "", // Not needed for viewing
            name: doc.name || doc.versionName || "Untitled Cover Letter",
            versionName: doc.versionName,
            content: content,
            customizations: doc.customizations || {},
            jobId: doc.jobId,
            versionNumber: doc.versionNumber || 1,
            isMaster: false, // Default for shared documents
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          } as CoverLetter);
        }
      } else {
        console.error("Failed to load document:", docResponse.error || "Unknown error");
      }
      if (commentsResponse.ok && commentsResponse.data) {
        setComments(commentsResponse.data.comments || []);
      }
    } catch (error) {
      console.error("Failed to load document:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await api.addDocumentComment({
        documentType: document.documentType,
        documentId: document.documentId,
        teamId,
        commentText: newComment.trim(),
      });

      if (response.ok) {
        setNewComment("");
        await loadDocumentAndComments();
      } else {
        alert(response.error || "Failed to add comment");
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
      alert("Failed to add comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentCommentId: string) => {
    if (!replyText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await api.addDocumentComment({
        documentType: document.documentType,
        documentId: document.documentId,
        teamId,
        commentText: replyText.trim(),
        parentCommentId,
      });

      if (response.ok) {
        setReplyText("");
        setReplyingTo(null);
        await loadDocumentAndComments();
      } else {
        alert(response.error || "Failed to add reply");
      }
    } catch (error) {
      console.error("Failed to add reply:", error);
      alert("Failed to add reply. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon icon="mingcute:loading-line" width={24} className="animate-spin text-blue-500" />
        <span className="ml-2 text-slate-600">Loading document...</span>
      </div>
    );
  }

  // Render comments section
  const renderCommentsSection = () => (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">
        Comments & Feedback ({comments.length})
      </h3>

      {/* Add Comment */}
      <div className="mb-6 pb-6 border-b border-slate-200">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment or feedback..."
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim() || isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Icon icon="mingcute:loading-line" width={18} className="animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Icon icon="mingcute:add-line" width={18} />
                Add Comment
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Icon icon="mingcute:comment-line" width={32} className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm">No comments yet. Be the first to provide feedback!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-l-2 border-blue-200 pl-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {comment.commenterName?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 text-sm">
                      {comment.commenterName || comment.commenterEmail}
                    </span>
                    <span className="text-xs text-slate-500">{formatTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-slate-700 text-sm mb-2">{comment.commentText}</p>
                  {comment.documentSection && (
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 mb-2">
                      Section: {comment.documentSection}
                    </span>
                  )}
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Icon icon="mingcute:reply-line" width={14} />
                    Reply
                  </button>
                  {replyingTo === comment.id && (
                    <div className="mt-3 ml-4">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleReply(comment.id)}
                          disabled={!replyText.trim() || isSubmitting}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                          className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 ml-4 space-y-3 border-l-2 border-slate-200 pl-4">
                      {comment.replies.map((reply: any) => (
                        <div key={reply.id}>
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                              {reply.commenterName?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-slate-900 text-xs">
                                  {reply.commenterName || reply.commenterEmail}
                                </span>
                                <span className="text-xs text-slate-500">{formatTime(reply.createdAt)}</span>
                              </div>
                              <p className="text-slate-700 text-xs">{reply.commentText}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render preview modal based on document type
  // Use portal to render modals at document root level to avoid z-index/layout issues
  const modalContent = (() => {
    if (document.documentType === "resume" && documentData) {
      return (
        <ResumePreviewModal
          isOpen={true}
          onClose={onClose || (() => {})}
          resume={documentData as Resume}
          showComments={true}
          commentsSection={renderCommentsSection()}
        />
      );
    }

  // For cover letters and resumes, we navigate immediately in useEffect
  if (document.documentType === "cover_letter" || document.documentType === "resume") {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon icon="mingcute:loading-line" width={24} className="animate-spin text-blue-500" />
        <span className="ml-2 text-slate-600">
          Opening {document.documentType === "cover_letter" ? "cover letter" : "resume"} editor...
        </span>
      </div>
    );
  }

    return null;
  })();

  // Render modal using portal to document body
  if (modalContent && typeof window !== 'undefined' && window.document) {
    return createPortal(modalContent, window.document.body);
  }

  return null;
}

