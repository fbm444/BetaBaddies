/**
 * Time Log Service
 * Handles manual time tracking for job search activities (UC-103)
 */

import database from "./database.js";

class TimeLogService {
  /**
   * Create a new time log entry
   */
  async createTimeLog(timeLogData) {
    const {
      userId,
      jobOpportunityId,
      activityType,
      hoursSpent,
      activityDate,
      notes
    } = timeLogData;

    try {
      const query = `
        INSERT INTO time_logs (
          user_id, job_opportunity_id, activity_type, 
          hours_spent, activity_date, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await database.query(query, [
        userId,
        jobOpportunityId || null,
        activityType,
        hoursSpent,
        activityDate || new Date().toISOString().split('T')[0],
        notes || null
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error creating time log:", error);
      throw error;
    }
  }

  /**
   * Get time logs for a user
   */
  async getTimeLogs(userId, filters = {}) {
    try {
      let whereConditions = ["user_id = $1"];
      const params = [userId];

      if (filters.startDate) {
        params.push(filters.startDate);
        whereConditions.push(`activity_date >= $${params.length}`);
      }

      if (filters.endDate) {
        params.push(filters.endDate);
        whereConditions.push(`activity_date <= $${params.length}`);
      }

      if (filters.activityType) {
        params.push(filters.activityType);
        whereConditions.push(`activity_type = $${params.length}`);
      }

      if (filters.jobOpportunityId) {
        params.push(filters.jobOpportunityId);
        whereConditions.push(`job_opportunity_id = $${params.length}`);
      }

      const query = `
        SELECT 
          tl.*,
          jo.title as job_title,
          jo.company
        FROM time_logs tl
        LEFT JOIN job_opportunities jo ON tl.job_opportunity_id = jo.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY activity_date DESC, created_at DESC
      `;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting time logs:", error);
      throw error;
    }
  }

  /**
   * Update a time log entry
   */
  async updateTimeLog(timeLogId, userId, updates) {
    try {
      const allowedFields = ['activity_type', 'hours_spent', 'activity_date', 'notes', 'job_opportunity_id'];
      const updateFields = [];
      const params = [timeLogId, userId];

      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field) && updates[field] !== undefined) {
          params.push(updates[field]);
          updateFields.push(`${field} = $${params.length}`);
        }
      });

      if (updateFields.length === 0) {
        throw new Error("No valid fields to update");
      }

      const query = `
        UPDATE time_logs
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error("Time log not found or unauthorized");
      }

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error updating time log:", error);
      throw error;
    }
  }

  /**
   * Delete a time log entry
   */
  async deleteTimeLog(timeLogId, userId) {
    try {
      const query = `
        DELETE FROM time_logs
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [timeLogId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error("Time log not found or unauthorized");
      }

      return { id: result.rows[0].id, deleted: true };
    } catch (error) {
      console.error("❌ Error deleting time log:", error);
      throw error;
    }
  }

  /**
   * Get time summary for a user
   */
  async getTimeSummary(userId, dateRange = {}) {
    try {
      let dateFilter = "";
      const params = [userId];

      if (dateRange.startDate) {
        params.push(dateRange.startDate);
        dateFilter += ` AND activity_date >= $${params.length}`;
      }

      if (dateRange.endDate) {
        params.push(dateRange.endDate);
        dateFilter += ` AND activity_date <= $${params.length}`;
      }

      const query = `
        SELECT 
          activity_type,
          SUM(hours_spent) as total_hours,
          COUNT(*) as entry_count,
          AVG(hours_spent) as avg_hours_per_entry,
          MIN(activity_date) as first_date,
          MAX(activity_date) as last_date
        FROM time_logs
        WHERE user_id = $1 ${dateFilter}
        GROUP BY activity_type
        ORDER BY total_hours DESC
      `;

      const result = await database.query(query, params);
      
      const totalHours = result.rows.reduce((sum, row) => 
        sum + parseFloat(row.total_hours || 0), 0
      );

      return {
        byActivity: result.rows.map(row => ({
          activityType: row.activity_type,
          totalHours: parseFloat(row.total_hours) || 0,
          entryCount: parseInt(row.entry_count) || 0,
          avgHoursPerEntry: parseFloat(row.avg_hours_per_entry) || 0,
          firstDate: row.first_date,
          lastDate: row.last_date
        })),
        totalHours: Math.round(totalHours * 10) / 10
      };
    } catch (error) {
      console.error("❌ Error getting time summary:", error);
      throw error;
    }
  }
}

export default new TimeLogService();

