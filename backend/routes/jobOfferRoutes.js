// Job Offer Routes for UC-127: Offer Evaluation & Comparison Tool
import express from "express";
import jobOfferService from "../services/jobOfferService.js";
import careerPathSimulationService from "../services/careerPathSimulationService.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// ============================================================================
// CREATE
// ============================================================================

/**
 * @route   POST /api/job-offers
 * @desc    Create a new job offer
 * @access  Private
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.session.userId;
    const offerData = req.body;

    const newOffer = await jobOfferService.createJobOffer(userId, offerData);

    res.status(201).json({
      ok: true,
      message: "Job offer created successfully",
      data: newOffer,
    });
  } catch (error) {
    console.error("Error in POST /api/job-offers:", error);
    res.status(500).json({
      ok: false,
      error: {
        code: "CREATE_OFFER_ERROR",
        message: error.message || "Failed to create job offer",
      },
    });
  }
});

// ============================================================================
// READ
// ============================================================================

/**
 * @route   GET /api/job-offers
 * @desc    Get all job offers for the authenticated user
 * @access  Private
 * @query   offer_status, negotiation_status, company
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.session.userId;
    const filters = {
      offer_status: req.query.offer_status,
      negotiation_status: req.query.negotiation_status,
      company: req.query.company,
    };

    const offers = await jobOfferService.getJobOffersByUserId(userId, filters);

    res.json({
      ok: true,
      data: offers,
      count: offers.length,
    });
  } catch (error) {
    console.error("Error in GET /api/job-offers:", error);
    res.status(500).json({
      ok: false,
      error: {
        code: "FETCH_OFFERS_ERROR",
        message: error.message || "Failed to fetch job offers",
      },
    });
  }
});

/**
 * @route   GET /api/job-offers/:id
 * @desc    Get a specific job offer by ID
 * @access  Private
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.session.userId;
    const offerId = req.params.id;

    const offer = await jobOfferService.getJobOfferById(offerId, userId);

    if (!offer) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "OFFER_NOT_FOUND",
          message: "Job offer not found",
        },
      });
    }

    res.json({
      ok: true,
      data: offer,
    });
  } catch (error) {
    console.error(`Error in GET /api/job-offers/${req.params.id}:`, error);
    res.status(500).json({
      ok: false,
      error: {
        code: "FETCH_OFFER_ERROR",
        message: error.message || "Failed to fetch job offer",
      },
    });
  }
});

// ============================================================================
// UPDATE
// ============================================================================

/**
 * @route   PUT /api/job-offers/:id
 * @desc    Update a job offer
 * @access  Private
 */
router.put("/:id", async (req, res) => {
  try {
    const userId = req.session.userId;
    const offerId = req.params.id;
    const updateData = req.body;

    const updatedOffer = await jobOfferService.updateJobOffer(
      offerId,
      userId,
      updateData
    );

    res.json({
      ok: true,
      message: "Job offer updated successfully",
      data: updatedOffer,
    });
  } catch (error) {
    console.error(`Error in PUT /api/job-offers/${req.params.id}:`, error);
    res.status(500).json({
      ok: false,
      error: {
        code: "UPDATE_OFFER_ERROR",
        message: error.message || "Failed to update job offer",
      },
    });
  }
});

// ============================================================================
// DELETE
// ============================================================================

/**
 * @route   DELETE /api/job-offers/:id
 * @desc    Delete a job offer
 * @access  Private
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.session.userId;
    const offerId = req.params.id;

    const deleted = await jobOfferService.deleteJobOffer(offerId, userId);

    if (!deleted) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "OFFER_NOT_FOUND",
          message: "Job offer not found",
        },
      });
    }

    res.json({
      ok: true,
      message: "Job offer deleted successfully",
    });
  } catch (error) {
    console.error(`Error in DELETE /api/job-offers/${req.params.id}:`, error);
    res.status(500).json({
      ok: false,
      error: {
        code: "DELETE_OFFER_ERROR",
        message: error.message || "Failed to delete job offer",
      },
    });
  }
});

// ============================================================================
// OFFER ACTIONS
// ============================================================================

/**
 * @route   POST /api/job-offers/:id/accept
 * @desc    Accept a job offer
 * @access  Private
 */
