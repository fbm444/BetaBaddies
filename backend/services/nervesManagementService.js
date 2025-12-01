import database from "./database.js";
import jobOpportunityService from "./jobOpportunityService.js";
import { v4 as uuidv4 } from "uuid";

class NervesManagementService {
  // Get exercises for a session
  async getExercisesForSession(sessionId, userId) {
    // Return available exercise types
    return [
      {
        id: "breathing",
        type: "breathing",
        title: "Breathing Exercise",
        description: "Guided breathing exercise to calm nerves",
        duration: 300, // 5 minutes
      },
      {
        id: "visualization",
        type: "visualization",
        title: "Visualization Exercise",
        description: "Visualize a successful interview",
        duration: 600, // 10 minutes
      },
      {
        id: "affirmation",
        type: "affirmation",
        title: "Affirmation Exercise",
        description: "Positive affirmations for confidence",
        duration: 180, // 3 minutes
      },
    ];
  }

  // Complete an exercise
  async completeExercise(exerciseId, userId, exerciseData) {
    const {
      exerciseType,
      sessionId = null,
      effectivenessRating,
      notes = "",
    } = exerciseData;

    if (!exerciseType) {
      throw new Error("Exercise type is required");
    }

    const id = uuidv4();
    await database.query(
      `INSERT INTO nerves_management_exercises (
        id, user_id, session_id, exercise_type, exercise_data,
        completed_at, effectiveness_rating, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        userId,
        sessionId,
        exerciseType,
        JSON.stringify(exerciseData.exerciseData || {}),
        new Date(),
        effectivenessRating,
        notes,
      ]
    );

    return await this.getExerciseById(id, userId);
  }

  // Get exercise by ID
  async getExerciseById(exerciseId, userId) {
    const result = await database.query(
      `SELECT * FROM nerves_management_exercises
       WHERE id = $1 AND user_id = $2`,
      [exerciseId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapExerciseToObject(result.rows[0]);
  }

  // Get exercise history
  async getExerciseHistory(userId, limit = 20) {
    const result = await database.query(
      `SELECT * FROM nerves_management_exercises
       WHERE user_id = $1 AND completed_at IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row) => this.mapExerciseToObject(row));
  }

  // Generate preparation checklist for interview
  async generatePreparationChecklist(jobOpportunityId, userId) {
    // Get job opportunity details
    const jobOpp = await jobOpportunityService.getJobOpportunityById(
      jobOpportunityId,
      userId
    );

    if (!jobOpp) {
      throw new Error("Job opportunity not found");
    }

    // Generate checklist items
    const checklist = [
      {
        id: "research-company",
        item: `Research ${jobOpp.company}`,
        description: "Learn about the company's mission, values, and recent news",
        completed: false,
      },
      {
        id: "review-job-description",
        item: "Review job description",
        description: "Understand key requirements and responsibilities",
        completed: false,
      },
      {
        id: "prepare-questions",
        item: "Prepare questions to ask",
        description: "Prepare 3-5 thoughtful questions about the role and company",
        completed: false,
      },
      {
        id: "practice-responses",
        item: "Practice common interview questions",
        description: "Use writing practice tool to prepare responses",
        completed: false,
      },
      {
        id: "test-technology",
        item: "Test video call technology",
        description: "Ensure camera, microphone, and internet connection work",
        completed: false,
      },
      {
        id: "prepare-environment",
        item: "Prepare interview environment",
        description: "Choose quiet location with good lighting and background",
        completed: false,
      },
      {
        id: "review-resume",
        item: "Review your resume",
        description: "Be ready to discuss your experience and achievements",
        completed: false,
      },
      {
        id: "plan-attire",
        item: "Plan professional attire",
        description: "Choose appropriate professional clothing",
        completed: false,
      },
    ];

    return {
      jobOpportunityId,
      jobTitle: jobOpp.title,
      company: jobOpp.company,
      checklist,
      generatedAt: new Date(),
    };
  }

  // Map database row to object
  mapExerciseToObject(row) {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      exerciseType: row.exercise_type,
      exerciseData: row.exercise_data || {},
      completedAt: row.completed_at,
      effectivenessRating: row.effectiveness_rating,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }
}

export default new NervesManagementService();

