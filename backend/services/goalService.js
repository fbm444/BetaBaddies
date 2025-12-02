/**
 * Goal Service - UC-101: Goal Setting and Achievement Tracking
 * Uses career_goals and goal_milestones tables from sprint3
 */

import { v4 as uuidv4 } from "uuid";
import database from "./database.js";

class GoalService {
  // Create a new goal
  async createGoal(userId, goalData) {
    try {
      const {
        title,
        description,
        category,
        goalType,
        targetValue,
        currentValue = 0,
        unit,
        targetDate,
        priority = "medium",
      } = goalData;

      // Validate required fields
      if (!title || !title.trim()) {
        throw new Error("Title is required");
      }
      if (!category) {
        throw new Error("Category is required");
      }
      if (!goalType) {
        throw new Error("Goal type is required");
      }

      const goalId = uuidv4();
      const startDate = new Date().toISOString().split("T")[0];

      // Calculate progress percentage
      const progressPercentage =
        targetValue && targetValue > 0
          ? Math.min(Math.round((currentValue / targetValue) * 100), 100)
          : 0;

      const query = `
        INSERT INTO career_goals (
          id, user_id, goal_type, goal_category, goal_description,
          specific_metric, target_value, current_value, target_date,
          progress_percentage, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `;

      const result = await database.query(query, [
        goalId,
        userId,
        goalType,
        category,
        title, // goal_description stores the title
        description || title, // specific_metric can store description
        targetValue || null,
        currentValue,
        targetDate || null,
        progressPercentage,
        "active",
      ]);

      return this.mapRowToGoal(result.rows[0]);
    } catch (error) {
      console.error("❌ Error creating goal:", error);
      throw error;
    }
  }

