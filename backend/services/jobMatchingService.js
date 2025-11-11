import database from "./database.js";
import jobOpportunityService from "./jobOpportunityService.js";
import skillService from "./skillService.js";
import educationService from "./educationService.js";
import jobService from "./jobService.js";
import profileService from "./profileService.js";

/**
 * Service for calculating job match scores
 * Stores match scores in application_history JSONB field (no DB changes needed)
 */
class JobMatchingService {
  /**
   * Calculate match score for a job opportunity
   */
  async calculateMatchScore(jobOpportunityId, userId) {
    try {
      // Get job opportunity
      const jobOpportunity = await jobOpportunityService.getJobOpportunityById(
        jobOpportunityId,
        userId
      );
      if (!jobOpportunity) {
        throw new Error("Job opportunity not found or access denied");
      }

      // Get user profile data
      const [profile, skills, education, jobs] = await Promise.all([
        profileService.getProfileByUserId(userId),
        skillService.getSkillsByUserId(userId),
        educationService.getEducationsByUserId(userId),
        jobService.getJobsByUserId(userId),
      ]);

      // Extract requirements from job description
      const requirements = this.extractRequirements(jobOpportunity);

      // Calculate match scores by category
      const skillsMatch = this.calculateSkillsMatch(
        skills,
        requirements.skills,
        jobOpportunity.description || ""
      );
      const experienceMatch = this.calculateExperienceMatch(
        jobs,
        profile,
        requirements.experience,
        jobOpportunity.description || "",
        jobOpportunity.title || ""
      );
      const educationMatch = this.calculateEducationMatch(
        education,
        requirements.education,
        jobOpportunity.description || ""
      );

      // Calculate overall match score (weighted average)
      const weights = {
        skills: 0.5, // 50% weight
        experience: 0.35, // 35% weight
        education: 0.15, // 15% weight
      };

      const overallScore =
        skillsMatch.score * weights.skills +
        experienceMatch.score * weights.experience +
        educationMatch.score * weights.education;

      // Identify strengths and gaps
      const strengths = this.identifyStrengths(
        skillsMatch,
        experienceMatch,
        educationMatch
      );
      const gaps = this.identifyGaps(
        skillsMatch,
        experienceMatch,
        educationMatch,
        requirements
      );

      // Generate improvement suggestions
      const suggestions = this.generateSuggestions(gaps, requirements);

      const matchScore = {
        overallScore: Math.round(overallScore),
        breakdown: {
          skills: skillsMatch,
          experience: experienceMatch,
          education: educationMatch,
        },
        strengths,
        gaps,
        suggestions,
        calculatedAt: new Date().toISOString(),
        weights,
      };

      // Store match score in application_history
      await this.saveMatchScore(jobOpportunityId, userId, matchScore);

      return matchScore;
    } catch (error) {
      console.error("❌ Error calculating match score:", error);
      throw error;
    }
  }

  /**
   * Extract requirements from job description and title
   */
  extractRequirements(jobOpportunity) {
    const description = (jobOpportunity.description || "").toLowerCase();
    const title = (jobOpportunity.title || "").toLowerCase();
    const combinedText = `${title} ${description}`;

    // Common skill keywords
    const skillKeywords = {
      technical: [
        "javascript",
        "typescript",
        "python",
        "java",
        "react",
        "node",
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
      ],
      soft: [
        "leadership",
        "communication",
        "teamwork",
        "problem solving",
        "collaboration",
        "management",
        "mentoring",
        "presentation",
      ],
    };

    // Extract skills mentioned in description
    const requiredSkills = [];
    for (const [category, keywords] of Object.entries(skillKeywords)) {
      for (const keyword of keywords) {
        if (combinedText.includes(keyword)) {
          requiredSkills.push({
            name: keyword,
            category: category === "technical" ? "Technical" : "Soft Skills",
          });
        }
      }
    }

    // Extract education requirements
    const educationRequirements = [];
    if (combinedText.includes("bachelor") || combinedText.includes("bs") || combinedText.includes("ba")) {
      educationRequirements.push("Bachelor's");
    }
    if (combinedText.includes("master") || combinedText.includes("ms") || combinedText.includes("mba")) {
      educationRequirements.push("Master's");
    }
    if (combinedText.includes("phd") || combinedText.includes("doctorate")) {
      educationRequirements.push("PhD");
    }

    // Extract experience requirements (years)
    const experienceMatch = combinedText.match(/(\d+)\+?\s*(years?|yrs?)/i);
    const yearsOfExperience = experienceMatch
      ? parseInt(experienceMatch[1], 10)
      : null;

    // Extract experience level
    let experienceLevel = null;
    if (combinedText.includes("senior") || combinedText.includes("sr.")) {
      experienceLevel = "senior";
    } else if (
      combinedText.includes("junior") ||
      combinedText.includes("jr.") ||
      combinedText.includes("entry")
    ) {
      experienceLevel = "junior";
    } else if (combinedText.includes("mid") || combinedText.includes("mid-level")) {
      experienceLevel = "mid";
    }

    return {
      skills: requiredSkills,
      education: educationRequirements,
      experience: {
        years: yearsOfExperience,
        level: experienceLevel,
      },
    };
  }

