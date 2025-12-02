import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import { teamService, chatService } from "./index.js";

/**
 * Service for Collaborative Resume and Cover Letter Review (UC-110)
 */
class DocumentReviewService {
  /**
   * Request document review
   */
  async requestReview(userId, reviewData) {
    try {
      const { documentType, documentId, reviewerIds, deadline, teamId } = reviewData;

      if (!["resume", "cover_letter"].includes(documentType)) {
        throw new Error("Invalid document type. Must be 'resume' or 'cover_letter'");
      }

      const requests = [];

      for (const reviewerId of reviewerIds) {
        const requestId = uuidv4();
        await database.query(
          `INSERT INTO document_review_requests 
           (id, document_type, document_id, requestor_id, reviewer_id, request_status, deadline)
           VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
          [requestId, documentType, documentId, userId, reviewerId, deadline || null]
        );

        requests.push({
          id: requestId,
          documentType,
          documentId,
          reviewerId,
          status: "pending"
        });

        // Log activity if team context
        if (teamId) {
          await teamService.logActivity(teamId, userId, "candidate", "review_requested", {
            document_type: documentType,
            document_id: documentId,
            reviewer_id: reviewerId
          });
        }

        // Create or get chat conversation for document review
        try {
          await chatService.getOrCreateConversation(userId, {
            conversationType: "document_review",
            teamId: teamId,
            relatedEntityType: documentType,
            relatedEntityId: documentId,
            title: `Review: ${documentType} ${documentId.substring(0, 8)}`,
            participantIds: [reviewerId]
          });
        } catch (chatError) {
          console.error("[DocumentReviewService] Error creating review chat:", chatError);
          // Don't fail review request if chat creation fails
        }
      }

      return requests;
    } catch (error) {
      console.error("[DocumentReviewService] Error requesting review:", error);
      throw error;
    }
  }

  /**
   * Add comment to review
   */
  async addComment(userId, reviewRequestId, commentData) {
    try {
      // Verify reviewer has access
      const reviewRequest = await database.query(
        `SELECT reviewer_id, request_status FROM document_review_requests WHERE id = $1`,
        [reviewRequestId]
      );

      if (reviewRequest.rows.length === 0) {
        throw new Error("Review request not found");
      }

      if (reviewRequest.rows[0].reviewer_id !== userId) {
        throw new Error("You are not authorized to comment on this review");
      }

      if (reviewRequest.rows[0].request_status === "cancelled") {
        throw new Error("This review request has been cancelled");
      }

      const { commentText, suggestionText, commentType, parentCommentId, documentSection } = commentData;

      const commentId = uuidv4();
      await database.query(
        `INSERT INTO review_comments 
         (id, review_request_id, reviewer_id, parent_comment_id, comment_text, suggestion_text, comment_type, document_section)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [commentId, reviewRequestId, userId, parentCommentId || null, commentText, suggestionText || null, commentType || "comment", documentSection || null]
      );

      // Update review status to in_progress
      await database.query(
        `UPDATE document_review_requests 
         SET request_status = 'in_progress' 
         WHERE id = $1 AND request_status = 'pending'`,
        [reviewRequestId]
      );

      return {
        id: commentId,
        reviewRequestId,
        commentText,
        suggestionText,
        commentType,
        createdAt: new Date()
      };
    } catch (error) {
      console.error("[DocumentReviewService] Error adding comment:", error);
      throw error;
    }
  }

  /**
   * Get review with comments
   */
  async getReview(reviewRequestId, userId) {
    try {
      // Get review request
      const reviewRequest = await database.query(
        `SELECT drr.*, 
                u1.email as requestor_email,
                u2.email as reviewer_email
         FROM document_review_requests drr
         JOIN users u1 ON drr.requestor_id = u1.u_id
         JOIN users u2 ON drr.reviewer_id = u2.u_id
         WHERE drr.id = $1`,
        [reviewRequestId]
      );

      if (reviewRequest.rows.length === 0) {
        throw new Error("Review request not found");
      }

      const review = reviewRequest.rows[0];

      // Verify access
      if (review.requestor_id !== userId && review.reviewer_id !== userId) {
        throw new Error("You are not authorized to view this review");
      }

      // Get comments
      const comments = await database.query(
        `SELECT rc.*, u.email as reviewer_email
         FROM review_comments rc
         JOIN users u ON rc.reviewer_id = u.u_id
         WHERE rc.review_request_id = $1
         ORDER BY rc.created_at ASC`,
        [reviewRequestId]
      );

      // Build comment tree
      const commentMap = new Map();
      const rootComments = [];

      comments.rows.forEach(comment => {
        commentMap.set(comment.id, {
          id: comment.id,
          reviewerEmail: comment.reviewer_email,
          commentText: comment.comment_text,
          suggestionText: comment.suggestion_text,
          commentType: comment.comment_type,
          documentSection: comment.document_section,
          isResolved: comment.is_resolved,
          createdAt: comment.created_at,
          replies: []
        });
      });

      comments.rows.forEach(comment => {
        const commentObj = commentMap.get(comment.id);
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies.push(commentObj);
          }
        } else {
          rootComments.push(commentObj);
        }
      });

      return {
        id: review.id,
        documentType: review.document_type,
        documentId: review.document_id,
        requestorId: review.requestor_id,
        requestorEmail: review.requestor_email,
        reviewerId: review.reviewer_id,
        reviewerEmail: review.reviewer_email,
        status: review.request_status,
        deadline: review.deadline,
        reviewCompletedAt: review.review_completed_at,
        comments: rootComments,
        createdAt: review.created_at
      };
    } catch (error) {
      console.error("[DocumentReviewService] Error getting review:", error);
      throw error;
    }
  }

  /**
   * Complete review
   */
  async completeReview(userId, reviewRequestId) {
    try {
      // Verify reviewer
      const reviewRequest = await database.query(
        `SELECT reviewer_id FROM document_review_requests WHERE id = $1`,
        [reviewRequestId]
      );

      if (reviewRequest.rows.length === 0) {
        throw new Error("Review request not found");
      }

      if (reviewRequest.rows[0].reviewer_id !== userId) {
        throw new Error("Only the assigned reviewer can complete this review");
      }

      await database.query(
        `UPDATE document_review_requests 
         SET request_status = 'completed', review_completed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [reviewRequestId]
      );

      return { success: true };
    } catch (error) {
      console.error("[DocumentReviewService] Error completing review:", error);
      throw error;
    }
  }

  /**
   * Get user's review requests (as requestor or reviewer)
   */
  async getUserReviews(userId, role = "all") {
    try {
      let query;
      let params = [userId];

      if (role === "requestor") {
        query = `SELECT drr.*, u.email as reviewer_email
                 FROM document_review_requests drr
                 JOIN users u ON drr.reviewer_id = u.u_id
                 WHERE drr.requestor_id = $1
                 ORDER BY drr.created_at DESC`;
      } else if (role === "reviewer") {
        query = `SELECT drr.*, u.email as requestor_email
                 FROM document_review_requests drr
                 JOIN users u ON drr.requestor_id = u.u_id
                 WHERE drr.reviewer_id = $1
                 ORDER BY drr.created_at DESC`;
      } else {
        query = `SELECT drr.*, 
                        u1.email as requestor_email,
                        u2.email as reviewer_email
                 FROM document_review_requests drr
                 JOIN users u1 ON drr.requestor_id = u1.u_id
                 JOIN users u2 ON drr.reviewer_id = u2.u_id
                 WHERE drr.requestor_id = $1 OR drr.reviewer_id = $1
                 ORDER BY drr.created_at DESC`;
      }

      const result = await database.query(query, params);

      return result.rows.map(row => ({
        id: row.id,
        documentType: row.document_type,
        documentId: row.document_id,
        requestorId: row.requestor_id,
        requestorEmail: row.requestor_email,
        reviewerId: row.reviewer_id,
        reviewerEmail: row.reviewer_email,
        status: row.request_status,
        deadline: row.deadline,
        reviewCompletedAt: row.review_completed_at,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error("[DocumentReviewService] Error getting user reviews:", error);
      throw error;
    }
  }

  /**
   * Track document version
   */
  async trackVersion(documentType, documentId, userId, changeSummary) {
    try {
      // Get current max version
      const maxVersion = await database.query(
        `SELECT COALESCE(MAX(version_number), 0) as max_version
         FROM document_versions
         WHERE document_type = $1 AND document_id = $2`,
        [documentType, documentId]
      );

      const nextVersion = (maxVersion.rows[0]?.max_version || 0) + 1;

      // Store version (would need to get document data)
      await database.query(
        `INSERT INTO document_versions 
         (document_type, document_id, version_number, created_by, change_summary)
         VALUES ($1, $2, $3, $4, $5)`,
        [documentType, documentId, nextVersion, userId, changeSummary || "Document updated"]
      );

      return { versionNumber: nextVersion };
    } catch (error) {
      console.error("[DocumentReviewService] Error tracking version:", error);
      throw error;
    }
  }
}

export default new DocumentReviewService();

