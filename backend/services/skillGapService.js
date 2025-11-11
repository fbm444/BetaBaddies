import { v4 as uuidv4 } from "uuid";
import resumeAIAssistantService from "./resumes/aiService.js";
import {
  learningResourcesCatalog,
  skillSynonyms,
} from "../data/learningResources.js";
import jobImportService from "./jobImportService.js";

/**
 * Map textual proficiency labels to numeric scale.
 */
const PROFICIENCY_SCALE = {
  none: 0,
  beginner: 1,
  novice: 1,
  intermediate: 2,
  proficient: 3,
  advanced: 3,
  expert: 4,
  master: 5,
};

const DEFAULT_REQUIRED_LEVEL = 3;
const MINIMUM_REQUIRED_SKILLS = 4;
const FALLBACK_REQUIREMENTS = [
  {
    matchers: [/frontend/i, /react/i, /ui/i],
    skills: [
      { skillName: "React", importance: "high", requiredLevel: 3 },
      { skillName: "TypeScript", importance: "high", requiredLevel: 3 },
      { skillName: "CSS", importance: "medium", requiredLevel: 2 },
      {
        skillName: "Automated Testing",
        importance: "medium",
        requiredLevel: 3,
      },
      { skillName: "Accessibility", importance: "medium", requiredLevel: 2 },
    ],
  },
  {
    matchers: [/full\s*stack/i, /backend/i, /node/i],
    skills: [
      { skillName: "Node.js", importance: "high", requiredLevel: 3 },
      { skillName: "Express", importance: "medium", requiredLevel: 3 },
      { skillName: "SQL", importance: "high", requiredLevel: 3 },
      { skillName: "API Design", importance: "high", requiredLevel: 3 },
      {
        skillName: "Cloud Architecture",
        importance: "medium",
        requiredLevel: 3,
      },
    ],
  },
  {
    matchers: [/data/i, /analytics/i, /ml/i, /machine learning/i],
    skills: [
      { skillName: "Python", importance: "high", requiredLevel: 3 },
      { skillName: "SQL", importance: "high", requiredLevel: 3 },
      {
        skillName: "Data Visualization",
        importance: "medium",
        requiredLevel: 3,
      },
      { skillName: "Machine Learning", importance: "medium", requiredLevel: 3 },
      { skillName: "Statistics", importance: "medium", requiredLevel: 3 },
    ],
  },
  {
    matchers: [/product/i, /manager/i],
    skills: [
      { skillName: "Product Strategy", importance: "high", requiredLevel: 3 },
      {
        skillName: "Stakeholder Management",
        importance: "medium",
        requiredLevel: 3,
      },
      { skillName: "Roadmapping", importance: "medium", requiredLevel: 3 },
      { skillName: "Experimentation", importance: "medium", requiredLevel: 2 },
      { skillName: "Analytics", importance: "medium", requiredLevel: 2 },
    ],
  },
];
const GENERIC_FALLBACK_SKILLS = [
  { skillName: "Communication", importance: "medium", requiredLevel: 3 },
  { skillName: "Collaboration", importance: "medium", requiredLevel: 3 },
  { skillName: "Problem Solving", importance: "high", requiredLevel: 3 },
  { skillName: "Time Management", importance: "medium", requiredLevel: 2 },
];

const IMPORTANCE_WEIGHTS = {
  critical: 3,
  high: 2,
  medium: 1.5,
  low: 1,
};

/**
 * Normalize skill names to aid comparison.
 */
function normalizeSkillName(name = "") {
  return name.trim().toLowerCase();
}

