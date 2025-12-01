import OpenAI from "openai";
import coverLetterService from "./coreService.js";
import profileService from "../profileService.js";
import jobService from "../jobService.js";
import educationService from "../educationService.js";
import certificationService from "../certificationService.js";
import projectService from "../projectService.js";
import skillService from "../skillService.js";
import database from "../database.js";
import companyResearchService from "../companyResearchService.js";

class CoverLetterAIService {
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
   * Generate cover letter content using AI
   */
  async generateCoverLetterContent(coverLetterId, userId, options = {}) {
    try {
      const {
        jobId,
        tone = "formal",
        length = "standard",
        includeCompanyResearch = true,
        highlightExperiences = true,
        forceRegenerate = false,
      } = options;

      // Get cover letter
      const coverLetter = await coverLetterService.getCoverLetterById(
        coverLetterId,
        userId
      );
      if (!coverLetter) {
        throw new Error("Cover letter not found");
      }
      // If this cover letter already has generated content and the caller
      // didn't explicitly ask to regenerate, return the existing content
      // instead of calling OpenAI again.
      if (coverLetter.content && !forceRegenerate) {
        const existingTone =
          coverLetter.toneSettings?.tone || tone || "formal";
        const existingLength =
          coverLetter.toneSettings?.length || length || "standard";

        return {
          content: {
            ...coverLetter.content,
            generatedBy: coverLetter.content.generatedBy || "cached",
          },
          variations: [],
          companyResearch: coverLetter.companyResearch || null,
          tone: existingTone,
          length: existingLength,
        };
      }

      let profileSummary = null;
      try {
        const profile = await this.getCompleteProfile(userId);
        profileSummary = this.summarizeProfile(profile);
      } catch (profileError) {
        profileSummary = null;
      }

      if (!profileSummary) {
        throw this.buildMissingProfileError();
      }

      // Get job details if jobId provided (or if cover letter has a job_id)
      let jobDetails = null;
      let companyResearch = null;
      const effectiveJobId = jobId || coverLetter.jobId;
      
      if (effectiveJobId) {
        try {
          // Fetch job from job_opportunities table
          const jobQuery = await database.query(
            "SELECT id, title, company, location, job_description, industry, job_type, salary_min, salary_max FROM job_opportunities WHERE id = $1 AND user_id = $2",
            [effectiveJobId, userId]
          );
          
          if (jobQuery.rows.length > 0) {
            jobDetails = {
              id: jobQuery.rows[0].id,
              title: jobQuery.rows[0].title,
              company: jobQuery.rows[0].company,
              location: jobQuery.rows[0].location,
              description: jobQuery.rows[0].job_description,
              industry: jobQuery.rows[0].industry,
              jobType: jobQuery.rows[0].job_type,
              salaryMin: jobQuery.rows[0].salary_min,
              salaryMax: jobQuery.rows[0].salary_max,
            };
            
            console.log(`✓ Loaded job details: ${jobDetails.title} at ${jobDetails.company}`);
            
            if (includeCompanyResearch && jobDetails?.company) {
              // Pass jobId to use real company research data
              companyResearch = await this.researchCompany(jobDetails.company, effectiveJobId);
            }
          } else {
            console.warn(`⚠️ Job ${effectiveJobId} not found for user ${userId}`);
          }
        } catch (error) {
          console.error("Error fetching job details:", error);
        }
      }

      // Build context for AI
      const context = this.buildContext(profileSummary, jobDetails, companyResearch);

      let parsedContent = null;
      let variations = [];
      let usedFallback = false;

      // Generate cover letter content via OpenAI when available
      if (this.openai) {
        try {
          const prompt = this.buildGenerationPrompt(
            context,
            tone,
            length,
            highlightExperiences
          );

          const response = await this.openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4",
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
            max_tokens: 2000,
          });

          const generatedContent = response.choices[0]?.message?.content || "";
          parsedContent = this.parseGeneratedContent(generatedContent);
          variations = await this.generateVariations(
            context,
            tone,
            length,
            parsedContent
          );
        } catch (openAiError) {
          console.warn(
            "[CoverLetterAIService] OpenAI generation failed, using fallback generator:",
            openAiError.message
          );
        }
      } else {
        console.info(
          "[CoverLetterAIService] OpenAI not configured. Using local fallback generator."
        );
      }

