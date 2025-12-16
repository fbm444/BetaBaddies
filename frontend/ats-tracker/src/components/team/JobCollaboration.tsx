import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface JobCollaborationProps {
  teamId: string;
  jobId: string;
  jobTitle?: string;
  jobCompany?: string;
}

export function JobCollaboration({
  teamId,
  jobId,
  jobTitle,
  jobCompany,
}: JobCollaborationProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShared, setIsShared] = useState(false);

  useEffect(() => {
    fetchComments();
    checkIfShared();
  }, [teamId, jobId]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const response = await api.getJobComments(jobId, teamId);
      if (response.ok && response.data) {
        setComments(response.data.comments || []);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfShared = async () => {
    try {
      const response = await api.getSharedJobs(teamId);
      if (response.ok && response.data) {
        const shared = response.data.jobs?.some((job: any) => job.id === jobId);
        setIsShared(shared || false);
      }
    } catch (error) {
      console.error("Failed to check if shared:", error);
    }
  };

  const handleShareJob = async () => {
    try {
      const response = await api.shareJobWithTeam(jobId, teamId);
      if (response.ok) {
        setIsShared(true);
        await fetchComments();
      }
    } catch (error) {
      console.error("Failed to share job:", error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await api.addJobComment(jobId, teamId, {
        commentText: newComment,
      });
      if (response.ok) {
        setNewComment("");
        await fetchComments();
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentCommentId: string, replyText: string) => {
    try {
      const response = await api.addJobComment(jobId, teamId, {
        commentText: replyText,
        parentCommentId,
      });
      if (response.ok) {
        await fetchComments();
      }
    } catch (error) {
      console.error("Failed to add reply:", error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Icon icon="mingcute:message-line" width={20} className="text-blue-600" />
            Team Collaboration & Comments
          </h3>
          {jobTitle && jobCompany && (
            <p className="text-sm text-slate-600 mt-1">
              Discuss and share recommendations for this opportunity
            </p>
          )}
        </div>
        {!isShared && (
          <button
            onClick={handleShareJob}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-sm font-medium"
          >
            <Icon icon="lucide:share-2" width={18} />
            Share with Team
          </button>
        )}
        {isShared && (
          <span className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <Icon icon="mingcute:check-circle-line" width={16} />
            Shared with Team
          </span>
        )}
      </div>

      {isShared ? (
        <>
          {/* Comment Form */}
          <form onSubmit={handleAddComment} className="mb-6 bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex gap-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment, recommendation, or share your thoughts about this opportunity..."
                className="flex-1 border border-slate-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                rows={3}
              />
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm font-medium flex items-center gap-2 self-start"
              >
                {isSubmitting ? (
                  <>
                    <Icon icon="mingcute:loading-line" width={18} className="animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Icon icon="mingcute:send-plane-line" width={18} />
                    Post
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Comments List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Icon icon="mingcute:loading-line" width={24} className="animate-spin text-blue-700" />
              <span className="ml-3 text-slate-600">Loading comments...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <Icon icon="mingcute:message-line" width={48} className="mx-auto mb-3 text-slate-400" />
              <p className="text-slate-600 font-medium mb-1">No comments yet</p>
              <p className="text-sm text-slate-500">Be the first to share your thoughts or recommendations!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Icon icon="mingcute:message-line" width={18} className="text-slate-600" />
                <span className="text-sm font-semibold text-slate-700">
                  {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                </span>
              </div>
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  teamId={teamId}
                  jobId={jobId}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <Icon icon="lucide:share-2" width={48} className="mx-auto mb-2 opacity-50" />
          <p>Share this job with your team to start collaborating</p>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  teamId,
  jobId,
}: {
  comment: any;
  onReply: (parentId: string, text: string) => void;
  teamId: string;
  jobId: string;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim()) {
      onReply(comment.id, replyText);
      setReplyText("");
      setShowReplyForm(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
          <Icon icon="mingcute:user-line" width={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-slate-900">{comment.commenterEmail}</span>
            <span className="text-xs text-slate-500">
              {new Date(comment.createdAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </div>
          <p className="text-slate-700 mb-3 leading-relaxed">{comment.commentText}</p>
          {!showReplyForm && (
            <button
              onClick={() => setShowReplyForm(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1.5 font-medium transition"
            >
              <Icon icon="mingcute:reply-line" width={16} />
              Reply
            </button>
          )}
          {showReplyForm && (
            <form onSubmit={handleSubmitReply} className="mt-3 bg-slate-50 rounded-lg p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 transition font-medium"
                >
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyText("");
                  }}
                  className="text-slate-600 px-4 py-2 text-sm hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 ml-12 space-y-3 border-l-2 border-blue-200 pl-4">
          {comment.replies.map((reply: any) => (
            <div key={reply.id} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon icon="mingcute:user-line" width={14} className="text-slate-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-900">{reply.commenterEmail}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(reply.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{reply.commentText}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

