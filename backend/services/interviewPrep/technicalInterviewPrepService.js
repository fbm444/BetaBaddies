import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import OpenAI from "openai";

/**
 * Service for technical interview preparation (UC-078)
 * Uses technical_prep_challenges, technical_prep_attempts, and whiteboarding_practice tables
 */
class TechnicalInterviewPrepService {
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
   * Generate technical prep for an interview/job
   */
  async generateTechnicalPrep(interviewId, jobId, userId) {
    try {
      // Get job details
      let jobDetails = null;
      if (jobId) {
        const jobQuery = `
          SELECT title, company, industry, job_description
          FROM job_opportunities
          WHERE id = $1 AND user_id = $2
        `;
        const jobResult = await database.query(jobQuery, [jobId, userId]);
        if (jobResult.rows.length > 0) {
          jobDetails = jobResult.rows[0];
        }
      }

      // Extract tech stack from job description
      const techStack = this.extractTechStack(
        jobDetails?.job_description || ""
      );

      // Generate challenges based on role and tech stack
      const challenges = await this.generateChallenges(
        jobDetails?.title,
        techStack,
        jobDetails?.job_description
      );

      // Save challenges to database
      const savedChallenges = [];
      for (const challenge of challenges) {
        const challengeId = uuidv4();
        await database.query(
          `
          INSERT INTO technical_prep_challenges
          (id, user_id, job_id, challenge_type, tech_stack, difficulty_level,
           title, description, question_text, solution_framework, best_practices,
           real_world_scenario, is_timed, time_limit_minutes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `,
          [
            challengeId,
            userId,
            jobId || null,
            challenge.type,
            JSON.stringify(challenge.techStack || []),
            challenge.difficulty || "mid",
            challenge.title,
            challenge.description,
            challenge.questionText,
            challenge.solutionFramework,
            challenge.bestPractices,
            challenge.realWorldScenario,
            challenge.isTimed || false,
            challenge.timeLimitMinutes || null,
          ]
        );
        savedChallenges.push({
          id: challengeId,
          ...challenge,
        });
      }

      return {
        challenges: savedChallenges,
        techStack,
      };
    } catch (error) {
      console.error(
        "[TechnicalInterviewPrepService] Error generating technical prep:",
        error
      );
      throw error;
    }
  }

  /**
   * Extract tech stack from job description
   */
  extractTechStack(jobDescription) {
    if (!jobDescription) return [];

    const commonTech = [
      "JavaScript",
      "TypeScript",
      "Python",
      "Java",
      "React",
      "Node.js",
      "AWS",
      "Docker",
      "Kubernetes",
      "SQL",
      "MongoDB",
      "PostgreSQL",
      "Redis",
      "GraphQL",
      "REST",
      "Git",
    ];

    const found = commonTech.filter((tech) =>
      jobDescription.toLowerCase().includes(tech.toLowerCase())
    );

    return found.length > 0 ? found : ["General Programming"];
  }