  // Get all goals for a user
  async getGoalsByUserId(userId, filters = {}) {
    try {
      let query = `
        SELECT g.*,
          COUNT(m.id) as milestone_count,
          COUNT(CASE WHEN m.completed = true THEN 1 END) as completed_milestones
        FROM career_goals g
        LEFT JOIN goal_milestones m ON g.id = m.goal_id
        WHERE g.user_id = $1
      `;

      const params = [userId];
      let paramIndex = 2;

      // Apply filters
      if (filters.status) {
        query += ` AND g.status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters.category) {
        query += ` AND g.goal_category = $${paramIndex++}`;
        params.push(filters.category);
      }

      if (filters.goalType) {
        query += ` AND g.goal_type = $${paramIndex++}`;
        params.push(filters.goalType);
      }

      query += `
        GROUP BY g.id
        ORDER BY 
          CASE g.status
            WHEN 'active' THEN 1
            WHEN 'completed' THEN 2
            WHEN 'paused' THEN 3
            WHEN 'cancelled' THEN 4
          END,
          g.created_at DESC
      `;

      const result = await database.query(query, params);
      return result.rows.map((row) => this.mapRowToGoal(row));
    } catch (error) {
      console.error("❌ Error getting goals:", error);
      throw error;
    }
  }

  // Get goal by ID
  async getGoalById(goalId, userId) {
    try {
      const query = `
        SELECT g.*,
          COUNT(m.id) as milestone_count,
          COUNT(CASE WHEN m.completed = true THEN 1 END) as completed_milestones
        FROM career_goals g
        LEFT JOIN goal_milestones m ON g.id = m.goal_id
        WHERE g.id = $1 AND g.user_id = $2
        GROUP BY g.id
      `;

      const result = await database.query(query, [goalId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToGoal(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting goal by ID:", error);
      throw error;
    }
  }

  // Update goal
  async updateGoal(goalId, userId, updateData) {
    try {
      const existing = await this.getGoalById(goalId, userId);
      if (!existing) {
        throw new Error("Goal not found");
      }

      const updates = [];
      const values = [];
      let paramIndex = 1;

      const fields = {
        title: { column: "goal_description", value: updateData.title },
        description: { column: "specific_metric", value: updateData.description },
        category: { column: "goal_category", value: updateData.category },
        goalType: { column: "goal_type", value: updateData.goalType },
        targetValue: { column: "target_value", value: updateData.targetValue },
        currentValue: { column: "current_value", value: updateData.currentValue },
        targetDate: { column: "target_date", value: updateData.targetDate },
        status: { column: "status", value: updateData.status },
        // Note: priority is not stored in the database schema, so we skip it
      };

      for (const [key, field] of Object.entries(fields)) {
        if (updateData[key] !== undefined) {
          updates.push(`${field.column} = $${paramIndex++}`);
          values.push(field.value);
        }
      }

      // Recalculate progress percentage
      const targetValue = updateData.targetValue !== undefined ? updateData.targetValue : existing.targetValue;
      const currentValue = updateData.currentValue !== undefined ? updateData.currentValue : existing.currentValue;

      if (targetValue !== undefined || currentValue !== undefined) {
        const progressPercentage =
          targetValue && targetValue > 0
            ? Math.min(Math.round((currentValue / targetValue) * 100), 100)
            : 0;
        updates.push(`progress_percentage = $${paramIndex++}`);
        values.push(progressPercentage);
      }

      // Mark as completed if status is completed
      if (updateData.status === "completed") {
        updates.push(`achievement_date = $${paramIndex++}`);
        values.push(new Date().toISOString().split("T")[0]);
      }

      if (updates.length === 0) {
        return existing;
      }

      values.push(goalId, userId);

      const query = `
        UPDATE career_goals
        SET ${updates.join(", ")}, updated_at = NOW()
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
        RETURNING *
      `;

      const result = await database.query(query, values);
      return this.mapRowToGoal(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating goal:", error);
      throw error;
    }
  }

  // Complete goal (marks goal as completed)
  async completeGoal(goalId, userId) {
    try {
      const existing = await this.getGoalById(goalId, userId);
      if (!existing) {
        throw new Error("Goal not found");
      }

      if (existing.status === "completed") {
        return existing; // Already completed
      }

      // Update goal to completed status
      const query = `
        UPDATE career_goals
        SET status = 'completed',
            achievement_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [goalId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Goal not found");
      }

      return this.mapRowToGoal(result.rows[0]);
    } catch (error) {
      console.error("❌ Error completing goal:", error);
      throw error;
    }
  }

  // Delete goal
  async deleteGoal(goalId, userId) {
    try {
      const existing = await this.getGoalById(goalId, userId);
      if (!existing) {
        throw new Error("Goal not found");
      }

      const query = `
        DELETE FROM career_goals
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [goalId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Goal not found");
      }

      return { id: result.rows[0].id };
    } catch (error) {
      console.error("❌ Error deleting goal:", error);
      throw error;
    }
  }

  // Get goal analytics
  async getGoalAnalytics(userId) {
    try {
      // Get overall totals first (not grouped)
      // Normalize status values: treat NULL, empty string, or 'active' as active
      const totalsQuery = `
        SELECT 
          COUNT(*) as total_goals,
          COUNT(CASE WHEN COALESCE(status, 'active') = 'active' THEN 1 END) as active_goals,
          COUNT(CASE WHEN COALESCE(status, '') = 'completed' THEN 1 END) as completed_goals
        FROM career_goals
        WHERE user_id = $1
      `;

      const totalsResult = await database.query(totalsQuery, [userId]);
      const totalGoals = parseInt(totalsResult.rows[0]?.total_goals || 0);
      const activeGoals = parseInt(totalsResult.rows[0]?.active_goals || 0);
      const completedGoals = parseInt(totalsResult.rows[0]?.completed_goals || 0);
      const achievementRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100 * 10) / 10 : 0;

      // Get breakdown by category
      // Normalize status values for accurate counting
      const categoryQuery = `
        SELECT 
          goal_category,
          COUNT(*) as category_total,
          COUNT(CASE WHEN COALESCE(status, '') = 'completed' THEN 1 END) as category_completed,
          COUNT(CASE WHEN COALESCE(status, 'active') = 'active' THEN 1 END) as category_active
        FROM career_goals
        WHERE user_id = $1
        GROUP BY goal_category
        ORDER BY category_total DESC
      `;

      const categoryResult = await database.query(categoryQuery, [userId]);
      const byCategory = categoryResult.rows.map((row) => ({
        category: row.goal_category,
        total: parseInt(row.category_total || 0),
        completed: parseInt(row.category_completed || 0),
        active: parseInt(row.category_active || 0),
      }));

      // Get recent progress (active goals with progress)
      // Normalize status to include NULL as active
      const progressQuery = `
        SELECT id, goal_description, current_value, target_value, progress_percentage, updated_at
        FROM career_goals
        WHERE user_id = $1 
          AND COALESCE(status, 'active') = 'active' 
          AND target_value IS NOT NULL
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 5
      `;

      const progressResult = await database.query(progressQuery, [userId]);
      const recentProgress = progressResult.rows.map((row) => ({
        goalId: row.id,
        goalTitle: row.goal_description || "Untitled Goal",
        progress: parseFloat(row.current_value || 0),
        targetValue: parseFloat(row.target_value || 0),
        percentage: parseFloat(row.progress_percentage || 0),
      }));

      return {
        totalGoals,
        activeGoals,
        completedGoals,
        achievementRate,
        byCategory,
        recentProgress,
      };
    } catch (error) {
      console.error("❌ Error getting goal analytics:", error);
      throw error;
    }
  }

  // Map database row to goal object
  mapRowToGoal(row) {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.goal_description || "Untitled Goal",
      description: row.specific_metric || null,
      category: row.goal_category,
      goalType: row.goal_type,
      targetValue: row.target_value ? parseFloat(row.target_value) : null,
      currentValue: parseFloat(row.current_value || 0),
      unit: null, // Not stored in sprint3 schema
      targetDate: row.target_date || null,
      startDate: row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      status: row.status || "active",
      priority: "medium", // Not stored in sprint3 schema
      progressPercentage: parseFloat(row.progress_percentage || 0),
      completedAt: row.achievement_date || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      milestoneCount: parseInt(row.milestone_count || 0),
      completedMilestones: parseInt(row.completed_milestones || 0),
    };
  }
}

export default new GoalService();

