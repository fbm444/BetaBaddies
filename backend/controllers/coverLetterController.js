import {
  coverLetterService,
  coverLetterTemplateService,
  coverLetterAIService,
  coverLetterExportService,
  coverLetterVersionService,
  coverLetterPerformanceService,
} from "../services/coverletters/index.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import fs from "fs/promises";

class CoverLetterController {
  // ==================== Core Cover Letter Operations ====================

  // Create a new cover letter
  createCoverLetter = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const coverLetterData = req.body;

    const coverLetter = await coverLetterService.createCoverLetter(
      userId,
      coverLetterData
    );

    res.status(201).json({
      ok: true,
      data: {
        coverLetter: {
          id: coverLetter.id,
          userId: coverLetter.userId,
          versionName: coverLetter.versionName,
          description: coverLetter.description,
          createdAt: coverLetter.createdAt,
          updatedAt: coverLetter.updatedAt,
          file: coverLetter.file,
          commentsId: coverLetter.commentsId,
          templateId: coverLetter.templateId || null,
          jobId: coverLetter.jobId || null,
          content: coverLetter.content || null,
          toneSettings: coverLetter.toneSettings || null,
          customizations: coverLetter.customizations || null,
          versionNumber: coverLetter.versionNumber || 1,
          parentCoverLetterId: coverLetter.parentCoverLetterId || null,
          isMaster: coverLetter.isMaster || false,
          companyResearch: coverLetter.companyResearch || null,
          performanceMetrics: coverLetter.performanceMetrics || null,
        },
        message: "Cover letter created successfully",
      },
    });
  });

  // Get all cover letters for the authenticated user
  getCoverLetters = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { sort, limit, offset } = req.query;

    const options = { sort, limit, offset };
    const coverLetters = await coverLetterService.getCoverLettersByUserId(
      userId,
      options
    );

    res.status(200).json({
      ok: true,
      data: {
        coverLetters: coverLetters.map((cl) => ({
          id: cl.id,
          userId: cl.userId,
          versionName: cl.versionName,
          description: cl.description,
          createdAt: cl.createdAt,
          updatedAt: cl.updatedAt,
          file: cl.file,
          commentsId: cl.commentsId,
          templateId: cl.templateId || null,
          jobId: cl.jobId || null,
          versionNumber: cl.versionNumber || 1,
          parentCoverLetterId: cl.parentCoverLetterId || null,
          isMaster: cl.isMaster || false,
        })),
        count: coverLetters.length,
      },
    });
  });

  // Get cover letter by ID
  getCoverLetter = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const coverLetter = await coverLetterService.getCoverLetterById(id, userId);

    if (!coverLetter) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Cover letter not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        coverLetter: {
          id: coverLetter.id,
          userId: coverLetter.userId,
          versionName: coverLetter.versionName,
          description: coverLetter.description,
          createdAt: coverLetter.createdAt,
          updatedAt: coverLetter.updatedAt,
          file: coverLetter.file,
          commentsId: coverLetter.commentsId,
          templateId: coverLetter.templateId || null,
          jobId: coverLetter.jobId || null,
          content: coverLetter.content || null,
          toneSettings: coverLetter.toneSettings || null,
          customizations: coverLetter.customizations || null,
          versionNumber: coverLetter.versionNumber || 1,
          parentCoverLetterId: coverLetter.parentCoverLetterId || null,
          isMaster: coverLetter.isMaster || false,
          companyResearch: coverLetter.companyResearch || null,
          performanceMetrics: coverLetter.performanceMetrics || null,
        },
      },
    });
  });

  // Update cover letter
  updateCoverLetter = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const coverLetterData = req.body;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const coverLetter = await coverLetterService.updateCoverLetter(
      id,
      userId,
      coverLetterData
    );

    res.status(200).json({
      ok: true,
      data: {
        coverLetter: {
          id: coverLetter.id,
          userId: coverLetter.userId,
          versionName: coverLetter.versionName,
          description: coverLetter.description,
          createdAt: coverLetter.createdAt,
          updatedAt: coverLetter.updatedAt,
          file: coverLetter.file,
          commentsId: coverLetter.commentsId,
          templateId: coverLetter.templateId || null,
          jobId: coverLetter.jobId || null,
          content: coverLetter.content || null,
          toneSettings: coverLetter.toneSettings || null,
          customizations: coverLetter.customizations || null,
          versionNumber: coverLetter.versionNumber || 1,
          parentCoverLetterId: coverLetter.parentCoverLetterId || null,
          isMaster: coverLetter.isMaster || false,
          companyResearch: coverLetter.companyResearch || null,
          performanceMetrics: coverLetter.performanceMetrics || null,
        },
        message: "Cover letter updated successfully",
      },
    });
  });

  // Delete cover letter
  deleteCoverLetter = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    await coverLetterService.deleteCoverLetter(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Cover letter deleted successfully",
      },
    });
  });

  // Duplicate cover letter
  duplicateCoverLetter = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { versionName } = req.body;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const coverLetter = await coverLetterService.duplicateCoverLetter(
      id,
      userId,
      versionName
    );

    res.status(201).json({
      ok: true,
      data: {
        coverLetter: {
          id: coverLetter.id,
          userId: coverLetter.userId,
          versionName: coverLetter.versionName,
          description: coverLetter.description,
          createdAt: coverLetter.createdAt,
          updatedAt: coverLetter.updatedAt,
          templateId: coverLetter.templateId || null,
          jobId: coverLetter.jobId || null,
          versionNumber: coverLetter.versionNumber || 1,
          parentCoverLetterId: coverLetter.parentCoverLetterId || null,
          isMaster: coverLetter.isMaster || false,
        },
        message: "Cover letter duplicated successfully",
      },
    });
  });

  // ==================== Template Management ====================

  // Get all templates
  getTemplates = asyncHandler(async (req, res) => {
    const { industry } = req.query;
    const options = { industry, includeDefaults: true };

    const templates = await coverLetterTemplateService.getTemplates(options);

    res.status(200).json({
      ok: true,
      data: {
        templates: templates.map((t) => ({
          id: t.id,
          templateName: t.templateName,
          description: t.description,
          tone: t.tone,
          length: t.length,
          writingStyle: t.writingStyle,
          colors: t.colors,
          fonts: t.fonts,
          isDefault: t.isDefault || false,
          isShared: t.isShared || false,
          industry: t.industry || null,
        })),
        count: templates.length,
      },
    });
  });

  // Get template by ID
  getTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    let template = await coverLetterTemplateService.getTemplateById(id);

    // If template not found and it's a default template, try to create it
    if (!template && id.startsWith("default-")) {
      try {
        const defaultTemplate = coverLetterTemplateService.getDefaultTemplateById(id);
        if (defaultTemplate) {
          // Create the template in the database
          const createdTemplate = await coverLetterTemplateService.createTemplate({
            id: coverLetterTemplateService.generateDefaultTemplateUUID(id),
            templateName: defaultTemplate.templateName,
            description: defaultTemplate.description,
            tone: defaultTemplate.tone,
            length: defaultTemplate.length,
            writingStyle: defaultTemplate.writingStyle,
            colors: defaultTemplate.colors,
            fonts: defaultTemplate.fonts,
            existingCoverLetterTemplate: defaultTemplate.existingCoverLetterTemplate,
          });
          
          // Map ID back to default- format for consistency
          createdTemplate.id = id;
          template = createdTemplate;
        }
      } catch (createError) {
        console.error("Error creating default template:", createError);
        // If creation fails, try to get default template object directly
        const defaultTemplate = coverLetterTemplateService.getDefaultTemplateById(id);
        if (defaultTemplate) {
          template = coverLetterTemplateService.mapRowToTemplate(defaultTemplate);
        }
      }
    }

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
          description: template.description,
          tone: template.tone,
          length: template.length,
          writingStyle: template.writingStyle,
          colors: template.colors,
          fonts: template.fonts,
          isDefault: template.isDefault || false,
          isShared: template.isShared || false,
          industry: template.industry || null,
        },
      },
    });
  });

  // Get template preview
  getTemplatePreview = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const preview = await coverLetterTemplateService.getTemplatePreview(id);

    res.status(200).setHeader("Content-Type", "text/html").send(preview);
  });

  // Create template
  createTemplate = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const templateData = req.body;

    const template = await coverLetterTemplateService.createTemplate(
      templateData
    );

    // Track template usage
    await coverLetterTemplateService.trackTemplateUsage(template.id, userId);

    res.status(201).json({
      ok: true,
      data: {
        template: {
          id: template.id,
          templateName: template.templateName,
          description: template.description,
          tone: template.tone,
          length: template.length,
          writingStyle: template.writingStyle,
          colors: template.colors,
          fonts: template.fonts,
        },
        message: "Template created successfully",
      },
    });
  });

  // Update template
  updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const templateData = req.body;

    const template = await coverLetterTemplateService.updateTemplate(
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
          tone: template.tone,
          length: template.length,
          writingStyle: template.writingStyle,
          colors: template.colors,
          fonts: template.fonts,
        },
        message: "Template updated successfully",
      },
    });
  });

  // Delete template
  deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await coverLetterTemplateService.deleteTemplate(id);

    res.status(200).json({
      ok: true,
      data: {
        message: "Template deleted successfully",
      },
    });
  });

  // Get template analytics
  getTemplateAnalytics = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const analytics = await coverLetterTemplateService.getTemplateUsageAnalytics(
      id
    );

    res.status(200).json({
      ok: true,
      data: {
        analytics,
      },
    });
  });

  // ==================== AI Generation ====================

  // Generate cover letter content
  generateContent = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const {
      jobId,
      tone,
      length,
      includeCompanyResearch,
      highlightExperiences,
      regenerate,
    } = req.body || {};

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const result = await coverLetterAIService.generateCoverLetterContent(
      id,
      userId,
      {
        jobId,
        tone,
        length,
        includeCompanyResearch,
        highlightExperiences,
        // If regenerate is true, force a fresh AI call. Otherwise we reuse
        // any existing generated content for this cover letter to save
        // OpenAI credits.
        forceRegenerate: Boolean(regenerate),
      }
    );

    // Update cover letter with generated content and company research
    await coverLetterService.updateCoverLetter(id, userId, {
      content: result.content,
      companyResearch: result.companyResearch,
      toneSettings: {
        tone: result.tone,
        length: result.length,
      },
    });

    res.status(200).json({
      ok: true,
      data: {
        content: result.content,
        variations: result.variations,
        companyResearch: result.companyResearch,
        tone: result.tone,
        length: result.length,
      },
    });
  });

  // Research company
  researchCompany = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { companyName } = req.body;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const companyResearch = await coverLetterAIService.researchCompany(
      companyName
    );

    // Update cover letter with company research
    if (companyResearch) {
      await coverLetterService.updateCoverLetter(id, userId, {
        companyResearch,
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        companyResearch,
      },
    });
  });

  // Highlight experiences
  highlightExperiences = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { jobId } = req.body;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const result = await coverLetterAIService.highlightExperiences(
      id,
      userId,
      jobId
    );

    res.status(200).json({
      ok: true,
      data: {
        relevantExperiences: result.relevantExperiences,
        suggestions: result.suggestions,
      },
    });
  });

  // Get variations
  getVariations = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const coverLetter = await coverLetterService.getCoverLetterById(id, userId);
    if (!coverLetter) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Cover letter not found",
        },
      });
    }

    // For now, return empty variations - can be enhanced to store variations
    res.status(200).json({
      ok: true,
      data: {
        variations: [],
      },
    });
  });

  // ==================== Export ====================

  // Export to PDF
  exportPDF = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { filename, includeLetterhead } = req.query;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const result = await coverLetterExportService.exportToPDF(id, userId, {
      filename,
      includeLetterhead: includeLetterhead === "true",
    });

    res.setHeader("Content-Type", result.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.send(result.buffer);
  });

  // Export to DOCX
  exportDOCX = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { filename } = req.query;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const result = await coverLetterExportService.exportToDOCX(id, userId, {
      filename,
    });

    res.setHeader("Content-Type", result.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.send(result.buffer);
  });

  // Export to TXT
  exportTXT = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { filename } = req.query;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const result = await coverLetterExportService.exportToTXT(id, userId, {
      filename,
    });

    res.setHeader("Content-Type", result.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.send(result.buffer);
  });

  // Export to HTML
  exportHTML = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { filename } = req.query;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const result = await coverLetterExportService.exportToHTML(id, userId, {
      filename,
    });

    res.setHeader("Content-Type", result.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.send(result.buffer);
  });

  // ==================== Version Management ====================

  // Get versions
  getVersions = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const versions = await coverLetterVersionService.getVersions(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        coverLetters: versions.map((v) => ({
          id: v.id,
          versionName: v.versionName,
          versionNumber: v.versionNumber,
          description: v.description,
          isMaster: v.isMaster,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        })),
        count: versions.length,
      },
    });
  });

  // Get version history
  getVersionHistory = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const history = await coverLetterVersionService.getVersionHistory(
      id,
      userId
    );

    res.status(200).json({
      ok: true,
      data: history,
    });
  });

  // ==================== Performance Tracking ====================

  // Track performance
  trackPerformance = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const performanceData = req.body;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const performance = await coverLetterPerformanceService.trackPerformance(
      id,
      userId,
      performanceData
    );

    res.status(201).json({
      ok: true,
      data: {
        performance,
        message: "Performance tracked successfully",
      },
    });
  });

  // Get performance
  getPerformance = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const records = await coverLetterPerformanceService.getPerformanceRecords(
      id,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        records,
        count: records.length,
      },
    });
  });

  // Get performance metrics
  getPerformanceMetrics = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const metrics = await coverLetterPerformanceService.getPerformanceMetrics(
      id,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        metrics,
      },
    });
  });

  // Get performance records
  getPerformanceRecords = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!coverLetterService.isValidUUID(id)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: `Invalid cover letter ID format. Expected UUID, got: ${id}`,
        },
      });
    }

    const records = await coverLetterPerformanceService.getPerformanceRecords(
      id,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        records,
        count: records.length,
      },
    });
  });
}

export default new CoverLetterController();

