import database from "./database.js";

class PracticeAnalysisService {
  /**
   * Calculate practice score based on writing practice, mock interviews, and preparation activities
   */
  async calculatePracticeScore(userId, daysBeforeInterview = 30) {
    try {
      const breakdown = {
        writingPractice: { score: 0, status: "missing", notes: [], sessions: 0 },
        nervesExercises: { score: 0, status: "missing", notes: [], exercises: 0 },
        recentActivity: { score: 0, status: "missing", notes: [] },
      };

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBeforeInterview);

      // Get writing practice sessions (last 30 days)
      const writingResult = await database.query(
        `SELECT COUNT(*) as count, 
                SUM(time_spent_seconds) as total_time
         FROM writing_practice_sessions
         WHERE user_id = $1 
           AND is_completed = true
           AND session_date >= $2`,
        [userId, cutoffDate]
      );

      const writingCount = parseInt(writingResult.rows[0].count) || 0;
      const totalTime = parseInt(writingResult.rows[0].total_time) || 0;
      const hoursPracticed = totalTime / 3600;

      // Score based on sessions and hours
      let writingScore = 0;
      if (writingCount >= 10) {
        writingScore = 100;
        breakdown.writingPractice.status = "complete";
      } else if (writingCount >= 5) {
        writingScore = 75;
        breakdown.writingPractice.status = "partial";
      } else if (writingCount >= 2) {
        writingScore = 50;
        breakdown.writingPractice.status = "partial";
      } else if (writingCount > 0) {
        writingScore = 25;
        breakdown.writingPractice.status = "partial";
      } else {
        breakdown.writingPractice.status = "missing";
      }

      breakdown.writingPractice.score = writingScore;
      breakdown.writingPractice.sessions = writingCount;
      breakdown.writingPractice.notes.push(
        `${writingCount} completed session(s), ${hoursPracticed.toFixed(1)} hours`
      );

      // Get nerves management exercises
      const nervesResult = await database.query(
        `SELECT COUNT(*) as count
         FROM nerves_management_exercises
         WHERE user_id = $1 
           AND completed_at >= $2`,
        [userId, cutoffDate]
      );

      const nervesCount = parseInt(nervesResult.rows[0].count) || 0;
      let nervesScore = 0;
      if (nervesCount >= 5) {
        nervesScore = 100;
        breakdown.nervesExercises.status = "complete";
      } else if (nervesCount >= 2) {
        nervesScore = 60;
        breakdown.nervesExercises.status = "partial";
      } else if (nervesCount > 0) {
        nervesScore = 30;
        breakdown.nervesExercises.status = "partial";
      } else {
        breakdown.nervesExercises.status = "missing";
      }

      breakdown.nervesExercises.score = nervesScore;
      breakdown.nervesExercises.exercises = nervesCount;
      breakdown.nervesExercises.notes.push(`${nervesCount} exercise(s) completed`);

      // Recent activity (last 7 days)
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - 7);

      const recentWriting = await database.query(
        `SELECT COUNT(*) as count FROM writing_practice_sessions
         WHERE user_id = $1 AND session_date >= $2 AND is_completed = true`,
        [userId, recentCutoff]
      );
      const recentCount = parseInt(recentWriting.rows[0].count) || 0;

      if (recentCount > 0) {
        breakdown.recentActivity.score = 100;
        breakdown.recentActivity.status = "complete";
        breakdown.recentActivity.notes.push(`Active in last 7 days (${recentCount} sessions)`);
      } else {
        breakdown.recentActivity.score = 0;
        breakdown.recentActivity.status = "missing";
        breakdown.recentActivity.notes.push("No recent practice activity");
      }

      // Calculate overall score
      const overallScore =
        breakdown.writingPractice.score * 0.5 +
        breakdown.nervesExercises.score * 0.3 +
        breakdown.recentActivity.score * 0.2;

      const hasData = writingCount > 0 || nervesCount > 0;
      const status =
        overallScore >= 70 ? "complete" : overallScore >= 40 ? "partial" : "missing";

      return {
        score: Math.round(overallScore),
        hasData,
        status,
        breakdown,
        recentActivity: recentCount > 0,
      };
    } catch (error) {
      console.error("❌ Error calculating practice score:", error);
      return {
        score: 0,
        hasData: false,
        status: "error",
        breakdown: {},
        recentActivity: false,
      };
    }
  }
}

export default new PracticeAnalysisService();

