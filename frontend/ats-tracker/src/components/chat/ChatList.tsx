import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface ChatListProps {
  conversationType?: string;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "No messages";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  // For older messages, show date
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChatList({ conversationType, onSelectConversation, selectedConversationId }: ChatListProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
    
    // Poll for new conversations every 10 seconds
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [conversationType]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await api.getUserConversations(conversationType || undefined);
      if (response.ok && response.data) {
        setConversations(response.data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-center py-12">
          <Icon icon="mingcute:loading-line" width={24} className="animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Conversations</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {conversations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <Icon icon="mingcute:chat-3-line" width={32} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">No conversations yet</p>
            <p className="text-xs text-slate-500">Start a new conversation to get started</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full text-left p-4 hover:bg-slate-50/50 transition-all duration-150 ${
                selectedConversationId === conv.id 
                  ? "bg-blue-50/50 border-l-4 border-blue-500 shadow-sm" 
                  : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <Icon icon="mingcute:chat-3-line" width={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-slate-900 text-sm truncate">
                      {conv.title || `${conv.conversationType} Chat`}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="flex-shrink-0 bg-blue-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shadow-sm">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {formatRelativeTime(conv.lastMessageAt)}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

