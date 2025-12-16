import database from "./database.js";
import OpenAI from "openai";

class CompetitiveAnalysisService {
  constructor() {
    // Initialize OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_API_URL;
    this.openai = apiKey
      ? new OpenAI({
          apiKey,
          ...(baseURL && { baseURL }),
        })
      : null;
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    // Rare skills that give competitive advantage (held by <10% of applicants)
    this.rareSkills = [
      "Kubernetes",
      "Terraform",
      "GraphQL",
      "Rust",
      "Go",
      "Elixir",
      "Scala",
      "Apache Kafka",
      "Apache Spark",
      "Redis",
      "MongoDB",
      "Cassandra",
      "Docker",
      "AWS Lambda",
      "Microservices",
      "Distributed Systems",
      "System Design",
      "Machine Learning",
      "Data Engineering",
    ];

    // Notable companies that add prestige
    this.notableCompanies = [
      "Google",
      "Microsoft",
      "Amazon",
      "Apple",
      "Meta",
      "Netflix",
      "Uber",
      "Airbnb",
      "Stripe",
      "Palantir",
      "LinkedIn",
      "Twitter",
      "Salesforce",
      "Oracle",
      "IBM",
      "Adobe",
      "NVIDIA",
      "Tesla",
    ];
  }

  /**
   * Main entry point: Analyze competitiveness for a job opportunity
   */
  async analyzeCompetitiveness(userId, jobOpportunityId) {
    // Fetch job opportunity
    const jobRes = await database.query(
      `
      SELECT 
        jo.*,
        ci.size as company_size,
        ci.industry
      FROM job_opportunities jo
      LEFT JOIN company_info ci ON ci.job_id = jo.id
      WHERE jo.id = $1 AND jo.user_id = $2
      LIMIT 1
    `,
      [jobOpportunityId, userId]
    );

    if (jobRes.rows.length === 0) {
      throw new Error("Job opportunity not found");
    }

    const job = jobRes.rows[0];

    // Fetch user profile data
    const userProfile = await this.getUserProfile(userId);

    // Calculate components
    const applicantCount = this.estimateApplicantCount(job);
    const competitiveScore = await this.calculateCompetitiveScore(
      userProfile,
      job
    );
    const advantages = this.identifyAdvantages(userProfile, job);
    const disadvantages = await this.identifyDisadvantages(userProfile, job);
    const interviewLikelihood = this.estimateInterviewLikelihood(
      competitiveScore,
      applicantCount,
      advantages,
      disadvantages,
      job
    );
    const strategies = await this.generateDifferentiatingStrategies(
      job,
      advantages,
      disadvantages,
      userProfile
    );
    const profileComparison = await this.compareToTypicalHiredProfile(
      userProfile,
      job
    );

    const confidence = this.calculateConfidence(job, userProfile);
    
    // Update interview likelihood with confidence
    interviewLikelihood.confidence = confidence;

    return {
      competitiveScore: Math.round(competitiveScore),
      applicantCount,
      interviewLikelihood,
      advantages,
      disadvantages,
      strategies,
      profileComparison,
      confidence,
    };
  }

  /**
   * Estimate number of applicants based on posting age, company size, and platform
   */
  estimateApplicantCount(job) {
    // Base applicants by role level (inferred from title)
    const title = (job.title || "").toLowerCase();
    let baseApplicants = 100; // Default mid-level

    if (title.includes("junior") || title.includes("entry") || title.includes("intern")) {
      baseApplicants = 200;
    } else if (title.includes("senior")) {
      baseApplicants = 150;
    } else if (title.includes("staff") || title.includes("principal") || title.includes("lead")) {
      baseApplicants = 80;
    } else if (title.includes("director") || title.includes("vp")) {
      baseApplicants = 50;
    }

    // Company size multiplier
    const size = (job.company_size || "").toLowerCase();
    let sizeMultiplier = 1.0;
    if (size.includes("10000+")) {
      sizeMultiplier = 2.0;
    } else if (size.includes("5001-10000")) {
      sizeMultiplier = 1.5;
    } else if (size.includes("1001-5000")) {
      sizeMultiplier = 1.0;
    } else if (size.includes("<1000") || size.includes("1-1000")) {
      sizeMultiplier = 0.7;
    }

    // Platform multiplier
    const source = (job.application_source || job.application_method || "").toLowerCase();
    let platformMultiplier = 1.0;
    if (source.includes("linkedin")) {
      platformMultiplier = 1.5;
    } else if (source.includes("referral")) {
      platformMultiplier = 0.3;
    } else if (source.includes("job board") || source.includes("indeed") || source.includes("glassdoor")) {
      platformMultiplier = 1.2;
    } else if (source.includes("company") || source.includes("website")) {
      platformMultiplier = 1.0;
    }

    // Age decay factor
    const createdAt = job.created_at ? new Date(job.created_at) : new Date();
    const daysSincePosting = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    let ageDecay = 1.0;
    if (daysSincePosting < 7) {
      ageDecay = 1.0; // First week: full applicants
    } else if (daysSincePosting < 14) {
      ageDecay = 0.8; // 1-2 weeks
    } else if (daysSincePosting < 30) {
      ageDecay = 0.6; // 2-4 weeks
    } else {
      ageDecay = 0.4; // 1+ month
    }

    const estimatedCount = Math.round(baseApplicants * sizeMultiplier * platformMultiplier * ageDecay);
    return {
      total: estimatedCount,
      breakdown: {
        base: baseApplicants,
        sizeMultiplier,
        platformMultiplier,
        ageDecay,
        daysSincePosting,
      },
    };
  }

