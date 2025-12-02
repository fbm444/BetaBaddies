import { v4 as uuidv4 } from "uuid";
import database from "../database.js";
import { teamService, documentReviewService } from "./index.js";

/**
 * Service for sharing documents (resumes/cover letters) with teams
 */
class DocumentShareService {
  /**
   * Share document with team or individual team members
   * @param {string} userId - User sharing the document
   * @param {object} documentData - { documentType, documentId, teamId, sharedWithUserId (optional), versionNumber }
   */
  async shareDocumentWithTeam(userId, documentData) {
    try {
      const { documentType, documentId, teamId, sharedWithUserId, versionNumber } = documentData;

      if (!["resume", "cover_letter"].includes(documentType)) {
        throw new Error("Invalid document type. Must be 'resume' or 'cover_letter'");
      }

      // Verify user is team member
      const member = await database.query(
        `SELECT role, permissions FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, userId]
      );

      if (member.rows.length === 0) {
        throw new Error("You are not a member of this team");
      }

      // If sharing with specific user, verify they are a team member
      if (sharedWithUserId && sharedWithUserId !== userId) {
        const targetMember = await database.query(
          `SELECT user_id FROM team_members 
           WHERE team_id = $1 AND user_id = $2 AND active = true`,
          [teamId, sharedWithUserId]
        );

        if (targetMember.rows.length === 0) {
          throw new Error("Target user is not a member of this team");
        }
      }

      // Check if document exists
      let documentExists = false;
      if (documentType === "resume") {
        const resume = await database.query(
          `SELECT id FROM resume WHERE id = $1 AND user_id = $2`,
          [documentId, userId]
        );
        documentExists = resume.rows.length > 0;
      } else if (documentType === "cover_letter") {
        const coverLetter = await database.query(
          `SELECT id FROM coverletter WHERE id = $1 AND user_id = $2`,
          [documentId, userId]
        );
        documentExists = coverLetter.rows.length > 0;
      }

      if (!documentExists) {
        throw new Error("Document not found or you don't have access to it");
      }

      // Check if already shared (team-wide or with specific user)
      const existing = await database.query(
        `SELECT id FROM shared_documents 
         WHERE document_type = $1 AND document_id = $2 AND team_id = $3 
         AND (shared_with_user_id = $4 OR (shared_with_user_id IS NULL AND $4 IS NULL))`,
        [documentType, documentId, teamId, sharedWithUserId || null]
      );

      if (existing.rows.length > 0) {
        // Update existing share with new version
        await database.query(
          `UPDATE shared_documents 
           SET version_number = $1, shared_at = CURRENT_TIMESTAMP, shared_by = $2
           WHERE id = $3`,
          [versionNumber || null, userId, existing.rows[0].id]
        );
        return { id: existing.rows[0].id, documentId, teamId, sharedWithUserId, isUpdate: true };
      }

      // Share document
      const shareId = uuidv4();
      await database.query(
        `INSERT INTO shared_documents 
         (id, document_type, document_id, shared_by, shared_by_role, team_id, shared_with_user_id, version_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [shareId, documentType, documentId, userId, member.rows[0].role, teamId, sharedWithUserId || null, versionNumber || null]
      );

      // Track version if provided
      if (versionNumber) {
        try {
          const shareTarget = sharedWithUserId ? "specific team member" : "team";
          await documentReviewService.trackVersion(documentType, documentId, userId, `Shared with ${shareTarget}`);
        } catch (versionError) {
          console.error("[DocumentShareService] Error tracking version:", versionError);
          // Don't fail share if version tracking fails
        }
      }

      // Log activity
      await teamService.logActivity(teamId, userId, member.rows[0].role, "document_shared", {
        document_type: documentType,
        document_id: documentId,
        version_number: versionNumber,
        shared_with_user_id: sharedWithUserId || null
      });

      return { id: shareId, documentId, teamId, sharedWithUserId };
    } catch (error) {
      console.error("[DocumentShareService] Error sharing document:", error);
      throw error;
    }
  }

  /**
   * Get shared documents for team
   */
  async getSharedDocuments(teamId, userId) {
    try {
      // Verify user is team member
      const member = await database.query(
        `SELECT role FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, userId]
      );

      if (member.rows.length === 0) {
        throw new Error("You are not a member of this team");
      }

      // Get shared documents:
      // 1. Documents shared with the user (team-wide OR specifically with them)
      // 2. Documents the user has shared (regardless of who they're shared with)
      const sharedDocs = await database.query(
        `SELECT sd.*, 
                u.email as shared_by_email,
                p.first_name as shared_by_first_name,
                p.last_name as shared_by_last_name,
                shared_with_u.email as shared_with_email,
                shared_with_p.first_name as shared_with_first_name,
                shared_with_p.last_name as shared_with_last_name
         FROM shared_documents sd
         JOIN users u ON sd.shared_by = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         LEFT JOIN users shared_with_u ON sd.shared_with_user_id = shared_with_u.u_id
         LEFT JOIN profiles shared_with_p ON shared_with_u.u_id = shared_with_p.user_id
         WHERE sd.team_id = $1 
         AND (
           sd.shared_by = $2  -- Documents I shared
           OR 
           (sd.shared_with_user_id IS NULL OR sd.shared_with_user_id = $2)  -- Documents shared with me
         )
         ORDER BY sd.shared_at DESC`,
        [teamId, userId]
      );

      // Enrich with document details
      const documents = await Promise.all(
        sharedDocs.rows.map(async (row) => {
          let documentData = null;
          let documentName = "Unknown";

          if (row.document_type === "resume") {
            const resume = await database.query(
              `SELECT id, version_name as name, created_at, updated_at
               FROM resume WHERE id = $1`,
              [row.document_id]
            );
            if (resume.rows.length > 0) {
              documentData = resume.rows[0];
              documentName = resume.rows[0].name || "Untitled Resume";
            }
          } else if (row.document_type === "cover_letter") {
            const coverLetter = await database.query(
              `SELECT id, version_name as title, job_id, created_at, updated_at
               FROM coverletter WHERE id = $1`,
              [row.document_id]
            );
            if (coverLetter.rows.length > 0) {
              documentData = coverLetter.rows[0];
              documentName = coverLetter.rows[0].title || "Untitled Cover Letter";
            }
          }

          // Get comment count (using review_comments table with team-based query)
          const commentCount = await database.query(
            `SELECT COUNT(*) as count
             FROM review_comments
             WHERE document_type = $1 AND document_id = $2 AND team_id = $3 AND review_request_id IS NULL`,
            [row.document_type, row.document_id, teamId]
          );

          return {
            id: row.id,
            documentType: row.document_type,
            documentId: row.document_id,
            documentName,
            documentData,
            sharedBy: row.shared_by,
            sharedByEmail: row.shared_by_email,
            sharedByName: row.shared_by_first_name && row.shared_by_last_name
              ? `${row.shared_by_first_name} ${row.shared_by_last_name}`
              : row.shared_by_email,
            sharedByRole: row.shared_by_role,
            teamId: row.team_id,
            sharedWithUserId: row.shared_with_user_id,
            sharedWithEmail: row.shared_with_email,
            sharedWithName: row.shared_with_first_name && row.shared_with_last_name
              ? `${row.shared_with_first_name} ${row.shared_with_last_name}`
              : row.shared_with_email,
            isTeamWide: !row.shared_with_user_id,
            versionNumber: row.version_number,
            sharedAt: row.shared_at,
            commentCount: parseInt(commentCount.rows[0]?.count || 0)
          };
        })
      );

      return documents;
    } catch (error) {
      console.error("[DocumentShareService] Error getting shared documents:", error);
      throw error;
    }
  }

  /**
   * Add comment to shared document
   */
  async addDocumentComment(userId, commentData) {
    try {
      const { documentType, documentId, teamId, commentText, parentCommentId, documentSection } = commentData;

      // Verify user is team member
      const member = await database.query(
        `SELECT role FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, userId]
      );

      if (member.rows.length === 0) {
        throw new Error("You are not a member of this team");
      }

      // Verify document is shared with team
      const shared = await database.query(
        `SELECT id FROM shared_documents 
         WHERE document_type = $1 AND document_id = $2 AND team_id = $3`,
        [documentType, documentId, teamId]
      );

      if (shared.rows.length === 0) {
        throw new Error("Document is not shared with this team");
      }

      // Use review_comments table with team-based fields (review_request_id is NULL for team comments)
      const commentId = uuidv4();
      await database.query(
        `INSERT INTO review_comments 
         (id, review_request_id, reviewer_id, document_type, document_id, team_id, parent_comment_id, comment_text, document_section)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8)`,
        [commentId, userId, documentType, documentId, teamId, parentCommentId || null, commentText, documentSection || null]
      );

      // Log activity
      await teamService.logActivity(teamId, userId, member.rows[0].role, "document_comment_added", {
        document_type: documentType,
        document_id: documentId,
        comment_id: commentId
      });

      return {
        id: commentId,
        documentType,
        documentId,
        teamId,
        commentText,
        parentCommentId,
        documentSection,
        createdAt: new Date()
      };
    } catch (error) {
      console.error("[DocumentShareService] Error adding comment:", error);
      throw error;
    }
  }

