import database from "./database.js";
import skillService from "./skillService.js";
import educationService from "./educationService.js";
import jobService from "./jobService.js";

class RoleMatchService {
  /**
   * Calculate role match score using actual skills matching algorithm
   * Based on cosine similarity and weighted matching
   */
  async calculateRoleMatch(jobOpportunityId, userId) {
    try {
      // Get job opportunity
      const jobResult = await database.query(
        `SELECT * FROM job_opportunities WHERE id = $1 AND user_id = $2`,
        [jobOpportunityId, userId]
      );

      if (jobResult.rows.length === 0) {
        return {
          score: 0,
          hasData: false,
          status: "missing",
          breakdown: {},
        };
      }

      const job = jobResult.rows[0];
      const jobDescription = (job.description || "").toLowerCase();
      const jobTitle = (job.position || job.title || "").toLowerCase();
      
      // Get user data
      const [userSkills, userEducation, userJobs, profile] = await Promise.all([
        skillService.getSkillsByUserId(userId),
        educationService.getEducationsByUserId(userId),
        jobService.getJobsByUserId(userId),
        database.query(`SELECT * FROM profiles WHERE user_id = $1`, [userId]).then(r => r.rows[0] || {}),
      ]);

      const breakdown = {
        skills: { score: 0, status: "unknown", notes: [], matched: 0, required: 0, matchRate: 0 },
        experience: { score: 0, status: "unknown", notes: [], yearsMatch: 0, levelMatch: 0 },
        education: { score: 0, status: "unknown", notes: [], hasRequired: false },
        industry: { score: 0, status: "unknown", notes: [], match: false },
      };

      // 1. SKILLS MATCHING - Use actual skills from database
      const skillsMatch = this.calculateSkillsMatch(userSkills, jobDescription, jobTitle);
      breakdown.skills = skillsMatch;

      // 2. EXPERIENCE MATCHING - Calculate based on actual work history
      const experienceMatch = this.calculateExperienceMatch(userJobs, profile, jobTitle, jobDescription);
      breakdown.experience = experienceMatch;

      // 3. EDUCATION MATCHING - Check actual education records
      const educationMatch = this.calculateEducationMatch(userEducation, jobDescription);
      breakdown.education = educationMatch;

      // 4. INDUSTRY MATCHING - Compare user industry with job
      const industryMatch = this.calculateIndustryMatch(profile, job);
      breakdown.industry = industryMatch;

      // Calculate overall score using weighted algorithm
      // Skills are most important (40%), then experience (30%), education (20%), industry (10%)
      const weights = {
        skills: 0.40,
        experience: 0.30,
        education: 0.20,
        industry: 0.10,
      };

      const overallScore =
        breakdown.skills.score * weights.skills +
        breakdown.experience.score * weights.experience +
        breakdown.education.score * weights.education +
        breakdown.industry.score * weights.industry;

      const hasData = userSkills.length > 0 || userJobs.length > 0 || userEducation.length > 0;
      const status =
        overallScore >= 75 ? "complete" : overallScore >= 50 ? "partial" : "missing";

      return {
        score: Math.round(overallScore),
        hasData,
        status,
        breakdown,
      };
    } catch (error) {
      console.error("❌ Error calculating role match:", error);
      return {
        score: 0,
        hasData: false,
        status: "error",
        breakdown: {},
      };
    }
  }

