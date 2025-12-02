import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import { teamService } from "./index.js";

/**
 * Service for managing preparation tasks (assigned by mentors/admins)
 */
class TaskService {
  /**
   * Assign task to user
   */
  async assignTask(assignedBy, assignedTo, teamId, taskData) {
    try {
      // Verify assigner has permission
      const assignerMember = await database.query(
        `SELECT role, permissions FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, assignedBy]
      );

      if (assignerMember.rows.length === 0) {
        throw new Error("You are not a member of this team");
      }

      const assignerRole = assignerMember.rows[0].role;
      if (!["admin", "mentor", "career_coach"].includes(assignerRole)) {
        throw new Error("Only mentors, career coaches, and admins can assign tasks");
      }

      // Verify assignee is in team
      const assigneeMember = await database.query(
        `SELECT role FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, assignedTo]
      );

      if (assigneeMember.rows.length === 0) {
        throw new Error("Assignee is not a member of this team");
      }

      const { taskType, taskTitle, taskDescription, taskData: data, dueDate } = taskData;

      const taskId = uuidv4();
      await database.query(
        `INSERT INTO preparation_tasks 
         (id, team_id, assigned_by, assigned_by_role, assigned_to, assigned_to_role, 
          task_type, task_title, task_description, task_data, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')`,
        [
          taskId,
          teamId,
          assignedBy,
          assignerRole,
          assignedTo,
          assigneeMember.rows[0].role,
          taskType,
          taskTitle,
          taskDescription || null,
          JSON.stringify(data || {}),
          dueDate || null
        ]
      );

      // Log activity
      await teamService.logActivity(teamId, assignedBy, assignerRole, "task_assigned", {
        task_id: taskId,
        assigned_to: assignedTo,
        task_type: taskType
      });

      return { id: taskId, ...taskData };
    } catch (error) {
      console.error("[TaskService] Error assigning task:", error);
      throw error;
    }
  }

  /**
   * Get tasks for user
   */
  async getUserTasks(userId, teamId = null, status = null) {
    try {
      let query = `
        SELECT pt.*, 
               u1.email as assigned_by_email,
               u1.role as assigned_by_user_role,
               u2.email as assigned_to_email,
               p1.first_name as assigned_by_first_name,
               p1.last_name as assigned_by_last_name
        FROM preparation_tasks pt
        JOIN users u1 ON pt.assigned_by = u1.u_id
        JOIN users u2 ON pt.assigned_to = u2.u_id
        LEFT JOIN profiles p1 ON pt.assigned_by = p1.user_id
        WHERE pt.assigned_to = $1
      `;
      const params = [userId];

      if (teamId) {
        query += ` AND pt.team_id = $${params.length + 1}`;
        params.push(teamId);
      }

      if (status) {
        query += ` AND pt.status = $${params.length + 1}`;
        params.push(status);
      }

      query += ` ORDER BY pt.due_date ASC NULLS LAST, pt.created_at DESC`;

      const result = await database.query(query, params);

      return result.rows.map(row => {
        const assignedByName = row.assigned_by_first_name && row.assigned_by_last_name
          ? `${row.assigned_by_first_name} ${row.assigned_by_last_name}`
          : row.assigned_by_first_name || row.assigned_by_last_name || row.assigned_by_email;

        return {
        id: row.id,
        teamId: row.team_id,
        assignedBy: row.assigned_by,
        assignedByEmail: row.assigned_by_email,
          assignedByName: assignedByName,
          assignedByRole: row.assigned_by_role,
        assignedTo: row.assigned_to,
        assignedToEmail: row.assigned_to_email,
        taskType: row.task_type,
        taskTitle: row.task_title,
        taskDescription: row.task_description,
        taskData: typeof row.task_data === "string" ? JSON.parse(row.task_data) : row.task_data,
        dueDate: row.due_date,
        status: row.status,
        completedAt: row.completed_at,
        createdAt: row.created_at
        };
      });
    } catch (error) {
      console.error("[TaskService] Error getting user tasks:", error);
      throw error;
    }
  }

  /**
   * Get tasks for a specific user (for mentors to view their mentees' tasks)
   */
  async getTasksForUser(mentorId, menteeId, teamId = null) {
    try {
      // Verify mentor is a mentor in a team where mentee is also a member
      const teamCheck = await database.query(
        `SELECT tm1.team_id
         FROM team_members tm1
         JOIN team_members tm2 ON tm1.team_id = tm2.team_id
         WHERE tm1.user_id = $1 
           AND tm1.role IN ('mentor', 'career_coach', 'admin')
           AND tm1.active = true
           AND tm2.user_id = $2
           AND tm2.active = true
         LIMIT 1`,
        [mentorId, menteeId]
      );

      if (teamCheck.rows.length === 0) {
        throw new Error("You are not a mentor for this mentee");
      }

      let query = `
        SELECT pt.*, 
               u1.email as assigned_by_email,
               u1.role as assigned_by_user_role,
               u2.email as assigned_to_email,
               p1.first_name as assigned_by_first_name,
               p1.last_name as assigned_by_last_name
        FROM preparation_tasks pt
        JOIN users u1 ON pt.assigned_by = u1.u_id
        JOIN users u2 ON pt.assigned_to = u2.u_id
        LEFT JOIN profiles p1 ON pt.assigned_by = p1.user_id
        WHERE pt.assigned_to = $1
      `;
      const params = [menteeId];

      if (teamId) {
        query += ` AND pt.team_id = $${params.length + 1}`;
        params.push(teamId);
      }

      query += ` ORDER BY pt.due_date ASC NULLS LAST, pt.created_at DESC`;

      const result = await database.query(query, params);

      return result.rows.map(row => {
        const assignedByName = row.assigned_by_first_name && row.assigned_by_last_name
          ? `${row.assigned_by_first_name} ${row.assigned_by_last_name}`
          : row.assigned_by_first_name || row.assigned_by_last_name || row.assigned_by_email;

        return {
          id: row.id,
          teamId: row.team_id,
          assignedBy: row.assigned_by,
          assignedByEmail: row.assigned_by_email,
          assignedByName: assignedByName,
          assignedByRole: row.assigned_by_role,
          assignedTo: row.assigned_to,
          assignedToEmail: row.assigned_to_email,
          taskType: row.task_type,
          taskTitle: row.task_title,
          taskDescription: row.task_description,
          taskData: typeof row.task_data === "string" ? JSON.parse(row.task_data) : row.task_data,
          dueDate: row.due_date,
          status: row.status,
          completedAt: row.completed_at,
          createdAt: row.created_at
        };
      });
    } catch (error) {
      console.error("[TaskService] Error getting tasks for user:", error);
      throw error;
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId, userId, status) {
    try {
      // Verify user owns the task
      const task = await database.query(
        `SELECT assigned_to, team_id FROM preparation_tasks WHERE id = $1`,
        [taskId]
      );

      if (task.rows.length === 0) {
        throw new Error("Task not found");
      }

      if (task.rows[0].assigned_to !== userId) {
        throw new Error("You can only update your own tasks");
      }

      // Update status and completed_at based on the new status
      // Use explicit type casting to avoid PostgreSQL type inference issues
      const updateQuery = status === 'completed'
        ? `UPDATE preparation_tasks 
           SET status = $1::varchar, 
               completed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2::uuid`
        : `UPDATE preparation_tasks 
           SET status = $1::varchar, 
               completed_at = completed_at,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $2::uuid`;
      
      await database.query(updateQuery, [status, taskId]);

      // Log activity
      if (task.rows[0].team_id) {
        await teamService.logActivity(task.rows[0].team_id, userId, "candidate", "task_updated", {
          task_id: taskId,
          new_status: status
        });
      }

      return { success: true };
    } catch (error) {
      console.error("[TaskService] Error updating task status:", error);
      throw error;
    }
  }
}

export default new TaskService();

