import resumeService from "../services/resumeService.js";
import resumeTemplateService from "../services/resumeTemplateService.js";
import resumeCommentService from "../services/resumeCommentService.js";
import resumeTailoringService from "../services/resumeTailoringService.js";
import resumeShareService from "../services/resumeShareService.js";
import resumeExportService from "../services/resumeExportService.js";
import resumeValidationService from "../services/resumeValidationService.js";
import resumeSectionService from "../services/resumeSectionService.js";
import resumeVersionService from "../services/resumeVersionService.js";
import resumeParseService from "../services/resumeParseService.js";
import fileUploadService from "../services/fileUploadService.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import fs from "fs/promises";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

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

  // Export to PDF
  exportPDF = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { filename, watermark } = req.query;

    const result = await resumeExportService.exportPDF(id, userId, {
      filename,
      watermark: watermark === "true",
    });

    // Send file
    const filePath = result.filePath;
    const fileContent = await fs.readFile(filePath);
    const fileName = result.fileName;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(fileContent);
  });

  // Export to DOCX
  exportDOCX = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { filename } = req.query;

    const result = await resumeExportService.exportDOCX(id, userId, {
      filename,
    });

    const filePath = result.filePath;
    const fileContent = await fs.readFile(filePath);
    const fileName = result.fileName;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(fileContent);
  });

  // Export to TXT
  exportTXT = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { filename } = req.query;

    const result = await resumeExportService.exportTXT(id, userId, {
      filename,
    });

    const filePath = result.filePath;
    const fileContent = await fs.readFile(filePath);
    const fileName = result.fileName;

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(fileContent);
  });

  // Export to HTML
  exportHTML = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { filename, watermark } = req.query;

    const result = await resumeExportService.exportHTML(id, userId, {
      filename,
      watermark: watermark === "true",
    });

    const filePath = result.filePath;
    const fileContent = await fs.readFile(filePath);
    const fileName = result.fileName;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
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
        versions,
        count: versions.length,
      },
    });
  });

  // Create new version
  createVersion = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { versionName, description } = req.body;

    const newVersion = await resumeVersionService.createVersion(id, userId, {
      versionName,
      description,
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
}

export default new ResumeController();
