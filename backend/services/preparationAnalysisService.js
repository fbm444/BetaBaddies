import database from "./database.js";

class PreparationAnalysisService {
  /**
   * Calculate preparation score based on application completeness
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
        resume: { score: 0, status: "missing", notes: [] },
        coverLetter: { score: 0, status: "missing", notes: [] },
        application: { score: 0, status: "missing", notes: [] },
      };

      // Check resume match (if resume_id exists)
      if (job.resume_id) {
        breakdown.resume.score = 100;
        breakdown.resume.status = "complete";
        breakdown.resume.notes.push("Resume attached");
      } else {
        breakdown.resume.score = 0;
        breakdown.resume.status = "missing";
        breakdown.resume.notes.push("No resume attached");
      }

      // Check cover letter
      if (job.cover_letter && job.cover_letter.trim().length > 50) {
        breakdown.coverLetter.score = 100;
        breakdown.coverLetter.status = "complete";
        breakdown.coverLetter.notes.push("Cover letter provided");
      } else if (job.cover_letter && job.cover_letter.trim().length > 0) {
        breakdown.coverLetter.score = 50;
        breakdown.coverLetter.status = "partial";
        breakdown.coverLetter.notes.push("Cover letter too short");
      } else {
        breakdown.coverLetter.score = 0;
        breakdown.coverLetter.status = "missing";
        breakdown.coverLetter.notes.push("No cover letter");
      }

      // Check application completeness
      let applicationScore = 0;
      if (job.company && job.company.trim().length > 0) applicationScore += 25;
      if (job.position && job.position.trim().length > 0) applicationScore += 25;
      if (job.location) applicationScore += 25;
      if (job.application_date) applicationScore += 25;

      breakdown.application.score = applicationScore;
      breakdown.application.status =
        applicationScore === 100 ? "complete" : applicationScore >= 50 ? "partial" : "missing";
      breakdown.application.notes.push(
        `Application ${breakdown.application.status} (${applicationScore}%)`
      );

      // Calculate overall score (weighted average)
      const overallScore =
        breakdown.resume.score * 0.4 +
        breakdown.coverLetter.score * 0.3 +
        breakdown.application.score * 0.3;

      const hasData = job.resume_id || job.cover_letter || job.company;
      const status = overallScore === 100 ? "complete" : overallScore >= 50 ? "partial" : "missing";

      return {
        score: Math.round(overallScore),
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
}

export default new PreparationAnalysisService();

