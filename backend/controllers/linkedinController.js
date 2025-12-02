import linkedinService from "../services/linkedinService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class LinkedInController {
  // Import LinkedIn profile
  importProfile = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to import LinkedIn profile",
        },
      });
    }

    try {
      const accessToken = await linkedinService.getLinkedInAccessToken(userId);
      if (!accessToken) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "NO_LINKEDIN_TOKEN",
            message: "LinkedIn account not connected. Please sign in with LinkedIn first.",
          },
        });
      }

      const profileData = await linkedinService.fetchLinkedInProfile(accessToken);
      await linkedinService.importProfileToUser(userId, profileData);

      res.status(200).json({
        ok: true,
        data: {
          message: "LinkedIn profile imported successfully",
          profile: profileData,
        },
      });
    } catch (error) {
      console.error("❌ Error importing LinkedIn profile:", error);
      throw error;
    }
  });

  // Generate networking template
  generateNetworkingTemplate = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to generate templates",
        },
      });
    }

    try {
      const template = await linkedinService.generateNetworkingTemplate(userId, req.body);

      res.status(200).json({
        ok: true,
        data: {
          template,
          message: "Networking template generated successfully",
        },
      });
    } catch (error) {
      console.error("❌ Error generating networking template:", error);
      throw error;
    }
  });

  // Get networking templates
  getNetworkingTemplates = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to view templates",
        },
      });
    }

    try {
      const { templateType } = req.query;
      const templates = await linkedinService.getNetworkingTemplates(userId, templateType || null);

      res.status(200).json({
        ok: true,
        data: {
          templates,
          message: "Templates retrieved successfully",
        },
      });
    } catch (error) {
      console.error("❌ Error getting networking templates:", error);
      throw error;
    }
  });

  // Generate profile optimization suggestions
  generateProfileOptimization = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to generate optimization suggestions",
        },
      });
    }

    try {
      const suggestions = await linkedinService.generateProfileOptimizationSuggestions(
        userId,
        req.body
      );

      res.status(200).json({
        ok: true,
        data: {
          suggestions,
          message: "Profile optimization suggestions generated successfully",
        },
      });
    } catch (error) {
      console.error("❌ Error generating profile optimization:", error);
      throw error;
    }
  });

  // Get profile optimization suggestions
  getProfileOptimization = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to view optimization suggestions",
        },
      });
    }

    try {
      const { implemented } = req.query;
      const suggestions = await linkedinService.getProfileOptimizationSuggestions(
        userId,
        implemented === "true"
      );

      res.status(200).json({
        ok: true,
        data: {
          suggestions,
          message: "Optimization suggestions retrieved successfully",
        },
      });
    } catch (error) {
      console.error("❌ Error getting profile optimization:", error);
      throw error;
    }
  });

  // Mark optimization as implemented
  markOptimizationImplemented = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to update optimization status",
        },
      });
    }

    try {
      const { optimizationId } = req.params;
      const result = await linkedinService.markOptimizationImplemented(userId, optimizationId);

      res.status(200).json({
        ok: true,
        data: {
          optimization: result,
          message: "Optimization marked as implemented",
        },
      });
    } catch (error) {
      console.error("❌ Error marking optimization as implemented:", error);
      throw error;
    }
  });

  // Generate networking strategies
  generateNetworkingStrategies = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to generate strategies",
        },
      });
    }

    try {
      const strategies = await linkedinService.generateNetworkingStrategies(userId, req.body);

      res.status(200).json({
        ok: true,
        data: {
          strategies,
          message: "Networking strategies generated successfully",
        },
      });
    } catch (error) {
      console.error("❌ Error generating networking strategies:", error);
      throw error;
    }
  });
}

export default new LinkedInController();

