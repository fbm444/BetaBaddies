import interviewResponseService from "../services/interviewResponseService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class InterviewResponseController {
  // Create a new interview response
  createResponse = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const responseData = req.body;

    const response = await interviewResponseService.createResponse(
      userId,
      responseData
    );

    res.status(201).json({
      ok: true,
      data: {
        response,
        message: "Interview response created successfully",
      },
    });
  });

  // Get all responses for the authenticated user
  getResponses = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { questionType, tagValue, searchTerm } = req.query;

    const filters = {
      questionType,
      tagValue,
      searchTerm,
    };

    const responses = await interviewResponseService.getResponses(userId, filters);

    res.status(200).json({
      ok: true,
      data: {
        responses,
      },
    });
  });

  // Get a single response by ID
  getResponseById = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const response = await interviewResponseService.getResponseById(userId, id);

    if (!response) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "RESPONSE_NOT_FOUND",
          message: "Interview response not found",
        },
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        response,
      },
    });
  });

  // Update response metadata
  updateResponse = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const updateData = req.body;

    const response = await interviewResponseService.updateResponse(
      userId,
      id,
      updateData
    );

    res.status(200).json({
      ok: true,
      data: {
        response,
        message: "Response updated successfully",
      },
    });
  });

  // Create a new version of a response
  createVersion = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const versionData = req.body;

    const version = await interviewResponseService.createVersion(
      userId,
      id,
      versionData
    );

    res.status(201).json({
      ok: true,
      data: {
        version,
        message: "Response version created successfully",
      },
    });
  });

  // Add tag to response
  addTag = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const tagData = req.body;

    const tag = await interviewResponseService.addTag(userId, id, tagData);

    res.status(201).json({
      ok: true,
      data: {
        tag,
        message: "Tag added successfully",
      },
    });
  });

  // Remove tag from response
  removeTag = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id, tagId } = req.params;

    await interviewResponseService.removeTag(userId, id, tagId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Tag removed successfully",
      },
    });
  });

  // Add outcome to response
  addOutcome = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const outcomeData = req.body;

    const outcome = await interviewResponseService.addOutcome(
      userId,
      id,
      outcomeData
    );

    res.status(201).json({
      ok: true,
      data: {
        outcome,
        message: "Outcome added successfully",
      },
    });
  });

  // Delete response
  deleteResponse = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    await interviewResponseService.deleteResponse(userId, id);

    res.status(200).json({
      ok: true,
      data: {
        message: "Response deleted successfully",
      },
    });
  });

  // Get gap analysis
  getGapAnalysis = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const gapAnalysis = await interviewResponseService.getGapAnalysis(userId);

    res.status(200).json({
      ok: true,
      data: {
        gapAnalysis,
      },
    });
  });

  // Suggest best response based on job requirements
  suggestBestResponse = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { jobRequirements } = req.body;

    const suggestion = await interviewResponseService.suggestBestResponse(
      userId,
      id,
      jobRequirements
    );

    res.status(200).json({
      ok: true,
      data: {
        suggestion,
      },
    });
  });

  // Export response library
  exportPrepGuide = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { format = "json" } = req.query;

    const exportData = await interviewResponseService.exportPrepGuide(
      userId,
      format
    );

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="interview-prep-guide-${Date.now()}.json"`
      );
      res.status(200).send(exportData);
    } else if (format === "markdown") {
      res.setHeader("Content-Type", "text/markdown");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="interview-prep-guide-${Date.now()}.md"`
      );
      res.status(200).send(exportData);
    } else {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_FORMAT",
          message: `Unsupported export format: ${format}`,
        },
      });
    }
  });
}

export default new InterviewResponseController();