function extractKeywords(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+\-# ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function buildTokenSet(...segments) {
  const words = segments.flatMap((segment) => extractKeywords(segment || ""));
  const set = new Set(words);

  for (let i = 0; i < words.length - 1; i += 1) {
    set.add(`${words[i]} ${words[i + 1]}`);
  }
  for (let i = 0; i < words.length - 2; i += 1) {
    set.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return { words, tokens: set };
}

function selectFallbackRequirements(job) {
  const title = (job.title || "").toLowerCase();
  const industry = (job.industry || job.jobType || "").toLowerCase();

  for (const fallback of FALLBACK_REQUIREMENTS) {
    const matches = fallback.matchers.some(
      (matcher) => matcher.test(title) || matcher.test(industry)
    );
    if (matches) {
      return fallback.skills;
    }
  }

  return GENERIC_FALLBACK_SKILLS;
}

/**
 * Heuristic requirement extraction fallback.
 * Enhanced with better pattern matching and skill detection.
 */
function heuristicallyExtractRequirements(job, knownSkills) {
  // The jobOpportunityService returns 'description' field, not 'jobDescription'
  const description = (
    job.description ||
    job.jobDescription ||
    job.job_description ||
    ""
  ).toLowerCase();
  const title = (job.title || "").toLowerCase();
  const industry = (job.industry || job.jobType || "").toLowerCase();

  const { tokens } = buildTokenSet(description, title, industry, job.jobType);
  const requirements = new Map();

  // Common skill patterns to detect
  const skillPatterns = {
    // Programming Languages
    javascript: ["javascript", "js", "ecmascript", "es6", "es2015"],
    typescript: ["typescript", "ts"],
    python: ["python", "py"],
    java: ["java"],
    "c++": ["c++", "cpp", "c plus plus"],
    "c#": ["c#", "csharp", "c sharp"],
    go: ["go", "golang"],
    rust: ["rust"],
    php: ["php"],
    ruby: ["ruby"],
    swift: ["swift"],
    kotlin: ["kotlin"],

    // Frontend Frameworks
    react: ["react", "reactjs", "react.js"],
    vue: ["vue", "vuejs", "vue.js"],
    angular: ["angular", "angularjs"],
    svelte: ["svelte"],

    // Backend Frameworks
    "node.js": ["node", "nodejs", "node.js"],
    express: ["express", "expressjs", "express.js"],
    django: ["django"],
    flask: ["flask"],
    spring: ["spring", "spring boot", "springboot"],
    rails: ["rails", "ruby on rails"],

    // Databases
    postgresql: ["postgresql", "postgres", "pg"],
    mysql: ["mysql"],
    mongodb: ["mongodb", "mongo"],
    redis: ["redis"],
    sql: ["sql", "database"],

    // Cloud Platforms
    aws: ["aws", "amazon web services"],
    azure: ["azure", "microsoft azure"],
    "google cloud": ["gcp", "google cloud", "google cloud platform"],

    // DevOps
    docker: ["docker", "containerization"],
    kubernetes: ["kubernetes", "k8s"],
    ci: ["ci/cd", "continuous integration", "ci"],
    git: ["git", "version control"],

    // Soft Skills
    communication: ["communication", "communicate", "communicating"],
    leadership: ["leadership", "lead", "leading", "mentor", "mentoring"],
    "problem solving": [
      "problem solving",
      "problem-solving",
      "problem solve",
      "analytical",
    ],
    collaboration: ["collaboration", "collaborate", "teamwork", "team work"],
  };

  // Build comprehensive skill candidate list
  const allSkillCandidates = new Set();
  knownSkills.forEach((skill) => allSkillCandidates.add(skill.skillName));
  learningResourcesCatalog.forEach((resource) =>
    allSkillCandidates.add(resource.skillName)
  );

  // Add pattern-based skills
  Object.keys(skillPatterns).forEach((skillName) =>
    allSkillCandidates.add(skillName)
  );

  // Enhanced matching with pattern detection
  Array.from(allSkillCandidates).forEach((skillName) => {
    const normalized = normalizeSkillName(skillName);

    // Check synonyms from catalog
    const synonyms = Object.entries(skillSynonyms).find(([key, values]) => {
      const matchKey = normalizeSkillName(key);
      return (
        matchKey === normalized ||
        values.some((s) => normalizeSkillName(s) === normalized)
      );
    });

    // Build search tokens
    const searchTokens = new Set([normalized]);

    // Add skill name variations (e.g., "node.js" -> "node", "nodejs")
    const skillVariations = skillName.split(/[.\s-]+/).filter(Boolean);
    skillVariations.forEach((variation) =>
      searchTokens.add(normalizeSkillName(variation))
    );

    // Add synonyms
    if (synonyms) {
      const [root, values] = synonyms;
      searchTokens.add(normalizeSkillName(root));
      values.forEach((syn) => searchTokens.add(normalizeSkillName(syn)));
    }

    // Add pattern-based variations
    if (skillPatterns[skillName]) {
      skillPatterns[skillName].forEach((pattern) =>
        searchTokens.add(normalizeSkillName(pattern))
      );
    }

    // Count occurrences in description and title
    let occurrences = 0;
    const descriptionLower = description.toLowerCase();
    const titleLower = title.toLowerCase();

    searchTokens.forEach((token) => {
      // Check in tokens set (for multi-word matches)
      if (tokens.has(token)) {
        occurrences += 1;
      }
      // Also check direct string matches (for better detection)
      if (descriptionLower.includes(token) || titleLower.includes(token)) {
        occurrences += 1;
      }
    });

    if (occurrences > 0) {
      // Determine seniority based on title
      let seniority = DEFAULT_REQUIRED_LEVEL;
      if (/principal|architect|staff/i.test(job.title || "")) {
        seniority = 5;
      } else if (/lead|senior|sr/i.test(job.title || "")) {
        seniority = 4;
      } else if (/mid|middle|intermediate/i.test(job.title || "")) {
        seniority = 3;
      } else if (/junior|jr|entry|associate/i.test(job.title || "")) {
        seniority = 2;
      }

      // Determine importance based on occurrences and context
      let importance = "medium";
      if (occurrences >= 3 || titleLower.includes(normalized)) {
        importance = "critical";
      } else if (occurrences === 2) {
        importance = "high";
      }

      // Check if skill is in "required" or "must have" sections
      const requiredPattern =
        /(?:required|must have|must-have|essential|mandatory|prerequisite)/i;
      if (
        requiredPattern.test(description) &&
        descriptionLower.includes(normalized)
      ) {
        importance = "critical";
      }

      requirements.set(normalized, {
        skillName,
        importance,
        requiredLevel: seniority,
        mentions: occurrences,
        source: "heuristic",
        notes:
          occurrences >= 2
            ? `Mentioned ${occurrences} time(s) in job description.`
            : `Detected in job description.`,
      });
    }
  });

  // If we don't have enough requirements, add fallback skills
  if (requirements.size < MINIMUM_REQUIRED_SKILLS) {
    const fallbackSkills = selectFallbackRequirements(job);
    fallbackSkills.forEach((fallback) => {
      const normalized = normalizeSkillName(fallback.skillName);
      if (!requirements.has(normalized)) {
        requirements.set(normalized, {
          skillName: fallback.skillName,
          importance: fallback.importance || "medium",
          requiredLevel: fallback.requiredLevel || DEFAULT_REQUIRED_LEVEL,
          mentions: 0,
          source: "fallback",
          notes:
            fallback.notes ||
            `Common requirement for ${job.title || "this role"}.`,
        });
      }
    });
  }

  const result = Array.from(requirements.values());
  console.info(
    `[SkillGapService] Heuristic extraction found ${result.length} requirements.`
  );
  return result;
}

/**
 * Try to parse structured requirements with OpenAI. Falls back to heuristics.
 * Enhanced to fetch job posting URL for more comprehensive analysis.
 */
async function extractRequirements(job, knownSkills) {
  // Handle multiple possible field names for job description
  // The jobOpportunityService returns 'description' field, not 'jobDescription'
  let description = (
    job.description ||
    job.jobDescription ||
    job.job_description ||
    ""
  ).trim();
  let jobPostingUrl = job.jobPostingUrl || job.job_posting_url || null;
  let scrapedContent = null;

  console.log(`[SkillGapService] Job fields:`, {
    hasDescription: !!job.description,
    hasJobDescription: !!job.jobDescription,
    hasJob_description: !!job.job_description,
    descriptionLength: description.length,
    jobPostingUrl: jobPostingUrl,
    title: job.title,
    company: job.company,
  });

  // If we have a job posting URL, try to fetch more content
  if (jobPostingUrl && jobImportService) {
    try {
      console.log(
        `[SkillGapService] Fetching job posting from URL: ${jobPostingUrl}`
      );
      const importResult = await jobImportService.importJobFromUrl(
        jobPostingUrl
      );
      if (importResult.success && importResult.data) {
        const scrapedData = importResult.data;
        // Combine scraped description with existing description for more comprehensive analysis
        if (
          scrapedData.description &&
          scrapedData.description.length > description.length
        ) {
          console.log(
            `[SkillGapService] Found more comprehensive description from URL (${scrapedData.description.length} chars vs ${description.length} chars)`
          );
          description = scrapedData.description;
          scrapedContent = {
            title: scrapedData.title || job.title,
            company: scrapedData.company || job.company,
            location: scrapedData.location || job.location,
            jobBoard: scrapedData.jobBoard,
          };
        } else if (scrapedData.description) {
          // Merge both descriptions for maximum information
          description = `${description}\n\n--- Additional Information from Job Posting ---\n\n${scrapedData.description}`;
          scrapedContent = {
            title: scrapedData.title || job.title,
            company: scrapedData.company || job.company,
            location: scrapedData.location || job.location,
            jobBoard: scrapedData.jobBoard,
          };
        }
      }
    } catch (error) {
      console.warn(
        `[SkillGapService] Failed to fetch job posting URL: ${error.message}`
      );
      // Continue with existing description
    }
  }

  if (!description || description.trim().length === 0) {
    console.warn(
      "[SkillGapService] Job description missing; using fallback requirements."
    );
    return heuristicallyExtractRequirements(job, knownSkills);
  }

  if (!resumeAIAssistantService.openai) {
    console.info(
      "[SkillGapService] OpenAI client not configured; using heuristic extraction."
    );
    return heuristicallyExtractRequirements(job, knownSkills);
  }

  // Build comprehensive skill list with proficiency levels
  const skillListWithProficiency = knownSkills
    .map(
      (skill) => `${skill.skillName} (${skill.proficiency || "Not specified"})`
    )
    .join(", ");

  const catalogSkillList = learningResourcesCatalog
    .map((resource) => resource.skillName)
    .join(", ");

  // Enhanced prompt with examples and better instructions
  const prompt = `You are an expert technical recruiter and career analyst specializing in extracting skill requirements from job descriptions.

**YOUR PRIMARY TASK:**
Analyze the job posting below and extract ALL skill keywords mentioned or implied. Your goal is to identify every technical and professional skill required for this role by carefully reading through the ENTIRE job description.

**CRITICAL INSTRUCTIONS - EXTRACT SKILL KEYWORDS FROM THE JOB POSTING:**
1. **Read the ENTIRE job description carefully** - every section: requirements, responsibilities, qualifications, preferred skills, job description, etc.
2. **Extract explicit skill keywords** - Look for technologies, frameworks, tools, languages, platforms mentioned by name (e.g., "React", "Python", "AWS", "Docker", "PostgreSQL", "TypeScript", "Node.js", "MongoDB", "Kubernetes", "Git", "CI/CD", "Agile", "Scrum", "REST APIs", "GraphQL", "Microservices", "Machine Learning", "Data Science", "SQL", "NoSQL", "JavaScript", "Java", "C++", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "Vue", "Angular", "Svelte", "Express", "Django", "Flask", "Spring", "Rails", "Redis", "Elasticsearch", "Kafka", "Terraform", "Ansible", "Jenkins", "GitHub Actions", "Azure", "GCP", "Google Cloud", "Firebase", "Heroku", "Netlify", "Vercel", etc.)
3. **Extract skills from responsibilities** - If the job says "build REST APIs", extract: "REST API", "API Design", "Backend Development", "HTTP", "JSON". If it says "work with databases", extract: "SQL", "Database Design", "Data Modeling", "Database Administration"
4. **Extract skills from implied requirements** - If the job mentions "microservices architecture", extract: "Microservices", "Distributed Systems", "Service Architecture", "API Gateway", "Containerization". If it says "cloud infrastructure", extract: "Cloud Computing", "Infrastructure as Code", "DevOps", "CI/CD"
5. **Extract soft skills** - Look for mentions of: "communication", "leadership", "problem-solving", "collaboration", "teamwork", "time management", "project management", "mentoring", "agile", "scrum", "kanban", "stakeholder management", "presentation skills", "technical writing", etc.
6. **Extract domain-specific skills** - If the job is in "financial services", extract: "Financial Analysis", "Regulatory Compliance", "Risk Management". If it's "healthcare", extract: "HIPAA Compliance", "Healthcare IT", "Medical Data"
7. **Extract related skills** - If the job mentions "React", also consider: "Redux", "React Hooks", "JSX", "Component Design", "State Management", "Frontend Development". If it mentions "AWS", also consider: "Cloud Computing", "DevOps", "Infrastructure as Code", "EC2", "S3", "Lambda", "CloudFormation"
8. **Extract methodology skills** - If the job mentions "Agile", extract: "Agile/Scrum", "Sprint Planning", "Retrospectives", "Sprint Management". If it mentions "DevOps", extract: "CI/CD", "Continuous Integration", "Continuous Deployment", "Infrastructure as Code", "Monitoring", "Logging"
9. **Consider job title and seniority** - For "Senior" roles, expect higher proficiency levels (3-4). For "Junior" roles, expect lower levels (2-3). For "Staff/Principal" roles, expect expert levels (4-5)
10. **Extract at least 10-15+ skills** - Be extremely thorough! The more skills you extract, the better the analysis will be
11. **Mark importance based on context:**
    - "critical" if: Listed in "Required" or "Must Have" sections, mentioned multiple times, core to primary responsibilities, essential for day-to-day work
    - "high" if: Listed in "Preferred" or "Nice to Have" sections, important but not absolutely essential, frequently used in the role
    - "medium" or "low" for supplementary skills that are beneficial but not core

**PROFICIENCY LEVELS (1-5):**
- Level 1 (Beginner): Basic understanding, can follow tutorials
- Level 2 (Intermediate): Can work independently, understands best practices
- Level 3 (Advanced): Expert-level, can mentor others, solves complex problems
- Level 4 (Expert): Industry expert, can architect solutions, thought leader
- Level 5 (Master): Recognized authority, creates new patterns/methodologies

**SENIORITY GUIDELINES:**
- Junior roles: Level 2-3 typically required
- Mid-level roles: Level 3 typically required
- Senior roles: Level 3-4 typically required
- Staff/Principal roles: Level 4-5 typically required

**OUTPUT FORMAT:**
Return ONLY valid JSON in this exact structure:
{
  "requirements": [
    {
      "skillName": "React",
      "importance": "critical",
      "requiredLevel": 4,
      "notes": "Mentioned as core requirement. Senior role requires expert-level React knowledge."
    },
    {
      "skillName": "TypeScript",
      "importance": "high",
      "requiredLevel": 3,
      "notes": "Listed in preferred qualifications. Important for type safety."
    }
  ],
  "summary": "Brief 1-2 sentence overview of key skill requirements"
}

**EXAMPLES:**

Example 1 - Senior Software Engineer:
{
  "requirements": [
    {"skillName": "JavaScript", "importance": "critical", "requiredLevel": 4, "notes": "Core language requirement"},
    {"skillName": "React", "importance": "critical", "requiredLevel": 4, "notes": "Primary framework, senior level"},
    {"skillName": "Node.js", "importance": "high", "requiredLevel": 3, "notes": "Backend development capability"},
    {"skillName": "AWS", "importance": "medium", "requiredLevel": 3, "notes": "Cloud infrastructure experience"},
    {"skillName": "Leadership", "importance": "high", "requiredLevel": 3, "notes": "Mentoring junior developers"}
  ],
  "summary": "Senior full-stack engineer role requiring expert JavaScript/React skills, backend experience, and leadership capabilities."
}

Example 2 - Data Scientist:
{
  "requirements": [
    {"skillName": "Python", "importance": "critical", "requiredLevel": 4, "notes": "Primary programming language"},
    {"skillName": "Machine Learning", "importance": "critical", "requiredLevel": 4, "notes": "Core competency"},
    {"skillName": "SQL", "importance": "high", "requiredLevel": 3, "notes": "Data querying and analysis"},
    {"skillName": "Statistics", "importance": "high", "requiredLevel": 3, "notes": "Statistical modeling required"},
    {"skillName": "Communication", "importance": "medium", "requiredLevel": 3, "notes": "Present findings to stakeholders"}
  ],
  "summary": "Data science role requiring advanced Python and ML skills, with strong statistical background and communication abilities."
}

**NOW ANALYZE THIS JOB:**

Job Title: ${scrapedContent?.title || job.title || "Not specified"}
Company: ${scrapedContent?.company || job.company || "Not specified"}
Industry: ${job.industry || "Not specified"}
Job Type: ${job.jobType || "Not specified"}
Location: ${scrapedContent?.location || job.location || "Not specified"}
${scrapedContent?.jobBoard ? `Job Board: ${scrapedContent.jobBoard}` : ""}
${jobPostingUrl ? `Job Posting URL: ${jobPostingUrl}` : ""}

Job Description (${description.length} characters):
"""
${description}
"""

Candidate's Current Skills (for context - identify gaps):
${skillListWithProficiency || "No skills listed"}

Available Learning Resources (consider these when identifying skills):
${catalogSkillList || "None"}

**IMPORTANT - BE COMPREHENSIVE AND THOROUGH:**
- **READ THE ENTIRE JOB POSTING** - Go through every word, every section, every requirement
- **Extract at least 10-15+ skills minimum** - The more skills you extract, the better! Aim for 15-20+ if possible
- **Be specific with skill names** - Use exact names: "React" not "Frontend Framework", "Node.js" not "Backend", "PostgreSQL" not "Database", "AWS" not "Cloud"
- **Extract from ALL sections** - Requirements, Responsibilities, Qualifications, Preferred Skills, Job Description, About the Role, What You'll Do, etc.
- **Don't skip any skills** - If you see "Python", extract it. If you see "Docker", extract it. If you see "Agile", extract it. Extract EVERY skill keyword you find
- **Extract implied skills** - "microservices" → "Microservices", "Distributed Systems", "API Design", "Service Architecture", "Containerization"
- **Extract related skills** - "React" → "React", "Redux", "React Hooks", "JSX", "Component Design", "State Management", "Frontend Development"
- **Extract tool/platform skills** - "AWS" → "AWS", "Cloud Computing", "DevOps", "Infrastructure as Code", "EC2", "S3", "Lambda"
- **Extract methodology skills** - "Agile" → "Agile/Scrum", "Sprint Planning", "Retrospectives", "Sprint Management"
- **Extract soft skills** - "communication", "leadership", "problem-solving", "collaboration", "teamwork", "time management", "project management"
- **Base requiredLevel on job title seniority** - Senior roles = 3-4, Junior roles = 2-3, Staff/Principal = 4-5
- **If a skill is mentioned multiple times, it's likely critical** - Mark it as "critical" importance
- **Return ONLY the JSON object** - No additional text, no markdown formatting, just pure JSON
- **Aim for maximum coverage** - Extract every single skill keyword you can identify from the job posting!`;

  try {
    console.log(
      "[SkillGapService] Attempting AI extraction for job:",
      job.title
    );
    console.log(
      `[SkillGapService] Description length: ${description.length} characters`
    );
    if (scrapedContent) {
      console.log(`[SkillGapService] Using scraped content from URL`);
    }

    const response = await resumeAIAssistantService.chat(
      [
        {
          role: "system",
          content: `You are an expert technical recruiter and career analyst specializing in comprehensive skill extraction from job descriptions. 

**CRITICAL MISSION:**
Your PRIMARY task is to analyze the job posting and extract ALL skill keywords mentioned or implied. You MUST be extremely thorough and comprehensive.

**EXTRACTION REQUIREMENTS:**
- Extract at least 10-15+ skills minimum - aim for 15-20+ if possible
- Read the ENTIRE job posting carefully - every section, every requirement, every responsibility
- Extract explicit skill keywords: technologies, frameworks, tools, languages, platforms (e.g., "React", "Python", "AWS", "Docker", "PostgreSQL", "TypeScript", "Node.js", "MongoDB", "Kubernetes", "Git", "CI/CD", "Agile", "Scrum", "REST APIs", "GraphQL", "Microservices", "Machine Learning", "SQL", "JavaScript", "Java", "C++", "Go", "Rust", "Vue", "Angular", "Express", "Django", "Spring", "Redis", "Terraform", "Jenkins", "Azure", "GCP", etc.)
- Extract skills from responsibilities (e.g., "build REST APIs" → "REST API", "API Design", "Backend Development")
- Extract implied skills (e.g., "microservices" → "Microservices", "Distributed Systems", "API Design")
- Extract soft skills (e.g., "communication", "leadership", "problem-solving", "collaboration", "teamwork")
- Extract related skills (e.g., "React" → "Redux", "React Hooks", "JSX", "Component Design")
- Extract methodology skills (e.g., "Agile" → "Agile/Scrum", "Sprint Planning", "Retrospectives")
- Extract tool/platform skills (e.g., "AWS" → "AWS", "Cloud Computing", "DevOps", "Infrastructure as Code")
- Don't skip ANY skills - extract EVERY skill keyword you find in the job posting

**OUTPUT FORMAT:**
Always respond with valid JSON only, no markdown code blocks or additional text. Return a JSON object with a "requirements" array containing skill objects with "skillName", "importance", "requiredLevel", and "notes" fields.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      null,
      null,
      null,
      {
        jsonMode: true,
        maxTokens: 3000, // Increased further for comprehensive extraction of many skills
        temperature: 0.3, // Slightly higher for more creative skill extraction
      }
    );

    if (!response?.message) {
      console.warn(
        "[SkillGapService] OpenAI returned empty response; using heuristic extraction."
      );
      return heuristicallyExtractRequirements(job, knownSkills);
    }

    console.log(`[SkillGapService] AI response received (${response.message.length} chars):`, response.message.substring(0, 500));

    // Try to extract JSON from response (handle markdown code blocks)
    let jsonString = response.message.trim();

    // Remove markdown code blocks if present
    jsonString = jsonString
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    // Extract JSON object
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(
        "[SkillGapService] OpenAI response not JSON; using heuristic extraction. Response:",
        jsonString.substring(0, 200)
      );
      return heuristicallyExtractRequirements(job, knownSkills);
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[SkillGapService] JSON parse error:", parseError.message);
      console.warn(
        "[SkillGapService] Failed to parse JSON; using heuristic extraction."
      );
      return heuristicallyExtractRequirements(job, knownSkills);
    }

    console.log(`[SkillGapService] Parsed JSON successfully. Requirements count: ${parsed?.requirements?.length || 0}`);
    if (parsed?.requirements && Array.isArray(parsed.requirements) && parsed.requirements.length > 0) {
      console.log(`[SkillGapService] First few requirements:`, parsed.requirements.slice(0, 3).map(r => ({ skillName: r.skillName, importance: r.importance, requiredLevel: r.requiredLevel })));
    }

    if (
      !parsed?.requirements ||
      !Array.isArray(parsed.requirements) ||
      parsed.requirements.length === 0
    ) {
      console.warn(
        "[SkillGapService] OpenAI response missing or empty requirements; using heuristic extraction."
      );
      console.log(
        "[SkillGapService] Full parsed response:",
        JSON.stringify(parsed, null, 2)
      );
      return heuristicallyExtractRequirements(job, knownSkills);
    }

    // Validate and normalize requirements
    const validatedRequirements = parsed.requirements
      .filter((req) => req.skillName && typeof req.skillName === "string")
      .map((req) => {
        const importance = (req.importance || "medium").toLowerCase();
        const validImportance = ["critical", "high", "medium", "low"].includes(
          importance
        )
          ? importance
          : "medium";

        const requiredLevel = Number(req.requiredLevel);
        const validLevel =
          Number.isFinite(requiredLevel) &&
          requiredLevel >= 1 &&
          requiredLevel <= 5
            ? Math.round(requiredLevel)
            : DEFAULT_REQUIRED_LEVEL;

        return {
          skillName: req.skillName.trim(),
          importance: validImportance,
          requiredLevel: validLevel,
          notes: req.notes || `Required for ${job.title} role.`,
          source: "ai",
        };
      });

    if (validatedRequirements.length === 0) {
      console.warn(
        "[SkillGapService] No valid requirements after validation; using heuristic extraction."
      );
      return heuristicallyExtractRequirements(job, knownSkills);
    }

    console.info(
      `[SkillGapService] Successfully extracted ${validatedRequirements.length} requirements via OpenAI.`
    );
    return validatedRequirements;
  } catch (error) {
    const message =
      error?.status === 429
        ? "Rate limited by OpenAI"
        : error?.status === 500
        ? "OpenAI server error"
        : error?.message || "Unknown error from OpenAI";
    console.error(
      `[SkillGapService] OpenAI extraction failed (${message}). Falling back to heuristic extraction.`,
      error
    );
    return heuristicallyExtractRequirements(job, knownSkills);
  }
}

function proficiencyToNumber(proficiency = "") {
  const normalized = normalizeSkillName(proficiency);
  if (normalized in PROFICIENCY_SCALE) {
    return PROFICIENCY_SCALE[normalized];
  }
  const numeric = parseInt(proficiency, 10);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  return 0;
}

function numberToProficiencyLabel(value) {
  if (value >= 5) return "Master";
  if (value >= 4) return "Expert";
  if (value >= 3) return "Advanced";
  if (value >= 2) return "Intermediate";
  if (value > 0) return "Beginner";
  return "None";
}

function findResourcesForSkill(skillName) {
  const normalized = normalizeSkillName(skillName);
  return learningResourcesCatalog.filter(
    (resource) => normalizeSkillName(resource.skillName) === normalized
  );
}

function computeSeverity(requiredLevel, currentLevel, importance = "medium") {
  const importanceWeight =
    IMPORTANCE_WEIGHTS[importance] || IMPORTANCE_WEIGHTS.medium;
  const gap = Math.max(requiredLevel - currentLevel, 0);
  return gap * importanceWeight;
}

function buildLearningPlan(gaps) {
  if (!gaps.length) {
    return {
      totalHours: 0,
      steps: [],
    };
  }

  const steps = gaps.map((gap) => {
    const resources = gap.recommendedResources || [];
    const estimatedHours =
      resources.reduce(
        (acc, resource) => acc + (resource.estimatedHours || 2),
        0
      ) || 2;

    return {
      skillName: gap.skillName,
      priority: gap.priority,
      severityScore: gap.severityScore,
      recommendedResources: resources,
      estimatedHours,
      suggestedDeadline:
        gap.priority === "P1"
          ? "2 weeks"
          : gap.priority === "P2"
          ? "4 weeks"
          : "6 weeks",
    };
  });

  const totalHours = steps.reduce(
    (acc, step) => acc + (step.estimatedHours || 0),
    0
  );

  return {
    totalHours,
    steps,
  };
}

class SkillGapService {
  /**
   * Generate a new skill gap snapshot for a given job + user skill profile.
   */
  async generateSnapshot(job, userSkills, previousSnapshots = []) {
    try {
      if (!job) {
        throw new Error("Job is required for skill gap analysis");
      }

      if (!Array.isArray(userSkills)) {
        console.warn(
          "[SkillGapService] userSkills is not an array, using empty array"
        );
        userSkills = [];
      }

      if (!Array.isArray(previousSnapshots)) {
        previousSnapshots = [];
      }

      console.log(
        `[SkillGapService] Generating snapshot for job: ${job.title || job.id}`
      );
      console.log(`[SkillGapService] User has ${userSkills.length} skills`);
      if (userSkills.length > 0) {
        console.log(
          `[SkillGapService] User skills:`,
          userSkills.map((s) => ({
            name: s.skillName,
            proficiency: s.proficiency,
          }))
        );
      }
      const jobDesc =
        job.description || job.jobDescription || job.job_description || "";
      console.log(
        `[SkillGapService] Job description length: ${jobDesc.length}`
      );
      console.log(
        `[SkillGapService] Job description preview: ${jobDesc.substring(
          0,
          200
        )}...`
      );

      let requirements = await extractRequirements(job, userSkills);
      console.log(
        `[SkillGapService] Extracted ${requirements.length} requirements`
      );

      if (!Array.isArray(requirements) || requirements.length === 0) {
        console.warn(
          "[SkillGapService] No requirements extracted, using fallback"
        );
        const fallbackSkills = selectFallbackRequirements(job);
        requirements = fallbackSkills.map((fallback) => ({
          skillName: fallback.skillName,
          importance: fallback.importance || "medium",
          requiredLevel: fallback.requiredLevel || DEFAULT_REQUIRED_LEVEL,
          notes:
            fallback.notes ||
            `Common requirement for ${job.title || "this role"}.`,
          source: "fallback",
        }));
        console.log(
          `[SkillGapService] Using ${requirements.length} fallback requirements`
        );
      }

      // Ensure we always have at least some requirements
      if (requirements.length === 0) {
        console.error(
          "[SkillGapService] Still no requirements after fallback! Using generic fallback."
        );
        requirements = GENERIC_FALLBACK_SKILLS.map((fallback) => ({
          skillName: fallback.skillName,
          importance: fallback.importance || "medium",
          requiredLevel: fallback.requiredLevel || DEFAULT_REQUIRED_LEVEL,
          notes: `Common requirement for ${job.title || "this role"}.`,
          source: "generic-fallback",
        }));
      }

      const skillByName = new Map();
      userSkills.forEach((skill) => {
        if (!skill || !skill.skillName) {
          return; // Skip invalid skills
        }

        const normalized = normalizeSkillName(skill.skillName);
        if (!skillByName.has(normalized)) {
          skillByName.set(normalized, skill);
        }

        const synonyms =
          skillSynonyms[normalized] || skillSynonyms[skill.skillName];
        if (Array.isArray(synonyms)) {
          synonyms.forEach((syn) => {
            const normalizedSyn = normalizeSkillName(syn);
            if (!skillByName.has(normalizedSyn)) {
              skillByName.set(normalizedSyn, skill);
            }
          });
        }
      });

      const requirementSummaries = [];
      const gaps = [];

      let effectiveRequirements = requirements.length
        ? requirements
        : selectFallbackRequirements(job);

      console.log(
        `[SkillGapService] Processing ${effectiveRequirements.length} requirements`
      );
      console.log(
        `[SkillGapService] Skill map has ${skillByName.size} entries`
      );

      effectiveRequirements.forEach((requirement) => {
        try {
          if (!requirement || !requirement.skillName) {
            console.warn(
              "[SkillGapService] Skipping invalid requirement:",
              requirement
            );
            return;
          }

          const normalized = normalizeSkillName(requirement.skillName);
          const userSkill = skillByName.get(normalized);
          const currentLevel = userSkill
            ? proficiencyToNumber(userSkill.proficiency)
            : 0;
          const requiredLevel =
            requirement.requiredLevel || DEFAULT_REQUIRED_LEVEL;
          const importance = requirement.importance || "medium";

          if (userSkill) {
            console.log(
              `[SkillGapService] Matched skill: ${requirement.skillName} (user has ${userSkill.proficiency}, required: ${requiredLevel})`
            );
          } else {
            console.log(
              `[SkillGapService] No match for skill: ${requirement.skillName} (normalized: ${normalized})`
            );
          }

          const severityScore = computeSeverity(
            requiredLevel,
            currentLevel,
            importance
          );

          const matched = currentLevel > 0;
          const gapLevel = requiredLevel - currentLevel;
          const hasGap = gapLevel > 0; // There's a gap if required level is higher than current level

          requirementSummaries.push({
            skillName: requirement.skillName,
            importance,
            requiredLevel,
            currentLevel,
            currentProficiencyLabel: numberToProficiencyLabel(currentLevel),
            source: requirement.source || "unknown",
            notes:
              requirement.notes || `Required for ${job.title || "this role"}.`,
            matched,
            gapLevel: Math.max(gapLevel, 0),
          });

          // Add to gaps if there's a gap (required level > current level) OR if the user doesn't have the skill at all
          if (hasGap || !matched) {
            const resources = findResourcesForSkill(requirement.skillName);
            const gapItem = {
              skillName: requirement.skillName,
              severityScore,
              requiredLevel,
              currentLevel,
              priority:
                severityScore >= 6 ? "P1" : severityScore >= 3 ? "P2" : "P3",
              summary:
                requirement.notes ||
                (matched
                  ? `Your current level (${numberToProficiencyLabel(currentLevel)}) is below the required level (${numberToProficiencyLabel(requiredLevel)}).`
                  : "This skill is required for this role but is not in your profile."),
              recommendedResources: resources,
            };
            gaps.push(gapItem);
            console.log(
              `[SkillGapService] Added gap: ${requirement.skillName} (required: ${requiredLevel}, current: ${currentLevel}, severity: ${severityScore.toFixed(2)})`
            );
          } else {
            console.log(
              `[SkillGapService] No gap for: ${requirement.skillName} (required: ${requiredLevel}, current: ${currentLevel})`
            );
          }
        } catch (error) {
          console.error(
            `[SkillGapService] Error processing requirement ${requirement?.skillName}:`,
            error
          );
          // Continue processing other requirements
        }
      });

      gaps.sort((a, b) => b.severityScore - a.severityScore);

      const learningPlan = buildLearningPlan(gaps);

      const snapshot = {
        type: "skill_gap_snapshot",
        snapshotId: uuidv4(),
        generatedAt: new Date().toISOString(),
        requirements: requirementSummaries,
        gaps,
        learningPlan,
        stats: {
          totalRequirements: requirementSummaries.length,
          totalGaps: gaps.length,
          criticalGaps: gaps.filter((gap) => gap.priority === "P1").length,
          highPriorityGaps: gaps.filter((gap) => gap.priority === "P2").length,
        },
        trend: this.buildTrendInfo(gaps, previousSnapshots),
      };

      console.info(
        `[SkillGapService] Snapshot generated: ${requirementSummaries.length} requirements, ${gaps.length} gaps`
      );
      return snapshot;
    } catch (error) {
      console.error("[SkillGapService] Error generating snapshot:", error);
      // Return a minimal snapshot to prevent complete failure
      return {
        type: "skill_gap_snapshot",
        snapshotId: uuidv4(),
        generatedAt: new Date().toISOString(),
        requirements: [],
        gaps: [],
        learningPlan: { totalHours: 0, steps: [] },
        stats: {
          totalRequirements: 0,
          totalGaps: 0,
          criticalGaps: 0,
          highPriorityGaps: 0,
        },
        trend: {
          direction: "stable",
          message: "Unable to generate skill gap analysis. Please try again.",
        },
        error: error.message || "Unknown error",
      };
    }
  }

  buildTrendInfo(currentGaps, previousSnapshots) {
    if (!previousSnapshots?.length) {
      return {
        direction: currentGaps.length ? "rising" : "stable",
        message: currentGaps.length
          ? "First measurement captured. Focus on completing the recommended learning plan."
          : "No gaps detected – keep confirming new skills as you learn.",
      };
    }

    const lastSnapshot = previousSnapshots[previousSnapshots.length - 1];
    const lastGapCount = lastSnapshot?.gaps?.length || 0;
    const currentGapCount = currentGaps.length;

    let direction = "stable";
    let message = "Skill gaps are stable compared to the previous snapshot.";

    if (currentGapCount < lastGapCount) {
      direction = "improving";
      message =
        "Great job! You closed some skill gaps since the previous snapshot.";
    } else if (currentGapCount > lastGapCount) {
      direction = "rising";
      message =
        "New skill gaps were detected for this job. Review the recommended learning plan to stay competitive.";
    }

    return {
      direction,
      message,
      previousGapCount: lastGapCount,
      currentGapCount,
    };
  }

  /**
   * Reduce snapshot entries into cross-job stats for analytics.
   */
  buildTrendSummaryFromJobs(jobs) {
    const skillAggregates = new Map();
    const jobSummaries = [];

    jobs.forEach((job) => {
      const history = Array.isArray(job.applicationHistory)
        ? job.applicationHistory
        : [];
      const snapshots = history.filter(
        (entry) => entry?.type === "skill_gap_snapshot"
      );
      if (!snapshots.length) return;

      const latest = snapshots[snapshots.length - 1];
      jobSummaries.push({
        jobId: job.id,
        title: job.title,
        company: job.company,
        snapshotId: latest.snapshotId,
        generatedAt: latest.generatedAt,
        totalGaps: latest.gaps.length,
        criticalGaps: latest.gaps.filter((gap) => gap.priority === "P1").length,
      });

      latest.gaps.forEach((gap) => {
        const normalized = normalizeSkillName(gap.skillName);
        const existing = skillAggregates.get(normalized) || {
          skillName: gap.skillName,
          occurrences: 0,
          criticalCount: 0,
          jobs: [],
        };
        existing.occurrences += 1;
        if (gap.priority === "P1") {
          existing.criticalCount += 1;
        }
        existing.jobs.push({
          jobId: job.id,
          title: job.title,
          company: job.company,
          severity: gap.priority,
        });
        skillAggregates.set(normalized, existing);
      });
    });

    const topGaps = Array.from(skillAggregates.values()).sort(
      (a, b) =>
        b.occurrences - a.occurrences || b.criticalCount - a.criticalCount
    );

    return {
      topGaps,
      jobSummaries,
      totalJobsWithSnapshots: jobSummaries.length,
    };
  }
}

export default new SkillGapService();