router.post("/:id/accept", async (req, res) => {
  try {
    const userId = req.session.userId;
    const offerId = req.params.id;

    const acceptedOffer = await jobOfferService.acceptOffer(offerId, userId);

    res.json({
      ok: true,
      message: "Job offer accepted",
      data: acceptedOffer,
    });
  } catch (error) {
    console.error(
      `Error in POST /api/job-offers/${req.params.id}/accept:`,
      error
    );
    res.status(500).json({
      ok: false,
      error: {
        code: "ACCEPT_OFFER_ERROR",
        message: error.message || "Failed to accept job offer",
      },
    });
  }
});

/**
 * @route   POST /api/job-offers/:id/decline
 * @desc    Decline a job offer
 * @access  Private
 * @body    { reason?: string }
 */
router.post("/:id/decline", async (req, res) => {
  try {
    const userId = req.session.userId;
    const offerId = req.params.id;
    const { reason } = req.body;

    const declinedOffer = await jobOfferService.declineOffer(
      offerId,
      userId,
      reason
    );

    res.json({
      ok: true,
      message: "Job offer declined",
      data: declinedOffer,
    });
  } catch (error) {
    console.error(
      `Error in POST /api/job-offers/${req.params.id}/decline:`,
      error
    );
    res.status(500).json({
      ok: false,
      error: {
        code: "DECLINE_OFFER_ERROR",
        message: error.message || "Failed to decline job offer",
      },
    });
  }
});

// ============================================================================
// SCENARIO ANALYSIS
// ============================================================================

/**
 * @route   POST /api/job-offers/:id/scenarios
 * @desc    Add a scenario analysis to an offer
 * @access  Private
 * @body    { name, description, adjustments }
 */
router.post("/:id/scenarios", async (req, res) => {
  try {
    const userId = req.session.userId;
    const offerId = req.params.id;
    const scenario = req.body;

    const updatedOffer = await jobOfferService.addScenario(
      offerId,
      userId,
      scenario
    );

    res.json({
      ok: true,
      message: "Scenario added successfully",
      data: updatedOffer,
    });
  } catch (error) {
    console.error(
      `Error in POST /api/job-offers/${req.params.id}/scenarios:`,
      error
    );
    res.status(500).json({
      ok: false,
      error: {
        code: "ADD_SCENARIO_ERROR",
        message: error.message || "Failed to add scenario",
      },
    });
  }
});

/**
 * @route   DELETE /api/job-offers/:id/scenarios/:scenarioId
 * @desc    Delete a scenario from an offer
 * @access  Private
 */
router.delete("/:id/scenarios/:scenarioId", async (req, res) => {
  try {
    const userId = req.session.userId;
    const offerId = req.params.id;
    const scenarioId = req.params.scenarioId;

    const updatedOffer = await jobOfferService.deleteScenario(
      offerId,
      userId,
      scenarioId
    );

    res.json({
      ok: true,
      message: "Scenario deleted successfully",
      data: updatedOffer,
    });
  } catch (error) {
    console.error(
      `Error in DELETE /api/job-offers/${req.params.id}/scenarios/${req.params.scenarioId}:`,
      error
    );
    res.status(500).json({
      ok: false,
      error: {
        code: "DELETE_SCENARIO_ERROR",
        message: error.message || "Failed to delete scenario",
      },
    });
  }
});

// ============================================================================
// NEGOTIATION
// ============================================================================

/**
 * @route   POST /api/job-offers/:id/negotiation
 * @desc    Add a negotiation history entry
 * @access  Private
 * @body    { round, request_type, request_amount?, request_details, response?, response_date?, accepted }
 */
router.post("/:id/negotiation", async (req, res) => {
  try {
    const userId = req.session.userId;
    const offerId = req.params.id;
    const entry = req.body;

    const updatedOffer = await jobOfferService.addNegotiationEntry(
      offerId,
      userId,
      entry
    );

    res.json({
      ok: true,
      message: "Negotiation entry added successfully",
      data: updatedOffer,
    });
  } catch (error) {
    console.error(
      `Error in POST /api/job-offers/${req.params.id}/negotiation:`,
      error
    );
    res.status(500).json({
      ok: false,
      error: {
        code: "ADD_NEGOTIATION_ERROR",
        message: error.message || "Failed to add negotiation entry",
      },
    });
  }
});