  /**
   * Calculate competitive score (0-100)
   */
  async calculateCompetitiveScore(userProfile, job) {
    // Skills match (40%) - now uses AI extraction
    const skillsMatch = await this.calculateSkillsMatch(userProfile, job);
    const skillsScore = (skillsMatch.matchPercentage / 100) * 40;

    // Experience match (30%)
    const experienceScore = this.calculateExperienceMatch(userProfile, job);

    // Education match (10%)
    const educationScore = this.calculateEducationMatch(userProfile, job);

    // Unique advantages (10%)
    const advantagesScore = this.calculateAdvantagesScore(userProfile, job);

    // Application quality (10%) - reuse from quality scores if available
    const qualityScore = await this.getApplicationQualityScore(
      userProfile.userId,
      job.id
    );

    const totalScore = skillsScore + experienceScore + educationScore + advantagesScore + qualityScore;
    return Math.min(100, Math.max(0, totalScore));
  }

  /**
   * Calculate skills match percentage
   */
  async calculateSkillsMatch(userProfile, job) {
    // Extract skills from job description using AI
    const jobDesc = job.job_description || "";
    const requiredSkills = await this.extractSkillsFromDescription(jobDesc, job.title);

    if (requiredSkills.length === 0) {
      return { matched: 0, total: 0, matchPercentage: 50 }; // Neutral if no skills found
    }

    // Normalize skills to lowercase for matching
    const requiredSkillsLower = requiredSkills.map((s) => s.toLowerCase());
    const userSkills = userProfile.skills.map((s) => s.skill_name.toLowerCase());

    // Match skills (fuzzy matching)
    const matched = requiredSkillsLower.filter((reqSkill) =>
      userSkills.some((userSkill) => {
        // Exact match
        if (userSkill === reqSkill) return true;
        // Contains match
        if (userSkill.includes(reqSkill) || reqSkill.includes(userSkill)) return true;
        // Handle variations (e.g., "node.js" vs "nodejs")
        const normalizedReq = reqSkill.replace(/[.\s-]/g, "");
        const normalizedUser = userSkill.replace(/[.\s-]/g, "");
        return normalizedUser.includes(normalizedReq) || normalizedReq.includes(normalizedUser);
      })
    );

    const matchPercentage = (matched.length / requiredSkills.length) * 100;

    return {
      matched: matched.length,
      total: requiredSkills.length,
      matchPercentage,
      matchedSkills: matched,
      missingSkills: requiredSkillsLower.filter((s) => !matched.includes(s)),
    };
  }

  /**
   * Extract skills from job description
   */
  extractSkillsFromDescription(description) {
    const commonTechSkills = [
      "javascript",
      "typescript",
      "python",
      "java",
      "react",
      "node.js",
      "aws",
      "docker",
      "kubernetes",
      "postgresql",
      "mongodb",
      "redis",
      "graphql",
      "rest",
      "microservices",
      "distributed systems",
      "machine learning",
      "ai",
      "data engineering",
      "terraform",
      "ci/cd",
      "agile",
      "scrum",
    ];

    const found = [];
    for (const skill of commonTechSkills) {
      if (description.includes(skill)) {
        found.push(skill);
      }
    }

    return found;
  }

