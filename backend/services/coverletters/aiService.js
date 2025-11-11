import OpenAI from "openai";
import coverLetterService from "./coreService.js";
import profileService from "../profileService.js";
import jobService from "../jobService.js";
import educationService from "../educationService.js";
import certificationService from "../certificationService.js";
import projectService from "../projectService.js";
import skillService from "../skillService.js";
import database from "../database.js";

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
      } = options;

      // Get cover letter
      const coverLetter = await coverLetterService.getCoverLetterById(
        coverLetterId,
        userId
      );
      if (!coverLetter) {
        throw new Error("Cover letter not found");
      }

      // Get user profile with all related data
      const profile = await this.getCompleteProfile(userId);
      if (!profile) {
        throw new Error("User profile not found");
      }

      // Get job details if jobId provided
      let jobDetails = null;
      let companyResearch = null;
      if (jobId) {
        try {
          jobDetails = await jobService.getJobById(jobId, userId);
          if (includeCompanyResearch && jobDetails?.company) {
            companyResearch = await this.researchCompany(jobDetails.company);
          }
        } catch (error) {
          console.error("Error fetching job details:", error);
        }
      }

      // Build context for AI
      const context = this.buildContext(profile, jobDetails, companyResearch);

      // Generate cover letter content
      const prompt = this.buildGenerationPrompt(
        context,
        tone,
        length,
        highlightExperiences
      );

      if (!this.openai) {
        throw new Error("OpenAI API key not configured");
      }

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

      // Parse generated content into structured format
      const parsedContent = this.parseGeneratedContent(generatedContent);

      // Generate variations
      const variations = await this.generateVariations(
        context,
        tone,
        length,
        parsedContent
      );

      return {
        content: parsedContent,
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
   * Research company information
   */
  async researchCompany(companyName) {
    try {
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

