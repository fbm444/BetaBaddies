import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { coverLetterService } from "../../services/coverLetterService";
import { CoverLetter } from "../../types";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface CoverLetterAIAssistantProps {
  coverLetter: CoverLetter | null;
  coverLetterId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCoverLetterUpdate?: (updates: Partial<CoverLetter>) => void;
}

const SUGGESTED_PROMPTS = [
  "Generate a personalized opening paragraph",
  "Help me write compelling body paragraphs",
  "Create a strong closing paragraph",
  "Research company information",
  "Highlight my most relevant experiences",
  "Improve the tone of my cover letter",
  "Make my cover letter more concise",
  "Tailor my cover letter for this specific job",
  "Suggest improvements for my cover letter",
  "Generate multiple variations",
];

export function CoverLetterAIAssistant({
  coverLetter,
  coverLetterId,
  isOpen,
  onClose,
  onCoverLetterUpdate,
}: CoverLetterAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !coverLetterId || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // For now, use a simple response - can be enhanced with actual AI service
      const response = await coverLetterService.generateContent(coverLetterId, {
        tone: coverLetter?.toneSettings?.tone || "formal",
        length: coverLetter?.toneSettings?.length || "standard",
      });

      if (response.ok && response.data) {
        const assistantMessage: Message = {
          role: "assistant",
          content: `I've generated content for your cover letter. Here's what I created:\n\n**Opening:**\n${response.data.content.opening || response.data.content.fullText?.substring(0, 200) || "Generated opening paragraph"}\n\n**Body:**\n${response.data.content.body?.join("\n\n") || "Generated body paragraphs"}\n\n**Closing:**\n${response.data.content.closing || "Generated closing paragraph"}\n\nWould you like me to apply these changes to your cover letter?`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Update cover letter if callback provided
        if (onCoverLetterUpdate && response.data.content) {
          onCoverLetterUpdate({
            content: response.data.content,
          });
        }
      } else {
        throw new Error("Failed to generate content");
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `I apologize, but I encountered an error: ${error.message || "Failed to generate content"}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleGenerateContent = async () => {
    if (!coverLetterId || isLoading) return;

    setIsLoading(true);
    try {
      const response = await coverLetterService.generateContent(coverLetterId, {
        tone: coverLetter?.toneSettings?.tone || "formal",
        length: coverLetter?.toneSettings?.length || "standard",
        includeCompanyResearch: true,
        highlightExperiences: true,
      });

      if (response.ok && response.data) {
        const assistantMessage: Message = {
          role: "assistant",
          content: `I've generated a complete cover letter for you:\n\n**Opening:**\n${response.data.content.opening || ""}\n\n**Body Paragraphs:**\n${response.data.content.body?.join("\n\n") || ""}\n\n**Closing:**\n${response.data.content.closing || ""}\n\n${response.data.companyResearch ? `\n**Company Research:**\nI've also researched the company and included relevant information.` : ""}\n\nWould you like me to apply this to your cover letter?`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (onCoverLetterUpdate && response.data.content) {
          onCoverLetterUpdate({
            content: response.data.content,
            companyResearch: response.data.companyResearch,
          });
        }
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${error.message || "Failed to generate content"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - click to close */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-20 z-40"
        onClick={onClose}
      />
      
      {/* AI Assistant Panel */}
      <div className="fixed right-4 bottom-6 w-80 h-[500px] bg-white border border-gray-200 rounded-lg shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 rounded-t-lg bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Icon icon="mingcute:ai-fill" className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">AI Assistant</h3>
            <p className="text-xs text-gray-500">Cover Letter Helper</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Icon icon="mingcute:close-line" className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={handleGenerateContent}
          disabled={isLoading || !coverLetterId}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon icon="mingcute:magic-line" className="w-4 h-4" />
          Generate Cover Letter
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Icon
              icon="mingcute:ai-fill"
              className="w-12 h-12 mx-auto mb-3 text-gray-400"
            />
            <p className="text-sm">Start a conversation or use quick actions</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-2 text-sm ${
                message.role === "user"
                  ? "bg-[#3351FD] text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <Icon
                icon="mingcute:loading-line"
                className="w-5 h-5 animate-spin text-[#3351FD]"
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length === 0 && (
        <div className="p-3 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">
            Suggested Prompts:
          </p>
          <div className="space-y-1.5">
            {SUGGESTED_PROMPTS.slice(0, 3).map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="w-full text-left px-2 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-3 py-1.5 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon icon="mingcute:send-line" className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