  /**
   * Calculate experience match score
   */
  calculateExperienceMatch(userProfile, job) {
    const title = (job.title || "").toLowerCase();
    let requiredYears = 3; // Default mid-level

    if (title.includes("junior") || title.includes("entry")) {
      requiredYears = 1;
    } else if (title.includes("senior")) {
      requiredYears = 5;
    } else if (title.includes("staff") || title.includes("principal")) {
      requiredYears = 8;
    } else if (title.includes("director") || title.includes("vp")) {
      requiredYears = 12;
    }

    const userYears = userProfile.totalExperienceYears || 0;

    if (userYears >= requiredYears) {
      return Math.min(30, (userYears / requiredYears) * 30);
    } else {
      return (userYears / requiredYears) * 20; // Penalty for being under-qualified
    }
  }

  /**
   * Calculate education match score
   */
  calculateEducationMatch(userProfile, job) {
    let score = 0;

    // Check if user has relevant degree
    const jobDesc = (job.job_description || "").toLowerCase();
    const hasCSDegree = userProfile.education.some(
      (edu) => edu.field && edu.field.toLowerCase().includes("computer")
    );

    if (hasCSDegree) {
      score += 5; // Degree type match
      if (jobDesc.includes("computer science") || jobDesc.includes("cs degree")) {
        score += 5; // Field match
      }
    }

    // Prestige bonus (top schools)
    const topSchools = ["stanford", "mit", "berkeley", "carnegie", "harvard", "princeton"];
    const hasTopSchool = userProfile.education.some((edu) =>
      topSchools.some((school) => edu.school && edu.school.toLowerCase().includes(school))
    );
    if (hasTopSchool) {
      score += 2;
    }

    return Math.min(10, score);
  }

  /**
   * Calculate advantages score
   */
  calculateAdvantagesScore(userProfile, job) {
    let score = 0;

    // Rare skills
    const userSkills = userProfile.skills.map((s) => s.skill_name.toLowerCase());
    const rareCount = userSkills.filter((skill) =>
      this.rareSkills.some((rare) => skill.includes(rare.toLowerCase()))
    ).length;
    score += Math.min(5, rareCount * 1.5); // Max 5% from rare skills

    // Notable company experience
    const notableCount = userProfile.employmentHistory.filter((job) =>
      this.notableCompanies.some((company) =>
        job.company && job.company.toLowerCase().includes(company.toLowerCase())
      )
    ).length;
    score += Math.min(3, notableCount * 1.5); // Max 3% from notable companies

    // Certifications
    if (userProfile.certifications && userProfile.certifications.length > 0) {
      score += Math.min(2, userProfile.certifications.length * 0.5); // Max 2% from certs
    }

    return Math.min(10, score);
  }

  /**
   * Get application quality score if available
   */
  async getApplicationQualityScore(userId, jobId) {
    try {
      const res = await database.query(
        `
        SELECT overall_score
        FROM application_quality_scores
        WHERE user_id = $1 AND job_opportunity_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
        [userId, jobId]
      );

      if (res.rows.length > 0 && res.rows[0].overall_score) {
        return (res.rows[0].overall_score / 100) * 10;
      }
    } catch (e) {
      // Ignore errors
    }
    return 5; // Neutral if no quality score
  }

  /**
   * Identify competitive advantages
   */
  identifyAdvantages(userProfile, job) {
    const advantages = [];

    // Rare skills
    const userSkills = userProfile.skills.map((s) => s.skill_name);
    const rareSkills = userSkills.filter((skill) =>
      this.rareSkills.some((rare) => skill.toLowerCase().includes(rare.toLowerCase()))
    );
    if (rareSkills.length > 0) {
      advantages.push({
        type: "rare_skills",
        title: "Rare Technical Skills",
        description: `You have ${rareSkills.length} rare skill(s) that <10% of applicants typically have: ${rareSkills.slice(0, 3).join(", ")}`,
        impact: "high",
        skills: rareSkills,
      });
    }

    // Notable company experience
    const notableJobs = userProfile.employmentHistory.filter((job) =>
      this.notableCompanies.some((company) =>
        job.company && job.company.toLowerCase().includes(company.toLowerCase())
      )
    );
    if (notableJobs.length > 0) {
      advantages.push({
        type: "notable_companies",
        title: "Prestigious Company Experience",
        description: `You've worked at notable companies: ${notableJobs.map((j) => j.company).join(", ")}`,
        impact: "high",
        companies: notableJobs.map((j) => j.company),
      });
    }

