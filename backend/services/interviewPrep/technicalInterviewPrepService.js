import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import OpenAI from "openai";
import axios from "axios";

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
           title, description, question_text, solution_code, solution_framework, best_practices,
           real_world_scenario, whiteboarding_techniques, is_timed, time_limit_minutes,
           performance_metrics)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
            challenge.solutionCode || null,
            challenge.solutionFramework,
            challenge.bestPractices,
            challenge.realWorldScenario,
            challenge.whiteboardingTechniques || null,
            challenge.isTimed || false,
            challenge.timeLimitMinutes || null,
            JSON.stringify(challenge.performanceMetrics || {}),
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
   * Check if role requires LeetCode-style questions
   */
  requiresLeetCodeStyle(roleTitle, jobDescription) {
    if (!roleTitle && !jobDescription) return false;

    const leetCodeRoles = [
      "software engineer",
      "software developer",
      "backend engineer",
      "frontend engineer",
      "full stack",
      "full-stack",
      "fullstack",
      "programmer",
      "developer",
      "engineer",
      "sde",
      "swe",
      "coding",
      "algorithm",
      "data structures",
    ];

    const text = `${roleTitle || ""} ${jobDescription || ""}`.toLowerCase();
    return leetCodeRoles.some((role) => text.includes(role));
  }

  /**
   * Detect if role requires case study practice (consulting, business, product roles)
   */
  requiresCaseStudy(roleTitle, jobDescription) {
    if (!roleTitle && !jobDescription) return false;

    const caseStudyRoles = [
      "consultant",
      "consulting",
      "business analyst",
      "product manager",
      "product owner",
      "strategy",
      "management",
      "operations",
      "analyst",
      "business development",
    ];

    const text = `${roleTitle || ""} ${jobDescription || ""}`.toLowerCase();
    return caseStudyRoles.some((role) => text.includes(role));
  }

  /**
   * Detect if role is senior level
   */
  isSeniorRole(roleTitle, jobDescription) {
    if (!roleTitle && !jobDescription) return false;

    const seniorIndicators = [
      "senior",
      "lead",
      "principal",
      "staff",
      "architect",
      "director",
      "manager",
      "5+ years",
      "7+ years",
      "10+ years",
    ];

    const text = `${roleTitle || ""} ${jobDescription || ""}`.toLowerCase();
    return seniorIndicators.some((indicator) => text.includes(indicator));
  }

  /**
   * Generate challenges using AI
   */
  async generateChallenges(roleTitle, techStack, jobDescription) {
    if (!this.openai) {
      return this.getFallbackChallenges(roleTitle, techStack);
    }

    const needsLeetCode = this.requiresLeetCodeStyle(roleTitle, jobDescription);
    const needsCaseStudy = this.requiresCaseStudy(roleTitle, jobDescription);
    const isSenior = this.isSeniorRole(roleTitle, jobDescription);

    try {
      const prompt = `Generate comprehensive technical interview preparation challenges for:

Role: ${roleTitle || "Software Engineer"}
Tech Stack: ${techStack.join(", ") || "General"}
${jobDescription ? `Job Description: ${jobDescription.substring(0, 2000)}` : ""}

REQUIREMENTS:
${
  needsLeetCode
    ? `✓ This role requires LeetCode-style coding questions. Generate 3-4 LeetCode-style algorithm/data structure problems.`
    : ""
}
${isSenior ? `✓ This is a SENIOR role. Include system design questions.` : ""}
${
  needsCaseStudy
    ? `✓ This role requires case study practice. Include business case scenarios.`
    : ""
}

Generate 5-8 comprehensive challenges covering:
1. ${
        needsLeetCode
          ? "LeetCode-style coding problems (algorithms, data structures) with function signatures, examples, and constraints"
          : "Coding challenges (algorithms, data structures) relevant to the tech stack"
      }
2. ${
        isSenior
          ? "System design questions (for senior positions) - include scalability, architecture, trade-offs"
          : "Technical questions based on job requirements"
      }
3. ${
        needsCaseStudy
          ? "Case study scenarios (for consulting/business roles) - include business problems, analysis frameworks, recommendations"
          : ""
      }
4. Real-world application scenarios connecting technical skills to practical use cases

${
  needsLeetCode
    ? `For LeetCode-style coding challenges, each must include:
- Function signature (e.g., "def twoSum(nums: List[int], target: int) -> List[int]:")
- Detailed problem statement with SPECIFIC requirements (e.g., "Given an array of integers, return the sum of all elements exceeding a specified threshold. If the sum exceeds a limit, return the limit instead.")
- Multiple examples (at least 2-3) with clear input/output pairs and explanations
- Detailed constraints (array size, value ranges, edge cases, etc.)
- Expected time and space complexity
- Common patterns/topics (arrays, strings, hash maps, two pointers, sliding window, etc.)

The problem statement should be VERY SPECIFIC and include:
- Exact input parameters and their types
- Specific conditions and rules (e.g., "if sum > limit, return limit")
- Edge cases to consider
- Format like this:

Problem:
Given an array of integers nums, a threshold value threshold, and a limit value limit, return the sum of all elements in nums that exceed threshold. However, if this sum exceeds limit, return limit instead.

Function Signature:
def sumExceedingThreshold(nums: List[int], threshold: int, limit: int) -> int:

Examples:
Example 1:
Input: nums = [1, 5, 3, 8, 2], threshold = 3, limit = 10
Output: 8
Explanation: Elements exceeding 3 are [5, 8]. Their sum is 13, but since 13 > 10, we return 10.

Example 2:
Input: nums = [2, 4, 6], threshold = 5, limit = 20
Output: 6
Explanation: Only 6 exceeds 5, so we return 6.

Constraints:
- 1 <= nums.length <= 10^4
- -10^4 <= nums[i] <= 10^4
- -10^4 <= threshold <= 10^4
- -10^4 <= limit <= 10^4`
    : ""
}

For each challenge, provide:
- Title
- Description
- Question/Problem statement${
        needsLeetCode ? " (with function signature, examples, constraints)" : ""
      }${isSenior && needsLeetCode ? "" : ""}
- Solution code (actual working code solution in Python, with clear comments explaining the approach)
- Solution framework/approach (detailed step-by-step approach, algorithms, data structures, design patterns)
- Best practices (coding standards, optimization techniques, common pitfalls, edge cases)
- Real-world scenario context (how this applies in production, similar problems in industry)
- Whiteboarding techniques (if applicable - how to approach on a whiteboard, visualization tips)
- Difficulty level (entry/mid/senior)
- Time limit recommendation
- Performance tracking metrics (what to measure: time complexity, space complexity, code quality, test coverage)

${
  isSenior
    ? `For SYSTEM DESIGN questions, include:
- Requirements gathering (functional and non-functional)
- Capacity estimation and constraints
- System API design
- Database schema design
- High-level architecture diagram description
- Detailed component design
- Scalability and reliability considerations
- Trade-offs and alternatives
- Monitoring and observability`
    : ""
}

${
  needsCaseStudy
    ? `For CASE STUDY questions, include:
- Business problem statement
- Key stakeholders and constraints
- Analysis framework (e.g., SWOT, Porter's Five Forces, McKinsey 7S)
- Data requirements and assumptions
- Solution approach and methodology
- Expected outcomes and recommendations
- Risk assessment
- Implementation considerations`
    : ""
}

Respond with ONLY valid JSON array:
[
  {
    "type": "coding|system_design|case_study|whiteboarding",
    "title": "Challenge title",
    "description": "Challenge description",
    "questionText": "${
      needsLeetCode
        ? "The problem statement with function signature, examples, and constraints formatted like LeetCode"
        : "The actual question/problem"
    }",
    "solutionCode": "${
      needsLeetCode || challenge.type === "coding"
        ? "Complete working Python solution with comments. Include proper function signature, handle edge cases, and explain the approach in comments."
        : challenge.type === "system_design"
        ? "Detailed system design description with architecture components, data flow, and key design decisions"
        : challenge.type === "case_study"
        ? "Structured case study analysis with framework application, recommendations, and implementation plan"
        : "Solution approach and implementation details"
    }",
    "solutionFramework": "Detailed framework for solving${
      needsLeetCode
        ? " (include time/space complexity analysis, algorithm choice rationale)"
        : ""
    }${
        isSenior
          ? " (for system design: architecture approach, component breakdown)"
          : ""
      }${
        needsCaseStudy
          ? " (for case study: analysis framework, methodology)"
          : ""
      }",
    "bestPractices": "Comprehensive best practices: ${
      needsLeetCode
        ? "coding patterns, optimization techniques, edge cases, test-driven development"
        : ""
    }${
        isSenior
          ? "system design principles, scalability patterns, trade-off analysis"
          : ""
      }${
        needsCaseStudy
          ? "case analysis methodology, stakeholder communication, structured thinking"
          : ""
      }",
    "realWorldScenario": "Detailed real-world context: how this challenge appears in production systems, similar problems in industry, practical applications",
    "whiteboardingTechniques": "${
      needsLeetCode || isSenior
        ? "How to approach on whiteboard: visualization tips, step-by-step drawing approach, communication strategies"
        : ""
    }",
    "difficulty": "entry|mid|senior",
    "techStack": ["tech1", "tech2"],
    "isTimed": true,
    "timeLimitMinutes": ${
      needsLeetCode
        ? "30-45"
        : isSenior
        ? "45-60"
        : needsCaseStudy
        ? "60-90"
        : "45"
    },
    "performanceMetrics": {
      "timeComplexity": "Expected time complexity",
      "spaceComplexity": "Expected space complexity",
      "codeQuality": "Code quality standards to meet",
      "testCoverage": "Test coverage expectations"
    }
  }
]`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 4000,
        messages: [
          {
            role: "system",
            content:
              "You are an expert technical interview coach creating comprehensive, realistic technical challenges. Generate detailed challenges that cover coding, system design, case studies, and whiteboarding techniques. Always connect technical skills to real-world applications and provide thorough solution frameworks.",
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
    const needsLeetCode = this.requiresLeetCodeStyle(roleTitle, "");

    const challenges = [];

    if (needsLeetCode) {
      challenges.push({
        type: "coding",
        title: "Two Sum",
        description: "LeetCode-style array problem",
        questionText: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]

Example 3:
Input: nums = [3,3], target = 6
Output: [0,1]

Constraints:
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.

Function signature:
def twoSum(nums: List[int], target: int) -> List[int]:`,
        solutionCode: `def twoSum(nums, target):
    """
    Find two numbers that add up to target.
    Time Complexity: O(n)
    Space Complexity: O(n)
    """
    # Use hash map to store seen numbers and their indices
    seen = {}
    
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    
    return []  # No solution found`,
        solutionFramework:
          "Use a hash map to store seen numbers and their indices. For each number, check if (target - current number) exists in the map. Time: O(n), Space: O(n)",
        bestPractices:
          "Use hash map for O(1) lookups. Consider edge cases (duplicates, negative numbers). This is a classic hash map pattern.",
        realWorldScenario:
          "This pattern appears in problems involving pairs, complements, or finding relationships between elements.",
        difficulty: "entry",
        techStack: techStack.length > 0 ? techStack : ["Python", "Algorithms"],
        isTimed: true,
        timeLimitMinutes: 30,
      });

      challenges.push({
        type: "coding",
        title: "Maximum Subarray (Kadane's Algorithm)",
        description: "LeetCode-style dynamic programming problem",
        questionText: `Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

A subarray is a contiguous part of an array.

Example 1:
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: [4,-1,2,1] has the largest sum = 6.

Example 2:
Input: nums = [1]
Output: 1

Example 3:
Input: nums = [5,4,-1,7,8]
Output: 23

Constraints:
- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4

Function signature:
def maxSubArray(nums: List[int]) -> int:`,
        solutionCode: `def maxSubArray(nums):
    """
    Find the maximum sum of a contiguous subarray using Kadane's algorithm.
    Time Complexity: O(n)
    Space Complexity: O(1)
    """
    if not nums:
        return 0
    
    max_sum = current_sum = nums[0]
    
    for num in nums[1:]:
        # Either extend the current subarray or start a new one
        current_sum = max(num, current_sum + num)
        max_sum = max(max_sum, current_sum)
    
    return max_sum`,
        solutionFramework:
          "Kadane's algorithm: iterate through array, keep track of current sum and maximum sum seen so far. If current sum becomes negative, reset it. Time: O(n), Space: O(1)",
        bestPractices:
          "Consider edge cases (all negative numbers, single element). Optimize for O(n) time and O(1) space. This is a classic dynamic programming pattern.",
        realWorldScenario:
          "This pattern appears in problems like finding the best time to buy/sell stocks, or analyzing profit trends over time.",
        difficulty: "mid",
        techStack:
          techStack.length > 0
            ? techStack
            : ["Python", "Algorithms", "Dynamic Programming"],
        isTimed: true,
        timeLimitMinutes: 35,
      });
    } else {
      challenges.push({
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
      });
    }

    challenges.push({
      type: "system_design",
      title: "Design a URL Shortener",
      description: "Practice system design thinking for scalable systems",
      questionText:
        "Design a URL shortening service like bit.ly that can handle millions of requests per day. Consider: read/write ratio, scalability, availability, consistency requirements, and database design.",
      solutionFramework:
        "1. Requirements gathering (functional: shorten URL, redirect URL; non-functional: high availability, low latency) 2. Capacity estimation (QPS, storage) 3. System APIs (POST /shorten, GET /redirect) 4. Database design (URL mapping, analytics) 5. High-level design (load balancer, application servers, database) 6. Detailed design (hashing algorithm, caching strategy) 7. Identify bottlenecks and solutions",
      bestPractices:
        "Consider scalability (horizontal scaling), availability (replication, failover), consistency (eventual vs strong), caching strategy (Redis), database sharding. Discuss trade-offs between different approaches.",
      realWorldScenario:
        "This is a common system design question that tests your ability to design distributed systems. Similar patterns apply to designing Twitter, Instagram, or any high-traffic service.",
      whiteboardingTechniques:
        "Start with requirements, then draw high-level architecture (client, load balancer, app servers, database). Show data flow, add caching layer, discuss scaling strategies. Use clear boxes and arrows, label components.",
      difficulty: "senior",
      techStack: ["System Design", "Distributed Systems", "Caching"],
      isTimed: true,
      timeLimitMinutes: 60,
      performanceMetrics: {
        timeComplexity: "O(1) for URL lookup",
        spaceComplexity: "O(n) where n is number of URLs",
        codeQuality: "Modular, scalable architecture",
        testCoverage: "Unit tests for hashing, integration tests for API",
      },
    });

    // Add case study example if needed
    if (this.requiresCaseStudy(roleTitle, "")) {
      challenges.push({
        type: "case_study",
        title: "E-commerce Growth Strategy",
        description: "Business case study for consulting/product roles",
        questionText:
          "A mid-size e-commerce company wants to double its revenue in 12 months. They currently have 1M active users, $50M annual revenue, and operate in 3 countries. Analyze the situation and provide recommendations.",
        solutionFramework:
          "1. Problem definition and scope 2. Stakeholder analysis 3. Data gathering (current metrics, market analysis) 4. Framework application (SWOT, Porter's Five Forces) 5. Solution identification (market expansion, product diversification, customer retention) 6. Implementation plan 7. Risk assessment",
        bestPractices:
          "Structure your thinking: clarify assumptions, ask clarifying questions, use frameworks systematically, quantify recommendations, consider trade-offs, present clear action items.",
        realWorldScenario:
          "This mirrors real consulting engagements where you analyze business problems, identify opportunities, and provide actionable recommendations.",
        whiteboardingTechniques:
          "Draw frameworks on whiteboard: SWOT matrix, customer journey map, revenue breakdown. Use structured approach: problem → analysis → solutions → implementation.",
        difficulty: "mid",
        techStack: ["Business Analysis", "Strategy"],
        isTimed: true,
        timeLimitMinutes: 90,
        performanceMetrics: {
          timeComplexity: "N/A",
          spaceComplexity: "N/A",
          codeQuality:
            "Clear structure, logical flow, actionable recommendations",
          testCoverage:
            "Validate assumptions, test recommendations with stakeholders",
        },
      });
    }

    return challenges;
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
   * Run code and test against test cases
   */
  async runCode(challengeId, solution, language, userId) {
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

      const challenge = challengeResult.rows[0];

      // Extract test cases from question text (LeetCode format)
      const testCases = this.extractTestCases(challenge.question_text);

      // Execute code against test cases using Piston API
      const results = await this.validateCode(
        solution,
        language,
        testCases,
        challenge
      );

      return {
        success: true,
        testResults: results,
        message: results.every((r) => r.passed)
          ? "All test cases passed!"
          : `${results.filter((r) => r.passed).length}/${
              results.length
            } test cases passed`,
      };
    } catch (error) {
      console.error(
        "[TechnicalInterviewPrepService] Error running code:",
        error
      );
      throw error;
    }
  }

  /**
   * Execute code once with a single input (for "Run Code" button)
   */
  async executeCodeOnce(challengeId, solution, language, input, userId) {
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

      // For JavaScript, return message to use client-side execution
      if (language === "javascript") {
        return {
          success: false,
          output: null,
          error: "JavaScript should be executed client-side in the browser",
        };
      }

      // Prepare input
      const inputStr =
        typeof input === "object" ? JSON.stringify(input) : String(input || "");

      // Wrap Python code to handle stdin/stdout properly
      let codeToExecute = solution;
      if (language === "python") {
        codeToExecute = this.wrapPythonCode(solution, inputStr);
      }

      // Execute code with Piston
      const executionResult = await this.executeCodeWithPiston(
        codeToExecute,
        language,
        inputStr
      );

      // Parse output - handle empty strings and JSON parsing
      let output = executionResult.output;

      // If output is empty or whitespace, keep it as is
      if (output && output.trim()) {
        try {
          // Try to parse as JSON first
          const parsed = JSON.parse(output.trim());
          output = parsed;
        } catch {
          // If not JSON, use the trimmed string
          output = output.trim();
        }
      } else {
        // Empty output - set to empty string explicitly
        output = output || "";
      }

      return {
        success: executionResult.exitCode === 0,
        output: output,
        error: executionResult.error || null,
        rawOutput: executionResult.output || "",
      };
    } catch (error) {
      console.error(
        "[TechnicalInterviewPrepService] Error executing code:",
        error
      );
      throw error;
    }
  }

  /**
   * Extract test cases from LeetCode-style problem statement
   */
  extractTestCases(questionText) {
    const testCases = [];
    if (!questionText) return testCases;

    // Look for Example patterns
    const exampleRegex =
      /Example\s+(\d+):\s*\nInput:\s*([^\n]+)\nOutput:\s*([^\n]+)/gi;
    let match;
    while ((match = exampleRegex.exec(questionText)) !== null) {
      try {
        const input = match[2].trim();
        const output = match[3].trim();
        testCases.push({
          input: this.parseInput(input),
          expectedOutput: this.parseOutput(output),
          exampleNumber: parseInt(match[1]),
        });
      } catch (e) {
        console.warn("Failed to parse test case:", e);
      }
    }

    return testCases;
  }

  /**
   * Parse input string to actual values
   */
  parseInput(inputStr) {
    // Remove common prefixes
    inputStr = inputStr.replace(/^(nums|target|s|str)\s*=\s*/i, "").trim();

    // Try to parse as JSON
    try {
      return JSON.parse(inputStr);
    } catch {
      // If not JSON, return as string
      return inputStr;
    }
  }

  /**
   * Parse output string to actual values
   */
  parseOutput(outputStr) {
    try {
      return JSON.parse(outputStr);
    } catch {
      return outputStr;
    }
  }

  /**
   * Wrap Python code to handle stdin input and stdout output
   */
  wrapPythonCode(userCode, inputStr) {
    // Check if code already handles stdin/stdout
    const hasStdin =
      userCode.includes("sys.stdin") || userCode.includes("input(");
    const hasPrint = userCode.includes("print(");

    // If code already handles I/O, return as-is
    if (hasStdin && hasPrint) {
      return userCode;
    }

    // Try to extract function name from code
    const functionMatch = userCode.match(/def\s+(\w+)\s*\(/);
    const classMatch = userCode.match(
      /class\s+Solution[:\s]*\n.*?def\s+(\w+)\s*\(/s
    );
    const functionName = classMatch
      ? classMatch[1]
      : functionMatch
      ? functionMatch[1]
      : null;

    // Simple wrapper that reads stdin and executes the code
    let wrappedCode = `import sys
import json

${userCode}

# Read input from stdin
try:
    input_data = sys.stdin.read().strip()
    if input_data:
        try:
            parsed_input = json.loads(input_data)
            if isinstance(parsed_input, list):
                args = parsed_input
            elif isinstance(parsed_input, dict) and len(parsed_input) == 1:
                args = [list(parsed_input.values())[0]]
            else:
                args = [parsed_input]
        except:
            args = [input_data]
    else:
        args = []
except:
    args = []
    
`;

    if (functionName) {
      if (userCode.includes("class Solution")) {
        wrappedCode += `
# Call the solution function
solution = Solution()
result = solution.${functionName}(*args)
print(json.dumps(result) if result is not None else "")
`;
      } else {
        wrappedCode += `
# Call the function
result = ${functionName}(*args)
print(json.dumps(result) if result is not None else "")
`;
      }
    } else {
      // No function found, user code should print its own output
      wrappedCode += `
# Execute user code - it should print its own output
# If no output, show input received
if not args:
    print("No input provided")
`;
    }

    return wrappedCode;
  }

  /**
   * Execute code using Piston API (free code execution service)
   */
  async executeCodeWithPiston(code, language, stdin = "") {
    try {
      const languageMap = {
        python: "python3",
        javascript: "javascript",
        java: "java",
        cpp: "cpp",
        c: "c",
      };

      const pistonLanguage =
        languageMap[language.toLowerCase()] || language.toLowerCase();

      // Piston API endpoint
      const pistonUrl = "https://emkc.org/api/v2/piston/execute";

      const response = await axios.post(
        pistonUrl,
        {
          language: pistonLanguage,
          version: "*", // Use latest version
          files: [
            {
              content: code,
            },
          ],
          stdin: typeof stdin === "string" ? stdin : JSON.stringify(stdin),
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data;

      // Piston API returns output in result.run.output or result.run.stdout
      // stderr is for errors, but sometimes output goes to stderr too
      const stdout = result.run?.stdout || "";
      const stderr = result.run?.stderr || "";
      const output = result.run?.output || stdout || stderr || "";

      // Log for debugging
      console.log("[Piston API Response]", {
        stdout,
        stderr,
        output,
        code: result.run?.code,
        fullResult: JSON.stringify(result, null, 2).substring(0, 500),
      });

      return {
        output: output,
        error: result.run?.code !== 0 ? stderr || "Execution failed" : null,
        exitCode: result.run?.code || 0,
        executionTime: null, // Piston doesn't provide execution time
      };
    } catch (error) {
      console.error("[TechnicalInterviewPrepService] Piston API error:", error);
      throw new Error(`Code execution failed: ${error.message}`);
    }
  }

  /**
   * Execute code against test cases
   * For JavaScript, this should be done client-side
   * For other languages, use Piston API
   */
  async validateCode(solution, language, testCases, challenge) {
    if (testCases.length === 0) {
      return [
        {
          testCase: 1,
          input: "No test cases found",
          expectedOutput: "N/A",
          actualOutput: "N/A",
          passed: false,
          error: "No test cases available for this problem",
        },
      ];
    }

    // For JavaScript, this should be handled client-side
    if (language === "javascript") {
      return testCases.map((testCase, idx) => ({
        testCase: idx + 1,
        input: JSON.stringify(testCase.input),
        expectedOutput: JSON.stringify(testCase.expectedOutput),
        actualOutput: "Please use JavaScript execution in browser",
        passed: false,
        error:
          "JavaScript code should be executed client-side. Please ensure you're using the browser execution.",
        executionTime: null,
      }));
    }

    // For Python, Java, C++, use Piston API
    const results = [];

    for (let idx = 0; idx < testCases.length; idx++) {
      const testCase = testCases[idx];
      try {
        // Prepare input for the code
        const inputStr =
          typeof testCase.input === "object"
            ? JSON.stringify(testCase.input)
            : String(testCase.input);

        // Execute code with Piston
        const executionResult = await this.executeCodeWithPiston(
          solution,
          language,
          inputStr
        );

        // Parse output
        let actualOutput;
        try {
          actualOutput = JSON.parse(executionResult.output.trim());
        } catch {
          actualOutput = executionResult.output.trim();
        }

        // Compare with expected output
        const passed = this.compareOutputs(
          actualOutput,
          testCase.expectedOutput
        );

        results.push({
          testCase: idx + 1,
          input: JSON.stringify(testCase.input),
          expectedOutput: JSON.stringify(testCase.expectedOutput),
          actualOutput: JSON.stringify(actualOutput),
          passed,
          error: executionResult.error || null,
          executionTime: null,
        });
      } catch (error) {
        results.push({
          testCase: idx + 1,
          input: JSON.stringify(testCase.input),
          expectedOutput: JSON.stringify(testCase.expectedOutput),
          actualOutput: "N/A",
          passed: false,
          error: error.message || "Execution failed",
          executionTime: null,
        });
      }
    }

    return results;
  }

  /**
   * Compare actual output with expected output
   */
  compareOutputs(actual, expected) {
    // Deep equality check
    if (actual === expected) return true;

    // Try JSON comparison for objects/arrays
    try {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      return actualStr === expectedStr;
    } catch {
      // Fallback to string comparison
      return String(actual) === String(expected);
    }
  }

  /**
   * Get expected function format for a language
   */
  getExpectedFormat(language) {
    const formats = {
      python: "def functionName(params):",
      java: "public class Solution { public returnType methodName(params) {} }",
      cpp: "class Solution { public: returnType methodName(params) {} };",
      javascript:
        "function functionName(params) {} or const functionName = (params) => {}",
    };
    return formats[language] || "function declaration";
  }

  /**
   * Submit solution to a technical challenge
   */
  async submitTechnicalSolution(
    challengeId,
    solution,
    userId,
    timeTakenSeconds,
    testResults = null
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

      // Analyze solution with AI (including test results)
      const feedback = await this.analyzeSolution(
        challengeResult.rows[0],
        solution,
        testResults
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
  async analyzeSolution(challenge, solution, testResults = null) {
    if (!this.openai) {
      return {
        score: 75,
        feedback:
          "Solution looks good. Consider edge cases and time complexity optimization.",
      };
    }

    try {
      // Build test results summary for AI
      let testResultsSummary = "";
      if (testResults && testResults.testResults) {
        const passed = testResults.testResults.filter((r) => r.passed).length;
        const total = testResults.testResults.length;
        testResultsSummary = `\n\nTest Execution Results:
- Tests Passed: ${passed}/${total}
- Success Rate: ${((passed / total) * 100).toFixed(1)}%
${testResults.testResults
  .map(
    (r, idx) => `
Test Case ${idx + 1}: ${r.passed ? "PASSED" : "FAILED"}
  Input: ${r.input}
  Expected: ${r.expectedOutput}
  Actual: ${r.actualOutput}
  ${r.error ? `Error: ${r.error}` : ""}`
  )
  .join("")}`;
      }

      const prompt = `Analyze this technical interview solution:

Challenge: ${challenge.title}
Question: ${challenge.question_text}
Solution Framework: ${challenge.solution_framework || "Not provided"}

Candidate Solution:
${solution}
${testResultsSummary}

Provide comprehensive feedback in JSON format:
{
  "score": <0-100>,
  "feedback": "Detailed markdown-formatted feedback covering:
  - **Correctness**: Does the solution work correctly? ${
    testResults ? "Reference the test results." : ""
  }
  - **Efficiency**: Time and space complexity analysis
  - **Code Quality**: Readability, maintainability, best practices
  - **Edge Cases**: Are edge cases handled?
  - **Improvements**: Specific suggestions for improvement
  - **Strengths**: What the candidate did well
  - **Next Steps**: What to focus on for improvement
  
  Format the feedback using markdown for better readability (use headers, bullet points, code blocks, etc.)."
}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content:
              "You are an expert technical interviewer providing detailed, constructive feedback. Provide comprehensive analysis covering correctness, efficiency, code quality, edge cases, and specific improvement suggestions.",
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
   * Get whiteboarding techniques and tips
   */
  async getWhiteboardingTechniques(challengeType = "coding") {
    const techniques = {
      coding: {
        general: [
          "Start by clarifying the problem - ask questions about edge cases, constraints, and expected behavior",
          "Think out loud - explain your thought process as you work",
          "Start with a brute force solution, then optimize",
          "Draw examples on the board to visualize the problem",
          "Use clear variable names and write readable code",
          "Test your solution with edge cases before declaring it complete",
        ],
        visualization: [
          "Draw arrays/lists horizontally with indices labeled",
          "Use arrows to show pointers or traversal",
          "Draw trees/graphs with clear node labels",
          "Show state changes step-by-step for dynamic programming",
          "Use different colors for different data structures if available",
        ],
        communication: [
          "Explain your approach before coding",
          "Discuss time/space complexity as you go",
          "Mention alternative approaches and trade-offs",
          "Ask for feedback if you're unsure about direction",
          "Stay calm and organized even if you make mistakes",
        ],
      },
      system_design: {
        general: [
          "Start with requirements gathering - functional and non-functional",
          "Estimate capacity and constraints early",
          "Draw high-level architecture first, then drill down",
          "Label all components clearly",
          "Show data flow with arrows",
          "Discuss trade-offs for each design decision",
        ],
        visualization: [
          "Use boxes for services/components",
          "Use arrows for data flow and communication",
          "Show load balancers, databases, caches clearly",
          "Draw user → system → database flow",
          "Add replication and failover mechanisms visually",
        ],
        communication: [
          "Walk through a request end-to-end",
          "Explain scaling strategies",
          "Discuss failure scenarios and handling",
          "Compare different approaches",
          "Be ready to dive deep into any component",
        ],
      },
      case_study: {
        general: [
          "Structure your thinking with frameworks (SWOT, Porter's Five Forces, etc.)",
          "Ask clarifying questions about the business problem",
          "Break down the problem into smaller parts",
          "Use data to support your recommendations",
          "Consider multiple stakeholders' perspectives",
          "Present clear, actionable recommendations",
        ],
        visualization: [
          "Draw frameworks on the board (SWOT matrix, customer journey)",
          "Use charts/graphs to show data analysis",
          "Create decision trees for complex scenarios",
          "Map out implementation timelines",
          "Show relationships between different factors",
        ],
        communication: [
          "Restate the problem to ensure understanding",
          "Present your analysis framework first",
          "Walk through your reasoning step-by-step",
          "Quantify recommendations where possible",
          "Discuss risks and mitigation strategies",
        ],
      },
    };

    return techniques[challengeType] || techniques.coding;
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

      // Get performance by challenge type
      const typePerformanceQuery = `
        SELECT 
          tpc.challenge_type,
          AVG(tpa.performance_score) as avg_score,
          COUNT(*) as attempts,
          AVG(tpa.time_taken_seconds) as avg_time_seconds
        FROM technical_prep_attempts tpa
        JOIN technical_prep_challenges tpc ON tpa.challenge_id = tpc.id
        WHERE tpa.user_id = $1
        GROUP BY tpc.challenge_type
      `;
      const typePerformanceResult = await database.query(typePerformanceQuery, [
        userId,
      ]);

      // Get performance by difficulty
      const difficultyPerformanceQuery = `
        SELECT 
          tpc.difficulty_level,
          AVG(tpa.performance_score) as avg_score,
          COUNT(*) as attempts
        FROM technical_prep_attempts tpa
        JOIN technical_prep_challenges tpc ON tpa.challenge_id = tpc.id
        WHERE tpa.user_id = $1
        GROUP BY tpc.difficulty_level
      `;
      const difficultyPerformanceResult = await database.query(
        difficultyPerformanceQuery,
        [userId]
      );

      // Get improvement over time (comparing first half vs second half of attempts)
      const improvementQuery = `
        WITH ranked_attempts AS (
          SELECT 
            tpa.*,
            ROW_NUMBER() OVER (ORDER BY tpa.completed_at) as attempt_num,
            COUNT(*) OVER () as total_attempts
          FROM technical_prep_attempts tpa
          WHERE tpa.user_id = $1
        )
        SELECT 
          CASE 
            WHEN attempt_num <= total_attempts / 2 THEN 'first_half'
            ELSE 'second_half'
          END as period,
          AVG(performance_score) as avg_score,
          AVG(time_taken_seconds) as avg_time
        FROM ranked_attempts
        GROUP BY period
      `;
      const improvementResult = await database.query(improvementQuery, [
        userId,
      ]);

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
        performanceByType: typePerformanceResult.rows.map((row) => ({
          type: row.challenge_type,
          avgScore: parseFloat(row.avg_score || 0),
          attempts: parseInt(row.attempts || 0),
          avgTimeSeconds: parseFloat(row.avg_time_seconds || 0),
        })),
        performanceByDifficulty: difficultyPerformanceResult.rows.map(
          (row) => ({
            difficulty: row.difficulty_level,
            avgScore: parseFloat(row.avg_score || 0),
            attempts: parseInt(row.attempts || 0),
          })
        ),
        improvement: improvementResult.rows.reduce((acc, row) => {
          acc[row.period] = {
            avgScore: parseFloat(row.avg_score || 0),
            avgTime: parseFloat(row.avg_time || 0),
          };
          return acc;
        }, {}),
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
      solutionCode: row.solution_code,
      solutionFramework: row.solution_framework,
      bestPractices: row.best_practices,
      realWorldScenario: row.real_world_scenario,
      whiteboardingTechniques: row.whiteboarding_techniques,
      isTimed: row.is_timed || false,
      timeLimitMinutes: row.time_limit_minutes,
      performanceMetrics:
        typeof row.performance_metrics === "string"
          ? JSON.parse(row.performance_metrics)
          : row.performance_metrics || {},
      createdAt: row.created_at,
    };
  }
}

export default new TechnicalInterviewPrepService();
