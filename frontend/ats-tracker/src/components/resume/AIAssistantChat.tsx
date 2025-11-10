import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { resumeService } from "../../services/resumeService";
import { api } from "../../services/api";
import { JobOpportunityData } from "../../types";
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
  initialJobId?: string | null; // Job ID to auto-select and analyze
  autoAnalyzeJob?: boolean; // Whether to automatically analyze the job
  initialMessage?: string; // Initial message to display from AI (e.g., explanation of tailoring)
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
  action: "update" | "add" | "improve" | "reorder";
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
  initialJobId,
  autoAnalyzeJob = false,
  initialMessage,
}: AIAssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isJobSelectorMinimized, setIsJobSelectorMinimized] = useState(false);
  const [isSuggestedPromptsMinimized, setIsSuggestedPromptsMinimized] = useState(false);
  const lastUserMessageCountRef = useRef(0);
  const [parsedSuggestions, setParsedSuggestions] = useState<
    Map<number, ParsedSuggestion[]>
  >(new Map());
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const [previewMessageIndex, setPreviewMessageIndex] = useState<number | null>(null); // Track which message has preview active
  const [appliedSuggestions, setAppliedSuggestions] = useState<
    Map<number, ParsedSuggestion[]>
  >(new Map());
  const [jobOpportunities, setJobOpportunities] = useState<JobOpportunityData[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);

  // Log props when component mounts or props change
  useEffect(() => {
    console.log("🔧 AIAssistantChat props:", {
      isOpen,
      resumeId,
      initialJobId,
      autoAnalyzeJob,
      hasResume: !!resume,
      hasInitialMessage: !!initialMessage,
    });
  }, [isOpen, resumeId, initialJobId, autoAnalyzeJob, resume, initialMessage]);

  // Track if we've already set the initial message to avoid duplicates
  const initialMessageSetRef = useRef<string | null>(null);

  // Display initial message if provided (HIGH PRIORITY - runs first)
  useEffect(() => {
    if (isOpen && initialMessage) {
      console.log("💬 Initial message effect triggered:", {
        isOpen,
        hasInitialMessage: !!initialMessage,
        initialMessagePreview: initialMessage.substring(0, 100),
        alreadySet: initialMessageSetRef.current === initialMessage,
        currentMessagesLength: messages.length,
      });
      
      // Only set if we haven't set this exact message before
      if (initialMessageSetRef.current !== initialMessage) {
        console.log("✅ Setting initial message in chat");
        const explanationMessage: Message = {
          role: "assistant",
          content: initialMessage,
          timestamp: new Date(),
        };
        
        // Force set the message immediately (replace any existing messages)
        setMessages([explanationMessage]);
        console.log("✅ Initial message set, messages array should now have 1 message");
        
        // Scroll to bottom after a short delay to ensure DOM is updated
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
        
        initialMessageSetRef.current = initialMessage;
      } else {
        console.log("⏭️ Initial message already set, skipping");
      }
    }
    
    // Reset the ref when panel closes
    if (!isOpen) {
      initialMessageSetRef.current = null;
    }
  }, [isOpen, initialMessage]);

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

    console.log("⚠️ No JSON suggestions found in response, trying text-based parsing");

    // Enhanced text-based suggestion parsing
    const contentLower = content.toLowerCase();
    
    // Check if the response contains action verbs that indicate changes are being suggested
    const actionIndicators = [
      "add", "update", "improve", "change", "modify", "enhance", 
      "revise", "rewrite", "suggest", "recommend", "should", "consider"
    ];
    const hasActionIndicators = actionIndicators.some(indicator => 
      contentLower.includes(indicator)
    );

    // Only parse text-based suggestions if action indicators are present
    if (!hasActionIndicators) {
      console.log("⚠️ No action indicators found, skipping text-based parsing");
      return suggestions;
    }

    // Parse summary suggestions
    const summaryPatterns = [
      /(?:summary|professional summary|resume summary)[\s\S]{0,200}?[:]\s*([^\n]{20,500})/i,
      /(?:here'?s? (?:an? |the )?improved? summary)[\s\S]{0,100}?[:]\s*([^\n]{20,500})/i,
      /(?:improved? summary)[\s\S]{0,100}?[:]\s*([^\n]{20,500})/i,
    ];
    
    for (const pattern of summaryPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const summaryText = match[1].trim();
        // Remove common prefixes and clean up
        const cleaned = summaryText
          .replace(/^["']|["']$/g, '')
          .replace(/^here'?s? (?:an? |the )?/i, '')
          .trim();
        if (cleaned.length > 20 && cleaned.length < 500) {
          suggestions.push({
            type: "summary",
            action: "update",
            content: cleaned,
          });
          break; // Only add one summary suggestion
        }
      }
    }

    // Parse skill suggestions - look for skills mentioned after "add", "include", "suggest"
    const skillPatterns = [
      /(?:add|include|suggest|recommend).*?skill[s]?[:\s]+([^\n]{5,200})/i,
      /skill[s]? (?:to add|you should add|to include)[:\s]+([^\n]{5,200})/i,
      /(?:consider adding|you might want to add).*?skill[s]?[:\s]+([^\n]{5,200})/i,
    ];
    
    for (const pattern of skillPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const skillsText = match[1].trim();
        // Extract individual skills (comma-separated, quoted, or listed)
        const skillMatches = skillsText.match(/(?:["']([^"']+)["']|([A-Za-z][A-Za-z\s&]+?))(?:\s*[,;]|\s*and\s|$)/g);
        if (skillMatches) {
          skillMatches.forEach(skillMatch => {
            const skill = skillMatch
              .replace(/["',;]|and\s*$/gi, '')
              .trim();
            if (skill.length > 2 && skill.length < 50 && !skill.toLowerCase().includes('skill')) {
              suggestions.push({
                type: "skill",
                action: "add",
                content: skill,
              });
            }
          });
        }
      }
    }

    // Parse experience/description improvements
    const experiencePatterns = [
      /(?:improved?|better|enhanced?|revised?).*?(?:description|bullet point|experience)[\s\S]{0,200}?[:]\s*([^\n]{30,1000})/i,
      /(?:here'?s? (?:an? |the )?improved?)[\s\S]{0,100}?[:]\s*([^\n]{30,1000})/i,
    ];
    
    for (const pattern of experiencePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const expText = match[1].trim();
        // Split into bullet points if multiple lines
        const bullets = expText.split(/\n+/).filter(line => line.trim().length > 10);
        if (bullets.length > 0) {
          suggestions.push({
            type: "experience",
            action: "update",
            content: bullets.join('\n'),
          });
          break;
        }
      }
    }

    // Look for quoted text that might be suggestions
    const quotedTextPattern = /["']([^"']{20,500})["']/g;
    let quotedMatch;
    while ((quotedMatch = quotedTextPattern.exec(content)) !== null && suggestions.length < 3) {
      const quoted = quotedMatch[1].trim();
      // Skip if it looks like a skill name (too short) or is clearly not a suggestion
      if (quoted.length > 20 && quoted.length < 500 && 
          !quoted.toLowerCase().includes('example') &&
          !quoted.toLowerCase().includes('for instance')) {
        // Try to determine type based on context
        const beforeQuote = content.substring(0, quotedMatch.index);
        if (beforeQuote.toLowerCase().includes('summary')) {
          if (!suggestions.some(s => s.type === 'summary')) {
            suggestions.push({
              type: "summary",
              action: "update",
              content: quoted,
            });
          }
        } else if (beforeQuote.toLowerCase().includes('skill')) {
          suggestions.push({
            type: "skill",
            action: "add",
            content: quoted,
          });
        }
      }
    }

    console.log("📝 Text-based parsing found", suggestions.length, "suggestions");
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
      
      // Track which message index has preview active
      setPreviewMessageIndex(messageIndex);
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
        } else if (suggestion.action === "reorder") {
          // Reorder skills based on the comma-separated list in content
          const existingSkills = baseResume.content.skills || [];
          const orderedSkillNames = suggestion.content
            .split(",")
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);

          // Create a map of skill names to skills for quick lookup
          const skillMap = new Map<string, any>();
          existingSkills.forEach((skill: any) => {
            const key = skill.name?.toLowerCase() || "";
            if (key && !skillMap.has(key)) {
              skillMap.set(key, skill);
            }
          });

          // Build reordered skills array
          const reorderedSkills: any[] = [];
          const usedSkills = new Set<string>();

          // First, add skills in the specified order
          orderedSkillNames.forEach((skillName: string) => {
            const key = skillName.toLowerCase();
            const skill = skillMap.get(key);
            if (skill) {
              reorderedSkills.push(skill);
              usedSkills.add(key);
            }
          });

          // Then, add any remaining skills that weren't in the reorder list
          existingSkills.forEach((skill: any) => {
            const key = skill.name?.toLowerCase() || "";
            if (key && !usedSkills.has(key)) {
              reorderedSkills.push(skill);
            }
          });

          updates.content = {
            ...baseResume.content,
            skills: reorderedSkills,
          };
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
    
    // Remove suggestions from the message that was applied
    if (previewMessageIndex !== null) {
      setParsedSuggestions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(previewMessageIndex);
        return newMap;
      });
    }
    
    setPreviewResume(null);
    setPreviewMessageIndex(null); // Clear preview message index
    setAppliedSuggestions(new Map());

    // Clear preview in parent
    if (onPreviewUpdate) {
      onPreviewUpdate(null);
    }
  };

  // Revert previewed changes
  const revertPreview = () => {
    setPreviewResume(null);
    setPreviewMessageIndex(null); // Clear preview message index
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

  // Fetch job opportunities when component mounts
  useEffect(() => {
    const fetchJobOpportunities = async () => {
      try {
        setLoadingJobs(true);
        console.log("📋 Fetching job opportunities...");
        const response = await api.getJobOpportunities({ 
          sort: "-created_at"
        });
        console.log("📋 Job opportunities response:", response);
        if (response.ok && response.data) {
          // Filter out archived jobs
          const jobs = (response.data.jobOpportunities || []).filter(
            (job: JobOpportunityData) => !job.archived
          );
          console.log("📋 Loaded", jobs.length, "job opportunities");
          setJobOpportunities(jobs);
        } else {
          console.error("📋 Failed to fetch jobs:", response.error);
        }
      } catch (error) {
        console.error("📋 Error fetching job opportunities:", error);
      } finally {
        setLoadingJobs(false);
      }
    };

    if (isOpen) {
      fetchJobOpportunities();
    }
  }, [isOpen]);

  // Auto-select job when initialJobId is provided and auto-analyze
  const hasAutoAnalyzedRef = useRef(false);
  
  // Separate effect to handle job selection
  useEffect(() => {
    if (!isOpen) {
      hasAutoAnalyzedRef.current = false;
      return;
    }

    // If we have an initialJobId and jobs are loaded, select it
    if (initialJobId && isOpen && jobOpportunities.length > 0 && !loadingJobs) {
      const jobExists = jobOpportunities.some(job => job.id === initialJobId);
      if (jobExists && selectedJobId !== initialJobId) {
        console.log("📌 Auto-selecting job:", initialJobId);
        setSelectedJobId(initialJobId);
        // Reset the flag when job changes so we can analyze the new job
        hasAutoAnalyzedRef.current = false;
      }
    }
  }, [initialJobId, isOpen, jobOpportunities, selectedJobId, loadingJobs]);

  // Separate effect to trigger auto-analysis when job is selected
  useEffect(() => {
      console.log("🔄 Auto-analysis effect running with:", {
      autoAnalyzeJob,
      isOpen,
      resumeId,
      selectedJobId,
      initialJobId,
      hasAutoAnalyzed: hasAutoAnalyzedRef.current,
      isLoading,
      messagesLength: messages.length,
      jobOpportunitiesLength: jobOpportunities.length,
      loadingJobs,
      hasInitialMessage: !!initialMessage,
    });

    // Reset flag when panel closes
    if (!isOpen) {
      hasAutoAnalyzedRef.current = false;
      return;
    }

    // Auto-analyze when conditions are met
    // IMPORTANT: Don't auto-analyze if initialMessage is present (AI has already provided explanation)
    const conditions = {
      autoAnalyzeJob: !!autoAnalyzeJob,
      isOpen: !!isOpen,
      resumeIdExists: !!resumeId,
      resumeIdNotNew: resumeId !== "new",
      selectedJobIdExists: !!selectedJobId,
      selectedJobMatchesInitial: selectedJobId === initialJobId,
      notAlreadyAnalyzed: !hasAutoAnalyzedRef.current,
      notLoading: !isLoading,
      noMessages: messages.length === 0,
      hasJobs: jobOpportunities.length > 0,
      notLoadingJobs: !loadingJobs,
      noInitialMessage: !initialMessage, // Don't auto-analyze if initialMessage is present
    };

    const allConditionsMet = Object.values(conditions).every(v => v === true);

    console.log("🔍 Condition check:", conditions);
    console.log("✅ All conditions met:", allConditionsMet);

    if (allConditionsMet) {
      const selectedJob = jobOpportunities.find(job => job.id === selectedJobId);
      if (selectedJob) {
        console.log("🎯 All conditions met, triggering auto-analysis for:", selectedJob.title);
        hasAutoAnalyzedRef.current = true;
        
        // Trigger analysis immediately
        const triggerAnalysis = async () => {
          console.log("🚀 Executing auto-analysis...");
          const analysisPrompt = `Analyze this job posting and provide specific recommendations to tailor my resume:

Job Title: ${selectedJob.title || 'N/A'}
Company: ${selectedJob.company || 'N/A'}
${selectedJob.location ? `Location: ${selectedJob.location}` : ''}
${selectedJob.industry ? `Industry: ${selectedJob.industry}` : ''}
${selectedJob.jobType ? `Job Type: ${selectedJob.jobType}` : ''}
${selectedJob.description ? `\nJob Description:\n${selectedJob.description}` : ''}

Please:
1. Identify the key skills and qualifications required
2. Suggest specific improvements to my resume content (bullet points, summary, skills)
3. Recommend which skills to emphasize or reorder based on relevance
4. Provide tailored suggestions for experience descriptions that match the job requirements

Be specific and actionable with your recommendations.`;

          // Add user message
          const userMessage: Message = {
            role: "user",
            content: analysisPrompt,
            timestamp: new Date(),
          };
          
          // Add initial loading message to show user what's happening
          const loadingMessage: Message = {
            role: "assistant",
            content: "🤖 Analyzing job posting and generating tailored resume recommendations... This may take a moment.",
            timestamp: new Date(),
          };
          
          // Set initial messages with user prompt and loading indicator
          setMessages([userMessage, loadingMessage]);
          setIsLoading(true);

          // Send to AI
          try {
            console.log("📤 Sending prompt to backend for job:", selectedJob.title);
            console.log("📤 Resume ID:", resumeId);
            console.log("📤 Job ID:", selectedJobId);
            console.log("📤 Prompt length:", analysisPrompt.length);
            const response = await resumeService.chat(
              resumeId!,
              [{ role: "user", content: analysisPrompt }],
              selectedJobId
            );

            console.log("📥 Auto-analysis response:", response);
            console.log("📥 Response data:", response.data);

            if (response.ok && response.data) {
              const assistantMessage: Message = {
                role: "assistant",
                content: response.data.message || response.data.content || "I've analyzed the job posting. Here are my recommendations to tailor your resume.",
                timestamp: new Date(),
              };
              
              console.log("💬 Assistant message content length:", assistantMessage.content.length);
              console.log("💬 Assistant message preview:", assistantMessage.content.substring(0, 100));
              
              // Replace the loading message with the actual response
              // We know the structure: [userMessage, loadingMessage]
              // So we replace index 1 with the actual response
              const updatedMessages = [userMessage, assistantMessage];
              setMessages(updatedMessages);
              console.log("📝 Set messages array with", updatedMessages.length, "messages");
              console.log("📝 Messages:", updatedMessages.map(m => ({ role: m.role, contentLength: m.content.length })));
              
              // Force a re-render by updating a state that triggers useEffect
              // The scroll effect will trigger when messages.length changes or when we force it
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 100);
              
              // Parse suggestions - use index 1 since assistant message is at index 1
              const messageContent = response.data.message || response.data.content || "";
              const suggestions = parseSuggestions(messageContent, 1);
              console.log("💡 Parsed suggestions:", suggestions.length);
              if (suggestions.length > 0) {
                setParsedSuggestions(new Map([[1, suggestions]]));
              }
              console.log("✅ Auto-analysis completed successfully");
            } else {
              console.error("❌ Auto-analysis failed - response not ok:", response);
              const errorMessage: Message = {
                role: "assistant",
                content: `I encountered an issue analyzing the job posting. ${response.error?.message || "Please try again or ask me a specific question about the job."}`,
                timestamp: new Date(),
              };
              // Replace loading message with error message
              setMessages([userMessage, errorMessage]);
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 100);
              hasAutoAnalyzedRef.current = false; // Reset flag on error so user can retry
            }
          } catch (error: any) {
            console.error("❌ Auto-analysis error:", error);
            const errorMessage: Message = {
              role: "assistant",
              content: `I apologize, but I'm having trouble analyzing the job posting right now. ${error.message ? `Error: ${error.message}` : "Please try again or ask me a specific question."}`,
              timestamp: new Date(),
            };
            // Replace loading message with error message
            setMessages([userMessage, errorMessage]);
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
            hasAutoAnalyzedRef.current = false; // Reset flag on error so user can retry
          } finally {
            setIsLoading(false);
          }
        };

        // Small delay to ensure UI is ready
        const timer = setTimeout(triggerAnalysis, 300);
        return () => clearTimeout(timer);
      } else {
        console.error("❌ Selected job not found in jobOpportunities:", selectedJobId);
      }
    } else {
      // Log which conditions are failing
      const failingConditions = Object.entries(conditions)
        .filter(([_, met]) => !met)
        .map(([name]) => name);
      if (autoAnalyzeJob && isOpen && failingConditions.length > 0) {
        console.log("⏸️ Auto-analysis blocked by:", failingConditions);
      }
    }
  }, [autoAnalyzeJob, isOpen, resumeId, selectedJobId, initialJobId, jobOpportunities, isLoading, messages.length, loadingJobs, initialMessage]);

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

  // Initialize with welcome message (only if no initialMessage is provided)
  useEffect(() => {
    // Don't show welcome message if we have an initialMessage - that will be handled by the initialMessage effect
    if (isOpen && messages.length === 0 && !initialMessage) {
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
  }, [isOpen, initialMessage, messages.length]);

  // Generate context-aware suggested prompts when panel opens
  useEffect(() => {
    if (isOpen && suggestedPrompts.length === 0 && resumeId && resumeId !== "new") {
      const generateContextualPrompts = async () => {
        try {
          setIsGeneratingPrompts(true);

          // Build context from resume, job, and initial message
          let context = "User is working on their resume.";
          
          if (resume) {
            const hasSummary = resume.content?.summary && resume.content.summary.trim().length > 0;
            const hasExperience = resume.content?.experience && resume.content.experience.length > 0;
            const hasSkills = resume.content?.skills && resume.content.skills.length > 0;
            const hasEducation = resume.content?.education && resume.content.education.length > 0;
            const hasProjects = resume.content?.projects && resume.content.projects.length > 0;
            
            context += `\nResume status: ${hasSummary ? 'Has summary' : 'Needs summary'}, ${hasExperience ? `${resume.content.experience.length} experience entries` : 'No experience'}, ${hasSkills ? `${resume.content.skills.length} skills` : 'No skills'}, ${hasEducation ? `${resume.content.education.length} education entries` : 'No education'}, ${hasProjects ? `${resume.content.projects.length} projects` : 'No projects'}.`;
          }

          // Use selectedJobId or fallback to initialJobId
          const jobIdToUse = selectedJobId || initialJobId;
          if (jobIdToUse) {
            const selectedJob = jobOpportunities.find(job => job.id === jobIdToUse);
            if (selectedJob) {
              context += `\nUser is tailoring resume for: ${selectedJob.title} at ${selectedJob.company}.`;
            } else if (jobIdToUse === initialJobId) {
              // If job not loaded yet but we have initialJobId, mention it
              context += `\nUser is tailoring resume for a specific job posting.`;
            }
          }

          if (initialMessage) {
            // Extract key information from the AI's explanation
            const explanationPreview = initialMessage.substring(0, 300);
            context += `\nAI has just tailored the resume. Explanation preview: ${explanationPreview}`;
          }

          const promptRequest = `Based on the following context, generate 4 short, actionable prompts (each 5-8 words max) that would be helpful for the user to continue improving their resume. The prompts should be specific, relevant, and actionable based on the context. Return ONLY a JSON array of strings, no other text.

Context: ${context}

Example format: ["Write a professional summary", "Improve my work experience", "Suggest skills to add", "Optimize for ATS"]

Generate 4 relevant, context-aware prompts:`;

          const response = await resumeService.chat(resumeId, [
            {
              role: "user",
              content: promptRequest,
            },
          ], jobIdToUse || undefined);

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
                console.log("✅ Generated contextual prompts:", parsed);
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
          console.error("Error generating contextual prompts:", error);
          setSuggestedPrompts(SUGGESTED_PROMPTS.slice(0, 4));
        } finally {
          setIsGeneratingPrompts(false);
        }
      };

      // Small delay to ensure resume and jobs are loaded
      const timer = setTimeout(() => {
        generateContextualPrompts();
      }, 500);

      return () => clearTimeout(timer);
    } else if (isOpen && suggestedPrompts.length === 0) {
      // Fallback to default prompts if no resume ID
      setSuggestedPrompts(SUGGESTED_PROMPTS.slice(0, 4));
    }
  }, [isOpen, resumeId, resume, selectedJobId, initialJobId, jobOpportunities, initialMessage, suggestedPrompts.length]);

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
          conversationHistory,
          selectedJobId || undefined
        );

        if (response.ok && response.data) {
          // Parse suggestions from the response BEFORE creating message
          const suggestions = parseSuggestions(response.data.message, 0);
          console.log("🔍 Parsed suggestions:", suggestions);

          // Check if user explicitly asked to apply/make changes
          // Only auto-apply for explicit confirmation phrases, not questions or general action verbs
          const userInputLower = userInput.toLowerCase().trim();
          
          // Explicit confirmation phrases that indicate user wants to apply changes
          const explicitConfirmations = [
            "make the changes", "apply the changes", "make changes", "apply changes",
            "do it", "make it", "apply it", "go ahead", "yes, apply", "yes apply",
            "apply them", "make them", "do them", "please apply", "please make",
            "go for it", "proceed", "execute", "implement", "apply", "make",
            "yes", "sure", "okay", "ok", "do it", "let's do it", "let's apply",
            "apply these", "make these changes", "apply these changes"
          ];
          
          // Question words that indicate the user is asking, not confirming
          const questionIndicators = [
            "what", "how", "which", "when", "where", "why", "should", "could", "would",
            "can you", "will you", "what should", "how can", "how do", "what can"
          ];
          
          // Check if input is a question (starts with question word or contains question mark)
          const isQuestion = questionIndicators.some(indicator => 
            userInputLower.startsWith(indicator) || userInputLower.includes("?")
          ) || userInputLower.endsWith("?");
          
          // Only auto-apply if:
          // 1. There are suggestions
          // 2. User input matches an explicit confirmation phrase
          // 3. It's NOT a question
          const shouldAutoApply = suggestions.length > 0 && 
            !isQuestion && 
            explicitConfirmations.some(phrase => 
              userInputLower === phrase || 
              userInputLower.startsWith(phrase + " ") ||
              userInputLower.endsWith(" " + phrase) ||
              userInputLower.includes(" " + phrase + " ")
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
    setShowClearChatConfirm(true);
  };

  const confirmClearChat = () => {
    setShowClearChatConfirm(false);
    setMessages([]);
    setInput("");
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
      {/* Clear Chat Confirmation Modal */}
      {showClearChatConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Clear Chat History</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to clear the chat history? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearChatConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearChat}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
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

      {/* Job Selector */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon icon="mingcute:briefcase-line" className="w-4 h-4 text-[#3351FD] flex-shrink-0" />
            <label className="text-xs font-semibold text-gray-700 cursor-pointer" onClick={() => setIsJobSelectorMinimized(!isJobSelectorMinimized)}>
              Tailor for Job Posting (Optional)
            </label>
          </div>
          <button
            onClick={() => setIsJobSelectorMinimized(!isJobSelectorMinimized)}
            className="p-1.5 hover:bg-white/50 rounded-lg transition-colors flex-shrink-0"
            title={isJobSelectorMinimized ? "Expand" : "Minimize"}
            type="button"
          >
            <Icon 
              icon={isJobSelectorMinimized ? "mingcute:down-line" : "mingcute:up-line"} 
              className="w-4 h-4 text-gray-600" 
            />
          </button>
        </div>
        {!isJobSelectorMinimized && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                {loadingJobs ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Icon icon="mingcute:loading-line" className="w-3 h-3 animate-spin" />
                    <span>Loading jobs...</span>
                  </div>
                ) : (
                  <select
                    value={selectedJobId || ""}
                    onChange={(e) => setSelectedJobId(e.target.value || null)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent bg-white"
                  >
                    <option value="">No specific job - General advice</option>
                    {jobOpportunities.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} at {job.company}
                        {job.location ? ` (${job.location})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {selectedJobId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelectedJobId(null);
                  }}
                  className="p-1.5 hover:bg-white/50 rounded-lg transition-colors flex-shrink-0"
                  title="Clear job selection"
                  type="button"
                >
                  <Icon icon="mingcute:close-line" className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>
            {selectedJobId && (
              <div className="mt-2 text-xs text-gray-600">
                <Icon icon="mingcute:information-line" className="w-3 h-3 inline mr-1" />
                AI suggestions will be tailored to match this job's requirements
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-white"
        style={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}
      >
        {(() => {
          console.log("🎨 Rendering messages:", messages.length, "messages");
          if (messages.length === 0 && initialMessage) {
            console.warn("⚠️ No messages but initialMessage exists:", initialMessage.substring(0, 100));
          }
          return null;
        })()}
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
                                    {suggestion.type === "skill" && suggestion.action === "add" &&
                                      `Add Skill: ${suggestion.content.length > 20 ? suggestion.content.substring(0, 20) + '...' : suggestion.content}`}
                                    {suggestion.type === "skill" && suggestion.action === "reorder" &&
                                      `Reorder Skills: ${suggestion.content.split(",").slice(0, 3).map((s: string) => s.trim()).join(", ")}${suggestion.content.split(",").length > 3 ? "..." : ""}`}
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
                                  suggestion.type !== "skill" && suggestion.action !== "reorder" && (
                                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                      {suggestion.content}
                                    </p>
                                  )}
                                {suggestion.type === "skill" && suggestion.action === "reorder" && (
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    Skills will be reordered to prioritize job-relevant skills
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

              {/* Preview Banner - Show only for the message with active preview */}
              {previewResume && previewMessageIndex === index && (
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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 max-w-[85%] shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Icon
                  icon="mingcute:ai-fill"
                  className="w-5 h-5 text-[#3351FD] animate-pulse"
                />
                <span className="text-sm font-semibold text-gray-900">
                  AI Assistant
                </span>
              </div>
              <p className="text-xs text-gray-700 mb-3">
                Analyzing job posting and generating tailored resume recommendations...
              </p>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 bg-[#3351FD] rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-[#3351FD] rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-[#3351FD] rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
                <span className="text-xs text-gray-600 ml-2">Please wait...</span>
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
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-4 pt-2 pb-2">
            <div className="flex items-center gap-2">
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
            <button
              onClick={() => setIsSuggestedPromptsMinimized(!isSuggestedPromptsMinimized)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title={isSuggestedPromptsMinimized ? "Expand" : "Minimize"}
              type="button"
            >
              <Icon 
                icon={isSuggestedPromptsMinimized ? "mingcute:up-line" : "mingcute:down-line"} 
                className="w-3 h-3 text-gray-600" 
              />
            </button>
          </div>
          {!isSuggestedPromptsMinimized && (
            <div className="px-4 pb-2">
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
          )}
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
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent resize-none overflow-y-auto"
                rows={1}
                style={{
                  minHeight: "48px",
                  maxHeight: "120px",
                  overflowY: "auto",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  const newHeight = Math.min(target.scrollHeight, 120);
                  target.style.height = `${newHeight}px`;
                  // Enable scrolling if content exceeds max height
                  if (target.scrollHeight > 120) {
                    target.style.overflowY = "auto";
                  } else {
                    target.style.overflowY = "hidden";
                  }
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