  /**
   * Calculate skills match score
   */
  calculateSkillsMatch(userSkills, requiredSkills, jobDescription) {
    if (!requiredSkills || requiredSkills.length === 0) {
      // If no specific skills mentioned, try to extract from description
      const descriptionSkills = this.extractSkillsFromText(jobDescription);
      if (descriptionSkills.length === 0) {
        return {
          score: 75, // Default score if no skills specified
          matched: [],
          missing: [],
          matchPercentage: 75,
        };
      }
      requiredSkills = descriptionSkills;
    }

    const userSkillMap = new Map(
      userSkills.map((skill) => [
        skill.skillName.toLowerCase(),
        skill.proficiency,
      ])
    );

    const matched = [];
    const missing = [];

    for (const reqSkill of requiredSkills) {
      const skillName = reqSkill.name.toLowerCase();
      const userSkill = userSkillMap.get(skillName);

      if (userSkill) {
        // Calculate score based on proficiency
        let proficiencyScore = 50; // Beginner
        if (userSkill === "Intermediate") proficiencyScore = 75;
        else if (userSkill === "Advanced") proficiencyScore = 90;
        else if (userSkill === "Expert") proficiencyScore = 100;

        matched.push({
          name: reqSkill.name,
          category: reqSkill.category,
          proficiency: userSkill,
          score: proficiencyScore,
        });
      } else {
        // Check for partial matches (e.g., "React" matches "react.js")
        const partialMatch = Array.from(userSkillMap.keys()).find((userSkill) =>
          userSkill.includes(skillName) || skillName.includes(userSkill)
        );

        if (partialMatch) {
          const proficiency = userSkillMap.get(partialMatch);
          let proficiencyScore = 40; // Lower score for partial match
          if (proficiency === "Intermediate") proficiencyScore = 60;
          else if (proficiency === "Advanced") proficiencyScore = 75;
          else if (proficiency === "Expert") proficiencyScore = 85;

          matched.push({
            name: reqSkill.name,
            category: reqSkill.category,
            proficiency,
            score: proficiencyScore,
            partialMatch: true,
          });
        } else {
          missing.push({
            name: reqSkill.name,
            category: reqSkill.category,
          });
        }
      }
    }

    // Calculate match percentage
    const totalRequired = requiredSkills.length;
    const matchPercentage =
      totalRequired > 0
        ? Math.round((matched.length / totalRequired) * 100)
        : 0;

    // Calculate weighted score (average of matched skill scores)
    const score =
      matched.length > 0
        ? Math.round(
            matched.reduce((sum, skill) => sum + skill.score, 0) /
              matched.length
          )
        : 0;

    return {
      score,
      matched,
      missing,
      matchPercentage,
      totalRequired,
      matchedCount: matched.length,
    };
  }

