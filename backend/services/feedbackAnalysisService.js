import database from "./database.js";

class FeedbackAnalysisService {
  // Theme keyword mapping
  constructor() {
    this.themeKeywords = {
      communication: [
        "communicate",
        "explain",
        "clear",
        "articulate",
        "presentation",
        "explanation",
        "clarify",
        "verbal",
      ],
      technical_depth: [
        "depth",
        "understanding",
        "comprehensive",
        "thorough",
        "deep",
        "knowledge",
        "expertise",
      ],
      problem_solving: [
        "problem",
        "solve",
        "approach",
        "methodology",
        "strategy",
        "solution",
        "algorithm",
      ],
      time_management: [
        "time",
        "pace",
        "efficient",
        "rushed",
        "slow",
        "timing",
        "duration",
      ],
      confidence: [
        "confident",
        "nervous",
        "uncertain",
        "assured",
        "anxious",
        "calm",
        "composed",
      ],
      preparation: [
        "prepared",
        "preparation",
        "ready",
        "unprepared",
        "practice",
        "studied",
      ],
      communication_clarity: [
        "clear",
        "unclear",
        "confusing",
        "understood",
        "clarity",
        "precise",
      ],
      code_quality: [
        "code",
        "quality",
        "clean",
        "efficient",
        "buggy",
        "elegant",
        "maintainable",
      ],
      algorithm_knowledge: [
        "algorithm",
        "data structure",
        "complexity",
        "optimization",
        "efficiency",
      ],
      system_design: [
        "system",
        "design",
        "architecture",
        "scalable",
        "distributed",
      ],
      behavioral_examples: [
        "example",
        "story",
        "experience",
        "situation",
        "behavioral",
        "scenario",
      ],
      nervousness: [
        "nervous",
        "anxious",
        "stressed",
        "panic",
        "worried",
        "fear",
      ],
      overthinking: [
        "overthink",
        "hesitate",
        "uncertain",
        "indecisive",
        "second-guess",
      ],
    };

    // Sentiment keywords
    this.positiveKeywords = [
      "good",
      "great",
      "excellent",
      "strong",
      "impressive",
      "well",
      "solid",
      "outstanding",
      "exceptional",
      "skilled",
    ];

    this.negativeKeywords = [
      "poor",
      "weak",
      "struggled",
      "difficult",
      "challenged",
      "needs improvement",
      "lacked",
      "missing",
      "incomplete",
    ];
  }

  /**
   * Extract themes from feedback notes
   */
  extractThemes(notes) {
    if (!notes || typeof notes !== "string") {
      return [];
    }

    const lowerNotes = notes.toLowerCase();
    const matchedThemes = [];

    for (const [theme, keywords] of Object.entries(this.themeKeywords)) {
      const matchedKeywords = keywords.filter((keyword) =>
        lowerNotes.includes(keyword.toLowerCase())
      );
      if (matchedKeywords.length > 0) {
        matchedThemes.push({
          theme,
          matchedKeywords,
          confidence: matchedKeywords.length / keywords.length,
        });
      }
    }

    // Sort by confidence (number of keyword matches)
    matchedThemes.sort((a, b) => b.confidence - a.confidence);

    // Return top 3 themes
    return matchedThemes.slice(0, 3).map((t) => t.theme);
  }

