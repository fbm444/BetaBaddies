import networkingService from "../services/networkingService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class NetworkingController {
  // Get recruiters from job opportunities
  getRecruiters = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const recruiters = await networkingService.getRecruitersFromOpportunities(userId);
    res.status(200).json({
      ok: true,
      data: { recruiters },
    });
  });

  // Search companies by industry
  searchCompanies = asyncHandler(async (req, res) => {
    const { industry } = req.query;
    if (!industry) {
      return res.status(400).json({
        ok: false,
        error: { message: "Industry parameter is required" },
      });
    }
    const companies = await networkingService.searchCompaniesByIndustry(industry);
    res.status(200).json({
      ok: true,
      data: { companies },
    });
  });

  // Get LinkedIn network
  getLinkedInNetwork = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { company, industry, limit } = req.query;
    const contacts = await networkingService.getLinkedInNetwork(userId, {
      company,
      industry,
      limit: limit ? parseInt(limit) : 50,
    });
    res.status(200).json({
      ok: true,
      data: { contacts },
    });
  });

  // Generate networking message
  generateMessage = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const message = await networkingService.generateNetworkingMessage(userId, req.body);
    res.status(200).json({
      ok: true,
      data: { message },
    });
  });

  // Create coffee chat
  createCoffeeChat = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const chat = await networkingService.createCoffeeChat(userId, req.body);
    res.status(201).json({
      ok: true,
      data: { chat },
    });
  });

  // Get coffee chats
  getCoffeeChats = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { status, jobOpportunityId } = req.query;
    const chats = await networkingService.getCoffeeChats(userId, {
      status,
      jobOpportunityId,
    });
    res.status(200).json({
      ok: true,
      data: { chats },
    });
  });

  // Update coffee chat
  updateCoffeeChat = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const chat = await networkingService.updateCoffeeChat(userId, id, req.body);
    res.status(200).json({
      ok: true,
      data: { chat },
    });
  });

  // Save networking message
  saveMessage = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const message = await networkingService.saveNetworkingMessage(userId, req.body);
    res.status(201).json({
      ok: true,
      data: { message },
    });
  });

  // Get networking analytics
  getAnalytics = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;
    const analytics = await networkingService.getNetworkingAnalytics(userId, {
      startDate,
      endDate,
    });
    res.status(200).json({
      ok: true,
      data: { analytics },
    });
  });
}

export default new NetworkingController();

