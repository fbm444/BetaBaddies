import companyResearchService from "../services/companyResearchService.js";
import companyResearchAutomationService from "../services/companyResearchAutomationService.js";
import companyInterviewInsightsService from "../services/companyInterviewInsightsService.js";
import database from "../services/database.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class CompanyResearchController {
  // ==================== Automated Research ====================

  /**
   * Trigger automated company research
   * POST /api/v1/company-research/fetch/:jobId
   */
  fetchCompanyResearch = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;

    // Verify job belongs to user (check job_opportunities table)
    const jobQuery = await database.query(
      "SELECT user_id FROM job_opportunities WHERE id = $1",
      [jobId]
    );

    if (jobQuery.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Job not found",
        },
      });
    }

    if (jobQuery.rows[0].user_id !== userId) {
      return res.status(403).json({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to access this job",
        },
      });
    }

    // Trigger automated research
    const enrichedData = await companyResearchAutomationService.researchCompany(
      jobId,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        research: enrichedData,
        message: "Company research completed successfully",
      },
    });
  });

  // ==================== Company Info Operations ====================

  /**
   * Get company research by job ID
   * GET /api/v1/company-research/job/:jobId
   */
  getCompanyResearchByJobId = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;

    // Verify job belongs to user (check job_opportunities table)
    const jobQuery = await database.query(
      "SELECT user_id FROM job_opportunities WHERE id = $1",
      [jobId]
    );

    if (jobQuery.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Job not found",
        },
      });
    }

    if (jobQuery.rows[0].user_id !== userId) {
      return res.status(403).json({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to access this job",
        },
      });
    }

    const research = await companyResearchService.getCompleteCompanyResearch(
      jobId
    );

    if (!research) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "No company research found for this job",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        research,
      },
    });
  });

  /**
   * Generate AI summary for company research
   * GET /api/v1/company-research/job/:jobId/ai-summary
   */
  generateAISummary = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;

    // Verify job belongs to user (check job_opportunities table)
    const jobQuery = await database.query(
      "SELECT id, company, title as job_title, job_description as description FROM job_opportunities WHERE id = $1 AND user_id = $2",
      [jobId, userId]
    );

    if (jobQuery.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Job not found",
        },
      });
    }

    const job = jobQuery.rows[0];

    // Get existing research data
    const research = await companyResearchService.getCompleteCompanyResearch(
      jobId
    );

    if (!research) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "No company research found. Please run research first.",
        },
      });
    }

    // Generate AI summary using existing research data
    const companyResearchAutomationService = (await import("../services/companyResearchAutomationService.js")).default;
    
    const aiSummary = await companyResearchAutomationService.enrichWithAI(
      job.company,
      {
        industry: research.industry,
        employeeCount: research.size,
        locality: research.location,
        description: research.description,
        domain: research.website,
      },
      research.news || [],
      job
    );

    res.status(200).json({
      ok: true,
      data: {
        aiSummary,
      },
    });
  });

  /**
   * Get interview insights for a company/job
   * GET /api/v1/company-research/job/:jobId/interview-insights
   */
  getInterviewInsights = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;
    const { role, refresh } = req.query;

    try {
      const response =
        await companyInterviewInsightsService.getInsightsForJob(
          jobId,
          userId,
          {
            roleTitle: role,
            forceRefresh: refresh === "true" || refresh === "1",
          }
        );

      res.status(200).json({
        ok: true,
        data: {
          interviewInsights: response.insights,
          metadata: response.metadata,
        },
      });
    } catch (error) {
      if (error.message === "NOT_FOUND") {
        return res.status(404).json({
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: "Job not found",
          },
        });
      }

      if (error.message === "FORBIDDEN") {
        return res.status(403).json({
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to access this job",
          },
        });
      }

      console.error(
        "[CompanyResearchController] Interview insights error:",
        error
      );

      res.status(500).json({
        ok: false,
        error: {
          code: "INTERVIEW_INSIGHTS_ERROR",
          message:
            error.message ||
            "Unable to generate interview insights at this time.",
        },
      });
    }
  });

  /**
   * Get all researched companies for user
   * GET /api/v1/company-research
   */
  getResearchedCompanies = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { limit, offset } = req.query;

    const companies = await companyResearchService.getResearchedCompaniesByUserId(
      userId,
      { limit, offset }
    );

    res.status(200).json({
      ok: true,
      data: {
        companies,
        count: companies.length,
      },
    });
  });

  /**
   * Create or update company info
   * POST /api/v1/company-research/job/:jobId
   */
  upsertCompanyInfo = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;
    const companyData = req.body;

    // Verify job belongs to user
    const jobQuery = await database.query(
      "SELECT user_id FROM job_opportunities WHERE id = $1",
      [jobId]
    );

    if (jobQuery.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Job not found",
        },
      });
    }

    if (jobQuery.rows[0].user_id !== userId) {
      return res.status(403).json({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to access this job",
        },
      });
    }

    const companyInfo = await companyResearchService.upsertCompanyInfo(
      jobId,
      companyData
    );

    res.status(200).json({
      ok: true,
      data: {
        companyInfo,
        message: "Company info saved successfully",
      },
    });
  });

  /**
   * Delete company research
   * DELETE /api/v1/company-research/job/:jobId
   */
  deleteCompanyResearch = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobId } = req.params;

    // Verify job belongs to user (check job_opportunities table)
    const jobQuery = await database.query(
      "SELECT user_id FROM job_opportunities WHERE id = $1",
      [jobId]
    );

    if (jobQuery.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Job not found",
        },
      });
    }

    if (jobQuery.rows[0].user_id !== userId) {
      return res.status(403).json({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to access this job",
        },
      });
    }

    const deleted = await companyResearchService.deleteCompanyResearch(jobId);

    if (!deleted) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "No company research found to delete",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        message: "Company research deleted successfully",
      },
    });
  });

  // ==================== Company Media Operations ====================

  /**
   * Add company media link
   * POST /api/v1/company-research/:companyInfoId/media
   */
  addCompanyMedia = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { companyInfoId } = req.params;
    const { platform, link } = req.body;

    // Verify company info belongs to user's job
    const verifyQuery = await database.query(
      `SELECT ci.id FROM company_info ci
       INNER JOIN job_opportunities jo ON ci.job_id = jo.id
       WHERE ci.id = $1 AND jo.user_id = $2`,
      [companyInfoId, userId]
    );

    if (verifyQuery.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Company info not found or access denied",
        },
      });
    }

    const media = await companyResearchService.addCompanyMedia(
      companyInfoId,
      platform,
      link
    );

    res.status(201).json({
      ok: true,
      data: {
        media,
        message: "Company media added successfully",
      },
    });
  });

  /**
   * Get company media
   * GET /api/v1/company-research/:companyInfoId/media
   */
  getCompanyMedia = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { companyInfoId } = req.params;

    // Verify company info belongs to user's job
    const verifyQuery = await database.query(
      `SELECT ci.id FROM company_info ci
       INNER JOIN job_opportunities jo ON ci.job_id = jo.id
       WHERE ci.id = $1 AND jo.user_id = $2`,
      [companyInfoId, userId]
    );

    if (verifyQuery.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Company info not found or access denied",
        },
      });
    }

    const media = await companyResearchService.getCompanyMedia(companyInfoId);

    res.status(200).json({
      ok: true,
      data: {
        media,
        count: media.length,
      },
    });
  });

  /**
   * Delete company media
   * DELETE /api/v1/company-research/media/:mediaId
   */
  deleteCompanyMedia = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { mediaId } = req.params;

    // Verify media belongs to user's company
    const verifyQuery = await database.query(
      `SELECT cm.id FROM company_media cm
       INNER JOIN company_info ci ON cm.company_id = ci.id
       INNER JOIN job_opportunities jo ON ci.job_id = jo.id
       WHERE cm.id = $1 AND jo.user_id = $2`,
      [mediaId, userId]
    );

    if (verifyQuery.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Media not found or access denied",
        },
      });
    }

    const deleted = await companyResearchService.deleteCompanyMedia(mediaId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Company media deleted successfully",
      },
    });
  });

  // ==================== Company News Operations ====================

  /**
   * Add company news
   * POST /api/v1/company-research/:companyInfoId/news
   */
  addCompanyNews = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { companyInfoId } = req.params;
    const newsData = req.body;

    // Verify company info belongs to user's job
    const verifyQuery = await database.query(
      `SELECT ci.id FROM company_info ci
       INNER JOIN job_opportunities jo ON ci.job_id = jo.id
       WHERE ci.id = $1 AND jo.user_id = $2`,
      [companyInfoId, userId]
    );

    if (verifyQuery.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Company info not found or access denied",
        },
      });
    }

    const news = await companyResearchService.addCompanyNews(
      companyInfoId,
      newsData
    );

    res.status(201).json({
      ok: true,
      data: {
        news,
        message: "Company news added successfully",
      },
    });
  });

  /**
   * Get company news
   * GET /api/v1/company-research/:companyInfoId/news
   */
  getCompanyNews = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { companyInfoId } = req.params;
    const { limit, offset, type } = req.query;

    // Verify company info belongs to user's job
    const verifyQuery = await database.query(
      `SELECT ci.id FROM company_info ci
       INNER JOIN job_opportunities jo ON ci.job_id = jo.id
       WHERE ci.id = $1 AND jo.user_id = $2`,
      [companyInfoId, userId]
    );

    if (verifyQuery.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Company info not found or access denied",
        },
      });
    }

    const news = await companyResearchService.getCompanyNews(companyInfoId, {
      limit,
      offset,
      type,
    });

    res.status(200).json({
      ok: true,
      data: {
        news,
        count: news.length,
      },
    });
  });

  /**
   * Delete company news
   * DELETE /api/v1/company-research/news/:newsId
   */
  deleteCompanyNews = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { newsId } = req.params;

    // Verify news belongs to user's company
    const verifyQuery = await database.query(
      `SELECT cn.id FROM company_news cn
       INNER JOIN company_info ci ON cn.company_id = ci.id
       INNER JOIN job_opportunities jo ON ci.job_id = jo.id
       WHERE cn.id = $1 AND jo.user_id = $2`,
      [newsId, userId]
    );

    if (verifyQuery.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "News not found or access denied",
        },
      });
    }

    const deleted = await companyResearchService.deleteCompanyNews(newsId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Company news deleted successfully",
      },
    });
  });
}

export default new CompanyResearchController();


