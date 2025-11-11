import { v4 as uuidv4 } from "uuid";
import resumeAIAssistantService from "./resumes/aiService.js";
import { learningResourcesCatalog, skillSynonyms } from "../data/learningResources.js";

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
      { skillName: "Automated Testing", importance: "medium", requiredLevel: 3 },
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
      { skillName: "Cloud Architecture", importance: "medium", requiredLevel: 3 },
    ],
  },
  {
    matchers: [/data/i, /analytics/i, /ml/i, /machine learning/i],
    skills: [
      { skillName: "Python", importance: "high", requiredLevel: 3 },
      { skillName: "SQL", importance: "high", requiredLevel: 3 },
      { skillName: "Data Visualization", importance: "medium", requiredLevel: 3 },
      { skillName: "Machine Learning", importance: "medium", requiredLevel: 3 },
      { skillName: "Statistics", importance: "medium", requiredLevel: 3 },
    ],
  },
  {
    matchers: [/product/i, /manager/i],
    skills: [
      { skillName: "Product Strategy", importance: "high", requiredLevel: 3 },
      { skillName: "Stakeholder Management", importance: "medium", requiredLevel: 3 },
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
 */
function heuristicallyExtractRequirements(job, knownSkills) {
  const description = job.jobDescription || job.job_description || "";
  const { tokens } = buildTokenSet(description, job.title, job.industry, job.jobType);
  const requirements = new Map();

  const allSkillCandidates = new Set();
  knownSkills.forEach((skill) => allSkillCandidates.add(skill.skillName));
  learningResourcesCatalog.forEach((resource) => allSkillCandidates.add(resource.skillName));

  Array.from(allSkillCandidates).forEach((skillName) => {
    const normalized = normalizeSkillName(skillName);
    const synonyms = Object.entries(skillSynonyms).find(([key, values]) => {
      const matchKey = normalizeSkillName(key);
      return matchKey === normalized || values.some((s) => normalizeSkillName(s) === normalized);
    });

    const searchTokens = new Set([normalized]);
    if (synonyms) {
      const [root, values] = synonyms;
      searchTokens.add(normalizeSkillName(root));
      values.forEach((syn) => searchTokens.add(normalizeSkillName(syn)));
    }

    let occurrences = 0;
    searchTokens.forEach((token) => {
      if (tokens.has(token)) {
        occurrences += 1;
      }
    });

    if (occurrences > 0) {
      const seniority = /principal|lead|staff|senior/i.test(job.title || "")
        ? 4
        : DEFAULT_REQUIRED_LEVEL;
      const importance =
        occurrences >= 3 ? "critical" : occurrences === 2 ? "high" : "medium";

      requirements.set(normalized, {
        skillName,
        importance,
        requiredLevel: seniority,
        mentions: occurrences,
        source: "heuristic",
      });
    }
  });

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
          notes: fallback.notes,
        });
      }
    });
  }

  return Array.from(requirements.values());
}

/**
 * Try to parse structured requirements with OpenAI. Falls back to heuristics.
 */
