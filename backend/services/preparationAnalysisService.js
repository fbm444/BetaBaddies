import database from "./database.js";

class PreparationAnalysisService {
  /**
   * Calculate preparation score using weighted algorithm based on application completeness
   * Uses logistic regression-inspired scoring with diminishing returns
   */
  async calculatePreparationScore(jobOpportunityId, userId) {
    try {
      // Get job opportunity details
      const jobResult = await database.query(
        `SELECT * FROM job_opportunities WHERE id = $1 AND user_id = $2`,
        [jobOpportunityId, userId]
      );

      if (jobResult.rows.length === 0) {
        return {
          score: 0,
          hasData: false,
          status: "missing",
          breakdown: {
            resume: { score: 0, status: "missing" },
            coverLetter: { score: 0, status: "missing" },
            application: { score: 0, status: "missing" },
          },
        };
      }

      const job = jobResult.rows[0];
      const breakdown = {
        resume: { score: 0, status: "missing", notes: [], weight: 0.40 },
        coverLetter: { score: 0, status: "missing", notes: [], weight: 0.30 },
        application: { score: 0, status: "missing", notes: [], weight: 0.30 },
      };

      // 1. RESUME SCORE - Check if resume is attached and quality
      const resumeScore = await this.calculateResumeScore(job, userId);
      breakdown.resume = { ...breakdown.resume, ...resumeScore };

      // 2. COVER LETTER SCORE - Analyze cover letter quality
      const coverLetterScore = this.calculateCoverLetterScore(job);
      breakdown.coverLetter = { ...breakdown.coverLetter, ...coverLetterScore };

      // 3. APPLICATION COMPLETENESS - Check all required fields
      const applicationScore = this.calculateApplicationCompleteness(job);
      breakdown.application = { ...breakdown.application, ...applicationScore };

      // Calculate overall score using weighted algorithm with bonus for completeness
      let overallScore =
        breakdown.resume.score * breakdown.resume.weight +
        breakdown.coverLetter.score * breakdown.coverLetter.weight +
        breakdown.application.score * breakdown.application.weight;

      // Bonus multiplier for having all components (diminishing returns)
      const componentsComplete = [
        breakdown.resume.score >= 80,
        breakdown.coverLetter.score >= 50,
        breakdown.application.score >= 80,
      ].filter(Boolean).length;

      if (componentsComplete === 3) {
        overallScore *= 1.1; // 10% bonus for complete application
      } else if (componentsComplete === 2) {
        overallScore *= 1.05; // 5% bonus for mostly complete
      }

      overallScore = Math.min(100, Math.round(overallScore));

      const hasData = job.resume_id || job.cover_letter || job.company;
      const status = overallScore >= 85 ? "complete" : overallScore >= 60 ? "partial" : "missing";

      return {
        score: overallScore,
        hasData,
        status,
        breakdown,
      };
    } catch (error) {
      console.error("❌ Error calculating preparation score:", error);
      return {
        score: 0,
        hasData: false,
        status: "error",
        breakdown: {},
      };
    }
  }

  /**
   * Calculate resume score based on attachment and quality indicators
   */
  async calculateResumeScore(job, userId) {
    if (!job.resume_id) {
      return {
        score: 0,
        status: "missing",
        notes: ["No resume attached - critical for application"],
      };
    }

    // Check if resume exists and has content
    try {
      const resumeResult = await database.query(
        `SELECT * FROM resumes WHERE id = $1 AND user_id = $2`,
        [job.resume_id, userId]
      );

      if (resumeResult.rows.length === 0) {
        return {
          score: 0,
          status: "missing",
          notes: ["Resume ID exists but resume not found"],
        };
      }

      const resume = resumeResult.rows[0];
      let score = 80; // Base score for having resume

      // Quality indicators
      if (resume.file_path || resume.file_url) score += 10; // Has file
      if (resume.updated_at) {
        const daysSinceUpdate = (new Date() - new Date(resume.updated_at)) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 30) score += 10; // Recent update
      }

      return {
        score: Math.min(100, score),
        status: score >= 90 ? "complete" : "partial",
        notes: [
          "Resume attached",
          resume.updated_at ? "Resume recently updated" : "Resume may need updating",
        ],
      };
    } catch (error) {
      return {
        score: 70, // Partial credit if we can't verify
        status: "partial",
        notes: ["Resume ID present but verification failed"],
      };
    }
  }

  /**
   * Calculate cover letter score based on length and quality
   */
  calculateCoverLetterScore(job) {
    if (!job.cover_letter || job.cover_letter.trim().length === 0) {
      return {
        score: 0,
        status: "missing",
        notes: ["No cover letter provided"],
      };
    }

    const letterLength = job.cover_letter.trim().length;
    let score = 0;
    const notes = [];

    // Length-based scoring (optimal: 250-400 words)
    if (letterLength < 100) {
      score = 30;
      notes.push("Cover letter too short (less than 100 characters)");
    } else if (letterLength < 500) {
      score = 60;
      notes.push("Cover letter is brief but present");
    } else if (letterLength < 1500) {
      score = 90;
      notes.push("Cover letter has good length");
    } else if (letterLength < 3000) {
      score = 100;
      notes.push("Cover letter is comprehensive");
    } else {
      score = 85; // Slightly penalize overly long letters
      notes.push("Cover letter is very long (may be too verbose)");
    }

    // Quality indicators
    const wordCount = job.cover_letter.split(/\s+/).length;
    if (wordCount >= 200 && wordCount <= 400) {
      score += 5; // Bonus for optimal word count
    }

    // Check for personalization indicators
    if (job.cover_letter.includes(job.company || "")) {
      score += 5; // Mentions company name
    }
    if (job.cover_letter.toLowerCase().includes("i am") || 
        job.cover_letter.toLowerCase().includes("i have")) {
      score += 5; // Has personal statements
    }

    return {
      score: Math.min(100, Math.round(score)),
      status: score >= 80 ? "complete" : score >= 50 ? "partial" : "missing",
      notes,
    };
  }

  /**
   * Calculate application completeness score
   */
  calculateApplicationCompleteness(job) {
    let score = 0;
    const notes = [];
    const maxScore = 100;
    const pointsPerField = maxScore / 8; // 8 important fields

    // Required fields (higher weight)
    if (job.company && job.company.trim().length > 0) {
      score += pointsPerField * 1.5; // 18.75 points
      notes.push("Company name provided");
    }
    if (job.position || job.title) {
      score += pointsPerField * 1.5; // 18.75 points
      notes.push("Job title provided");
    }
    if (job.location) {
      score += pointsPerField; // 12.5 points
      notes.push("Location provided");
    }
    if (job.application_date) {
      score += pointsPerField; // 12.5 points
      notes.push("Application date recorded");
    }

    // Optional but valuable fields
    if (job.description && job.description.trim().length > 50) {
      score += pointsPerField * 0.8; // 10 points
      notes.push("Job description available");
    }
    if (job.job_posting_url) {
      score += pointsPerField * 0.6; // 7.5 points
      notes.push("Job posting URL saved");
    }
    if (job.salary_range || job.salary) {
      score += pointsPerField * 0.6; // 7.5 points
      notes.push("Salary information available");
    }
    if (job.notes && job.notes.trim().length > 20) {
      score += pointsPerField * 0.4; // 5 points
      notes.push("Additional notes added");
    }

    const status = score >= 80 ? "complete" : score >= 50 ? "partial" : "missing";
    if (notes.length === 0) {
      notes.push("Application information incomplete");
    }

    return {
      score: Math.min(100, Math.round(score)),
      status,
      notes,
    };
  }
}

export default new PreparationAnalysisService();
