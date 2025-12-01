import { useState } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface MilestoneCardProps {
  milestone: {
    id: string;
    milestoneTitle: string;
    milestoneDescription?: string;
    achievedAt: string;
    userName: string;
    milestoneData?: {
      reactions?: Array<{
        userId: string;
        userName: string;
        type: string;
        createdAt: string;
      }>;
      comments?: Array<{
        id: string;
        userId: string;
        userName: string;
        text: string;
        createdAt: string;
      }>;
    };
  };
  currentUserId?: string;
  onUpdate?: () => void;
}

const REACTION_TYPES = [
  { type: "celebrate", icon: "mingcute:celebration-line", label: "Celebrate", color: "text-yellow-600" },
  { type: "congrats", icon: "mingcute:hand-clap-line", label: "Congrats", color: "text-green-600" },
  { type: "awesome", icon: "mingcute:star-line", label: "Awesome", color: "text-blue-600" },
  { type: "fire", icon: "mingcute:fire-line", label: "Fire", color: "text-orange-600" },
  { type: "clap", icon: "mingcute:hand-clap-line", label: "Clap", color: "text-purple-600" },
];

export function MilestoneCard({ milestone, currentUserId, onUpdate }: MilestoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const milestoneData = milestone.milestoneData || {};
  const reactions = milestoneData.reactions || [];
  const comments = milestoneData.comments || [];

  // Group reactions by type
  const reactionsByType = reactions.reduce((acc: any, reaction: any) => {
    if (!acc[reaction.type]) {
      acc[reaction.type] = [];
    }
    acc[reaction.type].push(reaction);
    return acc;
  }, {});

  const handleReaction = async (reactionType: string) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const response = await api.addMilestoneReaction(milestone.id, reactionType);
      if (response.ok && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to add reaction:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await api.addMilestoneReaction(milestone.id, "comment", commentText);
      if (response.ok) {
        setCommentText("");
        setShowCommentInput(false);
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUserReacted = (reactionType: string) => {
    return reactions.some((r: any) => r.userId === currentUserId && r.type === reactionType);
  };

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Main Milestone Info */}
      <div className="flex items-start gap-3">
        <Icon icon="mingcute:trophy-line" width={24} className="text-yellow-600 flex-shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900">{milestone.milestoneTitle}</div>
          {milestone.milestoneDescription && (
            <div className="text-sm text-slate-600 mt-1">{milestone.milestoneDescription}</div>
          )}
          <div className="text-sm text-slate-500 mt-1">
            {milestone.userName} • {new Date(milestone.achievedAt).toLocaleDateString()}
          </div>

          {/* Reactions Summary */}
          {Object.keys(reactionsByType).length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {Object.entries(reactionsByType).map(([type, reactionList]: [string, any]) => {
                const reactionConfig = REACTION_TYPES.find((r) => r.type === type);
                return (
                  <button
                    key={type}
                    onClick={() => handleReaction(type)}
                    disabled={isSubmitting}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      hasUserReacted(type)
                        ? "bg-yellow-200 text-yellow-800"
                        : "bg-white/60 text-slate-600 hover:bg-yellow-100"
                    }`}
                  >
                    {reactionConfig && (
                      <Icon icon={reactionConfig.icon} width={14} className={reactionConfig.color} />
                    )}
                    <span>{reactionList.length}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Comments Count */}
          {comments.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-700 mt-2 flex items-center gap-1"
            >
              <Icon icon="mingcute:message-line" width={16} />
              <span>{comments.length} {comments.length === 1 ? "comment" : "comments"}</span>
              <Icon
                icon={isExpanded ? "mingcute:up-line" : "mingcute:down-line"}
                width={16}
                className="ml-1"
              />
            </button>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-3">
            {/* Reaction Buttons */}
            <div className="flex items-center gap-1">
              {REACTION_TYPES.slice(0, 3).map((reaction) => (
                <button
                  key={reaction.type}
                  onClick={() => handleReaction(reaction.type)}
                  disabled={isSubmitting}
                  className={`p-1.5 rounded-full transition-colors ${
                    hasUserReacted(reaction.type)
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-white/60 text-slate-600 hover:bg-yellow-100"
                  }`}
                  title={reaction.label}
                >
                  <Icon icon={reaction.icon} width={18} className={reaction.color} />
                </button>
              ))}
            </div>

            {/* Comment Button */}
            <button
              onClick={() => {
                setShowCommentInput(!showCommentInput);
                if (!showCommentInput) {
                  setIsExpanded(true);
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 bg-white/60 rounded-full hover:bg-yellow-100 transition-colors"
            >
              <Icon icon="mingcute:message-line" width={16} />
              <span>Comment</span>
            </button>
          </div>

          {/* Comment Input */}
          {showCommentInput && (
            <div className="mt-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment to celebrate..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                rows={2}
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleCommentSubmit}
                  disabled={!commentText.trim() || isSubmitting}
                  className="px-4 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "Posting..." : "Post Comment"}
                </button>
                <button
                  onClick={() => {
                    setShowCommentInput(false);
                    setCommentText("");
                  }}
                  className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Comments Section */}
      {isExpanded && comments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-yellow-200">
          <div className="space-y-3">
            {comments.map((comment: any) => (
              <div key={comment.id} className="bg-white/60 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center flex-shrink-0">
                    <Icon icon="mingcute:user-line" width={16} className="text-yellow-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{comment.userName}</div>
                    <div className="text-sm text-slate-700 mt-1">{comment.text}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(comment.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

