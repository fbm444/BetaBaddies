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
    userProfilePicture?: string;
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
  { type: "celebrate", icon: "mingcute:trophy-line", emoji: "🎉", label: "Celebrate", color: "text-yellow-600" },
  { type: "congrats", icon: "mingcute:like-line", emoji: "👏", label: "Congrats", color: "text-green-600" },
  { type: "awesome", icon: "mingcute:star-line", emoji: "⭐", label: "Awesome", color: "text-blue-600" },
  { type: "fire", icon: "mingcute:heart-line", emoji: "🔥", label: "Fire", color: "text-orange-600" },
  { type: "clap", icon: "mingcute:check-circle-line", emoji: "👏", label: "Clap", color: "text-purple-600" },
];

export function MilestoneCard({ milestone, currentUserId, onUpdate }: MilestoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);

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
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200">
      {/* Main Milestone Info */}
      <div className="flex items-start gap-4">
        {/* Trophy Icon Badge */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md">
          <Icon icon="mingcute:trophy-fill" width={24} className="text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Title and User Info */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-base leading-tight">{milestone.milestoneTitle}</h4>
              {milestone.milestoneDescription && (
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{milestone.milestoneDescription}</p>
              )}
            </div>
          </div>

          {/* User and Date */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <div className="flex items-center gap-1.5">
              {milestone.userProfilePicture && 
               milestone.userProfilePicture.trim() !== '' && 
               !milestone.userProfilePicture.includes('blank-profile-picture') &&
               milestone.userProfilePicture !== null &&
               !imageError ? (
                <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100">
                  <img 
                    src={milestone.userProfilePicture} 
                    alt={milestone.userName || "User"}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <Icon icon="mingcute:user-line" width={12} className="text-slate-500" />
                </div>
              )}
              <span className="font-medium">{milestone.userName}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Icon icon="mingcute:calendar-line" width={12} />
              <span>{new Date(milestone.achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Reactions and Comments Summary */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            {/* Reactions Summary */}
            {Object.keys(reactionsByType).length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {Object.entries(reactionsByType).map(([type, reactionList]: [string, any]) => {
                  const reactionConfig = REACTION_TYPES.find((r) => r.type === type);
                  return (
                    <button
                      key={type}
                      onClick={() => handleReaction(type)}
                      disabled={isSubmitting}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        hasUserReacted(type)
                          ? "bg-yellow-100 text-yellow-700 shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-yellow-50 hover:text-yellow-700"
                      }`}
                    >
                      {reactionConfig && (
                        <span className="text-base">{reactionConfig.emoji}</span>
                      )}
                      <span className="font-semibold">{reactionList.length}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Comments Count */}
            {comments.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              >
                <Icon icon="mingcute:message-line" width={14} />
                <span className="font-medium">{comments.length}</span>
                <Icon
                  icon={isExpanded ? "mingcute:up-line" : "mingcute:down-line"}
                  width={12}
                />
              </button>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 ml-auto">
              {/* Quick Reaction Buttons */}
              {REACTION_TYPES.slice(0, 3).map((reaction) => (
                <button
                  key={reaction.type}
                  onClick={() => handleReaction(reaction.type)}
                  disabled={isSubmitting}
                  className={`p-2 rounded-lg transition-all ${
                    hasUserReacted(reaction.type)
                      ? "bg-yellow-100 text-yellow-700 shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-yellow-50 hover:text-yellow-600"
                  }`}
                  title={reaction.label}
                >
                  <span className="text-base">{reaction.emoji}</span>
                </button>
              ))}

              {/* Comment Button */}
              <button
                onClick={() => {
                  setShowCommentInput(!showCommentInput);
                  if (!showCommentInput) {
                    setIsExpanded(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Icon icon="mingcute:message-line" width={14} />
                <span>Comment</span>
              </button>
            </div>
          </div>

          {/* Comment Input */}
          {showCommentInput && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment to celebrate this achievement..."
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 resize-none bg-slate-50"
                rows={3}
              />
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  onClick={handleCommentSubmit}
                  disabled={!commentText.trim() || isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Icon icon="mingcute:loading-line" width={14} className="animate-spin" />
                      Posting...
                    </span>
                  ) : (
                    "Post Comment"
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCommentInput(false);
                    setCommentText("");
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
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
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="space-y-3">
            {comments.map((comment: any) => (
              <div key={comment.id} className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Icon icon="mingcute:user-fill" width={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-900">{comment.userName}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{comment.text}</p>
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

