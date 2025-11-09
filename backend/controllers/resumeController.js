import {
  coreService as resumeService,
  templateService as resumeTemplateService,
  commentService as resumeCommentService,
  tailoringService as resumeTailoringService,
  shareService as resumeShareService,
  exportService as resumeExportService,
  validationService as resumeValidationService,
  sectionService as resumeSectionService,
  versionService as resumeVersionService,
  parseService as resumeParseService,
  aiService as resumeAIAssistantService,
} from "../services/resumes/index.js";
import profileService from "../services/profileService.js";
import skillService from "../services/skillService.js";
import jobService from "../services/jobService.js";
import educationService from "../services/educationService.js";
import projectService from "../services/projectService.js";
import certificationService from "../services/certificationService.js";
import fileUploadService from "../services/fileUploadService.js";
import prospectiveJobService from "../services/prospectiveJobService.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import fs from "fs/promises";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ResumeController {
  // Create a new resume
  createResume = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const resumeData = req.body;

    const resume = await resumeService.createResume(userId, resumeData);

    res.status(201).json({
      ok: true,
      data: {
        resume: {
          id: resume.id,
          userId: resume.userId,
          versionName: resume.versionName,
          description: resume.description,
          createdAt: resume.createdAt,
          updatedAt: resume.updatedAt,
          file: resume.file,
          commentsId: resume.commentsId,
          templateId: resume.templateId || null,
          jobId: resume.jobId || null,
          content: resume.content || null,
          sectionConfig: resume.sectionConfig || null,
          customizations: resume.customizations || null,
          versionNumber: resume.versionNumber || 1,
          parentResumeId: resume.parentResumeId || null,
          isMaster: resume.isMaster || false,
        },
        message: "Resume created successfully",
      },
    });
  });

  // Get all resumes for the authenticated user
  getResumes = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { sort, limit, offset } = req.query;

    const options = { sort, limit, offset };
    const resumes = await resumeService.getResumesByUserId(userId, options);

    res.status(200).json({
      ok: true,
      data: {
        resumes: resumes.map((resume) => ({
          id: resume.id,
          userId: resume.userId,
          versionName: resume.versionName,
          description: resume.description,
          createdAt: resume.createdAt,
          updatedAt: resume.updatedAt,
          file: resume.file,
          commentsId: resume.commentsId,
          templateId: resume.templateId || null,
          jobId: resume.jobId || null,
          versionNumber: resume.versionNumber || 1,
          parentResumeId: resume.parentResumeId || null,
          isMaster: resume.isMaster || false,
        })),
        count: resumes.length,
      },
    });
  });

  // Get resume by ID
  getResume = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    // Validate UUID format
    if (!resumeService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid resume ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const resume = await resumeService.getResumeById(id, userId);

    if (!resume) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Resume not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        resume: {
          id: resume.id,
          userId: resume.userId,
          versionName: resume.versionName,
          description: resume.description,
          createdAt: resume.createdAt,
          updatedAt: resume.updatedAt,
          file: resume.file,
          commentsId: resume.commentsId,
          templateId: resume.templateId || null,
          jobId: resume.jobId || null,
          content: resume.content || null,
          sectionConfig: resume.sectionConfig || null,
          customizations: resume.customizations || null,
          versionNumber: resume.versionNumber || 1,
          parentResumeId: resume.parentResumeId || null,
          isMaster: resume.isMaster || false,
        },
      },
    });
  });

  // Update resume
  updateResume = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const resumeData = req.body;

    // Validate UUID format
    if (!resumeService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid resume ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const resume = await resumeService.updateResume(id, userId, resumeData);

    res.status(200).json({
      ok: true,
      data: {
        resume: {
          id: resume.id,
          userId: resume.userId,
          versionName: resume.versionName,
          description: resume.description,
          createdAt: resume.createdAt,
          updatedAt: resume.updatedAt,
          file: resume.file,
          commentsId: resume.commentsId,
          templateId: resume.templateId || null,
          jobId: resume.jobId || null,
          content: resume.content || null,
          sectionConfig: resume.sectionConfig || null,
          customizations: resume.customizations || null,
          versionNumber: resume.versionNumber || 1,
          parentResumeId: resume.parentResumeId || null,
          isMaster: resume.isMaster || false,
        },
        message: "Resume updated successfully",
      },
    });
  });

  // Delete resume
  deleteResume = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    // Validate UUID format
    if (!resumeService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid resume ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    await resumeService.deleteResume(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Resume deleted successfully",
      },
    });
  });

  // Duplicate resume
  duplicateResume = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { versionName } = req.body;

    // Validate UUID format
    if (!resumeService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid resume ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const newResume = await resumeService.duplicateResume(
      id,
      userId,
      versionName
    );

    res.status(201).json({
      ok: true,
      data: {
        resume: {
          id: newResume.id,
          userId: newResume.userId,
          versionName: newResume.versionName,
          description: newResume.description,
          createdAt: newResume.createdAt,
          updatedAt: newResume.updatedAt,
          file: newResume.file,
          commentsId: newResume.commentsId,
        },
        message: "Resume duplicated successfully",
      },
    });
  });

  // Template Management

  // Get all templates
  getTemplates = asyncHandler(async (req, res) => {
    const { templateName, templateType, includeDefaults = "true" } = req.query;
    const options = {
      templateName,
      includeDefaults: includeDefaults === "true",
    };

    let templates = await resumeTemplateService.getTemplates(options);

    // Filter by template type if provided
    if (templateType) {
      templates = templates.filter(
        (t) =>
          (t.templateType || "").toLowerCase() === templateType.toLowerCase()
      );
    }

    res.status(200).json({
      ok: true,
      data: {
        templates: templates.map((template) => ({
          id: template.id,
          templateName: template.templateName,
          templateType: template.templateType || null,
          description: template.description,
          colors: template.colors,
          fonts: template.fonts,
          sectionOrder: template.sectionOrder || null,
          isDefault: template.isDefault || false,
          isShared: template.isShared || false,
          layoutConfig: template.layoutConfig || null,
          existingResumeTemplate: template.existingResumeTemplate,
        })),
        count: templates.length,
      },
    });
  });

  // Get template by ID
  getTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await resumeTemplateService.getTemplateById(id);

    if (!template) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Template not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        template: {
          id: template.id,
          templateName: template.templateName,
          templateType: template.templateType || null,
          description: template.description,
          colors: template.colors,
          fonts: template.fonts,
          sectionOrder: template.sectionOrder || null,
          isDefault: template.isDefault || false,
          isShared: template.isShared || false,
          layoutConfig: template.layoutConfig || null,
          existingResumeTemplate: template.existingResumeTemplate,
        },
      },
    });
  });

  // Get template preview
  getTemplatePreview = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const previewHTML = await resumeTemplateService.getTemplatePreview(id);

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(previewHTML);
  });

  // Create template
  createTemplate = asyncHandler(async (req, res) => {
    const templateData = req.body;

    const template = await resumeTemplateService.createTemplate(templateData);

    res.status(201).json({
      ok: true,
      data: {
        template: {
          id: template.id,
          templateName: template.templateName,
          description: template.description,
          colors: template.colors,
          fonts: template.fonts,
          existingResumeTemplate: template.existingResumeTemplate,
        },
        message: "Template created successfully",
      },
    });
  });

  // Update template
  updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const templateData = req.body;

    const template = await resumeTemplateService.updateTemplate(
      id,
      templateData
    );

    res.status(200).json({
      ok: true,
      data: {
        template: {
          id: template.id,
          templateName: template.templateName,
          description: template.description,
          colors: template.colors,
          fonts: template.fonts,
          existingResumeTemplate: template.existingResumeTemplate,
        },
        message: "Template updated successfully",
      },
    });
  });

  // Delete template
  deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await resumeTemplateService.deleteTemplate(id);

    res.status(200).json({
      ok: true,
      data: {
        message: "Template deleted successfully",
      },
    });
  });

  // Comments Management

  // Get comments for a resume
  getComments = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const comments = await resumeCommentService.getCommentsByResumeId(id);

    res.status(200).json({
      ok: true,
      data: {
        comments: comments.map((comment) => ({
          id: comment.id,
          resumeId: comment.resumeId,
          commenter: comment.commenter,
          comment: comment.comment,
        })),
        count: comments.length,
      },
    });
  });

  // Create comment
  createComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const commentData = req.body;

    const comment = await resumeCommentService.createComment(id, commentData);

    res.status(201).json({
      ok: true,
      data: {
        comment: {
          id: comment.id,
          resumeId: comment.resumeId,
          commenter: comment.commenter,
          comment: comment.comment,
        },
        message: "Comment created successfully",
      },
    });
  });

  // Update comment
  updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const commentData = req.body;

    const comment = await resumeCommentService.updateComment(
      commentId,
      commentData
    );

    res.status(200).json({
      ok: true,
      data: {
        comment: {
          id: comment.id,
          resumeId: comment.resumeId,
          commenter: comment.commenter,
          comment: comment.comment,
        },
        message: "Comment updated successfully",
      },
    });
  });

  // Delete comment
  deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    await resumeCommentService.deleteComment(commentId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Comment deleted successfully",
      },
    });
  });

  // Tailoring Management

  // Get tailoring for a resume
  getTailoring = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const tailoring = await resumeTailoringService.getTailoringByResumeId(id);

    if (!tailoring) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Tailoring not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        tailoring: {
          id: tailoring.id,
          userId: tailoring.userId,
          workexpDescription: tailoring.workexpDescription,
        },
      },
    });
  });

  // Create or update tailoring
  createOrUpdateTailoring = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const tailoringData = req.body;

    const tailoring = await resumeTailoringService.createOrUpdateTailoring(
      id,
      userId,
      tailoringData
    );

    res.status(200).json({
      ok: true,
      data: {
        tailoring: {
          id: tailoring.id,
          userId: tailoring.userId,
          workexpDescription: tailoring.workexpDescription,
        },
        message: "Tailoring saved successfully",
      },
    });
  });

  // Delete tailoring
  deleteTailoring = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await resumeTailoringService.deleteTailoring(id);

    res.status(200).json({
      ok: true,
      data: {
        message: "Tailoring deleted successfully",
      },
    });
  });

  // Sharing Management

  // Create shareable link
  createShare = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const shareData = req.body;

    const share = await resumeShareService.createShare(id, userId, shareData);

    res.status(201).json({
      ok: true,
      data: {
        share: {
          id: share.id,
          resumeId: share.resumeId,
          shareToken: share.shareToken,
          accessLevel: share.accessLevel,
          expiresAt: share.expiresAt,
          isActive: share.isActive,
          createdAt: share.createdAt,
          shareUrl: `${
            process.env.FRONTEND_URL || "http://localhost:3000"
          }/resumes/shared/${share.shareToken}`,
        },
        message: "Shareable link created successfully",
      },
    });
  });

  // Get all shares for a resume
  getShares = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const shares = await resumeShareService.getSharesByResumeId(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        shares: shares.map((share) => ({
          id: share.id,
          resumeId: share.resumeId,
          shareToken: share.shareToken,
          accessLevel: share.accessLevel,
          expiresAt: share.expiresAt,
          isActive: share.isActive,
          createdAt: share.createdAt,
          shareUrl: `${
            process.env.FRONTEND_URL || "http://localhost:3000"
          }/resumes/shared/${share.shareToken}`,
        })),
        count: shares.length,
      },
    });
  });

  // Get share by ID
  getShare = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { shareId } = req.params;

    const share = await resumeShareService.getShareById(shareId, userId);

    if (!share) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Share not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        share: {
          id: share.id,
          resumeId: share.resumeId,
          shareToken: share.shareToken,
          accessLevel: share.accessLevel,
          expiresAt: share.expiresAt,
          isActive: share.isActive,
          createdAt: share.createdAt,
          shareUrl: `${
            process.env.FRONTEND_URL || "http://localhost:3000"
          }/resumes/shared/${share.shareToken}`,
        },
      },
    });
  });

  // Update share
  updateShare = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { shareId } = req.params;
    const shareData = req.body;

    const share = await resumeShareService.updateShare(
      shareId,
      userId,
      shareData
    );

    res.status(200).json({
      ok: true,
      data: {
        share: {
          id: share.id,
          resumeId: share.resumeId,
          shareToken: share.shareToken,
          accessLevel: share.accessLevel,
          expiresAt: share.expiresAt,
          isActive: share.isActive,
          createdAt: share.createdAt,
          shareUrl: `${
            process.env.FRONTEND_URL || "http://localhost:3000"
          }/resumes/shared/${share.shareToken}`,
        },
        message: "Share updated successfully",
      },
    });
  });

  // Revoke share
  revokeShare = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { shareId } = req.params;

    await resumeShareService.revokeShare(shareId, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Share revoked successfully",
      },
    });
  });

  // Delete share
  deleteShare = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { shareId } = req.params;

    await resumeShareService.deleteShare(shareId, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Share deleted successfully",
      },
    });
  });

  // Get shared resume (public endpoint - no auth required)
  getSharedResume = asyncHandler(async (req, res) => {
    const { token } = req.params;

    // Verify share token and get resume
    const share = await resumeShareService.getShareByToken(token);
    if (!share) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Share link not found or expired",
        },
      });
    }

    // Get resume data
    const resume = await resumeService.getResumeById(
      share.resumeId,
      share.createdBy
    );
    if (!resume) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Resume not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        resume: {
          id: resume.id,
          versionName: resume.versionName,
          description: resume.description,
          createdAt: resume.createdAt,
          updatedAt: resume.updatedAt,
          file: resume.file,
        },
        share: {
          accessLevel: share.accessLevel,
          expiresAt: share.expiresAt,
        },
      },
    });
  });

  // Create feedback on shared resume (public endpoint)
  createFeedback = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const feedbackData = req.body;

    const feedback = await resumeShareService.createFeedback(
      token,
      feedbackData
    );

    res.status(201).json({
      ok: true,
      data: {
        feedback: {
          id: feedback.id,
          resumeId: feedback.resumeId,
          reviewerEmail: feedback.reviewerEmail,
          reviewerName: feedback.reviewerName,
          comment: feedback.comment,
          sectionReference: feedback.sectionReference,
          status: feedback.status,
          createdAt: feedback.createdAt,
        },
        message: "Feedback submitted successfully",
      },
    });
  });

  // Get all feedback for a resume (owner only)
  getFeedback = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const feedback = await resumeShareService.getFeedbackByResumeId(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        feedback: feedback.map((item) => ({
          id: item.id,
          resumeId: item.resumeId,
          shareId: item.shareId,
          reviewerEmail: item.reviewerEmail,
          reviewerName: item.reviewerName,
          comment: item.comment,
          sectionReference: item.sectionReference,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        count: feedback.length,
      },
    });
  });

  // Update feedback status (owner only)
  updateFeedbackStatus = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { feedbackId } = req.params;
    const { status } = req.body;

    const feedback = await resumeShareService.updateFeedbackStatus(
      feedbackId,
      userId,
      status
    );

    res.status(200).json({
      ok: true,
      data: {
        feedback: {
          id: feedback.id,
          resumeId: feedback.resumeId,
          reviewerEmail: feedback.reviewerEmail,
          reviewerName: feedback.reviewerName,
          comment: feedback.comment,
          sectionReference: feedback.sectionReference,
          status: feedback.status,
          createdAt: feedback.createdAt,
          updatedAt: feedback.updatedAt,
        },
        message: "Feedback status updated successfully",
      },
    });
  });

  // Delete feedback (owner only)
  deleteFeedback = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { feedbackId } = req.params;

    await resumeShareService.deleteFeedback(feedbackId, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Feedback deleted successfully",
      },
    });
  });

  // Export Management

  // Export to PDF from HTML (new method - receives HTML from frontend)
  // Note: HTML is ignored, we use resumeData.id to fetch from database
  exportPDFFromHTML = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { html, filename, resumeData } = req.body;

    // Require resumeData for reliable export
    if (!resumeData || !resumeData.id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "MISSING_RESUME_DATA",
          message: "Resume data with ID is required for export",
        },
      });
    }

    // Use existing exportService - it already does direct PDF generation
    const result = await resumeExportService.exportPDF(resumeData.id, userId, {
      filename,
    });

    // Read file content and send it
    const fileContent = await fs.readFile(result.filePath);

    // Send file content with proper headers
    res.setHeader("Content-Type", result.contentType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.fileName}"`
    );
    res.send(fileContent);
  });

  // Export to PDF (legacy method - kept for backward compatibility)
  exportPDF = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { filename, watermark } = req.query;

    // Validate UUID format
    if (!resumeService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid resume ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const result = await resumeExportService.exportPDF(id, userId, {
      filename,
      watermark: watermark === "true",
    });

    // Check if file exists
    try {
      await fs.access(result.filePath);
    } catch (error) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "FILE_NOT_FOUND",
          message: "Export file not found",
        },
      });
    }

    // Read file content and send it
    // For PDF and DOCX, read as binary (no encoding)
    const isBinary =
      result.contentType === "application/pdf" ||
      result.contentType?.includes("application/vnd.openxmlformats");

    const fileContent = isBinary
      ? await fs.readFile(result.filePath)
      : await fs.readFile(result.filePath, "utf8");

    // Send file content with proper headers
    res.setHeader("Content-Type", result.contentType || "text/html");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.fileName}"`
    );
    res.send(fileContent);
  });

  // Export to DOCX from HTML (new method - receives HTML from frontend)
  // Note: HTML is ignored, we use resumeData.id to fetch from database
  exportDOCXFromHTML = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { html, filename, resumeData } = req.body;

    // Require resumeData for reliable export
    if (!resumeData || !resumeData.id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "MISSING_RESUME_DATA",
          message: "Resume data with ID is required for export",
        },
      });
    }

    // Use existing exportService - it already does direct DOCX generation
    const result = await resumeExportService.exportDOCX(resumeData.id, userId, {
      filename,
    });

    // Read file content and send it
    const fileContent = await fs.readFile(result.filePath);

    // Send file content with proper headers
    res.setHeader(
      "Content-Type",
      result.contentType ||
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.fileName}"`
    );
    res.send(fileContent);
  });

  // Export to DOCX (legacy method - kept for backward compatibility)
  exportDOCX = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { filename } = req.query;

    // Validate UUID format
    if (!resumeService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid resume ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const result = await resumeExportService.exportDOCX(id, userId, {
      filename,
    });

    // Check if file exists
    try {
      await fs.access(result.filePath);
    } catch (error) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "FILE_NOT_FOUND",
          message: "Export file not found",
        },
      });
    }

    // Read file content and send it
    // For PDF and DOCX, read as binary (no encoding)
    const isBinary =
      result.contentType === "application/pdf" ||
      result.contentType?.includes("application/vnd.openxmlformats");

    const fileContent = isBinary
      ? await fs.readFile(result.filePath)
      : await fs.readFile(result.filePath, "utf8");

    // Send file content with proper headers
    res.setHeader("Content-Type", result.contentType || "text/plain");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.fileName}"`
    );
    res.send(fileContent);
  });

  // Export to TXT
  exportTXT = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { filename } = req.query;

    // Validate UUID format
    if (!resumeService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid resume ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const result = await resumeExportService.exportTXT(id, userId, {
      filename,
    });

    // Check if file exists
    try {
      await fs.access(result.filePath);
    } catch (error) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "FILE_NOT_FOUND",
          message: "Export file not found",
        },
      });
    }

    // Read file content and send it
    // For PDF and DOCX, read as binary (no encoding)
    const isBinary =
      result.contentType === "application/pdf" ||
      result.contentType?.includes("application/vnd.openxmlformats");

    const fileContent = isBinary
      ? await fs.readFile(result.filePath)
      : await fs.readFile(result.filePath, "utf8");

    // Send file content with proper headers
    res.setHeader("Content-Type", result.contentType || "text/plain");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.fileName}"`
    );
    res.send(fileContent);
  });

  // Export to HTML
  exportHTML = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { filename, watermark } = req.query;

    // Validate UUID format
    if (!resumeService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid resume ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const result = await resumeExportService.exportHTML(id, userId, {
      filename,
      watermark: watermark === "true",
    });

    // Check if file exists
    try {
      await fs.access(result.filePath);
    } catch (error) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "FILE_NOT_FOUND",
          message: "Export file not found",
        },
      });
    }

    // Read file content and send it
    const fileContent = await fs.readFile(result.filePath, "utf8");

    // Send file content with proper headers
    res.setHeader("Content-Type", result.contentType || "text/html");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.fileName}"`
    );
    res.send(fileContent);
  });

  // Validation Management

  // Validate resume
  validateResume = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const validation = await resumeValidationService.validateResume(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        validation,
        message: "Validation completed",
      },
    });
  });

  // Get validation issues
  getValidationIssues = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const issues = await resumeValidationService.getValidationIssues(id);

    res.status(200).json({
      ok: true,
      data: {
        issues,
        count: issues.length,
      },
    });
  });

  // AI-powered resume critique
  critiqueResume = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { jobDescription } = req.body;

    try {
      const critique = await resumeValidationService.critiqueResume(
        id,
        userId,
        jobDescription || null
      );

      res.status(200).json({
        ok: true,
        data: {
          critique,
          message: "Resume critique completed",
        },
      });
    } catch (error) {
      console.error("❌ Error critiquing resume:", error);
      res.status(500).json({
        ok: false,
        error: {
          code: "CRITIQUE_ERROR",
          message: error.message || "Failed to critique resume",
        },
      });
    }
  });

  // Resolve validation issue
  resolveValidationIssue = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { issueId } = req.params;

    await resumeValidationService.resolveIssue(issueId, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Validation issue resolved",
      },
    });
  });

  // Section Management

  // Get section configuration
  getSectionConfig = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const sectionConfig = await resumeSectionService.getSectionConfig(
      id,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        sectionConfig,
      },
    });
  });

  // Update section configuration
  updateSectionConfig = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { sectionConfig } = req.body;

    const updated = await resumeSectionService.updateSectionConfig(
      id,
      userId,
      sectionConfig
    );

    res.status(200).json({
      ok: true,
      data: {
        sectionConfig: updated,
        message: "Section configuration updated successfully",
      },
    });
  });

  // Toggle section
  toggleSection = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id, sectionId } = req.params;
    const { enabled } = req.body;

    const sectionConfig = await resumeSectionService.toggleSection(
      id,
      userId,
      sectionId,
      enabled
    );

    res.status(200).json({
      ok: true,
      data: {
        sectionConfig,
        message: `Section ${enabled ? "enabled" : "disabled"} successfully`,
      },
    });
  });

  // Reorder sections
  reorderSections = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { order } = req.body;

    const sectionConfig = await resumeSectionService.reorderSections(
      id,
      userId,
      order
    );

    res.status(200).json({
      ok: true,
      data: {
        sectionConfig,
        message: "Sections reordered successfully",
      },
    });
  });

  // Get section presets
  getSectionPresets = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const presets = await resumeSectionService.getSectionPresets(userId);

    res.status(200).json({
      ok: true,
      data: {
        presets,
        count: presets.length,
      },
    });
  });

  // Apply section preset
  applySectionPreset = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { presetId } = req.body;

    const sectionConfig = await resumeSectionService.applySectionPreset(
      id,
      userId,
      presetId
    );

    res.status(200).json({
      ok: true,
      data: {
        sectionConfig,
        message: "Section preset applied successfully",
      },
    });
  });

  // Version Management

  // Get all versions
  getVersions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const versions = await resumeVersionService.getVersions(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        resumes: versions, // Frontend expects 'resumes' not 'versions'
        versions: versions, // Keep both for backward compatibility
        count: versions.length,
      },
    });
  });

  // Create new version
  createVersion = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { versionName, description, jobId } = req.body;

    const newVersion = await resumeVersionService.createVersion(id, userId, {
      versionName,
      description,
      jobId, // Support jobId for different job types
    });

    res.status(201).json({
      ok: true,
      data: {
        resume: {
          id: newVersion.id,
          userId: newVersion.userId,
          versionName: newVersion.versionName,
          description: newVersion.description,
          createdAt: newVersion.createdAt,
          updatedAt: newVersion.updatedAt,
          file: newVersion.file,
          commentsId: newVersion.commentsId,
          templateId: newVersion.templateId || null,
          jobId: newVersion.jobId || null,
          content: newVersion.content || null,
          sectionConfig: newVersion.sectionConfig || null,
          customizations: newVersion.customizations || null,
          versionNumber: newVersion.versionNumber || 1,
          parentResumeId: newVersion.parentResumeId || null,
          isMaster: newVersion.isMaster || false,
        },
        message: "Resume version created successfully",
      },
    });
  });

  // Compare versions
  compareVersions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { resumeId2 } = req.query;

    if (!resumeId2) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "resumeId2 query parameter is required",
        },
      });
    }

    const comparison = await resumeVersionService.compareVersions(
      id,
      resumeId2,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        comparison,
      },
    });
  });

  // Merge versions
  mergeVersions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { sourceResumeId, fields } = req.body;

    if (!sourceResumeId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "sourceResumeId is required",
        },
      });
    }

    const mergeResult = await resumeVersionService.mergeVersions(
      id,
      sourceResumeId,
      userId,
      {
        fields: fields || ["versionName", "description", "file"],
      }
    );

    res.status(200).json({
      ok: true,
      data: {
        targetResume: {
          id: mergeResult.targetResume.id,
          versionName: mergeResult.targetResume.versionName,
          description: mergeResult.targetResume.description,
          updatedAt: mergeResult.targetResume.updatedAt,
        },
        sourceResume: {
          id: mergeResult.sourceResume.id,
          versionName: mergeResult.sourceResume.versionName,
        },
        mergedFields: mergeResult.mergedFields,
        message: "Versions merged successfully",
      },
    });
  });

  // Set master version
  setMasterVersion = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const resume = await resumeVersionService.setMasterVersion(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        resume: {
          id: resume.id,
          versionName: resume.versionName,
          isMaster: resume.isMaster || true,
        },
        message: "Master version set successfully",
      },
    });
  });

  // Get version history
  getVersionHistory = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const history = await resumeVersionService.getVersionHistory(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        history,
        count: history.length,
      },
    });
  });

  // Preview

  // Get resume preview
  getResumePreview = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const { resume, content } = await resumeExportService.getResumeContent(
      id,
      userId
    );

    const html = resumeExportService.generateHTML(content, resume);

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
  });

  // Parse and import resume from file
  parseResume = [
    multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error("Invalid file type. Only PDF and DOCX files are allowed.")
          );
        }
      },
    }).single("resume"),
    asyncHandler(async (req, res) => {
      const userId = req.session.userId;

      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "NO_FILE",
            message: "No file provided",
          },
        });
      }

      try {
        // Save file to local file system
        const fileId = uuidv4();
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        const fileName = `resume_${fileId}${fileExtension}`;
        const filePath = path.join(
          process.cwd(),
          "uploads",
          "resumes",
          fileName
        );

        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        // Write file to disk (permanently store it)
        await fs.writeFile(filePath, req.file.buffer);

        try {
          // Parse the resume
          const parsedContent = await resumeParseService.parseResumeFile(
            filePath
          );

          // Also save file record to database for tracking
          const fileRecord = await fileUploadService.saveFileRecord({
            fileId,
            userId,
            fileName,
            originalName: req.file.originalname,
            filePath: `/uploads/resumes/${fileName}`,
            fileType: "resume",
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
          });

          res.status(200).json({
            ok: true,
            data: {
              content: parsedContent,
              fileId: fileRecord.fileId,
              fileName: fileRecord.fileName,
              filePath: fileRecord.filePath,
              message: "Resume parsed and stored successfully",
            },
          });
        } catch (parseError) {
          // Keep the file even if parsing fails - user might want to retry
          console.error("Parse error but file kept:", parseError);
          throw parseError;
        }
      } catch (error) {
        console.error("❌ Error parsing resume:", error);
        res.status(500).json({
          ok: false,
          error: {
            code: "PARSE_ERROR",
            message: error.message || "Failed to parse resume",
          },
        });
      }
    }),
  ];

  // Parse template's existing resume file
  parseTemplateResume = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id: templateId } = req.params;

    try {
      // Get template
      const template = await resumeTemplateService.getTemplateById(templateId);
      if (!template) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "TEMPLATE_NOT_FOUND",
            message: "Template not found",
          },
        });
      }

      // Check if template has an existing resume file
      if (!template.existingResumeTemplate) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "NO_TEMPLATE_FILE",
            message: "Template does not have an existing resume file",
          },
        });
      }

      // Resolve file path (existingResumeTemplate is a file path)
      const filePath = path.join(
        process.cwd(),
        template.existingResumeTemplate.startsWith("/")
          ? template.existingResumeTemplate.slice(1)
          : template.existingResumeTemplate
      );

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "FILE_NOT_FOUND",
            message: "Template resume file not found",
          },
        });
      }

      // Parse the resume file
      const parsedContent = await resumeParseService.parseResumeFile(filePath);

      res.status(200).json({
        ok: true,
        data: {
          content: parsedContent,
          templateId: template.id,
          templateName: template.templateName,
          message: "Template resume parsed successfully",
        },
      });
    } catch (error) {
      console.error("❌ Error parsing template resume:", error);
      res.status(500).json({
        ok: false,
        error: {
          code: "PARSE_ERROR",
          message: error.message || "Failed to parse template resume",
        },
      });
    }
  });

  // AI Assistant - Chat
  chat = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { resumeId } = req.params;
    const { messages, jobId } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Messages array is required",
        },
      });
    }

    try {
      // Get resume if resumeId is provided
      let resume = null;
      if (resumeId && resumeId !== "new") {
        try {
          resume = await resumeService.getResume(resumeId, userId);
        } catch (err) {
          // Resume not found or not accessible, continue without context
          console.log("Resume not found for AI context:", err.message);
        }
      }

      // Get prospective job if jobId is provided
      let prospectiveJob = null;
      if (jobId) {
        try {
          const jobResponse = await prospectiveJobService.getProspectiveJobById(jobId, userId);
          if (jobResponse) {
            prospectiveJob = jobResponse;
          }
        } catch (err) {
          console.log("Failed to fetch prospective job for AI context:", err.message);
        }
      }

      // Get user data for context
      let userData = null;
      try {
        const [profile, skills, jobs, education, projects, certifications] =
          await Promise.allSettled([
            profileService.getProfileByUserId(userId),
            skillService.getSkillsByUserId(userId),
            jobService.getJobsByUserId(userId),
            educationService.getEducationsByUserId(userId),
            projectService.getProjectsByUserId(userId),
            certificationService.getCertifications(userId),
          ]);

        userData = {
          profile: profile.status === "fulfilled" ? profile.value : null,
          skills: skills.status === "fulfilled" ? skills.value : [],
          jobs: jobs.status === "fulfilled" ? jobs.value : [],
          education: education.status === "fulfilled" ? education.value : [],
          projects: projects.status === "fulfilled" ? projects.value : [],
          certifications:
            certifications.status === "fulfilled" ? certifications.value : [],
        };

        // Debug logging (can be removed in production)
        console.log("📊 AI Context - User Data:", {
          hasProfile: !!userData.profile,
          skillsCount: userData.skills.length,
          jobsCount: userData.jobs.length,
          educationCount: userData.education.length,
          projectsCount: userData.projects.length,
          certificationsCount: userData.certifications.length,
        });
      } catch (err) {
        console.log("Failed to fetch user data for AI context:", err.message);
      }

      const response = await resumeAIAssistantService.chat(
        messages,
        resume,
        userData,
        prospectiveJob
      );

      res.status(200).json({
        ok: true,
        data: {
          message: response.message,
          usage: response.usage,
        },
      });
    } catch (error) {
      console.error("❌ Error in AI chat:", error);
      res.status(500).json({
        ok: false,
        error: {
          code: "AI_CHAT_ERROR",
          message: error.message || "Failed to process AI chat request",
        },
      });
    }
  });

  // AI Assistant - Generate Content
  generateContent = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { resumeId } = req.params;
    const { type, context, jobDescription } = req.body;

    if (!type || !context) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Type and context are required",
        },
      });
    }

    const validTypes = ["summary", "experience", "skills", "optimize"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_TYPE",
          message: `Type must be one of: ${validTypes.join(", ")}`,
        },
      });
    }

    try {
      const response = await resumeAIAssistantService.generateContent(
        type,
        context,
        jobDescription || null
      );

      res.status(200).json({
        ok: true,
        data: {
          content: response.content,
          usage: response.usage,
        },
      });
    } catch (error) {
      console.error("❌ Error generating content:", error);
      res.status(500).json({
        ok: false,
        error: {
          code: "AI_GENERATE_ERROR",
          message: error.message || "Failed to generate content",
        },
      });
    }
  });

  // AI Tailoring - Complete resume tailoring flow
  tailorResume = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { templateId, jobId } = req.body;

    if (!templateId || !jobId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "templateId and jobId are required",
        },
      });
    }

    try {
      // Step 1: Fetch job details
      const prospectiveJob = await prospectiveJobService.getProspectiveJobById(jobId, userId);
      if (!prospectiveJob) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "JOB_NOT_FOUND",
            message: "Job not found",
          },
        });
      }

      // Step 2: Fetch user profile data and all related data
      const [profile, skills, jobs, education, projects, certifications] =
        await Promise.allSettled([
          profileService.getProfileByUserId(userId),
          skillService.getSkillsByUserId(userId),
          jobService.getJobsByUserId(userId),
          educationService.getEducationsByUserId(userId),
          projectService.getProjectsByUserId(userId),
          certificationService.getCertifications(userId),
        ]);

      const profileData = profile.status === "fulfilled" ? profile.value : null;
      const employment = jobs.status === "fulfilled" ? jobs.value : [];
      const educationData = education.status === "fulfilled" ? education.value : [];
      const skillsData = skills.status === "fulfilled" ? skills.value : [];
      const projectsData = projects.status === "fulfilled" ? projects.value : [];
      const certificationsData = certifications.status === "fulfilled" ? certifications.value : [];

      // Step 3: Create initial resume
      const resumeName = `Resume for ${prospectiveJob.jobTitle} at ${prospectiveJob.company}`;
      const resumeDescription = `Tailored for ${prospectiveJob.jobTitle} at ${prospectiveJob.company}`;

      const newResume = await resumeService.createResume(userId, {
        versionName: resumeName,
        description: resumeDescription,
        templateId: templateId,
        jobId: jobId,
        content: {
          personalInfo: {
            firstName: profileData?.first_name || "",
            lastName: profileData?.last_name || "",
            email: profileData?.email || "",
            phone: profileData?.phone || "",
            location: profileData?.city && profileData?.state
              ? `${profileData.city}, ${profileData.state}`
              : profileData?.city || profileData?.state || "",
            linkedIn: "",
            portfolio: "",
          },
          summary: "",
          experience: [],
          education: [],
          skills: [],
          projects: [],
          certifications: [],
        },
        sectionConfig: {},
        customizations: {},
        versionNumber: 1,
        isMaster: true,
      });

      // Step 4: Build comprehensive user data strings for AI prompt
      const employmentText = employment.length > 0
        ? employment.map((job) =>
            `- ${job.title} at ${job.company}${job.startDate ? ` (${job.startDate} - ${job.endDate || 'Present'})` : ''}\n  ${job.description || ''}`
          ).join('\n')
        : 'No employment history';

      const educationText = educationData.length > 0
        ? educationData.map((edu) =>
            `- ${edu.degreeType || ''} in ${edu.field || ''} from ${edu.school || ''}${edu.endDate ? ` (${edu.endDate})` : ''}`
          ).join('\n')
        : 'No education entries';

      // Format skills with categories for better context
      const skillsText = skillsData.length > 0
        ? skillsData.map((skill) => {
            const skillName = skill.name || skill.skillName || '';
            const category = skill.category || 'Technical';
            return `${skillName} (${category})`;
          }).join(', ')
        : 'No skills listed';

      const projectsText = projectsData.length > 0
        ? projectsData.map((proj) =>
            `- ${proj.name}${proj.description ? `: ${proj.description}` : ''}${proj.technologies ? ` (${proj.technologies})` : ''}`
          ).join('\n')
        : 'No projects listed';

      const certificationsText = certificationsData.length > 0
        ? certificationsData.map((cert) =>
            `${cert.name}${cert.org_name ? ` from ${cert.org_name}` : ''}${cert.date_earned ? ` (${cert.date_earned})` : ''}`
          ).join('\n')
        : 'No certifications';

      // Step 5: Construct AI prompt
      const analysisPrompt = `You are a professional resume tailoring AI. Analyze this job posting and the user's complete profile, then provide:

1. A structured JSON response with resume updates for ALL sections (summary, experience, skills, education, projects, certifications)
2. A human-readable explanation written in FIRST PERSON, as if you're talking directly to the user (use "I", "your", "you" - NOT third person)

Job Posting:
Title: ${prospectiveJob.jobTitle || 'N/A'}
Company: ${prospectiveJob.company || 'N/A'}
${prospectiveJob.location ? `Location: ${prospectiveJob.location}` : ''}
${prospectiveJob.industry ? `Industry: ${prospectiveJob.industry}` : ''}
${prospectiveJob.jobType ? `Job Type: ${prospectiveJob.jobType}` : ''}
${prospectiveJob.description ? `\nDescription:\n${prospectiveJob.description}` : ''}

User Profile:
Name: ${profileData?.first_name || ''} ${profileData?.last_name || ''}
Email: ${profileData?.email || ''}
${profileData?.phone ? `Phone: ${profileData.phone}` : ''}
${profileData?.city && profileData?.state ? `Location: ${profileData.city}, ${profileData.state}` : profileData?.city ? `City: ${profileData.city}` : profileData?.state ? `State: ${profileData.state}` : ''}
${profileData?.job_title ? `Current Job Title: ${profileData.job_title}` : ''}
${profileData?.industry ? `Industry: ${profileData.industry}` : ''}
${profileData?.bio ? `Bio: ${profileData.bio}` : ''}

Employment History:
${employmentText}

Education:
${educationText}

Skills:
${skillsText}

Projects:
${projectsText}

Certifications:
${certificationsText}

Please provide COMPLETE resume content for ALL sections:
1. A professional summary (2-3 sentences) tailored to this specific job
2. MULTIPLE experience entries (include ALL relevant work experience from the user's employment history, not just one)
3. Relevant skills prioritized and reordered based on job requirements, organized into logical groups (e.g., "Frontend", "Backend", "DevOps", "Languages", "Frameworks", "Tools", etc.). You can create custom groups that make sense for the job posting.
4. Education entries formatted for resume (if user has education data, use it; if not, suggest relevant education or create placeholder entries)
5. Projects formatted for resume (if user has projects, use them; if not, suggest relevant projects based on their experience or create placeholder entries)
6. Certifications formatted for resume (if available)

CRITICAL INSTRUCTIONS:
- Include ALL experience entries from the user's employment history (not just one)
- If education/projects are missing from user data, either create relevant suggestions based on their experience OR highlight this in the explanation
- The resume should be FULLY POPULATED with content

IMPORTANT: Format your response as JSON with this exact structure:
{
  "resumeUpdates": {
    "summary": "tailored summary text (2-3 sentences)",
    "experience": [
      {
        "id": "exp_1",
        "title": "Job Title",
        "company": "Company Name",
        "location": "Location (optional)",
        "startDate": "2020-01", // Format: YYYY-MM
        "endDate": "2023-12", // Format: YYYY-MM or empty for current
        "description": ["Bullet point 1", "Bullet point 2", "Bullet point 3"] // Array of achievement bullet points
      }
    ],
    "skills": [
      {
        "name": "skill name",
        "category": "Technical",
        "group": "Frontend" // Optional: custom group name (e.g., "Frontend", "Backend", "DevOps", "Languages", "Frameworks", "Tools", etc.)
      }
    ],
    "education": [
      {
        "id": "edu_1",
        "degree": "Degree Name",
        "school": "School Name",
        "field": "Field of Study",
        "graduationDate": "2020-05", // Format: YYYY-MM
        "startDate": "2016-09" // Optional: Format: YYYY-MM
      }
    ],
    "projects": [
      {
        "id": "proj_1",
        "name": "Project Name",
        "description": "Project description",
        "technologies": ["tech1", "tech2"]
      }
    ],
    "certifications": [
      {
        "id": "cert_1",
        "name": "Certification Name",
        "organization": "Issuing Organization",
        "issueDate": "2021-03", // Format: YYYY-MM
        "expirationDate": "2024-03" // Optional: Format: YYYY-MM
      }
    ]
  },
  "explanation": "Write a conversational explanation in FIRST PERSON (use 'I', 'your', 'you'). Explain: 1) What I've done to tailor your resume for this position, 2) Why these changes make your resume stronger for this specific job, 3) Key highlights that match the job requirements, 4) If education/projects sections are empty or missing, highlight this and suggest what to add. Write as if you're talking directly to the user, not about them."
}

CRITICAL FORMATTING RULES:
- Experience descriptions MUST be arrays of strings (bullet points), NOT a single string. Each string should be a separate achievement/description bullet point.
- Dates MUST be in YYYY-MM format (e.g., "2020-01" for January 2020, "2023-12" for December 2023)
- Skills MUST include both "category" (Technical, Languages, Soft Skills, or Industry-Specific) and optionally "group" for custom groupings
- Projects technologies MUST be arrays of strings, not a single string
- Education "endDate" is the graduation date, "startDate" is optional enrollment date
- All date fields should use YYYY-MM format for consistency
- Ensure all sections are fully populated with complete, professional content`;

      // Step 6: Call AI to tailor the resume
      const userData = {
        profile: profileData,
        skills: skillsData,
        jobs: employment,
        education: educationData,
        projects: projectsData,
        certifications: certificationsData,
      };

      const aiResponse = await resumeAIAssistantService.chat(
        [{ role: "user", content: analysisPrompt }],
        newResume,
        userData,
        prospectiveJob
      );

      if (!aiResponse || !aiResponse.message) {
        throw new Error("AI analysis failed - no response received");
      }

      // Step 7: Parse AI response and update resume
      const aiMessage = aiResponse.message || "";

      let resumeUpdates = {};
      let explanation = "Your resume has been tailored for this position.";

      try {
        // Look for JSON code blocks first
        const jsonMatch = aiMessage.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          resumeUpdates = parsed.resumeUpdates || {};
          explanation = parsed.explanation || explanation;
        } else {
          // Try to parse the entire message as JSON
          const parsed = JSON.parse(aiMessage);
          resumeUpdates = parsed.resumeUpdates || {};
          explanation = parsed.explanation || explanation;
        }
      } catch (e) {
        // If JSON parsing fails, try to extract explanation from markdown or use the message
        const explanationMatch = aiMessage.match(/explanation["\s:]*([\s\S]*?)(?:\n\n|\n```|$)/i);
        if (explanationMatch) {
          explanation = explanationMatch[1].trim();
        } else {
          explanation = aiMessage;
        }
      }

      // Step 8: Update resume with AI recommendations
      const updatedContent = { ...newResume.content };
      
      // Preserve personalInfo from initial resume (don't overwrite with AI)
      updatedContent.personalInfo = newResume.content.personalInfo || {
        firstName: profileData?.first_name || "",
        lastName: profileData?.last_name || "",
        email: profileData?.email || "",
        phone: profileData?.phone || "",
        location: profileData?.city && profileData?.state
          ? `${profileData.city}, ${profileData.state}`
          : profileData?.city || profileData?.state || "",
        linkedIn: profileData?.linkedin || "",
        portfolio: profileData?.portfolio || "",
      };

      // Update summary
      if (resumeUpdates.summary) {
        updatedContent.summary = resumeUpdates.summary;
      }

      // Update skills - support both string array (legacy) and object array (with custom groups)
      if (resumeUpdates.skills && Array.isArray(resumeUpdates.skills)) {
        const customGroups = new Set();
        
        updatedContent.skills = resumeUpdates.skills.map((skillItem, index) => {
          // Handle both string format (legacy) and object format (with groups)
          let skillName, skillCategory, skillGroup;
          
          if (typeof skillItem === 'string') {
            // Legacy format: just skill name
            skillName = skillItem;
            skillCategory = 'Technical';
            skillGroup = undefined;
          } else {
            // New format: object with name, category, and optional group
            skillName = skillItem.name || skillItem;
            skillCategory = skillItem.category || 'Technical';
            skillGroup = skillItem.group || undefined;
            
            // Track custom groups
            if (skillGroup && !['Technical', 'Languages', 'Soft Skills', 'Industry-Specific'].includes(skillGroup)) {
              customGroups.add(skillGroup);
            }
          }
          
          const matchingSkill = skillsData.find((s) =>
            (s.name || s.skillName || '').toLowerCase() === skillName.toLowerCase()
          );
          
          return {
            id: matchingSkill?.id || `skill_${Date.now()}_${index}`,
            name: skillName,
            category: skillCategory || matchingSkill?.category || 'Technical',
            group: skillGroup || undefined, // Custom group if provided
            proficiency: matchingSkill?.proficiency || 'Intermediate',
          };
        });
        
        // Store custom groups in sectionConfig (separate from content)
        if (customGroups.size > 0) {
          const currentConfig = newResume.sectionConfig || {};
          const skillsConfig = currentConfig.skills || {};
          const existingCustomGroups = skillsConfig.customGroups || [];
          const allCustomGroups = [...new Set([...existingCustomGroups, ...Array.from(customGroups)])];
          
          // Store sectionConfig separately (not in content)
          newResume.sectionConfig = {
            ...currentConfig,
            skills: {
              ...skillsConfig,
              customGroups: allCustomGroups,
            },
          };
        }
      }

      // Update experience - include ALL entries
      if (resumeUpdates.experience && Array.isArray(resumeUpdates.experience) && resumeUpdates.experience.length > 0) {
        const aiExperienceKeys = new Set(resumeUpdates.experience.map((exp) =>
          `${exp.title || ''}_${exp.company || ''}`.toLowerCase()
        ));

        updatedContent.experience = resumeUpdates.experience.map((exp, index) => {
          const matchingJob = employment.find((job) =>
            job.title === exp.title && job.company === exp.company
          );
          return {
            id: exp.id || matchingJob?.id || `exp_${Date.now()}_${index}`,
            title: exp.title || matchingJob?.title || "",
            company: exp.company || matchingJob?.company || "",
            location: exp.location || matchingJob?.location || "",
            startDate: exp.startDate || matchingJob?.startDate || "",
            endDate: exp.endDate || matchingJob?.endDate || "",
            isCurrent: !exp.endDate || exp.endDate === 'Present',
            description: Array.isArray(exp.description) 
              ? exp.description 
              : (typeof exp.description === 'string' 
                  ? exp.description.split('\n').filter((line) => line.trim()).map((line) => line.trim())
                  : (matchingJob?.description 
                      ? (Array.isArray(matchingJob.description) 
                          ? matchingJob.description 
                          : (typeof matchingJob.description === 'string' 
                              ? matchingJob.description.split('\n').filter((line) => line.trim()).map((line) => line.trim())
                              : []))
                      : [])),
            achievements: exp.achievements || matchingJob?.achievements || [],
          };
        });

        // Add any employment entries not included in AI response
        employment.forEach((job) => {
          const key = `${job.title || ''}_${job.company || ''}`.toLowerCase();
          if (!aiExperienceKeys.has(key)) {
            updatedContent.experience.push({
              id: job.id || `exp_${Date.now()}_${updatedContent.experience.length}`,
              title: job.title || "",
              company: job.company || "",
              location: job.location || "",
              startDate: job.startDate || "",
              endDate: job.endDate || "",
              isCurrent: !job.endDate || job.endDate === 'Present',
              description: Array.isArray(job.description) 
                ? job.description 
                : (typeof job.description === 'string' 
                    ? job.description.split('\n').filter((line) => line.trim()).map((line) => line.trim())
                    : []),
              achievements: job.achievements || [],
            });
          }
        });
      } else {
        // If no experience updates, populate from ALL employment data
        updatedContent.experience = employment.map((job, index) => ({
          id: job.id || `exp_${Date.now()}_${index}`,
          title: job.title || "",
          company: job.company || "",
          location: job.location || "",
          startDate: job.startDate || "",
          endDate: job.endDate || "",
          isCurrent: !job.endDate || job.endDate === 'Present',
          description: Array.isArray(job.description) 
            ? job.description 
            : (typeof job.description === 'string' 
                ? job.description.split('\n').filter((line) => line.trim()).map((line) => line.trim())
                : []),
          achievements: job.achievements || [],
        }));
      }

      // Update education
      if (resumeUpdates.education && Array.isArray(resumeUpdates.education) && resumeUpdates.education.length > 0) {
        updatedContent.education = resumeUpdates.education.map((edu, index) => {
          const matchingEdu = educationData.find((e) =>
            (e.school || '').toLowerCase() === (edu.school || '').toLowerCase() &&
            (e.degreeType || '').toLowerCase() === (edu.degree || '').toLowerCase()
          );
          return {
            id: edu.id || matchingEdu?.id || `edu_${Date.now()}_${index}`,
            school: edu.school || matchingEdu?.school || "",
            degree: edu.degree || matchingEdu?.degreeType || "",
            field: edu.field || matchingEdu?.field || "",
            endDate: edu.graduationDate || edu.endDate || matchingEdu?.endDate || "",
            startDate: edu.startDate || matchingEdu?.startDate || undefined,
            gpa: edu.gpa || matchingEdu?.gpa || undefined,
            honors: edu.honors || matchingEdu?.honors || undefined,
          };
        });
      } else if (educationData.length > 0) {
        updatedContent.education = educationData.map((edu, index) => ({
          id: edu.id || `edu_${Date.now()}_${index}`,
          school: edu.school || "",
          degree: edu.degreeType || "",
          field: edu.field || "",
          endDate: edu.endDate || "",
          startDate: edu.startDate || undefined,
          gpa: edu.gpa || undefined,
          honors: edu.honors || undefined,
        }));
      }

      // Update projects
      if (resumeUpdates.projects && Array.isArray(resumeUpdates.projects) && resumeUpdates.projects.length > 0) {
        updatedContent.projects = resumeUpdates.projects.map((proj, index) => {
          const matchingProj = projectsData.find((p) =>
            (p.name || '').toLowerCase() === (proj.name || '').toLowerCase()
          );
          return {
            id: proj.id || matchingProj?.id || `proj_${Date.now()}_${index}`,
            name: proj.name || matchingProj?.name || "",
            description: proj.description || matchingProj?.description || "",
            technologies: Array.isArray(proj.technologies) ? proj.technologies : (matchingProj?.technologies ? matchingProj.technologies.split(',').map(t => t.trim()) : []),
            link: proj.link || matchingProj?.link || undefined,
            startDate: proj.startDate || matchingProj?.start_date || undefined,
            endDate: proj.endDate || matchingProj?.end_date || undefined,
          };
        });
      } else if (projectsData.length > 0) {
        updatedContent.projects = projectsData.map((proj, index) => ({
          id: proj.id || `proj_${Date.now()}_${index}`,
          name: proj.name || "",
          description: proj.description || "",
          technologies: proj.technologies ? proj.technologies.split(',').map(t => t.trim()) : [],
          link: proj.link || undefined,
          startDate: proj.start_date || undefined,
          endDate: proj.end_date || undefined,
        }));
      }

      // Update certifications
      if (resumeUpdates.certifications && Array.isArray(resumeUpdates.certifications) && resumeUpdates.certifications.length > 0) {
        updatedContent.certifications = resumeUpdates.certifications.map((cert, index) => {
          const matchingCert = certificationsData.find((c) =>
            (c.name || '').toLowerCase() === (cert.name || '').toLowerCase()
          );
          return {
            id: cert.id || matchingCert?.id || `cert_${Date.now()}_${index}`,
            name: cert.name || matchingCert?.name || "",
            organization: cert.organization || matchingCert?.org_name || "",
            dateEarned: cert.issueDate || matchingCert?.date_earned || "",
            expirationDate: cert.expiryDate || matchingCert?.expiration_date || undefined,
          };
        });
      } else if (certificationsData.length > 0) {
        updatedContent.certifications = certificationsData.map((cert, index) => ({
          id: cert.id || `cert_${Date.now()}_${index}`,
          name: cert.name || "",
          organization: cert.org_name || "",
          dateEarned: cert.date_earned || "",
          expirationDate: cert.expiration_date || undefined,
        }));
      }

      // Step 9: Update the resume with all changes (including sectionConfig for custom groups)
      const updateData = {
        content: updatedContent,
      };
      
      // Include sectionConfig if it was updated (for custom groups)
      if (newResume.sectionConfig) {
        updateData.sectionConfig = newResume.sectionConfig;
      }
      
      const updatedResume = await resumeService.updateResume(newResume.id, userId, updateData);

      res.status(200).json({
        ok: true,
        data: {
          resume: updatedResume,
          explanation: explanation,
        },
      });
    } catch (error) {
      console.error("❌ Error in AI tailoring:", error);
      res.status(500).json({
        ok: false,
        error: {
          code: "AI_TAILORING_ERROR",
          message: error.message || "Failed to tailor resume",
        },
      });
    }
  });
}

export default new ResumeController();
