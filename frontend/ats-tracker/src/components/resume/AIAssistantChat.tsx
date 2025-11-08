import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { resumeService } from "../../services/resumeService";
import { Resume } from "../../types";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAssistantChatProps {
  resume: Resume | null;
  resumeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onResumeUpdate?: (updates: Partial<Resume>) => void;
  onPreviewUpdate?: (previewResume: Resume | null) => void;
}

const SUGGESTED_PROMPTS = [
  "Write a professional summary for my resume",
  "Help me improve my work experience descriptions",
  "Suggest skills I should add based on my experience",
  "How can I make my resume more ATS-friendly?",
  "Tailor my resume for a software engineering role",
  "What are common resume mistakes I should avoid?",
  "Help me optimize my bullet points",
  "Suggest improvements for my resume structure",
  "Get AI critique of my resume",
  "Optimize my skills section for a specific job",
  "Tailor my experience for a job application",
];

interface ParsedSuggestion {
  type: "summary" | "experience" | "skill" | "education" | "project" | "bullet" | "section";
  action: "update" | "add" | "improve";
  content: string;
  targetId?: string;
  targetSection?: string;
  originalText?: string;
}

export function AIAssistantChat({
  resume,
  resumeId,
  isOpen,
  onClose,
  onResumeUpdate,
  onPreviewUpdate,
}: AIAssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const lastUserMessageCountRef = useRef(0);
  const [parsedSuggestions, setParsedSuggestions] = useState<
    Map<number, ParsedSuggestion[]>
  >(new Map());
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<
    Map<number, ParsedSuggestion[]>
  >(new Map());

  // Parse AI response to extract actionable suggestions
  const parseSuggestions = (
    content: string,
    _messageIndex: number
  ): ParsedSuggestion[] => {
    const suggestions: ParsedSuggestion[] = [];
    const lines = content.split("\n");

    // Look for code blocks with structured suggestions
    // Try multiple patterns: ```json, ```, or just JSON object
    console.log("🔍 Parsing content for suggestions, length:", content.length);

    // First, try to find JSON code blocks (with or without json language tag)
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
    let codeMatch;
    const codeBlocks: string[] = [];

    // Find all code blocks
    while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push(codeMatch[1].trim());
    }

    console.log("📦 Found", codeBlocks.length, "code blocks");

    // Try to parse each code block
    for (let i = 0; i < codeBlocks.length; i++) {
      const jsonText = codeBlocks[i];
      try {
        console.log(
          `📦 Code block ${i + 1}, JSON text:`,
          jsonText.substring(0, 300)
        );
        const parsed = JSON.parse(jsonText);
        console.log("✅ Parsed JSON:", parsed);

        // Check if it's the structured format with "suggestions" array
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          console.log(
            "✅ Found suggestions array with",
            parsed.suggestions.length,
            "items"
          );
          return parsed.suggestions.map((s: any) => ({
            type: s.type || "section",
            action: s.action || "update",
            content: s.content || s.text || "",
            targetId: s.targetId,
            targetSection: s.targetSection,
            originalText: s.originalText,
          }));
        }
        // Also support direct array format
        if (Array.isArray(parsed)) {
          console.log("✅ Found direct array with", parsed.length, "items");
          return parsed.map((s: any) => ({
            type: s.type || "section",
            action: s.action || "update",
            content: s.content || s.text || "",
            targetId: s.targetId,
            targetSection: s.targetSection,
            originalText: s.originalText,
          }));
        }
        console.log(
          "⚠️ JSON parsed but no suggestions array found, keys:",
          Object.keys(parsed)
        );
      } catch (e: any) {
        console.log(
          `⚠️ Failed to parse code block ${i + 1} as JSON:`,
          e.message
        );
        // Continue to next code block
      }
    }

    // Also try to find JSON object without code blocks
    const jsonObjectRegex = /\{[\s\S]*?"suggestions"[\s\S]*?\}/;
    const jsonObjectMatch = content.match(jsonObjectRegex);
    if (jsonObjectMatch) {
      try {
        console.log(
          "📦 Found JSON object without code block:",
          jsonObjectMatch[0].substring(0, 300)
        );
        const parsed = JSON.parse(jsonObjectMatch[0]);
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          console.log("✅ Found suggestions array in JSON object");
          return parsed.suggestions.map((s: any) => ({
            type: s.type || "section",
            action: s.action || "update",
            content: s.content || s.text || "",
            targetId: s.targetId,
            targetSection: s.targetSection,
            originalText: s.originalText,
          }));
        }
      } catch (e: any) {
        console.error("❌ Failed to parse JSON object:", e.message);
      }
    }

    console.log("⚠️ No JSON suggestions found in response");

    // Parse text-based suggestions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect summary suggestions
      if (
        line.toLowerCase().includes("summary") &&
        (line.toLowerCase().includes("suggest") ||
          line.toLowerCase().includes("improve"))
      ) {
        // Look for the suggested text in following lines
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (
            nextLine.length > 20 &&
            !nextLine.startsWith("•") &&
            !nextLine.startsWith("-")
          ) {
            suggestions.push({
              type: "summary",
              action: "update",
              content: nextLine,
            });
            break;
          }
        }
      }

      // Detect skill suggestions
      if (
        line.toLowerCase().includes("skill") &&
        (line.toLowerCase().includes("add") ||
          line.toLowerCase().includes("suggest"))
      ) {
        const skillMatch = line.match(/["']([^"']+)["']/);
        if (skillMatch) {
          suggestions.push({
            type: "skill",
            action: "add",
            content: skillMatch[1],
          });
        }
      }
    }

    return suggestions;
  };

  // Preview a suggestion (show changes without saving)
  const previewSuggestion = (suggestion: ParsedSuggestion) => {
    if (!resume) return;

    // Check if this suggestion has already been applied
    const messageIndex = Array.from(parsedSuggestions.entries()).find(
      ([_, suggestions]) => suggestions.includes(suggestion)
    )?.[0];
    
    if (messageIndex !== undefined) {
      const alreadyApplied = appliedSuggestions.get(messageIndex) || [];
      const isAlreadyApplied = alreadyApplied.some((applied) => {
        // Compare suggestions by type, action, and content
        return (
          applied.type === suggestion.type &&
          applied.action === suggestion.action &&
          applied.content === suggestion.content &&
          applied.targetId === suggestion.targetId
        );
      });
      
      if (isAlreadyApplied) {
        console.log("⚠️ Suggestion already applied, skipping duplicate");
        return; // Don't apply the same suggestion twice
      }
    }

    // Start from current preview resume if it exists, otherwise start from actual resume
    const baseResume = previewResume || resume;

    // Map suggestion types to section IDs
    const getSectionIdFromType = (type: string): string | null => {
      const typeToSectionMap: Record<string, string> = {
        summary: "summary",
        skill: "skills",
        experience: "experience",
        education: "education",
        project: "projects",
        certification: "certifications",
      };
      return typeToSectionMap[type] || null;
    };

    // Check if section is enabled, and enable it if not
    const sectionId = getSectionIdFromType(suggestion.type);
    const sectionConfig = baseResume.sectionConfig || {};
    let updatedSectionConfig = { ...sectionConfig };
    
    if (sectionId) {
      const isEnabled = sectionConfig[sectionId]?.enabled ?? true;
      if (!isEnabled) {
        // Enable the section if it's disabled
        updatedSectionConfig = {
          ...sectionConfig,
          [sectionId]: {
            ...sectionConfig[sectionId],
            enabled: true,
            order: sectionConfig[sectionId]?.order ?? 0,
          },
        };
        console.log(`✅ Auto-enabled section: ${sectionId}`);
      }
    }

    // Create preview updates
    const updates: Partial<Resume> = {
      content: { ...baseResume.content },
      sectionConfig: updatedSectionConfig,
    };

    switch (suggestion.type) {
      case "summary":
        if (suggestion.action === "update") {
          updates.content = {
            ...baseResume.content,
            summary: suggestion.content,
          };
        }
        break;

      case "skill":
        if (suggestion.action === "add") {
          // Check if skill already exists to avoid duplicates
          const existingSkills = baseResume.content.skills || [];
          const skillExists = existingSkills.some(
            (s: any) =>
              s.name?.toLowerCase() === suggestion.content.toLowerCase()
          );

          if (!skillExists) {
            const newSkill = {
              id: `skill_${Date.now()}`,
              name: suggestion.content,
              category: "Technical",
              proficiency: "",
            };
            updates.content = {
              ...baseResume.content,
              skills: [...existingSkills, newSkill],
            };
          }
        }
        break;

      case "experience":
        if (suggestion.action === "update") {
          const experiences = [...(baseResume.content.experience || [])];
          let expIndex = -1;
          
          // First try to match by targetId if provided
          if (suggestion.targetId) {
            expIndex = experiences.findIndex(
              (e: any) => e.id === suggestion.targetId
            );
          }
          
          // If no targetId or not found, try to match by company name or job title
          if (expIndex === -1 && suggestion.targetSection) {
            // Try to extract company or title from targetSection
            const targetLower = suggestion.targetSection.toLowerCase();
            expIndex = experiences.findIndex((e: any) => {
              const companyMatch = e.company?.toLowerCase().includes(targetLower);
              const titleMatch = e.title?.toLowerCase().includes(targetLower);
              return companyMatch || titleMatch;
            });
          }
          
          // If still not found and there's only one experience, use it
          if (expIndex === -1 && experiences.length === 1) {
            expIndex = 0;
          }
          
          // If still not found, try to match by the most recent experience
          if (expIndex === -1 && experiences.length > 0) {
            expIndex = 0; // Use first (most recent) experience
          }
          
          if (expIndex >= 0 && suggestion.content) {
            experiences[expIndex] = {
              ...experiences[expIndex],
              description: suggestion.content
                .split("\n")
                .filter((l: string) => l.trim()),
            };
            updates.content = {
              ...baseResume.content,
              experience: experiences,
            };
          }
        }
        break;

      case "education":
        if (suggestion.action === "update") {
          const educations = [...(baseResume.content.education || [])];
          let eduIndex = -1;
          
          // First try to match by targetId if provided
          if (suggestion.targetId) {
            eduIndex = educations.findIndex(
              (e: any) => e.id === suggestion.targetId
            );
          }
          
          // If no targetId or not found, try to match by school name or degree
          if (eduIndex === -1 && suggestion.targetSection) {
            const targetLower = suggestion.targetSection.toLowerCase();
            eduIndex = educations.findIndex((e: any) => {
              const schoolMatch = e.school?.toLowerCase().includes(targetLower);
              const degreeMatch = e.degree?.toLowerCase().includes(targetLower);
              return schoolMatch || degreeMatch;
            });
          }
          
          // If still not found and there's only one education, use it
          if (eduIndex === -1 && educations.length === 1) {
            eduIndex = 0;
          }
          
          // If still not found, use the first education
          if (eduIndex === -1 && educations.length > 0) {
            eduIndex = 0;
          }
          
          if (eduIndex >= 0 && suggestion.content) {
            // Parse the content - it might be a description or field update
            // For now, we'll update the field if it's a short string, otherwise description
            const contentLines = suggestion.content.split("\n").filter((l: string) => l.trim());
            if (contentLines.length === 1 && contentLines[0].length < 100) {
              // Likely a field update
              educations[eduIndex] = {
                ...educations[eduIndex],
                field: contentLines[0],
              };
            } else {
              // Likely a description or multiple fields
              educations[eduIndex] = {
                ...educations[eduIndex],
                description: contentLines.join("\n"),
              };
            }
            updates.content = {
              ...baseResume.content,
              education: educations,
            };
          }
        } else if (suggestion.action === "add") {
          // Add new education entry
          const existingEducations = baseResume.content.education || [];
          const newEducation = {
            id: `edu_${Date.now()}`,
            school: suggestion.content.split(" - ")[0] || suggestion.content,
            degree: suggestion.content.split(" - ")[1] || "",
            field: "",
            gpa: undefined,
            startDate: undefined,
            endDate: undefined,
          };
          updates.content = {
            ...baseResume.content,
            education: [...existingEducations, newEducation],
          };
        }
        break;

      case "project":
        if (suggestion.action === "update") {
          const projects = [...(baseResume.content.projects || [])];
          let projIndex = -1;
          
          // First try to match by targetId if provided
          if (suggestion.targetId) {
            projIndex = projects.findIndex(
              (p: any) => p.id === suggestion.targetId
            );
          }
          
          // If no targetId or not found, try to match by project name
          if (projIndex === -1 && suggestion.targetSection) {
            const targetLower = suggestion.targetSection.toLowerCase();
            projIndex = projects.findIndex((p: any) => {
              return p.name?.toLowerCase().includes(targetLower);
            });
          }
          
          // If still not found and there's only one project, use it
          if (projIndex === -1 && projects.length === 1) {
            projIndex = 0;
          }
          
          // If still not found, use the first project
          if (projIndex === -1 && projects.length > 0) {
            projIndex = 0;
          }
          
          if (projIndex >= 0 && suggestion.content) {
            // Parse the content - it might be a description update
            const contentLines = suggestion.content.split("\n").filter((l: string) => l.trim());
            projects[projIndex] = {
              ...projects[projIndex],
              description: contentLines.join("\n"),
            };
            updates.content = {
              ...baseResume.content,
              projects: projects,
            };
          }
        } else if (suggestion.action === "add") {
          // Add new project entry
          const existingProjects = baseResume.content.projects || [];
          
          // Parse the content to extract project information
          const parseProjectContent = (content: string) => {
            const lines = content.split("\n").filter((l) => l.trim());
            let name = "";
            let description = "";
            let technologies: string[] = [];
            let link = "";
            
            // Try to extract name/title from various patterns
            const namePatterns = [
              /^(?:name|title|project)[:\s]+(.+)$/i,  // "Name: Project Name" or "Title: Project Name"
              /^(.+?)[:\s]+(?:description|desc)/i,   // "Project Name: Description"
              /^(.+?)\s*-\s*(.+)$/,                    // "Project Name - Description"
              /^(.+?)\s*:\s*(.+)$/,                   // "Project Name: Description"
            ];
            
            // First, try to find explicit name/title patterns
            let foundName = false;
            for (const pattern of namePatterns) {
              const match = content.match(pattern);
              if (match && match[1]) {
                name = match[1].trim();
                foundName = true;
                // If there's a description part, use it
                if (match[2]) {
                  description = match[2].trim();
                }
                break;
              }
            }
            
            // If no explicit pattern found, try to extract from first line
            if (!foundName && lines.length > 0) {
              const firstLine = lines[0].trim();
              
              // Check for patterns like "Project Name: Description" or "Project Name - Description"
              if (firstLine.includes(":")) {
                const parts = firstLine.split(":");
                const potentialName = parts[0].trim();
                // If the part before colon is short and looks like a title, use it
                if (potentialName.length < 60 && !potentialName.toLowerCase().includes("description")) {
                  name = potentialName;
                  description = parts.slice(1).join(":").trim();
                } else {
                  // Otherwise treat entire line as description
                  description = firstLine;
                }
              } else if (firstLine.includes(" - ")) {
                const parts = firstLine.split(" - ");
                const potentialName = parts[0].trim();
                // If the part before dash is short, use it as name
                if (potentialName.length < 60) {
                  name = potentialName;
                  description = parts.slice(1).join(" - ").trim();
                } else {
                  description = firstLine;
                }
              } else {
                // If first line is short (likely a title), treat it as name
                if (firstLine.length < 60 && firstLine.length > 0) {
                  name = firstLine;
                  description = lines.slice(1).join("\n").trim();
                } else {
                  // Otherwise, treat it as description
                  description = firstLine + (lines.length > 1 ? "\n" + lines.slice(1).join("\n") : "");
                }
              }
            }
            
            // Extract technologies from content (look for common patterns)
            const techPatterns = [
              /technologies?[:\s]+([^.\n]+)/i,
              /tech stack[:\s]+([^.\n]+)/i,
              /built with[:\s]+([^.\n]+)/i,
              /using[:\s]+([^.\n]+)/i,
            ];
            
            for (const pattern of techPatterns) {
              const match = content.match(pattern);
              if (match && match[1]) {
                technologies = match[1]
                  .split(/[,;]/)
                  .map((t) => t.trim())
                  .filter((t) => t.length > 0);
                break;
              }
            }
            
            // Extract link from content (look for URLs)
            const urlPattern = /(https?:\/\/[^\s]+)/i;
            const urlMatch = content.match(urlPattern);
            if (urlMatch) {
              link = urlMatch[1];
            }
            
            // If no name was extracted, try to extract from description
            if (!name || name.length === 0) {
              // Look for a short first sentence or phrase that could be a title
              const descLines = description.split("\n").filter((l) => l.trim());
              if (descLines.length > 0) {
                const firstDescLine = descLines[0].trim();
                // If first line is short and ends with punctuation, it might be a title
                if (firstDescLine.length < 60 && /[.!?]$/.test(firstDescLine)) {
                  name = firstDescLine.replace(/[.!?]$/, "").trim();
                  description = descLines.slice(1).join("\n").trim() || firstDescLine;
                } else if (firstDescLine.length < 60) {
                  // If it's short without punctuation, treat as name
                  name = firstDescLine;
                  description = descLines.slice(1).join("\n").trim() || firstDescLine;
                } else {
                  // Extract first few words as potential name
                  const words = firstDescLine.split(/\s+/);
                  if (words.length <= 5) {
                    name = words.join(" ");
                    description = description;
                  } else {
                    name = words.slice(0, 3).join(" ");
                    description = description;
                  }
                }
              } else {
                // Last resort: use default name
                name = "New Project";
              }
            }
            
            // If no description, use the content (excluding the name if it was extracted)
            if (!description || description.length === 0) {
              // Remove the name from content if it appears at the start
              let descContent = content;
              if (name && name !== "New Project") {
                const nameRegex = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s:,-]*`, "i");
                descContent = descContent.replace(nameRegex, "").trim();
              }
              description = descContent || content;
            }
            
            return { name, description, technologies, link };
          };
          
          const parsed = parseProjectContent(suggestion.content);
          
          const newProject = {
            id: `proj_${Date.now()}`,
            name: parsed.name,
            description: parsed.description,
            technologies: parsed.technologies,
            link: parsed.link || undefined,
            startDate: undefined,
            endDate: undefined,
          };
          updates.content = {
            ...baseResume.content,
            projects: [...existingProjects, newProject],
          };
        }
        break;
    }

    // Update preview resume (not the actual resume)
    // Deep merge to ensure all properties are preserved
    const newPreviewResume: Resume = {
      ...baseResume,
      ...updates,
      sectionConfig: updates.sectionConfig ?? baseResume.sectionConfig,
      content: {
        ...baseResume.content,
        personalInfo: baseResume.content.personalInfo,
        summary: updates.content.summary ?? baseResume.content.summary,
        experience: updates.content.experience ?? baseResume.content.experience,
        education: updates.content.education ?? baseResume.content.education,
        skills: updates.content.skills ?? baseResume.content.skills,
        projects: updates.content.projects ?? baseResume.content.projects,
        certifications: baseResume.content.certifications,
        ...updates.content,
      },
    };

    setPreviewResume(newPreviewResume);

    // Notify parent component to show preview immediately
    console.log("👁️ Preview suggestion applied:", {
      type: suggestion.type,
      action: suggestion.action,
      hasPreview: !!newPreviewResume,
      previewSummary: newPreviewResume.content.summary?.substring(0, 50),
      previewSkillsCount: newPreviewResume.content.skills?.length,
    });

    if (onPreviewUpdate) {
      onPreviewUpdate(newPreviewResume);
    }

    // Track applied suggestions
    setAppliedSuggestions((prev) => {
      const newMap = new Map(prev);
      const messageIndex = Array.from(parsedSuggestions.entries()).find(
        ([_, suggestions]) => suggestions.includes(suggestion)
      )?.[0];
      if (messageIndex !== undefined) {
        const existing = newMap.get(messageIndex) || [];
        if (!existing.find((s) => s === suggestion)) {
          newMap.set(messageIndex, [...existing, suggestion]);
        }
      }
      return newMap;
    });
  };

  // Apply previewed changes to actual resume
  const applyPreviewedChanges = () => {
    if (!previewResume || !onResumeUpdate) return;

    const updates: Partial<Resume> = {
      content: previewResume.content,
      sectionConfig: previewResume.sectionConfig,
    };

    onResumeUpdate(updates);
    setPreviewResume(null);
    setAppliedSuggestions(new Map());

    // Clear preview in parent
    if (onPreviewUpdate) {
      onPreviewUpdate(null);
    }
  };

  // Revert previewed changes
  const revertPreview = () => {
    setPreviewResume(null);
    setAppliedSuggestions(new Map());
    // Notify parent component to clear preview
    if (onPreviewUpdate) {
      onPreviewUpdate(null);
    }
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Track previous message count to detect new messages
  const prevMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);

  // Scroll to bottom when new messages arrive (only if user hasn't scrolled up)
  useEffect(() => {
    // Only scroll if message count increased (new message added) and user hasn't scrolled up
    if (
      messages.length > prevMessageCountRef.current &&
      messages.length > 0 &&
      shouldAutoScrollRef.current
    ) {
      // Use a small delay to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Track scroll position to detect if user scrolled up

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // If user is near bottom (within 100px), enable auto-scroll
      shouldAutoScrollRef.current =
        scrollHeight - scrollTop - clientHeight < 100;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Generate context-aware suggested prompts
  const generateSuggestedPrompts = useCallback(async () => {
    if (!resumeId || resumeId === "new" || isGeneratingPrompts) return;

    try {
      setIsGeneratingPrompts(true);

      // Build context from recent messages (last 3-4 messages)
      const recentMessages = messages.slice(-4);
      const context =
        recentMessages.length > 0
          ? `Recent conversation:\n${recentMessages
              .map((m) => `${m.role}: ${m.content.substring(0, 200)}`)
              .join("\n")}`
          : "User is starting a new conversation about their resume.";

      const promptRequest = `Based on the following conversation context, generate 4 short, actionable prompts (each 5-8 words max) that would be helpful for the user to continue the conversation. The prompts should be specific, relevant, and actionable. Return ONLY a JSON array of strings, no other text.

Context: ${context}

Example format: ["Write a professional summary", "Improve my work experience", "Suggest skills to add", "Optimize for ATS"]

Generate 4 relevant prompts:`;

      const response = await resumeService.chat(resumeId, [
        {
          role: "user",
          content: promptRequest,
        },
      ]);

      if (response.ok && response.data) {
        try {
          // Try to parse JSON from the response
          const content = response.data.message.trim();
          // Remove markdown code blocks if present
          const cleaned = content
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          const parsed = JSON.parse(cleaned);

          if (Array.isArray(parsed) && parsed.length > 0) {
            setSuggestedPrompts(parsed.slice(0, 4));
          } else {
            // Fallback to default prompts
            setSuggestedPrompts(SUGGESTED_PROMPTS.slice(0, 4));
          }
        } catch (parseError) {
          // If parsing fails, try to extract prompts from text
          const lines = response.data.message
            .split("\n")
            .filter((line: string) => line.trim().length > 0);
          const extracted = lines
            .map((line: string) =>
              line
                .replace(/^[-•*]\s*/, "")
                .replace(/^["']|["']$/g, "")
                .trim()
            )
            .filter((line: string) => line.length > 0 && line.length < 50)
            .slice(0, 4);

          if (extracted.length > 0) {
            setSuggestedPrompts(extracted);
          } else {
            setSuggestedPrompts(SUGGESTED_PROMPTS.slice(0, 4));
          }
        }
      } else {
        setSuggestedPrompts(SUGGESTED_PROMPTS.slice(0, 4));
      }
    } catch (error) {
      console.error("Error generating prompts:", error);
      setSuggestedPrompts(SUGGESTED_PROMPTS.slice(0, 4));
    } finally {
      setIsGeneratingPrompts(false);
    }
  }, [resumeId, messages, isGeneratingPrompts]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hello! I'm your AI resume assistant. I can help you:\n\n• Write and improve resume content\n• Tailor your resume for specific jobs\n• Optimize your bullet points and descriptions\n• Suggest skills and improvements\n• Answer questions about resume best practices\n\nWhat would you like help with today?",
          timestamp: new Date(),
        },
      ]);
      // Generate initial prompts
      setSuggestedPrompts(SUGGESTED_PROMPTS.slice(0, 4));
      // Reset user message count tracker
      lastUserMessageCountRef.current = 0;
    }
  }, [isOpen]);

  // Generate prompts only after a user message is sent (not on every message change)
  useEffect(() => {
    if (!isOpen || !resumeId || resumeId === "new") return;

    // Count user messages
    const userMessageCount = messages.filter((m) => m.role === "user").length;

    // Only generate if:
    // 1. There's at least one user message
    // 2. The user message count has increased (new user message sent)
    // 3. We haven't already generated prompts for this user message count
    if (
      userMessageCount > 0 &&
      userMessageCount > lastUserMessageCountRef.current
    ) {
      lastUserMessageCountRef.current = userMessageCount;

      // Wait for assistant response, then generate prompts
      const timer = setTimeout(() => {
        generateSuggestedPrompts();
      }, 2000); // Wait 2 seconds after user message to allow assistant response

      return () => clearTimeout(timer);
    }
  }, [messages, isOpen, resumeId, generateSuggestedPrompts]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !resumeId) return;

    const userInput = input.trim();
    const userMessage: Message = {
      role: "user",
      content: userInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Check for special commands
      const lowerInput = userInput.toLowerCase();

      if (
        lowerInput.includes("critique") ||
        lowerInput.includes("critic") ||
        lowerInput.includes("review")
      ) {
        // Use AI critique endpoint
        const critiqueResponse = await resumeService.critiqueResume(resumeId);

        if (critiqueResponse.ok && critiqueResponse.data) {
          const critique = critiqueResponse.data.critique;
          let critiqueMessage = "## AI Resume Critique\n\n";

          if (critique.overallAssessment) {
            critiqueMessage += critique.overallAssessment + "\n\n";
          }

          if (critique.aiCritique) {
            if (
              critique.aiCritique.strengths &&
              critique.aiCritique.strengths.length > 0
            ) {
              critiqueMessage += "### Strengths:\n";
              critique.aiCritique.strengths.forEach((s: string) => {
                critiqueMessage += `• ${s}\n`;
              });
              critiqueMessage += "\n";
            }

            if (
              critique.aiCritique.weaknesses &&
              critique.aiCritique.weaknesses.length > 0
            ) {
              critiqueMessage += "### Areas for Improvement:\n";
              critique.aiCritique.weaknesses.forEach((w: string) => {
                critiqueMessage += `• ${w}\n`;
              });
              critiqueMessage += "\n";
            }

            if (
              critique.aiCritique.suggestions &&
              critique.aiCritique.suggestions.length > 0
            ) {
              critiqueMessage += "### Suggestions:\n";
              critique.aiCritique.suggestions.forEach((s: string) => {
                critiqueMessage += `• ${s}\n`;
              });
              critiqueMessage += "\n";
            }
          }

          if (critique.issues && critique.issues.length > 0) {
            critiqueMessage += `### Validation Issues Found: ${critique.issues.length}\n`;
            critique.issues.slice(0, 5).forEach((issue: any) => {
              critiqueMessage += `• [${issue.severity}] ${issue.message}\n`;
            });
          }

          const assistantMessage: Message = {
            role: "assistant",
            content: critiqueMessage,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          throw new Error("Failed to get critique");
        }
      } else {
        // Regular chat
        const conversationHistory = messages
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
          }))
          .concat([{ role: "user", content: userMessage.content }]);

        const response = await resumeService.chat(
          resumeId,
          conversationHistory
        );

        if (response.ok && response.data) {
          // Parse suggestions from the response BEFORE creating message
          const suggestions = parseSuggestions(response.data.message, 0);
          console.log("🔍 Parsed suggestions:", suggestions);

          // Check if user explicitly asked to apply/make changes
          const userInputLower = userInput.toLowerCase();
          const actionVerbs = [
            "make the changes", "apply the changes", "make changes", "apply changes",
            "do it", "make it", "apply it", "go ahead", "yes, apply", "yes apply",
            "update", "update it", "improve", "improve it", "fix", "fix it",
            "modify", "modify it", "change", "change it", "apply", "apply them",
            "make", "make them", "do", "do them", "yes", "sure", "okay", "ok",
            "please", "please do", "please apply", "please make", "go for it",
            "proceed", "execute", "implement", "add", "add it", "add them"
          ];
          const shouldAutoApply = suggestions.length > 0 && actionVerbs.some(verb => 
            userInputLower.includes(verb)
          );
          
          console.log("🔍 Auto-apply check:", {
            userInput: userInput,
            suggestionsCount: suggestions.length,
            shouldAutoApply: shouldAutoApply
          });

          // Remove JSON code blocks from the displayed message
          let displayContent = response.data.message;
          if (suggestions.length > 0) {
            // Remove JSON code blocks from the message content
            displayContent = displayContent
              .replace(/```(?:json)?\s*[\s\S]*?```/g, "")
              .trim();
            // Also remove any standalone JSON objects
            displayContent = displayContent
              .replace(/\{[\s\S]*?"suggestions"[\s\S]*?\}/g, "")
              .trim();
          }

          const assistantMessage: Message = {
            role: "assistant",
            content: displayContent, // Use cleaned content without JSON
            timestamp: new Date(),
          };

          // Add message to state and store suggestions with correct index
          setMessages((prev) => {
            const newMessages = [...prev, assistantMessage];
            // Calculate the index of the newly added message
            const messageIndex = newMessages.length - 1;

            // Store suggestions outside of setMessages to avoid race condition
            if (suggestions.length > 0) {
              console.log(
                "✅ Found suggestions, storing for message index:",
                messageIndex
              );
              // Use setTimeout to ensure state update happens after messages are set
              setTimeout(() => {
                setParsedSuggestions((prev) => {
                  const newMap = new Map(prev);
                  newMap.set(messageIndex, suggestions);
                  console.log(
                    "💾 Stored suggestions map:",
                    Array.from(newMap.entries())
                  );
                  
                  // Auto-apply suggestions if user explicitly asked to make changes
                  if (shouldAutoApply) {
                    console.log("🚀 Auto-applying suggestions as requested by user", {
                      suggestionsCount: suggestions.length,
                      suggestions: suggestions
                    });
                    
                    // Get the latest resume state
                    const latestResume = resume;
                    if (!latestResume) {
                      console.error("❌ Cannot auto-apply: no resume available");
                      return newMap;
                    }
                    
                    // Apply all suggestions to create a combined preview
                    let currentResume = JSON.parse(JSON.stringify(latestResume)); // Deep copy
                    
                    // Map suggestion types to section IDs
                    const getSectionIdFromType = (type: string): string | null => {
                      const typeToSectionMap: Record<string, string> = {
                        summary: "summary",
                        skill: "skills",
                        experience: "experience",
                        education: "education",
                        project: "projects",
                        certification: "certifications",
                      };
                      return typeToSectionMap[type] || null;
                    };
                    
                    // Track which sections need to be enabled
                    const sectionsToEnable = new Set<string>();
                    
                    suggestions.forEach((suggestion, index) => {
                      const sectionId = getSectionIdFromType(suggestion.type);
                      if (sectionId) {
                        const sectionConfig = currentResume.sectionConfig || {};
                        const isEnabled = sectionConfig[sectionId]?.enabled ?? true;
                        if (!isEnabled) {
                          sectionsToEnable.add(sectionId);
                        }
                      }
                    });
                    
                    // Enable all sections that need to be enabled
                    if (sectionsToEnable.size > 0) {
                      const sectionConfig = currentResume.sectionConfig || {};
                      const updatedSectionConfig = { ...sectionConfig };
                      sectionsToEnable.forEach((sectionId) => {
                        updatedSectionConfig[sectionId] = {
                          ...sectionConfig[sectionId],
                          enabled: true,
                          order: sectionConfig[sectionId]?.order ?? 0,
                        };
                        console.log(`✅ Auto-enabled section: ${sectionId}`);
                      });
                      currentResume = {
                        ...currentResume,
                        sectionConfig: updatedSectionConfig,
                      };
                    }
                    
                    suggestions.forEach((suggestion, index) => {
                      const baseResume = currentResume;
                      
                      switch (suggestion.type) {
                        case "summary":
                          if (suggestion.action === "update") {
                            currentResume = {
                              ...baseResume,
                              content: {
                                ...baseResume.content,
                                summary: suggestion.content,
                              },
                            };
                          }
                          break;
                        case "skill":
                          if (suggestion.action === "add") {
                            const existingSkills = baseResume.content.skills || [];
                            const skillExists = existingSkills.some(
                              (s: any) =>
                                s.name?.toLowerCase() === suggestion.content.toLowerCase()
                            );
                            if (!skillExists) {
                              const newSkill = {
                                id: `skill_${Date.now()}_${index}`,
                                name: suggestion.content,
                                category: "Technical",
                                proficiency: "",
                              };
                              currentResume = {
                                ...baseResume,
                                content: {
                                  ...baseResume.content,
                                  skills: [...existingSkills, newSkill],
                                },
                              };
                            }
                          }
                          break;
                        case "experience":
                          if (suggestion.action === "update") {
                            const experiences = [...(baseResume.content.experience || [])];
                            let expIndex = -1;
                            
                            // First try to match by targetId if provided
                            if (suggestion.targetId) {
                              expIndex = experiences.findIndex(
                                (e: any) => e.id === suggestion.targetId
                              );
                            }
                            
                            // If no targetId or not found, try to match by company name or job title
                            if (expIndex === -1 && suggestion.targetSection) {
                              const targetLower = suggestion.targetSection.toLowerCase();
                              expIndex = experiences.findIndex((e: any) => {
                                const companyMatch = e.company?.toLowerCase().includes(targetLower);
                                const titleMatch = e.title?.toLowerCase().includes(targetLower);
                                return companyMatch || titleMatch;
                              });
                            }
                            
                            // If still not found and there's only one experience, use it
                            if (expIndex === -1 && experiences.length === 1) {
                              expIndex = 0;
                            }
                            
                            // If still not found, use the most recent experience
                            if (expIndex === -1 && experiences.length > 0) {
                              expIndex = 0;
                            }
                            
                            if (expIndex >= 0 && suggestion.content) {
                              experiences[expIndex] = {
                                ...experiences[expIndex],
                                description: suggestion.content
                                  .split("\n")
                                  .filter((l: string) => l.trim()),
                              };
                              currentResume = {
                                ...baseResume,
                                content: {
                                  ...baseResume.content,
                                  experience: experiences,
                                },
                              };
                            }
                          }
                          break;
                        case "education":
                          if (suggestion.action === "update") {
                            const educations = [...(baseResume.content.education || [])];
                            let eduIndex = -1;
                            
                            // First try to match by targetId if provided
                            if (suggestion.targetId) {
                              eduIndex = educations.findIndex(
                                (e: any) => e.id === suggestion.targetId
                              );
                            }
                            
                            // If no targetId or not found, try to match by school name or degree
                            if (eduIndex === -1 && suggestion.targetSection) {
                              const targetLower = suggestion.targetSection.toLowerCase();
                              eduIndex = educations.findIndex((e: any) => {
                                const schoolMatch = e.school?.toLowerCase().includes(targetLower);
                                const degreeMatch = e.degree?.toLowerCase().includes(targetLower);
                                return schoolMatch || degreeMatch;
                              });
                            }
                            
                            // If still not found and there's only one education, use it
                            if (eduIndex === -1 && educations.length === 1) {
                              eduIndex = 0;
                            }
                            
                            // If still not found, use the first education
                            if (eduIndex === -1 && educations.length > 0) {
                              eduIndex = 0;
                            }
                            
                            if (eduIndex >= 0 && suggestion.content) {
                              const contentLines = suggestion.content.split("\n").filter((l: string) => l.trim());
                              if (contentLines.length === 1 && contentLines[0].length < 100) {
                                educations[eduIndex] = {
                                  ...educations[eduIndex],
                                  field: contentLines[0],
                                };
                              } else {
                                educations[eduIndex] = {
                                  ...educations[eduIndex],
                                  description: contentLines.join("\n"),
                                };
                              }
                              currentResume = {
                                ...baseResume,
                                content: {
                                  ...baseResume.content,
                                  education: educations,
                                },
                              };
                            }
                          } else if (suggestion.action === "add") {
                            const existingEducations = baseResume.content.education || [];
                            const newEducation = {
                              id: `edu_${Date.now()}_${index}`,
                              school: suggestion.content.split(" - ")[0] || suggestion.content,
                              degree: suggestion.content.split(" - ")[1] || "",
                              field: "",
                              gpa: undefined,
                              startDate: undefined,
                              endDate: undefined,
                            };
                            currentResume = {
                              ...baseResume,
                              content: {
                                ...baseResume.content,
                                education: [...existingEducations, newEducation],
                              },
                            };
                          }
                          break;
                        case "project":
                          if (suggestion.action === "update") {
                            const projects = [...(baseResume.content.projects || [])];
                            let projIndex = -1;
                            
                            // First try to match by targetId if provided
                            if (suggestion.targetId) {
                              projIndex = projects.findIndex(
                                (p: any) => p.id === suggestion.targetId
                              );
                            }
                            
                            // If no targetId or not found, try to match by project name
                            if (projIndex === -1 && suggestion.targetSection) {
                              const targetLower = suggestion.targetSection.toLowerCase();
                              projIndex = projects.findIndex((p: any) => {
                                return p.name?.toLowerCase().includes(targetLower);
                              });
                            }
                            
                            // If still not found and there's only one project, use it
                            if (projIndex === -1 && projects.length === 1) {
                              projIndex = 0;
                            }
                            
                            // If still not found, use the first project
                            if (projIndex === -1 && projects.length > 0) {
                              projIndex = 0;
                            }
                            
                            if (projIndex >= 0 && suggestion.content) {
                              const contentLines = suggestion.content.split("\n").filter((l: string) => l.trim());
                              projects[projIndex] = {
                                ...projects[projIndex],
                                description: contentLines.join("\n"),
                              };
                              currentResume = {
                                ...baseResume,
                                content: {
                                  ...baseResume.content,
                                  projects: projects,
                                },
                              };
                            }
                          } else if (suggestion.action === "add") {
                            const existingProjects = baseResume.content.projects || [];
                            
                            // Parse the content to extract project information
                            const parseProjectContent = (content: string) => {
                              const lines = content.split("\n").filter((l) => l.trim());
                              let name = "";
                              let description = "";
                              let technologies: string[] = [];
                              let link = "";
                              
                              // Try to extract name/title from various patterns
                              const namePatterns = [
                                /^(?:name|title|project)[:\s]+(.+)$/i,  // "Name: Project Name" or "Title: Project Name"
                                /^(.+?)[:\s]+(?:description|desc)/i,   // "Project Name: Description"
                                /^(.+?)\s*-\s*(.+)$/,                    // "Project Name - Description"
                                /^(.+?)\s*:\s*(.+)$/,                   // "Project Name: Description"
                              ];
                              
                              // First, try to find explicit name/title patterns
                              let foundName = false;
                              for (const pattern of namePatterns) {
                                const match = content.match(pattern);
                                if (match && match[1]) {
                                  name = match[1].trim();
                                  foundName = true;
                                  // If there's a description part, use it
                                  if (match[2]) {
                                    description = match[2].trim();
                                  }
                                  break;
                                }
                              }
                              
                              // If no explicit pattern found, try to extract from first line
                              if (!foundName && lines.length > 0) {
                                const firstLine = lines[0].trim();
                                
                                // Check for patterns like "Project Name: Description" or "Project Name - Description"
                                if (firstLine.includes(":")) {
                                  const parts = firstLine.split(":");
                                  const potentialName = parts[0].trim();
                                  // If the part before colon is short and looks like a title, use it
                                  if (potentialName.length < 60 && !potentialName.toLowerCase().includes("description")) {
                                    name = potentialName;
                                    description = parts.slice(1).join(":").trim();
                                  } else {
                                    // Otherwise treat entire line as description
                                    description = firstLine;
                                  }
                                } else if (firstLine.includes(" - ")) {
                                  const parts = firstLine.split(" - ");
                                  const potentialName = parts[0].trim();
                                  // If the part before dash is short, use it as name
                                  if (potentialName.length < 60) {
                                    name = potentialName;
                                    description = parts.slice(1).join(" - ").trim();
                                  } else {
                                    description = firstLine;
                                  }
                                } else {
                                  // If first line is short (likely a title), treat it as name
                                  if (firstLine.length < 60 && firstLine.length > 0) {
                                    name = firstLine;
                                    description = lines.slice(1).join("\n").trim();
                                  } else {
                                    // Otherwise, treat it as description
                                    description = firstLine + (lines.length > 1 ? "\n" + lines.slice(1).join("\n") : "");
                                  }
                                }
                              }
                              
                              // Extract technologies from content (look for common patterns)
                              const techPatterns = [
                                /technologies?[:\s]+([^.\n]+)/i,
                                /tech stack[:\s]+([^.\n]+)/i,
                                /built with[:\s]+([^.\n]+)/i,
                                /using[:\s]+([^.\n]+)/i,
                              ];
                              
                              for (const pattern of techPatterns) {
                                const match = content.match(pattern);
                                if (match && match[1]) {
                                  technologies = match[1]
                                    .split(/[,;]/)
                                    .map((t) => t.trim())
                                    .filter((t) => t.length > 0);
                                  break;
                                }
                              }
                              
                              // Extract link from content (look for URLs)
                              const urlPattern = /(https?:\/\/[^\s]+)/i;
                              const urlMatch = content.match(urlPattern);
                              if (urlMatch) {
                                link = urlMatch[1];
                              }
                              
                              // If no name was extracted, try to extract from description
                              if (!name || name.length === 0) {
                                // Look for a short first sentence or phrase that could be a title
                                const descLines = description.split("\n").filter((l) => l.trim());
                                if (descLines.length > 0) {
                                  const firstDescLine = descLines[0].trim();
                                  // If first line is short and ends with punctuation, it might be a title
                                  if (firstDescLine.length < 60 && /[.!?]$/.test(firstDescLine)) {
                                    name = firstDescLine.replace(/[.!?]$/, "").trim();
                                    description = descLines.slice(1).join("\n").trim() || firstDescLine;
                                  } else if (firstDescLine.length < 60) {
                                    // If it's short without punctuation, treat as name
                                    name = firstDescLine;
                                    description = descLines.slice(1).join("\n").trim() || firstDescLine;
                                  } else {
                                    // Extract first few words as potential name
                                    const words = firstDescLine.split(/\s+/);
                                    if (words.length <= 5) {
                                      name = words.join(" ");
                                      description = description;
                                    } else {
                                      name = words.slice(0, 3).join(" ");
                                      description = description;
                                    }
                                  }
                                } else {
                                  // Last resort: use default name
                                  name = "New Project";
                                }
                              }
                              
                              // If no description, use the content (excluding the name if it was extracted)
                              if (!description || description.length === 0) {
                                // Remove the name from content if it appears at the start
                                let descContent = content;
                                if (name && name !== "New Project") {
                                  const nameRegex = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s:,-]*`, "i");
                                  descContent = descContent.replace(nameRegex, "").trim();
                                }
                                description = descContent || content;
                              }
                              
                              return { name, description, technologies, link };
                            };
                            
                            const parsed = parseProjectContent(suggestion.content);
                            
                            const newProject = {
                              id: `proj_${Date.now()}_${index}`,
                              name: parsed.name,
                              description: parsed.description,
                              technologies: parsed.technologies,
                              link: parsed.link || undefined,
                              startDate: undefined,
                              endDate: undefined,
                            };
                            currentResume = {
                              ...baseResume,
                              content: {
                                ...baseResume.content,
                                projects: [...existingProjects, newProject],
                              },
                            };
                          }
                          break;
                      }
                    });
                    
                    // Apply all changes directly without preview
                    if (onResumeUpdate) {
                      const updates: Partial<Resume> = {
                        content: currentResume.content,
                        sectionConfig: currentResume.sectionConfig,
                      };
                      console.log("📝 Applying updates:", {
                        summary: currentResume.content.summary?.substring(0, 50),
                        skillsCount: currentResume.content.skills?.length,
                        experienceCount: currentResume.content.experience?.length,
                        enabledSections: Object.entries(currentResume.sectionConfig || {})
                          .filter(([_, config]: [string, any]) => config?.enabled !== false)
                          .map(([id]) => id)
                      });
                      onResumeUpdate(updates);
                      console.log("✅ Auto-applied all suggestions");
                    } else {
                      console.error("❌ Cannot auto-apply: onResumeUpdate not available");
                    }
                  } else if (suggestions.length > 0) {
                    console.log("ℹ️ Suggestions found but auto-apply not triggered:", {
                      shouldAutoApply: shouldAutoApply,
                      userInput: userInput
                    });
                  }
                  
                  return newMap;
                });
              }, 0);
            } else {
              console.log("⚠️ No suggestions found in response");
            }

            return newMessages;
          });
        } else {
          throw new Error("Failed to get AI response");
        }
      }
    } catch (error: any) {
      console.error("Error chatting with AI:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
      setMessages([]);
      setInput("");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        height: "100%",
        maxHeight: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#3351FD] bg-opacity-10 rounded-lg">
            <Icon icon="mingcute:ai-fill" className="w-5 h-5 text-[#3351FD]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              AI Assistant
            </h2>
            <p className="text-xs text-gray-500">Your resume writing expert</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Icon icon="mingcute:close-line" className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-white"
        style={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-[#3351FD] text-white"
                  : "bg-white text-gray-900 border border-gray-200"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    icon="mingcute:ai-fill"
                    className="w-4 h-4 text-[#3351FD]"
                  />
                  <span className="text-xs font-semibold text-gray-600">
                    AI Assistant
                  </span>
                </div>
              )}
              {message.role === "assistant" ? (
                <div className="text-sm leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1
                          className="text-lg font-bold mb-2 mt-3 first:mt-0"
                          {...props}
                        />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2
                          className="text-base font-semibold mb-2 mt-3 first:mt-0"
                          {...props}
                        />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3
                          className="text-sm font-semibold mb-1.5 mt-2 first:mt-0"
                          {...props}
                        />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="mb-2 last:mb-0" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul
                          className="list-disc list-inside mb-2 space-y-1"
                          {...props}
                        />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol
                          className="list-decimal list-inside mb-2 space-y-1"
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="text-sm" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold" {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em className="italic" {...props} />
                      ),
                      code: ({ node, inline, ...props }: any) =>
                        inline ? (
                          <code
                            className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800"
                            {...props}
                          />
                        ) : (
                          <code
                            className="block bg-gray-100 p-2 rounded text-xs font-mono text-gray-800 overflow-x-auto mb-2"
                            {...props}
                          />
                        ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote
                          className="border-l-4 border-gray-300 pl-3 italic my-2"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
              )}
              <div
                className={`text-xs mt-2 ${
                  message.role === "user"
                    ? "text-white text-opacity-70"
                    : "text-gray-500"
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              {/* Show apply buttons for suggestions */}
              {message.role === "assistant" &&
                parsedSuggestions.has(index) &&
                (() => {
                  const suggestions = parsedSuggestions.get(index);
                  if (!suggestions || suggestions.length === 0) return null;
                  return (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon
                          icon="mingcute:magic-line"
                          className="w-3.5 h-3.5 text-[#3351FD]"
                        />
                        <p className="text-xs font-semibold text-gray-700">
                          AI Suggestions
                        </p>
                      </div>
                      <div className="space-y-2">
                        {suggestions.map((suggestion, sugIndex) => {
                          // Check if this suggestion has already been applied
                          const alreadyApplied = (() => {
                            const appliedForMessage = appliedSuggestions.get(index) || [];
                            return appliedForMessage.some((applied) => {
                              return (
                                applied.type === suggestion.type &&
                                applied.action === suggestion.action &&
                                applied.content === suggestion.content &&
                                applied.targetId === suggestion.targetId
                              );
                            });
                          })();
                          
                          return (
                            <div
                              key={sugIndex}
                              className={`flex flex-col gap-2 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border rounded-lg transition-all duration-200 shadow-sm ${
                                alreadyApplied
                                  ? "border-green-300 opacity-75"
                                  : "border-blue-200 hover:border-blue-300"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    alreadyApplied ? "bg-green-500" : "bg-[#3351FD]"
                                  }`}></div>
                                  <p className="text-xs font-semibold text-gray-900 truncate">
                                    {suggestion.type === "summary" &&
                                      "Update Summary"}
                                    {suggestion.type === "skill" &&
                                      `Add Skill: ${suggestion.content.length > 20 ? suggestion.content.substring(0, 20) + '...' : suggestion.content}`}
                                    {suggestion.type === "experience" &&
                                      "Update Experience"}
                                    {suggestion.type === "education" &&
                                      "Update Education"}
                                    {suggestion.type === "project" &&
                                      "Update Project"}
                                    {!["summary", "skill", "experience", "education", "project"].includes(
                                      suggestion.type
                                    ) && "Apply Suggestion"}
                                  </p>
                                  {alreadyApplied && (
                                    <Icon
                                      icon="mingcute:check-line"
                                      className="w-3 h-3 text-green-600 flex-shrink-0"
                                    />
                                  )}
                                </div>
                                {suggestion.content &&
                                  suggestion.content.length < 100 &&
                                  suggestion.type !== "skill" && (
                                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                      {suggestion.content}
                                    </p>
                                  )}
                              </div>
                              <button
                                onClick={() => previewSuggestion(suggestion)}
                                disabled={alreadyApplied}
                                className={`w-full px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm ${
                                  alreadyApplied
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-[#3351FD] text-white hover:bg-[#2a45d4] hover:shadow-md"
                                }`}
                                title={alreadyApplied ? "This suggestion has already been applied" : "Preview this suggestion"}
                              >
                                <Icon
                                  icon={alreadyApplied ? "mingcute:check-line" : "mingcute:eye-line"}
                                  className="w-3 h-3"
                                />
                                {alreadyApplied ? "Applied" : "Preview"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              {/* Preview Banner - Show when changes are previewed */}
              {previewResume && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Icon
                            icon="mingcute:eye-line"
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 mb-0.5">
                          Preview Mode Active
                        </p>
                        <p className="text-xs text-gray-600 leading-snug">
                          Changes visible in resume
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={revertPreview}
                        className="flex-1 px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Icon icon="mingcute:close-line" className="w-3 h-3" />
                        Discard
                      </button>
                      <button
                        onClick={applyPreviewedChanges}
                        className="flex-1 px-3 py-1.5 text-xs font-medium bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md"
                      >
                        <Icon icon="mingcute:check-line" className="w-3 h-3" />
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center gap-2">
                <Icon
                  icon="mingcute:ai-fill"
                  className="w-4 h-4 text-[#3351FD]"
                />
                <span className="text-xs font-semibold text-gray-600">
                  AI Assistant
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Section - Always Visible */}
      <div
        className="flex-shrink-0 flex flex-col bg-white border-t border-gray-200"
        style={{ flexShrink: 0 }}
      >
        {/* Suggested Prompts - Always Visible */}
        <div className="px-4 pt-2 pb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600">
              Suggested prompts:
            </p>
            {isGeneratingPrompts && (
              <Icon
                icon="mingcute:loading-line"
                className="w-3 h-3 text-gray-400 animate-spin"
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.length > 0 ? (
              suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  disabled={isLoading}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))
            ) : (
              <div className="text-xs text-gray-400 italic">
                Generating suggestions...
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent resize-none"
                rows={1}
                style={{
                  minHeight: "48px",
                  maxHeight: "120px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(
                    target.scrollHeight,
                    120
                  )}px`;
                }}
              />
              <button
                onClick={handleClearChat}
                className="absolute right-2 bottom-2 p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Clear chat"
              >
                <Icon
                  icon="mingcute:delete-line"
                  className="w-4 h-4 text-gray-500"
                />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a45d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <Icon
                    icon="mingcute:loading-line"
                    className="w-5 h-5 animate-spin"
                  />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Icon icon="mingcute:send-plane-fill" className="w-5 h-5" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
