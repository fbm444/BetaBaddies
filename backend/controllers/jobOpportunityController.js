import jobOpportunityService from "../services/jobOpportunityService.js";
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
    const { sort, limit, offset } = req.query;

    const options = { sort, limit, offset };
    const opportunities = await jobOpportunityService.getJobOpportunitiesByUserId(
      userId,
      options
    );
    const totalCount = await jobOpportunityService.getJobOpportunitiesCount(
      userId
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
}

export default new JobOpportunityController();

