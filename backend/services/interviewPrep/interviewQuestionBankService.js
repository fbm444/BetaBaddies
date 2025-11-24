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
          const insights = await companyInterviewInsightsService.getInsightsForJob(
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
            difficulty,
            question.category,
            question.questionText,
            question.starFrameworkGuidance || "",
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
  async generateQuestionsWithAI(roleTitle, industry, difficulty, jobDescription) {
    if (!this.openai) {
      // Fallback to basic questions
      return this.getFallbackQuestions(roleTitle, industry, difficulty);
    }

    try {
      const prompt = `Generate a comprehensive interview question bank for the following role:

Role Title: ${roleTitle}
Industry: ${industry || "General"}
Difficulty Level: ${difficulty}
${jobDescription ? `Job Description: ${jobDescription.substring(0, 1000)}` : ""}

Generate 15-20 interview questions covering:
1. Behavioral questions (using STAR method)
2. Technical questions (if applicable)
3. Situational questions
4. Company-specific questions

For each question, provide:
- The question text
- Category (behavioral, technical, situational, culture, other)
- STAR framework guidance (for behavioral questions)
- Why this question might be asked

Respond with ONLY valid JSON array in this format:
[
  {
    "questionText": "Question text here",
    "category": "behavioral|technical|situational|culture|other",
    "starFrameworkGuidance": "Guidance on using STAR method",
    "industrySpecific": true/false,
    "linkedSkills": ["skill1", "skill2"]
  }
]`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 2000,
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
        return JSON.parse(jsonMatch[0]);
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
   * Get fallback questions if AI is unavailable
   */
  getFallbackQuestions(roleTitle, industry, difficulty) {
    const baseQuestions = [
      {
        questionText:
          "Tell me about a time when you had to work under pressure. How did you handle it?",
        category: "behavioral",
        starFrameworkGuidance:
          "Situation: Set the context. Task: What was your responsibility? Action: What did you do? Result: What was the outcome?",
        industrySpecific: false,
        linkedSkills: ["time-management", "stress-management"],
      },
      {
        questionText:
          "Describe a situation where you had to work with a difficult team member. How did you resolve it?",
        category: "behavioral",
        starFrameworkGuidance:
          "Focus on collaboration, communication, and conflict resolution.",
        industrySpecific: false,
        linkedSkills: ["communication", "teamwork"],
      },
      {
        questionText:
          "What interests you most about this role and our company?",
        category: "culture",
        starFrameworkGuidance: "",
        industrySpecific: true,
        linkedSkills: [],
      },
      {
        questionText:
          "Where do you see yourself in 5 years?",
        category: "other",
        starFrameworkGuidance: "",
        industrySpecific: false,
        linkedSkills: [],
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
    return {
      id: row.id,
      jobId: row.job_id,
      questionText: row.question_text,
      category: row.category,
      difficultyLevel: row.difficulty_level,
      starFrameworkGuidance: row.star_framework_guidance,
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