    // Relevant certifications
    if (userProfile.certifications && userProfile.certifications.length > 0) {
      advantages.push({
        type: "certifications",
        title: "Professional Certifications",
        description: `You have ${userProfile.certifications.length} relevant certification(s)`,
        impact: "medium",
        certifications: userProfile.certifications.map((c) => c.name),
      });
    }

    // Experience level above requirement
    const title = (job.title || "").toLowerCase();
    let requiredYears = 3;
    if (title.includes("senior")) requiredYears = 5;
    else if (title.includes("staff") || title.includes("principal")) requiredYears = 8;

    if (userProfile.totalExperienceYears > requiredYears + 2) {
      advantages.push({
        type: "over_qualified",
        title: "Above Required Experience",
        description: `You have ${userProfile.totalExperienceYears} years of experience, exceeding the typical requirement of ${requiredYears} years`,
        impact: "medium",
      });
    }

    return advantages;
  }

  /**
   * Identify competitive disadvantages
   */
  identifyDisadvantages(userProfile, job) {
    const disadvantages = [];

    // Missing skills
    const skillsMatch = this.extractSkillsFromDescription(
      (job.job_description || "").toLowerCase()
    );
    const userSkills = userProfile.skills.map((s) => s.skill_name.toLowerCase());
    const missingSkills = skillsMatch.filter(
      (reqSkill) =>
        !userSkills.some((userSkill) => userSkill.includes(reqSkill) || reqSkill.includes(userSkill))
    );

    if (missingSkills.length > 0) {
      disadvantages.push({
        type: "missing_skills",
        title: "Missing Key Skills",
        description: `The job requires skills you don't have: ${missingSkills.slice(0, 5).join(", ")}`,
        severity: missingSkills.length > 3 ? "high" : "medium",
        mitigation: `Consider learning these skills through online courses, side projects, or certifications. Highlight transferable skills in your application.`,
        missingSkills: missingSkills,
      });
    }

    // Experience gap
    const title = (job.title || "").toLowerCase();
    let requiredYears = 3;
    if (title.includes("senior")) requiredYears = 5;
    else if (title.includes("staff") || title.includes("principal")) requiredYears = 8;

    if (userProfile.totalExperienceYears < requiredYears - 1) {
      disadvantages.push({
        type: "experience_gap",
        title: "Below Required Experience",
        description: `The role typically requires ${requiredYears} years of experience, but you have ${userProfile.totalExperienceYears} years`,
        severity: userProfile.totalExperienceYears < requiredYears - 2 ? "high" : "medium",
        mitigation: `Emphasize relevant projects, internships, or accelerated learning. Highlight impact over years. Consider applying to a more junior role first.`,
      });
    }

    // Education mismatch
    const jobDesc = (job.job_description || "").toLowerCase();
    const requiresDegree = jobDesc.includes("degree") || jobDesc.includes("bachelor") || jobDesc.includes("master");
    const hasRelevantDegree = userProfile.education.some(
      (edu) => edu.field && edu.field.toLowerCase().includes("computer")
    );

    if (requiresDegree && !hasRelevantDegree && userProfile.education.length === 0) {
      disadvantages.push({
        type: "education_mismatch",
        title: "Education Requirements",
        description: "The role may require a relevant degree or equivalent experience",
        severity: "low",
        mitigation: "Emphasize practical experience, bootcamp completion, or self-taught expertise. Highlight relevant projects and achievements.",
      });
    }

    return disadvantages;
  }

  /**
   * Estimate interview likelihood
   */
  estimateInterviewLikelihood(competitiveScore, applicantCount, advantages, disadvantages, job) {
    // Base likelihood by role level
    const title = (job.title || "").toLowerCase();
    let baseLikelihood = 8; // Default mid-level

    if (title.includes("junior") || title.includes("entry")) {
      baseLikelihood = 10;
    } else if (title.includes("senior")) {
      baseLikelihood = 5;
    } else if (title.includes("staff") || title.includes("principal")) {
      baseLikelihood = 3;
    } else if (title.includes("director") || title.includes("vp")) {
      baseLikelihood = 2;
    }

    // Competitive score multiplier
    const scoreMultiplier = competitiveScore / 100;

    // Advantage bonus
    const advantageBonus = advantages.reduce((sum, adv) => {
      if (adv.impact === "high") return sum + 3;
      if (adv.impact === "medium") return sum + 1.5;
      return sum;
    }, 0);

    // Disadvantage penalty
    const disadvantagePenalty = disadvantages.reduce((sum, dis) => {
      if (dis.severity === "high") return sum + 3;
      if (dis.severity === "medium") return sum + 1.5;
      return sum;
    }, 0);

    // Applicant count penalty (more applicants = lower chance)
    const applicantPenalty = Math.max(0, (applicantCount.total - 500) / 100) * 0.1;

    let likelihood = baseLikelihood * scoreMultiplier + advantageBonus - disadvantagePenalty - applicantPenalty;
    likelihood = Math.max(1, Math.min(50, likelihood)); // Clamp between 1% and 50%

    // Determine level
    let level = "low";
    if (likelihood >= 20) level = "high";
    else if (likelihood >= 10) level = "medium";

    return {
      percentage: Math.round(likelihood * 10) / 10,
      level,
    };
  }

  /**
   * Generate differentiating strategies
   */
  generateDifferentiatingStrategies(job, advantages, disadvantages, userProfile) {
    const strategies = [];

    // Customize application materials
    strategies.push({
      priority: "high",
      title: "Customize Resume & Cover Letter",
      description: `Tailor your resume and cover letter to match keywords from the job description. Highlight ${advantages.length > 0 ? advantages[0].title.toLowerCase() : "relevant experience"} prominently.`,
      estimatedImpact: 15,
      category: "application_materials",
    });

    // Get referral
    if (!job.application_method || !job.application_method.toLowerCase().includes("referral")) {
      strategies.push({
        priority: "high",
        title: "Seek Employee Referral",
        description: `Getting a referral from a ${job.company} employee can increase your interview chances by 3-5x. Use LinkedIn to find connections.`,
        estimatedImpact: 20,
        category: "networking",
      });
    }

    // Address missing skills
    const missingSkillsDis = disadvantages.find((d) => d.type === "missing_skills");
    if (missingSkillsDis && missingSkillsDis.missingSkills.length > 0) {
      strategies.push({
        priority: "high",
        title: "Address Missing Skills",
        description: `Quickly learn or demonstrate proficiency in: ${missingSkillsDis.missingSkills.slice(0, 3).join(", ")}. Build a small project or complete a course.`,
        estimatedImpact: 12,
        category: "skill_development",
      });
    }

    // Apply early
    const daysSincePosting = job.created_at
      ? Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 30;
    if (daysSincePosting < 7) {
      strategies.push({
        priority: "medium",
        title: "Apply Quickly",
        description: "This posting is less than a week old. Early applicants often have higher response rates.",
        estimatedImpact: 8,
        category: "timing",
      });
    }

    // Build portfolio project
    if (missingSkillsDis) {
      strategies.push({
        priority: "medium",
        title: "Create Relevant Portfolio Project",
        description: `Build a project showcasing ${missingSkillsDis.missingSkills[0] || "relevant skills"} and add it to your portfolio/GitHub.`,
        estimatedImpact: 10,
        category: "portfolio",
      });
    }

    // Network with employees
    strategies.push({
      priority: "medium",
      title: "Network with Company Employees",
      description: `Connect with ${job.company} employees on LinkedIn. Ask for informational interviews to learn about the role and company culture.`,
      estimatedImpact: 12,
      category: "networking",
    });

    // Sort by priority
    return strategies.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Compare user profile to typical hired candidate
   */
  async compareToTypicalHiredProfile(userProfile, job) {
    // For now, use industry benchmarks (can be enhanced with historical data later)
    const title = (job.title || "").toLowerCase();
    let typicalExperience = 3;
    let typicalEducation = "Bachelor's in Computer Science";

    if (title.includes("senior")) {
      typicalExperience = 6;
      typicalEducation = "Bachelor's or Master's in CS/Engineering";
    } else if (title.includes("staff") || title.includes("principal")) {
      typicalExperience = 10;
      typicalEducation = "Master's in CS/Engineering or equivalent";
    }

    const comparison = {
      experience: {
        user: userProfile.totalExperienceYears || 0,
        typical: typicalExperience,
        match: Math.abs((userProfile.totalExperienceYears || 0) - typicalExperience) <= 2,
      },
      education: {
        user: userProfile.education.length > 0 ? userProfile.education[0].degree_type : "None",
        typical: typicalEducation,
        match: userProfile.education.some((edu) => edu.field && edu.field.toLowerCase().includes("computer")),
      },
      skills: {
        user: userProfile.skills.length,
        typical: "8-12 relevant skills",
        match: userProfile.skills.length >= 8,
      },
      companyPrestige: {
        user: userProfile.employmentHistory.some((job) =>
          this.notableCompanies.some((company) =>
            job.company && job.company.toLowerCase().includes(company.toLowerCase())
          )
        )
          ? "Notable companies"
          : "Standard companies",
        typical: "Mix of startups and established companies",
        match: true, // Not a strict requirement
      },
    };

    return comparison;
  }

  /**
   * Get prioritized applications list
   */
  async prioritizeApplications(userId) {
    const jobsRes = await database.query(
      `
      SELECT 
        jo.*,
        ci.size as company_size
      FROM job_opportunities jo
      LEFT JOIN company_info ci ON ci.job_id = jo.id
      WHERE jo.user_id = $1 
        AND jo.status IN ('Interested', 'Applied')
        AND jo.archived = false
      ORDER BY jo.created_at DESC
    `,
      [userId]
    );

    const userProfile = await this.getUserProfile(userId);
    const prioritized = [];

    for (const job of jobsRes.rows) {
      const competitiveScore = await this.calculateCompetitiveScore(userProfile, job);
      const advantages = this.identifyAdvantages(userProfile, job);
      const disadvantages = this.identifyDisadvantages(userProfile, job);
      const interviewLikelihood = this.estimateInterviewLikelihood(
        competitiveScore,
        { total: 100 }, // Simplified for prioritization
        advantages,
        disadvantages,
        job
      );

      prioritized.push({
        jobId: job.id,
        title: job.title,
        company: job.company,
        status: job.status,
        competitiveScore: Math.round(competitiveScore),
        interviewLikelihood: interviewLikelihood.percentage,
        advantagesCount: advantages.length,
        disadvantagesCount: disadvantages.length,
        reasoning: this.generatePrioritizationReasoning(competitiveScore, advantages, disadvantages),
      });
    }

    // Sort by competitive score (highest first)
    prioritized.sort((a, b) => b.competitiveScore - a.competitiveScore);

    return prioritized;
  }

  /**
   * Generate reasoning for prioritization
   */
  generatePrioritizationReasoning(score, advantages, disadvantages) {
    if (score >= 80) {
      return "Highly competitive - strong match with multiple advantages";
    } else if (score >= 60) {
      return "Moderately competitive - good match with some advantages";
    } else if (score >= 40) {
      return "Moderate competitiveness - some gaps but manageable";
    } else {
      return "Lower competitiveness - significant gaps, consider improving profile first";
    }
  }

  /**
   * Calculate confidence in analysis
   */
  calculateConfidence(job, userProfile) {
    let confidence = 50; // Base confidence

    // Job description quality
    if (job.job_description && job.job_description.length > 200) {
      confidence += 20;
    }

    // Company info available
    if (job.company_size) {
      confidence += 10;
    }

    // User profile completeness
    if (userProfile) {
      if (userProfile.skills.length > 5) confidence += 10;
      if (userProfile.employmentHistory.length > 0) confidence += 10;
    }

    return Math.min(100, confidence);
  }

  /**
   * Get user profile data
   */
  async getUserProfile(userId) {
    // Fetch profile
    const profileRes = await database.query(
      `SELECT * FROM profiles WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    // Fetch skills
    const skillsRes = await database.query(
      `SELECT skill_name, proficiency, category FROM skills WHERE user_id = $1`,
      [userId]
    );

    // Fetch education
    const educationRes = await database.query(
      `SELECT school, degree_type, field FROM educations WHERE user_id = $1 ORDER BY graddate DESC`,
      [userId]
    );

    // Fetch employment history
    const jobsRes = await database.query(
      `SELECT title, company, start_date, end_date FROM jobs WHERE user_id = $1 ORDER BY start_date DESC`,
      [userId]
    );

    // Calculate total experience years
    let totalYears = 0;
    for (const job of jobsRes.rows) {
      const start = new Date(job.start_date);
      const end = job.end_date ? new Date(job.end_date) : new Date();
      const years = (end - start) / (1000 * 60 * 60 * 24 * 365);
      totalYears += years;
    }

    // Fetch certifications
    const certsRes = await database.query(
      `SELECT name FROM certifications WHERE user_id = $1`,
      [userId]
    );

    return {
      userId,
      profile: profileRes.rows[0] || {},
      skills: skillsRes.rows,
      education: educationRes.rows,
      employmentHistory: jobsRes.rows,
      totalExperienceYears: Math.round(totalYears * 10) / 10,
      certifications: certsRes.rows,
    };
  }
}

export default new CompetitiveAnalysisService();
