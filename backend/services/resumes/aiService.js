import OpenAI from "openai";

class ResumeAIAssistantService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL;

    // Initialize OpenAI client
    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
        ...(this.openaiApiUrl && { baseURL: this.openaiApiUrl }),
      });
    }
  }

  /**
   * Get system prompt for resume assistant
   */
  getSystemPrompt() {
    return `You are an expert resume writing assistant specialized in helping job applicants create compelling, ATS-friendly resumes. 

**CRITICAL: You are a human-like resume expert. NEVER mention technical details, JSON, code blocks, backend functionality, preview buttons, or how the system works. Focus ONLY on resume writing advice and career guidance.**

Your role is to:

1. **Resume Writing & Content Generation:**
   - Write professional resume sections (summary, experience descriptions, skills)
   - Use action verbs and quantify achievements
   - Ensure ATS (Applicant Tracking System) compatibility
   - Follow industry best practices

2. **Resume Tailoring:**
   - Analyze job descriptions and tailor resume content accordingly
   - Highlight relevant skills and experiences
   - Match keywords from job postings
   - Suggest improvements for specific roles

3. **Resume Optimization:**
   - Improve clarity and impact of bullet points
   - Suggest better wording and phrasing
   - Identify missing information or gaps
   - Recommend skills to add based on experience

4. **Career Guidance:**
   - Provide advice on resume structure and formatting
   - Suggest improvements for different industries
   - Help with career transitions
   - Answer questions about resume best practices

**CRITICAL - Context Usage (READ THIS CAREFULLY):**
- You have access to the user's complete profile information (skills, work experience, education, projects, certifications) - this will be provided below
- You have access to their current resume content - this will be provided below
- **YOU MUST USE THIS INFORMATION** - DO NOT ask the user to provide information you already have access to
- **DO NOT ask questions like "What is your experience?" or "What skills do you have?"** - you already have this information
- **DO NOT ask for job descriptions or company names** - use what's in their profile/resume
- Reference specific details from their profile when making suggestions (e.g., "Based on your experience at [Company]..." or "Your skills in [Skill]...")
- If information is missing, you can mention it, but ALWAYS use what's available first
- When writing content, use their ACTUAL experience, skills, and background from the provided context
- Be proactive - use the information you have to provide specific, tailored advice

**Guidelines:**
- Always be professional, encouraging, and constructive
- Provide specific, actionable advice based on the user's actual profile and resume
- Use clear, concise language
- Focus on helping users stand out to employers
- Consider ATS compatibility in all suggestions
- Be honest about areas for improvement
- Suggest concrete examples when possible
- Reference the user's actual experience and skills when making recommendations

**Response Format:**
- Provide clear, well-structured responses
- Use bullet points for lists
- Include examples when helpful
- Be concise but thorough
- Reference specific information from the user's profile when relevant

**IMPORTANT - Actionable Suggestions (CRITICAL - READ CAREFULLY):**

You MUST ALWAYS include structured JSON suggestions in a code block at the end of your response when:
- User asks about adding skills, sections, or content
- User asks for improvements to summaries, descriptions, or experience
- User asks for clarification or better wording
- User asks what's missing or what they should add
- User uses action verbs: "make", "apply", "update", "improve", "fix", "modify", "change", "add", "do", "implement", "execute", "proceed"
- User asks to "make changes", "apply changes", "update it", "improve it", "fix it", "do it", "make it", "apply it", "go ahead", "yes", "sure", "okay", "please"
- User asks "what should I add", "what's missing", "how can I improve", "what skills", "what experience"
- User provides new content or asks you to write/rewrite something
- ANY request that involves modifying, adding, or changing resume content
- ANY time you provide specific text, content, or recommendations that could be applied to the resume

**CRITICAL RULE:** If the user asks you to make changes, improve something, add something, update something, OR if you provide specific content/text that could be applied to their resume, you MUST include the JSON suggestions block at the end of your response. This is non-negotiable - even if you're just providing advice, if it involves actionable content, include the suggestions.

**DOUBLE-CHECK:** Before sending your response, ask yourself: "Did I provide any specific text, content, or recommendations that the user could apply to their resume?" If YES, you MUST include the JSON suggestions block.

This JSON is for internal processing only - DO NOT explain this technical detail to the user. Simply provide your advice naturally, and include the JSON silently at the end.

**Format for suggestions (include silently at end of response):**

\`\`\`json
{
  "suggestions": [
    {
      "type": "summary",
      "action": "update",
      "content": "Your suggested summary text here"
    },
    {
      "type": "skill",
      "action": "add",
      "content": "Skill name to add"
    },
    {
      "type": "experience",
      "action": "update",
      "targetId": "experience_id_if_updating_specific_item",
      "content": "Improved description text (can be multi-line, use \\n for line breaks)"
    },
    {
      "type": "education",
      "action": "update",
      "targetId": "education_id_if_updating_specific_item",
      "content": "Updated field or description (can be multi-line, use \\n for line breaks)"
    },
    {
      "type": "project",
      "action": "update",
      "targetId": "project_id_if_updating_specific_item",
      "content": "Updated project description (can be multi-line, use \\n for line breaks)"
    }
  ]
}
\`\`\`

**Critical instructions:**
- **NEVER mention JSON, code blocks, or technical implementation details to the user**
- **NEVER explain how suggestions work or mention "preview buttons" or "backend functionality"**
- Focus your response on resume writing advice, career guidance, and content improvements
- Provide natural, conversational responses as if you're a human resume expert
- Include the JSON suggestions silently at the end - the user should not be aware of this technical detail
- Use the user's actual profile data to create relevant suggestions
- For experience updates, try to match by company name or job title if targetId is not available
- For multi-line content, use \\n for line breaks
- Provide 1-3 suggestions per response

**Example responses (what the user should see):**

User: "What skills should I add?"
You: "Based on your experience as a Software Engineer, I recommend adding React and TypeScript to your skills section. These technologies align with your work on web applications and would strengthen your resume for frontend development roles. [Continue with natural advice...]"

[Include JSON silently at end - user never sees this explanation]

User: "Can you improve my summary?"
You: "Here's an improved summary that better highlights your experience: [Provide the improved summary text and explain why it's better in natural language...]"

[Include JSON silently at end]`;
  }

  /**
   * Get context about the user's resume (full details)
   */
  getResumeContext(resume) {
    if (!resume) return "No resume data available.";

    const context = [];
    context.push("=== CURRENT RESUME CONTENT ===");
    context.push("");

    // Personal Info
    if (resume.content?.personalInfo) {
      const {
        firstName,
        lastName,
        email,
        phone,
        location,
        linkedIn,
        portfolio,
      } = resume.content.personalInfo;
      context.push("**Personal Information:**");
      if (firstName || lastName) {
        context.push(`Name: ${firstName || ""} ${lastName || ""}`.trim());
      }
      if (email) context.push(`Email: ${email}`);
      if (phone) context.push(`Phone: ${phone}`);
      if (location) context.push(`Location: ${location}`);
      if (linkedIn) context.push(`LinkedIn: ${linkedIn}`);
      if (portfolio) context.push(`Portfolio: ${portfolio}`);
      context.push("");
    }

    // Summary
    if (resume.content?.summary) {
      context.push("**Summary:**");
      context.push(resume.content.summary);
      context.push("");
    }

    // Experience
    if (resume.content?.experience && resume.content.experience.length > 0) {
      context.push("**Work Experience:**");
      resume.content.experience.forEach((exp, index) => {
        context.push(
          `${index + 1}. ${exp.title || "N/A"} at ${exp.company || "N/A"}`
        );
        if (exp.location) context.push(`   Location: ${exp.location}`);
        context.push(
          `   Duration: ${exp.startDate || "N/A"} - ${
            exp.isCurrent ? "Present" : exp.endDate || "N/A"
          }`
        );
        if (exp.description && Array.isArray(exp.description)) {
          exp.description.forEach((desc) => {
            context.push(`   • ${desc}`);
          });
        } else if (exp.description) {
          context.push(`   Description: ${exp.description}`);
        }
        context.push("");
      });
    }

    // Education
    if (resume.content?.education && resume.content.education.length > 0) {
      context.push("**Education:**");
      resume.content.education.forEach((edu, index) => {
        context.push(
          `${index + 1}. ${edu.degree || "N/A"} from ${edu.school || "N/A"}`
        );
        if (edu.field) context.push(`   Field: ${edu.field}`);
        if (edu.gpa) context.push(`   GPA: ${edu.gpa}`);
        context.push(
          `   Graduated: ${edu.endDate || "N/A"}${
            edu.startDate ? ` (Started: ${edu.startDate})` : ""
          }`
        );
        if (edu.honors) context.push(`   Honors: ${edu.honors}`);
        context.push("");
      });
    }

    // Skills
    if (resume.content?.skills && resume.content.skills.length > 0) {
      context.push("**Skills:**");
      const skillsByCategory = {};
      resume.content.skills.forEach((skill) => {
        const category = skill.category || "Other";
        if (!skillsByCategory[category]) {
          skillsByCategory[category] = [];
        }
        skillsByCategory[category].push(
          `${skill.name}${skill.proficiency ? ` (${skill.proficiency})` : ""}`
        );
      });
      Object.keys(skillsByCategory).forEach((category) => {
        context.push(`${category}: ${skillsByCategory[category].join(", ")}`);
      });
      context.push("");
    }

    // Projects
    if (resume.content?.projects && resume.content.projects.length > 0) {
      context.push("**Projects:**");
      resume.content.projects.forEach((proj, index) => {
        context.push(`${index + 1}. ${proj.name || "N/A"}`);
        if (proj.description) context.push(`   ${proj.description}`);
        if (proj.technologies && Array.isArray(proj.technologies)) {
          context.push(`   Technologies: ${proj.technologies.join(", ")}`);
        }
        if (proj.link) context.push(`   Link: ${proj.link}`);
        context.push("");
      });
    }

    // Certifications
    if (
      resume.content?.certifications &&
      resume.content.certifications.length > 0
    ) {
      context.push("**Certifications:**");
      resume.content.certifications.forEach((cert, index) => {
        context.push(
          `${index + 1}. ${cert.name || "N/A"} from ${
            cert.organization || "N/A"
          }`
        );
        if (cert.dateEarned) context.push(`   Earned: ${cert.dateEarned}`);
        if (cert.expirationDate)
          context.push(`   Expires: ${cert.expirationDate}`);
        context.push("");
      });
    }

    return context.join("\n");
  }

  /**
   * Get user context for AI (profile, skills, jobs, education, etc.)
   */
  getUserContext(userData) {
    if (!userData) return "";

    const context = [];
    let hasData = false;

    // Profile Information
    if (userData.profile) {
      const profile = userData.profile;
      context.push("=== USER PROFILE ===");
      if (profile.first_name || profile.last_name) {
        context.push(
          `Name: ${profile.first_name || ""} ${profile.last_name || ""}`.trim()
        );
      }
      if (profile.email) context.push(`Email: ${profile.email}`);
      if (profile.phone) context.push(`Phone: ${profile.phone}`);
      if (profile.city || profile.state) {
        context.push(
          `Location: ${profile.city || ""}${
            profile.city && profile.state ? ", " : ""
          }${profile.state || ""}`.trim()
        );
      }
      if (profile.job_title)
        context.push(`Current Job Title: ${profile.job_title}`);
      if (profile.industry) context.push(`Industry: ${profile.industry}`);
      if (profile.exp_level)
        context.push(`Experience Level: ${profile.exp_level}`);
      if (profile.bio) context.push(`Bio: ${profile.bio}`);
      context.push("");
    }

    // Skills
    if (userData.skills && userData.skills.length > 0) {
      context.push("=== USER SKILLS ===");
      const skillsByCategory = {};
      userData.skills.forEach((skill) => {
        const category = skill.category || "Other";
        if (!skillsByCategory[category]) {
          skillsByCategory[category] = [];
        }
        skillsByCategory[category].push(
          `${skill.skillName || skill.name}${
            skill.proficiency ? ` (${skill.proficiency})` : ""
          }`
        );
      });
      Object.keys(skillsByCategory).forEach((category) => {
        context.push(`${category}: ${skillsByCategory[category].join(", ")}`);
      });
      context.push("");
    }

    // Jobs/Experience
    if (userData.jobs && userData.jobs.length > 0) {
      context.push("=== USER WORK EXPERIENCE ===");
      userData.jobs.slice(0, 5).forEach((job) => {
        context.push(`${job.title || "N/A"} at ${job.company || "N/A"}`);
        if (job.location) context.push(`  Location: ${job.location}`);
        context.push(
          `  Duration: ${job.startDate || job.start_date || "N/A"} - ${
            job.isCurrent || job.is_current
              ? "Present"
              : job.endDate || job.end_date || "N/A"
          }`
        );
        if (job.description) {
          const desc =
            typeof job.description === "string"
              ? job.description
              : job.description.join("\n");
          context.push(
            `  Description: ${desc.substring(0, 200)}${
              desc.length > 200 ? "..." : ""
            }`
          );
        }
        context.push("");
      });
    }

    // Education
    if (userData.education && userData.education.length > 0) {
      context.push("=== USER EDUCATION ===");
      userData.education.forEach((edu) => {
        context.push(
          `${edu.degreeType || edu.degree || "N/A"} from ${edu.school || "N/A"}`
        );
        if (edu.field) context.push(`  Field: ${edu.field}`);
        if (edu.gpa) context.push(`  GPA: ${edu.gpa}`);
        if (edu.endDate || edu.end_date)
          context.push(`  Graduated: ${edu.endDate || edu.end_date}`);
        context.push("");
      });
    }

    // Projects
    if (userData.projects && userData.projects.length > 0) {
      context.push("=== USER PROJECTS ===");
      userData.projects.slice(0, 3).forEach((proj) => {
        context.push(`${proj.name || "N/A"}`);
        if (proj.description)
          context.push(
            `  ${proj.description.substring(0, 150)}${
              proj.description.length > 150 ? "..." : ""
            }`
          );
        if (proj.technologies) {
          const techs =
            typeof proj.technologies === "string"
              ? proj.technologies
              : proj.technologies.join(", ");
          context.push(`  Technologies: ${techs}`);
        }
        context.push("");
      });
    }

    // Certifications
    if (userData.certifications && userData.certifications.length > 0) {
      context.push("=== USER CERTIFICATIONS ===");
      userData.certifications.forEach((cert) => {
        context.push(
          `${cert.name || "N/A"} from ${
            cert.org_name || cert.organization || "N/A"
          }`
        );
        if (cert.date_earned || cert.dateEarned)
          context.push(`  Earned: ${cert.date_earned || cert.dateEarned}`);
        context.push("");
      });
    }

    return context.join("\n");
  }

  /**
   * Get job context for AI tailoring
   */
  getJobContext(jobOpportunity) {
    if (!jobOpportunity) return "";

    const context = [];
    context.push("=== TARGET JOB POSTING ===");
    context.push(`Job Title: ${jobOpportunity.title || "N/A"}`);
    context.push(`Company: ${jobOpportunity.company || "N/A"}`);
    if (jobOpportunity.location)
      context.push(`Location: ${jobOpportunity.location}`);
    if (jobOpportunity.industry)
      context.push(`Industry: ${jobOpportunity.industry}`);
    if (jobOpportunity.jobType)
      context.push(`Job Type: ${jobOpportunity.jobType}`);
    if (jobOpportunity.description) {
      context.push(`\nJob Description:\n${jobOpportunity.description}`);
    }
    if (jobOpportunity.salaryMin || jobOpportunity.salaryMax) {
      const salaryRange = [];
      if (jobOpportunity.salaryMin)
        salaryRange.push(`$${jobOpportunity.salaryMin}`);
      if (jobOpportunity.salaryMax)
        salaryRange.push(`$${jobOpportunity.salaryMax}`);
      context.push(`Salary Range: ${salaryRange.join(" - ")}`);
    }
    if (jobOpportunity.applicationDeadline)
      context.push(
        `Application Deadline: ${jobOpportunity.applicationDeadline}`
      );
    context.push("");

    return context.join("\n");
  }

  /**
   * Chat with AI assistant
   */
  async chat(messages, resume = null, userData = null, jobOpportunity = null) {
    if (!this.openaiApiKey || !this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      // Build conversation with system prompt and resume context
      let systemPrompt = this.getSystemPrompt();

      // Add job tailoring instructions if job opportunity is provided
      if (jobOpportunity) {
        systemPrompt += `\n\n**CRITICAL - JOB TAILORING MODE:**\nYou are currently tailoring this resume for a specific job posting. The job details will be provided below. When making suggestions:\n- Prioritize keywords and skills mentioned in the job description\n- Emphasize relevant experience that matches the job requirements\n- **IMPORTANT: When suggesting skills, include a "reorder" action type** - suggest reordering existing skills to highlight those most relevant to the job (put job-relevant skills first)\n- Tailor bullet points to match job responsibilities and requirements\n- Focus on aligning the resume content with what the employer is looking for\n- When suggesting skills optimization, prioritize skills that appear in the job description\n- For skills reordering, use type: "skill" with action: "reorder" and provide the skill names in the desired order (most relevant first)\n\n`;
      }

      const systemMessage = {
        role: "system",
        content: systemPrompt,
      };

      // Add job opportunity context if available
      if (jobOpportunity) {
        const jobContext = this.getJobContext(jobOpportunity);
        if (jobContext && jobContext.trim().length > 0) {
          systemMessage.content += `\n\n**TARGET JOB POSTING (tailor all suggestions to this job):**\n${jobContext}`;
          console.log(
            "✅ AI Context - Job opportunity context added (length:",
            jobContext.length,
            "chars)"
          );
        }
      }

      // Add user context if available
      if (userData) {
        const userContext = this.getUserContext(userData);
        if (userContext && userContext.trim().length > 0) {
          systemMessage.content += `\n\n**IMPORTANT: You have access to the following user profile information. Use this information when providing advice - DO NOT ask the user for information you already have:**\n\n${userContext}`;
          console.log(
            "✅ AI Context - User context added (length:",
            userContext.length,
            "chars)"
          );
        } else {
          console.log(
            "⚠️ AI Context - User data provided but context is empty"
          );
        }
      } else {
        console.log("⚠️ AI Context - No user data provided");
      }

      // Add resume context if available
      if (resume) {
        const resumeContext = this.getResumeContext(resume);
        if (resumeContext && resumeContext.trim().length > 0) {
          systemMessage.content += `\n\n**Current Resume Content (what's currently in their resume):**\n${resumeContext}`;
          console.log(
            "✅ AI Context - Resume context added (length:",
            resumeContext.length,
            "chars)"
          );
        }
      } else {
        console.log("⚠️ AI Context - No resume provided");
      }

      // Prepare messages with system prompt
      const conversationMessages = [systemMessage, ...messages];

      // Debug: Log system message length (first 500 chars)
      console.log(
        "📝 AI System Message (first 500 chars):",
        systemMessage.content.substring(0, 500)
      );

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Using gpt-4o-mini for cost efficiency
        messages: conversationMessages,
        temperature: 0.7, // Balanced creativity and consistency
        max_tokens: 1000, // Limit response length
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      return {
        message: content,
        usage: completion.usage,
      };
    } catch (error) {
      console.error("❌ Error in AI chat:", error);
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate resume content (summary, experience descriptions, etc.)
   */
  async generateContent(type, context, jobDescription = null) {
    if (!this.openaiApiKey || !this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    let prompt = "";

    switch (type) {
      case "summary":
        prompt = `Write a professional resume summary (2-3 sentences) for a job applicant with the following background:

${context}

Requirements:
- Highlight key qualifications and experience
- Use professional, concise language
- Focus on value proposition
- Be ATS-friendly
- Avoid first-person pronouns

Return only the summary text, no additional explanation.`;
        break;

      case "experience":
        prompt = `Write compelling bullet points for a work experience entry. Each bullet should:
- Start with a strong action verb
- Quantify achievements when possible
- Be concise (one line each)
- Highlight impact and results

Context:
${context}

${
  jobDescription
    ? `Target Job Description:\n${jobDescription}\n\nTailor the bullet points to match this job description.`
    : ""
}

Return 3-5 bullet points, one per line, formatted as:
• [bullet point 1]
• [bullet point 2]
...`;
        break;

      case "skills":
        prompt = `Based on the following work experience and background, suggest relevant skills to add to a resume:

${context}

${
  jobDescription
    ? `Target Job Description:\n${jobDescription}\n\nSuggest skills that match this job description.`
    : ""
}

Return a list of 5-10 skills, one per line, categorized if possible (e.g., "Technical: Python, JavaScript" or "Soft Skills: Leadership, Communication").`;
        break;

      case "optimize":
        prompt = `Optimize the following resume content to be more impactful and ATS-friendly:

${context}

Requirements:
- Use stronger action verbs
- Quantify achievements where possible
- Make it more concise
- Improve clarity and impact
- Ensure ATS compatibility

Return the optimized version.`;
        break;

      default:
        throw new Error(`Unknown content type: ${type}`);
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt(),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      return {
        content: content.trim(),
        usage: completion.usage,
      };
    } catch (error) {
      console.error("❌ Error generating content:", error);
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }
}

export default new ResumeAIAssistantService();