  /**
   * Extract skills from job description text
   */
  extractSkillsFromText(text) {
    const skills = [];
    const commonSkills = [
      "javascript",
      "python",
      "java",
      "react",
      "node",
      "sql",
      "aws",
      "docker",
      "kubernetes",
      "git",
      "agile",
      "scrum",
    ];

    const lowerText = text.toLowerCase();
    for (const skill of commonSkills) {
      if (lowerText.includes(skill)) {
        skills.push({
          name: skill,
          category: "Technical",
        });
      }
    }

    return skills;
  }

  /**
   * Calculate experience match score
   */
  calculateExperienceMatch(
    userJobs,
    profile,
    experienceRequirements,
    jobDescription,
    jobTitle
  ) {
    // Calculate years of experience from user's jobs
    let totalYears = 0;
    const currentDate = new Date();

    for (const job of userJobs || []) {
      // Handle both start_date and startDate formats
      const startDate = job.start_date || job.startDate;
      const endDate = job.end_date || job.endDate;
      
      if (startDate) {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : currentDate;
        const years = (end - start) / (1000 * 60 * 60 * 24 * 365);
        totalYears += Math.max(0, years);
      }
    }

    // Check experience level match
    const userExpLevel = profile?.exp_level?.toLowerCase() || "";
    const requiredLevel = experienceRequirements?.level?.toLowerCase() || "";
    let levelMatch = 100;

    if (requiredLevel === "senior" && userExpLevel !== "senior") {
      levelMatch = userExpLevel === "mid" ? 70 : 40;
    } else if (requiredLevel === "mid" && userExpLevel === "junior") {
      levelMatch = 60;
    } else if (requiredLevel === "junior" && userExpLevel === "senior") {
      levelMatch = 90; // Overqualified is still a good match
    }

    // Check years of experience
    const requiredYears = experienceRequirements?.years || 0;
    let yearsMatch = 100;

    if (requiredYears > 0) {
      if (totalYears >= requiredYears) {
        yearsMatch = 100;
      } else if (totalYears >= requiredYears * 0.8) {
        yearsMatch = 85;
      } else if (totalYears >= requiredYears * 0.6) {
        yearsMatch = 70;
      } else {
        yearsMatch = Math.max(30, (totalYears / requiredYears) * 100);
      }
    }

    // Check title/role match
    const jobTitleLower = (jobTitle || "").toLowerCase();
    const userJobTitles = (userJobs || []).map((job) =>
      ((job.title || job.job_title || "")).toLowerCase()
    );
    const titleMatch = userJobTitles.some((title) =>
      this.calculateTitleSimilarity(title, jobTitleLower)
    )
      ? 100
      : 50;

    // Check industry match
    const userIndustry = (profile?.industry || "").toLowerCase();
    const jobIndustry = jobDescription.toLowerCase();
    const industryMatch = userIndustry && jobIndustry.includes(userIndustry)
      ? 100
      : 70;

    // Calculate weighted score
    const score = Math.round(
      levelMatch * 0.3 +
        yearsMatch * 0.4 +
        titleMatch * 0.2 +
        industryMatch * 0.1
    );

    return {
      score,
      totalYears: Math.round(totalYears * 10) / 10,
      requiredYears,
      levelMatch,
      yearsMatch,
      titleMatch,
      industryMatch,
      userExpLevel: profile?.exp_level || "Not specified",
      requiredLevel: requiredLevel || "Not specified",
    };
  }

  /**
   * Calculate title similarity
   */
  calculateTitleSimilarity(title1, title2) {
    const words1 = title1.split(/\s+/);
    const words2 = title2.split(/\s+/);
    const commonWords = words1.filter((word) => words2.includes(word));
    return commonWords.length > 0;
  }