async function extractRequirements(job, knownSkills) {
  const description = (job.jobDescription || job.job_description || "").trim();
  if (!description) {
    console.warn("[SkillGapService] Job description missing; using fallback requirements.");
    return heuristicallyExtractRequirements(job, knownSkills);
  }

  if (!resumeAIAssistantService.openai) {
    console.info(
      "[SkillGapService] OpenAI client not configured; using heuristic extraction."
    );
    return heuristicallyExtractRequirements(job, knownSkills);
  }

  const skillList = Array.from(
    new Set([
      ...knownSkills.map((skill) => skill.skillName),
      ...learningResourcesCatalog.map((resource) => resource.skillName),
    ])
  ).join(", ");

  const prompt = `
You are an assistant that extracts technical and professional skill requirements from job descriptions.

Return JSON with this shape:
{
  "requirements": [
    {
      "skillName": "AWS SageMaker",
      "importance": "critical|high|medium|low",
      "requiredLevel": 1-5,
      "notes": "why this matters"
    }
  ],
  "summary": "short overview (<=200 chars)"
}

Job Title: ${job.title}
Job Company: ${job.company}
Job Description:
"""
${description}
"""

Candidate known skills:
${skillList}
`;

  try {
    const response = await resumeAIAssistantService.chat(
      [
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
        maxTokens: 800,
        temperature: 0.3,
      }
    );

    if (!response?.message) {
      console.warn("[SkillGapService] OpenAI returned empty response; using heuristic extraction.");
      return heuristicallyExtractRequirements(job, knownSkills);
    }

    const jsonMatch = response.message.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[SkillGapService] OpenAI response not JSON; using heuristic extraction.");
      return heuristicallyExtractRequirements(job, knownSkills);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed?.requirements?.length) {
      console.info("[SkillGapService] OpenAI response missing requirements; using heuristic extraction.");
      return heuristicallyExtractRequirements(job, knownSkills);
    }

    console.info("[SkillGapService] Requirements extracted via OpenAI.");
    return parsed.requirements.map((req) => ({
      skillName: req.skillName,
      importance: req.importance?.toLowerCase?.() || "medium",
      requiredLevel: Number(req.requiredLevel) || DEFAULT_REQUIRED_LEVEL,
      notes: req.notes,
      source: "ai",
    }));
  } catch (error) {
    const message =
      error?.status === 429
        ? "Rate limited by OpenAI"
        : error?.message || "Unknown error from OpenAI";
    console.warn(
      `[SkillGapService] OpenAI extraction failed (${message}). Falling back to heuristic extraction.`
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
  return learningResourcesCatalog.filter((resource) => normalizeSkillName(resource.skillName) === normalized);
}

function computeSeverity(requiredLevel, currentLevel, importance = "medium") {
  const importanceWeight = IMPORTANCE_WEIGHTS[importance] || IMPORTANCE_WEIGHTS.medium;
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
      resources.reduce((acc, resource) => acc + (resource.estimatedHours || 2), 0) || 2;

    return {
      skillName: gap.skillName,
      priority: gap.priority,
      severityScore: gap.severityScore,
      recommendedResources: resources,
      estimatedHours,
      suggestedDeadline: gap.priority === "P1" ? "2 weeks" : gap.priority === "P2" ? "4 weeks" : "6 weeks",
    };
  });

  const totalHours = steps.reduce((acc, step) => acc + (step.estimatedHours || 0), 0);

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
    const requirements = await extractRequirements(job, userSkills);

    const skillByName = new Map();
    userSkills.forEach((skill) => {
      const normalized = normalizeSkillName(skill.skillName);
      if (!skillByName.has(normalized)) {
        skillByName.set(normalized, skill);
      }

      const synonyms = skillSynonyms[normalized] || skillSynonyms[skill.skillName];
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

    let effectiveRequirements = requirements.length ? requirements : selectFallbackRequirements(job);

    effectiveRequirements.forEach((requirement) => {
      const normalized = normalizeSkillName(requirement.skillName);
      const userSkill = skillByName.get(normalized);
      const currentLevel = userSkill ? proficiencyToNumber(userSkill.proficiency) : 0;
      const severityScore = computeSeverity(
        requirement.requiredLevel || DEFAULT_REQUIRED_LEVEL,
        currentLevel,
        requirement.importance
      );

      const matched = currentLevel > 0;
      const gapLevel = requirement.requiredLevel - currentLevel;

      requirementSummaries.push({
        skillName: requirement.skillName,
        importance: requirement.importance,
        requiredLevel: requirement.requiredLevel,
        currentLevel,
        currentProficiencyLabel: numberToProficiencyLabel(currentLevel),
        source: requirement.source,
        notes: requirement.notes,
        matched,
        gapLevel: Math.max(gapLevel, 0),
      });

      if (severityScore > 0.5) {
        const resources = findResourcesForSkill(requirement.skillName);
        gaps.push({
          skillName: requirement.skillName,
          severityScore,
          requiredLevel: requirement.requiredLevel,
          currentLevel,
          priority: severityScore >= 6 ? "P1" : severityScore >= 3 ? "P2" : "P3",
          summary: requirement.notes || "Needs upskilling to match job requirement.",
          recommendedResources: resources,
        });
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

    return snapshot;
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
      message = "Great job! You closed some skill gaps since the previous snapshot.";
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
      const snapshots = history.filter((entry) => entry?.type === "skill_gap_snapshot");
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
      (a, b) => b.occurrences - a.occurrences || b.criticalCount - a.criticalCount
    );

    return {
      topGaps,
      jobSummaries,
      totalJobsWithSnapshots: jobSummaries.length,
    };
  }
}

export default new SkillGapService();

