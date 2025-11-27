import { v4 as uuidv4 } from "uuid";
import database from "./database.js";

class NetworkingGoalService {
  // Create a new networking goal
  async createGoal(userId, goalData) {
    const {
      goalDescription,
      targetIndustry,
      targetCompanies,
      targetRoles,
      goalType,
      targetCount,
      deadline,
      status,
    } = goalData;

    try {
      const goalId = uuidv4();

      const query = `
        INSERT INTO networking_goals (
          id, user_id, goal_description, target_industry, target_companies,
          target_roles, goal_type, target_count, deadline, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await database.query(query, [
        goalId,
        userId,
        goalDescription || null,
        targetIndustry || null,
        targetCompanies ? JSON.stringify(targetCompanies) : null,
        targetRoles ? JSON.stringify(targetRoles) : null,
        goalType || null,
        targetCount || 0,
        deadline || null,
        status || "active",
      ]);

      return this.mapGoalFromDb(result.rows[0]);
    } catch (error) {
      console.error("Error creating networking goal:", error);
      throw error;
    }
  }

  // Get all goals for a user
  async getGoalsByUserId(userId, filters = {}) {
    try {
      let query = `
        SELECT * FROM networking_goals
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.goalType) {
        query += ` AND goal_type = $${paramIndex}`;
        params.push(filters.goalType);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await database.query(query, params);
      return result.rows.map((row) => this.mapGoalFromDb(row));
    } catch (error) {
      console.error("Error fetching networking goals:", error);
      throw error;
    }
  }

  // Get goal by ID
  async getGoalById(id, userId) {
    try {
      const query = `
        SELECT * FROM networking_goals
        WHERE id = $1 AND user_id = $2
      `;

      const result = await database.query(query, [id, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapGoalFromDb(result.rows[0]);
    } catch (error) {
      console.error("Error fetching networking goal:", error);
      throw error;
    }
  }

  // Update goal
  async updateGoal(id, userId, goalData) {
    const {
      goalDescription,
      targetIndustry,
      targetCompanies,
      targetRoles,
      goalType,
      targetCount,
      currentCount,
      deadline,
      status,
    } = goalData;

    try {
      const query = `
        UPDATE networking_goals
        SET
          goal_description = COALESCE($3, goal_description),
          target_industry = COALESCE($4, target_industry),
          target_companies = COALESCE($5, target_companies),
          target_roles = COALESCE($6, target_roles),
          goal_type = COALESCE($7, goal_type),
          target_count = COALESCE($8, target_count),
          current_count = COALESCE($9, current_count),
          deadline = COALESCE($10, deadline),
          status = COALESCE($11, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [
        id,
        userId,
        goalDescription !== undefined ? goalDescription : null,
        targetIndustry !== undefined ? targetIndustry : null,
        targetCompanies ? JSON.stringify(targetCompanies) : null,
        targetRoles ? JSON.stringify(targetRoles) : null,
        goalType !== undefined ? goalType : null,
        targetCount !== undefined ? targetCount : null,
        currentCount !== undefined ? currentCount : null,
        deadline !== undefined ? deadline : null,
        status !== undefined ? status : null,
      ]);

      if (result.rows.length === 0) {
        throw new Error("Goal not found");
      }

      return this.mapGoalFromDb(result.rows[0]);
    } catch (error) {
      console.error("Error updating networking goal:", error);
      throw error;
    }
  }

  // Delete goal
  async deleteGoal(id, userId) {
    try {
      const query = `
        DELETE FROM networking_goals
        WHERE id = $1 AND user_id = $2
      `;

      await database.query(query, [id, userId]);
    } catch (error) {
      console.error("Error deleting networking goal:", error);
      throw error;
    }
  }

  // Increment current count (when a goal is achieved)
  async incrementGoalProgress(id, userId, increment = 1) {
    try {
      const query = `
        UPDATE networking_goals
        SET current_count = current_count + $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [id, userId, increment]);
      return this.mapGoalFromDb(result.rows[0]);
    } catch (error) {
      console.error("Error incrementing goal progress:", error);
      throw error;
    }
  }

  // Map database row to goal object
  mapGoalFromDb(row) {
    return {
      id: row.id,
      userId: row.user_id,
      goalDescription: row.goal_description,
      targetIndustry: row.target_industry,
      targetCompanies: row.target_companies
        ? typeof row.target_companies === "string"
          ? JSON.parse(row.target_companies)
          : row.target_companies
        : [],
      targetRoles: row.target_roles
        ? typeof row.target_roles === "string"
          ? JSON.parse(row.target_roles)
          : row.target_roles
        : [],
      goalType: row.goal_type,
      targetCount: row.target_count || 0,
      currentCount: row.current_count || 0,
      deadline: row.deadline,
      status: row.status || "active",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new NetworkingGoalService();