/**
 * @route   GET /api/job-offers/:id/negotiation/recommendations
 * @desc    Generate negotiation recommendations for an offer
 * @access  Private
 */
router.get("/:id/negotiation/recommendations", async (req, res) => {
  try {
    const userId = req.session.userId;
    const offerId = req.params.id;

    const updatedOffer =
      await jobOfferService.generateNegotiationRecommendations(offerId, userId);

    res.json({
      ok: true,
      data: updatedOffer.negotiation_recommendations,
    });
  } catch (error) {
    console.error(
      `Error in GET /api/job-offers/${req.params.id}/negotiation/recommendations:`,
      error
    );
    res.status(500).json({
      ok: false,
      error: {
        code: "GENERATE_RECOMMENDATIONS_ERROR",
        message: error.message || "Failed to generate negotiation recommendations",
      },
    });
  }
});

// ============================================================================
// COMPARISON
// ============================================================================

/**
 * @route   POST /api/job-offers/compare
 * @desc    Compare multiple job offers
 * @access  Private
 * @body    { offer_ids: string[], weights?: object }
 */
router.post("/compare", async (req, res) => {
  try {
    const userId = req.session.userId;
    const { offer_ids, weights } = req.body;

    if (!offer_ids || !Array.isArray(offer_ids) || offer_ids.length < 2) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Please provide at least 2 offer IDs to compare",
        },
      });
    }

    const comparison = await jobOfferService.compareOffers(
      userId,
      offer_ids,
      weights
    );

    res.json({
      ok: true,
      data: comparison,
    });
  } catch (error) {
    console.error("Error in POST /api/job-offers/compare:", error);
    res.status(500).json({
      ok: false,
      error: {
        code: "COMPARE_OFFERS_ERROR",
        message: error.message || "Failed to compare offers",
      },
    });
  }
});

// ============================================================================
// CAREER PATH SIMULATION
// ============================================================================

/**
 * @route   POST /api/job-offers/:id/career-simulation
 * @desc    Generate career path simulation for a specific offer
 * @access  Private
 * @body    { userPreferences?: object }
 */
router.post("/:id/career-simulation", async (req, res) => {
  try {
    const userId = req.session.userId;
    const offerId = req.params.id;
    const { userPreferences } = req.body;

    const simulation = await careerPathSimulationService.simulateCareerPath(
      userId,
      offerId,
      userPreferences || {}
    );

    res.json({
      ok: true,
      data: simulation,
    });
  } catch (error) {
    console.error(
      `Error in POST /api/job-offers/${req.params.id}/career-simulation:`,
      error
    );
    res.status(500).json({
      ok: false,
      error: {
        code: "CAREER_SIMULATION_ERROR",
        message: error.message || "Failed to generate career path simulation",
      },
    });
  }
});

/**
 * @route   POST /api/job-offers/career-comparison
 * @desc    Compare career paths for multiple offers
 * @access  Private
 * @body    { offer_ids: string[], userPreferences?: object }
 */
router.post("/career-comparison", async (req, res) => {
  try {
    const userId = req.session.userId;
    const { offer_ids, userPreferences } = req.body;

    if (!offer_ids || !Array.isArray(offer_ids) || offer_ids.length < 1) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Please provide at least 1 offer ID",
        },
      });
    }

    const comparison = await careerPathSimulationService.compareCareerPaths(
      userId,
      offer_ids,
      userPreferences || {}
    );

    res.json({
      ok: true,
      data: comparison,
    });
  } catch (error) {
    console.error("Error in POST /api/job-offers/career-comparison:", error);
    res.status(500).json({
      ok: false,
      error: {
        code: "CAREER_COMPARISON_ERROR",
        message: error.message || "Failed to compare career paths",
      },
    });
  }
});

export default router;
