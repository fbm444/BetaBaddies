import database from "./database.js";

class CompanyResearchService {
  /**
   * Calculate company research score based on notes, insights, and research completion
   */
  async calculateResearchScore(jobOpportunityId, userId) {
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
      const breakdown = {
        companyInfo: { score: 0, status: "missing", notes: [] },
        notes: { score: 0, status: "missing", notes: [] },
        insights: { score: 0, status: "missing", notes: [] },
      };

      // Check company information completeness
      let companyInfoScore = 0;
      if (job.company && job.company.trim().length > 0) companyInfoScore += 25;
      if (job.location) companyInfoScore += 25;
      if (job.company_url) companyInfoScore += 25;
      if (job.salary_range || job.salary) companyInfoScore += 25;

      breakdown.companyInfo.score = companyInfoScore;
      breakdown.companyInfo.status =
        companyInfoScore === 100
          ? "complete"
          : companyInfoScore >= 50
          ? "partial"
          : "missing";
      breakdown.companyInfo.notes.push(
        `Company info ${breakdown.companyInfo.status} (${companyInfoScore}%)`
      );

      // Check for notes
      if (job.notes && job.notes.trim().length > 50) {
        breakdown.notes.score = 100;
        breakdown.notes.status = "complete";
        breakdown.notes.notes.push("Detailed notes available");
      } else if (job.notes && job.notes.trim().length > 0) {
        breakdown.notes.score = 50;
        breakdown.notes.status = "partial";
        breakdown.notes.notes.push("Brief notes available");
      } else {
        breakdown.notes.score = 0;
        breakdown.notes.status = "missing";
        breakdown.notes.notes.push("No notes added");
      }

      // Check for insights (can be extended with interview insights, etc.)
      // For now, check if there are any interview notes
      const interviewResult = await database.query(
        `SELECT COUNT(*) as count FROM interviews 
         WHERE job_opportunity_id = $1 AND user_id = $2`,
        [jobOpportunityId, userId]
      );
      const interviewCount = parseInt(interviewResult.rows[0].count);

      if (interviewCount > 0) {
        breakdown.insights.score = 80;
        breakdown.insights.status = "partial";
        breakdown.insights.notes.push(`${interviewCount} interview(s) scheduled`);
      } else {
        breakdown.insights.score = 30;
        breakdown.insights.status = "missing";
        breakdown.insights.notes.push("No interviews scheduled yet");
      }

      // Calculate overall score
      const overallScore =
        breakdown.companyInfo.score * 0.4 +
        breakdown.notes.score * 0.35 +
        breakdown.insights.score * 0.25;

      const hasData = job.company || job.notes || interviewCount > 0;
      const status =
        overallScore >= 80 ? "complete" : overallScore >= 50 ? "partial" : "missing";

      return {
        score: Math.round(overallScore),
        hasData,
        status,
        breakdown,
      };
    } catch (error) {
      console.error("❌ Error calculating research score:", error);
      return {
        score: 0,
        hasData: false,
        status: "error",
        breakdown: {},
      };
    }
  }
}

export default new CompanyResearchService();