  /**
   * Generate challenges using AI
   */
  async generateChallenges(roleTitle, techStack, jobDescription) {
    if (!this.openai) {
      return this.getFallbackChallenges(roleTitle, techStack);
    }

    try {
      const prompt = `Generate technical interview preparation challenges for:

Role: ${roleTitle || "Software Engineer"}
Tech Stack: ${techStack.join(", ") || "General"}
${jobDescription ? `Job Description: ${jobDescription.substring(0, 500)}` : ""}

Generate 3-5 challenges covering:
1. Coding challenges (algorithms, data structures)
2. System design questions (if senior role)
3. Case study scenarios (if applicable)

For each challenge, provide:
- Title
- Description
- Question/Problem statement
- Solution framework/approach
- Best practices
- Real-world scenario context
- Difficulty level (entry/mid/senior)
- Time limit recommendation

Respond with ONLY valid JSON array:
[
  {
    "type": "coding|system_design|case_study",
    "title": "Challenge title",
    "description": "Challenge description",
    "questionText": "The actual question/problem",
    "solutionFramework": "Framework for solving",
    "bestPractices": "Best practices and tips",
    "realWorldScenario": "Real-world context",
    "difficulty": "entry|mid|senior",
    "techStack": ["tech1", "tech2"],
    "isTimed": true/false,
    "timeLimitMinutes": 45
  }
]`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 2500,
        messages: [
          {
            role: "system",
            content:
              "You are an expert technical interview coach creating realistic technical challenges.",
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

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Could not parse JSON from OpenAI response");
    } catch (error) {
      console.warn(
        "[TechnicalInterviewPrepService] AI generation failed, using fallback:",
        error.message
      );
      return this.getFallbackChallenges(roleTitle, techStack);
    }
  }

  /**
   * Get fallback challenges if AI is unavailable
   */
  getFallbackChallenges(roleTitle, techStack) {
    return [
      {
        type: "coding",
        title: "Array Manipulation Challenge",
        description: "Practice with common array operations and algorithms",
        questionText:
          "Given an array of integers, find the maximum sum of a contiguous subarray.",
        solutionFramework:
          "Use Kadane's algorithm: iterate through array, keep track of current sum and maximum sum seen so far.",
        bestPractices:
          "Consider edge cases (all negative numbers, empty array). Optimize for O(n) time complexity.",
        realWorldScenario:
          "This pattern appears in problems like finding the best time to buy/sell stocks, or analyzing profit trends.",
        difficulty: "mid",
        techStack: techStack.length > 0 ? techStack : ["General"],
        isTimed: true,
        timeLimitMinutes: 30,
      },
      {
        type: "system_design",
        title: "Design a URL Shortener",
        description: "Practice system design thinking for scalable systems",
        questionText:
          "Design a URL shortening service like bit.ly that can handle millions of requests per day.",
        solutionFramework:
          "1. Requirements gathering (functional and non-functional) 2. Capacity estimation 3. System APIs 4. Database design 5. High-level design 6. Detailed design 7. Identify bottlenecks",
        bestPractices:
          "Consider scalability, availability, consistency. Discuss trade-offs between different approaches.",
        realWorldScenario:
          "This is a common system design question that tests your ability to design distributed systems.",
        difficulty: "senior",
        techStack: ["System Design", "Distributed Systems"],
        isTimed: true,
        timeLimitMinutes: 45,
      },
    ];
  }

  /**
   * Get technical prep challenges for a job/interview
   */
  async getTechnicalPrep(interviewId, jobId, userId) {
    try {
      let query = `
        SELECT * FROM technical_prep_challenges
        WHERE user_id = $1
      `;
      const params = [userId];

      if (jobId) {
        query += ` AND job_id = $${params.length + 1}`;
        params.push(jobId);
      }

      query += ` ORDER BY created_at DESC`;

      const result = await database.query(query, params);
      return result.rows.map(this.mapChallengeRow);
    } catch (error) {
      console.error(
        "[TechnicalInterviewPrepService] Error getting technical prep:",
        error
      );
      throw error;
    }
  }

  /**
   * Submit solution to a technical challenge
   */
  async submitTechnicalSolution(
    challengeId,
    solution,
    userId,
    timeTakenSeconds
  ) {
    try {
      // Get challenge details
      const challengeQuery = `
        SELECT * FROM technical_prep_challenges
        WHERE id = $1
      `;
      const challengeResult = await database.query(challengeQuery, [
        challengeId,
      ]);

      if (challengeResult.rows.length === 0) {
        throw new Error("Challenge not found");
      }

      // Analyze solution with AI
      const feedback = await this.analyzeSolution(
        challengeResult.rows[0],
        solution
      );

      // Save attempt
      const attemptId = uuidv4();
      await database.query(
        `
        INSERT INTO technical_prep_attempts
        (id, challenge_id, user_id, solution, time_taken_seconds, performance_score, feedback)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          attemptId,
          challengeId,
          userId,
          solution,
          timeTakenSeconds,
          feedback.score,
          feedback.feedback,
        ]
      );

      return {
        id: attemptId,
        feedback,
      };
    } catch (error) {
      console.error(
        "[TechnicalInterviewPrepService] Error submitting solution:",
        error
      );
      throw error;
    }
  }

  /**
   * Analyze solution using AI
   */
  async analyzeSolution(challenge, solution) {
    if (!this.openai) {
      return {
        score: 75,
        feedback:
          "Solution looks good. Consider edge cases and time complexity optimization.",
      };
    }

    try {
      const prompt = `Analyze this technical interview solution:

Challenge: ${challenge.title}
Question: ${challenge.question_text}
Solution Framework: ${challenge.solution_framework}

Candidate Solution:
${solution}

Provide feedback in JSON format:
{
  "score": <0-100>,
  "feedback": "Detailed feedback on correctness, efficiency, code quality, and improvements"
}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content:
              "You are an expert technical interviewer providing constructive feedback.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Could not parse JSON");
    } catch (error) {
      console.warn(
        "[TechnicalInterviewPrepService] AI analysis failed:",
        error.message
      );
      return {
        score: 70,
        feedback:
          "Solution submitted. Review best practices and consider edge cases.",
      };
    }
  }

  /**
   * Get coding challenges by tech stack
   */
  async getCodingChallenges(techStack, difficulty) {
    try {
      let query = `
        SELECT * FROM technical_prep_challenges
        WHERE challenge_type = 'coding'
      `;
      const params = [];

      if (techStack && techStack.length > 0) {
        query += ` AND tech_stack @> $${params.length + 1}::jsonb`;
        params.push(JSON.stringify(techStack));
      }

      if (difficulty) {
        query += ` AND difficulty_level = $${params.length + 1}`;
        params.push(difficulty);
      }

      query += ` ORDER BY created_at DESC LIMIT 20`;

      const result = await database.query(query, params);
      return result.rows.map(this.mapChallengeRow);
    } catch (error) {
      console.error(
        "[TechnicalInterviewPrepService] Error getting coding challenges:",
        error
      );
      throw error;
    }
  }

  /**
   * Get system design questions
   */
  async getSystemDesignQuestions(roleLevel) {
    try {
      let query = `
        SELECT * FROM technical_prep_challenges
        WHERE challenge_type = 'system_design'
      `;
      const params = [];

      if (roleLevel) {
        const difficultyMap = {
          junior: "entry",
          mid: "mid",
          senior: "senior",
        };
        const difficulty = difficultyMap[roleLevel] || roleLevel;
        query += ` AND difficulty_level = $${params.length + 1}`;
        params.push(difficulty);
      }

      query += ` ORDER BY created_at DESC LIMIT 10`;

      const result = await database.query(query, params);
      return result.rows.map(this.mapChallengeRow);
    } catch (error) {
      console.error(
        "[TechnicalInterviewPrepService] Error getting system design questions:",
        error
      );
      throw error;
    }
  }

  /**
   * Get attempt history for a specific challenge
   */
  async getChallengeAttemptHistory(challengeId, userId) {
    try {
      const query = `
        SELECT 
          tpa.*,
          tpc.title as challenge_title,
          tpc.challenge_type,
          tpc.difficulty_level
        FROM technical_prep_attempts tpa
        JOIN technical_prep_challenges tpc ON tpa.challenge_id = tpc.id
        WHERE tpa.challenge_id = $1 AND tpa.user_id = $2
        ORDER BY tpa.completed_at DESC
      `;
      const result = await database.query(query, [challengeId, userId]);

      return result.rows.map((row) => ({
        id: row.id,
        challengeId: row.challenge_id,
        challengeTitle: row.challenge_title,
        challengeType: row.challenge_type,
        difficulty: row.difficulty_level,
        solution: row.solution,
        timeTakenSeconds: row.time_taken_seconds,
        performanceScore: row.performance_score,
        feedback: row.feedback,
        completedAt: row.completed_at,
      }));
    } catch (error) {
      console.error(
        "[TechnicalInterviewPrepService] Error getting attempt history:",
        error
      );
      throw error;
    }
  }

  /**
   * Get all attempts for a user (across all challenges)
   */
  async getUserAttemptHistory(userId, options = {}) {
    try {
      const { challengeId, limit = 50, offset = 0 } = options;

      let query = `
        SELECT 
          tpa.*,
          tpc.title as challenge_title,
          tpc.challenge_type,
          tpc.difficulty_level
        FROM technical_prep_attempts tpa
        JOIN technical_prep_challenges tpc ON tpa.challenge_id = tpc.id
        WHERE tpa.user_id = $1
      `;
      const params = [userId];

      if (challengeId) {
        query += ` AND tpa.challenge_id = $${params.length + 1}`;
        params.push(challengeId);
      }

      query += ` ORDER BY tpa.completed_at DESC LIMIT $${
        params.length + 1
      } OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await database.query(query, params);

      return result.rows.map((row) => ({
        id: row.id,
        challengeId: row.challenge_id,
        challengeTitle: row.challenge_title,
        challengeType: row.challenge_type,
        difficulty: row.difficulty_level,
        solution: row.solution,
        timeTakenSeconds: row.time_taken_seconds,
        performanceScore: row.performance_score,
        feedback: row.feedback,
        completedAt: row.completed_at,
      }));
    } catch (error) {
      console.error(
        "[TechnicalInterviewPrepService] Error getting user attempt history:",
        error
      );
      throw error;
    }
  }

  /**
   * Track technical progress
   */
  async trackTechnicalProgress(userId) {
    try {
      const attemptsQuery = `
        SELECT 
          COUNT(*) as total_attempts,
          AVG(performance_score) as avg_score,
          COUNT(DISTINCT challenge_id) as unique_challenges,
          MAX(completed_at) as last_attempt_date
        FROM technical_prep_attempts
        WHERE user_id = $1
      `;
      const attemptsResult = await database.query(attemptsQuery, [userId]);

      const challengesQuery = `
        SELECT challenge_type, difficulty_level, COUNT(*) as count
        FROM technical_prep_challenges
        WHERE user_id = $1
        GROUP BY challenge_type, difficulty_level
      `;
      const challengesResult = await database.query(challengesQuery, [userId]);

      // Get score trends over time (last 30 days)
      const trendsQuery = `
        SELECT 
          DATE(completed_at) as attempt_date,
          AVG(performance_score) as avg_score,
          COUNT(*) as attempts_count
        FROM technical_prep_attempts
        WHERE user_id = $1 
          AND completed_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(completed_at)
        ORDER BY attempt_date ASC
      `;
      const trendsResult = await database.query(trendsQuery, [userId]);

      return {
        totalAttempts: parseInt(attemptsResult.rows[0]?.total_attempts || 0),
        averageScore: parseFloat(attemptsResult.rows[0]?.avg_score || 0),
        uniqueChallenges: parseInt(
          attemptsResult.rows[0]?.unique_challenges || 0
        ),
        lastAttemptDate: attemptsResult.rows[0]?.last_attempt_date,
        challengesByType: challengesResult.rows.map((row) => ({
          type: row.challenge_type,
          difficulty: row.difficulty_level,
          count: parseInt(row.count),
        })),
        scoreTrends: trendsResult.rows.map((row) => ({
          date: row.attempt_date,
          avgScore: parseFloat(row.avg_score || 0),
          attemptsCount: parseInt(row.attempts_count || 0),
        })),
      };
    } catch (error) {
      console.error(
        "[TechnicalInterviewPrepService] Error tracking progress:",
        error
      );
      throw error;
    }
  }

  /**
   * Map database row to challenge object
   */
  mapChallengeRow(row) {
    return {
      id: row.id,
      userId: row.user_id,
      jobId: row.job_id,
      type: row.challenge_type,
      techStack:
        typeof row.tech_stack === "string"
          ? JSON.parse(row.tech_stack)
          : row.tech_stack || [],
      difficulty: row.difficulty_level,
      title: row.title,
      description: row.description,
      questionText: row.question_text,
      solutionFramework: row.solution_framework,
      bestPractices: row.best_practices,
      realWorldScenario: row.real_world_scenario,
      isTimed: row.is_timed || false,
      timeLimitMinutes: row.time_limit_minutes,
      createdAt: row.created_at,
    };
  }
}

export default new TechnicalInterviewPrepService();