  /**
   * Calculate education match score
   */
  calculateEducationMatch(userEducation, educationRequirements, jobDescription) {
    if (!educationRequirements || educationRequirements.length === 0) {
      // Try to extract from description
      const descLower = jobDescription.toLowerCase();
      if (descLower.includes("bachelor") || descLower.includes("bs") || descLower.includes("ba")) {
        educationRequirements = ["Bachelor's"];
      } else if (descLower.includes("master") || descLower.includes("ms")) {
        educationRequirements = ["Master's"];
      } else {
        return {
          score: 75, // Default if no requirements
          matched: [],
          missing: [],
          matchPercentage: 75,
        };
      }
    }

    if (!userEducation || userEducation.length === 0) {
      return {
        score: 0,
        matched: [],
        missing: educationRequirements,
        matchPercentage: 0,
      };
    }

    // Map education levels to numeric values
    const educationLevels = {
      "associate's": 1,
      "associate": 1,
      "bachelor's": 2,
      "bachelor": 2,
      "bs": 2,
      "ba": 2,
      "master's": 3,
      "master": 3,
      "ms": 3,
      "mba": 3,
      "phd": 4,
      "doctorate": 4,
    };

    const userHighestLevel = Math.max(
      ...userEducation.map((edu) => {
        // Handle both degree_type and degreeType formats
        const degreeType = (edu.degree_type || edu.degreeType || "").toLowerCase();
        return educationLevels[degreeType] || 0;
      }),
      0
    );

    const requiredLevel = Math.max(
      ...educationRequirements.map((req) => {
        const reqLower = req.toLowerCase();
        return educationLevels[reqLower] || 0;
      }),
      0
    );

    let score = 0;
    if (userHighestLevel >= requiredLevel) {
      score = 100;
    } else if (userHighestLevel === requiredLevel - 1) {
      score = 70;
    } else {
      score = 40;
    }

    const matched = userHighestLevel >= requiredLevel ? educationRequirements : [];
    const missing =
      userHighestLevel < requiredLevel ? educationRequirements : [];

    return {
      score,
      matched,
      missing,
      matchPercentage: userHighestLevel >= requiredLevel ? 100 : 0,
      userHighestLevel: this.getEducationLevelName(userHighestLevel),
      requiredLevel: this.getEducationLevelName(requiredLevel),
    };
  }

  /**
   * Get education level name from numeric value
   */
  getEducationLevelName(level) {
    const levels = {
      0: "None",
      1: "Associate's",
      2: "Bachelor's",
      3: "Master's",
      4: "PhD",
    };
    return levels[level] || "Not specified";
  }

  /**
   * Identify strengths
   */
  identifyStrengths(skillsMatch, experienceMatch, educationMatch) {
    const strengths = [];

    if (skillsMatch.matchPercentage >= 80) {
      strengths.push({
        category: "Skills",
        description: `Strong skills match (${skillsMatch.matchPercentage}%)`,
        score: skillsMatch.score,
      });
    }

    if (experienceMatch.score >= 80) {
      strengths.push({
        category: "Experience",
        description: `Strong experience match`,
        score: experienceMatch.score,
      });
    }

    if (educationMatch.score >= 80) {
      strengths.push({
        category: "Education",
        description: `Education requirements met`,
        score: educationMatch.score,
      });
    }

    return strengths;
  }

  /**
   * Identify gaps
   */
  identifyGaps(skillsMatch, experienceMatch, educationMatch, requirements) {
    const gaps = [];

    if (skillsMatch.missing && skillsMatch.missing.length > 0) {
      gaps.push({
        category: "Skills",
        items: skillsMatch.missing.map((skill) => skill.name),
        description: `Missing ${skillsMatch.missing.length} required skill(s)`,
      });
    }

    if (experienceMatch.score < 70) {
      gaps.push({
        category: "Experience",
        items: experienceMatch.requiredYears
          ? [`${experienceMatch.requiredYears} years of experience required`]
          : [],
        description: `Experience level may not fully match requirements`,
      });
    }

    if (educationMatch.missing && educationMatch.missing.length > 0) {
      gaps.push({
        category: "Education",
        items: educationMatch.missing,
        description: `Missing education requirement(s)`,
      });
    }

    return gaps;
  }

  /**
   * Generate improvement suggestions
   */
  generateSuggestions(gaps, requirements) {
    const suggestions = [];

    for (const gap of gaps) {
      if (gap.category === "Skills") {
        suggestions.push({
          category: "Skills",
          suggestion: `Consider learning or improving: ${gap.items.slice(0, 3).join(", ")}`,
          priority: "High",
        });
      } else if (gap.category === "Experience") {
        suggestions.push({
          category: "Experience",
          suggestion: "Highlight relevant projects and achievements that demonstrate required experience",
          priority: "Medium",
        });
      } else if (gap.category === "Education") {
        suggestions.push({
          category: "Education",
          suggestion: `Consider pursuing: ${gap.items.join(" or ")}`,
          priority: gap.items.includes("PhD") ? "Low" : "Medium",
        });
      }
    }

    return suggestions;
  }

