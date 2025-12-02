import { v4 as uuidv4 } from "uuid";
import database from "./database.js";
import { teamService } from "./collaboration/index.js";

class SkillService {
  // Create a new skill
  async createSkill(userId, skillData) {
    const { skillName, proficiency, category, skillBadge } = skillData;

    try {
      // Check for duplicate skill for this user
      const existing = await this.getSkillByUserIdAndName(userId, skillName);
      if (existing) {
        const error = new Error("DUPLICATE_SKILL");
        error.code = "DUPLICATE_SKILL";
        throw error;
      }

      const skillId = uuidv4();

      const query = `
        INSERT INTO skills (
          id, user_id, skill_name, proficiency, category, skill_badge
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await database.query(query, [
        skillId,
        userId,
        skillName,
        proficiency,
        category || null,
        skillBadge || null,
      ]);

      const skill = this.mapRowToSkill(result.rows[0]);

      // Log activity to all teams user is a member of
      try {
        const userTeams = await database.query(
          `SELECT team_id, role FROM team_members WHERE user_id = $1 AND active = true`,
          [userId]
        );
        console.log(`[SkillService] Found ${userTeams.rows.length} teams for user ${userId}`);
        for (const team of userTeams.rows) {
          console.log(`[SkillService] Logging skill_added activity to team ${team.team_id}`);
          await teamService.logActivity(
            team.team_id,
            userId,
            team.role || "candidate",
            "skill_added",
            {
              skill_id: skillId,
              skill_name: skillName,
              proficiency: proficiency,
              category: category
            }
          );
        }
      } catch (error) {
        console.error("[SkillService] Error logging skill activity:", error);
        // Don't fail skill creation if activity logging fails
      }

      return skill;
    } catch (error) {
      console.error("❌ Error creating skill:", error);
      throw error;
    }
  }

  // Get all skills for a user
  async getSkillsByUserId(userId, category = null) {
    try {
      let query = `
        SELECT *
        FROM skills
        WHERE user_id = $1
      `;

      const params = [userId];

      if (category) {
        query += ` AND category = $2`;
        params.push(category);
        query += ` ORDER BY skill_name ASC`;
      } else {
        query += ` ORDER BY category ASC, skill_name ASC`;
      }

      const result = await database.query(query, params);
      return result.rows.map(this.mapRowToSkill);
    } catch (error) {
      console.error("❌ Error getting skills:", error);
      throw error;
    }
  }

  // Get skills grouped by category
  async getSkillsByCategory(userId) {
    try {
      const skills = await this.getSkillsByUserId(userId);
      
      const skillsByCategory = {};
      const categoryCounts = {};

      skills.forEach((skill) => {
        const category = skill.category || "Uncategorized";
        if (!skillsByCategory[category]) {
          skillsByCategory[category] = [];
          categoryCounts[category] = 0;
        }
        skillsByCategory[category].push(skill);
        categoryCounts[category]++;
      });

      return { skillsByCategory, categoryCounts };
    } catch (error) {
      console.error("❌ Error getting skills by category:", error);
      throw error;
    }
  }

  // Get skill by ID
  async getSkillById(skillId, userId) {
    try {
      const query = `
        SELECT *
        FROM skills
        WHERE id = $1 AND user_id = $2
      `;

      const result = await database.query(query, [skillId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSkill(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting skill by ID:", error);
      throw error;
    }
  }

  // Get skill by user ID and skill name (for duplicate checking)
  async getSkillByUserIdAndName(userId, skillName) {
    try {
      const query = `
        SELECT *
        FROM skills
        WHERE user_id = $1 AND skill_name = $2
      `;

      const result = await database.query(query, [userId, skillName]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSkill(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting skill by name:", error);
      throw error;
    }
  }

  // Update skill
  async updateSkill(skillId, userId, skillData) {
    const { proficiency, category, skillBadge } = skillData;

    try {
      // First, verify the skill belongs to the user
      const existing = await this.getSkillById(skillId, userId);
      if (!existing) {
        throw new Error("Skill not found");
      }

      const query = `
        UPDATE skills
        SET 
          proficiency = COALESCE($3, proficiency),
          category = COALESCE($4, category),
          skill_badge = COALESCE($5, skill_badge)
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [
        skillId,
        userId,
        proficiency,
        category,
        skillBadge,
      ]);

      if (result.rows.length === 0) {
        throw new Error("Failed to update skill");
      }

      return this.mapRowToSkill(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating skill:", error);
      throw error;
    }
  }

  // Delete skill
  async deleteSkill(skillId, userId) {
    try {
      // First, verify the skill belongs to the user
      const existing = await this.getSkillById(skillId, userId);
      if (!existing) {
        throw new Error("Skill not found");
      }

      const query = `
        DELETE FROM skills
        WHERE id = $1 AND user_id = $2
      `;

      await database.query(query, [skillId, userId]);

      return { success: true, message: "Skill deleted successfully" };
    } catch (error) {
      console.error("❌ Error deleting skill:", error);
      throw error;
    }
  }

  // Helper method to map database row to skill object
  mapRowToSkill(row) {
    return {
      id: row.id,
      userId: row.user_id,
      skillName: row.skill_name,
      proficiency: row.proficiency,
      category: row.category,
      skillBadge: row.skill_badge,
    };
  }
}

export default new SkillService();

