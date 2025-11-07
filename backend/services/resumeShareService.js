import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import database from "./database.js";

class ResumeShareService {
  constructor() {
    this.maxReviewerNameLength = 255;
    this.maxReviewerEmailLength = 255;
    this.maxSectionReferenceLength = 100;
    this.tokenLength = 43; // Base64 encoded 32 bytes
  }

  // Generate a secure share token
  generateShareToken() {
    // Generate 32 random bytes and encode as base64
    const randomBytes = crypto.randomBytes(32);
    let token = randomBytes.toString("base64");
    // Make URL-safe by replacing special characters
    token = token.replace(/\//g, "_").replace(/\+/g, "-");
    // Remove padding and ensure consistent length
    token = token.replace(/=/g, "").substring(0, this.tokenLength);
    return token;
  }

  // Create a shareable link for a resume
  async createShare(resumeId, userId, shareData) {
    const { accessLevel = "view", expiresAt, isActive = true } = shareData;

    try {
      if (!resumeId || !userId) {
        throw new Error("Resume ID and User ID are required");
      }

      // Validate access level
      const validAccessLevels = ["view", "comment", "edit"];
      if (!validAccessLevels.includes(accessLevel)) {
        throw new Error(
          `Access level must be one of: ${validAccessLevels.join(", ")}`
        );
      }

      // Generate unique share token
      let shareToken;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        shareToken = this.generateShareToken();
        const existing = await this.getShareByToken(shareToken);
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error("Failed to generate unique share token");
      }

      const shareId = uuidv4();

      const query = `
        INSERT INTO resume_shares (id, resume_id, share_token, created_by, access_level, expires_at, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, resume_id, share_token, created_by, access_level, expires_at, is_active, created_at
      `;

      const result = await database.query(query, [
        shareId,
        resumeId,
        shareToken,
        userId,
        accessLevel,
        expiresAt || null,
        isActive,
      ]);

      return this.mapRowToShare(result.rows[0]);
    } catch (error) {
      console.error("❌ Error creating share:", error);
      throw error;
    }
  }