  /**
   * Save match score to application_history
   */
  async saveMatchScore(jobOpportunityId, userId, matchScore) {
    try {
      const jobOpportunity = await jobOpportunityService.getJobOpportunityById(
        jobOpportunityId,
        userId
      );

      const currentHistory = jobOpportunity.applicationHistory || [];
      const matchEntry = {
        type: "match_score",
        timestamp: matchScore.calculatedAt,
        matchScore: matchScore.overallScore,
        breakdown: matchScore.breakdown,
        strengths: matchScore.strengths,
        gaps: matchScore.gaps,
        suggestions: matchScore.suggestions,
      };

      // Remove old match score entries (keep only latest)
      const filteredHistory = currentHistory.filter(
        (entry) => entry.type !== "match_score"
      );
      const updatedHistory = [...filteredHistory, matchEntry];

      await jobOpportunityService.updateJobOpportunity(jobOpportunityId, userId, {
        applicationHistory: updatedHistory,
      });
    } catch (error) {
      console.error("❌ Error saving match score:", error);
      // Don't throw - match score calculation can still proceed
    }
  }

  /**
   * Get match score for a job opportunity
   */
  async getMatchScore(jobOpportunityId, userId) {
    try {
      const jobOpportunity = await jobOpportunityService.getJobOpportunityById(
        jobOpportunityId,
        userId
      );

      // Check if match score exists in application_history
      const matchEntry = (jobOpportunity.applicationHistory || []).find(
        (entry) => entry.type === "match_score"
      );

      if (matchEntry) {
        return {
          overallScore: matchEntry.matchScore,
          breakdown: matchEntry.breakdown,
          strengths: matchEntry.strengths,
          gaps: matchEntry.gaps,
          suggestions: matchEntry.suggestions,
          calculatedAt: matchEntry.timestamp,
        };
      }

      // Return null if no match score exists (frontend will handle calculation)
      return null;
    } catch (error) {
      console.error("❌ Error getting match score:", error);
      throw error;
    }
  }

  /**
   * Get match scores for multiple jobs
   */
  async getMatchScoresForJobs(userId, jobIds) {
    try {
      const matchScores = await Promise.all(
        jobIds.map(async (jobId) => {
          try {
            const matchScore = await this.getMatchScore(jobId, userId);
            return {
              jobId,
              matchScore: matchScore.overallScore,
              breakdown: matchScore.breakdown,
            };
          } catch (error) {
            console.error(`Error getting match score for job ${jobId}:`, error);
            return {
              jobId,
              matchScore: null,
              error: error.message,
            };
          }
        })
      );

      return matchScores;
    } catch (error) {
      console.error("❌ Error getting match scores for jobs:", error);
      throw error;
    }
  }

  /**
   * Get match score history and trends
   */
  async getMatchScoreHistory(jobOpportunityId, userId) {
    try {
      const jobOpportunity = await jobOpportunityService.getJobOpportunityById(
        jobOpportunityId,
        userId
      );

      // Get all match score entries from application_history
      const matchEntries = (jobOpportunity.applicationHistory || [])
        .filter((entry) => entry.type === "match_score")
        .map((entry) => ({
          score: entry.matchScore,
          timestamp: entry.timestamp,
          breakdown: entry.breakdown,
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return matchEntries;
    } catch (error) {
      console.error("❌ Error getting match score history:", error);
      throw error;
    }
  }

  /**
   * Update matching criteria weights
   */
  async updateMatchingWeights(userId, weights) {
    // Store weights in user preferences or profile (if we had a preferences table)
    // For now, we'll use default weights
    // This can be stored in application_history or a separate preferences field
    return {
      skills: weights.skills || 0.5,
      experience: weights.experience || 0.35,
      education: weights.education || 0.15,
    };
  }
}

export default new JobMatchingService();