  /**
   * Get comments for shared document
   */
  async getDocumentComments(documentType, documentId, teamId, userId) {
    try {
      // Verify user is team member
      const member = await database.query(
        `SELECT role FROM team_members 
         WHERE team_id = $1 AND user_id = $2 AND active = true`,
        [teamId, userId]
      );

      if (member.rows.length === 0) {
        throw new Error("You are not a member of this team");
      }

      // Get comments from review_comments table (team-based comments have review_request_id = NULL)
      const comments = await database.query(
        `SELECT rc.*, 
                u.email as commenter_email,
                p.first_name as commenter_first_name,
                p.last_name as commenter_last_name,
                p.pfp_link as commenter_pfp
         FROM review_comments rc
         JOIN users u ON rc.reviewer_id = u.u_id
         LEFT JOIN profiles p ON u.u_id = p.user_id
         WHERE rc.document_type = $1 AND rc.document_id = $2 AND rc.team_id = $3 AND rc.review_request_id IS NULL
         ORDER BY rc.created_at ASC`,
        [documentType, documentId, teamId]
      );

      // Build comment tree
      const commentMap = new Map();
      const rootComments = [];

      comments.rows.forEach(comment => {
        commentMap.set(comment.id, {
          id: comment.id,
          commenterId: comment.reviewer_id, // Using reviewer_id from review_comments
          commenterEmail: comment.commenter_email,
          commenterName: comment.commenter_first_name && comment.commenter_last_name
            ? `${comment.commenter_first_name} ${comment.commenter_last_name}`
            : comment.commenter_email,
          commenterPfp: comment.commenter_pfp,
          commentText: comment.comment_text,
          documentSection: comment.document_section,
          parentCommentId: comment.parent_comment_id,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
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

      return rootComments;
    } catch (error) {
      console.error("[DocumentShareService] Error getting comments:", error);
      throw error;
    }
  }

  /**
   * Get document details for viewing
   * Verifies that the document is shared with a team the user belongs to
   */
  async getDocumentDetails(documentType, documentId, userId) {
    try {
      // First verify the user has access to this document through team sharing
      // User has access if:
      // 1. They shared the document (shared_by = userId)
      // 2. The document is shared with them (team-wide or specifically)
      const hasAccess = await database.query(
        `SELECT sd.id 
         FROM shared_documents sd
         JOIN team_members tm ON sd.team_id = tm.team_id
         WHERE sd.document_type = $1 
           AND sd.document_id = $2
           AND tm.user_id = $3
           AND tm.active = true
           AND (
             sd.shared_by = $3  -- User shared this document
             OR 
             (sd.shared_with_user_id IS NULL OR sd.shared_with_user_id = $3)  -- Document shared with user
           )
         LIMIT 1`,
        [documentType, documentId, userId]
      );

      if (hasAccess.rows.length === 0) {
        throw new Error("You do not have access to this document");
      }

      let document = null;

      if (documentType === "resume") {
        const resume = await database.query(
          `SELECT r.*, u.email as owner_email
           FROM resume r
           JOIN users u ON r.user_id = u.u_id
           WHERE r.id = $1`,
          [documentId]
        );
        if (resume.rows.length > 0) {
          const row = resume.rows[0];
          document = {
            id: row.id,
            name: row.name || row.version_name || "Untitled Resume",
            versionName: row.version_name,
            content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
            customizations: typeof row.customizations === 'string' ? JSON.parse(row.customizations) : (row.customizations || {}),
            sectionConfig: typeof row.section_config === 'string' ? JSON.parse(row.section_config) : (row.section_config || {}),
            versionNumber: row.version_number || 1,
            isMaster: row.is_master || false,
            ownerEmail: row.owner_email,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
        }
      } else if (documentType === "cover_letter") {
        const coverLetter = await database.query(
          `SELECT cl.*, u.email as owner_email
           FROM coverletter cl
           JOIN users u ON cl.user_id = u.u_id
           WHERE cl.id = $1`,
          [documentId]
        );
        if (coverLetter.rows.length > 0) {
          const row = coverLetter.rows[0];
          document = {
            id: row.id,
            name: row.version_name || "Untitled Cover Letter",
            versionName: row.version_name,
            content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
            customizations: typeof row.customizations === 'string' ? JSON.parse(row.customizations) : (row.customizations || {}),
            jobId: row.job_id,
            versionNumber: row.version_number || 1,
            ownerEmail: row.owner_email,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
        }
      }

      if (!document) {
        throw new Error("Document not found");
      }

      return document;
    } catch (error) {
      console.error("[DocumentShareService] Error getting document details:", error);
      throw error;
    }
  }
}

export default new DocumentShareService();

