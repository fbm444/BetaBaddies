import networkDiscoveryService from "../services/networkDiscoveryService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const normalizeDegree = (degree) => {
  if (!degree) {
    return "all";
  }
  const lower = degree.toString().toLowerCase();
  if (lower.startsWith("2")) {
    return "2nd";
  }
  if (lower.startsWith("3")) {
    return "3rd";
  }
  if (lower === "all") {
    return "all";
  }
  return "all";
};

class NetworkDiscoveryController {
  getExploreNetwork = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const filters = {
      degree: normalizeDegree(req.query.degree),
      search: req.query.search,
      limit: Math.min(parseInt(req.query.limit, 10) || 50, 100),
      offset: parseInt(req.query.offset, 10) || 0,
    };

    const suggestions = await networkDiscoveryService.getExploreContacts(userId, filters);

    res.status(200).json({
      ok: true,
      data: {
        suggestions,
      },
    });
  });

  getPeopleWhoHaveYou = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const filters = {
      search: req.query.search,
      limit: Math.min(parseInt(req.query.limit, 10) || 50, 100),
      offset: parseInt(req.query.offset, 10) || 0,
    };

    const contacts = await networkDiscoveryService.getPeopleWhoHaveYou(userId, filters);

    res.status(200).json({
      ok: true,
      data: {
        contacts,
      },
    });
  });

  getPeopleInYourIndustry = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const filters = {
      search: req.query.search,
      limit: Math.min(parseInt(req.query.limit, 10) || 50, 100),
      offset: parseInt(req.query.offset, 10) || 0,
    };

    const contacts = await networkDiscoveryService.getPeopleInYourIndustry(userId, filters);

    res.status(200).json({
      ok: true,
      data: {
        contacts,
      },
    });
  });
}

export default new NetworkDiscoveryController();


