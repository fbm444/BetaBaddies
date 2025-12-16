import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface ChatWindowProps {
  conversationId: string;
  title?: string;
  onClose?: () => void;
  className?: string;
  currentUserId?: string;
  onConversationUpdate?: (conversation: any) => void;
}

export function ChatWindow({ conversationId, title, onClose, className = "", currentUserId, onConversationUpdate }: ChatWindowProps) {
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(currentUserId || null);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (conversationId) {
      console.log(`[ChatWindow] useEffect triggered for conversationId: ${conversationId}`);
      fetchConversation();
      
      // Poll for new messages every 3 seconds (more frequent for debugging)
      pollIntervalRef.current = setInterval(() => {
        if (conversationId) {
          console.log(`[ChatWindow] Polling for new messages...`);
          fetchMessages();
        }
      }, 3000);
    } else {
      console.warn(`[ChatWindow] useEffect called but conversationId is missing`);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [conversationId]);

  const fetchUserAvatars = async (userIds: string[]) => {
    const avatarMap: Record<string, string> = {};
    const uniqueUserIds = [...new Set(userIds)];
    
    // Extract avatars from messages if available
    messages.forEach((msg: any) => {
      if (msg.senderAvatar && msg.senderId) {
        avatarMap[msg.senderId] = msg.senderAvatar;
      }
    });
    
    setUserAvatars(avatarMap);
  };

  const fetchConversation = async () => {
    try {
      setIsLoading(true);
      console.log(`[ChatWindow] Fetching conversation: ${conversationId}`);
      const response = await api.getConversation(conversationId);
      if (response.ok && response.data) {
        const conv = response.data.conversation;
        setConversation(conv);
        const msgs = conv.messages || [];
        console.log(`[ChatWindow] Conversation loaded with ${msgs.length} messages from getConversation`);
        // Sort messages by created_at to ensure correct order (oldest first)
        const sortedMessages = [...msgs].sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        });
        setMessages(sortedMessages);
        
        // Also fetch messages separately to ensure we have all of them
        console.log(`[ChatWindow] Fetching messages separately...`);
        await fetchMessages();
        
        // Get current user ID from profile if not provided
        let currentUserId = currentUser;
        if (!currentUserId) {
          try {
            const userResponse = await api.getUserAuth();
            if (userResponse.ok && userResponse.data?.user?.id) {
              currentUserId = userResponse.data.user.id;
              setCurrentUser(currentUserId);
            }
          } catch (err) {
            console.error("Failed to get current user:", err);
          }
        }
        
        // Extract avatars from messages
        const avatarMap: Record<string, string> = {};
        msgs.forEach((msg: any) => {
          if (msg.senderAvatar && msg.senderId) {
            avatarMap[msg.senderId] = msg.senderAvatar;
          }
        });
        
        // Also get current user's avatar from profile
        if (currentUserId) {
          try {
            const profileResponse = await api.getProfile();
            if (profileResponse.ok && profileResponse.data?.profile?.pfp_link) {
              avatarMap[currentUserId] = profileResponse.data.profile.pfp_link;
            }
          } catch (err) {
            // Silently fail
          }
        }
        
        setUserAvatars(avatarMap);
        
        // Mark as read
        await api.markConversationAsRead(conversationId);
      }
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      if (!conversationId) {
        console.error(`[ChatWindow] fetchMessages called but conversationId is missing!`);
        return;
      }
      console.log(`[ChatWindow] fetchMessages called for conversationId: ${conversationId}`);
      console.log(`[ChatWindow] Current conversation state:`, conversation?.id);
      const response = await api.getMessages(conversationId);
      console.log(`[ChatWindow] getMessages response:`, response);
      console.log(`[ChatWindow] response.ok:`, response.ok);
      console.log(`[ChatWindow] response.data:`, response.data);
      
      if (response && response.ok && response.data) {
        const msgs = response.data.messages || [];
        console.log(`[ChatWindow] Raw messages from API:`, msgs.length, msgs);
        console.log(`[ChatWindow] First message sample:`, msgs[0]);
        
        if (msgs.length === 0) {
          console.warn(`[ChatWindow] No messages returned from API for conversation ${conversationId}`);
          // Don't clear existing messages if we get 0 - might be a temporary issue
          return;
        }
        
        // Sort messages by created_at to ensure correct order (oldest first)
        const sortedMessages = [...msgs].sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        });
        console.log(`[ChatWindow] Fetched ${sortedMessages.length} messages, setting state...`);
        console.log(`[ChatWindow] Message IDs:`, sortedMessages.map((m: any) => m.id));
        console.log(`[ChatWindow] Current state messages count:`, messages.length);
        setMessages(sortedMessages);
        console.log(`[ChatWindow] State updated with ${sortedMessages.length} messages`);
        
        // Update avatars from messages
        const avatarMap = { ...userAvatars };
        sortedMessages.forEach((msg: any) => {
          if (msg.senderAvatar && msg.senderId && !avatarMap[msg.senderId]) {
            avatarMap[msg.senderId] = msg.senderAvatar;
          }
        });
        setUserAvatars(avatarMap);
      } else {
        console.error("[ChatWindow] Failed to fetch messages - invalid response:", response);
        console.error("[ChatWindow] Response structure:", {
          hasResponse: !!response,
          hasOk: response?.ok !== undefined,
          okValue: response?.ok,
          hasData: !!response?.data,
          dataValue: response?.data
        });
      }
    } catch (error: any) {
      console.error("[ChatWindow] Error fetching messages:", error);
      console.error("[ChatWindow] Error details:", {
        message: error?.message,
        status: error?.status,
        stack: error?.stack
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    if (!conversationId) {
      console.error(`[ChatWindow] Cannot send message - conversationId is missing!`);
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    try {
      setIsSending(true);
      console.log(`[ChatWindow] Sending message to conversationId: ${conversationId}`);
      console.log(`[ChatWindow] Current conversation state id:`, conversation?.id);
      const response = await api.sendMessage(conversationId, {
        messageText: messageText,
        messageType: "text",
      });

      if (response.ok && response.data && response.data.message) {
        console.log("[ChatWindow] Message sent successfully:", response.data.message);
        console.log("[ChatWindow] Message ID:", response.data.message.id);
        console.log("[ChatWindow] Message text:", response.data.message.messageText);
        console.log("[ChatWindow] Current messages before refresh:", messages.length);
        
        // Wait a brief moment for database to commit, then refresh
        console.log("[ChatWindow] Waiting 300ms then refreshing messages from server...");
        setTimeout(async () => {
          console.log("[ChatWindow] Refreshing messages after send...");
          await fetchMessages();
        }, 300);
      } else {
        // If send failed, restore the message text
        setNewMessage(messageText);
        console.error("[ChatWindow] Failed to send message: Invalid response", response);
      }
    } catch (error) {
      // Restore message text on error
      setNewMessage(messageText);
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isRenaming && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isRenaming]);

  const handleStartRename = () => {
    const currentTitle = conversation?.title || title || "";
    setNewTitle(currentTitle);
    setIsRenaming(true);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setNewTitle("");
  };

  const handleSaveRename = async () => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      alert("Title cannot be empty");
      return;
    }

    try {
      setIsUpdatingTitle(true);
      const response = await api.updateConversationTitle(conversationId, trimmedTitle);
      if (response.ok && response.data) {
        const updatedConversation = response.data.conversation;
        setConversation(updatedConversation);
        setIsRenaming(false);
        setNewTitle("");
        
        // Notify parent component of the update
        if (onConversationUpdate) {
          onConversationUpdate(updatedConversation);
        }
      } else {
        alert("Failed to update conversation title");
      }
    } catch (error) {
      console.error("Failed to update conversation title:", error);
      alert("Failed to update conversation title");
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      handleCancelRename();
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg flex flex-col h-full ${className}`}>
        <div className="flex items-center justify-center h-full">
          <Icon icon="mingcute:loading-line" width={32} className="animate-spin text-blue-700" />
        </div>
      </div>
    );
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${className || "h-full"}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3 flex-1 min-w-0 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <Icon icon="mingcute:chat-3-line" width={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  disabled={isUpdatingTitle}
                  className="flex-1 px-2 py-1 text-sm font-semibold text-slate-900 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Conversation title"
                />
                <button
                  onClick={handleSaveRename}
                  disabled={isUpdatingTitle || !newTitle.trim()}
                  className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save"
                >
                  <Icon icon="mingcute:check-line" width={18} />
                </button>
                <button
                  onClick={handleCancelRename}
                  disabled={isUpdatingTitle}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
                  title="Cancel"
                >
                  <Icon icon="mingcute:close-line" width={18} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">
                    {conversation?.title || title || "Chat"}
                  </h3>
                  <button
                    onClick={handleStartRename}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition opacity-0 group-hover:opacity-100"
                    title="Rename conversation"
                  >
                    <Icon icon="mingcute:edit-line" width={16} />
                  </button>
                </div>
                {conversation?.participants && (
                  <p className="text-xs text-slate-500 font-medium">
                    {conversation.participants.length} participant{conversation.participants.length !== 1 ? "s" : ""}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isRenaming && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition p-1.5 hover:bg-slate-100 rounded-lg"
              title="Close"
            >
              <Icon icon="mingcute:close-line" width={20} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gradient-to-b from-slate-50/50 to-white">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Icon icon="mingcute:chat-3-line" width={40} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">No messages yet</p>
            <p className="text-xs text-slate-500">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isCurrentUser = currentUser && message.senderId === currentUser;
            const senderName = message.senderName || message.senderEmail || "Unknown";
            const senderInitials = senderName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
            const avatarUrl = message.senderAvatar || userAvatars[message.senderId];
            const showAvatar = !isCurrentUser;
            
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
            const isNewSender = !prevMessage || prevMessage.senderId !== message.senderId;
            const isLastFromSender = !nextMessage || nextMessage.senderId !== message.senderId;
            const timeDiff = prevMessage 
              ? Math.abs(new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) / 1000 / 60
              : Infinity;
            const showTimeSeparator = timeDiff > 5; // Show time if 5+ minutes apart
            
            const currentUserInitials = currentUser ? "Y" : "U";
            
            return (
              <div key={message.id}>
                {showTimeSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <div className="text-xs text-slate-400 font-medium bg-white px-3 py-1 rounded-full border border-slate-200">
                      {new Date(message.createdAt).toLocaleDateString([], { 
                        month: "short", 
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>
                )}
                <div
                  className={`flex gap-2.5 items-end ${isCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  {/* Avatar for other users */}
                  {showAvatar && (
                    <div className="flex-shrink-0">
                      {isNewSender ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold overflow-hidden shadow-sm">
                          {avatarUrl && !avatarUrl.includes('blank-profile-picture') ? (
                            <img 
                              src={avatarUrl} 
                              alt={senderName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{senderInitials}</span>
                          )}
                        </div>
                      ) : (
                        <div className="w-8 h-8" />
                      )}
                    </div>
                  )}
                  
                  {/* Message bubble */}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      isCurrentUser
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md"
                        : "bg-white text-slate-900 border border-slate-200 rounded-bl-md"
                    }`}
                  >
                    {!isCurrentUser && isNewSender && (
                      <div className="text-xs font-semibold mb-1.5 text-slate-700">
                        {senderName}
                      </div>
                    )}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.messageText}
                    </div>
                    <div className={`text-xs mt-1.5 flex items-center gap-1.5 ${isCurrentUser ? "text-blue-50" : "text-slate-500"}`}>
                      <span>{formatMessageTime(message.createdAt)}</span>
                      {message.isEdited && (
                        <span className="opacity-75">• edited</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Avatar for current user */}
                  {isCurrentUser && (
                    <div className="flex-shrink-0">
                      {isNewSender ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold overflow-hidden shadow-sm">
                          {userAvatars[currentUser] && !userAvatars[currentUser]?.includes('blank-profile-picture') ? (
                            <img 
                              src={userAvatars[currentUser]} 
                              alt="You"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{currentUserInitials}</span>
                          )}
                        </div>
                      ) : (
                        <div className="w-8 h-8" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm font-medium text-sm flex items-center justify-center min-w-[44px]"
          >
            {isSending ? (
              <Icon icon="mingcute:loading-line" width={18} className="animate-spin" />
            ) : (
              <Icon icon="mingcute:send-plane-line" width={18} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

