import database from "./database.js";

class RoleMatchService {
  /**
   * Calculate role match score based on skills, experience, and education alignment
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
      const breakdown = {
        skills: { score: 0, status: "unknown", notes: [] },
        experience: { score: 0, status: "unknown", notes: [] },
        education: { score: 0, status: "unknown", notes: [] },
        industry: { score: 0, status: "unknown", notes: [] },
      };

      // Get user profile for comparison
      const profileResult = await database.query(
        `SELECT * FROM profiles WHERE user_id = $1`,
        [userId]
      );
      const profile = profileResult.rows[0] || {};

      // Skills match (simplified - can be enhanced with actual skills matching)
      // For now, check if job description mentions common skills
      const jobDescription = (job.description || "").toLowerCase();
      const jobTitle = (job.position || "").toLowerCase();
      
      // Basic keyword matching (can be enhanced)
      const commonTechSkills = ["javascript", "python", "react", "node", "sql", "java", "typescript"];
      const foundSkills = commonTechSkills.filter((skill) =>
        jobDescription.includes(skill) || jobTitle.includes(skill)
      );
      
      // If we have job description, assume some skills match
      if (jobDescription.length > 50) {
        breakdown.skills.score = 70; // Default moderate match
        breakdown.skills.status = "partial";
        breakdown.skills.notes.push("Job description available, skills analysis needed");
      } else {
        breakdown.skills.score = 50;
        breakdown.skills.status = "unknown";
        breakdown.skills.notes.push("Limited job description");
      }

      // Experience level match
      const userExpLevel = profile.exp_level || "";
      const jobLevel = jobTitle.includes("senior")
        ? "Senior"
        : jobTitle.includes("junior") || jobTitle.includes("entry")
        ? "Entry"
        : "Mid";

      if (userExpLevel && jobLevel) {
        const levelMatch =
          userExpLevel.toLowerCase() === jobLevel.toLowerCase() ? 100 : 60;
        breakdown.experience.score = levelMatch;
        breakdown.experience.status = levelMatch === 100 ? "complete" : "partial";
        breakdown.experience.notes.push(
          `User: ${userExpLevel}, Job: ${jobLevel} (${levelMatch}% match)`
        );
      } else {
        breakdown.experience.score = 50;
        breakdown.experience.status = "unknown";
        breakdown.experience.notes.push("Experience level comparison unavailable");
      }

      // Education match (simplified)
      if (jobDescription.includes("degree") || jobDescription.includes("bachelor")) {
        breakdown.education.score = 80; // Assume user has education if profile exists
        breakdown.education.status = "partial";
        breakdown.education.notes.push("Education requirements mentioned");
      } else {
        breakdown.education.score = 100; // No specific requirements
        breakdown.education.status = "complete";
        breakdown.education.notes.push("No specific education requirements");
      }

      // Industry match
      const userIndustry = profile.industry || "";
      if (userIndustry && job.company) {
        // Basic industry matching (can be enhanced)
        breakdown.industry.score = 70;
        breakdown.industry.status = "partial";
        breakdown.industry.notes.push("Industry match analysis needed");
      } else {
        breakdown.industry.score = 50;
        breakdown.industry.status = "unknown";
        breakdown.industry.notes.push("Industry information limited");
      }

      // Calculate overall score (weighted)
      const overallScore =
        breakdown.skills.score * 0.35 +
        breakdown.experience.score * 0.30 +
        breakdown.education.score * 0.20 +
        breakdown.industry.score * 0.15;

      const hasData = job.description || job.position || profile.exp_level;
      const status =
        overallScore >= 80 ? "complete" : overallScore >= 50 ? "partial" : "missing";

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
}

export default new RoleMatchService();