  // Get share by token (for public access)
  async getShareByToken(shareToken) {
    try {
      const query = `
        SELECT id, resume_id, share_token, created_by, access_level, expires_at, is_active, created_at
        FROM resume_shares
        WHERE share_token = $1
      `;

      const result = await database.query(query, [shareToken]);

      if (result.rows.length === 0) {
        return null;
      }

      const share = this.mapRowToShare(result.rows[0]);

      // Check if share is expired
      if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
        return null; // Share has expired
      }

      // Check if share is active
      if (!share.isActive) {
        return null; // Share has been revoked
      }

      return share;
    } catch (error) {
      console.error("❌ Error getting share by token:", error);
      throw error;
    }
  }

  // Get all shares for a resume (by owner)
  async getSharesByResumeId(resumeId, userId) {
    try {
      const query = `
        SELECT id, resume_id, share_token, created_by, access_level, expires_at, is_active, created_at
        FROM resume_shares
        WHERE resume_id = $1 AND created_by = $2
        ORDER BY created_at DESC
      `;

      const result = await database.query(query, [resumeId, userId]);

      return result.rows.map(this.mapRowToShare);
    } catch (error) {
      console.error("❌ Error getting shares by resume ID:", error);
      throw error;
    }
  }

  // Get share by ID (for owner)
  async getShareById(shareId, userId) {
    try {
      const query = `
        SELECT id, resume_id, share_token, created_by, access_level, expires_at, is_active, created_at
        FROM resume_shares
        WHERE id = $1 AND created_by = $2
      `;

      const result = await database.query(query, [shareId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToShare(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting share by ID:", error);
      throw error;
    }
  }

  // Update share (change access level, expiration, etc.)
  async updateShare(shareId, userId, shareData) {
    const { accessLevel, expiresAt, isActive } = shareData;

    try {
      // Check if share exists and belongs to user
      const existingShare = await this.getShareById(shareId, userId);
      if (!existingShare) {
        throw new Error("Share not found");
      }

      // Validate access level if provided
      if (accessLevel) {
        const validAccessLevels = ["view", "comment", "edit"];
        if (!validAccessLevels.includes(accessLevel)) {
          throw new Error(
            `Access level must be one of: ${validAccessLevels.join(", ")}`
          );
        }
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (accessLevel !== undefined) {
        updates.push(`access_level = $${paramCount++}`);
        values.push(accessLevel);
      }

      if (expiresAt !== undefined) {
        updates.push(`expires_at = $${paramCount++}`);
        values.push(expiresAt || null);
      }

      if (isActive !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(isActive);
      }

      if (updates.length === 0) {
        return existingShare;
      }

      values.push(shareId, userId);

      const query = `
        UPDATE resume_shares
        SET ${updates.join(", ")}
        WHERE id = $${paramCount++} AND created_by = $${paramCount++}
        RETURNING id, resume_id, share_token, created_by, access_level, expires_at, is_active, created_at
      `;

      const result = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Share not found or update failed");
      }

      return this.mapRowToShare(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating share:", error);
      throw error;
    }
  }

  // Revoke share (set is_active to false)
  async revokeShare(shareId, userId) {
    try {
      return await this.updateShare(shareId, userId, { isActive: false });
    } catch (error) {
      console.error("❌ Error revoking share:", error);
      throw error;
    }
  }

  // Delete share permanently
  async deleteShare(shareId, userId) {
    try {
      // Check if share exists and belongs to user
      const existingShare = await this.getShareById(shareId, userId);
      if (!existingShare) {
        throw new Error("Share not found");
      }

      const query = `
        DELETE FROM resume_shares
        WHERE id = $1 AND created_by = $2
        RETURNING id
      `;

      const result = await database.query(query, [shareId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Share not found or delete failed");
      }

      return { id: result.rows[0].id };
    } catch (error) {
      console.error("❌ Error deleting share:", error);
      throw error;
    }
  }

  // Check if user has access to resume via share token
  async checkAccess(shareToken, requiredAccessLevel = "view") {
    try {
      const share = await this.getShareByToken(shareToken);
      if (!share) {
        return { hasAccess: false, reason: "Share not found or expired" };
      }

      // Check access level hierarchy: view < comment < edit
      const accessLevels = { view: 1, comment: 2, edit: 3 };
      const userLevel = accessLevels[share.accessLevel] || 0;
      const requiredLevel = accessLevels[requiredAccessLevel] || 0;

      if (userLevel < requiredLevel) {
        return {
          hasAccess: false,
          reason: `Share token only has '${share.accessLevel}' access, but '${requiredAccessLevel}' is required`,
        };
      }

      return { hasAccess: true, share };
    } catch (error) {
      console.error("❌ Error checking access:", error);
      return { hasAccess: false, reason: "Error checking access" };
    }
  }

  // Create feedback on a shared resume
  async createFeedback(shareToken, feedbackData) {
    const { reviewerEmail, reviewerName, comment, sectionReference } =
      feedbackData;

    try {
      if (!comment) {
        throw new Error("Comment is required");
      }

      // Validate field lengths
      if (reviewerName && reviewerName.length > this.maxReviewerNameLength) {
        throw new Error(
          `Reviewer name must be less than ${this.maxReviewerNameLength} characters`
        );
      }

      if (reviewerEmail && reviewerEmail.length > this.maxReviewerEmailLength) {
        throw new Error(
          `Reviewer email must be less than ${this.maxReviewerEmailLength} characters`
        );
      }

      if (
        sectionReference &&
        sectionReference.length > this.maxSectionReferenceLength
      ) {
        throw new Error(
          `Section reference must be less than ${this.maxSectionReferenceLength} characters`
        );
      }

      // Get share to verify access and get resume_id
      const accessCheck = await this.checkAccess(shareToken, "comment");
      if (!accessCheck.hasAccess) {
        throw new Error(accessCheck.reason || "Access denied");
      }

      const share = accessCheck.share;
      const feedbackId = uuidv4();

      const query = `
        INSERT INTO resume_feedback (id, resume_id, share_id, reviewer_email, reviewer_name, comment, section_reference, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING id, resume_id, share_id, reviewer_email, reviewer_name, comment, section_reference, status, created_at, updated_at
      `;

      const result = await database.query(query, [
        feedbackId,
        share.resumeId,
        share.id,
        reviewerEmail || null,
        reviewerName || null,
        comment,
        sectionReference || null,
      ]);

      return this.mapRowToFeedback(result.rows[0]);
    } catch (error) {
      console.error("❌ Error creating feedback:", error);
      throw error;
    }
  }

  // Get all feedback for a resume (by owner)
  async getFeedbackByResumeId(resumeId, userId) {
    try {
      // Verify user owns the resume
      const query = `
        SELECT f.id, f.resume_id, f.share_id, f.reviewer_email, f.reviewer_name, 
               f.comment, f.section_reference, f.status, f.created_at, f.updated_at
        FROM resume_feedback f
        JOIN resume r ON f.resume_id = r.id
        WHERE f.resume_id = $1 AND r.user_id = $2
        ORDER BY f.created_at DESC
      `;

      const result = await database.query(query, [resumeId, userId]);

      return result.rows.map(this.mapRowToFeedback);
    } catch (error) {
      console.error("❌ Error getting feedback by resume ID:", error);
      throw error;
    }
  }

  // Get feedback by ID
  async getFeedbackById(feedbackId, userId) {
    try {
      const query = `
        SELECT f.id, f.resume_id, f.share_id, f.reviewer_email, f.reviewer_name, 
               f.comment, f.section_reference, f.status, f.created_at, f.updated_at
        FROM resume_feedback f
        JOIN resume r ON f.resume_id = r.id
        WHERE f.id = $1 AND r.user_id = $2
      `;

      const result = await database.query(query, [feedbackId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToFeedback(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting feedback by ID:", error);
      throw error;
    }
  }

  // Update feedback status (by owner)
  async updateFeedbackStatus(feedbackId, userId, status) {
    try {
      const validStatuses = ["pending", "resolved", "dismissed"];
      if (!validStatuses.includes(status)) {
        throw new Error(`Status must be one of: ${validStatuses.join(", ")}`);
      }

      const query = `
        UPDATE resume_feedback
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND resume_id IN (
          SELECT id FROM resume WHERE user_id = $3
        )
        RETURNING id, resume_id, share_id, reviewer_email, reviewer_name, 
                  comment, section_reference, status, created_at, updated_at
      `;

      const result = await database.query(query, [status, feedbackId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Feedback not found or update failed");
      }

      return this.mapRowToFeedback(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating feedback status:", error);
      throw error;
    }
  }

  // Delete feedback
  async deleteFeedback(feedbackId, userId) {
    try {
      const query = `
        DELETE FROM resume_feedback
        WHERE id = $1 AND resume_id IN (
          SELECT id FROM resume WHERE user_id = $2
        )
        RETURNING id
      `;

      const result = await database.query(query, [feedbackId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Feedback not found or delete failed");
      }

      return { id: result.rows[0].id };
    } catch (error) {
      console.error("❌ Error deleting feedback:", error);
      throw error;
    }
  }

  // Map database row to share object
  mapRowToShare(row) {
    return {
      id: row.id,
      resumeId: row.resume_id,
      shareToken: row.share_token,
      createdBy: row.created_by,
      accessLevel: row.access_level,
      expiresAt: row.expires_at,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }

  // Map database row to feedback object
  mapRowToFeedback(row) {
    return {
      id: row.id,
      resumeId: row.resume_id,
      shareId: row.share_id,
      reviewerEmail: row.reviewer_email,
      reviewerName: row.reviewer_name,
      comment: row.comment,
      sectionReference: row.section_reference,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new ResumeShareService();
