import { v4 as uuidv4 } from "uuid";
import database from "../database.js";

class ResumeCommentService {
  constructor() {
    this.maxCommenterLength = 255;
  }

  // Create a new comment
  async createComment(resumeId, commentData) {
    const { commenter, comment } = commentData;

    try {
      if (!resumeId) {
        throw new Error("Resume ID is required");
      }

      if (!comment) {
        throw new Error("Comment is required");
      }

      // Validate field lengths
      if (commenter && commenter.length > this.maxCommenterLength) {
        throw new Error(
          `Commenter name must be less than ${this.maxCommenterLength} characters`
        );
      }

      const commentId = uuidv4();

      const query = `
        INSERT INTO resume_comments (id, resume_id, commenter, comment)
        VALUES ($1, $2, $3, $4)
        RETURNING id, resume_id, commenter, comment
      `;

      const result = await database.query(query, [
        commentId,
        resumeId,
        commenter || null,
        comment,
      ]);

      return this.mapRowToComment(result.rows[0]);
    } catch (error) {
      console.error("❌ Error creating comment:", error);
      throw error;
    }
  }

  // Get all comments for a resume
  async getCommentsByResumeId(resumeId) {
    try {
      const query = `
        SELECT id, resume_id, commenter, comment
        FROM resume_comments
        WHERE resume_id = $1
        ORDER BY id ASC
      `;

      const result = await database.query(query, [resumeId]);

      return result.rows.map(this.mapRowToComment);
    } catch (error) {
      console.error("❌ Error getting comments by resume ID:", error);
      throw error;
    }
  }

  // Get comment by ID
  async getCommentById(commentId) {
    try {
      const query = `
        SELECT id, resume_id, commenter, comment
        FROM resume_comments
        WHERE id = $1
      `;

      const result = await database.query(query, [commentId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToComment(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting comment by ID:", error);
      throw error;
    }
  }

  // Update comment
  async updateComment(commentId, commentData) {
    const { commenter, comment } = commentData;

    try {
      // Check if comment exists
      const existingComment = await this.getCommentById(commentId);
      if (!existingComment) {
        throw new Error("Comment not found");
      }

      // Validate field lengths
      if (commenter && commenter.length > this.maxCommenterLength) {
        throw new Error(
          `Commenter name must be less than ${this.maxCommenterLength} characters`
        );
      }

      if (!comment) {
        throw new Error("Comment is required");
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (commenter !== undefined) {
        updates.push(`commenter = $${paramCount++}`);
        values.push(commenter || null);
      }

      if (comment !== undefined) {
        updates.push(`comment = $${paramCount++}`);
        values.push(comment);
      }

      if (updates.length === 0) {
        return existingComment;
      }

      values.push(commentId);

      const query = `
        UPDATE resume_comments
        SET ${updates.join(", ")}
        WHERE id = $${paramCount++}
        RETURNING id, resume_id, commenter, comment
      `;

      const result = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Comment not found or update failed");
      }

      return this.mapRowToComment(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating comment:", error);
      throw error;
    }
  }

  // Delete comment
  async deleteComment(commentId) {
    try {
      const query = `
        DELETE FROM resume_comments
        WHERE id = $1
        RETURNING id
      `;

      const result = await database.query(query, [commentId]);

      if (result.rows.length === 0) {
        throw new Error("Comment not found");
      }

      return { id: result.rows[0].id };
    } catch (error) {
      console.error("❌ Error deleting comment:", error);
      throw error;
    }
  }

  // Map database row to comment object
  mapRowToComment(row) {
    return {
      id: row.id,
      resumeId: row.resume_id,
      commenter: row.commenter,
      comment: row.comment,
    };
  }
}

export default new ResumeCommentService();
