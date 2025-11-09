import prospectiveJobService from "../services/prospectiveJobService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class ProspectiveJobController {
  // Get all prospective jobs for the authenticated user
  getProspectiveJobs = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { stage, sort, limit, offset } = req.query;

    console.log("🔍 Getting prospective jobs for userId:", userId);
    if (!userId) {
      console.warn("⚠️ No userId in session!");
    }

    const options = { stage, sort, limit, offset };
    const jobs = await prospectiveJobService.getProspectiveJobs(userId, options);
    
    console.log(`📋 Found ${jobs.length} jobs for user ${userId}`);

    res.status(200).json({
      ok: true,
      data: {
        jobs: jobs.map((job) => ({
          id: job.id,
          deadline: job.deadline,
          description: job.description,
          industry: job.industry,
          jobType: job.jobType,
          jobTitle: job.jobTitle,
          company: job.company,
          location: job.location,
          salaryLow: job.salaryLow,
          salaryHigh: job.salaryHigh,
          stage: job.stage,
          statusChangeTime: job.statusChangeTime,
          personalNotes: job.personalNotes,
          salaryNotes: job.salaryNotes,
          dateAdded: job.dateAdded,
          jobUrl: job.jobUrl,
          currentResume: job.currentResume,
          currentCoverletter: job.currentCoverletter,
        })),
        count: jobs.length,
      },
    });
  });

  // Get a specific prospective job by ID
  getProspectiveJobById = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const job = await prospectiveJobService.getProspectiveJobById(id, userId);

    if (!job) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "PROSPECTIVE_JOB_NOT_FOUND",
          message: "Prospective job not found or does not belong to user",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        job: {
          id: job.id,
          deadline: job.deadline,
          description: job.description,
          industry: job.industry,
          jobType: job.jobType,
          jobTitle: job.jobTitle,
          company: job.company,
          location: job.location,
          salaryLow: job.salaryLow,
          salaryHigh: job.salaryHigh,
          stage: job.stage,
          statusChangeTime: job.statusChangeTime,
          personalNotes: job.personalNotes,
          salaryNotes: job.salaryNotes,
          dateAdded: job.dateAdded,
          jobUrl: job.jobUrl,
          currentResume: job.currentResume,
          currentCoverletter: job.currentCoverletter,
        },
      },
    });
  });
}

export default new ProspectiveJobController();

