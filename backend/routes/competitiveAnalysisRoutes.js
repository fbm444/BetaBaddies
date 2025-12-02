import express from 'express';
import competitiveAnalysisController from '../controllers/competitiveAnalysisController.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Get competitive analysis
router.get('/', competitiveAnalysisController.getCompetitiveAnalysis);

export default router;