  /**
   * Analyze sentiment from feedback notes
   * Returns a score from -1.0 (very negative) to 1.0 (very positive)
   */
  analyzeSentiment(notes) {
    if (!notes || typeof notes !== "string") {
      return 0;
    }

    const lowerNotes = notes.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    // Count positive keywords
    this.positiveKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\w*\\b`, "gi");
      const matches = lowerNotes.match(regex);
      if (matches) {
        positiveCount += matches.length;
      }
    });

    // Count negative keywords
    this.negativeKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\w*\\b`, "gi");
      const matches = lowerNotes.match(regex);
      if (matches) {
        negativeCount += matches.length;
      }
    });

    // Calculate sentiment score
    const total = positiveCount + negativeCount;
    if (total === 0) {
      return 0; // Neutral if no keywords found
    }

    // Score ranges from -1.0 to 1.0
    const score = (positiveCount - negativeCount) / Math.max(total, 1);
    return Math.max(-1.0, Math.min(1.0, score));
  }

  /**
   * Extract keywords from feedback notes
   */
  extractKeywords(notes) {
    if (!notes || typeof notes !== "string") {
      return [];
    }

    // Simple keyword extraction - find significant words
    const words = notes
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 4); // Only words longer than 4 characters

    // Count word frequency
    const wordFreq = {};
    words.forEach((word) => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Sort by frequency and return top 10
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Analyze feedback and update database
   */
  async analyzeAndUpdateFeedback(feedbackId, userId, notes) {
    try {
      const themes = this.extractThemes(notes);
      const sentiment = this.analyzeSentiment(notes);
      const keywords = this.extractKeywords(notes);

      // Get primary theme (first one)
      const primaryTheme = themes.length > 0 ? themes[0] : null;

      // Update feedback with analysis
      await database.query(
        `UPDATE interview_feedback 
         SET feedback_theme = $1, sentiment_score = $2, keywords = $3
         WHERE id = $4 AND user_id = $5`,
        [primaryTheme, sentiment, keywords, feedbackId, userId]
      );

      return {
        theme: primaryTheme,
        themes,
        sentiment,
        keywords,
      };
    } catch (error) {
      console.error("❌ Error analyzing feedback:", error);
      throw error;
    }
  }

  /**
   * Get common feedback themes for a user
   */
  async getCommonThemes(userId) {
    try {
      const query = `
        SELECT 
          COALESCE(feedback_theme, 'other') as theme,
          COUNT(*) as frequency,
          AVG(sentiment_score)::numeric(3,2) as avg_sentiment,
          AVG(score)::numeric(5,2) as avg_score
        FROM interview_feedback
        WHERE user_id = $1
          AND feedback_theme IS NOT NULL
        GROUP BY feedback_theme
        ORDER BY frequency DESC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        theme: row.theme,
        frequency: parseInt(row.frequency) || 0,
        avgSentiment: row.avg_sentiment ? parseFloat(row.avg_sentiment) : 0,
        avgScore: row.avg_score ? parseFloat(row.avg_score) : 0,
      }));
    } catch (error) {
      console.error("❌ Error getting common themes:", error);
      throw error;
    }
  }

  /**
   * Get common improvement areas
   */
  async getCommonImprovementAreas(userId) {
    try {
      // Get themes with negative sentiment or low scores
      const query = `
        SELECT 
          feedback_theme,
          COUNT(*) as frequency,
          AVG(sentiment_score)::numeric(3,2) as avg_sentiment,
          AVG(score)::numeric(5,2) as avg_score
        FROM interview_feedback
        WHERE user_id = $1
          AND feedback_theme IS NOT NULL
          AND (sentiment_score < 0 OR score < 70)
        GROUP BY feedback_theme
        ORDER BY frequency DESC
        LIMIT 10
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        theme: row.feedback_theme,
        frequency: parseInt(row.frequency) || 0,
        avgSentiment: row.avg_sentiment ? parseFloat(row.avg_sentiment) : 0,
        avgScore: row.avg_score ? parseFloat(row.avg_score) : 0,
      }));
    } catch (error) {
      console.error("❌ Error getting improvement areas:", error);
      throw error;
    }
  }

  /**
   * Get theme performance correlation
   */
  async getThemePerformanceCorrelation(userId) {
    try {
      const query = `
        SELECT 
          if.feedback_theme,
          COUNT(*) FILTER (WHERE i.outcome = 'offer_extended') as offers,
          COUNT(*) FILTER (WHERE i.outcome IN ('passed', 'offer_extended')) as successful,
          COUNT(*) as total,
          AVG(if.score)::numeric(5,2) as avg_score
        FROM interview_feedback if
        JOIN interviews i ON if.interview_id = i.id
        WHERE if.user_id = $1
          AND if.feedback_theme IS NOT NULL
          AND i.status = 'completed'
        GROUP BY if.feedback_theme
        HAVING COUNT(*) >= 2
        ORDER BY successful DESC, total DESC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        theme: row.feedback_theme,
        offers: parseInt(row.offers) || 0,
        successful: parseInt(row.successful) || 0,
        total: parseInt(row.total) || 0,
        successRate: row.total > 0 
          ? ((parseInt(row.successful) || 0) / parseInt(row.total)) * 100 
          : 0,
        avgScore: parseFloat(row.avg_score) || 0,
      }));
    } catch (error) {
      console.error("❌ Error getting theme performance correlation:", error);
      throw error;
    }
  }

  /**
   * Batch analyze all feedback for a user
   */
  async batchAnalyzeUserFeedback(userId) {
    try {
      // Get all feedback entries with notes but no theme
      const query = `
        SELECT id, interview_id, notes
        FROM interview_feedback
        WHERE user_id = $1
          AND notes IS NOT NULL
          AND notes != ''
          AND feedback_theme IS NULL
      `;

      const result = await database.query(query, [userId]);
      const analyzed = [];

      for (const row of result.rows) {
        try {
          const analysis = await this.analyzeAndUpdateFeedback(
            row.id,
            userId,
            row.notes
          );
          analyzed.push({ feedbackId: row.id, ...analysis });
        } catch (error) {
          console.error(`Error analyzing feedback ${row.id}:`, error);
        }
      }

      return {
        total: result.rows.length,
        analyzed: analyzed.length,
        results: analyzed,
      };
    } catch (error) {
      console.error("❌ Error batch analyzing feedback:", error);
      throw error;
    }
  }
}

export default new FeedbackAnalysisService();

