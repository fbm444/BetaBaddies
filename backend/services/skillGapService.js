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

/**
 * Heuristic requirement extraction fallback.
 */
function heuristicallyExtractRequirements(job, knownSkills) {
  const description = job.jobDescription || job.job_description || "";
  const tokens = extractKeywords(description);
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
      searchTokens.add(normalizeSkillName(synonyms[0]));
      synonyms[1].forEach((syn) => searchTokens.add(normalizeSkillName(syn)));
    }

    let occurrences = 0;
    tokens.forEach((token) => {
      if (searchTokens.has(token)) {
        occurrences += 1;
      }
    });

    if (occurrences > 0) {
      const importance =
        occurrences >= 3 ? "critical" : occurrences === 2 ? "high" : "medium";
      const seniority = /principal|lead|staff|senior/i.test(job.title || "")
        ? 4
        : DEFAULT_REQUIRED_LEVEL;

      requirements.set(normalized, {
        skillName,
        importance,
        requiredLevel: seniority,
        mentions: occurrences,
        source: "heuristic",
      });
    }
  });

  return Array.from(requirements.values());
}

/**
 * Try to parse structured requirements with OpenAI. Falls back to heuristics.
 */
async function extractRequirements(job, knownSkills) {
  const description = job.jobDescription || job.job_description || "";
  if (!description || !resumeAIAssistantService.openai) {
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
      return heuristicallyExtractRequirements(job, knownSkills);
    }

    const jsonMatch = response.message.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return heuristicallyExtractRequirements(job, knownSkills);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed?.requirements?.length) {
      return heuristicallyExtractRequirements(job, knownSkills);
    }

    return parsed.requirements.map((req) => ({
      skillName: req.skillName,
      importance: req.importance?.toLowerCase?.() || "medium",
      requiredLevel: Number(req.requiredLevel) || DEFAULT_REQUIRED_LEVEL,
      notes: req.notes,
      source: "ai",
    }));
  } catch (error) {
    console.error("Failed to extract requirements with AI, using heuristic fallback:", error.message);
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

    const skillByName = new Map(
      userSkills.map((skill) => [normalizeSkillName(skill.skillName), skill])
    );

    const requirementSummaries = [];
    const gaps = [];

    requirements.forEach((requirement) => {
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

