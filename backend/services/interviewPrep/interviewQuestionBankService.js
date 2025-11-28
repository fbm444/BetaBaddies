import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import companyInterviewInsightsService from "../companyInterviewInsightsService.js";
import OpenAI from "openai";

/**
 * Service for managing role-specific interview question banks (UC-075)
 * Uses interview_question_banks table and company_interview_insights
 */
class InterviewQuestionBankService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL;
    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
        ...(this.openaiApiUrl && { baseURL: this.openaiApiUrl }),
      });
    }
  }

  /**
   * Get question bank for a specific job/role
   * First checks interview_question_banks table, then falls back to company_interview_insights
   */
  async getQuestionBankByJob(jobId, userId, options = {}) {
    try {
      const { category, difficulty } = options;

      // Get questions from interview_question_banks table
      let query = `
        SELECT id, job_id, difficulty_level, category, question_text, 
               star_framework_guidance, industry_specific, linked_skills, created_at
        FROM interview_question_banks
        WHERE job_id = $1
      `;
      const params = [jobId];

      if (category) {
        query += ` AND category = $${params.length + 1}`;
        params.push(category);
      }

      if (difficulty) {
        query += ` AND difficulty_level = $${params.length + 1}`;
        params.push(difficulty);
      }

      query += ` ORDER BY category, created_at DESC`;

      const result = await database.query(query, params);
      const questions = result.rows.map(this.mapQuestionRow);

      // If no questions found, try to get from company_interview_insights
      if (questions.length === 0) {
        try {
          const insights =
            await companyInterviewInsightsService.getInsightsForJob(
              jobId,
              userId
            );
          if (insights.insights?.common_questions) {
            return {
              questions: insights.insights.common_questions.map((q) => ({
                id: null,
                questionText: q.question,
                category: q.category || "other",
                difficultyLevel: null,
                starFrameworkGuidance: q.why_asked || "",
                industrySpecific: false,
                linkedSkills: [],
                source: "company_insights",
              })),
              source: "company_insights",
            };
          }
        } catch (error) {
          console.warn(
            "[InterviewQuestionBankService] Failed to get insights:",
            error.message
          );
        }
      }

      return {
        questions,
        source: "question_bank",
      };
    } catch (error) {
      console.error(
        "[InterviewQuestionBankService] Error getting question bank:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate question bank for a role using AI
   */
  async generateQuestionBank(jobId, userId, options = {}) {
    try {
      const { jobTitle, industry, difficulty = "mid" } = options;

      // Get job details
      const jobQuery = `
        SELECT title, company, industry, job_description
        FROM job_opportunities
        WHERE id = $1 AND user_id = $2
      `;
      const jobResult = await database.query(jobQuery, [jobId, userId]);

      if (jobResult.rows.length === 0) {
        throw new Error("Job opportunity not found");
      }

      const job = jobResult.rows[0];
      const roleTitle = jobTitle || job.title;
      const roleIndustry = industry || job.industry;

      // Generate questions using AI
      const questions = await this.generateQuestionsWithAI(
        roleTitle,
        roleIndustry,
        difficulty,
        job.job_description
      );

      // Save questions to database
      const savedQuestions = [];
      for (const question of questions) {
        const questionId = uuidv4();
        // Store answerGuidance and whyAsked in star_framework_guidance as JSON if needed
        // Or we can add new columns, but for now store in existing field
        const guidanceData = {
          starFramework: question.starFrameworkGuidance || "",
          whyAsked: question.whyAsked || "",
          answerGuidance: question.answerGuidance || "",
        };

        await database.query(
          `
          INSERT INTO interview_question_banks 
          (id, job_id, difficulty_level, category, question_text, 
           star_framework_guidance, industry_specific, linked_skills)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            questionId,
            jobId,
            question.difficultyLevel || difficulty, // Use question's difficulty or fallback
            question.category,
            question.questionText,
            JSON.stringify(guidanceData), // Store all guidance as JSON
            question.industrySpecific || false,
            JSON.stringify(question.linkedSkills || []),
          ]
        );
        savedQuestions.push({
          id: questionId,
          ...question,
        });
      }

      return {
        questions: savedQuestions,
        count: savedQuestions.length,
      };
    } catch (error) {
      console.error(
        "[InterviewQuestionBankService] Error generating question bank:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate questions using OpenAI
   */
  async generateQuestionsWithAI(
    roleTitle,
    industry,
    difficulty,
    jobDescription
  ) {
    if (!this.openai) {
      // Fallback to basic questions
      return this.getFallbackQuestions(roleTitle, industry, difficulty);
    }

    try {
      // Extract skills from job description
      const skillsExtracted = this.extractSkillsFromDescription(
        jobDescription || ""
      );

      // Detect role seniority level
      const detectedSeniority = this.detectRoleSeniority(
        roleTitle,
        jobDescription
      );

      // Determine question distribution based on detected seniority
      let categoryBreakdown = "";
      let difficultyInstruction = "";
      let totalQuestions = 24;

      if (detectedSeniority === "senior") {
        // For senior roles, generate only senior-level questions
        categoryBreakdown = `CATEGORY BREAKDOWN (6 questions per category, ALL at senior level):
1. Behavioral (6 questions): ALL senior-level
2. Technical (6 questions): ALL senior-level  
3. Situational (6 questions): ALL senior-level
4. Culture/Other (6 questions): ALL senior-level`;
        difficultyInstruction = `CRITICAL: This is a SENIOR role (${roleTitle}). Generate ALL questions at the SENIOR level only. Do NOT include entry or mid-level questions.`;
      } else if (detectedSeniority === "entry") {
        // For entry roles, generate only entry-level questions
        categoryBreakdown = `CATEGORY BREAKDOWN (6 questions per category, ALL at entry level):
1. Behavioral (6 questions): ALL entry-level
2. Technical (6 questions): ALL entry-level  
3. Situational (6 questions): ALL entry-level
4. Culture/Other (6 questions): ALL entry-level`;
        difficultyInstruction = `CRITICAL: This is an ENTRY-LEVEL role (${roleTitle}). Generate ALL questions at the ENTRY level only. Do NOT include mid or senior-level questions.`;
      } else if (detectedSeniority === "mid") {
        // For mid roles, generate only mid-level questions
        categoryBreakdown = `CATEGORY BREAKDOWN (6 questions per category, ALL at mid level):
1. Behavioral (6 questions): ALL mid-level
2. Technical (6 questions): ALL mid-level  
3. Situational (6 questions): ALL mid-level
4. Culture/Other (6 questions): ALL mid-level`;
        difficultyInstruction = `CRITICAL: This is a MID-LEVEL role (${roleTitle}). Generate ALL questions at the MID level only. Do NOT include entry or senior-level questions.`;
      } else {
        // No specific seniority detected - generate questions at all levels (default behavior)
        categoryBreakdown = `CATEGORY BREAKDOWN (6 questions per category):
1. Behavioral (6 questions): 2 entry-level, 3 mid-level, 1 senior-level
2. Technical (6 questions): 2 entry-level, 3 mid-level, 1 senior-level  
3. Situational (6 questions): 2 entry-level, 3 mid-level, 1 senior-level
4. Culture/Other (6 questions): 2 entry-level, 3 mid-level, 1 senior-level`;
        difficultyInstruction = `CRITICAL: You MUST generate questions at ALL three difficulty levels (entry, mid, senior) for EACH category. Do not default to "mid" for all questions.`;
      }

      const prompt = `Generate a comprehensive interview question bank for the following role:

Role Title: ${roleTitle}
Industry: ${industry || "General"}
${jobDescription ? `Job Description: ${jobDescription.substring(0, 2000)}` : ""}
${
  skillsExtracted.length > 0
    ? `Key Skills Required: ${skillsExtracted.join(", ")}`
    : ""
}
${detectedSeniority ? `Detected Role Level: ${detectedSeniority.toUpperCase()}` : "Role Level: Not specified (generate questions at all levels)"}

Generate EXACTLY ${totalQuestions} interview questions with the following structure:

${categoryBreakdown}

DIFFICULTY LEVEL GUIDELINES:
- Entry-level: Basic concepts, foundational skills, simple scenarios, entry-level experience required
- Mid-level: Moderate complexity, practical experience needed, real-world scenarios, 2-5 years experience
- Senior-level: Advanced concepts, leadership/architecture, strategic thinking, 5+ years experience, team management

${difficultyInstruction}

For each question, provide:
- The question text
- Category (behavioral, technical, situational, culture, other)
- Difficulty level (entry, mid, senior) - based on the complexity and experience required
- STAR framework guidance (for behavioral questions) - detailed breakdown of Situation, Task, Action, Result
- Why this question might be asked - what the interviewer is looking for
- Detailed answer guidance - how to structure a strong answer
- Linked skills - specific skills from the job description this question tests

Respond with ONLY valid JSON array in this format:
[
  {
    "questionText": "Question text here",
    "category": "behavioral|technical|situational|culture|other",
    "difficultyLevel": "entry|mid|senior",
    "starFrameworkGuidance": "Detailed STAR method guidance: Situation (set context), Task (your responsibility), Action (what you did), Result (outcome and impact)",
    "whyAsked": "What the interviewer is looking for and why this question matters",
    "answerGuidance": "Detailed guidance on how to structure a strong answer, key points to cover, and what makes a good response",
    "industrySpecific": true/false,
    "linkedSkills": ["specific skill from job description", "another skill"]
  }
]

CRITICAL REQUIREMENTS:
${detectedSeniority 
  ? `1. This role is ${detectedSeniority.toUpperCase()} level - generate ALL questions at ${detectedSeniority.toUpperCase()} level only
2. Do NOT include questions at other difficulty levels (entry, mid, or senior) - only ${detectedSeniority} level
3. ${detectedSeniority === "senior" ? "Senior-level questions should test leadership, architecture, strategic thinking, or advanced concepts" : detectedSeniority === "entry" ? "Entry-level questions should test basic knowledge and foundational skills" : "Mid-level questions should require practical experience and problem-solving"}
4. Link questions to specific skills from the job description
5. For technical questions, reference exact technologies/tools mentioned
6. Ensure the JSON array contains exactly ${totalQuestions} questions, all at ${detectedSeniority} level`
  : `1. You MUST generate questions at entry, mid, AND senior levels for EACH category
2. Do NOT default all questions to "mid" - explicitly assign difficulty based on complexity
3. Entry-level questions should test basic knowledge and foundational skills
4. Mid-level questions should require practical experience and problem-solving
5. Senior-level questions should test leadership, architecture, strategic thinking, or advanced concepts
6. Link questions to specific skills from the job description
7. For technical questions, reference exact technologies/tools mentioned
8. Ensure the JSON array contains exactly ${totalQuestions} questions with proper difficulty distribution`}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 4000, // Increased for more comprehensive questions
        messages: [
          {
            role: "system",
            content:
              "You are an expert interview coach. Generate relevant, realistic interview questions.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      // Parse JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedQuestions = JSON.parse(jsonMatch[0]);
        
        // Validate and ensure difficulty levels are assigned
        const validatedQuestions = parsedQuestions.map((q) => {
          // If difficulty level is missing or invalid, assign based on detected seniority or default to mid
          if (!q.difficultyLevel || !["entry", "mid", "senior"].includes(q.difficultyLevel.toLowerCase())) {
            // Use detected seniority if available, otherwise default to mid
            q.difficultyLevel = detectedSeniority || "mid";
          } else {
            q.difficultyLevel = q.difficultyLevel.toLowerCase();
          }
          
          // If we detected a specific seniority, ensure all questions match it
          if (detectedSeniority && q.difficultyLevel !== detectedSeniority) {
            console.warn(
              `[InterviewQuestionBankService] Question difficulty (${q.difficultyLevel}) doesn't match detected seniority (${detectedSeniority}). Correcting to ${detectedSeniority}.`
            );
            q.difficultyLevel = detectedSeniority;
          }
          
          return q;
        });
        
        // Log difficulty distribution for debugging
        const difficultyCounts = validatedQuestions.reduce((acc, q) => {
          acc[q.difficultyLevel] = (acc[q.difficultyLevel] || 0) + 1;
          return acc;
        }, {});
        console.log("[InterviewQuestionBankService] Generated questions difficulty distribution:", difficultyCounts);
        
        // Log category distribution
        const categoryCounts = validatedQuestions.reduce((acc, q) => {
          const key = `${q.category || "other"}_${q.difficultyLevel || "mid"}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        console.log("[InterviewQuestionBankService] Category-difficulty distribution:", categoryCounts);
        
        return validatedQuestions;
      }

      throw new Error("Could not parse JSON from OpenAI response");
    } catch (error) {
      console.warn(
        "[InterviewQuestionBankService] AI generation failed, using fallback:",
        error.message
      );
      return this.getFallbackQuestions(roleTitle, industry, difficulty);
    }
  }

  /**
   * Detect role seniority level from title and description
   * Returns: "entry", "mid", "senior", or null if not specified
   */
  detectRoleSeniority(roleTitle, jobDescription) {
    if (!roleTitle && !jobDescription) return null;

    const text = `${roleTitle || ""} ${jobDescription || ""}`.toLowerCase();

    // Senior level indicators
    const seniorIndicators = [
      "senior",
      "lead",
      "principal",
      "staff",
      "architect",
      "director",
      "manager",
      "head of",
      "vp ",
      "vice president",
      "5+ years",
      "7+ years",
      "10+ years",
      "8+ years",
    ];

    // Entry level indicators
    const entryIndicators = [
      "junior",
      "entry",
      "associate",
      "intern",
      "internship",
      "0-2 years",
      "1-2 years",
      "new grad",
      "new graduate",
      "recent graduate",
    ];

    // Check for senior first (more specific)
    if (seniorIndicators.some((indicator) => text.includes(indicator))) {
      return "senior";
    }

    // Check for entry level
    if (entryIndicators.some((indicator) => text.includes(indicator))) {
      return "entry";
    }

    // Check for mid-level indicators (if explicitly mentioned)
    const midIndicators = [
      "mid-level",
      "mid level",
      "3-5 years",
      "4-6 years",
    ];
    if (midIndicators.some((indicator) => text.includes(indicator))) {
      return "mid";
    }

    // If no specific seniority detected, return null (will generate all levels)
    return null;
  }

  /**
   * Extract skills from job description
   */
  extractSkillsFromDescription(description) {
    if (!description) return [];

    const descriptionLower = description.toLowerCase();
    const commonSkills = [
      // Technical
      "javascript",
      "typescript",
      "python",
      "java",
      "react",
      "node.js",
      "nodejs",
      "sql",
      "aws",
      "docker",
      "kubernetes",
      "git",
      "agile",
      "scrum",
      "api",
      "rest",
      "graphql",
      "mongodb",
      "postgresql",
      "redis",
      "linux",
      "devops",
      "ci/cd",
      "testing",
      "jest",
      "selenium",
      "angular",
      "vue",
      "next.js",
      "express",
      "django",
      "flask",
      "spring",
      "microservices",
      "terraform",
      // Soft Skills
      "leadership",
      "communication",
      "teamwork",
      "problem solving",
      "collaboration",
      "management",
      "mentoring",
      "presentation",
      "negotiation",
      "stakeholder management",
      // Data & Analytics
      "data analysis",
      "machine learning",
      "ai",
      "statistics",
      "sql",
      "tableau",
      "power bi",
      "excel",
      "data visualization",
    ];

    const foundSkills = [];
    for (const skill of commonSkills) {
      if (descriptionLower.includes(skill)) {
        foundSkills.push(skill);
      }
    }

    return foundSkills.slice(0, 15); // Limit to top 15 skills
  }

  /**
   * Get fallback questions if AI is unavailable
   */
  getFallbackQuestions(roleTitle, industry, difficulty) {
    const baseQuestions = [
      {
        questionText:
          "Tell me about a time when you had to work under pressure. How did you handle it?",
        category: "behavioral",
        difficultyLevel: "entry",
        starFrameworkGuidance:
          "Situation: Set the context. Task: What was your responsibility? Action: What did you do? Result: What was the outcome?",
        industrySpecific: false,
        linkedSkills: ["time-management", "stress-management"],
      },
      {
        questionText:
          "Describe a situation where you had to work with a difficult team member. How did you resolve it?",
        category: "behavioral",
        difficultyLevel: "mid",
        starFrameworkGuidance:
          "Focus on collaboration, communication, and conflict resolution.",
        industrySpecific: false,
        linkedSkills: ["communication", "teamwork"],
      },
      {
        questionText:
          "Tell me about a time when you had to lead a team through a challenging project. What was your approach?",
        category: "behavioral",
        difficultyLevel: "senior",
        starFrameworkGuidance:
          "Focus on leadership, strategic thinking, and team management.",
        industrySpecific: false,
        linkedSkills: ["leadership", "project-management"],
      },
      {
        questionText:
          "What interests you most about this role and our company?",
        category: "culture",
        difficultyLevel: "entry",
        starFrameworkGuidance: "",
        industrySpecific: true,
        linkedSkills: [],
      },
      {
        questionText: "Where do you see yourself in 5 years?",
        category: "other",
        difficultyLevel: "entry",
        starFrameworkGuidance: "",
        industrySpecific: false,
        linkedSkills: [],
      },
      {
        questionText:
          "How would you handle a situation where a project deadline is moved up unexpectedly?",
        category: "situational",
        difficultyLevel: "mid",
        starFrameworkGuidance: "",
        industrySpecific: false,
        linkedSkills: ["project-management", "adaptability"],
      },
    ];

    return baseQuestions;
  }

  /**
   * Get questions by category
   */
  async getQuestionsByCategory(jobId, category) {
    try {
      const query = `
        SELECT id, job_id, difficulty_level, category, question_text, 
               star_framework_guidance, industry_specific, linked_skills
        FROM interview_question_banks
        WHERE job_id = $1 AND category = $2
        ORDER BY created_at DESC
      `;
      const result = await database.query(query, [jobId, category]);
      return result.rows.map(this.mapQuestionRow);
    } catch (error) {
      console.error(
        "[InterviewQuestionBankService] Error getting questions by category:",
        error
      );
      throw error;
    }
  }

  /**
   * Map database row to question object
   */
  mapQuestionRow(row) {
    // Parse guidance data (could be string or JSON)
    let guidanceData = {};
    try {
      if (typeof row.star_framework_guidance === "string") {
        // Try to parse as JSON first
        const parsed = JSON.parse(row.star_framework_guidance);
        if (typeof parsed === "object" && parsed !== null) {
          guidanceData = parsed;
        } else {
          // It's a plain string
          guidanceData = { starFramework: row.star_framework_guidance };
        }
      }
    } catch (e) {
      // Not JSON, treat as plain string
      guidanceData = { starFramework: row.star_framework_guidance || "" };
    }

    return {
      id: row.id,
      jobId: row.job_id,
      questionText: row.question_text,
      category: row.category,
      difficultyLevel: row.difficulty_level,
      starFrameworkGuidance:
        guidanceData.starFramework || guidanceData.starFrameworkGuidance || "",
      whyAsked: guidanceData.whyAsked || "",
      answerGuidance: guidanceData.answerGuidance || "",
      industrySpecific: row.industry_specific || false,
      linkedSkills:
        typeof row.linked_skills === "string"
          ? JSON.parse(row.linked_skills)
          : row.linked_skills || [],
      createdAt: row.created_at,
    };
  }
}

export default new InterviewQuestionBankService();