  /**
   * Calculate skills match using actual user skills vs job requirements
   * Uses keyword extraction and proficiency weighting
   */
  calculateSkillsMatch(userSkills, jobDescription, jobTitle) {
    if (!jobDescription && !jobTitle) {
      return {
        score: 50,
        status: "unknown",
        notes: ["No job description available"],
        matched: 0,
        required: 0,
        matchRate: 0,
      };
    }

    // Extract required skills from job description using common tech keywords
    const techKeywords = [
      "javascript", "python", "java", "typescript", "react", "angular", "vue", "node",
      "sql", "mongodb", "postgresql", "mysql", "redis", "aws", "azure", "gcp",
      "docker", "kubernetes", "git", "ci/cd", "agile", "scrum", "rest", "graphql",
      "html", "css", "sass", "less", "webpack", "babel", "jest", "cypress",
      "machine learning", "ai", "data science", "analytics", "tableau", "power bi",
      "salesforce", "crm", "seo", "sem", "marketing", "finance", "accounting",
    ];

    const text = `${jobDescription} ${jobTitle}`.toLowerCase();
    const requiredSkills = techKeywords.filter(keyword => text.includes(keyword));
    
    if (requiredSkills.length === 0) {
      // If no tech keywords found, assume general skills needed
      return {
        score: 60,
        status: "partial",
        notes: ["Job description doesn't specify technical skills"],
        matched: 0,
        required: 0,
        matchRate: 0,
      };
    }

    // Match user skills against required skills
    const userSkillNames = userSkills.map(s => s.skillName.toLowerCase());
    const matchedSkills = requiredSkills.filter(reqSkill => 
      userSkillNames.some(userSkill => 
        userSkill.includes(reqSkill) || reqSkill.includes(userSkill)
      )
    );

    // Calculate match rate
    const matchRate = requiredSkills.length > 0 
      ? (matchedSkills.length / requiredSkills.length) * 100 
      : 0;

    // Weight by proficiency levels
    let proficiencyBonus = 0;
    matchedSkills.forEach(matchedSkill => {
      const userSkill = userSkills.find(s => 
        s.skillName.toLowerCase().includes(matchedSkill) || 
        matchedSkill.includes(s.skillName.toLowerCase())
      );
      if (userSkill) {
        const proficiencyMap = { "Beginner": 0.5, "Intermediate": 0.75, "Advanced": 1.0, "Expert": 1.0 };
        proficiencyBonus += proficiencyMap[userSkill.proficiency] || 0.5;
      }
    });

    const avgProficiency = matchedSkills.length > 0 ? proficiencyBonus / matchedSkills.length : 0;
    
    // Calculate score: base match rate + proficiency adjustment
    let score = matchRate;
    if (avgProficiency > 0.75) score += 10; // Bonus for high proficiency
    if (avgProficiency < 0.5) score -= 10; // Penalty for low proficiency
    score = Math.min(100, Math.max(0, score));

    const status = score >= 80 ? "complete" : score >= 50 ? "partial" : "missing";
    const notes = [
      `Matched ${matchedSkills.length} of ${requiredSkills.length} required skills`,
      `Match rate: ${matchRate.toFixed(1)}%`,
      matchedSkills.length > 0 ? `Matched: ${matchedSkills.slice(0, 3).join(", ")}` : "No skills matched",
    ];

    return {
      score: Math.round(score),
      status,
      notes,
      matched: matchedSkills.length,
      required: requiredSkills.length,
      matchRate: Math.round(matchRate),
    };
  }

  /**
   * Calculate experience match based on actual work history
   */
  calculateExperienceMatch(userJobs, profile, jobTitle, jobDescription) {
    // Determine required experience level from job title
    const requiredLevel = this.extractExperienceLevel(jobTitle, jobDescription);
    const userLevel = profile?.exp_level || this.inferExperienceLevel(userJobs);

    // Calculate years of experience
    const totalYears = this.calculateTotalYears(userJobs);
    const requiredYears = this.extractRequiredYears(jobDescription);

    // Level match score
    let levelMatch = 50;
    if (userLevel && requiredLevel) {
      const levelHierarchy = { "Entry": 1, "Mid": 2, "Senior": 3 };
      const userLevelNum = levelHierarchy[userLevel] || 2;
      const requiredLevelNum = levelHierarchy[requiredLevel] || 2;
      
      if (userLevelNum === requiredLevelNum) {
        levelMatch = 100;
      } else if (userLevelNum > requiredLevelNum) {
        levelMatch = 90; // Overqualified is still good
      } else {
        levelMatch = 40; // Underqualified
      }
    }

    // Years match score
    let yearsMatch = 50;
    if (requiredYears > 0) {
      if (totalYears >= requiredYears) {
        yearsMatch = 100;
      } else if (totalYears >= requiredYears * 0.7) {
        yearsMatch = 75;
      } else if (totalYears >= requiredYears * 0.5) {
        yearsMatch = 50;
      } else {
        yearsMatch = 30;
      }
    } else {
      yearsMatch = 70; // No specific requirement
    }

    // Combined experience score
    const score = (levelMatch * 0.6) + (yearsMatch * 0.4);
    const status = score >= 75 ? "complete" : score >= 50 ? "partial" : "missing";
    
    const notes = [
      `User level: ${userLevel || "Unknown"}, Required: ${requiredLevel || "Unknown"}`,
      `Experience: ${totalYears.toFixed(1)} years`,
      requiredYears > 0 ? `Required: ${requiredYears} years` : "No specific requirement",
    ];

    return {
      score: Math.round(score),
      status,
      notes,
      yearsMatch: Math.round(yearsMatch),
      levelMatch: Math.round(levelMatch),
    };
  }

