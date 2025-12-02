/**
 * AI Preparation Analysis Controller
 */

import aiPreparationService from '../services/aiPreparationAnalysisService.js';

/**
 * Get AI-powered preparation analysis
 */
export const getPreparationAnalysis = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    const analysis = await aiPreparationService.analyzePreparation(userId, {
      startDate,
      endDate,
    });

    res.json(analysis);
  } catch (error) {
    console.error('Error getting preparation analysis:', error);
    res.status(500).json({ 
      error: 'Failed to analyze preparation',
      message: error.message 
    });
  }
};

