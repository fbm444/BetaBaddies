import salaryNegotiationService from "../services/salaryNegotiationService.js";
import salaryMarketResearchService from "../services/salaryMarketResearchService.js";
import salaryNegotiationAIService from "../services/salaryNegotiationAIService.js";
import totalCompensationService from "../services/totalCompensationService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class SalaryNegotiationController {
  // Create new negotiation
  createNegotiation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobOpportunityId, offerData } = req.body;

    if (!jobOpportunityId || !offerData) {
      return res.status(400).json({
        ok: false,
        error: "jobOpportunityId and offerData are required",
      });
    }

    const negotiation = await salaryNegotiationService.createNegotiation(
      userId,
      jobOpportunityId,
      offerData
    );

    res.status(201).json({
      ok: true,
      data: {
        negotiation,
        message: "Salary negotiation created successfully",
      },
    });
  });

  // Get all negotiations for user
  getNegotiations = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { status, outcome, limit, offset } = req.query;

    const filters = {
      status,
      outcome,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    };

    const negotiations = await salaryNegotiationService.getNegotiationsByUserId(
      userId,
      filters
    );

    res.status(200).json({
      ok: true,
      data: {
        negotiations,
      },
    });
  });

  // Get negotiation by ID
  getNegotiationById = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const negotiation = await salaryNegotiationService.getNegotiationById(
      id,
      userId
    );

    if (!negotiation) {
      return res.status(404).json({
        ok: false,
        error: "Negotiation not found",
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        negotiation,
      },
    });
  });

  // Get negotiation by job opportunity
  getNegotiationByJob = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { jobOpportunityId } = req.params;

    const negotiation =
      await salaryNegotiationService.getNegotiationByJobOpportunity(
        jobOpportunityId,
        userId
      );

    res.status(200).json({
      ok: true,
      data: {
        negotiation,
      },
    });
  });

  // Update negotiation
  updateNegotiation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const updates = req.body;

    const negotiation = await salaryNegotiationService.updateNegotiation(
      id,
      userId,
      updates
    );

    res.status(200).json({
      ok: true,
      data: {
        negotiation,
        message: "Negotiation updated successfully",
      },
    });
  });

  // Add counteroffer
  addCounteroffer = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const counterofferData = req.body;

    if (!counterofferData.baseSalary) {
      return res.status(400).json({
        ok: false,
        error: "baseSalary is required",
      });
    }

    const negotiation = await salaryNegotiationService.updateCounteroffer(
      id,
      userId,
      counterofferData
    );

    res.status(200).json({
      ok: true,
      data: {
        negotiation,
        message: "Counteroffer added successfully",
      },
    });
  });

  // Complete negotiation
  completeNegotiation = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const outcomeData = req.body;

    const negotiation = await salaryNegotiationService.completeNegotiation(
      id,
      userId,
      outcomeData
    );

    res.status(200).json({
      ok: true,
      data: {
        negotiation,
        message: "Negotiation completed successfully",
      },
    });
  });

  // Get market research
  getMarketResearch = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const negotiation = await salaryNegotiationService.getNegotiationById(
      id,
      userId
    );

    if (!negotiation) {
      return res.status(404).json({
        ok: false,
        error: "Negotiation not found",
      });
    }

    // Return existing market data if available
    if (negotiation.marketSalaryData) {
      return res.status(200).json({
        ok: true,
        data: {
          marketData: negotiation.marketSalaryData,
        },
      });
    }

    // Generate new market research
    const { role, location } = req.query;
    if (!role || !location) {
      return res.status(400).json({
        ok: false,
        error: "role and location are required for market research",
      });
    }

    const experienceLevel = parseInt(req.query.experienceLevel) || 5;
    const industry = req.query.industry || null;

    const marketData = await salaryMarketResearchService.researchMarketSalary(
      role,
      location,
      experienceLevel,
      industry
    );

    // Save to negotiation
    await salaryNegotiationService.updateNegotiation(id, userId, {
      marketSalaryData: JSON.stringify(marketData),
    });

    res.status(200).json({
      ok: true,
      data: {
        marketData,
      },
    });
  });

  // Trigger market research
  triggerMarketResearch = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { role, location, experienceLevel, industry } = req.body;

    if (!role || !location) {
      return res.status(400).json({
        ok: false,
        error: "role and location are required",
      });
    }

    const marketData = await salaryMarketResearchService.researchMarketSalary(
      role,
      location,
      experienceLevel || 5,
      industry
    );

    // Save to negotiation
    await salaryNegotiationService.updateNegotiation(id, userId, {
      marketSalaryData: JSON.stringify(marketData),
    });

    res.status(200).json({
      ok: true,
      data: {
        marketData,
        message: "Market research completed",
      },
    });
  });

  // Get talking points
  getTalkingPoints = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const negotiation = await salaryNegotiationService.getNegotiationById(
      id,
      userId
    );

    if (!negotiation) {
      return res.status(404).json({
        ok: false,
        error: "Negotiation not found",
      });
    }

    // Return existing if available
    if (negotiation.talkingPoints && negotiation.talkingPoints.length > 0) {
      return res.status(200).json({
        ok: true,
        data: {
          talkingPoints: negotiation.talkingPoints,
        },
      });
    }

    // Generate new talking points
    const talkingPoints = await salaryNegotiationAIService.generateTalkingPoints(
      id,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        talkingPoints,
      },
    });
  });

  // Generate talking points
  generateTalkingPoints = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const { regenerate } = req.body;

    const talkingPoints = await salaryNegotiationAIService.generateTalkingPoints(
      id,
      userId,
      { forceRegenerate: regenerate || false }
    );

    res.status(200).json({
      ok: true,
      data: {
        talkingPoints,
        message: "Talking points generated successfully",
      },
    });
  });

  // Get negotiation script
  getNegotiationScript = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id, scenario } = req.params;

    const negotiation = await salaryNegotiationService.getNegotiationById(
      id,
      userId
    );

    if (!negotiation) {
      return res.status(404).json({
        ok: false,
        error: "Negotiation not found",
      });
    }

    // Return existing if available
    if (negotiation.scripts?.[scenario]) {
      return res.status(200).json({
        ok: true,
        data: {
          script: negotiation.scripts[scenario],
        },
      });
    }

    // Generate new script
    const script = await salaryNegotiationAIService.generateNegotiationScript(
      id,
      userId,
      scenario
    );

    res.status(200).json({
      ok: true,
      data: {
        script,
      },
    });
  });

  // Generate negotiation script
  generateNegotiationScript = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id, scenario } = req.params;
    const { regenerate } = req.body;

    const script = await salaryNegotiationAIService.generateNegotiationScript(
      id,
      userId,
      scenario,
      { forceRegenerate: regenerate || false }
    );

    res.status(200).json({
      ok: true,
      data: {
        script,
        message: "Negotiation script generated successfully",
      },
    });
  });

  // Evaluate counteroffer
  evaluateCounteroffer = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const counterofferData = req.body;

    const evaluation = await salaryNegotiationAIService.evaluateCounteroffer(
      id,
      userId,
      counterofferData
    );

    res.status(200).json({
      ok: true,
      data: {
        evaluation,
      },
    });
  });

  // Get timing strategy
  getTimingStrategy = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;

    const strategy = await salaryNegotiationAIService.generateTimingStrategy(
      id,
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        strategy,
      },
    });
  });

  // Get salary progression
  getSalaryProgression = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const progression = await salaryNegotiationService.getSalaryProgression(
      userId
    );

    res.status(200).json({
      ok: true,
      data: {
        progression,
      },
    });
  });

  // Add salary progression entry
  addSalaryProgressionEntry = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const salaryData = req.body;

    const entry = await salaryNegotiationService.addSalaryProgressionEntry(
      userId,
      salaryData
    );

    res.status(201).json({
      ok: true,
      data: {
        entry,
        message: "Salary progression entry added successfully",
      },
    });
  });
}

export default new SalaryNegotiationController();

