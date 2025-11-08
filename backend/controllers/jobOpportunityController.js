import jobOpportunityService from "../services/jobOpportunityService.js";
import companyService from "../services/companyService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class JobOpportunityController {
  // Create a new job opportunity
  createJobOpportunity = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const opportunityData = req.body;

    const opportunity = await jobOpportunityService.createJobOpportunity(
      userId,
      opportunityData
    );

    res.status(201).json({
      ok: true,
      data: {
        jobOpportunity: {
          id: opportunity.id,
          title: opportunity.title,
          company: opportunity.company,
          location: opportunity.location,
          salaryMin: opportunity.salaryMin,
          salaryMax: opportunity.salaryMax,
          jobPostingUrl: opportunity.jobPostingUrl,
          applicationDeadline: opportunity.applicationDeadline,
          description: opportunity.description,
          industry: opportunity.industry,
          jobType: opportunity.jobType,
          status: opportunity.status,
          notes: opportunity.notes,
          recruiterName: opportunity.recruiterName,
          recruiterEmail: opportunity.recruiterEmail,
          recruiterPhone: opportunity.recruiterPhone,
          hiringManagerName: opportunity.hiringManagerName,
          hiringManagerEmail: opportunity.hiringManagerEmail,
          hiringManagerPhone: opportunity.hiringManagerPhone,
          salaryNegotiationNotes: opportunity.salaryNegotiationNotes,
          interviewNotes: opportunity.interviewNotes,
          applicationHistory: opportunity.applicationHistory,
          statusUpdatedAt: opportunity.statusUpdatedAt,
          createdAt: opportunity.createdAt,
          updatedAt: opportunity.updatedAt,
        },
        message: "Job opportunity created successfully",
      },
    });
  });

  // Get all job opportunities for the authenticated user
  getJobOpportunities = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const {
      sort,
      limit,
      offset,
      status,
      search,
      industry,
      location,
      salaryMin,
      salaryMax,
      deadlineFrom,
      deadlineTo,
    } = req.query;

    const options = {
      sort,
      limit,
      offset,
      status,
      search,
      industry,
      location,
      salaryMin: salaryMin ? parseFloat(salaryMin) : undefined,
      salaryMax: salaryMax ? parseFloat(salaryMax) : undefined,
      deadlineFrom,
      deadlineTo,
    };

    const opportunities = await jobOpportunityService.getJobOpportunitiesByUserId(
      userId,
      options
    );
    const totalCount = await jobOpportunityService.getJobOpportunitiesCount(
      userId,
      options
    );

    res.status(200).json({
      ok: true,
      data: {
        jobOpportunities: opportunities.map((opportunity) => ({
          id: opportunity.id,
          title: opportunity.title,
          company: opportunity.company,
          location: opportunity.location,
          salaryMin: opportunity.salaryMin,
          salaryMax: opportunity.salaryMax,
          jobPostingUrl: opportunity.jobPostingUrl,
          applicationDeadline: opportunity.applicationDeadline,
          description: opportunity.description,
          industry: opportunity.industry,
          jobType: opportunity.jobType,
          status: opportunity.status,
          notes: opportunity.notes,
          recruiterName: opportunity.recruiterName,
          recruiterEmail: opportunity.recruiterEmail,
          recruiterPhone: opportunity.recruiterPhone,
          hiringManagerName: opportunity.hiringManagerName,
          hiringManagerEmail: opportunity.hiringManagerEmail,
          hiringManagerPhone: opportunity.hiringManagerPhone,
          salaryNegotiationNotes: opportunity.salaryNegotiationNotes,
          interviewNotes: opportunity.interviewNotes,
          applicationHistory: opportunity.applicationHistory,
          statusUpdatedAt: opportunity.statusUpdatedAt,
          createdAt: opportunity.createdAt,
          updatedAt: opportunity.updatedAt,
        })),
        pagination: {
          total: totalCount,
          limit: parseInt(limit) || 50,
          offset: parseInt(offset) || 0,
          hasMore:
            (parseInt(offset) || 0) + opportunities.length < totalCount,
        },
      },
    });
  });

  // Get job opportunity by ID
  getJobOpportunity = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const opportunity = await jobOpportunityService.getJobOpportunityById(
      id,
      userId
    );

    if (!opportunity) {
      return res.status(404).json({
        ok: false,
        error: {
          message: "Job opportunity not found",
          code: "NOT_FOUND",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        jobOpportunity: {
          id: opportunity.id,
          title: opportunity.title,
          company: opportunity.company,
          location: opportunity.location,
          salaryMin: opportunity.salaryMin,
          salaryMax: opportunity.salaryMax,
          jobPostingUrl: opportunity.jobPostingUrl,
          applicationDeadline: opportunity.applicationDeadline,
          description: opportunity.description,
          industry: opportunity.industry,
          jobType: opportunity.jobType,
          status: opportunity.status,
          notes: opportunity.notes,
          recruiterName: opportunity.recruiterName,
          recruiterEmail: opportunity.recruiterEmail,
          recruiterPhone: opportunity.recruiterPhone,
          hiringManagerName: opportunity.hiringManagerName,
          hiringManagerEmail: opportunity.hiringManagerEmail,
          hiringManagerPhone: opportunity.hiringManagerPhone,
          salaryNegotiationNotes: opportunity.salaryNegotiationNotes,
          interviewNotes: opportunity.interviewNotes,
          applicationHistory: opportunity.applicationHistory,
          statusUpdatedAt: opportunity.statusUpdatedAt,
          createdAt: opportunity.createdAt,
          updatedAt: opportunity.updatedAt,
        },
      },
    });
  });

  // Update job opportunity
  updateJobOpportunity = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const updateData = req.body;

    const opportunity = await jobOpportunityService.updateJobOpportunity(
      id,
      userId,
      updateData
    );

    res.status(200).json({
      ok: true,
      data: {
        jobOpportunity: {
          id: opportunity.id,
          title: opportunity.title,
          company: opportunity.company,
          location: opportunity.location,
          salaryMin: opportunity.salaryMin,
          salaryMax: opportunity.salaryMax,
          jobPostingUrl: opportunity.jobPostingUrl,
          applicationDeadline: opportunity.applicationDeadline,
          description: opportunity.description,
          industry: opportunity.industry,
          jobType: opportunity.jobType,
          status: opportunity.status,
          notes: opportunity.notes,
          recruiterName: opportunity.recruiterName,
          recruiterEmail: opportunity.recruiterEmail,
          recruiterPhone: opportunity.recruiterPhone,
          hiringManagerName: opportunity.hiringManagerName,
          hiringManagerEmail: opportunity.hiringManagerEmail,
          hiringManagerPhone: opportunity.hiringManagerPhone,
          salaryNegotiationNotes: opportunity.salaryNegotiationNotes,
          interviewNotes: opportunity.interviewNotes,
          applicationHistory: opportunity.applicationHistory,
          statusUpdatedAt: opportunity.statusUpdatedAt,
          createdAt: opportunity.createdAt,
          updatedAt: opportunity.updatedAt,
        },
        message: "Job opportunity updated successfully",
      },
    });
  });

  // Delete job opportunity
  deleteJobOpportunity = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    await jobOpportunityService.deleteJobOpportunity(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Job opportunity deleted successfully",
      },
    });
  });

  // Bulk update status for multiple job opportunities
  bulkUpdateStatus = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { opportunityIds, status } = req.body;

    if (!opportunityIds || !Array.isArray(opportunityIds) || opportunityIds.length === 0) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "opportunityIds array is required and cannot be empty",
          code: "VALIDATION_ERROR",
        },
      });
    }

    if (!status) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "status is required",
          code: "VALIDATION_ERROR",
        },
      });
    }

    const updatedOpportunities = await jobOpportunityService.bulkUpdateStatus(
      userId,
      opportunityIds,
      status
    );

    res.status(200).json({
      ok: true,
      data: {
        updatedOpportunities,
        message: `${updatedOpportunities.length} job opportunity/ies updated successfully`,
      },
    });
  });

  // Get status counts for the authenticated user
  getStatusCounts = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const counts = await jobOpportunityService.getStatusCounts(userId);

    res.status(200).json({
      ok: true,
      data: {
        statusCounts: counts,
      },
    });
  });

  // Get comprehensive job opportunity statistics
  getStatistics = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const statistics = await jobOpportunityService.getJobOpportunityStatistics(userId);

    res.status(200).json({
      ok: true,
      data: statistics,
    });
  });

  // Archive a job opportunity
  archiveJobOpportunity = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { archiveReason } = req.body;

    const result = await jobOpportunityService.archiveJobOpportunity(id, userId, archiveReason);

    res.status(200).json({
      ok: true,
      data: {
        jobOpportunity: result,
        message: "Job opportunity archived successfully",
      },
    });
  });

  // Unarchive a job opportunity
  unarchiveJobOpportunity = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const result = await jobOpportunityService.unarchiveJobOpportunity(id, userId);

    res.status(200).json({
      ok: true,
      data: {
        jobOpportunity: result,
        message: "Job opportunity unarchived successfully",
      },
    });
  });

  // Bulk archive job opportunities
  bulkArchiveJobOpportunities = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { opportunityIds, archiveReason } = req.body;

    if (!Array.isArray(opportunityIds) || opportunityIds.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "opportunityIds array is required and cannot be empty",
      });
    }

    const archivedOpportunities = await jobOpportunityService.bulkArchiveJobOpportunities(
      userId,
      opportunityIds,
      archiveReason
    );

    res.status(200).json({
      ok: true,
      data: {
        archivedOpportunities,
        message: `${archivedOpportunities.length} job opportunity/ies archived successfully`,
      },
    });
  });

  // Get archived job opportunities
  getArchivedJobOpportunities = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const {
      limit = 100,
      offset = 0,
      sort = "-archived_at",
    } = req.query;

    const opportunities = await jobOpportunityService.getArchivedJobOpportunities(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort,
    });

    res.status(200).json({
      ok: true,
      data: {
        jobOpportunities: opportunities,
      },
    });
  });

  // Get company information for a job opportunity
  getCompanyInformation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    // Get the job opportunity to extract company info
    const opportunity = await jobOpportunityService.getJobOpportunityById(id, userId);

    if (!opportunity) {
      return res.status(404).json({
        ok: false,
        error: "Job opportunity not found",
      });
    }

    // Fetch company information from the job posting URL
    const companyInfo = await companyService.getCompanyInformation(
      opportunity.jobPostingUrl,
      opportunity.company
    );

    res.status(200).json({
      ok: true,
      data: {
        companyInfo,
        jobOpportunity: {
          id: opportunity.id,
          title: opportunity.title,
          company: opportunity.company,
          location: opportunity.location,
          industry: opportunity.industry,
        },
      },
    });
  });
}

export default new JobOpportunityController();

