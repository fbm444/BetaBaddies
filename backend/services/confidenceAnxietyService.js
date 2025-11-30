import database from "./database.js";
import { v4 as uuidv4 } from "uuid";

class ConfidenceAnxietyService {
  /**
   * Create pre-interview assessment
   */
  async createPreAssessment(userId, interviewId, assessmentData) {
    const { confidenceLevel, anxietyLevel, preparationHours, notes } = assessmentData;

    try {
      // Validate inputs
      if (confidenceLevel < 0 || confidenceLevel > 100) {
        throw new Error("Confidence level must be between 0 and 100");
      }
      if (anxietyLevel < 0 || anxietyLevel > 100) {
        throw new Error("Anxiety level must be between 0 and 100");
      }
      if (preparationHours < 0) {
        throw new Error("Preparation hours cannot be negative");
      }

      // Check if assessment already exists
      const existing = await database.query(
        "SELECT id FROM interview_pre_assessment WHERE interview_id = $1",
        [interviewId]
      );

      let assessmentId;
      if (existing.rows.length > 0) {
        // Update existing assessment
        assessmentId = existing.rows[0].id;
        await database.query(
          `UPDATE interview_pre_assessment 
           SET confidence_level = $1, anxiety_level = $2, preparation_hours = $3, notes = $4, updated_at = NOW()
           WHERE id = $5`,
          [confidenceLevel, anxietyLevel, preparationHours || 0, notes || null, assessmentId]
        );
      } else {
        // Create new assessment
        assessmentId = uuidv4();
        await database.query(
          `INSERT INTO interview_pre_assessment (id, interview_id, user_id, confidence_level, anxiety_level, preparation_hours, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [assessmentId, interviewId, userId, confidenceLevel, anxietyLevel, preparationHours || 0, notes || null]
        );
      }

      return { id: assessmentId, interviewId, userId };
    } catch (error) {
      console.error("❌ Error creating pre-assessment:", error);
      throw error;
    }
  }

  /**
   * Create post-interview reflection
   */
  async createPostReflection(userId, interviewId, reflectionData) {
    const {
      postConfidenceLevel,
      postAnxietyLevel,
      whatWentWell,
      whatToImprove,
      overallFeeling,
    } = reflectionData;

    try {
      // Validate inputs
      if (postConfidenceLevel !== null && (postConfidenceLevel < 0 || postConfidenceLevel > 100)) {
        throw new Error("Confidence level must be between 0 and 100");
      }
      if (postAnxietyLevel !== null && (postAnxietyLevel < 0 || postAnxietyLevel > 100)) {
        throw new Error("Anxiety level must be between 0 and 100");
      }

      // Check if reflection already exists
      const existing = await database.query(
        "SELECT id FROM interview_post_reflection WHERE interview_id = $1",
        [interviewId]
      );

      if (existing.rows.length > 0) {
        // Update existing reflection
        await database.query(
          `UPDATE interview_post_reflection 
           SET post_confidence_level = $1, post_anxiety_level = $2, 
               what_went_well = $3, what_to_improve = $4, overall_feeling = $5
           WHERE interview_id = $6`,
          [
            postConfidenceLevel,
            postAnxietyLevel,
            whatWentWell || null,
            whatToImprove || null,
            overallFeeling || null,
            interviewId,
          ]
        );
        return { id: existing.rows[0].id, interviewId, userId };
      } else {
        // Create new reflection
        const reflectionId = uuidv4();
        await database.query(
          `INSERT INTO interview_post_reflection 
           (id, interview_id, user_id, post_confidence_level, post_anxiety_level, what_went_well, what_to_improve, overall_feeling)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            reflectionId,
            interviewId,
            userId,
            postConfidenceLevel || null,
            postAnxietyLevel || null,
            whatWentWell || null,
            whatToImprove || null,
            overallFeeling || null,
          ]
        );
        return { id: reflectionId, interviewId, userId };
      }
    } catch (error) {
      console.error("❌ Error creating post-reflection:", error);
      throw error;
    }
  }

  /**
   * Get pre-assessment by interview ID
   */
  async getPreAssessment(userId, interviewId) {
    try {
      const result = await database.query(
        `SELECT id, interview_id, confidence_level, anxiety_level, preparation_hours, notes, created_at
         FROM interview_pre_assessment
         WHERE interview_id = $1 AND user_id = $2`,
        [interviewId, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Error getting pre-assessment:", error);
      throw error;
    }
  }

  /**
   * Get post-reflection by interview ID
   */
  async getPostReflection(userId, interviewId) {
    try {
      const result = await database.query(
        `SELECT id, interview_id, post_confidence_level, post_anxiety_level, 
                what_went_well, what_to_improve, overall_feeling, created_at
         FROM interview_post_reflection
         WHERE interview_id = $1 AND user_id = $2`,
        [interviewId, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Error getting post-reflection:", error);
      throw error;
    }
  }

  /**
   * Get confidence trends over time
   */
  async getConfidenceTrends(userId, months = 12) {
    try {
      const monthsNum = parseInt(months);
      const query = `
        SELECT 
          DATE_TRUNC('month', ipa.created_at) as period,
          AVG(ipa.confidence_level)::numeric(5,2) as avg_pre_confidence,
          COUNT(*) as assessment_count
        FROM interview_pre_assessment ipa
        JOIN interviews i ON ipa.interview_id = i.id
        WHERE ipa.user_id = $1
          AND ipa.created_at >= NOW() - INTERVAL '${monthsNum} months'
        GROUP BY DATE_TRUNC('month', ipa.created_at)
        ORDER BY period ASC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        period: row.period ? new Date(row.period).toISOString().substring(0, 7) : null,
        avgPreConfidence: row.avg_pre_confidence ? parseFloat(row.avg_pre_confidence) : null,
        assessmentCount: parseInt(row.assessment_count) || 0,
      }));
    } catch (error) {
      console.error("❌ Error getting confidence trends:", error);
      throw error;
    }
  }

  /**
   * Get confidence change (pre vs post)
   */
  async getConfidenceChange(userId) {
    try {
      const query = `
        SELECT 
          ipa.confidence_level as pre_confidence,
          ipr.post_confidence_level as post_confidence,
          i.outcome,
          i.format
        FROM interview_pre_assessment ipa
        LEFT JOIN interview_post_reflection ipr ON ipa.interview_id = ipr.interview_id
        JOIN interviews i ON ipa.interview_id = i.id
        WHERE ipa.user_id = $1
          AND ipr.post_confidence_level IS NOT NULL
        ORDER BY ipa.created_at DESC
        LIMIT 50
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        preConfidence: parseInt(row.pre_confidence) || 0,
        postConfidence: parseInt(row.post_confidence) || 0,
        change: (parseInt(row.post_confidence) || 0) - (parseInt(row.pre_confidence) || 0),
        outcome: row.outcome,
        format: row.format,
      }));
    } catch (error) {
      console.error("❌ Error getting confidence change:", error);
      throw error;
    }
  }

  /**
   * Get anxiety management progress
   */
  async getAnxietyProgress(userId, months = 12) {
    try {
      const monthsNum = parseInt(months);
      const query = `
        SELECT 
          DATE_TRUNC('month', ipa.created_at) as period,
          AVG(ipa.anxiety_level)::numeric(5,2) as avg_pre_anxiety,
          COUNT(*) as assessment_count
        FROM interview_pre_assessment ipa
        JOIN interviews i ON ipa.interview_id = i.id
        WHERE ipa.user_id = $1
          AND ipa.created_at >= NOW() - INTERVAL '${monthsNum} months'
        GROUP BY DATE_TRUNC('month', ipa.created_at)
        ORDER BY period ASC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        period: row.period ? new Date(row.period).toISOString().substring(0, 7) : null,
        avgPreAnxiety: row.avg_pre_anxiety ? parseFloat(row.avg_pre_anxiety) : null,
        assessmentCount: parseInt(row.assessment_count) || 0,
      }));
    } catch (error) {
      console.error("❌ Error getting anxiety progress:", error);
      throw error;
    }
  }

  /**
   * Get confidence vs performance correlation
   */
  async getConfidencePerformanceCorrelation(userId) {
    try {
      const query = `
        SELECT 
          CASE 
            WHEN ipa.confidence_level < 50 THEN 'Low (<50)'
            WHEN ipa.confidence_level < 70 THEN 'Medium (50-70)'
            WHEN ipa.confidence_level < 85 THEN 'High (70-85)'
            ELSE 'Very High (85+)'
          END as confidence_range,
          COUNT(*) FILTER (WHERE i.outcome = 'offer_extended') as offers,
          COUNT(*) FILTER (WHERE i.outcome IN ('passed', 'offer_extended')) as successful,
          COUNT(*) as total_interviews,
          AVG(ipa.confidence_level)::numeric(5,2) as avg_confidence
        FROM interview_pre_assessment ipa
        JOIN interviews i ON ipa.interview_id = i.id
        WHERE ipa.user_id = $1
          AND i.status = 'completed'
          AND i.outcome IS NOT NULL
        GROUP BY confidence_range
        ORDER BY avg_confidence ASC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        confidenceRange: row.confidence_range,
        offers: parseInt(row.offers) || 0,
        successful: parseInt(row.successful) || 0,
        totalInterviews: parseInt(row.total_interviews) || 0,
        successRate: row.total_interviews > 0 
          ? ((parseInt(row.successful) || 0) / parseInt(row.total_interviews)) * 100 
          : 0,
        avgConfidence: parseFloat(row.avg_confidence) || 0,
      }));
    } catch (error) {
      console.error("❌ Error getting confidence-performance correlation:", error);
      throw error;
    }
  }

  /**
   * Get preparation impact analysis
   */
  async getPreparationImpact(userId) {
    try {
      const query = `
        SELECT 
          CASE 
            WHEN ipa.preparation_hours = 0 THEN 'No Prep'
            WHEN ipa.preparation_hours < 5 THEN 'Low (<5h)'
            WHEN ipa.preparation_hours < 10 THEN 'Medium (5-10h)'
            WHEN ipa.preparation_hours < 20 THEN 'High (10-20h)'
            ELSE 'Very High (20h+)'
          END as preparation_level,
          COUNT(*) FILTER (WHERE i.outcome = 'offer_extended') as offers,
          COUNT(*) FILTER (WHERE i.outcome IN ('passed', 'offer_extended')) as successful,
          COUNT(*) as total_interviews,
          AVG(ipa.preparation_hours)::numeric(5,2) as avg_prep_hours
        FROM interview_pre_assessment ipa
        JOIN interviews i ON ipa.interview_id = i.id
        WHERE ipa.user_id = $1
          AND i.status = 'completed'
          AND i.outcome IS NOT NULL
        GROUP BY preparation_level
        ORDER BY avg_prep_hours ASC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        preparationLevel: row.preparation_level,
        offers: parseInt(row.offers) || 0,
        successful: parseInt(row.successful) || 0,
        totalInterviews: parseInt(row.total_interviews) || 0,
        successRate: row.total_interviews > 0 
          ? ((parseInt(row.successful) || 0) / parseInt(row.total_interviews)) * 100 
          : 0,
        avgPrepHours: parseFloat(row.avg_prep_hours) || 0,
      }));
    } catch (error) {
      console.error("❌ Error getting preparation impact:", error);
      throw error;
    }
  }
}

export default new ConfidenceAnxietyService();