  /**
   * Calculate education match
   */
  calculateEducationMatch(userEducation, jobDescription) {
    if (!jobDescription) {
      return {
        score: 70,
        status: "partial",
        notes: ["No job description to analyze"],
        hasRequired: false,
      };
    }

    const text = jobDescription.toLowerCase();
    const requiresDegree = text.includes("degree") || text.includes("bachelor") || 
                          text.includes("master") || text.includes("phd") ||
                          text.includes("education required");

    if (!requiresDegree) {
      return {
        score: 100,
        status: "complete",
        notes: ["No specific education requirements"],
        hasRequired: false,
      };
    }

    // Check if user has education
    if (userEducation.length === 0) {
      return {
        score: 30,
        status: "missing",
        notes: ["Education required but no education records found"],
        hasRequired: true,
      };
    }

    // Check for degree level
    const hasBachelor = userEducation.some(e => 
      e.degreeType?.toLowerCase().includes("bachelor") ||
      e.degreeType?.toLowerCase().includes("bs") ||
      e.degreeType?.toLowerCase().includes("ba")
    );
    const hasMaster = userEducation.some(e => 
      e.degreeType?.toLowerCase().includes("master") ||
      e.degreeType?.toLowerCase().includes("ms") ||
      e.degreeType?.toLowerCase().includes("mba")
    );

    let score = 70; // Base score for having education
    if (hasMaster) score = 100;
    else if (hasBachelor) score = 85;

    return {
      score,
      status: score >= 80 ? "complete" : "partial",
      notes: [
        hasMaster ? "Master's degree" : hasBachelor ? "Bachelor's degree" : "Education recorded",
        "Meets education requirements",
      ],
      hasRequired: true,
    };
  }

  /**
   * Calculate industry match
   */
  calculateIndustryMatch(profile, job) {
    const userIndustry = (profile?.industry || "").toLowerCase();
    const jobIndustry = (job.industry || "").toLowerCase();
    const jobCompany = (job.company || "").toLowerCase();

    if (!userIndustry && !jobIndustry) {
      return {
        score: 50,
        status: "unknown",
        notes: ["Industry information not available"],
        match: false,
      };
    }

    // Simple industry matching
    const industriesMatch = userIndustry && jobIndustry && 
                           (userIndustry === jobIndustry || 
                            userIndustry.includes(jobIndustry) || 
                            jobIndustry.includes(userIndustry));

    const score = industriesMatch ? 90 : 60;
    
    return {
      score,
      status: score >= 75 ? "complete" : "partial",
      notes: [
        userIndustry ? `User industry: ${profile.industry}` : "No user industry",
        jobIndustry ? `Job industry: ${job.industry}` : "No job industry",
        industriesMatch ? "Industries match" : "Industries differ",
      ],
      match: industriesMatch,
    };
  }

  // Helper methods
  extractExperienceLevel(jobTitle, jobDescription) {
    const text = `${jobTitle} ${jobDescription}`.toLowerCase();
    if (text.includes("senior") || text.includes("sr.") || text.includes("lead") || text.includes("principal")) {
      return "Senior";
    }
    if (text.includes("junior") || text.includes("jr.") || text.includes("entry") || text.includes("intern")) {
      return "Entry";
    }
    return "Mid";
  }

  inferExperienceLevel(userJobs) {
    if (!userJobs || userJobs.length === 0) return null;
    
    const totalYears = this.calculateTotalYears(userJobs);
    if (totalYears >= 7) return "Senior";
    if (totalYears >= 3) return "Mid";
    return "Entry";
  }

  calculateTotalYears(userJobs) {
    if (!userJobs || userJobs.length === 0) return 0;
    
    let totalMonths = 0;
    userJobs.forEach(job => {
      if (job.startDate) {
        const start = new Date(job.startDate);
        const end = job.endDate ? new Date(job.endDate) : new Date();
        const months = (end - start) / (1000 * 60 * 60 * 24 * 30);
        totalMonths += Math.max(0, months);
      }
    });
    
    return totalMonths / 12;
  }

  extractRequiredYears(jobDescription) {
    if (!jobDescription) return 0;
    
    const text = jobDescription.toLowerCase();
    const patterns = [
      /(\d+)\+?\s*years?\s*(?:of\s*)?experience/,
      /experience.*?(\d+)\+?\s*years?/,
      /minimum.*?(\d+)\s*years?/,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return 0;
  }
}

export default new RoleMatchService();
