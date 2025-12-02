import competitiveAnalysisService from '../services/competitiveAnalysisService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class CompetitiveAnalysisController {
  /**
   * Generate competitive analysis for the current user
   */
  getCompetitiveAnalysis = asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const analysis = await competitiveAnalysisService.generateCompetitiveAnalysis(userId);

    res.status(200).json({
      ok: true,
      data: { analysis },
    });
  });
}

export default new CompetitiveAnalysisController();