      if (!parsedContent) {
        const fallback = this.generateFallbackCoverLetter(
          context,
          tone,
          length,
          highlightExperiences
        );
        parsedContent = fallback.content;
        variations = fallback.variations;
        usedFallback = true;
      }

      return {
        content: {
          ...parsedContent,
          generatedBy: usedFallback ? "fallback" : "openai",
        },
        variations,
        companyResearch,
        tone,
        length,
      };
    } catch (error) {
      console.error("❌ Error generating cover letter content:", error);
      throw error;
    }
  }

  /**
   * Generate a structured fallback cover letter when AI is unavailable.
   */
  generateFallbackCoverLetter(context, tone, length, highlightExperiences) {
    const personalInfo = context.profile?.personalInfo || {};
    const experiences = Array.isArray(context.profile?.experience)
      ? context.profile.experience
      : [];
    const topExperiences = experiences.filter(Boolean).slice(0, 2);
    const skills = Array.isArray(context.profile?.skills)
      ? context.profile.skills
      : [];
    const job = context.job || {};
    const companyName = job.company || context.companyResearch?.companyName;
    const roleName = job.title || personalInfo.jobTitle || "the role";

    const greeting = companyName
      ? `Dear ${companyName} Hiring Team,`
      : "Dear Hiring Manager,";

    const introClauses = [];
    if (personalInfo.fullName || personalInfo.firstName) {
      introClauses.push(
        `My name is ${personalInfo.fullName || personalInfo.firstName}`
      );
    }
    if (personalInfo.jobTitle || personalInfo.industry) {
      introClauses.push(
        `I am a ${personalInfo.jobTitle || personalInfo.industry} professional`
      );
    }

    const intro = `${introClauses.join(" and ")} eager to bring my experience to ${
      companyName || "your organization"
    } in ${roleName === "the role" ? "this position" : `the ${roleName} role`}.`;

    const experienceParagraphs = topExperiences.map((exp) => {
      const title =
        exp.jobTitle || exp.title || exp.position || "my recent position";
      const employer = exp.company || exp.companyName || exp.organization || "";
      const companyFragment = employer ? ` at ${employer}` : "";
      const summary =
        exp.summary ||
        exp.description ||
        (Array.isArray(exp.highlights) && exp.highlights.length > 0
          ? exp.highlights[0]
          : "");

      let quantifiedAchievement = "";
      if (Array.isArray(exp.achievements) && exp.achievements.length > 0) {
        quantifiedAchievement = exp.achievements[0];
      } else if (
        Array.isArray(exp.results) &&
        exp.results.length > 0 &&
        exp.results[0]
      ) {
        quantifiedAchievement = exp.results[0];
      }

      const summarySentence = summary
        ? `In ${title}${companyFragment}, I ${summary.replace(/^[Ii]\s/, "")}.`
        : `In ${title}${companyFragment}, I delivered impactful results.`;

      const achievementSentence = quantifiedAchievement
        ? `Highlights include ${quantifiedAchievement}.`
        : "";

      return `${summarySentence} ${achievementSentence}`.trim();
    });

    const skillNames = skills
      .map((skill) => skill.skillName || skill.name)
      .filter(Boolean)
      .slice(0, 6);

    const skillSentence = skillNames.length
      ? `My toolkit spans ${skillNames.join(", ")}, allowing me to contribute quickly to your priorities.`
      : "";

    const companySentence = companyName
      ? `I am inspired by ${companyName}'s commitment to ${
          context.companyResearch?.mission ||
          context.companyResearch?.initiatives?.[0] ||
          "innovation"
        }, and I am excited by the opportunity to support these efforts.`
      : "";

    const needsSummary = highlightExperiences
      ? experienceParagraphs.join(" ")
      : [experienceParagraphs[0], skillSentence].filter(Boolean).join(" ");

    const toneAdjustments = {
      enthusiastic: "I would welcome the chance to bring this energy to your team.",
      analytical:
        "I would value the opportunity to apply this structured, data-informed approach within your organization.",
      casual:
        "I’d love to connect and talk through how these strengths could help your team right away.",
      formal:
        "I would appreciate the opportunity to further discuss how my background aligns with your needs.",
    };

    const chosenTone =
      toneAdjustments[tone?.toLowerCase?.()] || toneAdjustments.formal;

    const closing = [
      companySentence || skillSentence,
      `${chosenTone} Thank you for your time and consideration.`,
      `Sincerely,\n${personalInfo.fullName || personalInfo.firstName || ""}${
        personalInfo.email ? `\n${personalInfo.email}` : ""
      }${personalInfo.phone ? `\n${personalInfo.phone}` : ""}`,
    ]
      .filter(Boolean)
      .join(" ");

    const content = {
      opening: `${greeting}\n\n${intro}`,
      body: needsSummary
        ? needsSummary.match(/[^.?!]+[.?!]/g) || [needsSummary]
        : [],
      closing,
    };

    const bodyParagraphs = [];
    if (content.body.length > 0) {
      bodyParagraphs.push(
        content.body.slice(0, Math.max(1, Math.ceil(content.body.length / 2))).join(" ")
      );
      if (content.body.length > 1) {
        bodyParagraphs.push(
          content.body.slice(Math.ceil(content.body.length / 2)).join(" ")
        );
      }
    }

    const structuredContent = {
      opening: content.opening,
      body: bodyParagraphs.length ? bodyParagraphs : [needsSummary].filter(Boolean),
      closing: content.closing,
    };

    structuredContent.fullText = [
      structuredContent.opening,
      ...structuredContent.body,
      structuredContent.closing,
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      content: structuredContent,
      variations: [],
    };
  }

  /**
   * Research company information
   * First checks database, then falls back to AI if not found
   */
  async researchCompany(companyName, jobId = null) {
    try {
      let companyData = null;
      
      // First, try to get research from database if we have a jobId
      if (jobId) {
        try {
          const research = await companyResearchService.getCompleteCompanyResearch(jobId);
          if (research) {
            // Convert database format to the format expected by cover letter generation
            companyData = {
              companyName: companyName,
              industry: research.industry || null,
              size: research.size || null,
              mission: research.description || null,
              recentNews: research.news?.slice(0, 3).map(n => n.heading) || [],
              initiatives: [],
              culture: null,
              growth: research.news?.find(n => 
                n.type === 'funding' || 
                n.type === 'acquisition' || 
                n.heading?.toLowerCase().includes('growth') ||
                n.heading?.toLowerCase().includes('expan')
              )?.heading || null,
            };
            
            console.log(`✅ Using real company research data for ${companyName}`);
            return companyData;
          }
        } catch (dbError) {
          console.log(`⚠️ No company research found in database for ${companyName}, will use AI fallback`);
        }
      }

      // Fallback: Use AI to generate company research (old behavior)
      if (!this.openai) {
        return null;
      }

      const prompt = `Research the company "${companyName}" and provide the following information in JSON format:
{
  "companyName": "Company Name",
  "industry": "Industry",
  "size": "Company size (e.g., '50-200 employees')",
  "mission": "Company mission/values",
  "recentNews": ["Recent news item 1", "Recent news item 2"],
  "initiatives": ["Initiative 1", "Initiative 2"],
  "culture": "Company culture description",
  "growth": "Recent growth or expansion information"
}

Provide accurate, recent information. If you cannot find specific information, use null for that field.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || "";
      
      // Try to extract JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log(`⚠️ Using AI-generated company research for ${companyName} (no stored data available)`);
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error("Error parsing company research JSON:", parseError);
      }

      // Fallback: return structured object
      return {
        companyName,
        industry: null,
        size: null,
        mission: null,
        recentNews: [],
        initiatives: [],
        culture: null,
        growth: null,
      };
    } catch (error) {
      console.error("❌ Error researching company:", error);
      return null;
    }
  }

  /**
   * Highlight relevant experiences
   */
  async highlightExperiences(coverLetterId, userId, jobId) {
    try {
      const coverLetter = await coverLetterService.getCoverLetterById(
        coverLetterId,
        userId
      );
      if (!coverLetter) {
        throw new Error("Cover letter not found");
      }

      const profile = await this.getCompleteProfile(userId);
      if (!profile) {
        throw new Error("User profile not found");
      }

      const jobDetails = await jobService.getJobById(jobId, userId);
      if (!jobDetails) {
        throw new Error("Job not found");
      }

      if (!this.openai) {
        throw new Error("OpenAI API key not configured");
      }

      const prompt = `Analyze the following job requirements and user experience to identify the most relevant experiences to highlight in a cover letter:

Job Title: ${jobDetails.jobTitle}
Job Description: ${jobDetails.description || "Not provided"}
Company: ${jobDetails.company}

User Experience:
${JSON.stringify(profile.experience || [], null, 2)}

Provide a JSON response with:
{
  "relevantExperiences": [
    {
      "experienceId": "id",
      "relevanceScore": 0.95,
      "keyPoints": ["point 1", "point 2"],
      "connectionToJob": "How this experience connects to the job"
    }
  ],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || "";
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error("Error parsing experience highlighting JSON:", parseError);
      }

      return {
        relevantExperiences: [],
        suggestions: [],
      };
    } catch (error) {
      console.error("❌ Error highlighting experiences:", error);
      throw error;
    }
  }

  /**
   * Get complete profile with all related data (experience, education, skills, projects, certifications)
   */
  async getCompleteProfile(userId) {
    try {
      // Get basic profile info
      const basicProfile = await profileService.getProfileByUserId(userId);
      if (!basicProfile) {
        return null;
      }

      // Get experience/employment data
      let experience = [];
      try {
        const employmentQuery = `
          SELECT title AS job_title, company, location, start_date, end_date, description, is_current
          FROM jobs
          WHERE user_id = $1
          ORDER BY start_date DESC
        `;
        const employmentResult = await database.query(employmentQuery, [userId]);
        experience = employmentResult.rows.map((row) => ({
          job_title: row.job_title,
          company: row.company,
          location: row.location,
          start_date: row.start_date,
          end_date: row.end_date,
          description: row.description,
          is_current: row.is_current,
        }));
      } catch (error) {
        console.warn("Could not fetch employment data:", error.message);
      }

      // Get education data
      let education = [];
      try {
        education = await educationService.getEducationByUserId(userId);
      } catch (error) {
        console.warn("Could not fetch education data:", error.message);
      }

      // Get skills data
      let skills = [];
      try {
        skills = await skillService.getSkillsByUserId(userId);
      } catch (error) {
        console.warn("Could not fetch skills data:", error.message);
      }

      // Get projects data
      let projects = [];
      try {
        projects = await projectService.getProjectsByUserId(userId);
      } catch (error) {
        console.warn("Could not fetch projects data:", error.message);
      }

      // Get certifications data
      let certifications = [];
      try {
        certifications = await certificationService.getCertificationsByUserId(userId);
      } catch (error) {
        console.warn("Could not fetch certifications data:", error.message);
      }

      // Build complete profile object
      return {
        personalInfo: {
          firstName: basicProfile.first_name,
          middleName: basicProfile.middle_name,
          lastName: basicProfile.last_name,
          fullName: basicProfile.fullName,
          email: basicProfile.email,
          phone: basicProfile.phone,
          city: basicProfile.city,
          state: basicProfile.state,
          jobTitle: basicProfile.job_title,
          bio: basicProfile.bio,
          industry: basicProfile.industry,
          experienceLevel: basicProfile.exp_level,
        },
        experience,
        education,
        skills,
        projects,
        certifications,
      };
    } catch (error) {
      console.error("❌ Error getting complete profile:", error);
      throw error;
    }
  }

  /**
   * Build context for AI generation
   */
  buildContext(profile, jobDetails, companyResearch) {
    return {
      profile: {
        personalInfo: profile.personalInfo || {},
        experience: profile.experience || [],
        education: profile.education || [],
        skills: profile.skills || [],
        projects: profile.projects || [],
        certifications: profile.certifications || [],
      },
      job: jobDetails
        ? {
            title: jobDetails.jobTitle,
            company: jobDetails.company,
            description: jobDetails.description,
            requirements: jobDetails.requirements || [],
          }
        : null,
      companyResearch,
    };
  }

  /**
   * Build generation prompt
   */
  buildGenerationPrompt(context, tone, length, highlightExperiences) {
    let prompt = `Generate a professional cover letter with the following specifications:

Tone: ${tone}
Length: ${length}
${highlightExperiences ? "Highlight most relevant experiences" : ""}

User Profile:
${JSON.stringify(context.profile, null, 2)}`;

    if (context.job) {
      prompt += `\n\nJob Details:
Title: ${context.job.title}
Company: ${context.job.company}
Description: ${context.job.description || "Not provided"}`;
    }

    if (context.companyResearch) {
      prompt += `\n\nCompany Research:
${JSON.stringify(context.companyResearch, null, 2)}`;
    }

    prompt += `\n\nGenerate a cover letter with:
1. Opening paragraph: Personalized greeting mentioning the company and role
2. Body paragraphs: Highlight relevant experience and achievements, connect to job requirements
3. Closing paragraph: Call-to-action expressing interest and next steps

Format the response as JSON:
{
  "opening": "Opening paragraph text",
  "body": ["Body paragraph 1", "Body paragraph 2"],
  "closing": "Closing paragraph text",
  "fullText": "Complete cover letter text"
}`;

    return prompt;
  }

  /**
   * Parse generated content
   */
  parseGeneratedContent(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error("Error parsing generated content:", error);
    }

    // Fallback: return as full text
    return {
      fullText: content,
      opening: "",
      body: [],
      closing: "",
    };
  }

  summarizeProfile(profile) {
    if (!profile || typeof profile !== "object") {
      return null;
    }

    const personalInfo = profile.personalInfo || {};
    const hasName = Boolean(
      personalInfo.fullName ||
        personalInfo.firstName ||
        personalInfo.lastName
    );
    const hasContact = Boolean(personalInfo.email || personalInfo.phone);

    const hasAnyContext =
      hasName ||
      hasContact ||
      (Array.isArray(profile.experience) && profile.experience.length > 0) ||
      (Array.isArray(profile.education) && profile.education.length > 0) ||
      (Array.isArray(profile.skills) && profile.skills.length > 0);

    if (!hasAnyContext) {
      return null;
    }

    const safePersonalInfo = {
      firstName: personalInfo.firstName || null,
      middleName: personalInfo.middleName || null,
      lastName: personalInfo.lastName || null,
      fullName:
        personalInfo.fullName ||
        [personalInfo.firstName, personalInfo.lastName]
          .filter(Boolean)
          .join(" ") ||
        null,
      email: personalInfo.email || null,
      phone: personalInfo.phone || null,
      city: personalInfo.city || null,
      state: personalInfo.state || null,
      jobTitle: personalInfo.jobTitle || null,
      bio: personalInfo.bio || null,
      industry: personalInfo.industry || null,
      experienceLevel: personalInfo.experienceLevel || null,
    };

    return {
      personalInfo: safePersonalInfo,
      experience: Array.isArray(profile.experience)
        ? profile.experience
        : [],
      education: Array.isArray(profile.education)
        ? profile.education
        : [],
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      projects: Array.isArray(profile.projects) ? profile.projects : [],
      certifications: Array.isArray(profile.certifications)
        ? profile.certifications
        : [],
    };
  }

  buildMissingProfileError() {
    const error = new Error(
      "We need more profile info to personalize your cover letter."
    );
    error.code = "PROFILE_INCOMPLETE";
    error.detail =
      "Add your name, contact details, and at least one experience or skill in the Profile section, then try again.";
    return error;
  }

  /**
   * Generate variations
   */
  async generateVariations(context, tone, length, originalContent) {
    try {
      if (!this.openai) {
        return [];
      }

      const variations = [];
      const alternativeTones = ["formal", "enthusiastic", "analytical"].filter(
        (t) => t !== tone
      );

      // Generate one variation with different tone
      if (alternativeTones.length > 0) {
        const variationTone = alternativeTones[0];
        const prompt = `Generate an alternative version of this cover letter with a ${variationTone} tone instead of ${tone}:

${originalContent.fullText || JSON.stringify(originalContent)}

Keep the same structure and key points, but adjust the tone.`;

        const response = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 2000,
        });

        const variationContent = response.choices[0]?.message?.content || "";
        variations.push({
          tone: variationTone,
          content: this.parseGeneratedContent(variationContent),
        });
      }

      return variations;
    } catch (error) {
      console.error("❌ Error generating variations:", error);
      return [];
    }
  }

  /**
   * Get system prompt for cover letter generation
   */
  getSystemPrompt() {
    return `You are an expert cover letter writing assistant. Your role is to create compelling, personalized cover letters that:

1. **Personalization**: Include specific company and role references
2. **Relevance**: Highlight experiences that match job requirements
3. **Professionalism**: Maintain appropriate tone and style
4. **Impact**: Use quantifiable achievements and specific examples
5. **Connection**: Show genuine interest in the company and role

Guidelines:
- Use action verbs and quantify achievements
- Connect user's experience to job requirements
- Include company research when available
- Match the requested tone (formal, casual, enthusiastic, analytical)
- Match the requested length (brief, standard, detailed)
- Write in first person
- Be specific and avoid generic statements
- Show enthusiasm and genuine interest`;
  }
}

export default new CoverLetterAIService();

