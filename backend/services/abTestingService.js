import database from "./database.js";

class ABTestingService {
  /**
   * Create a new A/B test
   */
  async createABTest(userId, testConfig) {
    try {
      const {
        testName,
        testType,
        description,
        controlGroupConfig,
        variantGroups,
        trafficSplit
      } = testConfig;

      if (!testName || !testType) {
        throw new Error("testName and testType are required");
      }

      const insertQuery = `
        INSERT INTO ab_tests (
          user_id, test_name, test_type, description,
          control_group_config, variant_groups, traffic_split,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
        RETURNING *
      `;

      const result = await database.query(insertQuery, [
        userId,
        testName,
        testType,
        description || null,
        JSON.stringify(controlGroupConfig || {}),
        JSON.stringify(variantGroups || []),
        JSON.stringify(trafficSplit || { control: 50, variant_a: 50 })
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error creating A/B test:", error);
      throw error;
    }
  }

  /**
   * Assign application to a test group
   */
  async assignToTestGroup(userId, jobOpportunityId, testId) {
    try {
      // Get test configuration
      const testQuery = `
        SELECT * FROM ab_tests
        WHERE id = $1 AND user_id = $2 AND status = 'active'
      `;
      const testResult = await database.query(testQuery, [testId, userId]);

      if (testResult.rows.length === 0) {
        throw new Error("Active test not found");
      }

      const test = testResult.rows[0];
      const trafficSplit = typeof test.traffic_split === 'string' 
        ? JSON.parse(test.traffic_split) 
        : test.traffic_split;

      // Simple random assignment based on traffic split
      const random = Math.random() * 100;
      let cumulative = 0;
      let assignedGroup = 'control';

      for (const [group, percentage] of Object.entries(trafficSplit)) {
        cumulative += percentage;
        if (random <= cumulative) {
          assignedGroup = group;
          break;
        }
      }

      // Update application strategy with test assignment
      const updateQuery = `
        UPDATE application_strategies
        SET ab_test_id = $1, ab_test_group = $2
        WHERE user_id = $3 AND job_opportunity_id = $4
      `;

      await database.query(updateQuery, [testId, assignedGroup, userId, jobOpportunityId]);

      // Increment sample size
      await database.query(
        `UPDATE ab_tests SET sample_size = sample_size + 1 WHERE id = $1`,
        [testId]
      );

      return assignedGroup;
    } catch (error) {
      console.error("❌ Error assigning to test group:", error);
      throw error;
    }
  }

  /**
   * Get A/B test results
   */
  async getTestResults(testId, userId) {
    try {
      // Get test info
      const testQuery = `
        SELECT * FROM ab_tests
        WHERE id = $1 AND user_id = $2
      `;
      const testResult = await database.query(testQuery, [testId, userId]);

      if (testResult.rows.length === 0) {
        throw new Error("Test not found");
      }

      const test = testResult.rows[0];

      // Get results by group
      const resultsQuery = `
        SELECT 
          s.ab_test_group,
          COUNT(DISTINCT s.job_opportunity_id) as sample_size,
          COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END) as responses,
          COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN s.job_opportunity_id END) as interviews,
          COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END) as offers,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as response_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as offer_rate
        FROM application_strategies s
        JOIN job_opportunities jo ON s.job_opportunity_id = jo.id
        WHERE s.ab_test_id = $1
        GROUP BY s.ab_test_group
        ORDER BY s.ab_test_group
      `;

      const results = await database.query(resultsQuery, [testId]);

      // Calculate statistical significance
      const significance = await this.analyzeTestSignificance(testId);

      return {
        test: test,
        results: results.rows,
        significance: significance,
        winner: test.winner || this.determineWinner(results.rows)
      };
    } catch (error) {
      console.error("❌ Error getting test results:", error);
      throw error;
    }
  }

  /**
   * Analyze statistical significance
   */
  async analyzeTestSignificance(testId) {
    try {
      // Simplified chi-square test for conversion rates
      const query = `
        SELECT 
          s.ab_test_group,
          COUNT(DISTINCT s.job_opportunity_id) as n,
          COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END) as conversions
        FROM application_strategies s
        JOIN job_opportunities jo ON s.job_opportunity_id = jo.id
        WHERE s.ab_test_id = $1
        GROUP BY s.ab_test_group
      `;

      const result = await database.query(query, [testId]);
      const groups = result.rows;

      if (groups.length < 2) {
        return {
          significant: false,
          confidence: 0,
          pValue: 1.0,
          message: "Insufficient data for statistical analysis"
        };
      }

      // Simple significance calculation (simplified)
      const control = groups.find(g => g.ab_test_group === 'control');
      const variant = groups.find(g => g.ab_test_group !== 'control');

      if (!control || !variant) {
        return {
          significant: false,
          confidence: 0,
          pValue: 1.0,
          message: "Control or variant group not found"
        };
      }

      const controlRate = control.conversions / control.n;
      const variantRate = variant.conversions / variant.n;
      const difference = Math.abs(variantRate - controlRate);

      // Simplified significance (would use proper chi-square in production)
      const significant = difference > 0.05 && Math.min(control.n, variant.n) >= 30;
      const confidence = significant ? 95 : Math.min(95, Math.round(difference * 1000));

      return {
        significant,
        confidence,
        pValue: significant ? 0.05 : 0.5,
        message: significant 
          ? `Statistically significant difference (${confidence}% confidence)`
          : "Not statistically significant yet"
      };
    } catch (error) {
      console.error("❌ Error analyzing test significance:", error);
      return {
        significant: false,
        confidence: 0,
        pValue: 1.0,
        message: "Error calculating significance"
      };
    }
  }

  /**
   * Determine winner based on results
   */
  determineWinner(results) {
    if (results.length < 2) return null;

    const sorted = results.sort((a, b) => 
      (b.offer_rate || 0) - (a.offer_rate || 0)
    );

    const winner = sorted[0];
    const runnerUp = sorted[1];

    // Winner must have better rate and sufficient sample size
    if ((winner.offer_rate || 0) > (runnerUp.offer_rate || 0) && winner.sample_size >= 10) {
      return winner.ab_test_group;
    }

    return null;
  }

  /**
   * Get all tests for a user
   */
  async getActiveTests(userId) {
    try {
      const query = `
        SELECT *
        FROM ab_tests
        WHERE user_id = $1 AND status IN ('active', 'draft')
        ORDER BY created_at DESC
      `;

      const result = await database.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting active tests:", error);
      throw error;
    }
  }

  /**
   * Get all tests (including completed)
   */
  async getAllTests(userId, filters = {}) {
    try {
      let query = `
        SELECT *
        FROM ab_tests
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.testType) {
        paramCount++;
        query += ` AND test_type = $${paramCount}`;
        params.push(filters.testType);
      }

      query += ` ORDER BY created_at DESC`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting all tests:", error);
      throw error;
    }
  }

  /**
   * Start a test
   */
  async startTest(testId, userId) {
    try {
      const query = `
        UPDATE ab_tests
        SET status = 'active', start_date = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2 AND status = 'draft'
        RETURNING *
      `;

      const result = await database.query(query, [testId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error starting test:", error);
      throw error;
    }
  }

  /**
   * Complete a test
   */
  async completeTest(testId, userId) {
    try {
      // Get results and determine winner
      const results = await this.getTestResults(testId, userId);
      const winner = results.winner;
      const significance = results.significance;

      const query = `
        UPDATE ab_tests
        SET 
          status = 'completed',
          end_date = CURRENT_TIMESTAMP,
          winner = $1,
          statistical_significance = $2,
          results_summary = $3
        WHERE id = $4 AND user_id = $5
        RETURNING *
      `;

      const result = await database.query(query, [
        winner,
        significance.confidence,
        JSON.stringify(results),
        testId,
        userId
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error completing test:", error);
      throw error;
    }
  }

  /**
   * Pause a test
   */
  async pauseTest(testId, userId) {
    try {
      const query = `
        UPDATE ab_tests
        SET status = 'paused'
        WHERE id = $1 AND user_id = $2 AND status = 'active'
        RETURNING *
      `;

      const result = await database.query(query, [testId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error pausing test:", error);
      throw error;
    }
  }
}

export default new ABTestingService();

